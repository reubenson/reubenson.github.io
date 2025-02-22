const CANVAS_WIDTH = 256; // this is the desired width of the image drawn from the audio buffer
const CANVAS_HEIGHT = 256;

let audioHasStarted = false;
let convolutionInitialized = false;
let windInitialized = false;
let part1Index = 0;
const href = window.location.href.split('#')[0];

const audioFilepath = '/public/html-review/woo.mp3';
// const audioFilepath = 'https://reubenson.com/weaving/Swede\ Plate\ 5.0s.wav';

let colorMatrix, colorMatrixEl;
let colorValue = 0.46;

let canvasContainerEl;
let audioCtx;
let source;
let convolver;
let analyser;
let canvas;
let canvasCtx;

let offscreenCanvas;
let offscreenCtx;

// let imageData;
// let imageWidth;
// let imageHeight;
// let imageBuffer;
let gainNodeSource;
let gainNodeConvolution;
let processor;

let eventListeners = [];

let slideIndex = 0;
let previousSlideIndex = null;

// this is the audio buffer data that is being sent to the processor
// it will be of fixed size ... of 512 x 512 pixels
const bufferWidth = CANVAS_WIDTH * 4;
let audioBufferData = new Uint8Array(bufferWidth * CANVAS_HEIGHT);

let colorShiftInterval;

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

  // return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
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

function updateConvolutionLevel(level) {
  
  // if (!audioHasStarted) return;

  // const currentValue = gainNodeConvolution.gain.value;
  const duration = 60; // seconds
  gainNodeConvolution.gain.linearRampToValueAtTime(level, audioCtx.currentTime + duration);
}

function audioIsReady() {
  return convolutionInitialized && windInitialized;
}

async function initializeConvolution() {
  let response = await fetch(audioFilepath);
  let buffer = await response.arrayBuffer();
  convolver.buffer = await audioCtx.decodeAudioData(buffer);

  convolutionInitialized = true;
  startAudio();
}

async function initializeWind() {
  let response = await fetch('/public/html-review/test-wind.mp3');
  let buffer = await response.arrayBuffer();
  source.buffer = await audioCtx.decodeAudioData(buffer);
  windInitialized = true;
  startAudio();
}

function startAudio() {
  if (!audioIsReady()) return;
  if (audioHasStarted) return;
  source.start();
}

