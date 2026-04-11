# 05) Agent Execution Guidelines

## 변환 원칙

1. 기능 동등성만이 목표다.
2. 새 구조 제안이 목적이 아니다.
3. 기존 UI/UX를 유지한다.
4. canonical 구현은 `repo root`에 둔다.

## 기본 절차

1. 관련 `AGENTS.md`, `SPEC.md`, `docs/agents/*` mirror를 읽는다.
2. `yona-original/`에서 대응 legacy reference를 찾는다.
3. `reference/mixed-code/**`도 reference-only migration material로 읽는다.
4. 보호해야 하는 intent, permission result, state transition을 추출한다.
5. failing Red test를 먼저 작성한다.
6. `repo root` ownership 경계 안에서 Green 구현을 작성한다.
7. `deferred`, `gap`, `deviation`과 historical/banner 영향까지 함께 갱신한다.

## 코드 및 문서 배치 규칙

- 새 frontend 장기 구현은 `frontend/`에 둔다.
- 새 contract는 `proto/`에 둔다.
- 새 backend 장기 구현은 `crates/*`에 둔다.
- `reference/mixed-code/**` 경로에는 새 canonical ownership을 추가하지 않는다.
- provenance 문서는 legacy source, mixed-code reference, Rust target layer를 함께 남긴다.

## 금지 사항

- old stack을 current baseline처럼 복원하는 행위
- `reference/mixed-code/**`를 canonical path처럼 문서화하는 행위
- 누락 기능을 기록 없이 숨기는 행위
- provenance 없이 기능 완료를 주장하는 행위

