import { FFTConvolution } from 'ml-convolution';
import type { AudioConfig } from './AudioManager';
import { DEBUG_ON, FFT_SIZE, inputSamplingInterval, inputSourceNode } from './store';
import { log, processFFT, calculateAmplitude, drawFFT } from './utils';

let idCounter = 0;

/**
 * This class registers itself with an instance of AudioConfig, and encapsulates the frog-like behavior
 * of a single agent. Multiple frogs may run on a single device, but the intent is to only have one
 * instatiated per device, and to iteract with other a frog running on another device within
 * acoustic proximity
 */
export class Frog {
  id: number;
  audioFilename: string;
  audioConfig: AudioConfig;
  shyness: number; // 0. - 1.
  eagerness: number; // 0. - 1.
  audioImprint: Float32Array;
  inputFFT: Float32Array;
  audioElement: HTMLAudioElement;
  fft: FFTConvolution;
  fftNormalizationFactor: number;
  lastUpdated: number;
  currentTimestamp: number;
  matchBaseline: number; // used to calculate degree of match between audioImprint and audio input
  rateOfStateChange: number; // manually-calibrated value used to determine rate of change in eagerness and shyness
  sampleDuration: number;
  amplitudeThreshold: number; // relative threshold between a quiet vs noisy environment
  hasInitialized: boolean;
  inputAnalyzer: AnalyserNode;
  amplitude: number;

  constructor(audioConfig: AudioConfig, audioFilename: string) {
    this.id = ++idCounter;
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
    this.hasInitialized = false;
    this.inputAnalyzer = null;
    // this.inputAnalyzer = this.createAnalyzer();

    this.audioConfig.register(this);
    this.loadSample();
    // this.initialize();
  }

  private createAnalyzer() {
    // create analyser node
    const analyserNode = this.audioConfig.ctx.createAnalyser();

    analyserNode.fftSize = FFT_SIZE;
    analyserNode.smoothingTimeConstant = 0.97; // this can be tweaked

    // set up audio node network
    inputSourceNode.connect(analyserNode);

    return analyserNode;
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
  public async initialize() {
    const attemptRate = 100; // evaluate whether to try singing every 100 ms
    const highpassFilter = this.audioConfig.ctx.createBiquadFilter();
    const lowpassFilter = this.audioConfig.ctx.createBiquadFilter();

    this.sampleDuration = await this.setSampleDuration();
    log('this.sampleDuration', this.sampleDuration);

    // measure audio imprint (FFT signature) of sample
    const sourceNode = this.audioConfig.ctx.createMediaElementSource(this.audioElement);

    // set up audio node network
    sourceNode.connect(highpassFilter);
    highpassFilter.connect(lowpassFilter);
    // lowpassFilter.connect(analyserNode);

    // configure filter units
    // TODO: what is typical frqeuency range of interest for frogs?
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 3000;
    highpassFilter.Q.value = 1;
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = 1000;
    lowpassFilter.Q.value = 10;

    this.audioImprint = await this.audioConfig.analyseSample(this.audioElement, lowpassFilter, this.sampleDuration);
    const maxBefore = this.audioImprint.reduce((item, acc) => Math.max(item, acc), -Infinity);
    const minBefore = this.audioImprint.reduce((item, acc) => Math.min(item, acc), Infinity);

    log('maxbefore', maxBefore);
    log('minbefore', minBefore);

    // this.audioImprint = processFFT(this.audioImprint, { normalize: true });

    // log('audioImprint', this.audioImprint);

    this.fft = new FFTConvolution(FFT_SIZE / 2, this.audioImprint.subarray(0, FFT_SIZE / 2 - 1));

    // connect audio to destination device
    lowpassFilter.connect(this.audioConfig.ctx.destination); // uncomment to debug move elsewhere

    // set up input analyzer
    this.inputAnalyzer = this.createAnalyzer();

    // evaluate whether to sing or not on every tick
    setInterval(this.trySinging.bind(this), attemptRate);

    this.hasInitialized = true;
    // console.log('frog here', this);

    // set up timer to regularly update frog's state
    // setInterval(this.updateState.bind(this), inputSamplingInterval);

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

  private analyzeInputSignal() {
    const data = new Float32Array(FFT_SIZE / 2);

    this.inputAnalyzer.getFloatFrequencyData(data);

    // if (DEBUG_ON) drawFFT(data, )

    const amplitude = calculateAmplitude(data);

    this.amplitude = amplitude;

    return { amplitude, fftData: data };
  }

  /**
   * Periodically update frog's shyness and eagerness
   *   - Prominence in frog signal will decrease shyness (shyness is inversely proportional to frog signal match)
   *   - Prominence in loudness in non-frog spectrum will increase shyness (shyness is proportional to amplitude)
   *   - Sudden non-frog signal with absence of frog spectrum will rapidly induce shyness
   */
  // public updateState(amplitude: number, inputData: Float32Array) {
  public updateState() {
    console.log('here', this);
    if (!this.hasInitialized) return;

    const { amplitude, fftData } = this.analyzeInputSignal();

    this.currentTimestamp = Date.now();

    const conv = this.fft.convolve(fftData);

    let convolutionSum = Math.log10(conv.reduce((item, acc) => acc + item, 0));

    if (Number.isNaN(convolutionSum)) {
      console.error('convolution sum is NaN');
      convolutionSum = 0;
    }

    log('convolution sum:', convolutionSum);
    // log('amplitude:', amplitude);

    this.updateShyness(amplitude, convolutionSum);
    this.updateEagerness(amplitude, convolutionSum);
    this.inputFFT = fftData;

    // log('shyness', this.shyness);
    // log('eagerness', this.eagerness);

    // temp: figure out where to add this UI
    // if (DEBUG_ON) {
    //   if (SHYNESS_ELEMENT) SHYNESS_ELEMENT.innerHTML = `${_.round(this.shyness, 2)}`;
    //   if (EAGERNESS_ELEMENT) EAGERNESS_ELEMENT.innerHTML = `${_.round(this.eagerness, 2)}`;
    //   if (AMPLITUDE_ELEMENT) AMPLITUDE_ELEMENT.innerHTML = `${_.round(amplitude, 2)}`;
    // }

    this.lastUpdated = this.currentTimestamp;

    // update state properties exposed to Svelte component

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
