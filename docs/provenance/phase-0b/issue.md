# Issue Provenance

## Scope

- Phase 2A issue core parity slice
- Issue list/detail/create/edit/delete, comments, state mutation, watch/vote/assignee, mass update, Markdown rendering, issue/comment attachment binding, and core Issue Sharer read/comment authorization now have Rust canonical coverage.
- Label/category and milestone management screens are now covered by Phase 2B/2C provenance. Phase 2A issue core only owns issue CRUD and issue-linked label/milestone consumption.

## Legacy Sources

- `yona-original/test/controllers/IssueAppTest.java`
- `yona-original/test/models/IssueTest.java`
- `yona-original/app/controllers/IssueApp.java`
- `yona-original/app/models/IssueSharer.java`
- `yona-original/app/utils/AccessControl.java`
- `yona-original/app/controllers/api/IssueApi.java`
- `yona-original/app/views/issue/view.scala.html`

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

## Remaining Phase 2 Follow-ups

- REST `/-_-api/v1` issue API parity.
- Sharable user autocomplete/search, shared-with-me issue filter, Issue Sharer changed timeline/notification semantics, mention autocomplete notification semantics, comment vote UI, favorite issue workspace surface, and organization/user aggregate issue lists.

## Shared Surface Notes

- Phase 3A Code Browser changes may touch shared frontend client/view-model files that also serve issue routes. Those edits are contract plumbing only; they do not change issue lifecycle behavior or close any remaining Phase 2 issue follow-up.
