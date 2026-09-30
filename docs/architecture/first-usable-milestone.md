# First usable LoopBeats milestone
Status: confirmed product design
Confirmed: 2026-09-30 (Asia/Taipei)
Source: grill-with-docs interview, Q1–Q35 and final shared-understanding confirmation.
Repository: ty-jt-agent/LoopBeats

This document records the agreed behavior for specification and ticket creation. It supersedes the original single-track milestone and later-only overdub/shared-transport/mixing ordering. It does not authorize product implementation or issue generation by itself.

## Scope and sequencing

The first usable milestone supports two tracks, synchronized loops, independent one-shot playback, immediate overdubbing, mixing, settings and input lifecycle handling. Expand to five tracks afterward.
Target live beatboxing/instrument looping with wired headphones or an audio interface. Desktop Chrome is the first acceptance target; run early mobile browser audio spikes before expansion. Record mono and play through both output channels. Preserve a future stereo path.
Retain React/TypeScript/Vite, Web Audio/AudioWorklet and a portable Rust/WASM engine as the target architecture. Browser and WASM feasibility remain research gates, not measured claims.
Complete foundation tooling and spikes, then deliver small verified slices toward this milestone. UI timing never controls audio timing.

## Recording and shared cycle

- On an empty track, REC begins capturing immediately. Only one track can record or overdub at a time. Other tracks may continue playback; additional REC actions are disabled during capture.
- Without a shared cycle, the first Loop recording continues until REC, track STOP, or the 60-second limit.
- REC again finishes the first Loop recording, establishes its duration as the shared cycle length, starts the transport at cycle position zero and immediately loops the recording.
- At the 60-second limit, finish recording automatically and begin playback according to the track mode. Display the limit and remaining time.
- Track STOP during the first Loop recording finishes and retains the audio, establishes the cycle length, and leaves track and transport stopped.
- Once a cycle exists, an empty Loop track captures immediately at the current cycle position and automatically finishes after one complete cycle of elapsed capture. The recording retains the same shared cycle length.
- REC again finishes a synchronized recording early, leaves unrecorded cycle positions silent and begins synchronized playback.
- Track STOP during synchronized recording retains captured audio and silence in unrecorded positions, leaving the track stopped.
- Example: A establishes four seconds. B starts recording at position 00:02 and finishes one second later. Its captured audio belongs at positions 00:02–00:03; the rest is silence. A full four-second capture starting at 00:02 crosses the boundary and covers every cycle position once.
- The cycle length remains until explicit session reset, even when the establishing track or every track is cleared. One-shot recording never establishes the shared cycle.

## Playback and transport

- Loop tracks join the current cycle position when PLAY is pressed. If A is at 00:02 of four seconds, B starts at its own 00:02.
- Stopping an individual track does not stop the transport. The transport advances even if all tracks are stopped.
- Global transport STOP stops every track, including One-shot playback, and resets transport position to zero.
- Global STOP discards unfinished initial recordings and retains completed recordings plus overdub additions captured so far. Once a cycle exists, REC is disabled while the transport is stopped.
- Loop PLAY restarts a stopped transport at position zero and starts only that track; other stopped tracks remain stopped.
- An existing One-shot switched to Loop before any cycle exists establishes the shared cycle when PLAY or REC starts it.
- Session reset clears every track and resets the cycle and transport.

## One-shot and playback mode

- One-shot records independently of any shared cycle until REC again or the 60-second limit, then plays from its beginning once and stops.
- One-shot playback neither follows nor changes the shared cycle. Global STOP still stops it.
- PLAY retriggers a One-shot from the beginning, including while already playing.
- Existing One-shots cannot overdub or be rerecorded without CLEAR; REC is disabled until cleared.
- Playback mode can change only while the track is stopped, preserving its audio.
- Switching to Loop with a shared cycle requires exactly matching recording length. A different-length One-shot remains ineligible.
- Mute silences a One-shot while it advances; it still stops at its end.

## Overdub

- On a playing Loop track, REC immediately begins overdubbing. On a stopped Loop track with a running transport, REC begins synchronized playback and overdubbing together.
- REC again ends overdubbing while playback continues. Track STOP keeps additions captured so far and stops that track.
- Mix new input into the existing recording, keeping previous audio at full volume. Loop length stays fixed.
- Overdub may span multiple cycles. Ending mid-cycle retains additions captured so far.
- Protect output against clipping. Feedback adjustment and undo/redo are deferred.
- Only one capture operation is active across the session. One-shot overdubbing is unavailable.

## Clear and mixing

- CLEAR removes the recording, ends that track's capture/playback and returns it to Empty.
- Confirmation defaults enabled, controlled by persistent "Confirm before clearing" settings.
- While confirmation is open, audio continues. Cancel changes nothing. With confirmation disabled, CLEAR executes immediately.
- Clearing a track never changes the shared cycle.
- Include per-track volume and mute, master volume, playback-mode selection, REC/PLAY/STOP/CLEAR and an input-monitoring toggle.
- Muting removes playback output while position advances. It does not stop recording or overdubbing.
- Monitoring defaults off and is explicitly enabled by the user. Opening a new session always resets it to off.

## Persistence and audio lifecycle

- Persist CLEAR confirmation, per-track mode/volume/mute, master volume and preferred input device.
- Recordings are temporary in-memory audio; they do not survive reload. Provide a leave-page warning when recordings exist. Do not represent that warning as guaranteed prevention of browser closure.
- If a preferred input is unavailable, fall back gracefully.
- Changing the input device requires playback and capture to be stopped first. Retain completed audio and shared cycle, reset transport position and reinitialize audio before continuing.
- On audio interruption/device disconnect, end capture, retain completed audio in memory, stop/reset transport, and require explicit user action to reinitialize audio.
- Permission/initialization errors must be understandable and actionable.

## Architecture and verification implications

The engine owns an authoritative sample-position timeline, cycle alignment, capture and overdub behavior. UI state represents engine state. Commands must execute through a controlled audio boundary, without network/DOM/blocking operations or uncontrolled real-time allocation.
Sample-level tests must verify alignment, exact cycle wraparound, early-finish silence, one-shot completion/retrigger, stop versus mute, retained overdubs and reset behavior. Long playback must show no cumulative software drift. Browser evidence must cover audio startup/errors and operation under busy UI. The first two-track milestone must demonstrate real synchronization; five tracks, quantization/BPM, effects, undo, session persistence and native hosts remain later work.

## Next workflow

Use this confirmed design with GLOSSARY.md and relevant ADRs as inputs to to-spec. Then to-tickets/to-issues proposes a reviewed dependency graph before publishing. No specification issue or implementation tickets were generated during this design-save operation.
