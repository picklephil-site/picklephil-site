export interface Env {
  COMICVINE_API_KEY: string;
}

// Proxies a small whitelist of read-only ComicVine endpoints so the API key
// never reaches the browser, and so we can set the descriptive User-Agent
// ComicVine requires (unauthenticated/generic UAs get blocked with a 420).
// Usage: GET /api/comicvine-data?path=/search/&query=Iron+Man&resources=character
const ALLOWED_PATH = /^\/(search|characters|issues)\/$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=21600",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.COMICVINE_API_KEY) {
    return new Response(JSON.stringify({ error: "COMICVINE_API_KEY not configured" }), { status: 500, headers });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  if (!ALLOWED_PATH.test(path)) {
    return new Response(JSON.stringify({ error: "path not allowed" }), { status: 400, headers });
  }

  const upstream = new URL(`https://comicvine.gamespot.com/api${path}`);
  for (const [key, value] of url.searchParams) {
    if (key === "path" || key === "api_key" || key === "format") continue;
    upstream.searchParams.set(key, value);
  }
  upstream.searchParams.set("api_key", env.COMICVINE_API_KEY);
  upstream.searchParams.set("format", "json");

  // Edge-cache successful responses so a burst of page loads (this page
  // fires a dozen-plus of these on first paint) doesn't chew through
  // ComicVine's 200-requests-per-hour limit for the same query every time.
  const cache = (caches as any).default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    const res = await fetch(upstream.toString(), {
      headers: { "User-Agent": "PicklePhilMarvelSite/1.0 (+https://philliphinshaw.com/marvel)" },
    });
    const body = await res.text();
    const response = new Response(body, { status: res.status, headers });
    if (res.ok) await cache.put(cacheKey, response.clone());
    return response;
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "ComicVine request failed" }), { status: 502, headers });
  }
};
