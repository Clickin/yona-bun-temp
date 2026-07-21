# Fallback-off discovery report — 2026-07-21

Status: discovery only; the React-served legacy fallback remains enabled by default.

## Run

- Command: `VITE_DISABLE_LEGACY_FALLBACK=1 pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend exec node ../scripts/run-playwright-e2e.mjs -- --workers=15`
- Runtime: managed dynamic ports (`YONA_E2E_MANAGED_SERVERS=1`), Rust backend plus Vite frontend
- Scope: the complete Playwright suite, including its desktop and mobile viewport cases
- Result: `2,675` tests, `1,541` passed, `1` skipped, `1,133` failed, `49.4m`
- Default mode: not changed; the normal application still serves the generated legacy fallback
- Frozen sources: no `yona-original/**` file was changed

## Failure classification

The 1,133 Playwright failure artifact directories under `frontend/test-results/` are the
authoritative per-failure evidence. The bounded filename classification below assigns every
artifact to exactly one follow-up lane; it is triage evidence, not proof that a declaration may
be retired.

| Lane | Count | Classification rule and representative evidence |
| --- | ---: | --- |
| React StyleX owner candidate | 449 | `stylex-*` artifacts whose fallback-off computed paint/geometry, screenshot, or owner contract still depends on a frozen declaration; examples include `stylex-global-gnb-*`, `stylex-organization-*`, and `stylex-site-*`. Migrate only the exact cited declaration in its owning route/state. |
| Global/shared bridge candidate | 40 | `global-*`, `global-shell-*`, `site-admin-*`, or `ui-kit-*` artifacts where the declaration has no single route owner or is shared by shell/plugin boundaries. Review for the smallest cited bridge; do not add a catch-all stylesheet. |
| Route DOM/behavior/data parity | 641 | Remaining route artifacts where fallback-off exposed missing/changed DOM, navigation, query state, interaction, or fixture behavior rather than a proven CSS-only consumer. Repair parity first and do not mask it with StyleX. |
| Fallback-boundary/static contract | 3 | `legacy-fallback-off-*` artifacts. These are runtime asset/static retirement checks and remain non-green until their exact contract is independently repaired and reviewed. |

The first failures are representative of the classification: login/auth alias and legacy DOM
comparison failures, global shell/help/migration geometry failures, organization/project shell
failures, and later user-settings/files/issues/profile state failures. They do not justify
unlinking the fallback because the global run is not green.

## Decision

Do not unlink `legacy-fallback.css`, delete shared selector families, or claim fallback retirement.
The next wave must select a bounded 2–6-owner state from the classified artifacts, identify the
exact frozen Scala/LESS/CSS source, add focused normal and fallback-off evidence, and update the
ledger and Scala audit in the same commit when route TSX changes.

## First bounded repair wave

The organization pull-request review-progress artifact was repaired without changing the
fallback boundary. The route-local owner now carries the exact emitted `.upload-progress`
track geometry (`display:inline-block`, `width:30px`, `height:7px`, `vertical-align:middle`,
`overflow:hidden`, `margin-top:3px`, `border-radius:5px`) and inner `.bar { height:100% }`;
the API-derived percentage remains the dynamic StyleX width carrier. The focused test passed
`1/1` with the fallback enabled and `1/1` with `VITE_DISABLE_LEGACY_FALLBACK=1`, covering
desktop and mobile viewports. The remaining global baseline is still red, so fallback removal
and shared-selector retirement remain deferred.

## Second bounded repair wave

The organization-members mobile row owner was repaired from the frozen responsive cascade. The
existing member-row StyleX owner now carries the exact `width:100vw` mobile declaration beside
the existing `min-width:95%`, desktop span width, and `margin-left:5px`; legacy member DOM,
classes, and role/delete behavior remain unchanged. The focused list test passes `3/3` with the
fallback enabled and `3/3` with `VITE_DISABLE_LEGACY_FALLBACK=1`, covering populated/empty
desktop/mobile row and list geometry. The remaining outer document-width difference is not
assigned to this route owner and remains in the global/shared bridge lane.

## Candidate review — organization creation/settings

