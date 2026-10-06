# Two-track loopstation specification

Specification issue: https://github.com/ty-jt-agent/LoopBeats/issues/2

This checked-in copy supports pull-request review. The GitHub specification issue is authoritative for the subsequent ticket workflow; keep this copy aligned when the specification changes.

## Problem Statement

Live beatboxers and instrumental performers need a browser loopstation that records, layers and launches audio predictably. Independent UI clocks can produce phase errors or cumulative drift, and ambiguous stop/mute/clear behavior can lose a performance. The repository currently contains workspace and skill scaffolding; no audio behavior or runnable application exists.

## Solution

Deliver the first usable two-track milestone on desktop Chrome: immediate recording, synchronized Loop playback, independent One-shot playback, immediate overdubbing, mixing, progress feedback, persistent settings and controlled audio lifecycle recovery. Use wired headphones or an audio interface for the initial live-performance target. Establish browser/WASM feasibility through early spikes before expanding to five tracks.

## User Stories

1. As a live performer, I want to open a browser-based two-track loopstation, so that I can perform without installing a native application.
2. As a live performer, I want to use microphone or audio-interface input, so that I can capture live beatboxing or instruments.
3. As a live performer, I want to receive actionable permission and initialization errors, so that I can recover when audio cannot start.
4. As a live performer, I want to see audio engine and track state, so that I know which operations are available.
5. As a live performer, I want to start recording an empty track immediately with REC, so that I can capture my performance.
6. As a live performer, I want to finish the first Loop recording with REC and hear it repeat immediately, so that I can establish the shared cycle.
7. As a live performer, I want to finish the first Loop recording with track STOP and retain it without playback, so that I can prepare a loop silently.
8. As a live performer, I want to see the 60-second initial recording limit and remaining time, so that capture does not exceed capacity unexpectedly.
9. As a live performer, I want to have recording finish and begin mode-appropriate playback at the limit, so that capture remains bounded.
10. As a live performer, I want to record another Loop at the current cycle position, so that its audio stays aligned with the existing performance.
11. As a live performer, I want to have synchronized capture end after one complete elapsed cycle, so that both loops have equal lengths.
12. As a live performer, I want to finish synchronized capture early and leave other cycle positions silent, so that short phrases retain their intended phase.
13. As a live performer, I want to stop synchronized capture while retaining recorded audio and silence, so that I can use the result later.
14. As a live performer, I want to start Loop playback at the current shared cycle position, so that tracks join in phase.
15. As a live performer, I want to keep the transport advancing when tracks are stopped individually, so that later playback still joins the shared phase.
16. As a live performer, I want to stop all playback and reset transport position with global STOP, so that I can restart predictably.
17. As a live performer, I want to discard unfinished initial recordings on global STOP while keeping completed audio and overdubs, so that existing work survives.
18. As a live performer, I want to restart a stopped transport with Loop PLAY and start only the selected track, so that other tracks remain stopped.
19. As a live performer, I want to retain the shared cycle after clearing any or every track, so that new loops preserve session timing.
20. As a live performer, I want to reset the session explicitly, so that I can clear recordings and establish a different shared cycle.
21. As a live performer, I want to record a One-shot independently of the shared cycle, so that I can capture a phrase of its own duration.
22. As a live performer, I want to hear a One-shot from the beginning exactly once, so that I can trigger a complete phrase.
23. As a live performer, I want to retrigger a One-shot from the beginning with PLAY, so that I can restart it during playback.
24. As a live performer, I want to have global STOP stop One-shots too, so that all recorded playback ends together.
25. As a live performer, I want to change playback mode only while stopped while retaining audio, so that changes are predictable.
26. As a live performer, I want to switch to Loop only when a recording matches the established cycle length, so that tracks remain synchronized.
27. As a live performer, I want to use a compatible existing recording to establish a cycle when none exists, so that I can reuse a One-shot as a Loop.
28. As a live performer, I want to overdub a playing Loop immediately with REC, so that I can build layers during performance.
29. As a live performer, I want to start synchronized playback and overdubbing on a stopped Loop with running transport, so that I can add to it immediately.
30. As a live performer, I want to finish overdubbing with REC while playback continues, so that the layered loop remains audible.
31. As a live performer, I want to retain overdub additions when stopping midway through a cycle, so that captured work is not lost.
32. As a live performer, I want to overdub across multiple cycles without changing loop length, so that I can accumulate layers.
33. As a live performer, I want to add new input while keeping previous audio at full volume with output clipping protection, so that layering remains usable.
34. As a live performer, I want to have only one recording or overdub operation active at once, so that capture ownership is unambiguous.
35. As a live performer, I want to clear a recording before recording a One-shot again, so that its replacement is deliberate.
36. As a live performer, I want to adjust each track's volume and master volume, so that I can balance the mix.
37. As a live performer, I want to mute a track while its playback position advances, so that unmuting preserves its place.
38. As a live performer, I want to continue recording and overdubbing while muted, so that mute does not change capture.
39. As a live performer, I want to have a muted One-shot finish normally, so that silence does not pause its lifecycle.
40. As a live performer, I want to enable input monitoring explicitly and start every new session with it off, so that live input is heard only when requested.
41. As a live performer, I want to confirm CLEAR by default while audio continues, so that I can avoid accidental deletion during playback.
42. As a live performer, I want to cancel CLEAR confirmation without changing state, so that I can preserve the performance.
43. As a live performer, I want to disable or reenable CLEAR confirmation in persistent settings, so that I can choose my preferred interaction.
44. As a live performer, I want to persist track modes, volumes, mutes, master volume and preferred input, so that settings survive reload.
45. As a live performer, I want to fall back gracefully when the preferred input is unavailable, so that setup can continue.
46. As a live performer, I want to receive a leave-page warning when recordings exist, so that I understand that audio is temporary.
47. As a live performer, I want to stop playback and capture before changing input devices while retaining completed recordings, so that switching is controlled.
48. As a live performer, I want to retain completed recordings after interruption or disconnection and explicitly reinitialize audio, so that recovery is predictable.
49. As a live performer, I want to see loop progress derived from engine state, so that visual feedback agrees with audible playback.
50. As a live performer, I want to keep loops synchronized during long playback and busy React rendering, so that interface activity does not disrupt timing.

