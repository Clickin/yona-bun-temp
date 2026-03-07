# 04) 아키텍처 가드레일

## G1) Canonical App Model

- target baseline은 `TanStack Start + React + Bun`이다.
- `SvelteKit`, `Hono`를 새 canonical transport로 도입하지 않는다.
- UI, SSR, auth/session projection, thin `serverFunction` adapter, in-process `tRPC`, server route가 하나의 deployable app 안에 존재한다.

## G2) Transport Boundary

- 내부 앱 read/mutation의 canonical backend boundary는 in-process `tRPC`.
- TanStack Start `serverFunction`은 app-facing thin adapter shell이다.
- app-internal non-plain-JSON 타입은 `superjson` transformer로 처리한다.
- 명시적 HTTP/protocol control이 필요한 경우만 server route를 사용한다.
- route loader, `beforeLoad`, component, `serverFunction` adapter의 direct DB call을 금지한다.
- session 조회와 redirect는 app layer에서 수행할 수 있지만, feature ACL source of truth는 `tRPC`/domain에 둔다.
- session-aware route라는 이유만으로 full SSR을 강제하지 않으며, route 목적에 따라 `ssr: true`, `ssr: 'data-only'`, `ssr: false`를 선택한다.
- smart HTTP, OAuth callback, asset download, webhook ingress, AI endpoint는 server route로 구현한다.

## G3) Ownership Boundary

- `apps/app`은 route tree, router setup, query integration, root context, `tRPC` context/caller/adapter wiring, server route composition만 소유한다.
- `packages/domain`은 ACL, aggregate behavior, invariant를 소유한다.
- `packages/db`는 schema, migration, parity test를 소유한다.
- `packages/vcs`는 git/svn executable policy와 protocol helper를 소유한다.

## G4) Auth / Session Boundary

- `Better Auth`는 handshake, auth lifecycle helper, adapter integration을 맡는다.
- Yona는 canonical user, credential, linked account, ACL, audit, admin auth policy를 소유한다.
- DB session persistence는 금지한다.
- 기본 session store는 in-memory이며 secondary storage는 추상화 뒤에 붙인다.

## G5) DB Discipline

- `PostgreSQL`, `MySQL/MariaDB`, `SQLite`를 day 1부터 동등한 지원 대상으로 취급한다.
- 새 query는 처음부터 세 dialect를 동시에 고려한다.
- datetime, FTS, raw SQL, migration lock, timestamp round-trip은 dialect별 검토를 명시적으로 남긴다.
- single-dialect convenience를 이유로 다른 DB를 후순위로 미루지 않는다.

## G6) Import Convention

- package 경계 import는 `@yona/*`.
- 새 app 내부 import는 `@app/*`.
- migration 기간에 schema/config 참조는 `@drizzle/*` 허용.
- legacy `@web`, `$lib`, `$app`, `@core`, `@api`, `@infra` alias는 untouched legacy code에만 남길 수 있다.
- 깊은 상대경로(`../../../`)는 금지한다.

## G7) Asset / File Delivery

- user-uploaded asset을 static bundle 또는 public directory에 포함하지 않는다.
- metadata ACL 판단은 항상 Yona가 수행한다.
- inline preview와 download response policy를 분리한다.

## G8) VCS Process Safety

- 모든 git/svn subprocess는 argv array만 사용한다.
- shell string 실행을 금지한다.
- timeout, environment whitelist, output size limit, error normalization을 적용한다.
- write/conflict action은 audit 가능해야 한다.

## G9) Background Work

- notification/integration delivery는 기본적으로 main event loop의 async I/O로 처리한다.
- polling, durable retry, CPU-bound transform처럼 분리가 필요한 workload만 별도 runtime 경로로 분리한다.

## G10) Test Provenance

- feature 완료 판정은 UI가 아니라 legacy intent parity 기준으로 한다.
- primary legacy reference, failing Red test, passing Green tests, deviation 기록이 없으면 완료로 인정하지 않는다.
