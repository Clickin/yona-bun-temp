# StyleX Screen Migration Checklist

### 2026-07-25 authenticated project issue-detail header metadata float ownership

- [x] `yona-original/app/views/issue/view.scala.html:107-130` emits the desktop `pull-right mr10 mt10 hide-in-mobile` and mobile `pull-right hide show-in-mobile` metadata wrappers; frozen Bootstrap `.pull-right` (`bootstrap.css:6093-6100`), `_common.less:207-208`, `_page.less` `.board-header`, the complete `yobi.less` import chain, and the legacy mobile `font-size:0.7em` are recorded as output/cascade evidence.
- [x] The desktop/mobile metadata DOM, visibility classes, margins, state/date copy, and existing mobile font-size remain unchanged while the existing `desktopMetadata` and `mobileMetadata` StyleX owners add exact `float:right`; only the two React-owned `pull-right` utilities are removed. Other issue-detail float consumers remain excluded.
- [x] `frontend/tests/stylex-project-issue-detail-inline-residual.e2e.ts` verifies source provenance, computed floats/margins/font-size, class retirement, desktop/mobile containment/no-overflow, and screenshots under `frontend/output/playwright/stylex-project-issue-detail-header-metadata-floats/{normal,fallback-off}/`; the narrowed external Chrome guard passes 1/1 in each mode. Live legacy screenshot parity remains unverified; fallback-off global shell drift and approved Yoram footer identity differences receive no compensation.

### 2026-07-25 authenticated project commit-detail footer action floats

- [x] `code/diff.scala.html:171-176` and `code/svnDiff.scala.html:144-147` emit the Watch/List footer controls; frozen Bootstrap `.pull-left`/`.pull-right` (`bootstrap.css:6093-6100`), the complete `yobi.less` import chain, relevant `_page.less` action-row cascade, and `conf/messages:68,516` establish the output, float, and copy sources.
- [x] Git and SVN commit-detail footer DOM/order, Watch mutation, List Link destinations, copy, and fallback classes are preserved while `footerWatchLeft`/`footerListRight` own only the exact left/right floats; branch controls, metadata, comments, review forms, and other float consumers are excluded.
- [x] `frontend/tests/project-code-commit-detail.e2e.ts` verifies source ownership, stable markers, computed floats, class retirement, DOM order, href/copy, watch mutation, and desktop/mobile containment/no-overflow in normal and explicit fallback-off external Chrome (3/3 each for the narrowed Git/SVN guard). Git/SVN desktop/mobile captures are under `frontend/output/playwright/stylex-project-commit-detail-footer-floats/{normal,fallback-off}/` and were directly inspected. Live legacy screenshot parity remains a documented gap; fallback-off global shell drift and approved Yoram footer identity differences receive no compensation.

### 2026-07-25 authenticated project code-file header float ownership

- [x] `code/view.scala.html:78-99`, frozen Bootstrap `.pull-left`/`.pull-right` (`bootstrap.css:6093-6100`), `_page.less:4498-4523`, the complete `yobi.less` import chain, and `conf/messages:122,132` are recorded as output/cascade/copy sources.
- [x] The file-state branch picker, breadcrumb, Git Download wrapper, and authenticated New file wrapper preserve legacy DOM/order/copy/query behavior while route-local StyleX owns only the proven left/right floats; `mb10` remains conditional and the breadcrumb `pull-left` fallback remains. Lower file actions, breadcrumb margin/popover, and comment-count consumers are excluded.
- [x] `frontend/tests/stylex-project-code-file-header-floats.e2e.ts` passes normal and explicit fallback-off external Chrome 2/2 each at 1366x900 and 390x844, with screenshots under `frontend/output/playwright/stylex-project-code-file-header-floats/{normal,fallback-off}/`; the four screenshots were directly inspected. Live legacy screenshot parity is unavailable and remains unverified; fallback-off global shell/Bootstrap drift is outside these owners and receives no compensation.

### 2026-07-25 authenticated project issue-detail keymap wrapper float

- [x] `help/keymap.scala.html:12-17`, frozen Bootstrap `.pull-left` (`bootstrap.css:6097-6099`), `_page.less:5556-5559`, and the complete `yobi.less` import chain are recorded as output/cascade sources.
- [x] The issue-detail keymap wrapper preserves the legacy DOM, spacing, copy, and React modal/keyboard behavior while its existing StyleX owner carries exact `float:left`; only the React-owned `pull-left` utility is removed.
- [x] `frontend/tests/stylex-project-issue-detail-keymap-wrapper.e2e.ts` verifies source provenance, stable owner, retired-class absence, computed float/margin/padding, visible modal interaction, desktop/mobile containment/no-overflow, and deterministic screenshots under `output/playwright/stylex-project-issue-detail-keymap-wrapper/{normal,fallback-off}/`.
- [x] Managed external System-Chrome normal and explicit fallback-off focused runs pass 2/2 each at 1366x900 and 390x844; screenshots were directly inspected under `output/playwright/stylex-project-issue-detail-keymap-wrapper/{normal,fallback-off}/`.
- [ ] Live legacy rendering is unavailable, so direct screenshot parity is unverified; fallback-off global shell/Bootstrap drift remains outside this owner and receives no compensation.

### 2026-07-25 authenticated project issues keymap wrapper float

- [x] `help/keymap.scala.html:12-17`, frozen Bootstrap `.pull-left` (`bootstrap.css:6097-6099`), `_page.less:5556-5559`, and the `yobi.less` import chain are recorded as output/cascade sources.
- [x] The keymap wrapper preserves the legacy DOM, button/modal state, margin, and padding while `project-issues-keymap` owns exact `float:left`; only the React-owned `pull-left` class is retired.
- [x] `frontend/tests/stylex-project-issues-keymap.e2e.ts` verifies provenance, stable owner, retired-class absence, computed float/spacing, modal interaction, desktop/mobile containment/no-overflow, and screenshots under `frontend/output/playwright/stylex-project-issues-keymap/{normal,fallback-off}/`.
- [x] Managed external System-Chrome normal and explicit fallback-off focused runs pass 2/2 each at 1366x900 and 390x844; screenshots were directly inspected under `frontend/output/playwright/stylex-project-issues-keymap/{normal,fallback-off}/`.
- [ ] Live legacy rendering is unavailable, so direct screenshot parity is unverified; existing fallback-off global shell/Bootstrap drift remains outside this owner and receives no compensation.

### 2026-07-25 authenticated project new pull-request selector-column floats

- [x] `git/create.scala.html:37-82`, frozen `_page.less:5459-5475`, Bootstrap float utilities, and `conf/messages` are recorded as output/cascade/copy sources.
- [x] The From and To selector columns preserve legacy DOM/order, labels, select navigation/interaction, arrow, and responsive geometry while route-local StyleX owns exact `float:left`/`float:right`; only the two React-owned utility classes are removed.
- [x] `frontend/tests/stylex-project-pull-request-create-form-mr5.e2e.ts` verifies stable owners, retired-class absence, computed floats, selector interaction, desktop/mobile containment/no-overflow, and deterministic screenshots under `output/playwright/stylex-project-new-pull-request-selector-floats/{normal,fallback-off}/`.
- [x] Managed external System-Chrome focused results are normal 1/1 and explicit fallback-off 1/1 at 1366x900 and 390x844; screenshots at the recorded normal/fallback-off paths were directly inspected.
- [ ] Live legacy rendering is unavailable, so broad screenshot parity is explicitly unverified; fallback-off global shell/Bootstrap drift remains outside these owners and received no compensation.

Status: **active canonical target inventory**  
Parent plan: `docs/plans/2026-07-13-frozen-css-to-stylex-migration.md`  
Snapshot: 2026-07-19 (`frontend/src/routes/**/*.tsx`: 116; routable entries: 110; legacy Scala templates: 242)

### 2026-07-23 Batch 841 organization-home project-card owner avatar image

- [x] `organization/view.scala.html`, frozen `_page.less:1837-1910`, and the complete `yobi.less` import chain are recorded as output/cascade sources.
- [x] The existing project-card avatar wrapper remains intact; route-local StyleX owns only nested image `height:100%`, `width:100%`, and `vertical-align:top`.
- [x] `frontend/tests/stylex-organization-project-card-avatar-image.e2e.ts` verifies declarations, owner/attrs, blank-logo branch, filter interaction, desktop/mobile containment, and no inline style.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; frozen inline/intrinsic sizing receives no compensating geometry.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries.

### 2026-07-23 Batch 842 organization-home project-card private lock and owner-name child paint

- [x] `organization/view.scala.html:80-110`, frozen `_page.less:1862-1870`, and the complete `yobi.less` import chain are recorded as output/cascade sources.
- [x] Route-local StyleX owns only the frozen private-lock color and owner-name-small color/font-size; private state, legacy classes, Link/copy/order, and icon-font fallback remain.
- [x] `frontend/tests/stylex-organization-project-card-child-paint.e2e.ts` verifies source provenance, owner/classes/attrs/copy, computed colors/font-size, desktop/mobile containment, and no inline style.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each; fallback-off checks icon DOM/color without claiming fallback-owned glyph visibility.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified and no compensating geometry was added.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries.

### 2026-07-23 Batch 843 organization-home project-card stats icons

- [x] `organization/view.scala.html:113-135`, frozen `_page.less:7013-7025`, and the complete `yobi.less` import chain are recorded as output/cascade sources.
- [x] Route-local StyleX owns only the three stats icon font-size/side margins and conditional lightbulb ramp colors; legacy DOM/classes/counts/titles/state and icon-font fallback remain.
- [x] `frontend/tests/stylex-organization-project-card-stats-icons.e2e.ts` verifies source provenance, three owners/classes, count/copy/order, computed declarations/colors, desktop/mobile containment, no overflow, and no inline style.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each; fallback-off checks icon DOM/declarations without claiming fallback-owned glyph visibility.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified and no compensating geometry was added.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries.

### 2026-07-23 Batch 844 organization-home member-panel inner

- [x] `organization/view.scala.html:141-177`, frozen `_page.less:2610-2625`, and the complete `yobi.less` import chain are recorded as output/cascade sources.
- [x] The existing member-panel inner owner now adds only frozen `.member-info` `margin-right:0` and `height:auto !important`; panel order/classes, member links/copy, leave behavior, and responsive layout remain.
- [x] `frontend/tests/stylex-organization-member-panel-inner.e2e.ts` verifies source provenance, manager/member owners/order/classes, computed inner declarations, copy, leave interaction, desktop/mobile containment, no overflow, and no inline style.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified and no compensating geometry was added.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries.

### 2026-07-23 Batch 845 organization-home member-panel avatar wrapper/image

- [x] `organization/view.scala.html:34-41,141-177`, frozen `_yobiUI.less:439-466`, and the complete `yobi.less` import chain are recorded as output/cascade sources.
- [x] Route-local StyleX owns only the panel avatar wrapper and nested image declarations; `avatar-wrap`, links/titles, 45px attributes, copy/order, and responsive behavior remain.
- [x] `frontend/tests/stylex-organization-member-panel-avatar.e2e.ts` verifies source provenance, both panel owners/classes/links/titles/attributes/copy/order, computed declarations, desktop/mobile containment, no overflow, and no inline style.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified and no compensating geometry was added.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries.

### 2026-07-23 Batch 846 shared `.avatar-wrap` consumer-graph refresh

- [x] Frozen `_yobiUI.less:439-466` base/nested-image declarations and `_page.less` descendant selector consumers are enumerated.
- [x] The React inventory confirms independent avatar-wrap emitters remain across project, issue, commit, code, PR, user, search, organization, import, UI-kit, and home routes; the organization-home member-panel owner is only one bounded consumer.
- [x] No shared selector, route TSX, frozen source, or generated fallback was changed; the global family remains enabled by default.
- [x] This is a documented C/R decision, not a route-state implementation; no Scala audit row is added.
- [ ] A complete all-consumer owner graph is still required before any shared `.avatar-wrap` fallback retirement; no deletion or parity claim is made here.

### 2026-07-23 Batch 847 authenticated sidebar project/organization list-item margin

- [x] `sidebar.scala.html:58-74`, `common/usermenu_tab_content_list.scala.html:1-13`, the complete frozen `yobi.less` import chain, and `_usermenu.less` `.user-project-list li { margin-left:0; }` are recorded as output/cascade sources.
- [x] The existing authenticated sidebar route-local StyleX boundary owns the exact reset for organization, nested-project, and direct-project rows; tabs, search filtering, star controls, Link behavior, legacy classes/order/copy, and unrelated sidebar consumers remain unchanged.
- [x] `frontend/tests/stylex-authenticated-sidebar-project-list.e2e.ts` verifies static provenance, all three owners, computed margin, visible tab/search/list interaction, desktop/390px containment, and deterministic screenshots.
- [x] Managed dynamic-port system-Chrome normal and fallback-off runs pass 3/3; screenshot outputs are under `frontend/output/playwright/stylex-authenticated-sidebar-project-list/`.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### 2026-07-25 organization enrollment-request wrapper utility retirement

- [x] `organization/members.scala.html:89-103`, frozen Bootstrap `.pull-left` (`bootstrap.css:6097-6099`), and frozen `_common.less:207` `.mr10` establish the enrollment avatar/details output and exact float, margin, and 60px width.
- [x] `members.tsx` keeps the enrolled-user DOM order, `mr10`, Link/copy/accept behavior, and responsive span wrapper while StyleX owns both wrapper floats, avatar margin, and details width; only the two React-owned `pull-left` runtime classes are retired.
- [x] `frontend/tests/stylex-organization-members-list.e2e.ts` verifies Scala/LESS/Bootstrap provenance, stable owner markers, retired classes, exact computed declarations, accept interaction, desktop/mobile containment, and no document overflow.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.

### 2026-07-23 Batch 848 organization enrollment-request accept type boundary

- [x] `organization/members.scala.html:89-103` and the legacy enrollment accept contract are recorded as the numeric user-id interaction source.
- [x] The existing React accept handler normalizes `user.userId` with `Number(...)`; DOM/classes/copy/order, mutation path, StyleX declarations, fallback, and geometry are unchanged.
- [x] Existing `frontend/tests/stylex-organization-members-list.e2e.ts` passes 5/5 in managed system Chrome, including accept interaction and desktop/mobile populated/empty states.
- [x] Full frontend TypeScript check, production build, and StyleX verifier pass; this is a type-only repair with no new screenshot-parity claim.

### 2026-07-23 Batch 849 organization members add-member form

- [x] `organization/members.scala.html:31-39`, frozen `_page.less:2169-2179`, and the complete `yobi.less` import chain are recorded as form/output/cascade sources.
- [x] Existing route-local StyleX owns only `.inner-bubble` margin/position and `.text.uname` width/margin/radius; legacy classes/DOM, typeahead/submit behavior, copy/order, and fallback remain.
- [x] `frontend/tests/stylex-organization-members-list.e2e.ts` verifies source/import provenance, both owners' computed declarations, typeahead selection/submit, desktop/mobile containment/no-overflow, and deterministic screenshots.
- [x] Managed dynamic-port system-Chrome normal/fallback-off runs pass 7/7; screenshots are under `frontend/output/playwright/visual-sweep/`.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### 2026-07-23 Batch 840 organization-home project-menu active pseudo

- [x] `organization/menu.scala.html`, frozen `_page.less:627-686`, `_responsive.less:281-283`, `_common.less`, Bootstrap, `messages`, and the complete `yobi.less` import chain are recorded as output/cascade/copy sources.
- [x] The existing organization menu item/link owners now add only exact active color and `::before`/`::after` pseudo declarations; legacy plain-text links, classes, DOM/order/copy, Link navigation, active state, and natural mobile wrapping remain.
- [x] `frontend/tests/stylex-organization-menu-active-pseudo.e2e.ts` verifies source provenance, active order/hrefs, computed pseudo content/position/border colors, hover, desktop/mobile horizontal/top containment, and fallback-off behavior.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; mobile vertical wrapping is legacy-derived and no compensating geometry was added.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries; these identity differences remain intentional.

### 2026-07-23 Anonymous default `/users/loginform` screen state

- [x] Legacy `user/login.scala.html:36-99` skeleton, login messages, frozen `_page.less` title/form declarations, `_responsive.less` mobile width rules, `_common.less` utility output, and Bootstrap form/button cascade are mapped; the inline focus script is behavior evidence only.
- [x] `loginform.tsx` and `-loginform.stylex.ts` preserve the anonymous normal page/full → title/tagline → form → hidden redirect → fields → submit → empty provider row → remember/forgot action order, copy, names, placeholders, autocomplete, REST/TanStack session and redirect behavior, and route-local StyleX ownership. Verification/social/error states are excluded from this one-state slice.
- [x] Focused `frontend/tests/stylex-anonymous-login-normal.e2e.ts` normal and `VITE_DISABLE_LEGACY_FALLBACK=1` runs pass 3/3 each in managed system Chrome, covering desktop 1366/mobile 390 DOM, copy, field, and containment contracts; live legacy screenshot availability remains unverified because localhost was unavailable, so screenshot parity is not claimed.

### 2026-07-23 Batch 828 organization boards populated pagination

- [x] Legacy organization board list and pagination boundary are mapped through `organization/group_board_list.scala.html`, `organization/group_board_list_partial.scala.html`, and the equivalent `board/list.scala.html`; frozen `_common.less:50-101`, `_sprites.less:1-5,97-119`, `_page.less:7442-7444`, `_responsive.less`, `yobi.less:1-13`, and `messages.ko-KR` supply the declarations, cascade, sprite geometry, and Korean labels.
- [x] `organizations/$organizationName/boards.tsx` preserves the five-item organization-scoped pagination DOM/order/copy, enabled/disabled sprites, filter/order/projectNames query navigation, and invalid/clamped Enter behavior; `-organization-boards.stylex.ts` owns only the traced route-local pagination declarations and stable markers.
- [x] Focused outside-sandbox system-Chrome normal/fallback-off checks pass 4/4 each, covering provenance, desktop/mobile computed geometry, pagination-owned containment, query parameter preservation, and input behavior.
- [x] Local desktop/mobile screenshots were captured and visually inspected under `frontend/output/playwright/batch-organization-boards-pagination/` (`organization-boards-pagination-desktop.png`, `organization-boards-pagination-mobile.png`).
- [ ] Live legacy populated screenshot parity remains unverified because `127.0.0.1:9000` was unavailable; no live legacy parity claim is made and no compensating geometry was added.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-23 Batch 827 organization search populated issue pagination

- [x] Legacy organization search result composition and pagination boundary are mapped through `search/partial_search.scala:142-160`, the populated search partials, and `organization/group_issue_search_partial.scala:93`; frozen `_common.less:50-101`, `_sprites.less:1-5,97-119`, `_page.less:7442-7444`, `_responsive.less`, `yobi.less:1-13`, and `messages.ko-KR` supply the declarations, cascade, sprite geometry, and Korean labels.
- [x] `organizations/$organizationName/search.tsx` preserves the five-item organization-scoped pagination DOM/order/copy, enabled/disabled sprites, TanStack organization search links, and invalid/clamped input behavior; `-organization-search.stylex.ts` owns only the traced route-local pagination declarations and stable markers.
- [x] Focused outside-sandbox system-Chrome normal/fallback-off checks pass 4/4 each, covering provenance, desktop/mobile computed geometry, pagination-owned containment, organization-scoped SPA navigation, and input behavior.
- [x] Local desktop/mobile screenshots were captured and visually inspected under `frontend/output/playwright/batch-organization-search-pagination/` (`organization-search-pagination-desktop.png`, `organization-search-pagination-mobile.png`).
- [ ] Live legacy populated screenshot parity remains unverified because `127.0.0.1:9000` was unavailable; no live legacy parity claim is made. Any fallback-off shell overflow outside the pagination owner remains a baseline and receives no compensating geometry.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-23 Batch 826 project search populated issue pagination

- [x] Legacy `search/partial_search.scala.html` → `search/partial_issues.scala.html` project-scoped issue pagination boundary, Korean page labels, and frozen `yobi.less` pagination cascade (`_common.less:50-101`, `_sprites.less:1-5,97-119`, `_page.less:7442-7444`, `_responsive.less`) are mapped.
- [x] Existing project-search pagination behavior is route-owned through `-project-search.stylex.ts`: wrapper, page list/items, prev/next labels/icons, input/nospinner, delimiter, and total owners preserve the five-item DOM/order/copy, sprite states, project-scoped TanStack links, and invalid/clamped Enter behavior. Other search categories and the shared fallback remain unchanged.
- [x] Focused outside-sandbox system-Chrome normal/fallback-off checks pass 4/4 each, covering source mapping, owner isolation, enabled/disabled controls, desktop/390px computed geometry, project-scoped SPA query navigation, input behavior, and pagination-owned containment.
- [x] Local desktop/mobile screenshots were captured and visually inspected under `frontend/output/playwright/batch-project-search-pagination/` (`project-search-pagination-desktop.png`, `project-search-pagination-mobile.png`).
- [ ] Live legacy populated screenshot parity remains unverified because `127.0.0.1:9000` was unavailable. Fallback-off mobile document overflow is an existing 8px project-shell issue from authenticated sidenav/project-search input (`scrollWidth 398` vs `clientWidth 390`); pagination itself is contained (`scrollWidth 390`) and no compensating route geometry was added.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-22 Batch 825 global search populated issue pagination

- [x] Legacy `search/partial_search.scala.html` → `search/partial_issues.scala.html` pagination boundary, Korean page labels, and frozen `yobi.less` pagination cascade (`_common.less:50-101`, `_sprites.less:1-5,97-119`, `_page.less:7442-7444`, `_responsive.less`) are mapped.
- [x] Existing global issue-search pagination behavior is route-owned through `-search.stylex.ts`: wrapper, page list/items, prev/next labels/icons, input/nospinner, delimiter, and total owners preserve the five-item DOM/order/copy, sprite states, TanStack links, and invalid/clamped Enter behavior. Other search categories and the shared fallback remain unchanged.
- [x] Focused outside-sandbox system-Chrome normal/fallback-off checks pass 3/3 each, covering source mapping, owner isolation, enabled/disabled controls, desktop/390px computed geometry, SPA query navigation, input behavior, and no overflow.
- [x] Local desktop/mobile screenshots were captured and visually inspected under `frontend/output/playwright/batch-global-search-pagination/` (`global-search-pagination-desktop.png`, `global-search-pagination-mobile.png`).
- [ ] Populated live legacy screenshot parity remains unverified because the legacy server at `127.0.0.1:9000` was unavailable; retain this explicit gap and do not claim live legacy visual parity.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-22 Batch 824 project issues populated pagination

- [x] Legacy `issue/partial_list_wrap.scala.html` pagination mount and populated issue-list boundary, `messages.ko-KR:74,79` page labels, and the complete `yobi.less` import chain (`_common.less:50-101`, `_sprites.less:1-5,97-119`, `_page.less:7442-7444`, `_responsive.less`) are mapped.
- [x] Existing project-issues pagination behavior is now route-owned through `-issues.stylex.ts`: wrapper, page list/items, prev/next labels/icons, input/nospinner, delimiter, and total owners preserve legacy DOM/order/copy, sprite states, TanStack links, and Enter/invalid/clamp behavior. The shared fallback and other pagination consumers remain unchanged.
- [x] Focused outside-sandbox system-Chrome normal/fallback-off checks pass 5/5 each, covering source mapping, owner isolation, enabled/disabled controls, desktop/390px computed geometry, SPA navigation, input behavior, and no overflow.
- [x] Local desktop/mobile screenshots were captured and visually inspected under `frontend/output/playwright/batch-824/` (`project-issues-pagination-desktop.png`, `project-issues-pagination-mobile.png`).
- [ ] Populated live legacy screenshot parity remains unverified because the legacy server at `127.0.0.1:9000` was unavailable; retain this explicit gap and do not claim live legacy visual parity.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-22 Batch 823 project board populated pagination

- [x] Legacy `board/list.scala.html`/`project/list.scala.html` pagination mount, `_common.less:50-101` wrapper/list/item/input/label cascade, `_page.less:7442-7444` page-number offset, `_responsive.less` responsive rule, and `_sprites.less:1-5,97-119` icon geometry are mapped.
- [x] Existing project-posts pagination behavior is now route-owned through `-posts.stylex.ts`: wrapper, page list/items, prev/next labels/icons, input/nospinner, delimiter, and total owners preserve legacy classes, DOM/order, links, and Enter/clamp behavior; the shared fallback and the other eight pagination consumers remain intact.
- [x] Focused outside-sandbox system-Chrome normal/fallback-off checks pass 1/1 each with source mapping, owner isolation, enabled/disabled controls, input hover/focus, navigation, desktop/390px containment, and no overflow.
- [x] Local desktop/mobile screenshots were captured and visually inspected under `frontend/output/playwright/batch-823/` (`board-pagination-desktop.png`, `board-pagination-mobile.png`).
- [x] The effective frozen cascade is recorded: `_page.less` `margin-left:-120px !important` wins over the non-important responsive `0` declaration, so both desktop and mobile compute to `-120px`; StyleX reproduces that effective result without invented geometry.
- [ ] Populated live legacy screenshot parity remains unverified because the legacy server at `127.0.0.1:9000` was unavailable; retain this explicit gap and do not claim live legacy visual parity.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-22 Batch 822 PR changes non-ranged review-card visible state

- [x] Legacy `git/partial_reviewlist.scala.html:27-47` review-card DOM and frozen `_page.less:6191-6250` card/state/content/meta declarations are mapped; legacy diff inclusion is retained as additional evidence from `code/diff.scala.html:131-159`.
- [x] `changes.tsx` and `-pull-request-changes.stylex.ts` preserve the Link/hash contract, open/closed state shadows, hover, outdated label visibility, clamped content, info/date/comments declarations, and stable route-local owners while retaining the shared fallback for other consumers.
- [x] Focused outside-sandbox system-Chrome normal/fallback-off checks pass 2/2 each, covering source mapping, owner isolation, open/closed tab interaction, computed declarations, and 390px containment.
- [x] Local review-card screenshots were captured and visually inspected under `frontend/output/playwright/batch-822/` (`review-card-desktop.png`, `review-card-390.png`). The captured fixture shows the existing asset-loading limitation for the avatar; no route-specific geometry compensation was added.
- [ ] Populated live legacy screenshot parity remains unverified because the legacy server at `127.0.0.1:9000` was unavailable; retain this explicit gap and do not claim live legacy visual parity.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-22 Batch 821 PR changes ranged review-thread shell/header/fold

- [x] Legacy partial_comment_thread.scala.html ranged shell/header/fold DOM and _page.less:6049-6132/_variables.less:100-101 declarations are mapped; legacy JS is behavior evidence only.
- [x] React owns open/closed fold state and seven route-local StyleX owners preserve shell, state shadow, header/badge, minimize, folded here control, and hidden subtree declarations; shared fallback and non-ranged consumers remain intact.
- [x] Focused normal/fallback-off system-Chrome tests pass 3/3 each with source proof, owner isolation, open/closed interaction, computed declarations, desktop screenshots, and 390px diff-scrollport containment/no-document-overflow metrics.
- [x] Local screenshots under frontend/output/playwright/batch-821/ were visually inspected, including open, folded-open, and closed-folded states.
- [ ] Populated live legacy screenshot parity remains unverified because 127.0.0.1:9000 was unavailable during this turn; retain this explicit gap and do not claim live legacy visual parity.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-22 Batch 820 user-files populated pagination

