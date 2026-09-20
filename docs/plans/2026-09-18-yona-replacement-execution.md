# Yona replacement 실행 계획

Status: approved — Track A 실행 계획 확정; Track B 기본 정책 승인, 상세 데이터 범위 결정 대기
Date: 2026-09-18
Implementation status: in progress — A1/A2 focused regressions passed; A3 row/file reconciliation and failure recovery verified, golden completion blocked by source Git corruption; A4/A5 acceptance underway

## 승인 경계

사용자는 대용량 legacy 교체와 소규모 SI 프로젝트 API 병합을 별도 작업으로 진행하는 제안을 승인했다. Track B의 상세 결정은 Track A를 차단하지 않는다. 이 문서는 계획 승인 기록이며 제품 구현·검증 완료 기록이 아니다.

분석 기준은 `feature/pull-request@c8b27212b`와 `main@7f03d4fac`다. 당시 main은 현재의 조상이며 5커밋 뒤였다. 구현 착수 시 작업 트리와 현재 HEAD를 확인하고 기존 수정들을 보존한다. 결함 근거와 이전 실행 증거는 [통합 분석 보고서](../reports/yona-replacement-backend-analysis-2026-09-18.md)를 따른다. 새 실행을 하기 전까지 과거 artifact를 현재 HEAD의 성공으로 기록하지 않는다.

## 공통 결정

- 목표는 legacy Yona의 사용자 기능·UX 대체다. 구 endpoint와 JSON 계약의 복제는 요구하지 않는다. legacy 읽기는 export/import CLI 경계에서 다룬다.
- HTML fragment는 React SPA의 데이터 조회·렌더링으로, jQuery/Select2 사용자 기능은 React state/events/components로 구현한다. plugin 전용 DOM은 보존 대상이 아니다.
- 설정 포맷과 기능별 key는 새로 정의할 수 있다. 기존 이름이나 alias를 유지할 의무가 없으며, 이 허용을 이유로 무관한 설정을 선제 개편하지 않는다.
- legacy DB에서 새 모델로 단방향 이전한다. 구 스키마 복귀·역변환·양방향 호환을 설계하지 않는다.
- 인증·권한, 콘텐츠, 첨부파일, 저장소 이력과 사용자에게 보이는 결과는 보존한다. 기술적 하위 호환 제외가 기능 누락의 면제는 아니다.
- 최초 교체는 쓰기 중단 후 일관된 DB·저장소·첨부 snapshot을 기준으로 수행한다. 무중단 동기화는 요구하지 않는다.
- 원본 백업은 보존한다. 실패 시 대상 복사본에서 재시도하거나 대상 백업을 복원한다. 새 DB를 구 스키마로 되돌리는 기능은 없다.
- 사용자가 보고한 golden-fixture 규모 API migrator timeout은 확인된 실패다. 재확인을 선행 조건으로 삼지 않는다.

## Track A — 대용량 legacy 교체와 parity 완성

### A0. 실행 기준과 문서 정합성

- 현재 브랜치의 첨부 ACL/blob 수명, 이슈 알림, 댓글 충돌, packaging/process-wait 수정들을 포함한 candidate를 기준으로 한다.
- 구현 대상의 legacy 근거와 기존 테스트·명령을 확인한다. 과거 SPEC/provenance의 API·설정·스키마 호환 문구와 이번 승인 범위의 차이는 해당 구현을 변경할 때 함께 정리한다. 현재-only 수정은 미구현 목록에 다시 넣지 않는다.
- 알려진 결함과 증거 공백을 별도로 추적한다. 새 validation framework를 만들지 않고 기존 계획·provenance·gate를 사용한다.
- 완료: candidate와 변경 소유 범위가 기록되고, 아래 작업별 정확한 수정 파일·수용 조건이 확인됨.

2026-09-18 실행 기준: `feature/pull-request@c8b27212b16d10a0013edfa514952d2cfd959eeb`.
착수 시 이 계획과 `docs/reports/yona-replacement-backend-analysis-2026-09-18.md`는
untracked였으며 기존 사용자 문서로 보존한다. A1은 auth callback/계약과
persistence credential 보정/startup 경계로 분리했다. A2는 MIME, board 알림,
검색 경계로 분리하고, A3 CLI와 A4 branch timestamp는 독립 소유한다.
소스 확정 결함과 기존 sweep/실환경 증거 공백은 별도로 다룬다.

### A1. OAuth 보안 결함 제거 — 최우선

소유 경계: `crates/server/src/routes/auth.rs`, 관련 auth 계약 및 `crates/persistence/src/repo/user.rs`의 필요한 부분.

1. runtime callback의 query identity shortcut을 제거한다. 테스트는 기존 HTTP provider stub의 code exchange를 사용한다.
2. 신규 OAuth 계정에 예측 가능한 로컬 비밀번호를 만들지 않는다. 기존 보안 난수 사용 패턴을 우선한다.
3. 이미 결정식 비밀번호로 만들어진 계정이 있는 배포 환경은 영향 계정 처리까지 포함한다. 기존 로컬 사용자 비밀번호는 공급자 연결로 바뀌지 않아야 한다.

완료: 정상 state + 위조 identity, 잘못된 code + identity가 세션/계정 연결을 만들지 않음. 정상 code exchange와 OAuth 재로그인은 성공. 결정식 비밀번호의 로컬 로그인은 거부. 영향 기존 계정 처리의 근거가 있음.

2026-09-18 focused 증거:

- 수정 전 valid-state 위조 identity callback은 `/yona/`로 로그인되어 거부 회귀가 실패했다:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T112905-504Z.log`.
- 공급자 HTTP code exchange만 신뢰하도록 변경하고 신규 비밀번호는 기존 보안 난수로 생성했다.
  OAuth 계약 11개와 기존 계정 local/BasicAuth 거부 계약 1개가 통과했다:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T113056-373Z.log`.
- 시작 시 128-row keyset batch로 연결 계정을 읽고 과거 결정식과 bcrypt hash가
  일치하는 비밀번호만 조건부 폐기한다. 기존 로컬/변경 비밀번호와 OAuth 연결은
  보존하며 보정 오류는 listener 시작 전에 전파한다. batch 경계·쓰기 실패·재시도
  계약 1개 통과: `.agent/cargo-test-logs/cargo-test-2026-09-18T113113-600Z.log`.
