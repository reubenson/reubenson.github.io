 /* eslint-disable */
<template>
  <div style="background-color:#f9f9f8"><div id="header">
    <script type="text/javascript">
$(document).ready(function () {
    $('#alpha').on('mouseover', 'a', function () {
        var $li = $(this).closest('a');
        if($li.is('.current')){
            return;
        }
        console.log($(this).attr('href'));
        if ($(this).attr('href') != '#') {return;}
        $('.current').not( $li.addClass('current') ).removeClass('current');
        //$('.current').not( $(this).closest('li').addClass('current') ).removeClass('current');
        // fade out all open subcontents
        $('.pbox:visible').hide(300);
        // fade in new selected subcontent
        $('.pbox[id=' + $(this).attr('data-id') + ']').show(300);
    }).find('a:first').mouseover();
});

$('.fancybox-thumbs').fancybox({
prevEffect : 'none',
nextEffect : 'none',

closeBtn  : false,
arrows    : false,
nextClick : true,

helpers : {
thumbs : {
width  : 50,
height : 50
}
}
});
</script>
    <div id="logo">
         <a href="http://www.privatechronology.com/" accesskey="1">
         <img src="https://s3.amazonaws.com/privatechronology/assets/LogoFFCC00.png">
         </a>
    </div>
</div>
<!--<body style="background-color:#e7e7e4">-->

  <div id="container">
    <div id="content">
      <div id="alpha">
        <!-- <div class="page-body"> -->
        <div id="page-bar" style="margin-top:20px"></div>
        <p id="bio">

        <a href="#" data-id="div1" class="">Reuben Son</a>
        works with generative and electroacoustic processes, utilizing guitars, tape machines, and a Eurorack modular synthesizer.
        His work explores how compositional complexity can emerge from simple interactions between materials, systems, and environments. He places particular focus on how things <i>happen to sound</i>, the ambiguous ways in which causality may become diffuse as actions become audible
        <!-- Time is treated as a pliable material, which may be given body (as magnetic tape, which can be used to activate guitar strings), or subjected to operations that allow accumulated variations to be rendered as texture.  -->
        <br><br>
        <a href="#" data-id="div2" class="">Beginning with studio experiments in 2009</a>, Reuben has used electric and acoustic guitars to explore various configurations of feedback within tape recording systems. Although recording devices are typically employed to reduce the generation of artifacts, such artifacts may be accentuated and accumulated through feedback. The accretion of characteristic resonances, flaws, and instabilities during the recording process lead to result that fuses the original material with the physical realities of the tape feedback system.
<!--
The generative instability of the tape feedback systems are responsible for the character of these pieces.
-->
        In addition to studio-based work, he has also developed a <a href="#" data-id="div3" class="current">modified electric guitar</a> for live performance, in which the instrument has been reduced to the mere sum of its electromechanical parts.

        Most recently, his work has incorporated <a href="#" data-id="div4" class="">electronic synthesis</a> as a means to work with sound from first principles and implement generative frameworks in a more controlled manner.
        He has designed and built several custom synthesizer modules, including an analog interface to an Arduino microcontroller running custom software.

        <br><br>

        He has performed at venues and events such as the Goethe-Institut in Boston, Eyebeam (NYC), Caramoor Center for Music and the Arts (Katonah, NY), and the Contemporary Arts International at the Quarry (Acton, MA).
        Outside of his own work, he has served as recording engineer to the notable American Primitive guitarist, <a href="http://www.thrilljockey.com/thrill/Glenn-Jones/The-Wanting#.VEbRUd4fLao" target="_blank">Glenn Jones</a>, and has worked in both instrumental and technical capacities with NY-based composer and installation artist, <a href="http://elikeszler.com" target="_blank">Eli Keszler</a><a>.
        </a></p><a>
      </a></div><a> <!-- alpha -->

<!-- </div> -->

