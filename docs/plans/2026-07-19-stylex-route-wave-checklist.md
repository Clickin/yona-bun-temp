# StyleX Screen Migration Checklist

### 2026-07-28 — Batch 1080 redirect-only corpus classification

- [x] Confirm `/info/leave/:owner/:project` is legacy `UserApp.leave`, an
  action-only redirect endpoint with no persistent Scala screen.
- [x] Exclude only that exact prefix from project header/menu requirements.
- [x] Retain all project chrome, geometry, overflow, screenshot, and comparison
  gates for visible project routes.
- [x] Pin the exclusion and unchanged project chrome checks with a focused
  harness source contract.
- [ ] Global corpus pixel lock and overall migration completion remain open.

### 2026-07-28 — Batch 1079 authenticated empty-notification DOM and settle gate

- [x] Restore the exact legacy
  `ul.activity-streams.notification-wrap.unstyled > div.warning-none >
  i.yobicon-danger` empty-state skeleton without changing StyleX paint or
  React/TanStack behavior.
- [x] Correct the broad fallback contract to preserve the required
  `activity-streams notification-wrap unstyled` list and exclude only the dead
  `.notification-page` bridge.
- [x] Replace only the affected full-page `load` waits with
  `domcontentloaded`; retain visible-owner, polling, desktop/mobile geometry,
  paint, interaction, and timeout gates.
- [x] External System-Chrome focused normal/fallback-off pairs pass 2/2 each;
  the complete fallback-off consumer graph passes 81 tests with one
  intentional skip.
- [x] Fresh production build/StyleX verifier passes; inspected live
  legacy/release-dist desktop/mobile pairs under
  `output/playwright/batch-1079/` match exact empty-warning geometry, paint,
  Korean copy, literal icon spacing, and document width.
- [ ] Global corpus pixel lock and overall migration completion remain open.

### 2026-07-28 — Batch 1078 authenticated Recent History row DOM parity

- [x] Restore the Scala partial's separate `.project-item` wrapper and translate
  whole-row `data-location` behavior into one nested TanStack issue link.
- [x] Keep React-owned hover popover behavior and the framed left-sidebar
  consumer unchanged.
- [x] Move exact frozen `display:block` and `padding-left:5px` into the
  authenticated issue owner so fallback-off retains the normal-profile result.
- [x] Scope canonical generated-token retirement to authenticated Recent owner
  boundaries and retain semantic legacy classes.
- [x] Pass sequential external System Chrome normal and fallback-off 4/4 with
  desktop/mobile geometry, popover, SPA navigation, and overflow checks.
- [x] Rebuild production dist; StyleX verifier and frozen fallback hash pass.
- [x] Inspect live legacy/release-dist desktop/mobile pairs. Pane and first-row
  geometry match exactly; one missing local recent issue is fixture drift.
- [ ] Broad fallback-off/global audit and final corpus pixel lock remain open.

### 2026-07-28 — Batch 1076 authenticated Project direct-row DOM parity

- [x] Replace Project-pane logo/name split links with one TanStack project link,
  a separate owner link, and a sibling React-owned star button.
- [x] Keep all four subtab states and remove reliance on Scala
  `data-location`/`data-project-id` behavior attributes.
- [x] Preserve the canonical 26px row using frozen 18px base line-height plus
  `_usermenu.less` 4px vertical list padding; reject content-dependent
  25/28px drift.
- [x] Verify normal and fallback-off System Chrome 1/1 with canonical DOM,
  desktop/mobile relative geometry and overflow, subtab/filter behavior,
  project/owner SPA navigation, and favorite mutation.
- [x] Confirm isolated fallback-off completes in 17.0 seconds. Concurrent
  normal/fallback-off runs can contend in Playwright worker teardown and must
  not be used as authoritative timing or verification evidence.
- [x] Capture and inspect desktop/mobile pairs against legacy port 9000 and the
  rebuilt dist served by Rust at `8089/yona`; owned Project geometry matches,
  while one extra local recent-project row is fixture-only height drift.
- [ ] Recent History, broad fallback-off/global audit, and final corpus pixel
  lock remain open.

### 2026-07-28 — Batch 1075 authenticated Favorite direct-project DOM parity

- [x] Translate direct Favorite project-row navigation into separate TanStack
  project/owner links and retain the React-owned star action; remove the legacy
  `data-location` behavior attribute.
- [x] Preserve nested organization and framed-left sidebar owners unchanged.
- [x] Restore the legacy 25px fallback-off organization-row box from frozen
  Bootstrap line-height and `_usermenu.less` logo/list padding evidence.
- [x] External System Chrome focused normal and fallback-off checks pass 1/1
  with strict DOM, desktop/mobile geometry, overflow, navigation, and mutation
  assertions.
- [x] Rebuild production dist and pass the StyleX verifier. Median browser
  timings show about 224ms HMR versus 126ms dist DOMContentLoaded and
  39ms versus 35ms first interaction.
- [x] Classify the long stabilization wait as failure-path harness bounds: 5s
  body wait + 10s route-selector wait in the visual sweep, or the focused
  E2E's 30s test timeout after an assertion failure.
- [ ] Do not use Vite preview deep links as screenshot evidence for the
  relative-base production build; rerun the final strict pair through the Rust
  asset server. Full fallback-off/global audit and final pixel lock remain
  open.

### 2026-07-28 — Batch 1072 authenticated shared-shell legacy class contract follow-up

- [x] Restored literal legacy GNB pin, logo/search, authenticated logout, and
  notification grid/stream classes while retaining StyleX ownership.
- [x] Updated only stale shared-shell expectations and made canonicalizer token
  retirement symmetric between React output and legacy fixture.
- [x] Focused fallback-off shell checks pass 3/4; DOM, logo, anonymous-menu, and
  custom-navbar contracts are green.
- [x] Measured the remaining 1100px site-admin link against frozen responsive
  geometry; the final rectangle is inside the viewport, so the remaining
  failure is retained as a harness/actionability stabilization issue. No test
  threshold was weakened.

### 2026-07-28 — Batch 1073 stabilization wait diagnosis after shared-shell verification

- [x] Rechecked the 1100px site-admin rectangle: `x=923.109375`,
  `width=35.1875`, document/scroll width `1100`; final measured geometry is
  inside the viewport.
- [x] Separated the remaining 30-second Playwright action timeout from route
  rendering: normal click retries report `visible, enabled and stable` followed
  by `outside of the viewport`, while the current account breadcrumb owner
  selector is not reached.
- [x] Identified harness lifecycle contention from multiple hours-old idle
  Playwright daemons and duplicate Yona Vite processes left by interrupted
  runs, in addition to bounded page/browser teardown waits.
- [x] Re-ran the isolated fallback-off Chrome interaction on fresh dynamic
  ports; the locator timeout persists independently of stale process state.
  Keep strict normal interaction and screenshot gates; no force-click or
  timeout relaxation is allowed.

### 2026-07-28 — Batch 1074 isolated actionability reproduction

- [x] Reproduced the locator timeout with fresh dynamic-port servers and a new
  System Chrome process; stale daemons are not the root cause.
- [x] Confirmed the site-admin link remains in viewport at 1100x720 and that
  `elementFromPoint` resolves its measured center to the link.
- [x] Confirmed a real coordinate mouse click and the anchor's normal DOM click
  both navigate successfully; only Playwright locator actionability reports
  `outside of the viewport`.
- [ ] Keep the strict parity gate and decide the harness-level measured-point
  interaction workaround separately from route implementation. Do not alter
  route geometry or weaken screenshot/timeout criteria.

### 2026-07-28 — Batch 1071 anonymous public landing legacy shell parity

- [x] Restored legacy anonymous landing/navbar/footer class and wrapper flow from
  the Scala partials and frozen LESS cascade.
- [x] Preserved React state/event ownership for anonymous sidebar tabs and pin.
- [x] Applied desktop footer `10px 0px` and mobile `10px` from frozen evidence;
  retained GNB `98%` geometry without compensation.
- [x] Fallback-off external System Chrome focused desktop/mobile parity passes
  2/2, including DOM, source contract, geometry, and overflow.
- [ ] Broad fallback-off/global audit and final pixel lock remain open.

### 2026-07-28 — Batch 1070 authenticated sidebar transition and icon parity

- [x] Preserve the legacy-derived open/close animation while committing the
  logical sidebar state only after the width transition settles.
- [x] Restore the fallback-off Yobicon arrow and refresh contracts from the
  frozen icon stylesheet; desktop/mobile sidebar, main, close-pin, refresh,
  storage, and interaction checks pass 1/1 in external System Chrome.
- [ ] Rebuild the remaining legacy three-pane sidebar DOM gap in a separate
  route-state wave; full fallback-off/global audit and final pixel lock remain
  open.

### 2026-07-28 — Batch 1069 legacy auth alias route parity

- [x] Add explicit `/login`, `/register`, and `/forgot-password` TanStack
  compatibility routes with query-preserving redirects to the legacy
  canonical screens.
- [x] Verify the auth alias flow and migrated public-index/source contracts in
  external System Chrome; the focused spec's alias and four remaining checks
  are green across the final reruns.
- [ ] Full fallback-off/global audit, production-dist live pair for this wave,
  and final pixel lock remain open.

### 2026-07-28 — Batch 1068 managed E2E stabilization diagnosis

- [x] Separate the fallback-off assertion failures from runner stabilization:
  managed E2E launches Vite HMR and a fresh `cargo run`, rather than serving
  the rebuilt `frontend/dist`.
- [x] Record host contention evidence: 75 Chrome, 2 Vite, 2 Yoram, and 5
  stale Playwright installer processes were present during the focused run.
- [ ] Keep the final pixel lock and full fallback-off/global audit open; no
  timeout or screenshot threshold was relaxed.

### 2026-07-28 — Batch 1043 help-shell sweep metric correction

- [x] Map the existing `help-shell-page-wrap-outer` owner into the visual
  sweep's legacy `pageWrap` metric.
- [x] Record the actual centered 143px metric for the 1080px desktop fallback;
  the unchanged stale 133px assertion remains a separate baseline item.
- [ ] Remaining visual-sweep batches, full fallback-off/global audit, and final
  pixel lock remain open.

### 2026-07-28 — Batch 1042 direct issue-form uploader geometry

- [x] Restore the legacy Bootstrap border-box behavior on the fixed-height
  issue editor so the uploader follows it without a numeric offset.
- [x] Focused external Chrome fallback-off desktop/mobile test passes 2/2 for
  both `/user/issues/new` and `/user/issues/new/mine`.
- [ ] Remaining visual-sweep batches, full fallback-off/global audit, and final
  pixel lock remain open.

### 2026-07-28 — Batch 1041 user-issues left-menu containment

- [x] Restore the legacy search-bar/textbox declarations required to keep the
  `/user/issues` left menu horizontally contained.
- [x] Focused external Chrome fallback-off test passes 1/1 on desktop/mobile,
  including search submission and URL query behavior.
- [ ] Full fallback-off/global audit, remaining visual-sweep batches, and the
  final pixel lock remain open.

### Production full-sweep responsiveness — 2026-07-27

- [x] Rebuilt frontend dist and Rust filesystem-asset runtime; ran Playwright with System Chrome outside the sandbox.
- [x] Fixed harness-only waits and bounded paint/cleanup without relaxing failures; incomplete paint settlement remains a route error.
- [x] Fixed unavailable-project and trailing `/code/`/`/commits/` blank screens against legacy error-shell behavior.
- [x] Regenerated canonical full evidence: legacy `248/273`, local `362/397`, zero timing failures.
- [ ] Final pixel parity remains open: `35` local failures and `210` comparison diff failures are recorded for follow-up.

### 2026-07-27 Batch 1032 project-commits empty warning ownership

- [x] `yona-original/app/views/code/history.scala.html:130`, `_page.less:6253-6257`, `conf/messages`, the complete `yobi.less` import chain, and Bootstrap table rules establish the exact empty history cell, copy, and cascade.
- [x] `frontend/src/routes/$ownerName/$projectName/commits.tsx` preserves the legacy `tr > td[colspan=5]` output and moves only this cell from shared `warning-none` to the stable `project-commits-empty-warning` StyleX owner with the three exact declarations. HOME and nested file-history consumers intentionally retain the shared fallback.
- [x] `frontend/tests/stylex-project-commits-warning-none.e2e.ts` records RED→GREEN source/import/message evidence, runtime class absence, exact desktop/mobile computed output, DOM structure, plugin-attribute absence, containment, no overflow, and screenshots.
- [x] External System-Chrome normal worker focus passed `1/1 (14.7s)`; explicit fallback-off focus passed `1/1 (13.3s)`; frontend typecheck, production build/StyleX verifier, and diff check pass.
- [x] Stabilization diagnosis is recorded separately from parity: a regression `page.goto(.../commits)` trace under HMR spent `8624ms` waiting for the HTTP 200 HTML document before `load`; release/dist settle remains `9–15ms` after the route exists. No screenshot or parity wait was relaxed.
- [ ] Keep the nested file-history `warning-none` consumer, global fallback-consumer audit, full fallback-off suite, same-fixture legacy screenshot pair, and overall final pixel lock open.

### 2026-07-27 Batch 1033 nested file-history empty warning ownership

