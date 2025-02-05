let audioHasStarted = false

const audioFilepath = '/public/airports-for-music-i.mp3';
// const audioFilepath = 'https://reubenson.com/weaving/Swede\ Plate\ 5.0s.wav';
let frameCount = 0;
const frameRate = 30; // Target frame rate (e.g., 30 frames per second)
const frameInterval = 1000 / frameRate; // Calculate the interval for the target frame rate
let colorMatrix, colorMatrixEl;
let colorValue = 0.46;

let canvasContainerEl;
let audioCtx;
let source;
let convolver;
let analyser;
let canvas;
let canvasCtx;
let imageData;
let imageWidth;
let imageHeight;
let imageBuffer;
let gainNodeSource;
let gainNodeConvolution;
let processor;

let eventListeners = [];

let slideIndex = 0;
let previousSlideIndex = null;

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
  if (!audioHasStarted) return;

  // const currentValue = gainNodeConvolution.gain.value;
  const duration = 60; // seconds
  gainNodeConvolution.gain.linearRampToValueAtTime(level, audioCtx.currentTime + duration);
}

async function handleConvolution() {
  if (audioHasStarted) return;

  let response = await fetch(audioFilepath);
  let buffer = await response.arrayBuffer();

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
  
  let windresponse = await fetch('/public/html-review/test-wind.mp3');
  let windBuffer = await windresponse.arrayBuffer();
  source.buffer = await audioCtx.decodeAudioData(windBuffer);

  convolver.buffer = await audioCtx.decodeAudioData(buffer);
  
  source.connect(gainNodeSource);
  gainNodeSource.connect(convolver);
  convolver.connect(gainNodeConvolution);
  gainNodeSource.connect(sumNode);
  
  let gainNodeConvolution2 = audioCtx.createGain();
  gainNodeConvolution2.gain.value = 0.2;
  gainNodeConvolution.connect(gainNodeConvolution2);
  gainNodeConvolution2.connect(sumNode);
  
  // const compressor = audioCtx.createDynamicsCompressor();
  // sumNode.connect(compressor);

  // lower volume of player relative to animation
  const playerGainNode = audioCtx.createGain();
  playerGainNode.gain.value = 0.5;
  sumNode.connect(playerGainNode);
  playerGainNode.connect(audioCtx.destination);

  // sumNode.connect(audioCtx.destination);

  // const distortion = audioCtx.createWaveShaper();
  // distortion.curve = new Float32Array([0, 1]); // Simple linear distortion curve
  // distortion.oversample = '4x';

  // compressor.connect(distortion);
  // distortion.connect(audioCtx.destination);


  // gainNodeConvolution.connect(analyser);
  // gainNodeSource.connect(analyser);

  // connect to processor
  convolver.connect(processor);
  // compressor.connect(processor);
  // distortion.connect(processor);
  // processor.connect(analyser);
  // processor.connect(audioCtx.destination);
  
  // source.playbackRate.value = PLAYBACK_VALUES[0];
  source.start();
  processor.port.postMessage('ping');

  audioHasStarted = true;
}

