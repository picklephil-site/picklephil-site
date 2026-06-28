(function () {
  const css = `
  .pkl-fab {
    position: fixed; bottom: 24px; right: 24px;
    width: 58px; height: 58px; border-radius: 50%;
    background: #2ecc71; border: none; cursor: pointer;
    font-size: 30px; line-height: 1;
    box-shadow: 0 4px 18px rgba(0,0,0,.35);
    z-index: 9100; transition: transform .18s;
    display: flex; align-items: center; justify-content: center;
  }
  .pkl-fab:hover { transform: scale(1.1); }
  .pkl-panel {
    position: fixed; bottom: 94px; right: 24px;
    width: 340px; max-width: calc(100vw - 32px);
    height: 480px; max-height: calc(100vh - 110px);
    background: #0d3a22;
    border: 1px solid rgba(255,255,255,.18);
    border-radius: 18px;
    box-shadow: 0 20px 60px rgba(0,0,0,.55);
    display: flex; flex-direction: column;
    z-index: 9099; overflow: hidden;
    transition: opacity .2s, transform .2s;
    font-family: 'Segoe UI', Tahoma, sans-serif;
  }
  .pkl-panel.pkl-hidden { opacity: 0; pointer-events: none; transform: translateY(12px); }
  .pkl-head {
    background: #145a32; padding: 13px 16px;
    display: flex; align-items: center; justify-content: space-between;
    color: #f5f5f5; font-weight: 700; font-size: .95rem;
    flex-shrink: 0;
  }
  .pkl-x {
    background: none; border: none; color: #f5f5f5;
    cursor: pointer; font-size: 1rem; opacity: .7; padding: 0; line-height: 1;
  }
  .pkl-x:hover { opacity: 1; }
  .pkl-msgs {
    flex: 1; overflow-y: auto; padding: 14px;
    display: flex; flex-direction: column; gap: 10px;
  }
  .pkl-msg {
    max-width: 85%; padding: 10px 13px; border-radius: 14px;
    font-size: .875rem; line-height: 1.48; word-wrap: break-word;
    color: #f0f0f0;
  }
  .pkl-msg.pkl-u {
    align-self: flex-end; background: #2ecc71;
    color: #0c3a22; border-bottom-right-radius: 4px; font-weight: 600;
  }
  .pkl-msg.pkl-a {
    align-self: flex-start; background: rgba(255,255,255,.1);
    border-bottom-left-radius: 4px;
  }
  .pkl-msg.pkl-dots { opacity: .55; font-style: italic; }
  .pkl-foot {
    padding: 10px 12px; border-top: 1px solid rgba(255,255,255,.1);
    display: flex; gap: 8px; flex-shrink: 0;
  }
  .pkl-inp {
    flex: 1; background: rgba(255,255,255,.1);
    border: 1px solid rgba(255,255,255,.2); border-radius: 22px;
    padding: 9px 14px; color: #f5f5f5; font-size: .875rem;
    font-family: inherit; outline: none;
  }
  .pkl-inp::placeholder { opacity: .4; color: #f5f5f5; }
  .pkl-inp:focus { border-color: rgba(46,204,113,.55); }
  .pkl-go {
    background: #2ecc71; border: none; border-radius: 50%;
    width: 38px; height: 38px; flex-shrink: 0; cursor: pointer;
    font-size: 1rem; display: flex; align-items: center; justify-content: center;
    transition: filter .15s;
  }
  .pkl-go:hover { filter: brightness(1.08); }
  .pkl-go:disabled { opacity: .45; cursor: not-allowed; }
  `;

  const el = (tag, attrs = {}, ...children) => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v);
    });
    children.forEach(c => typeof c === 'string' ? e.append(c) : e.appendChild(c));
    return e;
  };

  const styleTag = el('style', { text: css });
  document.head.appendChild(styleTag);

  const fab  = el('button', { class: 'pkl-fab', title: 'Chat with Pickle Phil' }, '🥒');
  const msgs = el('div', { class: 'pkl-msgs', id: 'pkl-msgs' });
  const inp  = el('input', { class: 'pkl-inp', id: 'pkl-inp', type: 'text', placeholder: 'Say something…' });
  const go   = el('button', { class: 'pkl-go', id: 'pkl-go' }, '➤');

  const panel = el('div', { class: 'pkl-panel pkl-hidden' },
    el('div', { class: 'pkl-head' },
      el('span', { text: '🥒 Pickle Phil' }),
      el('button', { class: 'pkl-x', id: 'pkl-x' }, '✕')
    ),
    msgs,
    el('div', { class: 'pkl-foot' }, inp, go)
  );

  document.body.appendChild(fab);
  document.body.appendChild(panel);

  let history = [];
  let isOpen  = false;

  function open() {
    isOpen = true;
    panel.classList.remove('pkl-hidden');
    if (!history.length) addMsg('pkl-a', "Hey! I'm Pickle Phil. What's up? 🥒");
    inp.focus();
  }
  function close() {
    isOpen = false;
    panel.classList.add('pkl-hidden');
  }

  fab.addEventListener('click', () => isOpen ? close() : open());
  document.getElementById('pkl-x').addEventListener('click', close);

  function addMsg(cls, text, isTyping = false) {
    const d = el('div', { class: 'pkl-msg ' + cls + (isTyping ? ' pkl-dots' : ''), text });
    msgs.appendChild(d);
    msgs.scrollTop = msgs.scrollHeight;
    return d;
  }

  async function send() {
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    go.disabled = true;

    addMsg('pkl-u', text);
    history.push({ role: 'user', content: text });

    const typing = addMsg('pkl-a', '…', true);

    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      const data = await res.json();
      const reply = data.reply || "Dropped the pickle on that one — try again!";
      typing.remove();
      addMsg('pkl-a', reply);
      history.push({ role: 'assistant', content: reply });
    } catch (_) {
      typing.remove();
      addMsg('pkl-a', "Phil's in the brine right now — try again in a sec!");
    }

    go.disabled = false;
    inp.focus();
  }

  go.addEventListener('click', send);
  inp.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
})();
