# Yona Rust + React Migration SPEC — 기능 변환 명세서

Status: Canonical v3.2
Date: 2026-05-06
Language: Korean-first, English identifiers
Audience: Codex CLI 에이전트 및 개발자 — 이 문서는 외주 업무지시서 + 검수내역서를 대체한다

---

## 0. 이 문서의 성격과 구속력

### 0.1 문서 목적

이 문서는 legacy Java/Play Yona를 Rust(Axum) + React(TanStack Router) 스택으로 **기능 동등 변환**하기 위한 실행 명세서다.

- 에이전트(Codex CLI 포함)가 **무엇을 구현해야 하는지**, **무엇을 구현하면 안 되는지**, **어떤 기준으로 검수하는지**를 고정한다.
- 이 문서에 명시되지 않은 기능, UI, UX를 독자적으로 창조하는 것은 **금지**된다.
- 모호한 경우 legacy `yona-original/`의 동작을 따른다. legacy에도 없는 경우 구현하지 않는다.

### 0.2 변환 원칙 (최우선)

> **이 프로젝트는 기능 변환 프로젝트다. 새로운 구조를 제안하는 프로젝트가 아니다.**

1. **기능 동등성만이 목표다.** legacy Yona가 제공하는 동일한 기능을 동일한 UX로 구현한다.
2. **1:1 기술적 대응이 아니다.** Java/Play의 클래스를 Rust의 타입으로 대응시키는 것이 아니라, 사용자 관점에서 동일한 기능과 경험을 제공하는 것이 목표다.
3. **새로운 구조를 제안하지 않는다.** 기능 구현에 필요한 최소 구조만 사용한다.
4. **기존 UI/UX를 그대로 구현한다.** 화면, 레이블, 동선, 기능은 `yona-original/`을 기준으로 한다.
5. **에이전트의 역할은 구현이다.** 더 나은 구조를 설계하는 것이 아니라, 기존 기능을 새 스택으로 구현하는 것이다.

### 0.3 명시적 금지 사항 — MUST NOT

| 번호 | 금지 행위                                                                                   | 이유                     |
| ---- | ------------------------------------------------------------------------------------------- | ------------------------ |
| N-01 | legacy에 없는 UI 요소/화면/기능을 "개선"이라는 이름으로 추가                                | 기능 변환의 범위 초과    |
| N-02 | legacy의 레이블, 메뉴 구조, 버튼 텍스트, 동선을 임의 변경                                   | UX parity 위반           |
| N-03 | `SPEC.md` Section 1의 고정 결정 밖에서 새 패턴이나 추상화 도입                              | 구조 변환 범위 초과      |
| N-04 | legacy 외부 호환 REST API를 임의 확장하거나, legacy 기능 근거 없이 runtime RPC surface를 추가 | contract 범위 초과       |
| N-05 | 검색 결과 UI, 페이지네이션 방식, 정렬 기준 등을 legacy와 다르게 구현                        | UX parity 위반           |
| N-06 | 에러 메시지, 빈 상태 텍스트, placeholder 등을 legacy와 다르게 작성                          | copy parity 위반         |
| N-07 | legacy에서 사용하는 URL 경로 패턴을 변경 (예: `/issues` → `/tickets`)                       | deep-link parity 위반    |
| N-08 | 변환 범위를 벗어난 아키텍처 논의를 현재 작업에 끌어들이기                                   | scope creep              |
| N-09 | `reference/mixed-code/**` 코드를 canonical implementation처럼 취급                          | reference-only 원칙 위반 |
| N-10 | 현재 Phase에 속하지 않는 기능을 선행 구현                                                   | Phase gate 위반          |

### 0.4 권한과 근거 우선순위

문서 간 충돌을 피하기 위해 **권한 우선순위**와 **기능/UX 근거 우선순위**를 분리한다.

**권한 우선순위**:

| 순위 | 소스                      | 역할                                         |
| ---- | ------------------------- | -------------------------------------------- |
| 1    | `AGENTS.md`               | 에이전트 실행 규칙과 변환 원칙의 최상위 권한 |
| 2    | 이 문서 (`SPEC.md`)       | Rust pivot 이후 기술적 실행 명세             |
| 3    | `repo root` 현재 코드     | canonical implementation baseline            |
| 4    | `docs/agents/*.md`        | `AGENTS.md`와 `SPEC.md`의 실행 mirror        |
| 5    | `reference/mixed-code/**` | reference-only migration material            |

**기능/UX 근거 우선순위**:

| 순위 | 소스                      | 역할                                                          |
| ---- | ------------------------- | ------------------------------------------------------------- |
| 1    | `yona-original/`          | 기능/UX/copy/deep-link parity의 최상위 기준                   |
| 2    | 이 문서 (`SPEC.md`)       | legacy 근거를 Rust 구현으로 번역한 실행 명세                  |
| 3    | `docs/provenance/*`       | legacy source → Rust target 매핑, gap/deviation/deferred 근거 |
| 4    | `repo root` 현재 코드     | 현재 canonical implementation baseline                        |
| 5    | `reference/mixed-code/**` | pre-Rust pivot reference-only migration material              |

---

## 1. Fixed Decisions — 고정 결정

### 1.1 기술 스택

| 계층                       | 기술                                  | 결정 이유                                                                                  |
| -------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------ |
| Backend runtime            | Rust + Tokio                          | legacy 서버 기능을 single binary로 재구현하고 SFX 배포 기준선을 유지                       |
| HTTP framework             | Axum 0.8                              | HTTP/REST/static asset delivery를 같은 Rust runtime에서 단순하게 소유                      |
| Application API            | REST JSON under `/api/v1`             | legacy 기능을 URL/resource 단위로 추적하고 TanStack Query client에서 명시적으로 캐시/무효화 |
| ORM                        | SeaORM 1.1                            | legacy schema adopt와 MySQL/PostgreSQL/SQLite day-1 repository 테스트를 지원               |
| Frontend                   | React 19 SPA                          | legacy 화면을 file-route 기반 SPA로 변환하되 서버 렌더링 구조를 새로 도입하지 않음         |
| Routing                    | TanStack Router (file-based)          | `frontend/src/routes/**`를 route source로 고정해 legacy deep-link parity를 추적            |
| Build                      | Vite + `@vitejs/plugin-react`         | SPA build output을 Rust binary에 embed하는 현재 기준선과 맞춤                              |
| API typing                 | Typed frontend API client + schema/check tests | REST payload drift를 client wrapper, TypeScript checks, and focused contract tests로 차단 |
| Deployment                 | Single-file executable (SFX) + Docker | legacy 사용자가 실행파일 교체 + 설정 migration으로 PoC를 검증할 수 있게 함                 |

### 1.2 Workspace 구조

```text
repo root/
  Cargo.toml              # workspace manifest
  buf.yaml                # existing protobuf module manifest, historical schema snapshot
  buf.gen.yaml            # existing browser codegen manifest, historical schema snapshot
  frontend/               # React SPA
  proto/                  # REST pivot 이전 message schema snapshot, not runtime application API
  crates/
    server/               # runtime bootstrap, HTTP/REST, asset delivery, session/auth
    domain/               # domain behavior, ACL, invariant
    persistence/          # DB access, entities, repositories, dialect handling
    migration/            # schema, seed, migration
    vcs/                  # Git/SVN vertical slice owner
    search/               # search vertical slice owner
    integrations/         # notification/webhook/integration vertical slice owner
  yona-original/          # legacy Java/Play Yona (READ-ONLY 참조)
  reference/mixed-code/   # pre-Rust pivot Go/TS 코드 (REFERENCE-ONLY)
```

### 1.3 Frontend 규칙

- routing: `frontend/src/routes/**` file-based TanStack Router. `routeTree.gen.ts` auto-generated.
- static route table, manual route matcher, route-kind registry 재도입 금지.
- UI layout, copy, CTA, menu, deep-link flow는 `yona-original/` 기준.
- 상태 관리: React Context API (`AppRuntimeContext`).
- API 통신: REST JSON client + TanStack Query.
- `proto/`는 REST pivot 이전 message schema snapshot으로만 취급한다. runtime RPC registration과 frontend ConnectRPC client는 Phase -1에서 제거되었으며, 새 feature는 REST-first로 설계한다.

### 1.4 배포 기준선

- single-binary: Rust binary + embedded frontend dist (`include_dir`)
- Docker: 동일 binary + volume mount
- runtime base-path: `YONA_BASE_PATH` 환경변수로 first-class 지원
- embedded static assets vs user-uploaded files 분리
- 설정: 환경변수 + TOML 파일 (`yona.toml`)

### 1.5 설정 호환성 — Legacy application.conf 대응

legacy Yona 사용자가 기존 설정을 최소한의 변환으로 새 실행파일에서 사용할 수 있어야 한다.

| Legacy 설정 (application.conf)             | Rust 환경변수 / TOML                                | 비고                         |
| ------------------------------------------ | --------------------------------------------------- | ---------------------------- |
| `application.siteName`                     | `YONA_SITE_NAME`                                    |                              |
| `application.context`                      | `YONA_BASE_PATH`                                    |                              |
| `application.allowsAnonymousAccess`        | `YONA_ALLOW_ANONYMOUS_ACCESS`                       |                              |
| `application.guest.user.login.id.prefix`   | `YONA_GUEST_LOGIN_PREFIX`                           |                              |
| `application.use.email.verification`       | `YONA_AUTH_EMAIL_VERIFICATION_ENABLED`              |                              |
| `signup.require.admin.confirm`             | `YONA_AUTH_SIGNUP_REQUIRE_CONFIRM`                  |                              |
| `application.use.social.login.only`        | `YONA_AUTH_SOCIAL_LOGIN_ONLY`                       |                              |
| `application.show.user.email`              | `YONA_SHOW_USER_EMAIL`                              |                              |
| `application.allowed.sending.mail.domains` | `YONA_ALLOWED_MAIL_DOMAINS`                         |                              |
| `db.default.url`                           | `YONA_DATABASE_URL`                                 | jdbc URL → standard URL 변환 |
| `smtp.host` / `smtp.port` / `smtp.ssl`     | `YONA_SMTP_HOST`, `YONA_SMTP_PORT`, `YONA_SMTP_SSL` |                              |
| `smtp.user` / `smtp.password`              | `YONA_SMTP_USER`, `YONA_SMTP_PASSWORD`              |                              |
| `notification.bymail.enabled`              | `YONA_NOTIFICATION_MAIL_ENABLED`                    |                              |
| `application.notification.bymail.interval` | `YONA_NOTIFICATION_MAIL_INTERVAL`                   |                              |
| `application.maxFileSize`                  | `YONA_MAX_FILE_SIZE`                                |                              |
| `project.default.scope.when.create`        | `YONA_PROJECT_DEFAULT_SCOPE`                        | public/protected/private     |
| `project.creation.default.menus`           | `YONA_PROJECT_DEFAULT_MENUS`                        | issue, milestone, board 등   |
| `application.langs`                        | `YONA_LANGS`                                        | i18n 지원 언어 목록          |

