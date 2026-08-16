/**
 * @file Shop client script.
 *
 * Product cards are rendered at build time by Eleventy (see
 * src/_includes/shop-product-grid.njk) from data produced by
 * `npm run fetch-shop`. This script handles the interactive layer:
 *
 *   1. A lightweight cart drawer backed by the Storefront **Cart API**.
 *   2. Add-to-cart wiring for the build-time buttons.
 *   3. A live sold-out refresh, since baked stock is only as fresh as the last
 *      `npm run fetch-shop`.
 *
 * Note: the Buy Button SDK is intentionally NOT used. It still calls Shopify's
 * removed Storefront Checkout API (checkoutCreate), which no longer exists, so
 * its cart can't create a checkout. The Cart API (cartCreate/cartLinesAdd →
 * checkoutUrl) is the supported replacement.
 */

const __T = 'ZDQ1ZTc0OGIxMzA3MmMwMTViNjU1ODIwMjc0ZWRhNmM=';
const __D = 'MDI0Nzc1LWFlLm15c2hvcGlmeS5jb20=';
const SHOPIFY_API_VERSION = '2024-10';
const CART_STORAGE_KEY = 'shopifyCartId';

const cartState = { id: null, cart: null };

/**
 * Run a Storefront GraphQL query/mutation.
 * @param {string} query
 * @param {object} [variables]
 * @returns {Promise<object>} the `data` payload
 */
async function storefrontGraphQL(query, variables = {}) {
  const endpoint = `https://${atob(__D)}/api/${SHOPIFY_API_VERSION}/graphql.json`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Storefront-Access-Token': atob(__T)
    },
    body: JSON.stringify({ query, variables })
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors.map((e) => e.message).join('; '));
  return json.data;
}

/**
 * Format a Storefront MoneyV2 as localized currency.
 * @param {{amount: string, currencyCode: string}} money
 * @returns {string}
 */
function formatMoney(money) {
  if (!money) return '';
  const value = Number(money.amount);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: money.currencyCode,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2
  }).format(value);
}

/** Extract the numeric id from a raw or base64-encoded Shopify GID. */
function numericId(id) {
  let decoded = id;
  if (!decoded.startsWith('gid://')) {
    try {
      decoded = atob(decoded);
    } catch {
      /* not base64 */
    }
  }
  return decoded.split('/').pop();
}

/* ------------------------------------------------------------------ */
/* Cart API                                                            */
/* ------------------------------------------------------------------ */

const CART_FRAGMENT = `
  fragment CartFields on Cart {
    id
    checkoutUrl
    totalQuantity
    cost { subtotalAmount { amount currencyCode } }
    lines(first: 100) {
      nodes {
        id
        quantity
        cost { totalAmount { amount currencyCode } }
        merchandise {
          ... on ProductVariant {
            id
            title
            image { url altText }
            product { title }
          }
        }
      }
    }
  }`;

const CART_QUERIES = {
  create: `${CART_FRAGMENT}
    mutation CartCreate($lines: [CartLineInput!]) {
      cartCreate(input: { lines: $lines }) { cart { ...CartFields } userErrors { message } }
    }`,
  add: `${CART_FRAGMENT}
    mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) { cart { ...CartFields } userErrors { message } }
    }`,
  remove: `${CART_FRAGMENT}
    mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) { cart { ...CartFields } userErrors { message } }
    }`,
  get: `${CART_FRAGMENT}
    query CartGet($id: ID!) { cart(id: $id) { ...CartFields } }`
};

/** Persist the current cart id and re-render the drawer. */
function setCart(cart) {
  cartState.cart = cart || null;
  cartState.id = cart ? cart.id : null;
  if (cart) localStorage.setItem(CART_STORAGE_KEY, cart.id);
  else localStorage.removeItem(CART_STORAGE_KEY);
  renderCart();
}

/** Load an existing cart from localStorage, if any (may have expired). */
async function loadCart() {
  const id = localStorage.getItem(CART_STORAGE_KEY);
  if (!id) return;
  try {
    const data = await storefrontGraphQL(CART_QUERIES.get, { id });
    setCart(data.cart); // null if expired/emptied — setCart clears it
  } catch (err) {
    console.warn('[shopify] could not load saved cart', err);
  }
}

/**
 * Add a variant to the cart, creating the cart if needed and recreating it if
 * the stored one has expired.
 * @param {string} merchandiseId variant GID
 * @param {number} quantity
 */
