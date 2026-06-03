"""
Generic AxiDraw plotter harness.

Reads a job JSON and drives the AxiDraw via pyaxidraw. Supports multiple
z-depth passes and periodic ink refill (e.g. watercolor brush dipping).

Job JSON format:
    {
      "layers": [
        {
          "id":       "some_label",
          "origin":   [x_mm, y_mm],     # offset from plotter home
          "segments": [
            { "from": [x, y], "to": [x, y], "hidden": false }
          ]
        }
      ],
      "procedure": {
        "passes": [
          { "label": "light", "pen_pos_down": 38, "speed_pendown": 25 }
        ],
        "refill": {
          "enabled":         false,
          "well_pos":        [x_mm, y_mm],
          "dwell_ms":        1200,
          "strokes_per_dip": 15
        },
        "pen": {
          "pos_up":      60,
          "speed_penup": 75
        }
      }
    }

All coordinates are mm. Segment coordinates are in layer-local space;
the harness adds each layer's origin before sending to the plotter.

Usage:
    python plot.py job.json
    python plot.py job.json --layers wall_a wall_b   # skip floor
    python plot.py job.json --passes light           # single pass by label
    python plot.py job.json --dry-run                # preview, no hardware

Requirements:
    pyaxidraw is not on PyPI — install from the cloned repo:
        git clone https://github.com/evil-mad/axidraw
        cd axidraw/cli
        pip install .
    See https://github.com/evil-mad/axidraw/blob/master/cli/Installation.txt
"""

import argparse
import json
import sys
import time

try:
    from pyaxidraw import axidraw as _axidraw
except ImportError:
    _axidraw = None


class _Opts:
    """Accepts any attribute assignment — stands in for axidraw.options."""
    pass


class DryRunAxiDraw:
    """Prints moves instead of driving hardware. No pyaxidraw required."""

    def __init__(self):
        self.options = _Opts()
        self._x = 0.0
        self._y = 0.0
        self.lifts = 0
        self.travel_up = 0.0
        self.travel_down = 0.0

    def _dist(self, x, y):
        import math
        return math.hypot(x - self._x, y - self._y)

    def connect(self):
        print("[dry run — no hardware]")
        return True

    def disconnect(self):
        print(f"\n  pen lifts:    {self.lifts}")
        print(f"  travel (up):  {self.travel_up:.1f} mm")
        print(f"  travel (down):{self.travel_down:.1f} mm")

    def penup(self):
        pass

    def moveto(self, x, y):
        self.travel_up += self._dist(x, y)
        self.lifts += 1
        print(f"  up   ({self._x:7.2f},{self._y:7.2f}) → ({x:7.2f},{y:7.2f})")
        self._x, self._y = x, y

    def lineto(self, x, y):
        self.travel_down += self._dist(x, y)
        print(f"  draw ({self._x:7.2f},{self._y:7.2f}) → ({x:7.2f},{y:7.2f})")
        self._x, self._y = x, y


def load_job(path):
    with open(path) as f:
        return json.load(f)


def draw_segments(ad, segments, origin, refill, stroke_count):
    ox, oy = origin
    well     = refill['well_pos']
    interval = refill['strokes_per_dip']
    dwell    = refill['dwell_ms'] / 1000.0

    for seg in segments:
        if refill['enabled'] and stroke_count > 0 and stroke_count % interval == 0:
            print(f"    refilling at stroke {stroke_count}")
            ad.penup()
            ad.moveto(*well)
            time.sleep(dwell)

        x1, y1 = ox + seg['from'][0], oy + seg['from'][1]
        x2, y2 = ox + seg['to'][0],   oy + seg['to'][1]
        ad.moveto(x1, y1)
        ad.lineto(x2, y2)
        stroke_count += 1

    return stroke_count


def plot(job_path, layer_filter=None, pass_filter=None, dry_run=False):
    job    = load_job(job_path)
    layers = job['layers']
    proc   = job['procedure']
    pen    = proc['pen']
    refill = proc['refill']
    passes = proc['passes']

    if layer_filter:
        layers = [l for l in layers if l['id'] in layer_filter]
        if not layers:
            sys.exit(f"No layers matched: {layer_filter}")

    if pass_filter:
        passes = [p for p in passes if p['label'] in pass_filter]
        if not passes:
            sys.exit(f"No passes matched: {pass_filter}")

    if dry_run:
        ad = DryRunAxiDraw()
    else:
        if _axidraw is None:
            sys.exit(
                "pyaxidraw not installed.\n"
                "Clone https://github.com/evil-mad/axidraw and run:\n"
                "  cd axidraw/cli && pip install ."
            )
        ad = _axidraw.AxiDraw()
        ad.interactive()
        ad.options.units       = 2
        ad.options.pen_pos_up  = pen['pos_up']
        ad.options.speed_penup = pen['speed_penup']

    if not ad.connect():
        sys.exit("AxiDraw not found — is it connected and powered on?")

    try:
        for i, p in enumerate(passes):
            print(f"\nPass {i+1}/{len(passes)}: {p['label']} "
                  f"(pen_down={p['pen_pos_down']}, speed={p['speed_pendown']})")
            ad.options.pen_pos_down  = p['pen_pos_down']
            ad.options.speed_pendown = p['speed_pendown']

            stroke_count = 0
            for layer in layers:
                visible = [s for s in layer['segments'] if not s['hidden']]
                print(f"  {layer['id']}: {len(visible)} visible segments")
                stroke_count = draw_segments(
                    ad, visible, layer['origin'], refill, stroke_count)

            # Hidden lines drawn once on the final pass at reduced pressure.
            if i == len(passes) - 1:
                saved = ad.options.pen_pos_down
                ad.options.pen_pos_down = max(saved - 8, 20)
                for layer in layers:
                    hidden = [s for s in layer['segments'] if s['hidden']]
                    if hidden:
                        print(f"  {layer['id']}: {len(hidden)} hidden segments")
                    stroke_count = draw_segments(
                        ad, hidden, layer['origin'], refill, stroke_count)
                ad.options.pen_pos_down = saved

        print(f"\nDone — {stroke_count} total strokes.")

    finally:
        ad.penup()
        ad.moveto(0, 0)
        ad.disconnect()


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('job',                 help='Path to job JSON file')
    ap.add_argument('--layers', nargs='+', metavar='ID',
                    help='Plot only layers with these ids (default: all)')
    ap.add_argument('--passes', nargs='+', metavar='LABEL',
                    help='Plot only passes with these labels (default: all)')
    ap.add_argument('--dry-run',           action='store_true',
                    help='Preview mode — no hardware movement')
    args = ap.parse_args()
    plot(args.job, args.layers, args.passes, args.dry_run)
