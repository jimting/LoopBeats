# Rust/WASM AudioWorklet feasibility spike

Issue: [#6](https://github.com/ty-jt-agent/LoopBeats/issues/6). Observed 2026-10-01.

## Decision

**Limited GO for the production AudioClient design.** Rust/WASM initializes inside a real AudioWorklet, processes a known gain operation, and runs continuously with Chromium synthetic microphone capture. Fixed memory and buffers are viable for this narrow operation. Physical audible stability and Safari/mobile compatibility still require manual evidence; this is not certification of a future loop engine.

The user completed #5's device checklist, merged PR #23 and closed #5. The #6 page adds WASM to that experimentally verified host path. Do not assume #5's audible result proves this new WASM path.

## Boundary and build

`crates/wasm-gain-spike` is disposable and independent of `crates/loop-engine`. No production engine behavior is added. Rust exports fixed input/output pointers, capacity and a block gain function. The host compiles the module asynchronously on the main thread, sends the compiled module through processorOptions and instantiates it during worklet construction. Per-instance 2,048-frame mono input/output buffers are allocated statically; JavaScript views are created once. The worklet copies samples into WASM, invokes one block operation, and duplicates mono output to stereo.

The processing callback contains no module download/compile, allocation owned by this code, memory growth, messages, DOM or blocking operation. Browser-managed input/output arrays are outside the code's allocation control. Snapshot objects are created in message handlers. This experiment does not measure GC or diagnostic message overhead. Rust unsafe buffer access is restricted to the WASM adapter with bounded lengths and a serialized single-worklet ownership contract.

Run with Node 24 and Rust/rustup installed:

```bash
npm ci
npm run spike:wasm
```

This builds and copies the ignored generated WASM binary before opening `/wasm-audio-spike/index.html`. For preview/deployment, run `npm run spike:wasm:build` before `npm run build`; the binary is then copied with Vite public assets. No generated binary is committed. `npm run test:browser` builds the spike automatically and requires Cargo on PATH. CI builds and exercises the same path.

## Evidence

Raw observations: [wasm-audio-observations.json](wasm-audio-observations.json). Headless Chromium 145.0.7632.6 on Linux; the Playwright Desktop Chrome profile's user agent identifies Windows, which is not the actual host OS.

| Scenario | Observed result | Limit |
| --- | --- | --- |
| Rust known-output test | `[1, 0.5, -0.5]` at gain 0.5 yields `[0.5, 0.25, -0.25]` | Gain operation only |
| Three fresh offline instances | Each renders 1,440,000 frames at 48 kHz; sampled boundaries and final sample equal 0.25 from constant input 0.5 | Offline graph, no physical output |
| Offline rendering cost | 79.5, 77.7 and 68.4 ms for 30 seconds of audio (0.228–0.265% wall/audio ratio) | End-to-end throughput includes graph/bridge overhead; not per-callback CPU cost, worst-case execution time or scheduling guarantee |
| Memory | Initial and final linear memory 1,114,112 bytes in all offline and real-time runs | No observed memory growth; static 16,384 bytes for the two sample buffers, remaining linear memory includes compiler/runtime layout |
| Three real-time startup/stop cycles | Fake microphone, 44.1 kHz; roughly five seconds of monitoring per run, then artificial main-thread load and recovery | No physical microphone, headphone or audible verification |
| Known real-time gain | Cumulative worklet output RMS/input RMS equals 0.5; downstream meter receives nonzero signal | Monitoring additionally applies 0.2 gain; instantaneous analyser may sample silence from intermittent fake input |
| Main-thread load | Frames advance by 44,032 / 44,160 / 44,032 across 500 ms busy loop plus 500 ms recovery | Counter advancement does not prove absence of glitches |
| Blocks and failures | Observed 128-frame blocks; zero worklet-reported failures and page errors | Not a universal block-size promise or underrun detector |

At 48 kHz a 128-frame block represents about 2.67 ms. The offline wall/render ratio is a cost proxy, not proof every real-time callback meets that deadline. Per-callback CPU profiling and hardware listening remain follow-up evidence.

## Initialization and fallback limitations

- Requires secure-origin microphone access, AudioWorklet, WebAssembly and support for cloning a compiled WebAssembly.Module into processorOptions. Only Chromium was exercised here.
- Fetch/compile and module installation occur before node construction. Instantiation and view allocation occur once in the constructor; their worklet-thread startup cost is unmeasured and must be controlled before supporting active-session replacement.
- Missing/invalid WASM, missing APIs or unsupported module cloning surface an actionable startup error and release capture resources. There is intentionally no JavaScript processing fallback that could hide WASM failure.
- Blocks larger than 2,048 frames or changed linear-memory size fail closed; the page disables monitoring and reports the failure. This is an experiment capacity, not a production buffering decision.
- Mono downmix/stereo duplication and fixed gains are deliberate spike restrictions. No stereo engine, device selection, session recording or effects system is implied.
- The copied #5 lifecycle remains disposable: pending permission cancellation, interrupted context recovery, mobile activation behavior and input disconnection need the production AudioClient ticket.

## Manual device checklist

Use desktop Chrome with wired headphones first. For phones use an HTTPS origin, not plain HTTP over a desktop LAN address.

- [ ] Start and enable monitoring; hear microphone audio through WASM for at least 60 seconds. Record delay/clicks/pops/dropouts.
- [ ] Disable monitoring and Stop; confirm silence and microphone release.
- [ ] Repeat startup/stop three times; confirm no initialization errors.
- [ ] Run the 30-second offline probe; sample values should all be 0.25, memory should remain unchanged, failures should be zero.
- [ ] Download diagnostics while running; record OS/device, exact browser version, microphone/output hardware and any failure steps.

Desktop physical audio: pending. Safari/macOS, Chrome/Android and Safari/iOS: not run, hardware unavailable. Keep #6 open until normal-load physical audio observations are added. Proceed to #7 after this gate is reviewed; do not promote this page into the production AudioClient.
