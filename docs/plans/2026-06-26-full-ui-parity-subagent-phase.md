# Full UI Parity Subagent Phase

Status: current execution plan
Date: 2026-06-26

This phase is the goal directive for a full UI parity sweep that can be split
across subagents. The goal is still conversion parity, not UI improvement: a
legacy Yona administrator should be able to replace legacy Yona with Yoram and
normal users should not notice route, layout, copy, interaction, permission
state, form, modal, fragment-conversion, or Markdown rendering differences in
the supported app-runtime scope.

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
- Parent must keep this phase as a separate UI-parity gate. Do not mix it with
  RC feature improvement, performance work, or new capability planning.
- Subagents start as read-only explorers unless the parent assigns a disjoint
  write scope.
- Explorer subagents write findings only into the report path assigned by the
  parent; they do not edit implementation, canonical docs, or provenance.
- No subagent may replace React rendering with server-rendered HTML fragments.
- No subagent may introduce a second Markdown renderer or bypass
  `MarkdownRenderer`.
- No subagent may improve or redesign legacy UX; findings must be framed as
  parity gaps, expected legacy non-OK behavior, not-applicable scope, or
  already-covered evidence.
- Direct legacy form/fragment routes are compatibility evidence only. React
  screens must remain REST JSON/API-return plus React render.
- Existing visual sweep and curl HTML audit coverage are the baseline, not the
  finish line. Each packet must also check user-visible state transitions that
  route-entry sweeps can miss: form validation, modal open/confirm/cancel,
  permission-filtered controls, empty states, and mutation-visible results.
- If an explorer reports a `gap` or `deviation`, the parent must either assign a
  worker with a disjoint write scope or reclassify the item in root canonical
  docs, provenance, and follow-up plan before this phase can close.

## Execution Model

1. Parent prepares/maintains this phase document and assigns explorer packets.
2. Explorer packets audit user-visible parity from legacy evidence and current
   React/browser evidence, then write one report under
   `docs/provenance/ui-parity-reports/`.
3. Parent consolidates explorer reports into the Audit Result Queue and selects
   concrete gap rows.
4. Worker subagents are spawned only for concrete gap rows with disjoint owned
   files. Worker prompts must name the owned files or modules explicitly.
5. Parent reviews worker patches, updates root canonical/provenance/plan status,
   runs integration gates, and commits.

Explorer report file naming:

- `docs/provenance/ui-parity-reports/<packet>.md`
- Historical broad packets may stay in this document as baseline evidence, but
  active packets must have their own report before this phase closes.

Worker branch rule:

- A worker may edit only the owned scope in its assignment plus directly related
  tests/provenance rows named by the parent.
- Workers must not revert unrelated changes. Other agents may be changing the
  codebase at the same time.
- Parent does not edit a worker-owned file until the worker completes or is
  explicitly cancelled.

## Full UI Parity Matrix

