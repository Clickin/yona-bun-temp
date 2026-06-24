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
| `rc-ux-auth-shell`           | Logged-in `/`, global navigation, user menu, sidebar, notification affordances                                                                                                                                                       | React-rendered root shell matches legacy navbar, `#mySidenav`, user menu tab panes, site-admin affix, and notification entry points.                         | `pass`      |
| `rc-ux-directory-create`     | `/projects`, `/projectform`, `/_import`, `/orgs`, `/organizations/new`                                                                                                                                                               | Directory filters, create/import forms, org empty/list states, labels, route shells, and permission visibility.                                              | `pass`      |
| `rc-ux-user-workspace`       | `/admin`, `/user/issues`, `/user/issues/new/mine`, `/user/files`, `/user/editform/**`                                                                                                                                                | Profile/workspace, assigned issue shortcuts, files, settings, email/token/avatar forms, validation, and redirects.                                           | `pass`      |
| `rc-ux-search-notification`  | `/search`, `/notifications`, `/notification`                                                                                                                                                                                         | Search filter/result/pagination/copy parity, hostile result rendering safety, full notification page, and partial notification UX rendered in React.         | `pass`      |
| `rc-ux-site-admin`           | `/sites/userList`, `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`, `/sites/massmail`, `/sites/update`, `/sites/diagnostic`, `/sites/data`                                                                | Site-admin sidebar, tables, pagination, modals, mail/test-mail flows, update/download state, diagnostic/data import-export UX, and admin-only access.        | `pass`      |
| `rc-ux-project-home-code`    | `/admin/sample`, `/admin/sample/code`, `/admin/sample/commits`, `/admin/sample/branches`                                                                                                                                             | Project header/menu, home/code browser, legacy non-2xx observations, VCS empty/error states, and clone/deep-link affordances.                                | `pass`      |
| `rc-ux-issues`               | `/admin/sample/issues`, `/admin/sample/issue/1`, `/admin/sample/issueform`, `/admin/sample/issue/labelsform`                                                                                                                         | Issue list/detail/create/edit/comment, labels, state tabs, assignee/milestone/filter/sort, watch/vote/share, timeline, attachments, and XSS/Markdown safety. | `pass`      |
| `rc-ux-board`                | `/admin/sample/posts`, board post create/detail/comment routes                                                                                                                                                                       | Board list/detail/create/edit/delete/comment, project selector, labels, watch, empty states, and route-level permissions.                                    | `pass`      |
| `rc-ux-milestones`           | `/admin/sample/milestones`, `/admin/sample/milestones/new`                                                                                                                                                                           | Milestone list/detail/create/edit/state/delete, progress/state copy, issue association links, and validation.                                                | `pass`      |
| `rc-ux-pull-requests`        | `/admin/sample/pullRequests`, `/admin/sample/newPullRequestForm`, `/admin/sample/reviews`, `/admin/sample/pullRequest/**`                                                                                                            | PR list/create/review/merge/comment, manual conflict guidance, branch selector states, and documented legacy non-2xx behavior.                               | `pass`      |
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

### `rc-ux-auth-shell`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has the
  logged-in `/` audit with HTTP 200 and no missing anchors or structural tokens
  for `gnb-outer` and `admin-logged-in-affix`.
- Rendered shell evidence:
  `frontend/tests/legacy-rendered-page-audit.e2e.ts` checks `#mySidenav`,
  `#usermenu-tab-content-list`, `#myOrganizationList`, `#myProjectList`,
  `#myRecentIssueList`, `gnb-outer`, and `admin-logged-in-affix` on the
  logged-in root shell.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/root-custom-navbar-link.spec.ts src/auth-workspace-shell.spec.tsx
src/route-parity.spec.tsx` passed with 3 files and 117 tests.
- Rendered e2e verification: `pnpm --dir frontend test:e2e --
tests/legacy-rendered-page-audit.e2e.ts -g "renders legacy audited anchors for
  logged-in /"` was rerun outside the sandbox after localhost `listen EPERM`;
  the wrapper executed the whole file and passed 43 tests.

