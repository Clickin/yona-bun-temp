---
children_hash: d6f33d9ab365a1cf13da1d7a571c83cffd47c65224a5ad18ca0c0d5e6337c84e
compression_ratio: 0.25165562913907286
condensation_order: 1
covers: [2026_04_06_stack_decision_report.md, context.md]
covers_token_total: 1510
summary_level: d1
token_count: 380
type: summary
---
### Domain: runtime_stack_decisions

- **2026-04-06 Stack Decision Report**
  - Documents the parity-first runtime stack choice with Bun + TypeScript + React + TanStack Start + tRPC + Better Auth + Bun.SQL/Drizzle as the primary path, Go + React/TS as the fallback, and Rust + React/TS reserved for future Git-domain rebuilds.
  - Structure preserves decision flow from fixed constraints through hard-gate comparisons, weighted scoring, local evidence (repo leverage, Bun build/test snapshots, runtime metrics), and concluding pivot triggers.
  - Hard gates enforce day-one support for PostgreSQL/MySQL/MariaDB/SQLite and executable Git/SVN integration, with pass/caveat statuses across Bun, Go, and Rust.
  - Weighted scoring emphasizes parity leverage → Bun 420, Go 330, Rust 280, reflecting productivity, ecosystem maturity, ops fit, and live-preview readiness.
  - Pivot rules detail precise triggers for switching to Go (e.g., sustained >1 GB warm RSS, TanStack Start SFX instability, repeated Bun parity blockers, on-prem memory pressure) and for elevating Rust (post-parity Git overhaul, executable policy change, Rust staffing readiness).

- **context.md**
  - Overview reinforces the choice of Bun+TypeScript as primary, reviews comparisons with Go and Rust, and points to process/feature_parity_governance/2026_04_05_parity_wave_plan.md for governance context.
  - Key concepts capture parity-first evaluation, hard gate/weighted scoring methodology, and the explicit pivot triggers for Go or Rust reevaluation.