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
| LDAP login and BasicAuth LDAP | P2-C/P2-D bounded runtime slices implemented with deterministic LDAP fixtures. Real LDAP bind/search connector remains deferred. | Keep fixture-backed form-login and Smart HTTP/SVN BasicAuth coverage; implement real connector only in a later LDAP connector slice. |
| Broader SVN/WebDAV PROPFIND edge completeness | Closed by P3-A re-audit. Current `svn_protocol_contract` evidence covers the former VCC/baseline PROPFIND edge list. | Retire ambiguous deferred wording; keep `svn_protocol_contract` as the guard for root/default VCC, baseline resource, and baseline collection metadata/property behavior. |
| Git import / GitHub migration ambiguity | Evidence decision complete in `docs/provenance/github-migration-decision.md`. Legacy `/_import` Git URL clone behavior is already implemented and separate. Legacy GitHub API evidence exists under disabled `/migration` and `yona.Migration.js`, but the direction is outbound Yona-to-GitHub; no GitHub-to-Yona/Rust import route/controller/test was found. | Do not duplicate implemented `/_import`. Keep GitHub-to-Rust import not-applicable until legacy evidence exists. Treat outbound Yona-to-GitHub migration as optional migration-tool destination-adapter work with deterministic GitHub API fixtures/mocks if revived; do not mount it in app runtime. |
| Legacy external `/-_-api/v1/**` broad compatibility | App server owns only documented helper rows; broad runtime compatibility is rejected. | Build migration-tool adapters in `crates/migration` and tool code, without mounting broad app-server routes. |
| Production migration/import/export hardening | Site-admin `yobi-data` import/export and adopt/validate exist, but production migration hardening remains follow-up. | Harden validators, dry-run reports, rollback/no-partial-write behavior, and fixture coverage. |
| Full-text/index-backed search | P3-B partial DB-native FTS slice in progress. Current app search now has DB-native candidate retrieval while preserving legacy tabs, scope/type behavior, ACL filtering, snippets, and fallback ordering. SQLite now uses persistent FTS5 external-content tables with query-time rebuild so backfill/update/delete cannot return stale native candidates. | Continue DB-native FTS only: PostgreSQL built-in maintained text-search indexing and MySQL FULLTEXT orchestration remain follow-up where available. Do not add Elastic/OpenSearch or change response shape/UX/ranking semantics. |
| Dynamic i18n switching | P4-A bounded frontend slice implemented. `YONA_LANGS` is parsed/projected, normalized to legacy message dictionaries, and `AppRuntimeContext` exposes language state plus legacy message lookup. Auth/runtime shell keys can switch without a route reload. | Remaining follow-up is app-wide message-key opt-in and legacy preferred-language/session persistence; no new visible selector/settings UX was added because no legacy surface was found. |
| Slack webhook detail compatibility | Closed by P4-B re-audit. `DETAIL_SLACK` is the legacy project webhook type, not a separate Slack integration surface; Rust now preserves Slack attachment `text`, nullable/array `fields`, and `slack.<EventType>` color config via `[slack]` TOML or legacy-style env keys. | Retire stale deferred wording. Signature compatibility was separately retired by P4-C as not applicable. Evidence: `Webhook.java` `buildAttachmentJSON`, `project/webhooks.scala.html`, `crates/server/src/routes/projects/webhooks.rs`, `runtime_config_contract`, and `project_webhook_contract::project_webhooks_enqueue_legacy_board_comment_payloads_for_non_json_hooks`. |
| Optional webhook signature compatibility | P4-C re-audit complete: not applicable for legacy parity. Legacy `Webhook.java` only sets `Content-Type: application/json`, `User-Agent: Yobi-Hookshot`, and optional `Authorization: token <secret> `; `project.webhook.help` documents only that token header; targeted legacy/current searches found no `X-Hub-Signature`, `X-Yona-*`, SHA/HMAC signing, or equivalent behavior. | Retire deferred wording; preserve the implemented token secret header and do not add a new signature surface. |
| IMAP mailbox service | P4-D re-audit complete: the old deferred wording is stale for the current app-runtime mailbox surface. Legacy `Global.onStart()` starts `MailboxService.start()`, which opens configured IMAP and feeds messages into `EmailHandler`; Rust starts `spawn_mailbox_polling_scheduler` from `crates/server/src/main.rs`, runs the configured `YONA_MAILBOX_FETCH_COMMAND`, appends the configured mailbox address, and feeds NUL-separated raw RFC822 stdout through `process_mailbox_raw_message` into the same DB-backed parsed/raw mailbox bridge. | No new runtime work assigned. The live IMAP socket/client implementation remains intentionally replaced by an executable-backed fetch boundary; current parity evidence is `crates/server/src/mailbox.rs`, `crates/server/tests/mailbox_contract.rs`, `crates/integrations/tests/mailbox_contract.rs`, and `docs/provenance/core-parity-audit.md`. |
| Update notification | P4-E re-audit complete: site update status, metadata discovery, notification hide, and download flows are implemented. Legacy `YobiUpdate.onStart()`, `partial_update_notification.scala.html`, and `site/update.scala.html` map to configured update state over `/sites/update`, `POST /sites/unwatchUpdate`, `/sites/update/download`, `/sites/update/download-file`, and `/api/v1/site/update*`. | No active update-notification gap found. Current evidence is `crates/server/src/routes/site_admin/update.rs`, `crates/server/tests/site_admin_contract.rs`, `frontend/tests/site-admin-update-parity.e2e.ts`, and `docs/provenance/core-parity-audit.md`. |

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
| P1-C GitHub import evidence decision | Yes, after P1-A interfaces are clear | provenance complete; adapter/tool code only if outbound GitHub migration is explicitly revived | Decision: `SPEC.md`'s old GitHub Import row maps to legacy outbound `/migration` Yona-to-GitHub behavior, not `/_import` and not GitHub-to-Rust import. Preserve implemented `/_import`; keep GitHub-to-Rust import not-applicable; implement only future migration-tool destination-adapter fixtures for the proven outbound GitHub API semantics if product scope asks for that feature. |
| P1-D H2 bridge release check | Yes | `tools/h2-to-sqlite`, docs | Verify the existing H2-to-SQLite bridge against current SQLite adopt expectations and document limits. |

