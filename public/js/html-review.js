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
let colorValue = 0.85;

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

let slideIndex = 0;
let previousSlideIndex = null;
const slides = [
  {
    imgUrl: "",
    // imgUrl: "/public/html-review/bently-snowflakes-cover.jpg",
    text: "There's a certain weightlessness to being here \n \n There's a certain weightlessness to being here \n \n There's a certain weightlessness to being here \n \n There's a certain weightlessness to being here \n \n There's a certain weightlessness to being here",
    displacementUrl: "/public/html-review/bently-snowflakes-cover.jpg"
  },
  {
    imgUrl: "",
    // imgUrl: "/public/html-review/bently-snowflakes-cover.jpg",
    text: "that has been heated / upwardly spiraling cyclonic",
    displacementUrl: "/public/html-review/bently-snowflakes-cover.jpg"
  },
  {
    imgUrl: "",
    // imgUrl: "/public/html-review/bently-snowflakes-cover.jpg",
    text: "orographically trapped",
    displacementUrl: "/public/html-review/bently-snowflakes-cover.jpg"
  },
  {
    imgUrl: "",
    // imgUrl: "/public/html-review/bently-snowflakes-cover.jpg",
    text: "its invigorating dryness",
    displacementUrl: "/public/html-review/bently-snowflakes-cover.jpg"
  },
  {
    imgUrl: "",
    // imgUrl: "/public/html-review/bently-snowflakes-cover.jpg",
    text: "usually felt throughout the summertime",
    displacementUrl: "/public/html-review/bently-snowflakes-cover.jpg"
  },
  {
    imgUrl: "",
    // imgUrl: "/public/html-review/bently-snowflakes-cover.jpg",
    text: "there would be no seasonal transport",
    displacementUrl: "/public/html-review/bently-snowflakes-cover.jpg"
  },

  {
    imgUrl: "",
    // imgUrl: "/public/html-review/bently-snowflakes-cover.jpg",
    text: "He would examine the snowflakes with a magnifying glass and sweep away the ones he didn’t want with a turkey feather",
    displacementUrl: "/public/html-review/bently-snowflakes-cover.jpg"
  },
  {
    imgUrl: "/public/meander-door.jpg",
    text: "Every crystal was a masterpiece of design and no one design was ever repeated. When a snowflake melted, that design was forever lost",
    displacementUrl: "/public/meander-door.jpg",
  },
  {
    imgUrl: "/public/html-review/crystals.png",
    text: "Just that much beauty was gone, without leaving any record behind",
    displacementUrl: "/public/html-review/crystals.png",
  },
  {
    imgUrl: "/public/html-review/herschel-fingerprint.jpg",
    text: "Every print showed the minute tell-tale dot which Mr. Gallon’s sharp eye had noticed twenty-two years before. No doubt it was a natal mark. It has anyhow already persisted for thirty-two years.",
    displacementUrl: "/public/html-review/herschel-fingerprint.jpg",
  }
]

