# Bun backend validation decision

## Decision

**REVISE_AND_RETEST** before adopting any Bun backend path for product porting. The spike demonstrates local feasibility, not a product-runtime replacement or parity approval.

Use **tRPC Fetch adapter + SuperJSON** as the only backend application API framework in this experiment. Remove Hono; do not add Elysia. `Bun.serve` is the native listener, not a second framework. TanStack Start is the web SSR/server-routes framework. `@tanstack/react-router` imports are intentional: the official [TanStack Start overview](https://tanstack.com/start/latest/docs/framework/react/overview) says Start is powered by and relies 100% on TanStack Router for routing. The code uses Start's Vite plugin, `createStart`, `createServerFn`, Start server routes, and Router route primitives.

The standalone Bun executable with embedded JS/CSS client assets, session/RPC contract, browser route loading, Git Smart HTTP fixture, and trusted plugin demo all ran locally. Do not promote the combination while SQLBraid exact-decimal behavior is lossy, three network dialects are unrun, the native SVN harness fails at `info`, and Docker/offline import/long-run evidence is missing.

## Porting evidence: Yona → Rust → Bun

| Slice | Legacy behavior source | Rust evidence | Bun spike result / porting direction |
| --- | --- | --- | --- |
| Authentication | `yona-original/app/controllers/UserApp.java`, `models/User.java` | `crates/server/src/routes/auth.rs`, `crates/server/src/password.rs` | Synthetic legacy SHA-256 and bcrypt account fixtures authenticate; session cookie, CSRF cookie, origin, revocation, and locked-account behavior are exercised through tRPC. Port account-state and password-upgrade rules; do not copy hashes or session data between environments. |
| Issue authorization/read | `yona-original/app/controllers/IssueApp.java`, `IssueApi.java`, `models/Issue.java`, `models/support/SearchCondition.java`, `utils/AccessControl.java` | `crates/server/src/routes/issues.rs`, `crates/persistence/src/repo/issue_list.rs`, `crates/server/tests/issue_core_contract.rs` | Synthetic public/private project reads and owner checks pass in the tRPC contract. Preserve project ACL at the application/domain boundary, not only in route code. |
| Issue mutation/number/outbox | `yona-original/app/controllers/IssueApp.java`, `models/Project.java`, `models/Issue.java` | `crates/persistence/src/repo/issue_mutation.rs`, issue contract tests | Create/update, CSRF, outbox persistence, and issue number transaction smoke pass on isolated SQLite. Port atomic counter/outbox behavior; the spike does not cover comments, labels, attachments, search, PRs, or notifications. |
| SQL boundary | Legacy Ebean query/transaction paths in the above issue models/controllers | SeaORM repositories and `crates/persistence/src/repo/issue_mutation.rs` | SQLBraid 1.0.0/Bun.SQL typed bindings, NULLs, large integer text, savepoints, rollback, final SQLite state, and concurrent numbering pass. Exact SQLite DECIMAL is blocked; PostgreSQL/MySQL/MariaDB are blocked by the unavailable disposable Docker context. Keep the product path on Bun.SQL if retested; do not mask adapter behavior with another driver. |
| Site import/export | `yona-original/app/controllers/MigrationApp.java`, `app/data/DataService.java` | `crates/server/src/routes/exports.rs`, `crates/migration/src/import_checkpoint.rs`, `crates/persistence/src/repo/site_import.rs` | **NOT_RUN**. The Bun spike has no matching site-transfer route; local plugin artifact loading does not exercise project-data export/import or checkpoint recovery. Adding that vertical slice would exceed this representative backend feasibility scope. |
| Git transport | Legacy Yona Git route/controller and native Git protocol behavior | `crates/server/src/smart_http.rs`, `crates/vcs/src/lib.rs`, `crates/server/tests/smart_http_contract.rs` | Native Git Smart HTTP reproduction passes push/clone, protocol v2, ACL denial, hook rejection, cancellation, timeout, and cleanup against a temporary bare repository. This validates a transport candidate, not a complete Yona repository/authorization port. |
| SVN transport | Legacy SVN route/model behavior | `crates/server/src/svn_protocol.rs`, `crates/server/tests/svn_protocol_contract.rs` | The native `svnserve` harness fails at `info`; later scenarios are not run. Apache DAV is blocked, Bun-owned inbound SVN is absent, and SSH is deliberately deferred. Do not infer Bun SVN support from a native daemon. |
| Extensions | No legacy product parity claim | Rust extension/integration sources are comparison points only | Two trusted same-process examples pass lifecycle, ACL, commit-after-transaction delivery, retry/deduplication, Date, checksum, and API-version scenarios in a temporary fixture. This is not sandboxing, not an installed product plugin system, and dynamic plugins do not modify the static tRPC `AppRouter`. |

## Required before reconsidering adoption

1. Retest exact SQLite decimal representation on a Bun.SQL/SQLBraid path that preserves the declared value; keep the current `BLOCKED` result until proven.
2. Run PostgreSQL, MySQL, and MariaDB only in an explicitly authorized dedicated disposable Docker context, preserving typed-row and native-client comparisons.
3. Diagnose and rerun the `svnserve` `info` failure; separately authorize/provision Apache DAV only if that candidate is still needed. Revisit SSH only after Bun support issue #4290 is resolved and the user authorizes it.
4. Validate the nginx Docker image in a dedicated disposable context, including trusted forwarded-origin/TLS behavior, process shutdown, and the embedded runtime version.
5. Implement or connect the actual project export/import path before claiming offline interruption/re-import recovery; run the ≥24-hour resource soak with profiling disabled and record it as `PENDING_LONG_RUN` until completed.
6. Re-run the relevant browser/API and packaging checks after any adapter/version change. Keep product parity, release, and migration decisions separate from this experiment.
