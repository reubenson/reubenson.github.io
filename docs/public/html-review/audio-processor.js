class AudioProcessor extends AudioWorkletProcessor {
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
    const downsampleFactor = 4;
    const length = channel.length / downsampleFactor;
    const downsampledChannel = channel.filter((_, i) => i % downsampleFactor === 0);
    this.appendToBuffer(downsampledChannel);

    // only post message with data when the buffer contains a full row for the canvas
    if (this.bufferCounter % (this.bufferSize / length) === 0) {
      this.port.postMessage(this.bufferView);
      this.bufferCounter = 0;
    }
  
    this.bufferCounter++;
  }

  // The method is called synchronously from the audio rendering thread
  // once for each block of audio (also known as a rendering quantum)
  process(inputs, outputs, parameters) {
    const output = inputs[0];
    
    output.forEach((channel, index) => {
      if (index === 1) return; // skip second channel for now

      for (let i = 0; i < channel.length; i++) {
        if (!inputs[0].length) {
          channel[i] = 0;
          return;
        }

        channel[i] = 255 * (channel[i] + 1) / 2;
      }
      this.handleChannelData(channel);
    });

    return true;
  }
}
  
registerProcessor("audio-processor", AudioProcessor);
