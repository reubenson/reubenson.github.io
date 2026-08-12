/**
 * @file Drives the image-sequence component (src/_includes/image-sequence.njk).
 * Every `.image-sequence` element on the page is initialized independently,
 * cross-fading through the images listed in its `data-images` attribute.
 * Images are created lazily the first time they're shown.
 */
document.addEventListener('DOMContentLoaded', function () {
  var DELAY = 4000; // ms between advances
  var FADE = 100; // ms before applying opacity (lets a new <img> attach first)

  document.querySelectorAll('.image-sequence').forEach(initSequence);

  function initSequence(container) {
    var images;
    try {
      images = JSON.parse(container.dataset.images || '[]');
    } catch (err) {
      images = [];
    }
    if (images.length < 2) return; // nothing to cycle through

    var alt = container.dataset.alt || '';
    var randomize = container.dataset.randomize !== 'false'; // default true
    var nextIndex = 1; // linear progression; images[0] is already shown
    // images[0] is rendered at full opacity in the markup, so treat it as the
    // current frame — otherwise it never enters the fade-out rotation and
    // bleeds through faintly beneath later frames during transitions.
    var previousIndex = 0;
    var secondPreviousIndex = null;

    function findOrCreateImage(index) {
      var src = images[index];
      var element = container.querySelector('img[src="' + src + '"]');
      if (element) return element;

      element = document.createElement('img');
      element.src = src;
      element.alt = alt;
      element.style.opacity = '0.0';
      element.className = 'sequence-image';
      container.appendChild(element);
      return element;
    }

    function nextImage() {
      var currentIndex;
      if (randomize) {
        currentIndex = Math.floor(Math.random() * images.length);
      } else {
        currentIndex = nextIndex;
        nextIndex = (nextIndex + 1) % images.length;
      }
      var element = findOrCreateImage(currentIndex);
      var previousElement = previousIndex !== null ? findOrCreateImage(previousIndex) : null;
      var secondPreviousElement =
        secondPreviousIndex !== null ? findOrCreateImage(secondPreviousIndex) : null;

      setTimeout(function () {
        if (secondPreviousElement) secondPreviousElement.style.opacity = '0.0';
        if (previousElement) previousElement.style.opacity = '0.5';
        element.style.opacity = '1.0';
      }, FADE);

      secondPreviousIndex = previousIndex;
      previousIndex = currentIndex;
    }

    setInterval(nextImage, DELAY);
  }
});
