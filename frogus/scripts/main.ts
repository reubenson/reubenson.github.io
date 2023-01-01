import { FFTConvolution } from 'ml-convolution';

class Frog {
  audioConfig: AudioConfig;
  shyness: number; // 0. - 1.
  shynessInterval = 100;
  audioImprint: Float32Array;
  audioElement: HTMLAudioElement;
  isInitialized: boolean;
  fft: FFTConvolution;

  constructor(audioConfig: AudioConfig) {
    this.audioConfig = audioConfig;
    this.shyness = 1.0; // initiaize to 1 (maximum shyness)
    this.audioImprint = new Float32Array(1024); // make dynamic
    this.isInitialized = false;

    // load in sample
    this.loadSample();

    this.initialize();
    
    this.setTimeout();

    // alternately, set timeout for updating shyness, instead of executing during sing
    // set interval for updating shyness, potentially with an integrator to apply some latency/smoothing
    // setTimeout(this.updateShyness.bind(this), this.shynessInterval);
  }

  async initialize() {
    let result = new Float32Array(1024); // make 1024 dynamic

    // measure audio imprint (FFT signature) of sample
    this.audioImprint = await this.audioConfig.analyseSample(this.audioElement, result);

    this.fft = new FFTConvolution(1024, this.audioImprint);
    // fft.convolve([0, 255, 255, 255, 255, 0, 0, 0]);
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
  updateShyness() {
    // pull FFT from AudioConfig (can it be instantaneous, or time-integrated beyond the sample size)
    const microphoneInput = this.audioConfig.getMicrophoneFFT();
    
    console.log('mic', microphoneInput);
    const data = this.fft.convolve(microphoneInput);
    // const data = fftConvolution(microphoneInput, this.audioImprint);
    console.log('data', data);

    // compare against audioImprint (some sort of convolution?)
    const matchLevel = 1; // temp
    
    // prominence in frog signal will decrease shyness
    // prominence in loudness in non-frog spectrum will increase shyness
    // sudden non-frog signal with absence of frog spectrum will rapidly induce shyness
    this.shyness = matchLevel; // most basic linear implementation
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
    this.audioElement.play();
  }

  /**
   * as the frog detects other frogs, it will be emboldened to sing more loudly and frequently
   */
  sing() {
    // lazily evaluate shyness
    this.updateShyness();

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
  fftSize: number;

  constructor() {
    // this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx = new (window.AudioContext);
    this.fftSize = Math.pow( 2 , Math.ceil( Math.log2(this.sampleRate / this.freqBandwidth)) );
    this.setDeviceId();
    console.log('deviceId', this.deviceId);
    this.initializeAudio();

    // need to setup output device also

  }

  getMicrophoneFFT() {
    const data = new Float32Array(1024); // make 1024 dynamic
    this.analyser.getFloatFrequencyData(data);

    return data;
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

    navigator.mediaDevices.enumerateDevices()
      .then( (devices) => {
        console.log('devices', devices)
        var deviceFound = false;
        for (var i = 0; i < eligibleDevices.length; i++) {
          var regex = new RegExp(eligibleDevices[i],'ig');
          for (var j = 0; j < devices.length; j++) {
            if (!deviceFound && devices[j].kind == 'audioinput' && devices[j].label.match(regex)) {
              this.deviceId = devices[j].deviceId
              this.groupId = devices[j].groupId;
              deviceFound = true;
            }
          }
        }

      this.deviceId = this.deviceId || 'default';
    });
  }

  initializeAudio() {
    // var input, analyser, fft;
    var ctx = this.ctx;
    let constraints = {audio: {}};
    // constraints = {audio: true}
    if (this.deviceId)
      constraints.audio = {deviceId: {exact: this.deviceId}};
    else if (this.groupId)
      constraints.audio = {groupId: {exact: this.groupId}};
    // navigator.mediaDevices.getUserMedia(this.constraints)
    // console.log('ctx', ctx);
    // navigator.mediaDevices.getUserMedia(constraints)
    //   .then(function(stream: any){
    //     this.input = ctx.createMediaStreamSource(stream);
    //     this.analyser = ctx.createAnalyser();
    //     this.analyser.fftSize = this.fftSize;

    //     this.input.connect(this.analyser);
    //     setInterval(this.sampleAudio.bind(this), 0);
        

    //   }.bind(this))
    //   .catch(function(error){
    //     // debugger
    //   });
  }

  /**
   * analyze incoming audio and generate an FFT signature to be used
   * to compare against other signals
   * @param audio AudioElement
   * @returns Float32Array
   */
  async analyseSample(audio: HTMLAudioElement, averagedFFT: Float32Array) {
    const sourceNode = this.ctx.createMediaElementSource(audio);
    
    //Create analyser node
    const analyserNode = this.ctx.createAnalyser();
    analyserNode.fftSize = 2048;
    analyserNode.smoothingTimeConstant = 0.96;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);

    function iterate(numberOfSteps: number, result: Float32Array) {
      analyserNode.getFloatFrequencyData(dataArray);

      dataArray.forEach((value, index) => {
        result[index] += value === -Infinity ? 0 : value * 1.0 / numberOfSteps;
      });
    return result;
    }

    async function getAveragedFFT(): Promise<Float32Array> {
      const numberOfSteps = 20;
      let stepCount = 0;

      return await new Promise(async resolve => {
        while (stepCount < numberOfSteps) {
          averagedFFT = iterate(numberOfSteps, averagedFFT);
          await new Promise(resolve => setTimeout(resolve, 100));
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
    audio.initializeAudio();
  
    new Frog(audio);
  });
}

init();

// export = Frog; // figure out better way to resolve this hack
