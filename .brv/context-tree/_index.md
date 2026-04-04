---
children_hash: e1c5978e1b7e43e0deedc021aff25507e9936307bd3f90abcb34c06621ef480b
compression_ratio: 0.48478099480326653
condensation_order: 3
covers: [migration/_index.md, project_updates/_index.md]
covers_token_total: 1347
summary_level: d3
token_count: 653
type: summary
---
# migration domain (summary of `migration/_index.md`)
- **Purpose**: Migration squad maintains phase-based progression, deferred work lists, and gate rules, framing in `.brv/context-tree/migration` so Wave 1/parity decisions are traceable. Use this domain for phase deliverables, checkpoints, and provenance expectations.
- **Domains**:
  - **legacy_provenance_baseline**
    - Matrix mapping legacy tests (Auth, ACL, Issue, Project, PR/Review, Git, Search) to modern equivalents, owners, and allowable deviations, guided by `SPEC.md` and `docs/agents/10-legacy-provenance-baseline.md`. Every PR must cite the relevant row before marking completion, and OAuth callbacks exemplify extensions for compliance.
  - **phase_0b_provenance**
    - Core deliverables: complete Org/Project provenance, start Phase 1 Org/Project CRU, defer deletes and higher-phase capabilities. Dependencies include legacy baseline rules; historical blockers resolved.
    - Deferred Phase 4–6 features: PR/Review lifecycle enhancements, Search expansions (issue_comment/milestone types, review search, SQL coverage), and AI/LLMO surfaces (llms.txt, datasource endpoints) per `phase_plan_overview` and baseline docs.
  - **phase_plan_overview**
    - April 4 2026 roadmap tracking Phases 0A–6, gate rules tying behavior parity to provenance completeness, with checkpoint focus on Phase 0B provenance and Phase 1 kickoff (see `phase_0b_provenance_home`). Deferred AI/LLMO work awaits earlier-phase parity, reflecting the SPEC/agent baseline rules.

# project_updates domain (summary of `project_updates/_index.md`)
- **Purpose**: Records curated operational highlights (validations, merges, planning) connected to migration verification; excludes raw logs.
- **Logs topic**
  - Aggregates April 2 2026 Omni timeline (`omx_turns_highlights.md`) to track validation and merge checkpoints supporting the migration plan.
  - Key events:
    - `non_pr_commit_slice` (SPEC 13.6) merged at 13:03:20 from `fix-76c8df30-review`, reinforcing the baseline.
    - Validation suite (Testcontainers, PostgreSQL, `bun run check`, domain/unit tests, SQL injection) executed ~13:30 covering critical stack readiness.
    - `demo_pr_merge_slice` at 14:27 captured PR review UX, preview behavior, conflict surfacing, and permission gating; `mergeResult` noted as read-only preview until execution.
    - Final validation at 15:15–15:29 centered on commit `861408a`, including `routeTree` and `bun.lock` artifacts for verification.
  - These log entries relate back to `migration/phase_plan_overview`, serving as checkpoints in the broader migration strategy.