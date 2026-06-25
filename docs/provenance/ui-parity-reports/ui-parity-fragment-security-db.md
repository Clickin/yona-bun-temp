# UI Parity Report: Fragment / Security / DB

Status: explorer report only
Packet: `ui-parity-fragment-security-db`
Date: 2026-06-26

Scope audited: legacy HTML fragment conversions, XSS/SQLi/pathological Markdown evidence, visual sweep status deltas, and DB/migration smoke evidence. This report is documentation-only and does not propose implementation work.

## Sources

Legacy evidence:

- `yona-original/conf/routes`
- `yona-original/app/controllers/IssueApp.java`
- `yona-original/app/controllers/NotificationApp.java`
- `yona-original/app/utils/HttpUtil.java`
- `yona-original/app/views/issue/view.scala.html`
- `yona-original/app/views/issue/partial_comments.scala.html`
- `yona-original/app/views/index/notifications.scala.html`
- `yona-original/app/views/index/partial_notifications.scala.html`
- `yona-original/app/views/common/usermenu_tab_content_list.scala.html`
- `yona-original/app/views/common/sidebar.scala.html`
- `yona-original/app/utils/Markdown.java`

Current evidence:

- `SPEC.md` FG-05 issue rules and REST JSON/API boundary rules
- `docs/plans/2026-06-26-full-ui-parity-subagent-phase.md`
- `docs/plans/2026-06-24-rc-ux-diff-closure-checklist.md`
- `docs/provenance/legacy-html-page-audit.md`
- `docs/provenance/visual-parity-sweep-2026-06-25.md`
- `output/playwright/visual-sweep/latest.json`
- `frontend/src/routes/-markdown-renderer.tsx`
- `frontend/src/markdown-renderer.spec.tsx`
- `frontend/src/markdown-render-boundary.spec.tsx`
- `frontend/tests/legacy-rendered-page-audit.e2e.ts`
- `frontend/tests/search-parity.e2e.ts`
- `frontend/src/app-view-models.ts`
- `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`
- `frontend/src/routes/notification/route.tsx`
- `frontend/src/routes/notifications/route.tsx`
- `frontend/src/api/notifications.ts`
- `crates/server/src/routes/issues.rs`
- `crates/server/src/routes/notifications.rs`
- `crates/server/tests/issue_core_contract.rs`
- `crates/server/tests/notification_contract.rs`
- `crates/server/tests/search_contract.rs`
- `crates/server/tests/db_matrix_env.rs`
- `crates/server/tests/db_matrix_testcontainers.rs`
- `crates/persistence/src/repo/search.rs`
- `scripts/visual-parity-sweep.mjs`
- `scripts/smoke-legacy-mariadb-dump.mjs`
- `tests/server-spa-rest-boundary-contract.test.mjs`
- `tests/rc-ux-checklist-contract.test.mjs`

## Summary

Total rows: 12

| status | count |
| --- | ---: |
| covered | 11 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 1 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Rows

