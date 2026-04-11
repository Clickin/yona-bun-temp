---
title: Stacked PR Review Follow-up 2026-04-05
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T03:48:32.194Z'
updatedAt: '2026-04-05T03:48:32.194Z'
---
## Raw Concept
**Task:**
Capture the stacked PR review follow-up for demo-ready PR merge review on 2026-04-05.

**Changes:**
- Delivered readRepositoryCommitDiscussionCapabilities and backend-sourced canCreate/canManage for commit discussion moderation in PR #2.
- Implemented pull request merge lease helpers alongside tighter merge-state handling and review count scoping in PR #3.

**Flow:**
PR #2 enhancements -> PR #3 merge lease safeguards -> regression verification via the blocked/green test runners.

**Timestamp:** 2026-04-05

## Narrative
### Structure
The follow-up covers two stacked PRs for the demo-ready merge review effort. PR #2 strengthens commit discussion moderation with readRepositoryCommitDiscussionCapabilities and backend-derived moderation flags, while PR #3 adds pull request merge lease helpers, ensures acquired leases before branch checks and git merges, maintains isMerging=true on git success but database failures, and scopes review count reads by resolved pullRequestId when a number is provided.

### Dependencies
Successful verification depends on the packages/domain, packages/db (sqlite), and apps/app test suites; packages/db test:node was blocked by a missing container runtime that will need resolution before rerun.

### Highlights
The review flow now guards merge operations with lease acquisition and persistent isMerging state plus precise moderation controls for commit discussions.

### Rules
Rule 1: Acquire the merge lease before branch checks or git merge steps.
Rule 2: Keep isMerging=true if git merge succeeds but database updates fail to prevent false readiness.
Rule 3: When pullRequestNumber is present, scope readPullRequestReviewCounts by the resolved pullRequestId to avoid stale data.

### Examples
Example: readPullRequestReviewCounts(pullRequestId=resolved) is only scoped when pullRequestNumber accompanies the read request.

## Facts
- **pr_2_commit_discussion**: PR #2 branch main-sync-20260405 head 5202214 adds readRepositoryCommitDiscussionCapabilities and uses backend-derived canCreate/canManage for commit discussion UI moderation. [project]
- **pr_3_merge_lease**: PR #3 branch landing-demo-ready-pr-merge-review-20260405 head 2d63526 adds pull request merge lease helpers, acquires the lease before branch checks and git merge, keeps isMerging=true when git succeeds but the database fails, and scopes readPullRequestReviewCounts by resolved pullRequestId whenever pullRequestNumber is present. [project]
- **test_verification**: Verification covered packages/domain test, packages/db test:sqlite, apps/app targeted tests, and apps/app check while packages/db test:node remained blocked by the missing container runtime. [environment]
