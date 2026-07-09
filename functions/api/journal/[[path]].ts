// Hidden journal API. No links point here; the client is journal-widget.js,
// which opens on a double-click of the site footer.
//
// Routes (all under /api/journal):
//   POST   /setup        { pin }  -> create PIN, only works while none exists
//   POST   /unlock       { pin }  -> { ok: true } | { needsSetup: true } | 401/429
//   GET    /entries      (X-Pin)  -> [entries]
//   POST   /entries      (X-Pin) { text, mood, media } -> saved entry
//   DELETE /entries/:id  (X-Pin)  -> { ok: true }
//
// Requires a KV namespace bound to this Pages project as JOURNAL_KV.
//
// This is a lightweight personal lock, not bank-grade auth: the PIN is stored
// as a SHA-256 hash and wrong guesses are rate-limited per IP (5 misses ->
// 15-minute lockout), which keeps out snoopers and brute-force scripts but
// wouldn't stop a determined attacker with many IPs.

export interface Env {
  JOURNAL_KV: KVNamespace;
}

const MAX_FAILS = 5;
const LOCKOUT_SECONDS = 15 * 60;

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

async function sha256(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function failKey(request: Request) {
  return "fails:" + (request.headers.get("CF-Connecting-IP") || "unknown");
}

async function isLockedOut(request: Request, env: Env) {
  const fails = Number((await env.JOURNAL_KV.get(failKey(request))) || 0);
  return fails >= MAX_FAILS;
}

async function recordFail(request: Request, env: Env) {
  const key = failKey(request);
  const fails = Number((await env.JOURNAL_KV.get(key)) || 0) + 1;
  await env.JOURNAL_KV.put(key, String(fails), { expirationTtl: LOCKOUT_SECONDS });
}

async function clearFails(request: Request, env: Env) {
  await env.JOURNAL_KV.delete(failKey(request));
}

// Verifies the pin, tracking misses for lockout. Returns an error Response
// to send back, or null when the pin is good.
async function verifyPin(pin: string, request: Request, env: Env): Promise<Response | null> {
  if (await isLockedOut(request, env)) {
    return json({ error: "Too many attempts. Try again later." }, 429);
  }
  const stored = await env.JOURNAL_KV.get("pin_hash");
  if (!stored || (await sha256(pin)) !== stored) {
    await recordFail(request, env);
    return json({ error: "unauthorized" }, 401);
  }
  await clearFails(request, env);
  return null;
}

async function readJson(request: Request): Promise<Record<string, unknown>> {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.JOURNAL_KV) {
    return json({ error: "JOURNAL_KV binding not found" }, 500);
  }

  const path = Array.isArray(params.path) ? params.path : [params.path || ""];
  const route = path.join("/");

  if (route === "setup" && request.method === "POST") {
    if (await env.JOURNAL_KV.get("pin_hash")) return json({ error: "PIN already set" }, 400);
    const pin = String((await readJson(request)).pin || "");
    if (pin.length < 4) return json({ error: "PIN too short" }, 400);
    await env.JOURNAL_KV.put("pin_hash", await sha256(pin));
    return json({ ok: true });
  }

  if (route === "unlock" && request.method === "POST") {
    if (!(await env.JOURNAL_KV.get("pin_hash"))) return json({ needsSetup: true });
    const pin = String((await readJson(request)).pin || "");
    const denied = await verifyPin(pin, request, env);
    if (denied) return denied;
    return json({ ok: true });
  }

  if (route === "entries" || route.startsWith("entries/")) {
    const denied = await verifyPin(request.headers.get("X-Pin") || "", request, env);
    if (denied) return denied;

    if (route === "entries" && request.method === "GET") {
      const raw = await env.JOURNAL_KV.get("entries");
      return json(raw ? JSON.parse(raw) : []);
    }

    if (route === "entries" && request.method === "POST") {
      const body = await readJson(request);
      const raw = await env.JOURNAL_KV.get("entries");
      const entries = raw ? JSON.parse(raw) : [];
      const entry = {
        id: Date.now().toString(),
        text: String(body.text || "").trim(),
        mood: body.mood || null,
        media: String(body.media || "").trim() || null,
        date: new Date().toISOString(),
      };
      entries.unshift(entry);
      await env.JOURNAL_KV.put("entries", JSON.stringify(entries));
      return json(entry);
    }

    if (route.startsWith("entries/") && request.method === "DELETE") {
      const id = route.slice("entries/".length);
      const raw = await env.JOURNAL_KV.get("entries");
      const entries: Array<{ id: string }> = raw ? JSON.parse(raw) : [];
      await env.JOURNAL_KV.put("entries", JSON.stringify(entries.filter((e) => e.id !== id)));
      return json({ ok: true });
    }
  }

  return json({ error: "not found" }, 404);
};
