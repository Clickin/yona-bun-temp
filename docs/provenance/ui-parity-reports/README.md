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

