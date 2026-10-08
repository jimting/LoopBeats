# Session export verification (#50)

Scope: completed-session ZIP export only. Contract: [session export](../specs/session-export-50.md).
The owner approved the contract in the implementation conversation; approval is
recorded in specification #49. Import and recovery remain separate slices.

## Automated evidence

- Full production-browser suite: 101 tests passed before review refinements.
- After refinements: five focused export tests pass, covering downloaded ZIP/CRC
  validation by Python's independent ZIP reader, exact known audio through the
  real worklet/WASM, generation invalidation, allocation failure/retry and the
  192,000 Hz / 60-second engine capacity boundary, and throwing browser-port
  cancellation followed by a successful retry.
- Full Vitest suite: 28 tests passed, including observable cancellation/error
  presentation. TypeScript and ESLint pass; production build and WASM build pass.
- Cargo fmt, cargo check for all targets/tests, and workspace clippy pass.
  Native Cargo tests cannot run locally because the Windows MSVC linker
  `link.exe` is not installed. This is not a claimed native test pass; CI must
  run the Rust test suite before merge.
  The Rust CI job passed on commit `3d94420`; final-head CI remains a merge gate.
- The default formatting check flags pre-existing CRLF checkout endings in 52
  untouched files. Checking with `--end-of-line auto` passes across the repository;
  changed source files are formatted normally. No unrelated files were reformatted.

## Reproducible transfer/load measurement

Build production audio/web assets, then run the `downloads a standard ZIP` test
in the session-export browser suite with one Chromium worker. The test uses a
synthetic microphone, records a roughly 1.2-second Loop on Track 1, plays it,
starts Track 2 capture, then exports while imposing 100 ms of main-thread busy
work. It logs source sample rate, exact recording length, WAV payload bytes and
click-to-download elapsed time; a JSON test attachment includes these values.

One local Windows Chromium run recorded 60,032 frames at 48,000 Hz (240,128 bytes
of WAV sample payload) and 162 ms elapsed, including the imposed 100 ms load.
The independent reader verified the ZIP and
excluded unfinished Track 2. Track 1 remained Playing, its length remained fixed,
and the authoritative transport position continued advancing after export.
These are harness observations, not a hardware latency, acoustic dropout or
maximum-session transfer-time guarantee. The max-capacity test verifies bounded
WASM reads, not end-to-end maximum-size archive performance.

## Review and manual scope

Standards review: no findings. Spec review identified completion revision,
actionable allocation errors and measurement-documentation gaps; all three were
addressed with focused regression coverage and this record.
Final standards re-review also found a throwing cancellation send could block
local cleanup. Best-effort sending plus cleanup-first finalization fixes it;
the browser fault-injection regression failed before the fix and passes after it.

Affected listening cases: M02, M04, M05 and M09 (playback/capture progression while
export transfers run). Manual verification is deferred under the shared testing
strategy; no new physical test pass is claimed and no routine full checklist is
requested. Existing accepted #19 evidence is not reinterpreted as export evidence.
