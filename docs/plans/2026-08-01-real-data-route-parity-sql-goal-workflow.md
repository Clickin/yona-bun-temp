# Real-data Route Parity + SQL Goal Workflow

> **Status: PROPOSED FOR REVIEW** — 이 문서는 실행 전 검토 및 다른 agent 인계를 위한 계획이다.
> 승인 전에는 route 구현을 시작하지 않는다. 승인 후에도 `AGENTS.md`와
> `docs/plans/2026-06-30-scala-html-goal-workflow.md`가 더 높은 실행 규칙이다.
>
> **Date**: 2026-08-01
> **Scope**: imported MariaDB clone을 사용하는 Legacy Yona ↔ Yoram route-state 단위
> UI/UX parity, functional parity, SQL regression 탐지, 안전한 set-based query 최적화

## 1. 목적

현재 real-data route inventory를 고정 입력으로 사용해, 각 user-visible screen 또는 명시적인
screen state를 하나의 `/goal` 단위로 닫는다. 한 route goal은 다음 네 결과를 함께 남긴다.

1. Legacy Scala HTML과 browser-rendered legacy DOM을 근거로 한 React screen parity
2. 동일 route state의 status, ACL, result cardinality/order/filter/pagination parity
3. Legacy Play/Ebean SQL과 Yoram SeaORM SQL의 redacted route-scoped 비교
4. focused E2E, backend contract, provenance, sanitized local evidence가 연결된 완료 기록

이 작업은 redesign이나 새로운 architecture 제안이 아니다. 기능/UX 근거는
`yona-original/`이며 구현은 기존 Rust + React + REST + TanStack Router/Query 경계 안에서만 한다.

## 2. 현재 고정 기준선

### 2.1 Runtime

- Legacy Yona: `http://127.0.0.1:9000`
- Yoram: `http://192.168.45.20:8089`
- Yoram health/session endpoint: `GET /api/v1/session`
  - `GET /api/v1/auth/session`은 canonical endpoint가 아니므로 health check에 사용하지 않는다.
- MariaDB clone: `127.0.0.1:33069/yona`
- imported clone과 실행 중인 서비스는 실제 장애가 없으면 reset/re-import/restart하지 않는다.
- credential은 `REAL_LOGIN_ID`/`REAL_PASSWORD` 환경변수로만 주입한다. 문서, command output,
  artifact, commit에 값이나 유추 가능한 literal을 남기지 않는다.

### 2.2 Route inventory

Canonical queue input:

- `.agent/real-data-parity/2026-08-01/route-manifest.json`
- generated: `2026-08-01T01:38:07.730Z`
- Legacy route patterns: 265
- generated frontend route patterns: 114
- frontend route files: 210
- legacy audit pages: 169
- live Legacy paths: 250
- reachable parameterized instances: 208

`liveLegacyPaths` 250개는 현재 reachable GET screen-state queue다. 다음 항목은 별도 분류가 필요하며
250개 GET queue가 끝났다는 이유로 자동 완료 처리하지 않는다.

- static route pattern만 있고 현재 clone에서 instance를 만들 수 없는 route
- download/export response
- mutation-only route와 post-mutation state
- authentication/authorization에 의해 가려진 private state
- known Legacy-only gaps in the manifest

각 항목은 `COVERED`, `AUTH_BLOCKED`, `DATA_BLOCKED`, `DOWNLOAD`,
`RESTORE_REQUIRED`, `DEFERRED`, `DEVIATION`, `NOT_REACHABLE_WITH_CURRENT_CLONE` 중 하나로
근거와 함께 분류한다. `NOT_REACHABLE_WITH_CURRENT_CLONE`은 구현 완료를 뜻하지 않는다.

### 2.3 Current read-only result

Current final artifacts:

- `.agent/real-data-parity/2026-08-01/final-desktop/latest.json`
- `.agent/real-data-parity/2026-08-01/final-mobile/latest-mobile.json`

