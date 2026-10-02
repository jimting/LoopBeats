import { expect, test } from '@playwright/test';

test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

test('track STOP retains capture and global STOP resets the timeline without discarding it', async ({
  page,
}) => {
  await page.goto('/');
  await expect(
    page.getByRole('button', { name: 'Track STOP', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Start audio' }).click();
  await expect(page.getByRole('status')).toContainText('Audio ready');
  await expect(page.getByTestId('capture-remaining')).toHaveText('60.0 s');
  await page.getByRole('button', { name: 'REC', exact: true }).click();
  await expect(page.getByTestId('track-state')).toHaveText('Recording');
  await expect(page.getByTestId('capture-remaining')).not.toHaveText('60.0 s');
  await page.getByRole('button', { name: 'Track STOP', exact: true }).click();
  await expect(page.getByTestId('track-state')).toHaveText('Stopped');
  await expect(page.getByTestId('transport-state')).toHaveText('Stopped');
  const length = await page.getByTestId('loop-length').textContent();
  expect(Number(length)).toBeGreaterThan(0);
  await expect(
    page.getByRole('button', { name: 'REC', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.getByTestId('transport-state')).toHaveText('Running');
  await expect(page.getByTestId('track-state')).toHaveText('Playing');
  await expect(page.getByTestId('output-level')).not.toHaveText('0.000');
  await page.getByRole('button', { name: 'Track STOP', exact: true }).click();
  await expect(page.getByTestId('track-state')).toHaveText('Stopped');
  await expect(page.getByTestId('transport-state')).toHaveText('Running');
  const position = await page.getByTestId('transport-position').textContent();
  await expect
    .poll(() => page.getByTestId('transport-position').textContent())
    .not.toBe(position);
  await page.getByRole('button', { name: 'Global STOP', exact: true }).click();
  await expect(page.getByTestId('transport-state')).toHaveText('Stopped');
  await expect(page.getByTestId('transport-position')).toHaveText('0');
  await expect(page.getByTestId('loop-length')).toHaveText(length!);
  await expect(page.getByTestId('output-level')).toHaveText('0.000');
  await expect(
    page.getByRole('button', { name: 'REC', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'PLAY', exact: true }).click();
  await expect(page.getByTestId('track-state')).toHaveText('Playing');
  await expect(page.getByTestId('output-level')).not.toHaveText('0.000');
});

test('global STOP discards unfinished first capture and permits a new recording', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start audio' }).click();
  await expect(page.getByRole('status')).toContainText('Audio ready');
  await page.getByRole('button', { name: 'REC', exact: true }).click();
  await expect(page.getByTestId('loop-length')).not.toHaveText('0');
  await page.getByRole('button', { name: 'Global STOP', exact: true }).click();
  await expect(page.getByTestId('track-state')).toHaveText('Empty');
  await expect(page.getByTestId('loop-length')).toHaveText('0');
  await expect(page.getByTestId('cycle-length')).toHaveText('0');
  await expect(page.getByTestId('capture-remaining')).toHaveText('60.0 s');
  await expect(
    page.getByRole('button', { name: 'PLAY', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'REC', exact: true }).click();
  await expect(page.getByTestId('track-state')).toHaveText('Recording');
});

test('production worklet completes a real 60-second sample capture automatically', async ({
  page,
}) => {
  await page.goto('/');
  const result = await page.evaluate(async () => {
    const context = new OfflineAudioContext(2, 480256, 8000);
    const module = await WebAssembly.compile(
      await (await fetch('/audio/loop-engine.wasm')).arrayBuffer(),
    );
    await context.audioWorklet.addModule('/audio/processor.js');
    const node = new AudioWorkletNode(context, 'loop-engine', {
      channelCount: 1,
      channelCountMode: 'explicit',
      outputChannelCount: [2],
      processorOptions: { module },
    });
    const command = (type: string) =>
      new Promise<{
        failed: boolean;
        track: {
          state: string;
          lengthSamples: number;
          capacitySamples: number;
          positionSamples: number;
          canRecord: boolean;
        };
        transport: {
          running: boolean;
          positionSamples: number;
          cycleLengthSamples: number;
        };
      }>((resolve) => {
        node.port.onmessage = ({ data }) => resolve(data);
        node.port.postMessage({ type });
      });
    const source = context.createConstantSource();
    source.offset.value = 0.25;
    source.connect(node).connect(context.destination);
    source.start();
    const before = await command('record');
    const audio = await context.startRendering();
    const after = await command('snapshot');
    const left = audio.getChannelData(0),
      right = audio.getChannelData(1);
    return {
      before,
      after,
      captureSilent: left.slice(0, 480000).every((sample) => sample === 0),
      replay: Array.from(left.slice(480000)),
      stereoMatches: left.every((sample, i) => sample === right[i]),
    };
  });
  expect(result.before.track.state).toBe('Recording');
  expect(result.before.track.capacitySamples).toBe(480000);
  expect(result.after.failed).toBe(false);
  expect(result.after.track.state).toBe('Playing');
  expect(result.after.track.lengthSamples).toBe(480000);
  expect(result.after.track.positionSamples).toBe(256);
  expect(result.after.track.canRecord).toBe(false);
  expect(result.after.transport).toEqual({
    running: true,
    positionSamples: 256,
    cycleLengthSamples: 480000,
  });
  expect(result.captureSilent).toBe(true);
  expect(result.replay).toEqual(Array(256).fill(0.25));
  expect(result.stereoMatches).toBe(true);
});
