---
layout: shop-page.njk
title: Shoppe
description: Shop for ceramics and other goods made by Reuben Son
socialImg: /public/pocket-vase.jpg
---

 <!-- images to cycle through above the fold -->
<div class="project-grid-item-full">
  <div class="image-sequence project-grid-item-full" data-path="/public/ceramics/travel-vase-series" data-length="20">
    <img src="/public/ceramics/travel-vase-series/20.JPG" alt="photo of a travel vase on a windowsill" class="sequence-image" style="opacity: 1.0;">
  </div>
</div>

{.project-grid-item-1}

Through the end of September, 50% of proceeds from all sales will be donated to a [GoFundMe for the artists affected by the recent fire in Red Hook](https://www.gofundme.com/f/help-red-hook-artists-and-businesses-rebuild-after-fire). You can also use **TENOFF** to apply a $10 discount to your order.
{.project-grid-item-full}

{.project-grid-item-1}

<script>
  document.addEventListener('DOMContentLoaded', function() {
    const delay = 4000;
    const imageSequence = document.querySelector('.image-sequence');
    const path = imageSequence.dataset.path;
    const length = imageSequence.dataset.length;
    const images = document.querySelectorAll('.sequence-image');
    let currentIndex = 0;
    let previousIndex = null;
    let secondPreviousIndex = null;

    function findOrCreateImage(parent,index) {
      let element = document.querySelector(`img[src="${path}/${index + 1}.JPG"]`);
      if (element) {
        return element;
      }

      element = document.createElement('img');
      element.src = `${path}/${index + 1}.JPG`;
      element.alt = `photo of a travel vase on a windowsill`;
      element.style.opacity = '0.0';
      element.classList.add('sequence-image');
      parent.appendChild(element);
      return element;
    }
    
    function nextImage() {
      currentIndex = Math.floor(Math.random() * length);
      const element = findOrCreateImage(imageSequence, currentIndex);
      let previousElement = null;
      let secondPreviousElement = null;
      if (previousIndex >= 0) {
        previousElement = findOrCreateImage(imageSequence, previousIndex);
      }
      if (secondPreviousIndex >= 0) {
        secondPreviousElement = findOrCreateImage(imageSequence, secondPreviousIndex);
      }
      setTimeout(() => {
        // const secondPreviousImage = 
        if (secondPreviousElement) secondPreviousElement.style.opacity = '0.0';
        if (previousElement) previousElement.style.opacity = '0.5';
        element.style.opacity = '1.0';
      }, 100);
      secondPreviousIndex = previousIndex;
      previousIndex = currentIndex;
      // previousImage = element;
    }

    setTimeout(() => {
      setInterval(nextImage, delay);
    }, 0); // Initial delay of 2 seconds
  });
</script>

<!-- I've gotten in the habit of bringing a pocket-size vase with me when I travel, collecting wildflowers as I go. It's a simple gesture towards making a temporary home within dislocation, a tiny bulwark against the sometimes overwhelming feeling of _being away_. -->
<!-- {.project-grid-item-6} -->

<!-- Each vase is made on my miniature wheel at home, perched on my kitchen windowsill in fact. They range from abo`ut 1.5 to 3 inches in height, and have been produced as small experiments in form and glaze application. As such, each vase is unique and not expected to repeat within the series.
\
\
You can also check out a collection of photos from friends and family of these vessels [out in the field](/projects/travel-vase-gallery) 🌻 🏺
Please note that shipping is currently limited to the U.S.
\
\
{.project-grid-item-4} -->

<!-- <figure class="project-grid-item-2" >
  <img src="/public/pocket-vase.jpg" alt="photo of a travel vase on a windowsill">
  <figcaption>My first travel vase (2019), sitting on the windowsill of an apartment rental in Stockholm while I was attending a <a href="/projects/weaving" target="_blank">music studio residency at EMS</a>.</figcaption>
</figure> -->

<!-- The shop is currently **sold out**, check back in September for new pieces :)
{.project-grid-item-6} -->
