/**
 * This file exports a single class (Frog), which is intended to be used in a browser-based translation of a historic art installation by the Dutch sound artist Felix Hess.
 * 
 * [Provide TLDR? And notes on what to work on during pairing session]
 *
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
 * but the best resource for understanding Hess' work is his monograph, 'Light as Air', published by Kehrer Verlag,
 * as well as an artist talk from the 2010s on [YouTube](https://www.youtube.com/watch?v=rMnFKYHzm2k).
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

 * The class exported in this file encapsulates the frog-like behavior
 * modeled in this application, irrespective of the web application it is embedded in, or the audio class dependency imported in this file. Multiple instances of frogs may run within the runtime
 * environment on a single device, but the intent is to only have one
 * instatiated per device, and to iteract with other frogs running on other devices
 * within acoustic proximity
 */

import _ from 'lodash';
import { FFTConvolution } from 'ml-convolution';
import type { AudioConfig } from './AudioManager';
import { DEBUG_ON, FFT_SIZE, inputSamplingInterval, inputSourceNode, inputSourceNode2 } from './store';
import { log, processFFT, calculateAmplitude, logMinMax, linearToLog } from './utils';

let idCounter = 0;

export class Frog {
  id: number;
  audioFilepath: string;
  audioConfig: AudioConfig;
  shyness: number; // 0. - 1.
  eagerness: number; // 0. - 1.
  audioImprint: Float32Array;
  inputFFT: Float32Array;
  convolutionResult: Float32Array;
  diffFFT: Float32Array;
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
  inputAnalyser: AnalyserNode;
  directInputAnalyser: AnalyserNode;
  amplitude: number;
  convolver: ConvolverNode;

  constructor(audioConfig: AudioConfig, audioFilepath: string) {
    this.id = ++idCounter;
    this.audioConfig = audioConfig;
    this.audioFilepath = audioFilepath;
    this.shyness = 1.0; // initiaize to 1 (maximum shyness)
    this.eagerness = 0.0; // initialize to 0 (minimum eagerness)
    this.audioImprint = new Float32Array(FFT_SIZE / 2);
    this.lastUpdated = Date.now();
    this.currentTimestamp = Date.now();
    this.matchBaseline = -30; // an emperical value, calibrated to taste
    this.rateOfStateChange = 2.0; // to be tweaked
    this.amplitudeThreshold = -45; // to be tweaked
    this.hasInitialized = false;
    this.inputAnalyser = null;
    this.directInputAnalyser = null;
    this.convolver = null;
    this.loadSample();
  }

  // experimenting with different option, to convolve audio input directly
  private async setAnalyserReverb() {
    this.convolver = this.audioConfig.ctx.createConvolver();
    this.convolver.normalize = true;

    // load impulse response from file
    const response = await fetch(this.audioFilepath);
    const arraybuffer = await response.arrayBuffer();

    console.log('response', response);
    // log error if response is not valid

    this.convolver.buffer = await this.audioConfig.ctx.decodeAudioData(arraybuffer);
    console.log('arraybuff', arraybuffer);
    console.log('this.convolver.buffer', this.convolver.buffer);
    console.log('this.audioFilepath', this.audioFilepath);

    // connect convolver to analyser signal path
    const testfilter = false;

    this.inputAnalyser = this.audioConfig.ctx.createAnalyser();
    this.inputAnalyser.fftSize = FFT_SIZE;
    this.inputAnalyser.smoothingTimeConstant = 0.8; // this can be tweaked

    // create a second analyser, for unprocessed input
    this.directInputAnalyser = this.audioConfig.ctx.createAnalyser();
    this.directInputAnalyser.fftSize = FFT_SIZE;
    this.directInputAnalyser.smoothingTimeConstant = 0.8; // this can be tweaked

    console.log('conv input', this.inputAnalyser);
    console.log('direct input', this.directInputAnalyser);

    if (testfilter) {
      const filter = this.audioConfig.ctx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.value = 1000;
      filter.Q.value = 10;

      inputSourceNode.connect(filter);
      filter.connect(this.convolver);
      this.convolver.connect(this.inputAnalyser);
    } else {
      // inputSourceNode.connect(this.inputAnalyser);
      inputSourceNode.connect(this.convolver);
      this.convolver.connect(this.inputAnalyser);

      // connect to second analyser
      inputSourceNode.connect(this.directInputAnalyser);
      // console.log('first source node', inputSourceNode);
      // console.log('second source node', inputSourceNode2);

      // this.convolver.disconnect();
      // inputSourceNode2.disconnect();

      // connect input to analyser directly
      // inputSourceNode.connect(this.inputAnalyser);
    }

    // temporarily wire input through convolver to output
    // this.inputAnalyser.connect(this.audioConfig.ctx.destination);
  }

