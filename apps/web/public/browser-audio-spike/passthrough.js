// Disposable spike. No allocations, messaging, DOM or I/O in process().
class SpikePassthrough extends AudioWorkletProcessor {
  constructor() {
    super();
    this.frames = 0;
    this.blocks = 0;
    this.inputEnergy = 0;
    this.minBlockFrames = Infinity;
    this.maxBlockFrames = 0;
    this.port.onmessage = () => {
      this.port.postMessage({
        frames: this.frames,
        blocks: this.blocks,
        inputRms: this.frames ? Math.sqrt(this.inputEnergy / this.frames) : 0,
        minBlockFrames: this.minBlockFrames,
        maxBlockFrames: this.maxBlockFrames,
        sampleRate,
      });
    };
  }
  process(inputs, outputs) {
    const input = inputs[0][0];
    const output = outputs[0];
    if (!input) return true;
    for (let channel = 0; channel < output.length; channel++) {
      for (let i = 0; i < output[channel].length; i++)
        output[channel][i] = input[i] ?? 0;
    }
    for (let i = 0; i < input.length; i++)
      this.inputEnergy += input[i] * input[i];
    this.frames += input.length;
    this.blocks++;
    this.minBlockFrames = Math.min(this.minBlockFrames, input.length);
    this.maxBlockFrames = Math.max(this.maxBlockFrames, input.length);
    return true;
  }
}
registerProcessor('spike-passthrough', SpikePassthrough);
