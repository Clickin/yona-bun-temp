# Template-First UI Parity Report: P6 Organization/Directory/Workspace

Status: current reset baseline
Date: 2026-06-27
Owner packet: P6 organization/directory/workspace
Mode: template-first mapper baseline; implementation evidence reviewed

## Scope

This report reopens organization, project/organization directory, user
workspace/profile, user settings/files, and notification stream parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-directory-organization.md`,
`ui-parity-user-workspace-profile.md`,
`ui-parity-user-account-settings.md`, and
`ui-parity-search-notification.md` reports remain useful route/API evidence.
This report restates their P6-owned portions in the template-first reset format
and keeps the app-runtime boundary explicit: legacy server-rendered fragments
are implemented as REST JSON/API-return plus React-rendered legacy DOM.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/index/allProjectList.scala.html`, `allProjectList_partial.scala.html`, `allOrganizationList.scala.html`, `allOrganizationList_partial.scala.html` | Project and organization directories. | directory tabs, search form `filter`, `.error-wrap`, project/org rows, created/code-update metadata, `#pagination`. |
| `yona-original/app/views/organizationLayout.scala.html`, `organization/header.scala.html`, `organization/menu.scala.html` | Organization shell. | organization header/menu, settings/member/project navigation, visibility/enrollment actions. |
| `organization/create.scala.html`, `organization/view.scala.html`, `organization/setting.scala.html`, `organization/members.scala.html`, `organization/deleteForm.scala.html`, `partial_settingmenu.scala.html` | Organization create/home/settings/members/delete. | `#mylist-filter`, `.all-projects`, `#groupLeaveBtn`, `#alertLeave`, `#addNewMember`, `#loginId[data-provider=typeahead]`, `.members.project`, role dropdowns, `#alertDeletion`, logo upload controls, delete confirm. |
| `organization/group_issue_list*.scala.html`, `group_board_list*.scala.html`, `group_pullrequest_list*.scala.html` | Organization aggregate issue/board/PR lists. | organization header/menu plus aggregate filters, quick search, rows, pagination. Board/PR list internals are P4/P5-owned; org shell ownership is P6. |
| `user/view.scala.html`, `user/partial_issues.scala.html`, `partial_pullRequests.scala.html`, `partial_projectlist.scala.html` | `/me` and public `/:user` profile/workspace. | `.user-info-box`, `.whoami-wrap`, `.guest-user`, `.edit`, `.user-status`, `.user-since`, `.user-stream-box`, `#daysAgoBtn`, `.nav.nav-tabs`, `.post-list-wrap`, `.user-streams.all-projects`. |
| `user/userFiles.scala.html` | Current-user files page. | `mySeriesMenuTab`, `.user-file-search`, `.attachment-files`, `.attachment-file-detail`, file preview/name/size/download/date/location columns, `#pagination`. |
| `user/edit.scala.html`, `edit_password.scala.html`, `edit_notifications.scala.html`, `edit_emails.scala.html`, `edit_token.scala.html`, `partial_edit_tabmenu.scala.html` | Account settings tabs. | `.site-breadcrumb-outer`, `.nav.nav-tabs.mt20`, `#frmBasic`, `#frmAvatar`, `#avatarFile`, `#avatarCropWrap`, `#frmPassword`, `#notification-projects`, `.notiUpdate`, email rows/action buttons, `.token-generate`. |
| `index/notifications.scala.html`, `index/partial_notifications.scala.html`, `common/mySeriesMenuTab.scala.html` | Authenticated home notifications and direct notification page/fragment boundary. | `.site-guide-outer`, `#toggleIntro`, `.notification-wrap`, `.notification-stream`, `.message-wrap.nowrap`, `.more`, `#notification-more`, `#setDefaultLoginPage`. |

## Current React/API Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/-directory-views.tsx` | Project/org directory pages, search, rows, pagination. |
| `frontend/src/routes/-organization-views.tsx`, `frontend/src/routes/organizations/**` | Organization create/home/settings/members/delete and shell. |
| `frontend/src/routes/-workspace-views.tsx`, `frontend/src/routes/me/route.tsx`, `frontend/src/routes/$user/route.tsx`, `frontend/src/routes/user/issues/route.tsx`, `frontend/src/routes/user/files/route.tsx` | Workspace/current-user and public profile, user issue list, user files. |
| `frontend/src/routes/-workspace-settings-view.tsx`, `frontend/src/routes/user/editform/**`, `frontend/src/routes/me/settings/**` | Account settings canonical routes and aliases. |
| `frontend/src/routes/-home-view.tsx`, `frontend/src/routes/notifications/route.tsx`, `frontend/src/routes/notification/route.tsx` | Authenticated notification stream, direct notification route conversion, default landing controls. |
| `frontend/src/api/workspace.ts`, `notifications.ts`, `attachments.ts`, `auth-workspace-client.ts` | REST JSON boundaries for workspace/profile/settings/files/notifications. |
| `frontend/src/organization-home-parity.spec.tsx`, `organization-shell-i18n.spec.tsx`, `workspace-profile-i18n.spec.tsx`, `workspace-settings-parity.spec.tsx`, `user-files-parity.spec.tsx`, `directory-home-user-files-notification-i18n.spec.tsx` | Static selector/source proof. |
| `frontend/tests/directory-create-import-proof.e2e.ts`, `organization-directory-admin-parity.e2e.ts`, `user-profile-parity.e2e.ts`, `workspace-settings-parity.e2e.ts`, `search-parity.e2e.ts` | Browser-visible interaction proof. |

