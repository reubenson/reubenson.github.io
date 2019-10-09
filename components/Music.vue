<template>
  <section id="sound">
    <h3>
      <a href="/#sound">
        Sound
      </a>
    </h3>

    <p>
      As a sound artist, he explores the notion of composition as the deployment of strategies for dealing with the propositional materiality of sound. Drawing from the origins of computing within the history of textile production, his current body of work attempts to formalize this idea of sonic materiality by abstracting principles of weaving and textile design into a generative framework for electronic music production.
    </p>

    <div class="subsection discography">
      <h4>Selected Discography</h4>
      <ul>
        <li>
          <p>
            <a href="https://wagtailrecordings.bandcamp.com/album/reuben-son-days-gone-by">Days Gone By</a> (2012)<br>7" record on Wagtail Recordings
          </p>
        </li>
        <li>
          <p>
            <a href="/private-chronology/07">Asleep at the Drawing Board</a> (2014)<br>7" record on Private Chronology
          </p>
        </li>
        <li>
          <p>
            <a href="/private-chronology/07">Still Sleeping</a> (2015)<br>Digital-only on Private Chronology
          </p>
        </li>
        <li>
          <p>
            <a href="http://estuary-ltd.com/releases/est5007/">Untitled Maquette</a> (2015)<br>7"/CD on Estuary Ltd.
          </p>
        </li>
      </ul>
    </div>

    <div class="subsection">
      <h4>In Collaboration</h4>
      <ul>
        <li>
          Worked with <a href="http://www.elikeszler.com/">Eli Keszler</a> in both instrumental and technical capacities for a number of installations and performances at sites such as <em>The Boston Center for the Arts</em>, <em>Eyebeam</em>, and the <em>MIT List Center</em>.
        </li>
        <li>
          Developed an app for <a href="http://www.callicoonfinearts.com/artists/james-hoff/">James Hoff</a> entitled <em class="collaboration-project-name">Hobo UFO</em>, in which navigation and camera movement in <em>Google Maps Street View</em> is made to respond to live audio and MIDI control in real-time. <em>Hobo UFO</em> was premiered at the <em>London ICA</em> in 2016, and presented at the <em>Unsound Festival</em> in Krakow in 2017.
        </li>
        <!-- <li>
          Served as recording engineer for the American Primitive guitarist Glenn Jones on his album <a href="http://www.thrilljockey.com/products/the-wanting">The Wanting</a> for <em>Thrill Jockey</em>, published 2011.
        </li> -->
      </ul>
    </div>

    <div class="subsection">
      <h4>QCVG</h4>
      <img src="https://reubenson-portfolio.s3.amazonaws.com/imgs/eurorack.jpg" alt="Modular Synthesizer" class="header-image">
      <div class="project-description-text">
        <p>
          The QCVG (Quad Control Voltage Generator) is a hardware and software package
          designed and developed for computerized
          control of an analogue modular synthesizer. On the hardware side, the QCVG is
          comprised of an Arduino Nano microcontroller interfaced to a pair of dual-DAC
          chips, which provide four channels of 0-4V CV (control voltage), and four
          trigger outputs (for triggering envelope generators in the synthesizer). Each
          CV output may be patched into an oscillator to control its pitch, and the
          trigger outputs are to be patched into envelope generators to control the
          articulation of notes through a voltage-controlled amplifier (VCA).
          The C++ library for the QCVG is still under development and a small
          production run of the hardware may be produced in the future.
        </p>
        <p>
          The following demo was recorded in a single unedited take. Source code on <a href="https://github.com/reubenson/qcvg">GitHub</a>.
        </p>
        <div class="soundcloud-embed">
          <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/209084436&amp;amp;color=666666&amp;amp;show_artwork=false&amp;amp;auto_play=false&amp;amp;hide_related=false&amp;amp;visual=false&amp;amp;show_user=false&amp;amp;show_reposts=false" scrolling="auto" width="100%" height="20px" />
        </div>
        <a href="/private-chronology/qcvg" class="read-more">Read More</a>
      </div>
    </div>

    <div class="subsection">
      <h4>Private Chronology</h4>
      <div class="project-description">
        <div class="project-description-text">
          <p>
            Private Chronology was a micro-label operating between 2009 and 2015, with 10 editions
            published in cassette, vinyl, and digital formats.
          </p>
          <p>
            <a href="/private-chronology/10">Still Sleeping</a>
            is the final release on Private Chronology, and consists of electronic music
            made with a Eurorack modular synthesizer. Although much of the sound design
            was executed using traditional analogue techniques, control signals were generated
            digitally using simple algorithms programmed on the <a href="/projects/QCVG">QCVG</a>.
          </p>
          <div class="soundcloud-embed">
            <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/195872118&amp;amp;color=666666&amp;amp;show_artwork=false&amp;amp;auto_play=false&amp;amp;hide_related=false&amp;amp;visual=false&amp;amp;show_user=false&amp;amp;show_reposts=false" scrolling="auto" width="100%" height="20px" />
          </div>
          <div class="soundcloud-embed">
            <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/195872114&amp;amp;color=666666&amp;amp;show_artwork=false&amp;amp;auto_play=false&amp;amp;hide_related=false&amp;amp;visual=false&amp;amp;show_user=false&amp;amp;show_reposts=false" scrolling="auto" width="100%" height="20px" />
          </div>
          <div class="soundcloud-embed">
            <iframe src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/195872108&amp;amp;color=666666&amp;amp;show_artwork=false&amp;amp;auto_play=false&amp;amp;hide_related=false&amp;amp;visual=false&amp;amp;show_user=false&amp;amp;show_reposts=false" scrolling="auto" width="100%" height="20px" />
          </div>
          <a href="/private-chronology/10" class="read-more">Visit the Private Chronology Archive</a>
        </div>
      </div>
    </div>
  </section>
</template>

<style lang="scss">
  .discography {
    a {
      font-style: italic;
    }

    ul {
      padding-left: 0;
    }

    li {
      list-style: none;
    }
  }
</style>
