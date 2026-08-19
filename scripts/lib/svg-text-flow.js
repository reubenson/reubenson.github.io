/**
 * svg-text-flow — pour a block of text into a monospaced character grid,
 * using the filled areas of an SVG as whitespace.
 *
 * The SVG may contain any number of closed forms, and those forms may have
 * holes; every filled region becomes a hole in the text. This is the part CSS
 * can't do: `shape-outside` only attaches to a float, so it can only ever bite
 * into one edge of a column. Here the mask is a grid, so a shape can sit in the
 * middle of the text with words flowing down both sides of it, and a row can be
 * broken into as many separate runs as the drawing calls for.
 *
 * Monospace is what makes this exact. One character is one cell, so the layout
 * is integer arithmetic — nothing has to be measured, and the build-time result
 * is the same as what the browser will draw, provided the CSS uses the same
 * advance width and line height the grid was built from. `toHtml()` emits both
 * as custom properties so the two cannot drift apart.
 *
 * CommonJS on purpose: `.eleventy.js` is CJS and needs to `require()` this
 * synchronously to register a shortcode.
 */

const svgpath = require('svgpath');
const { XMLParser } = require('fast-xml-parser');

// Elements that describe a fillable area. `line` is excluded: it encloses none.
// `polyline` is included because SVG fills it with an implicit closing segment.
const SHAPE_TAGS = new Set(['path', 'rect', 'circle', 'ellipse', 'polygon', 'polyline']);

// Subtrees that are definitions or metadata rather than rendered marks.
const SKIP_TAGS = new Set([
  'defs', 'clipPath', 'mask', 'marker', 'symbol', 'pattern',
  'style', 'title', 'desc', 'metadata', 'filter', 'linearGradient', 'radialGradient',
]);

// ─── SVG → polygons ─────────────────────────────────────────────────────────

function numbers(value) {
  if (value == null) return [];
  return String(value)
    .trim()
    .split(/[\s,]+/)
    .map(Number)
    .filter((n) => !Number.isNaN(n));
}

function num(attrs, name, fallback = 0) {
  const parsed = parseFloat(attrs[name]);
  return Number.isNaN(parsed) ? fallback : parsed;
}

/**
 * Convert a basic shape element to path data, so everything downstream only has
 * to understand paths. Rounded rects and the two arc-based forms are spelled out
 * with `A` commands; `unarc()` turns those into cubics later.
 */
function shapeToPathData(tag, attrs) {
  switch (tag) {
    case 'path':
      return attrs.d || '';

    case 'rect': {
      const x = num(attrs, 'x');
      const y = num(attrs, 'y');
      const w = num(attrs, 'width');
      const h = num(attrs, 'height');
      if (w <= 0 || h <= 0) return '';

      // rx/ry default to each other when only one is given, and clamp to half
      // the corresponding side
      const hasRx = attrs.rx != null && attrs.rx !== 'auto';
      const hasRy = attrs.ry != null && attrs.ry !== 'auto';
      let rx = hasRx ? num(attrs, 'rx') : hasRy ? num(attrs, 'ry') : 0;
      let ry = hasRy ? num(attrs, 'ry') : hasRx ? num(attrs, 'rx') : 0;
      rx = Math.min(Math.max(rx, 0), w / 2);
      ry = Math.min(Math.max(ry, 0), h / 2);

      if (rx === 0 || ry === 0) {
        return `M${x} ${y}H${x + w}V${y + h}H${x}Z`;
      }
      return [
        `M${x + rx} ${y}`,
        `H${x + w - rx}`,
        `A${rx} ${ry} 0 0 1 ${x + w} ${y + ry}`,
        `V${y + h - ry}`,
        `A${rx} ${ry} 0 0 1 ${x + w - rx} ${y + h}`,
        `H${x + rx}`,
        `A${rx} ${ry} 0 0 1 ${x} ${y + h - ry}`,
        `V${y + ry}`,
        `A${rx} ${ry} 0 0 1 ${x + rx} ${y}`,
        'Z',
      ].join('');
    }

    case 'circle':
    case 'ellipse': {
      const cx = num(attrs, 'cx');
      const cy = num(attrs, 'cy');
      const rx = tag === 'circle' ? num(attrs, 'r') : num(attrs, 'rx');
      const ry = tag === 'circle' ? num(attrs, 'r') : num(attrs, 'ry');
      if (rx <= 0 || ry <= 0) return '';
      // two half-turn arcs; a single arc to the same point would be degenerate
      return (
        `M${cx - rx} ${cy}` +
        `A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}` +
        `A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}Z`
      );
    }

    case 'polygon':
    case 'polyline': {
      const pts = numbers(attrs.points);
      if (pts.length < 6) return '';
      let d = `M${pts[0]} ${pts[1]}`;
      for (let i = 2; i + 1 < pts.length; i += 2) d += `L${pts[i]} ${pts[i + 1]}`;
      return `${d}Z`;
    }

    default:
      return '';
  }
}

