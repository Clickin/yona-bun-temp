# Issue Provenance

## Scope

- Phase 2A issue core parity slice
- Issue list/detail/create/edit/delete, comments, comment vote, comment direct issue creation, direct my-issue creation, state mutation, watch/vote/favorite/assignee, issue detail assignee autocomplete/search, mass update, Markdown rendering, issue/comment attachment binding, issue body/comment image paste/drop upload, core Issue Sharer read/comment authorization, sharable-user search, project-target issue sharer mutation, direct sharer row-level timeline/notification/mail queue side effects, single and mass-update issue state-change timeline/notification/mail queue side effects, issue/comment `@user`/`@org`/`@owner/project` mention indexing/search/notification semantics, issue reference `#issue` autocomplete, and `/user/issues` personal issue aggregation now have Rust canonical coverage.
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
- `yona-original/public/javascripts/common/yobi.Attachments.js`
- `yona-original/public/javascripts/common/yobi.Files.js`
- `yona-original/public/javascripts/common/yobi.Mention.js`
- `yona-original/public/javascripts/service/yobi.issue.Write.js`
- `yona-original/public/javascripts/service/yobi.issue.View.js`

## Current Baseline And Canonical Target

- obsolete pre-Rust residual path, not reference: `reference/mixed-code/frontend/src/lib/issue-trpc.ts`, `reference/mixed-code/packages/domain/*issue*`
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
- Legacy `IssueMassUpdate.isDueDateChanged` / `dueDate` is translated through `/api/v1/projects/:owner/:project/issues/mass-update`; Rust parses the same YYYY-MM-DD scalar used by issue create/edit and applies it to each selected issue without inventing a separate event type.
- Legacy `IssueMassUpdate.delete` is translated through the same mass-update endpoint by deleting selected non-draft issues with the existing issue delete primitive and `RESOURCE_DELETED` webhook fan-out.

## Phase 2E Issue Sharer Translation Rule

- Legacy `IssueSharer.createSharer` stores `loginId`, `user`, `issue`, and `created`; Rust resolves `login_id` to `n4user.id` and writes direct `issue_sharer(issue_id, user_id, login_id, created)` rows.
- Legacy `AccessControl.isAllowedIfSharer` grants direct issue read and parent-to-child issue/comment read. Rust mirrors this with separate direct and inherited share flags, and allows comments only on directly shared issues.
- Legacy `IssueApi.updateSharer` is an internal screen mutation. Rust implements this through `/api/v1/owners/:owner/projects/:project/issues/:number/sharers`; no `/-_-api/v1` external compatibility endpoint is added in this app phase.
- Legacy `issue/view.scala.html` renders the `sharer-list` sidebar near issue metadata. Rust issue detail renders the direct sharer count/list and login ID add/remove controls when `viewerCanManageSharers` is true.

## Phase 2G Favorite/User Issue Translation Rule

- Legacy `UserApi.toggleFoveriteIssue` toggles `favorite_issue(user, issue)` rows and updates the issue detail star. Rust implements this through `POST /api/v1/owners/:owner/projects/:project/issues/:number/favorite` and projects `ReadIssueDetailResponse.isFavorited`; no `/-_-api/v1/favoriteIssues` endpoint is added in this phase.
- Legacy `IssueApp.userIssues` defaults to assigned-to-me when no condition is supplied and renders the personal quick filters from `my_partial_list_quicksearch.scala.html`. Rust implements `/user/issues` with assigned/authored/commented/mentioned/shared/favorite filters over `GET /api/v1/user/issues`.
- `/user/issues` uses the route-loaded legacy message table for project title attributes; the React view must not read an absent prop-level message bag while rendering the legacy quick-search rows.
- The mentioned filter reads issue body and comment `mention` rows produced by Rust mention sync, while tolerating earlier Rust `issue` resource rows.
- Issue detail body, comments, body-history modal, and legacy preview source now render from Markdown source in React. REST `bodyHtml`, comment `contentsHtml`, and `historyHtml` stay as empty app-runtime compatibility fields; the legacy `POST /markdown/:owner/:project` route no longer returns server-rendered HTML.

