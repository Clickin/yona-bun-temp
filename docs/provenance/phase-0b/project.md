# Project Provenance

## Scope

- Public project directory route foundation
- Project create, read, update
- Project visibility enforcement
- Project enrollment request/cancel
- Project watcher directory
- Project delete confirmation flow
- Project home legacy layout/header/menu shell, history/dashboard tab shell, DB/VCS-backed history rows, and dashboard label/assignee counts
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
- `yona-original/target/scala-2.10/twirl/main/views/html/projectLayout.template.scala`
- `yona-original/target/scala-2.10/twirl/main/views/html/project/header.template.scala`
- `yona-original/target/scala-2.10/twirl/main/views/html/projectMenu.template.scala`
- `yona-original/target/scala-2.10/twirl/main/views/html/project/home.template.scala`
- `yona-original/target/scala-2.10/twirl/main/views/html/project/partial_history.template.scala`
- `yona-original/target/scala-2.10/twirl/main/views/html/project/partial_dashboard.template.scala`
- `yona-original/app/models/Webhook.java`
- `yona-original/app/models/ProjectTransfer.java`
- `yona-original/app/models/Project.java`

## Current Baseline And Canonical Target

- obsolete pre-Rust residual path, not reference: `reference/mixed-code/frontend/legacy-start/src/lib/project-trpc.ts`, `reference/mixed-code/frontend/legacy-start/src/lib/enrollment-trpc.ts`, `reference/mixed-code/frontend/legacy-start/src/lib/me-trpc.ts`, `reference/mixed-code/packages/domain/*project*`, `reference/mixed-code/packages/db/*project*`
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
| `ProjectApp.projects` and `project/list.scala.html` | `/projects` is a public, searchable, paginated directory entry surface and must not fall back to an unsupported route | `frontend` route shell + `GET /api/v1/projects` query + fixed 10-item `pageNum` route/UI test + browser smoke |
| `ProjectTest.projectNameChangeable` | rename stays owner-scoped and duplicate project names reject under the same owner | `crates/persistence` conflict helper + `crates/domain` update service |
| `ProjectApp.newProject` | create under personal owner is allowed; org owner create requires org-admin authority | `crates/domain` create service + `crates/server` mutation contract test |
| `ProjectApp.project` | detail read is permission filtered and records recent visit semantics | `crates/domain` detail resolution + `frontend` route/UI test |
| `projectLayout.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, `project/home.scala.html`, `project/partial_history.scala.html`, `project/partial_dashboard.scala.html`, `project/partial_dashboard_issuesbylabel.scala.html`, and `project/partial_dashboard_issuesbyassignee.scala.html` | project home preserves the legacy project header/menu/page shell, honors `tabId=history|dashboard`, renders the legacy tab panes with `.activity-streams` and `.project-overview-home` dashboard anchors, lists issue/post/pullrequest/commit history rows, and counts open issues by project label and assignee | `frontend` project route query wiring + project detail view shell + route/UI tests for `project-header-*`, `project-menu-*`, `.page-wrap-outer`, `.project-home-header`, tab, clone, and right-pane anchors + `/api/v1/owners/:owner/projects/:project/container` `history.items`, `dashboard.labels`, `dashboard.assignees`, and `dashboard.unassignedOpenIssueCount`; overview edit-flow polish remains follow-up |
| `ProjectApp.projectOverviewUpdate` | manager-level actor can update overview content | `crates/domain` update service + `crates/server` mutation contract test |
| `project.creation.default.menus`, `project/create.scala.html`, and `project/setting.scala.html` | create/settings forms expose Code/Issues/Pull Requests/Reviews/Milestones/Board checkboxes and persist `project_menu_setting` rows | `YONA_PROJECT_DEFAULT_MENUS`, `/api/v1/owners/:owner/projects` create/update bodies, and frontend `menuSetting*` checkbox anchors |
| `ProjectApp.importing`, `project/importing.scala.html`, and `ProjectService.cloneRepository` | Git import preserves the legacy `/_import` shell and owner handoff, but React SPA submit stays on the REST JSON boundary and only the direct route acts as a no-JS/deep-link fallback | `GET /_import` React shell + `POST /api/v1/projects/import` JSON mutation + direct `POST /_import` fallback, both cloning with native `git clone --bare` into ID-based repository storage |
| `ProjectApp.members`, `newMember`, `editMember`, `deleteMember`, `UserApp.leave`, and `project/members.scala.html` | member administration is UPDATE-gated except self-leave, preserves owner guards, accepts enrollment requests through add-member, preserves the current-user `/info/leave/:owner/:project` redirect, and uses legacy member row/action anchors | `GET/POST/PATCH/DELETE /api/v1/owners/:owner/projects/:project/members` + `/:owner/:project/members` route + direct `/info/leave/:owner/:project` route + contract/unit/Playwright assertions |
| `ProjectApp.watchers` and `project/watchers.scala.html` | watcher directory is READ-gated, resolves actual project watchers, and preserves `page-wrap-outer` / `members project row-fluid` member list anchors | `GET /api/v1/owners/:owner/projects/:project/watchers` + `/:owner/:project/watchers` route + contract/unit/Playwright assertions |
| `ProjectApp.webhooks`, `newWebhook`, `deleteWebhook`, `project/webhooks.scala.html`, and `partial_webhooks_list.scala.html` | webhook administration is UPDATE-gated, stores payload URL, secret, webhook type, and gitPush, and preserves legacy form/list anchors | `GET/POST/DELETE /api/v1/owners/:owner/projects/:project/webhooks` + `/:owner/:project/webhooks` route + contract/route/Playwright assertions |
| `Webhook.java` `DETAIL_SLACK` and `buildAttachmentJSON` | Slack detail webhooks are the project webhook type `DETAIL_SLACK`, not a separate integration surface; issue/comment/PR attachments include `text`, nullable or array `fields`, and `color` from `slack.<EventType>` config | `crates/server/src/routes/projects/webhooks.rs` payload builders + `crates/server/src/runtime_config.rs` `[slack]` / legacy-style `slack.<EventType>` startup config + `project_webhook_contract::project_webhooks_enqueue_legacy_board_comment_payloads_for_non_json_hooks` + `runtime_config_contract` |
| `ProjectApp.transferForm`, `transferProject`, `acceptTransfer`, `sendTransferRequestMail`, `ProjectTransfer.requestNewTransfer`, and `project/transfer.scala.html` | transfer is UPDATE-gated, stores a one-day confirm-key request, sends a destination accept-link mail, accepts only the destination user/org admin/site admin, moves owner/name, preserves previous owner/name aliasing, and updates sender/destination membership | `GET/POST /api/v1/owners/:owner/projects/:project/transfer` + `GET /project/transfer/:id/:key` + `/:owner/:project/transfer` route + contract/route/Playwright assertions |
| `ProjectApp.changeVCSForm`, `changeVCS`, `Project.changeVCS`, and `project/change_vcs.scala.html` | change VCS is UPDATE-gated, clears DB-backed README posting state, resets repository storage, toggles `GIT`/`Subversion`, creates executable-backed SVN storage, and uses the legacy checkbox/modal confirmation shell | `GET/POST /api/v1/owners/:owner/projects/:project/change-vcs` + `/:owner/:project/changeVCS` route + contract/Playwright assertions; `/svn/$path` auth/DAV boundary and executable-backed SVN WebDAV bridge contracts; former broader VCC/baseline PROPFIND edge completeness is covered by P3-A protocol evidence |
| `ProjectApp.deleteForm`, `deleteProject`, `Project.delete`, and `project/delete.scala.html` | delete is UPDATE-gated, uses the legacy checkbox/modal confirmation shell, removes dependent project state and the repository, then redirects to `/` | `DELETE /api/v1/owners/:owner/projects/:project` + `/:owner/:project/deleteform` route + contract/Playwright assertions |
| `StatisticsApp.statistics` and `project/statistics.scala.html` | project statistics route is READ-gated by the default project check and renders only the legacy `Under Construction` shell inside `projectLayout` | `/:owner/:project/statistics` route + project container read + route/Playwright assertions for `.page-wrap-outer`, `.project-page-wrap`, and `Under Construction` |
| `ProjectAppTest` visibility cases | public/protected/private visibility gates readable discovery, and site admins bypass project read/update gates | `crates/domain` read/update matrix + `crates/server` query contract test |
| `EnrollProjectAppTest` | enrollment request and cancel stay guest-only, not-found for missing projects, idempotent | `crates/domain` enrollment service + `crates/server` mutation contract test |
| `RecentlyVisitedProjectsTest` and `WatchProjectAppTest` | recent visits dedupe/reorder and favorites remain workspace-local behavior | `crates/domain` workspace service + `crates/persistence` workspace repo + `frontend` route/UI test |

## Closed Items And Follow-Up Boundaries

- Organization enrollment management is app-runtime closed in
  `docs/provenance/phase-0b/organization.md` and
  `docs/provenance/core-parity-audit.md`; focused coverage lives in
  `org_project_contract::organization_enrollment_mutations_toggle_guest_request_state`
  and
  `org_project_contract::organization_admin_mutations_add_accept_promote_and_delete_members`.
- Workspace settings and default landing UX parity is app-runtime closed in
  `docs/provenance/phase-0b/user-workspace.md`; the remaining auth-provider and
  migrator hardening boundaries live in their dedicated deferred provenance.
- 2026-06-27 workspace settings alias follow-up: `/me/settings/**` aliases now
  render through the `/me` child outlet and replace-navigate to the canonical
  legacy `/user/editform/**` account settings routes, with notification hash
  preservation for `/me/settings/notifications#projectId`. This keeps the
  workspace/project sidebar entrypoints on legacy account-settings URLs instead
  of rendering the `/me` profile page for settings aliases. Browser evidence:
  `frontend/tests/workspace-settings-parity.e2e.ts`.
- 2026-06-25 workspace favorite/recent/default-landing UI correction: legacy
  `user/view.scala.html` does not render favorite-project, recent-project,
  default-login-page, or logout footer sections on `/me`. Favorite/recent
  project data remains exposed through the React-rendered root user menu and
  workspace overview API, while the legacy `#setDefaultLoginPage` control stays
  on `common/mySeriesMenuTab.scala.html` pages such as `/user/issues` and
  `/notifications`.
- 2026-06-25 workspace project action UI correction: legacy
  `user/partial_projectlist.scala.html` renders viewer-specific watch/unwatch
  anchors and a self-profile leave-project anchor in project stream rows. The
  Rust workspace/public-profile projections now expose `isWatching`,
  `viewerCanWatch`, and `viewerCanLeave` for those rows, and React renders the
  legacy `watchBtn`/`leaveProject` anchors instead of a bare watcher-count badge.
  Coverage: `frontend/src/wave1-auth-workspace-parity.spec.tsx`,
  `frontend/src/workspace-profile-i18n.spec.tsx`, and
  `pnpm agent:cargo -- --outside-sandbox check -p yoram-server`.
- Optional webhook HMAC/signature compatibility is not applicable for legacy
  parity. `Webhook.java` `sendRequest` only sets `Content-Type:
  application/json`, `User-Agent: Yobi-Hookshot`, and optional
  `Authorization: token <secret> `; `conf/messages` `project.webhook.help`
  documents only that token header; targeted legacy/current searches found no
  `X-Hub-Signature`, `X-Yona-*`, SHA/HMAC signing, or equivalent webhook
  signature behavior.
- Broader VCC/baseline PROPFIND edge completeness after the executable SVN WebDAV
  bridge remains an explicit VCS lifecycle follow-up/deferred boundary, not a
  current app-runtime blocker.

## Internal Translation Notes

- Legacy physically moves owner/project repository paths during transfer. Rust stores Git repositories at `YONA_DATA/repo/<project_id>.git`, as recorded in `docs/provenance/phase-0b/code-browser.md`, so owner/name filesystem path move is not a required parity action. Smart HTTP clone URLs and push post-receive side effects resolve through the current owner/project route.

## Route Module Diet Note

- 2026-06-19: REST project and organization route registration for `/api/v1/projects`, `/api/v1/projects/form-options`, `/api/v1/organizations/**`, and `/api/v1/owners/:owner/projects/:project/**` project create/read/update/delete, member, watcher, webhook, transfer, fork, change-vcs, overview, enroll, favorite, and watch endpoints moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/projects.rs`. This is a registration-only build/check diet change; behavior remains covered by `org_project_contract` project/organization CRUD, membership, enrollment, watcher, webhook, transfer, fork, VCS, overview, and directory contracts plus `project_transfer_contract::project_transfer_requests_and_accept_link_follow_legacy_permissions`.

## R0-3 Delivery Note

- `R0-3` now covers project create/detail/settings, visibility-aware read, guest-only enrollment request/cancel, member summary, and workspace favorite/recent linkage in `repo root`.
- The Wave 0 route-foundation slice also mounts the public `/projects` directory in `frontend` through file routes under `src/routes/projects/**`, with route-parity tests for legacy fixed 10-item `pageNum` slicing, React-rendered legacy `#pagination.page-navigation-wrap` controls, and a shell-routing Playwright smoke pack.
- The project visibility closeout locks public/protected/private read behavior and site-admin read/update bypass in `crates/domain::org_project` tests; server routes consume the same `authorize_project_access` decision helper for project read/update gates.
- Project detail read records recent visits for authenticated viewers, and `/me` now reflects favorite/recent project state through `GET /api/v1/workspace`.
- The project watcher closeout adds an app REST watcher directory and legacy deep-link route for `/:owner/:project/watchers`; unreadable projects keep the project READ denial while readable projects list actual watcher users with legacy member-row class anchors.
- The project member management closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/members`, app REST add/role/delete mutations, direct legacy `/info/leave/:owner/:project` current-user leave redirect, enrollment cleanup, member-accept notification/mail staging, owner/self-leave guards, and legacy `project/members.scala.html` class anchors.
- The project delete closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/deleteform`, app REST project deletion, dependent project-row cleanup, bare Git repository removal, and legacy `project/delete.scala.html` / setting-menu anchors. The React delete page now mirrors `yobi.project.Delete.js` by showing the `project.delete.alert` scalar when `#btnDelete` is clicked before `#accept` is checked.
- The project webhook CRUD closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/webhooks`, app REST list/create/delete, payload URL/secret/type/gitPush persistence, and legacy `project/webhooks.scala.html` / `partial_webhooks_list.scala.html` anchors. Follow-up delivery slices added issue/comment, PR create/review/comment/merge/commit-changed, `DETAIL_SLACK` attachment detail/color payloads, and git-push fan-out plus `webhook_delivery` history rows, a settings read surface, and bounded transient-failure retry. P4-C signature compatibility is retired as not applicable because legacy evidence proves only the token secret header; production delivery hardening remains an explicit follow-up boundary.
- The project transfer closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/transfer`, app REST transfer request, legacy direct accept link `/project/transfer/:id/:key`, transfer request mail delivery through the outbound mail integration, `project_transfer` persistence, previous owner/name route aliasing, and sender/destination membership updates. The React transfer page now mirrors `yobi.project.Transfer.js` by showing the `project.transfer.alert` scalar when `#btnTransfer` is clicked before `#accept` is checked, while leaving empty-owner submission to the existing request/error path. Owner/name repository path move is intentionally not applicable to the Rust ID-based Git repository layout.
- The project statistics closeout adds the legacy deep-link route for `/:owner/:project/statistics`, reads the normal project container, and preserves the `project/statistics.scala.html` under-construction shell instead of inventing computed statistics that legacy Yona did not expose.
- The project change VCS closeout adds the UPDATE-gated legacy deep-link route for `/:owner/:project/changeVCS`, app REST form/mutation under `/change-vcs`, `vcs` metadata toggling, DB-backed README posting flag clear, ID-based repository storage reset, executable-backed SVN storage creation, and `project/change_vcs.scala.html` checkbox/modal anchors. The React change-VCS page now mirrors `yobi.project.ChangeVCS.js` by showing the `project.changeVCS.alert` scalar when `#btnChangeVCS` is clicked before `#acceptChangeVCS` is checked. The `/svn/$path` auth/DAV boundary and executable SVN WebDAV bridge are mounted; the former broader VCC/baseline PROPFIND edge list is covered by P3-A protocol evidence.
- The project menu checkbox closeout maps `YONA_PROJECT_DEFAULT_MENUS` into create-form defaults, keeps legacy checkbox IDs (`menuSettingCode`, `menuSettingIssue`, `menuSettingPullRequest`, `menuSettingReview`, `menuSettingMilestone`, `menuSettingBoard`), and persists settings-form toggles into `project_menu_setting` through `/api/v1/owners/:owner/projects/:project`.
- The project Git import closeout keeps `/_import` as the legacy route/shell and direct form fallback, but the React route submits through `POST /api/v1/projects/import` with JSON, CSRF, repository-backend validation, personal/organization create authorization, overview/name/scope validation, menu-setting persistence, native `git clone --bare`, and redirect-path JSON. Coverage: `org_project_contract::project_import_rest_route_clones_git_repository_for_spa`, `frontend/src/form-submit-boundary.spec.tsx`, and `frontend/src/project-import-parity.spec.tsx`.
- 2026-06-26 UI parity follow-up: `/_import` now preserves the legacy `project/importing.scala.html` repo-auth field layout and copy (`#repoAuth .row-fluid`, `dl.span6`, `project.import.auth.userid`, `project.import.auth.userpw`, `project.import.auth.userid.desc`) and uses the import-template `project.name.alert` placeholder for `#project-name`, while keeping React submit on the REST JSON import boundary.
- 2026-06-26 shared org/project client note: `frontend/src/api/org-project.ts` changed only the organization update body to preserve `logoAttachmentId`; project create/update body shapes and project enrollment behavior remain unchanged and continue to be covered by `frontend/src/auth-workspace-client.spec.ts`.
- The project home layout closeout restores the legacy `projectLayout` composition for `/:owner/:project`: `project/header.scala.html` header anchors (`.project-header-outer`, `.project-header-inner`, `.project-header-wrap`, `.project-header-avatar`, `.project-breadcrumb-wrap`, scope/origin/favorite markers), `projectMenu.scala.html` menu anchors (`.project-menu-outer`, `.project-menu-inner`, `.project-menu-nav.project-menu-gruop`, `.project-menu-count`, `.project-setting`), and `project/home.scala.html` page shell anchors (`.page-wrap-outer`, `.project-page-wrap`, `.project-home-header`, `.project-overview`, `.project-clone-wrap`, `.span-left-pane`, `.span-right-pane`, `.bubble-wrap.gray.project-home`). The project home tab closeout wires `?tabId=history|dashboard` through the React route and replaces the prior placeholder copy with legacy `partial_history` / `partial_dashboard` shell anchors. The history row closeout adds additive project-container `history.items` data for DB-backed issue/post/pullrequest rows plus Git commit rows from `YONA_DATA/repo/<project_id>.git`, and renders legacy `.activity-stream`, `.avatar-wrap.pull-left.mr10`, `.actor`, `.where`, `.title`, and `.date` anchors from `partial_history.scala.html`; empty or no-head repositories contribute no synthetic commit rows. The dashboard label/assignee closeout adds additive project-container `dashboard.labels`, `dashboard.assignees`, and `dashboard.unassignedOpenIssueCount` data and renders legacy `.issue-label.list-label.active`, `.usf-group`, `.avatar-wrap.smaller`, and `.yobicon-blankstare` rows with open issue counts from `partial_dashboard_issuesbylabel.scala.html` and `partial_dashboard_issuesbyassignee.scala.html`.
- 2026-06-26 template-first P2 correction: `project/header.scala.html` has owner and project breadcrumb anchors but no `.project-title-text` wrapper. `frontend/src/routes/-project-views.tsx` now removes that non-legacy wrapper while preserving the breadcrumb anchors and existing scope/favorite markers; `frontend/src/route-parity.spec.tsx` asserts the class is absent, and `docs/provenance/ui-parity-reports/template-first-p2-project-shell.md` reclassifies the specific deviation as covered.
- 2026-06-26 template-first P2 header/home correction: `ProjectHeader` now owns the legacy `project/header.scala.html` util controls (`.project-util-wrap`, `.project-util`, enrollment dropdown with `#enrollBtn`, watcher dropdown with `.watch-btn`, `.watcher-count`, `.watch-on`, and `.watchBtn`) while continuing to call current React REST mutation handlers instead of importing legacy JavaScript. The project home right pane no longer renders the temporary `Project dashboard` / `.runtime-grid` block or a duplicate watcher section, keeps the milestone summary before `.inner.member-info`, and shows the fork CTA only for Git projects as guarded in `project/home.scala.html`.
- 2026-06-26 template-first P2 create-form correction: `ProjectNewPage` keeps the legacy `project/create.scala.html` `#menuSettingPullRequest` checkbox label/input in the rendered form even when SVN is selected; SVN warning visibility no longer removes the pull-request menu checkbox from the React DOM.
- 2026-06-26 template-first P2 settings-logo correction: `ProjectSettingsPage` restores the legacy `project/setting.scala.html` `.logo-wrap` inline `background-image:url(...)` using the projected project `logoUrl` or the legacy `project_default_logo.png` fallback, while preserving the existing `#logoPath` upload boundary and validation.
