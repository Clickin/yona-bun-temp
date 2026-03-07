# 10) Legacy Provenance Baseline

## Purpose

- This document fixes the initial Phase 0B legacy provenance baseline for the first migration wave.
- Canonical rules still live in `SPEC.md`; this file is an execution mirror for exact source-path and target-layer mapping.

## Required Fields

- source legacy path
- extracted intent summary
- modern translation target layer
- target ownership
- deviation rule

## Baseline Matrix

| Capability       | Legacy source paths                                                                                                                                                                                                                                                                     | Extracted intent                                                                                                     | Modern translation target layer                                                                       | Target ownership                                                     | Deviation rule                                                                                                 |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Auth             | `yona-original/test/controllers/UserAppTest.java`<br>`yona-original/test/controllers/PasswordResetAppTest.java`<br>`yona-original/test/models/UserTest.java`<br>`yona-original/test/models/PasswordResetTest.java`                                                                      | login/register/reset flows preserve permission, token, audit, and user-state semantics                               | `tRPC` procedure test + `serverFunction` adapter test, server route test, domain test, Playwright E2E | `packages/auth`, `packages/domain`, `packages/contracts`, `apps/app` | redirect/form contracts may become typed TanStack results, but permission and token semantics must stay intact |
| ACL              | `yona-original/test/utils/AccessControlTest.java`<br>`yona-original/test/models/RoleTest.java`<br>`yona-original/test/models/ProjectUserTest.java`                                                                                                                                      | resource-scoped create/read/update/delete permission matrix is the source of truth                                   | domain ACL test, route authorization test                                                             | `packages/domain`, `apps/app`                                        | transport-level status/redirect shape may change, but allow/deny matrix may not                                |
| Issue            | `yona-original/test/controllers/IssueAppTest.java`<br>`yona-original/test/models/IssueTest.java`<br>`yona-original/test/models/WatchTest.java`                                                                                                                                          | issue lifecycle, watcher/voter/assignee semantics, comment side effects, and permission boundaries must be preserved | domain test, `tRPC` procedure test + `serverFunction` adapter test, Playwright E2E                    | `packages/domain`, `packages/contracts`, `apps/app`                  | redirect assertions can become typed mutation/error contracts; state transitions cannot drift                  |
| Project          | `yona-original/test/controllers/ProjectAppTest.java`<br>`yona-original/test/controllers/EnrollProjectAppTest.java`<br>`yona-original/test/models/ProjectTest.java`<br>`yona-original/test/models/OrganizationTest.java`<br>`yona-original/test/models/RecentlyVisitedProjectsTest.java` | project/org CRUD, enrollment request/cancel, visibility, recent/favorite workspace semantics are preserved           | domain test, `tRPC` procedure test + `serverFunction` adapter test, Playwright E2E                    | `packages/domain`, `packages/contracts`, `apps/app`                  | page composition may change, but visibility and enrollment semantics may not                                   |
| PR / Review      | `yona-original/test/controllers/PullRequestAppTest.java`<br>`yona-original/test/controllers/ReviewThreadAppTest.java`<br>`yona-original/test/models/PullRequestTest.java`<br>`yona-original/test/models/PullRequestEventTest.java`                                                      | PR state machine, reviewer constraints, review thread lifecycle, and unauthorized transition failures are preserved  | domain test, `tRPC` procedure test + `serverFunction` adapter test, Playwright E2E                    | `packages/domain`, `packages/contracts`, `apps/app`                  | UI flow may differ, but transition guardrails and review lifecycle must match                                  |
| Git / Repository | `yona-original/test/playRepository/GitRepositoryTest.java`<br>`yona-original/test/playRepository/RepositoryServiceTest.java`<br>`yona-original/test/models/CommitCommentTest.java`<br>`yona-original/test/models/CommentThreadTest.java`                                                | smart HTTP, repository mutation, inline edit conflict handling, commit discussion/thread lifecycle must be preserved | protocol integration test, server route test, domain test                                             | `packages/vcs`, `packages/domain`, `packages/contracts`, `apps/app`  | route framework may change, but raw HTTP/protocol semantics and thread rules may not                           |
| Search           | `yona-original/test/models/SearchTests.java`<br>`yona-original/test/models/SearchResultTests.java`<br>`yona-original/test/utils/AccessControlTest.java`                                                                                                                                 | searchable scope is permission-filtered and parity is about filter semantics/coverage rather than identical ranking  | domain test, DB parity test, `tRPC` procedure test + `serverFunction` adapter test, Playwright E2E    | `packages/domain`, `packages/db`, `packages/contracts`, `apps/app`   | ranking/tokenizer may vary by dialect, but permission filtering and filter semantics may not                   |

## First Exemplars

- Auth: login and password-reset denial/success flow from `UserAppTest` and `PasswordResetAppTest`.
- ACL: project visibility and write denial matrix from `AccessControlTest`.
- Issue: watcher/voter/assignee propagation and edit authorization from `IssueTest` and `IssueAppTest`.
- Project: enrollment request/cancel and recent workspace semantics from `EnrollProjectAppTest` and `RecentlyVisitedProjectsTest`.
- PR: open/close/reopen and unauthorized transition denial from `PullRequestAppTest` and `PullRequestTest`.
- Git: inline edit conflict and smart HTTP auth from `RepositoryServiceTest` and `GitRepositoryTest`.
- Search: permission-filtered result set from `SearchTests`, `SearchResultTests`, and `AccessControlTest`.

## Wave 1 Auth / ACL Baseline

- `UserAppTest.login_notComfirmedUser` and `authenticateWithPlainPassword*` now map to `packages/domain/src/auth-policy.spec.ts`, which freezes the first anonymous-vs-authenticated decision contract and keeps unconfirmed users out of authenticated sessions.
- `PasswordResetAppTest.testRequestResetPassword_validLoginIdAndEmailAddress` now maps to `packages/contracts/src/auth.spec.ts`, which fixes the first typed request contract for password-reset initiation.
- `AccessControlTest.isAllowed_siteAdmin`, `isAllowed_projectCreator`, `isAllowed_notAMember`, and `isAllowed_resource_to_group_member` now map to `packages/domain/src/project-authorization.spec.ts`, which freezes the first public/protected read-write matrix for site admin, manager, member, and anonymous actors.
- `apps/app` now reserves `/api/auth/provider/:provider/callback` as the canonical OAuth callback contract, but GitHub/Google provider exchange is still an explicit pending migration item rather than a completed Wave 1 feature.
- These are Wave-1 baselines only. They are not full feature completion proofs and must be extended by later `tRPC` procedure/`serverFunction` adapter/server-route tests in `apps/app` and `packages/auth`.

## Translation Notes

- Controller-origin behavior should map to `tRPC` procedure tests + `serverFunction` adapter tests unless full HTTP semantics are required, in which case it maps to server-route tests.
- Model-origin behavior should map to isolated `packages/domain` tests first.
- Git/smart HTTP and future `llms.txt`-style raw routes are server-route territory, not app-internal RPC.
- If a source path has no direct one-to-one transport equivalent, record the transport deviation but keep the behavior and permission meaning.

## Exit Condition For Wave 1

- Every wave-1 implementation PR must cite at least one row from this matrix.
- No feature can be called complete without the corresponding Red test and modern target-layer trace.