### `rc-ux-directory-create`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/projects`, `/projectform`,
  `/_import`, `/orgs`, and `/organizations/new`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, and `e2e-render-coverage.json` map those paths to
  Rust routes and rendered legacy signal evidence, including `all-projects`,
  `newProjectForm`, `project-name`, `advanced-options`, `importGit`, `url`,
  `page-wrap-outer`, and `name`.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/project-create-parity.spec.tsx src/project-import-parity.spec.tsx
src/organization-shell-i18n.spec.tsx src/auth-workspace-shell.spec.tsx
src/route-parity.spec.tsx` passed with 5 files and 131 tests.
- Backend direct-route verification: `pnpm agent:cargo-test --
--outside-sandbox -p yona-rust-pilot-server --test org_project_contract
  project_import_direct_route_clones_git_repository_and_preserves_legacy_errors
  -- --nocapture` passed with 1 test.

### `rc-ux-user-workspace`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/admin`, `/user/issues`,
  `/user/issues/new/mine`, `/user/files`, `/user/editform`,
  `/user/editform/password`, `/user/editform/notifications`,
  `/user/editform/emails`, and `/user/editform/token`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, and `e2e-render-coverage.json` map those paths to
  Rust routes and rendered legacy signal evidence, including `user-info-box`,
  `page-wrap-outer`, `attachment-files`, `password`, `notification`, `email`,
  and `token`.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/user-files-parity.spec.tsx src/workspace-settings-i18n.spec.tsx
src/workspace-profile-i18n.spec.tsx src/wave1-auth-workspace-parity.spec.tsx
src/auth-workspace-shell.spec.tsx src/route-parity.spec.tsx` passed with 6
  files and 134 tests.
- Backend direct-route verification: these `auth_workspace_contract` tests
  passed outside the sandbox:
  `direct_legacy_profile_and_email_routes_accept_form_csrf_redirect_and_mutate_workspace_state`,
  `direct_legacy_email_delete_and_set_main_routes_redirect_and_mutate_email_state`,
  `direct_legacy_token_reset_route_accepts_form_csrf_redirects_and_rotates_api_token`,
  and `direct_legacy_reset_visited_and_default_login_page_routes_match_workspace_state`.

### `rc-ux-search-notification`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for
  `/search?keyword=yona&searchType=auto`, `/notifications`, and
  `/notification?from=0&limit=20`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, and `e2e-render-coverage.json` map those paths to
  Rust routes and rendered legacy signal evidence, including `search`, `keyword`,
  and `notification`.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/search-i18n.spec.tsx
src/directory-home-user-files-notification-i18n.spec.tsx
src/user-profile-route-loading-shell-i18n.spec.tsx src/route-parity.spec.tsx`
  passed with 4 files and 68 tests.
- Rendered e2e verification: `pnpm --dir frontend test:e2e --
tests/search-parity.e2e.ts` passed outside the sandbox with 6 tests, including
  hostile search result text rendered as inert text.
- Backend verification: these focused contracts passed outside the sandbox:
  `search_contract::global_search_treats_sql_injection_probe_as_plain_keyword`,
  `notification_contract::notification_contract_lists_current_user_notifications_with_paging`,
  and
  `notification_contract::notification_contract_direct_notification_route_returns_legacy_partial_fragment`.

### `rc-ux-site-admin`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/sites/userList`,
  `/sites/projectList`, `/sites/postList`, `/sites/issueList`, `/sites/mail`,
  `/sites/massmail`, `/sites/update`, `/sites/diagnostic`, and `/sites/data`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, and `e2e-render-coverage.json` map those paths to
  the Rust site-admin route and rendered legacy signal evidence.
- Parity fixes closed in this packet: site-admin document title now renders
  `Site Admin`, site-admin-only legacy copy fallbacks preserve observed key-style
  labels where legacy exposes keys, update download uses
  `/sites/update/download-file`, and the root sidebar no longer creates a false
  active tab collision inside site-admin pages.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/site-admin-route-parity.spec.tsx src/site-admin-data-parity.spec.tsx
