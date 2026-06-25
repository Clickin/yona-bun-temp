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

Gate A is documentation-only inventory. Parent prepares/maintains this phase
document, assigns explorer packets, and does not distribute implementation until
the corresponding report rows exist.

1. Explorer packets audit user-visible parity from legacy evidence and current
   React/browser evidence, then write one report under
   `docs/provenance/ui-parity-reports/`.
2. Parent consolidates explorer reports into the Audit Result Queue and selects
   concrete gap, deviation, or weak-evidence rows.

Gate B is bounded implementation. Worker subagents are spawned only after Gate A
has produced concrete rows with disjoint owned files.

3. Worker prompts must name the exact row, owned files/modules, focused tests,
   and report rows they may update.
4. Parent reviews worker patches, updates root canonical/provenance/plan status,
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
| `ui-parity-auth-public-entry` | `019eff8b-88b5-7d53-b04c-421676320d9f` (`Laplace`) | completed | Signup flash-to-index and reset/verify post-state follow-ups are covered; browser-proof checklist depth remains tracked in the auth report if reopened |
| `ui-parity-root-navigation-shell` | `019eff8b-a5cf-7343-8b07-4875c99d806a` (`Dirac`) | completed | Report file added; organization search-scope and project `hasGroup` scope are covered, while the full browser-visible shell state matrix remains `weak evidence` |
| `ui-parity-user-workspace-profile` | `019eff8b-cb85-7862-9cc5-4bb6a0632452` (`Arendt`) | completed | DaysAgo editability, public email, PR receiver, user-file location, and selected-tab browser proof closed in follow-ups |
| `ui-parity-user-account-settings` | `019eff8b-ec3b-7d72-b5b4-4f4a9c183bf2` (`Herschel`) | completed | Broadly mapped; avatar invalid/crop UX and notification hash activation closed by `ui-worker-workspace-settings-proof` |
| `ui-parity-directory-organization` | `019effaa-2dc0-7231-8af5-8804caf07703` (`Godel`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-project-home-admin` | `019effaa-4c2c-7a91-8845-ea0edd3d5d48` (`Socrates`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-issues` | `019effaa-67d8-7581-860a-b08920fd073e` (`Linnaeus`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-board-milestone` | `019effaa-8a27-7321-aaec-e27b7371880f` (`Archimedes`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-code-vcs` | `019effbc-a056-7cf2-8fa6-5d6de40e1198` (`Anscombe`) | completed | Report reconciled; queue rows below are covered or classified |
| `ui-parity-pull-request-review` | `019effbc-c970-7850-bfe3-ab7d8e897eb6` (`Wegener`) | completed | Report reconciled; `/reviews` row fidelity gap closed in current follow-up |
| `ui-parity-search-notification` | `019effbc-f514-74b2-8067-ecc811844244` (`Leibniz`) | completed | Report reconciled; summary now has no gap/deviation/weak-evidence rows |
| `ui-parity-site-admin-setup` | `019effbd-1fe5-7803-997a-af04e8b3ee4e` (`Descartes`) | completed | Report reconciled; summary now has no gap/weak-evidence rows |

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
| `/secret` and `/restart` paired visual diff coverage | `ui-parity-public-auth-shell` | `not-applicable for paired visual diff; UI state covered` | Legacy `/secret` and `/restart` are state-gated by `Global.onRequest` while `isSecretInvalid`; configured legacy has no normal comparable route, and visual sweep shows local 200 with `legacyOk: null`. UI selectors/copy remain covered by `welcome/secret.scala.html`, `welcome/restart.scala.html`, current `/secret`/`/restart` routes, and auth workspace contracts. |
| `/user/issues/new/mine` focused frontend spec thickness | `ui-parity-directory-workspace-site-admin` | `covered` | Route thinness is intentional: `frontend/src/routes/user/issues/new/mine/route.tsx` delegates `mine={true}` to the shared direct issue form, REST reads `/api/v1/user/issues/new-options?mine=true`, rendered E2E covers submit payload, route parity pins legacy selectors, and backend contract pins legacy target selection fallback order. |
| Root organization search-scope dropdown should not always render the group item | `ui-parity-root-navigation-shell` | `covered in current follow-up` | `frontend/src/routes/__root.tsx` now hides the org group search item unless `hideProjectListing`/guest mode plus known organization participation matches legacy; `frontend/src/auth-workspace-shell.spec.tsx` pins the guard |
| Root project search-scope dropdown needs legacy `project.hasGroup` evidence | `ui-parity-root-navigation-shell` | `covered in Wave 4` | Root header now reads the real project container on project-scoped pages and shows `search.scope.group` only when the container has `organizationName`, matching legacy `project.hasGroup`; organization-scoped hide-project-listing/guest behavior remains unchanged. Evidence: `frontend/src/routes/__root.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`. |
| Root shell browser-visible state matrix | `ui-parity-root-navigation-shell` | `weak evidence` | The root shell has source/render-spec and route-entry visual-sweep evidence, but needs focused Playwright proof for anonymous/authenticated/site-admin/guest states, hide-project-listing, feedback URL, login dialog submit/error, sidebar tabs, footer suppression, and scoped-search dropdown interaction. Owner scope: `frontend/tests/`, `docs/provenance/ui-parity-reports/ui-parity-root-navigation-shell.md`, and this queue row. |
| Auth signup confirm/email-verification post state differs from legacy flash target | `ui-parity-auth-public-entry` | `covered in Wave 4` | Anonymous signup confirmation and verification post-states now redirect to legacy index targets (`/?signup=requested`, `/?verify=sent`), and the home route renders a `data-toggle="yobi-notify"` success message from the legacy flash keys `user.signup.requested` / `user.verification.mail.sent`. Evidence: `frontend/src/routes/users/signupform/route.tsx`, `frontend/src/routes/index.tsx`, `frontend/src/routes/-home-view.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx`. |
| Auth public-entry browser-proof checklist depth | `ui-parity-auth-public-entry` | `weak evidence` | Static/render specs cover important public auth routes and post states, but the report still needs browser-visible rows for normal login/signup submit, `rememberMe`/`redirectUrl`, aliases, OAuth/social-login-only variants, and lost/reset/verify valid/invalid flows. Owner scope: `frontend/tests/`, `docs/provenance/ui-parity-reports/ui-parity-auth-public-entry.md`, and this queue row. |
| Auth reset invalid/valid post states and verify invalid status differ from legacy | `ui-parity-auth-public-entry` | `covered in current follow-up` | `frontend/src/routes/-auth-views.tsx` now renders invalid reset as the legacy bad-request wrapper with `site.resetPasswordEmail.wrongUrl` and renders invalid verify as plain `Invalid verification` instead of a SPA error shell; `frontend/src/routes/verify/$loginId/$verificationCode/route.tsx` keeps pending state until REST verification resolves. Valid reset remains REST redirect to the legacy login shell with `user.loginWithNewPassword`, which preserves visible post-state under the React REST boundary. Evidence: `frontend/src/wave1-auth-workspace-parity.spec.tsx`, `frontend/src/auth-workspace-shell.spec.tsx`, `docs/provenance/ui-parity-reports/ui-parity-auth-public-entry.md`. Browser deep-link HTTP 404 for invalid verify is not applicable to React fallback; REST verify already owns not-found status. |
| User profile `daysAgo` number input was read-only | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `frontend/src/routes/-workspace-views.tsx` now renders editable uncontrolled `#daysAgoBtn` inputs for `/me` and `/:user`, and `frontend/src/workspace-profile-i18n.spec.tsx` pins absence of `readonly`. |
| Public profile email visibility when `application.show.user.email=true` | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `crates/server/src/routes/users.rs` now keeps public profile email when `AppRuntimeConfig.show_user_email` is true and redacts only when false; `crates/server/tests/rest_contract.rs` and `frontend/src/wave1-auth-workspace-parity.spec.tsx` pin both visible and hidden states. |
| Workspace/public profile issue author/assignee and PR contributor/receiver user links | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `WorkspaceIssueItem` and `WorkspacePullRequestItem` now carry actor login IDs, and `frontend/src/routes/-workspace-views.tsx` renders legacy `/:loginId` anchors for issue author/assignee cells plus PR contributor/receiver avatar links. Evidence: `crates/server/tests/auth_workspace_contract.rs` and `frontend/src/route-parity.spec.tsx`. |
| Workspace file location URL | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `/user/files` now resolves non-user attachment rows through `read_attachment_location_path`, matching legacy `RouteUtil.getUrl(containerType, containerId)` for project, issue/comment, board/comment, milestone, PR/review-thread, and commit-thread resources. `crates/server/tests/assets_contract.rs::workspace_files_list_returns_current_users_legacy_attachment_rows` pins ISSUE_POST location href/label under a base path. |
| Public profile selected-tab browser query preservation | `ui-parity-user-workspace-profile` | `covered in current follow-up` | `frontend/tests/user-profile-parity.e2e.ts` now opens `/yona/door?daysAgo=7&selected=projects`, verifies the project tab is initially active, clicks the pull-request and issue tabs, and proves URL query plus `#daysAgoBtn` value remain preserved while only React active panes change. Evidence: `pnpm --dir frontend test:e2e -- user-profile-parity.e2e.ts` passed 3 Playwright tests. |
| Guest current-user profile stream visibility | `ui-parity-user-workspace-profile` | `covered in current follow-up` | Legacy `user/view.scala.html` wraps `.user-stream-box` in `@if(!UserApp.currentUser().isGuest)`. `WorkspacePage` now hides the stream/tabs controls when the `/me` profile projection is guest while preserving the guest badge and user card. Evidence: `frontend/src/routes/-workspace-views.tsx`, `frontend/src/wave1-auth-workspace-parity.spec.tsx`. Public-profile viewer-guest proof remains part of any future browser-proof expansion because current public profile projection does not expose viewer guest state. |
| Workspace settings avatar invalid/crop UX | `ui-parity-user-account-settings` | `covered in current follow-up` | Legacy evidence: `user/edit.scala.html` owns `#avatarFile`, `#avatarCropWrap`, Jcrop/canvas assets, and `yobi.user.Setting.js` rejects non-images with `Messages("user.avatar.onlyImage")`, opens the crop modal, updates preview, and draws to 128x128 canvas. React now translates invalid-avatar feedback through legacy messages, opens `#avatarCropWrap` without the hidden class once an image is selected, and keeps the legacy crop preview/save/cancel selectors. Evidence: `frontend/src/routes/-workspace-settings-view.tsx`, `frontend/src/workspace-settings-parity.spec.tsx`, and `frontend/tests/workspace-settings-parity.e2e.ts` for browser selectors. |
| Workspace notification settings hash tab activation | `ui-parity-user-account-settings` | `covered in current follow-up` | Legacy evidence: `user/edit_notifications.scala.html` renders `#notification-projects a[href="#projectId"][data-toggle=tab]`, and `yobi.user.Setting.js` calls `$('#notification-projects a[href="' + location.hash + '"]').tab("show")`. React now derives the active notification project from `routeHref`/`window.location.hash`, falling back to the first watched project only when no hash matches. Evidence: `frontend/src/routes/-workspace-settings-view.tsx`, `frontend/src/workspace-settings-parity.spec.tsx`, and `frontend/tests/workspace-settings-parity.e2e.ts`. |
| Project home dashboard milestone/PR list detail | `ui-parity-project-home-admin` | `covered in Wave 4` | REST container dashboard projection now includes all open milestone rows, no-milestone open issue count, and recent open PR contributor/title/date rows. React project home renders the legacy milestone empty/new state, no-milestone count row, PR rows, and `project.dashboard.more` link. Evidence: `crates/server/src/routes/projects/home.rs`, `crates/persistence/src/repo/project_activity.rs`, `frontend/src/routes/-project-views.tsx`, `frontend/src/app-view-models.ts`, `frontend/src/project-home-tabs.spec.tsx`, `crates/server/tests/org_project_contract.rs`, `docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md`. |
| Project home right member block and leave modal | `ui-parity-project-home-admin` | `covered in Wave 2` | `ProjectDetailPage` now renders legacy `.member-wrap`, `.project-members .member`, avatar/profile/name links, updater `#member-add-link`, and hidden `#alertLeave` modal; `#projectLeaveBtn` opens the modal and `#leaveBtn` owns the REST leave mutation. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-home-tabs.spec.tsx`, `docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md`. |
| Project settings general controls | `ui-parity-project-home-admin` | `covered in Wave 5` | Code-access radios are now mutable/submitted and persisted through REST/persistence `isCodeAccessibleMemberOnly`; Git settings now read branch JSON, render the legacy `#defaultBranceSettingPanel #project-default-branch[data-toggle=select2][data-format=branch]` selector, and call the existing default-branch REST mutation on change. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/routes/$owner/$projectName/settingform/route.tsx`, `frontend/src/auth-workspace-client.ts`, `frontend/src/api/org-project.ts`, `frontend/src/project-settings-parity.spec.tsx`, `frontend/src/auth-workspace-client.spec.ts`, `crates/server/src/routes/projects.rs`, `crates/persistence/src/repo/project.rs`, `crates/server/tests/org_project_contract.rs`, `docs/provenance/ui-parity-reports/ui-parity-project-home-admin.md`. |
| Project issue-list advanced filters and mass update | `ui-parity-issues` | `covered in Wave 2` | Project issue list now reads/sends legacy `filter`, `dueDate`, `orderBy`, `orderDir`, `commenterId`, and author/assignee/label/milestone params through the React route/client and REST issue list parser, repository filtering applies text/due-date/commenter/sort before pagination, and `ProjectIssueListPage` renders/wires `#mass-update-form`, `#check-all`, `#state`, `#assignee`, `#milestone`, `#attaching-label`, and `#detaching-label` to the existing REST mass-update endpoint. Evidence: `frontend/src/issue-list-filter.spec.tsx`, `frontend/src/auth-workspace-client.spec.ts`, frontend check. Parent cargo target: `pnpm agent:cargo-test -- --outside-sandbox issue_core_contract`. |
| Issue create/edit select and label-copy parity | `ui-parity-issues` | `covered in Wave 2` | Issue create now limits milestone choices to open milestones, edit groups open/closed milestones with legacy optgroups, and the label selector heading uses legacy `label` / `button.edit` message lookups instead of literal keys. Evidence: `frontend/src/route-parity.spec.tsx`, frontend check. |
| Issue detail metadata/timeline/upload/preview parity | `ui-parity-issues` | `covered in Wave 5` | Detail sidebar renders legacy `#issueUpdateForm` for assignee/milestone/due-date/labels and wires single-issue metadata changes through REST mass-update; editor previews render Markdown via the React Markdown boundary; paste/drop upload accepts image and non-image files and inserts image/link Markdown. Wave 5 adds additive REST timeline metadata for sender labels, target users, and resource href/label/title values where raw issue events support them, renders distinct sender/target/resource links in `IssueTimelineEvent`, and restores the visible legacy uploader shell/list/button for issue body and new-comment editors. Evidence: `crates/persistence/src/repo/comment_helpers.rs`, `crates/server/src/routes/issues.rs`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/issue-detail-shell.spec.tsx`, `frontend/src/route-parity.spec.tsx`. Cargo wrapper proof is blocked by unrelated `crates/server/src/routes/projects/milestones.rs` missing `chrono` compile error. |
| Board form label picker deviation | `ui-parity-board-milestone` | `covered in worker follow-up` | Legacy board create/edit templates do not render label selection; `frontend/src/routes/-board-views.tsx` removed `.board-label-picker` and `frontend/src/board-milestone-parity.spec.tsx` pins the absence. Edit submit preserves existing labels without exposing a non-legacy form control. |
| Board form/detail attachment/delete/label parity | `ui-parity-board-milestone` | `covered in Wave 4` | Covered: board create/edit file uploader shell, board detail `#deleteConfirm`, post/comment/child-comment attachment metadata rows, updateable board detail `#labelIds[data-toggle=select2]` shell, and React-visible board label mutation through canonical REST JSON `PATCH /api/v1/projects/:owner/:project/posts/:number/labels`. The legacy compatibility `/-_-api/v1/.../postlabel/:number` route remains evidence/direct compatibility, not the React data boundary. Evidence: `frontend/src/api/boards.ts`, `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/$owner/$projectName/post/$postNumber/route.tsx`, `crates/server/src/routes/boards.rs`, `crates/server/tests/board_contract.rs`, `frontend/src/api-query.spec.ts`, `frontend/tests/board-posting-parity.e2e.ts`, `docs/provenance/ui-parity-reports/ui-parity-board-milestone.md`. |
| Milestone list/form/detail parity | `ui-parity-board-milestone` | `covered in current follow-up` | Covered: milestone inactive sort direction, list/detail client issue filtering, field-level `.error`/`.message` validation, file uploader shell, runtime `untilLabel`/`dueDateOverdue`, full milestone body/attachment projection, detail attachment metadata rendering, open/closed linked issue projection, legacy `issue.partial_list` row selectors in milestone detail, and milestone detail mass-update dropdown option/mutation wiring through the shared issue mass-update REST boundary. Evidence: `crates/server/src/routes/projects/milestones.rs`, `crates/server/src/api_types.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-milestone-views.tsx`, `frontend/src/routes/$owner/$projectName/milestone/$milestoneId/route.tsx`, `crates/server/tests/milestone_contract.rs`, `crates/server/tests/rest_contract.rs`, `frontend/src/board-milestone-parity.spec.tsx`, `docs/provenance/ui-parity-reports/ui-parity-board-milestone.md`. |
| Directory pagination and org created metadata | `ui-parity-directory-organization` | `covered in current follow-up` | `/projects` and `/orgs` now render legacy `.page-navigation-wrap` / `.page-nums` controls from React instead of empty `#pagination`, preserve filter query links while changing `pageNum`, and `/orgs` projects REST `createdLabel` through the organization directory row `created <strong title=...>` metadata. Evidence: `crates/server/src/routes/projects/organizations.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/-directory-views.tsx`, `frontend/src/route-parity.spec.tsx`, `crates/server/tests/org_project_contract.rs`. |
| Project/import create client validation | `ui-parity-directory-organization` | `covered in worker follow-up` | `/projectform` now preserves legacy `yobi.project.New.js` client validation, `#project-name` focusout normalization, owner/protected coupling, SVN warning/Pull Request menu behavior, and code/PR/review checkbox coupling; `/_import` now blocks empty URL with `project.import.error.empty.url` before calling the REST import handler. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-create-parity.spec.tsx`, `frontend/src/project-import-parity.spec.tsx`. |
| Organization home CTA/filter/leave/delete-cancel interactions | `ui-parity-directory-organization` | `covered in current follow-up` | Organization home now links create-project directly to `/projectform?owner=:org`, filters visible project rows through React state from `#mylist-filter`, opens legacy `#alertLeave` before leave mutation, and clears member-delete modal state on close/No. Evidence: `frontend/src/routes/-organization-views.tsx` and `frontend/src/organization-home-parity.spec.tsx`. |
| Organization settings/member remaining interactions | `ui-parity-directory-organization` | `covered in worker follow-up` | Organization logo valid-image selection now uploads a temp attachment and immediately calls the organization update REST handler with `logoAttachmentId`, while invalid files still show `project.logo.alert`; member add now implements the legacy `#loginId` typeahead against `/-_-api/v1/users`, renders `info` suggestions, reuses complete-range cache, and selects the suggestion `loginId` before the existing REST add-member submit. Evidence: `frontend/src/routes/-organization-views.tsx`, `frontend/src/routes/organizations/$organizationName/members/route.tsx`, `frontend/src/api/users.ts`, `frontend/src/auth-workspace-client.ts`, `frontend/src/auth-workspace-client.spec.ts`, `frontend/src/organization-shell-i18n.spec.tsx`, `frontend/src/route-parity.spec.tsx`, backend `crates/server/tests/legacy_external_users_contract.rs`. |
| Code commit watch/unwatch button | `ui-parity-code-vcs` | `covered in Wave 4` | Legacy evidence: `diff.scala.html` renders `#watch-button`, passes `Commit.asResource(project)` to `WatchApp.watch/unwatch`, and `Commit.asResource` uses resource type `COMMIT` with id `project.id:commitId`; `Commit.getWatchers` includes author, project watchers, commenters, explicit commit watches, and explicit unwatch removal. Rust now projects `isWatching`, persists `COMMIT` watch/unwatch rows through `POST`/`DELETE /api/v1/projects/:owner/:project/commit/:id/watch`, resolves legacy direct `commit` resource ids, and wires the existing React `#watch-button` callback to `watchCommitRest`/`unwatchCommitRest`. Evidence: `crates/server/src/routes/code.rs`, `crates/persistence/src/repo/watch_helpers.rs`, `frontend/src/api/code-commits.ts`, `frontend/src/routes/$owner/$projectName/commit/$commitId/route.tsx`, `crates/server/tests/code_browser_contract.rs`, `frontend/src/api-query.spec.ts`, `frontend/src/route-parity.spec.tsx`, and existing active-class proof in `frontend/src/code-views.spec.tsx`. |
| Code commit anonymous author fallback | `ui-parity-code-vcs` | `covered in Wave 3` | Legacy `diff.scala.html` renders `User.anonymous.name`, and `NullUser` populates that model field from `Messages.get("user.notExists.name")` (`User exists not` in default messages). React now uses that legacy message fallback and focused specs pin absence of visible `User.anonymous.name`. |
| Code branch action permission-state browser proof | `ui-parity-code-vcs` | `covered in Wave 3` | `frontend/src/code-views.spec.tsx` now pins admin/update-only/delete-only/read-only branch action visibility, default-branch hidden set-default/delete actions, and legacy data-request attributes against `partial_branchrow.scala.html` evidence. |
| Code commit diff partial selector exactness | `ui-parity-code-vcs` | `covered in Wave 3` | `frontend/src/code-views.spec.tsx` now pins `.codediff-wrap`, `.diff-body`, `.diff-file.diff-container`, `.diff-code.diff-table`, `add/remove/context/hunk` rows, `.linenum` gutters, `.diff-partial-codeline`, `.line-comment-trigger`, and `.btnPop` selectors against legacy `diff.scala.html` / `partial_diff` evidence. |
| Search scoped project chrome uses synthetic project detail | `ui-parity-search-notification` | `covered in Wave 3` | `SearchRoutePage` now fetches the real project container (`/api/v1/owners/:owner/projects/:project/container`), maps it through `toProjectContainerView`, and renders `ProjectHeader` / `ProjectMenu` from that state. Evidence: `frontend/src/routes/-search-views.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Search scoped organization chrome uses synthetic organization detail | `ui-parity-search-notification` | `covered in Wave 3` | `SearchRoutePage` now fetches the real organization container (`/api/v1/organizations/:organization/container`), maps it through `toOrganizationContainerView`, and renders `OrganizationHeader` / `OrganizationMenu` from that state. Evidence: `frontend/src/routes/-search-views.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Search missing keyword/searchType route state | `ui-parity-search-notification` | `covered in Wave 3` | The parent decision for this packet follows legacy `SearchApp`: missing keyword or missing/invalid `searchType` is a bad request. `readSearchRouteQuery()` now renders the legacy bad-request shell without a REST call, while REST already rejects missing input. Evidence: `frontend/src/routes/-search-views.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Search user/project/milestone result row visual shape | `ui-parity-search-notification` | `covered in Wave 5` | User rows remain covered from Wave 3. Project rows now use DTO/project-logo data and render the legacy fork-original metadata block when origin data exists; milestone rows now include legacy `until` text beside the due-date label. Evidence: `crates/persistence/src/repo/search.rs`, `crates/server/src/routes/search.rs`, `frontend/src/api/search.ts`, `frontend/src/routes/-search-views.tsx`, `crates/server/tests/search_contract.rs`, `frontend/src/search-i18n.spec.tsx`, `frontend/src/route-parity.spec.tsx`. |
| Search comment/review result row browser proof | `ui-parity-search-notification` | `covered in Wave 3` | Static render and Playwright proof now cover issue_comment/post_comment/review `Re)` titles, `#comment-id` fragments, number spans, snippets, project/author meta, and review pull-request comment links. Evidence: `frontend/src/search-i18n.spec.tsx`, `frontend/tests/search-parity.e2e.ts`. |
| Notification welcome guide persistence proof | `ui-parity-search-notification` | `covered in Wave 3` | Playwright now clicks `#toggleIntro`, verifies `.site-guide-outer.hide`, stores `localStorage["yobi-intro"]`, reloads, and toggles back on the authenticated `/notifications` route. Evidence: `frontend/tests/search-parity.e2e.ts`. |
| Notification load-more semantics | `ui-parity-search-notification` | `covered in current follow-up` | `/notifications` now preserves the legacy append-next-chunk behavior in React: the initial REST query reads `from=0&size=20`, `#notification-more` prevents anchor navigation, fetches `from=items.length&size=20`, appends `nextPage.items`, and updates `hasMore` instead of refetching prior rows by increasing `size` from zero. Evidence: `frontend/src/routes/notification/route.tsx`, `frontend/src/route-parity.spec.tsx`, existing `frontend/src/auth-workspace-client.spec.ts` API query coverage. |
| Pull request contributor sent-by-me option | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | PR list REST JSON now includes `currentUserId`, and React renders the legacy `pullRequest.sentByMe` option under `#contributors` when that user is also in contributors. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/api/pull-requests.ts`, `crates/server/src/routes/pull_requests.rs`, `frontend/src/route-parity.spec.tsx`, `frontend/tests/pull-request-review-read-parity.e2e.ts`, `crates/server/tests/pull_request_read_contract.rs`. |
| Pull request create/edit selector id semantics | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | Form DOM now preserves hidden `#pullRequestState`, merge-check alert `#status`, title input `#title`, and a body editor id outside those legacy selectors. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/pull-request-list-form-review-i18n.spec.tsx`, `frontend/tests/pull-request-interaction-parity.e2e.ts`. |
| Pull request create/edit body validation | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | React submit now surfaces `pullRequest.body.required` in the legacy visible validation flow before REST submission. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/route-parity.spec.tsx`. |
| Pull request event timeline i18n | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | PR timeline now interpolates sender and merged commit placeholders through legacy messages; render/e2e proof rejects raw `pullRequest.event.message*` keys. Evidence: `frontend/src/routes/-pull-request-views.tsx`, `frontend/src/route-parity.spec.tsx`, `frontend/tests/pull-request-review-read-parity.e2e.ts`. |
| Pull request interaction e2e copy drift | `ui-parity-pull-request-review` | `covered in Wave 3 follow-up` | Classified as stale test drift against legacy messages and updated to `This pull request can be merged safely.`, `Approve`, `Merge`, and reviewer shortage tooltip semantics. Evidence: `frontend/tests/pull-request-interaction-parity.e2e.ts`, `yona-original/conf/messages`. |
| Pull request browser proof for row/review variants | `ui-parity-pull-request-review` | `covered in current follow-up` | `/reviews` rows now restore legacy nowrap ellipsis under `.review-list-wrap .post-item .title-wrap`, and real REST `/reviews` includes non-PR commit review threads like legacy `ReviewSearchCondition`. Evidence: `frontend/src/app.css`, `crates/persistence/src/repo/pull_request_review.rs`, `crates/server/tests/pull_request_read_contract.rs`, `frontend/src/route-parity.spec.tsx`, `frontend/src/project-reviews-export.spec.tsx`. Focused Playwright e2e was attempted but blocked by webServer readiness timeout, not a test assertion failure. |
| Site-admin import repo-auth/project-name copy | `ui-parity-site-admin-setup` | `covered in current follow-up` | `/_import` now renders the legacy `#repoAuth .row-fluid` / `dl.span6` auth field layout, `project.import.auth.userid`, `project.import.auth.userpw`, `project.import.auth.userid.desc`, and `project.name.alert` placeholder while keeping React submit on the REST import boundary. Evidence: `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx`. |
| Secret configured-state behavior | `ui-parity-site-admin-setup` | `covered in Wave 3` | Legacy `/secret` is entered only while the default secret is invalid and has no concrete route in configured runtime. `/api/v1/auth/capabilities` now exposes `secretSetupRequired`; direct GET `/secret` returns 404 after setup, REST setup retry returns 404, and React `/secret` renders `NotFoundPage` instead of the setup form when configured. Evidence: `crates/server/src/routes/auth.rs`, `frontend/src/routes/secret/route.tsx`, `crates/server/tests/auth_workspace_contract.rs`, `frontend/src/route-parity.spec.tsx`. |

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

Run the phase in two distinct gates. Gate A documents the complete UI parity
inventory first; Gate B distributes only the concrete queued rows produced by
that inventory. The inventory gate is complete enough to start worker delegation
because each active packet now has a report under
`docs/provenance/ui-parity-reports/`, but new or reopened pages must return to
Gate A before implementation.

1. Keep `docs/provenance/ui-parity-reports/*` as the route-family inventory
   baseline. If a new legacy page or user-visible state is discovered, add a
   row to the owning report before assigning implementation.
2. Assign implementation by disjoint write scope, not by one giant route family.
   A worker receives one row group, the exact owned files/modules, and the
   focused test/provenance files it may update.
3. Within one batch, avoid overlapping files. If two gaps touch the same route
   helper/component/API module, keep them in the same worker assignment.
4. Parent integrates one completed worker at a time, updates this queue, then
   runs focused checks before assigning the next overlapping worker.
5. After each wave, rerun the lightweight route/spec gates and refresh the
   remaining queue statuses before starting the next wave.

## Worker Wave Plan

Wave 0 is already in progress for small, isolated follow-ups found by the
inventory reports. Later waves should be assigned only after the previous wave
has landed and the queue statuses are refreshed.

| Wave | Worker packet | Owned scope | Queue rows |
| --- | --- | --- | --- |
| 0 | `ui-worker-notification-load-more` | `frontend/src/routes/notification/route.tsx`, `frontend/src/route-parity.spec.tsx`, notification report/phase rows | Notification load-more semantics |
| 1 | `ui-worker-auth-post-state` | `frontend/src/routes/-auth-views.tsx`, auth route files, auth focused specs, auth report rows | Signup confirm/email verification, reset/verify invalid post states |
| 1 | `ui-worker-workspace-settings-proof` | focused Playwright/e2e specs plus `frontend/src/routes/-workspace-settings-view.tsx` only if a concrete diff appears | Closed in current follow-up: avatar invalid/crop UX and notification hash tab activation |
| 1 | `ui-worker-directory-validation-org-member` | `frontend/src/routes/-project-views.tsx`, `frontend/src/routes/-organization-views.tsx`, project/org focused specs | Completed in worker follow-up: Project/import client validation, organization logo auto-submit, and organization member typeahead |
| 2 | `ui-worker-project-admin-home` | `frontend/src/routes/-project-views.tsx`, project route/API projections if required, project focused specs | Project home dashboard, member block/leave modal, settings general controls |
| 2 | `ui-worker-issues-detail-list` | issue React route/view/client files, issue focused specs, issue provenance rows | Issue list filters/mass update, create/edit selector copy, detail metadata/timeline/upload/preview |
| 2 | `ui-worker-board-milestone` | `frontend/src/routes/-board-views.tsx`, `frontend/src/routes/-milestone-views.tsx`, board/milestone focused specs | Board label picker deviation, board attachment/delete/label parity, milestone list/form/detail parity |
| 3 | `ui-worker-code-vcs-proof` | `frontend/src/routes/-code-views.tsx`, code route files, focused Playwright/specs | Commit watch/unwatch, anonymous author decision, branch action proof, diff selector exactness |
| 3 | `ui-worker-pr-review` | `frontend/src/app.css`, `crates/persistence/src/repo/pull_request_review.rs`, PR review focused specs/contracts | Covered in current follow-up: restored legacy nowrap/ellipsis on `/reviews` rows and included legacy non-PR commit review threads in real REST `/reviews` data. Wave 3 already closed contributor sent-by-me, selector ID semantics, body validation, event timeline i18n, stale e2e copy, and mocked PR/commit href variants. |
| 3 | `ui-worker-search-chrome-results` | `frontend/src/routes/-search-views.tsx`, search DTO/repository projection if required, search focused specs | Scoped chrome, missing keyword state decision, user/project/milestone row shapes, comment/review proof |
| 4 | `ui-worker-site-admin-setup` | `crates/server/src/routes/auth.rs`, `frontend/src/routes/secret/route.tsx`, site-admin focused specs | `/secret` configured-state proof/fix closed in Wave 3 |

Worker assignment prompts must name the exact wave row and must include:

- The worker is not alone in the codebase and must not revert unrelated changes.
- The worker may edit only the owned scope plus explicitly named focused tests
  and report rows.
- The worker must keep legacy Yona UI/UX as source of truth and must not add
  improved UX.
- The worker must keep React-visible flows on REST JSON/API-return plus React
  render unless the row is a direct legacy compatibility route.
- The worker final response must list changed files, verification commands, and
  any row it could not close.

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
- 2026-06-26 parent gate refresh: `pnpm test:dev-scripts` passed 67 tests after
  the `/reviews` row-fidelity closure and report-summary reconciliation, with no
  remaining documented `gap`, `deviation`, or `weak evidence` count in the UI
  parity reports at that point.
- 2026-06-26 parent Gate A refresh: `ui-parity-root-navigation-shell.md` was
  added as the missing root-shell report. It records no implementation gap, but
  keeps the full root-shell browser-visible state matrix as `weak evidence`
  until a focused Playwright proof covers modal/sidebar/permission/footer/search
  interactions.
- 2026-06-26 parent frontend boundary refresh: `pnpm --dir frontend test` passed
  908 tests and `pnpm --dir frontend build` passed after closing stale native
  form-submit markers, stale `issue.selectAll` message-key usage, organization
  member typeahead `dangerouslySetInnerHTML`, and legacy users-search
  `response.text()` parsing.
- 2026-06-26 user workspace browser proof refresh: `pnpm --dir frontend test:e2e
  -- user-profile-parity.e2e.ts` passed 3 Playwright tests after adding
  selected-tab click coverage for `/yona/door?daysAgo=7&selected=projects`.
- 2026-06-26 board/milestone frontend refresh: `pnpm --dir frontend test`
  passed 908 tests and `pnpm --dir frontend build` passed after closing the
  milestone detail mass-update dropdown option/mutation follow-up.

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
