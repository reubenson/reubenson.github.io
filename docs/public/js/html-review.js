/**
 * instead of cycling through so many colors, would be nice to oscillate within a subtle range. can that be done with svg filters?
 */

const PLAYBACK_VALUES = [1 + .00001, 1+ 1/64 + 0.00005, 2+ 1/64 + .000001];
let frameCount = 0;
const frameRate = 30; // Target frame rate (e.g., 30 frames per second)
const frameInterval = 60 / frameRate; // Calculate the interval for the target frame rate


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

function applyCSS() {
  const container = document.querySelector('#canvas-container');

  container.classList.add('fullscreen');
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
  let response = await fetch("https://reubenson.com/weaving/Swede\ Plate\ 5.0s.wav");
  let buffer = await response.arrayBuffer();

  analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048 * 4 * 4;
  source = audioCtx.createBufferSource();
  source.loop = true;

  gainNodeSource = audioCtx.createGain();
  gainNodeConvolution = audioCtx.createGain();
  const dryWet = 0.1;
  gainNodeSource.gain.value = dryWet;
  gainNodeConvolution.gain.value = 1.0 - dryWet;

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
  processor.connect(analyser);
  
  // source.playbackRate.value = 1;
  source.playbackRate.value = PLAYBACK_VALUES[0];
  source.start(0);
  visualize();
}

function visualize(dataArray) {
  function draw() {
    // requestAnimationFrame(draw);

    // request bufferArray data from processor
    processor.port.postMessage('ping');

    frameCount++;
    if (frameCount < frameInterval) {
      return;
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
  // console.log('draw');
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

document.addEventListener('DOMContentLoaded', async function() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  convolver = audioCtx.createConvolver();
  await audioCtx.audioWorklet.addModule("/public/js/random-noise-processor.js");
  processor = new AudioWorkletNode(audioCtx, "random-noise-processor");

  processor.port.onmessage = (e) => {
    visualize(e.data);
  };

  canvas = document.getElementById('visualizer');
  canvasCtx = canvas.getContext('2d');
  const button = document.querySelector('#start');

  button?.addEventListener('click', () => {
    applyCSS();
    drawColorfield({r: 200, g: 50, b: 50});
    // drawColorfield();
    handleConvolution();

    window.setInterval(() => {
      source.playbackRate.value = PLAYBACK_VALUES[Math.floor(Math.random() * PLAYBACK_VALUES.length)];
    }, 1500);
  });
});

// Fingerprint below
// demo data: https://fingerprintjs.github.io/fingerprintjs/
