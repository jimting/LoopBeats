import { useEffect, useState, useSyncExternalStore } from 'react';
import type { TrackId } from '@loopbeats/domain';
import { AudioClient } from '@loopbeats/audio-client';

export function App() {
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
  const ready = snapshot.status === 'ready';
  const starting = snapshot.status === 'starting';
  const status = {
    idle: 'Audio stopped',
    starting: 'Starting audio — allow microphone access when prompted',
    ready: 'Audio ready',
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
            disabled={ready || starting || snapshot.status === 'stopping'}
            onClick={() => {
              void client.start();
            }}
          >
            Start audio
          </button>
          <button
            disabled={!ready && !starting}
            onClick={() => {
              void client.stop();
            }}
          >
            {starting ? 'Cancel audio startup' : 'Stop audio'}
          </button>
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
        <section aria-labelledby="transport-heading">
          <h2 id="transport-heading">Transport</h2>
          <p data-testid="transport-state">
            {snapshot.transport.running ? 'Running' : 'Stopped'}
          </p>
          <button
            disabled={
              !ready ||
              (!snapshot.transport.running &&
                !snapshot.tracks.some((track) => track.state === 'Recording'))
            }
            onClick={() => client.stopTransport()}
          >
            Global STOP
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
          const firstCapture = snapshot.transport.cycleLengthSamples === 0;
          return (
            <section key={trackId} aria-labelledby={`track-heading-${trackId}`}>
              <h2 id={`track-heading-${trackId}`}>Track {index + 1} · Loop</h2>
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
              <p>
                {track.state === 'Overdubbing'
                  ? 'REC ends overdub and keeps playing; Track STOP retains additions.'
                  : track.state === 'Recording'
                    ? 'REC finishes and loops; Track STOP retains audio silently.'
                    : track.state === 'Empty'
                      ? firstCapture
                        ? 'Press REC to capture up to 60 seconds.'
                        : 'REC captures one full cycle from the current phase; finish early to leave silence elsewhere.'
                      : 'REC starts overdub immediately while transport runs; PLAY joins the shared cycle; Track STOP retains audio.'}
              </p>
              <p>
                {firstCapture
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
                aria-label="Loop progress"
                max={track.lengthSamples || 1}
                value={track.positionSamples}
              />
              <p>
                Stop audio closes the session and discards its recordings. Track
                STOP retains audio. CLEAR follows in a later ticket.
              </p>
            </section>
          );
        })}
      </section>
    </main>
  );
}
