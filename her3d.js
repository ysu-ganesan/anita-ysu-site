// ANITA in 3D (the page with ?3d). 24 Sep, by request: Dee's approved ANITA, exactly as drawn, but standing
// in depth like a person. Nothing about her is redrawn: J's sprite (#sprite-hero, with its own head-and-eye
// following and nod) keeps drawing every frame as before, hidden, and that canvas is laid on a 3D surface
// shaped like her body. The shape is a depth map of her master frame (assets/sprites/depth-idle.png), worked
// out on this laptop by Depth Anything V2 Small (Apache-2.0): her face and chest come forward, her arms and the
// hair behind her shoulders go back.
//
// She moves the way a person turns to look at you: her eyes (J's frames) lead, her head follows on her neck,
// her shoulders come round a little after, and her feet stay where they are. Standing still she drifts a
// little, as people do. At rest, facing you, she is pixel for pixel the flat sprite: the camera is
// orthographic, so the depth only shows once she turns.
//
//   const her3d = new Her3D(spriteCanvas, herBox);
//   her3d.update(dt, t, nx, ny, on);   // nx, ny: the cursor from her face, -1 … 1; on: she is following it

const DEPTH = 0.09;                        // her front-to-back relief, as a share of her frame's height
const HEAD_YAW = 0.1, BODY_YAW = 0.085;    // the furthest she turns, in radians: head (on top of her shoulders), shoulders.
                                          // Her head already turns in J's frames, so the 3D turn leans on her shoulders
const PITCH_DOWN = 0.12, PITCH_UP = 0.08;  // her nod
const RIM = 0.14;                          // a little of her cyan catching the edge that faces you

export class Her3D {
  constructor(src, host, { depth = 'assets/sprites/depth-idle', still = false } = {}) {
    this.src = src; this.host = host; this.still = still; this.ready = false;
    // springs: [value, velocity]
    this.s = { hy: [0, 0], hp: [0, 0], by: [0, 0], on: [0, 0] };
    this.load(depth).catch(e => console.warn('her3d', e));
  }

