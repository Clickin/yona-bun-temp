---
title: Legacy Schema Baseline
tags: []
keywords: []
importance: 50
recency: 1
maturity: draft
createdAt: '2026-04-09T10:15:51.792Z'
updatedAt: '2026-04-09T10:15:51.792Z'
---
## Raw Concept
**Task:**
Capture the legacy schema baseline manifest, migration script, persistence repo behavior, and schema-validation tests for the Rust migration effort.

**Changes:**
- Cataloged manifest/table list sourcing the persistence entity tree and excluding play_evolutions equivalents.
- Recorded the collapsed migration flow that splits statements on --> statement-breakpoint and drops tables safely during down.
- Summarized persistence repo wrappers that normalize identities, ensure admin/role tables, and sync favorite/recents caches.
- Described the schema foundation test suite that ensures manifest/snapshots, SeaORM modules, migration references, and dialect matrix coverage.

**Files:**
- yona-rust/crates/migration/legacy-final-schema-manifest.json
- yona-rust/crates/persistence/src/lib.rs
- yona-rust/crates/persistence/src/repo.rs
- yona-rust/crates/migration/dialect-compat-matrix.md

**Flow:**
Manifest/Snapshots -> Migration up/down script -> SeaORM persistence repos exposing legacy CRUD helpers -> Schema foundation tests verifying manifest, modules, migration, and dialect matrix.

**Timestamp:** 2026-04-09

## Narrative
### Structure
The legacy schema baseline spans four layers: the canonical manifest in crates/migration describing table definitions and relations, the collapsed migration that orchestrates backend-specific SQL, the SeaORM persistence layer (lib.rs/repo.rs) normalizing identities and exposing repository APIs, and the schema foundation tests that validate each artifact and the dialect compatibility matrix.

### Dependencies
Relies on the generated SeaORM module tree under crates/persistence, repo_types records instead of legacy tables, and the migration/src/lib.rs registration of m20260409_000001_create_legacy_start_schema.rs plus manifest-driven dialect snapshots.

### Highlights
Repository wrappers provide AppRepository, AppUserRepository, and DefaultLandingRepository with operations for n4user creation, identifier lookups, project/organization lifecycle management, membership/enrollment handling, favorite/recents syncing, and landing path settings; tests confirm manifest/catalog coverage, SeaORM module hygiene, migration references, and dialect matrix docs including Korean justification remarks.

## Facts
- **legacy_schema_location**: Legacy schema baseline is stored under yona-rust/crates/migration as a checked-in manifest plus dialect SQL snapshots documented in legacy-final-schema-manifest.json and dialect-compat-matrix.md. [project]
- **manifest_scope**: The manifest references the canonical entity tree at yona-rust/crates/persistence/src, uses cumulative drizzle migrations, and purposely excludes play_evolutions tables. [project]
- **migration_flow**: Migration m20260409_000001_create_legacy_start_schema.rs loads backend-specific SQL, strips comments, splits statements on --> statement-breakpoint, executes non-empty statements, and drops tables in reverse order in down with proper quoting. [project]
- **repo_capabilities**: Persistence repo.rs exposes AppRepository, AppUserRepository, DefaultLandingRepository, and helper conversions while handling user creation, lookups, project/organization lifecycle, membership, enrollments, favorites, recents, and landing paths. [project]
- **schema_tests**: tests/yona-rust-schema-foundation.test.mjs verifies manifest and SQL snapshots exist without play_evolutions, SeaORM module tree references repo_types and excludes legacy entities, migration/src/lib.rs references the collapsed baseline migration, and dialect-compat-matrix.md outlines pg/mysql/sqlite SQL results with Korean justification text. [project]
