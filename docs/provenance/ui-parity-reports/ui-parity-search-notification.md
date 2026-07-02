# UI Parity Report: Search / Notification

Status: explorer report only
Packet: `ui-parity-search-notification`
Date: 2026-06-26

Scope audited: global/project/organization search, `/notifications`, and `/notification?from=&limit=`. This report does not edit implementation code and treats legacy Yona UI/UX as the only parity source.

## Evidence Scope

Legacy evidence:

- `yona-original/conf/routes`: `/search`, `/organizations/:organizationName/search`, `/:user/:project/search`, `/notifications`, `/notification`
- `yona-original/app/controllers/SearchApp.java`
- `yona-original/app/controllers/NotificationApp.java`
- `yona-original/app/views/search/result.scala.html`
- `yona-original/app/views/search/partial_search.scala.html`
- `yona-original/app/views/search/partial_issues.scala.html`
- `yona-original/app/views/search/partial_users.scala.html`
- `yona-original/app/views/search/partial_projects.scala.html`
- `yona-original/app/views/search/partial_posts.scala.html`
- `yona-original/app/views/search/partial_milestones.scala.html`
- `yona-original/app/views/search/partial_issue_comments.scala.html`
- `yona-original/app/views/search/partial_post_comments.scala.html`
- `yona-original/app/views/search/partial_reviews.scala.html`
- `yona-original/app/views/index/notifications.scala.html`
- `yona-original/app/views/index/partial_notifications.scala.html`
- `yona-original/app/views/common/mySeriesMenuTab.scala.html`
- `yona-original/app/views/common/scripts.scala.html`
- `yona-original/conf/messages`, `yona-original/conf/messages.ko-KR`

Current evidence:

- `frontend/src/routes/-search-views.tsx`
- `frontend/src/routes/search/route.tsx`
- `frontend/src/routes/$owner/$projectName/search/route.tsx`
- `frontend/src/routes/organizations/$organizationName/search/route.tsx`
- `frontend/src/api/search.ts`
- `crates/server/src/routes/search.rs`
- `crates/server/tests/search_contract.rs`
- `crates/search/tests/search_result_legacy_contract.rs`
- `frontend/src/search-i18n.spec.tsx`
- `frontend/src/routes/-home-route-screen.tsx`
- `frontend/src/routes/notifications.tsx`
- `frontend/src/routes/notification/route.tsx`
- `frontend/src/api/notifications.ts`
- `crates/server/src/routes/notifications.rs`
- `crates/server/tests/notification_contract.rs`
- `frontend/src/route-parity.spec.tsx`
- `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`
- `.agent/legacy-html-page-audit/latest.json`
- `output/playwright/visual-sweep/latest.json`
- `docs/provenance/visual-parity-sweep-2026-06-25.md`

## Route Inventory Summary

Total rows: 23

