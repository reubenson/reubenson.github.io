#!/usr/bin/env node
/**
 * Normalize lightbox product photos so white balance and exposure match
 * across shots and sessions.
 *
 * How it works: the lightbox background should always be the same neutral
 * tone. For each image we sample background patches (the corners by default),
 * then scale each RGB channel in *linear light* so the background lands on a
 * fixed neutral target. Same background in → same background out, which pulls
 * the object's color and exposure into line too.
 *
 * Requirements (macOS): ImageMagick (`magick`) and the built-in `sips`, which
 * decodes HEIC/RAW and converts Display P3 → sRGB before processing.
 *
 * Usage:
 *   node scripts/normalize-photos.mjs <file|dir> [...] [options]
 *
 * Options:
 *   --out <dir>        Output directory (default: <first input dir>/normalized)
 *   --target <0-255>   Background brightness to aim for (default 240)
 *   --sample <spec>    Where to sample background, as fractions of the frame.
 *                      "corners" (default), "top", or "x,y,w,h" (e.g. "0,0,1,0.1")
 *   --patch <0-1>      Corner patch size as a fraction of the short side (default 0.08)
 *   --max <px>         Resize so the long edge is at most this (default 2400; 0 = keep)
 *   --square           Center-crop to a square
 *   --contrast <n>     Gentle S-curve strength, e.g. 2 (default 0 = off)
 *   --quality <n>      JPEG quality (default 86)
 *   --dry-run          Only print measurements and the gains that would be applied
 */
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';

const IMAGE_EXT = new Set([
  '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.heic', '.heif',
  '.dng', '.cr2', '.cr3', '.nef', '.arw', '.raf', '.orf', '.rw2',
]);
const SRGB_PROFILE = '/System/Library/ColorSync/Profiles/sRGB Profile.icc';

// ---------- args ----------
const argv = process.argv.slice(2);
const opts = {
  out: null, target: 240, sample: 'corners', patch: 0.08,
  max: 2400, square: false, contrast: 0, quality: 86, dryRun: false,
};
const inputs = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  const next = () => argv[++i];
  switch (a) {
    case '--out': opts.out = next(); break;
    case '--target': opts.target = Number(next()); break;
    case '--sample': opts.sample = next(); break;
    case '--patch': opts.patch = Number(next()); break;
    case '--max': opts.max = Number(next()); break;
    case '--square': opts.square = true; break;
    case '--contrast': opts.contrast = Number(next()); break;
    case '--quality': opts.quality = Number(next()); break;
    case '--dry-run': opts.dryRun = true; break;
    case '-h': case '--help':
      console.log('See header comment in scripts/normalize-photos.mjs'); process.exit(0);
    default:
      if (a.startsWith('--')) { console.error(`Unknown option ${a}`); process.exit(1); }
      inputs.push(a);
  }
}
if (!inputs.length) {
  console.error('Usage: node scripts/normalize-photos.mjs <file|dir> [...] [--dry-run] [--out dir]');
  process.exit(1);
}

const files = inputs.flatMap((p) => {
  const abs = resolve(p);
  if (statSync(abs).isDirectory()) {
    return readdirSync(abs)
      .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()) && !f.startsWith('.'))
      .sort()
      .map((f) => join(abs, f));
  }
  return [abs];
});
const firstDir = statSync(resolve(inputs[0])).isDirectory() ? resolve(inputs[0]) : dirname(resolve(inputs[0]));
const outDir = resolve(opts.out ?? join(firstDir, 'normalized'));

// ---------- helpers ----------
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** sRGB-encoded [0,1] → linear [0,1] */
const toLinear = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

/** Decode anything sips understands (HEIC, RAW, P3 JPEG…) to a 16-bit sRGB TIFF. */
function decodeToSrgb(file, workDir) {
  const out = join(workDir, `${basename(file, extname(file))}.tif`);
  run('sips', ['-s', 'format', 'tiff', '--matchTo', SRGB_PROFILE, file, '--out', out]);
  return out;
}

