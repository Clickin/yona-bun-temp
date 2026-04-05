# 03) 리포 구조

## Target Monorepo

- `yona-original/`: legacy Yona read-only reference
- `apps/app/`: React SPA frontend
- `apps/migrator-h2/`: H2 -> SQLite migration CLI
- `cmd/yona/`: Go server entrypoint
- `internal/auth/`: auth/session, OAuth, password reset, root-admin bootstrap
- `internal/db/`: schema, migration, dialect abstraction, query layer
- `internal/domain/`: aggregate/entity behavior, use case, ACL, invariant
- `internal/httpapi/`: app-facing HTTP/RPC handlers, protocol routes, asset routes
- `internal/integrations/`: provider contract, adapter, email/integration delivery runtime
- `internal/search/`: bounded search logic and permission filtering
- `internal/vcs/`: git/svn executable integration, smart HTTP helper
- `packages/contracts/`: generated or frontend-consumed contract/type helpers
- `packages/i18n/`: text resource와 message catalog
- `packages/ui/`: shared React UI

## Transitional State

- 현재 active frontend runtime은 `apps/app`이다.
- 현재 `packages/auth`, `packages/db`, `packages/domain`, `packages/integrations`, `packages/vcs`, `apps/app/src/lib/*-trpc*`는 backend migration source material이다.
- `packages/api`, `packages/core`, `packages/infra`는 extraction/deletion 대상으로 다룬다.
- strongest reusable asset은 git executable backend, multi-dialect schema/test intent, legacy provenance mapping이다.

## 경계 규칙

- `apps/app`은 UI composition, route tree, query integration, client contract 호출만 소유한다.
- `cmd/yona`는 서버 bootstrap, config loading, embed asset wiring을 소유한다.
- `internal/domain`은 ACL과 cross-feature invariant를 소유한다.
- `internal/db`는 schema와 migration을 소유한다.
- `internal/httpapi`는 app-facing API/route adapter만 소유한다.
- `internal/vcs`는 executable integration과 protocol helper를 소유한다.

## 주의사항

- `yona-original/`은 수정하지 않는다.
- 새 장기 backend ownership을 TS `packages/*`에 추가하지 않는다.
- current TS package는 migration source material로만 읽고, 새 canonical backend는 Go 쪽에 둔다.
