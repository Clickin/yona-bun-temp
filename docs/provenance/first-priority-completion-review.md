# First-Priority Completion Review

> Status: active completion review for the current first-priority conversion scope.
> Source of truth remains `AGENTS.md`, `SPEC.md`, and `docs/provenance/core-parity-audit.md`.

Last updated: 2026-06-17

## Scope

This review covers the `SPEC.md` Phase 1-6 first-priority app-runtime conversion goal: Git issue management plus board/posting, PR/review, search, notification, webhook, admin app surfaces, runtime settings compatibility, migration/adopt baseline, single-binary serving, and Docker image viability.

It does not reclassify second-priority or explicitly separated scopes as complete:

- LDAP and full OAuth provider login/linking remain deferred second-priority scope.
- Broad legacy external `/-_-api/v1/**` compatibility remains migrator/export/import scope except for the direct app-owned helper rows documented in `SPEC.md` and `docs/provenance/legacy-external-api.md`.
- Broader SVN VCC/baseline PROPFIND edge completeness remains a VCS follow-up beyond the implemented app-runtime SVN boundary and external-client smoke coverage.
- Full-text/index-backed search, dynamic i18n switching, optional webhook signature compatibility, and production migration/import hardening remain follow-up/deferred boundaries unless `SPEC.md` changes.

## Completion Matrix

| Requirement | Current evidence | Review status | Required closure evidence |
| --- | --- | --- | --- |
| FG-01 through FG-18 Phase 1-6 app-runtime features implemented | `docs/provenance/core-parity-audit.md` rows are no longer marked `missing`, `semantic-drift`, or `ux-drift`; `docs/provenance/legacy-porting-progress.md` marks the first-priority app-runtime audit closed. | Evidence present; keep under review | Run the parity gate and maintain no active non-deferred audit rows. |
| Legacy route status, core HTML shell, and data-shape parity evidence recorded | `core-parity-audit.md`, phase plan entries, and focused contract/frontend tests map legacy sources to Rust/frontend owners. | Evidence present; keep under review | Keep `node tools/yona-parity-gate.mjs docs/provenance/core-parity-audit.md` green. |
| Same-phase gaps either implemented or reclassified | Current remaining named items are documented as deferred, migrator, hardening, or follow-up boundaries instead of active same-phase blockers. | Evidence present; keep under review | Keep canonical/provenance docs free of active first-priority `gap` rows. |
| Legacy `application.conf.default` core settings can map to `yona.toml` | `SPEC.md` Appendix A now contains the reviewed legacy-to-`yona.toml` migration guide, including env precedence, JDBC URL conversion, H2 handling, sectioned TOML keys, and deferred Play/JVM/LDAP/OAuth boundaries; `runtime_config_contract.rs` covers TOML loading and env override behavior. | Evidence present; keep under review | Keep Appendix A aligned with `crates/server/src/runtime_config.rs` and `crates/server/tests/runtime_config_contract.rs` when new runtime config keys are added. |
| Existing MariaDB data can be adopted without data loss after validation | `crates/migration` implements `adopt`, `validate_only`, and multi-DB schema checks; `docs/provenance/legacy-porting-progress.md` marks SQLite/MySQL/PostgreSQL runtime migration/adopt/validate complete; one focused adopt contract now has harness evidence below. | Partial evidence present; full matrix still needed | Run the full migration contract/db matrix through `pnpm agent:cargo-test -- ...` and preserve the command evidence in this review or release checklist. |
| `git clone` and `git push` work | Smart HTTP upload-pack/receive-pack and push post-receive records/webhooks are documented in `SPEC.md` and `core-parity-audit.md`; `smart_http_contract` now has harness evidence below for advertisement auth, real `git clone`, authenticated `git push`, and post-receive side effects. | Evidence present; keep under review | Keep `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test smart_http_contract` green. |
| Single binary serves frontend and backend together | `crates/server/build.rs` embeds assets from `YONA_EMBED_ASSET_ROOT` and the server owns REST/static/session bootstrap. | Needs final closure evidence | Build frontend assets, build the release server binary with the real asset root, start it, and smoke an HTML route plus `/api/v1` route. |
| Docker image builds and runs | No Dockerfile or container build artifact is currently present in repo root. | Not closed | Add or identify the canonical Docker build path, then run and record image build plus container smoke evidence. |
| Full required gates are green | Current turn evidence should include parity gate and selected smoke checks. | Not closed | Run full `cargo test`, `pnpm --dir frontend test`, `pnpm --dir frontend build`, and any deployment smoke gates with logs. |

## Next Closure Steps

1. Run the remaining migration/adopt closure matrix through `pnpm agent:cargo-test -- ...` so long output stays in `.agent/cargo-test-logs/`.
2. Produce single-binary closure evidence with real frontend assets embedded through `YONA_EMBED_ASSET_ROOT`.
3. Add or identify the canonical Docker build path and run a container smoke.
4. Only after the matrix above is closed, consider the persistent `1순위 전환 범위 완료까지 진행` goal complete.

## Current Verification Evidence

- 2026-06-17: `node tools/yona-parity-gate.mjs docs/provenance/core-parity-audit.md` passed.
- 2026-06-17: `pnpm test:dev-scripts` passed, including the `agent:cargo-test` and turn-commit harness contracts.
- 2026-06-17: `pnpm agent:cargo-test -- -p yona-rust-pilot-migration --test runtime_schema_contract adopt_policy_accepts_precreated_runtime_schema_and_marks_current_baseline_applied` passed in 585.5s. Full log: `.agent/cargo-test-logs/cargo-test-2026-06-17T050209-357Z.log`.
- 2026-06-17: `pnpm agent:cargo-test -- -p yona-rust-pilot-server --test smart_http_contract` passed in 364.1s, covering the Smart HTTP clone/push contract. Full log: `.agent/cargo-test-logs/cargo-test-2026-06-17T051549-877Z.log`.

## Compile-Time Note

The focused migration adopt test still cold-compiled `yona-rust-persistence`, `sea-orm`, `sqlx` SQLite/MySQL/Postgres features, `sea-orm-migration`, and `yona-rust-pilot-migration`, taking 8m16s before the single test ran. The `agent:cargo-test` harness avoids poll token blow-up by writing full output to `.agent/cargo-test-logs/`, but it does not remove the underlying SeaORM/SQLx multi-dialect cold compile cost.
