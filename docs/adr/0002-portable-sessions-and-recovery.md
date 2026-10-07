# Portable session files and automatic recovery

Status: accepted product architecture decision, 2026-10-07.

LoopBeats will use two persistence paths with different purposes. Session export creates a versioned ZIP containing `session.json` and one WAV per track; it includes completed recordings and the track/session data needed to continue editing and playback. Automatic recovery stores the latest available session in browser storage and may include in-progress capture data. Both paths operate outside the audio processing thread.

Import validates the complete archive before changing the live session. If the archive sample rate differs from the current engine, the UI warns that conversion will occur and performs conversion only after the user accepts. If the current session contains recordings, replacement confirmation follows. A successful import replaces the current session, leaves every track stopped at transport position zero, and disables monitoring. Device identity, permissions and active capture are never restored. Cancelled, rejected, malformed or unsupported imports leave the current session unchanged.

The ZIP format is preferred over a single opaque audio file because separate WAV assets keep the portable representation inspectable and allow future migration. Completed recordings are the manual export boundary; recovery is the crash-safety boundary.
