export interface Env {
  PLEX_BASE_URL: string; // e.g. "http://99.46.194.9:32400"
  PLEX_TOKEN: string;    // your Plex token as a Secret
}

function cors(h = new Headers()) {
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "Content-Type");
  h.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  return h;
}
export const onRequestOptions: PagesFunction<Env> = async () =>
  new Response(null, { headers: cors() });

/**
 * Fetch Plex sessions and return a clean JSON payload.
 * (Plex returns XML by default; we extract attributes we need.)
 */
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  try {
    const url = `${env.PLEX_BASE_URL}/status/sessions?X-Plex-Token=${encodeURIComponent(env.PLEX_TOKEN)}`;
    const r = await fetch(url, { cf: { cacheTtl: 8, cacheEverything: false } });
    if (!r.ok) return new Response(JSON.stringify({ sessions: [] }), { headers: cors() });

    const xml = await r.text();

    const items: any[] = [];
    const reItem = /<(Video|Track)\s+([^>]+)>/g;
    let m: RegExpExecArray | null;

    while ((m = reItem.exec(xml))) {
      const type = m[1];
      const attrs = m[2];

      const get = (k: string) => {
        const mm = new RegExp(`${k}="([^"]*)"`, "i").exec(attrs);
        return mm ? mm[1] : "";
      };

      const title = get("title");
      const grandparentTitle = get("grandparentTitle"); // show/artist
      const parentTitle = get("parentTitle");           // season/album
      const year = get("year");
      const duration = Number(get("duration") || 0);
      const viewOffset = Number(get("viewOffset") || 0);
      const thumb = get("thumb"); // /library/metadata/###/thumb
      const art = get("art");

      // inspect nested <User> and <Player> inside this item’s block
      const start = m.index;
      const end = xml.indexOf(`</${type}>`, start) + type.length + 3;
      const chunk = xml.slice(start, end);

      const user = (/<User[^>]*title="([^"]+)"/i.exec(chunk) || [,""])[1];
      const state = (/<Player[^>]*state="([^"]+)"/i.exec(chunk) || [,""])[1];

      const progress = duration ? Math.min(100, Math.round((viewOffset / duration) * 100)) : 0;

      items.push({
        kind: type.toLowerCase(),
        title,
        subtitle: grandparentTitle || parentTitle || "",
        year: year ? Number(year) : undefined,
        user,
        state, duration, viewOffset, progress,
        thumb, art
      });
    }

    return new Response(JSON.stringify({ sessions: items }), {
      headers: cors(new Headers({ "Content-Type": "application/json" })),
    });
  } catch {
    return new Response(JSON.stringify({ sessions: [] }), {
      headers: cors(new Headers({ "Content-Type": "application/json" })),
      status: 200
    });
  }
};
