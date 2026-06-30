# UI Parity Report: User Account Settings

Status: explorer report only
Packet: `ui-parity-user-account-settings`
Date: 2026-06-26

Scope audited: `/user/editform/**`, `/me/settings/**`, avatar, password,
notification, email, API token settings, and legacy anchors/aliases. This
report does not edit implementation code and treats `yona-original/` as the
only legacy UI/UX source of truth.

## Sources

Legacy evidence:

- `yona-original/conf/routes`: `GET /user/editform`,
  `GET/POST /user/editform/:tabId`, `POST /user/edit`,
  `POST /user/email`, `DELETE /user/email/delete/:emailId`,
  `PUT /user/email/setAsMain/:emailId`,
  `POST /user/email/sendValidationEmail/:emailId`,
  `GET /user/email/confirm/:emailId/:token`,
  `POST /-_-api/v1/users/token`
- `yona-original/app/controllers/UserApp.java`
- `yona-original/app/controllers/api/UserApi.java`
- `yona-original/app/views/user/edit.scala.html`
- `yona-original/app/views/user/edit_password.scala.html`
- `yona-original/app/views/user/edit_notifications.scala.html`
- `yona-original/app/views/user/edit_emails.scala.html`
- `yona-original/app/views/user/edit_token.scala.html`
- `yona-original/app/views/user/partial_edit_tabmenu.scala.html`
- `yona-original/public/javascripts/service/yobi.user.Setting.js`
- `yona-original/conf/messages`, especially `userinfo.*`, `user.avatar.*`,
  `emails.*`, `validation.passwordMismatch`, and `user.wrongPassword.alert`

Current evidence:

- `frontend/src/routes/-workspace-settings-view.tsx`
- `frontend/src/routes/user/editform.tsx`
- `frontend/src/routes/user/editform/index.tsx`
- `frontend/src/routes/user/editform/password.tsx`
- `frontend/src/routes/user/editform/password/route.tsx`
- `frontend/src/routes/user/editform/notifications/route.tsx`
- `frontend/src/routes/user/editform/emails.tsx`
- `frontend/src/routes/user/editform/emails/route.tsx`
- `frontend/src/routes/user/editform/token/route.tsx`
- `frontend/src/routes/user/editform/token.tsx`
- `frontend/src/routes/me/settings/profile/route.tsx`
- `frontend/src/routes/me/settings/password/route.tsx`
- `frontend/src/routes/me/settings/notifications/route.tsx`
- `frontend/src/routes/me/settings/emails/route.tsx`
- `frontend/src/routes/me/settings/token/route.tsx`
- `frontend/src/routes/me/route.tsx`
- `frontend/src/routes/-shared.tsx`
- `frontend/src/api/workspace.ts`
- `frontend/src/auth-workspace-client.ts`
- `crates/server/src/routes/workspace.rs`
- `crates/server/src/routes/auth.rs`
- `crates/server/src/routes/users.rs`
- `crates/server/src/routes/files.rs`
- `frontend/src/workspace-settings-i18n.spec.tsx`
- `frontend/src/workspace-settings-parity.spec.tsx`
- `frontend/src/auth-workspace-client.spec.ts`
- `frontend/tests/workspace-settings-parity.e2e.ts`
- `frontend/tests/user-profile-settings.e2e.ts`
- `frontend/tests/user-password-settings.e2e.ts`
- `frontend/tests/user-email-settings.e2e.ts`
- `frontend/tests/user-token-settings.e2e.ts`
- `frontend/tests/legacy-rendered-page-audit.e2e.ts`
- `crates/server/tests/rest_contract.rs`
- `crates/server/tests/auth_workspace_contract.rs`
- `crates/server/tests/assets_contract.rs`
- `crates/server/tests/notification_contract.rs`

## Route Inventory Summary

Total rows: 14

| status | count |
| --- | ---: |
| covered | 14 |
| gap | 0 |
| deviation | 0 |
| deferred | 0 |
| not-applicable | 0 |
| weak evidence | 0 |
| needs-parent-decision | 0 |

