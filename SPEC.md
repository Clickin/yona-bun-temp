# Yona Go + React Rebuild SPEC

Status: Canonical Draft v1
Date: 2026-03-07
Language: Korean-first, English identifiers

## 1. 문서 목적

이 문서는 Yona를 Go backend + React frontend 제품으로 재구축하기 위한 canonical execution spec이다.

이 문서는 다음 조건을 만족해야 한다.

- 각 섹션이 독립 구현 작업 단위가 될 수 있을 만큼 구체적이어야 한다.
- 다른 구현자나 에이전트가 추가 의사결정을 하지 않아도 착수 가능해야 한다.
- 레거시 Yona의 의도와 현재 저장소의 현실을 동시에 반영해야 한다.

이 문서는 마케팅 문서가 아니며, 가벼운 아이디어 메모도 아니다. 아래 항목의 기준 문서다.

- 제품 범위
- 아키텍처 결정
- 패키지 경계
- 인증과 권한 소유권
- DB 전략
- VCS 연동
- 마이그레이션 전략
- 테스트와 완료 기준

## 1.5 변환 원칙

이 프로젝트는 기술적 혁신 프로젝트가 아니라 **기능 동등성(Functional Parity) 변환 프로젝트**다. `AGENTS.md`의 변환 원칙이 이 문서의 모든 섹션에 우선한다.

- 레거시 Yona가 제공하는 **동일한 기능**을 동일한 UX로 구현한다.
- 1:1 기술적 대응이 아닌, 사용자 관점에서 **동일한 기능과 경험**을 제공하는 것이 목표다.
- 새로운 아키텍처 패턴, 구조, 추상화를 제안하지 않는다. 변환 완료 이후에만 개선을 검토한다.
- UI 화면, 기능, 레이블, 동선은 `yona-original`을 기준으로 구현한다.
- "최소 구조"의 범위는 이 문서 Section 3의 고정 결정에 명시된 구조로 한정한다.

## 2. 요약

Yona는 `Go + React + TanStack Router + TanStack Query` 기반의 단일 배포 단위 애플리케이션으로 재구축한다. canonical app model은 다음과 같다.

- frontend baseline은 `React + TanStack Router + TanStack Query` SPA
- frontend build output은 Go binary에 static embed 하거나 동일한 배포 단위에서 함께 제공
- app-facing read/mutation의 canonical backend boundary는 Go HTTP/RPC endpoint
- 현재 TS `tRPC` procedure 이름과 input/output shape는 migration input으로 사용
- 가능한 경우 frontend call site 보존을 위해 tRPC-compatible Go adapter를 우선 검토
- 외부 소비자 또는 프로토콜 endpoint는 Go HTTP routes
- user-uploaded asset은 prebundled static asset이 아니라 Yona-controlled asset route로 제공
- 인증, 권한, ACL, 감사 로그, 핵심 도메인 규칙은 Yona가 직접 소유
- `PostgreSQL`, `MySQL/MariaDB`, `SQLite` 동시 지원
- Git backend는 시스템 `git` executable
- SVN backend는 시스템 `svn` executable
- plugin surface는 user-authored runtime code가 아니라 out-of-process integration model
- built-in integration provider baseline은 generic webhook, Slack, Google Chat
- LLM optimization은 부록이 아니라 1급 기능

현재 저장소는 유용한 기반 자산을 가지고 있지만, 아직 목표 아키텍처와 일치하지 않는다. 현재 중심 축은 다음과 같다.

- `SvelteKit`
- `Hono`
- `Bun.SQL + Drizzle`
- in-memory session store
- git executable backend

재개발은 레거시 Yona의 행위 의미를 보존하면서도, Go backend + React SPA architecture로 재정렬되어야 한다. 현재 `apps/app`과 `packages/*`의 TS backend logic은 target baseline이 아니라 migration source material이다.

중요:

- 이 문서의 Section 3, Section 5, Section 7이 현재 canonical target architecture다.
- 이 문서 아래쪽에 남아 있는 `TanStack Start`, `tRPC`, `serverFunction`, `Better Auth`, `Bun.SQL`, TS backend package ownership 관련 세부 문구는 현재 PoC에서 추출한 migration source material일 수 있다.
- 아래 세부 섹션이 Section 3, Section 5, Section 7과 충돌하면 Section 3, Section 5, Section 7이 우선한다.

## 3. 고정 결정

### 3.1 제품과 범위

- 목표: 레거시 Yona의 기능을 동일한 UX로 변환 구현한다. 새로운 구조 제안이 아닌 기능 동등성이 유일한 목표다.
- 범위 bar: issue tracker 축소판이 아니라 legacy Yona parity를 기준으로 한다.
- 변환 완료 전에는 아키텍처 개선, 새로운 패턴 도입, 레거시에 없는 기능 추가를 금지한다.
- 변환 완료 기준은 Section 19 Definition of Done을 따른다.
- 전달 방식: foundation 제약이 강한 vertical slice 방식으로 진행한다.
- 런타임: Go backend + React SPA
- 배포: OS별 단일 실행 파일(SFX), Docker, Kubernetes를 모두 지원한다.

### 3.2 프런트엔드와 풀스택 프레임워크

- 최종 UI 기준선: `React` SPA
- UI 라이브러리: `React`
- 데이터 캐시/로딩 기준선: `TanStack Query`
- 라우팅 기준선: `TanStack Router`
- 번들링/개발 서버 기준선: `Vite`
- 스타일링 기준선: `Tailwind CSS`
- 공통 UI는 `packages/ui`에서 제공한다.
- `apps/app`에서 이미 구현된 frontend screen은 `yona-original`의 layout과 information architecture를 기본값으로 보존해야 하며, 의도적 차이가 있으면 deviation을 명시적으로 기록한다.
- screen-level UI copy와 label, CTA, section title도 가능하면 `yona-original` template/message wording을 그대로 사용한다. 새 문구를 임의로 재작성하지 않는다.
- legacy template HTML은 필요하면 React component로 직접 번역해도 되지만, 결과 ownership은 reusable shell/section/form/menu component 조합으로 남겨야 한다. template를 그대로 붙여넣는 1회성 JSX 덩어리를 장기 baseline으로 두지 않는다.
- branding delta는 logo, color palette, typography token, 동등한 design token 수준까지만 허용하며, major region 배치, menu 위치, primary action, permission-driven visibility를 임의로 바꾸면 안 된다.

### 3.3 백엔드 인터페이스 모델

- 내부 앱 action/backend boundary: Go HTTP/RPC endpoint
- 현재 TS `tRPC` procedure 경계는 migration source material이다.
- frontend call site 보존이 가능하면 tRPC-compatible Go adapter를 우선 검토한다.
- `github.com/befabri/trpcgo`는 compatibility spike 후보로 본다.
- `github.com/trpc-group/trpc-go`는 강한 Go RPC framework이지만 현재 TS `@trpc/client`의 drop-in replacement로 가정하지 않는다.
- 외부 HTTP/protocol endpoint: Go HTTP routes
- `Hono`와 `TanStack Start serverFunction`은 target architecture에서 제외한다.

### 3.4 인증과 세션

- 인증과 세션은 Yona가 직접 소유한다.
- `Better Auth`는 target architecture에서 제외한다.
- DB session persistence는 금지한다.
- 기본 session storage는 secure cookie 또는 in-memory다.
- 향후 Redis/Valkey secondary storage는 같은 추상화 뒤에 붙일 수 있다.
- ACL, resource permission, audit logging, admin flow는 Yona가 직접 소유한다.

### 3.5 VCS

- Git backend: system `git` executable
- SVN backend: system `svn` executable
- FFI 기반 Git/SVN 연동은 범위 밖이다.
- Go 구현도 `Gitea`/`Forgejo`와 같은 executable pattern을 따른다.
- `Masterminds/vcs`는 multi-VCS abstraction 참고 자료로 활용할 수 있지만, Yona의 timeout/env whitelist/audit 정책이 source of truth다.

### 3.6 데이터베이스

- 지원 엔진: PostgreSQL, MySQL/MariaDB, SQLite
- 런타임 DB access baseline: Go `database/sql` + `uptrace/bun`
- 모든 dialect 간 schema parity는 필수다.

### 3.7 File / Asset Delivery

- user-uploaded resource는 bundle/static 디렉터리에 포함하지 않는다.
- canonical delivery path는 Yona-controlled server route다.
- 실제 바이트는 Go HTTP handler 또는 storage adapter를 통해 스트리밍한다.
- phase 1 blob storage baseline은 local filesystem이며, 향후 object storage는 같은 추상화 뒤에 붙일 수 있다.
- asset ACL, cache header, content disposition은 Yona가 직접 통제한다.

### 3.8 Integration / Plugin Model

- arbitrary user code plugin runtime은 제공하지 않는다.
- canonical extension model은 out-of-process integration이다.
- integration은 outbound event delivery, inbound callback, optional OAuth credential, config schema를 조합한 provider로 정의한다.
- 내장 provider 기본선은 `GenericWebhook`, `Slack`, `GoogleChat`이다이다.
- provider 구현은 공통 interface를 따르되, 실제 전송은 provider SDK 또는 provider 공식 HTTP contract를 사용한다.

### 3.9 LLM/AI surface

- LLM optimization은 필수 요구사항이다.
- public/permission-filtered machine-readable surface를 제품에 내장해야 한다.
- `llms.txt`를 제공해야 한다.

### 3.10 Search parity interpretation

- 검색 parity는 API-level parity를 의미한다.
- 세 dialect에서 searchable field coverage, filter semantics, permission filtering, pagination contract는 같아야 한다.
- ranking, tokenizer, DB-native operator detail은 동일할 필요가 없다.

## 4. 소스 분석

## 4.1 레거시 Yona 인벤토리

[`yona-original`](/G:/programming/yona/yona-original)은 대규모 Play Framework 애플리케이션이며, 주요 bounded context는 아래와 같다.

- User/Auth
- Organization/Project
- Issue
- Board/Posting
- Attachment/Asset
- Repository Browser
- Pull Request/Review
- Search
- Notification/Mail/Integration
- Site Admin/Statistics
- Import/Export/Migration

[`conf/routes`](/G:/programming/yona/yona-original/conf/routes)에서 확인되는 핵심 surface는 다음과 같다.

- organization page 및 member flow
- user login, signup, logout, email management
- project CRUD, transfer, webhook, watcher, member
- issue, label, milestone, comment, vote
- 보드 posting과 comment
- 첨부파일 upload/download
- Git smart HTTP endpoint
- SVN endpoint
- pull request, fork, merge action, review
- global/org/project search
- site admin operation과 mass mail
- markdown rendering

