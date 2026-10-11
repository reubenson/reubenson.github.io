/**
 * @file Sync an Are.na channel into `src/arena/<name>/data.json`, which is the
 * source of truth for the slideshow at /arena/<name>/. The page never talks to
 * Are.na itself — the blocks are baked in at build time — so re-run this
 * whenever the channel changes, then rebuild. The sync only ever appends new
 * blocks; data.json is meant to be hand-edited, and edits are never overwritten.
 *
 *   npm run arena unda-maris
 *
 * The Are.na slug is read from `channel:` in `src/arena/<name>/index.md`, and
 * defaults to <name> when that key is absent. Only public channels are
 * reachable without a token. Requires Node 18+ (uses global fetch).
 */

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARENA_DIR = path.resolve(__dirname, '..', 'src', 'arena');
const API = 'https://api.are.na/v2/channels';
const PER = 100;

// Are.na titles an uploaded block with its filename, which is noise on screen.
const FILENAME = /\.(png|jpe?g|gif|webp|svg|pdf|mp4|m4v|mov|webm|mp3|wav|aiff?|tiff?|heic)$/i;

async function channelSlug(name) {
  const md = await readFile(path.join(ARENA_DIR, name, 'index.md'), 'utf8');
  const front = md.match(/^---\n([\s\S]*?)\n---/);
  const line = front && front[1].match(/^channel:\s*["']?([^"'\n]+?)["']?\s*$/m);
  return line ? line[1] : name;
}

async function fetchChannel(slug) {
  const contents = [];
  let page = 1, length = Infinity, meta = null;
  while (contents.length < length) {
    const res = await fetch(`${API}/${encodeURIComponent(slug)}?per=${PER}&page=${page}`);
    if (!res.ok) throw new Error(`Are.na returned ${res.status} for “${slug}”`);
    const data = await res.json();
    if (page === 1) { meta = data; length = data.length || 0; }
    const batch = data.contents || [];
    contents.push(...batch);
    // The API reports `length` for the whole channel but paginates blindly, so
    // an empty page is the only reliable stop — without it a miscount spins.
    if (!batch.length) break;
    page++;
  }
  contents.sort((a, b) => (a.position || 0) - (b.position || 0));
  return { meta, contents };
}

function pickSrc(image) {
  if (!image) return null;
  // `large` is the CDN's 1800px-inside re-encode; `original` can be several MB
  // at arbitrary dimensions, so it is only the last resort.
  for (const k of ['large', 'display', 'original']) {
    const u = image[k] && image[k].url;
    if (u) return u;
  }
  return null;
}

function toBlocks(contents) {
  const blocks = [];
  let skipped = 0;
  for (const b of contents) {
    const src = pickSrc(b.image);
    if (!src) { skipped++; continue; }
    const title = (b.title || '').trim();
    blocks.push({
      id: b.id,
      title: FILENAME.test(title) ? '' : title,
      description: (b.description || '').trim(),
      src,
      source: (b.source && b.source.url) || null,
    });
  }
  return { blocks, skipped };
}

async function main() {
  const name = process.argv[2];
  if (!name) {
    console.error('usage: npm run arena <name>   (a directory under src/arena/)');
    process.exit(1);
  }
  const slug = await channelSlug(name);
  const out = path.join(ARENA_DIR, name, 'data.json');
  const existing = await readExisting(out);
  const { meta, contents } = await fetchChannel(slug);
  const { blocks, skipped } = toBlocks(contents);
  const user = meta.user && meta.user.slug;

  // Append-only: data.json is hand-edited, so a sync never touches what is
  // already there. Blocks it doesn't know yet go on the end, in channel order;
  // known blocks, the channel header and any other keys are left as they are,
  // and a block that has left the channel stays. To drop a block from the
  // slideshow, set `"hidden": true` on it — deleting it would only bring it
  // back on the next sync.
  const data = existing || {
    channel: {
      slug,
      title: meta.title || slug,
      url: user ? `https://www.are.na/${user}/${slug}` : null,
      updated_at: meta.updated_at || null,
    },
    blocks: [],
  };
  const known = new Set(data.blocks.map((b) => b.id));
  const added = blocks.filter((b) => !known.has(b.id));
  data.blocks.push(...added);

  const rel = path.relative(process.cwd(), out);
  if (existing && !added.length) {
    console.log(`${slug}: ${rel} is up to date (${data.blocks.length} blocks)`);
    return;
  }
  await writeFile(out, JSON.stringify(data, null, 2) + '\n');
  console.log(`${slug}: added ${added.length} new block${added.length === 1 ? '' : 's'} to ${rel}` +
    ` (${data.blocks.length} total)` + (skipped ? `, ${skipped} without an image skipped` : ''));
}

// A missing file is a first sync. A file that is there but unreadable stops the
// run — overwriting it would throw away the hand edits this file exists for.
async function readExisting(file) {
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new Error(`${file} is not valid JSON (${err.message}); fix it and re-run`);
  }
  if (!data || !Array.isArray(data.blocks)) {
    throw new Error(`${file} has no "blocks" array; fix it and re-run`);
  }
  return data;
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