**검수 기준**: legacy `application.conf.default`의 모든 핵심 설정 키에 대응하는 환경변수 또는 TOML 키가 존재하고, 설정 migration 가이드 문서가 제공되어야 한다.

Deferred 기능의 설정 키는 1차 PoC에서 **설정 호환성**과 **기능 동작**을 분리한다.

- `YONA_AUTH_SOCIAL_LOGIN_ONLY`: 설정은 파싱하고 auth UI capability에 반영한다. Social-login-only UI gating은 수행할 수 있지만, OAuth provider 로그인 플로우는 deferred다. provider가 없거나 미지원이면 조용히 무시하지 말고 warning/unsupported state를 노출한다.
- `YONA_LANGS`: 설정은 파싱하고 보존한다. 1차 PoC에서는 legacy copy parity를 우선하며 동적 i18n runtime 전환은 deferred다.
- deferred 기능과 연결된 설정은 명시된 no-op/fallback/warning 동작 없이 조용히 무시하면 안 된다.

---

## 2. 누락 기능 기록 규칙

모든 기능 누락은 다음 세 계층에 동시에 기록한다.

| 계층           | 위치                                | 기록 내용                                        |
| -------------- | ----------------------------------- | ------------------------------------------------ |
| root canonical | 이 문서의 해당 Feature Group 테이블 | `status` 컬럼에 `deferred` / `gap` / `deviation` |
| provenance     | `docs/provenance/`                  | legacy source → Rust target 매핑과 gap 사유      |
| plan           | `docs/agents/06-phase-plan.md`      | follow-up item으로 기록                          |

**용어 정의**:

- `deferred`: 현재 우선순위 밖이라 의도적으로 뒤로 미룸 (Phase 2차 이후)
- `gap`: legacy 대비 아직 구현되지 않음 (구현 예정이나 미착수)
- `deviation`: 의도적으로 다른 의미나 UX를 채택함 (사유 필수 기재)

`deviation` 기록은 최소한 legacy 동작, Rust 동작, 사용자 영향, 허용 사유, provenance 문서 위치를 포함해야 한다. URL deviation은 legacy route, Rust route, redirect/alias 여부를 함께 기록한다.

---

## 3. Phase 정의와 범위

### 3.1 Phase 계획

| Phase   | 범위                                                 | 목표                                          |
| ------- | ---------------------------------------------------- | --------------------------------------------- |
| Phase -1 | refactor temp development: 기존 임시 구현을 REST pivot SPEC에 맞춰 재기준화 | ✅ **완료**                                   |
| Phase 0  | Rust workspace promotion, 문서 정리, provenance 갱신                         | ✅ **완료**                                   |
| Phase 1  | 인증, Workspace, 조직, 프로젝트                                                | ✅ **완료**                                   |
| Phase 2  | 이슈, 댓글, 첨부, 라벨, 마일스톤                                               | 🔶 부분 구현                                  |
| Phase 3  | 저장소 브라우저, Smart HTTP, 커밋 토론, VCS                                    | 🔶 Phase 3A 구현                              |
| Phase 4 | Pull Request, 코드 리뷰                              | 후속                                          |
| Phase 5 | 검색, 게시판, 알림, 연동(Webhook)                    | 후속                                          |
| Phase 6 | 관리자, 마이그레이션 도구, 배포 하드닝               | 후속                                          |

### 3.2 1차 PoC 완료 기준

**1차 PoC란**: Phase 2~6까지 완료하여 Git 이슈 관리 + 게시판 기준으로 모든 기능이 정상 동작하고, legacy Yona 사용자가 실행파일 교체 + 설정 migration만으로 즉시 사용 가능한 수준.

구체적으로:

- 기존 DB 스키마를 `adopt` 모드로 인식하여 기존 데이터 유지
- 사용자 로그인/회원가입이 기존과 동일하게 동작
- 프로젝트/조직 CRUD가 기존과 동일하게 동작
- 이슈 CRUD + 댓글 + 라벨 + 마일스톤 + 담당자가 기존과 동일하게 동작
- 게시판(Board/Posting) CRUD + 댓글이 기존과 동일하게 동작
- Git 저장소 브라우저 + push/pull이 동작
- Pull Request + 코드 리뷰 기본 흐름이 동작
- 검색이 legacy와 동일한 범위로 동작
- 알림이 이메일 기반으로 동작
- 관리자 화면 기본 기능이 동작

### 3.3 2차 개발 범위 (deferred)

다음은 1차 PoC 이후 별도 Phase로 진행한다:

| 항목                                     | 사유                                                   |
| ---------------------------------------- | ------------------------------------------------------ |
| SVN 프로토콜 지원                        | 공수 대비 사용률 낮음                                  |
| LDAP 연동                                | 인프라 의존성 복잡                                     |
| GitHub Import                            | 외부 API 의존                                          |
| Migration 도구 (Export CSV/Excel)        | 부가 기능                                              |
| Social Login (OAuth)                     | 외부 provider 연동 복잡                                |
| IMAP 메일박스 서비스                     | 부가 기능                                              |
| Slack 연동                               | 부가 기능                                              |
| WebDAV 지원                              | SVN과 연관된 부가 기능                                 |
| i18n (다국어)                            | 1차에서는 한국어/영어 hardcode 허용, 추후 i18next 도입 |
| Update notification (버전 업데이트 알림) | 배포 체계 변경 후 재설계 필요                          |

---

## 4. Feature Group 상세 명세

> 각 Feature Group은 legacy 동작 기준, 현재 구현 상태, 검수 기준을 포함한다.
> **에이전트는 각 Feature의 "검수 기준"을 반드시 충족해야 하며, legacy 참조 경로에서 실제 UI/UX를 확인한 후 구현해야 한다.**
>
> Feature 구현 전후로 다음 **Feature Parity Evidence**를 남겨야 한다:
> legacy route/controller/view/test 확인 결과, Rust route/API/contract 대응, UI parity evidence(스크린샷 또는 DOM/assertion), 추가/수정한 테스트 파일, 남은 gap/deviation/deferred 항목.

---

### FG-01: 인증 (Authentication)

**Legacy 참조**: `yona-original/app/controllers/UserApp.java`, `PasswordResetApp.java`, `app/views/user/login.scala.html`, `signup.scala.html`, `resetPassword.scala.html`

**Legacy 라우트**:

```
GET   /users/loginform          → 로그인 폼
POST  /users/login              → 로그인 처리
GET   /users/signupform         → 회원가입 폼
POST  /users/signup             → 회원가입 처리
GET   /lostPassword             → 비밀번호 찾기 폼
POST  /lostPassword             → 비밀번호 찾기 이메일 발송
GET   /resetPassword            → 비밀번호 재설정 폼
POST  /resetPassword            → 비밀번호 재설정 처리
GET   /verify/:loginId/:code    → 이메일 인증 확인
GET   /logout                   → 로그아웃
GET   /authenticate/:provider   → OAuth 시작
```

#### 기능 목록과 상태

| 기능                         | Legacy 동작                                                         | 현재 상태 | Phase |
| ---------------------------- | ------------------------------------------------------------------- | --------- | ----- |
| 로그인 (ID/Password)         | `UserApp.login()` → bcrypt 검증 → 세션 생성 → `redirectUrl`로 이동  | ✅ 구현   | 1     |
| 회원가입                     | `UserApp.newUser()` → ID/email 중복검사 → 생성 → 선택적 이메일 인증 | ✅ 구현   | 1     |
| 로그아웃                     | 세션 파기                                                           | ✅ 구현   | 1     |
| 비밀번호 찾기 (이메일 발송)  | verification code 생성 → 이메일 발송 → 토큰 링크                    | ✅ 구현   | 1     |
| 비밀번호 재설정              | 토큰 검증 → 새 비밀번호 설정                                        | ✅ 구현   | 1     |
| 이메일 인증                  | verification code 확인 → 사용자 활성화                              | ✅ 구현   | 1     |
| 관리자 가입 승인             | `signup.require.admin.confirm=true` 시 관리자가 승인                | gap       | 6     |
| Social Login (OAuth)         | GitHub, Google 등                                                   | deferred  | 2차   |
| LDAP 연동                    | LDAP 서버 인증                                                      | deferred  | 2차   |
| "Remember Me"                | 장기 세션 유지                                                      | gap       | 6     |
| 세션 만료                    | 설정 가능한 세션 타임아웃                                           | gap       | 6     |
| 게스트 사용자                | `application.guest.user.login.id.prefix`로 제한된 권한              | gap       | 2     |
| 익명 접근 제어               | `application.allowsAnonymousAccess` 설정                            | gap       | 2     |
| 로그인 폼 커스텀 placeholder | `application.login.page.loginId.placeholder`                        | gap       | 6     |

#### 검수 기준

- [ ] `/users/loginform` GET 시 로그인 폼이 legacy와 동일한 레이아웃으로 표시된다
- [ ] 로그인 성공 후 `redirectUrl` 파라미터가 있으면 해당 URL로 이동한다 (legacy 동작 동일)
- [ ] 로그인 실패 시 에러 메시지가 legacy와 동일하게 표시된다
- [ ] 회원가입 시 login ID, email 중복 검사가 동작한다
- [ ] `YONA_AUTH_EMAIL_VERIFICATION_ENABLED=true` 시 가입 후 이메일 인증 플로우가 작동한다
- [ ] 비밀번호 찾기 이메일이 legacy 포맷과 동일하게 발송된다
- [ ] `/verify/:loginId/:code` 경로가 인증 확인 후 성공/실패 화면을 보여준다
- [ ] CSRF 토큰이 모든 POST 요청에 포함된다

---

### FG-02: 사용자 Workspace (User Workspace & Settings)

**Legacy 참조**: `yona-original/app/controllers/UserApp.java`, `app/views/user/view.scala.html`, `edit.scala.html`, `edit_notifications.scala.html`, `edit_password.scala.html`, `edit_token.scala.html`, `edit_emails.scala.html`

**Legacy 라우트**:

```
GET   /:user                    → 사용자 프로필 (본인이면 Workspace)
GET   /user/editform            → 프로필 편집 폼
POST  /user/edit                → 프로필 수정
POST  /user/email               → 이메일 추가
DELETE /user/email/delete/:id   → 이메일 삭제
PUT   /user/email/setAsMain/:id → 주 이메일 설정
POST  /user/email/sendValidationEmail/:id → 이메일 인증 발송
GET   /user/email/confirm/:id/:token     → 이메일 인증 확인
POST  /user/resetPassword       → 비밀번호 변경
POST  /user/resetVisitedList    → 방문 기록 초기화
POST  /user/defultLoginPage     → 기본 랜딩 페이지 설정
GET   /notification             → 알림 목록
POST  /noti/toggle/:projectId/:notiType → 프로젝트별 알림 설정 토글
```

#### 기능 목록과 상태

