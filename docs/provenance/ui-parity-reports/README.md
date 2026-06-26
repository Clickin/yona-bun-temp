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

## Integrated Status Delta Queue

These rows are from `output/playwright/visual-sweep/latest.json` checked at
`2026-06-26T16:21:36.680Z`. They had no screenshot diff failure, but they still
block whole-UI closure until the owning packet records `covered`, `deferred`,
`not-applicable`, `gap`, or `deviation` with source evidence. Status `0` means
the browser saw no regular document response, usually because legacy produced a
download/navigation boundary instead of a comparable HTML page.

| owner packet | route | legacy status | local status | required decision |
| --- | --- | ---: | ---: | --- |
| P3 issue/editor/comments | `/admin/sample/issues?format=xls` | 0 | 200 | Decide export/download parity versus deferred import/export scope; P3 report now tracks this as `needs-parent-decision`. |
| P4 board/milestone/post | `/admin/sample/post/1` | 404 | 200 | Create P4 report row; distinguish missing legacy sample post from local placeholder/rendered detail behavior. |
| P4 board/milestone/post | `/admin/sample/post/1/editform` | 500 | 200 | Create P4 report row; legacy sample errors must not be treated as visual parity proof. |
| P4 board/milestone/post | `/admin/sample/milestone/1` | 404 | 200 | Create P4 report row; verify milestone detail data state against an existing legacy seed or classify seed gap. |
| P4 board/milestone/post | `/admin/sample/milestone/1/editform` | 404 | 200 | Create P4 report row; verify edit form against legacy template/state once comparable data exists. |
| P5 code/git/pr/review | `/admin/sample/newPullRequestForm` | 400 | 200 | Create P5 report row; compare invalid branch/base behavior, not just rendered local form reachability. |
| P5 code/git/pr/review | `/admin/sample/reviews?format=xls` | 0 | 200 | Decide export/download parity versus deferred import/export scope in P5. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1` | 404 | 200 | Create P5 report row; compare against valid legacy PR seed or classify local placeholder route. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1/changes` | 404 | 200 | Create P5 report row; validate diff tab data-boundary with comparable PR data. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1/changes/HEAD` | 404 | 200 | Create P5 report row; validate revision-specific diff state with comparable data. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1/editform` | 404 | 200 | Create P5 report row; validate edit form only after comparable PR seed. |
| P5 code/git/pr/review | `/admin/sample/code/main` | 404 | 200 | Create P5 report row; distinguish missing legacy repo/branch from local repository browser UI. |
| P5 code/git/pr/review | `/admin/sample/code/main/` | 404 | 200 | Same as code browser row; avoid duplicate closure by reachability. |
| P5 code/git/pr/review | `/admin/sample/code/main/README.md` | 404 | 200 | Create P5 report row; validate file viewer against comparable repository content. |
| P5 code/git/pr/review | `/admin/sample/commits` | 404 | 200 | Create P5 report row; validate commit list against comparable repository content. |
| P5 code/git/pr/review | `/admin/sample/commits/` | 404 | 200 | Same as commit list row; avoid duplicate closure by reachability. |
| P5 code/git/pr/review | `/admin/sample/commits/main` | 404 | 200 | Create P5 report row; validate branch-filtered commit list. |
| P5 code/git/pr/review | `/admin/sample/commits/main/` | 404 | 200 | Same as branch commit-list row; avoid duplicate closure by reachability. |
| P5 code/git/pr/review | `/admin/sample/commit/HEAD` | 404 | 200 | Create P5 report row; validate commit detail/diff shell with comparable commit. |
| P5 code/git/pr/review | `/admin/sample/compare/main...main` | 500 | 200 | Create P5 report row; legacy error state needs source classification before local 200 can be accepted. |
| P5 code/git/pr/review | `/admin/sample/branches` | 500 | 200 | Create P5 report row; legacy branch page error state needs source classification before local 200 can be accepted. |
| P5 code/git/pr/review | `/admin/sample/search` | 400 | 200 | Create P5/search report row; validate invalid or empty repository search behavior against legacy. |

Round 2 report rows must additionally include:

- `viewport`: desktop or mobile viewport used for the assertion.
- `base path`: `/` or mounted subdirectory such as `/yona`.
- `stylesheet/shell proof`: selector or computed-style evidence that the
  legacy shell is visually usable, not just present in HTML.
- `raw-key scan`: result for visible legacy i18n keys.
- `first-run/setup state`: covered, not applicable, or gap when the packet owns
  public/setup/admin bootstrap flows.
