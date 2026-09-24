// YSU site — the page's behaviour. Sections in the order they appear.
// Before launch: point SIGNUP_ENDPOINT at a real list (POST JSON). Empty = the form
// opens a pre-filled email to FALLBACK_MAILTO, the same as both sites it comes from.
const SIGNUP_ENDPOINT = "";
const FALLBACK_MAILTO = "hello@aneeta.ai";

import { Anita } from './sprite.js';
import { MemorySphere } from './sphere.js';
import { MemoryGraph } from './graph.js';
import { startCursor } from './cursor.js';
import { VideoTrack } from './videotrack.js';

// The reel's cursor-tracking method. Drop the Google Flow video at LOOK.src and the hero uses it: the cursor's
// position along LOOK.axis scrubs it (left edge of the screen = its first frame, right edge = its last). from/to
// trim it, in seconds (null = the end). Until the file exists, the sprite version below stands in.
// reverse: true if the video turns the other way (right to left).
const LOOK = { src: 'assets/anita-look.mp4', axis: 'horizontal', from: 0, to: null, reverse: false };

window.__ysu = true;   // tells the safety net in index.html that the page came up
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const narrow = () => innerWidth <= 800;

// her words, as she says them (sprite-kit/site-demo/assets/voice/script.json)
const LINES = {
  talk:   "Hi. I'm ANITA. You can just talk to me, like this. I listen while I speak, so cut in whenever you like. I live on your home screen, not in a chat window.",
  memory: "I remember. Every conversation, every person, every plan and decision, kept in a five-layer memory. Ask me what you were worried about last Tuesday, and I'll tell you.",
  yours:  "And it's yours alone. My memory of you stays on your device and on hardware you control. Never in a cloud that trains on your life. One switch keeps everything on the phone.",
  access: "Early access opens with the iOS app. Leave your email and you'll hear from the founder himself. I'll be here.",
};

// ─────────────────────────────────────────── text: split into masked lines (techredux)
function splitLines(el) {
  if (el._src === undefined) el._src = el.innerHTML;
  el.innerHTML = el._src;
  const words = [];
  (function collect(node, wraps) {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        for (const w of ch.textContent.split(/[ \t\n\r]+/)) if (w) {
          let inner = document.createTextNode(w);
          for (let i = wraps.length - 1; i >= 0; i--) { const c = wraps[i].cloneNode(false); c.appendChild(inner); inner = c; }
          const s = document.createElement('span'); s.className = 'w'; s.appendChild(inner); words.push(s);
        }
      } else if (ch.nodeType === 1) collect(ch, [...wraps, ch]);
    }
  })(el, []);
  el.textContent = '';
  words.forEach((w, i) => { if (i) el.append(' '); el.append(w); });
  const lines = []; let top = null;
  for (const w of words) { const t = w.offsetTop; if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; } lines[lines.length - 1].push(w); }
  el.textContent = '';
  lines.forEach((ws, i) => {
    const line = document.createElement('span'), inn = document.createElement('span');
    line.className = 'line'; inn.className = 'line-in'; line.style.setProperty('--i', i);
    ws.forEach((w, j) => { if (j) inn.append(' '); inn.append(w); });
    line.append(inn); el.append(line);
  });
}
const splits = $$('.split, .split-now');
function splitAll() { splits.forEach(splitLines); }
let lastW = innerWidth;
addEventListener('resize', () => { clearTimeout(splitAll.t); splitAll.t = setTimeout(() => { if (innerWidth !== lastW) { lastW = innerWidth; splitAll(); } }, 200); });

// reveal on scroll (everything except the headline, which waits for the gate)
const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); seen.unobserve(e.target); } }), { threshold: 0.2, rootMargin: '0px 0px -8% 0px' });
function watchReveals() {
  $$('.split:not([data-gate]), .reveal-fade').forEach(el => { if (!el.closest('.hero')) seen.observe(el); });
}

// ─────────────────────────────────────────── her memory (ausdata sphere)
const sphere = new MemorySphere($('#sphere'), { named: [
  'Your name is Maya', 'Busier on Mondays', 'Mum · pottery · the 15th', 'Dubbed, never subtitles',
  'Worried about the deck · Tue', 'Happier on days you run', 'Keys: by the door',
] });
sphere.grab($('#drag'));
// the ANITA site's 3D memory graph takes the sphere's place once three.js is in, and travels the page like palmo's can
const graph = new MemoryGraph($('#graph'), $('#graph-labels'), sphere);

// ─────────────────────────────────────────── her (J's sprites)
const heroHer = new Anita($('#sprite-hero'));
const walkHer = new Anita($('#sprite-walk'));
let look = null;
if (location.search.includes('debug')) {   // testing only: ?debug&lookfrom=2.79&lookto=4.67 trims a stand-in clip
  const q = new URLSearchParams(location.search); if (q.get('lookfrom')) LOOK.from = +q.get('lookfrom'); if (q.get('lookto')) LOOK.to = +q.get('lookto');
}
fetch(LOOK.src, { method: 'HEAD' }).then(r => {
  if (!r.ok) return;
  const v = $('#hero-video'); v.src = LOOK.src; v.hidden = false;
  document.body.classList.add('look-video');
  look = new VideoTrack(v, LOOK);
}, () => {});
if (location.search.includes('debug')) Object.assign(window, { __hero: heroHer, __walk: walkHer, __her3d: () => her3d, __core: () => cityCore, __memFade: () => memFade, __sphere: sphere });   // for testing only
if (reduce) heroHer.speed = walkHer.speed = 0;   // she stands still for people who asked for less motion
// ?3d: the same ANITA, standing in depth (her3d.js). Try it at /?3d; without it the page is unchanged.
let her3d = null;
if (new URLSearchParams(location.search).has('3d')) import('./her3d.js').then(m => {
  her3d = new m.Her3D($('#sprite-hero'), $('#her-hero'), { still: reduce });
  her3d.onready = () => document.body.classList.add('has-her3d');
}).catch(() => {});