src/route-parity.spec.tsx` passed with 3 files and 74 tests.
- Rendered e2e verification: `pnpm --dir frontend test:e2e --
tests/site-admin-user-list-parity.e2e.ts
tests/site-admin-project-list-parity.e2e.ts
tests/site-admin-post-list-parity.e2e.ts
tests/site-admin-issue-list-parity.e2e.ts
tests/site-admin-mail-parity.e2e.ts
tests/site-admin-update-parity.e2e.ts
tests/site-admin-diagnostic-parity.e2e.ts` passed outside the sandbox with 10
  tests.
- Backend verification: these focused `site_admin_contract` tests passed outside
  the sandbox:
  `site_admin_user_list_and_toggles_follow_legacy_state_buckets`,
  `site_admin_project_list_and_delete_follow_legacy_surface`,
  `site_admin_post_list_follows_legacy_read_only_surface`,
  `site_admin_issue_list_follows_legacy_state_tabs`,
  `site_admin_diagnostics_are_site_admin_only_and_report_legacy_error_list`,
  `site_admin_update_status_follows_legacy_update_view_branches`,
  `site_admin_mail_send_and_recipient_lookup_follow_legacy_surface`,
  `site_admin_export_download_follows_legacy_site_data_route`, and
  `site_admin_import_dry_run_reports_counts_and_never_writes`.

### `rc-ux-project-home-code`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/admin/sample` and
  `/admin/sample/code`. The same audit records `/admin/sample/commits` as
  expected legacy 404 and `/admin/sample/branches` as expected legacy 500.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, `e2e-render-coverage.json`, and
  `anchor-coverage.json` map `/admin/sample`, `/admin/sample/code`,
  `/admin/sample/commits`, and `/admin/sample/branches` to Rust routes, parity
  specs, and rendered legacy signal evidence.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/project-home-tabs.spec.tsx src/project-code-browser-routing.spec.ts
src/code-views.spec.tsx src/route-parity.spec.tsx` passed with 4 files and
  130 tests.
- Rendered e2e verification: `pnpm --dir frontend test:e2e --
tests/legacy-rendered-page-audit.e2e.ts -g "project (home|code)"` executed
  the audit file outside the sandbox and passed all 43 tests, including project
  home and project code anchors.
- Backend verification: these focused `code_browser_contract` tests passed
  outside the sandbox:
  `rest_code_browser_reads_root_folder_and_text_file_from_git_repo`,
  `rest_commit_history_lists_branch_and_path_commits_from_git_repo`, and
  `rest_branch_list_renders_default_branch_first_with_legacy_actions`.

### `rc-ux-issues`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/admin/sample/issues`,
  `/admin/sample/issue/1`, `/admin/sample/issueform`, and
  `/admin/sample/issue/labelsform`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, `e2e-render-coverage.json`, and
  `anchor-coverage.json` map issue list/detail/form/label routes to Rust
  routes, parity specs, rendered e2e coverage, and project header/menu anchor
  evidence.
- Test expectation fixes closed in this packet: issue shell e2e now follows the
  runtime legacy copy and current DOM visibility for issue form headings,
  comment submit, organization issue tabs, empty vote/watcher shells, and
  translated forbidden/not-found route status pages. Backend issue contracts now
  verify the current numeric REST id shape.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/issue-board-pr-milestone-i18n.spec.tsx src/issue-detail-shell.spec.tsx
src/issue-list-filter.spec.tsx src/issue-label-settings-i18n.spec.tsx
src/issue-attachment-upload.spec.ts src/route-parity.spec.tsx` passed with 6
  files and 85 tests.
- Rendered e2e verification: `pnpm --dir frontend test:e2e --
tests/legacy-rendered-page-audit.e2e.ts -g "project issue|XSS payloads"`
  executed the audit file outside the sandbox and passed all 43 tests,
  including project issue form/list/detail/labels anchors and issue detail XSS
  inertness. Focused `shell-routing-smoke.e2e.ts` line targets passed for issue
  list/detail filters, direct issue-from-comment form, my-issue form, issue
  comment image upload, organization issue inbox, issue label management, and
  issue forbidden/not-found shells.
- Backend verification: these focused contracts passed outside the sandbox:
  `issue_core_contract`, `issue_comment_vote_contract`, `issue_label_contract`,
  `issue_sharer_contract`, `issue_assignable_contract`,
  `issue_mention_contract`, `issue_reference_autocomplete_contract`, and
  `organization_issue_contract`.

### `rc-ux-milestones`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/admin/sample/milestones`
  and `/admin/sample/newMilestoneForm`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, `e2e-render-coverage.json`, and
  `anchor-coverage.json` map the milestone list and create-form routes to Rust
  routes, parity specs, and rendered legacy signal evidence.
