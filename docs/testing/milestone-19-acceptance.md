# Two-track milestone acceptance (#19)

Status: pending tester results. Candidate baseline: `7013ebf` (latest main when this record was prepared).

Follow [testing strategy](strategy.md) and the shared [M01–M09 case catalog](manual-validation.md). Record observations in the acceptance PR discussion or a dated run report in this directory.

## Setup

- Date / tester: pending
- Tested commit / build URL: pending
- OS / Chrome version: pending
- Input / output hardware and connection: pending
- Sample rate / available latency diagnostics: pending

## Results

| Case | Result | Observations / failure link |
| --- | --- | --- |
| M01: startup, monitoring, permissions, restart | pending | |
| M02: first Loop, stereo playback, progress | pending | |
| M03: capture bounds and transport | pending | |
| M04: synchronized capture and phase | pending | |
| M05: overdub and capture ownership | pending | |
| M06: One-shot and mode changes | pending | |
| M07: mixing, CLEAR and reset | pending | |
| M08: settings, device switch and recovery | pending | |
| M09: 10-minute playback and 30-second UI load | pending | |

Use passed, failed, deferred or blocked for actual results. Unavailable required hardware remains blocked unless the owner explicitly records a scope change. Separate perceived delay from measured diagnostics.

## Acceptance gates

- [ ] All 50 parent stories trace to evidence.
- [ ] Sample-level synchronization tests establish no cumulative drift across thousands of cycles.
- [ ] Actual audio bridge processing under reproducible main-thread load is demonstrated.
- [ ] M01–M09 desktop wired-device results and diagnostics are recorded.
- [ ] Known failures are resolved or explicitly scoped out by the owner.
- [ ] Early mobile findings and untested production setups are documented.

This record does not establish milestone acceptance. Keep #19 open until its evidence gates are satisfied.
