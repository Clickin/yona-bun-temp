# Template-First UI Parity Report: P2 Project Shell/Settings

Status: current reset baseline
Date: 2026-07-02
Owner packet: P2 project shell/settings
Mode: template-first mapper baseline; implementation evidence reviewed

## Scope

This report reopens project shell/settings parity under
`docs/plans/2026-06-26-template-first-ui-parity-reset.md`.

The older `ui-parity-project-home-admin.md` report remains useful for REST and
route-state coverage. It does not prove the legacy `projectLayout`,
`project/header`, and `projectMenu` template visual contract is pixel-level
equivalent.

## Legacy Template Call Graph

| Legacy source | Role | Required anchors |
| --- | --- | --- |
| `yona-original/app/views/projectLayout.scala.html` | Project shell wrapper. Calls `layout(..., "prj")`, `common.navbar(menuType, project, null)`, `project.header(project)`, body, `common.footer()`. | Project pages must inherit global shell plus project header before route body. |
| `yona-original/app/views/project/header.scala.html` | Project hero/header. | `.project-header-outer[style*=background-image]`, `.project-header-inner`, `.project-header-wrap`, `.project-header-avatar`, `.project-breadcrumb-wrap`, `.project-breadcrumb`, `.project-author`, `.project-name`, `.user-project-list`, `.star.material-icons`, `.project-private`, `.project-protected`, `.project-origin`, `.project-util-wrap`, `.project-util`, `.watch-btn`, `.watcher-count`, `.watchBtn`, `#enrollBtn`. |
| `yona-original/app/views/projectMenu.scala.html` | Project main menu and admin cog. | `.project-menu-outer`, `.project-menu-inner`, `.project-menu-nav.project-menu-gruop`, `.menu-name`, `.short-menu`, `.project-menu-count`, `.project-setting`, `.yobicon-cog`. |
| `yona-original/app/views/project/partial_settingmenu.scala.html` | Settings sub-tabs. | `.nav.nav-tabs`, `#subMenuProjectSetting`, `#subMenuProjectMember`, `#subMenuIssueLabel`, `#subMenuWebhook`, `#subMenuProjectTransfer`, `#subMenuProjectDelete`, `#subMenuProjectChangeVCS`, `.num-badge`. |
| `yona-original/app/views/project/home.scala.html` | Project home content. | `.page-wrap-outer`, `.project-page-wrap`, mobile `.project-breadcrumb`, `.project-home-header.row-fluid`, `.project-overview`, `#project-description.markdown-wrap`, `#project-description-input`, `#cloneURL`, `#cloneURLBtn`, `.span-left-pane`, `.span-right-pane`, `#alertLeave`. |
| `project/setting.scala.html`, `members.scala.html`, `watchers.scala.html`, `webhooks.scala.html`, `delete.scala.html`, `transfer.scala.html`, `change_vcs.scala.html` | Project settings/admin pages. | `.bubble-wrap.gray`, `.box-wrap.top/middle/bottom`, `.cu-label`, `.cu-desc`, legacy checkbox/radio labels, destructive modal IDs, webhook form/list IDs, watcher member list. |

## Current React/CSS Targets

| Current source | Current responsibility |
| --- | --- |
| `frontend/src/routes/$ownerName/$projectName.tsx` | Project home route plus shared project header/menu implementation used by the active flat route tree. |
| `frontend/src/routes/$ownerName/$projectName/setting.tsx`, `members.tsx`, `watchers.tsx`, `webhooks.tsx`, `deleteform.tsx`, `transfer.tsx`, `changeVCS.tsx`, `statistics.tsx`, `issue/labelsform.tsx` | Route entrypoints for project settings/admin pages. |
| `frontend/src/routes/projects.tsx` | Active template-first reset implementation for `project/list.scala.html` at `/projects`, using REST `/api/v1/projects` through TanStack Query while preserving the legacy site-layout/project-directory DOM. |
| `frontend/src/app.css` | Project header/menu/settings visual approximation. |
| `frontend/tests/project-home-readme.e2e.ts`, `project-home-history.e2e.ts`, `project-home-dashboard.e2e.ts`, `project-settings-form.e2e.ts`, `project-members-form.e2e.ts`, `project-webhooks-form.e2e.ts`, `project-delete-form.e2e.ts`, `project-transfer-form.e2e.ts`, `project-change-vcs-form.e2e.ts` | Template-first route proof. |
| `frontend/tests/project-watchers.e2e.ts`, `project-labels-form.e2e.ts`, `project-statistics.e2e.ts`, `project-create.e2e.ts`, `project-import.e2e.ts`, `projects-list.e2e.ts` | Additional browser proof for directory/create/import and project admin/settings states. |

