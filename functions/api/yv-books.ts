export interface Env {
  YOUVERSION_APP_KEY: string;
}

// Book list + chapter counts for one Bible version, plus the copyright line the
// publisher licence requires us to display. Usage: GET /api/yv-books?version=3034
//
// Upstream /v1/bibles/{id}/books inlines every verse of every chapter and runs
// about 1.5 MB. The reader only needs book names and how many chapters each has,
// so the reduction happens here (~2 KB) rather than in the browser.

const API = "https://api.youversion.com/v1/bibles";

interface Book {
  id: string;
  title: string;
  canon: string;
  chapters: number;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const headers = {
    "Content-Type": "application/json",
    // Book structure for a given version is effectively immutable.
    "Cache-Control": "public, max-age=86400",
    "Access-Control-Allow-Origin": "*",
  };

  if (!env.YOUVERSION_APP_KEY) {
    return new Response(JSON.stringify({ error: "YOUVERSION_APP_KEY not configured" }), { status: 500, headers });
  }

  const url = new URL(request.url);
  const version = url.searchParams.get("version") || "";
  if (!/^\d{1,6}$/.test(version)) {
    return new Response(JSON.stringify({ error: "version must be a numeric Bible id" }), { status: 400, headers });
  }

  const cache = (caches as any).default;
  const cacheKey = new Request(url.toString(), { method: "GET" });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  const auth = { headers: { "x-yvp-app-key": env.YOUVERSION_APP_KEY } };

  try {
    const [metaRes, booksRes] = await Promise.all([
      fetch(`${API}/${version}`, auth),
      fetch(`${API}/${version}/books`, auth),
    ]);

    if (!metaRes.ok || !booksRes.ok) {
      const status = !metaRes.ok ? metaRes.status : booksRes.status;
      return new Response(JSON.stringify({ error: `youversion returned ${status} for version ${version}` }), { status: 502, headers });
    }

    const meta = (await metaRes.json()) as any;
    const raw = (await booksRes.json()) as { data?: any[] };

    const books: Book[] = (raw.data ?? [])
      .filter((b) => b?.id && Array.isArray(b.chapters) && b.chapters.length > 0)
      .map((b) => ({
        id: b.id,
        title: b.title || b.full_title || b.id,
        canon: b.canon || "",
        chapters: b.chapters.length,
      }));

    const payload = {
      id: meta.id,
      abbreviation: meta.abbreviation ?? "",
      title: meta.localized_title || meta.title || "",
      // Displaying this is a condition of the publisher licence agreement.
      copyright: meta.copyright ?? "",
      publisher_url: meta.publisher_url ?? "",
      deep_link: meta.youversion_deep_link ?? "",
      books,
    };

    const response = new Response(JSON.stringify(payload), { headers });
    await cache.put(cacheKey, response.clone());
    return response;
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "youversion request failed" }), { status: 502, headers });
  }
};