Observed baseline:

| viewport | compared | Legacy route failures | Yoram route failures | visual diff failures | auth |
| --- | ---: | ---: | ---: | ---: | --- |
| desktop 1366×900 | 250 | 1 | 15 | 205 | both `AUTH_BLOCKED` |
| mobile 390×844 | 250 | 1 | 16 | 95 | both `AUTH_BLOCKED` |

이 수치는 queue priority를 정하기 위한 기준선이지 parity 완료 증거가 아니다. coarse sweep의
`diffErrors`가 없더라도 whole-screen canonical DOM E2E가 통과해야 screen goal을 닫을 수 있다.
인증 정보가 공급되기 전에는 anonymous/public 및 expected-login-gate state만 진행한다. private
screen을 anonymous redirect 결과만으로 완료 처리하지 않는다.

### 2.4 SQL logging

- Legacy runtime은 Play 2.3 + Ebean이며 checked-in MariaDB instance에서
  `db.default.logStatements=true`가 활성화되어 있다.
- route/access와 Ebean SQL/TXN evidence는 local ignored logs 아래에 존재한다.
- notification mail scheduler 같은 background SQL이 있으므로 timestamp만으로 query를 route에
  귀속하지 않는다.
- current `yoram-lan` process는 `RUST_LOG` SQL tracing 없이 실행 중이다. 이를 재시작해 shared
  baseline을 흔들지 말고, SQL capture에는 별도 Yoram trace process를 사용한다.
- Yoram SQL trace process는 같은 clone에 read-only route request만 보내고
  `YONA_SCHEMA_POLICY=validate_only`, `YONA_NOTIFICATION_MAIL_ENABLED=false`,
  `YONA_MAILBOX_POLLING_ENABLED=false`, `RUST_LOG=sea_orm=debug,sqlx=debug`를 사용한다.
  중복 SQL source가 확인되면 한 source만 남긴다.

## 3. 근거 우선순위와 불변 조건

### 3.1 Source order

1. `AGENTS.md`
2. `SPEC.md`
3. `yona-original/app/views/**/*.scala.html`와 included partials
4. related Legacy controller/model/test/JS/messages/LESS/assets
5. browser-rendered local Legacy output
6. `docs/provenance/*`
7. current Rust/React implementation

기존 React DOM, deleted/archived TSX, `reference/mixed-code/**`, selector-presence-only test는 UI
근거가 아니다.

### 3.2 Frozen UI rules

- Legacy Scala HTML/JS는 output DOM/UX 근거다. jQuery, inline script, `document.*`,
  `addEventListener`, `classList`, `style.display`, fragment HTML fetch/insert,
  dynamic `dangerouslySetInnerHTML` 조립을 route TSX로 복사하지 않는다.
- behavior는 React state/events/components + TanStack Router + TanStack Query로 번역한다.
- internal navigation은 TanStack Router `Link to`, shareable fragment는 `Link to` + `hash`,
  external/download/mailto는 `Link href`가 소유한다.
- Legacy `href="#"`/`javascript:` side effect는 `button type="button"` + React behavior로 번역한다.
- parity gate는 role/copy/order/geometry/interaction을 본다. React-owned behavior에서 legacy plugin
  metadata는 보존하지 않는다. `title`, `aria-*`, tooltip copy는 보존한다.
- styling source는 frozen Legacy LESS/CSS뿐이다. route-local numeric margin/padding/position/
  transform/fixed size/viewport offset으로 screenshot diff를 상쇄하지 않는다.

### 3.3 Data safety

- imported MariaDB는 disposable clone이지만 read-only baseline이 기본이다.
- password/token/OAuth/email verification/account deletion/project deletion/repository write/
  attachment write는 자동화하지 않는다.
- attachment payload/content는 모든 capture에서 제외한다. metadata query만 허용한다.
- issue body, comment body, markdown, email, token, password hash/salt, attachment names/content,
  raw bind values, raw SQL을 committed artifact에 남기지 않는다.
