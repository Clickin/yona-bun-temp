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
- legacy `/messages.js` JavaScript message lookup route는 base-path와 anonymous access gate를 통과해 `Messages(key, ...)` global을 제공한다
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
| `application.login.page.loginId.placeholder` | `YONA_AUTH_LOGIN_ID_PLACEHOLDER`                   | 로그인 ID 입력 placeholder   |
| `application.login.page.password.placeholder` | `YONA_AUTH_PASSWORD_PLACEHOLDER`                   | 비밀번호 입력 placeholder    |
| `session.maxAge`                          | `YONA_SESSION_TIMEOUT_SECONDS`                     | non-remember session timeout seconds |
| `application.show.user.email`              | `YONA_SHOW_USER_EMAIL`                              | browser runtime `showUserEmail`; defaults to legacy `true` |
| `application.allowed.sending.mail.domains` | `YONA_ALLOWED_MAIL_DOMAINS`                         |                              |
| `application.hostname`                     | `YONA_APPLICATION_HOSTNAME`                         | `smtp.domain` absent fallback for legacy sender address derivation |
| `db.default.url`                           | `YONA_DATABASE_URL`                                 | jdbc URL → standard URL 변환 |
| `smtp.host` / `smtp.port` / `smtp.ssl`     | `YONA_SMTP_HOST`, `YONA_SMTP_PORT`, `YONA_SMTP_SSL` |                              |
| `smtp.user` / `smtp.password` / `smtp.domain` | `YONA_SMTP_USER`, `YONA_SMTP_PASSWORD`, `YONA_SMTP_DOMAIN`, `YONA_SMTP_FROM` | sender address derives from `smtp.user` + `smtp.domain` when no explicit `SMTP_FROM`/`YONA_SMTP_FROM` override exists |
| `notification.bymail.enabled`              | `YONA_NOTIFICATION_MAIL_ENABLED`                    |                              |
| `application.notification.bymail.initdelay` | `YONA_NOTIFICATION_MAIL_INITIAL_DELAY`             | default 5000ms               |
| `application.notification.bymail.interval` | `YONA_NOTIFICATION_MAIL_INTERVAL`                   |                              |
| `application.notification.bymail.delay`    | `YONA_NOTIFICATION_MAIL_DELAY`                      | default 180000ms             |
| `application.notification.bymail.hideAddress` | `YONA_NOTIFICATION_MAIL_HIDE_ADDRESS`            | notification mail BCC mode   |
| `application.notification.bymail.recipientLimit` | `YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT`      | notification mail recipient partitioning |
| `application.notification.draft-time`       | `YONA_NOTIFICATION_DRAFT_TIME`                    | notification event merge window; default 30s |
| `application.issue-event.draft-time`        | `YONA_ISSUE_EVENT_DRAFT_TIME`                    | issue timeline event merge window; default 30s |
| webhook delivery retry count                 | `YONA_WEBHOOK_DELIVERY_RETRIES`                  | capped at 5 retries          |
| webhook private-network delivery opt-in      | `YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS`            | default false; SSRF guard    |
| `application.maxFileSize`                  | `YONA_MAX_FILE_SIZE`                                |                              |
| `project.default.scope.when.create`        | `YONA_PROJECT_DEFAULT_SCOPE`                        | public/protected/private     |
| `project.creation.default.menus`           | `YONA_PROJECT_DEFAULT_MENUS`                        | issue, milestone, board 등   |
| `application.langs`                        | `YONA_LANGS`                                        | i18n 지원 언어 목록          |

**검수 기준**: legacy `application.conf.default`의 모든 핵심 설정 키에 대응하는 환경변수 또는 TOML 키가 존재하고, 설정 migration 가이드 문서가 제공되어야 한다.

Deferred 기능의 설정 키는 1차 PoC에서 **설정 호환성**과 **기능 동작**을 분리한다.

- `YONA_AUTH_SOCIAL_LOGIN_ONLY` / `YONA_AUTH_SOCIAL_LOGIN_SUPPORT`: 설정은 파싱하고 auth UI capability에 반영한다. Social-login-only UI gating과 configured provider button rendering은 수행할 수 있지만, OAuth provider 로그인 플로우는 deferred다. provider가 없거나 미지원이면 조용히 무시하지 말고 warning/unsupported state를 message-key copy로 노출한다. `/authenticate/:provider`는 unsupported provider를 `/users/loginform?error=unsupported&provider=...`로 되돌려 로그인 화면에 명시 상태를 표시한다.
- `YONA_LANGS`: 설정은 파싱하고 browser runtime config의 `supportedLanguages`로 보존한다. 1차 PoC에서는 legacy copy parity를 우선하며 동적 i18n runtime 전환은 deferred다.
- `YONA_SHOW_USER_EMAIL`: legacy `application.show.user.email`처럼 기본값은 `true`이며, `false`일 때 공개 사용자 프로필과 `/me` user card의 email 표시를 숨긴다. 프로필/메일 설정 폼의 email 관리 기능은 이 표시 설정의 대상이 아니다.
- `YONA_PROJECT_DEFAULT_MENUS`: 설정은 프로젝트 생성 시 `project_menu_setting` 기본 row와 create-form checkbox 기본값에 반영한다. settings 화면은 legacy menu checkbox mutation으로 `project_menu_setting`을 갱신한다.
- `YONA_SMTP_HOST`, `YONA_SMTP_PORT`, `YONA_SMTP_SSL`, `YONA_SMTP_USER`, `YONA_SMTP_PASSWORD`, `YONA_SMTP_DOMAIN`: Rust mail 설정/발송 경로에서 기존 `SMTP_HOST`, `SMTP_PORT`, `SMTP_SSL`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_DOMAIN` 이름과 함께 인식하고, earlier reference compatibility를 위해 `SMTP_PASS`도 password alias로 유지한다. `SMTP_FROM` / `YONA_SMTP_FROM`이 없으면 legacy `Config.getEmailFromSmtp()`처럼 `smtp.user`가 이미 email이면 그대로 쓰고, 아니면 `smtp.user@smtp.domain`으로 sender address를 만든다. `smtp.domain`이 없으면 legacy `application.hostname`에 대응하는 `YONA_APPLICATION_HOSTNAME` / `APPLICATION_HOSTNAME` fallback을 사용하고, 그것도 없을 때만 `localhost`를 쓴다. `YONA_SMTP_SSL=true`는 legacy `smtp.ssl=true`처럼 SMTPS wrapper transport를 사용하고, 명시적 false는 plain SMTP transport를 사용한다. notification mail body는 legacy `notificationMail.scala.html`의 HTML shell, view link, resource-specific `/unwatch?resource.type=...&resource.id=...` footer link, settings footer link, reply-capable "Reply to this email directly or" view-link copy, and external-link `noreferrer` policy를 따르고, outbound notification mail은 legacy `HtmlEmail.setHtmlMsg`처럼 HTML MIME content로 발송한다. direct `/unwatch` resolves legacy resource aliases, enforces project READ access, records the unwatch, redirects HTML requests to the resource URL, and returns empty `200 OK` for JSON-preferred requests. mailbox reply threading은 DB-backed raw/parsed mailbox processing bridge로 covered이고, notification mail sets `Reply-To` plus-address details for reply-capable issue/board/review resources when `YONA_MAILBOX_IMAP_ADDRESS` is configured, with comment notifications targeting their parent issue/post/review-thread detail like legacy `NotificationMail.getReplyTo`. `YONA_MAILBOX_FETCH_COMMAND`가 설정되면 mailbox polling scheduler가 해당 executable을 주기 실행하고, stdout의 NUL-separated raw RFC822 message를 기존 raw mailbox pipeline으로 처리한다. `YONA_MAILBOX_IMAP_ADDRESS`, `YONA_MAILBOX_POLLING_ENABLED`, `YONA_MAILBOX_POLLING_INITIAL_DELAY`, and `YONA_MAILBOX_POLLING_INTERVAL`이 scheduler runtime을 제어한다.
- `YONA_UPDATE_METADATA_URL` / `YONA_UPDATE_METADATA_FILE`: site update 화면에서 JSON metadata의 `version`/`tag_name`과 `releaseUrl`/`html_url`을 읽어 live update-available branch를 채운다. 명시적 `YONA_UPDATE_LATEST_VERSION` / `YONA_UPDATE_VERSION` / `YONA_UPDATE_RELEASE_URL` override가 있으면 우선한다. `https://` update binary fetch는 기본 `curl` executable wrapper를 사용하며, 운영 환경에서 다른 fetcher가 필요하면 curl-style HTTP response bytes를 stdout으로 쓰는 `YONA_UPDATE_HTTPS_FETCH_COMMAND`로 대체할 수 있다.
- `YONA_WEBHOOK_DELIVERY_RETRIES`: webhook transient delivery failure retry count로 사용한다. legacy-compatible `WEBHOOK_DELIVERY_RETRIES` alias도 인식하며 runaway retry를 막기 위해 최대 5회로 제한한다.
- `YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS`: webhook HTTP/HTTPS delivery가 DNS 해석 후 loopback/private/link-local/unspecified/multicast endpoint를 기본 차단한다. 테스트/폐쇄망 운영에서 내부망 webhook이 필요하면 이 값을 true로 명시한다. legacy-compatible `WEBHOOK_ALLOW_PRIVATE_NETWORKS` alias도 인식한다. HTTPS delivery는 기본 `curl` executable wrapper를 사용하며, 운영 환경에서 다른 fetcher가 필요하면 body를 stdin으로 받고 curl-style HTTP response bytes를 stdout으로 쓰는 `YONA_WEBHOOK_HTTPS_DELIVERY_COMMAND` / `WEBHOOK_HTTPS_DELIVERY_COMMAND`로 대체할 수 있다.
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
| Phase 3  | 저장소 브라우저, Smart HTTP, 커밋 토론, VCS                                    | 🔶 Phase 3L 구현                              |
| Phase 4 | Pull Request, 코드 리뷰                              | 🔶 Phase 4B 구현                              |
| Phase 5 | 검색, 게시판, 알림, 연동(Webhook)                    | 🔶 Phase 5F 구현                              |
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
| Migration 도구 (Export CSV/Excel)        | 부가 기능; `/migration` legacy shell은 비활성 호환 상태만 제공 |
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
GET   /user/isUsed              → login ID/organization/reserved-word Ajax 검사
GET   /user/isEmailExist        → email Ajax 중복 검사
GET   /lostPassword             → 비밀번호 찾기 폼
POST  /lostPassword             → 비밀번호 찾기 이메일 발송
GET   /resetPassword            → 비밀번호 재설정 폼
POST  /resetPassword            → 비밀번호 재설정 처리
GET   /verify/:loginId/:code    → 이메일 인증 확인
GET   /logout                   → 로그아웃
GET   /users/logout             → 로그아웃
GET   /authenticate/:provider   → OAuth 시작
GET   /authenticate/:provider/denied → OAuth denied callback
GET   /_help                    → 도움말 FAQ
GET   /restricted               → 인증된 사용자 restricted sample page
GET   /messages.js              → legacy JavaScript message lookup
```

#### 기능 목록과 상태

| 기능                         | Legacy 동작                                                         | 현재 상태 | Phase |
| ---------------------------- | ------------------------------------------------------------------- | --------- | ----- |
| 로그인 (ID/Password)         | `UserApp.login()` → bcrypt 검증 → 세션 생성 → `redirectUrl`로 이동  | ✅ 구현   | 1     |
| 회원가입                     | `UserApp.newUser()` → ID/email 중복검사 → 생성 → 선택적 이메일 인증 | ✅ 구현, direct Ajax validator 포함 | 1     |
| 로그아웃                     | 세션 파기 후 Referer redirect                                      | ✅ direct `/logout`, `/users/logout` 구현 | 1     |
| 비밀번호 찾기 (이메일 발송)  | verification code 생성 → 이메일 발송 → 토큰 링크                    | ✅ 구현   | 1     |
| 비밀번호 재설정              | 토큰 검증 → 새 비밀번호 설정                                        | ✅ 구현   | 1     |
| 이메일 인증                  | verification code 확인 → 사용자 활성화                              | ✅ 구현   | 1     |
| 관리자 가입 승인             | `signup.require.admin.confirm=true` 시 LOCKED 생성 후 site admin이 활성화 | ✅ 구현   | 6     |
| Social Login (OAuth)         | GitHub, Google 등                                                   | deferred  | 2차   |
| LDAP 연동                    | LDAP 서버 인증                                                      | deferred  | 2차   |
| "Remember Me"                | 체크 시 30일 persistent session cookie, 미체크 시 browser-scoped session | ✅ 구현   | 1     |
| 세션 만료                    | 설정 가능한 세션 타임아웃                                           | ✅ 구현   | 6     |
| 게스트 사용자                | `application.guest.user.login.id.prefix`로 guest 계정 분류, 제한 권한 | 부분 구현: public project nonmember read gate 및 issue/board post/board comment/issue comment/fork/commit/review comment create gate 구현 | 2     |
| 익명 접근 제어               | `application.allowsAnonymousAccess` 설정                            | ✅ 구현 | 2     |
| 로그인 폼 커스텀 placeholder | `application.login.page.loginId.placeholder`, `application.login.page.password.placeholder` | ✅ 구현   | 1     |
| 도움말 FAQ                   | `HelpApp.help()` anonymous route renders `help/toc.scala.html` FAQ shell | ✅ 구현   | 1     |
| Restricted sample page        | `Restricted.index()` authenticated route renders current credential sample shell | ✅ 구현   | 1     |

#### 검수 기준

- [x] `/users/loginform` GET 시 로그인 폼이 legacy와 동일한 레이아웃으로 표시되고 legacy placeholder 설정을 반영한다
- [x] 공통 layout login dialog는 legacy `common/loginDialog.scala.html`의 `#loginDialog.modal.hide.loginDialog`, `#loginIdOrEmailD`, `#passwordD`, `#remember-meD`, `button.login`, `title.resetPassword`, `title.signup`, error row, social-login-only warning anchors, provider button scalar/asset output including default GitHub display name `github` and Google logo image/alt, and modal/alert close button `button.close` labels plus `×` close glyph를 보존한다
- [x] 공통 bad-request/forbidden/not-found shell은 legacy `error/badrequest_default.scala.html`, `error/forbidden_default.scala.html`, `error/notfound_default.scala.html`의 `.error-wrap`, icon class, message-key body(`error.badrequest`, `error.forbidden`, `error.notfound`), and `menu.home` button을 보존하고 임시 explanatory English lede를 렌더링하지 않는다
- [x] `/users/signupform`, `/lostPassword`, `/resetPassword` GET 화면은 legacy `.page.full`, `.center-wrap.tag-line-wrap.*`, `.signup-form-wrap.frm-wrap` / `.login-form-wrap.frm-wrap`, field id/name/class including signup `name="email"`, auth title/action keys(`title.loginFor`, `title.signupFor`, `title.resetPasswordFor`, `button.login`, `user.signupBtn`, `button.confirm`, `title.login`, `title.forgotpassword`), login fallback placeholders(`user.login.key`, `user.password`), reset-password `user.password` / `validation.retypePassword` placeholders, lost-password `site.mail.sended` / `site.mail.fail` / `site.resetPasswordEmail.invalidRequest` feedback, reset invalid `site.resetPasswordEmail.wrongUrl` copy, post-reset login `user.loginWithNewPassword`, signup-confirm `user.signup.requested`, email-verification `user.verification.mail.sent` feedback, `btns-row`, `act-row`, and social-login-only / signup-confirm / email-verification message-key anchors를 보존한다
- [x] 로그인 성공 후 `redirectUrl` 파라미터가 있으면 해당 URL로 이동한다 (legacy 동작 동일)
- [x] legacy direct `POST /users/login`과 `POST /users/signup` form submit은 legacy field name과 hidden `csrfToken`을 받아 세션 쿠키를 갱신하고 성공 redirect를 반환한다
- [x] 로그인 실패 시 REST/Connect error payload가 legacy Ajax 메시지 키(`user.login.invalid`, `user.login.required`)를 반환한다
- [x] `rememberMe=true` 로그인은 legacy 30일 유지 세션을 만들고, `rememberMe=false` 로그인은 브라우저 세션으로 남는다
- [x] `YONA_SESSION_TIMEOUT_SECONDS` 설정 시 non-remember 세션 쿠키와 서버 세션 저장소가 해당 초 단위 타임아웃을 적용하고, remember-me 세션은 legacy 30일 유지 정책을 보존한다
- [x] 회원가입 시 login ID, email 중복 검사가 동작한다
- [x] `/user/isUsed`와 `/user/isEmailExist`가 legacy signup Ajax JSON(`isExist`, `isReserved`)을 반환한다
- [x] `YONA_AUTH_SIGNUP_REQUIRE_CONFIRM=true` 시 신규 사용자는 legacy `LOCKED` 상태로 생성되고 site admin 활성화 대상이 된다
- [x] `YONA_GUEST_LOGIN_PREFIX`와 매칭되는 신규 login ID는 legacy `is_guest` 계정으로 생성된다
- [x] legacy `AccessControl`의 `project.isPublic() && !user.isGuest` READ 규칙을 app-runtime 프로젝트 READ ACL에 반영해 `is_guest` nonmember는 public 프로젝트를 읽을 수 없고 프로젝트 멤버십이 있으면 읽을 수 있다
- [x] legacy `WatchApp` / `WatchProjectApp` / `VoteApp` controller처럼 watch/unwatch/vote mutation은 READ 권한을 요구하므로 `is_guest` nonmember는 public project watch와 non-authored resource watch/vote/comment vote mutation에서 거부되고, issue author/assignee처럼 resource READ가 허용되는 경우만 통과한다
- [x] legacy `AccessControl.isProjectResourceCreatable`의 public 프로젝트 생성 예외 중 `ISSUE_POST`, `BOARD_POST`, `NONISSUE_COMMENT`, `ISSUE_COMMENT`, `FORK`, `COMMIT_COMMENT`, `REVIEW_COMMENT`를 반영해 인증된 guest nonmember도 public 프로젝트에 이슈, 게시물, 게시물 댓글, 이슈 댓글, fork, commit comment, PR review comment를 생성할 수 있다
- [x] legacy `AccessControl.isProjectResourceAllowed`처럼 project READ가 거부되는 `is_guest` nonmember라도 issue author/assignee이면 issue update/state mutation을 허용한다
- [x] legacy `OrganizationApp.newOrganization`의 `@GuestProhibit`처럼 `is_guest` 사용자는 새 organization 생성을 할 수 없다
- [x] legacy `OrganizationApp.validateForAddMember`처럼 `is_guest` 사용자는 organization member로 직접 추가할 수 없고, guest enrollment request/accept 흐름으로만 합류한다
- [x] legacy `ProjectApp.projects` / `OrganizationApp.orgList`의 `@GuestProhibit`처럼 `is_guest` 사용자는 public project/organization directory list에 접근할 수 없고 anonymous directory list는 유지한다
- [x] `/me`와 `/:user` user card는 legacy `user/view.scala.html`처럼 `is_guest` profile에 `.guest-user > .left-mark` `OUR GUEST` 마커를 표시한다
- [x] legacy `ProjectUser.isGuest` / `OrganizationUser.isGuest`처럼 project/organization enrollment request and cancel mutation은 실제 guest-mode 사용자에게만 허용하고 일반 비멤버는 `400 Bad Request`로 거부한다
- [x] legacy `PullRequestApp.validateBeforePullRequest`처럼 프로젝트 role이 없는 project guest/nonmember는 public 프로젝트를 읽을 수 있어도 pull request form-options, merge preflight, 생성 mutation에서 거부된다
- [x] `YONA_AUTH_EMAIL_VERIFICATION_ENABLED=true` 시 가입 후 이메일 인증 플로우가 작동한다
- [x] `YONA_ALLOW_ANONYMOUS_ACCESS=false` 시 인증/가입/비밀번호 재설정/verify/static/`/authenticate/:provider` 및 `/authenticate/:provider/denied` 경로를 제외한 anonymous page GET은 `/users/loginform?redirectUrl=...`로 이동하고, non-auth `/api/v1` 요청은 legacy `unauthorized` REST envelope를 반환한다
- [x] 비밀번호 찾기 이메일이 legacy 포맷과 동일하게 발송된다
- [x] `/verify/:loginId/:code` 경로가 인증 확인 후 legacy `user/verified.scala.html` success shell(`.page.full`, `.center-wrap.tag-line-wrap.reset-password`, `user.verified`, `user.verified.detail`)과 plain `Invalid verification` invalid state를 보여준다
- [x] `/_help`는 legacy `HelpApp.help()`처럼 anonymous route로 노출되고 `help/toc.scala.html`의 `site-breadcrumb-outer`, `site-breadcrumb-inner`, `page-wrap-outer`, `page-wrap`, `ul.qas`, `.qa`, `.question-wrap`, `href="#!/toggle"`, `.answer-wrap`, and Q/A icon anchors를 보존한다
- [x] `/restricted`는 legacy `Restricted.index()`처럼 인증을 요구하고 `restricted.scala.html`의 `Sshhh...don't tell anyone!` heading, YouTube iframe dimensions/source, current-user name/email, verified/unverified marker, provider/user-id line, and session-expiry line을 렌더링한다
- [x] `/messages.js`는 legacy `Application.jsMessages()`처럼 `application/javascript` 응답으로 `Messages(key, ...)` global과 `_messages` map을 제공하고 `YONA_ALLOW_ANONYMOUS_ACCESS=false`에서도 base-path 아래에서 접근 가능하다
- [x] CSRF 토큰이 모든 POST 요청에 포함된다

---

### FG-02: 사용자 Workspace (User Workspace & Settings)

**Legacy 참조**: `yona-original/app/controllers/UserApp.java`, `app/views/user/view.scala.html`, `edit.scala.html`, `edit_notifications.scala.html`, `edit_password.scala.html`, `edit_token.scala.html`, `edit_emails.scala.html`

**Legacy 라우트**:

```
GET   /:user                    → 사용자 프로필 (본인이면 Workspace)
POST  /:user                    → site manager 비밀번호 재설정 JSON
GET   /user/files               → 사용자 첨부파일 목록
GET   /user/editform            → 프로필 편집 폼
POST  /user/editform/token_reset → API 토큰 재생성
POST  /user/edit                → 프로필 수정
POST  /user/email               → 이메일 추가
DELETE /user/email/delete/:id   → 이메일 삭제
PUT   /user/email/setAsMain/:id → 주 이메일 설정
POST  /user/email/sendValidationEmail/:id → 이메일 인증 발송
GET   /user/email/confirm/:id/:token     → 이메일 인증 확인
POST  /user/resetPassword       → 비밀번호 변경
POST  /user/resetVisitedList    → 방문 기록 초기화
POST  /user/defultLoginPage     → 기본 랜딩 페이지 설정
GET   /user/sidebar             → legacy framed sidebar shell
GET   /user/usermenuTabContentList → global user menu tab fragment
GET   /notifications            → 알림 목록 full page
GET   /notification             → 알림 목록 incremental partial fragment
POST  /noti/toggle/:projectId/:notiType → 프로젝트별 알림 설정 토글
```

#### 기능 목록과 상태

| 기능                                        | Legacy 동작                                | 현재 상태    | Phase |
| ------------------------------------------- | ------------------------------------------ | ------------ | ----- |
| Workspace 대시보드                          | 이슈/PR/프로젝트 목록, 최근 방문, 즐겨찾기 | ✅ 구현      | 1     |
| 프로필 편집 (이름, 아바타)                  | 이름 변경, 아바타 업로드/크롭              | ✅ 구현, direct `/user/edit` 포함 | 1     |
| 비밀번호 변경                               | 기존 비밀번호 확인 → 새 비밀번호 설정      | ✅ 구현, direct `/user/resetPassword` 포함 | 1     |
| 이메일 관리 (추가/삭제/인증/주 이메일 설정) | 복수 이메일, 인증 흐름                     | ✅ 구현, direct `/user/email` 포함 | 1     |
| API 토큰 관리                               | 토큰 재생성                                | ✅ 구현, direct `/user/editform/token_reset` 포함 | 1     |
| 기본 랜딩 페이지 설정                       | 로그인 후 이동할 기본 경로                 | ✅ 구현, direct `/user/defultLoginPage` 포함 | 1     |
| 방문 기록 초기화                            | 최근 방문 프로젝트 목록 리셋               | ✅ 구현, direct `/user/resetVisitedList` 포함 | 1     |
| 프로젝트별 알림 설정                        | 프로젝트별 NEW_ISSUE, NEW_POSTING 등 토글  | ✅ 기본 구현 | 1     |
| 사용자 프로필 공개 보기                     | `/:user` 경로로 다른 사용자 프로필 조회    | ✅ 구현      | 2     |
| 사용자 활동 통계                            | 사용자별 이슈/게시글/댓글/투표 통계        | ✅ 기본 구현 | 5     |
| 사용자 첨부파일 목록                        | `/user/files`에서 본인 업로드 파일 검색/다운로드 | ✅ 구현      | 5     |

#### 검수 기준

