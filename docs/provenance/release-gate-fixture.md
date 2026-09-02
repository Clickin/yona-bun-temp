# Phase 6 release-gate flow — fixture consumption and preflight implementation

Status: implemented gate evidence (2026-08-24), not final parity or release
authorization. Preflight lives in
`crates/yona-migrate/src/preflight.rs` (subcommand `yona-migrate preflight`, wired in
`main.rs`; `validate_schema_against_manifest` in `crates/migration/src/lib.rs` was made
`pub` for reuse). Gate script: `scripts/release-gate.mjs`, wired as npm
`test:release-gate`. The original gap analysis this implementation closes is kept at the
bottom for reference.

This existing migration/deployment gate may be reused for evidence, but it does
not authorize a release from `yona-bun-temp`; release is only from a new
canonical repository after the Phase 0 closure contract is satisfied.

## Fixture to consume

`fixtures/legacy-yona-1.16/` (see `META.md` there for provenance):
golden dump `legacy-yona-mariadb-dump.sql` + physical `YONA_DATA/`
(repo/git/kris/sample-app.git, repo/git/kris/private-tools.git, repo/svn/orbit/orbital-svn,
uploads/{hash}). Dump contains `CREATE DATABASE yona; USE yona;` — loading it via the
docker entrypoint mount or plain `mariadb < dump.sql` both work.

## Gate flow (target)

Base to extend: `scripts/smoke-legacy-mariadb-dump.mjs` already implements
container+dump → `YONA_SCHEMA_POLICY=validate_only` boot → `adopt` boot → light probes
(env-driven policy flags on `yoram`; binary at `target/debug/yoram`). The new gate adds:

1. **BEFORE snapshot** (after loading the dump, before any Yoram boot):
   - domain table counts (`n4user`, `project`, `issue`, `issue_comment`, `posting`,
     `milestone`, `attachment`, …),
   - selected row values (user password hash/salt, issue titles/states, attachment hashes),
   - `git -C repo/git/{o}/{p}.git for-each-ref` per repository,
   - `svn info` youngest revision per SVN repository,
   - sha256 of every file under `uploads/`.
2. Start mariadb container with the golden dump loaded.
3. Run **preflight** — must pass:
   `yona-migrate preflight --db-url mysql://root@127.0.0.1:<port>/yona --data-root fixtures/legacy-yona-1.16/YONA_DATA`
4. Boot Yoram `validate_only` → assert boot OK and `seaql_migrations` still absent.
5. Boot Yoram `adopt` → assert `seaql_migrations` populated.
6. **AFTER snapshot** — assert identical domain counts/values, identical git refs / SVN
   youngest revision / upload digests. Only schema-metadata deltas allowed.
7. HTTP assertions: legacy-hash user login OK (optional argon2id silent rewrite when
   configured), issue/comment/project/board pages render, mutation flows work, attachment
   download bytes identical to `YONA_DATA/uploads/<hash>`.

## Preflight usage and behavior (verified)

```sh
cargo build -p yona-migrate
yona-migrate preflight --db-url mysql://root@127.0.0.1:33061/yona \
                       --data-root fixtures/legacy-yona-1.16/YONA_DATA [--strict]
```

- Golden fixture → `0 blocking, 0 error(s), 0 warning(s)`, exit 0.
- Orphan repo dir with no DB project → `[WARNING] … (--strict would escalate this)`,
  exit 0; same state under `--strict` → `[ERROR]`, exit 1.
- Expected repo removed/invalid → `[BLOCKING ERROR] MISSING/INVALID git repository…`, exit 1.
- BOTH canonical stores present for one project → `[ERROR] … BOTH canonical Git and SVN
  repositories`, exit 1.
- Leftover `repo/.staging/<uuid>` → `[BLOCKING ERROR] interrupted repository operation`, exit 1.
- Malformed password hash → `[WARNING] user <id>: unrecognized password hash shape`, exit 0.
- Attachment row without `uploads/{hash}` or size mismatch → `[WARNING]`.
- Schema drift vs manifest → BLOCKING; broken `play_evolutions` history (non-applied rows /
  last_problem set) → ERROR; missing table entirely → WARNING.
