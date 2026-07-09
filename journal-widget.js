/**
 * Hidden Journal Widget
 * ---------------------
 * Double-clicking the page footer opens the journal; nothing on the page
 * hints that it exists until then. Auth is Cloudflare Access: if you're not
 * signed in, the widget bounces through /api/journal/auth (which Access
 * intercepts with its login page) and returns here with #jw-open set so the
 * journal reopens by itself. Backend is the Pages Function at /api/journal.
 */
(function () {
  const API_BASE = '';
  const TRIGGER_SELECTOR = 'footer';
  const REOPEN_HASH = '#jw-open';

  let overlay = null;

  function css() {
    return `
      .jw-overlay { position: fixed; inset: 0; background: rgba(10,10,10,0.92);
        z-index: 999999; display: flex; align-items: center; justify-content: center;
        font-family: Georgia, 'Times New Roman', serif; }
      .jw-card { background: #1c1c1c; border: 1px solid #2e2e2e; border-radius: 16px;
        padding: 28px 24px; width: 92%; max-width: 340px; color: #EDEAE3; }
      .jw-title { font-size: 20px; margin: 0 0 6px; }
      .jw-input { width: 100%; box-sizing: border-box; background: #141414; border: 1px solid #333;
        border-radius: 10px; color: #EDEAE3; padding: 12px 14px; font-size: 14px;
        margin-bottom: 10px; font-family: 'Courier New', monospace; }
      .jw-btn { width: 100%; background: #F2C94C; border: none; border-radius: 10px; color: #141414;
        font-weight: 700; font-size: 14px; padding: 11px 0; cursor: pointer; font-family: 'Courier New', monospace; }
      .jw-close { position: absolute; top: 14px; right: 18px; background: none; border: none;
        color: #8a8a8a; font-size: 20px; cursor: pointer; }
      .jw-journal { position: relative; max-width: 480px; width: 92%; max-height: 82vh; overflow-y: auto; }
      .jw-entry { background: #1a1a1a; border: 1px solid #272727; border-radius: 12px; padding: 14px; margin-bottom: 12px; position: relative; }
      .jw-entry img { width: 100%; border-radius: 8px; margin-top: 8px; }
      .jw-del { position: absolute; top: 10px; right: 12px; background: none; border: none;
        color: #4a4a4a; font-size: 14px; cursor: pointer; }
      .jw-del:hover { color: #E67E6E; }
      .jw-date { font-size: 11px; color: #8a8a8a; font-family: 'Courier New', monospace; text-transform: uppercase; }
      .jw-textarea { width: 100%; box-sizing: border-box; background:#141414; border:1px solid #2e2e2e;
        border-radius: 10px; color:#EDEAE3; padding:10px; font-family: Georgia, serif; margin-bottom:8px; }
      .jw-newbtn { background:#F2C94C; color:#141414; border:none; border-radius:8px; padding:10px 16px;
        font-family:'Courier New',monospace; font-weight:700; cursor:pointer; margin-bottom:14px; }
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

  function goLogin() {
    const back = location.pathname + location.search;
    location.href = `${API_BASE}/api/journal/auth?back=${encodeURIComponent(back)}`;
  }

  // Access answers unauthenticated API calls with a redirect to its login
  // page; with redirect:'manual' that surfaces as an opaqueredirect. A 401
  // means Access let us through but the function rejected the token (e.g.
  // the *.pages.dev copy of the site) — the login bounce fixes that too on
  // the real domain.
  async function apiFetch(path, opts = {}) {
    const res = await fetch(`${API_BASE}/api/journal${path}`, { redirect: 'manual', ...opts });
    if (res.type === 'opaqueredirect' || res.status === 401 || res.status === 403) return null;
    return res;
  }

  async function openJournal() {
    const res = await apiFetch('/entries');
    if (!res) {
      goLogin();
      return;
    }
    const entries = res.ok ? await res.json() : [];
    showJournal(entries);
  }

  function showJournal(entries) {
    closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'jw-overlay';
    const wrap = document.createElement('div');
    wrap.className = 'jw-journal';
    wrap.innerHTML = `
      <button class="jw-close" style="position:fixed;">&times;</button>
      <button class="jw-newbtn">+ New entry</button>
      <div class="jw-list"></div>
    `;
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
    overlay.querySelector('.jw-close').onclick = closeOverlay;
    overlay.querySelector('.jw-newbtn').onclick = showComposer;

    const list = overlay.querySelector('.jw-list');
    if (entries.length === 0) {
      list.innerHTML = `<p style="color:#6a6a6a;font-family:'Courier New',monospace;font-size:13px;">No entries yet.</p>`;
    }
    entries.forEach(e => {
      const card = document.createElement('div');
      card.className = 'jw-entry';
      card.innerHTML = `
        <button class="jw-del" title="Delete">&times;</button>
        <div class="jw-date">${new Date(e.date).toLocaleString()}</div>
        ${e.mood ? `<div style="color:#F2C94C;font-size:13px;margin:6px 0;">${e.mood.emoji} ${e.mood.label}</div>` : ''}
        <div style="color:#EDEAE3;white-space:pre-wrap;">${escapeHtml(e.text)}</div>
        ${e.media ? `<img src="${e.media}" onerror="this.style.display='none'" />` : ''}
      `;
      card.querySelector('.jw-del').onclick = async () => {
        if (!window.confirm('Delete this entry?')) return;
        const res = await apiFetch(`/entries/${e.id}`, { method: 'DELETE' });
        if (!res) { goLogin(); return; }
        card.remove();
      };
      list.appendChild(card);
    });
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  const MOODS = [
    { emoji: '🔥', label: 'Fired up' }, { emoji: '😌', label: 'Chill' },
    { emoji: '😤', label: 'Frustrated' }, { emoji: '🎉', label: 'Hyped' },
    { emoji: '😴', label: 'Wiped' }, { emoji: '🤔', label: 'Thinking' },
    { emoji: '❤️', label: 'Grateful' }, { emoji: '😅', label: 'Meh' },
  ];

  function showComposer() {
    closeOverlay();
    overlay = document.createElement('div');
    overlay.className = 'jw-overlay';
    let selectedMood = null;
    const wrap = document.createElement('div');
    wrap.className = 'jw-card';
    wrap.style.maxWidth = '380px';
    wrap.innerHTML = `
      <button class="jw-close">&times;</button>
      <h2 class="jw-title">New entry</h2>
      <div class="jw-moods" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;">
        ${MOODS.map(m => `<button data-label="${m.label}" data-emoji="${m.emoji}" style="font-size:18px;width:36px;height:36px;background:#262626;border:1px solid #333;border-radius:999px;cursor:pointer;">${m.emoji}</button>`).join('')}
      </div>
      <textarea class="jw-textarea" rows="4" placeholder="What's going on today?"></textarea>
      <input class="jw-input" placeholder="Image/GIF link (optional)" />
      <button class="jw-btn">Save entry</button>
    `;
    overlay.appendChild(wrap);
    document.body.appendChild(overlay);
    overlay.querySelector('.jw-close').onclick = () => { closeOverlay(); openJournal(); };
    wrap.querySelectorAll('.jw-moods button').forEach(btn => {
      btn.onclick = () => {
        wrap.querySelectorAll('.jw-moods button').forEach(b => b.style.border = '1px solid #333');
        btn.style.border = '1px solid #F2C94C';
        selectedMood = { emoji: btn.dataset.emoji, label: btn.dataset.label };
      };
    });
    wrap.querySelector('.jw-btn').onclick = async () => {
      const text = wrap.querySelector('.jw-textarea').value;
      const media = wrap.querySelector('.jw-input').value;
      const res = await apiFetch('/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, mood: selectedMood, media }),
      });
      if (!res) { goLogin(); return; }
      closeOverlay();
      openJournal();
    };
  }

  function init() {
    injectStyles();
    let clickCount = 0;
    let clickTimer = null;
    document.addEventListener('click', e => {
      if (!e.target.closest || !e.target.closest(TRIGGER_SELECTOR)) return;
      clickCount++;
      if (clickCount === 1) {
        clickTimer = setTimeout(() => { clickCount = 0; }, 400);
      } else if (clickCount === 2) {
        clearTimeout(clickTimer);
        clickCount = 0;
        openJournal();
      }
    });

    // Coming back from the Access login flow.
    if (location.hash === REOPEN_HASH) {
      history.replaceState(null, '', location.pathname + location.search);
      openJournal();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
