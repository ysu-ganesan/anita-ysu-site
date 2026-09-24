// Her memory as the ANITA site's 3D memory graph ("Her map of you", J's release
// anita-memory-graph-v1, map3d.html), travelling down the page the way palmo.co.in's
// can does: one object on a fixed layer that glides to a new spot, size and turn in
// every section, spinning a little faster while it moves.
//
// It rides on the sphere (sphere.js), which stays the fallback: the page still moves
// sphere.want / grow / turn / pulse() / forget() exactly as before, and this reads
// them. three.js comes from the CDN, so it loads on the side; until it arrives (or
// without WebGL) the canvas sphere keeps drawing and nothing else changes.

// Maya's graph, as in map3d.html (a mock of GET /memory/graph on anita-api)
const NODES = [
  ['work', 'designer', 'work', 1], ['flat', 'the flat', 'place', 1], ['coffee', 'coffee, no sugar', 'habit', 2],
  ['peanut', 'allergic to peanuts', 'fact', 2], ['bday', 'birthday, 12 June', 'date', 3], ['nodrive', 'you do not drive', 'fact', 4],
  ['office', 'the office', 'place', 5], ['mum', 'Mum', 'person', 6], ['sam', 'Sam', 'person', 7], ['dev', 'Dev', 'person', 8],
  ['theo', 'Theo', 'person', 9], ['lisbon', 'where Theo lives', 'place', 9], ['rob', 'Rob, your boss', 'person', 11],
  ['runs', 'runs twice a week', 'habit', 12], ['park', 'the park', 'place', 12], ['nadia', 'Nadia', 'person', 14],
  ['subs', 'dubbed, never subtitles', 'fact', 16], ['cafe', 'the coffee place', 'place', 17], ['luca', 'Luca', 'person', 19],
  ['grandad', 'Grandad', 'person', 20], ['mumbday', 'Mum’s birthday, 3 Nov', 'date', 22], ['pottery', 'Mum · pottery · the 15th', 'fact', 24],
  ['green', 'the green dress', 'fact', 26], ['samjob', 'Sam’s new job', 'fact', 28], ['redesign', 'the redesign', 'work', 29],
  ['promo', 'the promotion', 'work', 31], ['visit', 'Theo visits in March', 'date', 33], ['album', 'the album on repeat', 'habit', 35],
  ['kit', 'Kit', 'person', 36], ['deadline', 'the deadline, 19th', 'date', 38], ['mumshouse', 'Mum’s', 'place', 39],
  ['read', 'reads before bed', 'habit', 40], ['mondays', 'busier on Mondays', 'pattern', 43], ['sundaycall', 'Sunday evenings', 'pattern', 45],
  ['runhappy', 'happier when you run', 'pattern', 47], ['quiet', 'quiet before a deadline', 'pattern', 49], ['monday2', '“not today” on Mondays', 'pattern', 50],
].map(([id, label, kind, day]) => ({ id, label, kind, day }));
const EDGES = [['you','work'],['you','flat'],['you','coffee'],['you','peanut'],['you','bday'],['you','nodrive'],['you','office'],['you','mum'],
  ['you','sam'],['you','dev'],['you','theo'],['theo','lisbon'],['theo','luca'],['theo','visit'],['you','rob'],['rob','redesign'],['you','nadia'],
  ['you','runs'],['runs','park'],['you','subs'],['you','cafe'],['you','grandad'],['mum','mumbday'],['mum','pottery'],['mum','mumshouse'],
  ['you','green'],['sam','samjob'],['sam','kit'],['you','redesign'],['redesign','deadline'],['you','promo'],['you','album'],['you','read'],
  ['you','mondays'],['mondays','monday2'],['mum','sundaycall'],['runs','runhappy'],['deadline','quiet']];
const NEW = new Set(['runhappy', 'quiet', 'monday2']);
// the page's named memories (main.js) → the nodes they are in this graph
const NAMED = { 'Busier on Mondays': ['mondays', 'monday2'], 'Mum · pottery · the 15th': ['pottery'], 'Dubbed, never subtitles': ['subs'],
  'Happier on days you run': ['runhappy'] };
// the ones that carry a name on screen (J, 11 Sep: every node named reads as a diagram)
const SHOWN = new Set(['mondays', 'pottery', 'subs', 'runhappy', 'quiet']);
const SHELL = 2.72;   // the outer dial's radius, in world units: what the page's r (share of the screen) sizes

export class MemoryGraph {
  constructor(canvas, labelsEl, sphere) {
    this.cv = canvas; this.lblEl = labelsEl; this.s = sphere;
    this.on = false; this.spin = 0; this.roll = 0; this.lastX = sphere.at.x; this.pulses = [];
    const pulse = sphere.pulse.bind(sphere);
    sphere.pulse = () => { pulse(); if (this.on) this.pulse(); };
    this.load().catch(() => {});   // no three.js / no WebGL: the sphere stays
  }