P1-A sub-slice status: `/sites/import?dryRun=true` now covers a no-write
validate-only report for the existing `yobi-data` import shape. Non-dry-run
`/sites/import` reuses that report as a preflight before mutation, so invalid
portable attachment content/size/SHA-256/max-upload payloads fail without
creating earlier records or portable files. `/sites/export` and the migration
`yona-export` mapper emit `contentSha256` beside embedded `contentBase64`, and
import preflight validates that checksum before writing. Live import now also keeps a compensating
rollback ledger for route-created portable attachments and import-created DB
rows covering users, project shells, project memberships, standalone/embedded
labels, standalone/on-demand milestones, posts/comments, and issues/comments
for the supported portable-attachment import pipeline. Existing-project
issue/post sequence counters are now snapshotted before the first imported
issue/post and restored during in-process rollback when the current counter has
not advanced beyond the import-created numbers. Focused coverage:
`site_admin_contract::site_admin_import_cleans_portable_attachment_when_downstream_milestone_insert_fails`
and
`site_admin_contract::site_admin_import_rolls_back_created_db_rows_when_downstream_issue_comment_insert_fails`;
`site_admin_contract::site_admin_import_restores_existing_project_sequence_counters_after_downstream_failure`
guards the project counter restoration path.
True all-DB transaction protection for downstream non-validation failures during
non-dry-run `/sites/import` remains a P1-A follow-up, especially for crash
boundaries, preexisting attachment-id rebinding state, and concurrent project
counter advances beyond import-created numbers, and is recorded in
`docs/provenance/phase-0b/yona-export.md`.