## Open Reset Queue Summary

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 17 |
| not-applicable | 1 |
| needs-parent-decision | 0 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `index/allProjectList*.scala.html`, `index/allOrganizationList*.scala.html` | `/projects`, `/orgs` directory search, empty/list rows, metadata, pagination. | `frontend/src/routes/-directory-views.tsx`, directory routes | layout | covered in current follow-up | P6 | none | `ui-parity-directory-organization.md` records 18 covered directory/org rows. `frontend/tests/directory-create-import-proof.e2e.ts` proves `/projects` and `/orgs` pagination/query preservation under `/yona`; static specs pin row metadata and empty states. |
| Project/organization creation templates | `/projectform`, `/_import`, `/organizations/new` validation and submit flows. | project/organization create/import route views and REST clients | interaction | covered in current follow-up | P6 | none | Existing directory proof drives empty/reserved project names, focusout normalization, owner/protected coupling, SVN menu coupling, import URL/auth validation, organization invalid-name warning, REST payloads, and post-create redirects. |
| `organizationLayout.scala.html`, `organization/header.scala.html`, `organization/menu.scala.html` | Organization shell for `/organizations/:org/**`. | `frontend/src/routes/-organization-views.tsx`, organization route files | layout | covered in current follow-up | P6 | none | Organization shell/i18n specs and e2e prove header/menu/settings links, enrollment/admin controls, and raw-key absence. Aggregate board/PR list internals remain covered by P4/P5 reports; P6 owns the org shell chrome. |
| `organization/view.scala.html` | Organization home, project filter, create-project CTA, admin/member side panes, leave modal. | `frontend/src/routes/-organization-views.tsx`, `organizations/$organizationName/index.tsx` | interaction | covered in current follow-up | P6 | none | Existing report and specs prove `#mylist-filter`, project-row filtering, `/projectform?owner=:org` CTA, admin/member panes, `#groupLeaveBtn`, `#alertLeave`, and confirm-only leave REST mutation. |
| `organization/members.scala.html` | Organization member add/typeahead, role dropdowns, delete modal, enrollment accept. | `frontend/src/routes/-organization-views.tsx`, `organizations/$organizationName/members/route.tsx`, users search API | interaction | covered in current follow-up | P6 | none | Existing report proves legacy `.typeahead.dropdown-menu` for `#loginId`, `/-_-api/v1/users` compatible search, cache reuse, role/dropdown/delete modal/enrollment flows, and non-fade `modal hide` parity. |
| `organization/setting.scala.html`, `organization/deleteForm.scala.html`, `partial_settingmenu.scala.html` | Organization settings/logo update/delete confirm. | `frontend/src/routes/-organization-views.tsx`, organization settings/delete route files | interaction | covered in current follow-up | P6 | none | Existing e2e/spec evidence proves setting menu, invalid logo warning, valid logo temp upload plus immediate update with `logoAttachmentId`, `#btnDelete`, `#alertDeletion`, `#btnDeleteExec`, No/Yes modal behavior, and REST redirect. |
| `user/view.scala.html`, user profile partials | `/me` authenticated profile and `/:user` public profile shell. | `frontend/src/routes/-workspace-views.tsx`, `me/route.tsx`, `$user/route.tsx` | layout | covered in current follow-up | P6 | none | `ui-parity-user-workspace-profile.md` records 14 covered rows. Static and browser proof cover `.user-info-box`, guest/site-admin/blocked badges, edit gating, daysAgo, issue/PR/project tabs, actor links, public email visibility, ACL filtering, organization-name redirect, and missing-user handling. |
| `user/view.scala.html`, `index/myRecentIssueList*.scala.html` | `/user/issues` current-user issue list and workspace streams. | `frontend/src/routes/user/issues/route.tsx`, workspace routes | layout | covered in current follow-up | P6 | none | Shared P3 issue list renderer plus workspace/profile specs prove filters/search/order/page query, default landing control, empty/populated states, issue row selectors, and REST query shape. |
| `user/userFiles.scala.html` | `/user/files` search, file rows, preview/download/location, pagination. | `frontend/src/routes/user/files/route.tsx`, workspace files REST | layout | covered in current follow-up | P6 | none | `frontend/src/user-files-parity.spec.tsx` and assets/workspace contracts prove `.attachment-files`, row columns, icons, file URLs, download URLs, preview URLs, ISSUE_POST location hrefs, auth requirement, filter/page JSON, and pagination. |
| `user/edit*.scala.html`, `partial_edit_tabmenu.scala.html` | `/user/editform/**` account settings tabs. | `frontend/src/routes/-workspace-settings-view.tsx`, `user/editform/**` routes | interaction | covered in current follow-up | P6 | none | `ui-parity-user-account-settings.md` records 14 covered settings rows. Static/e2e evidence proves profile/avatar crop/upload, reset visited projects, password failure/mismatch/success states, notification hash/toggles, email add/delete/set-main/validation, API token reset, auth gate, and raw-key absence. |
| `/me/settings/**` aliases | Non-legacy aliases to canonical `/user/editform/**`. | `frontend/src/routes/me/settings/**` | route | covered in current follow-up | P6 | none | Alias e2e proves every `/me/settings/**` path redirects to the canonical legacy `/user/editform/**` URL and notification alias preserves the hash. |
| `index/notifications.scala.html`, `index/partial_notifications.scala.html` | `/notifications` welcome guide, tabs, empty/populated notification stream, intro persistence. | `frontend/src/routes/notifications/route.tsx`, `frontend/src/routes/-home-view.tsx`, notifications API | interaction | covered in current follow-up | P6 | none | `ui-parity-search-notification.md` records notification rows as covered. E2E proves `.site-guide-outer`, `#toggleIntro`, localStorage `yobi-intro`, `.notification-stream`, `.message-wrap.nowrap`, link/img click non-toggle, `.more` expand, default landing UI, and no raw keys. |
| `index/partial_notifications.scala.html` | Notification load-more appends server-rendered fragments in legacy. | `frontend/src/routes/notifications/route.tsx`, `frontend/src/routes/notification/route.tsx` | data-boundary | covered in current follow-up | P6 | none | React prevents `#notification-more` navigation, fetches `/api/v1/notifications?from=<items.length>&size=20`, appends rows, and removes the button when `hasMore=false`; direct `/notification?from=&limit=` returns JSON for API-style requests and SPA shell for HTML Accept. |
| Legacy server-rendered notification fragment as runtime data source | Legacy `NotificationApp.notifications` returned `partial_notifications` HTML fragment. | REST JSON plus React render | data-boundary | not-applicable | P6 | none unless parent reclassifies | Keeping legacy HTML fragment injection as a React runtime data source is out of scope under the reset rule. The conversion boundary is API-return plus React-rendered legacy DOM. |
| Global/project/org search rows intersecting user/org/notification surfaces | `/search`, `/organizations/:org/search`, project/org scoped search chrome. | `frontend/src/routes/-search-views.tsx`, search route files | layout | covered in current follow-up | P6 | none | Search rows are tracked in `ui-parity-search-notification.md`; organization scoped chrome uses real org container header/menu and remains relevant to P6 shell parity. Repository-scoped `/admin/sample/search` integrated delta remains owned by P5 until parent reassigns. |
| Organization aggregate issue/board/PR list shells | `/organizations/:org/issues`, `/boards`, `/pullrequests`, `/closedPullrequests`. | organization aggregate route files and P3/P4/P5 list renderers | layout | covered in current follow-up | P6 | none | Organization shell ownership is covered here; row/list internals are covered in P3/P4/P5. Existing organization and PR/board/issue evidence proves route shells, project-name rows, filters, tabs, and pagination. |
| Public/current-user route auth gates | `/me`, `/user/editform/**`, `/user/files`, notification routes. | route guards and session REST | permission | covered in current follow-up | P6 | none | Existing auth/workspace specs and e2e prove anonymous guard/loading states, authenticated render, guest stream hiding, private/public ACL filters, and direct legacy alias compatibility. |
| Raw visible i18n keys in P6 surfaces | All P6 templates resolve `Messages(...)` labels; raw keys are failures. | i18n/static/browser proof across P6 files | copy | covered in current follow-up | P6 | none | `directory-home-user-files-notification-i18n.spec.tsx`, `organization-shell-i18n.spec.tsx`, `workspace-profile-i18n.spec.tsx`, `workspace-settings-i18n.spec.tsx`, and related e2e raw-key scans cover the P6 surfaces. |