function flattenCubic(out, x0, y0, x1, y1, x2, y2, x3, y3, tolerance) {
  // Subdivide by control-polygon length. It overestimates the true arc length,
  // which errs toward more segments — the safe direction.
  const hull =
    Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(x3 - x2, y3 - y2);
  const steps = Math.min(Math.max(Math.ceil(hull / tolerance), 2), 128);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
      u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
    ]);
  }
}

function flattenQuadratic(out, x0, y0, x1, y1, x2, y2, tolerance) {
  const hull = Math.hypot(x1 - x0, y1 - y0) + Math.hypot(x2 - x1, y2 - y1);
  const steps = Math.min(Math.max(Math.ceil(hull / tolerance), 2), 128);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    out.push([
      u * u * x0 + 2 * u * t * x1 + t * t * x2,
      u * u * y0 + 2 * u * t * y1 + t * t * y2,
    ]);
  }
}

/**
 * Path data (plus any inherited transform) to a list of closed polygons in user
 * space. Subpaths are kept separate and returned together, because a shape's
 * holes live in its sibling subpaths and only mean anything when the fill rule
 * is applied across the whole set.
 */
function pathToPolygons(pathData, transform, tolerance) {
  let path = svgpath(pathData);
  if (transform) path = path.transform(transform);
  // after these three, only M L H V C Q Z remain
  path = path.unarc().unshort().abs();

  const polygons = [];
  let current = null;
  let startX = 0;
  let startY = 0;
  let x = 0;
  let y = 0;

  const finish = () => {
    if (current && current.length >= 3) polygons.push(current);
    current = null;
  };

  path.iterate((seg) => {
    const cmd = seg[0];
    switch (cmd) {
      case 'M':
        finish();
        x = seg[1];
        y = seg[2];
        startX = x;
        startY = y;
        current = [[x, y]];
        break;
      case 'L':
        x = seg[1];
        y = seg[2];
        if (current) current.push([x, y]);
        break;
      case 'H':
        x = seg[1];
        if (current) current.push([x, y]);
        break;
      case 'V':
        y = seg[1];
        if (current) current.push([x, y]);
        break;
      case 'C':
        if (current) flattenCubic(current, x, y, seg[1], seg[2], seg[3], seg[4], seg[5], seg[6], tolerance);
        x = seg[5];
        y = seg[6];
        break;
      case 'Q':
        if (current) flattenQuadratic(current, x, y, seg[1], seg[2], seg[3], seg[4], tolerance);
        x = seg[3];
        y = seg[4];
        break;
      case 'Z':
        finish();
        x = startX;
        y = startY;
        break;
      default:
        break;
    }
  });

  // an unclosed final subpath still fills, as if closed
  finish();
  return polygons;
}

/**
 * Walk the SVG, accumulating ancestor transforms, and collect every fillable
 * region. Returns `{ viewBox, shapes, warnings }` where each shape is
 * `{ polygons, fillRule }`.
 *
 * Presentation attributes other than `fill="none"`, `display="none"` and
 * `fill-rule` are ignored: for a mask the only question is which regions are
 * enclosed, not what color they are. That also means CSS-class-based fills (what
 * Illustrator emits) don't need resolving.
 */
