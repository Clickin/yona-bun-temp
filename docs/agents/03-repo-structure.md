# 03) 리포 구조

## Canonical Order

- `yona-original/`: legacy Yona read-only reference
- `repo root`: current canonical implementation baseline
- `reference/mixed-code/**`: reference-only migration material
- `reference/spikes/**`: historical spike archive

## Canonical Workspace

- `frontend/`: React SPA
- `proto/`: canonical contract source
- `crates/server/`: runtime bootstrap, HTTP/RPC, asset delivery, session/auth bootstrap
- `crates/domain/`: parity-first domain behavior, ACL, invariant
- `crates/persistence/`: DB access, repositories, dialect handling
- `crates/migration/`: schema, seed, migration
- `crates/vcs/`, `crates/search/`, `crates/integrations/`: 후속 vertical slice owner
- `Cargo.toml`, `buf.yaml`, `buf.gen.yaml`: workspace root manifests

## Reference-Only Root Paths

- `reference/mixed-code/**`
- `reference/spikes/**`

이 경로들은 useful reference일 수 있지만 새 canonical ownership을 추가하지 않는다.
