# AGENTS.md: Yona

## Phase 0 Closure Contract

- 최종 목표는 **legacy Yona 1.16의 100% legacy-product parity**다. 기능적
  결과와 사용자에게 관찰되는 UX가 모두 포함되며, 현재의 first-priority
  완료는 최종 완료가 아니다.
- 1·2순위 표는 구현 순서일 뿐 최종 scope exclusion이 아니다. 최종 완료 시
  user-visible `deferred`/`gap`은 0이어야 하며, 일반적인
  `accepted observable divergence`는 허용하지 않는다. 차이는 사용자에게
  관찰되지 않는 implementation difference이거나 실제 legacy bug라는
  근거가 있을 때만 남길 수 있다.
- JaCoCo는 누락된 legacy user-visible 실행 경로를 찾는 discovery evidence일
  뿐이며 coverage percentage/목표가 아니다. 기존 validation gate를 사용하고
  새 validation 또는 reconciliation framework를 만들지 않는다.
- 이 repository에서는 release/RC/public release를 만들지 않는다. 100% parity
  승인 뒤 새 canonical repository로 source와 필요한 문서만 이전하고 그
  repository에서 최초 release를 수행한다.

## 변환 원칙 (Conversion Principles) — 최우선

**이 프로젝트는 기능 변환 프로젝트다. 새로운 구조를 제안하는 프로젝트가 아니다.**

1. **기능 동등성만이 목표다.** 레거시 Yona가 제공하는 동일한 기능을 동일한 UX로 구현한다.
2. **1:1 기술적 대응이 아니다.** Java/Play의 특정 클래스를 Rust의 특정 타입으로 대응시키는 것이 아니라, 사용자 관점에서 동일한 기능과 경험을 제공하는 것이 목표다.
3. **새로운 구조를 제안하지 않는다.** 기능 구현에 필요한 최소 구조만 사용한다. 여기서 "최소 구조"는 `SPEC.md` Section 1의 고정 결정에 한정한다.
4. **기존 UI/UX를 그대로 구현한다.** 화면, 레이블, 동선, 기능은 `yona-original/`을 기준으로 한다. "개선"을 이유로 임의로 바꾸지 않는다.
5. **에이전트의 역할은 구현이다.** 더 나은 구조를 설계하는 것이 아니라, 기존 기능을 새 스택으로 구현하는 것이다.

### 우선순위 분리

| 순위  | 범위                                                                                     | 시기         |
| ----- | ---------------------------------------------------------------------------------------- | ------------ |
| 1순위 | 레거시 Yona 핵심 기능 동등 구현(인증, 프로젝트, 이슈, 보드, PR/리뷰, 검색, 알림, 관리)   | 현재         |
| 2순위 | SVN, LDAP, Import/Export, 마이그레이션 도구 등 구현 난이도가 높거나 우선순위가 낮은 기능 | 이후 구현 순서 (최종 제외 아님) |
| 3순위 | 아키텍처 개선, 성능 최적화, 새로운 기능 추가                                             | 개선 단계    |

> 1·2순위 user-visible 기능을 모두 닫은 뒤에만 "변환 완료"로 간주한다.
> 최종 기준은 `SPEC.md` Section 8 Definition of Done이다.

### 명시적 금지

- `SPEC.md` Section 1의 고정 결정 밖으로 새 패턴이나 추상화를 제안하지 않는다.
- 레거시에 없는 기능을 "개선"이라는 이름으로 추가하지 않는다.
- 기존 UI/UX를 "개선"한다는 이유로 임의로 바꾸지 않는다.
- 변환 범위를 벗어난 아키텍처 논의를 현재 작업에 끌어오지 않는다.

## Canonical Order

- `AGENTS.md`는 에이전트 실행 규칙의 메인 source of truth다.
- 이 문서의 변환 원칙은 `SPEC.md`를 포함한 모든 문서에 우선한다.
- `SPEC.md`는 Rust pivot 이후 기술적 상세의 canonical execution spec이다.
- 권한 우선순위와 기능/UX 근거 우선순위는 분리한다. 권한은 `AGENTS.md` > `SPEC.md` > repo root 순서이며, 기능/UX/copy/deep-link 근거는 `yona-original/` > `SPEC.md` > `docs/provenance/*` 순서다.
- `docs/agents/*.md`는 이 문서와 `SPEC.md`를 실행 관점으로 요약한 mirror다.
- `docs/provenance/*`는 legacy intent, gap, deviation, deferred scope의 근거 문서다.
- `docs/plans/*`, `docs/workflow/*`는 status banner가 없으면 현재 기준으로 읽지 말고 검토 후 배너를 붙인다.