async function addVariantToCart(merchandiseId, quantity = 1) {
  if (!cartState.id) {
    const data = await storefrontGraphQL(CART_QUERIES.create, {
      lines: [{ merchandiseId, quantity }]
    });
    setCart(data.cartCreate.cart);
    return;
  }
  const data = await storefrontGraphQL(CART_QUERIES.add, {
    cartId: cartState.id,
    lines: [{ merchandiseId, quantity }]
  });
  const cart = data.cartLinesAdd.cart;
  if (!cart) {
    // Stored cart no longer valid — start fresh.
    setCart(null);
    return addVariantToCart(merchandiseId, quantity);
  }
  setCart(cart);
}

async function removeLine(lineId) {
  const data = await storefrontGraphQL(CART_QUERIES.remove, {
    cartId: cartState.id,
    lineIds: [lineId]
  });
  setCart(data.cartLinesRemove.cart);
}

/* ------------------------------------------------------------------ */
/* Cart drawer UI                                                      */
/* ------------------------------------------------------------------ */

const els = {};

/**
 * Wire up the static cart drawer markup (see src/_includes/shop-cart.njk).
 * @returns {boolean} whether the drawer markup was found and bound
 */
function initCartUI() {
  const drawer = document.querySelector('.shop-cart-drawer');
  const toggle = document.querySelector('.shop-cart-toggle');
  const overlay = document.querySelector('.shop-cart-overlay');
  if (!drawer || !toggle || !overlay) return false;

  els.toggle = toggle;
  els.overlay = overlay;
  els.drawer = drawer;
  els.count = toggle.querySelector('.shop-cart-count');
  els.empty = drawer.querySelector('.shop-cart-empty');
  els.lines = drawer.querySelector('.shop-cart-lines');
  els.footer = drawer.querySelector('.shop-cart-footer');
  els.subtotal = drawer.querySelector('.shop-cart-subtotal-value');
  els.checkout = drawer.querySelector('.shop-cart-checkout');

  toggle.addEventListener('click', openCart);
  overlay.addEventListener('click', closeCart);
  drawer.querySelector('.shop-cart-close').addEventListener('click', closeCart);

  // Event delegation for line remove controls.
  els.lines.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action="remove"]');
    if (button) removeLine(button.getAttribute('data-line-id'));
  });

  return true;
}

function openCart() {
  els.overlay.hidden = false;
  els.drawer.hidden = false;
  document.body.classList.add('shop-cart-open');
}

function closeCart() {
  els.overlay.hidden = true;
  els.drawer.hidden = true;
  document.body.classList.remove('shop-cart-open');
}

function renderCart() {
  if (!els.drawer) return;
  const cart = cartState.cart;
  const lines = cart ? cart.lines.nodes : [];
  const count = cart ? cart.totalQuantity : 0;

  els.count.textContent = count;
  els.toggle.classList.toggle('has-items', count > 0);

  const isEmpty = lines.length === 0;
  els.empty.hidden = !isEmpty;
  els.footer.hidden = isEmpty;
  els.lines.hidden = isEmpty;

  els.lines.innerHTML = lines
    .map((line) => {
      const v = line.merchandise;
      const showVariant = v.title && v.title !== 'Default Title';
      return `
        <li class="shop-cart-line">
          ${v.image ? `<img class="shop-cart-line-img" src="${v.image.url}" alt="${v.image.altText || v.product.title}">` : ''}
          <div class="shop-cart-line-info">
            <span class="shop-cart-line-title">${v.product.title}</span>
            ${showVariant ? `<span class="shop-cart-line-variant">${v.title}</span>` : ''}
            <span class="shop-cart-line-price">${formatMoney(line.cost.totalAmount)}</span>
            <div class="shop-cart-qty">
              <button type="button" class="shop-cart-remove" data-action="remove" data-line-id="${line.id}" aria-label="Remove">Remove</button>
            </div>
          </div>
        </li>`;
    })
    .join('');

  if (cart && !isEmpty) {
    els.subtotal.textContent = formatMoney(cart.cost.subtotalAmount);
    els.checkout.href = cart.checkoutUrl;
  }

  syncAddButtons();
}

/* ------------------------------------------------------------------ */
/* Wiring                                                              */
/* ------------------------------------------------------------------ */

/** Numeric ids of the variants currently in the cart. */
function cartVariantIds() {
  const ids = new Set();
  const lines = cartState.cart ? cartState.cart.lines.nodes : [];
  lines.forEach((line) => ids.add(numericId(line.merchandise.id)));
  return ids;
}

/**
 * Single source of truth for Add-to-Cart button state. Reflects sold-out,
 * in-cart ("Added to Cart"), or available, based on each button's currently
 * selected variant.
 */
