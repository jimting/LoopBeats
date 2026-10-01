import { spawnSync } from 'node:child_process';
import { copyFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const build = spawnSync(
  'cargo',
  [
    'build',
    '--locked',
    '--release',
    '--target',
    'wasm32-unknown-unknown',
    '-p',
    'wasm-gain-spike',
  ],
  { cwd: root, stdio: 'inherit' },
);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);
copyFileSync(
  new URL(
    '../target/wasm32-unknown-unknown/release/wasm_gain_spike.wasm',
    import.meta.url,
  ),
  new URL('../apps/web/public/wasm-audio-spike/gain.wasm', import.meta.url),
);
