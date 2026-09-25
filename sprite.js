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
//   5. 25 Sep, on Dee's feedback ("more human, not glitches"): rule 1 is bent a little. A switch between clips is a
//      0.18 s dissolve from the frame she was on (0.3 s into and out of talking) (BLEND below; 0 gives J's hard cut back), because hard cuts between
//      these renders read as glitches. And she only turns to look at you from idle frames whose pose already matches
//      the gaze clip's centre (idle.json `lookFrom`, measured), so her head never snaps.
//
// The sheets here are J's, re-packed at 450×800 a frame (the originals are 720×1280 and
// decode to ~240 MB a page). Same json format: frame n lives on files[n / perPage],
// column n % cols, row (n % perPage) / cols.

const BLEND = 0.18;       // seconds of dissolve when she changes clip (0 = J's hard cut, everywhere)
const BLEND_SOFT = 0.3;   // into and out of talking (her arms are mid-gesture for most of it)
const RUSH = 3;           // when someone appears mid-sway, her resting motion plays this much faster (forward or back)
                          // into the nearest pose she can turn from, like someone noticing you, then she turns
const DECODE_AHEAD = 2.5; // seconds of talking decoded ahead of her (a sheet page lasts 2.75 s and takes ~0.3 s to decode)
const LEAN_EASE = 1.0;    // seconds to come back upright after a clip change (see _switch)

export class Anita {
  constructor(canvas, base = 'assets/sprites/') {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.base = base;
    this.clips = {}; this.cur = null; this.want = 'idle'; this.t = 0; this.stopAt = null;
    this.speed = 1; this.ready = false;
    this.lean = 0; this.leanFrom = 0; this.leanT = LEAN_EASE;
  }

