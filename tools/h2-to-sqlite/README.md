# H2 to SQLite Converter

Standalone offline Java CLI for converting a legacy H2 database into a SQLite database. This tool is intentionally separate from the Yona server runtime; it does not add H2 compatibility to the Rust application.

## Prerequisites

- JDK 17 or newer
- Maven 3.9 or newer
- Network access on first build unless the Maven dependencies are already cached locally

The converter uses the legacy Yona H2 JDBC driver version, `com.h2database:h2:1.3.176`, to match `yona-original/build.sbt`.

## Build

```sh
mvn -f tools/h2-to-sqlite/pom.xml package
```

The packaged CLI is written to:

```text
tools/h2-to-sqlite/target/h2-to-sqlite-0.1.0.jar
```

## Usage

```sh
java -jar tools/h2-to-sqlite/target/h2-to-sqlite-0.1.0.jar \
  --h2-url 'jdbc:h2:/path/to/yona;AUTO_SERVER=FALSE' \
  --sqlite /path/to/yona.sqlite \
  --user sa \
  --password '' \
  --schema PUBLIC
```

Use `--overwrite` to replace an existing SQLite file:

```sh
java -jar tools/h2-to-sqlite/target/h2-to-sqlite-0.1.0.jar \
  --h2-url 'jdbc:h2:/path/to/yona;AUTO_SERVER=FALSE' \
  --sqlite /path/to/yona.sqlite \
  --overwrite
```

## SQLite Adopt Handoff

The generated SQLite file is not considered imported until the Rust runtime
schema validator accepts it. The bridge emits lower-case SQLite table and
column identifiers because the Rust adopt validator compares SQLite metadata
against the current lower-case legacy schema manifest. Run validation first,
then start with adopt mode:

```sh
YONA_DATABASE_URL='sqlite:/path/to/yona.sqlite' \
YONA_SCHEMA_POLICY=validate_only \
target/release/yona-rust-pilot-server
```

```sh
YONA_DATABASE_URL='sqlite:/path/to/yona.sqlite' \
YONA_SCHEMA_POLICY=adopt \
target/release/yona-rust-pilot-server
```

If validation fails, do not start with `adopt`; treat the converter output as an
offline artifact to inspect or repair. The converter is a JDBC table-copy bridge
only, so the same SQLite schema compatibility rules in `SPEC.md` Section 5.1
remain authoritative.

The bridge does not write `seaql_migrations`. A successful `validate_only` run
must leave that table absent, and the first successful `adopt` run is what marks
the current Rust baseline as applied. Legacy Play evolution history, when
present, is copied as the optional `play_evolutions` table and is not a
substitute for the Rust migration marker.

## Smoke Test

The test creates deterministic H2 databases, runs the converter, and verifies
copied rows plus the SQLite identifier/default/primary-key shape required by
the current adopt handoff:

```sh
mvn -f tools/h2-to-sqlite/pom.xml test
```

If the local environment has no cached `org.xerial:sqlite-jdbc` dependency and network access is disabled, the command will fail during dependency resolution. The code is still ready to run with the exact command above once dependencies are available.

## What It Converts

- H2 user tables from one schema, `PUBLIC` by default
- Lower-case SQLite table and column identifiers, common JDBC column types,
  `NOT NULL`, simple defaults, and primary keys
- Table data via batched JDBC reads and inserts
- Boolean values as SQLite `INTEGER` values `0` or `1`
- Date/time/timestamp values as text using the JDBC driver's string representation
- Binary/blob values as SQLite `BLOB`

## Limitations

- This is not a broad migration framework.
- It does not preserve foreign keys, indexes, unique constraints, check constraints, sequences, views, triggers, stored procedures, or H2-specific computed/generated columns.
- It does not transform legacy Yona data semantics or reconcile schema drift.
- It does not prove a converted production database is adoptable by itself. The
  converted database must still have the full table/column/nullability/primary
  key shape expected by the current Rust schema manifest.
- It disables SQLite foreign key enforcement while loading data.
- It uses SQLite affinity types, so exact H2 numeric/date type fidelity is not guaranteed.
- It expects the source H2 database to be readable by the configured H2 JDBC driver.

For production migration, run this on a copy of the H2 database and inspect the generated SQLite file before using it with any runtime.

## Current Release Check

- 2026-06-21: the release-check test covers row copy, boolean normalization,
  primary keys, `NOT NULL`, simple defaults, lower-case SQLite identifiers,
  absence of a prewritten `seaql_migrations` marker, and preservation of the
  optional legacy `play_evolutions` table used by the current SQLite
  `validate_only` then `adopt` handoff.
