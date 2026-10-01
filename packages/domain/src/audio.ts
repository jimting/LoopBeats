export type AudioStatus = 'idle' | 'starting' | 'ready' | 'stopping' | 'error';
export interface AudioSnapshot {
  readonly status: AudioStatus;
  readonly monitoring: boolean;
  readonly error: string | null;
  readonly sampleRate: number | null;
  readonly processedFrames: number;
  readonly inputLevel: number;
  readonly outputLevel: number;
}
export type AudioCommand =
  { type: 'monitoring'; enabled: boolean } | { type: 'snapshot' };
