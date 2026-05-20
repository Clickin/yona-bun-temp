# Project Provenance

## Scope

- Public project directory route foundation
- Project create, read, update
- Project visibility enforcement
- Project enrollment request/cancel
- Project watcher directory
- Project delete confirmation flow
- Project statistics under-construction shell
- Project change VCS confirmation flow
- Project create/settings menu checkbox persistence
- Workspace recent/favorite/default landing semantics

## Legacy Sources

- `yona-original/test/controllers/ProjectAppTest.java`
- `yona-original/test/controllers/EnrollProjectAppTest.java`
- `yona-original/test/models/ProjectTest.java`
- `yona-original/test/models/RecentlyVisitedProjectsTest.java`
- `yona-original/test/controllers/WatchProjectAppTest.java`
- `yona-original/app/controllers/ProjectApp.java`
- `yona-original/app/controllers/StatisticsApp.java`
- `yona-original/app/views/project/members.scala.html`
- `yona-original/app/views/project/watchers.scala.html`
- `yona-original/app/views/project/webhooks.scala.html`
- `yona-original/app/views/project/partial_webhooks_list.scala.html`
- `yona-original/app/views/project/transfer.scala.html`
- `yona-original/app/views/project/change_vcs.scala.html`
- `yona-original/app/views/project/delete.scala.html`
- `yona-original/app/views/project/statistics.scala.html`
- `yona-original/app/views/project/partial_settingmenu.scala.html`
- `yona-original/app/models/Webhook.java`
- `yona-original/app/models/ProjectTransfer.java`
- `yona-original/app/models/Project.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/legacy-start/src/lib/project-trpc.ts`, `reference/mixed-code/frontend/legacy-start/src/lib/enrollment-trpc.ts`, `reference/mixed-code/frontend/legacy-start/src/lib/me-trpc.ts`, `reference/mixed-code/packages/domain/*project*`, `reference/mixed-code/packages/db/*project*`
- canonical implementation path: `repo root`
- canonical owner path:
  - `frontend`
  - `crates/server`
  - `crates/domain`
  - `crates/persistence`

## Extracted Intent

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `ProjectTest.create` | project create persists identity, overview, scope, VCS, and derived site URL semantics | `crates/persistence` repository helper + `crates/domain` create service |
| `ProjectTest.findByNameAndOwner` and `Project.exists` | public routing keys are owner plus project name | REST path identifiers plus lookup helper in `crates/persistence` |
| `ProjectApp.projects` and `project/list.scala.html` | `/projects` is a public, searchable, paginated directory entry surface and must not fall back to an unsupported route | `frontend` route shell + `GET /api/v1/projects` query + browser smoke |
| `ProjectTest.projectNameChangeable` | rename stays owner-scoped and duplicate project names reject under the same owner | `crates/persistence` conflict helper + `crates/domain` update service |
| `ProjectApp.newProject` | create under personal owner is allowed; org owner create requires org-admin authority | `crates/domain` create service + `crates/server` mutation contract test |
| `ProjectApp.project` | detail read is permission filtered and records recent visit semantics | `crates/domain` detail resolution + `frontend` route/UI test |
| `ProjectApp.projectOverviewUpdate` | manager-level actor can update overview content | `crates/domain` update service + `crates/server` mutation contract test |
| `project.creation.default.menus`, `project/create.scala.html`, and `project/setting.scala.html` | create/settings forms expose Code/Issues/Pull Requests/Reviews/Milestones/Board checkboxes and persist `project_menu_setting` rows | `YONA_PROJECT_DEFAULT_MENUS`, `/api/v1/owners/:owner/projects` create/update bodies, and frontend `menuSetting*` checkbox anchors |
| `ProjectApp.members`, `newMember`, `editMember`, `deleteMember` and `project/members.scala.html` | member administration is UPDATE-gated except self-leave, preserves owner guards, accepts enrollment requests through add-member, and uses legacy member row/action anchors | `GET/POST/PATCH/DELETE /api/v1/owners/:owner/projects/:project/members` + `/:owner/:project/members` route + contract/unit/Playwright assertions |
| `ProjectApp.watchers` and `project/watchers.scala.html` | watcher directory is READ-gated, resolves actual project watchers, and preserves `page-wrap-outer` / `members project row-fluid` member list anchors | `GET /api/v1/owners/:owner/projects/:project/watchers` + `/:owner/:project/watchers` route + contract/unit/Playwright assertions |
| `ProjectApp.webhooks`, `newWebhook`, `deleteWebhook`, `project/webhooks.scala.html`, and `partial_webhooks_list.scala.html` | webhook administration is UPDATE-gated, stores payload URL, secret, webhook type, and gitPush, and preserves legacy form/list anchors | `GET/POST/DELETE /api/v1/owners/:owner/projects/:project/webhooks` + `/:owner/:project/webhooks` route + contract/route/Playwright assertions |
| `ProjectApp.transferForm`, `transferProject`, `acceptTransfer`, `sendTransferRequestMail`, `ProjectTransfer.requestNewTransfer`, and `project/transfer.scala.html` | transfer is UPDATE-gated, stores a one-day confirm-key request, sends a destination accept-link mail, accepts only the destination user/org admin/site admin, moves owner/name, preserves previous owner/name aliasing, and updates sender/destination membership | `GET/POST /api/v1/owners/:owner/projects/:project/transfer` + `GET /project/transfer/:id/:key` + `/:owner/:project/transfer` route + contract/route/Playwright assertions |
| `ProjectApp.changeVCSForm`, `changeVCS`, `Project.changeVCS`, and `project/change_vcs.scala.html` | change VCS is UPDATE-gated, clears DB-backed README posting state, resets repository storage, toggles `GIT`/`Subversion`, and uses the legacy checkbox/modal confirmation shell | `GET/POST /api/v1/owners/:owner/projects/:project/change-vcs` + `/:owner/:project/changeVCS` route + contract/Playwright assertions; SVN executable-backed repository/serve behavior remains VCS lifecycle follow-up |
| `ProjectApp.deleteForm`, `deleteProject`, `Project.delete`, and `project/delete.scala.html` | delete is UPDATE-gated, uses the legacy checkbox/modal confirmation shell, removes dependent project state and the repository, then redirects to `/` | `DELETE /api/v1/owners/:owner/projects/:project` + `/:owner/:project/deleteform` route + contract/Playwright assertions |
| `StatisticsApp.statistics` and `project/statistics.scala.html` | project statistics route is READ-gated by the default project check and renders only the legacy `Under Construction` shell inside `projectLayout` | `/:owner/:project/statistics` route + project container read + route/Playwright assertions for `.page-wrap-outer`, `.project-page-wrap`, and `Under Construction` |
| `ProjectAppTest` visibility cases | public/protected/private visibility gates readable discovery | `crates/domain` read matrix + `crates/server` query contract test |
| `EnrollProjectAppTest` | enrollment request and cancel stay guest-only, not-found for missing projects, idempotent | `crates/domain` enrollment service + `crates/server` mutation contract test |
| `RecentlyVisitedProjectsTest` and `WatchProjectAppTest` | recent visits dedupe/reorder and favorites remain workspace-local behavior | `crates/domain` workspace service + `crates/persistence` workspace repo + `frontend` route/UI test |