function parseSvg(source, { toleranceFor = () => 0.25 } = {}) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '',
    preserveOrder: true,
    allowBooleanAttributes: true,
  });
  const tree = parser.parse(source);

  const warnings = [];

  // The flattening tolerance is a distance in user units, so the coordinate
  // system has to be known before any curve is subdivided. Hence a first pass
  // for the root <svg> element, and only then the walk that builds geometry.
  const root = tree.find((node) => Object.prototype.hasOwnProperty.call(node, 'svg'));
  if (!root) throw new Error('no <svg> element found');

  const rootAttrs = root[':@'] || {};
  let viewBox = null;
  const vb = numbers(rootAttrs.viewBox);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
    viewBox = { x: vb[0], y: vb[1], width: vb[2], height: vb[3] };
  } else {
    const w = parseFloat(rootAttrs.width);
    const h = parseFloat(rootAttrs.height);
    if (w > 0 && h > 0) viewBox = { x: 0, y: 0, width: w, height: h };
  }
  if (!viewBox) {
    throw new Error('SVG has neither a viewBox nor width/height, so it has no coordinate system');
  }

  const tolerance = toleranceFor(viewBox);
  const shapes = [];

  const walk = (nodes, transform, inheritedFillRule) => {
    for (const node of nodes) {
      const tag = Object.keys(node).find((k) => k !== ':@');
      if (!tag || tag === '#text') continue;
      if (SKIP_TAGS.has(tag)) continue;

      const attrs = node[':@'] || {};
      if (attrs.display === 'none') continue;

      const combined = attrs.transform ? `${transform} ${attrs.transform}`.trim() : transform;
      const fillRule = attrs['fill-rule'] || inheritedFillRule;

      if (tag === 'use') {
        warnings.push('<use> is not resolved; flatten or expand it in your editor');
        continue;
      }

      if (SHAPE_TAGS.has(tag)) {
        if (attrs.fill === 'none') continue;
        const d = shapeToPathData(tag, attrs);
        if (!d) continue;
        const polygons = pathToPolygons(d, combined, tolerance);
        if (polygons.length) shapes.push({ polygons, fillRule });
        continue;
      }

      // <svg>, <g>, <a>, anything else that can hold children
      if (Array.isArray(node[tag])) walk(node[tag], combined, fillRule);
    }
  };

  walk(tree, '', 'nonzero');

  if (!shapes.length) {
    warnings.push('no fillable shapes found — the mask is empty and text will fill the whole grid');
  }

  return { viewBox, shapes, warnings };
}

// ─── polygons → occupancy grid ──────────────────────────────────────────────

/**
 * The x-intervals of one shape that a horizontal scanline passes through.
 *
 * Scanlines rather than point-sampling: a scanline gives *exact* horizontal
 * coverage for the whole row at once, so per-cell coverage needs no sampling in
 * x at all, and only `superSample` sub-rows in y. It's also where the fill rule
 * lives, which is how holes and overlapping forms come out right.
 */
function scanShape(shape, y) {
  const crossings = [];

  for (const polygon of shape.polygons) {
    for (let i = 0; i < polygon.length; i++) {
      const [x0, y0] = polygon[i];
      const [x1, y1] = polygon[(i + 1) % polygon.length]; // wrap: implicit close
      if (y0 === y1) continue; // horizontal edges never cross a scanline

      // half-open test [ymin, ymax) so a vertex shared by two edges is counted
      // exactly once
      let dir;
      if (y0 <= y && y < y1) dir = 1;
      else if (y1 <= y && y < y0) dir = -1;
      else continue;

      crossings.push({ x: x0 + ((y - y0) / (y1 - y0)) * (x1 - x0), dir });
    }
  }

  if (crossings.length < 2) return [];
  crossings.sort((a, b) => a.x - b.x);

  const intervals = [];
  if (shape.fillRule === 'evenodd') {
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      intervals.push([crossings[i].x, crossings[i + 1].x]);
    }
  } else {
    let winding = 0;
    for (let i = 0; i < crossings.length - 1; i++) {
      winding += crossings[i].dir;
      if (winding !== 0) intervals.push([crossings[i].x, crossings[i + 1].x]);
    }
  }
  return intervals;
}

function mergeIntervals(intervals) {
  if (intervals.length < 2) return intervals;
  intervals.sort((a, b) => a[0] - b[0]);
  const merged = [intervals[0].slice()];
  for (let i = 1; i < intervals.length; i++) {
    const last = merged[merged.length - 1];
    if (intervals[i][0] <= last[1]) last[1] = Math.max(last[1], intervals[i][1]);
    else merged.push(intervals[i].slice());
  }
  return merged;
}

/**
 * Rasterize the shapes to a `cols × rows` boolean grid.
 *
 * `threshold` is the fraction of a cell that must be covered for that cell to
 * count as masked — the same knob as CSS `shape-image-threshold`. Lower values
 * grow the whitespace, higher values let text crowd the outline.
 */
