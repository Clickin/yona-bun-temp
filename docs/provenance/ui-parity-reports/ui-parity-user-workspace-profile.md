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
- `frontend/src/routes/$user/route.tsx`
- `frontend/src/routes/-workspace-views.tsx`
- `frontend/src/routes/user/issues/route.tsx`
- `frontend/src/routes/user/files/route.tsx`
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
- `frontend/src/user-files-parity.spec.tsx`
- `frontend/src/route-parity.spec.tsx`
- `frontend/src/auth-workspace-client.spec.ts`
- `frontend/tests/user-profile-parity.e2e.ts`

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
| `/:user` public profile shell and edit gating | `UserApp.userInfo` is `@AnonymousCheck`; `view.scala.html` shows edit-profile only when the viewed user is the current user and otherwise renders the public profile card. | `frontend/src/routes/$user/route.tsx` reads `/api/v1/users/:loginId/profile`; `PublicUserProfilePage` receives `viewerCanEditProfile`; `frontend/tests/user-profile-parity.e2e.ts` proves anonymous `/yona/door` shell renders without Edit Profile/sign-out/default-landing controls. | anonymous/authenticated viewer; public profile read; REST JSON/API-return plus React render. | covered | none |
| `/:user` organization-name redirect | Legacy `UserApp.userInfo` checks `Organization.findByName(loginId)` first and redirects to `OrganizationApp.organization(org.name)`. | `crates/server/src/routes/users.rs` returns `redirectPath: "/organizations/:loginId"` when an organization owns the segment; `frontend/src/routes/$user/route.tsx` navigates to that path; `frontend/tests/user-profile-parity.e2e.ts` proves `/yona/weblabs` ends at `/yona/organizations/weblabs`; `crates/server/tests/rest_contract.rs::rest_public_user_profile_reads_legacy_single_segment_profile` pins the REST redirect. | anonymous/authenticated viewer; redirect state; REST redirect JSON plus React navigation. | covered | none |
| `/:user` missing user | Legacy `UserApp.userInfo` returns `NotFound.render("user.notExists.name")` when `User.findByLoginId(loginId)` is anonymous/missing. | `crates/server/src/routes/users.rs` returns not found for missing user; `frontend/src/routes/$user/route.tsx` maps not-found failures to `NotFoundPage`; `crates/server/tests/rest_contract.rs::rest_public_user_profile_reads_legacy_single_segment_profile` asserts missing profile status. | anonymous/authenticated viewer; missing user error; REST error plus React error shell. | covered | none |
| `/:user?daysAgo=&selected=` query/tab behavior | Legacy `UserApp.userInfo` normalizes `daysAgo`, sets the `daysAgo` cookie, passes `selected`, and `view.scala.html` marks the matching tab active while `yobi.user.View` handles client tab selection. | `crates/server/src/routes/users.rs` normalizes `daysAgo`/`selected`; `PublicUserProfilePage` initializes active tab from `routeHref`, keeps editable `#daysAgoBtn`, and tab clicks change only React active panes; `frontend/src/workspace-profile-i18n.spec.tsx` proves `#daysAgoBtn` is not readonly; `frontend/tests/user-profile-parity.e2e.ts` proves `/yona/door?daysAgo=7&selected=projects` starts on Projects and preserves URL/query while clicking PR/Issue tabs. | anonymous/authenticated viewer; selected tabs and client clicks; REST query JSON plus React tab state. | covered | none |
| Profile issue tab empty/populated states | `view.scala.html` renders issue/open/closed tabs, `issue.is.empty` empty copy, `.post-list-wrap.my-issues`, and `partial_issues.scala.html` project/issue links, author/assignee user links, counts, metadata, and ACL-filtered rows from `UserApp.getAclValidatedIssues`. | `PublicProfileIssueItems` renders the same issue row shell and actor links; `crates/server/src/routes/users.rs` filters profile issue items by read ACL; `crates/server/tests/rest_contract.rs::rest_public_user_profile_reads_legacy_single_segment_profile` asserts only public readable issue rows and author/assignee login IDs; `frontend/src/workspace-profile-i18n.spec.tsx` pins empty state and missing-author copy. | anonymous/authenticated/site-admin viewer, private/public projects, empty/populated issue rows; REST profile issue JSON plus React render. | covered | none |
| Profile pull-request tab empty/populated states | `view.scala.html` renders `pullRequest.is.empty`; `partial_pullRequests.scala.html` renders project/avatar link, PR title link, contributor profile link, receiver avatar/profile link, comment count, and state. | `PublicUserProfilePage` renders `.post-list-wrap.row-fluid`, contributor `/:loginId` text links, receiver avatar links, comment links, and legacy state labels; `crates/server/tests/rest_contract.rs::rest_public_user_profile_reads_legacy_single_segment_profile` asserts readable PR row and contributor/receiver login IDs. | anonymous/authenticated viewer, empty/populated PR rows, private/public ACL; REST profile PR JSON plus React render. | covered | none |
| Profile project tab empty/populated states | `view.scala.html` renders `project.is.empty`; `partial_projectlist.scala.html` renders project logo/name, private/fork markers, owner link, created/last-pushed labels, watch/unwatch, and leave-project link only for current user member. | `PublicUserProfilePage` and `WorkspacePage` render `.user-streams.all-projects`, project row metadata, private/fork markers, owner link, watch button, and `/info/leave/:owner/:project`; `crates/server/src/routes/users.rs` filters member projects by read ACL; `crates/server/tests/rest_contract.rs::rest_public_user_profile_reads_legacy_single_segment_profile` proves private member project is hidden from anonymous public profile while public project remains. | anonymous/authenticated/current user, public/private projects, empty/populated rows, leave/watch controls; REST profile project JSON plus React render. | covered | none |
| Public profile email visibility | `view.scala.html` renders `<span class="email">` only when `Application.SHOW_USER_EMAIL` is true. | `crates/server/src/routes/users.rs` preserves public profile email when `show_user_email` is true and redacts it when false for non-owner viewers; `PublicUserProfilePage` also honors `runtimeConfig.showUserEmail`; `crates/server/tests/rest_contract.rs` and `frontend/src/wave1-auth-workspace-parity.spec.tsx` pin visible and hidden states. | anonymous/authenticated non-owner and owner; public email config on/off; REST profile redaction plus React render guard. | covered | none |
| Profile links for issue/PR actors and project owners | Legacy partials link issue authors/assignees, PR contributor/receiver, and project owners through `routes.UserApp.userInfo(loginId)`. | `PublicProfileIssuePersonCell`, `PublicProfileUserTextLink`, `PublicProfileUserAvatarLink`, and project owner anchors generate `/:loginId`; `crates/server/tests/rest_contract.rs` asserts actor login IDs in profile REST rows; `frontend/src/workspace-profile-i18n.spec.tsx` and `frontend/tests/user-profile-parity.e2e.ts` cover rendered links/selectors. | anonymous/authenticated viewer; populated rows; REST actor login fields plus React anchors. | covered | none |
| `/user/issues` current-user issue list | Legacy `/user/issues` serves the current user's issue list with side filters, search/filter/order/page query, default-login-page control, and `/user/issues/new` entry points; `/user/issues` requires an authenticated user. | `frontend/src/routes/user/issues/route.tsx` requires auth, reads query params, calls `listUserIssues`, renders `UserIssueListPage`, and can call `setDefaultLandingPathRest`; `frontend/src/route-parity.spec.tsx` pins route tree, title, default-page UI, list shell, and rows; `frontend/src/auth-workspace-client.spec.ts` pins `/api/v1/user/issues?...` query shape; `crates/server/tests/user_issue_favorite_contract.rs` pins REST filter counts/items. | authenticated user; filtered/searched/paginated issue list, empty/populated states through shared issue-list renderer; REST JSON plus React render. | covered | none |
| `/user/files` shell, search, empty/populated file list | Legacy `userFiles.scala.html` requires current user, renders `mySeriesMenuTab`, search form, `.attachment-files` header, file rows, hover styling, and `#pagination`; empty results keep the same shell/header. | `frontend/src/routes/user/files/route.tsx` requires auth, calls `listWorkspaceFilesRest`, renders `UserFilesPage`; `frontend/src/user-files-parity.spec.tsx` pins route/source selectors, search form, header, populated rows, icons, pagination, and no non-legacy rel/action changes. | authenticated current user, empty/populated files, filter/pageNum; `/api/v1/workspace/files` JSON plus React render. | covered | none |
| `/user/files` preview/download/location links | Legacy `userFiles.scala.html` uses `AttachmentApp.getFile` for preview/download and `RouteUtil.getUrl(containerType, containerId)` for Location links. | `crates/server/src/routes/workspace.rs` resolves workspace file `locationHref`/`locationLabel`; `crates/server/tests/assets_contract.rs::workspace_files_list_returns_current_users_legacy_attachment_rows` proves auth requirement, filter/page JSON, file URLs, download URLs, preview URLs, and ISSUE_POST location `/door/projectYobi/issue/1`; `frontend/src/user-files-parity.spec.tsx` proves rendered preview/download/location anchors. | authenticated current user, image/non-image files, issue attachment location; REST JSON/API-return plus React render. | covered | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/me` | authenticated current user profile | `.user-info-box`, edit link, daysAgo, issue/PR/project tabs | same profile shell and tabs in `user-profile-parity.e2e.ts` | click selected tabs and inspect profile controls | `/api/v1/workspace` profile JSON plus React render | covered |
| `/:user` | anonymous public profile | public profile card, no current-user edit controls | same public shell without current-user controls | direct navigation under `/yona` | `/api/v1/users/:loginId/profile` JSON plus React render | covered |
| `/:user?daysAgo=7&selected=projects` | selected tab query | `selected` tab starts active and client tabs switch panes | same active tab and URL/query preservation | click PR/Issue/Project tabs | REST profile query plus React tab state | covered |
| `/:user` organization name | legacy redirects org-owned segment to organization page | same redirect to `/organizations/:loginId` | direct navigation | profile REST redirect JSON plus React navigation | covered |
| `/user/issues` | current-user issue list | user issue tabs, search/filter, default landing control | same issue list shell and base-path links | inspect list shell on mobile and desktop evidence | `/api/v1/user/issues` JSON plus React render | covered |
| `/user/files` | current-user file list | search form, `.attachment-files`, preview/download/location links | same file list shell and links | inspect list shell on mobile and populated file rows | `/api/v1/workspace/files` JSON plus React render | covered |