- [x] `yona-original/app/views/code/history.scala.html`, `commitMsg.scala.html`, the full `yobi.less` import chain, `_common.less`/`_page.less`, Bootstrap/responsive CSS, and `conf/messages` establish the path-specific `mt10` table and exact empty `code.nocommits` cell.
- [x] `frontend/src/routes/$ownerName/$projectName/commits/$branch/$filePath.tsx` preserves breadcrumbs, path table/`mt10`, `tr > td[colSpan=5]`, copy/order, and non-empty history behavior while moving only the empty cell to `commit-file-empty-warning` StyleX ownership.
- [x] `frontend/tests/stylex-project-commit-file-history-warning-none.e2e.ts` records RED→GREEN provenance, exact `16px`/center/`#d4d4d4` output, HOME/app.css fallback retention, DOM/plugin/geometry/no-overflow contracts, and desktop/mobile screenshots.
- [x] External System-Chrome normal and fallback-off focused runs pass `1/1` each (`14.3s` and `14.4s`), with frontend typecheck, production build/StyleX verifier, and diff check passing.
- [ ] Keep global fallback-consumer audit, same-fixture legacy screenshot pairing, full fallback-off final lock, and remaining unrelated code-history presentation consumers open.

### Focused/full visual evidence lifecycle — 2026-07-27

- [x] A sweep with explicit `YORAM_SWEEP_PATHS` writes `latest-focused.json` or `latest-focused-mobile.json`; only a full corpus run writes the canonical `latest.json` or `latest-mobile.json`.
- [x] Machine-readable output records `scope: "focused" | "full"` without changing route comparison, screenshot capture, failure conditions, or final pixel/geometry acceptance.
- [x] External System-Chrome `/user/editform` focused verification completed in 17 seconds with successful legacy/local renders, created the focused artifact, and left the canonical desktop artifact mtime unchanged.
- [x] The canonical desktop artifact was regenerated by the completed full production sweep; RC full-corpus coverage contracts are green again.
- [x] Final screenshot parity remains mandatory. This change removes repeated full-corpus regeneration from the development loop; it does not convert focused evidence into final evidence.

### Final-lock directory/settings harness evidence — 2026-07-27

- [x] `scripts/visual-parity-sweep.mjs` maps the local projects directory, organization directory, site user list, and user settings page/shell StyleX owners to the generic `pageWrap`/`projectPageWrap` metrics while retaining the legacy class selectors.
- [x] `/projects`, `/orgs`, `/sites/userList`, and `/user/editform` are now unconditional desktop/mobile screenshot targets. No route TSX, E2E expectation, frozen CSS, or geometry changed.
- [x] External `PW_CHANNEL=chrome` desktop and 390px sweeps loaded all eight legacy/local page states with HTTP 200. All sixteen screenshots were directly inspected, and the false missing/hidden wrapper reports are cleared.
- [x] The stale local `/projects` implementation-fixture copy remains flagged rather than suppressed. `/sites/userList` has different live users and local administrator guidance copy, so same-fixture pixel parity is not claimed for that state.
- [x] Remaining GNB output and Yoram footer differences are approved deviations. The inherited administrator-notice/sidebar collapse-button x-axis mismatch remains intentionally uncorrected.

### 2026-07-27 Batch 1022 authenticated project Pull Request populated grid and overflow ownership

- [x] `yona-original/app/views/git/list.scala.html`, `git/partial_search.scala.html`, and `git/partial_list.scala.html` establish the populated Pull Request filter/content/list DOM; frozen Bootstrap/responsive CSS plus `_responsive.less`, `_page.less:3748-3758`, and `_yobiUI.less:1348-1383` establish the exact grid, responsive hiding, select width, and full filter-input width.
- [x] `frontend/src/routes/$ownerName/$projectName/pullRequests.tsx` preserves the existing search/list DOM, owner markers, copy, links, and React/TanStack query/navigation behavior. Route-local StyleX now owns exact Bootstrap `span2`/`span10` geometry, the contributor select `width:100%`, and `.search-bar .textbox.full` `width:100%`; no frozen file or invented geometry value changed.
- [x] `frontend/tests/stylex-project-pull-requests.e2e.ts` uses a populated PR fixture and verifies source/import provenance, desktop search/content/list/row x-axis alignment, mobile filter hiding, contributor/input containment, and zero document/column overflow. Managed external System-Chrome fallback-off focused run passes 1/1; TypeScript check, Vitest 14/14, production build, and StyleX verifier pass.
- [x] Owner-aware `scripts/visual-parity-sweep.mjs` recognizes the retired-wrapper replacements (`project-pullrequests-page`, `project-pullrequests-shell`, `project-pullrequests-search-column`) and always captures this route. Live legacy/local desktop and 390px screenshots were inspected: the grid and overflow gap is resolved. Remaining comparator output is the known global GNB placement; visible fixture-level row paint/copy/avatar/pagination differences and approved Yoram footer differences remain documented, while the inherited administrator-notice/sidebar collapse-button x-axis mismatch remains intentionally uncorrected.
- [x] The final external `PW_CHANNEL=chrome` fallback-off consumer graph completed with 1941 passed, 1 intentional generated-fallback skip, and 36 unrelated baseline failures (exit 1); the focused Pull Request 1/1 result remains green.

### 2026-07-27 Batch 1021 public-profile missing-user Home CTA

### 2026-07-27 Batch 1021 public-profile missing-user Home CTA

- [x] `yona-original/app/views/user/view.scala.html` and included `error/notfound_default.scala.html` are the output DOM/UX sources; the complete frozen `yobi.less` chain, `_variables.less`, `_yobiUI.less`, Bootstrap CSS/responsive CSS, and `conf/messages` are recorded as cascade evidence.
- [x] `PublicProfileNotFoundPage` preserves `error-wrap` child order, icon/message, anchor semantics, Home copy, `/` destination, and SPA navigation; only the CTA `ybtn ybtn-info` class is retired.
- [x] Route-local StyleX owns the exact frozen `.ybtn` + `.ybtn-info` base, hover, focus, and active declarations without changing frozen CSS or adding geometry compensation.
- [x] `frontend/tests/stylex-user-profile-notfound-home-button.e2e.ts` verifies source ownership, class/plugin-attribute retirement, computed declarations, interaction states, desktop/390px containment, navigation, and screenshots.
- [x] External System-Chrome managed dynamic-port focused runs pass normal 1/1 and fallback-off 1/1; local captures were inspected under `frontend/output/playwright/stylex-user-profile-notfound-home-button/{fallback-on,fallback-off}/`.
- [x] Live legacy `/ghost` desktop/mobile captures were inspected. The available local sweep was stale/unmatched and its generic comparator reported `pageWrap`/`projectPageWrap` gaps, so no same-fixture live legacy/local screenshot claim is made.
- [x] The inherited admin-notice/collapsed-sidebar x-axis mismatch remains an intentional legacy parity exclusion; approved Yoram footer/provider/developer-contact/repository differences remain intentional and are not restored.

### Final-lock harness evidence — 2026-07-27

- [x] `scripts/visual-parity-sweep.mjs` now recognizes the local StyleX owner marker `data-stylex-owner="user-profile-page"` while retaining the legacy `.user-profile-page` selector for the live target; React output and frozen CSS remain unchanged.
- [x] External System-Chrome owner-aware `/admin` sweeps at desktop and 390px load both targets with HTTP 200 and no local runtime errors. The stale local profile-surface absence is cleared; remaining comparator differences are the documented search/user-menu geometry and empty post-list fixture (`gnbSearchForm`/`gnbUsermenu`, `postListWrap`, `postItemTitle`).
- [x] The full fallback-off consumer graph remains 81 passed with one intentional generated-fallback skip. Live legacy `/alice?selected=pullRequests` is still an empty state, so populated Pull Request same-fixture screenshot parity remains open and the goal is not complete.
- [x] The inherited administrator-notice/sidebar collapse-button x-axis mismatch is intentionally not corrected. The user-approved NAVER/provider/developer-contact/upstream-repository Yoram footer differences remain intentional and are not restored.

### 2026-07-27 Batch 1020 public-profile Issues static control ownership

- [x] `user/view.scala.html` plus the two common checkbox partials establish the wrapper/label/input/border/text DOM, IDs, copy/order, and legacy JS behavior evidence; frozen `_page.less`, `_responsive.less`, Bootstrap CSS, and the complete styling chain establish the final declarations.
- [x] React preserves inner legacy output and translates popover, hover, checkbox, localStorage, and show-subtasks behavior; only the two outer presentation compositions retire. `checkboxControlInput` includes the traced Bootstrap and frozen nested-input normalization required for fallback-off parity.
- [x] `frontend/tests/stylex-user-profile-static-controls.e2e.ts` verifies source provenance, StyleX owners, plugin-attribute absence, desktop/390px geometry, hover/focus and state transitions, containment/no-overflow, and screenshots under `frontend/output/playwright/stylex-user-profile-static-controls/`. The adjacent spacing test uses stable owners rather than retired outer classes.
- [x] Managed outside-sandbox `PW_CHANNEL=chrome` normal and fallback-off focused runs pass 2/2 each; TypeScript check, Vitest 14/14, formatter, production build/StyleX verifier, and diff check pass.
- [x] No frozen CSS or geometry compensation was added. The inherited administrator-notice/sidebar x-axis mismatch and approved Yoram footer/provider/developer-contact/repository differences remain intentional exclusions; live legacy screenshot pairing remains final-lock work.

### 2026-07-26 Batch 983 public profile guest empty stream-shell ownership

- [x] `user/view.scala.html` proves `user-stream-box` is always emitted outside the current-viewer guest guard, while `_page.less` and the complete import chain establish exact root padding/overflow and no later override.
- [x] The childless guest root owns only `padding-left:20px` and `overflow:hidden` and retires `user-stream-box`; the authenticated stream class, owner, controls/tabs, descendant fallback, and existing min-width remain unchanged.
- [x] `frontend/tests/stylex-user-profile-guest-stream-shell.e2e.ts` verifies RED→GREEN branch/source evidence, desktop/mobile declarations, emptiness, class/plugin absence, profile/info-rail geometry, authenticated exclusion, and zero overflow.
- [x] Managed outside-sandbox System-Chrome normal passes 2/2 and fallback-off selected coverage passes 6/6 plus anonymous branch 1/1; live legacy screenshot parity remains final visual-lock work.

### 2026-07-26 Batch 982 public profile Google provider image ownership

- [x] `user/view.scala.html`, `TemplateHelper.GoogleLogo`, Bootstrap's generic image rule, `bootstrap-responsive.css`, and the complete `yobi.less` chain establish the Google span/image output and prove markdown/avatar image overrides do not match.
- [x] The byte-identical legacy Google SVG is imported from `frontend/src/assets/legacy/**` through Vite; the image owns exact final height/max-width/alignment/border while only this declaration-free `.google` token retires.
- [x] `frontend/tests/stylex-user-profile-google-provider-logo.e2e.ts` verifies RED→GREEN provenance, imported asset loading/identity, provider order/branches, desktop/mobile computed declarations, intrinsic 30px geometry, containment/non-overlap, empty/guest states, and zero overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off passes focused 2/2 plus provider-specific adjacent checks; live legacy screenshot parity remains final visual-lock work and no compensation was added.

### 2026-07-26 Batch 981 public profile tab-content visibility ownership

- [x] `yona-original/app/views/user/view.scala.html`, Bootstrap `.tab-content` and direct pane/active-child rules, `bootstrap-responsive.css`, and the complete `yobi.less` import chain establish the exact two-wrapper/five-pane output and absence of later matching overrides.
- [x] Route-local StyleX owns `overflow:hidden` and inactive/active `display:none/block` only for the profile body; the unrelated usermenu tab-content consumer and tab-button `li.active` states remain unchanged.
- [x] `frontend/tests/stylex-user-profile-tab-content-visibility.e2e.ts` verifies RED→GREEN source/import evidence, desktop/mobile outer and nested interaction matrices, ids/order/copy, complete computed visibility, containment/hidden geometry, guest absence, class retirement, retained usermenu fallback, and zero overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off passes focused 2/2 and selected adjacent 7/7; live legacy screenshot parity remains final visual-lock work and no compensation was added.

### 2026-07-26 Batch 980 public profile daysAgo input complete ownership

- [x] `yona-original/app/views/user/view.scala.html`, Bootstrap number-input base/focus rules, the complete ordered `yobi.less` chain, `_page.less .input-mini-min`, `_responsive.less`, `_yobiUI.less`, variables/messages, and nonmatching later imports are recorded.
- [x] Existing `daysAgoInput` owns the complete final desktop/mobile base and focus cascade plus Scala inline margin/alignment; only this fully-owned consumer retires `input-mini-min`.
- [x] Field attributes/default, prefix/input/suffix order, query behavior, editable value, non-guest/guest branches, wrapper float, tabs, and unrelated inputs remain unchanged.
- [x] `frontend/tests/stylex-user-profile-days-ago-input-complete.e2e.ts` verifies RED→GREEN source/import/specificity, class/inline/plugin absence, complete computed declarations, field/query/edit behavior, exact geometry, containment/non-overlap, guest absence, and zero overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off passes 1/1; live legacy screenshot parity remains final visual-lock work and no compensation was added.

### 2026-07-26 Batch 979 public profile tab count badges

- [x] `yona-original/app/views/user/view.scala.html` including `showBadgeNumberIfExist`, the complete ordered `yobi.less` chain, frozen `_yobiUI.less .num-badge`, and nonmatching `.lst-stacked` / `.ybtn.blue` descendant variants are recorded.
- [x] One route-local `tabCountBadge` declaration carries the exact eight generic declarations and is reused through distinct repeated top-level/nested stable owner boundaries; no paint or duplicate style object is added.
- [x] Top-level positive-only and nested always-present zero output, spans/classes/copy/order, tab interactions, responsive button geometry, two-column/show-subtasks controls, and unrelated badge consumers remain unchanged.
- [x] `frontend/tests/stylex-user-profile-tab-count-badges.e2e.ts` verifies RED→GREEN source/import/selector evidence, single-style reuse, populated/zero branches, exact desktop/mobile declarations, no inline/plugin attrs, interaction/geometry, containment/non-overlap, and zero overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off passes 1/1; live legacy screenshot parity remains final visual-lock work and no compensation was added.

