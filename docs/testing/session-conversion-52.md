# Session conversion verification (#52)

The approved contract is [session-conversion-52](../specs/session-conversion-52.md).
Conversion runs in audio-client on the main thread, before the existing atomic
engine import commit. No processing-thread resampler or additional engine bank
is introduced.

Deterministic converter tests cover 44.1/48 kHz in both directions, 8/192 kHz
boundaries, silence, finite over-range DC, phase origin, duration rounding,
same-rate sample identity, tiny-length rejection and cooperative cancellation.
They compare a 1 kHz sine against an independent analytic reference (RMS error
at most 0.002), and require a 12 kHz tone converted from 48 to 16 kHz to remain
below 0.01 RMS. DC error is at most 0.000001.

Browser tests exercise real AudioClient staging and WASM/worklet playback,
conversion consent before replacement consent, keyboard Cancel defaults and
Escape, lifecycle interruption, and coefficient-allocation failure preserving
the existing session. Exporting converted samples verifies configuration and
unscaled samples independently of playback gain.

A Chromium run converted two 60-second recordings from 8 to 192 kHz in 12.5
seconds, producing 11,520,000 frames per track at the actual maximum engine
capacity. This is a reproducible workload, not a cross-device latency guarantee.
The planner accounts for source ZIP storage, reserved engine staging, one
reusable phase table and bounded chunks against the 384 MiB import budget.

Physical audio acceptance remains deferred to #19 under the shared manual
validation catalog; these automated checks do not claim hardware acceptance.