async function initializeAudio() {
  if (audioHasStarted) return;

  // let response = await fetch(audioFilepath);
  // let buffer = await response.arrayBuffer();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048 * 4 * 4;
  source = audioCtx.createBufferSource();
  source.loop = true;

  gainNodeSource = audioCtx.createGain();
  gainNodeConvolution = audioCtx.createGain();
  sumNode = audioCtx.createGain();
  const dry = 1.0;
  // const wet = 1.0 - dry;
  const wet  = 0.0;
  gainNodeSource.gain.value = 0;
  gainNodeSource.gain.linearRampToValueAtTime(dry, audioCtx.currentTime + 15);
  gainNodeConvolution.gain.value = wet;
  sumNode.gain.value = 1.0;

  convolver.normalize = false;
  
  // let windresponse = await fetch('/public/html-review/test-wind.mp3');
  // let windBuffer = await windresponse.arrayBuffer();
  // source.buffer = await audioCtx.decodeAudioData(windBuffer);
  // convolver.buffer = await audioCtx.decodeAudioData(buffer);

  source.connect(gainNodeSource);
  gainNodeSource.connect(convolver);
  convolver.connect(gainNodeConvolution);
  gainNodeSource.connect(sumNode);
  
  let gainNodeConvolution2 = audioCtx.createGain();
  gainNodeConvolution2.gain.value = 0.2;
  gainNodeConvolution.connect(gainNodeConvolution2);
  gainNodeConvolution2.connect(sumNode);
  

  // lower volume of player relative to animation
  const playerGainNode = audioCtx.createGain();
  playerGainNode.gain.value = 0.5;
  sumNode.connect(playerGainNode);
  playerGainNode.connect(audioCtx.destination);

  convolver.connect(processor);
  // source.start();

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

function visualize() {
  function draw() {
    requestAnimationFrame(draw);

    if (!shouldUpdateCanvas) return;

    shouldUpdateCanvas = false;

    // offscreenCtx.drawImage(canvas, 0, 0);
    // canvasCtx.clearRect(0, 0, CANVAS_WIDTH, 1);
    // canvasCtx.drawImage(offscreenCanvas, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT - 1, 0, 1, CANVAS_WIDTH, CANVAS_HEIGHT - 1);

    // this should only incrementally update?
    // canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // let imageArray = new Uint8ClampedArray(audioBufferData);

    // Draw only the new row of data at the top
    // let newRowData = new Uint8ClampedArray(audioBufferData.slice(0, CANVAS_WIDTH * 4));
    // newRowData = newRowData.map((val, index) => {
    //   if (index % 4 === 3) {
    //     return Math.pow(val / 255, -1.25) * 255;
    //   }
    //   return val;
    // });

    // canvasCtx.putImageData(new ImageData(newRowData, CANVAS_WIDTH, 1), 0, 0);

    
    // const len = Math.sqrt(audioBufferData.byteLength) / 2;
    // const originalWidth = len;
    // const originalHeight = len;
    // const scaleFactor = 1;
    // const scaledPixelArray = scaleUpPixels(imageArray, originalWidth, originalHeight, scaleFactor);
    
    // Create a temporary canvas to hold the image data
    // const tempCanvas = document.createElement('canvas');
    // tempCanvas.width = CANVAS_WIDTH;
    // tempCanvas.height = CANVAS_HEIGHT;
    // const tempCtx = tempCanvas.getContext('2d');
    
    // Put the image data on the temporary canvas
    // Skip first row and collect remaining rows
    const remainingRows = new Uint8ClampedArray(audioBufferData.slice(CANVAS_WIDTH * 4));
    offscreenCtx.putImageData(new ImageData(remainingRows, CANVAS_WIDTH, CANVAS_HEIGHT - 1), 0, 1);
    
    // Draw the new row of data at the top
    const firstRow = new Uint8ClampedArray(audioBufferData.slice(0, CANVAS_WIDTH * 4));
    canvasCtx.putImageData(new ImageData(firstRow, CANVAS_WIDTH, 1), 0, 0);

    // Draw the temporary canvas onto the main canvas
    canvasCtx.drawImage(offscreenCanvas, 0, 1, CANVAS_WIDTH, CANVAS_HEIGHT - 1, 0, 1, CANVAS_WIDTH, CANVAS_HEIGHT - 1);

    return;

    // experiment with using canvas for displacement
    if (displacementCount < 0) {
      // if applying this displacement, need to make canvas the same width as text area
      const dataURL = canvas.toDataURL();
      // const displacementImage = document.querySelector('#slide-0-filter feImage');
      const displacementImage = document.querySelector('#dis-filter feImage');
      displacementImage.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', dataURL);
      displacementCount++;
    }
  }

  draw();
}

let displacementCount = 0;

function scaleUpPixels(pixelArray, width, height, scaleFactor) {
  const newWidth = width * scaleFactor;
  const newHeight = height * scaleFactor;
  const newPixelArray = new Uint8ClampedArray(newWidth * newHeight * 1);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIndex = (y * width + x) * 4;
      const r = pixelArray[srcIndex];
      const g = pixelArray[srcIndex + 1];
      const b = pixelArray[srcIndex + 2];
      const a = pixelArray[srcIndex + 3];

      for (let dy = 0; dy < scaleFactor; dy++) {
        for (let dx = 0; dx < scaleFactor; dx++) {
          const destX = x * scaleFactor + dx;
          const destY = y * scaleFactor + dy;
          const destIndex = (destY * newWidth + destX) * 4;
          newPixelArray[destIndex] = r;
          newPixelArray[destIndex + 1] = g;
          newPixelArray[destIndex + 2] = b;
          newPixelArray[destIndex + 3] = a;
        }
      }
    }
  }

  return newPixelArray;
}

function updateFilter(index) {
  const el = document.querySelector('#text');
  el.style.filter = `blur(0px) contrast(4) url(#slide-${index}-filter)`;
  // el.style.filter = `blur(2px) contrast(4) url(#dis-filter)`;
}

