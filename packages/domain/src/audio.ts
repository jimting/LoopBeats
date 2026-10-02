export type AudioStatus = 'idle' | 'starting' | 'ready' | 'stopping' | 'error';
export interface TrackSnapshot {
  readonly state: 'Empty' | 'Recording' | 'Playing';
  readonly lengthSamples: number;
  readonly positionSamples: number;
}
export interface AudioSnapshot {
  readonly track: TrackSnapshot;
  readonly status: AudioStatus;
  readonly monitoring: boolean;
  readonly error: string | null;
  readonly sampleRate: number | null;
  readonly processedFrames: number;
  readonly inputLevel: number;
  readonly outputLevel: number;
}
export type AudioCommand =
  | { type: 'monitoring'; enabled: boolean }
  | { type: 'snapshot' }
  | { type: 'record' };
