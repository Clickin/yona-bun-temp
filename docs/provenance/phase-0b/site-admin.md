# Site Admin Provenance

Status: Phase 6G partial parity.

## Legacy Anchors

- `yona-original/conf/routes`: `/sites/userList`, `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/diagnostic`, `/sites/update`, and destructive admin mutation routes.
- `yona-original/app/controllers/SiteApp.java`: `@With(SiteManagerAuthAction.class)` site-admin gate, `userList(pageNum, query)` state/query dispatch, `projectList(filter, pageNum)` project-name search, `postList(pageNum)` recent-post paging, and `issueList(pageNum)` default-OPEN state filtering.
- `yona-original/app/views/site/siteMngLayout.scala.html`: `.site-breadcrumb-outer`, `.site-setting-wrap`, `.site-setting-nav`, and sidebar order.
- `yona-original/app/views/site/userList.scala.html`: `.title_area`, `.form-search`, `.nav-tabs`, `.listhead`, `.user-list-wrap`, row actions, and site-admin count badge.
- `yona-original/app/views/site/projectList.scala.html`: `.title_area`, `.form-search`, `.listhead`, `.project-list-wrap`, project links, and delete button `data-toggle="delete-project"` anchors.
- `yona-original/app/views/site/postList.scala.html`: `.post-list-wrap`, `.post-info-wrap`, `.post-meta-wrap`, `.post-project`, `.post-title`, and comment-count anchors.
- `yona-original/app/views/site/issueList.scala.html`: `.nav.nav-tabs`, `.post-list-wrap`, `.post-info-wrap`, `.post-meta-wrap`, `.post-project`, `.post-title`, and issue comment anchors.

## Phase 6A/6B/6C/6D/6E/6F/6G Mapping

- `GET /api/v1/sites/users?state=&query=&pageNum=&pageSize=` lists users for site-admin sessions only.
- `GET /api/v1/sites/projects?filter=&pageNum=&pageSize=` lists projects for site-admin sessions only and preserves legacy `Project.findByName` name-filter semantics.
- `DELETE /api/v1/sites/projects/:projectId` restores the legacy project-list delete action for site-admin sessions with CSRF checks.
- `GET /api/v1/sites/posts?pageNum=&pageSize=` lists recent postings for site-admin sessions only, preserving legacy created-date descending order.
- `GET /api/v1/sites/issues?state=&pageNum=&pageSize=` lists issues for site-admin sessions only, preserving legacy `OPEN` default state, open/closed tab routing, and created-date descending order.
- `POST /api/v1/sites/users/:loginId/toggle-site-admin`, `/toggle-account-lock`, `/toggle-guest-mode`, and `/reset-password` restore the legacy user-row mutations for site-admin sessions with CSRF checks.
- `frontend/src/routes/sites/$pageName/route.tsx` restores `/sites/userList` with the legacy site settings sidebar, tabs, search form, dense list rows, and pagination summary.
- The same route restores `/sites/projectList` with the legacy site settings sidebar, project search form, dense project rows, and the project-delete confirmation modal.
- The same route restores `/sites/postList` with the legacy site settings sidebar, dense post rows, project links, post links, author metadata, and comment anchors.
- The same route restores `/sites/issueList` with the legacy site settings sidebar, open/closed tabs, dense issue rows, project links, issue links, author metadata, and comment anchors.
- `frontend/src/api/site-admin.ts` normalizes omitted REST fields and exposes TanStack Query options.
- User-list role, account-lock, guest-mode, and reset-password controls now post through typed REST mutations. Reset password directly replaces the target password hash and shows the returned temporary password inline, matching `UserApp.resetUserPasswordBySiteManager`.
- User delete still renders disabled because its legacy only-manager guard is not implemented yet.

## Remaining Gaps

- User delete.
- SMTP test mail, mass mail, diagnostics, update check, and unwatchUpdate.
- Data import/export remains deferred outside current app parity scope.

## Evidence

- `cargo test -p yona-rust-pilot-server --test site_admin_contract`
- `pnpm --dir frontend test src/api-query.spec.ts src/route-parity.spec.tsx -- --runInBand`
- `pnpm --dir frontend test:e2e -- tests/site-admin-user-list-parity.e2e.ts --workers=2`
