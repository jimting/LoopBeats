# Completed-session recovery (#53)

Status: owner-approved concrete contract under #49, 2026-10-09.
Prerequisite #51 is merged; #52 is also merged and its consent flow can be reused.
Source: ADR-0002 and #53. This contract excludes the in-progress recovery of #54.

## Saved content and boundaries

Store one latest recovery snapshot per origin/browser profile in IndexedDB,
database `loopbeats.recovery.v1`, schema version 1. Its record contains a version,
UTC save timestamp, monotonic revision and the existing validated version-1
session ZIP Blob. No device identifiers, permissions or monitoring state are
stored. Reuse #50 archive limits, bounded transfer and raw-sample semantics.
Unknown database/record/archive versions fail visibly without silent migration.

Completed recordings, Empty-track configuration, gains/mutes, master gain,
shared cycle and sample rate are saved. Initial capture is excluded, without
finishing or stopping it; other completed tracks can still be checkpointed.
During overdub defer the entire checkpoint until overdub finishes or Track/global
STOP retains the additions. Keep the last successful checkpoint meanwhile and
show that current overdub is not yet saved. This slice does not periodically
save partial initial capture or active overdub.

## Automatic checkpoint scheduling

Observe acknowledged engine state/content revisions through AudioClient, rather
than treating UI intent or transport position as recording content. Mark dirty
after capture completion, overdub completion, mode/gain/mute/master changes,
CLEAR, reset and successful import/recovery. Playback and meter changes alone
never trigger a save. Configuration-only sessions can be checkpointed.

Coalesce eligible changes with a 1-second debounce and a 5-second maximum wait
from the first eligible dirty change. These are main-thread scheduling targets,
not audio timing or crash-loss guarantees. If overdub, another session operation,
input switching or interruption prevents a checkpoint, keep dirty and retry
when eligible. Do not block manual import/export; an automatic transfer yields
to explicit operations. Use at most one transfer/write and one pending dirty
revision; changes during transfer schedule the next checkpoint.

Reuse export's consistent generation-checked reads, at most 2,048 frames and
one outstanding request. A changed recording aborts the candidate; it never
produces a torn saved recording. Freeze metadata at engine acknowledgement;
configuration changes during transfer remain dirty. No storage/archive work,
recording-sized allocation or new engine bank enters the processing thread.
Respect the existing 384 MiB export/import temporary-memory limits. Storage
serialization may require browser-owned copies; quota/allocation failure is
handled without promising a browser process-memory ceiling.

## Atomic storage and failures

Build the candidate before opening the write transaction. Replace the latest
record in one IndexedDB readwrite transaction; only its completion means Saved.
Abort/quota/unavailable-storage failures retain the prior committed record,
show an actionable error and its last successful time, and leave live audio
unchanged. Retry at most once every 30 seconds while dirty and eligible, plus
an explicit Retry saving control. Never spin or claim pending changes are saved.

Retain the latest record without automatic expiry; no history/library is added.
Saving, Saved at <time>, Changes not yet saved, Paused during overdub, and Failed
are observable accessible states. Explain that crashes may lose newer work and
browser storage may be cleared; portable export remains the backup option.
Do not rely on an unload-time asynchronous write. Unexpected closure leaves
the last successful record available on the next visit.

## Recovery offer and consent

Read storage on page startup before any automatic write. Show the saved time
and Recover, Later, and Discard recovery controls. Do not request microphone
permission or replace the session automatically. Later/Escape dismiss the
offer for this visit, retaining it behind a Settings recovery control; suspend
automatic writes until the performer recovers or explicitly discards it.

Recover requires explicit Start audio when not ready, then validates the entire
snapshot through the existing import flow. If rates differ, obtain #52 conversion
consent; if current recordings exist, obtain replacement consent afterward.
Canceled/failed recovery retains the saved record and live session. Success
restores recordings Stopped, unrecorded tracks Empty, transport zero, monitoring
off, and snapshot configuration rather than overwriting it with stored device
preferences. It resumes saving and checkpoints the installed session.

Discard recovery has a Cancel-default confirmation; on confirmed successful
deletion dismiss the offer and resume checkpointing the current workspace.
Failure leaves the offer available and shows an error. Corrupt/unsupported
records remain visibly unavailable until explicitly discarded; never restore
partial data or overwrite them silently.

## Multiple tabs

One tab owns recovery writes, recovery replacement and deletion through an
exclusive origin-scoped Web Lock, `loopbeats.recovery.v1`, held while active.
Acquire with `ifAvailable`; other tabs can operate live audio but show recovery
paused because another tab owns it. They cannot silently overwrite/discard the
owner's record. Provide Retry recovery ownership; after acquisition reread the
record and offer recovery before writing this tab's different live session.
No forced takeover. Release on disposal/pagehide and abort local work; on resume
reacquire and reread before writes. IndexedDB/Web Locks unavailability visibly
disables recovery while ordinary audio and portable export/import remain usable.
Non-owner live CLEAR/reset/Stop audio/import affect only that tab's workspace;
they do not delete the owner's snapshot. Similarly, while a prior-workspace offer
is unresolved, live actions preserve that offer and automatic writes stay paused
until explicit recovery or recovery discard resolves it.

## Deliberate deletion and lifecycle ordering

CLEAR, Reset session, Stop audio—discard session, and an accepted import
replacement invalidate queued saves and await deletion of the old recovery
record before applying their destructive engine action. This prevents a crash
between the live deletion and its next checkpoint from offering deliberately
deleted recordings. Failure to delete leaves the live session/action unchanged
and reports Retry; Cancel of a confirmation does not delete anything.

CLEAR then checkpoints the remaining tracks; Reset checkpoints the Empty session;
successful import checkpoints the replacement. Stop audio leaves no recovery
record and does not create a new Empty checkpoint. The deletion-first policy
means a crash before the next successful checkpoint can also lose recovery of
remaining tracks; the UI must explain this limitation for CLEAR/replacement.
Use a lifecycle epoch to prevent late completed candidates from restoring the
deleted record. Destructive actions are serialized with any already-open write
transaction; after the barrier no earlier write may commit.

Interruption/engine failure cancels pending transfer and retains the last saved
record. Reinitialization preserves live recordings and resumes dirty saves only
after the engine acknowledges readiness. Input switching preserves recordings;
cancel/retry transfer. Settings restoration on a new Empty engine must not
overwrite a pending recovery offer or override recovered snapshot configuration.

## Acceptance and review gate

Test actual browser reload/recovery and exported raw sample fidelity through
real AudioClient/worklet/WASM, including independent One-shot length and mix.
Test completed-only capture, deferred overdub, cadence/coalescing, retries,
atomic injected write failure, cancellation, malformed storage, rate consent,
multiple tabs, deletion barriers and stale writes, CLEAR/reset/Stop audio/import,
interruption and settings precedence. Use deterministic scheduler/storage failure
injection behind audio-client and observable controls, not React-owned audio.
Run required checks and parallel Standards/Spec review; hardware testing remains
deferred to #19. Commit and create a ready PR using git/gh after implementation.

The owner approved this concrete contract before #53 product changes.
Record approval under #49; that parent remains open. #54 requires its own review.

API basis: [IndexedDB transactions](https://www.w3.org/TR/IndexedDB/) provide
atomic commit/abort semantics; [Web Locks](https://www.w3.org/TR/web-locks/)
provides exclusive ownership and nonwaiting acquisition. These APIs do not
guarantee storage retention or checkpoint completion before a crash.
