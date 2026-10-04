---
# `permalink: false` keeps Eleventy from publishing this file — src/ is the
# input directory, so anything here without it becomes a page on the site.
permalink: false
---

# demos/

Single-file web toys. Each `<name>.md` is one complete page: frontmatter, a
`<style>` block, the markup, and a `<script>`. No bundler, no imports, no npm
dependency at runtime — whatever the page needs lives in the file. That
constraint is the point: a demo stays readable and editable years later, and
nothing outside it can break it.

---

## Build and serve

Eleventy reads `src/` and writes `docs/`, which is the published GitHub Pages
root, so **`docs/` is committed build output** — not a scratch directory.

```
npm run dev              # eleventy --serve → http://localhost:8080/demos/<name>/
npx @11ty/eleventy       # one-shot build
```

`src/demos/wavy.md` → `docs/demos/wavy/index.html` → `/demos/wavy/`.

A rebuild is deterministic except for `docs/shop/index.html`, which carries a
`?v={{ buildId }}` cache-buster derived from `Date.now()` and so is dirtied by
every build. Everything else is byte-stable; if `git status` shows more than
that plus your own page, something else changed.

---

## Anatomy of a demo

```markdown
---
layout: demo.njk
title: Wavy
description: A parameterized SVG generator for fields of noise-displaced lines.
year: 2026
---

<style> … </style>

<div id="app"> … </div>

<script> … </script>
```

### Layouts

| layout | what it gives you | use for |
|---|---|---|
| `demo.njk` | a bare shell — `<head>` with meta tags and fonts, then `<body class="{{ layoutType }}">{{ content }}`. No CSS, no nav, no chrome. | anything interactive. **Default for a new demo.** You own every pixel. |
| `project.njk` | full site chrome: nav, metadata block, "see more" footer | a write-up with prose |
| `card.njk` | a single framed card | signage, one-screen pieces |

### Frontmatter `demo.njk` actually reads

`title`, `description`, `keywords`, `ogImage`, `alternateUrl`, `scriptUrl`,
`scriptUrl2`, `cssUrl`, `includeGTM`, `layoutType`.

Note that **`hideSeeMore` and `year` are read only by `project.njk`.** Most
demos here carry `hideSeeMore: true` under `layout: demo.njk`, where it does
nothing — it propagated by copy-paste. Harmless, but don't add it to a new
`demo.njk` page thinking it's load-bearing.

### Notes files

`_lattice-readme.md` and `_corner-anamorphosis-notes.md` are long-form notes for
their demos — underscore-prefixed, no frontmatter. They *do* get published (as
bare HTML at `/demos/_lattice-readme/`). Add `permalink: false` if you'd rather
a notes file stayed local, the way this README does.

---

## Gotchas that actually bite

**1. Blank lines inside an HTML block.** markdown-it ends an HTML block at the
first blank line and wraps whatever follows in a paragraph, producing
`<p><div>…</div></p>`. The browser can't nest a `div` in a `p`, so it splits the
tags and you get stray empty paragraphs carrying default margins — mysterious
vertical gaps that aren't in your CSS. **Keep a markup block contiguous.**
`<style>` and `<script>` are immune: markdown-it consumes them to their closing
tag regardless of blank lines, so the JS can breathe normally.

**2. Four-space indentation** in a markdown context becomes a code block. Keep
markup indentation to three spaces or less unless it's inside a contiguous HTML
block.

**3. Headings are serif.** `_includes/open-font.njk` is in every `demo.njk`
head and sets `h1–h6 { font-family: "Ibarra Real Nova", serif }` globally. In a
monospace demo, any heading must declare `font-family` explicitly to opt back
out — the inherited serif is easy to miss and looks like a rendering bug.

**4. Typographer is on** (`markdown-it` with `typographer: true`), so in
*markdown* text `--` becomes an en dash and quotes curl. Raw HTML blocks are
untouched.

**5. `docs/` is output.** Never hand-edit it. Edit `src/`, rebuild.

