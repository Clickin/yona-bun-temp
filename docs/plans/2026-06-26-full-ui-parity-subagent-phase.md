# Full UI Parity Subagent Phase

Status: current execution plan
Date: 2026-06-26

This phase turns the RC UX checklist into a full UI parity work queue that can
be split across subagents. The goal is still conversion parity, not UI
improvement: a legacy Yona administrator should be able to replace legacy Yona
with Yoram and normal users should not notice route, layout, copy, interaction,
or Markdown rendering differences in the supported app-runtime scope.

## Source of Truth

- Agent rules: `AGENTS.md`
- Canonical execution spec: `SPEC.md`
- Legacy UI/UX evidence: `yona-original/`
- Current RC checklist:
  `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md`
- Current visual sweep evidence: `output/playwright/visual-sweep/latest.json`
- Current HTML audit and coverage evidence: `.agent/legacy-html-page-audit/*`
- Current React Markdown boundary:
  `frontend/src/routes/-markdown-renderer.tsx` plus
  `frontend/src/markdown-render-boundary.spec.tsx`

## Phase Rule

- Parent owns this document, status updates, shared RC checklist updates, and
  final integration.
- Subagents start as read-only explorers unless the parent assigns a disjoint
  write scope.
- No subagent may replace React rendering with server-rendered HTML fragments.
- No subagent may introduce a second Markdown renderer or bypass
  `MarkdownRenderer`.
- No subagent may improve or redesign legacy UX; findings must be framed as
  parity gaps, expected legacy non-OK behavior, not-applicable scope, or
  already-covered evidence.
- Direct legacy form/fragment routes are compatibility evidence only. React
  screens must remain REST JSON/API-return plus React render.

## Full UI Parity Matrix

| Packet | Scope | Initial owner mode | Output |
| --- | --- | --- | --- |
| `ui-parity-public-auth-shell` | `/`, auth forms, `/secret`, `/restart`, global nav, user menu, sidebar, notification affordances | explorer | Missing page/state/copy/visual evidence, or confirmation of current coverage |
| `ui-parity-directory-workspace-site-admin` | directory/create/import/org routes, workspace/profile/settings/files, site-admin pages | explorer | Missing route/state/copy/mutation evidence, with exact path and file targets |
| `ui-parity-project-content` | project home/code/commits/branches, issues, board, milestones, PR/review, project admin | explorer | Missing page/state/interaction/Markdown evidence, grouped by disjoint implementation owner |
| `ui-parity-fragment-security-db` | legacy fragment conversions, XSS/SQLi/pathological Markdown, visual sweep status deltas, DB/migration smoke evidence | explorer | Any weak evidence links or missing guard coverage |

## Active Subagent Assignments

| Packet | Agent | Status | Notes |
| --- | --- | --- | --- |
| `ui-parity-public-auth-shell` | `019eff61-971c-7903-aca3-b7f9b3cdc76d` (`Dewey`) | completed | Covered; `/secret` and `/restart` are state-flow pages backed by FG-01/routes/contracts/local visual 200 but not paired legacy audit/diff pages |
| `ui-parity-directory-workspace-site-admin` | `019eff61-b850-7873-a81b-c6bae630a8a9` (`Locke`) | completed | Covered; weakest evidence is `/user/issues/new/mine`, still backed by route parity, rendered e2e, visual sweep, and legacy HTML audit |
| `ui-parity-project-content` | `019eff61-dd1d-7233-b182-10898e1735ee` (`Averroes`) | completed | Gap: `/admin/sample/postform?readme=true` README preload/update semantics; gap: query-string discovered links are weak in generated visual/audit coverage; needs parent decision for sample-data status-delta policy |
| `ui-parity-fragment-security-db` | `019eff61-fd34-7df2-bdd5-12a76a596ecb` (`Kuhn`) | completed | Gaps: issue timeline fragment closure evidence and legacy MariaDB adopted-data user-visible smoke; parent decision needed for issue-list XHR/PJAX fragment policy |

## Audit Result Queue

