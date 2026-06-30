# UI Parity Report: Site Admin / Setup

Status: explorer audit
Date: 2026-06-26
Packet: `ui-parity-site-admin-setup`

## Scope

Read-only audit of legacy Yona site administration, initial setup/restart, Git project import, and outbound migration/operator surfaces. This report follows the conversion rule that app runtime pages stay React SPA with REST JSON/API-return boundaries, while legacy server templates and direct form routes are evidence or compatibility adapters only.

## Evidence Checked

Legacy evidence:

- `yona-original/conf/routes`
- `yona-original/app/Global.java`
- `yona-original/app/models/SiteAdmin.java`
- `yona-original/app/views/site/siteMngLayout.scala.html`
- `yona-original/app/views/site/userList.scala.html`
- `yona-original/app/views/site/projectList.scala.html`
- `yona-original/app/views/site/postList.scala.html`
- `yona-original/app/views/site/issueList.scala.html`
- `yona-original/app/views/site/mail.scala.html`
- `yona-original/app/views/site/massMail.scala.html`
- `yona-original/app/views/site/update.scala.html`
- `yona-original/app/views/site/diagnostic.scala.html`
- `yona-original/app/views/site/data.scala.html`
- `yona-original/app/views/welcome/secret.scala.html`
- `yona-original/app/views/welcome/restart.scala.html`
- `yona-original/app/views/project/importing.scala.html`
- `yona-original/app/views/migration/home.scala.html`
- `yona-original/public/javascripts/service/yobi.site.MassMail.js`
- `yona-original/conf/messages`

Current evidence:

- `frontend/src/routes/sites/$pageName/route.tsx`
- `frontend/src/routes/secret/route.tsx`
- `frontend/src/routes/restart/route.tsx`
- `frontend/src/routes/migration.tsx`
- `frontend/src/routes/[_]import/route.tsx`
- `frontend/src/routes/-project-views.tsx`
- `frontend/src/api/site-admin.ts`
- `crates/server/src/routes/site_admin.rs`
- `crates/server/src/routes/site_admin/update.rs`
- `crates/server/src/routes/auth.rs`
- `crates/server/src/routes/legacy_runtime.rs`
- `crates/server/src/routes/projects.rs`
- `crates/server/tests/site_admin_contract.rs`
- `crates/server/tests/auth_workspace_contract.rs`
- `crates/server/tests/org_project_contract.rs`
- `frontend/src/site-admin-route-parity.spec.tsx`
- `frontend/src/site-admin-data-parity.spec.tsx`
- `frontend/src/project-import-parity.spec.tsx`
- `frontend/src/route-parity.spec.tsx`
- `frontend/tests/site-admin-*.e2e.ts`
- `.agent/legacy-html-page-audit/{route-coverage,e2e-render-coverage,parity-spec-coverage}.json`
- `output/playwright/visual-sweep/latest.json`
- `docs/provenance/github-migration-decision.md`
- `docs/provenance/migration-tool-api-decision.md`
- `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md`

## Route Inventory Summary

Total rows: 17