No implementation gap was found because every audited legacy settings tab has a
React route that preserves the legacy visible selectors/copy and submits
through REST JSON. The reopened profile/avatar browser-depth row is now closed
by focused Playwright proof that drives the visible settings controls and
asserts the REST/file requests. The later password-failure/raw-key/alias
browser-depth reopen is also closed by `workspace-settings-parity.e2e.ts`,
which proves wrong-current-password and mismatch REST error states, body-level
absence of raw settings keys across canonical tabs, and `/me/settings/**`
aliases redirecting to the canonical legacy `/user/editform/**` routes while
preserving the notification hash.

## Result Inventory

| route/state | legacy evidence | current evidence | user state | interaction state | boundary | status | proposed owner |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/user/editform` profile tab and tab chrome | `edit.scala.html` renders `siteLayout(..., MenuType.USER)`, `userinfo.accountSetting`, `partial_edit_tabmenu("profile")`, `#frmBasic`, readonly login ID, editable `name`/`email`, `#frmAvatar`, `.avatar-wrap.xlarge`, `.reset-user-visited-list`, and `#avatarCropWrap`; `partial_edit_tabmenu.scala.html` defines profile/password/notifications/emails/token tabs. | `frontend/src/routes/user/editform.tsx` renders the same `.site-breadcrumb-outer`, `.page-wrap-outer`, `.nav.nav-tabs.mt20`, tab hrefs, `#frmBasic`, `#frmAvatar`, hidden profile fields, `.avatar-wrap.xlarge`, upload button/file input, reset visited form, and avatar crop modal. `frontend/src/app.css` restores the legacy `.avatar-wrap.xlarge` 128px square from `_yobiUI.less`. `frontend/tests/user-profile-settings.e2e.ts` whole-screen compares the authenticated navbar/breadcrumb/content/footer DOM against `edit.scala.html` plus `partial_edit_tabmenu.scala.html`, asserts profile/avatar/reset layout metrics, and proves `PATCH /api/v1/workspace/profile` plus `DELETE /api/v1/workspace/recent-projects` through CSRF bootstrap. Existing `workspace-settings-i18n.spec.tsx` pins default and Korean legacy copy without raw keys; `legacy-rendered-page-audit.e2e.ts` includes `/user/editform` anchors. | authenticated current user | initial render, tab active state, profile submit payload, reset visited submit | React route plus `/api/v1/workspace/profile` and `/api/v1/workspace/recent-projects` REST JSON | covered in 2026-06-30 template-first reset slice | none |
| Profile update success/error | `UserApp.editUserInfo()` handles `/user/edit`, updates current user profile, and redirects back to settings; legacy invalid form re-renders settings with error flash/message. | `user/editform/index.tsx` calls `updateProfile()` then syncs workspace overview and navigates to `/me`; errors call `setErrorMessage`. `frontend/src/api/workspace.ts` maps to `PATCH /workspace/profile`; `auth-workspace-client.spec.ts` pins REST path/body/CSRF; `rest_contract.rs::rest_workspace_routes_manage_overview_settings_and_recent_projects` verifies name/email mutation; `auth_workspace_contract.rs` verifies direct `/user/edit` alias redirects to `/user/editform` and mutates state. | authenticated current user | submit success and REST error envelope | React REST JSON; direct legacy form alias retained for compatibility | covered | none |
| Avatar invalid, crop modal, upload, and profile attachment promotion | `edit.scala.html` renders `#avatarFile`, `.upload-progress.avatar`, `#avatarCropWrap.modal.hide[data-backdrop=static]`, cancel/save buttons, JCrop/canvas assets; `yobi.user.Setting.js` rejects non-images and oversized files with `user.avatar.onlyImage` / `user.avatar.fileSizeAlert`, opens crop modal for valid images, uploads cropped blob, and submits `avatarId`; `UserApp` uses a 1MB avatar limit. | `WorkspaceSettingsPage` preserves `#avatarFile`, `accept="image/*"`, `.upload-progress.avatar`, `#avatarCropWrap.modal.hide`, cancel/save `.btnSubmitCrop`, hidden canvas/range crop controls, non-image alert via `user.avatar.onlyImage`, and uploads cropped PNG through `uploadProfileAvatar()` to `/files` before `PATCH /workspace/profile`. `workspace-settings-parity.spec.tsx` and `workspace-settings-parity.e2e.ts` prove invalid file alert, hidden modal, valid image modal open, and cancel/save labels. `auth-workspace-client.spec.ts` proves cropped avatar upload parsing; `assets_contract.rs` proves avatar upload metadata/serving; `auth_workspace_contract.rs::update_profile_replaces_existing_avatar_attachment` proves invalid id, non-image, too-large, and successful promotion to `USER_AVATAR`. | authenticated current user | invalid file, crop modal open/cancel/save, upload success and backend validation errors | React REST JSON plus `/files` upload; direct avatar validation remains server-side in workspace profile update | covered | none |
| `/user/editform` profile/avatar browser mutation depth | `edit.scala.html` and `yobi.user.Setting.js` cover avatar crop cancel/save, profile submit redirect, reset visited projects, and notification toggle mutation in user-visible settings flows. | `frontend/tests/workspace-settings-parity.e2e.ts` now opens the crop modal from a real file input, clicks Cancel and verifies close, reopens and clicks Save, asserts `POST /files`, verifies hidden `avatarAttachmentId`, submits `#frmBasic`, asserts `PATCH /api/v1/workspace/profile` with the promoted attachment id and `/me` redirect, submits `.reset-user-visited-list`, asserts `DELETE /api/v1/workspace/recent-projects`, then drives the selected notification tab checkbox and asserts legacy `data-href` plus `POST /api/v1/workspace/notifications`. | authenticated current user | crop cancel/save, profile update, reset visited projects, notification toggle | React REST JSON plus `/files` upload | covered in current follow-up | `frontend/tests/workspace-settings-parity.e2e.ts`, `frontend/src/routes/-workspace-settings-view.tsx`, `frontend/src/routes/user/editform/index.tsx` |
| Reset visited project list | `edit.scala.html` includes `.reset-user-visited-list` form posting to `UserApp.resetUserVisitedList` with `userinfo.reset.visited.project.list`. | `WorkspaceSettingsPage` renders `.reset-user-visited-list` and calls `resetVisitedProjects()`. `frontend/src/api/workspace.ts` maps to `DELETE /workspace/recent-projects`; `auth-workspace-client.spec.ts` pins path/method/CSRF; `rest_contract.rs` verifies recent project reset; `auth_workspace_contract.rs` verifies direct legacy reset route redirect and empty body. | authenticated current user | submit reset and refreshed overview | React REST JSON; direct legacy form alias retained | covered | none |
| `/user/editform/password` change password form and reset-password link | `edit_password.scala.html` renders account breadcrumb, `partial_edit_tabmenu("password")`, `#frmPassword`, hidden `loginId`, `#oldPassword`, `#password`, `#retypedPassword`, `userinfo.changePassword`, and a `/lostPassword` button with `site.resetPasswordEmail.*` copy. | `frontend/src/routes/user/editform/password.tsx` preserves the same site shell, breadcrumb, tab menu active state, `#frmPassword`, field IDs/names/autocomplete, submit text, and `/lostPassword` link. `frontend/src/routes/user/editform.tsx` yields child settings routes via `<Outlet />` so `/user/editform/password` renders the password tab without duplicating the profile tab. `frontend/tests/user-password-settings.e2e.ts` whole-screen compares the authenticated navbar/breadcrumb/content/footer DOM against `edit_password.scala.html` plus `partial_edit_tabmenu.scala.html`, asserts layout metrics, CSRF bootstrap, password REST payload, and legacy `/users/loginform` path arrival after success. Existing `workspace-settings-i18n.spec.tsx` pins default/Korean copy; legacy nested route evidence remains covered by `workspace-settings-parity.e2e.ts`. | authenticated current user | initial render, reset-password link, successful password submit | React route plus REST submit | covered in 2026-06-30 template-first reset slice | none |
| Password change validation and logout-after-change | `UserApp.resetUserPassword` rejects wrong old password and password mismatch with legacy message keys, updates hash on success, and ends the current session. | `changePasswordRest()` posts to `/api/v1/workspace/password`; `auth-workspace-client.spec.ts` pins method/body/CSRF; `rest_contract.rs` verifies changed password returns anonymous session and new password can sign in; `auth_workspace_contract.rs` verifies `user.wrongPassword.alert`, `validation.passwordMismatch`, successful anonymous response, and sign-in with the new password. `frontend/tests/workspace-settings-parity.e2e.ts` now browser-proves wrong-current-password and mismatched-retype REST error envelopes remain visible on `/user/editform/password` without navigating away or exposing raw keys, then keeps the existing successful forced re-login proof. | authenticated current user | wrong current password, mismatched retype, success mutation and forced re-login | React REST JSON | covered in current follow-up | none |
| `/user/editform/notifications` watched-project tabs and hash activation | `edit_notifications.scala.html` lists watched projects in `#notification-projects`, gives each anchor `href="#project.id" data-toggle="tab"`, marks the first row active, and renders matching `.tab-pane` tables. Project headers link to this route with `#project.id` anchors from `project/header.scala.html`. | `WorkspaceSettingsPage` renders `#notification-projects`, `data-toggle="tab"` anchors, matching `.tab-pane` IDs, and uses `workspaceNotificationActiveProjectId(routeHref, watchedProjects, window.location.hash)` to honor a project hash. `workspace-settings-parity.spec.tsx` and `workspace-settings-parity.e2e.ts` prove `/user/editform/notifications#2` activates project `2`; `legacy-rendered-page-audit.e2e.ts` includes `/user/editform/notifications`. | authenticated current user watching one or more projects | initial render, hash-selected tab, fallback to first watched project | React route plus workspace overview JSON | covered | none |
| Notification toggles and direct `/noti/toggle` compatibility | `edit_notifications.scala.html` renders each event type row with `.switch[data-on-label=On][data-off-label=Off]`, `.notiUpdate`, `data-href="@routes.WatchProjectApp.toggle(project.id, notiType.name())"`, `data-toggle="switch"`, and checked state from `UserProjectNotification`. | `WorkspaceSettingsPage` renders `.switch`, `.notiUpdate`, `data-href="/noti/toggle/:projectId/:eventType"`, `data-toggle="switch"`, and checked state from `watchedProjects.notifications`; `toggleWorkspaceNotificationRest()` posts to `/api/v1/workspace/notifications`. `auth-workspace-client.spec.ts` pins REST body/CSRF; `rest_contract.rs` verifies REST toggle and direct `/noti/toggle/:id/:eventType` empty-200 compatibility; `notification_contract.rs` also verifies direct toggle behavior; `auth_workspace_contract.rs` verifies missing, forbidden, and unwatched statuses. | authenticated watcher; private/unwatched states covered by backend contracts | toggle on/off, direct legacy alias, error statuses | React REST JSON; direct legacy empty response retained | covered | none |
| `/user/editform/emails` email list and add form | `edit_emails.scala.html` renders add form `action=/user/email`, placeholder `user.email.new`, main-email description, current main email row with avatar and `emails.main.email`, and sub-email rows with gravatar. | `frontend/src/routes/user/editform/emails.tsx` renders the same legacy site shell, account breadcrumb, `partial_edit_tabmenu("emails")`, `.form-inline.inner-bubble[action="/user/email"][method=post]`, `.text.uname`, description paragraph with `<br>`, primary email row, and valid/invalid secondary rows. `frontend/tests/user-email-settings.e2e.ts` whole-screen compares the authenticated navbar/breadcrumb/content/footer DOM against `edit_emails.scala.html` plus `partial_edit_tabmenu.scala.html`, asserts breadcrumb/tab/form/table/avatar layout metrics, CSRF bootstrap, and `POST /api/v1/workspace/emails` payload. Existing `workspace-settings-i18n.spec.tsx`, `rest_contract.rs`, and `auth_workspace_contract.rs` continue to cover legacy copy, sub-email creation, and the direct `/user/email` compatibility redirect. | authenticated current user with populated secondary emails | initial render and add email submit | React route plus REST JSON; direct legacy form alias retained | covered in 2026-06-30 template-first reset slice | none |
| Email delete, set main, validation mail, and validation route | `edit_emails.scala.html` renders delete buttons with `data-request-method="delete" data-request-uri`, valid sub-email `setAsMain`, invalid sub-email `sendValidationEmail` with `yobicon-error2`; `UserApp.deleteEmail`, `setAsMainEmail`, `sendValidationEmail`, and `confirmEmail` own mutations. | `frontend/src/routes/user/editform/emails.tsx` preserves delete/set-main/send-validation buttons, legacy request method/URI attributes, `href` attributes on optional action buttons, fixed-width inline action style, and the invalid-email warning icon class. `frontend/tests/user-email-settings.e2e.ts` includes those button attributes in the whole-screen DOM guard; `frontend/src/api/workspace.ts` maps delete, validation, and main to REST workspace endpoints; `auth-workspace-client.spec.ts`, `rest_contract.rs`, and `auth_workspace_contract.rs` continue to pin REST paths/CSRF plus direct delete/set-main aliases and confirmation URL behavior. | authenticated current user with valid and invalid secondary emails | delete, set-as-main, send validation, validation confirmation backend | React REST JSON; direct legacy aliases retained | covered in 2026-06-30 template-first reset slice | none |
| `/user/editform/token` API token display and reset | `edit_token.scala.html` renders token page title `userinfo.token`, `partial_edit_tabmenu("token")`, `.token-generate`, `#frmBasic`, readonly token input with click-to-select, and `userinfo.recreateToken`; `GET/POST /user/editform/token_reset` regenerates token; `UserApi.newToken()` supports legacy external `/-_-api/v1/users/token`. | `frontend/src/routes/user/editform/token.tsx` renders the token page under the legacy site shell with `.site-breadcrumb-outer`, `partial_edit_tabmenu` `nav nav-tabs mt20`, `.token-generate`, `#frmBasic`, readonly size-45 input with select-on-click, legacy `action="/user/editform/token_reset"`, and reset button; the React submit prevents native navigation and `resetApiTokenRest()` posts `/api/v1/workspace/api-token/reset`. `frontend/tests/user-token-settings.e2e.ts` whole-screen compares the authenticated navbar/breadcrumb/content/footer DOM against `edit_token.scala.html` plus `partial_edit_tabmenu.scala.html`, asserts layout metrics, CSRF bootstrap, and token value refresh after reset. Existing `workspace-settings-i18n.spec.tsx`, `auth-workspace-client.spec.ts`, `rest_contract.rs`, `auth_workspace_contract.rs`, and `users.rs` continue to cover legacy copy, REST path/CSRF, direct token-reset redirect, reset-token auth usage, and the external token JSON path. | authenticated current user | initial render, input select, reset submit, token-auth use after reset | React REST JSON; direct legacy token-reset and external token API retained | covered in 2026-06-30 template-first reset slice | none |
| `/me/settings/**` aliases | Legacy account settings canonical routes are `/user/editform`, `/user/editform/password`, `/user/editform/notifications`, `/user/editform/emails`, and `/user/editform/token`; there is no legacy `/me/settings/**` route. | `frontend/src/routes/me/settings/{profile,password,notifications,emails,token}/route.tsx` redirects each alias to the matching `/user/editform/**` path using `RedirectPage` and `runtimeConfig.basePath`; `frontend/src/routes/me/route.tsx` now renders the child `<Outlet />` for `/me/settings/**` so aliases are no longer swallowed by the `/me` profile page, and `RedirectPage` uses replace navigation with optional hash preservation. `frontend/tests/workspace-settings-parity.e2e.ts` proves every alias reaches the canonical legacy account URL and the notifications alias preserves `#2`. | authenticated current user | direct alias navigation | React redirect alias to canonical route | covered in current follow-up | none |
| Auth gate and loading state for account settings | Legacy `UserApp.editUserInfoForm` / `editUserInfoByTabForm` are user settings routes and require a current user. | Each `/user/editform/**` route calls `useRequireAuthenticatedRoute(...)`; bootstrapping renders the bounded legacy loading key. `workspace-settings-i18n.spec.tsx` confirms settings route fallback keys are legacy lookup calls, and existing auth shell tests cover authenticated route gating patterns. | anonymous and authenticated current user | anonymous guard, bootstrapping loading shell, authenticated render | React route guard plus session REST | covered | none |

