# 00) 목표와 고정 의사결정

## Canonical Source

- `AGENTS.md`가 에이전트 실행 규칙의 메인 source of truth다.
- `AGENTS.md`의 변환 원칙은 `SPEC.md`를 포함한 모든 문서에 우선한다.
- `SPEC.md`는 Rust pivot 이후 기술적 상세의 canonical source다.
- 이 문서는 `AGENTS.md`와 `SPEC.md`를 실행 규칙 중심으로 요약한 mirror다.

## 목표

- Yona를 `Rust + React` 기반의 단일 애플리케이션 워크스페이스로 재정렬한다.
- 목표는 legacy Yona functional parity와 UX parity다.
- issue tracker 축소판이 아니라 legacy Yona 전체 surface를 기준으로 삼는다.
- 일부 기능 누락은 허용되지만 반드시 `deferred`, `gap`, `deviation`으로 기록한다.

## 고정 의사결정

- 1차 source of truth는 `yona-original/`이다.
- 2차 canonical implementation baseline은 `yona-rust/`다.
- 3차 migration/reference material은 root mixed code다.
- canonical frontend ownership은 `yona-rust/frontend/`다.
- canonical contract source는 `yona-rust/proto/`다.
- 최소 ownership은 `yona-rust/crates/server`, `domain`, `persistence`, `migration`, `vcs`, `search`, `integrations`로 고정한다.
- root `frontend/`, `packages/*`, `cmd/`, `internal/`, `apps/*`, `proto/`는 reference-only다.
- historical 문서는 삭제하지 않고 status banner와 Rust pivot 이후 설명을 붙인다.