## Explicit Gaps

- org enrollment management
- full workspace settings and default landing UX parity
- webhook delivery, event payload/HMAC compatibility, and delivery history/retry behavior
- SVN executable-backed repository creation/serve behavior after `changeVCS`

이 항목들은 후속 follow-up과 provenance gap으로 계속 남는다.

## Internal Translation Notes

- Legacy physically moves owner/project repository paths during transfer. Rust stores Git repositories at `YONA_DATA/repo/<project_id>.git`, as recorded in `docs/provenance/phase-0b/code-browser.md`, so owner/name filesystem path move is not a required parity action. Smart HTTP clone URL/update behavior is still part of the VCS lifecycle follow-up.

## R0-3 Delivery Note

- `R0-3` now covers project create/detail/settings, visibility-aware read, guest-only enrollment request/cancel, member summary, and workspace favorite/recent linkage in `repo root`.
- The Wave 0 route-foundation slice also mounts the public `/projects` directory in `frontend` through file routes under `src/routes/projects/**`, with route-parity tests and a shell-routing Playwright smoke pack.
- Project detail read records recent visits for authenticated viewers, and `/me` now reflects favorite/recent project state through `GET /api/v1/workspace`.
- The project watcher closeout adds an app REST watcher directory and legacy deep-link route for `/:owner/:project/watchers`; unreadable projects keep the project READ denial while readable projects list actual watcher users with legacy member-row class anchors.
- The project member management closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/members`, app REST add/role/delete mutations, enrollment cleanup, member-accept notification/mail staging, owner/self-leave guards, and legacy `project/members.scala.html` class anchors.
- The project delete closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/deleteform`, app REST project deletion, dependent project-row cleanup, bare Git repository removal, and legacy `project/delete.scala.html` / setting-menu anchors.
- The project webhook CRUD closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/webhooks`, app REST list/create/delete, payload URL/secret/type/gitPush persistence, and legacy `project/webhooks.scala.html` / `partial_webhooks_list.scala.html` anchors. Webhook delivery, HMAC/signature compatibility, event fan-out, and delivery history remain explicit follow-up gaps.
- The project transfer closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/transfer`, app REST transfer request, legacy direct accept link `/project/transfer/:id/:key`, transfer request mail delivery through the outbound mail integration, `project_transfer` persistence, previous owner/name route aliasing, and sender/destination membership updates. Owner/name repository path move is intentionally not applicable to the Rust ID-based Git repository layout.
- The project statistics closeout adds the legacy deep-link route for `/:owner/:project/statistics`, reads the normal project container, and preserves the `project/statistics.scala.html` under-construction shell instead of inventing computed statistics that legacy Yona did not expose.
- The project change VCS closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/changeVCS`, app REST form/mutation under `/change-vcs`, `vcs` metadata toggling, DB-backed README posting flag clear, ID-based repository storage reset, and `project/change_vcs.scala.html` checkbox/modal anchors. SVN executable-backed repository creation/serve behavior remains a VCS lifecycle follow-up.
- The project menu checkbox closeout maps `YONA_PROJECT_DEFAULT_MENUS` into create-form defaults, keeps legacy checkbox IDs (`menuSettingCode`, `menuSettingIssue`, `menuSettingPullRequest`, `menuSettingReview`, `menuSettingMilestone`, `menuSettingBoard`), and persists settings-form toggles into `project_menu_setting` through `/api/v1/owners/:owner/projects/:project`.
