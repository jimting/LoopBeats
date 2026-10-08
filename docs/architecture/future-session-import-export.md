# Future session import and export

Status: planning note, requested 2026-10-06, updated after the 2026-10-07 product
decision. Outside #43/#44 and the current two-track milestone; not a reviewed
implementation specification or ready ticket.

[ADR-0002](../adr/0002-portable-sessions-and-recovery.md) governs the agreed
format, import consent and recovery direction. Use “session” for the live
workspace and “session file” for its portable saved representation; saved
application preferences alone do not include audio.

## Resolved product decisions

- Export a versioned ZIP containing `session.json` and one WAV per recorded
  track. Include completed recordings only, Loop/One-shot mode, track gain and
  mute, master gain, shared cycle length and source sample rate.
- Validate the complete archive before replacing the current session.
- For differing sample rates, warn that conversion will occur and may affect
  fidelity. Convert only after acceptance; then request replacement confirmation
  if the current session contains recordings.
- Successful import replaces the session, opens retained recordings stopped
  (unrecorded tracks remain Empty), resets transport to zero and disables
  monitoring. Device identifiers, permissions and active capture are not restored.
- Cancellation, conversion rejection or invalid input leaves the current session
  unchanged.
- Maintain automatic browser recovery snapshots and offer recovery after restart.
  Preservation of in-progress capture is a proposed recovery capability, with
  exact incomplete-capture and overdub behavior still open.

## Deferred scope

Standalone WAV downloads for individual tracks and mixed output are separate
audio-export features and are deferred from ADR-0002. Their inclusion, gain/mute
treatment and mixed-output duration must be resolved before generating tickets
for that feature.

## Questions for the implementation specification

Define the manifest schema/version and migration policy, supported WAV sample/
channel formats, audio fidelity requirements and archive size/capacity limits.
Define safe handling of corrupt, unsupported and oversized input and atomic
replacement behavior when validation or conversion fails.

Choose the resampling algorithm, duration/shared-cycle alignment tolerances and
capacity checks. Define whether manual export requires playback/capture stopped
or obtains a consistent engine-owned snapshot while playback continues.
Serialization, file I/O, validation and resampling must not block or allocate
uncontrollably on the audio processing thread; specify the snapshot transfer seam.

Define recovery checkpoint timing, the recovery prompt, incomplete-capture and
overdub behavior, retention, quota/write-failure feedback and storage-loss
limitations. Browser recovery cannot guarantee every sample survives a crash.

## Specification and ticket readiness

Before implementation, produce a reviewed specification with small observable
stories for completed-session export/round trips, atomic import and cancellation,
consented sample-rate conversion, and browser recovery. Each implementation
ticket must link the parent specification, identify dependencies and state
acceptance criteria at the agreed public seam.

Acceptance should include completed audio/configuration round trips, preserved
Loop phase and independent One-shot lengths, replacement cancellation, conversion
rejection, malformed/unsupported/oversized files, cross-sample-rate timing and
numerical WAV checks. Recovery acceptance must cover checkpoint writes, prompting,
incomplete capture/overdub, write failures and retention.