// only one of her is ever drawn: whichever stage is on screen (J's first rule)
const onScreen = new Set();
const stageSeen = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? onScreen.add(e.target.id) : onScreen.delete(e.target.id)), { threshold: 0.01 });
stageSeen.observe($('#her-hero'));   // the walk checks its own rectangle every frame (it needs it for the road anyway)
// the walk clip, and the Sprite demo's world behind it (three.js), only load when the road is near.
// If WebGL or the CDN is not there, the drawn road stays and nothing else changes.
let city = null, cityCore = null;   // cityCore: where HQ's brain core holds her memory graph on screen (city.js)
new IntersectionObserver((es, o) => {
  if (!es[0].isIntersecting) return; o.disconnect();
  walkHer.load('idle').then(() => walkHer.load('walk'));
  let ok = false; try { const c = document.createElement('canvas'); ok = !!(c.getContext('webgl2') || c.getContext('webgl')); } catch {}
  if (ok) import('./city.js').then(m => { city = m.startCity($('#city')); $('#walk').classList.add('has-city'); }, e => console.warn('city', e));
}, { rootMargin: '150% 0px' }).observe($('#walk'));

// ─────────────────────────────────────────── the gate
const gate = $('#gate'), gatebar = $('#gatebar'), gatetext = $('#gatetext');
// the particle ANITA on the entry screen. Loaded on its own, so if WebGL or three.js is not there the page
// simply goes without her and the real ANITA fades in by herself.
let gateSwarm = null;
if (!reduce) {
  let gl = false; try { gl = !!document.createElement('canvas').getContext('webgl2'); } catch {}
  if (gl) import('./gateswarm.js').then(m => m.startGateSwarm($('#gate-swarm'), $('#sprite-hero'), { count: narrow() ? 60000 : 150000 }))
    .then(s => { gateSwarm = s; }, e => { console.warn('gate swarm', e); $('#gate-swarm').remove(); });
  else $('#gate-swarm').remove();
} else $('#gate-swarm').remove();
let soundOn = false;
(async () => {
  let done = 0; const total = 3, step = () => { done++; const pct = Math.round(done / total * 100); gatebar.style.width = `${pct}%`; $('#gatepct').textContent = `${pct}%`; };
  await Promise.all([
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(step),
    heroHer.load('idle').then(step, () => { step(); gatetext.textContent = 'she could not load · the words still work'; }),
    new Promise(r => setTimeout(r, 900)).then(step),   // long enough to read her name
  ]);
  splitAll(); watchReveals();
  gatetext.textContent = 'she is ready';
  gate.classList.add('is-ready');
  $('#enter-sound').focus({ preventScroll: true });
})();
function enter(withSound) {
  if (gate.classList.contains('is-gone')) return;
  soundOn = withSound;
  gate.classList.add('is-gone');
  document.body.classList.remove('is-locked');
  // the particles flare and scatter while the real ANITA appears in their place
  gateSwarm?.materialize();
  setTimeout(() => document.body.classList.remove('pre-real'), 250);
  scrollTo(0, 0);
  // the headline slides up line by line, then the rest of the hero follows (lobod's order)
  setTimeout(() => {
    $('.hero h1').classList.add('is-in');
    $$('.hero .reveal-fade').forEach((el, i) => { el.style.setProperty('--d', `${0.2 + i * 0.12}s`); el.classList.add('is-in'); });
    $('.chips').classList.add('is-in');
    $('#joinpill').classList.add('is-shown');
  }, 250);
  heroHer.load('talk');   // her talking clip, fetched once she has been met
  if (!reduce) heroHer.load('gaze');   // and J's gaze clip, so she can look at you
  if (withSound) setTimeout(() => { if (!spoken.has('talk')) say('talk'); }, 1300);
}
$('#enter-sound').addEventListener('click', () => enter(true));
$('#enter-quiet').addEventListener('click', () => enter(false));

// chips: they drift on their own and lean away from the mouse
$$('.chip').forEach((c, i) => { c.style.setProperty('--n', i); c.classList.add('chip-float'); });
let mx = 0, my = 0;
const ptr = { x: 0, y: 0, on: false };   // a real mouse on the page: she looks at it
addEventListener('pointermove', e => { mx = e.clientX / innerWidth - 0.5; my = e.clientY / innerHeight - 0.5;
  if (e.pointerType === 'mouse') Object.assign(ptr, { x: e.clientX, y: e.clientY, on: true }); }, { passive: true });
document.addEventListener('pointerleave', () => { ptr.on = false; });
addEventListener('blur', () => { ptr.on = false; });

// ─────────────────────────────────────────── her voice
const audio = new Audio(); audio.preload = 'none';
const speaking = $('#speaking'), saying = $('#saying');
let speakingNow = null;
const spoken = new Set();   // lines she has already said this visit
function say(name) {
  if (speakingNow === name) { hush(); return; }
  hush();
  speakingNow = name; spoken.add(name);
  audio.src = `assets/voice/${name}.wav`;
  audio.play().catch(() => hush());
  saying.textContent = LINES[name] || '';
  speaking.hidden = false;
  heroHer.play('talk');
  $$(`[data-voice="${name}"], #hear`).forEach(b => { if (b.id !== 'hear' || name === 'talk') { b.classList.add('is-playing'); b.dataset.label ??= b.textContent; b.textContent = '■ Stop'; } });
}
function hush() {
  audio.pause(); speakingNow = null; speaking.hidden = true; heroHer.play('idle');
  $$('.is-playing').forEach(b => { b.classList.remove('is-playing'); if (b.dataset.label) b.textContent = b.dataset.label; });
}
audio.addEventListener('ended', hush);
$('#hush').addEventListener('click', hush);
$('#hear').addEventListener('click', () => say('talk'));
$$('[data-voice]').forEach(b => b.addEventListener('click', () => say(b.dataset.voice)));

