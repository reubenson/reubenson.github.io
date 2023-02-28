import _ from 'lodash';
import type { Frog } from './Frog';
import { FFT_SIZE, DEBUG_ON } from './store';
import { calculateAmplitude, processFFT } from './utils';

/**
 * The AudioConfig class is responsible for managing audio input and output devices
 */
export class AudioConfig {
  input: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  ctx: AudioContext;
  canvas: HTMLCanvasElement;
  deviceId: string;
  inputSamplingInterval = 50; // time (ms) between FFT analysis events
  frogs: Array<Frog>;
  groupId: string;

  constructor() {
    this.frogs = [];
    // (window as any).AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    // this.ctx = new AudioContext();
    // this.setInputDeviceId().then(this.initializeAudio.bind(this));
  }

  public start() {
    (window as any).AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
    this.ctx = new AudioContext();
    return this.setInputDeviceId().then(this.initializeAudio.bind(this));
    // console.log('audio start completed');
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

    return navigator.mediaDevices
      .getUserMedia(constraints)
      .then((stream: any) => {
        const input = ctx.createMediaStreamSource(stream);

        this.input = input;
        console.log('inpupt', input);

        this.analyser = ctx.createAnalyser();
        this.analyser.fftSize = FFT_SIZE;
        this.analyser.smoothingTimeConstant = 0.8; // to be tweaked
        input.connect(this.analyser);

        console.log('initializeAudio complete');

        // setInterval(this.updateFrogs.bind(this), this.inputSamplingInterval);
      })
      .catch(function (error) {
        console.error('Error initializing audio input', error.message);
      });
  }

  /**
   * Measure FFT from audio input and update the state of each frog
   */
  // private updateFrogs() {
  //   const data = new Float32Array(FFT_SIZE / 2);

  //   this.analyser.getFloatFrequencyData(data);

  //   const amplitude = calculateAmplitude(data);

  //   this.frogs.forEach(frog => {
  //     frog.updateState(amplitude, processFFT(data, { normalize: false }));
  //   });

  //   // if (DEBUG_ON) this.drawFFT(data, this.canvas);
  // }

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
    sourceNode: BiquadFilterNode,
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
    const numberOfSteps = 5; // can be tweaked
    const intervalLength = Math.floor((duration * 1000) / numberOfSteps);

    audio.play();
    for (let index = 0; index < numberOfSteps; index++) {
      await new Promise(resolve => setTimeout(resolve, intervalLength));
      analyserNode.getFloatFrequencyData(fft);

      if (_.max(fft) === -Infinity) console.warn(`issue occurred analysing sample on step ${index}`);
    }

    return fft;
  }

  public setCanvas(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
  }

  /**
   * plot FFT histogram (helps with debugging)
   * @param dataArray - fft data to be plotted
   * @param canvasElement - canvas element to plot onto
   */
//   private drawFFT(dataArray: Float32Array, canvasElement: HTMLCanvasElement) {
//     const canvasCtx = canvasElement.getContext('2d');

//     if (!canvasCtx) {
//       console.error('error getting canvas context');
//       return;
//     }

//     //Draw black background
//     canvasCtx.fillStyle = 'rgb(0, 0, 0)';
//     canvasCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

//     //Draw spectrum
//     const bufferLength = FFT_SIZE / 2;
//     const barWidth = (this.canvas.width / bufferLength) * 2.5;
//     let posX = 0;

//     for (let i = 0; i < bufferLength; i++) {
//       const barHeight = (dataArray[i] + 140) * 2;

//       canvasCtx.fillStyle = 'rgb(' + Math.floor(barHeight + 100) + ', 50, 50)';
//       canvasCtx.fillRect(posX, this.canvas.height - barHeight / 2, barWidth, barHeight / 2);
//       posX += barWidth + 1;
//     }
//   }
}