function initializeSlideImages() {
  slides.forEach((slide, index) => {
    const canvasContainer = document.querySelector('#poems-container');
    const img = new Image();
    img.src = slide.imgUrl;
    img.id = `slide-${index}-image`;
    img.alt = `Slide ${index}`;
    // img.style.display = 'none';
    canvasContainer.appendChild(img);

    if (index === 0) img.classList.add('active');

    // return;
    const filter = document.createElementNS("http://www.w3.org/2000/svg", "filter");
    filter.setAttribute("id", `slide-${index}-filter`);
    document.querySelector("svg defs").appendChild(filter);
    const feImage = document.createElementNS("http://www.w3.org/2000/svg", "feImage");
    feImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", slide.displacementUrl);
    feImage.setAttribute("result", `slide-${index}`);
    // bug: can't get this to center???
    feImage.setAttribute("preserveAspectRatio", "xMidYMid meet");
    feImage.setAttribute("width", "630px");
    feImage.setAttribute("x", "10px");
    feImage.setAttribute("y", "0");
    filter.appendChild(feImage);
    
    const feDisplacementMap = document.createElementNS("http://www.w3.org/2000/svg", "feDisplacementMap");
    feDisplacementMap.setAttribute("in2", `slide-${index}`);
    feDisplacementMap.setAttribute("in", "SourceGraphic");
    feDisplacementMap.setAttribute("scale", "5");
    feDisplacementMap.setAttribute("xChannelSelector", "A");
    feDisplacementMap.setAttribute("yChannelSelector", "R");
    // feDisplacementMap.setAttribute("preserveAspectRatio", "xMidYMid meet");
    filter.appendChild(feDisplacementMap);
  });
}

function handlePartSelection(part) {
  let hash = window.location.hash;
  const splitHash = hash.split('-');
  const index = parseInt(splitHash[splitHash.length - 1]) - 1 || 0;

  const previousPoemEl = document.querySelector('.poem-container.selected-part');
  previousPoemEl?.classList.remove('selected-part');
  const poemEl = document.querySelector(`#${part}`);
  poemEl.classList.add('selected-part');

  // update nav
  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach((button) => {
    button.classList.remove('active');
  });
  const activeButton = document.querySelector(`nav button[data-part="${part}"]`);
  activeButton.classList.add('active');

  if (part === 'part-1') {
    beginPart1(index);
  } else if (part === 'part-2') {
    beginPart2();
  }

  document.body.classList.add('now-viewing');
}

function parsePoem(el) {
  const frames = el.querySelectorAll('div');

  return frames;
}

function updateFrame(el) {
  const activeEl = el.parentElement.querySelector('.active');
  activeEl?.classList.remove('active');

  el.classList.add('active');
}

async function beginPart1(index) {
  canvasContainerEl.classList.add('part-1');
  const frames = parsePoem(document.querySelector('#part-1'));

  slideIndex = index;
  let frame = frames[index];
  if (!frame) {
    slideIndex = 0;
    frame = frames[slideIndex];
  }

  const hash = `#part-1-${slideIndex + 1}`;
  window.history.pushState({}, '', `${href}${hash}`);

  updateFrame(frame);
  
  function handleNavigation(event) {
    event.preventDefault();
    const viewportWidth = window.innerWidth;  
    const xLocation = event.type === 'touchend' ? event.changedTouches[0].clientX : event.clientX;
    
    if (xLocation > viewportWidth / 2) {
      slideIndex++;
    } else {
      slideIndex--;
    }

    if (slideIndex < 0) {
      slideIndex = 0;
      return;
    }
    
    if (slideIndex >= frames.length) {
      slideIndex = frames.length - 1;
      return;
    }

    updateFrame(frames[slideIndex]);
    window.history.pushState({}, '', `${href}#part-1-${slideIndex + 1}`);
  
    previousSlideIndex = slideIndex;
    slideIndex = Math.max(0, Math.min(slideIndex, frames.length - 1));
  }

  eventListeners = [
    { element: canvasContainerEl, type: 'click', handler: handleNavigation },
    { element: canvasContainerEl, type: 'touchend', handler: handleNavigation }
  ];

  for (const listener of eventListeners) {
    listener.element.addEventListener(listener.type, listener.handler);
  }
  await initializeAudio();
  updateConvolutionLevel(0);

  threeSheetsToTheWind();
}

async function beginPart2() {
  const hash = `#part-2`;
  window.history.pushState({}, '', `${href}${hash}`);
  
  canvasContainerEl.classList.add('part-2');

  canvas.classList.add('front');

  window.setTimeout(() => {
    const el = document.querySelector('#poems-container');
    el.classList.add('has-started');
  }, 0);
  // el.style.filter = `blur(1px) contrast(4) url(#dis-filter)`;

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const increment = event.key === 'ArrowLeft' ? -0.01 : 0.01;
      applyColorShift(increment);
    }
  });

  colorShiftInterval = window.setInterval(() => {
    applyColorShift(0.001);
  }, 500);

  await initializeAudio();  
  updateConvolutionLevel(0.03);
  visualize();

  // Request wake lock to keep screen on
  try {
    window.wakeLock = await navigator.wakeLock.request('screen');
  } catch (err) {
    console.error(`Failed to request wake lock: ${err.name}, ${err.message}`);
  }
}

