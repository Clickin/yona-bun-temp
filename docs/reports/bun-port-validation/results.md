# Bun backend validation results

Status: feasibility spike complete for local scenarios; external-service and long-run checks remain blocked, failed, or pending. This is not product parity approval.

## Runtime and API

- Runtime: Bun `1.4.2`, revision `744846f844374847c902b5e7fd59b4342a51ef99`; SQLBraid packages remain pinned to exactly `1.0.0`.
- Backend API: tRPC Fetch adapter + SuperJSON only. Hono was removed from the experiment manifest and lockfile; Elysia was not added. TanStack Start remains the React SSR/server-routes shell and its route modules correctly use `@tanstack/react-router` APIs because Start is powered by Router.
- `bun run check:runtime && bun run test`: **PASS**, 5 contract tests / 30 assertions. Covers synthetic credential/session establishment and sign-out, HttpOnly/CSRF cookies, private-project ACL, CSRF rejection, BigInt/Date/NULL/undefined/precise timestamp serialization, issue create/outbox persistence, and oversized-body rejection.
- `bun run typecheck`: **PASS** after Start generated the route tree. The issue-detail route uses `loaderDeps` for validated search state.
- `bun run build:web`: **PASS**.
- `bun run build:standalone`: **PASS**. Vite builds Start's client/server output; the standalone executable embeds the generated JS/CSS client assets. The executable was copied alone into a fresh temporary directory and served the login page and `/api/trpc/runtime.info`; browser requests for embedded assets returned HTTP 200. The runtime endpoint reported the pinned Bun version/revision.
- Browser smoke: login, Start data-only issue list/detail navigation, BigInt/Date/null/undefined display, tRPC issue mutation/refetch, and literal `<script>` title rendering were exercised. The XSS marker was not executed. The browser screenshot helper timed out, so no screenshot is claimed; DOM/network observations were used.

## SQLBraid / Bun.SQL

- Command: `bun run sql/run.ts sqlite`.
- Overall: **BLOCKED** by one supported-contract gap; do not treat as PASS.
- **PASS**: fresh SQLite schema, SQLBraid/native command metadata, ordered bindings and SQL `NULL`, exact BIGINT-as-text probe, duplicate multiplicity and typed rows, nested savepoint/rollback, 16 concurrent number reservations, persisted counter, and final DB state compared with native `sqlite3`.
- **BLOCKED**: exact `DECIMAL(20,4)`. Both Bun.SQL and SQLBraid returned `1234567890123456.8`; expected exact value was `1234567890123456.7890`. No alternate driver or normalization was used.
- Fixed harness defects exposed by the rerun: final CLI comparison had stripped trailing empty columns; an obsolete `finalOk` reference raised `ReferenceError`. The final state check now passes.
- PostgreSQL, MySQL, and MariaDB: **BLOCKED / NOT_RUN**. The available `orbstack` Docker context contains unrelated active containers and is not an authorized disposable context. No containers were started.
- Earlier captured SQLite failures remain historical evidence (`artifact://66`, `artifact://67`); they were not rewritten as passes.

## SCM

- Git Smart HTTP: **PASS**. `bun run scm/git/reproduce.ts` completed native push/binary clone, protocol v2 observation, read/write denial, pre-receive rejection, disconnect cancellation, timeout cancellation, process/pipe cleanup, and fixture removal. Final counts: 11 backends started/reaped; active backends and pipes were zero. Fixed the harness revision check to use `Bun.revision`; the prior `process.execPath --revision` comparison only exposed Bun's short revision.
- Native `svn://` via `svnserve`: **FAIL** at initial `info` with SVN exit 1 and codes `E170013,E170001`. Later protocol scenarios are **NOT_RUN**; server/repository cleanup passed. The harness syntax error found before the run was corrected. No raw stderr or credentials were saved.
- Apache DAV: **BLOCKED / NOT_RUN**. Requires an authorized disposable Docker context and a local Apache DAV image; neither was available.
- Bun-owned SVN handlers: not implemented and not demonstrated by the native `svnserve` result.
- Git/SVN SSH: intentionally **BLOCKED / deferred** under the user-directed scope correction. No SSH dependency, server, key, or outbound-only substitute was used.

## Trusted plugins

- `bun run plugins/demo.ts --plugin-dir "$PWD/plugins/external"`: **PASS**. Observed rollback silence, post-commit event delivery/retry/deduplication, ACL/project checks, Date-valued extension response, lifecycle disposal, checksum/API-version/missing-entrypoint/directory errors.
- Compiled host plus a separately copied external plugin artifact: **PASS**. The compiled host loaded the external artifact from the supplied local directory and completed the same scenarios.
- This is trusted same-process code, not a sandbox. Dynamic extensions do not modify the static tRPC `AppRouter`.

## Packaging, offline operation, and resources

- Bun standalone executable with embedded current JS/CSS assets: **PASS** on macOS arm64. Cross-platform Linux/Windows builds were not run.
- nginx-containing Docker image: **BLOCKED / NOT_RUN**; no disposable Docker daemon/context was authorized. No image digest or packaged Docker runtime version is claimed.
- The current generated asset set is JS/CSS; the embedding step fails closed on other file types instead of silently omitting them. Add a binary asset loader before introducing images/fonts.
- Project data offline export/import, interruption/re-import/recovery: **NOT_RUN**. Legacy `MigrationApp.java`/`DataService.java` and Rust's checkpointed site import/export were inspected, but this Bun spike implements no matching transfer API. Plugin artifact loading is a separate local-filesystem scenario and is not a substitute.
- Short unprofiled standalone snapshot after the DB-client deduplication: after browser login/issue load RSS was `120,560 KiB` with 16 `lsof` rows; after 12 seconds idle, `46,784 KiB` and 11 rows. After 64 concurrent unauthenticated session reads, `56,512 KiB` and 17 rows; after 12 seconds idle, `56,512 KiB` and 11 rows. One local macOS process only; this is not a leak/soak conclusion.
- 24-hour mixed-load resource soak: **PENDING_LONG_RUN**. No profiler-based or normal-operation long-run conclusion is claimed.

## Baseline and sensitive-data handling

- Pre-change root baselines remain as recorded in `environment.md`; the existing CSS cascade failure is not attributed to this experiment.
- All new DB/SCM/plugin fixtures were synthetic and temporary. No company/golden data, real user keys, production service, raw logs, or credentials were committed.
