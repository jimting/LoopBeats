# Loopstation domain
A session combines recorded audio tracks with a shared looping timeline and independent one-shot playback.

## Language

**Session**: The current loopstation workspace containing tracks and a transport.

**Track**: One audio channel holding a recording and its playback mode.

**Recording**: Captured audio held by a track.
_Avoid_: File, saved session (when referring to temporary captured audio).

**Loop**: A recording played repeatedly in alignment with the shared cycle.

**Loop mode**: Playback that repeats and follows the shared cycle position.
_Avoid_: Default mode, from-beginning mode.

**One-shot**: Playback of a recording from its beginning once, ending automatically.
_Avoid_: Resume, synchronized loop.

**Transport**: The shared timeline governing Loop-mode synchronization.

**Shared cycle**: The repeating time span used by all Loop-mode tracks.

**Shared cycle length**: The duration established for the session's repeating cycle.
_Avoid_: Tempo, BPM (these describe musical rate, not cycle duration).

**Cycle position**: The current location within the repeating shared cycle.

**Transport position**: The current location on the shared timeline.

**Loop length**: The duration of one complete repeating recording.

**Cycle**: One full traversal of a repeating loop.

**Loop boundary**: The point between successive loop cycles.

**Record**: Capture incoming audio into an empty track.

**Overdub**: Add captured input to an existing Loop recording without changing its duration.

**Empty**: A track with no recording.

**Recording state**: A track currently capturing its initial recording.

**Playing**: A track whose recording is advancing for playback, subject to mute.

**Overdubbing**: A Loop track playing and adding incoming audio to its recording.

**Stopped**: A track with retained audio that is neither playing nor capturing.

**Muted**: A track whose playback contribution is silent while its position continues advancing.
_Avoid_: Stopped, paused.

**Track stop**: End one track's playback or capture while retaining its captured audio.

**Transport stop**: Stop session playback and return the shared timeline to its beginning.

**Clear**: Remove one track's recording.

**Session reset**: Clear every track and reset the shared cycle and transport.

**Input monitoring**: Listening to live input through the application's output.

**Playback mode**: A track's selection of Loop or One-shot playback.

**Quantization**: Scheduling an operation at an appropriate musical boundary; a later feature.

**Armed**: Waiting for a scheduled boundary before an operation starts; later scheduling vocabulary.