| Packet | Scope | Initial owner mode | Output |
| --- | --- | --- | --- |
| `ui-parity-auth-public-entry` | `/`, `/users/loginform`, `/users/signupform`, `/lostPassword`, `/resetPassword`, `/verify/**`, auth aliases | explorer | Auth route/form/copy/redirect/error-state evidence and REST submit-boundary findings |
| `ui-parity-root-navigation-shell` | global nav, feedback/project-list gating, login dialog, authenticated user menu, sidebar, footer suppression | explorer | Shell state matrix across anonymous/authenticated/site-admin/guest and fragment-conversion findings |
| `ui-parity-user-workspace-profile` | `/me`, `/:user`, `/user/issues`, `/user/files`, profile issue/PR/project tabs | explorer | Workspace/profile/list empty/populated/permission-state findings |
| `ui-parity-user-account-settings` | `/user/editform/**`, `/me/settings/**`, avatar/password/notification/email/token settings | explorer | Settings form, validation, modal, upload, notification-toggle, and direct-anchor findings |
| `ui-parity-directory-organization` | `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`, `/organizations/:org/**` | explorer | Directory, project/org creation, org home/settings/member/delete state findings |
| `ui-parity-project-home-admin` | `/:owner/:project`, project settings/members/watchers/webhooks/delete/transfer/fork/statistics/changeVCS | explorer | Project shell, admin form/modal, permission-state, and mutation-boundary findings |
| `ui-parity-issues` | project/user issue lists, issue create/edit/detail/comment/timeline/label settings | explorer | Issue filters, forms, sidebar controls, comments, child comments, autocomplete, and Markdown findings |
| `ui-parity-board-milestone` | board list/detail/create/edit/comment plus milestone list/detail/create/edit | explorer | Board/milestone route, form, attachment, comment, state-tab, progress, and empty-state findings |
| `ui-parity-code-vcs` | code browser, file rendering, commit history/detail, compare, branches, raw/download/image links | explorer | Code/VCS shell, branch selector, diff/comment, no-head/error-state, and direct-link findings |
| `ui-parity-pull-request-review` | PR lists/create/edit/detail/changes/reviews/review threads | explorer | PR branch selector, merge/conflict/review/comment/thread state findings |
| `ui-parity-search-notification` | global/project/org search, `/notifications`, `/notification?from=&limit=` | explorer | Search result-type/filter/pagination and notification stream/fragment-conversion findings |
| `ui-parity-site-admin-setup` | `/sites/**`, `/secret`, `/restart`, `/migration`, release/setup/import operator pages | explorer | Site-admin/setup/import/update/diagnostic state findings and deferred/operator-scope classifications |
| `ui-parity-fragment-security-db` | legacy fragment conversions, XSS/SQLi/pathological Markdown, visual sweep status deltas, DB/migration smoke evidence | explorer | Weak evidence links, guard gaps, or DB/security smoke gaps |

## Active Subagent Assignments

| Packet | Agent | Status | Notes |
| --- | --- | --- | --- |
| `ui-parity-public-auth-shell` | `019eff61-971c-7903-aca3-b7f9b3cdc76d` (`Dewey`) | completed | Historical broad packet; split into the narrower packets below for the next sweep |
| `ui-parity-directory-workspace-site-admin` | `019eff61-b850-7873-a81b-c6bae630a8a9` (`Locke`) | completed | Historical broad packet; split into workspace, organization, and site-admin packets below |
| `ui-parity-project-content` | `019eff61-dd1d-7233-b182-10898e1735ee` (`Averroes`) | completed | Historical broad packet; split into project admin, issue, board/milestone, code/VCS, and PR/review packets below |
| `ui-parity-fragment-security-db` | `019eff61-fd34-7df2-bdd5-12a76a596ecb` (`Kuhn`) | completed | Historical evidence packet; remains active as a cross-cutting guard packet |
| `ui-parity-auth-public-entry` | `019eff8b-88b5-7d53-b04c-421676320d9f` (`Laplace`) | completed | Mostly covered; signup/reset/verify post-state deviations need parent/worker follow-up |
| `ui-parity-root-navigation-shell` | `019eff8b-a5cf-7343-8b07-4875c99d806a` (`Dirac`) | completed | Mostly covered; organization search-scope condition closed in this follow-up, project `hasGroup` scope remains queued |
| `ui-parity-user-workspace-profile` | `019eff8b-cb85-7862-9cc5-4bb6a0632452` (`Arendt`) | completed | DaysAgo editability closed in this follow-up; public email/PR receiver/user-file location remain queued |
| `ui-parity-user-account-settings` | `019eff8b-ec3b-7d72-b5b4-4f4a9c183bf2` (`Herschel`) | completed | Broadly mapped; avatar invalid/crop UX and notification hash activation need browser verification/fix |
| `ui-parity-directory-organization` | unassigned | pending | Use the initial delegation prompt below before implementation work |
| `ui-parity-project-home-admin` | unassigned | pending | Use the initial delegation prompt below before implementation work |
| `ui-parity-issues` | unassigned | pending | Use the initial delegation prompt below before implementation work |
| `ui-parity-board-milestone` | unassigned | pending | Use the initial delegation prompt below before implementation work |
| `ui-parity-code-vcs` | unassigned | pending | Use the initial delegation prompt below before implementation work |
| `ui-parity-pull-request-review` | unassigned | pending | Use the initial delegation prompt below before implementation work |
| `ui-parity-search-notification` | unassigned | pending | Use the initial delegation prompt below before implementation work |
| `ui-parity-site-admin-setup` | unassigned | pending | Use the initial delegation prompt below before implementation work |

