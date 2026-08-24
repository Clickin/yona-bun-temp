# Yoram Parity Gap Inventory — Agent-Readable Baseline

> **Status: superseded (2026-08-24)** — this inventory is a historical
> baseline at commit `13ec0e7b2d1e5a1771d82037b2ddf2af8c28f25a`, not an active
> implementation queue. Its claimed missing Code Browser tags, blame, compare,
> archive, and diff features were implemented later; current evidence is in
> `docs/provenance/core-parity-audit.md` and the current route/test sources.
> Do not use the historical reset command below.
>
> **Historical baseline commit**: `13ec0e7b2d1e5a1771d82037b2ddf2af8c28f25a`
> **Historical branch**: `main`
>
> **검증 방법**: 이 문서는 당시 baseline의 기록이며 현재 구현 상태의 source
> of truth가 아니다. 현재 구현은 코드와 canonical provenance에서 확인한다.

---

## 0. 검증 결과 요약

| 영역 | 문서 주장 | 실제 구현 | 일치? |
|------|----------|-----------|-------|
| 인증 (Auth) | ✅ Phase 1 완료 | 1887줄, 28개 함수, bcrypt/CSRF/OAuth/LDAP/email verify | ✅ |
| 이슈 CRUD | ✅ Phase 2 완료 | 4731줄, full CRUD + labels + milestones + mass update | ✅ |
| PR/Review | ✅ Phase 4 완료 | 3185줄, 31개 REST endpoint | ✅ |
| Smart HTTP Git | ✅ 구현 | 830줄 git http-backend wrapper, 10개 integration tests | ✅ |
| Search | ✅ 구현 | 277줄 route + 1346줄 persistence (FTS5/PG/MySQL), 3694줄 test | ✅ |
| Board (Posting) | ✅ 구현 | 85.7KB boards.rs, CRUD + comments + watch | ✅ |
| Admin | ✅ Phase 6 | 5597줄 handler, full user/project/issue/mail/data | ✅ |
| Notifications | ✅ 구현 | 837줄 mail engine, SMTP (lettre), mail queue, BCC | ✅ |
| Webhook | ✅ 구현 | 30.4KB webhooks.rs, delivery, DETAIL_SLACK, retry | ✅ |
| SVN/WebDAV | ✅ 구현 | 26개 protocol files, 42개 smoke tests | ✅ |
| i18n | ✅ 구현 | YONA_LANGS, legacy messages.js, dynamic switching | ✅ |
| Settings | ✅ 구현 | yoram.toml + YONA_* env vars, legacy key mapping | ✅ |
| DB adopt | ✅ 구현 | adopt/validate_only/up, MariaDB dump smoke | ✅ |
| Markdown | ✅ 구현 | marked-style + Highlight.js, 100+ language edges | ✅ |
| Code Browser | ⚠️ "기본" | **Blob/tree/history/diff/branches/archive/compare REAL** | ⚠️ **Tags, Blame, Syntax HL 미구현** |

**프로젝트 총 규모**: 174,049줄 Rust + 114,914줄 TypeScript/TSX, Zero `todo!()`

---

## 1. GAP: 미구현 영역 (에이전트 작업 대상)

### 1.1 Code Browser Tags

**영향**: legacy Yona는 `/code/$branch`에서 브랜치와 태그를 모두 표시하고, 태그별로 파일을 볼 수 있다.
yoram은 브랜치만 지원한다.

**현재 코드 위치**:
- `crates/server/src/routes/code.rs` — `rest_read_code_branches`는 `git branch --list`만 호출
- `frontend/src/routes/$ownerName/$projectName/branches.tsx` — 브랜치만 표시

**필요한 구현**:
1. 태그 목록 REST endpoint: `GET /api/v1/owners/:owner/projects/:project/tags` (또는 code endpoint에 `tag` type 추가)
2. 태그 생성/삭제 endpoint: `POST/DELETE /api/v1/.../tags`
3. 태그로 code browsing 지원 (현재 branch만 path parameter로 가능)
4. 프론트엔드 tags 탭 추가

**참고**: `yona-original/conf/routes`에서 `GET /:owner/:project/code/:branch/*`가 태그도 지원하는지 확인 필요.
`git tag --list` CLI wrapper는 `crates/vcs/src/lib.rs`에 구현 가능.

**우선순위**: Medium

---

### 1.2 Code Browser Blame/Annotation

**영향**: legacy Yona는 코드 파일에서 `git blame` 결과를 보여준다. yoram에 없음.

**현재 코드 위치**:
- `crates/server/src/routes/code.rs` — blame endpoint 없음

