import { expect, test } from '@playwright/test';
import {
  showPresentation,
  trackFixture,
  visualViewports,
} from './presentation-fixtures';

test.use({
  viewport: { width: 1280, height: 800 },
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});

for (const viewport of visualViewports) {
  for (const [name, first, second] of [
    ['empty-stopped', trackFixture('Empty'), trackFixture('Stopped')],
    ['recording-playing', trackFixture('Recording'), trackFixture('Playing')],
    [
      'overdubbing-muted',
      trackFixture('Overdubbing'),
      trackFixture('Playing', true),
    ],
  ] as const) {
    test(`deterministic ${viewport.name} panel: ${name}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await showPresentation(page, [first, second]);
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
        if (viewport.name === 'desktop') {
          expect(box!.y).toBeGreaterThanOrEqual(0);
          expect(box!.y + box!.height).toBeLessThanOrEqual(800);
        }
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
        expect(box!.width).toBeGreaterThanOrEqual(44);
        expect(box!.height).toBeGreaterThanOrEqual(44);
      }
      const left = await tracks.nth(0).boundingBox(),
        right = await tracks.nth(1).boundingBox();
      if (viewport.width >= 768) {
        expect(left!.y).toBe(right!.y);
        expect(right!.x).toBeGreaterThan(left!.x + left!.width);
      } else expect(right!.y).toBeGreaterThanOrEqual(left!.y + left!.height);
      if (viewport.name === 'desktop') {
        expect(left!.y + left!.height).toBeLessThanOrEqual(800);
        expect(right!.y + right!.height).toBeLessThanOrEqual(800);
      }
      expect(
        await page.evaluate(
          () =>
            document.documentElement.scrollWidth >
            document.documentElement.clientWidth,
        ),
      ).toBe(false);
      for (const primary of await page
        .getByRole('button', { name: /REC\/PLAY/ })
        .all()) {
        const box = (await primary.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(88);
        expect(box.height).toBeGreaterThanOrEqual(88);
      }
      await page.evaluate(() => document.fonts.ready);
      const screenshot = testInfo.outputPath(`${viewport.name}-${name}.png`);
      await page.screenshot({
        path: screenshot,
        fullPage: true,
        animations: 'disabled',
      });
      await testInfo.attach(`${viewport.name}-${name}`, {
        path: screenshot,
        contentType: 'image/png',
      });
    });
  }
}
