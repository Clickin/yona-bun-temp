---
title: Landing Plan 2026-04-05 Demo Ready PR Merge Review
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T16:01:29.637Z'
updatedAt: '2026-04-04T16:01:29.637Z'
---
## Raw Concept
**Task:**
Document the landing-demo-ready-pr-merge-review-20260405 CD plan that cherry-picks 861408a onto 704a665 with narrow follow-ups and provenance wording updates.

**Changes:**
- Cherry-pick 861408a onto a fresh worktree based on 704a665 with unique branch and no reuse of existing demo worktrees.
- Allow only minimal drift repair for touched files/adjacent call sites, generated-file cleanup, or docs/provenance/repo-memory sync.
- Run the fixed verification matrix before touching generated files, then re-run after restoration decisions.
- Update the targeted Phase 0B provenance docs to assert bounded same-project PR merge/review entry slice language.

**Files:**
- .omx/plans/2026-04-05-demo-ready-pr-merge-review-slice-landing.md
- docs/provenance/phase-0b/pull-request-review.md
- docs/provenance/phase-0b/README.md
- docs/agents/10-legacy-provenance-baseline.md
- docs/agents/06-phase-plan.md

**Flow:**
Create a fresh, uniquely named landing worktree -> cherry-pick 861408a before bun install -> run verification matrix -> apply generated-file restoration policy -> clean working tree -> update Phase 0B provenance docs -> ensure readiness for PR.

**Timestamp:** 2026-04-05

## Narrative
### Structure
The plan enumerates fixed inputs (base 704a665, source 861408a, dirty workspace), allowed follow-ups, and a tightening acceptance checklist culminating in a clean git status and verification pass before docs updates.

### Dependencies
Relies on a one-time landing worktree, sequential verification commands, and the ability to restore bun.lock and apps/app/src/routeTree.gen.ts from base if generated-file changes threaten verification.

### Highlights
The plan freezes Phase 0B PR provenance wording to describe a bounded same-project PR merge/review entry slice while explicitly deferring full PR parity to Phase 4, and predicates doc updates on verification success and generated-file policy.

### Rules
Docs/provenance/phase-0b/pull-request-review.md, docs/provenance/phase-0b/README.md, docs/agents/10-legacy-provenance-baseline.md, and docs/agents/06-phase-plan.md only change when wording must align with the bounded same-project slice, and failure reporting requires capturing the first failing command, error excerpt, scope expansion reason, and storing under .omx/plans/...-failure.md before removing the failed landing worktree.

## Facts
- **landing_branch_cherry_pick**: Landing branch landing-demo-ready-pr-merge-review-20260405 must cherry-pick commit 861408a4d87e2dc8b39c95db1df94617d8cba94b onto base 704a665dadf7c3e92d793c4eb14808b279663120 and keep the landing history ordered with narrow follow-ups. [project]
- **verification_sequence**: Verification sequence is bun run check; bun run --cwd packages/domain test; bun run --cwd packages/db test:sqlite and test:node; bun run --cwd apps/app test src/lib/pull-request-trpc.spec.ts src/routes/-pull-request-detail-parity.spec.tsx src/routes/-reviews-parity.spec.tsx; and bunx vitest run src/pull-request-merge.spec.ts from packages/vcs. [project]
- **follow_up_scope**: Allowed follow-ups are limited to minimal drift repair triggered by touched-area compatibility failures, generated-file cleanup, and docs/provenance/repo-memory sync. [convention]
- **provenance_docs_targets**: Docs to align wording are docs/provenance/phase-0b/pull-request-review.md, docs/provenance/phase-0b/README.md, docs/agents/10-legacy-provenance-baseline.md, and docs/agents/06-phase-plan.md with the “bounded same-project PR merge/review entry slice landed” language. [project]
