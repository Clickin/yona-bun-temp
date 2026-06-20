Status: Current goal directive plan
Date: 2026-06-21

# Deferred Parity Goal Directive

This plan starts after the first-priority legacy Yona app-runtime parity closure.
`AGENTS.md`, `SPEC.md`, `yona-original/`, and the provenance documents remain
authoritative. The purpose is to close or intentionally retire the currently
deferred second-priority surfaces before beginning Rust + React SPA improvement
work.

## Current Deferred Inventory

Sources checked: `SPEC.md` Section 3.3, FG-01, FG-05/FG-15/FG-18, Appendix
status rows; `docs/provenance/first-priority-completion-review.md`;
`docs/provenance/core-parity-audit.md`;
`docs/provenance/auth-deferred-oauth-ldap.md`;
`docs/provenance/legacy-external-api.md`; and
`docs/provenance/migration-tool-api-decision.md`. Validation refresh also
checked `docs/provenance/legacy-porting-progress.md`,
`docs/agents/07-rust-sfx-deployment.md`, `yona-original/conf/routes`,
`yona-original/app/controllers/ImportApp.java`,
`yona-original/app/views/project/webhooks.scala.html`, and
`yona-original/app/models/Webhook.java`.

| Scope | Current status | Treatment |
| --- | --- | --- |
| OAuth provider login/linking | Deferred second-priority. Unsupported/denied route state and UI gating already exist. | Implement only legacy provider behavior with evidence, or keep explicitly deferred if provider fixtures cannot be made deterministic. |
| LDAP login and BasicAuth LDAP | Deferred second-priority. No runtime LDAP flow exists. | Implement with isolated LDAP fixtures/mocks and legacy config compatibility. |
| Broader SVN/WebDAV PROPFIND edge completeness | App-runtime SVN bridge is broad but still documented as a VCS lifecycle follow-up. | Close the remaining edge list by evidence-backed contract tests and implementation. |
| Git import / GitHub migration ambiguity | Legacy `/_import` Git URL clone behavior is already implemented. `SPEC.md` still lists GitHub Import as deferred, but the validation pass found no legacy GitHub API issue/label/milestone/comment import route in `yona-original`; only Git clone import and site/migrator import surfaces were observed. | Do not duplicate implemented `/_import`. First produce provenance that proves a legacy-backed GitHub API import surface exists; if none exists, reclassify the SPEC row as deferred/not-applicable for this goal. Only implement a migration-tool adapter when legacy evidence defines the source semantics. |
| Legacy external `/-_-api/v1/**` broad compatibility | App server owns only documented helper rows; broad runtime compatibility is rejected. | Build migration-tool adapters in `crates/migration` and tool code, without mounting broad app-server routes. |
| Production migration/import/export hardening | Site-admin `yobi-data` import/export and adopt/validate exist, but production migration hardening remains follow-up. | Harden validators, dry-run reports, rollback/no-partial-write behavior, and fixture coverage. |
| Full-text/index-backed search | App-runtime lightweight legacy search exists; index-backed search is deferred. | Implement only if it preserves legacy search UX and result ordering semantics. |
| Dynamic i18n switching | `YONA_LANGS` is parsed and projected; runtime language switching remains deferred. | Introduce runtime switching only against legacy message keys and copy parity. |
| Slack webhook detail compatibility | `DETAIL_SLACK` already exists in the legacy webhook UI and current Rust webhook type/payload tests. The remaining risk is stale deferred wording or missing legacy Slack detail/color parity, not a separate new Slack integration UX. | Re-audit `Webhook.java` `DETAIL_SLACK` fields and `slack.*` color config against current webhook contracts. Implement only missing legacy-backed payload/config details, or retire the stale deferred classification. |
| Optional webhook signature compatibility | No observed legacy HMAC behavior; evidence-gated follow-up. | Keep deferred unless external integration evidence proves compatibility need. |
| IMAP mailbox service | Mostly closed through command-backed mailbox polling and raw RFC822 pipeline. | Re-audit before assigning work; do not duplicate implemented mailbox behavior. |
| Update notification | Site update metadata and download flows are now implemented. | Reclassify stale deferred text if audits confirm no active gap. |

## Execution Model

- Main orchestrator owns inventory, conflict resolution, verification, document
  status integration, and commits.
- Subagents own implementation slices and must not commit.
- Subagents read `AGENTS.md`, relevant `SPEC.md` sections, matching
  `docs/agents/*` mirrors, `yona-original/` legacy source, and
  `reference/mixed-code/**` where applicable before editing.
