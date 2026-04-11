---
children_hash: f95653fa37541da7cb81570b842715212b11f8cf4bd2e1f1958f9b509cb530dc
compression_ratio: 0.5874901029295329
condensation_order: 1
covers: [context.md, runtime_stack_decision_report_2026_04_06.md]
covers_token_total: 1263
summary_level: d1
token_count: 742
type: summary
---
# stack_decisions Structural Summary

## Domain focus
- **Primary aim**: Document the 2026-04-06 runtime stack decision that reaffirms Bun+TypeScript+React+TanStack Start as the parity-first strategy while mapping fallback (Go) and future (Rust) tracks for the Yona runtime stack (context.md, runtime_stack_decision_report_2026_04_06.md).

## Key architectural decisions
- **Primary stack**: Bun runtime with TypeScript, React, TanStack Start, tRPC, Better Auth, and Bun.SQL/Drizzle ensures parity delivery. Live markdown preview remains the top post-parity improvement focus (runtime_stack_decision_report_2026_04_06.md).
- **Hard gate constraints**: Must deliver parity across PostgreSQL/MySQL/MariaDB/SQLite, support Git/SVN through executables, accommodate SFX plus Docker/K8s deployments, and prioritize feature parity over structural overhauls (runtime_stack_decision_report_2026_04_06.md).
- **Fallback track**: Go + React/TS re-evaluated when Bun/SFX memory issues or unreliability block parity (runtime_stack_decision_report_2026_04_06.md).
- **Future track**: Rust + React/TS revisited post-parity for deeper Git domain work if executable decisions open and Rust review capacity exists (runtime_stack_decision_report_2026_04_06.md).

## Evaluation and scoring
- **Flow**: Decision process runs from scope/constraints → candidate definition → hard gate table → measured Bun evidence → weighted scoring → recommendations/pivot triggers (runtime_stack_decision_report_2026_04_06.md).
- **Hard gate results**: All candidates pass core gates, but Bun retains caveats on direct compilation and Go has SQLite cgo choice; Rust has gitoxide advantage but current executable lock (runtime_stack_decision_report_2026_04_06.md).
- **Measured Bun evidence**: Windows SFX first 200 OK ~850 ms, warm route checks succeed, warm RSS ~219.1 MB (runtime_stack_decision_report_2026_04_06.md).
- **Weighted scoring**: Bun scores 420 (top parity leverage, live preview, ecosystem), Go 330 (strong memory/ops), Rust 280 (resource efficiency) across criteria including parity leverage, productivity, memory, ops fit, multi-DB/VCS, live preview, ecosystem maturity (runtime_stack_decision_report_2026_04_06.md).

## Rules and triggers
- **Fixed constraints**: Enforce feature parity, TanStack Start baseline, day-one db coverage, executable-based Git/SVN, SFX + Docker/K8s deployment, no assumption of frequent scale-out (runtime_stack_decision_report_2026_04_06.md).
- **Pivot triggers**: Reevaluate Go if Bun SFX warm RSS >1 GB, TanStack Start path stalls, Bun runtime repeatedly blocks parity, or on-prem memory constraints persist. Reevaluate Rust post-parity when Git depth, executable policy, and Rust review readiness align (runtime_stack_decision_report_2026_04_06.md).

## Related navigation
- Drill into `release/demo_ready_pr_merge_review/landing_plan_2026_04_05_demo_ready_pr_merge_review.md` for adjacent planning context noted in stack_decisions overview (context.md).