  async load(name) {
    if (this.clips[name]) return this.clips[name].ready;
    const clip = this.clips[name] = { name };
    clip.ready = (async () => {
      const meta = await (await fetch(this.base + name + '.json')).json();
      const pages = await Promise.all(meta.files.map(f => new Promise((res, rej) => {
        const im = new Image(); im.decoding = 'async'; im.onload = () => res(im); im.onerror = rej; im.src = this.base + f;
      })));
      Object.assign(clip, { meta, pages, exits: meta.exits && meta.exits.length ? meta.exits : [0], bm: {}, pb: {}, fbm: {} });
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
    // scrubbing, eased like the reel: quick to follow, never snapping. Not during the dissolve in: she holds the
    // pose it started from, so the two frames being blended match and nothing doubles
    if (!this.fade) this.t += (target - this.t) * Math.min(1, dt * 9);
    // home again and nobody to look at: cut back (centre frame ≈ master pose)
    if (!stay && Math.abs(target - this.t) < 0.6 && Math.abs(this.tiltNow) < 0.3) {
      const next = this.clips[this.want];
      const to = next && next.meta && this.want !== 'gaze' ? next : idle;
      this._cutTo(to, to.name === 'talk' ? BLEND_SOFT : BLEND);
    }
    this.draw();
  }

  update(dt) {
    const idle = this.clips.idle;
    if (!idle || !idle.meta) return;
    this._decodeAhead(dt);
    if (this.fade && (this.fade.k -= dt / this.fade.secs) <= 0) this.fade = null;
    if (this.leanT < LEAN_EASE) {
      this.leanT = Math.min(LEAN_EASE, this.leanT + dt); const u = this.leanT / LEAN_EASE;
      this.lean = this.leanFrom * (1 - u * u * (3 - 2 * u));                 // eased at both ends: no jerk
    }
    if (!this.cur) { this.cur = idle; this.t = this._range(idle)[0]; }
    const g = this.clips.gaze;
    if (g && g.meta) {
      if (this.cur === g) return this._gazeUpdate(dt);
      // someone is here: she turns to them, cutting in on the gaze clip's centre frame, only from an idle frame that
      // already has that pose and lean (so nothing snaps or slides). Mid-sway, she first settles into the nearest such
      // frame quickly (this.rush, played below), the way a person straightens up when they notice you
      this.rush = 0;
      if (this.cur === idle && this.want === 'idle' && this.gazeOn && this.stopAt === null && !this.fade) {
        if (this._canLook(idle)) { this._switch(g, this._centre(g), BLEND); return this._gazeUpdate(dt); }
        this.rush = this._toLook(idle);
      }
    }

    const wanted = this.clips[this.want];
    const canCut = wanted && wanted.meta && wanted !== this.cur;
    if (canCut && this.stopAt === null) {
      if (this.cur === idle) this._cutTo(wanted, wanted.name === 'talk' ? BLEND_SOFT : BLEND);   // idle is the master pose: cut in straight away
      else this.stopAt = this._nextExit(this.cur, this.cur.name === 'talk' ? 0.4 : 2);   // finish the motion first (talking: settle fast, she has stopped speaking)
    }
    if (!canCut && this.want === this.cur.name) this.stopAt = null;

    const c = this.cur, [a, b] = this._range(c), before = this.t;
    if (this.rush && c === idle) {                                              // settling to turn (see above)
      this.t += Math.sign(this.rush) * Math.min(Math.abs(this.rush), dt * c.meta.fps * RUSH);
      if (this.t > b) this.t -= b - a + 1; else if (this.t < a) this.t += b - a + 1;
    } else {
      this.t += dt * c.meta.fps * this.speed;
      if (this.t > b) {                                                         // the loop's seam, dissolved
        const over = this.t - b, stop = this.stopAt; this.t = b; this._switch(c, a + over, BLEND); this.stopAt = stop;
      }
    }
    if (this.stopAt !== null) {
      const passed = before <= this.stopAt ? this.t >= this.stopAt || this.t < before : this.t >= this.stopAt && this.t < before;
      if (passed) { this.stopAt = null; this._cutTo(wanted && wanted.meta ? wanted : idle, c.name === 'talk' ? BLEND_SOFT : BLEND); }
    }
    this.draw();
  }

  _cutTo(clip, secs = BLEND) { this._switch(clip, this._range(clip)[0], secs); }

  // Every change of clip (or of place in one). J's idle loop sways her from the feet, up to 24 px at the head, and
  // the other clips stand upright, so a change mid-sway put two of her side by side in the dissolve. The new clip
  // is leaned from the feet so her upper body stays exactly where it was (each clip's `lean`, measured per frame),
  // then she comes back upright over LEAN_EASE. The frame fading out leans with her (dLean)
  _switch(clip, t, secs = BLEND) {
    const old = this.cur, n = Math.round(this.t), L0 = this.lean;
    this._blendFrom(secs, n);
    this.cur = clip; this.t = t; this.stopAt = null;
    if (old && old.meta) {
      const L1 = L0 + this._leanOf(old, n) - this._leanOf(clip, t);
      if (this.fade) this.fade.dLean = (this.fade.dLean || 0) + L0 - L1;   // the fading frame stays where it was
      this.lean = this.leanFrom = L1; this.leanT = 0;
    }
  }

  _leanOf(c, t) { const a = c.meta.lean; return a ? a[Math.min(a.length - 1, Math.max(0, Math.round(t)))] : 0; }

  // lean the drawing from her feet: L frame pixels at head height, none at the feet (canvas bottom)
  _lean(g, L, H) { const k = -L / 760; g.setTransform(1, 0, k, 1, -k * H, 0); }

  // the frame she is leaving fades out over the new one. If a change is still mostly showing its old frame, that
  // one keeps fading (starting again would make it jump back in)
  _blendFrom(secs = BLEND, n = Math.round(this.t)) {
    if (!BLEND || !this.cur || !this.cur.meta || (this.fade && this.fade.k > 0.5)) return;
    this.fade = { clip: this.cur, n, k: 1, secs };
  }

  // may she turn to look from the idle frame she is on?
  _canLook(idle) { const f = Math.round(this.t), r = idle.meta.lookFrom; return !r || r.some(([a, b]) => f >= a && f <= b); }

  // ── decoded copies of her sheets (25 Sep). A sheet page is 4950×4800 (~95 MB decoded); the browser drops pages it has
  // not drawn for a while and decodes them again on the next draw, which froze her for ~0.3 s whenever she turned to
  // the cursor after resting, started talking, or reached a new page while talking. These copies are decoded off the
  // main thread (createImageBitmap from the file) and kept, so drawing never waits.

  // keep frames from..to of a clip decoded for good (her look: only the sweep frames are ever drawn)
  async keepFrames(name, from, to) {
    const c = this.clips[name]; if (!c || typeof createImageBitmap !== 'function') return;
    await c.ready; const m = c.meta;
    for (let p = Math.floor(from / m.perPage); p <= Math.floor(to / m.perPage); p++) {
      try {
        const pb = await createImageBitmap(await (await fetch(this.base + m.files[p])).blob());
        for (let f = Math.max(from, p * m.perPage); f <= Math.min(to, (p + 1) * m.perPage - 1); f++) {
          const k = f % m.perPage;
          c.fbm[f] = await createImageBitmap(pb, (k % m.cols) * m.fw, Math.floor(k / m.cols) * m.fh, m.fw, m.fh);
        }
        pb.close();
      } catch (e) { /* the sheet image stays the source */ }
    }
  }

  // start decoding page p of a clip (if it is not already), into single-frame copies (small, so the first draw of each
  // is quick too); the sheet image is drawn until they are ready
  warm(name, p) { const c = this.clips[name]; if (c && c.meta) this._bmPage(c, p); }
  _bmPage(c, p) {
    if (c.bm[p] || typeof createImageBitmap !== 'function') return;
    c.bm[p] = 'pending';
    (async () => {
      try {
        const m = c.meta, pb = await createImageBitmap(await (await fetch(this.base + m.files[p])).blob());
        if (c.bm[p] !== 'pending') { pb.close(); return; }                  // released while decoding
        c.pb[p] = pb;                                                          // usable at once, while the frames are cut
        const fs = []; for (let f = p * m.perPage; f < Math.min(m.frames, (p + 1) * m.perPage); f++) fs.push(f);
        const got = await Promise.all(fs.map(f => { const k = f % m.perPage;
          return createImageBitmap(pb, (k % m.cols) * m.fw, Math.floor(k / m.cols) * m.fh, m.fw, m.fh); }));
        if (c.bm[p] !== 'pending') { got.forEach(bm => bm.close()); return; }
        fs.forEach((f, i) => { c.fbm[f] = got[i]; });
        c.bm[p] = 'ready'; delete c.pb[p]; pb.close();
      } catch (e) { delete c.bm[p]; if (c.pb[p]) { c.pb[p].close(); delete c.pb[p]; } }
    })();
  }
  _dropPages(c, keep) {
    const m = c.meta;
    for (const key of Object.keys(c.bm)) {
      const p = +key; if (keep.includes(p)) continue;
      if (c.bm[p] === 'ready') for (let f = p * m.perPage; f < Math.min(m.frames, (p + 1) * m.perPage); f++) if (c.fbm[f]) { c.fbm[f].close(); delete c.fbm[f]; }
      if (c.pb[p]) { c.pb[p].close(); delete c.pb[p]; }
      delete c.bm[p];
    }
  }
  // talking: the page she is on and the page coming up are decoded; pages she has left are released. Her first talk
  // page stays, so the next time she talks it starts without a wait
  _decodeAhead(dt) {
    const talk = this.clips.talk; if (!talk || !talk.meta) return;
    const per = talk.meta.perPage;
    if (this.cur === talk) {
      const [a, b] = this._range(talk), here = Math.floor(this.t / per);
      let ahead = this.t + DECODE_AHEAD * talk.meta.fps; if (ahead > b) ahead = a + (ahead - b);
      const next = Math.floor(ahead / per);
      this._bmPage(talk, here); this._bmPage(talk, next); this._dropPages(talk, [0, here, next]);
      this.talkRest = 0;
    } else if ((this.talkRest = (this.talkRest || 0) + dt) > 3) this._dropPages(talk, [0]);
  }

  // frames to the nearest idle frame she can turn from: + ahead, - back (the idle clip loops)
  _toLook(idle) {
    const r = idle.meta.lookFrom; if (!r) return 0;
    const [a, b] = this._range(idle), n = b - a + 1, f = this.t;
    let ahead = Infinity, back = Infinity;
    for (const [s, e] of r) { ahead = Math.min(ahead, ((s - f) % n + n) % n); back = Math.min(back, ((f - e) % n + n) % n); }
    return ahead <= back ? ahead : -back;
  }

  // where to cut away: the frame nearest her resting pose within the next two seconds (J's rule: finish the
  // motion, then cut). `pose` is each frame's distance from the idle master pose, measured from the sheets;
  // without it, the next marked exit frame.
  _nextExit(c, secs = 2) {
    const [a, b] = this._range(c), horizon = Math.max(1, Math.round(c.meta.fps * secs)), pose = c.meta.pose;
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
    const { meta } = c, cv = this.canvas, g = this.ctx;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const W = Math.round(cv.clientWidth * dpr), H = Math.round(cv.clientHeight * dpr);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, W, H);
    this._lean(g, this.lean, H);
    const f = this._frame(c, this.t, W, H);
    if (c.name === 'gaze' && Math.abs(this.tiltNow || 0) > 0.15) this._tilt(f.page, f.sx, f.sy, f.dx0, f.dy0, f.w / meta.fw);
    if (this.fade) {
      this._lean(g, this.lean + (this.fade.dLean || 0), H);
      g.globalAlpha = this.fade.k; this._frame(this.fade.clip, this.fade.n, W, H); g.globalAlpha = 1;
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.ready = true;
  }

  _frame(c, t, W, H) {
    const { meta, pages } = c, g = this.ctx;
    const n = Math.min(meta.frames - 1, Math.max(0, Math.round(t)));
    const pi = Math.floor(n / meta.perPage), k = n % meta.perPage, kept = c.fbm && c.fbm[n];
    const page = kept || (c.pb && c.pb[pi]) || pages[pi];   // a decoded copy if there is one (see keepFrames, _bmPage)
    const sx = kept ? 0 : (k % meta.cols) * meta.fw, sy = kept ? 0 : Math.floor(k / meta.cols) * meta.fh;
    // fit by height, feet on the bottom edge, centred, then moved and scaled by the clip's alignment
    const place = al => { const h = H * (al.scale ?? 1), w = h * meta.fw / meta.fh;
      return { w, h, x: (W - w) / 2 + (al.dx || 0) / meta.fw * w, y: H - h - (al.dy || 0) / meta.fh * h }; };
    const body = place(meta.align || {});
    if (!meta.alignHead) {
      g.drawImage(page, sx, sy, meta.fw, meta.fh, body.x, body.y, body.w, body.h);
      return { page, sx, sy, dx0: body.x, dy0: body.y, w: body.w };
    }
    // The gaze and talk renders have other proportions than the idle loop (a bigger head for its body), so one
    // alignment cannot match both her head and her feet, and a clip change made her head jump. Drawn in 8 px strips
    // instead: the head placed by alignHead, the legs by align, blending between them down the torso (headTo rows).
    // Strip edges land on whole pixels, so there are no seams, even while a clip change fades (25 Sep)
    const head = place(meta.alignHead), [r0, r1] = meta.headTo, STEP = 8;
    const at = y => { const u = Math.min(1, Math.max(0, (y - r0) / (r1 - r0))), m = u * u * (3 - 2 * u);
      return { x: head.x + (body.x - head.x) * m, w: head.w + (body.w - head.w) * m,
               y: Math.round(head.y + (body.y - head.y) * m + y * (head.h + (body.h - head.h) * m) / meta.fh) }; };
    for (let y = 0; y < meta.fh; y += STEP) {
      const sh = Math.min(STEP, meta.fh - y), a = at(y), b = at(y + sh), mid = at(y + sh / 2);
      if (b.y > a.y) g.drawImage(page, sx, sy + y, meta.fw, sh, mid.x, a.y, mid.w, b.y - a.y);
    }
    return { page, sx, sy, dx0: head.x, dy0: head.y, w: head.w };
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