- [x] Legacy `userFiles.scala.html` pagination placeholder, `_common.less` pagination cascade, `_sprites.less` prev/next geometry, and responsive page-number offset are mapped.
- [x] Six route-local owners preserve wrapper/list/item/input/label/sprite declarations and React/TanStack pagination behavior without inline styles or shared fallback deletion.
- [x] Focused normal/fallback-off system-Chrome checks pass 2/2 each with desktop/mobile computed output, enabled/disabled order, focus/hover/Enter navigation, containment, and no overflow.
- [x] Local populated-state desktop/mobile screenshots and real legacy empty-state desktop/mobile baseline screenshots were captured under `frontend/output/playwright/batch-820/` and visually inspected.
- [ ] Exact populated pagination screenshot parity against a live legacy render remains unverified because the disposable legacy instance has no attachments; retain this as an explicit gap and do not claim full visual parity for this state.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional deviations and are not restored.

### 2026-07-22 Batch 819 board-post Markdown commit references

- [x] Legacy source mapped: `board/view.scala.html` → `partial_comments.scala.html` → `common/childComments.scala.html` plus `AutoLinkRenderer.java` commit-token resolution.
- [x] REST metadata added for post and parent/child comments; frontend normalizes and renders commit links through ReactMarkdown/TanStack Router.
- [x] Focused E2E covers `User/Project@SHA`, `User@SHA`, and `@SHA` output, short IDs, hrefs, order, desktop/mobile containment, and no-overflow.
- [x] Outside-sandbox system-Chrome normal/fallback-off runs pass 1/1; local exact-state desktop/mobile and fallback-off screenshots plus real legacy seed desktop/mobile baseline screenshots were visually inspected under `frontend/output/playwright/batch-819/`.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain documented intentional deviations and are not restored.

## Approved Yoram footer diff (do not classify as a parity gap)

Owner confirmation (2026-07-22): the following footer differences were explicitly
made by the project owner because they are unrelated to Yoram. They are intentional
product changes and must remain unchanged during screenshot parity review:

- `NAVER`, `NAVER LABS`, and `NAVER CLOUD PLATFORM` entries are removed.
- The upstream Yona repository URL is removed.
- The legacy developer-contact entry/link is removed.
- Upstream attribution is replaced with `Yoram authors`.

The current footer deliberately differs from `yona-original/app/views/common/footer.scala.html` because the product owner changed the product identity. The React footer keeps `Yoram authors` and intentionally removes the legacy `NAVER`, `NAVER LABS`, and `NAVER CLOUD PLATFORM` provider-facing entries, the upstream Yona repository URL, and the legacy developer-contact link/copy. These are explicit user-authored changes, not omissions or unfinished migration work.

Screenshot parity checks must preserve this diff. Any resulting search/footer position or height change is the natural geometry of the removed/replaced content; do not restore upstream links or add spacing to imitate them. Record any footer-related observation as the approved Yoram identity deviation, with the detailed source and rationale in `docs/provenance/frontend-yoram-rebrand-2026-07-13.md`.

### 2026-07-22 Batch 817 board-post child rich Markdown remaining auto-links

- [x] Three additional child-only owners reproduce legacy organization and
  project mention badges plus the closed issue-state badge; Batch 816 open
  state, user mention, blockquote, metadata, Reply, and delete behavior remain
  intact.
- [x] Outside-sandbox system-Chrome normal/fallback-off focused runs pass 1/1
  with exact internal links, owner isolation, computed badge declarations,
  hover behavior, desktop/390px containment, and no overflow.
- [x] Fresh fallback-off desktop/mobile screenshots were captured and
  visually inspected. Purple organization/project badges and the green/red
  Open/Closed states render in the expected child Markdown order; approved
  Yoram footer/contact/repository drift remains excluded.

### 2026-07-22 Batch 818 board-post parent rich Markdown auto-links

- [x] Six parent-only owners translate the legacy user, organization, project,
  open-issue, and closed-issue Markdown link states; the via-email original
  message toggle remains intact.
- [x] Outside-sandbox system-Chrome normal/fallback-off focused runs pass 1/1
  after correcting the fallback-off user badge ownership from the nested span
  to the legacy anchor; desktop/390px link order, hrefs, colors, hover, and
  containment remain covered.
- [x] Fresh desktop/mobile screenshots were captured and visually inspected.
  The approved Yoram footer/contact/repository identity diff remains an
  intentional deviation and is not a parity gap.

### 2026-07-22 Batch 816 board-post child rich Markdown

- [x] Five child-only owners cover mention/issue links, open issue-state badge,
  blockquote, and blockquote paragraph while preserving Batch 814/815 output.
- [x] Outside-sandbox system-Chrome normal/fallback-off runs pass 1/1 with AST
  auto-link DOM, navigation, hover, desktop/390px geometry, and no overflow.
- [x] Fresh fallback-off desktop/mobile screenshots were inspected. The 5px
  quote border, blue links, green Open badge, and separate metadata paragraph
  render correctly; approved Yoram footer/contact/repository drift is excluded.

### 2026-07-22 Batch 815 board-post child metadata placement

- [x] Six owners reproduce the legacy post-script output: closed/open child
  form, final Markdown paragraph and strong, author link/strong, and ago link.
- [x] Outside-sandbox system-Chrome normal/fallback-off focused runs pass 1/1
  with exact DOM order, desktop/390px computed output, hover/focus, hash links,
  and delete behavior.
- [x] Fresh local desktop/mobile screenshots were visually compared with actual
  legacy captures. Approved Yoram footer/contact/repository differences and
  their downstream geometry are intentional deviations, never parity gaps.

### 2026-07-22 Batch 814 board-post populated child comment and Reply-open controls

- [x] Six child-only owners carry the exact frozen responsive media gutter,
  nested contents, delete control, flex input row, textarea, and submit
  declarations; receiver, Reply affordance, generic button paint, parent
  comments, backend submission, and fallback deletion remain excluded.
- [x] Outside-sandbox system-Chrome normal/fallback-off runs pass 1/1 each with
  Scala/LESS/import proof, owner isolation, exact desktop/390px computed output,
  subtree DOM parity, containment/non-overlap/no-overflow, focus/draft
  preservation, and delete-modal behavior.
- [x] Fresh actual legacy display/open and local fallback-off open desktop/mobile
  screenshots were captured and inspected. Child gutter, dashed row, and open
  textarea/OK geometry align; fixture/locale/assets and approved Yoram footer,
  contact, and repository differences remain outside this wave.

### 2026-07-22 Batch 813 board-post child-reply notification receiver

- [x] Two child-only owners compose the existing generic wrapper/title groups;
  one variant adds only the frozen 12px left margin and two 3px bottom radii.
- [x] Outside-sandbox system-Chrome normal/fallback-off runs pass 1/1 each with
  source/import, owner isolation, full computed cascade, copy/order, hover/open/
  focus/close behavior, zero desktop/390px geometry, and containment.
- [x] Fresh actual legacy/local open child-form desktop/mobile screenshots were
  captured and inspected. The hidden receiver adds no height; fixture/locale
  and approved Yoram footer/contact/repository differences remain excluded.

### 2026-07-22 Batch 812 board-post UPDATE notification receiver

- [x] Two UPDATE-only markers reuse the exact Batch 811 hidden receiver wrapper
  and title groups; NEW markers remain unchanged and child/list badge consumers
  stay excluded.
- [x] Outside-sandbox system-Chrome normal/fallback-off runs pass 1/1 each with
  source/import, owner isolation, exact computed declarations, copy/order,
  focus-stable hidden state, zero desktop/390px geometry, and edit/cancel/save
  behavior.
- [x] Fresh actual legacy/local open-form desktop/mobile screenshots were
  captured and inspected. The receiver adds no geometry; fixture/locale and
  approved Yoram footer/contact/repository differences remain outside the wave.

### 2026-07-22 Batch 811 board-post NEW-comment notification receiver

- [x] Two `comment-body`-only owners carry the frozen hidden receiver wrapper
  and title declarations; UPDATE/child receivers, receiver-list badges,
  fallback deletion, and other routes remain excluded.
- [x] Outside-sandbox system-Chrome normal/fallback-off runs pass 1/1 each,
  covering source/import mapping, owner isolation, exact computed values,
  focus-stable hidden state, copy/order, zero desktop/390px geometry, and
  viewport containment.
- [x] Fresh actual legacy/local desktop/mobile screenshots were captured and
  inspected. The hidden receiver adds no editor-to-uploader geometry; fixture,
  locale, and approved Yoram footer/contact/repository differences are outside
  this wave.

### 2026-07-22 Batch 801 board-post comment-update hidden auxiliary controls

- [x] Four update-only owners carry the exact frozen upload overlay, message
  wrapper/message, and Clear Temporary wrapper declarations; no drag,
  localStorage, clear, upload, or visibility behavior was invented.
- [x] System-Chrome normal/fallback-off runs pass 1/1 each at desktop/390px
  with source/behavior limits, exact computed declarations, hidden zero
  geometry, inert direct drag dispatch, update-only scope, and unchanged editor
  interactions.
- [x] Fresh actual legacy/local screenshots were captured and inspected. Both
  hide these controls in the parent update editor. The fallback-off new-comment
  Clear Temporary exposure is a separate consumer and the next safe wave;
  approved Yoram identity differences remain excluded.

### 2026-07-22 Batch 800 board-post comment-update checklist control

- [x] Three update-only owners carry the checklist wrapper, composed
  small/danger-no-outline button, and effective yobicon list glyph. The
  non-matching legacy `.tasklist-icon` typo is documented, not migrated.
- [x] System-Chrome normal/fallback-off runs pass 1/1 each at desktop/390px
  with default/hover/focus, glyph, geometry, scoping, and no-navigation or
  editor-state-corruption coverage.
- [x] Fresh actual legacy/local screenshots were captured and inspected;
  checklist paint, glyph, baseline, and mobile overlay relation match. Clear
  Temporary and all non-checklist editor consumers remain outside this wave.

### 2026-07-22 Batch 799 board-post comment-update editor tabs

- [x] Four update-only StyleX owners carry the final frozen nav shell,
  five direct items, Edit/Preview links, and active state without changing the
  new-comment editor or React Link/tab behavior.
- [x] System-Chrome normal/fallback-off runs pass 1/1 each at desktop/390px
  with clearfix, exact paint/geometry, responsive 5px link padding, order,
  containment, alignment, non-overlap, hover, and active interaction.
- [x] Fresh actual legacy/local screenshots were inspected. Page-level legacy
  clips confirm tab → help → textarea order; the misleading form-element crop
  was rejected. Checklist/clear controls and all non-tab editor consumers stay
  outside this wave.

### 2026-07-22 Batch 798 board-post comment-update actions

- [x] Upload label, Cancel, and Save compose one exact frozen generic `.ybtn`
  owner; label display/transition and Save info paint remain final variants.
- [x] System-Chrome normal/fallback-off runs pass 1/1 each at desktop/390px
  with default/hover/focus paint, order, containment, button alignment,
  non-overlap, cancel, and save coverage.
- [x] Fresh actual legacy/local form screenshots were captured and inspected.
  Target action controls match; fixture body/tab differences and all non-action
  editor consumers remain outside this three-owner wave.

### 2026-07-22 Batch 797 board-post comment-update textarea/upload

- [x] Four route-local owners carry the final frozen textarea and upload
  wrapper/label/input cascade, including later Yobi and responsive winners.
- [x] System-Chrome normal/fallback-off runs pass 1/1 each at desktop/390px
  with focus, file-selection, cancel/save mutation, and geometry coverage.
- [x] Fresh legacy/local form screenshots were captured and inspected.
  Upload-drop overlay, generic buttons, tabs/preview, new-comment editor, and
  fallback deletion remain outside this wave.

### 2026-07-22 Batch 796 board-post open comment-update form

- [x] Four route-local groups own exact frozen hidden/open form, write-box,
  update textarea-box final cascade, and action spacing/alignment declarations.
  Existing edit/cancel/save behavior and Scala form contract remain intact.
- [x] System-Chrome normal/fallback-off runs pass 1/1 each at 1366px and 390px
  with source, computed declarations, direct scope, containment, and mutation.
- [x] Direct open-state screenshots match width exactly on desktop/mobile and
  differ only by 1px height plus the known 2px state offset. Textarea element,
  tabs, upload, buttons, notification, attachments, and other forms remain
  explicitly outside this wave.

### 2026-07-22 Batch 795 board-post comment section boundary/header

- [x] Four route-local groups own exact frozen wrapper desktop/mobile, header,
  comments yobicon, and divider declarations while preserving header → divider
  → list order, copy, count, and populated content.
- [x] The source-less React 18px wrapper margin remains fallback-owned. The
  Playwright config now consumes `PW_CHANNEL` and defaults to system Chrome;
  E2E/screenshot jobs are documented as outside-sandbox Chrome invocations.
- [x] Explicit system-Chrome normal/fallback-off runs pass 1/1 each at 1366px
  and 390px. Fresh paired screenshots render both sides and visual inspection
  confirms the target; only approved Yoram contact-removal geometry remains.

### 2026-07-22 Batch 794 board-post comment identity/actions/body

- [x] Six route-local groups own the exact frozen author, responsive avatar,
  time link, transparent action base, edit/delete yobicon, and final body
  declarations. The later markdown padding wins the responsive cascade.
- [x] The source-less React 20px action bridge remains fallback-owned and is
  not falsely attributed to legacy CSS.
- [x] System Chrome normal/fallback-off passes 1/1 each; fresh desktop/mobile
  paired screenshots render both targets. Search/user-menu shifts are approved
  consequences of the user's intentional Yoram footer/contact/repository
  changes, not gaps; legacy NAVER/NAVER LABS/Yona links remain excluded.

### 2026-07-22 Batch 793 board-post comment-card skeleton

- [x] Six route-local owners preserve the populated Scala comment list, row,
  avatar/wrap, media card/pointer/target/hover, and metadata skeleton while
  moving only exact frozen desktop/mobile declarations to StyleX. Existing
  profile/hash links and React reply/edit/delete behavior remain unchanged;
  body/actions/forms/attachments/tasklist/shared fallback stay excluded.
- [x] Explicit system-Chrome normal/fallback-off runs pass 1/1 each at 1366px
  and 390px with source/cascade proof, exact computed declarations and pseudo,
  hover/hash target, containment, and no overflow.
- [x] Fresh live paired screenshots render legacy/local 1/1 each. Comment size
  matches exactly at `1002×107` desktop and `386×135` mobile with a uniform 2px
  vertical state difference; direct inspection confirms visual card parity.
  Desktop search and mobile user-menu shifts are approved Yoram contact-item
  deviation consequences, not parity gaps.

### 2026-07-22 Batch 792 board-post Watch paint

- [x] The Watch button now preserves legacy `ybtn` plus conditional
  `ybtn-watching`; route-local StyleX owns exact default, hover/focus/active,
  watching, and watching-hover/focus declarations instead of unconditional
  green paint.
- [x] Explicit system-Chrome normal/fallback-off runs pass 1/1 each at 1366px
  and 390px, covering source ownership, exact paint/geometry, containment,
  and POST/DELETE watch/unwatch state transitions.
- [x] Fresh paired screenshots visually align the neutral Watch paint and
  retain the closed upload boundary. The navbar search x-position difference
  is the natural consequence of the approved Yoram developer-contact decision,
  not a screen gap: the legacy configured contact item precedes search, while
  Yoram omits it until a real public repository is configured.

### 2026-07-22 Batch 791 board-post editor/upload boundary

- [x] The populated comment editor preserves the legacy `tab-content` class
  while route-local StyleX owns Bootstrap's exact inactive/active pane
  `display:none`/`display:block` declarations; no compensating offset was
  added.
- [x] Explicit system-Chrome normal/fallback-off runs pass 1/1 each at 1366px
  and 390px, covering source ownership, computed pane state, editor/upload
  contact, containment, and Preview/Edit interaction.
- [x] The former 30px upload drift is closed: the fresh paired measurement
  moved local upload y from 1009 to 977 versus legacy 979. Fresh standalone
  Vite/system-Chrome rendering has no overlay or console error. Batch 792
  closed the separate Watch paint difference. The navbar search x-position
  difference is an approved Yoram contact-item deviation consequence, not a
  goal gap.

### 2026-07-22 Batch 790 board-post body/footer left floats

- [x] The body Watch group and footer keymap wrapper now own exact frozen
  Bootstrap `float:left`; their nested DOM, Watch mutation, modal behavior,
  and existing keymap spacing remain unchanged.
- [x] Explicit system-Chrome normal/fallback-off runs pass 1/1 each at 1366px
  and 390px with containment/alignment/no-overlap and Watch/keymap interactions.
- [x] Fresh paired screenshots retained the then-known upload/Watch gaps;
  Batches 791–792 closed both. The remaining navbar position difference is an
  approved Yoram identity/contact deviation consequence, not a parity gap.

### 2026-07-22 Batch 789 board-post responsive header metadata

- [x] Desktop and mobile date wrappers now own their exact frozen float,
  spacing, baseline visibility, 720px responsive visibility, and mobile font
  declarations through two route-local StyleX owners.
- [x] Explicit system-Chrome normal/fallback-off runs pass 1/1 each at 1366px
  and 390px with date copy/title parity, mutually exclusive visibility,
  containment, alignment, and no overlap.
- [x] The fresh paired desktop sweep retained the then-known upload/Watch gaps;
  Batches 791–792 closed both. The remaining navbar position difference is an
  approved Yoram identity/contact deviation consequence, not a parity gap.

### 2026-07-22 Batch 788 board-post comment action/reply controls

- [x] The populated parent-comment action row now owns frozen Bootstrap
  `float:right`, while the child Reply affordance owns its frozen float and
  complete `_page.less` paint/geometry/hover declarations through route-local
  StyleX. React state translates legacy hover and reply-form behavior.
- [x] Explicit system-Chrome normal/fallback-off runs pass 1/1 each at 1366px
  and 390px, covering hidden/hover-visible/click states, exact computed
  declarations, containment, action ordering, form visibility, and focus.
- [x] The fresh paired desktop sweep recorded the then-known 30px upload and
  Watch paint gaps; Batches 791–792 closed both. The remaining navbar position
  difference is an approved Yoram identity/contact deviation consequence.

### 2026-07-22 Batch 787 board-post edit-action spacing

- [x] The authenticated populated board-post detail moves both rendered post
  edit actions' exact `ml10`/`pt5px` declarations and the populated comment
  edit action's `ml10` declaration to two route-local StyleX owners.
- [x] Focused system-Chrome runs pass 1/1 in normal and fallback-off modes at
  1366px and 390px, covering exact margins/padding, three rendered instances,
  order, containment, no overlap, post edit navigation, and comment edit/cancel.
- [x] The fresh paired desktop sweep recorded the then-existing 30px upload and
  Watch paint gaps; Batches 791–792 closed both. The migrated edit controls
  visually align, and the remaining navbar position difference is an approved
  Yoram identity/contact deviation consequence.

### 2026-07-22 Batch 786 board-post delete-action spacing

- [x] The authenticated populated board-post detail moves all three rendered
  delete-action `.ml6` consumers (two post actions and one comment action) to
  route-local StyleX owners and removes the now-zero-consumer React bridge.
- [x] Focused system-Chrome runs pass 1/1 in normal and fallback-off modes at
  1366px and 390px, covering exact 6px margins, order, containment, no overlap,
  and post/comment delete-modal open and dismiss behavior.
- [x] Paired legacy/local desktop screenshots rendered the same populated state
  and recorded the then-existing 30px upload and Watch paint differences;
  Batches 791–792 closed both. The remaining navbar position difference is an
  approved Yoram identity/contact deviation consequence, not a follow-up gap.

### 2026-07-22 Batch 785 pull-request branch-icon fallback and screenshot proof

- [x] The populated pull-request overview removes only the final-cascade-
  ineffective `ml0` class and now-zero-consumer React-side `.ml0` bridge while
  preserving both icon elements, glyph classes, branch copy/order/navigation,
  the direction icon's `ml10`, and the frozen final 5px side margins.
- [x] Route-local StyleX owns the generic yobicon font/display contract and
  frozen branch/right-arrow pseudo glyphs. Focused system-Chrome runs pass 1/1
  in normal and fallback-off modes at 1280px and 390px, with non-zero glyph
  geometry and no overflow.
- [x] A separate `batch785` legacy instance was seeded outside the sandbox,
  given real Git history/branches and a disposable fork, and a populated
  `/admin/sample/pullRequest/1` was created. Real system-Chrome legacy
  desktop/mobile screenshots were captured and directly inspected alongside
  the local desktop/mobile captures. Whole-page copy, locale, asset, and
  approved Yoram footer differences remain outside the branch-icon owner;
  the branch-info DOM/order, two glyphs, 5px margins, and containment align.
  The route keeps raw `fromBranch`/`toBranch` values in code-link params while
  applying `branchItemName` only to visible labels, matching the legacy
  template's deep-link behavior for `refs/*` branches.
- [x] The legacy seed helper now defaults to system Chrome, so this proof also
  records the Playwright channel fix that prevents bundled-Chromium lookup
  failures during legacy bootstrap.

### 2026-07-22 Batch 783 issue vote heart glyph proof

- [x] Intentional product-copy deviation recorded: Yoram's footer omits the
  legacy NAVER/NAVER LABS provider links, and the developer-contact item uses
  the Yoram repository URL/copy. These are explicit user-authored Yoram
  identity/link changes, not parity gaps or follow-up items; screenshot review
  must preserve them rather than restore the legacy copy or destinations.

- [x] Active and disabled issue vote hearts preserve the `yobicon-hearts`
  element/class while the route-local StyleX owner carries the frozen yobicon
  font/glyph contract; comment hearts, modal icons, and unrelated consumers
  remain excluded.
- [x] Focused normal/fallback-off suites pass 2/2, covering Scala/icon source
  mapping, owner/declaration, computed font/display/pseudo-content, no inline
  style, active/disabled visibility, and the fallback cascade difference in
  line-height. The managed legacy issue screen has a real 1/1 desktop
  screenshot sweep, and paired local comparison runs through root-base Vite
  dev with system Chrome. The latest paired rerun passes legacy/local 1/1 with
  zero diff/local failures; sidebar geometry and issue-form height are aligned,
  so the previously recorded 456px-vs-410px gap is closed. Footer/provider and
  developer-contact differences are the approved Yoram identity deviation
  recorded above.

### 2026-07-22 Batch 784 issue-detail sidebar responsive cascade proof

- [x] The route-local `issueInfo` owner follows the final frozen cascade from
  `_responsive.less` (`@media all`, `padding: 15px 0 0 10px`) rather than
  stopping at the earlier `_page.less` 52px declaration.
- [x] Focused normal/fallback-off sidebar metadata checks pass 1/1 each, and
  the paired desktop sweep confirms the issue form's horizontal geometry now
  matches legacy. A fresh paired rerun passes both targets 1/1 with zero
  diff/local failures and closes the stale 456px-vs-410px vertical-gap record.

### 2026-07-22 Batch 782 vote and voter-list proof

- [x] Active issue vote/heart and voter avatar/overflow consumers preserve
  legacy DOM, copy/order, modal trigger behavior, and responsive geometry while
  route-local StyleX owns the frozen `_page.less:4230-4310` declarations and
  `_variables.less:15` base font; the separate voters modal remains excluded.
- [x] Focused normal/fallback-off checks pass 1/1, covering source roots/imports,
  all moved computed declarations, no inline styles, active overflow behavior,
  direct board-action scope, and desktop/390px geometry. The frozen vote
  `inline-block` computes as `block` under flex-item blockification. Screenshot
  parity remains a live-legacy gap.

### 2026-07-22 Batch 781 board action group float proof

- [x] The issue-detail board action group preserves its inner `pull-left`
  structure, watch/share/new-subtask/weight controls, copy/order, and responsive
  behavior while the route-local StyleX owner carries frozen Bootstrap
  `float:left`; unrelated action groups and attachment floats remain excluded.
- [x] Focused normal/fallback-off checks pass 1/1, covering source/import
  mapping, owner/declaration, computed float, no inline style, control order,
  direct scope, and desktop/390px containment. Screenshot parity remains a
  live-legacy gap.

### 2026-07-22 Batch 780 generic MarkdownEditor receiver-title proof

- [x] New-comment and comment-edit MarkdownEditor receivers preserve title
  class/copy/order while their per-instance StyleX owner carries the frozen
  `_page.less:7819-7821` color; child receiver remains separately scoped and
  notification-list badge rules remain excluded without a current consumer.
- [x] Focused normal/fallback-off suites pass 7/7, covering source roots and
  imports, owner/declaration, computed `rgb(153, 153, 153)`, no inline style,
  visible focus for both editor instances, child scope, and desktop/390px
  geometry. Screenshot parity remains a live-legacy gap.

### 2026-07-22 Batch 779 child notification receiver title proof

- [x] The child notification receiver title preserves its legacy class, copy,
  and order while the child-scoped StyleX owner carries the frozen
  `_page.less:7819-7821` color; parent/edit titles and notification-list badge
  rules remain excluded because there is no current child badge consumer.
- [x] Focused normal/fallback-off child-reply suites pass 5/5, covering source
  roots/imports, owner and computed `rgb(153, 153, 153)`, no inline style,
  child-vs-parent scope, copy/order, and desktop/390px geometry. Screenshot
  parity remains a live-legacy gap.

### 2026-07-22 Batch 778 child notification receiver proof

- [x] The authorized child notification receiver preserves DOM, title/list
  copy/order, focus behavior, hidden/focused-visible state, and child scope
  while StyleX owns the frozen `_page.less:7805-7817` wrapper declarations;
  parent/edit receivers, nested generic rules, and broad fallback remain
  excluded.
- [x] Focused normal/fallback-off child-reply suites pass 5/5, covering source
  roots/imports, all moved computed declarations, no inline style, direct child
  scope, copy/order, interaction, and desktop/390px geometry. Screenshot
  parity remains a live-legacy gap.

### 2026-07-22 Batch 777 child-comment form proof

- [x] The authorized child reply form preserves legacy action/encoding, hidden
  parent id, field names, placeholder, OK/notification copy/order, focus/Escape
  behavior, and classes while StyleX owns the frozen wrapper, textarea, and
  submit declarations; parent/comment forms, generic notification rules,
  unauthorized branch, and broad fallback consumers remain excluded.
- [x] Focused normal/fallback-off Playwright checks pass 3/3, covering source
  roots/imports, all moved declarations, no inline style, hidden/visible state,
  direct child scope, interaction, form contracts, and desktop/390px geometry.
  Computed submit `block` is documented as flex-item blockification of the
  frozen `inline-block`; screenshot parity remains a live-legacy gap.

### 2026-07-22 Batch 776 child-comment reply visual proof

- [x] The child reply `add-a-comment pull-right` preserves legacy copy/order,
  initial hidden and hover-visible states, click/focus behavior, and child form
  interaction while StyleX owns the frozen `_page.less:3049-3066` declarations;
  parent actions/attachments, child content/delete, existing child surface/form
  owners, and broad fallback consumers remain excluded.
