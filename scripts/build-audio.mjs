import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const result = spawnSync(
  'cargo',
  [
    'build',
    '--locked',
    '--release',
    '--target',
    'wasm32-unknown-unknown',
    '-p',
    'loop-engine',
  ],
  { cwd: root, stdio: 'inherit' },
);
if (result.error) {
  console.error(
    'Cannot run Cargo. Install Rust/rustup, reopen your terminal, and verify cargo --version. See README environment setup.',
  );
  process.exit(1);
}
if (result.status !== 0) process.exit(result.status ?? 1);
mkdirSync(new URL('../apps/web/public/audio/', import.meta.url), {
  recursive: true,
});
copyFileSync(
  new URL(
    '../target/wasm32-unknown-unknown/release/loop_engine.wasm',
    import.meta.url,
  ),
  new URL('../apps/web/public/audio/loop-engine.wasm', import.meta.url),
);
copyFileSync(
  new URL('../packages/audio-client/src/processor.js', import.meta.url),
  new URL('../apps/web/public/audio/processor.js', import.meta.url),
);
