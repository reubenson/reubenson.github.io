"""
Generate a plain-weave textile pattern as an SVG for the AxiDraw plotter.

Canvas: 100mm x 80mm
Grid:   6 warp (vertical) x 6 weft (horizontal) threads
Each thread is represented by its two parallel edges.
At each intersection the over-thread edge is a solid path; the under-thread edge is omitted.
Each continuous visible run per thread edge becomes its own <path> element so the
file works with the paint-project SVG loader (which uses getTotalLength/getPointAtLength).

Usage:
    python generate_weave.py            # writes weave.svg
    python generate_weave.py out.svg    # writes to a custom path
"""

import sys

WIDTH  = 100.0
HEIGHT = 80.0

N_WARP = 6
N_WEFT = 6

THREAD_W = 10.0
HALF_W   = THREAD_W / 2.0

WARP_SPACING = WIDTH  / N_WARP
WEFT_SPACING = HEIGHT / N_WEFT

def r(v):
    return round(v, 4)

# Each entry: list of (x1,y1,x2,y2) for one continuous visible run
runs = []

# ── Warp threads (vertical) ───────────────────────────────────────────────────
for i in range(N_WARP):
    x_center = WARP_SPACING / 2 + i * WARP_SPACING

    for edge_sign in (-1, 1):
        x = x_center + edge_sign * HALF_W
        # Collect (y_start, y_end, hidden) for every sub-segment
        sub = []
        y = 0.0

        for j in range(N_WEFT):
            y_weft = WEFT_SPACING / 2 + j * WEFT_SPACING
            y_in   = y_weft - HALF_W
            y_out  = y_weft + HALF_W

            if y < y_in:
                sub.append((y, y_in, False))
            warp_over = (i + j) % 2 == 0
            sub.append((y_in, y_out, not warp_over))
            y = y_out

        if y < HEIGHT:
            sub.append((y, HEIGHT, False))

        # Group consecutive visible sub-segments into single runs
        run_pts = None
        for y_start, y_end, hidden in sub:
            if hidden:
                if run_pts:
                    runs.append(run_pts)
                    run_pts = None
            else:
                if run_pts is None:
                    run_pts = [(r(x), r(y_start))]
                run_pts.append((r(x), r(y_end)))
        if run_pts:
            runs.append(run_pts)

# ── Weft threads (horizontal) ─────────────────────────────────────────────────
for j in range(N_WEFT):
    y_center = WEFT_SPACING / 2 + j * WEFT_SPACING

    for edge_sign in (-1, 1):
        y = y_center + edge_sign * HALF_W
        sub = []
        x = 0.0

        for i in range(N_WARP):
            x_warp = WARP_SPACING / 2 + i * WARP_SPACING
            x_in   = x_warp - HALF_W
            x_out  = x_warp + HALF_W

            if x < x_in:
                sub.append((x, x_in, False))
            weft_over = (i + j) % 2 == 1
            sub.append((x_in, x_out, not weft_over))
            x = x_out

        if x < WIDTH:
            sub.append((x, WIDTH, False))

        run_pts = None
        for x_start, x_end, hidden in sub:
            if hidden:
                if run_pts:
                    runs.append(run_pts)
                    run_pts = None
            else:
                if run_pts is None:
                    run_pts = [(r(x_start), r(y))]
                run_pts.append((r(x_end), r(y)))
        if run_pts:
            runs.append(run_pts)

# ── SVG output ────────────────────────────────────────────────────────────────
stroke_w = 0.3
parts = [
    f'<svg xmlns="http://www.w3.org/2000/svg"'
    f' width="{WIDTH}mm" height="{HEIGHT}mm"'
    f' viewBox="0 0 {WIDTH} {HEIGHT}">',
    '<g id="weave" inkscape:label="weave" inkscape:groupmode="layer"'
    ' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape">',
]

for pts in runs:
    d = 'M ' + ' L '.join(f'{x},{y}' for x, y in pts)
    parts.append(
        f'  <path d="{d}"'
        f' style="fill:none;stroke:#000000;stroke-width:{stroke_w};stroke-linecap:round"/>'
    )

parts += ['</g>', '</svg>']

out_path = sys.argv[1] if len(sys.argv) > 1 else "weave.svg"
with open(out_path, "w") as f:
    f.write('\n'.join(parts))

print(f"Wrote {out_path}: {len(runs)} paths")