### 2026-07-26 Batch 978 public profile status badges

- [x] `yona-original/app/views/user/view.scala.html`, frozen Bootstrap `.label,.badge`/`.badge`/success/important rules, the complete ordered `yobi.less` chain, later `_page.less .badge`, and nonmatching `_override.less .label` are recorded.
- [x] Route-local StyleX owns exact shared final badge geometry/typography/paint and the green/red variant backgrounds only; generic badge consumers and the generic unused `#999` background remain fallback-owned.
- [x] Both status wrappers, span elements, `badge label-success` / `badge label-important`, copy/order, all four condition combinations, parent spacing, since/provider output, and unrelated profile states remain unchanged.
- [x] `frontend/tests/stylex-user-profile-status-badges.e2e.ts` verifies RED→GREEN provenance/import order, owners, branches, exact desktop/mobile declarations, no inline/plugin attrs, containment/non-overlap, retained neighbors, and zero overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off passes 1/1. The known legacy admin-notice/sidebar x-axis mismatch remains deprioritized; live legacy screenshot parity remains final visual-lock work and no compensation was added.

### 2026-07-26 Batch 977 public profile edit control

- [x] `yona-original/app/views/user/view.scala.html`, frozen `_yobiUI.less .ybtn`/`.ybtn-mini`/nested icon rules, the complete ordered `yobi.less` chain through `_override.less`, and Korean messages are recorded.
- [x] Route-local StyleX owns exact button base/hover/focus/active geometry and paint plus icon 20px line height; no unrelated `ybtn` consumer or variant is migrated.
- [x] Owner/non-owner branch, TanStack `/user/editform` destination, reload behavior, legacy classes, icon, Korean copy/order, parent edit alignment, surrounding profile output, and intentional footer deviations remain unchanged.
- [x] `frontend/tests/stylex-user-profile-edit-control.e2e.ts` verifies RED→GREEN provenance, branches, copy/classes/href/order, no plugin attrs, exact desktop/mobile declarations, containment, icon line height, and zero overflow; the adjacent identity test receives only lint cleanup.
- [x] Managed outside-sandbox System-Chrome fallback-off passes 1/1. The known legacy admin-notice/sidebar x-axis mismatch is intentionally deprioritized; live legacy screenshot parity remains final visual-lock work and no compensation was added.

### 2026-07-26 Batch 976 public profile sidebar identity paint

- [x] `yona-original/app/views/user/view.scala.html`, frozen `_page.less:4970-5058`, later `_yobiUI.less .usf-group .loginid`, `_common.less`, `_override.less`, the complete ordered `yobi.less`/Bootstrap/responsive chain, messages, and runtime email configuration are recorded.
- [x] The legacy-unproven `.user-info-box` `#337581` parent paint is removed; name and optional email inherit body `#333`, login ID owns exact `#999`, and existing name 18px/700 typography remains.
- [x] Identity span types/classes/order/copy, legacy whitespace, email shown/hidden branch, since orange, provider/status/edit/tabs/guest/project states remain; nonmatching dropdown/select2 white login-ID selectors are excluded.
- [x] `frontend/tests/stylex-user-profile-sidebar-identity-paint.e2e.ts` verifies RED→GREEN source absence/ancestry, owners, exact desktop/mobile paint/type, email branches, DOM/order/whitespace geometry, containment/non-overlap, retained neighbors, no plugin attrs, and zero overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off passes 1/1; live legacy screenshot parity remains final visual-lock work and no geometry compensation was added.

### 2026-07-26 Batch 975 public profile project leave control

- [x] `yona-original/app/views/user/view.scala.html`, included `user/partial_projectlist.scala.html`, frozen Bootstrap anchors, the complete ordered `yobi.less` chain through `_override.less`, Bootstrap/responsive CSS, messages, and `yobi.user.View.js` confirm behavior are recorded.
- [x] Route-local StyleX owns only the leave Link's actually matching `.nbtn`, `.black`, `.last`, and `a.nbtn.medium` final base/hover/focus cascade; `.dbtn-group`, `> i.ico`, button-only, disabled/active, other variants, icon glyph/font, and unrelated consumers are excluded.
- [x] TanStack route/params, `data-projectname`, legacy classes, trash icon, copy/order, conditional branch, stats/watch owners, and frozen clipping remain. React now shows the localized project-name confirmation, blocks cancel navigation, and keeps accepted leave navigation.
- [x] `frontend/tests/stylex-user-profile-project-leave-control.e2e.ts` verifies RED→GREEN provenance/exclusions, conditional output, exact desktop/mobile declarations, href/data/classes/icon/copy/order, confirmation copy, cancel/accept behavior, containment/non-overlap, and zero document overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off passes 1/1; live legacy screenshot parity remains final visual-lock work and no geometry compensation was added.

### 2026-07-26 Batch 974 public profile project origin and watch controls

- [x] `yona-original/app/views/user/view.scala.html`, included `user/partial_projectlist.scala.html`, frozen Bootstrap anchors, the complete ordered `yobi.less` import chain through `_override.less`, Bootstrap/responsive CSS, messages, and `yobi.user.View.js` behavior evidence are recorded.
- [x] Route-local StyleX owns four exact surfaces: conditional origin generic anchor states, complete final watch `.ybtn` base/hover/focus/active cascade, nested icon 20px line height, and generic numeric badge typography/spacing/radius/alignment.
- [x] Origin present/absent and watch/unwatch branches, Links/routes/reload behavior, legacy classes, icon variants, count/copy/order, `yobicon-middle` alignment, and existing project owners remain; leave-project `nbtn` and unrelated ybtn/badge consumers are excluded.
- [x] `frontend/tests/stylex-user-profile-project-origin-watch.e2e.ts` verifies RED→GREEN provenance, all owners/states/branches, exact desktop/mobile declarations, DOM/order/links/classes/copy, no inline/plugin attributes, containment/non-overlap, frozen mobile clipping, and zero document overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off check passes 1/1; live legacy screenshot parity remains final visual-lock work and no geometry compensation was added.

### 2026-07-26 Batch 973 public profile project title and owner links

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_projectlist.scala.html`, frozen Bootstrap generic anchor rules, later `_common.less` generic anchor override, `_page.less:1842-1890,5072-5076`, and the complete `yobi.less`/Bootstrap/responsive import chain are recorded as title/owner Link evidence.
- [x] Route-local StyleX owns exact inherited base color/no-decoration/no-outline and `#005580` underlined no-outline hover/focus states; removing the legacy-unproven parent `#777` paint restores title body `#333` and owner `.name-tag` `#999`/11px inheritance.
- [x] The unmatched `.header .owner-name-small` 19px rule, origin/watch/leave/other anchors, project DOM/classes/destinations/copy/order, existing child owners, other tabs, and the known legacy admin-notice/sidebar mismatch remain excluded or unchanged.
- [x] `frontend/tests/stylex-user-profile-project-links.e2e.ts` verifies provenance, parent-color absence, both owners, exact desktop/mobile base/hover/focus declarations, inheritance, DOM/order/links/classes, no inline/plugin attributes, containment, and no document overflow.
- [x] Managed outside-sandbox System-Chrome fallback-off check passes 1/1; live legacy screenshot parity remains final visual-lock work and no geometry compensation was added.

### 2026-07-26 Batch 972 public profile project avatar image and fork icon

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_projectlist.scala.html`, frozen `_common.less:173`, later `_yobiUI.less:439-466`, the complete `yobi.less`/Bootstrap/responsive import chain, and `conf/messages` are recorded as avatar-image/fork-icon evidence.
- [x] Route-local StyleX owns exact repeated image `width:100%`/`vertical-align:top` and conditional fork-icon `vertical-align:middle !important`; no legacy-unproven image height or additional icon declaration is added.
- [x] Avatar Link/wrapper/image source/alt, fork present/absent branch, split-icon classes, origin Link/copy, DOM order, Batch 971 owners, and generic icon font/glyph/color fallback remain unchanged.
- [x] `frontend/tests/stylex-user-profile-project-avatar-image-fork-icon.e2e.ts` verifies source provenance/owners, repeated images, fork branches, exact desktop/mobile declarations, DOM/order/links/copy/classes, no inline/plugin attributes, containment, and no document overflow.
- [x] Managed outside-sandbox System-Chrome fast check passes 1/1; live legacy screenshot parity remains final visual-lock work and no geometry compensation was added.

### 2026-07-26 Batch 971 public profile project avatar and private lock

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_projectlist.scala.html`, frozen `_page.less:1842-1890`, `_common.less`, `_yobiUI.less:439-466`, the complete `yobi.less`/Bootstrap/responsive import chain, and `conf/messages` are recorded as populated Projects child evidence.
- [x] Route-local StyleX owns the exact `avatar-wrap small` 24px box/display/alignment/clipping/surface/radius declarations and conditional private-lock `#7F8C8D` paint; legacy classes, element types, branches, order, links, copy, and existing parent owners remain.
- [x] The frozen `.header .owner-name-small` rule is explicitly excluded because the Scala DOM places that Link under `.name-tag`; no style is migrated from a class-name-only false match. Generic avatar image and icon font/glyph fallback remain retained.
- [x] `frontend/tests/stylex-user-profile-project-child-paint.e2e.ts` verifies source provenance and selector ancestry, source owners, private/public branches, exact desktop/mobile declarations, DOM order/copy/links/classes, no inline/plugin attributes, containment, and no document overflow.
- [x] Managed outside-sandbox System-Chrome fast check passes 1/1; live legacy screenshot parity remains final visual-lock work and no geometry compensation was added.

### 2026-07-26 Batch 970 public profile issue metadata items

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_issues.scala.html`, frozen `_page.less:3946-3950,4080-4087`, the complete `yobi.less`/Bootstrap/responsive import chain, and `conf/messages` are recorded as date/milestone metadata evidence.
- [x] Route-local StyleX owns exact date infos-item `float:left`/`margin-right:6px` and milestone tag 135px maximum width, ellipsis/hidden overflow, `#2196f3`, 11px font, and 6px radius; no legacy-unproven display or compensating declaration was added.
- [x] Element types, metadata order, date title/copy, conditional milestone Link/title/copy, `infos-item`/`mileston-tag` classes, existing meta/due-date owners, and unrelated issue/pull-request/responsive consumers remain unchanged.
- [x] `frontend/tests/stylex-user-profile-issue-metadata-items.e2e.ts` verifies source provenance and ownership, exact desktop/mobile declarations, milestone present/absent branches, copy/links/order, retained classes, no inline/plugin attributes, containment, and no document overflow.
- [x] Managed outside-sandbox System-Chrome fast check passes 1/1; live legacy screenshot parity remains final visual-lock work and no geometry compensation was added.