function applyCSS() {
  const container = document.querySelector('#canvas-container');

  container.classList.add('fullscreen');
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

async function handleConvolution() {
  let response = await fetch(audioFilepath);
  let buffer = await response.arrayBuffer();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048 * 4 * 4;
  source = audioCtx.createBufferSource();
  source.loop = false;

  gainNodeSource = audioCtx.createGain();
  gainNodeConvolution = audioCtx.createGain();
  sumNode = audioCtx.createGain();
  const dry = 1.0;
  // const wet = 1.0 - dry;
  const wet  = 0.01;
  gainNodeSource.gain.value = dry;
  gainNodeConvolution.gain.value = wet;
  sumNode.gain.value = 1.0;

  
  convolver.normalize = false;
  
  // using music as convolution signal and image as source (looping)
  // processImageData(imageData, source, audioCtx.sampleRate);
  // testing wind instead 
  let windresponse = await fetch('/public/html-review/test-wind.mp3');
  let windBuffer = await windresponse.arrayBuffer();
  // let windBufferSource = audioCtx.createBufferSource();
  source.buffer = await audioCtx.decodeAudioData(windBuffer);
  // source.connect(audioCtx.destination);


  
  convolver.buffer = await audioCtx.decodeAudioData(buffer);
  
  source.connect(gainNodeSource);
  gainNodeSource.connect(convolver);
  convolver.connect(gainNodeConvolution);
  gainNodeSource.connect(sumNode);
  gainNodeConvolution.connect(sumNode);
  
  const compressor = audioCtx.createDynamicsCompressor();
  sumNode.connect(compressor);

  // lower volume of player relative to animation
  const playerGainNode = audioCtx.createGain();
  playerGainNode.gain.value = 0.2;
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
  convolver.connect(processor);
  // compressor.connect(processor);
  // distortion.connect(processor);
  // processor.connect(analyser);
  // processor.connect(audioCtx.destination);
  
  source.playbackRate.value = PLAYBACK_VALUES[0];
  // source.sampleRate = 42000;
  source.start();
  processor.port.postMessage('ping');
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

function updateWithImage(index) {
  const canvasEl = document.querySelector('canvas');
  const container = document.querySelector('#canvas-container');
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
    const canvasContainer = document.querySelector('#canvas-container');
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
  const textEls = document.querySelectorAll('#canvas-container p');
  textEls[index].classList.add('active');
  if (previousSlideIndex !== null) {
    textEls[previousSlideIndex].classList.remove('active');
  }
  previousSlideIndex = index;
  // const el = document.querySelector('#text');
  // el.textContent = slides[index].text;
}

function handlePoemSelection(event) {
  const poem = event.target.dataset.poem;
  console.log('poem', poem);

  const previousPoemEl = document.querySelector('.poem.selected-poem');
  previousPoemEl?.classList.remove('selected-poem');
  const poemEl = document.querySelector(`#${poem}`);
  poemEl.classList.add('selected-poem');

  if (poem === 'poem-1') {
    beginFragments(event); // refactor this to not pass down events
  } else if (poem === 'poem-2') {
    beginUntitled(event);
  }
}

function parsePoem(poem) {
  const frames = document.querySelectorAll(`#${poem} p`);
  return frames;
}

function beginFragments(event) {
  console.log('beginFragments');

  const frames = parsePoem(event.target.dataset.poem);

  // updateToSlide(slideIndex);
  applyCSS();
  // drawColorfield({r: 200, g: 50, b: 50});
  drawColorfield({r: 255,  g: 0, b: 0}, 0);

  // test whether drawing an invisible image changes the canvas
  // testColorfield();

  handleConvolution();

  window.setInterval(() => {
    // source.playbackRate.value = PLAYBACK_VALUES[Math.floor(Math.random() * PLAYBACK_VALUES.length)];
  }, 4500);

  // bug
  slideIndex = 0;
  updateFrame(frames[0]);
  // frames[slideIndex].classList.add('active');
  // frames[previousSlideIndex]?.classList.remove('active');
  // updateText(0);

  const el = document.querySelector('#canvas-container');
  el.style.filter = `blur(0px) contrast(4) url(#wind-filter)`;
  
  event.preventDefault();

  function updateFrame(el) {
    const activeEl = document.querySelector('.active');
    activeEl?.classList.remove('active');

    el.classList.add('active');
    // frames[previousIndex]?.classList.remove('active');
  }

  function handleNavigation(event) {
    const viewportWidth = window.innerWidth;
    if (event.clientX > viewportWidth / 2) {
      slideIndex++;
    } else {
      slideIndex--;
    }

    updateFrame(frames[slideIndex]);
  
    previousSlideIndex = slideIndex;
    slideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
    // updateToSlide(slideIndex);
    // updateText(slideIndex);
  }

  canvasContainerEl.addEventListener('click', (event) => handleNavigation(event));
  canvasContainerEl.addEventListener('touchend', (event) => handleNavigation(event));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    colorValue += event.key === 'ArrowLeft' ? -0.01 : 0.01;
    setColorMatrix(colorValue);
    }
  });
  // });
}

function beginUntitled(event) {
  console.log('beginUntitled');

  const frames = parsePoem(event.target.dataset.poem);
  console.log('frames', frames);

  canvas.classList.add('front');
  // updateToSlide(slideIndex);
  applyCSS();
  // drawColorfield({r: 200, g: 50, b: 50});
  drawColorfield({r: 255,  g: 0, b: 0}, 0);

  // test whether drawing an invisible image changes the canvas
  // testColorfield();

  handleConvolution();

  window.setInterval(() => {
    // source.playbackRate.value = PLAYBACK_VALUES[Math.floor(Math.random() * PLAYBACK_VALUES.length)];
  }, 4500);

  // bug
  slideIndex = 0;
  updateFrame(frames[slideIndex]);
  // updateText(0);
  // frames[slideIndex].classList.add('active');
  // frames[previousSlideIndex]?.classList.remove('active');

  const el = document.querySelector('#canvas-container');
  el.style.filter = `blur(1px) contrast(4) url(#dis-filter)`;
  
  event.preventDefault();

  function updateFrame(el) {
    const activeEl = document.querySelector('.active');
    activeEl?.classList.remove('active');

    el.classList.add('active');
    // frames[previousIndex]?.classList.remove('active');
  }

  function handleNavigation(event) {
    const viewportWidth = window.innerWidth;
    if (event.clientX > viewportWidth / 2) {
      slideIndex++;
    } else {
      slideIndex--;
    }

    updateFrame(frames[slideIndex]);
  
    previousSlideIndex = slideIndex;
    slideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));

    // updateToSlide(slideIndex);
    // updateText(slideIndex);
  }

  canvasContainerEl.addEventListener('click', (event) => handleNavigation(event));
  canvasContainerEl.addEventListener('touchend', (event) => handleNavigation(event));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    colorValue += event.key === 'ArrowLeft' ? -0.01 : 0.01;
    setColorMatrix(colorValue);
    }
  });
}

