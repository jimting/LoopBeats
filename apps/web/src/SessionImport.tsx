import { useEffect, useRef, useState } from 'react';
import type { AudioClient } from '@loopbeats/audio-client';
type Confirmation =
  | { kind: 'replace' }
  | { kind: 'conversion'; sourceRate: number; targetRate: number };

export function SessionImport({
  client,
  enabled,
  onBusy,
}: {
  client: AudioClient;
  enabled: boolean;
  onBusy: (busy: boolean) => void;
}) {
  const operation = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const answer = useRef<((confirmed: boolean) => void) | null>(null);
  const [confirming, setConfirming] = useState<Confirmation | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [committing, setCommitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    if (confirming) {
      dialog.current?.showModal();
      dialog.current?.querySelector<HTMLButtonElement>('button')?.focus();
    } else if (dialog.current?.open) dialog.current.close();
  }, [confirming]);
  const start = async (file: File) => {
    const controller = new AbortController();
    operation.current = controller;
    onBusy(true);
    setProgress(0);
    setCommitting(false);
    setError('');
    setMessage('');
    const confirm = (signal: AbortSignal, details: Confirmation) =>
      new Promise<boolean>((resolve) => {
        const finish = (confirmed: boolean) => {
          signal.removeEventListener('abort', abort);
          answer.current = null;
          setConfirming(null);
          resolve(confirmed);
        };
        const abort = () => finish(false);
        answer.current = finish;
        signal.addEventListener('abort', abort, { once: true });
        if (signal.aborted) finish(false);
        else setConfirming(details);
      });
    try {
      const imported = await client.importSession(file, {
        signal: controller.signal,
        onProgress: setProgress,
        onCommitting: () => setCommitting(true),
        confirmReplace: (signal) => confirm(signal, { kind: 'replace' }),
        confirmConversion: (sourceRate, targetRate, signal) =>
          confirm(signal, { kind: 'conversion', sourceRate, targetRate }),
      });
      setMessage(
        imported
          ? 'Session imported. Recordings are stopped; monitoring is off.'
          : 'Import canceled.',
      );
    } catch (failure) {
      if (controller.signal.aborted) setMessage('Import canceled.');
      else
        setError(
          failure instanceof Error
            ? failure.message
            : 'Import failed. Try again.',
        );
    } finally {
      answer.current?.(false);
      operation.current = null;
      setProgress(null);
      setCommitting(false);
      onBusy(false);
    }
  };
  return (
    <section aria-labelledby="import-heading">
      <h2 id="import-heading">Session import</h2>
      <p>
        Import a session ZIP. Different sample rates require your consent before
        conversion. Imported recordings stay stopped. Finish recording before
        importing.
      </p>
      <label>
        Import session
        <input
          type="file"
          accept=".zip,application/zip"
          disabled={!enabled || progress !== null}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            event.currentTarget.value = '';
            if (file) void start(file);
          }}
        />
      </label>
      {progress !== null && (
        <>
          <progress
            aria-label="Session import progress"
            max="1"
            value={progress}
          />
          <button
            disabled={committing}
            onClick={() => operation.current?.abort()}
          >
            Cancel import
          </button>
        </>
      )}
      <dialog
        ref={dialog}
        aria-labelledby="import-confirm-heading"
        onCancel={(event) => {
          event.preventDefault();
          answer.current?.(false);
        }}
      >
        <h2 id="import-confirm-heading">
          {confirming?.kind === 'conversion'
            ? 'Convert sample rate?'
            : 'Replace current session?'}
        </h2>
        {confirming?.kind === 'conversion' ? (
          <p>
            Convert from {confirming.sourceRate.toLocaleString()} Hz to{' '}
            {confirming.targetRate.toLocaleString()} Hz? Conversion changes
            sample values and may affect fidelity. Lowering the sample rate
            loses high-frequency content. Your current session stays intact
            until replacement is confirmed.
          </p>
        ) : (
          <p>
            This replaces all current recordings and track settings. Imported
            recordings will be stopped.
          </p>
        )}
        <button autoFocus onClick={() => answer.current?.(false)}>
          Cancel
        </button>
        <button onClick={() => answer.current?.(true)}>
          {confirming?.kind === 'conversion'
            ? 'Convert session'
            : 'Replace session'}
        </button>
      </dialog>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
