---
children_hash: 3f71c7140fbb492530178290a055b2c01a2082fc791306909b35cf95538401d8
compression_ratio: 0.5382323733862959
condensation_order: 1
covers: [context.md, experimental_rust_pilot_sidecar.md]
covers_token_total: 1007
summary_level: d1
token_count: 542
type: summary
---
# Domain: experimental_pilot/rust_sidecar

## Core Architecture (context.md / experimental_rust_pilot_sidecar.md)
- Axum router (crates/server/src/lib.rs) wires persistence, runtime_config, and session modules, normalizes base_path, registers `PilotServiceImpl`, exposes `GET /api/auth/session` plus ConnectRPC JSON unary handlers at `/rpc/yona.pilot.v1.PilotService/*`, and serves filesystem assets with SPA fallback plus runtime config injection.
- Persistence layer uses SeaORM models/migrations (crates/server/src/persistence.rs and crates/migration/src/lib.rs) for `projects`/`issues`, supporting SQLite/Postgres/MySQL/MariaDB via `m20260407_000001_create_pilot_tables`, and relies on SeaORM’s `DatabaseConnection`.

## Runtime and Serving Patterns
- Filesystem asset hosting injects runtime config (basePath, rpcBaseUrl, apiBaseUrl) into `frontend/dist` HTML before `</head>`/`</body>` rules; non-GET/HEAD requests are rejected before SPA fallback.
- Session bootstrap returns `yona_session`/`yona_csrf_token` cookies and `X-CSRF-Token` header; PilotServiceImpl enforces CSRF/session validation on `read_current_session`, `list_projects`, `read_issue_detail`, and `update_issue_state`.

## Verification & Tooling
- `scripts/run-db-matrix.ps1` spins up Postgres16, MySQL8, MariaDB11 containers (ports 55432/53306/53307) and runs `cargo test --test db_matrix_env -- --nocapture` to exercise the DB matrix tests.
- Manual smoke verification involves `GET /yona/`, `GET /yona/api/auth/session`, and `POST /yona/rpc/.../ListProjects` to confirm seeded pilot data and runtime config injection.

## Pipeline & Dependencies
- ConnectRPC codegen (build.rs) compiles `pilot.proto` via `connectrpc-build` with a vendored `protoc`.
- Runtime flow: `cargo test -p yona-rust-pilot-server` → `scripts/run-db-matrix.ps1` → serve frontend assets with injected config → browser smoke hits `/yona/` and `/yona/projects`.

## Key Facts & Rules
- Fact references: `codegen_pipeline`, `database_support`, `db_matrix_script`, `asset_serving`.
- Rules enforced: runtime config injection hook before closing tags, `serve_filesystem_fallback` rejects unsafe methods prior to SPA fallback.