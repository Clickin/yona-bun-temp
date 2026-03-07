# 00) 목표와 고정 의사결정

## Canonical Source

- `SPEC.md`가 최상위 canonical document다.
- 이 문서는 `SPEC.md`를 실행 규칙 중심으로 요약한 mirror다.
- 하위 문서가 `SPEC.md`와 충돌하면 `SPEC.md`를 우선한다.

## 목표

- Yona를 `TanStack Start + React + Bun` 기반의 단일 애플리케이션으로 전면 재작성한다.
- 목표 범위는 legacy Yona behavior parity이며, 축소판 issue tracker를 만들지 않는다.
- 결과물은 일반 Bun 실행, `bun compile` SFX, Docker 배포를 모두 지원해야 한다.

## 고정 의사결정

- **재작성 방식:** 현재 `SvelteKit + Hono` 구현을 확장하지 않고, target architecture로 명시적으로 전환한다.
- **앱 모델:** `TanStack Start + TanStack Router + TanStack Query + React`.
- **내부 인터페이스:** 내부 앱 read/mutation은 `createServerFn`이 baseline이다.
- **외부 인터페이스:** protocol 또는 외부 소비자 endpoint는 server route로 구현한다.
- **인증 경계:** `Better Auth`를 사용하되 canonical user, credential, linked account, ACL, audit는 Yona가 직접 소유한다.
- **세션:** DB session persistence는 금지한다. 기본은 in-memory이며 `Redis/Valkey` secondary storage를 허용한다.
- **OAuth:** GitHub OAuth, Google OAuth, Email/Password를 모두 지원한다.
- **비밀번호 정책:** password reset은 admin-driven baseline을 유지한다.
- **VCS:** Git/SVN은 system executable 기반으로 유지하고 FFI는 범위 밖이다.
- **DB 런타임:** `Bun.SQL + Drizzle`.
- **지원 DB:** `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 모두 first-class로 지원한다.
- **Schema parity:** table/column/nullability/index/fk/timestamp semantics는 세 dialect에서 동등해야 한다.
- **Query 작성 규칙:** query를 작성할 때부터 세 dialect를 동시에 고려한다. 특히 datetime, FTS, raw SQL은 dialect 차이를 명시적으로 검토한다.
- **Asset delivery:** user-uploaded asset은 Yona-controlled route로만 제공한다.
- **Plugin model:** arbitrary runtime plugin은 금지하고 out-of-process integration provider만 허용한다.
- **AI surface:** `llms.txt`와 AI datasource endpoint는 Phase 6 hardening 범위로 취급한다.
- **Async delivery:** notification/integration delivery는 Bun process 내부의 dedicated worker에서 처리한다.

## 전환 입장

- 현재 `apps/web`, `packages/api`, `packages/core`, `packages/infra`는 target ownership이 아니라 extraction source다.
- 장기 ownership은 `apps/app`, `packages/auth`, `packages/contracts`, `packages/db`, `packages/domain`, `packages/integrations`, `packages/i18n`, `packages/ui`, `packages/vcs`로 이동한다.

## 참고 자료

- `SPEC.md`
- https://tanstack.com/start/latest/docs/framework/react/overview
- https://www.better-auth.com/docs/adapters/drizzle
- https://www.better-auth.com/docs/concepts/database#secondary-storage
- https://bun.com/docs/runtime/sql
- https://bun.com/docs/bundler/executables
