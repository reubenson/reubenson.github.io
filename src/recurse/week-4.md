---
layout: project.njk
title: Goldberg Variations Variations
subtitle: Week 4 at Recurse Center
tags: posts
---
## {{ title }}

### {{ subtitle }}

After seeing my friend Asha Tamirisa give a talk on building a [counter-archive of The Kitchen](https://thekitchen.org/on-view/counter-archiving-the-avant-garde/) at [Software for Artists Day](https://pioneerworks.org/programs/software-for-artists-day-8) last week, I've been thinking more about the overlap between archives and ML training sets, how each deals with concerns of how information perpetuates biases, and produces contestable views of history and reality. Complex socio-economic and political realities are embedded in the objective artifacts that may be included or excluded in both archives and training sets.

The emergence of certain canonical training sets, like [this archive of half a million emails within Enron](https://www.kaggle.com/datasets/wcukierski/enron-email-dataset) obtained by the federal government during its investigation, says something too about how ML is a powerful tool for distilling and operationalizing archives. To turn archives of the near or distant past into substrates that can be mined for the purposes of future prediction or content generation.

In the information age, big tech often finds a business model in leveraging capital to extract value from assets already in circulation in the wider economy (e.g.ride-sharing or behavioral surplus), and this continues to be the pattern in how today's LLMs feed on the previously inert archives of the past.

> I listened to the music. It was hideous. I have never heard anything like it. It was distorted, diabolical, without sense or meaning, except, perhaps, an alien, disconcerting meaning that should never have been there. I could believe only with the greatest effort that it had once been a Bach Fugue, part of a most orderly and respected work. 
> 
> (Excerpt from Philip K. Dick's _The Preserving Machine_, thanks [Laurel](https://laurelschwulst.com/)!)

This last week, I've been buiding a neural net model trained on MIDI transcriptions of Bach to produce Bach-like music, though not very well at the time of this writing. Around this time last year, I was digging up old MIDI websites from the 1990s, of which I can imagine only a fraction are still online. There are some sizeable training sets available for purposes like this, but I've been returning to my old bookmarks instead, and so far have been relying on MIDI transcriptions shared on [Dave's J.S. Bach Page](http://www.jsbach.net) (first launched in 1996, and last updated in 2010). While revisiting this beautiful website, I came across a figure named John Sankey, known then as the [_Harpsichordist to the Internet_](https://johnsankey.ca/harpsichord.html). I was also surprised to see brief mention in his writings on his personal experience in having his [MIDI files stolen and commercialized](https://johnsankey.ca/bach.html), before the longer arc of music piracy during the MP3 age and the rise of Spotify. I'd largely thought of this early period of music file-sharing on the web as a more wholesome era, but it's helpful to remember that the incentives have been such that much smaller actors than the tech behemoths of today have long taken advantage of opportunities to build products around freely available information on the web.



With all this in mind, and with my remaining two weeks at Recurse, I'd like to spend a little more time exploring the question of how ML may work towards or alongside archives, rather than ingest them entirely, tracing the faultlines between the archive and the training set.
<!-- 

been thinking more about how the problematics of archives (tk) bleeds over into the questions of perpetuated biases within training sets for ML systems

- Are ML systems just archives at scale?
- So much effort is leveraged into producing a corpus of training data, but has often been built out of what's simply available (enron emails?)
- Big tech has always been prone to leveraging capital in order to extract capital from assets already in circulation in the wider economy (the ride-sharing model, the labor behind maintaining Wikipedia)
- A smaller example of the above is found in Sankey, who I discovered while exploring the early music web. How, even then, smaller actors than the tech behemoths today sought out arbitrage opportunities to build products around freely available information
- In the remaining two weeks at Recurse, I'd like to spend a little more time exploring the question of how machine learning may work alongside the project of archive-building, of what divergences may exist between the archive and the training corpus. -->