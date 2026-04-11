---
title: Experimental Rust Pilot Sidecar
tags: []
related: [experimental_pilot/rust_sidecar/_index.md]
keywords: []
importance: 60
recency: 1
maturity: draft
updateCount: 2
createdAt: '2026-04-07T11:19:53.660Z'
updatedAt: '2026-04-07T11:22:04.296Z'
---
## Raw Concept
**Task:**
Document the experimental Rust pilot sidecar implementation, migrations, smoke verification, and filesystem asset hosting for the pilot service.

**Changes:**
- Added Axum-based server with ConnectRPC JSON unary handlers for pilot.proto and filesystem asset hosting with runtime config injection.
- Implemented SeaORM persistence layer plus migration/seed script for projects/issues tables.
- Created scripts/run-db-matrix.ps1 to spin up Postgres16/MySQL8/MariaDB11 containers and exercise db_matrix_env tests.
- Recorded execution note with commands, manual smoke steps, and verification snapshot for the spike.

**Files:**
- experimental/rust-pilot/crates/server/src/lib.rs
- experimental/rust-pilot/crates/server/src/persistence.rs
- experimental/rust-pilot/crates/migration/src/lib.rs
- experimental/rust-pilot/scripts/run-db-matrix.ps1
- docs/plans/2026-04-07-rust-pilot-spike-execution-note.md

**Flow:**
cargo test -p yona-rust-pilot-server -> run scripts/run-db-matrix.ps1 -> serve frontend/dist with runtime config injection ➝ GET /yona/ and /yona/projects for browser smoke

**Timestamp:** 2026-04-07

**Author:** Rust pilot spike team

## Narrative
### Structure
Axum router (crates/server/src/lib.rs) composes persistence, runtime_config, session modules, normalizes base_path, registers PilotServiceImpl, exposes GET /api/auth/session plus POST /rpc/yona.pilot.v1.PilotService/*, and serves filesystem assets with SPA fallback and runtime config injection for basePath, rpcBaseUrl, apiBaseUrl.

### Dependencies
ConnectRPC codegen uses vendored protoc via build.rs, PilotRepository depends on SeaORM DatabaseConnection plus migration identifiers Projects/Issues, and the db matrix smoke script relies on Postgres 16, MySQL 8, MariaDB 11 containers accessible on ports 55432/53306/53307.

### Highlights
Session bootstrap returns yona_session/yona_csrf_token cookies plus X-CSRF-Token header; PilotServiceImpl supports read_current_session, list_projects, read_issue_detail, update_issue_state with CSRF/session validation, and serve_index_html injects runtime config before </head> or </body> for SPA fallbacks.

### Rules
Rule: serve_index_html must inject runtime config script before </head> or </body> fallback; Rule: serve_filesystem_fallback rejects non-GET/HEAD requests before falling back to index.

### Examples
Manual verification: GET /yona/ renders landing page, GET /yona/api/auth/session returns CSRF response, POST /yona/rpc/.../ListProjects returns seeded pilot project data; scripts/run-db-matrix.ps1 runs cargo test --test db_matrix_env -- --nocapture after containers are ready.

## Facts
- **codegen_pipeline**: The Rust pilot sidecar compiles pilot.proto via connectrpc-build with vendored protoc. [project]
- **database_support**: SeaORM models back projects/issues for SQLite/Postgres/MySQL/MariaDB via migration m20260407_000001_create_pilot_tables. [project]
- **db_matrix_script**: scripts/run-db-matrix.ps1 orchestrates Postgres16, MySQL8, MariaDB11 containers and runs cargo test --test db_matrix_env. [convention]
- **asset_serving**: Filesystem asset mode injects runtime config for basePath, rpcBaseUrl, apiBaseUrl into frontend/dist HTML. [project]
