---
children_hash: d258c99dd4792af3b424d8a51ef707b0f2c884f22a585418c924c54491120605
compression_ratio: 0.4558960074280409
condensation_order: 1
covers: [context.md, legacy_schema_baseline.md]
covers_token_total: 1077
summary_level: d1
token_count: 491
type: summary
---
# legacy_schema_baseline Overview
- **Scope**: Captures the manifest, migration scripts, SeaORM persistence contracts, and verification tests that define the legacy schema baseline for the Rust migration effort.
- **Layers** (see `context.md` and `legacy_schema_baseline.md` for detail):
  - **Manifest/Snapshots** (`yona-rust/crates/migration/legacy-final-schema-manifest.json`) define canonical table/entity lists, reference the persistence tree under `yona-rust/crates/persistence/src`, rely on drizzle migrations, and deliberately omit `play_evolutions`.
  - **Collapsed Migration Flow** (`migration/src/lib.rs` registering `m20260409_000001_create_legacy_start_schema.rs`) applies backend-specific SQL snapshots, strips comments, splits statements on `-->` breakpoints, executes non-empty statements upward, and drops tables in reverse order with quoted identifiers on rollback.
  - **SeaORM Persistence Repos** (`yona-rust/crates/persistence/src/lib.rs` and `repo.rs`) expose `AppRepository`, `AppUserRepository`, and `DefaultLandingRepository`, normalize identities, handle admin/role tables, and surface helper APIs for user creation, identifier lookups, lifecycle management, membership/enrollment updates, favorite/recents syncing, and landing path settings.
  - **Schema Foundation Tests** (`tests/yona-rust-schema-foundation.test.mjs`) assert manifest/snapshot coverage, SeaORM module hygiene via `repo_types`, migration registration, and dialect compatibility documentation (`yona-rust/crates/migration/dialect-compat-matrix.md` with PostgreSQL/MySQL/SQLite outcomes and Korean justification text).
- **Flows**: Manifest → Migration up/down script → SeaORM repos → Schema tests verify end-to-end consistency.
- **Key Facts**: Manifest and dialect matrix artifacts reside in `yona-rust/crates/migration`; persistence layer files are under `yona-rust/crates/persistence`; tests ensure all referenced artifacts exist and comply with legacy constraints.