---
children_hash: 1e7e673c53ca7282cbc56046a2795256ab57b9980cb0aba58899935816064b8c
compression_ratio: 0.5708154506437768
condensation_order: 1
covers: [context.md, phase_0b_provenance_home.md]
covers_token_total: 699
summary_level: d1
token_count: 399
type: summary
---
### Phase 0B Provenance (migration/phase_0b_provenance)
- **Context** (`context.md`): Frames the Phase 0B provenance home directory, batch boundary expectations (Phase 0B core provenance for Org/Project plus the start of Phase 1 CRU), and the list of intentionally deferred capabilities across Phases 4–6. Directs readers to `migration/phase_plan_overview` for checkpointing and gating context.
- **Phase 0B Provenance Home** (`phase_0b_provenance_home.md`): Mirrors the README structure—files inventory, bounded batch reminder, and deferred lists. Highlights that Phase 0B completes Org/Project provenance while Org/Project delete stays deferred; Phase 1 CRU begins concurrently. Dependencies include the legacy provenance baseline rules (`docs/agents/10-legacy-provenance-baseline.md`), noting that historical blockers (org enrollment/default landing) no longer apply.
  - **Deferred Scope**:
    - *Phase 4 (PR/Review lifecycle)*: Defers merge acceptance/conflict handling, reviewer lifecycle, review comment CRUD, stale-thread semantics, PR detail/diff composition, branch cleanup/restore, fork/clone workflows, and translating PR event timelines.
    - *Phase 5 (Search expansion)*: Defers broader search result types (issue_comment, posting_comment, milestone), expanded review search (beyond review_comment), type-specific counts, and full PostgreSQL/MySQL/SQLite coverage.
    - *Phase 6 (AI-facing search)*: Keeps llms.txt, AI datasource endpoints, and other AI-facing search surfaces pending.
- **Files referenced**: `docs/provenance/phase-0b/README.md` (source of cataloged content).