| 기능                                        | Legacy 동작                                | 현재 상태    | Phase |
| ------------------------------------------- | ------------------------------------------ | ------------ | ----- |
| Workspace 대시보드                          | 이슈/PR/프로젝트 목록, 최근 방문, 즐겨찾기 | ✅ 구현      | 1     |
| 프로필 편집 (이름, 아바타)                  | 이름 변경, 아바타 업로드/크롭              | ✅ 구현      | 1     |
| 비밀번호 변경                               | 기존 비밀번호 확인 → 새 비밀번호 설정      | ✅ 구현      | 1     |
| 이메일 관리 (추가/삭제/인증/주 이메일 설정) | 복수 이메일, 인증 흐름                     | ✅ 구현      | 1     |
| API 토큰 관리                               | 토큰 재생성                                | ✅ 구현      | 1     |
| 기본 랜딩 페이지 설정                       | 로그인 후 이동할 기본 경로                 | ✅ 구현      | 1     |
| 방문 기록 초기화                            | 최근 방문 프로젝트 목록 리셋               | ✅ 구현      | 1     |
| 프로젝트별 알림 설정                        | 프로젝트별 NEW_ISSUE, NEW_POSTING 등 토글  | ✅ 기본 구현 | 1     |
| 사용자 프로필 공개 보기                     | `/:user` 경로로 다른 사용자 프로필 조회    | gap          | 2     |
| 사용자 활동 통계                            | `?daysAgo=N`으로 활동 내역                 | gap          | 5     |

#### 검수 기준

- [ ] `/me` 화면에서 Issues / Pull Requests / Projects 탭이 legacy와 동일 구조로 표시된다
- [ ] 프로필 편집에서 아바타 업로드 시 `/files` 엔드포인트로 멀티파트 업로드 후 크롭이 동작한다
- [ ] 복수 이메일 추가/삭제/인증/주 이메일 설정이 모두 동작한다
- [ ] 프로젝트별 알림 토글이 legacy의 `NEW_COMMENT` 기본 off 동작을 따른다
- [ ] API 토큰 재생성이 동작하고 새 토큰이 표시된다

---

### FG-03: 조직 (Organization)

**Legacy 참조**: `yona-original/app/controllers/OrganizationApp.java`, `EnrollOrganizationApp.java`, `app/views/organization/*.scala.html`

**Legacy 라우트**:

```
GET   /organizations/new                          → 조직 생성 폼
POST  /organizations/new                          → 조직 생성
GET   /organizations/:name                        → 조직 홈
GET   /organizations/:name/settingform            → 조직 설정 폼
POST  /organizations/:name/setting                → 조직 설정 저장
DELETE /organizations/:name                       → 조직 삭제
GET   /organizations/:name/members                → 멤버 목록
POST  /organizations/:name/members                → 멤버 추가
DELETE /organizations/:name/member/:userId/delete  → 멤버 삭제
PUT   /organizations/:name/member/:userId/role     → 멤버 역할 변경
POST  /organizations/:name/enroll                 → 가입 요청
DELETE /organizations/:name/enroll                → 가입 요청 취소
POST  /organizations/:name/members/accept/:userId → 가입 승인
GET   /organizations/:name/issues                 → 조직 이슈 목록
GET   /organizations/:name/boards                 → 조직 게시판 목록
GET   /organizations/:name/pullRequests           → 조직 PR 목록
GET   /organizations/:name/search                 → 조직 내 검색
```

#### 기능 목록과 상태

| 기능                         | Legacy 동작                      | 현재 상태               | Phase |
| ---------------------------- | -------------------------------- | ----------------------- | ----- |
| 조직 생성                    | 이름/설명, 이름 유효성 검사      | ✅ 구현                 | 1     |
| 조직 홈 (프로젝트 목록)      | 조직 소속 프로젝트 리스트        | ✅ 구현                 | 1     |
| 조직 설정                    | 이름/설명 변경, 로고 업로드      | ✅ 구현                 | 1     |
| 조직 삭제                    | 확인 다이얼로그 + 삭제           | ✅ 구현                 | 1     |
| 멤버 목록/추가/삭제/역할변경 | admin/member 역할 관리           | ✅ 구현                 | 1     |
| 가입 요청/승인/취소/탈퇴     | 인증된 비멤버만 요청 가능        | ✅ 구현                 | 1     |
| 조직 이슈 목록               | 조직 전체 프로젝트의 이슈 집계   | ✅ Phase 2F 구현        | 2     |
| 조직 게시판 목록             | 조직 전체 프로젝트의 게시글 집계 | gap (placeholder route) | 5     |
| 조직 PR 목록                 | 조직 전체 프로젝트의 PR 집계     | gap (placeholder route) | 4     |
| 조직 내 검색                 | 조직 범위 검색                   | gap (placeholder route) | 5     |

#### 검수 기준

- [ ] 조직 이름 유효성: 영숫자, 대시, 밑줄, 마침표만 허용. 공백 불가. 길이 제한.
- [ ] 조직 홈에서 소속 프로젝트가 legacy와 동일한 카드/리스트 형태로 표시된다
- [ ] 멤버 정렬: org admin → org member → login_id ASC → 대기 요청 순 (legacy 동작)
- [ ] 삭제 시 프로젝트가 존재하면 삭제 불가 (legacy guard 동작)
- [ ] 가입 요청은 인증된 사용자이면서 현재 멤버가 아닌 경우에만 가능

---

### FG-04: 프로젝트 (Project)

**Legacy 참조**: `yona-original/app/controllers/ProjectApp.java`, `app/views/project/*.scala.html`, `app/models/Project.java`

**Legacy 라우트**:

```
GET   /projects                       → 프로젝트 목록 (공개)
GET   /projectform                    → 프로젝트 생성 폼
POST  /projects                       → 프로젝트 생성
GET   /:owner/:project                → 프로젝트 홈
GET   /:owner/:project/settingform    → 프로젝트 설정
POST  /:owner/:project/setting        → 프로젝트 설정 저장
DELETE /:owner/:project/delete        → 프로젝트 삭제
GET   /:owner/:project/members        → 프로젝트 멤버
POST  /:owner/:project/members        → 멤버 추가
DELETE /:owner/:project/member/:id/delete → 멤버 삭제
GET   /:owner/:project/watchers       → 프로젝트 감시자
POST  /:owner/:project/watch          → 감시 시작
POST  /:owner/:project/unwatch        → 감시 해제
GET   /:owner/:project/webhooks       → 웹훅 목록
POST  /:owner/:project/webhooks       → 웹훅 추가
DELETE /:owner/:project/webhooks/:id  → 웹훅 삭제
GET   /:owner/:project/transfer       → 프로젝트 이관 폼
POST  /:owner/:project/transfer       → 프로젝트 이관
POST  /:owner/:project/enroll         → 프로젝트 가입 요청
POST  /:owner/:project/cancel/enroll  → 프로젝트 가입 취소
GET   /:owner/:project/statistics     → 프로젝트 통계
GET   /:owner/:project/changeVCS      → VCS 변경 폼
POST  /:owner/:project/changeVCS      → VCS 변경
```

#### 기능 목록과 상태

| 기능                 | Legacy 동작                                        | 현재 상태         | Phase |
| -------------------- | -------------------------------------------------- | ----------------- | ----- |
| 프로젝트 목록 (공개) | 검색, 페이지네이션(10개), 메타데이터, 로고, 멤버수 | ✅ 구현           | 1     |
| 프로젝트 생성        | owner 선택(개인/조직), 이름, VCS 타입, 공개범위    | ✅ 구현           | 1     |
| 프로젝트 홈          | overview(README), 최근 활동, 코드 링크             | ✅ 기본 구현      | 1     |
| 프로젝트 설정        | 이름/설명/공개범위 변경, 메뉴 토글                 | ✅ 구현           | 1     |
| 프로젝트 삭제        | 확인 + 삭제                                        | gap               | 2     |
| 멤버 관리            | 멤버 추가/삭제/역할변경                            | gap (읽기만 구현) | 2     |
| 감시자 (Watchers)    | 프로젝트 감시/해제, 감시자 목록                    | ✅ 토글 구현      | 1     |
| 즐겨찾기             | 프로젝트 즐겨찾기 토글                             | ✅ 구현           | 1     |
| 가입 요청            | 비멤버가 가입 요청/취소                            | ✅ 구현           | 1     |
| 웹훅 관리            | CRUD, event type, secret                           | gap               | 5     |
| 프로젝트 이관        | 다른 owner로 이관                                  | gap               | 6     |
| VCS 변경             | Git ↔ SVN                                          | deferred          | 2차   |
| 프로젝트 통계        | 활동 통계                                          | gap               | 5     |
| 프로젝트 메뉴 설정   | code/issue/milestone/board/pullRequest 토글        | ✅ 구현           | 1     |
| 프로젝트 공개범위    | public/protected/private + ACL 체크                | ✅ 구현           | 1     |
| Overview/README      | 마크다운 편집 가능한 프로젝트 소개                 | ✅ 구현           | 1     |

#### 검수 기준

- [ ] `/:owner/:project` 레이아웃이 legacy의 `projectLayout.scala.html`과 동일한 구조(헤더 + 메뉴 + 컨텐츠)를 따른다
- [ ] 프로젝트 메뉴: Code / Issues / Milestones / Board / Pull Requests 순서 (legacy 동일), `project_menu_setting`에 따라 on/off
- [ ] 공개범위별 접근 제어: public(누구나 읽기), protected(조직 멤버 읽기), private(프로젝트 멤버만)
- [ ] site_admin은 모든 프로젝트에 read + write 권한 (legacy `ProjectApp` 동작)
- [ ] 프로젝트 목록 페이지네이션: 한 페이지 10개, legacy `pageNum` 방식

---

### FG-05: 이슈 (Issues)

**Legacy 참조**: `yona-original/app/controllers/IssueApp.java`, `app/views/issue/*.scala.html`, `app/models/Issue.java`, `IssueComment.java`, `Assignee.java`, `IssueEvent.java`

**Legacy 라우트**:

```
GET   /:owner/:project/issues              → 이슈 목록
GET   /:owner/:project/issueform           → 이슈 작성 폼
POST  /:owner/:project/issues              → 이슈 생성
GET   /:owner/:project/issue/:number       → 이슈 상세
POST  /:owner/:project/issue/:number/edit  → 이슈 수정
DELETE /:owner/:project/issue/:number/delete → 이슈 삭제
POST  /:owner/:project/issue/:number/comments → 댓글 작성
DELETE /:owner/:project/issue/comment/:id/delete → 댓글 삭제
GET   /:owner/:project/issue/:number/timeline → 이슈 타임라인
POST  /watch                                → 이슈 감시
POST  /unwatch                              → 이슈 감시 해제
POST  /:owner/:project/issue/:number/vote   → 이슈 투표
POST  /:owner/:project/issue/:number/unvote → 이슈 투표 취소
POST  /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share → 이슈 공유 변경(legacy external REST; Rust 화면 기능은 `/api/v1/.../sharers`)
```

#### 기능 목록과 상태

