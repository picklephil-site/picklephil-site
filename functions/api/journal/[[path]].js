/**
 * Hidden Journal API (Pages Function)
 * -----------------------------------
 * Same-origin API served at /api/journal/* on the main site.
 *
 * Routes:
 *   POST   /api/journal/setup        { pin }             -> creates PIN (only if none exists)
 *   POST   /api/journal/unlock       { pin }             -> { ok: true } or 401
 *   GET    /api/journal/entries      (header X-Pin)      -> [entries]
 *   POST   /api/journal/entries      (header X-Pin)      -> saves { text, mood, media, verse, song }
 *   DELETE /api/journal/entries/:id  (header X-Pin)      -> deletes entry
 *   GET    /api/journal/gifs?q=      (header X-Pin)      -> Giphy search proxy (needs GIPHY_API_KEY env var)
 *   GET    /api/journal/song-search?q= (header X-Pin)    -> iTunes song search proxy (keyless)
 *
 * Storage: KV binding JOURNAL_KV (namespace journal-db).
 * Security note: lightweight personal lock (SHA-256 PIN hash checked
 * per-request), not bank-grade auth.
 */

async function sha256(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function checkPin(request, env) {
  const pin = request.headers.get('X-Pin') || '';
  const stored = await env.JOURNAL_KV.get('pin_hash');
  if (!stored) return false;
  const hash = await sha256(pin);
  return hash === stored;
}

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname;

  // --- Setup: create the PIN (only works once) ---
  if (path === '/api/journal/setup' && request.method === 'POST') {
    const existing = await env.JOURNAL_KV.get('pin_hash');
    if (existing) return json({ error: 'PIN already set' }, 400);
    const { pin } = await request.json();
    if (!pin || pin.length < 4) return json({ error: 'PIN too short' }, 400);
    await env.JOURNAL_KV.put('pin_hash', await sha256(pin));
    return json({ ok: true });
  }

  // --- Unlock: verify PIN ---
  if (path === '/api/journal/unlock' && request.method === 'POST') {
    const { pin } = await request.json();
    const stored = await env.JOURNAL_KV.get('pin_hash');
    if (!stored) return json({ needsSetup: true });
    const hash = await sha256(pin || '');
    if (hash !== stored) return json({ ok: false }, 401);
    return json({ ok: true });
  }

  // --- Entries: list ---
  if (path === '/api/journal/entries' && request.method === 'GET') {
    if (!(await checkPin(request, env))) return json({ error: 'unauthorized' }, 401);
    const raw = await env.JOURNAL_KV.get('entries');
    return json(raw ? JSON.parse(raw) : []);
  }

  // --- Entries: create ---
  if (path === '/api/journal/entries' && request.method === 'POST') {
    if (!(await checkPin(request, env))) return json({ error: 'unauthorized' }, 401);
    const body = await request.json();
    const raw = await env.JOURNAL_KV.get('entries');
    const entries = raw ? JSON.parse(raw) : [];
    const entry = {
      id: Date.now().toString(),
      text: str(body.text, 20000).trim(),
      mood: body.mood && body.mood.emoji
        ? { emoji: str(body.mood.emoji, 8), label: str(body.mood.label, 40) }
        : null,
      media: str(body.media, 500).trim() || null,
      verse: body.verse && body.verse.ref
        ? { ref: str(body.verse.ref, 80), text: str(body.verse.text, 1500) || null }
        : null,
      song: body.song && body.song.title
        ? {
            title: str(body.song.title, 150),
            artist: str(body.song.artist, 150),
            artwork: str(body.song.artwork, 400) || null,
            preview: str(body.song.preview, 400) || null,
            url: str(body.song.url, 400) || null,
          }
        : null,
      date: new Date().toISOString(),
    };
    entries.unshift(entry);
    await env.JOURNAL_KV.put('entries', JSON.stringify(entries));
    return json(entry);
  }

  // --- Entries: delete ---
  if (path.startsWith('/api/journal/entries/') && request.method === 'DELETE') {
    if (!(await checkPin(request, env))) return json({ error: 'unauthorized' }, 401);
    const id = path.split('/').pop();
    const raw = await env.JOURNAL_KV.get('entries');
    const entries = raw ? JSON.parse(raw) : [];
    const next = entries.filter(e => e.id !== id);
    await env.JOURNAL_KV.put('entries', JSON.stringify(next));
    return json({ ok: true });
  }

  // --- GIF search (Giphy proxy — key stays server-side) ---
  if (path === '/api/journal/gifs' && request.method === 'GET') {
    if (!(await checkPin(request, env))) return json({ error: 'unauthorized' }, 401);
    if (!env.GIPHY_API_KEY) return json({ needsKey: true, gifs: [] });
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return json({ gifs: [] });
    const r = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=${env.GIPHY_API_KEY}&q=${encodeURIComponent(q)}&limit=12&rating=pg-13`
    );
    if (!r.ok) return json({ error: 'giphy error' }, 502);
    const data = await r.json();
    return json({
      gifs: (data.data || []).map(g => ({
        url: (g.images.downsized_medium && g.images.downsized_medium.url) || g.images.original.url,
        preview: (g.images.fixed_height_small && g.images.fixed_height_small.url) || g.images.original.url,
      })),
    });
  }

  // --- Song search (iTunes proxy — keyless) ---
  if (path === '/api/journal/song-search' && request.method === 'GET') {
    if (!(await checkPin(request, env))) return json({ error: 'unauthorized' }, 401);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return json({ songs: [] });
    const r = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=6`
    );
    if (!r.ok) return json({ error: 'itunes error' }, 502);
    const data = await r.json();
    return json({
      songs: (data.results || []).map(s => ({
        title: s.trackName,
        artist: s.artistName,
        artwork: s.artworkUrl100 || null,
        preview: s.previewUrl || null,
        url: s.trackViewUrl || null,
      })),
    });
  }

  return json({ error: 'not found' }, 404);
}
