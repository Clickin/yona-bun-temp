# 00) 목표와 고정 의사결정

## 목표

- Yona를 **SvelteKit SSR + Bun** 기반으로 재개발한다.
- 런타임은 **단일(Bun)**, 배포는 **Bun SFX 생성**을 포함한다.
- 제품은 소규모 사내팀(<=100명) 이슈 트래커 중심으로 최적화한다.

## 고정 의사결정(변경 금지)

- **프론트엔드 스택:** Svelte 5 (Runes 전용), Tailwind CSS v4, `shadcn-svelte`.
- **다중 에이전트 병렬 개발:** `git worktree` 기반 병렬 작업을 강제한다.
- **Git 포크 금지 및 이력 분리:** 기존 Yona 포크가 아닌 신규 포팅으로 진행한다.
- **TDD 강제:** 구현보다 테스트 명세(Vitest)를 먼저 작성한다.
- **Git 조작:** 시스템 `git` executable 사용. `libgit2-ffi`는 범위 제외.
- **SVN 조작:** FFI 금지. `Bun.spawn` 기반 외부 `svn` CLI 호출 고정.
- **Hono 1급 시민 채택:** 도메인별 sub-app 분할, tRPC 미도입.
- **DB 드라이버:** `Bun.SQL` + Drizzle ORM `1.0.0-rc**` + `drizzle-orm/bun-sql`.

## Overrides / Decisions (monorepo-sessions-bunsql-multidialect)

- **Monorepo mandatory:** `apps/web`, `packages/api`, `packages/core`, `packages/infra`, `tools/*`.
- **Git backend:** 시스템 git executable 경로 사용.
- **Session management:** DB session 배제, in-memory session 사용.
- **DB runtime:** Bun.SQL + Drizzle `drizzle-orm/bun-sql`, Postgres/MySQL/SQLite 선택 지원.
- **Schema parity:** 다이얼렉트 간 table/column/nullability/index/fk semantics 동등성 유지.

## Schema parity bar

- Table names and column names must be equivalent across Postgres/MySQL/SQLite schema modules.
- Nullability must match per column across all dialect schema modules.
- Index and unique index definitions (name + columns + uniqueness) must match across dialects.
- Foreign keys must preserve targets and onDelete/onUpdate semantics.
- Timestamp semantics must preserve Date at TypeScript boundary.

## References

- Drizzle bun-sql multi-dialect context: https://github.com/drizzle-team/drizzle-orm/issues/4937#issuecomment-3707293427
- Bun SQL runtime documentation: https://bun.com/docs/runtime/sql
- Bun SQL SQLite filename reference: https://bun.com/reference/bun/SQL/SQLiteOptions/filename

## Overrides / Decisions (user-authentication)

- **OAuth providers:** GitHub OAuth, Google OAuth, Email/Password 모두 필수.
- **Email verification:** 회원가입 시 이메일 인증 불필요, 비밀번호 재설정 용도로만 사용.
- **Email usage:** SMTP 미설정 시 auth 시스템 비활성화(단, OAuth 이메일 자동 검증).
- **Password reset:** admin-driven flow.
- **Account linking:** OAuth 로그인 시 기존 이메일 계정 자동 연결.
- **Session cookies:** HttpOnly, SameSite=Lax(dev), Secure(prod).
