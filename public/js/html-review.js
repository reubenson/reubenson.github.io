const CANVAS_WIDTH = 256; // this is the desired width of the image drawn from the audio buffer
const CANVAS_HEIGHT = 256;

let audioHasStarted = false;
let convolutionInitialized = false;
let windInitialized = false;
let currentWindIndex = 0;
let frames = [];
const href = window.location.href.split('#')[0];
const convolutionFilepath = '/public/html-review/airports-for-music-i-excerpt.mp3';

// todo: turn off when screen is not visible
// todo: debug switching between parts on mobile chrome
// idea for performance: add additional filter on top-level; display poem-1 on top of poem-2; start subtle, then add some sort of crescendo or fade poem-1 opacity to 0; 
// handle accessibility

// total duration 34'28" - 82.6MB
const windFilepaths = [
  '/public/html-review/2023-08-31 17.03.15.mp3', // 7'28" - 17.9MB
  '/public/html-review/2022-07-25 20.16.11.mp3', // 5'00" - 12MB
  '/public/html-review/2022-07-28 20.50.36.mp3', // 5'01" - 12MB
  '/public/html-review/2023-10-16 13.31.39.mp3', // 7'00" - 16.8MB ++ note: this one is a little loud
  '/public/html-review/2022-07-21 12.05.00.mp3', // 4'58" - 11.9MB
  '/public/html-review/2023-09-02 14.03.01.mp3', // 5'01" - 12MB
]

let colorMatrixEl;
let colorValue = 0.62;

let canvasContainerEl;
let audioCtx;
let source;
let convolver;
let canvas;
let canvasCtx;

let offscreenCanvas;
let offscreenCtx;
let gainNodeSource;
let gainNodeConvolution;
let processor;

let eventListeners = [];
let slideIndex = 0;

const bufferWidth = CANVAS_WIDTH * 4;
let audioBufferData = new Uint8Array(bufferWidth * CANVAS_HEIGHT);

let colorShiftInterval;

const CSS_TRANSITIONS = [
  {
    selector: '#part-2.poem-container',
    transition: "120s filter linear, 0s opacity linear;"
  },
  {
    selector: '#poems-container canvas',
    transition: '120s opacity ease;'
  },
  {
    selector: '#poems-container #part-2 p',
    transition: '360s color linear, 360s background linear, 5s filter linear;'
  }
]

let convolutionInterval = null;

function updateConvolutionLevel(targetLevel) {
  const duration = 15; // seconds
  const steps = 60; // One update per second
  const stepDuration = duration / steps;
  
  // Clear any existing interval
  if (convolutionInterval) {
    clearInterval(convolutionInterval);
  }
  
  const startLevel = gainNodeConvolution.gain.value;
  const levelDifference = targetLevel - startLevel;
  const levelStep = levelDifference / steps;
  let currentStep = 0;

  if (targetLevel > 0) {
    // begin audio worklet
    convolver.connect(processor);
  }
  
  convolutionInterval = setInterval(() => {
    currentStep++;
    const newLevel = startLevel + (levelStep * currentStep);
    gainNodeConvolution.gain.value = newLevel;
    
    if (currentStep >= steps) {
      gainNodeConvolution.gain.value = targetLevel;
      clearInterval(convolutionInterval);
      convolutionInterval = null;
      // pause audio worklet when convolution has been zero'd
      if (targetLevel === 0) {
        try {
          convolver.disconnect(processor);
        } catch (e) {}
      }
    }
  }, stepDuration * 1000);
}

async function initializeConvolution() {
  let response = await fetch(convolutionFilepath);
  let buffer = await response.arrayBuffer();
  convolver.buffer = await audioCtx.decodeAudioData(buffer);

  convolutionInitialized = true;
  startAudio();
}

async function initializeWind() {
  const handleEnded = async () => {
    currentWindIndex = (currentWindIndex + 1) % windFilepaths.length;
    
    // Create and configure new source
    const newSource = audioCtx.createBufferSource();
    newSource.loop = false;
    newSource.connect(gainNodeSource);
    
    // Load and play next file
    const response = await fetch(windFilepaths[currentWindIndex]);
    const buffer = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(buffer);
    newSource.buffer = audioBuffer;
    newSource.onended = handleEnded;
    newSource.start();
    
    // Replace old source with new one
    source = newSource;
  };

  // Initial setup
  let response = await fetch(windFilepaths[currentWindIndex]);
  let buffer = await response.arrayBuffer();
  let audioBuffer = await audioCtx.decodeAudioData(buffer);
  
  source = audioCtx.createBufferSource();
  source.loop = false;
  source.buffer = audioBuffer;
  source.connect(gainNodeSource);
  source.onended = handleEnded;

  windInitialized = true;
  startAudio();
}

