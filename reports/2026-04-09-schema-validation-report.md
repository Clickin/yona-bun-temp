# Yona Rust Schema Validation Report

Date: 2026-04-09

## Summary

- Overall result: `PASS`
- Canonical schema source: `crates/persistence/src`
- Manifest-validated tables: `62`
- Validation scope: full-table schema validation, startup schema policy (`up/adopt/validate_only`), env/TOML startup config, persistence regression, server request flow, SQLite/PostgreSQL/MariaDB matrix

## SQL Artifacts

- Schema manifest: [legacy-final-schema-manifest.json](../crates/migration/legacy-final-schema-manifest.json)
- MariaDB/MySQL DDL: [legacy-final-schema.mysql.sql](../crates/migration/legacy-final-schema.mysql.sql)
- PostgreSQL DDL: [legacy-final-schema.postgres.sql](../crates/migration/legacy-final-schema.postgres.sql)
- SQLite DDL: [legacy-final-schema.sqlite.sql](../crates/migration/legacy-final-schema.sqlite.sql)
- Artifact generator: [refresh-legacy-schema-artifacts.mjs](../crates/migration/scripts/refresh-legacy-schema-artifacts.mjs)
- Runtime baseline migration: [m20260409_000001_create_legacy_start_schema.rs](../crates/migration/src/m20260409_000001_create_legacy_start_schema.rs)
- Runtime entity-builder helper: [entity_schema.rs](../crates/migration/src/entity_schema.rs)
- Startup config loader: [runtime_config.rs](../crates/server/src/runtime_config.rs)

## Test Results

| Category                | Command                                                                                                                                         | Result                |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------- |
| JS contract             | `bun test tests/yoram-schema-foundation.test.mjs tests/yona-legacy-parity-gate.test.mjs`                                                    | `14 passed, 0 failed` |
| Startup config          | `cargo test -p yoram-server --test runtime_config_contract`                                                                           | `5 passed, 0 failed`  |
| Migration runtime guard | `cargo test -p yoram-migration --test runtime_schema_contract`                                                                        | `8 passed, 0 failed`  |
| Persistence regression  | `cargo test -p yoram-persistence --tests`                                                                                                   | `5 passed, 0 failed`  |
| Server regression       | `cargo test -p yoram-server --test auth_workspace_contract --test org_project_contract --test db_router_contract --test sqlite_smoke` | `7 passed, 0 failed`  |
| DB matrix               | `cargo test -p yoram-server --test db_matrix_testcontainers`                                                                          | `1 passed, 0 failed`  |

Total: `40 passed, 0 failed`

## Schema Validation Coverage

Validation was not limited to the active vertical slice. The following checks were executed against the full manifest:

- Table set equality: actual runtime schema tables vs. manifest tables
- Column set equality for every manifest table
- Nullability match for every manifest column
- Primary key match for every manifest column
- Full legacy baseline manifest includes `play_evolutions`
- Runtime required table set excludes `play_evolutions`
- Optional legacy table set allows `play_evolutions` to remain in adopted legacy databases but does not create it for fresh installs
- Startup policy coverage:
  - `up`
  - `adopt`
  - `validate_only`
- Startup migration behavior for:
  - empty database
  - already-baselined database
  - legacy pilot migration history
  - partially initialized unmanaged schema

Validated database backends:

- SQLite in-memory
- PostgreSQL via `testcontainers`
- MariaDB via `testcontainers`

## Sample DDL Evidence

### SQLite

```sql
CREATE TABLE `comment_thread_n4user` (
    `comment_thread_id` integer NOT NULL,
    `n4user_id` integer NOT NULL,
    PRIMARY KEY (`comment_thread_id`, `n4user_id`)
);

CREATE TABLE `linked_account` (
    `id` integer PRIMARY KEY AUTOINCREMENT,
    `user_credential_id` integer DEFAULT NULL,
    `provider_user_id` text DEFAULT NULL,
    `provider_key` text DEFAULT NULL,
    `provider_display_name` text DEFAULT NULL,
    `avatar_url` text DEFAULT NULL
);
```

### PostgreSQL

```sql
CREATE TABLE "comment_thread_n4user" (
    "comment_thread_id" bigint NOT NULL,
    "n4user_id" bigint NOT NULL,
    PRIMARY KEY ("comment_thread_id", "n4user_id")
);

CREATE TABLE "user_credential" (
    "id" bigserial,
    "user_id" bigint DEFAULT NULL,
    "login_id" varchar(255) DEFAULT NULL,
    "email" varchar(255) DEFAULT NULL,
    "name" varchar(255) DEFAULT NULL,
    "active" smallint DEFAULT 0
);
```

### MariaDB / MySQL

```sql
CREATE TABLE `comment_thread_n4user` (
    `comment_thread_id` bigint NOT NULL,
    `n4user_id` bigint NOT NULL,
    PRIMARY KEY (`comment_thread_id`, `n4user_id`)
);

CREATE TABLE IF NOT EXISTS `n4user` (
    `id` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` varchar(255) DEFAULT NULL,
    `login_id` varchar(255) DEFAULT NULL
);

CREATE TABLE IF NOT EXISTS `project` (
    `id` bigint NOT NULL AUTO_INCREMENT PRIMARY KEY,
    `name` varchar(255) DEFAULT NULL,
    `overview` varchar(255) DEFAULT NULL,
    `vcs` varchar(255) DEFAULT NULL,
    `siteurl` varchar(255) DEFAULT NULL,
    `owner` varchar(255) DEFAULT NULL
);
```

## Notes

- `db_matrix_testcontainers` requires Docker access because PostgreSQL and MariaDB are validated through Rust `testcontainers`.
- The runtime path uses `Migrator::ensure_runtime_schema()` and no longer depends on `sea-orm-cli` execution during application startup.
- Runtime migration now creates schema from the entity-builder path in `entity_schema.rs`; SQL artifacts remain audit/reference material.
- Startup config now supports `YONA_CONFIG_TOML` and optional `yona.toml` in the working directory, with environment variables taking precedence over TOML values.
- Supported schema policies are `up`, `adopt`, and `validate_only`.
- `play_evolutions` remains in the full legacy manifest but is treated as an optional legacy table for adoption/validation and is not created in fresh runtime installs.
- Full DDL review should be done from the SQL artifacts linked above; the snippets in this report are evidence samples, not the complete schema.
