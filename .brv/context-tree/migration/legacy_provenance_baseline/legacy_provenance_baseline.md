---
title: Legacy Provenance Baseline
tags: []
related: [migration/phase_plan_overview/phase_plan_overview.md]
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-04T09:33:21.813Z'
updatedAt: '2026-04-04T09:33:21.813Z'
---
## Raw Concept
**Task:**
Document the legacy provenance baseline requirements and capability mapping for Phase 0B migration.

**Changes:**
- Enumerated the matrix that maps each capability (Auth, ACL, Issue, Project, PR/Review, Git/Repository, Search) to legacy tests, intent summaries, modern targets, ownership, and deviation rules.
- Highlighted the Wave 1 Auth/ACL exemplar extensions, fixture/seeding strategies, and reserved OAuth callback contract.
- Defined the Wave 1 exit condition that every PR must cite a matrix row and pair a red test with a modern translation trace.

**Files:**
- docs/agents/10-legacy-provenance-baseline.md
- SPEC.md

**Flow:**
Legacy capability -> Legacy test inventory -> Modern translation target layer -> Ownership + deviation rule -> Wave 1 exit reminder

**Timestamp:** 2026-04-04

## Narrative
### Structure
The doc introduces required entry fields, enumerates the capability matrix with ownerships and deviations, and then describes Wave 1 exemplar expectations plus exit rules.

### Dependencies
Aligns with SPEC.md canonical rules and mirrors docs/provenance/phase-0b/ README for deeper traces.

### Highlights
Wave 1 Auth/ACL baselines extend through RPC, adapter, and server-route tests; fixture strategies are captured in conf/test-data.yml; translation notes clarify controller and model origins mapping to modern layers.

## Facts
- **baseline_matrix_coverage**: The baseline matrix covers Auth, ACL, Issue, Project, PR/Review, Git/Repository, and Search, each mapping legacy tests to modern target layers and deviation rules. [project]
- **provenance_entry_fields**: Every Phase 0B provenance entry must capture source legacy path, intent summary, modern translation target layer, target ownership, and a deviation rule. [convention]
- **wave1_exit_condition**: Wave 1 exit requires that each PR references a baseline matrix row and maintains a red test plus modern trace before considering the capability complete. [convention]