**필요한 구현**:
1. `GET /api/v1/.../code/:branch/blame/:filepath` endpoint
2. `git blame -w` CLI wrapper + line-by-line 파싱
3. 프론트엔드 blame view (기존 `code/$branch/$filePath.tsx`에 toggle 버튼 추가)

**참고**: `crates/vcs/src/lib.rs` (4129줄) — 기존 git CLI wrapper 패턴 참고.

**우선순위**: Low

---

### 1.3 Code Browser Syntax Highlighting

**영향**: legacy Yona는 서버사이드에서 Highlight.js로 syntax highlighting을 적용한 HTML을 내려준다.
yoram은 `RestCodeFile.html` 필드가 항상 비어있다. Highlight.js는 프론트엔드에서 JS로 처리해야 한다.

**현재 코드 위치**:
- `crates/server/src/routes/code.rs` — `html` field가 항상 `""`로 설정됨
- `frontend/src/routes/$ownerName/$projectName/code/$branch/$filePath.tsx` — 클라이언트렌더링

**선택지**:
1. **프론트엔드 JS 접근**: 이미 frontend에 Highlight.js가 포함되어 있을 가능성. 확인 후 코드 보기에서만 JS syntax highlighting 활성화.
2. **서버사이드 HTML**: `crates/server/src/markdown/` 패턴 참고하여 서버에서 Highlight.js를 실행.

**참고**: `frontend/src/routes/.../code/.../$.tsx`와 `$filePath.tsx`에서 렌더링 로직 확인.

**우선순위**: Medium (프론트엔드 접근이면 Low)

---

### 1.4 Code Browser Find-file/Search-in-file

**영향**: legacy Yona는 코드 브라우저에서 파일명 검색과 파일 내 검색을 지원한다.

**필요한 구현**:
1. `GET /api/v1/.../code/:branch/find?q=filename` — `git ls-tree -r HEAD | grep` wrapper
2. `GET /api/v1/.../code/:branch/grep?q=pattern` — `git grep` wrapper
3. 프론트엔드 검색 UI

**참고**: 기존 `crates/server/src/routes/code.rs`의 `git ls-tree` 호출 패턴 참고.

**우선순위**: Low

---

### 1.5 Code Browser Three-dot Compare

**영향**: legacy Yona는 `revA...revB` (three-dot, merge-base 기준) 비교를 지원한다.
yoram은 `revA..revB` (two-dot)만 지원.

**현재 코드 위치**:
- `crates/server/src/routes/code.rs` — `rest_read_code_compare`에서 `..` split만 처리
- `frontend/src/routes/$ownerName/$projectName/compare/$revisionRange.tsx` — two-dot만

**필요한 구현**:
1. `...` split 처리: `git diff $(git merge-base revA revB) revB` 실행
2. URL 파싱 수정 (`..` vs `...` 구분)
3. 프론트엔드 UI에서 three-dot 표시

**참고**: `crates/vcs/src/lib.rs`에 `git diff` wrapper 함수 추가.

**우선순위**: Low

---

### 1.6 Code Browser File Permalink by Commit Hash

**영향**: legacy Yona는 특정 커밋 해시로 파일 permalink를 지원한다.
yoram은 모든 코드 URL이 브랜치명을 사용한다.

**필요한 구현**:
1. `GET /:owner/:project/code/:commitHash/*` 경로에서 commit hash 감지
2. `git show $commitHash:$filepath`로 파일 내용 조회
3. UI에 permalink 버튼 추가

**참고**: `crates/server/src/routes/code.rs` — `rest_read_code_file` 핸들러 수정.

**우선순위**: Low

---

### 1.7 Code Browser Archive Format (tar.gz)

**영향**: legacy Yona는 ZIP과 tar.gz을 모두 지원한다. yoram은 ZIP만.

**현재 코드 위치**:
- `crates/server/src/routes/code.rs` — `rest_read_code_archive`에서 `git archive --format=zip`만 호출

**필요한 구현**:
1. URL query parameter로 `?format=tar.gz` 지원
2. `git archive --format=tar.gz` 실행 (또는 `--format=tar | gzip`)
3. `Content-Type: application/gzip` 헤더

**참고**: `crates/vcs/src/lib.rs` — CLI wrapper 추가.

**우선순위**: Low

---

### 1.8 Code Browser Diff Stat

**영향**: legacy Yona는 commit detail에서 files changed, insertions, deletions를 표시한다.
yoram의 commit detail 응답에 이 정보가 없다.

**현재 코드 위치**:
- `crates/server/src/routes/code.rs` — `rest_read_commit_detail` 응답에 diff stat 필드 없음
- `api_types.rs` — `RestCommitDetail` 타입 확인

