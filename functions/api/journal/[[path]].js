/**
 * Hidden Journal API (Pages Function)
 * -----------------------------------
 * Same-origin API served at /api/journal/* on the main site.
 *
 * Routes:
 *   POST   /api/journal/setup        { pin }             -> creates PIN (only if none exists)
 *   POST   /api/journal/unlock       { pin }             -> { ok: true } or 401 / 429 (locked)
 *   GET    /api/journal/entries      (header X-Pin)      -> [entries]
 *   POST   /api/journal/entries      (header X-Pin)      -> saves { text, mood, media, verse, song }
 *   DELETE /api/journal/entries/:id  (header X-Pin)      -> deletes entry
 *   GET    /api/journal/gifs?q=      (header X-Pin)      -> Giphy search proxy (needs GIPHY_API_KEY env var)
 *   GET    /api/journal/song-search?q= (header X-Pin)    -> Deezer/iTunes song search proxy (keyless)
 *
 * Storage: KV binding JOURNAL_KV (namespace journal-db).
 *
 * Security:
 *  - PIN stored as salted PBKDF2-SHA256 (100k iterations), never plaintext.
 *  - Every failed PIN check (any route) increments a fail counter; 5 fails
 *    locks all PIN checks for 15 minutes. Failures also sleep 400ms.
 *    (KV is eventually consistent, so the lock is best-effort — it slows a
 *    brute force from minutes to months, it isn't bank-grade auth.)
 */

const PBKDF2_ITER = 100000;
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60 * 1000;

const toHex = bytes => Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
const fromHex = hex => new Uint8Array((hex.match(/.{2}/g) || []).map(h => parseInt(h, 16)));

async function hashPin(pin, saltHex, iterations) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations },
    key, 256
  );
  return toHex(new Uint8Array(bits));
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Verify a PIN with lockout. Returns:
 *   { ok: true } | { needsSetup: true } | { locked: true, until } | { ok: false }
 */
async function verifyPin(pin, env) {
  const lockUntil = parseInt(await env.JOURNAL_KV.get('lock_until') || '0', 10);
  if (Date.now() < lockUntil) return { locked: true, until: lockUntil };

  const stored = await env.JOURNAL_KV.get('pin_hash');
  if (!stored) return { needsSetup: true };
  const rec = JSON.parse(stored);
  const hash = await hashPin(pin || '', rec.salt, rec.iter);

  if (hash === rec.hash) {
    if (parseInt(await env.JOURNAL_KV.get('fails') || '0', 10) > 0) {
      await env.JOURNAL_KV.put('fails', '0');
    }
    return { ok: true };
  }

  const fails = parseInt(await env.JOURNAL_KV.get('fails') || '0', 10) + 1;
  await env.JOURNAL_KV.put('fails', String(fails));
  if (fails >= MAX_FAILS) {
    await env.JOURNAL_KV.put('lock_until', String(Date.now() + LOCK_MS));
    await env.JOURNAL_KV.put('fails', '0');
  }
  await new Promise(r => setTimeout(r, 400));
  return { ok: false };
}

async function checkPin(request, env) {
  const v = await verifyPin(request.headers.get('X-Pin') || '', env);
  return v.ok === true;
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
    if (pin.length > 64) return json({ error: 'PIN too long' }, 400);
    const salt = toHex(crypto.getRandomValues(new Uint8Array(16)));
    const hash = await hashPin(pin, salt, PBKDF2_ITER);
    await env.JOURNAL_KV.put('pin_hash', JSON.stringify({ v: 2, salt, iter: PBKDF2_ITER, hash }));
    return json({ ok: true });
  }

  // --- Unlock: verify PIN ---
  if (path === '/api/journal/unlock' && request.method === 'POST') {
    const { pin } = await request.json();
    const v = await verifyPin(pin, env);
    if (v.needsSetup) return json({ needsSetup: true });
    if (v.locked) return json({ locked: true, until: v.until }, 429);
    if (!v.ok) return json({ ok: false }, 401);
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

  // --- Song search (Deezer primary, iTunes fallback — both keyless) ---
  if (path === '/api/journal/song-search' && request.method === 'GET') {
    if (!(await checkPin(request, env))) return json({ error: 'unauthorized' }, 401);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) return json({ songs: [] });
    try {
      const r = await fetch(`https://api.deezer.com/search?q=${encodeURIComponent(q)}&limit=6`);
      if (r.ok) {
        const data = await r.json();
        if (data.data && data.data.length) {
          return json({
            songs: data.data.map(s => ({
              title: s.title,
              artist: s.artist ? s.artist.name : '',
              artwork: s.album ? s.album.cover_medium : null,
              preview: s.preview || null,
              url: s.link || null,
            })),
          });
        }
      }
    } catch (e) { /* fall through to iTunes */ }
    const r2 = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q)}&media=music&limit=6`,
      { headers: { 'User-Agent': 'Mozilla/5.0 (journal widget)' } }
    );
    if (!r2.ok) return json({ error: 'song search unavailable' }, 502);
    const data2 = await r2.json();
    return json({
      songs: (data2.results || []).map(s => ({
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