- write goal은 user-supplied `REAL_DUMP_PATH`와 verified restore checkpoint가 있을 때만 실행한다.
  없으면 `RESTORE_REQUIRED`로 분류하고 read-only coverage를 계속한다.
- declared scenario 밖의 row가 바뀌면 즉시 중단하고 supplied restore command로 clone을 복원한 뒤
  frozen read-only baseline을 다시 실행한다.

## 4. 실행 산출물

모든 raw/runtime evidence는 ignored caller-owned directory 아래에 둔다.

```text
.agent/real-data-parity/<run-date>/route-goals/<stable-id>/
  target.json
  legacy-render.json
  yoram-render.json
  network-summary.json
  sql/
    legacy.json
    yoram.json
    comparison.json
  desktop/latest-focused.json
  mobile/latest-focused.json
  evidence.json
```

- `<stable-id>`는 raw real-data title/body를 포함하지 않는다. route pattern + state의 stable hash 또는
  sanitized slug를 사용한다.
- screenshot은 local ignored evidence로만 보관한다. raw page text가 보일 수 있으므로 commit하지
  않는다.
- JSON artifact에는 raw `title`, `text`, `chromeText`, `chromeAttributes`, response body,
  request payload, raw SQL, bind literal을 보관하지 않는다.
- committed evidence는 legacy source path, normalized route pattern, screen state category,
  status/cardinality/order/filter/pagination outcome, query shape hash, classification, test path만 기록한다.
- frontend TSX 변경 시 같은 commit에서
  `docs/provenance/frontend-scala-html-goal-violation-audit.md`에 route/screen state, Scala root,
  partials, TSX scope, focused E2E를 기록한다.

### 4.1 `target.json`

```json
{
  "routePattern": "/:owner/:project/issues",
  "pathStoredLocally": true,
  "auth": "anonymous|authenticated|site-admin|project-role",
  "locale": "ko-KR",
  "dataState": "empty|single|populated|boundary-page|validation|error",
  "interactionState": "initial|modal-open|tab|post-mutation",
  "viewports": ["desktop", "mobile"],
  "legacyTemplateRoot": "yona-original/app/views/...scala.html",
  "includedPartials": [],
  "classification": "QUEUED"
}
```

### 4.2 Route SQL artifact

각 target별 `sql/{legacy,yoram,comparison}.json`은
`.agents/skills/yona-sql-performance-parity/SKILL.md`의 contract를 따른다.

필수 필드:

- source, normalized shape/hash, operation, tables
- parameter count/type category만 저장; literal은 저장하지 않음
- duration/rows는 runtime이 제공할 때만 기록
- `hasLimit`, `hasOffset`, filters, orderBy
- sanitized plan access/index/estimated rows
- result-equivalence outcome
- `error`, `warning`, `info`, `intentional-difference` classification
- `rawSqlStored=false`, `literalsRemoved=true`, `sensitiveFieldsRemoved=true`

warning/error에는 반드시 route pattern, evidence, risk, smallest owning source를 기록한다.
“SQL looks inefficient” 같은 비구체적 기록은 금지한다.

## 5. Queue 생성과 우선순위

### 5.1 Route-state identity

path 문자열 하나가 goal identity가 아니다. 다음 tuple이 goal을 식별한다.

```text
route pattern × auth/role × locale × data state × interaction state
```

viewport는 같은 goal의 필수 검증 matrix다. desktop/mobile을 별도 구현 goal로 쪼개지 않는다.
단, mobile-only rendered state가 구조적으로 별도 template/plugin output이면 명시적인 screen state로
등록할 수 있다.

### 5.2 Exactly one screen state per goal

한 `/goal`은 user-visible screen 하나 또는 명시적인 screen state 하나만 수정한다.
“all project pages”, “all issue pages” 같은 broad packet은 금지한다.

