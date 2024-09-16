const MINUTE = 60 * 1000; // milliseconds per minute
const DURATION = 5; // 5 minutes
const REVERB_PATH = 'https://reubenson.com/weaving/Swede%20Plate%203.0s.wav';
const BASE_FREQ = 50;
const HARMONICS = [5, 6, 8, 9];

function addStyles() {
  const tocButtonEl = document.querySelector('.toc-button');
  const headerEl = document.querySelector('header');
  const containerEl = document.querySelector('.content');
  const blurEl = document.querySelector('.content-wrapper');
  blurEl.style.transition = `filter ${2 * DURATION * 60}s ease-in-out`;
  containerEl.style.filter = 'contrast(4.5)';
  // body.style.backgroundColor = 'chartreuse';

  tocButtonEl.style.display = 'none';
  headerEl.style.display = 'none';
}

function getRandomHarmonic() {
  const randomIndex = Math.floor(Math.random() * HARMONICS.length);
  return HARMONICS[randomIndex];
}

async function createReverb(filepath, ctx) {
  let convolver = ctx.createConvolver();

  // load impulse response from file
  let response = await fetch(filepath);
  let arraybuffer = await response.arrayBuffer();
  convolver.buffer = await ctx.decodeAudioData(arraybuffer);

  return convolver;
}

async function main () {
  // start CSS transition
  const blurEl = document.querySelector('.content-wrapper');
  blurEl.style.filter = 'blur(100px)';

  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const frequency = BASE_FREQ * getRandomHarmonic();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime); // 440 Hz (A4)

  const reverb = await createReverb(REVERB_PATH, audioCtx)

  const gainNode = audioCtx.createGain();
  // const reverb = audioCtx.createConvolver();
  // const reverbGain = audioCtx.createGain();
  // const reverbBuffer = audioCtx.createBuffer(2, 1, audioCtx.sampleRate);
  // const reverbData = reverbBuffer.getChannelData(0);
  // const reverbData2 = reverbBuffer.getChannelData(1);
  // const reverbLength = reverbBuffer.length;
  // const reverbGainValue = 0.5;
  // const reverbDelay = 0.5;

  // oscillator.frequency.setValueAtTime(440, audioCtx.currentTime); 
  oscillator.connect(gainNode);
  gainNode.connect(reverb);
  reverb.connect(audioCtx.destination);

  // Set initial gain value
  gainNode.gain.setValueAtTime(0, audioCtx.currentTime); // slow attack
  gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 10); // slow attack

  // Apply a linear ramp to the gain node
  gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + DURATION * 60); // units of seconds

  // Start the oscillator
  oscillator.start();

  // Stop the oscillator after the duration
  oscillator.stop(audioCtx.currentTime + DURATION * 60);

  // const reverbDecay = 0.5;
  // const reverbDelaySamples = reverbDelay * audioCtx.sampleRate;
  // const reverbDecaySamples = reverbDecay * audioCtx.sampleRate;
  // const reverbDecayFactor = 0.5;
  // const reverbDelayFactor = 0.5;
  // const reverbDelayFactor2 = 0.5;
  // const reverbDecayFactor2 = 0.5;
  // const
  // create webAudio API context
  // create oscillator with a randomized selection of frequency
  // connect oscillator to reverb and destination
  // start oscillator on a timer
  // CSS transition also to fade page to black over five minutes
}

document.addEventListener('DOMContentLoaded', function() {
  const startButton = document.getElementById('naive-button');
  addStyles();

  startButton.addEventListener('click', main);
  startButton.addEventListener('touchstart', main);
});
