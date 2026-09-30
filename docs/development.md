# Development and contribution

## Fresh checkout

Install Node 24+ and npm, and Rust through rustup. The committed toolchain selects Rust 1.98.1, rustfmt, clippy and wasm32-unknown-unknown. Rustup installs these on the first Cargo command. Dependencies are pinned in npm and Cargo lockfiles.

```bash
npm ci
npx playwright install --with-deps chromium
npm run dev
```

Vite prints the development URL (normally http://localhost:5173). The application currently displays a shell; audio functionality belongs to later tickets. For production preview run `npm run build`, then `npm run preview`.

## Verification commands

Run from the repository root:

| Command | Checks |
| --- | --- |
| `npm run check:scaffold` | Repository structure and skills |
| `npm run typecheck` | Web/shared sources, tests and TypeScript configuration |
| `npm run lint` | TypeScript/React and tooling JavaScript; warnings fail |
| `npm run format:check` | Maintained application and tooling formatting |
| `npm test` | Vitest tests through observable UI boundaries |
| `npm run check` | All five checks above |
| `npm run build` | Typecheck and production web build |
| `npm run test:browser` | Build and Playwright Chromium startup against production preview |
| `cargo fmt --all -- --check` | Rust formatting |
| `cargo clippy --locked --workspace --all-targets -- -D warnings` | Rust linting |
| `cargo test --locked --workspace` | Rust tests |
| `npm run build:wasm` | Release WASM artifact for portable Rust crate |

Use `npm run format` and `cargo fmt --all` to format. Existing domain/design documents and vendored skills are excluded from Prettier to preserve their text; review documentation edits directly.

Playwright starts its own preview server at 127.0.0.1:4173 and refuses an occupied port. Chromium must be installed; Linux libraries can be installed by the --with-deps command. Failure traces are retained under test-results.

The WASM artifact is target/wasm32-unknown-unknown/release/loop_engine.wasm. This ticket verifies compilation only: no JS bindings, AudioWorklet integration or engine behavior exist yet. Cargo runs zero behavioral tests; add meaningful sample-level tests as engine functionality begins.

## CI

GitHub Actions runs on pull requests and main pushes. The web job runs Node 24, npm ci, all web checks, browser installation and the production smoke test. The Rust job uses the committed toolchain, fmt, clippy, tests and release WASM build. Errors fail jobs; browser failure artifacts are uploaded.

Repository administrators can require both jobs in branch protection; adding a workflow does not configure repository rules.

## Working a ticket

Follow the approved ticket map and parent specification. Implement one verifiable slice per PR. Use agreed seams: deterministic engine output, real browser audio boundary where relevant, and observable UI interactions. Foundation tests do not establish audio feasibility, live latency or cross-device support.

Ready means behavior, vocabulary, blockers, acceptance criteria and seam are understood. Done means specified behavior and appropriate tests pass, required browser evidence exists, docs are updated, review is complete and the PR provides evidence. Revisit architecture every 3–5 substantial feature PRs.