- 이 보정은 과거 침해로 발급된 세션/API 토큰을 폐기하지 않는다. 실제 영향 배포의
  침해 조사·토큰 회수는 별도 운영 조치가 필요하다. 위 결과는 로컬 provider stub을
  사용하는 focused 검증이며 실제 공급자 연결이나 최종 전체 gate 성공을 뜻하지 않는다.

### A2. 공통 기능 격차 복원

| 작업 | 소유 경계 | 수용 조건 |
|---|---|---|
| MIME 첨부·CID | integrations MIME 처리, server mailbox, persistence mailbox 및 기존 첨부 저장 경계 | 실제 RFC822의 이슈/답장 댓글에 파일명·원본 bytes·CID 이미지가 보존되고 ACL 적용. 반복 수신 시 중복 생성 방지 |
| 게시글 무알림 수정 | board REST/client/form, posting mutation 및 notification 경계 | 작성자 off/on, 권한 있는 비작성자 off에서 내용은 저장되고 알림 결과는 legacy predicate와 일치. 언급 관계 갱신도 보존 |
| 검색 결과 의미 | persistence search/common, search ranking 및 관련 계약 | 같은 데이터·권한·검색어에서 타입별 ID·순서·count·페이지 경계가 legacy와 일치. FTS는 내부 수단이며 추가 행/재정렬을 정당화하지 않음 |

각 반례는 수정 전 실패하고 수정 후 성공하는 focused 회귀로 확인한다. 이미 사용자에게 보고된 실패 자체를 재확인하는 것이 아니라 수정의 정확한 경계를 검증한다.

2026-09-18 focused 결과:

- MIME는 binary RFC822, encoded/continued filename, CID, 중복 수신, 무시 대상,
  DB 실패 시 신규 blob 정리와 기존 공유 blob 보존을 검증했다.
  mailbox fetch command 출력은 NUL framing 대신 **RFC822 bytes의 base64 문자열 JSON 배열**로
  단일 전환했다. 이전 framing은 거부한다. 로그:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T115758-376Z.log`,
  `.agent/cargo-test-logs/cargo-test-2026-09-18T115823-758Z.log`.
- 게시판은 `selected || !isAuthor` predicate와 mention 관계 갱신을 복원했다.
  backend 9개 및 board edit form/branches focused WTR 10개가 통과했다.
- 검색은 title-hit/repetition ranking을 제거하고 legacy 검색 필드·DB 정렬·ACL·20건
  페이지를 적용했다. source와 다른 author/project 필드 검색 및 admin 권한 확대를
  제거했다. persistence focused 8개 통과:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T114328-125Z.log`.
  SQLite focused 결과를 MySQL/MariaDB collation 전체 동등성으로 확대 해석하지 않는다.