// ─────────────────────────────────────────── the moments: each one plays once, and is kept
let kept = 0;
const nKept = $('#n-kept'), nWord = $('#n-word');
const showKept = () => { nKept.textContent = kept; nWord.textContent = kept === 1 ? 'memory' : 'memories'; };
// the moments play when their card reaches the middle of its flight (the mind scene, in the clock below)
async function playMoment(m) {
  const you = m.querySelector('.you'), text = you.dataset.type;
  const wait = ms => new Promise(r => setTimeout(r, reduce ? 0 : ms));
  you.classList.add('typing');
  for (let i = 1; i <= text.length; i++) { you.textContent = text.slice(0, i); await wait(30); }
  you.classList.remove('typing');
  await wait(350); m.classList.add('s2');
  await wait(1000); m.classList.add('s3');
  kept++; showKept(); sphere.pulse();
}

// ─────────────────────────────────────────── private: cut one thread
const fw = $('.forget-wrap');
$('#forget').addEventListener('click', () => {
  fw.classList.add('is-cut'); $('#forgotten').textContent = 'Forgotten.';
  sphere.forget('Busier on Mondays');
  if (kept > 0) { kept--; showKept(); }
  setTimeout(() => { $('#remember-again').hidden = false; }, 1800);
});
$('#remember-again').addEventListener('click', () => {
  fw.classList.remove('is-cut'); $('#forgotten').textContent = ''; $('#remember-again').hidden = true;
  sphere.forget('Busier on Mondays', false);
  $('#forget').focus();
});

