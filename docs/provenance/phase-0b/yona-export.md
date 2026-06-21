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
- The Rust migration mapper now supports pure `ProjectApi.exports` JSON to semantic `yobi-data` conversion, project member role preservation, nested child comment preservation, optional downloaded attachment content injection as `contentBase64`, and the `yona-export-to-yobi-data` source adapter that reads a `yona-export` JSON plus `files/:attachmentId/:filename` tree; `/sites/export` preserves project scope/VCS metadata, project members with roles, child comments as nested `childComments`, standalone labels with category metadata, and standalone milestones with body/state/attachment metadata, and `/sites/import` restores project scope/VCS metadata, project member roles, nested child comments, standalone labels, standalone milestones, and Markdown `/files/:oldId` links to restored portable attachment ids when `contentBase64` is present.
- `/sites/import?dryRun=true` now provides a site-admin/CSRF-gated validate-only report for the same `yobi-data` shape. It parses the payload, simulates the current import order for would-import/would-skip counts, validates portable attachment `contentBase64` decoding, declared size, and configured max file size, and returns validation errors without creating DB rows or files under `data_root`. Live `/sites/import` now reuses that validation report as a preflight before mutation, so invalid portable attachment content/size/max-size payloads fail before creating earlier users/projects/posts/issues/milestones/attachment rows or portable files. Live import also keeps an import-local ledger for portable attachments it creates, and removes those attachment rows plus `data_root/uploads` files when the same resource/comment operation fails downstream; `site_admin_contract::site_admin_import_cleans_portable_attachment_when_downstream_milestone_insert_fails` proves this for a deterministic post-attachment milestone insert failure before attachment binding.
- The legacy watcher list helper `GET /-_-api/v1/owners/:owner/projects/:projectName/posts/:number/watchers` is app-owned runtime compatibility rather than a migrator-only descriptor because the Rust app server already serves the legacy `WatcherApi.getWatchers` JSON shape for issue/post watcher popovers.
- Remaining 100% production parity blockers are repository content transfer, original created/updated timestamp restoration where persistence supports it, resumable import reports, duplicate policy, attachment checksum validation, and true transaction/rollback protection for downstream non-validation failures during non-dry-run imports. The dry-run path proves no writes for validation requests, the live preflight blocks known validation failures before writes, and the import-local attachment ledger cleans route-created portable attachment rows/files for covered downstream resource/comment failures, but live `/sites/import` still performs ordered DB writes after preflight without an all-or-nothing transaction.

## Guardrail

- Do not add `/-_-api/v1` issue/milestone/label/post/project REST endpoints just
  because a React view needs data. Use `/api/v1/**` for app views.
- New broad import/export external endpoints require explicit migration/export
  provenance, tests tied to the external tool contract, and a separate
  migrator/export/import plan. New narrow app-owned helpers require updates to
  SPEC FG-18, `docs/provenance/legacy-external-api.md`, and focused route tests.