function visualize(dataArray) {
  function draw() {
    // requestAnimationFrame(draw);

    // request bufferArray data from processor
    processor.port.postMessage('ping');
    
    frameCount++;
    if (frameCount < 1) {
      // return;
    }
    frameCount = 0;
    
    // I think this is retrieving redundant data on each call, could be optimized
    // and also a running buffer would be nicer to scale up the time range of audio data
    // const bufferLength = analyser.frequencyBinCount;
    // let dataArray = new Uint8Array(bufferLength);
    // analyser.getByteTimeDomainData(dataArray);

    // maximum value of this is 16384 (128 x 128)

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    let imageArray = new Uint8ClampedArray(dataArray);

    imageArray = imageArray.map((val, index) => {
      if (index % 4 === 0) {
        // console.log('val', val);
        return val;
      } else if (index % 4 === 1) {
        return val;
      } else if (index % 4 === 2) {
        return val;
      } else if (index % 4 === 3) {
        return val;
        // increase level (more negative -> more transparency?)
        return Math.pow(val / 255, -1.5) * 255
        // return val;
        return 255;
      }
    });

    const len = Math.sqrt(dataArray.byteLength) / 2;

    // dataArray 2048 -> 16 x 16
    // dataArray 4096 -> 32 x 32
    // dataArray 16384 -> 64 x 64

    // Example usage:
    const originalWidth = len;
    const originalHeight = len;
    const scaleFactor = 1;
    const scaledPixelArray = scaleUpPixels(imageArray, originalWidth, originalHeight, scaleFactor);
    
    // seems like len wants to be 32?, but not sure where that number is coming from
    // console.log(len / 8)

    // 
    const aspect = 2;
    canvasCtx.putImageData(new ImageData(imageArray, len * scaleFactor / aspect, len * scaleFactor * aspect), 0, 0);


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

function initializeSlideImages() {
  slides.forEach((slide, index) => {
    const canvasContainer = document.querySelector('#poems-container');
    const img = new Image();
    img.src = slide.imgUrl;
    img.id = `slide-${index}-image`;
    img.alt = `Slide ${index}`;
    canvasContainer.appendChild(img);

    if (index === 0) img.classList.add('active');

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

function handlePartSelection(event) {
  const part = event.target.dataset.part;
  const previousPoemEl = document.querySelector('.poem-container.selected-part');
  previousPoemEl?.classList.remove('selected-part');
  const poemEl = document.querySelector(`#${part}`);
  poemEl.classList.add('selected-part');

  if (part === 'part-1') {
    beginFragments(event); // refactor this to not pass down events
  } else if (part === 'part-2') {
    beginUntitled(event);
  }

  // document.body.style.backgroundColor = 'black';
  document.body.classList.add('now-viewing');
}

function parsePoem(poem) {
  const frames = document.querySelectorAll(`#${poem} div`);
  return frames;
}

function updateFrame(el) {
  const activeEl = document.querySelector('.active');
  activeEl?.classList.remove('active');

  el.classList.add('active');
}

async function beginFragments(event) {
  canvasContainerEl.classList.add('part-1');
  const closeButton = document.querySelector('#close');
  closeButton.style.display = 'block';

  const frames = parsePoem(event.target.dataset.part);

  slideIndex = 0;
  updateFrame(frames[0]);
  
  event.preventDefault();

  function handleNavigation(event) {
    const viewportWidth = window.innerWidth;  
    const xLocation = event.type === 'touchend' ? event.changedTouches[0].clientX : event.clientX;
    
    if (xLocation > viewportWidth / 2) {
      slideIndex++;
    } else {
      slideIndex--;
    }
  
    updateFrame(frames[slideIndex]);
  
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

  await handleConvolution();
  updateConvolutionLevel(0);
}

async function beginUntitled(event) {
  canvasContainerEl.classList.add('part-2');
  const closeButton = document.querySelector('#close');
  closeButton.style.display = 'block';
  canvas.classList.add('front');

  window.setTimeout(() => {
    const el = document.querySelector('#poems-container');
    el.classList.add('has-started');
  }, 0);
  
  event.preventDefault();

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      const increment = event.key === 'ArrowLeft' ? -0.01 : 0.01;
      applyColorShift(increment);
    }
  });

  window.setInterval(() => {
    applyColorShift(0.001);
  }, 500);

  await handleConvolution();
  updateConvolutionLevel(0.03);
}

function applyColorShift(increment = 0.01) {
  colorValue += increment;
  setColorMatrix(colorValue);
}

function returnHome() {
  // reset state
  const canvasContainerEl = document.querySelector('#poems-container');
  canvasContainerEl.classList.remove('fullscreen');
  canvasContainerEl.classList.remove('part-1');
  canvasContainerEl.classList.remove('part-2');
  const closeButton = document.querySelector('#close');
  closeButton.style.display = 'none';
  eventListeners.forEach(({ element, type, handler }) => {
    element.removeEventListener(type, handler);
  });
  slideIndex = 0;
  eventListeners = [];
  previousSlideIndex = null;
  updateConvolutionLevel(0);

  document.body.classList.remove('now-viewing');
  canvasContainerEl.classList.remove('has-started');
}

document.addEventListener('DOMContentLoaded', async function() {
  canvasContainerEl = document.querySelector('#poems-container');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  convolver = audioCtx.createConvolver();
  await audioCtx.audioWorklet.addModule("/public/js/random-noise-processor.js");
  processor = new AudioWorkletNode(audioCtx, "random-noise-processor");


  processor.port.onmessage = (e) => {
    // instead of appending to a stream, could update only when the whole image is ready?
    // but that might also look jarring due to convolution
    visualize(e.data);
  };

  canvas = document.getElementById('visualizer');
  canvasCtx = canvas.getContext('2d');
  createSvgFilter();
  
  const closeButton = document.querySelector('#close');
  closeButton?.addEventListener('click', (event) => {
    returnHome();
  });
  
  const startButtons = document.querySelectorAll('button.start');
  startButtons.forEach((button) => {
    button?.addEventListener('click', (event) => handlePartSelection(event));
    button?.addEventListener('touchend', (event) => handlePartSelection(event));
  });
});

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
  console.log(`RGB: (${h}`);

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

function dataURLToPixelArray(dataURL) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Create a temporary canvas to draw the image
      const tempCanvas = document.createElement('canvas');
      const tempCtx = tempCanvas.getContext('2d');
      
      // Set canvas size to match image
      tempCanvas.width = img.width;
      tempCanvas.height = img.height;
      
      // Draw image onto canvas
      tempCtx.drawImage(img, 0, 0);
      
      // Get pixel data
      const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
      
      resolve({
        pixels: imageData.data,  // Uint8ClampedArray of RGBA values
        width: img.width,
        height: img.height
      });
    };
    
    img.onerror = reject;
    img.src = dataURL;
  });
}