## Audit Result Queue

| Item | Source packet | Status | Next owner scope |
| --- | --- | --- | --- |
| `/admin/sample/postform?readme=true` legacy README preload/update semantics | `ui-parity-project-content` | `covered, committed 19b24182` | `frontend/src/routes/$owner/$projectName/postform/route.tsx`, `frontend/src/api/boards.ts`, `crates/server/src/routes/boards.rs`, focused board tests |
| Query-string discovered links can be lost from generated coverage evidence (`postform?readme=true`, `postform?issueTemplate=true`, `issues?format=xls`, `reviews?format=xls`) | `ui-parity-project-content` | `covered` | `f4f33829`; `scripts/audit-legacy-html-pages.mjs`, `scripts/visual-parity-sweep.mjs`, `tests/rc-ux-checklist-contract.test.mjs` |
| Sample-data status deltas such as `/admin/sample/newPullRequestForm`, `/admin/sample/post/1`, `/admin/sample/milestone/1`, `/admin/sample/pullRequest/1/**`, `/admin/sample/code/main/**`, `/admin/sample/commits/**`, `/admin/sample/search` | `ui-parity-project-content` | `covered by parent decision` | Documented as sample-data/reference-server status variance; local seeded-data success is acceptable when legacy homelab sample lacks the corresponding object/branch and route-specific functional tests cover normal UX |
| Legacy broken homelab endpoints returning 500 (`/admin/sample/branches`, `/admin/sample/compare/main...main`, `/admin/sample/post/1/editform`) | `ui-parity-project-content` | `covered` | Keep documented as expected legacy reference errors; do not mirror server failures |
| `/:user/:project/issue/:number/timeline` fragment endpoint closure | `ui-parity-fragment-security-db` | `covered` | Legacy `IssueApp.timeline` returned `partial_comments.scala.html`; Rust does not expose a server-rendered HTML fragment. `/api/v1/projects/:owner/:project/issues/:number` returns `comments` plus `timeline`, `frontend/src/app-view-models.ts` maps that API timeline, and the issue detail React shell renders the legacy comment/event anchors. Backend contract: `issue_core_contract_creates_reads_updates_and_deletes_over_rest`. |
| Project issue-list XHR/PJAX fragment mode | `ui-parity-fragment-security-db` | `not-applicable compatibility` | Normal app-runtime issue-list UX is React route plus `/api/v1/projects/:owner/:project/issues` JSON. Legacy `IssueApp.issues` XHR/PJAX HTML fragment mode is not retained as a frontend data source; XHR/PJAX headers against the REST list still return API JSON for React rendering. Backend contract: `issue_core_contract_creates_reads_updates_and_deletes_over_rest`. |
| Legacy MariaDB in-place adopt smoke proves startup/schema plus migrated profile data | `ui-parity-fragment-security-db` | `covered` | `3e2ebc84`; `scripts/smoke-legacy-mariadb-dump.mjs` now verifies migrated `/api/v1/users/:loginId/profile` data during adopt startup |
| XSS, SQLi, and pathological Markdown probe evidence | `ui-parity-fragment-security-db` | `covered by RC checklist evidence` | `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md` `rc-ux-security-stability` records hostile rendered-page XSS/search probes, Markdown renderer stability tests, React Markdown render-boundary checks, and SQLi literal-keyword backend coverage |
| SQLite, PostgreSQL, and MySQL/MariaDB DB matrix evidence | `ui-parity-fragment-security-db` | `covered by RC checklist evidence` | `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md` `rc-ux-db-migration-smoke` records env-backed and testcontainers DB matrix runs, including SQLite FTS5, PostgreSQL `to_tsvector`, and MariaDB `MATCH ... AGAINST` search paths |
| `/secret` and `/restart` paired visual diff coverage | `ui-parity-public-auth-shell` | `covered with weak evidence` | Keep as state-flow pages backed by legacy `Global.onRequest`, welcome templates, FG-01, current routes/contracts, and local visual 200 |
| `/user/issues/new/mine` focused frontend spec thickness | `ui-parity-directory-workspace-site-admin` | `covered with weak evidence` | Current route parity, rendered e2e, visual sweep, and legacy HTML audit are sufficient unless a concrete diff appears |
| Root organization search-scope dropdown should not always render the group item | `ui-parity-root-navigation-shell` | `covered in current follow-up` | `frontend/src/routes/__root.tsx` now hides the org group search item unless `hideProjectListing`/guest mode plus known organization participation matches legacy; `frontend/src/auth-workspace-shell.spec.tsx` pins the guard |
| Root project search-scope dropdown needs legacy `project.hasGroup` evidence | `ui-parity-root-navigation-shell` | `gap` | Current root shell only has URL/workspace overview, not the rendered project container's `organization_id`/`project.hasGroup`. Add a bounded data path or route-context projection before showing `search.scope.group` for org-owned project pages. Owner scope: `frontend/src/routes/__root.tsx`, app runtime route context, and possibly project container DTO. |
| Auth signup confirm/email-verification post state differs from legacy flash target | `ui-parity-auth-public-entry` | `deviation` | Explorer found current REST/direct flows route to `/users/loginform?signup=requested` or `?verify=sent`, while legacy `UserApp.newUser()` flashes through `Application.index()`. Needs parent decision or a worker that aligns redirect/flash semantics without breaking REST submit boundary. |
| Auth reset invalid/valid post states and verify invalid status differ from legacy | `ui-parity-auth-public-entry` | `deviation` | Explorer found reset invalid currently stays as inline reset-page alert and verify invalid renders SPA error shell, while legacy uses bad-request/not-found style responses. Needs route/status and visible-shell decision before implementation. |
| User profile `daysAgo` number input was read-only | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `frontend/src/routes/-workspace-views.tsx` now renders editable uncontrolled `#daysAgoBtn` inputs for `/me` and `/:user`, and `frontend/src/workspace-profile-i18n.spec.tsx` pins absence of `readonly`. |
| Public profile email visibility when `application.show.user.email=true` | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `crates/server/src/routes/users.rs` now keeps public profile email when `AppRuntimeConfig.show_user_email` is true and redacts only when false; `crates/server/tests/rest_contract.rs` and `frontend/src/wave1-auth-workspace-parity.spec.tsx` pin both visible and hidden states. |
| Workspace/public profile issue author/assignee and PR contributor/receiver user links | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `WorkspaceIssueItem` and `WorkspacePullRequestItem` now carry actor login IDs, and `frontend/src/routes/-workspace-views.tsx` renders legacy `/:loginId` anchors for issue author/assignee cells plus PR contributor/receiver avatar links. Evidence: `crates/server/tests/auth_workspace_contract.rs` and `frontend/src/route-parity.spec.tsx`. |
| Workspace file location URL | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `/user/files` now resolves non-user attachment rows through `read_attachment_location_path`, matching legacy `RouteUtil.getUrl(containerType, containerId)` for project, issue/comment, board/comment, milestone, PR/review-thread, and commit-thread resources. `crates/server/tests/assets_contract.rs::workspace_files_list_returns_current_users_legacy_attachment_rows` pins ISSUE_POST location href/label under a base path. |
| Workspace settings avatar invalid/crop UX | `ui-parity-user-account-settings` | `gap` | Browser verification needed for legacy `$yobi.alert(Messages(\"user.avatar.onlyImage\"))`, Jcrop-style crop handle/preview, and current modal/canvas crop behavior. Owner scope: `frontend/src/routes/-workspace-settings-view.tsx` plus a focused Playwright scenario. |
| Workspace notification settings hash tab activation | `ui-parity-user-account-settings` | `weak evidence` | Explorer found static anchors/data-href parity but no browser proof that `/user/editform/notifications#<projectId>` activates the matching tab like legacy. Owner scope: focused Playwright e2e before code changes. |

