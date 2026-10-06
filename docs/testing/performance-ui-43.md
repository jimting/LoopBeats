# Settings and session safeguards (#43)

Implementation baseline: `aaf4594`. Evidence captured on 2026-10-06.
Specification: #41 and #43, with `docs/specs/two-track-performance-ui.md` as local context.

## Delivered

Settings and Diagnostics have independent native disclosures. Settings exposes
input selection, actual input/fallback status and the saved CLEAR confirmation
preference. Confirmation remains available before audio starts. Session reset
and track CLEAR occupy separated removal areas. Track sample counts live in a
track diagnostics disclosure rather than ordinary performance controls.

Startup, permission errors, recovery, input-switch gating, monitoring reset,
temporary recording warnings and the existing preference schema remain intact.
Guidance explicitly distinguishes preferences from recordings and explains the
limits of browser page-closure warnings and recovery.

Confirmation dialogs name and describe the requested removal, focus Cancel
initially, allow Escape, and return focus to the trigger on cancellation.
Confirmation returns focus to its disclosure because the engine reply can
disable CLEAR or Reset asynchronously. Opening a dialog does not stop audio.

No engine, worklet, protocol or persistence-schema change is part of this ticket.

## Verification

- Application suite: 26 tests passed. New observable-shell regression covers
  Settings before startup and separate diagnostics; pending input switching
  remains covered at the existing snapshot seam.
- Full production browser suite: all 53 test cases reported passing. Includes
  real WASM/worklet numerical regressions, preference/input/recovery coverage,
  Cancel/Escape/focus return, reset and seven deterministic session scenes.
- The Windows browser runner did not finish preview-server shutdown normally;
  it required interruption after the test cases completed. A clean command exit
  is not claimed.
- Production build, typecheck, scaffold and broad ESLint passed. The broad
  `npm run check` failed at formatting on existing untouched files and unrelated
  untracked `herdr-agent-usage` fixtures (including deliberately malformed JSON).
  No unrelated formatting cleanup is included.
- Presentation scenes and the existing desktop fixtures retain the essential
  control target at 1280 × 800. Open Settings and Diagnostics may scroll.

## Desktop review examples

Independent Standards and Spec reviews found no blocking implementation issues.
The Spec review identified one stale README disclosure name; it was corrected
before commit. Standards reported no actionable findings. No visual acceptance
or hardware pass is inferred from these code reviews.

These images freeze worklet snapshots for presentation only; they do not prove
audio correctness. Tests retain real integration coverage separately.

- [Idle](performance-ui-43/desktop-idle.png)
- [Ready](performance-ui-43/desktop-ready.png)
- [Permission error](performance-ui-43/desktop-error.png)
- [Interrupted](performance-ui-43/desktop-interrupted.png)
- [Open Settings](performance-ui-43/desktop-settings.png)
- [CLEAR confirmation](performance-ui-43/desktop-clear-dialog.png)
- [Reset confirmation](performance-ui-43/desktop-reset-dialog.png)

Owner visual acceptance remains pending. Responsive, zoom, comprehensive
keyboard/contrast coverage and narrow-screen examples belong to #44. No mobile
or Safari audio certification is claimed. Manual verification: no new listening
run; affected catalog cases M01, M07 and M08 retain their existing evidence and
limitations under the shared testing strategy.