| Item | Source packet | Status | Next owner scope |
| --- | --- | --- | --- |
| `/admin/sample/postform?readme=true` legacy README preload/update semantics | `ui-parity-project-content` | `gap` | `frontend/src/routes/$owner/$projectName/postform/route.tsx`, `frontend/src/api/boards.ts`, `crates/server/src/routes/boards.rs`, focused board tests |
| Query-string discovered links can be lost from generated coverage evidence (`postform?readme=true`, `postform?issueTemplate=true`, `issues?format=xls`, `reviews?format=xls`) | `ui-parity-project-content` | `gap` | `scripts/audit-legacy-html-pages.mjs`, `scripts/visual-parity-sweep.mjs`, `tests/rc-ux-checklist-contract.test.mjs` |
| Sample-data status deltas such as `/admin/sample/newPullRequestForm`, `/admin/sample/post/1`, `/admin/sample/milestone/1`, `/admin/sample/pullRequest/1/**`, `/admin/sample/code/main/**`, `/admin/sample/commits/**`, `/admin/sample/search` | `ui-parity-project-content` | `needs-parent-decision` | Parent documents policy: local seeded-data success is acceptable when legacy homelab sample lacks the corresponding object/branch and route-specific functional tests cover normal UX |
| Legacy broken homelab endpoints returning 500 (`/admin/sample/branches`, `/admin/sample/compare/main...main`, `/admin/sample/post/1/editform`) | `ui-parity-project-content` | `covered` | Keep documented as expected legacy reference errors; do not mirror server failures |
| `/:user/:project/issue/:number/timeline` fragment endpoint closure | `ui-parity-fragment-security-db` | `gap` | `crates/server/src/routes/issues.rs`, `crates/server/tests/issue_core_contract.rs`, visual/direct route evidence |
| Project issue-list XHR/PJAX fragment mode | `ui-parity-fragment-security-db` | `needs-parent-decision` | Parent documents policy: app-runtime React route + REST list is primary; direct fragment compatibility is required only when legacy deep-link/XHR callers are still intentionally supported |
| Legacy MariaDB in-place adopt smoke proves startup/schema but not user-visible migrated pages | `ui-parity-fragment-security-db` | `gap` | `scripts/smoke-legacy-mariadb-dump.mjs` plus release scope/checklist evidence |
| `/secret` and `/restart` paired visual diff coverage | `ui-parity-public-auth-shell` | `covered with weak evidence` | Keep as state-flow pages backed by legacy `Global.onRequest`, welcome templates, FG-01, current routes/contracts, and local visual 200 |
| `/user/issues/new/mine` focused frontend spec thickness | `ui-parity-directory-workspace-site-admin` | `covered with weak evidence` | Current route parity, rendered e2e, visual sweep, and legacy HTML audit are sufficient unless a concrete diff appears |

## Parent Decisions

- Sample-data status deltas are not automatic parity failures when the legacy
  homelab sample lacks the required object/branch or returns a known reference
  error, and the Rust sample fixture renders the normal legacy UX with
  route-specific functional tests. These stay documented as status deltas rather
  than requiring Yoram to reproduce broken reference-instance data states.
- Project issue-list XHR/PJAX fragment mode is not a new React data source. If
  retained, it must be a direct compatibility adapter returning API-shaped data
  or the SPA shell; normal user-visible issue-list UX remains React route plus
  REST JSON list data.

## Subagent Report Contract

Each subagent report must include:

- Legacy evidence checked: exact `yona-original/` files, legacy routes, or live
  baseline paths.
- Rust/React evidence checked: exact files, tests, docs, and generated coverage
  artifacts.
- Result table with one row per finding:
  `path`, `legacy evidence`, `current evidence`, `status`, `proposed owner`.
- Status must be one of `covered`, `gap`, `deviation`, `deferred`,
  `not-applicable`, or `needs-parent-decision`.
- For any `gap` or `deviation`, include a bounded write-scope proposal that can
  be assigned to a worker without conflicting with other packets.

## Parent Integration Gate

Before this phase can close:

- Every packet has a subagent report.
- Every `gap` is implemented or explicitly reclassified into root canonical
  docs, provenance, and a follow-up plan with reason.
- `tests/rc-ux-checklist-contract.test.mjs` continues to bind RC rows to
  visual sweep paths, security evidence, REST submit boundaries, and Markdown
  renderer ownership.
- `scripts/visual-parity-comparison.spec.mjs`,
  `scripts/legacy-html-page-audit.spec.mjs`, and
  `scripts/legacy-route-coverage.spec.mjs` remain green.
- Focused frontend/Playwright/cargo checks are run for any implementation
  packet that changes code.
- The parent runs `pnpm test:dev-scripts` after documentation/guard updates.

## Initial Delegation Prompts

### `ui-parity-public-auth-shell`

Audit public/auth/shell UI parity only. Do not edit files. Compare
`docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md`,
`output/playwright/visual-sweep/latest.json`, `.agent/legacy-html-page-audit/*`,
`SPEC.md` FG-01, and the corresponding frontend tests/routes. Check `/`,
`/users/loginform`, `/users/signupform`, `/lostPassword`, `/_help`, `/secret`,
`/restart`, logged-in `/`, `/user/sidebar?path=%2Fadmin%2Fsample%2Fissue%2F1&hash=comment-7`,
and `/user/usermenuTabContentList`. Report only missing/weak evidence or
confirm coverage.

### `ui-parity-directory-workspace-site-admin`

Audit directory, workspace, and site-admin UI parity only. Do not edit files.
Check `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`,
`/admin`, `/user/issues`, `/user/issues/new/mine`, `/user/files`,
`/user/editform/**`, and `/sites/**` pages. Use current visual sweep, HTML
audit coverage, RC checklist, frontend tests, and backend contract evidence.
Return missing/weak evidence with proposed disjoint owner files.

### `ui-parity-project-content`

Audit project content UI parity only. Do not edit files. Check
`/admin/sample/**` project home/code/commits/branches, issues, board,
milestones, pull requests/reviews, and project-admin pages. Pay special
attention to Markdown surfaces, direct legacy links, modal shells, filters,
empty/error states, and expected legacy non-2xx behavior. Return missing/weak
evidence with proposed disjoint owner files.

### `ui-parity-fragment-security-db`

Audit fragment conversion, security/stability, and DB/migration smoke evidence
only. Do not edit files. Check that legacy HTML fragment endpoints are
represented as API-return plus React render, XSS/SQLi/pathological Markdown
probes are tied to user-visible pages, Markdown uses ReactMarkdown through the
Yona compatibility renderer, and DB matrix/migration smoke evidence is strong
enough for in-place replacement. Return missing/weak evidence with proposed
owner files.
