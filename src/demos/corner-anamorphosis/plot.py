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
          "strokes_per_dip": 15,
          "well": {
            "x":            10,
            "y":            10,
            "pen_pos_down": 55
          }
        },
        "pen": {
          "pos_up":      60,
          "speed_penup": 75
        }
      }
    }

All coordinates are mm. Segment coordinates are in layer-local space;
each layer's origin is added before plotting.

Refill modes:
    "strokes" (default): dip after every `strokes_per_dip` segments.
    "travel":            dip after `travel_mm` of cumulative pen-down
                         distance; `strokes_per_dip` is ignored in this mode.

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

MM_PER_INCH = 25.4

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


# ── vpype ─────────────────────────────────────────────────────────────────────

DEFAULT_VPYPE_PIPELINE = 'linemerge --tolerance 0.5 linesort'

def vpype_optimize(svg_str, pipeline):
    """Run an SVG string through a vpype pipeline; return the result SVG string."""
    if not shutil.which('vpype'):
        print('  [vpype not found on PATH — skipping optimization]')
        return svg_str
    with tempfile.NamedTemporaryFile(suffix='.svg', mode='w',
                                     delete=False, prefix='vpy_in_') as f:
        f.write(svg_str)
        inp = f.name
    out = inp.replace('vpy_in_', 'vpy_out_')
    try:
        cmd = ['vpype', 'read', inp] + pipeline.split() + ['write', out]
        result = subprocess.run(cmd, text=True, capture_output=True)
        if result.returncode != 0:
            print(f'  [vpype error: {result.stderr.strip()}]')
            return svg_str
        with open(out) as f:
            return f.read()
    finally:
        for p in (inp, out):
            try:
                os.unlink(p)
            except FileNotFoundError:
                pass


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


# ── Calibration ───────────────────────────────────────────────────────────────

def _run_manual(axicli_path, svg_path, cmd, extra_flags, dry_run, fd=None, old_tty=None):
    """Run an axicli manual command, re-applying raw mode afterwards if fd/old_tty given."""
    import tty
    import termios
    full_cmd = [axicli_path, svg_path, '--mode=manual', f'--manual_cmd={cmd}'] + extra_flags
    sys.stdout.write(f'\r\n  $ {" ".join(full_cmd)}\r\n')
    sys.stdout.flush()
    if dry_run:
        if fd is not None:
            tty.setraw(fd)
        return
    # Restore normal mode so axicli's own I/O works correctly
    if fd is not None and old_tty is not None:
        termios.tcsetattr(fd, termios.TCSADRAIN, old_tty)
    result = subprocess.run(full_cmd, text=True, capture_output=True)
    # Re-enter raw mode before any further reads
    if fd is not None:
        tty.setraw(fd)
    if result.stdout:
        sys.stdout.write(result.stdout.rstrip() + '\r\n')
        sys.stdout.flush()
    if result.returncode != 0:
        sys.stdout.write(result.stderr.rstrip() + '\r\n')
        sys.stdout.flush()