## Implementation Decisions

- Retain React/TypeScript/Vite as the presentation layer, Web Audio as browser host, AudioWorklet as the real-time boundary, and a portable Rust/WASM LoopEngine. Foundation tooling and browser/WASM spikes precede feature slices; feasibility is not yet demonstrated.
- Encapsulate browser audio lifecycle, input routing, commands and the worklet/WASM bridge in AudioClient. Domain types describe commands and engine snapshots; React does not implement a second state machine. Keep the Rust core independent of React and browser APIs.
- LoopEngine exposes a small processing, command, snapshot and reset interface. Test its externally observable samples and state. Internal buffers remain private. Commands become effective on the authoritative engine sample timeline; JavaScript event timestamps and UI timers are not timing authorities.
- Use explicit track states Empty, Recording, Playing, Overdubbing and Stopped. Mute is independent of playback/capture state. The engine enforces transitions and the single active capture rule; the UI reflects availability.
- Capture mono audio and send playback through both output channels. Preserve a future stereo path. Initial recordings are bounded to 60 seconds at the active sample rate; display capacity and remaining time.
- With no shared cycle, first Loop REC begins immediately. REC again completes it, establishes its exact sample length, starts transport at zero and begins looping. The limit performs the same completion. Track STOP completes and establishes length but leaves both track and transport stopped.
- Once a cycle exists, empty Loop capture starts immediately at current cycle position, writes audio into corresponding cycle positions across wraparound, and completes after one full elapsed cycle. Early REC completion begins synchronized playback and leaves uncaptured positions silent. Track STOP retains the same full-length recording and leaves that track stopped.
- Example: A establishes four seconds; B captures from cycle position two seconds for one second. B contains that phrase at positions two to three seconds and silence elsewhere. It is not rotated to position zero. Full-cycle capture starting at two seconds covers every position once.
- PLAY on a Loop joins current cycle position. Individual track stops do not stop transport, even when every track is stopped. Global STOP stops every track including One-shots and resets position to zero, discards unfinished initial recordings, and retains completed recordings and overdub additions.
- Once a cycle exists, REC is disabled while transport is stopped. Loop PLAY restarts transport at zero and starts only the selected track. Clearing tracks does not remove the shared cycle; explicit session reset clears all recordings, cycle and transport.
- One-shot captures independently until REC completion or 60 seconds, then plays from zero once and stops. It neither follows nor establishes the shared cycle. PLAY retriggers it from zero even during playback. Existing One-shot REC is disabled until CLEAR; no One-shot overdubbing.
- Mode changes require a stopped track and retain audio. Switching to Loop with an established cycle requires exact sample-length compatibility. An existing One-shot switched to Loop with no cycle establishes it on PLAY or REC. These semantics follow the accepted shared-cycle/One-shot ADR.
- Loop REC during playback begins immediate overdubbing. On a stopped Loop with running transport it begins synchronized playback plus overdubbing. REC again ends overdubbing with playback continuing; track/global STOP retain additions so far. Mix incoming audio additively with existing audio at full volume; fixed loop length and multiple overdub cycles are supported.
- Protect output against clipping. The protection algorithm and buffer/memory strategy are technical decisions to resolve through measurements and focused specifications, without silently changing additive overdub semantics. Do not claim an unmeasured latency or glitch guarantee.
- Only one initial recording or overdub is active across the session. Other tracks may play; competing REC actions are unavailable. Capture completion for the active track remains available.
- Provide per-track REC/PLAY/STOP/CLEAR, playback mode, volume, mute, engine-derived progress/state; master volume; global STOP/session reset; input selection; monitoring; and clear-confirmation settings. Presentation quality is secondary to reliable audible behavior.
- Muting silences a track's playback contribution without stopping its position, initial capture or overdub. Muted One-shots still finish. Monitoring defaults off and always resets off in a new session.
- Global transport control clarification (owner-approved 2026-10-06): Global STOP is available while any track is Recording, Playing or Overdubbing. When no track is active, the control becomes Global Start and starts all playable retained recordings together through one audio-thread command; Empty tracks remain untouched. With no playable recordings it is disabled. Loop playback joins the shared cycle (or restarts stopped transport at zero); One-shots play once from zero. Idle STOP does nothing, preserving a running cycle after all tracks are cleared.
- CLEAR ends the selected track's playback/capture and removes its recording, returning it to Empty without altering shared cycle. Confirmation is enabled by default and persisted; audio continues while the dialog is open and cancel changes nothing. Disabled confirmation executes CLEAR immediately.
- Persist confirmation preference, track mode/volume/mute, master volume and preferred input outside the audio processing path. Captured audio remains in memory only. Provide a leave-page warning when recordings exist; browser closure prevention is not guaranteed.
- Preferred-input unavailability has a graceful fallback. Device changes require playback and capture stopped; retain completed audio/cycle, reset transport position and reinitialize audio. Interruption/disconnection ends capture, preserves completed audio, stops/resets transport and requires explicit reinitialization. Show actionable initialization/permission errors.
- Avoid network access, DOM access, blocking operations and uncontrolled allocation in real-time processing. UI rendering must not own or schedule sample-level audio behavior.

