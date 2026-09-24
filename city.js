// The walk's world: the Sprite demo's, as it was (the Tron floor that streams with her, J's Blender city,
// the towers that rise, the monorail, the bloom), with ANITA HQ in the centre: the office from
// anita-office/agent-hq/office3d.html as a building (glass department rooms with cyan edges, the ANITA sign,
// and the office's brain core, after its buildBrainCore).
//
// Scroll drives it (0 -> 1 across the walk). She starts at HQ's door and walks out of it toward you; HQ, the
// floor and the city all fall back behind her at her pace. The camera stays at her eye level the whole way.
// She is not in this scene: she stays the 2D sprite on top, and this returns where her feet and head land.
//
// Her memory graph settles into the core (24 Sep, by request): the graph that travels down the page flies into
// the brain core as this section arrives, and a copy of it (graph.js → buildGraph) takes over here, wrapped
// around the orb, turned exactly as the travelling one. It stays for the whole walk, receding with HQ.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildGraph, GRAPH_VIEW, GRAPH_SHELL } from './graph.js';

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
// where her memory graph sits in HQ: the core's orb (the core stands on the hall floor, 0.52 up; its orb is
// 0.52 of its 11 m up), and how big: its outer dial just inside the core's 3.6 m curtain of light
const MEM_Y = 0.52 + 11 * 0.52, MEM_SCALE = 1.15;

function textPlane(text, w, h, { font = '700 150px Orbitron, sans-serif', color = '#eaf6f8', glow = '#58e6ff' } = {}) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const g = c.getContext('2d'); g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = glow; g.shadowBlur = 30; g.fillStyle = color; g.fillText(text, c.width / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
}