## Active Worker Assignments

| Work item | Agent | Status | Owned scope |
| --- | --- | --- | --- |
| README postform parity | `019eff66-0f58-7cb2-929b-1326fb4d8125` (`Harvey`) | completed, committed `19b24182` | Board postform route/API/server/tests |
| Query-string coverage evidence | `019eff66-28d2-74f2-a67b-7d34c6699949` (`Volta`) | completed, committed `f4f33829` | Audit/visual scripts and RC coverage contract |
| Issue timeline/PJAX fragment closure | `019eff66-f18b-7092-8944-04839467097c` (`Gibbs`) | completed, committed `19b24182` | Issue routes/contracts and fragment policy docs |
| Legacy MariaDB adopted-data smoke | `019eff67-24ae-77e3-9712-e71432bfd314` (`Mendel`) | completed, committed `3e2ebc84` | Legacy MariaDB dump smoke and release/checklist evidence |

## Parent Decisions

- Sample-data status deltas are not automatic parity failures when the legacy
  homelab sample lacks the required object/branch or returns a known reference
  error, and the Rust sample fixture renders the normal legacy UX with
  route-specific functional tests. These stay documented as status deltas rather
  than requiring Yoram to reproduce broken reference-instance data states.
- Project issue-list XHR/PJAX fragment mode is not a new React data source and
  is closed as not-applicable compatibility. Normal user-visible issue-list UX
  remains React route plus `/api/v1/projects/:owner/:project/issues` REST JSON
  list data; direct server-rendered PJAX fragments are not retained.
