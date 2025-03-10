---
layout: demo.njk
title: airs
keywords: reuben son, the html review
description: typographic poems animated by the wind
# alternateUrl: https://thehtml.review/04/
alternateUrl: https://reubenson.com/airs
ogImage: ''
url: 
scriptUrl: /public/html-review/html-review.js
cssUrl: /aura.css
hideSeeMore: true
---
<header class="poems-header" role="banner">
  <h1><button class="nav-home" aria-label="Return to home">Airs</button></h1>
  <h2>
    <a href="https://thehtml.review/04/" target="_blank">The HTML Review<br/><em>Issue 04, Spring 2025</em></a>
  </h2>
</header>

<div class="poems-introduction" role="complementary">
  <img src="/public/html-review/santa-ana-winds.jpg" alt="photo of the Santa Ana winds" />
  <div class="poems-introduction-text">
    <em>Airs</em> is a collection of poems
    <span>which you can navigate by clicking on the left and right sides of the <em>page</em> or <em>screen</em></span>
    <span>accompanied by recordings of the wind</span>
  </div>
</div>

<div id="poems-container" role="main">
  <div id="part-1" class="poem-container" role="region" aria-label="part 1">
    <div class="visually-hidden" role="note">
      <p>The first part of Airs is a set of seventeen brief poems.</p>
    </div>
    {% include "./poem-1.md" %}
  </div>
  <div id="part-2" class="poem-container" role="region" aria-label="part 2">
    <div class="visually-hidden" role="note">
      <p>The second part of Airs is a visually animated poem of infinite duration. It begins with a rectangular arrangement of the letter 'x' repeated over and over, creating a typographic grid resembling the screen of a window in your home that keeps bugs from getting in while you have the window open. Audio data from the recordings of wind is processed and converted to a moving image, and then overlaid on top of the typographic grid. Various CSS filters are then applied to these two visual elements, producing an animation that is expressive of what a concrete poem would look like if turned into a screensaver.</p>
    </div>
  {% include "./poem-2.md" %}
  </div>
</div>

<nav role="navigation" aria-label="Poem sections">
  <button class="nav-part-1 start" data-part="part-1" aria-controls="part-1">
    <span>Part I:</span> The Page
    <span class="visually-hidden">(typographically set poem that can be navigated one by one with the right arrow key)</span>
  </button>
  <button class="nav-part-2 start" data-part="part-2" aria-controls="part-2">
    <span>Part II:</span> The Screen
    <span class="visually-hidden">(visual poem with text alternative available)</span>
  </button>
</nav>

<svg xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <filter id="wind-filter-sm">
      <feImage xlink:href="/public/html-review/santa-ana-winds.jpg" 
        result="slide-0" 
        height="500px"
        width="500px"
        >
      </feImage>
      <feDisplacementMap in2="slide-0" in="SourceGraphic" scale="12" xChannelSelector="G" yChannelSelector="R"></feDisplacementMap>
    </filter>
    <filter id="wind-filter-lg">
      <feImage xlink:href="/public/html-review/santa-ana-winds.jpg" 
        result="slide-0" 
        height="600px"
        width="600px"
        >
      </feImage>
      <feDisplacementMap in2="slide-0" in="SourceGraphic" scale="8" xChannelSelector="G" yChannelSelector="R"></feDisplacementMap>
    </filter>
  </defs>
</svg>