## Testing Decisions

The user confirmed these boundaries on 2026-09-30. Test externally observable behavior rather than private buffer layouts, message implementations or React internals.

1. **Primary deterministic seam: LoopEngine public interface.** Supply known input samples and commands, process audio, and assert output samples plus public snapshots. Cover both tracks together through this seam rather than creating separate public interfaces for each internal module.
   - Exact recording replay and wraparound without missing or duplicated samples.
   - Shared cycle establishment, phase-joined PLAY, mid-cycle capture across wraparound, early completion silence and full-cycle automatic completion.
   - Sample-exact 60-second capture limit at configured sample rates; REC versus track STOP versus global STOP outcomes.
   - Long multi-track playback across thousands of cycles without cumulative calculated drift.
   - Additive overdub over partial and multiple cycles, fixed length, retention on stop, capture exclusion and clipping protection at the output.
   - Independent One-shot completion and retrigger, mute progression, mode-length compatibility and cycle establishment from an existing recording.
   - Clear preserves cycle; session reset removes it; track stop preserves transport; global STOP resets it and only selected Loop PLAY restarts.
   - Mixing and mono-to-both-output-channel behavior with deterministic sample fixtures.
2. **Browser audio integration seam: AudioClient through the actual AudioWorklet/WASM boundary.** Verify initialization, input/permission failures, command and snapshot round trips, interruption recovery, device changes and retained completed audio. Demonstrate ongoing audible/recorded processing while React/main-thread work is busy. Mocks alone do not establish real audio feasibility.
3. **User interface seam: observable browser interactions.** Verify button availability and engine-state presentation, progress, clear confirm/cancel/disabled-confirmation behavior, persisted settings, monitoring off on new session, input fallback and error/recovery controls. Use browser tests for reproducible interactions and manual audio checks for hardware-dependent behavior.