- Every finding is printed as `[WARNING|ERROR|BLOCKING ERROR] <message>`, then a summary
  line; exit code follows the plan contract.

## Gate run (verified)

```sh
pnpm test:release-gate          # builds yoram if needed; YONA_GATE_SKIP_BUILD=1 to skip
```

Verified result at implementation time:

- preflight pass, validate_only left `seaql_migrations` absent, adopt created it
  (`m20260409_000001_create_legacy_start_schema`);
- BEFORE/AFTER snapshots identical: all domain counts, selected row values
  (passwords/salts, issue rows, attachment hashes/sizes), git refs per repo, SVN youngest
  revision + UUID, sha256 of every uploads file;
- HTTP: legacy SHA-256-hash user `kris` signed in with `legacy-gate-pass`;
  `/kris/sample-app`, `/kris/sample-app/issue/1`, `/kris/sample-app/board/1` rendered;
  comment mutation via `POST /api/v1/projects/kris/sample-app/issues/1/comments` worked;
  `GET /files/6002` bytes identical to `YONA_DATA/uploads/a3d98c9e…`.

## Gap list — existing preflight vs plan Phase 6 item 2

What exists today in `crates/yona-migrate/src/main.rs`:

- There is **no `preflight` subcommand**. What exists is an internal function
  `preflight_repositories()` (main.rs:948–1034) that runs only inside the *in-place branch*
  of `transfer_repositories()`, i.e. it requires a full legacy export context
  (`--from-file/--from-db-url/...`) plus `--yoram-data-root`. It cannot be invoked
  standalone against just a DB URL and data root. Gaps:
  1. **Standalone CLI**: add a real `preflight` subcommand taking `--db-url` +
     `--data-root`, querying project rows directly instead of deriving them from an
     export payload.
  2. **Schema manifest validation**: not called from migrate at all;
     `validate_schema_against_manifest` exists in `crates/migration/src/lib.rs:418`
     (used by server validate/adopt policies) — reuse it rather than duplicating.
  3. **Evolution history check**: no `play_evolutions` / `seaql_migrations` inspection.
     Fixture now carries 32 `play_evolutions` rows (state `applied`) to validate against;
     decide expected state per mode (pre-adopt: play_evolutions present, seaql_migrations absent).
  4. **DB↔filesystem consistency, both directions**: current check only walks DB→FS
     ("project row ⇒ repo exists+valid"). Missing FS→DB orphan detection (filesystem repo
     with no referring project) and the BOTH-stores-exist case (git+svn canonical dirs both
     present for one active project) which plan classifies ERROR.
  5. **Severity model**: today any failure = `anyhow::bail!` (exit 1, all blocking). Needs
     BLOCKING ERROR / ERROR / WARNING classification with the exit-code contract:
     default mode exits 0 when only WARNINGs exist (printed, non-blocking); non-zero iff
     ≥1 BLOCKING/ERROR; `--strict` promotes selected warnings (notably orphans) to errors.
  6. **Interrupted staging**: no check for leftover `repo/.staging/*` (plan: BLOCKING).
  7. **Attachment advisory**: no check of attachment rows → `uploads/{hash}` existence +
     size match vs `attachment.size` (advisory WARNING; authoritative byte identity stays
     with the gate's before/after sha256 comparison). Avatar files same treatment.
  8. **Password-hash sanity**: no validation that `n4user.password` looks like legacy
     SHA-256 base64 (44 chars) or bcrypt `$2[xy]$` format; fixture provides both shapes.
  9. **SVN validity depth**: current SVN check is only "format marker is a file"; consider
     also reading the `db/current` revision or running `svnadmin info` where available
     (fixture repo has 3 revisions to exercise this).

Non-goals carried over: do NOT touch `crates/**` while the differential sweep agent holds
the workspace; implement gaps after it lands.
