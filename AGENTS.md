# LoopBeats agent guide

Read `README.md`, `GLOSSARY.md`, `docs/development-plan.md`, and relevant ADRs before changing the system.

## Agent skills

### Issue tracker

GitHub Issues in `ty-jt-agent/LoopBeats`. See `docs/agents/issue-tracker.md`.

### Triage labels

Use the five default canonical labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single shared domain context: root `GLOSSARY.md` and `docs/adr/`. See `docs/agents/domain.md`.

### Skill discovery and workflow

Repository skills live in `.agents/skills/<name>/SKILL.md`, with bundled references and `agents/openai.yaml`. Read the selected skill before following it. Codex discovers these project skills when opening this checkout; use `$skill-name` in Codex or `/skill-name` in harnesses supporting slash commands. Global installation is unnecessary.

Normal flow: grill-with-docs → to-spec → to-tickets → implement or implement-spec → code-review → pr → retro. `to-issues` is a documented compatibility alias of `to-tickets`. Use domain-modeling, codebase-design, tdd, research, prototype and diagnosing-bugs where relevant. Skills are prompt workflows, not shell executables.

Setup is complete for GitHub, default triage vocabulary, and shared domain docs. Do not regenerate issues during setup. Do not implement product behavior before a reviewed specification and ready tickets exist. The roadmap is planning input, not a substitute for a specification.

## Engineering invariants

1. The audio processing thread owns timing-sensitive behavior.
2. React is never the timing authority; timers and animation frames are visual aids only.
3. Real-time processing cannot depend on network, DOM, blocking operations or uncontrolled allocation.
4. Tracks share one authoritative sample-based transport.
5. UI state represents engine state rather than redefining it.
6. Keep vocabulary consistent with `GLOSSARY.md`.
7. New deterministic engine behavior normally starts with a failing test.
8. Optimize only against a reproducible measurement.
9. Encapsulate browser audio infrastructure in audio-client; never scatter AudioContext operations through components.
10. Keep Rust independent of React and browser APIs.

## Repository navigation

- `apps/web`: React/TypeScript browser shell, assets and browser tests.
- `packages/audio-client`: AudioContext lifecycle, commands, worklet/WASM bridge.
- `packages/domain`: application-facing types, not a second engine state machine.
- `packages/ui`: reusable presentation components with no audio ownership.
- `crates/loop-engine`: portable deterministic Rust core and DSP.
- `docs/architecture`, `docs/adr`, `docs/research`: boundaries, decisions and experiments.

## Current verification status

This setup contains directory and workspace scaffolding only. React/Vite, TypeScript, ESLint, Prettier, Vitest, Playwright, WASM tooling and CI are future foundation work. Do not claim `npm test`, lint, typecheck, web build or browser tests are configured. `npm run check:scaffold` verifies the checked-in structure. `cargo check --workspace` checks the empty Rust scaffold when Rust is installed. No loop engine behavior exists yet.
