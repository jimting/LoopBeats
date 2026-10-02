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

The application starts a microphone/audio-interface session through AudioClient, AudioWorklet and the Rust/WASM engine. Monitoring defaults off and is explicitly controlled. Status, input/output levels and actionable startup errors are visible. Recording and loop playback belong to later tickets. The isolated #5/#6 experiment pages remain available for research.

## Environment setup

| Tool            | Requirement                                                                          | Install                                                                          |
| --------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Node.js and npm | Node 24 is the tested development/CI version; npm comes with Node                    | [Official Node.js downloads](https://nodejs.org/en/download) — select version 24 |
| Rust and Cargo  | Install through rustup; required for application startup/build, WASM and Rust checks | [Official Rust installer](https://rust-lang.org/tools/install/)                  |
| Git             | Required to clone/update this repository                                             | Verify with `git --version`                                                      |

### Windows (PowerShell)

1. Install Node 24 using the Windows installer. If you already use a Node version manager, select Node 24 through that manager instead.
2. Download and run `rustup-init.exe` from the Rust installation page. Accept the default MSVC toolchain. Install the Visual Studio C++ build tools if prompted; select **Desktop development with C++** with its MSVC tools and Windows SDK. See [Microsoft's Windows Rust setup guide](https://learn.microsoft.com/en-us/windows/dev-environment/rust/setup).
3. Close and reopen PowerShell after installation. If using an integrated terminal, restart VS Code as well so it receives the updated PATH.
4. Verify the tools before starting the application:

```powershell
node --version       # Expected: v24.x
npm --version
cargo --version
rustup --version
git --version
```

Clone the repository if you do not already have it:

```powershell
git clone https://github.com/ty-jt-agent/LoopBeats.git
cd LoopBeats
```

In an existing clone, open PowerShell in its root directory. Run `rustup show` there: `rust-toolchain.toml` selects Rust 1.98.1, rustfmt, clippy and the `wasm32-unknown-unknown` target. Rustup downloads the selected toolchain/target on first use; allow that download to finish.

### macOS / Linux

Install Node 24 and Rust using the official links above. After rustup installation, open a new terminal or run `source "$HOME/.cargo/env"` to load Cargo into PATH. Verify `node --version`, `npm --version`, `cargo --version` and `rustup --version`, then clone/open the repository and run `rustup show` from its root.

### Troubleshooting: `spawnSync cargo ENOENT`

This means the build script cannot find Cargo. Cargo is installed by rustup, not by `npm ci`. First run `Get-Command cargo` in PowerShell. If Cargo is missing, check whether the executable exists:

```powershell
Test-Path "$env:USERPROFILE\.cargo\bin\cargo.exe"
```

If this returns `False`, install Rust using the steps above. If it returns `True`, reopen your terminal/editor or add the default Rust directory for the current PowerShell session:

```powershell
$env:Path = "$env:USERPROFILE\.cargo\bin;$env:Path"
cargo --version
```

For a permanent fix, add `%USERPROFILE%\.cargo\bin` to your Windows user PATH and restart the terminal/editor. If you chose a custom Cargo installation directory, use that directory instead. A Node 22 installation is a separate environment mismatch: select Node 24 and reopen the terminal before running `npm ci` again.

## Run locally

After verifying the environment, run from the repository root:

```bash
npm ci
npm run dev
```

The dev command builds the real audio assets first, so Cargo must be on PATH. Open the local URL printed by Vite (normally http://localhost:5173). Click **Start audio** and allow microphone access. Use wired headphones, then explicitly **Enable monitoring** to hear live input. **Stop audio** releases the microphone; the next session starts with monitoring off. A connected audio interface can be selected as the browser/OS default input; in-app device selection comes later. For a production preview, run `npm run build`, then `npm run preview`.

Run `npm run check` for scaffold, type, lint, formatting and TypeScript unit checks. See [development instructions](docs/development.md) for browser, Rust/WASM and CI commands. The [testing strategy](docs/testing/strategy.md) keeps automated checks on every PR and batches routine physical-audio checks in milestone #19 for our single manual tester.

Vendored Matt Pocock skills are MIT licensed, pinned and attributed in `.agents/skills/UPSTREAM.md`. `/to-issues` is local compatibility naming, not an upstream skill.

## Rust/WASM audio experiment (#6)

This isolated feasibility page is separate from the production application. Install Node 24 and Rust via rustup (the repository toolchain installs its WASM target), then run:

```bash
npm ci
npm run spike:wasm
```

Open `/wasm-audio-spike/index.html` on the printed localhost URL. Use wired headphones, Start microphone, then Enable monitoring. The worklet applies a fixed 0.5 gain before monitoring gain. Run the offline probe and Download diagnostics while running. See [the findings and manual checklist](docs/research/wasm-audio-spike.md).

`npm run test:browser` now builds the WASM spike first and requires Cargo on PATH. The generated `gain.wasm` is ignored by git; `npm run spike:wasm:build` regenerates it before serving or building the experiment. Ordinary web development and the application shell remain independent of this page.
