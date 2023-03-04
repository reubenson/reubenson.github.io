/**
 * This file exports a single class (Frog), which is intended to be used in a browser-based translation of a sound art installation by Felix Hess.
 * It relies heavily on the web audio API to perform FFT (Fast Fourier Transform) analysis to determine the frequency content of the audio
 * signal picked up by the device's microphone.
 * 
 * The class exported in this file encapsulates the frog-like behavior modeled in a larger webapp. Multiple instances of frogs may run within the runtime
 * environment on a single device, but the intent is to only have one
 * instatiated per device, and to iteract with other frogs running on other devices
 * within acoustic proximity. To see a diagram of the general data flow, see https://reubenson.com/frog/frog-diagram.png
 * 
 * For the purposes of pairing, the following to-do tasks may be implemented:
 * 1. Pause audio analysis while a frog is singing, so that its "hearing" is limited only to other frogs, and not to itself
 * 2. Improve the accuracy of the detectFrogSignal fn
 * 
 * 
 * Historical Context:
 * Felix Hess began developing his frog-based installation work in 1982, which involved developing a set of fifty robots,
 * each outfitted with a microphone, speaker, and circuitry to allow each robot to listen to its environment
 * and make sounds in the manner of a frog in a frog chorus. Hess' designs for doing so are relatively straightfoward,
 * in which the robot-frog's sounding behavior is predicated on "eagerness" and "shyness". 
 *
 * When eagerness is high relative to shyness, the robot will emit a chirping sound, which is then "heard" by the other 
 * robots. Each robot will increase its eagerness when it hears another's chirp, and will increase its shyness when it 
 * hears loud non-chirping sounds. Through this simple set of rules, a dynamic chorus of sounds emerges, which is highly 
 * sensitive to environmental dynamics, similar to if one were encountering a group of frogs in the wild.
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
 * Additional references:
 * On how frogs hear: https://www.sonova.com/en/story/frogs-hearing-no-ears
 */

import _ from 'lodash';
import { FFTConvolution } from 'ml-convolution';
import type { AudioConfig } from './AudioManager';
import { FFT_SIZE, inputSamplingInterval, inputSourceNode } from './store';
import { log, processFFT, calculateAmplitude, logMinMax, linearToLog } from './utils';

let idCounter = 0;

export class Frog {
  id: number;
  audioFilepath: string;
  audioConfig: AudioConfig;
  shyness: number; // 0. - 1.
  eagerness: number; // 0. - 1.
  audioImprint: Float32Array;
  directInputFFT: Float32Array;
  convolutionFFT: Float32Array;
  diffFFT: Float32Array;
  audioElement: HTMLAudioElement;
  fft: FFTConvolution;
  lastUpdated: number;
  currentTimestamp: number;
  rateOfStateChange: number; // manually-calibrated value used to determine rate of change in eagerness and shyness
  sampleDuration: number;
  amplitudeThreshold: number; // relative threshold between a quiet vs noisy environment
  hasInitialized: boolean;
  convolutionAnalyser: AnalyserNode;
  directInputAnalyser: AnalyserNode;
  amplitude: number;
  convolutionAmplitude: number;
  convolver: ConvolverNode;
  ambientFFT: Float32Array;
  frogSignalDetected: boolean;

  constructor(audioConfig: AudioConfig, audioFilepath: string) {
    this.id = ++idCounter;
    this.audioConfig = audioConfig;
    this.audioFilepath = audioFilepath;
    this.shyness = 1.0; // initiaize to 1 (maximum shyness)
    this.eagerness = 0.0; // initialize to 0 (minimum eagerness)
    this.audioImprint = new Float32Array(FFT_SIZE / 2);
    this.lastUpdated = Date.now();
    this.currentTimestamp = Date.now();
    this.rateOfStateChange = 0.2; // to be tweaked
    this.amplitudeThreshold = -80; // to be tweaked
    this.hasInitialized = false;
    this.convolutionAnalyser = null;
    this.directInputAnalyser = null;
    this.convolver = null;
    this.frogSignalDetected = false;
    this.loadSample();
  }

