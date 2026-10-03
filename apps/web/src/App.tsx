import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import type { TrackId } from '@loopbeats/domain';
import { AudioClient } from '@loopbeats/audio-client';

type Removal = { kind: 'track'; trackId: TrackId } | { kind: 'session' };

export function App() {
  const [confirmClearing, setConfirmClearing] = useState(true);
  const [pendingRemoval, setPendingRemoval] = useState<Removal | null>(null);
  const confirmation = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (pendingRemoval) confirmation.current?.showModal();
  }, [pendingRemoval]);
  const [client] = useState(
    () =>
      new AudioClient({
        wasm: `${import.meta.env.BASE_URL}audio/loop-engine.wasm`,
        worklet: `${import.meta.env.BASE_URL}audio/processor.js`,
      }),
  );
  const snapshot = useSyncExternalStore(client.subscribe, client.getSnapshot);
  useEffect(() => {
    const release = () => {
      void client.stop();
    };
    window.addEventListener('pagehide', release);
    return () => {
      window.removeEventListener('pagehide', release);
      release();
    };
  }, [client]);
  const remove = (target: Removal) => {
    if (target.kind === 'track') client.clear(target.trackId);
    else client.reset();
    setPendingRemoval(null);
  };
  const requestRemoval = (target: Removal) => {
    if (confirmClearing) setPendingRemoval(target);
    else remove(target);
  };
  const ready = snapshot.status === 'ready';
  const starting =
    snapshot.status === 'starting' || snapshot.status === 'recovering';
  const status = {
    idle: 'Audio stopped',
    starting: 'Starting audio — allow microphone access when prompted',
    ready: 'Audio ready',
    interrupted: 'Audio interrupted — recordings retained',
    recovering: 'Reinitializing audio — recordings retained',
    stopping: 'Stopping audio',
    error: 'Audio could not start',
  }[snapshot.status];
  return (
    <main className="shell">
      <p className="eyebrow">Your browser loopstation</p>
      <h1>LoopBeats</h1>
      <p className="intro">Build a performance, one layer at a time.</p>
      <section className="notice" aria-labelledby="status-heading">
        <h2 id="status-heading">Audio session</h2>
        <p role="status">{status}</p>
        {snapshot.error && <p role="alert">{snapshot.error}</p>}
        <p>Use wired headphones. Monitoring starts off in every new session.</p>
        <div className="controls">
          <button
            disabled={
              ready ||
              starting ||
              snapshot.status === 'stopping' ||
              snapshot.status === 'interrupted'
            }
            onClick={() => {
              void client.start();
            }}
          >
            Start audio
          </button>
          <button
            disabled={!ready && !starting && snapshot.status !== 'interrupted'}
            onClick={() => {
              void client.stop();
            }}
          >
            {snapshot.status === 'recovering'
              ? 'Cancel recovery and discard session'
              : starting
                ? 'Cancel audio startup'
                : 'Stop audio'}
          </button>
          {(snapshot.status === 'interrupted' ||
            snapshot.status === 'recovering') && (
            <button
              disabled={snapshot.status !== 'interrupted'}
              onClick={() => {
                void client.reinitialize();
              }}
            >
              Reinitialize audio
            </button>
          )}
          <button
            disabled={!ready}
            aria-pressed={snapshot.monitoring}
            onClick={() => client.setMonitoring(!snapshot.monitoring)}
          >
            {snapshot.monitoring ? 'Disable monitoring' : 'Enable monitoring'}
          </button>
        </div>
        <p>{snapshot.monitoring ? 'Monitoring on' : 'Monitoring off'}</p>
        {ready && (
          <dl className="diagnostics">
            <dt>Sample rate</dt>
            <dd>{snapshot.sampleRate} Hz</dd>
            <dt>Processed frames</dt>
            <dd>{snapshot.processedFrames}</dd>
            <dt>Input level</dt>
            <dd data-testid="input-level">{snapshot.inputLevel.toFixed(3)}</dd>
            <dt>Output level</dt>
            <dd data-testid="output-level">
              {snapshot.outputLevel.toFixed(3)}
            </dd>
          </dl>
        )}
        <label>
          <input
            type="checkbox"
            checked={confirmClearing}
            onChange={(event) =>
              setConfirmClearing(event.currentTarget.checked)
            }
          />
          Confirm before clearing
        </label>
        <p>This confirmation preference applies until you reload the page.</p>
        <label>
          Master volume
          <input
            type="range"
            aria-label="Master volume"
            min="0"
            max="1"
            step="0.01"
            value={snapshot.masterGain}
            disabled={!ready}
            onChange={(event) =>
              client.setMasterGain(Number(event.currentTarget.value))
            }
          />
          <span>{Math.round(snapshot.masterGain * 100)}%</span>
        </label>
        <section aria-labelledby="transport-heading">
          <h2 id="transport-heading">Transport</h2>
          <p data-testid="transport-state">
            {snapshot.transport.running ? 'Running' : 'Stopped'}
          </p>
          <button
            disabled={
              !ready ||
              (!snapshot.transport.running &&
                !snapshot.tracks.some((track) =>
                  ['Recording', 'Playing', 'Overdubbing'].includes(track.state),
                ))
            }
            onClick={() => client.stopTransport()}
          >
            Global STOP
          </button>
          <button
            disabled={
              !ready ||
              (!snapshot.transport.cycleLengthSamples &&
                snapshot.tracks.every((track) => track.state === 'Empty'))
            }
            onClick={() => requestRemoval({ kind: 'session' })}
          >
            Reset session
          </button>
          <p>
            Timeline samples:{' '}
            <span data-testid="transport-position">
              {snapshot.transport.positionSamples}
            </span>
          </p>
          <p>
            Shared cycle samples:{' '}
            <span data-testid="cycle-length">
              {snapshot.transport.cycleLengthSamples}
            </span>
          </p>
          <p>
            Global STOP resets the timeline and retains completed audio;
            unfinished first capture is discarded. Monitoring is independent.
          </p>
        </section>
        {snapshot.tracks.map((track, index) => {
          const trackId = index as TrackId;
          const independentCapture =
            track.mode === 'OneShot' ||
            snapshot.transport.cycleLengthSamples === 0;
          const modeLabel = track.mode === 'OneShot' ? 'One-shot' : 'Loop';
          return (
            <section key={trackId} aria-labelledby={`track-heading-${trackId}`}>
              <h2 id={`track-heading-${trackId}`}>
                Track {index + 1} · {modeLabel}
              </h2>
              <label>
                Playback mode
                <select
                  aria-label={`Track ${index + 1} playback mode`}
                  value={track.mode}
                  disabled={!ready || !track.canSetMode}
                  onChange={(event) =>
                    client.setMode(
                      trackId,
                      event.currentTarget.value === 'OneShot'
                        ? 'OneShot'
                        : 'Loop',
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
                <p>
                  Loop mode requires the recording to match the shared cycle
                  length exactly.
                </p>
              )}
              <label>
                Track volume
                <input
                  type="range"
                  aria-label={`Track ${index + 1} volume`}
                  min="0"
                  max="1"
                  step="0.01"
                  value={track.gain}
                  disabled={!ready}
                  onChange={(event) =>
                    client.setTrackGain(
                      trackId,
                      Number(event.currentTarget.value),
                    )
                  }
                />
                <span>{Math.round(track.gain * 100)}%</span>
              </label>
              <button
                disabled={!ready}
                aria-pressed={track.muted}
                onClick={() => client.setTrackMute(trackId, !track.muted)}
              >
                {track.muted ? 'Unmute' : 'Mute'}
              </button>
              <p data-testid="track-state">{track.state}</p>
              <button
                disabled={!ready || !track.canRecord}
                onClick={() => client.record(trackId)}
              >
                REC
              </button>
              <button
                disabled={!ready || !track.canPlay}
                onClick={() => client.play(trackId)}
              >
                PLAY
              </button>
              <button
                disabled={!ready || !track.canStop}
                onClick={() => client.stopTrack(trackId)}
              >
                Track STOP
              </button>
              <button
                disabled={!ready || track.state === 'Empty'}
                onClick={() => requestRemoval({ kind: 'track', trackId })}
              >
                CLEAR
              </button>
              <p>
                {track.state === 'Overdubbing'
                  ? 'REC ends overdub and keeps playing; Track STOP retains additions.'
                  : track.state === 'Recording'
                    ? track.mode === 'OneShot'
                      ? 'REC finishes and plays once; Track STOP retains audio silently.'
                      : 'REC finishes and loops; Track STOP retains audio silently.'
                    : track.state === 'Empty'
                      ? independentCapture
                        ? 'Press REC to capture up to 60 seconds.'
                        : 'REC captures one full cycle from the current phase; finish early to leave silence elsewhere.'
                      : track.mode === 'OneShot'
                        ? 'PLAY retriggers from the beginning once. REC requires CLEAR first; no One-shot overdub.'
                        : 'REC starts overdub immediately while transport runs; PLAY joins the shared cycle; Track STOP retains audio.'}
              </p>
              <p>
                {independentCapture
                  ? 'Recording limit: 60 seconds.'
                  : 'Recording limit: one shared cycle.'}{' '}
                Remaining:{' '}
                <span data-testid="capture-remaining">
                  {snapshot.sampleRate
                    ? (
                        Math.max(
                          0,
                          track.captureLimitSamples - track.capturedSamples,
                        ) / snapshot.sampleRate
                      ).toFixed(1)
                    : '60.0'}{' '}
                  s
                </span>
              </p>
              <p>
                Captured samples:{' '}
                <span data-testid="captured-samples">
                  {track.capturedSamples}
                </span>
              </p>
              <p>
                Loop samples:{' '}
                <span data-testid="loop-length">{track.lengthSamples}</span>
              </p>
              <progress
                aria-label={`${modeLabel} progress`}
                max={track.lengthSamples || 1}
                value={track.positionSamples}
              />
              <p>
                Stop audio closes the session and discards its recordings. Track
                STOP retains audio. Change playback mode while stopped; Loop
                requires matching the shared cycle length. CLEAR preserves the
                cycle; Reset session removes it.
              </p>
            </section>
          );
        })}
      </section>
      {pendingRemoval && (
        <dialog
          ref={confirmation}
          aria-labelledby="removal-heading"
          onCancel={() => setPendingRemoval(null)}
        >
          <h2 id="removal-heading">
            {pendingRemoval.kind === 'track'
              ? `Clear Track ${pendingRemoval.trackId + 1}?`
              : 'Reset session?'}
          </h2>
          <p>
            {pendingRemoval.kind === 'track'
              ? 'Remove this recording. The shared cycle and other track remain.'
              : 'Remove all recordings and reset the shared cycle. Monitoring returns off.'}{' '}
            Audio continues until you confirm.
          </p>
          <button onClick={() => setPendingRemoval(null)}>Cancel</button>
          <button disabled={!ready} onClick={() => remove(pendingRemoval)}>
            Confirm
          </button>
        </dialog>
      )}
    </main>
  );
}
