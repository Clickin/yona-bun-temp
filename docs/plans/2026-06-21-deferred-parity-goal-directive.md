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
| OAuth provider login/linking | P2-A/P2-B bounded runtime slices implemented for configured GitHub/Google start/callback/token/userinfo/link/session behavior, denied/unsupported state, connected-provider profile projection, and local logout parity. | Keep deterministic provider fixtures and legacy local logout evidence; broader provider-specific edge behavior remains follow-up only where legacy evidence exists. |
| LDAP login and BasicAuth LDAP | P2-C/P2-D bounded runtime slices implemented with deterministic LDAP fixtures; real LDAP bind/search connector implemented for non-fixture runtime LDAP; existing-user display-name/nonblank-English-name/password/guest refresh implemented. | Keep fixture-backed form-login and Smart HTTP/SVN BasicAuth coverage; broader external-directory/runtime edge behavior remains bounded by existing connector evidence. |
| Broader SVN/WebDAV PROPFIND edge completeness | Closed by P3-A re-audit. Current `svn_protocol_contract` evidence covers the former VCC/baseline PROPFIND edge list. | Retire ambiguous deferred wording; keep `svn_protocol_contract` as the guard for root/default VCC, baseline resource, and baseline collection metadata/property behavior. |
| Git import / GitHub migration ambiguity | Evidence decision complete in `docs/provenance/github-migration-decision.md`. Legacy `/_import` Git URL clone behavior is already implemented and separate. Legacy GitHub API evidence exists under disabled `/migration` and `yona.Migration.js`, but the direction is outbound Yona-to-GitHub; no GitHub-to-Yona/Rust import route/controller/test was found. | Do not duplicate implemented `/_import`. Keep GitHub-to-Rust import not-applicable until legacy evidence exists. Treat outbound Yona-to-GitHub migration as optional migration-tool destination-adapter work with deterministic GitHub API fixtures/mocks if revived; do not mount it in app runtime. |
| Legacy external `/-_-api/v1/**` broad compatibility | App server owns only documented helper rows; broad runtime compatibility is rejected. | Build migration-tool adapters in `crates/migration` and tool code, without mounting broad app-server routes. |
| Production migration/import/export hardening | Site-admin `yobi-data` import/export and adopt/validate exist, but production migration hardening remains follow-up. | Harden validators, dry-run reports, rollback/no-partial-write behavior, and fixture coverage. |
| Full-text/index-backed search | P3-B DB-native FTS slice implemented. Current app search now has DB-native candidate retrieval while preserving legacy tabs, scope/type behavior, ACL filtering, snippets, and fallback ordering. SQLite uses persistent FTS5 external-content tables with query-time rebuild, PostgreSQL assures built-in GIN text-search indexes, and MySQL assures FULLTEXT indexes before native candidate queries. | Keep DB-native FTS only. Do not add Elastic/OpenSearch or change response shape/UX/ranking semantics; unsupported DB-native paths fall back to the existing literal scan. |
| Dynamic i18n switching | P4-A bounded frontend slice implemented. `YONA_LANGS` is parsed/projected, normalized to legacy message dictionaries, and `AppRuntimeContext` exposes language state plus legacy message lookup. Auth/runtime shell keys can switch without a route reload, auth/session requests persist legacy preferred-language context into `User.lang`, and the project navigation/keymap, workspace/public profile stream-tab, organization menu/header/settings-tab, search tab/shell labels, site-admin shell/sidebar/top-level asserted labels, and issue/board/PR/milestone list/detail/form controls now opt known legacy message-key labels into the same lookup boundary. | Remaining follow-up is app-wide message-key opt-in for other existing screens/components where legacy keys/copy are known; no new visible selector/settings UX was added because no legacy surface was found. |
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

P0-A runnable app smoke refresh, 2026-06-21:

