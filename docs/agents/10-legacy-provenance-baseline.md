# 10) Legacy Provenance Baseline

## Purpose

- This document fixes the initial Phase 0B legacy provenance baseline for the first migration wave.
- Canonical rules still live in `SPEC.md`; this file is an execution mirror for exact source-path and target-layer mapping.
- Feature-level provenance now lives under [`docs/provenance/phase-0b/`](/G:/programming/yona/docs/provenance/phase-0b/README.md).

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
- PR: open/close/reopen, same-project merge entry, and PR-bound review write/list state semantics from `PullRequestAppTest`, `PullRequestTest`, `ReviewCommentTest`, `CommentThreadTest`, and `ReviewThreadAppTest`.
- Git: inline edit conflict and smart HTTP auth from `RepositoryServiceTest` and `GitRepositoryTest`.
- Search: permission-filtered result set from `SearchTests`, `SearchResultTests`, and `AccessControlTest`.

## Wave 1 Auth / ACL Baseline

- `UserAppTest.login_notComfirmedUser` and `authenticateWithPlainPassword*` now map to `packages/domain/src/auth-policy.spec.ts`, which freezes the first anonymous-vs-authenticated decision contract and keeps unconfirmed users out of authenticated sessions.
- `PasswordResetAppTest.testRequestResetPassword_validLoginIdAndEmailAddress` now maps to `packages/contracts/src/auth.spec.ts`, which fixes the first typed request contract for password-reset initiation.
- `AccessControlTest.isAllowed_siteAdmin`, `isAllowed_projectCreator`, `isAllowed_notAMember`, and `isAllowed_resource_to_group_member` now map to `packages/domain/src/project-authorization.spec.ts`, which freezes the first public/protected read-write matrix for site admin, manager, member, and anonymous actors.
- `apps/app` now reserves `/api/auth/provider/:provider/callback` as the canonical OAuth callback contract, but GitHub/Google provider exchange is still an explicit pending migration item rather than a completed Wave 1 feature.
- These are Wave-1 baselines only. They are not full feature completion proofs and must be extended by later `tRPC` procedure/`serverFunction` adapter/server-route tests in `apps/app` and `packages/auth`.

## Phase 0B Provenance Docs

- [`docs/provenance/phase-0b/legacy-test-inventory.md`](/G:/programming/yona/docs/provenance/phase-0b/legacy-test-inventory.md) is the scan of `yona-original/test/**` used to route each feature to its primary legacy source and owner package.
- [`docs/provenance/phase-0b/organization.md`](/G:/programming/yona/docs/provenance/phase-0b/organization.md) freezes the org create/read/update baseline and the settings-path deviation.
- [`docs/provenance/phase-0b/project.md`](/G:/programming/yona/docs/provenance/phase-0b/project.md) freezes the project create/read/update plus visibility baseline and records the `/projectform` and `/settingform` deviations.
- [`docs/provenance/phase-0b/issue.md`](/G:/programming/yona/docs/provenance/phase-0b/issue.md) narrows issue work in this batch to the first edit-authorization exemplar only.
- [`docs/provenance/phase-0b/fixture-strategy.md`](/G:/programming/yona/docs/provenance/phase-0b/fixture-strategy.md) freezes the canonical fixture names and scenario mapping derived from `conf/test-data.yml`.

## Phase 0B Exit Reminder

- The current Org/Project batch is Phase 0B core completion plus Phase 1 kickoff. It must not claim full Phase 0B completion.
- The blocker wording below is bounded and evidence-backed. It does not claim full Phase 0B exit.
- The PR and search wording below exists to reconcile stale blocker text with explicit bounded exemplars. It does not upgrade those capabilities to full parity in this batch.
- Enrollment and workspace implementation evidence already exists for these landed slices:
  - project enrollment request/cancel: `packages/domain/src/enrollment-service.ts`, `packages/domain/src/enrollment-service.spec.ts`, `apps/app/src/lib/enrollment-trpc.spec.ts`
  - organization enrollment request/cancel: `packages/domain/src/enrollment-service.ts`, `packages/domain/src/enrollment-service.spec.ts`, `apps/app/src/lib/enrollment-trpc.spec.ts`
  - workspace recent/favorite surface: `packages/domain/src/user-workspace-service.ts`, `packages/db/src/personal-workspace.spec.ts`, `apps/app/src/lib/me-trpc.spec.ts`, `apps/app/src/routes/me.tsx`
  - workspace default landing surface: `packages/domain/src/default-landing.ts`, `packages/domain/src/default-landing.spec.ts`, `packages/auth/src/app-service.ts`, `apps/app/src/routes/_app.index.tsx`
