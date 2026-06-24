# 10) Legacy Provenance Baseline

## Purpose

- 이 문서는 Rust pivot 이후 legacy provenance baseline을 고정한다.
- canonical rules는 `SPEC.md`에 있고, 이 문서는 source-path와 target-layer 매핑의 mirror다.
- legacy source는 `yona-original/`이다. `reference/mixed-code/**`는 legacy reference가 아니다.

## Required Fields

- source legacy path
- extracted intent summary
- Rust translation target layer
- canonical owner path
- `gap`, `deviation`, `deferred` 규칙

## Baseline Matrix

| Capability | Legacy source paths | Extracted intent | Rust translation target layer | Canonical owner path |
| --- | --- | --- | --- | --- |
| Auth | `UserAppTest.java`, `PasswordResetAppTest.java`, `UserTest.java` | login/register/reset, permission, token, audit, user-state semantics | domain test, Rust HTTP/REST contract test, Playwright E2E | `crates/server`, `crates/domain`, `frontend` |
| ACL | `AccessControlTest.java`, `RoleTest.java`, `ProjectUserTest.java` | resource-scoped create/read/update/delete matrix | Rust domain ACL test, route authorization test | `crates/domain`, `crates/server` |
| Issue | `IssueAppTest.java`, `IssueTest.java`, `WatchTest.java`, `IssueApp.newDirectIssueForm`, `IssueApp.newDirectMyIssueForm`, `IssueComment` | issue lifecycle, watcher/voter/assignee semantics, comment-derived issue creation, direct my-issue project target selection, parent-comment linkage, permission boundaries | Rust domain test, Rust contract test, Playwright E2E | `crates/domain`, `crates/persistence`, `frontend` |
| Project | `ProjectAppTest.java`, `EnrollProjectAppTest.java`, `ProjectTest.java`, `OrganizationTest.java`, `RecentlyVisitedProjectsTest.java` | project/org CRUD, enrollment, visibility, recent/favorite semantics | Rust domain test, Rust contract test, Playwright E2E | `crates/domain`, `crates/persistence`, `crates/server`, `frontend` |
| PR / Review | `PullRequestAppTest.java`, `ReviewThreadAppTest.java`, `PullRequestTest.java`, `PullRequestEventTest.java` | PR state machine, reviewer constraints, review-thread lifecycle | Rust domain test, Rust contract test, Playwright E2E | `crates/domain`, `crates/server`, `frontend` |
| Git / Repository | `GitRepositoryTest.java`, `RepositoryServiceTest.java`, `CommitCommentTest.java`, `CommentThreadTest.java` | smart HTTP, inline edit conflict handling, commit discussion lifecycle | protocol integration test, server route test, Rust domain test | `crates/vcs`, `crates/server`, `frontend` |
| Search | `SearchTests.java`, `SearchResultTests.java`, `AccessControlTest.java` | permission-filtered search scope and filter semantics | Rust domain test, DB parity test, Rust contract test, Playwright E2E | `crates/search`, `crates/persistence`, `crates/server`, `frontend` |

## Translation Notes

- controller-origin behavior는 Rust HTTP/REST contract test 또는 route test로 번역한다.
- model-origin behavior는 isolated domain test로 번역한다.
- provenance는 legacy source와 Rust target을 잇는 다리이지, old stack baseline을 유지하는 장치가 아니다.
- Persistence record layout changes that do not alter legacy behavior may keep the same
  canonical owner path and public Rust target layer while moving volatile compatibility
  DTOs into narrower modules. The 2026-06-17 `IssueCommentNotificationReceiverRecord`
  split keeps the legacy `IssueApi.commentNotiRecivers` translation contract unchanged
  and was verified with `cargo check -p yona-rust-persistence` (cold sandbox check:
  5m25s; immediate no-change check: 0.36s).
