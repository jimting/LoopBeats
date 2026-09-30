# Web Loopstation development plan

Repository planning baseline adapted from the supplied development plan. Issue generation is explicitly deferred.

## Confirmed milestone update (2026-09-30)

The confirmed design in [first-usable-milestone.md](architecture/first-usable-milestone.md) governs the first usable version. It supersedes the original single-track-first product milestone and later-only sequencing of overdub, shared transport and mixing below: deliver two synchronized tracks, independent One-shot playback, overdubbing, mixing and settings through small slices, then expand to five. Historical phase descriptions below are roadmap context; do not use them to override the confirmed behavior. Foundation tooling and browser/WASM spikes remain prerequisites. See ADR-0001 for shared-cycle alignment.

## Product and priorities

Build a browser multi-track loopstation inspired by RC-505. Desktop, tablet and phone users should request microphone or audio-interface input, record loops, overdub, synchronize tracks and mix them. Web-first with a portable Rust engine preserves a later native option.

Order of priorities: correct timing, stable playback, low perceived latency, browser/device coverage, predictable architecture, testability, small independently verifiable steps.

Production-capable target: five tracks; record/play/stop/overdub/clear; track gain/mute; master gain; shared transport; loop synchronization and visual progress; input monitoring; latency diagnostics; persistent application settings.

Later: undo/redo, effects, quantization, BPM detection/tap tempo/metronome, loop import/export, local session save/load, MIDI/controllers, PWA/offline and native wrappers. Settings persistence and full session persistence are different scopes.

MVP excludes cloud accounts, social features, remote collaboration, server audio, AI generation, full DAW editing, arbitrary waveform editing, MIDI sequencing, plugin/VST/AU hosting and mastering tools. Validate reliable browser looping first.

## Target architecture

React + TypeScript + Vite → EngineController/audio-client → Web Audio + AudioWorklet → Rust/WASM.

React renders controls, track/transport state, meters and progress and sends commands. It never owns sample timing. Web Audio owns input/output, device routing, graph lifecycle, AudioContext and sample rate. Typical graph: MediaStreamAudioSourceNode → AudioWorkletNode → GainNode → AudioDestinationNode.

AudioWorklet receives actual host blocks, executes controlled commands, invokes Rust and returns output. Avoid DOM/network access, blocking work and unnecessary allocations. Rust encapsulates transport, track state, buffers, commands, mixer and DSP behind process, command, snapshot and reset. Candidate modules: transport.rs, track.rs, loop_buffer.rs, mixer.rs, command.rs, state.rs, dsp/ and lib.rs. Add them as specified behavior requires, not as empty abstractions now.

The engine sample timeline is authoritative. At 48,000 Hz, a 192,000-frame loop repeats every four seconds; loop position derives from transport position modulo loop length. UI timers and animation frames only approximate visual position. The engine resolves command execution at sample positions, including future quantized commands.

One LoopEngine owns multiple tracks and one transport. Do not duplicate independent engines. Browser infrastructure stays behind audio-client; React cannot reach internal buffers. Persistence stays outside real-time processing.

## Domain and open decisions

Use `GLOSSARY.md` across UI, code, tests, issues, ADRs and PRs. Domain modeling must resolve track lifecycle explicitly. Candidate lifecycle: Empty → Recording → Playing, with Overdubbing, Stopped and clear-to-Empty transitions. Mute advances silently and differs from stop. Armed/quantization semantics are future decisions; avoid impossible boolean combinations.

Resolve before the relevant feature: initial/resume transport behavior, immediate versus boundary-scheduled commands, master loop-length ownership, relative lengths of multiple loops, mono/stereo representation, maximum duration, buffer allocation/capacity, invalid commands, overdub feedback/clipping, stopping mid-cycle and undo memory strategy.

## Skills workflow

`setup-matt-pocock-skills` configured GitHub Issues, default triage roles and shared root glossary with `docs/adr/`. The repo vendors upstream engineering skills for Codex. Local `to-issues` is a compatibility alias of `to-tickets`.

Normal sequence: grill-with-docs → domain vocabulary and ADRs → to-spec → GitHub spec issue → to-tickets/to-issues → reviewed dependency graph → implement/implement-spec with domain-modeling, codebase-design and tdd → code-review against engineering standards and originating spec → pr → merge → retro.

Use prototype to answer architectural/interaction questions, research for runtime facts, diagnosing-bugs for reproducible audio failures. A prototype is disposable evidence, not production code. Improve architecture every 3–5 substantial feature PRs or when knowledge leaks, interfaces grow, state checks duplicate or tests become difficult.

## Phases and evidence

