/**
 * This is a browser-based implementation of an art installation by the Dutch sound artist Felix Hess.
 * The first such installation was developed in 1982, and involved developing a set of fifty robots,
 * each outfitted with a microphone, speaker, and circuitry to allow each robot to listen to its environment
 * and make sounds in the manner of a frog in a frog chorus. Hess' designs for doing so are relatively straightfoward,
 * in which the robot-frog's sounding behavior is predicated on "eagerness" and "shyness". 
 * 
 * When eagerness is high relative to shyness, the robot will emit a chirping sound, which is then "heard" by the other 
 * robots. Each robot  will increase its eagerness when it hears another's chirp, and will increase its shyness when it 
 * hears non-chirping sounds. Through this simple set of rules, a dynamic chorus of sounds emerges, which is highly 
 * sensitive to environmental dynamics, much like if one were encountering a group of frogs in the wild.
 * 
 * Some historical documentation can be read here (https://bldgblog.com/2008/04/space-as-a-symphony-of-turning-off-sounds/),
 * but the best resource for understanding Hess' work is his monograph, 'Light as Air', published by Kehrer Verlag.
 * 
 * The following implementation utilizes the Web Audio API to make a browser-based translation of Hess' robot-frogs,
 * allowing a set of users in physical, acoustic proximity to have their mobile devices "sing" to each other
 * as if they were frogs. The implementation of "hearing" is predicated here on relatively unsophisticated FFT (fast 
 * fourier transform) analysis via the [Web Audio AnalyserNode](https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode).
 * 
 * To see a diagram of the general data flow, see https://reubenson.com/frog/frog-diagram.png
 * graph TD
    A(Audio from microphone) -->|Periodically sample audio| B(Calculate audio frequency distribution)
    B -->|Calculate degree of mismatch| D(Update shyness)
    B -->|Calculate degree of match| E(Update eagerness)
    D --> F(Compare shyness and eagerness)
    E --> F
    F --> |If eagerness exceeds shyness| G(Make sound)
    F --> |Else| H(Remain silent)
    G --> I(Reset eagerness to 0)
    H --> J(Reduce shyness)
 */

import _ from 'lodash';
import { FFTConvolution } from 'ml-convolution';

const PRINT_LOGS = true;
const FFT_SIZE = 256;
const AUDIO_SRC_DIRECTORY = 'https://reubenson.com/frog/audio';
const AUDIO_FILES = ['Aneides_lugubris90.mp3', 'Anaxyrus_punctatus2.mp3'];

/**
 * Initialize application
 * note: needs to wait for user interaction first due to microphone utilization
 */
function startApp() {
  let hasInitialized = false;
  const button = document.querySelector('button');
  const onClick = (button: HTMLButtonElement) => {
    if (hasInitialized) return;

    const audio = new AudioConfig();

    new Frog(audio, `${AUDIO_SRC_DIRECTORY}/${AUDIO_FILES[0]}`);
    button.style.opacity = '0';
    hasInitialized = true;
  };

  button?.addEventListener('click', () => onClick(button));
  button?.addEventListener('touchend', () => onClick(button));
}

startApp();

/**
 * This class registers itself with an instance of AudioConfig, and encapsulates the frog-like behavior
 * of a single agent. Multiple frogs may run on a single device, but the intent is to only have one
 * instatiated per device, and to iteract with other a frog running on another device within
 * acoustic proximity
 */
class Frog {
  audioFilename: string;
  audioConfig: AudioConfig;
  shyness: number; // 0. - 1.
  eagerness: number; // 0. - 1.
  audioImprint: Float32Array;
  audioElement: HTMLAudioElement;
  fft: FFTConvolution;
  fftNormalizationFactor: number;
  lastUpdated: number;
  currentTimestamp: number;
  matchBaseline: number; // used to calculate degree of match between audioImprint and audio input
  rateOfStateChange: number; // manually-calibrated value used to determine rate of change in eagerness and shyness
  sampleDuration: number;
  amplitudeThreshold: number; // relative threshold between a quiet vs noisy environment

