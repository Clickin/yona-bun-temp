# StyleX parity report: milestones/organization empty states (2026-07-21)

## Scope

Batch 667 migrates the frozen `.error-wrap` wrapper, `ico-err1` sprite paint,
and message typography for project milestones empty and organization
directory empty states. Existing project/global shells, tabs/search controls,
navigation, classes, element order, and copy remain unchanged.

The route-local owners preserve the frozen `ico-err1` declaration:
background position `-5px -160px`, `62px × 82px`, no-repeat, inline-block,
and middle vertical alignment. The wrapper uses `padding: 100px 0px` and
centered text; the message uses bold `16px` `#898989` with `30px 0px` margin.

## Evidence

`stylex-project-milestones-error-wrap.e2e.ts` and
`stylex-organization-directory-error-wrap.e2e.ts` verify the legacy
Scala/messages, stable StyleX owners, DOM order, computed desktop/mobile
declarations, containment, and fallback presence/absence.

Normal fallback mode: 2/2 passed.

Fallback disabled (`VITE_DISABLE_LEGACY_FALLBACK=1`): 2/2 passed.

## Comparison note

The managed legacy Yona visual endpoints were unavailable during this batch,
so a live screenshot comparison against the legacy server was not possible.
The source-backed Scala/LESS/message assertions and rendered computed-style
checks are the recorded parity evidence; this live replay gap remains
explicit and is not treated as visual equivalence proof.
