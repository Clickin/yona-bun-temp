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

## Smoke Test

The test creates a tiny H2 database, runs the converter, and verifies copied rows in SQLite:

```sh
mvn -f tools/h2-to-sqlite/pom.xml test
```

If the local environment has no cached `org.xerial:sqlite-jdbc` dependency and network access is disabled, the command will fail during dependency resolution. The code is still ready to run with the exact command above once dependencies are available.

## What It Converts

- H2 user tables from one schema, `PUBLIC` by default
- Column names, common JDBC column types, `NOT NULL`, simple defaults, and primary keys
- Table data via batched JDBC reads and inserts
- Boolean values as SQLite `INTEGER` values `0` or `1`
- Date/time/timestamp values as text using the JDBC driver's string representation
- Binary/blob values as SQLite `BLOB`

## Limitations

- This is not a broad migration framework.
- It does not preserve foreign keys, indexes, unique constraints, check constraints, sequences, views, triggers, stored procedures, or H2-specific computed/generated columns.
- It does not transform legacy Yona data semantics or reconcile schema drift.
- It disables SQLite foreign key enforcement while loading data.
- It uses SQLite affinity types, so exact H2 numeric/date type fidelity is not guaranteed.
- It expects the source H2 database to be readable by the configured H2 JDBC driver.

For production migration, run this on a copy of the H2 database and inspect the generated SQLite file before using it with any runtime.
