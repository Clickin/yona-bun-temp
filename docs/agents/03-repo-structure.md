# 03) 리포 구조

## Canonical Order

- `yona-original/`: legacy Yona read-only reference
- `repo root`: current canonical implementation baseline
- `reference/spikes/**`: historical spike archive

`reference/mixed-code/**`, if present, is obsolete pre-Rust Bun/TanStack/tRPC/Drizzle residual code. It is not a legacy reference path.

## Canonical Workspace

- `frontend/`: REST API client, TanStack Query state, React SPA
- `proto/`: REST pivot 이전 message schema snapshot; runtime RPC source가 아님
- `crates/server/`: runtime bootstrap, HTTP/REST, asset delivery, session/auth bootstrap
- `crates/domain/`: parity-first domain behavior, ACL, invariant
- `crates/persistence-entities/`: SeaORM generated entity modules and relation derives
- `crates/persistence/`: DB access, repositories, dialect handling; re-exports persistence entities for compatibility
- `crates/migration/`: schema, seed, migration
- `crates/vcs/`, `crates/search/`, `crates/integrations/`: 후속 vertical slice owner
- `Cargo.toml`, `buf.yaml`, `buf.gen.yaml`: workspace root manifests

## Historical Root Paths

- `reference/spikes/**`

이 경로에는 새 canonical ownership을 추가하지 않는다.
