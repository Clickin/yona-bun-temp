# Site Admin Provenance

Status: Phase 6A partial parity.

## Legacy Anchors

- `yona-original/conf/routes`: `/sites/userList`, `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/diagnostic`, `/sites/update`, and destructive admin mutation routes.
- `yona-original/app/controllers/SiteApp.java`: `@With(SiteManagerAuthAction.class)` site-admin gate and `userList(pageNum, query)` state/query dispatch.
- `yona-original/app/views/site/siteMngLayout.scala.html`: `.site-breadcrumb-outer`, `.site-setting-wrap`, `.site-setting-nav`, and sidebar order.
- `yona-original/app/views/site/userList.scala.html`: `.title_area`, `.form-search`, `.nav-tabs`, `.listhead`, `.user-list-wrap`, row actions, and site-admin count badge.

## Phase 6A Mapping

- `GET /api/v1/sites/users?state=&query=&pageNum=&pageSize=` lists users for site-admin sessions only.
- `frontend/src/routes/sites/$pageName/route.tsx` restores `/sites/userList` with the legacy site settings sidebar, tabs, search form, dense list rows, and pagination summary.
- `frontend/src/api/site-admin.ts` normalizes omitted REST fields and exposes TanStack Query options.
- Mutation controls render disabled because `toggleSiteAdminRole`, `toggleAccountLock`, `toggleGuestMode`, reset password, and delete are not in this read-surface slice.

## Remaining Gaps

- Project/post/issue admin lists.
- Site-admin role toggle, account lock/unlock, guest toggle, reset password, user delete, and project delete.
- SMTP test mail, mass mail, diagnostics, update check, and unwatchUpdate.
- Data import/export remains deferred outside current app parity scope.

## Evidence

- `cargo test -p yona-rust-pilot-server --test site_admin_contract`
- `pnpm --dir frontend test src/route-parity.spec.tsx -- --runInBand`
- `pnpm --dir frontend test:e2e -- tests/site-admin-user-list-parity.e2e.ts --workers=2`
