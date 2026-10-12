---
layout: demo.njk
title: Arena
description: A configurable slideshow driven by any public Are.na channel.
year: 2026
---

<style>
* { box-sizing: border-box; }

[hidden] { display: none !important; }

html, body {
  margin: 0;
  height: 100%;
  background: #000;
  font-family: monospace;
  font-size: 13px;
  user-select: none;
  overflow: hidden;
}

/* ─── Stage ─────────────────────────────────────────────────────────────── */

#stage {
  position: fixed;
  inset: 0;
  background: #000;
  overflow: hidden;
}

#stage.idle { cursor: none; }

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  opacity: 0;
  will-change: transform, opacity;
}

#stage.cover .layer { object-fit: cover; }

#message {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: #999;
  line-height: 1.6;
  white-space: pre-line;
}

/* ─── Caption ───────────────────────────────────────────────────────────── */

#caption {
  position: absolute;
  left: 50%;
  bottom: 6vh;
  transform: translateX(-50%);
  width: min(46em, calc(100vw - 48px));
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 14px;
  background: rgba(0, 0, 0, 0.66);
  color: #fff;
  text-align: center;
  text-wrap: balance;
}

#cap-title {
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #999;
}

#cap-body {
  font-size: 15px;
  line-height: 1.45;
}

/* ─── Panel ─────────────────────────────────────────────────────────────── */

#panel {
  position: absolute;
  top: 12px;
  left: 12px;
  width: 246px;
  max-height: calc(100vh - 24px);
  overflow-y: auto;
  padding: 10px;
  background: #f5f5f5;
  border: 1px solid #ccc;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: opacity 180ms linear;
}

#stage.idle #panel { opacity: 0; pointer-events: none; }

.row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.row .head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.row .val { color: #666; }

input[type=range] { width: 100%; margin: 0; }

input[type=text] {
  width: 100%;
  font: inherit;
  padding: 2px 4px;
  background: #fff;
  border: 1px solid #999;
}

#toggles {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

button {
  font: inherit;
  padding: 2px 6px;
  background: #fff;
  color: #000;
  border: 1px solid #999;
  cursor: pointer;
}

button.active { background: #000; color: #fff; }

#transport { display: flex; gap: 4px; }
#transport button { flex: 1 1 auto; }

#status {
  font-size: 11px;
  color: #666;
  line-height: 1.5;
}

#progress {
  height: 2px;
  background: #ddd;
  border: 1px solid #ccc;
  border-width: 1px 0;
}

#progress > div {
  height: 100%;
  width: 0;
  background: #000;
}

#legend {
  font-size: 11px;
  color: #999;
  line-height: 1.5;
  border-top: 1px solid #ccc;
  padding-top: 8px;
}

#legend a { color: #666; }
</style>

<div id="stage">
  <img class="layer" id="layer-a" alt="">
  <img class="layer" id="layer-b" alt="">
  <div id="message">loading…</div>
  <div id="caption" hidden>
    <div id="cap-title"></div>
    <div id="cap-body"></div>
  </div>
  <div id="panel">
    <div id="controls"></div>
    <div id="toggles"></div>
    <div id="transport">
      <button id="prev" title="left arrow">prev</button>
      <button id="play" title="space">pause</button>
      <button id="next" title="right arrow">next</button>
    </div>
    <div id="progress"><div id="progress-fill"></div></div>
    <div id="status"></div>
    <div id="legend">A slideshow of any public <a href="https://www.are.na" target="_blank" rel="noopener">Are.na</a> channel, in channel order, with a Ken Burns drift on each block. Keys: <b>←/→</b> step, <b>space</b> pause, <b>f</b> fullscreen, <b>c</b> captions, <b>h</b> hide panel. Non-default settings are written to the URL, so a configuration is a link.</div>
  </div>
</div>

<script>
// ─── Config ───────────────────────────────────────────────────────────────
// PARAMS is the single source of truth: the panel, the defaults, the clamping
// and the URL round-trip are all generated from it. A new knob is one entry
// here plus one use of cfg.<id>.

