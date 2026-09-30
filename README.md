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
