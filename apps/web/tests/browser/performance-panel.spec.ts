import { expect, test } from '@playwright/test';
import type { TrackSnapshot } from '@loopbeats/domain';

test.use({
  viewport: { width: 1280, height: 800 },
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

const trackFixture = (
  state: TrackSnapshot['state'],
  muted = false,
): TrackSnapshot => ({
  state,
  muted,
  mode: 'Loop',
  gain: 0.75,
  canSetMode: state === 'Empty' || state === 'Stopped',
  canSetLoop: true,
  canRecord: true,
  canPlay: state === 'Stopped' || state === 'Playing',
  canStop: state !== 'Empty' && state !== 'Stopped',
  capacitySamples: 2880000,
  captureLimitSamples: 192000,
  capturedSamples: state === 'Recording' ? 48000 : 0,
  lengthSamples: state === 'Empty' ? 0 : 192000,
  positionSamples: state === 'Empty' || state === 'Stopped' ? 0 : 48000,
});

for (const [name, first, second] of [
  ['empty-stopped', trackFixture('Empty'), trackFixture('Stopped')],
  ['recording-playing', trackFixture('Recording'), trackFixture('Playing')],
  [
    'overdubbing-muted',
    trackFixture('Overdubbing'),
    trackFixture('Playing', true),
  ],
] as const) {
  test(`deterministic desktop panel: ${name}`, async ({ page }, testInfo) => {
    // Presentation fixture at the existing worklet message boundary, NOT audio evidence.
    const snapshot = {
      type: 'snapshot',
      failed: false,
      processedFrames: 48000,
      monitoring: false,
      inputLevel: 0.25,
      outputLevel: 0.5,
      masterGain: 0.8,
      tracks: [first, second],
      transport: {
        running: name !== 'empty-stopped',
        positionSamples: 48000,
        cycleLengthSamples: 192000,
      },
    };
    await page.addInitScript((fixture) => {
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
    }, snapshot);
    await page.goto('/');
    await page.getByRole('button', { name: 'Start audio' }).click();
    await expect(page.getByRole('status')).toContainText('Audio ready');
    const tracks = page.getByRole('region', { name: /^Track [12] · Loop$/ });
    await expect(tracks.nth(0).getByTestId('track-state')).toHaveText(
      first.state,
    );
    await expect(tracks.nth(1).getByTestId('track-state')).toHaveText(
      second.state,
    );
    await expect(
      tracks.nth(1).getByRole('button', {
        name: second.muted ? 'Unmute' : 'Mute',
        exact: true,
      }),
    ).toHaveAttribute('aria-pressed', String(second.muted));
    for (const control of [
      page.getByRole('button', { name: /^Global (STOP|Start)$/ }),
      page.getByRole('slider', { name: 'Master volume' }),
      ...(await page.getByRole('button', { name: /REC\/PLAY/ }).all()),
      ...(await page
        .getByRole('button', { name: 'Track STOP', exact: true })
        .all()),
      ...(await page
        .getByRole('slider', { name: /^Track [12] volume$/ })
        .all()),
    ]) {
      const box = await control.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(800);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
    const left = await tracks.nth(0).boundingBox(),
      right = await tracks.nth(1).boundingBox();
    expect(left!.y).toBe(right!.y);
    expect(right!.x).toBeGreaterThan(left!.x + left!.width);
    expect(left!.y + left!.height).toBeLessThanOrEqual(800);
    expect(right!.y + right!.height).toBeLessThanOrEqual(800);
    await page.evaluate(() => document.fonts.ready);
    const screenshot = testInfo.outputPath(`desktop-${name}.png`);
    await page.screenshot({
      path: screenshot,
      fullPage: true,
      animations: 'disabled',
    });
    await testInfo.attach(`desktop-${name}`, {
      path: screenshot,
      contentType: 'image/png',
    });
  });
}