- The 2026-06-26 continuation splits the historical four broad packets into
  narrower subagent packets because the existing route-entry visual sweep cannot
  prove every tab, modal, validation branch, permission-gated control, and
  mutation-visible state. The older packet results remain valid baseline
  evidence but no longer by themselves close the full UI parity goal directive.
- Browser parity should use the current localhost curl proxy for the homelab
  legacy instance when direct Playwright access to `192.168.45.10:9000` fails.
  This remains browser-rendered legacy HTML and is stronger than raw curl for
  user-visible checks.

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
- A Playwright scenario table with this shape:
  `path`, `state`, `legacy selector/copy`, `Rust selector/copy`, `interaction`,
  `API/direct boundary`, `status`.
- Screenshots are optional supporting evidence, but selector/copy assertions are
  required for form, modal, permission, empty-state, and mutation-visible checks.

## Worker Split Rule

After an explorer report:

- Assign workers only for concrete `gap` rows, not for broad investigation.
- Give each worker a disjoint write set such as one route helper, one API module,
  one backend route group, one e2e file, or one provenance/checklist section.
- Tell every worker that other agents may edit the codebase and that they must
  not revert unrelated changes.
- Worker output must include changed file paths, verification commands, and
  any remaining `gap`/`deviation` row that could not be closed.

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

## Parent Integration Evidence

- 2026-06-26 parent gate refresh: `node --test
  tests/rc-ux-checklist-contract.test.mjs` passed 6 tests after the phase status
  cleanup.
- 2026-06-26 parent gate refresh: `node --test
  scripts/visual-parity-comparison.spec.mjs
  scripts/legacy-html-page-audit.spec.mjs
  scripts/legacy-route-coverage.spec.mjs` passed 8 tests after the phase status
  cleanup.