def calibrate(job_path, dry_run=False):
    """
    Interactive calibration.

    w/a/s/d   – move plotter head (up/left/down/right)
    [ / ]     – raise / lower pen  (decrease / increase pen_pos_down)
    + / -     – double / halve XY step size
    t         – test pen: draw a 0.5 mm mark at current position
    Enter / q – accept and exit

    Returns (x_offset_mm, y_offset_mm, pen_pos_down).
    The caller adds the XY offset to every layer origin before plotting.
    """
    try:
        import tty
        import termios
    except ImportError:
        sys.exit("calibration requires tty/termios (Unix/macOS only)")

    job         = load_job(job_path)
    proc        = job['procedure']
    pen         = proc['pen']
    axicli_path = find_axicli()

    minimal_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg"'
        f' width="{BED_W}mm" height="{BED_H}mm"'
        f' viewBox="0 0 {BED_W} {BED_H}"></svg>'
    )
    with tempfile.NamedTemporaryFile(suffix='.svg', mode='w',
                                     delete=False, prefix='axi_cal_') as f:
        f.write(minimal_svg)
        svg_path = f.name

    x_mm     = 0.0
    y_mm     = 0.0
    pen_down = proc['passes'][0]['pen_pos_down']
    step_mm  = 5.0

    fd  = sys.stdin.fileno()
    old = termios.tcgetattr(fd)

    def status():
        sys.stdout.write(
            f'\r\033[K'
            f'  pos=({x_mm:+.1f}, {y_mm:+.1f}) mm'
            f'  pen_pos_down={pen_down}'
            f'  step={step_mm:.1f} mm  '
        )
        sys.stdout.flush()

    def walk(axis, dist_mm):
        inches = dist_mm / MM_PER_INCH
        _run_manual(axicli_path, svg_path,
                    'walk_x' if axis == 'x' else 'walk_y',
                    [f'--dist={inches:.6f}'], dry_run, fd, old)

    def test_pen():
        # axicli does not persist position between walk_x/walk_y invocations, so
        # it always thinks it's at (0,0). Drawing a mark at (0,0) in the SVG means
        # zero commanded travel — the pen dips right where the head physically is.
        sys.stdout.write(f'\r\n  testing pen_pos_down={pen_down} ...\r\n')
        sys.stdout.flush()
        test_svg = make_svg([({'from': [0, 0], 'to': [0.1, 0]}, (0.0, 0.0))])
        with tempfile.NamedTemporaryFile(suffix='.svg', mode='w',
                                         delete=False, prefix='axi_test_') as f:
            f.write(test_svg)
            test_path = f.name
        pen_opts = {
            'pen_pos_down':  pen_down,
            'speed_pendown': 25,
            'pen_pos_up':    pen['pos_up'],
            'speed_penup':   pen['speed_penup'],
        }
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
        try:
            run_axicli(test_path, pen_opts, axicli_path, dry_run)
        finally:
            tty.setraw(fd)
            os.unlink(test_path)

    print("\n=== AxiDraw Calibration ===")
    print("  w / s       move plotter up / down (Y axis)")
    print("  a / d       move plotter left / right (X axis)")
    print("  [ / ]       pen up / pen down  (decrease / increase pen_pos_down)")
    print("  + / -       double / halve XY step size")
    print("  t           test pen: draw 0.5 mm mark at current position")
    print("  Enter / q   accept calibration and continue")
    print("  Ctrl-C      abort")
    print()
    status()

    try:
        tty.setraw(fd)
        while True:
            ch = os.read(fd, 1).decode('utf-8', errors='replace')

            if ch in ('\r', '\n', 'q'):
                break
            elif ch == '\x03':  # Ctrl-C
                sys.stdout.write('\r\nCalibration aborted.\r\n')
                sys.exit(0)
            elif ch == 'w':
                walk('y', -step_mm);  y_mm -= step_mm
            elif ch == 's':
                walk('y',  step_mm);  y_mm += step_mm
            elif ch == 'd':
                walk('x',  step_mm);  x_mm += step_mm
            elif ch == 'a':
                walk('x', -step_mm);  x_mm -= step_mm
            elif ch == '[':
                pen_down = max(0,   pen_down - 1)
            elif ch == ']':
                pen_down = min(100, pen_down + 1)
            elif ch == '+':
                step_mm = min(50.0, step_mm * 2)
            elif ch == '-':
                step_mm = max(0.5,  step_mm / 2)
            elif ch == 't':
                test_pen()

            status()
    finally:
        termios.tcsetattr(fd, termios.TCSADRAIN, old)
        try:
            os.unlink(svg_path)
        except FileNotFoundError:
            pass

    print(f"\n\nCalibrated: offset=({x_mm:+.1f}, {y_mm:+.1f}) mm  pen_pos_down={pen_down}\n")
    return x_mm, y_mm, pen_down


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


def chunked_by_travel(flat_segs, travel_mm):
    """Split segments into chunks where each chunk's pen-down distance <= travel_mm."""
    chunks, current, current_travel = [], [], 0.0
    for seg, origin in flat_segs:
        sx1 = origin[0] + seg['from'][0]; sy1 = origin[1] + seg['from'][1]
        sx2 = origin[0] + seg['to'][0];   sy2 = origin[1] + seg['to'][1]
        dist = math.hypot(sx2 - sx1, sy2 - sy1)
        if current and current_travel + dist > travel_mm:
            chunks.append(current)
            current, current_travel = [], 0.0
        current.append((seg, origin))
        current_travel += dist
    if current:
        chunks.append(current)
    return chunks if chunks else [[]]


def dip_at_well(well, pen, axicli_path, dry_run):
    """Move arm to well position, lower pen to dip, dwell, then raise."""
    wx, wy   = well['x'], well['y']
    dip_down = well['pen_pos_down']
    dwell    = well.get('dwell_s', 0)

    # Back-and-forth 20mm sweep × 2 to load the brush before the next stroke.
    sweep = 20.0
    pts = (
        f'{wx:.4f},{wy:.4f} '
        f'{wx:.4f},{wy+sweep:.4f} '
        f'{wx:.4f},{wy:.4f} '
        f'{wx:.4f},{wy+sweep:.4f} '
        f'{wx:.4f},{wy:.4f}'
    )
    dip_svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg"'
        f' width="{BED_W}mm" height="{BED_H}mm"'
        f' viewBox="0 0 {BED_W} {BED_H}">'
        f'<polyline points="{pts}"'
        f' style="fill:none;stroke:#000000;stroke-width:0.1"/>'
        f'</svg>'
    )
    with tempfile.NamedTemporaryFile(suffix='.svg', mode='w',
                                     delete=False, prefix='axi_dip_') as f:
        f.write(dip_svg)
        svg_path = f.name
    dip_options = {
        'pen_pos_down':  dip_down,
        'speed_pendown': 10,
        'pen_pos_up':    pen['pos_up'],
        'speed_penup':   pen['speed_penup'],
    }
    print(f"  → dipping at well ({wx}, {wy}) pen_down={dip_down}")
    try:
        run_axicli(svg_path, dip_options, axicli_path, dry_run)
    finally:
        os.unlink(svg_path)
    if dwell > 0 and not dry_run:
        time.sleep(dwell)