- [x] Focused normal/fallback-off Playwright checks pass 2/2, covering every
  moved computed declaration, no inline style, direct child scope, interaction,
  and desktop/390px geometry. Live legacy port 9000 was unavailable, so
  screenshot visual parity remains a documented gap.

### 2026-07-22 Batch 775 child-comment reply float proof

- [x] Child reply `add-a-comment pull-right` preserves copy/order and the
  existing toggle/focus behavior while StyleX owns frozen Bootstrap
  `float:right`; no child attachment owner was added because legacy
  `childComments.scala.html` has no attachment wrapper; parent/contents/delete
  consumers remain excluded.
- [x] Focused normal/fallback-off Playwright checks pass 1/1 covering
  source/import, owner/declaration, computed float, no inline style, child
  scope, and desktop/390px geometry; the adjacent reply-focus test covers
  visible interaction/focus.

### 2026-07-22 Batch 774 parent issue-comment attachment float proof

- [x] The authenticated parent comment attachment wrapper preserves its
  `attachments pull-left` class, payload, AttachedFiles DOM/order, empty and
  populated behavior, and download link while route-local StyleX owns frozen
  Bootstrap `float:left`; issue-level, edit-form, and child-comment consumers
  remain excluded.
- [x] Focused normal and fallback-off Playwright checks pass 2/2, covering
  source/import mapping, stable owner/declaration, computed float,
  no-inline-style, direct parent scope, attachment content/order/download, and
  desktop/390px geometry.

### 2026-07-25 Batch 935 parent issue-comment attachment utility retirement

- [x] The authenticated parent comment attachment wrapper retains the
  semantic `attachments` class, payload, AttachedFiles DOM/order, empty and
  populated behavior, and download link while removing only the React-owned
  legacy `pull-left` utility; `styles.commentAttachments` continues to own
  the frozen `float:left` declaration. Issue-level, edit-form, and
  child-comment consumers remain excluded. The legacy administrator notice /
  sidebar collapse-button x-axis mismatch is a known legacy parity issue and
  is explicitly outside this wave.
- [x] Focused normal and fallback-off external Chrome checks pass 2/2 each,
  covering legacy source provenance, retained semantic class, absent utility
  class, computed float, no-inline-style, attachment content/order/download,
  and desktop/390px geometry.

### 2026-07-25 Batch 936 issue-detail board action utility retirement

- [x] The authenticated issue body board action group preserves its controls,
  copy/order, and responsive behavior while removing only the React-owned
  `pull-left` utility; `styles.boardActionGroup` continues to own the frozen
  `float:left` declaration. Comment rows, child replies, attachments, and
  sidebar/admin alignment remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering legacy source provenance, owner/declaration, absent utility class,
  computed float, no-inline-style, control order, and desktop/390px geometry.

### 2026-07-25 Batch 937 parent issue-comment action-row utility retirement

- [x] The authenticated parent comment action row retains its semantic
  `act-row`, edit/delete/translation/voter controls, copy/order, and
  interactions while removing only the React-owned `pull-right` utility;
  `styles.commentActionRow` continues to own frozen `float:right`.
  Child replies, attachments, board actions, and sidebar/admin alignment
  remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering legacy source provenance, owner/declaration, semantic class
  retention, utility-class absence, computed float, no-inline-style, control
  order, and desktop/390px containment.

### 2026-07-25 Batch 938 child issue-comment reply utility retirement

- [x] The child reply control preserves its semantic `add-a-comment` class,
  Reply copy, hidden/visible state, click/focus behavior, child form, and
  DOM/order while removing only the React-owned `pull-right` utility;
  `styles.childCommentReply` continues to own frozen `float:right`.
  Parent actions, attachments, board actions, and sidebar/admin alignment
  remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering legacy source/import provenance, owner/declaration, semantic class
  retention, utility-class absence, computed float, no-inline-style, direct
  child scope, interaction, and desktop/390px geometry.

### 2026-07-25 Batch 939 unauthorized issue-comment action utility retirement

- [x] The unauthorized comment form preserves its outer `write-comment-box`
  state, inner `right-txt`, disabled Add a comment copy, textarea/form DOM,
  and geometry while removing only the React-owned `mt10` utility;
  `styles.disabledCommentActions` continues to own frozen `margin-top:10px`
  and `text-align:right`. The outer unauthorized `mt20`, authorized editor,
  and other action consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering legacy source/import provenance, semantic class retention,
  utility-class absence, computed margin/text alignment, no-inline-style,
  disabled UX, and desktop/mobile geometry.

### 2026-07-25 Batch 940 public-profile Projects-tab project-row float ownership

- [x] The populated Projects-tab project row preserves the avatar fallback
  wrapper, semantic `info-wrap`/`stats-wrap`, project content, watch/leave
  controls, and responsive geometry while moving the legacy info `pull-left`
  and stats `pull-right` declarations into the existing `projectInfo` and
  `projectStats` StyleX owners. Other user-profile utility consumers remain
  excluded.
- [x] The focused `stylex-user-profile-project-row.e2e.ts` external Chrome
  check passes 1/1 in normal and 1/1 in fallback-off modes, covering Scala,
  LESS/Bootstrap/import provenance, absent React utility classes, computed
  floats/margins/alignment, no-inline-style, controls, desktop/mobile
  containment, and no overflow. The broader profile spec retains an
  unrelated pre-existing fallback-off `daysAgo` containment failure and is
  not the authoritative gate for this row wave.

### 2026-07-25 Batch 941 SVN commit-detail metadata float ownership

- [x] The SVN commit metadata preserves `commitId` copy/DOM, color, margin,
  font, author/date siblings, and desktop/mobile containment while removing
  only the React-owned `pull-right`; the existing `commitId` StyleX owner now
  owns frozen `float:right`. Git metadata, branch dropdown, footer,
  comments/reviews, and other consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering Scala/LESS/Bootstrap provenance, owner/declaration, utility-class
  absence, computed float, existing declarations, no-inline-style, and
  desktop/mobile geometry.

### 2026-07-25 Batch 942 pathful code-history pagination float ownership

- [x] The pathful code-history `Newer`/`Older` links preserve `actrow
  margin-top-20`, copy/order, query destinations, and responsive containment
  while removing only the React-owned `pull-left`; the existing
  `paginationLink` StyleX owner now owns frozen `float:left`. The pathless
  conditional state, history table, branch selector, breadcrumbs, and other
  float consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 2/2 each,
  covering Scala/LESS/Bootstrap/messages provenance, owner/declaration,
  utility-class absence, computed float, link interaction, no-inline-style,
  pathless state, and desktop/mobile containment.

### 2026-07-25 Batch 943 project-home History avatar utility retirement

- [x] The History activity avatar preserves the legacy `avatar-wrap` anchor,
  fallback avatar, 32x32 image, actor/history DOM and copy, and responsive
  geometry while removing only React-owned `pull-left mr10`; the existing
  StyleX owner retains exact `float:left` and `margin-right:10px`. Member-card
  avatars and unrelated history consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering Scala/LESS/Bootstrap/import provenance, owner/declaration,
  semantic class retention, utility absence, computed geometry, fallback
  attributes, no-inline/plugin-only attributes, and desktop/mobile containment.

### 2026-07-22 Batch 773 parent issue-comment action-row float proof

- [x] The parent comment `act-row pull-right` retains its legacy classes,
  children, order, copy, and interactions while route-local StyleX owns the
  frozen Bootstrap `float:right`; child rows, attachment `.pull-left`, and
  unrelated route consumers remain excluded.
- [x] Focused normal and fallback-off Playwright checks pass 1/1, covering
  source/import mapping, stable owner/declaration, computed float,
  no-inline-style, direct parent scope/order, and desktop/390px containment.

### 2026-07-22 Batch 772 parent issue-comment action spacing proof

- [x] The parent comment edit/delete buttons preserve legacy DOM, comment
  identity/title, order, and React interactions while route-local StyleX owns
  frozen `.ml10`/`.ml6` margins; translation and child-comment controls stay
  separately scoped.
- [x] Owner-focused normal and fallback-off Playwright checks pass 2/2,
  covering source/import mapping, owners/declarations, computed margins,
  no-inline-style, direct parent-row scope/order, and interaction ownership.
- [x] The broader focused run passed the two new owner assertions; two
  unrelated existing geometry expectations remain failing in the edit-form and
  delete-modal metric checks.

### 2026-07-22 Batch 771 issue-comment translation spacing proof

- [x] The configured issue-comment translation button preserves the legacy
  icon/button DOM, data-comment-id, title, pending/disabled behavior, request
  result, and adjacent edit/delete controls while route-local StyleX owns
  frozen `.ml10` `margin-left:10px`.
- [x] Focused normal and fallback-off Playwright checks pass 1/1, covering
  source/import mapping, owner/declaration, computed margin, no-inline-style,
  visible interaction, request payload/result, and scope boundaries.

### 2026-07-22 Batch 770 unauthorized issue-comment wrapper spacing proof

- [x] The unauthorized issue-comment state preserves the legacy wrapper,
  title/data-login, disabled textarea, action copy, and script-free behavior
  while route-local StyleX owns frozen `.mt20` `margin-top:20px`; existing
  `.mt10` action alignment remains separately owned.
- [x] Focused normal and fallback-off Playwright checks pass 1/1, covering
  source/import mapping, owner/declaration, computed desktop/mobile spacing,
  no-inline-style, disabled controls, and legacy script absence.

### 2026-07-22 Batch 769 issue-detail sharer title spacing proof

- [x] The authenticated issue-detail sharer title preserves the legacy
  `issue-share-title` `<dt>`, copy/count, reveal/read-only branches, and list
  interaction while route-local StyleX owns frozen `.mb10` `margin-bottom:10px`.
- [x] Focused normal and fallback-off Playwright checks pass 3/3, covering
  source/import mapping, owner/declaration, computed spacing, no-inline-style,
  reveal/open state, and read-only sharer copy/order/links.

### 2026-07-20 Batch 658 search empty-result image-owner proof

- [x] Global, project, and organization search empty-result owners emit the
  frozen `no_contents.jpg` background through runtime base-path-aware StyleX.
- [x] Retain the legacy empty-result element/class contract and frozen/generated
  fallback evidence; no `yona-original` source changed.
- [x] Focused E2E assertions cover all three image owners; unrelated baseline
  failures remain explicitly recorded in the parity report.

### 2026-07-20 Batch 659 project error-wrap owner proof

- [x] Project reviews empty, project posts empty, and project members
  authorization states own the frozen `.error-wrap` geometry, sprite icon
  geometry, and message typography through colocated StyleX.
- [x] Legacy classes/DOM/copy remain intact; the shared fallback stays active
  for other error states.
- [x] Normal and fallback-off focused Playwright checks pass for all three
  owners at desktop and mobile viewports.

### 2026-07-20 Batch 660 organization error-wrap owner proof

- [x] Organization boards, issues, and pull-request empty states own the
  frozen `.error-wrap`, `ico-err1` sprite, and message declarations through
  existing route-local StyleX modules.
- [x] Legacy classes/DOM/copy remain intact; the shared fallback remains for
  other error states and parent list geometry.
- [x] Normal and fallback-off focused Playwright checks pass for all three
  owners at desktop and mobile viewports.

### 2026-07-20 Batch 661 project/organization error-wrap owner proof

- [x] Project issue-list empty, project pull-request-list empty, and
  organization-members forbidden states own the frozen `.error-wrap`, sprite,
  and message declarations through colocated StyleX.
- [x] Legacy classes/DOM/copy remain intact; the shared fallback remains for
  all remaining error states.
- [x] Normal and fallback-off focused Playwright checks pass 3/3 for the three
  owners at desktop and mobile viewports.

### 2026-07-21 Batch 662 project detail error-wrap owner proof

- [x] Project issue-detail not-found, pull-request detail error, and
  pull-request changes error states own the frozen `.error-wrap`, `ico-err2`,
  and message declarations through colocated StyleX.
- [x] Legacy DOM/classes/copy, list navigation, and 403/404 branches remain
  intact; the shared fallback remains for other error consumers.
- [x] Serial managed Playwright checks pass 3/3 in normal and 3/3 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering desktop/mobile geometry.

이 문서는 매 turn의 대상 화면 재탐색을 없애는 실행 source of truth다. 다음 작업은 아래 ID 중 미완료 항목에서만 고른다. route 전체 검색은 `Refresh trigger`가 발생할 때만 수행한다. 검증은 `fast`와 `final`을 분리한다. 활성 wave의 체크는 fallback-off focused Chrome target 검증으로 빠르게 기록하고, live legacy screenshot pair와 global C/R 및 build 검증은 final visual-lock에서 기록한다. `fast` 완료는 pixel-perfect 최종 완료를 의미하지 않는다.

## Completion model

각 화면은 `fast` 진행 gate와 `final` 완료 gate를 구분한다. `StyleX` 파일이 있거나 route-local 후보가 없다는 이유만으로 완료 처리하지 않는다.

- `L`: legacy root/partials/LESS와 visible-state matrix 확인
- `O`: 모든 frozen-backed visual owner를 StyleX로 이전
- `E`: desktop/mobile 및 interaction focused E2E 통과
- `F`: fallback-off focused Chrome target 검증 통과; active wave의 빠른 진행 gate
- `C`: exact source/DOM search로 해당 fallback 소비자 0 확인
- `R`: 소비자 0인 fallback declaration/block 삭제
- `V`: live legacy screenshot pair와 exact pixel/geometry review 완료
- `✓`: L/O/E/F/C/R/V 모두 완료; final visual-lock만 완료로 집계

상태값은 `NEXT`, `READY`, `DEPENDENCY`, `DEFERRED`, `INVALID`, `COMPLETE`만 사용한다. `className`은 legacy DOM 계약일 수 있으므로 완료 판정 근거가 아니라 조사 우선순위 proxy다.

## Immediate queue

한 batch는 서로 다른 screen ID 3개, 총 12~18 owner를 기본으로 한다. worker는 독립 worktree에서 병렬 구현하고 integration worktree에서 browser/typecheck/Vitest/build를 한 번 실행한다.

| Order | IDs | Work | Dependency |
| --- | --- | --- | --- |
| 1 | StyleX owner / route wave | implement one focused owner lane and run `F` with the fast harness | frozen `yona-original` CSS/LESS stays immutable |
| 2 | Final visual-lock | capture live legacy pair, inspect exact pixel/geometry parity, then run global fallback/build checks | run after the active migration queue, not per wave |
| 3 | C/R selector families | retire only after final-lock global fallback-off run plus exact multi-route consumer proof | shared fallback retirement, not new screen ownership |
| 4 | SITE-04 / ROOT-01 / PROJECT-01 | last-consumer lanes after all shared-family proof | no isolated route owner remains |

## Canonical screen checklist

`Gates`의 `L-----`은 legacy mapping만 확인됐다는 뜻이다. 이전 ledger로 owner가 일부 존재하더라도 전체 state의 C/R gate가 증명되지 않았다면 `O`를 올리지 않는다.

### Shared, top-level, auth

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| HOME-01 | `/`: anonymous intro; authenticated dashboard; project/org/recent lists; flashes | `index/index.scala.html`, `partial_intro`, `sidebar`, `myProjectList*`, `allProjectList*`, `allOrganizationList*`, `myRecentIssueList*` | DEPENDENCY | L----- |
| HOME-02 | `/notifications`, `/notification`: empty/populated/expanded notification states | `index/notifications.scala.html`, `partial_notifications.scala.html` | DEPENDENCY | L----- |
| ROOT-01 | global navbar/usermenu/sidebar; anonymous/authenticated; login dialog/error | `common/navbar.scala.html`, `usermenu*.scala.html`, `loginDialog.scala.html`, site layout | DEPENDENCY | L----- |
| HELP-01 | `/_help`: TOC/FAQ closed/open and sprite states | `help/toc.scala.html` | COMPLETE | LOECR✓ |
| HELP-02 | shared markdown help navigation active/inactive | `help/markdown.scala.html` | DEPENDENCY | LOE--- |
| HELP-03 | markdown pane/table/code/task-list responsive states | `help/markdown.scala.html`; `_markdown.less`, `_responsive.less` | DEPENDENCY | LOE--- |
| SEARCH-01 | `/search`: residual category/avatar/content/body/meta/link/empty/error states | `search/result.scala.html`, `partial_search` and all result partials | DEPENDENCY | LOE--- |
| SEARCH-02 | `-search-screen`: dead `LegacySearchBody` removed; imported error bodies/predicates retained | same search templates | COMPLETE | L--CR✓ |
| SEARCH-03 | `/organizations/$organizationName/search`: categories, populated result types, empty | search templates and organization result partials | DEPENDENCY | LOE--- |
| SEARCH-04 | no safe retirement: bridge-only flex/reset/spacing, legacy DOM classes, and empty image/geometry remain | `_page.less:6375-6505`; generated frozen Yobi remains whole-module fallback | DEPENDENCY | ---C-- |
| SEARCH-05 | project search residual input/avatar/title/content/body/meta/link states | project search template and result partials | DEPENDENCY | LOE--- |
| DIR-01 | `/projects`: populated/empty/filter/pagination/fork/member states | `project/list.scala.html` | DEPENDENCY | L----- |
| DIR-02 | `/orgs`: populated/empty/filter/pagination | `organization/list.scala.html` | DEPENDENCY | L----- |
| CREATE-01 | `/projectform`: owner/scope/VCS/options/validation | `project/create.scala.html`, `common/select2.scala.html` | DEPENDENCY | L----- |
| IMPORT-01 | `/_import`: owner/scope/VCS/repo-auth/validation/submission | `project/importing.scala.html`, `common/select2.scala.html` | DEPENDENCY | L----- |
| MIG-01 | `/migration`: disabled/forbidden plus reachable source/destination/progress states | `migration/home.scala.html`, `migrationPageLayout.scala.html` | DEFERRED | L----- |
| AUTH-01 | `/users/loginform`: login/error/OAuth/already-authenticated redirect | `user/login.scala.html`, `common/loginDialog.scala.html` | DEPENDENCY | LOE--- |
| AUTH-02 | `/users/signupform`: validation/OAuth/restricted/success/error | `user/signup.scala.html` | DEPENDENCY | LOE--- |
| AUTH-03 | `/lostPassword`: anonymous/authenticated/requested/error | `site/lostPassword.scala.html` | DEPENDENCY | LOE--- |
| AUTH-04 | `/resetPassword`: valid form/validation/invalid token | `user/resetPassword.scala.html` | DEPENDENCY | LOE--- |
| AUTH-05 | `/restricted`, `/secret`, `/restart`: standalone restricted/setup/result states | `restricted.scala.html`, `welcome/secret.scala.html`, `welcome/restart.scala.html` | DEPENDENCY | LOE--- |
| UIKIT-01 | `/_UIKit`: controls, tabs/switches, labels/message demo states | `help/UIKit.scala.html` | DEFERRED | L----- |

### User and organization

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| USER-01 | `/$user`: profile plus issues/PR/projects populated/empty/not-found | `user/view.scala.html`, `partial_issues`, `partial_pullRequests`, `partial_projectlist` | DEPENDENCY | LOE--- |
| USER-02 | `/user/editform`: settings shell/profile/avatar upload-crop | `user/edit.scala.html`, `partial_edit_tabmenu` | DEPENDENCY | LOE--- |
| USER-03 | editform emails/password/notifications/token state matrices | `user/edit_{emails,password,notifications,token}.scala.html`, tab menu | DEPENDENCY | LOE--- |
| USER-04 | `/user/files`: empty/populated/search/actions/pagination | `user/userFiles.scala.html`, `common/mySeriesMenuTab.scala.html` | DEPENDENCY | LOE--- |
| USER-05 | `/user/issues`: open/closed/filter/quick-search/subtasks/pagination | `issue/my_list.scala.html`, `my_partial_*` | DEPENDENCY | LOE--- |
| USER-06 | direct issue form new/mine/comment-derived states | `issue/create.scala.html` | INVALID | L----- |
| ORG-01 | `/organizations/new`: form/validation/success/error | `organization/create.scala.html` | DEPENDENCY | LOE--- |
| ORG-02 | organization layout/home: header/menu/project/member/filter states | `organizationLayout`, `header`, `menu`, `view.scala.html` | DEPENDENCY | LOE--- |
| ORG-03 | settingform/members/delete: logo, enrollment, roles, modals | `organization/{setting,members,deleteForm}.scala.html`, `partial_settingmenu` | DEPENDENCY | LOE--- |
| ORG-04 | boards/issues/pullrequests open/closed/populated/empty/pagination | `group_{board,issue,pullrequest}_list*.scala.html` | DEPENDENCY | L----- |

### Project settings and home

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| PROJECT-01 | project layout/home readme/dashboard/history/nohead | `projectLayout`, `header`, `projectMenu`, `home`, `partial_readme`, `partial_dashboard*`, `partial_history` | DEPENDENCY | L----- |
| PROJECT-02 | setting/settingform loaded/error/validation | `project/setting.scala.html`, `partial_settingmenu` | DEPENDENCY | LOE--- |
| PROJECT-03 | changeVCS/delete/transfer/members | corresponding project templates plus setting menu | DEPENDENCY | L----- |
| PROJECT-04 | issue labels categories/labels CRUD | `project/issuelabels.scala.html`, `partial_issuelabels_*` | DEPENDENCY | L----- |
| PROJECT-05 | webhooks list/create/delete/test | `project/webhooks.scala.html`, `partial_webhooks_list` | DEPENDENCY | L----- |
| PROJECT-06 | watchers and statistics/chart states | `project/watchers.scala.html`, `project/statistics.scala.html` | DEPENDENCY | LOE--- |

### Issue, milestone, board

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| ISSUE-01 | issues filter shell/list/draft/empty/paging/mass-update | `issue/list.scala.html`, `partial_list*`, `partial_searchform`, `partial_massupdate` | DEPENDENCY | LOE--- |
| ISSUE-02 | issue create form/editor/options/upload/validation | `issue/create.scala.html`, assignee/label/subtask partials | DEPENDENCY | LOE--- |
| ISSUE-03 | issue detail header/body/sidebar/open-closed/error | `issue/view.scala.html` | DEPENDENCY | LOE--- |
| ISSUE-04 | issue comments/events/child/voter/attachment/modal states | `partial_comments`, `partial_history`, `partial_index_comments`, child/voter partials | DEPENDENCY | L----- |
| ISSUE-05 | issue edit loaded/editor/options/error | `issue/edit.scala.html`, assignee/label/subtask partials | DEPENDENCY | L----- |
| MILE-01 | milestone list open/closed/empty | `milestone/list.scala.html`, `partial_status` | COMPLETE | LOECR✓ |
| MILE-02 | milestone create/edit forms and validation | `milestone/create.scala.html`, `edit.scala.html` | COMPLETE | LOECR✓ |
| MILE-03 | milestone detail/progress/issues/mass-update/empty | `milestone/view.scala.html`, issue list/mass-update partials | DEPENDENCY | L----- |
| BOARD-01 | board list populated/empty/filter/paging | `board/list.scala.html`, `partial_list` | DEPENDENCY | LOE--- |
| BOARD-02 | board create/edit editor/upload/validation | `board/create.scala.html`, `edit.scala.html` | DEPENDENCY | L----- |
| BOARD-03 | post detail/body/sidebar/error | `board/view.scala.html` | DEPENDENCY | LOE--- |
| BOARD-04 | post comments/history/labels/attachments states | board comment/history and issue label partials | DEPENDENCY | L----- |

### Code, pull request, fork

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| CODE-01 | branches list/default/delete/error | `code/branches.scala.html`, `partial_branchrow` | COMPLETE | LOECR✓ |
| CODE-02 | repository/nohead/folder/tree/branch selector | `code/view.scala.html`, `nohead*.scala.html`, `partial_view_folder` | DEPENDENCY | L----- |
| CODE-03 | file/binary/rendered/code/error states | `partial_view_file.scala.html` | DEPENDENCY | L----- |
| CODE-04 | commit history root/branch/file/empty/paging | `code/history.scala.html` | DEPENDENCY | L----- |
| CODE-05 | commit detail metadata/diff/comments/binary | `code/diff.scala.html`, code-comment/shared diff partials | DEPENDENCY | L----- |
| CODE-06 | compare valid/empty/invalid/SVN | `code/compare.scala.html`, `compare_svn.scala.html` | DEPENDENCY | L----- |
| PR-01 | open/sent/closed lists/filter/paging/empty | `git/list.scala.html`, `partial_search`, `partial_list`, `partial_state` | DEPENDENCY | LOE--- |
| PR-02 | create/edit branch/source/form/validation | `git/create.scala.html`, `edit.scala.html`, branch partials | DEPENDENCY | L----- |
| PR-03 | detail open/merged/closed/info/state | `git/view.scala.html`, `partial_branch`, `partial_info`, `partial_state` | DEPENDENCY | L----- |
| PR-04 | detail events/reviews/merge outcomes/modals | `partial_pull_request_event`, `partial_reviewlist`, `partial_merge_result` | DEPENDENCY | L----- |
| PR-05 | changes aggregate/commit diff/comments/reviews | `git/viewChanges.scala.html`, shared diff and review partials | DEPENDENCY | L----- |
| PR-06 | reviews list populated/empty/filter/paging | `reviewthread/list.scala.html`, `partial_list`, `common/reviewForm` | DEPENDENCY | L----- |
| FORK-01 | fork owner choice/progress/error/list | `git/fork.scala.html`, `partial_forklist` | COMPLETE | LOECR✓ |

### Site administration

| ID | Route / visible states | Legacy root and principal partials | Status | Gates |
| --- | --- | --- | --- | --- |
| SITE-01 | user/project/issue/post lists: filters, states, empty, pagination, modals | `site/{userList,projectList,issueList,postList}.scala.html`, pagination partials | READY | L----- |
| SITE-02 | mail/massmail form, selection, preview/result/error | `site/mail.scala.html`, `massMail.scala.html` | READY | L----- |
| SITE-03 | data/diagnostic/update result and error states | `site/{data,diagnostic,update}.scala.html`, update notification | READY | L----- |
| SITE-04 | shared site management layout/sidebar/pagination retirement | `siteMngLayout.scala.html`, pagination partials | DEPENDENCY | ------ |

## Resolved execution map

This is the lookup table used to select future work. It deliberately records the actual React
screen owner rather than a TanStack wrapper path; wrappers are listed only in **Non-screen route
files**. Counts are conservative logical owner groups, not `className` counts. A row with existing
StyleX owners still stays in this map until its `C/R` gates are proven.