- auth/board/mailbox/search/Smart HTTP backend 121개 통합 focused 통과:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T114159-993Z.log`.

### A3. 대용량 DB 직접 연결 migrator

권장·필수 인수 경로는 **legacy DB 직접 연결 → 기존 migrator의 변환 → 새 DB**, 그리고 저장소·uploads의 별도 이전이다. 기존 `crates/yona-migrate`, `crates/migration`, preflight를 재사용한다. DB adoption 성공만으로 변환·이전 경로의 성공을 대체하지 않는다.

1. 지원 legacy DB의 실제 schema, 관계, 읽기 경로와 기존 변환 구현을 조사해 필요한 누락만 채운다. golden fixture의 DB를 직접 읽는 경로를 우선 확정한다.
2. 사용자·조직·프로젝트·membership/권한·이슈·게시글·댓글·라벨·마일스톤·PR·리뷰·이벤트·첨부 관계 등 legacy 보존 대상 전체를 기존 inventory와 원본으로 대조한다.
3. 전체 데이터를 한 번에 메모리에 올리거나 한 HTTP 요청에 넣지 않는다. 기존 paging/batch/transaction 패턴으로 유한한 단위에서 처리한다. 저장소/첨부 bytes는 DB row와 별개로 확인한다.
4. 요청된 이전의 자격증명 누락, 첨부 실패, 저장소 실패, 작업 panic은 성공으로 끝나지 않는다. 수동 SVN 복구가 필요하면 미완료로 남기고 복구 후 확인한다.
5. 실패/재시도 시 대상의 부분 상태를 설명할 수 있어야 한다. 기존 staging/transaction/preflight를 재사용하고 재시도 또는 대상 재생성 절차를 실제 검증한다.

완료:

- golden-fixture 규모에서 API bulk 이전 없이 DB 직접 연결 경로가 끝까지 완료됨.
- 소요 시간·최대 메모리·처리량·오류와 실행 환경을 기록. 숫자 목표는 측정 전에 임의로 만들지 않으며 HTTP timeout 증대만으로 해결했다고 하지 않음.
- 원본/대상 객체 수와 필수 관계, 작성자·시각·권한, 첨부 bytes/hash, Git refs/history, SVN revision/UUID 등 보존 근거 확인. ID 재할당 시 참조 매핑 일관성 확인.
- 이전 후 실제 로그인·이슈/댓글 수정·첨부 다운로드·PR/리뷰 조회와 VCS 동작 확인.
- 실패 주입은 완료로 기록되지 않으며 복구/재시도 후 누락 없이 완료됨.

API의 대용량 성능 최적화 및 Yoram→Yoram 완전 프로젝트 export 확대는 이 작업의 선행 조건이 아니다.

2026-09-18 구현·실행 증거:

- `crates/yona-migrate/src/direct_db.rs`: MySQL/MariaDB read-only consistent snapshot →
  빈 대상의 canonical schema → keyset batch/transaction copy와 각 field readback →
  FK 검사 → uploads/repo 별도 stream/hash → Git/SVN native 무결성 검사.
  `play_evolutions`만 의도적으로 제외하며 대상 migration ledger는 새로 생성한다.
  지원하지 않는 schema/type/혼합 column collation은 성공 처리하지 않는다.
- 원본 `.meta/backup-yona.sql`의 61개 application table, **270,845행**을 복사하고
  모든 원본 column projection의 count/SHA-256이 일치했다. uploads/repo의
  **20,802파일, 5,692,199,842 bytes**도 경로·크기·SHA-256이 모두 일치했다.
  증거: `.agent/replacement-execution/{source,target}-db.json`,
  `.agent/replacement-execution/{source,target}-files.json`.
- 최적화 binary 실행은 `time -l` 기준 **429.22초**, maximum RSS **1,863,155,712 bytes**,
  peak memory footprint **21,184,920 bytes**를 보고했다. 이 실행은 마지막 Git 검증에서
  실패했으므로 완료 throughput/성공 benchmark가 아니다. 별도 Git fsck의 약 2GB RSS를
  migrator 자체의 작은 footprint로 숨기지 않는다.
- **golden acceptance scope (user-directed):** repository verification uses only
  project id `1`, `admin/WYVE_OCS.git` (`WYVE_OCS`). The existing DB/file
  migration evidence already matches the full snapshot; the repository gate is
  now scoped to the approved project rather than unrelated project id `3`.
- `git fsck --full --no-dangling` passes for WYVE_OCS with no output; the
  repository has **43,737 commits**, **496 packs**, **623,380 packed objects**,
  and **0 garbage objects**. The exact evidence is
  `.agent/replacement-execution/golden-wyve-ocs-integrity.json`.
- **WYVE_MIS is explicitly excluded** from this acceptance run and must not be
  read, validated, transferred, or used as a migration/repository gate input.
  The prior project-3 corrupt-pack result remains historical evidence only in
  `.agent/replacement-execution/golden-source-pack-integrity.json`.
- 소형 fixture의 직접 이전(batch 1)은 **2.43초**, maximum RSS **16,859,136 bytes**로
  Git/SVN 검증까지 통과했다. 잘못된 source 자격증명, 누락 attachment, 누락 Git object를
  주입해 실패를 확인했다. attachment preflight 실패는 대상 table 0개를 유지했고,
  부분 복사 대상의 재사용은 거부했다. 원본 복사본을 복원하고 **작업 소유의 disposable
  대상만 재생성**하여 full retry가 통과했다:
  `.agent/replacement-execution/migration-failure-recovery.json`.
- 소형 원본 fixture의 두 Git HEAD가 존재하지 않는 `main`을 가리켰다. 이전기는 이를
  그대로 보존했다. VCS 후속 smoke에서는 원본을 건드리지 않고 disposable 대상 HEAD만
  fixture 문서의 실제 `master`로 맞췄다. 이 보정을 migration의 자동 복구라고 하지 않는다.
- 이전된 SHA 비밀번호 로그인, issue 수정, comment 생성/수정 후 reload, attachment
  69 bytes와 원본 SHA-256 일치, 기존 PR 제목/본문/branch 연결 조회를 확인했다.
  PR changes의 native multipart form이 415로 이동하던 경로를 React JSON mutation으로
  고쳤다. embedded 배포물에서 review 작성 HTTP 200과 reload 뒤 본문 보존을 확인했다:
  `.agent/replacement-execution/restored-review.png`. 이는 소형 fixture의 증거이며,
  손상된 golden 저장소의 PR/review 전체 검증을 대신하지 않는다.

### A4. 잔여 UI와 행위 증거

- 알려진 브랜치 날짜 gap은 원본 timestamp부터 legacy 표시/tooltip까지 복원한다.
- 분석 당시 전체 sweep의 UNVERIFIED 17건과 B-0014/B-0015 댓글 삭제 행위를 기준 입력으로 삼는다. 후속 결과를 확인해 이미 종료된 항목은 재개하지 않는다.
- repository graph/timestamp/PR state, actor, locale, viewport가 같은 fixture에서 visible role/copy/order/geometry와 mutation 전후 상태를 비교한다.
- plugin-only 구조는 제외하되 visible control·행·문구 누락을 fingerprint 허용으로 숨기지 않는다. CSS 수치 보정 대신 legacy DOM/class/cascade를 복원한다.

완료: 해당 candidate의 알려진 gap과 미판정이 종료되고, 관리자 댓글 삭제 후 실제 상태·이동 증거가 있음. focused green을 전체 완료로 부르지 않음.

실행 기록 — 진행 중:

- commit `HEAD`를 실제 SHA로 정규화해 조회·댓글·thread state·watch가 같은 객체를
  사용하도록 수정했다. Git 작성자, 기존 댓글 참여자, 명시적 COMMIT/project watcher를
  합치고 COMMIT unwatch·수신 설정·현재 read ACL을 적용한다. mention은 unwatch 뒤
  추가하되 접근 권한을 확대하지 않는다.
- 실제 REST notification inbox 회귀는 Git 작성자 수신, 명시적 watch/unwatch,
  project watch에 대한 COMMIT unwatch 우선순위, sender 제외, implicit commenter,
  mention, public → private 전환 뒤 권한 없는 수신자 제외를 검증했다.
  code browser / PR mutation / notification contract 실행 통과:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T173026-150Z.log`.
- rendered skeleton은 CSS로 실제 숨겨진 subtree/clip과 plugin backing input을
  제외하되 열린 control, visible descendant, scroll 영역과 화면 아래 내용을 보존한다.
  fingerprint/class allowlist를 새로 추가하지 않았다. native confirmation은 화면 내
  hit-test와 animation 완료 후 실제 click하고 DELETE·DOM 제거·reload를 확인한다.
  runner/native action/user·organization/legacy launcher의 86개 회귀가 통과했다.
  height 0 + overflow hidden인 도움말은 `checkVisibility()`가 true여도 보이지
  않는다는 것을 실제 패키지 화면에서 확인하고, 닫힘/열림 전환을 검증했다.
  이 결과를 전체 parity 완료로 집계하지 않는다.
- 후속 보정 전 전체 실행 `sweep-mu7aevzh`:
  `.agent/replacement-execution/full-candidate/report.json`.
  117/117 scenario를 시도했고 global infrastructure error는 0이다.
  UNVERIFIED 61건, disposition으로 면제되지 않은 step error 12건이 남아
  **A4는 미완료**다. 이슈 상세의 ISO 날짜 노출, H2 local timestamp를 UTC로
  잘못 옮긴 fixture, progress-only 화면의 조기 capture, 기존 PR과 같은
  branch tuple 재사용, legacy 검증 메일의 잘못된 public port를 분리해 수정 중이다.
