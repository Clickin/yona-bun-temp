# SQLite Production Profile

This document defines when and how to run Yona on file-backed SQLite in
production, the connection/write-path profile that ships with the server, the
operational watch items, and the backup policy. It is the operator-facing
companion to the write-path changes in the parity-closure plan (WS7).

## When SQLite is the right database

| Workload | Verdict |
|---|---|
| ≤ 100 registered users, 10–30 active | SQLite (supported) |
| ≤ 5 write transactions/second sustained | SQLite (supported) |
| 10–20 write transactions/second bursts | SQLite (supported, watch the p99 alert below) |
| Dozens of writes/second automated load | Load-test first; SQLite is single-writer by design |
| Multi-replica / HA / shared-NFS deployments | PostgreSQL |
| DB file on NFS/SMB/distributed FS | Unsupported (SQLite requires POSIX file locking) |

Deployment ordering: **SQLite → PostgreSQL → MariaDB/MySQL**. SQLite is the
default for small single-node deployments; move to PostgreSQL when the
workload outgrows the table above or HA is required.

## Connection profile (file-backed only)

In-memory SQLite (`sqlite::memory:` — every unit/contract test) gets **none**
of this: no WAL, no pragmas, no pool tuning, no coordinator. The profile is
applied by `connect_database` in `crates/server/src/main.rs` only when the URL
is `sqlite:` **and** does not contain `:memory:` (`is_file_sqlite`).

- Journal mode: **WAL**
- Synchronous: **FULL** (default, durable) — see the balanced variant below
- `busy_timeout`: 5000 ms
- `foreign_keys`: ON
- `wal_autocheckpoint`: 1000 pages
- `journal_size_limit`: 64 MiB
- `cache_size`: −8192 (−8 MiB)
- Pool: `max_connections = 4`, `min_connections = 1`, `connect_timeout = 5 s`,
  `acquire_timeout = 5 s`

### Two durability profiles — never OFF

| Profile | Setting | Use |
|---|---|---|
| Durable (default) | `synchronous = FULL` | Default. Safe against power loss for committed transactions |
| Balanced | `synchronous = NORMAL` | Tune only if commit latency matters AND the host has battery-backed storage; WAL mode keeps crash safety of the last transactions at risk only up to the last checkpoint |

`synchronous = OFF` is never supported: it can corrupt the database on power
loss.

## Single-writer coordinator

File-backed SQLite gets a process-wide write coordinator: every top-level
write transaction (`begin_serialized_write`) takes a `tokio::sync::Mutex`
before `BEGIN` and releases it immediately after `COMMIT`. This serializes
concurrent writers so they cannot interleave on the WAL, and turns the
`SQLITE_BUSY` class of errors into a bounded queue.

- The guard is held **only** for BEGIN → DB work → COMMIT. Git/SMTP/webhook/
  file work that follows a commit happens **after** the guard is dropped
  (`commit_serialized_write` drops it before returning).
- Nested transactions (a repository bound to a `DatabaseTransaction`) and
  non-SQLite backends do not take the guard (no self-deadlock).
- PostgreSQL/MySQL connections never take the lock; their own MVCC handles
  concurrency.
- Reads are never serialized.

> Caveat: the `uq_pull_request_1` unique index ships as a regular migration,
> which the **Adopt** schema policy marks applied without executing on
> pre-existing legacy DBs. Legacy Yona never had this index either, so adopted
> DBs keep legacy behavior (concurrent pull-request creation can race on
> numbers); fresh/Up-policy DBs get the guard. If that changes, add the
> `unique_key = "uq_pull_request_1"` manifest attributes to the
> `pull_request.to_project_id`/`number` columns so the schema-adopt machinery
> emits the index.

The coordinator serializes the 7 explicit write-transaction sites
(`attachment`, `issue_label` ×2, `issue_relation`, `milestone`, `project`,
`site_admin`). Individual row inserts (issue/posting/pull-request creation)
are not wrapped in transactions; their per-project number allocation is
race-guarded by the `uq_*_1` unique indexes plus a bounded retry
(0..32 attempts, `MAX(number)+1` re-computed per attempt).

## Metrics & watch items

The server has no Prometheus/metrics subsystem; these are observable via
structured `tracing` logs (target `yoram_persistence::sqlite_write`).

| Watch item | Source | Alert threshold |
|---|---|---|
| `sqlite_write_transaction_duration_ms` | `commit_serialized_write` (debug) | write tx p99 > 100–200 ms |
| `sqlite_write_queue_wait_ms` | `begin_serialized_write` (debug) | sustained > 1 s implies write saturation |
| SQLite busy / locked occurrences | `begin_serialized_write`/`commit_serialized_write` warn on `database is locked`, `SQLITE_BUSY`, `BUSY_SNAPSHOT` | any occurrence after the soak baseline |
| `db_pool_acquire_duration` | pool acquire timeout (5 s) surfaces as 500s | any acquire timeout |

Enable with `RUST_LOG=yoram_persistence::sqlite_write=debug`.

## Backup policy

- **Never copy the live DB file** (`dev.db`/`yona.db` while the server runs) —
  WAL pages are not durable-consistent in a raw file copy.
- Use `VACUUM INTO '<backup.db>'` or the SQLite online backup API
  (`sqlite3_backup_init`) for consistent backups.
- **Daily**: backup + `PRAGMA optimize`.
- **Weekly**: `PRAGMA quick_check` (with the server stopped or on a restored
  copy).
- **Monthly**: restore test from the newest backup.
- Replicate backups off-host (the server host is a single point of failure).

## Soak gate

The SQLite-production-default **declaration** is gated on the write soak
(`scripts/sqlite-write-soak.mjs`): boot the dev backend against a fresh temp
file DB, 8 parallel workers × ~1 req/s issuing issue creates for 30+ minutes,
asserting zero `SQLITE_BUSY`/`SQLITE_BUSY_SNAPSHOT`/`database is locked`/HTTP
500 evidence. The profile and coordinator ship with the code; the
"SQLite is the supported production default" declaration waits for a clean
soak run. Record run outcomes (pass/fail, date, log path) in the changelog or
release notes alongside the soak evidence.

### Soak run history

| Date | Outcome | Detail | Log |
|---|---|---|---|
| 2026-08-03 (first) | FAIL | Route-level write transactions (`rest_create_issue`, `rest_import_site_data_payload`) used plain `db.begin()` outside the single-writer coordinator → concurrent read-then-write transactions collided: 10,862 HTTP 500s of 14,381 requests (`database is locked (SQLITE_BUSY / BUSY_SNAPSHOT)`). Root cause fixed by routing both through `begin_serialized_write`/`commit_serialized_write`; repro before/after under 8 workers × 20s: 21 ok/139 err → 160 ok/0 err. | `/var/folders/gz/2s4x2dyx1czdvm3gv6g4nty00000gn/T/yona-sqlite-soak-I4TgcV/sqlite-write-soak.log` |
| 2026-08-03 (relaunch) | PASS | 14,384 issues created over 1801s (8 workers), zero busy/5xx evidence; `journal_mode=wal` confirmed on the file DB. The SQLite-production-default declaration is now unblocked. | `/var/folders/gz/2s4x2dyx1czdvm3gv6g4nty00000gn/T/yona-sqlite-soak-2mE9Qu/sqlite-write-soak.log` |
