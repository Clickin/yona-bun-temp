# Bun.SQL + SQLBraid 1.0.0 experiment

This isolated feasibility spike is not a Yoram product port. It uses the shared `../package.json` and lockfile; `@sqlbraid/bun-sql`, core, runtime, template, and the PostgreSQL/MySQL/MariaDB/SQLite dialect packages resolve exactly to `1.0.0`.

## Commands and prerequisites

Run from `experiments/bun-port` with Bun `1.4.2`, revision `744846f844374847c902b5e7fd59b4342a51ef99`:

```sh
/tmp/yoram-bun-1.4.2/bun-darwin-aarch64/bun run sql/run.ts sqlite
BUN_PORT_SQL_DOCKER_CONTEXT=bun-port-disposable BUN_PORT_SQL_DOCKER_DISPOSABLE=1 /tmp/yoram-bun-1.4.2/bun-darwin-aarch64/bun run sql/docker-matrix.ts
```

The first command creates a new SQLite file under an OS temp directory and removes it on exit. It compares the final state with `sqlite3`; if that CLI is missing, the check is `BLOCKED`. The opt-in matrix requires an explicitly configured, dedicated disposable Docker context; it refuses the default context. It starts uniquely named PostgreSQL, MySQL, and MariaDB containers with fresh random databases and ephemeral `127.0.0.1` ports, compares final state with each container's native client, and removes only containers it started. It also runs SQLite. Docker daemon/image pulls, loopback connectivity, and `sqlite3` are prerequisites; unavailable infrastructure is `BLOCKED`.

`run.ts` emits one compact JSON line. `docker-matrix.ts` emits one compact JSON object with one result per selected dialect. Passwords and connection URLs stay in process environment and never appear in output. Do not pass existing DB URLs. No live Yona/Yoram DB, existing container, native app adapter, company golden data, or persistent fixture is used. This work environment has unrelated active containers and no dedicated disposable context; the three network DB scenarios therefore remain `BLOCKED` and were not started.

API assumptions verified from the published 1.0.0 declarations: import `createBunSqlDatabase` from `@sqlbraid/bun-sql`; pass the `Bun.SQL` client with explicit `{ dialect }`; each dialect root exports `sql.rows`/`sql.command`; query `.render()` exposes logical segments, ordered parameters, and an optional native template. Bun 1.4.2's constructor uses `{ bigint: true, max: 16 }` for network DBs and `{ adapter: "sqlite", filename, safeIntegers: true }` for the fresh SQLite file. Docker image tags are `postgres:16-alpine`, `mysql:8.4`, and `mariadb:11.4`; actual server versions are included in run evidence.

## Exercised contracts

- SQLBraid `query.render()` statement segments and observer SQL/transport; bind order, values, JS types, type hints, and SQL `NULL`; the rendered template is also executed through native `Bun.SQL`.
- Raw Bun.SQL and SQLBraid row values/types, explicit ordering, count, duplicate tuples, exact `BIGINT` and `DECIMAL` behavior, and `NULL` preservation. Unsupported/lossy decimal representation is `BLOCKED` with raw evidence.
- Native versus SQLBraid affected-row/insert-ID command metadata; nested savepoint rollback, outer rollback, commit, transaction observer phases, and final transaction rows.
- Sixteen concurrent high-water counter reservations above imported row 40, uniqueness, persisted values/counter, and complete final fixture state independently read by `psql`, `mysql`, or `sqlite3`.
- Server version and safe `BLOCKED`/`FAIL` results for unavailable DBs, CLIs, or adapter capabilities. Unsupported/ambiguous result metadata is never a pass.

## SQL text differences grounded in source

- `scripts/differential/db-projection.mjs` queries H2 with uppercase identifiers (`ISSUE`, `PROJECT`, `TITLE`, `AUTHOR_LOGIN_ID`) and substitutes an escaped project-name SQL literal. Its SQLite counterpart uses lowercase identifiers and `$project` binding. Aliases differ too (`authorLoginId` versus `author_login_id`) and are mapped in `scripts/differential/diff.mjs`.
- The legacy label projection uses `LEFT JOIN ISSUE_LABEL_CATEGORY`; SQLite uses an inner join. They agree only when each label has a category; orphan/null-category rows are a semantic difference.
- Legacy `Project.increaseLastIssueNumber` / `increaseLastPostingNumber` reads and updates a Java Project entity inside `AbstractPosting.save()`'s Ebean `@Transactional` operation. A stale counter may trigger a query ordered by `number DESC` and entity refresh. Rust `reserve_project_number` uses a transaction with a correlated `UPDATE ... CASE ... COALESCE(...MAX(number)...)`, then a separate `SELECT counter ... WHERE id = <bind>`, and commits. Rust `sql_placeholders` emits `$1` on Postgres and `?` on other SeaORM backends. Ebean delegates statement generation to the ORM; its emitted SQL is not present in source and is not fabricated here.
- The two allocators are textually different. They produce the same next number when the legacy high-water counter is valid; legacy's stale-counter guard compares the counter to collection size before selecting the highest number, while Rust always takes the maximum of the counter and existing rows. Fragmented/imported state can therefore diverge, and concurrency/rollback are separately measured rather than assumed equivalent.

## Existing differential projection limitations (read-only finding)

- Projected fields omit primary IDs, resource numbers, exact numeric/decimal columns, and command metadata. Issues retain only title/author/state, comments author/body, and labels name/category/color. The report summary retains `legacyRows`/`yoramRows` counts.
- `parseH2ShellOutput` splits display text on `|`, trims cells, and returns strings. It discards driver types and cannot reliably distinguish SQL `NULL` from its text spelling, preserve whitespace, or parse values containing delimiters.
- `queryLegacyH2` removes identical projected rows with a `Set`; this loses legitimate duplicate multiplicity along with Recover replay duplicates. The Yoram query does not perform the same deduplication.
- Projectors collapse title/comment whitespace, lowercase issue state/color, sort by title/body/category-name, and thus discard DB order. `diffProjections` checks tuple presence with `.some()`, so two identical rows versus one appears equal.

Safe correction: fetch typed rows instead of parsing H2 display text; encode SQL `NULL` explicitly; preserve exact integers/decimals as strings; compare tuple-count multisets when order is not contractual, and ordered arrays with explicit `ORDER BY` checks otherwise. Compare command metadata separately and never discard duplicate counts. This experiment does not edit the existing differential code.

## Evidence and unexecuted scenarios

Initial SQLite evidence remains historical failures (`artifact://66`, `artifact://67`) and is not rewritten. The post-fix run on 2026-09-23 returned `BLOCKED`: schema, SQL rendering/binding, row types, transaction/savepoint, concurrent reservation, and final database-state/`sqlite3` comparison passed; exact `DECIMAL(20,4)` remains `BLOCKED` because Bun.SQL returned lossy `1234567890123456.8` instead of `1234567890123456.7890`. The former runner `ReferenceError` and final-row comparison defect are fixed.
PostgreSQL/MySQL/MariaDB were not run because the only Docker context contains unrelated containers and no dedicated disposable context was authorized. These scenarios remain `BLOCKED`; no container was started. The Bun backend contract test, TypeScript typecheck, TanStack Start production build, and compiled executable smoke ran separately; none substitutes for the network database checks.