## Verifier Evidence

Static/component proof:

- `frontend/src/organization-home-parity.spec.tsx`
- `frontend/src/organization-shell-i18n.spec.tsx`
- `frontend/src/workspace-profile-i18n.spec.tsx`
- `frontend/src/workspace-settings-parity.spec.tsx`
- `frontend/src/user-files-parity.spec.tsx`
- `frontend/src/directory-home-user-files-notification-i18n.spec.tsx`

Browser proof:

- `frontend/tests/directory-create-import-proof.e2e.ts`
- `frontend/tests/organization-directory-admin-parity.e2e.ts`
- `frontend/tests/user-profile-parity.e2e.ts`
- `frontend/tests/workspace-settings-parity.e2e.ts`
- `frontend/tests/search-parity.e2e.ts` for notification stream/load-more and scoped search chrome.

The integrated desktop sweep status in
`output/playwright/visual-sweep/latest.json` checked at
`2026-06-26T16:21:36.680Z` is a pre-organization-layout-migration baseline.
Current 2026-06-27 organization nested-layout claims are limited to the focused
spec evidence listed below. Whole UI parity remains blocked until a fresh
integrated visual sweep covers all packet reports.

## Nested Layout Follow-Ups

- 2026-06-27 organization home shell follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu/page-wrap shell for the organization index route
  with the home menu active. `OrganizationDetailPage` renders only the legacy
  organization home body through `renderShell={false}` for
  `/organizations/$organizationName/` while preserving direct-render shell
  output for existing specs. Focused coverage:
  `pnpm --dir frontend exec vitest run src/organization-home-parity.spec.tsx -t "organization layout route own home"`.
