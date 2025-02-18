const CANVAS_WIDTH = 512; // this is the desired width of the image drawn from the audio buffer
const CANVAS_HEIGHT = 512;

let audioHasStarted = false

const audioFilepath = '/public/airports-for-music-i.mp3';
// const audioFilepath = 'https://reubenson.com/weaving/Swede\ Plate\ 5.0s.wav';
const PLAYBACK_VALUES = [
  // 1 + .00001,
  // 1,
  1+ 1/64 + 0.00005,
  // 1 - 1/64 + 0.000005,
  // 1 - 1/64 - 0.000003,
  1 + 1/64 + 0.000003,
  // 2 + 1/64 + .000001
];
// const PLAYBACK_VALUES = [1 + .00001, 1+ 1/64 + 0.00005, 2+ 1/64 + .000001];

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

// this is the audio buffer data that is being sent to the processor
// it will be of fixed size ... of 512 x 512 pixels
const bufferWidth = CANVAS_WIDTH * 4;
let audioBufferData = new Uint8Array(bufferWidth * CANVAS_HEIGHT);

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

function drawColorfield(color, alpha = 255) {
  const width = canvas.width;
  const height = canvas.height;
  imageData = canvasCtx.createImageData(width, height);
  const data = imageData.data;

  if (color) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = alpha;
    }
  } else {
    for (let i = 0; i < data.length; i += 4) {
      const x = (i / 4) % width;
      const y = Math.floor(i / 4 / width);
      const r = x / width * 255;
      const g = y / height * 255;
      const b = 128;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 25;
    }
  }
  canvasCtx.putImageData(imageData, 0, 0);
}

function handleImageUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();

    img.onload = async function() {
      imageWidth = img.width;
      imageHeight = img.height;
      canvas.width = imageWidth;
      canvas.height = imageHeight;
      canvasCtx.drawImage(img, 0, 0);
      imageData = canvasCtx.getImageData(0, 0, imageWidth, imageHeight);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function processImageData(imageData, audioNode, sampleRate) { 
  const pixels = imageData.data;
  const numSamples = canvas.width * canvas.height * 4;
  // const width = 32 * 4;
  // const height = 32 * 4;
  // const numSamples = width * height * 4;
  const audioBuffer = new Float32Array(numSamples);

  // Convert pixel data to audio data
  for (let i = 0; i < numSamples; i++) {
    // brute force encoding of red pixels
    // if (i%4 === 0 || i%4 === 3) {
    //   audioBuffer[i] = 1;
    // } else {
    //   audioBuffer[i] = 0;
    // }

    // this seems to work just as well though
    audioBuffer[i] = (pixels[i] / 255) * 2 - 1;
  }

  const buffer = audioCtx.createBuffer(2, numSamples, sampleRate);
  buffer.copyToChannel(audioBuffer, 0);
  buffer.copyToChannel(audioBuffer, 1);
  audioNode.buffer = buffer;
  // console.log('First 10 data points in buffer:', audioBuffer.slice(0, 10));
}

function getImageBuffer(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = async function(e) {
    audioBuffer = await audioCtx.decodeAudioData(e.target.result);
  };
  reader.readAsArrayBuffer(file);
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
  
  // using music as convolution signal and image as source (looping)
  // processImageData(imageData, source, audioCtx.sampleRate);
  // testing wind instead 
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

  // compressor.connect(audioCtx.destination);

  // gainNodeConvolution.connect(analyser);
  // gainNodeSource.connect(analyser);

  // connect to processor
  // convolver.connect(processor);
  convolver.connect(processor);

  // compressor.connect(processor);
  // distortion.connect(processor);
  // processor.connect(analyser);
  // processor.connect(audioCtx.destination);
  
  // source.playbackRate.value = PLAYBACK_VALUES[0];
  // source.sampleRate = 42000;
  source.start();
  processor.port.postMessage({canvasWidth: CANVAS_WIDTH});

  audioHasStarted = true;

  visualize();
}

function visualize() {
  function draw() {
    requestAnimationFrame(draw);

    // console.log('drawing')

    if (!shouldUpdateCanvas) {
      // console.log('not updating canvas');
      return;
    }

    shouldUpdateCanvas = false;

    // request bufferArray data from processor
    // processor.port.postMessage('ping');
    
    // frameCount++;
    // if (frameCount < 1) {
      // return;
    // }
    // frameCount = 0;

    // console.log('audioBufferData', audioBufferData.length);
    
    // I think this is retrieving redundant data on each call, could be optimized
    // and also a running buffer would be nicer to scale up the time range of audio data
    // const bufferLength = analyser.frequencyBinCount;
    // let dataArray = new Uint8Array(bufferLength);

    // // Fill dataArray with data from audioBufferData until full
    // let dataArrayIndex = 0;
    
    // // Keep adding data while we have space in dataArray and data in audioBufferData
    // while (dataArrayIndex < bufferLength && audioBufferData.length > 0) {
    //   const currentBuffer = audioBufferData[0];
      
    //   // Copy as many elements as possible from current buffer
    //   const remainingSpace = bufferLength - dataArrayIndex;
    //   const elementsToCopy = Math.min(remainingSpace, currentBuffer.length);
      
    //   for (let i = 0; i < elementsToCopy; i++) {
    //     dataArray[dataArrayIndex] = currentBuffer[i];
    //     dataArrayIndex++;
    //   }
      
    //   // If we used all elements from current buffer, remove it
    //   if (elementsToCopy === currentBuffer.length) {
    //     audioBufferData.shift();
    //   } else {
    //     // Otherwise trim the used elements
    //     audioBufferData[0] = currentBuffer.slice(elementsToCopy);
    //   }
    // }

    // console.log('dataArray', dataArray);

    // analyser.getByteTimeDomainData(dataArray);

    // Get latest audio buffer data and copy into dataArray
    // if (audioBufferData.length > 0) {
    //   // Take up to bufferLength worth of data from the buffer
    //   const buffersToProcess = audioBufferData.splice(-bufferLength);
    //   // Combine all buffers into one array of size bufferLength
    //   const combinedBuffer = new Uint8Array(bufferLength);
    //   buffersToProcess.forEach((buffer, i) => {
    //     const offset = i * buffer.length;
    //     if (offset + buffer.length <= bufferLength) {
    //       combinedBuffer.set(buffer, offset);
    //     }
    //   });
    //   dataArray.set(combinedBuffer);
    // }

    // console.log('First 16 elements:', Array.from(audioBufferData.slice(0, 16)));


    // maximum value of this is 16384 (128 x 128)

    // this should only incrementally update?
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    let imageArray = new Uint8ClampedArray(audioBufferData);
    // console.log('imageArray', imageArray.slice(0, 16));
    // console.log('imageArray', imageArray.length);

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

    const len = Math.sqrt(audioBufferData.byteLength) / 2;

    // console.log('len', len);

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
    // canvasCtx.putImageData(new ImageData(imageArray, len * scaleFactor / aspect, len * scaleFactor * aspect), 0, 0);
    canvasCtx.putImageData(new ImageData(imageArray, CANVAS_WIDTH, CANVAS_HEIGHT), 0, 0);


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

function updateWithImage(index) {
  const canvasEl = document.querySelector('canvas');
  const container = document.querySelector('#poems-container');
  const lastActiveEl = container.querySelector('.active');

  const imgEl = document.querySelector(`#slide-${index}-image`);

  // removing images for now
  // imgEl?.classList.add('active');
  lastActiveEl?.classList.remove('active');

  // imgEl.style.display = 'block';
  // canvasEl.style.filter = `blur(15px) contrast(1) url(#slide-${slideIndex}-filter)`;
  // const url = slides[slideIndex].imgUrl;
  // const filterStyle = canvasEl.style.filter;
  // const el = document.querySelector('feDisplacementMap');
  // console.log('el', el);
  // el.setAttribute("in2", `slide-${slideIndex}`);
  // const feImage = el.querySelector('feImage');
  // feImage.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", url);
  // feImage.setAttribute("result", "beagle");
  // el.appendChild(feImage);
}

function updateWithText(text) {
  const el = document.querySelector('#text');
  el.textContent = text;
}

function updateFilter(index) {
  const el = document.querySelector('#text');
  el.style.filter = `blur(0px) contrast(4) url(#slide-${index}-filter)`;
  // el.style.filter = `blur(2px) contrast(4) url(#dis-filter)`;
}

function updateToSlide(index) {
  const { imgUrl, text } = slides[index];

  updateWithImage(index);
  updateWithText(text);
  updateFilter(index);

  // const img = new Image();
  // img.onload = function() {
  //   canvas.width = img.width;
  //   canvas.height = img.height;
  //   canvasCtx.drawImage(img, 0, 0);
  //   imageData = canvasCtx.getImageData(0, 0, img.width, img.height);
  // };
  // img.src = slide.imgUrl;
  // slideIndex++;
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

// function handleNavigation(event) {
//   const viewportWidth = window.innerWidth;
//   if (event.clientX > viewportWidth / 2) {
//     slideIndex++;
//   } else {
//     slideIndex--;
//   }

//   slideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
//   // updateToSlide(slideIndex);
//   // updateText(slideIndex);
// }

function updateText(index) {
  const textEls = document.querySelectorAll('#poems-container p');
  textEls[index].classList.add('active');
  if (previousSlideIndex !== null) {
    textEls[previousSlideIndex].classList.remove('active');
  }
  previousSlideIndex = index;
  // const el = document.querySelector('#text');
  // el.textContent = slides[index].text;
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
  // frames[previousIndex]?.classList.remove('active');
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
  // el.style.filter = `blur(1px) contrast(4) url(#dis-filter)`;
  
  event.preventDefault();

  // function updateFrame(el) {
  //   const activeEl = document.querySelector('.active');
  //   activeEl?.classList.remove('active');

  //   el.classList.add('active');
  // }

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
  console.log('updating convolution level');
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

  // document.body.style.backgroundColor = 'snow';
  document.body.classList.remove('now-viewing');
  canvasContainerEl.classList.remove('has-started');
}

let updateCounter= 0;
let shouldUpdateCanvas = false;

// on each iteration, a chunk of time-domain audio data is appended to the buffer
// it should be appended to preserve linearity of the audio data, where the first element of the buffer is
// the newest and the last element is the oldest
function updateAudioBufferData(data) {
  const incrementCount = Math.round(4 * CANVAS_WIDTH / data.length);
  
  // Create temporary array to hold combined data
  const tempArray = new Uint8Array(audioBufferData.length);
  
  // Copy existing data at the start, shifted by the length of new data
  tempArray.set(audioBufferData.slice(0, audioBufferData.length - data.length), data.length);
  
  // Copy new data at the end
  // tempArray.set(data, audioBufferData.length - data.length);
  tempArray.set(data, 0);
  
  // Update audioBufferData with the new combined array
  audioBufferData.set(tempArray);

  // if (updateCounter % incrementCount === 0) {
  shouldUpdateCanvas = true;
  //   updateCounter = 0;
  // }
  // updateCounter++;
}

document.addEventListener('DOMContentLoaded', async function() {
  canvasContainerEl = document.querySelector('#poems-container');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  convolver = audioCtx.createConvolver();
  await audioCtx.audioWorklet.addModule("/public/js/random-noise-processor.js");
  processor = new AudioWorkletNode(audioCtx, "random-noise-processor");

  processor.port.onmessage = (e) => {
    updateAudioBufferData(e.data);
    // instead of appending to a stream, could update only when the whole image is ready?
    // but that might also look jarring due to convolution
    // visualize(e.data);
    // audioBufferData.push(e.data);
    // console.log('hi', e.data);
  };

  // canvas = document.getElementById('visualizer');
  canvas = document.createElement('canvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  canvasContainerEl.querySelector('#part-2').appendChild(canvas);
  
  canvasCtx = canvas.getContext('2d');
  createSvgFilter();
  
  const closeButton = document.querySelector('#close');
  closeButton?.addEventListener('click', (event) => {
    returnHome();
    // canvasContainerEl.classList.remove('front');
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

function subtractArrays(arr1, arr2) {
  if (arr1.length !== arr2.length) {
    throw new Error('Arrays must be of the same length');
  }
  return arr1.map((value, index) => value - arr2[index]);
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
