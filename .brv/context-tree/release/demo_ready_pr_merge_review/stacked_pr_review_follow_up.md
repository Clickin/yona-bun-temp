---
title: Stacked PR Review Follow-up
tags: []
related: [release/demo_ready_pr_merge_review/stacked_pr_integration_plan.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T03:48:05.874Z'
updatedAt: '2026-04-05T03:48:05.874Z'
---
## Raw Concept
**Task:**
Document the stacked PR review follow-up for the demo ready PR merge review release

**Changes:**
- PR #2 adds readRepositoryCommitDiscussionCapabilities and leverages backend-derived canCreate/canManage for commit discussion UI moderation.
- PR #3 introduces pull request merge lease helpers, ensures leases are acquired before branch checks and git merge, keeps isMerging=true on git-success/db-failure mismatch, and scopes readPullRequestReviewCounts by resolved pullRequestId when pullRequestNumber is provided.
- Verification covered packages/domain test, packages/db test:sqlite, apps/app targeted tests, apps/app check; packages/db test:node remained blocked by a missing container runtime.

**Flow:**
Stacked PR review follow-up -> PR #2 commit discussion moderation updates -> PR #3 merge lease and review count scoping -> verification across targeted tests

**Timestamp:** 2026-04-05

## Narrative
### Structure
The follow-up summarizes PR #2 on branch main-sync-20260405 (head 5202214) and PR #3 on landing-demo-ready-pr-merge-review-20260405 (head 2d63526) so collaborators understand what shipped for the stacked PR review phase of the release.

### Dependencies
Verification relied on packages/domain test, packages/db test:sqlite, apps/app targeted tests, and apps/app check, while packages/db test:node was not available because the container runtime was still missing.

### Highlights
PR #2 extends commit discussion UI moderation by wiring readRepositoryCommitDiscussionCapabilities into backend-derived canCreate/canManage checks. PR #3 adds pull request merge lease helpers, acquires leases before branch checks/git merge, preserves isMerging=true on git-success but db-failure, and scopes readPullRequestReviewCounts by the resolved pullRequestId when a pullRequestNumber exists.

## Facts
- **commit_discussion_ui_moderation**: PR #2 (main-sync-20260405 head 5202214) adds readRepositoryCommitDiscussionCapabilities and uses backend-derived canCreate/canManage for commit discussion UI moderation. [project]
- **pull_request_merge_flow**: PR #3 (landing-demo-ready-pr-merge-review-20260405 head 2d63526) adds pull request merge lease helpers, acquires the lease before branch checks and git merge, keeps isMerging=true on git-success/db-failure mismatch, and scopes readPullRequestReviewCounts by resolved pullRequestId when pullRequestNumber is present. [project]
- **test_verification**: Verification exercised packages/domain test, packages/db test:sqlite, apps/app targeted tests, and apps/app check; packages/db test:node remained blocked by a missing container runtime. [environment]
