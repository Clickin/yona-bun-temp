# deepseek v4 pro 단일 계획 프롬프트 (e2e 잔여 클로저 + 가속)

> 이 프롬프트는 **한 번의 추론**으로 전체 문제를 계획하도록 설계됐다. pro의 추론
> 비용이 비싸므로 아래 입력을 전부 읽고 **단일 응답**으로 완결된 실행 계획을
> 작성하라. 실행은 plan runner(별도 세션)가 수행한다 — 계획은 prescription
> 수준(파일/변경 지시)이어야 하며 "조사하라" 같은 열린 지시 금지.

---

## 역할

당신은 Yona 레거시→Rust+React 변환 프로젝트(`/Users/senghyunjo/github/yona-bun-temp`)의
수석 계획자다. 목표는 `test:e2e:fast` 전체 실행의 잔여 실패를 문서화된 HARNESS_ENV
목록까지 내리고, 추가로 e2e 실행 속도를 가속하는 실행 계획을 세우는 것이다.
**기능 변환 프로젝트** — 새로운 구조 제안 금지, 레거시(`yona-original/`)의 기능/UX
동등만이 목표. `AGENTS.md` 변환 원칙이 최우선 (권한: AGENTS.md > SPEC.md > repo root).

## 입력 (모두 읽고 계획에 반영)

1. `local://e2e-problems-inventory.md` — 전체 문제 인벤토리 (상태 요약, 이 세션 해결분,
   미해결 후보, SVN deferred, HARNESS_ENV, 로드맵, 가속 후보)
2. `local://e2e-residual-classification.md` — **per-failure 분류 + fix prescription 원본**
   (242 스펙 / 491 실패: CSS_GAP 174, ROUTE_DOM 78, HARNESS_ENV 103, SOURCE_PIN 41,
   FIXTURE 35, CANONICALIZER 32)
3. `local://e2e-residual-closure-plan.md` — 기존 실행 계획 (Step 0 재측정 → Step 1
   클러스터 수정 → Step 2 HARNESS_ENV → Step 3 게이트)
4. `AGENTS.md` — 실행 규칙 (canonical order, parity gate, audit row, cargo/pnpm
   sandbox 규칙, WTR 직렬)

## 요구사항 (출력이 이 구조를 따라야 함)

### Part A — Step 0 재측정 후 확정 실행 목록
- fresh full run(`WTR_SHARDS=2`, `/tmp/e2e-rebase.log`)이 필요한 이유와, 그 결과를
  분류 파일과 대조해 **실제 실행 대상 목록**을 확정하는 절차 (ALREADY_FIXED 제거,
  신규 실패 분류 추가, ledger 재생성 명령).
- 분류 파일의 prescription은 그대로 실행 (재설계 금지) — 단, prescription이 모호하거나
  현재 HEAD와 불일치하면 대체 방안을 prescription 수준으로 제시.

### Part B — 클러스터 실행 계획 (Step 1)
- 397개 fixable 실패를 **병렬 편집 가능한 클러스터**로 나눠라 (파일 충돌 없는 그룹핑,
  같은 route/스펙은 한 클러스터). 각 클러스터: 대상 스펙 목록, subagent 지시문 템플릿
  (분류 파일 섹션을 읽고 prescription 적용), 검증 순서 (WTR 직렬 — 한 번에 하나),
  커밋 단위 (route TSX 변경 시 audit row 1행 — 실 legacy scala.html 전체 경로 +
  같은 커밋의 e2e 파일).
- 32 subagent 동시 실행 상한 준수.

### Part C — HARNESS_ENV 확정 (Step 2)
- 103개 HARNESS_ENV 실패를 3부류로 확정: (1) font-metric re-pin 대상 (측정값 + F5
  주석), (2) WTR facade/iframe 한계 (인라인 ledger 주석만, route/CSS 변경 금지),
  (3) 실서버 의존 (env-gated skip 유지). **각 실패에 대해 어떤 부류인지 명시.**
- re-pin 대상은 "앱이 동결 legacy CSS를 정확히 렌더함"을 코드 대조로 확인한 것만
  (pro가 그 근거를 파일/라인으로 지목).

### Part D — 최종 게이트 + 문서화 (Step 3)
- 최종 per-run 실패 수 = 문서화된 HARNESS_ENV 목록과 1:1 일치하는지 검증 절차.
- closure 측정 행 (audit 파일 패턴) 초안.
- 최종 `agent:turn-commit` 실행 규칙.

### Part E — e2e 가속 계획 (새 요구사항, 최우선 아님)
현재 실측: focused run 18–45s (항상 rebuild), 전체 게이트 ~30분+ (430 files,
WTR_SHARDS=2), WTR 직렬 전용. 다음을 **구체 실행 계획**으로 제시:
- rebuild 스킵 (소스/스펙 미변경 시 dist 재사용, vite incremental)
- WTR_SHARDS 확장 (2→4/8, 포트 격리 + warm cache)
- Chrome launcher 재사용/headless 유지
- mock fetch registry memo (동일 fixture 재서빙)
- prior-page DOM 누수 격리 후 병렬 안전화
- 60s timeout 테스트 스플릿
각 항목: 변경 파일, 위험(직렬 전제 위반), 검증 방법, 예상 절감. **반드시
`frontend/web-test-runner.config.mjs`, `wtr-compat.ts`, `package.json` 스크립트를
읽고 현실적인 prescription만** (가정 금지).

### Part F — 리스크 & 블로커
- batch run 결과는 신뢰 불가 (solo가 진실) — 병렬화 시 prior-page DOM 누수.
- scala-html-goal guard: route TSX 커밋당 정확히 1 audit 행, 실 legacy scala.html.
- WTR 포트 8128/8129 공유 — 동시 실행 금지.
- SVN-* 15 스펙은 deferred (이 계획 범위 밖, 명시만).

## 출력 형식
- 마크다운, 한국어, prescription 수준 (파일 경로 + 변경 내용 + 검증 명령).
- 각 클러스터에 "완료 판정" (focused run 명령 + 예상 GREEN 수).
- 전체 실행 순서 (Step 0 → 클러스터 → HARNESS_ENV → 게이트 → 가속) 와 예상 커밋 수.
- 추정 시간 예산 (full run 1회 ~30분 기준).
