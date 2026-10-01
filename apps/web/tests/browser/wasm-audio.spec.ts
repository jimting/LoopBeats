import { mkdirSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

test('Rust WASM gain renders across block boundaries and initializes repeatedly', async ({
  page,
}) => {
  await page.goto('/');
  const results = await page.evaluate(async () => {
    // @ts-expect-error Disposable public module is outside the application TS graph.
    const { runOfflineProbe } = await import('/wasm-audio-spike/probe.js');
    const reports = [];
    for (let attempt = 0; attempt < 3; attempt++) {
      reports.push(await runOfflineProbe(30));
    }
    return reports;
  });
  mkdirSync('.scratch', { recursive: true });
  writeFileSync(
    '.scratch/wasm-offline-results.json',
    JSON.stringify({ date: new Date().toISOString(), results }, null, 2),
  );
  for (const result of results) {
    expect(result.samples).toEqual([0.25, 0.25, 0.25, 0.25, 0.25]);
    expect(result.snapshot.frames).toBeGreaterThanOrEqual(1440000);
    expect(result.snapshot.memoryBytes).toBe(
      result.snapshot.initialMemoryBytes,
    );
    expect(result.snapshot.failures).toBe(0);
  }
});

test('WASM processes synthetic microphone input continuously and restarts', async ({
  browser,
}) => {
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/wasm-audio-spike/index.html');
  const reports = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.getByRole('button', { name: 'Start microphone' }).click();
    await expect(page.locator('#status')).toHaveText(
      'Running — monitoring off',
    );
    await page.waitForFunction(() => {
      const report = JSON.parse(
        document.querySelector('#diagnostics')!.textContent!,
      );
      return report.worklet?.inputRms > 0;
    });
    await page.getByRole('button', { name: 'Enable monitoring' }).click();
    await page.waitForFunction(
      () =>
        JSON.parse(document.querySelector('#diagnostics')!.textContent!)
          .outputMeter?.inputRms > 0,
    );
    await page.waitForTimeout(5000);
    const before = JSON.parse(await page.locator('#diagnostics').innerText());
    await page.evaluate(() => {
      const until = performance.now() + 500;
      while (performance.now() < until) {
        /* artificial main-thread load */
      }
    });
    await page.waitForTimeout(500);
    const after = JSON.parse(await page.locator('#diagnostics').innerText());
    expect(after.worklet.frames).toBeGreaterThan(before.worklet.frames);
    expect(after.worklet.outputRms / after.worklet.inputRms).toBeCloseTo(
      0.5,
      5,
    );
    expect(after.worklet.memoryBytes).toBe(after.worklet.initialMemoryBytes);
    expect(after.worklet.failures).toBe(0);
    expect(after.failures).toEqual([]);
    reports.push({ before, after });
    await page.getByRole('button', { name: 'Stop audio' }).click();
    expect(
      JSON.parse(await page.locator('#diagnostics').innerText()).contextState,
    ).toBe('closed');
    // Fresh telemetry for each newly created WASM instance.
    await page.reload();
  }
  expect(errors).toEqual([]);
  mkdirSync('.scratch', { recursive: true });
  writeFileSync(
    '.scratch/wasm-realtime-results.json',
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: browser.version(),
        input: 'Chromium fake media, not physical hardware',
        reports,
      },
      null,
      2,
    ),
  );
  await context.close();
});

test.use({
  launchOptions: {
    args: [
      '--use-fake-device-for-media-stream',
      '--use-fake-ui-for-media-stream',
    ],
  },
});
