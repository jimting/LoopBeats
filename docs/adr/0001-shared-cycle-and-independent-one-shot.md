# Shared cycle alignment with independent one-shot playback

Status: accepted product timing decision, 2026-09-30.

## Context
Live looping needs separately recorded tracks to share a consistent audible phase. Independent playback-from-zero and next-boundary launch would produce different interactions from joining a running cycle immediately.

## Decision
Use one engine-owned sample timeline and shared cycle length for Loop tracks. Starting playback or recording joins the current cycle position, preserving capture phase across wraparound. The session retains its cycle even if the establishing track is cleared. One-shot starts from the recording beginning, plays once and remains independent of cycle phase, while obeying global STOP.

## Alternatives
Independent track clocks and restarting each loop from zero would allow phase mismatches. Waiting for a boundary would change the requested immediate-launch behavior. Treating One-shot as another synchronized loop would prevent full beginning-to-end retriggering.

## Consequences
Capture buffers and commands must express cycle alignment. Mid-cycle recording and early completion require position-preserving silence. Tests must prove cross-track phase and long-running drift behavior. Mode changes require compatible lengths. These are agreed semantics, not evidence of browser feasibility; browser/WASM spikes remain necessary.
