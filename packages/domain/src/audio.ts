export type PlaybackMode = 'Loop' | 'OneShot';
export type TrackId = 0 | 1;
export type AudioStatus = 'idle' | 'starting' | 'ready' | 'stopping' | 'error';
export interface TrackSnapshot {
  readonly mode: PlaybackMode;
  readonly canSetMode: boolean;
  readonly state: 'Empty' | 'Recording' | 'Playing' | 'Stopped' | 'Overdubbing';
  readonly capacitySamples: number;
  readonly captureLimitSamples: number;
  readonly capturedSamples: number;
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
  readonly tracks: readonly [TrackSnapshot, TrackSnapshot];
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
  | { type: 'set-mode'; trackId: TrackId; mode: PlaybackMode }
  | { type: 'record'; trackId: TrackId }
  | { type: 'play'; trackId: TrackId }
  | { type: 'stop-track'; trackId: TrackId }
  | { type: 'stop-transport' };
