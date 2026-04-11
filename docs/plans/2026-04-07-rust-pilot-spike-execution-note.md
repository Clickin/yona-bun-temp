# Rust Pilot Spike Execution Note

> Status: reference-only
> This document records the spike that started under `experimental/rust-pilot/` and now lives at `yona-rust/`. Treat it as historical spike evidence, not as the canonical execution spec.

## Goal

- Validate the Rust workspace promotion path that is now represented by `yona-rust/`.
- Preserve the original spike evidence for:
  - Connect JSON unary compatibility
  - session bootstrap + CSRF behavior
  - SQLite-backed SeaORM repository flow
  - filesystem asset serving with runtime config injection
  - env-backed Postgres/MySQL/MariaDB smoke path

## Implemented Scope

- Cargo workspace with `crates/server` and `crates/migration`
- `build.rs` proto codegen using `connectrpc-build`
- vendored `protoc` for local codegen bootstrapping
- Axum router and pilot service endpoints
- SeaORM migrations and deterministic seed data
- filesystem and embedded asset serving smoke paths

## Commands

```powershell
cd yona-rust
cargo test -p yona-rust-pilot-server
cargo test -p yona-rust-pilot-server --test db_matrix_env -- --nocapture
pwsh ./scripts/run-db-matrix.ps1
pwsh ./scripts/smoke-embedded-assets.ps1
```

## Verification Snapshot

- `cargo test --workspace`: pass at spike time
- `cargo build -p yona-rust-pilot-server`: pass at spike time
- `pnpm --dir frontend build`: pass at spike time
- `pwsh ./scripts/run-db-matrix.ps1`: pass at spike time
- `pwsh ./scripts/smoke-embedded-assets.ps1`: pass at spike time

## Current Reading Rule

- Use this note to understand the former spike origin and commands.
- Do not treat the spike package names or temporary scope as the current documentation baseline.
