// Her memory, drawn as a network sphere (reference: ausdata.ai).
// Every dot is something she has kept; the threads are what she has connected.
// Like the reference it spins on its own, takes extra spin from how fast the mouse
// moves, can be dragged and thrown (it eases back to its own pace), and wobbles
// slowly on its tilt. A few dots are named memories that swell when you point at them.
// Canvas 2D, not WebGL: ~600 dots and their threads do not need a GPU pipeline.

const TAU = Math.PI * 2;
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };

export class MemorySphere {
  constructor(canvas, { count = 620, named = [] } = {}) {
    this.cv = canvas; this.g = canvas.getContext('2d');
    // where it sits and how present it is — the page moves these as you scroll
    this.at = { x: 0.68, y: 0.5, r: 0.36, alpha: 1 };
    this.want = { ...this.at };
    this.grow = 0.2;        // 0..1, how much of her memory is filled in
    this.rotX = -0.3; this.rotY = 0; this.spinX = 0; this.spinY = 0;
    this.drag = null; this.hover = null; this.pulses = [];
    this.m = { x: -1e4, y: -1e4, vx: 0, vy: 0, last: 0 };

    const P = this.pts = [], ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2, r = Math.sqrt(1 - y * y), a = i * ga, j = 1 + (rnd(i) - 0.5) * 0.05;
      P.push({ x: Math.cos(a) * r * j, y: y * j, z: Math.sin(a) * r * j, order: rnd(i + 900), sx: 0, sy: 0, sz: 0, hot: 0 });
    }
    // threads: every dot to its three nearest, once per pair
    const E = this.edges = [], seen = new Set();
    for (let i = 0; i < count; i++) {
      const near = [];
      for (let k = 0; k < count; k++) if (k !== i) { const a = P[i], b = P[k]; near.push([(a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2, k]); }
      near.sort((m, n) => m[0] - n[0]);
      for (let q = 0; q < 3; q++) { const k = near[q][1], key = Math.min(i, k) * 1e5 + Math.max(i, k); if (!seen.has(key)) { seen.add(key); E.push([i, k, 0]); } }
    }
    // the long threads: connections she worked out herself, across the whole sphere
    for (let i = 0; i < 30; i++) E.push([Math.floor(rnd(i + 50) * count), Math.floor(rnd(i + 80) * count), 1]);
    // named memories, spread over the sphere
    this.named = named.map((text, i) => { const p = P[Math.floor((i + 0.5) / named.length * count)]; p.name = text; p.order = 0; p.swell = 0; return p; });

    addEventListener('pointermove', e => {
      const now = performance.now(), dt = Math.max(8, now - this.m.last);
      if (this.m.last) { this.m.vx = (e.clientX - this.m.x) / dt; this.m.vy = (e.clientY - this.m.y) / dt; }
      this.m.x = e.clientX; this.m.y = e.clientY; this.m.last = now;
      if (this.drag) { this.spinY = this.m.vx * 0.9; this.spinX = this.m.vy * 0.9; }
    }, { passive: true });
    addEventListener('pointerup', () => { this.drag = null; });
    addEventListener('blur', () => { this.drag = null; });
  }

  // grab it from an element laid over it (the page decides where you may drag)
  grab(el) {
    el.addEventListener('pointerdown', e => { if (e.button === 0) { this.drag = { x: e.clientX, y: e.clientY }; e.preventDefault(); } });
  }
  isNear(x, y) { const c = this._c; return c && Math.hypot(x - c.x, y - c.y) < c.R * 1.15; }

  // a named memory can be cut (the privacy section) and learned again
  forget(text, gone = true) { for (const p of this.named) if (p.name === text) p.gone = gone; }

  // a memory has just been kept: a ring runs out from a dot on the front
  pulse() {
    const front = this.pts.filter(p => p.sz > 0.35 && p.lit);
    const p = front[Math.floor(Math.random() * front.length)] || this.pts[0];
    this.pulses.push({ p, t: 0 });
  }

