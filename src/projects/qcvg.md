---
layout: project.njk
title: QCVG
description: Software & hardware for modular synthesizer
media: software, sound
year: 2015
---

The QCVG (Quad Control Voltage Generator) is a hardware and software package designed and developed for computerized control of an analogue modular synthesizer.
{.project-grid-item-full}

<figure class="project-grid-item-2">
  <img src="https://s3.amazonaws.com/privatechronology/assets/QCVG_2.jpg" alt="side view of QCVG module" class="flex-half">
  <figcaption>Side view of custom-built Eurorack module</figcaption>
</figure>

The QCVG is comprised of an Arduino Nano microcontroller interfaced to a pair of dual 12-bit DAC chips ([MCP4822](https://www.digikey.com/en/products/base-product/microchip-technology/150/MCP4822/37769)), which provide four channels of 0-4V CV (control voltage) for controlling oscillator pitch, and four trigger outputs (for triggering envelope generators in the synthesizer).
\
\
The [software is written in C++](https://github.com/reubenson/qcvg), and an example of music recorded with the QCVG can be heard on [SoundCloud](https://soundcloud.com/reubenson/qcvg-demo-sketch).
{.project-grid-item-4}

<figure class="project-grid-item-full">
  <img src="https://s3.amazonaws.com/privatechronology/assets/QCVG_1.jpg" alt="front view of QCVG module" class="flex-half">
  <figcaption>Front view of custom-built module</figcaption>
</figure>

<div class="soundcloud-embed project-grid-item-full">
  <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/209084436&color=666666&show_artwork=false&auto_play=false&hide_related=false&visual=false&show_user=false&show_reposts=false" scrolling="auto" width="100%" height="20px">
  </iframe>
</div>
