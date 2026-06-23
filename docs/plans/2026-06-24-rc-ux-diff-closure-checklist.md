# RC UX Diff Closure Checklist

Status: current RC checklist
Date: 2026-06-24

This checklist is the work queue for closing the remaining legacy Yona to Rust
Yona UX diff. It is not a pass report. The RC passes this gate only when a
server administrator can replace legacy Yona with the Rust port and normal
users do not notice functional, route, copy, or UX differences on the supported
in-place migration path.

## Inputs

- Legacy UX source of truth: `yona-original/`
- Legacy live baseline: `http://192.168.45.10:9000`, `admin` / `admin`
- Current curl HTML audit: `.agent/legacy-html-page-audit/latest.json`
- Current audit notes: `docs/provenance/legacy-html-page-audit.md`
- RC cut line: `docs/plans/2026-06-23-rc-release-scope.md`

## Status Values

| Status                   | Meaning                                                                                   |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `unchecked`              | Not yet compared deeply enough to claim UX parity.                                        |
| `pass`                   | Legacy and Rust route, copy, layout, interaction, mutation, and state behavior match.     |
| `diff`                   | User-visible or behavior-visible mismatch found.                                          |
| `blocked`                | Cannot verify because required fixture, data, route, browser access, or infra is absent.  |
| `not-applicable`         | Legacy evidence proves the surface is not part of the supported app-runtime RC path.      |
| `expected-legacy-non-ok` | Legacy returns non-2xx and Rust behavior is intentionally documented against that source. |

## RC Pass Rule

All of the following must be true before this checklist can be treated as
closed:

- No RC row remains `unchecked`, `diff`, or `blocked`.
- Every internal page link discovered by `pnpm smoke:legacy-html-pages` is
  represented here or classified `not-applicable`.
- Every legacy Java endpoint that returned an HTML fragment is represented by
  API-return plus React-rendered UX evidence, not by a new server-side fragment.
- Expected legacy non-2xx observations are documented and the Rust behavior is
  intentional.
- XSS, SQL injection, and pathological Markdown probes remain green on the same
  surfaces that users can reach after in-place migration.
- The migration/release blockers in
  `docs/plans/2026-06-23-rc-release-scope.md` remain green.

## Per-Page Checks

Each goal packet should close these checks for its page group:

- Route and deep-link: path, query parameters, redirects, status code, and
  not-found/forbidden behavior match legacy.
- Shell and layout: global nav, project header, project menu, sidebar, tabs,
  modal shells, empty wrappers, and pagination wrappers match legacy DOM and
  visible placement.
- Copy: labels, button text, placeholders, message keys, validation text, empty
  states, and error states match legacy.
- Data state: populated, empty, loading, permission-filtered, and failure states
  render the same user-facing result.
- Interaction: links, buttons, tabs, modals, filters, sort controls, form
  submit/cancel paths, and client validation match legacy.
- Mutation/API: create, update, delete, toggle, watch, vote, assign, transfer,
  and admin actions preserve legacy status, redirect, CSRF, and flash behavior.
- Security/stability: user-controlled HTML/script payloads stay inert; SQL
  metacharacters stay literal; long or invalid Markdown renders safely without
  taking down the server.
- Migration data: checks run against adopted legacy MariaDB sample data where
  the page depends on persisted project/user/content state.

## Page Group Matrix

