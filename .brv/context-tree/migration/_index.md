---
children_hash: cd77e01c9a121b0f3e1f5df718aa8f4432cabe1ffd08a025024b442968d762fe
compression_ratio: 0.5533980582524272
condensation_order: 2
covers: [context.md, legacy_provenance_baseline/_index.md, phase_0b_provenance/_index.md, phase_plan_overview/_index.md]
covers_token_total: 1442
summary_level: d2
token_count: 798
type: summary
---
# migration Domain Overview
- **Purpose & Ownership**: Captures Yona migration phases, checkpoints, deferred work, and gate rules; owned by the Migration squad for guided bounded parity effort reference.
- **Scope & Usage**: Includes phase definitions 0A–6, current checkpoint status, deferred feature lists, and phase gate criteria; excludes implementation details of individual features outside these phase descriptions. Use this domain to understand in-scope phase deliverables and remaining deferred capabilities.

## Key Topics
### legacy_provenance_baseline
- **Objective**: Establish Phase 0B legacy-to-modern provenance baseline that maps every legacy test/capability to its modern translation, ownership, and deviation rule, ensuring traceable coverage before Wave 1 exit.
- **Structure**: Matrix entries span Auth, ACL, Issue, Project, PR/Review, Git/Repository, and Search; each row records legacy test source, intent, target layer, owning team, and deviation constraint.
- **Dependencies & Decisions**: References `SPEC.md` rules, `docs/agents/10-legacy-provenance-baseline.md`, and aligns with Provenance Phase 0B README; fixture strategy noted in `conf/test-data.yml`; mandates PRs cite matrix row and legacy-modern tracing before marking capabilities complete.
- **Governance**: Wave 1 exit requires pairing legacy red tests with modern translations; OAuth callback contracts serve as exemplar extensions for baseline coverage.

### phase_0b_provenance
- **Context**: Defines Phase 0B provenance home, bounded batch expectations (Org/Project core plus Phase 1 CRU start), and deferred Phase 4–6 capabilities; links gating logic to `migration/phase_plan_overview`.
- **Content Highlights**:
  - Completes Org/Project provenance while keeping Org/Project delete deferred.
  - Starts Phase 1 Org/Project CRU concurrently.
  - Dependencies include legacy baseline rules from `docs/agents/10-legacy-provenance-baseline.md`; historical blockers like org enrollment and default landing are no longer blocking.
- **Deferred Capabilities**:
  - Phase 4: PR/review lifecycle features (merge acceptance, review comment CRUD, stale threads, PR diff presentation, branch cleanup, fork/clone flows, PR event timelines).
  - Phase 5: Search expansions (issue_comment, posting_comment, milestone types, review search beyond review_comment, type-specific counts, full SQL coverage).
  - Phase 6: AI-facing search surfaces (llms.txt, AI datasource endpoints, etc.).

### phase_plan_overview
- **Scope**: Presents the April 4, 2026 phase roadmap, emphasizing phase outputs, completion signals, and gate rules linking behavior parity with provenance completeness.
- **Structure & Checkpoints**:
  - Documents deliverables/completion signals for Phases 0A–6.
  - Highlights bounded checkpoint covering Phase 0B core provenance and Phase 1 Org/Project kickoff (see `phase_0b_provenance_home`).
- **Deferred Work & Dependencies**:
  - Phases 4–6 deferred until parity plus provenance criteria satisfied, with AI/LLMO surfaces reserved for Phase 6 (see legacy baseline summary).
  - Mirrors provenance rules in `SPEC.md`, legacy baseline documentation, and agent docs (`docs/agents/06-phase-plan.md`).