document.addEventListener('DOMContentLoaded', async function() {
  canvasContainerEl = document.querySelector('#canvas-container');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  convolver = audioCtx.createConvolver();
  await audioCtx.audioWorklet.addModule("/public/js/random-noise-processor.js");
  processor = new AudioWorkletNode(audioCtx, "random-noise-processor");

  initializeSlideImages();

  processor.port.onmessage = (e) => {
    // instead of appending to a stream, could update only when the whole image is ready?
    // but that might also look jarring due to convolution
    visualize(e.data);
  };

  canvas = document.getElementById('visualizer');
  canvasCtx = canvas.getContext('2d');
  const buttons = document.querySelectorAll('button');
  createSvgFilter();

  buttons.forEach((button) => {
    button?.addEventListener('click', (event) => handlePoemSelection(event));
    button?.addEventListener('touchend', (event) => handlePoemSelection(event));
  });


  // button?.addEventListener('click', (event) => {
  //   // updateToSlide(slideIndex);
  //   applyCSS();
  //   // drawColorfield({r: 200, g: 50, b: 50});
  //   drawColorfield({r: 255,  g: 0, b: 0}, 0);

  //   // test whether drawing an invisible image changes the canvas
  //   // testColorfield();

  //   handleConvolution();

  //   window.setInterval(() => {
  //     // source.playbackRate.value = PLAYBACK_VALUES[Math.floor(Math.random() * PLAYBACK_VALUES.length)];
  //   }, 4500);

  //   // bug
  //   slideIndex = 0;
  //   updateText(0);
  //   event.preventDefault();

  //   canvasContainerEl.addEventListener('click', (event) => handleNavigation(event));
  //   canvasContainerEl.addEventListener('touchend', (event) => handleNavigation(event));

  //   document.addEventListener('keydown', (event) => {
  //     if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
  //     colorValue += event.key === 'ArrowLeft' ? -0.01 : 0.01;
  //     setColorMatrix(colorValue);
  //     }
  //   });
  // });
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

  console.log(`RGB: (${r}, ${g}, ${b})`);

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
  function valueToRgbMatrix(value) {
    const r = value;
    const g = 1 - value;
    const b = value * 0.5;

    return [
      r, 0, 0, 0, 0,
      0, g, 0, 0, 0,
      0, 0, b, 0, 0,
      r, g, b, 0, 0
    ].join(" ");
  }

  
  function getRandomColorMatrix(value) {
    const matrix = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        matrix.push(Math.random().toFixed(2));
        
      }
      matrix.push(0); // leave alpha
      matrix.push(0); // leave multiply
      
      
      // matrix.push(0); // don't need multiply column
    }
    matrix.push(0);
    matrix.push(0);
    matrix.push(0);
    matrix.push(1);
    return matrix.join(" ");
  }

  // const el = document.querySelector("#customFilter feColorMatrix");

  // colorMatrixEl.setAttribute("values", valueToRgbMatrix(val));
  // colorMatrixEl.setAttribute("values", getRandomColorMatrix(Math.random()));
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

function testColorfield() {
  const canvas = document.querySelector('canvas');
  if (!canvas) {
    return null;
  }

  // Get the canvas context and data URL
  const ctx = canvas.getContext('2d');
  
  // Draw something small to ensure we have data
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, 1, 1);

  try {
    // Generate fingerprint from canvas data
    const dataURL = canvas.toDataURL();
    return dataURL;
  } catch (e) {
    // Handle cases where toDataURL() might fail
    console.error('Failed to generate canvas fingerprint:', e);
    return null;
  }
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

