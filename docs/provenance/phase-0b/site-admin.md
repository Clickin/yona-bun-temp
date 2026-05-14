# Site Admin Provenance

Status: Phase 6K partial parity.

## Legacy Anchors

- `yona-original/conf/routes`: `/sites/userList`, `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/diagnostic`, `/sites/update`, and destructive admin mutation routes.
- `yona-original/app/controllers/SiteApp.java`: `@With(SiteManagerAuthAction.class)` site-admin gate, `userList(pageNum, query)` state/query dispatch, `projectList(filter, pageNum)` project-name search, `postList(pageNum)` recent-post paging, `issueList(pageNum)` default-OPEN state filtering, `update()` current/update-version rendering, `unwatchUpdate()` notification hiding, `writeMail()` SMTP config warning, and `sendMail()` test-mail delivery.
- `yona-original/app/views/site/siteMngLayout.scala.html`: `.site-breadcrumb-outer`, `.site-setting-wrap`, `.site-setting-nav`, and sidebar order.
- `yona-original/app/views/site/userList.scala.html`: `.title_area`, `.form-search`, `.nav-tabs`, `.listhead`, `.user-list-wrap`, row actions, and site-admin count badge.
- `yona-original/app/views/site/projectList.scala.html`: `.title_area`, `.form-search`, `.listhead`, `.project-list-wrap`, project links, and delete button `data-toggle="delete-project"` anchors.
- `yona-original/app/views/site/postList.scala.html`: `.post-list-wrap`, `.post-info-wrap`, `.post-meta-wrap`, `.post-project`, `.post-title`, and comment-count anchors.
- `yona-original/app/views/site/issueList.scala.html`: `.nav.nav-tabs`, `.post-list-wrap`, `.post-info-wrap`, `.post-meta-wrap`, `.post-project`, `.post-title`, and issue comment anchors.
- `yona-original/app/views/site/update.scala.html`: `.title_area`, current-version line, update-available download branch, no-update branch, and error branch.
- `yona-original/app/views/partial_update_notification.scala.html`: `site.update.notification.hide` button with `data-request-method="post"` and `data-request-uri`.
- `yona-original/app/views/site/mail.scala.html`: `.title_area`, alert branches, `#mailForm`, `form-horizontal`, `control-group`, `mail-btn-wrap`, and `site.mail.*` form anchors.

## Phase 6A/6B/6C/6D/6E/6F/6G/6H/6I/6J/6K Mapping

- `GET /api/v1/sites/users?state=&query=&pageNum=&pageSize=` lists users for site-admin sessions only.
- `DELETE /api/v1/sites/users/:userId` restores the legacy user-list delete action for site-admin sessions with CSRF checks and the only-project-manager guard.
- `GET /api/v1/sites/projects?filter=&pageNum=&pageSize=` lists projects for site-admin sessions only and preserves legacy `Project.findByName` name-filter semantics.
- `DELETE /api/v1/sites/projects/:projectId` restores the legacy project-list delete action for site-admin sessions with CSRF checks.
- `GET /api/v1/sites/posts?pageNum=&pageSize=` lists recent postings for site-admin sessions only, preserving legacy created-date descending order.
- `GET /api/v1/sites/issues?state=&pageNum=&pageSize=` lists issues for site-admin sessions only, preserving legacy `OPEN` default state, open/closed tab routing, and created-date descending order.
- `GET /api/v1/sites/diagnostics` returns the site-admin-only diagnostics result shape used by legacy `Diagnostic.checkAll()`.
- `GET /api/v1/sites/update` returns the site-admin-only update-page result shape with current version, optional update version/release URL, and watched state.
- `POST /api/v1/sites/update/unwatch` restores the legacy update notification hide action for site-admin sessions with CSRF checks.
- `GET /api/v1/sites/mail` returns the site-admin-only test-mail form state, including legacy SMTP config warning items and sender default.
- `POST /api/v1/sites/mail` restores the legacy test-mail action for site-admin sessions with CSRF checks and the existing integrations delivery path.
- `POST /api/v1/sites/users/:loginId/toggle-site-admin`, `/toggle-account-lock`, `/toggle-guest-mode`, and `/reset-password` restore the legacy user-row mutations for site-admin sessions with CSRF checks.
- `frontend/src/routes/sites/$pageName/route.tsx` restores `/sites/userList` with the legacy site settings sidebar, tabs, search form, dense list rows, and pagination summary.
- The same route restores `/sites/projectList` with the legacy site settings sidebar, project search form, dense project rows, and the project-delete confirmation modal.
- The same route restores `/sites/postList` with the legacy site settings sidebar, dense post rows, project links, post links, author metadata, and comment anchors.
- The same route restores `/sites/issueList` with the legacy site settings sidebar, open/closed tabs, dense issue rows, project links, issue links, author metadata, and comment anchors.
- The same route restores `/sites/diagnostic` with the legacy site settings sidebar, `.title_area`, diagnostics heading, no-error branch, and error-list `<pre>` rows.
- The same route restores `/sites/update` with the legacy site settings sidebar, `.title_area`, `site.update.isAvailable`, `site.update.download`, `site.update.currentVersion`, `site.update.isNotNecessary`, and `site.update.notification.hide` anchors.
- The same route restores `/sites/mail` with the legacy site settings sidebar, `.title_area`, `#mailForm`, `site.mail.notConfigured`, `site.mail.sended`, `site.mail.fail`, and `site.mail.*` field/button anchors.
- `frontend/src/api/site-admin.ts` normalizes omitted REST fields and exposes TanStack Query options.
- User-list role, account-lock, guest-mode, and reset-password controls now post through typed REST mutations. Reset password directly replaces the target password hash and shows the returned temporary password inline, matching `UserApp.resetUserPasswordBySiteManager`.
- User delete now uses the legacy `account-delete` confirmation modal, marks the user `deleted` instead of hard-deleting the row, scrubs password/email state, clears project memberships and assignee links, and refreshes the deleted-user tab after success.

## Remaining Gaps

- Mass mail (`/sites/massmail` and `/sites/mailList`) remains a separate recipient-expansion packet.
- Remote release tag discovery for update check remains deferred; Phase 6J restores the local page and hide action without network/JGit discovery.
- Data import/export remains deferred outside current app parity scope.

## Evidence

- `cargo test -p yona-rust-pilot-server --test site_admin_contract`
- `pnpm --dir frontend test src/api-query.spec.ts src/route-parity.spec.tsx -- --runInBand`
- `pnpm --dir frontend test:e2e -- tests/site-admin-user-list-parity.e2e.ts --workers=2`
