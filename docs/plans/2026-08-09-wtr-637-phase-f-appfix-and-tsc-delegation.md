# WTR-637 Phase F — F7 앱 패리티 잔여 해소 + tsc 정리 (에이전트 위임 프롬프트)

> status: delegation target (2026-08-09) — 실행 전 `pnpm agent:scala-html-goal-automation`으로 range audit 선행
> slug: wtr-637-phase-f-appfix-and-tsc-delegation
> date: 2026-08-09
> 상위 플랜: `docs/plans/2026-08-07-wtr-637-failure-remediation.md` (Phases 0-E 완료), `docs/provenance/wtr-637-ledger.md`, `docs/provenance/wtr-637-reconciliation-report.md`

## Context (현재 상태, 모두 기록 기반)

- wtr-637 최종 게이트(`pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:stylex-final -- .`):
  **2835 passed / 213 failed / 1035s** (preview build, 2026-08-09). exit 1.
- 213 residual의 구성 (Phase E reconciliation):
  - **134건 ledger-mapped F7 app-fix** (진짜 앱 UI parity gap, Phase D wave로 미해소, deferred)
  - 46건 unmapped 중 17 F5 / 21 F6 / **3 F7** / 5 F9 / 1 F2
  - 나머지: copy-pin(F5/F6), retained-class(F6), flaky/timeout(F9), harness(F2)
- **frontend tsc: 26 errors, 정확히 2개 파일** (2026-08-09 측정):
  - `frontend/src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber.tsx` — 22건
  - `frontend/src/routes/organizations/$organizationName/boards.tsx` — 4건
- 릴리즈 gate(SPEC §8 DoD, RC scope) 요구: `pnpm --dir frontend test` green, `pnpm --dir frontend build` green, tsc 0.
  현재 미충족. 이 문서는 그 두 가지(잔여 F7 + tsc)를 닫는 위임 패키지다.

## 목표

1. **Workstream B (선행, 소형)**: frontend tsc 0 달성 — 2개 파일 26 errors 정리. 행동 변경 없음.
2. **Workstream A (본 작업)**: 213 residual 중 F7 app-fix 전부(≈137건: 134 + Task A 3건)를 구현해
   `test:e2e:stylex-final` gate가 **문서화된 잔여만 남고(flaky/harness/copy 계열) F7이 0건**이 되도록 한다.
   F5/F6(테스트 copy pin)는 이번 범위에서 함께 정리해도 됨(기계적, C wave와 동일 규칙).
3. 산출물: ledger/플랜 갱신, `docs/provenance/frontend-scala-html-goal-violation-audit.md` per-route 기록, gate 숫자 갱신.

---

## Workstream B — tsc 0 (먼저 수행, 모든 wave의 tsc-0 gate를 여는 선행)

검증 커맨드: `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec tsc --noEmit` → 0 errors.

### B-1. `pullRequest/$pullRequestNumber.tsx` (22 errors)

- 원인: 상수 `LEGACY_LINK_PROPS`(약 40행)가 `search: { __legacyPullRequestDetailActiveMarker: undefined }`를
  `to="/$user"`, `to="/$ownerName/$projectName/commit/$commitId"`, `to=".../code/..."` 등 **typed search schema를 가진
  Link**들에 스프레드 → TanStack Router 1.170.18의 타입 검사에서 `search` 불일치 22건.
- 의도(반드시 보존): legacy anchor에 TanStack의 `aria-current`/`data-status`가 붙지 않도록 링크를 "절대 active로
  매칭되지 않게" 하는 마커(search marker + `activeOptions: { exact: true, explicitUndefined: true, includeHash: true, includeSearch: true }`
  + `activeProps` 무효화). `li.active` 탭 표시는 별도 className이 담당.
- 제약:
  - DOM/UX/동작 불변. 이 라우트 소유 WTR 스펙(pull-request detail 계열)이 기존과 동일하게 green 유지.
  - type-safe한 대체 메커니즘을 택할 것 — `as never`/`@ts-ignore`/`any` 캐스팅 금지.
  - 동일 패턴이 `src/routes/...` 다른 곳에 복제되어 있으면(검색 후) 함께 정리하되, 이번 커밋 범위는
    이 파일 + 복제본만.
  - 참고: 마커가 없어도 `activeProps: { "aria-current": undefined, ... }`만으로 충분한지, 또는
    `activeOptions` 조합으로 바꿀 수 있는지는 WTR 스펙으로 실증. 기존 주석의 "STATIC_ACTIVE_PROPS가
    matched link의 activeProps를 덮어쓴다"는 관찰이 사실이면 마커를 type-safe하게 유지해야 함.
    (예: 대상 라우트별로 실제로 발생 불가능한 유효 search 값을 쓰는 등 — 구현자가 검증해서 결정.)

### B-2. `organizations/$organizationName/boards.tsx` (4 errors)