- Each subagent report must include legacy evidence, Rust target files, tests
  run, remaining gap/deferred/deviation notes, and files changed.
- The main orchestrator validates every merged slice and runs the turn commit
  hook with `pnpm agent:turn-commit -- -m "<summary>"`.
- Cargo/rustc/rustfmt commands must use the approved outside-sandbox harnesses
  with escalated tool invocation as required by `AGENTS.md`.

## Phase 0: Release Reality Gate

Run this before implementing deferred features. It verifies that the closed
first-priority app is actually usable enough to serve as the baseline.

| Worker | Owner | Scope | Required evidence |
| --- | --- | --- | --- |
| P0-A runnable app smoke | Main | Start local dev/runtime with embedded or built frontend assets; verify login/session, project list, issue/board navigation, Git clone/push smoke path where practical. | URL, commands, smoke results, any blocker issue. |
| P0-B existing DB adopt | Subagent | Validate an unmodified legacy-like MariaDB/MySQL DB through `YONA_SCHEMA_POLICY=adopt`; include no-write validation before any mutation. | Adopt/validate logs, fixture source, schema incompatibility list if any. |
| P0-C packaging smoke | Subagent | Refresh SFX and Docker smoke; inspect Docker runtime dependency coverage for git/svn/curl. | `smoke:embedded-assets`, `smoke:docker`, release binary check. |
| P0-D Kubernetes viability | Subagent | Validate minimal k8s deployment/service/config/volume guidance only as deployment-mirror follow-up; `SPEC.md` Section 1.4 release baseline remains SFX/Docker/base-path. Smoke with local manifests where feasible. | Manifest/guidance path and smoke, or explicit environment limitation/deferred deployment note. |

Exit criteria: current first-priority gates are green, existing DB adoption is
not merely theoretical, Docker/SFX deployment evidence is current, and k8s
guidance is either validated or explicitly recorded as non-blocking deployment
follow-up.

## Phase 1: Migration And Data Safety

This phase should run before OAuth/LDAP and optional integrations because it
protects users moving real legacy installations.

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P1-A import/export hardening | Yes | `crates/migration`, site-admin import/export tests, provenance | Add dry-run/validate-only import reports, no-partial-write guards, attachment size/hash validation coverage, and legacy fixture snapshots. |
| P1-B legacy external migration adapters | Yes | `crates/migration/src/legacy_external/**`, migration tests | Implement the worker split already documented in `legacy-external-api.md` for users, projects, issues, boards, milestones, watchers/favorites boundary, and shared wiring. Do not mount broad runtime routes. |
| P1-C GitHub import evidence decision | Yes, after P1-A interfaces are clear | provenance first; import adapter/tool code only if evidence exists | Confirm whether `SPEC.md`'s GitHub Import row refers to a legacy-backed GitHub API migration surface beyond the implemented `/_import` Git clone form. If no legacy route/controller/test proves labels/milestones/issues/comments API import semantics, reclassify the row as deferred/not-applicable for this goal. If evidence exists, implement deterministic migration-tool fixtures/mocks for only the proven semantics. |
| P1-D H2 bridge release check | Yes | `tools/h2-to-sqlite`, docs | Verify the existing H2-to-SQLite bridge against current SQLite adopt expectations and document limits. |

Exit criteria: a legacy user can choose either existing DB adopt/validate or
export/import migration with clear failure reports and no silent data loss.

## Phase 2: Auth Deferred Runtime

OAuth and LDAP can run in parallel only after agreeing on shared auth config and
login-shell files. If both need the same files, split by backend/runtime first,
then frontend shell updates.

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P2-A OAuth runtime | Yes | auth runtime/routes/config, provider credential persistence, focused tests | Implement legacy GitHub/Google start/callback/denied flow, local-user linking or creation, session creation, provider logout interaction, and message-key error states. |
| P2-B OAuth UI/evidence | Limited | frontend login/dialog/profile provider shells, route tests | Preserve legacy social-login button/copy/provider image behavior and connected-provider profile output. |
| P2-C LDAP runtime | Yes | auth runtime, integrations/domain as needed, tests | Implement legacy `application.use.ldap.login.supoort` spelling, `ldap.*` config, bind/search, email login option, fallback-to-local option, user provisioning/update, and guest flag propagation. |
| P2-D BasicAuth LDAP | Yes after P2-C core | Smart HTTP/SVN auth boundary tests | Route legacy BasicAuth through LDAP when enabled without breaking local-token/session auth. |

