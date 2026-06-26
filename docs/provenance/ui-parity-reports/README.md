# UI Parity Subagent Reports

Status: current evidence workspace
Date: 2026-06-26

This directory stores read-only explorer reports and template-first reset
packet reports.

Current UI parity execution directive:
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

Superseded route/API inventory baseline:
`docs/plans/2026-06-26-full-ui-parity-subagent-phase.md`.

The older `ui-parity-*.md` reports remain useful as route, REST-boundary, and
interaction evidence. They do not close UI parity unless the matching
`template-first-p*.md` report has zero `gap`, `deviation`, and `weak evidence`
rows with verifier evidence against legacy templates/rendered output.

Current template-first reset reports:

- `template-first-p0-global-shell.md`
- `template-first-p2-project-shell.md`
- `template-first-p3-issues-editor-comments.md`

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
- Round 2 browser-visible audits must prove stylesheet/shell usability from a
  real Playwright viewport. A route is not `covered` if it only has static DOM
  or snapshot evidence while CSS, layout placement, modal behavior, or first-run
  public/setup flow is unverified.
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
- Latest integrated desktop sweep evidence:
  `output/playwright/visual-sweep/latest.json` at
  `2026-06-26T16:21:36.680Z` records legacy `93/96`, local `174/174`,
  `diffFailures 0`, `localFailures 0`, and `22` status deltas. The remaining
  deltas are not packet closures by themselves; each owning packet must still
  classify legacy sample-data or homelab-reference differences before whole UI
  parity can be claimed.

Round 2 report rows must additionally include:

- `viewport`: desktop or mobile viewport used for the assertion.
- `base path`: `/` or mounted subdirectory such as `/yona`.
- `stylesheet/shell proof`: selector or computed-style evidence that the
  legacy shell is visually usable, not just present in HTML.
- `raw-key scan`: result for visible legacy i18n keys.
- `first-run/setup state`: covered, not applicable, or gap when the packet owns
  public/setup/admin bootstrap flows.