| IDs | Actual React owner(s) | Scheduling lane / hard dependency | Remaining groups |
| --- | --- | --- | --- |
| HOME-01, HOME-02, ROOT-01 | `index.tsx`, `-home-route-screen.tsx`, `notifications.tsx`, `notification.tsx`, `__root.tsx` | final shared shell lane; ROOT-01 last | 4–8 each |
| HELP-02, HELP-03 | `[_]help.tsx`, `-legacy-markdown-help.tsx` | shared responsive `!important` fallback | 4–6 |
| SEARCH-01, SEARCH-03, SEARCH-05 | `search.tsx`, `organizations/$organizationName/search.tsx`, `$ownerName/$projectName/search.tsx` | schedule together before SEARCH-04 retirement decision | 5–6 each |
| DIR-01, DIR-02 | `projects.tsx`, `orgs.tsx` | shared list/pagination | 5 each |
| CREATE-01, IMPORT-01 | `projectform.tsx`, `[_]import.tsx` | shared form/Select2 | 5–6 each |
| AUTH-01..05 | `users/loginform.tsx`, `users/signupform.tsx`, `lostPassword.tsx`, `resetPassword.tsx`, `restricted.tsx`, `secret.tsx`, `restart.tsx` | shared auth/mobile fallback | 3–6 each |
| USER-01 | `$user.tsx`, `-user-profile.stylex.ts` | profile/list/tab fallback | 14–20 |
| USER-02, USER-03 | `user/editform.tsx`, `user/editform/{emails,password,notifications,token}.tsx` | same tab/form owner; serialize shared selector retirement | 8–14 total |
| USER-04, USER-05, USER-06 | `user/files.tsx`, `user/issues.tsx`, `user/issues/-direct-issue-form-screen.tsx` | USER-06 delegates project issue editor; files/issues share list controls | 6–22 |
| ORG-01 | `organizations/new.tsx` | shared form fallback | 4–7 |
| ORG-02 | `organizations/$organizationName.tsx` | parent owns legacy organization layout; `index.tsx` is wrapper only | 8–12 |
| ORG-03, ORG-04 | `organizations/$organizationName/{settingform,members,deleteForm,boards,issues,pullrequests}.tsx` | setting menu; then list/filter/pagination; closed PR is wrapper | 12–30 |
| PROJECT-01 | `$ownerName/$projectName.tsx` | project header/menu shared by all project routes; final project-shell lane | 6+ |
| PROJECT-02, PROJECT-03 | `$ownerName/$projectName/{setting,settingform,changeVCS,deleteform,transfer,members}.tsx` | shared setting menu/forms; serialize common selector retirement | 4–8 |
| PROJECT-04, PROJECT-05 | `$ownerName/$projectName/issue/labelsform.tsx`, `$ownerName/$projectName/webhooks.tsx` | Select2/label and list/form fallback | 4–6 |
| PROJECT-06 | `$ownerName/$projectName/{watchers,statistics}.tsx` | independent routes but currently retained as C/R evidence work, not a fresh skeleton target | 3–6 |
| ISSUE-01, ISSUE-02 | `$ownerName/$projectName/{issues,issueform}.tsx` | list/editor foundations | 6+ |
| ISSUE-03 → ISSUE-04 → ISSUE-05 | `$ownerName/$projectName/issue/$issueNumber.tsx`, `.../editform.tsx` | same detail owner: header/body before comments/events, then edit | 5–6 each |
| MILE-01, MILE-02, MILE-03 | `$ownerName/$projectName/{milestones,newMilestoneForm,milestone/$milestoneId, milestone/$milestoneId/editform}.tsx` | list/form parallel; detail waits issue mass-update/list | 4–6 each |
| BOARD-01, BOARD-02, BOARD-03 → BOARD-04 | `$ownerName/$projectName/{posts,postform,post/$postNumber,post/$postNumber/editform}.tsx` | board detail comments/history must follow detail; no `boards.tsx` exists for project posts | 5–6 each |
| CODE-01, CODE-02 → CODE-06 | `$ownerName/$projectName/{branches,code,code/$branch,code/$branch/$filePath,commits,commit/$commitId,compare/$revisionRange}.tsx` | branch/tree/file/history/diff/compare; tree and diff are prerequisite owners | 4–6 each |
| PR-01, PR-02, PR-03 → PR-04, PR-05, PR-06 | `$ownerName/$projectName/{pullRequests,newPullRequestForm,pullRequest/$pullRequestNumber,pullRequest/$pullRequestNumber/changes,reviews}.tsx` | detail events follow detail; changes/reviews wait code diff/review foundations | 5–6 each |
| FORK-01 | `$ownerName/$projectName/newFork.tsx` | use after project-shell contract is stable | 4–6 |
| SITE-01, SITE-02, SITE-03 → SITE-04 | `sites/{userList,projectList,issueList,postList,mail,massmail,data,diagnostic,update}.tsx`, `sites/-pagination.tsx` | shared site layout/sidebar/pagination is a strict last-consumer lane | 4–18 |
| MIG-01, UIKIT-01 | `migration.tsx`, `[_]UIKit.tsx` | deferred; never selected without an explicit scope change | n/a |

Selection protocol: choose only the first eligible IDs from **Immediate queue** and this map;
update the selected row after integration. Do not re-run a route-wide discovery scan unless a
**Refresh trigger** applies. A worker receives the exact owner path(s) above, legacy root,
permitted write scope, and the indicated serial edge.

### 2026-07-19 reconciliation evidence

The initial `READY` labels were disproved by commit/audit/E2E evidence during Batch 530. This
is a checklist correction, not completion inferred from a `className` count. The following
rows have already exhausted their isolated route-owner work: MILE-01 (`c6b811c10`), MILE-02
(`220b374a7`), CODE-01 (`9830dfd57`), CODE-02 (`998d2850e`), CODE-06 (`f49ef50e3`), ISSUE-02
(`d378c69ad`), ISSUE-05 (`c46b4c6d0`), BOARD-02 (`f9d91e9b4`), and FORK-01 (`982b58738`).
The remaining Issue/Milestone/Board/Code/PR rows have a route-local StyleX module, focused
E2E, Scala audit row, and ledger record; they are C/R or shared-fallback evidence lanes unless a
new exact legacy declaration is identified. They are not candidates for a duplicate route
skeleton or audit row.

Batch 530 adds the missing scoped owners for ORG-02 header/menu and BOARD-01 populated rows;
both retain shared or responsive fallback and therefore remain `DEPENDENCY | LOE---`. The next
worker allocation must make this narrow preflight check against the row's listed commit/audit/E2E
before editing. This replaces rediscovering the complete route universe each turn.

Batch 531 extends that correction. ORG-03's `settingform` loaded state is already fully
ownerized (`fec32816f`, `a25280f8f`, `ab73a957f`, `f2232a400`); PROJECT-03's `transfer` state
is C/R-only (`ebfd91c33`, `12edafb25`, `6753f0854`). USER-06 is invalid as a separate styling
target: both direct-user paths choose a project then delegate their complete visible surface to
the project issue form. HOME-01, HOME-02, and ROOT-01 are also C/R-only: their actual
authenticated/anonymous home, notification, navbar/usermenu/sidebar, toast, and login-dialog
owners already reside in `-home-route-screen.tsx`/`__root.tsx` with focused E2E and audit evidence.
Shared fallback is not authority to add duplicate wrapper StyleX owners. The next preflight is
therefore restricted to the unverified directory/create/import lane rather than these rows.

## Batch 531 full-refresh result

The narrow follow-up preflights disproved the last apparent leaf candidates: DIR-01,
CREATE-01, IMPORT-01, and BOARD-01 have complete route-local owner coverage. BOARD-01's
remaining empty result and pagination are global `.error-wrap` / `.page-navigation-wrap` families;
its filter/sort state is already StyleX-owned. Adding a board-only owner would duplicate shared
geometry and is forbidden. **There is no eligible independent route-owner migration remaining in
the 110 routable-entry inventory.**

This table supersedes stale `L-----`, `READY`, and grouped labels as a selection source. `C/R-only`
means the route's direct owner is migrated and its remaining work is exact shared-fallback consumer
proof/retirement; it does not mean the overall fallback module is retired.

### 2026-07-20 refresh after Batch 505

The declaration-level refresh found no additional safe route-local owner wave or dead fallback
arm. `.task-list-item*` and `.hljs-*` remain plugin-generated families and are deferred; the
nested `.issue-form-project-header` arm has neither a current emitter nor frozen legacy selector
evidence and is therefore not removable. The utility aliases `.ml20`, `.mr6`, `.mt4`, `.vtop`,
and `.vertical-top` were retired in bounded waves through commits `d06928c0a`, `e24cf4215`,
`1e3c8a60f`, `151268fcf`, and `2007c2fe8`. The next eligible work is an exact shared-fallback
consumer graph or an explicit deferred-scope decision; do not repeat route discovery or remove
plugin/global rules without that evidence.

The issue-state badge family is not a dead-arm candidate: issue/$issueNumber.tsx, milestone,
pull-request, and frozen git/partial_info.scala.html consumers emit the shared badge-issue-*
classes. Batch 655 now gives the milestone and pull-request owners the same base/state StyleX
declarations as the existing issue-detail owner; the shared family remains C/R work until an
exact all-consumer retirement proof is assembled.

| Classification | IDs |
| --- | --- |
| Complete isolated owners | HELP-01, SEARCH-02, ISSUE-02, ISSUE-05, MILE-01, MILE-02, BOARD-02, CODE-01, FORK-01 |
| C/R-only or grouped shared-owner lanes | HOME-01/02, ROOT-01, HELP-02/03, SEARCH-01/03/04/05, DIR-01/02, CREATE-01, IMPORT-01, AUTH-01..05, USER-01..05, ORG-01..04, PROJECT-01..06, ISSUE-01/03/04, MILE-03, BOARD-01/03/04, CODE-02..06, PR-01..06, SITE-01..03 |
| Invalid independent screen | USER-06 (delegates entirely to project issue-form); SITE-04 (shared site layout/pagination last-consumer lane) |
| Deferred | MIG-01, UIKIT-01 |

The next execution unit is not another route discovery pass. It must be a declaration-level
shared-fallback retirement batch with an exact consumer graph that names every affected route,
or a deferred-scope decision for a plugin/global rule. A route TSX/E2E/audit row may be changed
only when that graph identifies an actual missing visible owner.

### 2026-07-20 Batch 656 issue-state badge C/R proof

The complete current React production emitter graph is exactly the issue-detail,
milestone-detail, and pull-request-overview state badges. Each keeps the legacy
badge element/classes and has a colocated StyleX base/state owner with the exact
frozen declarations, including the `#777` base. Retire only the React-side
`app.css` badge family; retain generic `.badge`, responsive `.badge-small`,
frozen LESS, and generated fallback evidence.

### 2026-07-20 Batch 657 search empty-result C/R proof

The complete current React production emitter graph for `.empty-result` is
global search, project search, and organization search. Each visible empty
state has a stable StyleX owner and preserves the legacy class/DOM. Retire
only the React-side `app.css` arm; retain frozen search partial/LESS and
generated fallback evidence.

## Non-screen route files

다음은 별도 migration target으로 세지 않는다. 해당 owner screen의 state로만 추적한다.

- index/splat/delegate wrappers under project code, commits, issue, milestone, post, PR changes, fork
- `users/login.tsx`, `user/issues_/new.tsx`, its `index.tsx` and `mine.tsx`
- organization index and closed-pull-request delegates
- `notifications.tsx`, `notification.tsx` wrappers
- `sites/-pagination.tsx`, `-last-outlet-transition.tsx`
- colocated `*.stylex.ts`, CSS, asset modules

## Dependency graph

```text
leaf route/state owners (parallel, 3 workers)
    ├─ forms → shared editor / Select2 / uploader
    ├─ lists → shared list / pagination
    ├─ code → tree / diff → PR changes / reviews
    └─ org/project/user settings → shared menu/tab
                         ↓
exact source + rendered DOM consumer audit
                         ↓
shared navbar/usermenu/layout/Bootstrap/plugin fallback retirement
```

## Already completed or invalidated waves

- A1 issue detail body/sidebar, A2 populated issue list, A3 project setting boxes
- B1 issueform editor shell, B3 project search
- C1 top-level search populated-family ownership (empty/error/shared retirement remains SEARCH-01/04)
- D1 organization setting top box
- SEARCH-02 dead shared renderer and its private subtree
- SEARCH-03 organization category/result-title/item-avatar/title/content-meta/empty owners; C/R waits for SEARCH-01/05
- SEARCH-01/05 global and project residual search owners; SEARCH-04 audit found no declaration-safe bridge retirement
- HELP-01 FAQ owner family, including corrected static → dynamic → conditional sprite composition
- HELP-02 markdown navigation and HELP-03 pane/content owners; frozen responsive important rules remain a shared dependency
- AUTH-01 standalone login residuals and AUTH-02 signup capability-state owners; shared form/login fallback remains a dependency
- AUTH-03 lost-password state family, AUTH-04 reset valid/validation/invalid-token family, and AUTH-05 restricted/secret/restart family owners; shared auth and frozen mobile important fallback remain dependencies
- USER-02 profile/avatar/upload/crop owners, USER-03 email valid/pending row completion with existing sibling-route owners, and USER-04 files empty/populated/search/action/pagination owners; shared form and current bridge fallback remain dependencies
- USER-01 public profile root, USER-05 current-user issue controls, and ORG-01 create duplicate-name validation ownership; shared tabs/forms/pagination/generated fallback remain dependencies
- B2 requested PR selectors: `INVALID`; cited LESS was unrelated posting-history diff CSS and must not count as completion

## Dead residual cleanup

Deletion-only candidates. Each requires declaration-level exact source/DOM proof; broad subtree deletion is forbidden.

- [x] `.milestones .desc` — Batch 538: the current React milestone list emits no `.desc`; only the exact rendered Yobi descendant rule is excluded while progress-wrap, actrow, and completion-rate remain.
- [x] `#notification-projects li button` base/hover/active — Batch 538: legacy and React notification tabs emit anchors/Links, and the React owner owns the corresponding list/link states.
- [x] `.profile-frmwrap .avatar-frm` — 2026-07-20 consumer graph: no legacy or React output
  emits the `profile-frmwrap` ancestor, and the deterministic generated-fallback exclusion already
  removes this root plus its descendants. Direct avatar StyleX owners retain the live geometry.
- [x] `.all-projects .project .forked` — 2026-07-20 consumer graph: no React `forked` output
  exists, and the exact compiled Yobi selector is already excluded from generated fallback; fork
  origin presentation uses separate React-owned output.
- [x] `.small-font` — 2026-07-20 organization-home consumer graph: the two live
  organization project-card spans now use the route-local `styles.smallFont`
  owner; the shared app.css arm is retired while frozen/generated evidence remains.
- [x] `.stats-wrap .like` variants — Batch 537: duplicate/consumer-free rendered Yobi selectors retired; no active module was unlinked.
- [x] individual `.site-admin-page` declarations only after SITE-01..04 (never the subtree as one item).
  The 2026-07-20 graph confirms this is an inactive `app.css` bridge with no React DOM ancestor, but its
  declaration groups and static contracts retired through the bounded Batch 549/550 waves recorded in
  the ledger; the unchecked marker was stale and must not be selected again.

## Refresh trigger

Full inventory refresh is allowed only when:

1. every `NEXT`/`READY` row is exhausted;
2. a shared selector loses its last consumer;
3. a route changes its visible DOM/state ownership;
4. the sorted route file set differs from the 116-file snapshot;
5. a checklist row is disproved by legacy or runtime evidence.

Otherwise update only the completed screen row and select the next IDs from this document. Do not rescan all routes per turn.

### 2026-07-20 declaration refresh decision (Batch 654)

The complete current React/TSX and frozen legacy inventory has no additional safe source-less
`app.css` bridge. The only unmatched selector families are plugin-generated `hljs-*` syntax
highlighting and `.issue-form-project-header`, which has no frozen legacy selector/declaration
evidence. Both remain deferred; no route-owner wave or fallback deletion is authorized without
new producer/source evidence.

### 2026-07-21 Batch 663 project error-wrap detail-state owner proof

Batch 663 adds exact route-local owners for the project-members error shell,
code-file branch-not-found state, and milestone not-found state. The workers
preserve the existing legacy classes and navigation while moving only the
frozen `_page.less`/`_sprites.less` declarations into colocated StyleX. The
shared `.error-wrap` fallback remains for the still-unmigrated React emitters;
normal and fallback-disabled focused runs both pass 3/3 serially.

### 2026-07-21 Batch 664 search/post error-wrap owner proof

Batch 664 adds exact route-local owners for project post not-found,
project-search forbidden, and organization-search error states. The frozen
`_page.less`/`_sprites.less` declarations are colocated without changing the
existing shells, copy, or login/list behavior. The shared `.error-wrap`
fallback remains for other React emitters; normal and fallback-disabled
focused runs both pass 3/3 serially.

### 2026-07-21 Batch 665 form error-wrap owner proof

Batch 665 adds exact route-local owners for project issue-edit not-found,
pull-request-edit 403/404, and new-pull-request 400 states. The frozen
`_page.less`/`_sprites.less` declarations are colocated without changing the
existing project shells, copy, or list/navigation behavior. The shared
`.error-wrap` fallback remains for other React emitters; normal and
fallback-disabled focused runs both pass 3/3 serially.

### 2026-07-21 Batch 666 error-wrap owner proof

Batch 666 adds exact route-local owners for secret not-found, project
issue-labels empty, and project webhooks empty states. The frozen
`_page.less`/`_sprites.less` declarations are colocated without changing the
existing global/project shells, copy, or settings navigation. The shared
`.error-wrap` fallback remains for other React emitters; normal and
fallback-disabled focused runs both pass 3/3 serially.

### 2026-07-21 Batch 667 error-wrap owner proof

Batch 667 adds exact route-local owners for project milestones empty and
organization directory empty states. The frozen `_page.less`/`_sprites.less`
declarations are colocated without changing the existing project/global
shells, tabs, search/navigation, or copy. The shared `.error-wrap` fallback
remains for other React emitters; normal and fallback-disabled focused runs
both pass 2/2 serially.

### 2026-07-21 Batch 668 error-wrap owner proof

Batch 668 adds an exact route-local owner for the current-user issues empty
state. The frozen `_page.less`/`_sprites.less` declarations are colocated
without changing the existing user issues shell, search/filter tabs,
interaction, or copy. The shared `.error-wrap` fallback remains for other
React emitters; normal and fallback-disabled focused runs both pass 1/1
serially.

### 2026-07-21 Batch 669 error-wrap owner proof

Batch 669 adds exact owners for the shared search error family, the four
public user-profile empty panels, and the root alias not-found state. The
frozen `_page.less`/`_sprites.less` declarations are colocated without
changing search variants/navigation, profile tab state/copy, or the root
not-found shell. Combined focused runs pass 3/3 normally and 3/3 with the
legacy fallback disabled; the shared `.error-wrap` fallback remains for
other React emitters.

### 2026-07-21 Batch 670 error-wrap owner proof

Batch 670 adds exact owners for the project generic internal-error shell and
the public missing-user not-found shell. The frozen `_page.less`/`_sprites.less`
declarations are colocated without changing project/profile shells, copy, or
home navigation. Focused runs pass 2/2 normally and 2/2 with the legacy
fallback disabled; an unreachable dead post-detail producer was inspected
and explicitly excluded from the wave.

### 2026-07-21 Batch 671 shared fallback retirement proof

Batch 671 removes only the React-side `app.css` `.error-wrap` wrapper/icon/
message bridge after the reachable consumer graph confirms colocated StyleX
ownership across 29 route/owner groups. Reset-password-specific selectors,
the frozen source, generated fallback, and the explicitly unreachable stale
post producer remain. Static/runtime proof passes 2/2 normally and 2/2 with
the legacy fallback disabled.

### 2026-07-21 Batch 672 organization home menu owner proof

ORG-02 organization home menu items now own the frozen menu `li` and Link
declarations through route-local StyleX: float, font weight/size, position,
inline-block display, line-height, desktop/mobile padding, and hover paint.
The legacy active classes and TanStack Router links remain unchanged. Focused
normal and fallback-off checks pass 1/1 each at desktop and mobile viewports.

### 2026-07-21 Batch 673 organization home project-card owner proof

ORG-02 project-card/filter output now owns the frozen `all-projects .project`
padding, overflow, and border declarations through conditional route-local
StyleX. The legacy class, item-search filtering, card order, and links remain
unchanged. Focused normal and fallback-off checks pass 3/3 each, covering
static source mapping plus desktop/mobile card geometry and filtering.

### 2026-07-21 Batch 674 organization home membership-panel owner proof

ORG-02 membership panels now own the frozen `.project-home` inner panel,
header, `.project-members`, and `.member` declarations through route-local
StyleX. Legacy classes, member links, labels, leave interaction, and panel
containment remain unchanged. Focused normal and fallback-off checks pass 5/5
each, covering source mapping plus desktop/mobile panel geometry and visible
member links.

### 2026-07-21 Batch 675 organization home header/overview owner proof

ORG-02 organization-home header and overview now own the frozen
`project-home-header`, `project-overview`, and overview `h3` declarations
through route-local StyleX. Legacy classes, description copy, ordering, and
responsive containment remain unchanged. Focused normal and fallback-off
checks pass 6/6 each, covering source mapping plus desktop/mobile computed
geometry and visible description copy.

### 2026-07-21 Batch 676 organization home project-card inner owner proof

ORG-02 loaded project cards now own the frozen avatar, header, description,
name-tag, and stats declarations through route-local StyleX. Clone/search and
member-panel declarations remain outside this wave; project links, filtering,
visibility branches, and responsive containment remain unchanged. Focused
normal and fallback-off checks pass 3/3 each, covering source mapping, all
inner owners, desktop/mobile computed geometry, visible content, and filter
interaction.

### 2026-07-21 Batch 678 organization home project-list outer owner proof

ORG-02 project-list output now owns the frozen `.all-projects` margin,
list-style, and clear declarations through the existing route-local StyleX
owner. Legacy list/card classes, DOM order, links, filtering, and responsive
containment remain unchanged. Focused normal and fallback-off checks pass
3/3 each, covering source mapping, computed list geometry, visible projects,
and filter interaction.

### 2026-07-21 Batch 680 organization home create-project owner proof

ORG-02 conditional Create new project output now owns the frozen Bootstrap
`pull-right` float through a route-local StyleX owner. The wrapper class,
Link/copy/query, conditional visibility, project filtering, and responsive
containment remain unchanged; generic button/grid declarations stay fallback-
owned. Focused normal and fallback-off checks pass 3/3 each, covering source
mapping, computed float/geometry, visible Link, and filtering.

### 2026-07-21 Batch 681 organization home project-card stats owner proof

ORG-02 project-card stats output now owns the frozen Bootstrap `.pull-right`
float through a route-local StyleX owner. The legacy wrapper class, counts,
icons, watch state, filtering, and responsive containment remain unchanged;
unrelated generic float consumers stay fallback-owned. Focused normal and
fallback-off checks pass 3/3 each, covering source mapping, computed
float/geometry, stats visibility, and filtering.

### 2026-07-21 Batch 682 organization home menu-inner owner proof

ORG-02 organization menu output now owns the frozen `.project-menu-inner`
`height: 39px` and `margin: 0 auto` declarations through a route-local
StyleX owner. Legacy menu classes, DOM order, links, active state, settings
visibility, and responsive containment remain unchanged. Focused normal and
fallback-off checks pass 1/1 each, covering source mapping, computed
desktop/mobile geometry, containment, and menu behavior.

### 2026-07-21 Batch 683 organization home menu-nav owner proof

ORG-02 organization menu main/settings lists now own the frozen
`.project-menu-nav` `list-style: none`, `margin: 0`, and `height: 39px`
declarations through one route-local StyleX owner. The main group's existing
`margin-left: 110px` offset, legacy classes, links, active state, settings
visibility, and responsive containment remain unchanged. Focused normal and
fallback-off checks pass 1/1 each, covering source mapping, computed
desktop/mobile list geometry, containment, and menu behavior.

### 2026-07-21 Batch 684 organization home page-wrapper owner proof

ORG-02 organization home output now owns the frozen `.page-wrap-outer` base
and effective responsive declarations through the existing route-local StyleX
owner: min-height, margin-top, min-width, padding, width, and box-sizing.
Legacy wrapper DOM/class, color, child layout, filtering, and responsive
containment remain unchanged. Focused normal and fallback-off checks pass 3/3
each, covering source mapping, computed desktop/mobile wrapper geometry, and
project filtering/visibility.

### 2026-07-21 Batch 685 organization home search-wrapper owner proof

ORG-02 organization home search output now owns the frozen `.mt10`
`margin-top: 10px` declaration through a route-local StyleX owner. Search
wrapper classes/DOM/order, controls, Create new project action, filtering, and
responsive containment remain unchanged; unrelated utility consumers stay
fallback-owned. Focused normal and fallback-off checks pass 3/3 each,
covering source mapping, computed desktop/mobile wrapper margin/containment,
and filtering/visibility.

### 2026-07-21 Batch 686 organization home search-column owner proof

ORG-02 organization home search output now owns the emitted Bootstrap `span7`
fluid-grid declarations through a route-local StyleX owner: desktop float,
fluid width, first-column margin behavior, min-height, box sizing, and the
mobile float/width/margin transition. Legacy class/DOM/order, controls,
Create new project action, filtering, and responsive containment remain
unchanged; unrelated grid consumers stay fallback-owned. Focused normal and
fallback-off checks pass 3/3 each, covering source mapping, computed
desktop/mobile column geometry, containment, and filtering/visibility.

### 2026-07-21 Batch 687 organization home outer-column owner proof

ORG-02 organization home main/member output now owns the emitted Bootstrap
`span9`/`span3` fluid-grid declarations and frozen `span-hard-wrap` responsive
min-width/viewport-width cascade through route-local StyleX owners. Legacy
classes, two-column DOM/order, header/search/project/member content, filtering,
and responsive containment remain unchanged; unrelated grid consumers stay
fallback-owned. Focused normal and fallback-off checks pass 3/3 each,
covering source mapping, computed desktop/mobile column geometry,
containment, and filtering/visibility.

### 2026-07-21 Batch 688 global fallback-off discovery classification

The complete managed fallback-off suite ran with desktop and mobile cases: 2,675 tests yielded
1,541 passed, 1 skipped, and 1,133 failed in 49.4 minutes. The failure artifacts are classified
in `docs/provenance/ui-parity-reports/fallback-off-2026-07-21.md` into 449 React StyleX owner
candidates, 40 global/shared bridge candidates, 641 route DOM/behavior/data parity failures, and
3 fallback-boundary/static contract failures. This is discovery evidence only: the fallback stays
enabled by default, no shared selector is retired, and the next repair wave must re-prove the
exact frozen consumer boundary.

### 2026-07-21 Batch 689 organization pull-request review-progress owner repair

The fallback-off organization PR artifact was repaired at the existing route owner. Frozen
`.infos .upload-progress` geometry (`display:inline-block`, `width:30px`, `height:7px`,
`vertical-align:middle`, `overflow:hidden`, `margin-top:3px`, `border-radius:5px`) and the
inner `.bar { height:100% }` now live in route-local StyleX; the API-derived percentage
continues through the dynamic StyleX width carrier. Focused normal and fallback-off checks pass
1/1 each at desktop and mobile viewports. The global fallback remains enabled by default.

### 2026-07-21 Batch 690 organization-members responsive row owner repair

The organization-members fallback-off owner now carries the exact frozen responsive
`.span-hard-wrap { min-width:95%; width:100vw; }` cascade alongside the existing desktop row
width and legacy `margin-left:5px`. The focused list test verifies populated/empty output,
desktop/mobile row/list geometry, source mapping, and six existing owner boundaries; normal and
fallback-off checks pass 3/3 each. The remaining outer document overflow is not assigned to this
route owner and remains part of the global/shared bridge classification.

### 2026-07-21 Batch 679 organization home search-shell owner proof