| Goal packet                  | Legacy surface                                                                                                                                                                                                                       | Required evidence                                                                                                                                            | Status      |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------- |
| `rc-ux-public-auth`          | `/`, `/users/loginform`, `/users/signupform`, `/lostPassword`, `/_help`                                                                                                                                                              | Public/auth route, copy, form, redirect, validation, and direct backend route parity.                                                                        | `pass`      |
| `rc-ux-auth-shell`           | Logged-in `/`, global navigation, user menu, sidebar, notification affordances                                                                                                                                                       | React-rendered root shell matches legacy navbar, `#mySidenav`, user menu tab panes, site-admin affix, and notification entry points.                         | `unchecked` |
| `rc-ux-directory-create`     | `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`                                                                                                                                                               | Directory filters, create/import forms, org empty/list states, labels, route shells, and permission visibility.                                              | `unchecked` |
| `rc-ux-user-workspace`       | `/admin`, `/user/issues`, `/user/issues/new/mine`, `/user/files`, `/user/editform/**`                                                                                                                                                | Profile/workspace, assigned issue shortcuts, files, settings, email/token/avatar forms, validation, and redirects.                                           | `unchecked` |
| `rc-ux-search-notification`  | `/search`, `/notifications`, `/notification`                                                                                                                                                                                         | Search filter/result/pagination/copy parity, hostile result rendering safety, full notification page, and partial notification UX rendered in React.         | `unchecked` |
| `rc-ux-site-admin`           | `/sites/userList`, `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/update`, `/sites/diagnostic`, `/sites/data`                                                                | Site-admin sidebar, tables, pagination, modals, mail/test-mail flows, update/download state, diagnostic/data import-export UX, and admin-only access.        | `unchecked` |
| `rc-ux-project-home-code`    | `/admin/sample`, `/admin/sample/code`, `/admin/sample/commits`, `/admin/sample/branches`                                                                                                                                             | Project header/menu, home/code browser, legacy non-2xx observations, VCS empty/error states, and clone/deep-link affordances.                                | `unchecked` |
| `rc-ux-issues`               | `/admin/sample/issues`, `/admin/sample/issue/1`, `/admin/sample/issues/new`, label issue filters/settings                                                                                                                            | Issue list/detail/create/edit/comment, labels, state tabs, assignee/milestone/filter/sort, watch/vote/share, timeline, attachments, and XSS/Markdown safety. | `unchecked` |
| `rc-ux-board`                | `/admin/sample/posts`, board post create/detail/comment routes                                                                                                                                                                       | Board list/detail/create/edit/delete/comment, project selector, labels, watch, empty states, and route-level permissions.                                    | `unchecked` |
| `rc-ux-milestones`           | `/admin/sample/milestones`, `/admin/sample/milestones/new`                                                                                                                                                                           | Milestone list/detail/create/edit/state/delete, progress/state copy, issue association links, and validation.                                                | `unchecked` |
| `rc-ux-pull-requests`        | `/admin/sample/pullRequests`, `/admin/sample/newPullRequest`, `/admin/sample/newPullRequestForm`, `/admin/sample/pullRequest/**`                                                                                                     | PR list/create/review/merge/comment, manual conflict guidance, branch selector states, and documented legacy non-2xx behavior.                               | `unchecked` |
| `rc-ux-project-admin`        | `/admin/sample/members`, `/admin/sample/watchers`, `/admin/sample/settings`, `/admin/sample/webhooks`, `/admin/sample/delete`, `/admin/sample/transfer`, `/admin/sample/fork`, `/admin/sample/statistics`, `/admin/sample/changeVCS` | Member/watch/settings/webhook/delete/transfer/fork/statistics/change-VCS shells, modals, permissions, mutations, and legacy warning copy.                    | `unchecked` |
| `rc-ux-fragment-conversions` | Legacy server-returned fragments such as notification/sidebar/user-menu surfaces                                                                                                                                                     | Each legacy fragment endpoint has equivalent API-return plus React-rendered UX evidence on the containing route.                                             | `unchecked` |
| `rc-ux-security-stability`   | User-controlled Markdown/search/title/body inputs across RC pages                                                                                                                                                                    | XSS, SQLi literal keyword behavior, long SQL fenced code block fallback, and invalid Markdown recovery stay green.                                           | `unchecked` |
| `rc-ux-db-migration-smoke`   | Adopted legacy MariaDB plus SQLite, PostgreSQL, MySQL/MariaDB runtime matrix                                                                                                                                                         | In-place legacy MariaDB adopt and supported DB matrix prove the same pages work from migrated data, including DB-specific search behavior.                   | `unchecked` |

## Closed Row Evidence

### `rc-ux-public-auth`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/`, `/users/loginform`,
  `/users/signupform`, `/lostPassword`, and `/_help`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, and `e2e-render-coverage.json` map those paths to
  Rust routes and rendered legacy signal evidence.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/wave1-auth-workspace-parity.spec.tsx src/auth-workspace-shell.spec.tsx
src/help-route-parity.spec.tsx src/route-parity.spec.tsx` passed with 4 files
  and 129 tests.
- Backend direct-route verification: `pnpm agent:cargo-test --
--outside-sandbox -p yona-rust-pilot-server --test auth_workspace_contract
direct_legacy_login_and_signup_form_routes_accept_legacy_form_csrf_redirect_and_authenticate
-- --nocapture` passed.
- Note: the broader filtered cargo command `pnpm agent:cargo-test --
--outside-sandbox -p yona-rust-pilot-server auth_workspace_contract --
--nocapture` currently fails before running this row's tests because
  `crates/server/tests/server_core_contract.rs` references missing module
  `protocol_foundation_contract`.

## Goal Packet Template

Use one packet per row in the matrix:

```text
/goal rc-ux-<group>
Objective: close docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md row <group>.
Rules:
- Compare legacy evidence from yona-original/ and the homelab HTML audit.
- Verify Rust route, copy, DOM anchors, interaction, mutation, security, and migration data behavior.
- Implement only legacy parity fixes. Do not introduce product improvements.
- Update this checklist status and evidence paths.
- Add or update focused tests/smokes that would fail on the observed diff.
- Commit the completed row.
Done when:
- The row status is pass, not-applicable, or expected-legacy-non-ok.
- Any new gap/deviation/deferred item is recorded in canonical docs and provenance.
```

## Explicitly Outside This Checklist

These are post-RC product roadmap items unless a legacy parity failure or server
stability issue makes them user-visible in the replacement path:

- Search ranking/product UX redesign.
- External search engines beyond DB-native query/FTS plus literal fallback.
- Mattermost or new Slack-compatible client integration.
- New calendar/schedule management beyond existing issue/milestone behavior.
- Markdown renderer rewrite, workerization, or server-side prerendering.
