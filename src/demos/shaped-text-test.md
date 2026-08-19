---
layout: project.njk
title: shaped text test
hideSeeMore: true
hideMeta: true
---

Prose before the shaped block, to check that markdown parsing survives it.
{.project-grid-item-full}

{% shapedText "demo-forms", cols=84, repeat=true, class="project-grid-item-full" %}
Suppose instead that you are perched on a dock facing the sea, gently overlapping pulses against the shoreline of your hearing. When you close your eyes, the water continues to lap into your bloodstream, your nervous system. Unda Maris is the overflow from the gutters of harmony, this is a music that aspires to the condition of water, of water as music by other means.

And like water itself, it has its attendant risks. The first few decades of the glass harmonica were troubled by assertions of melancholy, nervous breakdown, and death.
{% endshapedText %}

Prose after the shaped block, which must still be parsed as markdown with _emphasis_ intact.
{.project-grid-item-full}
