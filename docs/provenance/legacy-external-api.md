# Legacy External API Provenance

Status: provenance
Date: 2026-06-11

## Scope Decision

Legacy Yona exposes external compatibility routes under `/-_-api/v1/**` in
`yona-original/conf/routes`. Per `SPEC.md` FG-18, the Rust app server owns only
the implemented rows in the endpoint inventory below. Those rows are direct
runtime helpers with route tests and provenance. Everything else remains
migrator/export/import scope.

The first app-owned helpers were:

- `GET /-_-api/v1/hello`
- `GET /-_-api/v1/favoriteProjects` and `POST /-_-api/v1/favoriteProjects/:projectId`
- `GET /-_-api/v1/favoriteIssues` and `POST /-_-api/v1/favoriteIssues/:issueId`
- `GET /-_-api/v1/favoriteOrganizations` and `POST /-_-api/v1/favoriteOrganizations/:organizationId`
- `POST /-_-api/v1/translation`

Later parity slices added the other endpoint inventory rows marked implemented
below. Do not add broad or import/export-only legacy external API routes to the
Rust frontend/server app unless this inventory, SPEC, provenance, and focused
contract tests are updated together.

The migration-tool direction is fixed in
`docs/provenance/migration-tool-api-decision.md`: use existing legacy
`/-_-api/v1/**` endpoints only when reading old Yona instances, then import into
Rust through Rust-owned site-admin import or tool-local `yobi-data` formats.
Direct DB extraction can be an optional expert adapter later, not the default
contract.

## Legacy Sources

- Route table: `yona-original/conf/routes`, lines 40-90 for `/-_-api/v1/**`.
- Controllers: `yona-original/app/controllers/api/GlobalApi.java`, `UserApi.java`, `ProjectApi.java`, `IssueApi.java`, `BoardApi.java`, `MilestoneApi.java`, `WatcherApi.java`.
- Two legacy external routes call non-api controllers: `controllers.UserApp.users` and `controllers.UserApp.setDefaultLoginPage`.

## Endpoint Inventory

### Users / Auth Token

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api/v1/users?query=` | `conf/routes` -> `controllers.UserApp.users` | Members-page user mention/search helper. | Implemented in app server with legacy JSON Accept/referer gate and `[{info, loginId}]` shape. |
| `POST /-_-api/v1/users` | `UserApi.newUser()` | Site-admin JSON user creation from `users` array. | Migrator/deferred; not app-server scope. |
| `POST /-_-api/v1/users/token` | `UserApi.newToken()` | Validate id/password, set session, return `access_token`. | Implemented in app server with legacy password validation messages, fresh API token issuance, authenticated session cookie attachment, and token-auth reuse coverage. |
| `GET /-_-api/v1/user/issues?filter=&page=&pageNum=` | `UserApi.getIssuesByUser()` | Token-authored user issue export/list JSON. | Migrator/deferred; not app-server scope. |
| `GET /-_-api/v1/users/:user/statistics` | `UserApi.statistics()` | User activity count JSON. | Implemented in app server with legacy statistics fields and session/token auth. |
| `POST /-_-api/v1/user/defultLoginPage` | `controllers.UserApp.setDefaultLoginPage()` | Legacy typo-preserving default login page mutation. | Implemented in app server as an alias of the direct typo-preserving default-login-page mutation with legacy `{defaultLoginPage}` response. |
| `GET /-_-api/v1/admin/users` | `UserApi.users()` | Site-manager active user list JSON. | Implemented in app server with site-admin auth and legacy active-user JSON fields. |
| `PATCH /-_-api/v1/admin/users/:user` | `UserApi.updateUserState()` | Site-manager user state mutation. | Implemented in app server for `ACTIVE`/`LOCKED`/`DELETED` row-state updates with legacy `SITE_ADMIN` forbidden behavior. |

### Projects

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/exports` | `ProjectApi.exports()` | Project export JSON including metadata, members, labels, issues, posts, milestones. | Migrator/export scope. |
| `POST /-_-api/v1/owners/:owner/projects` | `ProjectApi.newProject()` | Site/admin import-style project creation with members and repository creation. | Migrator/import scope. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/labels` | `ProjectApi.newLabel()` | Bulk issue-label/category import. | Migrator/import scope. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/titleHeads?query=` | `ProjectApi.titleHeads()` | JSON title-head and label suggestion helper. | Implemented in app server with legacy JSON Accept gate and title-head/project-label result shape. |

