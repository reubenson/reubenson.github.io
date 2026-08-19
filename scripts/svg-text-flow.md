# svg-text-flow

Pour a block of text into a monospaced character grid, using the filled areas of
an SVG as whitespace. The SVG may hold any number of closed forms, and those
forms may have holes.

- `scripts/lib/svg-text-flow.js` — the tool. No I/O, no site knowledge.
- `scripts/svg-text-flow.js` — CLI, for previewing in the terminal.
- `shapedText` paired shortcode in `.eleventy.js` — for putting it on a page.
- `src/styles/components/_shaped-text.scss` — presentation.
- `masks/` — the SVGs. Build inputs, not site assets, so nothing here is published.

## Why a grid

CSS can flow text around a non-rectangular shape (`shape-outside` on a float),
but only ever against one edge of a column: a float attaches to a container edge,
so it can't put whitespace in the *middle* of a block with words running down both
sides of it. `shape-inside`, the property that would have done that, was pulled
from Blink and WebKit in 2014 and never came back.

On a monospaced grid the problem changes shape. One character is one cell, the
mask is a bitmap, and a row can break into as many separate runs as the drawing
calls for. Multiple disjoint forms and interior holes come for free. Monospace is
also what makes the build-time result exact — nothing has to be measured, so what
the tool computes is what the browser draws.

## Workflow

**1. Draw the mask.** Any SVG with a `viewBox`. Understood: `path`, `rect`
(including `rx`/`ry`), `circle`, `ellipse`, `polygon`, `polyline`, `g`, arbitrary
nested `transform` attributes, and `fill-rule`. Ignored: `defs`, `clipPath`,
`mask`, `filter`, `style`, anything with `fill="none"` or `display="none"`.
Strokes are not filled — a stroked outline encloses no area, so outline it in
your editor first. `<use>` is not resolved and warns.

A hole needs one path with two subpaths, not two elements. Two `<circle>`s are a
union; an annulus is a single path whose inner subpath is either wound the
opposite way (`fill-rule="nonzero"`) or wound the same way with
`fill-rule="evenodd"`. See `masks/demo-forms.svg`.

**2. Look at the grid.** `--mask` prints occupancy directly — `#` is whitespace,
`.` is available to text. Faster to read than the shaped text when you're still
deciding whether a form reads at all.

```sh
node scripts/svg-text-flow.js masks/demo-forms.svg --cols 84 --mask
```

**3. Pour text in and tune.**

```sh
node scripts/svg-text-flow.js masks/demo-forms.svg --cols 84 --text-file poem.txt
cat poem.txt | node scripts/svg-text-flow.js masks/demo-forms.svg --cols 84
```

`cols` is the one number that matters. Everything else — the row count, the type
size on the page — follows from it. The tool reports how much text fit and warns
in both directions, because both failures are silent otherwise: a dropped tail
just looks like a shorter poem.

**4. Put it on a page.** Use the numbers you settled on.

```njk
{% shapedText "demo-forms", cols=84, repeat=true, class="project-grid-item-full" %}
Suppose instead that you are perched on a dock facing the sea, gently
overlapping pulses against the shoreline of your hearing.

And like water itself, it has its attendant risks.
{% endshapedText %}
```

The body must be **plain text**. It lands in a `<pre>`, so markdown syntax inside
it would render as literal characters. A blank line starts a new paragraph, which
begins on a fresh grid row.

## Options

| CLI | Shortcode | Default | |
|---|---|---|---|
| `--cols` | `cols` | `72` | Grid width in characters. |
| `--rows` | `rows` | *derived* | Grid height. Defaults to whatever preserves the SVG's aspect ratio. |
| `--threshold` | `threshold` | `0.5` | Cell coverage needed to count as masked. Same knob as CSS `shape-image-threshold`: lower grows the whitespace, higher lets text crowd the outline. |
| `--min-run` | `minRun` | `3` | Shortest run of free cells that may hold text. Raise it to stop fragments appearing in narrow gaps. |
| `--invert` | `invert` | `false` | Flow text *inside* the forms instead of around them. |
| `--repeat` | `repeat` | `false` | Loop the text until the grid is full. |
| `--no-justify` | `justify: false` | justified | Justification pads gaps so each line fills its run exactly, which is what makes the silhouette read as a hard edge. A paragraph's last line is always set flush. |
| `--advance` | `advance` | `0.6` | Advance width of the monospace font, in em. |
| `--line-height` | `lineHeight` | `1.15` | Line height as a multiple of font size. |
| `--super-sample` | `superSample` | `4` | Sub-rows sampled per cell when rasterizing. |
| `--mask` | — | | Print occupancy instead of text. |
| `--html` | — | | Print the full HTML block. |

## The one thing that can silently skew the drawing

A cell is `advance` wide and `lineHeight` tall, in em — it is not square. The row
count is derived from that ratio, which is what keeps a circle in the SVG from
arriving on the page as an ellipse. So the CSS has to use the same two numbers the
mask was rasterized with.

That's wired so it can't drift: the tool emits `--shaped-text-cols`,
`--shaped-text-advance` and `--shaped-text-line-height` onto the block, and the
stylesheet computes `font-size` from them —

```
font-size: 100cqi / (cols × advance)
```

— so the grid fills the container's width exactly, at any width, capped by
`--shaped-text-max-size`. It cannot reflow, because the line breaks are baked in;
it scales instead. The consequence is that a narrow viewport gets small type
rather than a rewrapped shape. If that matters, use fewer `cols`.

Change `--shaped-text-font` and you must change `advance` to match. Common values,
as a fraction of the em: Courier New, Courier, Menlo, Monaco, SF Mono, IBM Plex
Mono, JetBrains Mono and Andale Mono are all `0.6`; DejaVu Sans Mono is `0.602`.
`0.6` is close to universal but worth verifying.

## Accessibility

The shaped block is decorative typography. A screen reader working through the
grid would get the text sliced into fragments by the mask, so the `<pre>` is
`aria-hidden` and the unbroken prose is carried alongside it in a
`.visually-hidden` paragraph.

## Known limits

- **Greedy line breaking.** The runs vary in width, which is exactly the case
  where optimal breaking pays off. `tex-linebreak` accepts a per-line width array
  and this produces one, so the swap is confined to `flowText()`. Greedy is
  legible and debuggable, and in a shaped block the ragged fill reads as texture
  rather than as a defect.
- **No hyphenation dictionary.** Words are broken only when one cannot fit an
  empty run, and then only on character count. `hyphenopoly` or `hypher` would
  slot in at the same seam and would matter more as runs get narrower.
- **Paragraph breaks surrender the rest of their row**, so some runs go unfilled.
  That's the cost of paragraphs starting cleanly; pass `paragraphBreaks: false` to
  flow continuously instead.
- **Strokes are not filled**, and `<use>` is not resolved.
