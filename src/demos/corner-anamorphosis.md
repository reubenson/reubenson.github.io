---
layout: demo.njk
title: Corner Anamorphosis
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

#main-container { max-width: 900px; margin: 0 auto; }

#controls {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 14px;
  align-items: center;
  margin-bottom: 12px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #ddd;
}

.ctrl-sep { color: #ddd; padding: 0 2px; }

label {
  display: flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: #333;
}

label span { color: #888; }

input[type=number] {
  width: 56px;
  font-family: monospace;
  font-size: 12px;
  padding: 3px 5px;
  border: 1px solid #bbb;
}

#views {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.view-box {
  border: 1px solid #ccc;
  background: #fff;
  flex-shrink: 0;
}

.view-title {
  font-size: 11px;
  color: #777;
  padding: 4px 8px;
  border-bottom: 1px solid #eee;
  background: #fafafa;
}

button {
  font-family: monospace;
  font-size: 12px;
  padding: 3px 10px;
  cursor: pointer;
  border: 1px solid #999;
  background: #fff;
}

button:hover { background: #f0f0f0; }
button.active { background: #222; color: #fff; border-color: #222; }

#info {
  margin-top: 10px;
  font-size: 11px;
  color: #888;
  line-height: 1.6;
}

svg { display: block; }
</style>

<div id="main-container">

<div id="controls">
  <label><span>cube (mm)</span><input type="number" id="cfg-cube"   value="50"  min="10"  max="200"  step="5"></label>
  <span class="ctrl-sep">|</span>
  <label><span>dist (mm)</span><input type="number" id="cfg-dist"   value="350" min="50"  max="2000" step="10"></label>
  <label><span>height</span>  <input type="number" id="cfg-height" value="80"  min="0"   max="500"  step="5"></label>
  <label><span>angle °</span> <input type="number" id="cfg-angle"  value="45"  min="5"   max="85"   step="1"></label>
  <span class="ctrl-sep">|</span>
  <label><span>wall W</span>  <input type="number" id="cfg-wall-w" value="130" min="50"  max="500"  step="5"></label>
  <label><span>wall H</span>  <input type="number" id="cfg-wall-h" value="180" min="50"  max="500"  step="5"></label>
  <span class="ctrl-sep">|</span>
  <button id="btn-corner-mode">corner: in</button>
  <span class="ctrl-sep">|</span>
  <button id="btn-export-a">export Wall A</button>
  <button id="btn-export-b">export Wall B</button>
</div>

<div id="views">
  <div class="view-box">
    <div class="view-title">top-down view</div>
    <svg id="schematic"></svg>
  </div>
  <div class="view-box">
    <div class="view-title">unfolded walls — A (left) · fold · B (right)</div>
    <svg id="preview"></svg>
  </div>
</div>

<div id="info">
  Angle° is the observer's horizontal angle from the x-axis (45° = symmetric between walls).
  <b>corner: in</b> — fold points toward observer (inside room corner, concave).
  <b>corner: out</b> — fold points away from observer (outside box corner, convex).
  When exported and folded at the center line, the drawings create the illusion of a cube
  viewed from the specified position.
</div>

</div>

<script>
// ─── State ────────────────────────────────────────────────────────────────────
// Coordinate system:
//   Corner at origin (0,0,0), Z = up
//   Wall A: plane x=0. Corner-in: printable surface at y ≤ 0. Corner-out: y ≥ 0.
//   Wall B: plane y=0. Corner-in: printable surface at x ≤ 0. Corner-out: x ≥ 0.
//   Virtual cube: x∈[−S,0], y∈[−S,0], z∈[0,S]   (same in both modes)
//   Observer: (D·cosα, D·sinα, H)                 in the +x,+y quadrant

const cfg = {
  cubeSize:  50,
  dist:     350,
  height:    80,
  angle:     45,
  wallW:    130,
  wallH:    180,
  cornerOut: false,   // false = concave/room corner; true = convex/box corner
};

function readInputs() {
  cfg.cubeSize = +document.getElementById('cfg-cube').value   || 50;
  cfg.dist     = +document.getElementById('cfg-dist').value   || 350;
  cfg.height   = +document.getElementById('cfg-height').value || 80;
  cfg.angle    = +document.getElementById('cfg-angle').value  || 45;
  cfg.wallW    = +document.getElementById('cfg-wall-w').value || 130;
  cfg.wallH    = +document.getElementById('cfg-wall-h').value || 180;
}

// ─── Geometry ─────────────────────────────────────────────────────────────────
function getObserver() {
  const rad = cfg.angle * Math.PI / 180;
  return [cfg.dist * Math.cos(rad), cfg.dist * Math.sin(rad), cfg.height];
}

function getVertices() {
  const S = cfg.cubeSize;
  return [
    [ 0,  0,  0],  // 0: corner, floor
    [-S,  0,  0],  // 1: Wall-B edge, floor
    [ 0, -S,  0],  // 2: Wall-A edge, floor
    [-S, -S,  0],  // 3: far corner, floor
    [ 0,  0,  S],  // 4: corner, top
    [-S,  0,  S],  // 5: Wall-B edge, top
    [ 0, -S,  S],  // 6: Wall-A edge, top
    [-S, -S,  S],  // 7: far corner, top
  ];
}

// [vi, vj, isHidden]
const EDGES = [
  [0,1,false],  // Wall-B face, floor
  [0,2,false],  // Wall-A face, floor
  [0,4,false],  // corner vertical line
  [1,3,true ],  // hidden
  [1,5,false],  // Wall-B face, vertical
  [2,3,true ],  // hidden
  [2,6,false],  // Wall-A face, vertical
  [3,7,true ],  // hidden far vertical
  [4,5,false],  // top face
  [4,6,false],  // top face
  [5,7,false],  // top face
  [6,7,false],  // top face
];

// ─── Projection ───────────────────────────────────────────────────────────────
// For a point P in the cube, cast a ray from observer O through P.
// The ray hits exactly one wall's inside surface (or the shared corner line).
//
// Wall-A (x=0): t_A = ox/(ox−px); valid if resulting y ≤ 0
// Wall-B (y=0): t_B = oy/(oy−py); valid if resulting x ≤ 0
//
// These conditions are mutually exclusive for any cube point (proven analytically).
//
// Returns { wall:'A'|'B'|'corner', u, z }
//   Wall-A: u = world-y (≤0), z = world-z
//   Wall-B: u = world-x (≤0), z = world-z
//   corner: uA, uB (≈0), z

function projectPoint(O, P) {
  const [ox, oy, oz] = O;
  const [px, py, pz] = P;

  let yA, zA, xB, zB;

  const dA = ox - px;
  if (Math.abs(dA) < 1e-12) { yA = py; zA = pz; }
  else { const tA = ox / dA; yA = oy + tA * (py - oy); zA = oz + tA * (pz - oz); }

  const dB = oy - py;
  if (Math.abs(dB) < 1e-12) { xB = px; zB = pz; }
  else { const tB = oy / dB; xB = ox + tB * (px - ox); zB = oz + tB * (pz - oz); }

  // Corner-in:  project onto the wall whose printable surface the ray hits (y≤0 / x≤0).
  // Corner-out: the ray extends past the cube; hits the far (observer-side) surface (y≥0 / x≥0).
  const onA = cfg.cornerOut ? (yA >= -1e-9) : (yA <= 1e-9);
  const onB = cfg.cornerOut ? (xB >= -1e-9) : (xB <= 1e-9);

  if (onA && onB) return { wall: 'corner', uA: yA, uB: xB, z: zA };
  if (onA)        return { wall: 'A', u: yA, z: zA };
  if (onB)        return { wall: 'B', u: xB, z: zB };
  return null;
}

// Returns s ∈ (0,1) where the projection of the edge P1→P2 switches walls.
// Switch condition: py(s)·ox = oy·px(s)
function edgeSplitS(O, P1, P2) {
  const [ox, oy] = O;
  const denom = (P2[1] - P1[1]) * ox - oy * (P2[0] - P1[0]);
  if (Math.abs(denom) < 1e-10) return null;
  const s = (oy * P1[0] - P1[1] * ox) / denom;
  return (s > 1e-9 && s < 1 - 1e-9) ? s : null;
}

function lerp3(A, B, s) {
  return [A[0] + s * (B[0] - A[0]), A[1] + s * (B[1] - A[1]), A[2] + s * (B[2] - A[2])];
}

function getUZ(proj, preferWall) {
  if (proj.wall === 'corner') {
    return preferWall === 'B' ? [proj.uB, proj.z] : [proj.uA, proj.z];
  }
  return [proj.u, proj.z];
}

// Returns [{wall:'A'|'B', from:[u,z], to:[u,z], hidden}, ...]
function projectEdge(O, V, edgeDef) {
  const [i, j, hidden] = edgeDef;
  const P1 = V[i], P2 = V[j];
  const pr1 = projectPoint(O, P1);
  const pr2 = projectPoint(O, P2);
  if (!pr1 || !pr2) return [];

  const w1 = pr1.wall, w2 = pr2.wall;

  if (w1 === 'corner' && w2 === 'corner') {
    // Edge along corner line — draw on both walls at u=0
    return [
      { wall: 'A', from: [pr1.uA, pr1.z], to: [pr2.uA, pr2.z], hidden },
      { wall: 'B', from: [pr1.uB, pr1.z], to: [pr2.uB, pr2.z], hidden },
    ];
  }
  if (w1 === 'corner') {
    return [{ wall: w2, from: getUZ(pr1, w2), to: [pr2.u, pr2.z], hidden }];
  }
  if (w2 === 'corner') {
    return [{ wall: w1, from: [pr1.u, pr1.z], to: getUZ(pr2, w1), hidden }];
  }
  if (w1 === w2) {
    return [{ wall: w1, from: [pr1.u, pr1.z], to: [pr2.u, pr2.z], hidden }];
  }

  // Different walls — find the split point
  const s = edgeSplitS(O, P1, P2);
  if (s === null) {
    return [{ wall: w1, from: [pr1.u, pr1.z], to: [pr1.u, pr1.z], hidden }];
  }

  const Pm  = lerp3(P1, P2, s);
  const prm = projectPoint(O, Pm);
  const mA  = prm ? getUZ(prm, 'A') : [0, Pm[2]];
  const mB  = prm ? getUZ(prm, 'B') : [0, Pm[2]];

  return w1 === 'A'
    ? [{ wall: 'A', from: [pr1.u, pr1.z], to: mA, hidden },
       { wall: 'B', from: mB, to: [pr2.u, pr2.z], hidden }]
    : [{ wall: 'B', from: [pr1.u, pr1.z], to: mB, hidden },
       { wall: 'A', from: mA, to: [pr2.u, pr2.z], hidden }];
}

function computeSegments() {
  const O = getObserver();
  const V = getVertices();
  const segs = { A: [], B: [] };
  for (const e of EDGES) {
    for (const seg of projectEdge(O, V, e)) segs[seg.wall].push(seg);
  }
  return segs;
}

// ─── SVG helpers ──────────────────────────────────────────────────────────────
function svgEl(tag, attrs, parent) {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (parent) parent.appendChild(e);
  return e;
}

function svgTxt(parent, x, y, content, attrs) {
  const t = svgEl('text', { x, y, ...attrs }, parent);
  t.textContent = content;
  return t;
}

// ─── Preview: unfolded walls ──────────────────────────────────────────────────
const preview  = document.getElementById('preview');
const PSCALE   = 2.2;   // px per mm for preview display
const PPAD     = 24;    // px margin
const FOLDGAP  = 16;    // px gap at fold line

function wallAtoXY(u, z) {
  // Corner-in: u ≤ 0.  Corner-out: u ≥ 0.
  // Both: corner at right edge (u=0 → x = wallW*PSCALE), far end at left edge.
  const d = Math.abs(u);
  return [
    PPAD + (cfg.wallW - d) * PSCALE,
    PPAD + (cfg.wallH - z) * PSCALE,
  ];
}

function wallBtoXY(u, z) {
  // Both modes: corner at left edge (u=0 → x = wallW*PSCALE + FOLDGAP), extends right.
  const d = Math.abs(u);
  return [
    PPAD + cfg.wallW * PSCALE + FOLDGAP + d * PSCALE,
    PPAD + (cfg.wallH - z) * PSCALE,
  ];
}

function renderPreview() {
  const { wallW, wallH } = cfg;
  const svgW = PPAD * 2 + wallW * 2 * PSCALE + FOLDGAP;
  const svgH = PPAD * 2 + wallH * PSCALE + 16;
  preview.setAttribute('width',  svgW);
  preview.setAttribute('height', svgH);
  preview.innerHTML = '';

  const foldX = PPAD + wallW * PSCALE;

  // Wall panel backgrounds
  svgEl('rect', { x: PPAD, y: PPAD, width: wallW * PSCALE, height: wallH * PSCALE,
    fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1 }, preview);
  svgEl('rect', { x: foldX + FOLDGAP, y: PPAD, width: wallW * PSCALE, height: wallH * PSCALE,
    fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1 }, preview);

  // Fold line
  svgEl('line', {
    x1: foldX + FOLDGAP / 2, y1: PPAD - 8,
    x2: foldX + FOLDGAP / 2, y2: PPAD + wallH * PSCALE + 8,
    stroke: '#bbb', 'stroke-width': 1, 'stroke-dasharray': '4,3',
  }, preview);

  const labelAttrs = { 'font-size': 11, 'font-family': 'monospace', fill: '#aaa', 'text-anchor': 'middle' };
  svgTxt(preview, PPAD + wallW * PSCALE / 2,         PPAD - 8, 'Wall A',  labelAttrs);
  svgTxt(preview, foldX + FOLDGAP + wallW * PSCALE / 2, PPAD - 8, 'Wall B', labelAttrs);
  svgTxt(preview, foldX + FOLDGAP / 2, PPAD + wallH * PSCALE + 14, 'fold',
    { ...labelAttrs, 'font-size': 10 });

  // Draw projected edge segments
  const segs = computeSegments();

  function drawSeg(seg, toXY) {
    const [x1, y1] = toXY(...seg.from);
    const [x2, y2] = toXY(...seg.to);
    const attrs = {
      x1, y1, x2, y2,
      stroke: seg.hidden ? '#ccc' : '#111',
      'stroke-width': seg.hidden ? 0.75 : 1.8,
      'stroke-linecap': 'round',
    };
    if (seg.hidden) attrs['stroke-dasharray'] = '3,2';
    svgEl('line', attrs, preview);
  }

  for (const seg of segs.A) drawSeg(seg, wallAtoXY);
  for (const seg of segs.B) drawSeg(seg, wallBtoXY);
}

// ─── Schematic: top-down view ─────────────────────────────────────────────────
const schematic = document.getElementById('schematic');
const SCH_W = 230, SCH_H = 230, SCH_PAD = 20;

function renderSchematic() {
  const S   = cfg.cubeSize;
  const W   = cfg.wallW;
  const rad = cfg.angle * Math.PI / 180;
  const ox  = cfg.dist * Math.cos(rad);
  const oy  = cfg.dist * Math.sin(rad);

  // Wall directions differ by mode:
  //   corner-in:  walls extend away from observer (−x, −y)
  //   corner-out: walls extend toward observer (+x, +y)
  const wallSign = cfg.cornerOut ? 1 : -1;

  // Bounding box in world XY (top-down)
  const margin = 1.15;
  const cubeExtent = S * 1.1;
  const wallExtent = W * 1.1;

  // The cube is always in the negative quadrant; walls go in wallSign direction.
  const minWX = cfg.cornerOut
    ? -cubeExtent
    : Math.min(-wallExtent, -cubeExtent);
  const maxWX = cfg.cornerOut
    ? Math.max(ox * margin, wallExtent)
    : ox * margin;
  const minWY = cfg.cornerOut
    ? -cubeExtent
    : Math.min(-wallExtent, -cubeExtent);
  const maxWY = cfg.cornerOut
    ? Math.max(oy * margin, wallExtent)
    : oy * margin;

  const avail = Math.min(SCH_W, SCH_H) - SCH_PAD * 2;
  const sc = Math.min(avail / (maxWX - minWX), avail / (maxWY - minWY));

  // World origin → screen position
  const px0 = SCH_PAD + (0 - minWX) * sc;
  const py0 = SCH_H - SCH_PAD - (0 - minWY) * sc;

  function w2s(wx, wy) { return [px0 + wx * sc, py0 - wy * sc]; }

  schematic.setAttribute('width',  SCH_W);
  schematic.setAttribute('height', SCH_H);
  schematic.innerHTML = '';

  svgEl('rect', { x: 0, y: 0, width: SCH_W, height: SCH_H, fill: '#fff' }, schematic);

  // Cube footprint (always in negative quadrant)
  const cubePoly = [[0,0],[-S,0],[-S,-S],[0,-S]]
    .map(([x,y]) => w2s(x,y).join(',')).join(' ');
  svgEl('polygon', {
    points: cubePoly,
    fill: 'rgba(100,150,255,0.15)',
    stroke: 'rgba(100,150,255,0.65)',
    'stroke-width': 1.5,
  }, schematic);

  // Walls (direction depends on mode)
  const wallStyle = { stroke: '#333', 'stroke-width': 2.5, 'stroke-linecap': 'round' };
  const [cx, cy] = w2s(0, 0);

  const [bx, by] = w2s(wallSign * W, 0);   // Wall B: extends in +x (out) or −x (in)
  svgEl('line', { x1: cx, y1: cy, x2: bx, y2: by, ...wallStyle }, schematic);

  const [ax, ay] = w2s(0, wallSign * W);   // Wall A: extends in +y (out) or −y (in)
  svgEl('line', { x1: cx, y1: cy, x2: ax, y2: ay, ...wallStyle }, schematic);

  // Corner dot
  svgEl('circle', { cx, cy, r: 3, fill: '#333' }, schematic);

  // Ray from observer to corner
  const [osx, osy] = w2s(ox, oy);
  svgEl('line', {
    x1: osx, y1: osy, x2: cx, y2: cy,
    stroke: 'rgba(220,80,80,0.35)', 'stroke-width': 1, 'stroke-dasharray': '5,3',
  }, schematic);

  // Observer
  svgEl('circle', { cx: osx, cy: osy, r: 5, fill: '#e44', stroke: '#b00', 'stroke-width': 1.5 }, schematic);

  // Labels
  const la = { 'font-size': 9, 'font-family': 'monospace', fill: '#666' };
  svgTxt(schematic, osx + 8, osy + 3, 'obs', { ...la, fill: '#b00' });
  svgTxt(schematic, cx + 4,  cy - 5,  '(0,0)', la);

  // Wall labels at midpoints
  const [amx, amy] = w2s(0, wallSign * W * 0.5);
  const aOff = cfg.cornerOut ? 9 : -9;
  svgTxt(schematic, amx + aOff, amy, 'A',
    { ...la, 'font-size': 11, 'font-weight': 'bold', 'text-anchor': cfg.cornerOut ? 'start' : 'end' });

  const [bmx, bmy] = w2s(wallSign * W * 0.5, 0);
  svgTxt(schematic, bmx, bmy - 8, 'B',
    { ...la, 'font-size': 11, 'font-weight': 'bold', 'text-anchor': 'middle' });
}

// ─── Export ───────────────────────────────────────────────────────────────────
// Export coordinate mapping (same for both walls and both modes):
//   SVG x = |u|        (distance from fold edge; corner at x=0, extends right)
//   SVG y = wallH − z  (floor → y=wallH; top of wall → y=0)
// All values in mm — viewBox matches physical dimensions exactly.

function buildExportSvg(wall) {
  const segs = computeSegments()[wall];
  if (!segs.length) return null;

  const { wallW, wallH } = cfg;
  const ns = 'http://www.w3.org/2000/svg';

  const root = document.createElementNS(ns, 'svg');
  root.setAttribute('xmlns', ns);
  root.setAttribute('width',   `${wallW}mm`);
  root.setAttribute('height',  `${wallH}mm`);
  root.setAttribute('viewBox', `0 0 ${wallW} ${wallH}`);

  for (const seg of segs) {
    const [u1, z1] = seg.from;
    const [u2, z2] = seg.to;

    const x1 = Math.abs(u1).toFixed(4);
    const y1 = (wallH - z1).toFixed(4);
    const x2 = Math.abs(u2).toFixed(4);
    const y2 = (wallH - z2).toFixed(4);

    const lineEl = document.createElementNS(ns, 'line');
    lineEl.setAttribute('x1', x1);
    lineEl.setAttribute('y1', y1);
    lineEl.setAttribute('x2', x2);
    lineEl.setAttribute('y2', y2);

    if (seg.hidden) {
      lineEl.setAttribute('style',
        'fill:none;stroke:#000;stroke-width:0.15;stroke-linecap:round;stroke-dasharray:0.8,0.6');
    } else {
      lineEl.setAttribute('style',
        'fill:none;stroke:#000;stroke-width:0.3;stroke-linecap:round');
    }

    root.appendChild(lineEl);
  }

  return root;
}

function download(filename, content, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type: mime }));
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function exportWall(wall) {
  const svg = buildExportSvg(wall);
  if (!svg) { alert('Nothing to export — check parameters.'); return; }
  const xml = new XMLSerializer().serializeToString(svg);
  download(`corner-anamorphosis-wall-${wall.toLowerCase()}.svg`, xml, 'image/svg+xml');
}

// ─── Wiring ───────────────────────────────────────────────────────────────────
function render() {
  readInputs();
  renderPreview();
  renderSchematic();
}

['cfg-cube','cfg-dist','cfg-height','cfg-angle','cfg-wall-w','cfg-wall-h']
  .forEach(id => document.getElementById(id).addEventListener('input', render));

const btnCornerMode = document.getElementById('btn-corner-mode');
btnCornerMode.addEventListener('click', () => {
  cfg.cornerOut = !cfg.cornerOut;
  btnCornerMode.textContent = `corner: ${cfg.cornerOut ? 'out' : 'in'}`;
  btnCornerMode.classList.toggle('active', cfg.cornerOut);
  render();
});

document.getElementById('btn-export-a').addEventListener('click', () => exportWall('A'));
document.getElementById('btn-export-b').addEventListener('click', () => exportWall('B'));

render();
</script>
