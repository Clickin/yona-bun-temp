# Legacy External API Provenance

Status: provenance
Date: 2026-06-11

## URI Migration Deviation (2026-08-23)

`/-_-api`는 REST 관례에 맞지 않는다는 결정으로, app-owned implemented rows의
경로가 `/api/v1` RESTful 철자로 **clean cutover** 대체되었다. 구 경로의 alias,
redirect, deprecation shim은 존재하지 않는다. legacy route(이 문서 인벤토리와
`yona-original/conf/routes`)는 그대로 legacy 참조이고, Rust route만 아래
매핑으로 바뀌었다. 요청/응답 shape·auth·status 코드는 불변이다.

전체 매핑 테이블은 커밋 `585c8c857` 이후 세션의 restful-uri-mapping 기록과
`scripts/differential/scenarios/*.mjs`의 translateYoram 리터럴이 1차 근거다.
주요 대응: `/-_-api/v1/hello`→`/api/v1/hello`, `/-_-api/v1/users?query=`→
`/api/v1/users/directory`, `POST /-_-api/v1/users/token`→`POST /api/v1/auth/token`,
`user/defultLoginPage`→`/api/v1/user/default-login-page`(오타 수정),
`favorite{Projects,Issues,Organizations}`→`/api/v1/user/favorites/{projects|issues|organizations}`,
`issuelabel/{n}`→`issues/{n}/labels`, `{up,down}voteWeight`→`weight/{up,downvote}`,
`share`/`findSharer`/`sharableUsers`→`sharers*`, `commentNotiReceivers`→
`comments/notification-receivers`, `postlabel/{n}`→`posts/{n}/labels`,
`titleHeads`→`title-heads`. Migrator-scope rows(exports, issues/imports, bulk
issue/project import)는 app route로 추가되지 않았다(아래 인벤토리 유지).

## Scope Decision

Legacy Yona exposes external compatibility routes under `/-_-api/v1/**` in
`yona-original/conf/routes`. Per `SPEC.md` FG-18, the Rust app server owns only
the implemented rows in the endpoint inventory below. Those rows are direct
runtime helpers with route tests and provenance. Everything else remains
migrator/export/import scope.

The first app-owned helpers were:

- `GET /-_-api` and `GET /-_-api/v1/`
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

The legacy `/migration` GitHub feature is not part of this `/-_-api/v1/**`
inventory. It is an outbound Yona-to-GitHub migration tool, documented in
`docs/provenance/github-migration-decision.md`, and must remain separate from
Rust app-runtime compatibility.

## Search Boundary Decision

P3-C external search API boundary was retired as not applicable on 2026-06-21.
The legacy search controller routes are page/application routes, not external
compatibility routes:

- `GET /search` -> `controllers.SearchApp.searchInAll()`
- `GET /organizations/:organizationName/search` -> `controllers.SearchApp.searchInAGroup(...)`
- `GET /:user/:project/search` -> `controllers.SearchApp.searchInAProject(...)`

The `/-_-api/v1/**` block in `yona-original/conf/routes` has no search route,
and `yona-original/app/controllers/api/` has no `SearchApi` controller. The Rust
app search boundary therefore remains the canonical `/api/v1` app surface only:
`/api/v1/search`, `/api/v1/projects/:owner/:project/search`, and
`/api/v1/organizations/:organization/search`. Do not add
`crates/migration/src/legacy_external` descriptors or app-server routes for a
non-existent legacy external search API.

## P1-B Closeout Re-audit

Re-audit on 2026-06-21 found no remaining descriptor-only legacy external
groups that justify new executable adapter depth. The audited source set is the
`/-_-api/v1/**` route block in `yona-original/conf/routes`, the corresponding
legacy controllers listed below, and the 47-row
`crates/migration/src/legacy_external/mod.rs` descriptor inventory. The
registry has zero `MigratorDeferred` rows; the four broad migrator-owned rows
(`ProjectApi.exports`, `ProjectApi.newProject`, `IssueApi.imports`, and
`IssueApi.newIssues`) already have bounded parser/normalizer coverage, and the
recent users/projects/issues/boards/milestones/watchers/favorites slices cover
the app-owned helper payloads with deterministic migration/operator-tool value.

