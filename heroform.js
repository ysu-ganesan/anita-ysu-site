// Hero design 2 (/?hero=2): she forms from her memories. When you come in, specks of light swirl in from around
// her and build her up from the feet: every speck is a pixel of her own sprite, so they land on her exactly, and
// each one turns from memory-cyan to her own colour as it lands. Then the real sprite fades in over them and the
// specks go. Canvas 2D; the sprite canvas is sampled once, as it is first drawn.
//
//   formHer(spriteCanvas, herBox, { onDone })   // resolves when she is whole

const COUNT = 11000, FLY = 2.8, SETTLE = 0.7;   // specks; seconds for the last one to land; seconds to become real

export function formHer(src, host, { onDone } = {}) {
  const cv = document.createElement('canvas');
  cv.className = 'her-form'; cv.setAttribute('aria-hidden', 'true');
  host.append(cv);
  const g = cv.getContext('2d');
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let P = null, t0 = 0, box = null;

  // her pixels, from the sprite as it is drawn now (in CSS pixels of her box)
  function sample() {
    const W = src.width, H = src.height, k = src.clientWidth / W;
    const data = src.getContext('2d').getImageData(0, 0, W, H).data;
    const pick = [];
    let step = Math.max(1, Math.floor(Math.sqrt(W * H / (COUNT * 6))));
    for (let y = 0; y < H; y += step) for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4;
      if (data[i + 3] > 150) pick.push([x * k, y * k, data[i], data[i + 1], data[i + 2]]);
    }
    for (let i = pick.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0; [pick[i], pick[j]] = [pick[j], pick[i]]; }
    const bw = src.clientWidth, bh = src.clientHeight;
    return pick.slice(0, COUNT).map(([x, y, r, gg, b]) => {
      // each starts somewhere around her, a little of the way round a circle, and swirls in
      const a = Math.random() * Math.PI * 2, d = (0.55 + Math.random() * 0.9) * bh;
      return { x, y, r, g: gg, b, sx: bw / 2 + Math.cos(a) * d, sy: bh * 0.45 + Math.sin(a) * d * 0.7,
               swirl: (Math.random() - 0.5) * bh * 0.5, delay: (1 - y / bh) * 0.9 + Math.random() * 0.45, s: 2 + Math.random() * 2 };
    });
  }

  return new Promise(done => {
    function frame(now) {
      if (!P) {
        if (!src.width || !src.clientWidth) return requestAnimationFrame(frame);
        try { P = sample(); } catch { cv.remove(); host.classList.add('is-real'); onDone?.(); return done(); }
        t0 = now;
      }
      // the canvas reaches well past her box, so specks can come from off to the sides
      const bw = src.clientWidth, bh = src.clientHeight, padX = bw * 0.9, padY = bh * 0.12;
      const W = Math.round((bw + padX * 2) * dpr), H = Math.round((bh + padY) * dpr);
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
      g.setTransform(dpr, 0, 0, dpr, padX * dpr, padY * dpr);
      g.clearRect(-padX, -padY, W / dpr, H / dpr);
      const t = (now - t0) / 1000, span = FLY - 1.35;
      const real = Math.min(1, Math.max(0, (t - FLY) / SETTLE));
      host.style.setProperty('--real', real.toFixed(3));
      g.globalAlpha = 1 - real;
      // two passes: the specks still flying glow (their light adds up where they crowd), the landed ones are her
      for (const pass of [0, 1]) {
        g.globalCompositeOperation = pass ? 'source-over' : 'lighter';
        for (const p of P) {
          let e = Math.min(1, Math.max(0, (t - p.delay) / span)); e = e < 0.5 ? 4 * e * e * e : 1 - Math.pow(-2 * e + 2, 3) / 2;
          if ((e > 0.92) !== !!pass) continue;
          const bend = Math.sin(Math.PI * e) * p.swirl;
          const x = p.sx + (p.x - p.sx) * e + bend * 0.6, y = p.sy + (p.y - p.sy) * e - bend * 0.3;
          const c = e * e * e;   // bright memory-cyan while it flies, her own colour as it lands
          g.fillStyle = `rgb(${120 + (p.r - 120) * c | 0},${235 + (p.g - 235) * c | 0},${255 + (p.b - 255) * c | 0})`;
          const s = p.s * (1 - e) + 1.25 * e;
          g.fillRect(x - s / 2, y - s / 2, s, s);
        }
      }
      g.globalCompositeOperation = 'source-over';
      if (real < 1) requestAnimationFrame(frame);
      else { cv.remove(); host.classList.add('is-real'); onDone?.(); done(); }
    }
    requestAnimationFrame(frame);
  });
}
