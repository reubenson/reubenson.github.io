---
layout: project.njk
title: ''
hideSeeMore: true
scriptUrl: /public/js/naive-sound.js
scriptUrl2: /public/js/nosleep.js
---
<div id="opening-screen">
  <p>
    Your phone will play a single note, which will slowly fade to silence over five minutes. If the volume is too quiet at first, adjust the volume to be louder and check if your phone is in silent mode. As you notice your note getting more faint, replace the sound with your own voice by humming or singing, matching the pitch, at whatever volume feels comfortable to you. Think of this note as the exhale of your breath, starting and stopping in a rhythm that feels natural to you.
  </p>

  <!-- <p>
    (If you don't hear any audio, make sure that your volume is up, and check that silent mode is not toggled on)
  </p> -->

  <div>
    <button id="naive-button" style="
        background-color: transparent; margin: auto; text-align: center; width: 100%; padding: 10px; border-radius: 5px; font-family: 'Ibarra Real Nova'; font-size: 20px; cursor: pointer; border: solid black 1px">
      Start
    </button>
  </div>
</div>

<div id="closing-message" style="filter: blur(100px); transition: filter 10s ease-in-out; height: 300px; position: absolute; left: 0; right: 0; bottom: 0; top: 0; margin: auto; z-index: -1;">
  <p>"Audio is an ephemeral social architecture made of air"</p>
  <p>- Micah Silver, <em>Figures in Air</em></p>
  <p style="margin-top: 50px">This is an in initial experiment in using a web-based score for sound-making, which combines elements of user performance, text-based instruction, and web-native audio. If you would like to develop a piece within this framework, or have feedback, <a href="mailto:reubenson@gmail.com">send me an email!</a></p>
</div>

<style>
  .blur {
    filter: blur(100px);
  }

  .unblur {
    filter: blur(0px) !important;
  }
</style>

<!-- <p>

</p> -->