Exit criteria: password, OAuth, LDAP, and BasicAuth LDAP paths have isolated
contract coverage and share the same legacy login UX.

## Phase 3: VCS And Search Deferred Edges

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P3-A SVN PROPFIND edge closure | No, single owner | `crates/server/src/svn_protocol*`, `crates/vcs`, SVN contract tests | Turn the documented broader VCC/baseline PROPFIND follow-up into explicit edge tests, then close or precisely reclassify each unsupported edge. |
| P3-B full-text search | Yes | `crates/search`, persistence/search tests, frontend only if needed | Add index-backed search behind the existing legacy UX contract, preserving result tabs, ACL filtering, snippet copy, and fallback ordering semantics. |
| P3-C external search API boundary | Yes after P1-B | migration adapter tests | Keep any external search compatibility in migration tooling unless SPEC is changed. |

Exit criteria: VCS and search docs no longer contain ambiguous deferred wording;
each remaining item is either implemented or explicitly deferred with reason.

## Phase 4: Optional Integrations And Runtime UX

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P4-A dynamic i18n switching | Yes | frontend runtime i18n, message loading tests | Implement runtime language switching from legacy message keys without changing labels or adding new UX. |
| P4-B Slack webhook detail re-audit | Yes | webhook provenance, `crates/server` webhook tests, frontend route tests if UI drift exists | Confirm current `DETAIL_SLACK` webhook type, payload attachments, and optional `slack.*` color handling against legacy `Webhook.java`. Implement only missing legacy-backed detail/color behavior; do not create a new Slack integration surface outside project webhooks. |
| P4-C webhook signature decision | Yes | provenance first; code only if evidence exists | Confirm whether legacy or supported external clients require signature compatibility. If not, retire as `not applicable` rather than implement. |
| P4-D mailbox re-audit | Yes | docs/tests only unless real gap found | Confirm IMAP/mailbox deferred text is stale or identify the exact missing runtime service behavior. |
| P4-E update-notification reclassification | Yes | SPEC/provenance docs | Confirm implemented update metadata/download paths and remove stale deferred classification if evidence is complete. |

Exit criteria: optional integration deferred items are either shipped with
legacy evidence or retired/reclassified with provenance.

## Phase 5: Final Closure Before SPA Improvements

The main orchestrator runs this phase after all subagent slices are merged.

- Run the parity gate and confirm the core audit has no active first-priority or
  second-priority rows mislabeled as generic gaps.
- Run frontend tests/build.
- Run migration, DB matrix, Smart HTTP, SVN, auth, and integration focused gates.
- Run full workspace Rust gate before release closure.
- Run SFX and Docker viability checks; run k8s viability only where manifests or
  deployment guidance are maintained, otherwise record a non-blocking deployment
  follow-up.
- Update `SPEC.md`, `docs/provenance/*`, and `docs/agents/06-phase-plan.md` so
  every completed item moves out of deferred status and every remaining item has
  a deliberate deferred/deviation record.
- Commit through the turn commit hook.

## Default Verification Commands

Use focused checks while subagents work, then main runs release closure gates.

```text
node tools/yona-parity-gate.mjs docs/provenance/core-parity-audit.md
pnpm --dir frontend test
pnpm --dir frontend build
pnpm test:dev-scripts
pnpm smoke:embedded-assets
pnpm smoke:docker
pnpm agent:cargo -- --outside-sandbox check -p yona-rust-pilot-server --tests
pnpm agent:cargo-test -- --outside-sandbox -p yona-rust-pilot-migration --test migration
pnpm agent:cargo-test -- --outside-sandbox -p yona-rust-pilot-server --test smart_http_contract
pnpm agent:cargo-test -- --outside-sandbox -p yona-rust-pilot-server --test db_matrix_env --features db-matrix
pnpm agent:cargo-test -- --outside-sandbox -p yona-rust-pilot-server --test db_matrix_testcontainers --features db-matrix
pnpm agent:cargo-test -- --outside-sandbox --workspace
```

## Non-Goals

- Do not introduce new SPA product improvements in this goal.
- Do not mount broad legacy `/-_-api/v1/**` compatibility in the app server.
- Do not change legacy UI labels, paths, or flows for convenience.
- Do not replace the fixed Rust workspace ownership model.
- Do not classify an item as complete without legacy evidence, focused tests,
  and provenance updates.