## Project Goal

- Yona를 `Rust + React` 기반의 단일 애플리케이션 워크스페이스로 재정렬해 레거시 Yona의 기능과 UX를 최대한 그대로 변환 구현한다.
- canonical 구현 경로는 현재 checkout의 top-level repo root다.
- 목표는 issue tracker 축소판이 아니라 legacy Yona functional parity와 UX parity다.
- 최종 목표는 legacy Yona 1.16의 **100% legacy-product parity**다. 진행 중인
  누락은 `deferred`/`gap`/`deviation`으로 기록하지만, 최종 완료 시
  user-visible `deferred`/`gap`과 설명되지 않은 observable divergence는
  허용되지 않는다.

## Fixed Decisions

- 1차 기능/UX 근거 source of truth는 [`yona-original/`](yona-original/)의 Java/Play 기반 legacy Yona다.
- 2차 canonical implementation baseline은 repo root다.
- historical spike evidence는 `reference/spikes/**`에 둔다.
- canonical frontend ownership은 [`frontend/`](frontend/)에 둔다.
- canonical application API contract는 REST JSON API(`/api/v1`)와 frontend typed API client/TanStack Query 경계에 둔다. `proto/`는 REST pivot 이전 message schema snapshot으로만 다루며 runtime ConnectRPC surface나 새 기능의 기본 contract source가 아니다.
- 최소 ownership은 다음 경계로 고정한다.
  - [`crates/server`](crates/server): runtime bootstrap, HTTP/REST, asset delivery, session/auth bootstrap
  - [`crates/domain`](crates/domain): parity-first domain behavior, ACL, invariant
  - [`crates/persistence-entities`](crates/persistence-entities): SeaORM generated entities and relation derives
  - [`crates/persistence`](crates/persistence): DB access, repositories, dialect handling, entity re-exports
  - [`crates/migration`](crates/migration): schema, seed, migration
  - [`crates/vcs`](crates/vcs), [`crates/search`](crates/search), [`crates/integrations`](crates/integrations): 후속 vertical slice owner
- `reference/mixed-code/**`는 legacy reference가 아니다. 남아 있다면 pre-Rust Bun/TanStack/tRPC/Drizzle 잔여 코드로만 취급하고, parity 근거나 구현 참고자료로 사용하지 않는다.
- historical 문서는 삭제하지 않는다. `historical`, `superseded`, `reference-only` 상태 배너를 붙이고, 현재 canonical 설명은 Rust pivot 이후 위치로 갱신한다.

## Execution Rules

### Astra / Oh My Pi 실행

- 모델은 Astra, 실행 도구와 권한은 현재 Oh My Pi 세션의 tool schema를 기준으로 한다. Codex CLI 전용 인자나 설치되지 않은 도구를 가정하지 않는다.
- 이미 주입된 이 문서는 다시 탐색하지 않는다. 관련 skill은 `read skill://<name>`으로 읽고, 파일은 `read`, 경로 탐색은 `glob`, 텍스트 검색은 `grep`, 수정은 `apply_patch`를 사용한다. 사용 가능한 LSP가 있으면 symbol 참조·이름 변경은 LSP로 수행한다.
- 독립 작업은 write scope와 공유 계약을 정한 뒤 `task`로 병렬 위임한다. 읽기 전용 조사는 `scout`, 구현은 쓰기 가능한 agent에 맡기며, 작은 단일 작업은 직접 처리한다. worker는 검증을 중복 실행하지 않고 main이 통합 후 수행한다.
- 서버·watcher는 `hub start`로 관리한다. 수동 웹 검증은 `eval`의 `browser.open`으로 탭을 연 뒤 수행하고, 기존 WTR suite는 아래 launcher/facade 규칙을 유지한다.
- 사용자가 구현 결정을 함께 하도록 요청했거나 선택지의 scope·위험이 실질적으로 다르면, repo 근거와 추천안을 제시하고 `ask`로 결정한 뒤 해당 구현을 시작한다.
- 모든 문서의 repository 경로는 현재 checkout 기준 상대 경로로 해석한다. 과거 workstation의 절대 경로는 실행 경로가 아니다.

### 구현 및 parity

