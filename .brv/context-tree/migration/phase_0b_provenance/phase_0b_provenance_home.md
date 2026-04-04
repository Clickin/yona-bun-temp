---
title: Phase 0B Provenance Home
tags: []
related: [migration/phase_plan_overview/phase_plan_overview.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T09:33:21.815Z'
updatedAt: '2026-04-04T09:33:21.815Z'
---
## Raw Concept
**Task:**
Summarize the Phase 0B provenance home README contents, the bounded batch status, and the deferred capability lists.

**Changes:**
- Catalogued the README entries covering legacy inventory, organization, project, issue, PR-review, search, and fixture strategy.
- Reiterated that the current batch closes Phase 0B core provenance for Org/Project and starts Phase 1 CRU while org/project delete remains deferred.
- Listed the explicit deferred items for Phase 4 PR/review, Phase 5 search, and Phase 6 AI-facing search surfaces.

**Files:**
- docs/provenance/phase-0b/README.md

**Flow:**
Files list -> Batch boundary reminder -> Deferred Phase 4/5/6 feature lists

**Timestamp:** 2026-04-04

## Narrative
### Structure
The README lists the provenance files, describes the bounded batch status (Phase 0B core + Phase 1), and repeats the deferred Phase 4-6 feature lists.

### Dependencies
Links back to docs/agents/10-legacy-provenance-baseline.md for canonical rules and explains that stale blockers (org enrollment/default landing) no longer apply.

### Highlights
Phase 4 deferrals focus on the PR/review lifecycle, Phase 5 deferrals widen search result coverage across content types and dialects, Phase 6 explicitly keeps AI-facing search surfaces like llms.txt pending.

## Facts
- **batch_boundary**: The README confirms the batch aims to finish Phase 0B core provenance for Org/Project while starting Phase 1 CRU, with org/project delete still deferred. [project]
- **phase4_deferred_items**: Deferred Phase 4 PR/review items include merge acceptance/conflict handling, reviewer lifecycle, review comment CRUD, stale-thread semantics, PR detail/diff composition, branch cleanup/restore, fork/clone workflows, and PR event timeline translation. [convention]
- **phase5_deferred_items**: Deferred Phase 5 search items cover issue_comment/posting_comment/milestone result types, broader review search beyond review_comment, type-specific counts, and full PostgreSQL/MySQL/SQLite coverage. [convention]
- **phase6_deferred_items**: Deferred Phase 6 search items include llms.txt, AI datasource endpoints, and other AI-facing routes. [project]
