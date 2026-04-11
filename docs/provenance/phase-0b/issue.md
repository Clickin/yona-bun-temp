# Issue Provenance

## Scope

- First issue authorization exemplar only
- No full issue CRUD claim

## Legacy Sources

- `yona-original/test/controllers/IssueAppTest.java`
- `yona-original/test/models/IssueTest.java`
- `yona-original/app/controllers/IssueApp.java`

## Current Baseline And Canonical Target

- current mixed-code reference: `frontend/src/lib/issue-trpc.ts`, `packages/domain/*issue*`
- canonical implementation path: `yona-rust/`
- canonical owner path: `yona-rust/crates/domain`, `yona-rust/crates/server`, `yona-rust/frontend`

## Exemplar

The first issue provenance trace for this batch is the edit matrix in `IssueAppTest`.

| Legacy source | Intent | Rust translation target |
| --- | --- | --- |
| `IssueAppTest.testInit` | private-project fixture roles define site admin, manager, member, author, assignee, and outsider semantics | domain fixture setup in `yona-rust/crates/domain` |
| `IssueAppTest.editByAuthor` | author can edit own issue | issue authorization exemplar in `yona-rust/crates/domain` |
| `IssueAppTest.editByAssignee` | assignee can edit even without project membership | issue authorization exemplar in `yona-rust/crates/domain` |
| `IssueAppTest.editByManager` | project manager can edit | issue authorization exemplar in `yona-rust/crates/domain` |
| `IssueAppTest.editByMember` | project member can edit | issue authorization exemplar in `yona-rust/crates/domain` |
| `IssueAppTest.editByAdmin` | site admin can edit | issue authorization exemplar in `yona-rust/crates/domain` |
| `IssueAppTest.editByNonmember` | public visibility does not grant edit rights to outsiders | issue authorization exemplar in `yona-rust/crates/domain` plus route test in `yona-rust/crates/server` |

## Batch Translation Rule

- 이 slice는 small authorization trace만 고정한다.
- full issue CRUD, watcher/voter/assignee lifecycle, timeline semantics는 후속 gap이다.
