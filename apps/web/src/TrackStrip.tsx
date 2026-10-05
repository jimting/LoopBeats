import type { TrackId, TrackSnapshot } from '@loopbeats/domain';
import type { AudioClient } from '@loopbeats/audio-client';

type Props = {
  track: TrackSnapshot;
  trackId: TrackId;
  sampleRate: number | null;
  cycleLengthSamples: number;
  enabled: boolean;
  client: AudioClient;
  onClear: () => void;
};

// Translate the current snapshot into an action, never into a new track state.
function primaryAction(track: TrackSnapshot) {
  if (track.state === 'Stopped')
    return {
      label: 'Play',
      command: 'play',
      available: track.canPlay,
    } as const;
  if (track.state === 'Playing' && track.mode === 'OneShot')
    return {
      label: 'Retrigger',
      command: 'play',
      available: track.canPlay,
    } as const;
  if (track.mode === 'OneShot' && track.state === 'Overdubbing') return null;
  const label = {
    Empty: 'Record',
    Recording: 'Finish recording',
    Playing: 'Overdub',
    Overdubbing: 'Finish overdub',
  }[track.state];
  return { label, command: 'record', available: track.canRecord } as const;
}

export function TrackStrip({
  track,
  trackId,
  sampleRate,
  cycleLengthSamples,
  enabled,
  client,
  onClear,
}: Props) {
  const number = trackId + 1;
  const mode = track.mode === 'OneShot' ? 'One-shot' : 'Loop';
  const action = primaryAction(track);
  const recording = track.state === 'Recording';
  const remaining = sampleRate
    ? (
        Math.max(0, track.captureLimitSamples - track.capturedSamples) /
        sampleRate
      ).toFixed(1)
    : '60.0';
  return (
    <section
      className="track-strip"
      data-state={track.state}
      aria-labelledby={`track-heading-${trackId}`}
    >
      <header className="track-header">
        <h2 id={`track-heading-${trackId}`}>
          Track {number} · {mode}
        </h2>
        <p className="track-state" data-testid="track-state">
          {track.state}
        </p>
      </header>
      <label className="mode-control">
        Playback mode
        <select
          aria-label={`Track ${number} playback mode`}
          value={track.mode}
          disabled={!enabled || !track.canSetMode}
          onChange={(event) =>
            client.setMode(
              trackId,
              event.currentTarget.value === 'OneShot' ? 'OneShot' : 'Loop',
            )
          }
        >
          <option value="Loop" disabled={!track.canSetLoop}>
            Loop
          </option>
          <option value="OneShot">One-shot</option>
        </select>
      </label>
      {track.state === 'Stopped' && !track.canSetLoop && (
        <p className="restriction">
          Loop mode requires the recording to match the shared cycle length
          exactly.
        </p>
      )}
      <div className="track-performance">
        <label className="track-fader">
          Track volume
          <input
            type="range"
            aria-label={`Track ${number} volume`}
            min="0"
            max="1"
            step="0.01"
            value={track.gain}
            disabled={!enabled}
            onChange={(event) =>
              client.setTrackGain(trackId, Number(event.currentTarget.value))
            }
          />
          <span>{Math.round(track.gain * 100)}%</span>
        </label>
        <div className="track-actions">
          <progress
            aria-label={`${mode} progress`}
            max={
              recording
                ? track.captureLimitSamples || 1
                : track.lengthSamples || 1
            }
            value={recording ? track.capturedSamples : track.positionSamples}
          />
          <button
            className="primary-action"
            aria-label={`Track ${number} REC/PLAY — ${action?.label ?? 'Unavailable'}`}
            disabled={!enabled || !action?.available}
            onClick={() => {
              if (!enabled || !action?.available) return;
              client[action.command](trackId);
            }}
          >
            <span>REC/PLAY</span>
            <strong>{action?.label ?? 'Unavailable'}</strong>
          </button>
          <div className="track-buttons">
            <button
              disabled={!enabled || !track.canStop}
              onClick={() => client.stopTrack(trackId)}
            >
              Track STOP
            </button>
            <button
              disabled={!enabled}
              aria-pressed={track.muted}
              onClick={() => client.setTrackMute(trackId, !track.muted)}
            >
              {track.muted ? 'Unmute' : 'Mute'}
            </button>
          </div>
          <p className="mute-state">
            {track.muted ? 'Muted · position continues' : 'Not muted'}
          </p>
          {!enabled || !action?.available ? (
            <p className="restriction">
              {!enabled
                ? 'Audio must be ready; input switching must finish.'
                : 'Action unavailable: another capture or transport requirement may prevent it.'}
            </p>
          ) : null}
        </div>
      </div>
      <p className="capture-capacity">
        {track.mode === 'OneShot' || !cycleLengthSamples
          ? 'Recording limit: 60 seconds.'
          : 'Recording limit: one shared cycle.'}{' '}
        Remaining: <span data-testid="capture-remaining">{remaining} s</span>
      </p>
      <details className="track-details">
        <summary>Track {number} details</summary>
        <p>
          Captured samples:{' '}
          <span data-testid="captured-samples">{track.capturedSamples}</span>
        </p>
        <p>
          Loop samples:{' '}
          <span data-testid="loop-length">{track.lengthSamples}</span>
        </p>
        <p>
          Track STOP retains audio. CLEAR preserves the shared cycle. One-shot
          retriggers from the beginning; Loop playback joins the shared cycle.
        </p>
        <button
          disabled={!enabled || track.state === 'Empty'}
          onClick={onClear}
        >
          CLEAR
        </button>
      </details>
    </section>
  );
}