**Prior art:** the repository currently has only a scaffold structural check and an empty Rust workspace; there are no behavioral tests or existing audio seams to reuse. Introduce Cargo tests and deterministic sample fixtures for the primary seam, TypeScript tests as needed for controller/settings behavior, and Playwright for browser interactions after foundation tooling exists. Do not present scaffold checks as proof of audio correctness.

**Evidence gates:** establish foundation compile/format/lint/unit/build/browser checks, then record browser-audio and WASM-spike evidence. Desktop Chrome is first milestone acceptance; conduct early mobile spikes and record browser/device/sample-rate/latency observations, including relevant Safari/iOS/Android limitations. Cross-device production support remains a later milestone. Manual wired-device audio verification complements automation. Performance thresholds and algorithms need measured evidence rather than invented values.

## Out of Scope

Five-track expansion; polished RC-505-style/mobile interface; stereo capture; musical BPM, metronome, quantization and armed scheduling; effects; feedback adjustment; undo/redo; recording/session persistence; import/export; MIDI/controllers; PWA/offline/native wrappers; accounts, cloud/social/collaboration, server audio, AI music, DAW editing, plugin hosting and mastering.

## Further Notes

- This is the specification for the confirmed first usable milestone, not a request to implement the entire roadmap at once. Deliver small independently verifiable vertical slices after foundation and feasibility gates.
- Specification and test boundaries are confirmed; implementation tickets and their dependency graph require the subsequent to-tickets/to-issues workflow and review. The ready-for-agent label follows to-spec publishing convention and does not bypass prerequisite evidence or ticket readiness.
- Source of truth: [confirmed design](https://github.com/ty-jt-agent/LoopBeats/blob/4de04c1a46c2bb32210bcb883d5699272280be85/docs/architecture/first-usable-milestone.md), [glossary](https://github.com/ty-jt-agent/LoopBeats/blob/4de04c1a46c2bb32210bcb883d5699272280be85/GLOSSARY.md), and [accepted timing ADR](https://github.com/ty-jt-agent/LoopBeats/blob/4de04c1a46c2bb32210bcb883d5699272280be85/docs/adr/0001-shared-cycle-and-independent-one-shot.md).
- The original roadmap's single-track milestone and deferred overdub/shared-transport/mixing order are superseded by this confirmed two-track scope.
