/**
 * Hidden Journal Widget
 * ---------------------
 * Double-clicking the page footer opens a lock screen overlay; nothing on the
 * page hints that the journal exists until then. First open sets up a PIN,
 * after that it's lock/unlock. Backend lives at /api/journal (Pages Function),
 * same origin as the site.
 */
(function () {
  const API_BASE = '';
  const TRIGGER_SELECTOR = 'footer';

  let pin = null;
  let overlay = null;

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
      .jw-btn { width: 100%; background: #F2C94C; border: none; border-radius: 10px; color: #141414;
        font-weight: 700; font-size: 14px; padding: 11px 0; cursor: pointer; font-family: 'Courier New', monospace; }
      .jw-close { position: absolute; top: 14px; right: 18px; background: none; border: none;
        color: #8a8a8a; font-size: 20px; cursor: pointer; }
      .jw-error { color: #E67E6E; font-size: 12px; margin-bottom: 8px; font-family: 'Courier New', monospace; }
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

  function showLockScreen() {
    overlay = document.createElement('div');
    overlay.className = 'jw-overlay';
    overlay.innerHTML = `
      <div class="jw-card" style="position:relative;text-align:center;">
        <button class="jw-close">&times;</button>
        <h2 class="jw-title">Journal's locked</h2>
        <p class="jw-sub">Enter your code.</p>
        <input class="jw-input" type="password" inputmode="numeric" maxlength="8" />
        <div class="jw-error" style="display:none;"></div>
        <button class="jw-btn">Unlock</button>
      </div>`;
    document.body.appendChild(overlay);
    const input = overlay.querySelector('.jw-input');
    const errBox = overlay.querySelector('.jw-error');
    input.focus();
    overlay.querySelector('.jw-close').onclick = closeOverlay;

    function showError(msg) {
      errBox.style.display = 'block';
      errBox.textContent = msg;
      input.value = '';
    }

    async function attempt() {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/journal/unlock`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: input.value }),
        });
      } catch {
        showError('Network hiccup. Try again.');
        return;
      }
      const data = await res.json();
      if (data.needsSetup) {
        closeOverlay();
        showSetupScreen();
        return;
      }
      if (data.ok) {
        pin = input.value;
        closeOverlay();
        showJournal();
      } else if (res.status === 429) {
        showError('Too many tries. Come back in a bit.');
      } else {
        showError('Wrong code.');
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
        <p class="jw-sub">4+ digits. This is the only way in.</p>
        <input class="jw-input" type="password" inputmode="numeric" maxlength="8" placeholder="New code" />
        <input class="jw-input jw-confirm" type="password" inputmode="numeric" maxlength="8" placeholder="Confirm" />
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
        errBox.textContent = input.value !== confirm.value ? "Codes don't match." : 'Use 4+ digits.';
        return;
      }
      const res = await fetch(`${API_BASE}/api/journal/setup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: input.value }),
      });
      if (!res.ok) {
        errBox.style.display = 'block';
        errBox.textContent = "Couldn't set the code. It may already be set.";
        return;
      }
      pin = input.value;
      closeOverlay();
      showJournal();
    };
  }

  async function showJournal() {
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
    const res = await fetch(`${API_BASE}/api/journal/entries`, { headers: { 'X-Pin': pin } });
    const entries = res.ok ? await res.json() : [];
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
        await fetch(`${API_BASE}/api/journal/entries/${e.id}`, {
          method: 'DELETE',
          headers: { 'X-Pin': pin },
        });
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
      <input class="jw-input" style="text-align:left;letter-spacing:normal;font-size:14px;" placeholder="Image/GIF link (optional)" />
      <button class="jw-btn">Save entry</button>
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
    });
    wrap.querySelector('.jw-btn').onclick = async () => {
      const text = wrap.querySelector('.jw-textarea').value;
      const media = wrap.querySelector('.jw-input').value;
      await fetch(`${API_BASE}/api/journal/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Pin': pin },
        body: JSON.stringify({ text, mood: selectedMood, media }),
      });
      closeOverlay();
      showJournal();
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
        showLockScreen();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
