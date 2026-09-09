---
layout: demo.njk
title: Lattice
hideSeeMore: true
year: 2026
---

<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  padding: 12px;
  background: #f5f5f5;
  font-family: monospace;
  font-size: 13px;
  user-select: none;
}

#controls {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
  margin-bottom: 10px;
}

#controls label {
  display: flex;
  gap: 4px;
  align-items: center;
}

#controls input[type=number] {
  width: 58px;
  font-family: monospace;
  font-size: 12px;
  padding: 3px 5px;
  border: 1px solid #999;
}

button {
  font-family: monospace;
  font-size: 12px;
  padding: 4px 10px;
  cursor: pointer;
  border: 1px solid #999;
  background: #fff;
}

button.active {
  background: #222;
  color: #fff;
  border-color: #222;
}

#canvas-wrap {
  border: 1px solid #ccc;
  background: #fff;
  line-height: 0;
  cursor: grab;
  touch-action: none;
}

#canvas-wrap.dragging { cursor: grabbing; }

canvas { display: block; }

#readout {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

#readout .ro-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

#readout .ro-text {
  white-space: pre;
  font-size: 12px;
}

#readout .ro-step {
  display: flex;
  gap: 4px;
  align-items: center;
  color: #888;
  font-size: 11px;
}

#readout .ro-period {
  color: #888;
  font-size: 11px;
  min-width: 66px;
}

#readout .ro-mute {
  font-size: 11px;
  padding: 2px 8px;
}

#readout .ro-step input {
  width: 44px;
  font-family: monospace;
  font-size: 11px;
  padding: 2px 4px;
  border: 1px solid #bbb;
}

#legend {
  margin-top: 10px;
  color: #888;
  font-size: 12px;
  white-space: pre-wrap;
}
</style>

<div id="controls">
  <button id="btn-play" class="active">pause</button>
  <button id="btn-sound">sound: off</button>
  <label>vol <input type="number" id="cfg-vol" value="60" min="0" max="100" step="1"></label>
  <label>master ms <input type="number" id="cfg-master" value="1000" min="60" max="8000" step="20"></label>
  <label>glide % <input type="number" id="cfg-glide" value="35" min="1" max="100" step="1"></label>
  <label>origin deg <input type="number" id="cfg-offset" value="2" min="-12" max="12" step="1"></label>
  <label>transpose <input type="number" id="cfg-transpose" value="0" min="-24" max="24" step="1"></label>
  <button id="btn-labels" class="active">notes: on</button>
  <button id="btn-trails" class="active">trails: on</button>
  <button id="btn-rotate" class="active">auto-rotate: on</button>
  <button id="btn-reset-view">reset view</button>
  <button id="btn-reseed">reseed</button>
  <button id="btn-svg">export svg</button>
</div>

<div id="canvas-wrap">
  <canvas id="view"></canvas>
</div>

<div id="readout"></div>

<div id="legend">x · +1 degree (step)    y · +2 degrees (third)    z · +6 degrees (octave)    —    scale: D F G A B♭ C
Because the scale is uneven, a y step is a minor third, major third or fourth depending where you stand.
drag to orbit, wheel to zoom, space to pause · click <em>sound</em> to start audio
<em>export svg</em> saves the current projection as line paths plus note labels — no dots or trails</div>

<script>
// ─── Config / state ───────────────────────────────────────────────────────────
// Three sine voices, one per coordinate plane. Each is confined to a 3×3 square
// of lattice points in its plane; the three squares intersect at a shared origin.
// z is the octave, x the perfect fifth, y the major third — a 3-5 just lattice.

const PLANES = [
  // fixed: index of the coordinate pinned to 0. free: the two axes the voice walks.
  { label: 'z=0', fixed: 2, free: [0, 1], color: '#8899cc', rgb: '136,153,204' },
  { label: 'x=0', fixed: 0, free: [1, 2], color: '#88aa99', rgb: '136,170,153' },
  { label: 'y=0', fixed: 1, free: [0, 2], color: '#ccaa55', rgb: '204,170,85' },
];

const TRAIL_LEN = 12;   // lattice points of history kept per voice
const FIG_R     = 1.5;  // world radius of the figure, for depth cueing

// One master clock; each voice steps every `mult` master ticks. Because the
// multipliers are integers, the voices can never drift — they stay phase-locked
// and coincide exactly every lcm(mults) ticks (every 6 at the defaults below).
const DEFAULT_MULT = [1, 2, 3];

const state = {
  playing: true,
  masterMs: 1000,       // the master pulse; a voice's period is masterMs × mult
  glide: 0.35,          // fraction of a voice's own period spent moving; the rest is held
  trails: true,
  labels: true,         // draw each node's note name on the figure
  autoRotate: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  acc: 0,               // ms accumulated toward the next master tick
  tick: 0,              // master ticks elapsed
};

const cam = { az: 0.86, el: 0.52, dist: 6.2, fov: 42 };
const CAM_HOME = { ...cam };

