---
title: Differential parity verification — closed inventory × live differential sweep × fast loop
kind: plan
status: historical/interim; superseded by the Phase 0 Closure Contract
created: 2026-08-22
---

# 차등 패리티 검증 계획 (2026-08-22 확정)

> 이 문서는 당시 differential tooling 설계와 현재 evidence를 보존한다.
> `AGENTS.md`/`SPEC.md`의 Phase 0 Closure Contract가 우선하며, 이 문서를
> 근거로 새 validation/reconciliation framework, coverage percentage 목표,
> 또는 이 repository의 release 판정을 추가하지 않는다.

## 목표

기존 validation lane과 differential evidence로 legacy Yona user-visible
behavior를 발견·비교한다. 자동 evidence만으로 100% parity 또는 human
acceptance를 판정하지 않는다.

## 확정 결정 (사용자 승인, 2026-08-22)

1. **Ground truth: 차등 테스팅** — `scripts/legacy-localhost.mjs`(공식 yona-h2 릴리스 +
   parity 시드 유저)로 legacy 실구동, Yoram 인스턴스 동시 구동, 동일 시나리오 통과 후 결과 diff.
   기대값을 사람이 쓰지 않는다.
2. **범위: UI + API + 부작용(DB/알림)** — 렌더 DOM 정규화 diff + API 응답 diff +
   SQL 의미 프로젝션 diff(스키마가 다르므로 row diff가 아닌 의미 수준 비교:
   issue(title,state,author)/notification(수신자,행위) 등).
3. **드라이버: HTTP 본대 + 브라우저 보강** — 추상 행동 시나리오를 앱별 어댑터로 번역하는 HTTP
   듀얼 어댑터가 본대. drag&drop, due-date 캘린더, hover popover 등 소수 상호작용만 양측
   브라우저 시나리오(기존 WTR harness 재사용)로 보강.
4. **우선순위: 레인 재배치 먼저** — AI 검증 루프가 경제적으로 성립하려면 iteration이 분 단위여야 한다.
5. **판정 위치: 기존 야간 차등 스윕과 human acceptance** — 매 커밋 gate에
   넣지 않으며 새 판정 framework를 추가하지 않는다.

## Final closure boundary (이 문서의 release 공식 아님)

```
final-closure =
  existing validation evidence reviewed
  && user-visible legacy scope has no deferred/gap rows
  && no ordinary accepted observable divergence
  && human acceptance on one HEAD
```

위 조건은 release 명령이나 coverage percentage KPI가 아니다. 조건 충족 전에는
이 repository에서 RC/public release를 만들지 않으며, 충족 뒤 새 canonical
repository에서만 release한다.

## Phase

### Phase A — 레인 재배치 (먼저)
- `frontend/tests/e2e-lane-manifest.json`의 chrome 레인 666 파일 대상.
- `scripts/classify-e2e-specs.mjs`를 확장해 capability 사용(geometry/computed-style/
  hit-test/document-reload/native-navigation/window-realm-reset)별 정적 분류.
- 순수 DOM 시맨틱 파일은 dom 레인으로 이관. 혼합 파일은 pivot 문서 규칙대로
  `.dom.e2e.ts` + `.chrome.e2e.ts` 물리 분할 후 이관.
- 이동 트리거는 `DOM_UNSUPPORTED:*` 가드 에러뿐(단순 assertion 실패는 이동 금지).
- 완료 기준: chrome 레인이 진짜 브라우저 의존 파일만 남음. full chrome gate는 실행하지 않고,
  새 dom 레인 편입분은 dom 레인으로 빠르게 검증.

### Phase B — 행동 인벤토리 기계 추출 (A와 병렬, 읽기 전용)
- `yona-original/` routes + `*.scala.html` + `public/javascripts/yobi/*.js`에서 행동 단위 추출:
  `{id, route, legacyEvidence, actor, action, trigger, expectedEffects}`.
- 산출물: `docs/provenance/behavior-inventory.json` + 재생성 스크립트
  `scripts/build-behavior-inventory.mjs`.
- 각 항목 ↔ 차등 시나리오 ID 매핑 필드 포함(Phase C가 소비).
- 완결성 = uncovered 항목 0. 기존 감사 스크립트(route-coverage, parity-spec-coverage)는
  경로 축으로 흡수한다.

### Phase C — 차등 스윕 인프라
- `legacy-localhost.mjs` 위에 Yoram 인스턴스 동시 기동(parity 시드 공유 전제로 계정 정렬).
- 시나리오 DSL: 추상 행동(login, 이슈 생성/수정/전이, 댓글, 라벨, 마일스톤, PR, 알림 확인…).
- 듀얼 어댑터: legacy direct form POST ↔ Yoram `/api/v1`. 각 단계 후:
  - 결과 페이지 headless 렌더 → e2e canonicalizer 방식 정규화 → HTML diff
  - API 응답 diff
  - SQL 의미 프로젝션 diff(issues/posts/comments/watchers/notifications)
- 산출물: `(route × state × 부작용)` 위반 리포트.

### Phase D — 브라우저 보강
- HTTP로 불가능한 상호작용만 양측 브라우저 시나리오 소수 집합으로. 기존 WTR harness 재사용.

### Phase E — 기존 evidence 운영
- 야간 전체 시나리오 차등 스윕 + 리포트 생성.
- 기존 parity/release checks를 운영하고 결과를 provenance에 남긴다. 새
  validation/reconciliation framework나 수치형 coverage release gate는
  추가하지 않는다.
- 기존 58개 baseline-known 실패와 flake 잔여는 새 체계 흡수 과정에서 재현 여부로 폐기/승격.

## 근거

- `docs/provenance/tailwind-dom-parity-pivot.md` — 3-contract 모델, 레인 규칙, 가드 정의
- `scripts/legacy-localhost.mjs`, `scripts/legacy-curl-proxy.mjs` — legacy 구동 인프라 존재
- `frontend/tests/e2e-lane-manifest.json` — chrome 666 / dom 198 현황
- WTR full gate 52–61분 vs dom lane 38초 (>80×)
