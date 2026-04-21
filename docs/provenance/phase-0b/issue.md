# Issue Provenance

## Scope

- Phase 2A issue core parity slice
- Issue list/detail/create/edit/delete, comments, comment vote, state mutation, watch/vote/favorite/assignee, mass update, Markdown rendering, issue/comment attachment binding, core Issue Sharer read/comment authorization, and `/user/issues` personal issue aggregation now have Rust canonical coverage.
- Label/category and milestone management screens are now covered by Phase 2B/2C provenance. Phase 2A issue core only owns issue CRUD and issue-linked label/milestone consumption.

## Legacy Sources

- `yona-original/test/controllers/IssueAppTest.java`
- `yona-original/test/models/IssueTest.java`
- `yona-original/app/controllers/IssueApp.java`
- `yona-original/app/controllers/VoteApp.java`
- `yona-original/app/models/IssueComment.java`
- `yona-original/app/models/IssueSharer.java`
- `yona-original/app/utils/AccessControl.java`
- `yona-original/app/controllers/api/IssueApi.java`
- `yona-original/app/controllers/api/UserApi.java`
- `yona-original/app/models/FavoriteIssue.java`
- `yona-original/app/views/issue/view.scala.html`
- `yona-original/app/views/issue/partial_comment.scala.html`
- `yona-original/app/views/issue/my_partial_search.scala.html`
- `yona-original/app/views/issue/my_partial_list_quicksearch.scala.html`
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
- Legacy `IssueApi.updateSharer` is an internal screen mutation. Rust implements this as ConnectRPC `ShareIssue` and `UnshareIssue`; no new REST endpoint is added in this phase.
- Legacy `issue/view.scala.html` renders the `sharer-list` sidebar near issue metadata. Rust issue detail renders the direct sharer count/list and login ID add/remove controls when `viewerCanManageSharers` is true.

## Phase 2G Favorite/User Issue Translation Rule

- Legacy `UserApi.toggleFoveriteIssue` toggles `favorite_issue(user, issue)` rows and updates the issue detail star. Rust implements this as ConnectRPC `ToggleFavoriteIssue` and projects `ReadIssueDetailResponse.isFavorited`; no `/-_-api/v1/favoriteIssues` endpoint is added in this phase.
- Legacy `IssueApp.userIssues` defaults to assigned-to-me when no condition is supplied and renders the personal quick filters from `my_partial_list_quicksearch.scala.html`. Rust implements `/user/issues` with assigned/authored/commented/mentioned/shared/favorite filters over ConnectRPC `ListUserIssues`.
- The mentioned filter reads existing `mention` rows only. Mention parsing, autocomplete, and notification semantics remain separate follow-ups.

## Phase 2H Issue Comment Vote Translation Rule

- Legacy `VoteApp.voteComment` and `IssueComment.addVoter` add `issue_comment_voter(issue_comment_id, user_id)` idempotently. Rust implements this as ConnectRPC `VoteIssueComment` and returns refreshed `ReadIssueDetailResponse`.
- Legacy `VoteApp.unvoteComment` fails when the current user has not voted the comment. Rust preserves that policy through ConnectRPC `UnvoteIssueComment` returning NOT_FOUND for a missing voter row.
- Legacy `partial_comment.scala.html` renders voter count/names/avatars and a heart state in the issue comment row. Rust projects `IssueComment.voterCount`, `viewerHasVoted`, and `voters`, then renders the count/list and vote/unvote heart control in the current React issue detail timeline row.
- Legacy direct POST routes `/:user/:project/issue/:number/comment/:commentId/vote` and `/unvote` are not mounted in this phase because the canonical surface is ConnectRPC-first; direct route compatibility remains a separate follow-up from REST API parity.

## Phase 2A Evidence

| Evidence                                    | Rust target                                                                                                                                                                               |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy route/controller/view source checked | `IssueApp.java`, `issue/list.scala.html`, `issue/view.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `partial_comments.scala.html`, `partial_event_timeline.scala.html` |
| Contract expansion                          | `proto/yona/pilot/v1/pilot.proto` Issue RPCs and generated frontend bindings                                                                                                              |
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
| Contract expansion       | `proto/yona/pilot/v1/pilot.proto` `IssueSharer`, `ShareIssue`, `UnshareIssue`                                                    |
| Backend behavior         | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs`                                                                     |
| UI route surface         | `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`                   |
| Regression tests         | `cargo test -p yona-rust-pilot-server --test issue_sharer_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx` |

## Phase 2G Evidence

| Evidence                 | Rust target                                                                                                                                    |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy favorite API/model | `yona-original/app/controllers/api/UserApi.java#toggleFoveriteIssue`, `yona-original/app/models/FavoriteIssue.java`                            |
| Legacy user issue UI      | `IssueApp.userIssues`, `issue/my_partial_search.scala.html`, `issue/my_partial_list_quicksearch.scala.html`, `issue/view.scala.html`           |
| Contract expansion        | `proto/yona/pilot/v1/pilot.proto` `ListUserIssues`, `ToggleFavoriteIssue`, `ReadIssueDetailResponse.isFavorited`                               |
| Backend behavior          | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs`                                                                                   |
| UI route surface          | `frontend/src/routes/user/issues/route.tsx`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx` |
| Regression tests          | `cargo test -p yona-rust-pilot-server --test user_issue_favorite_contract`; `pnpm --dir frontend test -- route-parity.spec.tsx auth-workspace-shell.spec.tsx` |

## Phase 2H Evidence

| Evidence                 | Rust target                                                                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Legacy comment vote source | `yona-original/app/controllers/VoteApp.java#voteComment`, `#unvoteComment`, `yona-original/app/models/IssueComment.java#addVoter`          |
| Legacy comment UI         | `yona-original/app/views/issue/partial_comment.scala.html`, `yona-original/public/javascripts/service/yobi.issue.View.js`                  |
| Contract expansion        | `proto/yona/pilot/v1/pilot.proto` `VoteIssueComment`, `UnvoteIssueComment`, `IssueCommentVoter`, comment vote projection fields            |
| Backend behavior          | `crates/persistence/src/repo.rs`, `crates/persistence/src/repo_types.rs`, `crates/server/src/lib.rs`                                        |
| UI route surface          | `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `frontend/src/routes/-issue-views.tsx`, `frontend/src/app-view-models.ts` |
| Regression tests          | `cargo test -p yona-rust-pilot-server --test issue_comment_vote_contract`; `pnpm --dir frontend test -- auth-workspace-shell.spec.tsx route-parity.spec.tsx` |

## Remaining Phase 2 Follow-ups

- REST `/-_-api/v1` issue API parity.
- Legacy direct comment-vote POST route compatibility.
- Sharable user autocomplete/search, Issue Sharer changed timeline/notification semantics, and mention autocomplete/creation/notification semantics.

## Shared Surface Notes

- Phase 3A Code Browser changes may touch shared frontend client/view-model files that also serve issue routes. Those edits are contract plumbing only; they do not change issue lifecycle behavior or close any remaining Phase 2 issue follow-up.
