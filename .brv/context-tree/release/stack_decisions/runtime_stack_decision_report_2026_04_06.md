---
title: Runtime Stack Decision Report 2026-04-06
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-05T15:38:55.965Z'
updatedAt: '2026-04-05T15:38:55.965Z'
---
## Raw Concept
**Task:**
Document the runtime stack decision rationale dated 2026-04-06 that keeps Bun+TypeScript+React+TanStack Start as the primary parity-first path while outlining fallback and future tracks.

**Changes:**
- Affirmed Bun+TypeScript+React+TanStack Start (with tRPC, Better Auth, Bun.SQL/Drizzle) as the primary parity-first stack.
- Recorded Go+React/TS as the prioritized fallback when Bun runtime memory or SFX stability issues block parity delivery.
- Marked Rust+React/TS as a future review track for deeper Git domain work after parity completion.

**Files:**
- docs/plans/2026-04-06-stack-decision-report.md

**Flow:**
Define decision scope and constraints -> Evaluate candidate stacks via hard gate table -> Collect measured evidence -> Score stacks with weighted criteria -> State recommendations and pivot triggers.

**Timestamp:** 2026-04-06

## Narrative
### Structure
Report progresses from the decision summary to fixed constraints, candidate definitions, the Hard Gate Result table, measured Bun evidence, weighted scoring tables, framework comparisons, markdown preview reasoning, popularity/LLM friendliness, and final recommendations including pivot triggers.

### Dependencies
Dependencies include feature parity as the top principle, immediate parity across PostgreSQL/MySQL/MariaDB/SQLite, executable-based Git/SVN integration, SFX plus Docker/K8s deployment considerations, and TanStack Start/Bun stability for release-grade parity.

### Highlights
Measured Bun Windows SFX results: first 200 OK ~850 ms, warm route checks (`/`, `/login`, `/projects`, `/search?q=test`) all return 200, warm RSS ~219.1 MB.

Hard Gate Result table:
| Gate | Bun + TS | Go + React/TS | Rust + React/TS | Notes |
| --- | --- | --- | --- | --- |
| Windows/Linux/macOS SFX | Pass with caveat | Pass | Pass | Bun은 공식 target 지원이 있으나 현재 Yona app 기준 direct compile caveat가 있다. |
| PostgreSQL/MySQL/SQLite | Pass | Pass with caveat | Pass | Go는 SQLite에서 `cgo` vs pure-Go 선택 이슈가 있다. |
| Compiled language/runtime | Pass | Pass | Pass | 셋 다 충족 |
| Git/SVN executable integration | Pass | Pass | Pass with caveat | Rust는 `gitoxide` 장점이 있지만 현재 Yona는 executable 고정 결정이다. |
| TPS 1000+ | Pass | Pass | Pass | 이 기준은 변별점이 아니라 통과선이다. |

Weighted Score table:
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

### Rules
Fixed Constraints:
- 변환 프로젝트의 최우선 원칙은 기능 동등성이다. 새 구조 제안이 목적이 아니다.
- 현재 canonical baseline은 이미 `TanStack Start + React + Bun`이다.
- DB는 `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 day 1부터 동등 지원해야 한다.
- Git/SVN은 현재 고정 결정상 system executable 기반이다.
- 배포는 현장별 SFX와 메인 사이트의 Docker/K8s 운영을 함께 고려해야 한다.
- 잦은 scale-out/HPA는 전제하지 않는다.
- parity 이후 최우선 개선은 `live markdown preview`다.

Pivot triggers:
아래 중 하나가 발생하면 `Go` 재평가를 시작한다.
1. 현장형 Windows SFX 기준 `warm RSS`가 안정적으로 `1GB`를 넘는다.
2. TanStack Start 기반 SFX가 release-ready 경로로 정리되지 않는다.
3. Bun runtime 이슈가 parity delivery를 반복적으로 막는다.
4. on-prem 현장에서 메모리 제약이 예상보다 더 강하게 반복된다.

아래 조건이 생기면 `Rust`는 재검토할 수 있다.
1. parity가 끝난 뒤 Git domain을 더 깊게 재구축하고 싶다.
2. VCS 레이어에서 executable 고정 결정을 다시 열 수 있다.
3. 조직이 Rust 유지보수 인력과 리뷰 문화를 감당할 준비가 된다.

## Facts
- **primary_stack**: Primary runtime stack recommendation keeps Bun + TypeScript + React + TanStack Start + tRPC for parity-first delivery. [project]
- **fallback_stack**: Go + React/TS is designated as the fallback when Bun runtime, SFX stability, or memory exceed 1GB on-prem scenarios block parity. [project]
- **rust_future_track**: Rust + React/TS remains a future consideration primarily for Git domain depth after parity, but is not the primary choice now. [project]
- **sfx_measurement**: Measured Windows SFX warm RSS is approximately 219.1 MB with the first 200 OK around 850 ms and warm routes returning 200. [environment]
- **weighted_scores**: Weighted scoring tallies Bun 420, Go 330, and Rust 280 across parity leverage, productivity, memory, ops, DB/VCS, live preview, and ecosystem criteria. [project]