- 같은 실행에서 일반 사용자의 조직 가입이 거부되는 제품 결함을 확인했다.
  legacy `OrganizationUser.roleTypeOf`의 조직 비회원 GUEST와 전역 guest
  계정 플래그를 혼동한 것이 원인이다. 조직 권한 계산을 수정했고 기존 조직·REST
  회귀 10건이 통과했다:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T191007-654Z.log`.
- 후속 diagnostic 실행 `sweep-mu7ca28i`도 117개 scenario를 모두 시도했다.
  `.agent/replacement-execution/corrected-candidate/report.json`에는
  step error가 없는 scenario 108개와 미면제 step error 20건이 있다.
  실행 중 수동 화면 관찰과 이후 harness 수정이 있었으므로 최종 인수 증거가 아니다.
- live H2를 `FILE_LOCK=NO`로 별도 열면 HTTP로 저장한 PR 제목이 보이지 않는
  stale read를 실제로 재현했다. 기존 H2 `AUTO_SERVER=TRUE` 연결과 loopback
  bind를 사용해 동시 프로세스의 최신 commit을 읽도록 고쳤다. 삭제된 source
  branch에만 쓰는 `LAST_COMMIT_ID` 대신 PR의 CURRENT commit을 확인한다.
  별도 JVM writer/readback 회귀가 통과했다.
- label category 검색이 첫 unrelated row를 선택하던 harness 결함을 exact name
  lookup으로 고쳤고 삭제 대상 보존 회귀를 포함한 issue action 18건이 통과했다.
  SPA capture는 빈 shell을 거부하면서 site framed page와 notification fragment를
  구분해 기다린다. 이전 timeout 대상 10개 route에서 실제 Chrome readiness를 확인했다.
- PR navigation count는 legacy OPEN 상태를, review count는 commit-only thread를
  포함한 OPEN thread를 사용하도록 복원했다. mixed-state REST 회귀와 실제
  화면의 PR 3 / review 1 표시를 확인했다:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T194416-256Z.log`.
- issue action row의 임의 flex 정렬을 제거하고 legacy block/float 구조를 복원했다.
  vote native button은 frozen reset, assignee는 legacy fullsize, 선택된 label의
  닫힌 search input은 legacy 폭을 사용한다. markdown 도움말은 legacy 5px/8px
  padding을 native button에 옮겨 표시 크기와 전체 클릭 영역을 일치시켰다.
  실제 Chrome에서 투표 위치·배경, 도움말 첫 항목 60.15625×30 및 가장자리
  click/Enter 닫힘을 확인했다. focused WTR 6 specs: 121 passed / 0 failed /
  2 dependency skips. source-text/전체 HTML 고정 assertion은 동작 검증으로 대체했다.
  근거: `.agent/replacement-execution/current-issue-controls-evidence.json`.
- seed issue1의 legacy CLOSED / canonical OPEN 차이는 I4 harness 오염으로
  확정했다. `IssueApp.nextState`는 GET이어도 저장하는데, I4가 seed #1을
  읽기용으로 호출했다. legacy log의 Node GET 시각과 ISSUE_STATE_CHANGED
  event id4가 일치한다. 전용 이슈 생성 → legacy transition / native REST PUT →
  독립 저장 상태 조회 → 삭제로 바꿨다. HTTP 성공 뒤 저장이 안 된 반례를 포함해
  통합 Node 회귀 102건이 통과했다. 수동 개입 없는 새 117-scenario 실행은
  `.agent/replacement-execution/aligned-candidate/`에 별도 기록한다.
- compare 화면의 파일 수·추가/삭제 줄 수 bar는 legacy compare template,
  partials, Git/SVN diff JS 어느 쪽도 생성하지 않아 제거했다. 대응 불용 CSS와
  source pin을 삭제했고 revision 링크·실제 diff 보존 WTR 3 specs / 7 tests가
  통과했다. actual product 화면에서도 revision 바로 아래 두 diff table을 확인했다:
  `.agent/replacement-execution/compare-screen-evidence.json`.
  retained legacy runtime의 해당 commit 조회 실패 때문에 이 수동 관찰을
  paired geometry 승인으로 사용하지 않는다.
- 다음 중간 실행 `sweep-mu7en4rt` (`aligned-candidate/report.json`)은
  117개 scenario를 시도했지만 DOM UNVERIFIED 54건과 readiness step error
  3건이 남았다. 아래 수정 전 결과이며 최종 승인으로 사용하지 않는다.
- legacy `/_init`는 단순 redirect가 아니라 모든 저장소를 삭제·재생성하는
  test bootstrap이다 (`Application.java:106-125`,
  `RepositoryService.java:71-74`, `conf/routes:33-34`). 이전 retained
  sample.git의 빈 HEAD 생성 시각이 해당 GET과 일치했다. 해당 scenario 동안
  실제 저장소 root를 같은 파일시스템의 별도 경로에 보존하고 `finally`에서
  복구하도록 harness를 고쳤다. 정상 capture와 capture 실패 모두에서
  Git/SVN 내용이 복구되는 실제 파일시스템 회귀를 유지한다.
- fixture project identity는 owner/name으로 정렬하고 FK 및 TEXT resource ID를
  함께 옮긴다. SQLite에 Number를 바인딩하면 REAL `2.0`이 되어 TEXT `"2"`와
  일치하지 않는 반례를 확인하고 두 단계 remap 모두 정수 BigInt를 바인딩한다.
  기존 identity/FK/watch/idempotency 회귀가 통과했다. 제품 DB의 ID를
  임의로 바꾸는 기능이나 충돌 무시 경로는 추가하지 않았다.
- `/_help`, login, root readiness는 숨겨진 sidebar loading을 기다리지 않는다.
  PR create/edit는 legacy Ajax의 Checking 이후 success/error/info 상태를
  기다린다. 실제 브라우저 readiness 회귀를 사용하며 error 상태를 숨기지 않는다.
