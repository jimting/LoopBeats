# Confirmed sample-rate conversion (#52)

Status: owner-approved contract under #49 (2026-10-09). Same-rate import #51
is merged. This extends its approved validation/transaction contract; recovery
remains outside this slice.

## Consent and existing import guarantees

Validate the complete ZIP, manifest and source WAVs before offering conversion.
If source and engine rates differ, show both integer rates and a warning that
conversion changes sample values, may affect fidelity, and lowering the rate
loses high-frequency content. Default focus is Cancel. Conversion must not begin
before acceptance. Declining, Escape, cancellation or lifecycle teardown
preserves the current session and releases the operation.

After consent, convert/stage the validated recordings. If current recordings
exist, the existing replacement confirmation follows conversion; it again
defaults to Cancel. No replacement occurs until that confirmation is accepted.
Same-rate imports retain their exact-sample path without either conversion or
conversion consent. Empty different-rate sessions still show conversion consent
because their shared-cycle timing/configuration belongs to the source rate.

Preserve all #51 concurrency, command-revision, bounded transfer, timeout,
interruption and stale-token isolation guarantees. Success preserves modes,
gains/mutes and master gain, replaces both tracks atomically, and opens retained
recordings Stopped, empty tracks Empty, transport zero and monitoring off.
The file's device identity, permission and active capture are never restored.

## Lengths, duration and alignment

Source and target rates are integers 8,000 through 192,000 Hz. Compute target
length as nearest integer `floor(sourceLength * targetRate / sourceRate + 0.5)`.
Compute the shared cycle once and use that exact target length for every nonempty
Loop track. Independently round each One-shot length. Retained cycles without
Loop recordings are rounded as well. Empty tracks remain zero-length.

Reject a positive recording/cycle which would round to zero; do not silently
discard it or invent a longer minimum recording. Reject target lengths above
`targetRate * 60`, incompatible Loop lengths, unsafe integer arithmetic or any
capacity/memory bound before conversion/staging. Source validation already
enforces its 60-second limit. Every accepted duration differs by at most half
one target sample (plus floating-point comparison tolerance in tests).

For Loop output sample n, sample the source at `n * sourceCycle / targetCycle`,
wrapping reads at the source cycle. Both Loop tracks use the same phase mapping;
sample zero remains the phase origin, and rounding cannot accumulate relative
drift. For One-shot sample n, use `n * sourceRate / targetRate` and extend endpoint
values outside its recording rather than wrap. No tempo change, trim, rotation,
added filter delay or automatic playback is introduced.

## Resampling algorithm

Use a deterministic centered windowed-sinc FIR resampler in audio-client on the
main thread, not browser-dependent OfflineAudioContext resampling. Define
`scale = min(1, target/source)` using the effective length ratio for Loop and
the rate ratio for One-shot; cutoff is `0.94 * scale` relative to source Nyquist.
Support radius is `ceil(32 / scale)` source samples (at most 1,152, allowing for
rounding of very short Loop cycles at the supported rate extremes). For signed distance d inside that radius, the unnormalized weight
is `cutoff * sinc(cutoff * d)` multiplied by the centered Blackman window
`0.42 + 0.5*cos(pi*d/radius) + 0.08*cos(2*pi*d/radius)`; outside support it is zero.
Here `sinc(x) = sin(pi*x)/(pi*x)` and `sinc(0) = 1`.

Normalize each fractional-phase kernel to unit DC gain. Cache 1,024 equally
spaced fractional phases, choosing the nearest phase (carry into the integer
source position at phase 1). Phase quantization is at most 1/2,048 source sample.
Accumulate in float64 and write float32 output. Preserve finite over-range audio;
apply no gain, mute, normalization of recording amplitude or output clamp.
Filtering can overshoot, and lower-rate conversion is inherently lossy; reject
any non-finite converted result rather than emit corrupt audio. Equal rates
bypass this algorithm entirely.

This is an explicit finite-filter design, not a claim of ideal reconstruction.
Windowed-sinc background: Julius O. Smith's
[Physical Audio Signal Processing](https://www.dsprelated.com/freebooks/pasp/Windowed_Sinc_Interpolation.html).
FIR filtering before rate reduction is also described by the
[SciPy resample_poly documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.signal.resample_poly.html).
Those sources motivate filtering; they do not validate this implementation's
specific quality or performance.

## Bounded work and memory

Keep source WAV views and produce target chunks lazily; do not allocate full
converted recordings. Transfer at most 2,048 frames with one request outstanding
to the existing reserved staging bank. Yield/check cancellation during coefficient
construction and at least every 256 converted output samples. Progress describes
conversion/staging work; playback can continue, but no real-time performance
guarantee is inferred from a main-thread implementation.

Use at most one phase table at a time and preflight its storage, source archive,
reserved staging bank and bounded chunks against the existing 384 MiB import
budget beyond the live bank. A maximum-radius 1,024-phase float64 table occupies
about 18 MiB; release or reuse it before the next track. Source file remains
bounded to 96 MiB, JSON to 64 KiB, target audio to two 60-second recordings.
Allocation/conversion/staging failures retain live recordings and show an
actionable retry message. No extra engine recording bank is required.

## Acceptance at approved seams

Use observable production-browser controls, AudioClient through real
worklet/WASM, and deterministic conversion fixtures behind audio-client. Keep
browser audio infrastructure and decoded buffers out of React.

Test consent ordering and no conversion before acceptance; Cancel, Escape,
Tab/Enter; replacement cancellation; interruption/mutation and allocation faults;
same-rate sample-exact bypass; 44.1/48 kHz in both directions and boundary rates
8/192 kHz; shared Loop phase/cycle, independent One-shot rounding, tiny recordings
and 60-second capacity. Include full target-capacity import through real
AudioClient/worklet/WASM, not only a final engine chunk.

Deterministic fixtures must verify DC preservation within 1e-6 absolute error
for unity-or-smaller inputs, zero output for silence, finite over-range handling,
impulse timing within one target frame, and 1 kHz sinusoid RMS error <=0.002 at
44.1/48 kHz. For a 12 kHz source sinusoid converted 48 to 16 kHz, alias RMS must
be <=0.01 of source amplitude. These are fixture tolerances, not a universal
fidelity guarantee. Verify converted raw samples and actual engine replay with
appropriate numerical tolerance; do not claim converted sample-exact fidelity.
Required static/build checks and Standards/Spec review gate the PR. Physical
testing follows the existing deferred #19 policy; no new hardware gate.

## Review gate

#52 requires technical decisions reviewed and approval recorded in #49 before
implementation. The owner approved this concrete contract in the implementation
conversation on 2026-10-09. This approval unlocks #52 only; recovery still requires
its own reviewed contract. #49 remains open.