분석한 주요 controller/model은 다음과 같다.

- [`IssueApp.java`](/G:/programming/yona/yona-original/app/controllers/IssueApp.java)
- [`ProjectApp.java`](/G:/programming/yona/yona-original/app/controllers/ProjectApp.java)
- [`PullRequestApp.java`](/G:/programming/yona/yona-original/app/controllers/PullRequestApp.java)
- [`AttachmentApp.java`](/G:/programming/yona/yona-original/app/controllers/AttachmentApp.java)
- [`UserApp.java`](/G:/programming/yona/yona-original/app/controllers/UserApp.java)
- [`OrganizationApp.java`](/G:/programming/yona/yona-original/app/controllers/OrganizationApp.java)
- [`SearchApp.java`](/G:/programming/yona/yona-original/app/controllers/SearchApp.java)
- [`Issue.java`](/G:/programming/yona/yona-original/app/models/Issue.java)
- [`Attachment.java`](/G:/programming/yona/yona-original/app/models/Attachment.java)
- [`Project.java`](/G:/programming/yona/yona-original/app/models/Project.java)
- [`PullRequest.java`](/G:/programming/yona/yona-original/app/models/PullRequest.java)
- [`User.java`](/G:/programming/yona/yona-original/app/models/User.java)
- [`Search.java`](/G:/programming/yona/yona-original/app/models/Search.java)
- [`Webhook.java`](/G:/programming/yona/yona-original/app/models/Webhook.java)
- [`WebhookThread.java`](/G:/programming/yona/yona-original/app/models/WebhookThread.java)

행위 기준으로 참고한 주요 test와 fixture는 다음과 같다.

- [`UserAppTest.java`](/G:/programming/yona/yona-original/test/controllers/UserAppTest.java)
- [`PasswordResetAppTest.java`](/G:/programming/yona/yona-original/test/controllers/PasswordResetAppTest.java)
- [`ProjectAppTest.java`](/G:/programming/yona/yona-original/test/controllers/ProjectAppTest.java)
- [`IssueAppTest.java`](/G:/programming/yona/yona-original/test/controllers/IssueAppTest.java)
- [`PullRequestAppTest.java`](/G:/programming/yona/yona-original/test/controllers/PullRequestAppTest.java)
- [`ImportAppTest.java`](/G:/programming/yona/yona-original/test/controllers/ImportAppTest.java)
- [`SiteAppTest.java`](/G:/programming/yona/yona-original/test/controllers/SiteAppTest.java)
- [`IssueTest.java`](/G:/programming/yona/yona-original/test/models/IssueTest.java)
- [`ProjectTest.java`](/G:/programming/yona/yona-original/test/models/ProjectTest.java)
- [`UserTest.java`](/G:/programming/yona/yona-original/test/models/UserTest.java)
- [`AttachmentTest.java`](/G:/programming/yona/yona-original/test/models/AttachmentTest.java)
- [`PullRequestTest.java`](/G:/programming/yona/yona-original/test/models/PullRequestTest.java)
- [`SearchTests.java`](/G:/programming/yona/yona-original/test/models/SearchTests.java)
- [`SearchResultTests.java`](/G:/programming/yona/yona-original/test/models/SearchResultTests.java)
- [`NotificationEventTest.java`](/G:/programming/yona/yona-original/test/models/NotificationEventTest.java)
- [`NotificationMailTest.java`](/G:/programming/yona/yona-original/test/models/NotificationMailTest.java)
- [`AccessControlTest.java`](/G:/programming/yona/yona-original/test/utils/AccessControlTest.java)
- [`GitRepositoryTest.java`](/G:/programming/yona/yona-original/test/playRepository/GitRepositoryTest.java)
- [`RepositoryServiceTest.java`](/G:/programming/yona/yona-original/test/playRepository/RepositoryServiceTest.java)
- [`conf/test-data.yml`](/G:/programming/yona/yona-original/conf/test-data.yml)

legacy suite 활용 기준:

- controller test는 route behavior, redirect/error outcome, permission 결과의 source of truth다.
- model test는 domain invariant, lifecycle, aggregation rule의 source of truth다.
- utility/access-control test는 ACL matrix와 resource creatable/read/update/delete 의미의 source of truth다.
- `playRepository` test는 Git/SVN protocol, repository mutation side effect, repository fixture setup의 source of truth다.
- `conf/test-data.yml`은 seed scenario와 fixture naming의 source of truth다.

## 4.2 반드시 보존해야 하는 레거시 의도

재개발은 다음 행위 의미를 보존해야 한다.

- page 단위가 아니라 resource-scoped permission
- public/protected/private project visibility
- organization/project membership와 role 의미
- organization/project self-enrollment request와 cancel semantics
- personal workspace의 favorite, recent visitation, sidebar/notification feed, default landing page, user preference 의미
- issue watcher, voter, assignee, sharer, label, milestone, event timeline
- temporary upload -> resource binding lifecycle와 attachment ACL
- avatar/logo/attachment를 같은 resource-oriented file model로 다루는 의도
- project home dashboard/history/statistics aggregation surface
- 커밋 댓글와 generic comment thread open/close lifecycle
- PR 상태 머신과 reviewer/merge/conflict 규칙
- 현재 사용자가 읽을 수 있는 범위만 검색 결과에 노출하는 규칙
- Git smart HTTP와 repository-level permission check
- mailbox 기반 issue/comment/review 생성과 Message-ID/References 기반 reply threading
- provider-specific webhook/message delivery와 retry 의미
- issue tracker에 국한되지 않는 풍부한 project surface

구현 방법은 달라져도 되지만, 사용자 관점의 의미는 달라지면 안 된다.

## 4.3 현재 저장소 인벤토리

현재 저장소는 target product architecture가 아니라 early-stage TypeScript foundation이다.

주요 경로:

- [`apps/app`](/G:/programming/yona/apps/app)
- [`packages/auth`](/G:/programming/yona/packages/auth)
- [`packages/db`](/G:/programming/yona/packages/db)
- [`packages/domain`](/G:/programming/yona/packages/domain)
- [`packages/integrations`](/G:/programming/yona/packages/integrations)
- [`packages/vcs`](/G:/programming/yona/packages/vcs)
- [`drizzle`](/G:/programming/yona/drizzle)

현재 이미 구현된 영역:

- React/TanStack 기반 화면과 route composition
- app-facing `tRPC` surface
- request-scoped auth/session helper
- in-memory session store
- git executable backend
- smart HTTP handling
- multi-dialect Drizzle schema와 migration test

주요 현재 구현 참조:

- [`apps/app/src/lib/auth-trpc.ts`](/G:/programming/yona/apps/app/src/lib/auth-trpc.ts)
- [`apps/app/src/lib/project-trpc.ts`](/G:/programming/yona/apps/app/src/lib/project-trpc.ts)
- [`apps/app/src/lib/issue-trpc.ts`](/G:/programming/yona/apps/app/src/lib/issue-trpc.ts)
- [`apps/app/src/lib/pull-request-trpc.ts`](/G:/programming/yona/apps/app/src/lib/pull-request-trpc.ts)
- [`apps/app/src/lib/repo-trpc.ts`](/G:/programming/yona/apps/app/src/lib/repo-trpc.ts)
- [`packages/infra/src/git/executable.ts`](/G:/programming/yona/packages/infra/src/git/executable.ts)
- [`packages/db/src/repository-access.ts`](/G:/programming/yona/packages/db/src/repository-access.ts)

## 4.4 재사용과 전환 매트릭스

| Current asset                  | Decision                 | Notes                                                                                    |
| ------------------------------ | ------------------------ | ---------------------------------------------------------------------------------------- |
| current React screen semantics | Reuse                    | layout, UI copy, query usage, route composition은 재사용 가치가 크다                     |
| current TS `tRPC` surface      | Reuse as migration input | procedure naming, input/output shape, auth/error mapping을 Go translation input으로 사용 |
| `packages/infra` git backend   | Strong reuse target      | Go executable pattern으로 재표현할 때 가장 강한 source material                          |
| in-memory session store        | Partial reuse            | secure cookie/in-memory session ownership 설계의 참고 자료                               |
| Drizzle schema/migration       | Reuse with rewrite       | schema intent와 dialect test는 재사용, query/runtime은 Go로 재작성                       |

## 5. 목표 모노레포 구조

```text
apps/
  app/                  # React SPA frontend
  migrator-h2/          # H2 -> SQLite migration CLI

cmd/
  yona/                 # Go server entrypoint

internal/
  auth/                 # auth/session, OAuth, password reset, root-admin bootstrap
  db/                   # schema, migration, query layer, dialect abstraction
  domain/               # domain service, use case, ACL, invariant
  httpapi/              # app-facing HTTP/RPC handlers, protocol routes, asset routes
  integrations/         # integration provider contract, adapter, delivery runtime
  search/               # bounded search logic
  vcs/                  # Git/SVN executable adapter와 protocol support

packages/
  contracts/            # generated/frontend-consumed contract helpers
  i18n/                 # Message catalog, translation key, public text resource
  ui/                   # Shared React UI
```

현재 TS backend package는 target ownership이 아니라 migration source material이다.

## 6. Import / Boundary Convention

고정 규칙:

- frontend package import는 `@yona/*`, `@app/*`를 계속 사용한다.
- client code가 Go-only backend implementation을 직접 알면 안 된다.
- frontend는 generated contract/client 계층만 통해 backend를 호출한다.
- 깊은 상대경로(`../../../`) 금지

## 7. 아키텍처 개요

## 7.1 애플리케이션 모델

canonical app은 다음 요소를 가진 단일 Go deployable이다.

- static embed 가능한 React frontend build output
- app-facing HTTP/RPC handler
- public/protocol-oriented Go HTTP route
- asset/VCS/integration/AI endpoint
- auth/session, domain, DB, VCS, integration ownership을 가진 Go internal package

이 구조의 의미는 다음과 같다.

- frontend와 backend는 경계상 분리되지만, 최종 배포는 하나의 artifact로 묶을 수 있다.
- frontend build와 backend runtime을 독립적으로 진화시킬 수 있다.
- on-prem SFX와 Docker/Kubernetes 운영을 동시에 만족시킬 수 있다.

## 7.2 Frontend / Backend Boundary

canonical rule:

