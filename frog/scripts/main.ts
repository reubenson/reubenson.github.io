/**
 * This is a browser-based implementation of an art installation by the Dutch sound artist Felix Hess.
 * The first such installation was developed in 1982, and involved developing a set of fifty robots,
 * each outfitted with a microphone, speaker, and circuitry to allow each robot to listen to its environment
 * and make sounds in the manner of a frog in a "frog chorus". Hess' designs for doing so are relatively straightfoward,
 * in which the robot-frog's sounding behavior is predicated on "eagerness" and "shyness". When eagerness is high relative to
 * shyness, the robot will emit a chirping sound, which is then interpreted by the other robots. Each robot will increase its
 * eagerness when it hears another chirp, and will increase its shyness when it hears non-chirping sounds. Through
 * this simple set of rules, a dynamic chorus of sounds emerges, which is highly sensitive to environmental dynamics,
 * much like if one were encountering a group of frogs in the wild.
 * 
 * Some historical documentation can be read here (https://bldgblog.com/2008/04/space-as-a-symphony-of-turning-off-sounds/),
 * but the best resource for understanding Hess' work is his monograph, "Light as Air", published by Kehrer Verlag.
 * 
 * The following implementation utilizes the Web Audio API to make a browser-based translation of Hess' robot-frogs,
 * allowing a set of users in physical, acoustic proximity to have their mobile phones or laptops "sing" to each other
 * as if they were frogs.
 */

import { FFTConvolution } from 'ml-convolution';
import _ from 'lodash';

const DEBUG_MODE = true;
const FFT_SIZE = 256;
const AUDIO_SRC_DIRECTORY = 'https://reubenson.com/frog/audio';

/**
 * initialize application
 * note: needs to wait for user interaction first due to microphone utilization
 */
function startApp() {
  const button = document.querySelector('button');
  const onClick = (button: HTMLButtonElement) => {
    const audio = new AudioConfig();  
    new Frog(audio);
    button.style.opacity = '0';
  };
  
  button?.addEventListener('click', () => onClick(button));
  button?.addEventListener('touchend', () => onClick(button));
}

startApp();

class Frog {
  audioConfig: AudioConfig;
  shyness: number; // 0. - 1.
  eagerness: number; // 0. - 1.
  shynessInterval = 100;
  audioImprint: Float32Array;
  audioElement: HTMLAudioElement;
  isInitialized: boolean;
  fft: FFTConvolution;
  fftNormalizationFactor: number;
  id: number; // id registered with AudioConfig
  lastUpdated: number; // timestamp of last update (ms)
  currentTimestamp: number; // timestamp of current moment (ms)
  matchBaseline: number; // manually-calibrated number used to calculate degree of match between audioImprint and audio input
  sampleDuration: number;

  constructor(audioConfig: AudioConfig) {
    this.audioConfig = audioConfig;
    this.shyness = 1.0; // initiaize to 1 (maximum shyness)
    this.eagerness = 0.0; // initialize to 0 (minimum eagerness)
    this.audioImprint = new Float32Array(FFT_SIZE / 2); // make dynamic
    this.isInitialized = false;
    this.lastUpdated = Date.now();
    this.currentTimestamp = Date.now();
    this.matchBaseline = 1.1; // an emperical value determined by FFT_SIZE and calibrated to taste

    this.audioConfig.register(this);

    this.loadSample();

    this.initialize();
  }


  /**
   * determine length of sample (in seconds)
   * @returns Promise
   */
  async setSampleDuration(): Promise<number> {
    return await new Promise(async resolve => {
      const req = new XMLHttpRequest();
      
      req.open('GET', this.audioElement.src, true);
      req.responseType = 'arraybuffer';
      req.onload = () => {
        const data = req.response;

        this.audioConfig.ctx.decodeAudioData(data, buffer => {
          return resolve(buffer.duration);
        });
      };

      req.send();
    });
  }

  /**
   * calculate the audioImprint, which will be used to compare against realtime audio
   * in order to determine the level of match in the frequency spectrum and calcuate
   * the frog's shyness and eagerness
   */
  async initialize() {
    this.sampleDuration = await this.setSampleDuration();
    log('this.sampleDuration', this.sampleDuration)

    // measure audio imprint (FFT signature) of sample
    this.audioImprint = await this.audioConfig.analyseSample(this.audioElement, this.sampleDuration);
    const maxBefore = this.audioImprint.reduce((item, acc) => Math.max(item, acc), -Infinity);
    const minBefore = this.audioImprint.reduce((item, acc) => Math.min(item, acc), Infinity);
    log('maxbefore', maxBefore);
    log('minbefore', minBefore);
  
    this.audioImprint = processFFT(this.audioImprint);

    log('audioImprint', this.audioImprint);

    this.fft = new FFTConvolution(FFT_SIZE / 2, this.audioImprint.subarray(0, FFT_SIZE / 2 - 1));
    this.isInitialized = true;
    log('frog initialized!', this.audioImprint);

    // evaluate whether to sing or not on every tick
    setInterval(this.trySinging.bind(this), 100);
  }

