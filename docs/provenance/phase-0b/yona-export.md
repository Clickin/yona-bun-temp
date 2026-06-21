# Yona Export Provenance

## Scope

- Long-term replacement target for `https://github.com/yona-projects/yona-export`.
- This is not a general internal-view REST contract. It is a migration-facing project export/import tool contract.
- Future broad `/-_-api/v1/**` issue, milestone, label, project, post, and file
  import/export compatibility belongs to a separate migrator/export/import
  deliverable. The app server carries only the direct compatibility rows marked
  implemented in `docs/provenance/legacy-external-api.md`; other external
  endpoints must not be added to the frontend/server app unless the inventory,
  SPEC, provenance, and focused tests explicitly own that adapter.

## Upstream Tool Sources

- Repository: `https://github.com/yona-projects/yona-export`
- Inspected commit: `7780641edcaac89abe8236e9e629d2ade52f9923`
- `README.md`
- `docs/export-file-spec.md`
- `app/app.js`
- `app/YonaExport.js`
- `app/header.js`
- `app/download.js`
- `app/exportHelper.js`
- `app/utils.js`

## Extracted Intent

- Export a single Yona project from a source instance and import it into a target instance.
- Support local backup as JSON plus Markdown files plus downloaded attachment files.
- Use user tokens rather than browser-only session state.
- Preserve migration data across users, project metadata, labels, milestones, issues, posts, comments, attachments, and Markdown file links.

## API Surface Used By The Tool

The Node tool calls these external surfaces:

- `GET /-_-api/v1/owners/:owner/projects/:project/exports`
- `POST /-_-api/v1/users`
- `POST /-_-api/v1/owners/:owner/projects`
- `POST /-_-api/v1/owners/:owner/projects/:project/milestones`
- `POST /-_-api/v1/owners/:owner/projects/:project/labels`
- `POST /-_-api/v1/owners/:owner/projects/:project/issues`
- `POST /-_-api/v1/owners/:owner/projects/:project/issues/:number/comments`
- `POST /-_-api/v1/owners/:owner/projects/:project/posts`
- `POST /-_-api/v1/owners/:owner/projects/:project/posts/:number/comments`
- `GET /files/:id`
- `POST /files`

## Export/Import Data Contract

- Export root object contains project metadata, assignees, authors, members, labels, issues, posts, and milestones.
- Markdown side files use YAML front matter generated from exported issue/post/milestone objects.
- Attachments are downloaded to `exported/:owner/:project/files/:attachmentId/:filename`.
- Import uploads attachment files first, rewrites Markdown `/files/:oldId` links to new uploaded ids, then posts issue/post/comment payloads with `temporaryUploadFiles`.
- Import order is users, project, milestones, labels, issues, posts, then comments under their imported parent number.

## Rust Rewrite Implications

- Build as a migration/export CLI or migration tool surface, not as SPA internals.
- Keep schema validation explicit and versioned.
- Separate external compatibility adapters from `/api/v1` app-facing REST APIs,
  and keep broad import/export adapters out of the app server until the
  migrator/export/import deliverable owns them. Narrow app-owned direct helpers
  remain governed by `docs/provenance/legacy-external-api.md`.