| 기능               | Legacy 동작                                         | 현재 상태             | Phase |
| ------------------ | --------------------------------------------------- | --------------------- | ----- |
| 이슈 목록          | 필터(상태/담당자/라벨/마일스톤), 정렬, 페이지네이션 | ✅ Phase 2A 구현      | 2     |
| 이슈 작성          | 제목, 본문(마크다운), 담당자, 마일스톤, 라벨 선택   | ✅ Phase 2A 구현      | 2     |
| 이슈 상세 보기     | 제목/본문, 담당자, 마일스톤, 라벨, 이벤트 타임라인  | ✅ Phase 2A 구현      | 2     |
| 이슈 수정          | 제목/본문/담당자/마일스톤/라벨 수정                 | ✅ Phase 2A 구현      | 2     |
| 이슈 삭제          | 작성자 또는 관리자만 가능                           | ✅ Phase 2A 구현      | 2     |
| 이슈 상태 변경     | open ↔ closed                                       | ✅ Phase 2A 구현      | 2     |
| 댓글 CRUD          | 작성/수정/삭제, 마크다운 지원                       | ✅ Phase 2A 구현      | 2     |
| 이슈 타임라인      | 상태 변경, 담당자 변경, 라벨 변경 등 이벤트 목록    | ✅ Phase 2A 구현      | 2     |
| 담당자 (Assignee)  | 프로젝트 멤버 중 선택, 다중 담당자                  | ✅ Phase 2J/2K 검색 보강 | 2     |
| 이슈 감시 (Watch)  | 알림 수신 토글                                      | ✅ Phase 2A 구현      | 2     |
| 이슈 투표 (Vote)   | 이슈에 투표/취소                                    | ✅ Phase 2A 구현      | 2     |
| 댓글 투표          | 댓글에 투표/취소                                    | ✅ Phase 2H 구현      | 2     |
| @멘션              | `@username` 자동 완성 + 알림                        | gap                   | 2     |
| 이슈 공유 (Sharer) | 비멤버에게 이슈 읽기 권한 부여                      | ✅ Phase 2E 핵심 구현 | 2     |
| Mass Update        | 이슈 일괄 상태/담당자/마일스톤/라벨 변경            | ✅ Phase 2A 구현      | 2     |
| 이슈 엑셀 내보내기 | xlsx 다운로드                                       | deferred              | 2차   |
| 즐겨찾기 이슈      | workspace에서 즐겨찾기 관리                         | ✅ Phase 2G 구현      | 2     |
| 조직 이슈 목록     | `/organizations/:name/issues`                       | ✅ Phase 2F 구현      | 2     |
| 사용자 이슈 목록   | `/user/issues`, 개인 quick filter                   | ✅ Phase 2G 구현      | 2     |

#### 검수 기준

- [ ] 이슈 목록 필터: state(open/closed), assignee, label, milestone — legacy `IssueApp.issues()` 파라미터 동일
- [ ] 이슈 번호: 프로젝트 내 자동 증가 (`#1`, `#2`, ...) — legacy `Issue.nextNumber()` 동일
- [ ] 이슈 상세: 제목, 본문(마크다운 렌더링), 사이드바(담당자/마일스톤/라벨/감시자/투표수) — legacy `issue/view.scala.html` 레이아웃 동일
- [ ] 댓글: 시간순 정렬, 작성자 아바타, 마크다운 렌더링
- [ ] 타임라인: 상태 변경/담당자 변경/라벨 변경 이벤트가 댓글과 인터리빙되어 시간순 표시
- [ ] Mass Update: 체크박스로 다중 선택 → 상태/담당자/마일스톤 일괄 변경 (legacy `IssueMassUpdate` 동일)
- [ ] 이슈 삭제: 작성자 또는 프로젝트 관리자만 가능
- [ ] 이슈 공유: 직접 공유된 사용자는 비공개/제한 이슈와 댓글을 읽고 해당 이슈에 댓글 작성 가능, parent issue 공유는 child issue 읽기만 허용
- [ ] 첨부파일: 이슈 본문/댓글에 파일 첨부 가능 (`/files` 엔드포인트)

---

### FG-06: 게시판 (Board/Posting)

**Legacy 참조**: `yona-original/app/controllers/BoardApp.java`, `app/views/board/*.scala.html`, `app/models/Posting.java`, `PostingComment.java`

**Legacy 라우트**:

```
GET   /:owner/:project/posts               → 게시글 목록
GET   /:owner/:project/postform            → 게시글 작성 폼
POST  /:owner/:project/posts               → 게시글 생성
GET   /:owner/:project/post/:number        → 게시글 상세
GET   /:owner/:project/post/:number/editform → 게시글 편집 폼
POST  /:owner/:project/post/:number/edit   → 게시글 수정
DELETE /:owner/:project/post/:number/delete → 게시글 삭제
POST  /:owner/:project/post/:number/comment → 댓글 작성
DELETE /:owner/:project/post/comment/:id/delete → 댓글 삭제
```

#### 기능 목록과 상태

| 기능             | Legacy 동작                             | 현재 상태 | Phase |
| ---------------- | --------------------------------------- | --------- | ----- |
| 게시글 목록      | 검색, 페이지네이션, 공지 상단 고정      | gap       | 5     |
| 게시글 작성      | 제목, 본문(마크다운), 라벨              | gap       | 5     |
| 게시글 상세      | 제목/본문/댓글, 공지 표시               | gap       | 5     |
| 게시글 수정/삭제 | 작성자 또는 관리자                      | gap       | 5     |
| 댓글 CRUD        | 마크다운, 작성/삭제                     | gap       | 5     |
| 공지 (notice)    | `posting.notice=true` 시 목록 상단 고정 | gap       | 5     |
| README 게시글    | `posting.readme=true` 시 특별 표시      | gap       | 5     |
| 게시글 라벨      | 이슈 라벨과 공유                        | gap       | 5     |
| 게시글 번호      | 프로젝트 내 자동 증가                   | gap       | 5     |
| 조직 게시판 목록 | `/organizations/:name/boards`           | gap       | 5     |

#### 검수 기준

- [ ] 게시글 목록: 공지(notice) 게시글이 항상 상단에 표시 (legacy `Posting.finder.where().orderBy("notice desc, ...")` 동일)
- [ ] 게시글 번호: `Posting.nextNumber()` 로직과 동일하게 프로젝트 내 자동 증가
- [ ] 게시글 레이아웃: legacy `board/post.scala.html`의 제목/본문/댓글 구조 동일
- [ ] 댓글: 시간순, 작성자 아바타, 마크다운 렌더링

---

### FG-07: 라벨 (Labels & Categories)

**Legacy 참조**: `yona-original/app/controllers/IssueLabelApp.java`, `LabelApp.java`, `app/models/IssueLabel.java`, `IssueLabelCategory.java`

**Legacy 라우트**:

```
GET   /:owner/:project/issue/labels        → 프로젝트 라벨 목록
POST  /:owner/:project/issue/labels        → 라벨 생성
PUT   /:owner/:project/issue/label/:id     → 라벨 수정
DELETE /:owner/:project/issue/label/:id/delete → 라벨 삭제
GET   /:owner/:project/issue/labelsform    → 라벨 관리 폼
GET   /labels                              → 전역 라벨
GET   /categories                          → 전역 카테고리
```

#### 기능 목록과 상태

| 기능               | Legacy 동작                             | 현재 상태           | Phase |
| ------------------ | --------------------------------------- | ------------------- | ----- |
| 프로젝트 라벨 CRUD | 이름, 색상, 카테고리                    | ✅ Phase 2B 구현    | 2     |
| 라벨 카테고리      | 라벨을 카테고리별 그룹핑                | ✅ Phase 2B 구현    | 2     |
| 라벨 필터링        | 이슈/게시판 목록에서 라벨 필터          | ✅ Phase 2A/2B 구현 | 2     |
| 라벨 색상 CSS      | 자동 생성 CSS (`IssueLabel.labelCSS()`) | ✅ Phase 2B 구현    | 2     |
| 라벨 복사          | 프로젝트 간 라벨 복사                   | gap                 | 6     |

#### 검수 기준

- [ ] 라벨 생성 시 이름, 색상(hex), 카테고리 지정 가능
- [ ] 라벨 색상이 legacy와 동일하게 배경색 + 텍스트색으로 표시
- [ ] 이슈 필터에서 라벨 선택 시 해당 라벨이 붙은 이슈만 필터링
- [ ] 카테고리별 라벨 그룹핑이 legacy `labelsform` 화면과 동일

---

### FG-08: 마일스톤 (Milestones)

**Legacy 참조**: `yona-original/app/controllers/MilestoneApp.java`, `app/views/milestone/*.scala.html`, `app/models/Milestone.java`

**Legacy 라우트**:

```
GET   /:owner/:project/milestones           → 마일스톤 목록
GET   /:owner/:project/newMilestoneForm     → 생성 폼
POST  /:owner/:project/milestones           → 마일스톤 생성
GET   /:owner/:project/milestone/:id        → 마일스톤 상세
GET   /:owner/:project/milestone/:id/editform → 편집 폼
POST  /:owner/:project/milestone/:id/edit   → 마일스톤 수정
DELETE /:owner/:project/milestone/:id/delete → 삭제
POST  /:owner/:project/milestone/:id/open   → 마일스톤 열기
POST  /:owner/:project/milestone/:id/close  → 마일스톤 닫기
```

#### 기능 목록과 상태

| 기능          | Legacy 동작                             | 현재 상태 | Phase |
| ------------- | --------------------------------------- | --------- | ----- |
| 마일스톤 CRUD | 제목, 설명, 마감일                      | ✅ 구현   | 2     |
| 마일스톤 상태 | open/closed 토글                        | ✅ 구현   | 2     |
| 이슈 집계     | 마일스톤별 open/closed 이슈 수 + 진행률 | ✅ 구현   | 2     |
| 마일스톤 상세 | 소속 이슈 목록                          | ✅ 구현   | 2     |

#### 검수 기준

- [x] 마일스톤 목록: open/closed 탭, 각 마일스톤에 진행률 바(open/closed 이슈 비율) — legacy 동일
- [x] 마감일: `yyyy-MM-dd` 형식 저장/표시
- [x] 마일스톤 상세: 소속 이슈 목록이 legacy `milestone/view.scala.html`과 동일

**Phase 2C 구현 메모**: `/api/v1` REST와 SPA/direct legacy mutation route parity를 구현했다. Legacy external `/-_-api/v1/.../milestones`, migration export, search milestone result type은 각각 legacy external API, migration/export, search packet에 남긴다.

---

### FG-09: 코드 브라우저 (Repository Code Browser)

**Legacy 참조**: `yona-original/app/controllers/CodeApp.java`, `CodeHistoryApp.java`, `BranchApp.java`, `CompareApp.java`, `app/views/code/*.scala.html`, `git/*.scala.html`

**Legacy 라우트**:

```
GET   /:owner/:project/code                → 코드 브라우저 (기본 브랜치)
GET   /:owner/:project/code/:branch        → 특정 브랜치
GET   /:owner/:project/code/:branch/*path  → 파일/폴더 보기
GET   /:owner/:project/rawcode/:rev/*path  → Raw 파일
GET   /:owner/:project/files/:rev/*path    → 파일 다운로드
GET   /:owner/:project/image/:rev/*path    → 이미지 보기
GET   /:owner/:project/commits             → 커밋 이력
GET   /:owner/:project/commit/:id          → 커밋 상세 (diff)
POST  /:owner/:project/commit/:id/comments → 커밋 댓글
GET   /:owner/:project/branches            → 브랜치 목록
POST  /:owner/:project/branch/:name/delete → 브랜치 삭제
POST  /:owner/:project/branch/setAsDefault → 기본 브랜치 변경
GET   /:owner/:project/compare/:rev        → 커밋 비교
```