const PARAMS = [
  { id: 'channel',  type: 'text',  def: 'unda-maris', label: 'channel' },
  { id: 'interval', type: 'range', def: 5,   min: 1, max: 30,   step: 0.5, unit: 's'  },
  { id: 'fade',     type: 'range', def: 800, min: 0, max: 3000, step: 50,  unit: 'ms' },
  { id: 'zoom',     type: 'range', def: 6,   min: 0, max: 30,   step: 1,   unit: '%'  },
  { id: 'pan',      type: 'range', def: 3,   min: 0, max: 15,   step: 0.5, unit: '%'  },
];

const TOGGLES = [
  { id: 'captions', def: true  },
  { id: 'titles',   def: true  },
  { id: 'cover',    def: false },
  { id: 'shuffle',  def: false },
  { id: 'loop',     def: true  },
];

const API = 'https://api.are.na/v2/channels';
const PER = 100;
const CACHE_TTL = 10 * 60 * 1000;
const IDLE_MS = 2500;

// Are.na titles an uploaded block with its filename, which is noise on screen.
const FILENAME = /\.(png|jpe?g|gif|webp|svg|pdf|mp4|m4v|mov|webm|mp3|wav|aiff?|tiff?|heic)$/i;

function defaultCfg() {
  const c = {};
  for (const p of PARAMS) c[p.id] = p.def;
  for (const t of TOGGLES) c[t.id] = t.def;
  return c;
}

function clampParam(p, v) {
  if (p.type === 'text') return String(v).trim();
  v = Number(v);
  if (!isFinite(v)) return p.def;
  return Math.min(p.max, Math.max(p.min, v));
}

// ─── URL round-trip ───────────────────────────────────────────────────────
// Only non-defaults are serialized, so a stock slideshow has a clean URL.

