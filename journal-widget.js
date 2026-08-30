/**
 * Hidden Journal Widget
 * ---------------------
 * The journal API is a same-origin Pages Function at /api/journal/*,
 * so API_BASE stays empty. Double-clicking the footer (#site-footer)
 * opens a lock screen overlay. Nothing about the journal is visible
 * or hinted at until that double-click.
 *
 * Entries support: text (#hashtags become clickable tags), mood,
 * a Bible verse (fetched from bible-api.com), a song (iTunes search,
 * 30s preview), and an image/GIF (Giphy search via the API proxy,
 * or a pasted URL).
 */
(function () {
  const API_BASE = ''; // same-origin Pages Function
  const TRIGGER_SELECTOR = '#site-footer';

  let pin = null;
  let overlay = null;
  let allEntries = [];

  function css() {
    return `
      .jw-overlay { position: fixed; inset: 0; background: rgba(10,10,10,0.92);
        z-index: 999999; display: flex; align-items: center; justify-content: center;
        font-family: Georgia, 'Times New Roman', serif; }
      .jw-card { background: #1c1c1c; border: 1px solid #2e2e2e; border-radius: 16px;
        padding: 28px 24px; width: 92%; max-width: 340px; color: #EDEAE3; }
      .jw-title { font-size: 20px; margin: 0 0 6px; }
      .jw-sub { font-size: 13px; color: #8a8a8a; margin: 0 0 16px; }
      .jw-input { width: 100%; box-sizing: border-box; background: #141414; border: 1px solid #333;
        border-radius: 10px; color: #EDEAE3; padding: 12px 14px; font-size: 18px; text-align:center;
        letter-spacing: 0.4em; margin-bottom: 10px; font-family: 'Courier New', monospace; }
      .jw-field { width: 100%; box-sizing: border-box; background: #141414; border: 1px solid #333;
        border-radius: 10px; color: #EDEAE3; padding: 10px 12px; font-size: 14px;
        margin-bottom: 8px; font-family: 'Courier New', monospace; }
      .jw-btn { width: 100%; background: #F2C94C; border: none; border-radius: 10px; color: #141414;
        font-weight: 700; font-size: 14px; padding: 11px 0; cursor: pointer; font-family: 'Courier New', monospace; }
      .jw-minibtn { background: #262626; border: 1px solid #3a3a3a; border-radius: 8px; color: #EDEAE3;
        font-size: 12px; padding: 8px 10px; cursor: pointer; font-family: 'Courier New', monospace; white-space: nowrap; }
      .jw-close { position: absolute; top: 14px; right: 18px; background: none; border: none;
        color: #8a8a8a; font-size: 20px; cursor: pointer; }
      .jw-error { color: #E67E6E; font-size: 12px; margin-bottom: 8px; font-family: 'Courier New', monospace; }
      .jw-journal { position: relative; max-width: 520px; width: 92%; max-height: 85vh; overflow-y: auto; }
      .jw-entry { background: #1a1a1a; border: 1px solid #272727; border-radius: 12px; padding: 14px; margin-bottom: 12px; position: relative; }
      .jw-entry img.jw-media { width: 100%; border-radius: 8px; margin-top: 8px; }
      .jw-date { font-size: 11px; color: #8a8a8a; font-family: 'Courier New', monospace; text-transform: uppercase; }
      .jw-del { position: absolute; top: 10px; right: 12px; background: none; border: none; color: #5a5a5a;
        font-size: 14px; cursor: pointer; }
      .jw-del:hover { color: #E67E6E; }
      .jw-edit { position: absolute; top: 10px; right: 38px; background: none; border: none; color: #5a5a5a;
        font-size: 14px; cursor: pointer; }
      .jw-edit:hover { color: #F2C94C; }
      .jw-ghead { font-family: 'Courier New', monospace; font-size: 12px; letter-spacing: 0.15em;
        text-transform: uppercase; color: #F2C94C; margin: 18px 0 10px; border-bottom: 1px solid #2a2a2a; padding-bottom: 4px; }
      .jw-tag { display: inline-block; background: #262626; border: 1px solid #3a3a3a; border-radius: 999px;
        color: #F2C94C; font-family: 'Courier New', monospace; font-size: 11px; padding: 3px 10px;
        margin: 0 6px 6px 0; cursor: pointer; }
      .jw-tag-inline { color: #F2C94C; cursor: pointer; }
      .jw-verse { border-left: 3px solid #F2C94C; background: #181815; border-radius: 0 8px 8px 0;
        padding: 8px 12px; margin: 8px 0; font-style: italic; font-size: 14px; color: #d9d4c7; }
      .jw-verse a { color: #F2C94C; text-decoration: none; font-family: 'Courier New', monospace;
        font-size: 11px; font-style: normal; }
      .jw-song { display: flex; align-items: center; gap: 10px; background: #181818; border: 1px solid #272727;
        border-radius: 10px; padding: 8px; margin-top: 8px; }
      .jw-song img { width: 48px; height: 48px; border-radius: 6px; flex-shrink: 0; }
      .jw-song .t { font-size: 13px; color: #EDEAE3; }
      .jw-song .a { font-size: 11px; color: #8a8a8a; font-family: 'Courier New', monospace; }
      .jw-song audio { width: 100%; height: 28px; margin-top: 4px; }
      .jw-textarea { width: 100%; box-sizing: border-box; background:#141414; border:1px solid #2e2e2e;
        border-radius: 10px; color:#EDEAE3; padding:10px; font-family: Georgia, serif; margin-bottom:8px; }
      .jw-newbtn { background:#F2C94C; color:#141414; border:none; border-radius:8px; padding:10px 16px;
        font-family:'Courier New',monospace; font-weight:700; cursor:pointer; margin-bottom:14px; }
      .jw-results { max-height: 180px; overflow-y: auto; margin-bottom: 8px; }
      .jw-gifgrid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; }
      .jw-gifgrid img { width: 100%; height: 72px; object-fit: cover; border-radius: 6px; cursor: pointer;
        border: 2px solid transparent; }
      .jw-gifgrid img.sel { border-color: #F2C94C; }
      .jw-songrow { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 8px; cursor: pointer; }
      .jw-songrow:hover, .jw-songrow.sel { background: #262626; }
      .jw-songrow img { width: 36px; height: 36px; border-radius: 5px; }
      .jw-songrow .t { font-size: 12px; color: #EDEAE3; }
      .jw-songrow .a { font-size: 10px; color: #8a8a8a; font-family: 'Courier New', monospace; }
      .jw-hint { font-size: 11px; color: #6a6a6a; font-family: 'Courier New', monospace; margin: 0 0 8px; }
      .jw-row { display: flex; gap: 6px; margin-bottom: 8px; }
      .jw-row .jw-field { margin-bottom: 0; flex: 1; }
      .jw-seclabel { font-family: 'Courier New', monospace; font-size: 11px; color: #8a8a8a;
        text-transform: uppercase; letter-spacing: 0.1em; margin: 12px 0 6px; }
    `;
  }

  function injectStyles() {
    const s = document.createElement('style');
    s.textContent = css();
    document.head.appendChild(s);
  }

  function closeOverlay() {
    if (overlay) overlay.remove();
    overlay = null;
  }

  function api(pathname, opts) {
    opts = opts || {};
    opts.headers = Object.assign({ 'X-Pin': pin }, opts.headers || {});
    return fetch(`${API_BASE}${pathname}`, opts);
  }

  // ── Biometric unlock (WebAuthn PRF) ──────────────────────────────────
  // The code is AES-encrypted with a key derived from the passkey's PRF
  // output, which the platform only releases after fingerprint/face/PIN
  // verification. localStorage holds only ciphertext. Per-device.
  const BIO_KEY = 'jw_bio';
  const PRF_SALT = new TextEncoder().encode('pickle-journal-prf-v1');
  const b64 = bytes => btoa(String.fromCharCode.apply(null, Array.from(bytes)));
  const unb64 = s => new Uint8Array(Array.from(atob(s), c => c.charCodeAt(0)));

  function bioEnrolled() {
    try { return !!(window.PublicKeyCredential && localStorage.getItem(BIO_KEY)); }
    catch (e) { return false; }
  }

  async function bioDeriveKey(rawId) {
    const assertion = await navigator.credentials.get({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [{ type: 'public-key', id: rawId }],
      userVerification: 'required',
      extensions: { prf: { eval: { first: PRF_SALT } } },
    }});
    const res = assertion.getClientExtensionResults();
    const secret = res.prf && res.prf.results && res.prf.results.first;
    if (!secret) return null;
    return crypto.subtle.importKey('raw', secret, 'AES-GCM', false, ['encrypt', 'decrypt']);
  }

  async function bioEnroll() {
    const cred = await navigator.credentials.create({ publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: { name: 'Pickle Journal', id: location.hostname },
      user: {
        id: new TextEncoder().encode('phil-journal'),
        name: 'journal',
        displayName: 'Pickle Journal',
      },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required', residentKey: 'preferred' },
      extensions: { prf: {} },
    }});
    const ext = cred.getClientExtensionResults();
    if (!(ext.prf && ext.prf.enabled)) throw new Error('prf unsupported');
    const rawId = new Uint8Array(cred.rawId);
    const key = await bioDeriveKey(rawId); // second prompt: derives the encryption key
    if (!key) throw new Error('prf eval failed');
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = new Uint8Array(await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, new TextEncoder().encode(pin)
    ));
    localStorage.setItem(BIO_KEY, JSON.stringify({ credId: b64(rawId), iv: b64(iv), ct: b64(ct) }));
  }

  async function bioUnlock(errBox) {
    try {
      const rec = JSON.parse(localStorage.getItem(BIO_KEY));
      const key = await bioDeriveKey(unb64(rec.credId));
      if (!key) throw new Error('no prf');
      const pt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: unb64(rec.iv) }, key, unb64(rec.ct)
      );
      const candidate = new TextDecoder().decode(pt);
      const res = await fetch(`${API_BASE}/api/journal/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: candidate }),
      });
      const data = await res.json();
      if (data.ok) {
        pin = candidate;
        closeOverlay();
        showJournal();
        return;
      }
      // Stored code no longer valid (code was reset) — drop enrollment.
      localStorage.removeItem(BIO_KEY);
      errBox.style.display = 'block';
      errBox.textContent = data.locked ? 'Locked — try again later.' : 'Code changed. Enter it manually.';
    } catch (e) {
      errBox.style.display = 'block';
      errBox.textContent = 'Fingerprint unlock failed. Enter your code.';
    }
  }

  function showLockScreen() {
    overlay = document.createElement('div');
    overlay.className = 'jw-overlay';
    overlay.innerHTML = `
      <div class="jw-card" style="position:relative;text-align:center;">
        <button class="jw-close">&times;</button>
        <h2 class="jw-title">Journal's locked</h2>
        <p class="jw-sub">Enter your code.</p>
        ${bioEnrolled() ? '<button class="jw-minibtn jw-bio" style="width:100%;margin-bottom:10px;padding:11px 0;">👆 Unlock with fingerprint</button>' : ''}
        <input class="jw-input" type="password" maxlength="64" />
        <div class="jw-error" style="display:none;"></div>
        <button class="jw-btn">Unlock</button>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('.jw-input');
    const errBox = overlay.querySelector('.jw-error');
    input.focus();
    overlay.querySelector('.jw-close').onclick = closeOverlay;
    const bioBtn = overlay.querySelector('.jw-bio');
    if (bioBtn) bioBtn.onclick = () => bioUnlock(errBox);

    async function attempt() {
      const res = await fetch(`${API_BASE}/api/journal/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: input.value }),
      });
      const data = await res.json();
      if (data.needsSetup) {
        closeOverlay();
        showSetupScreen();
        return;
      }
      if (data.locked) {
        const mins = Math.max(1, Math.ceil((data.until - Date.now()) / 60000));
        errBox.style.display = 'block';
        errBox.textContent = `Too many tries. Locked for ~${mins} min.`;
        input.value = '';
        return;
      }
      if (data.ok) {
        pin = input.value;
        closeOverlay();
        showJournal();
      } else {
        errBox.style.display = 'block';
        errBox.textContent = 'Wrong code.';
        input.value = '';
      }
    }
    overlay.querySelector('.jw-btn').onclick = attempt;
    input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  }

  function showSetupScreen() {
    overlay = document.createElement('div');
    overlay.className = 'jw-overlay';
    overlay.innerHTML = `
      <div class="jw-card" style="position:relative;text-align:center;">
        <button class="jw-close">&times;</button>
        <h2 class="jw-title">Set up your code</h2>
        <p class="jw-sub">4+ characters. A word or phrase beats digits. This is the only way in.</p>
        <input class="jw-input" type="password" maxlength="64" placeholder="New code" />
        <input class="jw-input jw-confirm" type="password" maxlength="64" placeholder="Confirm" />
        <div class="jw-error" style="display:none;"></div>
        <button class="jw-btn">Lock it in</button>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('.jw-input');
    const confirm = overlay.querySelector('.jw-confirm');
    const errBox = overlay.querySelector('.jw-error');
    overlay.querySelector('.jw-close').onclick = closeOverlay;

    overlay.querySelector('.jw-btn').onclick = async () => {
      if (input.value.length < 4 || input.value !== confirm.value) {
        errBox.style.display = 'block';
        errBox.textContent = input.value !== confirm.value ? "Codes don't match." : 'Use 4+ characters.';
        return;
      }
      await fetch(`${API_BASE}/api/journal/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: input.value }),
      });
      pin = input.value;
      closeOverlay();
      showJournal();
    };
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function extractTags(text) {
    const out = [];
    (text || '').replace(/#([A-Za-z0-9_]+)/g, (m, t) => { out.push(t.toLowerCase()); return m; });
    return out;
  }

  function entryHaystack(e) {
    return [
      e.text,
      e.mood && e.mood.label,
      e.verse && e.verse.ref,
      e.verse && e.verse.text,
      e.song && e.song.title,
      e.song && e.song.artist,
    ].filter(Boolean).join(' ').toLowerCase();
  }

  function matches(e, q) {
    q = q.trim().toLowerCase();
    if (!q) return true;
    if (q.startsWith('#')) return extractTags(e.text).includes(q.slice(1));
    return entryHaystack(e).includes(q);
  }

  function monthLabel(iso) {
    return new Date(iso).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  }

  function entryCard(e) {
    const card = document.createElement('div');
    card.className = 'jw-entry';
    const safeText = escapeHtml(e.text).replace(/#([A-Za-z0-9_]+)/g,
      '<span class="jw-tag-inline" data-tag="$1">#$1</span>');
    card.innerHTML = `
      <button class="jw-edit" title="Edit entry" data-id="${e.id}">✏️</button>
      <button class="jw-del" title="Delete entry" data-id="${e.id}">🗑</button>
      <div class="jw-date">${new Date(e.date).toLocaleString()}${e.edited ? ' · edited' : ''}</div>
      ${e.mood ? `<div style="color:#F2C94C;font-size:13px;margin:6px 0;">${escapeHtml(e.mood.emoji)} ${escapeHtml(e.mood.label)}</div>` : ''}
      ${e.verse ? `<div class="jw-verse">${e.verse.text ? `“${escapeHtml(e.verse.text)}”<br>` : ''}<a href="/bible.html?ref=${encodeURIComponent(e.verse.ref)}" target="_blank" rel="noopener">📖 ${escapeHtml(e.verse.ref)}</a></div>` : ''}
      <div style="color:#EDEAE3;white-space:pre-wrap;">${safeText}</div>
      ${e.media ? `<img class="jw-media" src="${escapeHtml(e.media)}" onerror="this.style.display='none'" />` : ''}
      ${e.song ? `
        <div class="jw-song">
          ${e.song.artwork ? `<img src="${escapeHtml(e.song.artwork)}" alt="" />` : ''}
          <div style="flex:1;min-width:0;">
            <div class="t">${e.song.url ? `<a href="${escapeHtml(e.song.url)}" target="_blank" rel="noopener" style="color:#EDEAE3;text-decoration:none;">🎵 ${escapeHtml(e.song.title)}</a>` : `🎵 ${escapeHtml(e.song.title)}`}</div>
            <div class="a">${escapeHtml(e.song.artist)}</div>
            ${e.song.preview ? `<audio controls preload="none" src="${escapeHtml(e.song.preview)}"></audio>` : ''}
          </div>
        </div>` : ''}
    `;
    return card;
  }

  async function showJournal() {
    overlay = document.createElement('div');
    overlay.className = 'jw-overlay';
    const wrap = document.createElement('div');
    wrap.className = 'jw-journal';
    wrap.innerHTML = `
      <button class="jw-close" style="position:fixed;">&times;</button>
      <div class="jw-row" style="align-items:center;">
        <button class="jw-newbtn" style="margin-bottom:0;">+ New entry</button>
        <button class="jw-minibtn jw-bio-enroll" style="display:none;">👆 Fingerprint unlock</button>
      </div>
      <input class="jw-field jw-search" placeholder="Search entries… (or #tag)" />
      <div class="jw-tagbar"></div>
      <div class="jw-list"></div>
    `;
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
    overlay.querySelector('.jw-close').onclick = closeOverlay;
    overlay.querySelector('.jw-newbtn').onclick = () => showComposer();

    // Offer fingerprint enrollment on capable devices that haven't set it up
    const enrollBtn = overlay.querySelector('.jw-bio-enroll');
    if (window.PublicKeyCredential && !bioEnrolled()) {
      PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(ok => {
        if (ok && enrollBtn) enrollBtn.style.display = '';
      }).catch(() => {});
    }
    if (enrollBtn) enrollBtn.onclick = async () => {
      enrollBtn.disabled = true;
      enrollBtn.textContent = '👆 Follow the prompt…';
      try {
        await bioEnroll();
        enrollBtn.textContent = '✓ Fingerprint unlock is on';
      } catch (e) {
        enrollBtn.disabled = false;
        enrollBtn.textContent = '👆 Not supported here';
        setTimeout(() => { enrollBtn.textContent = '👆 Fingerprint unlock'; }, 2500);
      }
    };

    const list = overlay.querySelector('.jw-list');
    const tagbar = overlay.querySelector('.jw-tagbar');
    const search = overlay.querySelector('.jw-search');

    list.innerHTML = `<p class="jw-hint">Loading…</p>`;
    const res = await api('/api/journal/entries');
    allEntries = res.ok ? await res.json() : [];

    function render() {
      const q = search.value || '';
      const shown = allEntries.filter(e => matches(e, q));
      list.innerHTML = '';
      if (allEntries.length === 0) {
        list.innerHTML = `<p class="jw-hint">No entries yet. Tip: #hashtags in your text become searchable tags.</p>`;
        return;
      }
      if (shown.length === 0) {
        list.innerHTML = `<p class="jw-hint">Nothing matches "${escapeHtml(q)}".</p>`;
        return;
      }
      let lastMonth = null;
      shown.forEach(e => {
        const m = monthLabel(e.date);
        if (m !== lastMonth) {
          lastMonth = m;
          const h = document.createElement('div');
          h.className = 'jw-ghead';
          h.textContent = m;
          list.appendChild(h);
        }
        list.appendChild(entryCard(e));
      });
    }

    function renderTagbar() {
      const counts = {};
      allEntries.forEach(e => extractTags(e.text).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
      const tags = Object.keys(counts).sort((a, b) => counts[b] - counts[a]).slice(0, 12);
      tagbar.innerHTML = tags.map(t => `<span class="jw-tag" data-tag="${t}">#${t} (${counts[t]})</span>`).join('');
    }

    search.addEventListener('input', render);
    wrap.addEventListener('click', async e => {
      const tagEl = e.target.closest('[data-tag]');
      if (tagEl) {
        search.value = '#' + tagEl.dataset.tag;
        render();
        return;
      }
      const ed = e.target.closest('.jw-edit');
      if (ed) {
        const entry = allEntries.find(x => x.id === ed.dataset.id);
        if (entry) showComposer(entry);
        return;
      }
      const del = e.target.closest('.jw-del');
      if (del) {
        if (!window.confirm('Delete this entry for good?')) return;
        await api(`/api/journal/entries/${del.dataset.id}`, { method: 'DELETE' });
        allEntries = allEntries.filter(x => x.id !== del.dataset.id);
        renderTagbar();
        render();
      }
    });

    renderTagbar();
    render();
  }

  const MOODS = [
    { emoji: '🔥', label: 'Fired up' }, { emoji: '😌', label: 'Chill' },
    { emoji: '😤', label: 'Frustrated' }, { emoji: '🎉', label: 'Hyped' },
    { emoji: '😴', label: 'Wiped' }, { emoji: '🤔', label: 'Thinking' },
    { emoji: '❤️', label: 'Grateful' }, { emoji: '😅', label: 'Meh' },
  ];

  // ── In-journal Bible browser ─────────────────────────────────────────
  // Embeds /bible-classic.html, NOT /bible.html. This picker works by reading
  // the highlighted verses straight out of the iframe's DOM, which needs a
  // same-origin reader that renders the text itself (#copyBarRef and
  // .verse-block.selected). /bible.html is now an embed of bible.com — the
  // scripture there lives in a cross-origin frame we are not allowed to read,
  // so pointing this at it silently breaks "Use highlighted verse".
  function openBibleBrowser(onPick) {
    const bo = document.createElement('div');
    bo.className = 'jw-overlay';
    bo.style.zIndex = '1000000';
    bo.innerHTML = `
      <div style="width:96%;max-width:640px;height:88vh;display:flex;flex-direction:column;background:#141414;border:1px solid #2e2e2e;border-radius:14px;overflow:hidden;">
        <iframe src="/bible-classic.html" style="flex:1;width:100%;border:none;"></iframe>
        <div style="display:flex;gap:8px;padding:10px;background:#1c1c1c;">
          <button class="jw-btn jw-bible-use" style="flex:1;">✓ Use highlighted verse</button>
          <button class="jw-minibtn jw-bible-cancel">Cancel</button>
        </div>
      </div>`;
    document.body.appendChild(bo);
    const useBtn = bo.querySelector('.jw-bible-use');
    bo.querySelector('.jw-bible-cancel').onclick = () => bo.remove();
    useBtn.onclick = () => {
      try {
        const doc = bo.querySelector('iframe').contentDocument;
        const refEl = doc.getElementById('copyBarRef');
        const refRaw = refEl ? refEl.textContent.trim() : '';
        const sel = Array.from(doc.querySelectorAll('.verse-block.selected'));
        if (!refRaw || !sel.length) {
          useBtn.textContent = 'Tap verses in the reader to highlight them first';
          setTimeout(() => { useBtn.textContent = '✓ Use highlighted verse'; }, 2200);
          return;
        }
        const ref = refRaw.split('·')[0].trim();
        sel.sort((a, b) => (+a.dataset.verse) - (+b.dataset.verse));
        const text = sel.map(p => {
          const v = p.querySelector('.v-num');
          let t = p.textContent;
          if (v) t = t.replace(v.textContent, '');
          return t.replace(/\s+/g, ' ').trim();
        }).join(' ');
        bo.remove();
        onPick(ref, text);
      } catch (e) {
        useBtn.textContent = 'Could not read the reader — try again';
        setTimeout(() => { useBtn.textContent = '✓ Use highlighted verse'; }, 2200);
      }
    };
  }

  function showComposer(existing) {
    closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'jw-overlay';
    let selectedMood = existing ? existing.mood : null;
    let selectedSong = existing ? existing.song : null;
    let selectedGif = null;

    const wrap = document.createElement('div');
    wrap.className = 'jw-card';
    wrap.style.maxWidth = '420px';
    wrap.style.maxHeight = '85vh';
    wrap.style.overflowY = 'auto';
    wrap.style.position = 'relative';

    const votdRef = (document.getElementById('votd-ref') || {}).textContent || '';

    wrap.innerHTML = `
      <button class="jw-close">&times;</button>
      <h2 class="jw-title">${existing ? 'Edit entry' : 'New entry'}</h2>
      <div class="jw-moods" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        ${MOODS.map(m => `<button data-label="${m.label}" data-emoji="${m.emoji}" style="font-size:18px;width:36px;height:36px;background:#262626;border:1px solid #333;border-radius:999px;cursor:pointer;">${m.emoji}</button>`).join('')}
      </div>
      <textarea class="jw-textarea" rows="4" placeholder="What's going on today? (#hashtags become searchable)"></textarea>

      <div class="jw-seclabel">📖 Verse (optional)</div>
      <div class="jw-row">
        <input class="jw-field jw-verse-in" placeholder="e.g. John 3:16" />
        <button class="jw-minibtn jw-browse">📖 Browse</button>
        ${votdRef ? `<button class="jw-minibtn jw-votd">Today's</button>` : ''}
      </div>
      <div class="jw-hint jw-verse-preview" style="display:none;"></div>

      <div class="jw-seclabel">🎵 Song (optional)</div>
      <div class="jw-row">
        <input class="jw-field jw-song-in" placeholder="Search a song…" />
        <button class="jw-minibtn jw-song-go">Search</button>
      </div>
      <div class="jw-results jw-song-results" style="display:none;"></div>
      <div class="jw-hint jw-song-sel" style="display:none;"></div>

      <div class="jw-seclabel">🖼 GIF / image (optional)</div>
      <div class="jw-row">
        <input class="jw-field jw-gif-in" placeholder="Search GIFs…" />
        <button class="jw-minibtn jw-gif-go">Search</button>
      </div>
      <div class="jw-results jw-gif-results" style="display:none;"></div>
      <input class="jw-field jw-media-in" placeholder="…or paste an image/GIF link" />

      <div class="jw-error jw-c-err" style="display:none;"></div>
      <button class="jw-btn">${existing ? 'Save changes' : 'Save entry'}</button>
    `;
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
    overlay.querySelector('.jw-close').onclick = () => { closeOverlay(); showJournal(); };

    wrap.querySelectorAll('.jw-moods button').forEach(btn => {
      btn.onclick = () => {
        wrap.querySelectorAll('.jw-moods button').forEach(b => b.style.border = '1px solid #333');
        btn.style.border = '1px solid #F2C94C';
        selectedMood = { emoji: btn.dataset.emoji, label: btn.dataset.label };
      };
      if (existing && existing.mood && btn.dataset.emoji === existing.mood.emoji) {
        btn.style.border = '1px solid #F2C94C';
      }
    });

    // --- Verse ---
    const verseIn = wrap.querySelector('.jw-verse-in');
    const versePreview = wrap.querySelector('.jw-verse-preview');
    const votdBtn = wrap.querySelector('.jw-votd');
    if (votdBtn) votdBtn.onclick = () => { verseIn.value = votdRef; verseIn.dispatchEvent(new Event('change')); };
    wrap.querySelector('.jw-browse').onclick = () => openBibleBrowser((ref, text) => {
      verseData = { ref: ref, text: (text || '').slice(0, 1500) || null };
      verseIn.value = ref;
      versePreview.style.display = 'block';
      versePreview.textContent = verseData.text
        ? `“${verseData.text.slice(0, 140)}${verseData.text.length > 140 ? '…' : ''}” — ${ref}`
        : ref;
    });
    let verseData = existing ? existing.verse : null;
    if (verseData) {
      verseIn.value = verseData.ref;
      versePreview.style.display = 'block';
      versePreview.textContent = verseData.text
        ? `“${verseData.text.slice(0, 140)}${verseData.text.length > 140 ? '…' : ''}” — ${verseData.ref}`
        : verseData.ref;
    }
    verseIn.addEventListener('change', async () => {
      const ref = verseIn.value.trim();
      verseData = null;
      versePreview.style.display = 'none';
      if (!ref) return;
      versePreview.style.display = 'block';
      versePreview.textContent = 'Looking up…';
      try {
        const r = await fetch(`https://bible-api.com/${encodeURIComponent(ref)}`);
        const d = await r.json();
        if (d.text) {
          verseData = { ref: d.reference || ref, text: d.text.trim().replace(/\s+/g, ' ') };
          versePreview.textContent = `“${verseData.text.slice(0, 140)}${verseData.text.length > 140 ? '…' : ''}” — ${verseData.ref}`;
        } else {
          verseData = { ref: ref, text: null };
          versePreview.textContent = `Couldn't look that up — saving the reference "${ref}" anyway.`;
        }
      } catch (e) {
        verseData = { ref: ref, text: null };
        versePreview.textContent = `Couldn't look that up — saving the reference "${ref}" anyway.`;
      }
    });

    // --- Song search ---
    const songIn = wrap.querySelector('.jw-song-in');
    const songResults = wrap.querySelector('.jw-song-results');
    const songSel = wrap.querySelector('.jw-song-sel');
    if (selectedSong) {
      songSel.style.display = 'block';
      songSel.textContent = `Attached: ${selectedSong.title} — ${selectedSong.artist}`;
    }
    async function songSearch() {
      const q = songIn.value.trim();
      if (!q) return;
      songResults.style.display = 'block';
      songResults.innerHTML = `<p class="jw-hint">Searching…</p>`;
      const r = await api(`/api/journal/song-search?q=${encodeURIComponent(q)}`);
      const d = r.ok ? await r.json() : { songs: [] };
      if (!d.songs || d.songs.length === 0) {
        songResults.innerHTML = `<p class="jw-hint">No songs found.</p>`;
        return;
      }
      songResults.innerHTML = '';
      d.songs.forEach(s => {
        const row = document.createElement('div');
        row.className = 'jw-songrow';
        row.innerHTML = `${s.artwork ? `<img src="${escapeHtml(s.artwork)}" />` : ''}<div><div class="t">${escapeHtml(s.title)}</div><div class="a">${escapeHtml(s.artist)}</div></div>`;
        row.onclick = () => {
          selectedSong = s;
          songResults.querySelectorAll('.jw-songrow').forEach(x => x.classList.remove('sel'));
          row.classList.add('sel');
          songSel.style.display = 'block';
          songSel.textContent = `Attached: ${s.title} — ${s.artist}`;
        };
        songResults.appendChild(row);
      });
    }
    wrap.querySelector('.jw-song-go').onclick = songSearch;
    songIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); songSearch(); } });

    // --- GIF search ---
    const gifIn = wrap.querySelector('.jw-gif-in');
    const gifResults = wrap.querySelector('.jw-gif-results');
    const mediaIn = wrap.querySelector('.jw-media-in');
    async function gifSearch() {
      const q = gifIn.value.trim();
      if (!q) return;
      gifResults.style.display = 'block';
      gifResults.innerHTML = `<p class="jw-hint">Searching…</p>`;
      const r = await api(`/api/journal/gifs?q=${encodeURIComponent(q)}`);
      const d = r.ok ? await r.json() : { gifs: [] };
      if (d.needsKey) {
        gifResults.innerHTML = `<p class="jw-hint">GIF search isn't set up yet (needs a free Giphy key). You can still paste a GIF link below.</p>`;
        return;
      }
      if (!d.gifs || d.gifs.length === 0) {
        gifResults.innerHTML = `<p class="jw-hint">No GIFs found.</p>`;
        return;
      }
      const grid = document.createElement('div');
      grid.className = 'jw-gifgrid';
      d.gifs.forEach(g => {
        const img = document.createElement('img');
        img.src = g.preview;
        img.onclick = () => {
          selectedGif = g.url;
          grid.querySelectorAll('img').forEach(x => x.classList.remove('sel'));
          img.classList.add('sel');
          mediaIn.value = '';
        };
        grid.appendChild(img);
      });
      gifResults.innerHTML = '';
      gifResults.appendChild(grid);
    }
    wrap.querySelector('.jw-gif-go').onclick = gifSearch;
    gifIn.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); gifSearch(); } });

    // --- Prefill when editing ---
    if (existing) {
      wrap.querySelector('.jw-textarea').value = existing.text || '';
      if (existing.media) mediaIn.value = existing.media;
    }

    // --- Save ---
    wrap.querySelector('.jw-btn').onclick = async () => {
      const text = wrap.querySelector('.jw-textarea').value;
      const err = wrap.querySelector('.jw-c-err');
      if (!text.trim() && !selectedGif && !mediaIn.value.trim() && !selectedSong && !verseData) {
        err.style.display = 'block';
        err.textContent = 'Write something first.';
        return;
      }
      // If a verse was typed but never blurred, resolve it now
      if (verseIn.value.trim() && !verseData) {
        verseData = { ref: verseIn.value.trim(), text: null };
      }
      if (!verseIn.value.trim()) verseData = null; // cleared while editing
      await api(existing ? `/api/journal/entries/${existing.id}` : '/api/journal/entries', {
        method: existing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text,
          mood: selectedMood,
          media: selectedGif || mediaIn.value.trim() || null,
          verse: verseData,
          song: selectedSong,
        }),
      });
      closeOverlay();
      showJournal();
    };
  }

  function init() {
    injectStyles();

    // Mobile: double-tap on text normally triggers selection / zoom, which
    // swallows the second click. Neutralize both on the trigger element and
    // count raw touchends ourselves (preventDefault also stops the synthetic
    // click, so taps aren't double-counted).
    const trigger = document.querySelector(TRIGGER_SELECTOR);
    if (trigger) {
      trigger.style.touchAction = 'manipulation';
      trigger.style.webkitUserSelect = 'none';
      trigger.style.userSelect = 'none';
    }

    let tapCount = 0;
    let tapTimer = null;
    function tap() {
      tapCount++;
      if (tapCount === 1) {
        tapTimer = setTimeout(() => { tapCount = 0; }, 500);
      } else if (tapCount >= 2) {
        clearTimeout(tapTimer);
        tapCount = 0;
        if (!overlay) showLockScreen();
      }
    }
    function onTrigger(e) {
      const t = document.querySelector(TRIGGER_SELECTOR);
      return t && t.contains(e.target);
    }
    document.addEventListener('click', e => { if (onTrigger(e)) tap(); });
    document.addEventListener('touchend', e => {
      if (!onTrigger(e)) return;
      e.preventDefault();
      tap();
    }, { passive: false });
  }

  // Lets a page open the journal from its own control instead of the hidden
  // double-tap. The Bible page uses this for its Notes link; the double-tap on
  // #site-footer keeps working everywhere regardless.
  window.openJournal = function () {
    if (!overlay) showLockScreen();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