- Test expectation fixes closed in this packet: milestone e2e now expects the
  runtime English legacy copy (`Open`, `Closed`, `All`, `List`, `Edit`,
  `Close milestone`, `Save`) where the runtime message provider is active, while
  preserving key fallback checks for controls that still render legacy keys such
  as `title.text`. The backend milestone contract now verifies the current REST
  summary shape (`id` as a number, state via filtered list results).
- Frontend verification: `pnpm --dir frontend exec vitest run
src/issue-board-pr-milestone-i18n.spec.tsx src/route-parity.spec.tsx` passed
  with 2 files and 68 tests.
- Rendered e2e verification: these focused `shell-routing-smoke.e2e.ts` line
  targets passed outside the sandbox: `:1829` milestone list/detail/form shell,
  `:1878` create editor image upload, and `:1970` edit editor image upload.
- Backend verification: `pnpm agent:cargo-test -- --outside-sandbox -p
yona-rust-pilot-server --test milestone_contract -- --nocapture` passed.

### `rc-ux-board`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/admin/sample/posts` and
  `/admin/sample/postform`.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, `e2e-render-coverage.json`, and
  `anchor-coverage.json` map board list and create-form routes to Rust routes,
  parity specs, rendered e2e coverage, and project header/menu anchor evidence.
- Test expectation fixes closed in this packet: board e2e now targets the
  runtime English legacy copy for search, label, sort, pagination, watch,
  comment, and save/delete controls; the backend board contract now verifies
  current numeric REST ids rather than stale string expectations.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/issue-board-pr-milestone-i18n.spec.tsx src/issue-list-filter.spec.tsx
src/route-parity.spec.tsx` passed with 3 files and 69 tests.
- Rendered e2e verification: `pnpm --dir frontend test:e2e --
tests/board-posting-parity.e2e.ts` passed outside the sandbox with 6 tests,
  covering board list filters/sort/pagination, detail watch, comment
  create/update/delete, post create/edit/delete, image upload insertion, and
  organization board filters.
- Backend verification: these focused contracts passed outside the sandbox:
  `board_contract_manages_project_posts_comments_watch_and_notifications` and
  `organization_board_contract_lists_visible_cross_project_posts_without_notice_pin`.

### `rc-ux-pull-requests`

- Legacy curl audit: `.agent/legacy-html-page-audit/latest.json` has HTTP 200
  with no missing anchors or structural tokens for `/admin/sample/pullRequests`
  and `/admin/sample/reviews`. The same audit records
  `/admin/sample/newPullRequestForm` as expected legacy HTTP 400 for the sampled
  project/branch state.
- Route/render coverage: `.agent/legacy-html-page-audit/route-coverage.json`,
  `parity-spec-coverage.json`, `e2e-render-coverage.json`, and
  `anchor-coverage.json` map PR list, review list, create form, detail, changes,
  and review-thread routes to Rust routes, parity specs, rendered e2e coverage,
  and project header/menu anchor evidence.
- Parity fixes closed in this packet: PR e2e assertions now follow runtime
  legacy copy for create/edit/comment/review/merge/source-branch controls and
  translated error shells. PR event timeline no longer leaks
  `pullRequest.event.*` keys for merge/open/closed/conflict/resolved states.
  The backend PR read contract now verifies the current numeric REST issue
  number shape.
- Frontend verification: `pnpm --dir frontend exec vitest run
src/pull-request-list-form-review-i18n.spec.tsx
src/pull-request-review-i18n.spec.tsx
src/pull-request-route-loading-shell-i18n.spec.tsx
src/project-reviews-export.spec.tsx src/route-parity.spec.tsx` passed with 5
  files and 69 tests.
- Rendered e2e verification: `pnpm --dir frontend test:e2e --
tests/pull-request-review-read-parity.e2e.ts` passed outside the sandbox with 2
  tests, and `pnpm --dir frontend test:e2e --
tests/pull-request-interaction-parity.e2e.ts` passed outside the sandbox with 7
  tests covering create/edit forms, comments, inline review, outdated threads,
  conflict guidance, merge, source-branch delete/restore, and image upload
  insertion.
- Backend verification: these focused contracts passed outside the sandbox:
  `pull_request_read_contract`, `pull_request_mutation_contract`, and
  `project_fork_contract`.

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
