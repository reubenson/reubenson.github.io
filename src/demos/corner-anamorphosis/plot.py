"""
Generic AxiDraw plotter harness — axicli backend.

Reads a job JSON, generates SVG in memory, and drives the AxiDraw via axicli.
Supports multiple z-depth passes and periodic ink refill (e.g. watercolor dipping).

Job JSON format:
    {
      "layers": [
        {
          "id":       "some_label",
          "origin":   [x_mm, y_mm],     # offset from plotter home position
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
          "dwell_s":         2,
          "strokes_per_dip": 15
        },
        "pen": {
          "pos_up":      60,
          "speed_penup": 75
        }
      }
    }

All coordinates are mm. Segment coordinates are in layer-local space;
each layer's origin is added before plotting.

Usage:
    python plot.py job.json
    python plot.py job.json --layers wall_a wall_b   # skip floor
    python plot.py job.json --passes light           # single pass by label
    python plot.py job.json --dry-run                # print axicli calls, no hardware
    python plot.py job.json --dry-run --save-svg     # also write SVGs to disk

Requirements:
    axicli must be on PATH. Install from the axidraw repo (not PyPI):
        git clone https://github.com/evil-mad/axidraw
        cd axidraw/cli && pip install .

    Dependency resolution notes (resolved 2026-06):
    ─────────────────────────────────────────────────────────────────────────
    pyaxidraw depends on axidrawinternal, which is a private package not
    available on PyPI. It ships as a pre-built wheel in the axidraw repo at
    cli/prebuilt_dependencies/axidrawinternal-*.whl. Install it into the same
    Python environment as axicli:
        pip install cli/prebuilt_dependencies/axidrawinternal-*.whl

    axidrawinternal also depends on inkex (via ink-extensions on PyPI).
    axidrawinternal 3.9.0 calls inkex.Effect.OptionParser, which was removed
    in ink-extensions 2.x, causing:
        AttributeError: 'AxiDraw' object has no attribute 'OptionParser'

    Fix: the Inkscape AxiDraw extension ships compatible versions of both
    axidrawinternal (3.9.5+) and ink_extensions (1.3.2) at:
        ~/Library/Application Support/org.inkscape.Inkscape/config/inkscape/
            extensions/axidraw_deps/

    Copy both packages from there into your Python environment's site-packages,
    replacing the installed versions:
        DEPS="~/Library/Application Support/.../axidraw_deps"
        SITE="<venv>/lib/python3.x/site-packages"
        cp -r "$DEPS/axidrawinternal" "$SITE/axidrawinternal"
        cp -r "$DEPS/ink_extensions"  "$SITE/ink_extensions"

    Verify with:
        python -c "from pyaxidraw import axidraw; axidraw.AxiDraw(); print('ok')"
    ─────────────────────────────────────────────────────────────────────────
"""

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import tempfile
import time


# ── SVG generation ────────────────────────────────────────────────────────────

# Generous bed size — large enough to contain any realistic layout.
# axicli clips to actual travel limits on the hardware.
BED_W, BED_H = 500, 400

def _seg_to_line(seg, ox, oy):
    x1 = ox + seg['from'][0]
    y1 = oy + seg['from'][1]
    x2 = ox + seg['to'][0]
    y2 = oy + seg['to'][1]
    style = 'fill:none;stroke:#000000;stroke-width:0.3;stroke-linecap:round'
    if seg.get('hidden'):
        style += ';stroke-dasharray:0.8,0.6'
    return (f'<line x1="{x1:.4f}" y1="{y1:.4f}" '
            f'x2="{x2:.4f}" y2="{y2:.4f}" style="{style}"/>')

def make_svg(flat_segs):
    """
    flat_segs: list of (segment_dict, (ox, oy)) tuples, all in mm.
    Returns an SVG string with a single layer containing those segments.
    """
    parts = [
        f'<svg xmlns="http://www.w3.org/2000/svg"'
        f' xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"'
        f' width="{BED_W}mm" height="{BED_H}mm"'
        f' viewBox="0 0 {BED_W} {BED_H}">',
        '<g inkscape:label="Layer 1" inkscape:groupmode="layer" id="layer1">',
    ]
    for seg, (ox, oy) in flat_segs:
        parts.append('  ' + _seg_to_line(seg, ox, oy))
    parts += ['</g>', '</svg>']
    return '\n'.join(parts)


def travel_stats(flat_segs):
    """Return (pen_down_mm, pen_up_mm, lifts) for a sequence of segments."""
    pen_down = pen_up = lifts = 0
    prev_end = None
    for seg, (ox, oy) in flat_segs:
        sx1, sy1 = ox + seg['from'][0], oy + seg['from'][1]
        sx2, sy2 = ox + seg['to'][0],   oy + seg['to'][1]
        if prev_end is not None:
            pen_up += math.hypot(sx1 - prev_end[0], sy1 - prev_end[1])
            lifts += 1
        pen_down += math.hypot(sx2 - sx1, sy2 - sy1)
        prev_end = (sx2, sy2)
    return pen_down, pen_up, lifts


# ── axicli ────────────────────────────────────────────────────────────────────

def find_axicli():
    path = shutil.which('axicli')
    if not path:
        sys.exit(
            "axicli not found on PATH.\n"
            "Install from https://github.com/evil-mad/axidraw\n"
            "then ensure the install directory is on your PATH."
        )
    return path