/** Patches to sample, in pixels, for an image of w×h. */
function samplePatches(w, h) {
  if (opts.sample === 'corners') {
    const s = Math.max(8, Math.round(Math.min(w, h) * opts.patch));
    const m = Math.round(s * 0.25); // small inset to avoid vignetting at the very edge
    return [
      [m, m], [w - s - m, m], [m, h - s - m], [w - s - m, h - s - m],
    ].map(([x, y]) => ({ x, y, w: s, h: s }));
  }
  if (opts.sample === 'top') {
    return [{ x: Math.round(w * 0.05), y: Math.round(h * 0.02), w: Math.round(w * 0.9), h: Math.round(h * 0.08) }];
  }
  const [fx, fy, fw, fh] = opts.sample.split(',').map(Number);
  return [{ x: Math.round(fx * w), y: Math.round(fy * h), w: Math.round(fw * w), h: Math.round(fh * h) }];
}

/** Mean linear RGB of a patch. */
function measure(file, p) {
  const out = run('magick', [
    file, '-crop', `${p.w}x${p.h}+${p.x}+${p.y}`, '+repage', '-colorspace', 'RGB',
    '-format', '%[fx:mean.r] %[fx:mean.g] %[fx:mean.b]', 'info:',
  ]);
  return out.split(/\s+/).map(Number);
}

// ---------- main ----------
if (!opts.dryRun) mkdirSync(outDir, { recursive: true });
const workDir = mkdtempSync(join(tmpdir(), 'normalize-photos-'));
const targetLin = toLinear(opts.target / 255);

console.log(`${opts.dryRun ? '[dry run] ' : ''}${files.length} image(s) → ${opts.dryRun ? '(no output)' : outDir}`);
console.log(`target background: ${opts.target}/255, sampling: ${opts.sample}\n`);

try {
  for (const file of files) {
    const name = basename(file);
    try {
      const src = decodeToSrgb(file, workDir);
      const [w, h] = run('magick', [src, '-format', '%w %h', 'info:']).split(' ').map(Number);

      const samples = samplePatches(w, h).map((p) => measure(src, p));
      // Per-channel median across patches: robust if one corner catches the object or a shadow.
      const bg = [0, 1, 2].map((c) => median(samples.map((s) => s[c])));
      const gains = bg.map((v) => targetLin / Math.max(v, 1e-4));

      // Warn when corners disagree a lot (object in a corner, uneven light, wrong --sample).
      const lum = samples.map(([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b);
      const spread = Math.max(...lum) / Math.max(Math.min(...lum), 1e-4);

      const bgSrgb = bg.map((v) => Math.round(255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055)));
      console.log(
        `${name.padEnd(36)} bg rgb(${bgSrgb.join(',')})  gains ${gains.map((g) => g.toFixed(2)).join(' / ')}` +
        (spread > 1.35 ? `  ⚠ patches differ ${(spread).toFixed(2)}×` : ''),
      );
      if (opts.dryRun) continue;

      const args = [
        src, '-colorspace', 'RGB',
        '-channel', 'R', '-evaluate', 'multiply', gains[0].toFixed(5),
        '-channel', 'G', '-evaluate', 'multiply', gains[1].toFixed(5),
        '-channel', 'B', '-evaluate', 'multiply', gains[2].toFixed(5),
        '+channel', '-colorspace', 'sRGB',
      ];
      if (opts.contrast > 0) args.push('-sigmoidal-contrast', `${opts.contrast}x50%`);
      if (opts.square) {
        const s = Math.min(w, h);
        args.push('-gravity', 'center', '-crop', `${s}x${s}+0+0`, '+repage');
      }
      if (opts.max > 0) args.push('-resize', `${opts.max}x${opts.max}>`);
      args.push(
        '-depth', '8', '-strip', '-profile', SRGB_PROFILE,
        '-sampling-factor', '4:2:0', '-interlace', 'Plane', '-quality', String(opts.quality),
        join(outDir, `${basename(file, extname(file))}.jpg`),
      );
      run('magick', args);
    } catch (err) {
      console.error(`${name}: failed — ${err.stderr?.toString().trim() || err.message}`);
    }
  }
} finally {
  rmSync(workDir, { recursive: true, force: true });
}