## Playwright Scenario Matrix

| path | state | legacy selector/copy | Rust selector/copy | interaction | API/direct boundary | status |
| --- | --- | --- | --- | --- | --- | --- |
| `/user/editform` | profile tab | `#frmBasic`, `#frmAvatar`, `.avatar-wrap.xlarge`, account tabs | same settings shell, avatar controls, and reset form in `user-profile-settings.e2e.ts` | profile save and reset visited submit; deeper crop/upload flow remains covered by `workspace-settings-parity.e2e.ts` | profile REST plus reset REST; `/files` upload covered by existing settings E2E | covered in 2026-06-30 template-first reset slice |
| `/user/editform/password` | password tab | `#frmPassword`, old/new/retype fields, lost-password link | same form fields and copy in `user-password-settings.e2e.ts` | success mutation and login-form redirect; wrong password/mismatch remain covered by `workspace-settings-parity.e2e.ts` | `/api/v1/workspace/password` REST JSON | covered in 2026-06-30 template-first reset slice |
| `/user/editform/notifications#2` | watched project hash activation | `#notification-projects a[href="#2"]`, active tab pane | same active watched-project tab | direct hash navigation and toggle | `/api/v1/workspace/notifications` REST JSON | covered |
| `/user/editform/emails` | email management | add form, description, main/sub-email rows, delete, set-main, send-validation buttons | same shell, form, rows, legacy action attrs, and layout metrics in `user-email-settings.e2e.ts` | add email submit plus delete/send-validation/set-main controls | `/api/v1/workspace/emails/**` REST JSON | covered in 2026-06-30 template-first reset slice |
| `/user/editform/token` | API token reset | `.token-generate`, readonly token input, reset button | same token shell and reset control in `user-token-settings.e2e.ts` | click reset and assert changed token | `/api/v1/workspace/api-token/reset` REST JSON | covered in 2026-06-30 template-first reset slice |
| `/me/settings/**` | alias routes | no legacy page; aliases should redirect to `/user/editform/**` | same redirect to canonical legacy route with notification hash preservation | direct alias navigation | React redirect alias only | covered in current follow-up |

## Notes

- The report found no `gap`, `deviation`, `weak evidence`, or
  `needs-parent-decision` rows. The strongest browser-visible evidence is
  `frontend/tests/workspace-settings-parity.e2e.ts` for the historically fragile
  states: notification hash activation, avatar invalid/crop modal,
  crop-cancel/save upload, hidden avatar attachment promotion, profile redirect,
  reset visited projects, notification toggle mutation, password failure/success
  states, raw-key absence, and `/me/settings/**` alias redirect behavior.
- Direct legacy form/action routes are compatibility evidence only. The React
  settings screens submit through REST JSON and render in React, matching the
  phase rule against server-rendered HTML fragment data sources.
