---
layout: project.njk
title: Wrapping up
subtitle: Week 6 at Recurse Center
tags: posts
---
## {{ title }}

### {{ subtitle }}

It's been such a fast six weeks at Recurse, and all the more so for getting so absorbed in getting my MIDI Archive project into shape. It's been a journey ... which I think I'll need some time to sit with before writing out a proper reflection of my wonderful and expansive time here.

For now, I'm still figuring out a path to an MVP version of this project, which I'm hoping to chip away at the next few weeks as I adjust to a new post-RC equilibrium. I'm also struggling with uncertainty and doubt about the technical and cultural value of this project, and whether it makes sense to put much more effort into an MVP, but for the moment, I'll just limit my scope to documenting and preserving the groundwork I've laid out thus far. And while still in very skeletal form, the project has at least been shipped to prod! [http://reubenson.com/midi-archive/](http://reubenson.com/midi-archive/)

#### THE PROJECT
At the core of this project, I've been driven by two broad questions:
- What, if anything, does the pre-MP3 history of music on the web say about the present moment? Or its future?
- How the heck does machine learning actually work?

In the six weeks of my residency at Recurse, I feel like I'm still just scratching the surface of these questions. But as I've heard writers say, you write a story in order to figure out how it ends.

In my approach to these two questions, I've been building a neural net model alongside an archive, in which the model informs my curation of the archive, and the curation of the archive influences how the model behaves. In more straightforward terms, what I've been doing is the following:
- Explore MIDI websites on the early web, and scraping ones that feel culturally/aesthetically interesting and/or representative. I've eschewed using canonical datasets like [Maestro](https://magenta.tensorflow.org/datasets/maestro) or large existing archives like the [Geocities MIDI collection](https://archive.org/details/archiveteam-geocities-midi-collection-2009). Thus far, I've scraped together ~3000 MIDI files, which is not a lot. In some sense, I've been loosely following principles described by Everest Pipkin in their ["Corpora as Medium" talk](https://www.youtube.com/watch?v=IYNKs8vfocc) on the importance of curation in working with large language models. Given that, I've been taking a more iterative approach to building up the archive.
- Use these MIDI files to train a neural net model built on PyTorch in order to generate new MIDI files. My main goal with this model is to be of educational use, not necessarily trying to make it as sophisticated as possible, so I've been pretty happy with the relatively naive results I've gotten thus far. I find the results amusing, but I'm probably biased. It reminds me a bit of the main plot-point in [The Fly](https://en.wikipedia.org/wiki/The_Fly_(1986_film)), in which Jeff Goldblum fuses with a housefly ...
- The MIDI Archive and the ML output is featured alongside each other on the [MIDI Archive website](https://reubenson.com/midi-archive). I had originally planned on having the ML output presented as a 'daily broadcast/performance', but haven't gotten around to implementing that bit yet. At the moment, the loosely prototyped website allows visitors to see and listen to all the MIDI files that were used for training and validating the model, as well as listen to MIDI music generated (daily) by the model.

As for what's next for this project ... the main thing that feels lacking at the moment is a sense for what visitors, who may or may not be familiar with music on the early web, should expect to find here. I'm not particularly interested in just exploring the nostalgic valence of this work, but want to dig deeper into why I may have been drawn to this project in the first place ...

But for now, feel free to take a look at the two repositories I've spun up for this project, but be warned that documentation and cleanup is still in a messy state

- [https://github.com/reubenson/midi-archive](https://github.com/reubenson/midi-archive) contains the scraper and 11ty sit generator
- [https://github.com/reubenson/midi-archive-lambda](https://github.com/reubenson/midi-archive-lambda) contains the lambda functions used for deployed model, and the notebook used to train the model