The organization creation screen was replayed with fallback disabled. Its focused contract had
three behavioral/static passes, but both desktop and mobile geometry checks reported a 1px short
legend-to-name-field gap (`46px` versus the legacy `47px`). The frozen `.frm-wrap dt` declaration
is already reproduced exactly (`margin: 3px 0 1px 0`); changing it to `2px` would be an invented
compensation. The Bootstrap `label { display: block; margin-bottom: 5px; }` hypothesis was also
replayed and produced `45px`, so this candidate remains un-repaired pending a source-backed DOM or
cascade explanation.

The organization settings candidate was not selected: its focused fallback-off check failed only
because the test still expects the retired `organization-setting-body` owner marker, while the
route emits the current split owners. This is a stale test contract, not evidence for a frozen
CSS owner migration. No route, test, frozen asset, or fallback boundary was changed for either
candidate.

## Candidate review — site/project probes

Additional focused probes did not produce a valid new CSS-owner wave. The project milestone and
pull-request creation checks target legacy sample fixtures that are not rendered by the current
route tree; the site update title checks likewise fail before title geometry because the fixture
response does not produce the expected content. The site user-list listhead contract reads the
project code-branch source and compares an unscoped fallback fixture against a scoped StyleX owner,
so its failures are stale test scope rather than evidence for a route declaration.

The site-update responsive grid contract passed fallback-off (`1/1`) across available/current/error
states and desktop/tablet/mobile geometry. Organization issue search and quick-search contracts
also passed fallback-off (`1/1` each). No implementation or focused E2E file was changed during
these probes; the fallback remains enabled by default.

## Candidate review — projects directory row content

The projects row-content contract passed its fallback-off source/owner check, but desktop and
mobile geometry both exposed a real residual: the header and description line boxes were `18px`
instead of the expected `20px`, moving the row content upward by `6px` and shortening the row.
The exact frozen Bootstrap `line-height:20px` declaration was replayed in the existing route-local
identity owner; it corrected the line-box heights, but left a `2px` content-origin difference.
No frozen declaration supports a route-local `2px` compensation, so the candidate remains blocked
without changes. The fallback remains enabled by default.

## Candidate review — organization directory responsive search

The `/orgs` focused contract exposed a valid responsive owner gap: the legacy mobile cascade sets
`.search-wrap` height to `inherit` and `.search-bar .textbox` width to `inherit !important`. A
route-local StyleX trial reproduced those declarations and made the input fit the 390px viewport,
but fallback-off still rendered the search button at `0px` width because its `yobicon` glyph depends
on the shared frozen `yobicon` `@font-face` currently supplied by the legacy fallback stylesheet.
Adding a route-local button width would invent geometry not present in the frozen source. The
responsive owner therefore remains blocked in the shared font-boundary lane; no route or focused
E2E changes were retained, and the fallback remains enabled by default.

## Candidate review — site data administration probes

The site data sidebar contract passed its source, owner, links, SPA navigation, and repeated-owner
checks (`4/5`) with fallback disabled. Its single failure is a synthetic fallback comparison: the
test creates a new unstyled `<ul>` whose browser default `list-style: disc` is compared against the
StyleX-owned `none`; it is not a rendered route mismatch. The site data page/grid/column contract
passed all fallback-off desktop/mobile checks (`3/3`). No implementation or focused E2E files were
changed, and the fallback remains enabled by default.

## Candidate review — `/projects` directory search

The focused `/projects` source and filter-interaction checks pass with the legacy fallback
disabled. Exact frozen declarations now cover the project tab `margin-bottom:-2px`, the shared
form-control `font-size:12px`, the responsive search-wrap/search-bar cascade, and the Vite-owned
Yobicon font boundary; control/icon widths and heights match the expected output.

Desktop and mobile fallback-off geometry still reports a uniform 3px upward shift for the search
wrap and all descendants. The normal fallback-enabled run retains a uniform 1px upward shift.
The frozen project-page, title-area, Bootstrap nav-tab, and responsive declarations were inspected
and are already represented; no remaining declaration explains the shift. The fallback remains
enabled by default for this state, and no invented offset or weakened assertion was retained.