- The local debug server was built with the required cargo wrapper
  (`pnpm agent:cargo -- --outside-sandbox build -p yona-rust-pilot-server`)
  after `pnpm --dir frontend build`, then launched outside the Codex sandbox
  because sandboxed localhost binding was denied. Runtime env:
  `YONA_BASE_PATH=/yona`, `YONA_DATABASE_URL=sqlite::memory:`,
  `YONA_SCHEMA_POLICY=up`, `YONA_SEED_PILOT=1`,
  `YONA_USE_EMBEDDED_ASSETS=0`, and `YONA_ASSET_ROOT=frontend/dist`.
  Smoke result: `/yona/api/auth/session` returned 200 with CSRF header,
  `/yona/projects` returned 200, `/yona/api/v1/projects` returned 200 with the
  seeded `projectName:"yona"` payload, and `/yona/yobi/yona`,
  `/yona/yobi/yona/issues`, and `/yona/yobi/yona/posts` returned 200. Git
  clone/push smoke remains covered by the existing Smart HTTP/SVN focused
  contracts rather than this minimal seeded in-memory smoke.

P0-B/P0-C/P0-D evidence refresh, 2026-06-21:

- P0-B existing DB adopt: no checked-in unmodified legacy-like MariaDB/MySQL dump
  or external-service-free MySQL fixture was found. The evidence now goes beyond
  schema-only validation with a deterministic populated SQLite surrogate fixture:
  `crates/migration/tests/fixtures/p0b_legacy_like_sqlite_adopt.sql` loads
  representative legacy-like users, project membership, issue/comment, posting,
  and `play_evolutions` rows on top of the current manifest-backed runtime
  schema. `runtime_schema_contract::p0b_legacy_like_sqlite_fixture_validates_without_write_then_adopts_preserving_rows`
  first runs `validate_only` and asserts no `seaql_migrations` table is written,
  then runs `adopt` and asserts the baseline marker is written while fixture data
  remains. Live MariaDB evidence is still limited to managed-schema validation in
  `db_matrix_testcontainers`; do not claim full unmodified legacy MariaDB/MySQL
  dump adoption until such a dump/fixture is checked in or provided. The
  refreshed focused command
  `pnpm agent:cargo-test -- --outside-sandbox -p yona-rust-pilot-migration --test migration runtime_schema_contract -- --nocapture`
  passed on 2026-06-21.
- P0-C packaging smoke: `pnpm smoke:embedded-assets` passed on 2026-06-21,
  rebuilding `frontend/dist`, compiling the debug server with
  `YONA_EMBED_ASSET_ROOT=frontend/dist`, starting it at `/yona`, and verifying
  the SPA index, `/projects`, emitted JS asset, `/api/auth/session` CSRF header,
  and `/api/v1/projects` seeded `projectName:"yona"` response. The compile
  emitted two existing server warnings in `boards.rs` and `routes/utils.rs`.
  `pnpm smoke:docker` also passed on 2026-06-21: Docker Buildx built
  `yona-rust-pilot:smoke`, the release compile completed in 1m22s with the same
  two warnings, the runtime image retained `ca-certificates`, `curl`, `git`, and
  `subversion`, and container `473ecf69c428` returned 200 responses for the same
  base-path, asset, session, and REST project smoke endpoints.