- 원인: `stripLegacyBoardSearchDefaults` 미들웨어(약 100-170행) 파라미터 타입이
  `{ search: OrganizationBoardsSearchInput; next: (search) => OrganizationBoardsSearch }`인데
  TanStack 1.170.18 `SearchMiddleware`는 `SearchMiddlewareContext<OrganizationBoardsSearch>`(validated 타입)를 기대:
  - 110행 `next(search, true)` — next가 1인자만 받는 시그니처 (2인자 호출)
  - 111/112행 `search`/`meta` 프로퍼티 불일치
  - 168행 전체 미들웨어 타입 불일치
- 의도(반드시 보존): legacy 정렬 링크는 orderBy/orderDir만 실어 보내므로, reset 미들웨어가 기본값을
  다시 제거(`meta.explicit` 기반 "네비게이션이 명시적으로 준 파라미터만 유지")하는 런타임 동작.
  `organization-boards.e2e.ts`의 sort-reset 스펙이 green 유지되어야 함.
- 제약: `@tanstack/react-router` 1.170.18 소스에서 `SearchMiddleware`/`SearchMiddlewareContext`/`next`의 실제
  시그니처(meta.explicit 존재 여부 포함)를 확인 후, 타입-정확한 형태로 재작성. 런타임 동작 불변.
  `any`/캐스팅 금지. `docs/provenance/frontend-scala-html-goal-violation-audit.md`의 2026-08-01 Batch 1108 행이
  "이미 1.170.18 타입에 적응됐다"고 기록돼 있으나 현재 코드는 미적응 상태 — 이 행의 주장과 실제 코드가 다르므로
  수정 후 해당 감사 행도 갱신.

---

## Workstream A — F7 app-fix (본 작업)

### A-0. 실행 전 반드시 수행

1. `pnpm agent:scala-html-goal-automation` 실행(AGENTS.md 의무). range audit이 없거나 실패하면 중단.
2. **현재 red 목록 재생성**: gate 빌드 후 전체 스윕
   (`test:e2e:stylex-final -- .`, ~17분) → `/tmp/fails.json` 형태로 실패 row 추출.
3. 각 row를 `docs/provenance/wtr-637-ledger.md`의 triage row와 매핑(ledger row가 곧 작업 단위).
   - `app-fix` disposition → **구현 대상 (Workstream A)**
   - `copy-fix-current-dom` / `copy-fix-dist-truth` / `retained-class-retention` / `C2-retire` → **copy/pin 수정**
   - `flaky-green`/`harness-investigate` → 재실행/재분류 (구현 금지, 문서만)
   - 매핑 안 되는 새 실패 → reconciliation report 방식으로 신규 triage row 추가

### A-1. per-fix contract (모든 수정에 적용, wtr-637 Phase D 계약 유지)

1. **legacy 근거 필수**: 수정 전 `yona-original/app/views/**/*.scala.html` + 포함 partial + 동결 CSS
   (`yona-original/app/assets/stylesheets/yobi.less` import 전체, `public/bootstrap/css/bootstrap.css`,
   `bootstrap-responsive.css`)에서 해당 DOM/클래스/기하 증거를 찾아 파일:라인 기록.
   Scala HTML은 출력 DOM/UX의 source of truth — 내부 구현(jQuery 등)은 번역 금지.
2. `yona-original/**` 수정 금지 (동결).
3. 새 추상화 금지. 기존 패턴(route-local stylex, `data-stylex-owner`, retained legacy class, `@layer legacy` app.css) 재사용.
4. 기존 React DOM에 맞춘 보정 금지 — 화면 단위로 legacy skeleton과 대조해 부족분을 채운다.
5. route DOM escape 금지 (document./createPortal/classList 등으로 라우트 경계 밖 조작 금지).
6. 근거 없는 새 수치(route 전용 margin/padding/top/left/transform/고정 width/height 등) 금지 —
   parity gate 실패. 차이는 element 종류/DOM nesting/legacy class/imported stylesheet/cascade/box model부터 수정.
7. 레거시 클래스가 앱에 유지되는 게 legacy와 동일하면 retained-class retention 규칙(wave-33) 적용 —
   absence pin은 flip하지 말고 retention으로 처리(이는 copy 수정).
8. **subagent 지시문에 반드시 포함**: "legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React
   state/events/components + TanStack Router/Query로 번역한다."

### A-2. 알려진 F7 작업 후보 (ledger/reconciliation 기반, 최신 red 목록으로 확정)

- **Task A unmapped 3건**: project-code-history "default branch" (commit href `?branch=main` 제거 —
  legacy는 root history에서 branch 생략), project-deleteform-svn (`.project-menu-nav > li` count),
  stylex-project-members-error-wrap (401 shell redirect).
- **Task B 20건 샘플** (모두 genuine F7로 확정): project-board-create-form `form.nm`,
  project-webhooks-form `form-wrap`, stylex-authenticated-sidenav-* geometry, site-admin-* shells 등.
- **D-family 분류 지속**: D2 wrapper-class retention (`pull-right`, `ybtn`, `gnb-outer project-header`,
  `page-wrap-outer`, `search-box-wrap`), D3 DOM-equivalence screens (site-admin, milestone-edit-form, signup,
  password, email-settings, user-files, posts, loginform, fork-form), D4 dist-geometry-truth (app.css
  `@layer legacy` 또는 route stylex로 해결).
