# Differential Behavior Coverage — Sweep-Excluded Behaviors & Follow-up (2026-08-23, rev.4)

Status: current. 이 문서는 differential sweep이 자동 비교하지 **않는** 행위와 그
이유를 기록한다. **중요(rev.4 정정): 아래 §1 행위는 대부분 Yoram에 이미 구현되어
있다** — SVN은 `crates/server/src/svn_protocol/*` + `crates/vcs`(svn executable),
git smart-http는 `crates/server/src/smart_http.rs` + git executable, migration/
import는 migrator 도구(`crates/migration`, `crates/yona-migrate`)로 구현돼 있다.
미커버의 원인은 미구현이 아니라 **자동 비교 수단의 부재**(프로토콜 클라이언트,
SMTP 토큰 전달, 공유 시드 상태 보호)다. rev.3의 "미구현(gap)" 표기는 잘못된
것이며 이번 판에서 정정했다. Companion artifacts:
`.agent/differential/behavior-coverage.json`, `.agent/differential/report.json`,
`docs/provenance/behavior-inventory.json` (immutable B-id inventory).

2026-08-23 결정: 기존 deferred 분류는 폐지됐다. 위 행위는 전부 1차 릴리즈
범위이며, 남은 작업은 "기능 구현"이 아니라 **스윕 하네스가 해당 행위를 자동
비교할 수 있게 만드는 것**(예: svn/git 클라이언트 페어 세션, 메일 catch-box,
격리 프로젝트 생성-삭제 라이프사이클)이다.

## 0. Intentional deviations — deliberately delegated surfaces (제외 확정)

아래는 미구현이 아니라 **SPEC.md 결정에 따라 app runtime이 아니라 migrator
딜리버러블이 소유하는** `-_-api/v1/**` 행이다. migrator 도구 자체는
`crates/migration` + `crates/yona-migrate`로 구현돼 있고 legacy Yona의 실제
`/-_-api/v1` 엔드포인트를 호출한다. 스윕이 이 영역 divergence를 발견하면
패리티 gap이 아니라 deviation이며, `scripts/differential/report.mjs`의
migrator-scope 규칙이 known-gap으로 자동 분류한다.

- `-_-api/v1/owners/:o/:p/exports` (B-0036) — export는 migrator/export tool 소유.
  yoram은 `/api/v1/owners/{o}/projects/{p}/exports`를 별도로 서빙한다(P15 확인).
- `-_-api/v1/owners/:o/:p/issues/imports` (B-0214 계열) — 게시글→이슈 변환 import.
  스윕은 P17/I18 boundary probe로 상태 차이만 기록한다.
- `-_-api/v1/owners/:o/:p/projects POST` (bulk import-style 생성) — 일반 프로젝트
  생성은 `/api/v1/owners/:o/projects`가 canonical이다.

주의: 위 목록 외의 `-_-api/v1/**` 행(hello, users, users/token, user/issues,
statistics, defultLoginPage, admin/users GET/PATCH, titleHeads, translation,
favorite 3종+토글, assignableUsers/findSharer/share/vote-weight/detectChange,
issues/comments CRUD compat)은 app-owned implemented이며 S12–S16 경계 프로브와
I11–I13/I20·I23 프로브가 검증한다.

## 1. Sweep-excluded behaviors (구현됨 — 스윕 자동 비교 미포함)

### SVN protocol (5) — 구현됨
- B-0021/B-0170/B-0294/B-0314 `(/DELETE|GET|POST|PUT) /svn/*path`,
  B-0271 `POST /!svn-fake/sevice/`
- 구현: `crates/server/src/svn_protocol/*` (WebDAV OPTIONS/ACTIVITY/HREF 처리) +
  `crates/vcs/src/lib.rs` (svn executable 기반 collection/put/delete)
- 미커버 이유: WebDAV 세션(MKACTIVITY, CHECKOUT, MERGE 순차 흐름)을 양쪽 서버에
  대해 동시 드라이브하는 svn 클라이언트 페어 하네스가 없다. 추가하려면
  `svn co/commit` 페어 실행 + working copy 결과 비교 시나리오가 필요하다.

### Git smart-http (2) — 구현됨
- B-0224 `POST $service<git-upload-pack|git-receive-pack>` (+ `info/refs` GET은
  P15가 error-tolerant probe로 부분 커버)
- 구현: `crates/server/src/smart_http.rs` (info/refs, upload-pack,
  receive-pack 라우팅) + git executable
- 미커버 이유: packfile은 바이너리 프로토콜이라 HTTP skeleton 비교가 불가능하다.
  커버하려면 양쪽에 `git clone/push`를 실행해 ref 해시와 로그를 비교하는
  client-side 페어 시나리오가 필요하다.