- frontend read/mutation은 Go HTTP/RPC endpoint를 canonical entry로 사용한다.
- current TS `tRPC` procedure 이름과 input/output shape는 migration input이다.
- frontend call site를 덜 흔들 수 있으면 tRPC-compatible Go adapter를 우선 검토한다.
- `github.com/befabri/trpcgo`는 호환성 spike 후보로 본다.
- `github.com/trpc-group/trpc-go`는 별도 Go RPC framework로 본다.

## 7.3 Go HTTP Route가 필수인 이유

다음 endpoint는 app-facing RPC와 별도 HTTP route로 모델링해야 한다.

- Git smart HTTP
- SVN route
- webhook ingress
- OAuth 제공자 callback
- file download / raw content route
- asset inline preview / download
- integration provider inbound callback
- migration report export
- `llms.txt`
- AI datasource endpoint

## 7.4 Frontend Query 통합 규칙

- frontend data authority는 TanStack Query다.
- route loader와 component는 backend implementation이 아니라 generated contract/client만 호출한다.
- current query key와 invalidation semantics는 가능한 한 보존한다.
- backend transport가 바뀌어도 화면 구조와 UX intent는 유지한다.

## 7.5 배포 모델

- frontend dist는 Go binary에 embed 하거나 동일 배포 단위에서 함께 제공한다.
- on-prem 설치는 OS별 단일 실행 파일을 우선한다.
- main site는 Docker/Kubernetes 운영을 우선한다.

## 8. 인증과 권한

## 8.1 Auth ownership model

인증과 권한은 Yona가 직접 소유한다.

Yona가 직접 맡는 것:

- canonical user model
- credential / linked-account model
- cookie/session ownership
- site/org/project/resource ACL
- audit 로그
- admin password reset policy
- project membership와 role semantics
- 모든 domain action의 permission check

## 8.2 Transition note

- 현재 문서의 이후 feature-specific 세부 섹션에 남아 있는 `TanStack Start`, `tRPC`, `serverFunction`, `Better Auth`, TS backend package ownership 관련 문구는 target baseline이 아니라 migration source material일 수 있다.
- feature semantics는 유지하되, transport/ownership/runtime은 Go 기준으로 재해석한다.

## 8.3 Session 전략

Session 정책은 고정이다.

- DB session table 금지
- client-side localStorage token 모델 금지
- secure cookie transport 사용
- backing store는 기본 in-memory

이 정책의 결과:

- process restart 시 active session이 사라진다.
- horizontal scaling은 future secondary storage 없이는 제한된다.
- 이 제약은 ops 문서와 admin 문서에 명시해야 한다.

session 요구사항:

- privilege-sensitive transition 시 session rotation
- password change 또는 admin reset 시 session invalidation
- session 또는 anonymous flow에 묶인 CSRF token
- production에서 `HttpOnly`, `SameSite=Lax`, `Secure`

## 8.4 Route protection

보호된 UI route는 frontend route guard와 backend auth middleware의 조합으로 보호한다.

역할 분리 원칙:

- session 조회, redirect, cookie/session rotation, transport-level response shape는 frontend guard와 Go HTTP route가 담당한다.
- resource/action 권한 판단은 Go domain/service와 route middleware가 담당한다.
- coarse authn gate를 frontend에 둘 수는 있지만, feature-specific ACL source of truth를 frontend에 두지 않는다.

canonical route group:

- public route
- authenticated route
- admin route
- organization manager route
- project manager route

예시:

- `/settings`
- `/admin`
- `/orgs/$orgSlug/settings`
- `/projects/$owner/$projectSlug/settings`

## 8.5 v1에 반드시 포함될 auth 기능

- email/password sign-up, login
- GitHub OAuth
- Google OAuth
- logout
- session inspection endpoint
- 관리자 랜덤 비밀번호 재설정 + self-serve 이메일 기반 비밀번호 재설정
- email/provider identity 기반 account linking
- auth action audit trail
- forgot-password는 계정 존재 여부와 메일 전송 실패 여부를 브라우저에 구분해서 노출하지 않는다.

## 8.6 초기 delivery에서 제외할 항목

- SAML
- SCIM
- passkey
- GitHub/Google 외 social provider 확장

이 항목들은 후속 확장 가능하지만, parity work를 밀어낼 수는 없다.

## 9. 권한 모델

Yona는 route flag 수준의 권한이 아니라 resource-oriented authorization을 사용한다.

permission scope:

- site
- organization
- project
- resource

primary resource type:

- user
- organization
- project
- issue
- issue comment
- posting
- posting comment
- PR
- review comment
- repository file or branch action
- integration endpoint
- 마일스톤

canonical role:

- anonymous
- authenticated user
- site admin
- org admin
- org member
- project manager
- project member
- 기능별로 유지되는 guest/restricted participant

ACL rule은 UI component가 아니라 domain service에서 평가해야 한다.

## 10. 데이터와 persistence 전략

## 10.1 지원 DB 엔진

- PostgreSQL
- MySQL/MariaDB
- SQLite

이 지원은 optional이 아니다. spec은 세 dialect 모두에서 parity를 요구한다.

## 10.2 Schema parity bar

schema parity의 의미:

- logical table coverage가 동일해야 한다.
- column meaning이 동일해야 한다.
- nullability가 일치해야 한다.
- index와 uniqueness intent가 일치해야 한다.
- foreign key semantics가 일치해야 한다.
- TypeScript boundary에서 timestamp behavior가 일치해야 한다.

현재 저장소에는 이미 다음 schema가 있다.

- [`drizzle/mysql/schema.ts`](/G:/programming/yona/drizzle/mysql/schema.ts)
- [`drizzle/pg/schema.ts`](/G:/programming/yona/drizzle/pg/schema.ts)
- [`drizzle/sqlite/schema.ts`](/G:/programming/yona/drizzle/sqlite/schema.ts)

## 10.3 Package ownership

`packages/db`가 소유할 것:

- Drizzle schema module
- dialect별 migration
- shared query fragment
- migration runtime utility
- dialect resolution
- schema parity test

app은 DB schema definition을 직접 소유하지 않는다.

## 10.4 Migration runtime

migration 실행 순서:

1. environment와 connection string으로 DB dialect 감지
2. dialect별 migration folder 결정
3. 필요 시 dry-run 또는 plan 출력
4. migration lock 획득
5. migration 실행
6. migration report 출력

locking 전략:

- PostgreSQL: advisory lock 또는 lock table
- MySQL: named lock 또는 lock table
- SQLite: file-level process lock + migration metadata lock

## 10.5 User-uploaded file and asset storage

Yona는 prebuilt static asset과 user-uploaded asset을 명확히 구분한다.

- `apps/app` 또는 배포 artifact에 bundle되는 파일은 build-time static asset이다.
- issue/post/comment/review attachment, avatar, project/org logo는 user-uploaded asset이다.
- user-uploaded asset은 static directory에 두지 않는다.
- canonical blob storage baseline은 local filesystem이다.
- 향후 S3-compatible object storage를 붙일 수 있지만, public contract는 바꾸지 않는다.

## 10.6 Attachment metadata ownership

`packages/db`와 `packages/domain`은 file metadata와 lifecycle을 공동으로 소유한다.

- DB가 소유하는 것:
  - `Attachment`
  - `UploadSession`
  - `BlobRef`
  - `AssetBinding`
  - 필요 시 `AssetVariant`
- domain이 소유하는 것:
  - temporary upload visibility
  - resource binding rule
  - inline/download 정책
  - avatar/logo MIME 및 size 정책

canonical rule:

- blob path는 opaque identifier 또는 content hash 기반이어야 한다.
- asset ACL은 attachment 자체가 아니라 binding된 resource permission을 따른다.
- temporary upload는 uploader 본인만 읽을 수 있다.

## 10.7 Delivery and caching policy

canonical delivery policy는 Yona Gateway다.

- asset metadata 조회와 ACL 판정은 항상 Yona가 수행한다.
- 실제 파일 바이트는 Bun route handler가 `Bun.file()` 또는 storage adapter stream으로 응답한다.
- direct storage path는 public contract가 아니다.
- asset delivery route는 inline preview와 download를 분리한다.
- cache validator는 content hash 또는 immutable ETag를 사용한다.
- permission-sensitive response는 private cache policy를 사용한다.

필수 route baseline:

- `GET /api/assets/:assetId`
- `GET /api/assets/:assetId/download`

## 10.8 Full-text search baseline

검색 baseline은 DB-native FTS다.

- PostgreSQL: `tsvector` + GIN
- MySQL/MariaDB: FULLTEXT
- SQLite: FTS5 + trigger sync

이 항목의 parity 기준은 API-level parity다.

- searchable field coverage는 같아야 한다.
- permission filtering과 scope filtering은 같아야 한다.
- filter semantics와 pagination contract는 같아야 한다.
- ranking, tokenizer, SQL operator detail은 dialect별 차이를 허용한다.

DB-native FTS가 제품 요구를 충족하지 못할 때만 dedicated search infrastructure를 검토한다.

## 10.9 Auth table 전략

auth-related data model이 지원해야 하는 것:

- canonical user 1명
- 하나 이상의 credential
- 하나 이상의 linked provider identity
- password reset material
- 필요한 경우 verification token

우선 방향:

- `n4user`, `user_credential`, `linked_account` 유지
- Go auth/session implementation이 이 table과 자연스럽게 맞도록 유지

이 방식이 지나치게 억지스러우면 adapter-specific auth table을 추가하되, domain user identity의 중심은 계속 `n4user`다.

## 11. VCS와 repository 전략

## 11.1 Git

Git은 반드시 system executable 기반으로 구현한다.

구현 방향:

- Go에서도 `Gitea`/`Forgejo`처럼 executable pattern을 유지한다.
- Git library/FFI를 canonical baseline으로 두지 않는다.
- `Masterminds/vcs`는 multi-VCS wrapper 참고 자료로만 사용한다.

허용 git operation 예시:

- `init --bare`
- `fetch`
- `log`
- `show`
- `diff`
- `rev-parse`
- `branch`
- `cat-file`
- 인라인 편집와 merge simulation에 필요한 plumbing command
- `git http-backend` 기반 smart HTTP

모든 subprocess 실행은 다음을 만족해야 한다.

- argv array만 사용
- shell string 실행 금지
- timeout 적용
- output size limit 적용
- environment variable whitelist 적용
- error normalization 적용
- write/conflict action audit log 기록

## 11.2 SVN

SVN은 system `svn` executable 기반으로 유지한다.

구현 방향:

- Git과 동일한 subprocess safety 원칙을 적용한다.
- 가능한 경우 Git과 공통 timeout/env whitelist/error normalization 레이어를 공유한다.
- `Masterminds/vcs`는 SVN abstraction 참고 자료로만 사용한다.

