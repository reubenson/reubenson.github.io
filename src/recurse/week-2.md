---
layout: project.njk
title: Gradually, Then Suddenly
subtitle: Week 2 at Recurse Center
tags: posts
---

### {{ subtitle }}

Earlier this week, at an informal dinner centered around the theme of AI Safety, I saw Rob Nail of Singularity University quote _"gradually, then suddenly"_ (attribution often asigned to Ernest Hemingway, on going bankrupt) in a presentation. It feels equally apt describing the subjective experience of time while at Recurse Center as it does exponential technologies. While I'd been vaguely familiar with AI Safety, this week has gone a long ways towards concretizing my understanding of this emerging field of research and development (thanks in no small part to [Changlin Li](https://github.com/changlinli)'s generous efforts to bring me and my cohorts at Recurse up to speed!).

As of right now, I've made it through 4 of the 7 [videos in Andrej Karpathy's lecture series on neural nets](https://karpathy.ai/zero-to-hero.html), and the first two chapters of the [fastbook notebooks](https://github.com/fastai/fastbook). The majority of my effort is still towards getting up to speed on fundamentals. But that said, it seems worthwhile to think through some of my current questions, assumptions, and intuitions here, if only for my future benefit in tracking how my views shift over time.

### On AGI

 AGI (Artificial General Intelligence) seems like a rather squishy term that is dependant on significant, fundamental vagaries: around the nature of our own intelligence, and the question of interpreting/measuring intelligence of an AI system. But it does seem plausible (and probable even) that if we _do_ build an AGI, we'll do so before fully understanding how that emergent behavior was achieved. And it will be even longer still, before any meaningful consensus is developed around whether AGI has actually been achieved.

So given the long arc of developing and recognizing systems that approach AGI, I wonder what it would mean to give space to such systems?

<!-- In the longer arc of developing systems toward AGI , I wonder what it would mean to give space to such systems -->

<!-- As funding and development of AI outpace AI Safety,  -->

<!-- 
So ... will we reach AGI or what

I have inclinations to debate some of the terminology involved here; ground truth on words that are routinely used to describe current and future technology is fundamentally impossible to pin down. Shortlist of such words: learning, intelligence, artificial, human | machine. And to answer this question is truly beyond me, and I'm happy enough in this case to defer to experts. In some ways, I'm not really interested to address this question at all. But I do wonder what it means to give space to such systems? -->

From what I've learned of ML systems thus far, they're tightly bounded by two constraints: data and computing resources. Model architectures optimize across these two constraints, and the success of current state of the art (LLMs like GPT) relies on transformer-based architecture which rapidly advanced such optimizations. While current transformer-based models may be transient (and there are reasons to hope that they'll be replaced by architectures that are easier to evaluate according to AI Safety standards), all future architectures will continue to be constrained by data and computing resources on some fundamental level. As these systems scale up in capability, the bottlenecks between subsequent developments will come from doing the most with what data these systems have access to, maximizing the latent knowledge built up from data inflows. 

<!-- As of right now, images and text are the richest sources of data that we have, due to their representational efficiency. -->

Given this, what happens in the limit as we approach AGI? We may currently be in the regime of low-hanging fruit as current state of the art is trained on the internet as its corpus, but richer data-mining would come from greater interaction between models and humans. Heterogeneous systems comprised of humans and AIs interacting would therefore be incentivized from both a training and utility perspective. 

Such heterogeneous systems might perhaps start out being more human-centric. For example, let's say Apple deploys a new OS that has an AI agent that can automatically answer your emails upon prompting you with a simple question here and there. Much like no one wants an email signature that reads `Sent from Reuben's iPad`, users typically won't want to send emails that obviously read as being AI-generated. Therefore, in this heterogeneous system, the user will spend time training the AI properly, in order to maintain consistency of tone. Along this path, there will be a tipping point in which it is much easier to give the AI full control over writing one's emails, than to shut it off and go back to writing your own.

This in itself doesn't seem like such a bad thing, but as heterogeneous systems increase in scale, breadth, and interconnectivity, a tendency will exist to make interfaces more and more uniform, to be accessible to both human and AI agents. For example, a new housing development may design an apartment layout that optimizes for human preference and AI inferrability, or a municipalities may decide to revamp its roadways in a way that accomodates driverless cars alongside human drivers.

The more we increase the surface area of interconnected complex heterogeneous systems (AI augmenting each layer of [_The Stack_ as defined by Benjamin Bratton](https://thestack.org/)), the more difficult it may be to unplug a given set of AI technologies without risking cascading failures across many systems. [Many AI researchers seem to be reaching consensus about human-level AI being achieved within 100 years](https://ourworldindata.org/ai-timelines), but trends towards uniform interfaces will happen long before AGI's arrival.

<!-- Such heterogeneous systems might then be characterized in the following ways: -->

<!-- - More uniform interfaces, to be accessible to both humans and AI agents. For example, a new housing development may design an apartment layout that optimizes for human preference and AI inferrability -->




<!-- As a result, I would speculate some of the following to be the case, in the optimization of AGI (along the constraints of compute and data) within the context of increasingly large surface areas of heterogeneous systems inb which humans and actively-training models coexist -->
<!-- - More uniform interfaces (e.g. changing roadway infrastructure to balance the requirements of machine vision and human vision) -->





<!-- - Terminology seems like a fundamentally contentious complex issue when talking about AI. I'm still hesitant to even describe the current technology as AI, as opposed to Machine Learning. At the asymptote of the current development, I'd be more inclined to describe the resulting technology as Machine Intelligence, as opposed to Artificial Intelligence.  -->
<!-- -  -->