## Phase 2H Issue Comment Vote Translation Rule

- Legacy `VoteApp.voteComment` and `IssueComment.addVoter` add `issue_comment_voter(issue_comment_id, user_id)` idempotently. Rust implements this through `POST /api/v1/owners/:owner/projects/:project/issues/:number/comments/:commentId/vote` and returns refreshed issue detail data.
- Legacy `VoteApp.unvoteComment` fails when the current user has not voted the comment. Rust preserves that policy through `DELETE /api/v1/owners/:owner/projects/:project/issues/:number/comments/:commentId/vote` returning not found for a missing voter row.
- Legacy `view.scala.html`, `partial_comments.scala.html`, and `partial_comment.scala.html` wrap issue comments in `#comments.board-comment-wrap`, `.comment-header`, `.comments`, `.comment`, `.comment-avatar`, `.avatar-wrap`, `.media-body`, `.comment_author`, `.ago-date`, `.ago`, `.share-link`, `.act-row.pull-right`, `.new-issue-by`, `#comment-body-*`, and `.comment-body`; `partial_comment.scala.html` also renders the comment author avatar from `User.findByLoginId(comment.authorLoginId).avatarUrl(64)` and sets `data-allowed-update` on the markdown body. Rust now projects `IssueComment.authorAvatarUrl` for both `comments` and `timeline.comment` from the author user row and renders those legacy anchors in the React issue detail timeline.
- Legacy `partial_comment.scala.html` renders voter count/names/avatars and a heart state in the issue comment row. Rust projects `IssueComment.voterCount`, `viewerHasVoted`, and `voters`, then renders the count/list and vote/unvote heart control in the current React issue detail timeline row.
- Legacy comment vote/unvote buttons include `data-request-type="comment-vote"` and a direct `VoteApp.voteComment` / `unvoteComment` request URI. Rust now renders the same request anchors on the React vote control while the actual app-runtime mutation remains handled by the existing typed callback.
- Legacy `IssueApp.newDirectIssueForm(commentId)` chooses the current user's most recent visited project, renders the normal issue create form with `referCommentId`, pre-fills the body as `Originally posted by @...`, and `newIssue` creates an `issue.derived` comment on the source issue. Rust now exposes `/api/v1/user/issues/new-options`, serves `/user/issues/new?commentId=:id`, carries `referCommentId` through the REST create body, and creates the source issue comment with `parent_comment_id` set to the referenced comment.
- Legacy `IssueApp.newDirectMyIssueForm()` chooses the current user's own target project in order: `inbox`, `_private`, newest private project, then newest public project; if none exists, it flashes `project.is.empty` and returns the application index. Rust keeps the same selection order through `GET /api/v1/user/issues/new-options?mine=true`, serves `/user/issues/new/mine`, reuses the normal issue create shell, and omits `referCommentId` from the create payload when the direct form is not derived from a comment.
- Legacy `issue/edit.scala.html` posts the issue author's database id as hidden `authorId`. Rust REST issue detail now exposes `authorId`, the React detail view model carries it, and the edit form renders the same hidden field while create forms omit it.
- Legacy `partial_comment.scala.html` routes comment editing through a `[data-toggle="comment-edit"]` button with `data-comment-id`, and `common.commentUpdateForm()` renders `#comment-editform-*`, `.comment-update-form`, `.write-comment-box`, `.ybtn-cancel`, and `.ybtn-info` anchors. Rust now renders those edit trigger/form shell anchors on issue detail while keeping the existing comment update mutation as the submitted action.
- Legacy `partial_comment.scala.html` routes comment deletion through a `[data-toggle="comment-delete"]` button with `data-request-uri`, and `common.commentDeleteModal()` renders `#comment-delete-modal` plus `#comment-delete-confirm` with `data-request-method="delete"`. Rust now renders the same trigger/modal shell on issue detail and keeps the existing comment delete mutation as the confirmed action.
- Legacy direct POST routes `/:user/:project/issue/:number/comment/:commentId/vote` and `/unvote` are mounted as compatibility wrappers around the same policy, then redirect back to `/:user/:project/issue/:number#comment-:commentId`.

