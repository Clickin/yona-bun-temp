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
- This phase must finish as a complete UI parity inventory before broad
  implementation resumes. Ad-hoc smoke-test fixes may continue only when they
  close an already-recorded queue row.

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

## Exhaustive Inventory Gate

The first pass of this phase is documentation, not implementation. Parent and
explorers must turn every legacy page or user-visible state into one of these
records before the phase can be treated as actionable:

- `covered`: React route/API render has selector/copy/interaction evidence.
- `gap`: legacy behavior is in app-runtime scope but missing or visibly wrong.
- `deviation`: current behavior intentionally or accidentally differs from
  legacy and needs a parent decision before implementation.
- `deferred`: out of current app-runtime scope, with canonical/deferred
  provenance.
- `not-applicable`: legacy behavior was server-side fragment, broken sample
  data, or operator-only behavior that is explicitly replaced by API-return plus
  React render or classified outside the replacement UX.
- `weak evidence`: implementation may be present, but browser-visible proof is
  not strong enough for RC.

Every inventory row must include:

- Legacy source: exact `yona-original/` template, controller route, JavaScript
  helper, message key, or live legacy path.
- Current source: exact React route/component, API/client/server module, test,
  screenshot, or generated audit artifact.
- User state: anonymous/authenticated/site-admin/project member/non-member,
  owner/admin, guest, private/public project, and empty/populated data as
  applicable.
- Interaction state: initial render, validation failure, successful mutation,
  modal open/cancel/confirm, upload/preview, pagination/filter/search, and
  permission-hidden controls when applicable.
- Boundary: REST JSON/API return plus React render, direct legacy compatibility
  route, or explicitly unsupported server-rendered HTML fragment.
- Proposed owner scope for any `gap`, `deviation`, or `weak evidence` row.