function buildMask({ shapes, viewBox, cols, rows, superSample = 4, threshold = 0.5 }) {
  const cellW = viewBox.width / cols;
  const cellH = viewBox.height / rows;
  const mask = new Uint8Array(cols * rows);

  for (let row = 0; row < rows; row++) {
    const coverage = new Float64Array(cols);

    for (let s = 0; s < superSample; s++) {
      const y = viewBox.y + (row + (s + 0.5) / superSample) * cellH;

      const intervals = mergeIntervals(shapes.flatMap((shape) => scanShape(shape, y)));
      if (!intervals.length) continue;

      for (const [ix0, ix1] of intervals) {
        // only touch the cells this interval actually overlaps
        const first = Math.max(0, Math.floor((ix0 - viewBox.x) / cellW));
        const last = Math.min(cols - 1, Math.ceil((ix1 - viewBox.x) / cellW) - 1);
        for (let col = first; col <= last; col++) {
          const cx0 = viewBox.x + col * cellW;
          const overlap = Math.min(ix1, cx0 + cellW) - Math.max(ix0, cx0);
          if (overlap > 0) coverage[col] += Math.min(1, overlap / cellW);
        }
      }
    }

    for (let col = 0; col < cols; col++) {
      // The epsilon is not cosmetic. Along the top and bottom edge of a form,
      // whole rows of cells land on exactly the threshold — e.g. two of four
      // sub-rows fully covered is exactly 0.5 — and `overlap / cellW` for a cell
      // the interval completely spans evaluates to 0.9999999999 or to 1.0
      // depending on the column's coordinates. Comparing that knife edge
      // directly makes those rows come out ragged in a way that follows nothing
      // in the drawing, and makes the output depend on the viewBox origin.
      if (coverage[col] / superSample >= threshold - 1e-9) mask[row * cols + col] = 1;
    }
  }

  return mask;
}

/**
 * Rows of the grid to a flat, reading-order list of runs of unmasked cells.
 *
 * A row can yield several runs — that is the whole point, and the reason this
 * isn't a CSS float. Runs shorter than `minRun` are dropped: a two-character
 * gap between two forms can't hold a word, and filling it with fragments reads
 * as noise rather than text.
 */
function findRuns(mask, cols, rows, minRun = 3) {
  const runs = [];
  for (let row = 0; row < rows; row++) {
    let start = -1;
    for (let col = 0; col <= cols; col++) {
      const free = col < cols && mask[row * cols + col] === 0;
      if (free && start === -1) start = col;
      else if (!free && start !== -1) {
        if (col - start >= minRun) runs.push({ row, col: start, width: col - start });
        start = -1;
      }
    }
  }
  return runs;
}

// ─── text → runs ────────────────────────────────────────────────────────────

function tokenize(text, { paragraphBreaks = true } = {}) {
  const paragraphs = paragraphBreaks ? text.split(/\n[ \t]*\n+/) : [text];
  return paragraphs
    .map((p) => p.trim().split(/\s+/).filter(Boolean))
    .filter((words) => words.length);
}

/**
 * Greedily pack words into the runs, in reading order.
 *
 * Greedy, not Knuth–Plass. The runs vary in width, which is exactly the case
 * where optimal breaking pays off, and `tex-linebreak` would take this run-width
 * list directly. But greedy is legible and debuggable, and in a shaped block the
 * ragged fill is part of the texture rather than a defect — so it's the right
 * starting point, and the seam to swap is this function alone.
 */
