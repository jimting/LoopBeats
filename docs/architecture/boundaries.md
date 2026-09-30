# Target architecture

React UI → application controller → audio-client → AudioWorklet → Rust/WASM LoopEngine.

Web Audio owns the browser graph, input/output, sample rate and lifecycle. AudioWorklet receives blocks, executes commands through a controlled boundary, invokes the engine and returns output. Rust owns transport, track state, loop buffers, mixer and DSP behind process/command/snapshot/reset operations.

React owns controls, accessibility, meters and approximate visual progress. Engine sample positions determine execution and loop boundaries. Browser audio lifecycle lives behind one audio-client module. Persistence and telemetry stay outside the callback.

No cross-package runtime dependencies are wired yet. Future UI imports should pass through audio-client; Rust must not depend on frontend packages. Treat block length as supplied by the host, not a hardcoded UI assumption.

Mute and stop are distinct; mute advances silently. State-machine details, channel format, command scheduling, capacity, clipping and transport restart semantics remain specification decisions.