## Open Reset Queue Summary

Source comparison by Subagent P2 found concrete reset blockers:

| status | count |
| --- | ---: |
| gap | 0 |
| deviation | 0 |
| weak evidence | 0 |
| covered | 17 |

## Reset Findings

| legacy template | legacy route/state | current file | defect class | status | owner packet | proposed write scope | verification evidence |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `project/header.scala.html` | Any project page, viewer can watch/enroll. | `frontend/src/routes/$ownerName/$projectName.tsx`, `frontend/src/app.css`, `frontend/tests/project-home-readme.e2e.ts` | layout | covered in current follow-up | P2 | none | `ProjectHeader` renders legacy `.project-util-wrap > ul.project-util` with enrollment dropdown, `#enrollBtn`, `.watch-btn`, `.watcher-count`, `.watch-on`, and `.watchBtn` anchors; React handlers keep current REST mutations instead of importing legacy JS. CSS restores the legacy absolute header placement and watcher/down-arrow classes. |
| `project/header.scala.html` | Any project page. | `frontend/src/routes/$ownerName/$projectName.tsx`, `frontend/tests/project-home-readme.e2e.ts` | layout | covered in current follow-up | P2 | none | The non-legacy `.project-title-text` wrapper is absent while legacy owner/project breadcrumb anchors are preserved in the rendered project header. |
| `projectMenu.scala.html` | Project menu with admin update permission and enrollment requests. | `crates/server/src/api_types.rs`, `crates/server/src/routes/utils.rs`, `frontend/src/api/types.ts`, `frontend/src/routes/$ownerName/$projectName.tsx`, `frontend/tests/project-home-readme.e2e.ts`, `frontend/tests/project-settings-form.e2e.ts` | data-boundary | covered in current follow-up | P2 | none | Project detail/container DTOs carry `enrollmentRequestCount` from existing project membership directory data. `ProjectMenu` renders the legacy admin cog `<span class="project-menu-count">N</span>` when the count is positive. |
| `projectMenu.scala.html` | Any project page. | `frontend/src/routes/$ownerName/$projectName.tsx`, `frontend/tests/project-home-readme.e2e.ts`, `frontend/tests/project-issues-empty.e2e.ts` | layout | covered in current follow-up | P2 | none | `ProjectMenu` does not render visible keymap help by default because `projectMenu.scala.html` does not include `help.keymap`. Pages whose legacy templates explicitly call `@help.keymap(...)` still render the legacy `#helpKeys` modal. |
| `project/partial_settingmenu.scala.html` | Settings submenu with enroll requests. | `crates/server/src/api_types.rs`, `crates/server/src/routes/utils.rs`, `frontend/src/api/types.ts`, `frontend/src/routes/$ownerName/$projectName/setting.tsx`, `frontend/src/routes/$ownerName/$projectName/members.tsx`, `frontend/tests/project-settings-form.e2e.ts`, `frontend/tests/project-members-form.e2e.ts` | data-boundary | covered in current follow-up | P2 | none | Settings routes render the legacy member tab `<span class="num-badge">N</span>` from `enrollmentRequestCount` when the count is positive, matching `project.enrolledUsers.size`. |
| `project/watchers.scala.html` | `/owner/project/watchers`, private/protected/custom-menu project. | `frontend/src/routes/$ownerName/$projectName/watchers.tsx`, `frontend/tests/project-watchers.e2e.ts` | data-boundary | covered in current follow-up | P2 | none | Watchers route reads project container data, so the legacy project header/menu shell preserves logo, scope marker, menu visibility, and menu counts instead of using only synthetic owner/project state. |
| `project/members.scala.html` | `/owner/project/members`, custom-menu project. | `frontend/src/routes/$ownerName/$projectName/members.tsx`, `frontend/tests/project-members-form.e2e.ts` | data-boundary | covered in current follow-up | P2 | none | Members route reads project container data, so the legacy project header/menu/settings-tab shell preserves logo, scope marker, menu visibility/counts, and enrollment badge while keeping member CRUD data from the members response. |
| `project/webhooks.scala.html` | Webhook list, viewer can read but cannot create. | `crates/server/src/routes/projects/webhooks.rs`, `frontend/src/routes/$ownerName/$projectName/webhooks.tsx`, `frontend/tests/project-webhooks-form.e2e.ts` | permission | covered in current follow-up | P2 | none | `GET /webhooks` uses project READ authorization and the React route no longer returns `ForbiddenPage` solely for `!viewerCanUpdate`; `ProjectWebhooksPage` still hides `#formNewWebhook` for read-only viewers. Create/delete mutations keep UPDATE authorization. |
| `project/setting.scala.html` | Settings form with logo. | `frontend/src/routes/$ownerName/$projectName/setting.tsx`, `frontend/tests/project-settings-form.e2e.ts` | asset | covered in current follow-up | P2 | none | `ProjectSettingsPage` renders `.logo-wrap` with legacy inline `background-image:url(...)`, using `detail.logoUrl` or the legacy `/assets/images/project_default_logo.png` fallback; settings browser proof asserts the style and `#logoPath` upload anchor. |
| `project/setting.scala.html` | Git project, code menu off. | `frontend/src/routes/$ownerName/$projectName/setting.tsx`, `frontend/tests/project-settings-form.e2e.ts` | layout | covered in current follow-up | P2 | none | Git settings always render `#defaultBranceSettingPanel` with the legacy branch select and hide the wrapper with `style="display:none"` when code menu is off; the panel no longer disappears when code is off or branch options are empty. |
| `project/setting.scala.html` | Reviewer count dropdown. | `frontend/src/routes/$ownerName/$projectName/setting.tsx`, `frontend/src/routes/__root.tsx`, `frontend/tests/project-settings-form.e2e.ts`, `frontend/tests/ui-kit.e2e.ts` | layout | covered in current follow-up | P2 | none | `#welReviewerCount` renders the legacy `.btn-group.branches[data-id=project-reviewer-count][data-name=defaultReviewerCount] > button.btn.dropdown-toggle.large[data-toggle=dropdown] + ul.dropdown-menu > li[data-value] > a` shell. React click handlers update current state without importing legacy JavaScript. |
| `project/home.scala.html` | Project home sidebar. | `frontend/src/routes/$ownerName/$projectName.tsx`, `frontend/tests/project-home-readme.e2e.ts`, `frontend/tests/project-home-dashboard.e2e.ts` | layout | covered in current follow-up | P2 | none | The non-legacy `section > h3 Project dashboard` / `.runtime-grid` sidebar block is absent; watch/enroll controls live in `project/header.scala.html`'s util dropdown position, and the sidebar preserves legacy button wrap, optional milestone summary, and member info order. |
| `project/home.scala.html` | SVN project with code menu enabled. | `frontend/src/routes/$ownerName/$projectName.tsx`, `frontend/tests/project-home-readme.e2e.ts` | interaction | covered in current follow-up | P2 | none | Fork CTA renders only when `detail.showCode` is true and `vcs` is Git/unspecified, matching the legacy `project.vcs.equals("GIT")` guard under `project.menuSetting.code`. |
| `project/create.scala.html` | `/projectform` new project form, authenticated owner can create. | `frontend/src/routes/projectform.tsx`, `frontend/src/api/org-project.ts`, `frontend/src/api/query-keys.ts` | layout | covered in 2026-06-30 template-first reset slice | P2 | none; the route is one legacy template plus shared site shell, so decomposition would add indirection without reducing duplication | `frontend/tests/project-create.e2e.ts` was RED against the missing `/projectform` route, then GREEN after `project/create.scala.html` was ported under the legacy `siteLayout` shell. It compares the stable `.unsupported`, `.gnb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots after mocking an authenticated admin session and `/api/v1/projects/form-options`, including `#newProjectForm`, owner select options with `data-type`/`data-avatar-url`, project name/description fields, share option radios, hidden protected scope row, VCS select plus SVN warning, all menu-setting checkboxes including `#menuSettingPullRequest`, import/cancel links, and REST/TanStack create submit boundary through the existing project create client. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- project-create.e2e.ts`. |
| `project/list.scala.html` | `/projects?filter=sample` project directory list. | `frontend/src/routes/projects.tsx`, `frontend/src/routes/-home-route-screen.tsx`, `frontend/src/api/org-project.ts`, `frontend/src/api/query-keys.ts` | layout | covered in 2026-06-30 template-first reset slice | P2 | none; the route is one legacy template plus shared site shell, so decomposition beyond a row component would add noise | `frontend/tests/projects-list.e2e.ts` was RED against the missing `/projects` route, then GREEN after `project/list.scala.html` was ported under the legacy `siteLayout` shell. It compares the stable `.unsupported`, `.gnb-outer`, `.site-breadcrumb-outer`, `.page-wrap-outer`, and `.page-footer-outer` roots after mocking a non-anonymous session and `/api/v1/projects`, including the active navbar Project list item, authenticated `common.usermenu`, PUBLIC Project list / Group List breadcrumb tabs with the legacy `/orgs` group-list href, filter form, one `.all-projects > li.project` row with logo/title/description/owner/date/latest-code stats, and `#pagination`. The same E2E now browser-proves loaded legacy `.all-projects` row metrics from `yobi.css`: list clearing/margins, row padding/divider/overflow, 50px avatar slot, 20px bold header, grey description/name-tag spacing, and right-aligned stats rail. Verification: `pnpm --dir frontend check`; `pnpm --dir frontend test:e2e -- projects-list.e2e.ts`; `pnpm --dir frontend test:e2e -- public-landing-parity.e2e.ts projects-list.e2e.ts`. |
| `project/members.scala.html` | Role dropdown. | `frontend/src/routes/$ownerName/$projectName/members.tsx`, `frontend/tests/project-members-form.e2e.ts` | layout | covered in current follow-up | P2 | none | Member role dropdown items render as `<a data-action="apply" data-href=... data-loginId=...>` inside the legacy `.btn-group > button.dropdown-toggle.large + ul.dropdown-menu > li[data-value]` shell. The legacy `javascript:void(0)` href is intentionally represented as a React `preventDefault()` anchor target to preserve behavior without copying legacy JavaScript. |
| `project/partial_webhooks_list.scala.html` | Existing webhook row. | `frontend/src/routes/$ownerName/$projectName/webhooks.tsx`, `frontend/tests/project-webhooks-form.e2e.ts` | interaction | covered in current follow-up | P2 | none | Existing webhook rows preserve the legacy `.row-fluid.list-item.vertical-align[data-webhook-id]` shell, `<h6>` wrappers for payload/secret/type, delete button request attributes, and checked read-only git-push checkbox. The legacy inline `onclick="return false;"` is intentionally implemented as React `event.preventDefault()` to keep the same no-toggle UX without copying legacy JavaScript. |

## Verifier Evidence

Current focused browser verification:

- `pnpm --dir frontend test:e2e -- project-home-readme.e2e.ts project-home-history.e2e.ts project-home-dashboard.e2e.ts project-settings-form.e2e.ts project-members-form.e2e.ts project-webhooks-form.e2e.ts project-delete-form.e2e.ts project-transfer-form.e2e.ts project-change-vcs-form.e2e.ts project-watchers.e2e.ts project-labels-form.e2e.ts project-statistics.e2e.ts project-create.e2e.ts project-import.e2e.ts projects-list.e2e.ts`
- Result: `63` Playwright tests passed on `2026-07-02`.

Computed-style/layout proof is now carried by the route-specific E2E guards
listed in the reset rows above. They cover project header/menu, settings tabs,
settings form boxes, member/watch/webhook rows, transfer/delete/change-VCS
admin pages, project home tabs, create/import, and directory list proportions.
Broader whole-UI closure remains subject to the top-level integrated browser
sweep.
