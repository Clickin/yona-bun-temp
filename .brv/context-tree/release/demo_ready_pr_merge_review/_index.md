---
children_hash: 8c692f7d44415f4fd717017f4b8a932693fd20b64b74a9a28a8d4aa3ddb982b0
compression_ratio: 0.1644538856434767
condensation_order: 1
covers: [context.md, landing_plan_2026_04_05_demo_ready_pr_merge_review.md, stacked_pr_integration_plan.md, stacked_pr_review_follow_up.md, stacked_pr_review_follow_up_2026_04_05.md, wave_1_public_landing_parity.md]
covers_token_total: 5649
summary_level: d1
token_count: 929
type: summary
---
# demo_ready_pr_merge_review Structural Summary

## Overview
- Curated plan documents the **landing-demo-ready-pr-merge-review** effort centered on cherry-picking commit `861408a` onto base `704a665`, bounding follow-up scope, enforcing a fixed verification matrix, and aligning Phase 0B provenance wording. (see `context.md`)

## Landing Plan (landing_plan_2026_04_05_demo_ready_pr_merge_review.md)
- Establishes the landing worktree workflow: create a uniquely named worktree, cherry-pick the cited commit before running bun installs, execute the prescribed verification suite, enforce generated-file restoration controls, and then update provenance docs only after verification success.
- Limits follow-up edits to minimal drift repairs, generated-file cleanup, or provenance/repo-memory sync, with explicit failure-reporting rules capturing commands, errors, expansion rationale, and dropping plans under `.omx/plans/*-failure.md`.
- Facts include the specific verification commands, branch targets (`landing-demo-ready-pr-merge-review-20260405` onto `704a665`), follow-up scope constraints, and the provenance doc targets requiring “bounded same-project PR merge/review entry slice” language.

## Stacked PR Integration (stacked_pr_integration_plan.md)
- Describes the stacked PR runbook covering PR1 (`main-sync-20260405`) and PR2 (`landing-demo-ready-pr-merge-review-20260405`), including preflight checks, fixed branch/push ordering, merge/restack gating, verification expectations, generated-file diff gate, PR body requirements, review focus, non-goals, failure handling, and acceptance criteria.
- Enforces six-commit upstream sync for PR1 and three-commit landing slice for PR2, with defined verification suites for each PR, generated-file exclusion (bun.lock, `apps/app/src/routeTree.gen.ts`), restack behavior (force-with-lease, rerun suite), and rules for documenting verification gaps or blocked commands.

## Stacked PR Follow-Up (stacked_pr_review_follow_up.md & stacked_pr_review_follow_up_2026_04_05.md)
- Summarizes review follow-up outcomes: PR #2 (main-sync-20260405 head `5202214`) introduces commit discussion moderation via `readRepositoryCommitDiscussionCapabilities` and backend-derived `canCreate/canManage`; PR #3 (landing-demo-ready-pr branch head `2d63526`) adds merge-lease helpers, lease-before-merge requirements, persistent `isMerging=true` when DB fails, and scoping `readPullRequestReviewCounts` by resolved `pullRequestId`.
- Verification coverage includes `packages/domain`, `packages/db` (sqlite), apps/app targeted suites, and apps/app check, while `packages/db test:node` stayed blocked by a missing container runtime.
- Rules emphasize lease acquisition ordering, preserving merging state on partial failures, and scoping review-count reads when pull request numbers are provided.

## Wave 1 Public Landing Parity (wave_1_public_landing_parity.md)
- Captures parity updates aligning anonymous landing experience with legacy copy/layout: hero/CTA/feature grid, nav links, removal of temporary workstream labels, and anonymous-only routing via `_app.index.tsx`.
- Defines parity spec requiring legacy intro copy plus login/register/project/org/search links, forbidding temporary labels, and tying `_app.tsx` layout to nav/search behaviors (global search with `pageSize=20`, locale switcher limited to `en`/`ko-KR`, authenticated workspace links, runtime info via translations).
- Specifies dependencies (session via `useSuspenseQuery`, translations via `useI18n`, locale URLs via `buildLocaleHref`) and confirms tests via `-public-landing-parity.spec.tsx` plus audit tracking in `docs/provenance/core-parity-audit.md` (listing drift types, tests, owners, Wave 0 commands).