  /**
   * create audio element
   */
  loadSample() {
    this.audioElement = new Audio();
    // this.audioElement.src = `${AUDIO_SRC_DIRECTORY}/Anaxyrus_punctatus2.mp3`;
    this.audioElement.src = `${AUDIO_SRC_DIRECTORY}/Aneides_lugubris90.mp3`;
    this.audioElement.controls = false;
    this.audioElement.loop = false;
    this.audioElement.autoplay = false;
    this.audioElement.crossOrigin = 'anonymous';
  }

  /**
   * periodically update frog's shyness and eagerness
   */
  updateState(amplitude: number, inputData: Float32Array) {
    this.currentTimestamp = Date.now();

    const conv = this.fft.convolve(inputData);

    // log('inputData', inputData);

    let convolutionSum = conv.reduce((item, acc) => acc + item, 0);
    if (Number.isNaN(convolutionSum)) {
      console.error('convolution sum is NaN');
      convolutionSum = 0;
    }
    log('summ', convolutionSum);
    
    this.updateShyness(amplitude, convolutionSum); // most basic linear implementation
    this.updateEagerness(amplitude, convolutionSum); // most basic linear implementation

    log('shyness', this.shyness);
    log('eagerness', this.eagerness);
    this.lastUpdated = this.currentTimestamp;
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
  updateShyness(amplitude: number, match: number) {
    // increase shyness if the degree of match between its audioImprint and the audio input is low
    const matchDegree = (match - this.matchBaseline) / this.matchBaseline;

    if (matchDegree < 0) {
      const velocity = Math.abs(matchDegree); // needs tweaking
      this.shyness += velocity * this.timeSinceLastUpdate();
    } else {
      // monotonically decrease shyness in the absence
      this.shyness -= 0.1 * this.timeSinceLastUpdate(); // needs tweaking
    }

    this.shyness = Math.max(0, Math.min(1, this.shyness)); // restrict to value between 0 and 1

    return;

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

    this.shyness = Math.max(0, Math.min(1, this.shyness + amplitudeFactor * timeFactor)); // coerce value to range between 0 and 1;
  }

  updateEagerness(amplitude: number, match: number) {
    let magnitude; // measure of degree of match in frog sound compared to audio input
    log('match', match);

    magnitude = 1 + (match - this.matchBaseline) / this.matchBaseline;
    magnitude = Math.max(1, magnitude); // magnitude is fixed to at least 1
    const velocity = magnitude * 0.1; // amount of change in eagerness per second

    // console.log('velocity', velocity);
    this.eagerness += velocity * this.timeSinceLastUpdate();

    // limit eagerness to a max of 1
    this.eagerness = Math.min(1, this.eagerness);
  }

  /**
   * determine time since the last update, in units of seconds
   * @returns number
   */
  timeSinceLastUpdate() {
    return (this.currentTimestamp - this.lastUpdated) / 1000.;
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
   * play audio sample
   */
  playSample() {
    log('croak');
    this.audioElement.play();
    // TODO: while sample is playing, pause any sampling of audio so the frog does not listen to itself
  }

  /**
   * as the frog detects other frogs, it will be emboldened to sing more loudly and frequently
   */
  trySinging() {
    if (this.eagerness > this.shyness || this.eagerness === 1) {
      this.playSample();

      // reset eagerness to 0 so that the frog does not immediately sing at the next invocation
      this.eagerness = 0;
    }
  }
}

/**
 * the AudioConfig class is responsible for managing audio input and output
 */
class AudioConfig {
  analyser: AnalyserNode;
  ctx: AudioContext;
  deviceId: string;
  groupId: string;
  inputSamplingInterval = 50; // time (ms) between FFT analysis events
  idCounter = 0; // tracks with global frogs array
  minimumAmplitude = 0;
  frogs: Array<Frog>;

  constructor() {
    this.frogs = [];
    // this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = new (window.AudioContext);
    this.setInputDeviceId()
      .then(this.initializeAudio.bind(this));
  }

  /**
   * populate array of frogs that have been initalized
   * @param frog
   */
  register(frog: Frog) {
    this.frogs.push(frog);
  }

  /**
   * determine the audio input device id
   * @returns Promise
   */
  setInputDeviceId() {
    return navigator.mediaDevices.enumerateDevices()
      .then(devices => {
        const audioInputDevices = devices.filter(device => device.kind === 'audioinput');
        const audioInputDevice = audioInputDevices[0];

        if (!audioInputDevice) {
          console.error('no audio input device found');
          return;
        } else if (audioInputDevices.length > 1) {
          console.warn(`multiple audio devices found - selecting ${audioInputDevice}`);
        }

        this.deviceId = audioInputDevice.deviceId;
        this.groupId = audioInputDevice.groupId;
    });
  }

  /**
   * connect audio input to webAudio analyser and set up
   * an interval timer to measure FFT of realtime audio
   */
  initializeAudio() {
    var ctx = this.ctx;
    let constraints = {audio: {}};
    if (this.deviceId)
      constraints.audio = {deviceId: {exact: this.deviceId}};
    else if (this.groupId)
      constraints.audio = {groupId: {exact: this.groupId}};
  
    navigator.mediaDevices.getUserMedia(constraints)
      .then((stream: any) => {
        const input = ctx.createMediaStreamSource(stream);
        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = FFT_SIZE;
        this.analyser.smoothingTimeConstant = 0.8;
        this.analyser.maxDecibels = -30;
        input.connect(this.analyser);

        setInterval(this.updateFrogs.bind(this), this.inputSamplingInterval);
      })
      .catch(function(error){
        console.error('Error initializing audio input', error.message);
      });
  }

  /**
   * measure FFT from audio input and update the state of each frog
   */
  updateFrogs() {
    const data = new Float32Array(FFT_SIZE / 2);
    this.analyser.getFloatFrequencyData(data);

    const amplitude = calculateAmplitude(data);
    
    // establish a baseline value for the minimum amplitude signal
    this.minimumAmplitude = Math.min(this.minimumAmplitude, amplitude);

    this.frogs.forEach(frog => {
      frog.updateState(amplitude, processFFT(data));
    });
  }

  /**
   * analyze incoming audio and generate an FFT signature to be used
   * to compare against other signals
   * Note: see https://stackoverflow.com/questions/14169317/interpreting-web-audio-api-fft-results
   * @param audio AudioElement
   * @param duration number (seconds)
   * @returns Float32Array
   */
  async analyseSample(audio: HTMLAudioElement, duration: number): Promise<Float32Array> {
    const sourceNode = this.ctx.createMediaElementSource(audio);
    
    //Create analyser node
    const analyserNode = this.ctx.createAnalyser();
    analyserNode.fftSize = FFT_SIZE;
    analyserNode.smoothingTimeConstant = 0.97; // this can be tweaked
    analyserNode.maxDecibels = -30;

    // function iterate(numberOfSteps: number, result: Float32Array) {
    //   analyserNode.getFloatFrequencyData(dataArray);

    //   dataArray.forEach((value, index) => {
    //     averagedFFT[index] = value;
    //     // result[index] += value === -Infinity ? -Infinity : value * 1.0 / numberOfSteps;
    //   });
    // return averagedFFT;
    // }

    // async function getAveragedFFT(): Promise<Float32Array> {
      // const numberOfSteps = 20;
      // const intervalLength = Math.floor(duration * 1000 / numberOfSteps);
      // let stepCount = 0;

      // console.log('intervalLength', intervalLength);

      // return await new Promise(async resolve => {
      //   while (stepCount < numberOfSteps) {
      //     // TODO: simplify average FFT calculation since smoothing automatically accounts for this, sort of
      //     // averagedFFT = iterate(numberOfSteps, averagedFFT);
      //     analyserNode.getFloatFrequencyData(dataArray);

      //     // dataArray.forEach((value, index) => {
      //     //   averagedFFT[index] = value;
      //     //   // result[index] += value === -Infinity ? -Infinity : value * 1.0 / numberOfSteps;
      //     // });
      //     await new Promise(resolve => setTimeout(resolve, intervalLength));
      //     stepCount++;
      //   }

      //   audio.pause();
      //   resolve(dataArray);
      // });
    // }
    
    //Set up audio node network
    sourceNode.connect(analyserNode);
    // analyserNode.connect(this.ctx.destination); // uncomment to debug
    
    audio.loop = true;
    audio.play();

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    const numberOfSteps = 20;
    const intervalLength = Math.floor(duration * 1000 / numberOfSteps);
    let stepCount = 0;

    return await new Promise(async resolve => {
      while (stepCount < numberOfSteps) {
        // TODO: simplify average FFT calculation since smoothing automatically accounts for this, sort of
        // averagedFFT = iterate(numberOfSteps, averagedFFT);
        await new Promise(resolve => setTimeout(resolve, intervalLength));
        analyserNode.getFloatFrequencyData(dataArray);

        // dataArray.forEach((value, index) => {
        //   averagedFFT[index] = value;
        //   // result[index] += value === -Infinity ? -Infinity : value * 1.0 / numberOfSteps;
        // });
        stepCount++;
      }

      if (_.max(dataArray) === -Infinity)
        console.warn(`issue occurred analysing sample on step ${stepCount}`);

      audio.pause();
      resolve(dataArray);
    });
  }
}

// putting some general utility functions down here

/**
 * wrapper function around console.log
 * @param message string
 * @param additionalMessage string
 */
function log(message: string, additionalMessage?: any) {
  if (DEBUG_MODE) {
    console.log(message, additionalMessage || '');
  }
}

/**
 * calculate the total amplitude of the input FFT
 * @param data FFT array
 * @returns number
 */
function calculateAmplitude(data: Float32Array) {
  const fftSum = _.sum(_.map(data, item => {
    return Math.pow(10, item);
  }));

  log('fftSum', fftSum);

  return Math.log10(fftSum); // convert back to log decibel scale;
}

function processFFT(data: Float32Array) {
  const max = data.reduce((item, acc) => Math.max(item, acc), -Infinity);

  return data.map(item => Math.pow(10, item - max)); // normalize to 0->1
}
