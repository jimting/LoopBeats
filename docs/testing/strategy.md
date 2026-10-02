# Testing strategy for one manual tester

Approved workflow change: 2026-10-02. This policy governs verification scheduling for the first usable two-track milestone and supersedes earlier per-slice manual-testing instructions. Product behavior and automated acceptance criteria remain unchanged.

## Feature PRs

Every implementation PR must provide relevant deterministic Rust tests, actual WASM/worklet integration and observable browser tests, plus required static checks and builds. Keep tests at the already agreed public seams. During development run affected tests; run the relevant complete suites before review/merge and let CI enforce its existing gates. Do not remove automated regression coverage just because two tests exercise the same feature at different seams.

Routine physical listening is deferred to #19. Passing automated checks and completed code/spec review allow a feature PR to merge and its ticket to close with manual verification explicitly deferred. A prerequisite is complete for subsequent implementation once its code is merged; deferred listening does not block #9 onward. The first usable milestone is not accepted or described as hardware-validated until #19 passes.

A PR states: automated evidence, affected manual case IDs, and `Manual verification: deferred to #19`, `passed` with an evidence link, or `failed` with a bug link. Unperformed cases are never marked passed. Do not attach a fresh full hardware checklist to every feature PR.

## When an early manual check is necessary

Request a focused check only for an observed or credibly isolated hardware/browser problem that automation cannot answer: input/output silence on physical hardware, an audible regression, input-device switching or interruption behavior not reproducible automatically, or a change invalidating accepted feasibility evidence. Explain the concrete uncertainty, affected case IDs and shortest reproduction. Merely touching audio code is not sufficient.

The tester performs only the affected case on the relevant setup. A reproducible failure blocks acceptance of affected behavior until fixed or explicitly deferred by the owner with a linked limitation; unrelated feature work can continue. No routine per-PR appointments or repeated full matrices are required.

## One shared manual backlog

Use [manual-validation.md](manual-validation.md) as the single case catalog and results format. #19 owns all deferred cases; feature issues/PRs link IDs rather than copying steps. Record the commit and setup once per run. Reuse startup/setup steps in the same session and combine related operations into one performance.

Reuse prior passes when the behavior and setup are unaffected. Recheck only affected cases after a fix or relevant change. Changes to shared engine processing, command scheduling, mixing or the worklet can affect several cases; list those dependencies rather than assuming only the edited UI control matters. CI remains required for every PR. The final #19 run still covers the integrated core flow once on its candidate commit, because isolated earlier passes do not prove the combined product.

## Milestone session (#19)

Begin with one available desktop Chrome setup and wired headphones; an audio interface is optional. Plan roughly 20–30 minutes, split into short sessions if needed, including one 10-minute playback run. This is a workload budget, not a performance guarantee. Capture failures once and file/link the reproduction; avoid repeatedly running the whole checklist while investigating a known failure.

Do not multiply every case across every device. First establish the desktop baseline. Test an additional setup only for a supported release target or a setup-specific defect; reuse the relevant subset. Summarize existing mobile spike findings and explicitly record untested devices. Safari/mobile production coverage and Bluetooth characterization remain later work; neither becomes an implicit requirement for this two-track desktop milestone.

## Completion and evidence

Feature Done: specified behavior implemented, relevant automated checks pass, docs and review complete, code merged, and deferred manual cases assigned to #19.

Milestone Done: all parent stories trace to evidence, desktop integrated manual cases pass, known failures are resolved or explicitly scoped out by the owner, and browser/hardware limitations are documented. Measurements and subjective observations are labeled separately. Deferred testing is a scheduling decision, not evidence of low latency or glitch-free playback.