허용 SVN operation 예시:

- `info`
- `log`
- `diff`
- `list`
- `cat`

SVN parity는 Git보다 늦어질 수 있지만, scope에서 제거하지 않는다.

## 11.3 Repository HTTP surface

필수 server route:

- `POST /api/repos/:repoId/bootstrap`
- `GET /api/repos/:repoId/files`
- `POST /api/repos/:repoId/inline-edit`
- `GET /api/repos/:repoId/smart-http/*`
- `POST /api/repos/:repoId/smart-http/*`

후속으로 필요한 route 후보:

- 브랜치 list / branch delete
- commit view
- 비교 view
- raw file / image
- history listing

## 12. LLM optimization과 AI datasource 전략

## 12.1 왜 이것이 본문 범위인가

Yona는 issue tracker이자 project collaboration system이다. machine-readable structure를 제품에 내장하면 다음 역할을 수행할 수 있다.

- AI agent datasource
- project automation용 retrieval surface
- internal tooling용 knowledge source

즉, 이것은 문서화 옵션이 아니라 제품 기능이다.

## 12.2 필수 LLMO surface

제품은 다음을 제공해야 한다.

- `/llms.txt`
- AI-friendly public project summary
- AI-friendly issue, PR, milestone summary
- 허용된 scope에 대한 machine-readable JSON endpoint
- 필요한 위치의 JSON-LD structured metadata

## 12.3 AI surface의 permission 모델

LLM-facing endpoint도 human-facing product와 동일한 read permission을 따라야 한다.

public surface에 노출 가능한 것:

- public project metadata
- public issue
- public PR
- public docs와 board post

restricted AI surface는 authenticated, permission-aware access를 사용해야 하며 ACL을 우회하면 안 된다.

## 12.4 AI 관련 제품 deliverable

phase deliverable 예시:

- `llms.txt`
- project context bundle endpoint
- issue list/detail machine-readable endpoint
- PR detail machine-readable endpoint
- agent용 permission-safe query endpoint

## 13. 기능별 구현 섹션

아래 각 섹션은 그대로 세부 구현 plan으로 사용할 수 있어야 한다. 각 섹션은 목표, 레거시 의도, architecture, route, persistence, migration, test, done criteria를 포함한다.

## 13.1 사용자 / 인증 / 세션 / 신원 / 개인 작업공간

### 목표

레거시 인증 흐름과 사용자별 작업공간 surface를 Go backend + React frontend 기준으로 재구성하되, Yona 고유 의미와 세션 제약을 유지한다.

### 레거시 의도

- 로컬 로그인, 가입
- OAuth 제공자
- remember-me 성격의 지속 로그인
- 계정 연결
- 이메일 관리
- 사용자 프로필 / 알림 설정
- 즐겨찾기 프로젝트 / 조직 / 이슈
- 최근 방문과 개인 활동 보기
- 사이드바 / 알림 피드
- 사용자 API 토큰
- 기본 랜딩 페이지
- 관리자 랜덤 비밀번호 재설정 + self-serve 이메일 기반 비밀번호 재설정

### 주요 레거시 근거

- [`UserAppTest.java`](/G:/programming/yona/yona-original/test/controllers/UserAppTest.java)
- [`PasswordResetAppTest.java`](/G:/programming/yona/yona-original/test/controllers/PasswordResetAppTest.java)
- [`UserApiGetIssuesByUserTest.java`](/G:/programming/yona/yona-original/test/controllers/api/UserApiGetIssuesByUserTest.java)
- [`RecentlyVisitedProjectsTest.java`](/G:/programming/yona/yona-original/test/models/RecentlyVisitedProjectsTest.java)
- [`UserTest.java`](/G:/programming/yona/yona-original/test/models/UserTest.java)
- [`PasswordResetTest.java`](/G:/programming/yona/yona-original/test/models/PasswordResetTest.java)
- [`Application.java`](/G:/programming/yona/yona-original/app/controllers/Application.java)
- [`UserApp.java`](/G:/programming/yona/yona-original/app/controllers/UserApp.java)

### 목표 구현

- 공개 인증 페이지 route group
- 인증된 개인 작업공간 route group:
  - `/me`
  - `/me/settings`
  - `/users/$loginId`
- authenticated area는 frontend route guard와 backend auth middleware로 보호
- `internal/auth`에 Yona-owned auth/session 구현
- secure cookie 또는 in-memory 기반 세션 abstraction 사용
- 로그인, 가입, 로그아웃, 현재 세션, 로컬 자격 증명 변경은 Go handler/API contract로 구성
- 추가 이메일, 즐겨찾기/최근 방문, 알림 설정, API 토큰, 기본 랜딩 페이지 변경은 Go handler/API contract로 구성
- OAuth callback 등 명시적 HTTP endpoint는 Go route
- 사이드바/알림 피드/사용자 대시보드 읽기 모델은 frontend query + Go API로 구성

