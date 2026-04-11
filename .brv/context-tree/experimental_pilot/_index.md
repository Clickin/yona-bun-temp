---
children_hash: ff0f9e03cf0cbda7c747c77ba06684ae3bb403b798ef971be55d40187cc11450
compression_ratio: 0.8350125944584383
condensation_order: 2
covers: [context.md, rust_sidecar/_index.md]
covers_token_total: 794
summary_level: d2
token_count: 663
type: summary
---
## experimental_pilot (Domain overview)
- **Purpose & Usage**: Captures exploratory pilot sidecar architectures (Rust/Go prototypes) with supporting verification and config tooling until the experiment matures or is archived (`context.md`).
- **Scope**: Includes experimental pilot sidecars, runtime/config injections, and DB matrix/verification scripts; explicitly excludes production Go pilot internals and unrelated experiments, owned by the Rust pilot spike team (`context.md`).

## experimental_pilot/rust_sidecar (Topic summary)
- **Core Architecture**: Axum router (`crates/server/src/lib.rs`) wires persistence, runtime_config, and session modules, normalizes `basePath`, registers `PilotServiceImpl`, exposes `/api/auth/session` and ConnectRPC JSON unary handlers, and serves filesystem assets with SPA fallback plus runtime config injection (`context.md`/`experimental_rust_pilot_sidecar.md`).
- **Persistence Layer**: SeaORM models/migrations in `crates/server/src/persistence.rs` and `crates/migration/src/lib.rs` provision `projects`/`issues` tables for SQLite/Postgres/MySQL/MariaDB via migration `m20260407_000001_create_pilot_tables`, all relying on SeaORM `DatabaseConnection` (`context.md`/`experimental_rust_pilot_sidecar.md`).
- **Runtime & Serving Pattern**: Asset hosting injects runtime config (basePath/rpcBaseUrl/apiBaseUrl) into `frontend/dist` HTML before closing tags while rejecting unsafe methods before SPA fallback; session bootstrap issues `yona_session`/`yona_csrf_token` cookies plus `X-CSRF-Token`, and `PilotServiceImpl` enforces CSRF/session checks on session/project/issue endpoints (`context.md`/`experimental_rust_pilot_sidecar.md`).
- **Verification & Tooling**: `scripts/run-db-matrix.ps1` spins up Postgres16/MySQL8/MariaDB11 containers and runs `cargo test --test db_matrix_env -- --nocapture`; manual smoke tests hit `/yona/`, `/yona/api/auth/session`, and `/yona/rpc/.../ListProjects` to confirm seeded data/config injection (`context.md`/`experimental_rust_pilot_sidecar.md`).
- **Pipeline & Dependencies**: ConnectRPC codegen (`build.rs`) compiles `pilot.proto` via `connectrpc-build` with vendored `protoc`; runtime flow follows `cargo test -p yona-rust-pilot-server` → DB matrix script → serving assets with injected config → browser smoke checks (`context.md`/`experimental_rust_pilot_sidecar.md`).
- **Key Facts & Rules**: Captured facts include `codegen_pipeline`, `database_support`, `db_matrix_script`, and `asset_serving`; enforced rules note runtime config injection before closing tags and rejection of unsafe methods prior to SPA fallback (`context.md`/`experimental_rust_pilot_sidecar.md`).