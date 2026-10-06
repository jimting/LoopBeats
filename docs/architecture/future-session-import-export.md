# Future session import and export

Status: planning note, requested 2026-10-06. Outside #43/#44 and the current
two-track milestone; not a reviewed implementation specification or ready ticket.

Session export/import should preserve recordings so a performer can continue
later. Use “session” for the live workspace and “session file” for its portable
saved representation; saved application preferences alone do not include audio.

## Proposed behavior

- Export one session file containing each track's audio, Loop/One-shot mode,
  gain and mute, master gain, shared cycle length and source sample rate.
- Import validates the complete file before replacing the current session.
  Request confirmation if recordings would be replaced; cancellation or invalid
  input leaves the current session intact.
- Imported recordings open stopped, with transport at zero and monitoring off.
  Do not restore device identifiers, microphone permissions or active capture.
- Offer separate WAV exports for individual tracks and mixed output. Audio
  export is distinct from a session file that supports later editing/playback.
- Proposed default: resample when importing into a different sample rate to
  preserve duration and shared-cycle alignment. Exact conversion, capacity
  limits and error tolerances require specification before implementation.

## Decisions to resolve

Choose a versioned file format, track/mix WAV scope and gain/mute treatment,
supported sample/channel formats, size limits, corrupted/unsupported-file
handling, and migration policy. Define whether export requires playback and
capture stopped or uses a stable engine-owned snapshot. Serialization, file I/O
and resampling must not block or allocate uncontrollably on the audio thread.

Acceptance should include session round trips, phase preservation, independent
One-shot lengths, replacement cancellation, malformed/oversized files,
cross-sample-rate timing and numerical WAV checks at existing public seams.
