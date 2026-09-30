# Loopstation glossary

Initial vocabulary from the product plan. Candidate state-machine details remain provisional until domain modeling. One sample frame contains the simultaneous sample from every channel.

| Term | Meaning |
| --- | --- |
| Session | A running workspace containing the transport and all tracks. |
| Transport | The shared sample-based timeline governing synchronization. |
| Track | One independent loop channel. |
| Loop | A repeating region of recorded audio. |
| Loop Length | Number of sample frames in one complete loop cycle. |
| Cycle | One complete playback of a loop. |
| Record | Capture input into an empty track. |
| Overdub | Mix incoming audio into an existing loop. |
| Armed | Waiting for a defined transport boundary before an operation begins. |
| Playing | A track contributes loop audio to output. |
| Muted | A track advances through its loop without contributing output. |
| Stopped | A track does not output loop audio; advancement/resume semantics need specification. |
| Clear | Remove the recorded loop from a track. |
| Transport Position | Current sample-frame position on the shared timeline. |
| Loop Boundary | Exact point between consecutive loop iterations. |
| Quantization | Delay a command until an appropriate transport boundary. |
| Audio Block | Sample frames provided by one processing callback. |
| Engine Command | An application request whose execution time is resolved by the engine. |

Candidate track states: Empty, Recording, Playing, Overdubbing, Stopped; Armed is future scheduling vocabulary. Mute may be orthogonal to lifecycle; do not commit to invalid boolean combinations. Candidate commands include StartRecording, StopRecording, StartOverdub, StopOverdub, MuteTrack, ClearTrack and SetTrackGain.