- 2026-06-26 parent gate refresh: `pnpm test:dev-scripts` passed 67 tests after
  the phase status cleanup, covering the RC checklist contract, visual
  comparison, legacy HTML page audit, legacy route coverage, REST/HTML boundary
  guards, and cargo harness contracts.

## Initial Delegation Prompts

### `ui-parity-auth-public-entry`

Audit public/auth UI parity only. Do not edit files. Legacy evidence:
`yona-original/app/views/user/login.scala.html`, `signup.scala.html`,
`resetPassword.scala.html`, `verified.scala.html`,
`yona-original/app/views/site/lostPassword.scala.html`, and
`yona-original/conf/routes`. Current evidence:
`frontend/src/routes/-auth-views.tsx`, `/users/loginform`,
`/users/signupform`, `/lostPassword`, `/resetPassword`,
`/verify/$loginId/$verificationCode`, `/login`, `/register`,
`/forgot-password`, and auth API wrappers. Check anonymous `/`, local login,
`rememberMe`, `redirectUrl`, OAuth configured/unsupported/denied states,
social-login-only mode, signup confirm/email-verification states, lost/reset
password valid/invalid token states, and verify success/invalid pages. Confirm
React submits stay REST JSON while legacy POST routes remain compatibility
adapters.

### `ui-parity-root-navigation-shell`

Audit root navigation/shell UI parity only. Do not edit files. Legacy evidence:
`common/navbar.scala.html`, `common/usermenu.scala.html`,
`common/loginDialog.scala.html`, and `common/footer.scala.html`. Current
evidence: `frontend/src/routes/__root.tsx`, root shell tests, visual sweep, and
direct `/user/sidebar` / `/user/usermenuTabContentList` API boundaries. Check
anonymous/authenticated/site-admin/guest states, `hideProjectListing`,
feedback URL on/off, global/project/org search scope form, `#mySidenav`,
favorite/project/recent-history tabs, create dropdown, site-admin affix, login
dialog, and footer suppression on standalone pages.

### `ui-parity-user-workspace-profile`

Audit user workspace/public profile UI parity only. Do not edit files. Legacy
evidence: `user/view.scala.html`, `partial_issues.scala.html`,
`partial_pullRequests.scala.html`, `partial_projectlist.scala.html`, and
`userFiles.scala.html`. Current evidence: `frontend/src/routes/-workspace-views.tsx`,
`frontend/src/routes/me/route.tsx`, `/$user`, `/user/issues`, and `/user/files`.
Check `/me`, `/:user`, missing user, org-name redirect, `daysAgo`/`selected`
tabs, issue/PR/project empty and populated states, guest/site-admin/blocked
badges, connected providers, `YONA_SHOW_USER_EMAIL=false`, watch/unwatch and
leave anchors, and REST profile/workspace APIs.

### `ui-parity-user-account-settings`

Audit user account settings UI parity only. Do not edit files. Legacy evidence:
`user/edit.scala.html`, `edit_password.scala.html`,
`edit_notifications.scala.html`, `edit_emails.scala.html`,
`edit_token.scala.html`, and `partial_edit_tabmenu.scala.html`. Current
evidence: `frontend/src/routes/-workspace-settings-view.tsx`,
`/user/editform/**`, and `/me/settings/**`. Check profile form, avatar upload
and invalid image state, reset visited list, password change/reset-email link,
watched-project notification tabs/toggles, add/delete/set-main/send-validation
email, token display/select/reset, and direct legacy anchors such as
`/user/email/**` and `/noti/toggle/**`.

### `ui-parity-directory-organization`

