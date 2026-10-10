# In-progress recovery verification (#54)

Contract: [approved specification](../specs/session-progress-recovery-54.md).
Review baseline: `7088438` (merged #53 / PR #58).

## Behavioral evidence

- Public engine tests use literal samples for first-Loop prefix, independent
  One-shot, zero capture, wrapped phase-joined Loop with uncaptured silence,
  partial overdub and later passes, capacity completion, cancellation,
  destructive invalidation, import/checkpoint exclusion and non-finite rejection.
- A dedicated allocator fixture measures checkpoint begin, processing with
  copy-on-write, bounded reads and cancel after initialization.
- Production WASM tests compare frozen raw samples across later writes and
  chunk reads, including values above 1.0. Recovery browser tests exercise
  actual AudioClient/worklet transfers, reload, explicit recovery, stopped
  restoration, partial notices and completed-only manual export.
- Browser failure fixtures verify retained previous saves, ownership,
  global STOP deletion failure/retry, strict optional metadata and compatibility
  with older records without that metadata.
- A delayed-transfer scheduler fixture verifies five-second start deadlines,
  coalescing overdue work and prompt saves after completion.

## Reproducible processing and transfer measurement

Run the production build, then:

```sh
npx playwright test apps/web/tests/browser/session-checkpoint.spec.ts
```

The capacity fixture records both 60-second tracks at 48 kHz, using 128-frame
processing blocks. It measures one full overdub pass before freezing and one
with checkpoint copy-on-write, applies 100 ms of host-thread load, and reads
both tracks in 2,814 chunks of at most 2,048 samples. It verifies known frozen
raw values, rejects oversized reads and checks that WASM memory does not grow.
CPU and read durations are logged separately by the test.

The first Linux CI run measured 27.4 ms for baseline processing, 35.5 ms for
processing with freezing, and 22.7 ms for bounded reads across both tracks.
WASM memory remained 50,135,040 bytes before/after checkpoint processing and reads.
Those times describe aggregate synchronous WASM fixture work on this machine;
they exclude message round trips, archive assembly and storage. They are not
callback deadlines, hardware latency, guaranteed recovery intervals or listening
evidence. Production browser tests separately exercise the actual transfer and
storage path. Scheduling delays and failures can lose more than five seconds.

## Review

### Standards

No remaining findings. Shared capture-position calculation and shared
checkpoint metadata vocabulary resolve the two initial heuristic findings.

### Spec

No remaining findings. Regression tests cover both initial P2 findings:
transfer-duration cadence drift and unintended cycle establishment during
independent One-shot recovery. A retained Loop incompatible with the unchanged
zero cycle rejects the candidate and retains the previous saved snapshot.

Final findings: Standards 0; Spec 0.

## Environment and physical acceptance

Local TypeScript, ESLint, Prettier (native checkout line endings), Vitest,
production-browser, Rust formatting/Clippy and WASM checks cover this change.
Native Rust execution requires CI on this Windows setup because MSVC
`link.exe` is unavailable; compilation and Clippy include the test targets.
The [first CI run](https://github.com/ty-jt-agent/LoopBeats/actions/runs/37960798008)
passed the native tests and allocation fixture, all web checks and 141 browser
tests. A final sparse-metadata regression adds one browser test; exact array keys
reject missing indices hidden by extra properties. Its final CI evidence is
available from PR #59 checks.

Manual verification: deferred to #19. Affected cases M03–M06, M09 and M10 in
[the shared catalog](manual-validation.md). No physical listening pass is claimed.
