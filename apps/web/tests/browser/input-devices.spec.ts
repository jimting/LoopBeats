import { expect, test } from '@playwright/test';

test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

test('shows input selection and gates switching during capture', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const mediaDevices = navigator.mediaDevices;
    mediaDevices.enumerateDevices = async () => [
      {
        deviceId: 'default',
        groupId: 'group',
        kind: 'audioinput',
        label: 'Default microphone',
        toJSON() {
          return this;
        },
      },
      {
        deviceId: 'usb',
        groupId: 'group',
        kind: 'audioinput',
        label: 'USB interface',
        toJSON() {
          return this;
        },
      },
    ];
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'Start audio' }).click();
  await expect(page.getByRole('status')).toContainText('Audio ready');
  const input = page.getByRole('combobox', { name: 'Audio input' });
  await expect(input).toBeVisible();
  await expect(input).toHaveValue('');
  await page
    .getByRole('region', { name: /Track 1/ })
    .first()
    .getByRole('button', { name: 'REC', exact: true })
    .click();
  await expect(input).toBeDisabled();
});
