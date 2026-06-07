export interface Env {
  GUESTBOOK: KVNamespace;
  ADMIN_SECRET: string;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { status: 204, headers: CORS });

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const secret = url.searchParams.get("secret");
  const isAdmin = !!(env.ADMIN_SECRET && secret === env.ADMIN_SECRET);

  const listing = await env.GUESTBOOK.list();
  const items: Record<string, unknown>[] = [];

  for (const key of listing.keys) {
    const val = await env.GUESTBOOK.get(key.name, { type: "json" }) as Record<string, unknown> | null;
    if (!val) continue;
    if (isAdmin) {
      items.push(val);
    } else {
      const { ip: _ip, email: _email, userAgent: _ua, ...pub } = val as Record<string, unknown>;
      items.push(pub);
    }
  }

  return json(items.reverse());
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const data = await request.json() as Record<string, unknown>;
  const id = Date.now().toString();

  const entry: Record<string, unknown> = {
    id,
    name: String(data.name || "Anonymous Pickle").slice(0, 80),
    message: String(data.message || "").slice(0, 1000),
    email: String(data.email || "").slice(0, 200),
    ip: request.headers.get("CF-Connecting-IP") || "unknown",
    userAgent: (request.headers.get("User-Agent") || "").slice(0, 300),
    ts: Date.now(),
    time: new Date().toLocaleString(),
  };

  await env.GUESTBOOK.put(id, JSON.stringify(entry));

  const { ip: _ip, userAgent: _ua, ...publicEntry } = entry;
  return json({ success: true, entry: publicEntry });
};
