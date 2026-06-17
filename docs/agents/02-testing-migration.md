# 02) 테스트 주도 마이그레이션 아키텍처

## 핵심 원칙

- 테스트 전략은 behavior-first이면서 legacy-provenance-first다.
- 구현자는 먼저 legacy source를 읽고 intent를 추출한 뒤 failing Red test를 작성한다.
- root mixed code도 reference-only migration material로 읽고 비교 기준으로 활용한다.
- legacy semantics와 다른 결정을 했다면 `deviation`을 남긴다.

## 계층 매핑 규칙

- Play controller test -> Rust HTTP/REST contract test 또는 route test
- Play model test -> Rust domain test
- `AccessControlTest` 류 -> domain ACL test + route authorization test
- `playRepository` test -> protocol integration test
- end-user flow -> Playwright E2E

## 필수 provenance

각 feature 또는 테스트 묶음은 최소한 아래를 남긴다.

- source legacy path
- extracted intent summary
- current mixed-code reference path
- Rust translation target layer
- canonical owner path
- intentionally dropped semantics 또는 `deviation`

## Feature Parity Evidence

각 Feature 구현 전후에는 아래 evidence가 PR/커밋/문서 중 하나에 남아야 한다.

- legacy route/controller/view/test 확인 결과
- Rust route/API/contract 대응
- UI parity evidence(스크린샷 또는 DOM/assertion)
- 추가/수정한 테스트 파일
- 남은 `gap`, `deviation`, `deferred` 항목

## Hard Gate

- primary legacy reference가 식별되어 있어야 한다.
- failing Red test가 먼저 존재해야 한다.
- Green 구현 후 target layer별 테스트가 통과해야 한다.
- Agent가 Rust `cargo test`를 실행할 때는 직접 `cargo test ...`를 호출하지 않고 `pnpm agent:cargo-test -- ...`를 사용한다. Codex 실행에서는 이 harness를 sandbox 밖 `require_escalated`로 실행해 sandbox I/O 지연을 피하고, 긴 cargo 출력은 `.agent/cargo-test-logs/` 로그 파일에 남긴다.
- legacy source가 없는 경우에만 spec-derived test를 단독 근거로 사용할 수 있다.
- `legacy와 동일`이라는 완료 주장은 Feature Parity Evidence 없이는 인정하지 않는다.
