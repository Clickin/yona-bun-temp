# 02) 테스트 주도 마이그레이션 아키텍처

## 핵심 원칙

- 테스트 전략은 behavior-first이면서 legacy-provenance-first다.
- 구현자는 먼저 legacy source를 읽고 intent를 추출한 뒤 failing Red test를 작성한다.
- 비교 기준은 `yona-original/`의 legacy source다. `reference/mixed-code/**`는 비교 기준이나 parity evidence로 사용하지 않는다.
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
- Agent가 Rust `cargo check`, `cargo test`, `cargo build --timings`, `cargo fmt` 등 cargo/rustc/rustfmt 기반 검증을 실행할 때는 Codex sandbox 안에서 실행하지 않는다. cargo/rustc/rustfmt는 macOS seatbelt sandbox에서 파일 접근 비용이 크게 늘어 feedback loop와 polling token 사용량을 왜곡하므로, cargo를 시작하는 tool invocation 전체를 항상 `require_escalated`로 sandbox 밖에서 실행한다.
- 일반 cargo 검증은 `pnpm agent:cargo -- --outside-sandbox <cargo args>`를 사용한다. 이 wrapper는 로그/가드 harness일 뿐 실행 환경을 분리하지 못하고 sandbox를 탈출하지 못하므로, wrapper를 호출하는 tool invocation 자체가 반드시 `require_escalated`여야 한다. `--outside-sandbox`는 escalated tool call에서만 쓰는 명시적 assertion이며, active `CODEX_SANDBOX` marker가 있는 sandbox 안에서 실행되면 cargo를 시작하지 않고 실패해야 한다. `CODEX_SANDBOX_NETWORK_DISABLED`는 escalated 호출에도 남을 수 있으므로 active sandbox 판별 기준으로 쓰지 않는다.
- Agent가 Rust `cargo test`를 실행할 때는 직접 `cargo test ...`를 호출하지 않고 `pnpm agent:cargo-test -- --outside-sandbox ...`를 사용하되, 이 wrapper를 호출하는 tool invocation도 `require_escalated`로 sandbox 밖에서 실행한다. harness는 긴 cargo 출력을 `.agent/cargo-test-logs/` 로그 파일에 남기고 콘솔에는 시작/로그 경로/종료 결과와 실패 tail만 남긴다. 의도적 진단 외에는 `--allow-sandbox`를 사용하지 않는다.
- legacy source가 없는 경우에만 spec-derived test를 단독 근거로 사용할 수 있다.
- `legacy와 동일`이라는 완료 주장은 Feature Parity Evidence 없이는 인정하지 않는다.
