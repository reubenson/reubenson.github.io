import { FFTConvolution } from 'ml-convolution';
import _ from 'lodash';

const fftSize = 256;
const frogs: Frog[] = [];

/**
 * calculate the total amplitude of the input FFT
 * @param data FFT array
 * @returns number
 */
function calculateAmplitude(data: Float32Array) {
  const fftSum = _.sum(_.map(data, item => {
    return Math.pow(10, item);
  }));

  console.log('fftSum', fftSum);

  return Math.log10(fftSum); // convert back to log decibel scale;
}

function processFFT(data: Float32Array) {
  const max = data.reduce((item, acc) => Math.max(item, acc), -Infinity);

  return data.map(item => Math.pow(10, item - max)); // normalize to 0->1
}

class Frog {
  audioConfig: AudioConfig;
  shyness: number; // 0. - 1.
  shynessInterval = 100;
  audioImprint: Float32Array;
  audioElement: HTMLAudioElement;
  isInitialized: boolean;
  fft: FFTConvolution;
  fftNormalizationFactor: number;
  id: number; // id registered with AudioConfig
  lastUpdated: number; // timestamp of last update

  constructor(audioConfig: AudioConfig) {
    this.audioConfig = audioConfig;
    this.shyness = 1.0; // initiaize to 1 (maximum shyness)
    this.audioImprint = new Float32Array(fftSize / 2); // make dynamic
    this.isInitialized = false;
    this.lastUpdated = Date.now();

    this.id = this.audioConfig.register(this);

    // load in sample
    this.loadSample();

    this.initialize();
    
    
    // alternately, set timeout for updating shyness, instead of executing during sing
    // set interval for updating shyness, potentially with an integrator to apply some latency/smoothing
    // setTimeout(this.updateShyness.bind(this), this.shynessInterval);
    this.setTimeout();
  }

  async initialize() {
    let result = new Float32Array(fftSize / 2); // make fftSize dynamic

    // measure audio imprint (FFT signature) of sample
    this.audioImprint = await this.audioConfig.analyseSample(this.id, this.audioElement, result);
    const maxBefore = result.reduce((item, acc) => Math.max(item, acc), -Infinity);
    const minBefore = result.reduce((item, acc) => Math.min(item, acc), Infinity);
    console.log('maxbefore', maxBefore);
    console.log('minbefore', minBefore);
    // const maxValue = this.audioImprint.reduce((item, acc) => Math.max(item, acc), -Infinity);
    // console.log('maxValue', maxValue);
    // this.fftNormalizationFactor = Math.exp(Math.max.apply(null, this.audioImprint));
    this.audioImprint = processFFT(this.audioImprint);

    console.log('audioImprint', this.audioImprint);

    this.fft = new FFTConvolution(fftSize / 2, this.audioImprint.subarray(0, fftSize / 2 - 1));
    this.isInitialized = true;
    console.log('frog initialized!', this.audioImprint);
  }

  /**
   * create audio element
   */
  loadSample() {
    this.audioElement = new Audio();
    // this.audioElement.src = 'https://reubenson.com/frogus/audio/Anaxyrus_punctatus2.mp3';
    this.audioElement.src = 'https://reubenson.com/frogus/audio/Aneides_lugubris90.mp3';
    this.audioElement.controls = false;
    this.audioElement.loop = false;
    this.audioElement.autoplay = false;
    this.audioElement.crossOrigin = 'anonymous';
  }

  /**
   * manage timer that determines how often the frog will sing
   */
  setTimeout() {
    setTimeout(this.sing.bind(this), this.getIntervalLength());
  }

  /**
   * periodically update frog's shyness
   */
  updateShyness(amplitude: number, inputData: Float32Array) {
    // each frog should register an audio imprint with the Audio class
    // Audio class is responsible for regularly sampling the acoustic environment and
    // comparing the spectrum against each registered sample
    // updating a 'time since last matching event' property

    const conv = this.fft.convolve(inputData);

    // console.log('inputData', inputData);

    const convolutionSum = conv.reduce((item, acc) => acc + item, 0);
    // console.log('summ', convolutionSum);
    
    this.shyness = this.determineShyness(amplitude, convolutionSum); // most basic linear implementation

    console.log('shyness', this.shyness);
  }

