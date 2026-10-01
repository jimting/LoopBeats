# Audio startup and input monitoring (#7)

AudioClient encapsulates AudioContext, microphone ownership, asset loading, AudioWorklet construction, cancellation and cleanup. React calls start, stop and setMonitoring, then subscribes to immutable snapshots. It never creates browser audio nodes or determines sample timing.

Start must be invoked from a user interaction: context creation/resume happens before asynchronous capture/asset setup. Monitoring is false in a new Rust engine instance. Ready is published only after a worklet snapshot confirms that WASM has processed frames. Monitoring state displayed in the UI is acknowledged by the processing side, rather than optimistically redefined in React.

The graph is mono capture (explicit browser downmix), the worklet invoking Rust process, and stereo duplicated output connected to the destination. No playback/recording is introduced. Rust's public LoopEngine processing and monitoring methods provide the deterministic test seam. Browser infrastructure remains in audio-client and Rust remains browser-independent.

WASM is compiled on the main thread and instantiated during worklet construction. The host creates fixed typed-array views once; the adapter has disjoint 2,048-frame buffers owned by one WASM instance/worklet. WASM calls are serialized. Input is copied, processed and written to both outputs without code-owned periodic allocation or network/DOM/blocking operations in process(). This is a bounded startup/monitoring adapter, not the future recording buffer design. Memory replacement or oversized blocks fail closed.

Commands arrive on the worklet message port; monitoring changes affect subsequent processing blocks. A 100 ms main-thread poll observes frame counters, peak levels and monitoring state. Counters are processing diagnostics, not the future shared transport clock. Snapshot objects are created in message handling, outside process(). UI polling never schedules audio.

Stopping cancels the active startup attempt, stops microphone tracks, disconnects the node and closes the context. A late permission response is released and cannot resurrect a canceled session. Page hide/unmount uses the same cleanup. Errors provide permission/device/asset recovery instructions and allow explicit fresh startup. Basic context interruption fails to a new-session retry; preservation of future recordings/device switching remains #17/#18 work.

Build tools copy Rust WASM and the worklet source into ignored apps/web/public/audio assets before dev/build. The source worklet lives in packages/audio-client. Rebuild audio assets after Rust/worklet changes during development. Assets use Vite BASE_URL for hosted subdirectories.

Verification: native known-sample monitoring tests and production-preview browser tests for the real bridge, explicit monitoring, reset on restart, injected browser permission denial with real successful retry, missing WASM and canceled delayed real capture. Fake Chromium media is not hardware listening evidence. The #5/#6 accepted manual feasibility tests informed this implementation; this production page still needs a wired-device smoke test before merge. No unmeasured latency/glitch or Safari/mobile support claim is made.