- P0-D Kubernetes viability: no canonical k8s, Kubernetes, Helm, or manifest
  files were found in the repo. No local manifest smoke was run. Kubernetes
  remains a non-blocking deployment guidance follow-up; `SPEC.md` Section 1.4
  release baseline is still SFX plus Docker/base-path, not maintained k8s
  manifests.

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
import preflight validates that checksum before writing. Live import DB
mutations now run through one SeaORM `DatabaseTransaction` by binding the
existing repository methods to a transaction-scoped repository for the
non-dry-run mutation phase. On downstream DB failure, user/site-admin/project,
membership, label/category, milestone, post/comment, issue/comment, attachment,
role, and project-counter DB changes roll back atomically instead of relying on
application delete compensation. Route-created portable attachment bytes are now
written to an import-local `uploads/.site-import-staging/...` path while the DB
transaction is open; attachment rows still reference their final upload hash,
and staged files are renamed into `uploads/<hash>` only after DB commit
succeeds. Live import still keeps a compensating rollback ledger for staged
portable upload files and preexisting attachment rows rebound by imported
resources, so normal error returns remove staging files after transaction
rollback and preexisting attachment row state remains guarded.
The dry-run/live import report now also carries a bounded `checkpoint` artifact
for migration/operator tooling: versioned section entries, stable resource keys
capped at 256 per section with truncation flags, total/validated/completed/
skipped counters, next-index progress, and live failure section/index/resource
key/message detail. No new visible UI was added because legacy `/sites/data`
only exposes export/download and multipart import controls. Focused coverage:
`site_admin_contract::site_admin_import_dry_run_reports_counts_and_never_writes`
asserts reusable dry-run keys, and
`site_admin_contract::site_admin_import_rolls_back_created_db_rows_when_downstream_issue_comment_insert_fails`
asserts downstream rollback failure checkpoint detail without partial writes.
`/sites/export` now
emits legacy-style project `createdAt`, user `createdAt`/
`lastStateModifiedAt`, post `createdAt`/`updatedAt`, post-comment `createdAt`,
issue `createdAt`/`updatedAt`, issue-comment `createdAt`, and attachment
`createdAt`; `/sites/import` restores those fields through timestamp-capable
project/user/posting/issue/comment/portable-attachment persistence paths.
Issue-comment `updatedAt` remains unsupported because legacy export evidence
and the current `issue_comment` schema expose no updated-date field. Milestone
created/updated timestamp restoration remains unsupported because legacy
`MilestoneDataExchanger` and the current `milestone` schema expose due date but
no created/updated timestamp columns. Non-portable preexisting attachment rows
are snapshotted/restored rather than timestamp-mutated. Existing-project
issue/post sequence counters are now snapshotted before the first imported
issue/post and restored during in-process rollback when the current counter has
not advanced beyond the import-created numbers. Preexisting attachment rows
referenced by imported resource `id` fields are now snapshotted before rebinding
and restored during in-process rollback. Focused coverage:
`site_admin_contract::site_admin_import_transaction_rolls_back_project_created_before_timestamp_restore_fails`;
`site_admin_contract::site_admin_import_cleans_portable_attachment_when_downstream_milestone_insert_fails`
and
`site_admin_contract::site_admin_import_rolls_back_created_db_rows_when_downstream_issue_comment_insert_fails`;
`site_admin_contract::site_admin_import_restores_existing_project_sequence_counters_after_downstream_failure`
guards the project counter restoration path, and
`site_admin_contract::site_admin_import_restores_preexisting_attachment_rebinding_after_downstream_failure`
guards the preexisting attachment-id rebinding restoration path.
`site_admin_contract::site_admin_import_restores_portable_attachment_content_from_yobi_data_snapshot`
now also proves post-commit promotion still serves restored portable
attachments through `/files/:id`, while the failure tests assert no final upload
files and no staging directory survive normal downstream failures. The import
dry-run/preflight report now also treats duplicate/conflicting payload keys for
users, projects, project members, labels, and milestones as validation errors
instead of silent skips; live import rejects those reports before any mutation.
Focused coverage:
`site_admin_contract::site_admin_import_live_preflight_rejects_duplicate_resource_keys_without_partial_writes`.
`crates/migration` now provides the bounded external consumer for that artifact:
the `import_checkpoint` library module and `yobi-import-checkpoint` CLI read a
saved dry-run or live `/sites/import` JSON report from stdin or a file and emit a
deterministic JSON operator summary with version, failed/complete/truncated
state, failure location, aggregate total/validated/completed/skipped/remaining
counters, per-section resumable state, and next resource-key anchors. It is a
tool-side summary/retry boundary only; it does not replay HTTP imports or mutate
the target app/DB/filesystem by itself. Residual P1-A production hardening gaps
are now milestone created/updated timestamps and other source fields that
current legacy evidence/persistence inputs do not expose, non-portable
attachment timestamp mutation beyond preserving existing rows, and the narrower
crash/process-kill window around filesystem side effects outside the DB
transaction. The live `/sites/import` mutation/promotion section is now
process-local serialized after preflight, and the route removes prior
import-local `uploads/.site-import-staging` leftovers before mutation starts
while preserving normal upload files; this narrows pre-commit process-kill
leftovers to cleanup-on-next-valid-live-import rather than committed final
upload state. Repository content transfer is explicitly retired from the
site-admin `yobi-data` import/export hardening list: legacy `SiteApp.exportData`
/ `SiteApp.importData` delegate to `DataService`, whose fixed exchanger list
serializes database tables and sequences only; `ProjectDataExchanger` carries
project VCS metadata but no Git/SVN repository payload, and legacy `ImportApp`
is the separate `/_import` Git URL clone flow. Repository storage movement
therefore belongs to existing Git clone/import, Smart HTTP/SVN transport,
change-VCS storage provisioning, or a future external migration-tool path with
separate evidence, not to `/sites/export` or `/sites/import`. A process kill before
DB commit can now leave only import-local staging files, not committed final
upload files; a process kill after DB commit but before or during staged file
promotion can still leave committed attachment rows whose final upload file
has not been promoted. The current status is recorded in
`docs/provenance/phase-0b/yona-export.md`.