### 2026-07-26 Batch 969 public profile issue author visibility

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_issues.scala.html`, frozen `_responsive.less:1,290-303`, Bootstrap `.hide`, the full LESS/Bootstrap/responsive import chain, and `conf/messages` are recorded as issue author/assignee visibility evidence.
- [x] Route-local StyleX owns exact desktop author/assignee `display:none !important` at `max-width:720px` and mobile assignee default `display:none` / mobile `display:block !important`; only the three target `hide-in-mobile` / `hide show-in-mobile` utility compositions are retired.
- [x] Wrapper elements/order, `span1`/`author`, person links/no-person behavior, metadata/date/milestone/due-date output, existing author/meta owners, and unrelated responsive utility consumers remain unchanged.
- [x] `frontend/tests/stylex-user-profile-issue-author-visibility.e2e.ts` and adjacent `stylex-user-profile-issue-fixed-height.e2e.ts` verify provenance, source ownership, class retirement, desktop/mobile display and geometry, copy/links/order, no plugin attrs, and no overflow.
- [x] Managed outside-sandbox System-Chrome fast checks pass 1/1 each; live legacy screenshot parity remains final visual-lock work and no compensating geometry was added.

### 2026-07-26 Batch 968 public profile pull-request empty author branch

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_pullRequests.scala.html`, frozen `_page.less:3946-3950`, `_responsive.less`, the full LESS/Bootstrap/responsive import chain, and `conf/messages` are recorded as pull-request empty-author evidence.
- [x] The route restores the legacy no-author branch as a non-link `infos-item` span with `issue.noAuthor` copy and the existing exact infos-item float/margin owner; authored-link/date/comment/receiver/state behavior remains unchanged and `-user-profile.stylex.ts` stays unchanged.
- [x] `frontend/tests/stylex-user-profile-pull-request-empty-author.e2e.ts` verifies provenance, source-owner contract, legacy copy, author-link absence, desktop/mobile computed geometry, no plugin attrs, and containment/no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-26 Batch 967 public profile pull-request infos items

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_pullRequests.scala.html`, frozen `_page.less:3881-3895`, `_responsive.less`, Bootstrap `.pull-left`, the full LESS/Bootstrap/responsive import chain, and `conf/messages` are recorded as pull-request infos-item evidence.
- [x] Shared StyleX owns exact infos-item `float:left` and `margin-right:6px`, contributor hover paint/no-underline, comment-link paint/no-underline, comment icon `vertical-align:middle`, and count `margin-right:3px`; pull-request DOM/order/copy/links and existing row/title/receiver/state owners remain.
- [x] `frontend/tests/stylex-user-profile-pull-request-infos-items.e2e.ts` verifies provenance, source-owner contracts including the contributor `stylexOwner` passthrough, populated contributor/date/comment output, desktop/mobile computed declarations, hover paint, no plugin attrs, and containment/no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-26 Batch 966 public profile pull-request receiver spacing

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_pullRequests.scala.html`, frozen `_common.less:219`, frozen `_page.less:3873-3879`, `_responsive.less`, the full LESS/Bootstrap/responsive import chain, and `conf/messages` are recorded as receiver-spacing evidence.
- [x] Shared StyleX owns the exact receiver rail `margin-top:5px` and nested `.avatar-wrap.assinee` `margin-right:0`; pull-request DOM/order/copy/links/receiver-state-empty-avatar behavior, existing row/title/avatar/infos owners, and legacy `avatar-wrap assinee` class remain.
- [x] `frontend/tests/stylex-user-profile-pull-request-receiver-spacing.e2e.ts` verifies provenance, owners, populated receiver and empty-avatar branches, desktop/mobile computed spacing, no plugin attrs, and containment/no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-26 Batch 965 public profile pull-request state shell and empty avatar

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_pullRequests.scala.html`, frozen `_page.less:4060-4078`, `_variables.less`, `_responsive.less`, the full LESS/Bootstrap/responsive import chain, and `conf/messages` are recorded as pull-request badge/empty-avatar evidence.
- [x] Shared StyleX owns the exact `.state` badge shell, finite state background colors, and `empty-avatar-wrap` `32px` dimensions; pull-request DOM/order/copy/links/receiver behavior, existing row/title/avatar/infos owners, and legacy `state ${displayState}` / `empty-avatar-wrap` classes remain.
- [x] `frontend/tests/stylex-user-profile-pull-request-state-shell.e2e.ts` verifies provenance, owners, populated conflict/open output, badge shell desktop/mobile computed declarations, finite state colors, empty-avatar dimensions, no plugin attrs, and containment/no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-26 Batch 964 public profile pull-request row residuals

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_pullRequests.scala.html`, frozen `_page.less:3851-4085`, `_responsive.less`, the full LESS/Bootstrap/responsive import chain, and `conf/messages` are recorded as pull-request row evidence.
- [x] Shared StyleX owns the populated pull-request row shell, project avatar rail, title-wrap, post-id, title/project/conflict paint, infos, and responsive mobile `padding:10px 0 !important`; pull-request DOM/order/copy/links/comment/receiver behavior and the existing receiver/state float owners remain.
- [x] `frontend/tests/stylex-user-profile-pull-request-row.e2e.ts` verifies provenance, owners, populated conflict/open output, links, receiver/empty branch, desktop/mobile declarations, responsive padding, no plugin attrs, scoped owner containment, and `scrollWidth` 390.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 963 public profile child issue residuals

- [x] `yona-original/app/views/user/view.scala.html`, `user/partial_issues.scala.html`, `issue/partial_view_childIssueListOnly.scala.html`, `issue/partial_view_child.scala.html`, and frozen `_page.less:7573-7581,7592-7596` are recorded as child-row evidence.
- [x] Shared StyleX owns `.subtask-number` typography/geometry and the child count-group border reset; `no-border-at-child` is retired while `font12`, `item-count-groups`, child DOM/order, and ShowSubtasks behavior remain.
- [x] `frontend/tests/stylex-user-profile-child-row.e2e.ts` verifies provenance, owners, child order/copy/links, interaction, computed geometry, and no plugin attributes.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 958 public profile issue-title residuals

- [x] `user/view.scala.html:112-167`, `user/partial_issues.scala.html`, `_page.less:7505-7570`, supporting LESS/Bootstrap/responsive/message evidence, and the full `yobi.less` chain are recorded as issue-title output/cascade evidence.
- [x] `title-cell` owns exact 5px vertical padding/table-cell/middle alignment, the main title owns 14px/500 typography, and the count group owns 10px typography. Existing issue-row/title-wrap/links/copy remain; author/meta/post-id, child rows, nested tabs, sidebar, and admin alignment are excluded.
- [x] `frontend/tests/stylex-user-profile-issue-title-cell.e2e.ts` verifies owners, computed desktop/mobile declarations, issue link/copy/count, no inline/plugin attributes, containment, and no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 957 public profile projects first row

- [x] `user/view.scala.html:168-180`, `user/partial_projectlist.scala.html:11-42`, `_page.less:1837-1845,1932-1938`, and the full LESS/Bootstrap import chain are recorded as project-list and first-row evidence.
- [x] Only the first `user-streams all-projects` row owns frozen `padding-top:5px`; later rows retain the base 15px padding. Project DOM/classes/links/copy/order and Projects tab behavior remain unchanged.
- [x] `frontend/tests/stylex-user-profile-project-first-row.e2e.ts` verifies first/second computed padding, source ownership, order/links, desktop/mobile containment, no overflow, and no inline/plugin attributes.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 956 public profile nested issue tabs

- [x] `user/view.scala.html:112-167`, `_common.less:32`, `_yobiUI.less:470-487`, `_responsive.less:445-448`, Bootstrap nav-tabs including `margin-right:2px`, and the complete `yobi.less` import chain are recorded as nested issue-tab evidence.
- [x] The nested issue-tab wrapper owns `.nm` `margin:0 !important`; buttons own exact Bootstrap/legacy spacing and nav-tab paint with desktop/mobile responsive values. DOM/order/counts/active interaction/ShowSubtasks remain unchanged; top-level/sidebar tabs and admin alignment are excluded.
- [x] `frontend/tests/stylex-user-profile-issue-tabs.e2e.ts` verifies owners, computed desktop/mobile declarations, open/closed interaction, counts/checkbox, no inline/plugin attributes, and no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 955 public profile top-level tabs

- [x] `user/view.scala.html:87-112`, frozen `_yobiUI.less:470-487`, `_responsive.less:445-448`, `_variables.less`, Bootstrap nav-tabs rules, and the complete `yobi.less` import chain are recorded as tab output/cascade evidence.
- [x] Top-level tab buttons own exact 30px desktop/5px mobile horizontal padding, `#3592b5`, bold weight, and hover `#F2F2F2`/no-decoration; DOM/order/copy/active behavior and the two-column checkbox remain unchanged. Nested issue tabs/sidebar/admin alignment are excluded.
- [x] `frontend/tests/stylex-user-profile-top-tabs.e2e.ts` verifies owners, computed desktop/mobile declarations, active interaction, checkbox, no inline/plugin attributes, and no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 954 public profile guest badge

- [x] `user/view.scala.html:45-53`, frozen `_page.less:4970-5048`, and the complete LESS/Bootstrap import chain are recorded as guest-badge output and cascade evidence.
- [x] Guest-only `guest-user` and `left-mark` DOM/classes/copy/order remain unchanged; StyleX owns the exact background, width, radius, color/alignment, vertical writing, and spacing. Vendor-prefixed property names are used solely for the dev collector's fallback-off CSSOM compatibility.
- [x] `frontend/tests/stylex-user-profile-guest-badge.e2e.ts` verifies owners, computed vertical geometry/paint, no inline/plugin attributes, and desktop/390px containment/no-overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified, and the legacy admin-notice/sidebar x-axis mismatch is intentionally not corrected.

### 2026-07-25 Batch 953 public profile whoami/since value

- [x] `user/view.scala.html:54-65,69-72`, `_page.less:4983-4995,5050-5060`, `_variables.less` `@primary:@orange`, and the full import chain are recorded as output/declaration/color evidence.
- [x] `whoami` owns only `margin-top:15px`; `.since` owns exact block/14px/700/5px/primary-color declarations. Profile identity/edit/email/since/provider DOM, copy, order, and behavior remain unchanged.
- [x] `frontend/tests/stylex-user-profile-static-sidebar.e2e.ts` verifies stable owners, computed declarations/color in both modes, identity/edit/since/provider output, no inline/plugin attributes, and desktop/390px containment/no-overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 952 public profile static sidebar status/since spacing

- [x] `user/view.scala.html:67-80` and frozen `_page.less:4970-5068` are recorded as output/cascade evidence, including exact status/since spacing and the full import chain.
- [x] Both `user-status` wrappers own only `margin-top:20px`; both `user-since` wrappers own only `margin-top:10px` and `padding:0 10px`. Badge/provider/inner typography, DOM order, and conditional output remain unchanged.
- [x] `frontend/tests/stylex-user-profile-sidebar-state.e2e.ts` verifies all repeated owners, computed declarations, conditional badges/provider/copy, no inline/plugin attrs, and desktop/390px containment/no-overflow.
- [x] Managed outside-sandbox system-Chrome focused checks pass 1/1 normal and 1/1 fallback-off; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 951 public profile projects-tab all-projects shell

- [x] `user/view.scala.html:166-175` and `user/partial_projectlist.scala.html:11-42` are the output DOM source; frozen `_page.less:1837-1845`, `_common.less`, `_responsive.less`, Bootstrap/responsive CSS, and the full `yobi.less` import chain are recorded in the focused test.
- [x] Only the `all-projects` list shell owns exact `margin:0 0 20px`, `list-style:none`, and `clear:both`; project rows, avatar rail/stats owners, classes, links, copy/order, and tab behavior remain unchanged.
- [x] `frontend/tests/stylex-user-profile-projects-list.e2e.ts` verifies source ownership, no inline/plugin-only attributes, list semantics/order, project-tab interaction, computed desktop/mobile declarations, containment, and no overflow.
- [x] Managed outside-sandbox system-Chrome focused checks pass 1/1 normal and 1/1 fallback-off; live legacy screenshot parity remains unverified and no compensating geometry was added.

### 2026-07-25 Batch 950 public profile projects-tab avatar rail

- [x] `user/view.scala.html:166-175` and `user/partial_projectlist.scala.html:11-18` are the output DOM source; Bootstrap `.pull-left`, `_page.less:1841-1895`, `_common.less`, `_responsive.less`, and the full `yobi.less` import chain are recorded in the focused test.
- [x] Only the avatar rail's `pull-left` is migrated to `styles.projectAvatarRail` with exact `float:left`; the `avatar-wrap small` Link/image fallback, project row/header/description/stats, tab interaction, and separate `projectInfo` margin owner remain unchanged.
- [x] `frontend/tests/stylex-user-profile-project-avatar-rail.e2e.ts` verifies source ownership, no utility/plugin presentation attribute, computed desktop/mobile float, containment/no overflow, and visible project-tab/avatar interaction.
- [x] Managed outside-sandbox system-Chrome focused checks pass 1/1 normal and 1/1 fallback-off; live legacy screenshot parity remains unverified and no compensating geometry was added.

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

### 2026-07-25 Batch 962 public profile issue fixed-height wrappers

- [x] `yona-original/app/views/user/view.scala.html:112-167`, `user/partial_issues.scala.html`, frozen `_common.less:305-307`, and the full LESS/Bootstrap/responsive/messages chain are recorded as output/cascade evidence.
- [x] Project and both author wrappers own exact `line-height:36px`; `span2`/`span1`, structural classes, links, copy/order, and responsive behavior remain. Only `fixed-height-my-issues-list` is retired from the three React-owned wrappers.
- [x] `frontend/tests/stylex-user-profile-issue-fixed-height.e2e.ts` verifies all owners, computed desktop/mobile line-height, project/author output and links, retired utility absence, owner-box containment, no inline/plugin attrs, and no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added. The known legacy admin-notice/sidebar x-axis mismatch remains intentionally out of scope.

### 2026-07-25 Batch 961 public profile issue subtask layout residuals

- [x] `user/view.scala.html:112-167`, `issue/partial_list_subtask.scala.html:17-29`, frozen `_page.less:7487-7502` and non-migrated `_page.less:7228-7332`, plus the full LESS/Bootstrap/responsive/messages chain are recorded as output/cascade evidence.
- [x] Wrapper padding, progress-shell display/width/vertical-align, and ratio/parent `0.8em` typography are StyleX-owned; dynamic percentage width, DOM/copy/link behavior, and non-migrated `.completion-ratio`/`.subtask` classes remain. `!important` is limited to the two typography owners to overcome the frozen nested selector specificity.
- [x] `frontend/tests/stylex-user-profile-issue-subtask-layout.e2e.ts` verifies source evidence, all owners, computed desktop/mobile declarations, dynamic bar width, ratio/parent output and navigation, retained classes, no inline/plugin attributes, containment, and no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added. The known legacy admin-notice/sidebar x-axis mismatch remains intentionally out of scope.

### 2026-07-25 Batch 960 public profile issue project-name residuals

- [x] `user/view.scala.html:112-167`, `user/partial_issues.scala.html`, `_page.less:7643-7654`, `_common.less:305-307`, and the full LESS/Bootstrap/responsive/messages chain are recorded as output/cascade evidence.
- [x] The project column wrapper owns exact flex direction/wrap/grow/justification/alignment and nested project-name ellipsis/overflow/nowrap; `span2`, fixed-height structure, Link/copy/order, and the surrounding issue DOM remain unchanged. The migrated wrapper no longer carries the fallback-only `project-name-in-my-issues` selector.
- [x] `frontend/tests/stylex-user-profile-issue-project-name.e2e.ts` verifies source evidence, owners, computed desktop/mobile declarations, project navigation/copy/order, no inline/plugin attributes, containment, and no overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added. The known legacy admin-notice/sidebar x-axis mismatch remains intentionally out of scope.

### 2026-07-25 Batch 959 public profile issue author/meta residuals

