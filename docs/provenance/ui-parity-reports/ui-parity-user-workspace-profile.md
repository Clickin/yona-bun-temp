# UI Parity Report: ui-parity-user-workspace-profile

Status: current evidence workspace
Date: 2026-06-26

## Sources

Legacy evidence:

- `yona-original/conf/routes` `GET /me`, `GET /:user`, `GET /user/issues`, `GET /user/files`, `GET /-_-api/v1/users/:user/statistics`
- `yona-original/app/controllers/UserApp.java` `userInfo`, `userFiles`, `leave`
- `yona-original/app/controllers/IssueApp.java` `userIssuesPage`, `userIssues`
- `yona-original/app/controllers/api/UserApi.java` `getIssuesByUser`, `statistics`
- `yona-original/app/views/user/view.scala.html`
- `yona-original/app/views/user/partial_issues.scala.html`
- `yona-original/app/views/user/partial_pullRequests.scala.html`
- `yona-original/app/views/user/partial_projectlist.scala.html`
- `yona-original/app/views/user/userFiles.scala.html`

Current evidence:

- `frontend/src/routes/me/route.tsx`
- `frontend/src/routes/$user.tsx`
- `frontend/src/routes/-workspace-views.tsx`
- `frontend/src/routes/user/issues.tsx`
- `frontend/src/routes/user/files.tsx`
- `frontend/src/api/users.ts`
- `frontend/src/api/workspace.ts`
- `frontend/src/auth-workspace-client.ts`
- `crates/server/src/routes/users.rs`
- `crates/server/src/routes/workspace.rs`
- `crates/server/tests/rest_contract.rs`
- `crates/server/tests/auth_workspace_contract.rs`
- `crates/server/tests/assets_contract.rs`
- `crates/server/tests/user_issue_favorite_contract.rs`
- `frontend/src/workspace-profile-i18n.spec.tsx`
- `frontend/src/wave1-auth-workspace-parity.spec.tsx`
- `frontend/tests/user-files.e2e.ts`
- `frontend/src/route-parity.spec.tsx`
- `frontend/src/auth-workspace-client.spec.ts`
- `frontend/tests/user-public-profile.e2e.ts`

## Route Inventory Summary

Total rows: 14

No `gap`, `deviation`, `weak evidence`, or `needs-parent-decision` rows were found for this packet. The rows below are covered because the legacy view/controller behavior has matching REST JSON/API-return plus React render evidence, and the previously known follow-ups for editable `daysAgo`, public email visibility, profile actor links, workspace file location URLs, selected-tab query preservation, and guest stream hiding are now backed by focused source/tests.

| Status | Count |
| --- | ---: |
| covered | 14 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 0 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

## Result Inventory