Audit directory and organization UI parity only. Do not edit files. Legacy
evidence: `project/list.scala.html`, `project/create.scala.html`,
`organization/list.scala.html`, `organization/create.scala.html`,
`organization/view.scala.html`, `organization/header.scala.html`,
`organization/menu.scala.html`, `organization/members.scala.html`,
`organization/setting.scala.html`, and `organization/deleteForm.scala.html`.
Current evidence: `frontend/src/routes/-directory-views.tsx`,
`frontend/src/routes/-organization-views.tsx`, `/projects`, `/projectform`,
`/_import`, `/orgs`, `/organizations/new`, and `/organizations/$organizationName/**`.
Check search/pagination/empty states, project/org create validation, org home
project list, create-project CTA, enroll/cancel/leave, settings logo upload,
members add/typeahead/role/delete/enrollment accept, and deleteForm confirm
state.

### `ui-parity-project-home-admin`

Audit project home/admin UI parity only. Do not edit files. Legacy evidence:
`project/home.scala.html`, `partial_history.scala.html`,
`partial_dashboard*.scala.html`, `setting.scala.html`, `members.scala.html`,
`watchers.scala.html`, `webhooks.scala.html`, `transfer.scala.html`,
`change_vcs.scala.html`, `delete.scala.html`, `statistics.scala.html`, and
`projectMenu.scala.html`. Current evidence: `frontend/src/routes/-project-views.tsx`
and `/:owner/:project` plus admin subroutes. Check home `tabId` states,
README/Git fallback/DB README, history/dashboard blocks, project header/menu,
member add/edit/delete/leave, watcher list, webhook form/list/delete,
settings menu persistence, transfer/changeVCS/delete checkbox alerts, fork, and
statistics `Under Construction`.

### `ui-parity-issues`

Audit issue UI parity only. Do not edit files. Legacy evidence:
`issue/list.scala.html`, `create.scala.html`, `edit.scala.html`,
`view.scala.html`, `partial_*`, `common/commentForm.scala.html`, and
`common/childComments.scala.html`. Current evidence: `frontend/src/routes/-issue-views.tsx`,
project issue routes, and user issue routes. Check project/user issue filters,
state tabs, two-column/subtask toggles, mass-update controls, create/edit
fields, hidden `authorId`, due date, assignee/milestone/label/parent selectors,
detail sidebar watch/vote/favorite/share/delete, comments edit/delete/vote,
child comments, timeline rows, sharer panel, `@`/`#` autocomplete,
paste/drop attachments, Markdown preview/source rendering, and REST submit
boundaries.

### `ui-parity-board-milestone`

Audit board and milestone UI parity only. Do not edit files. Legacy evidence:
`board/list.scala.html`, `board/create.scala.html`, `board/edit.scala.html`,
`board/view.scala.html`, `board/partial_comments.scala.html`,
`milestone/list.scala.html`, `milestone/view.scala.html`,
`milestone/create.scala.html`, `milestone/edit.scala.html`, and
`milestone/partial_status.scala.html`. Current evidence:
`frontend/src/routes/-board-views.tsx` and `frontend/src/routes/-milestone-views.tsx`.
Check board list search/sort/label/page, org board aggregate list, create/edit
notice/readmefy/labels/attachments, detail history/watch/labels/comments/child
comments, milestone open/closed/all tabs, sort, empty state, progress/counts,
create/edit validation, detail actions, attachments, and linked issue tabs.

### `ui-parity-code-vcs`

Audit code browser/VCS UI parity only. Do not edit files. Legacy evidence:
`code/view.scala.html`, `code/history.scala.html`, `code/branches.scala.html`,
`code/diff.scala.html`, `code/compare.scala.html`, and code/commit/branch routes.
Current evidence: `frontend/src/routes/-code-views.tsx`, code/commit/compare
routes, `frontend/src/api/code-commits.ts`, and `frontend/src/api/code-branches.ts`.
Check `/code` default branch, no-head Git/SVN state, `#branches`,
`#breadcrumbs`, folder/file rows, `#showCode`, Markdown file rendering,
raw/file/image/download links, commits/path history, commit diff/comment
forms, inline diff comments, compare, branches table, default branch badge, and
set-default/delete enabled/disabled states.