#### 기능 목록과 상태

| 기능                         | Legacy 동작                         | 현재 상태             | Phase |
| ---------------------------- | ----------------------------------- | --------------------- | ----- |
| 파일/폴더 트리 브라우저      | 디렉토리 탐색, 파일 내용 표시       | ✅ Phase 3A 구현      | 3     |
| 브랜치 선택기                | 드롭다운으로 브랜치/태그 전환       | ✅ Phase 3A 기본 구현 | 3     |
| 파일 보기 (syntax highlight) | 코드 하이라이트, 라인 번호          | 🔶 텍스트 보기 구현   | 3     |
| Raw 파일 다운로드            | 바이너리/텍스트 직접 다운로드       | gap                   | 3     |
| 이미지 미리보기              | 이미지 파일 인라인 표시             | gap                   | 3     |
| 커밋 이력                    | 커밋 목록, 페이지네이션             | gap                   | 3     |
| 커밋 상세 (diff)             | 변경 파일 목록, unified diff        | gap                   | 3     |
| 커밋 댓글                    | 커밋에 댓글 작성/삭제               | gap                   | 3     |
| 브랜치 관리                  | 브랜치 목록, 삭제, 기본 브랜치 설정 | gap                   | 3     |
| 커밋 비교                    | 두 revision 간 diff                 | gap                   | 3     |

#### 검수 기준

- [ ] 코드 브라우저: `/:owner/:project/code` 접근 시 기본 브랜치의 루트 디렉토리가 legacy `code/view.scala.html` 레이아웃으로 표시
- [ ] 파일 보기: syntax highlighting, 라인 번호, raw 다운로드 링크
- [ ] 브랜치 선택기: 드롭다운에 브랜치/태그 목록, 현재 브랜치 표시
- [ ] 커밋 이력: 시간역순, 작성자/메시지/해시, 페이지네이션
- [ ] 커밋 diff: unified diff 형식, 파일별 변경 라인 수, 인라인 코멘트 가능 위치 표시

---

### FG-10: Git Smart HTTP Protocol

**Legacy 참조**: `yona-original/app/controllers/GitApp.java`, `app/models/PlayRepository.java`

**Legacy 라우트**:

```
POST  /:owner/:project/info/refs                              → Git refs 광고
POST  /:owner/:project/$service<git-upload-pack|git-receive-pack> → Git 프로토콜
```

#### 기능 목록과 상태

| 기능              | Legacy 동작                                     | 현재 상태 | Phase |
| ----------------- | ----------------------------------------------- | --------- | ----- |
| git clone (HTTPS) | Smart HTTP upload-pack                          | gap       | 3     |
| git push (HTTPS)  | Smart HTTP receive-pack                         | gap       | 3     |
| 인증              | Basic Auth (username + password/token)          | gap       | 3     |
| 권한 체크         | 프로젝트 공개범위 + 멤버 역할에 따른 read/write | gap       | 3     |
| Post-receive hook | push 후 알림/이벤트 발생                        | gap       | 3     |
| 저장소 초기 생성  | 프로젝트 생성 시 bare repo 생성                 | gap       | 3     |

#### 검수 기준

- [ ] `git clone http://host/:owner/:project.git` 가 동작한다
- [ ] `git push` 시 인증된 사용자만 성공하고, read-only 사용자는 거부된다
- [ ] 프로젝트 공개범위에 따라 clone 인증 요구 여부가 결정된다 (public: 인증 불요, private: 인증 필요)
- [ ] push 후 `notification_event` 생성 및 branch push 기록

---

### FG-11: Pull Request & 코드 리뷰 (Pull Requests & Code Review)

**Legacy 참조**: `yona-original/app/controllers/PullRequestApp.java`, `ReviewApp.java`, `ReviewThreadApp.java`, `app/models/PullRequest.java`, `ReviewComment.java`, `CommentThread.java`

**Legacy 라우트**:

```
GET   /:owner/:project/pullRequests               → PR 목록 (open)
GET   /:owner/:project/closedPullRequests         → PR 목록 (closed)
GET   /:owner/:project/sentPullRequests           → 보낸 PR 목록
GET   /:owner/:project/newPullRequestForm         → PR 생성 폼
POST  /:owner/:project/pullRequests               → PR 생성
GET   /:owner/:project/pullRequest/:id            → PR 상세
GET   /:owner/:project/pullRequest/:id/changes    → PR diff
POST  /:owner/:project/pullRequest/:id/accept     → PR merge 승인
POST  /:owner/:project/pullRequest/:id/close      → PR 닫기
POST  /:owner/:project/pullRequest/:id/open       → PR 다시 열기
POST  /:owner/:project/pullRequest/:id/comments   → PR 댓글
POST  /:owner/:project/pullRequest/:number/review   → 리뷰 승인
POST  /:owner/:project/pullRequest/:number/unreview → 리뷰 철회
POST  /threads/:id/open                            → 리뷰 스레드 열기
POST  /threads/:id/close                           → 리뷰 스레드 닫기
GET   /:owner/:project/newFork                     → Fork 폼
POST  /:owner/:project/fork                        → Fork 실행
DELETE /:owner/:project/pullRequest/:id/deletefrombranch → from 브랜치 삭제
```

#### 기능 목록과 상태

| 기능                       | Legacy 동작                          | 현재 상태 | Phase |
| -------------------------- | ------------------------------------ | --------- | ----- |
| PR 목록 (open/closed/sent) | 탭으로 분류, 필터, 페이지네이션      | gap       | 4     |
| PR 생성                    | from/to 브랜치 선택, 제목/본문       | gap       | 4     |
| PR 상세                    | 커밋 목록, 변경 파일, 댓글/타임라인  | gap       | 4     |
| PR diff 보기               | 파일별 unified diff, 인라인 코멘트   | gap       | 4     |
| PR 상태 관리               | open → merged / closed, 재열기       | gap       | 4     |
| Merge 실행                 | fast-forward / merge commit / squash | gap       | 4     |
| Merge 충돌 처리            | 충돌 시 알림, 수동 해결 안내         | gap       | 4     |
| 리뷰 승인/철회             | 리뷰어가 승인/철회                   | gap       | 4     |
| 코드 리뷰 댓글             | 특정 라인에 인라인 댓글              | gap       | 4     |
| 리뷰 스레드                | 인라인 댓글 스레드 open/close        | gap       | 4     |
| Fork & PR                  | 프로젝트 fork → PR 워크플로우        | gap       | 4     |
| from 브랜치 삭제           | merge 후 소스 브랜치 삭제            | gap       | 4     |
| 리뷰어 지정                | PR에 리뷰어 배정                     | gap       | 4     |

#### 검수 기준

- [ ] PR 목록: open/closed/sent 탭, 각 PR에 제목/작성자/날짜/리뷰 상태 표시
- [ ] PR 상세: Conversation (댓글+이벤트 타임라인) / Changes (diff) 탭 구조 — legacy 동일
- [ ] 인라인 코드 리뷰: diff 뷰에서 특정 라인 클릭 → 댓글 입력 → 스레드 생성
- [ ] 리뷰 스레드: open/close/resolve 상태 전환, outdated 표시
- [ ] Merge: 충돌 없으면 merge 버튼 활성화, 충돌 시 비활성화 + 안내
- [ ] Fork: 프로젝트 fork 시 동일 이름의 개인 프로젝트 생성, bare repo 복제

---

### FG-12: 검색 (Search)

**Legacy 참조**: `yona-original/app/controllers/SearchApp.java`, `app/views/search/*.scala.html`, `app/models/Search.java`

**Legacy 라우트**:

```
GET   /search                                → 전체 검색
GET   /:owner/:project/search               → 프로젝트 내 검색
GET   /organizations/:name/search            → 조직 내 검색
```

#### 기능 목록과 상태

| 기능              | Legacy 동작                                                                     | 현재 상태 | Phase |
| ----------------- | ------------------------------------------------------------------------------- | --------- | ----- |
| 전체 검색         | 모든 프로젝트의 이슈/게시판/댓글/마일스톤 검색                                  | gap       | 5     |
| 프로젝트 내 검색  | 특정 프로젝트 범위 검색                                                         | gap       | 5     |
| 조직 내 검색      | 조직 소속 프로젝트 범위 검색                                                    | gap       | 5     |
| 검색 타입 필터    | issue, posting, issue_comment, posting_comment, milestone, review_comment, user | gap       | 5     |
| 검색 결과 그룹핑  | 타입별 결과 수 + 결과 목록                                                      | gap       | 5     |
| 검색 페이지네이션 | 결과 페이지네이션                                                               | gap       | 5     |

#### 검수 기준

- [ ] 검색 결과: legacy `search/result.scala.html`과 동일한 타입별 탭 + 결과 목록 구조
- [ ] 검색 범위: 전체/프로젝트/조직 3가지 모드 지원
- [ ] 검색 대상: Issue, Posting, IssueComment, PostingComment, Milestone, ReviewComment, User
- [ ] 각 결과 항목: 프로젝트명, 제목/내용 스니펫, 작성자, 날짜 표시

---

### FG-13: 알림 (Notifications)

**Legacy 참조**: `yona-original/app/controllers/NotificationApp.java`, `WatchApp.java`, `WatchProjectApp.java`, `app/models/NotificationEvent.java`, `NotificationMail.java`, `Watch.java`

**Legacy 라우트**:

```
GET   /notification          → 알림 목록
GET   /notifications         → 알림 목록 (alias)
POST  /noti/toggle/:projectId/:notiType → 프로젝트별 알림 타입 토글
```

#### 기능 목록과 상태

| 기능                 | Legacy 동작                                       | 현재 상태                | Phase |
| -------------------- | ------------------------------------------------- | ------------------------ | ----- |
| 알림 목록            | 시간역순 알림 이벤트 목록                         | gap                      | 5     |
| 이메일 알림          | 이벤트 발생 시 이메일 발송                        | gap (SMTP 인프라만 구현) | 5     |
| 프로젝트별 알림 설정 | NEW_ISSUE, NEW_POSTING, NEW_COMMENT 등 토글       | ✅ 기본 구현             | 1     |
| Watch/Unwatch        | 리소스(이슈/프로젝트) 감시                        | ✅ 프로젝트 토글 구현    | 1     |
| 알림 이벤트 타입     | 이슈 생성, 댓글, 상태변경, PR 생성/merge, 리뷰 등 | gap                      | 5     |
| BCC 모드             | 수신자 간 이메일 주소 비공개                      | gap                      | 5     |
| 알림 간격            | `notification.bymail.interval` 배치 발송          | gap                      | 5     |
| Draft-time 머징      | 30초 내 연속 편집 알림 병합                       | gap                      | 5     |
| 수신자 제한          | `recipientLimit` 설정                             | gap                      | 5     |

#### 검수 기준

