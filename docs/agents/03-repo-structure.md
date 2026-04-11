# 03) 리포 구조

## Canonical Order

- `yona-original/`: legacy Yona read-only reference
- `yona-rust/`: current canonical implementation baseline
- root mixed code: reference-only migration material

## Canonical Workspace

- `yona-rust/frontend/`: React SPA
- `yona-rust/proto/`: canonical contract source
- `yona-rust/crates/server/`: runtime bootstrap, HTTP/RPC, asset delivery, session/auth bootstrap
- `yona-rust/crates/domain/`: parity-first domain behavior, ACL, invariant
- `yona-rust/crates/persistence/`: DB access, repositories, dialect handling
- `yona-rust/crates/migration/`: schema, seed, migration
- `yona-rust/crates/vcs/`, `search/`, `integrations/`: 후속 vertical slice owner

## Reference-Only Root Paths

- `frontend/`
- `packages/*`
- `cmd/`
- `internal/`
- `apps/*`
- root `proto/`

이 경로들은 useful reference일 수 있지만 새 canonical ownership을 추가하지 않는다.
