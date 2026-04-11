# Yona Rust + React Rebuild SPEC

Status: Canonical Draft v2  
Date: 2026-04-07  
Language: Korean-first, English identifiers

## 1. 문서 목적

이 문서는 Rust pivot 이후 Yona의 canonical execution spec이다.

이 문서는 다음 목적을 가진다.

- legacy Yona parity와 UX parity의 기준을 고정한다.
- `repo root`를 canonical implementation baseline으로 고정한다.
- root 혼합 코드와 historical 문서를 reference-only로 재분류한다.
- 누락 기능을 `deferred`, `gap`, `deviation`으로 명시하는 규칙을 고정한다.

## 1.5 변환 원칙

이 프로젝트는 기술 선택 재검토 프로젝트가 아니라 **기능 동등성 변환 프로젝트**다. `AGENTS.md`의 변환 원칙이 이 문서 전체에 우선한다.

- 레거시 Yona가 제공하는 동일한 기능을 동일한 UX로 구현한다.
- 1:1 기술적 대응이 아니라 사용자 관점의 동일한 기능과 경험이 목표다.
- 새로운 구조 제안, 추상화 추가, UI 개선 제안은 변환 완료 이후에만 검토한다.
- `yona-original/`이 기능과 UX의 최상위 기준이다.

## 2. Summary

Yona의 문서 기준선은 다음 순서를 따른다.

1. [`yona-original/`](/G:/programming/yona/yona-original): 기능/UX parity의 1차 source of truth
2. [repo root](/G:/programming/yona): 현재 canonical implementation baseline
3. `reference/mixed-code/**`: reference-only migration material
4. `reference/spikes/**`: historical spike archive

현재 canonical 구현은 repo root workspace에서 진행한다. 이 경로는 공개 저장소 기준의 full app workspace이며 React frontend, proto contract, Rust crate 경계를 함께 가진다.

일부 기능 누락은 허용된다. 다만 모든 누락은 다음 셋 중 하나로 기록해야 한다.

- `deferred`: 현재 우선순위 밖이라 의도적으로 뒤로 미룸
- `gap`: legacy 대비 아직 구현되지 않음
- `deviation`: 의도적으로 다른 의미나 UX를 채택함

## 3. Fixed Decisions

### 3.1 Source Ordering

- 1차 source of truth는 legacy Java/Play Yona다.
- canonical implementation baseline은 repo root다.
- 3차 migration/reference material은 `reference/mixed-code/**`다.
- `reference/mixed-code/**`는 useful source material일 수 있지만 canonical baseline이 아니다.

### 3.2 Canonical Workspace Structure

canonical 구조는 다음으로 고정한다.

```text
repo root
  Cargo.toml            # workspace manifest
  buf.yaml              # protobuf module manifest
  buf.gen.yaml          # browser client codegen manifest
  frontend/                # React SPA
  proto/                   # canonical contract source
  crates/
    server/                # runtime bootstrap, HTTP/RPC, asset delivery, session/auth bootstrap
    domain/                # parity-first domain behavior, ACL, invariant
    persistence/           # DB access, entities, repositories, dialect handling
    migration/             # schema, seed, migration
    vcs/                   # Git/SVN and repository vertical slice owner
    search/                # search vertical slice owner
    integrations/          # notification/integration vertical slice owner
```

현재 workspace에 일부 crate가 아직 비어 있거나 미구현이어도, ownership 경계 자체는 이 구조를 기준으로 문서화한다.

### 3.3 Frontend Baseline

- canonical frontend ownership은 `frontend/`다.
- frontend는 `React` SPA 기준을 유지한다.
- frontend routing은 `frontend/src/routes/**` 기반의 file-based / directory-based TanStack Router로 고정한다.
- generated `routeTree.gen.ts`와 route modules만이 route source of truth다. static route table, manual route matcher, route-kind registry는 다시 도입하지 않는다.
- 기존 root `frontend/`의 route/query/screen composition은 reference-only migration material이다.
- UI layout, copy, CTA, menu, deep-link flow는 `yona-original/`을 기준으로 맞춘다.

### 3.4 Contract and Runtime Baseline

- canonical contract source of truth는 `proto/`다.
- session/auth bootstrap, HTTP/RPC, asset delivery, runtime base-path handling은 `crates/server/`의 소유 범위다.
- parity-first domain behavior와 ACL은 `crates/domain/`이 소유한다.
- DB access, repositories, dialect handling은 `crates/persistence/`가 소유한다.
- schema, seed, migration은 `crates/migration/`이 소유한다.
- VCS, search, integrations는 각 vertical crate owner로 분리한다.

