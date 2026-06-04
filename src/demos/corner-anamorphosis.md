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
button:disabled { opacity: 0.4; cursor: default; }
button:disabled:hover { background: #fff; }

#plotter {
  margin-top: 10px;
  padding: 8px 12px;
  background: #fff;
  border: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

#plotter-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

#plotter-state {
  font-size: 11px;
  color: #888;
  margin-left: 4px;
}
#plotter-state.running { color: #b07000; }
#plotter-state.done    { color: #2a7a2a; }
#plotter-state.error   { color: #a00; }

#plotter-log {
  font-size: 11px;
  line-height: 1.5;
  color: #444;
  background: #fafafa;
  border: 1px solid #eee;
  padding: 6px 8px;
  max-height: 140px;
  overflow-y: auto;
  white-space: pre-wrap;
  display: none;
}

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
  <label><span>size (mm)</span><input type="number" id="cfg-size"   value="150" min="20"  max="500"  step="5"></label>
  <span class="ctrl-sep">|</span>
  <label><span>dist (mm)</span><input type="number" id="cfg-dist"   value="350" min="50"  max="2000" step="10"></label>
  <label><span>height</span>  <input type="number" id="cfg-height" value="80"  min="0"   max="500"  step="5"></label>
  <label><span>angle °</span> <input type="number" id="cfg-angle"  value="45"  min="5"   max="85"   step="1"></label>
  <span class="ctrl-sep">|</span>
  <button id="btn-corner-mode">corner: in</button>
  <span class="ctrl-sep">|</span>
  <button id="btn-export-a">export Wall A</button>
  <button id="btn-export-b">export Wall B</button>
  <button id="btn-export-floor">export Floor</button>
  <button id="btn-export-json">export JSON</button>
  <span class="ctrl-sep">|</span>
  <button id="btn-plot">plot</button>
  <button id="btn-dry-run">dry run</button>
</div>

<div id="views">
  <div class="view-box">
    <div class="view-title">top-down view</div>
    <svg id="schematic"></svg>
  </div>
  <div class="view-box">
    <div class="view-title">unfolded — A (left) · fold · B (right) · floor (lower-right)</div>
    <svg id="preview"></svg>
  </div>
  <div class="view-box">
    <div class="view-title">3D model &nbsp;<button id="btn-3d-mode">observer</button></div>
    <canvas id="view3d"></canvas>
  </div>
</div>

<div id="plotter">
  <div id="plotter-controls">
    <button id="btn-stop" disabled>stop</button>
    <span id="plotter-state">idle</span>
  </div>
  <div id="plotter-log"></div>
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
//   Corner fold at origin (0,0,0), Z = up.
//   Wall A: plane y=0 (printable surface at x≥0 corner-in, x≤0 corner-out).
//   Wall B: plane x=0 (printable surface at y≥0 corner-in, y≤0 corner-out).
//   Fold line = z-axis (x=0, y=0). Observer always at (+D·cosα, +D·sinα, H).
//   Corner-in cube: x∈[0,S], y∈[0,S], z∈[0,S]. V[0]=(0,0,0) farthest; V[7]=(S,S,S) closest.
//   Corner-out cube: x∈[−S,0], y∈[−S,0], z∈[0,S]. Same topology, negative quadrant.

const cfg = {
  size:     150,    // panel size (mm) — square; cube face exactly fills each panel
  dist:     350,
  height:    80,
  angle:     45,
  cornerOut: false,   // false = concave/room corner; true = convex/box corner
};

function readInputs() {
  cfg.size   = +document.getElementById('cfg-size').value   || 150;
  cfg.dist   = +document.getElementById('cfg-dist').value   || 350;
  cfg.angle  = +document.getElementById('cfg-angle').value  || 45;
  cfg.height = +document.getElementById('cfg-height').value || 80;
}

// ─── Geometry ─────────────────────────────────────────────────────────────────
function getObserver() {
  const rad = cfg.angle * Math.PI / 180;
  // Observer always in positive x,y quadrant. Corner-out cube is in negative quadrant.
  return [cfg.dist * Math.cos(rad), cfg.dist * Math.sin(rad), cfg.height];
}

function getVertices() {
  const S = cfg.size;
  // V[0] = fold corner (farthest from observer) = cube local origin.
  // V[7] = far corner from fold (closest to observer for corner-in).
  // Corner-in: cube in +x,+y; corner-out: cube in -x,-y.
  const sg = cfg.cornerOut ? -1 : 1;
  return [
    [0,    0,    0], // 0: fold corner, floor  ← cube local origin (farthest from observer)
    [sg*S, 0,    0], // 1: Wall A far edge, floor  (on y=0 plane)
    [0,    sg*S, 0], // 2: Wall B far edge, floor  (on x=0 plane)
    [sg*S, sg*S, 0], // 3: far floor corner  (HIDDEN — only on hidden faces)
    [0,    0,    S], // 4: fold corner, top
    [sg*S, 0,    S], // 5: Wall A far edge, top
    [0,    sg*S, S], // 6: Wall B far edge, top
    [sg*S, sg*S, S], // 7: far top corner  (closest to observer)
  ];
}

