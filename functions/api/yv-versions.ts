export interface Env {
  YOUVERSION_APP_KEY: string;
}

// Proxies the YouVersion Platform Bible catalogue so the app key never reaches
// the browser. Usage: GET /api/yv-versions?lang=en
//
// Licensing note: /v1/bibles only returns versions this app has accepted a
// licence for in the Platform Portal, and answers 204 when none have been
// accepted yet. An empty picker would look like a broken page, so we fall back
// to the full catalogue and flag it with licensed:false. The reader embeds
// bible.com, which renders any version regardless — only the Platform *text*
// endpoints are licence-gated — so the fallback list still works end to end.

const API = "https://api.youversion.com/v1/bibles";
const FIELDS = ["id", "abbreviation", "title", "language_tag", "localized_title"];
const MAX_PAGES = 20;

interface Version {
  id: number;
  abbreviation: string;
  title: string;
  language: string;
}

function upstreamUrl(lang: string, all: boolean, pageToken: string | null) {
  const u = new URL(API);
  u.searchParams.append("language_ranges[]", lang);
  u.searchParams.set("page_size", "99");
  for (const f of FIELDS) u.searchParams.append("fields[]", f);
  if (all) u.searchParams.set("all_available", "true");
  if (pageToken) u.searchParams.set("page_token", pageToken);
  return u.toString();
}

// Walks next_page_token to the end; MAX_PAGES caps a wildcard language range
// (language_ranges[]=*) that would otherwise pull well over a thousand Bibles.
async function collect(key: string, lang: string, all: boolean): Promise<Version[]> {
  const out: Version[] = [];
  let pageToken: string | null = null;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(upstreamUrl(lang, all, pageToken), {
      headers: { "x-yvp-app-key": key },
    });
    if (res.status === 204) break;
    if (!res.ok) throw new Error(`youversion /bibles returned ${res.status}`);

    const body = (await res.json()) as { data?: any[]; next_page_token?: string | null };
    for (const b of body.data ?? []) {
      if (!b?.id || !b?.abbreviation) continue;
      out.push({
        id: b.id,
        abbreviation: b.abbreviation,
        title: b.localized_title || b.title || b.abbreviation,
        language: b.language_tag || lang,
      });
    }

    pageToken = body.next_page_token ?? null;
    if (!pageToken) break;
  }

  return out;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "public, max-age=3600",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.YOUVERSION_APP_KEY) {
    return new Response(JSON.stringify({ error: "YOUVERSION_APP_KEY not configured" }), { status: 500, headers });
  }

  const url = new URL(request.url);
  // A BCP47 language range, or "*" for every language YouVersion carries.
  const lang = (url.searchParams.get("lang") || "en").slice(0, 35);

  const cache = (caches as any).default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  try {
    let versions = await collect(env.YOUVERSION_APP_KEY, lang, false);
    const licensed = versions.length > 0;
    if (!licensed) versions = await collect(env.YOUVERSION_APP_KEY, lang, true);

    versions.sort((a, b) => a.abbreviation.localeCompare(b.abbreviation));

    const response = new Response(JSON.stringify({ licensed, versions }), { headers });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "youversion request failed" }), { status: 502, headers });
  }
};