- 작업 전 이 문서의 변환 원칙, 관련 `SPEC.md` 섹션, `docs/agents/*` mirror를 먼저 확인한다.
- 구현 전 대응 legacy route/test/model과 UI 기준을 `yona-original/`에서 식별한다.
- `/goal` 또는 사용자가 `docs/plans/2026-06-30-scala-html-goal-workflow.md` 기반 frontend 작업을 지시한 turn에서는 **기존 React DOM을 기준으로 보정하지 않는다.** 반드시 대상 화면의 `yona-original/app/views/**/*.scala.html` 및 포함 partial/LESS/JS/messages를 먼저 식별하고, 그 legacy 구조를 TSX로 구현한다.
- Scala HTML/legacy JS는 **출력 DOM/UX의 source of truth**이지 내부 구현 방식의 source of truth가 아니다. jQuery, inline script, `document.*`, `addEventListener`, `classList`, `style.display`, HTML fragment fetch/insert(htmx식 동작), `dangerouslySetInnerHTML` 기반 동적 조립, legacy template script tag는 React 구현으로 직역하지 않는다. 동일 DOM/UX가 렌더링되도록 React state/events/components와 TanStack Router/Query navigation, mutation, cache update로 번역 구현한다.
- Parity gate는 사용자에게 보이는 role/copy/order/geometry/interaction을 검증한다. jQuery/plugin 전용 attribute는 보존 대상이 아니며 React가 동작을 소유할 때 제거한다. 이 목록은 비한정적이며 `data-toggle`, `data-placement`, `data-action`, `data-href`, `data-url`, `data-request-*`, `data-dismiss`, `data-target`, `data-trigger`, `data-backdrop`, `data-spy`, `data-provider`, `data-loading-text` 등을 포함한다. E2E canonicalizer는 이를 legacy expected DOM에서 제외하고, 필요한 경우 React 결과에서 부재를 검증한다. 반면 사용자에게 보이거나 접근성에 필요한 `title`, `aria-*`, tooltip copy는 React 소유 방식으로 보존한다.
- Route TSX에서 anchor 의미는 TanStack Router `Link`가 소유한다. 내부 라우팅은 `Link to`, 공유 가능한 화면 내 위치 이동은 `Link to` + `hash`, 외부/download/mailto URL은 `Link href`로 구현한다. Legacy `href="#"`와 `href="javascript:..."`는 exact DOM 보존 대상이 아니라 behavior evidence이므로 `Link href="#"`로 옮기지 말고, URL을 공유해야 하는 hash deep link는 `hash` prop으로, 라우팅이 아닌 side effect는 `button type="button"` + React `onClick`/mutation/state로 번역한다.
- `/goal` 기반 frontend route TSX/E2E 구현은 main agent가 직접 개발하지 않고 subagent를 spawn해서 맡긴다. main agent의 역할은 대상 선정, legacy 근거와 지시문 전달, 산출물 검수, 필요한 최소 통합/검증/커밋이다. 사용자가 명시적으로 main agent 직접 구현을 지시하지 않는 한, main agent는 route TSX/E2E 구현 패치를 먼저 작성하지 않는다.
- 독립적인 frontend target이 둘 이상이면 단일 subagent만 쓰지 말고 여러 worker subagent를 동시에 spawn한다. 각 worker에는 route/screen, 허용 파일, 금지 파일을 포함한 명시적 write scope를 부여하고, 같은 route/같은 파일/선후행 의존성이 있는 작업만 직렬화한다.
- 같은 goal turn에서 E2E metric, CSS, provenance만 추가하고 TSX 화면 구현을 바꾸지 않는 작업은 금지한다. 단, 이미 해당 화면이 이번 turn에서 legacy Scala HTML 기준으로 재구축된 뒤 검증을 보강하는 경우는 허용한다.
- 기존 TSX가 legacy Scala HTML과 다르면 기존 TSX를 보존하려고 부분 패치하지 말고, 화면 단위로 legacy template skeleton을 다시 만든다. 잘못 만든 구현은 삭제하거나 대체한다.
- subagent가 frontend 화면을 구현할 때도 동일하다. subagent 지시문에는 반드시 "legacy Scala HTML/JS는 출력 DOM/UX 근거이며 내부 동작은 React state/events/components + TanStack Router/Query로 번역한다"를 포함한다. subagent 산출물이 legacy Scala HTML source-of-truth를 먼저 대조하지 않았거나, 기존 React DOM에 맞춘 보정이거나, legacy DOM 제어 JS를 내부 구현으로 복사하면 통합하지 말고 폐기한다.
- multi-day unattended frontend goal turn을 resume할 때는 구현 대상을 고르기 전에 `pnpm agent:scala-html-goal-automation`을 실행한다. 이 명령은 `YONA_SCALA_HTML_GOAL_HISTORY_RANGE` 또는 `.agent/scala-html-goal-history-range`가 없거나 range audit이 실패하면 중단해야 한다.
- `YONA_ALLOW_SCALA_HTML_*` 예외 marker는 unattended `pnpm agent:turn-commit` 경로에서 사용하지 않는다. 사람이 감독하는 수동 예외 commit에만 쓰고, route/reason/follow-up 감사 note를 남긴다.
- frontend component design 또는 화면 styling 작업 전에는 [`DESIGN.md`](DESIGN.md)를 확인하고, `yona-original/`의 view/LESS 근거를 우선한다.
- frontend가 소유하는 정적 자산은 `public/legacy-assets` 같은 런타임 문자열 경로로 렌더링하지 않는다. `frontend/src/assets/legacy/**`에서 Vite import로 참조해 dev server와 production build가 동일하게 소유하도록 하며, 자산 이동/이름 변경은 TypeScript/LSP import graph로 추적 가능해야 한다. API가 제공하는 사용자 업로드·외부 URL은 이 규칙의 대상이 아니다.
- **Pixel parity 스타일 기준선은 동결한다.** `yona-original/app/assets/stylesheets/yobi.less`와 그 import 전체, `yona-original/public/bootstrap/css/bootstrap.css`, `bootstrap-responsive.css`만을 canonical styling source로 사용하며 이 legacy 파일들은 수정하지 않는다. React 화면은 대응 Scala HTML과 legacy plugin의 사용자-visible 생성 DOM에 맞는 element/클래스 조합을 재현하고, 위 동결 CSS의 cascade와 box model로 렌더링해야 한다.
- Screenshot/geometry diff를 상쇄하려고 원본에 없는 route 전용 `margin`, `padding`, `top/right/bottom/left`, `transform`, 고정 `width/height` 또는 viewport별 보정값을 추가하지 않는다. 차이가 나면 먼저 element 종류, DOM nesting/order, legacy class, imported stylesheet, cascade/specificity, font/asset, box model 누락을 수정한다. React-owned plugin 대체에 CSS가 꼭 필요하면 동결된 legacy LESS/CSS 규칙을 selector만 React 소유 경계로 좁혀 그대로 옮기고, 원본 파일/selector/rule 근거를 provenance와 focused test에 남긴다. 근거 없는 새 수치는 parity gate 실패다.
- `reference/mixed-code/**`를 구현 근거로 읽거나 사용하지 않는다. 기능/UX 근거는 `yona-original/`에서만 찾는다.
- 새 canonical 구현이나 문서 기준선은 `repo root`를 기준으로 적는다.
- root Bun/Go 혼합 코드, `TanStack Start`, in-process `tRPC`, `createServerFn`, Go backend 관련 결정은 현재 baseline처럼 서술하지 않는다.
- **실험 분기 예외:** `experiment/bun-backend-validation`에서만 `experiments/bun-port/**`의 Bun, 독립 TypeScript backend, tRPC/SuperJSON, SQLBraid, trusted in-process plugin 검증을 허용한다. 결과와 미해결 항목은 `docs/reports/bun-port-validation/{environment,results,decision}.md`에 기록한다. 이 실험은 Rust 제품 runtime/frontend를 교체하지 않으며 legacy parity·fixture 비공개·release 금지 기준을 바꾸지 않는다. Bun SSH 이슈가 해결되기 전 Git/SVN SSH server interface는 제공하지 않는다.
- 기능이 아직 비어 있으면 반드시 세 계층에 남긴다.
  - root canonical 문서: deferred scope
  - provenance 문서: gap 또는 deviation
  - 계획 문서: follow-up item