</a><div id="beta"><a>
  </a><h1><a>
  <!-- <p /> -->
  </a><div class="pbox" id="div1" style="display: none;"><a>
    <h2 id="widget-title">Reuben Son (b. 1986)</h2>
    <div id="page-bar"></div>
    </a><a class="fancybox-thumbs" rel="group" data-fancybox-group="thumbs" href="https://s3.amazonaws.com/privatechronology/assets/JustinSnow_Waterworks.jpg">
    <img src="https://s3.amazonaws.com/privatechronology/assets/JustinSnow_Waterworks.jpg" width="100%"></a>
    Reuben Son at the Metropolitan Waterworks Museum in Boston, MA. Photo: Justin Snow
    <br><br>

  </div>

  <div class="pbox" id="div2" style="display: none;">
    <h2 id="widget-title">Tape Feedback Systems</h2>
    <div id="page-bar"></div>
    <a class="fancybox-thumbs" rel="group" data-fancybox-group="thumbs" href="https://s3.amazonaws.com/privatechronology/assets/Studio2009_Narrow.jpg">
    <img src="https://s3.amazonaws.com/privatechronology/assets/Studio2009_Narrow.jpg" width="100%"></a>
    <br><br>
    <iframe width="100%" height="20" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/167735545&amp;color=666666&amp;show_artwork=false&amp;auto_play=false&amp;hide_related=false&amp;visual=false&amp;show_user=false&amp;show_reposts=false"></iframe>

    <div id="page-bar"></div>

    In "05.06.2010", an internal feedback configuration (tape echo) is used to recursively process a recording of an acoustic guitar improvisation, producing electroacoustic reverberations that extend the acoustics inhered in the original recording.
    <br><br>
    <iframe width="100%" height="20" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/168770303&amp;color=666666&amp;show_artwork=false&amp;auto_play=false&amp;hide_related=false&amp;visual=false&amp;show_user=false&amp;show_reposts=false"></iframe>

    <br><div id="page-bar"></div>
    In "Sensual Square", an improvisation on acoustic guitar was recorded with an additional microphone pointed to an open window on a rainy autumn evening. These materials were recorded directly to tape with the tape recorder's erase head partially bypassed, thus dubbing over the remains of previous tape experiments. Such experiences with informal aleatoric procedures and loose contingency have since motivated more pointed investigations into the superposability of material and time.
  </div>

  <div class="pbox" id="div3" style="display: block;">
    <h2 id="widget-title">Breaking Guitar</h2>
    <div id="page-bar"></div>
    <a class="fancybox-thumbs" rel="group" data-fancybox-group="thumbs" href="https://s3.amazonaws.com/privatechronology/assets/ElectricGuitarCrop.jpg">
    <img src="https://s3.amazonaws.com/privatechronology/assets/ElectricGuitarCrop.jpg" width="100%"></a>
    <br><br>
    <iframe width="100%" height="20" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/116243451&amp;color=666666&amp;show_artwork=false&amp;auto_play=false&amp;hide_related=false&amp;visual=false&amp;show_user=false&amp;show_reposts=false"></iframe>

    <div id="page-bar"></div>

    With live performance in mind, an electric guitar has been modified to provide separate outputs for each of the two factory-installed humbucker pickups. Each output has been wired in series with a momentary switch that is 'off' by default and allows signal to pass only upon pressing the switch corresponding to each pickup. As a result, the guitar can no longer be played in the traditional fashion. Through operation of the switches, vibrations from the guitar or extrinsic electromagnetic signals in the vicinity of pickups themselves may be directed to either, neither, or both channels in a highly controlled but crude fashion. While pioneering guitarists such as Keith Rowe and Christian Fennesz have worked to expand and extend the 'language' of electric guitars, 'Breaking Guitar' takes an opposite approach in which the vocabulary is radically reduced. Such a breakdown of musical language enables the articulation of distortions and gaps in the relationship between site (the guitar) and the production of sound.

  </div>

  <div class="pbox" id="div4" style="display: none;">
     <h2 id="widget-title">Musique Electronique</h2>
    <div id="page-bar"></div>
    <a class="fancybox-thumbs" rel="group" data-fancybox-group="thumbs" href="https://s3.amazonaws.com/privatechronology/assets/DSCF3890.JPG">
    <img src="https://s3.amazonaws.com/privatechronology/assets/DSCF3890.JPG" width="100%"></a>
    <iframe width="100%" height="20" scrolling="no" frameborder="no" src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/173072739&amp;color=666666&amp;show_artwork=false&amp;auto_play=false&amp;hide_related=false&amp;visual=false&amp;show_user=false&amp;show_reposts=false"></iframe>

    <div id="page-bar"></div>

    "Electronic Music for the Metropolitan Waterworks Museum" is a short site-specific piece composed for and recorded at the historic water pumping station located in Brookline, MA on November 20, 2013.
    Over its brief duration, a small selection of electronically synthesized sounds were projected into the large, open room containing three massive, decomissioned steam pumps. The piece is roughly of two parts, beginning with a drone that consists of cross-modulating low frequency oscillators and algorithmically detuned sine tones, which then gives way to a four-voice canon that decays into a stochastically depopulating grid of impulse triggers. These sounds, generated in real-time by a software-controlled modular synthesizer, were chosen with the intention of activating the unique acoustics of the reflective brick and steel surfaces that define the space.
  </div>

<!-- </h3> -->
</h1></div>
</div>
</div>


</div>
</template>

<script>
export default {
  layout: 'private-chronology'
  // page component definitions
}
</script>
