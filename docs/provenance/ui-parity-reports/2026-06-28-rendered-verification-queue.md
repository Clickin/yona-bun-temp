# 2026-06-28 Rendered Verification Queue

Status: active audit queue
Date: 2026-06-28
Sources: `2026-06-28-static-react-owner-coverage.md`, `yona-original/app/views/**`, `frontend/src/routes/**`

This queue turns the static owner coverage matrix into rendered verification work. It does not close UI parity. A template leaves this queue only after the owning route is opened against the legacy Scala template and included partials, active JSX is checked for DOM/copy/form/data attributes, TanStack Query submit boundaries are verified where forms exist, and the result is recorded as covered/gap/deviation/deferred.

Template rows: 242
P0/P1/P2 rendered audit rows: 108
P3 confirmation rows: 134

P0 source pass:
`docs/provenance/ui-parity-reports/2026-06-28-p0-rendered-audit-pass.md`.
It opens the 12 highest-priority rows but does not close them without rendered
route evidence.

P1 source pass:
`docs/provenance/ui-parity-reports/2026-06-28-p1-source-audit-pass.md`.
It expands the 89 P1 rows into rendered interaction, caller-route, dynamic
selector, and selector/copy checks. It does not close them without rendered
route evidence.

P2/P3 source pass:
`docs/provenance/ui-parity-reports/2026-06-28-p2-p3-source-audit-pass.md`.
It expands the remaining 7 P2 rows and 134 P3 rows. Together with the P0 and
P1 passes, all 242 queue rows now have source-pass follow-up requirements, but
the queue remains open until rendered evidence or explicit
`gap`/`deviation`/`deferred` records exist.

Rendered evidence execution manifest:
`docs/provenance/ui-parity-reports/2026-06-28-rendered-evidence-execution-manifest.md`.
It maps all 242 queue rows to route/evidence buckets. The latest visual sweep
can support route-open evidence for 240 rows; the 2 framed-layout rows are
covered by the focused absence guard in `frontend/src/auth-workspace-shell.spec.tsx`.

## Lane Summary

| lane | count | required next evidence |
| --- | ---: | --- |
| V0 low-overlap rendered audit | 3 | Open legacy template, current owner JSX, and rendered route; record gap/deviation/deferred or rewrite task. |
| V1 manual layout/behavior audit | 12 | Open legacy template, current owner JSX, and rendered route; record gap/deviation/deferred or rewrite task. |
| V2 missing-anchor rendered audit | 93 | Open legacy template, current owner JSX, and rendered route; record gap/deviation/deferred or rewrite task. |
| V3 full rendered confirmation | 134 | Browser/rendered confirmation before closure. |

## Priority Summary

| priority | count | meaning |
| --- | ---: | --- |
| P0 | 12 | Low-overlap or layout/no-anchor rows that can hide broad UX regressions. |
| P1 | 89 | Partial rows with missing id/name/data anchors that affect selectors, forms, or interactions. |
| P2 | 7 | Manual or lower-risk partial rows requiring caller-route checks. |
| P3 | 134 | Static-anchor candidates; still need rendered confirmation before closure. |

## Packet/Lane/Priority Matrix

| packet | lane | priority | count |
| --- | --- | --- | ---: |
| P0 global shell | V0 low-overlap rendered audit | P0 | 1 |
| P0 global shell | V1 manual layout/behavior audit | P2 | 1 |
| P0 global shell | V2 missing-anchor rendered audit | P1 | 3 |
| P0 global shell | V3 full rendered confirmation | P3 | 6 |
| P1 auth/public/home/help | V0 low-overlap rendered audit | P0 | 1 |
| P1 auth/public/home/help | V1 manual layout/behavior audit | P0 | 2 |
| P1 auth/public/home/help | V2 missing-anchor rendered audit | P1 | 18 |
| P1 auth/public/home/help | V2 missing-anchor rendered audit | P2 | 1 |
| P1 auth/public/home/help | V3 full rendered confirmation | P3 | 15 |
| P2 project | V1 manual layout/behavior audit | P0 | 1 |
| P2 project | V2 missing-anchor rendered audit | P1 | 8 |
| P2 project | V3 full rendered confirmation | P3 | 19 |
| P3 issue | V2 missing-anchor rendered audit | P1 | 20 |
| P3 issue | V3 full rendered confirmation | P3 | 10 |
| P4 board/milestone | V2 missing-anchor rendered audit | P1 | 5 |
| P4 board/milestone | V3 full rendered confirmation | P3 | 6 |
| P5 code/pr/review | V2 missing-anchor rendered audit | P1 | 16 |
| P5 code/pr/review | V2 missing-anchor rendered audit | P2 | 2 |
| P5 code/pr/review | V3 full rendered confirmation | P3 | 20 |
| P6 directory/workspace | V1 manual layout/behavior audit | P0 | 2 |
| P6 directory/workspace | V2 missing-anchor rendered audit | P1 | 9 |
| P6 directory/workspace | V2 missing-anchor rendered audit | P2 | 1 |
| P6 directory/workspace | V3 full rendered confirmation | P3 | 32 |
| P7 site-admin/security | V1 manual layout/behavior audit | P0 | 4 |
| P7 site-admin/security | V2 missing-anchor rendered audit | P1 | 5 |
| P7 site-admin/security | V3 full rendered confirmation | P3 | 9 |
| shared partials | V0 low-overlap rendered audit | P0 | 1 |
| shared partials | V1 manual layout/behavior audit | P2 | 2 |
| shared partials | V2 missing-anchor rendered audit | P1 | 5 |
| shared partials | V3 full rendered confirmation | P3 | 17 |