function flowText(
  runs,
  paragraphs,
  { justify = true, repeat = false, hyphenChar = '-', paragraphBreaks = true } = {}
) {
  const placements = [];
  const total = paragraphs.reduce((n, p) => n + p.length, 0);
  if (!total) {
    return { placements, placed: 0, total: 0, runsUsed: 0, runsTotal: runs.length, loops: 0, exhausted: true };
  }

  let para = 0;
  let word = 0;
  // Tail of a word broken across two runs. Held here rather than written back
  // into `paragraphs`: the caller owns that array, and with `repeat` on, a
  // write-back would corrupt the source for every later pass.
  let remainder = null;
  let placed = 0;
  let loops = 0;
  // Row whose remaining runs are surrendered to a paragraph break.
  let skipRow = null;

  for (const run of runs) {
    if (skipRow !== null) {
      if (run.row === skipRow) continue;
      skipRow = null;
    }

    if (para >= paragraphs.length) {
      if (!repeat) break;
      para = 0;
      word = 0;
      remainder = null;
      loops++;
    }

    const words = paragraphs[para];
    const peek = () => (remainder !== null ? remainder : word < words.length ? words[word] : null);
    const take = () => {
      if (remainder !== null) remainder = null;
      else word++;
    };

    const line = [];
    let length = 0;

    for (;;) {
      const next = peek();
      if (next === null) break;

      const cost = length === 0 ? next.length : length + 1 + next.length;
      if (cost <= run.width) {
        line.push(next);
        length = cost;
        take();
        placed++;
        continue;
      }

      // Doesn't fit, but something is already set: leave it for the next run.
      if (length > 0) break;

      // Doesn't fit an *empty* run, so no run will ever take it whole. Break it
      // and carry the tail, otherwise the word stalls the flow forever.
      if (run.width < hyphenChar.length + 2) break;
      const headLength = run.width - hyphenChar.length;
      line.push(next.slice(0, headLength) + hyphenChar);
      length = run.width;
      take();
      remainder = next.slice(headLength);
      break;
    }

    if (!line.length) continue;

    const endsParagraph = remainder === null && word >= words.length;
    if (endsParagraph) {
      para++;
      word = 0;
      // Give up the rest of this row so the next paragraph starts on a fresh one.
      if (paragraphBreaks) skipRow = run.row;
    }

    // A paragraph's last line is set flush, not justified — the same rule as
    // `text-align-last`. Without it, a three-word closing line stretched across
    // a wide run reads as a mistake rather than as an edge of the drawing.
    const text =
      justify && line.length > 1 && length < run.width && !endsParagraph
        ? justifyLine(line, run.width)
        : line.join(' ');

    placements.push({ row: run.row, col: run.col, text });
  }

  return {
    placements,
    placed,
    total,
    runsUsed: placements.length,
    runsTotal: runs.length,
    loops,
    exhausted: para >= paragraphs.length,
  };
}

/**
 * Spread the slack across the gaps so the line fills its run exactly, which is
 * what makes the silhouette of the mask read as a hard edge on both sides.
 * Extra spaces go to the rightmost gaps first — the convention in metal type,
 * and it keeps the left of the line evenly set.
 */
function justifyLine(words, width) {
  const gaps = words.length - 1;
  const slack = width - words.reduce((n, w) => n + w.length, 0);
  const base = Math.floor(slack / gaps);
  let extra = slack % gaps;

  let out = words[0];
  for (let i = 1; i < words.length; i++) {
    const pad = base + (i > gaps - extra ? 1 : 0);
    out += ' '.repeat(pad) + words[i];
  }
  return out;
}

// ─── render ─────────────────────────────────────────────────────────────────

function renderGrid(placements, cols, rows) {
  const grid = Array.from({ length: rows }, () => new Array(cols).fill(' '));
  for (const { row, col, text } of placements) {
    for (let i = 0; i < text.length && col + i < cols; i++) {
      grid[row][col + i] = text[i];
    }
  }
  // Every line keeps its full width. Trimming would leave fully-masked rows
  // empty, and a blank line inside the emitted HTML would end markdown-it's
  // HTML block and hand the rest of the shape to the markdown parser.
  return grid.map((row) => row.join(''));
}

const escapeHtml = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// ─── public API ─────────────────────────────────────────────────────────────

/**
 * Pour `text` into the negative space of `svg`.
 *
 * @param {object}  options
 * @param {string}  options.svg          SVG source.
 * @param {string}  options.text         Text to flow. Blank lines start a new grid row.
 * @param {number} [options.cols=72]     Grid width in characters. The one number to tune.
 * @param {number} [options.rows]        Grid height in lines. Defaults to whatever
 *                                       preserves the SVG's aspect ratio.
 * @param {number} [options.advance=0.6] Advance width of the monospace font, in em.
 *                                       Courier New is exactly 0.6.
 * @param {number} [options.lineHeight=1.15] Line height as a multiple of font size.
 * @param {number} [options.threshold=0.5]   Cell coverage needed to count as masked.
 * @param {number} [options.superSample=4]   Sub-rows sampled per cell in y.
 * @param {number} [options.minRun=3]    Shortest run of free cells that may hold text.
 * @param {boolean}[options.invert=false] Flow text *inside* the shapes instead.
 * @param {boolean}[options.justify=true] Pad gaps so each line fills its run exactly.
 * @param {boolean}[options.repeat=false] Loop the text until the grid is full.
 * @returns {{lines: string[], cols: number, rows: number, stats: object, warnings: string[]}}
 */
