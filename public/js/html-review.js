// const audioFilepath = '/public/airports-for-music-i.mp3';
const audioFilepath = 'https://reubenson.com/weaving/Swede\ Plate\ 5.0s.wav';
const PLAYBACK_VALUES = [
  // 1 + .00001,
  1,
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
const slides = [
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

function drawColorfield(color) {
  const width = canvas.width;
  const height = canvas.height;
  imageData = canvasCtx.createImageData(width, height);
  const data = imageData.data;

  if (color) {
    for (let i = 0; i < data.length; i += 4) {
      data[i] = color.r;
      data[i + 1] = color.g;
      data[i + 2] = color.b;
      data[i + 3] = 255;
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
      data[i + 3] = 255;
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

function processImageData(imageData, audioNode) { 
  const pixels = imageData.data;
  const numChannels = 1; // Mono audio
  const sampleRate = 48000; // Standard sample rate
  const numSamples = canvas.width * canvas.height * 4;
  const audioBuffer = new Float32Array(numSamples);

  // Convert pixel data to audio data
  for (let i = 0; i < numSamples; i++) {
    // const r = pixels[i * 4] / 255;
    // const g = pixels[i * 4 + 1] / 255;
    // const b = pixels[i * 4 + 2] / 255;
    // const avg = (r + g + b) / 3;
    // audioBuffer[i] = avg * 2 - 1; // Convert to range [-1, 1]

    audioBuffer[i] = pixels[i] / 255 * 2 - 1;
  }

  const buffer = audioCtx.createBuffer(numChannels, numSamples, sampleRate);
  buffer.copyToChannel(audioBuffer, 0);
  audioNode.buffer = buffer;
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
  // load impulse response from file
  let response = await fetch(audioFilepath);
  let buffer = await response.arrayBuffer();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048 * 4 * 4;
  source = audioCtx.createBufferSource();
  source.loop = true;

  gainNodeSource = audioCtx.createGain();
  gainNodeConvolution = audioCtx.createGain();
  const dry = 1.0;
  const wet = 1.0 - dry;
  gainNodeSource.gain.value = dry;
  gainNodeConvolution.gain.value = wet;

  convolver.normalize = false;

  processImageData(imageData, source);
  convolver.buffer = await audioCtx.decodeAudioData(buffer);

  source.connect(convolver);
  source.connect(gainNodeSource);
  convolver.connect(gainNodeConvolution);

  // gainNodeConvolution.connect(analyser);
  // gainNodeSource.connect(analyser);

  // connect to processor
  gainNodeSource.connect(processor);
  gainNodeConvolution.connect(processor);
  // processor.connect(analyser);
  // processor.connect(audioCtx.destination);
  
  source.playbackRate.value = PLAYBACK_VALUES[0];
  source.start(0);
  // visualize();
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

    // console.log('dataArray', dataArray);
    
    // console.log('draw');
    // maximum value of this is 16384 (128 x 128)
    // console.log('dataArray.length', dataArray.length);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // console.log('imageData', imageData);
    // if (imageData) {
    //   const pixels = imageData.data;
    //   for (let i = 0; i < bufferLength; i++) {
    //     const v = dataArray[i] / 128.0;
    //     const y = v * imageHeight / 2;

    //     for (let j = 0; j < imageWidth; j++) {
    //       const index = (Math.floor(y) * imageWidth + j) * 4;
    //       pixels[index] = dataArray[i] * 0;
    //       pixels[index + 1] = dataArray[i] * 0;
    //       pixels[index + 2] = dataArray[i] * 0;
    //       pixels[index + 3] = 0;
    //     }
    //   }
    // }

    // need to rotate data array for color correction
    function isRedPixel(arr) {
      return arr[0] > arr[1] && arr[0] > arr[2] && arr[3] > 90;
    }

    function rotateArray(arr) {
      if (arr.length === 0) return arr;
      const lastElement = arr[arr.length - 1];
      for (let i = arr.length - 1; i > 0; i--) {
        arr[i] = arr[i - 1];
      }
      arr[0] = lastElement;
      return arr;
    }

    let imageArray = new Uint8ClampedArray(dataArray);

    let pixel = imageArray.slice(0, 4);
    let rotations = 0;
    // while (!isRedPixel(imageArray.slice(0, 4)) && rotations < 4) {
    //   // console.log(`${rotations} rotating`, imageArray.slice(0, 4))
    //   imageArray = rotateArray(imageArray);;
    //   rotations++;
    // }

    imageArray = imageArray.map((val, index) => {
      if (index % 4 === 0) {
        return val;
      } else if (index % 4 === 1) {
        return val;
      } else if (index % 4 === 2) {
        return val;
      } else if (index % 4 === 3) {
        // increase level (more negative -> more transparency?)
        // return Math.pow(val / 255, -1.5) * 255
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

    // console.log('dataArray.byteLength', dataArray.byteLength);
    // console.log('imageArray', imageArray);
    
    // seems like len wants to be 32?, but not sure where that number is coming from
    // console.log(len / 8)

    // 

    canvasCtx.putImageData(new ImageData(imageArray, len * scaleFactor / 1, len * scaleFactor * 1), 0, 0);
  }

  draw();
}

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
  el.style.filter = `blur(1px) contrast(2) url(#slide-${index}-filter)`;
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
    feDisplacementMap.setAttribute("scale", "25");
    feDisplacementMap.setAttribute("xChannelSelector", "A");
    feDisplacementMap.setAttribute("yChannelSelector", "R");
    // feDisplacementMap.setAttribute("preserveAspectRatio", "xMidYMid meet");
    filter.appendChild(feDisplacementMap);
  });
}

function handleNavigation(event) {
  const viewportWidth = window.innerWidth;
  if (event.clientX > viewportWidth / 2) {
    slideIndex++;
  } else {
    slideIndex--;
  }

  slideIndex = Math.max(0, Math.min(slideIndex, slides.length - 1));
  updateToSlide(slideIndex);
}

document.addEventListener('DOMContentLoaded', async function() {
  canvasContainerEl = document.querySelector('#canvas-container');
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  convolver = audioCtx.createConvolver();
  await audioCtx.audioWorklet.addModule("/public/js/random-noise-processor.js");
  processor = new AudioWorkletNode(audioCtx, "random-noise-processor");

  initializeSlideImages();

  processor.port.onmessage = (e) => {
    visualize(e.data);
  };

  canvas = document.getElementById('visualizer');
  canvasCtx = canvas.getContext('2d');
  const button = document.querySelector('#start');
  createSvgFilter();

  button?.addEventListener('click', (event) => {
    updateToSlide(slideIndex);
    applyCSS();
    drawColorfield({r: 200, g: 50, b: 50});
    // drawColorfield();
    handleConvolution();

    window.setInterval(() => {
      // source.playbackRate.value = PLAYBACK_VALUES[Math.floor(Math.random() * PLAYBACK_VALUES.length)];
    }, 4500);

    // bug
    slideIndex = 0;
    event.preventDefault();

    canvasContainerEl.addEventListener('click', (event) => handleNavigation(event));
    canvasContainerEl.addEventListener('touchend', (event) => handleNavigation(event));

    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      colorValue += event.key === 'ArrowLeft' ? -0.01 : 0.01;
      setColorMatrix(colorValue);
      }
    });
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

// Fingerprint below
// demo data: https://fingerprintjs.github.io/fingerprintjs/
