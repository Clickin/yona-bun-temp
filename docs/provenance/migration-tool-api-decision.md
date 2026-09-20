# Migration Tool API Decision

Status: canonical decision updated 2026-09-18; the 2026-06-13 decision below is superseded historical evidence.
Date: 2026-09-18
Original decision date: 2026-06-13

## Current decision

- Large legacy installations use the separate `yona-migrate --from-db-url`
  direct-database path into an empty, separate target database and data root.
  Golden-fixture-scale API migrations have timed out in actual use; API
  extraction is not the default for this workload.
- The implemented MariaDB/MySQL path reads a consistent, read-only source
  snapshot, preserves application IDs and relationships, and verifies copied
  database rows, attachment bytes, and Git/SVN repository integrity. It does
  not modify the source or make a partial target safe to boot.
- Small SI projects retain a separate API-based workflow for bringing their
  work into an existing internal project. Identity mapping, collision policy,
  merge scope, and retry behavior remain explicit Track B decisions, not an
  already-implemented merge guarantee.
- Compatibility with legacy external APIs belongs in the migration CLI.
  Neither broad legacy runtime endpoints nor Yoram-to-Yoram migration are
  replacement requirements.
- The small direct-migration fixture passed import and application mutation
  checks. The large fixture remains blocked: both the supplied source and its
  original archive contain the same corrupt Git pack. Exact row/file copies
  into a quarantined target do not constitute a successful migration; a
  healthy source backup is required.

The current execution contract and evidence are in `SPEC.md` section 5.4 and
`docs/plans/2026-09-18-yona-replacement-execution.md`. Everything below is
preserved historical rationale, not the current migration default.

## Historical decision (2026-06-13; superseded)

Use a separate migration tool with adapters:

- Source adapter for legacy Yona: read from the existing legacy
  `/-_-api/v1/**` endpoints where those endpoints already exist.
- Target adapter for Rust Yona: import through Rust-owned migration/import
  surfaces, primarily the existing site-admin `yobi-data` import/export path or
  a tool-local file format handled by `crates/migration`.
- Do not mount the broad legacy `/-_-api/v1/**` surface in the Rust app server,
  except for the already app-owned helpers documented in
  `docs/provenance/legacy-external-api.md`.

This is not a new product API. It is a compatibility bridge for migration.

Legacy outbound GitHub migration is a different direction. The legacy
`/migration` UI reads Yona data and writes to GitHub API endpoints from the
browser. It is evidence-backed by
`docs/provenance/github-migration-decision.md`, but it is not the default
legacy-Yona-to-Rust migration path and must not be mounted in the Rust app
runtime.

## Rejected Options

### Direct DB-to-DB connection as the default

Rejected as the default path.

It is fast, but it makes the migration tool own too much operational state:
JDBC/SQL driver distribution, legacy H2/MySQL/PostgreSQL differences, schema
drift, deployment network access, credentials, and row-level interpretation of
legacy application semantics. It can remain an optional expert/offline adapter
later, but not the default migration contract.

### Separate clean API for both legacy and Rust

Rejected for legacy Yona.

Legacy Yona instances cannot expose a new clean API without being upgraded
first, so the tool would still need the old legacy endpoint adapter. Building a
second full API on the Rust side also duplicates app behavior and increases the
parity surface.

### Broad legacy API compatibility in the Rust app server

Rejected as the default.

It is the easiest short-term implementation, but it permanently imports legacy
external API shape into the Rust runtime surface. That conflicts with the REST
app API boundary in `SPEC.md` and makes future app behavior harder to reason
about.

## Practical Contract

The migration tool should have explicit source/target modes:

| Mode | Reads from | Writes to | Notes |
| --- | --- | --- | --- |
| `legacy-api -> yobi-data` | Existing legacy Yona `/-_-api/v1/**` export/import helpers | Local `yobi-data` package | Default online extraction path for old Yona instances. |
| `yobi-data -> rust-site-import` | Local `yobi-data` package | Rust `/sites/import` or equivalent site-admin import path | Default Rust import path; keeps app-server API small. |
| `h2 -> sqlite` | Legacy H2 JDBC | SQLite file | Already handled by `tools/h2-to-sqlite`; this is a DB conversion bridge, not the main app migration API. |
| `db -> yobi-data` | Legacy DB connection | Local `yobi-data` package | Optional future expert mode only if driver packaging and schema-version checks are explicit. |
| `yobi-data/source-export -> github` | Legacy-style Yona export payloads | GitHub API with mocked fixtures in tests | Optional outbound destination adapter only if the legacy GitHub migration feature is revived; not required for Rust import. |

## Consequences

- Existing legacy Yona instances can be migrated without patching the old
  server because the tool uses legacy endpoints already present there.
- Rust Yona does not need to implement the broad legacy `/-_-api/v1/**`
  runtime surface.
- Mapping and validation live in `crates/migration` and tool code, where
  version-specific compatibility belongs.
- The already implemented app-owned helpers remain app-owned:
  `hello`, favorite helpers, translation, and the watcher list helper.
