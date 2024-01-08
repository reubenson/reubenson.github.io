---
layout: project.njk
title: Reflections on my time at Recurse Center
tags: posts
---
## {{ title }}

It's easy to look back on my six weeks at [Recurse Center](https://recurse.com/) this fall and feel a pang of anxiety about what I didn't manage to do. I arrived here after having not worked as an IC in over two years, and accordingly, I come with a long list of things I might like to learn, and balancing focus with breadth was to be a real challenge.

Questions, both big and small, loomed over me, and in a swirl of curiosity and nervousness, I proceeded to give myself the space to take on Recurse Center's core directive of ```becoming a dramatically better programmer```, however I might interpret that.

<!-- <div class="divider-line">〜〜〜</div> -->

### Archives and AI

I found at Recurse a community of highly motivated and brilliant technologists, all of us brimming with nervous excitement to embark on new projects, and to learn something about ourselves in the process. Like many others, AI was on my bingo board of potential areas of exploration, and I decided to join up with a study group around the fundamentals of machine learning. We took [Andrej Karpathy's video series on neural nets](https://karpathy.ai/zero-to-hero.html) as our curriculum, working our way on up from the simplest neural net to a transformer model. The emergent behavior from simple mechanics of [back-propagation](https://karpathy.medium.com/yes-you-should-understand-backprop-e2f06eab496b) and [stochastic gradient descent](https://karpathy.github.io/neuralnets/#:~:text=commonly%20referred%20as-,Stochastic%20Gradient%20Descent,-.%20The%20interesting%20part) fascinated me, as did the expressiveness of entropy introduced through techniques like [batch normalization](https://en.wikipedia.org/wiki/Batch_normalization). But I also found that developing a first-principles understanding of the material only got me so far, and it was challenging to wrap my head around the broader existential questions around this technology. These questions are partially addressed within the frameworks of AI Safety and Alignment, but I also found my attention wandering to the question of archives, which now live a double life as training sets for ML models.

In our current age of planetary-scale existential precarity, archives seem to have come into a kind of fashion, offering a degree of solace in feeling knowable, static, and grounding. The training procedures of AI foundation models like GPT have a close relationship with archives too, but instead rely on their accessibility, volume, and givenness, which allows archives to be composed and instrumentalized as training sets. As I began building my transformer model, based on the landmark [Attention is All You Need](https://arxiv.org/abs/1706.03762) paper, I decided to take a broader approach to my introduction to machine learning, and to explore the construction of an archive alongside the model in order to blur the distinction between them, between conservation and generation.

<figure>
<img src="https://reubenson-portfolio.s3.us-east-1.amazonaws.com/assets/Pipkin-curation.jpg" alt="screenshot of quote from Everest Pipkin on curating a training set" style="max-width:420px; margin: auto;"/>
<figcaption>Screenshot from Everest Pipkin's <a href="https://www.youtube.com/watch?v=IYNKs8vfocc" target="_blank">Corpora as medium: on the work of curating a poetic textual dataset</a></figcaption>
</figure>

In Everest Pipkin's [Corpora as medium](https://www.youtube.com/watch?v=IYNKs8vfocc) talk, they describe the construction of a training set for machine learning as an act of curation, and reminds us that _curation_ comes from the Latin word for care, _cura_. More than conveying the old adage _garbage in garbage out_, I take this as an insight about the importance of provenance in the age of synthetic media. While the _sui generis_ quality of a work will still be significant, _what_ something is will necessarily also be coupled to _where it's from_. In this sense, AI will increasingly take on the quality of an archive (as its oracle), and AI will be indispensible to the articulation of archives (both institutional and the personal).

<!-- the generative creativity of humans wielding AI tools  -->

<!-- the artifacts of generative AI won't be  -->

<!-- I take this to be a deeper reading of the phrase "attention is all you need", suggestive of  -->

<div class="divider-line">〜〜〜</div>

Before my professional career as a software engineer, I began writing music software for myself, [programming in C++ for Arduino to control electronic music instruments](https://reubenson.com/qcvg/). Combining software development with sound art has been a continuous thread throughout the intervening decade, with projects like [HOBO UFO](https://www.youtube.com/watch?v=ERbfczLUr-A), [Weaving Music](https://reubenson.com/weaving/), and most recently, [Frog Chorus](https://frogchor.us/). In this tradition, I found myself looking to music on the early web (the world wide web turned 30 this year !!!) as a focal point for developing the archive that would also serve as the training set for my ML model project, as an act of both _curation_ and _care_.

<!-- Before the age of MP3s, music on the web was dominated by MIDI, and I felt an impulse to give this history a closer look, in order to understand something about the drive of technological transformation in the current moment.   -->

Before MP3s came to dominate how people listen to music on the internet, the sounds of the early web ([and even BBS and Usenet before the world wide web](https://forums.theregister.com/forum/all/2019/07/12/a_pair_of_usenet_pirates_get_66_months_behind_bars/#:~:text=Usenet%2C%20that%20brings%20back%20memories.%20Used%20to%20use%20it%20when%20I%20started%20at%20Uni.%20Great%20source%20of%20mod%20and%20midi%20files%2Cnone%20of%20that%20new%20fangled%20MP3%20nonsence!)) were predominantly expressed via MIDI. Its tiny file-size was accomodated by bandwidth limitations of the 1980s and 90s, and web-native support for the MIDI file format came early from browsers like [Internet Explorer and Netscape Navigator](https://www.vice.com/en/article/a359xe/the-internets-first-hit-file-format-wasnt-the-mp3-it-was-midi#:~:text=In%20particular%2C%20Microsoft%E2%80%99s%20Internet%20Explorer%20supported%20it%20as%20far%20back%20as%20version%201.0%2C%20while%20Netscape%20Navigator%20supported%20it%20with%20the%20use%20of%20a%20plug%2Din%20and%20added%20native%20support%20starting%20in%20version%203.0.).

The MIDI files collected here and used to train the model were once very new. In sifting through them, I've been searching for the feeling of technological transformation in an earlier age, how they combine the possibilties of new aesthetic experiences with the technics of producing and distributing this particular format of media. In giving a closer look at this history, I've hoped to find something playful and eternal about the drive of technological transformation in the current moment.

Of the artists who shared their MIDI work in the early years of the web, the researcher and musician [John Sankey](https://johnsankey.ca/), who was once known to many as [The Harpsichordist to the Internet](http://www.jsbach.net/midi/midi_johnsankey.html), conveys a brief, but poignant retelling of how his MIDI recordings were appropriated by a commercial entity. His experience swayed him away from sharing work directly on the open web going forwards, a reactionary turn that perhaps presages what [Venkatesh Rao has described as the cozy web](https://studio.ribbonfarm.com/p/the-extended-internet-universe) and [Yancey Strickler calls _dark forest spaces_](https://onezero.medium.com/the-dark-forest-theory-of-the-internet-7dc3e68a7cb1) after the emergence of monolithic Web2 platforms and surveillance capitalism.

> "I'm far from the first musician whose heart has been touched by Bach's music, and I won't be the last. I've played all of his harpsichord music at one time or another, and started to record it. Then a creep rubber-banded the tempi, pretended they were his and were played on a piano, legally copyrighted the results in the USA, and threatened legal action against sites that refused to carry them [...] The sites that carry his files know what happened, and don't care ... I play for myself and friends now." - [John Sankey](https://johnsankey.ca/bach.html)

It's not without intended irony that I've included John Sankey's MIDI performances of Bach in the training set for this model (though, [I'm certainly not the first either](https://arxiv.org/pdf/1812.06669.pdf)). MIDI files from this time are highly technical objects requiring specialized hardware and software in addition to musicanship, but yet now overloaded with valences of nostalgia and kitsch. The justaposition of these qualties with AI felt appropriate in balancing sensibilities, and captures something about the way technology dilates time, extending both forwards and backwards in time. 

<!-- <div class="divider-line">〜〜〜</div> -->

<!-- But also to explore questions of how AI and archives will continue to complement each other, and how the era of generative art comes with expansive and difficult questions of _where_ art is generated _from_ ... and what is this all _for_? -->


<!-- With this context in mind, I began developing a machine learning model trained on music from the early web.  -->

<!-- <div class="divider-line">〜〜〜</div> -->

### Flowers from the past

Earlier this year, as I began a year-long personal sabbatical after my last two years as Engineering Manager overseeing the [New York Magazine](https://nymag.com) network of sites, I was eager to get on the keyboard again. I began by developing [Frog Chorus](https://frogchor.us), a single page web-app that allows mobile devices to sing to each other as if they were frogs, relying on acoustic proximity to communicate with each other instead of network protocols. It's a playful gesture towards an internet that enters human experience, distanced from the mimetic primacy of text and image that facilitates the network effects of large scale platforms.

As I've been been doing a bit of soul-searching around my professional and personal relationship to technology, I've felt an urgency towards the poetic capacity of the internet, of the kinds of projects covered by [Naive Weekly](https://www.naiveweekly.com/), [The HTML Review](https://thehtml.review/), and [The School for Poetic Computation](https://sfpc.io/). In a period of massive, accelerating technological tranformation, I felt it necessary to revisit the energy that first brought me to software, and the web, in the first place.

<figure>
    <img src="https://images.metmuseum.org/CRDImages/ep/original/DT2159.jpg" alt="painting of flowers by painter Odilon Redon" style="max-width:420px; margin: auto;"/>
    <figcaption><a href="https://www.metmuseum.org/art/collection/search/437382" target="_blank">Odilon Redon, Vase of Flowers (Pink Background), ca. 1906 </a>; <a href="https://twitter.com/futuristflower/status/1742968668663742488" target="_blank"></a></figcaption>
</figure>

On a trip to The Metropolitan Museum of Art in March 2023, I was struck by a couple paintings tucked into an alcove by the French Symbolist painter Odilon Redon. Although he is predominantly known for his work with charcoal, I was enthralled both by his delicate use of color, and by the exhibition text, which informed me that he wrote about his own work in the following way:

> “All my originality, then, consists in giving human life to unlikely creatures according to the laws of probability, while, as much as possible, putting the logic of the visible at the service of the invisible” - [Odilon Redon](https://brooklynrail.org/2005/11/artseen/beyond-the-visible-the-art-of-odilon-red#:~:text=%E2%80%9CMy%20originality%2C%E2%80%9D%20wrote%20Redon%2C%20%E2%80%9Cconsists%20in%20bringing%20to%20life%E2%80%A6improbable%20beings%20and%20making%20them%20live%20according%20to%20the%20laws%20of%20probability%2C%20by%20putting%E2%80%94as%20far%20as%20possible%E2%80%94the%20logic%20of%20the%20Visible%20at%20the%20service%20of%20the%20Invisible.%E2%80%9D)

With its invocation of _bringing to life_ and laws of _probability_, it feels almost as appropriate for the aims of AI, as the work of a painter. But what exactly is this _invisble_ thing? The circularity of technological transformation seems very much to be about how technologic societies reroute the logic of the visible back towards itself.

Leaving this question unresolved, I'm pleased to share [the informal archive and simple ML model](https://reubenson.com/midi-archive/) I've developed while grappling with machine learning. 

The 800k parameters decoder-only transformer model has been deployed as an AWS Lambda function, which is triggered every day around noon (GMT) to produce a few minutes of music. Each time the model is invoked, it uses tokens generated from the previous execution to produce subsequent tokens, and in this way produces a single continuous piece of music that has no end, but is punctuated by a 24-hour cycle of rest. My intent is to have the model be able to express something at once whimsical and general about the underlying archive, and to be simple enough to serve educational purposes. It does not represent the state of the art in 2023, nor is it intended to be used seriously as a tool for music creation. Furthermore,the collection of files comprising the archive is small (~3000 files), and represents a diverse range of sources (Bach, pop, prog, video game soundtracks, early and medieval music, etc), such that the model is unable to develop a coherent understanding of what music _actually_ is. 

> "I listened to the music. It was hideous. I have never heard anything like it. It was distorted, diabolical, without sense or meaning, except, perhaps, an alien, disconcerting meaning that should never have been there. I could believe only with the greatest effort that it had once been a Bach Fugue, part of a most orderly and respected work." - Philip K. Dick, [The Preserving Machine](https://sickmyduck.narod.ru/pkd097-0.html)

As I was developing this project, I got an insightful suggestion from my friend [Laurel](https://laurel.world/) to check out Philip K Dick's short story, _[The Preserving Machine](https://sickmyduck.narod.ru/pkd097-0.html)_, in which living machines are produced to preserve music of the past, only to end up creating monstrosities only circumstantially connected to their original aims. I feel this rather neatly articulates the space I've been exploring between AI and archives, that our notions of preservation and generation are only separated in abstraction. This passage also captures the spirit of the _"music"_ produced by the model, which has a furthermore uncanny quality owing to the use of the [General MIDI sound specification](https://www.midi.org/specifications-old/item/gm-level-1-sound-set). I may or may not decide to continue working on this project, but I hope in its current prototypal state, it manages to convey something about what drives humans to develop, use, and share technology.

For more details on the implementation, check out the flow diagram below, and repositories on GitHub at [https://github.com/reubenson/midi-archive](https://github.com/reubenson/midi-archive) and [https://github.com/reubenson/midi-archive-neural-net](https://github.com/reubenson/midi-archive-lambda).

<!-- Like in Philip K Dick's [Preserving Machine](https://sickmyduck.narod.ru/pkd097-0.html), the twin impulses to conserve and to generate seems to become indistinguishably intertwined. I may or may not decide to continue working on this project, but I hope in its current prototypal state, it manages to convey something about what drives humans to develop, use, and share technology. -->


<!-- The neural net model used here follows directly from Andrej Karpathy's [pedagogical model](https://karpathy.ai/zero-to-hero.html), and you can [check out and run the source code yourself on Colab](https://colab.research.google.com/drive/1hpzG6ygsn0Cv44ImhyOn13eHtSo_Lccg#scrollTo=2KCKQ2kVr24C). My intent is to have the model be able to express something at once whimsical and general about the underlying archive, and to be simple enough to serve educational purposes. It does not represent the state of the art in 2023, nor is it intended to be used seriously as a tool for music creation. Furthermore, I planned for this model to be portable and cheap to run.  -->


<figure>
<img src="https://mermaid.ink/img/pako:eNqVU02L2zAQ_SuDYEELm1NvORSSOMkG0m0hgS4ll4k8SURsKR3JSdPd_e8dyc4H7anG4BF682bmvfGbMr4k1Vebyp_MDjnCslg5kGegF4bxQPBlVsxgYysKsGFfAyFXZzjR-hF6vc_wQ39jCuQi1EJVgW-ivICuBOsiMZpojx0Lstmlg3cwrugoSWcIEaM1EGykx65y5h0KrzcUQpsqXB6i35OTNjxDZLTOui04ahgr-cQu_eEBhplh_t8MuevmUHksBQmLTzBszP7K3NKO9ISi2V2oUkoO7W_iDjjKwEIvU4l7_ixRByoyaKzHvw6eL-pJ1a8vL68dZJwhE12Q9HROl4PvC5hjvS7xNu0ko151gVaMGVW-KU-YO2S73V6bamHv_6CWLep9qqfkxK_YmRXoZ0POUJ4woNiWJflb5ULPk1w-qZvzBp3JsiF3pl7xMz1kfwrEYCqb1sZ458jEAEeLOcknyUOq1k6aIiZD1zVas1Q0GO4cn2buZ32bq9dNT-WFhgnLcFvndptloHaNb1RyfG5P08uVelI1cY22lH_lLV2uVNxRTSvVl7BE3q_Uyn0IDmX_F2dnVD9yQ0-qOZQiaWFxy1ir_garQB9_AMw-Gdc?type=png" alt="drawing" style="max-width:420px; margin: auto;"/>
<figcaption>Flow diagram for the project</figcaption>
<!-- source: https://mermaid.live/edit#pako:eNplUsFqGzEQ_ZVBJwXiQujNh4LttR1DCgUHmqSbw1ia3RXRStuR1ls35N8r7W5JQ3UaoffezLynV6G8JrEUlfWDapAj3Belg3RW8qgYO-IrWCy-PMnCD8561PD1UBygMpYCVOxbOLhI7CjCilVjznQ18Z8yDdbySHymiYQhUAxwNgh7E5v-9A3rpDKkGkLEaNQimEhQkyNOV--gQact6QlzcxMvs_p6VN_IHUXVwKffpgNf_Tta9NAHSi0hMhpnXA2pOVSewVHPaCGP3Kbt7Sy5yZLbH_cZ_h_mecJsM-ZRbn91nj-yH8eBdrKgzvpLbr_6foQ7bE8aZ8huhDzIAo29wMb6Xg-Yx49s6joZPcEeRthe7icXZu8C_ezJqbSR0xAwWZpaHD9_sKOQdzkg79LTSJoTgYFO2dgZXIzgg1yzHwIxKGvIRVDeOVJzPpnh1UuOK4lNa-SKSZH5m-eJUzuFIc7Ct_J9qcW8VMpuZjOhDu8RTZ8nbTBNMynsU31bOnEtWuIWjU5f8zU_lSI21FIplqnUyC-lKN1bwmEf_fHilFhG7ula9J1OnhUGa8ZWLCu0gd7-ANel7tU -->
</figure>

And if you're a technologist and any of this sparks inspiration to make time for realigning your relationship to software and technology, consider [applying to Recurse Center](https://www.recurse.com/apply) to participate in an upcoming batch!


<!-- I feel that this story elegantly clarifies an uneasy sense of the porousness between AI and archives, that our notions of preservation and generation are only separated in abstraction. The term _generative AI_ gestures at this porousness too, as it immediately calls into question the derivative/conservative nature, not only of generative AI art, but human-made art as well. With all this in mind, I felt greater interest in using this project to explore the interdependence betweeen archives and AI, and how they each act as carriers for our own [_invisible_] fantasies of transformations and conservation.  -->

<!-- <div class="divider-line">〜〜〜</div>
<div class="divider-line">〜〜〜</div>
<div class="divider-line">〜〜〜</div> -->


<!-- I developed this project during my residency at Recurse Center in the fall of 2023 as an exploration of the dynamics between building an archive and building a machine learning model. The media ecosystem that emerges from widespread usage of generative AI feels unknowable at this time, but looking back to the brief window of time when music on the web was dominated by MIDI may tell us something about what drives humans to develop, use, and share technology. In machine learning and the archive, there exist archetypes of transformation and conservation, containers for the hopes and fears about how we ourselves may change.

And with that, I'm pleased to share 

How curiosities and anxieties 

, like that of the industry rapidly changing around me, and how I fit into this changing world. 

Like many members of my cohort, many of these questions were inflected by recent developments in AI, and so I decided to jump in and oriented my residency around learning ML fundamentals. I began with Andrej Karpathy's video series, going from building a simple neural net, on up to a transformer model (the subject of the landmark [Attention is All You Need]() paper). The emergent behavior from simple mechanics fascinated and perplexed me, but I also found myself caught between questions of what the purpose of these models is, and my own relationship to them.



- Left my job at the beginning of the year
- I arrived at RC after leaving my post as EM, and not having worked as an IC in over two years
- Wanting to give back to the internet things that I find beautiful and poetic
- Open questions about my role in the larger world of software
- Writing software as a tool for self-discovery

- Easier to fixate on what I didn’t do, vs what I did manage to do
- Taking the opportunity to work on software full-time again
- Taking a step back to see what draws me forward
- Anxiety about the job market, and thinking about switching gears back to IC
- How does one learn?
- What draws me to tech, and is software something I would be developing in the absence of work?
- What can AI teach me about building technology?
- Larger theme of transformation … 
- what are the interesting problems worth exploring solutions for
- The preserving machine
- A period of reconnecting to the underlying human impulses that manifest on the web, the kinds of projects surveyed by Naive Weekly on Substack -->