- The Rust migration mapper now supports pure `ProjectApi.exports` JSON to semantic `yobi-data` conversion, project member role preservation, nested child comment preservation, optional downloaded attachment content injection as `contentBase64`, SHA-256 metadata as `contentSha256` when embedded content is present, and the `yona-export-to-yobi-data` source adapter that reads a `yona-export` JSON plus `files/:attachmentId/:filename` tree; `/sites/export` preserves project scope/VCS metadata, project `createdAt`, user `createdAt`/`lastStateModifiedAt`, project members with roles, child comments as nested `childComments`, standalone labels with category metadata, standalone milestones with body/state/attachment metadata, post `createdAt`/`updatedAt`, post-comment `createdAt`, issue `createdAt`/`updatedAt`, issue-comment `createdAt`, attachment `createdAt`, and `contentSha256` beside embedded portable attachment content, and `/sites/import` restores project scope/VCS metadata, project `createdAt` including legacy `projectCreatedDate` alias input, user `createdAt`/`lastStateModifiedAt`, project member roles, nested child comments, standalone labels, standalone milestones, post `createdAt`/`updatedAt`, post-comment `createdAt`, issue `createdAt`/`updatedAt`, issue-comment `createdAt`, portable attachment `createdAt`, and Markdown `/files/:oldId` links to restored portable attachment ids when `contentBase64` is present.
- `/sites/import?dryRun=true` now provides a site-admin/CSRF-gated validate-only report for the same `yobi-data` shape. It parses the payload, simulates the current import order for would-import/would-skip counts, validates portable attachment `contentBase64` decoding, declared size, optional `contentSha256`, and configured max file size, and returns validation errors without creating DB rows or files under `data_root`. Live `/sites/import` now reuses that validation report as a preflight before mutation, so invalid portable attachment content/size/SHA-256/max-size payloads fail before creating earlier users/projects/posts/issues/milestones/attachment rows or portable files. After a live preflight passes and before DB mutation starts, the process-local live import section is serialized and removes prior import-local staging leftovers under `uploads/.site-import-staging` while leaving normal `uploads/<hash>` files untouched. Live import DB mutations now run through one SeaORM `DatabaseTransaction` by binding the existing repository methods to a transaction-scoped repository for the non-dry-run mutation phase; a downstream DB failure rolls back user/site-admin/project/member/label/milestone/post/comment/issue/attachment rows and project counters atomically instead of relying on application delete compensation. Route-created portable attachment bytes are staged under an import-local `uploads/.site-import-staging/...` path while the DB transaction is open; attachment rows reference the final upload hash, and the staged file is renamed into `uploads/<hash>` only after DB commit succeeds. Live import still keeps an import-local rollback ledger for staged portable upload files and preexisting attachment rows rebound by imported resources, so normal error returns remove staging files after transaction rollback and preexisting attachment row state remains compensating-cleanup guarded. Focused coverage: `site_admin_contract::site_admin_import_transaction_rolls_back_project_created_before_timestamp_restore_fails` proves a project row created before a later timestamp-restore DB failure is rolled back even though the old ledger had not recorded that project yet, `site_admin_contract::site_admin_import_cleans_portable_attachment_when_downstream_milestone_insert_fails` proves the downstream milestone failure leaves no final portable upload file and no staging directory, `site_admin_contract::site_admin_import_cleans_leftover_staging_before_live_import` proves a later successful live import removes prior import-local staging leftovers without deleting normal upload files, `site_admin_contract::site_admin_import_preflight_rejects_portable_attachment_sha256_mismatch` proves checksum mismatch rejection before writes, `site_admin_contract::site_admin_import_rolls_back_created_db_rows_when_downstream_issue_comment_insert_fails` proves a deterministic issue-comment insert failure leaves no added user, site-admin, project, project-member, label/category, milestone, post/comment, issue/comment, attachment, role, final portable upload file, or staging directory for a portable-attachment import fixture, `site_admin_contract::site_admin_import_restores_portable_attachment_content_from_yobi_data_snapshot` proves post-commit promotion keeps restored portable attachments readable through `/files/:id`, `site_admin_contract::site_admin_import_restores_existing_project_sequence_counters_after_downstream_failure` proves existing-project post/issue counters and the next allocated numbers are restored after a downstream failure, and `site_admin_contract::site_admin_import_restores_preexisting_attachment_rebinding_after_downstream_failure` proves preexisting attachment-id rebinding state is restored after a downstream failure.
- The dry-run/live import report now includes a bounded `checkpoint` artifact for migration/operator tooling without adding a new legacy-visible UI. The artifact has versioned section entries, stable resource keys capped at 256 keys per section with a truncation flag, total/validated/completed/skipped counters, next-index progress, and live failure location/message metadata. Dry-run reports validate every section and expose reusable user/project/member/label/milestone/post/issue/attachment keys; live downstream failures return a rollback JSON report with `checkpoint.failure` while preserving no-partial-write behavior. Focused coverage: `site_admin_contract::site_admin_import_dry_run_reports_counts_and_never_writes` proves dry-run resumable keys, and `site_admin_contract::site_admin_import_rolls_back_created_db_rows_when_downstream_issue_comment_insert_fails` proves a downstream issue-comment failure returns checkpoint section/index/resource-key/message detail and still rolls back DB/file side effects.
- The dry-run/preflight report now treats duplicate/conflicting payload keys for users (`loginId`), projects (`ownerName`/`projectName`), project members (`ownerName`/`projectName`/`loginId`), labels (`ownerName`/`projectName`/category/name), and milestones (`ownerName`/`projectName`/title`) as `site.import.duplicateResource` validation errors. Existing DB resources still produce would-skip counts for idempotent/import-into-existing-site behavior, but conflicting duplicate entries inside one uploaded `yobi-data` file no longer disappear as silent skips. Focused coverage: `site_admin_contract::site_admin_import_live_preflight_rejects_duplicate_resource_keys_without_partial_writes` proves dry-run reports all duplicate sections and live import rejects the report before creating user, project, membership, label, milestone, or upload-file state.
- The dry-run/preflight report now treats duplicate positive portable attachment IDs with embedded `contentBase64` as `site.import.attachment.duplicateId` validation errors across milestone, post, issue, and nested comment attachment lists. This preserves non-portable existing attachment-id rebinding while rejecting ambiguous portable `/files/:oldId` link-rewrite keys before live import writes DB rows or upload files. Focused coverage: `site_admin_contract::site_admin_import_live_preflight_rejects_duplicate_portable_attachment_ids_without_partial_writes`.
- The legacy watcher list helper `GET /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers` is app-owned runtime compatibility rather than a migrator-only descriptor because the Rust app server already serves the legacy `WatcherApi.getWatchers` JSON shape for issue/post watcher popovers.
- `crates/migration` now includes the bounded checkpoint consumer required by
  the P1-A operator/migration-tool boundary. The library module
  `import_checkpoint` and CLI `yobi-import-checkpoint` read a saved dry-run or
  live `/sites/import` JSON report from stdin or a file and emit a deterministic
  JSON summary with checkpoint version, dry-run/live status, failed/complete/
  truncated flags, aggregate total/validated/completed/skipped/remaining
  counters, unsupported-section and validation-error counts, per-section
  resumable state, and next resource-key anchors. The tool is intentionally a
  report consumer: it summarizes where an operator or migration script should
  resume/retry, but it does not replay HTTP imports, mutate DB state, or repair
  filesystem staging on its own.
- Remaining 100% production parity blockers are issue-comment `updatedAt` restoration where legacy export evidence/current schema expose no updated-date field, milestone original created/updated timestamp restoration where both legacy `MilestoneDataExchanger` and the current `milestone` schema expose due date but no created/updated timestamp columns, non-portable preexisting attachment timestamp mutation beyond preserving already-existing rows, source fields that current legacy evidence/persistence inputs do not expose, and the narrowed crash/process-kill resilience window for filesystem side effects that happen outside the database transaction. The dry-run path proves no writes for validation requests, the live preflight blocks known validation failures before writes, including duplicate portable attachment-id conflicts, and live non-dry-run import now provides all-DB transaction protection for downstream DB failures plus bounded checkpoint metadata and an external deterministic checkpoint summary tool. Narrowed residual limitation: a process kill before DB commit can leave import-local staging files under `data_root/uploads/.site-import-staging`, but those files have no committed final upload rows and are removed by the next valid live import before mutation starts. A process kill after DB commit but before or during staged-file promotion can still leave committed attachment rows whose final `data_root/uploads/<hash>` file has not been promoted; eliminating that needs a broader recovery/repair service or durable post-commit promotion journal and remains outside the current parity-safe app-runtime change.
- Repository content transfer is retired from the site-admin `yobi-data` parity target. Legacy `SiteApp.exportData` and `SiteApp.importData` only stream a JSON file through `DataService`; `DataService` walks a fixed list of `DefaultExchanger` table serializers, and the repository-related table exchangers (`ProjectDataExchanger`, `ProjectPushedBranchDataExchanger`, `PullRequestCommitDataExchanger`, `CommitCommentDataExchanger`, etc.) export database rows rather than Git/SVN object storage. `ProjectDataExchanger` exports VCS metadata (`vcs`, counters, pushed date, scope), but no repository archive, path, packfile, branch tree, SVN revision dump, or filesystem content. Targeted legacy searches found no `GitRepository`, `RepositoryService`, repository prefix, `svnadmin`, dump/load, zip/tar, or repository filesystem copy in `data/**`, `SiteApp.exportData`, or `SiteApp.importData`. Legacy `ImportApp` is separate evidence for `/_import` Git URL clone project creation, not for site-admin yobi-data. Rust `/sites/export` should keep project VCS metadata and portable attachment content only; repository storage movement belongs to existing `/_import` Git clone, Smart HTTP/SVN transport/runtime storage, change-VCS provisioning, or a future external migration-tool path with explicit source/destination evidence.

## Guardrail

- Do not add `/-_-api/v1` issue/milestone/label/post/project REST endpoints just
  because a React view needs data. Use `/api/v1/**` for app views.
- New broad import/export external endpoints require explicit migration/export
  provenance, tests tied to the external tool contract, and a separate
  migrator/export/import plan. New narrow app-owned helpers require updates to
  SPEC FG-18, `docs/provenance/legacy-external-api.md`, and focused route tests.