### Migration / import / export pages (6) — migrator 도구 및 서버 핸들러 존재
- B-0025 `GET /_import`, B-0200 `POST /_import`, B-0286 `POST /sites/import`
- 구현: migrator 도구(`crates/migration`, `crates/yona-migrate` — legacy
  `-_-api` 엔드포인트를 호출하는 importer/exporter 파서·디스크립터 포함) 및
  서버 핸들러(`lib.rs`/`state.rs`의 `_import` 처리)
- 미커버 이유: import는 legacy 인스턴스 접속 정보와 양방향 데이터 검증을 필요로
  한다. 단일 스윕 페어 요청으로 비교되지 않는다. v1 범위 확정에 따라 migrator
  완성도와 함께 별도 검증 시나리오를 붙이는 것이 후속 작업이다.

### Email-token flows (5) — 서버 핸들러 구현됨, 토큰 전달 경로가 SMTP 의존
- B-0175 email confirm, B-0192 verify user, B-0275/B-0285 lostPassword/
  resetPassword POST, B-0154 resetPassword render
- 구현: `crates/server/src/routes/auth.rs`, `utils.rs`
- 미커버 이유: single-use 토큰이 메일로만 전달된다. 패리티 환경에 메일
  catch-box가 없어 토큰 값을 하네스가 얻을 수 없다. 해결책은 두 서버의 메일
  전송을 파일/catch-box로 redirect하는 테스트 설정이다.

### Destructive on shared parity state (7) — 하네스 안전 규칙에 의한 제외
- B-0001 deletefrombranch, B-0002 branch delete, B-0019 site project purge,
  B-0225 clone, B-0226 fork, B-0236 changeVCS, B-0313 transfer acceptance
- 구현 여부와 무관하게, 샘플 프로젝트/시드 브랜치는 전 시나리오의 공유 상태라
  파괴 연산을 스윕이 실행하면 후속 시나리오 전체가 오염된다.
- 커버 방법(구현 필요 없음): P18 throwaway-project 패턴 확장 — 격리
  프로젝트를 만들고 그 안에서 clone/fork/changeVCS/delete를 수행한 뒤 삭제.

### Misc (7) — 서버 핸들러 존재, 도달 조건이 까다로움
- B-0155 `/restricted`: 인증 거절 후 상태에서만 렌더 → 익명/로그인 세션으로는
  도달 불가. 강제-거절 픽스처 필요.
- B-0199 `POST /`: root catch-all form target. 시맨틱 확인 후 프로브 추가.
- B-0287/B-0288 sites mail/mailList: 메일 발송 — catch-box 설정 선행.
- B-0289 setAttachmentToUserAvatar: 이전 아바타 상태 캡처 없이는 되돌리기
  불가. 캡처-복원 스텝을 추가하면 커버 가능.
- B-0295/B-0296 threads/:id/close|open: 시드 데이터에 notification thread id
  원천이 없어 id discovery가 불가. 알림 생성 시나리오와 체인으로 묶으면 해소.

## 2. Runtime divergences found by the mutation sweeps (follow-up)

49 needs-review violations in `.agent/differential/report.json` are genuine
parity findings. Dominant clusters (each needs its own investigation before
classification):

1. **Milestone/post/webhook create→delete chains fail mid-chain** (P8/P9/P10):
   legacy create returns a redirect whose id extraction fails, so the paired
   delete hits a different entity than yoram's. Fix discovery, then re-run.
2. **Project label attach/detach + api-create** (P12/P17): legacy
   `ProjectApp` label routes respond differently from yoram REST
   (`/-_-api/v1/.../labels`); one suffix-tagged issue row remains yoram-only
   (db-issues projection flags it every run).
3. **Watch/unwatch + enroll/cancel + members add/remove** (P11/P13/P16): status
   pairs diverge (legacy 303 redirects vs yoram 200 JSON) — needs the lenient
   pairing treatment ProjectMutation used elsewhere.
4. **Throwaway-project sub-flows** (P18): copyLabels/members/setting/transfer
   diverge inside the throwaway; delete itself succeeded both sides.
5. **Compat API probes** (I13/I18/I22/I23, S10): mix of legacy token-gated 401s
   (documented deviation), yoram missing `/markdown` endpoint, and response-shape
   drift in favoriteProjects/favoriteOrganizations/titleHeads.

## 3. Harness debt (infra-classified, fix before next coverage raise)

- `LegacySession.request`: json support added 2026-08-23; multipart form is
  global for all legacy form POSTs (per-endpoint switch if any handler rejects).
- Id-resolution guards (`whenIds`) exist only in issues.mjs; project/userorg
  mutation chains need the same guard pattern to avoid `/null/` paths.
- `sendRaw`/`pairLenient` helpers are duplicated locally in project.mjs and
  userorg.mjs; promote to `ctx.helpers` when a third copy appears.