| status | count |
| --- | ---: |
| covered | 16 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 1 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/sites/**` admin-only state | `conf/routes:152-176`, `SiteApp` routes; `siteMngLayout.scala.html` is only for site settings | `frontend/src/routes/sites/$pageName/route.tsx` uses `useRequireAuthenticatedRoute`, `currentSession.isSiteAdmin`, `ForbiddenPage`; `site_admin_contract` checks unauthenticated/member forbidden for REST/direct routes | covered | none |
| `/sites/**` sidebar/update badge | `siteMngLayout.scala.html` renders `site.sidebar.*`, active `li`, and `notification-badge` on update | `SiteAdminSidebar`, `siteUpdateQueryOptions`, `site-admin-route-parity.spec.tsx`, visual/HTML coverage artifacts | covered | none |
| `/sites/userList` | `userList.scala.html`: state tabs, search, user rows, guest/lock/site-admin toggles, reset password alert, delete modal | `SiteAdminUserListPage`, `SiteUserRow`, `SiteDeleteUserModal`, `frontend/tests/site-admin-user-list-parity.e2e.ts`, `site_admin_user_list_and_toggles_follow_legacy_state_buckets`; search submit keeps legacy GET form attributes but routes through TanStack navigation and href-derived refetch. | covered | none |
| `/sites/projectList` | `projectList.scala.html`: search, project rows, created date, delete modal | `frontend/src/routes/sites/projectList.tsx`, `/api/v1/site/projects`, `frontend/tests/site-admin-project-list.e2e.ts`, `site_admin_project_list_and_delete_follow_legacy_surface`; search submit keeps legacy GET form attributes and the baseline screen includes the legacy delete modal shell. | covered in 2026-06-30 template-first reset slice | none |
| `/sites/postList` | `postList.scala.html`: read-only site-wide post list with project/author/comment links | `frontend/src/routes/sites/postList.tsx`, `/api/v1/site/posts`, `frontend/tests/site-admin-post-list.e2e.ts`, `site_admin_post_list_follows_legacy_read_only_surface` | covered in 2026-06-30 template-first reset slice | none |
| `/sites/issueList` | `issueList.scala.html`: open/closed tabs and read-only issue rows | `frontend/src/routes/sites/issueList.tsx`, `/api/v1/site/issues`, `frontend/tests/site-admin-issue-list.e2e.ts`, `site_admin_issue_list_follows_legacy_state_tabs` | covered in 2026-06-30 template-first reset slice | none |
| `/sites/mail` | `mail.scala.html`: `#mailForm`, not-configured alert, sent alert, `site.mail.*` labels/placeholders | `frontend/src/routes/sites/mail.tsx`, `/api/v1/site/mail`, `/api/v1/site/mail/test`, direct `/sites/mail`, `frontend/tests/site-admin-mail.e2e.ts`, `site_admin_mail_send_and_recipient_lookup_follow_legacy_surface` | covered in 2026-06-30 template-first reset slice | none |
| `/sites/massmail` | `massMail.scala.html`: `#mailtoAll`, `#mailtoPrj`, `#project-list-wrap`, `#input-project`, `#select-project`, `#selected-projects`, `#write-email` | `frontend/src/routes/sites/massmail.tsx`, `frontend/tests/site-admin-massmail.e2e.ts`; selected-project lookup and mailto launch remain tied to `/api/v1/site/mail-list` follow-up interaction work | covered in 2026-06-30 template-first reset slice | selected-project chips and mailto launch deferred as interaction follow-up |
| `/sites/update` | `update.scala.html`: update available/current/no-update/error branches and download link; sidebar badge | `frontend/src/routes/sites/update.tsx`, `/api/v1/site/update`, `/sites/update/download-file`, `frontend/tests/site-admin-update.e2e.ts`, update metadata/download contract tests | covered in 2026-06-30 template-first reset slice | none |
| `/sites/diagnostic` | `diagnostic.scala.html`: no-error key or error count plus `<pre>` list | `frontend/src/routes/sites/diagnostic.tsx`, `/api/v1/site/diagnostics`, `frontend/tests/site-admin-diagnostic.e2e.ts`, `site_admin_diagnostics_are_site_admin_only_and_report_legacy_error_list` | covered in 2026-06-30 template-first reset slice | none |
| `/sites/data`, `/sites/export`, `/sites/import` | `data.scala.html`: warnings, export button, multipart file import submit | `frontend/src/routes/sites/data.tsx`, direct `/sites/export` and `/sites/import`, extensive `site_admin_contract` export/import/dry-run/rollback tests. `frontend/tests/site-admin-data.e2e.ts` browser-proves the legacy whole-screen shell, warning copy, export link, and multipart file import form. | covered in 2026-06-30 template-first reset slice | none |
| `/sites/:unknown` | Legacy has no catch-all site route beyond concrete `conf/routes` entries | `SiteAdminRouteComponent` returns `NotFoundPage` for unknown page names | not-applicable | none |
| `/secret` setup-required | `Global.java` intercepts all requests when default secret is invalid; `secret.scala.html` form has `.secret-wrap`, `.secret-box`, readonly `loginId=admin`, welcome/user/password labels | `frontend/src/routes/secret/route.tsx` renders same shell and submits REST `/api/v1/auth/secret`; `frontend/tests/auth-public-entry-parity.e2e.ts` proves the first-run form shell, readonly admin login id, legacy labels/copy, no direct `/secret` form action/method, REST payload, and restart redirect; `auth_workspace_contract::secret_admin_setup_rest_updates_legacy_default_admin_and_form_post_is_not_a_mutation`; route/visual coverage | covered | none |
| `/secret` configured state | Legacy `Global.onRequest` only enters `getConfigSecretAction()` when `isSecretInvalid`; normal configured runtime falls through to default routing and there is no concrete `/secret` route | `/api/v1/auth/capabilities` now exposes `secretSetupRequired`; direct GET `/secret` returns 404 after setup, REST setup retry returns 404, and the React `/secret` route renders `NotFoundPage` instead of the setup form when configured | covered in Wave 3 | `crates/server/src/routes/auth.rs`, `frontend/src/routes/secret/route.tsx`, `crates/server/tests/auth_workspace_contract.rs`, `frontend/src/route-parity.spec.tsx` |
| `/restart` | `Global.java` returns restart action after secret update; `restart.scala.html` uses `.secret-wrap`, `.secret-box`, `app.restart.*` copy | `frontend/src/routes/restart/route.tsx`, `frontend/src/route-parity.spec.tsx`, visual sweep entries for `/restart` | covered | none |
| `/_import` Git project import | `project/importing.scala.html`: `#importGit`, `#url`, `#useRepoAuth`, `#repoAuth` with `project.import.auth.userid`/`project.import.auth.userpw` labels and `project.import.auth.userid.desc` placeholder, `project-name` placeholder `project.name.alert`, menu checkboxes | `ProjectImportPage` preserves route/form shell and REST `importProjectRest`, and now renders the legacy `#repoAuth .row-fluid` / `dl.span6` labels/placeholders plus `project.name.alert` placeholder. | covered in follow-up | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx` |
| `/migration` | `conf/routes:19-26`, `MigrationApp.migration`, `migration/home.scala.html`, `yona.Migration.js`; legacy UI is outbound "Yona to Github" and gated by `github.allow.migration=false` by default, where the default legacy response is forbidden with `error.forbidden.or.not.allowed` | `frontend/src/routes/migration.tsx` renders the React disabled shell with `.yobi-migration`, source/destination panels, disabled milestone/issue/post actions, and the legacy forbidden copy. `frontend/tests/migration-parity.e2e.ts` whole-screen compares the stable navbar/content/footer DOM and pins disabled search/import controls plus fixed Bootstrap row/span metrics. `docs/provenance/github-migration-decision.md` keeps actual GitHub API migration behavior as external operator tooling, not a frontend UI parity blocker. | covered in current follow-up | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/sites/userList` | site admin, active users | `.site-setting-nav li.active`, `.user-list-wrap`, `site.userList.*`, `data-toggle="account-delete"`, `data-toggle="reset-password"` | same classes/selectors; reset success alert with `user.newPassword`; delete modal `#alertDeletionWrap` | search, tabs, guest/lock/site-admin toggle, reset password, delete open/cancel/confirm | React calls `/api/v1/site/users*`; legacy direct mutation URIs remain data attributes/aliases | covered |
| `/sites/userList` | authenticated non-admin | legacy site manager route forbidden | `ForbiddenPage href="/sites/userList"` | direct navigation | REST/direct site routes return 403 in contract tests | covered |
| `/sites/projectList` | site admin populated list | `.project-list-wrap`, `site.project.filter`, `data-toggle="delete-project"`, `#projectDeleteBtn`, `#alertDeletionWrap` | same whole-screen shell, active sidebar item, search form, list headers, row/link classes, delete button data attributes, and modal shell; `site-admin-project-list.e2e.ts` compares the stable legacy roots | whole-screen populated list with hidden delete modal baseline | React GET `/api/v1/site/projects`; direct `/sites/project/delete/:id` alias remains covered server-side | covered in 2026-06-30 template-first reset slice |
| `/sites/postList` | site admin populated list | `.post-list-wrap`, `.post-project`, `.post-title`, author avatar, comments link, `#pagination` placeholder | same whole-screen shell, active sidebar item, row/link classes, image attributes, date title, and comments anchor; `site-admin-post-list.e2e.ts` compares the stable legacy roots | whole-screen populated read-only list state | React GET `/api/v1/site/posts`; direct route authorization remains covered server-side | covered in 2026-06-30 template-first reset slice |
| `/sites/issueList` | site admin open populated list | `.nav.nav-tabs`, `issue.state.open`, `issue.state.closed`, `.post-list-wrap`, comments link, `#pagination` placeholder | same whole-screen shell, active sidebar item, state tabs, row/link classes, image attributes, date title, and comments anchor; `site-admin-issue-list.e2e.ts` compares the stable legacy roots | whole-screen open read-only list state | React GET `/api/v1/site/issues?state=`; direct route authorization remains covered server-side | covered in 2026-06-30 template-first reset slice |
| `/sites/mail` | site admin, mail not configured | `#mailForm`, `.alert.alert-error`, `site.mail.notConfigured`, sender/from/to/subject/body fields | same whole-screen shell, active sidebar item, not-configured alert, and form fields; `site-admin-mail.e2e.ts` asserts resolved copy and legacy attributes | whole-screen not-configured mail form state | React GET `/api/v1/site/mail`; React submit uses POST `/api/v1/site/mail/test`; direct form `/sites/mail` compatibility covered server-side | covered in 2026-06-30 template-first reset slice |
| `/sites/massmail` | site admin all/project recipients | `#mailtoAll`, `#mailtoPrj`, `#project-list-wrap`, `#input-project`, `#select-project`, `#selected-projects`, `#write-email` | same whole-screen shell, active sidebar item, default checked radio, hidden project selector, project input/add button, and write button; `site-admin-massmail.e2e.ts` compares the stable legacy roots | whole-screen default all-recipient state | Selected-project lookup/mailto launch remains follow-up interaction work through `/api/v1/site/mail-list` | covered in 2026-06-30 template-first reset slice |
| `/sites/update` | no update, update available, and update check error | `site.update.currentVersion`, `site.update.isNotNecessary`, `site.update.isAvailable`, `site.update.download`, `site.update.error`, `<pre>` | same update branches; flat route compares `siteLayout.scala.html` plus `siteMngLayout.scala.html` roots | render no-update, available, and error branches | React `/api/v1/site/update`; download proxy/direct aliases | covered in 2026-06-30 template-first reset slice |
| `/sites/diagnostic` | no errors and errors | `site.diagnostic.errorNotFound`, `site.diagnostic.errorFound`, `<li><pre>` | same branch selectors and pre list; flat route compares `siteLayout.scala.html` plus `siteMngLayout.scala.html` roots | render no-error and error-list branches | React `/api/v1/site/diagnostics`; direct shell alias | covered in 2026-06-30 template-first reset slice |
| `/sites/data` | site admin | `.cu-desc .notice`, `site.data.warning*`, export button, file `input[name=data]`, submit input | same warning/export/import form selectors; `site-admin-data.e2e.ts` asserts the resolved warning copy, export link, and legacy multipart import form | whole-screen static data management state | Direct `/sites/export` and `/sites/import`; REST import/export contracts remain covered by server tests | covered in 2026-06-30 template-first reset slice |
| `/secret` | setup required | `.secret-wrap`, `.secret-box`, readonly `#loginId[value=admin]`, `#uname`, `#email`, `#password`, `#retypedPassword`, `app.welcome.submit` | same shell and inputs; `auth-public-entry-parity.e2e.ts` asserts the browser-visible setup form and payload; form intentionally lacks direct `action="/secret"` | fill setup form, submit to restart | React POST `/api/v1/auth/secret`; direct POST `/secret` is not app runtime mutation | covered |
| `/secret` | configured runtime | legacy default action after `isSecretInvalid=false`; setup form not an always-on normal page by `Global.onRequest` evidence and absent concrete route | direct GET `/secret` returns 404 after setup and SPA `/secret` renders `NotFoundPage` when `secretSetupRequired=false` | direct navigation after configured state | capabilities/API plus React guard | covered in Wave 3 |
| `/restart` | after setup | `.secret-wrap`, `.secret-box.txt-center`, `app.restart.welcome`, `app.restart.notice` | same shell and restart copy | direct navigation | React route only; legacy restart action evidence | covered |
| `/_import` | authenticated create/import | `#importGit`, `#url`, `#useRepoAuth`, `#repoAuth .row-fluid .span6`, labels `project.import.auth.userid` / `project.import.auth.userpw`, project-name placeholder `project.name.alert` | same shell, auth labels/layout, and project-name placeholder rendered by React | toggle repo auth, inspect labels/placeholders, submit empty URL | React POST `/api/v1/projects/import`; direct `/_import` clone route covered | covered in follow-up |
| `/migration` | authenticated operator page, GitHub migration disabled by default | `.yobi-migration`, `Yona to Github`, source/destination panels, milestone/issue/post buttons from Angular template, forbidden copy when `github.allow.migration=false` | disabled React shell preserves panels, disabled actions, and forbidden copy; direct route keeps the disabled/forbidden boundary | direct navigation only | no app-runtime GitHub API migration; external operator tooling remains outside frontend UI parity gate | covered |

## Notes

- Site-admin runtime i18n is covered by `site-admin-route-parity.spec.tsx`, including checks that default render does not expose raw `site.sidebar` or `site.update.isAvailable` keys. Some Playwright E2E fixtures intentionally assert fallback keys because they do not load the full i18n runtime; those fixture assertions are weaker than the static/runtime i18n spec and should not be treated as proof that raw keys appear in production.
- `/sites/data` is intentionally not in the shared legacy sidebar; legacy `siteMngLayout.scala.html` also omits a data nav item.
- `/migration` is not the same feature as `/_import`. Legacy `/_import` is Git URL clone into Yona; legacy `/migration` is outbound Yona-to-GitHub operator tooling. The default disabled/forbidden UI shell is covered for frontend parity, while actual GitHub API migration remains external operator tooling by `docs/provenance/github-migration-decision.md`.