  update(dt, t) {
    const cv = this.cv, g = this.g, dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (!W || !H) return;
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    for (const k in this.want) this.at[k] += (this.want[k] - this.at[k]) * Math.min(1, dt * 3.2);
    const A = this.at;
    const cx = A.x * cv.clientWidth, cy = A.y * cv.clientHeight, R = A.r * Math.min(cv.clientWidth, cv.clientHeight * 1.25);
    this._c = { x: cx, y: cy, R };
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    if (A.alpha < 0.01) return;
    g.globalAlpha = A.alpha;

    // motion: own spin, plus the mouse's speed while it is near, plus a slow tilt wobble
    const quiet = performance.now() - this.m.last > 2000;
    if (!this.drag && !quiet && this.isNear(this.m.x, this.m.y)) { this.spinY += this.m.vx * 0.02; this.spinX += this.m.vy * 0.02; }
    if (!this.drag) { this.spinY *= Math.pow(0.08, dt); this.spinX *= Math.pow(0.08, dt); }   // throws ease back to rest
    this.rotY += (0.09 + this.spinY * 1.8) * dt;
    this.rotX = -0.3 + 0.18 * Math.sin(t * 0.12) + (this.rotXd = (this.rotXd || 0) + this.spinX * 1.8 * dt);
    this.rotXd *= Math.pow(0.4, dt);

    const ry = this.rotY + (this.turn || 0);   // the page turns it a little as you scroll
    const cyA = Math.cos(ry), syA = Math.sin(ry), cxA = Math.cos(this.rotX), sxA = Math.sin(this.rotX);
    let hover = null, hd = 1e9;
    for (const p of this.pts) {
      const x1 = p.x * cyA + p.z * syA, z1 = -p.x * syA + p.z * cyA;
      const y2 = p.y * cxA - z1 * sxA, z2 = p.y * sxA + z1 * cxA, f = 1 / (1 - z2 * 0.25);
      p.sx = cx + x1 * R * f; p.sy = cy + y2 * R * f; p.sz = z2;
      p.lit = p.order < 0.12 + this.grow * 0.88;
      const md = Math.hypot(p.sx - this.m.x, p.sy - this.m.y);
      p.hot += ((md < R * 0.3 ? 1 - md / (R * 0.3) : 0) - p.hot) * 0.15;
      if (p.name && !p.gone && z2 > 0 && md < 26 && md < hd) { hd = md; hover = p; }
    }
    this.hover = hover;

    // the light behind it, and the dashed rings (both from the reference)
    const halo = g.createRadialGradient(cx, cy, R * 0.05, cx, cy, R * 1.35);
    halo.addColorStop(0, 'rgba(25,200,255,.13)'); halo.addColorStop(0.55, 'rgba(25,200,255,.035)'); halo.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = halo; g.fillRect(cx - R * 1.4, cy - R * 1.4, R * 2.8, R * 2.8);
    g.setLineDash([2, 7]); g.lineWidth = 1;
    for (const [k, a] of [[1.16, 0.16], [1.42, 0.08]]) { g.strokeStyle = `rgba(88,230,255,${a})`; g.beginPath(); g.arc(cx, cy, R * k, t * 0.02 * k, t * 0.02 * k + TAU); g.stroke(); }
    g.setLineDash([]);

    // threads
    g.lineWidth = 0.7;
    for (const [i, k, long] of this.edges) {
      const a = this.pts[i], b = this.pts[k];
      if (!a.lit || !b.lit) continue;
      const depth = ((a.sz + b.sz) / 2 + 1) / 2, hot = Math.max(a.hot, b.hot);
      const al = (long ? 0.03 : 0.05) + depth * (long ? 0.09 : 0.22) + hot * 0.55;
      g.strokeStyle = `rgba(${88 + hot * 146 | 0},${230 + hot * 16 | 0},255,${al.toFixed(3)})`;
      g.beginPath(); g.moveTo(a.sx, a.sy);
      if (long) g.quadraticCurveTo(cx + (a.sx + b.sx - 2 * cx) * 0.1, cy + (a.sy + b.sy - 2 * cy) * 0.1, b.sx, b.sy); else g.lineTo(b.sx, b.sy);
      g.stroke();
    }
    // dots: small squares, the swarm's language on the main site
    for (const p of this.pts) {
      const depth = (p.sz + 1) / 2, s = 0.9 + depth * 1.7 + p.hot * 1.8;
      g.fillStyle = p.lit ? `rgba(${157 + p.hot * 97 | 0},243,255,${(0.2 + depth * 0.75).toFixed(3)})` : `rgba(127,154,163,${(0.05 + depth * 0.1).toFixed(3)})`;
      g.fillRect(p.sx - s / 2, p.sy - s / 2, s, s);
    }
    // named memories: a ringed node; its words show while it faces you, fully when pointed at
    g.font = '500 11px Sora, sans-serif'; g.textBaseline = 'middle';
    for (const p of this.named) {
      p.swell += ((p === hover ? 1 : 0) - p.swell) * 0.15;
      p.fade = (p.fade ?? 1) + ((p.gone ? 0 : 1) - (p.fade ?? 1)) * 0.06;
      const face = Math.max(0, Math.min(1, (p.sz - 0.2) * 2.5)) * p.fade;
      if (face <= 0.01) continue;
      const r = 3 + p.swell * 3;
      g.fillStyle = `rgba(234,246,248,${face})`; g.fillRect(p.sx - r / 2, p.sy - r / 2, r, r);
      g.strokeStyle = `rgba(88,230,255,${(face * (0.45 + p.swell * 0.5)).toFixed(3)})`; g.lineWidth = 1;
      g.beginPath(); g.arc(p.sx, p.sy, 7 + p.swell * 5, 0, TAU); g.stroke();
      const a = face * (0.45 + p.swell * 0.55) * Math.min(1, this.grow * 2);
      if (a > 0.02) {
        let right = p.sx > cx; const tw = g.measureText(p.name).width;
        if (!right && p.sx - 16 - tw < 6) right = true;                         // keep the words on screen
        else if (right && p.sx + 16 + tw > cv.clientWidth - 6) right = false;
        const lx = p.sx + (right ? 16 : -16), al = right ? 'left' : 'right';
        g.textAlign = al; g.fillStyle = `rgba(234,246,248,${a.toFixed(3)})`; g.fillText(p.name, lx, p.sy);
      }
    }
    g.textAlign = 'left';
    // pulses: a memory kept
    for (const q of this.pulses) {
      q.t += dt; const u = q.t / 1.8;
      g.strokeStyle = `rgba(88,230,255,${(1 - u).toFixed(3)})`; g.lineWidth = 1.4;
      g.beginPath(); g.arc(q.p.sx, q.p.sy, 4 + u * 64, 0, TAU); g.stroke();
      g.fillStyle = `rgba(234,246,248,${(1 - u).toFixed(3)})`; g.fillRect(q.p.sx - 3, q.p.sy - 3, 6, 6);
    }
    this.pulses = this.pulses.filter(q => q.t < 1.8);
    g.globalAlpha = 1;
  }
}
