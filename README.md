# Yona

Yona는 `TanStack Start + React + Bun` 기반으로 레거시 Yona의 behavior parity를 목표로 재작성 중인 단일 애플리케이션 워크스페이스다.

## Canonical Runtime

- active runtime은 `apps/app`이다.
- root `bun run dev`, `build`, `preview`, `check`, `test`는 `apps/app`을 기준으로 본다.
- `apps/web`, `packages/api`, `packages/core`, `packages/infra`는 migration-source/reference-only 경로다. 새 장기 ownership을 추가하지 않는다.

## Working Rules

- canonical execution spec은 `SPEC.md`다.
- 운영용 mirror는 `docs/agents/*.md`다.
- 구현 전에는 대응 legacy route/test/model을 `yona-original/`에서 먼저 식별한다.
- failing Red test 없이 Green 구현부터 시작하지 않는다.

## Workspace Landmarks

- `apps/app/`: TanStack Start application
- `packages/db/`: Drizzle schema, migration, parity test
- `packages/vcs/`: git/svn executable integration
- `yona-original/`: read-only legacy provenance source
- `docs/agents/`: execution mirror docs

## Current Migration Stance

- 내부 read/mutation의 canonical backend boundary는 in-process `tRPC`다.
- TanStack Start `createServerFn`/`serverFunction`은 thin adapter shell이고, 외부/프로토콜 endpoint는 server route가 기준이다.
- app-internal non-plain-JSON 타입은 `superjson`을 기준으로 직렬화한다.
- 인증은 `Better Auth`를 우선 사용하되, identity/ACL/audit ownership은 Yona가 직접 가진다.
