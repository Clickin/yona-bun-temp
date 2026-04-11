---
children_hash: c89803ae9d0cad8afd26b90051bf5d93dfcc1ce8f492e870fb7784d6848c27b3
compression_ratio: 0.503
condensation_order: 2
covers: [context.md, legacy_provenance_baseline/_index.md, legacy_schema_baseline/_index.md, phase_0b_provenance/_index.md, phase_plan_overview/_index.md]
covers_token_total: 2000
summary_level: d2
token_count: 1006
type: summary
---
### Domain: migration (Level d2 Structural Summary)

- **Purpose & Governance**
  - Mission is to track migration phases, checkpoints, deferred features, and gating rules that drive Yona’s bounded parity effort (`context.md`).
  - Owned by the Migration squad; use this domain to determine in-scope work per phase and what remains postponed.

- **Phase Plan Overview (`migration/phase_plan_overview`)**
  - Documents the April 4, 2026 roadmap spanning Phases 0A–6 with completion signals tied to behavior parity and provenance coverage.
  - Checkpoint currently covers Phase 0B core provenance plus the start of Phase 1 Org/Project work; each phase gate requires pairing behavior outputs with provenance traceability.
  - Highlights deferred work: Phase 4 (PR/Review lifecycle), Phase 5 (search/boards/integration expansion), and Phase 6 (admin, migration, AI/LLMO hardening), with AI-focused surfaces explicitly reserved for Phase 6.
  - Relates to `legacy_provenance_baseline` for provenance gating and to `docs/agents/06-phase-plan.md` plus SPEC-driven rules.

- **Phase 0B Provenance (`migration/phase_0b_provenance`)**
  - Captures the Phase 0B provenance home scope (Org/Project provenance completion and concurrent Phase 1 CRU kickoff) and catalogs deferred capabilities for later phases.
  - Deferred scope lists precise gaps: Phase 4 (PR/review lifecycle, comments, diffs, branch workflows), Phase 5 (expanded search types/counts and DB coverage), and Phase 6 (AI-facing endpoints and llms.txt).
  - Dependency chain references the legacy provenance baseline rules (`docs/agents/10-legacy-provenance-baseline.md`) and notes historical blockers no longer apply; Proto-level catalog is anchored in `docs/provenance/phase-0b/README.md`.

- **Legacy Provenance Baseline (`migration/legacy_provenance_baseline`)**
  - Provides the Phase 0B baseline matrix linking legacy tests (Auth, ACL, Issue, Project, PR/Review, Git/Repo, Search) to modern layers, ownership, and deviation rules.
  - Flow enforces: legacy capability → legacy test inventory → modern target → owning team/deviation → Wave 1 exit reminder; every PR must cite a matrix row and link a red legacy test to its modern translation before signaling completion.
  - Anchors fixture/seeding strategies (`conf/test-data.yml`), translation annotations for traceability (`docs/agents/10-legacy-provenance-baseline.md`, `SPEC.md`), and canonical rules for Wave 1 auditing.

- **Legacy Schema Baseline (`migration/legacy_schema_baseline`)**
  - Details the schema manifest/manifest snapshots, migration scripts, SeaORM persistence contracts, and validation tests that recreate the legacy database foundation in Rust.
  - Layers include: canonical manifest (`yona-rust/crates/migration/legacy-final-schema-manifest.json`), migration flow (`migration/src/lib.rs` with SQL snapshot handling and rollback hygiene), SeaORM repos (`yona-rust/crates/persistence/src/lib.rs`, `repo.rs` with helper APIs for identity, roles, membership, favorites, and landing paths), and schema foundation tests (`tests/yona-rust-schema-foundation.test.mjs`) with dialect compatibility matrix (`yona-rust/crates/migration/dialect-compat-matrix.md` for Postgres/MySQL/SQLite).
  - Validates end-to-end consistency: manifest → migration scripts → persistence repositories → automated tests ensure legacy constraints and artifacts exist.

- **Relationships**
  - `phase_plan_overview` defines checkpoints and links to provenance baseline and Phase 0B content for gating and deferred scope.
  - `phase_0b_provenance` references the baseline rules and deferred features that feed future phases.
  - `legacy_provenance_baseline` provides the traceability and governance that make Phase 0B’s deliverables auditable for Wave 1 exit.
  - `legacy_schema_baseline` supplies the persistence and migration assurance underpinning the Rust migration effort referenced by provenance artifacts.

This structure preserves key decisions, dependencies, and entry points for deeper drilling into each subtopic.