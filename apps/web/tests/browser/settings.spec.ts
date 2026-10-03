import { expect, test } from '@playwright/test';

test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

test('restores persisted settings when a new audio session starts', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'loopbeats.settings.v1',
      JSON.stringify({
        confirmClearing: false,
        preferredInputId: null,
        masterGain: 0.4,
        tracks: [
          { mode: 'Loop', gain: 0.25, muted: true },
          { mode: 'OneShot', gain: 0.75, muted: false },
        ],
      }),
    );
  });
  await page.goto('/');
  await expect(
    page.getByRole('checkbox', { name: 'Confirm before clearing' }),
  ).not.toBeChecked();
  await page.getByRole('button', { name: 'Start audio' }).click();
  await expect(page.getByRole('status')).toContainText('Audio ready');
  await expect(page.getByRole('slider', { name: 'Master volume' })).toHaveValue(
    '0.4',
  );
  await expect(
    page.getByRole('slider', { name: 'Track 1 volume' }),
  ).toHaveValue('0.25');
  await expect(page.getByRole('button', { name: 'Unmute' })).toBeVisible();
});

test('beforeunload is canceled while a recording exists', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Start audio' }).click();
  await expect(page.getByRole('status')).toContainText('Audio ready');
  const track = page.getByRole('region', { name: 'Track 1 繚 Loop' });
  await track.getByRole('button', { name: 'REC', exact: true }).click();
  await expect
    .poll(async () =>
      Number(await track.getByTestId('captured-samples').textContent()),
    )
    .toBeGreaterThan(0);
  expect(
    await page.evaluate(() => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    }),
  ).toBe(true);
});