이 문서는 old stack의 transport/runtime 선택을 현재 baseline으로 승격하지 않는다. `reference/mixed-code/**`에 남아 있는 Go backend, `connect-go`, `chi`, `uptrace/bun`, `TanStack Start`, in-process `tRPC`, `createServerFn`, `Better Auth` 관련 내용은 모두 reference-only다.

### 3.5 Reference Archive Reclassification

다음 경로는 canonical 구현 위치가 아니라 reference-only migration material이다.

- `reference/mixed-code/**`
- `reference/spikes/**`

이 경로들은 useful reference일 수 있지만, 새 canonical ownership을 추가하지 않는다.

### 3.6 Deployment Baseline

- 배포 기준선은 Rust application workspace다.
- single-binary/SFX와 Docker/Kubernetes를 모두 지원 대상으로 둔다.
- 실행 파일에 embed 되는 정적 자산과 user-uploaded asset은 구분한다.
- runtime base path는 first-class 요구사항으로 취급한다.

## 4. Documentation Governance

### 4.1 Canonical Documents

- root canonical 문서: `AGENTS.md`, `SPEC.md`, `README.md`, `CLAUDE.md`
- mirror 문서: `docs/agents/*.md`
- provenance 문서: `docs/provenance/*`
- historical 문서: `docs/plans/*`, `docs/workflow/*`, old stack decision 문서군

### 4.2 Historical Document Rule

historical 문서는 삭제하지 않는다. 대신 아래 3단계를 적용한다.

1. 제목 아래에 `historical`, `superseded`, `reference-only` 상태 배너를 붙인다.
2. 현재 기준처럼 읽히는 요약, 결론, 추천, baseline 문구는 Rust pivot 이후 위치로 교체한다.
3. 세부 실행 절차와 당시 판단 근거는 historical record로 보존한다.

### 4.3 Provenance Update Rule

docs/provenance 1차 wave는 다음만 강제 전환한다.

- owner path
- target layer
- current baseline
- canonical implementation path

legacy behavior mapping, legacy test inventory, semantic intent narrative는 보존한다. provenance narrative 대수술은 2차 wave다.

### 4.4 Missing Feature Recording Rule

누락 기능은 세 문서 계층에 동시에 기록한다.

- root canonical 문서: deferred scope
- provenance 문서: gap 또는 deviation
- 계획 문서: follow-up item

문서 어디에도 "일부 누락 가능"만 적고 실제 항목을 비워 두는 서술을 남기지 않는다.

## 5. Product Scope

### 5.1 1차 범위

- 인증과 사용자 작업공간
- 조직과 프로젝트
- 이슈와 보드
- 저장소 브라우저와 VCS
- PR/리뷰
- 검색
- 알림/연동
- 관리자 기능

### 5.2 2차 범위

- SVN
- LDAP
- Import/Export
- migration tooling

### 5.3 3차 범위

- 아키텍처 개선
- 성능 최적화
- 레거시에 없는 신규 기능

## 6. Phase Plan and Definition of Done

### 6.1 Phases

- Phase 0: Rust workspace promotion, 문서 기준선 정리, provenance owner/target 갱신
- Phase 1: auth, workspace, organization, project
- Phase 2: issues, comments, attachments, labels, milestones
- Phase 3: repository browser, smart HTTP, commit discussion, VCS flows
- Phase 4: pull request and review parity
- Phase 5: search, board, notifications, integrations
- Phase 6: admin, migration, deployment hardening

### 6.2 Definition of Done

다음 조건이 모두 참일 때에만 변환 완료로 본다.

- `yona-original/` 대비 핵심 기능과 UX parity가 확보된다.
- canonical 구현 위치가 `repo root`로 일관된다.
- `reference/mixed-code/**`가 더 이상 current baseline처럼 읽히지 않는다.
- provenance 문서가 legacy source, current mixed-code reference, Rust target layer, canonical owner를 함께 남긴다.
- historical 문서에 상태 배너가 붙고, 현재 기준 오독 가능성이 제거된다.
- `deferred`, `gap`, `deviation` 기록이 root canonical, provenance, plan docs 사이에서 서로 대응된다.
- 문서 무결성 검증과 필요한 링크/경로 검증이 통과한다.

### 6.3 Verification Baseline

문서 전환 작업의 기본 검증은 아래를 포함한다.

- `bun --cwd reference/mixed-code/root-toolchain run verify:agents`
- canonical docs에서 old stack이 current baseline처럼 남지 않았는지 검색 확인
- former Rust pilot path가 current canonical path처럼 남지 않았는지 확인
- `repo root` 기준의 링크와 예시 명령 검증