The follow-up typography probe confirms the mobile input now computes to the frozen `16px` rule
with fallback disabled while desktop remains `12px`. This removes the input-font consumer gap but
does not move the search ancestor: the fallback-off wrap and descendants remain uniformly 3px
high, so the residual is retained for shell/fallback-boundary investigation rather than patched
with a route-local offset.

## Follow-up — breadcrumb tab selector scope

The directory tabs are outside `.project-page-wrap`, so the applicable frozen Bootstrap rule is
`margin-bottom:-1px`; the frozen `-2px` declaration is scoped to other project-page tabs. After
correcting this owner, the normal `/projects` contract passes 4/4, including desktop/mobile
geometry. Fallback-off source and interaction pass, while the search ancestor remains uniformly
2px high. This residual is retained as a shell/fallback-boundary gap with no local compensation.

## Follow-up — `/projects` shell/control reset closure

The remaining fallback-off residual was traced to frozen shared resets: `_page.less:6801-6808`
requires the authenticated admin affix to use a 20px line height, while Bootstrap
`bootstrap.css:116-125,138-154` supplies the input/button vertical alignment, line-height, and
pointer cursor defaults. Existing StyleX owners now carry those exact declarations. Normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` focused runs cover source, desktop/mobile geometry, and filter
submission; no offset or assertion relaxation was added.

## Follow-up — `/projects` populated row-content line boxes

The focused row-content candidate initially passed with the fallback enabled but fallback-off
exposed 18px header/description line boxes and a two-pixel mobile row-height deficit. The
existing header, description, name-tag, and stats owners now carry the frozen Bootstrap body
`line-height:20px` declaration. Normal and `VITE_DISABLE_LEGACY_FALLBACK=1` runs pass source,
desktop/mobile geometry, and containment checks 3/3 each; no compensating offset was added.

## Follow-up — global GNB search-form class and icon boundary

The focused GNB search-form candidate exposed two fallback-off-only gaps: the
semantic `gnb-search-form` class was absent, and the search glyph had no
React-owned font/glyph presentation when the legacy fallback stylesheet was
disabled. The existing form now retains the semantic class while continuing to
drop plugin-only `input-prepend`; the Vite-owned Yobicon font and exact frozen
search glyph declarations are applied to the existing icon owner through
StyleX. Normal and fallback-off focused checks pass 10/10, including desktop
and mobile outer geometry, scope switching, and the legacy GET payload. No
offset, timeout workaround, or UX change was added.

## Follow-up — adjacent GNB input/submit contracts

The next GNB probes found no additional geometry or behavior gap. The input
contract failed only on an obsolete generated-fallback hash, and the submit
contract still expected the pre-StyleX exact `yobicon-search` class string and
treated the now StyleX-owned glyph as if removing the semantic class removed
its presentation. The focused contracts now assert the current artifact hash,
semantic class composition, and StyleX-owned glyph behavior while retaining
frozen source, computed desktop/mobile geometry, isolation, hover/focus, and
GET assertions. Normal and fallback-off runs pass input 8/8 and submit 9/9.

## Follow-up — global GNB nav inherited typography and consumer boundary

The global nav focused probe passed all rendered desktop/mobile geometry and
paint-isolation checks. Its source contract was stale in two ways: it expected
an obsolete grouped `.gnb-nav > li,` app.css selector and treated the already
migrated restricted-screen nav as if it still emitted the raw `gnb-nav` class.
The test now records the current retained `.gnb-nav > li {` bridge and the
actual migrated/retained consumer split. The global home nav also dropped an
explicit `fontWeight:400` declaration not present in frozen `.gnb-nav`, leaving
typography inherited as in legacy. Normal and fallback-off checks pass 8/8.

## Follow-up — global GNB inner box model and shared consumer contracts

The GNB-inner fallback-off probe exposed a real declaration gap: the existing
StyleX owner added `box-sizing:border-box`, while frozen `_page.less:198-203`
does not declare box sizing and the legacy computed state is `content-box`.
Removing that unsupported declaration restores the desktop/mobile home,
project, and organization states without offsets or DOM changes. The same
wave repaired stale source assertions for the already StyleX-owned restricted
brand/nav/inner consumers, current `.gnb-nav > li {` selector spelling, and
StyleX-owned sidebar pseudo-glyph isolation. The assembled five-owner
fallback-off wave reported 38/38 tests green before managed wrapper cleanup
was interrupted; the restricted sidebar serial run passed 4/4 parity checks.
The unsupported `.gnb-inner` fallback bridge was also retired from
`frontend/src/app.css`; the focused source contract now asserts that only the
source-backed declarations remain and that adding the retained legacy class
does not change the StyleX-owned computed state.
## Follow-up — global GNB outer responsive padding

The GNB-outer fallback-off probe exposed a desktop-only declaration gap: the
existing StyleX owner used `padding:0`, while frozen `_responsive.less:600-603`
applies `padding:0 10px` under the legacy `@media all` cascade. The existing
owner now carries `10px` for default/mobile states and keeps the frozen
project-header override at `0px`; no offsets or DOM changes were added.
Normal and fallback-off focused checks pass 9/9, including source hashes,
consumer ownership, all home/project/organization desktop/mobile geometry, and
paint isolation.

## Follow-up — global GNB project-list divider owner boundary

The divider source contract exposed only non-source declarations in the existing
StyleX owner: `backgroundColor`, `backgroundImage`, `height:auto`, and `width:auto`
are absent from frozen `.gnb-nav`/`.divider` output. The owner now retains the exact
float/position, font-size, line-height, and `|` pseudo-element paint; the stale
`.gnb-nav > li,` assertion was corrected to the current `.gnb-nav > li {` bridge.
Focused normal and fallback-off runs pass 10/10 with desktop/mobile geometry,
conditional visibility, and paint isolation.

## Follow-up — global GNB nav browser-default owner boundary

The global nav owner contained two declarations absent from frozen `.gnb-nav`:
`box-sizing:content-box` and `position:static`. They were removed from the
existing StyleX owner. The `line-height:20px` declaration remains because frozen
Bootstrap `bootstrap.css:176-181` supplies that inherited baseline and fallback-off
body otherwise computes 18px. Focused normal/fallback-off contracts preserve the
desktop/mobile geometry, consumer split, and paint isolation.

## Follow-up — global GNB feedback-link browser-default cleanup

Fallback-off evidence confirmed that the feedback anchor retains its legacy
geometry after removing only the explicit `display:inline` and `float:none`
StyleX declarations. The frozen `.gnb-nav a` rule does not declare either
property; source-backed color, line-height, padding, transition, external
navigation, and conditional visibility remain intact. Focused normal and
fallback-off runs pass 10/10.

## Follow-up — global GNB project-list link browser-default cleanup

Fallback-off evidence confirmed that the List All link retains its legacy
geometry and active triangle after removing only the explicit `display:inline`
StyleX declaration. Frozen `.gnb-nav a` continues to provide `float:none`,
padding, line-height, color, text decoration, and transition; conditional
visibility and SPA navigation remain intact. Focused normal and fallback-off
runs pass 8/8.

## Follow-up — global GNB brand-link browser-default cleanup

Fallback-off evidence confirmed that the brand link retains its legacy home and
project-header geometry, hover/focus behavior, and pseudo-element isolation
after removing only explicit `display:inline` and `float:none` StyleX
declarations. The frozen logo-specific and generic nav-anchor declarations
remain represented by the owner. Focused normal and fallback-off runs pass 6/6.

## Follow-up — global GNB search-box browser-default cleanup

Fallback-off evidence confirmed that the shared search box retains its legacy
radius, background, height, display, vertical alignment, submit/input geometry,
and scope-menu behavior after removing only explicit `border-style:none`,
`border-width:0px`, and `box-sizing:content-box` StyleX declarations. Paired
submit and scope-menu runs pass 16/16 in normal and fallback-off modes.

## Follow-up — global GNB search-submit browser-default box-model cleanup

Fallback-off evidence confirmed that the search submit retains its legacy
geometry, hover/focus paint, responsive hiding, Yobicon isolation, and GET
payload after removing only explicit `box-sizing:border-box` from its StyleX
owner. Focused normal and fallback-off submit runs pass 9/9.

## Follow-up — global GNB search-scope browser-default box-model cleanup

Fallback-off evidence confirmed that the scope toggle and menu buttons retain
their legacy closed/hover/focus/open paint, caret/menu geometry, copy/order,
interaction, mobile hiding, and isolation after removing only explicit
`box-sizing:border-box` declarations. Focused normal and fallback-off scope
menu runs pass 7/7.

## Follow-up — global GNB search-scope menu container float and box-model ownership

Fallback-off evidence confirmed that the scope menu retains its legacy
positioning, dimensions, paint, pseudo-elements, and interaction after mapping
frozen Bootstrap `float:left` and removing only the unsupported
`box-sizing:content-box` plus the redundant item `float:none` declarations.
The absolutely positioned menu still computes to `float:none`; focused normal
and fallback-off scope-menu runs pass 7/7.

## Follow-up — Batch 716 shared fallback consumer-graph refresh

The current React inventory confirms that the generic `.dropdown-menu` bridge
still serves project/org members, settings/forms, issue/milestone mass-update,
pull-request changes, commit selectors, the home user-menu, typeahead, and
Select2 surfaces. `.ybtn`, `.label`/`.badge`, `.alert`, `.nav-tabs`, `.modal`,
grid, and pagination families also retain multiple incomplete consumers;
plugin-generated `.hljs-*` remains deferred. No complete safe retirement group
was proven, so the fallback remains enabled and no route, focused E2E, frozen
source, or shared selector was changed.

## Follow-up — authenticated project-settings reviewer-count dropdown owner

Fallback-off evidence confirmed that the existing reviewer-count dropdown now
retains its legacy toggle/caret/menu geometry, open state, option selection,
URL/session stability, and mobile containment after moving only the exact
frozen `_yobiUI.less` and Bootstrap declarations into route-local StyleX.
Generic dropdown fallback consumers remain untouched. Isolated normal and
fallback-off reviewer-dropdown runs pass 1/1 each.

## Follow-up — authenticated project-settings default-branch Select2 owner

Fallback-off evidence confirmed that the existing default-branch Select2
container, choice, caret, search, drop, results, result-label geometry, branch
filter interaction, selected-value synchronization, and mobile containment are
owned by route-local StyleX from the frozen Select2 and `_override.less`
declarations. Unrelated Select2 consumers retain the legacy fallback. Focused
normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings MenuCheckbox owners

Fallback-off evidence confirmed that all six project menu-setting label/input
pairs retain frozen `.radio-btn` and `label.inline-list` alignment and spacing,
copy/order, checked state, code-dependent visibility, and desktop/mobile
containment through route-local StyleX. Unrelated radio and inline-list
consumers retain the legacy fallback. Focused normal and fallback-off runs
pass 1/1 each.

## Follow-up — authenticated project-settings radio-input owners

Fallback-off evidence confirmed that the six visible project-settings radio
inputs retain frozen `.radio-btn` `vertical-align:top` and `margin:2px`
geometry, DOM order, checked state, reviewer enable/disable behavior, and
desktop/mobile containment through route-local StyleX. The organization-only
protected branch and unrelated radio consumers retain the legacy fallback.
Focused normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings tab-anchor owners

Fallback-off evidence confirmed the seven native subnavigation anchors retain
frozen Bootstrap display, padding, margin, line-height, border/radius,
hover/focus, and active declarations across desktop/mobile while preserving
Link navigation, copy/order/hrefs, count badge, active/conditional state, and
containment. Generic tab fallback consumers remain. Focused normal and
fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings subnavigation list owner

Fallback-off evidence confirmed the native seven-item `ul.nav.nav-tabs` retains
frozen Bootstrap `.nav` `margin-bottom:20px`, `margin-left:0`, and
`list-style:none` while preserving item margins, Link navigation, count badge,
active/conditional Change VCS state, and desktop/mobile containment. Generic
nav/tab fallback consumers remain. Focused normal and fallback-off runs pass
1/1 each.

## Follow-up — authenticated project-settings subnavigation clearfix owner

Fallback-off evidence confirmed the existing subnavigation list owner retains
frozen Bootstrap `.nav-tabs` `::before`/`::after` table pseudo-elements,
zero-line-height empty content, and `clear:both` on `::after` across
desktop/mobile while preserving tab navigation and geometry. Generic tab
fallback consumers remain. Focused normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings definition-list field owners

Fallback-off evidence confirmed the top settings `dl`, `dt`, `dd`, and label
owners retain frozen `.frm-wrap` margin/padding, term spacing, bold labels, and
label right margin across desktop/mobile while preserving the right-column
layout, popover, textarea, and Save behavior. Generic field fallback remains.
Focused normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings logo upload owners

Fallback-off evidence confirmed the left-column logo upload button and
transparent file input retain frozen `.nbtn`, `.white`, `.medium`,
`.fake-file-wrap`, and `.file` geometry across desktop/mobile while preserving
file identity, invalid-image validation/reset, and logo submission behavior.
Generic upload fallback consumers remain. Focused normal and fallback-off runs
pass 1/1 each.

## Follow-up — authenticated project-settings form/frame shell owners

Fallback-off evidence confirmed the form `nm` margin and frame
`bubble-wrap gray` surface retain the frozen overflow-visible behavior,
20px bottom margin, 5px radius, gray background, desktop/mobile geometry, and
Save/form interaction through route-local StyleX. Generic shell consumers
retain the legacy fallback. Focused normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings top/bottom shell owners

Fallback-off evidence confirmed the top and bottom shell owners preserve the
Scala shell classes, desktop/mobile border and padding cascade, top responsive
padding, bottom alignment, and Save `ybtn ybtn-success` submit contract.
Generic shell consumers retain the legacy fallback. Focused normal and
fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings middle-row shell owners

Fallback-off evidence confirmed six middle-row owners retain the frozen
`.box-wrap` border/padding declarations on desktop, the frozen responsive
`padding:10px 0` override on mobile, and the frozen last-of-type border removal
for Menu Setting. Row DOM/classes/order and menu/reviewer/default-branch
dependencies remain intact; generic `.box-wrap` consumers retain the fallback.
Focused normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings middle-row owners

Fallback-off evidence confirmed six `.cu-label`, six `.cu-desc`, and three
nested `.note` owners retain frozen declarations on desktop/mobile, including
legacy `vmiddle` alignment and empty-note output. Row copy/order and
menu/reviewer dependencies remain intact; generic `.cu-*` fallback remains.
Focused normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings Save button owner

Fallback-off evidence confirmed that the existing `#save.ybtn.ybtn-success`
button retains frozen default, hover/focus/active paint, geometry, submit type,
validation behavior, and desktop/mobile containment through route-local StyleX.
Generic `.ybtn` consumers retain the legacy fallback. Focused normal and
fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings Issue Template Edit owner

Fallback-off evidence confirmed that the Issue Template Edit anchor retains the
frozen generic `.ybtn` default and hover/focus/active paint, 30px control
geometry, legacy `ybtn` class, Edit copy, new-tab target, issue-template URL,
and desktop/mobile containment through route-local StyleX. Generic `.ybtn`
consumers retain the legacy fallback. Focused normal and fallback-off runs pass
1/1 each.

## Follow-up — authenticated project-settings subnavigation owner

Fallback-off evidence confirmed that all seven project-settings subnavigation
items retain the frozen route-specific `margin-bottom:-2px` geometry, tab
DOM/order/copy, Link hrefs, active state, member count badge, conditional
Change VCS visibility, and desktop/mobile containment through route-local
StyleX. Generic Bootstrap/nav-tabs consumers retain the legacy fallback.
Focused normal and fallback-off runs pass 1/1 each.

## Follow-up — authenticated project-settings logo-description list owner

Fallback-off evidence confirmed the top-left native `ul.unstyled descs` list
retains frozen Bootstrap `margin-left:0` and `list-style:none` across
desktop/mobile while preserving item copy/order, existing spacing, upload
validation, and containment. Generic `unstyled` fallback consumers remain.
Focused normal and fallback-off runs pass 1/1 each.