// the office's brain core, after office3d.html buildBrainCore: a curtain of falling light, washes, rims, the orb
function brainCore() {
  const g = new THREE.Group(), H = 11, R = 3.6, DEN = 180, SEG = 10;
  const add = THREE.AdditiveBlending;
  const stage = new THREE.Mesh(new THREE.CircleGeometry(R + 1.6, 64), new THREE.MeshBasicMaterial({ color: 0x05070d }));
  stage.rotation.x = -Math.PI / 2; stage.position.y = 0.03; g.add(stage);
  const ring = (rIn, rOut, op, col, y = 0.05) => { const m = new THREE.Mesh(new THREE.RingGeometry(rIn, rOut, 96), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: add, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = y; g.add(m); };
  ring(R + 1.45, R + 1.6, 0.9, 0x0a6c78); ring(R - 0.05, R + 0.07, 0.95, 0xeef4ff); ring(R - 0.22, R + 0.32, 0.15, 0x9db6ff);
  // the curtain: vertical lines whose brightness runs downward over time
  const pos = new Float32Array(DEN * SEG * 6), col = new Float32Array(DEN * SEG * 6), base = [];
  let v = 0;
  for (let i = 0; i < DEN; i++) {
    const a = i / DEN * Math.PI * 2, x = Math.cos(a) * R, z = Math.sin(a) * R;
    base.push({ ph: rnd() * Math.PI * 2, br: 0.4 + rnd() * rnd() * 1.4 });
    for (let k = 0; k < SEG; k++) { pos.set([x, k / SEG * H, z, x, (k + 1) / SEG * H, z], v * 3); v += 2; }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const veil = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: add }));
  g.add(veil);
  const washTex = (() => { const c = document.createElement('canvas'); c.width = 8; c.height = 128; const x = c.getContext('2d');
    const gr = x.createLinearGradient(0, 128, 0, 0); gr.addColorStop(0, 'rgba(140,235,255,0.5)'); gr.addColorStop(0.25, 'rgba(130,220,255,0.18)'); gr.addColorStop(1, 'rgba(130,220,255,0.04)');
    x.fillStyle = gr; x.fillRect(0, 0, 8, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  for (const [rk, op] of [[0.995, 0.16], [0.94, 0.08]]) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(R * rk, R * rk, H, 48, 1, true), new THREE.MeshBasicMaterial({ map: washTex, transparent: true, opacity: op, depthWrite: false, blending: add, side: THREE.DoubleSide }));
    w.position.y = H / 2; g.add(w);
  }
  for (const [tube, op] of [[0.03, 0.95], [0.1, 0.16]]) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(R, tube, 10, 100), new THREE.MeshBasicMaterial({ color: 0xdfe9ff, transparent: true, opacity: op, blending: add, depthWrite: false }));
    m.rotation.x = Math.PI / 2; m.position.y = H; g.add(m);
  }
  // the orb and its orbits
  const orb = new THREE.Group(); orb.position.y = H * 0.52; g.add(orb);
  orb.add(new THREE.Mesh(new THREE.SphereGeometry(1.05, 32, 24), new THREE.MeshBasicMaterial({ color: 0xcff8ff })));
  orb.add(new THREE.Mesh(new THREE.SphereGeometry(1.35, 24, 16), new THREE.MeshBasicMaterial({ color: 0x5ff2ff, transparent: true, opacity: 0.18, blending: add, depthWrite: false })));
  const orbits = [];
  for (const [rx, rz] of [[1.1, 0.2], [-0.6, 0.9], [0.3, -1.2]]) {
    const o = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.022, 8, 120), new THREE.MeshBasicMaterial({ color: 0xeaf6ff, transparent: true, opacity: 0.85, blending: add, depthWrite: false }));
    o.rotation.set(rx, 0, rz); orb.add(o); orbits.push(o);
  }
  g.userData.tick = (t, power = 1) => {
    const c = geo.attributes.color.array; let q = 0;
    for (let i = 0; i < DEN; i++) { const b = base[i];
      for (let k = 0; k < SEG; k++) for (let e = 0; e < 2; e++) {
        const y = (k + e) / SEG, fall = 0.5 + 0.5 * Math.sin(y * 9 + t * 2.4 + b.ph);
        const s = b.br * (0.25 + 0.75 * fall * fall) * (0.35 + 0.65 * (1 - y));
        const lit = s * power; c[q++] = (0.37 * s + 0.1) * power; c[q++] = 0.9 * lit; c[q++] = lit;
      } }
    geo.attributes.color.needsUpdate = true;
    orbits.forEach((o, i) => { o.rotation.y = t * (0.35 + i * 0.17); });
    orb.rotation.y = t * 0.2;
    orb.scale.setScalar(0.3 + 0.7 * power);
    g.traverse(o => { if (o.material && o !== veil) { o.material.userData.base ??= o.material.opacity; o.material.opacity = o.material.userData.base * power; o.material.transparent = true; } });
  };
  return g;
}

