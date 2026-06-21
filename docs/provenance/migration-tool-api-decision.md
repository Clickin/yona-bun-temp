# Migration Tool API Decision

Status: canonical decision
Date: 2026-06-13

## Decision

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
