export interface Env {
  YOUVERSION_APP_KEY: string;
}

// Server-side proxy for the YouVersion Platform API (developers.youversion.com).
//
// Why a proxy instead of calling api.youversion.com straight from the browser:
//   1. The app key stays out of client JS. YouVersion keys are tied to your
//      account, so shipping one in a <script> tag hands it to anyone.
//   2. YouVersion does not promise CORS headers for browser origins, so a
//      direct fetch() from the page can fail on preflight.
//
// Set the key in Cloudflare Pages → Settings → Variables → YOUVERSION_APP_KEY.
// Until that exists this returns 503 {error:"no_key"}, which the Bible reader
// treats as "fall back to API.Bible" rather than showing an error.
//
// Usage: /api/youversion/bibles/111/books
//        /api/youversion/verse_of_the_days/135

const UPSTREAM = "https://api.youversion.com/v1";

// Only these upstream collections are reachable, so this can't be used as a
// general-purpose open proxy by anyone who finds the endpoint.
const ALLOWED_PREFIXES = ["bibles", "verse_of_the_days", "languages"];

const JSON_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const key = env.YOUVERSION_APP_KEY;
  if (!key) {
    return json(
      {
        error: "no_key",
        message:
          "YOUVERSION_APP_KEY is not set. Add it in Cloudflare Pages → Settings → Variables.",
      },
      503,
      { "Cache-Control": "no-store" }
    );
  }

  // [[path]] catch-all gives us the segments after /api/youversion/.
  const raw = params.path;
  const segments = (Array.isArray(raw) ? raw : raw ? [raw] : []).filter(Boolean);

  if (!segments.length || !ALLOWED_PREFIXES.includes(segments[0])) {
    return json({ error: "bad_path", allowed: ALLOWED_PREFIXES }, 400);
  }

  // Rebuild the upstream URL, encoding each segment and preserving query
  // params (page_size, page_token, etc.) that the caller passed through.
  const incoming = new URL(request.url);
  const target = new URL(
    UPSTREAM + "/" + segments.map(encodeURIComponent).join("/")
  );
  incoming.searchParams.forEach((v, k) => target.searchParams.set(k, v));

  // Bible text is immutable and the verse-of-the-day changes once a day, so
  // edge-caching keeps us well clear of rate limits.
  const cache = caches.default;
  const cacheKey = new Request(target.toString(), { method: "GET" });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: {
        // Note: YouVersion uses this header, NOT `Authorization: Bearer`.
        "X-YVP-App-Key": key,
        Accept: "application/json",
      },
    });
  } catch (err) {
    return json({ error: "upstream_unreachable", detail: String(err) }, 502);
  }

  const text = await upstream.text();
  if (!upstream.ok) {
    return json(
      { error: "upstream_error", status: upstream.status, body: text.slice(0, 500) },
      upstream.status === 401 || upstream.status === 403 ? 502 : upstream.status
    );
  }

  const res = new Response(text, {
    status: 200,
    headers: {
      ...JSON_HEADERS,
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });

  // waitUntil isn't available here, but cache.put resolves fast enough to await.
  await cache.put(cacheKey, res.clone());
  return res;
};
