// Her Flow take (main.js → FLOW_HER), drawn from memory instead of played as a video.
//
// 24 Sep, third go. Seeking the video looked like a flip-book; playing it toward a pose made her late, because
// the take is one path (right, up, left, down-left) and she had to replay every pose in between. So every
// frame now sits in one sheet (anita-flow.webp, cut out, 12 fps), and any frame can be drawn at once:
//   · her gaze chases the cursor like a person's: quick, with a soft landing, a little idle drift when still
//   · the nearest pose on the take to that gaze is where she goes; a short way along the take she glides there
//     (neighbouring frames blended, so it reads smoother than 12 fps)
//   · a long way along the take (right to left, say) she does not replay the detour: the new pose comes up
//     over the old one in a sixth of a second, like a glance
// Several takes can share the sheet (`takes`, one pose list each, in the order they were packed): she uses
// whichever take has the pose nearest the gaze, and moving to another take is always a glance.

// The nearest pose to a gaze on one take's path: { t, score }. Height counts a little more than width (wy),
// and when two moments look alike the one closer to `from` wins (so she takes the short way).
function nearest(poses, x, y, wy, from) {
  let best = { t: 0, score: Infinity };
  for (let i = 0; i < poses.length - 1; i++) {
    const a = poses[i], b = poses[i + 1];
    if (!a || !b) continue;
    const dx = b[1] - a[1], dy = (b[2] - a[2]) * wy, px = x - a[1], py = (y - a[2]) * wy;
    const L = dx * dx + dy * dy, u = L ? Math.min(1, Math.max(0, (px * dx + py * dy) / L)) : 0;
    const t = a[0] + u * (b[0] - a[0]), score = (px - u * dx) ** 2 + (py - u * dy) ** 2 + (from == null ? 0 : Math.abs(t - from) * 0.02);
    if (score < best.score) best = { t, score };
  }
  return best;
}

export class FlowHer {
  constructor(canvas, { sheet, meta, takes }) {
    this.cv = canvas; this.g = canvas.getContext('2d'); this.takes = takes;
    this.k = 0; this.t = 0; this.gx = 0; this.gy = 0; this.from = null; this.mix = 1; this.ready = false;
    Promise.all([fetch(meta).then(r => r.json()), new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = sheet; })])
      .then(async ([m, img]) => {
        this.m = m; this.img = img;
        try { await img.decode(); } catch {}
        this.D = (m.n - 1) / m.fps; this.ready = true; this.onready?.();
      }).catch(() => {});
  }

  // x, y: where she should look, -1 … 1 each way (screen left / up = -1). null: nobody there, she looks at you.
  tick(dt, x, y, now) {
    if (!this.ready) return;
    // the gaze: eyes get there fast and settle (≈90 ms), plus a slow drift so she is never a still picture
    const tx = (x ?? 0) + Math.sin(now * 0.45) * 0.05, ty = (y ?? 0) + Math.sin(now * 0.31 + 1) * 0.04;
    const k = 1 - Math.exp(-dt * 11);
    this.gx += (tx - this.gx) * k; this.gy += (ty - this.gy) * k;

    // the best pose over every take; staying on this take is worth a little, so she does not flicker between takes
    let want = null;
    this.takes.forEach((poses, k) => {
      const c = nearest(poses, this.gx, this.gy, 1.5, k === this.k ? this.t : null);
      if (k !== this.k) c.score += 0.03;
      if (!want || c.score < want.score) want = { ...c, k };
    });
    if (want.k !== this.k || Math.abs(want.t - this.t) > 0.9) {   // the glance
      this.from = [this.k, this.t]; this.k = want.k; this.t = want.t; this.mix = 0;
    }
    else this.t += (want.t - this.t) * (1 - Math.exp(-dt * 14));                              // the glide
    if (this.mix < 1) this.mix = Math.min(1, this.mix + dt / 0.16);
    this.draw();
  }

  draw() {
    const cv = this.cv, g = this.g, { w, h } = this.m;
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    g.clearRect(0, 0, w, h);
    if (this.mix < 1 && this.from) { this.frame(...this.from, 1); this.frame(this.k, this.t, this.mix); }
    else this.frame(this.k, this.t, 1);
  }

  // a moment on the take: the frame before it, and the frame after laid over it by how far between they are
  frame(k, t, alpha) {
    const { fps } = this.m, [first, n] = this.m.clips ? this.m.clips[k] : [0, this.m.n];
    const f = Math.min(n - 1, Math.max(0, t * fps)), i = Math.floor(f), u = f - i;
    this.cell(first + i, alpha);
    if (u > 0.02 && i + 1 < n) this.cell(first + i + 1, alpha * u);
  }
  cell(i, alpha) {
    const { w, h, cols } = this.m, g = this.g;
    g.globalAlpha = alpha;
    g.drawImage(this.img, (i % cols) * w, Math.floor(i / cols) * h, w, h, 0, 0, w, h);
    g.globalAlpha = 1;
  }
}
