# 02) 테스트 주도 마이그레이션 아키텍처

## 핵심 원칙

- 테스트 전략은 behavior-first이면서 legacy-provenance-first다.
- 구현자는 먼저 legacy source를 읽고 intent를 추출한 뒤 기존 focused test 또는 최소 재현으로 동작을 확인한다. TDD 요청 시 Red → Green을 따르고, 영구 테스트는 실제 회귀 위험을 방어할 때 추가한다.
- 비교 기준은 `yona-original/`의 legacy source다. `reference/mixed-code/**`는 비교 기준이나 parity evidence로 사용하지 않는다.
- legacy semantics와 다른 결정을 했다면 `deviation`을 남긴다.
- pixel parity는 수정 불가로 동결한 legacy `yobi.less` 전체 import graph와 `bootstrap.css`/`bootstrap-responsive.css`만을 styling source로 검증한다. 새 보정 CSS 수치로 screenshot diff가 줄어도 동등성 통과로 보지 않는다.
- 최종 목표는 legacy Yona 1.16의 100% product parity다. `deferred`/`gap`은
  진행 중 bookkeeping일 뿐 최종 user-visible scope에서 남길 수 없다.
- 일반적인 사용자 관찰 가능 차이는 `accepted divergence`로 최종 승인하지
  않는다. 차이는 implementation-only 또는 proven legacy bug evidence가
  있어야 한다.
- JaCoCo는 discovery evidence이며 coverage percentage target이 아니다. 아래
  기존 gate를 사용하고 새 validation/reconciliation framework를 도입하지
  않는다.

## 계층 매핑 규칙

- Play controller test -> Rust HTTP/REST contract test 또는 route test
- Play model test -> Rust domain test
- `AccessControlTest` 류 -> domain ACL test + route authorization test
- `playRepository` test -> protocol integration test
- end-user flow -> WTR E2E (`frontend/tests/wtr/**/*.e2e.ts`, Chrome launcher)

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
- 버그 수정은 보고된 실패와 대응 재현 경로를 보존하고 수정 후 통과 증거를 남긴다.
- 구현 후 변경 계약에 해당하는 기존 target layer별 테스트와 실제 동작 검증이 통과해야 한다.
- UI parity diff가 있으면 element/DOM/class/cascade/asset/font/box-model 원인을 먼저 입증하고 수정해야 한다. React plugin 대체용 selector 번역은 원본 legacy file/selector/rule과 값 동일성을 provenance 및 focused test로 추적할 수 있어야 한다.
- 실행 권한·중앙 pnpm store·cargo wrapper·로그 정책은 `AGENTS.md`의 **검증 실행 환경**을 따른다. Astra / Oh My Pi에서 제공되지 않는 Codex 전용 tool 인자를 요구하지 않는다.
- legacy source가 없는 경우에만 spec-derived test를 단독 근거로 사용할 수 있다.
- `legacy와 동일`이라는 완료 주장은 Feature Parity Evidence 없이는 인정하지 않는다.