function syncAddButtons() {
  const inCart = cartVariantIds();
  document.querySelectorAll('.add-to-cart').forEach((button) => {
    if (button.dataset.busy === 'true') return; // mid-request; leave "Adding…"
    const card = button.closest('.product-card');
    const select = card && card.querySelector('.product-variant-select');
    const variantId = select ? select.value : button.getAttribute('data-variant-id');
    const added = inCart.has(String(variantId));
    // Dim the card once its selected variant is in the cart (see _shop.scss).
    if (card) card.classList.toggle('in-cart', added);
    const soldOut = card && card.classList.contains('sold-out');
    if (soldOut) {
      button.disabled = true;
      button.textContent = 'Sold Out';
      return;
    }
    button.disabled = false;
    button.textContent = added ? 'Added to Cart' : 'Add to Cart';
  });
}

function bindAddToCartButtons() {
  document.querySelectorAll('.add-to-cart').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('.product-card');
      const select = card && card.querySelector('.product-variant-select');
      const variantLegacyId = select ? select.value : button.getAttribute('data-variant-id');
      if (!variantLegacyId) return;
      const merchandiseId = `gid://shopify/ProductVariant/${variantLegacyId}`;

      button.dataset.busy = 'true';
      button.disabled = true;
      button.textContent = 'Adding…';
      try {
        await addVariantToCart(merchandiseId, 1); // triggers renderCart → syncAddButtons
        delete button.dataset.busy;
        syncAddButtons();
        openCart();
      } catch (err) {
        console.error('[shopify] add to cart failed', err);
        delete button.dataset.busy;
        button.textContent = 'Unavailable';
      }
    });
  });

  // Re-label when the chosen variant changes on a multi-variant product.
  document.querySelectorAll('.product-variant-select').forEach((select) => {
    select.addEventListener('change', syncAddButtons);
  });
}

/**
 * Update a single product card from a live Storefront product node: sold-out
 * state, the displayed (minimum) price, and each variant option's price and
 * availability. The baked markup (see shop-product-grid.njk) is only as fresh
 * as the last `npm run fetch-shop`, so this reconciles it on load.
 * @param {Element} card
 * @param {object} product Storefront product node
 */
function applyProductData(card, product) {
  card.classList.toggle('sold-out', !product.availableForSale);

  // Card price reflects the minimum variant price (matches the build-time
  // `product.price.min` render).
  const minPrice = product.priceRange?.minVariantPrice;
  const priceEl = card.querySelector('.product-price');
  if (priceEl && minPrice) priceEl.textContent = formatMoney(minPrice);

  // Per-variant price + availability in the option list, keyed by legacy id
  // (the option's value; see shop-product-grid.njk).
  const variants = product.variants?.nodes || [];
  const byLegacyId = new Map(variants.map((v) => [numericId(v.id), v]));
  card.querySelectorAll('.product-variant-select option').forEach((option) => {
    const v = byLegacyId.get(option.value);
    if (!v) return;
    if (v.price) option.dataset.price = v.price.amount;
    option.disabled = !v.availableForSale;
    option.textContent = v.title + (v.availableForSale ? '' : ' — Sold Out');
  });
}

/**
 * Refresh sold-out state and prices from live Storefront data.
 *
 * Queried by the set of product ids present on the page (via the `nodes` root
 * field) rather than by collection: some collections aren't published to the
 * Buy Button sales channel and so can't be read via `collection(id:)`, but their
 * individual products still can. Any id that isn't readable comes back null and
 * that card keeps its baked build-time state.
 */
async function refreshProductData() {
  const cards = document.querySelectorAll('.product-card[data-product-legacy-id]');
  if (!cards.length) return;

  const legacyIds = [
    ...new Set(
      Array.from(cards, (card) => card.getAttribute('data-product-legacy-id')).filter(Boolean)
    )
  ];
  if (!legacyIds.length) return;

  const query = `
    query ProductsByIds($ids: [ID!]!) {
      nodes(ids: $ids) {
        ... on Product {
          id
          availableForSale
          priceRange { minVariantPrice { amount currencyCode } }
          variants(first: 100) {
            nodes { id title availableForSale price { amount currencyCode } }
          }
        }
      }
    }`;

  try {
    const data = await storefrontGraphQL(query, {
      ids: legacyIds.map((id) => `gid://shopify/Product/${id}`)
    });
    (data.nodes || []).forEach((product) => {
      if (!product) return; // not readable on this channel — keep baked state
      const legacyId = numericId(product.id);
      document
        .querySelectorAll(`.product-card[data-product-legacy-id="${legacyId}"]`)
        .forEach((card) => applyProductData(card, product));
    });
  } catch (err) {
    console.warn('[shopify] product refresh failed', err);
  }
  syncAddButtons(); // reconcile labels with refreshed sold-out state
}

async function main() {
  if (!document.querySelectorAll('.product-card').length) return;
  if (!initCartUI()) return; // cart drawer markup missing
  bindAddToCartButtons();
  loadCart(); // restore any saved cart
  refreshProductData();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