- [ ] 알림 목록: legacy `/notification` 화면과 동일한 이벤트 목록 표시
- [ ] 이메일 알림: 이슈/PR 댓글 작성 시 관련 감시자에게 이메일 발송
- [ ] 알림 토글: 프로젝트별 이벤트 타입(NEW_ISSUE, NEW_POSTING, NEW_COMMENT 등) on/off
- [ ] 알림 이메일: legacy 메일 포맷(제목, 본문, 링크)과 동일

---

### FG-14: 웹훅 (Webhooks)

**Legacy 참조**: `yona-original/app/controllers/ProjectApp.java` (webhook 부분), `app/models/Webhook.java`

**Legacy 라우트**:

```
GET   /:owner/:project/webhooks       → 웹훅 목록
POST  /:owner/:project/webhooks       → 웹훅 생성
DELETE /:owner/:project/webhooks/:id  → 웹훅 삭제
```

#### 기능 목록과 상태

| 기능        | Legacy 동작                              | 현재 상태 | Phase |
| ----------- | ---------------------------------------- | --------- | ----- |
| 웹훅 CRUD   | payload URL, secret, active, 이벤트 타입 | gap       | 5     |
| 이벤트 발송 | JSON payload를 설정된 URL로 POST         | gap       | 5     |
| Secret 검증 | HMAC-SHA256 서명                         | gap       | 5     |
| 이벤트 타입 | issue, pull_request, comment, review 등  | gap       | 5     |
| 실행 이력   | 발송 성공/실패 기록                      | gap       | 5     |

#### 검수 기준

- [ ] 웹훅 생성: payload URL, secret, 이벤트 타입 선택 — legacy 동일
- [ ] JSON payload: legacy `Webhook.sendPayload()` 포맷과 호환
- [ ] Secret: `X-Yona-Signature` 헤더에 HMAC-SHA256 서명 포함
- [ ] 실행 실패 시 재시도 로직 (legacy는 비동기 재시도)

---

### FG-15: 파일 첨부 (Attachments)

**Legacy 참조**: `yona-original/app/controllers/AttachmentApp.java`, `app/models/Attachment.java`

**Legacy 라우트**:

```
POST  /files                  → 파일 업로드
GET   /files/:id              → 파일 다운로드
DELETE /files/:id             → 파일 삭제
```

#### 기능 목록과 상태

| 기능           | Legacy 동작                       | 현재 상태 | Phase |
| -------------- | --------------------------------- | --------- | ----- |
| 파일 업로드    | multipart form-data               | ✅ 구현   | 1     |
| 파일 다운로드  | content-disposition               | ✅ 구현   | 1     |
| 파일 삭제      | 작성자 또는 관리자                | gap       | 2     |
| Container type | 이슈/게시판/PR/프로젝트 등에 연결 | gap       | 2     |
| 파일 크기 제한 | `application.maxFileSize`         | gap       | 2     |
| MIME type 검사 | 업로드 시 MIME 검사               | gap       | 2     |
| 아바타 업로드  | 프로필 아바타 전용                | ✅ 구현   | 1     |

#### 검수 기준

- [ ] 업로드: multipart POST → 파일 저장 → ID 반환
- [ ] 다운로드: `GET /files/:id` → 원본 파일명 + MIME type + content
- [ ] 마크다운 에디터에서 drag-and-drop 또는 클립보드 붙여넣기로 이미지 첨부 가능
- [ ] `YONA_MAX_FILE_SIZE` 설정값 초과 시 업로드 거부

---

### FG-16: 관리자 (Site Admin)

**Legacy 참조**: `yona-original/app/controllers/SiteApp.java`, `app/views/site/*.scala.html`, `app/models/SiteAdmin.java`

**Legacy 라우트**:

```
GET   /sites/userList          → 사용자 목록
GET   /sites/projectList       → 프로젝트 목록
GET   /sites/postList          → 게시글 목록
GET   /sites/issueList         → 이슈 목록
POST  /sites/toggleSiteAdminRole → 관리자 역할 토글
POST  /sites/toggleAccountLock → 계정 잠금/해제
DELETE /sites/user/delete       → 사용자 삭제
DELETE /sites/project/delete/:id → 프로젝트 삭제
GET   /sites/mail              → 메일 설정
POST  /sites/mail              → 테스트 메일 발송
POST  /sites/mailList          → 대량 메일 발송
GET   /sites/diagnostic        → 시스템 진단
GET   /sites/update            → 업데이트 확인
GET   /sites/data              → 데이터 관리
POST  /sites/import            → 데이터 임포트
GET   /sites/export            → 데이터 익스포트
```

#### 기능 목록과 상태

| 기능                   | Legacy 동작                        | 현재 상태 | Phase |
| ---------------------- | ---------------------------------- | --------- | ----- |
| 사용자 목록/관리       | 목록, 검색, 관리자 토글, 계정 잠금 | gap       | 6     |
| 프로젝트 목록/관리     | 목록, 검색, 삭제                   | gap       | 6     |
| 게시글/이슈 목록       | 전체 게시글/이슈 관리              | gap       | 6     |
| 메일 설정/테스트       | SMTP 테스트, 대량 메일             | gap       | 6     |
| 시스템 진단            | DB 상태, 메모리 등                 | gap       | 6     |
| 데이터 임포트/익스포트 | 전체 데이터 백업/복원              | deferred  | 2차   |
| 업데이트 확인          | 새 버전 확인                       | deferred  | 2차   |

#### 검수 기준

- [ ] 관리자 화면: `/sites/*` 경로, site_admin 역할만 접근 가능
- [ ] 사용자 목록: 검색, 페이지네이션, 관리자 역할 토글, 계정 잠금/해제
- [ ] 프로젝트 목록: 검색, 페이지네이션, 프로젝트 삭제

---

### FG-17: 마크다운 렌더링 (Markdown)

**Legacy 참조**: `yona-original/app/controllers/MarkdownApp.java`, 각 view의 마크다운 렌더링

**Legacy 라우트**:

```
POST  /markdown                → 마크다운 → HTML 변환
```

#### 기능 목록과 상태

| 기능            | Legacy 동작                      | 현재 상태 | Phase |
| --------------- | -------------------------------- | --------- | ----- |
| 마크다운 렌더링 | GFM + 확장 문법                  | gap       | 2     |
| @멘션 링크      | `@username` → 사용자 프로필 링크 | gap       | 2     |
| 이슈 참조       | `#123` → 이슈 링크               | gap       | 2     |
| 자동 링크       | URL 자동 링크 변환               | gap       | 2     |
| 코드 블록       | syntax highlighting              | gap       | 2     |
| 이미지          | 인라인 이미지 표시               | gap       | 2     |
| 체크리스트      | `- [ ]` / `- [x]`                | gap       | 2     |
| XSS 방지        | HTML sanitization                | gap       | 2     |

#### 검수 기준

- [ ] GFM (GitHub Flavored Markdown) 호환 렌더링
- [ ] `@username` → 사용자 프로필 링크 변환
- [ ] `#123` → 동일 프로젝트 이슈 링크 변환
- [ ] `owner/project#123` → 크로스 프로젝트 이슈 링크 변환
- [ ] 코드 블록: 언어별 syntax highlighting
- [ ] XSS: `<script>` 등 위험 태그 제거

---

### FG-18: REST API (Legacy API 호환)

**Legacy 참조**: `yona-original/app/controllers/api/*`, routes 파일의 `/-_-api/v1/**` 경로

**Legacy API 접두사**: `/-_-api/v1/`

#### 기능 목록과 상태

| API                           | Legacy 동작        | 현재 상태 | Phase |
| ----------------------------- | ------------------ | --------- | ----- |
| `GET /-_-api/v1/hello`        | Health check       | gap       | 2     |
| `GET /-_-api/v1/users`        | 사용자 목록        | gap       | 6     |
| `POST /-_-api/v1/users`       | 사용자 생성        | gap       | 6     |
| `POST /-_-api/v1/users/token` | API 토큰 발급      | gap       | 6     |
| Issue API                     | 이슈 CRUD + 댓글   | gap       | 2     |
| Project API                   | 프로젝트 CRUD      | gap       | 2     |
| Board API                     | 게시글 CRUD + 댓글 | gap       | 5     |
| Milestone API                 | 마일스톤 CRUD      | gap       | 2     |
| Watcher API                   | 감시자 목록        | gap       | 5     |
| Favorite API                  | 즐겨찾기 관리      | gap       | 2     |

**주의**: REST에는 두 계층이 있다. 새 React application API는 `/api/v1/**`를 canonical surface로 사용한다. legacy 외부 호환 API는 `/-_-api/v1/**`를 보존하며, 기존 Yona API를 사용하는 외부 도구와의 호환성을 위한 것이다.

`/-_-api/v1/**` legacy API는 외부 도구와의 호환이 확인된 경우에만 구현한다. 내부 React 화면이나 legacy view helper API를 `/-_-api/v1/**`로 확장하지 않는다. 내부 React 화면은 `/api/v1/**` application API와 TanStack Query를 사용한다.

#### 검수 기준

- [ ] `/-_-api/v1/hello` 가 200 OK를 반환한다
- [ ] API 인증: `Yona-Token` 헤더 또는 쿠키 기반 세션 — legacy 동일
- [ ] API 응답: JSON 포맷, legacy 필드명과 동일한 스키마
- [ ] 에러 응답: legacy와 동일한 HTTP 상태 코드 + 에러 메시지 형식

---

## 5. DB 스키마 호환성

### 5.1 기존 DB 채택 (Adopt) 모드

legacy Yona 사용자가 기존 DB를 그대로 사용할 수 있어야 한다.

- `YONA_SCHEMA_POLICY=adopt` 시 기존 테이블을 인식하고 migration을 skip
- column-level validation으로 스키마 일치 확인
- 기본 동작은 read-only validation이며, mismatch 발견 시 DB mutation 없이 실패 리포트를 출력하고 startup을 중단
- 기존 데이터 무손실 보장은 adopt 모드가 legacy table/column/type/nullability 검증을 통과한 경우에만 선언

### 5.2 핵심 테이블 (60+)

현재 SeaORM 엔티티로 모든 legacy 테이블이 매핑되어 있다:

| 카테고리    | 테이블                                                                                                                                                                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 사용자/인증 | `n4user`, `user_credential`, `user_verification`, `email`, `linked_account`, `site_admin`, `role`, `user_setting`                                                                                                                         |
| 조직        | `organization`, `organization_user`, `user_enrolled_organization`                                                                                                                                                                         |
| 프로젝트    | `project`, `project_user`, `user_enrolled_project`, `project_menu_setting`, `project_visitation`, `project_pushed_branch`, `project_transfer`, `recent_project`, `recently_visited_projects`, `favorite_project`, `favorite_organization` |
| 이슈        | `issue`, `issue_comment`, `issue_label`, `issue_label_category`, `issue_issue_label`, `issue_comment_voter`, `issue_voter`, `issue_event`, `issue_sharer`, `assignee`, `mention`, `favorite_issue`                                        |
| PR/리뷰     | `pull_request`, `pull_request_event`, `pull_request_commit`, `pull_request_reviewers`, `review_comment`, `comment_thread`, `comment_thread_n4user`                                                                                        |
| 게시판      | `posting`, `posting_comment`, `posting_issue_label`                                                                                                                                                                                       |
| 파일        | `attachment`                                                                                                                                                                                                                              |
| 알림        | `notification_event`, `notification_event_n4user`, `notification_mail`, `watch`, `unwatch`, `user_project_notification`                                                                                                                   |
| 기타        | `milestone`, `label`, `property`, `webhook`, `webhook_thread`, `commit_comment`                                                                                                                                                           |

