// The entry screen's ANITA: the particle figure from the ANITA site (swarm.js), 150,000 cyan specks
// sampled from her 3D model. She gathers herself out of drifting specks, the cursor breaks her apart, and
// when you choose how to come in she materializes into the real ANITA: the specks turn her to face you,
// flare, and scatter away while the sprite of her appears in exactly the same place (main.js).
//
// She is drawn in screen pixels (an orthographic camera) and fitted to the hero sprite's box, so the
// particle figure and the real one overlap: the change happens in place, not across the screen.
import * as THREE from 'three';

const GATHER = 2.8;   // seconds to pull herself together

export async function startGateSwarm(canvas, spriteBox, { count = 150000 } = {}) {
  const pos = new Float32Array(await (await fetch('assets/anita-cloud.pos')).arrayBuffer());
  const n = Math.min(count, pos.length / 3);
  const home = new Float32Array(n * 3), scatter = new Float32Array(n * 3), delay = new Float32Array(n), size = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const hx = pos[k * 3], hy = pos[k * 3 + 1], hz = pos[k * 3 + 2];
    home.set([hx, hy, hz], k * 3);
    const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 9;          // where each speck waits
    scatter.set([Math.cos(a) * r, (Math.random() - 0.5) * 12, Math.sin(a) * r * 0.8], k * 3);
    delay[k] = Math.random() * 0.42 + (0.5 - hy / 7) * 0.2;                     // she builds from the feet up
    size[k] = 0.55 + Math.random() * 0.75;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(home.slice(), 3));
  geo.setAttribute('aHome', new THREE.BufferAttribute(home, 3));
  geo.setAttribute('aScatter', new THREE.BufferAttribute(scatter, 3));
  geo.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
  geo.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  const DPR = Math.min(devicePixelRatio, 1.6);
  const mat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, depthTest: false,
    uniforms: { uP: { value: 0 }, uTime: { value: 0 }, uPt: { value: 2 }, uMouse: { value: new THREE.Vector3(9, 9, 0) }, uMouseOn: { value: 0 },
                uFade: { value: 1 }, uFlare: { value: 0 }, uBurst: { value: 0 }, uS: { value: 1 } },
    vertexShader: `
      attribute vec3 aHome, aScatter; attribute float aDelay, aSize;
      uniform float uP, uTime, uPt, uMouseOn, uFlare, uBurst, uS; uniform vec3 uMouse;
      varying vec3 vCol; varying float vP, vShed;
      void main(){
        float p = clamp((uP - aDelay) / (1.0 - aDelay), 0.0, 1.0); p = p * p * (3.0 - 2.0 * p); vP = p;
        vec3 pos = mix(aScatter, aHome, p);
        float loose = 1.0 - p;
        pos += vec3(sin(uTime * 0.5 + aDelay * 31.0), cos(uTime * 0.4 + aDelay * 17.0), sin(uTime * 0.3 + aDelay * 23.0)) * loose * 1.2;
        pos += sin(uTime * 1.2 + aDelay * 40.0) * 0.012 * p;
        // a few specks let go and drift upward, as on the ANITA site: grown, not displayed
        float shed = step(0.978, fract(aDelay * 37.0)), rise = fract(uTime * 0.11 + aDelay * 13.0);
        pos.y += shed * rise * 2.4 * p; vShed = shed * rise;
        // the cursor scatters her: each speck its own way and distance, so there is no edge to the hole
        vec2 away = pos.xy - uMouse.xy; float md = length(away);
        float edge = 0.55 + fract(aDelay * 23.7) * 0.55;
        float grab = uMouseOn * smoothstep(edge, 0.0, md) * p;
        vec3 rnd = normalize(vec3(sin(aDelay * 91.7 + uTime * 0.7), cos(aDelay * 57.3 - uTime * 0.5), sin(aDelay * 33.1 + 1.7)));
        vec3 dir = normalize(mix(rnd, vec3(normalize(away + 0.0001), 0.3), 0.34));
        pos += dir * grab * (0.28 + fract(aDelay * 17.3) * 1.25);
        // becoming real: every speck bursts outward on its own line and goes
        pos += rnd * uBurst * (0.6 + fract(aDelay * 7.1) * 2.4);
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float depth = clamp(0.5 + (mat3(modelMatrix) * pos).z / uS * 0.9, 0.0, 1.0);   // nearer specks brighter
        vCol = mix(vec3(0.02, 0.17, 0.24), vec3(0.72, 0.98, 1.0), depth) + uFlare * 0.8;
        gl_PointSize = aSize * uPt * (1.0 + grab * 0.6 + uFlare * 0.5);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vP, vShed; uniform float uFade;
      void main(){
        vec2 q = gl_PointCoord - 0.5; float a = smoothstep(0.5, 0.4, max(abs(q.x), abs(q.y)));   // squares, as on the ANITA site
        vec3 col = vCol * clamp(1.0 + (-q.x - q.y) * 0.9, 0.55, 1.5);
        a *= mix(0.55, 0.96, vP) * (1.0 - vShed) * uFade;
        if (a < 0.02) discard;
        gl_FragColor = vec4(col, a);
      }`,
  });
  const points = new THREE.Points(geo, mat);
  points.rotation.y = Math.PI;   // the export faces away; half a turn faces her to you
  const scene = new THREE.Scene(); scene.add(points);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(DPR); renderer.setClearColor(0x000000, 0);
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -1e5, 1e5);

  // fit her to the sprite's box: the figure fills ~94% of the frame's height, starting ~4% from its top
  function fit() {
    const W = innerWidth, H = innerHeight; renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H; camera.updateProjectionMatrix();
    const r = spriteBox.getBoundingClientRect(), figH = r.height * 0.9375, s = figH / 7;
    points.scale.setScalar(s); mat.uniforms.uS.value = s;
    points.position.set(r.left + r.width / 2, -(r.top + r.height * 0.044 + figH / 2), 0);
    mat.uniforms.uPt.value = Math.max(1.2, s * 0.018) * DPR;
  }
  addEventListener('resize', fit); fit();

  const mouse = new THREE.Vector3(); let mouseOn = 0, seen = false, mx = 0, my = 0;
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; seen = true; }, { passive: true });
  document.addEventListener('pointerleave', () => { seen = false; });

  const t0 = performance.now(), clock = new THREE.Clock();
  let hold = 0, change = null, alive = true, turn = 0;
  (function tick() {
    if (!alive) return;
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    const gathered = Math.min(1, (performance.now() - t0) / (GATHER * 1000));
    hold += (gathered - hold) * 0.12;
    const u = mat.uniforms; u.uP.value = hold; u.uTime.value = t;
    mouse.set(mx, -my, 0); points.worldToLocal(mouse); u.uMouse.value.copy(mouse);
    mouseOn += ((seen && !change ? 1 : 0) - mouseOn) * 0.08; u.uMouseOn.value = mouseOn;
    // she turns slowly and floats, as on the ANITA site; once the change starts she turns to face you
    if (!change) { turn = Math.sin(t * 0.35) * 0.45; points.rotation.y = Math.PI + turn; }
    else {
      const k = Math.min(1, (performance.now() - change) / 1600);
      points.rotation.y = Math.PI + turn * (1 - Math.min(1, k * 3));
      u.uFlare.value = Math.sin(Math.min(1, k * 2) * Math.PI) * (k < 0.5 ? 1 : 0);   // a flare as she turns real
      u.uBurst.value = Math.max(0, (k - 0.3) / 0.7) ** 2;
      u.uFade.value = 1 - Math.max(0, (k - 0.35) / 0.65);
      if (k >= 1) { alive = false; renderer.dispose(); geo.dispose(); mat.dispose(); canvas.remove(); return; }
    }
    renderer.render(scene, camera);
  })();

  // the page calls this when an option is chosen
  return { materialize() { if (!change) { fit(); change = performance.now(); } } };
}
