# Completed-session recovery verification (#53)

Contract: [session-recovery-53](../specs/session-recovery-53.md), owner-approved
in the implementation conversation and recorded in #49.

Recovery reuses completed export and transactional import. AudioClient owns
scheduling, IndexedDB, exclusive Web Lock ownership and lifecycle barriers;
React renders metadata and confirmations. Recording revisions come from the
engine and storage never enters the processing callback. No engine bank or
audio processing algorithm is added.

Deterministic scheduler/storage-boundary tests cover one-second coalescing,
five-second maximum scheduling under continuous changes, ignored playback
progress, deferred overdub completion, retained checkpoints after write failure,
30-second retry backoff despite new changes, pending prior-workspace preservation,
delayed startup reads, ownership held during deletion and stale initialization.
The quota-backoff and both ownership races were reproduced as failing tests
before their fixes.

Production browser tests cover reload and explicit recovery, exact known raw
Loop/One-shot samples and gain/mute/master preservation, a real IndexedDB
transaction abort retaining the previous record, failed recovery commit/retry,
Later and ordinary live operations preserving a prior offer, non-owner import
and Stop audio, ownership transfer, CLEAR, reset and Stop audio deletion,
unfinished capture exclusion, active-overdub deferral, unsupported records and
Cancel-default keyboard discard. Playback/capture use actual worklet/WASM.
Existing import/export tests cover bounded transfer, output samples, capacity,
generation rejection, interruption and rate conversion consent.

One snapshot is retained without automatic expiry. Browser-owned serialization
copies and disk quota remain browser-dependent. No unload-time save or guaranteed
crash-loss interval is claimed. Deletion-first CLEAR/replacement can temporarily
leave the remaining recordings without a checkpoint; this limitation is shown
beside the recovery controls.

Required static/build, complete automated suites and parallel Standards/Spec
review gate the PR. Native Rust linking requires MSVC link.exe on this Windows
host; GitHub CI runs the native suite. Affected manual cases: M01–M07 and M09.
Manual verification: deferred to #19. No physical listening pass is claimed.
