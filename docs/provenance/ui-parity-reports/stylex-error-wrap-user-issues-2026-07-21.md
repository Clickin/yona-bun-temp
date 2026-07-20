# StyleX parity report: current-user issues empty state (2026-07-21)

## Scope

Batch 668 migrates the frozen `.error-wrap` wrapper, `ico-err1` sprite paint,
and message typography for the current-user issues empty state. The existing
user issues shell, search/filter tabs, interaction, classes, element order,
and copy remain unchanged.

The route-local owner preserves `ico-err1` at background position `-5px
-160px`, `62px × 82px`, no-repeat, inline-block, and middle vertical
alignment. The wrapper uses `padding: 100px 0px` and centered text; the
message uses bold `16px` `#898989` with `30px 0px` margin.

## Evidence

`stylex-user-issues-error-wrap.e2e.ts` verifies the legacy Scala templates and
message, stable StyleX owners, DOM order, computed desktop/mobile declarations,
containment, and fallback presence/absence.

Normal fallback mode: 1/1 passed.

Fallback disabled (`VITE_DISABLE_LEGACY_FALLBACK=1`): 1/1 passed.

## Comparison note

The managed legacy Yona visual endpoints were unavailable during this batch,
so a live screenshot comparison against the legacy server was not possible.
The source-backed Scala/LESS/message assertions and rendered computed-style
checks are the recorded parity evidence; this live replay gap remains
explicit and is not treated as visual equivalence proof.
