# Corner Anamorphosis — Notes

## Goal

Generate SVG drawings for two rectangular wall panels that, when physically
folded into a 90° corner and viewed from a specific observer position, create
the illusion of a 3D cube sitting in the corner. The tool supports two modes
corresponding to whether the fold ridge faces toward or away from the observer.


## Modes

### Corner-in (concave — default)
The fold ridge points **toward** the observer, like the inside corner of a room.
Both wall panels recede away from the observer when folded.

- Physical setup: print both panels, fold so the printed surfaces face each
  other at 90°, and stand in front.
- Wall A printable surface: x=0 plane, y ≤ 0 side.
- Wall B printable surface: y=0 plane, x ≤ 0 side.

### Corner-out (convex)
The fold ridge points **away** from the observer, like the outside corner of a
box or column. Both panels tilt toward the observer when folded.

- Physical setup: fold so the printed surfaces face outward (tent/ridge shape),
  and stand in front of the ridge.
- Wall A printable surface: x=0 plane, y ≥ 0 side.
- Wall B printable surface: y=0 plane, x ≥ 0 side.


## Coordinate System

```
         Z (up)
         |
         |
         +--------> Y
        /
       /
      X

Corner at origin (0, 0, 0).

Wall A  — the x=0 plane (a vertical plane containing the Z and Y axes)
Wall B  — the y=0 plane (a vertical plane containing the Z and X axes)
Floor   — the z=0 plane (unused in projection, just implied)

Virtual cube occupies x∈[−S,0], y∈[−S,0], z∈[0,S] in both modes.

Observer: O = (D·cos α, D·sin α, H)
  D     — horizontal distance from corner (mm)
  α     — angle from the x-axis (45° = symmetric between the two walls)
  H     — eye height (mm)
```


## Projection Math

For each 3D point P = (px, py, pz) on the cube, cast a ray from observer O
through P and find where it hits the printable surface of each wall.

**Intersection with Wall A (plane x=0):**
```
t_A = ox / (ox − px)
y_A = oy + t_A · (py − oy)
z_A = oz + t_A · (pz − oz)
```
Valid for corner-in if y_A ≤ 0; valid for corner-out if y_A ≥ 0.

**Intersection with Wall B (plane y=0):**
```
t_B = oy / (oy − py)
x_B = ox + t_B · (px − ox)
z_B = oz + t_B · (pz − oz)
```
Valid for corner-in if x_B ≤ 0; valid for corner-out if x_B ≥ 0.

**Mutual exclusivity:** For any cube point with px ≤ 0 and py ≤ 0, the two
validity conditions are mutually exclusive (provable by substitution).
The boundary — where the point maps to the fold edge (corner line) — is:

```
py · ox = oy · px   ⟺   |py|/|px| = oy/ox
```

The wall assignment flips between modes at this same boundary, so the edge-split
formula is mode-independent.


## Edge Splitting

For a cube edge P1 → P2 whose two endpoints project onto different walls, find
the parametric value s ∈ (0,1) at which the projection crosses the corner fold:

```
P(s) = P1 + s·(P2 − P1)

Condition: py(s)·ox = oy·px(s)

s = (oy·P1x − P1y·ox) / ((P2y−P1y)·ox − oy·(P2x−P1x))
```

The edge is then split at P(s), with each half drawn on its respective wall.


## Wall Coordinate System (2D)

Each wall's 2D coordinate is expressed as (u, z):
- `u` = the axis perpendicular to the corner fold (i.e., world-y for Wall A,
  world-x for Wall B). Negative in corner-in mode, positive in corner-out.
- `z` = height above floor (world-z, always ≥ 0).

For display and export, `|u|` is used as the distance from the fold edge,
so the same rendering code handles both modes without branching.


## Export SVG Format

Each wall is exported as an independent SVG file:

```
width  = wallW mm
height = wallH mm
viewBox = "0 0 wallW wallH"

Fold edge at SVG x=0 (left edge).
Far edge at SVG x=wallW (right edge).
Floor (z=0) at SVG y=wallH (bottom).
Top of wall at SVG y=0.

SVG x = |u|
SVG y = wallH − z
```

Visible edges: `stroke-width:0.3`, solid.  
Hidden edges:  `stroke-width:0.15`, dashed `0.8,0.6` mm.

Stroke widths are chosen for pen plotters (≈0.3–0.4mm pen tip).


## Cube Geometry

8 vertices (S = cube side length):

| Index | x  | y  | z  | Location              |
|-------|----|----|----|------------------------|
| 0     |  0 |  0 |  0 | Corner, floor          |
| 1     | −S |  0 |  0 | Wall-B edge, floor     |
| 2     |  0 | −S |  0 | Wall-A edge, floor     |
| 3     | −S | −S |  0 | Far corner, floor      |
| 4     |  0 |  0 |  S | Corner, top            |
| 5     | −S |  0 |  S | Wall-B edge, top       |
| 6     |  0 | −S |  S | Wall-A edge, top       |
| 7     | −S | −S |  S | Far corner, top        |

12 edges: all 12 edges of a cube. Edges 3 ([1,3]), 5 ([2,3]), and 7 ([3,7])
are "hidden" (not part of any observer-facing face) and are drawn dashed.

Visible faces from observer at (ox>0, oy>0, oz>0): x=0, y=0, z=S.


## Implementation

Self-contained 11ty markdown file. No external dependencies. All geometry
computed in vanilla JavaScript. SVG elements created with `createElementNS`.

Key functions:
- `projectPoint(O, P)` — projects a 3D point onto Wall A or Wall B
- `edgeSplitS(O, P1, P2)` — finds the split parameter for a cross-wall edge
- `projectEdge(O, V, edge)` — returns wall segments for one cube edge
- `computeSegments()` — collects all projected segments by wall
- `buildExportSvg(wall)` — constructs the export SVG for one wall
- `renderPreview()` — draws the unfolded wall preview in the page
- `renderSchematic()` — draws the top-down scene diagram