P1-B sub-slice status: `crates/migration/src/legacy_external/projects.rs` now
has deterministic migration payload fixtures for legacy `ProjectApi.exports`
and `ProjectApi.newProject`, with tests proving those project export/create
descriptors remain migrator-owned and do not become app-runtime routes. Project
export/import adapter depth now goes beyond descriptors:
`parse_project_export_response` and `parse_project_import_request` normalize
legacy project export/create payloads into deterministic migration-tool structs,
preserving recursive `JsonNode.findValue` lookup, scalar fallbacks, default
description/VCS/scope/count/menu behavior, member/assignee/author/label,
milestone/resource/menu metadata where legacy payloads support it,
bad-request boundaries for invalid JSON/path/missing `projectName` or non-object
export payloads, and duplicate-project preflight classification without
mounting broad app-runtime routes. User/auth-token/admin-user adapter depth now
goes beyond descriptors for the legacy fixture payloads that migration tooling
can consume: `parse_user_create_request`, `parse_user_token_request`,
`parse_user_token_response`, `parse_user_issue_export_response`,
`parse_user_statistics_response`, `parse_default_login_page_response`,
`parse_admin_user_list_response`, `parse_admin_user_state_request`, and
`parse_admin_user_state_response` normalize site-admin user-create batches,
token request/response payloads, token-authored user issue export responses,
statistics, typo-preserving `defultLoginPage`, admin active-user lists, and
admin state mutations. The adapter preserves recursive `JsonNode.findValue`
lookup, scalar fallbacks, query/path defaults, duplicate-email preflight
classification, legacy state normalization, and invalid JSON/path/payload
boundaries while keeping those rows classified as direct app-owned
compatibility and avoiding broad app-runtime route expansion. Mention lookup
remains descriptor/sample metadata only because migration tooling has no current
need to parse its HTML `info` presentation string.
Project helper adapter depth now also covers the bounded app-owned
label/title-head payloads that migration/operator tooling can consume without
mounting broad runtime routes: `parse_project_label_import_request`,
`parse_project_label_response`, and `parse_project_title_heads_response`
normalize legacy `ProjectApi.newLabel` recursive label batches, created/conflict
label responses, and `ProjectApi.titleHeads` title-head/label suggestion
responses. The parser preserves recursive `JsonNode.findValue` lookup, scalar
fallbacks, the legacy `isExclusive.isBoolean()` token boundary, path/query
capture, duplicate label/category preflight classification, invalid
path/JSON/payload boundaries, and app-owned endpoint classification.
Issue descriptors now have deterministic migrator payload fixtures for
`IssueApi.imports` and `IssueApi.newIssues`, while app-owned issue helper rows
remain payload-free. Issue import adapter depth now goes beyond descriptors:
`parse_issue_post_conversion_request` and
`parse_issue_post_conversion_response` normalize legacy `IssueApi.imports`
post-to-issue conversion into deterministic migration-tool structs, preserving
legacy path/query parsing, positive `postNumber` validation, body-less request
semantics, recursive source-post snapshot lookup, scalar fallbacks, default
converted issue state `OPEN`, title/body/author/date/label/milestone/comment
and attachment metadata, `{number}` response parsing, and
missing-post/source-mismatch/next-issue-number preflight classification without
mounting broad app-runtime routes. `parse_issue_import_request` normalizes
legacy `IssueApi.newIssues` payloads into deterministic migration-tool structs,
preserving recursive `JsonNode.findValue` lookup, scalar fallbacks, default
`sendNotification=false`, missing-state `OPEN` fallback, requested issue
numbers, author/assignee/label/milestone/due-date/upload metadata, bad-request
boundaries for missing/non-array `issues`, invalid issue items, missing
title/body fields, and migration preflight classification for existing or
earlier-in-batch requested-number conflicts without mounting broad app-runtime
routes. Descriptor-only issue helper adapter depth now also covers the existing
legacy helper payloads that migration/operator tooling may need to consume or
replay deterministically: `parse_issue_comment_create_request`,
`parse_issue_comment_update_request`, `parse_issue_label_replace_request`,
`parse_issue_assignee_replace_request`, `parse_issue_share_update_request`,
`parse_issue_weight_response`, `parse_issue_detect_change_request`, and
`parse_issue_detect_change_response`. These helpers preserve recursive
`JsonNode.findValue` lookup, scalar fallbacks for controller scalar reads,
label-id and assignee/sharer normalization, weight and change-poll response
fields, invalid JSON/path/payload boundaries, and app-owned helper
classification without mounting broad app-runtime routes. Board adapter depth now goes beyond descriptors:
`parse_board_post_import_request`, `parse_board_content_update_request`,
`parse_board_comment_import_request`, and `parse_board_label_replace_request`
normalize the existing legacy `BoardApi.newPostings`,
`BoardApi.updatePostingContent`, `BoardApi.newPostingComment`, and
`BoardApi.updatePostLabel` fixture payloads into deterministic migration-tool
structs. The adapter preserves recursive `JsonNode.findValue` lookup, scalar
fallbacks, requested post-number/timestamp/upload metadata, body edit
`content`/`original` conflict inputs, comment author/body/timestamp/upload
metadata, label-array integer normalization, and bad-request boundaries for
missing posts arrays, invalid post path numbers, and invalid label IDs without
mounting broad app-runtime routes. Milestone descriptors now have deterministic
legacy external adapter payload fixtures for `MilestoneApi.newMilestone`, with
tests proving those rows remain app-owned direct compatibility metadata rather
than broad migrator/server route expansion. Watcher descriptors now have deterministic
app-owned `WatcherApi.getWatchers` response fixtures for `type=issues|posts`,
the empty-OK invalid-type boundary, the 100-row list cap, and local UserApi
favorite-helper boundary descriptors that do not leak into WatcherApi fixtures.
Shared legacy-external module wiring now exposes stable endpoint group summaries,
status counts, and duplicate method/path guards for migration-tool inventory
checks. Milestone adapter depth now goes beyond descriptors:
`parse_milestone_import_request` normalizes legacy `MilestoneApi.newMilestone`
payloads into deterministic migration-tool structs, preserving recursive
`findValue` behavior, `"No title"` fallback, empty description fallback,
open/closed state normalization, end-of-day due date normalization, bad
milestone-array and bad due-date boundaries, and duplicate classification for
existing or earlier-in-batch titles without mounting broad app-runtime routes.
Watcher/favorite boundary adapter depth now goes beyond descriptors for the
deterministic app-owned helper payloads migration/operator tooling can consume:
`parse_watcher_request`, `parse_watcher_response`,
`parse_favorite_projects_response`, `parse_favorite_organizations_response`,
`parse_favorite_issues_response`, and `parse_favorite_toggle_response`
normalize legacy watcher path/query behavior, `type=issues|posts` JSON
projection, empty-OK invalid/missing watcher type behavior, watcher
`totalWatchers`/`watchersInList`/`watchers[{name,url}]` responses, favorite
list response shapes, the legacy favorite-issue `projectIds`/`projects` naming,
and favorite toggle `{id,favored,message?}` fields. These parsers preserve
recursive wrapped payload consumption and scalar fallback normalization for
tool-side legacy payload handling while keeping the rows app-owned and avoiding
broad `/-_-api/v1/**` runtime route expansion. Issue helper adapter depth now
also covers comment notification receiver request/response inventory,
assignable/find-sharer/sharable search responses with path/query/content-range
metadata, assignee/share mutation responses, and translation request/response
normalization including legacy unconfigured `Precondition Failed`, again as
tool-side parsing only without broad runtime route expansion.
Remaining P1-B work is executable adapter depth for other descriptor-only
groups only where a migration tool needs it.

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
| P2-A OAuth runtime | Yes | auth runtime/routes/config, provider credential persistence, focused tests | Implement legacy GitHub/Google start/callback/denied flow, local-user linking or creation, session creation, local logout parity, and message-key error states. |
| P2-B OAuth UI/evidence | Limited | frontend login/dialog/profile provider shells, route tests | Preserve legacy social-login button/copy/provider image behavior and connected-provider profile output. |
| P2-C LDAP runtime | Yes | auth runtime, integrations/domain as needed, tests | Implement legacy `application.use.ldap.login.supoort` spelling, `ldap.*` config, bind/search, email login option, fallback-to-local option, user provisioning/update, and guest flag propagation. |
| P2-D BasicAuth LDAP | Yes after P2-C core | Smart HTTP/SVN auth boundary tests | Route legacy BasicAuth through LDAP when enabled without breaking local-token/session auth. |

