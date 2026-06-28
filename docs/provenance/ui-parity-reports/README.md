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

- `2026-06-28-exhaustive-page-rebuild-audit.md`
- `2026-06-28-legacy-template-anchor-inventory.md`
- `2026-06-28-static-react-owner-coverage.md`
- `2026-06-28-rendered-verification-queue.md`
- `2026-06-28-p0-rendered-audit-pass.md`
- `2026-06-28-p1-source-audit-pass.md`
- `2026-06-28-p2-p3-source-audit-pass.md`
- `2026-06-28-rendered-evidence-execution-manifest.md`
- `template-first-p0-global-shell.md`
- `template-first-p1-auth-public-home.md`
- `template-first-p2-project-shell.md`
- `template-first-p3-issues-editor-comments.md`
- `template-first-p4-board-milestone-post.md`
- `template-first-p5-code-git-pr-review.md`
- `template-first-p6-organization-directory-workspace.md`
- `template-first-p7-site-admin-error-security.md`

Rules:

- One active packet writes one report file:
  `docs/provenance/ui-parity-reports/<packet>.md`.
- Reports are evidence, not canonical implementation status. The parent updates
  the phase plan, root canonical docs, and provenance after reviewing them.
- The 2026-06-28 exhaustive rebuild audit reopens prior `covered` UI labels for
  Scala-template verification. Existing React tests are not contracts when they
  conflict with `yona-original/app/views/**` or the current parent directive.
- The 2026-06-28 generated anchor inventory is a checklist for every legacy
  Scala template. It does not close parity by itself; it identifies the DOM and
  message anchors that subsequent rebuilt JSX and tests must verify.
- The 2026-06-28 static React owner coverage matrix maps all 242 legacy
  templates to likely `frontend/src/routes/**` owner files and records anchor
  overlap. It is triage evidence only; rendered route checks still decide
  parity.
- The 2026-06-28 rendered verification queue turns the static coverage matrix
  into P0/P1/P2/P3 route-check work. It is the active checklist for finishing
  the exhaustive page rebuild audit.
- The 2026-06-28 P0 rendered audit pass opens the 12 highest-priority rows and
  records source-level findings. It does not close those rows without rendered
  route evidence.
- The 2026-06-28 P1 source audit pass expands the 89 P1 rows into risk buckets
  for rendered interaction, caller-route, dynamic selector, and selector/copy
  checks. It does not close those rows.
- The 2026-06-28 P2/P3 source audit pass expands the remaining 7 P2 rows and
  134 P3 rows. At that point all 242 queue rows have source-pass follow-up
  requirements, but rendered evidence is still required for closure.
- The 2026-06-28 rendered evidence execution manifest maps all 242 source-pass
  rows to route/evidence buckets and records which rows are supported by the
  latest visual sweep route-open evidence. The framed-layout rows are covered
  by the focused SPA-sidebar absence guard in
  `frontend/src/auth-workspace-shell.spec.tsx`.
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
  `2026-06-26T17:14:26.291Z` records legacy `93/96`, local `174/174`, local
  direct API surfaces `13/13`, `diffFailures 0`, `localFailures 0`, and `22`
  status deltas. The deltas are classified below as implemented export/search
  boundaries or non-comparable legacy sample-data/homelab-reference
  differences; they are not packet closures by themselves. The local run used a
  fresh runtime DB and the Vite dev proxy in `frontend/vite.config.ts` now
  forwards direct compatibility/API surfaces while preserving SPA fallback for
  browser navigation.
- Latest local desktop sweep refresh:
  `output/playwright/visual-sweep/latest.json` at
  `2026-06-27T01:15:45.287Z` records local `174/174`, local direct API
  surfaces `13/13`, imported legacy-audit page coverage `67/67`, zero missing
  legacy-audit pages, `diffFailures 0`, and `localFailures 0` against
  `http://127.0.0.1:18111/yona`. This refresh validates the current React/Vite
  mounted SPA after the latest route/CSS follow-ups; it is local regression
  evidence and does not replace the older combined legacy status-delta
  classification below.
- Latest integrated desktop sweep rerun:
  `output/playwright/visual-sweep/latest.json` at
  `2026-06-28T07:48:07.381Z` was run against node-proxied legacy Yona at
  `http://127.0.0.1:19100` and mounted Yoram at
  `http://127.0.0.1:3101/yona`. It records legacy `93/96`, local `174/174`,
  local direct API surfaces `13/13`, imported legacy-audit page coverage
  `67/67` on both targets, `diffFailures 0`, `localFailures 0`, and the same
  `22` status deltas classified below as implemented export/search boundaries
  or non-comparable legacy sample-data/homelab-reference differences.