function flowTextIntoSvg(options) {
  const {
    svg,
    text,
    cols = 72,
    rows: explicitRows,
    advance = 0.6,
    lineHeight = 1.15,
    threshold = 0.5,
    superSample = 4,
    minRun = 3,
    invert = false,
    justify = true,
    repeat = false,
    paragraphBreaks = true,
  } = options;

  if (!svg) throw new Error('flowTextIntoSvg: `svg` source is required');
  if (cols < 1) throw new Error('flowTextIntoSvg: `cols` must be at least 1');

  // A cell is `advance` wide and `lineHeight` tall in em, so it is not square.
  // Deriving rows from that ratio is what keeps a circle in the SVG from coming
  // out as an ellipse on the page.
  const { viewBox, shapes, warnings } = parseSvg(svg, {
    // subdivide curves to about a quarter of a cell — finer than the grid can
    // resolve, so flattening is never the limiting factor
    toleranceFor: (vb) => Math.max(vb.width / cols / 4, 1e-6),
  });

  const cellAspect = advance / lineHeight;
  const rows =
    explicitRows ||
    Math.max(1, Math.round((viewBox.height / viewBox.width) * cols * cellAspect));

  const mask = buildMask({ shapes, viewBox, cols, rows, superSample, threshold });
  if (invert) for (let i = 0; i < mask.length; i++) mask[i] = mask[i] ? 0 : 1;

  const runs = findRuns(mask, cols, rows, minRun);
  const paragraphs = tokenize(text || '', { paragraphBreaks });
  const flow = flowText(runs, paragraphs, { justify, repeat, paragraphBreaks });
  const lines = renderGrid(flow.placements, cols, rows);

  const allWarnings = [...warnings];
  if (!flow.total) {
    // nothing to report about fit; --mask runs legitimately pass no text
  } else if (!flow.exhausted && !repeat) {
    allWarnings.push(
      `text did not fit: ${flow.total - flow.placed} of ${flow.total} words were dropped — ` +
        'raise `cols`, add `rows`, or lower `threshold`'
    );
  } else if (flow.exhausted && flow.runsUsed < flow.runsTotal && !repeat) {
    allWarnings.push(
      `text ran out with ${flow.runsTotal - flow.runsUsed} of ${flow.runsTotal} runs still empty — ` +
        'lower `cols` or set `repeat: true`'
    );
  }

  return {
    lines,
    cols,
    rows,
    mask,
    viewBox,
    advance,
    lineHeight,
    stats: {
      wordsPlaced: flow.placed,
      wordsTotal: flow.total,
      runsUsed: flow.runsUsed,
      runsTotal: flow.runsTotal,
      // `wordsTotal` counts one pass through the source; with `repeat` on,
      // `wordsPlaced` can legitimately exceed it
      loops: flow.loops,
      shapes: shapes.length,
    },
    warnings: allWarnings,
  };
}

/**
 * Wrap a result as HTML for the page.
 *
 * The shaped block is decorative typography, so it's hidden from assistive
 * technology and the unbroken prose is carried alongside it — a screen reader
 * that read the grid would get the text sliced into fragments by the mask.
 *
 * The grid geometry is emitted as custom properties so the stylesheet computes
 * its font size from the same `cols`/`advance`/`lineHeight` the mask was built
 * with. Get those out of step and the drawing skews.
 */
function toHtml(result, { className = 'shaped-text', text, maxFontSize = '15px' } = {}) {
  const vars = [
    `--shaped-text-cols:${result.cols}`,
    `--shaped-text-advance:${result.advance}`,
    `--shaped-text-line-height:${result.lineHeight}`,
    `--shaped-text-max-size:${maxFontSize}`,
  ].join(';');

  const body = result.lines.map(escapeHtml).join('\n');
  const alt = text ? `\n<p class="visually-hidden">${escapeHtml(text.trim())}</p>` : '';

  return `<div class="${className}" style="${vars}">\n<pre aria-hidden="true">${body}</pre>${alt}\n</div>`;
}

module.exports = {
  flowTextIntoSvg,
  toHtml,
  // exported for tests and for swapping the line breaker
  parseSvg,
  buildMask,
  findRuns,
  flowText,
  renderGrid,
};