| surface | legacy source | current source | user state | interaction state | boundary | status | proposed owner scope |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Issue detail timeline fragment, `/:user/:project/issue/:number/timeline` | `yona-original/conf/routes`, `IssueApp.timeline`, `issue/view.scala.html`, `issue/partial_comments.scala.html`; legacy returned `partial_comments.render(project, issueInfo)` | `/api/v1/projects/:owner/:project/issues/:number` in `crates/server/src/routes/issues.rs`, `frontend/src/app-view-models.ts`, `frontend/src/routes/$owner/$projectName/issue/$issueNumber/route.tsx`, `issue_core_contract_creates_reads_updates_and_deletes_over_rest` | authenticated project reader/member on readable issue | detail initial render and post-comment timeline refresh | REST JSON issue detail returns `comments` plus `timeline`; React renders legacy comment/event anchors | covered | none |
| Project issue-list XHR/PJAX rows | `IssueApp.issues` checks `HttpUtil.isRequestedWithXHR` and `HttpUtil.isPJAXRequest`, then returns `issuesAsPjax` for PJAX or JSON for XHR | `crates/server/tests/issue_core_contract.rs` sends `X-Requested-With: XMLHttpRequest` and `X-PJAX: true` to `/api/v1/projects/:owner/:project/issues` and asserts `application/json` list payload; React issue list route renders rows from REST data | authenticated project reader/member on populated issue list | XHR/PJAX-style list refresh, state filter retained | Legacy server-rendered PJAX fragment is compatibility evidence only; React app-runtime uses REST JSON plus React render | not-applicable | none, parent decision recorded in `docs/plans/2026-06-26-full-ui-parity-subagent-phase.md` |
| Notification incremental fragment, `/notification?from=&limit=` | `NotificationApp.notifications`, `index/partial_notifications.scala.html` returned notification row HTML for append | `frontend/src/routes/notification/route.tsx`, `frontend/src/api/notifications.ts`, `crates/server/src/routes/notifications.rs`, `notification_contract_direct_notification_route_returns_api_payload`, `notification_contract_direct_notification_html_accept_serves_spa_shell` | authenticated user with empty or populated inbox | direct API fetch and browser navigation to fragment URL | API-style request returns JSON; `Accept: text/html` serves SPA shell, not route-owned fragment HTML | covered | none |
| Root sidebar and user-menu fragments | Legacy sidebar/usermenu partials under `yona-original/app/views/common/*` plus direct helper routes | `auth_workspace_contract::direct_legacy_user_sidebar_returns_api_payload`, `auth_workspace_contract::direct_legacy_usermenu_tab_content_list_returns_workspace_api_payload`, `frontend/src/auth-workspace-shell.spec.tsx`, `frontend/tests/legacy-rendered-page-audit.e2e.ts` | authenticated normal user and site admin shell | logged-in root render, sidebar tab content, recent/favorite/project/org sections | Direct compatibility endpoints return API payloads; root shell renders from React state/API data | covered | none |
| Route-owned server HTML fragment guard | Legacy Java controllers commonly returned Play templates/fragments directly | `tests/server-spa-rest-boundary-contract.test.mjs` scans `crates/server/src/routes/**/*.rs` for `Html` and route-owned `text/html` content types | all users, all server route modules | static guard over current route source | Rust route modules do not emit route-owned HTML fragments; SPA asset shell is separate from REST route data | covered | none |
| Markdown render boundary | Legacy Markdown rendered user-controlled issue/board/PR/milestone content from Java utility/template paths | `frontend/src/routes/-markdown-renderer.tsx`, `frontend/src/markdown-render-boundary.spec.tsx`, `frontend/src/markdown-renderer.spec.tsx`, `tests/parity/issue-auth-repository-organization-project-pull-request-search-workspace-notification-site-admin-board-markdown.test.mjs` | authenticated content readers across project surfaces | issue/body/comment/rendered Markdown paths, preview/render states | React `MarkdownRenderer` is the single render boundary; route components do not fetch rendered HTML fragments or use route-level DOM insertion | covered | none |
| XSS rendered-page probes | Legacy source of truth is user-controlled issue title/body/comment and search result rendering in `yona-original/` views/utilities | `docs/provenance/legacy-html-page-audit.md`, `frontend/tests/legacy-rendered-page-audit.e2e.ts`, `frontend/tests/search-parity.e2e.ts`, checklist row `rc-ux-security-stability` | authenticated project reader and search user | hostile issue title/body and hostile search result render | React renders hostile payloads inertly through component/Markdown boundaries, not server HTML injection | covered | none |
| Pathological Markdown probes | Legacy Markdown utility accepts broad Markdown input including raw/invalid/fenced content | `frontend/src/markdown-renderer.spec.tsx` has 429 tests covering script/style stripping, unsafe `javascript:` URL stripping, very long fenced blocks as plain source, EOF/tilde fenced recovery, and invalid Markdown sanitizer cases. `frontend/tests/legacy-rendered-page-audit.e2e.ts` now also proves a browser-visible issue detail with a >65KB SQL fenced block renders under `#issue-body-1 .content.markdown-wrap pre code.sql` as plain source without `.syntax-token` expansion. | authenticated content reader/editor | render and preview of long/invalid Markdown; issue detail page render of pathological SQL fenced block | React Markdown compatibility path handles pathological input without server-rendered HTML fragments | covered | none |
| SQL injection literal keyword probe | Legacy search accepts keyword parameters through search controllers and query builders | `crates/server/tests/search_contract.rs::global_search_treats_sql_injection_probe_as_plain_keyword`, `docs/provenance/legacy-html-page-audit.md`, checklist row `rc-ux-security-stability` | authenticated/global search user | search keyword contains SQL metacharacters | REST search treats SQLi probe as a literal keyword; no broadened result set | covered | none |
| Visual sweep status deltas | Legacy live baseline paths from `yona-original/` routes and homelab sample data | `output/playwright/visual-sweep/latest.json`, `docs/provenance/visual-parity-sweep-2026-06-25.md`, `tests/rc-ux-checklist-contract.test.mjs` | representative anonymous/authenticated/site-admin/project states from visual sweep | route-entry render and same-path status comparison | Deltas are documented as homelab reference timeout/error or sample-data variance; Rust rendered successfully without not-found/forbidden/bad-request/raw-key local failure state | covered | none |
| Legacy MariaDB in-place adopt smoke | Legacy DB shape from ignored `.agent/legacy-dumps/yona-dump.sql` and legacy MariaDB runtime | `scripts/smoke-legacy-mariadb-dump.mjs`, checklist row `rc-ux-db-migration-smoke`; smoke imports MariaDB 10.3 dump, validates/adopts schema, and reads `/api/v1/users/:loginId/profile` | migrated non-anonymous legacy user | validate-only startup, adopt startup, migrated profile API read | Adopted data is exposed through REST API and React-owned profile surfaces, not legacy server templates | covered | none |
| Env-backed DB matrix | Legacy app expected production DB portability around MariaDB/MySQL-like storage; Rust supports SQLite/PostgreSQL/MySQL/MariaDB matrix | `crates/server/tests/db_matrix_env.rs`, checklist row `rc-ux-db-migration-smoke` | seeded project/user/issue repository state | runtime migration, seed, issue read/update | Repository and REST-backed app data path works on SQLite plus configured external PostgreSQL/MySQL/MariaDB URLs | covered | none |
| Live DB-native search matrix | Legacy search behavior must remain user-visible while Rust uses DB-native search per supported dialect | `crates/server/tests/db_matrix_testcontainers.rs`, `crates/persistence/src/repo/search.rs` SQLite FTS5, PostgreSQL `to_tsvector`, MariaDB `MATCH ... AGAINST` paths | seeded project issue search data on SQLite/PostgreSQL/MariaDB | runtime schema creation, idempotent migration, seeded issue search | DB-native search paths preserve REST search behavior across supported DBs | covered | none |

## Notes

- No `gap`, `deviation`, `weak evidence`, or `needs-parent-decision` row was found for this packet. The one non-covered row is `not-applicable` because the parent has already classified legacy issue-list PJAX HTML fragments as compatibility evidence, not as a React data source to preserve.
- The report intentionally does not ask for server-rendered fragment implementation. The current evidence supports the canonical conversion boundary: REST JSON/API-return plus React render.