function getInvisibleCanvasFingerprint(toggle = true) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  // Draw completely transparent elements
  if (toggle) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0)';  // Red with 0 opacity
    ctx.fillRect(10, 10, 100, 100);
  }
  else {
    ctx.font = '16px Arial';
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';    // Black with 0 opacity
    ctx.fillText("Invisible text", 15, 50);
  }
  
  // The resulting dataURL will still contain the fingerprint
  // even though nothing is visible to the user
  const dataURL = canvas.toDataURL();
  
  return dataURL;
}

function getRecursiveFingerprint(iterations = 3) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 200;
  canvas.height = 200;

  // Initial subtle drawing
  ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
  ctx.fillRect(0, 0, 200, 200);

  function recursiveAmplify(depth = 0) {
    if (depth >= iterations) return;

    // console.log(`Depth: ${depth}`);

    // Get the current canvas state as an image
    const prevImage = new Image();
    prevImage.src = canvas.toDataURL();

    prevImage.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw the previous state multiple times with slight variations
      for (let i = 0; i < 4; i++) {
        ctx.save();
        
        // Translate to each quadrant
        ctx.translate(
          (i % 2) * canvas.width/2, 
          Math.floor(i/2) * canvas.height/2
        );
        
        // Scale down to fit quadrant
        ctx.scale(0.5, 0.5);
        
        // Add a tiny rotation
        ctx.rotate(0.0001 * depth);
        
        // Draw with very slight opacity
        ctx.globalAlpha = 0.95;
        
        // Draw the previous state
        ctx.drawImage(prevImage, 0, 0);
        
        ctx.restore();
      }

      // Continue recursion
      recursiveAmplify(depth + 1);
    };
  }

  recursiveAmplify(0);
  return canvas;
}

// Fingerprint below
// demo data: https://fingerprintjs.github.io/fingerprintjs/

function createVisualFingerprint(targetElement, options = {}) {
  const {
    width = 400,
    height = 400,
    speed = 0.001,
    colorShift = true,
    interactive = true
  } = options;

  // Create visible canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  targetElement.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  // Animation state
  let angle = 0;
  let mouseX = width / 2;
  let mouseY = height / 2;

  // Initial pattern
  function createInitialPattern() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.01)';
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = 'rgba(128, 128, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(width/4, height/4);
    ctx.bezierCurveTo(
      width/2, height/4,
      width/2, height*3/4,
      width*3/4, height*3/4
    );
    ctx.stroke();
  }

  // Animation loop
  function animate() {
    // Get current state as image
    const prevImage = new Image();
    prevImage.src = canvas.toDataURL();

    prevImage.onload = () => {
      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Create multiple transformed copies
      for (let i = 0; i < 6; i++) {
        ctx.save();
        
        // Center of rotation
        ctx.translate(mouseX, mouseY);
        
        // Rotate based on current angle
        ctx.rotate(angle + (Math.PI * 2 * i / 6));
        
        // Scale slightly
        const scale = 0.95 + Math.sin(angle * 5) * 0.05;
        ctx.scale(scale, scale);
        
        // Color effects
        if (colorShift) {
          ctx.filter = `hue-rotate(${angle * 360}deg) saturate(150%)`;
        }
        
        // Blend mode rotation
        ctx.globalCompositeOperation = [
          'multiply',
          'screen',
          'overlay'
        ][Math.floor(angle * 3) % 3];
        
        // Slight transparency
        ctx.globalAlpha = 0.8;
        
        // Draw previous state
        ctx.drawImage(
          prevImage, 
          -mouseX, 
          -mouseY
        );
        
        ctx.restore();
      }

      // Update angle
      angle += speed;
      
      // Request next frame
      requestAnimationFrame(animate);
    };
  }

  // Mouse interaction
  if (interactive) {
    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
    });

    // Touch support
    canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      mouseX = e.touches[0].clientX - rect.left;
      mouseY = e.touches[0].clientY - rect.top;
    });
  }

  // Start the effect
  createInitialPattern();
  animate();

  // Return control methods
  return {
    setSpeed: (newSpeed) => speed = newSpeed,
    toggleColorShift: () => colorShift = !colorShift,
    reset: () => {
      ctx.clearRect(0, 0, width, height);
      createInitialPattern();
    }
  };
}

// Usage:
/*
const effect = createVisualFingerprint(
  document.getElementById('container'),
  {
    width: 400,
    height: 400,
    speed: 0.001,
    colorShift: true,
    interactive: true
  }
);

// Control the effect:
// effect.setSpeed(0.002);
// effect.toggleColorShift();
// effect.reset();
*/