## Phase 2J Issue Detail Assignee Search Translation Rule

- Legacy `IssueApi.findAssignableUsers` searches active users by `loginId`, `name`, or `englishName`, caps nonblank suggestions, filters candidates by project visibility, and returns default dropdown rows on blank query. Rust implements the detail-sidebar search through `GET /api/v1/owners/:owner/projects/:project/issues/:number/assignable-users?query=&type=`.
- Public projects expose active matching users as assignable suggestions. Private/protected projects expose active matching project members, plus organization members/admins when the project belongs to an organization.
- The current assignee remains selectable when it matches the query even if it is no longer active or otherwise assignable, matching legacy `Project.getAssignableUsersAndAssignee(issue)` intent.
- The React menu keeps legacy Select2 status behavior: default no-results copy is `No matches found`, and failed Ajax lookups do not add a custom `Assignable user search failed.` menu row.
- Blank issue-detail queries preserve the legacy pseudo/default rows: `issue.assignToMe`, `issue.assignToAuthor` when the author differs from the current user/assignee, `issue.noAssignee` when the issue already has an assignee, the current assignee pinned near the top, then project/organization assignable users.
- Issue read ACL is reused for search, and the existing assignment mutation policy remains unchanged.

## Phase 2K Issue Create/Edit Assignee Search Translation Rule

- Legacy `IssueApi.findAssignableUsersOfProject` backs create/edit assignee selection without requiring an issue number. Rust implements the project-scoped search through `GET /api/v1/owners/:owner/projects/:project/assignable-users?query=&type=`.
- The response shape and matching semantics stay aligned with the Phase 2J detail endpoint: blank queries return the legacy `issue.assignToMe` current-user row followed by project/organization assignable users, while nonblank queries return active real users only, `loginId`/`name`/`englishName` matching, exact field matching when `type` is present, 10 visible results, and `total`/`truncated` metadata.
- Project-scoped search does not include an inactive or otherwise non-assignable current assignee. Edit form initialization comes from issue detail, and unchanged submit preserves the current `assigneeLoginId` through the existing update mutation.
- Project read ACL is reused for search, and create/update assignment mutation policy remains unchanged.

## Phase 2L Issue Collaboration Translation Rule

- Legacy `yonaIssueSharerModule` separates user/project lookup from direct share mutation. Rust implements the screen lookup through `GET /api/v1/owners/:owner/projects/:project/issues/:number/sharable-users?query=&type=` with issue read ACL, active user candidates, public project candidates, exact user field matching for `type=loginId|name|englishName`, broad contains matching otherwise, no blank-query remote results, and 10 visible rows with `total`/`truncated`; when combined user/project matches exceed 10, the visible set follows legacy `MAX_FETCH_USERS / 2` behavior with five user rows and five project rows.
- Direct share/unshare mutation remains manager-only and idempotent. Rust writes `ISSUE_SHARER_CHANGED` `issue_event`, one `notification_event`, one `notification_event_n4user` receiver row, and one `notification_mail` queue row only when the direct `issue_sharer` row actually changes. Project target mutation is limited to public project candidates and expands to that project's member users; org/group sharer mutation is not included without stronger legacy issue-sharer evidence.
- Legacy `yobi.Mention` and `ProjectApp.mentionList` expose `@` candidates for users, the project token, and organization token. Rust implements issue-scoped mention suggestions through `GET /api/v1/owners/:owner/projects/:project/issues/:number/mention-users?query=&context=issue-body|issue-comment`; blank query returns contextual issue/project candidates, public nonblank search may include active global users, and private/protected nonblank search stays contextual. The React suggestion menu follows legacy At.js by hiding loading/empty/error result lists instead of rendering temporary `Searching…`, `No matching mentions`, search-failed, or more-results status copy.
- Legacy mention persistence uses resource-specific rows and existing event types rather than a standalone mention event. Rust parses `@login`, `@org`, and `@owner/project` on issue create/update and comment create/update, expands org/project tokens to active user rows, stores `issue_post` and `issue_comment` mention rows, notifies newly mentioned active users with `NEW_ISSUE`, `ISSUE_BODY_CHANGED`, `NEW_COMMENT`, or `COMMENT_UPDATED`, and excludes the actor.