// ANITA HQ: the office floor as a building. Open to the sky, like the office view from above.
function headquarters() {
  const g = new THREE.Group(), W = 30, D = 24, WH = 4.2;
  const bright = new THREE.LineBasicMaterial({ color: 0x58e6ff, transparent: true, opacity: 0.95 });
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(W + 3, 0.5, D + 3), new THREE.MeshBasicMaterial({ color: 0x0b1a22 }));
  plinth.position.y = 0.25; g.add(plinth);
  const pe = new THREE.LineSegments(new THREE.EdgesGeometry(plinth.geometry), bright); pe.position.y = 0.25; g.add(pe);
  // the hall floor, dark, and the pale room floors
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshBasicMaterial({ color: 0x1c232b }));
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0.52; g.add(floor);
  const glass = new THREE.MeshBasicMaterial({ color: 0x3fb8d8, transparent: true, opacity: 0.05, depthWrite: false, side: THREE.DoubleSide });
  const room = (x, z, w, d, label) => {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ color: 0x33424b }));
    f.rotation.x = -Math.PI / 2; f.position.set(x, 0.54, z); g.add(f);
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, WH, d), glass); walls.position.set(x, 0.5 + WH / 2, z); g.add(walls);
    const e = new THREE.LineSegments(new THREE.EdgesGeometry(walls.geometry), bright); e.position.copy(walls.position); g.add(e);
    if (label) { const s = textPlane(label, w * 0.8, 0.9, { font: '700 110px Orbitron, sans-serif' }); s.position.set(x, 0.5 + WH + 0.7, z + d / 2); g.add(s); }
  };
  // the departments around the hall, as in the office
  room(-10.5, -7.5, 9, 9, 'PHYSICAL AI'); room(10.5, -7.5, 9, 9, 'PERSONAL AI');
  room(-10.5, 7.5, 9, 9, 'RECEPTION'); room(10.5, 7.5, 9, 9, 'IT');
  // the outer glass and its lit edge
  const shell = new THREE.Mesh(new THREE.BoxGeometry(W, WH + 0.6, D), glass); shell.position.y = 0.5 + (WH + 0.6) / 2; g.add(shell);
  const se = new THREE.LineSegments(new THREE.EdgesGeometry(shell.geometry), bright); se.position.copy(shell.position); g.add(se);
  // the brain core in the hall
  const core = brainCore(); core.position.y = 0.52; g.add(core); g.userData.core = core;
  // the sign over the entrance, facing her road
  const sign = textPlane('ANITA', 12, 2.6); sign.position.set(0, WH + 3.2, D / 2 + 0.2); g.add(sign);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(13, 0.08, 0.08), new THREE.MeshBasicMaterial({ color: 0x58e6ff })); bar.position.set(0, WH + 1.7, D / 2 + 0.2); g.add(bar);
  // the gate: two lit posts on the plinth
  const posts = [];
  for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.25, 3.2, 0.25), new THREE.MeshBasicMaterial({ color: 0x9df3ff, transparent: true })); p.position.set(s * 2.4, 2.1, D / 2 + 1.2); g.add(p); posts.push(p); }
  // powering up, 0 → 1: the lit edges draw in first, then the sign, the gate and the core
  const signs = [];
  g.traverse(o => { if (o.isMesh && o.material.map && o !== sign) signs.push(o); });
  g.userData.power = (k, t) => {
    bright.opacity = 0.95 * Math.min(1, k * 1.6);
    const late = Math.max(0, (k - 0.4) / 0.6);
    sign.material.opacity = late; bar.material.opacity = late; bar.material.transparent = true;
    for (const m of signs) m.material.opacity = late;
    for (const p of posts) p.material.opacity = late;
    glass.opacity = 0.05 * k;
    core.userData.tick(t, late);
  };
  // her memory graph, round the core's orb. Hidden until the page's travelling graph arrives (render's `mem`)
  const mem = buildGraph(THREE);
  mem.world.position.y = MEM_Y; mem.world.scale.setScalar(MEM_SCALE); mem.world.visible = false;
  mem.world.traverse(o => { if (o.material) o.material.toneMapped = false; });   // its own colours, as on the page
  g.add(mem.world); g.userData.mem = mem;
  return g;
}

