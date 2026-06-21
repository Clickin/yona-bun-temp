# GitHub Migration Evidence Decision

Status: provenance decision
Date: 2026-06-21

## Decision

`SPEC.md`'s old `GitHub Import` row is not the implemented `/_import` Git URL
clone form. It is also not a legacy-backed GitHub-to-Yona or GitHub-to-Rust
import flow.

Legacy evidence shows a disabled-by-default `/migration` tool for outbound
Yona-to-GitHub migration. It reads Yona project labels, milestones, issues,
posts, comments, and attachment links from legacy Yona export helpers, then the
browser-side Angular migration script writes milestones and issue-import
payloads to GitHub API endpoints.

Therefore:

- Keep `/_import` as already implemented app-runtime Git clone parity.
- Reclassify the ambiguous `GitHub Import` deferred row as legacy outbound
  GitHub migration, not app-runtime project import.
- Do not mount GitHub API migration behavior in the Rust app runtime.
- Any future work belongs in migration-tool code as an evidence-gated external
  destination adapter with deterministic GitHub API fixtures/mocks.
- A GitHub-to-Rust/Yona import adapter remains not applicable until legacy
  route/controller/test evidence proves such source semantics.

## Legacy Evidence

| Evidence | Finding |
| --- | --- |
| `yona-original/conf/routes:18-25` | Legacy `/migration` exposes project, labels, issue-label pairs, milestones, issues, and posts export helpers. |
| `yona-original/conf/routes:92-94` | Legacy `/_import` is a separate Git project import form/mutation handled by `ImportApp`, not the GitHub migration tool. |
| `yona-original/app/controllers/ImportApp.java:52-90` | `ImportApp` binds a project form, reads `url`/`authId`/`authPw`, and calls `GitRepository.cloneRepository(...)`. |
| `yona-original/test/controllers/ImportAppTest.java:71-187` | Legacy tests cover `/_import` auth, clone creation, empty URL, duplicate project name, and invalid project name. They do not cover GitHub API migration. |
| `yona-original/conf/application.conf.default:323-329` | Legacy config names this feature "Github Migration", defaults `github.allow.migration = false`, and requires GitHub client id/secret. |
| `yona-original/app/controllers/MigrationApp.java:50-90` | `/migration` is gated by `github.allow.migration`; it exchanges a GitHub OAuth code for an access token. |
| `yona-original/app/views/migration/home.scala.html:5-7` | The legacy UI declares "Yona to Github", confirming outbound migration direction. |
| `yona-original/app/views/migration/home.scala.html:89-116` | The legacy UI has milestone, issue, and post migration actions. |
| `yona-original/app/controllers/MigrationApp.java:161-237` | Legacy source export helpers return issue-label pairs, labels, milestones, posts, and issues from Yona. |
| `yona-original/app/controllers/MigrationApp.java:313-383` | Legacy post/issue export payloads are wrapped under GitHub-compatible `issue` and `comments` keys. |
| `yona-original/app/controllers/MigrationApp.java:386-408` | Legacy comments are converted to GitHub import-style `created_at`/`body` payloads with original author/link text. |
| `yona-original/public/javascripts/service/yona.Migration.js:16-23` | The migration script sets `GITHUB_API_BASE_URL` and GitHub issue-import preview `Accept` header. |
| `yona-original/public/javascripts/service/yona.Migration.js:86-89` | The migration UI redirects to GitHub OAuth with `user,repo,admin:org` scopes. |
| `yona-original/public/javascripts/service/yona.Migration.js:781-870` | The script reads source data from Yona `/migration/...` endpoints and destination repositories from GitHub. |
| `yona-original/public/javascripts/service/yona.Migration.js:873-920` | Milestones are POSTed to GitHub `/repos/:owner/:repo/milestones`. |
| `yona-original/public/javascripts/service/yona.Migration.js:930-980` | Board posts are transformed into GitHub issue-import payloads and tagged with the legacy post label. |
| `yona-original/public/javascripts/service/yona.Migration.js:982-1059` | Issues are transformed through assignee, label, empty-body, and milestone mapping, then POSTed to GitHub `/repos/:owner/:repo/import/issues`. |

## Negative Evidence

Searches over `yona-original/conf/routes`, `yona-original/app/controllers`,
`yona-original/app/views`, `yona-original/public/javascripts/service`, and
`yona-original/test` found no legacy GitHub-to-Yona import route, no controller
that receives GitHub labels/milestones/issues/comments from GitHub as a source,
and no legacy tests for GitHub API migration semantics.

The similarly named
`POST /-_-api/v1/owners/:owner/projects/:projectName/issues/imports` route is
`IssueApi.imports()`, which converts an existing Yona board post into a Yona
issue by `postNumber`. It is not GitHub API import.

## Rust Scope

The current Rust app already covers the legacy `/_import` Git clone behavior
and should keep that as app-runtime project parity.

The legacy outbound GitHub migration UI/API is external-provider migration
scope. It can be revived only as a migration-tool destination adapter, using
fixtures for:

- Yona source export payloads from `/migration/:owner/projects/:projectName/*`.
- GitHub destination repository/user/admin checks.
- GitHub milestone creation.
- GitHub issue-import creation with comments, dates, labels, assignee mapping,
  milestone mapping, post-to-issue conversion, empty body fallback, and the
  legacy post label.
- The unsupported attachment delegation path, which the legacy script logs as
  not supported.
