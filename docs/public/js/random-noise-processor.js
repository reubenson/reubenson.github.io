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
      // console.log('e.data', e.data);
      // console.log('this.bufferData', this.bufferData.byteLength);
      // this.port.postMessage(this.bufferData);
    };
    this.counter = 0;
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
      this.bufferView[i] = newData[i];
    }
  }
  // appendToBuffer(newData) {
  //   const newDataLength = newData.length;

  //   for (let i = 0; i < newDataLength; i++) {
  //     this.bufferView[this.writeIndex] = newData[i];
  //     this.writeIndex = (this.writeIndex + 1) % this.bufferSize;
  //   }
  // }

  handleChannelData(channel) {
    this.appendToBuffer(channel);

    // only post message with data when the buffer contains a full row for the canvas
    if (this.bufferCounter % (this.bufferSize / channel.length) === 0) {
      // console.log('posting data', this.bufferData);
      this.port.postMessage(this.bufferView);
      this.bufferCounter = 0;
    }
    this.bufferCounter++;
    // console.log('bufferCounter', this.bufferCounter);
  }

  // The method is called synchronously from the audio rendering thread, once for each block of audio (also known as a rendering quantum) being directed through the processor's corresponding AudioWorkletNode. In other words, every time a new block of audio is ready for your processor to manipulate, your process() function is invoked to do so.
  process(inputs, outputs, parameters) {
    // const dry = 0.5;
    // const wet = 1.0 - dry;
    // console.log('process', )
    // console.log('inputs', inputs);
    // console.log('outputs', outputs);
    // console.log('parameters', parameters);
    // const output = outputs[0];
    const output = inputs[0];
    // console.log('output', output);
    // console.log('output', output.length);

    // console.log('output', output.length);
    
    output.forEach((channel, index) => {
      if (index === 1) return; // skip second channel for now
      // always a Float32Arrray of 128 samples (or 32 pixels)
      for (let i = 0; i < channel.length; i++) {
        let noise = (Math.random() * 2 - 1) / 1.;
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

      // console.log('First 12 data points in channel:', channel.slice(0, 12));
      // this.appendToBuffer(channel);

      this.handleChannelData(channel);
      return true;

      // slow down framerate
      if (this.counter % (1) === 0) {
        // console.log('First 16 elements:', Array.from(channel.slice(0, 16)));
        // console.log('channel', channel.length);
        this.port.postMessage(channel);
        // console.log('posting data')
        // this.port.postMessage(this.bufferData);
      }
      this.counter++;
    });

    // const newData = new Uint8Array(channel);
    // this.appendToBuffer(output)[0];
    // console.log('Updated bufferData', this.bufferData.byteLength);

    return true;
  }
}
  
registerProcessor("random-noise-processor", RandomNoiseProcessor);