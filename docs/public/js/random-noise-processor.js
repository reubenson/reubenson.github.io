// https://developer.mozilla.org/en-US/docs/Web/API/AudioWorkletNode
// random-noise-processor.js
class RandomNoiseProcessor extends AudioWorkletProcessor {
  constructor(input) {
    super();
    const size = 256 * 2;
    this.canvasWidth = 512;
    this.bufferData = new ArrayBuffer(size * size);
    this.bufferView = new Uint8Array(this.bufferData);
    this.bufferSize = size * size;
    this.writeIndex = 0;
    this.bufferCounter = 0;
    this.port.onmessage = ({ data }) => {
      const { canvasWidth } = data;
      console.log('received ping and posting data', data);
      this.canvasWidth = canvasWidth;
      this.bufferSize = canvasWidth * 4;
      this.bufferData = new ArrayBuffer(this.bufferSize);
      this.bufferView = new Uint8Array(this.bufferData);
    };
  }

  // append to beginning of buffer
  appendToBuffer(newData) {
    const newDataLength = newData.length;

    // Ensure we don't write more data than the buffer can hold
    const writeLength = Math.min(newDataLength, this.bufferSize);


    // Shift existing data to the right to make room for new data
    for (let i = this.bufferSize - 1; i >= writeLength; i--) {
      this.bufferView[i] = this.bufferView[i - writeLength];
    }

    // Write new data to the beginning of the buffer
    for (let i = 0; i < writeLength; i++) {
      this.bufferView[i] = newData[writeLength - 1 - i];
    }
  }

  handleChannelData(channel) {
    // console.log('channel', channel.length);
    const downsampleFactor = 8;
    const length = channel.length / downsampleFactor;
    const downsampledChannel = channel.filter((_, i) => i % downsampleFactor === 0);
    this.appendToBuffer(downsampledChannel);

    // only post message with data when the buffer contains a full row for the canvas
    if (this.bufferCounter % (this.bufferSize / length) === 0) {
      
      this.port.postMessage(this.bufferView.map(val => {
        if (this.bufferCounter % 4 === 3) {
          // modulate transparency
          // increase level (more negative -> more transparency?) 
          return Math.pow(val / 255, -1.25) * 255;
        }
        return val;
      }));
      this.bufferCounter = 0;
    }
    this.bufferCounter++;
  }

  // The method is called synchronously from the audio rendering thread, once for each block of audio (also known as a rendering quantum) being directed through the processor's corresponding AudioWorkletNode. In other words, every time a new block of audio is ready for your processor to manipulate, your process() function is invoked to do so.
  process(inputs, outputs, parameters) {
    // console.log('process', inputs);
    const output = inputs[0];
    
    output.forEach((channel, index) => {
      // console.log('channel', channel);
      // console.log('index', index);
      // if (index === 1) return; // skip second channel for now

      for (let i = 0; i < channel.length; i++) {
        // let noise = (Math.random() * 2 - 1) / 1.;
        if (!inputs[0].length) {
          channel[i] = 0;
          return;
        }

        // console.log('channel[i]', channel[i]);
        // convert audio data to pixel data range
        channel[i] = 255 * (channel[i] + 1) / 2;

        // channel[i] = inputs[0][0][i];
        // do I need this in stereo? not sure that's useful, but could be integrated in some way ...
        // channel[i] = inputs[0][0][i] * 1 + inputs[0][1][i] * 1 + noise * 0;
      }

      this.handleChannelData(channel);
    });

    return true;
  }
}
  
registerProcessor("random-noise-processor", RandomNoiseProcessor);