## Phase 2M Issue Reference Autocomplete Translation Rule

- Legacy `yobi.Mention` wires the `#` atwho trigger to `ProjectApp.mentionList(... mentionType=issue)`, displaying `#${issueNo}` and inserting the `#number` token only. Loading/empty/error result lists hide the At.js menu instead of showing temporary `Searching…`, `No matching issues`, search-failed, or more-results status copy.
- Legacy `ProjectApp.getMentionIssueList` searches the project issue set, uses the origin project when the current project is forked, returns the latest 10 issues for a blank query, and searches by issue-number prefix or title contains for nonblank queries.
- Rust implements the screen lookup through `GET /api/v1/owners/:owner/projects/:project/issue-references?query=` with project read ACL, anonymous public-project reads, private/protected 403s, 404 for missing projects, and readable fork-origin search with current-fork fallback when the origin is not readable.
- The REST response stays frontend-local (`issueNumber`, `title`, `state`, `total`, `truncated`) rather than adding proto/ConnectRPC codegen. Nonblank results sort exact issue number first, then number-prefix matches, then title matches, with latest issue recency as the tie-breaker.
- Create/edit/detail/comment textareas now support insertion-only `#${issueNumber}` autocomplete using the same 300ms debounce boundary as `@` mention suggestions. The React Markdown projection now auto-links `@username`, same-project `#123`, `owner/project#123`, bare `http://`/`https://`, `ftp://`, `www.`, and email references. Readable issue references add legacy title/state metadata through `title` and `data-issue-state`; saved issue/PR/code/milestone/board Markdown surfaces now receive structured reference metadata from REST/proto payloads while keeping server-rendered Markdown HTML disabled.
- Phase 2N adds notification inbox/list, notification mail queue staging/drain, public project-target sharer mutation, and `ISSUE_STATE_CHANGED` receiver fan-out for single and mass-update issue close/reopen. Legacy external `/-_-api/v1` issue API compatibility is not an app follow-up; it is deferred to a separate migrator/export/import deliverable.

## Issue Label CSS Translation Rule

- Legacy `IssueLabelApp.labelStyles` serves `/:owner/:project/issue/labels.css` as `text/css`, renders `common/issueLabelColor.scala.html` label color rules, sets `ETag`, and returns 304 when `If-None-Match` matches.
- Rust preserves the same project read ACL and direct CSS route, generates the legacy `.issue-label[data-label-id]` / `.issue-label.active[data-label-id]` rules, and now returns `ETag` on 200 and 304 responses so issue, board, and project-dashboard label color consumers can reuse cached CSS.

## Route Module Diet Note

- 2026-06-19: REST issue meta route registration for `/api/v1/owners/:owner/projects/:project/issues/:number/watch|vote|favorite|assignee|sharers`, issue comment vote, project/issue assignable/sharable/mention/reference lookups, project labels/categories, and project milestones moved from monolithic `crates/server/src/lib.rs` into `crates/server/src/routes/issues.rs`. This is a registration-only build/check diet change; behavior remains covered by `rest_contract::rest_issue_meta_routes_manage_participation_assignment_sharing_and_comment_votes`, `issue_assignable_contract::project_assignable_users_searches_active_public_users`, `issue_reference_autocomplete_contract::issue_reference_autocomplete_contract_searches_and_orders_project_issues`, `issue_mention_contract::issue_mention_contract_suggests_contextual_users_and_filters_private_search`, `issue_label_contract::issue_label_legacy_routes_preserve_json_form_css_and_method_override`, and `milestone_contract::milestone_rpc_manages_crud_state_sorting_and_linked_issues`.

## Issue Detail Author Info Translation Rule