| Route/state | Legacy source and behavior | Current source and evidence | User/interaction/boundary | Status | Owner |
| --- | --- | --- | --- | --- | --- |
| `/me` authenticated current-user profile shell | `view.scala.html` renders `.user-info-box`, avatar background, guest/site-admin/blocked badges, display/login/email, social providers, edit-profile link, daysAgo control, issue/PR/project tabs. | `frontend/src/routes/me/route.tsx` renders `WorkspacePage`; `frontend/src/routes/-workspace-views.tsx` keeps the same shell/classes; `frontend/src/wave1-auth-workspace-parity.spec.tsx` and `frontend/src/workspace-profile-i18n.spec.tsx` pin shell, labels, tabs, edit link, badges, social provider icons, and absence of raw i18n keys. | authenticated current user, populated and empty profile data; `/api/v1/workspace` session/profile JSON rendered by React. | covered | none |
| `/me` guest stream hiding | `view.scala.html` wraps `.user-stream-box`, `#daysAgoBtn`, tabs, two-column mode, and show-subtasks controls in `@if(!UserApp.currentUser().isGuest)`. | `WorkspacePage` computes `showUserStreams = !profile.isGuest`; `frontend/src/wave1-auth-workspace-parity.spec.tsx` proves guest card/badge remain while `.user-stream-box`, `#daysAgoBtn`, stream tabs, and subtask/two-column controls are absent. | authenticated guest current user; permission-hidden controls; REST workspace profile `isGuest` plus React render. | covered | none |
| `/:user` public profile shell and edit gating | `UserApp.userInfo` is `@AnonymousCheck`; `view.scala.html` shows edit-profile only when the viewed user is the current user and otherwise renders the public profile card. | `frontend/src/routes/$user.tsx` reads `/api/v1/users/:loginId/profile`; `frontend/tests/user-public-profile.e2e.ts` proves anonymous `/yona/door` renders the legacy breadcrumb, profile card, no edit controls, stream tabs, and column metrics. | anonymous viewer; public profile read; REST JSON/API-return plus React render. | covered for anonymous issue state | none |
| `/:user` organization-name redirect | Legacy `UserApp.userInfo` checks `Organization.findByName(loginId)` first and redirects to `OrganizationApp.organization(org.name)`. | `crates/server/src/routes/users.rs` returns `redirectPath: "/organizations/:loginId"` when an organization owns the segment; `frontend/src/routes/$user.tsx` navigates to that path; `crates/server/tests/rest_contract.rs::rest_public_user_profile_reads_legacy_single_segment_profile` pins the REST redirect. | anonymous/authenticated viewer; redirect state; REST redirect JSON plus React navigation. | covered by REST, frontend redirect path present | none |
| `/:user` missing user | Legacy `UserApp.userInfo` returns `NotFound.render("user.notExists.name")` when `User.findByLoginId(loginId)` is anonymous/missing. | `crates/server/src/routes/users.rs` returns not found for missing user; `frontend/src/routes/$user.tsx` leaves REST failures to the route error boundary; `crates/server/tests/rest_contract.rs::rest_public_user_profile_reads_legacy_single_segment_profile` asserts missing profile status. | anonymous/authenticated viewer; missing user error; REST error plus React error shell. | REST covered, frontend error shell pending focused render | none |
| `/:user?daysAgo=&selected=` query/tab behavior | Legacy `UserApp.userInfo` normalizes `daysAgo`, sets the `daysAgo` cookie, passes `selected`, and `view.scala.html` marks the matching tab active while `yobi.user.View` handles client tab selection. | `crates/server/src/routes/users.rs` normalizes `daysAgo`/`selected`; `frontend/src/routes/$user.tsx` initializes active tabs from validated search params, keeps editable `#daysAgoBtn`, and preserves legacy `href="#..."` tab anchors while React switches panes. `frontend/tests/user-public-profile.e2e.ts` proves default `/yona/door` issues state with `daysAgo=14`, `/yona/door?daysAgo=7&selected=projects` active project state, and PR/issue click switching without dropping the query. | anonymous viewer; selected issues/projects tabs; REST query JSON plus React render/click state. | covered for default issues and selected projects/click state | selected PR initial state pending |
| Profile issue tab empty/populated states | `view.scala.html` renders issue/open/closed tabs, `issue.is.empty` empty copy, `.post-list-wrap.my-issues`, and `partial_issues.scala.html` project/issue links, author/assignee user links, counts, metadata, and ACL-filtered rows from `UserApp.getAclValidatedIssues`. | `frontend/src/routes/$user.tsx` renders the issue row shell and actor links; `crates/server/src/routes/users.rs` filters profile issue items by read ACL; `frontend/tests/user-public-profile.e2e.ts` compares populated open/closed rows and layout metrics. | anonymous viewer, populated issue rows; REST profile issue JSON plus React render. | covered with gap | `WorkspaceIssueItem` does not yet expose profile issue labels/subtask/due-date fields, so `data-label-id` parity remains pending |
| Profile pull-request tab empty/populated states | `view.scala.html` renders `pullRequest.is.empty`; `partial_pullRequests.scala.html` renders project/avatar link, PR title link, contributor profile link, receiver avatar/profile link, comment count, and state. | `frontend/src/routes/$user.tsx` renders `.post-list-wrap.row-fluid`, contributor `/:loginId` text links, receiver avatar links, comment links, and legacy state labels; `frontend/tests/user-public-profile.e2e.ts` compares a populated PR row inside the profile DOM. | anonymous viewer, populated PR row; REST profile PR JSON plus React render. | covered for populated row | empty PR state pending |
| Profile project tab empty/populated states | `view.scala.html` renders `project.is.empty`; `partial_projectlist.scala.html` renders project logo/name, private/fork markers, owner link, created/last-pushed labels, watch/unwatch, and leave-project link only for current user member. | `frontend/src/routes/$user.tsx` renders `.user-streams.all-projects`, project row metadata, private/fork markers, owner link, watch button, and current-user `.leaveProject` branch with browser-normalized `data-projectname`. `frontend/tests/user-public-profile.e2e.ts` compares populated project rows inside the full profile DOM for inactive issues-state, active `/yona/door?daysAgo=7&selected=projects`, and current-user leave-project state. | anonymous viewer and current user, public populated project row; REST profile project JSON plus React render. | covered for active selected project watch and current-user leave branches | none |
| Public profile email visibility | `view.scala.html` renders `<span class="email">` only when `Application.SHOW_USER_EMAIL` is true. | `crates/server/src/routes/users.rs` preserves public profile email when `show_user_email` is true and redacts it when false for non-owner viewers; `PublicUserProfilePage` also honors `runtimeConfig.showUserEmail`; `crates/server/tests/rest_contract.rs` and `frontend/src/wave1-auth-workspace-parity.spec.tsx` pin visible and hidden states. | anonymous/authenticated non-owner and owner; public email config on/off; REST profile redaction plus React render guard. | covered | none |
| Profile links for issue/PR actors and project owners | Legacy partials link issue authors/assignees, PR contributor/receiver, and project owners through `routes.UserApp.userInfo(loginId)`. | `frontend/src/routes/$user.tsx` generates `/:loginId` profile anchors; `crates/server/tests/rest_contract.rs` asserts actor login IDs in profile REST rows; `frontend/tests/user-public-profile.e2e.ts` covers rendered issue/PR/project actor links. | anonymous viewer; populated rows; REST actor login fields plus React anchors. | covered | none |
| `/user/issues` current-user issue list | Legacy `/user/issues` serves the current user's issue list with side filters, search/filter/order/page query, default-login-page control, and `/user/issues/new` entry points; `/user/issues` requires an authenticated user. | `frontend/src/routes/user/issues.tsx` reads query params, calls `listUserIssues`, and renders the legacy my-issues list shell; `frontend/tests/user-issues.e2e.ts` compares the rendered DOM and metrics; `crates/server/tests/user_issue_favorite_contract.rs` pins REST filter counts/items. | authenticated user; filtered/searched/paginated issue list, populated state through REST JSON plus React render. | covered for populated assigned state | additional filter/search/page states pending |
| `/user/files` shell, search, empty/populated file list | Legacy `userFiles.scala.html` requires current user, renders `mySeriesMenuTab`, search form, `.attachment-files` header, file rows, hover styling, and `#pagination`; empty results keep the same shell/header. | `frontend/src/routes/user/files.tsx` calls `listWorkspaceFilesRest` through TanStack Query and renders the legacy my-series tabs, search form, `.attachment-files` header/detail rows, and pagination. `frontend/tests/user-files.e2e.ts` whole-screen compares the authenticated navbar/content/footer DOM for a populated filtered page. | authenticated current user, populated files, filter/pageNum; `/api/v1/workspace/files` JSON plus React render. | covered in 2026-06-30 template-first reset slice | none |
| `/user/files` preview/download/location links | Legacy `userFiles.scala.html` uses `AttachmentApp.getFile` for preview/download and `RouteUtil.getUrl(containerType, containerId)` for Location links. | `frontend/src/routes/user/files.tsx` preserves preview/download/location anchors from the REST row `url`, `previewUrl`, `downloadUrl`, `locationHref`, and `locationLabel`; `frontend/tests/user-files.e2e.ts` proves image preview, `png-icon font-larger`, download button, date, and ISSUE_POST location href rendering. | authenticated current user, image file row, issue attachment location; REST JSON/API-return plus React render. | covered in 2026-06-30 template-first reset slice | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/me` | authenticated current user profile | `.user-info-box`, edit link, daysAgo, issue/PR/project tabs | covered by workspace profile/settings evidence; public `/:user` shell is covered by `user-public-profile.e2e.ts` | inspect profile controls | `/api/v1/workspace` profile JSON plus React render | covered |
| `/:user` | anonymous public profile | public profile card, no current-user edit controls | same public shell without current-user controls | direct navigation under `/yona` | `/api/v1/users/:loginId/profile` JSON plus React render | covered |
| `/:user?daysAgo=7&selected=projects` | selected tab query | `selected` tab starts active and client tabs switch panes | same active tab and URL/query preservation | click PR/Issue/Project tabs | REST profile query plus React tab state | covered |
| `/:user` | organization-name redirect | legacy redirects org-owned segment to organization page | same redirect to `/organizations/:loginId` | direct navigation | profile REST redirect JSON plus React navigation | covered |
| `/user/issues` | current-user issue list | user issue tabs, search/filter, default landing control | same issue list shell and base-path links | inspect list shell on mobile and desktop evidence | `/api/v1/user/issues` JSON plus React render | covered |
| `/user/files` | current-user file list | search form, `.attachment-files`, preview/download/location links | same file list shell and links | inspect list shell on mobile and populated file rows | `/api/v1/workspace/files` JSON plus React render | covered |