- [x] `/me` 화면에서 legacy `menu.issue` / `menu.pullRequest` / `project.projects` 탭이 legacy와 동일 구조로 표시되고, user card는 legacy `user/view.scala.html` / `TemplateHelper.providerImg`의 connected-social-login `auth-provider-logo` shell과 Google provider image asset을 빈 fallback 문구 없이 보존하며, issue stream은 legacy `user/partial_issues.scala.html` row anchors(`ul.post-list-wrap.my-issues.row-fluid`, `.project-name-in-my-issues`, `.title-cell`, `.item-count-groups`, `.author-cell`, `.meta-cell`, `.for-subtask-progressbar`, `.child-issue-list`)를 보존한다. Empty streams use legacy `userinfo.daysAgo.prefix issue.is.empty`, `userinfo.daysAgo.prefix pullRequest.is.empty`, `project.is.empty`, and user-menu project-list `div.no-result.tab-pane.user-ul` / `title.no.results` copy.
- [x] `/me`와 public profile user card/day filter는 legacy `user/view.scala.html` labels를 따른다: `userinfo.editProfile`, `userinfo.since`, `user.connected.social.login`, `userinfo.daysAgo.prefix`, `userinfo.daysAgo.suffix` without temporary `Edit Profile` / `Since` / `Connected Social Login` / `Last N days` copy.
- [x] `/me`와 public profile Pull Requests stream은 legacy `user/partial_pullRequests.scala.html` scalar/shell을 따른다: project `.avatar-wrap.mlarge` link shell, 숫자-only `.post-id`, contributor `.infos-link-item` tooltip scalar, created/updated date title scalar over the visible date label, `issue.noAuthor` fallback, comment icon count link, receiver avatar/empty-avatar shell with `data-original-title`, and `pullRequest.state.*` state labels without temporary `Contributor:` / `Reviewer:` / `Comments:` / raw state prefixes.
- [x] `/me`와 public profile Projects stream은 legacy `user/partial_projectlist.scala.html` scalar/shell을 따른다: `project.onmember` icon/strong shell, owner link, created date title scalar, optional `project.codeUpdate` title scalar, and stats badge shell without temporary `Owner:` / `Created` / `Updated` / `State:` / `Members:` / `Watchers:` prefixes.
- [x] `/me` private footer/sidebar controls use legacy `common/mySeriesMenuTab.scala.html` / `common/usermenu.scala.html` keys (`button.setDefaultLoginPage`, `button.setDefaultLoginPage.desc`, `title.favorite`, `title.recently.visited`, `title.logout`) without temporary `Default landing` / `Save default landing` / `Favorite projects` / `Recent projects` / `Sign out` labels.
- [x] `/:user` 공개 프로필은 legacy `user/view.scala.html`의 사용자 카드, `menu.issue` / `menu.pullRequest` / `project.projects` 탭, issue/PR/project empty labels, `user/partial_issues.scala.html` row anchors plus no-author/no-assignee fallback spans, `user/partial_pullRequests.scala.html` project avatar/contributor/date/receiver scalar anchors, 프로젝트 리스트 class anchor를 유지하고 공개 READ 가능한 프로젝트만 노출한다
- [x] `GET /api/v1/users/:loginId/statistics`는 legacy `UserApi.statistics`의 `issue`, `posting`, `assignedIssue`, `issueComment`, `postingComment`, `issueVoter`, `issueCommentVoter` count 필드를 app-runtime REST로 제공한다
- [x] `/user/files`는 legacy `userFiles.scala.html` 화면의 `common/mySeriesMenuTab.scala.html` nav tabs including the `/notifications` notification-tab href, 검색 폼 with empty `value=""` input, `.attachment-files` 목록, preview/download/location/date anchors including `.file-download a > button.ybtn > .yobicon-cloud-download`, legacy `filetype.js` image/README/archive/Office/PDF filename icon classes, `.attachment-file-detail.hover` blue border state, `pageNum` pagination links, and 50-item page size를 유지하고 `/api/v1/workspace/files`로 현재 사용자의 첨부 파일을 검색/페이지네이션한다. `/user/issues` personal aggregate list keeps legacy `my_partial_list.scala.html` author cell href/title scalar by linking author display names to `/:loginId` with `title=loginId` when author identity is available.
- [x] `/user/editform/**` settings shell은 legacy `site-breadcrumb-outer` / `site-breadcrumb-inner` breadcrumb, `page-wrap-outer` / `page-wrap`, `partial_edit_tabmenu`의 `nav nav-tabs mt20`, active tab, and `userinfo.*` tab labels를 보존하며 임시 `Yona Rust Workspace` heading을 렌더링하지 않는다
- [x] `/user/editform/**` settings body는 legacy `user/edit.scala.html`, `edit_password.scala.html`, `edit_notifications.scala.html`, `edit_emails.scala.html`, and `edit_token.scala.html`의 form/table/modal anchors를 보존한다: `#frmBasic`, `#frmAvatar`, `.avatar-frm`, `#avatarCropWrap`, `.reset-user-visited-list`, `#frmPassword`, `#notification-projects`, `.tab-content`, `.form-inline.inner-bubble`, `.table.mt20`, `.token-generate`, and legacy message-key labels/buttons/avatar validation (`user.avatar.onlyImage`, `user.avatar.uploadError`) without temporary English profile/password/email/token copy or query-driven email validation status paragraphs.
- [x] Project/organization enrollment controls preserve legacy `project/header.scala.html` / `organization/header.scala.html` scalar keys (`organization.member.enrollment.title`, `organization.member.enrollment.help.*`, `button.new.enrollment`, `button.cancel.enrollment`) instead of temporary English request/cancel/help copy.
- [x] `/projects` public project directory cards preserve legacy `project/list.scala.html` scalar shell: project logo anchor shell (`.owner-avatar-wrap > a[href] > img[alt=projectName]`), private project `yobicon-lock` scalar, owner profile link, created-date title scalar, optional `project.codeUpdate`, public-only `project.onmember` / `project.onwatching` icon/strong stats, and `/api/v1/projects` exposes the required created/member/watch metadata without using `proto/` as a new runtime contract source.
- [x] `/orgs` organization directory cards preserve legacy `organization/list.scala.html` avatar shell (`.owner-avatar-wrap > a[href] > img[alt=organizationName]`) instead of temporary `.project-avatar` / empty-alt image output.
- [x] Project header/action/menu controls preserve legacy `project/header.scala.html` / `projectMenu.scala.html` / `project/home.scala.html` scalar/icon output (`title.favorite` star shell, `project.watch`, `project.unwatch`, `project.watcher.title`, `project.members`, menu-name keys and count badges without temporary title tooltips) instead of temporary English project action labels.
- [x] Project home overview/action labels preserve legacy `project/home.scala.html` scalar keys (`button.edit`, `project.dashboard`) instead of temporary `Edit overview` / `Project actions` copy.
- [x] Organization leave controls preserve legacy `organization/view.scala.html` scalar key `organization.member.leave` instead of temporary `Membership` / `Leave the group` copy.
- [x] Project clone URL controls preserve legacy `project/home.scala.html` scalar key `code.copyUrl` instead of temporary `Clone URL` copy.
- [x] Project home tab/right-pane scalar UI preserves legacy `project/home.scala.html` / `milestone/partial_status.scala.html` output: `project.history.recent`, `project.dashboard`, `.milestone-info`, due-date label, progress bar, and closed/total issue ratio without temporary `Recent history` / `Dashboard` / `Current milestone` summary copy.
- [x] 프로필 편집에서 아바타 업로드 시 `/files` 엔드포인트로 멀티파트 업로드 후 크롭이 동작한다
- [x] 프로필 수정과 복수 이메일 추가/삭제/인증/주 이메일 설정이 모두 동작하고 legacy direct profile/email mutation routes가 `/user/editform` redirect를 반환한다
- [x] 프로젝트별 알림 토글이 legacy의 `NEW_COMMENT` 기본 off 동작을 따른다
- [x] API 토큰 재생성이 동작하고 새 토큰이 표시된다

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
| 조직 게시판 목록             | 조직 전체 프로젝트의 게시글 집계 | ✅ Phase 5B 구현        | 5     |
| 조직 PR 목록                 | 조직 전체 프로젝트의 PR 집계     | ✅ Phase 4A 구현        | 4     |
| 조직 내 검색                 | 조직 범위 검색                   | ✅ Phase 5C 구현        | 5     |

#### 검수 기준

- [x] 조직 이름 유효성: 영숫자, 대시, 밑줄, 마침표만 허용. 공백 불가. 길이 제한.
- [x] 조직 생성/설정 폼은 legacy wrapper와 주요 form anchor를 보존한다 (`name="new-org"`, `#name`, `#descr`, `#saveSetting`, `name="update-org"`, `#logoPath`, `#project-name`, `#project-desc`, `#save`)
- [x] 조직 설정 logo upload는 legacy `ORGANIZATION` attachment container로 승격되고 organization detail/container `logoUrl`과 public file URL로 렌더링된다.
- [x] 조직 공통 화면은 legacy `organizationLayout` / `organization/header.scala.html` / `organization/menu.scala.html`의 header/menu-before-content wrapper order, `.project-header-outer`, `.project-header-inner`, `.project-header-wrap`, `.project-header-avatar`, `.group-title-head`, `.project-menu-outer`, `.project-menu-inner`, `.project-menu-nav.project-menu-gruop`, home/issue/board/PR active state, `title.organizationHome` / `menu.issue` / `menu.board` / `menu.pullRequest` labels, and cog-only setting link with blind `menu.admin`을 보존한다.
- [x] 조직 홈에서 소속 프로젝트가 legacy `organizationLayout` / `organization/header.scala.html` / `organization/menu.scala.html` / `organization/view.scala.html` wrapper order를 따라 header/menu를 `.page-wrap-outer` 밖에 렌더링하고, 본문은 `.page-wrap-outer` / `.project-page-wrap` 안에 `.project-home-header`, `.project-header-outer`, `.project-header-inner`, `.project-header-wrap`, `.project-header-avatar`, `.group-title-head`, `.project-util-wrap`, `#enrollBtn`, `ul.all-projects > li.project`, `.info-wrap`, `.owner-avatar-wrap`, `.header`, `.desc`, `.name-tag`, `.stats-wrap`, right-pane roster bubble anchors로 표시된다.
- [x] `/orgs` public organization directory preserves legacy `organization/list.scala.html` tab labels, `site.organization.filter` placeholder, icon-only search button, `organization.is.empty` error state, `ul.all-projects`, and non-empty `div#pagination` placeholder.
- [x] 조직 멤버 관리 화면은 legacy `organization/members.scala.html` shell anchors (`#addNewMember`, `.members.project.row-fluid`, `.member-setting`, role dropdown apply action, delete modal `#alertDeletion`, enrollment `.enrollAcceptBtn`)를 보존한다.
- [x] 멤버 정렬: org admin → org member → login_id ASC → 대기 요청 순 (legacy 동작)
- [x] 삭제 시 프로젝트가 존재하면 삭제 불가 (legacy guard 동작)
- [x] 가입 요청은 인증된 사용자이면서 현재 멤버가 아닌 경우에만 가능

---

### FG-04: 프로젝트 (Project)

**Legacy 참조**: `yona-original/app/controllers/ProjectApp.java`, `app/views/project/*.scala.html`, `app/models/Project.java`

**Legacy 라우트**:

```
GET   /projects                       → 프로젝트 목록 (공개)
GET   /projectform                    → 프로젝트 생성 폼
GET   /_import                        → Git 프로젝트 가져오기 폼
POST  /_import                        → Git 프로젝트 가져오기 실행
POST  /projects                       → 프로젝트 생성
GET   /:owner/:project                → 프로젝트 홈
GET   /:owner/:project/settingform    → 프로젝트 설정
POST  /:owner/:project/setting        → 프로젝트 설정 저장
DELETE /:owner/:project/delete        → 프로젝트 삭제
GET   /:owner/:project/members        → 프로젝트 멤버
POST  /:owner/:project/members        → 멤버 추가
POST  /:owner/:project/member/:id/edit → 멤버 역할 변경
DELETE /:owner/:project/member/:id/delete → 멤버 삭제
GET   /info/leave/:owner/:project      → 현재 사용자 프로젝트 탈퇴
GET   /:owner/:project/watchers       → 프로젝트 감시자
POST  /:owner/:project/watch          → 감시 시작
POST  /:owner/:project/unwatch        → 감시 해제
GET   /:owner/:project/webhooks       → 웹훅 목록
POST  /:owner/:project/webhooks       → 웹훅 추가
DELETE /:owner/:project/webhooks/:id  → 웹훅 삭제
GET   /:owner/:project/transfer       → 프로젝트 이관 폼
POST  /:owner/:project/transfer       → 프로젝트 이관
GET   /project/transfer/:id/:key      → 프로젝트 이관 수락
POST  /:owner/:project/enroll         → 프로젝트 가입 요청
POST  /:owner/:project/cancel/enroll  → 프로젝트 가입 취소
GET   /:owner/:project/statistics     → 프로젝트 통계(legacy projectLayout + Under Construction shell)
GET   /:owner/:project/changeVCS      → VCS 변경 폼
POST  /:owner/:project/changeVCS      → VCS 변경
```

#### 기능 목록과 상태

| 기능                 | Legacy 동작                                        | 현재 상태         | Phase |
| -------------------- | -------------------------------------------------- | ----------------- | ----- |
| 프로젝트 목록 (공개) | 검색, 페이지네이션(10개), 메타데이터, 로고, 멤버수 | ✅ 구현           | 1     |
| 프로젝트 생성        | owner 선택(개인/조직), 이름, VCS 타입, 공개범위    | ✅ legacy shell + VCS 구현 | 1     |
| Git 프로젝트 가져오기 | 원격 Git URL, 저장소 인증, owner, 이름, 공개범위    | ✅ legacy shell + native clone mutation 구현 | 3     |
| 프로젝트 홈          | overview(README), 최근 활동, 코드 링크             | ✅ 기본 구현(`tabId` history/dashboard shell 및 `partial_readme` empty fallback 보강) | 1     |
| 프로젝트 설정        | 이름/설명/공개범위 변경, 메뉴 토글                 | ✅ 구현           | 1     |
| 프로젝트 삭제        | 확인 + 삭제                                        | ✅ 구현           | 2     |
| 멤버 관리            | 멤버 추가/삭제/역할변경                            | ✅ 구현           | 2     |
| 감시자 (Watchers)    | 프로젝트 감시/해제, 감시자 목록                    | ✅ 구현           | 1     |
| 즐겨찾기             | 프로젝트 즐겨찾기 토글                             | ✅ 구현 + user-menu favorite helpers | 1     |
| 가입 요청            | 비멤버가 가입 요청/취소                            | ✅ 구현           | 1     |
| 웹훅 관리            | CRUD, event type, secret                           | ✅ CRUD 구현      | 5     |
| 프로젝트 이관        | 다른 owner로 이관                                  | ✅ request/accept 구현 | 6     |
| VCS 변경             | Git ↔ SVN                                          | ✅ legacy shell + 양방향 storage reset 구현 | 2차   |
| 프로젝트 통계        | projectLayout + Under Construction shell          | ✅ legacy shell 구현 | 5     |
| 프로젝트 메뉴 설정   | code/issue/milestone/board/pullRequest 토글        | ✅ 구현           | 1     |
| 프로젝트 공개범위    | public/protected/private + ACL 체크                | ✅ 구현           | 1     |
| Overview/README      | 마크다운 편집 가능한 프로젝트 소개                 | ✅ 구현           | 1     |

#### 검수 기준

- [x] `/:owner/:project` project home 레이아웃은 legacy `projectLayout.scala.html`, `project/header.scala.html`, `projectMenu.scala.html`, `project/home.scala.html` 구조를 따라 프로젝트 헤더 + 메뉴 + `.page-wrap-outer` / `.project-page-wrap` 컨텐츠 셸을 렌더링한다
- [x] 프로젝트 메뉴: Code / Issues / Pull Requests / Reviews / Milestones / Board 순서 (legacy 동일), `project_menu_setting`에 따라 on/off
- [x] 공개범위별 접근 제어: public(누구나 읽기), protected(조직 멤버 읽기), private(프로젝트 멤버만)
- [x] site_admin은 모든 프로젝트에 read + write 권한 (legacy `ProjectApp` 동작)
- [x] 프로젝트 목록 페이지네이션: 한 페이지 10개, legacy `pageNum` 방식; `/projects` preserves legacy `project/list.scala.html` tab labels, `site.project.filter` placeholder, icon-only search button, `project.is.empty` error state, `ul.all-projects`, and non-empty `div#pagination` placeholder.
- [x] `/:owner/:project/watchers`는 READ 가능한 프로젝트의 실제 watcher 목록을 legacy `projectLayout.scala.html` / `project/watchers.scala.html` header/menu shell, class anchors, and avatar image shape(`img` width/height without extra alt copy)로 표시하고, legacy READ gate의 forbidden/not-found failures를 shared forbidden/not-found shell로 분기한다
- [x] `POST /:owner/:project/watch|unwatch` direct legacy routes reuse the project watch mutation, preserve session/CSRF plus legacy project WATCH checks, return legacy empty `200 OK` success bodies, and `unwatch` clears the current user's project notification overrides like `WatchProjectApp.unwatch`
- [x] `/:owner/:project/members`는 UPDATE 가능한 프로젝트의 멤버 추가/역할 변경/삭제/가입 요청 수락을 legacy `projectLayout.scala.html` / `project/members.scala.html` header/menu shell, class anchor와 `/api/v1/owners/:owner/projects/:project/members` REST mutation으로 제공하고, legacy `GET /info/leave/:owner/:project` 현재 사용자 탈퇴 redirect를 보존한다
- [x] `/:owner/:project/deleteform`은 UPDATE 가능한 프로젝트의 legacy `projectLayout.scala.html` / `project/delete.scala.html` header/menu + 확인 셸을 보존하고, legacy `yobi.project.Delete.js`처럼 `#accept` 미체크 click은 `project.delete.alert` scalar를 표시하며, `/api/v1/owners/:owner/projects/:project` DELETE로 프로젝트 DB 상태와 bare Git repository를 삭제한 뒤 `/`로 이동한다
- [x] `/:owner/:project/webhooks`는 UPDATE 가능한 프로젝트에서만 legacy `projectLayout.scala.html` / `project/webhooks.scala.html` create form을 표시하고, legacy header/menu shell, `project/webhooks.scala.html` / `partial_webhooks_list.scala.html` form/list anchors, `project.webhook.new` legend, payload/secret placeholders, literal webhook type radio labels, `project.webhook.includeGitPush`, help block, list headers, row `h6` wrappers, and delete request URI를 보존하며 `/api/v1/owners/:owner/projects/:project/webhooks` REST CRUD로 payload URL, secret, webhook type, gitPush 값을 저장/삭제한다
- [x] `/:owner/:project/transfer`는 UPDATE 가능한 프로젝트의 legacy `projectLayout.scala.html` / `projectMenu.scala.html` / `project/transfer.scala.html` header/menu + checkbox/modal shell anchors (`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap`, `#subMenuProjectTransfer`, `.bubble-wrap.gray.wp`, `#owner`, `#accept`, `.box-wrap.bottom`, `#btnTransfer[href="#alertTransfer"][data-toggle=modal]`, `#alertTransfer.modal.hide`, `#btnTransferExec`, `button.yes`, `button.no`)를 보존하고, legacy `yobi.project.Transfer.js`처럼 `#accept` 미체크 click은 `project.transfer.alert` scalar를 표시하며, `/api/v1/owners/:owner/projects/:project/transfer` request와 `/project/transfer/:id/:key` accept link로 owner/name, previous owner/name alias, sender/destination membership을 갱신하고 transfer request mail을 발송한다
- [x] Project transfer keeps the Git repository at `YONA_DATA/repo/<project_id>.git`; owner/name filesystem path move is intentionally not required under the Rust ID-based repository layout
- [x] `project.default.scope.when.create` / `YONA_PROJECT_DEFAULT_SCOPE`는 프로젝트 생성 폼 기본 공개범위와 scope가 생략된 생성 요청의 기본값을 제어하고, 명시된 요청 scope는 그대로 우선한다
- [x] `project.creation.default.menus` / `YONA_PROJECT_DEFAULT_MENUS`는 새 프로젝트의 `project_menu_setting` 기본값을 제어한다. Code가 꺼져 있으면 Pull Requests/Reviews도 legacy처럼 code menu visibility에 종속되어 숨겨진다
- [x] Project create/settings forms expose legacy menu checkbox IDs and persist Code/Issues/Pull Requests/Reviews/Milestones/Board toggle changes through `/api/v1/owners/:owner/projects/:project`. `/:owner/:project/settingform` preserves the legacy `projectLayout.scala.html` / `project/setting.scala.html` header/menu shell around `#saveSetting`, `.bubble-wrap.gray`, `.box-wrap.top.clearfix.frm-wrap`, `.setting-box`, `#project-name`, `#project-desc`, project scope radios, code-access radios, reviewer count panel, menu checkboxes, and `#save`.
- [x] `/projectform` renders the legacy `project/create.scala.html` create shell (`.page-wrap-outer`, `.project-page-wrap`, `.form-wrap.new-project`, `#newProjectForm.frm-wrap`, `#project-owner` select2 user/group owner selector, `#project-name`, `#description`, `.advanced-options`, `.project-scopes`, `#public`, `#protected`, `#private`, `#vcs`, `#svn`, `.actions.mt20`). `/api/v1/projects/form-options` returns the current user plus creatable organization owners and honors `?owner=` selection, `/projects/new?owner=` preserves the owner into `/projectform`, the create-form import action links to `/_import?owner=<selected>`, and create forwards the selected `vcs` through `/api/v1/owners/:owner/projects`. `SVN`/`Subversion` creation validates `svnadmin` before DB mutation, provisions `YONA_DATA/repo/<project_id>.svn` through the executable-backed storage path, and does not leave default Git storage behind.
- [x] `/_import` renders the legacy `project/importing.scala.html` Git import form shell (`.page-wrap-outer`, `.project-page-wrap`, `.form-wrap.new-project`, `#importGit.frm-wrap`, `#url`, `#useRepoAuth`, `#repoAuth`, `name="authId"`, `name="authPw"`, `#project-owner`, `#project-name`, `#description`, `.advanced-options`, `.project-scopes`, fixed disabled `#vcs` Git selector, menu checkboxes, `.actions.mt20`) and preserves `?owner=` selection plus the back-link to `/projectform?owner=<selected>`. `POST /_import` is session/CSRF gated, preserves the legacy empty-url/duplicate-name/invalid-name error keys, creates the project row/menu settings, and clones the supplied Git source into `YONA_DATA/repo/<project_id>.git` with native `git clone --bare`.
- [x] `/:owner/:project/changeVCS`는 UPDATE 가능한 프로젝트의 legacy `project/change_vcs.scala.html` checkbox, `#btnChangeVCS` modal anchor, `#alertChangeVCS` modal shell을 보존하고, legacy `yobi.project.ChangeVCS.js`처럼 `#acceptChangeVCS` 미체크 click은 `project.changeVCS.alert` scalar를 표시하며, `/api/v1/owners/:owner/projects/:project/change-vcs`로 `vcs` metadata toggle, README posting flag clear, ID-based repository storage reset을 수행한다. Subversion 전환은 `svnadmin create` executable wrapper로 `YONA_DATA/repo/<project_id>.svn` storage를 만들며, `svnadmin`이 없으면 DB 변경 전에 실패한다. Git 전환은 이전 SVN storage를 제거하고 fresh bare Git storage를 만든다.
- [x] `/:owner/:project?tabId=history|dashboard`는 legacy project home tab query를 반영해 `partial_history`의 `.content-container.nm`, `.main-stream`, `.activity-streams.unstyled`, `.activity-stream`, `.avatar-wrap.pull-left.mr10`, `.actor`, `.where`, `.title`, `.date` anchors와 `partial_dashboard`의 `.project-overview-home`, `.overview-assignee`, `.overview-milestone`, `.overview-pullrequest`, `.overview-label` anchors를 렌더링한다. Project container REST now returns `history.items` for DB-backed issue/post/pullrequest rows and Git commit rows, plus `dashboard.labels`, `dashboard.assignees`, `dashboard.unassignedOpenIssueCount` for label/assignee dashboard rows, and the legacy direct `PUT /:owner/:project` overview edit route returns `{"overview": ...}` while updating the shared project container state.
- [x] Smart HTTP clone URL follows the current owner/project name after transfer through the ID-based repository lookup; push post-receive side effects are recorded against the same ID-based repository

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
POST  /:owner/:project/issue/:number/comments/:commentId → 댓글 수정
DELETE /:owner/:project/issue/:number/comment/:commentId/delete → 댓글 삭제
GET   /:owner/:project/issue/:number/timeline → 이슈 타임라인
POST  /watch                                → 이슈 감시
POST  /unwatch                              → 이슈 감시 해제
POST  /:owner/:project/issue/:number/vote   → 이슈 투표
POST  /:owner/:project/issue/:number/unvote → 이슈 투표 취소
POST  /-_-api/v1/owners/:owner/projects/:projectName/issues/:number/share → legacy external REST; Rust app server scope에서는 미지원, 별도 migrator/export tool에서 판단
```

#### 기능 목록과 상태

| 기능               | Legacy 동작                                         | 현재 상태             | Phase |
| ------------------ | --------------------------------------------------- | --------------------- | ----- |
| 이슈 목록          | 필터(상태/담당자/라벨/마일스톤), 정렬, 페이지네이션 | ✅ Phase 2A 구현; legacy `issue/list.scala.html` / `partial_list_wrap` / `partial_searchform` / `partial_list` shell anchors restored including `common.twoColumnModeCheckboxArea` and `common.showSubtasksCheckbox` controls, assignee avatar/due-date/weight/subtask row payload and shell covered | 2     |
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
| @멘션              | `@username` 자동 완성 + 알림                        | ✅ Phase 2L 핵심 구현; At.js-style empty/error/more status suppression | 2     |
| 이슈 공유 (Sharer) | 비멤버 또는 공개 프로젝트 멤버에게 이슈 읽기 권한 부여 | ✅ Phase 2E/2L/2N 구현; legacy `issue/view.scala.html` `dl.sharer-list` / `#sharer-list` / `#issueSharer` sidebar anchors restored | 2     |
| Mass Update        | 이슈 일괄 상태/담당자/마일스톤/라벨 변경            | ✅ Phase 2A 구현      | 2     |
| 이슈 엑셀 내보내기 | `format=xls` Excel 호환 다운로드                    | ✅ 구현               | 2     |
| 즐겨찾기 이슈      | workspace에서 즐겨찾기 관리                         | ✅ Phase 2G 구현      | 2     |
| 조직 이슈 목록     | `/organizations/:name/issues`                       | ✅ Phase 2F 구현; legacy `group_issue_search_partial` / `group_issue_list_partial` shell anchors restored including `common.twoColumnModeCheckboxArea`, assigned/authored/mentioned quick filters, author/assignee avatar, and due-date row anchors covered | 2     |
| 사용자 이슈 목록   | `/user/issues`, 개인 quick filter                   | ✅ Phase 2G 구현; legacy `siteLayout` 별도 `.page-wrap-outer` / `.page-wrap`, `common/mySeriesMenuTab.scala.html` my-issues tab strip plus `#setDefaultLoginPage`, `my_partial_search` / `my_partial_list` shell anchors including `common.twoColumnModeCheckboxArea` and `common.showSubtasksCheckbox`, assignee avatar/due-date/weight/subtask row payload, current-user quick-filter data IDs, and mentioned/shared/favorite no-keyword quick-filter counts covered | 2     |
| 사용자 직접 이슈 작성 | `/user/issues/new`, `/user/issues/new/mine` 최근/개인 프로젝트 선택 | ✅ Phase 2H 보강      | 2     |

#### 검수 기준

