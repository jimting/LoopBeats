# Target architecture

React UI → application controller → audio-client → AudioWorklet → Rust/WASM LoopEngine.

Web Audio owns the browser graph, input/output, sample rate and lifecycle. AudioWorklet receives blocks, executes commands through a controlled boundary, invokes the engine and returns output. Rust owns transport, track state, loop buffers, mixer and DSP behind process/command/snapshot/reset operations.

React owns controls, accessibility, meters and approximate visual progress. Engine sample positions determine execution and loop boundaries. Browser audio lifecycle lives behind one audio-client module. Persistence and telemetry stay outside the callback.

No cross-package runtime dependencies are wired yet. Future UI imports should pass through audio-client; Rust must not depend on frontend packages. Treat block length as supplied by the host, not a hardcoded UI assumption.

The confirmed first-usable milestone defines two tracks, mono capture, a 60-second initial-recording limit, engine-owned cycle alignment, independent One-shot playback and immediate additive overdubbing. Mute advances silently; Track stop retains audio while Transport stop resets the shared position. See `first-usable-milestone.md` and ADR-0001 for the confirmed product semantics. Buffer strategy, command protocol, clipping algorithm and browser/runtime feasibility still require technical specification or research.