- 2026-06-27 organization settings shell follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu/page-wrap shell for `/settingform` with the settings
  menu active and the legacy `organization-settings-shell` class.
  `OrganizationSettingsPage` renders only the legacy settings body through
  `renderShell={false}` for that child route while preserving direct-render
  shell output for existing specs. Focused coverage:
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx -t "settings chrome"`.
- 2026-06-27 organization members/delete shell follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu/page-wrap shell for `/members` and `/deleteForm`.
  `OrganizationMembersPage` and `OrganizationDeletePage` render only their
  legacy settings-tab bodies through `renderShell={false}` for those child
  routes while preserving direct-render shell output for existing specs.
  Focused coverage:
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx -t "members chrome|delete chrome"`.
- 2026-06-27 organization aggregate shell follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu/page-wrap shell for `/issues`, `/boards`,
  `/pullrequests`, and `/closedPullrequests`. `OrganizationIssueListPage`,
  `OrganizationBoardListPage`, and `OrganizationPullRequestListPage` render only
  their legacy aggregate list bodies through `renderShell={false}` for those
  child routes while preserving direct-render shell output for existing specs.
  The organization issue search form now preserves legacy markup but routes
  same-page query changes through TanStack navigation and reloads data from route
  location state instead of native document GET.
  Focused coverage:
  `pnpm --dir frontend exec vitest run src/organization-shell-i18n.spec.tsx`.
- 2026-06-27 organization scoped search shell follow-up:
  `frontend/src/routes/organizations/$organizationName/route.tsx` now owns the
  organization header/menu shell for `/search` with the legacy `search-page`
  shell class and no extra parent `page-wrap-outer`. The child route renders
  `SearchRoutePage` with `renderShell={false}` so search keeps its legacy
  breadcrumb/results body and avoids duplicate organization chrome queries.
  Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "real search routes"`.
- 2026-06-27 workspace settings shell follow-up:
  `frontend/src/routes/user/editform/route.tsx` now owns the legacy
  account-settings breadcrumb/tabs/page-wrap shell for `/user/editform/**`.
  `WorkspaceSettingsPage` renders only profile, password, notification, email,
  and token section bodies through `renderShell={false}` for those child routes
  while preserving direct-render shell output for existing specs. Focused
  coverage:
  `pnpm --dir frontend exec vitest run src/workspace-settings-parity.spec.tsx src/workspace-settings-i18n.spec.tsx`.
- 2026-06-27 user files SPA navigation follow-up:
  `/user/files` preserves the legacy `user/userFiles.scala.html` search form,
  my-series tabs, rows, and pagination markup, but same-page filter submit and
  pagination clicks now route through TanStack navigation and refetch from
  router location state instead of native document navigation. Focused coverage:
  `pnpm --dir frontend exec vitest run src/user-files-parity.spec.tsx src/form-submit-boundary.spec.tsx`.
- 2026-06-27 user issues SPA navigation follow-up:
  `/user/issues` preserves the legacy `issue/my_partial_search.scala.html` and
  `issue/my_partial_list.scala.html` shell, filters, tabs, search form, sort
  links, and pagination markup, but same-page query changes now route through
  TanStack navigation and refetch from router location state. Focused coverage:
  `pnpm --dir frontend exec vitest run src/route-parity.spec.tsx -t "real user issue route" src/form-submit-boundary.spec.tsx`.
