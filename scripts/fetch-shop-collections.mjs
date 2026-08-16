/**
 * @file Fetch Shopify collections (with render-ready product data) via the
 * Admin GraphQL API and write one JSON file per collection into
 * `src/_data/shopCollections/`. Eleventy then exposes each file at build time
 * as `shopCollections['<handle>']`, so products are baked into the HTML with
 * no client-side API call and no sales-channel publishing requirement.
 *
 * Run manually — this is NOT part of the Eleventy build:
 *
 *   npm run fetch-shop
 *
 * Auth: put the custom app's client id/secret in a `.env` file at the repo root
 * (git-ignored). The script exchanges them for a short-lived Admin API access
 * token via the client-credentials grant (POST /admin/oauth/access_token):
 *
 *   SHOPIFY_CLIENT_ID=xxxxxxxx
 *   SHOPIFY_CLIENT_SECRET=xxxxxxxx
 *   SHOPIFY_STORE_DOMAIN=024775-ae.myshopify.com   # optional, this is the default
 *
 * Alternatively, skip the exchange by supplying a token directly:
 *
 *   SHOPIFY_ADMIN_TOKEN=shpat_xxx
 *
 * The credentials come from a Shopify custom app (Settings → Apps and sales
 * channels → Develop apps) with the Admin API scope `read_products`.
 * Requires Node 18+ (uses global fetch).
 */

import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(REPO_ROOT, 'src', '_data', 'shopCollections');
const API_VERSION = '2024-04';

// Legacy numeric collection ids (from src/_layouts/shop-page.njk). Override by
// passing ids as CLI args: `npm run fetch-shop -- 278257860680 282400391240`.
const DEFAULT_COLLECTION_IDS = ['278257860680', '282400391240', '278356557896'];

// Pagination / query-cost tuning. Kept modest so a single request stays well
// under the Admin API's 1000-point cost ceiling.
const PRODUCTS_PER_PAGE = 25;
const IMAGES_PER_PRODUCT = 20;
const VARIANTS_PER_PRODUCT = 100;

/**
 * Minimal zero-dependency `.env` loader. Populates process.env with any keys
 * not already set. Silently no-ops if the file is absent.
 */