  constructor(audioConfig: AudioConfig, audioFilename: string) {
    this.audioConfig = audioConfig;
    this.audioFilename = audioFilename;
    this.shyness = 1.0; // initiaize to 1 (maximum shyness)
    this.eagerness = 0.0; // initialize to 0 (minimum eagerness)
    this.audioImprint = new Float32Array(FFT_SIZE / 2);
    this.lastUpdated = Date.now();
    this.currentTimestamp = Date.now();
    this.matchBaseline = -30; // an emperical value, calibrated to taste
    this.rateOfStateChange = 2.0; // to be tweaked
    this.amplitudeThreshold = -45; // to be tweaked

    this.audioConfig.register(this);
    this.loadSample();
    this.initialize();
  }

  /**
   * Determine length of audio sample, in seconds
   * @returns Promise
   */
  private async setSampleDuration(): Promise<number> {
    return await new Promise(resolve => {
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
   * Calculate the audioImprint, which will be used to compare against the microphone's audio
   * feed in order to determine the level of match in the frequency spectrum and thereby calcuate
   * the frog's shyness and eagerness
   */
  private async initialize() {
    const attemptRate = 100; // evaluate whether to try singing every 100 ms

    this.sampleDuration = await this.setSampleDuration();
    log('this.sampleDuration', this.sampleDuration);

    // measure audio imprint (FFT signature) of sample
    const sourceNode = this.audioConfig.ctx.createMediaElementSource(this.audioElement);

    this.audioImprint = await this.audioConfig.analyseSample(this.audioElement, sourceNode, this.sampleDuration);
    const maxBefore = this.audioImprint.reduce((item, acc) => Math.max(item, acc), -Infinity);
    const minBefore = this.audioImprint.reduce((item, acc) => Math.min(item, acc), Infinity);

    log('maxbefore', maxBefore);
    log('minbefore', minBefore);

    this.audioImprint = processFFT(this.audioImprint, { normalize: true });

    log('audioImprint', this.audioImprint);

    this.fft = new FFTConvolution(FFT_SIZE / 2, this.audioImprint.subarray(0, FFT_SIZE / 2 - 1));

    // connect audio to destination device
    sourceNode.connect(this.audioConfig.ctx.destination); // uncomment to debug move elsewhere

    // evaluate whether to sing or not on every tick
    setInterval(this.trySinging.bind(this), attemptRate);

    log('frog initialized!', this);
  }

  /**
   * Create audio element
   * This is the audio sample that will be play when the frog 'sings'
   */
  private loadSample() {
    this.audioElement = new Audio();
    this.audioElement.src = this.audioFilename;
    this.audioElement.controls = false;
    this.audioElement.loop = false;
    this.audioElement.autoplay = false;
    this.audioElement.crossOrigin = 'anonymous';
  }

  /**
   * Periodically update frog's shyness and eagerness
   *   - Prominence in frog signal will decrease shyness (shyness is inversely proportional to frog signal match)
   *   - Prominence in loudness in non-frog spectrum will increase shyness (shyness is proportional to amplitude)
   *   - Sudden non-frog signal with absence of frog spectrum will rapidly induce shyness
   */
  public updateState(amplitude: number, inputData: Float32Array) {
    this.currentTimestamp = Date.now();

    const conv = this.fft.convolve(inputData);

    log('inputData', inputData);

    let convolutionSum = Math.log10(conv.reduce((item, acc) => acc + item, 0));

    if (Number.isNaN(convolutionSum)) {
      console.error('convolution sum is NaN');
      convolutionSum = 0;
    }

    log('convolution sum:', convolutionSum);
    log('amplitude:', amplitude);

    this.updateShyness(amplitude, convolutionSum);
    this.updateEagerness(amplitude, convolutionSum);

    log('shyness', this.shyness);
    log('eagerness', this.eagerness);
    this.lastUpdated = this.currentTimestamp;
  }

  /**
   * Shyness: the aversion of the frog to make a sound
   * Calculate and set shyness based on a sum of the convolution between the audioImprint
   * and the incoming audio
   * @param amplitude - input (mic) signal amplitude
   * @param match - input signal match (with frog)
   * @returns number
   */
  private updateShyness(amplitude: number, match: number) {
    const rateOfLosingShyness = 0.1; // tweak
    const amplitudeFactor = 1;
    const matchFactor = 1;
    const relativeAmplitude = (amplitudeFactor * amplitude) / this.amplitudeThreshold;
    const relativeMatch = (matchFactor * match) / this.matchBaseline;

    if (amplitude < this.amplitudeThreshold) {
      // monotonically decrease shyness if the environment is quiet
      this.shyness -= rateOfLosingShyness * this.timeSinceLastUpdate();
    } else {
      // increase shyness if the degree of match between its audioImprint and the audio input is low
      // and if the environment is loud
      // has lower value if matchDegree is high and ampltiude is relatively low
      // has a higher value if matchDegree is low and amplitude is high
      const velocity = (1 / relativeMatch) * relativeAmplitude * this.rateOfStateChange;

      this.shyness += velocity * this.timeSinceLastUpdate();
    }

    this.shyness = Math.max(0, Math.min(1, this.shyness)); // restrict to value between 0 and 1

    return;
  }

  /**
   * Eagerness: the tendency of the frog to make a sound
   * Calculate and set eagerness based on a sum of the convolution between the audioImprint
   * and the incoming audio
   * @param amplitude - input audio amplitude
   * @param match - degree of match between audioImprint and input audio
   */
  private updateEagerness(amplitude: number, match: number) {
    let magnitude; // measure of degree of match in frog sound compared to audio input

    if (amplitude < this.amplitudeThreshold) {
      // increase eagerness if the environment is quiet
      magnitude = 1 + (match - this.matchBaseline) / Math.abs(this.matchBaseline);
      magnitude = Math.max(0.1, magnitude); // magnitude is fixed to at least 0.1
      const velocity = magnitude * 0.1 * this.rateOfStateChange; // amount of change in eagerness per second

      this.eagerness += velocity * this.timeSinceLastUpdate();
    } else {
      // do nothing; shyness will increase if the environment is loud
      // eagerness will only monotonically increase, and not decrease
    }

    // limit eagerness to a max of 1
    this.eagerness = Math.min(1, this.eagerness);
  }

  /**
   * Calculate time since the last state update, in units of seconds
   * @returns number
   */
  private timeSinceLastUpdate() {
    return (this.currentTimestamp - this.lastUpdated) / 1000;
  }

  /**
   * Play audio sample
   */
  private playSample() {
    log('croak');
    this.audioElement.play();
    // TODO: while sample is playing, pause any sampling of audio so the frog does not listen to itself
  }

  /**
   * Determine whether the frog should sing, or not
   */
  private trySinging(simplifiedModel = false) {
    let shouldSing;

    if (simplifiedModel) {
      shouldSing = this.eagerness > 0.99999; // simplified model
    } else {
      shouldSing = this.eagerness > Math.max(0.5, this.shyness) || this.eagerness > 0.999;
    }

    if (shouldSing) {
      this.playSample();

      // reset eagerness to 0 so that the frog does not immediately sing at the next invocation
      this.eagerness = 0;
    }
  }
}

/**
 * The AudioConfig class is responsible for managing audio input and output devices
 */
class AudioConfig {
  analyser: AnalyserNode;
  ctx: AudioContext;
  deviceId: string;
  groupId: string;
  inputSamplingInterval = 50; // time (ms) between FFT analysis events
  frogs: Array<Frog>;

  constructor() {
    this.frogs = [];
    (window as any).AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContext();
    this.setInputDeviceId().then(this.initializeAudio.bind(this));
  }

  /**
   * Populate array of frogs that have been initalized
   * @param frog - instance of Frog class
   */
  public register(frog: Frog) {
    this.frogs.push(frog);
  }

  /**
   * Determine the audio input device id
   * @returns Promise
   */
  private setInputDeviceId() {
    return navigator.mediaDevices.enumerateDevices().then(devices => {
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
   * Connect audio input to webAudio analyser and set up
   * an interval timer to measure FFT of realtime audio
   */
  private initializeAudio() {
    const ctx = this.ctx;
    const constraints = { audio: {} };

    if (this.deviceId) constraints.audio = { deviceId: { exact: this.deviceId } };
    else if (this.groupId) constraints.audio = { groupId: { exact: this.groupId } };

    navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream: any) => {
        const input = ctx.createMediaStreamSource(stream);

        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = FFT_SIZE;
        this.analyser.smoothingTimeConstant = 0.8; // to be tweaked
        input.connect(this.analyser);

        setInterval(this.updateFrogs.bind(this), this.inputSamplingInterval);
      })
      .catch(function (error) {
        console.error('Error initializing audio input', error.message);
      });
  }

  /**
   * Measure FFT from audio input and update the state of each frog
   */
  private updateFrogs() {
    const data = new Float32Array(FFT_SIZE / 2);

    this.analyser.getFloatFrequencyData(data);

    const amplitude = calculateAmplitude(data);

    this.frogs.forEach(frog => {
      frog.updateState(amplitude, processFFT(data, { normalize: false }));
    });
  }

  /**
   * Analyze incoming audio and generate an FFT signature to be used
   * to compare against other signals
   * Note: see https://stackoverflow.com/questions/14169317/interpreting-web-audio-api-fft-results
   * @param audio - audio elemnt with src to be analysed
   * @param sourceNode - source node corresponding to audio
   * @param duration - audio sample duration (seconds)
   * @returns Float32Array
   */
  public async analyseSample(
    audio: HTMLAudioElement,
    sourceNode: MediaElementAudioSourceNode,
    duration: number
  ): Promise<Float32Array> {
    // create analyser node
    const analyserNode = this.ctx.createAnalyser();

    analyserNode.fftSize = FFT_SIZE;
    analyserNode.smoothingTimeConstant = 0.97; // this can be tweaked

    // set up audio node network
    sourceNode.connect(analyserNode);

    // measure the FFT of the audio sample n times, at equal time intervals across the duration of the sample
    const bufferLength = analyserNode.frequencyBinCount;
    const fft = new Float32Array(bufferLength);
    const numberOfSteps = 20; // can be tweaked
    const intervalLength = Math.floor((duration * 1000) / numberOfSteps);

    audio.play();
    for (let index = 0; index < numberOfSteps; index++) {
      await new Promise(resolve => setTimeout(resolve, intervalLength));
      analyserNode.getFloatFrequencyData(fft);

      if (_.max(fft) === -Infinity) console.warn(`issue occurred analysing sample on step ${index}`);
    }

    return fft;
  }
}

/**
 * Putting some general utility functions down here
 */

/**
 * Wrapper function around console.log
 * @param message - first string
 * @param additionalMessage - optional string
 */
function log(message: string, additionalMessage?: any) {
  if (PRINT_LOGS) {
    console.log(message, additionalMessage || '');
  }
}

/**
 * Calculate the total amplitude of the input FFT
 * @param data - fft array
 * @returns number
 */
function calculateAmplitude(data: Float32Array) {
  const fftSum = _.sum(_.map(data, item => Math.pow(10, item)));

  return Math.log10(fftSum); // convert back to log decibel scale;
}

/**
 * Normalize FFT and translate from logarithmic to linear scale
 * @param data - FFT array
 * @param opts - options
 * @returns array
 */
function processFFT(data: Float32Array, opts: { normalize: boolean }) {
  const { normalize } = opts;

  // default to normalizing to -30 db
  const max = normalize ? _.max(data) || -30 : -30;

  return data.map(item => Math.pow(10, item - max));
}
