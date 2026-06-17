# 05) Agent Execution Guidelines

## 변환 원칙

1. 기능 동등성만이 목표다.
2. 새 구조 제안이 목적이 아니다.
3. 기존 UI/UX를 유지한다.
4. canonical 구현은 `repo root`에 둔다.

## 기본 절차

1. 관련 `AGENTS.md`, `SPEC.md`, `docs/agents/*` mirror를 읽는다.
2. `yona-original/`에서 대응 legacy reference를 찾는다.
3. frontend component design 또는 화면 styling 작업이면 `DESIGN.md`와 legacy LESS/view 근거를 함께 확인한다.
4. `reference/mixed-code/**`도 reference-only migration material로 읽는다.
5. 보호해야 하는 intent, permission result, state transition을 추출한다.
6. failing Red test를 먼저 작성한다.
7. `repo root` ownership 경계 안에서 Green 구현을 작성한다.
8. `deferred`, `gap`, `deviation`과 historical/banner 영향까지 함께 갱신한다.

## 테스트 실행

- Agent가 Rust 테스트를 실행할 때는 `cargo test ...`를 직접 호출하지 않고 `pnpm agent:cargo-test -- ...`를 사용한다.
- Codex에서는 `pnpm agent:cargo-test`를 sandbox 밖 `require_escalated`로 실행한다. harness는 Codex sandbox 내부의 실제 cargo 실행을 즉시 거절한다. 전체 cargo 로그는 `.agent/cargo-test-logs/`에 저장되고 콘솔에는 시작/종료와 실패 tail만 출력한다.

## 코드 및 문서 배치 규칙

- 새 frontend 장기 구현은 `frontend/`에 둔다.
- 새 application API contract는 REST JSON API(`/api/v1`)와 frontend typed API client/TanStack Query 경계에 둔다.
- `proto/` 변경은 historical schema snapshot 유지가 필요할 때만 다룬다. runtime RPC surface나 frontend ConnectRPC client를 새로 추가하지 않는다.
- 새 backend 장기 구현은 `crates/*`에 둔다.
- `reference/mixed-code/**` 경로에는 새 canonical ownership을 추가하지 않는다.
- provenance 문서는 legacy source, mixed-code reference, Rust target layer를 함께 남긴다.

## 금지 사항

- old stack을 current baseline처럼 복원하는 행위
- `reference/mixed-code/**`를 canonical path처럼 문서화하는 행위
- 누락 기능을 기록 없이 숨기는 행위
- provenance 없이 기능 완료를 주장하는 행위
- `DESIGN.md`와 `yona-original/` 근거 없이 새 화면 톤/색상/타이포그래피를 도입하는 행위
