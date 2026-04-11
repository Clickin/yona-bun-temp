---
children_hash: 99093bcc73d4d052ef3663e6a48153037d7e7ab31e83a4c0b9b06ece68d7eeb7
compression_ratio: 0.5694130925507901
condensation_order: 2
covers: [context.md, runtime_stack_decisions/_index.md, yona_rust_pivot/_index.md]
covers_token_total: 1772
summary_level: d2
token_count: 1009
type: summary
---
# strategy Domain Overview (Level d2)

## Purpose & Scope
- **Domain Root (`context.md`)**: Strategy knowledge captures runtime stack decisions focused on parity-first delivery and future pivots. It emphasizes comparative stack analyses, fixed constraint evaluations, pivot triggers, and measurable scoring that justify primary/fallback choices while explicitly excluding implementation task tracking or unrelated release checklists. Owned by Platform Strategy Group, this domain is the reference for evaluating stack shifts or aligning parity metrics.

## Topics

### runtime_stack_decisions
- **Primary Source (`runtime_stack_decisions/_index.md`)**
  - **2026-04-06 Stack Decision Report**
    - Decision: Bun + TypeScript + React + TanStack Start + tRPC + Better Auth + Bun.SQL/Drizzle is the primary runtime stack; Go + React/TS serves as fallback; Rust + React/TS is reserved for a future Git-domain rebuild.
    - Structure: Tracks constraints → hard gate comparisons → weighted scoring → local evidence (repo leverage, Bun build/test snapshots, runtime metrics) → pivot rules.
    - Hard gates ensure day-one support for PostgreSQL/MySQL/MariaDB/SQLite plus executable Git/SVN integration with pass/caveat evaluations for Bun, Go, Rust.
    - Weighted scoring prioritizes parity leverage (Bun: 420, Go: 330, Rust: 280) across productivity, ecosystem maturity, ops fit, and live-preview readiness.
    - Pivot triggers: Specify exact conditions (e.g., sustained >1 GB warm RSS, TanStack Start stability issues, repeated Bun blockers, on-prem memory pressure) for elevating Go or Rust when reopening Git-centric execution.
  - **Context Link (`context.md`)**
    - Reinforces Bun+TypeScript primary stance, compares Bun/Go/Rust, and references governance context (`process/feature_parity_governance/2026_04_05_parity_wave_plan.md`) for parity wave alignment.
    - Highlights parity-first evaluation methodology, hard gate + weighted scoring framework, and explicit triggers for revisiting Go or Rust.

### yona_rust_pivot
- **Topic Summary (`yona_rust_pivot/_index.md`)**
  - **Context Entry (`context.md`)**
    - Establishes governance overview: AGENTS/SPEC canonical execution, conversion principles, workspace/documentation boundaries, product scope/phasing, and verification guardrails that govern the Rust pivot.
    - Serves as entry point for detailed governance details captured in `rust_pivot_execution_governance.md`.
  - **Execution Governance (`rust_pivot_execution_governance.md`)**
    - **Raw Concept & Flow**: Documents promotion of Rust pilot to canonical workspace, rewritten docs, provenance updates, historical banners, and verification enhancements (e.g., `pnpm verify:agents`) linking AGENTS → SPEC → docs/agents → provenance → plans/workflow.
    - **Narrative Structure**: Defines canonical workspace boundary (`yona-rust/{frontend,proto,crates/*}`), treats legacy mixed code as reference-only, enumerates product scope across phases 0–6 (covering auth/workspace/org/project parity through search/notifications/integrations and deployment hardening), details documentation governance, and enforces strict rules (no new abstractions, UI tweaks, or out-of-scope architecture discussions; mandatory historical banners; synchronized missing-feature recording).
    - **Dependencies & Highlights**: Relies on canonical docs (`AGENTS.md`, `SPEC.md`), docs/agents mirrors, provenance records, and the `verify:agents` script to enforce guardrails and skip-worktree requirements.
    - **Facts**: Emphasizes conversion principle of feature-parity-first, canonical document chain, dual recording of missing features, enforcement via `verify:agents`, and phase plan scope.
- **Key Takeaway**: Rust pivot governance is centered on canonical docs and workspace boundaries, automated verification, strict documentation rules, and phased product scope aligned with legacy parity; drill into `context.md` for the overview and `rust_pivot_execution_governance.md` for the detailed execution rules, dependencies, and facts.