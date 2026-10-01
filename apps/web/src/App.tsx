import { useEffect, useState, useSyncExternalStore } from 'react';
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
        <p>Audio recording and playback are coming next.</p>
      </section>
    </main>
  );
}