### 5.3 Multi-DB 지원

| DB            | 지원 상태 | 비고                         |
| ------------- | --------- | ---------------------------- |
| MariaDB/MySQL | ✅ Day-1  | legacy Yona 기본 DB          |
| PostgreSQL    | ✅ Day-1  |                              |
| SQLite        | ✅ Day-1  | 개발/소규모 운영용           |
| H2            | deferred  | legacy 개발용, 우선순위 낮음 |

**검수 기준**: MySQL/MariaDB, PostgreSQL, SQLite 각각에서 schema `up`, schema `validate`, legacy-like fixture `adopt`, 핵심 repository smoke test가 통과해야 Day-1 지원으로 인정한다.

---

## 6. UI/UX Parity 규칙

### 6.1 레이아웃 기준

모든 화면의 레이아웃은 `yona-original/app/views/` 하위 Scala HTML 템플릿을 기준으로 한다.

| Legacy 템플릿                   | 용도              | 반드시 유지할 구조                             |
| ------------------------------- | ----------------- | ---------------------------------------------- |
| `layout.scala.html`             | 전체 앱 레이아웃  | 네비게이션 바, 사이드바, 메인 컨텐츠 영역      |
| `projectLayout.scala.html`      | 프로젝트 레이아웃 | 프로젝트 헤더 + 프로젝트 메뉴 + 컨텐츠         |
| `projectMenu.scala.html`        | 프로젝트 메뉴     | Code/Issues/Milestones/Board/PullRequests 순서 |
| `organizationLayout.scala.html` | 조직 레이아웃     | 조직 헤더 + 멤버/설정 메뉴 + 컨텐츠            |
| `siteLayout.scala.html`         | 관리자 레이아웃   | 관리자 전용 사이드 메뉴 + 컨텐츠               |
| `common/navbar.scala.html`      | 상단 네비게이션   | 프로젝트/조직/검색 + 사용자 메뉴               |
| `common/usermenu.scala.html`    | 사용자 드롭다운   | 알림/설정/로그아웃                             |
| `sidebar.scala.html`            | 사용자 사이드바   | 프로필/프로젝트/조직 요약                      |

### 6.2 URL 경로 규칙

모든 사용자 접근 URL은 legacy routes 파일을 따른다. 변경 금지.

**주요 경로 패턴**:

```
/                                → 홈
/users/loginform                 → 로그인
/users/signupform                → 회원가입
/me                              → Workspace (신규 - legacy에서는 /:username)
/:owner/:project                 → 프로젝트 홈
/:owner/:project/issues          → 이슈 목록
/:owner/:project/issue/:number   → 이슈 상세
/:owner/:project/posts           → 게시판
/:owner/:project/post/:number    → 게시글 상세
/:owner/:project/pullRequests    → PR 목록
/:owner/:project/pullRequest/:id → PR 상세
/:owner/:project/code            → 코드 브라우저
/:owner/:project/commits         → 커밋 이력
/:owner/:project/milestones      → 마일스톤
/organizations/:name             → 조직 홈
/search                          → 검색
/sites/*                         → 관리자
```

**deviation 허용 사항**:

- `/me` 경로: legacy에는 현재 사용자 workspace도 `/:username` 경로였으나, Rust 구현은 현재 사용자 workspace shortcut으로 `/me`를 유지한다. public profile `/:user` parity는 별도 Feature gap으로 추적한다. Provenance: `docs/provenance/core-parity-audit.md`.
- 설정 경로: legacy `/user/editform`은 canonical user-facing route로 유지한다. `/me/settings/*`가 존재하는 경우 내부 alias 또는 redirect로만 취급하며 legacy route를 대체하지 않는다.

### 6.3 UI 텍스트 규칙

| 항목           | 규칙                                                                     |
| -------------- | ------------------------------------------------------------------------ |
| 메뉴 레이블    | legacy `messages` 파일 기준 (한국어: `messages.ko-KR`, 영어: `messages`) |
| 버튼 텍스트    | legacy 뷰 템플릿의 텍스트와 동일                                         |
| 에러 메시지    | legacy 뷰/컨트롤러의 에러 텍스트와 동일                                  |
| placeholder    | legacy 뷰의 placeholder와 동일                                           |
| 빈 상태 메시지 | legacy 뷰의 empty state 텍스트와 동일                                    |

### 6.4 페이지네이션 규칙

legacy Yona는 `pageNum` 기반 offset 페이지네이션을 사용한다.

- 프로젝트 목록: 10개/페이지
- 이슈 목록: 15개/페이지 (기본)
- 게시판 목록: 15개/페이지 (기본)
- PR 목록: 15개/페이지 (기본)
- 조직 목록: 30개/페이지
- 검색 결과: 10개/페이지
- 커밋 이력: 10개/페이지

이 수치는 legacy 기본값과 동일하게 유지한다.

### 6.5 정렬 규칙

- 이슈 목록: 기본 정렬 `createdDate DESC` (최신순) — legacy 동일
- 게시판 목록: 공지 `DESC` → `createdDate DESC` — legacy 동일
- PR 목록: `createdDate DESC` — legacy 동일
- 커밋 이력: `commitDate DESC` — legacy 동일
- 멤버 목록: admin → member → login_id ASC — legacy 동일
- 알림: `createdDate DESC` — legacy 동일

---

## 7. 검증 체계

### 7.1 테스트 계층

| 계층            | 도구                             | 범위                       |
| --------------- | -------------------------------- | -------------------------- |
| Domain unit     | `cargo test -p yona-domain`      | ACL, validation, invariant |
| Persistence     | `cargo test -p yona-persistence` | repository CRUD, query     |
| Server contract | `cargo test -p yona-server`      | HTTP/REST endpoint         |
| Migration       | `cargo test -p yona-migration`   | schema adopt/up/validate   |
| Frontend unit   | `pnpm --dir frontend test`       | component, API client      |
| Frontend parity | `src/route-parity.spec.tsx`      | route 커버리지             |
| E2E             | `pnpm --dir frontend test:e2e`   | 브라우저 플로우            |
| Multi-DB smoke  | `cargo test db_matrix*`          | SQLite/PostgreSQL/MySQL    |

### 7.2 기능별 검수 절차

각 Feature Group의 검수 기준 체크리스트를 **모두 통과**해야 해당 기능 구현 완료로 인정한다.

추가로:

1. legacy 대응 route가 존재하면 해당 route의 HTTP 응답 코드가 동일해야 한다
2. legacy 뷰 템플릿의 핵심 HTML 구조(헤더, 목록, 사이드바 등)가 React 컴포넌트에 반영되어야 한다
3. legacy test 파일(`yona-original/test/`)의 테스트 시나리오가 Rust/React 테스트로 커버되어야 한다
4. Feature Parity Evidence가 구현 PR/커밋/문서 중 하나에 남아야 하며, `legacy와 동일`이라는 검수 문구는 evidence 없이는 완료로 인정하지 않는다

### 7.3 회귀 방지

- 이미 통과한 기능의 테스트가 새 작업으로 인해 깨지면 안 된다
- `cargo test` 전체 + `pnpm --dir frontend test` + `pnpm --dir frontend build` 가 항상 green이어야 한다

---

## 8. Phase별 완료 기준 (Definition of Done)

### Phase 종료 조건

각 Phase는 다음 조건을 모두 충족해야 종료된다:

1. 해당 Phase의 모든 Feature Group 기능이 구현됨
2. 같은 Phase에 남은 `gap`은 Phase 종료 blocker다. 종료하려면 구현하거나, 이후 Phase/deferred로 재분류하고 provenance + phase plan에 사유를 기록해야 한다
3. 해당 Phase의 모든 검수 기준 체크리스트 통과
4. `cargo test` 전체 green
5. `pnpm --dir frontend test` green
6. `pnpm --dir frontend build` green
7. provenance 문서에 legacy → Rust 매핑 기록 완료
8. 신규 `gap`/`deviation` 항목이 이 문서와 provenance에 반영됨

### 1차 PoC 종료 조건 (전체)

1. FG-01 ~ FG-18의 Phase 1~6 해당 기능이 모두 구현됨
2. legacy `application.conf.default`의 핵심 설정이 `yona.toml`로 migration 가능
3. 검증을 통과한 기존 MariaDB 데이터를 `adopt` 모드로 인식하여 무손실 서비스 가능
4. `git clone`/`git push`가 정상 동작
5. single binary 빌드 후 실행 시 frontend 포함 전체 앱이 서비스됨
6. Docker 이미지 빌드 및 실행 가능

---

## 9. 현재 구현 상태 요약 (2026-05-06 기준)

Phase -1 REST pivot 이후 현재 구현 상태 표는 다음 신규 phase의 입력 기준이다.
기존 runtime ConnectRPC surface와 frontend ConnectRPC client/dependency는 제거되었고,
`proto/`는 historical message schema snapshot으로만 남는다.

| 영역              | 상태              | 세부                                                             |
| ----------------- | ----------------- | ---------------------------------------------------------------- |
| HTTP 서버         | ✅ 구현           | Axum 기반. `/api/v1` REST, session bootstrap, static asset delivery |
| 세션/인증         | ✅ 구현           | bcrypt, CSRF, 세션 쿠키                                          |
| DB 엔티티         | ✅ 구현           | 60+ SeaORM 모델, legacy 스키마 전체 매핑                         |
| Repository 메서드 | ✅ 구현           | 100+ 쿼리 메서드                                                 |
| Migration         | ✅ 구현           | adopt/up/validate 모드, multi-DB                                 |
| 인증 플로우       | ✅ 구현           | 로그인/가입/비밀번호 찾기/이메일 인증                            |
| Workspace         | ✅ 구현           | 대시보드, 설정, 이메일, 토큰, 아바타                             |
| 조직 CRUD         | ✅ 구현           | 생성/수정/삭제/멤버/가입                                         |
| 프로젝트 CRUD     | ✅ 구현           | 생성/수정/설정/감시/즐겨찾기                                     |
| 이슈              | ✅ Phase 2A 구현  | CRUD, 댓글, 타임라인, watch/vote/assignee, mass update, Markdown |
| 게시판            | ❌ 미구현         | placeholder route만                                              |
| 라벨/마일스톤     | ✅ 구현           | 라벨/카테고리 관리, 마일스톤 CRUD/state 구현                     |
| 코드 브라우저     | 🔶 Phase 3A 구현  | read-only Git 폴더/파일 보기, 브랜치 선택기                      |
| Git Smart HTTP    | ❌ 미구현         |                                                                  |
| PR/리뷰           | ❌ 미구현         | placeholder route만                                              |
| 검색              | ❌ 미구현         | `crates/search` placeholder                                      |
| 알림              | 🔶 기본만         | SMTP 인프라, 프로젝트 알림 토글                                  |
| 웹훅              | ❌ 미구현         | DB 엔티티만 존재                                                 |
| 관리자            | ❌ 미구현         |                                                                  |
| 마크다운          | 🔶 이슈 범위 구현 | Issue body/comment sanitized HTML projection                     |
| REST API          | 🔶 부분           | `/api/v1` application API는 Phase 1~3A 구현 흐름을 커버. `/-_-api/v1` legacy external API parity는 후속 |
| Frontend 라우트   | ✅ 구현           | legacy issueform/editform 포함                                   |
| Frontend 테스트   | 🔶 부분           | API client, route parity, E2E smoke                              |
| i18n              | ❌ 미구현         | hardcoded English/Korean                                         |
| Email 발송        | ✅ 구현           | Lettre SMTP, 인증/비밀번호 관련                                  |

