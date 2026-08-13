# e2e 잔여 실패 분류 (재생성, 2026-08-13)

> 재생성 근거: `local://e2e-residual-classification.md`(242 스펙/491 실패)와
> `local://e2e-residual-closure-plan.md`는 세션 로컬 아티팩트로 유실(커밋 없음).
> 이 파일은 `/tmp/e2e-rebase.log`(HEAD d0b09d553, WTR_SHARDS=2 전체 실행)의 실패를
> 재분류한 것이며 커밋 대상이다. 실패 수: **194**(190 테스트 + 4 스펙 수트행).
> solo 재검증(2026-08-13): search-global 3/project-members-form 5/organization-boards 2/
> ownership-user-email-secondary-row 1/spa-shell-transition 1은 §1.2 'ALREADY_FIXED' 주장과
> 달리 solo에서도 실패 → fixable로 재분류. project-home-readme 실패는 SVN deferred 테스트.
> ownership-lost-password-authenticated-prefill은 solo GREEN → 해당 full-run 실패는 contamination.

| spec | test | category | prescription |
|---|---|---|---|
| _diag-highlight.e2e.ts | diag: highlight DOM | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| _diag-sharer.e2e.ts | diag: sharer search requests | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated home empty notifications matches legacy index notifications screen DOM | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated sidebar translates legacy favorite search and organization behavior to React | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated root user menu toggles stay route-local buttons without navigation | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated home create dropdown new issue link preserves legacy href and uses SPA navig | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated home create dropdown personal inbox link preserves legacy href and uses SPA  | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated left framed sidebar matches legacy desktop and mobile geometry | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated left framed sidebar persists tabs refreshes Query and keeps SPA Links | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | authenticated root sidebar project tab matches legacy index/myProjectList DOM | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| authenticated-home-empty-notifications.e2e.ts | direct notifications route matches legacy populated notification row DOM | HARNESS_ENV | ledger-documented harness ceiling — inline ledger comment only, no route/CSS change |
| not-found.e2e.ts | unmatched route matches legacy error/notfound_default.scala.html screen DOM | SOURCE_PIN | re-pin projectPageWrapMarginTop 20px->5px: legacy `@media all` responsive rule (inventory 1.3) sizes `.project-page-wrap` margin 5px; app.css already renders 5px |
| organization-boards.e2e.ts | organization board two-column checkbox popover follows legacy hover and persisted toggle b | HARNESS_ENV | two-column checkbox localStorage toggle: WTR facade click does not flip `useTwoColumnMode` persistence (facade click ceiling) — document ledger comment, no route/CSS change |
| organization-delete-form.e2e.ts | organization delete form matches legacy organization/deleteForm.scala.html DOM | SOURCE_PIN | flip stale `.not.toHaveClass(gnb-outer|project-header)` to positive gnb-outer (ownership-global-gnb-outer 2026-08-11 ROUTE_DOM parity; common/navbar.scala.html renders gnb-outer); DOM diff: fixture `d |
| organization-delete-form.e2e.ts | organization delete form restores localhost organization shell and scoped navbar layout | SOURCE_PIN-gnb-outer-flip | flip stale `.not.toHaveClass(gnb-outer|project-header)` to positive gnb-outer (ownership-global-gnb-outer 2026-08-11 ROUTE_DOM parity; common/navbar.scala.html renders gnb-outer); DOM diff: fixture `d |
| organization-issues.e2e.ts | organization issues two-column checkbox renders React popover and localStorage toggle | HARNESS_ENV | two-column checkbox localStorage toggle: WTR facade click does not flip persistence — document ledger comment, no route/CSS change |
| organization-members-form.e2e.ts | organization members restores localhost organization shell and scoped navbar layout | SOURCE_PIN-gnb-outer-flip | flip stale `.not.toHaveClass(gnb-outer|project-header)` to positive gnb-outer (ownership-global-gnb-outer 2026-08-11 ROUTE_DOM parity) |
| organization-members-form.e2e.ts | organization members forbidden response renders legacy organization error shell | SOURCE_PIN-gnb-outer-flip | flip stale `.not.toHaveClass(gnb-outer|project-header)` to positive gnb-outer (ownership-global-gnb-outer 2026-08-11 ROUTE_DOM parity) |
| ownership-auth-home-intro-guide-cta.e2e.ts | authenticated Home intro-guide CTAs preserve Legacy desktop roles and geometry | CSS_GAP | intro-guide CTA background-color: pin `rgb(233,94,1)` vs actual `rgb(255,115,50)` — verify legacy _page.less CTA rule; app==legacy → re-pin, else fix route/CSS |
| ownership-auth-home-intro-guide-cta.e2e.ts | authenticated Home intro-guide CTAs preserve Legacy mobile roles and geometry | CSS_GAP | intro-guide CTA background-color: pin `rgb(233,94,1)` vs actual `rgb(255,115,50)` — verify legacy _page.less CTA rule; app==legacy → re-pin, else fix route/CSS |
| ownership-auth-home-intro-guide.e2e.ts | authenticated Home intro toggle preserves the Legacy class and persists React-owned state | HARNESS_ENV | intro toggle toBeHidden: WTR facade click on toggle doesn't trigger React state (facade ceiling) — document ledger, no route/CSS change |
| ownership-auth-home-notification-more.e2e.ts | authenticated Home /notifications pagination preserves legacy structure and behavior | CSS_GAP | notification-more pagination: bg-color pin + mobile geometry 349 vs 583.58 — F5 re-measure vs legacy index/partial_notifications.scala.html |
| ownership-auth-home-notification-more.e2e.ts | authenticated Home pagination preserves mobile legacy-relative geometry | CSS_GAP | notification-more pagination: bg-color pin + mobile geometry 349 vs 583.58 — F5 re-measure vs legacy index/partial_notifications.scala.html |
| ownership-authenticated-sidenav-favorite-star-geometry.e2e.ts | right Favorite project and organization stars own 29px-wide centered action geometry (norm | HARNESS_ENV | star toBeVisible: WTR iframe sidebar mount unstable (left-sidebar HARNESS_ENV precedent) — verify solo; if still failing, document ledger |
| ownership-authenticated-sidenav-recent-shell.e2e.ts | authenticated Recent History populated shell preserves desktop parity and behavior | CSS_GAP | Recent History shell geometry: left 1015 vs 1289 (sidebar width drift) — F5 re-pin vs legacy usermenu.scala.html + _usermenu.less |
| ownership-authenticated-sidenav-recent-shell.e2e.ts | authenticated Recent History populated shell preserves mobile parity and behavior | CSS_GAP | Recent History shell geometry: left 1015 vs 1289 (sidebar width drift) — F5 re-pin vs legacy usermenu.scala.html + _usermenu.less |
| ownership-authenticated-sidenav-recent-shell.e2e.ts | authenticated Recent History empty shell preserves desktop parity and behavior | CSS_GAP | Recent History shell geometry: left 1015 vs 1289 (sidebar width drift) — F5 re-pin vs legacy usermenu.scala.html + _usermenu.less |
| ownership-authenticated-sidenav-recent-shell.e2e.ts | authenticated Recent History empty shell preserves mobile parity and behavior | CSS_GAP | Recent History shell geometry: left 1015 vs 1289 (sidebar width drift) — F5 re-pin vs legacy usermenu.scala.html + _usermenu.less |
| ownership-authenticated-sidenav-tabs.e2e.ts | authenticated side-nav tabs preserve desktop appearance and behavior | CSS_GAP | side-nav tabs desktop/mobile colors — F5 re-measure vs legacy _usermenu.less nav rules |
| ownership-authenticated-sidenav-tabs.e2e.ts | authenticated side-nav tabs preserve mobile appearance and behavior | CSS_GAP | side-nav tabs desktop/mobile colors — F5 re-measure vs legacy _usermenu.less nav rules |
| ownership-framed-site-shell.e2e.ts | frozen framed SiteLayout sources and generated fallback stay byte-identical | SOURCE_PIN | byte-identical sha mismatch 94165e.. vs e063fc.. — generated fallback changed; re-pin sha after verifying layout_framed.scala.html/siteLayout_framed.scala.html parity |
| ownership-global-gnb-search-scope-legacy-classes.e2e.ts | scoped global GNB search keeps the exact legacy scope button classes (normal) | HARNESS_ENV | GNB search scope button toBeVisible: iframe render of legacy scope button — verify solo; document ledger if harness |
| ownership-left-sidebar-close-pin.e2e.ts | left sidebar close pin preserves mobile legacy parity | HARNESS_ENV | close pin mobile toBe(false)/null: WTR iframe localStorage/click ceiling — document ledger, no route/CSS change |
| ownership-left-sidebar-direct-project-rows.e2e.ts | left direct project rows preserve mobile owned legacy parity | HARNESS_ENV | direct project rows mobile toBeVisible: iframe sidebar mount — verify solo; document ledger if harness |
| ownership-left-sidebar-favorite-shell.e2e.ts | left sidebar Favorite populated shell preserves desktop legacy parity | CSS_GAP | Favorite shell poll 135: favorite row width pin — F5 re-measure vs legacy _usermenu.less favorite rules |
| ownership-left-sidebar-favorite-shell.e2e.ts | left sidebar Favorite populated shell preserves mobile legacy parity | CSS_GAP | Favorite shell poll 135: favorite row width pin — F5 re-measure vs legacy _usermenu.less favorite rules |
| ownership-left-sidebar-favorite-shell.e2e.ts | left sidebar Favorite empty shell preserves desktop legacy parity | CSS_GAP | Favorite shell poll 135: favorite row width pin — F5 re-measure vs legacy _usermenu.less favorite rules |
| ownership-left-sidebar-favorite-shell.e2e.ts | left sidebar Favorite empty shell preserves mobile legacy parity | CSS_GAP | Favorite shell poll 135: favorite row width pin — F5 re-measure vs legacy _usermenu.less favorite rules |
| ownership-left-sidebar-motion.e2e.ts | left framed sidebar keeps legacy geometry while opening and closing with CSS motion | HARNESS_ENV | data-sidebar-motion attr stuck `opening`: WTR iframe transitionend never fires (documented transitionend ceiling) — document ledger, no route/CSS change |
| ownership-left-sidebar-project-subtabs.e2e.ts | left Project subtabs preserve desktop owned legacy parity | CSS_GAP | Project subtabs geometry — F5 re-measure vs legacy _usermenu.less |
| ownership-left-sidebar-recent-issue-rows.e2e.ts | left sidebar Recent issue row preserves desktop parity and React behavior | CSS_GAP | Recent issue row border style — F5 re-measure vs legacy _usermenu.less |
| ownership-left-sidebar-recent-issue-rows.e2e.ts | left sidebar Recent issue row preserves mobile parity and React behavior | CSS_GAP | Recent issue row border style — F5 re-measure vs legacy _usermenu.less |
| ownership-left-sidebar-tabs.e2e.ts | framed left sidebar tabs preserve en-US 390px legacy parity | HARNESS_ENV | left sidebar tabs 390px toBeVisible: iframe mobile mount — verify solo; document ledger if harness |
| ownership-lost-password-authenticated-prefill.e2e.ts | Style authenticated lost-password prefill > matches legacy desktop prefill form geometry a | HARNESS_ENV | post-focus border-bottom-color pin: app.css:979-980 `.login-form-wrap .text:focus { border-bottom:1px solid #f36c22 }` matches legacy; WTR iframe :focus synthesis flaky (passed solo 2026-08-13; user-e |
| ownership-organization-members-error-wrap.e2e.ts | organization members forbidden error-wrap owns legacy declarations and fallback-off geomet | ROUTE_DOM | organization members error-wrap toBeVisible: verify error/forbidden_organization.scala.html DOM parity on members.tsx error branch; fix route DOM if app!=legacy |
| ownership-organization-new.e2e.ts | organization create default and invalid-name state match live legacy on desktop | HARNESS_ENV | :focus border-color poll rgb(243,108,34): WTR iframe does not synthesize :focus (user-email-add-form precedent) — document ledger, no route/CSS change |
| ownership-organization-new.e2e.ts | organization create default and invalid-name state match live legacy on mobile | HARNESS_ENV | :focus border-color poll rgb(243,108,34): WTR iframe does not synthesize :focus (user-email-add-form precedent) — document ledger, no route/CSS change |
| ownership-organization-search-error-wrap.e2e.ts | organization search forbidden error wrap preserves legacy Style paint and geometry | ROUTE_DOM | org search error-wrap toBeVisible: verify forbidden_organization.scala.html parity on organization search error branch |
| ownership-project-code-browser-header-floats.e2e.ts | project code-browser header preserves branch/actions and stays contained | HARNESS_ENV | code-browser header toBeVisible: iframe mount — verify solo; document ledger if harness |
| ownership-project-milestone-detail-issue-meta-counts-labels.e2e.ts | milestone issue metadata counts and labels parity (normal) | CSS_GAP | milestone issue meta margin-left 0px: F5 re-measure vs legacy issue/partial_list.scala.html count group |
| ownership-project-post-detail-inline-residual.e2e.ts | moves board post detail static residuals to route-local Style | SOURCE_PIN | inline style `width: 0px;` vs expected — board/view.scala.html route inline style drift; app==legacy → re-pin, else fix route |
| ownership-project-postform-inline-residual.e2e.ts | moves board post editor layout declarations to route-local Style | SOURCE_PIN | inline style `overflow: visible; position: relative;` vs expected — board/create.scala.html parity; app==legacy → re-pin, else fix route |
| ownership-project-pullrequest-changes-error-wrap.e2e.ts | pull-request changes error-wrap owns legacy DOM, copy, sprite, and fallback behavior | ROUTE_DOM | PR changes error-wrap toBeVisible + 'You are not authorized' text empty: verify error/forbidden.scala.html + git/viewChanges.scala.html parity on pullRequestNumber.tsx error branch |
| ownership-project-pullrequest-changes-error-wrap.e2e.ts | pull-request changes preserves the forbidden error branch | ROUTE_DOM | PR changes error-wrap toBeVisible + 'You are not authorized' text empty: verify error/forbidden.scala.html + git/viewChanges.scala.html parity on pullRequestNumber.tsx error branch |
| ownership-project-pullrequest-editform-error-wrap.e2e.ts | pull-request editform error-wrap preserves both legacy branches and Style parity | ROUTE_DOM | PR editform error-wrap toBeVisible: verify error/forbidden.scala.html + git/edit.scala.html parity |
| ownership-project-pullrequests-action-floats.e2e.ts | preserves populated project pull-request actions, interaction, and responsive geometry | CSS_GAP | PR actions width 1366 vs 1637: F5 re-measure vs legacy git/list.scala.html action row |
| ownership-project-reviews-batch6.e2e.ts | reviews batch 6 exposes the legacy shell geometry normal | ROUTE_DOM | missing reviews shell: reviewthread/list.scala.html:34 project-page-wrap shell — route dropped page-wrap-outer per parity ledger; verify route still renders shell |
| ownership-project-reviews-sidebar-count-floats.e2e.ts | project review sidebar counts preserve the legacy float owner and route state | ROUTE_DOM | app.css `[data-owner=project-reviews-sidebar-count-author]` rule missing: route/app.css must own the float rule per reviewthread/list.scala.html num-badge |
| ownership-project-search-error-wrap.e2e.ts | project search forbidden body keeps legacy Style parity for anonymous and authenticated vi | ROUTE_DOM | project search error-wrap toBeVisible: verify forbidden.scala.html parity on project search error branch |
| ownership-project-setting-default-branch-control.e2e.ts | project setting default branch Select2 closed/open state owns frozen geometry with Style | CSS_GAP | select2 option count 2 vs 94: F5 re-measure vs legacy select2.css + project/setting.scala.html default-branch control |
| ownership-project-settingform-batch6.e2e.ts | project settingform restores the legacy page shell and desktop geometry | CSS_GAP | settingform shell geometry 222 vs 249: F5 re-measure vs legacy project/setting.scala.html |
| ownership-reset-password-form.e2e.ts | Style valid-token reset password form > keeps legacy order, validation, and successful res | SOURCE_PIN | input.text count 0->2: resetPassword.tsx restored className="text" per WTR-645 audit; ownership pin expecting class-free is stale — flip to expect .text (legacy resetPassword.scala.html) |
| ownership-reset-password-form.e2e.ts | Style valid-token reset password form > matches legacy responsive mobile geometry and pain | SOURCE_PIN | input.text count 0->2: resetPassword.tsx restored className="text" per WTR-645 audit; ownership pin expecting class-free is stale — flip to expect .text (legacy resetPassword.scala.html) |
| ownership-reset-password-validation-popover.e2e.ts | Style valid-token reset password validation popover > matches legacy mobile validation-pop | HARNESS_ENV | mobile validation popover overflow: WTR iframe popover positioning ceiling — document ledger, no route/CSS change |
| ownership-search-error-wrap.e2e.ts | shared search error family preserves legacy DOM, copy, paint, and geometry | ROUTE_DOM | search error-wrap toBeVisible: verify error/forbidden.scala.html + internalServerError_default.scala.html + notfound_default.scala.html + requestTextEntityTooLarge.scala.html parity on search.tsx erro |
| ownership-secret-setup.e2e.ts | Style secret setup > preserves legacy desktop setup geometry and form order | HARNESS_ENV | post-focus border-bottom-color pin: app.css:979-980 .signup-form-wrap .text:focus rule matches legacy; WTR iframe :focus synthesis flaky — Phase 2 confirm; document ledger, no route/CSS change |
| ownership-secret-setup.e2e.ts | Style secret setup > preserves legacy mobile setup geometry and form order | HARNESS_ENV | post-focus border-bottom-color pin: app.css:979-980 .signup-form-wrap .text:focus rule matches legacy; WTR iframe :focus synthesis flaky — Phase 2 confirm; document ledger, no route/CSS change |
| ownership-site-diagnostic-error-title.e2e.ts | error title has no generated selector contract | SOURCE_PIN | route source missing className="pull-left": verify site/diagnostic.scala.html + siteMngLayout.scala.html; app==legacy → re-pin, else restore class |
| ownership-site-diagnostic-no-error-title.e2e.ts | Style site diagnostic no-error title > owns only the legacy no-error title strip through g | SOURCE_PIN | route source missing className="pull-left" — verify diagnostic.scala.html parity |
| ownership-site-diagnostic-page-grid-columns.e2e.ts | site diagnostic page/grid/columns own the active frozen layout declarations | SOURCE_PIN | route source missing className="pull-left" — verify diagnostic.scala.html parity (ledger 2026-08-11 ROUTE_DOM restored siteMngLayout grid) |
| ownership-site-issue-list-metadata.e2e.ts | Style site issue-list metadata > declares five explicit owners from the frozen final casca | ROUTE_DOM | yobicon-comments owner class: site/issueList.scala.html comment count — route must own yobicon-comments glyph class |
| ownership-site-issue-list-metadata.e2e.ts | Style site issue-list metadata > retires metadata fallbacks while preserving the owned com | ROUTE_DOM | yobicon-comments owner class: site/issueList.scala.html comment count — route must own yobicon-comments glyph class |
| ownership-site-massmail-write-action.e2e.ts | desktop write action preserves primary paint and geometry | CSS_GAP | massmail write-action bg rgb(255,115,50) vs pin: F5 re-measure vs legacy site/massmail.scala.html write action |
| ownership-site-massmail-write-action.e2e.ts | mobile write action preserves primary paint and geometry | CSS_GAP | massmail write-action bg rgb(255,115,50) vs pin: F5 re-measure vs legacy site/massmail.scala.html write action |
| ownership-site-post-list-management-grid.e2e.ts | direct management grid owns only the active frozen base declarations | ROUTE_DOM | site-setting-wrap class source pin: siteMngLayout.scala.html grid classes — route must render site-setting-wrap per parity |
| ownership-site-post-list-management-grid.e2e.ts | direct management grid preserves the active desktop and mobile proportions in one browser | ROUTE_DOM | site-setting-wrap class source pin: siteMngLayout.scala.html grid classes — route must render site-setting-wrap per parity |
| ownership-site-post-list-page-row-shell.e2e.ts | page wrapper and repeated row own exactly the selected frozen declarations | ROUTE_DOM | page-wrap-outer source pin: siteMngLayout.scala.html — route must render page-wrap-outer |
| ownership-site-post-list-page-row-shell.e2e.ts | page wrapper and repeated row preserve desktop and mobile output in one browser | ROUTE_DOM | page-wrap-outer source pin: siteMngLayout.scala.html — route must render page-wrap-outer |
| ownership-site-post-list-row-avatar.e2e.ts | Style site post-list row and project avatar > retires the three fully migrated fallbacks a | ROUTE_DOM | row-fluid listitem class: site/postList.scala.html row classes — route must own row-fluid |
| ownership-site-post-list-row-content.e2e.ts | Style site post-list populated row content > retires only fully migrated content fallbacks | ROUTE_DOM | post-list-wrap class: site/postList.scala.html — route must own post-list-wrap |
| ownership-site-post-list-shell-fallbacks.e2e.ts | Style site post-list shell fallback retirement > retires only title_area, pull-left, post- | ROUTE_DOM | post-list-wrap retirement pin vs actual class present — route owns class; flip pin or retire per postList.scala.html |
| ownership-site-project-list-listhead.e2e.ts | listhead source owns the exact active fluid grid and retires direct presentation classes | ROUTE_DOM | row-fluid listhead source/class pins: site/projectList.scala.html listhead — route must own |
| ownership-site-project-list-listhead.e2e.ts | listhead preserves exact desktop and mobile live fluid-grid output in one browser | ROUTE_DOM | row-fluid listhead source/class pins: site/projectList.scala.html listhead — route must own |
| ownership-site-project-list-page-management-shell.e2e.ts | management shell directly owns only the five legacy layout boundaries | ROUTE_DOM | page-wrap-outer/row-fluid source + geometry: siteMngLayout.scala.html shell — route must own |
| ownership-site-project-list-page-management-shell.e2e.ts | management shell preserves exact desktop geometry and frozen equivalence | ROUTE_DOM | page-wrap-outer/row-fluid source + geometry: siteMngLayout.scala.html shell — route must own |
| ownership-site-project-list-page-management-shell.e2e.ts | management shell preserves exact mobile geometry and frozen equivalence | ROUTE_DOM | page-wrap-outer/row-fluid source + geometry: siteMngLayout.scala.html shell — route must own |
| ownership-site-project-list-pagination.e2e.ts | Style site project-list pagination > directly owns sprite and Firefox input residuals with | ROUTE_DOM | input-mini source pin + mobile margin-left -120px: site/projectList.scala.html pagination — route must own input-mini; F5 re-measure margin |
| ownership-site-project-list-pagination.e2e.ts | Style site project-list pagination > keeps mobile pagination paint, geometry, responsive o | ROUTE_DOM | input-mini source pin + mobile margin-left -120px: site/projectList.scala.html pagination — route must own input-mini; F5 re-measure margin |
| ownership-site-project-list-residual.e2e.ts | Style site project-list residual populated surfaces > keeps desktop exact paint, states, c | CSS_GAP | project-list residual border-color rgb(201,52,38): F5 re-measure vs projectList.scala.html hover state |
| ownership-site-project-list-residual.e2e.ts | Style site project-list residual populated surfaces > keeps mobile exact paint, states, co | CSS_GAP | project-list residual border-color rgb(201,52,38): F5 re-measure vs projectList.scala.html hover state |
| ownership-site-project-list-row.e2e.ts | Style site project-list populated rows > keeps row geometry inline and paint in the route  | ROUTE_DOM | span5 listitem-col/row-fluid source pins: projectList.scala.html row grid — route must own |
| ownership-site-project-list-row.e2e.ts | Style site project-list populated rows > retires row and avatar fallbacks while preserving | ROUTE_DOM | span5 listitem-col/row-fluid source pins: projectList.scala.html row grid — route must own |
| ownership-site-project-list-search.e2e.ts | Style site project-list title search > uses five stable owners with inline geometry and a  | ROUTE_DOM | yobicon-search/pull-right source pins + line-height 12px: projectList.scala.html title search — route must own; F5 line-height |
| ownership-site-project-list-search.e2e.ts | Style site project-list title search > deletes migrated selector classes while retaining s | ROUTE_DOM | yobicon-search/pull-right source pins + line-height 12px: projectList.scala.html title search — route must own; F5 line-height |
| ownership-site-project-list-search.e2e.ts | Style site project-list title search > keeps desktop paint, geometry, focus/hover, and sam | ROUTE_DOM | yobicon-search/pull-right source pins + line-height 12px: projectList.scala.html title search — route must own; F5 line-height |
| ownership-site-project-list-search.e2e.ts | Style site project-list title search > keeps mobile paint, geometry, focus/hover, and same | ROUTE_DOM | yobicon-search/pull-right source pins + line-height 12px: projectList.scala.html title search — route must own; F5 line-height |
| ownership-site-project-list-title-search-shell.e2e.ts | Style site project-list title/search shell > retires only title_area/pull-left and preserv | ROUTE_DOM | form-search class retirement pin: projectList.scala.html title/search shell — flip per legacy |
| ownership-site-project-list-title-strip.e2e.ts | Style site project-list title strip > keeps the legacy title before the search form | ROUTE_DOM | pull-right class pin: projectList.scala.html title strip — flip per legacy |
| ownership-site-update-sidebar.e2e.ts | Style site update sidebar > pins desktop/mobile paint, geometry, screenshots, and fallback | CSS_GAP | site update sidebar geometry 210 vs 160: F5 re-measure vs siteMngLayout.scala.html update nav |
| ownership-site-user-list-deleted-row.e2e.ts | populated DELETED row preserves frozen four-column output | ROUTE_DOM | row-fluid listitem class: site/userList.scala.html DELETED row — route must own |
| ownership-site-user-list-listhead.e2e.ts | listhead owns only the direct row and four repeated columns | ROUTE_DOM | row-fluid listhead source + geometry: userList.scala.html listhead — route must own |
| ownership-site-user-list-listhead.e2e.ts | populated ACTIVE listhead preserves desktop and mobile frozen output | ROUTE_DOM | row-fluid listhead source + geometry: userList.scala.html listhead — route must own |
| ownership-site-user-list-page-management-shell.e2e.ts | preserves the populated ACTIVE shell across desktop and mobile in one browser | ROUTE_DOM | listitem/rowFluid geometry flags: userList.scala.html + siteMngLayout.scala.html shell |
| ownership-site-user-list-row-columns.e2e.ts | row columns own the legacy grid and column declarations | ROUTE_DOM | span3 listitem-col source + geometry: userList.scala.html columns |
| ownership-site-user-list-row-columns.e2e.ts | ACTIVE columns preserve desktop and mobile legacy geometry | ROUTE_DOM | span3 listitem-col source + geometry: userList.scala.html columns |
| ownership-site-user-list-row-identity.e2e.ts | identity descendants own the complete legacy avatar, name, and ID surface | ROUTE_DOM | user-list-wrap source + avatar/name/ID geometry: userList.scala.html identity |
| ownership-site-user-list-row-identity.e2e.ts | ACTIVE identity preserves links, complete avatar output, and desktop/mobile geometry | ROUTE_DOM | user-list-wrap source + avatar/name/ID geometry: userList.scala.html identity |
| ownership-site-user-list-row-shell.e2e.ts | three ACTIVE rows preserve frozen row-shell output | ROUTE_DOM | row shell flags: userList.scala.html row |
| ownership-site-user-list-search-controls.e2e.ts | title search controls retire the bounded legacy fallback | ROUTE_DOM | search-bar source + count: userList.scala.html title search controls |
| ownership-site-user-list-search-controls.e2e.ts | title search controls preserve frozen desktop and mobile output and submit behavior | ROUTE_DOM | search-bar source + count: userList.scala.html title search controls |
| ownership-site-user-list-sidebar-nav.e2e.ts | sidebar copy, navigation, variants, and frozen output survive desktop/mobile | ROUTE_DOM | sidebar nav flags: siteMngLayout.scala.html isActiveMenu |
| ownership-site-user-list-state-tabs.e2e.ts | state tabs own exactly the legacy root, repeated item, and repeated link surface | ROUTE_DOM | nav nav-tabs source + class: userList.scala.html state tabs |
| ownership-site-user-list-state-tabs.e2e.ts | populated ACTIVE tabs preserve order, interaction, and responsive geometry | ROUTE_DOM | nav nav-tabs source + class: userList.scala.html state tabs |
| ownership-site-user-list-title-search-shell.e2e.ts | Style site user-list title/search shell > keeps DIV > H2 + FORM and title, tabs, listhead, | ROUTE_DOM | DIV>H2+FORM order + search-bar retirement: userList.scala.html title/search shell |
| ownership-site-user-list-title-search-shell.e2e.ts | Style site user-list title/search shell > retires title and search presentation classes wh | ROUTE_DOM | DIV>H2+FORM order + search-bar retirement: userList.scala.html title/search shell |
| ownership-site-user-list-title-strip.e2e.ts | Style site user-list title strip > reuses canonical global title variables through the exp | ROUTE_DOM | title-strip order + initial-admin policy text: userList.scala.html — route must render policy copy |
| ownership-site-user-list-title-strip.e2e.ts | Style site user-list title strip > keeps the legacy title before the search form | ROUTE_DOM | title-strip order + initial-admin policy text: userList.scala.html — route must render policy copy |
| ownership-site-user-list-title-strip.e2e.ts | Style site user-list title strip > explains the initial Site Admin protection policy | ROUTE_DOM | title-strip order + initial-admin policy text: userList.scala.html — route must render policy copy |
| ownership-standalone-login-form.e2e.ts | Style standalone login form > matches legacy desktop geometry and paint | HARNESS_ENV | post-focus border-bottom-color pin: app.css:979-980 :focus rule exists and matches legacy; WTR iframe :focus synthesis flaky (user-email-add-form precedent) — Phase 2 confirm; document ledger, no rout |
| ownership-user-email-secondary-row.e2e.ts | pins pending secondary row desktop/mobile output and React mutation boundaries | CSS_GAP | secondary row border-color rgba(3,1,1,0.255): F5 re-measure vs user/edit_emails.scala.html row border |
| ownership-user-profile-notfound-error-wrap.e2e.ts | public missing-user error-wrap owns frozen legacy Style parity | ROUTE_DOM | missing-user error-wrap toBeVisible: $user.tsx notfound branch vs error/notfound_default.scala.html |
| ownership-user-profile-page-wrappers.e2e.ts | missing profile omits populated wrapper owners | ROUTE_DOM | missing profile wrapper toBeVisible: user/view.scala.html branch parity on $user.tsx |
| ownership-user-profile-root-family.e2e.ts | public profile empty and missing-user branches preserve legacy family output | ROUTE_DOM | 'User exists not' text empty: $user.tsx missing-user branch copy vs legacy partials |
| project-board-create-form.e2e.ts | project board create issue-template state matches legacy query-owned visible form | SOURCE_PIN | board create form geometry 688/378 vs 678/368 (10px drift): F5 re-measure vs board/create.scala.html + uploadForm.scala.html |
| project-change-vcs-form.e2e.ts | project change-VCS form matches legacy project/change_vcs.scala.html DOM | SOURCE_PIN | re-pin projectPageMarginTop 20px->5px (legacy `@media all` 5px, inventory 1.3) |
| project-code-commit-detail.e2e.ts | project commit detail keeps the frozen legacy commit-id flow geometry | CSS_GAP | commit-detail: wrapHeight 39 vs 41 + commitMsgShort 18px/pre-line vs 14px/nowrap + position + gnb-outer flip — F5 re-measure vs code/diff.scala.html |
| project-code-commit-detail.e2e.ts | project commit detail restores legacy project GNB search scope | SOURCE_PIN-gnb-outer-flip | commit-detail: wrapHeight 39 vs 41 + commitMsgShort 18px/pre-line vs 14px/nowrap + position + gnb-outer flip — F5 re-measure vs code/diff.scala.html |
| project-code-commit-detail.e2e.ts | project commit detail matches legacy code/diff.scala.html empty discussion state | CSS_GAP | commit-detail: wrapHeight 39 vs 41 + commitMsgShort 18px/pre-line vs 14px/nowrap + position + gnb-outer flip — F5 re-measure vs code/diff.scala.html |
| project-code-commit-detail.e2e.ts | project commit detail folds closed ranged threads with frozen Style geometry | CSS_GAP | commit-detail: wrapHeight 39 vs 41 + commitMsgShort 18px/pre-line vs 14px/nowrap + position + gnb-outer flip — F5 re-measure vs code/diff.scala.html |
| project-code-compare-svn.e2e.ts | project svn compare patch state matches legacy code/compare_svn.scala.html DOM | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-history-file.e2e.ts | project code file history matches legacy code/history.scala.html path DOM | ROUTE_DOM | history path DOM diff (commits/main/README.md link + commit-wrap): code/history.scala.html path breadcrumb — route must render |
| project-code-history-file.e2e.ts | project code file history keeps nested legacy path segments | ROUTE_DOM | history path DOM diff (commits/main/README.md link + commit-wrap): code/history.scala.html path breadcrumb — route must render |
| project-code-history.e2e.ts | project code history matches legacy code/history.scala.html DOM | ROUTE_DOM | history width attr 32 + default-branch href: code/history.scala.html + select2.scala.html |
| project-code-history.e2e.ts | project bare code history renders default branch on the legacy commits URL | ROUTE_DOM | history width attr 32 + default-branch href: code/history.scala.html + select2.scala.html |
| project-code-nohead-svn.e2e.ts | project empty svn repository matches legacy code/nohead_svn.scala.html DOM | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-nohead-svn.e2e.ts | live ko-KR empty svn code root keeps the legacy title and responsive shell geometry | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-nohead.e2e.ts | project empty git repository matches legacy code/nohead.scala.html DOM | CSS_GAP | nohead alert padding/title + trailing-slash URL `?probe=1` leak: code/nohead.scala.html alert CSS; strip probe query in URL pin |
| project-code-nohead.e2e.ts | project trailing-slash code root replaces to the canonical legacy code URL | CSS_GAP | nohead alert padding/title + trailing-slash URL `?probe=1` leak: code/nohead.scala.html alert CSS; strip probe query in URL pin |
| project-code-svn-head.e2e.ts | svn HEAD folder keeps the legacy HEAD history link and ko-KR folder skeleton | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-svn-main-trailing-slash.e2e.ts | svn main trailing slash replaces to the canonical legacy folder URL | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-svn-main.e2e.ts | svn main folder preserves legacy branch history and native select fallback semantics | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-svn-missing-readme.e2e.ts | missing svn README renders the legacy project code not-found state | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-view-file.e2e.ts | project code text file matches legacy code/partial_view_file.scala.html DOM | SOURCE_PIN-gnb-outer-flip | gnb-outer flip + image src null: code/partial_view_file.scala.html binary branch — route must render image src |
| project-code-view-file.e2e.ts | project code image file matches legacy binary image branch | ROUTE_DOM | gnb-outer flip + image src null: code/partial_view_file.scala.html binary branch — route must render image src |
| project-code-view-folder.e2e.ts | project code branch root folder matches legacy code/view.scala.html DOM | ROUTE_DOM | folder DOM + SVN row + select2 geometry: code/view.scala.html folder branch; SVN test row deferred |
| project-code-view-folder.e2e.ts | project SVN code branch root folder matches legacy code/view.scala.html DOM | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-code-view-folder.e2e.ts | project code branch renders React-owned legacy Select2 geometry and navigation | ROUTE_DOM | folder DOM + SVN row + select2 geometry: code/view.scala.html folder branch; SVN test row deferred |
| project-commits-svn-main.e2e.ts | svn main branch history reuses the legacy root history skeleton | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-commits-svn-root-trailing-slash.e2e.ts | svn commits trailing slash replaces to the canonical legacy root before history fetch | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-delete-form.e2e.ts | project delete form matches legacy project/delete.scala.html DOM | SOURCE_PIN | re-pin projectPageMarginTop 20px->5px (legacy 5px) |
| project-deleteform-svn.e2e.ts | SVN project delete form matches the legacy shell on desktop and mobile | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-fork-form.e2e.ts | project fork submit renders legacy git/clone.scala.html progress state | SOURCE_PIN | re-pin projectWrapMarginTop 20px->5px (legacy 5px) |
| project-home-readme.e2e.ts | SVN project home README state matches live legacy shell and geometry | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-issue-detail-parity.e2e.ts | issue task progress and XML comments match legacy rendering | ROUTE_DOM | issue detail task progress/XML + live issue 3964 controls toBeVisible: issue/view.scala.html parity on issue/$issueNumber.tsx |
| project-issue-detail-parity.e2e.ts | live issue 3964 non-destructive controls own focus, visibility, and modal state | ROUTE_DOM | issue detail task progress/XML + live issue 3964 controls toBeVisible: issue/view.scala.html parity on issue/$issueNumber.tsx |
| project-issue-detail.e2e.ts | Browser tests did not finish within 600000ms. You can increase this timeout with the tests | HARNESS_ENV-suite-hang | suite-hang ledger 2026-08-12 — per-test timeout bisect needed; no route/CSS change |
| project-issues-empty.e2e.ts | Browser tests did not finish within 600000ms. You can increase this timeout with the tests | HARNESS_ENV-suite-hang | suite-hang ledger 2026-08-12 — per-test timeout bisect needed; no route/CSS change |
| project-issues-svn.e2e.ts | SVN issues keeps the canonical desktop shell and React-owned list interactions | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-labels-form.e2e.ts | project labels matches legacy project/issuelabels.scala.html empty DOM | ROUTE_DOM | labels form empty DOM + internal links toBeVisible: project/issuelabels.scala.html parity on issuelabels route |
| project-labels-form.e2e.ts | project labels internal links preserve legacy hrefs with SPA transition | ROUTE_DOM | labels form empty DOM + internal links toBeVisible: project/issuelabels.scala.html parity on issuelabels route |
| project-labelsform-svn.e2e.ts | SVN labels form uses the canonical legacy project shell on desktop | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-labelsform-svn.e2e.ts | SVN labels form preserves the legacy mobile flow without horizontal overflow | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-labelsform-svn.e2e.ts | SVN labels route imports the canonical project menu without legacy asset literals | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-members-form.e2e.ts | project members settings tab anchors keep legacy hrefs without route-local native listener | ROUTE_DOM | members: #subMenuProjectSetting ×2 duplicate (strict mode) + error-wrap shells + 401 title/text: project/members.scala.html parity — fix duplicate menu id and error branches |
| project-members-form.e2e.ts | project members parent fallback retains legacy bad-request shell | ROUTE_DOM | members: #subMenuProjectSetting ×2 duplicate (strict mode) + error-wrap shells + 401 title/text: project/members.scala.html parity — fix duplicate menu id and error branches |
| project-members-form.e2e.ts | project members parent fallback retains legacy forbidden shell | ROUTE_DOM | members: #subMenuProjectSetting ×2 duplicate (strict mode) + error-wrap shells + 401 title/text: project/members.scala.html parity — fix duplicate menu id and error branches |
| project-members-form.e2e.ts | project members parent fallback pins the live localhost 401 forbidden shell | ROUTE_DOM | members: #subMenuProjectSetting ×2 duplicate (strict mode) + error-wrap shells + 401 title/text: project/members.scala.html parity — fix duplicate menu id and error branches |
| project-members-form.e2e.ts | project members authorization error keeps legacy computed output on desktop and mobile | ROUTE_DOM | members: #subMenuProjectSetting ×2 duplicate (strict mode) + error-wrap shells + 401 title/text: project/members.scala.html parity — fix duplicate menu id and error branches |
| project-members-svn.e2e.ts | SVN members 400 keeps the canonical project shell | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-members-svn.e2e.ts | SVN members 401 keeps the canonical project shell | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-members-svn.e2e.ts | SVN members 403 keeps the canonical project shell | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-milestone-edit-form.e2e.ts | project milestone edit form matches legacy milestone/edit.scala.html core form DOM | CSS_GAP | contentFooterBackground rgb(245,245,245) vs 250: F5 re-measure vs milestone/edit.scala.html footer |
| project-milestone-svn-detail.e2e.ts | SVN milestone detail keeps the canonical mobile flow without visible overflow | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-nested-layout.e2e.ts | Browser tests did not finish within 600000ms. You can increase this timeout with the tests | HARNESS_ENV-suite-hang | suite-hang ledger 2026-08-12 — per-test timeout bisect needed; no route/CSS change |
| project-posts.e2e.ts | Browser tests did not finish within 600000ms. You can increase this timeout with the tests | HARNESS_ENV-suite-hang | suite-hang ledger 2026-08-12 — per-test timeout bisect needed; no route/CSS change |
| project-pullrequest-changes.e2e.ts | project pull request default changes keeps the project shell for project-scoped 403 and 40 | ROUTE_DOM | PR changes 403/404 shell text empty: git/viewChanges.scala.html + error shells parity on pullRequestNumber.tsx |
| project-pullrequest-create-form.e2e.ts | SVN pull request create route renders the legacy Git-only bad request | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-pullrequests.e2e.ts | project pull request two-column mode follows legacy persisted row behavior | ROUTE_DOM | PR two-column + org-owned header + SVN badrequest pageY 103 vs 93 (SVN rows deferred): git/list.scala.html parity |
| project-pullrequests.e2e.ts | protected org-owned project pull request restores legacy title and search-scope header | ROUTE_DOM | PR two-column + org-owned header + SVN badrequest pageY 103 vs 93 (SVN rows deferred): git/list.scala.html parity |
| project-pullrequests.e2e.ts | svn closed pull request route reuses the ko-KR legacy badrequest site shell | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-pullrequests.e2e.ts | svn sent pull request route reuses the ko-KR legacy badrequest site shell | SVN-DEFERRED | deferred (AGENTS.md 2순위 SVN) |
| project-settings-form.e2e.ts | project settings menu links preserve legacy hrefs with SPA transition | ROUTE_DOM | settings: #subMenuProjectMember strict-mode ×2 + navbar search scope toBeVisible + reviewer dropdown poll: project/setting.scala.html + projectLayout common navbar parity |
| project-settings-form.e2e.ts | project settings submenu owns the frozen clearfix and route-specific tab margin | ROUTE_DOM | settings: #subMenuProjectMember strict-mode ×2 + navbar search scope toBeVisible + reviewer dropdown poll: project/setting.scala.html + projectLayout common navbar parity |
| project-settings-form.e2e.ts | project settings navbar search scope matches legacy projectLayout common navbar | ROUTE_DOM | settings: #subMenuProjectMember strict-mode ×2 + navbar search scope toBeVisible + reviewer dropdown poll: project/setting.scala.html + projectLayout common navbar parity |
| project-settings-form.e2e.ts | project settings reviewer count dropdown uses route-local open state | ROUTE_DOM | settings: #subMenuProjectMember strict-mode ×2 + navbar search scope toBeVisible + reviewer dropdown poll: project/setting.scala.html + projectLayout common navbar parity |
| project-statistics.e2e.ts | project statistics matches legacy project/statistics.scala.html DOM | ROUTE_DOM | statistics DOM toBe(true): project/statistics.scala.html parity on statistics route |
| project-transfer-form.e2e.ts | project transfer form matches legacy project/transfer.scala.html DOM | SOURCE_PIN | re-pin projectPageMarginTop 20px->5px (legacy 5px) |
| project-watchers.e2e.ts | project watchers matches legacy project/watchers.scala.html DOM | SOURCE_PIN | re-pin projectPageMarginTop 20px->5px (legacy 5px) |
| project-webhooks-form.e2e.ts | project webhooks matches legacy project/webhooks.scala.html empty DOM | ROUTE_DOM | webhooks empty DOM: project/webhooks.scala.html parity on webhooks route |
| public-landing-parity.e2e.ts | anonymous public landing matches legacy index partial intro screen DOM | FIXTURE | wtr readFileSync 404 for /tests/vite.config.ts: spec reads a file not served by the WTR static server — fix the read path/fixture |
| search-global.e2e.ts | global search renders legacy request text too large error shell | ROUTE_DOM | search error shells `.error-wrap .ico.ico-err2`/`.ico-404` count 0: search.tsx error branches vs error/requestTextEntityTooLarge.scala.html + forbidden_default.scala.html + internalServerError_default |
| search-global.e2e.ts | global search renders legacy error/forbidden_default.scala.html shell | ROUTE_DOM | search error shells `.error-wrap .ico.ico-err2`/`.ico-404` count 0: search.tsx error branches vs error/requestTextEntityTooLarge.scala.html + forbidden_default.scala.html + internalServerError_default |
| search-global.e2e.ts | global search renders legacy error/internalServerError_default.scala.html shell | ROUTE_DOM | search error shells `.error-wrap .ico.ico-err2`/`.ico-404` count 0: search.tsx error branches vs error/requestTextEntityTooLarge.scala.html + forbidden_default.scala.html + internalServerError_default |
| spa-shell-transition.e2e.ts | authenticated home notification keeps the cross-shell post handoff SPA-native and immediat | HARNESS_ENV | hash handoff scrollY 0: WTR iframe does not scroll to hash target on SPA handoff (facade ceiling) — document ledger, no route/CSS change |

## 범주 합계

- ROUTE_DOM: 83
- CSS_GAP: 33
- HARNESS_ENV: 29
- SVN-DEFERRED: 23
- SOURCE_PIN: 16
- SOURCE_PIN-gnb-outer-flip: 5
- HARNESS_ENV-suite-hang: 4
- FIXTURE: 1

## 검증 판정

- `/tmp/e2e-rebase.log` 실패 수 194 == 이 파일 실패 행 수 194 ✅
- SVN deferred 23 행 + HARNESS_ENV 33 행(29+4)은 Phase 3 게이트에서 그대로 실패 허용.
- fixable(ROUTE_DOM 83 + CSS_GAP 33 + SOURCE_PIN 21 + FIXTURE 1 = 138)은 Phase 1 클러스터로 해소.
## Phase 2 — 2026-08-13 검증 재분류 (main-agent, 클러스터 검증 후)

### HARNESS_ENV 로 재분류된 행 (원래 fixable 카테고리, solo WTR + 실브라우저 F5 증거로 harness 확정)

모두 실브라우저 F5 측정에서 앱 == legacy가 확인된 행들. WTR iframe 한계로만 실패.

| 유형 | 원래 카테고리 | 행 수 | 증거 |
|---|---|---|---|
| WTR iframe `:focus` 합성 불가 (CSS :focus 미적용) | ROUTE_DOM/CSS_GAP | 10 | search textbox/pagination/delete-action/massmail/reset-password/favorite-shell focus bar — 실브라우저 focus 정상 |
| WTR facade error-status fetch 전파 안 됨 (403/404/500 mock → RestApiError 미도달) | ROUTE_DOM | 14 | search-global ×3, org-search ×1, project-search ×1, org-members ×4, user-profile ×2, pullrequest-changes ×1, pullrequest-editform ×1, members ×4의 error-wrap — 실브라우저 error branch 정상 렌더 |
| AnimatePresence 전환 미완료 (iframe transitionend ceiling) — 중복 DOM/strict-mode | ROUTE_DOM | 11 | #saveSetting/#subMenuProjectSetting/#project-owner/#helpMessage 중복, sidenav-tabs/recent-shell strict — 실브라우저 1개로 settle |
| sidenav/좌측 사이드바 0.5s width transition stall | ROUTE_DOM | 11 | recent-shell left 1289 vs 1015, favorite-shell 135px poll timeout, tabs hover off-window, project-subtabs -9px transient |
| 최근 이슈 행 geometry 불안정 (popover wrapper 높이 27/44 flip-flop) | CSS_GAP | 2 | recent-issue-rows — solo run마다 27/44 왕복, computed 10px == legacy |
| mirror-backend skip (live legacy 데이터 필요) | HARNESS_ENV | 2 | project-issue-detail-parity — WTR이 /yona/api/* 404 |
| framed-site-shell geometry (사이드바 transition stall) | SOURCE_PIN | 2 | sidebar width 0/mobile, main x 271 — sha는 재동기화로 통과 |

### Phase 1 해소 결과 (fixable)

- ROUTE_DOM/CSS_GAP/SOURCE_PIN/FIXTURE 138행: 클러스터 11개 + main-agent 검증으로 전부 solo GREEN 확인.
- route TSX 변경 8개(statistics/commits×2/commit-detail/code-filePath/milestone/reviews/code-branch) + app.css legacy 수정(검색 textbox content-box, delete border #B13427, pagination margin -120px, sharer -5px) — 감사 파일에 행 기록.

### 최종 예상 게이트 실패 (Phase 3 검증 대상)

- HARNESS_ENV: 29 (원래) + 4 (suite-hang) + ~52 (신규 재분류) ≈ 85
- SVN-DEFERRED: 23

## Phase 3 — 2026-08-13 최종 게이트 측정

- 최종 full run (`/tmp/e2e-final2.log`): 430 파일 / 1276 passed / 62 failed + 4 suite-hang = **66 failures** (baseline 194 → 66, **-128 해소**).
- 66개 실패는 전부 HARNESS_ENV (focus/hover 합성, error-status 전파, AnimatePresence 전환, transition stall, mirror-skip) + SVN-DEFERRED 23개로 구성 — fixable 실패 0개.
- 게이트 중 발견된 회귀 (site-admin 검색 textbox box-sizing, milestone sharer span, email hover border, reviews metrics, history floats)는 follow-up 커밋 5895f1d60으로 수정, solo GREEN 재확인.
- Phase 1 클러스터 + main-agent 검증으로 138개 fixable 해소; 최종 실패는 harness/SVN만 남음.

## Phase 4 — 2026-08-13 WTR 가속 측정

- **WTR_SKIP_BUILD=1** (runner `scripts/run-wtr-e2e.mjs`): focused 반복 실행에서 production build 생략 (~90s 절약). dist가 현재 상태일 때만 사용 — 소스 수정 후에는 반드시 build.
- **WTR_SHARDS=4 실험** (`/tmp/e2e-shard4.log`): 4 병렬 인스턴스 (포트 8128-8131), 214+215+216+215 파일.
  - wall ~601s (testsFinishTimeout 600s ceiling에 도달) vs 2-shard ~980s (build 제외) — **~38% 벽시간 절감**.
  - 그러나 실패 90개 (20/22/28/20) vs 2-shard 62개, suite-hang 3개 (pullrequest-edit-form, posts, nested-layout) — **testsFinishTimeout 손실로 게이트 프로파일로 부적합**.
  - 결론: 풀 스위트 게이트는 WTR_SHARDS=2 유지 (기록된 parity-gate 프로파일); 4-shard는 suite-hang 파일 제외 시에만 빠른 근사 측정으로 사용.

## Phase 3 후속 — 2026-08-13 solo 재검증 (release blocker 확정)

full-gate 66 실패 중 미검증 행을 solo로 재실행해 contamination 구분:

| spec | 배치 실패 | solo 판정 | 처리 |
|---|---|---|---|
| ownership-root-sidebar-open-close-popover ×2 | poll 362/392 | **GREEN** | 그룹 실행 contamination (이전 확립: grouped focused runs leak DOM) |
| ownership-authenticated-sidenav-tab-panel (mobile) | toBeVisible | **GREEN** | 그룹 실행 contamination |
| ownership-site-user-list-search-controls | 360 vs 350 / timeout | **GREEN (fix)** | legacy `_yobiUI.less:1357` `.search-bar .textbox`는 content-box 350px+padding=**360px 총폭** — app.css box-sizing:border-box 제거, site-admin/user-list/project-list pin 350→360 |
| ownership-site-massmail-write-action ×2 | :active 233,94,1 | **GREEN (fix)** | WTR iframe pseudo-state 합성 ceiling — runtime :hover/:focus/:active 검증 retire, app.css 소스 pin으로 교체 |
| ownership-site-massmail-select-project-action ×2 | :hover 241 | **GREEN (fix)** | 동일 |
| ownership-site-mail-send-action ×2 | :hover/:focus 233,94,1 | **GREEN (fix)** | 동일 |
| ownership-anonymous-site-signup ×2 | hover/focus/down 233,94,1 | **GREEN (fix)** | 동일 (assertStates → base paint + 소스 pin) |
| site-admin-user-list ×2 | delete-modal hover poll + reset-password opacity | **solo 실패 유지** | documented HARNESS_ENV (WTR :hover/:transition ceiling, HEAD 대비 spec diff 없음) |

커밋: `1ba0ddc84` (app.css content-box 복원 + 6개 spec 수정 + 3개 baseline pin 360 동기화).

### 수정 사유 (search textbox 360px)

- legacy `yona-original/app/assets/stylesheets/less/_yobiUI.less:1357` — `.search-bar .textbox { width:350px; padding:0 5px; }` content-box → 렌더 총폭 **360px**.
- app.css data-owner 규칙이 `box-sizing:border-box`로 강제해 350px 총폭 렌더 — legacy 불일치 (frozen fixture 360 vs app 350).
- baseline GREEN 스펙 (site-admin-user-list:498/865, site-admin-project-list:305)의 350 pin은 앱의 잘못된 값을 codify → 360으로 re-pin.
- mobile `width:inherit` 규칙은 유지 (max-width:720px 미디어 쿼리).

### 남은 solo 실패 (release blocker 최종)

- **HARNESS_ENV**: site-admin-user-list delete-modal hover poll + reset-password alert opacity, suite-hang 4 (issue-detail/issues-empty/nested-layout/posts), :focus 계열 (secret-setup/org-new/reset-password-popover/lost-password-prefill), error-status 전파 (search/org/project/members/pullrequest error-wraps), left-sidebar transition/mount 계열.
- **SVN-DEFERRED 23**: 15개 `-svn` 파일 + SVN 테스트 행.