### `ui-parity-pull-request-review`

Audit pull request and review UI parity only. Do not edit files. Legacy
evidence: `git/list.scala.html`, `git/create.scala.html`, `git/edit.scala.html`,
`git/view.scala.html`, `git/viewChanges.scala.html`, and
`reviewthread/list.scala.html`. Current evidence:
`frontend/src/routes/-pull-request-views.tsx`, pull-request routes, and
`frontend/src/api/pull-requests.ts`. Check PR list tabs/search/contributor
filter/empty state, pushed-branch prompt, branch selectors, merge-result block,
edit disabled controls, detail branch info, watch/close/reopen/edit/delete,
reviewer block, review/unreview, accept/conflict/source-branch states,
overview/changes tabs, general comments, commit dropdown, inline comments,
review cards, and review-thread filters/export.

### `ui-parity-search-notification`

Audit search and notification UI parity only. Do not edit files. Legacy
evidence: `search/result.scala.html`, `search/partial_search.scala.html`,
search type partials, `index/notifications.scala.html`,
`index/partial_notifications.scala.html`, and `common/mySeriesMenuTab.scala.html`.
Current evidence: `frontend/src/routes/-search-views.tsx`,
`frontend/src/routes/search/route.tsx`, project/org search routes,
`frontend/src/routes/notifications/route.tsx`, `frontend/src/routes/notification/route.tsx`,
and related API wrappers. Check global/project/org search scopes, bad-request
branches, `#searchInnerForm`, category badges, every result type, snippets,
ACL-filtered private absence, empty state, pagination, notification welcome
guide, `#toggleIntro`, my-series tabs, stream row expand/collapse, empty state,
load-more, and `/notification?from=&limit=` JSON fragment-conversion boundary.

### `ui-parity-site-admin-setup`

Audit site-admin, setup, import, and operator-adjacent UI parity only. Do not
edit files. Legacy evidence: `site/siteMngLayout.scala.html`, site admin view
templates, `welcome/secret.scala.html`, `welcome/restart.scala.html`,
`migration/home.scala.html`, import views, and `conf/routes`. Current evidence:
`frontend/src/routes/sites/$pageName/route.tsx`, `secret/route.tsx`,
`restart/route.tsx`, `migration/route.tsx`, `frontend/src/routes/[_]import/route.tsx`,
and `frontend/src/api/site-admin.ts`. Check non-admin forbidden/admin state,
site sidebar active/update badge, user/project/post/issue lists, mail/mass-mail,
data export/import, update, diagnostic, `/secret` setup-required versus
configured state, `/restart`, `/_import`, and `/migration` deferred/operator
scope classification.

### Historical `ui-parity-public-auth-shell`

Audit public/auth/shell UI parity only. Do not edit files. Compare
`docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md`,
`output/playwright/visual-sweep/latest.json`, `.agent/legacy-html-page-audit/*`,
`SPEC.md` FG-01, and the corresponding frontend tests/routes. Check `/`,
`/users/loginform`, `/users/signupform`, `/lostPassword`, `/_help`, `/secret`,
`/restart`, logged-in `/`, `/user/sidebar?path=%2Fadmin%2Fsample%2Fissue%2F1&hash=comment-7`,
and `/user/usermenuTabContentList`. Report only missing/weak evidence or
confirm coverage.

### Historical `ui-parity-directory-workspace-site-admin`

Audit directory, workspace, and site-admin UI parity only. Do not edit files.
Check `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`,
`/admin`, `/user/issues`, `/user/issues/new/mine`, `/user/files`,
`/user/editform/**`, and `/sites/**` pages. Use current visual sweep, HTML
audit coverage, RC checklist, frontend tests, and backend contract evidence.
Return missing/weak evidence with proposed disjoint owner files.

### Historical `ui-parity-project-content`

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