shared shell을 수정한 goal은 그 target screen만 구현 완료할 수 있다. 다만 영향받는 이미-green route의
focused regression set은 함께 재실행한다. shared shell 변경이 다른 route를 자동 완료시키지는 않는다.

### 5.3 Priority order

1. runtime/status/stylesheet/React exception처럼 page capture 자체를 막는 failure
2. global shell: navbar, user menu, footer, sidebar
3. shared organization/project/site-admin layout and menus
4. high-volume list/search routes: projects, issues, boards, milestones, PR, commits, notifications
5. populated detail routes and comment/review states
6. create/edit/validation forms
7. settings/admin screens
8. download and current-clone-unreachable static patterns
9. controlled write/post-mutation states after restore gate is satisfied

동일 priority에서는 다음 순서로 고른다.

- desktop + mobile 모두 실패
- 가장 많은 downstream route가 공유하는 Legacy partial/component
- status/ACL/result mismatch가 있는 route
- unbounded/filter/pagination SQL risk가 큰 list/search route
- isolated cosmetic geometry drift

### 5.4 Queue freeze

첫 실행 turn에서 manifest와 current final desktop/mobile comparison을 결합해 ignored
`route-goal-queue.json`을 만든다. 각 entry는 원래 manifest source와 diff category를 보존한다.
작업 중 manifest route를 삭제하거나 “not important”로 제외하지 않는다. route가 중복이면 canonical
route pattern과 distinct state를 연결하고, alias라는 근거를 남긴다.

## 6. 첫 실행 전 harness prerequisite

현재 sweep는 route/status/metrics/network capture를 제공하지만 SQL parity contract를 직접 생성하지
않는다. 첫 route goal 전에 다음 최소 harness slice를 별도 prerequisite로 닫는다.

### 6.1 Allowed scope

- `scripts/visual-parity-sweep.mjs`
- focused helper가 꼭 필요하면 `scripts/` 아래 한 파일
- `scripts/visual-parity-sweep-real-data.spec.mjs`

frontend route, Rust repository, schema는 이 prerequisite에서 수정하지 않는다.

### 6.2 Required behavior

- opt-in `YORAM_SWEEP_SQL_CAPTURE=1`; default sweep behavior는 유지
- caller-owned `YORAM_SWEEP_OUTPUT_DIR` 아래에만 SQL artifact 생성
- request start/end marker와 browser network summary를 route state에 연결
- Legacy log는 before/after file offset + access-log window + serialized request로 자른다.
- scheduler/health-check/background query는 source thread/category와 request window로 제외하고
  제외 근거를 기록한다.
- Yoram은 shared `yoram-lan`을 재시작하지 않고 별도 trace process/log를 사용한다.
- raw SQL/bind를 memory에서 normalize/redact한 뒤 구조화 record만 저장한다.
- capture가 모호하면 query를 임의 귀속하지 않고 `correlation=ambiguous`로 기록한다.
- SQL capture가 실패해도 visual diff를 가짜 pass로 만들지 않는다. route goal은 SQL evidence가
  없으면 미완료다.

### 6.3 Harness acceptance

Focused Node contract test는 최소 다음을 증명해야 한다.

- output directory ownership
- real-data mode에서 fixture bootstrap/write가 없음
- raw SQL/literal/sensitive text가 output에 없음
- Legacy and Yoram record가 route marker에 연결됨
- FTS-only implementation difference가 warning으로 승격되지 않음
- missing filter/pagination fixture가 warning/error로 분류됨
- ambiguous/background query가 route query로 오분류되지 않음

## 7. Per-goal 실행 루프

### Step 0 — Resume guard

