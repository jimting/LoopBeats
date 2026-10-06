import { expect, test } from '@playwright/test';
import { showPresentation, trackFixture } from './presentation-fixtures';

test.use({
  viewport: { width: 1280, height: 800 },
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

for (const scene of [
  'idle',
  'ready',
  'error',
  'interrupted',
  'settings',
  'clear-dialog',
  'reset-dialog',
] as const) {
  test(`session safeguards presentation: ${scene}`, async ({
    page,
  }, testInfo) => {
    const status = ['idle', 'error', 'interrupted'].includes(scene)
      ? (scene as 'idle' | 'error' | 'interrupted')
      : 'ready';
    await showPresentation(
      page,
      [trackFixture('Stopped'), trackFixture('Empty')],
      status,
    );
    if (scene === 'settings' || scene === 'reset-dialog') {
      const settings = page
        .locator('summary')
        .filter({ hasText: /^Settings$/ });
      await settings.focus();
      await page.keyboard.press('Enter');
      await expect(
        page.getByRole('region', { name: 'Settings' }).getByRole('checkbox'),
      ).toBeVisible();
      await expect(
        page.getByText('Sample rate', { exact: true }),
      ).not.toBeVisible();
      if (scene === 'reset-dialog')
        await page
          .getByRole('button', { name: 'Reset session', exact: true })
          .click();
    }
    if (scene === 'clear-dialog') {
      await page.getByText('Track 1 details', { exact: true }).click();
      await page.getByRole('button', { name: 'CLEAR', exact: true }).click();
    }
    if (scene.endsWith('dialog')) {
      await expect(page.getByRole('dialog')).toBeVisible();
      await expect(
        page.getByRole('button', { name: 'Cancel', exact: true }),
      ).toBeFocused();
    }
    if (scene === 'interrupted') {
      await expect(
        page.getByRole('button', { name: 'Reinitialize audio' }),
      ).toBeEnabled();
      await expect(
        page.getByRole('button', { name: /Track 1 REC\/PLAY/ }),
      ).toBeDisabled();
    }
    if (scene === 'error') {
      await expect(page.getByRole('alert')).toContainText(
        'Allow microphone access',
      );
      await expect(
        page.getByRole('button', { name: 'Start audio', exact: true }),
      ).toBeEnabled();
    }
    await page.evaluate(() => document.fonts.ready);
    const path = testInfo.outputPath(`desktop-${scene}.png`);
    await page.screenshot({ path, fullPage: true, animations: 'disabled' });
    await testInfo.attach(`desktop-${scene}`, {
      path,
      contentType: 'image/png',
    });
  });
}
