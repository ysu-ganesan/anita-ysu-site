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
