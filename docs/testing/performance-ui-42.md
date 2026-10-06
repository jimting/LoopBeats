# Performance panel verification (#42)

Specification: #41. Implementation slice: #42. Baseline: main `82226cc`.
Evidence recorded on 2026-10-05.

## Delivered

Two adjacent track strips, vertical volume faders, independent mute, snapshot
state/progress and one circular REC/PLAY control per track. The shared strip
contains status, monitoring, meters, master volume, transport and Global STOP.
Stop audio explicitly identifies session discard. Existing secondary controls
remain reachable through track/session disclosures; their refinements belong to
#43. Responsive/accessibility refinements and broader visual acceptance remain
in #44.

Stopped Loop presses play before offering overdub. One-shot presses play or
retrigger retained audio. Dispatch uses the intended engine capability, readiness
and pending-switch gate, with no alternate-command fallback or predicted state.
First-capture progress represents elapsed capacity, not an invented shared cycle.
No engine, worklet, protocol or settings-schema change was made.

## Automated evidence

- Full Vitest suite: 21 tests passed.
- Full production-browser suite: 43 tests passed, including actual WASM/worklet
  numerical audio regressions and three deterministic presentation cases.
- After final desktop spacing changes: production rebuild and all three visual
  cases passed again, including whole-track-panel bounds within 1280×800.
- Typecheck, scoped ESLint, changed-file Prettier and diff whitespace checks passed.
- Rust formatting, clippy and release WASM build passed.
- Native Rust tests could not link: the local Windows environment lacks MSVC
  `link.exe`. This is not recorded as a pass; CI must run that gate.
- The broad `npm run check` reached formatting checks and reported pre-existing
  differences in untouched checkout files. The local unrelated untracked
  `herdr-agent-usage` checkout also falls within broad filesystem scans. No
  unrelated formatting cleanup was included and the broad check is not claimed
  to have passed.

## Desktop presentation evidence

These 1280×800 desktop fixtures freeze messages at the existing browser worklet
boundary. They prove presentation and layout, not audio correctness. The real
worklet/WASM tests remain separate. Screenshots are review examples, not
cross-platform pixel-golden baselines.

- [Empty and Stopped](performance-ui-42/empty-stopped.png)
- [Recording and Playing](performance-ui-42/recording-playing.png)
- [Overdubbing and independently Muted playback](performance-ui-42/overdubbing-muted.png)

Owner visual acceptance is pending; screenshots are supplied for review.

## Review and manual status

Parallel Standards and Spec reviews identified one heuristic test-locator smell
and one P2 session-closing label ambiguity. Both were corrected and reviewers
confirmed them resolved. No outstanding finding remained on either axis.

No new physical listening run was performed or claimed. Reuse prior integrated
#19 evidence for unchanged engine behavior; affected manual cases are M01–M09.
Any repeat focused hardware test requires a concrete observed uncertainty or
regression under the shared testing strategy, not merely a presentation change.