### 공개 surface

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/me`
- `/me/settings`
- `/users/$loginId`
- `/api/auth/session`
- `/api/auth/provider/:provider/callback`
- `/api/me/sidebar`
- `/api/me/notifications`
- `/api/me/favorites`
- `/api/me/recent`
- `/api/me/token`

### 보안 규칙

- self-serve password reset 링크는 trusted public origin 환경 변수에서만 생성한다.
- request host, `X-Forwarded-*`, `Origin` header는 reset 링크 생성에 사용하지 않는다.

### 도메인 모델

- `User`
- `UserCredential`
- `LinkedAccount`
- `SessionProjection`
- `UserSetting`
- `FavoriteProject`
- `FavoriteOrganization`
- `FavoriteIssue`
- `RecentProjectVisitation`
- `RecentPostingOrIssueVisit`
- `UserNotificationPreference`
- `UserApiToken`
- `AuthAuditRecord`

### 특수 규칙

- API token은 external API access용 credential이지 browser session persistence가 아니다.
- 즐겨찾기와 최근 방문은 개인화 읽기 모델이며 ACL을 우회하는 shortcut가 아니다.
- 기본 랜딩 페이지는 현재 사용자가 읽을 수 있는 route만 가리킬 수 있다.

### 테스트

- 구현 전 위 legacy source에서 auth/workspace outcome과 edge case를 추출한 failing Red test를 먼저 작성한다.
- 유효/무효 로그인
- 가입 충돌
- 공유 이메일 기반 계정 연결
- 세션 만료
- remember-me 복원과 명시적 로그아웃
- 추가 이메일 추가/확인/대표 설정/삭제
- 즐겨찾기 토글과 최근 방문 정렬
- 알림 설정과 기본 랜딩 페이지 갱신
- 사용자 API 토큰 rotation
- 관리자 비밀번호 재설정 후 세션 무효화
- CSRF validation
- route 보호 리다이렉트 동작

### 완료 기준

- 모든 인증/작업공간 흐름이 unit/route test로 커버된다.
- Better Auth와 Yona custom ownership boundary가 명확하다.
- DB session persistence가 없다.
- 개인 작업공간 capability가 인증 부속 기능으로 암묵 처리되지 않는다.
- 각 인증/작업공간 capability가 legacy provenance, failing Red test, Green 구현 trace를 가진다.

## 13.2 조직 / 프로젝트 / 멤버십 / 가입 요청 / 역할

### 목표

레거시 소유권, 멤버십, 가입 요청, 프로젝트 공개 범위, 이관 동작을 유지한다.

### 레거시 의도

- organization은 그룹 컨테이너
- 사용자의 직접 소유 프로젝트 허용
- 프로젝트는 public/protected/private 공개 범위를 가진다
- 조직/프로젝트 self-enroll과 취소 flow
- 프로젝트 이관은 명시적이고 audit 가능해야 함
- 프로젝트 메뉴 기능은 설정 가능해야 함
- 프로젝트 홈 readme/dashboard/history/statistics surface 유지

### 주요 레거시 근거

- [`OrganizationTest.java`](/G:/programming/yona/yona-original/test/models/OrganizationTest.java)
- [`OrganizationUserTest.java`](/G:/programming/yona/yona-original/test/models/OrganizationUserTest.java)
- [`ProjectAppTest.java`](/G:/programming/yona/yona-original/test/controllers/ProjectAppTest.java)
- [`ProjectTest.java`](/G:/programming/yona/yona-original/test/models/ProjectTest.java)
- [`ProjectUserTest.java`](/G:/programming/yona/yona-original/test/models/ProjectUserTest.java)
- [`EnrollProjectAppTest.java`](/G:/programming/yona/yona-original/test/controllers/EnrollProjectAppTest.java)
- [`RoleTest.java`](/G:/programming/yona/yona-original/test/models/RoleTest.java)

### 목표 구현

- route hierarchy:
  - `/orgs`
  - `/orgs/$orgSlug`
  - `/projects/$owner/$projectSlug`
- 프로젝트 홈/dashboard/history/statistics loader는 이 section이 소유
- CRUD, 가입 요청/취소, 멤버 변경, 이관 확인은 `tRPC` procedure + thin `serverFunction` adapter로 구성
- 명시적 HTTP interop가 필요한 곳만 server route

### 공개 surface

- `/orgs`
- `/orgs/$orgSlug`
- `/orgs/$orgSlug/enroll`
- `/orgs/$orgSlug/cancel/enroll`
- `/projects/$owner/$projectSlug`
- `/projects/$owner/$projectSlug/enroll`
- `/projects/$owner/$projectSlug/cancel/enroll`
- `/projects/$owner/$projectSlug/settings/members`

### 도메인 모델

- `Organization`
- `OrganizationMember`
- `OrganizationEnrollmentRequest`
- `Project`
- `ProjectMember`
- `ProjectEnrollmentRequest`
- `ProjectTransfer`
- `ProjectMenuSetting`
- `ProjectHistoryItem`

### 필수 규칙

- 공개 범위는 domain service와 search에서 동시에 강제
- self-enrollment request는 manager 주도 멤버 추가/삭제와 다른 생명주기를 가진다.
- enroll과 cancel은 member mutation에 흡수되지 않는 별도 공개 surface를 가진다.
- guest만 enroll/cancel을 호출할 수 있고, 이미 멤버인 사용자는 client error를 받는다.
- 존재하지 않는 organization/project에 대한 enroll/cancel 처리 결과는 legacy test에 맞추거나, 다르게 가져갈 경우 deviation을 문서화한다.
- 중복 가입/취소는 idempotent해야 하며 audit 가능해야 한다.
- enroll/cancel은 request state 변화에 맞는 notification event를 발생시킨다.
- organization enroll/cancel의 `202 + JSON statusMonitorUrl`과 project enroll/cancel의 `200 OK` 차이를 유지하거나, 단일 contract로 단순화할 경우 deviation을 문서화한다.
- 이관은 확인 workflow가 필요하다
- 관리자 없는 조직/프로젝트 상태를 허용하지 않는다
- 즐겨찾기와 최근 방문은 의미를 분리한다
- 프로젝트 홈/dashboard/history/statistics 집계도 같은 ACL을 따라야 한다.

### 테스트

- 구현 전 위 legacy source에서 visibility, membership, enrollment, transfer outcome을 분해한 failing Red test를 먼저 작성한다.
- 조직 생성/수정/삭제
- 조직/프로젝트 self-enroll과 취소
- guest-only enroll/cancel permission matrix
- 존재하지 않는 organization/project enroll/cancel 처리
- 중복 가입 요청 idempotency
- enroll/cancel notification event emission
- organization과 project의 enroll/cancel response contract 또는 문서화된 deviation
- 멤버 추가/삭제
- 탈퇴 edge case
- 프로젝트 생성/이관
- 프로젝트 홈/dashboard/statistics 공개 범위
- public/protected/private 공개 범위 매트릭스

### 완료 기준

- route tree와 domain service가 레거시 생명주기 동작과 가입 요청 흐름을 모두 커버한다.
- 프로젝트 홈/dashboard/history surface가 이 section의 명시적 owner를 가진다.
- 공개 범위, 역할, 가입 요청 규칙이 레거시 의미와 일치한다.
- enroll/cancel이 멤버 CRUD에 암묵적으로 흡수되지 않고 별도 capability로 검증된다.
- organization/project enroll 응답 계약 차이를 유지하거나, deviation이 spec과 test에 명시된다.
- org/project capability가 legacy provenance와 Red-Green trace 없이 완료로 인정되지 않는다.

## 13.3 Issue

### 목표

state, participant, metadata, event를 포함한 full parity issue tracking domain을 재구성한다.

### 레거시 의도

- CRUD
- assignee
- 마일스톤
- 라벨
- sharer
- voter
- watcher
- parent/subtask
- timeline
- draft
- mass update

### 주요 레거시 근거

- [`IssueAppTest.java`](/G:/programming/yona/yona-original/test/controllers/IssueAppTest.java)
- [`IssueTest.java`](/G:/programming/yona/yona-original/test/models/IssueTest.java)
- [`IssueApiGetIssueTest.java`](/G:/programming/yona/yona-original/test/controllers/api/IssueApiGetIssueTest.java)
- [`IssueApiUpdateIssueTest.java`](/G:/programming/yona/yona-original/test/controllers/api/IssueApiUpdateIssueTest.java)
- [`WatchTest.java`](/G:/programming/yona/yona-original/test/models/WatchTest.java)
- [`MilestoneTest.java`](/G:/programming/yona/yona-original/test/models/MilestoneTest.java)
- [`AccessControlTest.java`](/G:/programming/yona/yona-original/test/utils/AccessControlTest.java)

### 목표 구현

- route hierarchy:
  - `/projects/$owner/$projectSlug/issues`
  - `/projects/$owner/$projectSlug/issues/$issueNumber`
- list/detail은 loader + suspense pattern 적용
- create, edit, delete, comment, mass update, vote, watch, share는 `tRPC` procedure + thin `serverFunction` adapter로 구성

### 도메인 모델

- `Issue`
- `IssueComment`
- `IssueEvent`
- `IssueLabel`
- `IssueLabelCategory`
- `IssueShare`
- `IssueVote`
- `IssueWatcher`

### 특수 규칙

- exclusive label category rule 유지
- permission-aware watcher/sharer 필요
- detail page는 timeline과 secondary panel을 stream
- export contract는 human-readable과 machine-readable 모두 제공

### 테스트

- 구현 전 위 legacy source에서 permission matrix와 participant lifecycle을 추출한 failing Red test를 먼저 작성한다.
- 이슈 CRUD permission matrix
- watcher/voter/sharer behavior
- 마일스톤/label constraint
- parent-child relation
- mass update behavior
- search visibility

### 완료 기준

- legacy issue semantics가 domain rule과 route test로 번역된다.
- LLM용 machine-readable issue endpoint가 존재한다.
- issue 관련 change set은 대응 legacy source와 deviation 기록 없이는 완료로 인정하지 않는다.

## 13.4 Board / Discussion

### 목표

이슈가 아닌 discussion surface를 유지한다.

### 레거시 의도

- 보드 posting
- 댓글
- 라벨
- watch
- search participation

### 주요 레거시 근거

- [`PostingTest.java`](/G:/programming/yona/yona-original/test/models/PostingTest.java)
- [`CommentAppTest.java`](/G:/programming/yona/yona-original/test/controllers/CommentAppTest.java)
- [`CommentThreadTest.java`](/G:/programming/yona/yona-original/test/models/CommentThreadTest.java)
- [`WatchProjectAppTest.java`](/G:/programming/yona/yona-original/test/controllers/WatchProjectAppTest.java)

### 목표 구현

- project-level discussion route
- list/detail에 loader/query pattern 적용
- post/comment operation은 `tRPC` procedure + thin `serverFunction` adapter로 구성

### 도메인 모델

- `Posting`
- `PostingComment`
- `PostingLabel`
- `PostingWatcher`

### 테스트

- 구현 전 위 legacy source에서 posting/comment/watch intent를 추출한 failing Red test를 먼저 작성한다.
- posting CRUD
- 댓글 CRUD
- watch behavior
- search indexing/permission filtering

### 완료 기준

- 보드 기능이 암묵적으로 제거되거나 다른 기능으로 흡수되지 않는다.
- discussion capability가 legacy provenance와 Red-Green trace를 가진다.

## 13.5 Attachment / Asset

### 목표

attachment, avatar, logo, temporary upload lifecycle을 resource-oriented authorization과 함께 재구축한다.

### 레거시 의도

- temporary upload 후 target resource에 선택적으로 bind
- 첨부파일 browse/download
- image inline preview
- avatar와 logo를 attachment model 위에서 재사용
- 첨부파일 접근도 resource permission을 따라야 함

### 주요 레거시 근거

- [`AttachmentApp.java`](/G:/programming/yona/yona-original/app/controllers/AttachmentApp.java)
- [`AttachmentTest.java`](/G:/programming/yona/yona-original/test/models/AttachmentTest.java)
- [`AccessControlTest.java`](/G:/programming/yona/yona-original/test/utils/AccessControlTest.java)
- [`UserApp.java`](/G:/programming/yona/yona-original/app/controllers/UserApp.java)

### 목표 구현

- upload init/finalize/delete는 `tRPC` procedure + thin `serverFunction` adapter로 구성
- file byte delivery는 server route
- metadata는 DB가, blob storage는 adapter가 소유
- phase 1 blob store는 local filesystem
- issue/post/comment/review/user/org/project asset binding을 지원

### 공개 surface

- `POST /api/uploads`
- `POST /api/uploads/:uploadId/finalize`
- `DELETE /api/assets/:assetId`
- `GET /api/assets/:assetId`
- `GET /api/assets/:assetId/download`

### 도메인 모델

- `Attachment`
- `UploadSession`
- `BlobRef`
- `AssetBinding`
- `AssetAccessPolicy`

### 특수 규칙

- temporary upload는 uploader 본인만 읽을 수 있다.
- asset ACL은 binding된 resource permission을 따른다.
- avatar/logo는 MIME 및 size 제한을 가진다.
- storage path와 storage provider URL은 public contract가 아니다.
- inline preview와 forced download는 분리된 route/response policy를 가진다.

### 테스트

- 구현 전 위 legacy source에서 temporary upload, bind, ACL outcome을 추출한 failing Red test를 먼저 작성한다.
- temporary upload uploader-only access
- selected attachment만 target resource에 bind
- inline preview와 download response 분리
- avatar/logo validation
- missing blob 또는 stale binding handling
- private resource asset ACL

### 완료 기준

- prebundled static asset과 user-uploaded asset이 명확히 분리된다.
- 첨부파일 access가 ACL을 우회하지 않는다.
- legacy attachment lifecycle이 domain rule과 route test로 번역된다.
- asset flow가 legacy provenance와 Red-Green trace 없이 완료로 인정되지 않는다.

## 13.6 저장소 브라우저 / 코드 화면 / 커밋 토론

### 목표

저장소 탐색, raw 콘텐츠, 히스토리, 비교, 인라인 편집, 커밋 토론을 보안과 프로토콜 정확성을 갖춘 형태로 제공한다.

### 레거시 의도

- 코드 브라우저
- raw 파일/이미지 보기
- 커밋 히스토리
- 커밋 댓글
- 코드 토론 스레드 열기/닫기
- 브랜치
- 비교
- smart HTTP

### 주요 레거시 근거

- [`GitRepositoryTest.java`](/G:/programming/yona/yona-original/test/playRepository/GitRepositoryTest.java)
- [`RepositoryServiceTest.java`](/G:/programming/yona/yona-original/test/playRepository/RepositoryServiceTest.java)
- [`CommitTest.java`](/G:/programming/yona/yona-original/test/playRepository/CommitTest.java)
- [`CommitCommentTest.java`](/G:/programming/yona/yona-original/test/models/CommitCommentTest.java)
- [`CommentThreadTest.java`](/G:/programming/yona/yona-original/test/models/CommentThreadTest.java)
- [`CodeCommentThreadTest.java`](/G:/programming/yona/yona-original/test/models/CodeCommentThreadTest.java)

### 목표 구현

- 저장소 보기용 route tree
- smart HTTP와 raw 다운로드는 server route
- UI용 구조화된 저장소 읽기는 `tRPC` procedure + thin `serverFunction` adapter로 구성
- 커밋 댓글 create/delete와 code discussion thread open/close는 `tRPC` procedure + thin `serverFunction` adapter로 구성

### 도메인 모델

- `Repository`
- `RepositoryFileView`
- `CommitSummary`
- `BranchInfo`
- `InlineEditRequest`
- `CommitComment`
- `CodeCommentThread`
- `NonRangedCodeCommentThread`

### 소유 경계

- 커밋 단위 토론, 커밋 댓글, 비-PR 댓글 스레드 생명주기는 이 section이 소유한다.
- PR 리뷰어, 병합 규칙, PR 결합 리뷰 스레드 조합은 `13.7`이 소유한다.

### 보안 규칙

- 저장소 ID 검증
- 경로 순회 방지
- 브랜치 정책 강제
- base OID 기반 낙관적 동시성
- 댓글/스레드 ACL은 저장소/프로젝트 공개 범위와 리소스 작성 규칙을 동시에 따른다.

### 테스트

- 구현 전 위 legacy source에서 protocol semantics와 repository mutation outcome을 추출한 failing Red test를 먼저 작성한다.
- smart HTTP upload-pack
- smart HTTP receive-pack 인증
- 인라인 편집 stale base 충돌
- 경로 검증
- 보호 브랜치 매트릭스
- 커밋 댓글 create/delete
- 스레드 열기/닫기 권한 매트릭스
- 커밋 댓글 스레드와 PR 변경 스레드 구분

### 완료 기준

- 현재 git executable backend가 TanStack route/function 환경으로 완전히 이관된다.
- 셸 기반 unsafe execution이 없다.
- 커밋 토론 surface가 PR/리뷰 section에 암묵적으로 흡수되지 않는다.
- repository/code capability가 legacy provenance와 Red-Green trace를 가진다.

## 13.7 풀 리퀘스트 / 리뷰

### 목표

전체 PR 생명주기, 병합 검사, 리뷰 스레드, 리뷰어 규칙을 유지한다.

### 레거시 의도

- 포크/클론 workflow
- PR 상태 머신
- 병합 시도와 충돌 상태
- 리뷰어 수 임계값
- 라인 댓글 스레드
- 리뷰 목록/필터 surface
- 소스 브랜치 삭제/복구

### 주요 레거시 근거

- [`PullRequestAppTest.java`](/G:/programming/yona/yona-original/test/controllers/PullRequestAppTest.java)
- [`PullRequestTest.java`](/G:/programming/yona/yona-original/test/models/PullRequestTest.java)
- [`ReviewThreadAppTest.java`](/G:/programming/yona/yona-original/test/controllers/ReviewThreadAppTest.java)
- [`ReviewCommentTest.java`](/G:/programming/yona/yona-original/test/models/ReviewCommentTest.java)
- [`CodeCommentThreadTest.java`](/G:/programming/yona/yona-original/test/models/CodeCommentThreadTest.java)

### 목표 구현

- PR 목록/상세/변경사항/상태/리뷰 목록 endpoint
- 상세 페이지는 streaming SSR 우선
- 커밋/스레드/병합 상태/리뷰를 route + query composition으로 구성
- 닫기, 다시 열기, 병합, 리뷰, 댓글 스레드 상태 변경은 `tRPC` procedure + thin `serverFunction` adapter로 구성

### 도메인 모델

- `PullRequest`
- `PullRequestCommit`
- `PullRequestEvent`
- `ReviewComment`
- `CommentThread`
- `PullRequestReviewer`
- `ReviewThreadQuery`

### 경계 규칙

- 리뷰어 임계값, 병합 결정, 오래된 스레드 의미, 리뷰 목록/필터는 이 section이 소유한다.
- 커밋 단위 댓글/스레드 생성과 일반 스레드 생명주기는 `13.6`에서 소유하고, 이 section은 PR 화면에서 그 결과를 조합해 보여준다.

### 테스트

- 구현 전 위 legacy source에서 PR state transition과 reviewer rule outcome을 추출한 failing Red test를 먼저 작성한다.
- 닫기/다시 열기 권한 매트릭스
- 병합 충돌 감지
- 병합 수락 흐름
- 리뷰어 임계값 강제
- 리뷰 목록 공개 범위/필터 의미
- 오래된 스레드 의미

### 완료 기준

- 상태와 병합 의미가 domain rule과 test에 보존된다.
- 저장소 토론과 PR 리뷰 ownership 경계가 문서와 테스트에 드러난다.
- PR/review capability가 legacy provenance와 Red-Green trace를 가진다.

## 13.8 Search

### 목표

scoped, permission-aware, multi-type search를 제공한다.

### 레거시 의도

- global search
- organization search
- project search
- type별 result count
- type-specific filtering

### 주요 레거시 근거

- [`SearchTests.java`](/G:/programming/yona/yona-original/test/models/SearchTests.java)
- [`SearchResultTests.java`](/G:/programming/yona/yona-original/test/models/SearchResultTests.java)
- [`AccessControlTest.java`](/G:/programming/yona/yona-original/test/utils/AccessControlTest.java)
- [`SearchApp.java`](/G:/programming/yona/yona-original/app/controllers/SearchApp.java)

### 목표 구현

- query-driven search page
- internal search view는 `tRPC` procedure + thin `serverFunction` adapter로 구성
- machine 또는 AI consumer용 search endpoint는 필요 시 server route

### 검색 동등성 규칙

- searchable field coverage는 세 dialect에서 같아야 한다.
- permission filtering과 scope filtering은 세 dialect에서 같아야 한다.
- filter semantics와 pagination contract는 세 dialect에서 같아야 한다.
- ranking, tokenizer, DB-native operator detail은 dialect별 차이를 허용한다.

### 검색 대상 타입

- user
- project
- issue
- issue comment
- posting
- posting comment
- 마일스톤
- review comment

### 테스트

- 구현 전 위 legacy source에서 permission filtering과 scope semantics를 추출한 failing Red test를 먼저 작성한다.
- permission-filtered search
- scope filtering
- dialect별 field coverage / filter semantics parity
- AI-facing structured search surface

### 완료 기준

- search result가 scope와 permission을 정확하게 반영한다.
- search capability가 legacy provenance와 Red-Green trace를 가진다.

## 13.9 알림 / 메일 / 메일박스 / 연동 전송

### 목표

활동 fanout, 사용자 설정, 아웃바운드/인바운드 메일 동작, 연동 전송을 유지한다.

### 레거시 의도

- 인앱 알림
- 메일 알림
- IMAP polling/IDLE 기반 메일박스 수집
- 수신 메일로 이슈/댓글/리뷰 생성
- Message-ID/References와 structured reply-to 기반 답장 스레딩
- 범용 webhook 전송
- Slack / Google Chat 같은 메신저 webhook 전송
- 재시도 동작
- provider가 지원할 때 리소스 단위 스레드 연계를 유지

### 주요 레거시 근거

- [`NotificationEventTest.java`](/G:/programming/yona/yona-original/test/models/NotificationEventTest.java)
- [`NotificationMailTest.java`](/G:/programming/yona/yona-original/test/models/NotificationMailTest.java)
- [`CommitsNotificationActorTest.java`](/G:/programming/yona/yona-original/test/actors/CommitsNotificationActorTest.java)
- [`CreationViaEmailTest.java`](/G:/programming/yona/yona-original/test/mailbox/CreationViaEmailTest.java)
- [`EmailAddressWithDetailTest.java`](/G:/programming/yona/yona-original/test/mailbox/EmailAddressWithDetailTest.java)
- [`IMAPMessageUtilTest.java`](/G:/programming/yona/yona-original/test/mailbox/IMAPMessageUtilTest.java)
- [`Webhook.java`](/G:/programming/yona/yona-original/app/models/Webhook.java)
- [`WebhookThread.java`](/G:/programming/yona/yona-original/app/models/WebhookThread.java)
- [`CreationViaEmail.java`](/G:/programming/yona/yona-original/app/mailbox/CreationViaEmail.java)
- [`MailboxService.java`](/G:/programming/yona/yona-original/app/mailbox/MailboxService.java)

### 공개 surface

- `/projects/$owner/$projectSlug/settings/integrations`
- `/api/integrations/:provider/test`
- `/api/integrations/:provider/inbound/*`
- site-level mailbox configuration과 structured reply-to address contract

### 목표 구현

- request path에서 감당 가능한 비동기 I/O는 main event loop에서 처리
- polling/IDLE inbox, durable retry chain, CPU-bound transformation이 필요한 경우에만 별도 runtime 경로를 둔다
- 사용자 설정 모델
- canonical event envelope 생성 후 provider adapter가 payload를 변환
- 수신 메일 parser는 발신자 신원 해석, 중복 메시지 억제, 권한 인지 이슈/댓글/리뷰 생성, 원본 이메일 로깅을 수행한다
- 내장 provider 기본선은 `GenericWebhook`, `Slack`, `GoogleChat`이다
- provider 구현은 공통 interface를 따르되, 실제 전송은 provider SDK 또는 공식 HTTP contract를 사용한다
- 서명/secret 검증 + 재시도/backoff + idempotency

### 도메인 모델

- `NotificationEvent`
- `NotificationRecipient`
- `NotificationMail`
- `OriginalEmail`
- `InboundMailReceipt`
- `MailboxCursor`
- `IntegrationEndpoint`
- `IntegrationSubscription`
- `IntegrationDeliveryAttempt`
- `IntegrationThreadRef`

### 테스트

- 구현 전 위 legacy source에서 fanout, retry, provider payload intent를 추출한 failing Red test를 먼저 작성한다.
- 알림 이벤트 생성
- 댓글 이벤트 provider 변환
- 메일 fallback 동작
- 인바운드 이슈/댓글/리뷰 생성
- 중복 Message-ID 억제
- 답장 스레딩과 structured reply-to 파싱
- 발신자 권한 거부와 잘못된 수신자 처리
- 연동 재시도와 서명 검증
- 권한 인지 수신자 선택

### 완료 기준

- 이벤트 fanout이 deterministic하고 replay-safe하다.
- 아웃바운드 메일과 인바운드 메일박스 capability가 둘 다 legacy provenance와 Red-Green trace를 가진다.
- 범용 webhook과 메신저 provider가 같은 canonical event contract 위에 놓인다.
- 알림/integration capability가 legacy provenance와 Red-Green trace를 가진다.

## 13.10 사이트 관리 / 운영

### 목표

사이트 설정, 사용자 관리, audit, 진단, 관리자 공지를 위한 admin surface를 재구축한다.

### 필수 capability

- 사이트 설정
- 사이트 관리자의 사용자/프로젝트 조작
- 계정 잠금/상태 변경
- audit 로그
- feature flag
- 헬스/진단 endpoint
- 대량 메일 / 관리자 공지

### 주요 레거시 근거

- [SiteAppTest.java](/G:/programming/yona/yona-original/test/controllers/SiteAppTest.java)
- [RoleTest.java](/G:/programming/yona/yona-original/test/models/RoleTest.java)
- [UserTest.java](/G:/programming/yona/yona-original/test/models/UserTest.java)

### 테스트

- 구현 전 위 legacy source에서 admin-only outcome과 audit intent를 추출한 failing Red test를 먼저 작성한다.
- 관리자 전용 접근
- audit 기록 생성
- feature flag 동작
- 대량 메일 권한 게이팅
- 공지 전송 audit trail

### 완료 기준

- admin surface가 명시적 역할 게이팅과 audit 가능한 action을 가진다.
- 관리자 공지가 일반 알림 capability와 분리된 관리자 전용 동작으로 유지된다.
- admin capability가 legacy provenance와 Red-Green trace를 가진다.

## 13.11 가져오기 / 내보내기 / 마이그레이션

### 목표

기존 Yona deployment에서의 data export/import와 operational migration을 지원한다.

### 필수 흐름

- current Yona DB in-place transition
- H2 -> SQLite CLI
- verification report
- resumable checkpoint

### 주요 레거시 근거

- [`ImportAppTest.java`](/G:/programming/yona/yona-original/test/controllers/ImportAppTest.java)
- [`conf/test-data.yml`](/G:/programming/yona/yona-original/conf/test-data.yml)
- [`docs/ko/spec/export-and-import.md`](/G:/programming/yona/yona-original/docs/ko/spec/export-and-import.md)

### 테스트

- 구현 전 위 legacy source에서 migration safety와 verification report intent를 추출한 failing Red test를 먼저 작성한다.
- dry run output
- record count validation
- FK validation
- re-run safety

### 완료 기준

- 마이그레이션 도구이 repeatable report와 명확한 운영 가이드를 제공한다.
- migration capability가 legacy provenance와 Red-Green trace를 가진다.

## 14. Integration / Plugin Strategy

## 14.1 Non-goals

다음 항목은 canonical scope 밖이다.

- 사용자 작성 JavaScript/TypeScript code를 Bun runtime 안에서 실행하는 plugin
- npm package 업로드/설치형 plugin marketplace
- `eval` 또는 동적 module import에 의존하는 user extension

## 14.2 Canonical model

plugin이라는 용어는 제품 내부 arbitrary code execution이 아니라 integration model을 의미한다.

- integration은 out-of-process contract다.
- 설치 단위는 code artifact가 아니라 provider type + config다.
- scope는 site-level 또는 project-level 설정으로 관리한다.
- provider capability는 outbound event delivery, inbound callback, optional OAuth credential, health check로 구성된다.
- generic webhook은 integration provider의 한 종류이지 전체 모델의 이름이 아니다.

## 14.3 Interface shape

integration provider는 최소한 다음 interface를 만족해야 한다.

- `IntegrationProvider`
- `IntegrationConfigSchema`
- `IntegrationEventTransformer`
- `IntegrationDeliveryAdapter`
- `IntegrationInboundVerifier`
- `IntegrationHealthcheck`

canonical event flow:

1. domain event 생성
2. canonical integration event envelope 구성
3. subscription filter 적용
4. provider adapter가 provider payload로 변환
5. delivery runtime은 workload에 따라 inline async path 또는 별도 runtime 경로 중 하나를 선택해 전송/재시도/감사 기록을 처리

## 14.4 Initial built-in providers

초기 제공 provider:

- `GenericWebhook`
- `Slack`
- `GoogleChat`

provider-specific note:

- provider 구현은 공식 SDK가 존재하면 우선 사용한다.
- SDK가 없거나 webhook-only surface면 공식 HTTP contract를 직접 구현한다.
- thread/conversation affinity는 공통 interface로 정의하되, provider별 지원 범위는 adapter가 결정한다.

## 15. 현재 코드베이스에서 target package로의 분해 계획

## 15.1 `apps/app`

`apps/app`은 React SPA frontend를 소유한다.

소유 범위:

- route tree
- query integration
- 화면 composition
- generated contract/client consumption
- i18n와 shared UI 조합

다음은 소유하지 않는다.

- domain logic
- raw DB schema
- backend process logic
- VCS subprocess policy

## 15.2 `cmd/yona`

소유 범위:

- Go server entrypoint
- config loading
- static embed wiring
- process startup / shutdown

## 15.3 `internal/domain`

소유 범위:

- aggregate/entity behavior
- use case
- ACL decision
- cross-feature invariant

## 15.4 `packages/contracts`

소유 범위:

- generated/frontend-consumed contract helper
- DTO
- error code
- client-side validation helper

## 15.5 `internal/db`

소유 범위:

- schema
- migration definition
- parity test
- `uptrace/bun` query layer

## 15.6 `internal/auth`

소유 범위:

- auth/session implementation
- OAuth bridge
- password reset / root-admin bootstrap
- auth middleware helper

## 15.7 `internal/httpapi`

소유 범위:

- app-facing HTTP/RPC handler
- asset route
- protocol route
- webhook / callback route

## 15.8 `internal/integrations`

소유 범위:

- integration provider contract
- provider SDK / HTTP adapter
- optional delivery runtime
- inbound verification helper
- integration health check

## 15.9 `internal/vcs`

소유 범위:

- git executable integration
- svn executable integration
- smart HTTP helper
- repository provisioning
- VCS-specific audit/policy logic

## 16. 비기능 요구사항

## 16.1 Type safety

- Go는 명시적 type와 compile-time check를 기본으로 한다.
- frontend TypeScript는 `strict`를 유지한다.
- 모든 external input은 Go-side validation과 frontend validation helper 중 하나 이상으로 검증한다.

## 16.2 Security

- mutation에 대한 CSRF protection
- frontend는 backend implementation detail이나 DB client를 직접 알지 않는다.
- protected route와 API route에 auth middleware를 둔다.
- secure cookie setting
- VCS/file route의 path traversal 방지
- asset route의 ACL, content disposition, cache policy 직접 통제
- integration provider secret과 signature material의 안전한 저장
- client bundle로 secret 노출 금지

## 16.3 Performance

- on-prem 단일 서버 기준에서 메모리 예산을 적극적으로 절감한다.
- frontend는 query cache를 authoritative source로 사용한다.
- backend는 low-overhead Go runtime과 efficient DB/VCS path를 우선한다.

## 16.4 Deployment

- dev/prod 모두 single Go process
- OS별 SFX 지원
- Docker multi-stage build 및 Kubernetes 운영 지원

## 17. 테스트 전략

테스트는 behavior-first이면서 legacy-provenance-first로 구성한다. 새 기능은 AI가 처음부터 테스트를 추측해 작성하는 방식이 아니라, `yona-original`의 대응 test/controller/model을 먼저 읽고 intent를 추출한 뒤 failing Red test를 작성하고 Green 구현으로 이어간다. Java test를 1:1 포팅하지는 않지만, 레거시가 검증한 행위 의미는 반드시 현대 Go/React 테스트로 번역한다. legacy build/test runtime을 실제로 재현해 실행하는 것은 선택 사항이며, 필수 조건은 legacy source를 읽고 semantic intent를 추출하는 것이다.

### 17.1 Legacy intent source of truth

구현 전 우선 확인할 canonical source는 다음과 같다.

- `yona-original/test/controllers/**`: route behavior, redirect/error outcome, permission matrix
- `yona-original/test/models/**`: domain invariant, lifecycle, aggregate rule
- `yona-original/test/utils/AccessControlTest.java`: ACL/resource authorization matrix
- `yona-original/test/playRepository/**`: Git/SVN protocol, repo mutation, fixture setup
- `yona-original/conf/test-data.yml`: fixture naming, seeded scenario, cross-test vocabulary

고정 규칙:

- implementer는 대응 feature의 legacy source를 먼저 확인해야 한다.
- legacy source가 있으면 그것이 테스트 작성의 1차 입력이다.
- legacy source를 읽어 intent를 추출하는 것은 필수다.
- legacy Java build/test 환경을 실제로 재현하거나 원본 test 결과를 다시 실행해 확인하는 것은 필수 요구사항이 아니다.
- 다만 정적 독해만으로 intent가 불명확할 때는 원본 실행 결과를 추가 증거로 활용할 수 있다.
- legacy test가 없을 때만 spec-derived test를 1차 입력으로 사용한다.
- `yona-original/`은 read-only reference이며, 자동 변환 산출물의 입력이지 수정 대상이 아니다.

### 17.2 Legacy-to-modern translation protocol

각 feature는 아래 절차를 따른다.

1. 대응 legacy test/controller/model 파일을 식별한다.
2. 테스트가 보호하는 행위 의도, 권한 결과, 상태 전이, fixture 전제를 추출한다.
3. modern architecture에서 어느 테스트 계층으로 번역할지 결정한다.
4. 해당 계층에 failing Red test를 먼저 작성한다.
5. Green 구현 후 의미 보존 여부와 불가피한 차이를 검토한다.
6. intentional deviation이 있으면 feature spec, task doc, PR 설명 중 하나에 명시한다.

계층 매핑 규칙:

- Play controller test -> Go handler/API contract test 또는 server route test
- model test -> domain test
- `AccessControlTest` 류 -> domain ACL test + route authorization test
- `playRepository` test -> route/protocol integration test
- end-user flow 중심 시나리오 -> Playwright E2E

### 17.3 Legacy provenance requirement

각 feature 또는 테스트 묶음은 최소한 다음 provenance를 남겨야 한다.

- source legacy path
- extracted intent summary
- translation target layer
- intentionally dropped semantics
- current TS source material path
- newly introduced Go/React-only semantics

권장 템플릿:

```md
Legacy source:

- yona-original/test/controllers/IssueAppTest.java
- yona-original/test/models/IssueTest.java

Intent:

- nonmember cannot edit others' issue
- author/assignee/manager/admin can edit
- watcher/voter changes affect issue watcher set

Modern translation:

- domain permission test
- Go handler/API contract test
- route response test

Deviation:

- no direct Play redirect assertion; verify typed redirect contract instead
```

### 17.4 Domain test

`packages/domain`의 주요 invariant는 모두 isolated test를 가진다.

검증 대상:

- issue watcher/voter/assignee aggregation
- ACL resource creatable/read/update/delete matrix
- visibility transition invariant
- user favorite/recent/default landing page invariant
- enrollment request lifecycle와 idempotency
- PR 상태 머신
- 커밋 댓글/thread close-open ACL
- 첨부파일 binding lifecycle
- integration event envelope canonicalization

### 17.5 Go handler / API contract test

검증 대상:

- validation
- auth enforcement
- redirect/error handling
- mutation side effect
- favorite/recent/preference/token mutation
- enrollment request/cancel
- upload finalize/bind flow
- 커밋 댓글와 thread state mutation
- integration config mutation
- legacy controller outcome의 typed Go translation
- route path, auth, redirect/error transport shell 동작

### 17.6 Server route test

검증 대상:

- raw HTTP behavior
- protocol semantics
- asset inline/download behavior
- integration inbound verification
- OAuth callback correctness
- `llms.txt`와 AI endpoint
- Git smart HTTP / raw content / download contract

### 17.7 Database parity test

검증 대상:

- dialect별 schema coverage
- dialect별 migration application
- dialect별 search field coverage / filter semantics parity
- timestamp round-trip behavior
- legacy fixture intent를 깨지 않는 seed/loading contract

### 17.8 End-to-end test

필수 E2E 범위:

- sign up / login
- user workspace favorite/recent/preference
- organization/project create
- organization/project self-enroll 또는 cancel
- issue/comment create
- 첨부파일 upload / bind / preview
- repository browse / inline edit
- commit discussion / thread state change
- PR create / review
- integration test delivery
- 범위 제한 검색

### 17.9 Required exemplar scenarios

아래 시나리오는 초기 translation exemplar로 반드시 확보한다.

- user favorite/recent/default landing page behavior
- org/project self-enrollment request와 cancel semantics
- issue permission matrix
- project label attach/list/detach behavior
- project overview update behavior
- PR open/close/reopen transition
- PR unauthorized transition forbidden
- 커밋 댓글와 non-PR thread open/close semantics
- watcher/voter/assignee가 issue watcher set에 반영되는 규칙
- org/project visibility에 따른 ACL read/update/delete matrix
- Git inline edit, protected branch, stale base OID conflict
- mailbox inbound issue/comment/review creation
- search permission filtering
- 첨부파일 temporary upload -> bind -> preview/download lifecycle

### 17.10 Hard gates

다음 규칙을 만족하지 못하면 해당 feature는 완료로 인정하지 않는다.

- primary legacy reference가 식별되어 있다.
- 대응 intent를 바탕으로 failing Red test가 먼저 존재한다.
- Green 구현 후 translation target layer별 테스트가 통과한다.
- legacy semantics와 의도적으로 다른 결정은 deviation으로 기록된다.
- legacy source가 없는 경우에만 spec-derived test를 단독 근거로 사용할 수 있다.

## 18. 전달 로드맵

## Phase 0: Foundation Reset

산출물:

- `apps/app` React SPA baseline 정리
- `cmd/yona` Go server scaffold
- frontend dist embed baseline
- auth/session baseline
- `uptrace/bun` + 3개 DB baseline
- asset/VCS route baseline
- current TS `tRPC` surface inventory
- legacy test inventory table 작성
- feature-to-legacy-test mapping baseline 작성
- legacy provenance 템플릿과 translation 규칙 확정
- auth/ACL/issue/project/PR/git/search translation exemplar 확보
- `conf/test-data.yml` 기반 fixture/seeding 전략 정의

완료 기준:

- frontend build output을 Go에서 서빙할 수 있다.
- Go app이 부팅된다.
- auth/session spike가 검증된다.
- asset/VCS baseline이 검증된다.
- 최소 auth/ACL/issue/project/PR/git/search 각 1개 이상 translation exemplar가 존재한다.
- implementer가 테스트 계층을 임의로 정하지 않아도 되도록 mapping rule이 문서화된다.

## Phase 1: 신원과 핵심 소유권

산출물:

- 사용자 인증 흐름
- 사용자 작업공간 기본선
- 조직/프로젝트 기본선
- 조직/프로젝트 가입 요청 기본선
- ACL 핵심
- 아바타/로고 asset 흐름

완료 기준:

- 로그인, 가입, 로그아웃, 사용자 작업공간, 조직/프로젝트 CRUD가 안정화된다.
- 인증/프로젝트/ACL/사용자 작업공간 capability에 대한 legacy provenance와 Red-Green trace가 남는다.

## Phase 2: 이슈 추적

산출물:

- 이슈 CRUD
- 댓글
- 라벨
- 마일스톤
- 첨부파일
- watch/vote/share

완료 기준:

- 이슈 동등성 기본선 달성
- 이슈/첨부파일 레거시 의도 coverage와 Red-Green trace가 확보된다.

## Phase 3: 저장소와 VCS

산출물:

- 저장소 브라우저
- raw 파일 route
- 인라인 편집
- 커밋 토론 / 스레드 생명주기
- smart HTTP

완료 기준:

- Git 동등성 기본선 달성
- 저장소/프로토콜/커밋 토론 레거시 의도 coverage와 Red-Green trace가 확보된다.

## Phase 4: 풀 리퀘스트와 리뷰

산출물:

- PR 생명주기
- 리뷰어 규칙
- 리뷰 스레드
- 병합 동작

완료 기준:

- PR/리뷰 동등성 기본선 달성
- PR/리뷰 레거시 의도 coverage와 Red-Green trace가 확보된다.

## Phase 5: 검색, 보드, 연동 전송

산출물:

- 범위 제한 검색
- 보드
- 알림
- 인바운드 메일박스 / 이메일 답장
- 연동 전송
- Slack / Google Chat adapter

완료 기준:

- 협업 surface 동등성 달성
- 검색/보드/메일/연동 레거시 의도 coverage와 Red-Green trace가 확보된다.

## Phase 6: 관리자 기능, 마이그레이션, LLMO 하드닝

산출물:

- 관리자 도구
- 마이그레이션 도구
- `llms.txt`
- AI datasource endpoint
- 배포 하드닝

완료 기준:

- operational readiness와 AI surface 완성
- admin/import capability의 legacy provenance와 운영 검증 리포트가 존재한다.

## 19. Definition of Done

아래 조건이 모두 참일 때에만 재개발이 완료된 것으로 본다.

- Go build와 frontend build가 모두 통과한다.
- 핵심 기능이 route/domain/E2E test로 검증된다.
- 핵심 기능별 legacy provenance와 Red-Green trace가 남는다.
- PostgreSQL, MySQL/MariaDB, SQLite 지원이 모두 확인된다.
- Yona-owned auth/session이 DB session policy를 깨지 않고 동작한다.
- user workspace parity(favorite/recent/preference/token/default landing page)가 ACL과 함께 동작한다.
- git executable backend와 svn executable backend가 Go route로 이관된다.
- commit discussion과 generic thread lifecycle이 PR state machine과 별도 owner 아래 보존된다.
- user-uploaded asset delivery가 Yona ACL 아래에서 동작한다.
- integration provider contract와 built-in provider baseline이 검증된다.
- outbound mail과 inbound mailbox reply behavior가 문서화되고 검증된다.
- frontend dist embed 기반 SFX와 Docker/Kubernetes 배포가 문서화되고 동작한다.
- `llms.txt`와 AI datasource endpoint가 존재하고 ACL을 지킨다.

## 20. 주요 리스크와 대응

### tRPC compatibility spike mismatch

Risk:

- current TS `tRPC` surface를 Go로 옮길 때 호환성 layer가 current frontend call site를 충분히 보존하지 못할 수 있다.

Mitigation:

- current `*-trpc.ts` surface inventory를 먼저 동결
- `befabri/trpcgo`로 compatibility spike 수행
- 실패 시 custom HTTP/JSON contract + generated TS client로 전환

### In-memory session 운영 한계

Risk:

- process restart 시 session 유실
- horizontal scale에 추가 작업 필요

Mitigation:

- 운영 문서에 명확히 기록
- storage abstraction을 명시적으로 유지
- future Redis/Valkey secondary storage 확장을 대비

### frontend/backend boundary drift 위험

Risk:

- current frontend migration 과정에서 화면이 직접 backend implementation detail을 알게 될 수 있다.

Mitigation:

- frontend는 generated contract/client만 통하도록 강제
- direct DB call과 backend internal coupling 금지
- TS surface inventory와 Go contract test를 함께 유지

### superjson boundary drift

Risk:

- app-internal RPC와 raw HTTP route가 같은 DTO를 무분별하게 공유하면 `Date` 같은 타입의 직렬화 규칙이 섞일 수 있다.

Mitigation:

- app-internal RPC transformer는 `superjson`으로 고정
- raw HTTP/server route는 명시적 JSON/binary/header contract를 별도로 유지
- `packages/contracts`에서 transformer-safe contract와 raw HTTP contract의 경계를 문서화

### Integration provider API drift

Risk:

- Slack, Google Chat 등 외부 provider API나 SDK가 바뀌면 integration adapter 유지보수 비용이 커질 수 있다.

Mitigation:

- provider 공통 interface를 제품 경계에 고정
- SDK 의존은 `packages/integrations`에만 국한
- provider contract 변경 시 adapter와 contract test를 함께 갱신

### Legacy parity scope 확산

Risk:

- 범위가 넓어서 drift가 발생할 수 있다.

Mitigation:

- 이 spec의 각 섹션을 bounded work package로 취급
- phase gate는 UI 완료가 아니라 behavior parity 기준으로 판정

## 21. 참고 자료

Go / React 참고 자료:

- TanStack Router: https://tanstack.com/router
- TanStack Query: https://tanstack.com/query
- Vite: https://vite.dev/
- uptrace bun: https://bun.uptrace.dev/
- uptrace bun README: https://github.com/uptrace/bun
- trpcgo README: https://raw.githubusercontent.com/befabri/trpcgo/main/README.md
- trpc-group/trpc-go README: https://raw.githubusercontent.com/trpc-group/trpc-go/main/README.md
- Gitea docs: https://docs.gitea.com/
- Forgejo docs: https://forgejo.org/docs/
- Masterminds/vcs README: https://raw.githubusercontent.com/Masterminds/vcs/master/README.md
- Go cross-compiling: https://go.dev/wiki/WindowsCrossCompiling

로컬 저장소 참고 자료:

- [`docs/agents/00-goals-and-fixed-decisions.md`](/G:/programming/yona/docs/agents/00-goals-and-fixed-decisions.md)
- [`docs/agents/04-architecture-guardrails.md`](/G:/programming/yona/docs/agents/04-architecture-guardrails.md)
- [`docs/workflow/HANDOFF-GIT-EXEC-BACKEND-2026-03-01.md`](/G:/programming/yona/docs/workflow/HANDOFF-GIT-EXEC-BACKEND-2026-03-01.md)
- [`apps/app/src/lib/auth-trpc.ts`](/G:/programming/yona/apps/app/src/lib/auth-trpc.ts)
- [`packages/infra/src/git/executable.ts`](/G:/programming/yona/packages/infra/src/git/executable.ts)
- [`packages/infra/src/session/in-memory-session-store.ts`](/G:/programming/yona/packages/infra/src/session/in-memory-session-store.ts)
- [`yona-original/conf/routes`](/G:/programming/yona/yona-original/conf/routes)
