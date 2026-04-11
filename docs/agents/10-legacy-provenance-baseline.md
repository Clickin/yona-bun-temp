# 10) Legacy Provenance Baseline

## Purpose

- 이 문서는 Rust pivot 이후 legacy provenance baseline을 고정한다.
- canonical rules는 `SPEC.md`에 있고, 이 문서는 source-path와 target-layer 매핑의 mirror다.
- root mixed code는 reference-only source material로 명시적으로 남긴다.

## Required Fields

- source legacy path
- extracted intent summary
- current mixed-code reference path
- Rust translation target layer
- canonical owner path
- `gap`, `deviation`, `deferred` 규칙

## Baseline Matrix

| Capability | Legacy source paths | Extracted intent | Current mixed-code reference | Rust translation target layer | Canonical owner path |
| --- | --- | --- | --- | --- | --- |
| Auth | `UserAppTest.java`, `PasswordResetAppTest.java`, `UserTest.java` | login/register/reset, permission, token, audit, user-state semantics | `frontend/src/lib/auth-trpc.ts`, `packages/auth/*` | domain test, Rust HTTP/RPC contract test, Playwright E2E | `yona-rust/crates/server`, `yona-rust/crates/domain`, `yona-rust/frontend` |
| ACL | `AccessControlTest.java`, `RoleTest.java`, `ProjectUserTest.java` | resource-scoped create/read/update/delete matrix | `packages/domain/*authorization*` | Rust domain ACL test, route authorization test | `yona-rust/crates/domain`, `yona-rust/crates/server` |
| Issue | `IssueAppTest.java`, `IssueTest.java`, `WatchTest.java` | issue lifecycle, watcher/voter/assignee semantics, permission boundaries | `frontend/src/lib/issue-trpc.ts`, `packages/domain`, `packages/db` | Rust domain test, Rust contract test, Playwright E2E | `yona-rust/crates/domain`, `yona-rust/crates/persistence`, `yona-rust/frontend` |
| Project | `ProjectAppTest.java`, `EnrollProjectAppTest.java`, `ProjectTest.java`, `OrganizationTest.java`, `RecentlyVisitedProjectsTest.java` | project/org CRUD, enrollment, visibility, recent/favorite semantics | `frontend/src/lib/project-trpc.ts`, `organization-trpc.ts`, `enrollment-trpc.ts` | Rust domain test, Rust contract test, Playwright E2E | `yona-rust/crates/domain`, `yona-rust/crates/persistence`, `yona-rust/crates/server`, `yona-rust/frontend` |
| PR / Review | `PullRequestAppTest.java`, `ReviewThreadAppTest.java`, `PullRequestTest.java`, `PullRequestEventTest.java` | PR state machine, reviewer constraints, review-thread lifecycle | `frontend/src/lib/pull-request-trpc.ts` | Rust domain test, Rust contract test, Playwright E2E | `yona-rust/crates/domain`, `yona-rust/crates/server`, `yona-rust/frontend` |
| Git / Repository | `GitRepositoryTest.java`, `RepositoryServiceTest.java`, `CommitCommentTest.java`, `CommentThreadTest.java` | smart HTTP, inline edit conflict handling, commit discussion lifecycle | `frontend/src/lib/repo-trpc.ts`, `repo-http.ts`, `packages/vcs/*` | protocol integration test, server route test, Rust domain test | `yona-rust/crates/vcs`, `yona-rust/crates/server`, `yona-rust/frontend` |
| Search | `SearchTests.java`, `SearchResultTests.java`, `AccessControlTest.java` | permission-filtered search scope and filter semantics | `frontend/src/lib/search-trpc.ts`, `packages/domain`, `packages/db` | Rust domain test, DB parity test, Rust contract test, Playwright E2E | `yona-rust/crates/search`, `yona-rust/crates/persistence`, `yona-rust/crates/server`, `yona-rust/frontend` |

## Translation Notes

- controller-origin behavior는 Rust HTTP/RPC contract test 또는 route test로 번역한다.
- model-origin behavior는 isolated domain test로 번역한다.
- root mixed code는 target architecture가 아니라 contract snapshot과 workflow hint다.
- provenance는 legacy source와 Rust target을 잇는 다리이지, old stack baseline을 유지하는 장치가 아니다.