## 2026-06-28 Gate Checkpoint

Active P0-P7 app-runtime UI surfaces are closed for the template-first goal.
`tests/yona-legacy-parity-gate.test.mjs` guards representative UI surfaces so
any active UI bucket returning `gap`, `partial`, or `deferred` fails the gate
test. The remaining non-parity gate buckets are infrastructure/deferred
tracking (`acl-baseline`, `canonical-schema-and-persistence-foundation`,
`second-priority-deferred`, `rust-foundation-and-runtime-bootstrap`) and are not
current UI blockers unless new UI evidence maps into them.

## Integrated Status Delta Classification

These rows are from `output/playwright/visual-sweep/latest.json` checked at
`2026-06-26T17:14:26.291Z`. They had no screenshot diff failure. Status `0`
means the browser saw no regular document response, usually because legacy
produced a download/navigation boundary instead of a comparable HTML page.

| owner packet | route | legacy status | local status | classification | evidence |
| --- | --- | ---: | ---: | --- | --- |
| P3 issue/editor/comments | `/admin/sample/issues?format=xls` | 0 | 200 | covered | Issue Excel export is implemented in `SPEC.md`; backend contract pins the legacy route and `.xls` attachment, and frontend spec pins the `format=xls` href. |
| P4 board/milestone/post | `/admin/sample/post/1` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable post detail document; board detail UI is covered in the P4 report. |
| P4 board/milestone/post | `/admin/sample/post/1/editform` | 500 | 200 | not-applicable | Legacy homelab seed is an error state, not a comparable edit-form document; board form UI is covered in the P4 report. |
| P4 board/milestone/post | `/admin/sample/milestone/1` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable milestone detail document; milestone detail UI is covered in the P4 report. |
| P4 board/milestone/post | `/admin/sample/milestone/1/editform` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable milestone edit document; milestone form UI is covered in the P4 report. |
| P5 code/git/pr/review | `/admin/sample/newPullRequestForm` | 400 | 200 | not-applicable | Legacy homelab seed is an invalid branch/base request; PR create form UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/reviews?format=xls` | 0 | 200 | covered | Review Excel export is implemented in `SPEC.md`; backend contract pins the legacy route and `.xls` attachment, and frontend/e2e specs pin the export href. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable PR overview document; PR overview UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1/changes` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable PR changes document; PR changes UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1/changes/HEAD` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable revision-specific PR changes document; selected-commit changes UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/pullRequest/1/editform` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable PR edit document; PR edit UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/code/main` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable repository branch document; code browser UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/code/main/` | 404 | 200 | not-applicable | Duplicate branch-root route has no comparable legacy repository state; code browser UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/code/main/README.md` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable file document; file viewer UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/commits` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable commit history document; history UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/commits/` | 404 | 200 | not-applicable | Duplicate slash route has no comparable legacy commit history state; history UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/commits/main` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable branch history document; branch history UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/commits/main/` | 404 | 200 | not-applicable | Duplicate slash route has no comparable legacy branch history state; branch history UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/commit/HEAD` | 404 | 200 | not-applicable | Legacy homelab seed has no comparable commit detail document; commit detail UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/compare/main...main` | 500 | 200 | not-applicable | Legacy homelab seed is an error state, not a comparable compare document; compare UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/branches` | 500 | 200 | not-applicable | Legacy homelab seed is an error state, not a comparable branch-list document; branch UI is covered in the P5 report. |
| P5 code/git/pr/review | `/admin/sample/search` | 400 | 200 | covered | Current SPA returns HTTP 200 for the document but React renders legacy `BadRequestPage`; `SearchRoutePage` marks missing `keyword`/`searchType` invalid and disables REST calls. |

Round 2 report rows must additionally include:

- `viewport`: desktop or mobile viewport used for the assertion.
- `base path`: `/` or mounted subdirectory such as `/yona`.
- `stylesheet/shell proof`: selector or computed-style evidence that the
  legacy shell is visually usable, not just present in HTML.
- `raw-key scan`: result for visible legacy i18n keys.
- `first-run/setup state`: covered, not applicable, or gap when the packet owns
  public/setup/admin bootstrap flows.
