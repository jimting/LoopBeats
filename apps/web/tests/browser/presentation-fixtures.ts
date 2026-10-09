import { expect, type Page } from '@playwright/test';
import type { TrackSnapshot } from '@loopbeats/domain';

export const visualViewports = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'narrow', width: 390, height: 844 },
  { name: 'compact', width: 320, height: 844 },
] as const;

export const trackFixture = (
  state: TrackSnapshot['state'],
  muted = false,
): TrackSnapshot => ({
  state,
  muted,
  mode: 'Loop',
  gain: 0.75,
  canSetMode: state === 'Empty' || state === 'Stopped',
  canSetLoop: true,
  canRecord: state !== 'Stopped',
  canPlay: state === 'Stopped',
  canStop: !['Empty', 'Stopped'].includes(state),
  capacitySamples: 2880000,
  captureLimitSamples: 192000,
  capturedSamples: state === 'Recording' ? 48000 : 0,
  lengthSamples: state === 'Empty' ? 0 : 192000,
  positionSamples: state === 'Empty' || state === 'Stopped' ? 0 : 48000,
});

// Freeze snapshots at the browser worklet boundary for presentation only.
// Audio correctness is covered by separate production WASM/worklet tests.
export async function showPresentation(
  page: Page,
  tracks: readonly [TrackSnapshot, TrackSnapshot],
  status: 'idle' | 'ready' | 'error' | 'interrupted' = 'ready',
) {
  await page.addInitScript(
    ({ tracks, status }) => {
      const fixture = {
        type: 'snapshot',
        recordingRevisions: [0, 0],
        failed: false,
        processedFrames: 48000,
        monitoring: false,
        inputLevel: 0.25,
        outputLevel: 0.5,
        masterGain: 0.8,
        tracks,
        transport: {
          running: tracks.some((track) =>
            ['Recording', 'Playing', 'Overdubbing'].includes(track.state),
          ),
          positionSamples: 48000,
          cycleLengthSamples: 192000,
        },
      };
      const RealNode = AudioWorkletNode;
      window.AudioWorkletNode = class extends RealNode {
        constructor(...args: ConstructorParameters<typeof AudioWorkletNode>) {
          super(...args);
          const port = {
            onmessage: null as ((event: MessageEvent) => void) | null,
            postMessage: () =>
              port.onmessage?.({ data: fixture } as MessageEvent),
            close: () => {},
          };
          Object.defineProperty(this, 'port', { value: port });
          queueMicrotask(() => port.postMessage());
        }
      };
      if (status === 'error') {
        navigator.mediaDevices.getUserMedia = async () => {
          throw new DOMException('Permission denied', 'NotAllowedError');
        };
      }
      if (status === 'interrupted') {
        const RealContext = AudioContext;
        window.AudioContext = class extends RealContext {
          constructor(options?: AudioContextOptions) {
            super(options);
            (
              window as unknown as { visualContext: AudioContext }
            ).visualContext = this;
          }
        };
      }
    },
    { tracks, status },
  );
  await page.goto('/');
  if (status === 'idle') return;
  await page.getByRole('button', { name: 'Start audio', exact: true }).click();
  if (status === 'error') {
    await expect(page.getByRole('status')).toContainText(
      'Audio could not start',
    );
    return;
  }
  await expect(page.getByRole('status')).toContainText('Audio ready');
  if (status === 'interrupted') {
    await page.evaluate(() =>
      (
        window as unknown as { visualContext: AudioContext }
      ).visualContext.suspend(),
    );
    await expect(page.getByRole('status')).toContainText('Audio interrupted');
  }
}
