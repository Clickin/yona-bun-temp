# 00) 목표와 고정 의사결정

## Canonical Source

- `AGENTS.md`가 에이전트 실행 규칙의 메인 source of truth다.
- `AGENTS.md`의 변환 원칙은 `SPEC.md`를 포함한 모든 문서에 우선한다.
- `SPEC.md`는 Rust pivot 이후 기술적 상세의 canonical source다.
- 권한 우선순위와 기능/UX 근거 우선순위는 분리한다. 권한은 `AGENTS.md` > `SPEC.md` > repo root 순서이며, 기능/UX/copy/deep-link 근거는 `yona-original/` > `SPEC.md` > `docs/provenance/*` 순서다.
- 이 문서는 `AGENTS.md`와 `SPEC.md`를 실행 규칙 중심으로 요약한 mirror다.

## 목표

- Yona를 `Rust + React` 기반의 단일 애플리케이션 워크스페이스로 재정렬한다.
- 최종 목표는 legacy Yona 1.16의 **100% legacy-product parity**다.
- issue tracker 축소판이 아니라 legacy Yona 전체 surface를 기준으로 삼는다.
- 진행 중 누락은 `deferred`, `gap`, `deviation`으로 기록하지만 최종
  user-visible `deferred`/`gap`은 0이어야 한다.
- 1·2순위는 구현 순서일 뿐 최종 scope exclusion이 아니다. 일반적인
  `accepted observable divergence`는 최종 상태로 승인하지 않는다.
- JaCoCo는 discovery evidence일 뿐 coverage percentage 목표가 아니다. 기존
  validation gate만 사용하고 새 validation/reconciliation framework를 만들지
  않는다.
- 이 repository는 release 대상이 아니다. 100% parity human acceptance 뒤 새
  canonical repository에서만 최초 release를 수행한다.

## 고정 의사결정

- 1차 기능/UX 근거 source of truth는 `yona-original/`이다.
- canonical implementation baseline은 repo root다.
- historical spike evidence는 `reference/spikes/**`에 둔다.
- canonical frontend ownership은 `frontend/`다.
- canonical application API contract는 REST JSON API(`/api/v1`)와 frontend typed API client/TanStack Query 경계다.
- `proto/`는 REST pivot 이전 message schema snapshot으로만 다루며 runtime ConnectRPC surface나 새 기능의 기본 contract source가 아니다.
- 최소 ownership은 `crates/server`, `domain`, `persistence-entities`, `persistence`, `migration`, `vcs`, `search`, `integrations`로 고정한다.
- `reference/mixed-code/**`는 legacy reference가 아니다. 남아 있다면 pre-Rust Bun/TanStack/tRPC/Drizzle 잔여 코드로만 취급한다.
- `reference/spikes/**`는 historical spike archive다.
- historical 문서는 삭제하지 않고 status banner와 Rust pivot 이후 설명을 붙인다.