  /**
   * determine shyness as a function of signal amplitude and match
   *   prominence in frog signal will decrease shyness (shyness is inversely proportional to frog signal match)
   *   prominence in loudness in non-frog spectrum will increase shyness (shyness is proportional to amplitude)
   *   sudden non-frog signal with absence of frog spectrum will rapidly induce shyness
   * @param amplitude input (mic) signal amplitude
   * @param match input signal match (with frog)
   * @returns number
   */
  determineShyness(amplitude: number, match: number) {
    const relativeAmplitude = amplitude - this.audioConfig.minimumAmplitude;
    
    // 0 yields 0 | 500 yields 1
    const timeFactor = Math.min(1, (Date.now() - this.lastUpdated) / 500.0 );

    console.log('min', this.audioConfig.minimumAmplitude);
    console.log('relat', relativeAmplitude);
    
    // 0 yields -0.1 | 3 yields 1.1 ??
    const range = 0.2;
    const amplitudeFactor = -0.1 + 0.2 * Math.min(relativeAmplitude / 3.0, 1);

    console.log('amplitudeFactor', amplitudeFactor);
    // console.log('timeFactor', timeFactor);

    return Math.max(0, Math.min(1, this.shyness + amplitudeFactor * timeFactor)); // coerce value to range between 0 and 1;
  }

  /**
   * determine length of time until sing is executed again
   */
  getIntervalLength() {
    const max = 5000;
    const min = 500;
    
    // some function of 'shyness' that establishes a curve between min and max
    const linearCurve = min + this.shyness * (max - min);
    
    return linearCurve;
  }

  /**
   * trigger play on the audio element
   */
  playSample() {
    console.log('croak');
    this.audioElement.play();
  }

  /**
   * as the frog detects other frogs, it will be emboldened to sing more loudly and frequently
   */
  sing() {
    // lazily evaluate shyness
    // this.updateShyness();

    // play sample at variable amplitude based on attributes that are set by properties (shyness?)?
    // or at sing-runtime, read fromt fft analysis?
    this.playSample();
    this.setTimeout();
  }
}

class AudioConfig {
  analyser: AnalyserNode;
  ctx: AudioContext;
  deviceId: string;
  groupId: string;
  freqLimit = 5000; // can parameterize later if needed
  freqBandwidth = 10; // can parameterize later if needed
  sampleRate = 44100;
  // fftSize: number;
  inputSamplingInterval = 50; // time (ms) between FFT analysis events
  idCounter = 0; // tracks with global frogs array
  minimumAmplitude = 0;

  constructor() {
    // this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = new (window.AudioContext);
    // this.fftSize = Math.pow( 2 , Math.ceil( Math.log2(this.sampleRate / this.freqBandwidth)) );
    this.setDeviceId().then(() => {
      this.initializeAudio();
    });
  }

  register(listener: Frog) {
    const id = this.idCounter;
    
    this.idCounter++;

    return id;
  }

  // getMicrophoneFFT() {
  //   const data = new Float32Array(fftSize); // make fftSize dynamic
  //   this.analyser.getFloatFrequencyData(data);

  //   console.log('data', data);

  //   return data;
  // }

