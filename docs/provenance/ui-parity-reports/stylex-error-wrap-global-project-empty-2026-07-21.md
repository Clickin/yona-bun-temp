# StyleX parity report: global/project error-wrap states (2026-07-21)

## Scope

Batch 666 migrates the frozen `.error-wrap` wrapper, sprite positioning, and
message typography for secret not-found, project issue-labels empty, and
project webhooks empty states. Existing global/project shells, settings
navigation, legacy classes, element order, and copy remain unchanged.

The route-local owners preserve the frozen `ico-err2` declaration (`-80px
-160px`, `50px × 80px`) and `ico-err1` declaration (`-5px -160px`, `62px ×
82px`), together with `padding: 100px 0px`, centered text, and bold `16px`
`#898989` message typography with `30px 0px` margin.

## Evidence

`stylex-secret-notfound-error-wrap.e2e.ts`,
`stylex-project-labels-error-wrap.e2e.ts`, and
`stylex-project-webhooks-error-wrap.e2e.ts` verify the legacy Scala
templates/messages, stable StyleX owners, DOM order, computed desktop/mobile
declarations, containment, and fallback presence/absence.

Normal fallback mode: 3/3 passed.

Fallback disabled (`VITE_DISABLE_LEGACY_FALLBACK=1`): 3/3 passed.

## Comparison note

The managed legacy Yona visual endpoints were unavailable during this batch,
so a live screenshot comparison against the legacy server was not possible.
The source-backed Scala/LESS/message assertions and rendered computed-style
checks are the recorded parity evidence; this live replay gap remains
explicit and is not treated as visual equivalence proof.
