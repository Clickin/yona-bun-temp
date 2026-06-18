# User Workspace / Public Profile Provenance

## Legacy Sources

- `yona-original/conf/routes`: `GET /:user` maps to `UserApp.userInfo(user, daysAgo, selected)`.
- `yona-original/app/controllers/UserApp.java`: `userInfo` redirects organization names, clamps/stores `daysAgo`, returns not found for missing users, collects projects/issues/PRs, and filters project-backed rows through READ ACL.
- `yona-original/app/controllers/api/UserApi.java`: `statistics(loginId)` requires login, returns empty counts for missing users, and counts authored issues/postings, assigned issues, authored comments, and issue/comment votes; `users()` and `updateUserState(loginId)` provide site-manager legacy external active-user listing and state mutation with `JsonNode.findValue("state")`, `GUEST` support, and `SITE_ADMIN` rejection.
- `yona-original/app/models/Statistics.java`: legacy JSON field names are `issue`, `posting`, `assignedIssue`, `issueComment`, `postingComment`, `issueVoter`, and `issueCommentVoter`.
- `yona-original/app/views/user/view.scala.html`: user card, `#daysAgoBtn`, `Issues / Pull Requests / Projects` tabs, `common.twoColumnModeCheckboxArea()` (`#two-column-mode-checkbox`, `#two-column-mode`), `common.showSubtasksCheckbox()` (`.show-subtasks-li`, `#toggle-show-subtasks`), `.user-box`, `.user-info-box`, `.user-stream-box`, `.post-list-wrap`, and `.user-streams.all-projects` class anchors.
- `yona-original/app/views/user/partial_projectlist.scala.html`, `partial_issues.scala.html`, `partial_pullRequests.scala.html`: legacy list row class and link structure.

## Rust Implementation

- `GET /api/v1/users/:loginId/profile` returns a public profile projection for `/:user`.
- `GET /api/v1/users/:loginId/statistics` returns the legacy user statistics count fields over the app-runtime REST surface.
- App-owned legacy external user helpers under `/-_-api/v1/**` include user statistics, default-login-page mutation, site-admin active-user listing, and site-admin user-state mutation as inventoried in `docs/provenance/legacy-external-api.md`; broader user create/export issue-list compatibility remains migrator scope.
- `frontend/src/routes/$user/route.tsx` mounts the single-segment file route and redirects organization names to `/organizations/:name`.
- `frontend/src/routes/-workspace-views.tsx` renders `PublicUserProfilePage` with the legacy user card, tab/list anchors, two-column mode checkbox shell, and show-subtasks checkbox shell without inheriting private `/me` workspace controls.
- `crates/server/src/lib.rs` reuses existing workspace profile, issue, pull-request, and member-project projections, then filters project-backed rows by the current viewer's READ ACL. Anonymous viewers see public projects only.

## Route Module Diet Note

- 2026-06-19: REST workspace route registration for `/api/v1/workspace`, `/api/v1/workspace/default-landing-path`, `/api/v1/workspace/profile`, `/api/v1/workspace/password`, `/api/v1/workspace/recent-projects`, `/api/v1/workspace/files`, `/api/v1/workspace/emails/**`, `/api/v1/workspace/api-token/reset`, and `/api/v1/workspace/notifications` moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/workspace.rs`. This is a registration-only build/check diet change; behavior remains covered by `rest_contract::rest_workspace_routes_manage_overview_settings_and_recent_projects` and `assets_contract::workspace_files_list_returns_current_users_legacy_attachment_rows`.

## Status

- Closed: public `/:user` profile shell, two-column/show-subtasks checkbox anchors, visible member-project list, organization-name redirect, missing-user 404, public email redaction for other viewers, authenticated user statistics counts, and app-owned legacy external user statistics/default-login/admin-user helpers.
- Still open: global anonymous-access configuration toggle parity not already represented by project READ ACL, plus broad legacy external user create/export issue-list compatibility in the separate migrator/deferred scope.