- [x] 이슈 목록 필터와 shell: state(open/closed), assignee, label, milestone — legacy `IssueApp.issues()` 파라미터 동일; `/issues` form now preserves query values and submits `labelIds`/`milestoneId` through `/api/v1/projects/:owner/:project/issues`, while React preserves legacy `projectLayout.scala.html` / `issue/list.scala.html` / `issue/partial_list_wrap.scala.html` / `issue/partial_searchform.scala.html` / `issue/partial_list.scala.html` header/menu shell and anchors (`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap`, `.row-fluid.issue-list-wrap`, `.left-menu`, `.lst-stacked.unstyled`, `#search`, `#advanced-search-form`, `.nav.nav-tabs.nm`, `common.twoColumnModeCheckboxArea`, `.show-subtasks-li` / `common.showSubtasksCheckbox`, `.filter-wrap.board`, `.mass-update-check`, `ul.post-list-wrap.row-fluid`, `.issue-item-row`, issue database ID row/checkbox anchors, author-login row search values, `.title-wrap`, `.infos`, `.item-count-groups`, label anchors, `.child-issue-list.hide`, `#pagination`).
- [x] 이슈 엑셀 내보내기: legacy `issue/partial_list_wrap.scala.html`의 `format=xls` 다운로드 앵커를 복원하고 현재 필터를 적용한 Excel 호환 `.xls` 응답을 반환한다.
- [x] 이슈 생성/수정 form shell: React route가 legacy `projectLayout.scala.html` / `issue/create.scala.html` / `issue/edit.scala.html` header/menu shell and anchors (`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap`, `.content-wrap.frm-wrap`, `#issue-form`, `#title`, `.subtask-message`, `.subtask-wrap`, `name=body`, `data-editor-mode=content-body`, `.span9.span-left-pane`, `.span3.span-hard-wrap.right-menu`, `#assignee`, `#milestoneOption`, `#milestoneId`, `#issueDueDate`, `#labelIds`, `#notificationMail`, edit-only hidden `authorId`, `#button-save`, `#draft-save-btn`)를 보존하고, 담당자 blank-query dropdown은 legacy `IssueApi.findAssignableUsersOfProject`처럼 `issue.assignToMe` 후 project/organization assignable-user rows를 제공하며, 현재 REST mutation이 지원하는 담당자/라벨/마일스톤/마감일/subtask parent 선택을 제출한다.
- [x] 이슈 번호: 프로젝트 내 자동 증가 (`#1`, `#2`, ...) — legacy `Issue.nextNumber()` 동일
- [x] 이슈 상세: 제목, 본문(마크다운 렌더링), 사이드바(담당자/마일스톤/라벨/감시자/투표수/공유자) — legacy `projectLayout.scala.html` / `issue/view.scala.html` 레이아웃 동일; detail shell은 임시 `Yona Rust Project` heading 없이 `.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap.board-view`, `.board-header.issue`, desktop/mobile created-date `.date[title]` scalar, `.board-body.row-fluid`, `.span9.span-left-pane`, `.span3.right-menu`, `.board-actrow.right-txt`, `#watch-button`, `#issue-share-button`, mobile `.project-btn-item.show-in-mobile-inline` new-subtask link with REST `issueId`/parent id, `.issue-weight` / `#upvote-issue-weight` / `#down-vote-issue-weight` / `.weight-number` shell and app REST up/down mutation returning legacy `{ weight }`, `#translate`, `#vote.vote-wrap` heart icon shell plus `partial_voters` / `partial_voter_list`-style `.voter-list-wrap`, `.voter-list`, `#voters.modal.hide.voters-dialog`, empty `.watcher-list`, `.badge-issue-*`, and selected-label `dl` / `dt label` / `.label.issue-label.active.static` anchors를 유지하고 temporary `Watchers: N`, `Voters: N`, visible `Vote` / `Unvote` copy, or detail-only `.label.issue-label.list-label.active` span을 렌더링하지 않는다. body history가 있으면 `.posting-history` 링크와 `#-yona-posting-history` modal을 렌더링하고, 작성자/담당자 영역은 `.author-info`, `.assignee-info`, `.usf-group`, `.avatar-wrap.smaller`, `.name`, `.loginid` anchors와 avatar URL을 유지한다. update 가능한 담당자 입력은 legacy `partial_assignee.scala.html`처럼 `#assignee.bigdrop`, `name=assigneeLoginId`, `placeholder=issue.noAssignee`, `width:100%` anchors를 유지하고, blank-query dropdown은 legacy `IssueApi.findAssignableUsers`의 `issue.assignToMe`, `issue.assignToAuthor`, `issue.noAssignee`, current-assignee, assignable-user rows를 보존하며, legacy `title.no.results` no-results copy를 사용하고 temporary `Assignee` placeholder / `Assign` button / `No matching users` / `No matches found` / `Assignable user search failed.` copy를 렌더링하지 않는다. 공유자 영역은 `dl.sharer-list`, `.issue-share-title`, `#sharer-list`, `#issueSharer`, `issue.sharer`, `issue.sharer.select`, `.text-ellipsis.sharer-item`, `.usf-group` anchors를 유지하고 temporary English share/remove copy를 렌더링하지 않는다. `#translate`와 `.comment-translate`는 legacy `POST /-_-api/v1/translation` helper를 호출하고 반환된 Markdown source를 React renderer로 표시한다.
- [x] 이슈 상세 담당자 검색 상태 copy: legacy Select2-style 상태로 `Searching...`, `Loading more results...`, `title.no.results`를 사용한다.
- [x] 댓글: 시간순 정렬, 작성자 아바타, 마크다운 렌더링 — REST comment/timeline projection now includes legacy-derived author avatar URLs, and issue detail renders the legacy `#comments.board-comment-wrap`, `.comment-header`, `.comments`, `.comment`, `.comment-avatar`, `.avatar-wrap`, `.media-body`, `.comment_author`, `.ago-date`, `.ago`, `.share-link`, `.act-row.pull-right`, `.new-issue-by`, `#comment-body-*`, and `.comment-body` anchors. Writable comment creation preserves legacy `common/commentForm.scala.html` anchors (`#comment-form`, multipart form, `.write-comment-box`, common editor edit/preview tabs, `#editor-contents-comment-body`, `data-editor-mode="comment-body"`, `name=contents`, `ISSUE_COMMENT` upload shell, `.write-comment-wrap`, `#dynamic-comment-btn`, `button.comment.new`), and non-commentable viewers see the legacy disabled `.write-comment-box.mt20[data-login=required]`. Comment vote/unvote controls preserve legacy `data-request-type="comment-vote"` and direct vote/unvote `data-request-uri` anchors; updateable comments use `[data-toggle="comment-edit"]`, `data-comment-id`, and `#comment-editform-*` / `.comment-update-form`; deletable comments use `[data-toggle="comment-delete"]`, `data-request-uri`, and common `#comment-delete-modal` / `#comment-delete-confirm` confirmation shell before invoking the existing mutations. The `.new-issue-by` anchor now lands on `/user/issues/new?commentId=:id`, loads the legacy direct issue form options from recent-project state, pre-fills the body with the source comment attribution, posts `referCommentId`, and creates the legacy derived-issue comment on the source issue. The direct my-issue form `/user/issues/new/mine` uses the legacy `IssueApp.newDirectMyIssueForm` target priority: `inbox`, `_private`, latest private project, then latest public project.
- [x] Legacy direct issue comment form aliases: `POST /:owner/:project/issue/:number/comments`, `POST /:owner/:project/issue/:number/comments/:commentId`, and `DELETE /:owner/:project/issue/:number/comment/:commentId/delete` reuse the `/api/v1` comment contract and redirect back to the legacy issue anchor
- [x] 타임라인: 상태 변경/담당자 변경/라벨 변경 이벤트가 댓글과 인터리빙되어 시간순 표시; React detail event rows preserve legacy `partial_event_timeline.scala.html` anchors including `li.event#event-*`, `.state`, `.date a[href="#event-*"]`, `.user-link`, add/delete state classes, and hidden `ISSUE_BODY_CHANGED` rows.
- [x] Mass Update: 체크박스로 다중 선택 → 상태/담당자/마일스톤 일괄 변경 (legacy `IssueMassUpdate` 동일); `/api/v1/projects/:owner/:project/issues/mass-update` and direct `POST /:owner/:project/issues` preserve the legacy bulk mutation surface with state-change timeline/notification/mail fan-out
- [x] 이슈 삭제: 작성자 또는 프로젝트 관리자만 가능; detail 화면은 legacy `issue/view.scala.html`처럼 `#deleteConfirm.modal.hide.fade`, `data-toggle="modal"`, `issue.delete`, `post.delete.confirm`, and `data-request-method="delete"` confirmation shell을 거친다.
- [x] 이슈 공유: 직접 공유된 사용자는 비공개/제한 이슈와 댓글을 읽고 해당 이슈에 댓글 작성 가능, parent issue 공유는 child issue 읽기만 허용
- [x] 이슈 공유 검색은 읽기 ACL을 재사용하고, active user와 public project 후보를 typed target으로 반환하며, 실제 공유 추가/삭제시에만 `ISSUE_SHARER_CHANGED` 타임라인/notification/mail queue row side effect를 남긴다
- [x] @멘션은 이슈 본문과 댓글에서 `@user`, `@org`, `@owner/project`를 해석하고 신규 활성 사용자 mention만 기존 이슈/댓글 이벤트 타입으로 알림 row를 만든다
- [x] `#issue` 자동완성은 프로젝트 읽기 ACL을 재사용하고, legacy `ProjectApp.mentionList(... mentionType=issue)`처럼 이슈 번호/제목 후보를 보여준 뒤 `#번호` 토큰만 삽입한다
- [x] 첨부파일: 이슈 본문/댓글에 파일 첨부 가능 (`/files` 엔드포인트)
- [x] 이슈 draft 저장/수정/발행 및 목록 표시: legacy draft 저장/수정/발행 기본 mutation, author-only draft detail read guard, draft edit controls, publish renumbering, normal list draft 제외, first-page unfiltered/open draft block(`partial_list_draft`)을 구현했다. Issue due-date 저장/수정/삭제, invalid date validation, subtask parent 선택/해제 persistence, issue detail child rows/progress projection(`partial_view_childIssueList`, `partial_view_child`)도 REST mutation/detail과 React form/detail에 구현됐다.

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
POST  /:owner/:project/post/:number/comment/:commentId → 댓글 수정
DELETE /:owner/:project/post/:number/comment/:commentId/delete → 댓글 삭제
```

#### 기능 목록과 상태

| 기능             | Legacy 동작                             | 현재 상태 | Phase |
| ---------------- | --------------------------------------- | --------- | ----- |
| 게시글 목록      | 검색, 페이지네이션, 공지 상단 고정      | implemented (core) | 5B    |
| 게시글 작성      | 제목, 본문(마크다운), 라벨              | implemented (core) | 5B    |
| 게시글 상세      | 제목/본문/댓글, 공지 표시               | implemented (core) | 5B    |
| 게시글 수정/삭제 | 작성자 또는 관리자                      | implemented (core) | 5B    |
| 댓글 CRUD        | 마크다운, 작성/수정/삭제                | implemented (core) | 5B    |
| 공지 (notice)    | `posting.notice=true` 시 목록 상단 고정 | implemented (core) | 5B    |
| README 게시글    | `posting.readme=true` 시 특별 표시      | implemented (DB-only) | 5B    |
| 게시글 라벨      | 이슈 라벨과 공유                        | implemented (core) | 5B    |
| 게시글 번호      | 프로젝트 내 자동 증가                   | implemented (core) | 5B    |
| 조직 게시판 목록 | `/organizations/:name/boards`           | implemented with legacy `group_board_list.scala.html` shell anchors | 5B    |

#### 검수 기준

- [x] 게시글 목록: 프로젝트 게시판은 일반 목록과 공지(`notice=true`) 목록을 분리해 공지 상단 고정을 유지한다.
- [x] 게시글 번호: `project.last_posting_number`와 기존 max number를 함께 보며 프로젝트 내 자동 증가를 복구한다.
- [x] 게시글 목록 shell: React route가 legacy `projectLayout.scala.html` / `board/list.scala.html` / `board/partial_list.scala.html` header/menu shell and anchors (`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.post-list.project-page-wrap`, `.search-wrap.underline`, `#option_form`, `.search-bar`, `.textbox`, `placeholder=project.searchPlaceholder`, `.search-btn`, `.board-labels`, `.filter-wrap.board`, `common.order.updatedDate` / `common.order.date` / `common.order.comments` sort labels, `ul.post-list-wrap`, `ul.post-list-wrap.notice-wrap`, `.post-item.title`, author avatar/profile links plus no-author `issue.noAuthor` span fallback, created-date visible label/title scalar, `.title-wrap`, inline `.label.label-notice` / `.label.label-important` notice/README markers without temporary `.board-badge` duplicates, leading bracket `.title-prefix` anchors plus stripped title-link text matching `showHeaderWordsInBracketsIfExist` / `removeHeaderWords`, `.infos`, positive-comment-only `.item-count-groups` / `.comments-count` / `.count-groups.item-count` markup without temporary `Comments 0` copy, `.write-btn-wrap`, `#pagination.page-navigation-wrap`, `ul.page-nums`, `input[name=pageNum]`)를 보존한다.
- [x] 조직 게시글 목록 shell: React route가 legacy `organizationLayout` / `organization/menu.scala.html` / `organization/group_board_list.scala.html` anchors (`.project-menu-outer`, `.project-menu-nav.project-menu-gruop`, active `menu.board`, header/menu 뒤 별도 `.page-wrap-outer`, `.project-page-wrap`, `.search-wrap.underline`, `#option_form`, `.project-selects.span7`, `#projects`, `name=projectNames[]`, `.search-bar.span4`, `.textbox.group-board`, `placeholder=title.searchByKeyword`, `.search-btn`, `common.twoColumnModeCheckboxArea`, `.filter-wrap.board`, `common.order.updatedDate` / `common.order.date` / `common.order.comments` sort labels, `ul.post-list-wrap`, author avatar/profile links, `.group-project-name`, `.post-id` `#postNumber`, `.write-btn-wrap`, `#pagination.page-navigation-wrap`, `ul.page-nums`, `input[name=pageNum]`)를 보존하며, legacy에 없는 generic `<h1>Boards</h1>` heading을 렌더링하지 않는다.
- [x] 게시글 레이아웃: React route가 legacy class anchor(`post-list-wrap`, `notice-wrap`, `board-view`, `board-comment-wrap`, `board-labels`, `ybtn`)를 사용한다.
- [x] 게시글 create/edit form shell: React route가 legacy `projectLayout.scala.html` / `board/create.scala.html` / `board/edit.scala.html` header/menu shell and anchors (`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap`, `form.nm`, `.content-wrap.frm-wrap`, `dl`, `#title`, `.zen-mode.text.title`, `name=body`, `data-editor-mode=content-body`, `.right-txt.mt10.mb10`, `#notice`, hidden `#issueTemplate` / `#branch` / `#path` / `#lineEnding`, `#readme`, `.actions`, edit-only `#notificationMail`, `button.save` / `button.cancel` action copy, and online commit `.file-path-wrap` / `.new-file-name` / issue-template `.attach-wrap`)를 보존한다.
- [x] 게시글 변경 이력: body history가 있으면 legacy `board/view.scala.html`처럼 `.posting-history` 링크와 `#-yona-posting-history` modal을 렌더링하며, history Markdown 원문을 React renderer로 표시한다.
- [x] 게시글 상세/댓글 shell: React detail route가 legacy `projectLayout.scala.html`, `board/view.scala.html`, `board/partial_comments.scala.html`, `common/commentForm.scala.html`, `common/commentUpdateForm.scala.html`, `common/childComments.scala.html`, and `common/child_commentForm.scala.html` header/menu shell and anchors (`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap.board-view`, `.board-header.issue`, `.board-body.row-fluid`, `.author-info`, `#watch-button`, `.watcher-list`, `#translate`, `.comment-translate`, `.issue-info.board-labels`, selected-label `dl` / `dt label` / `.label.issue-label.active.static`, `#comments.board-comment-wrap`, `#timeline`, `.timeline-list`, `.comment-header`, `ul.comments`, `li.comment`, `.comment-avatar`, `.media-body`, `.meta-info`, `.comment-update-form`, `.comment-update-button`, `.add-a-comment`, `.child-comments`, `.one-line-comment`, `.child-comment-input-form`, `.parentCommentId`, `.oneline-comment-box`, `#comment-form`, `.write-comment-box`, `.write-comment-wrap`, `#dynamic-comment-btn`, `name=contents`, `button.comment.new`, comment edit `button.cancel` / `button.save`)를 보존하고, board watch control은 `post.watch` / `post.unwatch` message-key copy를 사용하며 legacy에 없는 inline `Watchers N` label과 comment editor temporary `Leave a comment` placeholder를 렌더링하지 않는다. Selected board labels preserve the legacy `partial_show_selected_label` static shell; updateable all-label Select2 option payload is outside this narrow refresh. Board and issue child comment create now carry `parentCommentId` through `/api/v1`, and issue detail exposes parent links so React renders child comments under their parent instead of as top-level timeline rows. `#translate`와 `.comment-translate`는 legacy `POST /-_-api/v1/translation` helper를 호출하고 반환된 Markdown source를 React renderer로 표시한다.
- [x] 댓글: 시간순 정렬과 마크다운 렌더링을 제공한다.
- [x] PR 본문/review comment, Git commit discussion comment, 게시글/댓글/DB README posting 본문은 REST `bodyMarkdown`/`contentsMarkdown` 원문을 React Markdown renderer로 렌더링하고, `bodyHtml`/`contentsHtml`는 app-runtime compatibility용 빈 필드로 유지한다.
- [x] Legacy direct posting comment form aliases: `POST /:owner/:project/post/:number/comment`, `POST /:owner/:project/post/:number/comment/:commentId`, and `DELETE /:owner/:project/post/:number/comment/:commentId/delete` reuse the `/api/v1` comment contract and redirect back to the legacy post anchor
- [x] 검증: `frontend/tests/board-posting-parity.e2e.ts`가 프로젝트/조직 board list, detail, comment CRUD, watch, create/edit/delete CSRF, filter/sort/label/project selector, placeholder 제거를 전용 Playwright surface로 검증한다.
- [x] Git-backed README commit/sync: README-marked board posting create/update commits `README.md` to the project Git repository when repository storage exists.
- [x] Issue template edit and online code file edit: legacy `postform` query context (`issueTemplate`, `path`, `branch`, `edit`) reuses the board form shell, disables attachments where legacy does, prepares existing file content for edit, and commits `ISSUE_TEMPLATE.md` or the selected code path through the local Git executable without creating a board posting row.
- [ ] Deferred: `/-_-api/v1/**` board compatibility.

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
POST  /:owner/:project/copyLabels          → 다른 프로젝트 라벨 복사
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
| 라벨 복사          | 프로젝트 간 라벨 복사                   | ✅ Phase 6 구현     | 6     |

#### 검수 기준

- [x] 라벨 생성 시 이름, 색상(hex), 카테고리 지정 가능
- [x] 라벨 관리 화면은 legacy `projectLayout.scala.html` / `projectMenu.scala.html` / `project/issuelabels.scala.html` / partial anchors (`.project-header-outer`, `.project-header-inner`, `.project-header-wrap`, `.project-menu-outer`, settings-active project menu, `.page-wrap-outer`, `.project-page-wrap.label-editor-wrap`, `#subMenuIssueLabel`, `#copyLabel`, `#frmNewLabel`, `.label-preset-colors`, `#labelsList`, `.row-fluid.list-head`, `.span3.category`, `.span9.name`, `.category-wrap[data-category-name]`, `data-delete-uri`, `data-update-uri`, `#editCategory`, `#editLabel`)를 보존한다
- [x] 라벨 색상이 legacy와 동일하게 배경색 + 텍스트색으로 표시
- [x] 이슈 필터에서 라벨 선택 시 해당 라벨이 붙은 이슈만 필터링
- [x] 카테고리별 라벨 그룹핑이 legacy `labelsform` 화면과 동일
- [x] `copyLabels`가 읽기 가능한 source 프로젝트의 라벨을 update 가능한 target 프로젝트로 복사하고 중복 라벨을 재사용한다

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

- [x] 마일스톤 목록: open/closed/all 탭, 신규 버튼, 빈 상태, 정렬/검색 필터, 진행률 바, 이슈 링크/라벨 행이 legacy `projectLayout.scala.html` / `milestone/list.scala.html` header/menu shell and anchors (`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap`, `.tab-wrap`, `.filter-wrap.milestone`, `.search-bar`, `ul.milestones`, `li.milestone`, `.version`, `.progress-wrap`, `.issue-link[target=_blank]`, `.issue-item`, `data-label-id`, `issue/labels.css`)를 보존한다
- [x] 마감일: `yyyy-MM-dd` 형식 저장/표시
- [x] 마일스톤 상세: legacy `projectLayout.scala.html` / `milestone/view.scala.html` header/menu shell and anchors (`.project-header-outer`, `.project-menu-outer`, `.milesion-wrap`, `.title`, `.attachments[data-attachments]`, `.actrow.right-txt.row-fluid`, open/close `data-request-uri`, `#issues`, `.filter-wrap`, `data-toggle=item-search`, `#deleteConfirm`, `issue/labels.css`)와 소속 이슈 목록을 보존한다
- [x] 마일스톤 생성/수정 폼 shell: legacy `projectLayout.scala.html` / `milestone/create.scala.html` / `milestone/edit.scala.html`의 header/menu shell, `.page-wrap-outer`, `.project-page-wrap`, `.content-wrap.frm-wrap`, `#milestone-form`, `#title`, `common.editor` `contents`/`content-body`, `.span9.span-left-pane`, `.span3.span-hard-wrap`, 상태 radio, `#dueDate`, `#datepicker` anchors를 유지한다.

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
DELETE /:owner/:project/code/:branch/      → 브랜치 삭제
POST  /:owner/:project/code/:branch/setAsDefault → 기본 브랜치 변경
GET   /:owner/:project/compare/:revA..:revB → 커밋 비교
```

#### 기능 목록과 상태

| 기능                         | Legacy 동작                         | 현재 상태             | Phase |
| ---------------------------- | ----------------------------------- | --------------------- | ----- |
| 파일/폴더 트리 브라우저      | 디렉토리 탐색, 파일 내용 표시       | ✅ Phase 3A 구현      | 3     |
| 브랜치 선택기                | 드롭다운으로 브랜치/태그 전환       | ✅ Phase 3A 기본 구현 | 3     |
| 파일 보기 (syntax highlight) | 코드 하이라이트, 라인 번호          | ✅ Phase 3D 구현      | 3     |
| Raw 파일 다운로드            | 바이너리/텍스트 직접 다운로드       | ✅ Phase 3B 구현      | 3     |
| 이미지 미리보기              | 이미지 파일 인라인 표시             | ✅ Phase 3B 구현      | 3     |
| Archive 다운로드             | 브랜치 zip 다운로드                 | ✅ Phase 3C 구현      | 3     |
| 커밋 이력                    | 커밋 목록, 페이지네이션             | ✅ Phase 3E 구현      | 3     |
| 커밋 상세 (diff)             | 변경 파일 목록, unified diff        | ✅ Phase 3F 구현      | 3     |
| 커밋 댓글                    | 커밋에 댓글 작성/삭제, thread open/close, 단일 라인 inline thread 작성 | ✅ Phase 3I 구현      | 3     |
| 브랜치 관리                  | 브랜치 목록, 삭제, 기본 브랜치 설정 | ✅ Phase 3H 구현      | 3     |
| 커밋 비교                    | 두 revision 간 diff                 | ✅ Phase 3G 구현      | 3     |

#### 검수 기준

- [x] 코드 브라우저: `/:owner/:project/code` 접근 시 기본 브랜치의 루트 디렉토리가 legacy `code/view.scala.html` 레이아웃으로 표시되고, code/history/detail/compare/branches surfaces는 legacy `projectLayout.scala.html` / `projectMenu.scala.html` shell anchors (`.project-header-outer`, `.project-header-inner`, `.project-header-wrap`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap`)를 보존하며 legacy에 없는 임시 `Yona Rust Project`, `menu.code`, `code.commits`, `title.branches` heading과 owner/project paragraph를 렌더링하지 않는다. Folder/history/compare empty state는 legacy `code.nofiles` / `code.nocommits` / `code.noChanges` message-key copy를 사용한다. Compare shell preserves legacy `compare.scala.html` revision-pair title, `.commitInfo` / `.commitId`, and `.diff-body.discommentable` anchors instead of temporary `Compare` copy. Code file controls and states preserve legacy `partial_view_file.scala.html` keys/anchors (`code.open`, `code.open.desc`, `code.history`, `button.download`, `code.tooBigFileForCodeBrowser`, `code.viewRaw`, `#open-in-browser`, `#codeVal.hidden`, `#showCode`, valid `data-mime-type`, `#showImage`, `#showFile`, `.filesize`) instead of temporary English labels, including the raw download icon, legacy raw-file routes for binary image/download links, `getFileRev`-style commit-id raw/image/download URLs when file commit metadata is available, and update-capable text-file online edit action to `postform?path=<file>&branch=<branch>&edit=true`. File headers expose executable-backed latest file commit metadata, author-email user/avatar resolution, and revision comment counts through REST and preserve legacy `#fileInfo`, `#commiter` with `getAvatar(files)` `a.avatar-wrap.smaller > img`, `#commitDate`, `#revisionNo`, `#commitMessage`, `number-of-comments ml5`, and non-binary line-ending type anchors. Branch selectors preserve legacy `#branches` select2 shell (`data-toggle=select2`, `data-format=branch`, `data-dropdown-css-class=branches`, `pull-left` / `pull-left mb10` / `pull-right`) without temporary `Branch` labels, code browser/history branch options use legacy URL values/direct navigation, and browser/history breadcrumbs preserve legacy adjacent-anchor output without temporary slash spans while code browser headers preserve `#breadcrumbs.code-breadcrumb-wrap.ml10.pull-left`, `.code-viewer-wrap`, and `#spin`. Folder rows preserve legacy `partial_view_folder.scala.html` anchors with valid React/HTML data attributes (`data-list-path`, `id="cb-..."`, `data-path`, `.span6.filename`, `.span5.commitMsg`, `.span1.commitDate`, `.dynatree-icon.vmiddle`, title/`data-target-path` anchors, folder `data-type`, folder hash targets, commit-message links, `getAvatar(file)` `a.avatar-wrap.smaller > img` before commit-message links, and no temporary `Folder:` / `File:` prefixes). History author-date cells preserve legacy `history.scala.html` date title scalar, history author cells preserve matched-user `a.avatar-wrap` profile/tooltip image shell, email-only `span.avatar-wrap` gravatar shell, and text fallback; history commit messages preserve legacy `common.commitMsg` `a.commitMsg.short`, `button.commitMsg.moreBtn`, body-only `pre.commitMsg.desc.hidden`, and `code.commitMsg.empty` fallback; history copy buttons preserve `.btn-copy-commitId` with valid `data-commit-id`. Browser header preserves legacy `.pull-right` action wrappers around download and `#new-file-link` / `code.new.file` postform query (`path`, `branch`) for update-capable viewers. Commit diff review-card controls preserve legacy `code/diff.scala.html` icon-only show/hide buttons and `issue.state.open` / `issue.state.closed` tab labels instead of temporary review-card English copy. Code tab/title/download copy preserves legacy `code/view.scala.html`, `history.scala.html`, `branches.scala.html`, and `diff.scala.html` keys (`menu.code`, `code.files`, `code.commits`, `title.branches`, `code.download`, `notification.watch`, `button.list`) instead of temporary English labels, and code browser file views do not render the folder-only tab bar from `code/view.scala.html`. Folder/history label/action copy는 `partial_view_folder.scala.html` / `history.scala.html`의 `code.filename`, `code.commitMsg`, `code.commitDate`, `code.authorDate`, `code.author`, `code.commitMsg.empty`, `code.copyCommitId`, `code.showCommit`, `code.showCodeAtThisCommit`, `code.showCode`, `code.newer`, `code.older`를 보존한다. Legacy Yona의 camel-case custom data attributes는 React warning과 invalid HTML을 피하기 위해 user-visible UI가 동일한 valid kebab-case `data-*` 속성으로 표현한다.
- [x] 커밋 이력 keyboard shortcut: history pagination links preserve legacy `history.scala.html` `yobi.ShortcutKey` behavior by binding `A` to newer and `S` to older when those links exist, while ignoring form controls and editable content
- [x] Empty repository/no-head: code browser/history/detail/compare/branches surfaces render the legacy `code/nohead.scala.html` / `code/nohead_svn.scala.html` `code.nohead*` shell and Git/SVN setup snippets instead of temporary `The repository is empty!` / `Clone URL:` copy
- [x] Raw/Open/Image 직접 파일 라우트: `rawcode`, `files`, `image`가 동일한 code read ACL과 Git blob path validation을 사용한다
- [x] Archive 다운로드: `/:owner/:project/code/:branch/download`가 동일한 code read ACL과 Git revision validation을 사용해 zip을 반환한다
- [x] 파일 보기: syntax highlighting, 라인 번호
- [x] 브랜치 선택기: 드롭다운에 브랜치/태그 목록, 현재 브랜치 표시
- [x] 커밋 이력: 시간역순, 작성자/메시지/해시, 페이지네이션
- [x] 커밋 diff: read-only unified diff 형식, legacy diff anchor/class shell 표시, empty file-diff list는 legacy `partial_diff.scala.html`처럼 placeholder 없이 빈 `.diff-body` shell 유지
- [x] 커밋 비교: `revA..revB` 범위의 read-only unified diff와 legacy compare shell 표시
- [x] 브랜치 관리: legacy `branches.scala.html` / `partial_branchrow.scala.html` 표, message-key labels(`title.branches`, `code.branches.commit`, `code.branches.pullRequest`, `code.branches.defaultBranch`, `code.branches.noPullRequest`, `code.branches.setAsDefault`, `button.delete`), commit-date / pull-request-state tooltip scalars, no temporary `No branches` empty row, 기본 브랜치 우선 표시, branch-row 최신 PR 링크, 기본 브랜치 변경, non-default 브랜치 삭제
- [x] 커밋 diff comment: 파일별 변경 라인 수, 인라인 코멘트 가능 위치 표시

