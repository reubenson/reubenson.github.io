---
layout: project.njk
title: Wherever You Go There You Are
subtitle: 
description: 
url: 
layoutType: one-column
scriptUrl: /public/js/html-review.js
# scriptUrl2: /public/js/random-noise-processor.js
cssUrl: /aura.css
hideSeeMore: true
---
A proposal for a visual-text piece around the theme of the digital fingerprint.

As implemented by libraries like [FingerprintJS](https://fingerprint.com/blog/browser-fingerprinting-techniques/), websites can uniquely identify users based on a collection of machine-specific attributes that by themselves are insignificant but in aggregate are unlikely to be repeated across individuals.

My initial idea was to translate the visitor's digital fingerprint into a subtly animating color-field <em>aura</em>, which would appear differently for each visitor. Prose would be rendered alongside this aura, or alternatively, I was also thinking of presenting concrete poems, inspired by Dom Sylvestre Houedard ([example](https://images.fastcompany.com/image/upload/f_webp,q_auto,c_fit,w_1024,h_1024/wp-cms/uploads/2017/05/7-the-benedictine-monk-who-connected-concrete-poetry-1.jpg)).

I started tinkering with ways of animating the aura, to give it a more organic sense of texture, and to see what sort of text this might inspire me to write. But I got carried away with the animation and it became more like experimental film of the mid-twentieth century. So now I'm wondering whether a prose "film" might be closer to the format I'm interested in presenting, with the text appearing almost like subtitles.

I think there's a few different directions this project might go, but the content would ultimately be a sort of meditation on the connection between digital fingerprint and aura. And while I think it would be educational to address surveillance technology, I plan to focus the overall tone towards something that feels numinous, as opposed to didactic.

Click below to see a very rough prototype of color-field animation as a sort of film.

<!-- In addition to the prose poems, the visual presentation will translate the visitor's digital fingerprint into a subtly animating color-field "aura", which will appear differently for each visitor. -->

<button id="start">Start Animation</button>

<div id="canvas-container">
<!-- <img src="/public/html-review/bently-snowflakes-cover.jpg" width: 300 /> -->
  <!-- <p>Example text overlaid on <strong>aura</strong></p> -->

  <p>He would examine the snowflakes with a magnifying glass and sweep away the ones he didn’t want with a turkey feather</p>
   <!-- “Every crystal was a masterpiece of design and no one design was ever repeated. When a snowflake melted, that design was forever lost,” -->
   <!-- https://arc.net/l/quote/haruwzln -->
  <canvas id="visualizer" width="200" height="200"></canvas>
</div>

<!-- SVG filter seems like a good way of customizing the aura to a specific color palette without having to write explicit pixel logic -->
<!-- https://css-irl.info/into-the-matrix-with-svg-filters/ -->
<svg viewBox="0 0 600 400" width="0" height="0" xmlns:xlink="http://www.w3.org/1999/xlink">
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
    <filter id="displacementFilter">
      <feImage xlink:href="/public/html-review/bently-snowflakes-cover.jpg" result="beagle"/>
      <feTurbulence
        type="turbulence"
        baseFrequency="0.001"
        numOctaves="4"
        result="turbulence" />
      <feDisplacementMap
        in2="beagle"
        in="SourceGraphic"
        scale="125"
        xChannelSelector="R"
        yChannelSelector="G" />
  </filter>
  </defs>
</svg>