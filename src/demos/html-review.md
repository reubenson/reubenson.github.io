---
layout: demo.njk
title: airs
subtitle: 
description: 
url: 
scriptUrl: /public/js/html-review.js
cssUrl: /aura.css
hideSeeMore: true
---
<header class="poems-header">
  <h1><button class="nav-home">Airs</button></h1>
  <h2>
    <a href="https://thehtml.review/04/">The HTML Review<br/><em>Issue 04, Spring 2025</em></a>
  </h2>
</header>

<div class="poems-description">

  <img src="/public/html-review/santa-ana-winds.jpg" alt="Santa Ana Winds" />

  <div class="poems-description-text">

    <em>Airs</em> is a collection of poems
    <span>in two parts</span>
    accompanied by sound recordings of the quiet and teeming air
    <span>which you can navigate by clicking left and right</span>
  </div>
</div>

<nav>
  <button class="nav-part-1 start" data-part="part-1"><span>Part I:</span> The Page</button>
  <button class="nav-part-2 start" data-part="part-2"><span>Part II:</span> The Screen</button>
</nav>
<div id="poems-container">
  <!-- <div class="poems-container-blur"></div> -->
  <div id="part-1" class="poem-container">
    {% include "./poem-1.md" %}
  </div>
  <div id="part-2" class="poem-container">
    {% include "./poem-2.md" %}
  </div>
  <!-- <div class="credits">
    <h2 class="credits-title">Airs</h2>
  </div> -->
</div>
<!-- <div class="credits"> -->
  <!-- <h2 class="credits-title">Airs</h2> -->
  <!-- <p class="credits-text">
    Recordings of wind made between 2020 and 2024.
    <br/>
    Electronics recorded at Electronmusicstudion in 2019.
  </p>
</div> -->

<svg viewBox="0 0 600 400" width="600" height="400" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <filter id="wind-filter-sm">
      <feImage xlink:href="/public/html-review/santa-ana-winds.jpg" 
        result="slide-0" 
        height="500px"
        width="500px"
        >
      </feImage>
      <feDisplacementMap in2="slide-0" in="SourceGraphic" scale="6" xChannelSelector="G" yChannelSelector="R"></feDisplacementMap>
    </filter>
    <filter id="wind-filter-lg">
      <feImage xlink:href="/public/html-review/santa-ana-winds.jpg" 
        result="slide-0" 
        height="1000px"
        width="1000px"
        >
      </feImage>
      <feDisplacementMap in2="slide-0" in="SourceGraphic" scale="12" xChannelSelector="G" yChannelSelector="R"></feDisplacementMap>
    </filter>
  </defs>
</svg>