# AGENTS.md: Yona

## 변환 원칙 (Conversion Principles) — 최우선

**이 프로젝트는 기능 변환 프로젝트다. 새로운 구조를 제안하는 프로젝트가 아니다.**

1. **기능 동등성만이 목표다.** 레거시 Yona가 제공하는 동일한 기능을 동일한 UX로 구현한다.
2. **1:1 기술적 대응이 아니다.** Java/Play의 특정 클래스를 Rust의 특정 타입으로 대응시키는 것이 아니라, 사용자 관점에서 동일한 기능과 경험을 제공하는 것이 목표다.
3. **새로운 구조를 제안하지 않는다.** 기능 구현에 필요한 최소 구조만 사용한다. 여기서 "최소 구조"는 `SPEC.md` Section 1의 고정 결정에 한정한다.
4. **기존 UI/UX를 그대로 구현한다.** 화면, 레이블, 동선, 기능은 `yona-original/`을 기준으로 한다. "개선"을 이유로 임의로 바꾸지 않는다.
5. **에이전트의 역할은 구현이다.** 더 나은 구조를 설계하는 것이 아니라, 기존 기능을 새 스택으로 구현하는 것이다.

### 우선순위 분리

| 순위 | 범위 | 시기 |
| --- | --- | --- |
| 1순위 | 레거시 Yona 핵심 기능 동등 구현(인증, 프로젝트, 이슈, 보드, PR/리뷰, 검색, 알림, 관리) | 현재 |
| 2순위 | SVN, LDAP, Import/Export, 마이그레이션 도구 등 구현 난이도가 높거나 우선순위가 낮은 기능 | 변환 완료 후 |
| 3순위 | 아키텍처 개선, 성능 최적화, 새로운 기능 추가 | 개선 단계 |

> "변환 완료" 기준은 `SPEC.md` Section 8 Definition of Done이다.

### 명시적 금지

- `SPEC.md` Section 1의 고정 결정 밖으로 새 패턴이나 추상화를 제안하지 않는다.
- 레거시에 없는 기능을 "개선"이라는 이름으로 추가하지 않는다.
- 기존 UI/UX를 "개선"한다는 이유로 임의로 바꾸지 않는다.
- 변환 범위를 벗어난 아키텍처 논의를 현재 작업에 끌어오지 않는다.

## Canonical Order

- `AGENTS.md`는 에이전트 실행 규칙의 메인 source of truth다.
- 이 문서의 변환 원칙은 `SPEC.md`를 포함한 모든 문서에 우선한다.
- `SPEC.md`는 Rust pivot 이후 기술적 상세의 canonical execution spec이다.
- 권한 우선순위와 기능/UX 근거 우선순위는 분리한다. 권한은 `AGENTS.md` > `SPEC.md` > repo root 순서이며, 기능/UX/copy/deep-link 근거는 `yona-original/` > `SPEC.md` > `docs/provenance/*` 순서다.
- `docs/agents/*.md`는 이 문서와 `SPEC.md`를 실행 관점으로 요약한 mirror다.
- `docs/provenance/*`는 legacy intent, gap, deviation, deferred scope의 근거 문서다.
- `docs/plans/*`, `docs/workflow/*`는 status banner가 없으면 현재 기준으로 읽지 말고 검토 후 배너를 붙인다.

## Project Goal

- Yona를 `Rust + React` 기반의 단일 애플리케이션 워크스페이스로 재정렬해 레거시 Yona의 기능과 UX를 최대한 그대로 변환 구현한다.
- canonical 구현 경로는 top-level [repo root](/G:/programming/yona)다.
- 목표는 issue tracker 축소판이 아니라 legacy Yona functional parity와 UX parity다.
- 일부 기능 누락은 허용되지만, 모든 누락은 `deferred`, `gap`, `deviation` 중 하나로 반드시 기록한다.

## Fixed Decisions

- 1차 기능/UX 근거 source of truth는 [`yona-original/`](/G:/programming/yona/yona-original)의 Java/Play 기반 legacy Yona다.
- 2차 canonical implementation baseline은 [repo root](/G:/programming/yona)다.
- 3차 migration/reference material은 `reference/mixed-code/**`다. historical spike evidence는 `reference/spikes/**`에 둔다.
- canonical frontend ownership은 [`frontend/`](/G:/programming/yona/frontend)에 둔다.
- canonical application API contract는 REST JSON API(`/api/v1`)와 frontend typed API client/TanStack Query 경계에 둔다. `proto/`는 REST pivot 이전 message schema snapshot으로만 다루며 runtime ConnectRPC surface나 새 기능의 기본 contract source가 아니다.
- 최소 ownership은 다음 경계로 고정한다.
  - [`crates/server`](/G:/programming/yona/crates/server): runtime bootstrap, HTTP/REST, asset delivery, session/auth bootstrap
  - [`crates/domain`](/G:/programming/yona/crates/domain): parity-first domain behavior, ACL, invariant
  - [`crates/persistence-entities`](/G:/programming/yona/crates/persistence-entities): SeaORM generated entities and relation derives
  - [`crates/persistence`](/G:/programming/yona/crates/persistence): DB access, repositories, dialect handling, entity re-exports
  - [`crates/migration`](/G:/programming/yona/crates/migration): schema, seed, migration
  - [`crates/vcs`](/G:/programming/yona/crates/vcs), [`crates/search`](/G:/programming/yona/crates/search), [`crates/integrations`](/G:/programming/yona/crates/integrations): 후속 vertical slice owner