**필요한 구현**:
1. `git diff --stat` 또는 `git show --stat` 파싱
2. `RestCommitDetail`에 `files_changed`, `insertions`, `deletions` 필드 추가
3. 프론트엔드 commit detail에 표시

**참고**: `crates/server/src/api_types.rs`에서 API 타입 정의.

**우선순위**: Low

---

### 1.9 Code Browser Individual File Diff

**영향**: legacy Yona는 commit detail에서 개별 파일 diff를 볼 수 있다.
yoram은 commit 전체 unified diff만 제공한다.

**필요한 구현**:
1. `GET /:owner/:project/commit/:commitId/:filepath` endpoint
2. `git show $commitId -- $filepath` CLI wrapper
3. 프론트엔드 파일별 diff 탭

**참고**: `crates/server/src/routes/code.rs` — `rest_read_commit_detail` 참고.

**우선순위**: Low

---

### 1.10 Admin Bulk Operations

**영향**: legacy Yona admin은 사용자/프로젝트 일괄 삭제 등을 지원한다.
yoram은 모든 admin 작업이 단일 단위.

**현재 코드 위치**:
- `crates/server/src/routes/site_admin.rs` — 모든 handler가 single-item operation

**필요한 구현**:
1. `POST /api/v1/site/users/bulk-delete` — `ids: number[]` 받아서 벌크 삭제
2. `POST /api/v1/site/projects/bulk-delete`
3. 프론트엔드 체크박스 + 일괄 작업 UI

**참고**: `crates/persistence/src/repo/site_admin.rs` — bulk variant 추가.

**우선순위**: Low

---

### 1.11 Admin Audit Log

**영향**: legacy Yona에 audit log가 있었는지 확인 필요. 명시적 구현이 없음.

**참고**: `yona-original/`에서 audit log 관련 controller 확인.

**우선순위**: Very Low (확인 후 결정)

---

### 1.12 Tags Support (Beyond Code Browser)

**영향**: legacy Yona는 프로젝트 태그(release tag)를 관리한다.
yoram은 태그 CRUD가 전혀 없다.

**필요한 구현**:
1. 태그 CRUD REST API
2. 태그 목록/상세 프론트엔드
3. Release note와 연동

**우선순위**: Medium

---

## 2. 의도적 Deviation (변경 불필요)

| 영역 | legacy | yoram | 사유 |
|------|--------|-------|------|
| 제품명 | Yona | Yoram | 명시적 리브랜딩 |
| 아키텍처 | Play SSR + jQuery | React SPA + Rust Axum | 기술 스택 변경 |
| OAuth provider | GitHub/Google만 | GitHub/Google만 | 다른 provider 미지원 시 login form으로 redirect |
| 외부 검색엔진 | 없음 | 없음 | DB-native FTS로 충분 |
| Webhook HMAC | 없음 | 없음 | legacy에 없음 |
| GitHub outbound migration | `/migration` (disabled) | 미구현 | app-runtime scope 아님 |
| Kubernetes | 없음 | 없음 | SFX + Docker가 baseline |

---

## 3. 에이전트 작업 지침

### 3.1 작업 전 확인사항

1. 이 문서의 **Baseline commit** (`13ec0e7b2`)를 기준으로 `git log --oneline -5`로 현재 HEAD 확인
2. 작업 중 문제 발생 시 즉시 `git reset --hard 13ec0e7b2`로 복원
3. 각 작업 전 반드시 `AGENTS.md`, `SPEC.md`, `DESIGN.md`의 변환 원칙과 fixed decisions 확인
4. `yona-original/`에서 legacy 동작을 먼저 확인
5. `pnpm agent:cargo -- --outside-sandbox build`로 컴파일 확인
6. `pnpm agent:cargo-test -- --outside-sandbox`로 기존 테스트 통과 확인

### 3.2 작업 금지사항

- 기존 동작하는 기능을 "개선"하지 않음
- legacy에 없는 UI/UX/기능을 추가하지 않음
- `SPEC.md` Section 1의 fixed decisions 밖으로 새 패턴/추상화 도입 금지
- `reference/mixed-code/`를 parity 근거로 사용하지 않음
- 동결 CSS/LESS 밖의 새 수치로 parity diff 상쇄 금지

### 3.3 작업 후 검증

1. `pnpm agent:cargo -- --outside-sandbox build -p yoram-server` 컴파일
2. `pnpm agent:cargo-test -- --outside-sandbox -p yoram-server` 기존 테스트 통과
3. `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend build` 프론트엔드 빌드
4. `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test` 프론트엔드 테스트
5. `pnpm agent:turn-commit -- -m "<summary>"` 커밋

---

## 4. 우선순위 매트릭스

