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

function loadShopifyProducts(nodeId, productIds) {
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
    
    ShopifyBuy.UI.onReady(client).then(function (ui) {
      // const productIds = document.getElementById('product-listings')?.getAttribute('data-product-ids').split(',') || [];
      let randomColor;
      
      for (let i in productIds ) {
        const productId = productIds[i];
        randomColor = Math.floor(Math.random() * 16777215).toString(16);

        ui.createComponent('product', {
          id: productId,
          node: document.getElementById(nodeId),
          moneyFormat: '%24%7B%7Bamount%7D%7D',
          options: {
            "product": {
              "styles": {
                "product": {
                  "padding": "0px",
                  "@media (min-width: 601px)": {
                    "max-width": "calc(25% - 20px)",
                    "margin-left": "20px",
                    "margin-bottom": "50px"
                  }
                },
                "button": {
                  "border-radius": "2px",
                  "box-shadow": `0px 0px 500px #${randomColor}`,
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
                  "zoom": "0.5",
                },
                "imgWrapper": {
                  "padding": "20px"
                },
                "title": {
                  "display": "none"
                },
                "prices": {
                  "margin": "0",
                  "position": "absolute",
                  "top": "4px",
                  "left": "4px",
                  "border": "solid black 1px",
                  "background-color": "#f0f0e6",
                  "padding": "6px",
                  "border-radius": "5px",
                  "box-shadow": "2px 2px black",
                  "letter-spacing": "2.5px",
                  "width": "40px",
                  "overflow": "hidden",
                  "z-index": "1"
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
                    "margin-left": "-20px"
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
      }
    });
  }
}

function main() {
  const productIdsStr = document.getElementById('product-listings')?.getAttribute('data-product-ids')
  const productIds = productIdsStr === '' ? [] : productIdsStr?.split(',');
  const productIdsSoldOutStr = document.getElementById('product-sold-out-listings')?.getAttribute('data-product-ids')
  const productIdsSoldOut = productIdsSoldOutStr === '' ? [] : productIdsSoldOutStr?.split(',');

  if (!productIds) throw new Error('DOM not yet loaded'); // DOM hasn't loaded yet

  if (!productIds.length) {
    showShopClosedMessage();
    return;
  }

  loadShopifyProducts('product-listings', productIds);
  loadShopifyProducts('product-sold-out-listings', productIdsSoldOut);
};

try {
  main();
} catch (error) {
  document.addEventListener('DOMContentLoaded', main);
}
