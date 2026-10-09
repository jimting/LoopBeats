# Same-rate session import verification (#51)

Contract: [owner-approved import specification](../specs/session-import-51.md).
The owner approved it before implementation in the conversation. Export #50 was
merged first; conversion and recovery remain subsequent tickets.

## Automated coverage

Public Rust engine tests cover exact Loop replay after atomic two-track staging,
independent One-shot lengths, stopped/zero/monitoring-off state, incomplete
commit, invalid chunks, canceled/stale staging, retry, incompatible metadata and
capture exclusion. The initial test failed compilation before restore operations
existed. Cargo check compiles all tests; actual native execution requires CI
because this Windows checkout lacks MSVC link.exe.

The parser round-trip test initially failed because import validation did not
exist. Its 26 tests now cover exact float32 samples, rates 8,000/192,000 Hz,
retained cycles with empty tracks, malformed schema and ZIP structure, CRCs,
compressed/encrypted/truncated/oversized input and validation cancellation.
Python independently repairs CRCs for malformed-WAV fixtures, ensuring WAV
validation rejects their rates/channels/fact/data lengths and non-finite samples.
Independent Python ZIPs also prove rejection below/above the supported rate
range and exact 64 KiB JSON acceptance versus one-byte overflow rejection.

Production-browser coverage exercises the real AudioClient/worklet/WASM path:
file selection; stopped metadata restoration; replacement confirmation with
Cancel focused, Escape cancellation and Tab/Enter replacement; cancel without replacement; mutation races; malformed and
different-rate errors; allocation/throwing-port failures and retry; actual
engine export/import/export round trips of both recordings; interrupted dialog
cleanup/reinitialize/retry; oversized file rejection before reading;
30-second inactivity timeout/retry; Stop audio at commit dispatch; and cancel
of an unanswered file read. Offline real-worklet rendering proves exact Loop
and one-pass One-shot output, incomplete-commit safety and stale-token isolation.
Raw -1.5 samples remain -1.5 in archives; final playback output clamps as before.

The maximum browser test imports two 11,520,000-frame recordings (60 seconds each
at 192,000 Hz) through AudioClient and verifies both full lengths and stopped
state. It forces the actual AudioContext sample rate, not a mock engine. ZIP
selection uses a disk file because Playwright limits inline payloads to 50 MB.

The maximum reserved staging bank is 97,920,000 bytes including lazy validity
words; file <=100,663,296 bytes plus bounded 8,192-byte sample chunks fits below
384 MiB beyond live engine storage. Valid file/rate/length bounds make memory
overflow unreachable; hostile oversized input fails preflight, and real
allocation failures have a separate actionable-error fixture. Startup reserves
the second bank; commit swaps storage without allocating or scanning recordings.
This is a bounded-memory argument, not an audio latency/dropout guarantee.

## Verification and review

Full Vitest: 67 passed. Full production-browser suite: 115 passed; final
test-only boundary additions passed at the parser and keyboard seams.
TypeScript, ESLint, Cargo formatting/check/clippy and
production/WASM builds pass. Whole-repository Prettier with end-of-line auto
passes; the existing Windows checkout CRLF issue remains unrelated.
Browser verification is recorded in the PR's final-head CI results.
The first web CI run used a 44.1 kHz host default and correctly rejected the
48 kHz fixture archives. Import fixtures now explicitly select a real 48 kHz
AudioContext; explicit 192 kHz capacity and different-rate rejection remain
covered. Product sample-rate behavior was unchanged.

Initial two-axis review identified confirmation lifecycle settlement, commit
teardown, stale-token ownership and missing round-trip/fault evidence. Fixes and
automated regressions are included. A full suite also exposed closed-dialog
initialization and file-input target sizing; both are fixed with existing
application-shell and responsive checks.

Affected physical cases: M02, M04, M06 and M09. Manual verification: deferred to
#19 under the shared testing policy. No new hardware pass or manual gate is
claimed.
