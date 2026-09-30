# Development and contribution

This commit prepares navigation and skills, not a runnable application. Do not install every future subsystem before verifying the browser audio and WASM spikes.

## Available now

- `npm run check:scaffold`: structure, skill names and required configuration checks; no dependency install needed.
- `cargo check --workspace`: Rust scaffold compilation, with a Rust toolchain installed.

## Foundation ticket must configure

React/TypeScript/Vite, formatting, linting, Vitest, Playwright, WASM build tooling, lockfiles and CI. Define real scripts before documenting them as available. Required future gates: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, Prettier check, Cargo fmt/clippy/test, WASM build, and Playwright smoke tests.

Use deterministic Rust tests as the strongest layer, TypeScript controller tests, boundary integration tests, audio golden fixtures, browser smoke tests, and a manual device matrix. Automated browser tests do not establish live-performance latency.

Ready: behavior, glossary, dependencies, acceptance criteria, architectural decisions and test seam understood. Done: specified behavior implemented, appropriate tests and static checks pass, required browser verification, docs updated, review completed and PR evidence supplied. Prefer small PRs. Revisit architecture every 3–5 substantial feature PRs.
