# Pull-request Select2 bridge retirement — 2026-07-20

The bounded app.css bridge
`.pull-request-wrap .select2-container > button.select2-choice` was audited
against the frozen create/edit templates and current React consumer graph.
The create route's two branch pickers use `styles.select2Choice`, which owns
the exact `box-sizing: border-box`, `width: 100%`, `height: auto`, and
`text-align: left` declarations. The edit route preserves the wrapper but
renders native disabled selects, so it has no matching nested button. Frozen
`_page.less` supplies only `.pull-request-wrap` geometry and no nested Select2
rule.

The redundant block was removed from `frontend/src/app.css`. The raw
`pull-request-wrap`, `select2-container`, and `select2-choice` classes remain
for legacy DOM/behavior compatibility. The static ownership contract now
asserts the scoped bridge is absent. Managed Playwright checks passed 2/2 in
normal mode and 2/2 with `VITE_DISABLE_LEGACY_FALLBACK=1` (ownership contract
plus create-form closed-state/geometry contract). No frozen source, TSX,
generated fallback, or screenshot baseline changed.

Global fallback discovery remains incomplete/non-green; this report covers
only the exact unreachable/redundant declaration.