---

## House style

Established by `line-drawing.md`, `lattice.md`, and `wavy.md`. Match it.

- **Page:** `monospace` 13px, `#f5f5f5` ground, `#fff` canvas, `user-select: none`.
- **Borders:** 1px, `#ccc` for surfaces and `#999` for controls. No border radius,
  no shadows, no gradients. The chrome should read as a lab instrument and stay
  out of the drawing's way.
- **Toggle buttons** carry their state in their label — `grid: on`, `occlude: off` —
  and take `.active` (black fill, white text) when on. No checkboxes.
- **A status line** in 11px `#666` under the canvas, reporting whatever the piece
  actually costs or counts.
- **A `#legend` block** at the bottom in small grey type: what the thing is, who
  it's after, what the controls do.
- **Section banners in JS:** `// ─── Name ─────…` padded out to 80 columns.
- **Comments explain why, not what.** Name the constraint that forced a choice —
  "one path per line because a self-overlapping path strokes as a single shape"
  is worth writing down; "loop over the lines" is not.

---

## Verifying without a browser

There's no headless browser in this repo and adding one isn't worth it. Two
techniques found real bugs while building Wavy — both worth reusing, and both
belong in the **session scratchpad, not the repo**.

**Extract the pure generator and render it.** Slice the deterministic functions
straight out of the `.md` by their section markers, write them to a `.mjs`, and
import it. This runs the *exact* shipped code, so it can't drift from what the
page does:

```js
const code = slice('const PARAMS = [', 'const cfg = defaultCfg();') +
             slice('function mulberry32', '// ─── Render ───') +
             '\nexport { PARAMS, defaultCfg, buildField, computeRuns, markup, exportSvg };\n';
fs.writeFileSync(modPath, code);
const g = await import(new URL('file://' + modPath).href);
```

Structuring a demo so its geometry is pure and its DOM wiring is separate is
what makes this possible — a good reason to do it anyway.

**Then look at the output.** ImageMagick is installed:

```
magick -density 160 -background white out.svg -resize 620x620 out.png
```

and read the PNG. This is the only way to catch "the maths is right but it looks
like nothing."

**Run the page's `<script>` verbatim against a stub DOM.** A ~60-line fake
`document` in `node:vm` — `getElementById` backed by a map of the ids that exist
in the markup, an `El` class with `appendChild`/`setAttribute`/`classList`/
`addEventListener` — catches every missing id, bad handler, and broken control
path, then lets you `fire('click')` on each button and assert the status line.
Make `getElementById` **throw** on an unknown id; that single assertion is what
catches markup/script drift.

---

## Checklist for a new demo

1. `src/demos/<name>.md`, `layout: demo.njk`, `title`, `description`.
2. Markup block contiguous — no blank lines inside it.
3. House style: monospace, flat borders, `name: on`/`name: off` toggles, status line.
4. Separate pure computation from DOM wiring.
5. Declare `font-family` on any heading.
6. If it generates art, make what's on screen *be* the export — same builder, one
   code path. Divergence between preview and output is the classic failure here.
