# 03) 리포 구조

## Target Monorepo

- `yona-original/`: legacy Yona read-only reference
- `apps/app/`: TanStack Start application
- `apps/migrator-h2/`: H2 -> SQLite migration CLI
- `packages/auth/`: Better Auth integration, auth bridge, session secondary storage
- `packages/contracts/`: Zod schema, DTO, error code
- `packages/db/`: Drizzle schema, migration, parity test, DB helper
- `packages/domain/`: aggregate/entity behavior, use case, ACL, invariant
- `packages/integrations/`: provider contract, adapter, delivery worker
- `packages/i18n/`: text resource와 message catalog
- `packages/ui/`: shared React UI
- `packages/vcs/`: git/svn executable integration, smart HTTP helper

## Transitional State

- 현재 `apps/web`, `packages/api`, `packages/core`, `packages/infra`는 migration 중간 산물이다.
- 새 장기 ownership은 target package에 두고, 기존 패키지는 extraction/deletion 대상으로 다룬다.
- 현재 strongest reusable asset은 git executable backend, in-memory session store, multi-dialect Drizzle schema/test다.

## 경계 규칙

- `apps/app`은 route tree, SSR wiring, root context, server route composition을 소유한다.
- app은 raw DB schema, domain invariant, VCS subprocess policy를 직접 소유하지 않는다.
- `packages/domain`은 ACL과 cross-feature invariant를 소유한다.
- `packages/db`는 schema와 migration을 소유한다.
- `packages/vcs`는 executable integration과 protocol helper를 소유한다.

## 주의사항

- `yona-original/`은 수정하지 않는다.
- 새 구현에서 legacy package 경계를 강화하지 않는다.
