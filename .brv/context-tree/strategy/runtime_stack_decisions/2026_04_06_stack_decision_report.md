---
title: 2026-04-06 Stack Decision Report
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T15:38:51.388Z'
updatedAt: '2026-04-05T15:38:51.388Z'
---
## Raw Concept
**Task:**
Document the 2026-04-06 runtime stack decision report advising Bun+TypeScript as primary, Go as fallback, and Rust as future option while cataloging constraints, evidence, comparisons, and pivot triggers.

**Changes:**
- Affirmed Bun + TypeScript + React + TanStack Start + tRPC + Better Auth + Bun.SQL/Drizzle as the primary parity-first stack.
- Captured Go and Rust alternative evaluations via hard gate results, weighted scoring, and narrative pros/cons.
- Enumerated pivot triggers that would prompt reevaluation toward Go or Rust in future cycles.

**Files:**
- docs/plans/2026-04-06-stack-decision-report.md

**Flow:**
Decision criteria and fixed constraints -> Candidate definitions -> Hard gate table -> Local evidence -> Weighted scoring -> Framework comparisons -> Markdown/live preview rationale -> Popularity/LLM friendliness -> Alternative reasoning -> Final recommendation -> Pivot triggers -> Bottom line.

**Timestamp:** 2026-04-06

## Narrative
### Structure
Document layout: Decision reminder, fixed constraints, comparator candidates (Bun, Go, Rust), Hard Gate table, measured local evidence (repo leverage + Bun verification/build results + runtime metrics), Weighted Score table, detailed pros/cons for each framework, markdown/live preview rationale, popularity/LLM friendliness, explanation of Go/Rust alternatives, final recommendation, pivot triggers, and the bottom-line summary. Hard Gate table remains exactly as reported to preserve row-level decisions:
| Gate | Bun + TS | Go + React/TS | Rust + React/TS | Notes |
| --- | --- | --- | --- | --- |
| Windows/Linux/macOS SFX | Pass with caveat | Pass | Pass | Bun은 공식 target 지원이 있으나 현재 Yona app 기준 direct compile caveat가 있다. |
| PostgreSQL/MySQL/SQLite | Pass | Pass with caveat | Pass | Go는 SQLite에서 `cgo` vs pure-Go 선택 이슈가 있다. |
| Compiled language/runtime | Pass | Pass | Pass | 셋 다 충족 |
| Git/SVN executable integration | Pass | Pass | Pass with caveat | Rust는 `gitoxide` 장점이 있지만 현재 Yona는 executable 고정 결정이다. |
| TPS 1000+ | Pass | Pass | Pass | 이 기준은 변별점이 아니라 통과선이다. |
Weighted Score table preserved as reported:
| Criterion | Weight | Bun + TS | Go + React/TS | Rust + React/TS |
| --- | ---: | ---: | ---: | ---: |
| Parity leverage / current investment | 25 | 5 | 2 | 1 |
| Productivity / KR talent pool | 15 | 5 | 3 | 2 |
| Memory / resource efficiency | 20 | 3 | 4 | 5 |
| SFX / Docker / ops fit | 15 | 3 | 5 | 4 |
| Multi-DB + VCS practicality | 10 | 4 | 4 | 3 |
| Post-parity live markdown preview | 10 | 5 | 2 | 2 |
| Ecosystem maturity + LLM friendliness | 5 | 5 | 4 | 3 |
| Weighted total | 100 | 420 | 330 | 280 |


### Dependencies
Fixed constraints require day-one support for PostgreSQL, MySQL/MariaDB, SQLite, executable Git/SVN integration rules, and deployment considerations for on-prem SFX plus Docker/K8s shared operation without assuming frequent scale-out/HPA.

### Highlights
Primary recommendation: keep Bun + TypeScript + React + TanStack Start for fastest parity completion and smooth live markdown preview addition. Fallback: Go + React/TS when memory/SFX stability or runtime blockers surface. Rust remains a future track tied to deep Git domain rebuilding, executable policy reconsideration, and operational readiness. Evidence includes repo leverage counts, Bun build/test results, runtime measurements, and the parity-weighted scoring matrix.

### Rules
Go reevaluation triggers: (1) 현장형 Windows SFX 기준 warm RSS가 안정적으로 1GB를 넘는다. (2) TanStack Start 기반 SFX가 release-ready 경로로 정리되지 않는다. (3) Bun runtime 이슈가 parity delivery를 반복적으로 막는다. (4) on-prem 현장에서 메모리 제약이 예상보다 더 강하게 반복된다. Rust reevaluation triggers: (5) parity가 끝난 뒤 Git domain을 더 깊게 재구축하고 싶다. (6) VCS 레이어에서 executable 고정 결정을 다시 열 수 있다. (7) 조직이 Rust 유지보수 인력과 리뷰 문화를 감당할 준비가 된다.

### Examples
Measured evidence includes file counts (TS/TSX 319, TSX 46, TanStack references 292, tRPC references 263, Better Auth references 273, Bun references 23, packages/db spec files 17), Bun build/test outcomes (bun run test:db, bun run build pass; bun build --compile apps/app/src/server.ts fails due to virtual module resolution but dist builds succeed for Windows; cross-target dist builds currently fail due to executable extraction issues), and Bun runtime snapshots (200 OK ~850 ms, warm RSS ~219.1 MB).

## Facts
- **primary_stack**: Primary stack for parity-first delivery remains Bun + TypeScript + React + TanStack Start + tRPC + Better Auth + Bun.SQL/Drizzle. [project]
- **fallback_stack**: Go + React/TS is the fallback if Bun memory, Warm RSS, or runtime stability repeatedly block parity. [project]
- **rust_future**: Rust + React/TS is deferred until post-parity Git domain rebuilding, executable policy changes, and improved Rust operational readiness converge. [project]
- **weighted_score**: Weighted scoring under parity/productivity priorities produced totals of Bun 420, Go 330, and Rust 280. [project]
- **go_pivot_triggers**: Go reevaluation triggers include warm RSS sustaining >1GB, TanStack Start SFX not release-ready, Bun runtime parity blockers, and repeated on-prem memory stress. [project]
- **fixed_constraints**: Parity demands day-one support for PostgreSQL, MySQL/MariaDB, and SQLite, and Git/SVN integrations must remain executable-based. [project]
