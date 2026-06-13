# Yona Export Provenance

## Scope

- Long-term replacement target for `https://github.com/yona-projects/yona-export`.
- This is not a general internal-view REST contract. It is a migration-facing project export/import tool contract.
- Future `/-_-api/v1/**` issue, milestone, label, project, post, and file compatibility belongs to a separate migrator/export/import deliverable. The app server only carries the legacy `GET /-_-api/v1/hello` health check bootstrap endpoint; other external endpoints must not be added to the frontend/server app unless that deliverable explicitly owns and tests the compatibility adapter.

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
- Separate external compatibility adapters from `/api/v1` app-facing REST APIs, and keep those adapters out of the app server until the migrator/export/import deliverable owns them.
- The Rust migration mapper now supports pure `ProjectApi.exports` JSON to semantic `yobi-data` conversion plus optional downloaded attachment content injection as `contentBase64`; child comments and Markdown `/files/:oldId` link rewriting remain explicit mapper gaps until the CLI/source adapter owns them.
- Add dry-run, resumable import reports, duplicate policy, and attachment checksum validation before claiming production migration parity.

## Guardrail

- Do not add `/-_-api/v1` issue/milestone/label/post/project REST endpoints just because a React view needs data. `GET /-_-api/v1/hello` is the narrow health-check exception.
- Those endpoints require explicit migration/export provenance, tests tied to the external tool contract, and a separate migrator/export/import plan.
