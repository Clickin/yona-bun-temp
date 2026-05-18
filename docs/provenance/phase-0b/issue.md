# Issue Provenance

## Scope

- Phase 2A issue core parity slice
- Issue list/detail/create/edit/delete, comments, comment vote, state mutation, watch/vote/favorite/assignee, issue detail assignee autocomplete/search, mass update, Markdown rendering, issue/comment attachment binding, core Issue Sharer read/comment authorization, sharable-user search, project-target issue sharer mutation, direct sharer row-level timeline/notification/mail queue side effects, issue/comment `@user`/`@org`/`@owner/project` mention indexing/search/notification semantics, issue reference `#issue` autocomplete, and `/user/issues` personal issue aggregation now have Rust canonical coverage.
- Label/category and milestone management screens are now covered by Phase 2B/2C provenance. Phase 2A issue core only owns issue CRUD and issue-linked label/milestone consumption.

## Legacy Sources

- `yona-original/test/controllers/IssueAppTest.java`
- `yona-original/test/models/IssueTest.java`
- `yona-original/app/controllers/IssueApp.java`
- `yona-original/app/controllers/VoteApp.java`
- `yona-original/app/models/Project.java`
- `yona-original/app/models/IssueComment.java`
- `yona-original/app/models/IssueSharer.java`
- `yona-original/app/utils/AccessControl.java`
- `yona-original/app/controllers/api/IssueApi.java`
- `yona-original/app/controllers/api/UserApi.java`
- `yona-original/app/controllers/ProjectApp.java`
- `yona-original/app/models/FavoriteIssue.java`
- `yona-original/app/views/issue/view.scala.html`
- `yona-original/app/views/issue/partial_assignee.scala.html`
- `yona-original/app/views/issue/partial_comment.scala.html`
- `yona-original/app/views/issue/my_partial_search.scala.html`
- `yona-original/app/views/issue/my_partial_list_quicksearch.scala.html`
- `yona-original/public/javascripts/common/yobi.Mention.js`
- `yona-original/public/javascripts/service/yobi.issue.View.js`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/src/lib/issue-trpc.ts`, `reference/mixed-code/packages/domain/*issue*`
- canonical implementation path: `repo root`
- canonical owner path: `crates/domain`, `crates/server`, `frontend`

## Exemplar

The first issue provenance trace for this batch is the edit matrix in `IssueAppTest`.

| Legacy source                  | Intent                                                                                                     | Rust translation target                                                            |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `IssueAppTest.testInit`        | private-project fixture roles define site admin, manager, member, author, assignee, and outsider semantics | domain fixture setup in `crates/domain`                                            |
| `IssueAppTest.editByAuthor`    | author can edit own issue                                                                                  | issue authorization exemplar in `crates/domain`                                    |
| `IssueAppTest.editByAssignee`  | assignee can edit even without project membership                                                          | issue authorization exemplar in `crates/domain`                                    |
| `IssueAppTest.editByManager`   | project manager can edit                                                                                   | issue authorization exemplar in `crates/domain`                                    |
| `IssueAppTest.editByMember`    | project member can edit                                                                                    | issue authorization exemplar in `crates/domain`                                    |
| `IssueAppTest.editByAdmin`     | site admin can edit                                                                                        | issue authorization exemplar in `crates/domain`                                    |
| `IssueAppTest.editByNonmember` | public visibility does not grant edit rights to outsiders                                                  | issue authorization exemplar in `crates/domain` plus route test in `crates/server` |

## Batch Translation Rule

- Phase 2A closes the previous small authorization-only issue slice for core issue CRUD and participation flows.
- `IssueAppTest.postByNonmember` and `commentByNonmember` are translated as authenticated public-project create/comment permission in `crates/server/tests/issue_core_contract.rs`.
- `IssueAppTest.editBy*` and `deleteBy*` are translated as issue-specific mutation guard: author, assignee, project member, project manager, organization admin, or site admin can mutate; public-project outsider cannot edit another user's issue.
- `IssueTest.watchDefault`, watch/unwatch, vote, comment timeline, and Markdown/XSS expectations are covered by `issue_core_contract_creates_reads_comments_and_sanitizes_markdown`.

## Phase 2E Issue Sharer Translation Rule

- Legacy `IssueSharer.createSharer` stores `loginId`, `user`, `issue`, and `created`; Rust resolves `login_id` to `n4user.id` and writes direct `issue_sharer(issue_id, user_id, login_id, created)` rows.
- Legacy `AccessControl.isAllowedIfSharer` grants direct issue read and parent-to-child issue/comment read. Rust mirrors this with separate direct and inherited share flags, and allows comments only on directly shared issues.
- Legacy `IssueApi.updateSharer` is an internal screen mutation. Rust implements this through `/api/v1/owners/:owner/projects/:project/issues/:number/sharers`; no `/-_-api/v1` external compatibility endpoint is added in this app phase.
- Legacy `issue/view.scala.html` renders the `sharer-list` sidebar near issue metadata. Rust issue detail renders the direct sharer count/list and login ID add/remove controls when `viewerCanManageSharers` is true.

## Phase 2G Favorite/User Issue Translation Rule

- Legacy `UserApi.toggleFoveriteIssue` toggles `favorite_issue(user, issue)` rows and updates the issue detail star. Rust implements this through `POST /api/v1/owners/:owner/projects/:project/issues/:number/favorite` and projects `ReadIssueDetailResponse.isFavorited`; no `/-_-api/v1/favoriteIssues` endpoint is added in this phase.
- Legacy `IssueApp.userIssues` defaults to assigned-to-me when no condition is supplied and renders the personal quick filters from `my_partial_list_quicksearch.scala.html`. Rust implements `/user/issues` with assigned/authored/commented/mentioned/shared/favorite filters over `GET /api/v1/user/issues`.
- The mentioned filter reads issue body and comment `mention` rows produced by Rust mention sync, while tolerating earlier Rust `issue` resource rows.

## Phase 2H Issue Comment Vote Translation Rule

- Legacy `VoteApp.voteComment` and `IssueComment.addVoter` add `issue_comment_voter(issue_comment_id, user_id)` idempotently. Rust implements this through `POST /api/v1/owners/:owner/projects/:project/issues/:number/comments/:commentId/vote` and returns refreshed issue detail data.
- Legacy `VoteApp.unvoteComment` fails when the current user has not voted the comment. Rust preserves that policy through `DELETE /api/v1/owners/:owner/projects/:project/issues/:number/comments/:commentId/vote` returning not found for a missing voter row.
- Legacy `partial_comment.scala.html` renders voter count/names/avatars and a heart state in the issue comment row. Rust projects `IssueComment.voterCount`, `viewerHasVoted`, and `voters`, then renders the count/list and vote/unvote heart control in the current React issue detail timeline row.
- Legacy direct POST routes `/:user/:project/issue/:number/comment/:commentId/vote` and `/unvote` are mounted as compatibility wrappers around the same policy, then redirect back to `/:user/:project/issue/:number#comment-:commentId`.

## Phase 2J Issue Detail Assignee Search Translation Rule

- Legacy `IssueApi.findAssignableUsers` searches active users by `loginId`, `name`, or `englishName`, caps suggestions, and filters candidates by project visibility. Rust implements the detail-sidebar search through `GET /api/v1/owners/:owner/projects/:project/issues/:number/assignable-users?query=&type=`.
- Public projects expose active matching users as assignable suggestions. Private/protected projects expose active matching project members, plus organization members/admins when the project belongs to an organization.
- The current assignee remains selectable when it matches the query even if it is no longer active or otherwise assignable, matching legacy `Project.getAssignableUsersAndAssignee(issue)` intent.
- The API intentionally returns only real user suggestions. Legacy custom pseudo candidates such as assign-to-me, assign-to-author, and no-assignee remain outside this slice; the existing blank manual submit path stays the unassign fallback.
- Issue read ACL is reused for search, and the existing assignment mutation policy remains unchanged.

## Phase 2K Issue Create/Edit Assignee Search Translation Rule

- Legacy `IssueApi.findAssignableUsersOfProject` backs create/edit assignee selection without requiring an issue number. Rust implements the project-scoped search through `GET /api/v1/owners/:owner/projects/:project/assignable-users?query=&type=`.
- The response shape and matching semantics stay aligned with the Phase 2J detail endpoint: active real users only, `loginId`/`name`/`englishName` matching, exact field matching when `type` is present, 10 visible results, and `total`/`truncated` metadata.
- Project-scoped search does not include an inactive or otherwise non-assignable current assignee. Edit form initialization comes from issue detail, and unchanged submit preserves the current `assigneeLoginId` through the existing update mutation.
- Project read ACL is reused for search, and create/update assignment mutation policy remains unchanged.

## Phase 2L Issue Collaboration Translation Rule

- Legacy `yonaIssueSharerModule` separates user/project lookup from direct share mutation. Rust implements the screen lookup through `GET /api/v1/owners/:owner/projects/:project/issues/:number/sharable-users?query=&type=` with issue read ACL, active user candidates, public project candidates, exact user field matching for `type=loginId|name|englishName`, broad contains matching otherwise, no blank-query remote results, and 10 visible rows with `total`/`truncated`.
- Direct share/unshare mutation remains manager-only and idempotent. Rust writes `ISSUE_SHARER_CHANGED` `issue_event`, one `notification_event`, one `notification_event_n4user` receiver row, and one `notification_mail` queue row only when the direct `issue_sharer` row actually changes. Project target mutation is limited to public project candidates and expands to that project's member users; org/group sharer mutation is not included without stronger legacy issue-sharer evidence.
- Legacy `yobi.Mention` and `ProjectApp.mentionList` expose `@` candidates for users, the project token, and organization token. Rust implements issue-scoped mention suggestions through `GET /api/v1/owners/:owner/projects/:project/issues/:number/mention-users?query=&context=issue-body|issue-comment`; blank query returns contextual issue/project candidates, public nonblank search may include active global users, and private/protected nonblank search stays contextual.
- Legacy mention persistence uses resource-specific rows and existing event types rather than a standalone mention event. Rust parses `@login`, `@org`, and `@owner/project` on issue create/update and comment create/update, expands org/project tokens to active user rows, stores `issue_post` and `issue_comment` mention rows, notifies newly mentioned active users with `NEW_ISSUE`, `ISSUE_BODY_CHANGED`, `NEW_COMMENT`, or `COMMENT_UPDATED`, and excludes the actor.

## Phase 2M Issue Reference Autocomplete Translation Rule

- Legacy `yobi.Mention` wires the `#` atwho trigger to `ProjectApp.mentionList(... mentionType=issue)`, displaying `#${issueNo}` and inserting the `#number` token only.
- Legacy `ProjectApp.getMentionIssueList` searches the project issue set, uses the origin project when the current project is forked, returns the latest 10 issues for a blank query, and searches by issue-number prefix or title contains for nonblank queries.
- Rust implements the screen lookup through `GET /api/v1/owners/:owner/projects/:project/issue-references?query=` with project read ACL, anonymous public-project reads, private/protected 403s, 404 for missing projects, and readable fork-origin search with current-fork fallback when the origin is not readable.
- The REST response stays frontend-local (`issueNumber`, `title`, `state`, `total`, `truncated`) rather than adding proto/ConnectRPC codegen. Nonblank results sort exact issue number first, then number-prefix matches, then title matches, with latest issue recency as the tie-breaker.
- Create/edit/detail/comment textareas now support insertion-only `#${issueNumber}` autocomplete using the same 300ms debounce boundary as `@` mention suggestions. The Rust Markdown projection now auto-links `@username`, same-project `#123`, `owner/project#123`, and bare `http://`/`https://` URLs, renders safe inline images after sanitization, and renders task-list checkboxes as sanitized disabled inputs; legacy issue-link title/state enrichment remains a renderer follow-up.
- Phase 2N adds notification inbox/list, notification mail queue staging/drain, and public project-target sharer mutation. Legacy external `/-_-api/v1` issue API compatibility is not an app follow-up; it is deferred to a separate migrator/export/import deliverable.

## Phase 2A Evidence

| Evidence                                    | Rust target                                                                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy route/controller/view source checked | `IssueApp.java`, `issue/list.scala.html`, `issue/view.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `partial_comments.scala.html`, `partial_event_timeline.scala.html` |
| REST contract                               | `/api/v1/projects/:owner/:project/issues/**`, `/api/v1/owners/:owner/projects/:project/assignable-users`, `/api/v1/owners/:owner/projects/:project/issues/:number/**`, `crates/server/tests/issue_core_contract.rs`, `crates/server/tests/issue_assignable_contract.rs`                                  |
| Backend behavior                            | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs`                                                                                                                              |
| UI route surface                            | `frontend/src/routes/$owner/$projectName/issues`, `issueform`, `issue/$issueNumber`, `issue/$issueNumber/editform`                                                                        |
| Regression tests                            | `cargo test -p yona-rust-pilot-server --test issue_core_contract`                                                                                                                         |

## Phase 2E Evidence

| Evidence                 | Rust target                                                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| Legacy sharer model      | `yona-original/app/models/IssueSharer.java`                                                                                      |
| Legacy ACL rule          | `yona-original/app/utils/AccessControl.java#isAllowedIfSharer`                                                                   |
| Legacy mutation endpoint | `yona-original/app/controllers/api/IssueApi.java#updateSharer`                                                                   |
| Legacy sidebar view      | `yona-original/app/views/issue/view.scala.html#sharer-list`                                                                      |
| REST contract            | `/api/v1/owners/:owner/projects/:project/issues/:number/sharers`, `crates/server/tests/issue_sharer_contract.rs`                  |
| Backend behavior         | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs`                                                                     |
| UI route surface         | `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`                   |
| Regression tests         | `cargo test -p yona-rust-pilot-server --test issue_sharer_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx` |

## Phase 2G Evidence

| Evidence                 | Rust target                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy favorite API/model | `yona-original/app/controllers/api/UserApi.java#toggleFoveriteIssue`, `yona-original/app/models/FavoriteIssue.java`                            |
| Legacy user issue UI      | `IssueApp.userIssues`, `issue/my_partial_search.scala.html`, `issue/my_partial_list_quicksearch.scala.html`, `issue/view.scala.html`           |
| REST contract             | `/api/v1/user/issues`, `/api/v1/owners/:owner/projects/:project/issues/:number/favorite`, `ReadIssueDetailResponse.isFavorited`                 |
| Backend behavior          | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs`                                                                                   |
| UI route surface          | `frontend/src/routes/user/issues/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests          | `cargo test -p yona-rust-pilot-server --test user_issue_favorite_contract`; `pnpm --dir frontend test -- route-parity.spec.tsx auth-workspace-shell.spec.tsx` |

## Phase 2H Evidence

| Evidence                 | Rust target                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy comment vote source | `yona-original/app/controllers/VoteApp.java#voteComment`, `#unvoteComment`, `yona-original/app/models/IssueComment.java#addVoter`          |
| Legacy comment UI         | `yona-original/app/views/issue/partial_comment.scala.html`, `yona-original/public/javascripts/service/yobi.issue.View.js`                  |
| REST contract             | `/api/v1/owners/:owner/projects/:project/issues/:number/comments/:commentId/vote`, `IssueCommentVoter`, comment vote projection fields     |
| Backend behavior          | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`, direct POST compatibility routes       |
| UI route surface          | `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/app-view-models.ts` |
| Regression tests          | `cargo test -p yona-rust-pilot-server --test issue_comment_vote_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx route-parity.spec.tsx` |

## Phase 2J Evidence

| Evidence                 | Rust target                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy assignable source | `yona-original/app/controllers/api/IssueApi.java#findAssignableUsers`, `yona-original/app/models/Project.java#getAssignableUsersAndAssignee` |
| Legacy assignee UI       | `yona-original/app/views/issue/partial_assignee.scala.html`, `yona-original/app/views/issue/view.scala.html`                                |
| REST contract            | `/api/v1/owners/:owner/projects/:project/issues/:number/assignable-users`, `crates/server/tests/issue_assignable_contract.rs`               |
| Backend behavior         | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface         | `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/api/issue-meta.ts` |
| Regression tests         | `cargo test -p yona-rust-pilot-server --test issue_assignable_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts auth-workspace-shell.spec.tsx` |

## Phase 2K Evidence

| Evidence                 | Rust target                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy assignable source | `yona-original/app/controllers/api/IssueApi.java#findAssignableUsersOfProject`, `yona-original/app/views/issue/partial_assignee.scala.html` |
| REST contract            | `/api/v1/owners/:owner/projects/:project/assignable-users`, `crates/server/tests/issue_assignable_contract.rs`                              |
| Backend behavior         | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface         | `frontend/src/routes/$owner/$projectName/issueform/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/api/issue-meta.ts` |
| Regression tests         | `cargo test -p yona-rust-pilot-server --test issue_assignable_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts auth-workspace-shell.spec.tsx` |

## Phase 2L Evidence

| Evidence                    | Rust target                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy sharer UI/API source | `yona-original/public/javascripts/service/yona.issue.Sharer.js`, `yona-original/app/controllers/api/IssueApi.java#updateSharer`, `yona-original/app/views/issue/partial_event_timeline.scala.html` |
| Legacy mention source       | `yona-original/public/javascripts/common/yobi.Mention.js`, `yona-original/app/controllers/ProjectApp.java#mentionList`, `yona-original/app/models/Comment.java#updateMention`, `yona-original/app/models/AbstractPosting.java#updateMention`, `yona-original/test/models/NotificationEventTest.java#getNewMentionedUsers1` |
| REST contract               | `/api/v1/owners/:owner/projects/:project/issues/:number/sharable-users`, `/api/v1/owners/:owner/projects/:project/issues/:number/mention-users`, `crates/server/tests/issue_sharer_contract.rs`, `crates/server/tests/issue_mention_contract.rs` |
| Backend behavior            | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface            | `frontend/src/api/issue-meta.ts`, `frontend/src/auth-workspace-client.ts`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests            | `cargo test -p yona-rust-pilot-server --test issue_sharer_contract --test issue_mention_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts auth-workspace-shell.spec.tsx` |

## Phase 2M Evidence

| Evidence                       | Rust target                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy issue reference source  | `yona-original/public/javascripts/common/yobi.Mention.js`, `yona-original/app/controllers/ProjectApp.java#mentionList`, `#getMentionIssueList` |
| REST contract                  | `/api/v1/owners/:owner/projects/:project/issue-references`, `crates/server/tests/issue_reference_autocomplete_contract.rs`                  |
| Backend behavior               | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface               | `frontend/src/api/issue-meta.ts`, `frontend/src/api/query-keys.ts`, `frontend/src/auth-workspace-client.ts`, `frontend/src/routes/$owner/$projectName/issueform/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests               | `cargo test -p yona-rust-pilot-server --test issue_reference_autocomplete_contract --test issue_mention_contract --test rest_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx api-query.spec.ts` |

## Phase 2N Evidence

| Evidence                    | Rust target                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy notification source  | `yona-original/app/controllers/NotificationApp.java`, `yona-original/app/views/index/notifications.scala.html`, `yona-original/app/views/index/partial_notifications.scala.html`, `yona-original/app/models/NotificationEvent.java`, `yona-original/app/models/NotificationMail.java` |
| Legacy sharer source        | `yona-original/app/controllers/api/IssueApi.java#findSharableUsers`, `#updateSharer`, `yona-original/public/javascripts/service/yona.issue.Sharer.js` |
| REST contract               | `/api/v1/notifications`, `/api/v1/owners/:owner/projects/:project/issues/:number/sharable-users`, `/api/v1/owners/:owner/projects/:project/issues/:number/sharers`, `crates/server/tests/notification_contract.rs`, `crates/server/tests/issue_sharer_contract.rs` |
| Backend behavior            | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface            | `frontend/src/routes/notification/route.tsx`, `frontend/src/api/notifications.ts`, `frontend/src/api/issue-meta.ts`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests            | `cargo test -p yona-rust-pilot-server --test notification_contract --test issue_sharer_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts route-parity.spec.tsx` |

## Remaining Phase 2 Follow-ups

- Notification read-state and full SMTP batching parity.
- Group sharer mutation only if legacy issue-sharer evidence requires it.
- Legacy external `/-_-api/v1` issue API parity is deferred to a separate migrator/export/import deliverable, not the app server.

## Shared Surface Notes

- Phase 3A Code Browser changes may touch shared frontend client/view-model files that also serve issue routes. Those edits are contract plumbing only; they do not change issue lifecycle behavior or close any remaining Phase 2 issue follow-up.