ORG-02 search output now owns the frozen `.search-bar`, `.textbox.full`, and
`.search-btn` declarations through route-local StyleX, including the exact
mobile `margin: 5px 0` rule. Input/button DOM, placeholder, filtering, project
output, and responsive containment remain unchanged; search icon styling stays
fallback-owned. Focused normal and fallback-off checks pass 3/3 each,
covering source mapping, computed desktop/mobile geometry, visible controls,
and filter interaction.

### 2026-07-21 Batch 677 organization home project-card stats owner proof

ORG-02 project-card stats now own the emitted `.members`, member-list `ul`,
and count `strong` declarations through route-local StyleX, resolving the
frozen `@secondary -> @blue2 -> #51AACC` chain. The non-emitted member-avatar
`li` rule remains fallback-owned. Focused normal and fallback-off checks pass
3/3 each, covering source/variable mapping, counts/icons/watch state,
desktop/mobile geometry, and filtering.

### 2026-07-21 Batch 700 projects populated row-content line-box proof

- [x] The existing projects directory header, description, name-tag, and stats
  owners carry the frozen Bootstrap 20px body line-height without adding offsets
  or changing the legacy row DOM.
- [x] Focused source, computed declaration, containment, and desktop/mobile row
  geometry checks pass 3/3 in normal and fallback-off modes.

### 2026-07-21 Batch 701 global GNB search-form semantic/icon proof

- [x] The existing GNB search form retains the semantic `gnb-search-form` class,
  while plugin-only `input-prepend` remains removed.
- [x] The frozen Yobicon font and search glyph declarations are owned at the
  existing React icon boundary without invented geometry or changed GET behavior.
- [x] Focused source, frozen-hash, desktop/mobile geometry, scope interaction,
  and GET payload checks pass 10/10 in normal and fallback-off modes.

### 2026-07-21 Batch 702 global GNB search icon declaration proof

- [x] The existing search-icon owner uses the frozen Yobicon `font-weight:normal`
  declaration without changing DOM, geometry, glyph, or GET behavior.
- [x] Adjacent input and submit focused contracts accept the current generated
  fallback hash and StyleX semantic class composition.
- [x] Normal and fallback-off input/submit checks pass 8/8 and 9/9.

### 2026-07-21 Batch 703 global GNB nav inherited-font proof

- [x] The existing global nav owner no longer introduces a font-weight absent
  from frozen `.gnb-nav`; typography remains inherited from the legacy baseline.
- [x] The focused contract distinguishes the migrated restricted nav from the
  retained raw-class consumers without changing their DOM or fallback boundary.
- [x] Normal and fallback-off nav checks pass 8/8 with desktop/mobile geometry
  and paint-isolation coverage.

### 2026-07-21 Batch 704 global GNB inner box-model proof

- [x] The existing global GNB-inner owner no longer introduces `border-box`,
  which is absent from frozen `.gnb-inner`; computed desktop/mobile state is
  `content-box` as in the legacy output.
- [x] The focused contract distinguishes the migrated restricted inner owner
  from retained raw-class consumers without changing DOM or fallback behavior.
- [x] Home, project, and organization inner geometry checks report green in
  fallback-off mode; the assembled five-owner wave reports 38/38 green before
  managed cleanup interruption.
- [x] The unsupported `.gnb-inner` fallback `box-sizing` bridge is retired;
  source-backed width/height/margin/color and neighboring pseudo-element rules
  remain retained for non-migrated consumers.
### 2026-07-21 Batch 705 global GNB outer responsive-padding proof

- [x] The existing outer owner carries the frozen `padding:0 10px` cascade;
  mobile remains `10px` and project-header remains `0px`.
- [x] The focused contract distinguishes the migrated restricted outer owner
  from retained raw-class consumers and preserves frozen source hashes.
- [x] Normal and fallback-off outer checks pass 9/9 with desktop/mobile
  geometry, responsive padding, and paint-isolation coverage.

### 2026-07-21 Batch 706 global GNB project-list divider owner-boundary proof

- [x] The existing List All divider owner retains only frozen `.gnb-nav`/divider
  declarations; unsupported `backgroundColor`, `backgroundImage`, `height:auto`,
  and `width:auto` declarations are removed.
- [x] The focused contract records the current `.gnb-nav > li {` fallback bridge,
  preserves conditional visibility and DOM order, and passes desktop/mobile
  geometry and paint isolation 10/10 in normal and fallback-off modes.

### 2026-07-21 Batch 707 global GNB nav browser-default proof

- [x] The existing nav owner carries only frozen `.gnb-nav` declarations;
  unsupported `boxSizing` and `position` declarations are removed while the
  Bootstrap-backed `lineHeight:20px` baseline remains.
- [x] The focused source contract and computed desktop/mobile/consumer-isolation
  checks preserve the legacy nav geometry and raw-class fallback boundary.

### 2026-07-21 Batch 708 global GNB feedback-link browser-default proof

- [x] The existing feedback-link owner removes only redundant `display` and
  `float` declarations absent from frozen `.gnb-nav a`; source-backed paint,
  line-height, padding, transition, and external navigation remain.
- [x] The focused contract preserves conditional visibility, desktop/mobile
  geometry, and paint isolation in normal and fallback-off modes (10/10 each).

### 2026-07-21 Batch 709 global GNB project-list link browser-default proof

- [x] The existing List All link owner removes only redundant `display` absent
  from frozen `.gnb-nav a`; source-backed `float:none`, active triangle,
  navigation, visibility, and link paint remain.
- [x] The focused contract preserves active state, conditional visibility,
  desktop/mobile geometry, SPA navigation, and paint isolation in normal and
  fallback-off modes (8/8 each).

### 2026-07-21 Batch 710 global GNB brand-link browser-default proof

- [x] The existing brand owner removes only redundant `display` and `float`
  declarations absent from the brand-specific legacy source; background,
  padding, typography, pseudo-elements, and responsive state remain.
- [x] The focused contract preserves active routing, desktop/mobile home and
  project-header geometry, interaction, and pseudo isolation in normal and
  fallback-off modes (6/6 each).

### 2026-07-21 Batch 711 global GNB search-box browser-default proof

- [x] The existing search-box owner removes only redundant `borderStyle`,
  `borderWidth`, and `boxSizing` declarations absent from frozen `.search-box`;
  radii, background, height, display, and vertical alignment remain.
- [x] Paired submit/scope-menu contracts preserve desktop/project/organization
  geometry, menu interaction, GET behavior, responsive hiding, and paint
  isolation in normal and fallback-off modes (16/16 each).

### 2026-07-21 Batch 712 global GNB search-submit browser-default proof

- [x] The existing submit owner removes only unsupported `boxSizing`; frozen
  button appearance, border, color, cursor, typography, margin, outline,
  padding, alignment, and Yobicon declarations remain.
- [x] The focused submit contract preserves desktop/project/organization
  geometry, hover/focus, responsive hiding, isolation, and GET behavior in
  normal and fallback-off modes (9/9 each).

### 2026-07-21 Batch 713 global GNB search-scope browser-default proof

- [x] The existing scope toggle and menu-button owners remove only unsupported
  `boxSizing` declarations; frozen dropdown/button colors, borders, shadows,
  typography, padding, caret, and positioning remain.
- [x] The focused scope-menu contract preserves closed/hover/focus/open paint,
  copy/order, interaction, mobile hiding, and isolation in normal and
  fallback-off modes (7/7 each).

### 2026-07-21 Batch 714 global GNB search-scope menu browser-default proof

- [x] The existing scope-menu owner removes only unsupported `boxSizing`;
  frozen float/position, border, shadow, padding, opacity/transition,
  pseudo-elements, z-index, DOM, and responsive behavior remain.
- [x] The focused scope-menu contract preserves closed/hover/focus/open paint,
  copy/order, interaction, mobile hiding, and isolation in normal and
  fallback-off modes (7/7 each).

### 2026-07-21 Batch 715 global GNB search-scope menu float proof

- [x] The existing menu owner maps frozen Bootstrap `float:left`, while the
  emitted menu-item owner drops only its redundant browser-default
  `float:none`; menu position, dimensions, paint, DOM/order, and responsive
  behavior remain unchanged.
- [x] The focused scope-menu contract preserves computed open-menu behavior,
  copy/order, interaction, mobile hiding, and isolation in normal and
  fallback-off modes (7/7 each).

### 2026-07-21 Batch 716 shared fallback consumer-graph refresh

- [x] The generic `.dropdown-menu` bridge is confirmed to have live consumers
  across project/org members, settings/forms, issue/milestone mass-update,
  pull-request changes, commit selectors, home user-menu, typeahead, and
  Select2 surfaces.
- [x] Remaining `.ybtn`, `.label`/`.badge`, `.alert`, `.nav-tabs`, `.modal`,
  grid, and pagination families are multi-consumer or incomplete; `.hljs-*`
  remains plugin-generated and deferred.
- [x] No complete safe retirement group is proven. Fallback remains enabled;
  no route TSX, focused E2E, frozen source, or shared selector changed.

### 2026-07-21 Batch 717 project-settings reviewer-count dropdown proof

- [x] The existing reviewer-count dropdown group, toggle/open state, label,
  caret wrapper/glyph, menu visibility/geometry, and option-item margin own
  only the exact frozen `_yobiUI.less`/Bootstrap declarations through
  route-local StyleX; unrelated dropdown fallback consumers remain.
- [x] The focused project-settings contract preserves desktop/mobile closed
  and open geometry, copy/order, selection state, URL/session stability, and
  viewport containment in isolated normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 718 project-settings default-branch Select2 proof

- [x] The existing default-branch Select2 container, choice, chosen label,
  arrow/glyph, search, drop, results, result items, and result labels own only
  frozen Select2/`_override.less` declarations through route-local StyleX;
  unrelated Select2 fallback consumers remain.
- [x] The focused contract preserves desktop/mobile closed/open geometry,
  computed ownership, branch search/filter interaction, selected-value
  synchronization, and viewport containment in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 719 project-settings MenuCheckbox proof

- [x] The six menu-setting label/input pairs own only frozen `.radio-btn` and
  `label.inline-list` declarations through route-local StyleX, including the
  first-label margin rule; unrelated radio/inline-list fallback consumers
  remain.
- [x] The focused contract preserves label/input order and copy, checked
  state, desktop/mobile containment, and code-dependent visibility behavior in
  normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 720 project-settings radio-input proof

- [x] The six visible project-settings radio inputs own only frozen
  `.radio-btn` `vertical-align:top` and `margin:2px` declarations through
  route-local StyleX; the organization-only protected raw consumer and other
  fallback consumers remain.
- [x] The focused contract preserves owner/order, checked state,
  desktop/mobile containment, and reviewer enable/disable panel behavior in
  normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 721 project-settings Save button proof

- [x] The existing Save owner carries only frozen `.ybtn` base,
  `.ybtn-success`, and hover/focus/active declarations with resolved legacy
  values; generic `.ybtn` fallback consumers remain.
- [x] The focused contract preserves legacy classes/type/copy, default and
  interaction paint, desktop/mobile containment, and validation submit
  behavior in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 722 project-settings Issue Template Edit proof

- [x] The Issue Template Edit anchor owns only the frozen generic `.ybtn`
  base and hover/focus/active declarations through a route-local StyleX owner;
  generic `.ybtn` fallback consumers remain.
- [x] The focused contract preserves the legacy class/copy/target/issue-template
  URL, default and interaction paint, desktop/mobile geometry, and viewport
  containment in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 723 project-settings subnavigation proof

- [x] All seven settings subnavigation `li` owners carry only the frozen
  route-specific `margin-bottom:-2px` declaration; Bootstrap’s generic
  `.nav-tabs` fallback and unrelated consumers remain.
- [x] The focused contract preserves tab DOM/order/copy, Link hrefs, active
  state, count badge, conditional Change VCS visibility, desktop/mobile
  containment, and computed margin in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 724 project-settings middle-row label/description proof

- [x] Six label, six description, and three note owners carry the frozen
  inline-block, width/padding/alignment, and note color/size declarations;
  legacy `vmiddle` and empty-note behavior remain intact.
- [x] Desktop/mobile computed declarations and menu/reviewer dependencies pass
  in normal and fallback-off runs (1/1 each); generic `.cu-*` fallback remains.

### 2026-07-21 Batch 725 project-settings middle-row shell proof

- [x] Six middle-row shell owners carry frozen `.box-wrap` border/padding,
  `:last-of-type` border removal, and responsive mobile padding declarations;
  legacy classes, order, and conditional panels remain intact.
- [x] Desktop/mobile computed declarations, row geometry, and dependency
  interaction pass in normal and fallback-off runs (1/1 each); generic
  `.box-wrap` fallback consumers remain.

### 2026-07-21 Batch 726 project-settings top/bottom shell proof

- [x] Top and bottom shell owners preserve Scala classes/order, top padding
  semantics, Save classes/submit behavior, and frozen desktop/mobile
  border/padding/alignment declarations.
- [x] The focused contract passes desktop/mobile geometry and Save ownership in
  normal and fallback-off runs (1/1 each); generic shell fallback remains.

### 2026-07-21 Batch 727 project-settings form/frame shell proof

- [x] Form and frame owners preserve Scala `nm`/`bubble-wrap gray` classes,
  overflow-visible behavior, shell geometry, and Save interaction while
  carrying exact frozen margin/radius/background declarations.
- [x] Desktop/mobile computed output and fallback boundary pass in normal and
  fallback-off runs (1/1 each); generic shell fallback remains.

### 2026-07-21 Batch 728 project-settings definition-list field proof

- [x] The top `dl`, two `dt` rows, two `dd` rows, and two labels preserve
  native DOM/copy/order and carry exact frozen `.frm-wrap` declarations.
- [x] Desktop/mobile computed margin/padding/label geometry, popover/textarea
  behavior, and fallback-off ownership pass in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 729 project-settings logo upload proof

- [x] The left-column upload button and transparent file input preserve native
  classes, icon/copy, identity, and exact frozen `.nbtn`/`.fake-file-wrap`/
  `.file` geometry through route-local StyleX owners.
- [x] Desktop/mobile computed upload geometry, viewport containment, and
  invalid-image validation/reset pass in normal and fallback-off runs (1/1
  each); generic upload fallback consumers remain.

### 2026-07-21 Batch 730 project-settings logo-description list proof

- [x] The native top-left `ul.unstyled descs` owner carries only frozen
  Bootstrap `margin-left:0` and `list-style:none`; item spacing, copy/order,
  points, and upload owners remain intact.
- [x] Desktop/mobile computed list reset, item containment, and upload
  validation pass in normal and fallback-off runs (1/1 each); generic
  `unstyled` fallback consumers remain.

### 2026-07-21 Batch 731 project-settings subnavigation list proof

- [x] The native seven-item `ul.nav.nav-tabs` owner carries only frozen
  Bootstrap `.nav` margin/list reset declarations; item margin, Link routes,
  active/count/conditional state, and tab fallback remain intact.
- [x] Desktop/mobile computed reset, item containment, navigation, and Change
  VCS visibility pass in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 732 project-settings subnavigation clearfix proof

- [x] The existing subnavigation list owner carries only frozen Bootstrap
  `.nav-tabs` `::before`/`::after` table/zero-line-height/empty-content
  declarations and `clear:both` on `::after`.
- [x] Desktop/mobile computed pseudo styles, tab geometry, navigation, and
  conditional state pass in normal and fallback-off runs (1/1 each).

### 2026-07-21 Batch 733 project-settings tab-anchor proof

- [x] Seven native tab anchors preserve Scala DOM/copy/order/hrefs, count,
  active/conditional state, and carry exact Bootstrap base/hover/focus/active
  declarations through route-local StyleX owners.
- [x] Desktop/mobile computed anchor geometry/interaction, SPA navigation,
  and containment pass in normal and fallback-off runs (1/1 each); generic tab
  fallback consumers remain.
- [x] Batch 734: commit-detail ranged thread badge preserves the legacy
  `.thread-header`/`.badge state` DOM and owns only frozen `margin:0` and
  `padding:2px 10px`; focused desktop/390px normal and fallback-off runs pass
  1/1 each.

### 2026-07-21 Batch 735 commit-detail ranged thread header/badge proof

- [x] The ranged commit discussion header and badge preserve the Scala
  `.thread-header`/`.badge state` DOM, state copy, and controls while owning
  only frozen header padding and badge margin/padding through route-local
  StyleX; shared thread/badge fallback consumers remain.
- [x] The focused contract passes source mapping, computed declarations,
  desktop/390px geometry, and containment in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 736 commit-detail thread-shell proof

- [x] Commit-detail ranged and non-ranged thread wrappers preserve the legacy
  `.comment-thread-wrap` DOM/classes/state hooks while the route-local StyleX
  owner carries only frozen shell border/padding/background/max-width/position
  and open/closed inset shadows; PR changes/shared fallback remain untouched.
- [x] The focused contract passes source mapping, computed shell declarations,
  desktop/390px containment, and open-state interaction in normal and
  fallback-off runs (1/1 each).

### 2026-07-21 Batch 737 commit-detail thread-inner proof

- [x] Commit-route thread comments preserve the Scala list/row/media DOM and
  the ranged minimize control while route-local StyleX carries only frozen
  comments margin, comment padding, media background, and minimize position;
  the folded here affordance and shared fallback remain intact.
- [x] The focused contract passes source mapping, computed declarations,
  desktop/390px containment, and visible minimize geometry in normal and
  fallback-off runs (1/1 each).

### 2026-07-21 Batch 738 commit-detail thread-action proof

- [x] The commit-route thread reply action container preserves its React
  buttons/copy/order and toggle/submit behavior while carrying only frozen
  `thread-actrow` padding plus existing right alignment; shared fallback and
  fold behavior remain intact.
- [x] The focused contract passes partial/source mapping, computed padding and
  alignment, desktop/390px containment, and visible action geometry in normal
  and fallback-off runs (1/1 each).

### 2026-07-21 Batch 739 commit-detail closed ranged-thread fold proof

- [x] The commit-route closed ranged thread preserves the Scala `fold` class,
  hidden header/comments/reply state, folded-here red affordance, and React
  fold/unfold interaction while carrying only frozen fold declarations through
  route-local StyleX; shared fallback remains intact.
- [x] The focused contract passes source mapping, computed fold geometry,
  desktop/390px containment, and fold/unfold interaction in normal and
  fallback-off runs (1/1 each).

### 2026-07-21 Batch 740 commit-detail adjacent ranged-thread spacing proof

- [x] Adjacent ranged review threads preserve the legacy sibling spacing:
  `margin-top:10px` after a normal thread and `margin-top:0` after a folded
  thread, with React fold state updating the existing DOM and no legacy DOM
  control script copied.
- [x] The focused contract passes source mapping, computed spacing at
  desktop/390px, and live fold transition in normal and fallback-off runs
  (1/1 each).

### 2026-07-21 Batch 741 commit-detail review-form shell proof

- [x] The block review form preserves the Scala review-form, author-info,
  write-comment-box, and block-button DOM/interaction while route-local
  StyleX carries exact form shell, author-row, write-box, display, and
  720px responsive margin declarations; fallback consumers remain retained.
- [x] The focused contract passes source mapping, hidden/visible interaction,
  desktop/390px computed geometry, and viewport containment in normal and
  fallback-off runs (1/1 each).
- [x] Batch 742 review-card rail: verify source mapping, desktop/390px computed
  geometry, hover, state rail, and hash interaction in normal and fallback-off
  runs (1/1 each).
- [x] Batch 743 review-card inner content/date/comments: source mapping,
  truncation, computed metadata colors/spacing, desktop/390px geometry, and
  hash interaction pass in normal and fallback-off runs (1/1 each).
- [x] Batch 744 diff-body font owner: frozen source mapping, exact computed
  monospace family, desktop/390px coverage, and fallback-off independent
  focused contract pass 1/1 each; nested partial-diff fallback remains scoped
  separately.
- [x] Batch 745 diff-body layout owner: frozen source mapping, exact relative
  position/radius/min-height, desktop/390px computed coverage, and independent
  fallback-off focused contract pass 1/1 each.
- [x] Batch 746 partial-filediff row/cell owners: frozen source mapping, exact
  line-number/code-cell/code-line declarations, desktop/390px computed coverage,
  and independent fallback-off focused contract pass 1/1 each; outer file/meta
  and other nested partial-diff declarations remain separately scoped.
- [x] Batch 747 partial-filediff file-header owners: frozen source mapping, exact
  header/filename declarations, desktop/390px computed coverage, preserved commit
  links, and independent fallback-off focused contract pass 1/1 each; commit-id,
  utility, comments, range/color, and other nested declarations remain scoped.
- [x] Batch 748 partial-filediff commit-id owners: frozen source mapping, exact
  wrapper/cell declarations, desktop/390px computed coverage, visible shortened
  IDs, Link behavior, and independent fallback-off focused contract pass 1/1
  each; file-header, utility, comments, range/color, and other declarations remain
  scoped.
- [x] Batch 749 emitted `.isBinary` file-mode owner: frozen source mapping, exact
  color/text-shadow/padding, desktop/390px computed coverage, visible copy, and
  independent fallback-off focused contract pass 1/1 each; non-emitted utility,
  btnPop, outer/meta, comments, ranges/colors, and unrelated consumers remain
  scoped.
- [x] Batch 750 partial-filediff border repair: frozen outer/meta/code-line source
  mapping, exact longhand border geometry, desktop/390px computed coverage, and
  independent fallback-off focused contract pass 1/1 each; unrelated consumers
  remain scoped.
- [x] Batch 751 emitted inline comment row/cell owners: frozen Scala/LESS mapping,
  exact row/cell declarations, desktop/390px geometry, visible thread copy, and
  independent fallback-off focused contract pass 1/1 each; nested li width,
  non-emitted selectors, ranges/colors, and unrelated comments remain scoped.
- [x] Batch 752 emitted inline-comment nested list-item owner: frozen Scala/LESS
  mapping, conditional `max-width:1150px`, owner/no-inline-style proof,
  desktop/390px containment, visible thread copy, and independent normal and
  fallback-off focused runs pass 1/1 each; shared thread padding, non-emitted
  selectors, ranges/colors, and unrelated consumers remain scoped.
- [x] Batch 753 emitted partial-diff line-number comment-icon owner: frozen
  Scala/LESS mapping, exact base position/cursor/opacity/margin/width
  declarations, no-inline-style proof, desktop/390px computed geometry and
  containment, and independent normal and fallback-off focused runs pass 1/1
  each; hover/discommentable and unrelated icon consumers remain fallback-owned.
- [x] Batch 754 emitted partial-diff code/table shell owners: frozen
  Scala/LESS mapping, exact overflow and table width/separation/spacing
  declarations, StyleX/legacy class composition, visible rows, owner-relative
  desktop/390px geometry, and independent normal and fallback-off focused runs
  pass 1/1 each; patch-header paths, utility, range/colors, and unrelated table
  consumers remain scoped.
- [x] Batch 755 authenticated SVN commit-detail `.diff-wrap` owner: frozen
  Scala/LESS mapping, exact width/overflow/bottom-margin declarations,
  StyleX/legacy class composition, visible patch text, no-inline-style proof,
  desktop/390px owner-relative geometry, and independent normal/fallback-off
  focused runs pass 1/1 each; Git diff wrappers and unrelated fallback
  consumers remain scoped.
- [x] Batch 756 authenticated Git commit-detail metadata owners: frozen
  Scala/LESS/variable mapping, exact author/avatar/id declarations, fixed-font
  computed proof, preserved copy/link behavior, no-inline-style and
  owner-relative desktop/390px geometry, plus independent normal/fallback-off
  focused runs pass 1/1 each; `commitMsg-wrap` remains retired and SVN state
  stays separately scoped.
- [x] Batch 757 authenticated SVN commit-detail metadata owners: frozen
  Scala/LESS mapping, exact shared commit-info/ago/commit-id declarations,
  preserved SVN metadata DOM/copy, no-inline-style and desktop/390px geometry,
  plus independent normal/fallback-off focused runs pass 1/1 each; plain
  `.commitMsg`, generic avatar styling, and the already-owned diff wrapper stay
  fallback- or separately-owned.
- [x] Batch 758 source-less React-side `.right-txt` fallback bridge retirement:
  current `frontend/src` has no React emitter, only the exact `app.css` arm is
  removed, generated legacy fallback retention is asserted, and the focused
  fallback-off static contract passes 1/1. Frozen legacy utility sources remain
  unchanged.
- [x] Batch 759 source-less React-side `.blue-txt` fallback bridge retirement:
  current `frontend/src` has no React emitter, only the exact `app.css` color arm
  is removed, generated legacy fallback retention is asserted, and the focused
  normal/fallback-off static contracts pass 1/1 each. Frozen legacy color
  consumers remain unchanged.
- [x] Batch 761 authenticated project-posts two-column checkbox label StyleX ownership: frozen `twoColumnModeCheckboxArea.scala.html` and `_page.less:835-839` remain unchanged, the shared `.checkbox` fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies declarations, geometry, no-inline-style, toggle, and popover interaction 1/1 each.
- [x] Batch 762 authenticated project-issues due-date clock `.mr3` StyleX ownership: frozen issue partials and `_common.less:221` remain unchanged, generic `.mr3` fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies source/declarations, computed margin, desktop/mobile geometry, no-inline-style, and overdue copy 1/1 each.
- [x] Batch 763 authenticated milestone-detail issue due-date clock `.mr3` StyleX ownership: frozen issue partial and `_common.less:221` remain unchanged, generic `.mr3` fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies source/declarations, computed margin, no-inline-style, visible due-date state, and desktop/mobile geometry 1/1 each.
- [x] Batch 764 authenticated issue-detail mobile new-subtask `.ml4` StyleX ownership: frozen `issue/view.scala.html:204` and `_common.less:214` remain unchanged, generic `.ml4` fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies source/declarations, owner, computed 4px margin, responsive state, href, and no-inline-style 1/1 each.
- [x] Batch 765 authenticated issue-detail sidebar `.mb20` StyleX ownership: frozen `issue/view.scala.html:293` and `_common.less:212` remain unchanged, generic `.mb20` fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies source/declarations, owner, computed 20px margin, no-inline-style, sidebar content/link behavior, and desktop/mobile containment 1/1 each.
- [x] Batch 766 authenticated issue-detail desktop metadata `.mr10`/`.mt10` StyleX ownership: frozen `issue/view.scala.html:111` and `_common.less:207-208` remain unchanged, generic utility fallback stays for unrelated consumers, and normal/fallback-off focused parity verifies source/import mapping, owner, computed margins, no-inline-style, desktop content/geometry, and mobile behavior 1/1 each.
- [x] Batch 767 authenticated issue-detail edit/delete action spacing StyleX ownership: frozen issue view action rows and `_common.less:206,216`/`_page.less:2956,3550` remain unchanged, unrelated translation/comment controls stay fallback-owned, and normal/fallback-off focused parity verifies both owners, computed spacing, no-inline-style, row geometry/order, and edit/delete interaction 1/1 each.
- [x] Batch 768 authenticated configured issue translation button `.ml10` StyleX ownership: frozen `issue/view.scala.html:232` and `_common.less:206` remain unchanged, comment translation/unrelated controls stay fallback-owned, and normal/fallback-off focused parity verifies source/import mapping, owner, computed margin, no-inline-style, disabled state, and translation interaction 1/1 each.
- [x] Batch 760 authenticated profile/organization `.yobicon-middle` StyleX ownership and React-side fallback bridge retirement: frozen legacy icon consumers and `_common.less:191-194` remain unchanged, while normal/fallback-off static contracts verify StyleX ownership and generated fallback retention.