### Issues / Comments

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/imports?postNumber=` | `IssueApi.imports()` | Convert board post to issue, moving comments and attachments. | Migrator/import scope. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues` | `IssueApi.newIssues()` | Bulk issue creation/import with author, assignee, labels, milestone, dates, optional notification. | Migrator/import scope. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number` | `IssueApi.getIssue()` | Token-authored issue export JSON with events. | Implemented in app server with legacy `{result}` issue payload, comments, and issue events. |
| `PUT /-_-api/v1/owners/:owner/projects/:projectName/issues/:number` | `IssueApi.updateIssue()` | Token-authored issue title/body/state/assignee update. | Implemented in app server for legacy title/body/state/assignee mutation with `{result}` issue payload. |
| `PATCH /-_-api/v1/owners/:owner/projects/:projectName/issues/:number` | `IssueApi.updateIssueState()` | Token-authored issue state update with event. | Implemented in app server with legacy state fallback and `{result}` payload. |
| `PATCH /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/content` | `IssueApi.updateIssueContent()` | Body-only edit with conflict detection. | Implemented in app server with legacy conflict JSON and `ProjectApi.getResult`-style payload. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments` | `IssueApi.newIssueComment()` | Issue comment creation via token or session/import payload. | Implemented in app server with legacy session `{status, location}` response and token `{result}` response. |
| `PUT /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId` | `IssueApi.updateIssueComment()` | Comment content update with conflict detection. | Implemented in app server with legacy `content`/`original` conflict contract and `{result}` comment payload. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers` | `IssueApi.commentNotiRecivers()` | Preview mandatory notification receivers for a comment. | Implemented in app server for issue receiver/watch/share/mention preview, parent-comment author/mention and same-parent sibling expansion, and legacy receiver user shape. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number` | `IssueApi.updateIssueLabel()` | Replace issue label set from label id array. | Implemented in app server with legacy label-id array request and `{id, labels}` response. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers?query=` | `IssueApi.findAssignableUsers()` | Select2 assignable-user search for an issue. | Implemented in app server with legacy array shape and JSON Accept gate. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/assignableUsers?query=` | `IssueApi.findAssignableUsersOfProject()` | Select2 assignable-user search for a project. | Implemented in app server with legacy array shape and JSON Accept gate. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees` | `IssueApi.updateAssginees()` | Legacy typo-preserving assignee mutation and notification. | Implemented in app server with legacy assignee-array request and `{assignee, issue}` payload. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer?query=` | `IssueApi.findSharerByloginIds()` | Resolve existing issue sharers by comma-separated login ids. | Implemented in app server with legacy user array shape and JSON Accept gate. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers?query=` | `IssueApi.findSharableUsers()` | User/project sharer search. | Implemented in app server with legacy user/project array shape and JSON Accept gate. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share` | `IssueApi.updateSharer()` | Add/delete issue sharer and send notification. | Implemented in app server with legacy user/project add/delete request and `{action, sharer}` payload. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight` | `IssueApi.upvoteWeight()` | Increment issue weight. | Implemented in app server with legacy `{weight}` response and permission-denied JSON. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight` | `IssueApi.downvoteWeight()` | Decrement issue weight. | Implemented in app server with legacy `{weight}` response and permission-denied JSON. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange` | `IssueApi.detectChange()` | Poll issue body/comment changes and checksum. | Implemented in app server for SHA-1 body checksum/comment count polling with legacy JSON fields; `issueUpdateDate` uses a numeric fallback until raw issue timestamps are exposed. |
| `POST /-_-api/v1/translation` | `IssueApi.translate()` | Translate issue/post/comment Markdown source; return 412 when unconfigured. | Implemented in app server as direct helper. |

### Board / Posts / Comments

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/posts` | `BoardApi.newPostings()` | Bulk board post creation/import. | Implemented in app server for legacy `posts[]` request, requested post number, existing-user author lookup, legacy `createdAt`/`updatedAt` restore, and created-array response; payload author auto-create and temporary upload binding remain migrator/import gaps. |
| `PATCH /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content` | `BoardApi.updatePostingContent()` | Body-only edit with conflict detection. | Implemented in app server with legacy `content`/`original` conflict contract and `ProjectApi.getResult`-style board-post payload. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments` | `BoardApi.newPostingComment()` | Board comment creation/import. | Implemented in app server with legacy `body` request, legacy `createdAt` restore, and `{status, location}` created response; payload author auto-create and temporary upload binding remain migrator/import gaps. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number` | `BoardApi.updatePostLabel()` | Replace board post label set from label id array. | Implemented in app server with legacy label-id array request and `{id, labels}` response. |

