#!/usr/bin/env node
/**
 * CLI for scripts/lib/svg-text-flow.js — pour text into the negative space of an
 * SVG on a monospaced character grid.
 *
 *   node scripts/svg-text-flow.js mask.svg --text-file poem.txt --cols 72
 *   node scripts/svg-text-flow.js mask.svg --text "..." --mask     # see the grid
 *   node scripts/svg-text-flow.js mask.svg --text-file poem.txt --html
 *   cat poem.txt | node scripts/svg-text-flow.js mask.svg
 *
 * Preview in the terminal until the drawing reads the way you want, then use the
 * same numbers in the `shapedText` shortcode.
 */

const fs = require('fs');
const path = require('path');
const { flowTextIntoSvg, toHtml } = require('./lib/svg-text-flow');

const FLAGS = {
  cols: 'number',
  rows: 'number',
  advance: 'number',
  'line-height': 'number',
  threshold: 'number',
  'super-sample': 'number',
  'min-run': 'number',
  'max-font-size': 'string',
  text: 'string',
  'text-file': 'string',
  invert: 'boolean',
  repeat: 'boolean',
  justify: 'boolean',
  html: 'boolean',
  mask: 'boolean',
  quiet: 'boolean',
};

function parseArgs(argv) {
  const opts = {};
  const positional = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }

    let name = arg.slice(2);
    let negated = false;
    if (name.startsWith('no-') && FLAGS[name.slice(3)] === 'boolean') {
      name = name.slice(3);
      negated = true;
    }

    const kind = FLAGS[name];
    if (!kind) throw new Error(`unknown option --${name}`);

    if (kind === 'boolean') {
      opts[name] = !negated;
    } else {
      const value = argv[++i];
      if (value == null) throw new Error(`--${name} needs a value`);
      if (kind === 'number') {
        const n = Number(value);
        if (Number.isNaN(n)) throw new Error(`--${name} needs a number, got "${value}"`);
        opts[name] = n;
      } else {
        opts[name] = value;
      }
    }
  }

  return { opts, positional };
}

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

function main() {
  let opts;
  let positional;
  try {
    ({ opts, positional } = parseArgs(process.argv.slice(2)));
  } catch (err) {
    console.error(`svg-text-flow: ${err.message}`);
    process.exit(2);
  }

  const svgPath = positional[0];
  if (!svgPath) {
    console.error('usage: node scripts/svg-text-flow.js <svg> [--text "..." | --text-file <path>] [options]');
    console.error(`options: ${Object.keys(FLAGS).map((f) => `--${f}`).join(' ')}`);
    process.exit(2);
  }

  let svg;
  try {
    svg = fs.readFileSync(path.resolve(svgPath), 'utf8');
  } catch (err) {
    console.error(`svg-text-flow: cannot read ${svgPath}: ${err.message}`);
    process.exit(1);
  }

  let text = opts.text;
  if (opts['text-file']) text = fs.readFileSync(path.resolve(opts['text-file']), 'utf8');
  if (text == null && !process.stdin.isTTY) text = readStdin();
  if (!text && !opts.mask) {
    console.error('svg-text-flow: no text given (use --text, --text-file, or pipe it in)');
    process.exit(2);
  }

  let result;
  try {
    result = flowTextIntoSvg({
      svg,
      text: text || '',
      cols: opts.cols,
      rows: opts.rows,
      advance: opts.advance,
      lineHeight: opts['line-height'],
      threshold: opts.threshold,
      superSample: opts['super-sample'],
      minRun: opts['min-run'],
      invert: opts.invert,
      repeat: opts.repeat,
      justify: opts.justify,
    });
  } catch (err) {
    console.error(`svg-text-flow: ${err.message}`);
    process.exit(1);
  }

  if (opts.mask) {
    // '#' is masked (whitespace in the output), '.' is available to text
    for (let row = 0; row < result.rows; row++) {
      let line = '';
      for (let col = 0; col < result.cols; col++) {
        line += result.mask[row * result.cols + col] ? '#' : '.';
      }
      process.stdout.write(`${line}\n`);
    }
  } else if (opts.html) {
    process.stdout.write(`${toHtml(result, { text, maxFontSize: opts['max-font-size'] })}\n`);
  } else {
    process.stdout.write(`${result.lines.map((l) => l.replace(/\s+$/, '')).join('\n')}\n`);
  }

  if (!opts.quiet) {
    const s = result.stats;
    const words = s.loops
      ? `${s.wordsPlaced} words placed (${s.wordsTotal} in source, looped ${s.loops}×)`
      : `${s.wordsPlaced}/${s.wordsTotal} words`;
    console.error(
      `\n${result.cols}×${result.rows} grid · ${s.shapes} shape(s) · ${words} · ` +
        `${s.runsUsed}/${s.runsTotal} runs filled`
    );
    for (const w of result.warnings) console.error(`  warning: ${w}`);
  }
}

main();