// ─── Lattice model ────────────────────────────────────────────────────────────
// The 3×3×3 integer lattice minus its 8 cube corners: every point with at least
// one zero coordinate lies on one of the three planes. 19 points, 30 unit edges.

const key3 = p => p.join(',');

const POINTS = [];
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++)
      if (x === 0 || y === 0 || z === 0) POINTS.push([x, y, z]);

const POINT_SET = new Set(POINTS.map(key3));

// Every edge is either an axis edge (shared by two planes, the structural spine)
// or a boundary edge of exactly one plane's square. Nothing else is possible:
// if both fixed coordinates were nonzero, one endpoint would have no zero at all
// and so would not be in the lattice.
const EDGES = [];
for (const p of POINTS) {
  for (let ax = 0; ax < 3; ax++) {
    if (p[ax] > 0) continue;              // walk each edge once, in the + direction
    const q = p.slice();
    q[ax] += 1;
    if (!POINT_SET.has(key3(q))) continue;
    const others = [0, 1, 2].filter(i => i !== ax);
    const zeros  = others.filter(i => p[i] === 0);
    EDGES.push({ a: p, b: q, plane: zeros.length === 2 ? null : zeros[0] });
  }
}

// The 4 corners of each plane's square, for the faint tinted fill.
for (const pl of PLANES) {
  const [a, b] = pl.free;
  pl.corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([u, v]) => {
    const p = [0, 0, 0];
    p[a] = u;
    p[b] = v;
    return p;
  });
}

/** The 2–4 orthogonally adjacent points reachable from `p` inside `plane`. */
function neighbours(plane, p) {
  const out = [];
  for (const ax of plane.free) {
    for (const d of [-1, 1]) {
      const v = p[ax] + d;
      if (v < -1 || v > 1) continue;
      const q = p.slice();
      q[ax] = v;
      out.push(q);
    }
  }
  return out;
}

// ─── Pitch math ───────────────────────────────────────────────────────────────
// Pitch is a homomorphism from lattice position into SCALE-DEGREE space, then a
// table lookup:
//
//     degree = gx·x + gy·y + gz·z + offset      →  scale[degree] → MIDI → Hz
//
// One mapping serves all three planes, so they agree wherever they intersect and
// the origin stays a genuine shared unison. But the scale is *uneven* in
// semitones, so one lattice step is no longer one fixed interval — a y step is a
// minor third, major third or fourth depending where you stand. That unevenness
// is the whole source of harmonic variety, and swapping SCALE.notes swaps the
// piece. Entries may be fractional, which is how a just-intonation table would
// be expressed (a just major third above D3 is 50 + 3.8631).

const SCALE = {
  name: 'D F G A B♭ C',   // the soft hexachord — D natural minor without the 2nd
  notes: [50, 53, 55, 57, 58, 60],
  octave: 12,             // semitones added each time the table wraps
};

// Axis generators, in scale degrees. gz equals the table length, so z stays
// exactly an octave. gx = 1 step and gy = 2 degrees (a third) make the plane a
// tonnetz: the triangles are triads.
const GEN = { x: 1, y: 2, z: SCALE.notes.length };

const tuning = {
  offset: 2,        // degree at the origin — 2 places all six notes on the z=0 plane
  transpose: 0,     // semitones applied to everything
};

/** Lattice position → scale degree. */
const degreeAt = p => GEN.x * p[0] + GEN.y * p[1] + GEN.z * p[2] + tuning.offset;

/** Scale degree → MIDI note, wrapping the table by octaves in both directions. */
function midiOfDegree(d) {
  const n = SCALE.notes.length;
  return SCALE.notes[((d % n) + n) % n] + SCALE.octave * Math.floor(d / n);
}

const midiAt = p => midiOfDegree(degreeAt(p));
const midiToHz = m => 440 * 2 ** ((m + tuning.transpose - 69) / 12);
const hzAt = p => midiToHz(midiAt(p));

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
function noteName(m) {
  const r = Math.round(m);
  return NOTE_NAMES[((r % 12) + 12) % 12] + (Math.floor(r / 12) - 1);
}

// ─── Vector + camera math ─────────────────────────────────────────────────────

