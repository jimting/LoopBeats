# Completed session ZIP export (#50)

Status: owner-approved export contract for specification #49.
Source: ADR-0002 and documentation PR #48. This document does not approve
implementation or resolve the later import/recovery slices.

## User-visible behavior

Export session downloads a ZIP containing completed recordings and configuration
for both tracks. Unfinished initial recordings are omitted without finishing or
discarding them. Export never changes playback, capture, monitoring or settings.
Export is unavailable during overdub: finish overdub first to obtain a stable
completed recording. Playback and initial capture may continue during export.
Explain the completed-only boundary beside the control. Offer keyboard-operable
export/cancel controls, progress and an actionable failure message.

## Portable version 1

The ZIP uses stored entries (no compression), CRC-32 checksums and UTF-8 names.
It contains exactly `session.json` and `tracks/0.wav` / `tracks/1.wav` for tracks
with completed recordings. Empty or excluded unfinished tracks have no WAV.
The filename is `loopbeats-session-<UTC timestamp>.zip`.

The JSON object has `format` equal to `LoopBeatsSession`, `version` equal to 1,
integer `sampleRate`, integer `cycleLengthSamples`, finite `masterGain` from 0
through 1, and a two-element `tracks` array ordered by track ID. Each track has
`id` (0 or 1), `mode` (`Loop` or `OneShot`), finite `gain` from 0 through 1,
boolean `muted`, integer `lengthSamples`, and `audioPath` (its canonical WAV path,
or null when no completed recording is included). Excluded tracks use length 0
but preserve configuration. No transient capture/playback/transport position,
device, permission, meter or monitoring fields are included.

WAV assets are little-endian RIFF/WAVE, mono IEEE float32 (format tag 3), with
`fmt `, `fact` and `data` chunks. Samples retain their original float32 values,
including finite overdub values outside [-1, 1]; export applies no gain, mute,
clamp, normalization or rotation. Lazy-unwritten recording positions become
zero. Length is expressed in frames, never derived from rounded UI seconds.
Source sample rates are integer 8,000 through 192,000 Hz and recordings are at
most 60 seconds each. This permits at most 92,160,000 bytes of sample payload
across two tracks. JSON is bounded to 64 KiB and the complete ZIP to 96 MiB.
Non-finite audio fails export with an error. Future versions require explicit
migration; readers must reject unknown format/version rather than guessing.

## Consistent bounded transfer

AudioClient owns an asynchronous export operation; React never reads buffers.
The processing-side owner selects included completed recordings and configuration
in one acknowledged request. It rejects export if an overdub is active. Export
does not stop the transport or initial capture.

Transfer completed samples in chunks of at most 2,048 frames, with one request
outstanding at a time. Use the engine's existing fixed transfer-buffer capacity;
no recording-sized copy or allocation occurs in a processing callback or worklet
message handler. Serialization, CRC, archive assembly and Blob creation occur on
the main thread or a worker. Allow one export operation per audio session.

A recording/content generation changes on initial capture completion, clear,
reset or overdub mutation. Every chunk checks the captured generation. Metadata
is frozen at request acknowledgement; later gain/mute/mode commands do not change
the archive metadata. Mutating an included recording invalidates the export:
fail rather than emitting a torn snapshot, without rejecting the live command.
Unrelated excluded initial capture may continue. Stop audio, input switching,
interruption, engine failure, cancellation or stale lifecycle responses abort
transfer and release export-owned resources. Use a 30-second inactivity timeout
for an unanswered chunk; cancellation remains available during assembly.

Bound export-owned temporary memory to 384 MiB, separately from existing engine
storage. Preflight lengths and estimated buffers before transfer and handle
allocation failure as an actionable export error. No latency or glitch guarantee
is inferred from these bounds; document a reproducible transfer/load measurement.

## Acceptance at existing public seams

- Public LoopEngine commands/process plus the proposed bounded recording-read
  operation prove exact completed samples, lazy silence, Loop phase, independent
  One-shot length, finite over-range overdub values and omitted unfinished audio.
- AudioClient through actual worklet/WASM proves generation invalidation, bounded
  chunk transfer, simultaneous playback/capture, cancellation, stale response
  rejection and lifecycle cleanup without changing audible sample progression.
- Production browser controls download a ZIP which tests independently decode
  and inspect for CRCs, manifest fields, WAV samples and empty-track metadata.
  Assert control accessibility, busy/cancel states and actionable errors.
- Test maximum two-track capacity, source sample-rate boundaries, JSON/archive
  bounds and memory-preflight failure. Avoid exposing private buffers to React
  or claiming mock-only tests establish audio correctness.

## Review gate

The owner approved this contract before #50 implementation; approval is recorded
in #49. #49 remains open during delivery. Later tickets must separately specify
atomic import, conversion and recovery; this contract does not authorize those
behaviors.