The rows left as sample/metadata-only are intentionally narrow:

- `GET /-_-api/v1/users?query=` returns `loginId` plus an HTML `info`
  presentation string for the members-page mention helper. Migration tooling has
  no current need to parse that HTML presentation payload.
- `GET /-_-api`, `GET /-_-api/v1/`, and `GET /-_-api/v1/hello` are app
  index/health helpers. Their payloads are already direct runtime compatibility
  evidence and do not carry legacy migration data.

Therefore P1-B is closed for the current migration-tool scope. Future adapter
depth requires a concrete migration/operator replay flow and must keep app-owned
helper rows classified as app-owned without mounting broad runtime
`/-_-api/v1/**` routes.

## Legacy Sources

- Route table: `yona-original/conf/routes`, lines 40-90 for `/-_-api/v1/**`.
- Controllers: `yona-original/app/controllers/api/GlobalApi.java`, `UserApi.java`, `ProjectApi.java`, `IssueApi.java`, `BoardApi.java`, `MilestoneApi.java`, `WatcherApi.java`.
- Two legacy external routes call non-api controllers: `controllers.UserApp.users` and `controllers.UserApp.setDefaultLoginPage`.

## Endpoint Inventory

### Users / Auth Token

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api/v1/users?query=` | `conf/routes` -> `controllers.UserApp.users` | Members-page user mention/search helper. | Implemented in app server with legacy JSON Accept/referer gate and `[{info, loginId}]` shape. `crates/migration` carries deterministic app-owned sample path/response metadata for this helper without broad route expansion. |
| `POST /-_-api/v1/users` | `UserApi.newUser()` | Site-admin JSON user creation from `users` array. | Implemented in app server with legacy site-admin-only `400` message, recursive `JsonNode.findValue("users")` request parsing, per-user recursive `loginId`/`name`/`email` lookup, `201 Created` item payloads, and duplicate-email `409 Conflict` item payloads. `crates/migration` carries deterministic app-owned recursive request/response fixtures for migration inventory checks. |
| `POST /-_-api/v1/users/token` | `UserApi.newToken()` | Validate id/password, set session, return `access_token`. | Implemented in app server with legacy recursive `JsonNode.findValue("id")`/`findValue("password")` parsing, password validation messages, fresh API token issuance, authenticated session cookie attachment, and token-auth reuse coverage. `crates/migration` carries deterministic app-owned credential success/error fixtures. |
| `GET /-_-api/v1/user/issues?filter=&page=&pageNum=` | `UserApi.getIssuesByUser()` | Token-authored user issue export/list JSON. | Implemented in app server with legacy session/token authentication, filter/page/pageNum query handling, READ-filtered issue candidates, and `{result:[...]}` issue payloads with author, assignee, project, owner, and refUrl fields. `crates/migration` carries deterministic app-owned token-query and nested response fixtures. |
| `GET /-_-api/v1/users/:user/statistics` | `UserApi.statistics()` | User activity count JSON. | Implemented in app server with legacy statistics fields and session/token auth. `crates/migration` carries deterministic app-owned statistics key fixtures. |
| `POST /-_-api/v1/user/defultLoginPage` | `controllers.UserApp.setDefaultLoginPage()` | Legacy typo-preserving default login page mutation. | Implemented in app server as an alias of the direct typo-preserving default-login-page mutation with legacy `{defaultLoginPage}` response. `crates/migration` carries deterministic app-owned typo-preserving sample metadata. |
| `GET /-_-api/v1/admin/users` | `UserApi.users()` | Site-manager active user list JSON. | Implemented in app server with site-admin auth and legacy active-user JSON fields. `crates/migration` carries deterministic app-owned active/guest response fixtures. |
| `PATCH /-_-api/v1/admin/users/:user` | `UserApi.updateUserState()` | Site-manager user state mutation. | Implemented in app server for legacy `JsonNode.findValue("state")` request parsing, `ACTIVE`/`LOCKED`/`DELETED`/`GUEST` row-state updates, and legacy `SITE_ADMIN` forbidden behavior. `crates/migration` carries deterministic app-owned recursive state request/response fixtures. |

### Projects

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/exports` | `ProjectApi.exports()` | Project export JSON including metadata, members, labels, issues, posts, milestones. | Migrator/export scope; `crates/migration` has a deterministic descriptor payload plus `parse_project_export_response` adapter depth for migration-tool work. The adapter preserves recursive `JsonNode.findValue`-style lookup, scalar fallbacks, default VCS/scope/count behavior, member/assignee/author/label/milestone/resource/menu metadata where present, and bad-path/bad-payload boundaries without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects` | `ProjectApi.newProject()` | Site/admin import-style project creation with members and repository creation. | Migrator/import scope; `crates/migration` has a deterministic descriptor payload plus `parse_project_import_request` adapter depth for migration-tool work. The adapter preserves recursive `JsonNode.findValue` lookup, scalar fallbacks, default description/VCS/scope/menu behavior, member role/email metadata, bad-request boundaries for invalid JSON/path/missing `projectName`, and preflight classification for legacy duplicate-project conflict bodies without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/labels` | `ProjectApi.newLabel()` | Bulk issue-label/category import. | Implemented in app server with legacy `JsonNode.findValue("labels")` recursive request parsing, per-label recursive scalar lookup, `201 Created` created-array response, and duplicate `409 Conflict` item payloads. `crates/migration` also carries deterministic app-owned request/response parser depth for operator replay/preflight, including recursive labels lookup, scalar fallback for label fields, legacy `isExclusive.isBoolean()` token behavior, duplicate label/category classification, and invalid path/JSON/payload boundaries without broad route expansion. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/titleHeads?query=` | `ProjectApi.titleHeads()` | JSON title-head and label suggestion helper. | Implemented in app server with legacy JSON Accept gate and title-head/project-label result shape. `crates/migration` also carries deterministic app-owned response parser depth for operator inventory/replay, including path/query capture, recursive `result` lookup, scalar fallback for title-head and label suggestion fields, and invalid path/JSON/payload boundaries without broad route expansion. |

### Issues / Comments

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/imports?postNumber=` | `IssueApi.imports()` | Convert board post to issue, moving comments and attachments. | Migrator/import scope; `crates/migration` has a deterministic descriptor payload plus `parse_issue_post_conversion_request` / `parse_issue_post_conversion_response` adapter depth for migration-tool work. The adapter preserves legacy path/query parsing, positive `postNumber` validation, body-less request semantics, recursive source-post snapshot lookup, scalar fallbacks, default converted issue state `OPEN`, title/body/author/date/label/milestone metadata, top-level/child comment metadata, board-post and non-issue-comment attachment metadata, `{number}` response parsing, and missing-post/source-mismatch/next-issue-number preflight classification without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues` | `IssueApi.newIssues()` | Bulk issue creation/import with author, assignee, labels, milestone, dates, optional notification. | Migrator/import scope; `crates/migration` has a deterministic descriptor payload plus `parse_issue_import_request` adapter depth for migration-tool work. The adapter preserves recursive `JsonNode.findValue` lookup, scalar fallbacks, default `sendNotification=false`, missing-state `OPEN`, requested issue numbers, author/assignee/label/milestone/due-date/upload metadata, bad-request boundaries for missing/non-array `issues`, invalid issue items, missing title/body, and preflight classification for requested-number conflicts without adding app-server routes. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number` | `IssueApi.getIssue()` | Token-authored issue export JSON with events. | Implemented in app server with legacy `{result}` issue payload, comments, and issue events. |
| `PUT /-_-api/v1/owners/:owner/projects/:projectName/issues/:number` | `IssueApi.updateIssue()` | Token-authored issue title/body/state/assignee update. | Implemented in app server for recursive `JsonNode.findValue("title")`/`findValue("body")`/`findValue("state")`/`findValue("assignees")` parsing, nested assignee `loginId` lookup, and `{result}` issue payload. |
| `PATCH /-_-api/v1/owners/:owner/projects/:projectName/issues/:number` | `IssueApi.updateIssueState()` | Token-authored issue state update with event. | Implemented in app server with recursive `JsonNode.findValue("state")` parsing, legacy missing-state open fallback, and `{result}` payload. |
| `PATCH /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/content` | `IssueApi.updateIssueContent()` | Body-only edit with conflict detection. | Implemented in app server with legacy recursive `JsonNode.findValue("content")`/`findValue("original")` parsing, conflict JSON, and `ProjectApi.getResult`-style payload. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments` | `IssueApi.newIssueComment()` | Issue comment creation via token or session/import payload. | Implemented in app server with legacy recursive `JsonNode.findValue("author")`/`body`/`comment`/`temporaryUploadFiles` parsing, session `{status, location}` response, session/import payload author lookup plus auto-create from `email`/`loginId`/`name`, current-user `temporaryUploadFiles` binding, and token `{result}` response using the token user. `crates/migration` also carries descriptor-only parser depth for migration/operator replay of the existing helper payload shape without adding app-server routes. |
| `PUT /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/comments/:commentId` | `IssueApi.updateIssueComment()` | Comment content update with conflict detection. | Implemented in app server with legacy recursive `JsonNode.findValue("content")`/`findValue("original")` conflict contract and `{result}` comment payload. `crates/migration` also carries descriptor-only parser depth for deterministic `content`/`original` replay boundaries without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/commentNotiReceivers` | `IssueApi.commentNotiRecivers()` | Preview mandatory notification receivers for a comment. | Implemented in app server with recursive `JsonNode.findValue("comment")`/`findValue("parentCommentId")` parsing, issue receiver/watch/share/mention preview, parent-comment author/mention and same-parent sibling expansion, and legacy receiver user shape. `crates/migration` also carries descriptor-only parser depth for comment/parent-comment request replay and `{receivers}` user-shape response inventory without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issuelabel/:number` | `IssueApi.updateIssueLabel()` | Replace issue label set from label id array. | Implemented in app server with legacy label-id array request and `{id, labels}` response. `crates/migration` also carries descriptor-only parser depth for label-id array normalization and invalid label-id boundaries without adding app-server routes. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignableUsers?query=` | `IssueApi.findAssignableUsers()` | Select2 assignable-user search for an issue. | Implemented in app server with legacy array shape and JSON Accept gate. `crates/migration` also carries descriptor-only response parser depth for path/query/type capture, optional `Content-Range`, and user result rows without adding app-server routes. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/assignableUsers?query=` | `IssueApi.findAssignableUsersOfProject()` | Select2 assignable-user search for a project. | Implemented in app server with legacy array shape and JSON Accept gate. `crates/migration` also carries descriptor-only response parser depth for project-scoped path/query/type capture and user/default result rows without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/assignees` | `IssueApi.updateAssginees()` | Legacy typo-preserving assignee mutation and notification. | Implemented in app server with recursive `JsonNode.findValue("assignees")` parsing, legacy assignee-array request, and `{assignee, issue}` payload. `crates/migration` also carries descriptor-only parser depth for assignee-array normalization, `{assignee, issue}` response inventory, and `No assignee` boundaries without adding app-server routes. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/findSharer?query=` | `IssueApi.findSharerByloginIds()` | Resolve existing issue sharers by comma-separated login ids. | Implemented in app server with legacy user array shape and JSON Accept gate. `crates/migration` also carries descriptor-only response parser depth for comma-query capture and user result rows without adding app-server routes. |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/sharableUsers?query=` | `IssueApi.findSharableUsers()` | User/project sharer search. | Implemented in app server with legacy user/project array shape and JSON Accept gate. `crates/migration` also carries descriptor-only response parser depth for path/query/type capture, optional `Content-Range`, and user/project result rows without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share` | `IssueApi.updateSharer()` | Add/delete issue sharer and send notification. | Implemented in app server with recursive `JsonNode.findValue("sharer")`/`findValue("action")` parsing, nested sharer `type`/`loginId` lookup, legacy user/project add/delete behavior, and `{action, sharer}` payload. `crates/migration` also carries descriptor-only parser depth for user/project sharer normalization, `{action, sharer}` response inventory, and missing-sharer/action boundaries without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/upvoteWeight` | `IssueApi.upvoteWeight()` | Increment issue weight. | Implemented in app server with legacy `{weight}` response and permission-denied JSON. `crates/migration` also carries descriptor-only response parser depth for deterministic `{weight}` replay without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/downvoteWeight` | `IssueApi.downvoteWeight()` | Decrement issue weight. | Implemented in app server with legacy `{weight}` response and permission-denied JSON. `crates/migration` also carries descriptor-only response parser depth for deterministic `{weight}` replay without adding app-server routes. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/detectChange` | `IssueApi.detectChange()` | Poll issue body/comment changes and checksum. | Implemented in app server for recursive `JsonNode.findValue("issueBodyChecksum")`/`findValue("numOfComments")` parsing and SHA-1 body checksum/comment count polling with legacy JSON fields, including `issueUpdateDate` as issue updated-date epoch milliseconds. `crates/migration` also carries descriptor-only request/response parser depth for deterministic change-poll replay without adding app-server routes. |
| `POST /-_-api/v1/translation` | `IssueApi.translate()` | Translate issue/post/comment Markdown source; return 412 when unconfigured. | Implemented in app server with recursive `JsonNode.findValue("owner")`/`projectName`/`type`/`number` request parsing, legacy unconfigured `412 Precondition Failed`, executable translation proxy, and Markdown-source response compatibility. `crates/migration` also carries descriptor-only request/response parser depth for operator replay of the app-owned translation helper, including unconfigured `Precondition Failed` normalization without broad route expansion. |