The inventory is complete only when every active packet has a report and every
report's row count is reflected in the Audit Result Queue or explicitly closed
as `covered` inside the report.

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
| `ui-parity-directory-organization` | `019effaa-2dc0-7231-8af5-8804caf07703` (`Godel`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-directory-organization.md`; gap/deviation rows queued below |
| `ui-parity-project-home-admin` | `019effaa-4c2c-7a91-8845-ea0edd3d5d48` (`Socrates`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md`; gap rows queued below |
| `ui-parity-issues` | `019effaa-67d8-7581-860a-b08920fd073e` (`Linnaeus`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-issues.md`; gap rows queued below |
| `ui-parity-board-milestone` | `019effaa-8a27-7321-aaec-e27b7371880f` (`Archimedes`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-board-milestone.md`; gap/deviation rows queued below |
| `ui-parity-code-vcs` | `019effbc-a056-7cf2-8fa6-5d6de40e1198` (`Anscombe`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-code-vcs.md`; gap/deviation/weak-evidence rows queued below |
| `ui-parity-pull-request-review` | `019effbc-c970-7850-bfe3-ab7d8e897eb6` (`Wegener`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-pull-request-review.md`; gap/deviation/weak-evidence rows queued below |
| `ui-parity-search-notification` | `019effbc-f514-74b2-8067-ecc811844244` (`Leibniz`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-search-notification.md`; gap/deviation/weak-evidence rows queued below |
| `ui-parity-site-admin-setup` | `019effbd-1fe5-7803-997a-af04e8b3ee4e` (`Descartes`) | completed | Report: `docs/provenance/ui-parity-reports/ui-parity-site-admin-setup.md`; gap/weak-evidence rows queued below |

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
| Project home dashboard milestone/PR list detail | `ui-parity-project-home-admin` | `gap` | Current dashboard covers assignee/label rows but collapses milestone and pull-request widgets compared with `partial_dashboard_issuesbymilestone.scala.html` and `partial_dashboard_pullrequests.scala.html`. Owner scope: `frontend/src/routes/-project-views.tsx`, `crates/server/src/routes/projects/home.rs`, focused dashboard tests. |
| Project home right member block and leave modal | `ui-parity-project-home-admin` | `gap` | Home member side block lacks legacy avatar/profile/add-member shell, and `#projectLeaveBtn` deletes immediately instead of opening `#alertLeave`. Owner scope: `frontend/src/routes/-project-views.tsx`, `frontend/src/routes/$owner/$projectName/route.tsx`, focused home interaction tests. |
| Project settings general controls | `ui-parity-project-home-admin` | `gap` | Settings page has read-only code-access radios and lacks issue-template edit row/default branch select; reviewer-count/protected-scope visibility also differs. Owner scope: `frontend/src/routes/-project-views.tsx`, `frontend/src/auth-workspace-client.ts`, `crates/server/src/routes/projects.rs`, settings tests. |
| Project issue-list advanced filters and mass update | `ui-parity-issues` | `gap` | Project issue list renders many controls but does not send/read legacy filter/dueDate/order/commenter params, and visible mass-update toolbar/wiring is absent. Owner scope: project issue route/client/server query plus `frontend/src/routes/-issue-views.tsx`. |
| Issue create/edit select and label-copy parity | `ui-parity-issues` | `gap` | Milestone choices are flat/all-state rather than create-open/edit grouped open+closed; label selector leaks literal `label` and `[button.edit]`. Owner scope: issue form routes, `ProjectIssueFormPage`, i18n/form render specs. |
| Issue detail metadata/timeline/upload/preview parity | `ui-parity-issues` | `gap` | Detail sidebar lacks inline milestone/due-date/label updates, timeline event text is simplified, general non-image uploader parity is absent, and editor preview tabs do not render React preview state. Owner scope: `frontend/src/routes/-issue-views.tsx`, issue detail route, attachment API, Markdown renderer boundary tests. |
| Board form label picker deviation | `ui-parity-board-milestone` | `deviation` | Board create/edit currently adds `.board-label-picker`, while legacy board create/edit templates do not render label selection. Needs parent decision or removal. Owner scope: `frontend/src/routes/-board-views.tsx`, board posting parity tests. |
| Board form/detail attachment/delete/label parity | `ui-parity-board-milestone` | `gap` | Board forms lack legacy file uploader shell; detail delete bypasses `#deleteConfirm`; detail labels are static; post/comment attachments are not projected into legacy attachment containers. Owner scope: `frontend/src/routes/-board-views.tsx`, board posting/attachment tests. |
| Milestone list/form/detail parity | `ui-parity-board-milestone` | `gap` | Milestone inactive sort direction, client row search, relative/overdue due-date display, field-level validation, file uploader shell, detail attachment metadata, and linked issue partial-list/mass-update/search behavior differ from legacy. Owner scope: `frontend/src/routes/-milestone-views.tsx`, milestone REST projection if needed, focused tests. |
| Directory pagination and org created metadata | `ui-parity-directory-organization` | `covered in current follow-up` | `/projects` and `/orgs` now render legacy `.page-navigation-wrap` / `.page-nums` controls from React instead of empty `#pagination`, preserve filter query links while changing `pageNum`, and `/orgs` projects REST `createdLabel` through the organization directory row `created <strong title=...>` metadata. Evidence: `crates/server/src/routes/projects/organizations.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-directory-views.tsx`, `frontend/src/route-parity.spec.tsx`, `crates/server/tests/org_project_contract.rs`. |
| Project/import create client validation | `ui-parity-directory-organization` | `gap` | `/projectform` lacks legacy client validation/focusout/coupling/SVN warning behavior, and `/_import` lacks empty URL validation. Owner scope: `frontend/src/routes/-project-views.tsx`, project-create/import parity specs. |
| Organization home CTA/filter/leave/delete-cancel interactions | `ui-parity-directory-organization` | `covered in current follow-up` | Organization home now links create-project directly to `/projectform?owner=:org`, filters visible project rows through React state from `#mylist-filter`, opens legacy `#alertLeave` before leave mutation, and clears member-delete modal state on close/No. Evidence: `frontend/src/routes/-organization-views.tsx` and `frontend/src/organization-home-parity.spec.tsx`. |
| Organization settings/member remaining interactions | `ui-parity-directory-organization` | `gap` | Organization logo update now preserves `logoAttachmentId` through REST, but legacy valid-image auto-submit timing still needs browser proof if required; member add typeahead behavior remains incomplete. Owner scope: `frontend/src/routes/-organization-views.tsx`, user search API/client if absent, focused org interaction tests. |
| Code commit watch/unwatch button | `ui-parity-code-vcs` | `gap` | Commit detail renders `#watch-button` but explorer found no stateful legacy watch/unwatch mutation or active class behavior. Owner scope: `frontend/src/routes/-code-views.tsx`, `frontend/src/routes/$owner/$projectName/commit/$commitId/route.tsx`, commit watch REST/direct route if absent. |
| Code commit anonymous author fallback | `ui-parity-code-vcs` | `needs-parent-decision` | Current React visibly renders `User.anonymous.name`; verify live legacy/model output before deciding whether to replace it with a localized/human fallback. Owner scope if mismatch: `frontend/src/routes/-code-views.tsx` and focused specs. |
| Code branch action permission-state browser proof | `ui-parity-code-vcs` | `weak evidence` | Component/backend evidence exists for set-default/delete visibility, but admin/member/non-admin branch-row browser proof is missing. Owner scope: focused Playwright scenarios for branches page before code changes. |
| Code commit diff partial selector exactness | `ui-parity-code-vcs` | `weak evidence` | React diff is functionally covered, but explorer did not find selector-by-selector proof for legacy `partial_diff` row classes/gutters/comment buttons. Owner scope: focused Playwright selector audit for commit diff. |
| Search scoped project chrome uses synthetic project detail | `ui-parity-search-notification` | `gap` | Project scoped search data/ACL is covered, but page chrome synthesizes a minimal project detail instead of using the real project header/menu state from legacy `projectLayout`. Owner scope: `frontend/src/routes/-search-views.tsx`, project search route loader/API projection if needed. |
| Search scoped organization chrome uses synthetic organization detail | `ui-parity-search-notification` | `gap` | Organization scoped search data is covered, but page chrome synthesizes blank org detail instead of legacy `organization.header` / `organization.menu` state. Owner scope: `frontend/src/routes/-search-views.tsx`, organization search route loader/API projection if needed. |
| Search missing keyword/searchType route state | `ui-parity-search-notification` | `needs-parent-decision` | Legacy controller returns bad-request when required search params are empty; current `/search` renders an empty-result page. Owner scope after decision: `frontend/src/routes/-search-views.tsx`, `crates/server/src/routes/search.rs`, focused route/status tests. |
| Search user/project/milestone result row visual shape | `ui-parity-search-notification` | `gap` | Generic renderer lacks legacy user avatar/card/since, project logo/created/code-update/fork metadata, and milestone due-date/relative text. Owner scope: `frontend/src/routes/-search-views.tsx`, search DTO/repository projection if needed. |
| Search comment/review result row browser proof | `ui-parity-search-notification` | `weak evidence` | REST contracts cover ACL/hrefs, but issue_comment/post_comment/review row shapes need focused render/browser proof. Owner scope: `frontend/src/routes/-search-views.tsx` focused specs before code changes. |
| Notification welcome guide persistence proof | `ui-parity-search-notification` | `weak evidence` | `#toggleIntro` source matches legacy localStorage key/class behavior, but click/localStorage browser proof is missing. Owner scope: focused Playwright scenario for notifications route. |
| Notification load-more semantics | `ui-parity-search-notification` | `deviation` | Legacy `/notification` loads the next fragment chunk with `from+size`; current React increases `size` from zero and may refetch prior rows or navigate via the anchor. Owner scope: `frontend/src/routes/notification/route.tsx`, `frontend/src/api/notifications.ts`, notification list Playwright test. |
| Pull request contributor sent-by-me option | `ui-parity-pull-request-review` | `gap` | PR list contributor select omits the legacy current-user `pullRequest.sentByMe` option. Owner scope: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/api/pull-requests.ts`, `crates/server/src/routes/pull_requests.rs`, focused list spec. |
| Pull request create/edit selector id semantics | `ui-parity-pull-request-review` | `deviation` | Current form uses `#pullRequestState` for title input and `#status` for body textarea, while legacy uses hidden `#pullRequestState` and merge-check `#status`. Owner scope: `frontend/src/routes/-pull-request-views.tsx`, PR interaction e2e/render specs. |
| Pull request create/edit body validation | `ui-parity-pull-request-review` | `gap` | Backend rejects empty body, but React form does not surface legacy `pullRequest.body.required` in the visible submit flow. Owner scope: `frontend/src/routes/-pull-request-views.tsx`, focused form validation e2e/spec. |
| Pull request event timeline i18n | `ui-parity-pull-request-review` | `gap` | Event renderer lacks message interpolation args and existing e2e expects raw `pullRequest.event.message*` keys, unlike legacy. Owner scope: `frontend/src/routes/-pull-request-views.tsx`, event DTO if needed, render/e2e specs. |
| Pull request interaction e2e copy drift | `ui-parity-pull-request-review` | `needs-parent-decision` | Explorer found e2e copy such as `This pull request can be merged automatically.`, `Reviewed`, and `Merge code` that does not match checked legacy templates. Decide whether to update stale e2e expectations or identify a missing UI state. |
| Pull request browser proof for row/review variants | `ui-parity-pull-request-review` | `weak evidence` | Mocked current e2e/static specs cover much of PR review behavior, but live legacy selector comparison is still weak for contributor special option, validation failure, event timeline interpolation, and review list row variants. Owner scope: focused Playwright selector audit. |
| Site-admin import repo-auth/project-name copy | `ui-parity-site-admin-setup` | `covered in current follow-up` | `/_import` now renders the legacy `#repoAuth .row-fluid` / `dl.span6` auth field layout, `project.import.auth.userid`, `project.import.auth.userpw`, `project.import.auth.userid.desc`, and `project.name.alert` placeholder while keeping React submit on the REST import boundary. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx`. |
| Secret configured-state behavior | `ui-parity-site-admin-setup` | `weak evidence` | Legacy `/secret` is entered only while the default secret is invalid; current SPA route appears to always render setup form when directly visited, and configured-state browser/contract proof is missing. Owner scope: `crates/server/src/routes/auth.rs`, `frontend/src/routes/secret/route.tsx`, focused configured-state test/proof. |

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
- Signup, user, project, organization, issue, board, milestone, PR, search, and
  site-admin form submissions should stay consistent with the canonical
  app-runtime boundary: React-visible flows submit through REST JSON/API
  contracts and render with React. Legacy form routes are compatibility
  adapters or evidence, not the preferred app data path.
- Legacy i18n keys remain the scalar source. A visible raw key such as
  `title.no.results` is a parity failure unless the legacy page visibly showed
  that raw key in the same state.

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
- A route inventory summary with counts for `covered`, `gap`, `deviation`,
  `deferred`, `not-applicable`, and `weak evidence`. Parent cannot close this
  phase from narrative-only reports.

## Parallelization Plan

Run explorers first, then workers:

1. Assign all unassigned explorer packets in parallel:
   `ui-parity-code-vcs`, `ui-parity-pull-request-review`,
   `ui-parity-search-notification`, and `ui-parity-site-admin-setup`.
2. Do not assign implementation to a packet until its explorer report exists.
3. Batch worker assignments by disjoint write scope:
   root shell/auth, workspace/settings, directory/organization,
   project-admin, issues, board/milestone, code/VCS, PR/review,
   search/notification, site-admin/setup.
4. Within one batch, avoid overlapping files. If two gaps touch the same route
   helper/component/API module, keep them in the same worker assignment.
5. Parent integrates one completed worker at a time, updates this queue, then
   runs focused checks before assigning the next overlapping worker.

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
