---
layout: project.njk
title: Wherever You Go There You Are
subtitle: 
description: 
url: 
layoutType: one-column
scriptUrl: /public/js/html-review.js
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

<div style="position: relative; filter: contrast(10)">
  <p style="font-size: 34px; line-height: 34px; filter: blur(1px); height: 34px; text-align: center; margin: auto; position: absolute; bottom: 100px; right: 0; left: 0; color: #f0f0e6; width: fit-content; background-color: transparent">Example text overlaid on <strong>aura</strong></p>
  <canvas id="visualizer" width="200" height="200" style="zoom: 1; filter: blur(25px) contrast(1); position: relative; top: 0; right: 0; left: 0; margin: auto; z-index: -1; width: 100%"></canvas>
</div>
<!-- Image input
<input type="file" id="imageInput" accept="image/*"> -->

<!-- Audio input
<input type="file" id="audioInput" accept="audio/mp3"> -->
