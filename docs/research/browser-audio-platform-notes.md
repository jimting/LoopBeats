# Browser audio platform notes

Research date: 2026-10-01 (Asia/Taipei). Supports issue #5's disposable browser-audio spike. These are platform requirements and test hypotheses, not measurements or a browser compatibility certification.

## Capture and permissions

`navigator.mediaDevices` requires a secure context. Microphone access is permission controlled, including the document's microphone Permissions Policy. An unanswered permission request can remain pending. Permission denial, unavailable devices, incompatible required constraints, and hardware access failure have distinct error paths. Optional constraints are preferences; inspect the returned track's actual `getSettings()` values instead of assuming requested sample rate or processing settings were applied. Sources may change settings within constraints over time. See the [Media Capture specification](https://www.w3.org/TR/mediacapture-streams/#dom-mediadevices-getusermedia) and [constraints model](https://www.w3.org/TR/mediacapture-streams/#the-model-sources-sinks-constraints-and-settings).

Spike implications: check secure-context/API availability first; expose permission-pending and failure states; request audio only; capture actual settings; clean up tracks after failed startup and Stop. A late permission grant after cancellation must also be cleaned up.

## Starting audio

Chrome documents that Web Audio is subject to autoplay policy: a context created before user interaction can be suspended and needs `resume()` after interaction. It recommends creating the context in response to interaction and observing its state. See [Chrome's autoplay guidance](https://developer.chrome.com/blog/autoplay/#web-audio).

Spike implication: create/resume from the Start button, inspect the result, and provide an explicit Resume action if the context is still suspended. Permission success alone is not proof of running audio. Test Safari and mobile activation behavior on their actual browsers; Chrome's guidance is not a universal implementation guarantee.

## Processing and diagnostics

The current Web Audio specification defines a default render quantum of 128 frames but also describes render-size hints; inspect supplied buffer lengths rather than hardcoding a callback size. The worklet runs in the audio rendering environment. `baseLatency` describes destination-to-audio-subsystem processing latency and excludes audio-graph latency; `outputLatency` estimates host-buffer-to-output-device latency. Neither measures microphone-to-speaker round-trip delay. `latencyHint` is a request. See [Web Audio API](https://www.w3.org/TR/webaudio/), especially AudioContext attributes, AudioWorklet, and graph rendering.

Chrome's worklet guidance explains that buffering does not increase the callback's compute budget, asynchronous messaging incurs allocation/latency costs, and the audio callback must not synchronously block. See [Audio worklet design patterns](https://developer.chrome.com/blog/audio-worklet-design-pattern/).

Spike implications: preallocate processing storage, copy supplied samples directly, avoid DOM/network/blocking work in `process()`, and send only occasional diagnostics. Label latency values as estimates; display unavailable fields explicitly. Input signal/frame counters demonstrate received data, not acoustic output or absence of glitches. A render budget is block frames divided by sample rate; proving work finishes inside it requires separate measurement.

## Interruptions, mobile, and devices

WebKit's historical capture guidance describes user-paused capture producing silent samples and `mute`/`unmute` events, as well as capture contention between tabs. Treat it as a documented behavior to exercise, not a claim that every current Safari version behaves identically. See [WebKit capture controls](https://webkit.org/blog/7763/a-closer-look-into-webrtc/#access-to-capture-streams).

Chrome documents freezing/discarding hidden pages and warns that mobile termination may omit unload events. It does not promise uninterrupted background audio for this graph. See [Page Lifecycle guidance](https://developer.chrome.com/docs/web-platform/page-lifecycle-api).

Test desktop Chrome, desktop Safari, Android Chrome, and iOS Safari individually. Record exact OS/browser/device versions and actual input/output hardware; exercise tab changes, screen lock, calls/other audio, permission revocation, unplug/replug, and return-to-page recovery. Log context state, track mute/end, and page visibility separately. Do not equate a hidden page with an audio interruption or automatically claim background support. Separate wired/interface results from Bluetooth results. These are recommended experiments, not empirical findings.

## Feasibility decision

The platform sources justify a user-started microphone → AudioWorklet → output experiment. They do not establish acceptable perceived latency or stability for any device. Keep the experiment isolated from production audio-client interfaces. Advance only with recorded observations, and retain untested browser/device combinations as pending in the manual matrix.