| Phase | Deliverable | Verification |
| --- | --- | --- |
| 0: Foundation | Workspace tooling, formatting, lint, unit/browser tests, CI, skills, glossary, ADR layout and contributor guide | Real npm test/lint/typecheck/build, Cargo fmt/clippy/test, WASM build and browser smoke gates; current setup only covers scaffolding and skills |
| 1: Browser audio spike | Minimal getUserMedia → AudioContext → AudioWorklet → output; findings in docs/research/browser-audio-spike.md | Permission/startup flow, sample rate, latency hints, stable input/output across desktop Chrome/Safari, Android Chrome and iOS Safari |
| 2: Rust/WASM spike | Worklet calls WASM gain processing | Reliable initialization, continuous blocks, no periodic allocations or obvious glitches; understood fallbacks; revisit architecture if fundamentally unsuitable |
| 3: Single-track engine | Empty → Record → Finish → Play → Stop → Resume → Clear | Exact captured samples repeat; loop wraps without cumulative drift; clear returns Empty |
| 4: Minimal UI | REC/PLAY/STOP/CLEAR, state/progress/permission/engine indicators | UI exposes engine state and sends commands without duplicating logic |
| 5: Overdub | Mix incoming input onto an existing loop | Specify start/stop boundaries, partial cycle handling, additive versus replacement, clipping, feedback and future undo needs first |
| 6: Shared transport | Explicit deterministic authoritative timeline | Defined start/stop semantics and operations targeting sample positions; future musical quantization seam |
| 7: Five tracks | One engine with tracks array and common transport | Independent mute/clear/overdub with long-running synchronization and no relative drift |
| 8: Mixing | Per-track gains, master gain and appropriate clipping protection | Mathematical sample-level tests; UI gain/mute controls |
| 9: Hardware-style UI | Desktop five-track view and a separately designed touch-first mobile view | Compare alternative mobile prototypes; layout/accessibility and responsive verification |
| 10: Musical timing | BPM, beats/bar, count-in, metronome, quantized operations | Domain/spec review; scheduling belongs in engine, never UI delays |
| 11: Effects | Input → input FX → track/track FX → mixer → master FX → output | Prove one small effect-chain abstraction with gain, then filter/delay/reverb |
| 12: Undo/redo | Previous/current buffers and overdub generations | Research predictable memory costs before implementation |
| 13: Save/export | Track/session export and local save/restore | IndexedDB; supported File System Access API with Blob fallback; persistence outside callback |

Do not build five tracks, effects or polished UI before proving a single audible loop. Each phase should produce observable evidence, not layer-only construction.

## Performance and tests

Measure actual sample rate, baseLatency, outputLatency where available, processing time, glitch/underrun indicators, main-thread frame time, WASM and loop-buffer memory. Processing must remain comfortably below block duration. Software sample calculations must not accumulate drift. A busy UI must not interrupt audio. Memory scales with sample rate × channels × bytes/sample × duration × track count, plus undo generations and overhead. Diagnostics must not themselves disrupt the callback. Numerical latency promises require browser/device evidence.

Strongest layer: pure Rust tests for wraparound, buffers, states, commands, overdub, mixer, transport and long synchronization. TypeScript tests cover command translation, controllers, application state and serialization. Integration tests cover controller/worklet/WASM communication. Deterministic golden samples test DSP, e.g. gain 0.5 on [1, 0.5, -0.5] produces [0.5, 0.25, -0.25]. Playwright covers startup, mockable permission/error UI, controls, responsive layout and engine initialization/state transitions.

Manual matrix: Windows Chrome/Edge, macOS Chrome/Safari, iPhone/iPad Safari, Android Chrome; built-in microphone, wired headset, Bluetooth and USB interface where available. Record Bluetooth latency separately. Browser background behavior, startup policies, getUserMedia constraints, SharedArrayBuffer requirements and WASM loading require research instead of assumptions.

## Ticket and PR rules

One ticket per verifiable behavior. Suggested dependency direction: foundation → browser/worklet/WASM spikes; domain model → single-track engine → browser bridge → single-track UI; then overdub → shared transport → multi-track → mixer and multi-track UI. These are candidate dependencies, not published issues or invented issue numbers.

Definition of Ready: understandable behavior, defined terms, known dependencies, acceptance criteria, resolved important decisions and a test seam. Return to grill-with-docs when missing.

Definition of Done: specified behavior implemented, appropriate tests/static checks passing, relevant real-browser verification, domain/architecture docs updated, code review complete, PR evidence and no unresolved known regression. Compiling alone is insufficient.

Prefer small PRs: skeleton/CI, browser spike, worklet/WASM, pure single-track engine, bridge, UI, overdub, transport, multi-track. A PR should explain change, architecture, verification, material risks and reversibility. Review against both repository standards and source specification.

Candidate ADR topics: Web Audio as browser host, AudioWorklet processing boundary, Rust/WASM core, engine-owned timing, React state ownership, sample-position clock. Record Context, Decision, Alternatives and Consequences after research and review; do not claim spike evidence before measuring.

## First product session and success target

After foundation, grill the first milestone: request microphone, capture one loop, finish, continuously replay, stop/resume and clear. Resolve ambiguities before to-spec and ticket generation.

Core success target: URL startup on desktop/mobile target browsers; microphone permission; five synchronized tracks; record/play/overdub/stop/clear/mute/gain; no cumulative software timing drift; continued audio under busy UI; understandable initialization errors. Effects, full session persistence, MIDI, cloud and visual polish are unnecessary for core validation.

Long term, the same Rust engine can run behind Web/WASM, desktop-native and mobile-native audio hosts. Preserve portability without prematurely implementing native apps.