multi-day unattended frontend goal이면 target 선택 전에 다음을 outside sandbox에서 실행한다.

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  agent:scala-html-goal-automation
```

`YONA_SCALA_HTML_GOAL_HISTORY_RANGE` 또는
`.agent/scala-html-goal-history-range`가 없거나 history audit가 실패하면 target을 선택하지 않는다.

### Step 1 — Runtime and safety preflight

- Legacy `GET /`가 expected HTML을 반환하는지 확인
- Yoram `GET /api/v1/session`이 JSON session을 반환하는지 확인
- MariaDB port/clone identity가 frozen baseline과 일치하는지 확인
- no reset/re-import/reseed
- auth credential presence만 확인하고 값을 출력하지 않음
- both target auth 결과가 다르면 `AUTH_BLOCKED`; private SQL/visual comparison 중단
- mutation이면 restore prerequisite를 먼저 확인

### Step 2 — Target dossier

edit 전에 다음을 `target.json`과 agent handoff에 기록한다.

- normalized route pattern and local-only concrete path
- auth/role, locale, data state, interaction state
- Legacy `conf/routes` row
- controller/service/model query path
- Scala template root and all included partials
- message keys, LESS/CSS/assets, related JS
- expected links, form submits, status, ACL
- filters, order, page number, page size, null/empty semantics
- current React route and REST/API/repository owner
- focused E2E file and exact command

Legacy live output과 Scala template이 다르면 data/session/post-render JS로 설명한다. 설명할 수 없으면
구현하지 않고 stop condition으로 기록한다.

### Step 3 — Freeze pre-change evidence

같은 target state를 Legacy와 Yoram에서 한 번씩 직렬 실행한다.

- final rendered DOM after fonts/network/React Query settle
- status and redirect chain
- stable visible selector/geometry metrics
- browser network method/path/status only; body/payload 제외
- Legacy Ebean and Yoram SeaORM route-scoped SQL
- result count/stable ids/order/visible field presence를 sanitized structure로 비교

동일 Legacy request를 반복해 SQL query count/shape variance를 확인한다. background scheduler query는
제외한다. latency는 like-for-like observation으로만 저장하고 global millisecond threshold를 만들지 않는다.

### Step 4 — Write RED contracts first

Frontend:

- whole stable screen container를 canonicalized Legacy DOM과 비교하는 Playwright E2E를 먼저 작성
- first entry 외 intermediate navigation은 visible links/buttons로 수행
- tag/child order/nesting/classes/ids/names/types/placeholders/meaningful URL/stable visible copy를 비교
- React-owned plugin metadata는 canonicalize out하고 부재를 assert
- status, desktop/mobile geometry, interaction, no new horizontal overflow를 포함
- old React-only wrapper/class/copy를 acceptance로 사용하지 않음

Backend/SQL:

- phase-1 mismatch가 있으면 owning Rust route/repository contract에 failing test를 먼저 추가
- test는 filter, ACL, stable order, pagination boundary, cardinality 중 실제 관찰된 contract를 방어
- SQL source text나 implementation detail만 assert하는 test는 금지

### Step 5 — SQL Phase 1: regression blocker

UI 구현 전에 다음을 판정한다.

`error` 또는 blocker:

- missing project/tenant/auth predicate
- missing active filter or wrong null semantics
- wrong result ids/cardinality/order
- missing/incorrect required pagination
- all rows loaded then post-filter/post-slice
- unbounded requested page size
- Yoram이 Legacy보다 materially more work를 새로 도입해 route를 unbounded/incorrect하게 만듦

Phase-1 defect가 있으면 smallest owning repository/domain/query를 먼저 수정하고 same route + boundary
state를 재실행한다. page 1만 맞고 later/empty/filter page가 틀리면 미완료다.

Legacy 자체의 여러 short Ebean query는 baseline evidence다. Yoram이 같은 shape라는 이유만으로
phase-1 error를 만들지 않는다.

### Step 6 — SQL Phase 2: safe query optimization

Phase 1 correctness evidence를 별도 ledger에 freeze한 뒤 수행한다.

후보:

- per-row user/label/member/parent lookup
- repeated child query shape
- application-level join that can be one SQL join/`IN`/grouped query/bounded subquery
- material over-fetch with proved unused cost

규칙:

- one logical result set에는 가능한 한 one bounded statement를 선호
- count query + result query는 자동 duplicate가 아님
- schema redesign, speculative index, cache, one-query abstraction framework 금지
- output ids/order/cardinality/null/ACL/filter/pagination과 REST shape 불변
- plan/index warning은 safe read-only `EXPLAIN` evidence가 있을 때만 기록
- FTS/trigram/database-native search 차이는 결과 semantics가 같으면 `intentional-difference`
- SQL-level join의 cardinality/plan tradeoff가 불명확하면 route, normalized shapes, row counts,
  semantic constraints를 보존하고 사용자(SQL specialist)에게 escalation; 추측 구현 금지

Phase-2 optimization은 phase-1 ledger를 삭제하거나 warning으로 downgrade할 수 없다.

### Step 7 — Delegate implementation

Frontend route TSX/E2E 구현은 main agent가 먼저 작성하지 않는다. `port-yona-screen` 능력을 가진
worker 또는 frontend worker에게 다음 contract로 위임한다.

Required handoff:

- target route/state and explicit allowed/forbidden files
- Legacy root/partials/JS/CSS/messages
- rendered Legacy evidence path
- route TSX must use React state/events/components + TanStack Router/Query
- no jQuery/direct DOM/fragment insertion/raw anchors
- RED E2E path
- provenance row requirement
- exact focused verification command

Backend SQL change는 separate worker에 repository/API owner와 focused contract scope를 준다. 같은 API
contract가 frontend에 필요하면 backend를 먼저 GREEN 후 frontend worker를 시작한다. contract가 이미
고정되고 files가 disjoint일 때만 병렬 실행한다.

Runtime SQL capture는 shared Legacy logs 때문에 직렬화한다. 여러 workers가 같은 Legacy instance의
SQL capture를 동시에 수행하지 않는다.

Reject worker output when it:

- Legacy Scala source를 먼저 식별하지 않음
- current React DOM/test에 맞춘 부분 보정
- route-local magic CSS numbers 추가
- legacy DOM-control JS를 React 내부 구현으로 복사
- REST data 누락을 hard-coded JSX/view-model로 가림
- focused E2E/provenance 누락
- assigned ownership 밖 파일 수정

### Step 8 — Go GREEN in dependency order

1. phase-1 backend contract and SQL semantics
2. optional phase-2 query optimization and recapture
3. whole-screen focused E2E
4. desktop and mobile focused sweep
5. interactions and boundary/unauthorized state

Scala template skeleton을 one large TSX로 먼저 port하고 whole-screen GREEN 뒤에만 Legacy partial
boundary로 분해한다. 작은 screen은 불필요한 component 추출을 하지 않는다. 분해 전후 rendered DOM은
같아야 한다.

### Step 9 — Focused verification

Focused visual sweep example:

```sh
YORAM_SWEEP_REAL_DATA=1 \
YORAM_SWEEP_SQL_CAPTURE=1 \
YORAM_SWEEP_OUTPUT_DIR=.agent/real-data-parity/<run-date>/route-goals/<stable-id>/desktop \
YORAM_SWEEP_PATHS='/concrete-local-path' \
YORAM_SWEEP_VIEWPORT=desktop \
node scripts/visual-parity-sweep.mjs
```

같은 path를 `YORAM_SWEEP_VIEWPORT=mobile`로 반복한다. concrete real-data path는 local env/artifact에만
두고 plan/provenance 예시에 복사하지 않는다.

Focused E2E:

```sh
PW_CHANNEL=chrome \
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  --dir frontend test:e2e -- <focused-spec> --grep '<screen state>'
```

Rust query/route test:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  agent:cargo-test -- --outside-sandbox -p yoram-server <focused-test>
```