- `reference/mixed-code/**` 경로는 모두 reference-only 또는 legacy-only로 재분류한다.
- historical 문서는 삭제하지 않는다. `historical`, `superseded`, `reference-only` 상태 배너를 붙이고, 현재 canonical 설명은 Rust pivot 이후 위치로 갱신한다.

## Execution Rules

- 작업 전 이 문서의 변환 원칙, 관련 `SPEC.md` 섹션, `docs/agents/*` mirror를 먼저 확인한다.
- 구현 전 대응 legacy route/test/model과 UI 기준을 `yona-original/`에서 식별한다.
- frontend component design 또는 화면 styling 작업 전에는 [`DESIGN.md`](/G:/programming/yona/DESIGN.md)를 확인하고, `yona-original/`의 view/LESS 근거를 우선한다.
- 구현 전 `reference/mixed-code/**`의 대응 경로도 함께 읽되, reference-only migration material로 다룬다.
- 새 canonical 구현이나 문서 기준선은 `repo root`를 기준으로 적는다.
- root Bun/Go 혼합 코드, `TanStack Start`, in-process `tRPC`, `createServerFn`, Go backend 관련 결정은 현재 baseline처럼 서술하지 않는다.
- 일부 기능이 아직 비어 있으면 반드시 세 계층에 남긴다.
  - root canonical 문서: deferred scope
  - provenance 문서: gap 또는 deviation
  - 계획 문서: follow-up item
- 같은 Phase에 남은 `gap`은 Phase 종료 blocker다. 종료하려면 구현하거나, 이후 Phase/deferred로 재분류하고 root canonical 문서, provenance, phase plan에 사유를 남긴다.
- 변환 완료 전에는 기능 구현에 필요한 최소 구조만 사용하고, 추가 구조 제안은 하지 않는다.
- Agent가 Rust `cargo check`, `cargo test`, `cargo build --timings`, `cargo fmt` 등 cargo/rustc/rustfmt 기반 검증을 실행할 때는 Codex sandbox 안에서 실행하지 않는다. cargo/rustc/rustfmt는 macOS seatbelt sandbox에서 파일 접근 비용이 크게 늘어 feedback loop와 polling token 사용량을 왜곡하므로, cargo를 시작하는 tool invocation 전체를 항상 `require_escalated`로 sandbox 밖에서 실행한다.
- Agent가 일반 cargo 검증을 실행할 때는 `pnpm agent:cargo -- --outside-sandbox <cargo args>`를 사용한다. 이 wrapper는 로그/가드 harness일 뿐 실행 환경을 분리하지 못하고 sandbox를 탈출하지 못하므로, wrapper를 호출하는 tool invocation 자체가 반드시 `require_escalated`여야 한다. `--outside-sandbox`는 escalated tool call에서만 쓰는 명시적 assertion이며, active `CODEX_SANDBOX` marker가 있는 sandbox 안에서 실행되면 cargo를 시작하지 않고 실패해야 한다. `CODEX_SANDBOX_NETWORK_DISABLED`는 escalated 호출에도 남을 수 있으므로 active sandbox 판별 기준으로 쓰지 않는다.
- Agent가 Rust `cargo test`를 실행할 때는 직접 `cargo test ...`를 호출하지 않고 `pnpm agent:cargo-test -- --outside-sandbox ...`를 사용하되, 이 wrapper를 호출하는 tool invocation도 `require_escalated`로 sandbox 밖에서 실행한다. 전체 cargo 출력은 `.agent/cargo-test-logs/`에 저장하고 콘솔에는 시작/로그 경로/종료 결과와 실패 tail만 남긴다. 의도적 진단 외에는 `--allow-sandbox`를 사용하지 않는다.
- 매 turn 종료 전 변경이 있으면 반드시 turn commit hook을 `require_escalated`로 실행한다: `pnpm agent:turn-commit -- -m "<concise summary>"`.
- turn commit hook은 `git add -A`, `tools/precommit-verify.mjs`, `git commit`을 같은 경로로 수행한다. hook이 실패하면 최종 응답 전에 blocker를 수정하거나 실패 사유를 보고한다.
- 변경이 없을 때는 hook이 no-op으로 종료될 수 있으며, 이 경우 최종 응답에 clean 상태를 명시한다.

## Document Index

- `docs/agents/00-goals-and-fixed-decisions.md`
- `DESIGN.md`
- `docs/agents/01-frontend-architecture.md`
- `docs/agents/02-testing-migration.md`
- `docs/agents/03-repo-structure.md`
- `docs/agents/04-architecture-guardrails.md`
- `docs/agents/05-agent-execution-guidelines.md`
- `docs/agents/06-phase-plan.md`
- `docs/agents/07-rust-sfx-deployment.md`
- `docs/agents/08-rust-deployment-strategy.md`
- `docs/agents/09-llm-onboarding-checklist.md`
- `docs/agents/10-legacy-provenance-baseline.md`