// ─────────────────────────────────────────── the walk (unitedcarriers): scroll drives the road
const road = $('#road'), rg = road.getContext('2d');
const walkSec = $('#walk'), signs = $$('.signs li'), paceEl = $('#pace'), distEl = $('#dist');
let walkP = 0, walkPrev = 0, walkV = 0;
const walkHerBox = $('.walk-her');
function walkProgress() { const r = walkSec.getBoundingClientRect(); return clamp(-r.top / (r.height - innerHeight), 0, 1); }
function drawRoad(p) {
  const dpr = Math.min(devicePixelRatio || 1, 2), W = road.clientWidth, H = road.clientHeight;
  if (road.width !== Math.round(W * dpr) || road.height !== Math.round(H * dpr)) { road.width = Math.round(W * dpr); road.height = Math.round(H * dpr); }
  const g = rg; g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
  const hy = H * 0.42, vx = W / 2, half = narrow() ? W * 0.62 : W * 0.3, off = (1 - p) * 64;   // the road runs away behind her
  const Y = d => hy + (H - hy) / d, X = (side, d) => vx + side / d;
  // sky: dark, lit only at the horizon, where home is
  const sky = g.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, 'rgba(0,0,0,0)'); sky.addColorStop(1, `rgba(25,200,255,${0.07 + p * 0.1})`);
  g.fillStyle = sky; g.fillRect(0, 0, W, hy);
  const glow = g.createRadialGradient(vx, hy, 0, vx, hy, W * 0.45);
  glow.addColorStop(0, `rgba(88,230,255,${0.16 + p * 0.2})`); glow.addColorStop(1, 'rgba(88,230,255,0)');
  g.fillStyle = glow; g.fillRect(0, hy - W * 0.45, W, W * 0.9);
  // ground: a Tron floor, the Sprite demo's grid laid out to the horizon
  g.fillStyle = 'rgba(2,10,16,.92)'; g.fillRect(0, hy, W, H - hy);
  g.lineWidth = 1;
  for (let k = -14; k <= 14; k++) {   // lines running away from you
    const a = Math.abs(k) <= 1 ? 0 : 0.1 - Math.abs(k) * 0.004;
    if (a <= 0) continue;
    g.strokeStyle = `rgba(25,200,255,${a})`; g.beginPath(); g.moveTo(vx, hy); g.lineTo(vx + k * half * 0.5, H); g.stroke();
  }
  for (let i = 0; i < 44; i++) {       // lines coming toward you: this is what the scroll moves
    const d = i + 1 - (off % 1);
    if (d < 0.9) continue;
    const y = Y(d); g.strokeStyle = `rgba(25,200,255,${(0.35 / d + 0.02).toFixed(3)})`;
    g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke();
  }
  // the road
  g.fillStyle = 'rgba(0,0,0,.75)';
  g.beginPath(); g.moveTo(vx, hy); g.lineTo(vx - half, H); g.lineTo(vx + half, H); g.closePath(); g.fill();
  g.shadowColor = '#58e6ff'; g.shadowBlur = 14; g.strokeStyle = 'rgba(88,230,255,.85)'; g.lineWidth = 2;
  g.beginPath(); g.moveTo(vx, hy); g.lineTo(vx - half, H); g.moveTo(vx, hy); g.lineTo(vx + half, H); g.stroke();
  // centre dashes
  g.fillStyle = 'rgba(234,246,248,.7)';
  for (let i = 0; i < 40; i++) {
    const n = Math.floor(off) + i; if (n % 2) continue;
    const d0 = i + 1 - (off % 1), d1 = d0 + 0.55; if (d0 < 0.9) continue;
    const y0 = Y(d0), y1 = Y(d1), w0 = half * 0.03 / d0, w1 = half * 0.03 / d1;
    g.beginPath(); g.moveTo(vx - w0, y0); g.lineTo(vx + w0, y0); g.lineTo(vx + w1, y1); g.lineTo(vx - w1, y1); g.fill();
  }
  g.shadowBlur = 0;
  // lamp posts on both sides, every other unit
  for (let i = 0; i < 30; i++) {
    const n = Math.floor(off / 2) + i, d = (i * 2 + 2) - (off % 2);
    if (d < 1) continue;
    for (const s of [-1, 1]) {
      const x = X(s * half * 1.35, d), yb = Y(d), h = (H * 0.46) / d;
      g.strokeStyle = `rgba(88,230,255,${Math.min(0.7, 0.9 / d).toFixed(3)})`; g.lineWidth = Math.max(1, 3 / d);
      g.beginPath(); g.moveTo(x, yb); g.lineTo(x, yb - h); g.stroke();
      g.fillStyle = `rgba(234,246,248,${Math.min(1, 1.4 / d).toFixed(3)})`;
      g.shadowColor = '#58e6ff'; g.shadowBlur = 16 / d;
      g.fillRect(x - 3 / d - 1, yb - h - 3 / d - 1, 6 / d + 2, 6 / d + 2);
      g.shadowBlur = 0;
      if (n < 0) break;
    }
  }
  // her shadow on the road
  const sh = g.createRadialGradient(vx, H * 0.95, 0, vx, H * 0.95, W * 0.12);
  sh.addColorStop(0, 'rgba(88,230,255,.28)'); sh.addColorStop(1, 'rgba(88,230,255,0)');
  g.fillStyle = sh; g.fillRect(vx - W * 0.15, H * 0.85, W * 0.3, H * 0.15);

  placeSigns(p, W, H, hy, half);
}
// the signs come up the road toward you and pass her, alternating sides
function placeSigns(p, W2, H, hy2, half) {
  signs.forEach((li, i) => {
    const at = +li.dataset.at, lastOne = i === signs.length - 1;
    // she walks toward you, so the roadside falls away behind her: each sign appears beside her and recedes.
    // The last one is where she is going: it arrives and stays close.
    const u = lastOne ? Math.min(0.18, (p - (at - 0.2)) / 0.27) : (p - (at - 0.2)) / 0.27;
    if (u <= 0 || u >= 1.05) { li.style.opacity = 0; return; }
    const d = lerp(0.9, 9, u), side = i % 2 ? 1 : -1, s = clamp(1.6 / d, 0.5, 1.3);   // never too small to read
    const x = W2 / 2 + side * (narrow() ? W2 * 0.16 : half * 0.95) / d * 1.5, y = hy2 + (H - hy2) / d * 0.45 - 10;
    li.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%) scale(${s.toFixed(3)})`;
    li.style.opacity = (ss(0, 0.1, u) * (1 - ss(0.7, 1.02, u))).toFixed(3);
  });
}

// ─────────────────────────────────────────── counters
const countSeen = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return; countSeen.unobserve(e.target);
  const el = e.target, to = +el.dataset.count, suf = el.dataset.suffix || '', t0 = performance.now();
  (function run(now) { const u = reduce ? 1 : clamp((now - t0) / 1400, 0, 1), v = Math.round(to * (1 - Math.pow(1 - u, 3)));
    el.textContent = v.toLocaleString('en-GB') + (u === 1 ? suf : ''); if (u < 1) requestAnimationFrame(run); })(t0);
}), { threshold: 0.6 });
$$('[data-count]').forEach(el => countSeen.observe(el));

// ─────────────────────────────────────────── early access: pill → panel (why.zero.university)
const pill = $('#joinpill'), jpForm = $('#jp-form'), jpEmail = $('#jp-email');
const panel = $('#panel'), form = $('#signup'), sayEl = $('#say'), submit = $('#submit');
const emailOk = v => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v);
$('#jp-open').addEventListener('click', () => { pill.classList.add('is-open'); setTimeout(() => jpEmail.focus(), 200); });
jpForm.addEventListener('submit', e => {
  e.preventDefault();
  const v = jpEmail.value.trim();
  if (!emailOk(v)) { jpEmail.classList.remove('is-bad'); void jpEmail.offsetWidth; jpEmail.classList.add('is-bad'); jpEmail.focus(); return; }
  jpEmail.classList.remove('is-bad');
  form.email.value = v; openPanel();
});
document.addEventListener('pointerdown', e => { if (pill.classList.contains('is-open') && !pill.contains(e.target) && !jpEmail.value) pill.classList.remove('is-open'); });
$$('[data-join]').forEach(b => b.addEventListener('click', openPanel));

// the panel slides up over the page (theirs does), with a whoosh if she was met with sound on
let lastFocus = null;
function openPanel() {
  if (panel.classList.contains('is-open')) return;
  lastFocus = document.activeElement;
  panel.hidden = false; void panel.offsetWidth;
  panel.classList.add('is-open'); document.body.classList.add('panel-open', 'is-locked');
  const h = $('#panel-h'); splitLines(h); setTimeout(() => h.classList.add('is-in'), 350);
  setTimeout(() => { const n = form.querySelector('input[name=name]'); (n.value ? form.email : n).focus({ preventScroll: true }); }, 700);
  if (soundOn) { whoosh(); if (speakingNow !== 'access') setTimeout(() => say('access'), 500); }
}
function closePanel() {
  if (!panel.classList.contains('is-open')) return;
  panel.classList.remove('is-open'); document.body.classList.remove('panel-open', 'is-locked');
  $('#panel-h').classList.remove('is-in'); pill.classList.remove('is-open');
  setTimeout(() => { if (!panel.classList.contains('is-open')) panel.hidden = true; }, 700);
  if (speakingNow === 'access') hush();
  lastFocus?.focus?.({ preventScroll: true });
}
$('#panel-x').addEventListener('click', closePanel);
addEventListener('keydown', e => {
  if (e.key === 'Escape') closePanel();
  if (e.key === 'Tab' && panel.classList.contains('is-open')) {   // keep the keyboard inside the panel
    const f = [...panel.querySelectorAll('button, input:not([tabindex="-1"]):not([type=hidden]), textarea')].filter(x => x.offsetParent);
    if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
});
const tell = (text, bad) => { sayEl.textContent = text; sayEl.classList.toggle('is-error', !!bad); };
const flag = el => { el.classList.remove('is-bad'); void el.offsetWidth; el.classList.add('is-bad'); el.focus(); };

// the panel slides up with a soft whoosh (theirs does too): filtered noise, only if she was met with sound on
function whoosh() {
  try {
    const ac = whoosh.ac ||= new (window.AudioContext || window.webkitAudioContext)(), t = ac.currentTime, len = 0.7;
    const buf = ac.createBuffer(1, ac.sampleRate * len, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(), bp = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = buf; bp.type = 'bandpass'; bp.Q.value = 0.8;
    bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2200, t + len * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.18, t + 0.18); g.gain.exponentialRampToValueAtTime(0.0001, t + len);
    src.connect(bp).connect(g).connect(ac.destination); src.start(t); src.stop(t + len);
  } catch {}
}

// the phone: a custom dropdown, like their education picker. Keyboard: arrows, Enter, Escape.
const drop = $('#drop'), dropBtn = $('#drop-btn'), dropList = $('#drop-list'), dropVal = $('#drop-val'), phoneIn = $('#phone');
const opts = [...dropList.querySelectorAll('[role=option]')];
let active = 0;
function dropOpen(open) {
  dropList.hidden = !open; dropBtn.setAttribute('aria-expanded', open);
  if (open) { active = Math.max(0, opts.findIndex(o => o.getAttribute('aria-selected') === 'true')); mark(); dropList.focus(); }
}
function mark() { opts.forEach((o, i) => o.classList.toggle('is-active', i === active)); }
function choose(i) {
  opts.forEach((o, k) => o.setAttribute('aria-selected', k === i));
  phoneIn.value = opts[i].dataset.v; dropVal.textContent = opts[i].dataset.v;
  dropOpen(false); dropBtn.focus();
}
dropBtn.addEventListener('click', () => dropOpen(dropList.hidden));
dropBtn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); dropOpen(true); } });
opts.forEach((o, i) => o.addEventListener('click', () => choose(i)));
dropList.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown') { active = (active + 1) % opts.length; mark(); e.preventDefault(); }
  else if (e.key === 'ArrowUp') { active = (active - 1 + opts.length) % opts.length; mark(); e.preventDefault(); }
  else if (e.key === 'Enter' || e.key === ' ') { choose(active); e.preventDefault(); }
  else if (e.key === 'Escape' || e.key === 'Tab') { dropOpen(false); dropBtn.focus(); e.stopPropagation(); if (e.key === 'Escape') e.preventDefault(); }
});
document.addEventListener('pointerdown', e => { if (!dropList.hidden && !drop.contains(e.target)) dropOpen(false); });

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (form._honey.value) return;   // a bot filled the hidden field
  const name = form.querySelector('input[name=name]').value.trim(), email = form.email.value.trim();
  const city = form.city.value.trim(), phone = phoneIn.value, first = form.first.value.trim();
  $$('.panel .is-bad').forEach(x => x.classList.remove('is-bad'));
  if (!name) { tell('What should she call you?', true); flag(form.querySelector('input[name=name]')); return; }
  if (!emailOk(email)) { tell('That email does not look right yet.', true); flag(form.email); return; }
  tell(''); submit.classList.add('is-busy'); submit.disabled = true;
  if (!SIGNUP_ENDPOINT) {
    const subject = encodeURIComponent('ANITA early access');
    const body = encodeURIComponent(`Please add me to the early access list.\n\nName: ${name}\nEmail: ${email}` + (city ? `\nCity: ${city}` : '') + `\nPhone: ${phone}` + (first ? `\nThe first thing she should remember: ${first}` : ''));
    location.href = `mailto:${FALLBACK_MAILTO}?subject=${subject}&body=${body}`;
    setTimeout(() => joined(name, false), 700);
    return;
  }
  try {
    const res = await fetch(SIGNUP_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, city, phone, first }) });
    if (!res.ok) throw new Error(res.status);
    joined(name, true);
  } catch {
    submit.classList.remove('is-busy'); submit.disabled = false;
    tell(`Could not add you right now. Write to ${FALLBACK_MAILTO} instead.`, true);
  }
});
// their order: spinner → "Joined" on the button → the handwritten thank-you → the share step
function joined(name, sent) {
  submit.classList.remove('is-busy'); submit.classList.add('is-done'); $('#submit-t').textContent = 'Joined';
  setTimeout(() => {
    submit.classList.remove('is-done'); submit.disabled = false; $('#submit-t').textContent = 'Join early access';
    $('#panel-form-side').hidden = true; $('#panel-done').hidden = false;
    $('#done-1').hidden = false; $('#done-2').hidden = true;
    $('#done-h').textContent = sent ? 'You’re on the list.' : 'One last step.';
    $('#done-p').textContent = sent
      ? 'You will hear from the founder soon. Until then, she will keep your place.'
      : `Your email app should have opened with everything filled in. Press send and you are on the list. If nothing opened, write to ${FALLBACK_MAILTO}.`;
    $('#done2-h').textContent = `You’re in, ${name}.`;
    sphere.pulse(); sphere.pulse();
    $('#done-next').focus({ preventScroll: true });
  }, 900);
}
const pageUrl = location.href.split('#')[0];
$('#copy-url').textContent = pageUrl.replace(/^https?:\/\//, '');
$('#done-next').addEventListener('click', () => { $('#done-1').hidden = true; $('#done-2').hidden = false; $('#copy-link').focus({ preventScroll: true }); });
$('#copy-link').addEventListener('click', async () => {
  const b = $('#copy-link b');
  try { await navigator.clipboard.writeText(pageUrl); b.textContent = 'Copied'; } catch { b.textContent = 'Select and copy'; }
  setTimeout(() => { b.textContent = 'Copy link'; }, 2200);
});
$('#share-link').addEventListener('click', async () => {
  const data = { title: 'ANITA', text: 'She remembers what every AI forgets. Early access:', url: pageUrl };
  if (navigator.share) { try { await navigator.share(data); } catch {} }
  else $('#copy-link').click();
});

// ─────────────────────────────────────────── footer: the ANITA wordmark glows wherever the cursor is
const footMark = $('.foot-mark'), foot = $('.foot');
const glow = { x: -999, y: -999, on: 0, tx: -999, ty: -999, want: 0 };
addEventListener('pointermove', e => {
  const r = footMark.getBoundingClientRect(), f = foot.getBoundingClientRect();
  glow.tx = e.clientX - r.left; glow.ty = e.clientY - r.top;
  glow.want = e.clientY >= f.top && e.clientY <= f.bottom ? 1 : 0;   // anywhere over the footer
  if (glow.x < -900) { glow.x = glow.tx; glow.y = glow.ty; }
}, { passive: true });
document.addEventListener('pointerleave', () => { glow.want = 0; });
function footGlow(dt) {
  if (glow.want === 0 && glow.on < 0.005) return;
  const k = Math.min(1, dt * 10);   // the light trails the cursor a little, so it feels like it is carried
  glow.x += (glow.tx - glow.x) * k; glow.y += (glow.ty - glow.y) * k; glow.on += (glow.want - glow.on) * Math.min(1, dt * 5);
  footMark.style.setProperty('--gx', glow.x.toFixed(1) + 'px'); footMark.style.setProperty('--gy', glow.y.toFixed(1) + 'px');
  footMark.style.setProperty('--gr', Math.round(footMark.clientHeight * 0.9) + 'px');
  footMark.style.setProperty('--go', glow.on.toFixed(3));
}

// ─────────────────────────────────────────── footer (spur): the text needs its own box to slide
$$('.foot li a, .foot li button').forEach(a => { const s = document.createElement('span'); s.textContent = a.textContent; a.textContent = ''; a.append(s); });

// ─────────────────────────────────────────── where the sphere sits, section by section
// (the 3D memory graph, graph.js, glides between these like palmo.co.in's can, a little brighter than the sphere was)
const inYours = () => narrow() ? { x: 0.5, y: 0.7, r: 0.3, alpha: 0.3 } : { x: 0.74, y: 0.5, r: 0.3, alpha: 0.55 };
// Into the walk (24 Sep, by request): it does not shrink away any more. As the walk rises, the graph flies from
// its place in "You choose what she forgets" into HQ's brain core, landing where the core's copy of it is on
// screen and at its size, driven by the scroll (scroll back and it flies back out). Then the copy in the core
// takes over (memFade) and this one fades: her memory has settled into her central network for the whole walk.
let memFade = 0, walkEnter = 0;
function intoCore() {
  const from = inYours(), f = ss(0.5, 0.72, walkEnter);
  return { x: lerp(from.x, cityCore.x, f), y: lerp(from.y, cityCore.y, f), r: lerp(from.r, cityCore.r, f), alpha: lerp(from.alpha, 1, f) * (1 - memFade) };
}
const places = [
  ['.hero',    () => narrow() ? { x: 0.5, y: 0.66, r: 0.4, alpha: 0.85 } : { x: 0.68, y: 0.52, r: 0.38, alpha: 1 }],
  // the mind scene: behind the vow, then behind her memory's heading, filling in as the moments are kept
  ['.mind',    () => ({ x: 0.5, y: 0.5, r: mindP < 0.14 ? 0.46 : 0.4, alpha: mindP < 0.14 ? 0.3 : 0.5 })],
  ['.yours',   inYours],
  // in the demo's city: into HQ's brain core (above). On the drawn road (no 3D) the sphere is home on the horizon
  ['.walk',    () => city ? (cityCore && graph.on ? intoCore() : { x: 0.5, y: 0.3, r: 0.1, alpha: 0 }) : { x: 0.5, y: 0.42 - 0.07 - walkP * 0.05, r: 0.05 + walkP * 0.1, alpha: 0.95 }],
  ['.facts',   () => ({ x: 0.85, y: 0.3, r: 0.3, alpha: 0.3 })],
  ['.door',    () => ({ x: 0.5, y: 0.5, r: 0.46, alpha: 0.55 })],
  ['.foot',    () => ({ x: 0.5, y: 0.9, r: 0.5, alpha: 0.22 })],
].map(([s, f]) => [$(s), f]);
function placeSphere() {
  const mid = innerHeight / 2, w = walkSec.getBoundingClientRect();
  walkEnter = clamp(1 - w.top / innerHeight, 0, 1);
  // the copy in the core comes in once the travelling graph has landed, and stays for the walk
  memFade = city && cityCore && graph.on ? ss(0.7, 0.78, walkEnter) : 0;
  let here = null;
  for (const [el, f] of places) { const r = el.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) { Object.assign(sphere.want, f()); here = el; break; } }
  const diving = here === walkSec && !!city && !!cityCore && graph.on;
  sphere.ease = diving ? 14 : 3.2;   // the dive keeps up with the scroll; everywhere else it glides
  // the walk's 3D city is opaque, so while the graph flies in (or back out) it is lifted over the page; never once settled
  document.body.classList.toggle('graph-over', diving && walkEnter < 1 && sphere.at.alpha > 0.01);
  // on the drawn road the sphere is home, on the horizon, and snaps there
  if (!city && w.top <= 0 && w.bottom >= innerHeight) Object.assign(sphere.at, sphere.want);
  const doorTop = $('.door').getBoundingClientRect().top;
  sphere.grow = doorTop < innerHeight ? 1 : clamp(0.22 + kept * 0.16, 0, 0.9);
}

// ─────────────────────────────────────────── one clock for everything
const hero = $('.hero'), heroCopy = $('.hero-copy'), chips = $('.chips'), bar = $('#progress');
const mind = $('.mind'), vowLine = $('#vow-line'), mindHead = $('#mind-head'), cards = $$('.moment'), played = new Set();
const mindLede = $('#mind-head .lede'), taken = new Set();
// one glowing node per moment: what the card becomes as it is taken into her memory
const nodes = cards.map(() => { const n = document.createElement('i'); n.className = 'mind-node'; n.setAttribute('aria-hidden', 'true'); $('#mind-pin').append(n); return n; });
let mindP = 0;
const heroTalk = $('#hero-talk'), callLines = $$('.call-lines li'), waveBars = $$('.wave i'), callTime = $('#call-t');
let callT = 0, heroTalking = false, talkSince = 0;
let last = performance.now();
document.addEventListener('visibilitychange', () => { last = performance.now(); });
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000); last = now; const t = now / 1000;
  const max = document.documentElement.scrollHeight - innerHeight;
  bar.style.transform = `scaleX(${max > 0 ? (scrollY / max).toFixed(4) : 0})`;

  // hero (lobod): copy and chips leave over 6–36% of its scroll, the sphere turns
  const hr = hero.getBoundingClientRect(), hp = clamp(-hr.top / (hr.height - innerHeight), 0, 1);
  if (gate.classList.contains('is-gone')) {
    // beat one's words leave early; beat two (the call) comes in and holds to the end of the hero
    const out = 1 - ss(0.04, 0.2, hp), talkIn = ss(0.24, 0.34, hp);
    heroCopy.style.opacity = out.toFixed(3);
    heroCopy.style.translate = `0 ${(-hp * 120).toFixed(1)}px`;
    heroCopy.style.visibility = out < 0.01 ? 'hidden' : '';
    chips.style.opacity = out.toFixed(3);
    heroTalk.style.opacity = talkIn.toFixed(3);
    heroTalk.style.translate = `0 ${((1 - talkIn) * 40).toFixed(1)}px`;
    heroTalk.classList.toggle('is-on', talkIn > 0.5);
    callLines.forEach(li => li.classList.toggle('is-on', hp >= +li.dataset.at));
    const onCount = callLines.filter(li => li.classList.contains('is-on')).length;
    callLines.forEach((li, i) => li.classList.toggle('old', i < onCount - 2));   // phones keep only the latest two
    // she talks through the call beat. Hand-over stays smooth: she stops watching the cursor first (below),
    // cuts into talking from her centre pose, and when it ends finishes her gesture on a calm frame.
    // With sound on she also says her line once; it is this beat's own words.
    // hysteresis: she starts talking a little after the call appears and stops a little before it goes, so a
    // scroll that hovers at the edge cannot flick her between clips
    if (!heroTalking && talkIn > 0.7 && hp < 0.97) { heroTalking = true; talkSince = t; }
    else if (heroTalking && (talkIn < 0.08 || hp > 0.99) && t - talkSince > 1.5) heroTalking = false;   // once started, at least 1.5 s
    const talking = heroTalking;
    if (!speakingNow) heroHer.play(talking ? 'talk' : 'idle');
    if (talking && soundOn && !spoken.has('talk')) say('talk');
    if (talking) {
      callT += dt; callTime.textContent = `00:${String(Math.floor(callT) % 60).padStart(2, '0')}`;
      const last = callLines.filter(li => li.classList.contains('is-on')).pop(), herTurn = !last || last.classList.contains('c-her');
      waveBars.forEach((b, k) => b.style.setProperty('--h', (reduce ? 0.3 : 0.1 + (herTurn ? 0.9 : 0.3) * Math.abs(Math.sin(t * (herTurn ? 9 : 4) + k * 0.7) * Math.sin(t * 2.3 + k * 0.23))).toFixed(3)));
    }
    chips.style.translate = `${(-mx * 18).toFixed(1)}px ${(-my * 12).toFixed(1)}px`;
  }
  sphere.turn = hp * 0.9;
  // the mind scene: zoom through the vow, the memory heading emerges, the moments appear one at a time
  const mr = mind.getBoundingClientRect();
  mindP = clamp(-mr.top / (mr.height - innerHeight), 0, 1);
  if (mr.bottom > 0 && mr.top < innerHeight) {
    const W = innerWidth, H = innerHeight;
    // 1 · the vow grows until you pass through it
    const z = ss(0.02, 0.15, mindP);
    vowLine.style.transform = `translate(-50%, -50%) scale(${(1 + z * z * 16).toFixed(3)})`;
    vowLine.style.opacity = (1 - ss(0.07, 0.14, mindP)).toFixed(3);
    vowLine.style.visibility = mindP > 0.15 ? 'hidden' : '';
    // 2 · her memory's heading comes out of that zoom, then moves up to make room for the moments
    const e = ss(0.11, 0.22, mindP), up = ss(0.21, 0.27, mindP);
    const headY = narrow() ? -0.25 : -0.24;   // how far up it settles, as a share of the screen
    mindHead.style.opacity = e.toFixed(3);
    mindHead.style.transform = `translate(-50%, calc(-50% + ${(up * headY * H).toFixed(1)}px)) scale(${(lerp(0.4, 1, e) * lerp(1, 0.86, up)).toFixed(3)})`;
    mindLede.style.opacity = (1 - up).toFixed(3);
    mindHead.classList.toggle('is-on', e > 0.9);
    // 3 · the moments, one at a time in the same place: each fades up under the heading, plays, then
    //     dissolves into a node that flies into her memory (the sphere behind) and the next one appears
    const cy = H * (narrow() ? 0.66 : 0.68);
    cards.forEach((card, i) => {
      const s = 0.27 + i * 0.18, u = (mindP - s) / 0.18, node = nodes[i];
      if (u <= 0 || u >= 1) { card.style.opacity = 0; card.style.visibility = 'hidden'; node.style.opacity = 0; return; }
      card.style.visibility = '';
      const cw = card.offsetWidth, ch = card.offsetHeight, x = (W - cw) / 2, y = cy - ch / 2;
      const inK = ss(0, 0.14, u), outK = ss(0.76, 0.94, u);
      // in: rises a little and comes into focus. out: shrinks toward its centre and blurs away
      const sc = lerp(0.96, 1, inK) * lerp(1, 0.25, outK);
      card.style.transform = `translate(${x.toFixed(1)}px, ${(y + (1 - inK) * 28).toFixed(1)}px) scale(${sc.toFixed(3)})`;
      card.style.opacity = (inK * (1 - outK)).toFixed(3);
      card.style.filter = `blur(${((1 - inK) * 8 + outK * 10).toFixed(1)}px)`;
      if (u > 0.1 && !played.has(card)) { played.add(card); playMoment(card); }
      // the node: born where the card was, flies up into the middle of the sphere, and is taken in
      const nk = ss(0.78, 1, u), fx = W / 2, fy = H / 2;
      const nx = lerp(W / 2, fx, nk), ny = lerp(cy, fy, nk * nk);
      node.style.transform = `translate(${nx.toFixed(1)}px, ${ny.toFixed(1)}px) translate(-50%, -50%) scale(${lerp(1.6, 0.6, nk).toFixed(3)})`;
      node.style.opacity = (ss(0.76, 0.82, u) * (1 - ss(0.95, 1, u))).toFixed(3);
      if (u > 0.97 && !taken.has(card)) { taken.add(card); sphere.pulse(); sphere.pulse(); }
    });
  }
  // the pill steps aside while she walks, and where the page already offers the door
  const wr0 = walkSec.getBoundingClientRect(), dr = $('.door').getBoundingClientRect();
  pill.classList.toggle('is-away', (wr0.top < innerHeight * 0.5 && wr0.bottom > innerHeight * 0.5) || dr.top < innerHeight * 0.8);
  placeSphere();
  if (!graph.update(dt, t)) sphere.update(dt, t);
  footGlow(dt);

  // her: only one is drawn, and only while she is on screen
  if (look) {
    // the reel's slider: where the cursor sits across the screen is where she looks; no cursor, she looks ahead
    const p = !ptr.on || reduce ? 0.5 : LOOK.axis === 'vertical' ? ptr.y / innerHeight : ptr.x / innerWidth;
    look.aim(LOOK.reverse ? 1 - p : p); look.tick(dt);
  } else if (onScreen.has('her-hero')) {
    // her eyes follow the cursor: where it is, measured from her face (about an eighth of the way down her frame)
    const r = $('#sprite-hero').getBoundingClientRect(), fx = r.left + r.width / 2, fy = r.top + r.height * 0.12;
    // like the reel's slider: each screen edge is her full turn that way, however off-centre she stands
    const nx = (ptr.x - fx) / Math.max(80, ptr.x < fx ? fx : innerWidth - fx), ny = (ptr.y - fy) / Math.max(80, ptr.y < fy ? fy : innerHeight - fy);
    heroHer.look(clamp(nx, -1, 1), clamp(ny, -1, 1), ptr.on && hp < 0.2);   // she watches you, then turns to face forward before the call starts
    heroHer.update(dt);
    if (her3d) her3d.update(dt, t, clamp(nx, -1, 1), clamp(ny, -1, 1), ptr.on && hp < 0.2 && !reduce);
  }
  const wr = walkSec.getBoundingClientRect();
  if (wr.top < innerHeight && wr.bottom > 0) {
    walkPrev = walkP; walkP = walkProgress();
    const v = Math.abs(walkP - walkPrev) / Math.max(dt, 1e-3);
    walkV += (v - walkV) * 0.12;
    const moving = walkV > 0.006;
    walkHer.play(moving ? 'walk' : 'idle');
    if (!reduce) walkHer.speed = moving ? clamp(0.6 + walkV * 14, 0.6, 1.8) : 1;
    if (city) {
      // she stands on the demo's floor: her frame spans the projected feet-to-head of a 1.74 m figure
      // arrival: how far the section has come up the screen (0 → 1). The city flies in and HQ powers up;
      // she appears as the camera reaches her, and the black edge above melts away
      const enter = clamp(1 - wr.top / innerHeight, 0, 1);
      const gw = graph.on ? graph.world.rotation : null;
      const s = city(walkP, dt, enter, gw && { fade: memFade, rx: gw.x, ry: gw.y, rz: gw.z, day: graph.day, gone: graph.gone });
      const pin = $('.walk-pin'), PW = pin.clientWidth, PH = pin.clientHeight;
      // where the core holds her graph, in the travelling graph's own terms (share of the screen; r as it measures size)
      const pr = pin.getBoundingClientRect(), VW = document.documentElement.clientWidth, VH = document.documentElement.clientHeight;
      cityCore = s.core && { x: (pr.left + s.core.x * PW) / VW, y: (pr.top + s.core.y * PH) / VH, r: s.core.r / Math.min(VW, VH * 1.25) };
      walkHerBox.style.opacity = ss(0.78, 1, enter).toFixed(3);
      pin.style.setProperty('--edge', (1 - ss(0.5, 1, enter)).toFixed(3));
      Object.assign(walkHerBox.style, { top: `${(s.headY * PH).toFixed(1)}px`, height: `${((s.feetY - s.headY) * PH).toFixed(1)}px`, left: `${(s.x * 100).toFixed(2)}%` });
      placeSigns(walkP, PW, PH, s.horizon * PH, narrow() ? PW * 0.62 : PW * 0.3);
    } else drawRoad(walkP);
    walkHer.update(dt);
    paceEl.textContent = Math.min(9.9, walkV * 40).toFixed(1);   // an ordinary scroll reads as a walk, 3–5 km/h
    distEl.textContent = Math.round(walkP * 100);
  }
}
requestAnimationFrame(frame);

startCursor();
