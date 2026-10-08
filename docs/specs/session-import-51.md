# Same-rate session import (#51)

Status: owner-approved in the implementation conversation under #49. Export prerequisite
#50 is merged. This document extends the approved version-1 export contract;
it does not approve conversion or recovery.

## File validation

Accept the stored, UTF-8 ZIP format produced by #50, with exactly session.json
and the canonical WAV entries named by its two ordered tracks. Reject compressed,
encrypted, split, ZIP64, duplicate, unexpected, overlapping or path-traversing
entries; inconsistent local/central headers, lengths or CRCs; and truncation.
Validate before constructing recording-sized buffers or sending staging data.

Require format LoopBeatsSession, version 1, integer rate 8,000–192,000 Hz,
two ordered unique track IDs 0 and 1, Loop/OneShot modes, boolean mute and
finite gains/master gain in [0,1]. Lengths and shared-cycle length are integer
samples in [0, sampleRate * 60]. Zero-length tracks have null audioPath;
nonempty tracks use their canonical path. Nonempty Loop recordings require a
nonzero shared cycle of exactly the same length. One-shot lengths are independent;
a retained cycle without Loop audio is valid. Reject unknown manifest fields.

Require the exported mono little-endian IEEE float32 WAV layout with fmt, fact
and data chunks; rate, byte rate, block alignment, sample count, RIFF/data sizes
must agree exactly. Reject non-finite samples; preserve finite over-range samples
and every frame in its existing phase. No gain, clamp or rotation is applied.

Bound the file to 96 MiB, JSON to 64 KiB and combined sample payload to
92,160,000 bytes. Preflight validated sizes and temporary memory before staging;
bound import-owned memory, including reserved staging storage, to 384 MiB beyond
the live engine bank. Use WAV views and bounded chunks to avoid unnecessary
full-payload copies. Allocation failure is actionable and preserves live audio.
Different-rate files receive an explanatory rejection; #52 provides conversion.

## Workflow and concurrency

Import session is a labeled file input/control in Settings, available only when
audio is ready and neither track is Recording or Overdubbing. Playback may
continue while validating and staging. Import does not request microphone access
or start audio automatically. Explain that imported audio will be stopped.

Only one persistence operation is allowed per audio session: import and export
exclude one another. Allow Cancel during validation/staging and show progress
and accessible errors. Stop audio, interruption, engine failure, input switching
or component disposal cancels pending import and invalidates its lifecycle token.
Settings preferences and selected device are not imported.

After full validation/staging, request explicit replacement confirmation if any
current track has retained recording data. Default focus is Cancel. Cancellation
discards staging and does not stop or alter the current session. Empty sessions
need no replacement confirmation. No conversion confirmation occurs in #51.

Ordinary playback, mix and mode controls remain available. Any explicit live
session mutation after the import operation begins invalidates its transaction,
including REC, PLAY, STOP, CLEAR, reset, mode/gain/mute/master or monitoring
commands. Transport progression alone does not invalidate it. Fail with a retry
message rather than replace work created after confirmation. Recheck this
engine-owned command revision and lifecycle identity at atomic commit.

## Engine transaction

Reserve an inactive two-track recording bank during engine initialization;
initialization failure follows existing startup error handling. Do not allocate,
free or copy a recording-sized bank on the processing thread during import.
This increases initialized storage and is charged to the import memory budget.

AudioClient transfers validated recordings to that inactive bank with at most
2,048 frames and one acknowledged request outstanding. Rust independently checks
metadata compatibility, chunk bounds, finite samples and complete coverage.
Use operation tokens, sequential offsets and a 30-second request inactivity
timeout; reject stale replies and duplicate/out-of-order staging requests.

Commit is one engine-owned command: validate the transaction/revision first,
then swap both banks and configuration together without allocation or scanning
recording-sized buffers. On success every nonempty recording is Stopped, every
zero-length track Empty, transport stopped at sample zero, monitoring off,
and all imported modes/gains/mutes/master/cycle installed. Publish acknowledged
engine state before reporting success. No command produces partial replacement.
Old banks become reusable staging storage. Failed/canceled staging only resets
staging metadata; it never clears live audio or restores device/permission state.

## Acceptance and testing

Use existing public LoopEngine commands/process/snapshot, AudioClient through
actual worklet/WASM, and observable production-browser file selection/dialogs.
New bounded staging/commit operations belong behind AudioClient, not React.

Prove same-rate export/import round trips and exact replay samples, phase/silence,
independent One-shot lengths, over-range audio, metadata and silent stopped state.
Prove both tracks change atomically and cancellation, mutation races, malformed
ZIP/WAV/schema, mismatched rates, staging failure and stale lifecycle leave live
samples/settings unchanged except for independently requested live commands.
Cover maximum two-track capacity, source-rate/JSON/archive bounds, memory
preflight rejection, timeout/retry, lifecycle cleanup and keyboard dialogs.
Use deterministic faults at existing system boundaries; do not equate generated
serialization fixtures with audio correctness. Physical checks remain deferred
under the shared testing policy; no new manual gate is introduced.

## Review gate

#51 explicitly requires technical decisions reviewed and approved in #49 before
implementation. The owner approved this concrete contract before implementation;
the earlier #50 approval explicitly excluded import. #49 may remain open.
