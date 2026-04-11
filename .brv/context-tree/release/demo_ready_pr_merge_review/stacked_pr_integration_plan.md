---
title: Stacked PR Integration Plan
tags: []
related: [release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T16:30:55.493Z'
updatedAt: '2026-04-04T16:30:55.493Z'
---
## Raw Concept
**Task:**
Document the stacked PR integration runbook for the 2026-04-05 landing slice, including branching, verification, merge strategy, and failure handling requirements.

**Changes:**
- Defines fixed interfaces for PR1 and PR2 heads/bases and expected commit counts.
- Specifies preflight, branch/push, merge/restack, verification, generated-file gates, and PR body requirements.
- Captures failure handling steps and acceptance criteria to keep the stacked integration bounded.

**Files:**
- .omx/plans/2026-04-05-demo-ready-pr-merge-review-slice-landing.md

**Flow:**
preflight verification -> branch copy/push -> open PRs -> review updates and restacks -> merge/retarget decisions -> failure capture

**Timestamp:** 2026-04-05

## Narrative
### Structure
Organizes the runbook into goal, fixed interfaces, gates, branch/push order, merge and restack rules, verification contract, file diff gate, PR body requirements, review focus, non-goals, failure handling, and acceptance criteria sections.

### Dependencies
Relies on a clean working tree, exact commit counts between the relevant branches, and sync with PR1 before PR2 restacks or retargets.

### Highlights
Restack PR2 immediately whenever PR1 gains commits, retarget PR2 to main only after PR1 merges cleanly, and gate PR opening on the complete verification matrix or documented exceptions.

### Rules
Preflight: 1. Confirm origin/main..main contains six commits. 2. Confirm main..landing-demo-ready-pr-merge-review-20260405 contains three commits. 3. Confirm no unrelated local worktree dirt would leak. 4. Confirm whether remote branches main-sync-20260405 and landing-demo-ready-pr-merge-review-20260405 already exist. 5. Confirm whether open PRs already exist for either branch.

Branch and Push Order: 1. Copy the current local main tip to review branch main-sync-20260405 (do not use local main as PR head). 2. Push main-sync-20260405 first. 3. Open PR1 from main-sync-20260405 to origin/main. 4. Push landing-demo-ready-pr-merge-review-20260405. 5. Open PR2 from landing-demo-ready-pr-merge-review-20260405 to main-sync-20260405. 6. Preserve commit order; do not squash or reorder either stack locally before opening the PRs.

PR1 Merge Strategy: - Merge with original commit ancestry preserved if possible. - Preferred path is a merge commit. - If repository policy only allows squash or rebase, PR2 becomes a mandatory rebase/refresh after PR1 merges.

PR1 Review Updates: - Apply feedback commits only on main-sync-20260405. - While PR1 is unmerged, restack PR2 immediately onto latest main-sync-20260405. - Every restack must update local branch history, push with --force-with-lease, rerun the full PR2 verification suite, and reconfirm the three-commit review scope and file set.

PR1 Merged, PR2 Retargeted: - Retarget PR2 to main after PR1 merges. - Keep PR2 history intact only if PR1 merged with original ancestry preserved or PR2 still has three commits, GitHub reports no conflicts, diff stays within landing slice, and bun.lock plus apps/app/src/routeTree.gen.ts are absent. - If any condition fails, refresh PR2 on new main, push with --force-with-lease, rerun the verification suite, and update the PR body.

Verification Gate Semantics: - Every listed command must pass before marking the PR Ready for Review. - Only allowed exception: packages/db test:node blocked by reproducible environment constraints; PR body must record the unrun command, blocker, failure date, and all other passing results. - Any other failure keeps the PR closed or in Draft.

Generated-File Diff Gate: - bun.lock and apps/app/src/routeTree.gen.ts must not appear in the PR2 compare diff. - Check this gate before opening PR2, after every restack, and immediately after retargeting. - Remove drift before returning PR2 to Ready for Review if the files reappear.

PR Body Requirements: PR1: state that it is the six-commit upstream sync base, mention PR2 as the stacked child, list verification commands/results, record known gaps or Not-tested, and note required merge strategy. PR2: state it is the bounded same-project landing slice entry, focus review on the PR2-only three commits, list verification commands/results, record known gaps or Not-tested, and note that bun.lock and apps/app/src/routeTree.gen.ts are excluded.

Review Focus: PR1 should emphasize migration checkpoint sync and existing review surfaces. PR2 should emphasize same-project merge preview, PR-bound writes/lists/filters, PR-thread reopen behavior, and bounded provenance wording.

PR2 Non-goals: cross-project/fork merge, reviewer lifecycle, stale-thread semantics, source-branch cleanup, full PR detail or diff parity.

Failure Handling: capture the first failing command or decisive GitHub/API action, record the error excerpt or collision (remote hygiene mismatch, verification failure, merge-policy incompatibility, or scope expansion), save notes under .omx/plans/2026-04-05-demo-ready-pr-merge-review-slice-landing-failure.md, and stop before opening/updating misleading Ready for Review PRs.

Acceptance Criteria: origin/main..main-sync-20260405 equals six commits mapping to PR1, main-sync-20260405..landing-demo-ready-pr-merge-review-20260405 equals three commits mapping to PR2, both PRs open with intended base/head and only Ready for Review after gated verification, PR2 diff excludes bun.lock and apps/app/src/routeTree.gen.ts, PR bodies describe stacked relationship plus review focus/verification/gaps, and restack/retarget behavior is documented for execution without additional branching decisions.

### Examples
Use stack-specific takeaways when updating PR bodies and restacking; failure records live under .omx/plans/2026-04-05-demo-ready-pr-merge-review-slice-landing-failure.md.

## Facts
- **pr1_branch**: PR1 head branch is main-sync-20260405 with origin/main as base and includes exactly six commits in origin/main..main-sync-20260405. [project]
- **pr2_branch**: PR2 head branch is landing-demo-ready-pr-merge-review-20260405 with main-sync-20260405 as base and covers exactly three commits. [project]
- **pr1_verification_suite**: PR1 verification suite: bun run check; bun run --cwd packages/domain test; bun run --cwd packages/db test:sqlite; bun run --cwd packages/db test:node; bun run --cwd apps/app test src/commit-discussion-route.spec.tsx src/lib/repo-trpc.spec.ts src/lib/issue-trpc.spec.ts src/lib/pull-request-trpc.spec.ts. [project]
- **pr2_verification_suite**: PR2 verification suite: bun run check; bun run --cwd packages/domain test; bun run --cwd packages/db test:sqlite; bun run --cwd packages/db test:node; bun run --cwd apps/app test src/lib/pull-request-trpc.spec.ts src/routes/-pull-request-detail-parity.spec.tsx src/routes/-reviews-parity.spec.tsx; bunx vitest run src/pull-request-merge.spec.ts from packages/vcs. [project]
- **generated_file_gate**: Generated-file gate: bun.lock and apps/app/src/routeTree.gen.ts must never appear in the PR2 compare diff before opening, after restacks, or after retargeting. [convention]
- **restack_behavior**: During restacks and retargets, PR2 must force-push with --force-with-lease, rerun the full verification suite, and reconfirm only the three landing-slice commits and bounded file set. [convention]
