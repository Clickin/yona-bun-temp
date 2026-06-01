# User Workspace / Public Profile Provenance

## Legacy Sources

- `yona-original/conf/routes`: `GET /:user` maps to `UserApp.userInfo(user, daysAgo, selected)`.
- `yona-original/app/controllers/UserApp.java`: `userInfo` redirects organization names, clamps/stores `daysAgo`, returns not found for missing users, collects projects/issues/PRs, and filters project-backed rows through READ ACL.
- `yona-original/app/controllers/api/UserApi.java`: `statistics(loginId)` requires login, returns empty counts for missing users, and counts authored issues/postings, assigned issues, authored comments, and issue/comment votes.
- `yona-original/app/models/Statistics.java`: legacy JSON field names are `issue`, `posting`, `assignedIssue`, `issueComment`, `postingComment`, `issueVoter`, and `issueCommentVoter`.
- `yona-original/app/views/user/view.scala.html`: user card, `#daysAgoBtn`, `Issues / Pull Requests / Projects` tabs, `common.twoColumnModeCheckboxArea()` (`#two-column-mode-checkbox`, `#two-column-mode`), `common.showSubtasksCheckbox()` (`.show-subtasks-li`, `#toggle-show-subtasks`), `.user-box`, `.user-info-box`, `.user-stream-box`, `.post-list-wrap`, and `.user-streams.all-projects` class anchors.
- `yona-original/app/views/user/partial_projectlist.scala.html`, `partial_issues.scala.html`, `partial_pullRequests.scala.html`: legacy list row class and link structure.

## Rust Implementation

- `GET /api/v1/users/:loginId/profile` returns a public profile projection for `/:user`.
- `GET /api/v1/users/:loginId/statistics` returns the legacy user statistics count fields over the app-runtime REST surface and keeps `/-_-api/v1/**` external compatibility out of the app server.
- `frontend/src/routes/$user/route.tsx` mounts the single-segment file route and redirects organization names to `/organizations/:name`.
- `frontend/src/routes/-workspace-views.tsx` renders `PublicUserProfilePage` with the legacy user card, tab/list anchors, two-column mode checkbox shell, and show-subtasks checkbox shell without inheriting private `/me` workspace controls.
- `crates/server/src/lib.rs` reuses existing workspace profile, issue, pull-request, and member-project projections, then filters project-backed rows by the current viewer's READ ACL. Anonymous viewers see public projects only.

## Status

- Closed: public `/:user` profile shell, two-column/show-subtasks checkbox anchors, visible member-project list, organization-name redirect, missing-user 404, public email redaction for other viewers, and authenticated user statistics counts.
- Still open: global anonymous-access configuration toggle parity not already represented by project READ ACL, plus legacy external `/-_-api/v1/**` user API compatibility in the separate migrator/deferred scope.
