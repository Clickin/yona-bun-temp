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