| status | count |
| --- | ---: |
| covered | 22 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 1 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| path | legacy evidence | current evidence | status | proposed owner |
| --- | --- | --- | --- | --- |
| `/search?keyword=&searchType=` global scope | `SearchApp.searchInAll`, `search/result.scala.html`, `search/partial_search.scala.html` render site layout, category counts, and all-project readable results | `frontend/src/routes/search/route.tsx`, `SearchRoutePage`, `readGlobalSearch`, `crates/server/src/routes/search.rs::rest_search_global`, `crates/server/tests/search_contract.rs::global_search_returns_legacy_counts_auto_issue_and_snippet_metadata` | covered | none |
| `/:owner/:project/search?keyword=&searchType=` project scope data | `SearchApp.searchInAProject`, `@IsAllowed(Operation.READ)`, project layout/menu, no project-result category, bad request for `searchType=project` | `frontend/src/routes/$owner/$projectName/search/route.tsx`, `require_project_read`, `scoped_search_rejects_invalid_project_type_and_returns_review_links`, `SearchCategories` hides project category | covered | none |
| `/:owner/:project/search` project scope chrome | `result.scala.html` uses real `projectLayout`, `projectMenu(project, ...)`, and real project header/menu state | `SearchRoutePage` now reads `/api/v1/owners/:owner/projects/:project/container`, maps it through `toProjectContainerView`, and renders `ProjectHeader` / `ProjectMenu` from the real project container; `frontend/tests/search-parity.e2e.ts` asserts header/menu counts | covered in Wave 3 | none |
| `/organizations/:organizationName/search?keyword=&searchType=` organization scope data | `SearchApp.searchInAGroup`, organization header/menu, org-scoped counts/results, hide-project-listing guard | `frontend/src/routes/organizations/$organizationName/search/route.tsx`, `readOrganizationSearch`, `rest_search_organization`, organization scope contract tests for issues/posts/milestones/reviews | covered | none |
| `/organizations/:organizationName/search` organization scope chrome | `result.scala.html` renders `organization.header(group)` and `organization.menu(group)` from the real org model | `SearchRoutePage` now reads `/api/v1/organizations/:organization/container`, maps it through `toOrganizationContainerView`, and renders `OrganizationHeader` / `OrganizationMenu` from the real organization container; `frontend/tests/search-parity.e2e.ts` asserts header/settings link | covered in Wave 3 | none |
| `/search`, scoped search with both `keyword` and `searchType` absent | `SearchApp.searchInAll/searchInAGroup/searchInAProject` returns `badRequest` when keyword or searchType is empty | Current global, project, and organization flat routes treat missing keyword or missing/invalid searchType as `routeInvalid`, render the legacy `error/badrequest_default.scala.html` shell, and avoid REST search calls; project scope also treats `searchType=project` as invalid. `frontend/tests/search-global.e2e.ts`, `frontend/tests/search-project.e2e.ts`, and `frontend/tests/search-organization.e2e.ts` cover direct invalid URLs with no `#searchInnerForm`, `.ico-404`, `error.badrequest`, and `ybtn-info` Home action. | covered in 2026-07-02 Scala HTML rebuild | none |
| `searchType=project` under project scope and invalid search type | `SearchApp.searchInAProject` returns bad request for `SearchType.NA` or `SearchType.PROJECT` | `routeInvalid` maps project type to `BadRequestPage`; REST rejects project type/invalid type with `400`; `search_contract.rs` pins this | covered | none |
| `#searchInnerForm`, category tabs, and badges | `partial_search.scala.html` has `#searchInnerForm`, hidden `searchType`, `#searchKeyword`, `data-toggle="search-category"`, `.num-badge`, active/empty classes | `SearchRoutePage`, `SearchCategories`, `SearchResultTitle`, `frontend/src/search-i18n.spec.tsx` | covered | none |
| Issue and post result rows | `partial_issues.scala.html`, `partial_posts.scala.html`: `.search-list-item`, `#number`, `.title`, snippets, project meta when not project scope, author/date | Generic `SearchResultItem`, REST `issue`/`post` contracts cover href/title/snippets/ACL/ranking | covered | none |
| User result rows | `partial_users.scala.html`: `.search-list-item.project`, `.avatar-wrap`, `.title.user-link`, visible `name (@loginId)`, `.infos` with `userinfo.since`, and legacy `routes.UserApp.userInfo(loginId)` hrefs | Search DTO projection now emits legacy `/<loginId>` user hrefs, REST enriches user search items with `avatarUrl`, and `frontend/src/routes/-search-screen.tsx` renders the user-specific `.search-list-item.project` row, avatar tooltip/image, `.title.user-link`, `name (@loginId)`, member-since copy, and pagination placeholder. Evidence: `crates/persistence/src/repo/search.rs`, `crates/server/src/routes/search.rs`, `crates/server/tests/search_contract.rs::user_search_matches_legacy_login_id_and_name_lookup`, and `frontend/tests/search-global.e2e.ts` for `/search?keyword=member&searchType=user`. | covered in current template-first slice | none |
| Project result rows | `partial_projects.scala.html`: `.search-list-item.project`, project logo, `.title.project-link`, overview, created/code update meta, fork-original block | Search DTO projection now carries fork-origin owner/project names, REST fills project logo URLs where logo attachments exist, and `SearchResultItem` renders the legacy fork-original block plus DTO logo fallback. Evidence: `crates/persistence/src/repo/search.rs`, `crates/server/src/routes/search.rs`, `crates/server/tests/search_contract.rs::project_search_rows_include_legacy_fork_origin_metadata`, `frontend/src/search-i18n.spec.tsx`. | covered in Wave 5 | none |
| Milestone result rows | `partial_milestones.scala.html`: title, snippets, project meta, due-date label with `getDueDateString` and `until` text | Search DTO projection now carries the legacy `Milestone.until()`-style label (`Today`, `{n} days past`, `{n} days left`), and `SearchMeta` renders it beside the due-date label. Evidence: `crates/persistence/src/repo/search.rs`, `crates/server/tests/search_contract.rs::milestone_search_visibility_matches_legacy_public_and_private_acl`, `frontend/src/search-i18n.spec.tsx`, `frontend/src/route-parity.spec.tsx`. | covered in Wave 5 | none |
| Issue-comment, post-comment, review result rows | comment partials use `Re)`, anchor fragments `#comment-id`, snippets; review partial uses `DiffRenderer.urlToCommentThread` | Static render tests and `frontend/tests/search-parity.e2e.ts` now assert `Re)` titles, `#comment-id` href fragments, `#number`, snippets, project/author meta, and review pull-request comment hrefs | covered in Wave 3 | none |
| Search snippets/highlighting | Legacy `SearchResult.makeSnippets(..., 40)` plus client `<strong class="keyword">` replacement | `yoram_search::make_snippets`, `HighlightedSnippet`, `crates/search/tests/search_result_legacy_contract.rs`, `frontend/src/search-i18n.spec.tsx` | covered | none |
| ACL-filtered private absence | Legacy `Search.find*` receives current user and project/org scope; private data absent without read permission | `crates/server/tests/search_contract.rs` covers public/private/protected ACL for projects, issues, posts, comments, milestones, and reviews | covered | none |
| Search empty state | Each legacy type partial renders `<div class="empty-result"></div>` for no rows | `SearchResults` renders `<div className="empty-result"></div>` for no input, loading, no response, or empty items | covered | none |
| Search pagination | Legacy type partials render `<div id="pagination"></div>` and call `yobi.Pagination.update` for pages | `SearchPagination` renders `#pagination`, prev/next controls, page input, and empty `#pagination` when one page | covered | none |
| `/notifications` welcome guide, tabs, empty and one-row states | `index/notifications.scala.html`, `common/mySeriesMenuTab.scala.html`, `partial_notifications.scala.html`, `notification.none`, guide table, `#setDefaultLoginPage` | `frontend/src/routes/notifications.tsx` reuses the active `HomeRouteScreen`; `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares the full direct `/notifications` empty-state DOM with mocked authenticated session and empty notification REST data, including the `#setDefaultLoginPage` button, `data-url`, popover hooks, title, and description copy, and the one-row `.notification-stream` DOM with linked title, message wrapper, avatar/author, and timestamp | covered in 2026-06-30 template-first reset slice | none |
| `#toggleIntro` persistence | Legacy shows `.site-guide-outer` by default unless `localStorage["yobi-intro"] === "false"`, then toggles `.hide` and stores `localStorage["yobi-intro"]` on click | `HomeRouteScreen` implements the same key/class behavior and `frontend/tests/authenticated-home-empty-notifications.e2e.ts` clicks `#toggleIntro`, verifies `.site-guide-outer.hide`, persists `localStorage["yobi-intro"]`, reloads, and toggles back | covered in current follow-up | none |
| Notification stream row expand/collapse | `index/notifications.scala.html` delegates `[data-toggle="learnmore"]` clicks from `.notification-wrap`; link/image targets are ignored, row/message clicks toggle `.message-wrap.nowrap` and `min-height`, and overflowing collapsed rows get a `.more` ellipsis marker | The active flat `/notifications` route keeps the same `.stream-desc[data-toggle=learnmore][data-target=message-*]` DOM and implements the click guard plus overflow marker in `NotificationStreamItem`. `frontend/tests/authenticated-home-empty-notifications.e2e.ts` dispatches title-link and avatar-image clicks without toggling, clicks `.message` to expand/collapse `#message-42` while keeping the route URL stable, and verifies overflowing rows show/hide `.more` with the collapsed state. | covered in current follow-up | none |
| Notification load-more | Legacy `#notification-more` removes itself and GETs `/notification?from=from+size&limit=size`, appending only the next fragment chunk | React now keeps the initial `from=0&size=20` query, renders legacy `#notification-more[href="javascript:void(0);"]`, prevents navigation, calls REST with `from=items.length&size=20`, appends `nextPage.items`, and updates `hasMore`. `frontend/tests/authenticated-home-empty-notifications.e2e.ts` clicks the browser-visible More link, proves `/api/v1/notifications?from=20&size=20`, keeps `/notifications` URL stable, appends the 21st row, and removes the link when `hasMore=false`. | covered in current follow-up | `frontend/src/routes/-home-route-screen.tsx`, `frontend/src/routes/notifications.tsx`, `frontend/tests/authenticated-home-empty-notifications.e2e.ts`, existing notification API query spec |
| `/notification?from=&limit=` JSON/API boundary | Legacy `NotificationApp.notifications` returns server-rendered HTML fragment `partial_notifications` | Rust direct route returns JSON for API-style requests and SPA shell for `Accept: text/html`; `notification_contract_direct_notification_route_returns_api_payload`, `notification_contract_direct_notification_html_accept_serves_spa_shell`, direct API sweep | covered | none |
| Server-rendered notification fragment as React data source | Legacy app used HTML fragment append from `/notification` | Phase rule says converted fragments must stay API-return plus React render; keeping HTML injection as a runtime data source is explicitly out of scope | not-applicable | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/search?keyword=yona&searchType=auto` | authenticated/global/populated | `.search-category-wrap`, `#searchInnerForm`, `Found <strong>...` | `.search-category-wrap`, `#searchInnerForm`, `SearchResultTitle` | submit search; click category tab changes `searchType` | React route calls `/api/v1/search` JSON | covered |
| `/search` | anonymous or authenticated/missing params | legacy `badRequest(ErrorViews.BadRequest.render())` | legacy bad-request shell, no `#searchInnerForm`, no REST search call | direct navigation | React route validation before REST call; REST also rejects missing input | covered in Wave 3 |
| `/pilot/yona/search?keyword=yona&searchType=project` | project scope invalid type | bad request | `BadRequestPage`; REST `400` | direct navigation | React route + `/api/v1/projects/:owner/:project/search` guard | covered |
| `/pilot/yona/search?keyword=yona&searchType=issue` | project scope/populated | real `projectLayout`, no project category | real project container header/menu and no project category | render project header/menu and result list | React route + project search JSON | covered in Wave 3 |
| `/organizations/pilot/search?keyword=yona&searchType=post` | organization scope/populated | real `organization.header`, `organization.menu` | real organization container header/menu and category tab | render org header/menu and category tab | React route + organization search JSON | covered in Wave 3 |
| `/search?keyword=NoSuchNeedle&searchType=issue` | empty result | `<div class="empty-result"></div>` | `<div class="empty-result"></div>` | direct navigation | `/api/v1/search` returns counts/items | covered |
| `/search?keyword=Needle&searchType=user` | user result type | `.avatar-wrap`, `.title.user-link`, `(@loginId)`, `userinfo.since` | same selectors/copy rendered by user-specific branch | direct navigation/result inspection | `/api/v1/search` user item | covered in Wave 3 |
| `/search?keyword=Needle&searchType=project` | project result type | project logo, overview, created/code update, fork-original block | row class/logo/title/overview/created/code-update and fork-original metadata rendered from DTO projection | direct navigation/result inspection | `/api/v1/search` project item | covered in Wave 5 |
| `/search?keyword=Needle&searchType=milestone` | milestone result type | `.due-date`, `label.dueDate`, `getDueDateString`, `until` | `.due-date`, label, and legacy `until` text rendered from DTO projection | direct navigation/result inspection | `/api/v1/search` milestone item | covered in Wave 5 |
| `/notifications` | authenticated/empty inbox | `.site-guide-outer`, `#toggleIntro`, `.nav.nav-tabs`, `#setDefaultLoginPage`, `.warning-none`, `notification.none` | same guide/tabs/default-page button/warning selectors and translated copy in the flat `/notifications` route | direct navigation and whole-screen DOM comparison | React route calls `/api/v1/session` and `/api/v1/notifications?from=0&size=20` through TanStack Query | covered in 2026-06-30 template-first reset slice |
| `/notifications` | authenticated/populated inbox | `.notification-stream`, `.stream-type`, `.stream-desc[data-toggle=learnmore]`, `.message-wrap.nowrap`, avatar/author/date | active flat `/notifications` route renders the row through `HomeRouteScreen` with the same selectors and direct DOM proof for one mocked row; earlier `NotificationRouteComponent` interaction evidence still covers expand/collapse and load-more behavior | whole-screen direct navigation for the one-row state; row/link/img interactions remain covered by focused notification tests | React route calls `/api/v1/notifications` JSON | covered |
| `/notifications` | more than 20 notifications | `#notification-more` GETs `/notification?from=20&limit=20` and appends returned fragment | `#notification-more[href="javascript:void(0);"]` prevents navigation, fetches `/api/v1/notifications?from=<current items>&size=20`, appends returned rows, and disappears when there are no more rows | click More once and assert `from=20&size=20`, stable URL, 20-to-21 row append, and no HTML fragment insertion | React route uses REST JSON plus React append render | covered in current follow-up |
| `/notification?from=0&limit=20` | API/direct conversion | legacy server HTML fragment from `partial_notifications.scala.html` | JSON object with `hasMore`, `items`, `total`; HTML Accept serves SPA shell | direct fetch with API Accept and browser navigation with HTML Accept | direct compatibility boundary, not HTML injection | covered |

## Notes

- 2026-06-27 project search nested-layout follow-up:
  `frontend/src/routes/$owner/$projectName/route.tsx` now owns the project
  header/menu shell for `/search` with the legacy `search-page` class while
  leaving the search page's existing `site-breadcrumb-outer` and
  `page-wrap-outer` order intact. The project search child route passes
  `renderShell={false}` to `SearchRoutePage`. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "real search routes"`.
- No raw visible i18n-key failure was found in the audited search/notification evidence. `frontend/src/search-i18n.spec.tsx`, `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`, and the 2026-06-25 visual sweep raw-key scan are the strongest current evidence.
- The notification direct route has two separate statuses by design: JSON/API-return plus React-render is covered, while retaining legacy server-rendered fragment injection as a runtime data source is not applicable under the phase rule.
- Search scoped chrome is now covered by real project/organization container data rather than synthesized detail, so REST scope, ACL, counts, and visible header/menu state are tracked as one closed parity area.