function applyColorShift(increment = 0.01) {
  colorValue += increment;
  setColorMatrix(colorValue);
}

async function resetState() {
  const canvasContainerEl = document.querySelector('#poems-container');
  canvasContainerEl.classList.remove('fullscreen');
  canvasContainerEl.classList.remove('part-1');
  canvasContainerEl.classList.remove('part-2');

  const navButtons = document.querySelectorAll('nav button');
  navButtons.forEach((button) => {
    button.classList.remove('active');
  });
  
  // Clear the color shift interval
  if (colorShiftInterval) {
    clearInterval(colorShiftInterval);
    colorShiftInterval = null;
  }

  eventListeners.forEach(({ element, type, handler }) => {
    element.removeEventListener(type, handler);
  });
  slideIndex = 0;
  eventListeners = [];
  previousSlideIndex = null;
  
  try {
    updateConvolutionLevel(0);
  } catch (e) {
    // console.error(e);
  }

  document.body.classList.remove('now-viewing');
  canvasContainerEl.classList.remove('has-started');

  // Release wake lock if it exists
  if (window.wakeLock) {
    try {
      await window.wakeLock.release();
      window.wakeLock = null;
    } catch (err) {
      console.error(`Failed to release wake lock: ${err.name}, ${err.message}`);
    }
  }
}

function returnHome() {
  resetState();

  window.history.pushState({}, '', href);
}

let updateCounter= 0;
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
  canvasContainerEl = document.querySelector('#poems-container');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  convolver = audioCtx.createConvolver();

  await audioCtx.audioWorklet?.addModule("/public/js/random-noise-processor.js");
  processor = new AudioWorkletNode(audioCtx, "random-noise-processor");
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
    button?.addEventListener('click', (event) => handleNavigationEvent(event, event.target.dataset.part));
    button?.addEventListener('touchend', (event) => handleNavigationEvent(event, event.target.dataset.part));
  });

  const homeButton = document.querySelector('button.nav-home');
  homeButton?.addEventListener('click', (event) => handleNavigationEvent(event, ''));
  homeButton?.addEventListener('touchend', (event) => handleNavigationEvent(event, ''));

  // Add popstate event listener for browser back/forward
  window.addEventListener('popstate', () => {
    // handleRouting();
  });

  // Handle initial route
  // need interaction to begin audio, so only remove this during development
  // window.location.href = href;
  // window.history.pushState({}, '', window.location.href);
  handleRouting();

});

function handleNavigationEvent(event, part) {
  event.preventDefault();
  resetState();
  if (part === '') return returnHome();
  handlePartSelection(part);
}

function addArrays(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    throw new Error('Arrays must be of the same length');
  }
  return arr1.map((value, index) => value + arr2[index]);
}

function hslColorMatrix(h) {
  const s = 1;
  const l = 0.6;
  const [r, g, b] = hslToRgb(h, s, l);
  const [r2, g2, b2] = hslToRgb(h + 0.55, s, l);

  // console.log(`RGB: (${r}, ${g}, ${b})`);
  // console.log(`RGB: (${h}`);

  const primaryArray = [
    r, 0, 0, -b/3, 0,
    0, g, 0, -r/3, 0,
    0, 0, b, -g/3, 0,
    r, g, b, 0, 0
  ];

  const secondaryArray = [
    r2/2, 0, 0, -r2/3, 0,
    0, g2/2, 0, -g2/3, 0,
    0, 0, b2/2, -b2/3, 0,
    -r/6, -g/6, -b/6, 0.1, 0
  ]

  return addArrays(primaryArray, secondaryArray).join(" ");
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

function threeSheetsToTheWind() {
  const elements = document.querySelectorAll('.three-sheets-to-the-wind span');
  elements.forEach(el => {
    const translateX = (Math.random() - 0.5) * 400; // -2px to 2px
    const translateY = 200 + (Math.random() - 0.5) * 400; // -2px to 2px
    const rotate = (Math.random() - 0.5) * 180; // -3deg to 3deg
    
    el.style.transform = `translate(${translateX}px, ${translateY}px) rotate(${rotate}deg)`;
  });
}