  /**
   * construct and configure the analyser node, to be used to analyse the audio spectra of the microphone input
   */
  private setAnalyser() {
    // create analyser node
    const analyserNode = this.audioConfig.ctx.createAnalyser();

    analyserNode.fftSize = FFT_SIZE;
    analyserNode.smoothingTimeConstant = 0.97; // this can be tweaked

    // set up audio node network
    const testfilter = true;

    if (testfilter) {
      const filter = this.audioConfig.ctx.createBiquadFilter();

      filter.type = 'highpass';
      filter.frequency.value = 4000;
      filter.Q.value = 100;

      inputSourceNode.connect(filter);
      filter.connect(analyserNode);
    } else {
      inputSourceNode.connect(analyserNode);
    }

    // set up input analyser, for listening
    this.inputAnalyser = analyserNode;
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
          this.sampleDuration = buffer.duration;
          log('Sample Duration:', this.sampleDuration);
          resolve(null);
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

    await this.setSampleDuration();

    // measure audio imprint (FFT signature) of sample
    const frogSourceNode = this.audioConfig.ctx.createMediaElementSource(this.audioElement);

    // set up audio node network
    frogSourceNode.connect(highpassFilter);
    highpassFilter.connect(lowpassFilter);

    // configure filter units
    // frogs generally seem to be listening around 3kHz
    // ref: https://www.sonova.com/en/story/frogs-hearing-no-ears
    highpassFilter.type = 'highpass';
    highpassFilter.frequency.value = 2000;
    highpassFilter.Q.value = 1;
    lowpassFilter.type = 'lowpass';
    lowpassFilter.frequency.value = 2000;
    lowpassFilter.Q.value = 1;

    // audioImprint is the result of the getFloatFrequencyData function in the web audio API
    // ref: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getFloatFrequencyData
    this.audioImprint = await this.audioConfig.analyseSample(this.audioElement, frogSourceNode, this.sampleDuration);
    const imprintMin = this.audioImprint.reduce((item, acc) => Math.max(item, acc), -Infinity);
    const imprintMax = this.audioImprint.reduce((item, acc) => Math.min(item, acc), Infinity);

    log('imprintMin', imprintMin);
    log('imprintMax', imprintMax);

    const linearAudioImprint = processFFT(this.audioImprint, { normalize: true });
    const imprintMinLinear = linearAudioImprint.reduce((item, acc) => Math.max(item, acc), -Infinity);
    const imprintMaxLinear = linearAudioImprint.reduce((item, acc) => Math.min(item, acc), Infinity);

    log('imprintMinLinear', imprintMinLinear);
    log('imprintMaxLinear', imprintMaxLinear);

    // convolution is executed with the linearized audio imprint, such that values of the result range from 0 to 1
    this.fft = new FFTConvolution(FFT_SIZE / 2, linearAudioImprint.subarray(0, FFT_SIZE / 2 - 1));

    // connect audio to destination device
    frogSourceNode.connect(this.audioConfig.ctx.destination);
    // frogSourceNode.connect(this.inputAnalyser);
    // lowpassFilter.connect(this.convolver);
    // OR connect to analyser directly instead;
    // console.log('help', frogSourceNode);
    // frogSourceNode.connect(this.inputAnalyser);
    // this.convolver.connect(this.inputAnalyser);
    // console.log('ctx', this.audioConfig.ctx);
    // lowpassFilter.connect(this.audioConfig.ctx.destination); // uncomment to debug move elsewhere

    // this.setAnalyser();
    await this.setAnalyserReverb();
    // console.log('this.convolver', this.convolver);

    // evaluate whether to sing or not on every tick
    setInterval(this.trySinging.bind(this), attemptRate);

    this.hasInitialized = true;

    log('frog initialized!', this);
  }