function cfgFromHash(hash) {
  const cfg = defaultCfg();
  const q = new URLSearchParams((hash || '').replace(/^#/, ''));
  for (const p of PARAMS) if (q.has(p.id)) cfg[p.id] = clampParam(p, q.get(p.id));
  for (const t of TOGGLES) if (q.has(t.id)) cfg[t.id] = q.get(t.id) === 'on';
  return cfg;
}

function hashFromCfg(cfg) {
  const q = new URLSearchParams();
  for (const p of PARAMS) if (cfg[p.id] !== p.def) q.set(p.id, cfg[p.id]);
  for (const t of TOGGLES) if (cfg[t.id] !== t.def) q.set(t.id, cfg[t.id] ? 'on' : 'off');
  const s = q.toString();
  return s ? '#' + s : '';
}

// ─── Data ─────────────────────────────────────────────────────────────────

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The drift is seeded from the block id, so a given block always moves the
// same way — the slideshow is reproducible rather than different every run.
function motionFor(id) {
  const r = mulberry32(id);
  const zoomIn = r() < 0.5;
  const angle = r() * Math.PI * 2;
  return { zoomIn, dx: Math.cos(angle), dy: Math.sin(angle) };
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

function normalize(contents) {
  const deck = [];
  let skipped = 0;
  for (const b of contents) {
    const src = pickSrc(b.image);
    if (!src) { skipped++; continue; }
    const raw = (b.title || '').trim();
    deck.push({
      id: b.id,
      src,
      title: FILENAME.test(raw) ? '' : raw,
      description: (b.description || '').trim(),
      motion: motionFor(b.id),
    });
  }
  return { deck, skipped };
}

async function fetchChannel(slug) {
  const contents = [];
  let page = 1, length = Infinity, title = slug;
  while (contents.length < length) {
    const res = await fetch(`${API}/${encodeURIComponent(slug)}?per=${PER}&page=${page}`);
    if (!res.ok) throw new Error(httpMessage(res.status, slug));
    const data = await res.json();
    if (page === 1) { length = data.length || 0; title = data.title || slug; }
    const batch = data.contents || [];
    contents.push(...batch);
    // The API reports `length` for the whole channel but paginates blindly, so
    // an empty page is the only reliable stop — without it a miscount spins.
    if (!batch.length) break;
    page++;
  }
  // Channel order is `position` ascending; the API returns it that way, but
  // sorting makes the guarantee explicit rather than inherited.
  contents.sort((a, b) => (a.position || 0) - (b.position || 0));
  return { title, contents };
}

function httpMessage(status, slug) {
  if (status === 401 || status === 403) return `“${slug}” is private.\nAre.na only serves public channels to a page like this.`;
  if (status === 404) return `No channel called “${slug}”.`;
  if (status === 429) return 'Rate-limited by Are.na. Wait a moment and reload.';
  return `Are.na returned ${status}.`;
}

// ─── Motion ───────────────────────────────────────────────────────────────

// k runs 0 → 1 from the *contained* end of the move to the zoomed end (or the
// reverse), and both scale and pan are driven by it. Tying them to one value
// is what guarantees the slide touches the exact contained frame — scale 1,
// no offset — at one end, which is the whole point of `contain`.
//
// Smoothstep rather than a linear ramp: zero velocity at both ends means the
// image is momentarily still at the cut, so the crossfade lands on a held
// frame instead of interrupting a drift.
function motionAt(m, u, zoomPct, panPct) {
  const e = u * u * (3 - 2 * u);
  const k = m.zoomIn ? e : 1 - e;
  const z = zoomPct / 100;
  const p = effectivePan(zoomPct, panPct);
  const tx = k * p * m.dx;
  const ty = k * p * m.dy;
  // 5 decimals, not 4: a 30% zoom held for 30s moves the scale by about 1e-4
  // per frame, which is exactly the quantum at 4 decimals — the slow end of
  // the range would stair-step instead of drifting.
  return `translate(${tx.toFixed(3)}%, ${ty.toFixed(3)}%) scale(${(1 + z * k).toFixed(5)})`;
}

// Scaling by 1+z leaves z/2 of overhang on each side, so a pan wider than that
// drags the image off its own edge and prints background. Pan is clamped to
// the headroom the zoom actually bought.
function effectivePan(zoomPct, panPct) {
  return Math.min(panPct, zoomPct / 2);
}

// ─── State ────────────────────────────────────────────────────────────────

let cfg = cfgFromHash(location.hash);
let deck = [];
let order = [];
let channelTitle = '';
let skippedCount = 0;
let idx = 0;
let frontIdx = 0;
let t0 = 0;
let heldAt = 0;
let paused = false;
let idleTimer = 0;
let panelHidden = false;

const $ = (id) => {
  const el = document.getElementById(id);
  if (!el) throw new Error('missing element: ' + id);
  return el;
};

const stage = $('stage');
const layers = [$('layer-a'), $('layer-b')];
const message = $('message');
const caption = $('caption');
const capTitle = $('cap-title');
const capBody = $('cap-body');
const panel = $('panel');
const controls = $('controls');
const toggles = $('toggles');
const progressFill = $('progress-fill');
const statusEl = $('status');
const playBtn = $('play');

// ─── Panel ────────────────────────────────────────────────────────────────

const inputs = {};
const toggleBtns = {};

for (const p of PARAMS) {
  const row = document.createElement('div');
  row.className = 'row';
  const head = document.createElement('div');
  head.className = 'head';
  const name = document.createElement('span');
  name.textContent = p.id;
  const val = document.createElement('span');
  val.className = 'val';
  head.append(name, val);
  const input = document.createElement('input');
  if (p.type === 'text') {
    input.type = 'text';
    input.value = cfg[p.id];
    input.addEventListener('change', () => {
      const v = clampParam(p, input.value);
      input.value = v;
      if (v && v !== cfg[p.id]) { cfg[p.id] = v; writeHash(); load(); }
    });
  } else {
    input.type = 'range';
    input.min = p.min; input.max = p.max; input.step = p.step;
    input.value = cfg[p.id];
    input.addEventListener('input', () => {
      cfg[p.id] = clampParam(p, input.value);
      syncPanel();
      writeHash();
      renderStatus();
    });
  }
  row.append(head, input);
  controls.appendChild(row);
  inputs[p.id] = { input, val, spec: p };
}

for (const t of TOGGLES) {
  const btn = document.createElement('button');
  btn.addEventListener('click', () => {
    cfg[t.id] = !cfg[t.id];
    syncPanel();
    writeHash();
    if (t.id === 'shuffle') reorder();
    if (t.id === 'cover') stage.classList.toggle('cover', cfg.cover);
    if (t.id === 'captions' || t.id === 'titles') renderCaption();
  });
  toggles.appendChild(btn);
  toggleBtns[t.id] = btn;
}

function syncPanel() {
  for (const p of PARAMS) {
    const { input, val } = inputs[p.id];
    if (p.type === 'text') { val.textContent = ''; continue; }
    if (input.value !== String(cfg[p.id])) input.value = cfg[p.id];
    val.textContent = cfg[p.id] + (p.unit || '');
  }
  for (const t of TOGGLES) {
    toggleBtns[t.id].textContent = `${t.id}: ${cfg[t.id] ? 'on' : 'off'}`;
    toggleBtns[t.id].classList.toggle('active', cfg[t.id]);
  }
  playBtn.textContent = paused ? 'play' : 'pause';
}

function writeHash() {
  const h = hashFromCfg(cfg);
  history.replaceState(null, '', h || location.pathname);
}

// ─── Render ───────────────────────────────────────────────────────────────

function current() { return deck[order[idx]]; }

function reorder() {
  const at = order.length ? order[idx] : 0;
  order = deck.map((_, i) => i);
  if (cfg.shuffle) {
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
  }
  const found = order.indexOf(at);
  idx = found >= 0 ? found : 0;
  renderStatus();
}

function show(i) {
  if (!deck.length) return;
  idx = i;
  const blk = current();
  const incoming = layers[(frontIdx + 1) % 2];
  const outgoing = layers[frontIdx];
  incoming.src = blk.src;
  incoming.style.transform = motionAt(blk.motion, 0, cfg.zoom, cfg.pan);
  incoming.style.transition = `opacity ${cfg.fade}ms linear`;
  outgoing.style.transition = `opacity ${cfg.fade}ms linear`;
  incoming.style.opacity = 1;
  outgoing.style.opacity = 0;
  frontIdx = (frontIdx + 1) % 2;
  t0 = performance.now();
  heldAt = 0;
  renderCaption();
  renderStatus();
  preload(idx + 1);
  preload(idx + 2);
}

function advance(delta) {
  if (!deck.length) return;
  let next = idx + delta;
  if (next >= order.length) {
    if (!cfg.loop) { setPaused(true); return; }
    next = 0;
  }
  if (next < 0) next = order.length - 1;
  show(next);
}

const preloaded = new Set();

function preload(i) {
  if (!order.length) return;
  const blk = deck[order[((i % order.length) + order.length) % order.length]];
  if (!blk) return;
  fetchImage(blk.src);
}

function fetchImage(src) {
  if (preloaded.has(src)) return Promise.resolve();
  preloaded.add(src);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = img.onerror = resolve;
    img.src = src;
  });
}

function renderCaption() {
  const blk = current();
  if (!blk) { caption.hidden = true; return; }
  const title = cfg.titles ? blk.title : '';
  capTitle.textContent = title;
  capTitle.hidden = !title;
  capBody.textContent = blk.description;
  capBody.hidden = !blk.description;
  caption.hidden = !cfg.captions || (!title && !blk.description);
}

function renderStatus() {
  if (!deck.length) { statusEl.textContent = ''; return; }
  const parts = [
    `${idx + 1}/${order.length}`,
    channelTitle,
    `${Number(cfg.interval).toFixed(1)}s`,
  ];
  const eff = effectivePan(cfg.zoom, cfg.pan);
  if (eff < cfg.pan) parts.push(`pan clamped to ${eff.toFixed(1)}%`);
  if (skippedCount) parts.push(`${skippedCount} block${skippedCount > 1 ? 's' : ''} without an image skipped`);
  statusEl.textContent = parts.join(' · ');
}

// One clock drives both the drift and the dwell. Running the transform off a
// CSS animation instead would let the two ends drift apart, and the pan would
// stop finishing exactly when the slide does.
function tick(now) {
  requestAnimationFrame(tick);
  if (!deck.length) return;
  const dwell = Math.max(1, cfg.interval * 1000);
  const elapsed = paused ? heldAt : now - t0;
  const u = Math.min(1, elapsed / dwell);
  layers[frontIdx].style.transform = motionAt(current().motion, u, cfg.zoom, cfg.pan);
  progressFill.style.width = (u * 100).toFixed(2) + '%';
  if (!paused && elapsed >= dwell) advance(1);
}

function setPaused(p) {
  if (p === paused) return;
  paused = p;
  if (paused) heldAt = performance.now() - t0;
  else t0 = performance.now() - heldAt;
  syncPanel();
}

// ─── Load ─────────────────────────────────────────────────────────────────

function readCache(slug) {
  try {
    const raw = sessionStorage.getItem('arena:' + slug);
    if (!raw) return null;
    const { t, payload } = JSON.parse(raw);
    return Date.now() - t < CACHE_TTL ? payload : null;
  } catch (e) { return null; }
}

function writeCache(slug, payload) {
  try {
    sessionStorage.setItem('arena:' + slug, JSON.stringify({ t: Date.now(), payload }));
  } catch (e) { /* private mode, or over quota — the slideshow still runs */ }
}

let loadToken = 0;

async function load() {
  const slug = cfg.channel;
  const token = ++loadToken;
  deck = []; order = []; idx = 0;
  preloaded.clear();
  for (const l of layers) { l.style.opacity = 0; l.removeAttribute('src'); }
  caption.hidden = true;
  message.hidden = false;
  message.textContent = `loading ${slug}…`;
  statusEl.textContent = '';
  try {
    let payload = readCache(slug);
    if (!payload) {
      payload = await fetchChannel(slug);
      writeCache(slug, payload);
    }
    if (token !== loadToken) return;
    const norm = normalize(payload.contents);
    if (!norm.deck.length) throw new Error(`“${slug}” has no blocks with images.`);
    deck = norm.deck;
    skippedCount = norm.skipped;
    channelTitle = payload.title;
    document.title = `Arena — ${channelTitle}`;
    reorder();
    // Every other slide is preloaded a turn ahead, but the first has nothing
    // in front of it — without this wait its dwell burns down while the image
    // is still on the wire, and slide one flashes past.
    await fetchImage(deck[order[0]].src);
    if (token !== loadToken) return;
    message.hidden = true;
    show(0);
  } catch (err) {
    if (token !== loadToken) return;
    message.hidden = false;
    message.textContent = err.message;
  }
}

// ─── Wiring ───────────────────────────────────────────────────────────────

$('prev').addEventListener('click', () => advance(-1));
$('next').addEventListener('click', () => advance(1));
playBtn.addEventListener('click', () => setPaused(!paused));

document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'ArrowRight') { advance(1); e.preventDefault(); }
  else if (e.key === 'ArrowLeft') { advance(-1); e.preventDefault(); }
  else if (e.key === ' ') { setPaused(!paused); e.preventDefault(); }
  else if (e.key === 'f') toggleFullscreen();
  else if (e.key === 'c') { cfg.captions = !cfg.captions; syncPanel(); writeHash(); renderCaption(); }
  else if (e.key === 'h') { panelHidden = !panelHidden; panel.hidden = panelHidden; }
});

function toggleFullscreen() {
  if (document.fullscreenElement) document.exitFullscreen();
  else document.documentElement.requestFullscreen().catch(() => {});
}

function wake() {
  stage.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => stage.classList.add('idle'), IDLE_MS);
}

document.addEventListener('mousemove', wake);
document.addEventListener('mousedown', wake);
window.addEventListener('hashchange', () => {
  const next = cfgFromHash(location.hash);
  const reload = next.channel !== cfg.channel;
  cfg = next;
  syncPanel();
  stage.classList.toggle('cover', cfg.cover);
  if (reload) load();
  else { reorder(); renderCaption(); renderStatus(); }
});

stage.classList.toggle('cover', cfg.cover);
syncPanel();
wake();
requestAnimationFrame(tick);
load();
</script>