---

### FG-10: Git Smart HTTP Protocol

**Legacy 참조**: `yona-original/app/controllers/GitApp.java`, `app/models/PlayRepository.java`

**Legacy 라우트**:

```
GET   /:owner/:project.git/info/refs?service=git-upload-pack|git-receive-pack → Git refs 광고
POST  /:owner/:project.git/git-upload-pack|git-receive-pack                   → Git 프로토콜
```

#### 기능 목록과 상태

| 기능              | Legacy 동작                                     | 현재 상태 | Phase |
| ----------------- | ----------------------------------------------- | --------- | ----- |
| git clone (HTTPS) | Smart HTTP upload-pack                          | implemented (Phase 3K) | 3     |
| git push (HTTPS)  | Smart HTTP receive-pack                         | implemented with post-receive side effects (Phase 3L) | 3     |
| 인증              | Basic Auth (username + password/token)          | implemented (Phase 3K) | 3     |
| 권한 체크         | 프로젝트 공개범위 + 멤버 역할에 따른 read/write | implemented (Phase 3K) | 3     |
| Post-receive hook | push 후 알림/이벤트 발생                        | implemented (Phase 3L) | 3     |
| 저장소 초기 생성  | 프로젝트 생성 시 bare repo 생성                 | implemented (Phase 3J) | 3     |

#### 검수 기준

- [x] `git clone http://host/:owner/:project.git` 가 Smart HTTP upload-pack transport로 동작한다
- [x] `git push` receive-pack transport는 인증된 write 사용자만 접근하고, read-only 사용자는 거부된다
- [x] 프로젝트 공개범위와 code-member-only 설정에 따라 clone 인증 요구 여부가 결정된다
- [x] push 후 `notification_event` 생성, `project_pushed_branch`/`last_pushed_date` 기록, git-push JSON webhook outbox 전달

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
POST  /:owner/:project/pullRequest/:id/restorefrombranch → from 브랜치 복구
```

#### 기능 목록과 상태

Phase 4A는 read-only app surface를 구현했다. Phase 4B는 app runtime `/api/v1` 범위에서
PR 생성/수정 form, 생성/수정 mutation, close/reopen, review/unreview, 일반 PR review comment,
review thread open/close mutation을 추가했다. 후속 fork/clone slice는 `/api/v1/owners/:owner/projects/:project/fork-options`
와 `/fork` mutation, legacy `/:owner/:project/newFork` frontend shell, native `git clone --bare`
wrapper를 추가해 개인/조직 owner 대상 프로젝트 fork와 `original_project_id` 기록을 복원했다.
후속 merge accept slice는 `/api/v1/owners/:owner/projects/:project/pull-requests/:number/accept`
및 legacy `/:owner/:project/pullRequest/:number/accept`를 추가하고, native `git merge --no-ff`
wrapper로 conflict-free PR을 target bare repository에 병합한 뒤 `state = MERGED(6)`,
`merged_commit_id_from/to`, `PULL_REQUEST_MERGED` event/webhook을 기록한다.
후속 source branch lifecycle slice는 merged PR detail에 legacy branch action 상태를 노출하고
`DELETE`/`POST /api/v1/owners/:owner/projects/:project/pull-requests/:number/source-branch`
및 legacy `deletefrombranch`/`restorefrombranch` redirect route로 contributor가 non-default
from branch를 삭제하거나 merge commit의 source parent에서 복구할 수 있게 한다.
후속 ranged inline review slice는 PR changes diff에서 single-line add/context/deleted 라인의
`path/startLine/endLine`, `startSide/endSide`, `commitId`, `prevCommitId`를 제출해 inline review
thread를 생성하고 권한 있는 review comment edit/delete를 지원한다. Multi-line selection은 legacy
`yobi.CodeCommentBlock`처럼 선택 후 `.btnPop` 버튼을 거쳐 inline review form을 여는 흐름을 보존한다.
후속 reviewer threshold projection slice는 project의 legacy reviewer count 설정을 PR detail에
`requiredReviewerCount`, `lackingReviewerCount`, `reviewed`로 노출하고 reviewer status 표시를 갱신한다.
Legacy generated routes and `ReviewApp.review`/`unreview` expose no separate per-PR reviewer
assignment endpoint; the reviewer lifecycle is the current user marking or cancelling review state.
후속 PR watcher surface slice는 legacy `PullRequestTest.getWatchers_*`,
`git/view.scala.html` `#watch-button`, `WatchApp.watch`/`unwatch` 의미에 맞춰 contributor,
명시 PR watcher, target project watcher, review comment author를 detail `watcherCount`/`isWatching`에
반영하고, PR-level unwatch 및 project READ 권한 필터와 `/api/v1/.../pull-requests/:number/watch`
POST/DELETE mutation을 적용한다.
같은 legacy `getWatchers` + PR body mention 수신자 의미를 PR notification receiver에도 일부 반영해,
review comment author와 PR body에서 mention된 active user가 이후 PR 알림 수신자에 포함된다.
`/api/v1/owners/:owner/projects/:project/pull-requests`,
`/:number`, `/:number/changes`, `/reviews`, `/api/v1/organizations/:organization/pull-requests`
가 project READ + code-accessible-member-only 정책을 통과한 viewer에게만 열리며, mutation은
CSRF + authenticated session + detail permission projection을 요구한다. Legacy PR conflict handling은
`git/partial_state.scala.html`의 `.howto-resolve-conflict` 수동 해결 안내와 refresh action으로
확인되며, 별도 in-app conflict editor/controller는 legacy route/test 근거가 확인되지 않는다.
legacy external `/-_-api/v1/**` compatibility는 이번 app runtime batch에서 제외한다.

| 기능                       | Legacy 동작                          | 현재 상태 | Phase |
| -------------------------- | ------------------------------------ | --------- | ----- |
| PR 목록 (open/closed/sent) | 탭으로 분류, 필터, 페이지네이션      | Phase 4A read-only + legacy `git/partial_search.scala.html` / organization list shell, sender contributor select, recently pushed branch prompt/delete route, tab `num-badge` counts, PR row shell, closed/total review-thread badge, and `#pagination` pageNum controls 구현 | 4     |
| PR 생성                    | from/to 브랜치 선택, 제목/본문       | Phase 4B 구현 | 4     |
| PR 상세                    | 커밋 목록, 변경 파일, 댓글/타임라인  | Phase 4A read + Phase 4B interaction 구현 | 4     |
| PR diff 보기               | 파일별 unified diff, 인라인 코멘트   | diff read + specific commit changes route/filter + selected commit `.commitInfo`/`.commitMsg.mt5` metadata including legacy anonymous author label + side-aware single/multi-line ranged inline create/edit/delete + PRIOR commit/review-card outdated marker 구현 | 4     |
| PR 상태 관리               | open → merged / closed, 재열기       | close/reopen + reviewer-threshold-gated conflict-free merge accept 구현 | 4     |
| Merge 실행                 | legacy accept button                 | reviewer threshold 통과 후 native `git merge --no-ff` 구현; legacy route/view evidence has no squash/strategy selector | 4     |
| Merge 충돌 처리            | 충돌 시 알림, 수동 해결 안내         | native merge conflict 감지, PR conflict 표시, merge 비활성화 + legacy `.howto-resolve-conflict` 수동 해결 절차 안내 구현; 별도 in-app conflict editor는 legacy 근거 없음 | 4     |
| 리뷰 승인/철회             | 리뷰어가 승인/철회                   | Phase 4B 구현 | 4     |
| 리뷰 상태 카운트           | 필수 reviewer 수와 부족 reviewer 수 표시 | required/lacking/reviewed detail projection 구현 | 4     |
| 코드 리뷰 댓글             | 특정 라인에 인라인 댓글              | 일반 PR review comment + side-aware single/multi-line ranged inline create/edit/delete 구현 | 4     |
| 리뷰 스레드                | 인라인 댓글 스레드 open/close, 목록/Excel export | Phase 4B open/close mutation + project review list shell/current-user side filters/pagination/deep-link + `format=xls` export 구현 | 4     |
| Fork & PR                  | 프로젝트 fork → PR 워크플로우        | fork form/clone with legacy `git/fork.scala.html` scalar shell + reviewer-threshold-gated conflict-free PR merge accept 구현 | 4     |
| from 브랜치 삭제/복구      | merge 후 소스 브랜치 삭제/복구       | native Git wrapper 구현 | 4     |
| PR commit 변경             | source branch push 시 PR commit/event 갱신 | Smart HTTP post-receive에서 `PULL_REQUEST_COMMIT_CHANGED` event/webhook 구현 | 4     |
| 리뷰어 상태                | 현재 사용자의 review/unreview와 reviewer count | review/unreview, reviewer threshold projection, project default reviewer threshold settings lifecycle 구현; 별도 per-PR assignment route는 legacy에 없음으로 재분류 | 4     |

#### 검수 기준

- [x] PR 목록: open/closed/sent 탭, 각 PR에 제목/작성자/날짜/리뷰 상태 표시, legacy `projectLayout.scala.html` / `git/list.scala.html` header/menu shell, `git/partial_search.scala.html` / `organizationLayout` organization list shell with header/menu 뒤 별도 `.page-wrap-outer`, sender contributor select, recently pushed branch prompt/delete route, tab `num-badge` counts, `git/partial_list.scala.html` / organization PR row shell including contributor display-name link and no-author `issue.noAuthor` span fallback, closed/total review-thread badge, and `yobi.Pagination`-style `#pagination.page-navigation-wrap` numeric `pageNum` controls
- [x] PR 상세: legacy `projectLayout.scala.html` / `git/view.scala.html` overview shell anchors(`.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.project-page-wrap`, `.board-header.issue`, `.board-id`, `.author-info`, contributor `.avatar-wrap.smaller img`, `.loginid`, `.pullRequest-branchInfo`, `.content.markdown-wrap`, `.attachments`, `#state.pullRequest-stateInfo`, `partial_state.scala.html` safe/conflict/merged alert notices with merged-state receiver avatar identity, `.board-footer.board-actrow` with legacy `button.edit` / `pullRequest.close` / `pullRequest.reopen` labels, `#helpMessage.pullreq-info`)와 `partial_info.scala.html` overview/changes 탭, top `.pull-right` reviewer participants/review/merge controls(`#reviewers`, `pullRequest.review.participants`, reviewer avatar image, `pullRequest.review` / `pullRequest.unreview` / `pullRequest.merge` labels, `#btnAccept`), 및 open review-thread badge 구현; Overview는 legacy처럼 event timeline만 포함하고 non-legacy `review-list-wrap` / `h2 Reviews` review-thread section은 제거; Conversation 이벤트 타임라인은 legacy `partial_pull_request_event.scala.html` `ul.comments#comments` / `li.event#comment-*` / `.state` / `.date`, sender avatar/user tooltip anchors, merged commit `.link`, 그리고 `PULL_REQUEST_COMMIT_CHANGED` `ul.commit-list` / `.commit-info` / `.commit-id` / `.commitMsg` 렌더링 구현
- [x] PR 이벤트 상태/메시지 key는 legacy `conf/messages` 기준의 lowercase `pullRequest.event.*` / `pullRequest.event.message.*` 값을 사용하며, merge webhook copy도 uppercase enum 값을 노출하지 않는다.
- [x] PR 생성/수정 form: legacy `projectLayout.scala.html` / `git/create.scala.html` / `git/edit.scala.html` header/menu shell, class/id anchor와 `title.newPullRequest` / `title.editPullRequest`, `pullRequest.from` / `pullRequest.to`, `pullRequest.select.branch`, `pullRequest.menu.commit`, `pullRequest.send`, `button.save`, `button.cancel` label, from/to project/branch 표시, edit form branch/project disabled
- [x] PR 생성/수정 merge preflight: legacy `mergeResultURL`/`#mergeResult`/`#numOfCommits` anchor를 `/api/v1/.../pull-requests/merge-result`의 native Git wrapper 기반 비파괴 preview와 연결
- [x] PR interaction: close/reopen, review/unreview, changes 페이지의 legacy `projectLayout.scala.html` / `git/viewChanges.scala.html` header/menu shell, `board-comment-wrap` / `non-ranged-threads-wrap` 일반 PR comment와 `common/commentForm.scala.html` `#comment-form` / `.write-comment-box` / `.write-comment-wrap` / `#dynamic-comment-btn` / `contents` editor anchors, `button.comment.new` / `button.edit` / `button.save` / `button.cancel` / `common.comment.delete` comment controls, review thread open/close
- [x] PR review threshold projection: required/lacking/reviewed 상태를 detail payload와 reviewer status UI에 표시
- [x] 인라인 코드 리뷰: diff 뷰에서 add/context/deleted 라인 클릭 또는 같은 파일 diff text 선택 → 댓글 입력 → side-aware single/multi-line 스레드 생성/edit/delete 구현
- [x] 리뷰 스레드: open/close 상태 전환 구현; legacy `CommentThreadApp.open/close` direct route `POST /threads/:id/open|close`, ranged `partial_comment_thread.scala.html` shell, non-ranged `code/partial_nonrange_codecomment_thread.scala.html` shell(`.comment-thread-wrap` state class, `.yobicon-comments`, no ranged `.thread-header`/state badge), and `partial_comment_form_on_thread.scala.html`의 `UserApp.currentUser()` author avatar/info, `commentThread.open`/`commentThread.close` 버튼 anchor, `button.comment.new` submit label, `common.editor` edit/preview tab shell, `code-review-body`, notification receiver, `REVIEW_COMMENT` upload/drop anchors/data-attachments readback 구현; project review list의 legacy `projectLayout.scala.html` / `reviewthread/list.scala.html` header/menu side filter/search/tab/list/export shell, `UserApp.currentUser().id` 기반 `review.involvingYou` / `review.createdByYou` filter link와 badge count, `yobi.Pagination`-style `#pagination.page-navigation-wrap` numeric `pageNum` controls, `partial_list.scala.html` post rows, avatar/info/comment-count/empty-state anchors plus no-author `issue.noAuthor` span fallback, `DiffRenderer.urlToCommentThread` PR changes 및 commit detail deep-link, `format=xls` Excel 호환 export 구현; PR changes specific commit 선택, PRIOR selected label, selected commit `.commitInfo`/`.commitMsg.mt5` and legacy anonymous author label, `.btn-show-reviewcards`/`.btn-hide-reviewcards`, `#reviewcards-open`/`#reviewcards-closed` review card 탭, `.review-card.open|closed.outdated`, `.outdated-label`, `partial_reviewlist.scala.html` review card의 legacy `DiffRenderer.urlToCommentThread` changes-container deep-link 및 empty `review.is.empty` card placeholder 제거, current changes inline diff의 outdated/commit-only thread 제외 표시, API-level `inlineThreads`/`nonRangedThreads`/`cardThreads` 분리 구현
- [x] Merge: reviewer threshold를 만족하고 충돌 없으면 merge 버튼 활성화, 충돌/리뷰 부족 시 비활성화 + 안내
- [x] Fork: 프로젝트 fork 시 동일 이름의 개인/조직 프로젝트 생성, bare repo 복제

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
| 전체 검색         | 모든 프로젝트의 이슈/게시판/댓글/마일스톤 검색                                  | implemented (Phase 5C app runtime) | 5     |
| 프로젝트 내 검색  | 특정 프로젝트 범위 검색                                                         | implemented (Phase 5C app runtime) | 5     |
| 조직 내 검색      | 조직 소속 프로젝트 범위 검색                                                    | implemented (Phase 5C app runtime) | 5     |
| 검색 타입 필터    | issue, project, posting, issue_comment, posting_comment, milestone, review_comment, user | implemented (Phase 5C app runtime) | 5     |
| 검색 결과 그룹핑  | 타입별 결과 수 + 결과 목록                                                      | implemented (Phase 5C app runtime) | 5     |
| 검색 페이지네이션 | 결과 페이지네이션                                                               | implemented with legacy `yobi.Pagination` `page-navigation-wrap`/`page-nums` controls | 5     |

#### 검수 기준

- [x] 검색 결과: legacy `search/result.scala.html`과 동일한 타입별 탭 + 결과 목록 구조를 렌더링하고, `search/partial_*.scala.html` author meta의 `/:loginId` tooltip link, no-author `issue.noAuthor` span fallback, and created-date title scalar를 보존하며, project-scoped search는 legacy `projectLayout.scala.html` / `projectMenu.scala.html` shell anchors를, organization-scoped search는 legacy `organizationLayout` / `organization.header.scala.html` / `organization.menu.scala.html` shell anchors (`.project-header-outer`, `.project-header-inner`, `.project-header-wrap`, `.group-title-head`, `.project-menu-outer`)를 검색 본문 앞에 보존한다
- [x] 검색 결과 pagination: legacy `search/partial_*.scala.html`처럼 결과 partial의 `#pagination`을 `yobi.Pagination` shape(`.page-navigation-wrap`, `ul.page-nums`, `input[name=pageNum]`, prev/next icon links)로 렌더링한다
- [x] 검색 범위: 전체/프로젝트/조직 3가지 모드 지원
- [x] 검색 대상: Issue, Project, Posting, IssueComment, PostingComment, Milestone, ReviewComment, User
- [x] 각 결과 항목: 프로젝트명, 제목/내용 스니펫, 작성자, 날짜 표시

**Phase 5C 구현 메모**: app runtime REST는 `/api/v1/search`, `/api/v1/projects/:owner/:project/search`, `/api/v1/organizations/:organization/search`만 제공한다. `keyword`와 `searchType`는 required이고 invalid/missing query, project-scoped `searchType=project` deep link, and non-forbidden/non-not-found REST query failures는 legacy `SearchApp`처럼 search form fragment나 temporary `Search failed.` banner가 아니라 common bad-request shell(`error.badrequest`)로 처리된다. `searchType=auto`는 legacy order대로 result type을 선택하며, project scope에서는 `project` type을 제외한다. 결과 목록은 title hit와 hit count를 우선하는 lightweight relevance score로 정렬하고 동점은 기존 legacy/date order를 유지한다. Snippet window/overlap 동작은 legacy `SearchResultTests`의 한국어 예제를 Rust search crate 회귀 테스트로 고정했고, keyword spacing은 legacy `SearchResult.makeSnippets` / `Search.icontains`처럼 trim하지 않는 literal match로 처리하며, snippet이 원문보다 짧으면 legacy search partials처럼 React 결과 본문에 `.....` suffix를 붙인다. Project result visibility는 legacy `SearchTests.findProjects`에서 빌린 익명 public/private ACL 계약으로 고정되어, 전역 `searchType=project`는 public project match를 반환하고 private project match를 제외한다. `/-_-api/v1/**` legacy external search compatibility, full-text index, async indexing, index-backed ranking 개선은 별도 migrator/deferred scope다.

---

### FG-13: 알림 (Notifications)

**Legacy 참조**: `yona-original/app/controllers/NotificationApp.java`, `WatchApp.java`, `WatchProjectApp.java`, `app/models/NotificationEvent.java`, `NotificationMail.java`, `Watch.java`

**Legacy 라우트**:

```
GET   /notifications         → 알림 목록 full page
GET   /notification          → 알림 목록 incremental partial fragment
POST  /noti/toggle/:projectId/:notiType → 프로젝트별 알림 타입 토글
GET   /unwatch?resource.type=...&resource.id=... → 리소스 감시 해제 후 target redirect
POST  /unwatch?resource.type=...&resource.id=... → 리소스 감시 해제 후 target redirect
```

#### 기능 목록과 상태

| 기능                 | Legacy 동작                                       | 현재 상태                | Phase |
| -------------------- | ------------------------------------------------- | ------------------------ | ----- |
| 알림 목록            | 시간역순 알림 이벤트 목록                         | ✅ Phase 2N 기본 구현    | 5     |
| 이메일 알림          | 이벤트 발생 시 이메일 발송                        | ✅ startup scheduler + due-row outbound fan-out helper + allowed-domain/BCC/recipientLimit/language grouping, legacy case-insensitive relative-link/image HTML post-processing, HTML MIME body, and reply-capable `Reply-To` detail 구현 | 5     |
| 프로젝트별 알림 설정 | NEW_ISSUE, NEW_POSTING, NEW_COMMENT 등 토글       | ✅ 기본 구현, direct `/noti/toggle/:projectId/:notiType` 포함 | 1     |
| Watch/Unwatch        | 리소스(이슈/프로젝트) 감시                        | ✅ 프로젝트 토글 + direct watch/unwatch 구현 | 1     |
| 알림 이벤트 타입     | 이슈 생성, 댓글, 상태변경, PR 생성/merge, 리뷰 등 | 🔶 핵심 list projection 구현 | 5     |
| BCC 모드             | 수신자 간 이메일 주소 비공개                      | ✅ `YONA_NOTIFICATION_MAIL_HIDE_ADDRESS` 기본 true | 5     |
| 알림 간격            | `notification.bymail.interval` 배치 발송          | ✅ startup scheduler 기본 구현 | 5     |
| Draft-time 머징      | 30초 내 연속 편집 알림 병합                       | ✅ notification event/mail queue merge 구현 | 5     |
| 수신자 제한          | `recipientLimit` 설정                             | ✅ BCC partition 기본 구현 | 5     |

#### 검수 기준

- [x] 알림 목록: legacy `/notifications` full-page 화면이 `siteLayout` 내부 별도 `page-wrap-outer`, `page-wrap`, `site-guide-outer` welcome guide, `welcome-table`, `guide-toggle` / `#toggleIntro`, `content-container`, `main-stream`, `common/mySeriesMenuTab.scala.html` notification/my-issues/files tabs plus `#setDefaultLoginPage`, `activity-streams notification-wrap`, `notification-stream`, sender/default avatar, `data-toggle="learnmore"` row-area expand/collapse with anchor/image click exclusion, overflowing `message-wrap.nowrap` rows의 `.more` ellipsis hint, `partial_notifications.scala.html` empty state (`warning-none`, `yobicon-danger`, `notification.none`; React full-page route는 같은 UI를 valid `li.warning-none`으로 표현), and More anchors를 표시하고, direct `/notification?from=&limit=` compatibility route는 legacy incremental partial endpoint fragment와 `#notification-more` fetch script를 반환한다
- [x] 알림 목록 event projection: legacy `partial_notifications.scala.html` icon class와 `NotificationEvent.getMessage`의 PR state/review/thread message key를 core issue/post/PR/review/commit notification에 반영한다
- [x] 이메일 알림/mailbox: startup scheduler가 legacy 기본값(`notification.bymail.enabled` true, initdelay 5000ms, interval 60000ms, delay 180000ms)과 `YONA_NOTIFICATION_MAIL_*` override를 적용해 due `notification_mail` row를 outbound mail로 fan-out하고 queue row를 삭제한다. legacy `application.allowed.sending.mail.domains` / `YONA_ALLOWED_MAIL_DOMAINS` 도메인 필터, 기본 BCC hide-address mode, `application.notification.bymail.recipientLimit` / `YONA_NOTIFICATION_MAIL_RECIPIENT_LIMIT` partitioning, and preferred-language receiver grouping도 적용한다. legacy `NotificationMail.handleLinks`의 external-link `noreferrer` 처리와 `notificationMail.scala.html`의 HTML shell/view-link/resource-unwatch/settings-footer 구조는 Rust helper와 계약 테스트로 고정했고, outbound notification mail is sent as HTML MIME content like legacy `HtmlEmail.setHtmlMsg`; `YONA_MAILBOX_IMAP_ADDRESS`가 설정된 reply-capable issue/board/review resource mail은 legacy `Reply-To` plus-address detail과 reply-capable view-link copy를 보존하며 comment notifications use their parent issue/post/review-thread detail. direct `/unwatch` mirrors `WatchApp.unwatch` for legacy resource aliases by enforcing project READ access, recording unwatch rows, redirecting HTML requests to the resolved issue/post/PR/project target, and returning empty `200 OK` for JSON-preferred requests. inbound `original_email` issue/board/code/review comment markers는 issue detail/timeline, board post detail, commit discussion, PR detail/changes/review-list API와 legacy `data-via-email` comment body anchor에 노출한다. mailbox plus-address detail parsing and IMAP-recipient detail routing mirror legacy `EmailAddressWithDetail` / `EmailHandler.getMailAddressesToYobi`; READ-filtered project target lookup mirrors legacy `EmailHandler.getProjects`; Message-ID 좌측 식별자 파싱 mirrors legacy `IMAPMessageUtil.getIdLeftFromMessageId`; `In-Reply-To`/`References` Message-ID token parsing mirrors legacy `EmailHandler.parseMessageIds` and thread-id collection; sender lookup mirrors legacy `IMAPMessageUtil.extractSender` / `User.findByEmail` From-address order with primary and valid workspace email matching; raw RFC822 mailbox ingestion now unfolds headers, extracts From/recipient/thread headers, parses multipart MIME boundaries, applies quoted-printable and base64 transfer decoding, and feeds legacy MIME content selection; parsed mailbox-message normalization folds subject, From addresses, IMAP recipient details, thread Message-IDs, and MIME content into the normalized orchestration DTO; app-level parsed/raw message bridges feed that DTO into DB-backed sender/project/reply-target/action execution; normalized mailbox-message orchestration wires sender/project/reply-target/action/execute decisions and now short-circuits duplicate inbound Message-ID reprocessing before creating a second resource; MIME content selection mirrors legacy `CreationViaEmail.extractContent` for text parts, `multipart/alternative`, `multipart/related`, root part selection, and joined multipart text; DB-backed mailbox resource creation and execution now mirror legacy `CreationViaEmailTest` / `EmailHandler.createResources` for issue, issue comment, board comment, review comment, and new-issue fallback creation with `original_email` rows; exact `original_email.message_id` reply target lookup plus Message-ID-left direct resource-path fallback mirror legacy `EmailHandler.findResourcesByMessageId`; recipient detail resource lookup mirrors legacy `EmailHandler.getThreads` / `getResourceFromDetail`, including enum-style `ResourceType` names such as `COMMENT_THREAD` and `ISSUE_POST`; mailbox action planning mirrors legacy `EmailHandler.createResources` project/resource matching and new-issue fallback. `YONA_MAILBOX_FETCH_COMMAND` executable polling processes NUL-separated raw RFC822 messages through that same raw mailbox bridge.
- [x] 이메일 알림 준비: notification event 생성 시 `notification_mail` queue row를 만들고 due row drain helper가 created ASC로 event id를 반환한 뒤 queue row를 삭제한다
- [x] 알림 토글: 프로젝트별 이벤트 타입(NEW_ISSUE, NEW_POSTING, NEW_COMMENT 등) on/off, including legacy direct `POST /noti/toggle/:projectId/:notiType` empty-OK response over the same READ/watch/CSRF checks
- [x] 프로젝트 감시 direct route: `POST /:owner/:project/watch|unwatch` returns legacy empty `200 OK` over the same project READ/session/CSRF checks, and unwatch removes the user's `user_project_notification` overrides for that project
- [x] 알림 이메일/mailbox: legacy 메일 링크 external `noreferrer` 처리, `notificationMail.scala.html` HTML shell/view-link/resource-unwatch/settings-footer body, raw mailbox reply threading, and executable-backed mailbox polling 구현

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
| 웹훅 CRUD   | payload URL, secret, active, 이벤트 타입 | ✅ 구현   | 5     |
| 이벤트 발송 | JSON payload를 설정된 URL로 POST         | 🔶 부분 구현 | 5     |
| Secret 전달 | `Authorization: token <secret> ` 헤더    | 🔶 부분 구현 | 5     |
| 이벤트 타입 | issue, pull_request, comment, review 등  | 🔶 부분 구현 | 5     |
| Hangout Chat thread | `DETAIL_HANGOUT_CHAT` 응답의 `thread.name`을 resource별로 저장/재사용 | ✅ 구현 | 5 |
| 실행 이력   | 발송 성공/실패 기록                      | 🔶 delivery history row/settings read surface, retry, private endpoint guard, and HTTP/HTTPS delivery 구현 | 5     |

