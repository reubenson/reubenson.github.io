---
layout: demo.njk
title: airs
subtitle: 
description: 
url: 
# layoutType: one-column
scriptUrl: /public/js/html-review.js
# scriptUrl2: /public/js/random-noise-processor.js
cssUrl: /aura.css
hideSeeMore: true
---
Airs: a poem in two parts

As you browse through these texts, recordings of the wind (made 2022-2024) will play. The underlying gesture in both parts is that of subjecting typographic elements to processes that register traces of the wind.

<div id="player" class="player">
  <!-- <p class="description">Part I: The Pages</p> -->
  <button class="start" data-part="part-1">Part I: The Pages</button>
  <footer>
    <p>I am not really sure how to write poems but I am trying to write poems. The typographic distortion adds texture to the page, but I don't want it to look too much like print. I do like how it slows down the reading experience, which complements the quiet sound of air moving.</p>
  </footer>
</div>

<div id="player" class="player">
  <!-- <p class="description">Part II: The Window</p> -->
  <button class="start" data-part="part-2">Part II: The Window</button>
  <footer>
    <p>Lattice of Xs (a representational gesture of the screen of a window), also under typographic distortion. It's too fast right now, too much, and I want it instead to feel more like a canopy of leaves rustling in the wind. In addition to the sound of wind, there is an additional resonance. I want it to be like an aeolian harp, taught steel wires vibrating in the wind. This additional sound is processed/produced in the browser, and is what is driving the animation.</p>
  </footer>
</div>

<button id="close">Close</button>
<div id="canvas-container">
  <div id="part-1" class="poem-container">
    {% include "./poem-1.md" %}
  </div>
  <div id="part-2" class="poem-container">
    <canvas id="visualizer" width="128" height="512"></canvas>
    {% include "./poem-2.md" %}
  </div>

  



  <!-- <p id="text"></p> -->
   <!-- “Every crystal was a masterpiece of design and no one design was ever repeated. When a snowflake melted, that design was forever lost,” -->
   <!-- https://arc.net/l/quote/haruwzln -->
</div>



<!-- Prototype for the presentation of prose poetry on the page with a combination of visual manipulation, coloration, and animation.

The text for these poems come from research into the history of auras and fingerprinting. Using the [FingerprintJS](https://fingerprint.com/blog/browser-fingerprinting-techniques/) NPM library, the animation and coloration will be rendered differently across different browser profiles (not limited to user agent).

Approximately twenty of these poems will be presented in total, which readers can click through on mobile & desktop devices.


~~A proposal for a visual-text piece around the theme of the digital fingerprint.~~

~~As implemented by libraries like [FingerprintJS](https://fingerprint.com/blog/browser-fingerprinting-techniques/), websites can uniquely identify users based on a collection of machine-specific attributes that by themselves are insignificant but in aggregate are unlikely to be repeated across individuals.~~

~~My initial idea was to translate the visitor's digital fingerprint into a subtly animating color-field <em>aura</em>, which would appear differently for each visitor. Prose would be rendered alongside this aura, or alternatively, I was also thinking of presenting concrete poems, inspired by Dom Sylvestre Houedard ([example](https://images.fastcompany.com/image/upload/f_webp,q_auto,c_fit,w_1024,h_1024/wp-cms/uploads/2017/05/7-the-benedictine-monk-who-connected-concrete-poetry-1.jpg)).~~

~~I started tinkering with ways of animating the aura, to give it a more organic sense of texture, and to see what sort of text this might inspire me to write. But I got carried away with the animation and it became more like experimental film of the mid-twentieth century. So now I'm wondering whether a prose "film" might be closer to the format I'm interested in presenting, with the text appearing almost like subtitles.~~

~~I think there's a few different directions this project might go, but the content would ultimately be a sort of meditation on the connection between digital fingerprint and aura. And while I think it would be educational to address surveillance technology, I plan to focus the overall tone towards something that feels numinous, as opposed to didactic.~~

~~Click below to see a very rough prototype of color-field animation as a sort of film.~~ -->

<!-- In addition to the prose poems, the visual presentation will translate the visitor's digital fingerprint into a subtly animating color-field "aura", which will appear differently for each visitor. -->

<!-- SVG filter seems like a good way of customizing the aura to a specific color palette without having to write explicit pixel logic -->
<!-- https://css-irl.info/into-the-matrix-with-svg-filters/ -->
<svg viewBox="0 0 600 400" width="600" height="400" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <filter id="test">
      <feColorMatrix in="SourceGraphic"
        type="matrix"
        values="0 1 0 0 0
                0 1 0 0 0
                0 1 0 0 0
                0 0 0 1 0" />
    </filter>
    <filter id="duo">
      <feColorMatrix in="SourceGraphic"
        type="matrix"
        values="1 1 1 0 0
		            0 0 0 -0.5 0
		            0 0 0 0.2 0
		            0 0 0 1 0 " />
    </filter>
    <filter id="black-to-transparent">
        <feColorMatrix type="matrix" values="
          1 0 0 0 0
          0 1 0 0 0
          0 0 1 0 0
          1 1 1 1 -1" />
      </filter>
     <filter id="dis-filter">
      <feImage xlink:href="" result="dis-filter" preserveAspectRatio="xMidYMid meet" width="430px" x="20" y="0"></feImage><feDisplacementMap in2="dis-filter" in="SourceGraphic" scale="15" xChannelSelector="A" yChannelSelector="R"></feDisplacementMap>
     </filter> 
      <filter id="displacementFilter">
    <feTurbulence
      type="turbulence"
      baseFrequency="0.05"
      numOctaves="2"
      result="turbulence" />
    <feDisplacementMap
      in2="turbulence"
      in="SourceGraphic"
      scale="50"
      xChannelSelector="R"
      yChannelSelector="G" />
    </filter>
    <filter id="wind-filter">
      <feImage xlink:href="/public/html-review/santa-ana-winds.jpg" result="slide-0" preserveAspectRatio="xMidYMid meet" width="860px" x="15px" y="0"></feImage>
      <feDisplacementMap in2="slide-0" in="SourceGraphic" scale="10" xChannelSelector="A" yChannelSelector="R"></feDisplacementMap>
    </filter>
  </defs>
</svg>