- [x] Batch 829 authenticated populated organization issue pagination StyleX
  ownership: full legacy Scala paths, frozen LESS import chain, and Korean
  messages are recorded; `frontend/tests/stylex-organization-issues-pagination.e2e.ts`
  passes 4/4 on managed dynamic ports/system Chrome with desktop/mobile
  screenshots, geometry, containment, and SPA/clamped-input coverage. Live
  legacy rendering was unavailable, so parity remains unverified and no route
  compensation was added. The approved Yoram footer/provider/contact/repository
  difference remains intentional and is not a parity gap.
- [x] Batch 830 authenticated populated organization pull-request pagination:
  preserve the five direct items, Korean copy, sprites, scoped open/closed
  query navigation, invalid/clamped Enter behavior, and exact frozen
  route-local StyleX geometry at desktop/390px. Focused managed-port
  system-Chrome checks pass 4/4; live legacy parity is unverified because the
  populated legacy instance is unavailable. The approved Yoram
  footer/provider/contact/repository deviation remains intentional.

### 2026-07-23 Batch 831 authenticated populated user-issues pagination

- [x] Legacy controller/view partials, full frozen LESS import chain, sprites, and Korean messages are mapped.
- [x] `user/issues.tsx` and `-issues.stylex.ts` preserve five direct items, Korean labels, sprites, `/user/issues` query parameters, TanStack navigation, and invalid/clamped Enter behavior while moving only exact pagination geometry/paint route-locally.
- [x] Focused managed dynamic-port system-Chrome normal/fallback-off checks pass 4/4 each; screenshots were captured under `frontend/output/playwright/stylex-user-issues-pagination/`.
- [ ] Live legacy populated rendering is unavailable, so parity is explicitly unverified; no compensating geometry was added.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### 2026-07-23 Batch 832 pagination fallback bridge retirement

- [x] The exact React-side `.page-navigation-wrap`, `.page-nums`, `.page-num`, and `.input-mini` bridge arms are removed from `frontend/src/app.css`; frozen generated legacy fallback CSS remains.
- [x] The nine direct route consumers are recorded and retain stable route-local StyleX pagination owners; colocated/shared pagination consumers are not falsely classified as bridge consumers.
- [x] `frontend/tests/legacy-fallback-off.e2e.ts` verifies bridge absence, generated fallback retention, and the complete direct consumer graph in normal and fallback-off modes.
- [x] The approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### 2026-07-23 Batch 839 project-route project-menu navigation

- [x] `projectMenu.scala.html`, frozen `_page.less:627-719`, `_responsive.less:273-289`, `_common.less`, Bootstrap, `messages`, and the complete `yobi.less` import chain are recorded as output/cascade/copy sources.
- [x] Project-route menu item/link/active-pseudo and responsive short-menu/count declarations are owned through route-local StyleX; legacy DOM/classes/order/copy, conditional visibility, Link targets, counts, and organization-route fallback remain.
- [x] `frontend/tests/stylex-project-menu-nav.e2e.ts` verifies source provenance, seven-item order/hrefs/counts, active/hover state, pseudo colors, responsive declarations, desktop/390px geometry, and project-menu-owned containment.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added. The known shared authenticated shell overflow is outside this menu owner.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries; these identity differences remain intentional.

### 2026-07-23 Batch 837 project-home member-card avatar wrapper

- [x] `project/home.scala.html:128-135`, frozen `_common.less:140-153`, `_page.less:2677-2702`, Bootstrap `.img-rounded`/`.pull-left`, and the complete `yobi.less` import chain are recorded as the output and geometry source.
- [x] The project route-local StyleX owner preserves the avatar link/image attributes, fallback URL, member copy/order, and responsive containment.
- [x] The focused E2E verifies source provenance, owner/classes/computed wrapper declarations, fallback attributes, and desktop/mobile containment.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries; these identity differences remain intentional.

### 2026-07-23 Batch 838 project-home member-card avatar image/surface

- [x] `project/home.scala.html:128-135`, frozen `_yobiUI.less:439-466` avatar surface/image rules, `_common.less:140-153`, `_page.less:2677-2702`, Bootstrap, and all 13 `yobi.less` imports are recorded as the output/cascade source.
- [x] `frontend/src/routes/$ownerName/$projectName.tsx` owns only the member-card avatar `background:#ddd`, image `width:100%`, and image `vertical-align:top` declarations through route-local StyleX; legacy classes, DOM/order/copy, link/image attributes, and overflow clipping remain.
- [x] `frontend/tests/stylex-project-home-member-avatar-image.e2e.ts` verifies source provenance, owner/class/attributes, computed surface/image declarations, clipping, desktop/mobile containment, and no document overflow.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] The approved Yoram footer intentionally omits unrelated NAVER/NAVER LABS/NAVER CLOUD, upstream Yona repository, and developer-contact entries; these identity differences remain intentional.

### 2026-07-23 Batch 836 project-home History avatar wrapper

- [x] `project/partial_history.scala.html:49-55` and the complete frozen `yobi.less` import chain, `_common.less:207` `.mr10`, and Bootstrap `.pull-left` are recorded as the output and geometry source.
- [x] `frontend/src/routes/$ownerName/$projectName.tsx` owns only the History avatar wrapper float/gap through `projectHistoryStyles`, preserving legacy classes, 32px dimensions, links, fallback asset, copy, and order.
- [x] `frontend/tests/stylex-project-history-avatar-wrapper.e2e.ts` verifies source provenance, owner/classes/computed declarations, desktop/390px geometry, containment, fallback avatar, and visible History copy/link.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] The approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### 2026-07-23 Batch 835 project enrollment-request avatar wrapper

- [x] `project/members.scala.html` enrolled-users output and the complete frozen `yobi.less` import chain, `_common.less:207` `.mr10`, and Bootstrap `.pull-left` are recorded as the source boundary.
- [x] `frontend/src/routes/$ownerName/$projectName/members.tsx` owns only the enrollment avatar wrapper float/gap through StyleX; legacy classes, dimensions, DOM order, copy, and existing Add interaction remain intact.
- [x] `frontend/tests/stylex-project-members-list.e2e.ts` verifies the Scala/LESS source mapping, stable owner, computed declarations, desktop/390px geometry, and Add behavior.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 1/1 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] The approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### 2026-07-23 Batch 834 organization enrollment-request avatar wrapper

- [x] `organization/members.scala.html:89-103` and the frozen `_common.less` `.pull-left`/`.mr10` rules plus the complete `yobi.less` import chain are recorded as the output and geometry source.
- [x] The route-local StyleX owner preserves the legacy avatar dimensions, link/details/button order, copy, and React-owned accept mutation behavior.
- [x] The focused E2E verifies source provenance, computed geometry, desktop/390px behavior, and the actual enrollment accept POST.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused suites pass 5/5 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] The approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### 2026-07-23 Batch 833 global Yoram dialog center alignment

- [x] `common/scripts.scala.html` and the frozen LESS import chain are mapped; the global `#yobiDialog` confirmation row retains legacy DOM/copy and now has a stable root StyleX owner.
- [x] Only the React-side `.center-txt` bridge is removed from `frontend/src/app.css`; generated legacy fallback remains for other legacy modal consumers.
- [x] Root-dialog focused managed system-Chrome normal/fallback-off checks pass 3/3, and the formal fallback bridge contract passes 1/1 with desktop/mobile containment and visible confirm interaction coverage.
- [x] The approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.
### 2026-07-23 Batch 850 organization members role/action meta geometry

- [x] `organization/members.scala.html:45-65` and frozen `_page.less:2185-2212` are recorded as the output and geometry source for `.member-setting`.
- [x] The organization members route-local StyleX owner contains only `position:absolute`, `right:0`, and `top:15px`; role/delete DOM, state, copy/order, and fallback remain intact.
- [x] `frontend/tests/stylex-organization-members-list.e2e.ts` verifies provenance, computed geometry, role PATCH/delete behavior, desktop/mobile containment, and deterministic screenshots.
- [x] Managed dynamic-port system-Chrome normal/fallback-off focused run passes 9/9; the mobile document-edge tolerance is derived from the frozen 5px row boundary, not a CSS compensation.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified.
- [x] The approved Yoram footer intentionally keeps its NAVER/provider/developer-contact/repository differences; those are not parity gaps.
### 2026-07-23 Batch 851 organization settingform Save footer

- [x] `organization/setting.scala.html`, frozen `_page.less:2062-2078`, `_responsive.less:126-128`, and the complete `yobi.less` import chain are recorded as the output/cascade source.
- [x] The existing organization settings StyleX boundary owns the exact desktop `padding:20px 0`, `padding-bottom:12px`, `border-bottom:0 none`, `text-align:center` and effective mobile `padding:10px 0`, preserving `box-wrap bottom`, Save DOM/copy/order, PATCH behavior, and unrelated fallback consumers.
- [x] `frontend/tests/stylex-organization-setting-form.e2e.ts` verifies provenance, computed footer declarations, desktop/mobile containment and centering, no inline style, Save PATCH interaction, and deterministic screenshots under `output/playwright/visual-sweep/`.
- [x] Managed dynamic-port system-Chrome normal/fallback-off focused runs pass 4/4 each.
- [ ] Live legacy rendering is unavailable, so screenshot parity is explicitly unverified; no compensating geometry was added.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.
### 2026-07-23 Batch 852 search-result consumer graph

- [x] Global, project, and organization search result routes and their direct StyleX owners are recorded.
- [x] Frozen `partial_search.scala.html`, `_page.less:6375-6495`, and the complete `yobi.less` import chain are recorded as the source boundary.
- [x] Normal managed system-Chrome category checks pass 7/7.
- [x] Managed dynamic-port system-Chrome normal and sequential fallback-off category runs pass 7/7 each; the initial concurrent attempt was discarded as infrastructure noise.
- [x] Shared `app.css` search bridge and generated fallback are retained pending populated/empty-state computed geometry and screenshot proof.
- [ ] Live legacy screenshot parity for the full search-result family remains unverified; no compensating geometry was added.
- [x] Approved Yoram footer/provider/developer-contact/repository differences remain intentional.
### 2026-07-23 Batch 853 global search populated/empty result states

- [x] `search/partial_search.scala.html` plus all eight search result partials, frozen `_page.less:6375-6495`/empty-result rules, Bootstrap, messages, and the complete `yobi.less` import chain are recorded.
- [x] Global `/search` keeps legacy result DOM/order/copy, category Link navigation, keyword highlighting, project fork/create metadata, empty background, and responsive state; only nested avatar-image ownership and the Vite legacy-logo fallback were added.
- [x] `frontend/tests/stylex-global-search-results.e2e.ts` covers source/import provenance, computed StyleX declarations, loaded fallback asset, desktop/390px containment, interaction, screenshots, and no overflow.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 5/5 each; screenshots are under `output/playwright/stylex-global-search-results/`.
- [ ] Live legacy screenshot comparison is unavailable, so direct legacy screenshot parity remains unverified; no compensating geometry was added.
- [x] Shared `app.css`/generated fallback remain unchanged; the approved Yoram footer/provider/developer-contact/repository differences remain intentional.

### 2026-07-23 Batch 857 search-result fallback bridge retirement

- [x] Global, project, and organization populated/empty result owners have focused computed-geometry and screenshot evidence in normal and fallback-off modes.
- [x] React-side `app.css` arms for `.search-box-wrap`, `.search-result-title`, `.search-list-wrap`, `.search-content-body`, and `.search-meta-info` are removed; `title-wrap`, `post-id`, search form ids, frozen source, and generated fallback remain outside the retirement boundary.
- [x] `frontend/tests/legacy-fallback-off.e2e.ts` verifies the retired selector set and retained generated frozen declarations.
- [x] Dated fallback-off report, StyleX ledger, canonical plan, and three route-focused evidence suites record the consumer graph and retained Yoram footer identity differences.
- [ ] Live legacy screenshot comparison remains unavailable; no compensating geometry was added.

### 2026-07-23 Batch 855 project search populated/empty result states

- [x] `search/result.scala.html`, `search/partial_search.scala.html`, all eight search result partials, frozen `_page.less:6375-6519`/empty-result rules, Bootstrap responsive rules, messages, and the complete `yobi.less` import chain are recorded.
- [x] Project search preserves legacy result DOM/order/copy, category interaction, links, keyword highlighting, pagination, empty image, and responsive state; only nested result-part ownership markers were added.
- [x] `frontend/tests/stylex-project-search-results.e2e.ts` covers source/import provenance, computed declarations, desktop/390px owned-box containment, interaction, and screenshots.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 5/5 each; screenshots are under `output/playwright/stylex-project-search-results/`.
- [ ] Live legacy screenshot comparison is unavailable; fallback-off retains the known authenticated shell allowance and no compensating geometry was added.
- [x] Shared `app.css`/generated fallback remain unchanged; the approved Yoram footer/provider/developer-contact/repository differences remain intentional.

### 2026-07-23 Batch 854 organization search populated/empty result states