- Legacy `issue/view.scala.html` renders the issue author inside `.author-info` as an `.usf-group` profile link with `.avatar-wrap.smaller`, `.name`, and `.loginid`, using `User.findByLoginId(issue.authorLoginId).avatarUrl(32)` for the 20x20 image. Rust projects `ReadIssueDetailResponse.authorAvatarUrl` from the author user row and renders the same anchors in the React issue detail page.
- Legacy `issue/view.scala.html` renders assigned users with the same `.usf-group`, `.avatar-wrap.smaller`, `.name`, and `.loginid` anchor shape when the viewer cannot update assignment, while updateable assignment uses `partial_assignee.scala.html` data attributes for the select2 avatar. Rust projects `ReadIssueDetailResponse.assigneeAvatarUrl` from the assigned user row and renders a matching `.assignee-info` shell for assigned issues, falling back to the legacy no-assignee marker when unassigned.
- Legacy `issue/view.scala.html` wraps issue detail in `.page-wrap-outer`, `.project-page-wrap.board-view`, `.board-header.issue`, `.board-body.row-fluid`, `.span9.span-left-pane`, `.span3.right-menu`, and `.board-actrow.right-txt`; the state uses `.badge-issue-*`, labels use `.label.issue-label.list-label.active`, watch uses `#watch-button`, vote uses `#vote.vote-wrap`, and watcher count reserves `.watcher-list`. Rust now renders those legacy anchors in the React issue detail shell while continuing to use the existing REST detail projection for state, labels, watcher count, and voter count.
- Legacy `issue/view.scala.html` does not invoke issue deletion directly from the action row; it opens `#deleteConfirm.modal.hide.fade` with `issue.delete`, `post.delete.confirm`, and a `data-request-method="delete"` confirmation button. Rust now renders the same confirmation shell and keeps the existing issue delete mutation as the confirmed action.
- Legacy `partial_event_timeline.scala.html` renders non-body issue events as `li.event#event-*`, state/message spans, and `.date a[href="#event-*"]`; it hides `ISSUE_BODY_CHANGED` rows because body history is shown through the posting history modal. Rust now uses the existing `IssueTimelineItem` `oldValue`/`newValue`/`senderLoginId` fields to render state, assignee, milestone, sharer, and label event shells with legacy `.state`, add/delete classes, `.user-link`, and date anchors.
- Legacy `IssueApp.massUpdate` routes label attach/detach through `NotificationEvent.afterIssueLabelChanged` / `addWithoutSkipEvent`, so Rust mass-update now records `ISSUE_LABEL_CHANGED` timeline rows without draft-time merge and preserves added labels in `newValue` / removed labels in `oldValue`.

## Issue Markdown Attachment Upload Translation Rule

- Legacy `yobi.Files` attaches `paste` and `drop` handlers to issue markdown textareas and uploads image files to the attachment endpoint, while `yobi.Attachments` inserts `![name](url)` for image MIME types and tracks temporary upload ids for form submission.
- Rust implements the same issue body/comment editor behavior with `frontend/src/api/attachments.ts` and `IssueMentionTextarea`: pasted or dropped image files post to `/files` with the active CSRF token, insert the legacy image Markdown token at the cursor, and carry the uploaded ids into issue create/update and comment create/update `attachmentIds`.
- This rule is issue-scoped, but the same `/files` upload path is now reused by board, pull-request, milestone, non-ranged Git code comment/reply editors, and inline ranged Git code-comment reply editors. Single-line inline code-comment creation/readback and inline ranged reply upload belong to the code-browser provenance.

## Oxlint/React Doctor Parity Cleanup

- The lint/doctor blocker cleanup keeps the existing legacy issue list/detail/create/edit/comment shell and Markdown behavior while replacing React 19-invalid `javascript:`/empty-link scaffolding, missing avatar alt attributes, positive `tabIndex` props, and internal raw-HTML/Markdown loop patterns with equivalent safe React markup. Legacy-visible labels that needed clearer action names retain their former scalar through `data-legacy-label` where the rendered control text changed.
- Legacy basis remains `yona-original/app/views/issue/list.scala.html`, `yona-original/app/views/issue/view.scala.html`, `yona-original/app/views/issue/partial_comment.scala.html`, and `yona-original/public/javascripts/service/yobi.issue.View.js`; no issue mutation policy, route contract, or Markdown compatibility scope is intentionally changed by this cleanup.

