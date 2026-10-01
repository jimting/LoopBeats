// Disposable, mono input duplicated to stereo. Compile before constructing node.
class WasmGain extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = new WebAssembly.Instance(
      options.processorOptions.module,
    ).exports;
    this.input = new Float32Array(
      this.engine.memory.buffer,
      this.engine.input_ptr(),
      this.engine.capacity(),
    );
    this.output = new Float32Array(
      this.engine.memory.buffer,
      this.engine.output_ptr(),
      this.engine.capacity(),
    );
    this.gain = options.processorOptions.gain ?? 0.5;
    this.frames = 0;
    this.blocks = 0;
    this.failures = 0;
    this.initialMemoryBytes = this.engine.memory.buffer.byteLength;
    this.minBlockFrames = Infinity;
    this.maxBlockFrames = 0;
    this.inputEnergy = 0;
    this.outputEnergy = 0;
    this.port.onmessage = () =>
      this.port.postMessage({
        frames: this.frames,
        blocks: this.blocks,
        failures: this.failures,
        initialMemoryBytes: this.initialMemoryBytes,
        memoryBytes: this.engine.memory.buffer.byteLength,
        minBlockFrames: this.minBlockFrames,
        maxBlockFrames: this.maxBlockFrames,
        inputRms: this.frames ? Math.sqrt(this.inputEnergy / this.frames) : 0,
        outputRms: this.frames ? Math.sqrt(this.outputEnergy / this.frames) : 0,
        gain: this.gain,
        sampleRate,
      });
  }
  process(inputs, outputs) {
    const destination = outputs[0];
    const frames = destination[0].length;
    if (
      frames > this.input.length ||
      this.engine.memory.buffer.byteLength !== this.initialMemoryBytes
    ) {
      this.failures++;
      return false; // Web Audio supplies zeroed output; fail closed.
    }
    const source = inputs[0][0];
    for (let i = 0; i < frames; i++) this.input[i] = source?.[i] ?? 0;
    if (this.engine.process_gain(frames, this.gain) !== frames) {
      this.failures++;
      return false;
    }
    for (let channel = 0; channel < destination.length; channel++) {
      for (let i = 0; i < frames; i++) destination[channel][i] = this.output[i];
    }
    for (let i = 0; i < frames; i++) {
      this.inputEnergy += this.input[i] * this.input[i];
      this.outputEnergy += this.output[i] * this.output[i];
    }
    this.frames += frames;
    this.blocks++;
    this.minBlockFrames = Math.min(this.minBlockFrames, frames);
    this.maxBlockFrames = Math.max(this.maxBlockFrames, frames);
    return true;
  }
}
registerProcessor('wasm-gain-spike', WasmGain);