- issue/post 번호는 삭제 후 재사용하지 않고 저장된 project high-water mark와
  현재 행의 최대값 중 큰 값 다음을 사용한다. import/transfer는 counter를
  증가만 시킨다. 전체 삭제 후 재생성, stale/null counter, import/transfer의
  기존 계약으로 확인했다. PR changes는 해당 PR에 연결된 review thread만
  보여 주되 project review 목록/count는 commit-only thread를 계속 포함한다.
- board·profile·organization·directory·site 화면은 raw created/last-pushed
  timestamp를 기존 legacy formatter로 표시한다. milestone 상세는 실제
  project label/assignee/milestone option으로 bulk mutation을 수행하고,
  dashboard는 OPEN milestone의 due-date 순서를 사용한다.
- project/PR/organization picker는 React state와 기존 REST/TanStack 경계로
  구현했다. Select2 base margin rule은 원래처럼 Yobi utility 앞에 배치해
  `mr5`가 적용되도록 했고 native button reset과 sprite는 원본 규칙·Vite
  자산을 사용한다. 새로운 위치·폭 보정이나 DOM fingerprint 면제는 없다.
- PR 기본 source branch는 legacy `GitRepository.getBranches()`의 committer
  timestamp 내림차순으로 선택한다. 작성 시각과 timezone offset이 다른
  기존 VCS 회귀가 통과했다:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T214855-723Z.log`.
- browser 검증에서 조직 projectNames alias 중복, label 제거 후 focus/hint,
  모바일 도움말 중복 패딩을 보정했다. label focus는 native Chrome에서
  정상임을 확인했으며 WTR의 textbox selector가 `type` 생략 input을
  누락하는 결함을 수정했다. source/CSS 문자열·전체 HTML·text-node 분할
  고정 assertion은 제거하고 동작·표시·geometry 검사는 유지한다.
- `integrated-candidate/partial.json`은 모바일 패딩 수정 전 중단한 진단
  실행이다. 완료 sweep이나 같은 최종 candidate의 성공으로 집계하지 않는다.
- 완료된 `sweep-mu7ifab5` (`final-candidate/report.json`)는 117개 중
  116개 scenario에 step error가 없었고, I18 import readback 한 건이 실패했다.
  HTTP 200으로 `importedIssues=0`을 반환한 ID 충돌을 별도 실제 요청으로 재현했다.
- import는 다른 destination의 issue/comment ID와 충돌하면 기존 transaction을
  rollback하고 failure checkpoint와 HTTP 500을 반환한다. 실제 충돌 요청의
  수정 후 결과와 원본 issue/comment 불변을
  `i18-collision-after.json`에 기록했다. 같은 destination의 재실행은 유지한다.
  disposable pilot만 삭제한 빈 SQLite issue 테이블의 sequence도 초기화한다.
- PR merge는 실제 actor 이름/이메일, source commit 목록, PR 번호와 reviewer
  trailer를 legacy `PullRequest.java` 규칙대로 기록한다. source/target tree와
  parent가 같아도 임의의 Yoram identity/message를 쓰던 차이를 제거했다.
- 후속 `sweep-mu7nd2qf` (`corrected-final/report.json`)는 117/117 scenario,
  미면제 step error 0, global infrastructure error 0, accepted disposition 9다.
  DOM `UNVERIFIED` 55건, `IMPLEMENTATION_DIFFERENCE` 13건,
  `LEGACY_BUG_NOT_REPRODUCED` 5건은 별도이며 **A4 완료가 아니다**.
  이 실행은 이후 shared header/toast/search 및 fixture 날짜 보정 전 증거다.
- 실제 서로 다른 runtime origin을 확인한 FAQ closed/open과 알림 switch의
  대응 bounding box가 일치했다. FAQ sprite decode와 plus/minus 위치,
  알림 On→Off→On의 HTTP 200 및 reload 후 저장 상태를 확인했다:
  `faq-paired-real-states.json`, `notification-paired-metrics-after.json`,
  `notification-real-persistence.json` (모두 `.agent/replacement-execution/`).
- 후속 Rust workspace는 435.7초에 통과했다
  (`cargo-test-2026-09-19T002548-784Z.log`). source fixture 생성 시각을
  legacy UTC instant에 맞추는 회귀를 포함한 Node 203건도 통과했다.
  WTR 129-file 실행의 793 passed / 2 failed / 8 skipped는 실패 기록으로
  유지하며, 수정 중인 shared UI의 최종 통합 gate와 혼동하지 않는다.
- 후속 실제 Chrome 비교에서 anonymous hero의 desktop/mobile 높이
  270/310px, milestone dropdown 및 search box, assignee의 avatar/name/login
  자식 box가 각각 legacy와 일치했다. 코드 파일 tooltip은 280×48.40625px,
  issue 공유 tooltip은 280×100.0078125px로 위치까지 일치했다.
  `anonymous-home-paired-final.json`, `milestone-dropdown-paired-final.json`,
  `assignee-visible-children-paired-final.json`, `code-tooltip-paired-final.json`,
  `issue-popover-paired-final.json`을 근거로 한다.
- 135-file 통합 WTR은 801 passed / 14 failed / 8 skipped였다.
  복원된 `.ybtn` margin에 맞지 않는 기존 기대값 외에 board edit의
  불필요한 whitespace, watching-state cascade, issue popover의 고정
  line-height/위치 문제를 수정했다. 이후 9-file 실행도 153 passed /
  7 failed였다. hover 실패는 WTR이 scroll/layout 안정화 전에 pointer 좌표를
  계산하는 순서와, Watch 응답 fixture가 댓글·권한을 바꾸는 문제를 수정했다.
  paint 기대값은 완화하지 않았다. 후속 7-file 실행은 118 passed / 2 failed로,
  조직 생성 actions의 비레거시 공통 flex 규칙이 마지막 두 실패의 원인이었다.
  해당 규칙을 제거한 뒤 전체 WTR을 재실행한다.
  `aligned-final/partial.json`은 추가 product 수정 때문에 중단한 실행이며
  완료 sweep으로 집계하지 않는다.
- profile 입력의 Helvetica Neue font와 upload 버튼의 intrinsic inline-block
  box를 frozen CSS로 복원했다. 조직 생성의 중복 owner CSS와 공통 native
  form reset을 제거한 뒤 이름/설명/legend 및 profile control box가 실제
  legacy와 일치했다 (`account-controls-paired-final.json`).
  조직 actions는 desktop/mobile 모두 같은 위치이며, 버튼 text shaping의
  0.0078125px 폭 차이만 측정되었다
  (`organization-create-actions-paired-final.json`,
  `organization-create-actions-mobile-paired-final.json`).
- 최신 완료 sweep `sweep-mu7qjzz2` (`current-source/report.json`)도 117/117
  scenario, 미면제 step error 0, infrastructure error 0이며 DOM 미판정은
  55건이다. 이 기록은 아래 설정·webhook·날짜·키보드 후속 수정 전 결과다.
  source-only 검토나 plugin DOM 차이라는 설명만으로 미판정을 닫지 않는다.
- 전체 WTR 660-file 실행은 2,760 passed / 38 failed / 8 skipped였다
  (`current-full-wtr-failed.log`). 후속 34개 spec의 오래된 source/구조 고정
  assertion과 fixture를 정리했지만, 39-file 통합 실행은 1,200초에
  timeout되어 통과 증거가 아니다 (`focused39-timeout.log`). posts 단독은
  49/49 통과했고 modifier-click 전후 순서에 따른 browser foreground를
  조사 중이다. 아직 새 전체 gate 성공으로 대체하지 않는다.
- settings/webhook은 원본 Scala whitespace와 frozen CSS cascade를
  복원했다. Tailwind의 `inline` utility가 legacy `.radio.inline`과
  충돌하지 않도록 제외했다. 실제 paired browser에서 settings desktop
  bubble 535px, webhook form desktop/mobile 239/414px와 입력 box가
  일치했다 (`settings-webhooks-paired-after.json`). settings mobile의
  1px 차이와 locale가 달랐던 이전 capture의 무효는 별도로 기록한다.
- site-user action 사이 whitespace와 원본 margin을 복원했다. desktop
  세 행은 각각 111px로 일치했지만 mobile 전체 행 동등성은 주장하지
  않는다. 날짜 문구 차이를 margin으로 숨기지 않고 실제 UTC 전달 결함을
  추적했다 (`site-user-actions-paired-after.json`).
- 관리자 사용자·프로젝트 API가 UTC DB 시간을 offset 없이 반환해
  Asia/Seoul에서 약 49분 전 가입을 9시간 전으로 표시했다. 해당 creation /
  last-state-change 값을 RFC3339 UTC로 반환하도록 수정했다. explicit
  offset 회귀는 수정 전 실패하고 site-admin 계약 48/48이 통과했다
  (`cargo-test-2026-09-19T023853-914Z.log`,
  `cargo-test-2026-09-19T023950-008Z.log`). 실제 API/UI가 같은 49분을
  표시하는 근거는 `site-user-utc-timestamp-after.json`이다.
- 별개로 original `MomentUtil.momentFromNow`의 boxed Java Long을 Nashorn
  `moment`에 전달하면 같은 epoch가 다른 instant로 변환되어 12시간 전으로
  표시되는 legacy bug를 정확한 `Invocable.invokeFunction` 호출로 재현했다.
  `legacy-moment-boxed-long-evidence.json`에 기록했으며 이 오차는 복제하지
  않는다. 24시간 이후 full local date/time인 `JodaDateUtil.socialDate`의
  표시 계약은 별도로 복원·검증한다.
- 실제 화면에서 issue input focus의 달력 미열림은 React-owned Pikaday 회귀로
  복원되었다. `project-issue-detail-3.e2e.ts` **33/33**이 input focus에서
  calendar 표시, ArrowDown day focus, Escape dismissal, date selection,
  blur-driven update, invalid-date handling을 통과했다. `branch-keyboard`
  선택도 동일하게 복원되어 plugin 내부 차이로 면제하지 않는다.

2026-09-20 integrated UI repair evidence (not final parity closure):

- Legacy-rooted route repairs covered the residual issue/comment action spacing, project milestone/board/post/search floats, PR/code branch labels and edit-form order, site-admin rows/forms, user edit/signup controls, and site-list pagination. Source evidence was read from the matching `yona-original/app/views/**` templates and frozen LESS/CSS; plugin-only Select2/markdown backing nodes were not converted into DOM exemptions.
- The final focused browser batch covered 11 affected specs with **59 passed / 0 failed** after the route repairs. The exact command and launcher output are retained in the session artifact for this candidate. The responsive fork contract was promoted to the Chrome lane because it uses `page.setContent`; the generated manifest is 183 DOM / 661 Chrome specs, and classifier/runner regression contracts pass.
- Frontend unit/DOM contracts pass at **190 files / 263 tests**; TypeScript check and production build pass. Full Rust workspace and the existing Node differential/harness contracts remain separate gates; the latest Node differential suite is **188 passed / 0 failed / 0 skipped**.
- Native browser evidence for `/sites/issueList` and `/sites/postList` at 1366×900 and 390×900 compares row text, localized timestamp titles, image load state, pager/footer link geometry, and header resting colors. Row geometry differs by at most 0.015625px; integrated pager/footer link geometry is equal in the measured selectors. Machine-readable evidence: `.agent/replacement-execution/site-list-native-comparison.json` and `.agent/replacement-execution/footer-pager-header-comparison.json`.
- The preceding fresh sweep `.agent/replacement-execution/post-layout/report.json` was captured before these route repairs and contained 53 UNVERIFIED DOM findings, 13 dispositioned implementation differences, and 5 legacy-bug dispositions with zero infrastructure/step errors. It is historical evidence only; a same-candidate sweep is still required before A4 closure.
- Same-candidate sweep `sweep-mu96rjmw` (`.agent/replacement-execution/final-source2/report.json`) completed all 117 scenarios with zero infrastructure errors and zero step errors. It reports **48 UNVERIFIED**, 8 implementation differences, and 5 legacy-bug dispositions (61 total findings); the new-milestone action-row repair reduced one residual, but A4 remains open. No blanket DOM exemption was added.
- The full current Chrome WTR gate ran 661 files and ended **2,520 passed / 155 failed / 8 skipped**; it is failure evidence, not a pass. The focused repaired-scope batch remains green at 59/59; the full failures include stale source/DOM fingerprint contracts and remaining screen gaps that require separate triage.
- Full Rust workspace passed in `.agent/cargo-test-logs/cargo-test-2026-09-20T013222-658Z.log`; existing differential/harness Node contracts passed 188/188. Full WTR failures remain an A5/A4 blocker and require triage before final parity approval.
- After `sweep-mu96rjmw`, the commits branch trigger lost a non-legacy CSS hook in favor of the stable owner selector, while retaining the measured 220px/218px geometry; `project-code-history.e2e.ts` and the commits residual spec pass. The new-milestone action row retains `actrow right-txt` and its focused spec passes. The full sweep counts above intentionally remain the last complete sweep artifact and were not retroactively changed by these later focused-only repairs.
- Focused post-detail follow-up removed stale `ml10`, `pt5px`, `ml6`, and `pull-left` utility tokens from React-owned board-post action wrappers; existing owner selectors in `frontend/src/app.css` retain the legacy geometry. Serial verification of `project-posts.e2e.ts`, `ownership-project-post-detail.e2e.ts`, `ownership-project-post-detail-disabled-comment-actions-mt10.e2e.ts`, and `ownership-project-post-detail-markdown-editor-mt10.e2e.ts` passed **53/53**. This is focused evidence only; it does not revise the full WTR/sweep verdict.
- Commit-history follow-up gives the React-owned branch trigger a stable `project-commits-branch-choice` owner and legacy Select2 border-box width/text alignment; the existing 220px container now renders the 218px trigger expected by the frozen cascade. Serial verification of `project-code-commit-detail.e2e.ts`, `ownership-project-commits-inline-residual.e2e.ts`, and `ownership-project-code-file-comment-count.e2e.ts` passed **41/41**. Existing 404 fixture requests remain non-blocking asset evidence.
- Serial pull-request changes follow-up (`project-pullrequest-changes.e2e.ts`, `ownership-project-pull-request-changes-review-editor-mt10.e2e.ts`, `ownership-project-pull-request-changes-codediff-mt10.e2e.ts`) passed **28/28** after the selected-commit identity work; build warnings and fixture 404s remain non-blocking known harness noise. No new route correction was required, and the full WTR/sweep verdict remains unchanged.
- Code-branch keyboard follow-up (`project-code-view-folder.e2e.ts`) passed
  **10/10** serially, including open/focus, highlight movement, empty-result
  Enter retention, Escape close, and slash-branch navigation to `feature/ui`.
- Issue-detail calendar follow-up (`project-issue-detail-3.e2e.ts`) passed
  **33/33**, including focus-open, keyboard day focus, Escape dismissal,
  selection, blur mutation, and invalid-date retention. These focused proofs do
  not revise the full WTR/sweep verdict.
- Fresh impacted-scenario sweep `sweep-mu9b11wr` (`.agent/replacement-execution/sweep-2026-09-20-current/report.json`) ran 18 scenarios / 68 behaviors with zero infrastructure errors and zero step errors. It recorded **25 UNVERIFIED** DOM findings and 2 existing implementation differences, with zero `REAL_OBSERVABLE_MISMATCH` findings in the selected slice. The remaining UNVERIFIED entries are stale/full-fingerprint differences across the repaired issue, Markdown-help, milestone, post, search, login, notification, and code shells; focused route contracts remain the bounded evidence and no blanket DOM exemption was added.
- Serial project-directory verification of `projects-list.e2e.ts` passed **9/9** with legacy timestamp boundaries, responsive row geometry, filter focus, tab/link behavior, labels, pagination, and empty-state coverage. No route repair was required; existing `projects.tsx` output and StyleX ownership matched the focused contract. Build completed with only existing legacy CSS/asset warnings and fixture 404s.

### A5. 배포물·복구·최종 인수

- 실제 배포물에서 Git clone/fetch/push 및 권한 거부, SVN checkout/update/commit과 필요한 lock 동작 확인. 의존 실행파일 부재로 건너뛴 테스트를 성공 증거로 사용하지 않는다.
- 사용할 SMTP/LDAP/OAuth/webhook/mailbox 환경의 실제 연결·전달을 확인한다. fixture/catch-box의 범위는 구분한다.
- 새 시스템 DB·저장소·uploads backup → 별도 위치 restore → restart 후 데이터·권한·기능 보존을 확인한다.
- 같은 candidate에서 기존 Rust/frontend/build/WTR/differential 및 기존 운영 gate 중 승인 범위에 맞는 검증을 수행한다. legacy transport identity만 확인하는 검증은 대응 기능 검증으로 바꾸며 기능 자체를 면제하지 않는다.
- 실행 기록에 source SHA, fixture, 환경, skip과 판정 근거를 남긴다. 과거 313/315 같은 inventory 비율은 제품 완성률이 아니다.

완료: legacy user-visible gap 0, 미판정 0, 필요한 행위 미검증 0, 기존 gate와 human acceptance 통과. 이 저장소에서 release/RC를 생성하지 않고 승인 후 새 canonical repository에서 최초 release한다.

실행 기록 — 최종 인수와 구분:

- 후속 보정 전 Rust workspace 전체 테스트 통과:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T181156-200Z.log`.
  frontend type check, Vitest 195 files / 269 tests, focused WTR 31 specs /
  286 passed / 0 failed / 8 skipped를 확인했다. 8 skips는
  `project-issues-real-instance-parity.e2e.ts`의 admin/WYVE_OCS live mirror
  부재이며, 통과로 집계하지 않는다. 이후 수정의 최종 gate는 다시 실행한다.
- 후속 통합 Rust workspace도 통과했다:
  `.agent/cargo-test-logs/cargo-test-2026-09-18T214953-137Z.log`
  (366.6초). 기존 differential/legacy launcher Node 회귀는 203 passed,
  0 failed, 0 skipped다.
- 후속 최종 frontend check와 Vitest 191 files / 265 tests가 통과했다.
  영향을 받는 WTR 125 files는 787 passed / 0 failed / 8 skipped다.
  `WTR_SKIP_BUILD=1` 실행에서 launcher가 현재 dist fingerprint를 확인했다.
  8 skips는 위 live mirror 부재이며 성공으로 집계하지 않는다. 이전 실패
  실행과 중단한 sweep은 이 통과 결과로 소급 변경하지 않는다.
  전체 legacy differential 결과와 이후 수정 상태는 A4 실행 기록을 따른다.
- 실제 release 실행파일 SHA-256
  `53586fa6c85e2d6d15f2a628941d2eaa2b3c52269042374681cbac44ddd3ef92`로
  복구 DB `yoram_restored`와 별도 data 디렉터리를 부팅했다.
  `.agent/replacement-execution/packaged-native-client-evidence.json`에 실제
  Git clone/push/독립 fetch, public read, private read 및 비회원 push 거부를
  기록했다. fixture push SHA는
  `5df6bb5243e45f8e5aec75e565536bf64461ef5e`이며 이 저장소의 source commit이 아니다.
- 실제 SVN client로 checkout/update/lock, `--no-unlock` commit의 token 유지,
  token 없는 두 번째 working copy의 E160024 거부, 기본 commit의 lock 해제와
  명시적 unlock을 확인했다. owner `kris`와 multiline comment를 구분해 보존했고
  repository UUID는 유지됐다. 실제 비회원 `laura`의 public read는 허용하고
  write는 E175013으로 거부했다. fixture 최종 revision은 8이다.
- SQL backup 73,588 bytes와 파일 92개의 경로·내용 hash·permission을 별도
  복구 위치에서 대조했다. restart 뒤 기존 SHA 비밀번호로 `kris` 로그인,
  수정된 issue/comment 및 PR review 유지, `/files/6002` 69-byte 첨부
  다운로드와 hash, Git/SVN 권한을 확인했다.
  `.agent/replacement-execution/backup-restore-evidence.json`과 해당 파일의
  실제 화면 screenshot 경로를 근거로 한다.
- 후속 shared UI/import 보정 이전 embedded release 바이너리 SHA-256
  `b722810bad918e50dc7b208193a5ddfcee21926629f8dffb5563054cff7b018c`로
  같은 복구 DB·data를 재시작했다. 새 clone/commit/push/독립 fetch와
  Git 권한 거부, SVN checkout/update·lock token·두 번째 working copy의
  거부·기본/명시적 unlock·비회원 거부·member 추가/삭제를 다시 확인했다.
  최종 fixture commit은 `f667f111350cd329e3535d65584708a0d313998f`,
  SVN revision은 12다. `.agent/replacement-execution/final-packaged-native-client-evidence.json`
  참조. fixture 이력이며 source commit 또는 repository release가 아니다.
- 같은 이전 바이너리에서 기존 비밀번호 로그인, 복구된 issue 제목·수정
  comment, PR review 본문을 실제 Chrome으로 확인했다. 첨부 `/files/6002`는
  HTTP 200 / 69 bytes / SHA-256
  `a3d98c9e138319971a8602070b822d78aa2778cfab1f8ebcfe264632250d56fe`로
  기존 backup 증거와 일치한다.
  `.agent/replacement-execution/final-restored-ui-evidence.json`과 두
  `final-restored-*.png` screenshot을 근거로 한다.
- 실제 외부 SMTP/LDAP/OAuth/webhook/mailbox credential·endpoint 및 human
  acceptance는 제공되지 않았다. local contract와 catch-box 증거로 대체하지 않는다.

## 병렬 실행과 검증 방식

A1을 최우선으로 수행한다. 이후 A2의 독립 기능, A3 이전, A4 UI는 명시적 파일 소유 범위로 병렬 실행할 수 있다. 공유 notification/attachment 경계의 수정은 통합 담당자를 지정하고 충돌하는 부분만 직렬화한다. worker는 전체 build/lint/test를 중복 실행하지 않으며 main이 통합 뒤 검증한다. 변경 중에는 해당 focused 회귀·실제 동작 smoke를 사용하고 최종 전체 gate는 통합 후보에서 수행한다.

## Track B — 소규모 SI 프로젝트의 API 병합

Status: 기본 정책 승인; 상세 범위 확정 전 구현 착수 보류. Track A의 완료 blocker가 아니다.

목적은 파견 중 작은 독립 프로젝트에서 작성한 작업을 복귀 후 기존 사내 프로젝트에 합치는 것이다. 구 legacy endpoint 복제가 아니라 CLI의 source reader와 새 시스템의 지원 API로 수행한다.

### 승인된 기본 정책

- 기존 대상 데이터를 덮어쓰지 않는다.
- 사용자 매핑은 명시적으로 수행하고 원본 작성자 정보를 보존한다. 대상 membership/권한을 자동 확대하지 않는다.
- 대상 번호를 새로 부여하고 가져온 항목 사이의 내부 참조를 재연결한다.
- 동일 원본의 재실행은 중복 생성하지 않는다. 양방향 동기화와 양쪽 수정의 자동 병합은 하지 않는다.

### 상세 계획 전에 결정할 항목

1. 이슈·게시글·댓글·첨부·라벨·마일스톤의 정확한 포함 범위 및 필수 메타데이터.
2. Git/SVN 이력·PR·리뷰 포함 여부와 서로 다른 저장소를 기존 프로젝트에 합치는 의미. 미결정을 암묵적 제외로 바꾸지 않는다.
3. 매핑되지 않는 퇴사자/외부 사용자 처리, 동명 라벨·마일스톤의 병합/분리 규칙.
4. 첫 가져오기 뒤 원본이 바뀐 경우 재실행을 추가분 가져오기로 볼지, 충돌 보고 후 중단할지. 중복 방지 승인만으로 자동 덮어쓰기까지 승인된 것은 아니다.

결정이 필요한 시점에 실제 source/target 예시와 추천안을 제시한다. 승인된 정책을 다시 묻지 않는다. 상세 결정 후 별도 구현 계획에 API pagination·파일 전송·원본 식별·오류/재시도 및 충돌 반례를 기록한다.

완료 기준의 공통 부분: 기존 대상 데이터와 권한이 보존되고, 승인된 범위의 원본 객체·첨부·참조가 옮겨지며, 동일 입력 재실행에서 중복이 생기지 않는다. 부분 실패를 전체 성공으로 표시하지 않는다.
