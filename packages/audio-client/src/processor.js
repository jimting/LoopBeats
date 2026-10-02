// Numeric states match Rust TrackState's repr(u32) ABI.
const TRACK_STATE = {
  Empty: 0,
  Recording: 1,
  Playing: 2,
  Stopped: 3,
  Overdubbing: 4,
};
const TRACK_STATE_NAMES = Object.keys(TRACK_STATE);

// Real-time callback uses fixed views and counters. Messages allocate outside process().
class LoopProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.engine = new WebAssembly.Instance(
      options.processorOptions.module,
    ).exports;
    if (this.engine.initialize(sampleRate) !== 1)
      throw new Error('Unsupported audio sample rate');
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
    this.memory = this.engine.memory.buffer;
    this.frames = 0;
    this.inputLevel = 0;
    this.outputLevel = 0;
    this.failed = false;
    this.port.onmessage = ({ data }) => {
      if (data.type === 'monitoring' && !this.failed)
        this.engine.set_monitoring(data.enabled ? 1 : 0);
      if (!this.failed) {
        switch (data.type) {
          case 'set-mode':
            if (
              (data.trackId === 0 || data.trackId === 1) &&
              (data.mode === 'Loop' || data.mode === 'OneShot')
            )
              this.engine.set_mode(
                data.trackId,
                data.mode === 'OneShot' ? 1 : 0,
              );
            break;
          case 'record':
            if (data.trackId === 0 || data.trackId === 1)
              this.engine.record(data.trackId);
            break;
          case 'play':
            if (data.trackId === 0 || data.trackId === 1)
              this.engine.play(data.trackId);
            break;
          case 'stop-track':
            if (data.trackId === 0 || data.trackId === 1)
              this.engine.stop_track(data.trackId);
            break;
          case 'stop-transport':
            this.engine.stop_transport();
            break;
        }
      }
      this.port.postMessage({
        type: 'snapshot',
        failed: this.failed,
        monitoring: Boolean(this.engine.monitoring()),
        processedFrames: this.frames,
        transport: {
          running: Boolean(this.engine.transport_running()),
          positionSamples: this.engine.transport_position(),
          cycleLengthSamples: this.engine.cycle_length(),
        },
        tracks: [0, 1].map((trackId) => ({
          mode: this.engine.playback_mode(trackId) === 1 ? 'OneShot' : 'Loop',
          canSetMode: Boolean(this.engine.can_set_mode(trackId)),
          state: TRACK_STATE_NAMES[this.engine.track_state(trackId)],
          lengthSamples: this.engine.loop_length(trackId),
          capturedSamples: this.engine.captured_samples(trackId),
          capacitySamples: this.engine.recording_capacity(trackId),
          captureLimitSamples: this.engine.capture_limit(trackId),
          canRecord: Boolean(this.engine.can_record(trackId)),
          canPlay: Boolean(this.engine.can_play(trackId)),
          canStop: Boolean(this.engine.can_stop(trackId)),
          positionSamples: this.engine.loop_position(trackId),
        })),
        inputLevel: this.inputLevel,
        outputLevel: this.outputLevel,
      });
    };
  }
  process(inputs, outputs) {
    const channels = outputs[0];
    const count = channels[0].length;
    if (
      this.engine.memory.buffer !== this.memory ||
      count > this.input.length
    ) {
      this.failed = true;
      return false;
    }
    const source = inputs[0][0];
    for (let i = 0; i < count; i++) this.input[i] = source?.[i] ?? 0;
    if (this.engine.process(count) !== count) {
      this.failed = true;
      return false;
    }
    let inputPeak = 0,
      outputPeak = 0;
    for (let i = 0; i < count; i++) {
      inputPeak = Math.max(inputPeak, Math.abs(this.input[i]));
      outputPeak = Math.max(outputPeak, Math.abs(this.output[i]));
      for (let channel = 0; channel < channels.length; channel++)
        channels[channel][i] = this.output[i];
    }
    // Slowly decaying meters; silent output resets immediately when monitoring is off.
    this.inputLevel = Math.max(inputPeak, this.inputLevel * 0.999);
    this.outputLevel =
      this.engine.monitoring() ||
      this.engine.track_state(0) === TRACK_STATE.Playing ||
      this.engine.track_state(1) === TRACK_STATE.Playing ||
      this.engine.track_state(0) === TRACK_STATE.Overdubbing ||
      this.engine.track_state(1) === TRACK_STATE.Overdubbing
        ? Math.max(outputPeak, this.outputLevel * 0.999)
        : 0;
    this.frames += count;
    return true;
  }
}
registerProcessor('loop-engine', LoopProcessor);