  setDeviceId() {
    const eligibleDevices = [
      '',
      'Built-in Microphone'
    ];

    function deviceFound(label: any) {
      for (var i = 0; i < eligibleDevices.length; i++) {
        if (label == eligibleDevices[i]) {
          return true
        }
      }
      return false
    }

    return navigator.mediaDevices.enumerateDevices()
      .then( (devices) => {
        var deviceFound = false;
        for (var i = 0; i < eligibleDevices.length; i++) {
          var regex = new RegExp(eligibleDevices[i],'ig');
          for (var j = 0; j < devices.length; j++) {
            if (!deviceFound && devices[j].kind == 'audioinput' && devices[j].label.match(regex)) {
              this.deviceId = devices[j].deviceId
              this.groupId = devices[j].groupId;
              console.log('devices', devices[j]);
              deviceFound = true;
            }
          }
        }

      this.deviceId = this.deviceId || 'default';
    });
  }

  initializeAudio() {
    var ctx = this.ctx;
    let constraints = {audio: {}};
    if (this.deviceId)
      constraints.audio = {deviceId: {exact: this.deviceId}};
    else if (this.groupId)
      constraints.audio = {groupId: {exact: this.groupId}};
  
    navigator.mediaDevices.getUserMedia(constraints)
      .then(function(this: AudioConfig, stream: any){
        const input = ctx.createMediaStreamSource(stream);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = fftSize;
        this.analyser.smoothingTimeConstant = 0.9;
        this.analyser.maxDecibels = -30;
        input.connect(this.analyser);
        setInterval(this.sampleAudio.bind(this), this.inputSamplingInterval);
      }.bind(this))
      .catch(function(error){
        // debugger
      });
  }

  sampleAudio() {
    const data = new Float32Array(fftSize / 2);
    this.analyser.getFloatFrequencyData(data);

    const amplitude = calculateAmplitude(data);
    
    // establish a baseline value for the minimum amplitude signal
    this.minimumAmplitude = Math.min(this.minimumAmplitude, amplitude);

    frogs.forEach(frog => {
      frog.updateShyness(amplitude, processFFT(data));
    });
  }

  /**
   * analyze incoming audio and generate an FFT signature to be used
   * to compare against other signals
   * Note: see https://stackoverflow.com/questions/14169317/interpreting-web-audio-api-fft-results
   * @param audio AudioElement
   * @returns Float32Array
   */
  async analyseSample(id: number, audio: HTMLAudioElement, averagedFFT: Float32Array) {
    const sourceNode = this.ctx.createMediaElementSource(audio);
    
    //Create analyser node
    const analyserNode = this.ctx.createAnalyser();
    analyserNode.fftSize = fftSize;
    analyserNode.smoothingTimeConstant = 0.96;
    analyserNode.maxDecibels = -30;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    function iterate(numberOfSteps: number, result: Float32Array) {
      analyserNode.getFloatFrequencyData(dataArray);

      dataArray.forEach((value, index) => {
        averagedFFT[index] = value;
        // result[index] += value === -Infinity ? -Infinity : value * 1.0 / numberOfSteps;
      });
    return averagedFFT;
    }

    async function getAveragedFFT(): Promise<Float32Array> {
      const numberOfSteps = 20;
      let stepCount = 0;

      return await new Promise(async resolve => {
        while (stepCount < numberOfSteps) {
          // TODO: simplify average FFT calculation since smoothing automatically accounts for this, sort of
          averagedFFT = iterate(numberOfSteps, averagedFFT);
          await new Promise(resolve => setTimeout(resolve, 50));
          stepCount++;
        }

        audio.pause();
        resolve(averagedFFT);
      });
    }
    
    //Set up audio node network
    sourceNode.connect(analyserNode);
    // analyserNode.connect(this.ctx.destination); // uncomment to debug
    
    audio.loop = true;
    audio.play();

    averagedFFT = await getAveragedFFT();

    audio.loop = false;
    audio.pause();

    analyserNode.connect(this.ctx.destination); // connect to audio output now that analysis is complete

    return averagedFFT;
  }
}


/**
 * initialize application
 * note: needs to wait for user interaction first due to microphone utilization
 */
function init() {
  const button = document.querySelector('button');
  
  button?.addEventListener('click', function () {
    const audio = new AudioConfig();
  
    const frog = new Frog(audio);
    frogs.push(frog);
  });
}

init();