// [vi, vj, isHidden]
// Hidden edges: the three edges through V[3] (far floor corner).
// V[3] lies only on hidden faces (z=0 bottom, x=S far-x, y=S far-y).
// All other edges lie on at least one visible face (Wall A y=0, Wall B x=0, or top z=S).
const EDGES = [
  [0,1,false],  // fold corner → Wall A far edge, floor
  [0,2,false],  // fold corner → Wall B far edge, floor
  [0,4,false],  // fold corner vertical
  [1,3,true ],  // HIDDEN: Wall A floor → far floor corner
  [1,5,false],  // Wall A vertical
  [2,3,true ],  // HIDDEN: Wall B floor → far floor corner
  [2,6,false],  // Wall B vertical
  [3,7,true ],  // HIDDEN: far floor corner vertical
  [4,5,false],  // top face
  [4,6,false],  // top face
  [5,7,false],  // top face
  [6,7,false],  // top face
];

// ─── Projection ───────────────────────────────────────────────────────────────
// For a point P in the cube, cast a ray from observer O through P.
// The ray hits exactly one wall's inside surface (or the shared corner line).
//
// Wall A (y=0): t_A = oy/(oy−py); u_A = x at intersection. Valid if sg·x_A ≥ 0.
// Wall B (x=0): t_B = ox/(ox−px); u_B = y at intersection. Valid if sg·y_B ≥ 0.
//   sg = +1 corner-in (cube in +x,+y), sg = −1 corner-out (cube in −x,−y).
//
// Returns { wall:'A'|'B'|'corner', u, z }
//   u = distance from fold (always ≥ 0 = |x_A| or |y_B|).

