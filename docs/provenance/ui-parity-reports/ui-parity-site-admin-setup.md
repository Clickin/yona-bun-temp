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
- `frontend/src/routes/migration/route.tsx`
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

| status | count |
| --- | ---: |
| covered | 15 |
| gap | 0 |
| deviation | 0 |
| deferred | 1 |
| not-applicable | 1 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Table

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/sites/**` admin-only state | `conf/routes:152-176`, `SiteApp` routes; `siteMngLayout.scala.html` is only for site settings | `frontend/src/routes/sites/$pageName/route.tsx` uses `useRequireAuthenticatedRoute`, `currentSession.isSiteAdmin`, `ForbiddenPage`; `site_admin_contract` checks unauthenticated/member forbidden for REST/direct routes | covered | none |
| `/sites/**` sidebar/update badge | `siteMngLayout.scala.html` renders `site.sidebar.*`, active `li`, and `notification-badge` on update | `SiteAdminSidebar`, `siteUpdateQueryOptions`, `site-admin-route-parity.spec.tsx`, visual/HTML coverage artifacts | covered | none |
| `/sites/userList` | `userList.scala.html`: state tabs, search, user rows, guest/lock/site-admin toggles, reset password alert, delete modal | `SiteAdminUserListPage`, `SiteUserRow`, `SiteDeleteUserModal`, `frontend/tests/site-admin-user-list-parity.e2e.ts`, `site_admin_user_list_and_toggles_follow_legacy_state_buckets` | covered | none |
| `/sites/projectList` | `projectList.scala.html`: search, project rows, created date, delete modal | `SiteAdminProjectListPage`, `SiteDeleteProjectModal`, `frontend/tests/site-admin-project-list-parity.e2e.ts`, `site_admin_project_list_and_delete_follow_legacy_surface` | covered | none |
| `/sites/postList` | `postList.scala.html`: read-only site-wide post list with project/author/comment links | `SiteAdminPostListPage`, `SitePostRow`, `frontend/tests/site-admin-post-list-parity.e2e.ts`, `site_admin_post_list_follows_legacy_read_only_surface` | covered | none |
| `/sites/issueList` | `issueList.scala.html`: open/closed tabs and read-only issue rows | `SiteAdminIssueListPage`, `SiteIssueTabs`, `frontend/tests/site-admin-issue-list-parity.e2e.ts`, `site_admin_issue_list_follows_legacy_state_tabs` | covered | none |
| `/sites/mail` | `mail.scala.html`: `#mailForm`, not-configured alert, sent alert, `site.mail.*` labels/placeholders | `SiteAdminMailPage`, `/api/v1/site/mail`, `/api/v1/site/mail/test`, direct `/sites/mail`, `frontend/tests/site-admin-mail-parity.e2e.ts`, `site_admin_mail_send_and_recipient_lookup_follow_legacy_surface` | covered | none |
| `/sites/massmail` | `massMail.scala.html`, `yobi.site.MassMail.js`: `#mailtoAll`, `#mailtoPrj`, `#input-project`, `#select-project`, selected project labels, `#write-email`, mailto launch | `SiteAdminMassMailPage`, `/api/v1/site/mail-list`, direct `/sites/mailList`, `frontend/tests/site-admin-mail-parity.e2e.ts` covers all and selected-project lookup | covered | none |
| `/sites/update` | `update.scala.html`: update available/current/no-update/error branches and download link; sidebar badge | `SiteAdminUpdatePage`, `/api/v1/site/update`, `/sites/update/download-file`, update helper tests, `frontend/tests/site-admin-update-parity.e2e.ts`, update metadata/download contract tests | covered | none |
| `/sites/diagnostic` | `diagnostic.scala.html`: no-error key or error count plus `<pre>` list | `SiteAdminDiagnosticPage`, `/api/v1/site/diagnostics`, `frontend/tests/site-admin-diagnostic-parity.e2e.ts`, `site_admin_diagnostics_are_site_admin_only_and_report_legacy_error_list` | covered | none |
| `/sites/data`, `/sites/export`, `/sites/import` | `data.scala.html`: warnings, export button, multipart file import submit | `SiteAdminDataPage`, `importSiteDataRest`, direct `/sites/export` and `/sites/import`, extensive `site_admin_contract` export/import/dry-run/rollback tests | covered | none |
| `/sites/:unknown` | Legacy has no catch-all site route beyond concrete `conf/routes` entries | `SiteAdminRouteComponent` returns `NotFoundPage` for unknown page names | not-applicable | none |
| `/secret` setup-required | `Global.java` intercepts all requests when default secret is invalid; `secret.scala.html` form has `.secret-wrap`, `.secret-box`, readonly `loginId=admin`, welcome/user/password labels | `frontend/src/routes/secret/route.tsx` renders same shell and submits REST `/api/v1/auth/secret`; `auth_workspace_contract::secret_admin_setup_rest_updates_legacy_default_admin_and_form_post_is_not_a_mutation`; route/visual coverage | covered | none |
| `/secret` configured state | Legacy `Global.onRequest` only enters `getConfigSecretAction()` when `isSecretInvalid`; normal configured runtime falls through to default routing and there is no concrete `/secret` route | `/api/v1/auth/capabilities` now exposes `secretSetupRequired`; direct GET `/secret` returns 404 after setup, REST setup retry returns 404, and the React `/secret` route renders `NotFoundPage` instead of the setup form when configured | covered in Wave 3 | `crates/server/src/routes/auth.rs`, `frontend/src/routes/secret/route.tsx`, `crates/server/tests/auth_workspace_contract.rs`, `frontend/src/route-parity.spec.tsx` |
| `/restart` | `Global.java` returns restart action after secret update; `restart.scala.html` uses `.secret-wrap`, `.secret-box`, `app.restart.*` copy | `frontend/src/routes/restart/route.tsx`, `frontend/src/route-parity.spec.tsx`, visual sweep entries for `/restart` | covered | none |
| `/_import` Git project import | `project/importing.scala.html`: `#importGit`, `#url`, `#useRepoAuth`, `#repoAuth` with `project.import.auth.userid`/`project.import.auth.userpw` labels and `project.import.auth.userid.desc` placeholder, `project-name` placeholder `project.name.alert`, menu checkboxes | `ProjectImportPage` preserves route/form shell and REST `importProjectRest`, and now renders the legacy `#repoAuth .row-fluid` / `dl.span6` labels/placeholders plus `project.name.alert` placeholder. | covered in follow-up | `frontend/src/routes/-project-views.tsx`, `frontend/src/project-import-parity.spec.tsx` |
| `/migration` | `conf/routes:19-26`, `migration/home.scala.html`, `yona.Migration.js`; legacy UI is outbound "Yona to Github" and gated by `github.allow.migration=false` by default | `frontend/src/routes/migration/route.tsx` renders disabled shell with source/destination panels; `docs/provenance/github-migration-decision.md` and `migration-tool-api-decision.md` classify as deferred/operator scope | deferred | `docs/provenance/github-migration-decision.md`, `crates/migration`, external operator tooling if parent reopens |

## Playwright Scenario Table

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/sites/userList` | site admin, active users | `.site-setting-nav li.active`, `.user-list-wrap`, `site.userList.*`, `data-toggle="account-delete"`, `data-toggle="reset-password"` | same classes/selectors; reset success alert with `user.newPassword`; delete modal `#alertDeletionWrap` | search, tabs, guest/lock/site-admin toggle, reset password, delete open/cancel/confirm | React calls `/api/v1/site/users*`; legacy direct mutation URIs remain data attributes/aliases | covered |
| `/sites/userList` | authenticated non-admin | legacy site manager route forbidden | `ForbiddenPage href="/sites/userList"` | direct navigation | REST/direct site routes return 403 in contract tests | covered |
| `/sites/projectList` | site admin | `.project-list-wrap`, `site.project.filter`, `data-toggle="delete-project"`, `#projectDeleteBtn` | same list/search/modal selectors and API delete URI | filter submit, delete modal open/cancel/confirm | React `/api/v1/site/projects`; direct `/sites/project/delete/:id` alias | covered |
| `/sites/postList` | site admin populated list | `.post-list-wrap`, `.post-project`, `.post-title`, author avatar, comments link | same row/link classes | read-only navigation links | React `/api/v1/site/posts` | covered |
| `/sites/issueList` | site admin open/closed tabs | `.nav.nav-tabs`, `issue.state.open`, `issue.state.closed`, `.post-list-wrap` | same tab/list shell | switch state tabs | React `/api/v1/site/issues?state=` | covered |
| `/sites/mail` | site admin, mail not configured and send success | `#mailForm`, `.alert.alert-error`, `site.mail.notConfigured`, `.alert.alert-success` | same form/alerts; sender/from/to/subject/body fields | fill mail fields, submit, sent alert | React POST `/api/v1/site/mail/test`; direct form `/sites/mail` compatibility covered server-side | covered |
| `/sites/massmail` | site admin all/project recipients | `#mailtoAll`, `#mailtoPrj`, `#project-list-wrap`, `#selected-projects .label`, `#write-email` | same radio/list/chip/write selectors and `#mailto-link` proof | all recipients, project mode, add typed project, resolve mailto | React POST `/api/v1/site/mail-list`; direct `/sites/mailList` alias | covered |
| `/sites/update` | no update and update available | `site.update.currentVersion`, `site.update.isNotNecessary`, `site.update.isAvailable`, `site.update.download`, `notification-badge` | same update branches; download link `/sites/update/download-file` | render no-update and available branches | React `/api/v1/site/update`; download proxy/direct aliases | covered |
| `/sites/diagnostic` | no errors and errors | `site.diagnostic.errorNotFound`, `site.diagnostic.errorFound`, `<li><pre>` | same branch selectors and pre list | render no-error and error-list branches | React `/api/v1/site/diagnostics`; direct shell alias | covered |
| `/sites/data` | site admin | `.cu-desc .notice`, `site.data.warning*`, export button, file `input[name=data]`, submit input | same warning/export/import form selectors | export click; file import submit | Export direct `/sites/export`; React import POST `/api/v1/site/import` from file payload; direct multipart `/sites/import` covered | covered |
| `/secret` | setup required | `.secret-wrap`, `.secret-box`, readonly `#loginId[value=admin]`, `#uname`, `#email`, `#password`, `#retypedPassword`, `app.welcome.submit` | same shell and inputs; form intentionally lacks direct `action="/secret"` | fill setup form, submit to restart | React POST `/api/v1/auth/secret`; direct POST `/secret` is not app runtime mutation | covered |
| `/secret` | configured runtime | legacy default action after `isSecretInvalid=false`; setup form not an always-on normal page by `Global.onRequest` evidence and absent concrete route | direct GET `/secret` returns 404 after setup and SPA `/secret` renders `NotFoundPage` when `secretSetupRequired=false` | direct navigation after configured state | capabilities/API plus React guard | covered in Wave 3 |
| `/restart` | after setup | `.secret-wrap`, `.secret-box.txt-center`, `app.restart.welcome`, `app.restart.notice` | same shell and restart copy | direct navigation | React route only; legacy restart action evidence | covered |
| `/_import` | authenticated create/import | `#importGit`, `#url`, `#useRepoAuth`, `#repoAuth .row-fluid .span6`, labels `project.import.auth.userid` / `project.import.auth.userpw`, project-name placeholder `project.name.alert` | same shell, auth labels/layout, and project-name placeholder rendered by React | toggle repo auth, inspect labels/placeholders, submit empty URL | React POST `/api/v1/projects/import`; direct `/_import` clone route covered | covered in follow-up |
| `/migration` | authenticated operator page, GitHub migration disabled/deferred | `.yobi-migration`, `Yona to Github`, source/destination panels, milestone/issue/post buttons from Angular template | disabled React shell preserves panels and disabled actions | direct navigation only | no app-runtime GitHub API migration; operator/deferred scope | deferred |

## Notes

- Site-admin runtime i18n is covered by `site-admin-route-parity.spec.tsx`, including checks that default render does not expose raw `site.sidebar` or `site.update.isAvailable` keys. Some Playwright E2E fixtures intentionally assert fallback keys because they do not load the full i18n runtime; those fixture assertions are weaker than the static/runtime i18n spec and should not be treated as proof that raw keys appear in production.
- `/sites/data` is intentionally not in the shared legacy sidebar; legacy `siteMngLayout.scala.html` also omits a data nav item.
- `/migration` is not the same feature as `/_import`. Legacy `/_import` is Git URL clone into Yona; legacy `/migration` is outbound Yona-to-GitHub operator tooling and remains deferred by the existing parent decision.
