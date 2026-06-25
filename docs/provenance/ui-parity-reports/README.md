# UI Parity Subagent Reports

Status: current evidence workspace
Date: 2026-06-26

This directory stores read-only explorer reports for
`docs/plans/2026-06-26-full-ui-parity-subagent-phase.md`.

Rules:

- One active packet writes one report file:
  `docs/provenance/ui-parity-reports/<packet>.md`.
- Reports are evidence, not canonical implementation status. The parent updates
  the phase plan, root canonical docs, and provenance after reviewing them.
- Explorer reports must not propose new UX or new product structure. Findings
  must be framed as `covered`, `gap`, `deviation`, `deferred`,
  `not-applicable`, or `needs-parent-decision`.
- Browser-visible checks should prefer selector/copy assertions over screenshots
  alone. Screenshots are supporting evidence only.
- Reports must include a route inventory summary with counts for `covered`,
  `gap`, `deviation`, `deferred`, `not-applicable`, `weak evidence`, and
  `needs-parent-decision`.
- The parent cannot close Gate A while any active packet report is missing or
  while any report has nonzero `gap`, `deviation`, `weak evidence`, or
  `needs-parent-decision` rows. `deferred` rows are allowed only when the parent
  records the same boundary in canonical/provenance/follow-up documents.
- Every row must name the legacy source, current React/API source, user state,
  interaction state, API/direct-fragment boundary, and proposed owner scope when
  the row is not fully covered.
- Raw i18n keys visible to the user are failures unless the matching legacy page
  visibly exposed the same raw key in the same state.
- Legacy Java endpoints that returned HTML fragments must be audited as
  API-return plus React-render conversions. Do not record a missing server-side
  HTML fragment as the intended fix unless the parent explicitly classifies it
  as a compatibility route.
