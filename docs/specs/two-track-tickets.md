# Two-track milestone tickets

Approved: 2026-10-01 (Asia/Taipei).
Parent specification: [#2](https://github.com/ty-jt-agent/LoopBeats/issues/2).
Created with to-tickets; the parent issue remains unchanged.

## Dependency graph

| Ticket | Delivers | Blocked by | Parent stories |
| --- | --- | --- | --- |
| [#4 — Runnable application and CI foundation](https://github.com/ty-jt-agent/LoopBeats/issues/4) | Run a browser shell and verify the complete development toolchain. | None | 1; foundation prerequisite |
| [#5 — Browser audio feasibility spike](https://github.com/ty-jt-agent/LoopBeats/issues/5) | Demonstrate microphone input through AudioWorklet to output and record feasibility findings. | #4 | 2,3,40; feasibility prerequisite |
| [#6 — Rust/WASM worklet feasibility spike](https://github.com/ty-jt-agent/LoopBeats/issues/6) | Demonstrate continuous audio processing through Rust/WASM inside AudioWorklet. | #5 | 50; feasibility prerequisite |
| [#7 — Start audio and control input monitoring](https://github.com/ty-jt-agent/LoopBeats/issues/7) | Start the production audio session with understandable status and explicit monitoring. | #6 | 2,3,4,40 |
| [#8 — Record and replay the first Loop](https://github.com/ty-jt-agent/LoopBeats/issues/8) | Record a first Loop and immediately replay it on an engine-owned sample timeline. | #7 | 5,6,49 |
| [#9 — Bound recording and control transport](https://github.com/ty-jt-agent/LoopBeats/issues/9) | Bound recording and make track/global stop and restart behavior predictable. | #8 | 7,8,9,15,16,17,18 |
| [#10 — Capture a second synchronized Loop](https://github.com/ty-jt-agent/LoopBeats/issues/10) | Capture and launch a second Loop in the shared cycle's current phase. | #9 | 10,11,12,13,14,34 |
| [#11 — Overdub synchronized Loops](https://github.com/ty-jt-agent/LoopBeats/issues/11) | Layer incoming audio immediately onto an existing synchronized Loop. | #10 | 28,29,30,31,32,33,34 |
| [#12 — Record and retrigger One-shots](https://github.com/ty-jt-agent/LoopBeats/issues/12) | Capture independent One-shots and play each from its beginning once. | #9 | 9,21,22,23,24,35 |
| [#13 — Change playback modes safely](https://github.com/ty-jt-agent/LoopBeats/issues/13) | Reuse recordings across Loop/One-shot modes without losing audio or synchronization. | #11, #12 | 25,26,27 |
| [#14 — Mix tracks without changing their timing](https://github.com/ty-jt-agent/LoopBeats/issues/14) | Adjust track/master levels and mute while preserving playback/capture timing. | #11, #12 | 36,37,38,39 |
| [#15 — Clear tracks and reset the session safely](https://github.com/ty-jt-agent/LoopBeats/issues/15) | Remove selected recordings safely and explicitly reset shared-cycle timing. | #11, #12 | 19,20,35,41,42,43 |
| [#16 — Persist settings and warn before leaving](https://github.com/ty-jt-agent/LoopBeats/issues/16) | Restore user settings while making temporary audio loss understandable. | #13, #14, #15 | 43,44,46 |
| [#17 — Select and switch input devices](https://github.com/ty-jt-agent/LoopBeats/issues/17) | Select preferred input and switch devices without discarding completed recordings. | #16 | 45,47 |
| [#18 — Recover from audio interruptions](https://github.com/ty-jt-agent/LoopBeats/issues/18) | Retain completed audio and recover explicitly after interruption/disconnection. | #11, #12 | 48 |
| [#19 — Verify the complete two-track milestone](https://github.com/ty-jt-agent/LoopBeats/issues/19) | Demonstrate the integrated milestone works reliably on desktop Chrome. | #16, #17, #18 | 1–50; integrated acceptance |

## Working the frontier

Start with #4. A ticket becomes available only when its blockers are complete; ready-for-agent describes the specified ticket, not permission to ignore blockers. #11 delivers overdub immediately after synchronization. #12 can proceed alongside it. No product implementation was performed during ticket generation.

Each GitHub ticket holds its acceptance criteria and links back to #2. The available connector has no native dependency/sub-issue write tool, so relationships are represented by explicit Parent and Blocked by references. Follow those links as the dependency gate; these are not native GitHub blocking relationships.

Review each implementation against the parent specification and ticket acceptance criteria, verify at the agreed engine/browser/UI seams, and create a small pull request. Maintain the map if ticket dependencies change. Five-track expansion and other deferred features remain outside this milestone.