## P0/P1/P2 Rendered Verification Queue

| priority | lane | legacy template | packet | rendered route/caller hint | static gap anchors | required verification |
| --- | --- | --- | --- | --- | --- | --- |
| P0 | V0 low-overlap rendered audit | `layout_framed.scala.html` | P0 global shell | legacy framed shell only; verify retired iframe deviation is recorded | \`ids:mainFrame\`, \`ids:mainFrameId\`, \`ids:sidebar-bottom\`, \`names:mainFrame\`, \`names:twitter:card\`, \`names:twitter:description\`, \`names:twitter:title\`, \`names:twitter:url\`, \`names:viewport\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P0 | V0 low-overlap rendered audit | `help/markdown.scala.html` | P1 auth/public/home/help | /-/help or /-/UIKit | \`dataAttrs:data-target\` | covered: `frontend/tests/ui-kit.e2e.ts` injects the legacy partial into `/_UIKit`, compares the stable `.markdown-help` subtree against `help/markdown.scala.html`, preserves all ten `.help-nav[data-toggle="markdown-help"][data-target]` anchors, and proves active-section switching plus same-tab deactivation. |
| P0 | V1 manual layout/behavior audit | `index/index.scala.html` | P1 auth/public/home/help | / and directory/workspace routes | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P0 | V1 manual layout/behavior audit | `index/sidebar.scala.html` | P1 auth/public/home/help | root SPA sidebar surface | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P0 | V1 manual layout/behavior audit | `projectLayout.scala.html` | P2 project | /:owner/:projectName | - | covered: `frontend/tests/project-settings-form.e2e.ts` renders `/admin/sample/setting`, compares the stable roots from `layout("prj")` + `project.header` + `project/setting.scala.html`, and asserts the rendered root order stays `.unsupported`, `.gnb-outer`, `.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.page-footer-outer`. |
| P0 | V1 manual layout/behavior audit | `organizationLayout.scala.html` | P6 directory/workspace | /organizations/:organizationName/* shell | - | covered: `frontend/tests/organization-settings-form.e2e.ts` renders `/organizations/weblabs/settingform`, compares the stable roots from `organizationLayout.scala.html` + `organization/header.scala.html` + `organization/menu.scala.html` + `organization/setting.scala.html`, and asserts the rendered root order stays `.unsupported`, `.gnb-outer`, `.project-header-outer`, `.project-menu-outer`, `.page-wrap-outer`, `.page-footer-outer`. |
| P0 | V1 manual layout/behavior audit | `search/result.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | - | partial covered: `frontend/tests/search-global.e2e.ts` compares the global `/search?keyword=missing&searchType=project` site-layout branch against `search/result.scala.html`, `search/partial_search.scala.html`, and the `partial_projects.scala.html` empty state, then compares `/search?keyword=sample&searchType=project` against the populated `partial_projects.scala.html` row with fork-origin metadata, `/search?keyword=member&searchType=user` against the populated `partial_users.scala.html` row with avatar tooltip/image, legacy profile href, title, member-since info, and pagination, `/search?keyword=bug&searchType=issue` against the populated `partial_issues.scala.html` row, `/search?keyword=notice&searchType=post` against the populated `partial_posts.scala.html` row, `/search?keyword=v1&searchType=milestone` against the populated `partial_milestones.scala.html` row with project/due-date metadata, `/search?keyword=reply&searchType=issue_comment` against the populated `partial_issue_comments.scala.html` row with comment fragment anchor, snippet, project, author, and date metadata, `/search?keyword=thread&searchType=post_comment` against the populated `partial_post_comments.scala.html` row with comment fragment anchor, snippet, project, author, and date metadata, and `/search?keyword=review&searchType=review` against the populated `partial_reviews.scala.html` pull-request review row with comment fragment anchor, snippet, project, author, and date metadata. `frontend/tests/search-project.e2e.ts` compares the project `/admin/sample/search?keyword=missing&searchType=review` branch with `projectLayout`, `projectMenu(..., MenuType.NONE, "main-menu-only")`, omitted project category, and empty result state. `frontend/tests/search-organization.e2e.ts` compares the organization `/organizations/weblabs/search?keyword=missing&searchType=project` branch with `organizationLayout`, `organization.header`, `organization.menu`, included project category, and empty result state. Remaining queue: none for populated result partials listed in this slice. |
| P0 | V1 manual layout/behavior audit | `restricted.scala.html` | P7 site-admin/security | /restricted | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P0 | V1 manual layout/behavior audit | `site/setting.scala.html` | P7 site-admin/security | /sites/:pageName | - | deviation recorded: legacy body is only `TODO` inside `siteMngLayout(message)` and legacy site management nav exposes the real admin pages, not `/sites/setting`; `frontend/tests/site-admin-user-list.e2e.ts` asserts the rendered admin nav has no `/sites/setting` link and no TODO placeholder leaks into `.site-setting-wrap`. |
| P0 | V1 manual layout/behavior audit | `siteLayout_framed.scala.html` | P7 site-admin/security | legacy framed admin shell; verify iframe retirement/deviation | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P0 | V1 manual layout/behavior audit | `siteLayout.scala.html` | P7 site-admin/security | /sites/:pageName admin shell | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P0 | V0 low-overlap rendered audit | `common/childCommentsAnchorDiv.scala.html` | shared partials | included partial; verify through each caller route | \`ids:comment-@comment.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `common/navbar.scala.html` | P0 global shell | included partial; verify through each caller route | \`ids:unsupported-content\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `common/scripts.scala.html` | P0 global shell | included partial; verify through each caller route | \`dataAttrs:data-activate\`, \`dataAttrs:data-name\`, \`dataAttrs:data-via-email\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `layout.scala.html` | P0 global shell | all SPA pages via root shell | \`names:twitter:card\`, \`names:twitter:description\`, \`names:twitter:title\`, \`names:twitter:url\`, \`names:viewport\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `help/experimental.scala.html` | P1 auth/public/home/help | /-/help or /-/UIKit | \`ids:experimentalHelp\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `help/keymap.scala.html` | P1 auth/public/home/help | `/admin/sample/issues` | \`ids:helpKeys\` | covered: `frontend/tests/project-issues-empty.e2e.ts` compares the issue-list caller from `issue/partial_list_wrap.scala.html`, including the nested `help/keymap.scala.html` trigger/modal, `#helpKeys.modal.hide.fade.keymap-help`, issue-list shortcut rows, project/site shortcut rows, manager-only `Q` setting shortcut, Git pull-request shortcut, Mac/non-Mac modifier behavior, and non-member omission of the project setting shortcut. Remaining caller variants: issue detail and board list/detail stay tracked by their own screen rebuild rows. |
| P1 | V2 missing-anchor rendered audit | `help/UIKit.scala.html` | P1 auth/public/home/help | /-/help or /-/UIKit | \`names:viewport\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `index/allOrganizationList_partial.scala.html` | P1 auth/public/home/help | caller route not identified | \`ids:@organization.id\`, \`dataAttrs:data-organization-id\` | caller-route-check-needed: repository search finds no active Play route/controller caller for `index/allOrganizationList.scala.html`; `/user/usermenuTabContentList` renders `common/usermenu_tab_content_list.scala.html`, which calls `myOrganizationList`, `myProjectList`, and `myRecentIssueList` only. Do not mark rendered until an active legacy caller state is identified or this template is reclassified as dormant/deferred. |
| P1 | V2 missing-anchor rendered audit | `index/allOrganizationList.scala.html` | P1 auth/public/home/help | caller route not identified | \`ids:@title\` | caller-route-check-needed: repository search finds no active Play route/controller caller for this wrapper; the active user-menu endpoint renders `common/usermenu_tab_content_list.scala.html` and does not include `allOrganizationList`. Rendered React proof remains pending active-caller identification or dormant/deferred reclassification. |
| P1 | V2 missing-anchor rendered audit | `index/allProjectList_partial.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar favorite tab | \`ids:@project.id\`, \`dataAttrs:data-content\`, \`dataAttrs:data-trigger\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares nested favorite-tab project rows from `index/allProjectList_partial.scala.html`, preserving `li.user-li` favored/hide classes, `data-location`, `.project-list.project-flex-container[data-toggle=popover][data-trigger=hover][data-placement=right][data-content]`, `.site-logo.all-project-names`, avatar image/dummy branches, lock icon branch, `.star-project[data-project-id]`, and starred/unstarred material icon classes. |
| P1 | V2 missing-anchor rendered audit | `index/allProjectList.scala.html` | P1 auth/public/home/help | caller route not identified | \`ids:@title\` | caller-route-check-needed: repository search finds no active Play route/controller caller for this wrapper; the active user-menu endpoint renders `common/usermenu_tab_content_list.scala.html` and does not include `allProjectList`. Rendered React proof remains pending active-caller identification or dormant/deferred reclassification. |
| P1 | V2 missing-anchor rendered audit | `index/displayProjects.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar project tab | \`ids:@title\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` opens `/`, uses the rendered `#sidebar-open-btn` then `.myProjectList a`, and compares `#usermenu-tab-content-list` against the legacy project-tab wrapper with `.search-result`, `.tab-pane.myproject-list-wrap`, `.search-input.project-search#query[autocomplete=off][placeholder="Type name"]`, four `.nav-subtab.unstyled` anchors, populated recently visited/watching/member panes, and the empty `#createdByMe.no-result` branch. |
| P1 | V2 missing-anchor rendered audit | `index/myOrganizationList_partial.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar favorite tab | \`ids:@organization.id\`, \`dataAttrs:data-organization-id\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` opens `/`, uses the rendered side-menu control, and compares favorite organization rows preserving `.org-li`, favored-last class, `.org-list.project-flex-container.all-orgs`, `.yobicon-angle-right`, `.projectName-owner.all-org-names`, `.org-name`, project count cell, `.star-org[data-organization-id]`, starred icon, and nested project list. |
| P1 | V2 missing-anchor rendered audit | `index/myOrganizationList.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar favorite tab | \`ids:@title\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares the stable `#usermenu-tab-content-list` subtree for the default Favorite tab against the legacy `.search-result`, `.group`, `.search-input.org-search[autocomplete=off][placeholder="Type name"]`, `#organizations.tab-pane.user-ul`, current-user own-project section, favorite organization section, `.etc-favorites`, and direct favorite-project row. |
| P1 | V2 missing-anchor rendered audit | `index/myProjectList_partial.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar project tab | \`ids:@project.id\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares the rendered project rows for recently visited/watching/member projects, preserving `li.user-li[data-location]`, `.project-list.project-flex-container`, `.project-item.project-item-container`, `.project-avatar` image/dummy branches, `.projectName-owner`, lock icon branch, owner anchors, `.star-project[data-project-id]`, and `.star.material-icons` order. |
| P1 | V2 missing-anchor rendered audit | `index/myProjectList.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar project tab | \`ids:@title\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` opens `/`, uses the rendered side-menu control and project tab, then compares the stable `#usermenu-tab-content-list` subtree against the legacy `myProjectList.scala.html`/`displayProjects.scala.html` shape with project search, subtab labels/order, pane ids, active recently visited pane, empty created-by-me pane, and populated project-row partials. |
| P1 | V2 missing-anchor rendered audit | `index/myRecentIssueList_partial.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar recent issue tab | \`dataAttrs:data-content\`, \`dataAttrs:data-trigger\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` opens `/`, uses the rendered side-menu control and Recent History tab, then compares rendered recent issue rows preserving `li.user-li[data-location]`, `.project-list.project-flex-container[data-toggle=popover][data-trigger=hover][data-placement=right][data-content]`, `.project-item.project-item-container`, `.issue-item.projectName-owner`, `.issue-title-start`, and `.issue-title.flex-item`. |
| P1 | V2 missing-anchor rendered audit | `index/myRecentIssueList.scala.html` | P1 auth/public/home/help | root SPA authenticated sidebar recent issue tab | \`ids:@title\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares the stable `#usermenu-tab-content-list` subtree for the Recent History tab against the legacy `.search-result`, `.tab-pane.myproject-list-wrap`, `.search-input.project-search#query[autocomplete=off][placeholder="Type name"]`, inner `.tab-content`, active `#recentlyVisitedIssues.tab-pane.user-ul`, and populated recent issue row partials. |
| P1 | V2 missing-anchor rendered audit | `index/notifications.scala.html` | P1 auth/public/home/help | / and directory/workspace routes | \`ids:toggleIntro\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares authenticated `/` and direct `/notifications` against the legacy notification shell, including `.site-guide-outer`, welcome table actions, `#toggleIntro`, `.page.on-fold-intro`, `common.mySeriesMenuTab`, direct-route `#setDefaultLoginPage`, empty `.warning-none`, desktop/mobile layout metrics, and the legacy localStorage-backed intro toggle behavior. |
| P1 | V2 missing-anchor rendered audit | `index/partial_notifications.scala.html` | P1 auth/public/home/help | / and directory/workspace routes | \`ids:message-@noti.id\`, \`ids:notification-more\`, \`dataAttrs:data-target\` | covered: `frontend/tests/authenticated-home-empty-notifications.e2e.ts` compares populated notification rows preserving `.notification-stream`, `.stream-type`, `.stream-desc[data-target][data-toggle=learnmore]`, generated `#message-{id}.message-wrap.nowrap`, title/message/meta/avatar/author/ago nodes, link/image click no-op behavior, row expand/collapse behavior, and `#notification-more[href="javascript:void(0);"]` pagination through `/api/v1/notifications?from=20&size=20`. |
| P1 | V2 missing-anchor rendered audit | `welcome/restart.scala.html` | P1 auth/public/home/help | /restart | \`names:viewport\` | covered: `frontend/tests/restart.e2e.ts` compares the standalone restart page/footer roots from `welcome/restart.scala.html`, asserts the normalized SPA viewport head value, and pins legacy desktop/mobile proportions for `.secret-wrap`, `.logo`, `.secret-box`, `.page-footer-outer`, `.page-footer`, and `.provider`. |
| P1 | V2 missing-anchor rendered audit | `welcome/secret.scala.html` | P1 auth/public/home/help | /secret | \`names:viewport\` | covered: `frontend/tests/secret-setup.e2e.ts` compares the first-run setup page/footer roots from `welcome/secret.scala.html`, verifies the normalized SPA viewport head value, proves the CSRF-backed `/api/v1/auth/secret` submit and base-path restart redirect, asserts desktop/mobile form/alert/footer proportions, and compares the setup-disabled `error/notfound_default.scala.html` roots. |
| P1 | V2 missing-anchor rendered audit | `project/create.scala.html` | P2 project | /projectform | \`dataAttrs:data-avatar-url\` | covered: `frontend/tests/project-create.e2e.ts` compares the whole `project/create.scala.html` screen roots for `/projectform`, including site shell, `#newProjectForm[action="/yona/projects"][method=post]`, owner/name/description fields, owner `option[data-type][data-avatar-url]` rows, hidden protected-scope default, VCS selector/SVN warning state, menu checkboxes, import/cancel links, and legacy form/action ordering. Submit remains on the React/TanStack REST boundary through `frontend/src/routes/projectform.tsx` and `createProjectRest`. |
| P1 | V2 missing-anchor rendered audit | `project/header.scala.html` | P2 project | /:owner/:projectName shell header | \`ids:@project.id\` | covered: `frontend/tests/project-settings-form.e2e.ts` renders `/admin/sample/setting`, compares the stable roots from `layout("prj")` + `project.header` + `project/setting.scala.html`, preserves `.user-project-list[data-project-id="7"]`, and asserts the legacy 120px header, 40px menu, 97% wrap, 90px avatar, and header/menu stacking metrics. |
| P1 | V2 missing-anchor rendered audit | `project/importing.scala.html` | P2 project | /-/import or project import state | \`dataAttrs:data-avatar-url\` | covered: `frontend/tests/project-import.e2e.ts` renders `/_import?owner=admin`, compares the whole `project/importing.scala.html` screen roots, preserves owner `option[data-type][data-avatar-url]`, import form names/action/method, repo-auth branch, disabled Git VCS plus hidden `vcs`, menu checkboxes, create/cancel links, and asserts the legacy 700px centered `.form-wrap.new-project`, 98% text input, advanced-options/repo-auth styling, and centered action row metrics. |
| P1 | V2 missing-anchor rendered audit | `project/members.scala.html` | P2 project | /:owner/:projectName/members | \`names:roleof-@member.user.loginId\` | covered: `frontend/tests/project-members-form.e2e.ts` renders `/admin/sample/members`, compares the whole `project/members.scala.html` screen roots with project shell and `partial_settingmenu`, preserves `#addNewMember`, `input[name=loginId]`, `.btn-group[data-name="roleof-alice"]`, role/delete anchors, enrollment `.enrollAcceptBtn[data-loginid]`, proves the Add action posts the selected login, and asserts legacy member input, avatar, row, owner label, role dropdown, and two-column metrics. |
| P1 | V2 missing-anchor rendered audit | `project/partial_dashboard_issuesbylabel.scala.html` | P2 project | /:owner/:projectName dashboard caller | \`ids:@label.id\` | covered: `frontend/tests/project-home-dashboard.e2e.ts` renders `/admin/sample?tabId=dashboard`, compares the whole project home dashboard roots with `partial_dashboard_issuesbylabel.scala.html`, preserves `.dl-horizontal.overview-label`, category `dt`, label `span.issue-label.list-label.active[data-label-id="9"]`, issue-link href, `.span2.num strong` count, and asserts dashboard heading, `dt`/`dd`, label chip, label/count column, border, padding, and line-height metrics. |
| P1 | V2 missing-anchor rendered audit | `project/partial_issuelabels_list.scala.html` | P2 project | /:owner/:projectName/issue/labelsform | \`ids:@category.id\`, \`ids:@label.id\`, \`ids:@project.id\`, \`names:@category.name\`, \`names:@label.name\` | covered: `frontend/tests/project-labels-form.e2e.ts` renders `/admin/sample/issue/labelsform`, compares the whole project label settings roots with the legacy populated `partial_issuelabels_list.scala.html` subtree, preserves grouped `.category-wrap[data-category][data-category-name]`, exclusive icon classes/tooltips, category edit `data-project-id` and update URI, label row/chip `data-label-id`/`data-label-name`, delete/update action URIs, populated edit-label category options, and asserts list head/category alignment, border/background, category metadata, label color, and action URI metrics. |
| P1 | V2 missing-anchor rendered audit | `project/partial_webhooks_list.scala.html` | P2 project | /:owner/:projectName/webhooks | \`ids:@webhook.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `project/setting.scala.html` | P2 project | /:owner/:projectName/settingform | \`names:watchingCount\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/create.scala.html` | P3 issue | /:owner/:projectName/issueform | \`dataAttrs:data-close-on-select\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/edit.scala.html` | P3 issue | /:owner/:projectName/issue/:issueNumber/editform | \`dataAttrs:data-close-on-select\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/my_partial_list_quicksearch.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@currentUserId\`, \`ids:@param.milestoneId\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/my_partial_list.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@label.id\`, \`ids:issue-item-@issue.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_assignee.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@user.loginId\`, \`dataAttrs:data-avatar-url\`, \`dataAttrs:data-login-id\`, \`dataAttrs:data-non-member\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_comment.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@comment.id\`, \`ids:comment-@comment.id\`, \`ids:comment-body-@comment.id\`, \`dataAttrs:data-attachments\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `issue/partial_event_timeline.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:event-@event.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_index_comment.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:comment-@comment.id\`, \`ids:comment-body-@comment.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `issue/partial_index_event_timeline.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:event-@event.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_list_draft.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@issue.id\`, \`ids:@label.category.id\`, \`ids:@label.id\`, \`ids:issue-@issue.id\`, \`ids:issue-item-@issue.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_list_quicksearch.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@UserApp.currentUser.id\`, \`ids:@param.milestoneId\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_list.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@issue.id\`, \`ids:@label.category.id\`, \`ids:@label.id\`, \`ids:issue-@issue.id\`, \`ids:issue-item-@issue.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_massupdate.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@label.id\`, \`ids:labelCatetoryItem\`, \`ids:labelListItem\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_searchform.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@author.loginId\`, \`ids:@user.loginId\`, \`dataAttrs:data-avatar-url\`, \`dataAttrs:data-login-id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_select_label.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@category.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_select_subtask.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`dataAttrs:data-avatar-url\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_show_selected_label.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@label.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_view_child.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@label.category.id\`, \`ids:@label.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/partial_voter_list.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | \`ids:@id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `issue/view.scala.html` | P3 issue | /:owner/:projectName/issue/:issueNumber | \`ids:@issue.id\`, \`ids:issue-@issue.getNumber\`, \`ids:issue-body-@issue.getNumber\`, \`ids:issueBodyChecksum\`, \`ids:issueUpdateDate\`, \`dataAttrs:data-attachments\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `board/partial_comments.scala.html` | P4 board/milestone | included partial caller route; inspect Play route and React owner | \`ids:@comment.id\`, \`ids:comment-@comment.id\`, \`ids:comment-body-@comment.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `board/partial_list.scala.html` | P4 board/milestone | included partial caller route; inspect Play route and React owner | \`ids:@label.category.id\`, \`ids:@label.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `board/view.scala.html` | P4 board/milestone | /:owner/:projectName/post/:postNumber | \`ids:post-@post.getNumber\`, \`ids:post-body-@post.getNumber\`, \`ids:tplAttachedFile\`, \`names:${fileName}\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `milestone/edit.scala.html` | P4 board/milestone | /:owner/:projectName/milestone/:milestoneId/editform | \`ids:@id\`, \`names:@name\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary |
| P1 | V2 missing-anchor rendered audit | `milestone/list.scala.html` | P4 board/milestone | /:owner/:projectName/milestones | \`ids:@label.category.id\`, \`ids:@label.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `code/compare_svn.scala.html` | P5 code/pr/review | /:owner/:projectName/compare/:revisionRange | \`dataAttrs:data-commit-origin\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `code/history.scala.html` | P5 code/pr/review | /:owner/:projectName/commits/:branch/* | \`dataAttrs:data-commitId\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `code/partial_nonrange_codecomment_thread.scala.html` | P5 code/pr/review | included partial caller route; inspect Play route and React owner | \`ids:comment-@comment.id\`, \`ids:thread-@thread.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `code/partial_view_file.scala.html` | P5 code/pr/review | included partial caller route; inspect Play route and React owner | \`dataAttrs:data-mimeType\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `code/partial_view_folder.scala.html` | P5 code/pr/review | included partial caller route; inspect Play route and React owner | \`ids:cb-${listPath}${fileName}\`, \`ids:cb-@listPath@fileName\`, \`ids:tplFileListItem\`, \`dataAttrs:data-listPath\`, \`dataAttrs:data-targetPath\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `code/svnDiff.scala.html` | P5 code/pr/review | included partial caller route; inspect Play route and React owner | \`ids:comment-@comment.id\`, \`ids:comment-button-template\`, \`ids:comment-icon-template\`, \`ids:linenum-column-template\`, \`ids:minimap\`, \`ids:toggle-comments\`, \`dataAttrs:data-activate\`, \`dataAttrs:data-commit-origin\`, \`dataAttrs:data-name\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `git/create.scala.html` | P5 code/pr/review | /:owner/:projectName/newPullRequestForm | \`dataAttrs:data-placeholder\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `git/edit.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | \`dataAttrs:data-is-user-has-typed\`, \`dataAttrs:data-placeholder\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `git/fork.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | \`ids:inputName\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `git/partial_forklist.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | \`ids:forks\` | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P1 | V2 missing-anchor rendered audit | `git/partial_list.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | \`dataAttrs:data-html\`, \`dataAttrs:data-title\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `git/partial_pull_request_event.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | \`ids:comment-@event.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `git/partial_search.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | \`ids:@contributor.loginId\`, \`dataAttrs:data-avatar-url\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `partial_comment_thread.scala.html` | P5 code/pr/review | included PR/diff partial; verify through PR/review routes | \`ids:comment-@comment.id\`, \`ids:thread-@thread.id\`, \`dataAttrs:data-range-endColumn\`, \`dataAttrs:data-range-endLine\`, \`dataAttrs:data-range-endSide\`, \`dataAttrs:data-range-startColumn\`, \`dataAttrs:data-range-startLine\`, \`dataAttrs:data-range-startSide\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `partial_diff_comment_on_line.scala.html` | P5 code/pr/review | included PR/diff partial; verify through PR/review routes | \`ids:@threads(0).commitId\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `partial_filediff.scala.html` | P5 code/pr/review | included PR/diff partial; verify through PR/review routes | \`ids:@getFileHeadId(diff)\`, \`dataAttrs:data-commit-a\`, \`dataAttrs:data-commit-b\`, \`dataAttrs:data-hashcode\`, \`dataAttrs:data-path-a\`, \`dataAttrs:data-path-b\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `common/select2.scala.html` | P6 directory/workspace | included partial; verify through each caller route | \`ids:tplSelect2FormatIssues\`, \`ids:tplSelect2FormatMilestone\`, \`ids:tplSelect2FormatUser\`, \`ids:tplSelect2Projects\`, \`ids:tplSelect2ProjectsWithoutAvatar\` | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P1 | V2 missing-anchor rendered audit | `organization/create.scala.html` | P6 directory/workspace | /organizations/new | \`dataAttrs:data-errType\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `organization/group_board_list.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | \`ids:option_form\`, \`dataAttrs:data-format\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `organization/group_issue_list_partial.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | \`ids:@label.id\`, \`ids:issue-item-@issue.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `organization/group_issue_list_quicksearch.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | \`ids:@UserApp.currentUser.id\`, \`ids:@param.milestoneId\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `organization/members.scala.html` | P6 directory/workspace | /organizations/:organizationName/members | \`names:roleof-@member.user.loginId\`, \`dataAttrs:data-loginId\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `user/edit_notifications.scala.html` | P6 directory/workspace | /user/editform/* or /me/settings/* | \`ids:@project.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `user/partial_issues.scala.html` | P6 directory/workspace | included partial caller route; inspect Play route and React owner | \`ids:@label.id\`, \`ids:issue-item-@issue.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `user/partial_projectlist.scala.html` | P6 directory/workspace | included partial caller route; inspect Play route and React owner | \`dataAttrs:data-projectName\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `migration/migrationPageLayout.scala.html` | P7 site-admin/security | /migration | \`names:viewport\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `site/partial_pagination.scala.html` | P7 site-admin/security | /sites/:pageName | \`ids:@divId\` | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P1 | V2 missing-anchor rendered audit | `site/partial_paginationForUserList.scala.html` | P7 site-admin/security | /sites/:pageName | \`ids:@divId\` | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P1 | V2 missing-anchor rendered audit | `site/projectList.scala.html` | P7 site-admin/security | /sites/:pageName | \`names:@project.owner/@project.name\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `site/userList.scala.html` | P7 site-admin/security | /sites/:pageName | \`ids:@user.loginId\`, \`ids:dismissable-alerts\`, \`ids:dismissable-alerts-request\`, \`names:@user.name\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `common/attachmentFile.scala.html` | shared partials | included partial; verify through each caller route | \`ids:@file.get(\`, \`names:@file.get(\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `common/commentUpdateForm.scala.html` | shared partials | included partial; verify through each caller route | \`ids:@comment.id\`, \`ids:comment-editform-@comment.id\`, \`ids:upload-@comment.id\`, \`dataAttrs:data-resourceId\`, \`dataAttrs:data-resourceType\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `common/editor.scala.html` | shared partials | included partial; verify through each caller route | \`ids:edit-@wrapId\`, \`ids:editor-@textareaName-@wrapId\`, \`ids:preview-@wrapId\`, \`names:@textareaName\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks; comment/editor/upload interaction state |
| P1 | V2 missing-anchor rendered audit | `common/issueLabelColor.scala.html` | shared partials | included partial; verify through each caller route | \`ids:@label.id\` | legacy template + included partials; rendered React DOM selectors/classes/copy; data-* interaction hooks |
| P1 | V2 missing-anchor rendered audit | `common/uploadForm.scala.html` | shared partials | included partial; verify through each caller route | \`ids:@formId\`, \`ids:@resourceId\` | legacy template + included partials; rendered React DOM selectors/classes/copy; form field names and TanStack mutation submit boundary; data-* interaction hooks; comment/editor/upload interaction state |
| P2 | V1 manual layout/behavior audit | `common/uservoice.scala.html` | P0 global shell | included partial; verify through each caller route | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P2 | V2 missing-anchor rendered audit | `error/requestTextEntityTooLarge.scala.html` | P1 auth/public/home/help | error route state | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P2 | V2 missing-anchor rendered audit | `git/clone.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P2 | V2 missing-anchor rendered audit | `partial_diff.scala.html` | P5 code/pr/review | included PR/diff partial; verify through PR/review routes | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P2 | V2 missing-anchor rendered audit | `common/notificationMail.scala.html` | P6 directory/workspace | included partial; verify through each caller route | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P2 | V1 manual layout/behavior audit | `common/calendar.scala.html` | shared partials | included partial; verify through each caller route | - | legacy template + included partials; rendered React DOM selectors/classes/copy |
| P2 | V1 manual layout/behavior audit | `common/markdown.scala.html` | shared partials | included partial; verify through each caller route | - | legacy template + included partials; rendered React DOM selectors/classes/copy |

