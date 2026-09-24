// ANITA as a flipbook: J's Sept-7 sprite sheets (sprite-kit/), played on a 2D canvas.
//
// J's rules, kept exactly:
//   1. Never two of her at once. Clips CUT, they never cross-fade.
//   2. Every clip starts from the master pose, so a clip cuts IN on its frame 0.
//   3. One clip at a time. When a clip is released it keeps playing until it is back at
//      its frame 0 (or an `exits` frame) and cuts OUT there, unless that is more than
//      a second away, in which case it cuts at once.
//   4. She did not follow the mouse (J, 09-07). Changed on request, 23 Sep: in the hero her eyes
//      and head now follow the cursor, using J's own `gaze` clip (kept in the kit, unused until now).
//      Done the way the reel Dee shared does it: the cursor's left-right position scrubs through one
//      continuous take of her turning (frames 67-112 of that clip, no blinks), and a small nod adds up/down.
//      She cuts in and out of it on its centre frame, the master pose.
//
// The sheets here are J's, re-packed at 450×800 a frame (the originals are 720×1280 and
// decode to ~240 MB a page). Same json format: frame n lives on files[n / perPage],
// column n % cols, row (n % perPage) / cols.

export class Anita {
  constructor(canvas, base = 'assets/sprites/') {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.base = base;
    this.clips = {}; this.cur = null; this.want = 'idle'; this.t = 0; this.stopAt = null;
    this.speed = 1; this.ready = false;
  }

  async load(name) {
    if (this.clips[name]) return this.clips[name].ready;
    const clip = this.clips[name] = { name };
    clip.ready = (async () => {
      const meta = await (await fetch(this.base + name + '.json')).json();
      const pages = await Promise.all(meta.files.map(f => new Promise((res, rej) => {
        const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = this.base + f;
      })));
      Object.assign(clip, { meta, pages, exits: meta.exits && meta.exits.length ? meta.exits : [0] });
      return clip;
    })();
    return clip.ready;
  }

  // ask for a clip; she gets there by J's cut rules, not instantly
  play(name) { this.want = name; }

  _range(c) { return c.meta.range || [0, c.meta.frames - 1]; }

  // where the cursor is, relative to her face: nx, ny in -1..1. on = false when there is no cursor.
  look(nx, ny, on) { this.gx = nx; this.gy = ny; this.gazeOn = on; }

  // The reel's method (a Framer cursor-tracking component scrubbing one Veo clip along an axis): the cursor's
  // left-right position scrubs straight through one continuous, blink-free take of her turning her head, frames
  // `sweep` of J's gaze clip (67 → 112, looking left → right). Nothing jumps across the clip any more; she moves
  // through neighbouring frames only. The target is fractional: where her measured direction crosses the cursor's.
  _gazeTarget(g, home) {
    const m = g.meta, yaw = m.yaw, [a, b] = m.sweep || [0, m.frames - 1];
    const L = yaw[a], R = yaw[b];                            // her furthest left and right in the take
    const ty = home ? 0 : (this.gx < 0 ? -this.gx * L : this.gx * R);
    if (ty <= L) return a;
    if (ty >= R) return b;
    for (let f = a; f < b; f++) {
      const y0 = yaw[f], y1 = yaw[f + 1];
      if ((ty - y0) * (ty - y1) <= 0) return f + (y1 === y0 ? 0 : (ty - y0) / (y1 - y0));
    }
    return a;
  }

  _centre(g) { return this._gazeTargetHome ??= (() => { const keep = this.gx; this.gx = 0; const f = this._gazeTarget(g, true); this.gx = keep; return f; })(); }

  _gazeUpdate(dt) {
    const g = this.clips.gaze, idle = this.clips.idle;
    const stay = this.gazeOn && this.want === 'idle';
    const target = this._gazeTarget(g, !stay);
    // the nod: down up to 9 px, up up to 6 px (frame pixels), eased so it never snaps; back to level when leaving
    const want = stay ? (this.gy > 0 ? this.gy * 9 : this.gy * 6) : 0;
    this.tiltNow = (this.tiltNow || 0) + (want - (this.tiltNow || 0)) * Math.min(1, dt * 6);
    // scrubbing, eased like the reel: quick to follow, never snapping
    this.t += (target - this.t) * Math.min(1, dt * 9);
    // home again and nobody to look at: cut back (centre frame ≈ master pose)
    if (!stay && Math.abs(target - this.t) < 0.6 && Math.abs(this.tiltNow) < 0.3) {
      const next = this.clips[this.want];
      this._cutTo(next && next.meta && this.want !== 'gaze' ? next : idle);
    }
    this.draw();
  }

