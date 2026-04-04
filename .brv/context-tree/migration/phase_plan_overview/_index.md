---
children_hash: f2e618cf00d709921cf5198b876dd6f6a16e1cb0fc752905b3cf84c1b05fc84f
compression_ratio: 0.3810126582278481
condensation_order: 1
covers: [context.md, phase_plan_overview.md]
covers_token_total: 790
summary_level: d1
token_count: 301
type: summary
---
## Phase Plan Overview (migration/phase_plan_overview)
- **Scope**: Captures the April 4, 2026 roadmap for migrating Yona, emphasizing phase definitions, checkpoint status, and provenance/behavior gate rules.
- **Structure**: Documents outputs and completion signals for each phase (0A–6), highlights the bounded checkpoint, and lists deferred capabilities with a reminder of the phase-gate rule.
- **Checkpoint & Gates**: Phase completion requires behavior parity plus provenance completeness; bounded checkpoint currently spans Phase 0B core provenance and Phase 1 Org/Project kickoff (see `migration/phase_0b_provenance/phase_0b_provenance_home`).
- **Deferred Work**: Phase 4 (PR/review), Phase 5 (search/boards/integration), and Phase 6 (admin/migration/AI/LLMO hardening) remain deferred until parity and provenance criteria are satisfied; AI surfaces are explicitly held for Phase 6 (see `migration/legacy_provenance_baseline/legacy_provenance_baseline`).
- **Dependencies & References**: Mirrors SPEC.md provenance rules and the legacy baseline docs (`docs/agents/10-legacy-provenance-baseline.md`, `docs/provenance/phase-0b/README.md`); details also documented in `docs/agents/06-phase-plan.md`.