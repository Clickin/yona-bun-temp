# StyleX parity report: form error-wrap states (2026-07-21)

## Scope

Batch 665 migrates the frozen `.error-wrap` wrapper, `ico-err2` sprite
position, and message typography for issue-edit not-found, pull-request-edit
403/404, and new-pull-request 400 states. The project shell, legacy
element/class structure, copy, and existing navigation behavior remain
unchanged.

The route-local StyleX owners use the frozen declarations: `padding: 100px
0px`, centered text, sprite position `-80px -160px`, `50px × 80px` icon, and
bold `16px` `#898989` message with `30px 0px` margin.

## Evidence

The three focused E2E files verify legacy Scala templates/messages, stable
StyleX owners, DOM order, computed desktop/mobile declarations, containment,
and fallback-link behavior.

Normal fallback mode: 3/3 passed.

Fallback disabled (`VITE_DISABLE_LEGACY_FALLBACK=1`): 3/3 passed.

## Comparison note

The managed legacy Yona visual endpoints were unavailable during this batch,
so a live screenshot comparison against the legacy server was not possible.
The source-backed Scala/LESS/message assertions and rendered computed-style
checks are the recorded parity evidence; this live replay gap remains
explicit and is not treated as visual equivalence proof.