P2-A/P2-B sub-slice status: OAuth runtime now preserves the legacy
`/authenticate/:provider` and `/authenticate/:provider/denied` route surface for
GitHub/Google. Unconfigured providers keep the existing unsupported login state,
configured providers redirect to the configured authorization URL, deterministic
callback identity links or creates the local user through legacy
`user_credential` / `linked_account` tables, real `code` callbacks exchange
provider token/userinfo/profile/email payloads for GitHub/Google, create a
session, and redirect to the default landing path. Connected-provider profile
output is covered through the existing workspace profile projection. Focused
coverage lives in `auth_workspace_contract` and `runtime_config_contract`.
The earlier provider-specific external logout follow-up is retired as not
applicable: legacy `/logout` calls local `UserApp.logout()` and
PlayAuthenticate `logout()` without provider input, then redirects to Referer.

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
The P2-C/P2-D connector follow-up adds real simple bind/search support when
fixture users are absent, preserving deterministic fixture-backed tests and
BasicAuth behavior. Existing LDAP users matched by email now refresh display
name, password hash, nonblank English name, and guest flag from the LDAP login
ID and configured legacy guest prefixes.

Exit criteria: password, OAuth, LDAP, and BasicAuth LDAP paths have isolated
contract coverage and share the same legacy login UX.