  /**
   * Create audio element
   * This is the audio sample that will be play when the frog 'sings'
   */
  private loadSample() {
    this.audioElement = new Audio();
    this.audioElement.src = this.audioFilepath;
    this.audioElement.controls = false;
    this.audioElement.loop = false;
    this.audioElement.autoplay = false;
    this.audioElement.crossOrigin = 'anonymous';
  }

  /**
   * Use web audio analyser to calculate frequency spectrum
   * on audio input, giving the frog the ability to "hear".
   * To Do: try extracting more audio features (https://meyda.js.org/audio-features)
   * @returns object - these properties will be used to determine behavior
   */
  private analyseInputSignal() {
    // todo: don't re-instantiate
    const data = new Float32Array(FFT_SIZE / 2);
    const directFFT = new Float32Array(FFT_SIZE / 2);

    this.inputAnalyser.getFloatFrequencyData(data);
    this.directInputAnalyser.getFloatFrequencyData(directFFT);

    const amplitude = calculateAmplitude(data);

    this.amplitude = amplitude;

    return { amplitude, fftData: data, directFFT: directFFT };
  }

  /**
   * Periodically update frog's shyness and eagerness
   *   - Prominence in frog signal will decrease shyness (shyness is inversely proportional to frog signal match)
   *   - Prominence in loudness in non-frog spectrum will increase shyness (shyness is proportional to amplitude)
   *   - Sudden non-frog signal with absence of frog spectrum will rapidly induce shyness
   */
  public updateState() {
    if (!this.hasInitialized) return;

    const { amplitude, fftData, directFFT } = this.analyseInputSignal();

    this.currentTimestamp = Date.now();

    // const inputData = processFFT(fftData, { normalize: true, forceMax: -10 });

    // log('fftData', fftData);
    // log('inputData', inputData);
    // logMinMax(fftData, 'fftData');
    // logMinMax(inputData, 'inputData');
    // console.log('inputData', inputData);

    // both the convolver and the data getting convolved are translated to linear scale by processFFT
    // to simplify analysis, since values will range from 0 to 1.
    // let conv = this.fft.convolve(inputData);

    // console.log('conv raw', conv);
    // convolution function sometimes generates unexpected negative values, which need to be accounted for
    // conv = conv.map(Math.abs);

    // this.convolutionResult = linearToLog(conv);
    this.convolutionResult = fftData;
    this.inputFFT = directFFT;
    this.diffFFT = _.clone(fftData).map((item, i) => {
      return Math.abs(directFFT[i] - item) - 70;
    });

    // console.log('diff', this.diffFFT);
    // logMinMax(this.convolutionResult, 'conv result');
    // console.log('conv result', this.convolutionResult);

    // logMinMax(conv, 'convolution');

    // what metric to calculate from convolution?
    let convolutionSum = Math.log10(this.convolutionResult.reduce((item, acc) => acc + item, 0));

    console.log('convolutionSum', convolutionSum);

    if (Number.isNaN(convolutionSum)) {
      console.error('convolution sum is NaN');
      convolutionSum = 0;
    }

    // ideas for detecting frog signal from input
    // - multiply histograms together and compare to input signal
    // - try frog sound that is longer, less squeak
    // - detect what is NOT a frog by detecting general changes in volume and comparing against imprint spectrum
    // - compare convolution FFT with direct FFT (convolution should emphasize frog spectrum)
    // - specify frequency range of interest (~3kHz) and calculate degree of match
    // - use some sort of masking algorithm to compare the two FFT curves?
    // - metrics: total amplitude sum,

    // todo: debug convolution sum (currently too high)
    // log('convolution sum:', convolutionSum);

    // todo: add function for updating state when another frog call is detected
    // this could be used to animate some UI, to give a visual indicator in addition
    // to the audiofile playback

    this.updateShyness(amplitude, convolutionSum);
    this.updateEagerness(amplitude, convolutionSum);
    // this.inputFFT = fftData;

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
    // this.audioElement.play();
    // TODO: while sample is playing, pause "listening" so the frog does not hear to itself
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