- [x] `user/view.scala.html:112-167`, `user/partial_issues.scala.html`, `_page.less:7505-7570`, and the full LESS/Bootstrap/responsive/messages chain are recorded as output/cascade evidence.
- [x] Author/meta table geometry, author-cell overflow/ellipsis, post-id paint/spacing, and `.infos` top margin are owned by route-local StyleX; DOM/order/copy/links remain unchanged. The unrelated fallback-only `project-name-in-my-issues` display rule is removed from the two author wrappers; structural classes remain.
- [x] `frontend/tests/stylex-user-profile-issue-author-meta.e2e.ts` verifies source evidence, owners, computed declarations, tooltip/link/copy, and responsive containment/no-overflow.
- [x] Managed outside-sandbox System-Chrome normal and fallback-off checks pass 1/1 each; live legacy screenshot parity remains unverified and no compensating geometry was added. The known legacy admin-notice/sidebar x-axis mismatch remains intentionally out of scope.

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

### 2026-07-25 Batch 944 organization issue due-date float ownership

- [x] The organization issue-list due-date wrapper preserves `mr20 mt10`,
  overdue/open/closed branches, title, clock icon, copy/order, and responsive
  containment while removing only React-owned `pull-right`; the existing
  `dueDateWrapper` StyleX owner now owns frozen `float:right`. Assignee rails
  and project issue-list due-date consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 7/7 each
  across open-overdue, open-upcoming, and closed states at desktop/mobile
  sizes, covering provenance, computed declarations, copy, no-overflow, and
  plugin-attribute absence.

### 2026-07-25 Batch 945 standalone login action-row float ownership

- [x] Normal anonymous login action row preserves `act-row mt5`, remember
  checkbox/label, forgot-password Link/copy/href, semantic wrappers,
  line-height/overflow, and responsive containment while removing only
  React-owned `pull-left`/`pull-right`; existing `rememberMe` owns `float:left`
  and new `linksWrap` owns `float:right`. Social-login-only and root login
  dialog remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 3/3 each,
  covering Scala/LESS/Bootstrap/import/messages provenance, owner/declarations,
  semantic class retention, utility absence, computed floats, checkbox/copy/link
  behavior, no-inline/plugin-only attrs, and desktop/mobile geometry.

### 2026-07-25 Batch 946 issue-form attachment progress/delete float ownership

- [x] Authenticated project issue-form attachment rows preserve the legacy
  `attached-file` DOM/order, progress/delete/insert behavior, disabled uploading
  state, copy, and semantic classes while removing only React-owned `pull-right`;
  `attachedFileDelete` and new `uploadProgressWrapper` StyleX owners carry exact
  `float:right`. Other uploader consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering Scala/LESS/Bootstrap/import/messages provenance, owner/declarations,
  retired utilities, computed floats, upload/ready/delete/insert interaction,
  and desktop/mobile row/upload containment/no-overflow. The pre-existing
  fallback-off document-wide 14px shell overflow remains outside this owner.

### 2026-07-25 Batch 947 public profile issue due-date float ownership

- [x] Populated public-profile issue due-date preserves legacy row DOM/order,
  overdue/open/closed copy, title, clock icon, `overdue` state, and responsive
  containment while removing only its React-owned `pull-right`; existing
  `issueDueDate` StyleX owns exact `float:right`. DaysAgo and pull-request row
  float consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering Scala/view/LESS/Bootstrap/import/messages provenance, owner/
  declaration, utility/plugin-attribute absence, computed float, overdue/title/
  icon/copy, and desktop/mobile containment/no-overflow.

### 2026-07-25 Batch 948 public profile pull-request receiver/state floats

- [x] Populated public-profile pull-request rows preserve receiver/empty-avatar
  DOM, `mt5`, state/conflict/open/closed classes and copy, order, and responsive
  containment while removing only the two React-owned `pull-right` utilities;
  `pullRequestReceiverRail` and `pullRequestState` StyleX owners carry exact
  `float:right`. DaysAgo and issue due-date consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering Scala/view/LESS/Bootstrap/import/messages provenance, both owners/
  declarations, utility/plugin-attribute absence, computed floats, receiver/state
  DOM/copy/order, and desktop/mobile containment/no-overflow.

### 2026-07-25 Batch 949 public profile daysAgo wrapper float ownership

- [x] Authenticated public-profile daysAgo controls preserve the non-guest
  wrapper DOM/order, input id/name/type/min/max/default value, existing input
  owner/margins, copy, query behavior, and responsive containment while removing
  only the wrapper React-owned `pull-right`; `daysAgoControls` StyleX owns exact
  `float:right`. Issue due-date and pull-request consumers remain excluded.
