# AGENTS.md: Yona

## 변환 원칙 (Conversion Principles) — 최우선

**이 프로젝트는 기능 변환 프로젝트다. 새로운 구조를 제안하는 프로젝트가 아니다.**

1. **기능 동등성만이 목표다.** 레거시 Yona가 제공하는 동일한 기능을 동일한 UX로 구현한다.
2. **1:1 기술적 대응이 아니다.** Java/Play의 특정 클래스를 Rust의 특정 타입으로 대응시키는 것이 아니라, 사용자 관점에서 동일한 기능과 경험을 제공하는 것이 목표다.
3. **새로운 구조를 제안하지 않는다.** 기능 구현에 필요한 최소 구조만 사용한다. 여기서 "최소 구조"는 `SPEC.md` Section 3의 고정 결정에 한정한다.
4. **기존 UI/UX를 그대로 구현한다.** 화면, 레이블, 동선, 기능은 `yona-original/`을 기준으로 한다. "개선"을 이유로 임의로 바꾸지 않는다.
5. **에이전트의 역할은 구현이다.** 더 나은 구조를 설계하는 것이 아니라, 기존 기능을 새 스택으로 구현하는 것이다.

### 우선순위 분리

| 순위 | 범위 | 시기 |
| --- | --- | --- |
| 1순위 | 레거시 Yona 핵심 기능 동등 구현(인증, 프로젝트, 이슈, 보드, PR/리뷰, 검색, 알림, 관리) | 현재 |
| 2순위 | SVN, LDAP, Import/Export, 마이그레이션 도구 등 구현 난이도가 높거나 우선순위가 낮은 기능 | 변환 완료 후 |
| 3순위 | 아키텍처 개선, 성능 최적화, 새로운 기능 추가 | 개선 단계 |

> "변환 완료" 기준은 `SPEC.md` Section 6 Definition of Done이다.

### 명시적 금지

- `SPEC.md` Section 3의 고정 결정 밖으로 새 패턴이나 추상화를 제안하지 않는다.
- 레거시에 없는 기능을 "개선"이라는 이름으로 추가하지 않는다.
- 기존 UI/UX를 "개선"한다는 이유로 임의로 바꾸지 않는다.
- 변환 범위를 벗어난 아키텍처 논의를 현재 작업에 끌어오지 않는다.

## Canonical Order

- `AGENTS.md`는 에이전트 실행 규칙의 메인 source of truth다.
- 이 문서의 변환 원칙은 `SPEC.md`를 포함한 모든 문서에 우선한다.
- `SPEC.md`는 Rust pivot 이후 기술적 상세의 canonical execution spec이다.
- `docs/agents/*.md`는 이 문서와 `SPEC.md`를 실행 관점으로 요약한 mirror다.
- `docs/provenance/*`는 legacy intent, gap, deviation, deferred scope의 근거 문서다.
- `docs/plans/*`, `docs/workflow/*`는 status banner가 없으면 현재 기준으로 읽지 말고 검토 후 배너를 붙인다.

## Project Goal

- Yona를 `Rust + React` 기반의 단일 애플리케이션 워크스페이스로 재정렬해 레거시 Yona의 기능과 UX를 최대한 그대로 변환 구현한다.
- canonical 구현 경로는 top-level [`yona-rust/`](/G:/programming/yona/yona-rust)다.
- 목표는 issue tracker 축소판이 아니라 legacy Yona functional parity와 UX parity다.
- 일부 기능 누락은 허용되지만, 모든 누락은 `deferred`, `gap`, `deviation` 중 하나로 반드시 기록한다.

## Fixed Decisions

- 1차 source of truth는 [`yona-original/`](/G:/programming/yona/yona-original)의 Java/Play 기반 legacy Yona다.
- 2차 canonical implementation baseline은 [`yona-rust/`](/G:/programming/yona/yona-rust)다.
- 3차 migration/reference material은 현재 root의 Bun/Go 혼합 코드(`frontend/`, `packages/*`, `cmd/`, `internal/`, `apps/*`, `proto/` 등)다.
- canonical frontend ownership은 [`yona-rust/frontend/`](/G:/programming/yona/yona-rust/frontend)에 둔다.
- canonical contract source of truth는 [`yona-rust/proto/`](/G:/programming/yona/yona-rust/proto)에 둔다.
- 최소 ownership은 다음 경계로 고정한다.
  - [`yona-rust/crates/server`](/G:/programming/yona/yona-rust/crates/server): runtime bootstrap, HTTP/RPC, asset delivery, session/auth bootstrap
  - [`yona-rust/crates/domain`](/G:/programming/yona/yona-rust/crates/domain): parity-first domain behavior, ACL, invariant
  - [`yona-rust/crates/persistence`](/G:/programming/yona/yona-rust/crates/persistence): DB access, entities, repositories, dialect handling
  - [`yona-rust/crates/migration`](/G:/programming/yona/yona-rust/crates/migration): schema, seed, migration
  - [`yona-rust/crates/vcs`](/G:/programming/yona/yona-rust/crates/vcs), [`yona-rust/crates/search`](/G:/programming/yona/yona-rust/crates/search), [`yona-rust/crates/integrations`](/G:/programming/yona/yona-rust/crates/integrations): 후속 vertical slice owner
- root mixed-code 경로는 모두 reference-only 또는 legacy-only로 재분류한다.
- historical 문서는 삭제하지 않는다. `historical`, `superseded`, `reference-only` 상태 배너를 붙이고, 현재 canonical 설명은 Rust pivot 이후 위치로 갱신한다.

## Execution Rules

- 작업 전 이 문서의 변환 원칙, 관련 `SPEC.md` 섹션, `docs/agents/*` mirror를 먼저 확인한다.
- 구현 전 대응 legacy route/test/model과 UI 기준을 `yona-original/`에서 식별한다.
- 구현 전 현재 root 혼합 코드의 대응 경로도 함께 읽되, reference-only migration material로 다룬다.
- 새 canonical 구현이나 문서 기준선은 `yona-rust/`를 기준으로 적는다.
- root Bun/Go 혼합 코드, `TanStack Start`, in-process `tRPC`, `createServerFn`, Go backend 관련 결정은 현재 baseline처럼 서술하지 않는다.
- 일부 기능이 아직 비어 있으면 반드시 세 계층에 남긴다.
  - root canonical 문서: deferred scope
  - provenance 문서: gap 또는 deviation
  - 계획 문서: follow-up item
- 변환 완료 전에는 기능 구현에 필요한 최소 구조만 사용하고, 추가 구조 제안은 하지 않는다.

## Document Index

- `docs/agents/00-goals-and-fixed-decisions.md`
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