## P3 Confirmation Queue

These rows have high static anchor overlap, but they are not closed. Rendered browser checks still need to prove visible copy, layout, conditional states, form behavior, and route/API boundaries.

| legacy template | packet | rendered route/caller hint | owner files |
| --- | --- | --- | ---: |
| `common/footer.scala.html` | P0 global shell | included partial; verify through each caller route | 5 |
| `common/loginDialog.scala.html` | P0 global shell | included partial; verify through each caller route | 5 |
| `common/usermenu_tab_content_list.scala.html` | P0 global shell | included partial; verify through each caller route | 5 |
| `common/usermenu.scala.html` | P0 global shell | included partial; verify through each caller route | 5 |
| `partial_update_notification.scala.html` | P0 global shell | included PR/diff partial; verify through PR/review routes | 1 |
| `sidebar.scala.html` | P0 global shell | root SPA sidebar surface | 5 |
| `error/badrequest_default.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `error/badrequest.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `error/forbidden_default.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `error/forbidden_organization.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `error/forbidden.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `error/internalServerError_default.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `error/notfound_default.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `error/notfound.scala.html` | P1 auth/public/home/help | error route state | 21 |
| `help/toc.scala.html` | P1 auth/public/home/help | /-/help or /-/UIKit | 21 |
| `index/partial_intro.scala.html` | P1 auth/public/home/help | / and directory/workspace routes | 21 |
| `site/lostPassword.scala.html` | P1 auth/public/home/help | /sites/:pageName | 21 |
| `user/login.scala.html` | P1 auth/public/home/help | /login or /users/loginform | 21 |
| `user/resetPassword.scala.html` | P1 auth/public/home/help | /resetPassword or /reset-password | 21 |
| `user/signup.scala.html` | P1 auth/public/home/help | /register or /users/signupform | 21 |
| `user/verified.scala.html` | P1 auth/public/home/help | included partial caller route; inspect Play route and React owner | 21 |
| `project/change_vcs.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/delete.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/home.scala.html` | P2 project | /:owner/:projectName | 57 |
| `project/issuelabels.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/list.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_dashboard_issuesbyassignee.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_dashboard_issuesbymilestone.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_dashboard_pullrequests.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_dashboard.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_history.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_issuelabels_editcategory.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_issuelabels_editlabel.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_readme.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/partial_settingmenu.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/statistics.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/transfer.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/watchers.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `project/webhooks.scala.html` | P2 project | /:owner/:projectName/webhooks | 57 |
| `projectMenu.scala.html` | P2 project | included partial caller route; inspect Play route and React owner | 57 |
| `issue/list.scala.html` | P3 issue | /:owner/:projectName/issues | 13 |
| `issue/my_list.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/my_partial_search.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/partial_comments.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/partial_index_comments.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/partial_list_subtask.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/partial_list_wrap.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/partial_view_childIssueList.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/partial_view_childIssueListOnly.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `issue/partial_voters.scala.html` | P3 issue | included partial caller route; inspect Play route and React owner | 13 |
| `board/create.scala.html` | P4 board/milestone | /:owner/:projectName/postform | 13 |
| `board/edit.scala.html` | P4 board/milestone | /:owner/:projectName/post/:postNumber/editform | 13 |
| `board/list.scala.html` | P4 board/milestone | /:owner/:projectName/posts | 13 |
| `milestone/create.scala.html` | P4 board/milestone | /:owner/:projectName/newMilestoneForm | 13 |
| `milestone/partial_status.scala.html` | P4 board/milestone | included partial caller route; inspect Play route and React owner | 13 |
| `milestone/view.scala.html` | P4 board/milestone | /:owner/:projectName/milestone/:milestoneId | 13 |
| `code/branches.scala.html` | P5 code/pr/review | /:owner/:projectName/branches | 30 |
| `code/compare.scala.html` | P5 code/pr/review | /:owner/:projectName/compare/:revisionRange | 30 |
| `code/diff.scala.html` | P5 code/pr/review | /:owner/:projectName/commit/:commitId | 30 |
| `code/nohead_svn.scala.html` | P5 code/pr/review | included partial caller route; inspect Play route and React owner | 30 |
| `code/nohead.scala.html` | P5 code/pr/review | included partial caller route; inspect Play route and React owner | 30 |
| `code/partial_branchrow.scala.html` | P5 code/pr/review | included partial caller route; inspect Play route and React owner | 30 |
| `code/view.scala.html` | P5 code/pr/review | /:owner/:projectName/code/:branch/* | 30 |
| `git/list.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/partial_branch.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/partial_info.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/partial_merge_result.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/partial_recently_pushed_branches.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/partial_reviewlist.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/partial_state.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/view.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `git/viewChanges.scala.html` | P5 code/pr/review | /:owner/:projectName/pullRequest* | 30 |
| `partial_comment_form_on_thread.scala.html` | P5 code/pr/review | included PR/diff partial; verify through PR/review routes | 30 |
| `partial_diff_line.scala.html` | P5 code/pr/review | included PR/diff partial; verify through PR/review routes | 30 |
| `reviewthread/list.scala.html` | P5 code/pr/review | /:owner/:projectName/reviews | 30 |
| `reviewthread/partial_list.scala.html` | P5 code/pr/review | /:owner/:projectName/reviews | 30 |
| `common/mySeriesMenuTab.scala.html` | P6 directory/workspace | included partial; verify through each caller route | 39 |
| `organization/deleteForm.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/group_board_list_partial.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/group_issue_list.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/group_issue_search_partial.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/group_pullrequest_list_partial.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/group_pullrequest_list.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/header.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/list.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/menu.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/partial_settingmenu.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/setting.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `organization/view.scala.html` | P6 directory/workspace | /organizations/:organizationName/* | 39 |
| `search/partial_issue_comments.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_issues.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_milestones.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_post_comments.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_posts.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_projects.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_reviews.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_search.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `search/partial_users.scala.html` | P6 directory/workspace | /search or /:owner/:projectName/search | 39 |
| `user/edit_emails.scala.html` | P6 directory/workspace | /user/editform/* or /me/settings/* | 39 |
| `user/edit_password.scala.html` | P6 directory/workspace | /user/editform/* or /me/settings/* | 39 |
| `user/edit_token.scala.html` | P6 directory/workspace | /user/editform/* or /me/settings/* | 39 |
| `user/edit.scala.html` | P6 directory/workspace | /user/editform/* or /me/settings/* | 39 |
| `user/partial_edit_tabmenu.scala.html` | P6 directory/workspace | included partial caller route; inspect Play route and React owner | 39 |
| `user/partial_milestones.scala.html` | P6 directory/workspace | included partial caller route; inspect Play route and React owner | 39 |
| `user/partial_postings.scala.html` | P6 directory/workspace | included partial caller route; inspect Play route and React owner | 39 |
| `user/partial_pullRequests.scala.html` | P6 directory/workspace | included partial caller route; inspect Play route and React owner | 39 |
| `user/userFiles.scala.html` | P6 directory/workspace | /user/files | 39 |
| `user/view.scala.html` | P6 directory/workspace | /:user | 39 |
| `migration/home.scala.html` | P7 site-admin/security | /migration | 9 |
| `site/data.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `site/diagnostic.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `site/issueList.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `site/mail.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `site/massMail.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `site/postList.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `site/siteMngLayout.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `site/update.scala.html` | P7 site-admin/security | /sites/:pageName | 9 |
| `common/branchItem.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/child_commentForm.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/childComments.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/commentAndVoterPairDisplay.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/commentCount.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/commentDeleteModal.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/commentForm.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/commitMsg.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/debug.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/fileUploader.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/partial_history.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/reviewForm.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/sharerCount.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/showSubtasksCheckbox.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/tasklistBar.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/twoColumnModeCheckboxArea.scala.html` | shared partials | included partial; verify through each caller route | 10 |
| `common/voteCount.scala.html` | shared partials | included partial; verify through each caller route | 10 |

## Owner Expansion Rule

For each row above, expand owner files from `2026-06-28-static-react-owner-coverage.md` before editing. The owner map is generated, so it is a starting point only; the authoritative UI source remains the matching Scala template and partial include graph.

## Completion Rule

The exhaustive page rebuild audit is not complete while any row in this file lacks rendered evidence. Static string overlap, previous React tests, or previous packet reports are insufficient closure evidence under `docs/plans/2026-06-28-destructive-template-frontend-rebuild.md`.