모든 pnpm/Playwright/cargo invocation은 `AGENTS.md`대로 outside sandbox에서 실행한다.
Playwright는 `PW_CHANNEL=chrome`을 사용한다.

### Step 10 — Goal close

한 route goal은 다음이 모두 참일 때만 `COVERED`다.

- Legacy route/template/controller/model/query evidence identified
- pre-change RED frontend/backend contract existed when behavior changed
- status/redirect/ACL parity
- result cardinality, stable ids/order, filter, pagination parity
- no phase-1 SQL error
- phase-2 candidate fixed or explicitly classified with evidence
- whole-screen canonical DOM E2E GREEN
- desktop 1366×900 focused sweep GREEN
- mobile 390×844 focused sweep GREEN
- no new horizontal overflow
- interaction and applicable boundary/unauthorized state GREEN
- SQL artifacts sanitized and correlated
- frontend route change has provenance row
- post-GREEN decomposition done or documented unnecessary
- focused checks rerun after final edit
- turn commit hook succeeds

Commit:

```sh
pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store \
  agent:turn-commit -- -m '<concise route-state summary>'
```

`YONA_ALLOW_SCALA_HTML_*` marker는 unattended goal commit에서 사용하지 않는다.

## 8. Failure classification

### 8.1 Visual/functional