#### 검수 기준

- [x] 웹훅 생성/삭제: UPDATE 가능한 프로젝트에서만 create form을 표시하고, payload URL, secret, webhook type, gitPush 선택을 legacy `project/webhooks.scala.html` / `partial_webhooks_list.scala.html` form/list shell(`project.webhook.new`, payload/secret placeholders, literal type radio labels, `project.webhook.includeGitPush`, help block, list headers, row `h6` wrappers, delete request URI)과 app runtime REST CRUD로 제공한다
- [x] Issue/comment non-JSON payload fan-out: `NEW_ISSUE`와 `NEW_COMMENT`가 legacy `Webhook.sendRequestToPayloadUrl`의 text payload shape, `Content-Type: application/json`, `User-Agent: Yobi-Hookshot`, and `Authorization: token <secret> ` header를 유지하고 `JSON` webhooks를 push-only로 제외한다.
- [x] Pull request/review/comment/merge non-JSON payload fan-out: `NEW_PULL_REQUEST`, `PULL_REQUEST_REVIEW_STATE_CHANGED`, `NEW_REVIEW_COMMENT`, and `PULL_REQUEST_MERGED` use the legacy PR link/text shape, token secret header, and JSON-webhook exclusion.
- [x] Push JSON payload: legacy `Webhook.sendRequestToPayloadUrl(commits, refNames, sender)` 포맷과 호환
- [x] Pull request commit-changed fan-out: Smart HTTP pushes to open PR source branches persist `PULL_REQUEST_COMMIT_CHANGED` and dispatch the legacy non-JSON PR webhook shape; plain close/reopen did not call project webhooks in observed legacy code.
- [x] DETAIL_HANGOUT_CHAT thread reuse: legacy `WebhookThread` semantics are mirrored for issue/comment and PR webhook fan-out by persisting the first successful response `thread.name` per webhook/resource and sending it on follow-up payloads.
- [x] Delivery history read surface: `/api/v1/owners/:owner/projects/:project/webhooks` returns recent `webhook_delivery` rows and `/:owner/:project/webhooks` renders `#webhookDeliveryHistory` / `.webhook-history-wrap` with success/failure status, payload URL, response body, and error message.
- [x] Retry behavior: `YONA_WEBHOOK_DELIVERY_RETRIES` / `WEBHOOK_DELIVERY_RETRIES` retries transient webhook failures up to 5 times before recording the final success/failure result.
- [x] Private/internal endpoint guard: enabled HTTP delivery rejects DNS endpoints that resolve only to loopback/private/link-local/unspecified/multicast addresses unless `YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS` / `WEBHOOK_ALLOW_PRIVATE_NETWORKS` is explicitly true.
- [x] HTTPS delivery via local `curl` executable wrapper, preserving retry/history/private-endpoint guard semantics
- [ ] HMAC-style signature compatibility is not present in observed legacy `Webhook.java`; only add if external integration evidence requires it.

---

### FG-15: 파일 첨부 (Attachments)

**Legacy 참조**: `yona-original/app/controllers/AttachmentApp.java`, `app/models/Attachment.java`

**Legacy 라우트**:

```
POST  /files                  → 파일 업로드
GET   /files                  → 파일 목록(JSON, containerType/containerId)
GET   /files/:id              → 파일 다운로드
GET   /files/:id/?            → 파일 다운로드 (legacy trailing-slash alias)
DELETE /files/:id             → 파일 삭제
POST  /files/:id              → legacy `_method=delete` 파일 삭제
POST  /files/:id/?            → legacy `_method=delete` 파일 삭제 (trailing-slash alias)
```

#### 기능 목록과 상태

| 기능           | Legacy 동작                       | 현재 상태 | Phase |
| -------------- | --------------------------------- | --------- | ----- |
| 파일 업로드    | multipart form-data               | ✅ 구현   | 1     |
| 파일 목록      | `attachments`/`tempFiles` JSON    | ✅ 구현   | 1     |
| 파일 다운로드  | content-disposition               | ✅ 구현   | 1     |
| 파일 삭제      | 작성자 또는 관리자                | ✅ 구현(업로드 작성자/site admin) | 2     |
| Container type | 이슈/게시판/PR/프로젝트 등에 연결 | 🔶 부분 구현(legacy enum명: issue/board/PR/milestone, issue/board/PR edit sync) | 2     |
| 파일 크기 제한 | `application.maxFileSize`         | ✅ 구현(`YONA_MAX_FILE_SIZE`) | 2     |
| MIME type 검사 | 업로드 시 MIME 검사               | ✅ 구현(Tika-compatible content/name detection) | 2     |
| 아바타 업로드  | 프로필 아바타 전용                | ✅ 구현   | 1     |

#### 검수 기준

- [x] 업로드: multipart POST → 파일 저장 → ID 반환
- [x] 목록: legacy `GET /files?containerType=&containerId=` returns `{attachments,tempFiles}` with `id/name/url/size/mimeType` for `yobi.Files` / `yobi.Attachments`
- [x] 다운로드: `GET /files/:id` → 원본 파일명 + MIME type + content
- [x] 삭제: `DELETE /files/:id` 또는 legacy `POST /files/:id` → 업로드 작성자 또는 site admin만 삭제 가능
- [x] Legacy trailing-slash attachment aliases `GET /files/:id/` and `POST /files/:id/` reuse the same download/delete behavior
- [~] 마크다운 에디터에서 drag-and-drop 또는 클립보드 붙여넣기로 이미지 첨부 가능: 이슈 본문/댓글, 게시판 글/댓글, PR 생성/수정 본문, 일반 PR review comment, milestone 생성/수정 본문, non-ranged Git code comment/reply/edit 에디터, inline ranged Git code-comment reply/edit 에디터는 legacy처럼 이미지 업로드 후 `![name](url)` 삽입과 `attachmentIds` 제출을 지원한다. Git/PR diff same-file multi-line block selection과 inline code-comment edit은 구현됐다.
- [x] Issue body/comment attachment binding keeps legacy `ISSUE_POST` / `ISSUE_COMMENT` container names, only moves the current actor's temporary uploads, and edit sync removes omitted attachments.
- [x] Board post/comment attachment binding keeps legacy `BOARD_POST` / `NONISSUE_COMMENT` container names, only moves the current actor's temporary uploads, and edit sync removes omitted attachments.
- [x] Milestone attachment binding keeps legacy `MILESTONE` container names and only moves the current actor's temporary uploads, matching `Attachment.moveOnlySelected(user.asResource(), milestone.asResource(), ...)`.
- [x] PR create/edit attachment binding keeps legacy `PULL_REQUEST` container names, only moves the current actor's temporary uploads, and edit sync removes omitted PR attachments.
- [x] PR review-comment attachment readback keeps legacy `REVIEW_COMMENT` file metadata in comment `attachments` payloads and React `data-attachments` anchors.
- [x] Project/organization settings logo attachment binding keeps the legacy `PROJECT` / `ORGANIZATION` container names, accepts actor-owned image uploads up to the legacy 5MB logo limit, and returns `logoUrl` through detail/container responses plus the public project/organization directory feeds.
- [x] `YONA_MAX_FILE_SIZE` 설정값 초과 시 업로드 거부
- [x] MIME type은 legacy `Attachment.save` / `FileUtil.detectMediaType`처럼 multipart header만 신뢰하지 않고 업로드 바이트와 파일명으로 판별한다
- [x] 다운로드 응답은 legacy `AttachmentApp.getFile`처럼 기본 `inline`, `?action=download` 요청은 `attachment` Content-Disposition과 RFC 2231 파일명을 반환한다
- [x] 다운로드 캐시는 legacy `AttachmentApp.getFile`처럼 `Cache-Control: private, max-age=3600`, disposition별 ETag, `If-None-Match` 304를 반환한다
- [x] `Range` 요청에는 legacy처럼 `Accept-Ranges: bytes` 헤더를 반환한다

---

### FG-16: 관리자 (Site Admin)

**Legacy 참조**: `yona-original/app/controllers/SiteApp.java`, `app/views/site/*.scala.html`, `app/models/SiteAdmin.java`

**Legacy 라우트**:

```
GET   /sites/userList          → 사용자 목록
GET   /sites/projectList       → 프로젝트 목록
GET   /sites/postList          → 게시글 목록
GET   /sites/issueList         → 이슈 목록
POST  /sites/toggleSiteAdminRole/:loginId → 관리자 역할 토글
POST  /sites/toggleAccountLock → 계정 잠금/해제
POST  /sites/toggleGuestMode   → 게스트 모드 토글
POST  /:user                   → site manager 비밀번호 재설정 JSON
DELETE /sites/user/delete:id    → 사용자 삭제
DELETE /sites/project/delete/:id → 프로젝트 삭제
GET   /sites/mail              → 메일 설정
POST  /sites/mail              → 테스트 메일 발송
POST  /sites/mailList          → 대량 메일 발송
GET   /sites/diagnostic        → 시스템 진단
GET   /sites/update            → 업데이트 확인
POST  /sites/unwatchUpdate     → 업데이트 알림 숨김
GET   /sites/data              → 데이터 관리
GET   /sites/noAvatarUsers     → avatar 미설정 active 사용자 JSON
POST  /sites/setAttachmentToUserAvatar → 첨부 파일을 사용자 avatar로 지정
POST  /sites/import            → 데이터 임포트
GET   /sites/export            → 데이터 익스포트
```

#### 기능 목록과 상태

| 기능                   | Legacy 동작                        | 현재 상태 | Phase |
| ---------------------- | ---------------------------------- | --------- | ----- |
| 사용자 목록/관리       | 목록, 검색, 관리자/잠금/게스트 토글, 비밀번호 재설정, 사용자 삭제, no-avatar 사용자 JSON/보정 | ✅ 구현(`/sites/userList`, `/sites/toggleSiteAdminRole/:loginId`, `/sites/toggleAccountLock`, `/sites/toggleGuestMode`, `POST /:user`, `/sites/user/delete:id`, `/sites/noAvatarUsers`, `/sites/setAttachmentToUserAvatar`, `/api/v1/site/users`, `/api/v1/site/no-avatar-users`) | 6     |
| 프로젝트 목록/관리     | 목록, 검색, 삭제                   | ✅ 구현(`/sites/projectList`, `/sites/project/delete/:id`, `/api/v1/site/projects`) | 6     |
| 게시글 목록            | 전체 게시글 읽기 목록              | ✅ 구현(`/sites/postList`, `/api/v1/site/posts`) | 6     |
| 이슈 목록              | 전체 이슈 읽기 목록                | ✅ 구현(`/sites/issueList`, `/api/v1/site/issues`) | 6     |
| 메일 설정/테스트       | SMTP 테스트, 대량 메일             | ✅ 구현(`/sites/mail`, `/sites/massmail`, `/sites/mailList`, `/api/v1/site/mail*`) | 6     |
| 시스템 진단            | Diagnostic.checkAll 오류 목록      | ✅ 구현(`/sites/diagnostic`, `/api/v1/site/diagnostics`) | 6     |
| 데이터 임포트/익스포트 | 전체 데이터 백업/복원              | export download implemented (`/sites/export`) with project scope/VCS metadata, standalone labels/milestones, post/issue/comment attachment metadata, optional `contentBase64` attachment payloads, and issue milestone titles; `/sites/import` restores supported `yobi-data` user/project scope/VCS/label/milestone/post/issue body metadata plus post/issue label, comment, body-history, milestone-title, existing attachment-id relationships, and portable attachment `contentBase64` files from JSON or legacy multipart upload, including Play/Yona-style multipart success/no-file redirects | 2차   |
| 업데이트 확인          | 새 버전 확인                       | configured update status and visible `site.update.download` link to `/sites/update/download` plus metadata discovery implemented (`/sites/update`, `/api/v1/site/update`); app-owned download redirect implemented (`/sites/update/download`, `/api/v1/site/update/download`); file/plain-HTTP/HTTPS binary download proxy implemented (`/sites/update/download-file`, `/api/v1/site/update/download-file`) | 2차   |

#### 검수 기준

- [x] 등록된 관리자 화면: legacy compiled routes에 존재하는 `/sites/*` 관리자 경로는 site_admin 역할만 접근 가능하고, legacy에 없는 `/sites/:unknown`은 placeholder 없이 not-found shell로 닫힌다
- [x] 사용자 목록 REST: site admin 전용 `/api/v1/site/users`, 검색, 페이지네이션, 관리자 역할 토글, 계정 잠금/해제, 게스트 모드 토글, 비밀번호 재설정, 사용자 삭제(`/api/v1/site/users/:loginId` DELETE)
- [x] 사용자 목록 UI core: legacy `/sites/userList` shell, `site.userList.*` state tabs, `user.name` / `user.email` / `userinfo.since` / `userinfo.leave` headers, legacy `socialDate(user.createdDate)` created scalar, deleted-state `lastStateModifiedDate` leave scalar, user avatar image URLs, `site.userList.search` placeholder, icon-only search button, empty `user-list-wrap`, 페이지네이션, legacy `button.user.*` 관리자 역할/계정 잠금/게스트 토글 labels, `title.resetPassword`, `user.newPassword`, and `site.user.delete*` 사용자 삭제 modal/action labels plus `data-dismiss="modal"` no-button and `×` close glyph
- [x] 사용자 관리 direct aliases: legacy `/sites/toggleSiteAdminRole/:loginId`, `/sites/toggleAccountLock?loginId=&state=&query=`, `/sites/toggleGuestMode?loginId=&state=&query=`, `POST /:user`, `/sites/user/delete:id`, and `/sites/project/delete/:id` preserve site-admin/CSRF gates, state/query redirect targets, site-manager password reset JSON, only-manager delete guard, and project deletion redirect
- [x] 사용자 삭제: legacy only-manager guard, project membership cleanup, deleted-state projection
- [x] No-avatar 사용자 보정: site admin 전용 `/api/v1/site/no-avatar-users`, `/api/v1/site/users/avatar-from-attachment`, legacy direct `/sites/noAvatarUsers`, `/sites/setAttachmentToUserAvatar` JSON routes preserve active-user/no-avatar filtering, `{loginId,name,email}` payload, `avatarFileId`/`email` body, and image attachment promotion semantics
- [x] 프로젝트 목록: `site.project.filter` placeholder, icon-only search button, `project.name` / `project.description` / `project.created` headers, legacy `geYMDDate(project.createdDate)` date-only created scalar, project logo image URLs, empty `project-list-wrap`, 검색, 페이지네이션, legacy `button.delete` and `site.project.delete*` 프로젝트 삭제 modal/action labels plus `data-dismiss="modal"` no-button and `×` close glyph
- [x] 게시글 목록: site admin 전용 `/api/v1/site/posts`, 30-item pagination with legacy `yobi.Pagination` `page-navigation-wrap`/`page-nums` controls, legacy `/sites/postList` shell/sidebar/list/link anchors, project logo / author avatar image URLs, `agoOrDateString(post.createdDate)` visible created label plus `JodaDateUtil.getDateString(post.createdDate)` title scalar, `yobicon-comments` comment count anchors, empty `post-list-wrap`
- [x] 이슈 목록: site admin 전용 `/api/v1/site/issues`, `issue.state.open` / `issue.state.closed` tabs, 30-item pagination with legacy `yobi.Pagination` `page-navigation-wrap`/`page-nums` controls, legacy `/sites/issueList` shell/sidebar/list/link anchors, project logo / author avatar image URLs, `agoOrDateString(issue.createdDate)` visible created label plus `JodaDateUtil.getDateString(issue.createdDate)` title scalar, `yobicon-comments` comment count anchors, empty `post-list-wrap`
- [x] 시스템 진단: site admin 전용 `/api/v1/site/diagnostics`, legacy `/sites/diagnostic` `siteMngLayout` breadcrumb/sidebar key anchors (`site.sidebar`, `site.sidebar.*`) and plain `row-fluid` content wrapper, `site.sidebar.diagnostics` title area, `site.diagnostic.errorNotFound` / `site.diagnostic.errorFound` status keys, plain `<ul>`, and `<pre>` error rows
- [x] 메일 테스트/대량 메일: site admin 전용 `/api/v1/site/mail`, `/api/v1/site/mail/test`, `/api/v1/site/mail-list`, legacy `/sites/mail` `siteMngLayout` form shell with `title.sendMail`, `site.mail.*` labels/placeholders/status copy including the `site.mail.notConfigured` `/admin/mailconf` argument and legacy missing-key labels `smtp.host`, `smtp.user`, `smtp.password`, direct form-urlencoded `POST /sites/mail` test-mail submit with `sended=true` success state, legacy `/sites/massmail` `title.massMail`, radio/data-toggle/project input/add/write anchors, recipient lookup/mailto shell, and direct `/sites/mailList` form-urlencoded JSON-array recipient resolver
- [x] 업데이트 화면: `/sites/update` is site-admin-gated and preserves the legacy `site/update.scala.html` `site.sidebar.update` title plus shared update sidebar `notification-badge`, no-update current-version argument/update-available/error branches over `/api/v1/site/update`; direct legacy `POST /sites/unwatchUpdate` is site-admin/CSRF-gated and hides the in-process update notification flag; configured `YONA_UPDATE_METADATA_URL` / `YONA_UPDATE_METADATA_FILE` JSON discovery fills the live update-available branch. the visible `site.update.download` CTA points to `/sites/update/download`, and `/sites/update/download` plus `/api/v1/site/update/download` own the site-admin-gated redirect action; `/sites/update/download-file` and `/api/v1/site/update/download-file` fetch configured `file://`, plain `http://`, or `https://` release payloads as attachment downloads; HTTPS fetch uses the local `curl` executable by default and can be overridden with `YONA_UPDATE_HTTPS_FETCH_COMMAND`.
- [x] 데이터 관리 화면/export/import: `/sites/data` is site-admin-gated and preserves the legacy `site/data.scala.html` `site.sidebar.data` title, warning list, export anchor, multipart import form, unlabeled `<input type="submit">`, and `name="data"` file input; `/sites/export` is site-admin-gated and downloads a `yobi-data-*.json` app-runtime snapshot with user/project body/scope/VCS metadata plus standalone label/category metadata, standalone milestone metadata/body/state/attachments, post/issue label, nested comment, body-history, issue milestone-title, post/issue/comment attachment metadata, and optional portable `contentBase64` attachment payloads; `/sites/import` is site-admin/CSRF-gated and restores supported `yobi-data` user/project body/scope/VCS/label/milestone/post/issue body metadata plus post/issue label, nested comment, body-history, milestone-title, existing attachment-id relationships, portable attachment files from JSON or multipart upload, and `/files/:oldId` Markdown links to restored portable attachment ids, with legacy multipart success redirect to `/` and missing-file redirect to `/sites/data`.

---

### FG-17: 마크다운 렌더링 (Markdown)

**Legacy 참조**: `yona-original/app/controllers/MarkdownApp.java`, 각 view의 마크다운 렌더링

**Legacy 라우트**:

```
POST  /markdown/:owner/:project → 프로젝트 컨텍스트 마크다운 원문 반환(React preview 렌더링용)
```

#### 기능 목록과 상태

