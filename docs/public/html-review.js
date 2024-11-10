document.getElementById('imageInput').addEventListener('change', handleImageUpload);
document.getElementById('audioInput').addEventListener('change', handleAudioUpload);

let audioCtx;
let source;
let convolver;
let analyser;
let canvas;
let canvasCtx;
let imageData;
let imageWidth;
let imageHeight;

function handleImageUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
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

function handleAudioUpload(event) {
  const file = event.target.files[0];
  const reader = new FileReader();
  reader.onload = function(e) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    convolver = audioCtx.createConvolver();
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 2048;

    audioCtx.decodeAudioData(e.target.result, function(buffer) {
      source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(convolver);
      convolver.connect(analyser);
      analyser.connect(audioCtx.destination);
      source.start(0);
      visualize();
    });
  };
  reader.readAsArrayBuffer(file);
}

function visualize() {
  canvas = document.getElementById('visualizer');
  canvasCtx = canvas.getContext('2d');

  function draw() {
    requestAnimationFrame(draw);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    if (imageData) {
      const pixels = imageData.data;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * imageHeight / 2;

        for (let j = 0; j < imageWidth; j++) {
          const index = (Math.floor(y) * imageWidth + j) * 4;
          pixels[index] = dataArray[i];
          pixels[index + 1] = dataArray[i];
          pixels[index + 2] = dataArray[i];
        }
      }
      canvasCtx.putImageData(imageData, 0, 0);
    }
  }

  draw();
}