## Phase 3: VCS And Search Deferred Edges

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P3-A SVN PROPFIND edge closure | Closed | provenance + existing SVN contract evidence | Complete: current `svn_protocol_contract` coverage closes the former broader VCC/baseline PROPFIND edge list, including root/default VCC Label selection, allprop DeltaV metadata, baseline invalid/out-of-range mapping, baseline requested/propname/allprop metadata, supported-report discovery, and baseline collection Depth 0/1/infinity behavior. |
| P3-B full-text search | Implemented | `crates/search`, persistence search/repo tests, search provenance docs | DB-native FTS candidate retrieval is implemented behind the existing legacy UX contract. SQLite uses persistent FTS5 external-content candidate tables with query-time rebuild/backfill/update/delete safety. PostgreSQL assures built-in GIN text-search indexes before `to_tsvector`/`plainto_tsquery` candidate queries. MySQL assures FULLTEXT indexes before `MATCH ... AGAINST` candidate queries. All unsupported DB-native paths fall back to the existing literal scan/ranking path. Elastic/OpenSearch remains out of scope. |
| P3-C external search API boundary | Closed by re-audit | provenance only | Retired as not applicable: `yona-original/conf/routes` exposes search through `/search`, `/organizations/:organizationName/search`, and `/:user/:project/search`, but no `/-_-api/v1/**` search compatibility route or `controllers.api.SearchApi` exists. Keep app search on canonical `/api/v1/search`, `/api/v1/projects/:owner/:project/search`, and `/api/v1/organizations/:organization/search` only; do not add migration descriptors/tests for a non-existent legacy external search endpoint. |

