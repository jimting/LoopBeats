# LoopBeats

A Web-first multi-track loopstation inspired by the BOSS RC-505. The target is React + TypeScript, Web Audio API + AudioWorklet, and a portable Rust/WASM loop engine.

Priorities: exact loop timing, stable audio, low perceived latency, cross-device support, clear boundaries, testability, and small verifiable slices.

## Start here

1. Clone this repository and open it in Codex. Project skills are committed under `.agents/skills/`.
2. Read `AGENTS.md`, `GLOSSARY.md`, and `docs/development-plan.md`.
3. Setup is configured for GitHub Issues and documentation under `docs/`.
4. Invoke `$grill-with-docs` to resolve requirements, then `$to-spec`, then `$to-tickets` (or the local `$to-issues` alias). Slash forms work in harnesses that support them.
5. Follow the approved [two-track ticket map](docs/specs/two-track-tickets.md). Work a ticket only after its blockers are complete.

## Structure

| Directory               | Responsibility                                    |
| ----------------------- | ------------------------------------------------- |
| `apps/web`              | Browser application, public assets, browser tests |
| `packages/audio-client` | Browser audio host and worklet/WASM bridge        |
| `packages/domain`       | Shared application-facing TypeScript types        |
| `packages/ui`           | Presentation components                           |
| `crates/loop-engine`    | Browser-independent deterministic Rust core       |
| `docs/agents`           | Skills workflow configuration                     |
| `docs/architecture`     | Dependency and real-time boundaries               |
| `docs/adr`              | Architecture decision records                     |
| `docs/research`         | Experiments and browser findings                  |

## Current state

A runnable React/TypeScript/Vite shell and development quality gates are configured. Audio recording and playback are not implemented yet. The Rust crate is still an empty portable boundary; its native and WASM builds verify tooling, not loop behavior.

## Run locally

Install Node 24+, npm and Rust via rustup, then:

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://localhost:5173). For a production preview, run `npm run build`, then `npm run preview`.

Run `npm run check` for scaffold, type, lint, formatting and TypeScript unit checks. See [development instructions](docs/development.md) for browser, Rust/WASM and CI commands.

Vendored Matt Pocock skills are MIT licensed, pinned and attributed in `.agents/skills/UPSTREAM.md`. `/to-issues` is local compatibility naming, not an upstream skill.

## Rust/WASM audio experiment (#6)

This isolated feasibility page is separate from the production application. Install Node 24 and Rust via rustup (the repository toolchain installs its WASM target), then run:

```bash
npm ci
npm run spike:wasm
```

Open `/wasm-audio-spike/index.html` on the printed localhost URL. Use wired headphones, Start microphone, then Enable monitoring. The worklet applies a fixed 0.5 gain before monitoring gain. Run the offline probe and Download diagnostics while running. See [the findings and manual checklist](docs/research/wasm-audio-spike.md).

`npm run test:browser` now builds the WASM spike first and requires Cargo on PATH. The generated `gain.wasm` is ignored by git; `npm run spike:wasm:build` regenerates it before serving or building the experiment. Ordinary web development and the application shell remain independent of this page.
