# Corner Anamorphosis — Notes

## Goal

Generate SVG drawings for two wall panels and a floor tile that, when physically
arranged into a 90° corner and viewed from a specific observer position, create
the illusion of a 3D cube sitting in the corner. The tool supports two modes
corresponding to whether the fold ridge faces toward or away from the observer.


## Modes

### Corner-in (concave — default)
The fold ridge points **away** from the observer (into the room corner).
The observer stands in front of the corner; the cube appears to sit in it.

- Physical setup: print all three panels, place wall panels vertically at 90°
  with printed surfaces facing the observer, floor tile flat between them.
- Wall A: y=0 plane, printed surface at x ≥ 0 (facing observer).
- Wall B: x=0 plane, printed surface at y ≥ 0 (facing observer).
- Floor: z=0 plane, printed surface at z = 0 (face up).
- Cube in positive x,y,z octant.

### Corner-out (convex)
The fold ridge points **toward** the observer, like the outside corner of a
box or column. Both panels tilt toward the observer when folded.

- Physical setup: fold so the printed surfaces face outward (tent/ridge shape),
  and stand in front of the ridge.
- Wall A: y=0 plane, printed surface at x ≤ 0.
- Wall B: x=0 plane, printed surface at y ≤ 0.
- Cube in negative x,y octant.


## Coordinate System

```
         Z (up)
         |
         |   cube
         |  /
    B    | /        observer
   (x=0) |/____________________
         fold     A (y=0)

Fold line = z-axis (x=0, y=0). Origin = fold corner at floor level.

Wall A  — the y=0 plane (vertical plane containing Z and X axes)
Wall B  — the x=0 plane (vertical plane containing Z and Y axes)
Floor   — the z=0 plane (horizontal, between the two wall bases)

Corner-in:  cube occupies x∈[0,S], y∈[0,S], z∈[0,S]
Corner-out: cube occupies x∈[−S,0], y∈[−S,0], z∈[0,S]

Observer: O = (+D·cos α, +D·sin α, H)   always in the +x,+y quadrant
  D     — horizontal distance from fold corner (mm)
  α     — angle from the x-axis (45° = symmetric between the two walls)
  H     — eye height above floor (mm)
```

V[0]=(0,0,0) is the fold corner — farthest from observer. V[7]=(S,S,S) (corner-in)
is the cube vertex closest to observer.


## Projection Math

For each 3D point P = (px, py, pz) on the cube, cast a ray from observer O
through P and find where it hits the printable surface of each wall.

**Intersection with Wall A (plane y=0):**
```
t_A = oy / (oy − py)
x_A = ox + t_A · (px − ox)
z_A = oz + t_A · (pz − oz)
```
Valid for corner-in if x_A ≥ 0; valid for corner-out if x_A ≤ 0.

**Intersection with Wall B (plane x=0):**
```
t_B = ox / (ox − px)
y_B = oy + t_B · (py − oy)
z_B = oz + t_B · (pz − oz)
```
Valid for corner-in if y_B ≥ 0; valid for corner-out if y_B ≤ 0.

**Mutual exclusivity:** For cube points in the same quadrant as the validity
region, the two conditions are mutually exclusive. The boundary where a point
maps exactly to the fold edge is:

```
oy · px = ox · py   ⟺   py/px = oy/ox
```

The wall assignment flips between modes at this same boundary, so the edge-split
formula is mode-independent.


## Edge Splitting

For a cube edge P1 → P2 whose two endpoints project onto different walls, find
the parametric value s ∈ (0,1) at which the projection crosses the corner fold:

```
P(s) = P1 + s·(P2 − P1)

Condition: oy·px(s) = ox·py(s)

s = (oy·P1x − P1y·ox) / ((P2y−P1y)·ox − oy·(P2x−P1x))
```

The edge is then split at P(s), with each half drawn on its respective wall.


## Wall Coordinate System (2D)

Each wall's 2D coordinate is expressed as (u, z):
- `u` = distance from the fold edge. Wall A: u = |x_A|. Wall B: u = |y_B|.
  Always ≥ 0. Fold edge at u=0; far edge at u=S.
