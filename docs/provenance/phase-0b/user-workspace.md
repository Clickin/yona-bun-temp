# User Workspace / Public Profile Provenance

## Legacy Sources

- `yona-original/conf/routes`: `GET /:user` maps to `UserApp.userInfo(user, daysAgo, selected)`.
- `yona-original/app/controllers/UserApp.java`: `userInfo` redirects organization names, clamps/stores `daysAgo`, returns not found for missing users, collects projects/issues/PRs, and filters project-backed rows through READ ACL.
- `yona-original/app/views/user/view.scala.html`: user card, `#daysAgoBtn`, `Issues / Pull Requests / Projects` tabs, `.user-box`, `.user-info-box`, `.user-stream-box`, `.post-list-wrap`, and `.user-streams.all-projects` class anchors.
- `yona-original/app/views/user/partial_projectlist.scala.html`, `partial_issues.scala.html`, `partial_pullRequests.scala.html`: legacy list row class and link structure.

## Rust Implementation

- `GET /api/v1/users/:loginId/profile` returns a public profile projection for `/:user`.
- `frontend/src/routes/$user/route.tsx` mounts the single-segment file route and redirects organization names to `/organizations/:name`.
- `frontend/src/routes/-workspace-views.tsx` renders `PublicUserProfilePage` with the legacy user card and tab/list anchors without inheriting private `/me` workspace controls.
- `crates/server/src/lib.rs` reuses existing workspace profile, issue, pull-request, and member-project projections, then filters project-backed rows by the current viewer's READ ACL. Anonymous viewers see public projects only.

## Status

- Closed: public `/:user` profile shell, visible member-project list, organization-name redirect, missing-user 404, and public email redaction for other viewers.
- Still open: full user activity/statistics semantics beyond the bounded visible issue/PR/project lists, and any global anonymous-access configuration toggle parity not already represented by project READ ACL.