  update(dt) {
    const idle = this.clips.idle;
    if (!idle || !idle.meta) return;
    if (!this.cur) { this.cur = idle; this.t = this._range(idle)[0]; }
    const g = this.clips.gaze;
    if (g && g.meta) {
      if (this.cur === g) return this._gazeUpdate(dt);
      // someone is here: she turns to them, cutting in on the gaze clip's centre frame
      if (this.cur === idle && this.want === 'idle' && this.gazeOn && this.stopAt === null) { this.cur = g; this.t = this._centre(g); return this._gazeUpdate(dt); }
    }

    const wanted = this.clips[this.want];
    const canCut = wanted && wanted.meta && wanted !== this.cur;
    if (canCut && this.stopAt === null) {
      if (this.cur === idle) this._cutTo(wanted);          // idle is the master pose: cut in straight away
      else this.stopAt = this._nextExit(this.cur);         // finish the motion first
    }
    if (!canCut && this.want === this.cur.name) this.stopAt = null;

    const c = this.cur, [a, b] = this._range(c), before = this.t;
    this.t += dt * c.meta.fps * this.speed;
    if (this.t > b) this.t = a + (this.t - b);
    if (this.stopAt !== null) {
      const passed = before <= this.stopAt ? this.t >= this.stopAt || this.t < before : this.t >= this.stopAt && this.t < before;
      if (passed) { this.stopAt = null; this._cutTo(wanted && wanted.meta ? wanted : idle); }
    }
    this.draw();
  }

  _cutTo(clip) { this.cur = clip; this.t = this._range(clip)[0]; this.stopAt = null; }

  // where to cut away: the frame nearest her resting pose within the next two seconds (J's rule: finish the
  // motion, then cut). `pose` is each frame's distance from the idle master pose, measured from the sheets;
  // without it, the next marked exit frame.
  _nextExit(c) {
    const [a, b] = this._range(c), horizon = c.meta.fps * 2, pose = c.meta.pose;
    let f = Math.floor(this.t), best = null, bestD = Infinity;
    for (let i = 1; i <= horizon; i++) {
      f = f + 1 > b ? a : f + 1;
      const d = pose ? pose[f] + i * 0.02 : (c.exits.includes(f) ? i : Infinity);   // a nudge toward sooner
      if (d < bestD) { bestD = d; best = f; }
    }
    return best ?? (Math.floor(this.t) + 1 > b ? a : Math.floor(this.t) + 1);
  }

  draw() {
    const c = this.cur; if (!c) return;
    const { meta, pages } = c, cv = this.canvas, g = this.ctx;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    g.clearRect(0, 0, W, H);
    const n = Math.min(meta.frames - 1, Math.max(0, Math.round(this.t)));
    const page = pages[Math.floor(n / meta.perPage)], k = n % meta.perPage;
    const sx = (k % meta.cols) * meta.fw, sy = Math.floor(k / meta.cols) * meta.fh;
    // fit by height, feet on the bottom edge, centred
    const al = meta.align || { dx: 0, dy: 0, scale: 1 };
    const h = H * al.scale, w = h * meta.fw / meta.fh;
    const dx0 = (W - w) / 2 + al.dx / meta.fw * w, dy0 = H - h - al.dy / meta.fh * h;
    g.drawImage(page, sx, sy, meta.fw, meta.fh, dx0, dy0, w, h);
    if (c.name === 'gaze' && Math.abs(this.tiltNow || 0) > 0.15) this._tilt(page, sx, sy, dx0, dy0, w / meta.fw);
    this.ready = true;
  }

  // Up and down. J's gaze clip turns left and right, and only looks down while turned to her right, so the
  // vertical is added here: her face is moved down (or up) inside her head, most at eye level and not at
  // all at the crown or the chin, like a small nod. Drawn in thin strips from the frame itself; nothing is
  // painted on. Band measured on the 450×800 gaze frames: crown ≈ 50, eyes ≈ 120, chin ≈ 168, x 150–305.
  _tilt(page, sx, sy, dx0, dy0, k) {
    const g = this.ctx, A = this.tiltNow, X0 = 150, X1 = 305, Y0 = 48, EYE = 120, Y1 = 172;
    const bump = y => Math.sin(Math.PI * (y < EYE ? 0.5 * (y - Y0) / (EYE - Y0) : 0.5 + 0.5 * (y - EYE) / (Y1 - EYE)));
    g.clearRect(dx0 + X0 * k, dy0 + Y0 * k, (X1 - X0) * k, (Y1 - Y0) * k);
    for (let y = Y0; y < Y1; y += 2) {
      // each destination row takes the source row that the nod moves into it
      const off = A * bump(y);
      g.drawImage(page, sx + X0, sy + y - off, X1 - X0, 2, dx0 + X0 * k, dy0 + y * k, (X1 - X0) * k, 2 * k + 1);
    }
  }
}