def run_axicli(svg_path, pen_options, axicli_path, dry_run):
    """Call axicli with the given SVG file and pen options dict."""
    flags = [f'--{k}={v}' for k, v in pen_options.items()]
    cmd = [axicli_path, svg_path] + flags
    print('  $', ' '.join(cmd))
    if dry_run:
        return
    result = subprocess.run(cmd, text=True, capture_output=True)
    if result.stdout:
        print(result.stdout.rstrip())
    if result.returncode != 0:
        print(result.stderr.rstrip(), file=sys.stderr)
        sys.exit(f"axicli exited with code {result.returncode}")


def disable_motors(axicli_path, dry_run):
    """Disengage stepper motors so the carriage moves freely after a job."""
    minimal_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg"'
        f' width="{BED_W}mm" height="{BED_H}mm"'
        f' viewBox="0 0 {BED_W} {BED_H}"></svg>'
    )
    with tempfile.NamedTemporaryFile(suffix='.svg', mode='w',
                                     delete=False, prefix='axi_align_') as f:
        f.write(minimal_svg)
        svg_path = f.name
    cmd = [axicli_path, svg_path, '--mode=align']
    print('  $', ' '.join(cmd))
    try:
        if not dry_run:
            result = subprocess.run(cmd, text=True, capture_output=True)
            if result.stdout:
                print(result.stdout.rstrip())
            if result.returncode != 0:
                print(result.stderr.rstrip(), file=sys.stderr)
    finally:
        os.unlink(svg_path)


# ── Plotting ──────────────────────────────────────────────────────────────────

def flatten_layers(layers, hidden=False):
    """Return a flat list of (seg, origin) for visible or hidden segments."""
    out = []
    for layer in layers:
        origin = tuple(layer['origin'])
        for seg in layer['segments']:
            if bool(seg.get('hidden')) == hidden:
                out.append((seg, origin))
    return out


def chunked(items, size):
    for i in range(0, max(len(items), 1), size):
        yield items[i:i + size]


def plot_flat(flat_segs, pen_options, axicli_path, refill, dry_run, save_svg=False):
    """Plot a flat list of (seg, origin) tuples, with refill pauses if enabled."""
    if not flat_segs:
        return

    if refill['enabled']:
        size = refill['strokes_per_dip']
        chunks = list(chunked(flat_segs, size))
    else:
        chunks = [flat_segs]

    for idx, chunk in enumerate(chunks):
        if refill['enabled'] and idx > 0:
            input(f"  → refill pause (chunk {idx+1}/{len(chunks)}) — "
                  f"dip brush, then press Enter to continue...")
            time.sleep(refill.get('dwell_s', 0))

        svg = make_svg(chunk)
        down_mm, up_mm, lifts = travel_stats(chunk)
        print(f"    {len(chunk)} segments | "
              f"draw {down_mm:.1f}mm | travel {up_mm:.1f}mm | {lifts} lifts")

        with tempfile.NamedTemporaryFile(suffix='.svg', mode='w',
                                         delete=False, prefix='axi_') as f:
            f.write(svg)
            svg_path = f.name

        if save_svg:
            dest = f"axi_chunk_{idx:03d}.svg"
            import shutil as _sh
            _sh.copy(svg_path, dest)
            print(f"    saved {dest}")

        try:
            run_axicli(svg_path, pen_options, axicli_path, dry_run)
        finally:
            os.unlink(svg_path)


def plot(job_path, layer_filter=None, pass_filter=None, dry_run=False, save_svg=False):
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

    axicli_path = find_axicli()
    if dry_run:
        print(f"[dry run — axicli at {axicli_path}]")

    visible_segs = flatten_layers(layers, hidden=False)
    hidden_segs  = flatten_layers(layers, hidden=True)

    for i, p in enumerate(passes):
        print(f"\nPass {i+1}/{len(passes)}: {p['label']} "
              f"(pen_down={p['pen_pos_down']}, speed={p['speed_pendown']})")

        pen_options = {
            'pen_pos_down':  p['pen_pos_down'],
            'speed_pendown': p['speed_pendown'],
            'pen_pos_up':    pen['pos_up'],
            'speed_penup':   pen['speed_penup'],
        }
        plot_flat(visible_segs, pen_options, axicli_path, refill, dry_run, save_svg)

        # Hidden lines on the final pass only, at reduced pressure.
        if i == len(passes) - 1 and hidden_segs:
            print(f"  hidden lines (pen_down={max(p['pen_pos_down'] - 8, 20)})")
            hidden_options = dict(pen_options)
            hidden_options['pen_pos_down'] = max(p['pen_pos_down'] - 8, 20)
            plot_flat(hidden_segs, hidden_options, axicli_path,
                      {'enabled': False}, dry_run, save_svg)

    print("\nDisabling motors...")
    disable_motors(axicli_path, dry_run)
    print("Done.")


def load_job(path):
    with open(path) as f:
        return json.load(f)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('job',                 help='Path to job JSON file')
    ap.add_argument('--layers', nargs='+', metavar='ID',
                    help='Plot only layers with these ids (default: all)')
    ap.add_argument('--passes', nargs='+', metavar='LABEL',
                    help='Plot only passes with these labels (default: all)')
    ap.add_argument('--dry-run',           action='store_true',
                    help='Print axicli commands without running them')
    ap.add_argument('--save-svg',          action='store_true',
                    help='Write each intermediate SVG to disk for inspection')
    args = ap.parse_args()
    plot(args.job, args.layers, args.passes, args.dry_run, args.save_svg)