---

## 10. 문서 거버넌스

### 10.1 Canonical Documents

| 문서                | 역할                        |
| ------------------- | --------------------------- |
| `AGENTS.md`         | 에이전트 실행 규칙 (최상위) |
| `SPEC.md` (이 문서) | 기술적 실행 명세            |
| `CLAUDE.md`         | 에이전트 context mirror     |
| `README.md`         | 프로젝트 개요               |

### 10.2 Mirror Documents

`docs/agents/*.md` — AGENTS.md와 SPEC.md의 실행 관점 요약

### 10.3 Provenance Documents

`docs/provenance/*` — legacy source → Rust target 매핑, gap/deviation 근거

### 10.4 Historical Document Rule

historical 문서(`docs/plans/*`, `docs/workflow/*`)는 삭제하지 않는다. 대신:

1. 제목 아래에 `historical`, `superseded`, `reference-only` 배너
2. 현재 기준처럼 읽히는 문구를 Rust pivot 이후 위치로 교체
3. 세부 실행 절차와 당시 판단 근거는 보존

---

## 부록 A: Legacy 설정 Migration 가이드 (Template)

> 이 부록은 1차 PoC 완료 시 실제 값으로 채워야 한다.

```toml
# yona.toml — legacy application.conf에서 변환

[site]
name = "Yona"                          # application.siteName
base_path = "/"                        # application.context
allow_anonymous_access = true          # application.allowsAnonymousAccess
guest_login_prefix = ""                # application.guest.user.login.id.prefix
show_user_email = true                 # application.show.user.email
langs = ["en-US", "ko-KR"]            # application.langs

[auth]
email_verification = false             # application.use.email.verification
signup_require_confirm = false         # signup.require.admin.confirm
social_login_only = false              # application.use.social.login.only

[database]
url = "mysql://user:pass@127.0.0.1:3306/yona"  # db.default.url (jdbc: prefix 제거)

[smtp]
host = "smtp.gmail.com"               # smtp.host
port = 465                            # smtp.port
ssl = true                            # smtp.ssl
user = ""                             # smtp.user
password = ""                         # smtp.password

[notification]
mail_enabled = true                    # notification.bymail.enabled
mail_interval = "60s"                  # application.notification.bymail.interval
mail_delay = "180s"                    # application.notification.bymail.delay
recipient_limit = 100                  # application.notification.bymail.recipientLimit
hide_address = true                    # application.notification.bymail.hideAddress
draft_time = "30s"                     # application.notification.draft-time

[project]
default_scope = "public"               # project.default.scope.when.create
default_menus = ["issue", "milestone", "board"]  # project.creation.default.menus
max_file_size = 2147483454             # application.maxFileSize
```

---

## 부록 B: Legacy 라우트 전체 대조표

> 이 부록은 legacy `conf/routes` 파일의 모든 라우트가 Rust + React에서 어떻게 대응되는지를 추적한다.
> `status` 값: `implemented`, `gap`, `deferred`, `not-needed`
> `Rust 대응`은 runtime handler 또는 frontend route 기준이다. `proto/` method names are historical only and are not the application contract.

| Legacy Route                       | Method   | Rust 대응                             | Frontend Route                                | Status             |
| ---------------------------------- | -------- | ------------------------------------- | --------------------------------------------- | ------------------ |
| `/`                                | GET      | SPA fallback                          | `__root.tsx`                                  | implemented        |
| `/users/loginform`                 | GET      | SPA                                   | `legacy-auth/users/loginform`                 | implemented        |
| `/users/signupform`                | GET      | SPA                                   | `legacy-auth/users/signupform`                | implemented        |
| `/users/login`                     | POST     | `POST /api/v1/auth/sign-in`           | —                                             | implemented        |
| `/users/signup`                    | POST     | `POST /api/v1/auth/register`          | —                                             | implemented        |
| `/lostPassword`                    | GET/POST | `POST /lostPassword` direct           | `lostPassword/`                               | implemented        |
| `/resetPassword`                   | GET/POST | `POST /resetPassword` direct          | `resetPassword/`                              | implemented        |
| `/verify/:loginId/:code`           | GET      | `POST /api/v1/auth/verify`            | `verify/$loginId/$code`                       | implemented        |
| `/logout`                          | GET      | `POST /api/v1/auth/sign-out`          | —                                             | implemented        |
| `/me`                              | GET      | SPA                                   | `me/`                                         | implemented        |
| `/user/editform`                   | GET      | SPA                                   | `user/editform/`                              | implemented        |
| `/projects`                        | GET      | `GET /api/v1/projects`                | `projects/`                                   | implemented        |
| `/projectform`                     | GET      | SPA                                   | `projects/new`                                | implemented        |
| `/:owner/:project`                 | GET      | `GET /api/v1/owners/:owner/projects/:project` | `$owner/$projectName/`                        | implemented        |
| `/:owner/:project/settingform`     | GET      | `GET /api/v1/owners/:owner/projects/:project/settings` | `$owner/$projectName/settingform`             | implemented        |
| `/:owner/:project/issues`          | GET      | `GET /api/v1/projects/:owner/:project/issues` | `$owner/$projectName/issues`                  | implemented        |
| `/:owner/:project/issue/:number`   | GET      | `GET /api/v1/projects/:owner/:project/issues/:number` | `$owner/$projectName/issue/$issueNumber`      | implemented        |
| `/:owner/:project/posts`           | GET      | —                                     | `$owner/$projectName/posts`                   | gap                |
| `/:owner/:project/pullRequests`    | GET      | —                                     | `$owner/$projectName/pullRequests`            | gap                |
| `/:owner/:project/code`            | GET      | `GET /api/v1/projects/:owner/:project/code` | `$owner/$projectName/code`                    | implemented (기본) |
| `/:owner/:project/code/:branch/*`  | GET      | `GET /api/v1/projects/:owner/:project/code?branch=&path=` | `$owner/$projectName/code/$branch/$`          | implemented (기본) |
| `/:owner/:project/commits`         | GET      | —                                     | —                                             | gap                |
| `/:owner/:project/milestones`      | GET      | `GET /api/v1/owners/:owner/projects/:project/milestones` | `$owner/$projectName/milestones`              | implemented        |
| `/:owner/:project/branches`        | GET      | —                                     | —                                             | gap                |
| `/organizations/new`               | GET      | SPA                                   | `organizations/new`                           | implemented        |
| `/organizations/:name`             | GET      | `GET /api/v1/organizations/:name`     | `organizations/$organizationName/`            | implemented        |
| `/organizations/:name/members`     | GET      | `GET /api/v1/organizations/:name/members` | `organizations/$organizationName/members`     | implemented        |
| `/organizations/:name/settingform` | GET      | `GET /api/v1/organizations/:name/settings` | `organizations/$organizationName/settingform` | implemented        |
| `/organizations/:name/issues`      | GET      | `GET /api/v1/organizations/:name/issues` | `organizations/$organizationName/issues`      | implemented        |
| `/organizations/:name/boards`      | GET      | —                                     | `organizations/$organizationName/boards`      | gap                |
| `/search`                          | GET      | —                                     | `search/`                                     | gap                |
| `/files`                           | POST     | `POST /files` direct                  | —                                             | implemented        |
| `/files/:id`                       | GET      | `GET /files/:id` direct               | —                                             | implemented        |
| `/notification`                    | GET      | —                                     | —                                             | gap                |
| `/sites/*`                         | GET      | —                                     | —                                             | gap                |
| `/-_-api/v1/*`                     | Various  | —                                     | —                                             | gap                |
| `/svn/*`                           | Various  | —                                     | —                                             | deferred           |
| `/authenticate/:provider`          | GET      | —                                     | —                                             | deferred           |

---

## 부록 C: Existing Proto Schema Snapshot

`proto/yona/pilot/v1/pilot.proto`는 REST pivot 이전 임시 구현의 message schema snapshot이다.
Phase -1 이후 runtime `/rpc` registration, frontend ConnectRPC generated client, and ConnectRPC package dependencies are removed.
서버 build는 필요한 legacy message shape만 `buffa-codegen`으로 생성한다.

Debug-only test note: `debug_assertions` 빌드에서는 과거 method-name 기반 contract tests를 REST route로 우회시키기 위해 `/api/v1/_pilot/{method_name}` harness가 있다. 이 route는 application contract가 아니며 frontend/runtime code에서 사용하면 안 된다.

| Snapshot category | REST replacement status |
| ----------------- | ----------------------- |
| Auth/session      | `/api/v1/session`, `/api/v1/auth/*` implemented |
| Workspace         | `/api/v1/workspace/**` implemented |
| Organization/project | `/api/v1/organizations/**`, `/api/v1/owners/:owner/projects/**`, `/api/v1/projects` implemented |
| Issue core/meta   | `/api/v1/projects/:owner/:project/issues/**`, `/api/v1/organizations/:org/issues`, `/api/v1/user/issues`, `/api/v1/owners/:owner/projects/:project/assignable-users`, `/api/v1/owners/:owner/projects/:project/issues/:number/**` implemented |
| Label/milestone   | `/api/v1/owners/:owner/projects/:project/labels/**`, `/api/v1/owners/:owner/projects/:project/milestones/**` implemented |
| Code browser      | `GET /api/v1/projects/:owner/:project/code` implemented |

**새 runtime API는 REST로 구현할 영역**:

- Issue follow-up: sharable user autocomplete/search, issue sharer timeline/notification semantics, mention autocomplete/notification semantics, legacy external `/-_-api/v1` issue API parity
- Board: posting list/detail/create/update/delete/comment flows
- Label follow-up: copyLabels Phase 6 and legacy external label/project API parity
- Milestone follow-up: migration export and search milestone result type
- Code follow-up: raw file/download/image routes, syntax highlighting, commit history/detail, branch admin, compare, Smart HTTP
- PullRequest: create/detail/list/merge/close/reopen/review comment/reviewer lifecycle
- Search: global/project/organization search
- Notification: list/read state/mail notification surface
- Webhook: project webhook CRUD
- Admin: users/projects/site-admin/account-lock/test-mail surfaces
- Markdown: app-level markdown preview API if legacy evidence requires it

---