export function startCity(canvas, base = 'assets/city/') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  const mobile = () => innerWidth <= 800;
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile() ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // the Sprite demo's scene, as it was: black, fogged, lit cyan from behind, bloom over everything
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  scene.fog = new THREE.FogExp2(0x02070d, 0.0072);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 1200);
  scene.add(new THREE.HemisphereLight(0x8fd8ff, 0x050a12, 1.25));
  const key = new THREE.DirectionalLight(0xffffff, 1.3); key.position.set(3, 6, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x58e6ff, 2.2); rim.position.set(-3, 4, -5); scene.add(rim);
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.4, 0.8);
  composer.addPass(bloom); composer.addPass(new OutputPass());
  let W = 0, H = 0;
  function fit() { W = canvas.clientWidth; H = canvas.clientHeight; if (!W || !H) return; renderer.setSize(W, H, false); composer.setSize(W, H); camera.aspect = W / H; camera.updateProjectionMatrix(); }
  addEventListener('resize', fit); fit();

  // the floor: the demo's endless grid. It moves with her, away from you, the same way HQ does
  const grid = new THREE.Mesh(new THREE.PlaneGeometry(700, 700, 1, 1), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    uniforms: { uOffset: { value: 0 }, uOpacity: { value: 0.75 }, uColor: { value: new THREE.Color(0x19c8ff) } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `uniform float uOffset, uOpacity; uniform vec3 uColor; varying vec3 vW;
      float line(float x){ float g = abs(fract(x - 0.5) - 0.5) / fwidth(x); return 1.0 - smoothstep(0.0, 1.3, g); }
      void main(){ float cell = 2.0; float l = max(line(vW.x / cell), line((vW.z + uOffset) / cell));
        float d = length(vW.xz); float fade = exp(-d * d * 0.00045) * smoothstep(0.0, 6.0, d);
        gl_FragColor = vec4(uColor * (0.55 + 0.45 * fade), l * fade * uOpacity); }`,
  }));
  grid.rotation.x = -Math.PI / 2; grid.position.y = 0.005; scene.add(grid);

  // J's city, tuned as the demo tunes it. Everything on the ground recedes at her pace (WALK m over the
  // whole scroll), so the city, the floor and HQ all move together as she walks toward you.
  const pieces = [], loader = new GLTFLoader();
  function tune(root, glow) {
    root.traverse(o => { if (o.isMesh) { for (const m of (Array.isArray(o.material) ? o.material : [o.material])) {
      if (m.emissiveIntensity > 1) m.emissiveIntensity = glow; else { m.color.setHex(0x0c1a2c); m.roughness = 0.85; m.metalness = 0; } m.fog = true; } } });
    return root;
  }
  function piece(file, opts) {
    loader.load(base + file, g => {
      const obj = tune(g.scene, opts.e || 2.0); obj.scale.setScalar(opts.s || 1); obj.visible = false;
      if (opts.ry) obj.rotation.y = opts.ry;
      scene.add(obj); pieces.push({ obj, place: opts.place });
    }, undefined, e => console.warn('city piece', file, e));
  }
  const WALK = 90;
  // by the road: starts behind the camera and passes her, then falls away down the road
  const byRoad = (x, z0) => (obj, p) => { const z = z0 - p * WALK; obj.visible = z < 8 && z > -140; obj.position.set(x, 0, z); };
  // a tower that grows out of the floor as she passes, and then recedes with everything else
  // towers stand well back from the road and recede with the city (they used to rise through the floor, which cut them in half)
  const stand = (x, z0) => (obj, p) => { obj.visible = true; obj.position.set(x, 0, z0 - p * WALK); };
  piece('FarCity.glb',      { s: 0.55, e: 1.15, place: (o, p) => { o.visible = true; o.position.set(0, 0, -140); } });
  piece('HeroMonolith.glb', { s: 0.16, place: byRoad(-11, 24) });
  piece('Wing.glb',         { s: 0.20, place: byRoad(13, 46), ry: Math.PI });
  piece('Overhang.glb',     { s: 0.22, place: byRoad(-14, 74) });
  piece('Monorail.glb',     { s: 0.22, place: (o, p) => { const u = (p - 0.42) / 0.22; o.visible = u > 0 && u < 1; o.position.set(lerp(70, -70, u), 9, -60); }, ry: Math.PI / 2 });
  piece('BladeTower.glb',   { s: 0.55, place: stand(-34, -20) });
  piece('Twins.glb',        { s: 0.55, place: stand( 40, -10) });
  piece('Terrace.glb',      { s: 0.80, place: stand(-78, -40) });

  // ANITA HQ in the centre, right behind her at the start. She walks out of it toward you and it falls back
  const hq = headquarters(); scene.add(hq);
  const HQ_START = -44;   // its middle; the front door is 12 m nearer: framed behind her, not filling the screen

  const feet = new THREE.Vector3(), head = new THREE.Vector3(), far = new THREE.Vector3();
  const memAt = new THREE.Vector3(), memDir = new THREE.Vector3(), memP = new THREE.Vector3();
  const VIEW = new THREE.Vector3(...GRAPH_VIEW).normalize(), memQ = new THREE.Quaternion(), memR = new THREE.Quaternion(), memE = new THREE.Euler();
  let mx = 0, my = 0, smx = 0, smy = 0;
  addEventListener('pointermove', e => { mx = (e.clientX / innerWidth - 0.5) * 2; my = (e.clientY / innerHeight - 0.5) * 2; }, { passive: true });

  // enter: 0 while the section is still below the fold, 1 once it fills the screen. It drives the arrival:
  // the camera flies down from high over the city to her eye level while HQ powers up in the dark.
  // mem: the travelling graph's state { fade, rx, ry, rz, day, gone }: how present the copy in the core is
  // (0 → 1 as the travelling one arrives), its turn, and what she knows. Returns, with the rest, `core`: where
  // the core's graph is on the canvas (x, y, 0..1) and its outer dial's radius in CSS pixels.
  return function render(p, dt, enter = 1, mem = null) {
    if (canvas.clientWidth !== W || canvas.clientHeight !== H) fit();
    const t = performance.now() / 1000;
    smx += (mx - smx) * 0.06; smy += (my - smy) * 0.06;
    grid.material.uniforms.uOffset.value = p * WALK;
    hq.position.z = HQ_START - p * WALK;
    const e = ss(0, 1, enter), power = ss(0.3, 0.95, enter);
    hq.userData.power(power, t);
    grid.material.uniforms.uOpacity.value = 0.75 * ss(0.15, 0.85, enter);
    renderer.toneMappingExposure = lerp(0.25, 1, ss(0, 0.8, enter));
    for (const { obj, place } of pieces) place(obj, p);
    // the demo's camera: at her eye level, in front of her, the whole way. No looking down.
    const orbit = Math.sin(p * Math.PI * 2) * 0.1;
    const dist = 4.9 * (mobile() ? 1.45 : 1);
    const hqZ = HQ_START - p * WALK;
    // arrival: a straight dolly at eye level, from far down the road up to her. HQ stays whole and centred the
    // whole way (no looking down, nothing cut by the frame), and it grows as the camera comes in
    camera.position.set(lerp(0, Math.sin(orbit) * dist + smx * 0.35, e), lerp(2.2, 1.05 + smy * -0.15, e), lerp(70, Math.cos(orbit) * dist, e));
    camera.lookAt(0, lerp(2.6, 0.92, e), lerp(hqZ, 0, e));
    camera.updateMatrixWorld();
    // the graph in the core: turned so this camera sees it as the page's camera sees the travelling one (from
    // in front and a little above), then as the travelling one is turned
    const M = hq.userData.mem;
    memAt.set(0, MEM_Y, hqZ);
    memDir.copy(camera.position).sub(memAt);
    const memDist = memDir.length(); memDir.divideScalar(memDist);
    const shown = !!mem && mem.fade > 0.003;
    M.world.visible = shown;
    if (mem) {
      M.world.quaternion.setFromUnitVectors(VIEW, memDir).multiply(memR.setFromEuler(memE.set(mem.rx, mem.ry, mem.rz)));
      M.state(dt, t, mem.day, mem.gone, shown ? mem.fade : 0);
    }
    composer.render(dt);
    feet.set(0, -0.045, 0).project(camera); head.set(0, 1.74 - 0.045, 0).project(camera);
    far.set(camera.position.x, camera.position.y, camera.position.z - 1e4).project(camera);
    memP.copy(memAt).project(camera);
    const memR_px = GRAPH_SHELL * MEM_SCALE / (memDist * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))) * (H / 2);
    return { feetY: (1 - feet.y) / 2, headY: (1 - head.y) / 2, x: (feet.x + 1) / 2, horizon: clamp((1 - far.y) / 2, 0, 1),
      core: { x: (memP.x + 1) / 2, y: (1 - memP.y) / 2, r: memR_px } };
  };
}
