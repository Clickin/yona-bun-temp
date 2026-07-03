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
4. 보호해야 하는 intent, permission result, state transition을 legacy에서 추출한다.
5. failing Red test를 먼저 작성한다.
6. `repo root` ownership 경계 안에서 Green 구현을 작성한다.
7. `deferred`, `gap`, `deviation`과 historical/banner 영향까지 함께 갱신한다.

## Scala HTML Goal 강제 규칙

- `/goal` 또는 사용자가 `docs/plans/2026-06-30-scala-html-goal-workflow.md` 기반 frontend 작업을 지시한 turn에서는 기존 React DOM을 기준으로 보정하지 않는다.
- 대상 화면의 `yona-original/app/views/**/*.scala.html`, 포함 partial, 관련 LESS/JS/messages를 먼저 식별하고 그 legacy 구조를 TSX로 구현한다.
- Scala HTML/legacy JS는 출력 DOM/UX와 동작 근거이지 내부 구현 방식의 근거가 아니다. jQuery, inline script, `document.*`, `addEventListener`, `classList`, `style.display`, HTML fragment fetch/insert, dynamic `dangerouslySetInnerHTML` 조립은 route TSX 내부 구현으로 복사하지 않고 React state/events/components와 TanStack Router/Query로 번역한다.
- `/goal` 기반 frontend route TSX/E2E 구현은 main agent가 직접 개발하지 않고 subagent를 먼저 spawn해서 맡긴다. main agent는 대상 선정, legacy 근거와 지시문 전달, 산출물 검수, 필요한 최소 통합/검증/커밋을 담당한다. subagent tool이 없으면 사용자가 main agent 직접 구현을 명시적으로 허용할 때까지 구현을 진행하지 않는다.
- 독립적인 frontend target이 둘 이상이면 여러 worker subagent를 동시에 spawn한다. 각 worker에는 route/screen, 허용 파일, 금지 파일을 포함한 명시적 write scope를 부여하고, 같은 route/같은 파일/선후행 의존성이 있는 작업만 직렬화한다.
- E2E metric, CSS, provenance만 추가하고 TSX 화면 구현을 바꾸지 않는 작업은 금지한다. 단, 같은 turn에서 해당 화면을 legacy Scala HTML 기준으로 재구축한 뒤 검증을 보강하는 경우는 허용한다.
- frontend route TSX를 바꾸는 goal turn은 같은 staged change에서 `docs/provenance/frontend-scala-html-goal-violation-audit.md`에 대상 route/screen state, legacy Scala HTML root, 포함 partial, TSX write scope, focused verification을 남긴다. `tools/scala-html-goal-guard.mjs`가 이 memo 갱신을 강제한다.
- 기존 TSX가 legacy Scala HTML과 다르면 기존 구현을 보존하려고 부분 패치하지 말고 화면 단위로 legacy template skeleton을 다시 만든다.
- subagent 지시문에는 반드시 legacy DOM/UX를 React state/events/components + TanStack Router/Query로 번역한다는 조건을 포함한다. subagent 산출물이 legacy Scala HTML source-of-truth를 먼저 대조하지 않았거나, 기존 React DOM에 맞춘 보정이거나, legacy DOM-control JS를 내부 구현으로 복사하면 통합하지 않고 폐기한다.

## 테스트 실행

- Agent가 Rust `cargo check`, `cargo test`, `cargo build --timings`, `cargo fmt` 등 cargo/rustc/rustfmt 기반 검증을 실행할 때는 Codex sandbox 안에서 실행하지 않는다. cargo/rustc/rustfmt는 macOS seatbelt sandbox에서 파일 접근 비용이 크게 늘어 feedback loop와 polling token 사용량을 왜곡하므로, cargo를 시작하는 tool invocation 전체를 항상 `require_escalated`로 sandbox 밖에서 실행한다.
- 일반 cargo 검증은 `pnpm agent:cargo -- --outside-sandbox <cargo args>`를 사용한다. 이 wrapper는 로그/가드 harness일 뿐 실행 환경을 분리하지 못하고 sandbox를 탈출하지 못하므로, wrapper를 호출하는 tool invocation 자체가 반드시 `require_escalated`여야 한다. `--outside-sandbox`는 escalated tool call에서만 쓰는 명시적 assertion이며, active `CODEX_SANDBOX` marker가 있는 sandbox 안에서 실행되면 cargo를 시작하지 않고 실패해야 한다. `CODEX_SANDBOX_NETWORK_DISABLED`는 escalated 호출에도 남을 수 있으므로 active sandbox 판별 기준으로 쓰지 않는다.
- Agent가 Rust 테스트를 실행할 때는 `cargo test ...`를 직접 호출하지 않고 `pnpm agent:cargo-test -- --outside-sandbox ...`를 사용하되, 이 wrapper를 호출하는 tool invocation도 `require_escalated`로 sandbox 밖에서 실행한다.
- `pnpm agent:cargo-test`는 전체 cargo 로그를 `.agent/cargo-test-logs/`에 저장하고 콘솔에는 시작/로그 경로/종료 결과와 실패 tail만 출력한다. 의도적 진단 외에는 `--allow-sandbox`를 사용하지 않는다.

## 코드 및 문서 배치 규칙

- 새 frontend 장기 구현은 `frontend/`에 둔다.
- 새 application API contract는 REST JSON API(`/api/v1`)와 frontend typed API client/TanStack Query 경계에 둔다.
- `proto/` 변경은 historical schema snapshot 유지가 필요할 때만 다룬다. runtime RPC surface나 frontend ConnectRPC client를 새로 추가하지 않는다.
- 새 backend 장기 구현은 `crates/*`에 둔다.
- `reference/mixed-code/**`는 legacy reference가 아니므로 구현 근거나 parity evidence로 사용하지 않는다.
- provenance 문서는 legacy source와 Rust target layer를 함께 남긴다.

## 금지 사항

- old stack을 current baseline처럼 복원하는 행위
- `reference/mixed-code/**`를 reference, parity evidence, canonical path처럼 문서화하는 행위
- 누락 기능을 기록 없이 숨기는 행위
- provenance 없이 기능 완료를 주장하는 행위
- `DESIGN.md`와 `yona-original/` 근거 없이 새 화면 톤/색상/타이포그래피를 도입하는 행위
