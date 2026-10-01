# Browser audio feasibility spike

Issue: [#5](https://github.com/ty-jt-agent/LoopBeats/issues/5).
Observed: 2026-10-01 (Asia/Taipei).
Status: accepted by user after manual testing and merge of PR #23 on 2026-10-01.

## Manual acceptance update

The user reported that testing was completed, checked all device-test items in [PR #23](https://github.com/ty-jt-agent/LoopBeats/pull/23), merged it, and closed #5. The checklist covers permission allow/deny, input signal, monitoring for at least 60 seconds, monitoring disable, stop/restart and diagnostics export. Exact device/browser versions and diagnostic values were not provided in this conversation, so no additional measurements or cross-device claims are inferred. The historical synthetic observations below remain unchanged. This unblocks the #6 experiment.

## Question and decision

Can microphone capture pass through AudioWorklet to browser output, with monitoring explicitly enabled?

**Limited GO for the next Rust/WASM experiment.** Chromium's built-in fake capture successfully supplied input to an actual worklet and an output-connected graph. Monitoring started disabled, enabling it produced downstream signal, and Stop closed the context. This establishes a usable experimental path, not live-performance latency or production readiness.

**No production go-ahead yet.** Physical microphone/audio-interface input, audible wired output, human permission prompts and cross-device stability were unavailable in this environment. Review this evidence and complete the desktop manual checks before treating #5 as fully accepted or its dependent production work as unblocked.

## Primary experiment

The disposable source is captured on [spike/5-browser-audio](https://github.com/ty-jt-agent/LoopBeats/tree/spike/5-browser-audio), pinned to [cca122f042be81b8e4f61163c528b0e872dcaede](https://github.com/ty-jt-agent/LoopBeats/tree/cca122f042be81b8e4f61163c528b0e872dcaede). The user requested the experimental code for device testing and merged it via PR #23. It remains an isolated public experiment, separate from the production application. The branch contains the page, worklet, observational runner and raw observations.

To reproduce:

```bash
git switch spike/5-browser-audio
npm ci
npx playwright install chromium
npm run spike:audio
```

The command opens /browser-audio-spike/index.html. Click Start microphone, then explicitly Enable monitoring with wired headphones. Stop releases tracks and closes the context. Download diagnostics to record the browser and actual input settings.

For synthetic observations, run `npm run spike:probe`. It starts its own local Vite server on port 5191, uses Chromium fake-media input, checks startup/output signal and an error path, and writes .scratch/browser-audio-probe-results.json. The optional LOOPBEATS_CHROMIUM_EXECUTABLE_PATH selects an existing browser binary in environments where the browser download is unavailable.

No production audio-client abstraction, loop engine, capture persistence or UI track behavior was introduced.

## Observed setup

| Item | Observation |
| --- | --- |
| Browser | Headless Chromium 145.0.7632.6, Linux |
| Capture | Chromium built-in fake-media input; no physical microphone |
| Origin | Loopback HTTP, reported secure context |
| AudioContext | interactive latency hint; running after Start interaction |
| Sample rate | 44,100 Hz |
| Actual input channels | 2 returned despite preference for 1; worklet node explicitly downmixes to mono |
| Echo cancellation / noise suppression / automatic gain | Actual settings reported false |
| Processing block sizes | 128 frames minimum and maximum in this run |
| baseLatency | 0.010 seconds, browser-reported |
| outputLatency | 0.030 seconds, browser-reported |

The latency fields describe output-side estimates, not measured capture-to-speaker delay. Do not sum them and label the result total round-trip latency. The observed block duration is approximately 2.90 ms; processing execution time was not measured.

## Observed scenarios

| Scenario | Result | Limit |
| --- | --- | --- |
| Start from user interaction | Context running; fake input reached actual AudioWorklet | Permission was auto-granted, not a human prompt |
| Monitoring initially off | Input RMS 0.13858; downstream cumulative RMS 0; output analyser RMS 0 | Synthetic signal only |
| Monitoring explicitly enabled | Downstream cumulative RMS 0.02575 after the observation window | Signal within the output-connected graph; no audible hardware verification |
| Main thread blocked for 500 ms | Frame counter advanced from 265,472 to 298,624 across the load plus recovery observation | Does not establish glitch-free processing, execution budget or acoustic continuity |
| Disable monitoring | UI/state returned to off | Instantaneous analyser samples may miss the intermittent fake signal; this is not an independent sample-exact silence proof |
| Stop | Context closed; stop path stopped captured tracks | Physical-device indicator behavior was not observed |
| Startup rejection probe | Failure surfaced at request-input; actual name NotSupportedError | A separate browser with configured denied permission did not yield expected NotAllowedError; real permission-denial semantics remain unverified |
| Browser page errors | None in successful probe | Not an underrun/glitch detector |

Instantaneous analyser polls initially missed the synthetic signal. A second worklet after monitoring gain accumulated downstream energy and established that nonzero signal reached the graph. The meter uses cumulative RMS; its value does not immediately reset when monitoring changes. Diagnostic messages/polling are observational and never schedule audio.

A file-backed generated WAV capture attempt returned NotSupportedError. The successful experiment used Chromium's built-in fake-media generator instead. This failure was not treated as proof that physical microphone capture is unsupported.

## Manual browser/device matrix

| Target | Status | Required observation |
| --- | --- | --- |
| Desktop Chrome + wired headset | User reports checklist passed; exact device unspecified | Permission allow/deny, spoken input, audible monitoring, Stop/restart, reported settings |
| Desktop Chrome + USB interface | Pending: hardware unavailable | Routing, monitoring, reconnect and perceived delay |
| macOS Safari | Not run: platform unavailable | User activation, capture, worklet output and recovery |
| Android Chrome | Not run: device unavailable | Touch startup, wired output, tab/background/lock behavior |
| iPhone/iPad Safari | Not run: devices unavailable | Touch startup, audio interruptions, return-to-page behavior |
| Bluetooth | Not run | Record separately; do not conflate hardware delay with engine timing |

Phones must access a secure origin: ordinary HTTP over a desktop LAN address is insufficient for microphone capture. Use an HTTPS test host or suitable secure development access. Record exact browser/OS/device versions and exported diagnostics with each run. Test foreground first, then visibility changes, lock, calls, other audio and device removal.

## Architecture implications

- User-started initialization and explicit monitoring are viable experiment choices.
- Encapsulate production browser audio lifecycle behind AudioClient in its own later ticket; do not promote this disposable page directly.
- Inspect actual settings and supplied buffer lengths rather than relying on requested channels or assuming a universal 128-frame block.
- Keep allocation, network, DOM and blocking work outside process(). Snapshot object creation occurs in message handlers; production diagnostic overhead still needs measurement.
- Treat Chrome synthetic evidence separately from physical Safari/mobile evidence.
- Resolve allocation/buffer strategy and Rust/WASM loading in #6, without claiming this JavaScript passthrough verifies WASM.
- See [platform notes](browser-audio-platform-notes.md) for primary-source requirements and the rationale for the remaining manual probes.

## Acceptance assessment

The graph, explicit monitoring and observable diagnostics are demonstrated synthetically. Available failures are recorded, and unavailable Safari/mobile/device probes are explicit. The original synthetic evidence permitted a limited next experiment. The subsequent user-reported manual checklist and closure of #5 establish acceptance for proceeding to #6; unavailable Safari/mobile probes remain explicit.