  async load() {
    const THREE = this.T = await import('three');
    const { CSS2DRenderer, CSS2DObject } = await import('three/addons/renderers/CSS2DRenderer.js');
    const C = { ink: 0xeaf6f8, cyan: 0x58e6ff, dim: 0x7f9aa3, paper: 0xf0ebdd, bg: 0x000000 };

    const r = this.r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: true, alpha: true });
    r.setClearColor(0x000000, 0);
    const labels = this.labels = new CSS2DRenderer({ element: this.lblEl });
    const scene = this.scene = new THREE.Scene();
    scene.fog = this.fog = new THREE.FogExp2(C.bg, 0.075);
    this.cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
    const world = this.world = new THREE.Group(); scene.add(world);

    const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); const q = g.createRadialGradient(64, 64, 0, 64, 64, 64); q.addColorStop(0, 'rgba(255,255,255,1)'); q.addColorStop(.35, 'rgba(255,255,255,.35)'); q.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = q; g.fillRect(0, 0, 128, 128); return new THREE.CanvasTexture(c); })();
    const glow = (color, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })); s.scale.setScalar(size); return s; };
    this.glow = glow;
    const label = (text, cls) => { const d = document.createElement('div'); d.className = 'glbl ' + cls; d.textContent = text; return new CSS2DObject(d); };

    // the HUD rings, the dial and the faint shell
    const rings = this.rings = [];
    [[1.45, 0, 0], [1.9, 1.1, 0.3], [2.35, 0.5, 1.2]].forEach(([rad, rx, rz], i) => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(rad, 0.005, 6, 160), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.26 - i * 0.05 }));
      m.rotation.set(rx, 0, rz); world.add(m); rings.push(m);
    });
    { const g = new THREE.BufferGeometry(), pts = [];
      for (let i = 0; i < 120; i++) { const a = i / 120 * Math.PI * 2, r0 = 2.55, r1 = i % 10 === 0 ? SHELL : 2.62; pts.push(new THREE.Vector3(Math.cos(a) * r0, 0, Math.sin(a) * r0), new THREE.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1)); }
      g.setFromPoints(pts); const dial = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.35 })); dial.rotation.x = 0.35; world.add(dial); rings.push(dial); }
    world.add(new THREE.Mesh(new THREE.IcosahedronGeometry(2.7, 1), new THREE.MeshBasicMaterial({ color: C.cyan, wireframe: true, transparent: true, opacity: 0.05 })));

    // you, in the middle
    const you = this.you = new THREE.Mesh(new THREE.SphereGeometry(0.16, 32, 32), new THREE.MeshBasicMaterial({ color: C.paper }));
    you.add(glow(C.cyan, 1.3)); you.add(label('Maya', 'you')); world.add(you);

    // her memories on a shell, spread evenly (a Fibonacci sphere), a kind to a neighbourhood
    const pos = { you: new THREE.Vector3() }, objs = this.objs = {};
    const ordered = [...NODES].sort((a, b) => a.kind < b.kind ? -1 : a.kind > b.kind ? 1 : a.day - b.day);
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));
    ordered.forEach((n, i) => {
      const y = 1 - (i / (ordered.length - 1)) * 2, rr = Math.sqrt(Math.max(0, 1 - y * y)), th = GOLDEN * i;
      const p = new THREE.Vector3(Math.cos(th) * rr, y * 0.82, Math.sin(th) * rr).normalize().multiplyScalar(2.02 + ((i % 3) - 1) * 0.17);
      pos[n.id] = p;
      const hot = NEW.has(n.id), col = hot ? C.cyan : n.kind === 'person' ? C.paper : n.kind === 'place' ? C.ink : C.dim;
      const m = new THREE.Mesh(new THREE.SphereGeometry(n.kind === 'person' || n.kind === 'place' ? 0.075 : 0.055, 20, 20), new THREE.MeshBasicMaterial({ color: col, transparent: true }));
      m.position.copy(p); m.add(glow(col, hot ? 0.9 : 0.55));
      if (SHOWN.has(n.id)) { m.userData.lbl = label(n.label, hot ? 'hot' : ''); m.add(m.userData.lbl); }
      m.userData.n = n; m.userData.scale = 0; m.scale.setScalar(0.0001);
      world.add(m); objs[n.id] = m;
    });
    this.edges = EDGES.map(([a, b]) => {
      const hot = NEW.has(a) || NEW.has(b);
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([pos[a], pos[b]]), new THREE.LineBasicMaterial({ color: hot ? C.cyan : C.ink, transparent: true, opacity: hot ? 0.9 : 0.42 }));
      line.userData = { a, b, base: hot ? 0.9 : 0.42 }; world.add(line); return line;
    });

    this.on = true;
    document.documentElement.classList.add('has-graph');   // styles.css hides the canvas sphere
  }

  // a memory has just been kept: a ring of light runs out from a node on the front
  pulse() {
    const lit = Object.values(this.objs).filter(o => o.userData.scale > 0.9);
    const o = lit[Math.floor(Math.random() * lit.length)] || this.you;
    const g = this.glow(0x58e6ff, 0.2); o.add(g); this.pulses.push({ g, t: 0 });
  }

  update(dt, t) {
    if (!this.on) return false;
    const S = this.s, A = S.at, T = this.T;
    // the travel: ease toward where the page wants it (the sphere's own easing, so its snaps still work)
    for (const k in S.want) A[k] += (S.want[k] - A[k]) * Math.min(1, dt * 3.2);
    const vx = (A.x - this.lastX) / Math.max(dt, 1e-3); this.lastX = A.x;

    const W = this.cv.clientWidth, H = this.cv.clientHeight;
    if (!W || !H) return true;
    this.cv.style.opacity = A.alpha.toFixed(3);
    this.lblEl.style.opacity = (clamp01((A.alpha - 0.6) / 0.3) * clamp01((A.r - 0.2) / 0.12)).toFixed(3);   // names only where it is the subject, never under a section's words
    if (A.alpha < 0.01) return true;

    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    if (this._w !== W || this._h !== H || this._d !== dpr) {
      this._w = W; this._h = H; this._d = dpr;
      this.r.setPixelRatio(dpr); this.r.setSize(W, H, false); this.labels.setSize(W, H);
    }
    // size: the dial's edge sits at r × the screen, the same measure the sphere used
    const R = A.r * Math.min(W, H * 1.25), tanH = Math.tan(T.MathUtils.degToRad(25));
    const dist = Math.max(3.2, SHELL * (H / 2) / (Math.max(R, 4) * tanH));
    const cam = this.cam;
    cam.aspect = W / H; cam.position.set(0, dist * 0.1, dist); cam.lookAt(0, 0, 0);
    cam.far = dist + 20; this.fog.density = 0.075 * 6.2 / dist;   // lighter than map3d's: on the page's black, its fog turned the nodes grey
    // place: shift the view so the middle of her memory lands on (x, y)
    cam.setViewOffset(W, H, W / 2 - A.x * W, H / 2 - A.y * H, W, H);

    // motion: her own slow turn, a drag or a throw, the page's turn, and (palmo) a spin while it travels
    const m = S.m, quiet = performance.now() - m.last > 2000;
    if (S.drag) this.spin = m.vx * 1.6;
    else { if (!quiet) this.spin += m.vx * 0.0015 * (Math.abs(m.x - A.x * W) < R ? 1 : 0); this.spin *= Math.pow(0.08, dt); }
    this.roll += (clamp(-vx * 0.35, -0.35, 0.35) - this.roll) * Math.min(1, dt * 4);
    const w = this.world;
    w.rotation.y += (0.12 + this.spin + Math.abs(vx) * 1.4) * dt;
    w.rotation.x = 0.18 * Math.sin(t * 0.12) + (S.turn || 0) * 0.25;
    w.rotation.z = this.roll;
    this.rings[0].rotation.z = t * 0.05; this.rings[1].rotation.y = t * 0.04; this.rings[2].rotation.x = 0.5 + Math.sin(t * 0.2) * 0.2; this.rings[3].rotation.y = -t * 0.03;
    this.you.children[0].scale.setScalar(1.3 + Math.sin(t * 1.4) * 0.12);

    // how much she knows: the page's grow (0..1) is the map's day (1..50). Forgotten ones leave.
    const day = 12 + (S.grow || 0) * 38, gone = new Set();
    for (const p of S.named || []) if (p.gone) (NAMED[p.name] || []).forEach(id => gone.add(id));
    for (const id in this.objs) {
      const o = this.objs[id], n = o.userData.n, want = n.day <= day && !gone.has(id) ? 1 : 0;
      const s = o.userData.scale += (want - o.userData.scale) * Math.min(1, dt * 7);
      o.scale.setScalar(Math.max(s, 0.0001)); o.visible = s > 0.02;
      if (o.userData.lbl) o.userData.lbl.visible = s > 0.6;
      if (NEW.has(id) && s > 0.9) o.children[0].scale.setScalar(0.9 + Math.sin(t * 2.2) * 0.18);
    }
    for (const e of this.edges) {
      const a = e.userData.a === 'you' ? 1 : this.objs[e.userData.a].userData.scale, b = this.objs[e.userData.b].userData.scale;
      const k = Math.min(a, b); e.visible = k > 0.05; e.material.opacity = e.userData.base * k;
    }
    this.pulses = this.pulses.filter(p => {
      p.t += dt; const u = p.t / 1.1;
      if (u >= 1) { p.g.parent.remove(p.g); p.g.material.dispose(); return false; }
      p.g.scale.setScalar(0.2 + u * 2.4); p.g.material.opacity = (1 - u) * (1 - u); return true;
    });

    this.r.render(this.scene, cam); this.labels.render(this.scene, cam);
    return true;
  }
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clamp01 = v => clamp(v, 0, 1);