- 같은 Phase에 남은 `gap`은 Phase 종료 blocker다. 중간 phase에서 이후
  구현 순서로 재분류할 수 있지만, 최종 완료를 위해서는 구현하고 provenance와
  phase plan에 근거를 남긴다. 일반적인 사용자 관찰 가능 차이를
  `accepted divergence`로 승인해 종료하지 않는다.
- JaCoCo 결과는 user-visible legacy behavior discovery를 위한 기존 evidence로만
  사용한다. coverage percentage를 목표·KPI·release gate로 삼지 않으며, 새
  validation/reconciliation framework를 추가하지 않는다.
- 이 repository는 parity 구현과 evidence를 위한 작업 공간이며 release 대상이
  아니다. 최초 release는 parity 승인 후 생성하는 새 repository에서만 수행한다.
- 변환 완료 전에는 기능 구현에 필요한 최소 구조만 사용하고, 추가 구조 제안은 하지 않는다.

### 검증 실행 환경

- Rust 검증, pnpm job, WTR 및 자식 Chrome은 macOS seatbelt sandbox 밖에서 실행한다. 실행 전 세션의 권한 정보와 `CODEX_SANDBOX` 등 active sandbox marker를 확인한다. `CODEX_SANDBOX_NETWORK_DISABLED`만으로 active sandbox라고 판정하지 않는다.
- Oh My Pi가 이미 sandbox 밖에서 실행 중이면 현재 `bash`/`hub` 도구로 실행한다. sandbox 안이면 실제 도구가 제공하는 승인·외부 실행 경로를 사용한다. 그런 기능이 없으면 필요한 권한을 보고하고 해당 실행을 보류한다. 존재하지 않는 `require_escalated` 필드를 전달하거나, marker를 지우거나, 외부 실행을 했다고 가정하지 않는다.
- 일반 cargo 검증은 `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:cargo -- --outside-sandbox <cargo args>`, Rust 테스트는 `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:cargo-test -- --outside-sandbox ...`를 사용한다. wrapper는 로그/가드일 뿐 sandbox를 탈출하지 않는다. `--outside-sandbox`는 확인된 외부 실행의 assertion이다. 전체 로그는 `.agent/cargo-test-logs/`에 남기며, 의도적 진단 외에는 `--allow-sandbox`를 사용하지 않는다.
- 모든 pnpm job에는 중앙 store를 명시한다: `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store ...`. workspace 내부 `.pnpm-store`를 생성하거나 이동하지 않는다. 기존 로컬 store는 다른 작업의 사용 여부를 확인한 뒤 제거하고 `.gitignore` 차단을 유지한다.
- WTR은 `frontend/web-test-runner.config.mjs`의 `@web/test-runner-chrome` launcher가 시스템 Chrome을 소유한다. spec은 `frontend/tests/wtr-compat.ts`의 Page/Locator/Route facade만 사용하며 bundled Chromium이나 `PW_CHANNEL`에 의존하지 않는다.
- StyleX migration wave에서는 활성 `frontend/package.json`과 WTR config에서 검증 프로파일을 확인한다. 현재 focused 실행은 `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e -- <focused-spec>`이며, 존재하지 않는 `test:e2e:stylex-fast` 명령을 가정하지 않는다. focused 통과는 fallback-off 또는 final visual-lock 통과를 뜻하지 않는다. 최종 산출물의 fallback CSS/LESS 제거와 legacy pixel parity는 해당 조건을 실제 검증한 증거로만 기록한다.
- 승인된 구현 작업에서 task-owned 변경이 있으면 turn 종료 전 위 검증 실행 환경에서 turn commit hook을 실행한다: `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store agent:turn-commit -- -m "<concise summary>"`. 검토·보고만 요청한 작업이나 지침 문서 유지보수에는 자동 커밋을 적용하지 않는다. 별도의 명시적 커밋 요청은 따른다.
- turn commit hook은 `git add -A`, `tools/precommit-verify.mjs`, `git commit`을 같은 경로로 수행한다. 실행 전에 staged·unstaged·untracked 변경의 소유 범위를 확인한다. 다른 작업의 변경을 함께 담게 되면 이 hook을 실행하지 말고, 해당 변경을 보존한 채 독립적으로 가능한 검증을 마친 뒤 커밋을 보류한 이유를 보고한다. hook이 실패하면 최종 응답 전에 blocker를 수정하거나 실패 사유를 보고한다.
- 이번 작업의 변경 유무와 worktree 전체의 clean 상태를 구분한다. `git status`로 확인한 경우에만 clean이라고 보고한다.

## Document Index

- `docs/agents/00-goals-and-fixed-decisions.md`
- `DESIGN.md`
- `docs/agents/01-frontend-architecture.md`
- `docs/agents/02-testing-migration.md`
- `docs/agents/03-repo-structure.md`
- `docs/agents/04-architecture-guardrails.md`
- `docs/agents/05-agent-execution-guidelines.md`
- `docs/agents/06-phase-plan.md`
- `docs/agents/07-rust-sfx-deployment.md`
- `docs/agents/08-rust-deployment-strategy.md`
- `docs/agents/09-llm-onboarding-checklist.md`
- `docs/agents/10-legacy-provenance-baseline.md`
- `docs/agents/11-stylex-best-practices.md`
- `docs/provenance/frontend-scala-html-goal-violation-audit.md`