function startAudio() {
  try {
    source.start();
  } catch (e) {
    // console.error(e);
  }
}

async function initializeAudio() {
  if (audioHasStarted) return;

  source = audioCtx.createBufferSource();
  source.loop = false;

  gainNodeSource = audioCtx.createGain();
  gainNodeConvolution = audioCtx.createGain();
  sumNode = audioCtx.createGain();
  // const wet  = 0.0;
  gainNodeSource.gain.value = 1;
  // gainNodeSource.gain.linearRampToValueAtTime(dry, audioCtx.currentTime + 15);
  gainNodeConvolution.gain.value = 0.0;
  sumNode.gain.value = 1.0;
  convolver.normalize = false;

  source.connect(gainNodeSource);
  gainNodeSource.connect(convolver);
  convolver.connect(gainNodeConvolution);
  gainNodeSource.connect(sumNode);
  
  let gainNodeConvolution2 = audioCtx.createGain();
  gainNodeConvolution2.gain.value = 0.15;
  gainNodeConvolution.connect(gainNodeConvolution2);
  gainNodeConvolution2.connect(sumNode);

  // lower volume of player relative to animation
  const playerGainNode = audioCtx.createGain();
  playerGainNode.gain.value = 1.0;
  sumNode.connect(playerGainNode);
  playerGainNode.connect(audioCtx.destination);

  // to be connected later
  // convolver.connect(processor);
  // sumNode.connect(processor);
  startAudio()

  initializeConvolution();
  initializeWind();
  
  // does not indicate that user interaction has occured
  audioCtx.addEventListener('statechange', (event) => {
    audioHasStarted = audioCtx.state === 'running';
    if (audioHasStarted) {
      processor.port.postMessage({canvasWidth: CANVAS_WIDTH});
    }
  });
  audioHasStarted = audioCtx.state === 'running';
  if (audioHasStarted) {
    processor.port.postMessage({canvasWidth: CANVAS_WIDTH});
  }
}

let animationFrameId = null;

function visualize() {
  function draw() {
    animationFrameId = requestAnimationFrame(draw);

    if (!shouldUpdateCanvas) return;

    shouldUpdateCanvas = false;
    
    // Put the image data on the temporary canvas
    // Skip first row and collect remaining rows
    const remainingRows = new Uint8ClampedArray(audioBufferData.slice(CANVAS_WIDTH * 4));
    offscreenCtx.putImageData(new ImageData(remainingRows, CANVAS_WIDTH, CANVAS_HEIGHT - 1), 0, 1);
    
    // Draw the new row of data at the top
    const firstRow = new Uint8ClampedArray(audioBufferData.slice(0, CANVAS_WIDTH * 4));
    canvasCtx.putImageData(new ImageData(firstRow, CANVAS_WIDTH, 1), 0, 0);

    // Draw the temporary canvas onto the main canvas
    canvasCtx.drawImage(offscreenCanvas, 0, 1, CANVAS_WIDTH, CANVAS_HEIGHT - 1, 0, 1, CANVAS_WIDTH, CANVAS_HEIGHT - 1);
  }

  draw();
}

function stopVisualization() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
}

function startVisualization() {
  if (!animationFrameId) {
    visualize();
  }
}

function updatePartStyles(part) {
  const previousPoemEl = document.querySelector('.poem-container.selected-part');
  previousPoemEl?.classList.remove('selected-part');
  const poemEl = document.querySelector(`#${part}`);
  poemEl.classList.add('selected-part');

  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach((button) => {
    button.classList.remove('active');
  });
  const activeButton = document.querySelector(`nav button[data-part="${part}"]`);
  activeButton.classList.add('active');

  document.body.classList.add('now-viewing');
}

function handlePartSelection(part) {
  let hash = window.location.hash;
  const splitHash = hash.split('-');
  const index = parseInt(splitHash[splitHash.length - 1]) - 1 || 0;

  updatePartStyles(part);

  if (part === 'part-1') {
    beginPart1(index);
  } else if (part === 'part-2') {
    beginPart2();
  }
}

function updateFrame(el) {
  const activeEl = el.parentElement.querySelector('.active');
  activeEl?.classList.remove('active');

  el.classList.add('active');
}

