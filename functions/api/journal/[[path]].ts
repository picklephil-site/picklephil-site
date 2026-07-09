// Hidden journal API, locked with Cloudflare Access. No links point here; the
// client is journal-widget.js, which opens on a double-click of the site
// footer and bounces through /api/journal/auth to log in.
//
// Routes (all under /api/journal):
//   GET    /auth?back=/page  -> 302 back to the page after Access login
//   GET    /entries          -> [entries]
//   POST   /entries          { text, mood, media } -> saved entry
//   DELETE /entries/:id      -> { ok: true }
//
// Setup this function depends on:
//   - KV namespace bound as JOURNAL_KV
//   - A Cloudflare Access application covering <site>/api/journal, with a
//     policy allowing only Phil's email
//   - Env vars: ACCESS_TEAM_DOMAIN (e.g. "myteam.cloudflareaccess.com") and
//     ACCESS_AUD (the Access application's Audience tag)
//
// Every request must carry a valid Access JWT (Cf-Access-Jwt-Assertion),
// which the edge injects after login. We verify it here rather than trusting
// the edge alone so the unprotected *.pages.dev copy of the site can't be
// used to reach the data — without Access there's no token, and requests
// fail closed.

export interface Env {
  JOURNAL_KV: KVNamespace;
  ACCESS_TEAM_DOMAIN: string;
  ACCESS_AUD: string;
}

const headers = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers });
}

function b64urlToBytes(s: string): Uint8Array {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64.padEnd(b64.length + ((4 - (b64.length % 4)) % 4), "="));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function decodeJson(b64url: string): Record<string, any> {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(b64url)));
}

// Access rotates its signing keys, so cache imported keys per kid but refetch
// the cert set when an unknown kid shows up.
let keyCache: Map<string, CryptoKey> | null = null;

async function fetchKeys(teamDomain: string): Promise<Map<string, CryptoKey>> {
  const res = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`certs fetch failed: ${res.status}`);
  const { keys } = (await res.json()) as { keys: Array<JsonWebKey & { kid: string }> };
  const map = new Map<string, CryptoKey>();
  for (const jwk of keys || []) {
    map.set(
      jwk.kid,
      await crypto.subtle.importKey(
        "jwk",
        jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false,
        ["verify"]
      )
    );
  }
  return map;
}

async function signingKey(kid: string, teamDomain: string): Promise<CryptoKey | null> {
  if (!keyCache || !keyCache.has(kid)) keyCache = await fetchKeys(teamDomain);
  return keyCache.get(kid) || null;
}

async function verifyAccessJwt(request: Request, env: Env): Promise<boolean> {
  const token = request.headers.get("Cf-Access-Jwt-Assertion");
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;

  let header: Record<string, any>, payload: Record<string, any>;
  try {
    header = decodeJson(parts[0]);
    payload = decodeJson(parts[1]);
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (
    header.alg !== "RS256" ||
    !aud.includes(env.ACCESS_AUD) ||
    payload.iss !== `https://${env.ACCESS_TEAM_DOMAIN}` ||
    typeof payload.exp !== "number" ||
    payload.exp <= now ||
    (typeof payload.nbf === "number" && payload.nbf > now)
  ) {
    return false;
  }

  const key = await signingKey(header.kid, env.ACCESS_TEAM_DOMAIN);
  if (!key) return false;
  return crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    b64urlToBytes(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
}

export const onRequest: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.JOURNAL_KV) return json({ error: "JOURNAL_KV binding not found" }, 500);
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) {
    return json({ error: "Access not configured (set ACCESS_TEAM_DOMAIN and ACCESS_AUD)" }, 500);
  }

  if (!(await verifyAccessJwt(request, env))) {
    return json({ error: "unauthorized" }, 401);
  }

  const path = Array.isArray(params.path) ? params.path : [params.path || ""];
  const route = path.join("/");

  // Landed here after the Access login flow; send the browser back to the
  // page it came from, with a hash the widget uses to reopen itself.
  if (route === "auth" && request.method === "GET") {
    let back = new URL(request.url).searchParams.get("back") || "/";
    if (!back.startsWith("/") || back.startsWith("//")) back = "/";
    return Response.redirect(new URL(back + "#jw-open", request.url).toString(), 302);
  }

  if (route === "entries" && request.method === "GET") {
    const raw = await env.JOURNAL_KV.get("entries");
    return json(raw ? JSON.parse(raw) : []);
  }

  if (route === "entries" && request.method === "POST") {
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON" }, 400);
    }
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

  return json({ error: "not found" }, 404);
};
