export type AudioStatus = 'idle' | 'starting' | 'ready' | 'stopping' | 'error';
export interface TrackSnapshot {
  readonly state: 'Empty' | 'Recording' | 'Playing' | 'Stopped';
  readonly capacitySamples: number;
  readonly canRecord: boolean;
  readonly canPlay: boolean;
  readonly canStop: boolean;
  readonly lengthSamples: number;
  readonly positionSamples: number;
}
export interface TransportSnapshot {
  readonly running: boolean;
  readonly positionSamples: number;
  readonly cycleLengthSamples: number;
}
export interface AudioSnapshot {
  readonly transport: TransportSnapshot;
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
  | { type: 'record' }
  | { type: 'play' }
  | { type: 'stop-track' }
  | { type: 'stop-transport' };
