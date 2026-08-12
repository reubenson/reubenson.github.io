/**
 * @file Eleventy global data: re-keys the per-collection JSON produced by
 * `npm run fetch-shop` (in ./shopCollections/) by legacy numeric collection id,
 * so templates can look a collection up straight from a `data-collection-id`:
 *
 *   {{ shopCollectionsById["278257860680"].products | length }}
 *
 * Resilient to the directory being absent/empty (e.g. before the fetch script
 * has ever run) — returns {} so the build never breaks.
 */

const fs = require('fs');
const path = require('path');

module.exports = function () {
  const dir = path.join(__dirname, 'shopCollections');
  const byId = {};

  let files = [];
  try {
    files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return byId; // directory doesn't exist yet
  }

  const legacyFromGid = (gid) => (typeof gid === 'string' ? gid.split('/').pop() : undefined);

  for (const file of files) {
    try {
      const collection = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
      if (!collection.legacyId) continue;

      // Backfill numeric ids so templates can rely on them regardless of which
      // version of the fetch script produced the JSON.
      for (const product of collection.products || []) {
        if (!product.legacyId) product.legacyId = legacyFromGid(product.id);
        for (const variant of product.variants || []) {
          if (!variant.legacyId) variant.legacyId = legacyFromGid(variant.id);
        }
      }

      byId[String(collection.legacyId)] = collection;
    } catch (err) {
      console.warn(`[shopCollectionsById] skipped ${file}: ${err.message}`);
    }
  }

  return byId;
};