P1-B sub-slice status: `crates/migration/src/legacy_external/projects.rs` now
has deterministic migration payload fixtures for legacy `ProjectApi.exports`
and `ProjectApi.newProject`, with tests proving those project export/create
descriptors remain migrator-owned and do not become app-runtime routes. User
and auth-token descriptors now have deterministic app-owned payload fixtures
for mention lookup, site-admin user creation, token creation, user issue export,
statistics, typo-preserving `defultLoginPage`, admin user listing, and admin
state mutation, with tests proving recursive legacy request shapes and response
keys while keeping those rows classified as direct app-owned compatibility.
Issue
descriptors now have deterministic migrator payload fixtures for
`IssueApi.imports` and `IssueApi.newIssues`, while app-owned issue helper rows
remain payload-free. Board and milestone descriptors now have deterministic
legacy external adapter payload fixtures for `BoardApi.newPostings`,
`BoardApi.updatePostingContent`, `BoardApi.newPostingComment`,
`BoardApi.updatePostLabel`, and `MilestoneApi.newMilestone`, with tests proving
those rows remain app-owned direct compatibility metadata rather than broad
migrator/server route expansion. Watcher descriptors now have deterministic
app-owned `WatcherApi.getWatchers` response fixtures for `type=issues|posts`,
the empty-OK invalid-type boundary, the 100-row list cap, and local UserApi
favorite-helper boundary descriptors that do not leak into WatcherApi fixtures.
Shared legacy-external module wiring now exposes stable endpoint group summaries,
status counts, and duplicate method/path guards for migration-tool inventory
checks. Remaining P1-B work is executable adapter depth beyond these descriptor
fixtures, only where a migration tool needs it.

P1-D sub-slice status: `tools/h2-to-sqlite` release evidence was refreshed on
2026-06-21 with `mvn -f tools/h2-to-sqlite/pom.xml test`; the README now
documents the required SQLite `validate_only` handoff before `adopt`.

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

P2-C sub-slice status: form-login LDAP runtime now parses the legacy typo
`application.use.ldap.login.supoort`, legacy `ldap.*`, and `YONA_LDAP_*`
equivalents, then authenticates through a deterministic fixture-backed LDAP
boundary. The slice covers enabled LDAP login, `useEmailBaseLogin`,
`fallbackToLocalLogin`, local user provisioning/update by LDAP email, password
refresh, and guest-prefix propagation for newly provisioned LDAP users. Focused
coverage lives in `runtime_config_contract` and `auth_workspace_contract`.
P2-D sub-slice status: Smart HTTP and SVN BasicAuth now share that fixture-backed
LDAP boundary when LDAP is enabled. Coverage preserves existing local
password/token/session behavior, configured local fallback, legacy email-base
login semantics, LDAP fixture credentials, and wrong-credential Basic
challenges in `smart_http_contract` and `svn_protocol_contract`.
Remaining P2-C/P2-D work is real LDAP bind/search connector support and existing
LDAP user's English-name/guest refresh if the persistence boundary is expanded.

Exit criteria: password, OAuth, LDAP, and BasicAuth LDAP paths have isolated
contract coverage and share the same legacy login UX.

## Phase 3: VCS And Search Deferred Edges

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P3-A SVN PROPFIND edge closure | Closed | provenance + existing SVN contract evidence | Complete: current `svn_protocol_contract` coverage closes the former broader VCC/baseline PROPFIND edge list, including root/default VCC Label selection, allprop DeltaV metadata, baseline invalid/out-of-range mapping, baseline requested/propname/allprop metadata, supported-report discovery, and baseline collection Depth 0/1/infinity behavior. |
| P3-B full-text search | Partial / in progress | `crates/search`, persistence search/repo tests, search provenance docs | Implement DB-native FTS candidate retrieval behind the existing legacy UX contract. Current slice uses persistent SQLite FTS5 external-content candidate tables with query-time rebuild/backfill/update/delete safety, plus PostgreSQL/MySQL best-effort native candidate queries with fallback to the existing literal scan/ranking path. Remaining work is backend-specific maintained PostgreSQL text-search and MySQL FULLTEXT index orchestration, without Elastic/OpenSearch and without changing tabs, ACL filtering, snippet copy, response shape, or fallback ordering semantics. |
| P3-C external search API boundary | Closed by re-audit | provenance only | Retired as not applicable: `yona-original/conf/routes` exposes search through `/search`, `/organizations/:organizationName/search`, and `/:user/:project/search`, but no `/-_-api/v1/**` search compatibility route or `controllers.api.SearchApi` exists. Keep app search on canonical `/api/v1/search`, `/api/v1/projects/:owner/:project/search`, and `/api/v1/organizations/:organization/search` only; do not add migration descriptors/tests for a non-existent legacy external search endpoint. |