| 우선순위 | 항목 | 예상 작업량 | 영향 |
|---------|------|-----------|------|
| **P0** | (없음 — 모든 핵심 기능 구현됨) | - | - |
| **P1** | Code Browser Tags | 2-3일 | 태그로 코드 보기, 태그 관리 |
| **P1** | Code Browser Syntax Highlighting | 1-2일 | 코드 보기 가독성 |
| **P2** | Admin Bulk Operations | 1-2일 | 관리자 생산성 |
| **P2** | Tags CRUD (release) | 2-3일 | 릴리스 관리 |
| **P3** | Code Browser Blame | 1-2일 | 코드 추적 |
| **P3** | Code Browser Find-file | 1일 | 파일 검색 |
| **P3** | Three-dot Compare | 0.5일 | diff 정확성 |
| **P3** | File Permalink | 0.5일 | 공유 가능한 링크 |
| **P3** | Archive tar.gz | 0.5일 | 다운로드 형식 |
| **P3** | Diff Stat | 0.5일 | commit 요약 정보 |
| **P3** | Individual File Diff | 1일 | 파일별 diff |
| **P3** | Admin Audit Log | 검토 후 결정 | 감사 추적 |

---

## 5. 참고 파일 인덱스

### 핵심 route 파일
- `crates/server/src/routes/auth.rs` — 1887줄, 28개 handler
- `crates/server/src/routes/issues.rs` — 4731줄, 27개 handler
- `crates/server/src/routes/issues/comments.rs` — 420줄
- `crates/server/src/routes/issues/labels.rs` — 1020줄
- `crates/server/src/routes/issues/milestones.rs` — 170줄
- `crates/server/src/routes/issues/lookups.rs` — 600줄
- `crates/server/src/routes/pull_requests.rs` — 3185줄, 31개 endpoint
- `crates/server/src/routes/pull_requests/review_comments.rs` — 463줄
- `crates/server/src/routes/boards.rs` — 85.7KB
- `crates/server/src/routes/site_admin.rs` — 5597줄
- `crates/server/src/routes/code.rs` — 80.5KB
- `crates/server/src/routes/projects.rs` — 145.7KB
- `crates/server/src/routes/workspace.rs` — 87.7KB
- `crates/server/src/routes/notifications.rs` — 14KB
- `crates/server/src/routes/search.rs` — 9.3KB
- `crates/server/src/routes/files.rs` — 18.8KB
- `crates/server/src/notification_mail.rs` — 837줄

### VCS/Infra
- `crates/vcs/src/lib.rs` — 4129줄 (git/svn CLI wrapper)
- `crates/server/src/smart_http.rs` — 830줄
- `crates/server/src/svn_protocol/` — 26개 파일
- `crates/search/src/lib.rs` — snippet generation
- `crates/integrations/src/lib.rs` — 1544줄 (SMTP, webhook delivery)

### 영속성
- `crates/persistence/src/repo/` — 40개+ repository 파일
- `crates/persistence-entities/src/` — SeaORM entity 파일

### 프론트엔드
- `frontend/src/routes/` — 100개+ route 파일
- `frontend/src/api/` — typed API client + TanStack Query hooks

### 테스트
- `crates/server/tests/` — 30개+ integration test 파일
- `frontend/tests/` — 20개+ E2E test 파일
- `tests/` — 19개 contract test 파일

---

## 6. 코드 검증 메타데이터

| 검증 항목 | 결과 | 검증자 |
|----------|------|--------|
| 전체 `todo!()` 개수 | **0개** (전체 crate) | 직접 검증 |
| `StatusCode::NOT_IMPLEMENTED` 개수 | **0개** (route handler) | 직접 검증 |
| Auth routes | 28개 REAL handler | DangerousAntelope |
| Issue CRUD | 전부 REAL | ExpectedManatee |
| PR/Review | 31개 REAL endpoint | WillingDinosaur |
| Smart HTTP | 10개 integration tests 통과 | SuddenMeadowlark |
| Search | 3694줄 test, 3개 DB FTS | SuddenMeadowlark |
| Board | full CRUD + legacy compat | SuddenMeadowlark |
| Admin | 5597줄 handler | SuddenMeadowlark |
| Notifications | lettre SMTP, mail queue, BCC | PastBaboon |
| Webhook | delivery, DETAIL_SLACK, retry | PastBaboon |
| SVN/WebDAV | 26개 protocol files, 42 smoke tests | PastBaboon |
| i18n | YONA_LANGS, messages.js, dynamic switch | PastBaboon |
| Settings | yoram.toml + YONA_* env vars | PastBaboon |
| DB adopt | MariaDB dump smoke 통과 | PastBaboon |