- [x] Focused normal and fallback-off external Chrome checks pass 1/1 each,
  covering Scala/LESS/Bootstrap/import/messages provenance, owner/declaration,
  utility/plugin-attribute absence, computed float, input attrs/copy/order/query,
  and desktop/mobile containment/no-overflow.

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
- [x] Batch 984: populated `/$user` public-profile breadcrumb has three direct owners for the frozen outer responsive box model, inner auto margin, and heading padding/line-height; `site-breadcrumb-outer` remains for shared ancestry/bridge consumers and only `site-breadcrumb-inner` retires.
- [x] Batch 984: focused external System-Chrome fallback-off coverage passes 4/4 across source, 1366×900, 390×844, and missing-profile absence, including nesting, copy, computed declarations, geometry, containment, no-overflow, and screenshots.
- [x] Batch 984: the legacy administrator-notice/sidebar collapse-button x-axis mismatch is intentionally excluded rather than corrected in Yoram; live legacy screenshot comparison, global fallback consumer audit, and the full final fallback-off suite remain final visual-lock work.
- [x] Batch 985: populated `/$user` page wrappers have direct outer/inner owners for exact frozen minimum-height, margin, responsive width/padding/box sizing/minimum width, white surface, and auto margin while retaining both shared legacy classes.
- [x] Batch 985: focused external System-Chrome fallback-off coverage passes 4/4 across source, desktop, mobile, and missing-profile absence, with exact computed declarations, nesting/order, containment, no-overflow, and inspected screenshots.
- [x] Batch 985: the non-frozen desktop `min-width:1100px` app bridge remains explicitly outside StyleX ownership; live legacy pair, global fallback consumer audit, and full fallback-off suite remain final visual-lock work.
- [x] Batch 986: the two populated public-profile status wrappers retire `user-status`, and the member-since/provider wrappers retire `user-since`; existing StyleX owners preserve exact wrapper declarations and direct child owners preserve all emitted nested output.
- [x] Batch 986: focused external System-Chrome fallback-off coverage passes 4/4 for source, all four badge branch combinations, desktop/mobile geometry, copy/order/containment/no-overflow/screenshots, and missing-profile absence.
- [x] Batch 986: the affected broad provider regression passes; seven unrelated pre-existing whole-profile failures remain in retired active-class/Feedback/source/canonicalizer expectations. Live legacy pair and final global/full fallback-off audits remain deferred to visual lock.
- [x] Batch 987: populated `/$user` identity retires `whoami`, `usf-group`, `name`, `loginid`, `email`, and `edit`; exact frozen `margin-right:2px` moves to the existing name owner while all other emitted declarations remain with existing direct owners.
- [x] Batch 987: fallback-off System-Chrome focused coverage passes 3/3 across four email/edit combinations, desktop/mobile paint/geometry/whitespace/order/screenshots, and missing-profile absence; affected identity-paint/edit/static coverage passes 3/3.
- [x] Batch 987: `whoami-wrap`, button/icon classes, profile behavior, and unrelated tests remain unchanged. Existing broad open-issue/projects-pane canonicalizer failures and final live/global/full fallback-off audits remain outside this wave.
- [x] Batch 988: populated guest `/$user` badge retires only `guest-user` and `left-mark`; existing direct StyleX owners already reproduce the complete matching frozen declarations, so DOM, conditional rendering, copy, order, and geometry remain unchanged without new values.
- [x] Batch 988: focused fallback-off System-Chrome coverage passes 1/1 with exact desktop/mobile computed paint and geometry, containment, no-overflow, and directly inspected screenshots under `frontend/output/playwright/stylex-user-profile-guest-badge/`.
- [x] Batch 988: the inherited legacy administrator-notice/sidebar collapse-button x-axis mismatch remains intentionally excluded. Live legacy screenshot pairing, global fallback consumer audit, and the full fallback-off suite remain final visual-lock work.
- [x] Batch 989: populated `/$user` sidebar retires only `user-info-box` and `whoami-wrap`; the existing info owner is complete and the avatar owner adds exact frozen `background-size:cover`, with `user-box`, element nesting, dynamic image, guest output, and behavior preserved.
- [x] Batch 989: focused fallback-off System-Chrome coverage passes 1/1 at 1366×900 and 390×844 with exact computed declarations, geometry/order/containment/no-overlap/no-overflow, branch/missing-state coverage, and inspected screenshots under `frontend/output/playwright/stylex-user-profile-sidebar-structure-classes/`; 11 affected checks and the guest-badge regression pass.
- [x] Batch 989: seven pre-existing whole-profile canonicalizer failures remain outside this target. The legacy administrator/sidebar mismatch, live legacy pair, global consumer audit, and full fallback-off suite remain final visual-lock work.
- [x] Batch 990: populated `/$user` retires only the leaf runtime classes `since`, `auth-provider-logo`, and profile GitHub `github`; existing direct StyleX owners preserve the complete matching frozen declarations without adding or changing values, while root and standalone-login provider consumers retain their classes.
- [x] Batch 990: focused/adjacent external System-Chrome coverage passes 8/8 and the changed connected-provider regression passes 1/1 at desktop/mobile scope; exact paint, provider/SVG order, containment, no-overflow, branch absence, and screenshots under `frontend/output/playwright/stylex-user-profile-sidebar-leaf-classes/` were verified. TypeScript check, production build, and frozen fallback hash verification pass.
- [x] Batch 990: the administrator notice/sidebar collapse-button x-axis mismatch is inherited from legacy and intentionally receives no Yoram-only alignment fix while higher-priority parity remains. Approved Yoram footer differences are intentional; live legacy pair, global fallback-consumer audit, and full fallback-off suite remain final visual-lock work.
- [x] Batch 991: populated `/$user` sidebar status spans retire only `badge label-success` and `badge label-important`; the existing shared and variant StyleX owners preserve the complete final Bootstrap plus `_page.less` cascade without adding or changing declarations.
- [x] Batch 991: focused fallback-off external System-Chrome passes 1/1 and separately completed adjacent runs pass 1/1 plus 4/4 across all four status combinations, desktop/mobile exact paint/geometry/order/containment/no-overflow, missing-profile absence, and inspected screenshots under `frontend/output/playwright/stylex-user-profile-status-badge-classes/`.
- [x] Batch 991: unrelated badge consumers remain unchanged. The inherited administrator-notice/sidebar-button x-axis mismatch and approved Yoram footer differences remain intentional exclusions; live legacy pair, global fallback-consumer audit, and full fallback-off suite remain final visual-lock work.
- [x] Batch 992: populated owner `/$user` retires only the edit Link's `ybtn ybtn-default ybtn-mini` runtime classes; existing direct button/icon owners preserve the complete matching frozen cascade without declaration or value changes.
- [x] Batch 992: owner-only rendering, `/user/editform`, `reloadDocument`, Korean copy, exact child whitespace/order, parent boundary, `<i>`, and `yobicon-edit` remain; non-owner/missing branches and unrelated `ybtn` consumers remain unchanged.
- [x] Batch 992: focused and adjacent external System-Chrome assertions pass 6/6 across isolated invocations and desktop/mobile screenshots under `frontend/output/playwright/stylex-user-profile-edit-control-classes/` were inspected. The harness hung after successful assertions and exact-spec processes were terminated; independent TypeScript, production build, and frozen fallback hash checks pass.
- [x] Batch 992: the inherited administrator-notice/sidebar-button x-axis mismatch and approved Yoram footer differences remain intentional exclusions; live legacy pair, global fallback-consumer audit, and full fallback-off suite remain final visual-lock work.
- [x] Batch 993: populated `/$user` top-tab and nested issue-tab count spans retire only their literal `num-badge` class at the three React render sites; Batch 979's shared direct owner preserves the complete generic frozen cascade without declaration or value changes.
- [x] Batch 993: positive-only top badges, always-rendered nested zero counts, span elements, copy/whitespace/order, tab interactions, two-column/subtask controls, and project Watch `num-badge` remain unchanged; all unrelated consumers remain fallback-owned.
- [x] Batch 993: focused external System-Chrome fallback-off coverage passes 1/1 at desktop/mobile scope with exact declarations, containment/non-overlap/no-overflow and inspected screenshots under `frontend/output/playwright/stylex-user-profile-tab-count-badges/`; TypeScript, production build, verifier, and frozen hash pass.
- [x] Batch 993: the broad public-profile source guard retains an unrelated pre-existing stale `<li {...legacyIssueRowAttrs}>` assertion and is not claimed green. The inherited administrator/sidebar mismatch and approved Yoram footer differences remain intentional exclusions; live legacy/global/full fallback-off work remains final-lock scope.
- [x] Batch 994: populated `/$user` nested issue-tab list retires only literal `nm` while retaining `nav nav-tabs`; the existing `issueTabs` owner preserves exact frozen `margin:0 !important` without declaration or value changes.
- [x] Batch 994: list/item/button/span structure, copy/count/order, open/closed pane interaction, show-subtasks neighbor, sidebar `nav nav-tabs nm`, and all unrelated `nm` consumers remain unchanged; the retained app.css React button bridge does not require `nm`.
- [x] Batch 994: focused and empty-state external System-Chrome fallback-off checks pass 1/1 each at desktop/mobile scope with inspected screenshots under `frontend/output/playwright/stylex-user-profile-issue-tabs/`; TypeScript, production build/verifier, frozen source hashes, and fallback hash pass.
- [x] Batch 994: the narrowed broad public-profile run hung and is not claimed green. Active-tab paint is not frozen by this margin-only wave; the inherited administrator/sidebar mismatch and approved Yoram footer differences remain intentional exclusions, while live legacy/global/full fallback-off work remains final-lock scope.
- [x] Batch 995: populated `/$user` Projects pane retires only the Watch/Unwatch count span's literal `num-badge`; the unchanged `projectWatchBadge` owner preserves the complete matching generic frozen cascade without declaration or value changes.
- [x] Batch 995: span/count, icon-copy-count order, Watch/Unwatch href and branch behavior, `ybtn watchBtn`, project list/rows, leave control, and every unrelated `num-badge` consumer remain unchanged; scoped blue-button and stacked-list branches do not match.
- [x] Batch 995: focused external System-Chrome fallback-off coverage passes 1/1 at desktop/mobile scope with exact declarations, containment/row separation/no-overflow, and inspected screenshots under `frontend/output/playwright/stylex-user-profile-project-watch-badge-class/`; TypeScript, production build/verifier, frozen source hashes, and fallback hash pass.
- [x] Batch 995: live legacy `:9000` and `:8089` were unavailable, so direct legacy pairing remains unverified final-lock work alongside the global consumer audit and full fallback-off suite. The inherited administrator/sidebar mismatch and approved Yoram footer differences remain intentional exclusions.
- [x] Batch 996: populated `/$user` Projects pane Watch/Unwatch Link retires only literal `ybtn watchBtn`; the unchanged `projectWatchButton` owner preserves the complete matching frozen base/first-child/icon/interactive cascade without declaration or value changes.
- [x] Batch 996: TanStack Link `to`/`reloadDocument`, Watch/Unwatch paths/copy/branches, icon/count/order, project list/rows, leave control, and all other `ybtn`/`watchBtn` consumers remain unchanged; the legacy jQuery behavior hook is not emitted.
- [x] Batch 996: focused and public-profile owner external System-Chrome fallback-off checks pass 1/1 each; desktop/mobile screenshots under `frontend/output/playwright/stylex-user-profile-project-watch-control-classes/` are byte-identical to Batch 995. TypeScript, production build/verifier, frozen source hashes, and fallback hash pass.
- [x] Batch 996: the affected project-row regression remains red on its unrelated stale avatar `.pull-left` assertion before the Watch assertion. Live legacy/global/full fallback-off final lock remains open; administrator/sidebar and approved Yoram footer differences remain intentional exclusions.
- [x] Batch 997: populated `/$user` Projects pane retires only the direct project-stats wrapper's literal `stats-wrap`; unchanged `projectStats` owns the complete matching frozen margin/alignment and previously migrated float without declaration or value changes.
- [x] Batch 997: the wrapper `div`, direct `.stats` child, Watch/Unwatch and Leave controls/order/navigation/confirmation remain unchanged; unmatched `.like`/`.members` branches are absent, while organization, project-directory, fork-list, and all unrelated `stats-wrap` consumers remain intact.
- [x] Batch 997: focused external System-Chrome fallback-off coverage passes 1/1 at desktop/mobile scope and Watch/Leave adjacent coverage passes 2/2; TypeScript, production build/verifier, and fallback hash pass. Local and authenticated live legacy desktop/mobile captures were directly inspected.
- [x] Batch 997: live and local fixtures differ, so same-fixture full-screen pixel equality is not claimed. The project-row spec retains its unrelated stale avatar `.pull-left` failure; global/full fallback-off final lock remains open, with administrator/sidebar and approved Yoram footer differences intentional.
- [x] Batch 998: populated `/$user` Projects pane retires only the declaration-free structural wrapper's literal `info-wrap` and adds a stable owner marker; no StyleX declaration or numeric value changes.
- [x] Batch 998: already-owned header/description/name-tag/lock descendants remain pixel-owned, non-emitted owner-avatar/forked/header-owner-name branches remain absent, and unrelated organization/project/fork-list `info-wrap` consumers stay intact.
- [x] Batch 998: focused external System-Chrome fallback-off coverage passes 1/1 at desktop/mobile scope; project-row and child-paint regressions pass 1/1 each, and TypeScript, production build/verifier, frozen hashes, and fallback hash pass.
- [x] Batch 998: local and live legacy Projects captures were directly inspected, but differing fixtures preclude a same-fixture full-screen pixel-equality claim. Broad stale issue-row canonical output plus global/full fallback-off final lock remain open; administrator/sidebar and approved Yoram footer differences remain intentional.
- [x] Batch 999: populated `/$user` Projects pane retires only literal `header`, `desc`, and `name-tag` from three complete direct StyleX owners; no declaration or numeric value changes.
- [x] Batch 999: `div` element types, header/description/metadata order, private/fork/origin branches, owner/date/update copy, links, stats/Watch/Leave behavior, and unrelated route class consumers remain intact.
- [x] Batch 999: focused external System-Chrome fallback-off coverage passes 1/1 at desktop/mobile scope; avatar/fork, child-paint, and info-wrapper adjacent coverage passes 3/3, and TypeScript, production build/verifier, frozen hashes, and fallback hash pass.
- [x] Batch 999: local and live legacy captures were inspected with differing fixtures. Links source-count and broad public-profile canonicalizer baseline failures remain open alongside global/full fallback-off final lock; administrator/sidebar and approved Yoram footer differences remain intentional.
- [x] Batch 1000: populated `/$user` Projects pane retires only literal `project-name` and `owner-name-small` from two complete direct StyleX Link owners; no declaration or numeric value changes.
- [x] Batch 1000: Link elements/hrefs, copy/whitespace/order, private/fork/origin branches, dates/update copy, Watch/Leave controls, retained glyph/geometry classes, and unrelated route consumers remain intact.
- [x] Batch 1000: focused external System-Chrome fallback-off coverage passes 1/1 at desktop/mobile scope; avatar/fork, child-paint, info-wrapper, and prior leaf-class adjacent coverage passes 4/4, and TypeScript, production build/verifier, frozen hashes, and fallback hash pass.
- [x] Batch 1000: default-state local screenshots were inspected after blur restoration. Differing live/local fixtures preclude same-fixture pixel equality; the unrelated links source-count and broad profile canonicalizer failures plus global/full fallback-off final lock remain open, with administrator/sidebar and approved Yoram footer differences intentional.
- [x] Batch 1001: populated `/$user` Projects pane retires only literal `avatar-wrap small`, `yobicon-small`, and `vmiddle`; direct StyleX owners preserve the 24px avatar cascade and exactly own the Yobicon base, lock/split pseudo glyphs, lock size/color, and fork alignment.
- [x] Batch 1001: semantic glyph classes, project/stats structure, links, copy/order, private/fork/origin branches, and Watch/Leave behavior remain intact.
- [x] Batch 1001: focused external System-Chrome fallback-off coverage passes 1/1 without legacy CSS injection and with zero fallback links; directly affected adjacent coverage passes 4/4, and TypeScript, production build/verifier, frozen hashes, and fallback hash pass.
- [x] Batch 1001: corrected desktop/mobile screenshots were inspected. Differing live/local fixtures preclude same-fixture pixel equality; global fallback-consumer audit and full fallback-off final lock remain open, with administrator/sidebar alignment and approved Yoram footer differences intentional.
- [x] Batch 1002: populated `/$user` Projects pane retires only row literal `project` and declaration-free inner literal `stats`; unchanged direct owners preserve the complete active row/first-row/stats-wrapper cascade.
- [x] Batch 1002: every remaining `.all-projects .project …` descendant selector requires already-retired or absent ancestry; elements, order, copy, branches, navigation, icon classes, Watch/Leave behavior, and StyleX declarations remain intact.
- [x] Batch 1002: focused external System-Chrome fallback-off coverage passes 1/1 without CSS injection and with zero fallback links; all directly affected Projects specs pass 13/13, and TypeScript, production build/verifier, frozen hashes, and fallback hash pass.
- [x] Batch 1002: desktop/mobile screenshots were directly inspected. Differing live/local fixtures preclude same-fixture pixel equality; global fallback-consumer audit and full fallback-off final lock remain open, with administrator/sidebar alignment and approved Yoram footer differences intentional.
- [x] Batch 1003: populated `/$user` Projects pane gives member, Watch, and Leave trash icons exact direct Yobicon owners; friends/trash glyphs render in fallback-off while the unmapped legacy eye-open/eye-close icon correctly remains empty.
- [x] Batch 1003: only the three residual Yobicon dependency sets retire; fork split classes, Leave Link classes, DOM/order/copy/branches/navigation, and Watch/Leave interaction remain intact.
- [x] Batch 1003: focused external System-Chrome fallback-off coverage passes 1/1 without CSS injection and with zero fallback links; the directly affected Projects matrix passes 15/15, and TypeScript, production build/verifier, frozen hashes, and fallback hash pass.
- [x] Batch 1003: desktop/mobile screenshots were directly inspected. Differing live/local fixtures preclude same-fixture pixel equality; global fallback-consumer audit and full fallback-off final lock remain open, with administrator/sidebar alignment and approved Yoram footer differences intentional.
- [x] Batch 1004: populated `/$user` Projects pane retires final list, private/fork icon, and Leave Link presentation-class sets from four complete unchanged direct owners.
- [x] Batch 1004: list/row geometry, elements/order/copy/branches, icon output, Watch/Leave confirmation and navigation, data/hrefs, and unrelated route classes remain intact; no StyleX declaration changes.
- [x] Batch 1004: focused external System-Chrome fallback-off coverage passes 1/1 without CSS injection and with zero fallback links; the complete Projects matrix passes 16/16, and TypeScript, production build/verifier, frozen hashes, and fallback hash pass.
- [x] Batch 1004: corrected default-state desktop/mobile screenshots were directly inspected after explicit Leave blur. This closes only the Projects pane; global fallback-consumer audit and full fallback-off final lock remain open, with differing fixtures and intentional administrator/sidebar plus Yoram footer exclusions recorded.
- [x] Batch 1008: populated `/$user` Issues due-date wrapper and clock directly own the right float, conditional `#C93426` overdue paint, and generic Yobicon clock2 `\e356`; focused fallback-off desktop/390 coverage preserves overdue/upcoming/closed/no-date branches, title/copy/order, containment/no-overflow, while live legacy same-fixture visual lock remains open.
- [x] Batch 1009: populated `/$user` parent/child issue labels share exact final presentation plus dynamic API-color ownership; fallback-off desktop/390 coverage passes base/hover/focus, IDs/query, show-subtasks, containment/no-overflow, with child `twoColumeModeTarget` retained and live legacy same-fixture visual lock open.
- [x] Batch 1010: root login-dialog separator retires fully-owned `gray-txt ml10 mr10`; normal/fallback-off external System-Chrome focused runs pass 1/1 each, with live same-fixture pixel lock deferred and inherited administrator/sidebar plus approved Yoram footer differences intentional.
- [x] Batch 1011: populated `/$user` Issues milestone metadata retires fully-owned `mileston-tag`; normal/fallback-off external System-Chrome focused runs pass 1/1 each with source/runtime absence and desktop/mobile geometry checks; live same-fixture pixel lock remains open.
- [x] Batch 1012: populated `/$user` Pull Requests receiver/state wrapper retires React-owned `span2` with exact frozen Bootstrap desktop/mobile StyleX geometry; normal/fallback-off external System-Chrome focused runs pass 1/1 each with no overflow.
- [x] Batch 1013: populated `/$user?selected=pullRequests` retires React-owned `post-item` while preserving row DOM/order/branches/Links/hash/receiver-state behavior; normal/fallback-off external System-Chrome focused runs pass 1/1 each with exact row declarations and no overflow.
- [x] Batch 1014: populated `/$user?selected=issues` retires React-owned `post-item`; normal/fallback-off external System-Chrome focused runs pass 1/1 each at desktop/mobile with exact border/display/overflow/clear/padding, preserved `title`/href/id/children, row containment, no document overflow, plugin-attribute absence, and inspected screenshots. Live legacy same-fixture pixel pairing, global fallback-consumer audit, and full fallback-off final lock remain open.
- [x] Batch 1015: populated `/$user?selected=issues` retires React-owned `span12 span-hard-wrap span2 span5 span1 span3`; normal/fallback-off external System-Chrome focused runs pass 5/5 each at 1366/800/767/720/390px with exact Bootstrap grid geometry, responsive stacking/hard-wrap/author visibility, preserved owner order/copy/links, no overflow, plugin-attribute absence, and screenshots. Live legacy same-fixture pixel pairing, global fallback-consumer audit, and full fallback-off final lock remain open.
- [x] Batch 1016: populated `/$user?selected=pullRequests` retires React-owned content-column `span10`; normal/fallback-off external System-Chrome focused runs pass 1/1 each at 1366/767/390px with exact Bootstrap column geometry, responsive full-width behavior, preserved row/content/receiver order and branches, containment, no overflow, and plugin-attribute absence. Live legacy same-fixture pixel pairing, global fallback-consumer audit, and full fallback-off final lock remain open.
- [x] Final-lock technical evidence after Batch 1016: Scala goal automation passes; complete fallback-off consumer graph passes 81/81 with one intentional skip; managed legacy `:9000` is prepared/running/login-probed; authenticated legacy/local Pull Requests empty-state screenshots were inspected at desktop and 390px; fallback-off local `:3105` requests no `legacy-fallback.css`.
- [ ] Final-lock populated-row evidence: both current live APIs return `pullRequestItems: []`, so Batch 1016’s populated `span10` branch still has no same-fixture legacy screenshot pair. Keep the goal open and do not claim populated-row pixel parity from the empty-state pair.
- [x] Final-lock exclusions: inherited administrator-notice/sidebar collapse-button x-axis mismatch is intentionally not corrected; user-approved NAVER/provider/developer-contact/upstream-repository footer differences remain intentional. The stale visual-sweep `.user-profile-page` presence assertion is documented as a harness gap against current owner-based React DOM.
- [x] Batch 1017: populated `/$user?selected=pullRequests` project/receiver avatar wrappers and images own the frozen 40px/32px avatar cascade; only the two targeted React presentation-class sets retire, with shared fallback consumers preserved.
- [x] Batch 1017: focused avatar ownership passes 1/1 normal and fallback-off; adjacent row/receiver-spacing checks pass 2/2 in both modes. Check, production build/StyleX verifier, frozen hashes, and diff check pass. Populated same-fixture legacy screenshot pairing remains final-lock work.
- [x] Batch 1018: populated `/$user?selected=pullRequests` retires only the direct PR title/post-id/infos presentation literals; existing StyleX owners preserve frozen desktop/mobile/hover output, `yobicon-comments` remains for the glyph, and issue-row/shared fallback consumers are untouched.
- [x] Batch 1018: title/infos focused normal and fallback-off checks pass 1/1 each, the updated row check passes 1/1 each, and the six adjacent PR specs pass 6/6 in each mode. Same-fixture populated legacy screenshot parity remains final-lock work.
- [x] Batch 1019: populated `/$user?selected=pullRequests` retires only the direct PR `state`/finite variant and empty receiver `empty-avatar-wrap` presentation classes; existing StyleX owners preserve frozen badge/placeholder geometry and state colors, while other-route fallback consumers remain.
- [x] Batch 1019: state-class ownership focused normal/fallback-off checks pass 1/1 each; the updated six-spec PR matrix passes 6/6 in each mode with five state branches, empty receiver, source/runtime class absence, computed declarations, desktop/mobile no-overflow, and plugin-attribute checks. Same-fixture populated legacy screenshot parity and broader final lock remain open.
- [x] Project-home trailing-slash: slash and slashless project-home paths share one active home state without redirect; focused external System-Chrome E2E passes 1/1.
- [x] Project-home visual evidence: `/admin/sample/` shell geometry matches legacy except 1px project-wrap height; `/sample/sample/` error-shell geometry matches. The legacy 403 forbidden copy versus local 404 not-found copy remains an explicit parity gap.
- [x] Harness responsiveness: remove the page-global `Loading...` absence condition that forced a 5-second timeout for persistent sidebar placeholders. Preserve route-specific settled selectors, session, font/image, animation, paint, metric, and screenshot gates. Focused warm local timings are 563ms/327ms versus legacy 122ms/90ms.
- [x] Fresh production build and StyleX verifier pass in 21.38s with frozen fallback hash `8b437655422bcfe1e612e7320362c3b52e6f65ec43c064dd344e8e7e5de18be6`; standalone Vite preview is not accepted as nested-route production evidence because runtime asset rewriting belongs to the Rust server.
### 2026-07-27 Batch 1023 public-profile Pull Request list/glyph ownership

