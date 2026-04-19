# Issue Provenance

## Scope

- Phase 2A issue core parity slice
- Issue list/detail/create/edit/delete, comments, state mutation, watch/vote/assignee, mass update, Markdown rendering, and issue/comment attachment binding now have Rust canonical coverage.
- Label/category and milestone management screens remain Phase 2 follow-up scope; Phase 2A only consumes read-only label/milestone options from issue forms and filters.

## Legacy Sources

- `yona-original/test/controllers/IssueAppTest.java`
- `yona-original/test/models/IssueTest.java`
- `yona-original/app/controllers/IssueApp.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `reference/mixed-code/frontend/src/lib/issue-trpc.ts`, `reference/mixed-code/packages/domain/*issue*`
- canonical implementation path: `repo root`
- canonical owner path: `crates/domain`, `crates/server`, `frontend`

## Exemplar

The first issue provenance trace for this batch is the edit matrix in `IssueAppTest`.

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `IssueAppTest.testInit` | private-project fixture roles define site admin, manager, member, author, assignee, and outsider semantics | domain fixture setup in `crates/domain` |
| `IssueAppTest.editByAuthor` | author can edit own issue | issue authorization exemplar in `crates/domain` |
| `IssueAppTest.editByAssignee` | assignee can edit even without project membership | issue authorization exemplar in `crates/domain` |
| `IssueAppTest.editByManager` | project manager can edit | issue authorization exemplar in `crates/domain` |
| `IssueAppTest.editByMember` | project member can edit | issue authorization exemplar in `crates/domain` |
| `IssueAppTest.editByAdmin` | site admin can edit | issue authorization exemplar in `crates/domain` |
| `IssueAppTest.editByNonmember` | public visibility does not grant edit rights to outsiders | issue authorization exemplar in `crates/domain` plus route test in `crates/server` |

## Batch Translation Rule

- Phase 2A closes the previous small authorization-only issue slice for core issue CRUD and participation flows.
- `IssueAppTest.postByNonmember` and `commentByNonmember` are translated as authenticated public-project create/comment permission in `crates/server/tests/issue_core_contract.rs`.
- `IssueAppTest.editBy*` and `deleteBy*` are translated as issue-specific mutation guard: author, assignee, project member, project manager, organization admin, or site admin can mutate; public-project outsider cannot edit another user's issue.
- `IssueTest.watchDefault`, watch/unwatch, vote, comment timeline, and Markdown/XSS expectations are covered by `issue_core_contract_creates_reads_comments_and_sanitizes_markdown`.

## Phase 2A Evidence

| Evidence | Rust target |
| --- | --- |
| Legacy route/controller/view source checked | `IssueApp.java`, `issue/list.scala.html`, `issue/view.scala.html`, `issue/create.scala.html`, `issue/edit.scala.html`, `partial_comments.scala.html`, `partial_event_timeline.scala.html` |
| Contract expansion | `proto/yona/pilot/v1/pilot.proto` Issue RPCs and generated frontend bindings |
| Backend behavior | `crates/persistence/src/repo.rs`, `crates/server/src/lib.rs` |
| UI route surface | `frontend/src/routes/$owner/$projectName/issues`, `issueform`, `issue/$issueNumber`, `issue/$issueNumber/editform` |
| Regression tests | `cargo test -p yona-rust-pilot-server --test issue_core_contract` |

## Remaining Phase 2 Follow-ups

- Project label/category management screens and create/update/delete flows.
- Milestone list/detail/create/edit/delete/open/close screens.
- REST `/-_-api/v1` issue API parity.
- Issue sharer, mention autocomplete notification semantics, comment vote UI, favorite issue workspace surface, and organization/user aggregate issue lists.
