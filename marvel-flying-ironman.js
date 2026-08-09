// A little 8-bit-style Iron Man that flies around the page, purely for fun.
// The sprite is drawn from scratch as a pixel grid (original artwork, not a
// copy of any game/comic asset) and rendered as crisp SVG rects so it stays
// sharp at any size. Movement tweens to random points via CSS transitions.
(function(){
  const SPRITE = [
    "..KKKKKKKK..",
    ".KRRRRRRRRK.",
    ".KRRGGGGRRK.",
    ".KRCRRRRCRK.",
    ".KRRGGGGRRK.",
    "..KRRRRRRK..",
    ".KKRRRRRRKK.",
    "KRRRRRRRRRRK",
    "KRRRGCCGRRRK",
    "KRRRRGGRRRRK",
    ".KRRRRRRRRK.",
    "..KRRRRRRK..",
    "..KRRRRRRK..",
    "..KRRRRRRK..",
    "..KGGGGGGK..",
    "..KKKKKKKK..",
  ];
  const PALETTE = {
    K: "#170f06", // outline
    R: "#d3211f", // armor red
    G: "#ffcf3f", // gold trim / boots
    C: "#7fe9ff", // eye / arc-reactor glow
  };

  function buildSpriteSvg(){
    const rows = SPRITE.length;
    const cols = SPRITE[0].length;
    let rects = "";
    SPRITE.forEach((row, y) => {
      for(let x = 0; x < row.length; x++){
        const ch = row[x];
        if(ch === ".") continue;
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${PALETTE[ch]}"/>`;
      }
    });
    return `<svg class="fim-sprite" viewBox="0 0 ${cols} ${rows}" xmlns="http://www.w3.org/2000/svg" shape-rendering="crispEdges">${rects}</svg>`;
  }

  const el = document.createElement("div");
  el.className = "flying-ironman";
  el.innerHTML = buildSpriteSvg() + `<div class="fim-glow"></div>`;
  document.body.appendChild(el);

  let x = window.innerWidth * 0.15, y = window.innerHeight * 0.25;
  let facing = 1;
  function place(){ el.style.transform = `translate(${x}px, ${y}px) scaleX(${facing})`; }
  place();

  function flyToRandom(){
    const size = el.offsetWidth || 54;
    const margin = size;
    const nx = margin + Math.random() * Math.max(1, window.innerWidth - margin * 2);
    const ny = margin + Math.random() * Math.max(1, window.innerHeight - margin * 2);
    facing = nx < x ? -1 : 1;
    const duration = 1.8 + Math.random() * 1.6;
    el.style.transition = `transform ${duration}s steps(12)`;
    el.style.transform = `translate(${nx}px, ${ny}px) scaleX(${facing})`;
    x = nx; y = ny;
  }

  setTimeout(flyToRandom, 1200);
  setInterval(flyToRandom, 3400);

  window.addEventListener("resize", () => {
    x = Math.min(x, window.innerWidth - 60);
    y = Math.min(y, window.innerHeight - 60);
  });
})();
