# In-progress capture and overdub recovery (#54)

Status: owner-approved on 2026-10-10 under #49.
#53 is merged. This extends its atomic storage, explicit recovery, tab ownership,
consent, failure handling and lifecycle contract; manual export stays unchanged.

## Recovered recording semantics

Freeze one engine-owned checkpoint at an acknowledged processing boundary.
Capture and playback continue. The snapshot represents samples/configuration
at that boundary, not at the later storage-completion timestamp.

- First Loop capture without a shared cycle: retain exactly the captured prefix.
  If positive, establish its captured length as the recovered shared cycle and
  restore it Stopped. No rounding, appended silence or resumed capture.
- Loop capture joining an existing cycle: retain the full existing cycle length.
  Keep captured samples in their original cycle positions, including wrapping;
  positions not yet captured at the boundary are zero. Restore Stopped with the
  original shared cycle. Zero captured frames means Empty, with the shared cycle
  retained for other tracks.
- Independent One-shot capture: retain exactly the captured prefix, Stopped.
  Do not establish/change the shared cycle. Zero captured frames means Empty.
- Overdub: retain the completed base recording plus additions made through the
  checkpoint boundary, including partial and multiple passes. Keep its fixed
  Loop length and raw finite float32 values, including values beyond [-1, 1].
  No gain, mute, clamp or normalization is applied to stored samples.

Preserve all track configuration, master gain and compatible shared-cycle
metadata. Other completed recordings are included. If a first-Loop checkpoint's
new cycle conflicts with another retained Loop, reject the candidate rather than
silently changing modes/lengths; keep the previous successful checkpoint and
explain the compatibility error. Capacity remains 60 seconds per track at the
engine's sample rate, with existing archive and decoded-memory limits.

Every successful recovery opens recorded tracks Stopped, unrecorded tracks Empty,
transport stopped at zero, monitoring off. It never restores microphone capture,
permission/device selection or the former transport position. Manual ZIP export
continues to omit unfinished initial capture and reject active overdub; recovery
is a separate internal snapshot operation, not an export option exposed to React.

## Consistent bounded snapshot mechanism

Reuse the engine's preallocated two-track import staging bank as the frozen
checkpoint bank. Snapshot and import ownership are mutually exclusive; no third
recording bank is allocated. Begin freezes scalar metadata and starts new lazy
validity generations in that bank, without copying whole recordings.

Use copy-on-write: before a live capture/overdub write can change a position
included in the checkpoint, preserve its old logical value in the checkpoint
bank if not already frozen. Lazy-unwritten samples freeze as zero. A validity
bit distinguishes a frozen zero from a position not yet copied. Each live write
adds at most one bounded sample copy and never blocks, allocates or performs I/O.

Checkpoint reads lazily freeze still-uncopied positions, then return frozen
samples in chunks of at most 2,048 frames with one request outstanding. A position
is frozen exactly once, so reads remain consistent across later capture and
multiple-cycle overdub. Metadata cannot change partway through a snapshot.
Serialization, CRC, ZIP assembly and IndexedDB stay outside audio processing.
Finish/cancel releases ownership; no bank swap installs the checkpoint in the
live session. Tokens, cancellation, inactivity timeout, generation exhaustion,
allocation/non-finite failures and lifecycle guards preserve the prior record.

New recording generations, CLEAR/reset, import replacement and engine teardown
invalidate an affected checkpoint before its source can be discarded/reused.
Finishing initial capture or overdub alone may continue the frozen snapshot;
later content is dirty for a subsequent checkpoint. Explicit import/export yields
and cancels automatic checkpoint transfer before claiming its operation slot.

## Cadence, saved status and deliberate deletion

Keep #53's one-second debounce/five-second maximum scheduling target for ordinary
completed/configuration changes. While Recording or Overdubbing is acknowledged,
request an in-progress checkpoint every five seconds when ownership/storage/audio
are eligible. Start the first after five seconds; take at most one snapshot/write
at a time, coalescing later requests. Do not cancel an active frozen snapshot on
every new captured sample. Main-thread scheduling and transfer delays do not
guarantee a five-second crash-loss bound. Existing 30-second failure backoff and
explicit Retry remain in force.

Show the last successfully stored snapshot time and explain that in-progress
audio is frozen at checkpoint start. Only samples through that boundary are
recoverable; audio after it is not claimed saved. During transfer show Saving,
then Saved/Changes not yet saved as appropriate while capture continues.
On reload identify that a snapshot contains partial capture/overdub so recovery
does not imply the performer completed the phrase. Store bounded capture-kind
and checkpoint-start-time metadata alongside the existing recovery ZIP; old #53
records without those optional fields remain valid completed-only snapshots.
Validate new metadata strictly and do not put it into manual session exports.

Retain #53 deletion barriers. Global STOP during initial capture also discards
that capture, so delete this workspace's old checkpoint before dispatching that
destructive stop; failure leaves live state unchanged and reports Retry. Global
STOP outside initial capture remains immediate and retains recordings/overdub
additions. A pending previous-workspace offer and a non-owner tab's live actions
remain separate: never delete the other workspace/tab's snapshot. Deletion-first
actions may temporarily leave surviving tracks without recovery until a new
checkpoint succeeds; explain this limitation beside recovery controls.

## Acceptance and approval gate

Use public LoopEngine commands/process/checkpoint reads with literal known
samples for first Loop prefix, phase-joined/wrapped Loop silence, One-shot,
zero-length capture, maximum capacity, partial/multiple-cycle overdub, live writes
between chunk reads, cancellation and snapshot/import mutual exclusion. Assert
checkpoint begin/process/read do not allocate recording storage.

Actual AudioClient/worklet/WASM and production reload/recovery tests verify the
same boundaries, metadata notice, consent, stopped/zero/off restoration, failed
writes retaining the previous checkpoint, deliberate deletion, cancellation,
ownership and completed-only manual export. Measure a reproducible two-track
transfer/load workload and added processing work; label measurements as fixture
evidence, without hardware latency/glitch guarantees. Run required static/build
checks, complete suites and parallel Standards/Spec review. Physical acceptance
remains deferred to #19.

Record owner approval of this concrete contract under #49 before product changes.
#49 stays open during delivery; no merge occurs without instruction.
