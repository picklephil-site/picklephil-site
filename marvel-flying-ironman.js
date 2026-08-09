// A little Iron Man that flies around the page, purely for fun. Fetches his
// art from the same ComicVine proxy used elsewhere, then tweens to random
// points on screen using CSS transitions (cheap, smooth, no rAF loop needed).
(function(){
  const el = document.createElement("div");
  el.className = "flying-ironman";
  el.innerHTML = `<div class="fim-glow"></div><img class="fim-img" alt="Iron Man flying around the page">`;
  document.body.appendChild(el);

  const img = el.querySelector(".fim-img");

  async function loadArt(){
    try{
      const usp = new URLSearchParams({path:"/search/", query:"Iron Man", resources:"character", field_list:"name,image", limit:1});
      const res = await fetch("/api/comicvine-data?" + usp.toString());
      const data = await res.json();
      const hit = (data.results || [])[0];
      if(hit && hit.image){
        img.src = hit.image.small_url || hit.image.medium_url;
      }
    }catch(e){}
  }

  let x = window.innerWidth * 0.15, y = window.innerHeight * 0.25;
  function place(){ el.style.transform = `translate(${x}px, ${y}px) rotate(0deg)`; }
  place();

  function flyToRandom(){
    const size = el.offsetWidth || 72;
    const margin = size;
    const nx = margin + Math.random() * Math.max(1, window.innerWidth - margin * 2);
    const ny = margin + Math.random() * Math.max(1, window.innerHeight - margin * 2);
    const dx = nx - x, dy = ny - y;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI) + 45; // +45 so "up" in the art points along travel
    const duration = 1.8 + Math.random() * 1.6;
    el.style.transition = `transform ${duration}s cubic-bezier(.45,.05,.55,.95)`;
    el.style.transform = `translate(${nx}px, ${ny}px) rotate(${angle}deg)`;
    x = nx; y = ny;
  }

  loadArt();
  place();
  setTimeout(flyToRandom, 1200);
  setInterval(flyToRandom, 3400);

  window.addEventListener("resize", () => {
    x = Math.min(x, window.innerWidth - 80);
    y = Math.min(y, window.innerHeight - 80);
  });
})();
