# 10) Legacy Provenance Baseline

## Purpose

- This document fixes the initial legacy provenance baseline for the Go migration wave.
- Canonical rules still live in `SPEC.md`; this file is an execution mirror for exact source-path and target-layer mapping.
- Current TS implementation paths are now explicit migration source material and must be cited when they preserve useful behavior or contract detail.

## Required Fields

- source legacy path
- extracted intent summary
- current TS source path
- modern Go translation target layer
- target ownership
- deviation rule

## Baseline Matrix

| Capability       | Legacy source paths                                                                                                                 | Extracted intent                                                              | Current TS source material                                                       | Modern translation target layer                                           | Target ownership                                                   |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Auth             | `yona-original/test/controllers/UserAppTest.java` `PasswordResetAppTest.java` `UserTest.java`                                       | login/register/reset flows, permission, token, audit, user-state semantics    | `apps/app/src/lib/auth-trpc.ts`, `packages/auth/*`                               | domain test, Go handler/API contract test, Playwright E2E                 | `internal/auth`, `internal/domain`, `internal/httpapi`, `apps/app` |
| ACL              | `AccessControlTest.java`, `RoleTest.java`, `ProjectUserTest.java`                                                                   | resource-scoped create/read/update/delete matrix                              | `packages/domain/*authorization*`                                                | domain ACL test, route authorization test                                 | `internal/domain`, `internal/httpapi`                              |
| Issue            | `IssueAppTest.java`, `IssueTest.java`, `WatchTest.java`                                                                             | issue lifecycle, watcher/voter/assignee semantics, permission boundaries      | `apps/app/src/lib/issue-trpc.ts`, `packages/domain`, `packages/db`               | domain test, Go handler/API contract test, Playwright E2E                 | `internal/domain`, `internal/db`, `internal/httpapi`, `apps/app`   |
| Project          | `ProjectAppTest.java`, `EnrollProjectAppTest.java`, `ProjectTest.java`, `OrganizationTest.java`, `RecentlyVisitedProjectsTest.java` | project/org CRUD, enrollment, visibility, recent/favorite workspace semantics | `apps/app/src/lib/project-trpc.ts`, `organization-trpc.ts`, `enrollment-trpc.ts` | domain test, Go handler/API contract test, Playwright E2E                 | `internal/domain`, `internal/db`, `internal/httpapi`, `apps/app`   |
| PR / Review      | `PullRequestAppTest.java`, `ReviewThreadAppTest.java`, `PullRequestTest.java`, `PullRequestEventTest.java`                          | PR state machine, reviewer constraints, review-thread lifecycle               | `apps/app/src/lib/pull-request-trpc.ts`                                          | domain test, Go handler/API contract test, Playwright E2E                 | `internal/domain`, `internal/db`, `internal/httpapi`, `apps/app`   |
| Git / Repository | `GitRepositoryTest.java`, `RepositoryServiceTest.java`, `CommitCommentTest.java`, `CommentThreadTest.java`                          | smart HTTP, inline edit conflict handling, commit discussion/thread lifecycle | `apps/app/src/lib/repo-trpc.ts`, `repo-http.ts`, `packages/vcs/*`                | protocol integration test, server route test, domain test                 | `internal/vcs`, `internal/domain`, `internal/httpapi`, `apps/app`  |
| Search           | `SearchTests.java`, `SearchResultTests.java`, `AccessControlTest.java`                                                              | permission-filtered search scope and filter semantics                         | `apps/app/src/lib/search-trpc.ts`, `packages/domain`, `packages/db`              | domain test, DB parity test, Go handler/API contract test, Playwright E2E | `internal/search`, `internal/db`, `internal/httpapi`, `apps/app`   |

## Translation Notes

- Controller-origin behavior should map to Go handler/API contract tests unless full protocol semantics are required, in which case it maps to server-route tests.
- Model-origin behavior should map to isolated domain tests first.
- Git/SVN and future `llms.txt` style routes are server-route territory.
- Current TS `tRPC` procedures are not the target architecture, but they are valuable contract snapshots and migration input.

## Exit Condition

- Every migration slice must cite at least one legacy source and one current TS source.
- No feature can be called complete without the corresponding Red test and modern Go target-layer trace.
