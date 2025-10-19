export interface Env {
  PLEX_BASE_URL: string;
  PLEX_TOKEN: string;
}

// Proxies Plex poster/thumbnail images so your token never hits the browser.
// Usage: /api/thumb?path=/library/metadata/1234/thumb
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path || !path.startsWith("/")) return new Response("Bad path", { status: 400 });

  const proxied = `${env.PLEX_BASE_URL}${path}?X-Plex-Token=${encodeURIComponent(env.PLEX_TOKEN)}`;
  const r = await fetch(proxied, { cf: { cacheTtl: 300, cacheEverything: true } });
  if (!r.ok) return new Response("Not found", { status: 404 });

  const h = new Headers(r.headers);
  h.set("Cache-Control", "public, max-age=300");
  return new Response(r.body, { headers: h, status: r.status });
};
