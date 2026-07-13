/**
 * Hidden Journal API (Pages Function)
 * -----------------------------------
 * Same-origin version of the phone-session worker.js — served at
 * /api/journal/* on the main site, so no CORS needed.
 *
 * Routes:
 *   POST   /api/journal/setup        { pin }             -> creates PIN (only if none exists)
 *   POST   /api/journal/unlock       { pin }             -> { ok: true } or 401
 *   GET    /api/journal/entries      (header X-Pin)      -> [entries]
 *   POST   /api/journal/entries      (header X-Pin)      -> saves { text, mood, media }
 *   DELETE /api/journal/entries/:id  (header X-Pin)      -> deletes entry
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
      text: (body.text || '').trim(),
      mood: body.mood || null,
      media: (body.media || '').trim() || null,
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

  return json({ error: 'not found' }, 404);
}