- [x] `user/view.scala.html`, `user/partial_pullRequests.scala.html`, frozen `_page.less`, max-720 `_responsive.less`, Bootstrap/responsive CSS, Yobicon `style.css`, and messages establish the populated list root and comment glyph output.
- [x] Direct StyleX owns the exact list style/width/clearfix/mobile margin and generic Yobicon/`\e4b7` declarations; only `post-list-wrap`, `row-fluid`, and `yobicon-comments` retire in this pane.
- [x] Focused external System-Chrome normal and fallback-off runs pass 1/1 each at 1366×900 and 390×844 with computed declarations, pseudo glyph, hash navigation, containment, zero overflow, and four inspected screenshots.
- [ ] Current live legacy data has no populated Pull Request row. Keep same-fixture legacy screenshot pairing, global fallback audit, and the overall final lock open.

### 2026-07-27 Batch 1024 public-profile Issues title-rail ownership

- [x] `user/view.scala.html`, `user/partial_issues.scala.html`, the full frozen LESS import chain, Bootstrap/responsive CSS, and messages establish the populated project/post-id/title rail.
- [x] Direct route-local StyleX owns the exact project wrapper/link, post-id, title wrapper/cell/link declarations; only `infos-item project-name`, `title project`, `infos-item post-id`, `title-wrap`, `title-cell`, and the issue-link `title` retire.
- [x] External System-Chrome normal and fallback-off focused runs pass 1/1 each at 1366×900 and 390×844 with exact computed declarations, DOM/copy/order/navigation, plugin-attribute absence, zero overflow, and four inspected screenshots.
- [ ] Keep labels/subtasks/author/meta and unrelated fallback consumers outside this batch. Live same-fixture legacy pairing, global fallback audit, full fallback-off suite, and overall final lock remain open.

### 2026-07-27 Batch 1025 public-profile Issues author/meta ownership

- [x] `user/view.scala.html`, `user/partial_issues.scala.html`, frozen LESS/Bootstrap responsive cascade, and messages establish populated/empty desktop author cells and the metadata shell.
- [x] Direct StyleX owns the exact fixed-height table/table-cell author output and generic infos/meta/date declarations; only the scoped desktop author/meta literals retire.
- [x] Mobile assignee `infos-item infos-link-item author-cell` remains intentionally because those descendants still match inside `.infos`.
- [x] External System-Chrome normal and fallback-off focused runs pass 1/1 each at desktop/390px with populated/empty branches, exact output, scoped class retention, zero overflow, and four inspected screenshots.
- [ ] Live same-fixture legacy pairing, global fallback audit, full fallback-off suite, and overall final lock remain open.

### 2026-07-27 Batch 1026 public-profile Issues list-root ownership

- [x] `user/view.scala.html`, `user/partial_issues.scala.html`, frozen `_page.less`, max-720 `_responsive.less`, Bootstrap/responsive `.row-fluid`, the complete `yobi.less` chain, and messages establish both open/closed list roots.
- [x] One exact route-local StyleX declaration owns list reset, width/clearfix, and mobile margin; only scoped `post-list-wrap row-fluid` retires while `my-issues` remains for active descendant fallback.
- [x] External System-Chrome normal and fallback-off focused runs pass 2/2 each at 1366×900 and 390×844 with both owners, exact computed/pseudo output, retained ancestry, pane/order/branch behavior, containment, zero overflow, and four inspected screenshots.
- [ ] Live legacy `:9000`/`:8089` were unavailable. Keep same-fixture pairing, global fallback audit, full fallback-off suite, and overall final lock open.

### 2026-07-27 Batch 1027 public-profile Issues subtask-summary ownership

- [x] `user/view.scala.html`, `user/partial_issues.scala.html`, `issue/partial_list_subtask.scala.html`, frozen uploader/subtask/anchor/summary rules, the complete `yobi.less` chain, and messages establish four summary branches.
- [x] Five direct owners replace only wrapper, progress shell/bar variants, ratio/complete color, and parent span/Link presentation classes; dynamic width, copy/order, truncation, and navigation remain unchanged.
- [x] External System-Chrome normal and fallback-off focused runs pass 1/1 each at 1366×900 and 390×844 with exact base/variant/hover/focus output, nonmatching-selector proof, containment, zero overflow, and inspected screenshots.
- [ ] Keep live same-fixture pairing, global fallback audit, full fallback-off suite, and overall final lock open.

### 2026-07-27 Batch 1028 final-lock timing and sweep harness diagnosis

- [x] `scripts/visual-parity-sweep.mjs` compares the legacy `.post-list-wrap`/`.post-item.title` metrics with the exact populated profile StyleX owners, so intentional class retirement is not reported as a false selector gap; geometry and screenshot gates remain unchanged.
- [x] External System-Chrome production-dist timing shows legacy `/admin?selected=issues` settles in `106ms` and local in `216ms` for the populated isolated fixture; no selector, paint, font, image, or animation timeout occurs. The remaining `gnbSearchForm` drift is the documented consequence of the approved Yoram footer/contact/repository identity change.
- [x] The unpopulated default isolated DB was traced to the fixed `2026-07-07` issue timestamp falling outside the current `daysAgo=14` cutoff. After changing only the temporary diagnostic DB timestamp, the populated list and row are `1126x37` in both targets and the paired diff retains only the approved GNB drift.
- [x] Focused HMR E2E startup timing is recorded separately: the managed runner spends about `6.05s` compiling the Rust backend and `1.80s` starting Vite; the five browser checks complete in `18.0s` and the full process in `26.8s`. This is runner/bootstrap cost, not a legacy-level page-reactivity or screenshot-settle wait.
- [ ] Keep the overall final lock open for the remaining global fallback-consumer and full final-profile evidence; do not add route-local geometry compensation for the approved GNB/footer difference.
- [x] Batch 1029 stabilization diagnosis: external System Chrome reports `/admin` paint at `110ms` legacy versus `385ms` local dev, with only `12ms`/`14ms` font-image-animation settle and zero timeouts. The managed HMR runner cost is separate (`6.05s` Rust compile, `1.80s` Vite readiness, `18.0s` five checks, `26.8s` total); pixel/screenshot gates remain unchanged.
- [x] Batch 1030 closes the left framed-sidebar motion gap: the persistent StyleX shell uses `opening/open/closing/closed`, preserves desktop/mobile final geometry, blocks closing interaction with `inert`, removes layout after transition end, and restores open-pin focus. New motion E2E passes `1/1` normal and `1/1` fallback-off; existing geometry/close-pin/account-action regressions pass `9/9` normal. The existing fallback-off matrix still exposes unrelated unmigrated descendant fallback CSS and remains a separate final-lock gap.

### 2026-07-27 Batch 1034 user-settings profile field-row mt10 ownership

- [x] `user/edit.scala.html`, `partial_edit_tabmenu.scala.html`, the complete frozen `yobi.less` import chain, `_common.less` `.mt10`, Bootstrap `dl`/form rules, messages, and setting JS establish the profile-field DOM, spacing, copy, and behavior evidence.
- [x] `/user/editform` login-id, name, and email `<dd>` rows retire only their directly-owned `mt10` classes; existing `profileFieldRow` StyleX owns exact `margin-top: 10px`. The avatar upload `btn-wrap mt10` and global fallback remain intentionally retained.
- [x] Focused external System-Chrome normal and fallback-off runs pass 3/3 each at 1366x900 and 390x844 with source/runtime class absence, exact computed margins, DOM/order/copy, input containment, no overflow, and retained fallback evidence. Existing legacy/local user-settings desktop/mobile screenshots and new local captures were visually inspected; fixture/avatar and approved Yoram navbar/footer identity differences remain documented.
- [ ] Production build/verifier, global fallback-consumer audit, and overall final lock remain open.

### 2026-07-27 Batch 1035 user-settings avatar-upload mt10 class retirement

- [x] `user/edit.scala.html:43-59`, the full frozen `yobi.less` import chain,
  `_common.less` `.mt10`/`.center-txt`, `_page.less` avatar evidence,
  `_yobiUI.less` `.fake-file-wrap`/`.file`, messages, and avatar setting JS
  establish the avatar DOM, copy/order, spacing, and upload/crop behavior.
- [x] `/user/editform` removes only the React-owned avatar wrapper's direct
  `mt10` class; existing `userSettingsAvatarStyles.uploadWrapMargin` owns
  exact `marginTop: "10px"` and `uploadWrap` owns centering. The global
  `app.css` `.mt10` fallback remains for other consumers.
- [x] `frontend/tests/stylex-user-editform-avatar-upload-mt10.e2e.ts` records
  RED→GREEN source/runtime ownership, exact desktop/mobile computed output,
  no direct class/no inline style, DOM/order/copy/input contract, containment,
  crop interaction, and screenshots. External System-Chrome normal and
  explicit fallback-off runs pass 2/2 each.
- [x] Adjacent profile-field/profile-row guards were updated to assert the
  retired avatar token and retained StyleX declaration ownership.
- [x] Stabilization diagnosis is separate from this parity wave: legacy and
  local first-byte probes are ~18/25ms; the long wait came from stale
  unavailable-port Playwright groups, duplicate HMR groups, and an unbounded
  outer Playwright-child wait. The exact stale groups were terminated without
  changing parity gates.
- [x] Production build/verifier and frozen legacy-fallback hash verification
  pass; global fallback-consumer audit, same-fixture screenshot pairing, and
  the overall final pixel lock remain open.

### 2026-07-27 Batch 1036 full live sweep teardown and responsiveness evidence

- [x] Outside-sandbox System Chrome (`PW_CHANNEL=chrome`) reran the full
  legacy/local corpus against legacy `:9000` and rebuilt release/dist Rust:
  desktop completed `273` legacy and `397` local states; mobile completed the
  same corpus. Desktop is legacy `248/273`, local `362/397`; mobile is legacy
  `248/273`, local `361/397`. Compared states remain `273`, with `210`
  visual/geometry diff failures and local failures `35` desktop / `36` mobile.
- [x] Directly inspected fresh legacy/local captures for `/user/editform`,
  `/admin/sample`, and `/admin/sample/post/1`. The approved Yoram footer
  identity change and same-fixture content differences remain explicit; no
  geometry compensation or screenshot assertion relaxation was introduced.
- [x] `scripts/visual-parity-sweep.mjs` now bounds `browser.close()` at five
  seconds and labels a timeout. The mobile run reproduced
  `legacy browser close timed out after 5000ms` after the legacy route loop,
  then continued through all local states. This isolates the long tail to
  Playwright/Chrome teardown IPC, separate from page rendering.