### Board / Posts / Comments

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/posts` | `BoardApi.newPostings()` | Bulk board post creation/import. | Implemented in app server for legacy recursive `JsonNode.findValue("posts")` batch parsing, per-post recursive author/title/body/number/date/upload lookup, requested post number, existing-user author lookup plus payload author auto-create from `email`/`loginId`/`name`, legacy `createdAt`/`updatedAt` restore, current-user `temporaryUploadFiles` binding, and created-array response. `crates/migration` carries deterministic app-owned adapter metadata for this legacy shape without broad route expansion. |
| `PATCH /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/content` | `BoardApi.updatePostingContent()` | Body-only edit with conflict detection. | Implemented in app server with legacy recursive `JsonNode.findValue("content")`/`findValue("original")` parsing, conflict JSON, and `ProjectApi.getResult`-style board-post payload. `crates/migration` carries deterministic app-owned adapter metadata for this legacy shape without broad route expansion. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/comments` | `BoardApi.newPostingComment()` | Board comment creation/import. | Implemented in app server with legacy recursive `JsonNode.findValue("author")`/`body`/`createdAt`/`temporaryUploadFiles` parsing, payload author lookup/auto-create from `email`/`loginId`/`name`, legacy `createdAt` restore, current-user `temporaryUploadFiles` binding, and `{status, location}` created response. `crates/migration` carries deterministic app-owned adapter metadata for this legacy shape without broad route expansion. |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/postlabel/:number` | `BoardApi.updatePostLabel()` | Replace board post label set from label id array. | Implemented in app server with legacy label-id array request and `{id, labels}` response. `crates/migration` carries deterministic app-owned adapter metadata for this legacy shape without broad route expansion. |

### Milestones

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `POST /-_-api/v1/owners/:owner/projects/:projectName/milestones` | `MilestoneApi.newMilestone()` | Bulk milestone creation/import with title, description, due date, state. | Implemented in app server with legacy recursive `JsonNode.findValue("milestones")` request parsing, per-milestone recursive scalar lookup/fallbacks, duplicate-title item payload, untrimmed title scalar preservation, and `201 Created` array response. `crates/migration` now also carries a deterministic app-owned adapter parser/normalizer for this legacy shape without broad route expansion, including recursive payload lookup, fallback title/body behavior, state and due-date normalization, and duplicate classification for migration-tool consumption. |

### Watchers / Favorites

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers?type=issues|posts` | `WatcherApi.getWatchers()` | Return up to 100 watcher names/URLs plus total count. | Implemented in app server for legacy issue/post watcher JSON shape; `crates/migration` carries deterministic app-owned fixture and parser depth for the `type=issues|posts` JSON boundary, empty-OK invalid/missing type boundary, response keys, scalar fallback response values, recursive wrapped payload consumption, 100-row list cap, and sample watcher objects without adding server routes. |
| `GET /-_-api/v1/favoriteProjects` | `UserApi.getFoveriteProjects()` | Legacy misspelled favorite project list JSON. | Implemented in app server as direct helper. `crates/migration` now also normalizes the deterministic `projectIds`/`projects` response shape for operator inventory/replay checks only. |
| `POST /-_-api/v1/favoriteProjects/:projectId` | `UserApi.toggleFoveriteProject()` | Toggle favorite project; return id and `favored`. | Implemented in app server as direct helper. `crates/migration` now also normalizes the deterministic toggle response fields for operator inventory/replay checks only. |
| `GET /-_-api/v1/favoriteOrganizations` | `UserApi.getFoveriteOrganizations()` | Legacy misspelled favorite organization list JSON. | Implemented in app server as direct helper. `crates/migration` now also normalizes the deterministic `organizationIds`/`organizations` response shape for operator inventory/replay checks only. |
| `POST /-_-api/v1/favoriteOrganizations/:organizationId` | `UserApi.toggleFoveriteOrganization()` | Toggle favorite organization; return id and `favored`. | Implemented in app server as direct helper. `crates/migration` now also normalizes the deterministic toggle response fields for operator inventory/replay checks only. |
| `GET /-_-api/v1/favoriteIssues` | `UserApi.getFoveriteIssues()` | Legacy misspelled favorite issue list JSON. | Implemented in app server as direct helper. `crates/migration` now also preserves the legacy misspelled issue-list shape, where ids are returned as `projectIds` and issue rows as `projects`, for operator inventory/replay checks only. |
| `POST /-_-api/v1/favoriteIssues/:issueId` | `UserApi.toggleFoveriteIssue()` | Toggle favorite issue; return id, `favored`, and message. | Implemented in app server as direct helper. `crates/migration` now also normalizes the deterministic toggle response fields, including optional message, for operator inventory/replay checks only. |

