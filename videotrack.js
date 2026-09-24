// The cursor-tracking component from the reference reel (a Framer component with `videoFile` and `axis`),
// rebuilt for this page. One video of her slowly turning her head, made in Google Flow (Veo) from her
// master picture; the cursor's position along one axis scrubs the video's time. Cursor at one end of the
// axis = the first frame, the other end = the last frame, the middle = the middle.
//
//   const look = new VideoTrack(videoEl, { axis: 'horizontal', from: 0, to: null, ease: 8 });
//   look.aim(progress);   // 0..1 along the axis, from wherever the page measures the cursor
//   look.tick(dt);        // every frame
//
// Seeking is eased (the time glides toward the cursor instead of jumping) and never stacks: a new seek is
// only asked for when the last one has landed. Encode the video with frequent keyframes for the smoothest
// scrub (Flow's own exports are fine at this length).
export class VideoTrack {
  constructor(video, { axis = 'horizontal', from = 0, to = null, ease = 8 } = {}) {
    Object.assign(this, { video, axis, from, to, ease });
    this.target = 0.5; this.time = null; this.ready = false;
    video.muted = true; video.playsInline = true; video.preload = 'auto'; video.pause();
    const ok = () => { this.ready = true; this.time = this._at(this.target); video.currentTime = this.time; };
    if (video.readyState >= 1) ok(); else video.addEventListener('loadedmetadata', ok, { once: true });
  }
  _at(p) { const end = this.to ?? this.video.duration; return this.from + Math.min(1, Math.max(0, p)) * (end - this.from); }
  aim(p) { this.target = p; }
  tick(dt) {
    if (!this.ready) return;
    const want = this._at(this.target);
    this.time += (want - this.time) * Math.min(1, dt * this.ease);
    if (!this.video.seeking && Math.abs(this.video.currentTime - this.time) > 1 / 60) this.video.currentTime = this.time;
  }
}

// 24 Sep: her Flow take is not one sweep but a PATH through her poses: up and to the right, then level from
// the middle to the left, then leaning down and looking back up to the right. `poses` lists points along it
// as [seconds, x, y] (x: -1 screen left … 1 right, y: -1 up … 1 down); null breaks the path (her one blink).
// The cursor's place on screen picks the nearest point on that path, and that moment is where the video goes.
// Height counts a little more than width (wy), so she only leans down when the cursor is clearly low.
export function poseTime(poses, x, y, wy = 1.5) {
  let best = 0, bd = Infinity;
  for (let i = 0; i < poses.length - 1; i++) {
    const a = poses[i], b = poses[i + 1];
    if (!a || !b) continue;
    const dx = b[1] - a[1], dy = (b[2] - a[2]) * wy, px = x - a[1], py = (y - a[2]) * wy;
    const L = dx * dx + dy * dy, u = L ? Math.min(1, Math.max(0, (px * dx + py * dy) / L)) : 0;
    const d = (px - u * dx) ** 2 + (py - u * dy) ** 2;
    if (d < bd) { bd = d; best = a[0] + u * (b[0] - a[0]); }
  }
  return best;
}

// A VideoTrack that goes to a moment rather than a share of the axis. Nearby moments it glides to; a far one
// (or one across a gap, like her blink) it does not scrub through, since that would replay everything in
// between: a second copy of the video seeks there out of sight and fades in over the first.
export class PoseTrack extends VideoTrack {
  constructor(video, twin, opts = {}) {
    super(video, opts);
    this.twin = twin; this.jump = opts.jump ?? 0.9; this.gaps = opts.gaps || []; this.want = null; this.swap = false;
    twin.muted = true; twin.playsInline = true; twin.preload = 'auto'; twin.pause();
    video.classList.add('is-row'); twin.classList.remove('is-row');
  }
  aimTime(t) { this.want = t; }
  tick(dt) {
    if (!this.ready || this.want == null || this.swap) return;
    const want = this.want, lo = Math.min(want, this.time), hi = Math.max(want, this.time);
    const far = hi - lo > this.jump || this.gaps.some(([a, b]) => lo < b && hi > a);
    if (far) {
      if (this.twin.readyState < 1) { this.time = want; this.video.currentTime = want; return; }
      this.swap = true;
      this.twin.addEventListener('seeked', () => {
        this.twin.classList.add('is-row'); this.video.classList.remove('is-row');
        [this.video, this.twin] = [this.twin, this.video];
        this.time = want; this.swap = false;
      }, { once: true });
      this.twin.currentTime = want;
      return;
    }
    this.time += (want - this.time) * Math.min(1, dt * this.ease);
    if (!this.video.seeking && Math.abs(this.video.currentTime - this.time) > 1 / 60) this.video.currentTime = this.time;
  }
}