- `STATUS_MISMATCH`
- `AUTH_BLOCKED`
- `DATA_MISMATCH`
- `LEGACY_ERROR`
- `YORAM_ERROR`
- `STYLESHEET_NOT_APPLIED`
- `GLOBAL_SHELL_DRIFT`
- `VISIBLE_SELECTOR_MISSING`
- `GEOMETRY_DRIFT`
- `HORIZONTAL_OVERFLOW`
- `MAJOR_TEXT_LOSS`
- `INTERACTION_MISMATCH`
- `DOWNLOAD`
- `RESTORE_REQUIRED`

### 8.2 SQL

- `error`: correctness, ACL, filter, order, pagination, cardinality regression
- `warning`: bounded correctness는 유지하지만 proved N+1/application join/over-fetch/predicate cost 존재
- `info`: latency/rows/query-count observation
- `intentional-difference`: correct database-native FTS/search or equivalent implementation shape

visual parity warning과 SQL warning은 서로를 가리지 않는다. FTS-only difference가 visual goal을
block하지 않듯, screenshot GREEN이 missing pagination을 pass시키지 않는다.

## 9. Program-level execution waves

### Wave A — Harness and queue

- SQL capture opt-in + focused Node contract
- route-goal queue generation
- current auth/restore blockers recorded
- one anonymous public route pilot proves end-to-end artifact contract

### Wave B — Shared shells

- global shell
- project layout/menu
- organization layout/menu
- site-admin layout/menu

각 shell은 한 concrete screen state로 구현하고 impacted focused regression set을 재실행한다.

### Wave C — High-volume read routes

- directories/search/workspace lists
- issue/board/milestone/PR/commit/notification lists
- populated detail/comment/review states

각 route에서 SQL phase 1 → phase 2를 수행한다. list routes는 page 1, later/empty page, active filters를
필수로 포함한다.

### Wave D — Forms and settings

- create/edit/validation/error states
- user/project/org/site settings
- authenticated role matrix가 필요한 상태는 credentials가 없으면 `AUTH_BLOCKED`로 남긴다.

### Wave E — Controlled writes

restore prerequisite가 검증된 뒤에만 approved reversible issue/comment/board/milestone/label/member/watch/
review/settings scenarios를 실행한다. write ledger, before/after checkpoint, restore outcome을 기록한다.

### Wave F — Final closure

- full desktop real-data sweep
- full mobile real-data sweep
- static-only/known-gap classification audit
- frontend `check`, focused/full relevant tests, production build
- final StyleX fallback-off visual lock when applicable
- secret/raw-literal/screenshot/attachment artifact audit
- full unattended Scala goal history audit
- final turn commit

## 10. Program completion gate

전체 workflow는 다음이 모두 충족될 때만 완료다.

