---
layout: project.njk
title: QCVG
---
# {{ title }}
## Quad Control Voltage Generator

The QCVG (Quad Control Voltage Generator) is a hardware and software package designed and developed for computerized control of an analogue modular synthesizer.

<figure>
  <img src="https://s3.amazonaws.com/privatechronology/assets/QCVG_1.jpg" alt="front view of QCVG module" class="flex-half">
  <img src="https://s3.amazonaws.com/privatechronology/assets/QCVG_2.jpg" alt="side view of QCVG module" class="flex-half">
  <figcaption>Custom synthesizer module designed, soldered, and produced by Reuben Son</figcaption>
</figure>

The QCVG is comprised of an Arduino Nano microcontroller interfaced to a pair of dual 12-bit DAC chips ([MCP4822](https://www.digikey.com/en/products/base-product/microchip-technology/150/MCP4822/37769)), which provide four channels of 0-4V CV (control voltage) for controlling oscillator pitch, and four trigger outputs (for triggering envelope generators in the synthesizer).
              
The [software is written in C++](https://github.com/reubenson/qcvg), and an example of music recorded with the QCVG can be heard on [SoundCloud](https://soundcloud.com/reubenson/qcvg-demo-sketch).

<div class="soundcloud-embed">
  <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/209084436&color=666666&show_artwork=false&auto_play=false&hide_related=false&visual=false&show_user=false&show_reposts=false" scrolling="auto" width="100%" height="20px">
  </iframe>
</div>