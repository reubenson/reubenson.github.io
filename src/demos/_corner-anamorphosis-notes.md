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

Self-contained 11ty markdown file. No external dependencies. All geometry
computed in vanilla JavaScript. SVG elements created with `createElementNS`.

Key functions:
- `getObserver()` — returns O = (+D·cosα, +D·sinα, H)
- `getVertices()` — returns 8 cube vertices (sign-flipped for corner-out)
- `projectPoint(O, P)` — projects a 3D point onto Wall A (y=0) or Wall B (x=0)
- `edgeSplitS(O, P1, P2)` — finds the split parameter for a cross-wall edge
- `projectEdge(O, V, edge)` — returns wall segments for one cube edge
- `computeSegments()` — collects all wall-projected segments by wall (A, B)
- `projectFloorPoint(O, P)` — projects a 3D point onto the floor (z=0)
- `computeFloorSegments()` — projects all 12 edges onto the floor, clipped to [0,S]×[0,S]
- `clipLine(x1,y1,x2,y2,xmin,ymin,xmax,ymax)` — Liang-Barsky 2D segment clip
- `buildExportSvg(wall)` — constructs the clipped export SVG for one wall panel
- `buildFloorSvg()` — constructs the export SVG for the floor tile
- `renderPreview()` — draws the unfolded three-panel preview in the page
- `renderSchematic()` — draws the top-down scene diagram
- `renderView3D()` — draws the 3D model (observer and overview modes)