Exit criteria: VCS and search docs no longer contain ambiguous deferred wording;
each remaining item is either implemented or explicitly deferred with reason.

## Phase 4: Optional Integrations And Runtime UX

| Worker | Parallel? | Write scope | Responsibility |
| --- | --- | --- | --- |
| P4-A dynamic i18n switching | Closed | frontend runtime i18n, message loading tests | Bounded runtime switch implemented from legacy message keys/copy for auth/runtime shell, auth/session preferred-language persistence, project navigation/keymap shell labels, workspace/public profile stream-tab labels, organization menu/header/settings-tab labels, search tab/shell labels, site-admin shell/sidebar/top-level asserted labels, and issue/board/PR/milestone controls. Remaining broader app-wide opt-in for other existing screens stays follow-up where legacy keys/copy are known. |
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
labels. The common error shell and runtime error banner now opt known legacy
keys into the same lookup boundary for `error.badrequest`, `error.forbidden`,
`error.notfound`, `error.internalServerError`, `menu.home`, `button.close`, and
known auth failure keys without adding a new selector or settings UI. Focused
coverage is `frontend/src/i18n.spec.tsx`, `frontend/src/runtime-config.spec.ts`,
`frontend/src/auth-workspace-shell.spec.tsx`, and
`frontend/src/wave1-auth-workspace-parity.spec.tsx`. Auth/session request
context now persists legacy preferred-language state into `User.lang` from the
`PLAY_LANG` cookie or `Accept-Language` negotiation. Remaining follow-up: opt
more screens into the lookup boundary only where legacy message keys/copy are
already known. P4-A-I18n continuation covers the project navigation/keymap shell
from `projectMenu.scala.html` and `help/keymap.scala.html`: `title.projectHome`,
`menu.code`, `menu.issue`, `menu.pullRequest`, `menu.review`, `milestone`,
`menu.board`, `menu.admin`, `title.keymap`, `project.projects`,
`project.setting`, `post.write`, `issue.menu.new`, page/button shortcut labels,
`site`, `site.search`, and issue-comment shortcut labels now use
`AppRuntimeContext`/legacy message lookup while preserving the existing key text
as fallback for missing entries such as `title.boardDetail`. Focused coverage is
`frontend/src/project-keymap.spec.tsx`, with nearby shell guards in
`frontend/src/project-home-tabs.spec.tsx`, `frontend/src/wave2a-container-parity.spec.tsx`,
and `frontend/src/code-views.spec.tsx`. P4-A-OrgWorkspaceI18n continuation
covers the existing workspace/public profile top-level stream tabs from
`user/view.scala.html`: `menu.issue`, `menu.pullRequest`, and
`project.projects` now flow from `AppRuntimeContext`/legacy message lookup on
`/me` and `/:user`, preserving literal key fallback when rendered without a
provider. Focused coverage is `frontend/src/workspace-profile-i18n.spec.tsx`,
with nearby shell guards in `frontend/src/wave1-auth-workspace-parity.spec.tsx`.
P4-A-OrgI18n continuation covers the existing organization menu/header/settings
tab shells from `organization/menu.scala.html`, `organization/header.scala.html`,
and `organization/partial_settingmenu.scala.html`: `title.organizationHome`,
`menu.issue`, `menu.board`, `menu.pullRequest`, `menu.admin`,
`organization.member.enrollment.title`, `organization.you.may.want.to.be.a.member`,
`organization.you.want.to.be.a.member`, enrollment help/button labels,
`organization.settingFrom`, `organization.member`, and `organization.delete`
now flow from `AppRuntimeContext`/legacy message lookup on organization home,
issue, board, PR, search, settings, members, and delete shells while preserving
literal key fallback when rendered without a provider. Focused coverage is
`frontend/src/organization-shell-i18n.spec.tsx`, with nearby shared runtime
guards in `frontend/src/i18n.spec.tsx` and
`frontend/src/workspace-profile-i18n.spec.tsx`. P4-A-SearchI18n continuation
covers the existing search tabs/shell from `search/partial_search.scala.html`
and `SearchApp`: `title.search`, `search.menu.issues`, `search.menu.users`,
`search.menu.projects`, `search.menu.boards`, `search.menu.milestones`,
`search.menu.issue.comments`, `search.menu.board.comments`,
`search.menu.reviews`, `search.result.title`, `issue.noAuthor`,
`label.dueDate`, `button.prevPage`, and `button.nextPage` now flow from
`AppRuntimeContext`/legacy message lookup on global, organization, and project
search surfaces while preserving literal key fallback when rendered without a
provider and without adding a selector or new UI. Focused coverage is
`frontend/src/search-i18n.spec.tsx`, with nearby route parity coverage in
`frontend/src/route-parity.spec.tsx`. P4-A-SiteAdminI18n continuation covers
the existing site-admin management shell from `site/siteMngLayout.scala.html`
and asserted top-level labels from `site/userList.scala.html`,
`site/projectList.scala.html`, `site/postList.scala.html`,
`site/issueList.scala.html`, `site/mail.scala.html`,
`site/massMail.scala.html`, `site/data.scala.html`, `site/update.scala.html`,
and `site/diagnostic.scala.html`: `site.sidebar*`, user/project list
headers/placeholders/tabs/actions, mail/mass-mail labels, data warning/action
labels, update status labels, diagnostics status labels, modal close/yes/no
labels, and pagination labels now flow from the legacy message lookup while
preserving literal key fallback or the prior dynamic scalar fallback when
rendered without a provider. Focused coverage is
`frontend/src/site-admin-route-parity.spec.tsx`. P4-A-IssueBoardPrMilestoneI18n
continuation covers the existing project issue list controls from
`issue/partial_list_wrap.scala.html`, `partial_list_quicksearch.scala.html`,
and `partial_searchform.scala.html`; project board list controls from
`board/list.scala.html`; project PR list controls from `git/partial_search.scala.html`
and `git/partial_list.scala.html`; and milestone list/detail/form controls from
`milestone/list.scala.html`, `milestone/view.scala.html`, `milestone/create.scala.html`,
and `milestone/edit.scala.html`. The touched `issue.*`, `post.*`,
`pullRequest.*`, `milestone.*`, `common.order.*`, `label.*`, and `button.*`
labels/placeholders now flow from `AppRuntimeContext`/legacy message lookup
while preserving literal key fallback without a provider. Focused coverage is
`frontend/src/issue-board-pr-milestone-i18n.spec.tsx`. P4-A-WorkspaceSettingsI18n
continuation covers the existing `/user/editform/**` profile/password/email/token
settings controls from `user/edit.scala.html`, `edit_password.scala.html`,
`edit_emails.scala.html`, `edit_notifications.scala.html`, `edit_token.scala.html`,
and `partial_edit_tabmenu.scala.html`: the known `userinfo.*`, `user.*`,
`emails.*`, `site.resetPasswordEmail.*`, and shared `button.*` labels now flow
from `AppRuntimeContext`/legacy message lookup while preserving literal key
fallback without a provider. Focused coverage is
`frontend/src/workspace-settings-i18n.spec.tsx`. P4-A-ProjectSettingsI18n
continuation covers the existing project settings/member/webhook/transfer/delete/change-VCS
controls from `project/setting.scala.html`, `members.scala.html`,
`webhooks.scala.html`, `partial_webhooks_list.scala.html`, `transfer.scala.html`,
`delete.scala.html`, `change_vcs.scala.html`, and `partial_settingmenu.scala.html`:
the known `project.*`, `issue.label`, `button.*`, and related labels/placeholders
now flow from `AppRuntimeContext`/legacy message lookup while preserving literal
key fallback without a provider. Focused coverage is
`frontend/src/project-settings-parity.spec.tsx`. Remaining app-wide opt-in scope
is other existing controls that still render known legacy keys/copy as literal
fallback text, including code/review controls not already covered by prior
slices. No language
selector or settings screen was added because the re-audit found no corresponding
legacy UI surface.

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