async function loadDotEnv() {
  const envPath = path.join(REPO_ROOT, '.env');
  if (!existsSync(envPath)) return;
  const raw = await readFile(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Exchange the custom app's client credentials for a short-lived Admin API
 * access token via the client-credentials grant (POST /admin/oauth/access_token).
 * @param {string} domain e.g. "024775-ae.myshopify.com"
 * @param {string} clientId SHOPIFY_CLIENT_ID
 * @param {string} clientSecret SHOPIFY_CLIENT_SECRET
 * @returns {Promise<string>} the Admin API access token
 */
async function fetchAccessToken(domain, clientId, clientSecret) {
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).trim();
    throw new Error(
      `Token request failed (${res.status}). Check SHOPIFY_CLIENT_ID / SHOPIFY_CLIENT_SECRET` +
        ` and that the app is installed on ${domain}.` +
        (detail ? `\n${detail}` : '')
    );
  }

  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Token response missing access_token: ${JSON.stringify(json)}`);
  }
  return json.access_token;
}

/**
 * POST a query to the Admin GraphQL API, retrying on throttling.
 * @param {string} endpoint
 * @param {string} token
 * @param {string} query
 * @param {object} variables
 * @returns {Promise<object>} the `data` payload
 */
async function adminGraphQL(endpoint, token, query, variables) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token
      },
      body: JSON.stringify({ query, variables })
    });

    if (res.status === 401 || res.status === 403) {
      throw new Error(
        `Admin API auth failed (${res.status}). Check SHOPIFY_ADMIN_TOKEN and that the app has the read_products scope.`
      );
    }

    const json = await res.json();
    const throttled =
      res.status === 429 ||
      (json.errors || []).some((e) => e?.extensions?.code === 'THROTTLED');

    if (throttled) {
      const status = json.extensions?.cost?.throttleStatus;
      const wait = status
        ? Math.max(
            1,
            (status.currentlyAvailable < 0
              ? -status.currentlyAvailable
              : 200) / status.restoreRate
          )
        : 2;
      console.warn(`  …throttled, waiting ${wait.toFixed(1)}s (attempt ${attempt + 1})`);
      await sleep(wait * 1000);
      continue;
    }

    if (json.errors?.length) {
      throw new Error(json.errors.map((e) => e.message).join('; '));
    }
    return json.data;
  }
  throw new Error('Gave up after repeated throttling.');
}

const COLLECTION_QUERY = `
  query CollectionProducts($id: ID!, $productsFirst: Int!, $cursor: String, $imagesFirst: Int!, $variantsFirst: Int!) {
    collection(id: $id) {
      id
      handle
      title
      descriptionHtml
      products(first: $productsFirst, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id
          handle
          title
          description
          descriptionHtml
          status
          onlineStoreUrl
          totalInventory
          featuredImage { url altText width height }
          images(first: $imagesFirst) {
            nodes { url altText width height }
          }
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          variants(first: $variantsFirst) {
            nodes {
              id
              title
              price
              availableForSale
              inventoryQuantity
              selectedOptions { name value }
              image { url altText }
            }
          }
        }
      }
    }
  }`;

/**
 * Shape a raw Admin product node into the render-ready form we persist.
 */
function shapeProduct(node) {
  const variants = node.variants.nodes.map((v) => ({
    id: v.id,
    legacyId: v.id.split('/').pop(),
    title: v.title,
    price: v.price, // decimal string, e.g. "45.00"
    availableForSale: v.availableForSale,
    inventoryQuantity: v.inventoryQuantity,
    selectedOptions: v.selectedOptions,
    imageUrl: v.image?.url ?? null
  }));

  return {
    id: node.id,
    legacyId: node.id.split('/').pop(),
    handle: node.handle,
    title: node.title,
    status: node.status,
    onlineStoreUrl: node.onlineStoreUrl,
    availableForSale: variants.some((v) => v.availableForSale),
    description: node.description,
    descriptionHtml: node.descriptionHtml,
    featuredImage: node.featuredImage ?? null,
    images: node.images.nodes,
    price: {
      min: node.priceRangeV2.minVariantPrice.amount,
      max: node.priceRangeV2.maxVariantPrice.amount,
      currencyCode: node.priceRangeV2.minVariantPrice.currencyCode
    },
    variants
  };
}

/**
 * Fetch every product in one collection, paginating until exhausted.
 */
async function fetchCollection(endpoint, token, legacyId) {
  const gid = `gid://shopify/Collection/${legacyId}`;
  const products = [];
  let cursor = null;
  let meta = null;

  do {
    const data = await adminGraphQL(endpoint, token, COLLECTION_QUERY, {
      id: gid,
      productsFirst: PRODUCTS_PER_PAGE,
      cursor,
      imagesFirst: IMAGES_PER_PRODUCT,
      variantsFirst: VARIANTS_PER_PRODUCT
    });

    const collection = data.collection;
    if (!collection) {
      throw new Error(`Collection ${legacyId} not found (check the id and that the app can read it).`);
    }
    if (!meta) {
      meta = {
        id: collection.id,
        legacyId,
        handle: collection.handle,
        title: collection.title,
        descriptionHtml: collection.descriptionHtml
      };
    }
    products.push(...collection.products.nodes.map(shapeProduct));
    cursor = collection.products.pageInfo.hasNextPage
      ? collection.products.pageInfo.endCursor
      : null;
  } while (cursor);

  return { meta, products };
}

async function main() {
  await loadDotEnv();

  const domain = process.env.SHOPIFY_STORE_DOMAIN || '024775-ae.myshopify.com';

  // Prefer a directly-supplied token; otherwise exchange the app's client
  // credentials for one via /admin/oauth/access_token.
  let token = process.env.SHOPIFY_ADMIN_TOKEN;
  if (!token) {
    const clientId = process.env.SHOPIFY_CLIENT_ID;
    const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      console.error(
        'Missing credentials. Set SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET (or a ready-made' +
          ' SHOPIFY_ADMIN_TOKEN) in the environment or a .env file at the repo root.'
      );
      process.exit(1);
    }
    try {
      token = await fetchAccessToken(domain, clientId, clientSecret);
      console.log('Obtained Admin API access token via client-credentials grant.');
    } catch (err) {
      console.error(err.message);
      process.exit(1);
    }
  }

  const endpoint = `https://${domain}/admin/api/${API_VERSION}/graphql.json`;
  const ids = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_COLLECTION_IDS;

  await mkdir(OUTPUT_DIR, { recursive: true });
  console.log(`Fetching ${ids.length} collection(s) from ${domain}\n`);

  for (const legacyId of ids) {
    try {
      const { meta, products } = await fetchCollection(endpoint, token, legacyId);
      const active = products.filter((p) => p.status === 'ACTIVE');

      const payload = {
        ...meta,
        currencyCode: products[0]?.price.currencyCode ?? null,
        productCount: active.length,
        generatedAt: new Date().toISOString(),
        products: active
      };

      const outFile = path.join(OUTPUT_DIR, `${meta.handle}.json`);
      await writeFile(outFile, JSON.stringify(payload, null, 2) + '\n', 'utf8');

      const skipped = products.length - active.length;
      console.log(
        `✓ ${meta.title} (${meta.handle}) — ${active.length} active product(s)` +
          (skipped ? `, ${skipped} non-active skipped` : '') +
          ` → src/_data/shopCollections/${meta.handle}.json`
      );
    } catch (err) {
      console.error(`✗ Collection ${legacyId}: ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