## Phase 2A Evidence

| Evidence                                    | Rust target                                                                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy route/controller/view source checked | `IssueApp.java`, `issue/list.scala.html`, `issue/view.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `partial_comments.scala.html`, `partial_event_timeline.scala.html` |
| REST contract                               | `/api/v1/projects/:owner/:project/issues/**`, `/api/v1/owners/:owner/projects/:project/assignable-users`, `/api/v1/owners/:owner/projects/:project/issues/:number/**`, `crates/server/tests/issue_core_contract.rs`, `crates/server/tests/issue_assignable_contract.rs`                                  |
| Backend behavior                            | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs`                                                                                                                              |
| UI route surface                            | `frontend/src/routes/$owner/$projectName/issues`, `issueform`, `issue/$issueNumber`, `issue/$issueNumber/editform`                                                                        |
| Regression tests                            | `cargo test -p yoram-server --test issue_core_contract`                                                                                                                         |

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
| Regression tests         | `cargo test -p yoram-server --test issue_sharer_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx` |

## Phase 2G Evidence

| Evidence                 | Rust target                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy favorite API/model | `yona-original/app/controllers/api/UserApi.java#toggleFoveriteIssue`, `yona-original/app/models/FavoriteIssue.java`                            |
| Legacy user issue UI      | `IssueApp.userIssues`, `issue/my_partial_search.scala.html`, `issue/my_partial_list_quicksearch.scala.html`, `issue/view.scala.html`           |
| REST contract             | `/api/v1/user/issues`, `/api/v1/owners/:owner/projects/:project/issues/:number/favorite`, `ReadIssueDetailResponse.isFavorited`                 |
| Backend behavior          | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs`                                                                                   |
| UI route surface          | `frontend/src/routes/user/issues/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests          | `cargo test -p yoram-server --test user_issue_favorite_contract`; `pnpm --dir frontend test -- route-parity.spec.tsx auth-workspace-shell.spec.tsx` |

## Phase 2H Evidence

| Evidence                 | Rust target                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy comment vote source | `yona-original/app/controllers/VoteApp.java#voteComment`, `#unvoteComment`, `yona-original/app/models/IssueComment.java#addVoter`          |
| Legacy comment UI         | `yona-original/app/views/issue/partial_comment.scala.html`, `yona-original/public/javascripts/service/yobi.issue.View.js`                  |
| REST contract             | `/api/v1/owners/:owner/projects/:project/issues/:number/comments/:commentId/vote`, `IssueCommentVoter`, comment vote projection fields     |
| Backend behavior          | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`, direct POST compatibility routes       |
| UI route surface          | `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/app-view-models.ts` |
| Regression tests          | `cargo test -p yoram-server --test issue_comment_vote_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx route-parity.spec.tsx` |

## Phase 2J Evidence

| Evidence                 | Rust target                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy assignable source | `yona-original/app/controllers/api/IssueApi.java#findAssignableUsers`, `yona-original/app/models/Project.java#getAssignableUsersAndAssignee` |
| Legacy assignee UI       | `yona-original/app/views/issue/partial_assignee.scala.html`, `yona-original/app/views/issue/view.scala.html`                                |
| REST contract            | `/api/v1/owners/:owner/projects/:project/issues/:number/assignable-users`, `crates/server/tests/issue_assignable_contract.rs`               |
| Backend behavior         | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface         | `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/api/issue-meta.ts` |
| Regression tests         | `cargo test -p yoram-server --test issue_assignable_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts auth-workspace-shell.spec.tsx` |

## Phase 2K Evidence

| Evidence                 | Rust target                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy assignable source | `yona-original/app/controllers/api/IssueApi.java#findAssignableUsersOfProject`, `yona-original/app/views/issue/partial_assignee.scala.html` |
| REST contract            | `/api/v1/owners/:owner/projects/:project/assignable-users`, `crates/server/tests/issue_assignable_contract.rs`                              |
| Backend behavior         | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface         | `frontend/src/routes/$owner/$projectName/issueform/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/api/issue-meta.ts` |
| Regression tests         | `cargo test -p yoram-server --test issue_assignable_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts auth-workspace-shell.spec.tsx` |

## Phase 2L Evidence

| Evidence                    | Rust target                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy sharer UI/API source | `yona-original/public/javascripts/service/yona.issue.Sharer.js`, `yona-original/app/controllers/api/IssueApi.java#updateSharer`, `yona-original/app/views/issue/partial_event_timeline.scala.html` |
| Legacy mention source       | `yona-original/public/javascripts/common/yobi.Mention.js`, `yona-original/app/controllers/ProjectApp.java#mentionList`, `yona-original/app/models/Comment.java#updateMention`, `yona-original/app/models/AbstractPosting.java#updateMention`, `yona-original/test/models/NotificationEventTest.java#getNewMentionedUsers1` |
| REST contract               | `/api/v1/owners/:owner/projects/:project/issues/:number/sharable-users`, `/api/v1/owners/:owner/projects/:project/issues/:number/mention-users`, `crates/server/tests/issue_sharer_contract.rs`, `crates/server/tests/issue_mention_contract.rs` |
| Backend behavior            | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface            | `frontend/src/api/issue-meta.ts`, `frontend/src/auth-workspace-client.ts`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests            | `cargo test -p yoram-server --test issue_sharer_contract --test issue_mention_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts auth-workspace-shell.spec.tsx` |

## Phase 2M Evidence

| Evidence                       | Rust target                                                                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy issue reference source  | `yona-original/public/javascripts/common/yobi.Mention.js`, `yona-original/app/controllers/ProjectApp.java#mentionList`, `#getMentionIssueList` |
| REST contract                  | `/api/v1/owners/:owner/projects/:project/issue-references`, `crates/server/tests/issue_reference_autocomplete_contract.rs`                  |
| Backend behavior               | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface               | `frontend/src/api/issue-meta.ts`, `frontend/src/api/query-keys.ts`, `frontend/src/auth-workspace-client.ts`, `frontend/src/routes/$owner/$projectName/issueform/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/editform/route.tsx`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests               | `cargo test -p yoram-server --test issue_reference_autocomplete_contract --test issue_mention_contract --test rest_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx api-query.spec.ts` |

## Phase 2N Evidence

| Evidence                    | Rust target                                                                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy notification source  | `yona-original/app/controllers/NotificationApp.java`, `yona-original/app/views/index/notifications.scala.html`, `yona-original/app/views/index/partial_notifications.scala.html`, `yona-original/app/models/NotificationEvent.java`, `yona-original/app/models/NotificationMail.java` |
| Legacy sharer source        | `yona-original/app/controllers/api/IssueApi.java#findSharableUsers`, `#updateSharer`, `yona-original/public/javascripts/service/yona.issue.Sharer.js` |
| REST contract               | `/api/v1/notifications`, `/api/v1/projects/:owner/:project/issues/:number/state`, `/api/v1/owners/:owner/projects/:project/issues/:number/sharable-users`, `/api/v1/owners/:owner/projects/:project/issues/:number/sharers`, `crates/server/tests/notification_contract.rs`, `crates/server/tests/issue_sharer_contract.rs` |
| Backend behavior            | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface            | `frontend/src/routes/notification/route.tsx`, `frontend/src/api/notifications.ts`, `frontend/src/api/issue-meta.ts`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests            | `cargo test -p yoram-server --test notification_contract --test issue_sharer_contract`; `pnpm --dir frontend test -- auth-workspace-client.spec.ts route-parity.spec.tsx` |

Notification list projection follows the legacy `NotificationEvent.getMessage` direct-value cases for issue/post/comment create/update events and the legacy issue close/reopen message keys for `ISSUE_STATE_CHANGED`, while the inbox shell and paging remain backed by `/api/v1/notifications`.

## Remaining Phase 2 Follow-ups

- Legacy external `/-_-api/v1` issue API parity beyond the app-owned direct helper rows is deferred to a separate migrator/export/import deliverable, not the app server.

## Shared Surface Notes

- Phase 3A Code Browser changes may touch shared frontend client/view-model files that also serve issue routes. Those edits are contract plumbing only; they do not change issue lifecycle behavior or close any remaining Phase 2 issue follow-up.
- Issue sharer project-target parity is closed for app-owned surfaces: Rust preserves legacy `IssueApi.updateSharer` `type=project` expansion by applying share/unshare to all target project members, while unsupported non-legacy target types fail explicitly.
- 2026-06-18 env isolation note: issue and notification draft-merge timing now read through immutable `RepositoryConfig` on `AppRepository`, preserving the legacy `YONA_ISSUE_EVENT_DRAFT_TIME` / `YONA_NOTIFICATION_DRAFT_TIME` behavior while allowing repository tests to inject config without mutating process-global env.
- 2026-06-25 subtask state i18n tightening: issue detail subtask parent-state
  markers keep the legacy `issue.state.*` key names at the React call site but
  now resolve them through the legacy message table instead of rendering raw
  keys such as `issue.state.open` into the visible page. Focused coverage:
  `frontend/src/issue-detail-shell.spec.tsx` and `frontend/src/i18n.spec.tsx`.
- 2026-06-25 issue label settings provider-less i18n tightening: the issue
  label settings React route keeps the legacy label/settings key names but now
  resolves known keys through the default legacy message table when rendered
  without an app runtime provider, preventing raw placeholders and action copy
  such as `project.owner`, `label.add`, or `button.delete` from being accepted
  as visible UI. Focused coverage:
  `frontend/src/issue-label-settings-i18n.spec.tsx`.
- 2026-06-25 issue detail timeline/autocomplete i18n tightening: issue detail
  timeline events and assignable-user empty states now keep the legacy event
  and status key names but resolve them through the legacy message table before
  rendering, so raw values such as `issue.event.closed`,
  `issue.event.label.added`, and `title.no.results` are no longer accepted as
  visible issue-detail UI. Focused coverage:
  `frontend/src/issue-detail-shell.spec.tsx`.
- 2026-06-26 template-first P3 compact comment index correction: issue detail
  now restores the legacy right-sidebar `.issue-info #comments` compact comment
  index from `issue/partial_index_comments.scala.html` and
  `issue/partial_index_comment.scala.html`, including `.comment.index-comment`,
  `data-location`, `#comment-body-$id`, `.index-comment-author`,
  `.comment-exists`, `.comment_author`, `.ago-date`, and hidden `.share-link`
  anchors. Focused coverage: `frontend/src/issue-detail-shell.spec.tsx`.
- 2026-06-26 template-first P3 comment update form correction: issue comment
  edit now restores the legacy upload label/input shell and authored-only
  notification mail checkbox from `common/commentUpdateForm.scala.html`,
  including `.file-upload__label`, `.file-upload__input`, `.send-notification-check`,
  `notificationMail=yes`, and server/frontend propagation of `authorId` plus
  `viewerUserId` for the legacy authored condition. Focused coverage:
  `frontend/src/issue-detail-shell.spec.tsx`.
- 2026-06-26 template-first P3 full comment voter correction: issue comment
  action rows now follow `issue/partial_comment.scala.html` and
  `issue/partial_voter_list.scala.html` for voter display, rendering
  `.avatar-wrap.smaller` links at the inline threshold and
  `.vote-description-people[href=#voters-$id]` with
  `#voters-$id.modal.hide.voters-dialog` for overflow voters. Focused
  coverage: `frontend/src/issue-detail-shell.spec.tsx` and
  `frontend/src/auth-workspace-shell.spec.tsx`.
- 2026-06-26 template-first P3 tasklist bar evidence: issue and comment
  markdown bodies now have route-level selector proof for the legacy
  `common/tasklistBar.scala.html` shell before rendered markdown, including
  `.tasklist.task-show`, `.task-title .done-counter`, `.task-progress`, and
  `.bar.red[title=Tasklist]`. Focused coverage:
  `frontend/src/issue-detail-shell.spec.tsx`; renderer coverage remains in
  `frontend/src/markdown-renderer.spec.tsx`.