async function beginPart1(index) {
  slideIndex = index;
  let frame = frames[index];
  if (!frame) {
    slideIndex = 0;
    frame = frames[slideIndex];
  }

  const hash = `#part-1-${slideIndex + 1}`;

  window.history.pushState({}, '', `${href}${hash}`);

  updateFrame(frame);

  await initializeAudio();
  updateConvolutionLevel(0);
}

async function beginPart2() {
  const hash = `#part-2`;
  window.history.pushState({}, '', `${href}${hash}`);

  startVisualization();

  window.setTimeout(() => {
    const el = document.querySelector('#poems-container');
    el.classList.add('has-started');
  }, 0);

  applyTransitions();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const increment = event.key === 'ArrowDown' ? -0.01 : 0.01;
      applyColorShift(increment);
    }
  });

  colorShiftInterval = window.setInterval(() => {
    applyColorShift(0.001);
  }, 500);

  await initializeAudio();  
  updateConvolutionLevel(0.03);
  startVisualization();

  try {
    window.wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    console.error(`Failed to request wake lock: ${err.name}, ${err.message}`);
  }
}

function applyColorShift(increment = 0.01) {
  requestIdleCallback(() => {
    colorValue += increment;
    setColorMatrix(colorValue);
  });
}

async function resetState() {
  const selectedPart = document.querySelector('.poem-container.selected-part');
  selectedPart?.classList.remove('selected-part');
  stopVisualization();
  const activeEls = document.querySelectorAll('.active');
  activeEls.forEach((el) => {
    el.classList.remove('active');
  });
    
  if (colorShiftInterval) {
    clearInterval(colorShiftInterval);
    colorShiftInterval = null;
  }

  eventListeners.forEach(({ element, type, handler }) => {
    element.removeEventListener(type, handler);
  });
  slideIndex = 0;
  eventListeners = [];
  
  try {
    updateConvolutionLevel(0);
  } catch (e) {}

  document.body.classList.remove('now-viewing');
  canvasContainerEl.classList.remove('has-started');

  if (window.wakeLock) {
    try {
      await window.wakeLock.release();
      window.wakeLock = null;
    } catch (err) {
      console.error(`Failed to release wake lock: ${err.name}, ${err.message}`);
    }
  }
}

function applyTransitions() {
  CSS_TRANSITIONS.forEach(({ selector, transition }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.style.cssText += `transition: ${transition};`;
  });
}

function resetTransitions() {
  CSS_TRANSITIONS.forEach(({ selector }) => {
    const el = document.querySelector(selector);
    if (!el) return;
    el.style.removeProperty('transition');
  });
}

function returnHome() {
  resetState();

  window.history.pushState({}, '', href);
}

let shouldUpdateCanvas = false;

// on each iteration, a chunk of time-domain audio data is appended to the buffer
// it should be appended to preserve linearity of the audio data, where the first element of the buffer is
// the newest and the last element is the oldest
function updateAudioBufferData(data) {
  const tempArray = new Uint8Array(audioBufferData.length);
  
  tempArray.set(audioBufferData.slice(0, audioBufferData.length - data.length), data.length);
  tempArray.set(data, 0);
  audioBufferData.set(tempArray);
  shouldUpdateCanvas = true;
}

function handleRouting() {
  const hash = window.location.hash;

  // comment next line to prevent page from defaulting to home on load
  if (hash !== '') return returnHome();

  if (hash.includes('#part-1')) {
    handlePartSelection('part-1');
  } else if (hash.includes('#part-2')) {
    handlePartSelection('part-2');
  } else {
    returnHome();
  }
}

document.addEventListener('DOMContentLoaded', async function() {
  frames = document.querySelectorAll('#part-1 .poem');

  canvasContainerEl = document.querySelector('#poems-container');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  convolver = audioCtx.createConvolver();

  await audioCtx.audioWorklet?.addModule("/public/js/audio-processor.js");
  processor = new AudioWorkletNode(audioCtx, "audio-processor");
  processor.port.onmessage = (e) => {
    updateAudioBufferData(e.data);
  };

  canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvasContainerEl.querySelector('#part-2').appendChild(canvas);
  canvasCtx = canvas.getContext('2d');

  offscreenCanvas = document.createElement('canvas');
  offscreenCanvas.width = CANVAS_WIDTH;
  offscreenCanvas.height = CANVAS_HEIGHT;
  offscreenCtx = offscreenCanvas.getContext('2d');

  createSvgFilter();

  const startButtons = document.querySelectorAll('button.start');
  startButtons.forEach((button) => {
    button?.addEventListener('click', (event) => handleButtonInteraction(event, event.target.dataset.part));
    button?.addEventListener('touchend', (event) => handleButtonInteraction(event, event.target.dataset.part));
  });

  const homeButton = document.querySelector('button.nav-home');
  homeButton?.addEventListener('click', (event) => handleButtonInteraction(event, ''));
  homeButton?.addEventListener('touchend', (event) => handleButtonInteraction(event, ''));

  window.addEventListener('click', (event) => handleNavigation(event));
  window.addEventListener('touchend', (event) => handleNavigation(event));
  window.addEventListener('keydown', (event) => handleNavigation(event));

  handleRouting();
});