function projectPoint(O, P) {
  const [ox, oy, oz] = O;
  const [px, py, pz] = P;

  let xA, zA, yB, zB;

  // Wall A: y=0 plane
  const dA = oy - py;
  if (Math.abs(dA) < 1e-12) { xA = px; zA = pz; }
  else { const tA = oy / dA; xA = ox + tA * (px - ox); zA = oz + tA * (pz - oz); }

  // Wall B: x=0 plane
  const dB = ox - px;
  if (Math.abs(dB) < 1e-12) { yB = py; zB = pz; }
  else { const tB = ox / dB; yB = oy + tB * (py - oy); zB = oz + tB * (pz - oz); }

  const sg = cfg.cornerOut ? -1 : 1;
  const onA = sg * xA >= -1e-9;
  const onB = sg * yB >= -1e-9;

  if (onA && onB) return { wall: 'corner', uA: Math.abs(xA), uB: Math.abs(yB), z: zA };
  if (onA)        return { wall: 'A', u: Math.abs(xA), z: zA };
  if (onB)        return { wall: 'B', u: Math.abs(yB), z: zB };
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

// ─── Floor projection ─────────────────────────────────────────────────────────
// Projects a 3D point onto the floor plane (z=0). Valid only when observer is
// strictly above the point (oz > pz). Returns [xF, yF] in world space.
// For corner-in: xF ∈ [0,S], yF ∈ [0,S]. For corner-out: xF ∈ [-S,0], yF ∈ [-S,0].

function projectFloorPoint(O, P) {
  const [ox, oy, oz] = O;
  const [px, py, pz] = P;
  if (oz <= pz + 1e-9) return null;
  const tF = oz / (oz - pz);
  return [ox + tF * (px - ox), oy + tF * (py - oy)];
}

// Projects all cube edges onto the floor plane (z=0), clipped to the printable
// tile area [0,S]×[0,S].  When the observer is low (oz < S), only the z=0 face
// edges fall within bounds (they project to themselves, tF=1).  As observer
// height rises above S, top-face rays that would exit the wall panels below z=0
// instead hit the floor within bounds, and those segments appear here.
// Segments are stored as raw world-space [xF, yF] so floorToXY / buildFloorSvg
// can apply the same sg-normalisation they already use.
function computeFloorSegments() {
  const O = getObserver();
  const V = getVertices();
  const [, , oz] = O;
  const S  = cfg.size;
  const sg = cfg.cornerOut ? -1 : 1;
  const segs = [];

  for (const [i, j, hidden] of EDGES) {
    const P1 = V[i], P2 = V[j];
    if (oz <= P1[2] + 1e-9 || oz <= P2[2] + 1e-9) continue;

    const f1 = projectFloorPoint(O, P1);
    const f2 = projectFloorPoint(O, P2);
    if (!f1 || !f2) continue;

    // Clip in normalised [0,S]×[0,S] space (sg turns corner-out negatives positive)
    const clipped = clipLine(sg*f1[0], sg*f1[1], sg*f2[0], sg*f2[1], 0, 0, S, S);
    if (!clipped) continue;
    const [cx1, cy1, cx2, cy2] = clipped;

    // Convert back to raw world coords (sg*normalised = original sign)
    segs.push({ from: [sg*cx1, sg*cy1], to: [sg*cx2, sg*cy2], hidden });
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

// Liang-Barsky 2D line clip against [xmin,ymin]–[xmax,ymax].
// Returns [x1,y1,x2,y2] of the clipped segment, or null if entirely outside.
function clipLine(x1, y1, x2, y2, xmin, ymin, xmax, ymax) {
  const dx = x2 - x1, dy = y2 - y1;
  let tMin = 0, tMax = 1;
  function clip(p, q) {
    if (Math.abs(p) < 1e-12) return q >= -1e-9;
    const r = q / p;
    if (p < 0) { if (r > tMax) return false; if (r > tMin) tMin = r; }
    else        { if (r < tMin) return false; if (r < tMax) tMax = r; }
    return true;
  }
  if (!clip(-dx, x1 - xmin)) return null;
  if (!clip( dx, xmax - x1)) return null;
  if (!clip(-dy, y1 - ymin)) return null;
  if (!clip( dy, ymax - y1)) return null;
  if (tMax <= tMin + 1e-12)  return null;
  return [x1 + tMin*dx, y1 + tMin*dy, x1 + tMax*dx, y1 + tMax*dy];
}

// ─── Preview: unfolded walls ──────────────────────────────────────────────────
const preview  = document.getElementById('preview');
const PSCALE   = 2.2;   // px per mm for preview display
const PPAD     = 24;    // px margin
const FOLDGAP  = 16;    // px gap at fold line

function wallAtoXY(u, z) {
  // u = |x_A| ∈ [0,S]. Fold edge (u=0) at right; far edge (u=S) at left.
  const S = cfg.size;
  return [
    PPAD + (S - u) * PSCALE,
    PPAD + (S - z) * PSCALE,
  ];
}

function wallBtoXY(u, z) {
  // u = |y_B| ∈ [0,S]. Fold edge (u=0) at left; far edge (u=S) at right.
  const S = cfg.size;
  return [
    PPAD + S * PSCALE + FOLDGAP + u * PSCALE,
    PPAD + (S - z) * PSCALE,
  ];
}

function floorToXY(xF, yF) {
  // Floor panel is positioned below Wall B (shares the x=0 fold on its left edge).
  // xF=0 (Wall B fold) at left; xF=S at right. yF=0 (Wall A fold) at top; yF=S at bottom.
  // sg normalises corner-out coords (negative quadrant) into the [0,S] display range.
  const S  = cfg.size;
  const sg = cfg.cornerOut ? -1 : 1;
  return [
    PPAD + S * PSCALE + FOLDGAP + sg * xF * PSCALE,
    PPAD + S * PSCALE + FOLDGAP + sg * yF * PSCALE,
  ];
}

function renderPreview() {
  const S = cfg.size;
  const svgW = PPAD * 2 + S * 2 * PSCALE + FOLDGAP;
  const svgH = PPAD * 2 + S * PSCALE * 2 + FOLDGAP + 16;
  preview.setAttribute('width',  svgW);
  preview.setAttribute('height', svgH);
  preview.innerHTML = '';

  const foldX    = PPAD + S * PSCALE;
  const floorTop = PPAD + S * PSCALE + FOLDGAP;
  const floorLeft = foldX + FOLDGAP;

  // Wall panel backgrounds
  svgEl('rect', { x: PPAD, y: PPAD, width: S * PSCALE, height: S * PSCALE,
    fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1 }, preview);
  svgEl('rect', { x: foldX + FOLDGAP, y: PPAD, width: S * PSCALE, height: S * PSCALE,
    fill: '#fafafa', stroke: '#ccc', 'stroke-width': 1 }, preview);

  // Floor panel background (below Wall B, sharing the x=0 fold on its left edge)
  svgEl('rect', { x: floorLeft, y: floorTop, width: S * PSCALE, height: S * PSCALE,
    fill: '#fdf8f0', stroke: '#ccc', 'stroke-width': 1 }, preview);

  // Fold line (vertical, between Wall A and Wall B)
  svgEl('line', {
    x1: foldX + FOLDGAP / 2, y1: PPAD - 8,
    x2: foldX + FOLDGAP / 2, y2: PPAD + S * PSCALE + 8,
    stroke: '#bbb', 'stroke-width': 1, 'stroke-dasharray': '4,3',
  }, preview);

  const labelAttrs = { 'font-size': 11, 'font-family': 'monospace', fill: '#aaa', 'text-anchor': 'middle' };
  svgTxt(preview, PPAD + S * PSCALE / 2,              PPAD - 8,  'Wall A', labelAttrs);
  svgTxt(preview, foldX + FOLDGAP + S * PSCALE / 2,   PPAD - 8,  'Wall B', labelAttrs);
  svgTxt(preview, foldX + FOLDGAP / 2, PPAD + S * PSCALE + 14,   'fold',
    { ...labelAttrs, 'font-size': 10 });
  svgTxt(preview, floorLeft + S * PSCALE / 2, floorTop - 6, 'Floor', labelAttrs);

  // Draw projected edge segments
  const segs = computeSegments();
  const floorSegs = computeFloorSegments();

  // clip=true clips the segment to [0,S]×[0,S] in its domain (u,z) before
  // converting to screen coords.  Floor segments are pre-clipped by computeFloorSegments.
  function drawSeg(seg, toXY, clip) {
    let from = seg.from, to = seg.to;
    if (clip) {
      const c = clipLine(from[0], from[1], to[0], to[1], 0, 0, S, S);
      if (!c) return;
      from = [c[0], c[1]]; to = [c[2], c[3]];
    }
    const [x1, y1] = toXY(...from);
    const [x2, y2] = toXY(...to);
    const attrs = {
      x1, y1, x2, y2,
      stroke: seg.hidden ? '#ccc' : '#111',
      'stroke-width': seg.hidden ? 0.75 : 1.8,
      'stroke-linecap': 'round',
    };
    if (seg.hidden) attrs['stroke-dasharray'] = '3,2';
    svgEl('line', attrs, preview);
  }

  for (const seg of segs.A)    drawSeg(seg, wallAtoXY, true);
  for (const seg of segs.B)    drawSeg(seg, wallBtoXY, true);
  for (const seg of floorSegs) drawSeg(seg, floorToXY);
}

// ─── Schematic: top-down view ─────────────────────────────────────────────────
const schematic = document.getElementById('schematic');
const SCH_W = 230, SCH_H = 230, SCH_PAD = 20;

function renderSchematic() {
  const S   = cfg.size;
  const rad = cfg.angle * Math.PI / 180;
  // Observer always at positive x,y. Corner-out cube is in negative quadrant.
  const cubeSg = cfg.cornerOut ? -1 : 1;
  const ox  = cfg.dist * Math.cos(rad);
  const oy  = cfg.dist * Math.sin(rad);

  // Bounding box: fit observer, cube footprint, and origin.
  const keyPts = [[ox, oy], [cubeSg*S, 0], [0, cubeSg*S], [cubeSg*S, cubeSg*S], [0, 0]];
  const xs = keyPts.map(p => p[0]);
  const ys = keyPts.map(p => p[1]);
  const pad = S * 0.3;
  const minWX = Math.min(...xs) - pad;
  const maxWX = Math.max(...xs) + pad;
  const minWY = Math.min(...ys) - pad;
  const maxWY = Math.max(...ys) + pad;

  const avail = Math.min(SCH_W, SCH_H) - SCH_PAD * 2;
  const sc = Math.min(avail / (maxWX - minWX), avail / (maxWY - minWY));

  // World origin → screen position
  const px0 = SCH_PAD + (0 - minWX) * sc;
  const py0 = SCH_H - SCH_PAD - (0 - minWY) * sc;

  function w2s(wx, wy) { return [px0 + wx * sc, py0 - wy * sc]; }

  schematic.setAttribute('width',  SCH_W);
  schematic.setAttribute('height', SCH_H);
  schematic.innerHTML = '';

  // Arrowhead markers for axes
  const defs = svgEl('defs', {}, schematic);
  function mkArrow(id, color) {
    const m = svgEl('marker', {
      id, viewBox: '0 0 10 10', refX: 9, refY: 5,
      markerWidth: 6, markerHeight: 6, orient: 'auto',
    }, defs);
    svgEl('path', { d: 'M 0 1 L 9 5 L 0 9 z', fill: color }, m);
  }
  mkArrow('arr-x', '#c44');
  mkArrow('arr-y', '#4a4');

  svgEl('rect', { x: 0, y: 0, width: SCH_W, height: SCH_H, fill: '#fff' }, schematic);

  // Cube footprint
  const cubePoly = [[0,0],[cubeSg*S,0],[cubeSg*S,cubeSg*S],[0,cubeSg*S]]
    .map(([x,y]) => w2s(x,y).join(',')).join(' ');
  svgEl('polygon', {
    points: cubePoly,
    fill: 'rgba(100,150,255,0.15)',
    stroke: 'rgba(100,150,255,0.65)',
    'stroke-width': 1.5,
  }, schematic);

  // Walls: Wall A along cubeSg*x axis (y=0 plane), Wall B along cubeSg*y axis (x=0 plane)
  const wallStyle = { stroke: '#333', 'stroke-width': 2.5, 'stroke-linecap': 'round' };
  const [fcx, fcy] = w2s(0, 0);  // fold corner = cube local origin (0,0,0)
  const [ax, ay] = w2s(cubeSg * S, 0);   // Wall A runs along x-axis (y=0 plane)
  const [bx, by] = w2s(0, cubeSg * S);   // Wall B runs along y-axis (x=0 plane)
  svgEl('line', { x1: fcx, y1: fcy, x2: ax, y2: ay, ...wallStyle }, schematic);
  svgEl('line', { x1: fcx, y1: fcy, x2: bx, y2: by, ...wallStyle }, schematic);

  // Axes: origin at fold corner (cube local origin V[0]=(0,0,0)), pointing toward cube.
  // x-axis toward V[1]=(cubeSg*S,0,0); y-axis toward V[2]=(0,cubeSg*S,0).
  const axWL = S * 0.28;  // axis world-length
  const axLa = { 'font-size': 9, 'font-family': 'monospace', 'font-weight': 'bold' };
  // x-axis: from fold corner toward (cubeSg*axWL, 0)
  const [axx2, axy2] = w2s(cubeSg * axWL, 0);
  svgEl('line', { x1: fcx, y1: fcy, x2: axx2, y2: axy2,
    stroke: '#c44', 'stroke-width': 1, 'stroke-dasharray': '3,2',
    'marker-end': 'url(#arr-x)' }, schematic);
  svgTxt(schematic, axx2 + 3, axy2 + 12, 'x', { ...axLa, fill: '#c44' });
  // y-axis: from fold corner toward (0, cubeSg*axWL)
  const [ayx2, ayy2] = w2s(0, cubeSg * axWL);
  svgEl('line', { x1: fcx, y1: fcy, x2: ayx2, y2: ayy2,
    stroke: '#4a4', 'stroke-width': 1, 'stroke-dasharray': '3,2',
    'marker-end': 'url(#arr-y)' }, schematic);
  svgTxt(schematic, ayx2 - 12, ayy2 - 3, 'y', { ...axLa, fill: '#4a4' });

  // Fold corner dot (cube local origin)
  svgEl('circle', { cx: fcx, cy: fcy, r: 3, fill: '#333' }, schematic);

  // Ray from observer to fold corner
  const [osx, osy] = w2s(ox, oy);
  svgEl('line', {
    x1: osx, y1: osy, x2: fcx, y2: fcy,
    stroke: 'rgba(220,80,80,0.35)', 'stroke-width': 1, 'stroke-dasharray': '5,3',
  }, schematic);

  // Observer
  svgEl('circle', { cx: osx, cy: osy, r: 5, fill: '#e44', stroke: '#b00', 'stroke-width': 1.5 }, schematic);

  // Labels
  const la = { 'font-size': 9, 'font-family': 'monospace', fill: '#666' };
  svgTxt(schematic, osx + 7, osy + 3, 'obs', { ...la, fill: '#b00' });
  svgTxt(schematic, fcx + 4, fcy - 5,  'fold (0,0)', la);

  // Wall labels at midpoints: Wall A on x-axis, Wall B on y-axis
  const [amx, amy] = w2s(cubeSg * S * 0.5, 0);
  svgTxt(schematic, amx, amy + 12, 'A',
    { ...la, 'font-size': 11, 'font-weight': 'bold', 'text-anchor': 'middle' });
  const [bmx, bmy] = w2s(0, cubeSg * S * 0.5);
  svgTxt(schematic, bmx - 9, bmy, 'B',
    { ...la, 'font-size': 11, 'font-weight': 'bold', 'text-anchor': 'end' });
}

// ─── Export ───────────────────────────────────────────────────────────────────
// Export coordinate mapping (same for both walls and both modes):
//   SVG x = |u|        (distance from fold edge; corner at x=0, extends right)
//   SVG y = wallH − z  (floor → y=wallH; top of wall → y=0)
// All values in mm — viewBox matches physical dimensions exactly.

function buildExportSvg(wall) {
  const segs = computeSegments()[wall];
  if (!segs.length) return null;

  const S = cfg.size;
  const ns = 'http://www.w3.org/2000/svg';

  const root = document.createElementNS(ns, 'svg');
  root.setAttribute('xmlns', ns);
  root.setAttribute('width',   `${S}mm`);
  root.setAttribute('height',  `${S}mm`);
  root.setAttribute('viewBox', `0 0 ${S} ${S}`);

  for (const seg of segs) {
    const [u1, z1] = seg.from;
    const [u2, z2] = seg.to;

    // Clip to the panel's printable square in SVG space (x=u, y=S−z)
    const clipped = clipLine(u1, S-z1, u2, S-z2, 0, 0, S, S);
    if (!clipped) continue;
    const [x1, y1, x2, y2] = clipped;

    const lineEl = document.createElementNS(ns, 'line');
    lineEl.setAttribute('x1', x1.toFixed(4));
    lineEl.setAttribute('y1', y1.toFixed(4));
    lineEl.setAttribute('x2', x2.toFixed(4));
    lineEl.setAttribute('y2', y2.toFixed(4));

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

function buildFloorSvg() {
  const segs = computeFloorSegments();
  if (!segs.length) return null;

  const S  = cfg.size;
  const sg = cfg.cornerOut ? -1 : 1;
  const ns = 'http://www.w3.org/2000/svg';

  const root = document.createElementNS(ns, 'svg');
  root.setAttribute('xmlns',   ns);
  root.setAttribute('width',   `${S}mm`);
  root.setAttribute('height',  `${S}mm`);
  root.setAttribute('viewBox', `0 0 ${S} ${S}`);

  for (const seg of segs) {
    const [xF1, yF1] = seg.from;
    const [xF2, yF2] = seg.to;

    const lineEl = document.createElementNS(ns, 'line');
    // sg normalises corner-out (negative-quadrant) coords into the [0,S] export range.
    lineEl.setAttribute('x1', (sg * xF1).toFixed(4));
    lineEl.setAttribute('y1', (sg * yF1).toFixed(4));
    lineEl.setAttribute('x2', (sg * xF2).toFixed(4));
    lineEl.setAttribute('y2', (sg * yF2).toFixed(4));

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

function exportFloor() {
  const svg = buildFloorSvg();
  if (!svg) { alert('Nothing to export — check parameters (eye height must exceed cube height for full floor tile).'); return; }
  const xml = new XMLSerializer().serializeToString(svg);
  download('corner-anamorphosis-floor.svg', xml, 'image/svg+xml');
}

function buildJobJSON() {
  const S  = cfg.size;
  const sg = cfg.cornerOut ? -1 : 1;
  const segs      = computeSegments();
  const floorSegs = computeFloorSegments();

  function clipWallSegs(wallSegs) {
    const out = [];
    for (const seg of wallSegs) {
      const [u1, z1] = seg.from;
      const [u2, z2] = seg.to;
      const c = clipLine(u1, S - z1, u2, S - z2, 0, 0, S, S);
      if (!c) continue;
      out.push({ from: [c[0], c[1]], to: [c[2], c[3]], hidden: seg.hidden });
    }
    return out;
  }

  function normFloorSegs(fs) {
    return fs.map(s => ({
      from:   [sg * s.from[0], sg * s.from[1]],
      to:     [sg * s.to[0],   sg * s.to[1]],
      hidden: s.hidden,
    }));
  }

  const gutter = 20;
  return {
    meta: {
      tool:      'corner-anamorphosis',
      version:   1,
      size:      S,
      dist:      cfg.dist,
      height:    cfg.height,
      angle:     cfg.angle,
      cornerOut: cfg.cornerOut,
    },
    layers: [
      { id: 'wall_a', origin: [gutter,              gutter],              segments: clipWallSegs(segs.A) },
      { id: 'wall_b', origin: [gutter + S + gutter, gutter],              segments: clipWallSegs(segs.B) },
      { id: 'floor',  origin: [gutter + S + gutter, gutter + S + gutter], segments: normFloorSegs(floorSegs) },
    ],
    procedure: {
      passes: [
        { label: 'light',  pen_pos_down: 38, speed_pendown: 25 },
        { label: 'medium', pen_pos_down: 44, speed_pendown: 20 },
        { label: 'dark',   pen_pos_down: 50, speed_pendown: 15 },
      ],
      refill: { enabled: false, dwell_s: 2, strokes_per_dip: 15 },
      pen:    { pos_up: 60, speed_penup: 75 },
    },
  };
}

function exportJSON() {
  download('corner-anamorphosis.json', JSON.stringify(buildJobJSON(), null, 2), 'application/json');
}

// ─── Plotter API ──────────────────────────────────────────────────────────────
const SERVER = 'http://localhost:8765';
let _pollTimer = null;

const elState  = document.getElementById('plotter-state');
const elLog    = document.getElementById('plotter-log');
const btnPlot  = document.getElementById('btn-plot');
const btnDry   = document.getElementById('btn-dry-run');
const btnStop  = document.getElementById('btn-stop');

function setPlotterBusy(busy) {
  btnPlot.disabled = busy;
  btnDry.disabled  = busy;
  btnStop.disabled = !busy;
}

function appendLog(lines) {
  elLog.style.display = 'block';
  elLog.textContent = lines.join('\n');
  elLog.scrollTop = elLog.scrollHeight;
}

function setState(state) {
  elState.textContent = state;
  elState.className   = state;
}

function startPolling(jobId) {
  clearInterval(_pollTimer);
  _pollTimer = setInterval(async () => {
    try {
      const res  = await fetch(`${SERVER}/status/${jobId}`);
      const data = await res.json();
      if (data.log) appendLog(data.log);
      setState(data.state);
      if (data.state === 'done' || data.state === 'error') {
        clearInterval(_pollTimer);
        setPlotterBusy(false);
      }
    } catch {
      // server went away — stop polling
      clearInterval(_pollTimer);
      setState('error');
      setPlotterBusy(false);
    }
  }, 1000);
}

async function plotJob(dryRun) {
  readInputs();
  const job = buildJobJSON();
  elLog.textContent = '';
  setState('sending…');
  setPlotterBusy(true);
  try {
    const res  = await fetch(`${SERVER}/plot?dry_run=${dryRun}`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(job),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || res.statusText);
    }
    const { job_id } = await res.json();
    setState('running');
    startPolling(job_id);
  } catch (err) {
    setState('error');
    appendLog([`Error: ${err.message}`, 'Is the server running?  uvicorn server:app --port 8765']);
    setPlotterBusy(false);
  }
}

async function stopJob() {
  try {
    await fetch(`${SERVER}/stop`, { method: 'POST' });
  } catch { /* ignore */ }
}

// ─── 3D view ──────────────────────────────────────────────────────────────────
// Observer mode: camera at the actual observer position looking at the cube center.
// The marks on the walls (black) should exactly coincide with the cube wireframe
// (blue) when viewed from the correct position — mismatch indicates a bug.
// Overview mode: elevated external view showing the full scene geometry.

const canvas3d = document.getElementById('view3d');
const ctx3d    = canvas3d.getContext('2d');
canvas3d.width  = 280;
canvas3d.height = 280;

function dot3(a, b) { return a[0]*b[0] + a[1]*b[1] + a[2]*b[2]; }
function cross3(a, b) {
  return [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
}
function norm3(a) {
  const l = Math.hypot(a[0], a[1], a[2]);
  return l < 1e-12 ? [1, 0, 0] : [a[0]/l, a[1]/l, a[2]/l];
}

let view3dObserver = true;  // true = from observer position, false = overview

function renderView3D() {
  const W = canvas3d.width, H = canvas3d.height;
  ctx3d.clearRect(0, 0, W, H);
  ctx3d.fillStyle = '#fff';
  ctx3d.fillRect(0, 0, W, H);

  const S = cfg.size;
  const [ox, oy, oz] = getObserver();

  // Camera setup — two distinct perspectives
  let eye, lookAt, fovY;
  if (view3dObserver) {
    // Observer view: stand at the actual observer position.
    // Look at the corner fold at mid-wall height — centering the view between both panels.
    // From this exact position, the printed marks should look like a 3D cube.
    eye    = [ox, oy, oz];
    lookAt = [0, 0, S / 2];
    fovY   = 40;
  } else {
    // Overview: elevated external view, looking at the cube center.
    // Observer always at positive x,y; corner-out cube is in negative quadrant.
    const D = cfg.dist;
    const cubeSg3 = cfg.cornerOut ? -1 : 1;
    eye    = [D * 0.4, D * 0.3, D * 0.85];
    lookAt = [cubeSg3 * S / 2, cubeSg3 * S / 2, S / 2];
    fovY   = 52;
  }

  const fwd   = norm3([lookAt[0]-eye[0], lookAt[1]-eye[1], lookAt[2]-eye[2]]);
  const rRaw  = cross3(fwd, [0, 0, 1]);
  const right = norm3(Math.hypot(rRaw[0], rRaw[1], rRaw[2]) < 1e-6 ? [1,0,0] : rRaw);
  const camUp = cross3(right, fwd);
  const focal = (H / 2) / Math.tan(fovY * Math.PI / 360);

  function prj(p) {
    const d = [p[0]-eye[0], p[1]-eye[1], p[2]-eye[2]];
    const z = dot3(d, fwd);
    if (z <= 0.5) return null;
    return [W/2 + dot3(d,right)*focal/z, H/2 - dot3(d,camUp)*focal/z];
  }
  function ln3(p1, p2, col, lw, dash) {
    const s1=prj(p1), s2=prj(p2); if (!s1||!s2) return;
    ctx3d.beginPath(); ctx3d.moveTo(s1[0],s1[1]); ctx3d.lineTo(s2[0],s2[1]);
    ctx3d.strokeStyle=col; ctx3d.lineWidth=lw||1; ctx3d.setLineDash(dash||[]); ctx3d.stroke();
  }
  function poly3(pts, fill, stk, lw) {
    const sp=pts.map(prj); if (sp.some(p=>!p)) return;
    ctx3d.beginPath(); ctx3d.moveTo(sp[0][0],sp[0][1]);
    for (let i=1;i<sp.length;i++) ctx3d.lineTo(sp[i][0],sp[i][1]);
    ctx3d.closePath();
    if (fill){ctx3d.fillStyle=fill;ctx3d.fill();}
    if (stk){ctx3d.strokeStyle=stk;ctx3d.lineWidth=lw||1;ctx3d.setLineDash([]);ctx3d.stroke();}
  }

  // Wall A: y=0 plane. Wall B: x=0 plane. Floor: z=0 plane. All extend in cubeSg direction.
  const sg3 = cfg.cornerOut ? -1 : 1;
  const wAc = [[0,0,0],[sg3*S,0,0],[sg3*S,0,S],[0,0,S]];
  const wBc = [[0,0,0],[0,sg3*S,0],[0,sg3*S,S],[0,0,S]];
  const wFc = [[0,0,0],[sg3*S,0,0],[sg3*S,sg3*S,0],[0,sg3*S,0]];
  const segs      = computeSegments();
  const floorSegs = computeFloorSegments();
  const V         = getVertices();

  if (view3dObserver) {
    // ── Observer mode ─────────────────────────────────────────────────────────
    // Camera is at the actual observer position. From here, the anamorphic marks
    // on the panels should coalesce into the shape of the virtual cube.
    // Marks are drawn on opaque paper panels; the blue cube sits behind them.
    // If marks and cube edges coincide on screen, the projection is correct.

    // 1. Virtual cube behind panels
    for (const [i,j,hid] of EDGES)
      ln3(V[i], V[j], hid?'rgba(40,80,220,0.2)':'rgba(40,80,220,0.5)',
        hid?0.8:1.4, hid?[4,3]:[]);

    // 2. Opaque panels (simulating physical paper)
    poly3(wFc, '#f5f5ee', '#ccc', 0.6);   // floor first (behind walls from above)
    poly3(wAc, '#f2f2f2', '#ccc', 0.6);
    poly3(wBc, '#f2f2f2', '#ccc', 0.6);

    // 3. Anamorphic marks on panels
    // Wall A: x=sg3*u, y=0, z. Wall B: x=0, y=sg3*u, z. Floor: x=xF, y=yF, z=0.
    for (const s of segs.A)
      ln3([sg3*s.from[0],0,s.from[1]], [sg3*s.to[0],0,s.to[1]],
        s.hidden?'#bbb':'#111', s.hidden?0.7:1.5, s.hidden?[3,2]:[]);
    for (const s of segs.B)
      ln3([0,sg3*s.from[0],s.from[1]], [0,sg3*s.to[0],s.to[1]],
        s.hidden?'#bbb':'#111', s.hidden?0.7:1.5, s.hidden?[3,2]:[]);
    for (const s of floorSegs)
      ln3([s.from[0],s.from[1],0], [s.to[0],s.to[1],0],
        s.hidden?'#bbb':'#111', s.hidden?0.7:1.5, s.hidden?[3,2]:[]);

    ctx3d.font='9px monospace'; ctx3d.fillStyle='#aaa'; ctx3d.setLineDash([]);
    ctx3d.fillText('observer view — marks should read as a cube from this position', 4, H-5);

  } else {
    // ── Overview mode ──────────────────────────────────────────────────────────
    // External vantage point showing the full scene geometry.
    // Cube (blue) and panels are shown; marks not drawn (only meaningful from observer).

    // 1. Virtual cube (prominent)
    for (const [i,j,hid] of EDGES)
      ln3(V[i], V[j], hid?'rgba(40,80,220,0.3)':'rgba(30,70,210,0.88)',
        hid?0.8:2, hid?[4,3]:[]);

    // 2. Semi-transparent panels
    poly3(wFc, 'rgba(255,220,130,0.2)',  '#ccaa55', 0.8);   // floor tile
    poly3(wAc, 'rgba(190,205,255,0.2)', '#8899cc', 0.8);
    poly3(wBc, 'rgba(190,235,205,0.2)', '#88aa99', 0.8);

    // 3. Observer position
    const obsP = prj([ox, oy, oz]);
    if (obsP) {
      ctx3d.beginPath(); ctx3d.arc(obsP[0],obsP[1],5,0,Math.PI*2);
      ctx3d.fillStyle='#e44'; ctx3d.fill();
      ctx3d.font='9px monospace'; ctx3d.fillStyle='#b00'; ctx3d.setLineDash([]);
      ctx3d.fillText('obs', obsP[0]+7, obsP[1]+3);
    }

    ctx3d.font='9px monospace'; ctx3d.fillStyle='#aaa'; ctx3d.setLineDash([]);
    ctx3d.fillText('overview — cube in corner; switch to observer to check marks', 4, H-5);
  }

  // ── Axes (drawn in both modes) ────────────────────────────────────────────────
  // Origin at V[0] (fold corner = cube local origin). Directions from V[0] toward
  // V[1] (world x), V[2] (world y), V[4] (world z = up).
  function axis3(p1, p2, col, label) {
    ln3(p1, p2, col, 1.5, []);
    const sp1 = prj(p1), sp2 = prj(p2); if (!sp1 || !sp2) return;
    const dx = sp2[0]-sp1[0], dy = sp2[1]-sp1[1];
    const len = Math.hypot(dx, dy);
    if (len > 2) {
      const ux = dx/len, uy = dy/len, nx = -uy, ny = ux;
      const aLen = 7, aW = 3;
      ctx3d.beginPath();
      ctx3d.moveTo(sp2[0], sp2[1]);
      ctx3d.lineTo(sp2[0]-ux*aLen + nx*aW, sp2[1]-uy*aLen + ny*aW);
      ctx3d.lineTo(sp2[0]-ux*aLen - nx*aW, sp2[1]-uy*aLen - ny*aW);
      ctx3d.closePath();
      ctx3d.fillStyle = col; ctx3d.setLineDash([]); ctx3d.fill();
    }
    ctx3d.font='bold 9px monospace'; ctx3d.fillStyle=col; ctx3d.setLineDash([]);
    ctx3d.fillText(label, sp2[0]+5, sp2[1]+3);
  }

  // Cube-local axis directions in world space: unit vectors from V[0] toward V[1], V[2], V[4]
  function axDir(from, to, axLen) {
    const dx = to[0]-from[0], dy = to[1]-from[1], dz = to[2]-from[2];
    const l = Math.hypot(dx,dy,dz);
    return [from[0]+dx/l*axLen, from[1]+dy/l*axLen, from[2]+dz/l*axLen];
  }
  const axLen = S * 0.4;
  axis3(V[0], axDir(V[0],V[1],axLen), '#c44', 'x');
  axis3(V[0], axDir(V[0],V[2],axLen), '#4a4', 'y');
  axis3(V[0], axDir(V[0],V[4],axLen), '#44c', 'z');
}

// ─── Wiring ───────────────────────────────────────────────────────────────────
function render() {
  readInputs();
  renderPreview();
  renderSchematic();
  renderView3D();
}

['cfg-size','cfg-dist','cfg-height','cfg-angle']
  .forEach(id => document.getElementById(id).addEventListener('input', render));

const btnCornerMode = document.getElementById('btn-corner-mode');
btnCornerMode.addEventListener('click', () => {
  cfg.cornerOut = !cfg.cornerOut;
  btnCornerMode.textContent = `corner: ${cfg.cornerOut ? 'out' : 'in'}`;
  btnCornerMode.classList.toggle('active', cfg.cornerOut);
  render();
});

document.getElementById('btn-3d-mode').addEventListener('click', () => {
  view3dObserver = !view3dObserver;
  document.getElementById('btn-3d-mode').textContent = view3dObserver ? 'observer' : 'overview';
  renderView3D();
});

document.getElementById('btn-export-a').addEventListener('click', () => exportWall('A'));
document.getElementById('btn-export-b').addEventListener('click', () => exportWall('B'));
document.getElementById('btn-export-floor').addEventListener('click', exportFloor);
document.getElementById('btn-export-json').addEventListener('click', exportJSON);
btnPlot.addEventListener('click', () => plotJob(false));
btnDry.addEventListener('click',  () => plotJob(true));
btnStop.addEventListener('click', stopJob);

render();
</script>