- [x] `scripts/run-playwright-e2e.mjs` now tracks the Playwright child process
  group during SIGINT/SIGTERM cleanup together with the managed backend and
  frontend groups, preventing an interrupted validation from leaving stale
  browser workers behind. Normal child wait and all parity gates remain
  unchanged.
- [x] Representative routes normally reach DOM `80–100ms`, body `150–300ms`,
  and paint `180–500ms`; existing route/data-dependent selector/paint waits
  near ten seconds remain strict and are tracked as separate route gaps.
- [x] Sidebar focused shell tests now await the existing `0.5s` open/close
  width transition before strict geometry assertions. External System Chrome
  normal shell motion coverage passes `4/4`; final open geometry is `362px`
  desktop and `392px` mobile. The route transition-end filter now also accepts
  its declared `border-right-width` property. Fallback-off shell motion
  coverage passes; the pre-existing global-pin static fallback gap was
  carried into Batch 1037 for a separate Yobicon primitive/glyph owner.
- [ ] Global fallback-consumer audit, full fallback-off suite, same-fixture
  screenshot pairing, and overall final pixel lock remain open. The broad
  fallback-off suite remains red on pre-existing route/fixture baseline
  failures; it is not claimed as passed from this batch.

### 2026-07-28 runner teardown measurement

- [x] Required Scala HTML automation passed before the diagnostic. External
  System-Chrome fallback-off sidebar motion with one worker measured `20.5s`
  for the test assertion, `46.0s` through Playwright's final report, and
  `57.51s` for the outer runner. This separates route interaction from the
  post-test Chrome/Playwright teardown tail; no parity wait or assertion was
  relaxed.
- [x] Long-lived Playwright CLI daemon/Chrome profile groups were observed
  outside the application process tree. The sweep now defaults to `chrome`
  and reports target/path when a bounded page close reaches five seconds,
  matching its existing bounded browser-close diagnostic.
- [ ] Full fallback-off, global fallback-consumer, same-fixture screenshot,
  and final pixel-lock work remains open.

### 2026-07-28 Batch 1037 global sidebar open-pin Yobicon primitive and glyph ownership

- [x] Legacy `common/navbar.scala.html`, frozen Yobicon `style.css`, and
  `_page.less` establish the pin's two arrow elements, generic icon primitive,
  `\e031`/`\e030` glyphs, padding, and `25x26`/`23x26` visible geometry.
- [x] `globalSidebarOpenPinStyles` now owns the generic primitive and separate
  left/right `::before` glyphs; both JSX icons compose those owners while the
  existing root geometry and React open/close behavior remain unchanged.
- [x] Focused external System-Chrome normal and explicit fallback-off runs
  pass `6/6` each (`15.0s`/`16.3s` assertion time) at desktop/mobile metrics;
  focused desktop/mobile captures were visually inspected.
- [ ] Global fallback-consumer audit, full fallback-off suite, same-fixture
  screenshot pairing, and overall final pixel lock remain open.

### 2026-07-28 — Batch 1038 left-sidebar nested-project hover

- [x] Suppress only the framed left-sidebar nested favorite-project overview
  popover that creates horizontal overflow; retain authenticated sidenav
  tooltip behavior and legacy row geometry/interaction.
- [x] Focused external System-Chrome normal: 3/3 in 13.0s; combined
  fallback-off: 84/84 with one intentional skip in 47.6s; desktop/mobile
  screenshots captured.
- [ ] This remains an explicit framed-shell deviation from the legacy nested
  popover. Same-fixture legacy pairing, global fallback audit, full final
  fallback-off lock, and overall pixel lock remain open.

### 2026-07-28 — Batch 1039 approved navbar-contact comparator boundary

- [x] Visual sweep proves the legacy configured contact link versus local
  intentional absence from the actual navbar sibling structure.
- [x] Ignore only the resulting search-form horizontal shift and mobile
  user-menu vertical shift; all other global geometry/overflow checks remain
  strict.
- [x] Comparator unit tests pass 26/26; live legacy/local focused sweeps pass
  2/2 at desktop and mobile with zero diff/local failures.
- [ ] Full fallback-off/global audit, same-fixture route coverage, and overall
  final pixel lock remain open.

### 2026-07-28 — Batch 1040 bounded full visual sweep

- [x] Add bounded full-corpus execution with `YORAM_SWEEP_BATCH_SIZE` and
  `YORAM_SWEEP_BATCH_INDEX`; preserve strict per-batch exit behavior and write
  distinct batch reports.
- [x] Contract tests pass 27/27; live external Chrome batch 0 covers 10
  routes and persists `output/playwright/visual-sweep/batch-0.json`.
- [ ] Remaining batches, aggregate comparison, global fallback audit, and
  overall pixel lock remain open; batch-0 route geometry failures are real
  parity gaps, not teardown failures.

### 2026-07-28 — Batch 1044 notification fixture/payload parity

- [x] Stabilization timing is measured separately from route inspection:
  external Chrome reports legacy 45–95ms route paint, Rust dist 169–192ms,
  and only 20–32ms for the font/image/animation settle phase.
- [x] Fresh parity bootstrap creates Bob's issue comment and Alice's board
  comment through REST, matching the legacy notification fixture without
  direct notification-table fabrication.
- [x] Rust issue/board comment notification events now include the legacy
  `Original issue`/`Original posting` or `Previous comment` context in
  `oldValue`; fresh desktop/mobile notification pairs report zero visual and
  local failures.
- [ ] Remaining route batches, full fallback-off/global fallback audit,
  same-fixture screenshot pairing, and final pixel lock remain open.

### 2026-07-28 — Batch 1052 reviews/settingform/transfer shell parity

- [x] Legacy review, project-setting, transfer, setting-menu, frozen LESS/Bootstrap, and import-chain evidence was identified before implementation.
- [x] Reviews renders the legacy `project-page-wrap > row-fluid issue-list-wrap` shell for empty responses; settingform restores the legacy shell cascade, content-box right panel, textarea height, and page boundary; transfer restores the legacy `box-wrap bottom` action shell.
- [x] External System-Chrome production-dist batch 6 passes 10/10 with diff failures 0, local failures 0, and no status deltas. Focused normal/fallback-off evidence covers the three route states; fallback-off settingform passes 1/1.
- [ ] Remaining corpus batches, global fallback-consumer audit, full fallback-off suite, same-fixture screenshot pairing, and overall final pixel lock remain open.

### 2026-07-28 — Batch 1055 project delete action-wrapper parity

- [x] `project/delete.scala.html`, `partial_settingmenu.scala.html`, frozen `.box-wrap.bottom`, modal, and Bootstrap evidence establish the action wrapper contract.
- [x] React deleteform restores the legacy `box-wrap bottom` wrapper while retaining React-owned checkbox/modal behavior; focused normal/fallback-off E2E covers desktop/mobile geometry and interaction.
- [ ] Batch 7 final rerun, remaining corpus batches, global fallback audit, full fallback-off suite, same-fixture pairing, and overall pixel lock remain open.

### 2026-07-28 — Batch 1056 site-data wrapper parity follow-up

- [x] `/sites/data` composes the existing StyleX page and warning owners with the legacy `page-wrap-outer` and `cu-desc` classes so the frozen cascade is active at the React-owned boundaries.
- [x] Normal external System Chrome focused matrix passes 14/14 with desktop/mobile screenshot assertions; explicit fallback-off warning-surface screenshots pass 6/6 with separate normal/fallback-off baselines.
- [ ] Remaining corpus gaps, action-only/deferred targets, global fallback-consumer audit, same-fixture screenshot pairing, and overall pixel lock remain open.

### 2026-07-28 — Batch 1057 visual-sweep repository-root stabilization

- [x] Confirmed the long-looking stabilization was not route rendering: production-dist route paint was ~183–207ms; the remaining sweep bootstrap cost was account/fixture setup.
- [x] Fixed the actual repository fixture mismatch by emitting `data_root` in generated `dev.toml`; otherwise SQLite used `.yona-data/visual-sweep-local` while Git branch lookup used default `.yona-data`.
- [x] External production-dist Chrome reruns: batch 3 10/10, batch 10 10/10, and batch 14 project shell healthy. PR form-options changed from 400 empty-repository to 200.
- [ ] Batch 15 legacy-only member edit routes and action-only `/watch` remain documented gaps; remaining corpus, fallback-off/global audit, screenshot pairing, and final pixel lock remain open.

### 2026-07-28 — Batch 1058 visual-sweep project-root settle gate

- [x] Project-root routes now wait for `.project-page-wrap`, so asynchronous container responses cannot be measured as the global shell.
- [x] `/weblabs/portal` external Chrome legacy/local focused comparison passes 1/1 with zero diff/local failures; local capture moves from 121 to 397 visible characters after the settle gate.
- [ ] Remaining corpus gaps, action-only/deferred targets, fallback-off/global audit, screenshot pairing, and overall pixel lock remain open.

### 2026-07-28 — Batch 1059 fallback-off broad-audit classification

- [x] Confirmed `/alice/sample/watch`, `/weblabs/portal/member/*/edit`, and `/sites/user/delete*` are action-only legacy endpoints (POST/DELETE), not GET screens to implement for visual parity.
- [x] Started the managed dynamic-port full fallback-off command (`VITE_DISABLE_LEGACY_FALLBACK=1`, 3,070 tests). Selector-consumer checks passed through the observed range; global shell/login/organization tests exposed a repeated existing fallback-off legacy-DOM contract family.
- [ ] The broad run was stopped at test 205 to avoid repeating the same known failure family. Full fallback-off/global audit and final pixel lock remain open; no green claim is made.

### 2026-07-28 — Batch 1060 global-shell stabilization wait diagnosis

- [x] Recorded the initial global GNB stabilization diagnosis; Batch 1062 supersedes its intermediate desktop-padding assumption with the frozen responsive `10px` rule.
- [x] Removed stale fallback-off contracts for the old `/src/assets/...` response path and pre-TanStack source forms.
- [x] Measured the delay mechanism: failed assertions reached Playwright's 30-second timeout, so a 4-test focused run took about 1.3 minutes despite server/Vite startup completing in seconds.
- [x] Remaining logo/mobile metric mismatches were resolved as stale baselines; broad fallback-off audit and final pixel lock remain open.

### 2026-07-28 — Batch 1061 global-shell geometry baseline correction

- [x] Corrected stale desktop child metrics against the frozen responsive 10px outer padding rule.
- [x] Updated feedback width/search-flow metrics for the intentional `Yoram repository` copy; no CSS or tolerance relaxation was introduced.
- [x] External Chrome focused parity passes normal `3/3` and fallback-off `2/2`; each completes in about 13 seconds without assertion timeout.
- [ ] Broad fallback-off/global audit and final pixel lock remain open.

### 2026-07-28 — Batch 1062 restore frozen responsive GNB padding

- [x] Restored desktop/mobile `padding: 0 10px` in the React GNB owner from frozen `_responsive.less:600` evidence; this route does not consume the shared `.gnb-outer` bridge class.
- [x] Normal and fallback-off focused GNB parity both pass `3/3`; no timeout or tolerance relaxation remains.
- [ ] Broad fallback-off/global audit and final pixel lock remain open.

### 2026-07-28 — Batch 1063 release-dist live shell pair

- [x] Rebuilt `frontend/dist` was served by the release Rust binary and paired
  against the prepared legacy `127.0.0.1:9000` instance in external System
  Chrome. `/admin/sample` and `/admin/sample/post/1` passed on desktop
  1366×900 and mobile 390×844 with `diffFailures=0`, `localFailures=0`, and no
  status deltas.
- [ ] This focused pair does not close the full corpus screenshot lock or
  populated-state fixture gaps.

### 2026-07-28 — Batch 1064 release-dist corpus batch 0 classification

- [x] External System Chrome reran corpus batch 0 against live legacy and the
  rebuilt release-dist server: 9/10 local pages passed, all 10 comparison
  entries had zero diff failures, and the single `/projects` failure was the
  local pilot `yona`/`browser-safe route tree` seed copy.
- [ ] The `/projects` seed/content drift remains open; it is not treated as a
  route CSS fix or screenshot-gate relaxation.
### 2026-07-28 — Batch 1065 release-dist batch 1 and stabilization timing audit

- [x] Rebuilt `frontend/dist` and reran mobile batch 1 in external System
  Chrome; 7/10 routes were diff-free, with 3 confirmed visual gaps after the
  rebuild.
- [x] Measured route metrics settle at 83–425ms legacy and 200–595ms local;
  the long wait is runner page/browser teardown contention, not React page
  responsiveness.
- [ ] Delegate and verify `/search` mobile overflow and both direct issue-form
  mobile geometry gaps; preserve strict screenshot parity.
### 2026-07-28 — Batch 1066 release-dist batch 1 post-worker verification

- [x] Search mobile overflow is closed by fresh production-dist paired sweep.
- [ ] Direct issue-form live production parity remains open despite a 2/2
  managed fixture test; reproduce against the live seeded route before further
  implementation changes.
### 2026-07-28 — Batch 1067 live direct issue-form markdown-help parity

- [x] Restored the legacy inline whitespace between markdown-help nav items and
  the frozen Bootstrap `.label` declarations in the StyleX owner.
- [x] Fresh release-dist paired mobile sweep passes both direct issue routes:
  zero diff failures, zero local failures, and `200 -> 200` status parity.
- [x] Stabilization timing is documented separately: local route settle is
  438–604ms versus legacy 416–419ms in this focused run; teardown retains
  bounded page/browser close waits and was not loosened.
