# Responsive and accessible performance interface (#44)

Implementation baseline: latest main `b522397`. Evidence captured on 2026-10-06.
Branch: `issue-44-responsive-accessibility`. The separate planning commit
`a764813` records future session import/export; it adds no product behavior.

## Delivered

Tracks remain adjacent on desktop/tablet and stack on narrow screens. Controls,
settings, diagnostics and confirmation dialogs remain reachable without
horizontal overflow, including a 640 × 400 CSS viewport representing the
1280 × 800 layout at 200% zoom. Small controls retain 44 × 44 minimum targets;
primary controls retain 88 × 88 minimum targets. Dialogs scroll within the
viewport. Disabled text, muted controls and focus boundaries retain contrast.

Keyboard coverage exercises audio startup, monitoring, master/track ranges,
recording, global STOP/Start, track STOP, mute, disclosures, CLEAR, preferences
and reset, including Escape and focus return. Reduced-motion coverage retains
meaningful progress and textual state while suppressing decorative motion.
No engine, worklet, protocol or audio timing behavior changes.

## Verification

- Red/green regressions: the zoom-equivalent layout initially left tracks
  adjacent; the narrow breakpoint fixes it. Contrast coverage found the muted
  button boundary at approximately 1.8:1; its revised border passes 3:1.
  Review also exposed pressed-toggle hover contrast; a failing hovered-mute
  regression now passes with the pressed appearance preserved on hover.
- Application suite: all 26 tests passed.
- Full production browser run exercised 98 cases: 94 passed and four contrast
  cases exposed the muted-border defect. After correction, all 55 affected
  responsive/accessibility and visual cases ran without reported failures.
  The other 43 cases, including real WASM/worklet regressions, passed in the
  full run. A single clean 98-case pass is not claimed.
- Windows preview-server shutdown stalled after test execution and required
  interruption. A clean browser-command exit is not claimed.
- Production build, typecheck, scaffold and broad ESLint passed. Changed-file
  code/verification-record formatting and diff whitespace checks passed.
  README retains its existing formatting warning. Broad `npm run check` failed
  on existing untouched formatting and unrelated untracked fixtures, including
  malformed JSON; no unrelated cleanup is included.
- The deterministic matrix includes three track-state scenes and eight
  lifecycle/settings/diagnostics/dialog scenes at four viewport sizes (44
  screenshots). Presentation fixtures freeze engine snapshots and are not
  evidence of audio correctness; real integration tests remain separate.

## Owner review examples

| CSS viewport | Track states | Settings | Reset dialog |
| --- | --- | --- | --- |
| Desktop 1280 × 800 | [Overdub/muted](performance-ui-44/desktop-overdubbing-muted.png) | [Settings](performance-ui-44/desktop-settings.png) | [Reset](performance-ui-44/desktop-reset-dialog.png) |
| Tablet 768 × 1024 | [Recording/playing](performance-ui-44/tablet-recording-playing.png) | [Settings](performance-ui-44/tablet-settings.png) | [Reset](performance-ui-44/tablet-reset-dialog.png) |
| Narrow 390 × 844 | [Recording/playing](performance-ui-44/narrow-recording-playing.png) | [Settings](performance-ui-44/narrow-settings.png) | [Reset](performance-ui-44/narrow-reset-dialog.png) |
| Compact 320 × 844 | [Empty/stopped](performance-ui-44/compact-empty-stopped.png) | [Settings](performance-ui-44/compact-settings.png) | [Reset](performance-ui-44/compact-reset-dialog.png) |

The remaining scenes are in [the screenshot directory](performance-ui-44/).
Owner visual acceptance and actual browser-chrome zoom inspection remain
pending. No mobile/Safari audio certification or new hardware/listening pass
is claimed. Integrated hardware acceptance remains #19 under the shared
testing strategy.

## Code review

Standards review found no hard violations and one minor duplicated-viewport
heuristic; accessibility tests now reuse the shared visual viewport catalog.
Spec review found the pressed-toggle hover contrast defect, corrected with
focused regression coverage. Five viewport cases and four hovered contrast
cases were rerun after these review changes without reported failures.