- `z` = height above floor (world-z, always ≥ 0).

The same rendering code handles both corner-in and corner-out without branching
because u is always returned as an absolute value.


## Panel Bounds and Clipping

All three panels are S×S squares. Projected segments must be clipped to their
respective panel's printable area before rendering or export.

**Wall panels** clip in SVG space (x=u, y=S−z) to [0,S]×[0,S].

**Observer height effects on wall projections:**
The wall intersection height z_A for a cube point (px, py, pz) satisfies:

```
z_A = oz·(1 − t_A) + t_A·pz   where t_A = oy/(oy − py)
```

For vertex V[7]=(S,S,S) (the far top corner, t_A ≈ oy/(oy−S)):

```
z_A = S·(oy − H) / (oy − S)
```

- H = S:  z_A = S  (projection at wall top — just within bounds)
- H = oy: z_A = 0  (projection at floor level — threshold)
- H > oy: z_A < 0  (projection below floor — clipped; mark moves to floor tile)

So as H rises above oy (the observer's y-distance, ~D·sin α), top-face
projections exit through the wall's floor edge and those ray segments instead
appear on the floor tile.

**Floor tile** clips in normalised [0,S]×[0,S] space (sg·xF, sg·yF where
sg = −1 for corner-out). All 12 edges are tested; Liang-Barsky clipping retains
only the portion within the tile bounds.

Clipping is implemented with a shared `clipLine(x1,y1,x2,y2,xmin,ymin,xmax,ymax)`
function (Liang-Barsky algorithm) used by both wall export and floor projection.


## Floor Projection Math

The floor tile receives the projection of cube geometry onto the z=0 plane.

**Intersection with Floor (plane z=0):**
```
t_F = oz / (oz − pz)
x_F = ox + t_F · (px − ox)
y_F = oy + t_F · (py − oy)
```
Valid when `oz > pz` (observer above the cube point, so t_F > 1).

**Which edges appear on the floor tile** depends on observer height H:

- H < S: only the four z=0 face edges project within bounds. They project to
  their own positions (t_F=1 when pz=0), forming a plain square outline on
  the floor tile. Two sides solid ([0,1], [0,2]), two sides dashed ([1,3], [2,3]).

- H > oy: top-face edges whose wall projections fall below z=0 now hit the
  floor tile within [0,S]×[0,S]. For example at H=400, S=150, D=350, α=45°:
  - Edge [5,7]: floor segment at x≈91.8 from y=0 to y≈91.8
  - Edge [6,7]: floor segment at y≈91.8 from x=0 to x≈91.8
  - Edge [3,7]: floor segment from (S,S) to (≈91.8,≈91.8) (hidden)

The floor tile's 2D coordinates are (x_F, y_F) directly — no folding needed.
For corner-in: x_F ∈ [0,S] and y_F ∈ [0,S]. The Wall B fold is at x_F=0;
the Wall A fold is at y_F=0.

Corner-out coords are normalised via `sg·xF` and `sg·yF` (sg=−1) to map the
negative-quadrant projections into the same [0,S]×[0,S] export range.


## Export SVG Format

### Walls (A and B)

Each wall exported as an independent SVG:

```
width  = S mm
height = S mm
viewBox = "0 0 S S"

Fold edge at SVG x=0 (left edge).
Far edge at SVG x=S (right edge).
Floor (z=0) at SVG y=S (bottom).
Top of wall (z=S) at SVG y=0.

SVG x = u   (= |x_A| for Wall A, |y_B| for Wall B)
SVG y = S − z
```

Segments are clipped to [0,S]×[0,S] before writing. No line ever exits the
viewBox in the exported file.

### Floor Tile

```
width  = S mm
height = S mm
viewBox = "0 0 S S"

Wall B fold (x_F=0) at SVG x=0 (left edge).
Far x (x_F=S) at SVG x=S (right edge).
Wall A fold (y_F=0) at SVG y=0 (top edge).
Far y (y_F=S) at SVG y=S (bottom edge).

SVG x = sg · x_F   (sg=+1 corner-in, sg=−1 corner-out)
SVG y = sg · y_F
```

Visible edges: `stroke-width:0.3`, solid.
Hidden edges:  `stroke-width:0.15`, dashed `0.8,0.6` mm.

Stroke widths are chosen for pen plotters (≈0.3–0.4mm pen tip).


## Cube Geometry

8 vertices (S = cube side length, corner-in — negate x,y for corner-out):

| Index | x | y | z | Location                        |
|-------|---|---|---|---------------------------------|
| 0     | 0 | 0 | 0 | Fold corner, floor (origin)     |
| 1     | S | 0 | 0 | Wall A far edge, floor          |
| 2     | 0 | S | 0 | Wall B far edge, floor          |
| 3     | S | S | 0 | Far floor corner (HIDDEN)       |
| 4     | 0 | 0 | S | Fold corner, top                |
| 5     | S | 0 | S | Wall A far edge, top            |
| 6     | 0 | S | S | Wall B far edge, top            |
| 7     | S | S | S | Far top corner (closest to obs) |

12 edges. Hidden edges connect through V[3]=(S,S,0), which lies only on hidden
faces (bottom z=0, far-x x=S, far-y y=S). Hidden: [1,3], [2,3], [3,7].

Visible faces from observer at (ox>0, oy>0, oz>0):
- Wall A face: y=0 plane — receives Wall A projection
- Wall B face: x=0 plane — receives Wall B projection
- Top face: z=S plane — split between Wall A and Wall B at fold
- Floor face: z=0 plane — receives Floor projection (observer must be above)


## Implementation

Self-contained 11ty markdown file (`corner-anamorphosis.md`). No external
dependencies. All geometry computed in vanilla JavaScript. SVG elements created
with `createElementNS`.

The page hosts two projects in a shared layout: a left sidebar (Corner / Paint)
switches the visible content area; the plotter controls at the bottom are shared.

### Corner project — key functions
- `getObserver()` — returns O = (+D·cosα, +D·sinα, H)
- `getVertices()` — returns 8 cube vertices (sign-flipped for corner-out)
- `projectPoint(O, P)` — projects a 3D point onto Wall A (y=0) or Wall B (x=0)
- `edgeSplitS(O, P1, P2)` — finds the split parameter for a cross-wall edge
- `projectEdge(O, V, edge)` — returns wall segments for one cube edge
- `computeSegments()` — collects all wall-projected segments by wall (A, B)
- `projectFloorPoint(O, P)` — projects a 3D point onto the floor (z=0)
- `computeFloorSegments()` — projects all 12 edges onto the floor, clipped to [0,S]×[0,S]
- `clipLine(x1,y1,x2,y2,xmin,ymin,xmax,ymax)` — Liang-Barsky 2D segment clip
- `buildCornerJobJSON()` — assembles the full plotter job object (layers + procedure);
  shared by `exportJSON()` and `plotJob()`
- `buildExportSvg(wall)` — constructs the clipped export SVG for one wall panel
- `buildFloorSvg()` — constructs the export SVG for the floor tile
- `renderPreview()` — draws the unfolded three-panel preview in the page
- `renderSchematic()` — draws the top-down scene diagram
- `renderView3D()` — draws the 3D model (observer and overview modes)

### Shared plotter functions
- `plotJob(dryRun, project)` — builds the appropriate job JSON for the active
  project, POSTs it to the local server, then polls for status
- `setPlotterBusy(busy)` — disables/enables all `.plot-btn` elements across
  both projects so only one job can run at a time
- `stopJob()` — sends `POST /stop` to the local server


## Paint Project

Import any SVG and produce a plotter job JSON that dips the brush between each
path. Intended for watercolor or ink painting with the AxiDraw.

### How it works

1. User loads an SVG file. It is parsed with `DOMParser` and inserted into a
   hidden `#paint-hidden` div so the browser's SVG geometry API is available.
2. All `<path>` elements with non-zero length are collected. Other element types
   (circles, rects, etc.) are ignored — convert them to paths in your SVG editor
   first if needed.
3. Each path is sampled into exactly N equal-arc-length line segments using
   `SVGPathElement.getPointAtLength()`. This linearises curves. Parent `<g
   transform="...">` attributes are applied via `pathToSVGMatrix()` (walks the
   DOM using `SVGTransformList` so it works even on `display:none` elements and
   returns a native `SVGMatrix` compatible with `SVGPoint.matrixTransform()`).
4. Each path becomes its own **layer** in the output JSON, with all N segments
   sharing the same `origin` offset.
5. `strokes_per_dip` is set to N. Because `plot.py` flattens layers
   sequentially before chunking, each layer's N segments form one chunk — so the
   arm dips exactly once between every path (in strokes mode).

### Controls

| Control | Meaning |
|---------|---------|
| `width (mm)` | Physical width of the SVG in mm. Used to derive the scale factor from the SVG's `viewBox` width. |
| `origin x/y` | Plotter-space offset (mm from home) shared by all layers. |
| `segs/path` | Number of line segments N per path. More = smoother curves; also sets `strokes_per_dip`. |
| `dip mode` | Toggle between **strokes** (dip after every N segments) and **travel** (dip after a pen-down distance threshold). |
| `travel (mm)` | Cumulative pen-down distance (mm) between dips. Only visible in travel mode. |
| `pen down` | `pen_pos_down` for the draw pass (0–100 axicli units). |
| `speed` | `speed_pendown` for the draw pass. |
| `well x/y` | Position of the paint well on the plotter bed (mm from home). |
| `dip down` | `pen_pos_down` used when dipping into the well. |
| `dwell (s)` | Seconds the brush holds in the well per dip (soak time). |

### Output JSON structure

```json
{
  "meta":   { "tool": "paint", "version": 1, "widthMm": 100, "segsPerPath": 50 },
  "layers": [
    { "id": "path_0", "origin": [20, 20], "segments": [ ... 50 segments ... ] },
    { "id": "path_1", "origin": [20, 20], "segments": [ ... 50 segments ... ] }
  ],
  "procedure": {
    "passes":  [{ "label": "draw", "pen_pos_down": 44, "speed_pendown": 20 }],
    "refill":  {
      "enabled":         true,
      "mode":            "strokes",
      "dwell_s":         2,
      "strokes_per_dip": 50,
      "travel_mm":       500,
      "start_with_dip":  true,
      "well": { "x": 10, "y": 10, "pen_pos_down": 55 }
    },
    "pen":     { "pos_up": 60, "speed_penup": 75 }
  }
}
```

The single draw pass plots all visible segments (no hidden-line pass). Pass the
JSON directly to `plot.py`; no additional flags are needed for dipping.


## Interactive Calibration (plot.py)

Run with `--calibrate` to position the drawing origin and set pen-down height
before plotting, or `--calibrate-only` to calibrate without plotting.

```bash
python plot.py job.json --calibrate
python plot.py job.json --calibrate-only
python plot.py job.json --calibrate --dry-run   # print commands, no hardware
```

**Keymap (terminal must be in foreground):**

| Key | Action |
|-----|--------|
| `w` / `s` | Move plotter up / down (Y axis) |
| `a` / `d` | Move plotter left / right (X axis) |
| `[` / `]` | Raise / lower pen (decrease / increase `pen_pos_down`) |
| `+` / `-` | Double / halve XY step size |
| `t` | Test pen: dip at current position and raise |
| `Enter` / `q` | Accept calibration and continue |
| `Ctrl-C` | Abort |

The status line shows current position offset, `pen_pos_down`, and step size,
updating after every keypress.

**What the calibrated values do:**

- XY offset — added to every layer origin in the job JSON before plotting.
  Position the head where you want the drawing origin to be, then accept.
- `pen_pos_down` override — replaces the value in every pass. Start from the
  job JSON default and adjust until the test dip leaves the right mark depth.

**Implementation notes:**

- XY movement uses `axicli --mode=manual --manual_cmd=walk_x/walk_y`. These
  commands move the physical head but do **not** update axicli's internal
  position state between invocations — each axicli call starts fresh at (0,0).
- The pen test exploits this: it sends an SVG with a 0.1 mm segment at absolute
  coordinate (0,0). Because axicli always thinks it's at (0,0), no travel is
  commanded — the pen dips right where the head physically is.
- The terminal is held in raw mode (`tty.setraw`) for the entire session so
  single-byte keypresses register immediately. Raw mode is temporarily restored
  around each subprocess call so axicli's own I/O works correctly, then
  re-applied before the next read.


## Automatic Brush Dipping (plot.py)

When `refill.enabled` is true, `plot.py` automatically drives the arm to a paint
well between segment chunks — no manual intervention or keyboard press required.

**How it works:** `dip_at_well()` generates a minimal SVG containing a short
back-and-forth polyline at the well's XY position and calls axicli on it. The arm
travels to the well (pen up), lowers the pen to the dip depth (pen down), sweeps
20 mm twice to load the brush, holds for `dwell_s` seconds, then raises. The main
job resumes from wherever the arm happens to be next.

**Dip modes:**

| `mode` | Trigger |
|--------|---------|
| `"strokes"` (default) | Dip after every `strokes_per_dip` segments. |
| `"travel"` | Dip after `travel_mm` of cumulative pen-down distance. `strokes_per_dip` is ignored. |

Travel mode is useful when strokes vary greatly in length — it keeps ink load
consistent regardless of segment count.

`start_with_dip: true` causes a dip before the very first chunk (brush is loaded
at the start of the job). Set to `false` to skip the initial dip.

**Job JSON — refill block:**
```json
"refill": {
  "enabled":         true,
  "mode":            "travel",
  "dwell_s":         2,
  "strokes_per_dip": 50,
  "travel_mm":       400,
  "start_with_dip":  true,
  "well": {
    "x":            10,
    "y":            10,
    "pen_pos_down": 55
  }
}
```

- `x`, `y` — well position in mm from plotter home. Place the physical paint well
  at this location on the bed before starting the job.
- `pen_pos_down` — dip depth (0–100 axicli units), set independently from the draw
  depth so you can control how far into the well the brush descends.
- `dwell_s` — seconds to hold the pen down at the well (soak time).
- `strokes_per_dip` — segments per chunk (strokes mode only).
- `travel_mm` — pen-down mm per chunk (travel mode only).


## Local Server (Plotter Integration)

The webapp can drive the AxiDraw directly via a local FastAPI server running
alongside the 11ty dev server. The webapp builds the job JSON entirely
client-side; the server is a thin plotter driver only.

**Files:**
- `corner-anamorphosis/server.py` — FastAPI app; exposes three endpoints
- `corner-anamorphosis/requirements.txt` — `fastapi`, `uvicorn[standard]`
- `corner-anamorphosis/plot.py` — plotter harness; imported directly by the server

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/plot?dry_run=false` | Accept job JSON body, start background thread, return `{job_id}` |
| GET  | `/status/{job_id}`   | Return `{state, log[]}` — state: `queued\|running\|done\|error` |
| POST | `/stop`              | Send `KeyboardInterrupt` to the worker thread (best-effort) |

Only one job runs at a time; a second `POST /plot` while a job is running
returns HTTP 409.

**Running the server:**
```bash
cd corner-anamorphosis
pip install -r requirements.txt
uvicorn server:app --port 8765
```

The webapp polls `GET /status/<id>` every second, appending log lines to
a scrollable panel below the views. CORS is restricted to `localhost:8080`.

**Motor disable:** `plot.py` always calls `axicli --mode=align` after every
job (including dry runs) to disengage the stepper motors so the carriage
can be moved freely.

**Error handling notes:**
- `plot.py` uses `sys.exit()` for fatal errors (axicli not on PATH, bad pass
  filter, etc.). These raise `SystemExit`, a `BaseException` subclass. The server
  catches `BaseException` so the job state is always set to `"error"` and the
  message appears in the log — the job never hangs in `"running"`.
- Both `stdout` and `stderr` from `plot.py` are captured into the job log via
  `contextlib.redirect_stdout` / `redirect_stderr`.
- The `load_job` monkey-patch is always restored in `finally`, so a failed job
  does not corrupt the next one.


## Potential Future Work

### SVG Image Projection

Project a user-supplied 2D SVG onto the three panels so that, when viewed
from the observer position, the image appears to float inside the cube as a
flat "ghost" image — the same anamorphic trick applied to an arbitrary shape
rather than just the wireframe cube.

#### Core Idea

Place the SVG on a **fronto-parallel virtual plane** — a plane perpendicular
to the observer's line of sight, centered on the cube volume at a
user-specified depth. For every sampled point P on the SVG paths:

1. Map P from 2D SVG space → 3D point on the virtual plane.
2. Call `projectPoint(O, P)` (already implemented) to find where the ray
   from observer O through P hits the walls/floor.
3. Accumulate the resulting wall-space segments by wall (A, B) exactly as
   the cube-edge projection does today.

The wall marks look like distorted smears from the front, but reconstruct
the original image when viewed from O.

#### Virtual Plane Math

Given observer O = (ox, oy, oz) and a user-specified depth d (0 < d < dist):

```
fwd   = normalize(C − O)          C = cube center (S/2·sg, S/2·sg, S/2)
right = normalize(fwd × [0,0,1])  horizontal axis
up    = right × fwd               vertical axis

anchor A = O + d · fwd            plane origin in 3D

SVG point (u, v) → 3D point P = A + u·right + v·up
```

The SVG's u-axis maps to the horizontal direction in the observer's frame,
v-axis maps vertically. Scale factor converts SVG units to mm.

#### Path Sampling

Reuse the paint project's approach: parse paths with `DOMParser`, insert
into a hidden div, and sample N equal-arc-length points per path via
`getPointAtLength()`. Each consecutive pair becomes a candidate wall segment.

For each pair (Pi, Pi+1):
- Project both points with `projectPoint`.
- If they land on the same wall → emit one segment on that wall.
- If they land on different walls → binary-search for the split t where the
  projection crosses the fold boundary (same condition as `edgeSplitS`),
  and emit one segment per wall. At high N this case is rare; skipping it
  with a small gap is a viable first approximation.

#### UI Controls (Corner project additions)

| Control | Meaning |
|---------|---------|
| SVG file | Load the image to project |
| depth (0–1) | Fraction of dist at which the virtual plane sits (0 = at observer, 1 = at fold) |
| scale (mm) | Physical width of the SVG in 3D space |
| center x/y | Nudge the virtual plane's anchor within the cube plane |
| segs/path | Arc-length sample density per path |
| show cube | Toggle the cube wireframe overlay on/off |

#### Preview & Export Integration

- **Preview**: overlay the projected image segments on Wall A / Wall B panels
  alongside the existing wireframe using a distinct colour (e.g., `#e07`).
- **3D view**: draw the virtual plane and SVG outline in the 3D canvas to
  confirm placement before exporting.
- **Export SVGs**: add the projected image segments as a second `<g>` layer
  in each wall's exported SVG, distinct from the wireframe layer. An
  optional flag could export wireframe and image as separate files.
- **Plotter JSON**: add an `image_a` / `image_b` layer alongside the existing
  `wall_a` / `wall_b` layers so the plotter can draw them in a separate pass
  (e.g., coloured pen for the image, pencil for the wireframe).

#### Limitations & Open Questions

- Points near the fold boundary may split awkwardly; dense sampling
  minimises the visual artefact but does not eliminate it.
- The floor tile rarely receives image segments (only when observer height H
  causes projections to exit the wall bottom) — floor projection is a
  stretch goal.
- Very wide or tall SVGs whose virtual-plane extent exceeds the wall bounds
  will be clipped; a bounding-box preview overlay in the 3D view would help
  the user resize before committing.
- Filled regions (SVG `<polygon>`, `<rect>`, etc.) are not handled — only
  stroked `<path>` elements. Users must convert fills to outlines in their
  SVG editor first (same constraint as the Paint project).