| 기능            | Legacy 동작                      | 현재 상태 | Phase |
| --------------- | -------------------------------- | --------- | ----- |
| 마크다운 렌더링 | GFM + 확장 문법                  | implemented for known evidence-backed app-runtime surfaces, including React-side project preview autolinks, metadata-backed legacy commit SHA autolinks for raw SHA, `@SHA`, `owner@SHA`, and `owner/project@SHA` on PR/code comment render paths, React-side sanitized raw HTML blocks that preserve legacy-safe tags while keeping raw HTML contents opaque to autolink parsing, inline-safe raw HTML paragraph fragments with surrounding Markdown/autolinks still parsed including inline block-tag forms whose children parse before unsupported wrappers are stripped, raw HTML comments kept opaque to autolinks, declarations/processing instructions and CDATA sections stripped after parsing, marked-compatible leading-space ATX and setext heading ids/levels/head-anchor links with repeated-heading slug de-duplication, setext heading splitting before following paragraph text, rendered-inline-text/entity-unescaped slug basis, and raw-inline-HTML heading rendering/tag-stripped slug basis, marked-compatible soft line breaks, legacy `readme-body` `breaks: false` soft-line behavior, and hard-break marker consumption, marked-compatible backslash escapes, marked-compatible horizontal rules including spaced and tab-separated markers, inline emphasis/strong/delete with nested inline parsing, asterisk/underscore delimiters including intraword underscore suppression and delimiter-adjacent whitespace handling/rejection, single/double-tilde delete delimiters with whitespace/triple-tilde rejection, and triple-emphasis `<strong><em>` nesting plus spaced triple-emphasis outer-strong behavior, marked-compatible inline code span delimiter/newline/space normalization, marked-compatible numeric/core/common named HTML entity decoding in normal text plus link/image labels, titles, and href/src targets while preserving code span literals, inline/reference-style links/images with one-level nested labels, legacy empty-angle reference targets, single- and multi-backtick code spans inside link labels, literal backtick image alt labels, adjacent reference/image tokenization, escaped labels/targets/titles plus unescaped displayed labels, marked-style whitespace around inline targets, empty inline link targets, scheme-less relative href/src targets, single-newline inline titles, balanced parentheses in targets, marked/`encodeURI`-style target href/src encoding for brackets, braces, pipe, caret, backtick, and non-ASCII path text, safe uppercase scheme handling, unsupported leading scheme sanitizer-style stripping, and legacy sanitizer `file:`/`zpl:` target allowlist handling, newline-split target/title definitions including target and title on separate continuation lines, escaped definition target/title punctuation, and fenced-code definition exclusion for backtick/tilde fences, GFM strikethrough and footnotes, basic GFM pipe tables with escaped-pipe cells, one-or-more dash and legacy colon-only separators, empty-body omission, row cell padding/truncation, invalid-table fallback to list/paragraph parsing, block, blank-line, and raw HTML block interruption, and left/center/right alignment, basic nested smart lists with marker-change splitting and legacy marker-padding indentation thresholds, 9-digit ordered-marker limit, non-1 and zero ordered-list start preservation, direct-tab marker padding, space-tab marker indented-code and continuation items, marked-style lazy continuation lines with extra indentation preserved after marker padding, and lazy nested heading/blockquote/fenced-code blocks inside list items, basic blockquotes with lazy continuations including quoted list-item continuations and raw HTML block interruption, blank-line paragraph splitting plus nested ATX/setext heading, list, table, horizontal-rule, and indented-code block parsing, indented code blocks plus backtick and tilde fenced code blocks with optional separating space, EOF closure, backtick-fence indent compensation, legacy first-token info-string language class preservation including punctuation, matching closing-fence length plus legacy mixed trailing fence characters, shared React-side `syntax-token` highlighting for fenced code, legacy `common.editor` edit/preview/task-list/clear-temp/help/preview/receiver shell on issue/board/milestone/PR body editor tab surfaces, issue/board/PR comment edit forms, and Git commit discussion non-ranged/comment-reply/inline-review/edit forms, marked-compatible angle URL case handling plus angle email extended local-part punctuation and legacy domain validation, and angle `mailto:`, `file:`, and `zpl:` scheme autolinks, case-insensitive bare URL schemes, lowercase `www.` href normalization with uppercase `WWW.` href preservation, extended bare email autolinks including double-quoted email links and single-quoted email exclusion, and bare URL trailing punctuation/unmatched closing delimiter/entity-like suffix backpedaling, and React-side board/milestone body rendering; further edge cases are evidence-driven watchlist items, not known app-runtime blockers | 2     |
| @멘션 링크      | `@username` → 사용자 프로필 링크 | basic implemented on project Markdown projection, including `@user` and legacy `@owner/project` project mentions across issue/post/milestone/PR/code comment render paths; issue body/comment/history, board/posting including project-home DB README postings, milestone, PR detail body/comment, and Git commit discussion comment responses now expose `mentionReferences` metadata so existing targets link and unresolved mentions stay plain text like `MarkdownAppTest.testMention` | 2     |
| 이슈 참조       | `#123`, `owner#123`, `owner/project#123` → 이슈 링크 | implemented on project Markdown projection, including issue/post/milestone/PR/code comment render paths; readable issue refs add `title`/`data-issue-state` metadata without exposing inaccessible issue titles, and unresolved issue refs stay plain text like legacy `MarkdownAppTest.test_issueNumber` | 2     |
| 자동 링크       | URL 자동 링크 변환               | basic `http://`/`https://`, `ftp://`, `www.`, email, marked angle-bracket URL/email autolinks including extended local-part punctuation, legacy domain validation, uppercase URL, and `mailto:` schemes, case-insensitive bare URL schemes, lowercase `www.` href normalization with uppercase `WWW.` href preservation, extended bare email domains, and marked-style bare URL trailing-punctuation/unmatched closing delimiter/entity-like suffix backpedaling implemented; residual legacy edge-case parity gap | 2     |
| 코드 블록       | syntax highlighting              | basic React-side indented and fenced-code block rendering with optional separating space, EOF closure, backtick-fence indent compensation, legacy first-token info-string language class preservation including punctuation, common legacy language alias normalization (`rs`, JS/TS aliases, `sc`, Java `jsp`, Go/`golang`, C# aliases, Elixir, Erlang/`erl`, R, MATLAB, AWK, TeX/LaTeX, Django/Jinja, HTMLBars, accesslog, Groovy, LLVM, Haml comments, Excel/`xlsx`/`xls`, Haskell/`hs`, Lua, Clojure/`clj`, `clojure-repl`, Markdown/`md`/`mkdown`/`mkd`, CMake/`cmake.in`, Gradle, Makefile/`mk`/`mak`, Perl/`pl`/`pm`, Basic, AsciiDoc/`adoc` comments, Arduino, CoffeeScript/`coffee`/`cson`/`iced`, Dockerfile/`docker`, nginx/`nginxconf`, Apache/`apacheconf`, HTTP/`https`, Diff/`patch`, JSON, ini/`toml`, PowerShell/`ps`, DOS/`bat`/`cmd`, Kotlin, Swift, Dart, Elm comments, Objective-C aliases, CSS/Less/SCSS, `py`/`gyp`, `sh`/`bash`/`shell`/`zsh`/`console`, `rb`/`gemspec`/`podspec`/`thor`/`irb`, PHP aliases, C/C++ aliases, SQL aliases, YAML aliases, XML/HTML aliases) and keyword coverage for Rust/Java/Scala/Go/C#/Elixir hash comments/Erlang percent comments/R hash comments/MATLAB percent comments/AWK hash comments/TeX/LaTeX percent comments/Django/Jinja inline comments/HTMLBars comments/accesslog/Groovy/LLVM/Haml comments/Excel/Haskell/Lua comments and numeric literals/Clojure/Clojure REPL/Markdown/CMake hash comments/Gradle/Makefile hash comments/Perl hash comments and numeric literals/Basic comments and numeric literals/AsciiDoc comments/Arduino comments and numeric literals/CoffeeScript comments and numeric literals/Dockerfile hash comments/nginx hash comments/Apache hash comments/HTTP/Diff/JSON/ini semicolon/hash comments/PowerShell/DOS/Kotlin numeric literals/Swift numeric literals/Dart numeric literals/Elm comments/Objective-C numeric literals/JavaScript-family built-ins and numeric literals/Rust/Java numeric literals plus `jsp` alias/C++ binary-apostrophe-hex-common-number-suffix numeric literals/Scala/Go/C#/Elixir/Haskell numeric literals/Python `gyp` alias/hash comments/binary-octal-hex-exponent-suffix plus signed common-number numeric literals/REPL prompts/decorators/declaration titles and params/triple-quoted strings/single- and triple-quoted prefixed strings/single/triple-quoted f-string interpolation/built-ins/Shell hash comments/CSS selector/property/value tokens/SQL comments/Ruby comments/package aliases/PHP hash comments/C++/YAML hash comments plus XML/HTML tag-name coverage, and shared `syntax-token` span highlighting for fenced code implemented; full Highlight.js-equivalent language coverage gap | 2     |
| 이미지          | 인라인 이미지 표시               | basic safe inline image rendering with legacy angle-wrapped targets, escaped target/title punctuation, safe uppercase URL schemes, legacy sanitizer `file:`/`zpl:` target allowlist handling, and title attributes including double-quoted, single-quoted, and parenthesized title delimiters, code-browser Markdown React-side rendering with local image path rewrite, project-home Git README React-side local image/normal-link rewrite, PR body/review comment React-side rendering, Git commit discussion comment React-side rendering, board post/comment/DB README posting React-side rendering, and milestone detail React-side rendering implemented | 2     |
| 체크리스트      | `- [ ]` / `- [x]`                | shared React renderer emits sanitized disabled checkbox inputs, preserves literal no-trailing-space empty markers, and counts trailing-space empty plus unordered/ordered task-list items in the legacy progress bar | 2     |
| XSS 방지        | HTML sanitization                | implemented on current render path | 2     |

#### 검수 기준

- [x] Known evidence-backed legacy/GFM Markdown renderer parity is covered on app-runtime surfaces; GFM footnotes are allowed as a useful extension while preserving existing legacy UI output
- [x] legacy `common.editor` shell (`data-toggle="markdown-editor"`, edit/preview tabs, checklist button, clear-temporary button, `.markdown-help`, preview pane, notification receiver) is embedded in current issue/board/milestone/PR body editor tab surfaces without server-rendered Markdown
- [x] legacy `common.editor` checklist button behavior from `common/scripts.scala.html` is restored across shared and direct issue/PR editor shells: clicking `.add-task-list-button` inserts `\n- [ ] Todo A\n- [ ] Todo B\n- [ ] Todo C` into the nearest form textarea, including the legacy cursor-at-start fallback-to-end behavior.
- [x] legacy `common.commentUpdateForm` edit shell is restored on issue/board/PR comment edit forms, including hidden row-local `#comment-editform-*`, `update-comment-body` editor mode, upload-drop target, update buttons, temporary upload field, and React-side Markdown preview anchors
- [x] legacy commit discussion forms from `code/diff.scala.html`, `common/commentForm.scala.html`, `common/reviewForm.scala.html`, and `common/commentUpdateForm.scala.html` use the `common.editor` shell for non-ranged commit comments (`comment-body`), inline/thread review comments (`code-review-body`), and commit comment edits (`update-comment-body`) while keeping React-side Markdown preview anchors
- [x] ATX `#` through `######` and setext headings render with marked-style `id` anchors and `.head-anchor` links, including legacy leading-space ATX forms, setext underlines, setext heading splitting before following paragraph text, repeated-heading slug de-duplication, rendered inline text for link/image/code headings, raw inline HTML heading rendering with tag-stripped slug basis, and legacy heading-slug entity unescape behavior
- [x] inline emphasis/strong/delete renders nested inline Markdown and `<em>`/`<strong>`/`<del>` for supported delimiters, including marked-compatible triple-emphasis `<strong><em>` nesting
- [x] intraword underscore emphasis/strong patterns such as `foo_bar_baz` and `foo__bar__baz` remain plain text like legacy `marked`, while spaced `_italic_` / `__strong__` still render
- [x] delimiter-adjacent whitespace prevents single/double emphasis rendering (`* a *`, `** b **`, `_ c _`, `__ d __`), while spaced triple emphasis follows legacy outer-strong behavior
- [x] GFM delete supports single and double tilde delimiters (`~one~`, `~~two~~`) while keeping spaced and triple-tilde forms literal like legacy `marked`
- [x] `@username` → 사용자 프로필 링크 변환
- [x] `@owner/project` → 프로젝트 링크 변환
- [x] issue body/comment/history, board/posting including project-home DB README postings, milestone, PR detail body/comment, and Git commit discussion comment mention links use resolved `mentionReferences` metadata so nonexistent `@user` / `@owner/project` tokens remain plain text
- [x] `#123` → 동일 프로젝트 이슈 링크 변환
- [x] `owner#123` → 같은 프로젝트 이름의 owner-scoped 이슈 링크 변환
- [x] `owner/project#123` → 크로스 프로젝트 이슈 링크 변환
- [x] unresolved issue refs remain plain text when no matching readable issue metadata exists
- [x] wrapped issue refs such as `_owner#123-` and `Aowner#123AA` remain plain text like legacy `MarkdownAppTest.test_WrappedPattern`
- [x] readable issue refs expose title/state metadata on project Markdown render paths
- [x] commit SHA references (`SHA`, `@SHA`, `owner@SHA`, `owner/project@SHA`) link only when matching commit metadata is present, and remain plain text inside code spans/fences or when wrapped by adjacent word characters like legacy `AutoLinkRenderer.isWrappedNonCharacter`
- [x] raw HTML-like blocks are sanitized on the React side so legacy-safe formatting/media/form tags such as `<a>`, `<code>`, `<div>`, `<br>`, `<strong>`, `<input>`, `<iframe>`, `<video>`, `<source>`, and `<ol start>` render with safe URL/boolean/global style attributes while their contents stay opaque to `#123`/URL autolink parsing, matching `MarkdownAppTest.test_ignorePattern` and legacy `marked(... sanitize:false)` plus Yona sanitizer behavior
- [x] raw block HTML tags with quoted angle-bracket attributes such as `<div title="A > B">` and `<p title="A < B">` stay opaque to Markdown parsing like legacy `marked`
- [x] raw block HTML stays opaque across following nonblank lines, so Markdown links after a leading block tag remain literal until the block boundary matches legacy `marked`
- [x] raw block HTML interrupts a preceding plain paragraph without requiring a blank line, while inline raw tags such as `<span>` remain in the paragraph, matching legacy `marked`
- [x] raw comments interrupt a preceding paragraph, while CDATA, processing instructions, and declarations after a normal paragraph line remain inline and allow following Markdown links to parse like legacy `marked`
- [x] raw `<script>` / `<style>` blocks are routed through the sanitizer, stripped with their contents, and end at their closing tag so following Markdown resumes like legacy `marked`
- [x] raw `<pre>` blocks keep contents literal and end at their closing tag so following Markdown resumes like legacy `marked`
- [x] raw `<video>` remains an inline sanitizer-preserved element rather than a raw block interrupt, so following Markdown links parse like legacy `marked`
- [x] standalone leading raw void tags such as `<input>`, `<img>`, line-start `<hr>`, and line-start `<source>` are raw-block opaque, while inline-after-text void tags remain inline like legacy `marked`
- [x] line-start raw table/list child tags such as `<tr>`, `<td>`, `<tbody>`, `<thead>`, and `<li>` stay raw-block opaque while table child tags after normal paragraph text remain inline like legacy `marked`
- [x] legacy `marked` line-start HTML block tag families such as `<section>`, `<article>`, `<header>`, `<footer>`, `<form>`, `<fieldset>`, `<figure>`, `<figcaption>`, `<details>`, `<summary>`, `<dl>`, `<dt>`, `<dd>`, and `<caption>` stay raw-block opaque to Markdown/autolink parsing while inline-after-text forms remain inline
- [x] inline-safe raw HTML fragments inside paragraphs render through the React sanitizer while surrounding Markdown links and bare URL autolinks continue to parse like legacy `marked`; safe formatting spans such as `<em>` also parse inner Markdown links like legacy `marked`, nested safe inline tags such as `<em><strong>[link](...)</strong></em>` preserve their tag structure while parsing inner Markdown, safe `data-*` attributes are preserved, quoted raw-inline attributes containing angle brackets are parsed like legacy `marked`, case-insensitive raw inline tag names such as `<EM>`, `<SPAN>`, `<BR>`, and `<IMG>` are recognized, generic self-closing raw tags such as `<section/>` are tokenized as raw HTML, unsupported inline wrappers such as `<sup>` are stripped after their children are parsed/autolinked including nested safe tags such as `<sup><em>#1</em></sup>`, and raw `<a>` / `<code>` parse explicit Markdown links/emphasis while still suppressing Yona project autolinks like `AutoLinkRenderer.IGNORE_TAGNAME`; block raw HTML remains opaque
- [x] raw HTML comments stay opaque to issue/URL autolinks; inline comments allow surrounding Markdown links to parse while block-leading comments keep following Markdown literal like legacy `marked`
- [x] raw HTML declarations and processing instructions are stripped after parsing like Yona's sanitizer, while surrounding Markdown links still render and directive contents remain opaque to autolinks
- [x] raw CDATA sections are stripped after parsing like Yona's sanitizer, while surrounding Markdown links still render and CDATA contents remain opaque to issue/URL autolinks
- [x] inline Markdown links/images preserve legacy angle-wrapped targets, whitespace around targets, escaped target/title punctuation, and `title` attributes, including double-quoted, single-quoted, and parenthesized delimiters
- [x] inline Markdown links/images accept safe angle-wrapped targets with preserved spaces such as `[docs](< https://example.com/a b >)` and encode spaces in href/src like legacy `marked`
- [x] inline/reference Markdown links/images accept one-level nested labels such as `[a [b] c](url)` while deeper nested labels remain literal like legacy `marked`
- [x] inline/reference Markdown links/images tokenize escaped punctuation in labels like legacy `marked`; displayed link labels unescape escaped punctuation broadly, while image alt text only removes escaped brackets and preserves other backslash-punctuation literals such as `\*`, `\!`, and escaped backticks
- [x] inline/reference Markdown link labels render nested inline Markdown like legacy `marked`, including emphasis/strong/delete, raw inline HTML with safe attributes, nested links/images, angle URL/email autolinks, explicit empty labels, plain text tab expansion, and single- and multi-backtick code spans with legacy tab expansion, while bare URL/email/project autolinks stay literal inside labels; image alt text keeps formatting/raw HTML literal, preserves code-span spaces/newlines, expands tabs in plain labels and code-span literals, and keeps shorter inner-backtick label forms literal
- [x] adjacent reference links, inline links, and images tokenize independently like legacy `marked`, including tight `[ref][r]![img](url)` forms
- [x] inline Markdown links/images accept tab-separated titles plus a single newline before double-quoted, single-quoted, or parenthesized titles like legacy `marked`, while blank-line-separated title text stays literal
- [x] inline Markdown links preserve empty `()` / whitespace-only targets and explicit empty angle targets (`<>`) as `href=""` like legacy `marked`
- [x] inline Markdown links/images preserve marked-compatible balanced parentheses inside URL/path targets such as `[docs](https://example.com/a(b))`
- [x] inline Markdown links/images plus angle and bare autolinks encode literal brackets, braces, pipe, caret, backtick, and non-ASCII path text in href/src targets while preserving visible label text like legacy `marked`
- [x] inline Markdown links/images accept safe uppercase URL schemes while preserving React-side unsafe scheme rewrite/stripping
- [x] inline/reference Markdown links/images accept legacy sanitizer `file:` and `zpl:` targets while rewriting unsafe `javascript:` hrefs to `#`
- [x] inline/reference Markdown links/images accept scheme-less relative href/src targets like legacy `marked` while stripping unsupported leading scheme hrefs such as `tel:` and `data:`
- [x] inline/reference Markdown links/images decode HTML entities in href/src targets before React escaping and unsafe-scheme checks like legacy `marked`
- [x] reference-style Markdown links/images resolve marked definitions without rendering definition lines, including escaped reference labels, legacy empty-angle `<>` targets encoded as `%3C`, newline-split target/title definitions with target and title on separate continuation lines, and escaped target/title punctuation
- [x] inline code spans preserve marked matching backtick-run delimiters, isolated empty-run literal behavior, same-delimiter crossing behavior, tab expansion, newline normalization, and single-space trimming semantics
- [x] marked-compatible numeric/core/common named HTML entities decode in normal text plus link/image labels and titles, invalid numeric entity references decode to replacement characters like browser-decoded legacy HTML, plain inline tabs expand to four spaces like legacy `marked`, while code spans preserve source literals such as `&amp;`
- [x] bare `http://`/`https://`, `ftp://`, `www.`, and email 자동 링크 변환 including lowercase `www.` href normalization with uppercase `WWW.` href preservation
- [x] angle-bracket URL/email autolinks strip brackets, preserve `mailto:` targets, and accept legacy uppercase URL and mixed-case `mailto:` schemes
- [x] angle-bracket autolinks accept legacy sanitizer `file:` and `zpl:` schemes like bundled `marked`
- [x] double-quoted bare emails autolink while single-quoted bare emails remain plain text like legacy marked GFM
- [x] bare URL/email autolinks trim trailing punctuation, unmatched closing delimiters, and entity-like suffixes outside the rendered link
- [x] GFM `~~deleted~~` strikethrough renders as `<del>`
- [x] basic GFM pipe tables render as `<table>`, require an unescaped pipe before accepting one-column/colon-only table separators, keep odd-backslash escaped `\|` pipes inside cells while splitting even-backslash pipes as delimiters, accept up-to-three-space indented rows while preserving four-space indented-code boundaries, accept one-or-more dash and legacy colon-only separators, omit empty `<tbody>` when no body rows exist, pad/truncate row cells, keep line-start inline raw HTML in body cells, stop before interrupting blocks, blank lines, line-start raw/self-closing HTML block tags, and only unordered plus literal ordered `1.` / `1)` list markers while keeping non-1 and zero-padded ordered markers as table rows, and preserve left/center/right alignment
- [x] basic unordered/ordered smart lists render as `<ul>`/`<ol>`, preserve nested child lists, split same-indent runs when unordered markers or ordered delimiters change, preserve legacy 0-3-space root marker classification and marker-padding indentation thresholds for same-level versus nested list markers, keep four-space list-looking lines as indented code before following root lists, keep blank-line-separated same-marker items in one loose list while splitting blank-line marker changes, terminate list continuation after two consecutive blank lines, preserve the legacy 9-digit ordered-marker limit, preserve non-1 and zero ordered-list start numbers, preserve direct-tab marker padding, preserve space-tab marker indented-code and continuation items, preserve marked-style lazy continuation lines with extra indentation preserved after marker padding and lazy nested heading/blockquote/fenced-code blocks inside list items, preserve legacy empty-list-marker behavior where `- ` / `1. ` at EOF stays a paragraph but the same marker with a terminal newline or following list item renders an empty `<li>`, and match legacy paragraph/table interruption where only unordered markers and ordered `1.` / `1)` interrupt existing paragraph or GFM table rows
- [x] harden mixed task-list/list-boundary Markdown rendering so task progress plus 3-space top-level list-boundary inputs do not trigger renderer memory blow-up
- [x] basic blockquotes render as `<blockquote>`, split blank-line paragraphs, preserve legacy 0-3-space marker indentation with 4-space/tab-prefixed `>` as indented code, handle tab-after-marker text/list/code behavior, preserve legacy lazy-continuation interruption where quoted blank lines, unordered markers, and ordered `1.` / `1)` after an unquoted blockquote line move outside the quote while `2.` remains lazy text, and parse nested ATX/setext heading, list, table, horizontal-rule, and indented-code blocks
- [x] Backslash-escaped punctuation stays literal before inline Markdown/autolink parsing
- [x] indented and fenced code blocks render as `<pre><code>` and fenced code preserves the legacy first whitespace-delimited info-string token as the language class, including punctuation, with or without a separating space, accepts legacy mixed trailing closing-fence characters; unmatched fenced code closes at EOF, and indented backtick fences compensate body indentation like legacy marked
- [x] horizontal rules render as `<hr>`, including legacy spaced and tab-separated marker forms
- [x] `- [ ]` / `- [x]` 체크리스트 렌더링 including literal no-trailing-space empty markers, trailing-space empty checkbox items, and unordered/ordered task-list progress counting with legacy paragraph-interruption exclusions for non-1 and zero-padded ordered markers
- [x] safe inline image Markdown renders as sanitized `<img>`
- [x] code-browser Markdown file rendering preserves legacy `.codebrowser-markdown`, returns rewritten Markdown instead of server-rendered HTML, lets React render local `./...` image paths to `/:owner/:project/files/:branch/...`, and carries metadata-backed mention references so unresolved `@user` / `@owner/project` targets stay plain text like legacy `Markdown.renderFileInCodeBrowser`
- [x] project-home Git README fallback preserves the legacy readme body wrapper, returns rewritten Markdown instead of server-rendered HTML, lets React render local images to `/:owner/:project/files/:branch/...` plus normal local links to `/:owner/:project/code/:branch/...`, and carries metadata-backed mention references so unresolved `@user` / `@owner/project` targets stay plain text like legacy `Markdown.renderFileInReadme`
- [x] project home overview renders React-side Markdown while preserving the legacy `#project-description.markdown-wrap` anchor, plain `project.description.placeholder` empty state, and non-project-aware `Markdown.render(String)` mention behavior from `project/home.scala.html`
- [x] issue detail bodies/comments, board post detail/comments, and DB-backed README postings return Markdown source with empty HTML compatibility fields and render through the shared React Markdown renderer.
- [x] milestone detail descriptions return Markdown source with an empty HTML compatibility field and render through the shared React Markdown renderer.
- [x] legacy `POST /markdown/:owner/:project` preview route no longer returns server-rendered HTML; it validates project read access and returns Markdown source for React-side preview rendering
- [x] soft line breaks render as `<br>` like legacy marked `breaks: true`; legacy `readme-body` Markdown keeps marked `breaks: false` soft-line behavior
- [x] hard-break markers (`\`, two trailing spaces, or trailing tab-expanded whitespace before newline) are consumed before rendering `<br>`, and `breaks: true` soft breaks trim trailing spaces/tabs like bundled `marked`
- [x] 코드 블록: 기본 token span syntax highlighting, including common legacy language aliases and Rust/Java/Scala/Go/C#/Elixir hash comments, symbols, variables, declaration titles, and numeric literals/Erlang percent comments plus function titles and params/R hash comments and numeric literals/MATLAB percent comments plus function titles and params/AWK hash comments and field-variable tokens/TeX/LaTeX command tokens and percent comments/Django/Jinja inline comments and filter tokens/HTMLBars comments and attribute tokens/accesslog IP/status numbers and quoted request strings/Groovy annotations, labels, and dollar-slashy strings/LLVM title and symbol tokens/Haml comments and Ruby interpolation/Excel formulas, symbols, percent numbers, and `N(...)` comments/Haskell/Lua comments, numeric literals, and function titles/Clojure/Clojure REPL builtin-name keywords, metadata markers, and symbols/Markdown/CMake hash comments/Gradle/Makefile hash comments, variables, and section/meta targets/Perl hash comments, numeric literals, and function titles/Basic comments and numeric literals/AsciiDoc comments/Arduino comments and numeric literals/CoffeeScript comments, numeric literals, built-ins, and class/function titles/Dockerfile hash comments and variable tokens/nginx hash comments plus directive-first tokens, variables, IP:port numbers, and duration/size numbers/Apache hash comments plus section tags, rewrite variables/backrefs, and meta option tokens/HTTP request target strings, protocol markers, whole header names, and status codes/Diff/JSON/ini semicolon/hash comments/PowerShell/DOS/Kotlin numeric literals/Swift numeric literals including signed decimal exponents and hex-float exponents/Dart numeric literals/Elm comments plus type and top-level title tokens/Objective-C numeric literals/JavaScript-family built-ins and numeric literals including leading-dot and negative common-number forms/Rust/Java numeric literals plus `jsp` alias/C++ binary-apostrophe-hex-common-number-suffix numeric literals/Scala numeric literals plus declaration titles and annotation meta/Go numeric literals plus Go function titles/C# numeric literals plus C# verbatim/interpolated string and preprocessor meta forms/Haskell numeric literals plus meta pragmas and type tokens/Python `gyp` alias/hash comments/binary-octal-hex-exponent-suffix plus signed common-number numeric literals/REPL prompts/decorators/declaration titles and params/triple-quoted strings/single- and triple-quoted prefixed strings/single/triple-quoted f-string interpolation/built-ins/Shell hash comments/CSS selector/property/value tokens plus SCSS/Less variable tokens/SQL comments/Ruby comments/declaration titles/package aliases/PHP hash comments/declaration titles/C++/YAML keyword/comment/structural marker coverage
- [x] C/C++ fenced-code highlighting recognizes legacy Highlight.js preprocessor meta lines and class/function declaration titles.
- [x] INI/TOML fenced-code highlighting recognizes legacy Highlight.js section tokens, attr keys before `=`, true/false/on/off/yes/no literals, variables, triple-quoted strings, underscored signed numbers, and semicolon/hash comments.
- [x] PowerShell fenced-code highlighting recognizes legacy Highlight.js variable tokens, `$true`/`$false`/`$null` literals, hash/block comments, and same-line here-strings.
- [x] DOS/batch fenced-code highlighting recognizes legacy Highlight.js percent/bang variables, `:label` symbols, `rem` comments, and number tokens.
- [x] Kotlin fenced-code highlighting recognizes legacy Highlight.js annotation/meta tokens, label symbols, interpolation variables, triple strings, and numeric literals.
- [x] Swift fenced-code highlighting recognizes legacy Highlight.js annotation meta tokens, declaration titles, uppercase type tokens, signed decimal exponent numeric literals, and hex-float exponent numeric literals.
- [x] Dart fenced-code highlighting recognizes legacy Highlight.js annotation meta tokens, class titles, raw/triple strings, and numeric literals.
- [x] Objective-C fenced-code highlighting recognizes legacy Highlight.js preprocessor meta lines, `@interface`/`@implementation` class titles, Objective-C strings, dotted property tokens, and numeric literals.
- [x] XML/HTML fenced-code highlighting recognizes legacy Highlight.js unquoted attribute values as string tokens.
- [x] JavaScript/TypeScript fenced-code highlighting recognizes legacy Highlight.js meta directives, function/class declaration titles, object attribute keys, template strings, built-ins, and numeric literals.
- [x] Rust fenced-code highlighting recognizes legacy Highlight.js raw strings, lifetime symbols, attribute meta tokens, function titles, and numeric literals.
- [x] Java fenced-code highlighting recognizes legacy Highlight.js annotation meta tokens, class titles, function titles, numeric literals, and `jsp` alias.
- [x] CoffeeScript fenced-code highlighting recognizes the legacy Highlight.js built-ins `npm`, `require`, `console`, `print`, `module`, `global`, `window`, and `document`
- [x] Dockerfile fenced-code highlighting recognizes legacy Highlight.js shell-style variable tokens (`$APP_HOME`, `${APP_HOME}`)
- [x] Perl fenced-code highlighting recognizes legacy Highlight.js function titles for `sub name`
- [x] Lua fenced-code highlighting recognizes legacy Highlight.js function titles
- [x] Clojure fenced-code highlighting recognizes legacy Highlight.js metadata markers and `:keyword`/`::keyword` symbols
- [x] CoffeeScript fenced-code highlighting recognizes legacy Highlight.js class and assignment-function titles
- [x] Haml fenced-code highlighting applies legacy Highlight.js Ruby sublanguage handling inside `#{...}` interpolation blocks
- [x] Excel fenced-code highlighting recognizes legacy Highlight.js `N(...)` formula comments
- [x] Makefile fenced-code highlighting recognizes legacy Highlight.js variable tokens (`$(VAR)`, `$@`) plus target section/meta tokens (`all:`, `.PHONY:`)
- [x] nginx fenced-code highlighting recognizes legacy Highlight.js variable tokens (`$host`, `${upstream}`), directive-first attribute tokens, IP:port numbers, and duration/size numeric literals
- [x] Apache fenced-code highlighting recognizes legacy Highlight.js section tags (`<Directory ...>`), rewrite variables (`%{HTTP_HOST}`), back-reference numbers (`$1`, `%1`), and meta option tokens (`[R=301,L]`)
- [x] HTTP fenced-code highlighting recognizes legacy Highlight.js request target strings, `HTTP/1.1` protocol markers, whole header name tokens (`Host:`, `X-Request-Id:`), and status-code numbers
- [x] LLVM fenced-code highlighting recognizes legacy Highlight.js title tokens (`@...`, `!...`) and symbol tokens (`%...`, `#...`)
- [x] SCSS/Less fenced-code highlighting recognizes legacy Highlight.js variable tokens (`$name`, `@name`, `@{name}`)
- [x] R fenced-code highlighting recognizes legacy Highlight.js hex, integer-suffix, imaginary, trailing-dot, leading-dot, and exponent numeric literals
- [x] MATLAB fenced-code highlighting recognizes legacy Highlight.js `function` declaration titles and params
- [x] TeX/LaTeX fenced-code highlighting recognizes legacy Highlight.js command tokens with leading backslash and optional star suffix
- [x] AWK fenced-code highlighting recognizes legacy Highlight.js field-variable tokens (`$1`, `$NF`, `$#`, `${name}`)
- [x] Elm fenced-code highlighting recognizes legacy Highlight.js uppercase type tokens and top-level declaration title tokens
- [x] Erlang fenced-code highlighting recognizes legacy Highlight.js function clause titles and params
- [x] Django/Jinja fenced-code highlighting recognizes legacy Highlight.js filter tokens with pipe and optional argument colon (`|default_if_none:`, `|truncatewords:`)
- [x] HTMLBars fenced-code highlighting recognizes legacy Highlight.js attribute tokens such as `value=` and `page=`
- [x] accesslog fenced-code highlighting recognizes legacy Highlight.js quoted request strings such as `"GET /path HTTP/1.1"`
- [x] Ruby fenced-code highlighting recognizes legacy Highlight.js octal, hex, underscored decimal, and zero numeric literals
- [x] Ruby fenced-code highlighting recognizes legacy Highlight.js declaration titles for `class`, `module`, and `def`
- [x] PHP fenced-code highlighting recognizes legacy Highlight.js binary, hex, and exponent numeric literals
- [x] PHP fenced-code highlighting recognizes legacy Highlight.js declaration titles for `function`, `class`, `interface`, `namespace`, and `use`
- [x] Scala fenced-code highlighting recognizes legacy Highlight.js declaration titles and annotation meta tokens
- [x] Go fenced-code highlighting recognizes legacy Highlight.js function titles for `func name(...)` and receiver methods
- [x] Elixir fenced-code highlighting recognizes legacy Highlight.js declaration titles for `def*` forms
- [x] Elixir fenced-code highlighting recognizes legacy Highlight.js symbol tokens (`:ok`, `key?:`) and variable tokens (`$var`, `@var`, `@@var`)
- [x] Haskell fenced-code highlighting recognizes legacy Highlight.js meta pragmas and uppercase type tokens
- [x] YAML fenced-code highlighting recognizes legacy Highlight.js quoted and unquoted attribute keys before `:`
- [x] YAML fenced-code highlighting recognizes legacy Highlight.js document markers, tags, anchors, aliases, and list bullets
- [x] YAML fenced-code highlighting applies legacy Highlight.js Ruby sublanguage handling inside ERB template blocks (`<% ... %>`)
- [x] C# fenced-code highlighting recognizes legacy Highlight.js verbatim and interpolated string prefixes (`@"..."`, `$"..."`, `$@"..."`, `@$"..."`)
- [x] C# fenced-code highlighting recognizes legacy Highlight.js preprocessor meta lines such as `#region` and `#endif`
- [x] XML fenced-code highlighting recognizes legacy Highlight.js meta declarations such as `<?xml ...?>` and `<!DOCTYPE ...>`
- [x] XML fenced-code highlighting keeps legacy Highlight.js single- and multiline CDATA blocks opaque
- [x] XML/HTML fenced-code highlighting applies legacy Highlight.js CSS sublanguage handling inside `<style>` blocks
- [x] XML/HTML fenced-code highlighting applies legacy Highlight.js PHP sublanguage handling inside `<?php ... ?>` processing instructions
- [x] XML/HTML fenced-code highlighting applies legacy Highlight.js ActionScript, JavaScript, Handlebars template, and XML data sublanguage handling inside `<script>` blocks
- [x] XSS: `<script>` 등 위험 태그 제거

---

### FG-18: Legacy External API / Migrator Surface

**Legacy 참조**: `yona-original/app/controllers/api/*`, routes 파일의 `/-_-api/v1/**` 경로

**Legacy API 접두사**: `/-_-api/v1/`

**현재 결정**: Rust frontend/server app의 app-facing canonical REST surface는 `/api/v1/**`다. Legacy external `/-_-api/v1/**` compatibility는 별도 migrator 제품/도구에서 다루되, `GET /-_-api/v1/hello` health check, legacy user-menu helper가 직접 참조하는 `GET/POST /-_-api/v1/favoriteProjects|favoriteIssues|favoriteOrganizations`, and the issue/board translation helper `POST /-_-api/v1/translation`는 app server에서 직접 제공한다.

#### 기능 목록과 상태

| API                           | Legacy 동작        | 현재 상태                         | Phase |
| ----------------------------- | ------------------ | --------------------------------- | ----- |
| `GET /-_-api/v1/hello`        | Health check       | direct legacy JSON `{message,ok}` | implemented |
| `GET /-_-api/v1/users`        | 사용자 목록        | unsupported in app                | migrator/deferred |
| `POST /-_-api/v1/users`       | 사용자 생성        | unsupported in app                | migrator/deferred |
| `POST /-_-api/v1/users/token` | API 토큰 발급      | unsupported in app                | migrator/deferred |
| Issue API                     | 이슈 CRUD + 댓글   | issue/board translation helper implemented; broader API unsupported in app | migrator/deferred |
| Project API                   | 프로젝트 CRUD      | unsupported in app                | migrator/deferred |
| Board API                     | 게시글 CRUD + 댓글 | unsupported in app                | migrator/deferred |
| Milestone API                 | 마일스톤 CRUD      | unsupported in app                | migrator/deferred |
| Watcher API                   | 감시자 목록        | unsupported in app                | migrator/deferred |
| Favorite API                  | 즐겨찾기 관리      | user-menu favorite helpers implemented with session or legacy API token auth; broader API deferred | migrator/deferred |

**주의**: REST에는 두 계층이 있다. 새 React application API는 `/api/v1/**`를 canonical surface로 사용한다. `GET /-_-api/v1/hello`, legacy user-menu helper용 `/-_-api/v1/favoriteProjects|favoriteIssues|favoriteOrganizations`, and issue/board translation helper `POST /-_-api/v1/translation`를 제외한 legacy 외부 호환 API(`/-_-api/v1/**`)는 현재 app scope가 아니며, 기존 Yona API를 사용하는 외부 도구와의 호환은 별도 migrator/export/import deliverable에서 다룬다.

`GET /-_-api/v1/hello` health check, `GET/POST /-_-api/v1/favoriteProjects|favoriteIssues|favoriteOrganizations` user-menu helpers, and `POST /-_-api/v1/translation` issue/board helper 외의 `/-_-api/v1/**` legacy API를 frontend/server app에 추가하지 않는다. 내부 React 화면이나 legacy view helper API를 `/-_-api/v1/**`로 확장하지 않는다. 내부 React 화면은 `/api/v1/**` application API와 TanStack Query를 사용한다.

#### 별도 migrator 검수 기준

- [x] `/-_-api/v1/hello` 가 200 OK를 반환한다
- [~] API 인증: app-owned direct helpers (`hello`, user-menu favorites, translation) accept cookie session auth, favorites/translation also accept legacy `Yona-Token` or `Authorization: token ...` API token auth without CSRF, and unauthenticated favorite/translation requests return legacy `401 {"message":"unauthorized request"}` instead of the canonical `/api/v1` error envelope; broader legacy external APIs remain migrator/deferred
- [~] API 응답: app-owned favorite helpers use legacy JSON field names/shapes, including localized default issue favorite toggle `message` copy; translation keeps legacy `translated` plus React-side `translatedMarkdown` source for equivalent rendered UI; broader legacy external APIs remain migrator/deferred
- [~] 에러 응답: app-owned favorite/translation auth failures use legacy HTTP `401` + `{"message":"unauthorized request"}` and translation keeps legacy unconfigured `412 Precondition Failed`; broader legacy external API error schemas remain migrator/deferred

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
| H2            | not runtime-supported | legacy 개발용 DB는 Rust runtime에서 직접 지원하지 않고, 별도 Java `H2 -> SQLite` 변환 도구로 SQLite adopt 경로에 편입 |

**검수 기준**: MySQL/MariaDB, PostgreSQL, SQLite 각각에서 schema `up`, schema `validate`, legacy-like fixture `adopt`, 핵심 repository smoke test가 통과해야 Day-1 지원으로 인정한다.

H2는 Day-1 runtime dialect가 아니다. legacy 개발용 H2 DB가 필요한 경우 별도 Java CLI가 H2 JDBC로 schema/data를 읽어 SQLite 파일로 변환하고, Rust runtime은 변환된 SQLite DB를 기존 SQLite adopt/validate 경로로 다룬다. 이 도구는 migration framework가 아니라 one-shot compatibility bridge이며, 변환 한계는 도구 README에 명시한다.

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

- `/me` 경로: legacy에는 현재 사용자 workspace도 `/:username` 경로였으나, Rust 구현은 현재 사용자 workspace shortcut으로 `/me`를 유지한다. public profile `/:user`는 별도 legacy route로 복원했으며 `/me` shortcut을 대체하지 않는다. Provenance: `docs/provenance/core-parity-audit.md`.
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

## 9. 현재 구현 상태 요약 (2026-05-10 기준)

Phase -1 REST pivot 이후 현재 구현 상태 표는 다음 신규 phase의 입력 기준이다.
기존 runtime ConnectRPC surface와 frontend ConnectRPC client/dependency는 제거되었고,
`proto/`는 historical message schema snapshot으로만 남는다.

| 영역              | 상태              | 세부                                                             |
| ----------------- | ----------------- | ---------------------------------------------------------------- |
| HTTP 서버         | ✅ 구현           | Axum 기반. `/api/v1` REST, session bootstrap, static asset delivery, legacy `/messages.js` |
| 세션/인증         | ✅ 구현           | bcrypt, CSRF, 세션 쿠키                                          |
| DB 엔티티         | ✅ 구현           | 60+ SeaORM 모델, legacy 스키마 전체 매핑                         |
| Repository 메서드 | ✅ 구현           | 100+ 쿼리 메서드                                                 |
| Migration         | ✅ 구현           | adopt/up/validate 모드, multi-DB, legacy `/migration` 비활성 shell |
| 인증 플로우       | ✅ 구현           | 로그인/가입/비밀번호 찾기/이메일 인증                            |
| Workspace         | ✅ 구현           | 대시보드, 공개 프로필, 설정, 이메일, 토큰, 아바타                |
| 조직 CRUD         | ✅ 구현           | 생성/수정/삭제/멤버/가입, legacy settings/member/delete shell anchors |
| 프로젝트 CRUD     | ✅ 구현           | 생성/수정/설정/감시/즐겨찾기/transfer request+accept/mail/changeVCS shell |
| 이슈              | ✅ Phase 2A 구현  | CRUD, 댓글, 타임라인, watch/vote/assignee, mass update, Markdown |
| 게시판            | 🔶 Phase 5B 구현  | project/organization board app surface plus legacy board detail/comment shell anchors |
| 라벨/마일스톤     | ✅ 구현           | 라벨/카테고리 관리, 마일스톤 CRUD/state 구현                     |
| 코드 브라우저     | 🔶 Phase 3N 구현  | Git 폴더/파일 보기, 브랜치/태그 선택기, raw/open/image 파일 표면, archive download, syntax/line-number 표시, commit history/detail diff/compare including legacy message-cell history comment-count markup with `.number-of-comments` / `.yobicon-comments` and no temporary `Comments N` copy, commit comments/thread lifecycle including `partial_nonrange_codecomment_thread.scala.html` author profile link and tooltip shell, branch list/latest PR/default/delete, project create 시 bare Git repository provisioning, Smart HTTP transport, push post-receive records, changeVCS 시 executable-backed SVN repository storage provisioning, legacy `/svn/$path` auth/DAV boundary plus WebDAV `OPTIONS`, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers, root `PROPFIND`, default VCC `PROPFIND` collection responses with executable-backed youngest revision, repository UUID, checked-in baseline resource, and baseline-collection metadata when `svnlook` is available, executable-backed SVN `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus requested `creationdate`/`creator-displayname`/`getlastmodified` revision provenance and `supported-report-set` discovery, live/custom property value/name projection, and supportedlock/lock discovery via `svnlook cat`/`youngest`/`log`/`proplist`/`propget`/`lock`, request-aware collection and revision-pinned baseline collection `PROPFIND` child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in and requested `creationdate`/`creator-displayname`/`getlastmodified` metadata via `svnlook tree`/`youngest`/`log`, collection `PROPFIND` `Depth: 0` and `Depth: infinity` handling, `log-report`/`dated-rev-report` revision metadata via `svnlook log`/`author`/`date`, `get-locks-report` lock metadata via `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata plus copied-path ancestry via `svnlook cat`/`tree`/`changed --copy-info`, depth/recursive-aware `update-report` checkout/update/switch file fetch metadata via `svnlook tree`, `file-revs-report` file revision metadata plus txdelta content via `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata via `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup via `svnlook` path existence, `list-report` directory entry metadata via `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata via `svnlook proplist`/`propget`, `replay-report` revision editor metadata via `svnlook changed`, WebDAV `LOCK`/`UNLOCK` via `svnadmin lock`/`unlock`, and WebDAV `PUT` file updates with svndiff body decoding, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, and `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography via `svn checkout`/`commit`; actual local `svn info`, recursive `svn ls -R`, `svn ls`, revision-pinned `svn cat -r`, `svn cat`, `svn log`, `svn blame`, `svn diff`, `svn export`, revision-pinned `svn checkout -r`, `svn checkout`, single-file `svn commit`, `svn switch`, `svn update`, conflict-on-update, fresh-checkout property materialization, `svn add`, `svn delete`, `svn mkdir`, direct URL `svn mkdir URL -m`, direct URL `svn delete URL -m`, direct URL `svn import PATH URL -m`, direct URL file and directory `svn copy URL URL -m`, direct URL file and directory `svn move URL URL -m`, `svn propset`/`svn propdel`, direct file URL `svn propget`/`svn proplist --verbose`, `svn lock`/`svn unlock`, `svn copy`, and `svn move` pass over HTTP |
| Git Smart HTTP    | 🔶 Phase 3L 구현 | `git http-backend` wrapper로 clone/pull upload-pack 및 인증/권한이 적용된 receive-pack transport를 구현하고, receive-pack 후 `NEW_COMMIT` notification, pushed-branch metadata, push JSON webhook outbox를 기록한다 |
| PR/리뷰           | 🔶 Phase 4B+ 구현 | PR 목록/상세/changes/reviews, PR 목록 legacy search/list shell/sender contributor select/recently pushed branch prompt+delete route/tab count badges/row shell/progress badge/pagination, PR detail `partial_info.scala.html` top reviewer/review/merge controls with reviewer avatar images plus overview contributor avatars and `partial_state.scala.html` safe/conflict/merged notices with merged receiver avatars plus the `git/view.scala.html` empty event `board-comment-wrap` without placeholder text, changes 페이지 legacy `git/viewChanges.scala.html` shell(`.code-browse-wrap`, `.board-body.mb20`, `.author-info.right-txt`, `.codediff-wrap.mt10`, `#changes`, `#commits`, `.diffs-wrap-scroll`, empty diff body without placeholder text, `.btnPop`, `#review-form.review-form`, `code-review-body`), specific commit changes route/filter, selected commit `.commitInfo`/`.commitMsg.mt5` with legacy anonymous author label, 조직 PR 목록, create/edit, create/edit merge preflight `#mergeResult`/`#numOfCommits`, close/reopen, review/unreview, required/lacking reviewer projection, project default reviewer threshold settings, review-threshold-gated accept, PR watcher projection/watch-unwatch, PR watcher/body-mention-derived notification receiver, changes 페이지의 legacy `board-comment-wrap` / `non-ranged-threads-wrap` 일반 PR comment와 `common/commentForm.scala.html` shell, thread open/close plus legacy `partial_comment_thread.scala.html` ranged shell and `code/partial_nonrange_codecomment_thread.scala.html` non-ranged shell(`.comment-thread-wrap`, `.yobicon-comments`, no ranged `.thread-header`), delete `.yobicon-trash[data-toggle="comment-delete"]` trigger, `POST /threads/:id/open|close` direct routes, `commentThread.open`/`commentThread.close` request buttons, `issue.noAuthor` author fallback, `common/commentUpdateForm.scala.html` edit shell, and `partial_comment_form_on_thread.scala.html` reply shell(`.write-comment-form`, `.review-form`, hidden `thread.id`, current-user avatar/info, `contents`, `common.editor` tabs, notification receiver, `REVIEW_COMMENT` upload/drop anchors, `.right-txt`, `button.comment.new`), fork/clone, conflict-free merge, conflict 표시/merge 비활성화 및 legacy `.howto-resolve-conflict` 수동 해결 절차 안내, source branch cleanup/restore, PR commit-changed event/webhook, PRIOR commit/review-card outdated marker including stable `partial_reviewlist.scala.html` `.outdated-label`, no empty card placeholders, and avatar `img` elements, side-aware single/multi-line ranged inline review CRUD. 별도 in-app conflict editor는 legacy 근거 없음 |
| 검색              | 🔶 Phase 5C 구현  | `/api/v1` global/project/organization app search surface with legacy snippet windows and shortened-snippet suffix rendering |
| 알림              | 🔶 기본만         | SMTP 인프라, 프로젝트 알림 토글, notification inbox/list, core event icon/message projection, single/mass-update issue state-change receiver fan-out, mail queue staging, due-row outbound fan-out helper, allowed-domain mail receiver filtering, BCC hide-address mode, recipientLimit partitioning |
| 웹훅              | 🔶 부분 구현      | UPDATE-gated project webhook form/list CRUD with legacy `project/webhooks.scala.html` / `partial_webhooks_list.scala.html` form/list labels, placeholders, type radio labels, help block, row shell, and delete anchors plus issue/comment and PR create/review/comment/merge/commit-changed non-JSON fan-out, DETAIL_HANGOUT_CHAT thread name persistence/reuse, git-push JSON payloads, delivery history row recording, settings history read surface, retry behavior, private/internal endpoint guard, and HTTP/HTTPS delivery |
| 관리자            | 🔶 Phase 6A 구현  | site-admin user/project/post/issue lists, user/project mutation aliases, mail/test/mass-mail, diagnostics, update check plus app-owned redirect and file/plain-HTTP/HTTPS binary proxy, data export/import shell with portable attachment payload restore |
| 마크다운          | 🔶 기본 구현      | React-side project preview/source rendering plus marked-style leading-space ATX and setext heading ids/levels/head-anchor links with repeated-heading slug de-duplication and raw-inline-HTML heading rendering/tag-stripped slug basis, marked-style backslash escapes, inline link/image one-level nested labels, single- and multi-backtick code spans inside link labels, literal backtick image alt labels, adjacent reference/image tokenization, unescaped displayed labels, angle-wrapped targets including safe targets with preserved spaces, whitespace around inline targets, empty inline link targets, single-newline inline titles, balanced-parenthesis URL/path targets, unsafe target href/src encoding for brackets, braces, pipe, caret, and backtick, escaped target/title punctuation, safe uppercase URL schemes, and title attributes with legacy delimiters, reference-style links/images with one-level nested labels, single- and multi-backtick code spans inside link labels, literal backtick image alt labels, escaped reference labels, newline-split target/title definitions including target and title on separate continuation lines, escaped definition target/title punctuation, and fenced-code definition exclusion for backtick/tilde fences, inline emphasis/strong/delete nested parsing including intraword underscore suppression, delimiter-adjacent whitespace rejection, single/double-tilde delete delimiters with whitespace/triple-tilde rejection, triple-emphasis `<strong><em>` nesting, spaced triple-emphasis outer-strong behavior, and code span delimiter, newline, and spacing normalization, marked-style HTML entity decoding in normal text plus link/image labels and titles while preserving code span literals, `@user`, `@owner/project`, `#123`, `owner#123`, `owner/project#123`, metadata-backed commit SHA refs (`SHA`, `@SHA`, `owner@SHA`, `owner/project@SHA`) on PR/code comment render paths, React-side sanitized raw HTML blocks that preserve legacy-safe tags while keeping raw HTML contents opaque to autolink parsing, inline-safe raw HTML paragraph fragments with surrounding Markdown/autolinks still parsed, raw HTML comments kept opaque to autolinks, declarations/processing instructions and CDATA sections stripped after parsing, bare and angle-bracket `http(s)`/`ftp`/`www`/email autolinks including extended angle-email local-part punctuation and legacy domain validation, lowercase `www.` href normalization with uppercase `WWW.` href preservation and marked-style angle URL/`mailto:` case handling and trailing-punctuation/unmatched-closing-delimiter/entity-like suffix backpedaling, readable issue title/state metadata on saved issue/PR/code/milestone/board Markdown render paths, normal soft line breaks, legacy `readme-body` `breaks: false` soft-line behavior, hard-break marker consumption, horizontal rules including spaced and tab-separated markers, GFM strikethrough, basic GFM pipe tables with escaped-pipe cells, one-or-more dash and legacy colon-only separators, empty-body omission, row cell padding/truncation, block and blank-line interruption, and left/center/right alignment, basic nested smart lists with marker-change splitting and legacy marker-padding indentation thresholds, non-1 and zero ordered-list start preservation, direct-tab marker padding, space-tab marker indented-code and continuation items, and marked-style indented continuation lines, including blank-line-separated continuations, two-blank-line list termination, and nested loose-list paragraph-wrapper propagation, inside list items with task-list checkboxes kept in the first loose paragraph, basic blockquotes with marked-style lazy continuations including quoted list-item continuations, blank-line paragraph splitting plus nested ATX/setext heading, list including loose-list continuation, table, horizontal-rule, indented-code, and fenced-code block parsing, indented code blocks plus backtick and tilde fenced code blocks with optional separating space, EOF closure, backtick-fence indent compensation, legacy first-token info-string language class preservation including punctuation, matching closing-fence length plus legacy mixed trailing fence characters, and shared `syntax-token` fenced-code highlighting with Go/`golang`, C# aliases, Elixir hash comments, Erlang percent comments, R hash comments, MATLAB percent comments, AWK hash comments, TeX/LaTeX percent comments, Django/Jinja inline comments, HTMLBars, accesslog, Groovy, LLVM, Haml comments, Excel/`xlsx`/`xls`, Haskell/`hs`, Lua, Clojure/`clj`, `clojure-repl`, Markdown/`md`/`mkdown`/`mkd`, CMake/`cmake.in`, Gradle, Makefile/`mk`/`mak` hash comments, Perl/`pl`/`pm`, Basic, AsciiDoc/`adoc` comments, Arduino, CoffeeScript/`coffee`, Dockerfile/`docker` hash comments, nginx/`nginxconf` hash comments, Apache/`apacheconf` hash comments, HTTP/`https`, Diff/`patch`, JSON, ini/`toml` semicolon/hash comments, PowerShell/`ps`, DOS/`bat`/`cmd`, Kotlin, Swift, Elm comments, Objective-C aliases, CSS/Less/SCSS selector/property/value tokens, Python/`py`/`gyp` hash comments/binary-octal-hex-exponent-suffix plus signed common-number numeric literals/REPL prompts/decorators/declaration titles and params/triple-quoted strings/single- and triple-quoted prefixed strings/single/triple-quoted f-string interpolation/built-ins, Shell aliases including legacy `console`, SQL comments, Ruby comments/package aliases/`rb`/`gemspec`/`podspec`/`thor`/`irb`, PHP hash comments/aliases, C/C++ aliases, YAML/yml, and XML/HTML comment coverage, safe inline images, disabled task-list checkbox inputs plus literal no-trailing-space empty markers, issue/board tasklist progress bars including trailing-space/tab-separated empty checkbox and ordered task-list item counts with +/*/ordered-paren markers and legacy paragraph-interruption exclusions, code-browser Markdown React-side rendering with local image path rewrite, project-home Git README React-side rendering with local image/normal-link rewrite, issue body/comment/history modal React-side rendering, PR body/review comment React-side rendering, Git commit discussion comment React-side rendering, board post/comment/history modal/DB README posting React-side rendering, and milestone detail React-side rendering |
| REST API          | 🔶 부분           | `/api/v1` application API는 Phase 1~3A 구현 흐름을 커버. `/-_-api/v1/hello`, user-menu favorite helpers, and issue/board translation helper with legacy UI controls/React-side Markdown rendering은 legacy JSON/status behavior로 구현됐고, user-menu favorite/translation helpers accept legacy `Yona-Token` / `Authorization: token ...` auth; 나머지 `/-_-api/v1` legacy external API는 별도 migrator/export/import deliverable로 분리 |
| Frontend 라우트   | ✅ 구현           | legacy issueform/editform, anonymous `/_help` FAQ shell, and authenticated `/restricted` sample shell 포함 |
| Frontend 테스트   | 🔶 부분           | API client, route parity, E2E smoke                              |
| i18n              | 🔶 설정 호환      | `YONA_LANGS` runtime supported-language projection exists; dynamic copy switching remains deferred while legacy copy parity stays fixed |
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
hostname = "localhost"                 # application.hostname
base_path = "/"                        # application.context
allow_anonymous_access = true          # application.allowsAnonymousAccess
allowed_sending_mail_domains = []      # application.allowed.sending.mail.domains
guest_login_prefix = ""                # application.guest.user.login.id.prefix
show_user_email = true                 # application.show.user.email
langs = ["en-US", "ko-KR"]            # application.langs

[auth]
email_verification = false             # application.use.email.verification
login_id_placeholder = ""              # application.login.page.loginId.placeholder
password_placeholder = ""              # application.login.page.password.placeholder
signup_require_confirm = false         # signup.require.admin.confirm
social_login_only = false              # application.use.social.login.only

[session]
max_age = 3600                         # session.maxAge (seconds)

[database]
url = "mysql://user:pass@127.0.0.1:3306/yona"  # db.default.url (jdbc: prefix 제거)

[smtp]
host = "smtp.gmail.com"               # smtp.host
port = 465                            # smtp.port
ssl = true                            # smtp.ssl
user = ""                             # smtp.user
password = ""                         # smtp.password
domain = ""                           # smtp.domain
from = ""                             # explicit sender override (`SMTP_FROM` / `YONA_SMTP_FROM`)

[webhook]
delivery_retries = 0                  # YONA_WEBHOOK_DELIVERY_RETRIES
allow_private_networks = false        # YONA_WEBHOOK_ALLOW_PRIVATE_NETWORKS

[notification]
mail_enabled = true                    # notification.bymail.enabled
mail_initial_delay = "5s"              # application.notification.bymail.initdelay
mail_interval = "60s"                  # application.notification.bymail.interval
mail_delay = "180s"                    # application.notification.bymail.delay
recipient_limit = 100                  # application.notification.bymail.recipientLimit
hide_address = true                    # application.notification.bymail.hideAddress
draft_time = "30s"                     # application.notification.draft-time

[mailbox]
imap_address = "noreply@yona.local"    # YONA_MAILBOX_IMAP_ADDRESS
polling_enabled = false                # YONA_MAILBOX_POLLING_ENABLED
polling_initial_delay = "5s"           # YONA_MAILBOX_POLLING_INITIAL_DELAY
polling_interval = "60s"               # YONA_MAILBOX_POLLING_INTERVAL
fetch_command = ""                     # YONA_MAILBOX_FETCH_COMMAND

[update]
current_version = ""                   # YONA_CURRENT_VERSION
error = ""                             # YONA_UPDATE_ERROR
latest_version = ""                    # YONA_UPDATE_LATEST_VERSION
version = ""                           # YONA_UPDATE_VERSION
release_url = ""                       # YONA_UPDATE_RELEASE_URL
metadata_url = ""                      # YONA_UPDATE_METADATA_URL
metadata_file = ""                     # YONA_UPDATE_METADATA_FILE
https_fetch_command = ""               # YONA_UPDATE_HTTPS_FETCH_COMMAND

[issue]
event_draft_time = "30s"               # application.issue-event.draft-time

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
| `/users/login`                     | POST     | direct form adapter over `/api/v1/auth/sign-in` | —                                             | implemented        |
| `/users/signup`                    | POST     | direct form adapter over `/api/v1/auth/register` | —                                             | implemented        |
| `/user/isUsed`                     | GET      | direct signup Ajax validator          | —                                             | implemented        |
| `/user/isEmailExist`               | GET      | direct signup Ajax validator          | —                                             | implemented        |
| `/lostPassword`                    | GET/POST | `POST /lostPassword` direct           | `lostPassword/`                               | implemented        |
| `/resetPassword`                   | GET/POST | `POST /resetPassword` direct          | `resetPassword/`                              | implemented        |
| `/verify/:loginId/:code`           | GET      | `POST /api/v1/auth/verify`            | `verify/$loginId/$code`                       | implemented        |
| `/logout`                          | GET      | direct GET logout + `POST /api/v1/auth/sign-out` | —                                             | implemented        |
| `/users/logout`                    | GET      | direct GET logout                     | —                                             | implemented        |
| `/me`                              | GET      | SPA                                   | `me/`                                         | implemented        |
| `/:user`                           | GET      | `GET /api/v1/users/:loginId/profile`; `GET /api/v1/users/:loginId/statistics` | `$user/`                                      | implemented        |
| `/:user`                           | POST     | `POST /api/v1/site/users/:loginId/password/reset` | `sites/$pageName` action modal                | implemented        |
| `/user/files`                      | GET      | `GET /api/v1/workspace/files`         | `user/files`                                  | implemented        |
| `/user/editform`                   | GET      | SPA                                   | `user/editform/`                              | implemented        |
| `/user/sidebar`                    | GET      | direct legacy HTML frame              | `layout_framed.scala.html` + `sidebar.scala.html` | implemented        |
| `/user/usermenuTabContentList`     | GET      | direct legacy HTML fragment           | global user menu tab content                  | implemented        |
| `/user/editform/token_reset`       | POST     | direct workspace API token reset      | `user/editform/token`                         | implemented        |
| `/user/edit`                       | POST     | direct workspace profile mutation     | `user/editform`                               | implemented        |
| `/user/resetVisitedList`           | POST     | direct workspace visited reset        | `user/editform`                               | implemented        |
| `/user/defultLoginPage`            | POST     | direct default landing JSON mutation  | workspace pages                               | implemented        |
| `/user/resetPassword`              | POST     | direct workspace password change      | `user/editform/password`                      | implemented        |
| `/user/email`                      | POST     | direct workspace email mutation       | `user/editform/emails`                        | implemented        |
| `/user/email/delete/:id`           | DELETE   | direct workspace email mutation       | `user/editform/emails`                        | implemented        |
| `/user/email/setAsMain/:id`        | PUT      | direct workspace email mutation       | `user/editform/emails`                        | implemented        |
| `/projects`                        | GET      | `GET /api/v1/projects`                | `projects/`                                   | implemented        |
| `/projectform`                     | GET      | SPA                                   | `projects/new`                                | implemented        |
| `/:owner/:project`                 | GET      | `GET /api/v1/owners/:owner/projects/:project` | `$owner/$projectName/`                        | implemented        |
| `/:owner/:project`                 | PUT      | `PUT /api/v1/owners/:owner/projects/:project/overview` | `$owner/$projectName/` overview edit          | implemented        |
| `/:owner/:project/settingform`     | GET      | `GET /api/v1/owners/:owner/projects/:project/settings` | `$owner/$projectName/settingform`             | implemented        |
| `/info/leave/:owner/:project`      | GET      | direct project self-leave adapter       | `/:user?selected=projects`                    | implemented        |
| `/:owner/:project/issues`          | GET      | `GET /api/v1/projects/:owner/:project/issues` | `$owner/$projectName/issues`                  | implemented        |
| `/user/issues/new`                 | GET      | `GET /api/v1/user/issues/new-options` | `user/issues/new`                             | implemented        |
| `/user/issues/new/mine`            | GET      | `GET /api/v1/user/issues/new-options?mine=true` | `user/issues/new/mine`                        | implemented        |
| `/:owner/:project/issue/:number`   | GET      | `GET /api/v1/projects/:owner/:project/issues/:number` | `$owner/$projectName/issue/$issueNumber`      | implemented        |
| `/:owner/:project/issue/:number/comments` | POST | direct issue comment adapter          | `$owner/$projectName/issue/$issueNumber`      | implemented        |
| `/:owner/:project/issue/:number/comments/:commentId` | POST | direct issue comment adapter | `$owner/$projectName/issue/$issueNumber`      | implemented        |
| `/:owner/:project/issue/:number/comment/:commentId/delete` | DELETE | direct issue comment adapter | `$owner/$projectName/issue/$issueNumber` | implemented        |
| `/:owner/:project/posts`           | GET      | `GET /api/v1/projects/:owner/:project/posts` | `$owner/$projectName/posts`                   | implemented (core) |
| `/:owner/:project/postform`        | GET      | SPA                                   | `$owner/$projectName/postform`                | implemented (core) |
| `/:owner/:project/post/:number`    | GET      | `GET /api/v1/projects/:owner/:project/posts/:number` | `$owner/$projectName/post/$postNumber`        | implemented (core) |
| `/:owner/:project/post/:number/editform` | GET | SPA                                   | `$owner/$projectName/post/$postNumber/editform` | implemented (core) |
| `/:owner/:project/post/:number/comment` | POST | direct posting comment adapter        | `$owner/$projectName/post/$postNumber`        | implemented (core) |
| `/:owner/:project/post/:number/comment/:commentId` | POST | direct posting comment adapter | `$owner/$projectName/post/$postNumber`        | implemented (core) |
| `/:owner/:project/post/:number/comment/:commentId/delete` | DELETE | direct posting comment adapter | `$owner/$projectName/post/$postNumber` | implemented (core) |
| `/:owner/:project/pullRequests`    | GET      | `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=open` | `$owner/$projectName/pullRequests`            | implemented        |
| `/:owner/:project/closedPullRequests` | GET   | `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=closed` | `$owner/$projectName/closedPullRequests`      | implemented        |
| `/:owner/:project/sentPullRequests` | GET     | `GET /api/v1/owners/:owner/projects/:project/pull-requests?category=sent` | `$owner/$projectName/sentPullRequests`        | implemented        |
| `/:owner/:project/newPullRequestForm` | GET   | `GET /api/v1/owners/:owner/projects/:project/pull-requests/form-options` | `$owner/$projectName/newPullRequestForm`      | implemented        |
| `/:owner/:project/pullRequest/:id` | GET      | `GET /api/v1/owners/:owner/projects/:project/pull-requests/:number` | `$owner/$projectName/pullRequest/$pullRequestNumber` | implemented        |
| `/:owner/:project/pullRequest/:id/changes` | GET | `GET /api/v1/owners/:owner/projects/:project/pull-requests/:number/changes` | `$owner/$projectName/pullRequest/$pullRequestNumber/changes` | implemented        |
| `/:owner/:project/code`            | GET      | `GET /api/v1/projects/:owner/:project/code` | `$owner/$projectName/code`                    | implemented (기본) |
| `/:owner/:project/code/:branch/*`  | GET      | `GET /api/v1/projects/:owner/:project/code?branch=&path=` | `$owner/$projectName/code/$branch/$`          | implemented (기본) |
| `/:owner/:project/code/:branch/download` | GET | direct Git archive zip                       | —                                             | implemented        |
| `/:owner/:project/rawcode/:rev/*`  | GET      | direct Git blob stream                 | —                                             | implemented        |
| `/:owner/:project/files/:rev/*`    | GET      | direct Git blob stream                 | —                                             | implemented        |
| `/:owner/:project/image/:rev/*`    | GET      | direct Git blob stream                 | —                                             | implemented        |
| `/:owner/:project/commits`         | GET      | `GET /api/v1/projects/:owner/:project/commits` | `$owner/$projectName/commits/**`              | implemented        |
| `/:owner/:project/milestones`      | GET      | `GET /api/v1/owners/:owner/projects/:project/milestones` | `$owner/$projectName/milestones`              | implemented        |
| `/:owner/:project/branches`        | GET      | `GET /api/v1/projects/:owner/:project/branches` | `$owner/$projectName/branches`                | implemented        |
| `/:owner/:project/code/:branch/`   | DELETE   | `DELETE /api/v1/projects/:owner/:project/branches` | `$owner/$projectName/branches`                | implemented        |
| `/:owner/:project/code/:branch/setAsDefault` | POST | `POST /api/v1/projects/:owner/:project/branches/default` | `$owner/$projectName/branches`                | implemented        |
| `/organizations/new`               | GET      | SPA                                   | `organizations/new`                           | implemented        |
| `/organizations/:name`             | GET      | `GET /api/v1/organizations/:name`     | `organizations/$organizationName/`            | implemented        |
| `/organizations/:name/members`     | GET      | `GET /api/v1/organizations/:name/members` | `organizations/$organizationName/members`     | implemented        |
| `/organizations/:name/settingform` | GET      | `GET /api/v1/organizations/:name/settings` | `organizations/$organizationName/settingform` | implemented        |
| `/organizations/:name/issues`      | GET      | `GET /api/v1/organizations/:name/issues` | `organizations/$organizationName/issues`      | implemented        |
| `/organizations/:name/boards`      | GET      | `GET /api/v1/organizations/:name/boards` | `organizations/$organizationName/boards`      | implemented (core) |
| `/search`                          | GET      | `GET /api/v1/search`                 | `search/`                                     | implemented        |
| `/files`                           | GET      | `GET /files` direct                  | —                                             | implemented        |
| `/files`                           | POST     | `POST /files` direct                  | —                                             | implemented        |
| `/files/:id`                       | GET      | `GET /files/:id` direct               | —                                             | implemented        |
| `/files/:id`                       | POST/DELETE | `POST/DELETE /files/:id` direct    | —                                             | implemented        |
| `/files/:id/`                      | GET/POST | `GET/POST /files/:id/` direct         | —                                             | implemented        |
| `/-_-api/v1/favoriteProjects`      | GET      | favorite project list                 | legacy user-menu helper JSON                  | implemented        |
| `/-_-api/v1/favoriteProjects/:id`  | POST     | favorite project toggle               | legacy user-menu helper JSON                  | implemented        |
| `/-_-api/v1/favoriteIssues`        | GET      | favorite issue list                   | legacy user-menu helper JSON                  | implemented        |
| `/-_-api/v1/favoriteIssues/:id`    | POST     | favorite issue toggle                 | legacy user-menu helper JSON                  | implemented        |
| `/-_-api/v1/favoriteOrganizations` | GET      | favorite organization list            | legacy user-menu helper JSON                  | implemented        |
| `/-_-api/v1/favoriteOrganizations/:id` | POST  | favorite organization toggle          | legacy user-menu helper JSON                  | implemented        |
| `/-_-api/v1/translation`           | POST     | issue/board translation helper        | legacy 412 when unconfigured + executable translation proxy + React Markdown rendering | implemented        |
| `/notifications`                   | GET      | `GET /api/v1/notifications`           | `notifications/` full page                    | implemented        |
| `/notification`                    | GET      | direct legacy partial fragment        | `partial_notifications.scala.html`            | implemented        |
| `/noti/toggle/:projectId/:notiType` | POST    | `POST /api/v1/workspace/notifications` | direct empty OK adapter                       | implemented        |
| `/:owner/:project/watch`            | POST     | `POST /api/v1/owners/:owner/projects/:project/watch` | direct empty OK adapter                       | implemented        |
| `/:owner/:project/unwatch`          | POST     | `DELETE /api/v1/owners/:owner/projects/:project/watch` | direct empty OK adapter + notification cleanup | implemented        |
| `/sites/userList`                  | GET      | `GET /api/v1/site/users`              | `sites/$pageName`                             | implemented (core) |
| `/sites/toggleSiteAdminRole/:loginId` | POST  | `POST /api/v1/site/users/:loginId/site-admin/toggle` | `sites/$pageName` action modal       | implemented        |
| `/sites/toggleAccountLock`         | POST     | `POST /api/v1/site/users/:loginId/account-lock/toggle` | `sites/$pageName` action modal     | implemented        |
| `/sites/toggleGuestMode`           | POST     | `POST /api/v1/site/users/:loginId/guest/toggle` | `sites/$pageName` action modal            | implemented        |
| `/sites/user/delete:id`            | DELETE   | `DELETE /api/v1/site/users/:loginId`  | `sites/$pageName` action modal                | implemented        |
| `/sites/projectList`               | GET      | `GET /api/v1/site/projects`           | `sites/$pageName`                             | implemented        |
| `/sites/project/delete/:id`         | DELETE   | `DELETE /api/v1/site/projects/:id`    | `sites/$pageName` action modal                | implemented        |
| `/sites/postList`                   | GET      | `GET /api/v1/site/posts`              | `sites/$pageName`                             | implemented        |
| `/sites/issueList`                  | GET      | `GET /api/v1/site/issues`             | `sites/$pageName`                             | implemented        |
| `/sites/mail`                       | POST     | `POST /api/v1/site/mail/test`         | direct legacy form submit                     | implemented        |
| `/sites/mailList`                   | POST     | `POST /api/v1/site/mail-list`         | `sites/$pageName` massmail action             | implemented        |
| `/sites/diagnostic`                 | GET      | `GET /api/v1/site/diagnostics`        | `sites/$pageName`                             | implemented        |
| `/sites/unwatchUpdate`              | POST     | in-process update notification flag   | direct route                                  | implemented        |
| `/unwatch`                          | GET/POST | `unwatch` table mutation              | legacy resource target redirect / JSON OK     | implemented        |
| `/sites/*`                         | GET      | —                                     | `sites/$pageName` unknown fallback            | no legacy catch-all; not-found |
| `/-_-api/v1/hello`                 | GET      | direct legacy health JSON             | `{"message":"I'm alive!","ok":true}`          | implemented        |
| `/-_-api/v1/*`                     | Various  | —                                     | migration tool legacy-source adapter only; Rust import uses site-admin import/tool-local `yobi-data` formats | unsupported in app except hello/favorite helpers/translation; broad compatibility stays out of Rust runtime |
| `/svn/*`                           | Various  | legacy SVN boundary mounted with auth/DAV metadata, `OPTIONS` capability response, `DAV: 1,2`/`MS-Author-Via: DAV` discovery headers plus DeltaV activity discovery, base-path-aware root `PROPFIND`, default VCC `PROPFIND` multistatus with executable-backed youngest revision and repository UUID metadata plus requested `creationdate`/`creator-displayname`/`getlastmodified`, default VCC child file/collection `PROPFIND` for `!svn/vcc/default/<path>` preserving requested VCC hrefs while resolving head metadata, baseline resource `PROPFIND` when `svnlook` is available, actual local `svn info`, recursive `svn ls -R`, `svn ls`, revision-pinned `svn cat -r`, `svn cat`, `svn log`, `svn blame`, `svn diff`, `svn export`, revision-pinned `svn checkout -r`, `svn checkout`, single-file `svn commit`, `svn switch`, `svn update`, conflict-on-update, fresh-checkout property materialization, `svn add`, `svn delete`, `svn mkdir`, direct URL `svn mkdir URL -m`, direct URL `svn delete URL -m`, direct URL `svn import PATH URL -m`, direct URL file and directory `svn copy URL URL -m`, direct URL file and directory `svn move URL URL -m`, `svn propset`/`svn propdel`, direct file URL `svn propget`/`svn proplist --verbose`, `svn lock`/`svn unlock`, `svn copy`, and `svn move` HTTP smoke coverage, `GET`/`HEAD` file content, file `PROPFIND` content-length/content-type/etag/displayname/supportedlock/version/checked-in/baseline-relative-path metadata plus requested `creationdate`/`creator-displayname`/`getlastmodified` and `supported-report-set` discovery, live/custom property value/name projection, and supportedlock/lock discovery through `svnlook cat`/`youngest`/`log`/`proplist`/`propget`/`lock` for normal plus `!svn/rvr`/`!svn/bc`/`!svn/ver` paths, collection tree and revision-pinned baseline collection `PROPFIND` child metadata plus child file content-type/etag/displayname/supportedlock/version/checked-in and requested `creationdate`/`creator-displayname`/`getlastmodified` metadata through `svnlook tree`/`youngest`/`log`, baseline resource `PROPFIND` requested `creationdate`/`creator-displayname`/`getlastmodified`/`repository-uuid` through `svnlook log` and repository metadata, collection `PROPFIND` `Depth: 0` child suppression, normal/revision-pinned baseline collection `Depth: 1` direct-child projection, `Depth: infinity` recursive nested-entry projection, and baseline collection `supported-report-set` discovery, `log-report`/`dated-rev-report` revision metadata plus changed-path copyfrom metadata and requested path filtering through `svnlook log`/`author`/`date`/`changed --copy-info`, `get-locks-report` lock metadata through `svnlook lock`, `get-locations-report`/`get-location-segments-report` path metadata and copied-path ancestry through `svnlook cat`/`tree`/`changed --copy-info`, depth/recursive-aware `update-report` checkout/update/switch file fetch metadata through `svnlook tree`, `file-revs-report` file revision metadata plus txdelta content through `svnlook log`/`cat`, `mergeinfo-report` mergeinfo metadata through `svnlook propget`, `get-deleted-rev-report` deleted-path revision lookup through `svnlook` path existence, `list-report` directory entry metadata through `svnlook tree`/`cat`, `inherited-props-report` inherited regular property metadata through `svnlook proplist`/`propget`, `replay-report` revision editor metadata through `svnlook changed`, WebDAV `LOCK`/`UNLOCK` through `svnadmin lock`/`unlock`, WebDAV `COPY`, WebDAV `MOVE` through `svn move`/`commit`, and WebDAV `PUT` file updates including svndiff body decoding, `DELETE` removals, `MKCOL` collection creation, `PROPPATCH` property set/remove, and `MKACTIVITY`/`CHECKOUT`/`MERGE` commit choreography through `svn checkout`/`commit` | broader VCC/baseline PROPFIND edge completeness pending | partial            |
| `/authenticate/:provider`          | GET      | unsupported-provider login redirect  | `/users/loginform?error=unsupported&provider=...` | unsupported state implemented; OAuth flow deferred |
| `/authenticate/:provider/denied`   | GET      | OAuth denied login redirect          | `/users/loginform?error=oauthDenied&provider=...` | implemented        |

---

## 부록 C: Existing Proto Schema Snapshot

`proto/yona/pilot/v1/pilot.proto`는 REST pivot 이전 임시 구현의 message schema snapshot이다.
Phase -1 이후 runtime `/rpc` registration, frontend ConnectRPC generated client, and ConnectRPC package dependencies are removed.
서버 build는 필요한 legacy message shape만 `buffa-codegen`으로 생성한다.

Debug-only test note: `debug_assertions` 빌드에서는 과거 method-name 기반 contract tests를 REST route로 우회시키기 위해 `/api/v1/_pilot/{method_name}` harness가 있다. 이 route는 application contract가 아니며 frontend/runtime code에서 사용하면 안 된다.

| Snapshot category | REST replacement status |
| ----------------- | ----------------------- |
| Auth/session      | `/api/v1/session`, `/api/v1/auth/*` implemented |
| Workspace         | `/api/v1/workspace/**`, `/api/v1/users/:loginId/profile` implemented |
| Organization/project | `/api/v1/organizations/**`, `/api/v1/owners/:owner/projects/**`, `/api/v1/projects` implemented |
| Issue core/meta   | `/api/v1/projects/:owner/:project/issues/**`, `/api/v1/organizations/:org/issues`, `/api/v1/user/issues`, `/api/v1/owners/:owner/projects/:project/assignable-users`, `/api/v1/owners/:owner/projects/:project/issue-references`, `/api/v1/owners/:owner/projects/:project/issues/:number/**` implemented |
| Label/milestone   | `/api/v1/owners/:owner/projects/:project/labels/**`, `/api/v1/owners/:owner/projects/:project/milestones/**` implemented |
| Code browser      | `GET /api/v1/projects/:owner/:project/code` with branch/tag selector refs, `/commits`, `/commit/:id`, `/compare/:revA..:revB`, `/branches`, `POST /branches/default`, and `DELETE /branches` implemented |

**새 runtime API는 REST로 구현할 영역**:

- Issue follow-up: app-facing issue sharer search/mutation parity is covered for legacy-observed user and public-project targets, including the legacy large-result split limit for sharable-user lookup. Organization/group sharer expansion remains out of app scope unless a legacy controller artifact proves support.
- Board: posting list/detail/create/update/delete/comment flows
- Label follow-up: legacy external label/project API parity for the separate migrator/export/import scope
- Milestone follow-up: migration export/import scope only
- Code follow-up: remaining broader VCC/baseline WebDAV PROPFIND edge completeness beyond the passing file/collection/VCC/baseline requested-property filtering, `propname` live/custom-property name projection, file `getcontenttype`/`getetag`/`displayname`/`supportedlock`, VCC metadata `version-name`/`checked-in`/`baseline-collection` preservation, default VCC `creationdate`/`creator-displayname`/`getlastmodified`, default VCC child file/collection `!svn/vcc/default/<path>` metadata with requested-href preservation, root/default VCC `activity-collection-set` discovery plus explicit `allprop` DeltaV metadata coverage, baseline resource/file/collection, normal collection, and collection child-file `creationdate`/`creator-displayname`/`getlastmodified` plus baseline resource `repository-uuid`, collection `Depth: 0`, normal/revision-pinned baseline collection `Depth: 1`, and `Depth: infinity` handling, Label revision selection for root/VCC/file `PROPFIND`, file/root/VCC/baseline resource/baseline collection `supported-report-set` discovery, and update-report send-all txdelta diff payloads. External `svn info`, recursive `svn ls -R`, `svn ls`, revision-pinned `svn cat -r`, `svn cat`, `svn log`, `svn log --verbose` including changed-path copyfrom metadata and path filtering, `svn blame`, `svn diff`, `svn export`, revision-pinned `svn checkout -r`, `svn checkout`, `svn checkout --depth empty`, `svn update --set-depth infinity`, `svn update --set-depth empty`, `svn update --set-depth files`, `svn update --set-depth exclude`, `svn checkout --depth files`, `svn checkout --depth immediates`, single-file `svn commit`, `svn status -u`, `svn switch`, `svn update`, revision-targeted `svn update -r REV`, remote-delete `svn update`, conflict-on-update, fresh-checkout property materialization, `svn add`, `svn delete`, `svn mkdir`, direct URL `svn mkdir URL -m`, direct URL `svn delete URL -m`, direct URL `svn import PATH URL -m`, direct URL file and directory `svn copy URL URL -m`, direct URL file and directory `svn move URL URL -m`, `svn propset`/`svn propdel`, direct file URL `svn propget`/`svn proplist --verbose`, `svn lock`/`svn unlock`, `svn copy`, `svn move`, and `svn mergeinfo` smokes pass over the mounted `/svn/$path` boundary with local `svn`/`svnadmin`/`svnlook` 1.14.5
- SVN verification refresh: external `svn checkout --depth empty` now has executable-client smoke coverage against `/svn/$path`, proving depth-limited checkout creates only the working-copy root while suppressing direct files and directories.
- SVN verification refresh: external `svn update --set-depth infinity` now has executable-client smoke coverage against `/svn/$path`, proving a depth-empty working copy can deepen to recursive file/directory materialization.
- SVN verification refresh: external `svn update --set-depth empty` now has executable-client smoke coverage against `/svn/$path`, proving a full working copy can shrink back to an empty-depth root while removing materialized direct files/directories.
- SVN verification refresh: external `svn checkout --depth files` now has executable-client smoke coverage against `/svn/$path`, proving depth-limited checkout materializes direct files while suppressing child directories.
- SVN verification refresh: external `svn checkout --depth immediates` now has executable-client smoke coverage against `/svn/$path`; non-recursive `update-report` directory entries preserve checked-in/version metadata so the stock client materializes direct child directories while suppressing nested files.
- SVN verification refresh: external `svn update --set-depth files` now has executable-client smoke coverage against `/svn/$path`, proving both depth-empty checkout deepening to direct files and full checkout shrinking back to direct files while suppressing child directories.
- SVN verification refresh: external `svn update --set-depth exclude <child-dir>` now has executable-client smoke coverage against `/svn/$path`, proving child-directory exclusion from an existing working copy.
- SVN verification refresh: external `svn update` now has executable-client remote-delete smoke coverage against `/svn/$path`, proving update-report `delete-entry` removes files deleted by another working copy.
- SVN verification refresh: installed VisualSVN/Subversion 1.14.5 executables (`svn`, `svnadmin`, `svnlook`) now pass `cargo test -p yona-rust-pilot-server --test svn_protocol_contract -- --nocapture` across all 42 executable-backed protocol and external-client smokes.
- SVN verification refresh: baseline resource `PROPFIND` `allprop` now has contract coverage for baseline resourcetype, display name, supported lock, version name, baseline collection, repository UUID, and supported REPORT discovery.
- SVN verification refresh: revision-pinned baseline collection `PROPFIND` `allprop` now has contract coverage for collection and child-file live metadata, including checked-in/version hrefs, baseline-relative paths, revision provenance, file content metadata, and supported REPORT discovery.
- SVN verification refresh: actual local `svn update -r REV` now has external-client smoke coverage for downgrading a working copy to a historical revision and restoring it back to HEAD over the mounted DAV boundary.
- SVN verification refresh: WebDAV `MOVE` is now advertised in SVN `OPTIONS` and dispatches through the local executable-backed `svn move`/`svn commit` wrapper; current local verification covers the route/auth boundary and compiles the direct-URL move smokes, which skip when `svn`/`svnadmin`/`svnlook` are unavailable.
- SVN verification refresh: root and default VCC `PROPFIND` now have focused contract coverage for `Label` revision selection, and baseline resource `!svn/bln/:rev` has invalid-revision `400` plus out-of-range `404` mapping coverage; these executable-backed fixtures skip when local SVN tools are unavailable.
- SVN verification refresh: root and default VCC explicit `allprop` `PROPFIND` now has focused contract coverage for DeltaV live metadata (`checked-in`, `baseline-collection`, repository UUID, activity collection, and supported REPORT discovery); this executable-backed fixture skips when local SVN tools are unavailable.
- Git verification refresh: direct `rawcode`, `files`, and `image` blob routes reject encoded `..` traversal with `400 Bad Request`, legacy `URLEncoder`-style branch segments such as `topic%2Fencoded%2Bplus` resolve on direct file and archive routes, and Smart HTTP `git-receive-pack` rejects oversized announced `Content-Length` with `413 Payload Too Large` before invoking Git.
- PullRequest note: conflict resolution parity is the legacy manual `.howto-resolve-conflict` rebase/force-push guide and refresh action; no separate in-app conflict editor route/test is legacy-backed.
- Search follow-up: full-text/index-backed search, async indexing, index-backed ranking improvements, and legacy external search compatibility only if the separate migrator/export scope requires it
- Search verification refresh: app search now has `SearchTests`-borrowed issue, issue-comment, post, post-comment, milestone, and review visibility contracts proving anonymous search sees public resources only while the author sees matching private resources too.
- Search verification refresh: app search now has `SearchTests`-borrowed protected-project issue/issue-comment/post/post-comment/milestone/review visibility coverage proving anonymous/outsider users see public resources only while organization members also see protected resources.
- Search verification refresh: app search now has `SearchTests`-borrowed project-scoped issue/issue-comment/post/post-comment/milestone/review search coverage proving read-authorized public/protected/private `/projects/:owner/:project/search` queries stay bound to the selected project.
- Search verification refresh: app search now has `SearchTests`-borrowed organization-scoped issue/issue-comment/post/post-comment/milestone/review search coverage proving `/organizations/:organization/search` excludes matching personal projects and applies public/protected organization visibility.
- Search verification refresh: app search now has `SearchTests`-borrowed user lookup contracts for login ID and display-name matches, returning the legacy `/users/:loginId` href shape.
- Search verification refresh: app search now has `SearchTests.findProjects`-borrowed project result visibility coverage proving anonymous global `searchType=project` returns matching public projects and excludes matching private projects.
- Notification: mailbox executable polling now processes NUL-separated raw RFC822 messages from `YONA_MAILBOX_FETCH_COMMAND` through the existing raw mailbox bridge after issue/board/code/review comment `original_email` marker parity, mailbox plus-address/detail-routing parser parity, Message-ID left-part parser parity, header Message-ID token parser parity, sender lookup parity, raw RFC822/MIME mailbox ingestion, parsed mailbox-message normalization, app-level parsed/raw-message processing bridge, normalized mailbox-message orchestration, MIME content selection parity, exact `original_email` reply target lookup, Message-ID-left direct resource-path fallback, recipient detail resource lookup with legacy enum-style resource type canonicalization, mailbox action planning/execution, DB-backed `CreationViaEmailTest` resource creation parity including board comments, legacy `NotificationMail.handleLinks` external-link `noreferrer` parity, and the legacy notification mail HTML shell/view-link/resource-unwatch/settings-footer body
- Migrator/export/import: legacy external `/-_-api/v1/**` compatibility beyond the direct `hello` health check, user-menu favorite helpers, and issue/board translation helper, including issue API parity, is a separate migration-tool source-adapter deliverable rather than app server scope. Existing legacy Yona instances are read through their existing legacy endpoints; Rust Yona receives migration data through site-admin import or tool-local `yobi-data` formats, not by mounting the broad legacy API in the Rust runtime.
- Webhook follow-up: optional signature compatibility if external evidence requires it
- Admin follow-up: site-admin user/project/post/issue/mail/diagnostic/update/data surfaces are implemented; remaining admin gaps are outside the update binary proxy slice
- Markdown watchlist: add further legacy autolink, GFM extension, or Highlight.js-equivalent language edges only when new evidence requires them; no known app-runtime Markdown renderer blocker remains

---