function dot3(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross3(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function norm3(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < 1e-12 ? [1, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
}

const view = { w: 640, h: 480 };
let basis = null;

/** Rebuild the eye/forward/right/up frame for the current orbit position. */
function updateCamera() {
  const el = Math.max(-1.5, Math.min(1.5, cam.el)); // never look straight down the z axis
  const ce = Math.cos(el);
  const eye = [cam.dist * ce * Math.cos(cam.az), cam.dist * ce * Math.sin(cam.az), cam.dist * Math.sin(el)];
  const fwd = norm3([-eye[0], -eye[1], -eye[2]]);   // lookAt is always the origin
  const right = norm3(cross3(fwd, [0, 0, 1]));
  basis = { eye, fwd, right, up: cross3(right, fwd), focal: (view.h / 2) / Math.tan(cam.fov * Math.PI / 360) };
}

/** World point → { sx, sy, depth } in CSS pixels, or null if behind the camera. */
function prj(p) {
  const { eye, fwd, right, up, focal } = basis;
  const d = [p[0] - eye[0], p[1] - eye[1], p[2] - eye[2]];
  const z = dot3(d, fwd);
  if (z <= 0.05) return null;
  return {
    sx: view.w / 2 + dot3(d, right) * focal / z,
    sy: view.h / 2 - dot3(d, up) * focal / z,
    depth: z,
  };
}

/** 0 (nearest) … 1 (furthest), for depth cueing without occlusion sorting. */
function depthT(z) {
  return Math.max(0, Math.min(1, (z - (cam.dist - FIG_R)) / (2 * FIG_R)));
}

const lerp = (a, b, t) => a + (b - a) * t;

function cue(z) {
  const t = depthT(z);
  return { alpha: lerp(0.75, 0.18, t), width: lerp(1.3, 0.6, t) };
}

// ─── Walk ─────────────────────────────────────────────────────────────────────

const voices = PLANES.map((plane, i) => ({
  i,
  plane,
  prev: [0, 0, 0],
  next: [0, 0, 0],
  history: [[0, 0, 0]],
  mult: DEFAULT_MULT[i],  // steps once every `mult` master ticks
  tick: 0,
  muted: false,           // audio only — a muted voice keeps walking
}));

/** This voice's period in ms. */
const voicePeriod = v => state.masterMs * v.mult;

/**
 * How far this voice is through its own period, derived from the master clock
 * rather than a private accumulator — that is what makes drift impossible.
 */
const voicePhase = v => ((state.tick % v.mult) * state.masterMs + state.acc) / voicePeriod(v);

function stepVoice(v) {
  const options = neighbours(v.plane, v.next);
  v.prev = v.next;
  v.next = options[Math.floor(Math.random() * options.length)];
  v.history.push(v.next);
  if (v.history.length > TRAIL_LEN) v.history.shift();
}

function reseed() {
  for (const v of voices) {
    v.prev = [0, 0, 0];
    v.next = [0, 0, 0];
    v.history = [[0, 0, 0]];
    v.tick = 0;
  }
  state.acc = 0;
  state.tick = 0;
  renderReadout();
  retune();
}

// ─── Renderer ─────────────────────────────────────────────────────────────────

const canvas = document.getElementById('view');
const wrap   = document.getElementById('canvas-wrap');
const ctx    = canvas.getContext('2d');

function resize() {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.max(320, Math.floor(wrap.clientWidth));
  const h = Math.max(280, Math.floor(Math.min(window.innerHeight * 0.66, w * 0.72)));
  canvas.width  = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width  = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  view.w = w;
  view.h = h;
}

function line3(a, b, color, alpha, width) {
  const s1 = prj(a), s2 = prj(b);
  if (!s1 || !s2) return;
  ctx.beginPath();
  ctx.moveTo(s1.sx, s1.sy);
  ctx.lineTo(s2.sx, s2.sy);
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2);

/**
 * Where a voice's dot actually sits right now: snap over `glide`, then hold.
 * Phase is read from the voice's own clock, so the three move independently.
 */
function voicePos(v) {
  const phase = state.playing ? voicePhase(v) : 1;
  const t = easeInOutCubic(Math.min(1, phase / state.glide));
  return [0, 1, 2].map(i => lerp(v.prev[i], v.next[i], t));
}

// Labelled in scale degrees, since that is what an axis step now adds.
const AXIS_LABELS = [
  [[1.42, 0, 0], `+${GEN.x}`], [[-1.42, 0, 0], `−${GEN.x}`],
  [[0, 1.42, 0], `+${GEN.y}`], [[0, -1.42, 0], `−${GEN.y}`],
  [[0, 0, 1.42], '+8ve'],      [[0, 0, -1.42], '−8ve'],
];

function drawFrame() {
  updateCamera();
  ctx.clearRect(0, 0, view.w, view.h);
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.lineCap = 'round';

  // Faint plane washes. All three squares are centred on the origin, so their
  // centroid depths are identical and draw order is not observable.
  for (const pl of PLANES) {
    const pts = pl.corners.map(prj);
    if (pts.some(p => !p)) continue;
    ctx.beginPath();
    ctx.moveTo(pts[0].sx, pts[0].sy);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].sx, pts[i].sy);
    ctx.closePath();
    ctx.fillStyle = `rgba(${pl.rgb},0.055)`;
    ctx.fill();
  }

  // Lattice edges: plane boundaries in their plane's hue, the shared axis spine
  // in neutral grey and a touch heavier.
  for (const e of EDGES) {
    const mid = prj([(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, (e.a[2] + e.b[2]) / 2]);
    if (!mid) continue;
    const c = cue(mid.depth);
    if (e.plane === null) {
      line3(e.a, e.b, '#555', c.alpha, c.width * 1.15);
    } else {
      const pl = PLANES.find(p => p.fixed === e.plane);
      line3(e.a, e.b, pl.color, c.alpha * 0.85, c.width);
    }
  }

  // Lattice points.
  for (const p of POINTS) {
    const s = prj(p);
    if (!s) continue;
    const c = cue(s.depth);
    const isOrigin = p[0] === 0 && p[1] === 0 && p[2] === 0;
    ctx.beginPath();
    ctx.arc(s.sx, s.sy, isOrigin ? 3.2 : 1.7, 0, Math.PI * 2);
    ctx.fillStyle = '#333';
    ctx.globalAlpha = isOrigin ? Math.min(0.9, c.alpha + 0.2) : c.alpha * 0.8;
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Voice trails, oldest to newest. Moves are axis-aligned unit steps, so these
  // read as orthogonal paths lying flat in their plane.
  if (state.trails) {
    for (const v of voices) {
      const path = v.history.concat([voicePos(v)]);
      for (let i = 0; i < path.length - 1; i++) {
        const a = path[i], b = path[i + 1];
        const mid = prj([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]);
        if (!mid) continue;
        const fade = (i + 1) / path.length;
        const dim  = v.muted ? 0.35 : 1;
        line3(a, b, v.plane.color, cue(mid.depth).alpha * fade * 0.9 * dim, 1 + 1.4 * fade);
      }
    }
  }

  // Voice dots.
  for (const v of voices) {
    const s = prj(voicePos(v));
    if (!s) continue;
    const c = cue(s.depth);
    const r = lerp(6.5, 4, depthT(s.depth));
    const alpha = Math.min(1, c.alpha + 0.3);

    ctx.beginPath();
    ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2);
    if (v.muted) {
      // A muted voice still walks, so it stays on the figure — but hollow.
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.strokeStyle = v.plane.color;
      ctx.lineWidth = 1.6;
      ctx.globalAlpha = alpha * 0.9;
      ctx.stroke();
    } else {
      ctx.fillStyle = v.plane.color;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, r, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Axis labels, so the tonnetz reading is legible on the figure itself.
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [p, text] of AXIS_LABELS) {
    const s = prj(p);
    if (!s) continue;
    ctx.fillStyle = '#999';
    ctx.globalAlpha = cue(s.depth).alpha + 0.15;
    ctx.fillText(text, s.sx, s.sy);
    ctx.globalAlpha = 1;
  }

  // Note names, one per node. One global mapping means each point has exactly one
  // pitch no matter which plane's voice is standing there, so a single label per
  // node is unambiguous. Drawn last, with a white knockout, so they stay readable
  // over the wireframe.
  if (state.labels) {
    ctx.font = '9px monospace';
    ctx.lineJoin = 'round';
    for (const p of POINTS) {
      const s = prj(p);
      if (!s) continue;
      const isOrigin = p[0] === 0 && p[1] === 0 && p[2] === 0;
      const name = noteName(midiAt(p) + tuning.transpose);
      const y = s.sy - (isOrigin ? 11 : 9);

      ctx.globalAlpha = Math.min(1, cue(s.depth).alpha + 0.25);
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.strokeText(name, s.sx, y);
      ctx.fillStyle = isOrigin ? '#111' : '#555';
      ctx.fillText(name, s.sx, y);
      ctx.globalAlpha = 1;
    }
  }
}

// ─── SVG export ───────────────────────────────────────────────────────────────
// Captures the current 2D projection as line paths plus text labels — no dots,
// plane washes or voice trails — so the file opens in a vector editor as
// editable geometry with live, selectable type. Groups mirror the figure's two
// edge classes (one per plane's boundary edges, one for the shared axis spine),
// then the labels follow in their own groups.

const r2 = n => Math.round(n * 100) / 100;
const xmlEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One edge → one `<path>`, carrying the same depth cue the canvas draws with. */
function edgePath(e) {
  const a = prj(e.a), b = prj(e.b);
  const mid = prj([(e.a[0] + e.b[0]) / 2, (e.a[1] + e.b[1]) / 2, (e.a[2] + e.b[2]) / 2]);
  if (!a || !b || !mid) return null;             // behind the camera
  const c = cue(mid.depth);
  const axis = e.plane === null;
  return `      <path d="M ${r2(a.sx)} ${r2(a.sy)} L ${r2(b.sx)} ${r2(b.sy)}"`
       + ` stroke-width="${r2(axis ? c.width * 1.15 : c.width)}"`
       + ` opacity="${r2(axis ? c.alpha : c.alpha * 0.85)}"/>`;
}

function svgGroup(id, color, edges) {
  const paths = edges.map(edgePath).filter(Boolean);
  if (!paths.length) return '';
  return `    <g id="${id}" stroke="${color}">\n${paths.join('\n')}\n    </g>\n`;
}

/**
 * One `<text>`. Canvas centres text on the given y via textBaseline 'middle';
 * `dominant-baseline` is the SVG equivalent but is unreliable in vector editors,
 * so the baseline is shifted by hand instead — portable, and identical on screen.
 */
function svgText(s, text, size, fill, opacity) {
  return `      <text x="${r2(s.sx)}" y="${r2(s.sy + size * 0.35)}"`
       + ` font-size="${size}" fill="${fill}" opacity="${r2(opacity)}"`
       + `>${xmlEsc(text)}</text>`;
}

function svgLabelGroup(id, extra, texts) {
  const kept = texts.filter(Boolean);
  if (!kept.length) return '';
  return `    <g id="${id}" font-family="monospace" text-anchor="middle" ${extra}>\n`
       + `${kept.join('\n')}\n    </g>\n`;
}

/** The instantaneous projection as an SVG document string. */
function latticeSVG() {
  updateCamera();  // so an export never depends on a frame having just run

  const wireframe =
    PLANES.map(pl => svgGroup(`plane-${pl.label.replace('=', '')}`, pl.color,
                              EDGES.filter(e => e.plane === pl.fixed))).join('') +
    svgGroup('axis-spine', '#555', EDGES.filter(e => e.plane === null));

  // Axis interval labels, exactly as the canvas draws them.
  const axisLabels = svgLabelGroup('axis-labels', 'stroke="none"',
    AXIS_LABELS.map(([p, text]) => {
      const s = prj(p);
      return s && svgText(s, text, 10, '#999', Math.min(1, cue(s.depth).alpha + 0.15));
    }));

  // Note names, one per node, following the `notes` toggle. The canvas draws a
  // white knockout under each; `paint-order` gets the same result from a single
  // element, so the type stays editable rather than being doubled up.
  const noteLabels = !state.labels ? '' : svgLabelGroup('note-labels',
    'stroke="#fff" stroke-width="3" stroke-linejoin="round" paint-order="stroke fill"',
    POINTS.map(p => {
      const s = prj(p);
      if (!s) return null;
      const isOrigin = p[0] === 0 && p[1] === 0 && p[2] === 0;
      const at = { sx: s.sx, sy: s.sy - (isOrigin ? 11 : 9) };
      return svgText(at, noteName(midiAt(p) + tuning.transpose), 9,
                     isOrigin ? '#111' : '#555', Math.min(1, cue(s.depth).alpha + 0.25));
    }));

  const body = wireframe + axisLabels + noteLabels;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${view.w} ${view.h}"`
      + ` width="${view.w}" height="${view.h}">`,
    `  <!-- lattice · az ${r2(cam.az)} · el ${r2(cam.el)} · dist ${r2(cam.dist)}`
      + ` · fov ${cam.fov} · ${EDGES.length} edges · scale ${SCALE.name} -->`,
    '  <g fill="none" stroke-linecap="round">',
    body.replace(/\n$/, ''),
    '  </g>',
    '</svg>',
    '',
  ].join('\n');
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '-');

function downloadSVG() {
  const url = URL.createObjectURL(new Blob([latticeSVG()], { type: 'image/svg+xml' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `lattice-${stamp()}.svg`;
  a.click();
  // Some browsers read the blob asynchronously after click(), so don't revoke yet.
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

const btnSvg = document.getElementById('btn-svg');
btnSvg.addEventListener('click', () => {
  downloadSVG();
  btnSvg.textContent = 'svg saved ✓';
  setTimeout(() => { btnSvg.textContent = 'export svg'; }, 1100);
});

// ─── Readout ──────────────────────────────────────────────────────────────────

// Each row carries its own voice's clock multiplier, so the parameter sits next
// to the voice it governs rather than in the shared control bar.
const readout = document.getElementById('readout');
const rows = voices.map((v) => {
  const row = document.createElement('div');
  row.className = 'ro-row';

  const text = document.createElement('span');
  text.className = 'ro-text';
  text.style.color = v.plane.color;

  const input = document.createElement('input');
  input.type = 'number';
  input.min = '1';
  input.max = '64';
  input.step = '1';
  input.value = v.mult;
  input.addEventListener('input', () => {
    const n = parseInt(input.value, 10);
    if (Number.isInteger(n) && n >= 1) {
      v.mult = n;
      renderReadout();
    }
  });

  const label = document.createElement('label');
  label.className = 'ro-step';
  label.append('every ', input, ' ticks');

  const period = document.createElement('span');
  period.className = 'ro-period';

  const mute = document.createElement('button');
  mute.className = 'ro-mute';
  mute.textContent = 'mute';
  mute.addEventListener('click', () => setMuted(v, !v.muted));

  row.append(text, label, period, mute);
  readout.appendChild(row);
  return { text, period, mute };
});

const pad2 = n => String(n).padStart(2, ' ');

function renderReadout() {
  voices.forEach((v, i) => {
    const d = degreeAt(v.next);
    const m = midiAt(v.next);
    rows[i].period.textContent = `= ${voicePeriod(v)} ms`;
    rows[i].text.textContent =
      v.plane.label.padEnd(6, ' ') +
      `(${pad2(v.next[0])},${pad2(v.next[1])},${pad2(v.next[2])})` +
      `deg ${d >= 0 ? ' ' : ''}${d}`.padStart(9, ' ') +
      `${Math.round(m + tuning.transpose)} ${noteName(m + tuning.transpose)}`.padStart(10, ' ') +
      `${hzAt(v.next).toFixed(1)} Hz`.padStart(12, ' ');
  });
}

// ─── Audio ────────────────────────────────────────────────────────────────────
// Three continuous sine drones, one per voice, gliding between lattice pitches
// over the same window as the dots — portamento and motion are one gesture.
// The context is only created inside a user gesture, per autoplay policy.

const audio = {
  ac: null,
  master: null,
  nodes: [],     // { osc, gain }, parallel to `voices`
  on: false,
  vol: 0.6,
};

const GLIDE_STEPS = 48;  // samples of the eased curve handed to the frequency param
const VOICE_GAIN  = 0.28;

/**
 * Perceptual tilt. Voice y=0 alone spans 1/3 … 3, and equal-amplitude sines
 * across three octaves read as wildly unbalanced, so lean the gain down as
 * pitch rises.
 */
function voiceGain(freq) {
  const tilt = (hzAt([0, 0, 0]) / freq) ** 0.45;   // referenced to the origin's pitch
  return Math.max(0.5, Math.min(1.35, tilt)) * VOICE_GAIN;
}

function initAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const ac = new AC();
  const master = ac.createGain();
  master.gain.value = 0;
  master.connect(ac.destination);

  audio.ac = ac;
  audio.master = master;
  // osc → gain (the tilt curve glideTo writes) → mute → master. Keeping mute on
  // its own node means toggling it never has to fight the scheduled tilt curve.
  audio.nodes = voices.map((v) => {
    const osc  = ac.createOscillator();
    const gain = ac.createGain();
    const mute = ac.createGain();
    const f = hzAt(v.next);
    osc.type = 'sine';
    osc.frequency.value = f;
    gain.gain.value = voiceGain(f);
    mute.gain.value = v.muted ? 0 : 1;
    osc.connect(gain).connect(mute).connect(master);
    osc.start();          // starts at the pitch already on screen, so no jump
    return { osc, gain, mute };
  });
}

/** Mute is audio only: the voice keeps walking, it just stops sounding. */
function setMuted(v, muted) {
  v.muted = muted;
  const btn = rows[v.i].mute;
  btn.textContent = muted ? 'muted' : 'mute';
  btn.classList.toggle('active', muted);

  if (!audio.ac) return;
  const t = audio.ac.currentTime;
  const g = audio.nodes[v.i].mute.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(muted ? 0 : 1, t + 0.08);
}

/** Ramp the master over ~120ms so toggling never clicks. */
function rampMaster(to) {
  const t = audio.ac.currentTime;
  const g = audio.master.gain;
  g.cancelScheduledValues(t);
  g.setValueAtTime(g.value, t);
  g.linearRampToValueAtTime(to, t + 0.12);
}

/**
 * Sweep one voice from `fromF` to `toF` across the glide window, following the
 * same easing curve as its dot. Interpolation is geometric — linear in pitch —
 * because lattice steps are multiplicative. Falls back to a plain exponential
 * sweep if the curve cannot be scheduled (an implementation may refuse a curve
 * that overlaps one still running).
 */
function glideTo(node, fromF, toF, seconds) {
  const t = audio.ac.currentTime;
  const p = node.osc.frequency;
  const g = node.gain.gain;

  try { p.cancelScheduledValues(t); g.cancelScheduledValues(t); } catch { /* ignore */ }

  if (seconds < 0.005 || fromF === toF) {
    p.setValueAtTime(toF, t);
    g.setValueAtTime(voiceGain(toF), t);
    return;
  }

  try {
    const freqs = new Float32Array(GLIDE_STEPS);
    const gains = new Float32Array(GLIDE_STEPS);
    for (let i = 0; i < GLIDE_STEPS; i++) {
      const f = fromF * (toF / fromF) ** easeInOutCubic(i / (GLIDE_STEPS - 1));
      freqs[i] = f;
      gains[i] = voiceGain(f);
    }
    p.setValueCurveAtTime(freqs, t, seconds);
    g.setValueCurveAtTime(gains, t, seconds);
  } catch {
    p.setValueAtTime(fromF, t);
    p.exponentialRampToValueAtTime(toF, t + seconds);
    g.setValueAtTime(g.value, t);
    g.linearRampToValueAtTime(voiceGain(toF), t + seconds);
  }
}

/** Move every voice onto the pitch it is currently showing. Used when tuning changes. */
function retune() {
  if (!audio.ac) return;
  const t = audio.ac.currentTime;
  voices.forEach((v, i) => {
    const f = hzAt(v.next);
    const n = audio.nodes[i];
    try {
      n.osc.frequency.cancelScheduledValues(t);
      n.osc.frequency.setValueAtTime(n.osc.frequency.value, t);
      n.osc.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      n.gain.gain.cancelScheduledValues(t);
      n.gain.gain.setValueAtTime(n.gain.gain.value, t);
      n.gain.gain.linearRampToValueAtTime(voiceGain(f), t + 0.05);
    } catch { /* a curve is mid-flight; the next tick retunes anyway */ }
  });
}

const btnSound = document.getElementById('btn-sound');

function setSound(on) {
  if (on && !audio.ac) initAudio();
  audio.on = on;
  if (audio.ac) {
    if (on) audio.ac.resume();
    rampMaster(on ? audio.vol : 0);
  }
  btnSound.textContent = `sound: ${on ? 'on' : 'off'}`;
  btnSound.classList.toggle('active', on);
}

btnSound.addEventListener('click', () => setSound(!audio.on));

// Don't leave a drone running in a backgrounded tab — the visuals freeze there
// anyway, since the clock is driven by requestAnimationFrame.
document.addEventListener('visibilitychange', () => {
  if (!audio.ac) return;
  if (document.hidden) audio.ac.suspend();
  else if (audio.on) audio.ac.resume();
});

// ─── Clock ────────────────────────────────────────────────────────────────────
// One master pulse. A voice steps every `mult` master ticks, so the three run at
// different rates but stay phase-locked — every voice's step lands on a master
// tick, and all three coincide exactly every lcm(mults) ticks.

/** Called once per step of a single voice, after it moves. Readout, then audio. */
function onVoiceTick(v) {
  renderReadout();
  if (!audio.ac || !audio.on) return;
  glideTo(audio.nodes[v.i],
    hzAt(v.prev),
    hzAt(v.next),
    voicePeriod(v) * state.glide / 1000);  // glide is a fraction of this voice's own period
}

let lastFrame = performance.now();

function frame(now) {
  const dt = Math.min(200, now - lastFrame); // clamp so a backgrounded tab does not burst
  lastFrame = now;

  if (state.autoRotate && !dragging) cam.az += 0.09 * dt / 1000;

  if (state.playing) {
    state.acc += dt;
    while (state.acc >= state.masterMs) {
      state.acc -= state.masterMs;
      state.tick++;
      for (const v of voices) {
        if (state.tick % v.mult !== 0) continue;
        v.tick++;
        stepVoice(v);
        onVoiceTick(v);
      }
    }
  }

  drawFrame();
  requestAnimationFrame(frame);
}

// ─── Controls + pointer orbit ─────────────────────────────────────────────────

const btnPlay   = document.getElementById('btn-play');
const btnTrails = document.getElementById('btn-trails');
const btnLabels = document.getElementById('btn-labels');
const btnRotate = document.getElementById('btn-rotate');

function setPlaying(on) {
  state.playing = on;
  btnPlay.textContent = on ? 'pause' : 'play';
  btnPlay.classList.toggle('active', on);
}

btnPlay.addEventListener('click', () => setPlaying(!state.playing));

btnTrails.addEventListener('click', () => {
  state.trails = !state.trails;
  btnTrails.textContent = `trails: ${state.trails ? 'on' : 'off'}`;
  btnTrails.classList.toggle('active', state.trails);
});

btnLabels.addEventListener('click', () => {
  state.labels = !state.labels;
  btnLabels.textContent = `notes: ${state.labels ? 'on' : 'off'}`;
  btnLabels.classList.toggle('active', state.labels);
});

btnRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  btnRotate.textContent = `auto-rotate: ${state.autoRotate ? 'on' : 'off'}`;
  btnRotate.classList.toggle('active', state.autoRotate);
});

document.getElementById('btn-reset-view').addEventListener('click', () => Object.assign(cam, CAM_HOME));
document.getElementById('btn-reseed').addEventListener('click', reseed);

function bindNumber(id, apply) {
  const input = document.getElementById(id);
  input.addEventListener('input', () => {
    const v = parseFloat(input.value);
    if (Number.isFinite(v)) apply(v);
  });
}

bindNumber('cfg-master', v => { state.masterMs = Math.max(60, v); renderReadout(); });
bindNumber('cfg-glide',  v => { state.glide = Math.max(0.01, Math.min(1, v / 100)); });
bindNumber('cfg-transpose', v => {
  tuning.transpose = Math.max(-24, Math.min(24, Math.round(v)));
  renderReadout();
  retune();
});
bindNumber('cfg-offset', v => {
  tuning.offset = Math.round(v);
  renderReadout();
  retune();
});
bindNumber('cfg-vol',   v => {
  audio.vol = Math.max(0, Math.min(1, v / 100));
  if (audio.ac && audio.on) rampMaster(audio.vol);
});

document.addEventListener('keydown', (e) => {
  if (e.code !== 'Space' || e.target.tagName === 'INPUT') return;
  e.preventDefault();
  setPlaying(!state.playing);
});

let dragging = false;
let lastPointer = null;

wrap.addEventListener('pointerdown', (e) => {
  dragging = true;
  lastPointer = { x: e.clientX, y: e.clientY };
  wrap.classList.add('dragging');
  wrap.setPointerCapture(e.pointerId);
});

wrap.addEventListener('pointermove', (e) => {
  if (!dragging) return;
  cam.az -= (e.clientX - lastPointer.x) * 0.008;
  cam.el = Math.max(-1.5, Math.min(1.5, cam.el + (e.clientY - lastPointer.y) * 0.008));
  lastPointer = { x: e.clientX, y: e.clientY };
});

function endDrag(e) {
  if (!dragging) return;
  dragging = false;
  wrap.classList.remove('dragging');
  if (e.pointerId !== undefined && wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
}

wrap.addEventListener('pointerup', endDrag);
wrap.addEventListener('pointercancel', endDrag);

wrap.addEventListener('wheel', (e) => {
  e.preventDefault();
  cam.dist = Math.max(3, Math.min(14, cam.dist * Math.exp(e.deltaY * 0.001)));
}, { passive: false });

window.addEventListener('resize', resize);

// ─── Debug hooks ──────────────────────────────────────────────────────────────
// Console-runnable checks of the walk's invariants and the pitch math.

window.__lattice = {
  state, cam, voices, audio, POINTS, EDGES,
  SCALE, GEN, tuning, degreeAt, midiAt, hzAt, noteName,
  voiceGain, voicePeriod, voicePhase, setMuted,
  latticeSVG, prj, cue,

  audit(n = 500) {
    const errors = [];
    // Simulates the master clock: a voice steps every `mult` ticks. Parity
    // alternates strictly within each voice — 4-adjacency is bipartite — but
    // voices on different multipliers no longer share a parity at a given tick.
    const sim = voices.map(v => ({ plane: v.plane, mult: v.mult, at: [0, 0, 0], parity: 0, alternates: true }));

    for (let t = 1; t <= n; t++) {
      for (const s of sim) {
        if (t % s.mult !== 0) continue;
        const from = s.at;
        const opts = neighbours(s.plane, from);
        const to = opts[Math.floor(Math.random() * opts.length)];
        const delta = [0, 1, 2].map(i => Math.abs(to[i] - from[i]));
        if (delta.reduce((a, b) => a + b, 0) !== 1) errors.push(`t${t} ${s.plane.label}: step is not one unit`);
        if (to[s.plane.fixed] !== 0) errors.push(`t${t} ${s.plane.label}: left its plane`);
        if (to.some(c => c < -1 || c > 1)) errors.push(`t${t} ${s.plane.label}: left the square`);
        s.at = to;

        const parity = ((to[0] + to[1] + to[2]) % 2 + 2) % 2;
        if (parity === s.parity) s.alternates = false;
        s.parity = parity;
      }
    }

    const parityAlternates = sim.every(s => s.alternates);

    // Every note the target set asks for must actually appear on the z=0 plane.
    const onZ0 = [];
    for (let x = -1; x <= 1; x++)
      for (let y = -1; y <= 1; y++) onZ0.push(midiAt([x, y, 0]));
    const missing = SCALE.notes.filter(m => !onZ0.includes(m));
    if (missing.length) errors.push(`z=0 plane is missing scale notes: ${missing.join(', ')}`);

    // A shared axis point must sound the same whichever plane's voice is on it —
    // that is what one global mapping buys, and the origin depends on it.
    for (const p of POINTS) {
      const zeros = p.filter(c => c === 0).length;
      if (zeros < 2) continue;                 // only the axis lines are shared
      const planes = PLANES.filter(pl => p[pl.fixed] === 0);
      const pitches = new Set(planes.map(() => midiAt(p)));
      if (pitches.size !== 1) errors.push(`shared point ${p} has ${pitches.size} pitches`);
    }

    // z must be exactly an octave, since gz equals the table length.
    for (const p of [[0, 0, 0], [1, 0, 0], [0, 1, 0], [-1, -1, 0]]) {
      const up = midiAt([p[0], p[1], p[2] + 1]) - midiAt(p);
      if (up !== SCALE.octave) errors.push(`z step at ${p} is ${up} semitones, want ${SCALE.octave}`);
    }

    const spot = onZ0.map((m, k) => {
      const p = [Math.floor(k / 3) - 1, (k % 3) - 1, 0];
      return `(${p[0]},${p[1]},0) → deg ${degreeAt(p)} → ${m} ${noteName(m)}`;
    });

    return {
      ok: errors.length === 0 && parityAlternates,
      ticks: n,
      points: POINTS.length,
      edges: EDGES.length,
      axisEdges: EDGES.filter(e => e.plane === null).length,
      parityAlternates,
      spotChecks: spot,
      errors,
    };
  },
};

// ─── Init ─────────────────────────────────────────────────────────────────────

resize();
renderReadout();
requestAnimationFrame((t) => { lastFrame = t; frame(t); });
</script>
