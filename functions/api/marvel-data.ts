export interface Env {
  TMDB_API_KEY: string;
}

// Proxies a small whitelist of read-only TMDB endpoints so the API key
// never reaches the browser. Usage: GET /api/marvel-data?path=/search/movie&query=Iron+Man&year=2008
const ALLOWED_PATH = /^\/(discover\/movie|movie\/\d+(\/(credits|images))?|person\/\d+(\/(images|movie_credits))?|search\/(movie|person))$/;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=21600",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.TMDB_API_KEY) {
    return new Response(JSON.stringify({ error: "TMDB_API_KEY not configured" }), { status: 500, headers });
  }

  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";

  if (!ALLOWED_PATH.test(path)) {
    return new Response(JSON.stringify({ error: "path not allowed" }), { status: 400, headers });
  }

  const upstream = new URL(`https://api.themoviedb.org/3${path}`);
  for (const [key, value] of url.searchParams) {
    if (key === "path" || key === "api_key") continue;
    upstream.searchParams.set(key, value);
  }
  upstream.searchParams.set("api_key", env.TMDB_API_KEY);

  try {
    const res = await fetch(upstream.toString());
    const body = await res.text();
    return new Response(body, { status: res.status, headers });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "TMDB request failed" }), { status: 502, headers });
  }
};