- [x] `search/result.scala.html`, `partial_search.scala.html`, all eight search partials, frozen `_page.less:6375-6519`/empty-result rules, Bootstrap, messages, and the complete `yobi.less` import chain are recorded.
- [x] Organization search preserves legacy result DOM/order/copy, category interaction, links, keyword highlighting, empty image, and responsive state; only nested issue title/content/meta/keyword owners were added.
- [x] `frontend/tests/stylex-organization-search-results.e2e.ts` covers source/import provenance, computed declarations, desktop/390px owned-box containment, interaction, screenshots, and empty dynamic-style ownership.
- [x] Managed dynamic-port system-Chrome normal and fallback-off focused runs pass 5/5 each; screenshots are under `output/playwright/stylex-organization-search-results/`.
- [ ] Live legacy screenshot comparison is unavailable; fallback-off mobile retains the known 8px authenticated shell baseline and no compensating geometry was added.
- [x] Shared `app.css`/generated fallback remain unchanged; the approved Yoram footer/provider/developer-contact/repository differences remain intentional.
- [x] Batch 858: project members add-member bubble/input StyleX ownership is recorded with legacy source mapping, stable owners, computed desktop/mobile geometry, and typeahead coverage.
- [x] Batch 858: managed system-Chrome normal and fallback-off focused add-member checks pass 1/1 each; screenshots are saved under `output/playwright/visual-sweep/`.
- [ ] Batch 858: live legacy rendering is unavailable, so direct screenshot parity remains explicitly unverified; no compensating geometry was added.
- [x] Batch 858: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 859: organization members add-form owns the frozen desktop/mobile `inner-bubble .text.uname` declarations, including mobile `width: inherit !important`, with source and computed-geometry evidence.
- [x] Batch 859: current React consumers are project members and organization members; user email emits no `inner-bubble`; only the React-side app.css bridge was retired and generated frozen fallback remains.
- [x] Batch 859: managed dynamic-port system-Chrome organization add-form/fallback checks pass 3/3 and project fallback-off passes 1/1.
- [ ] Batch 859: live legacy rendering is unavailable, so direct screenshot parity remains explicitly unverified; no compensating geometry was added.
- [x] Batch 859: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 860: current React/TSX inventory emits neither `.ml4` nor `.mr3`; only the source-less React-side app.css utility arms were retired.
- [x] Batch 860: generated legacy fallback retains both frozen utility declarations and the static fallback-off contract verifies absence/retention.
- [x] Batch 860: no route implementation changed, so no Scala audit row or screenshot geometry claim is required; approved Yoram footer differences remain intentional.
- [x] Batch 861: project-home `partial_readme.scala.html`/`_common.less` provenance is recorded; the README Edit link owns frozen `margin-left:5px` through the existing project-home StyleX boundary.
- [x] Batch 861: populated/empty README DOM, `ybtn vmiddle ml5` contract, desktop/390px geometry, screenshots, and Edit navigation are covered by the focused E2E; normal and explicit fallback-off runs pass 1/1 each.
- [ ] Batch 861: live legacy screenshot comparison remains unavailable; no compensating geometry was added.
- [x] Batch 861: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 862: project-create visibility labels preserve the legacy Scala radio/label structure and own frozen `.ml5` `margin-left:5px` through route-local StyleX; shared fallback remains for unrelated consumers.
- [x] Batch 862: focused System-Chrome normal and explicit fallback-off runs pass 1/1 each at desktop/390px, including computed margin, containment, selection, and conditional protected visibility.
- [ ] Batch 862: live legacy screenshot comparison remains unavailable, so direct screenshot parity is explicitly unverified and no compensating geometry was added.
- [x] Batch 862: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 863: project-import visibility labels preserve the legacy Scala scope DOM and own frozen `.ml5` `margin-left:5px` through route-local StyleX; shared fallback remains for unrelated consumers.
- [x] Batch 863: focused System-Chrome normal and explicit fallback-off runs pass 2/2 each at desktop/390px, including computed margin, containment, public/private selection, and conditional protected visibility.
- [ ] Batch 863: live legacy screenshot comparison remains unavailable, so direct screenshot parity is explicitly unverified and no compensating geometry was added.
- [x] Batch 863: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 864: populated code-file author Link preserves the legacy committer/metadata DOM and owns frozen `.ml5` `margin-left:5px` through route-local StyleX; shared fallback remains for unrelated consumers.
- [x] Batch 864: focused System-Chrome normal and explicit fallback-off runs pass 1/1 each at desktop/390px, with computed source ownership, author navigation, containment, and deterministic screenshots.
- [x] Batch 864: fallback-off mobile metadata overlap is recorded as an existing shell baseline; no compensating geometry was added.
- [ ] Batch 864: live legacy screenshot comparison remains unavailable, so direct screenshot parity is explicitly unverified.
- [x] Batch 864: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 865: populated code-branch folder/file commit-message wrappers preserve the legacy span/class/Link DOM and own frozen `.ml5` `margin-left:5px` through route-local StyleX; shared fallback remains for unrelated consumers.
- [x] Batch 865: focused System-Chrome normal and explicit fallback-off runs pass 1/1 each at desktop/390px, with computed source ownership, row containment, screenshots, and branch-picker navigation.
- [x] Batch 865: existing depth/list responsive hiding is recorded without compensating geometry or fallback removal.
- [ ] Batch 865: live legacy screenshot comparison remains unavailable, so direct screenshot parity is explicitly unverified.
- [x] Batch 865: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 866: populated code-folder folder/file commit-message wrappers preserve the legacy `span`/`ml5`/Link DOM and own frozen `.ml5` `margin-left:5px` through the existing code-file StyleX boundary; shared fallback remains for unrelated consumers.
- [x] Batch 866: focused System-Chrome normal and explicit fallback-off runs pass 2/2 each at desktop/390px, with computed source ownership, row/list containment/no-overflow, folder/file navigation, and deterministic screenshots.
- [x] Batch 866: existing list/depth responsive behavior is recorded without compensating geometry or fallback removal.
- [ ] Batch 866: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 866: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 867: populated code-file revision comment-count preserves the legacy `ml5`/icon/count/revision-Link DOM and owns frozen `.ml5` `margin-left:5px` in the existing `commentCount` StyleX owner; prior right margin/color remain exact.
- [x] Batch 867: focused System-Chrome normal and explicit fallback-off runs pass 1/1 each at desktop/390px, with computed source ownership, revision-link navigation, metadata containment/no-overflow, and deterministic screenshots.
- [x] Batch 867: existing mobile metadata flex baseline is recorded without compensating geometry or fallback removal.
- [ ] Batch 867: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 867: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 868: pull-request changes review-card avatar preserves the legacy `avatar-wrap smaller ml5` span and owns the exact frozen `margin-left:5px` in the existing route-local StyleX boundary.
- [x] Batch 868: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844 with source/import ownership, 20x20 geometry, containment/no-overflow, screenshots, and hash navigation.
- [x] Batch 868: unrelated avatar-wrap fallback consumers remain unchanged and no compensating geometry is added.
- [ ] Batch 868: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 868: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 869: populated pull-request detail action wrapper preserves the legacy `mr5`/inline-block source contract and owns exact `margin-right:5px` in the existing `actionWrapper` StyleX owner.
- [x] Batch 869: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844 with computed margin, Edit/Close controls, containment/no-overflow, screenshots, and Edit navigation.
- [x] Batch 869: route TSX only spreads the existing StyleX owner props; DOM/copy/state/navigation behavior and unrelated `.mr5` fallback consumers remain unchanged, with no compensating geometry.
- [ ] Batch 869: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 869: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 870: populated pull-request overview safe/conflict/merging alert icons preserve the legacy `yobicon-* mr5` DOM and own exact `margin-right:5px` through the existing `alertIcon` StyleX owner.
- [x] Batch 870: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844 across all three alert states with source metadata, computed margin, copy/order, containment/no-overflow, and screenshots.
- [x] Batch 870: unrelated `.mr5` consumers remain fallback-owned; no route-specific geometry compensation or fallback selector retirement was added.
- [x] Batch 870: fallback-off verifies the three icon DOMs, StyleX source, and computed declarations; the shared Yobicon glyph foundation remains fallback-owned and receives no speculative replacement.
- [ ] Batch 870: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 870: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 871: populated project issue-label copy-form `owner` and new-label `category` inputs preserve legacy `input-label mr5` and own exact `margin-right:5px` through the route `inputWithTrailingMargin` StyleX variant; non-target inputs remain excluded.
- [x] Batch 871: focused managed external System-Chrome normal and explicit fallback-off runs pass 2/2 each at 1366x900 and 390x844 with source/computed-margin, interaction, containment/no-overflow, and deterministic screenshot evidence; full typeahead menu parity remains covered by the existing dedicated E2E.
- [x] Batch 871: no route-specific geometry compensation or fallback retirement was added; non-target color visibility may differ between fallback modes and remains outside this spacing target.
- [ ] Batch 871: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 871: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 872: populated all-state project milestone lists preserve the legacy closed `due-date ml5` span and own exact `margin-left:5px` through the existing milestone route StyleX boundary; open and overdue due-date spans remain excluded from the margin.
- [x] Batch 872: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, with computed source ownership, closed/open margin checks, tab interaction, containment/no-overflow, and deterministic screenshots.
- [x] Batch 872: shared `.ml5` fallback remains for unrelated consumers; no route-specific geometry compensation or fallback retirement was added.
- [ ] Batch 872: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 872: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 873: populated pull-request edit forms preserve legacy `.mr5` on disabled `fromProjectId`/`toProjectId` project selects and own exact `margin-right:5px` through the existing edit-form StyleX boundary; branch selects remain excluded.
- [x] Batch 873: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, with computed target/non-target margins, populated values/hidden inputs, containment/no-overflow, and deterministic screenshots.
- [x] Batch 873: shared `.mr5` fallback remains for unrelated consumers; no route-specific geometry compensation or fallback retirement was added.
- [ ] Batch 873: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 873: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 874: populated new pull-request forms preserve legacy `mr5 select2-offscreen` only on original `fromProjectId`/`toProjectId` selects and own exact `margin-right:5px`; branch selects and visible Select2 controls remain excluded.
- [x] Batch 874: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, with mode-aware computed margins, visible Select2 copy/geometry, project-switch interaction, containment/no-overflow, and deterministic screenshots.
- [x] Batch 874: normal fallback mode intentionally computes original project-select margin as `0px` because frozen `.select2-offscreen` uses `margin:0 !important`; fallback-off exposes StyleX `5px`. Fallback-owned Select2 height differences receive no compensation.
- [ ] Batch 874: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 874: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 875: populated project-branches default badge preserves legacy `headBranch ml10` and owns exact `margin-left:10px` through the existing branches StyleX owner; non-default rows remain excluded.
- [x] Batch 875: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, with source ownership, computed margin, copy/order, branch navigation, containment/no-overflow, and deterministic screenshots.
- [x] Batch 875: existing fallback-off shell differences remain recorded without route-specific compensation or fallback retirement.
- [ ] Batch 875: live legacy screenshot comparison remains unavailable because `127.0.0.1:9000` is not running, so direct screenshot parity is explicitly unverified.
- [x] Batch 875: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 876: authenticated populated `/user/issues` two-column and show-subtasks wrappers preserve legacy `mr10` classes and own exact `margin-right:10px` through the existing `modeControl` StyleX owner.
- [x] Batch 876: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, including computed target/non-target margins, control order/copy, hover popovers, checkbox interaction, containment/no-overflow, and screenshots.
- [x] Batch 876: live legacy/local paired desktop and mobile captures both return 200 and are visually inspected; the comparison records existing desktop `gnbSearchForm`/`leftMenu` and mobile `gnbUsermenu` shell drift outside this owner.
- [ ] Batch 876: screen-wide legacy screenshot parity remains a gap for the recorded global-shell drift; no route-specific compensation was added.
- [x] Batch 876: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 877: authenticated populated project issue-list two-column and show-subtasks wrappers preserve legacy `mr10` classes and own exact `margin-right:10px` through the existing project-issues StyleX owner.
- [x] Batch 877: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, including source provenance, computed target/non-target margins, control order/copy, hover popovers, checkbox interaction, containment/no-overflow, and screenshots.
- [x] Batch 877: live legacy/local paired desktop and mobile captures both return 200 and are visually inspected; the comparison records existing desktop `gnbSearchForm` and mobile `gnbUsermenu` shell drift outside this owner.
- [ ] Batch 877: screen-wide legacy screenshot parity remains a gap for the recorded global-shell drift; no route-specific compensation was added.
- [x] Batch 877: approved Yoram footer NAVER/provider/developer-contact/repository differences are intentional and are not restored.
- [x] Batch 878: authenticated populated project-board two-column mode wrapper preserves legacy `two-column-icon mr10 hide-in-mobile` and owns exact `margin-right:10px` through the existing project-posts StyleX owner; the shared `.mr10` fallback remains for unrelated consumers.
- [x] Batch 878: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, including source ownership, computed target/non-target margins, hover/focus popovers, checkbox/localStorage behavior, containment/no-overflow, and deterministic screenshots.
- [x] Batch 878: live legacy/local paired desktop and mobile captures both returned 200 and were visually inspected; the comparison records existing desktop `gnbSearchForm` and mobile `gnbUsermenu` shell drift outside this owner.
- [ ] Batch 878: screen-wide legacy screenshot parity remains a gap for the recorded global-shell drift; no route-specific compensation was added.
- [x] Batch 878: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 879: authenticated populated organization-board two-column mode wrapper preserves legacy `two-column-icon mr10 hide-in-mobile` and owns exact `margin-right:10px` through the existing `twoColumnAnchor` StyleX owner; the shared `.mr10` fallback remains for unrelated consumers.
- [x] Batch 879: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390px, including source ownership, computed target/non-target margins, keyboard checkbox/localStorage behavior, popover interaction, containment/no-overflow, and deterministic screenshots.
- [x] Batch 879: live legacy/local paired desktop and mobile captures both returned 200 and were visually inspected; the comparison records existing desktop `gnbSearchForm` and mobile `gnbUsermenu` shell drift, plus unrelated select2/seed-content differences.
- [ ] Batch 879: screen-wide legacy screenshot parity remains a gap for the recorded global-shell and unrelated fallback-owned drift; no route-specific compensation was added.
- [x] Batch 879: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 880: authenticated populated organization-issue two-column mode wrapper preserves legacy `two-column-icon mr10 hide-in-mobile` and owns exact `margin-right:10px` through the existing `twoColumnAnchor` StyleX owner; the shared `.mr10` fallback remains for unrelated consumers.
- [x] Batch 880: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844, including source ownership, computed target/non-target margins, hover/focus popovers, keyboard checkbox/localStorage behavior, containment/no-overflow, and deterministic screenshots.
- [x] Batch 880: live legacy/local paired desktop and mobile captures both returned 200 and were visually inspected; the comparison records existing desktop `gnbSearchForm` and `leftMenu` overflow plus mobile `gnbUsermenu` drift, and unrelated nav/select2/empty-state differences.
- [ ] Batch 880: screen-wide legacy screenshot parity remains a gap for the recorded shell and fallback-owned route differences; no route-specific compensation was added.
- [x] Batch 880: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 881: authenticated populated project pull-request two-column mode wrapper preserves legacy `two-column-icon mr10 hide-in-mobile` and owns exact `margin-right:10px` through the existing `twoColumnAnchor` StyleX owner; the shared `.mr10` fallback remains for unrelated consumers.
- [x] Batch 881: focused managed external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844; adjacent project pull-request guards pass 3/3, with source ownership, hover/focus popover, keyboard/localStorage behavior, responsive visibility, containment/no-overflow, and deterministic screenshots.
- [x] Batch 881: live legacy/local paired desktop and mobile captures both returned 200 and were visually inspected; the comparison records desktop `gnbSearchForm`/missing `pageWrap`/`projectPageWrap`/`leftMenu`/`postListWrap` drift and mobile `gnbUsermenu`/shell-wrapper drift outside this owner.
- [ ] Batch 881: screen-wide legacy screenshot parity remains a gap for the recorded shell-wrapper and fallback-owned route differences; no route-specific compensation was added.
- [x] Batch 881: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 882: public user profile two-column and show-subtasks wrappers preserve legacy `mr10` classes and own exact `margin-right:10px` through the existing `popoverAnchor` StyleX owner; React preserves checkbox/localStorage and child-issue visibility behavior.
- [x] Batch 882: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390px; adjacent user-profile guards pass 2/2 with source ownership, computed margins, popovers, responsive visibility, and screenshots.
- [x] Batch 882: live legacy/Yoram `/admin` desktop and mobile captures both returned 200 and were visually inspected; the sweep reports a known React-owner selector false negative plus existing shell/content geometry drift.
- [ ] Batch 882: screen-wide legacy screenshot parity remains a gap for the recorded global shell/header/content drift and fixture differences; no route-specific compensation was added.
- [x] Batch 882: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 883: pull-request detail header state/date wrapper preserves `pull-right mr10 mt10` and owns exact `margin-right:10px` through the existing pull-request detail StyleX boundary; badge paint and its separate margin remain unchanged.
- [x] Batch 883: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390px; open/closed/conflict state and desktop/mobile screenshots were inspected.
- [x] Batch 883: adjacent PR detail guards pass 4/5; the one failure is the pre-existing detail test's stale mock API path, not the header wrapper.
- [ ] Batch 883: live populated legacy screenshot parity remains a fixture gap because `/admin/sample/pullRequest/1` compares legacy 404 error state to Yoram 200 empty/detail shell (`404→200`), despite no geometry diff being reported.
- [x] Batch 883: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 884: root login dialog reset-password/signup separator preserves legacy `gray-txt ml10 mr10` DOM/copy/order and owns exact 10px left/right spacing through the route-local StyleX owner.
- [x] Batch 884: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390px; desktop/mobile screenshots for normal and fallback-off were visually inspected.
- [x] Batch 884: fallback-off computed separator margins remain 10px with no inline style or plugin-only attributes; remember-row wrapping outside this owner receives no route-specific compensation.
- [ ] Batch 884: full live legacy/Yoram shell screenshot parity remains a screen-wide/fallback-owned gap outside the separator owner.
- [x] Batch 884: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 885: populated project milestone title metadata preserves legacy `<small class="ml10">` order/copy and owns exact `margin-left:10px` through the route-local StyleX owner for open/closed states.
- [x] Batch 885: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390px; adjacent milestone guards pass 3/3.
- [x] Batch 885: normal and fallback-off open desktop/mobile screenshots plus normal closed desktop were visually inspected; computed margin/no-overflow and mobile wrapping are covered without compensation.
- [ ] Batch 885: full live legacy/Yoram shell screenshot parity remains a screen-wide/fallback-owned gap outside the title metadata owner.
- [x] Batch 885: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 886: project code branch index breadcrumb preserves legacy `code-breadcrumb-wrap ml10 pull-left` order/links and owns exact `margin-left:10px` through the existing `breadcrumbs` StyleX owner.
- [x] Batch 886: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390px; adjacent code branch index guard passes 3/3.
- [x] Batch 886: normal and fallback-off desktop/mobile screenshots were visually inspected; computed margin/no-overflow and plugin-only attribute absence pass without route compensation.
- [ ] Batch 886: full live legacy/Yoram shell screenshot parity and fallback-off branch selector/list shell differences remain gaps outside this breadcrumb owner.
- [x] Batch 886: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 887: project code file-view breadcrumb preserves legacy `code-breadcrumb-wrap ml10 pull-left` DOM/order/links and owns exact `margin-left:10px` through the route-local StyleX owner.
- [x] Batch 887: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs at 1366x900 and 390x844 pass 1/1 each; deterministic normal/fallback-off screenshots were visually inspected.
- [x] Batch 887: adjacent code-file guards pass 7/7; full live legacy/Yoram screenshot parity and fallback-off global shell/list differences remain screen-wide/fallback-owned gaps outside this breadcrumb owner, with no route-specific compensation.
- [x] Batch 887: the focused source/runtime guard checks frozen legacy evidence, computed 10px margin, link order, no inline/plugin-only attributes, and no horizontal overflow.
- [x] Batch 887: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 888: projectform #svn preserves legacy ml10 notice DOM/copy and owns exact margin-left:10px through route-local StyleX while retaining Git/Subversion visibility state.
- [x] Batch 888: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; deterministic screenshots were visually inspected.
- [x] Batch 888: adjacent projectform guards pass 3/3; the known 390px form-shell/warning text width baseline is outside this owner and receives no compensation.
- [x] Batch 888: focused source/runtime guard checks Scala/LESS/page/messages provenance, computed margin/color/copy, no inline/plugin-only attrs, target diagnostics, and Git/Subversion interaction.
- [x] Batch 888: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 889: project labels form category headings preserve the legacy `h5` category DOM/copy and own exact `margin-right:20px` through the existing route-local StyleX owner while retaining `mr20` for fallback/unrelated consumers.
- [x] Batch 889: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were visually inspected.
- [x] Batch 889: focused source/runtime guard checks Scala partial provenance, frozen `.mr20`, computed 20px margin, right alignment, owner/source metadata, no inline/plugin-only attrs, and owner-outside shell diagnostics.
- [x] Batch 889: adjacent labelsform guards pass 7/8; the one failure is the pre-existing `stylex-project-labelsform.e2e.ts` rejection of the unchanged `errorMessage` margin in `-labelsform.stylex.ts`.
- [x] Batch 889: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored; fallback-off global navigation/form-shell drift remains outside this owner without compensation.
- [x] Batch 890: project issues due-date wrappers preserve the legacy `mr20 mt10 pull-right` DOM/state branches and own exact `margin-right:20px` and `margin-top:10px` through the existing project-issues StyleX boundary.
- [x] Batch 890: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 7/7 each at 1366x900 and 390x844 for open-overdue, upcoming-open, and closed states; normal/fallback-off screenshots were visually inspected.
- [x] Batch 890: focused source/runtime guard checks Scala/LESS/import/messages provenance, computed margins, copy/title/state branches, target containment diagnostics, and no plugin-only attrs.
- [x] Batch 890: adjacent project-issues guards pass 3/4; the one failure is the pre-existing progress-width guard expecting 15px while the unchanged fixture renders 30px.
- [x] Batch 890: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored; fallback-off global issue shell/navigation drift remains outside this owner without compensation.
- [x] Batch 891: organization issues due-date wrappers preserve the legacy `mr20 mt10 pull-right` DOM/state branches and own exact `margin-right:20px` and `margin-top:10px` through the existing organization-issues StyleX boundary.
- [x] Batch 891: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 7/7 each at 1366x900 and 390x844 for open-overdue, open-upcoming, and closed states; normal/fallback-off screenshots were visually inspected.
- [x] Batch 891: focused source/runtime guard checks organization Scala/LESS/import/messages provenance, computed margins, copy/title/state branches, target containment diagnostics, and no plugin-only attrs.
- [x] Batch 891: adjacent organization-issues guards pass 2/2.
- [x] Batch 891: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored; fallback-off global organization shell/navigation drift remains outside this owner without compensation.
- [x] Batch 892: project webhook payload heading, project-settings reviewer note, and pull-request changes commit hashes preserve their legacy `mr20`, `ml10`, and `mr10` DOM/class consumers while the existing route-local StyleX owners add exact `margin-right:20px`, `margin-left:10px`, and `margin-right:10px` declarations.
- [x] Batch 892: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 5/5 each at 1366x900 and 390x844 across the three focused tests; normal/fallback-off desktop/mobile screenshots were visually inspected.
- [x] Batch 892: focused source/runtime guards verify the three Scala view/partial sources, frozen LESS declarations and relevant paint, computed margins, copy/order/state/navigation behavior, owner/source metadata, and no route-specific compensation.
- [x] Batch 892: adjacent guards pass 11/15; four pre-existing unchanged failures are limited to two pull-request changes residual fixture/selector assumptions, the stale project-setting `project-setting-descs` expectation, and the stale webhook `.truncate` app.css expectation.
- [x] Batch 892: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored; fallback-off global shell/navigation drift and full live legacy/Yoram shell screenshot parity remain outside these margin owners without compensation.
- [x] Batch 893: project postform markdown-editor wrapper preserves legacy `data-toggle="markdown-editor" class="mt10"` DOM and owns exact `margin-top:10px` through the existing postform StyleX boundary; user profile editform preserves the three legacy `dd.mt10` rows and owns the same exact spacing through the user-settings profile boundary while leaving the avatar upload `mt10` consumer unchanged.
- [x] Batch 893: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 4/4 each at 1366x900 and 390px; normal/fallback-off desktop/mobile screenshots for both owners were visually inspected.
- [x] Batch 893: focused source/runtime guards verify `common/editor.scala.html`, `board/create.scala.html`, `user/edit.scala.html`, frozen `_common.less`, exact computed margins, DOM/order/tab behavior, no inline compensation, and no plugin-only attributes.
- [x] Batch 893: adjacent guards pass 10/13; three pre-existing unchanged failures are limited to the user email action class/fixture assumptions and the user-settings tab theme-boundary declaration assumption.
- [x] Batch 893: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored; fallback-off global shell/navigation drift and full live legacy/Yoram shell screenshot parity remain outside these margin owners without compensation.
- [x] Batch 894: issue editform, new pull-request form, and pull-request editform markdown-editor wrappers preserve legacy `data-toggle="markdown-editor" class="mt10"` output and own exact `margin-top:10px`; pull-request detail branch direction preserves `yobicon-right-2 ml10` and owns the exact legacy left spacing through the existing branch icon StyleX boundary.
- [x] Batch 894: focused integrated managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 4/4 each at 1366x900 and 390px; normal/fallback-off desktop/mobile screenshots for all four owners were visually inspected.
- [x] Batch 894: focused source/runtime guards verify `common/editor.scala.html`, `issue/edit.scala.html`, `git/create.scala.html`, `git/edit.scala.html`, `git/partial_branch.scala.html`, `git/view.scala.html`, frozen `_common.less`, computed margins, tab/link behavior, icon geometry, no inline compensation, and no plugin-only attributes.
- [x] Batch 894: adjacent guards pass 16/21; five pre-existing unchanged failures are limited to new pull-request conflict/form/Select2 fixture or selector assumptions and the pull-request detail markdown fixture load.
- [x] Batch 894: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored; fallback-off global shell drift and full live legacy/Yoram shell screenshot parity remain outside these owners without compensation.
- [x] Batch 895: project issue create, board post edit, milestone create, and milestone edit markdown-editor wrappers preserve the legacy `mt10` DOM/class contract and own the exact frozen `margin-top:10px` declaration through route-local StyleX owners.
- [x] Batch 895: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 4/4 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected.
- [x] Batch 895: focused source/runtime guards verify `issue/create.scala.html`, `board/edit.scala.html`, `milestone/create.scala.html`, `milestone/edit.scala.html`, `common/editor.scala.html`, frozen `_common.less` and `yobi.less` import evidence, computed margins, editor tabs, no inline compensation, and no plugin-only attributes.
- [x] Batch 895: adjacent guards pass 35/52; 17 unchanged failures are limited to board uploader, issue-form fixture/toast/asset/login/markdown-help, milestone core DOM/source-fixture, and new-milestone owner-load assumptions.
- [x] Batch 895: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored; fallback-off global shell/Bootstrap/date-picker/file-input drift and full live legacy/Yoram shell screenshot parity remain outside these owners without compensation.
- [x] Batch 896: issue-detail, board-post-detail comment, and commit-detail review markdown-editor wrappers preserve legacy `mt10` DOM/class structure and own exact `margin-top:10px` through their existing route-local StyleX boundaries, with stable editor owner/instance markers where needed.
- [x] Batch 896: focused integrated managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 4/4 each at 1366x900 and 390x844; issue/post/commit desktop/mobile screenshots were directly inspected and all editor geometry/interaction assertions passed.
- [x] Batch 896: focused source/runtime guards verify issue/board/git comment/review Scala partials, `common/editor.scala.html`, `common/uploadForm.scala.html`, frozen `_common.less` and relevant paint/import/message evidence, computed margins, tab/copy/upload behavior, no inline compensation, and no plugin-only attributes.
- [x] Batch 896: adjacent guards pass 64/117; 53 unchanged failures remain existing metadata/select2, legacy fixture, stale source/selector, route-shell-load, and residual-guard assumptions. Fallback-off global shell/Bootstrap/asset drift and full live legacy/Yoram shell parity remain outside these margin owners without route-specific compensation.
- [x] Batch 896: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 897: pull-request changes review editor, populated pull-request detail header state/date, and pathful code-history file table preserve their legacy `.mt10` DOM/class contracts while the existing route-local StyleX owners add exact `margin-top:10px`; the pathless branch history table remains the conditional no-margin state.
- [x] Batch 897: focused integrated managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 4/4 each at 1366x900 and 390x844; review-editor, open/closed/conflict PR-header, and commit-file desktop/mobile screenshots were directly inspected.
- [x] Batch 897: focused source/runtime guards verify `git/viewChanges.scala.html`, `partial_comment_thread.scala.html`, `partial_comment_form_on_thread.scala.html`, `common/editor.scala.html`, `common/uploadForm.scala.html`, `git/view.scala.html`, `git/partial_info.scala.html`, `git/partial_state.scala.html`, `code/history.scala.html`, frozen `_common.less`, relevant import/Bootstrap/message evidence, computed margins, path/state behavior, no inline compensation, and no plugin-only attributes.
- [x] Batch 897: adjacent guards pass 12/23; 11 unchanged failures are limited to code-history route-load/title/path/selector assumptions and pull-request/commit fixture-load assumptions. Fallback-off global shell/Bootstrap/asset drift and full live legacy/Yoram shell screenshot parity remain outside these owners without route-specific compensation.
- [x] Batch 897: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 898: pull-request changes outer `codediff-wrap mt10` preserves the legacy class and conditional `diffs-only` state while the existing route-local StyleX owner adds exact `margin-top:10px`.
- [x] Batch 898: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; review-card and diffs-only desktop/mobile screenshots were directly inspected.
- [x] Batch 898: focused source/runtime guard verifies `git/viewChanges.scala.html`, frozen `_common.less`, `_page.less`, `_responsive.less`, `yobi.less` imports, Bootstrap CSS/responsive CSS, messages, exact computed margin, no inline style, conditional state, interaction, containment, and no plugin-only attributes.
- [x] Batch 898: adjacent PR changes guards pass 7/9; two unchanged residual failures are the existing diff fixture assumption and duplicate upload-help owner strictness. Fallback-off global shell/Bootstrap/asset drift and full live legacy/Yoram shell screenshot parity remain outside this owner without route-specific compensation.
- [x] Batch 898: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 899: pull-request detail help modal text column preserves the legacy `pull-left help-messages mt10` DOM/class contract and owns exact `margin-top:10px` through the existing StyleX boundary.
- [x] Batch 899: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected.
- [x] Batch 899: focused source/runtime guard verifies `git/view.scala.html:95-98`, frozen `_common.less:208`, `_page.less:5576-5581`, responsive/Bootstrap modal evidence, messages/copy/order, exact computed margin, no inline style, React open/close interaction, containment, and no plugin-only attributes.
- [x] Batch 899: adjacent pull-request detail help-modal and header state/date guards pass 2/2; fallback-off image-asset, backdrop, modal-overflow, and shell drift remain documented fallback-owned gaps without route-specific compensation.
- [x] Batch 899: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 900: populated organization member panel preserves the legacy manager/member outer panel DOM and `bubble-wrap gray project-home mt10` contract while the existing member-panel StyleX boundary owns exact `margin-top:10px`; manager remains conditional-margin-free.
- [x] Batch 900: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-organization-member-panel-mt10/`.
- [x] Batch 900: focused source/runtime guard verifies `organization/view.scala.html:146-176`, frozen `_common.less:208`, `_page.less:2584-2625,2677-2681`, responsive/Bootstrap evidence, messages/order/copy, exact member margin, manager 0px, no inline style, owner/source metadata, containment, and leave-modal interaction.
- [x] Batch 900: adjacent organization member-panel inner/avatar guards pass 6/6; fallback-off global shell paint and the existing default-avatar fixture path remain documented gaps outside this margin owner without route-specific compensation.
- [x] Batch 900: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 901: user-settings avatar upload preserves the legacy `frmAvatar`/`avatar-frm`/`btn-wrap mt10 center-txt` DOM, avatar/progress/upload order, Change avatar copy, file input contract, and React crop-modal behavior while the existing avatar StyleX owner adds exact `margin-top:10px`.
- [x] Batch 901: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-user-editform-avatar-upload-mt10/`.
- [x] Batch 901: focused source/runtime guard verifies `user/edit.scala.html:43-59`, frozen `_common.less:107-137,144-162,208`, `_page.less:4917-4940`, `_yobiUI.less:294-305`, Bootstrap/responsive evidence, messages/copy/order, exact computed margin and centered wrapper, no inline style, owner/source metadata, input attributes, containment, and crop-modal interaction.
- [x] Batch 901: adjacent user-editform profile/avatar guards pass 5/5 in both normal and fallback-off runs after updating the stale avatar-owner source assertion to the intentional combined StyleX call.
- [x] Batch 901: fallback-off global shell drift and the existing default-avatar fixture path remain documented gaps outside this margin owner without route-specific compensation.
- [x] Batch 901: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 902: project-create advanced form preserves the legacy `span2 right-txt mt10`, `project-scopes mt10`, protected/private scope-row DOM, radio/copy/order, owner-dependent visibility, and VCS warning while existing/projectform StyleX owners add exact `margin-top:10px`; menu-setting remains margin-free.
- [x] Batch 902: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-projectform-mt10/`.
- [x] Batch 902: focused source/runtime guard verifies `project/create.scala.html:86-115,127-149`, frozen `_common.less:208`, relevant page/responsive/Bootstrap/yobi/messages evidence, exact five owner margins, menu-setting 0px, protected/VCS state transitions, no inline/legacy JS control, and owner containment.
- [x] Batch 902: adjacent projectform guards pass 7/7 in normal and fallback-off runs; the existing mobile 700px project-form/global overflow remains a documented screen-wide gap outside these margin owners without route-specific compensation.
- [x] Batch 902: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 903: project import preserves the legacy `span2 right-txt mt10`, `project-scopes mt10`, protected/private scope-row DOM, radio/copy/order, owner-dependent protected visibility, and VCS warning while project-import StyleX owners add exact `marginTop: "10px"`; menu-setting remains margin-free.
- [x] Batch 903: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-import-mt10/`.
- [x] Batch 903: focused source/runtime guard verifies `project/importing.scala.html:120-170`, frozen `_common.less:163,208`, complete `yobi.less` import list, messages/copy/order, exact five mt10 owners, menu-setting 0px, protected-owner/radio transitions, no inline/plugin-only attributes, and owner containment.
- [x] Batch 903: adjacent import guards pass 10/13 in normal and fallback-off runs; three unchanged guards retain pre-existing canonical Yoram/StyleX DOM, exact Select2 class, and repo-auth inline-display assumptions. Fallback-off global shell/Select2/Bootstrap drift and full live legacy/Yoram shell parity remain outside these owners without route-specific compensation.
- [x] Batch 903: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 904: issue-detail unauthorized comment preserves the legacy `write-comment-box mt20` wrapper, disabled textarea, `right-txt mt10` action-row DOM/order/copy, and React permission state while the existing `disabledCommentActions` StyleX owner adds exact `marginTop: "10px"` beside its existing right alignment.
- [x] Batch 904: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-issue-detail-disabled-comment-actions-mt10/`.
- [x] Batch 904: focused source/runtime guard verifies `common/commentForm.scala.html:51-62`, frozen `_common.less:163,208`, relevant write-comment page/responsive evidence, complete `yobi.less` imports, messages/copy/order, exact action-row margin/right alignment, wrapper 20px, disabled state, no inline/plugin-only attributes, and owner containment.
- [x] Batch 904: adjacent existing unauthorized-comment guard passes 1/1 in normal and fallback-off runs; fallback-off global issue shell and disabled-button paint drift remain outside this owner without route-specific compensation.
- [x] Batch 904: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 905: project board post detail preserves the legacy board/commentForm DOM, authenticated and unauthorized action-row order/copy, unauthorized `mt10`, and exact right alignment through the existing post-detail StyleX owners; the route no longer carries the legacy `right-txt` utility class.
- [x] Batch 905: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-post-detail-disabled-comment-actions-mt10/`.
- [x] Batch 905: focused source/runtime guard verifies `board/view.scala.html`, `common/commentForm.scala.html`, frozen `_common.less` right alignment/`mt10`, relevant page/responsive/Bootstrap imports, messages/copy/order, computed 10px margin, right alignment, containment, no inline/plugin-only attributes, and both action-row states; seeded legacy `admin/sample/post/1` desktop/mobile baselines were captured with external Chrome.
- [x] Batch 905: the adjacent unauthorized-comment guard passes after removing only its stale runtime `right-txt` class assertion; the broader post-detail residual guard remains 2/3 because its unchanged `commentUploadHelp` assertion expects an older combined StyleX source shape. Fallback-off global shell/button paint and same-fixture live comparison remain documented gaps without route-specific compensation.
- [x] Batch 905: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 906: project review-list `reviewthread/list.scala.html` and `partial_list.scala.html` preserve the legacy sort/export wrapper order, copy, and responsive list structure while `reviewsLayout.filters` and `reviewsLayout.exportAction` own exact right/left floats; retired `pull-right`/`pull-left` classes are absent from the React-owned wrappers.
- [x] Batch 906: focused managed external System-Chrome normal and explicit fallback-off runs pass 3/3 each; the restored-normal focused run passes 2/2, and the existing project-reviews regression suite passes 5/5 in normal mode.
- [x] Batch 906: focused source/runtime checks cover frozen Bootstrap float rules, the complete `yobi.less` import chain, page/responsive `.post-list-wrap` evidence, messages/copy, computed floats, padding, containment, sort query behavior, and absence of inline/plugin-only attributes; normal/fallback-off desktop/mobile screenshots were inspected under `frontend/output/playwright/stylex-project-reviews-action-floats/{normal,fallback-off}/`.
- [x] Batch 906: running legacy `/admin/sample/reviews` desktop/mobile baselines were captured and inspected; the seeded empty legacy review state versus the local populated mock is a documented same-fixture gap, and fallback-off/global shell differences remain outside this owner without compensation.
- [x] Batch 906: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 907: authenticated populated project issue-list `partial_list_wrap.scala.html` preserves the New Issue, sort-filter, and Excel export wrapper order/copy while route-local StyleX owns exact right/right/left floats and export `padding: 10px`; React-owned wrappers no longer emit target `pull-right`/`pull-left` classes.
- [x] Batch 907: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each; normal adjacent residual and existing project-issues owner guards pass 2/2.
- [x] Batch 907: focused source/runtime checks cover `partial_list.scala.html`/draft structure, frozen Bootstrap float rules, full `yobi.less` import chain, filter-wrap/page/responsive evidence, messages/copy, computed floats/padding, sort query interaction, download/New Issue links, no plugin-only attributes, and desktop/mobile containment; screenshots were inspected under `frontend/output/playwright/stylex-project-issues-action-floats/{normal,fallback-off}/`.
- [x] Batch 907: seeded legacy `/admin/sample/issues` desktop/mobile baselines were captured and inspected; its one-issue seed suppresses the multi-item sort-filter wrapper while the local parity fixture has two issues, so that live filter-state comparison remains a documented fixture gap. Fallback-off global shell drift receives no route-specific compensation.
- [x] Batch 907: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 908: authenticated populated project issue-list `partial_list.scala.html:90-119` preserves the `mt5 pull-right` assignee/empty-avatar rail and `mr20 mt10 pull-right` due-date DOM/state branches while route-local StyleX owns exact `float: right` for both; `mt5`, `mr20`, and `mt10` remain in the output and React-owned wrappers no longer emit `pull-right`.
- [x] Batch 908: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 8/8 each; the row fixture covers assigned and empty-avatar states, due-date open/upcoming/closed states, DOMRect containment, overflow, and plugin-only attribute absence.
- [x] Batch 908: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-issues-row-action-floats/{normal,fallback-off}/` and due-date open-overdue captures; adjacent project-issues guards pass 4/4 in normal mode.
- [x] Batch 908: seeded legacy one-issue state versus the local two-row assigned/empty-avatar fixture remains a documented same-fixture gap; fallback-off global shell paint/full live legacy/Yoram screenshot parity remain outside these owners without route-specific compensation.
- [x] Batch 908: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 909: authenticated populated project milestone-list `milestone/list.scala.html` preserves the `pull-right btns` New milestone wrapper, `pull-left search search-bar` search wrapper, and row `pull-right` completion rails while route-local StyleX owns exact right/left/right floats; only React-owned Bootstrap float utilities are removed.
- [x] Batch 909: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each; source/runtime guards cover the frozen Bootstrap/LESS/message chain, computed floats, copy/order, links/tabs/search, DOMRects, no overflow, and plugin-only attribute absence.
- [x] Batch 909: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-milestones-action-floats/{normal,fallback-off}/`; live legacy desktop/mobile captures were inspected under `output/playwright/legacy-project-milestones-action-floats/`.
- [x] Batch 909: the seeded legacy milestone state has one row and therefore omits the multi-item search/filter wrapper while the local parity fixture has two rows; this is a documented same-fixture gap. Fallback-off global shell/asset drift remains outside the float owners without route-specific compensation.
- [x] Batch 909: approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 910: authenticated populated project board-list `board/list.scala.html` and included `help/keymap.scala.html` preserve the search, New post, two-column, keymap, DOM/order, copy, and React interaction contract while route-local StyleX owns exact left/right/left floats and the former inline keymap spacing; only React-owned `pull-left`/`pull-right` utilities are removed.
- [x] Batch 910: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime guards cover frozen Bootstrap/LESS/import/message evidence, computed floats, links/copy/order, keymap interaction, DOMRects, no overflow, no inline styles, and plugin-only attribute absence.
- [x] Batch 910: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-posts-action-floats/{normal,fallback-off}/`; managed live legacy `/admin/sample/posts` desktop/mobile sweep baselines pass 1/1 each and were inspected under `output/playwright/visual-sweep/`.
- [x] Batch 910: the seeded legacy state renders one `Seed notes` post and a label select while the local parity fixture renders two posts and no labels; this same-fixture content/control comparison is documented as a gap, and fallback-off global shell/asset drift remains outside the float owners without route-specific compensation.
- [x] Batch 910: adjacent project-posts regression guards pass 8/8 after correcting two pre-existing exact source assertions for the current StyleX declarations; approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 912: authenticated populated organization issues preserves `group_issue_search_partial.scala.html`'s `.filters pull-right` sort wrapper and `group_issue_list_partial.scala.html`'s `.mt5 pull-right` assignee/empty-avatar rail while route-local StyleX owns exact right floats; `filters`, `mt5`, due-date ownership, DOM/order/copy, responsive visibility, and React sort interaction remain intact, and only the two React-owned `pull-right` utilities are removed.
- [x] Batch 912: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime checks cover the real Scala roots/partials, frozen Bootstrap/LESS/import/message evidence, computed floats, assigned/empty-avatar branches, sort navigation, DOMRects, no overflow, and plugin-only attribute absence.
- [x] Batch 912: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-organization-issues-action-floats/{normal,fallback-off}/`; managed legacy desktop/mobile captures were inspected under `output/playwright/legacy-organization-issues-{desktop,mobile}.png`, with the empty live state versus local two-row fixture recorded as a same-fixture gap.
- [x] Batch 912: adjacent organization-issues guards pass 17/17 in normal mode; one unchanged fallback-off pagination guard remains at 206px versus its 30px expectation and is outside this float owner. Approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 913: authenticated populated organization-home Create-project, project-card `stats-wrap`, and manager/member Leave surfaces preserve legacy DOM/order/copy/Link/button/modal behavior while route-local StyleX owns exact right floats; only React-owned `pull-right` classes are removed, and no route-specific geometry compensation or plugin-only attributes are added.
- [x] Batch 913: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime guards verify the Scala root, frozen Bootstrap/LESS/import/message evidence, three owners, computed floats, retained legacy classes/contracts, interaction, containment, and no inline/plugin-only attributes.
- [x] Batch 913: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-organization-home-action-floats/{normal,fallback-off}/`; managed legacy `/organizations/weblabs` desktop/mobile sweeps pass 1/1 and captures were inspected under `frontend/output/playwright/legacy-organization-home-action-floats-{desktop,mobile}.png`. Live one-project versus local populated two-card/two-panel state remains a same-fixture gap.
- [x] Batch 913: fallback-off global modal/shell paint and geometry drift remain outside these owners; the fallback-off test-only modal close dispatch is diagnostic and does not claim modal visual parity. Two existing Create-link selectors were intentionally migrated to the stable owner marker; the remaining exact `textbox full` assertion is a pre-existing StyleX baseline failure. Approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 914: authenticated populated organization pull-request rows preserve the legacy receiver/avatar rail and state badge DOM/order/copy, `mt5 hide-in-mobile`, `state`/`open`/`conflict`, empty-avatar and user-link branches, while the existing route-local receiver/state StyleX owners carry exact `float: right`; only the two React-owned `pull-right` utilities are removed.
- [x] Batch 914: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime guards verify the Scala root/partial, frozen Bootstrap/LESS/import/message evidence, both owners, computed floats, responsive containment, no inline/plugin-only attributes, and row/tab interaction.
- [x] Batch 914: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-organization-pullrequests-action-floats/{normal,fallback-off}/`; managed live `/organizations/weblabs/pullrequests` desktop/mobile sweeps pass 1/1 and direct legacy captures were inspected under `frontend/output/playwright/legacy-organization-pullrequests-action-floats-{desktop,mobile}.png`. Live empty seed versus local populated two-row fixture and the existing broken default-avatar fixture asset remain documented gaps.
- [x] Batch 914: the adjacent organization pull-request suite is 12/20; eight unchanged failures retain aggregate legacy-shell/guest Feedback, removed PJAX-tab, exact pagination class/menu href, or exact source-string assumptions. Fallback-off global shell/asset drift remains outside these float owners; approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences are intentional and are not restored; no route-specific compensation.
- [x] Batch 915: authenticated populated project pull-request rows preserve the legacy New Pull Request wrapper, receiver/avatar rail, state badge, `mt5 hide-in-mobile`, `state`/`open`/`conflict`, empty-avatar/receiver links, search/sender/tabs/two-column DOM, row order, copy, and Link behavior while three existing route-local StyleX owners carry exact `float: right`; only those React-owned `pull-right` utilities are removed.
- [x] Batch 915: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime guards verify `git/list.scala.html` and included partial/common evidence, frozen Bootstrap/LESS/import/message evidence, all three owners, computed floats, responsive containment, no inline/plugin-only attributes, and row/tab/New Pull Request interaction.
- [x] Batch 915: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-pullrequests-action-floats/{normal,fallback-off}/`; managed legacy `/admin/sample/pullRequests` desktop sweep passes 1/1 and direct legacy captures were inspected under `frontend/output/playwright/visual-sweep/legacy-project-pullrequests-{desktop,mobile}.png`. Live empty seed versus local populated two-row fixture and the existing broken default-avatar fixture asset remain documented gaps.
- [x] Batch 915: selected adjacent guards recorded five passes before the broader command was interrupted by an existing project-route hang, so no aggregate adjacent-suite pass is claimed. Fallback-off global shell/asset drift remains outside these float owners; approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences are intentional and are not restored; no route-specific compensation.
- [x] Batch 916: authenticated populated project-home `project/home.scala.html:106-115` leave button and `milestone/partial_status.scala.html:28-53` progress count preserve DOM/order/copy/modal behavior while route-local StyleX owns exact right floats; only the two React-owned `pull-right` utilities are removed.
- [x] Batch 916: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime guards cover frozen Bootstrap/LESS/import/message evidence, computed floats, containment, side-panel order, leave-modal DELETE/CSRF behavior, and no inline/plugin-only attributes.
- [x] Batch 916: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-home-action-floats/{normal,fallback-off}/`; managed legacy `/admin/sample` desktop/mobile sweeps pass 1/1 each and captures were inspected under `output/playwright/visual-sweep/legacy-_admin_sample.png` and `legacy-mobile-_admin_sample.png`. Seed/copy/background and milestone-count differences are documented same-fixture gaps; fallback-off unrelated shell drift receives no compensation.
- [x] Batch 916: selected adjacent project-home guards pass 4/5 with one unchanged exact-source dynamic-progress assertion; approved Yoram footer NAVER/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 917: authenticated populated `/user/issues` preserves `my_partial_search.scala.html`'s `.filters pull-right` wrapper and `my_partial_list.scala.html`'s due-date and `mt5 pull-right hide-in-mobile` rails while existing route-local StyleX owns exact right floats; filter order/copy, Overdue state, links, responsive visibility, and React/TanStack sort behavior remain intact, and only the three React-owned `pull-right` utilities are removed.
- [x] Batch 917: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover the Scala partials, frozen Bootstrap/LESS/import/message evidence, three owners, computed floats, responsive containment, sort interaction, and no inline/plugin-only attributes.
- [x] Batch 917: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-user-issues-action-floats/{normal,fallback-off}/`; managed legacy `/user/issues` desktop/mobile sweeps pass 1/1 each and captures were inspected under `output/playwright/visual-sweep/legacy-_user_issues.png` and `legacy-mobile-_user_issues.png`. Live authenticated empty versus local populated fixture remains a same-fixture row/filter/due-date/assignee gap; fallback-off unrelated global shell/tab/row drift remains outside these owners without compensation.
- [x] Batch 917: selected adjacent guards are 7/8 because one unchanged `stylex-user-issues-inline-residual.e2e.ts` `.popover` visibility assertion finds no rendered popover; `pnpm frontend check`, production build, and frozen fallback hash verification pass. Approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 918: authenticated populated project reviews preserves `reviewthread/list.scala.html:37-55`'s three sidebar `num-badge pull-right` counts, labels/order, active state, filter buttons, tabs, sort behavior, list links, and responsive layout while existing route-local StyleX owns exact right floats; only those three React-owned `pull-right` utilities are removed.
- [x] Batch 918: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover the Scala root/partial, frozen Bootstrap/LESS/import/message evidence, all three owners, computed floats, containment/no-overflow, filter/sort interaction, and no plugin-only attributes.
- [x] Batch 918: normal and fallback-off desktop/mobile captures were directly inspected under `frontend/output/playwright/stylex-project-reviews-sidebar-count-floats/`; managed legacy `/admin/sample/reviews` desktop/mobile sweeps pass 1/1 each and captures were inspected under `frontend/output/playwright/legacy-project-reviews/{desktop,mobile}.png`. Live empty review seed versus local populated two-row fixture remains a same-fixture count/list gap; fallback-off unrelated global shell/tab/row drift remains outside these owners without compensation.
- [x] Batch 918: selected adjacent review guards are 18/20 because two unchanged failures retain the SVN empty-state pagination selector and fallback CSS title-overflow source assertion; `pnpm frontend check`, production build, and frozen fallback hash verification pass. Approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 919: `milestone/view.scala.html:98-105` and `issue/partial_list.scala.html:91-110` are recorded as the legacy output/UX sources for the `mt5 pull-right` assignee rail and `mr20 mt10 pull-right` due-date rail; frozen Bootstrap/LESS/import evidence is recorded.
- [x] Batch 919: route-local `issueAssigneeRail` and `issueDueDateRail` own exact `float: right`; `mt5`/`mr20`/`mt10`, assignee/due-date DOM, links, empty-avatar branch, state/copy, and responsive visibility remain, with only the two React-owned `pull-right` classes removed and no geometry compensation.
- [x] Batch 919: `stylex-project-milestone-detail-action-floats.e2e.ts` passes 1/1 in external System-Chrome normal, explicit fallback-off, and restored-normal modes at 1366x900 and 390x844; normal/fallback-off screenshots were inspected under `frontend/output/playwright/stylex-project-milestone-detail-action-floats/{normal,fallback-off}/`.
- [x] Batch 919: live legacy `/admin/sample/milestone/1` desktop/mobile sweeps pass 1/1 each; captures under `frontend/output/playwright/legacy-project-milestone-detail/{desktop,mobile}.png` were inspected. Live/local fixture content remains a documented same-fixture gap, fallback-off global drift remains outside the owners, and approved Yoram footer differences are intentional.
- [x] Batch 920: authenticated populated project issue-list quick-search preserves `partial_list_quicksearch.scala.html`'s four `num-badge pull-right` count spans, sidebar/search/list DOM, button/query/data-filter behavior, active state, labels/order/counts, and responsive layout while route-local StyleX owns exact `float: right`; only those four React-owned `pull-right` utilities are removed.
- [x] Batch 920: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime checks cover the Scala root/partials, frozen Bootstrap/LESS/import/message/JS evidence, four stable owners, computed floats, containment/no-overflow, interaction, and no plugin-only attributes.
- [x] Batch 920: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-issues-quicksearch-count-floats/{normal,fallback-off}/`; managed legacy `/admin/sample/issues` desktop/mobile sweeps pass 1/1 each and captures were inspected under `output/playwright/visual-sweep/legacy-_admin_sample_issues.png` and `legacy-mobile-_admin_sample_issues.png`. Live Korean one-issue versus local English populated content/copy remains a same-fixture gap; fallback-off global shell/nav/tab/search drift remains outside these owners without compensation.
- [x] Batch 920: selected adjacent project-issues guards pass 20/21 because one unchanged static-owner guard still expects `.search-box-wrap {` in generated `app.css`; approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences are intentional and are not restored.
- [x] Batch 921: authenticated selected-milestone project issue-list advanced-search preserves the legacy label-management Link, selected-milestone progress DOM/order/copy, `ybtn` classes, Link/query behavior, and responsive layout while route-local `labelManageAction` and `milestoneProgressCount` own exact right floats; only the two React-owned `pull-right` utilities are removed.
- [x] Batch 921: focused managed external System-Chrome normal, explicit fallback-off, and restored-normal runs pass 2/2 each at 1366x900 and 390x844; source/runtime guards cover the full Scala roots/partials, frozen Bootstrap/LESS/import/message/JS evidence, both owners, computed floats, interaction, containment/no-overflow, and no plugin-only attributes.
- [x] Batch 921: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-issues-selected-milestone-floats/{normal,fallback-off}/`; managed live legacy `/admin/sample/issues?milestoneId=5` desktop/mobile sweeps pass 1/1 each and captures were inspected under `output/playwright/visual-sweep/legacy-_admin_sample_issues_milestoneId_5.png` and `legacy-mobile-_admin_sample_issues_milestoneId_5.png`. The live Korean seed does not visibly select milestone 5 and shows an empty issue state with `[수정]`, while the local fixture uses English selected-milestone content, one issue, and empty labels; this is a documented same-fixture state/copy gap. Fallback-off global shell/nav/tab/search drift remains outside these owners without compensation.
- [x] Batch 921: selected adjacent project-issues guards pass 22/22 after excluding two unchanged baseline failures: the static-owner generated `app.css` `.search-box-wrap {` assertion and the progress-inline residual 15px-versus-30px width assertion. Approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 922: authenticated selected-milestone project issue-list mass-update form preserves the legacy `mass-update-form` method/action, control order/copy, `hide-in-mobile`, React selection/dropdown behavior, and DOM while route-local `massUpdateForm` owns exact `float: left`; only the React-owned `pull-left` utility is removed.
- [x] Batch 922: focused managed external System-Chrome normal and explicit fallback-off runs pass 2/2 each at 1366x900 and 390x844; source/runtime guards cover the full Scala roots/partials, frozen Bootstrap/LESS/import/message/JS evidence, owner/declaration, computed float, containment/no-overflow, and screenshots.
- [x] Batch 922: normal/fallback-off desktop/mobile screenshots were directly inspected under `frontend/output/playwright/stylex-project-issues-mass-update-float/{normal,fallback-off}/`; managed live legacy `/admin/sample/issues?milestoneId=5` desktop/mobile sweeps pass 1/1 each and captures were inspected under `output/playwright/visual-sweep/legacy-_admin_sample_issues_milestoneId_5.png` and `legacy-mobile-_admin_sample_issues_milestoneId_5.png`. The current live Korean seed is empty and does not select milestone 5 while the local fixture is English and populated, so same-fixture state/copy parity is a documented gap. Existing global `frontend/src/app.css` `hide-in-mobile`/shell cascade drift remains outside this owner without compensation.
- [x] Batch 922: approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 923: authenticated project milestone-detail `button.list` preserves the legacy `actrow right-txt row-fluid` action order, Link destination, `ybtn`, copy, and responsive layout while route-local `listAction` owns exact `float: left`; only the React-owned `pull-left` utility is removed.
- [x] Batch 923: focused external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover the real milestone Scala root/partials, frozen Bootstrap/LESS/import/message/JS evidence, computed float, action order/navigation, plugin-only attribute absence, containment/no-overflow, and screenshots.
- [x] Batch 923: local normal/fallback-off desktop/mobile screenshots were inspected under `frontend/output/playwright/stylex-project-milestone-detail-list-action-float/{normal,fallback-off}/`; live `/admin/sample/milestone/1` desktop/mobile sweeps pass 1/1 and direct legacy captures were inspected under `frontend/output/playwright/legacy-milestone-detail-list-action-float-{desktop,mobile}.png`. Live Korean `Parity launch` content differs from local English `v1.0`, so same-fixture content/copy remains a documented gap; fallback-off global shell/nav/search/mass-update drift remains outside this owner without compensation.
- [x] Batch 923: approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 924: authenticated project milestone-detail mass-update form preserves `mass-update-wrap hide-in-mobile`, form id/method/action, controls/order/copy, React checkbox/dropdown behavior, and mutation behavior while route-local `massUpdateForm` owns exact `float: left`; only the React-owned `pull-left` utility is removed.
- [x] Batch 924: focused external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover milestone Scala/issue partials, frozen Bootstrap/LESS/import/message/JS evidence, computed float, form contract, plugin-only attribute absence, responsive hiding, containment/no-overflow, interaction, and screenshots.
- [x] Batch 924: normal/fallback-off desktop/mobile screenshots were inspected under `frontend/output/playwright/stylex-project-milestone-detail-mass-update-float/{normal,fallback-off}/`; the authenticated live milestone desktop/mobile captures were inspected under `frontend/output/playwright/legacy-milestone-detail-list-action-float-{desktop,mobile}.png`. Live Korean `Parity launch` content differs from local English `v1.0`, so same-fixture content/copy remains a documented gap; fallback-off global `hide-in-mobile`/shell/mass-update drift remains outside this owner without compensation.
- [x] Batch 924: approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 925: authenticated project milestone-detail filter search preserves `filter-wrap`, `search search-bar`, input name/value/placeholder, search icon/button, React filter interaction, and plugin-only attribute absence while route-local `search` owns exact `float: right`; no legacy utility float or geometry compensation is added.
- [x] Batch 925: focused external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover the milestone Scala root/partials, frozen Bootstrap/LESS/import/message/JS evidence, computed float, input/button contract, filter interaction, horizontal/top alignment, no-overflow, and screenshots.
- [x] Batch 925: normal/fallback-off desktop/mobile screenshots were inspected under `frontend/output/playwright/stylex-project-milestone-detail-search-float/{normal,fallback-off}/`; authenticated live milestone desktop/mobile captures were inspected under `frontend/output/playwright/legacy-milestone-detail-list-action-float-{desktop,mobile}.png`. Live Korean `Parity launch` content differs from local English `v1.0`, so same-fixture content/copy remains a documented gap; frozen float-wrap bottom containment is not asserted and fallback-off global shell/search drift remains outside this owner without compensation.
- [x] Batch 925: approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 926: authenticated project milestone-detail state badge preserves `badge badge-issue-* margin-left-5`, open/closed copy, title metadata order, and navigation while route-local `stateBadge` owns exact `margin-left: 5px`; no route-specific geometry compensation is added.
- [x] Batch 926: focused external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover the milestone Scala root, frozen Bootstrap/LESS/import/message/JS evidence, computed margin, state/copy, plugin-only attribute absence, desktop/mobile containment, and screenshots.
- [x] Batch 926: normal/fallback-off desktop/mobile screenshots were inspected under `frontend/output/playwright/stylex-project-milestone-detail-state-badge-margin/{normal,fallback-off}/`; authenticated live legacy milestone desktop/mobile sweeps pass 1/1 each with captures under `frontend/output/playwright/legacy-milestone-detail-list-action-float-{desktop,mobile}.png`. Live Korean `Parity launch` content differs from local English `v1.0`, so same-fixture content/copy remains a documented gap; fallback-off global shell/nav/asset drift remains outside this owner without compensation.
- [x] Batch 926: approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 928: authenticated populated project milestone-detail issue rows preserve the legacy `post-list-wrap`/`post-item`/`issue-item-row`/`title-wrap`/`post-id`/`infos`/`infos-item` DOM, title/meta copy and links, filter interaction, responsive rails, and plugin-only attribute removal while route-local StyleX owns exact frozen row/title/meta declarations; no route-specific geometry compensation is added.
- [x] Batch 928: focused external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover the Scala root/issue partial, full LESS/Bootstrap/responsive/message/JS evidence, computed title/meta geometry, responsive padding difference, interaction, containment, and screenshots.
- [x] Batch 928: normal/fallback-off desktop/mobile screenshots were inspected under `frontend/output/playwright/stylex-project-milestone-detail-issue-row-title-meta/{normal,fallback-off}/`; the active fast profile defers the live legacy pair, global fallback consumer audit, full fallback-off suite, and production build to final visual lock. Same-fixture live Korean `Parity launch` versus local English fixture remains a documented gap; fallback-off global shell/nav/asset drift remains outside this owner without compensation.
- [x] Batch 928: approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 927: authenticated project milestone-detail issue tabs preserve legacy `nav nav-tabs`, active state, three-state order/count/copy, Link query/hash navigation, and plugin-only attribute removal while route-local `tabs`, `tabItem`, `tabLink`, `tabLinkActive`, and mobile `tabLinkMobile` own exact frozen Bootstrap/Yobi declarations; no route-specific geometry compensation is added.
- [x] Batch 927: focused external System-Chrome normal and explicit fallback-off runs pass 1/1 each at 1366x900 and 390x844; source/runtime guards cover the milestone Scala root, frozen Bootstrap/LESS/import/message/JS evidence, computed list/item/link/active/mobile declarations, order/hrefs/hash, active navigation, containment/no-overflow, and screenshots.
- [x] Batch 927: normal/fallback-off desktop/mobile screenshots were inspected under `frontend/output/playwright/stylex-project-milestone-detail-tabs/{normal,fallback-off}/`; authenticated live legacy milestone desktop/mobile sweeps pass 1/1 each with captures under `frontend/output/playwright/legacy-milestone-detail-list-action-float-{desktop,mobile}.png`. Live Korean `Parity launch` content differs from local English `v1.0`, so same-fixture content/copy remains a documented gap; fallback-off global shell/nav/asset drift remains outside this owner without compensation.
- [x] Batch 927: approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and are not restored.
- [x] Batch 930: authenticated root sidebar preserves legacy width geometry, adds the requested StyleX width transition, restores project-overview hover content through React state, removes plugin-only attributes, and clips the popover without document horizontal overflow.
- [x] Batch 930: focused external System-Chrome source/desktop/mobile run passes 3/3; open/closed desktop/mobile captures were inspected under `output/playwright/stylex-root-sidebar-open-close-popover/`.
- [x] Batch 930: live legacy pair, global fallback audit, full fallback-off suite, and production build remain final-profile deferred; approved Yoram footer differences remain intentional and no route-specific compensation was added.
- [x] Batch 929: populated milestone-detail issue metadata count/label surface preserves legacy count partial anchors, icon/value order, colors, counts, milestone link, copy, and plugin-only attribute absence while route-local StyleX owns exact explicit count-group border and spacing.
- [x] Batch 929: focused external System-Chrome normal and explicit fallback-off runs pass 1/1 each; both modes correctly compute the legacy 1px icon divider because the legacy `:first-child` selector does not match anchor-wrapped icons; captures were inspected under `frontend/output/playwright/stylex-project-milestone-detail-ml10/{normal,fallback-off}/`.
- [x] Batch 929: live legacy pair, global fallback audit, full fallback-off suite, and production build remain final-profile deferred; approved Yoram footer NAVER Labs/provider/developer-contact/upstream-repository differences remain intentional and no route-specific compensation was added.
- [x] Batch 931: authenticated root home preserves the legacy `page-wrap-outer` → `page-wrap` → `page on-fold-intro` wrapper hierarchy through existing StyleX owners; focused external System-Chrome normal/fallback-off desktop/mobile runs pass 1/1 each, with no route-specific compensation. Intentional Yoram developer-contact/search-position and footer identity differences remain documented.
- [x] Batch 932: project milestone detail preserves the legacy `page-wrap-outer` → `project-page-wrap` → `milesion-wrap` wrapper hierarchy through existing StyleX owners; focused external System-Chrome normal/fallback-off desktop/mobile runs pass 1/1 each, with no route-specific compensation. Live locale/fixture and intentional Yoram shell identity differences remain documented.
- [x] Batch 933: authenticated project members enrollment-request rows preserve `members.scala.html:80-98` avatar/details DOM order, `mr10`, links, copy, accept interaction, and responsive span containment while the existing route-local StyleX owners carry exact `float: left`, `margin-right: 10px`, and `width: 60px`; only the two React-owned `pull-left` utilities are removed. The guard checks enrollment-row-local overflow and owner edges; known global project-menu-count shell overflow remains outside this owner without compensation.
- [x] Batch 933: focused managed external System-Chrome normal and explicit `VITE_DISABLE_LEGACY_FALLBACK=1` checks pass 1/1 each at 1366x900 and 390x844; the guard covers Scala/LESS/Bootstrap source, stable owners, retired-class absence, computed float/margin/width, owner/row containment, row-local overflow, and accept interaction.
- [x] Batch 933: deterministic local screenshots are captured under `frontend/output/playwright/stylex-project-members-enrollment-floats/{normal,fallback-off}/enrollment-{desktop,mobile}.png`; live legacy rendering is unavailable, so live screenshot parity is not claimed. Fallback-off screenshots show pre-existing global shell/Bootstrap paint drift outside the enrollment owners; no route-specific compensation was added. The full final profile remains deferred.
- [x] Batch 934: authenticated project code-history branch selector and pagination float wave targets `yona-original/app/views/code/history.scala.html:89-90,201-208`, frozen Bootstrap float utilities at `6093-6100`, `_page.less:3815-3817`, the complete `yobi.less` import chain, and `conf/messages` keys `title.commitHistory`, `code.newer`, and `code.older`. `project-commits-branch-picker` owns exact `float:right`; `project-commits-newer` and `project-commits-older` own exact `float:left`; only React-owned target utility classes are removed, while branch-menu/pagination DOM, copy, and TanStack navigation remain unchanged. `stylex-project-code-history-floats.e2e.ts` passed 2/2 in normal external Chrome and 2/2 in explicit fallback-off external Chrome at 1366x900 and 390x844, including source ownership, computed floats, branch selection, both page links, desktop/mobile containment/no-overflow, and deterministic screenshots. Live legacy rendering is unavailable, so direct screenshot parity is unverified; fallback-off screenshots show pre-existing global shell/Bootstrap drift outside this wave without compensation. Approved Yoram footer/provider/developer-contact/upstream-repository differences remain intentional. |
- [x] Batch 935: authenticated project code-browser header float ownership targets `yona-original/app/views/code/view.scala.html:78-102`, frozen Bootstrap `bootstrap.css:6093-6100`, `_page.less:4498-4523`, the complete `yobi.less:1-13` import chain, and `conf/messages:122,132`. Visible picker and breadcrumb compute exact `float:left`; Git download and permission-visible New file wrappers own exact `float:right`; hidden native `select#branches` retains `pull-left select2-offscreen`, and the existing breadcrumb `pull-left` remains as its established fallback boundary. Focused test: `frontend/tests/stylex-project-code-browser-header-floats.e2e.ts`; screenshots: `frontend/output/playwright/stylex-project-code-browser-header-floats/{normal,fallback-off}/`; normal and explicit fallback-off external Chrome both pass 2/2 at 1366x900 and 390x844, and all four screenshots were directly inspected. Live legacy screenshot parity remains unverified; fallback-off global shell/Bootstrap drift remains outside this wave without compensation. |
