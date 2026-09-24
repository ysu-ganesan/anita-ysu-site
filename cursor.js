// The cursor (reference: ausdata.ai's "mouse aura").
// One full-screen canvas over everything, blended with `screen`, never catching clicks.
// The real cursor stays; this adds a soft light that eases after it, a tail along the
// way it is moving, a few sparks as it travels, and a burst with two rings on click.
// Over a link or button the ring opens up and names what a click will do.
// Only for a real mouse: touch screens and reduced motion get nothing.

export function startCursor() {
  if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cv = document.createElement('canvas');
  cv.className = 'aura'; cv.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cv);
  const label = document.createElement('div');
  label.className = 'aura-label'; label.setAttribute('aria-hidden', 'true');
  document.body.appendChild(label);
  const g = cv.getContext('2d');
  const C = '88,230,255';

  let W = 0, H = 0, dpr = 1;
  function fit() { dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0); }
  addEventListener('resize', fit); fit();

  const m = { x: W / 2, y: H / 2, seen: false }, f = { x: W / 2, y: H / 2 }, v = { x: 0, y: 0 };
  const sparks = [], rings = [];
  let open = 0, target = null;

  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    const dx = e.clientX - m.x, dy = e.clientY - m.y;
    v.x = v.x * 0.7 + dx * 0.3; v.y = v.y * 0.7 + dy * 0.3;
    m.x = e.clientX; m.y = e.clientY; m.seen = true;
    if (Math.hypot(dx, dy) > 4) for (let i = 0, n = 1 + Math.floor(Math.random() * 3); i < n; i++)
      sparks.push({ x: m.x, y: m.y, vx: dx * 0.08 + (Math.random() - 0.5) * 0.8, vy: dy * 0.08 + (Math.random() - 0.5) * 0.8, life: 0, max: 38 + Math.random() * 28, r: 1.2 + Math.random() * 1.8 });
    aim(e.target);
  }, { passive: true });
  // what the cursor is over; re-checked while the page scrolls under a still mouse
  function aim(el) {
    const hit = el && el.closest ? el.closest('a, button, [data-cursor], input, textarea, select, label') : null;
    target = hit;
    label.textContent = hit ? (hit.dataset.cursor || (hit.matches('input, textarea, select') ? '' : 'open')) : '';
  }
  let n = 0;
  document.addEventListener('pointerleave', () => { m.seen = false; });
  addEventListener('pointerdown', e => {
    if (e.pointerType !== 'mouse') return;
    for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2, s = 1.6 + Math.random() * 1.6;
      sparks.push({ x: e.clientX, y: e.clientY, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0, max: 30 + Math.random() * 16, r: 1.4 + Math.random() * 1.2 }); }
    rings.push({ x: e.clientX, y: e.clientY, t: 0, to: 36, dur: 30 });
    setTimeout(() => rings.push({ x: e.clientX, y: e.clientY, t: 0, to: 60, dur: 42 }), 80);
  });

  (function frame() {
    requestAnimationFrame(frame);
    g.clearRect(0, 0, W, H);
    if (!m.seen) { label.style.opacity = 0; return; }
    if (++n % 8 === 0) aim(document.elementFromPoint(m.x, m.y));
    f.x += (m.x - f.x) * 0.12; f.y += (m.y - f.y) * 0.12;
    v.x *= 0.9; v.y *= 0.9;
    open += ((target ? 1 : 0) - open) * 0.18;

    // the glow that follows
    const gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, 52 + open * 20);
    gr.addColorStop(0, `rgba(${C},.14)`); gr.addColorStop(1, `rgba(${C},0)`);
    g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, 72, 0, Math.PI * 2); g.fill();
    // the tail, along the way it is moving
    let px = m.x, py = m.y, sx = -v.x * 1.4, sy = -v.y * 1.4;
    for (let i = 0; i < 12; i++) {
      const nx = px + sx, ny = py + sy;
      g.strokeStyle = `rgba(${C},${(0.5 * (1 - i / 12)).toFixed(3)})`; g.lineWidth = 2 * (1 - i / 12) + 0.3;
      g.beginPath(); g.moveTo(px, py); g.lineTo(nx, ny); g.stroke();
      px = nx; py = ny; sx *= 0.78; sy *= 0.78;
    }
    // dot and ring; the ring opens over anything you can press
    g.fillStyle = `rgba(${C},.95)`; g.beginPath(); g.arc(f.x, f.y, 1.5 + open * 0.5, 0, Math.PI * 2); g.fill();
    g.strokeStyle = `rgba(${C},${(0.28 + open * 0.5).toFixed(3)})`; g.lineWidth = 0.8 + open * 0.4;
    g.beginPath(); g.arc(f.x, f.y, 9 + open * 17, 0, Math.PI * 2); g.stroke();
    label.style.opacity = open > 0.5 && label.textContent ? 1 : 0;
    label.style.transform = `translate(${f.x + 30}px, ${f.y - 8}px)`;
    // sparks
    g.shadowColor = `rgb(${C})`; g.shadowBlur = 5;
    for (const s of sparks) {
      s.life++; s.x += s.vx; s.y += s.vy; s.vx *= 0.96; s.vy *= 0.96;
      const a = 1 - s.life / s.max; if (a <= 0) continue;
      g.fillStyle = `rgba(${C},${(a * 0.8).toFixed(3)})`; g.beginPath(); g.arc(s.x, s.y, s.r * a, 0, Math.PI * 2); g.fill();
    }
    g.shadowBlur = 0;
    for (let i = sparks.length - 1; i >= 0; i--) if (sparks[i].life >= sparks[i].max) sparks.splice(i, 1);
    // click rings
    for (const r of rings) {
      r.t++; const u = r.t / r.dur, e = 1 - Math.pow(1 - u, 3);
      g.strokeStyle = `rgba(${C},${(0.7 * (1 - u)).toFixed(3)})`; g.lineWidth = 1.2;
      g.beginPath(); g.arc(r.x, r.y, 4 + e * r.to, 0, Math.PI * 2); g.stroke();
    }
    for (let i = rings.length - 1; i >= 0; i--) if (rings[i].t >= rings[i].dur) rings.splice(i, 1);
  })();
}