function handleNavigation(event) {
  if (event.target.closest('.poems-header') || event.target.closest('nav')) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  let clickedLeft = true;
  
  if (event.type === 'keydown' && event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
    clickedLeft = event.key === 'ArrowLeft';
  } else if (event.type === 'touchend') {
    clickedLeft = event.changedTouches[0].clientX <= window.innerWidth / 2;
  } else if (event.type === 'click') {
    clickedLeft = event.clientX <= window.innerWidth / 2;
  } else {
    return;
  }

  let currentPart;
  if (window.location.hash.includes('#part-1')) {
    currentPart = 'part-1';
  } else if (window.location.hash.includes('#part-2')) {
    currentPart = 'part-2';
  } else {
    currentPart = 'home';
  }

  if (currentPart === 'part-1') {
    if (clickedLeft) {
      slideIndex--;
    } else {
      slideIndex++;
    }
  
    if (slideIndex < 0) {
      slideIndex = 0;
      return returnHome();
    }
    
    if (slideIndex >= frames.length) {
      slideIndex = frames.length - 1;
      resetState();
      updatePartStyles('part-2');
      beginPart2();
      return;
    }
  
    updateFrame(frames[slideIndex]);
    window.history.pushState({}, '', `${href}#part-1-${slideIndex + 1}`);

    slideIndex = Math.max(0, Math.min(slideIndex, frames.length - 1));

    return;
  }

  if (currentPart === 'part-2') {
    if (clickedLeft) {
      resetState();
      updatePartStyles('part-1');
      beginPart1(frames.length - 1);
    } else {
      // do nothing
    }

    return;
  }

  // home
  if (!clickedLeft) {
    updatePartStyles('part-1');
    beginPart1(0);
  } else {
    // do nothing, or maybe go to part 2?
  }
}

function handleButtonInteraction(event, part) {
  event.preventDefault();
  event.stopPropagation();
  resetState();
  if (part === '') return returnHome();
  updatePartStyles(part);
  handlePartSelection(part);
}

function setColorMatrix(val = Math.random()) {
  colorMatrixEl.setAttribute("values", hslColorMatrix(val));
}

function createSvgFilter() {
  const svgNS = "http://www.w3.org/2000/svg";
  const filter = document.createElementNS(svgNS, "filter");
  filter.setAttribute("id", "customFilter");

  const feColorMatrix = document.createElementNS(svgNS, "feColorMatrix");
  feColorMatrix.setAttribute("type", "matrix");
  colorMatrixEl = feColorMatrix;

  setColorMatrix(colorValue);
  filter.appendChild(feColorMatrix);

  document.querySelector("svg defs").appendChild(filter);
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 1].
 * https://stackoverflow.com/questions/2353211/hsl-to-rgb-color-conversion
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
function hslToRgb(h, s, l) {
  let r, g, b;
  while (h < 0) h += 1;
  while (h > 1) h -= 1;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }

  return [r, g, b];
}

function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function addArrays(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    throw new Error('Arrays must be of the same length');
  }
  return arr1.map((value, index) => value + arr2[index]);
}

function hslColorMatrix(h) {
  const s = 1;
  const l = 0.3;
  const [r, g, b] = hslToRgb(h, s, l);
  const [r2, g2, b2] = hslToRgb(h + 0.55, s, l);

  const primaryArray = [
    r, 0, 0, -b/3, 0,
    0, g, 0, -r/3, 0,
    0, 0, b, -g/3, 0,
    r, g, b, 0, 0
  ];

  const secondaryArray = [
    r2/2, 0, 0, -r2/4, 0,
    0, g2/2, 0, -g2/4, 0,
    0, 0, b2/2, -b2/4, 0,
    -r/6, -g/6, -b/6, 0.1, 0
  ]

  return addArrays(primaryArray, secondaryArray).join(" ");
}