### Other

| Endpoint | Legacy source | Legacy intent | Implementation status |
| --- | --- | --- | --- |
| `GET /-_-api` | `controllers.Application.index()` | Legacy API index fallback to app index. | Implemented in app server as an exact GET fallback to the frontend application index shell. |
| `GET /-_-api/v1/` | `controllers.Application.index()` | Legacy API v1 root fallback to app index. | Implemented in app server as an exact GET fallback to the frontend application index shell. |
| `GET /-_-api/v1/hello` | `GlobalApi.hello()` | Health JSON `{"message":"I'm alive!","ok":true}`. | Implemented in app server as direct helper. |

## Follow-up Worker Split

These are migration-tool descriptor follow-ups. They must not be implemented in
the app server, and each worker owns disjoint migration files and matching
tests.

| Worker | Write scope | Test scope | Responsibility |
| --- | --- | --- | --- |
| Users/auth token | `crates/migration/src/legacy_external/users.rs` | `crates/migration/tests/legacy_external_users.rs` | User/auth-token/admin-user compatibility now includes deterministic parser/normalizer depth for the legacy fixture payloads that migration tooling can consume: site-admin user-create batches, token request/response payloads, token-authored user issue export responses, statistics, typo-preserving default-login response, admin active-user list, and admin state request/response. The adapter preserves recursive `JsonNode.findValue`-style lookup, scalar fallbacks, query/path defaults, duplicate-email preflight classification, legacy state normalization, and invalid JSON/path/payload boundaries while keeping these rows app-owned and avoiding broad app-server route expansion. Mention lookup remains descriptor/sample metadata only because migration tooling has no current need to parse its HTML `info` presentation string. |
| Projects/export/import | `crates/migration/src/legacy_external/projects.rs` | `crates/migration/tests/legacy_external_projects.rs` | Project export/import compatibility now includes deterministic parser/normalizer depth for `ProjectApi.exports` and `ProjectApi.newProject`, preserving recursive payload lookup, scalar/default behavior, member/label/milestone/resource/menu/VCS/scope metadata, duplicate-project classification, and invalid path/payload boundaries while keeping those routes migrator-owned and avoiding broad app-server route expansion. The same module now also covers the bounded app-owned label/title-head helper payloads useful to migration/operator tooling: `parse_project_label_import_request`, `parse_project_label_response`, and `parse_project_title_heads_response` normalize recursive label batches, created/conflict label responses, and title-head/label suggestion responses while keeping those rows app-owned and not mounted as broad runtime compatibility. Remaining project helper depth is future tool scope only if another deterministic migration flow needs it. |
| Issues/comments | `crates/migration/src/legacy_external/issues.rs` | `crates/migration/tests/legacy_external_issues.rs` | Issue compatibility now includes deterministic parser/normalizer depth for `IssueApi.imports` post-to-issue conversion, `IssueApi.newIssues` bulk import, and the descriptor-only helper payloads a migration/operator tool may need to replay: issue comment create/update, comment notification receiver preview, label replace, assignable/search helper responses, assignee replace request/response, sharer search/share request/response, weight response, `detectChange` request/response, and translation request/response. The adapter preserves recursive `JsonNode.findValue` lookup, scalar fallbacks where the legacy controller used scalar reads, invalid JSON/path/payload boundaries, and app-owned helper classification without broad app-server route expansion. |
| Board/posts/comments | `crates/migration/src/legacy_external/boards.rs` | `crates/migration/tests/legacy_external_boards.rs` | Board post/comment import, body-edit, and post-label compatibility now includes deterministic parser/normalizer depth for the existing legacy fixture payloads while keeping the routes app-owned and avoiding broad app-server route expansion. |
| Milestones | `crates/migration/src/legacy_external/milestones.rs` | `crates/migration/tests/legacy_external_milestones.rs` | Milestone import compatibility now includes deterministic parser/normalizer depth for `MilestoneApi.newMilestone` payloads while keeping the route app-owned and avoiding broad app-server route expansion. |
| Watchers/favorites boundary | `crates/migration/src/legacy_external/watchers.rs` | `crates/migration/tests/legacy_external_watchers.rs` | Watcher/favorite helper compatibility now includes deterministic parser/normalizer depth for the existing descriptor-only group that migration/operator tooling can consume: watcher path/query handling for `type=issues|posts`, empty-OK invalid/missing type behavior, watcher response counts/list entries, favorite project/organization/issue list responses, and favorite toggle responses. The adapter preserves recursive wrapped payload consumption and scalar fallbacks where useful for tool-side legacy payload normalization, keeps all rows app-owned, and still prevents UserApi favorite helpers from leaking into WatcherApi route fixtures or broad app-server route expansion. Broader watcher/favorite export snapshots remain future migrator scope only if a migration tool needs them. |
| Module wiring | `crates/migration/src/legacy_external/mod.rs` | `crates/migration/tests/legacy_external_mod.rs` | Shared endpoint group summaries, status counts, duplicate method/path guards, and module registration for migration tooling, without app-server route mounting. |

The worker split above is complete for P1-B. The only remaining descriptor
metadata without parser depth is intentionally non-migratory sample evidence
listed in the closeout re-audit section.

## Consistency Notes

- `Foverite`, `Assginees`, `commentNotiRecivers`, and `defultLoginPage` are legacy spellings in source and route/action names; provenance preserves them only when naming legacy references.
- Implemented app-server compatibility is limited to the rows marked implemented in this inventory. Any broader route listed above as migrator/deferred must remain outside the Rust app-facing `/api/v1` surface and outside broad Rust `/-_-api/v1/**` runtime compatibility.
- Existing React/runtime behavior should continue using canonical `/api/v1/**` except for the direct legacy helper calls explicitly allowed by SPEC.
- Do not use the ambiguous old `GitHub Import` label for `/_import` or for
  `/-_-api/v1/**` migrator rows. Legacy evidence maps it to outbound
  `/migration` Yona-to-GitHub behavior only.