  // experimenting with different option, to convolve audio input directly
  private async setUpAnalysers() {
    this.convolver = this.audioConfig.ctx.createConvolver();
    this.convolver.normalize = false;

    // load impulse response from file
    const response = await fetch(this.audioFilepath);
    const arraybuffer = await response.arrayBuffer();

    this.convolver.buffer = await this.audioConfig.ctx.decodeAudioData(arraybuffer);

    // connect convolver to analyser signal path
    const smoothingConstant = 0.8;

    this.convolutionAnalyser = this.audioConfig.ctx.createAnalyser();
    this.convolutionAnalyser.fftSize = FFT_SIZE;
    this.convolutionAnalyser.smoothingTimeConstant = smoothingConstant; // this can be tweaked

    // create a second analyser, for unprocessed input
    this.directInputAnalyser = this.audioConfig.ctx.createAnalyser();
    this.directInputAnalyser.fftSize = FFT_SIZE;
    this.directInputAnalyser.smoothingTimeConstant = smoothingConstant; // this can be tweaked

    inputSourceNode.connect(this.convolver);
    this.convolver.connect(this.convolutionAnalyser);

    // connect to second analyser
    inputSourceNode.connect(this.directInputAnalyser);

    // Debug: wire input through convolver to output
    // this.convolutionAnalyser.connect(this.audioConfig.ctx.destination);
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

    await this.setSampleDuration();

    // measure audio imprint (FFT signature) of sample
    const frogSourceNode = this.audioConfig.ctx.createMediaElementSource(this.audioElement);

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

    // this.setAnalyser();
    await this.setUpAnalysers();

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
   */
  private analyseInputSignal() {
    // todo: don't re-instantiate
    const convolutionFFT = new Float32Array(FFT_SIZE / 2);
    const directInputFFT = new Float32Array(FFT_SIZE / 2);

    this.convolutionAnalyser.getFloatFrequencyData(convolutionFFT);
    this.convolutionAmplitude = calculateAmplitude(convolutionFFT);

    // the direct input analyser is currently just used for diagnostics, and is not being actively used
    this.directInputAnalyser.getFloatFrequencyData(directInputFFT);
    this.amplitude = calculateAmplitude(directInputFFT);

    this.convolutionFFT = convolutionFFT;
    this.directInputFFT = directInputFFT;
    this.diffFFT = _.clone(convolutionFFT).map((item, i) => {
      return this.ambientFFT ? item - this.ambientFFT[i] - 60 : -Infinity;
    });
  }

  private establishAmbientFFT() {
    // if (this.ambientFFT) return;

    this.ambientFFT = this.convolutionFFT;
  }

  /**
   * For a given array, return an object containing the index-value pair
   * corresponding to the largest value in the array
   * @param arr - expects an array of FFT values
   * @returns object
   */
  private findPeakBin(arr) {
    const defaultValue = { index: 0, value: -Infinity };

    if (!arr) return defaultValue;

    return arr.reduce((acc, item, i) => {
      if (item > acc.value) {
        return { index: i, value: item };
      } else {
        return acc;
      }
    }, defaultValue);
  }

  /**
   * Perform analysis using FFT data to determine whether another frog is being heard.
   * The convolutionFFT data is a way of representing the degree of match between the microphone input and the sound of the frog
   * The ambientFFT data is a snapshot of the convolutionFFT data taken when the environment is very quiet, and therefore represents a baseline set of values to detect when there are sounds in the environment.
   * By comparing these two arrays, we can get make an approximate determination of whether there are detectable sounds, whether those sounds correspond to the frequency range we would associated with the frog
   * 
   * TO DO: Ideas for improving signal detection
   * - Use a weighted average calculation instead of analysing frequency bins in the FFT individually
   * - Use a library like Meyda to extract more complex audio features (https://meyda.js.org/audio-features)
   */
  private detectFrogSignal() {
    // simple calculation: determine whether the peak frequency bin is similar,
    // between convolutionFFT and ambientFFT
    const convolutionPeakBin = this.findPeakBin(this.convolutionFFT);
    const ambientPeakBin = this.findPeakBin(this.ambientFFT);

    log('convolution peak bin', convolutionPeakBin);
    log('ambient peak bin', ambientPeakBin);

    const binsAreSimilar = Math.abs(convolutionPeakBin.index - ambientPeakBin.index) < 4;
    const convolutionIsLouder = convolutionPeakBin.value > ambientPeakBin.value;

    this.frogSignalDetected = binsAreSimilar && convolutionIsLouder;
  }

  /**
   * Periodically update frog's shyness and eagerness
   *   - Hearing other frogs will increase eagerness
   *   - A loud environment with non-frog sounds will increase shyness
   */
  public updateState() {
    if (!this.hasInitialized) return;

    // FFT data will provide the basis for updating eagerness/shyness
    // The main 'trick' with this is that convolutionFFT emphasizes the frequency spectrum of the microphone input most relevant to the frog chirp, and is therefore useful for determining whether a sound that is heard is similar to the frog's chirp
    this.analyseInputSignal();

    this.currentTimestamp = Date.now();

    // TO DO: make it wait for the threshold to be held for x amount of time
    if (this.amplitude < this.amplitudeThreshold) {
      this.establishAmbientFFT();
    }

    this.detectFrogSignal();
    this.updateShyness();
    this.updateEagerness();

    this.lastUpdated = this.currentTimestamp;
  }

  /**
   * Update the frog's "shyness",
   * which is the frog's tendency to be silent
   */
  private updateShyness() {
    const rateOfLosingShyness = 0.1; // value to be tweaked

    if (this.amplitude < this.amplitudeThreshold) {
      const velocity = rateOfLosingShyness;

      // monotonically decrease shyness if the environment is quiet
      this.shyness -= velocity * this.timeSinceLastUpdate();
    } else {
      const velocity = this.rateOfStateChange;

      // increase shyness if environment is loud
      // todo: also make a function of this.frogSignalDetected
      this.shyness += velocity * this.timeSinceLastUpdate();
    }

    this.shyness = Math.max(0, Math.min(1, this.shyness)); // restrict to value between 0 and 1
  }

  /**
   * Update the frog's "eagerness",
   * which is the tendency of the frog to make its call
   */
  private updateEagerness() {
    if (this.frogSignalDetected) {
      // increase eagerness if other frogs are heard
      const velocity = this.rateOfStateChange; // amount of change in eagerness per second

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