- Bounded PR and review-thread exemplar evidence now exists for these landed slices:
  - PR open/close/reopen plus same-project merge preview/execute, PR-bound review write/list/filter, and PR-thread close/reopen: `packages/contracts/src/pull-request.spec.ts`, `packages/domain/src/pull-request-service.spec.ts`, `apps/app/src/lib/pull-request-trpc.spec.ts`, `apps/app/src/routes/-pull-request-detail-parity.spec.tsx`, `packages/vcs/src/pull-request-merge.spec.ts`
- Bounded internal search exemplar evidence now exists for these landed slices:
  - internal `global` / `organization` / `project` search over `user`, `project`, `issue`, `posting`, and `review_comment`: `packages/contracts/src/search.spec.ts`, `packages/db/src/search.spec.ts`, `packages/domain/src/search-service.spec.ts`, `apps/app/src/lib/search.spec.ts`, `apps/app/src/lib/search-trpc.spec.ts`
- remaining true blockers for full 0B exit are:
  - organization enrollment request/cancel implementation
  - workspace default landing page implementation, while favorite/recent are already implemented
- Full PR/review parity stays in Phase 4, because `SPEC.md:1297` still owns cross-project or fork merge semantics, reviewer rules, stale-thread meaning, richer review lifecycle, source-branch cleanup, and full PR composition beyond the bounded same-project entry slice.
- Full internal search parity stays in Phase 5, because `SPEC.md:1359` still owns the broader multi-type surface, type-specific filtering and counts, and complete three-dialect search coverage beyond the bounded exemplar.
- AI-facing search endpoints stay in Phase 6, because `AGENTS.md` marks `llms.txt` and AI datasource work as hardening scope rather than a Phase 0B or Phase 5 blocker.
- In short, a bounded same-project PR merge/review entry slice and the bounded search exemplar are now evidence-backed, org enrollment and workspace default landing are landed in this repo state, while full PR parity stays deferred to Phase 4 and full internal search parity stays deferred to Phase 5.

## Explicit Deferred Items

- Phase 4 PR or review deferrals: cross-project or fork merge acceptance, reviewer threshold and assignment lifecycle, review comment edit flows, stale-thread meaning, PR detail and diff composition, source-branch cleanup or restore, fork or clone workflow, and PR event timeline translation. These are deferred because the current Phase 0B provenance freeze is intentionally narrower than `SPEC.md:1297`.
- Phase 5 search deferrals: `issue_comment`, `posting_comment`, `milestone`, broader review-search-condition behavior beyond internal `review_comment`, type-specific result counts, and full field-coverage parity across PostgreSQL, MySQL or MariaDB, and SQLite for the complete internal type set. These are deferred because the current Phase 0B provenance freeze is intentionally narrower than `SPEC.md:1359`.
- Phase 6 search deferrals: `llms.txt`, AI datasource endpoints, and other AI-facing search surfaces. These are deferred because the fixed phase plan keeps them in hardening scope rather than feature-parity scope.

## Translation Notes

- Controller-origin behavior should map to `tRPC` procedure tests + `serverFunction` adapter tests unless full HTTP semantics are required, in which case it maps to server-route tests.
- Model-origin behavior should map to isolated `packages/domain` tests first.
- Git/smart HTTP and future `llms.txt`-style raw routes are server-route territory, not app-internal RPC.
- If a source path has no direct one-to-one transport equivalent, record the transport deviation but keep the behavior and permission meaning.

## Exit Condition For Wave 1

- Every wave-1 implementation PR must cite at least one row from this matrix.
- No feature can be called complete without the corresponding Red test and modern target-layer trace.