Exit criteria: VCS and search docs no longer contain ambiguous deferred wording;
each remaining item is either implemented or explicitly deferred with reason.

## Phase 4: Optional Integrations And Runtime UX

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P4-A dynamic i18n switching | Closed | frontend runtime i18n, message loading tests | Bounded runtime switch implemented from legacy message keys/copy for auth/runtime shell. Remaining broader app-wide opt-in and preferred-language persistence stay follow-up. |
| P4-B Slack webhook detail re-audit | Closed | webhook provenance, `crates/server` webhook tests | Confirmed `DETAIL_SLACK` is already the legacy project webhook UI type. Implemented the missing legacy-backed `slack.<EventType>` attachment color config while preserving existing text/fields payloads and avoiding any new Slack integration surface. Evidence lives in `SPEC.md`, `docs/provenance/phase-0b/project.md`, `docs/provenance/core-parity-audit.md`, `runtime_config_contract`, and `project_webhook_contract::project_webhooks_enqueue_legacy_board_comment_payloads_for_non_json_hooks`. |
| P4-C webhook signature decision | Closed | webhook provenance/docs | Re-audit found no legacy HMAC/signature behavior beyond the documented `Authorization: token <secret> ` header, so the optional signature item is retired as `not applicable` rather than implemented. Evidence lives in `SPEC.md`, `docs/provenance/phase-0b/project.md`, `docs/provenance/core-parity-audit.md`, `yona-original/app/models/Webhook.java`, `yona-original/conf/messages`, and current webhook delivery/header tests. |
| P4-D mailbox re-audit | Yes | docs/tests only unless real gap found | Complete: no real gap found. The stale deferred label is retired in plan/provenance status based on `crates/server/src/mailbox.rs`, `crates/server/src/main.rs`, `crates/server/tests/mailbox_contract.rs`, `crates/integrations/tests/mailbox_contract.rs`, and legacy `Global.java` / `mailbox/MailboxService.java` / `EmailHandler` evidence. |
| P4-E update-notification reclassification | Yes | provenance/docs status | Complete: no active update-notification gap found. The stale deferred label is retired in SPEC/plan/provenance status based on `crates/server/src/routes/site_admin/update.rs`, `crates/server/tests/site_admin_contract.rs`, `frontend/tests/site-admin-update-parity.e2e.ts`, and legacy `YobiUpdate.java` / `partial_update_notification.scala.html` / `site/update.scala.html` evidence. |

P4-A sub-slice status: `frontend/src/i18n.tsx` now defines the bounded legacy
message runtime for the configured legacy languages (`en-US`, `ko-KR`, `ja-JP`,
`ru-RU`, `uz-UZ`), normalizes `YONA_LANGS`/runtime-config supported languages,
and exposes `language`, `setLanguage`, and `messages` through
`AppRuntimeContext`. The auth/runtime shell resolves only existing legacy keys
with exact current fallback copy, so missing dictionary entries preserve prior
labels. Focused coverage is `frontend/src/i18n.spec.tsx`,
`frontend/src/runtime-config.spec.ts`, `frontend/src/auth-workspace-shell.spec.tsx`,
and `frontend/src/wave1-auth-workspace-parity.spec.tsx`. Remaining follow-up:
opt more screens into the lookup boundary only where legacy message keys/copy
are already known, and restore legacy preferred-language/session persistence if
that user-language behavior is prioritized. No language selector or settings
screen was added because the re-audit found no corresponding legacy UI surface.

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