def plot_flat(flat_segs, pen_options, pen, axicli_path, refill, dry_run,
             save_svg=False, vpype_pipeline=None):
    """Plot a flat list of (seg, origin) tuples, with automatic well dips if enabled."""
    if not flat_segs:
        return

    if refill['enabled']:
        mode = refill.get('mode', 'strokes')
        if mode == 'travel':
            chunks = chunked_by_travel(flat_segs, refill['travel_mm'])
        else:
            chunks = list(chunked(flat_segs, refill['strokes_per_dip']))
    else:
        chunks = [flat_segs]

    for idx, chunk in enumerate(chunks):
        if refill['enabled'] and (idx > 0 or refill.get('start_with_dip', False)):
            dip_at_well(refill['well'], pen, axicli_path, dry_run)

        svg = make_svg(chunk)
        if vpype_pipeline:
            svg = vpype_optimize(svg, vpype_pipeline)
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


def plot(job_path, layer_filter=None, pass_filter=None, dry_run=False, save_svg=False,
         x_offset=0.0, y_offset=0.0, pen_down_override=None, vpype_pipeline=None):
    job    = load_job(job_path)
    layers = job['layers']
    proc   = job['procedure']
    pen    = proc['pen']
    refill = proc['refill']
    passes = proc['passes']

    # vpype pipeline: CLI arg takes precedence; fall back to job JSON setting.
    if vpype_pipeline is None:
        vpype_cfg = proc.get('vpype', {})
        if vpype_cfg.get('enabled'):
            vpype_pipeline = vpype_cfg.get('pipeline', DEFAULT_VPYPE_PIPELINE)

    if layer_filter:
        layers = [l for l in layers if l['id'] in layer_filter]
        if not layers:
            sys.exit(f"No layers matched: {layer_filter}")

    if pass_filter:
        passes = [p for p in passes if p['label'] in pass_filter]
        if not passes:
            sys.exit(f"No passes matched: {pass_filter}")

    if x_offset or y_offset:
        layers = [dict(l, origin=[l['origin'][0] + x_offset,
                                   l['origin'][1] + y_offset])
                  for l in layers]

    if pen_down_override is not None:
        passes = [dict(p, pen_pos_down=pen_down_override) for p in passes]

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
        plot_flat(visible_segs, pen_options, pen, axicli_path, refill, dry_run,
                  save_svg, vpype_pipeline)

        # Hidden lines on the final pass only, at reduced pressure.
        if i == len(passes) - 1 and hidden_segs:
            print(f"  hidden lines (pen_down={max(p['pen_pos_down'] - 8, 20)})")
            hidden_options = dict(pen_options)
            hidden_options['pen_pos_down'] = max(p['pen_pos_down'] - 8, 20)
            plot_flat(hidden_segs, hidden_options, pen, axicli_path,
                      {'enabled': False}, dry_run, save_svg, vpype_pipeline)

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
    ap.add_argument('--calibrate',         action='store_true',
                    help='Run interactive calibration before plotting '
                         '(arrow keys move pen; Tab toggles XY/pen-height mode)')
    ap.add_argument('--calibrate-only',    action='store_true',
                    help='Run calibration and exit without plotting')
    ap.add_argument('--vpype',             action='store_true',
                    help='Optimize SVG with vpype before each axicli call')
    ap.add_argument('--vpype-pipeline',    default=DEFAULT_VPYPE_PIPELINE,
                    metavar='CMDS',
                    help=f'vpype pipeline string (default: {DEFAULT_VPYPE_PIPELINE!r})')
    args = ap.parse_args()

    x_off = y_off = 0.0
    pen_override = None
    if args.calibrate or args.calibrate_only:
        x_off, y_off, pen_override = calibrate(args.job, dry_run=args.dry_run)

    if not args.calibrate_only:
        plot(args.job, args.layers, args.passes, args.dry_run, args.save_svg,
             x_offset=x_off, y_offset=y_off, pen_down_override=pen_override,
             vpype_pipeline=args.vpype_pipeline if args.vpype else None)