  async load(base) {
    const THREE = await import('three');
    const [meta, img] = await Promise.all([
      fetch(base + '.json').then(r => r.json()),
      new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = base + '.png'; }),
    ]);
    const cv = this.cv = document.createElement('canvas');
    cv.className = 'her3d'; cv.setAttribute('aria-hidden', 'true');
    this.src.after(cv);
    const r = this.r = new THREE.WebGLRenderer({ canvas: cv, alpha: true, antialias: true });
    r.setClearColor(0x000000, 0);
    // if the browser ever drops this drawing surface (too many 3D layers, a GPU reset), the flat sprite shows
    // again at once, so she never disappears; she comes back in 3D when the surface does
    cv.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; document.body.classList.remove('has-her3d'); });
    cv.addEventListener('webglcontextrestored', () => { this.lost = false; document.body.classList.add('has-her3d'); });

    // her depth, read once
    const dc = document.createElement('canvas'); dc.width = meta.w; dc.height = meta.h;
    const dg = dc.getContext('2d', { willReadFrequently: true }); dg.drawImage(img, 0, 0);
    const px = dg.getImageData(0, 0, meta.w, meta.h).data, W = meta.w, H = meta.h;
    const near = (x, y) => {   // bilinear, 0..1
      x = Math.min(W - 1.001, Math.max(0, x)); y = Math.min(H - 1.001, Math.max(0, y));
      const x0 = x | 0, y0 = y | 0, u = x - x0, v = y - y0, at = (i, j) => px[(j * W + i) * 4];
      return ((at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v) / 255;
    };
    // world: her frame is 1 tall, centred on 0, y up; her chest's surface is z = 0
    const AR = W / H, zAt = (x, y) => DEPTH * (near(x, y) - meta.chest);
    const X = x => (x / W - 0.5) * AR, Y = y => 0.5 - y / H;

    const geo = new THREE.PlaneGeometry(AR, 1, 150, 266);
    const uv = geo.attributes.uv, n = uv.count, dz = new Float32Array(n), nrm = new Float32Array(n * 3), e = 3;
    for (let i = 0; i < n; i++) {
      const x = uv.getX(i) * W, y = (1 - uv.getY(i)) * H;
      dz[i] = zAt(x, y);
      // the surface's slope, for the light at her edges (world units: a pixel is 1/H)
      const sx = (zAt(x + e, y) - zAt(x - e, y)) / (2 * e / H), sy = (zAt(x, y - e) - zAt(x, y + e)) / (2 * e / H);
      const l = Math.hypot(sx, sy, 1);
      nrm[i * 3] = -sx / l; nrm[i * 3 + 1] = -sy / l; nrm[i * 3 + 2] = 1 / l;
    }
    geo.setAttribute('dz', new THREE.BufferAttribute(dz, 1));
    geo.setAttribute('nrm', new THREE.BufferAttribute(nrm, 3));

    const tex = this.tex = new THREE.CanvasTexture(this.src);
    tex.generateMipmaps = false; tex.minFilter = tex.magFilter = THREE.LinearFilter;
    const zFace = DEPTH * (meta.face - meta.chest);
    this.u = {
      map: { value: tex },
      uYawH: { value: 0 }, uPitchH: { value: 0 }, uYawB: { value: 0 },
      // her head turns and nods about a point inside it (behind her face, level with her ears), her neck bends
      // between her collar and her chin; her shoulders turn about her spine, the turn fading out by her knees
      uHead: { value: new THREE.Vector3(X(meta.faceX), Y((meta.eyes + meta.chin) / 2 + 6), zFace - 0.06) },
      uNeck: { value: new THREE.Vector2(Y(meta.neckBase), Y(meta.neckTop)) },
      uBody: { value: new THREE.Vector2(X(meta.bodyX), -0.05) },
      uLegs: { value: new THREE.Vector2(Y(meta.knees), Y(meta.shoulders)) },
      uLight: { value: new THREE.Vector2(0, 1) }, uRim: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      uniforms: this.u, transparent: true, side: THREE.DoubleSide,
      vertexShader: `
        attribute float dz; attribute vec3 nrm;
        uniform float uYawH, uPitchH, uYawB;
        uniform vec3 uHead; uniform vec2 uNeck, uBody, uLegs;
        varying vec2 vUv; varying vec3 vN;
        mat3 rotY(float a) { float c = cos(a), s = sin(a); return mat3(c, 0., -s, 0., 1., 0., s, 0., c); }
        mat3 rotX(float a) { float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, s, 0., -s, c); }
        void main() {
          vUv = uv;
          vec3 p = vec3(position.xy, dz);
          float wh = smoothstep(uNeck.x, uNeck.y, p.y), wb = smoothstep(uLegs.x, uLegs.y, p.y);
          mat3 H = rotY(uYawH * wh) * rotX(uPitchH * wh);
          p = H * (p - uHead) + uHead;
          vec3 ax = vec3(uBody.x, 0., uBody.y);
          mat3 B = rotY(uYawB * wb);
          p = B * (p - ax) + ax;
          vN = B * H * nrm;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.);
        }`,
      // her colours pass straight through: no tone mapping, no colour conversion, just a touch of rim light
      fragmentShader: `
        uniform sampler2D map; uniform vec2 uLight; uniform float uRim;
        varying vec2 vUv; varying vec3 vN;
        void main() {
          vec4 c = texture2D(map, vUv);
          if (c.a < 0.01) discard;
          vec3 n = normalize(vN);
          float side = 1. - clamp(n.z, 0., 1.);
          float toward = max(0., dot(normalize(n.xy + 1e-5), uLight));
          c.rgb += vec3(.345, .902, 1.) * uRim * side * toward;
          gl_FragColor = c;
        }`,
    });
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.Mesh(geo, mat));
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.01, 10); this.cam.position.z = 5;
    this.ready = true; this.onready?.();
  }

  // a critically damped spring toward `to`: quick and soft, never overshooting (w: how brisk)
  _spring(k, to, w, dt) {
    const s = this.s[k]; s[1] += (w * w * (to - s[0]) - 2 * w * s[1]) * dt; s[0] += s[1] * dt; return s[0];
  }

  update(dt, t, nx, ny, on) {
    if (!this.ready || this.lost) return;
    dt = Math.min(dt, 1 / 20);
    const live = this.still ? 0 : 1;
    const a = this._spring('on', on ? 1 : 0, 5, dt);
    // where she would look; standing still she still drifts a little, like a person does
    const drift = (f, p) => live * Math.sin(t * f + p);
    const ty = on ? nx : 0, tp = on ? ny : 0;
    const hy = this._spring('hy', ty * HEAD_YAW + 0.018 * drift(0.37, 0) + 0.01 * drift(0.83, 1), 9, dt);          // her head: quick
    const hp = this._spring('hp', tp * (tp > 0 ? PITCH_DOWN : PITCH_UP) + 0.012 * drift(0.29, 2), 9, dt);
    const by = this._spring('by', ty * BODY_YAW + 0.008 * drift(0.21, 3), 3.6, dt);                                // her shoulders: after
    this.u.uYawH.value = hy; this.u.uPitchH.value = hp; this.u.uYawB.value = by;
    const l = Math.hypot(nx, ny) || 1;
    this.u.uLight.value.set(nx / l, -ny / l); this.u.uRim.value = RIM * a * Math.min(1, Math.hypot(nx, ny) * 1.5);

    // the canvas and the camera: her frame is the host box (1 tall); the canvas is a little bigger so a turn is never clipped
    const hr = this.host.getBoundingClientRect(), cr = this.cv.getBoundingClientRect();
    if (!hr.height || cr.bottom < 0 || cr.top > innerHeight) return;
    const S = hr.height, cx = hr.left + hr.width / 2, cy = hr.top + hr.height / 2;
    const c = this.cam;
    c.left = (cr.left - cx) / S; c.right = (cr.right - cx) / S; c.top = (cy - cr.top) / S; c.bottom = (cy - cr.bottom) / S;
    c.updateProjectionMatrix();
    const dpr = Math.min(devicePixelRatio || 1, 2), w = Math.round(cr.width), h = Math.round(cr.height);
    if (this._w !== w || this._h !== h || this._d !== dpr) { this._w = w; this._h = h; this._d = dpr; this.r.setPixelRatio(dpr); this.r.setSize(w, h, false); }
    this.tex.needsUpdate = true;   // J's frame for this moment, as the sprite just drew it
    this.r.render(this.scene, c);
  }
}