1. manifest 250 live paths가 모두 route-state ledger에 연결됨
2. 265 Legacy route patterns가 covered/classified되며 무근거 누락이 없음
3. anonymous/public queue 완료
4. authenticated/private queue는 실제 credentials로 완료되거나 `AUTH_BLOCKED`로 명시되어
   전체 완료 claim에서 제외됨
5. mutation queue는 verified restore protocol로 완료되거나 `RESTORE_REQUIRED`
6. desktop/mobile status and visual diff ledger에 unclassified failure가 없음
7. phase-1 SQL error가 0
8. phase-2 candidates가 fixed, evidence-backed deferred, 또는 specialist escalation 상태
9. every changed route TSX has Scala root + focused E2E + provenance row
10. full frontend checks/build and relevant backend tests GREEN
11. committed files에 credential, raw SQL/bind, production-like body/email/token/attachment content,
    local screenshot가 없음
12. `SPEC.md` Section 8의 provenance/gap/deviation/test gates 충족

`AUTH_BLOCKED`, `RESTORE_REQUIRED`, `DATA_BLOCKED`가 남아 있으면 해당 범위를 제외하고 “전체 parity
완료”라고 표현하지 않는다.

## 11. Stop and escalation conditions

다음이면 scope를 넓히지 말고 evidence와 smallest next owner를 기록한다.

- owning Scala template/partials를 식별할 수 없음
- live Legacy output과 template 차이를 data/session/post-render behavior로 설명할 수 없음
- same-screen goal 안에서 제공할 수 없는 REST data contract 필요
- authenticated result가 Legacy/Yoram에서 다름
- SQL request correlation이 background query와 구분되지 않음
- join cardinality/null/ACL/order tradeoff가 불명확
- safe read-only plan을 얻을 수 없음
- write checkpoint/restore가 없음
- attachment body 접근이 필요함

SQL specialist escalation packet은 raw data 없이 다음만 포함한다.

- route pattern and state
- Legacy intent/controller/model references
- normalized Legacy/Yoram query shapes
- table/cardinality summary
- filters/order/pagination/ACL constraints
- sanitized plan access/estimated rows
- observed result-equivalence and risk
- smallest proposed repository owner

## 12. Review checklist

승인 전에 reviewer는 다음을 확인한다.

- [ ] one goal = one screen state가 유지되는가
- [ ] Legacy Scala HTML first 규칙과 React translation 규칙이 충돌하지 않는가
- [ ] authenticated/private scope를 anonymous redirect로 축소하지 않는가
- [ ] SQL phase 1과 phase 2 ledger가 분리되는가
- [ ] Legacy multi-query baseline을 자동 Yoram regression으로 오판하지 않는가
- [ ] FTS-only 차이를 warning으로 만들지 않는가
- [ ] SQL correlation과 artifact redaction contract가 충분한가
- [ ] shared shell과 route screen dependency order가 명확한가
- [ ] write/restore/attachment safety가 충분한가
- [ ] per-goal and program-level completion gates가 모두 검증 가능한가

## 13. Handoff prompt

리뷰 승인 후 새 agent에는 다음처럼 인계한다.

```text
Execute the next single route-state goal from
`docs/plans/2026-08-01-real-data-route-parity-sql-goal-workflow.md`.

Binding sources:
- AGENTS.md
- SPEC.md
- docs/plans/2026-06-30-scala-html-goal-workflow.md
- .agents/skills/yona-sql-performance-parity/SKILL.md
- docs/plans/2026-08-01-real-data-route-parity-sql-goal-workflow.md

Start with the resume guard and runtime preflight. Build/freeze the route-state
queue if it does not exist, then select exactly one highest-priority unblocked
screen state. Capture Legacy/Yoram DOM, network summary, and redacted correlated
SQL before editing. Resolve SQL phase-1 blockers before phase-2 optimization.
Delegate frontend route TSX/E2E implementation with explicit allowed/forbidden
files. Close only after whole-screen E2E, desktop/mobile focused sweeps, SQL
semantics, provenance, sanitization, and turn commit all pass.
```