### Milestones

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/milestones` | `MilestoneApi.newMilestone()` | Bulk milestone creation/import with title, description, due date, state. | Implemented in app server with legacy `milestones[]` request, duplicate-title item payload, and `201 Created` array response. |

### Watchers / Favorites

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers?type=issues|posts` | `WatcherApi.getWatchers()` | Return up to 100 watcher names/URLs plus total count. | Implemented in app server for legacy issue/post watcher JSON shape. |
| `GET /-_-api/v1/favoriteProjects` | `UserApi.getFoveriteProjects()` | Legacy misspelled favorite project list JSON. | Implemented in app server as direct helper. |
| `POST /-_-api/v1/favoriteProjects/:projectId` | `UserApi.toggleFoveriteProject()` | Toggle favorite project; return id and `favored`. | Implemented in app server as direct helper. |
| `GET /-_-api/v1/favoriteOrganizations` | `UserApi.getFoveriteOrganizations()` | Legacy misspelled favorite organization list JSON. | Implemented in app server as direct helper. |
| `POST /-_-api/v1/favoriteOrganizations/:organizationId` | `UserApi.toggleFoveriteOrganization()` | Toggle favorite organization; return id and `favored`. | Implemented in app server as direct helper. |
| `GET /-_-api/v1/favoriteIssues` | `UserApi.getFoveriteIssues()` | Legacy misspelled favorite issue list JSON. | Implemented in app server as direct helper. |
| `POST /-_-api/v1/favoriteIssues/:issueId` | `UserApi.toggleFoveriteIssue()` | Toggle favorite issue; return id, `favored`, and message. | Implemented in app server as direct helper. |

### Other

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api` | `controllers.Application.index()` | Legacy API index fallback to app index. | Not part of app-server external compatibility commitment. |
| `GET /-_-api/v1/` | `controllers.Application.index()` | Legacy API v1 root fallback to app index. | Not part of app-server external compatibility commitment. |
| `GET /-_-api/v1/hello` | `GlobalApi.hello()` | Health JSON `{"message":"I'm alive!","ok":true}`. | Implemented in app server as direct helper. |

## Follow-up Worker Split

These are migration-tool descriptor follow-ups. They must not be implemented in
the app server, and each worker owns disjoint migration files and matching
tests.

| Worker | Write scope | Test scope | Responsibility |
| --- | --- | --- | --- |
| Users/auth token | `crates/migration/src/legacy_external/users.rs` | `crates/migration/tests/legacy_external_users.rs` | User list/create/token/user issues/statistics/admin-user state import/export behavior. |
| Projects/export/import | `crates/migration/src/legacy_external/projects.rs` | `crates/migration/tests/legacy_external_projects.rs` | Project export, project create/import, labels, title-head helper if required by migrator flows. |
| Issues/comments | `crates/migration/src/legacy_external/issues.rs` | `crates/migration/tests/legacy_external_issues.rs` | Issue bulk import/export, comments, labels, assignee/share/weight/change-detection compatibility needed by migration. |
| Board/posts/comments | `crates/migration/src/legacy_external/boards.rs` | `crates/migration/tests/legacy_external_boards.rs` | Board post/comment import and post-label compatibility. |
| Milestones | `crates/migration/src/legacy_external/milestones.rs` | `crates/migration/tests/legacy_external_milestones.rs` | Milestone import compatibility. |
| Watchers/favorites boundary | `crates/migration/src/legacy_external/watchers.rs` | `crates/migration/tests/legacy_external_watchers.rs` | Watcher export compatibility only; favorites stay app-owned direct helpers unless a migrator snapshot needs read-only projection. |
| Module wiring | `crates/migration/src/legacy_external/mod.rs` | `crates/migration/tests/legacy_external_mod.rs` | Shared request/response fixtures and module registration for migration tooling, without app-server route mounting. |

## Consistency Notes

- `Foverite`, `Assginees`, `commentNotiRecivers`, and `defultLoginPage` are legacy spellings in source and route/action names; provenance preserves them only when naming legacy references.
- Implemented app-server compatibility is limited to the rows marked implemented in this inventory. Any broader route listed above as migrator/deferred must remain outside the Rust app-facing `/api/v1` surface and outside broad Rust `/-_-api/v1/**` runtime compatibility.
- Existing React/runtime behavior should continue using canonical `/api/v1/**` except for the direct legacy helper calls explicitly allowed by SPEC.