- 레드 row마다 ledger evidence의 legacy 파일:라인을 먼저 대조. app == legacy로 판명되면 F5/F6(copy)로 재분류.

### A-3. wave 실행 모델 (wave-10 교훈 필수 반영)

- **화면(screen) 단위 그룹핑, write scope 명시**: 각 wave = 서로 다른 화면/파일 집합을 갖는 worker들.
  같은 라우트/같은 파일/선후행 의존 작업만 직렬화.
- **공유 파일 병렬 금지**: `frontend/src/app.css`, `frontend/tests/wtr-compat.ts`,
  `frontend/web-test-runner.config.mjs`, 공용 컴포넌트(`-home-route-screen.tsx` 등)를 건드리는 wave는
  단일 worker로 직렬. (wave-10이 병렬 슬라이스 검증으로 shared-file cascade를 만들어 2772/275로 악화,
  이후 revert된 전력.)
- **wave 단위 검증**: 해당 wave가 건드린 spec들 green + `tsc --noEmit` 0.
  **2 wave마다** 전체 suite 스윕으로 새 실패 0 확인.
- wave 크기: worker당 4-8 spec. concurrency 2-3. (브라우저 바운드 — 병렬 과잉 무의미.)

### A-4. 실행/검증 커맨드 (전부 sandbox 밖 escalated, pnpm store 명시)

```bash
# 빌드 (fallback-off dist)
cd frontend && VITE_YONA_BASE_PATH=/yona VITE_DISABLE_LEGACY_FALLBACK=1 pnpm exec vite build
# fast 프로파일 — wave 내 focused spec 검증
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:stylex-fast -- <focused-spec>
# 최종 gate (전체)
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:stylex-final -- .
# tsc
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec tsc --noEmit
```
- E2E/빌드는 `PW_CHANNEL=chrome` 명시(playwright.config.ts 기본값 chrome).
- dist는 gitignored — 검증 후 재빌드 필요 없음(캐시).

### A-5. 거버넌스 (커밋 시 반드시)

- 각 wave 커밋에 `docs/provenance/frontend-scala-html-goal-violation-audit.md`의 해당 화면 행을 추가:
  legacy root(.scala.html + partial)/변경 TSX/소유 WTR 스펙/tsc+검증 결과. (미기록 route 작업은
  turn-commit의 scala-html-goal history audit blocker — 최근 wave 커밋들이 이 감사 실패의 원인이었음.)
- 라우트 구현 변경 없이 E2E/CSS/provenance만 바꾸는 커밋 금지 (evidence-only blocker).
- wave 커밋 메시지: `wtr-637 Phase F wave N: <화면 목록>` 형식. ledger 갱신 포함.
- `pnpm agent:turn-commit -- -m "..."`로 커밋 (실패 시 blocker 수정 또는 사유 보고).

---

## 완료 기준 (Definition of Done)

1. `tsc --noEmit` **0 errors** (Workstream B).
2. `test:e2e:stylex-final -- .` 결과에서 **F7 app-fix 실패 0건** — 남는 red는 문서화된
   flaky(F9)/harness(F2)/copy-pin(F5/F6, 이번 범위에서 정리 예정) 계열만.
3. 전체 숫자 + residual 내역을 `wtr-637-ledger.md` tail과 `wtr-637-reconciliation-report.md`에 갱신.
4. 감사 문서 per-route 기록 완료, 커밋 이력이 scala-html-goal history audit 통과.
5. `pnpm --dir frontend build` green (StyleX verifier 포함).

---

## 부록 — wave별 에이전트 프롬프트 템플릿

```
# Target
- WTR red row 목록: <spec 파일 + 테스트명 + ledger row 링크> (Workstream A-0의 매핑 산출물에서 할당)
- 허용 파일: <화면 소유 라우트 TSX + 그 화면의 stylex 파일 + 해당 e2e spec>
- 금지 파일: 그 외 전부 (특히 frontend/src/app.css, frontend/tests/wtr-compat.ts, web-test-runner.config.mjs, 공용 컴포넌트)

# Change
1. 각 red row의 ledger evidence에 적힌 legacy 파일:라인을 yona-original에서 열어 확인.
2. legacy 출력 DOM/UX와 대조해 React route TSX를 보정 (번역 원칙: legacy Scala HTML/JS는 출력 근거,
   내부 동작은 React state/events/components + TanStack Router/Query로).
3. F5/F6로 판명되면 copy(pin)만 수정 — 앱 변경 금지. F9는 재실행 후 문서화만.

# Acceptance
- 할당된 spec들이 `test:e2e:stylex-fast -- <spec>`으로 전부 green.
- `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec tsc --noEmit` 0.
- yona-original 미변경, 새 추상화 없음, route DOM escape 없음.
- 감사 문서 행 추가: legacy root / 변경 파일 / 스펙 / 결과.
- 전체 suite 스윕은 main agent(2 wave마다)가 수행 — wave 내에서는 skip.
```
