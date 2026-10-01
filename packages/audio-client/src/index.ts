import type { AudioCommand, AudioSnapshot } from '@loopbeats/domain';
export type { AudioSnapshot } from '@loopbeats/domain';

type Session = {
  context: AudioContext;
  stream?: MediaStream;
  node?: AudioWorkletNode;
  interval?: ReturnType<typeof setInterval>;
  cancelStartup?: () => void;
};
type WorkletSnapshot = {
  type: 'snapshot';
  failed: boolean;
  monitoring: boolean;
  processedFrames: number;
  inputLevel: number;
  outputLevel: number;
};
const idle = (): AudioSnapshot => ({
  status: 'idle',
  monitoring: false,
  error: null,
  sampleRate: null,
  processedFrames: 0,
  inputLevel: 0,
  outputLevel: 0,
});

function recovery(error: unknown, stage: string): string {
  const name = error instanceof Error ? error.name : '';
  if (name === 'NotAllowedError' || name === 'SecurityError')
    return 'Microphone access was blocked. Allow microphone access in your browser site settings, then try Start audio again.';
  if (name === 'NotFoundError')
    return 'No audio input was found. Connect or enable a microphone/audio interface, then try Start audio again.';
  if (name === 'NotReadableError')
    return 'The audio input could not be opened. Check its connection and other applications using it, then retry.';
  if (stage === 'engine')
    return 'The audio engine could not initialize. Check your connection, rebuild audio assets with npm run build:audio if running locally, and try Start audio again.';
  return error instanceof Error
    ? `${error.message} Try Start audio again.`
    : 'Audio could not start. Check your input device and browser support, then retry.';
}

/** Owns browser audio resources; React consumes immutable engine/lifecycle snapshots. */
export class AudioClient {
  private snapshot = idle();
  private listeners = new Set<() => void>();
  private session: Session | null = null;
  private attempt = 0;
  constructor(private assets: { wasm: string; worklet: string }) {}
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(snapshot: AudioSnapshot) {
    this.snapshot = snapshot;
    for (const listener of this.listeners) listener();
  }
  private async release(session: Session) {
    clearInterval(session.interval);
    session.cancelStartup?.();
    session.stream?.getTracks().forEach((track) => track.stop());
    session.node?.disconnect();
    if (session.context.state !== 'closed')
      await session.context.close().catch(() => {});
  }
  private async fail(session: Session, message: string) {
    if (this.session !== session) return;
    this.session = null;
    this.attempt++;
    this.publish({ ...idle(), status: 'error', error: message });
    await this.release(session);
  }
  async start(): Promise<void> {
    if (
      this.snapshot.status === 'starting' ||
      this.snapshot.status === 'ready' ||
      this.snapshot.status === 'stopping'
    )
      return;
    const attempt = ++this.attempt;
    this.publish({ ...idle(), status: 'starting' });
    let session: Session | undefined;
    let stage = 'context';
    try {
      if (!globalThis.isSecureContext)
        throw new Error(
          'Microphone capture requires HTTPS or localhost. Open a secure URL.',
        );
      if (!globalThis.AudioContext || !navigator.mediaDevices?.getUserMedia)
        throw new Error(
          'This browser does not support the required audio APIs. Use desktop Chrome for this milestone.',
        );
      // Create/resume directly from the user's event; never during React render/effect.
      session = { context: new AudioContext({ latencyHint: 'interactive' }) };
      this.session = session;
      await session.context.resume();
      stage = 'input';
      if (attempt !== this.attempt) return;
      session.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });
      if (attempt !== this.attempt) {
        await this.release(session);
        return;
      }
      stage = 'engine';
      const response = await fetch(this.assets.wasm);
      if (!response.ok) throw new Error('Audio engine download failed');
      const module = await WebAssembly.compile(await response.arrayBuffer());
      if (attempt !== this.attempt) return;
      await session.context.audioWorklet.addModule(this.assets.worklet);
      if (attempt !== this.attempt) return;
      const node = new AudioWorkletNode(session.context, 'loop-engine', {
        channelCount: 1,
        channelCountMode: 'explicit',
        outputChannelCount: [2],
        processorOptions: { module },
      });
      session.node = node;
      const current = session;
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error('Worklet initialization timed out')),
          5000,
        );
        const finish = () => {
          clearTimeout(timeout);
          resolve();
        };
        current.cancelStartup = finish;
        node.onprocessorerror = () => {
          clearTimeout(timeout);
          reject(new Error('Audio processor failed'));
          void this.fail(
            current,
            'The audio processor stopped. Try Start audio again to create a new session.',
          );
        };
        node.port.onmessage = ({ data }: MessageEvent<WorkletSnapshot>) => {
          if (this.session !== current || attempt !== this.attempt) {
            finish();
            return;
          }
          if (data.failed) {
            clearTimeout(timeout);
            reject(new Error('Audio processing capacity exceeded'));
            void this.fail(
              current,
              'Audio processing stopped. Try Start audio again; if this repeats, use desktop Chrome and report the failure.',
            );
            return;
          }
          if (data.processedFrames > 0) {
            this.publish({
              status: 'ready',
              error: null,
              monitoring: data.monitoring,
              sampleRate: current.context.sampleRate,
              processedFrames: data.processedFrames,
              inputLevel: data.inputLevel,
              outputLevel: data.outputLevel,
            });
            finish();
          }
        };
        current.context
          .createMediaStreamSource(current.stream!)
          .connect(node)
          .connect(current.context.destination);
        // Polling observes state only; it never schedules sample-level operations.
        current.interval = setInterval(() => {
          if (this.session !== current) {
            finish();
            return;
          }
          node.port.postMessage({ type: 'snapshot' } satisfies AudioCommand);
        }, 100);
      });
      if (attempt !== this.attempt) return;
      current.context.onstatechange = () => {
        if (this.session === current && current.context.state !== 'running')
          void this.fail(
            current,
            'Audio was interrupted. Try Start audio again to create a new session.',
          );
      };
    } catch (error) {
      if (attempt !== this.attempt) return;
      if (session) {
        this.session = null;
        await this.release(session);
      }
      if (attempt !== this.attempt) return;
      this.publish({
        ...idle(),
        status: 'error',
        error: recovery(error, stage),
      });
    }
  }
  setMonitoring(enabled: boolean): void {
    if (this.snapshot.status === 'ready')
      this.session?.node?.port.postMessage({
        type: 'monitoring',
        enabled,
      } satisfies AudioCommand);
  }
  async stop(): Promise<void> {
    const attempt = ++this.attempt;
    const session = this.session;
    this.session = null;
    this.publish({ ...idle(), status: 'stopping' });
    if (session) await this.release(session);
    if (attempt === this.attempt) this.publish(idle());
  }
}
