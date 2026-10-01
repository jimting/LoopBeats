const { chromium } = require('@playwright/test');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const assert = require('node:assert/strict');

(async () => {
  const server = spawn(
    'npm',
    [
      'run',
      'dev',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      '5191',
      '--strictPort',
    ],
    {
      cwd: require('node:path').resolve(__dirname, '..'),
      stdio: 'ignore',
      detached: true,
    },
  );
  let browser, denialBrowser;
  try {
    for (let i = 0; i < 60; i++) {
      try {
        if ((await fetch('http://127.0.0.1:5191/')).ok) break;
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({
      executablePath: process.env.LOOPBEATS_CHROMIUM_EXECUTABLE_PATH,
      args: [
        '--use-fake-device-for-media-stream',
        '--use-fake-ui-for-media-stream',
      ],
    });
    const context = await browser.newContext({ permissions: ['microphone'] });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto('http://127.0.0.1:5191/browser-audio-spike/index.html');
    const read = async () =>
      JSON.parse(await page.locator('#diagnostics').innerText());
    await page.getByRole('button', { name: 'Start microphone' }).click();

    await page.waitForFunction(
      () =>
        document.querySelector('#status').textContent ===
        'Running — monitoring off',
    );
    await page.waitForFunction(() => {
      const x = JSON.parse(document.querySelector('#diagnostics').textContent);
      return x.worklet?.inputRms > 0 && x.outputRms === 0;
    });
    const off = await read();
    await page.getByRole('button', { name: 'Enable monitoring' }).click();

    await page.waitForFunction(
      () =>
        JSON.parse(document.querySelector('#diagnostics').textContent)
          .outputMeter?.inputRms > 0.001,
    );
    await page.waitForTimeout(5000);
    const on = await read();
    await page.evaluate(() => {
      const until = performance.now() + 500;
      while (performance.now() < until) {
        /* artificial main-thread load */
      }
    });
    await page.waitForTimeout(350);
    const busy = await read();
    assert(busy.worklet.frames > on.worklet.frames);
    await page.getByRole('button', { name: 'Disable monitoring' }).click();
    await page.waitForFunction(
      () =>
        JSON.parse(document.querySelector('#diagnostics').textContent)
          .outputRms < 0.00001,
    );
    const offAgain = await read();
    await page.getByRole('button', { name: 'Stop audio' }).click();
    const stopped = await read();
    assert.equal(stopped.contextState, 'closed');
    denialBrowser = await chromium.launch({
      executablePath: process.env.LOOPBEATS_CHROMIUM_EXECUTABLE_PATH,
      args: ['--use-fake-device-for-media-stream'],
    });
    const denial = await denialBrowser.newContext();
    const deniedPage = await denial.newPage();
    const cdp = await denialBrowser.newBrowserCDPSession();
    await cdp.send('Browser.setPermission', {
      permission: { name: 'microphone' },
      setting: 'denied',
      origin: 'http://127.0.0.1:5191',
      browserContextId: (
        await cdp.send('Target.getBrowserContexts')
      ).browserContextIds.at(-1),
    });
    await deniedPage.goto(
      'http://127.0.0.1:5191/browser-audio-spike/index.html',
    );
    await deniedPage.getByRole('button', { name: 'Start microphone' }).click();
    await deniedPage.waitForFunction(() =>
      document
        .querySelector('#status')
        .textContent.startsWith('Audio startup failed'),
    );
    const denied = JSON.parse(
      await deniedPage.locator('#diagnostics').innerText(),
    );
    assert(denied.failures.length > 0); // Record actual error; do not claim human permission-dialog coverage.
    assert.equal(errors.length, 0);
    const report = {
      date: new Date().toISOString(),
      browser: browser.version(),
      input: 'Chromium built-in fake-media input, not physical hardware',
      off,
      on,
      busy,
      offAgain,
      stopped,
      denied,
      pageErrors: errors,
    };
    fs.mkdirSync(require('node:path').resolve(__dirname, '../.scratch'), {
      recursive: true,
    });
    fs.writeFileSync(
      require('node:path').resolve(
        __dirname,
        '../.scratch/browser-audio-probe-results.json',
      ),
      JSON.stringify(report, null, 2),
    );
    console.log(JSON.stringify(report, null, 2));
  } finally {
    await denialBrowser?.close();
    await browser?.close();
    process.kill(-server.pid, 'SIGTERM');
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
