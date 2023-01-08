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

const FFT_SIZE = 256;
const frogs: Frog[] = [];
const AUDIO_SRC_DIRECTORY = 'https://reubenson.com/frog/audio';

/**
 * initialize application
 * note: needs to wait for user interaction first due to microphone utilization
 */
function startApp() {
  const button = document.querySelector('button');
  
  button?.addEventListener('click', function () {
    const audio = new AudioConfig();
  
    const frog = new Frog(audio);
    frogs.push(frog);

    button.style.opacity = '0';
  });
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
  currentTimestamp: number // timestamp of current moment (ms)
  matchBaseline: number // manually-calibrated number used to calculate degree of match between audioImprint and audio input

  constructor(audioConfig: AudioConfig) {
    this.audioConfig = audioConfig;
    this.shyness = 1.0; // initiaize to 1 (maximum shyness)
    this.eagerness = 0.0; // initialize to 0 (minimum eagerness)
    this.audioImprint = new Float32Array(FFT_SIZE / 2); // make dynamic
    this.isInitialized = false;
    this.lastUpdated = Date.now();
    this.currentTimestamp = Date.now();
    this.matchBaseline = 1.1; // an emperical value determined by FFT_SIZE and calibrated to taste
    this.id = this.audioConfig.register(this);

    this.loadSample();

    this.initialize();
      }

  async initialize() {
    let result = new Float32Array(FFT_SIZE / 2);

    // measure audio imprint (FFT signature) of sample
    this.audioImprint = await this.audioConfig.analyseSample(this.id, this.audioElement, result);
    const maxBefore = result.reduce((item, acc) => Math.max(item, acc), -Infinity);
    const minBefore = result.reduce((item, acc) => Math.min(item, acc), Infinity);
    console.log('maxbefore', maxBefore);
    console.log('minbefore', minBefore);
  
    this.audioImprint = processFFT(this.audioImprint);

    console.log('audioImprint', this.audioImprint);

    this.fft = new FFTConvolution(FFT_SIZE / 2, this.audioImprint.subarray(0, FFT_SIZE / 2 - 1));
    this.isInitialized = true;
    console.log('frog initialized!', this.audioImprint);

    // evaluate whether to sing or not on every tick
    setInterval(this.trySinging, 100);
  }

  /**
   * create audio element
   */
  loadSample() {
    this.audioElement = new Audio();
    // this.audioElement.src = `#{AUDIO_SRC_DIRECTORY}/Anaxyrus_punctatus2.mp3`;
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

    // console.log('inputData', inputData);

    let convolutionSum = conv.reduce((item, acc) => acc + item, 0);
    if (Number.isNaN(convolutionSum)) {
      console.error('convolution sum is NaN');
      convolutionSum = 0;
    }
    console.log('summ', convolutionSum);
    
    this.updateShyness(amplitude, convolutionSum); // most basic linear implementation
    this.updateEagerness(amplitude, convolutionSum); // most basic linear implementation

    console.log('shyness', this.shyness);
    console.log('eagerness', this.eagerness);
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
    console.log('match', match);

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
    console.log('croak');
    this.audioElement.play();
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
    // this.setTimeout();
  }
}

class AudioConfig {
  analyser: AnalyserNode;
  ctx: AudioContext;
  deviceId: string;
  groupId: string;
  inputSamplingInterval = 50; // time (ms) between FFT analysis events
  idCounter = 0; // tracks with global frogs array
  minimumAmplitude = 0;

  constructor() {
    // this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = new (window.AudioContext);
    this.setDeviceId()
      .then(() => this.initializeAudio);
  }

  register(listener: Frog) {
    const id = this.idCounter;
    
    this.idCounter++;

    return id;
  }

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
        this.analyser.fftSize = FFT_SIZE;
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
    const data = new Float32Array(FFT_SIZE / 2);
    this.analyser.getFloatFrequencyData(data);

    const amplitude = calculateAmplitude(data);
    
    // establish a baseline value for the minimum amplitude signal
    this.minimumAmplitude = Math.min(this.minimumAmplitude, amplitude);

    frogs.forEach(frog => {
      frog.updateState(amplitude, processFFT(data));
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
    analyserNode.fftSize = FFT_SIZE;
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