7. Put the parameters in one declarative table and generate the UI from it (see
   Wavy's `PARAMS`); serialize non-defaults into `location.hash` so a
   configuration is a link.
8. `npx @11ty/eleventy`, then check `git status` shows only your page plus
   `docs/shop/index.html`.
9. Credit the source if the piece is after someone — link it in the `#legend`.

---

## The demos

| file | what it is |
|---|---|
| `wavy.md` | parameterized SVG generator: fields of noise-displaced lines (below) |
| `arena.md` | slideshow driven live by any public Are.na channel — channel order, Ken Burns drift, captions from the block descriptions |
| `lattice.md` | a 3×3×3 just-intonation pitch lattice, three voices walking it; sine drones in-page, and Web MIDI out (one channel per voice, pitch bend carrying the microtuning) to drive an external synth |
| `line-drawing.md` | grid line editor that exports SVG *and* KiCad PCB artwork |
| `corner-anamorphosis.md` | projection that resolves into an image from one viewpoint |
| `html-review.md` | typographic poems animated by the wind (published as *airs*) |
| `randy.md` | signage card for a bar |
| `poem-1.md`, `poem-2.md` | concrete poems; `poem-2` is also included into a talk |

---

# Wavy: how it works

After [*way wavy way*](https://turtletoy.net/turtle/65cb465053) by ge1doot. A
stack of horizontal lines, each pushed off its baseline by a shared 2D noise
field, drawn at low opacity so the *overlap* — not any single line — draws the
form. The original is a fixed turtle; this is the same generator with every
constant pulled out as a parameter, plus hidden-line removal.

## The field equation

For line `i ∈ [0, N)` sampled at column `j ∈ [0, S)`, with `u = j/(S−1)` running
0→1 across the page:

```
x(j) = margin + u · (width − 2·margin)

y(i,j) = height/2                       ← page centre
       + (i − (N−1)/2) · spacing        ← baseline drift, centred on the page
       + (F(x*·k, i·kᵧ) − ½) · A · E(u) ← noise displacement
```

where `F` is the fractal noise below, `A` is `amplitude`, and `E` the envelope.

Three details in that middle line matter:

- **The stack is centred** (`i − (N−1)/2`) rather than growing downward from
  `i·spacing`. Without it, changing `lines` walks the drawing off the page and
  every other parameter has to be re-found.
- **The y coordinate of the noise is the line *index*, not a distance.** That's
  ge1doot's original, and it's the more useful choice: `scale y` then sets how
  fast the field decorrelates *from line to line*, so adding lines subdivides
  the same field rather than stretching it. It's also why `scale x` and
  `scale y` at the same value don't look isotropic.
- **`− ½` centres the displacement**, so `amplitude` grows the field about the
  baseline instead of dragging it downward.

## The noise

`F` is Perlin gradient noise. For a point `(x,y)`, take the unit cell it falls
in, `X = ⌊x⌋ & 255`, `Y = ⌊y⌋ & 255`, and the fractional offset within it.

**Gradients.** Each of the four cell corners gets a pseudo-random gradient
vector, chosen by hashing the corner's coordinates through a table `p`. Only two
bits of the hash are used, selecting from the four axis-aligned unit vectors
`(±1,0), (0,±1)`:

```js
grad2d(i, x, y) {
  const v = (i & 1) === 0 ? x : y;   // dot with (1,0) or (0,1)
  return (i & 2) === 0 ? -v : v;     // …or its negation
}
```

The dot product of a gradient with the offset vector is what makes this
*gradient* noise rather than value noise: every lattice point is a zero crossing
with a random slope through it, which is why the result has no visible grid of
blobs.

**Interpolation.** The four corner contributions are blended with the smoothstep
weight `f(t) = 3t² − 2t³`, whose first derivative vanishes at 0 and 1 — so the
field is C¹ continuous across cell boundaries and the lines have no kinks.

**Fractal sum (fBm).** Octaves at halving amplitude and doubling frequency:

```
F(x,y) = ( Σᵢ₌₁..n  2⁻ⁱ · (1 + noise2d(2ⁱ⁻¹x, 2ⁱ⁻¹y))/2 )  /  Σᵢ₌₁..n 2⁻ⁱ
```

Low octaves give the broad shape, high octaves the fine tremble — but only up to
a ceiling. At the defaults the page spans just **2 noise cells in x**, so octave
*i* draws `2·2^(i−1)` cells across it. Past octave 5 that's under 4 samples per
cell at `samples: 201`, and past octave 7 adjacent lines are more than half a
cell apart in y and stop reading as one surface. Amplitude shares run 50%, 25%,
12.5%, 6.3%, 3.1%, 1.6%, 0.8%, 0.4%, and measured curvature per line stops
rising between 7 and 8 — that flattening is the aliasing ceiling. Octaves 6–8
add fuzz, not structure. The thresholds move with `scaleX`, `scaleY` and
`samples`: useful octaves ≈ `1 + log₂(samples / (4 · width · scaleX))`.

Note also that octaves change *texture, not extent*. Band height goes 79.5mm →
67.7mm across 1→8 octaves — it shrinks slightly, since high-frequency components
rarely peak together. That's the normalizing divisor below doing its job.

That trailing division is an addition to the original. The raw sum of `n`
octaves reaches only `1 − 2⁻ⁿ`, so dropping from 6 octaves to 2 would silently
shrink the drawing by 25%. Dividing it out makes `amplitude` mean the same thing
at every octave count, so the two knobs stay independent.

**`seed`.** The table `p` is filled from a seeded PRNG (mulberry32) rather than
`Math.random`, so a given seed always redraws the same field and a link can
reproduce a drawing exactly.

## Two quirks inherited from the original, kept deliberately

**`p` is random bytes, not a shuffled permutation.** Textbook Perlin uses a
permutation of 0…255 duplicated to 512. Here each entry is independent, so hash
collisions are more likely and neighbouring corners occasionally share a
gradient. That slight bias is part of the look — don't "fix" it without
comparing renders.

**The noise doesn't tile.** `X` is masked to 255 but its neighbour `X+1` isn't,
so at `X = 255` the lookup runs off to `p[256]` instead of wrapping to `p[0]`.
Fine as-is; it matters only if someone adds a seamless/tileable mode, which
would need the mask applied to both.

**Realized range is narrower than [0,1].** A sum of smooth noise rarely reaches
its extremes: at the defaults the field occupies about `0.36 · amplitude`, so
`amplitude: 200` on a 200mm page draws a band roughly 71mm tall rather than
filling it. Expected, not a bug — reach for `amplitude` well past the page size
when you want full bleed.

## Domain warping

`warp` displaces *where the field is sampled* using a second, independent noise
field, at half frequency so it pushes broadly instead of jittering:

```
x* = x + (F₂(…) − ½) · warp
```

Composing noise with a noisy coordinate transform is what turns smooth banding
into something that folds back on itself and reads as fabric or sand.

## The envelope

```
E(u) = sin(πu)^envelope
```

At `envelope = 0` this is `sin⁰ = 1` everywhere — one knob, off by being zero,
no branch in the parameter space. Above zero it pinches the field shut at both
edges, so the stack resolves out of turbulence back into plain parallel rules.

## The celeste layer

An optional second term, summed into `y` alongside the noise: two ranks of a
sine wave detuned against each other, after the organ stop. It exists because
noise alone **cannot beat** — beating is a phase phenomenon between coherent
periodic components, and Perlin noise has randomized phase at every lattice
cell. Two noise fields at 3:2 give lumpier noise, never an envelope or a null.
So the undulation needs a genuinely periodic pair, which is also the
architecture of the *Unda Maris* device itself: a sine pair per voice.

```
sin θ + sin(θ·r)  =  2 · sin(θ(1+r)/2) · cos(θ(r−1)/2)
                     └─ carrier at the mean ─┘ └─ envelope at half the difference ─┘
```

Where the envelope crosses zero the ranks cancel, the whole stack collapses to
unison, and a **node** prints as a line of stillness across the drawing.

**Detune is carried in cents**, `r = 2^(cents/1200)`, not as an absolute offset.
That's what makes the beat rate scale with the carrier — double the frequency
and the beating doubles with it. An offset in raw units would lose the property.

### Why the ratio acts on the stack, not on x

This is the load-bearing choice, and it isn't obvious. Writing `δ = r − 1`, the
count of nulls across the drawing is:

```
ratio on x        nulls ≈ cycles · δ
ratio on stack    nulls ≈ lines · δ / period
```

A celeste works over *hundreds* of cycles — 2Hz against 440Hz, heard over
seconds. A page affords maybe 40 visible cycles along a line before the
wavelength drops under the pen width. At a true 14¢ organ detune (δ ≈ 0.008)
that is **0.2 nulls across the entire drawing** — measured, and it renders as a
uniform plaid with no undulation anywhere. Raise the detune until a node appears
and you are at ~100¢, a semitone: it has stopped being a detune and become an
interval.

The stack is where the headroom is. 600 lines at 4 per cycle is 150 cycles,
roughly four times what a line affords, and the requirement `lines/period ≳ 1/δ`
(123 at 14¢) comes within reach. The `unda maris` preset is exactly that
configuration, and its node lands where `cos(π·(i/period)·δ) = 0` predicts —
line 247 of 600 — so it is the beat and not an artifact of centring the stack.

The stack is also the right axis conceptually: `i` reads as time, which is what
binaural beating is, and the nulls arrive as horizontal lines that meander with
the terrain rather than as an illustration laid over it.

### drift

With the `drift` toggle the detune is driven by a third noise field instead of
held constant, so the ranks open out and close back to unison — noise stops
being the terrain and becomes the modulator. The modulator runs at 2 octaves
deliberately: it wants to be a slow swell, not weather.

### Limits

`period` is lines-per-cycle down the stack, so it hits **the same Nyquist
ceiling as the octaves** — below about 3 lines per cycle the vertical wave is
sampled too coarsely to hold together. `period: 4` in `unda maris` is at that
edge, and the moiré in it is the limit showing. Likewise `samples` has to keep
up with `cycles x`, or the carrier aliases along the line.

The envelope multiplies the celeste along with the noise (`(h·A + cel)·env`),
or the edges would keep ringing after the noise had been pinched shut.

## Occlusion

The optional hidden-line pass reads the stack as terrain lit from the front: the
last line is nearest the viewer, and any line hides whatever falls below its
crest. One back-to-front scan over a per-column horizon does it:

```js
const horizon = new Float64Array(S).fill(Infinity);
for (let i = rows.length - 1; i >= 0; i--)     // front (nearest) first
  for (let j = 0; j < S; j++)
    if (ys[j] < horizon[j]) horizon[j] = ys[j];  // visible, and it raises the skyline
    // else: buried — end the current run
```

Contiguous surviving samples become runs; a line can break into many. This is
cheap — O(N·S), immeasurable next to building the field — **because every line
is sampled at the same x positions.** That's why the geometry is stored as one
shared `xs` array plus a `Float64Array` of y per line rather than as lists of
points. Keep that invariant if you extend the generator; per-line x positions
would mean a real hidden-line algorithm instead of an array scan.

Turning it on converts the transparent weave into a solid draped surface — the
single biggest lever in the whole parameter space.

## Why one `<path>` per line

A self-overlapping path strokes as *one* shape, so overlaps within a single
element don't accumulate and `stroke-opacity` stops meaning anything. Since
tonal build-up from overlap is the entire subject of the piece, each line gets
its own element and composites separately. Runs belonging to the same line are
disjoint in x, so grouping *those* into one path costs nothing — that's the
compromise that keeps the element count at `lines` rather than `strokes`.

## Structure, if you're extending it

- **`PARAMS`** is the single source of truth. The sidebar, the defaults, the
  clamping, and the URL serialization are all generated from it. A new knob is
  one line there plus one use of `cfg.<id>` in `buildField()`.
- **Booleans live in `TOGGLES`** because they render as buttons, not sliders.
- **`buildField` → `computeRuns` → `markup`** is the whole pipeline, all pure.
  Only `render()` and below touch the DOM.
- **The SVG on screen is the export** — same `markup()`, same geometry. Preserve
  that; it's the reason the tuning is trustworthy.
- **Renders are coalesced to one per animation frame.** At the heavy end a
  rebuild is tens of milliseconds — measured warm in node, the `dunes` preset
  costs ~20ms in `buildField` (6 octaves plus a second warp field) and `weave`
  ~30ms in `markup` (96k points of string building); `computeRuns` doesn't
  register. The status line reports the real figure, so the cost of a knob is
  visible while you turn it.
