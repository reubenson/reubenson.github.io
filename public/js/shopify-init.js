/**
 * @file Shopify Buy Button initialization script
 */

const __T = 'ZDQ1ZTc0OGIxMzA3MmMwMTViNjU1ODIwMjc0ZWRhNmM=';
const __D = 'MDI0Nzc1LWFlLm15c2hvcGlmeS5jb20=';

/**
 * Show shop closed message
 */
function showShopClosedMessage() {
  document.querySelector('#shop-closed')?.classList.remove('hidden');
  document.querySelector('#product-listings')?.classList.add('hidden');
}

function loadShopifyProducts(nodeId, collectionId, showTitle) {
  var scriptURL = 'https://sdks.shopifycdn.com/buy-button/latest/buy-button-storefront.min.js';
  if (window.ShopifyBuy) {
    if (window.ShopifyBuy.UI) {
      ShopifyBuyInit();
    } else {
      loadScript();
    }
  } else {
    loadScript();
  }
  function loadScript() {
    var script = document.createElement('script');
    script.async = true;
    script.src = scriptURL;
    (document.getElementsByTagName('head')[0] || document.getElementsByTagName('body')[0]).appendChild(script);
    script.onload = ShopifyBuyInit;
  }
  function ShopifyBuyInit() {
    var client = ShopifyBuy.buildClient({
      domain: atob(__D),
      storefrontAccessToken: atob(__T)
    });
    const node = document.getElementById(nodeId);
    ShopifyBuy.UI.onReady(client).then(function (ui) {
        ui.createComponent('collection', {
          id: collectionId,
          node,
          moneyFormat: '%24%7B%7Bamount%7D%7D',
          options: {
            "product": {
              "styles": {
                "product": {
                  "padding": "0px",
                  "position": "relative",
                  "flex-basis": "31%",
                  "flex-grow": "1",
                  "max-width": "400px",
                  "box-shadow": "0px 4px 8px rgba(0, 0, 0, 0.1)",
                  "@media (min-width: 601px)": {
                    "margin-left": "20px",
                    "margin-bottom": "50px"
                  }
                },
                "button": {
                  "border-radius": "2px",
                  "box-shadow": "0px 0px 500px #f0f0e6",
                  "border": "solid black 1px",
                  "color": "#000000",
                  "font-family": "Ibarra Real Nova, sans-serif",
                  "letter-spacing": ".5px",
                  ":hover": {
                    "background-color": "#000000",
                    "color": "#f0f0e6"
                  },
                  "background-color": "#f0f0e6",
                  ":focus": {
                    "background-color": "#000000",
                    "color": "#f0f0e6",
                  },
                  "padding": "10px 15px",
                  "margin-top": "-14px !important"
                },
                "img": {
                  "margin-bottom": "5px",
                  "position": "relative",
                  "z-index": "1",
                  "background-image": "url(/public/riso-maine.png)",
                  // "zoom": "0.5",
                  "aspect-ratio": "1/1",
                  "object-fit": "cover",
                  "height": "auto",
                  "border-radius": "5px"
                },
                "imgWrapper": {
                  "padding": "20px"
                },
                "title": {
                  "display": showTitle === 'true' ? 'inline' : 'none',
                  "font-size": "16px",
                  "font-family": "Ibarra Real Nova, sans-serif",
                  "color": "#000000",
                  "position": "absolute",
                  "right": "2px",
                  "top": "0",
                  "font-weight": "100",
                  "z-index": "100",
                  "border": "solid black 1px",
                  "border-radius": "5px",
                  "box-shadow": "1px 2px black",
                  "background-color": "#f0f0e6",
                  "padding": "10px",
                  "opacity": "0.9",
                },
                "prices": {
                  "margin": "0",
                  "position": "absolute",
                  "top": "4px",
                  "left": "4px",
                  "border": "solid black 1px",
                  "background-color": "#f0f0e6",
                  "padding": "6px",
                  "padding-left": "10px",
                  "border-radius": "5px",
                  "box-shadow": "1px 2px black",
                  "letter-spacing": "2.5px",
                  "width": "50px",
                  "overflow": "hidden",
                  "z-index": "1",
                  ":after": {
                    "content": "''",
                    "position": "absolute",
                    "top": "0",
                    "right": "-30px",
                    "width": "40px",
                    "height": "100%",
                    "background-color": "#f0f0e6",
                  }
                },
                "buttonWrapper": {
                  "margin": "11px 0 21px"
                }
              },
              "text": {
                "button": "Add to Cart",
                "outOfStock": "Sold Out"

              },
              "googleFonts": [
                "Ibarra Real Nova"
              ]
            },
            "productSet": {
              "styles": {
                "products": {
                  "@media (min-width: 601px)": {
                    "display": "flex",
                    "flex-direction": "row",
                    "flex-wrap": "wrap",
                    "justify-content": "center",
                  }
                }
              }
            },
            "modalProduct": {
              "contents": {
                "img": false,
                "imgWithCarousel": true,
                "button": false,
                "buttonWithQuantity": true
              },
              "styles": {
                "product": {
                  "@media (min-width: 601px)": {
                    "max-width": "100%",
                    "margin-left": "0px",
                    "margin-bottom": "0px",
                  }
                },
                "button": {
                  "font-family": "Ibarra Real Nova, sans-serif",
                  ":hover": {
                    "background-color": "#000000"
                  },
                  "background-color": "#f0f0e6",
                  ":focus": {
                    "background-color": "#000000",
                    "color": "#f0f0e6",
                  },
                  "border-radius": "10px"
                }
              },
              "googleFonts": [
                "Ibarra Real Nova"
              ],
              "text": {
                "button": "Add to cart"
              }
            },
            "option": {},
            "cart": {
              "styles": {
                "button": {
                  "font-family": "Ibarra Real Nova, sans-serif",
                  ":hover": {
                    "background-color": "#000000"
                  },
                  "background-color": "#000000",
                  ":focus": {
                    "background-color": "#000000",
                    "color": "#f0f0e6",
                  },
                  "border-radius": "10px"
                }
              },
              "text": {
                "total": "Subtotal",
                "button": "Checkout"
              },
              "googleFonts": [
                "Ibarra Real Nova"
              ]
            },
            "toggle": {
              "styles": {
                "toggle": {
                  "font-family": "Ibarra Real Nova, sans-serif",
                  "background-color": "#000000",
                  ":hover": {
                    "background-color": "#000000"
                  },
                  ":focus": {
                    "background-color": "#000000",
                    "color": "#f0f0e6",
                  }
                }
              },
              "googleFonts": [
                "Ibarra Real Nova"
              ]
            }
          },
        });
    });
  }
}

function main() {
  const collectionContainers = document.querySelectorAll('.shop-listings');

  if (!collectionContainers.length) throw new Error('DOM not yet loaded'); // DOM hasn't loaded yet

  let hasAnyProducts = false;

  // Load products for each collection
  collectionContainers.forEach((container, index) => {
    const collectionId = container.getAttribute('data-collection-id');
    const showTitle = container.getAttribute('data-show-title');
    
    if (collectionId && collectionId.length > 0) {
      hasAnyProducts = true;
      // Create a unique ID for each container if it doesn't have one
      if (!container.id) {
        container.id = `product-listings-${collectionId}-${index}`;
      }
      loadShopifyProducts(container.id, collectionId, showTitle);
    }
  });

  if (!hasAnyProducts) {
    showShopClosedMessage();
    return;
  }
};

try {
  main();
} catch (error) {
  document.addEventListener('DOMContentLoaded', main);
}
