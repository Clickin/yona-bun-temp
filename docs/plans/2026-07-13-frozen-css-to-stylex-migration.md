# Frozen CSS/LESS to StyleX Migration Plan

Status: Wave 1 active after one hundred fifty-one slices; theme-boundary correction complete
Date: 2026-07-14
Owner: frontend parity migration
Prerequisite: TanStack Router typecheck recovery and focused route-regression gates are green

## 1. Outcome

Move the React application's legacy component, layout, state, and responsive styling from the
frozen Yona CSS/LESS baseline to `@stylexjs/stylex` without changing user-visible Yona/Yoram UX.
The migration is incremental: StyleX wins the cascade for migrated declarations, while the
unmodified legacy output remains available as a lower-priority fallback until its owning source
module is fully migrated.

The end state is:

- no runtime `<link>` to frozen `bootstrap.css`, `bootstrap-responsive.css`, `yobi.css`, or
  `usermenu.css`;
- no React component depends on a legacy class for computed layout or appearance;
- every migrated value is traceable to a frozen LESS/CSS source rule;
- E2E selectors do not depend on StyleX hashes or presentation-only legacy classes;
- desktop and 390 px parity gates remain green throughout;
- the original legacy sources remain byte-identical reference evidence under `yona-original/`.

## 2. Scope and fixed boundaries

### 2.1 Frozen baseline in scope

| Runtime family          | Canonical source                                                             | Current generated/runtime form                | Treatment                                                        |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| Yobi application styles | `yona-original/app/assets/stylesheets/yobi.less` and its 13 imported modules | module inside generated `legacy-fallback.css` | Migrate module-by-module to colocated StyleX definitions         |
| User menu               | `yona-original/app/assets/stylesheets/usermenu.less` and `_usermenu.less`    | module inside generated `legacy-fallback.css` | Migrate with the root/user-menu shell wave                       |
| Bootstrap base          | `yona-original/public/bootstrap/css/bootstrap.css`                           | module inside generated `legacy-fallback.css` | Migrate by component families, then remove the complete fallback |
| Bootstrap responsive    | `yona-original/public/bootstrap/css/bootstrap-responsive.css`                | inactive, hash-recorded reference only        | Migrate only with an evidenced responsive owner                  |

The frozen sources are evidence only and must never be edited. At present the LESS tree contains
20 files and about 14,193 lines; the generated Yobi/user-menu output is about 12,971 lines, while
the two Bootstrap files add about 7,218 lines. Line counts are inventory hints, not progress
metrics. Progress is measured by migrated user-visible surfaces and retired fallback modules.

### 2.2 Runtime CSS outside the frozen baseline

The icon font and plugin sheets (`yobicon`, Select2, Pikaday, NProgress, Viewer.js,
Magnific Popup, Dynatree, and JCrop) are tracked in the same ledger but are not mixed into an
arbitrary component wave. They are migrated only with the React-owned replacement for that
plugin. Font-face declarations and font binary mapping remain an asset concern.

### 2.3 Non-negotiable parity rules

- Copy every numeric value, media query, pseudo-state, and asset reference from an identified
  legacy rule. Do not invent spacing, sizing, transforms, or viewport offsets.
- Preserve the Scala template's visible element roles, order, copy, and interaction.
- Do not rewrite legacy jQuery DOM control into React. React state/events and TanStack Router/Query
  continue to own behavior.
- Do not migrate a CSS selector in isolation when its hover, focus, disabled, active, responsive,
  or plugin-generated state belongs to the same visible component.
- Do not use generated StyleX class names in tests, source code, screenshots, or documentation.

## 3. Cascade and fallback architecture

### 3.1 Required ordering

The cascade order is declared once and tested:

```css
@layer legacy, stylex.priority1, stylex.priority2, stylex.priority3;
```

The actual number of StyleX priority layers is compiler-owned. The Vite integration uses the
official 0.19 configuration shape:

```ts
stylex.vite({
  useCSSLayers: {
    before: ["legacy"],
    prefix: "stylex",
  },
});
```

The migration must not rely only on `<link>` order. Legacy selectors often have greater
specificity than atomic StyleX selectors, so load order alone cannot make legacy CSS a reliable
fallback. All legacy component rules must be inside the lower `legacy` layer; StyleX priority
layers and StyleX's compiler-owned unlayered rules then win for migrated declarations.

### 3.2 Generated legacy fallback

Replace the direct legacy links in `frontend/index.html` with one generated artifact, for example
`frontend/public/legacy-assets/generated/legacy-fallback.css`.

The build script must:

1. read but never alter the canonical legacy sources;
2. compile active LESS entries and concatenate the exact runtime stylesheet chain;
3. wrap the emitted component rules in `@layer legacy { ... }`;
4. preserve source order, media queries, and resolved asset URLs;
5. fail on an unknown, duplicated, or already-retired module;
6. emit a deterministic manifest and hash for E2E/build verification.

The manifest records source modules rather than attempting a new CSS AST/codemod framework:

```json
{
  "active": ["bootstrap", "bootstrap-responsive", "_common", "_page"],
  "retired": ["_usermenu"],
  "referenceOnly": ["_variables", "_mixins"]
}
```

For Yobi LESS, `_variables.less` and `_mixins.less` remain compile-time inputs while any rule-
emitting module can be removed from the generated entry once all its visible surfaces are
migrated. Bootstrap remains as one fallback unit unless a later, evidence-backed split can be
performed without adding a parser dependency. StyleX still overrides individual Bootstrap rules
during migration; the Bootstrap fallback link is removed only after all Bootstrap families pass.

Wave 0 implementation bundles the full active `layout.scala.html` stylesheet chain—not only the
three frozen families—inside `@layer legacy`, preserving the exact Bootstrap →
Yobicon/Select2/Pikaday → usermenu/Yobi → NProgress/Viewer/Magnific order. The manifest classifies
the six plugin sheets as passthrough rather than migrated ownership. This avoids the plugin
interleaving change that replacing three separated links at one position would cause. Asset URLs
are rewritten relative to the generated artifact; `bootstrap-responsive.css` is hashed as
inactive reference-only evidence. Standard `predev` and `prebuild` hooks regenerate the artifact.

### 3.3 Precedence proof

Before the first real slice, add a focused E2E fixture in which legacy and StyleX intentionally
assign different values to the same harmless pilot property. The test must prove:

- StyleX wins while the legacy fallback is present;
- removing the StyleX prop exposes the legacy value;
- development and production builds produce the same result;
- base-path and embedded-server delivery load the same layer order.

The fixture is removed only after a production screen has an equivalent precedence assertion.

## 4. Style ownership model

### 4.1 Colocation

Use one `stylex.create` block beside the React component or route state that owns the DOM. Extract
a shared StyleX module only when the same legacy rule is already shared by at least three real
consumers. Do not create a speculative design-system layer.

### 4.2 Tokens

StyleX variables are theme override boundaries, not a second centralized stylesheet. A common
theme may contain only semantic colors, surfaces, border colors, and theme-dependent shadows that
multiple real consumers share with the same meaning. Route-specific theme values belong to a
route-specific `stylex.defineVars` set beside that route or in its route-owned module.

Geometry and non-theme presentation values belong directly in the owning `stylex.create` block:
`margin`, `padding`, `width`, `height`, offsets, display, font size/weight/line height, border
width/style, radius, responsive geometry, and similar values must not be routed through a variable
that is not reused as a theme override. A repeated literal alone does not justify a common token.

Legacy traceability is proven by colocated source comments, focused E2E, and the migration ledger;
it is not proven by moving every literal into `frontend/src/theme.stylex.ts`. Dark-mode values and
a toggle remain out of scope, but the variable boundary must already permit them without mixing in
route geometry.

### 4.2.1 Theme-boundary correction gate

Wave 1 route migration is paused. Before selecting another route/state, audit every definition in
`frontend/src/theme.stylex.ts` and every existing `globalColors.*` consumer, then:

1. inline every non-theme value in its owning `stylex.create` block;
2. move route-only theme values into route-specific variable sets;
3. retain in the common theme only genuinely shared semantic theme values;
4. remove the misleading catch-all contents from `globalColors` after all consumers are migrated;
5. if `globalColors` is retained, prove every remaining entry is a genuinely shared color,
   surface, border color, or semantic shadow intended for light/dark-mode override; delete it when
   no such entries remain. Renaming a catch-all registry or leaving the full CSS declaration set
   behind does not satisfy this gate;
6. update focused tests and provenance so they assert the new ownership boundary without treating
   variable indirection as legacy evidence;
7. pass affected browser parity, full frontend typecheck/Vitest/build/StyleX verification, frozen
   hashes, and the mandatory turn commit.
8. in the final correction commit, add a precommit static guard and focused contract test that
   reject non-color or route-owned entries added back to `globalColors`.

The original Wave 1 route/state sequence may resume only after the inventory has zero unclassified
definitions, zero non-theme values in theme variable sets, zero route-only values in the common
theme, and no remaining `globalColors` catch-all consumer.

### 4.3 Global-rule and font boundary

StyleX 0.19 does not provide a general global reset or `@font-face` authoring API. Therefore a
literal “every byte through `stylex.create`” claim is not technically valid. The migration exit
uses this narrow boundary:

- component/layout/state/responsive rules: StyleX only;
- `html`, `body`, `#root`, print reset, `@font-face`, and unavoidable asset declarations: one
  reviewed, non-frozen `frontend/src/platform.css` bridge;
- the bridge may contain only declarations that cannot be attached to a React element and must
  cite their legacy source; it may not contain component selectors or route-specific values.

The final gate fails if a declaration could be expressed on a React-owned element with StyleX but
was left in the bridge. If a future StyleX release gains a supported global/font API, removing the
bridge becomes the final cleanup slice.

## 5. Atomic migration unit

Every slice is one user-visible component or screen state and lands as a single commit. The same
commit must contain all of the following:

1. legacy evidence: Scala template/partial, LESS/CSS selector, responsive rule, and relevant JS;
2. StyleX declarations with exact legacy values and all visible states;
3. `stylex.props(...)` on the React-owned elements;
4. removal of presentation-only legacy classes when no remaining behavior/test needs them;
5. E2E selector migration for that surface;
6. desktop and 390 px computed-style/geometry assertions;
7. interaction coverage for hover/focus/active/disabled/open/closed states as applicable;
8. an updated migration ledger and provenance row;
9. frontend typecheck, build, focused E2E, and fallback-precedence checks.

Do not land “StyleX code now, selector/test cleanup later.” Do not update selectors without moving
the owning styles in the same slice.

## 6. E2E selector migration policy

Selector updates follow this order:

1. accessible role and legacy visible name (`getByRole`, `getByLabel`, `getByText`);
2. stable form `name`, route parameter, or legacy semantic `id` when it is part of the behavior;
3. an existing user-visible state attribute (`aria-expanded`, `aria-selected`, `href`);
4. a narrowly named `data-testid` only for non-semantic geometry anchors with no accessible
   locator.

Rules:

- Never select `.x123...`, class prefixes, StyleX rule order, or generated CSS text.
- Stop using presentation-only selectors such as `.span*`, `.pull-*`, `.mt*`, `.ybtn`, or
  `.nav-tabs` as soon as their owning surface is migrated.
- Keep exact `href`, role, copy, order, and accessibility assertions; selector migration must not
  weaken behavior coverage.
- Exact-DOM canonicalizers ignore StyleX hash classes. A legacy class is removed from the expected
  DOM only when its rule ownership is migrated and provenance records the intentional technical
  deviation.
- Screenshot/geometry tests locate a semantic container first, then measure its child structure;
  they do not locate by the style class being replaced.

Maintain `docs/provenance/frontend-stylex-migration-ledger.md` with one row per surface:

| Surface | Legacy selector source | React owner | New test locator | Desktop | 390 px | Fallback module | Status |
| ------- | ---------------------- | ----------- | ---------------- | ------- | ------ | --------------- | ------ |

## 7. Execution waves

### Wave 0 — Infrastructure and no-visual-change gate

- Add the cascade-layer configuration and generated fallback artifact.
- Add the precedence E2E and production-build inspection.
- Inventory every direct legacy stylesheet link and every LESS import module.
- Create the selector ledger and provenance template.
- Update `SPEC.md`, `DESIGN.md`, and `docs/agents/*` wording: legacy sources remain immutable
  evidence, while the generated lower-priority fallback is transitional runtime styling.

Exit: screenshots and computed geometry are unchanged with StyleX disabled except for the existing
root pilot; StyleX precedence is proven when enabled.

Implementation: complete. `@stylexjs/unplugin` uses
`useCSSLayers: { before: ["legacy"], prefix: "stylex" }`; the production verifier requires emitted
`@layer legacy;` before `stylex.priority*`, requires the relative fallback link before the StyleX
asset, and checks the copied artifact hash. The root pilot keeps `display: contents` in both layers
and changes only a custom-property probe when its generated StyleX class is removed, preserving
child geometry. A completion audit found that the existing `frontend/src/app.css` and route-local
Dynatree import were still unlayered and therefore outranked every named layer. Wave 0 now wraps
the unchanged app declarations in `legacy`, loads the unchanged Dynatree source through the
route-owned `frontend/src/routes/$ownerName/$projectName/code/legacy-dynatree.css`
`layer(legacy)` import, hashes both Vite inputs in the manifest, and rejects any
production CSS asset with a top-level style block outside a named layer. The corrected root,
project-folder, and exact SVN no-head desktop/390 focused metrics pass. A fresh six-screenshot
public/login/SVN control recapture remains a final integration check; the earlier control audit is
retained as evidence of the unlayered defect, not as corrected pixel-parity evidence.

### Wave 1 — Foundations and root shell

- legacy variables actually used by the shell;
- body/root platform bridge boundary;
- global shell, header, footer, search box, anonymous/authenticated user menu;
- `_usermenu.less`, then retire the user-menu fallback module;
- shared focus/disabled accessibility states.

Exit: landing, login, signup, setup, not-found, and authenticated shell tests pass on desktop and
390 px using semantic selectors.

Implementation started. The first verified slice migrates only `AnonymousSiteUserMenu` on the
anonymous `/` shell: its `_page.less` container/item/login/divider/last-item declarations and the
max-720 `_responsive.less` color now have colocated StyleX ownership. The frozen fallback remains
active, including the shared Bootstrap/`_yobiUI.less` `ybtn ybtn-success` primitive and untouched
hidden/authenticated menus. Its four legacy colors use the global variables in
`frontend/src/theme.stylex.ts`, establishing the override boundary without inventing dark-mode
values or behavior.

The second verified slice migrates the authenticated top-right `AuthenticatedSiteUserMenu`
boundary, excluding its hidden `#mySidenav`: container/items, links and hover, dividers,
site-admin icon size, dropdown toggles/carets and hover/focus, create action, last-item spacing,
and max-720 item/dropdown colors now use colocated StyleX declarations with exact legacy values.
The global theme entry adds only cited `@primary -> @orange`, `@low-white`, and `@white` values.
The hidden sidenav, avatar and dropdown overlay primitives, React-button resets, icon font,
inactive counter rule, and non-legacy menu height/reset remain fallback. This is not Wave 1
completion.

The third verified slice migrates only the authenticated `#mySidenav` outer open/closed shell.
StyleX now owns its exact base position, width, overflow, surface, text, shadow, and open border,
including the legacy JavaScript's desktop `360px` and max-720 `100vw` state. All colors and the
semantic shadow live in the canonical global theme entry; no dark values or toggle were added.
Scrollbar pseudo-elements, the inner right-menu width, account row, tabs, dynamic content, and
mobile inner-width correction remain frozen fallback and later owners. This is not Wave 1
completion.

The fourth verified slice migrates only the authenticated sidenav account-action row. StyleX owns
the row box model/alignment/muted color, the three menu-span spacing/font/black color, and the
logout hover violet through the global theme entry. The legacy logout white color and normal
weight remain fallback because their frozen declarations are `!important`; adding StyleX
`!important` or claiming normal StyleX ownership would violate the migration rules. Bootstrap
`.label`, anchor, inner shell, tabs/content, and scrollbar declarations remain later owners. This
is not Wave 1 completion.

The fifth verified slice migrates only the authenticated sidenav inner content frame. StyleX owns
the exact `_page.less` 10px top/left margins and 350px desktop width plus the existing max-720
`#mySidenav .span-hard-wrap` min-width/100% correction from the lower React parity sheet. It adds
no color and does not change the global theme entry. Bootstrap span/grid behavior, the global
mobile `.span-hard-wrap`, account actions, tabs/content, scrollbars, anonymous frame, and other
`.right-menu` consumers remain fallback. This is not Wave 1 completion.

The sixth verified slice migrates only the authenticated sidenav Favorite / Project / Recent
History tab strip. StyleX owns the list border/clearfix, item float/overlap, and React button
base/hover/focus/active declarations. Every color and transparent state is supplied by the
canonical global theme entry with exact Bootstrap or Yobi evidence; no dark-mode value or toggle
was added. The legacy max-720 `5px !important` rule targets anchors, not the React buttons, so the
existing `8px 30px` button padding remains unchanged rather than adding a responsive
compensation. Tab content, shared nav consumers, and frozen fallback remain later owners. This is
not Wave 1 completion.

The seventh verified slice migrates only the authenticated sidenav tab-panel state boundary.
StyleX owns the outer `.tab-content.tab-box` overflow, top-border suppression, and lower corner
radii; the inner tab-content overflow; and the three direct pane hidden/active display states.
React state and the existing workspace query still own selection and content. This slice has no
color declaration, so the global theme entry is unchanged. Inner search, list, star, row,
scrollbar, left-sidebar, and anonymous-sidebar declarations remain fallback and later owners.
This is not Wave 1 completion.

The eighth verified slice migrates only the authenticated Favorite pane search/list shell in its
populated and empty states. StyleX owns the group position, search input base/focus/box model, bar
base, list reset/scroll bounds, and `No results` presentation. Its only color is the exact frozen
`mediumvioletred`, exposed as `globalColors.sidenavNoResultText` in the canonical global theme
entry; no route-local raw color, dark value, or toggle was added. The max-720 global text-input
`16px !important` rule remains the final mobile computed font size, and CSS overflow-axis
coupling makes authored `overflow-x: visible` compute to `auto` beside `overflow-y: auto`.
Focus-bar pseudo-elements, scrollbar pseudo-elements, organization rows/stars/links/toggles,
the Project/Recent History panes, and other consumers remain fallback and later owners. This is
not Wave 1 completion.

The ninth verified slice migrates only the authenticated Favorite pane's populated organization
header rows, including the current user's own-project header and favorite/regular organization
headers. StyleX owns the exact row margins, flex header and hover state, React toggle reset,
logo/name/owner layout, typography, and truncation. Every concrete color is supplied by the
canonical global theme entry: the new evidenced organization-name and hover-surface variables
join the existing white, muted-text, and transparent variables; no route-local raw color, dark
value, or toggle was added. Project rows, project lists, star buttons/icons, focus and scrollbar
pseudo-elements, and the other panes remain frozen fallback and later owners. Fresh live legacy
captures at 1366×900 and 390×844 confirm the owned row's 25px height, internal geometry,
typography, and exact computed colors. This is not Wave 1 completion.

The tenth verified slice migrates the authenticated Favorite pane's nested project rows and
their hover-visible right popover. StyleX owns the row/list flex geometry, hover surface, project
link, logo/avatar, project name typography/truncation, and the complete React-generated popover
surface, placement, border, shadow, arrow/`::after`, and content declarations. All concrete
colors and the semantic shadow are supplied by the canonical global theme entry; no route-local
raw color, dark value, or toggle was added. This scoped popover is part of the already
React-owned project-row state and does not claim the shared Bootstrap popover primitive. Project
star buttons/icons/state, direct Favorite projects, the Project tab, recent-issue rows/popovers,
and scrollbar rules remain later owners. Fresh live legacy captures at 1366×900 and 390×844
confirm the 26px project row, 18px item, right-side popover geometry, and final Bootstrap/Yobi
cascade. This is not Wave 1 completion.

The eleventh verified slice migrates the authenticated Favorite pane's organization, nested
project, and direct-project favorite stars plus the current-user organization placeholder.
StyleX owns the complete semantic-button reset, static flex geometry, icon typography, idle,
starred, hover, focus, and pending states. It also removes the earlier React bridge's `29px`
absolute-button and sibling-margin compensation: fresh live legacy evidence confirms a `29×16`
static star wrapper, a left-aligned `16×15` icon, and a `29×0` empty placeholder at both desktop
and mobile widths. The three concrete colors are canonical global theme variables with no dark
values or toggle. Project-tab stars remain a separate later owner. No declaration of this
Favorite-star owner intentionally remains in fallback; removing its StyleX classes exposes the
known `app.css` absolute-placement drift as deletion evidence. This is not Wave 1 completion.

The twelfth verified slice migrates the authenticated sidenav's shared direct-project rows in
both the Favorite pane and every Project-tab subpane. StyleX owns the complete row/list/item,
logo/avatar/image, project-name, owner-link, hover, and star declarations, while React/TanStack
owns the separate project and owner navigation plus favorite mutation. All concrete colors come
from the canonical global theme entry; no route-local color, dark value, or toggle was added.
Fresh live legacy captures at 1366×900 and 390×844 confirm the exact `350×26`/`390×26` rows,
`321×18`/`361×18` items, static `29×16` stars, typography, truncation, and link states. No
declaration of this owner intentionally remains in fallback: removing its StyleX classes exposes
the old `app.css` absolute-star overlay and item-width drift only as deletion evidence. Shared
Bootstrap/Yobi rules remain active solely for other consumers, not as fallback ownership for
this migrated row. This is not Wave 1 completion.

The thirteenth verified slice migrates the authenticated Project pane's four-button subtab strip.
StyleX owns the exact strip/list/item/button reset, inactive, hover, focus, and active declarations.
It restores the frozen legacy active surface that the earlier React button bridge omitted:
`#f36c22` surface and bottom border with `#fcfcfc` text. All four concrete states use semantic
variables in the canonical global theme entry; no route-local color, dark value, or toggle was
added. Fresh live legacy and local Korean captures agree at both viewports on the `46px` strip,
`265.45×31` list, `5px 8px` button padding, and active/inactive heights. The three inline gaps
between the legacy Scala template's four `<li>` elements are emitted as React whitespace text
nodes, recovering the exact width without numeric CSS compensation. No declaration of this owner
intentionally remains in fallback; owner removal exposes the earlier transparent/black active
drift as deletion evidence. This is not Wave 1 completion.

The fourteenth verified slice migrates only the authenticated Project pane's search and list
shell. StyleX owns the group and input shell, React-owned focus bar including both pseudo-elements,
inner tab-content overflow, all four pane display/list/scroll bounds, the empty-result state, and
the Project-pane scrollbar track/thumb override. The focus accent and exact scrollbar colors are
semantic variables in the canonical global theme entry; no raw owner color, dark value, or toggle
was added. StyleX compiles the WebKit scrollbar pseudo-elements directly, so no declaration of
this owner remains intentionally in fallback. The shared max-720 `16px !important` text-input
primitive, direct project rows/stars, Project subtabs, Favorite/Recent History panes, and other
scrollbar consumers remain separate owners. Fresh live legacy and local evidence agree on the
42px input group, 114px four-row tab content, 50% focus bars, 5px light-gray scrollbar with the
legacy blue thumb, empty-state presentation, and desktop/390 containment. This is not Wave 1
completion.

The fifteenth verified slice closes the earlier authenticated Favorite search/list shell's
focus-bar and scrollbar fallback. The existing owner now directly compiles both bar
pseudo-elements, React-owned focused widths, and the Favorite result's WebKit scrollbar
track/thumb overrides. It reuses the canonical global focus, track, and thumb variables added by
the Project-shell slice, so no theme value, raw owner color, dark value, toggle, abstraction, or
new dependency was added. Legacy-class removal retains the complete group/input/bar/pseudo/result/
empty/scrollbar computed surface at both populated and empty states, proving that no declaration
of this Favorite owner remains intentionally in fallback. Fresh live legacy and local evidence
agree on 175px/195px focus halves and the 5×10px light-gray scrollbar with the legacy blue thumb.
The shared max-720 `16px !important` input primitive and global scrollbar thumb primitives remain
separate owners. This is not Wave 1 completion.

The sixteenth verified slice migrates only the authenticated Recent History pane's search and
list shell. Its colocated owner directly owns the group/input box, React focus bar and both
pseudo-elements, inner tab-content overflow, populated/empty pane display and list bounds,
empty-result presentation, and the WebKit scrollbar track/thumb override. All four concrete
colors reuse the canonical global focus, track, thumb, and no-result variables; no theme edit,
raw owner color, dark value, toggle, shared-style refactor, abstraction, or dependency was added.
Known legacy shell classes can be removed while the complete owned computed surface and relative
geometry remain unchanged, so this owner retains no intentional fallback declaration. Fresh live
legacy and local desktop/390 evidence agrees on the 350px/390px shell widths, 42px input group,
64px populated inner pane, 54px populated result, 175px/195px focus halves, 5x10px scrollbar, and
720px/675.2px scroll bounds. The live page's inherited 24px absolute-Y difference and mobile
397px document width belong to the existing outer shell/tab layout and were not numerically
compensated here. Recent issue rows, links, title typography, hover popover, the shared mobile
input primitive, and global scrollbar primitives remain separate owners. This is not Wave 1
completion.

The seventeenth verified slice migrates the authenticated Recent History issue rows and their
React-owned hover popover. StyleX owns the row/list/link flex and hover surface, marker/title
typography, and the complete visible popover placement, surface, border, shadow, arrow, and
content cascade. Every concrete color and the shadow use the canonical global theme entry; the
new issue-marker variable is cited to `_usermenu.less`, with no dark value or toggle. The legacy
`RecentIssue.getNumber()` copy contract is restored as `projectName #issueNumber`, while TanStack
Router continues to receive the raw issue number. The `.popover`, `.right`, `.arrow`, and
`.popover-content` classes remain DOM evidence only: removing them retains the complete owned
popover surface, so no migrated `.popover` declaration remains in fallback. Exactly two
`.issue-item` declarations remain unavoidable fallback because the frozen source marks
`display:block` and `padding-left:5px` as `!important`, which StyleX cannot represent. Fresh live
legacy and local desktop/390 evidence agrees on the 350px/390px row widths, 27px row height,
13px title, and 204×37.59375 right popover with exact arrow/content metrics. Other Bootstrap/Yobi
popover consumers and the non-authenticated left-sidebar inline popover remain separate owners.
This is not Wave 1 completion.

The eighteenth verified slice migrates the framed left sidebar's Recent History issue rows and
their React-owned hover popover. A distinct owner preserves the dark sidebar's white text and
translucent white hover while reusing the globally themed marker and full popover palette. StyleX
owns every visible popover declaration, including placement, surface, border, shadow, arrow, and
content; removing `.popover`, `.right`, `.arrow`, and `.popover-content` retains the complete
computed surface, so this owner has no `.popover` fallback. Exactly the frozen `.issue-item`
`display:block !important` and `padding-left:5px !important` declarations remain unavoidable.
Fresh live legacy and local desktop/390 evidence agrees on the 270×27 row and 204×37.59375
popover with its 280px left edge. Fresh English legacy evidence also proves that the desktop tab
wrap is locale-dependent parity rather than an outer-owner gap; the mobile framed-shell overflow
clipping remains separate evidence and is not compensated in this slice. This is not Wave 1
completion.

The nineteenth verified slice migrates only the framed left sidebar's Recent History search/list
shell. StyleX owns the group, black/white input surface, React focus-bar pseudos, tab-content,
populated and empty panes, list/overflow bounds, and 5×10px scrollbar. The new black search
surface and every reused text/focus/scrollbar/no-result color come from the canonical global
theme, with no dark value or toggle. Removing the known shell presentation classes retains the
complete owned computed surface and relative geometry, so this owner has no intentional fallback
declaration. The Bootstrap input padding and max-720 `font-size:16px !important` remain separate
shared input primitives rather than this shell's fallback. Fresh live legacy and local 1366/390
evidence agrees on the 270px shell, 42px input group, 64px populated inner pane, 54px list, 135px
focus halves, and scrollbar. English desktop copy wraps the refresh item and places the shell at
`y=105` in both legacy and React, while English mobile and shorter Korean desktop copy keep a
single row at `y=78`; no placement compensation is required. This is not Wave 1 completion.

The twentieth verified slice migrates the framed left sidebar's Favorite / Project / Recent
History tab strip and Refresh control. StyleX owns the 270px list reset and clearfix, four floated
items, three semantic tab buttons with active/hover/focus states, the max-720 horizontal padding,
and the Refresh button geometry and hover state. Every color comes from the canonical global
theme entry with no dark value or toggle. The migrated owner emits none of `nav`, `nav-tabs`,
`nm`, `active`, `myOrganizationList`, `myProjectList`, `myRecentIssueList`, `btn-transparent`, or
`refresh-button`; only `yobicon-refresh` remains as the separate global icon-font primitive.
Fresh English legacy/local evidence agrees exactly on the locale-dependent `270×61` desktop wrap
and `270×34` mobile single row, while Korean desktop copy also remains one row. This owner has no
intentional presentation fallback. This is not Wave 1 completion.

The twenty-first verified slice migrates the framed left sidebar's tab-panel state boundary.
StyleX owns the outer panel overflow, top-border suppression and lower radii, inner overflow, and
the three direct panes' hidden/active display states. The owner emits none of `tab-content`,
`tab-box`, `tab-pane`, or `active`; no migrated panel declaration remains fallback. Each pane
retains only `user-project-list` because unmigrated Favorite/Project descendant rules still use it
as a separate ancestor consumer. This slice has no color and therefore does not change the global
theme. Fresh English live legacy and local Recent-state evidence agrees exactly on `270×106` at
desktop `y=105` and mobile `y=78`, while live Favorite-state evidence preserves its inner list's
10px bottom-margin relationship rather than forcing the active pane to fill the panel height.
Before/after local screenshots are byte-identical at both viewports. This is not Wave 1
completion.

The twenty-second verified slice migrates the framed left sidebar's Favorite search/result shell.
StyleX owns the group, black/white input and focus state, React focus-bar pseudos, populated/empty
result reset and bounds, exact 5px scrollbar, and empty-result presentation. The owner emits none
of `search-result`, `group`, `search-input`, `org-search`, `bar`, `tab-pane`, `user-ul`, or
`no-result`. Two evidenced Favorite search colors are defined in the global theme boundary; no
dark value or toggle is introduced. Fresh English live legacy evidence pins the populated shell at
`270×79 @ y105` desktop and `y78` mobile, with a `279.296875×42` input border box and
`0px → 135px` focus halves. Populated/empty local owner-element screenshots are byte-identical
before and after at both viewports. The outer `user-project-list` remains only for unmigrated row
descendants, so its broad descendant scrollbar selector still matches temporarily; StyleX owns and
overrides the exact scrollbar values until those rows migrate and the ancestor can be removed.
Bootstrap input padding and the max-720 `16px !important` input rule remain separate shared
primitives. This is not Wave 1 completion.

The twenty-third verified slice migrates the framed left sidebar's shared direct-project rows in
both the Favorite pane and all four Project subtabs. StyleX owns the complete row/list/item flex
geometry and hover state, logo/avatar/image, name/owner typography and truncation, semantic link
states, and favorite star states. Every concrete color is defined at the canonical global theme
boundary with no dark value or toggle. The migrated owner emits none of `user-li`, `project-list`,
`project-flex-container`, `project-item`, `project-item-container`, `flex-item`, `site-logo`,
`project-avatar`, `logo`, `dummy-25px`, `projectName-owner`, `project-name`, `project-owner`,
`star-project`, `star`, `starred`, or `material-icons`; only `yobicon-lock yobicon-small` remains
as the separate private-project icon-font primitive. The legacy direct-project partial does not
render a popover, the React owner renders none, and no `.popover` fallback exists. The sole
temporarily unavoidable collision is the broader `.user-project-list li { margin-left: 0 }`,
whose ancestor remains for distinct unmigrated organization and nested-project rows; StyleX owns
the same value for this row. Fresh live/local desktop evidence agrees on the 270×26 row and exact
internal geometry. The twenty-fifth outer-shell slice below closes the former 390px placement and
width gap: live and local now both render the Project row at `y166/317.6875px`, without row-level
compensation. This is not Wave 1 completion.

The twenty-fourth verified slice migrates the framed left sidebar's Project subtab strip. StyleX
owns the complete wrap padding, list reset/surface, inline items, semantic-button reset,
typography inheritance, padding, and inactive/hover/focus/active states. Four evidenced colors are
defined at the canonical global theme boundary with no dark value or toggle. The owner emits none
of `subtab-wrap`, `subtab-group`, `nav-subtab`, `unstyled`, or `active`; React state and
`aria-pressed` own selection while the three Scala-template whitespace gaps remain real text
nodes. Fresh desktop evidence now agrees exactly on the `270×76 @ y147` wrap, `270×61 @ y157`
list, two-line item geometry, orange active state, and the direct-project row starting at `y223`.
At 390px the twenty-fifth outer-shell slice below now lets the sidebar naturally expand to
`317.6875px`, so live and local both produce the `317.6875×46` wrap and single-row list. This
subtab owner itself still adds no width or position compensation. The sole temporarily unavoidable lower-layer
collision is the outer `.user-project-list li { margin-left: 0 }`, retained for separate
unmigrated Project shell/list consumers and exactly re-owned by StyleX. The legacy subtab has no
popover and no `.popover` fallback exists. This is not Wave 1 completion.

The twenty-fifth verified slice migrates the framed left sidebar outer shell. StyleX owns the
exact content-box surface, text, right border, desktop sticky `270px` flex geometry, `100vh`
height, and max-720 absolute shrink-to-fit `width:auto` state. Three concrete colors use semantic
variables in the canonical global theme; no dark value or toggle is introduced. The aside emits
no `hide-in-mobile`; it retains `sidebar` only because distinct unmigrated account, tab, pane,
Favorite, and Recent descendants still consume frozen `.sidebar …` selectors. The two
owner-specific `app.css` bridges (`> #sidebar` and `.sidebar.hide-in-mobile`) are deleted rather
than retained as fallback. Mobile `z-index:1001` moves the existing React iframe-replacement
stacking contract into StyleX: the flattened later main pane otherwise paints its legacy
`z-index:1000` header over the absolute sidebar, which the real legacy iframe cannot do. Fresh
live/local evidence agrees on the desktop `271×900` border box and the mobile `318.6875×844`
border box with `317.6875px` content, one-line Project subtabs, row `y166`, full main-pane cover,
and no document overflow. This is not Wave 1 completion.

The twenty-sixth verified slice migrates the framed left sidebar account-action row. StyleX owns
the exact 10px row padding, border-box sizing, muted text, two 5px menu paddings, link hover,
logout text/weight/base surface, and violet hover surface. All five colors are semantic variables
in the canonical global theme; no dark value or toggle is introduced. The owner emits none of
`user-menu-wrap`, `user-menu`, or `logout`, and its three owner-only `app.css` selectors are
deleted. `row-fluid`, avatar/caret, the close pin, and Bootstrap `.label` remain distinct
primitive owners rather than account-row fallback. The screen contains no popover, and no
`.popover` fallback is claimed. Fresh live/local desktop and mobile evidence agrees on `270×44`
and `317.6875×44` row geometry, exact computed styles, hover states, action order, navigation,
and pin behavior. This is not Wave 1 completion.

The twenty-seventh verified slice migrates the framed left sidebar close pin. StyleX owns the
complete React-button translation of the legacy pin: absolute placement, content box, button
reset, 18px typography, 3px left radii, 24×26 geometry, icon padding, and base, actual-icon-hover,
and keyboard-focus states. Its blue, brown, and white colors are semantic variables in the
canonical global theme; no dark value or toggle is introduced. The button emits no
`pin-in-sidebar`, and all three owner-specific `app.css` blocks are deleted. Only
`yobicon-arrow-left` remains as the separate global glyph/font primitive, so no pin declaration
remains fallback. Frozen `_page.less` still contains immutable evidence but cannot match this
owner. No popover exists and no `.popover` fallback is claimed. Fresh live/local evidence agrees
on the desktop `24×26 @ 246,9` and mobile `24×26 @ 293.6875,9` boxes, exact base/hover colors,
close/reopen behavior, and screenshots. This is not Wave 1 completion.

The twenty-eighth verified slice migrates the framed left sidebar footer. StyleX owns its exact
absolute right/bottom anchors, muted text color, and heart color/middle alignment. Both concrete
colors use semantic variables in the canonical global theme; no dark value or toggle is
introduced. The owner emits no `sidebar-bottom`, and both owner-specific `app.css` blocks are
deleted. Only `yobicon-hearts` remains as the separate global glyph/font primitive. Fresh
live/local desktop and mobile evidence agrees on the `16px` sidebar-right gap, `8px` viewport-bottom
gap, 20px line box, and 13×13 heart. The approved `Yoram` product copy is naturally wider than
legacy `Yona`, so no width or left-position compensation is added. Favorite and Project hide the
footer while Recent History shows it through existing React state. This is not Wave 1 completion.

The twenty-ninth verified slice migrates the framed left Favorite organization header rows and
their organization-favorite stars. StyleX owns the exact row spacing and width, header flex and
hover state, semantic toggle reset, logo/name/count geometry and typography, placeholder, and
complete idle/active/hover star presentation. All seven concrete colors use semantic variables in
the canonical global theme; no dark value or toggle is introduced. The owner emits none of the
legacy organization, flex, name/count, star, or Material Icons presentation classes; only the
`yobicon-angle-right` glyph remains as a separate icon-font primitive. The nested `project-ul` and
its project rows are a separate downstream owner. Shared `app.css` organization/star selectors
remain only because the authenticated right sidenav and other unmigrated consumers still render
their matching classes; they cannot match this left owner and are not its fallback. Fresh live and
local desktop/mobile evidence agrees on 270x25 rows, 3px/8px row margins, exact internal geometry,
colors, hover, expand/collapse, and favorite mutation isolation. This is not Wave 1 completion.

The thirtieth verified slice migrates the framed left Favorite organization-nested project rows,
their project-favorite stars, and their React-owned hover overlay. StyleX owns the complete row,
visibility, flex/link/logo/avatar/name, star, overlay, arrow, and content declarations with exact
legacy values. Ten concrete colors and the semantic shadow are defined through the canonical
global theme, including the newly exposed direct-favorite divider border; no dark values or toggle
are introduced. The owner emits none of its former row, layout, link, star, Material Icons, or
overlay presentation classes and no inline placement style. With the last Favorite descendant
consumer migrated, the Favorite pane also drops `user-project-list`; Project, Recent History, and
the authenticated right sidenav retain it for their real consumers. The former 1px
`.etc-favorites` border is now owned directly by the Favorite shell, preserving its exact geometry
without compensation. Fresh live/local evidence agrees on desktop/mobile 270x26 rows and the exact
204px hover overlay, star states, filtering, navigation, and mutation isolation. This is not Wave 1
completion.

The thirty-first verified slice migrates the framed left Project search/list shell. StyleX owns
the group, black/white search input and focus state, focus-bar pseudo-elements, tab-content
overflow, four pane display/list/scroll declarations, empty result, and WebKit scrollbar
overrides. The two newly exposed search colors are semantic variables in the canonical global
theme, while the existing semantic focus, empty-result, track, and thumb variables are reused; no
dark value or toggle is introduced. The owner emits none of `search-result`, `tab-pane`,
`myproject-list-wrap`, `group`, `search-input`, `project-search`, `bar`, `tab-content`, `user-ul`,
`active`, or `no-result`. With the last Project descendant consumer migrated, the left Project
pane also drops `user-project-list`; left Recent History and the authenticated right sidenav
retain it for their actual consumers. The max-720 global text-input rule and global scrollbar
thumb primitives remain separate shared owners, not fallback declarations for this shell. Fresh
Edge/en-US live legacy and local evidence agrees on desktop `270×232` and mobile
`317.6875×202` shells, exact focus/empty states, four subtab transitions, filtering, scrollbar
styles, and no viewport overflow. This is not Wave 1 completion.

The thirty-second verified slice migrates the framed left account row's profile identity. StyleX
owns the 20px avatar box, avatar image sizing/alignment, and desktop-inline/max-720-hidden user
label. The avatar surface is an evidenced semantic variable in the canonical global theme; no dark
value or toggle is introduced. The owner emits none of `avatar-wrap`, `smaller`, `caret-text`, or
`hide-in-mobile`, while preserving the Scala template's two inline whitespace nodes and the
existing TanStack profile navigation. The shared avatar and responsive classes remain globally
active only for their many actual consumers elsewhere and are not fallback for this owner.
Fresh Edge/en-US legacy and local owner evidence agrees on the desktop `92.109375×16` link,
20×20 avatar/image, `64.921875×16` label, and the mobile `23.59375×16` avatar-only link with no
viewport overflow. A separate pre-existing account-row skeleton gap remains: legacy whitespace
places Log out `3.59375px` after the Account span, while the current adjacent account-actions owner
does not emit that text node. This slice does not compensate across owner boundaries; restoring
that exact Scala sibling whitespace is the next account-actions follow-up. This is not Wave 1
completion.

The thirty-third verified slice completes the framed left account row's remaining Bootstrap
primitive ownership and restores its exact Scala sibling whitespace. StyleX now owns the
`row-fluid` width and zero-size clearfix pseudos plus the logout label's rendered display,
typography, no-wrap, baseline alignment, text shadow, and final one-pixel radius. The shadow is an
evidenced semantic variable in the canonical global theme; no dark value or toggle is introduced.
The runtime owner emits neither `row-fluid` nor `label`, while those global Bootstrap rules remain
active only for actual consumers elsewhere. An explicit whitespace text node between the Account
span and Log out link restores the legacy `3.59375px` inline gap without CSS compensation. Fresh
Edge/en-US legacy and local evidence agrees on the desktop `270×44` and mobile `317.6875×44`
rows, exact Account/Log out/label geometry, clearfix pseudos, label paint, hover/navigation/pin
behavior, and no viewport overflow. No declaration owned by this account row remains fallback.
This is not Wave 1 completion.

The thirty-fourth verified slice completes the authenticated right sidenav account row after a
fresh Edge/en-US live-legacy comparison superseded its earlier source-only bridge assumptions.
The rendered legacy row has no ten-pixel padding or muted row color: it is a 100%-wide,
content-box, right-aligned 21px row with Bootstrap's zero-size clearfix pseudos. StyleX now owns
that row primitive, the 12px menu spacing, and the complete logout label surface, one-pixel
radius, white text, normal weight, 14px line height, no-wrap, baseline, semantic text shadow, and
violet hover. The label surface/text/shadow values are semantic variables in the canonical global
theme; no dark value or toggle is introduced. The runtime owner emits none of `row-fluid`,
`user-menu-wrap`, `user-menu`, `logout`, or `label`, and two explicit whitespace nodes preserve
the Scala template's exact inline gaps. Fresh live/local metrics agree on desktop `350×21` and
mobile `390×21` rows and every relative action position and computed declaration. No declaration
owned by this account row remains fallback; the same global selectors remain active only for
anonymous and other actual consumers. The local top-menu button bridge still paints above part of
the open sidenav because of its separate non-legacy stacking declarations; that independent owner
is the next follow-up and receives no compensation here. This is not Wave 1 completion.

The thirty-fifth verified slice completes the two authenticated top-right menu button primitives.
StyleX now owns the native-button reset (`transparent` background, zero border, inherited color
and font, pointer cursor) together with the already colocated display, line height, transition,
hover/focus, caret, and create-action surface. The transparent value reuses the canonical global
theme; no new raw color, dark value, or toggle is introduced. Both buttons drop
`gnb-dropdown-toggle`, and the create button also drops `dropdwon-box-btn`; two explicit whitespace
nodes restore the exact Scala sibling spacing before each caret. Their dead React-only `app.css`
button-padding and toggle/caret/create bridge blocks are deleted. This also removes the non-legacy
`position: relative`/`z-index: 1000` bridge, restoring the live legacy `static`/`auto` stacking
behavior without compensation. Fresh Edge/en-US live/local evidence agrees at both viewports on
the `243.5625×40` owner, the `56.796875×30` avatar toggle at relative `125.96875,5`, the
`50.796875×30` create toggle at relative `192.765625,5`, both whitespace nodes, exact reset and
paint declarations, and route-local interactions. No declaration owned by either button remains
fallback. The dropdown-container class remains only for its actual container/menu consumers. The
separate authenticated sidenav admin-affix top placement remains the next shell-state owner; this
slice adds no vertical offset. This is not Wave 1 completion.

The thirty-sixth verified slice completes the authenticated HOME site-admin sidenav top state.
Legacy `_usermenu.less` supplies the shared `40px` base while
`index/notifications.scala.html` moves only the HOME site-admin state to `84px` when the admin
affix is present. Both values now come from semantic variables in the canonical global StyleX
theme; no route-local raw value, dark value, or toggle is introduced. `HomeScreen` alone opts into
the state, and `SiteLayoutShell` additionally requires its existing site-admin affix condition,
so non-admin HOME and shared callers such as `/projects` retain the `40px` base. Fresh Edge/en-US
live/local evidence agrees at 1366×900 on the affix `1366×43 @ 0,0`, header `1366×40 @ 0,43`,
closed sidenav `x1366/y84/w0`, and open sidenav `x1004/y84/w362`; at 390×844 it agrees on the
affix `390×66 @ 0,0`, header `390×40 @ 0,66`, closed sidenav `x390/y84/w0`, and open sidenav
`x-2/y84/w392`, including the intentional legacy mobile overlap. Removing the StyleX owner state
returns `top` and `y` from `84px` to the immutable legacy `40px` base, while x/width and the other
shell declarations remain unchanged. The existing lower rule is deletion evidence, not a
fallback for the `84px` state; no new fallback or numeric compensation was added. This is not
Wave 1 completion.

The thirty-seventh verified slice migrates the visible site-admin affix surface rendered by
`SiteLayoutShell`. StyleX now owns the exact `_page.less` z-index, box model, desktop width,
padding, white text, 20px/700 centered typography, and `#ad0000` surface; it also owns the
`_common.less` 10px/400 detail text and the max-720 `_responsive.less` `width:auto` state. Every
concrete paint and numeric value is defined in the canonical global theme, with no dark values or
toggle. The React owner drops the presentation-only `admin-logged-in-affix` and `small-font`
classes, so the frozen responsive `!important` rule cannot continue to win and no declaration of
this surface remains fallback. The duplicate React `app.css` bridge is deleted; frozen legacy
sources remain unchanged and cannot match the owner. Fresh Edge/en-US live/local evidence agrees
on the desktop `1366×43 @ 0,0` surface and header at `y43`, and the mobile `390×66 @ 0,0` wrapped
surface and header at `y66`, including exact paint and child typography. Removing both StyleX
classes exposes an unstyled transparent, zero-padding element, proving actual ownership rather
than an equal lower rule. The exact-DOM canonicalizer now ignores generated StyleX classes as the
migration policy requires and narrowly normalizes only the affix classes retired here plus the
already-ledgered authenticated account-action classes retired in slice thirty-four; visible DOM,
copy, links, order, and other attributes remain compared. This is not Wave 1 completion.

The thirty-eighth verified slice migrates the global GNB Sidebar open pin rendered by
`SiteLayoutShell`. The Scala navbar and `_page.less` remain the DOM and declaration source:
StyleX now owns the semantic button reset, absolute/content-box placement, right-side radius,
surface/text paint, 18px root typography with the inherited 20px line height, both arrow display
states, icon padding, pointer hover, white icon hover, and keyboard-focus state. Every concrete
paint and numeric value is defined in the canonical global theme. Fresh Edge legacy and local
evidence agrees at both 1366×900 and 390×844 on the `25×26 @ -6,6` pin and visible
`23×26 @ -5,6` right arrow; source-authored `inline-block` blockifies to the same computed
`block`, and the element screenshots are visually identical. The owner drops `.pin`, so removing
its generated StyleX classes exposes a static, unpainted button and proves that no declaration for
this owner comes from fallback. The shared React `.pin` bridge remains only because
`frontend/src/routes/restricted.tsx` is a separate active legacy consumer; its focused test keeps
that class contract. The unused React `.pin-move-*` duplicates are deleted. Existing runtime
locators and exact-DOM canonicalizers move narrowly to the stable owner while preserving the
legacy fixture class and all other DOM comparison. This is not Wave 1 completion.

The thirty-ninth verified style-ownership slice migrates the separate GNB Sidebar pin rendered by
`RestrictedScreen`. The route preserves `restricted.scala.html` through `siteLayout.scala.html` and
the common navbar's DIV/two-arrow/title order, while colocated StyleX takes the complete `_page.less`
pin presentation. It reuses the existing canonical `globalSidebarOpenPin*` variables, introduces no
route token or dark value, removes the plugin-only placement attribute and presentation class, and
narrows exact-DOM normalization to this owner boundary. Desktop 1366×900 and mobile 390×844 local
evidence match the fresh live common-navbar component at `25×26 @ -6,6`, including arrow geometry,
paint, typography, padding, and actual-icon hover; both owner crops are byte-identical. Runtime
`.pin` consumers are now zero, so the
entire 42-line React bridge is deleted; removing StyleX classes exposes unstyled output and proves
that no fallback remains. Focused/full restricted E2E passes 12/12, StyleX foundation 3/3, and the
typecheck plus production build/verifier are green. The standalone route's pre-existing inert click
behavior remains a recorded functional parity gap until a real shared React sidebar boundary exists;
no route-local navigation architecture is invented in this styling slice. This is not Wave 1
completion.

The fortieth verified slice migrates the `SiteLayoutShell` GNB brand link. The common navbar's
first `Y` anchor remains a TanStack `Link` in the same sibling position, while colocated StyleX
owns the complete shared anchor, `.logo`, and `.logo-letter` presentation: surface/text paint,
padding, 14px/700 typography, 40px line box, radius, opacity, transition, hover/focus, both
pseudo-elements, max-720 after-margin state, and project-header pseudo suppression. All concrete
paint and numeric values are canonical global theme variables, with the existing white accent
text reused and no dark value or toggle. The owner drops `logo` and `logo-letter`; the same rules
remain only for the separate `/restricted` consumer, while `.gnb-nav a` remains a justified shared
lower rule for real sibling links. Fresh Edge HOME desktop/mobile base crops are byte-identical to
local, and HOME/project-header computed geometry, paint, interaction, responsive, pseudo, and SPA
navigation checks pass. Focused RED 5/5 becomes GREEN 6/6. The broad global-shell cases retain
their independent missing site-intro asset response and shared mobile-nav width drift after the
focused owner assertions pass. This is not Wave 1 completion.

The forty-first verified slice migrates the conditional `SiteLayoutShell` GNB List All item and
link. The Scala item/link/order and PROJECTS active state remain intact, while colocated StyleX
owns the complete item position, anchor paint/box/transition/hover/focus, and active triangle.
Existing global muted/white colors and GNB dimensions are reused; only the five frozen triangle
measurements are added to the canonical global theme. The owner drops the presentation `active`
class and legacy progress-bar hook because React and TanStack Router own state and navigation.
Fresh authenticated Edge live/local HOME, projects, and organizations checks agree at 1366×900
and 390×844 on the exact `63.015625×37` box, interaction paint, and 8px active triangle; focused
RED becomes GREEN 8/8. Generic GNB item/link rules remain only for real sibling consumers, and the
divider is unchanged as a separate owner. This is not Wave 1 completion.

The forty-second verified slice migrates the conditional GNB divider immediately after List All.
The empty Scala `li`, condition, and sibling order remain exact, while colocated StyleX owns its
float/position, transparent auto box, 12px/40px typography, and complete muted `|` pseudo-element
at opacity 0.35. Existing canonical transparent, muted-text, and 40px variables are reused; only
the evidenced divider font size and opacity are added to the global theme. The owner drops the
presentation `divider` class, reducing runtime `.gnb-nav .divider` consumers to zero and deleting
the corresponding seven-line React bridge. The separate `.gnb-usermenu .divider` rules remain for
three real user-menu consumers. Fresh Edge HOME/projects desktop and mobile measurements agree
with local on the exact `3.109375×40` owner and pseudo paint; focused RED 8/10 becomes GREEN
10/10. This is not Wave 1 completion.

The forty-third verified slice migrates the configured `SiteLayoutShell` GNB Feedback item and
external link. The Scala `li > a` skeleton, condition, sibling order, configured URL, and `_blank`
behavior remain intact, while colocated StyleX owns item float/position and the link's muted
paint, inline box, 40px line height, 10px padding, decoration, transition, and settled white
hover/focus. Every new concrete value is defined in the canonical global theme, reusing existing
GNB dimensions and semantic colors without a dark value or numeric compensation. No dedicated
Feedback fallback existed; generic `.gnb-nav` rules remain only for the following search owner
and other real route-shell consumers. Fresh Edge evidence fixes the legacy desktop/mobile
declarations and 37px link height. Local HOME/projects/organizations preserve those styles;
their existing approved `Yoram repository` identity copy has a different natural width than
legacy `Feedback`, which remains an intentional copy deviation rather than a styling offset.
Actual RED 9/10 becomes focused GREEN 10/10. This is not Wave 1 completion.

The forty-fourth verified slice migrates only the outer GNB search `li` and form shared by HOME,
project, and organization states. The legacy form action/name, hidden input, child order, scoped
menu behavior, and GET payload remain exact, while colocated StyleX owns the item positioning and
form box, spacing, typography, nowrap, and alignment through canonical global theme variables.
The seven-line base `.gnb-search-form` React bridge is deleted. Its runtime class remains narrowly
required by the frozen max-720 `display:none!important` rule and unmigrated inner descendants;
`input-prepend` likewise remains for active Bootstrap inner-control selectors. Fresh Edge and local
evidence agrees on HOME `112×30`, project `231.625×30`, and attached-but-hidden mobile forms across
HOME/project/organization. Actual RED 9/10 becomes focused GREEN 10/10, with Feedback regression
10/10. This is not Wave 1 completion.

The forty-fifth verified slice migrates the complete scoped-search selector inside that form:
wrapper, toggle, open/closed menu, items, buttons, caret, and arrows. The project/group/all copy,
order, form-action changes, blur behavior, and template whitespace before the caret remain exact,
while React state/events and stable owner/ARIA boundaries replace Bootstrap's runtime open/class
contract. Canonical global theme variables own every concrete value and preserve the live project
`119.625×30` toggle, `162×80` menu, 32/28/32 three-item geometry, exact asymmetric padding and
interaction paint; the organization state preserves its `162×46` single-item menu. Runtime
`btn-group open ybtn dropdown-toggle dropdown-menu flat right` classes and the 30-line scoped
React bridge are removed. Generic dropdown fallback remains for other actual consumers, while
outer `gnb-search-form`/`input-prepend` remain only for responsive hiding and unmigrated inner
controls. Actual RED 6/7 becomes focused plus outer GREEN 17/17. The next safe owner is the inner
`.search-box.select`, followed by its input and submit controls. This is not Wave 1 completion.

The forty-sixth verified slice migrates only the inner GNB search-box wrapper. The HOME/scoped
wrapper skeleton, input/button order, focus expansion, and GET behavior remain intact, while
colocated StyleX owns the exact inline box, 30px height, middle alignment, content-box reset,
white surface, zero border, 3px radius, and scoped left-radius reset through canonical global
theme variables. Runtime `select` and the 13-line wrapper bridge are removed. `search-box` remains
narrowly required by still-active frozen/app input and button descendant selectors; those controls
are later owners, beginning with the text input. Fresh Edge/local HOME and project evidence agrees
on the `92×30` base wrapper and project focus expansion to `242×30`, with no numeric compensation.
Actual RED 8/1 becomes focused GREEN 9/9 and final affected search/project-review GREEN 33/33.
This is not Wave 1 completion.

The forty-seventh verified slice migrates only the global GNB keyword text input. Its exact
attributes, wrapper order, focus expansion, and GET payload remain unchanged, while colocated
StyleX owns the evidenced 50→200px content width, 20px height, box model, Helvetica typography,
paint, radius, outline/shadow reset, relative focus stacking, 0.3s transition, and 250px focus cap
through canonical global theme variables. The 17-line input bridge and the SiteLayoutShell-only
`input-prepend` class are removed; Bootstrap retains that selector for the separate `/restricted`
consumer. `gnb-search-form` and `search-box` remain only for mobile hiding and the unmigrated
submit-button descendant. Frozen generic input rules still supply the unavoidable max-720
`font-size:16px!important` and focus border-color `!important`; no new important override is added.
Fresh Edge/local computed styles and 70→220px geometry agree, while the known upstream GNB width
drift changes absolute x independently of this owner and receives no compensation. Actual RED 7/8
becomes focused-plus-adjacent GREEN 34/34. The next safe owner is the submit button and icon. This
is not Wave 1 completion.

The forty-eighth verified slice migrates the global GNB search submit button while preserving the
exact `button > i.yobicon-search` skeleton, child order, GET payload, and interaction behavior.
Colocated StyleX owns the evidenced transparent `12×20` button, 5px margin, zero padding/border/
outline, black paint, shadow reset, 12px/400/20px typography, pointer, native button appearance,
border-box, centered text, and middle alignment through canonical global theme variables. The
12-line React button bridge and SiteLayoutShell-only `search-box` class are removed. Frozen
`.search-box*` selectors remain only for the separate `/restricted` consumer; `gnb-search-form`
remains for max-720 hiding. Yobicon stays as the actual global font/glyph primitive rather than a
button fallback because its `@font-face`, shared icon declarations, and `.yobicon-search::before`
generate the visible glyph across many owners. Fresh Edge/local HOME/project button and icon
geometry and paint agree without compensation. Actual RED 1/9 becomes submit GREEN 9/9 and final
focused-plus-adjacent test bodies GREEN 43/43. This is not Wave 1 completion.

The forty-ninth verified slice migrates the global `SiteLayoutShell` GNB navigation list and its
first brand item while preserving the exact `ul > li` skeleton, conditional children, links,
search behavior, and sibling order. Colocated StyleX owns the Bootstrap list reset, left float,
15px leading margin, muted 14px/400/20px typography, content-box model, and first-item
float/relative positioning through canonical global theme variables. The list drops its runtime
`gnb-nav` class, while the generic frozen/React fallback remains for the four actual restricted,
secret, reset-password-alias, and public-profile route consumers. Fresh legacy/local HOME and
project desktop/mobile declarations and relative geometry agree; local organization coverage
confirms the same owner boundary without overflow. Focused GREEN is 8/8 and the `/restricted`
fallback regression is 8/8. Thirty-one E2E files move seventy positive runtime locators, while
thirty-nine full-shell canonicalizers remove only the retired token at the exact SiteLayout nav
boundary without changing legacy fixtures. Typecheck, foundation, production build/StyleX
verification, unchanged generated fallback hash, format, lint, diff, and visual gates pass. This is
not Wave 1 completion.

The fiftieth verified slice migrates the `SiteLayoutShell` GNB inner wrapper while preserving the
exact header/inner nesting and all already-owned child order and behavior. Colocated StyleX owns
the live-legacy 98% width, 40px height, `0 auto` centering, `#788ba7` inherited text color, and
content-box model through canonical global theme variables. Fresh legacy evidence showed that the
React bridge's border-box and clearfix pseudo do not exist in legacy and do not affect measured
geometry, so the SiteLayout owner deliberately returns to content-box with no pseudo instead of
copying that bridge. The runtime `gnb-inner` class is removed only from SiteLayout; generic root,
descendant, responsive, and clearfix fallback stays for the four independent route consumers.
HOME/project desktop and mobile geometry agrees exactly, organization fixtures preserve the same
width formula and containment, and focused plus `/restricted` fallback tests pass 17/17. Fourteen
runtime locators, one actual closest check, and thirty-nine existing local full-shell canonicalizer
pairs move to the stable owner without changing legacy fixtures. Typecheck, foundation, production
build/StyleX verification, frozen and unchanged fallback hashes, lint, format, diff, and visual
gates pass. This is not Wave 1 completion.

The fifty-first verified slice migrates the `SiteLayoutShell` GNB outer header while preserving
the exact `header > inner` skeleton and every owned child, route, interaction, and order. Colocated
StyleX owns the legacy 40px border-box, dark surface, 10px inline padding, max-720 10px minimum
width, and project/organization absolute full-width translucent state through canonical global
theme variables. The owner deliberately adds neither a text color that legacy does not declare
nor the React-only max-900 minimum-width expansion. SiteLayout drops `gnb-outer` and
`project-header`; the zero-consumer project bridge and logo-pseudo branches are deleted, while the
generic fallback stays for five independent route consumers. Focused outer GREEN is 9/9, the
outer/inner/brand set is 24/24, and adjacent nav is 8/8 across HOME/project/organization desktop
and mobile states. Eighty-three existing E2E files move actual locators, class assertions, and full-shell
canonicalizers to the stable owner without changing legacy fixtures. Typecheck, foundation,
production build/StyleX verification, frozen and generated fallback hashes, format, diff, and
visual gates pass. The independent `/restricted` run still has four whole-route rendering failures
after its four source guards pass, so it is not claimed as a green browser fallback gate. This is
not Wave 1 completion.

The fifty-second verified slice migrates the `SiteLayoutShell` footer while preserving the exact
`footer > div > span` skeleton and the currently approved visible copy. Colocated StyleX owns the
final frozen cascade: white content-box surface, 10px all-side padding, max-720 10px minimum width,
100% centered inner line box, and the provider's Verdana 9px typography, 4px leading margin, and
`#333` text through canonical global theme variables. SiteLayout drops its three presentation
classes. Six independent route files still render seven generic footer nodes, so their fallback
rules remain; only the now-zero-consumer provider-link React bridge is deleted. Focused RED then
GREEN is 5/5, and the UI-kit mobile fallback geometry test passes. Forty-six E2E files move only
actual SiteLayout footer selectors and paired exact-DOM canonicalizers to stable owners without
changing legacy fixtures. Typecheck, foundation, production build/StyleX verification, frozen and
generated fallback hashes, format, diff, and fresh live/local visual gates pass. Broader runs stop
on existing route, fixture, or approved-copy differences before or outside this owner and are not
claimed green. This is not Wave 1 completion.

The fifty-third verified slice migrates the outer `SiteLayoutShell` framed wrapper and its direct
main pane, the React SPA boundary that replaces `layout_framed.scala.html`'s body/sidebar/iframe
composition. Colocated StyleX owns the current evidence-backed base widths and white main surface,
desktop open flex/viewport/overflow behavior, flexible auto-width scrolling main, and max-720
relative/block/full-width state through canonical global theme variables. Runtime
`legacy-framed-shell`, `is-open`, and `legacy-framed-main` presentation classes and their shell/main
`app.css` blocks are removed. Only a stable-owner `body:has(...)` scroll-lock bridge remains because
colocated component StyleX cannot target the document body and the open state actively consumes it.
Fresh authenticated live evidence fixes the desktop main at `1095×900 @ x271` and the mobile main
at `390×844 @ x0`; local owners reproduce both boundaries without horizontal overflow. The same
fresh mobile capture shows legacy sidebar width 271px versus the already-migrated flattened React
sidebar's 318.6875px, correcting older evidence and leaving that separate upstream owner gap
uncompensated here. Source RED becomes focused GREEN 5/5, combined main/sidebar owner verification
is 8/8, and the affected authenticated geometry case is 1/1. Typecheck, scoped lint/format, frozen
and manifest hashes, live/local screenshots, isolation, interaction, and diff gates pass. This is
not Wave 1 completion.

The fifty-fourth verified slice migrates only the authenticated HOME `page-wrap-outer > page-wrap`
pair rendered by `HomeScreen`. Colocated StyleX owns the frozen 450px minimum height, 10px top
margin, full-width border box, desktop/intermediate 10px horizontal inset, max-720 zero inset and
10px minimum width, plus the centered white content-box inner surface. Every concrete value and the
shared 720px media boundary comes from canonical global `frontend/src/theme.stylex.ts`. The two
runtime presentation classes are removed from this owner; generic fallback remains unchanged for
96 outer-class and 10 exact inner-class consumers elsewhere. Focused HOME verification passes 5/5
at 1366, 800, and 600px, including computed geometry, class isolation, DOM order, intro interaction,
and screenshots. Typecheck, production build/StyleX verification, unchanged generated fallback
hash, and diff gates pass. This is not Wave 1 completion.

The fifty-fifth verified slice migrates the authenticated HOME intro guide and its sibling toggle
as one React-owned interaction surface. Colocated StyleX owns the visible/hidden margins and
display, heading typography, welcome-table border/cell/link declarations, and toggle/button/icon
presentation through canonical global theme variables and the shared `globalBreakpoints.mobile`
constant. The implementation follows the frozen cascade's `#95a5a6` toggle color rather than the
stale `#999` React bridge. Runtime `site-guide-outer`, `hide`, `welcome-table`, `guide-toggle`, and
the declaration-free `borderless` token are removed, allowing 56 owner-only `app.css` lines to be
deleted. Bootstrap `table`, Yobi `ybtn ybtn-success`, common `btn-transparent`, and the Yobicon
glyph remain because they still provide shared primitive declarations. Focused RED 5/5 becomes
GREEN 5/5, combined intro/page-wrap verification is 10/10 at desktop and 390px, and visible/hidden
localStorage persistence, computed paint, screenshots, class isolation, typecheck, production
build/StyleX verification, manifest/app.css hashes, format, lint, and diff gates pass. This is not
Wave 1 completion.

The fifty-sixth verified slice migrates the authenticated HOME outer content grid: the page
surface, fluid-row clearfix, 8/4 main-and-rail columns, gutter, and max-720 responsive state.
Colocated StyleX reproduces Bootstrap 2.3.1's `65.95744680851064%` and
`31.914893617021278%` columns with the `2.127659574468085%` gutter through canonical global theme
variables. It removes the stale React-only max-900 `main-stream` full-width bridge, restoring the
legacy two-column layout at 800px; mobile keeps the frozen rail cascade of the span percentage plus
`min-width: 95%` without compensation. Runtime `page`, `on-fold-intro`, `row-fluid`, `span8`,
`span4`, `index-menu`, `right-menu`, and `span-hard-wrap` tokens are retired. Only
`content-container` and `main-stream` remain because notification descendants still actively
consume that ancestry. Focused RED 1/1 becomes GREEN 6/6, and the content-grid/page-wrap/intro
matrix passes 16/16 at 1366, 800, and 390px. Computed geometry, clearfix pseudos, screenshots,
fallback ancestry mutation, class isolation, typecheck, production build/StyleX verification,
manifest/app.css hash agreement, unchanged generated fallback hash, and diff gates pass. This is
not Wave 1 completion.

The fifty-seventh verified slice migrates the authenticated HOME series-tab row rendered from
`common/mySeriesMenuTab.scala.html`. Colocated StyleX owns the list reset and bottom border,
clearfix pseudos, four floated items, 8px/30px links, active/inactive/hover/focus paint, and the
max-720 5px inline padding through canonical global theme variables. Runtime `nav`, `nav-tabs`, and
`active` presentation tokens are removed, and the existing fourth-item relative positioning moves
from inline style into the same React-owned boundary. Exact copy/order/hrefs and the direct
`/notifications` action behavior remain unchanged. TanStack's hardcoded active attributes are
prevented by a URL-neutral undefined search mismatch; focused evidence pins the exact
`/yona/notifications` href with no query and no generated active marker. Generic tab fallback is
unchanged for 56 remaining route TSX consumers. Focused RED 1/1 becomes GREEN 7/7, and the
series-tabs/content-grid/page-wrap/intro matrix passes 23/23 at 1366, 800, and 390px. Computed
geometry, active/inactive interactions, screenshots, class isolation, typecheck, production
build/StyleX verification, unchanged app.css/manifest and generated fallback hashes, and diff
gates pass. This is not Wave 1 completion.

The fifty-eighth verified slice migrates the authenticated HOME notification list container and
its zero-result warning rendered from `index/notifications.scala.html` and
`partial_notifications.scala.html`. Colocated StyleX owns the Bootstrap list reset and frozen
`_page.less` warning padding, white text, 16px centered type, `#8b8b8b` surface, zero border, and
6px radius through canonical global theme variables. Runtime `notification-wrap`, `unstyled`, and
`warning-none` presentation tokens are removed only from this owner, and the now-zero-consumer
ten-line nested warning bridge is deleted from `app.css`; the exact `ul > div` output skeleton,
copy, and `yobicon-danger` primitive remain. `activity-streams` stays because populated frozen
descendants still consume it, proven non-vacuously by an `info` icon color mutation when the
ancestry is removed and restored. An authenticated live empty fragment provides 1366, 800, and
390px geometry/paint evidence without modifying account data. Focused RED 2/5 becomes GREEN 5/5,
and the notification/content-grid/series-tabs/page-wrap/intro matrix passes 27/27. Screenshots,
class isolation, global-theme ownership, typecheck, production build/StyleX verification,
manifest/app.css hash agreement, unchanged generated fallback hash, lint/format, and diff gates
pass. This is not Wave 1 completion.

The fifty-ninth verified slice migrates the populated authenticated HOME notification row family
rendered from `index/partial_notifications.scala.html` at `/` and `/notifications`. Colocated
StyleX owns the row, event/status type, title, message collapse, More indicator, avatar spacing,
author, and timestamp declarations through canonical variables in `frontend/src/theme.stylex.ts`.
The missing legacy `ISSUE_BODY_CHANGED`/`COMMENT_UPDATED` `Edit` badge branch is restored with
React rendering, while React state retains message expansion and TanStack Router retains links.
Runtime row presentation tokens and the now-zero-consumer 94-line `app.css` bridge are removed;
only shared avatar and Yobicon primitives remain. With the last populated descendant migrated,
the HOME grid/list also retires `content-container`, `main-stream`, and `activity-streams` without
removing their generic fallback for other consumers. Fresh live seeded desktop/mobile evidence
pins paint, cascade order, wrapping, expansion, pagination, and geometry; no compensation is added
for the separately recorded surrounding-shell width/y drift or the existing 1px local Yobicon
line-box difference. Focused verification passes 5/5, the combined affected HOME matrix passes,
and typecheck, production build/StyleX verification, screenshots, lint/format, manifest agreement,
unchanged generated fallback hash, and diff gates pass. This is not Wave 1 completion.

The sixtieth verified slice migrates the authenticated HOME notification pagination button
rendered from `index/partial_notifications.scala.html` in the full `/` and `/notifications`
screens and the singular `/notification` fragment. Colocated StyleX owns only the frozen
`#notification-more` 20px top margin and 95% width plus the existing React button content-box
parity bridge, with every value supplied by canonical global theme variables. The exact
`li > button#notification-more.ybtn`, `More` copy, TanStack Query append behavior, and URL
continuity remain unchanged, while the owned inline style is removed. The shared `ybtn` primitive
continues to supply padding, border, typography, base paint, and hover/focus paint for this and
other real consumers. Fresh live and local desktop/mobile screenshots agree on paint, 50px row,
20px offset, and 30px button height; no compensation is added for the already-recorded HOME list
width/y drift. Focused RED 6/6 becomes GREEN 6/6, the affected notification matrix passes 23/23,
and Vitest 11/11, typecheck, production build/StyleX verification, unchanged app/fallback hashes,
lint/format, visual inspection, and diff gates pass. This is not Wave 1 completion.

The sixty-first verified slice migrates the authenticated HOME default-login-page action and its
hover/focus guidance surface rendered from `common/mySeriesMenuTab.scala.html` on
`/notifications`. Colocated StyleX owns the complete button base/hover/focus/mobile-hidden state
and the React-rendered bottom guidance box, title, content, and arrow through canonical global
theme variables. Runtime `ybtn`, `hide-in-mobile`, `popover`, `bottom`, `arrow`, `popover-title`,
and `popover-content` presentation tokens plus the inline positioning bridge are removed from
this owner; shared fallback remains active only for other real consumers. Bootstrap's plugin
temporarily places the tip before reading `offsetWidth`; React translates that visible generated
behavior with intrinsic `max-content` sizing capped by the frozen `276px` maximum, not a fixed
width or numeric compensation. Fresh live desktop evidence and local screenshots agree on the
30px button, 280px guidance border box, 35px title, 49.2px content, arrow geometry, and paint.
The local owner is uniformly 1px above live because of an already-upstream HOME shell baseline,
while its internal and relative geometry is exact; mobile keeps the button in the DOM at zero
geometry. Focused RED 5/5 becomes GREEN 5/5, adjacent series-tabs passes 7/7, and typecheck,
production build/StyleX verification, unchanged app/fallback hashes, lint/format, visual
inspection, and diff gates pass. This is not Wave 1 completion.

The sixty-second verified slice migrates the anonymous HOME feature introduction block rendered
from `index/partial_intro.scala.html`. Colocated StyleX owns the heading, six-item list, row
clearfix, item grid, icons, titles, descriptions, border, and max-720 single-column layout through
canonical global theme variables. The feature presentation classes are removed from this owner,
and its 77-line `app.css` bridge is deleted; only the outer Bootstrap row and the Yobicon glyph
font remain real fallback consumers. The Scala inter-item whitespace is preserved so desktop
inline-block geometry remains exact. Fresh Korean live desktop and mobile evidence matches the
local owner geometry, paint, copy, order, and glyph primitives, while English copy/order is also
verified. Focused RED 4/4 becomes GREEN 4/4; the adjacent mobile landing case passes, and the broad
desktop exact-DOM case retains only pre-existing shell canonicalizer drift outside this owner.
Typecheck, production build/StyleX verification, manifest agreement at app.css
`1c8002a8...a32`, unchanged frozen fallback `6417f445...16f`, lint/format, screenshots, visual
inspection, and diff gates pass. This is not Wave 1 completion.

The sixty-third verified slice migrates the anonymous HOME `siteintro` hero rendered from
`index/partial_intro.scala.html`: background, cover, heading, tagline, signup wrapper, and the
complete signup CTA state family. Colocated StyleX owns every frozen declaration through the
canonical global theme file, including the max-720 cover/heading state and the former
`ybtn-success ybtn-padding` base/hover/focus/active cascade. Because a root-defined CSS variable
cannot resolve an element-scoped Vite asset variable, the theme file supplies a scoped
`createTheme` for the complete gradient-plus-asset expression while JSX retains only the imported
asset URL custom-property bridge. All hero presentation classes and 60 matching `app.css` lines
are removed; the surrounding `siteintro-bg row` remains the real Bootstrap geometry consumer.
Fresh live and local Korean screenshots agree on the 270px desktop and 310px mobile hero, exact
cover/heading/tagline/CTA geometry and paint, responsive wrapping, and no horizontal overflow.
Focused RED 3/3 becomes GREEN 3/3, the adjacent mobile landing case passes, and the broad desktop
exact-DOM case retains only its pre-existing global-header canonicalizer drift outside the hero.
Typecheck, production build/StyleX verification, manifest agreement at app.css
`7696a82f...65e`, unchanged frozen fallback `6417f445...16f`, format, visual inspection, and diff
gates pass. This is not Wave 1 completion.

The sixty-fourth verified slice migrates the anonymous HOME outer intro region rendered from
`index/partial_intro.scala.html`. Colocated StyleX owns only the active Bootstrap 2.3.1 `.row`
negative margin and clearfix pseudos through canonical global theme variables; the IE-only
`*zoom` parser hack and the inactive min-1200 responsive row variant are not translated. The
presentation token `row` is removed while declaration-free `siteintro-bg` remains as structural
markup. Generic Bootstrap `.row` fallback remains for its many other real consumers, and neither
`app.css` nor its manifest changes. Fresh Korean desktop/mobile evidence and focused tests preserve
the exact `1386×591 @ -20/40` and `410×1091 @ -20/40` outer geometry, hero-before-feature order,
clearfix pseudos, and no horizontal overflow. Focused RED 3/3 becomes GREEN 3/3 and combined outer
plus hero verification passes 6/6. The adjacent mobile landing case passes; its broad desktop
exact-DOM case canonicalizes this region identically and retains only pre-existing global-header
drift. Typecheck, production build/StyleX verification, unchanged app.css/manifest
`7696a82f...65e`, unchanged frozen fallback `6417f445...16f`, format, screenshots, visual
inspection, and diff gates pass. This is not Wave 1 completion.

The sixty-fifth verified slice migrates the anonymous global GNB Sign up Link rendered from
`common/usermenu.scala.html`. Colocated StyleX owns the complete selector-declared `.ybtn` plus
`.ybtn-success` base/hover/focus/active presentation through canonical global theme variables,
and the Link drops both presentation classes. Browser/inherited/global anchor values that those
selectors do not declare are not falsely copied. Generic button fallback remains unchanged for
its many independent real consumers, while no button fallback now matches this owner. Desktop
and Korean mobile preserve exact `74.6875×30 @1267.84375/5` and
`78.234375×30 @298.0625/45` geometry, copy, href, settled interaction paint, containment, URL,
and no overflow. Focused RED 3/3 becomes GREEN 3/3; signup plus adjacent menu passes 6/6 and the
direct affordance regression passes 1/1. Typecheck, Vitest 11/11, production build/StyleX
verification, unchanged app.css/manifest `7696a82f...65e`, unchanged frozen fallback
`6417f445...16f`, formatting, screenshots, visual inspection, and diff gates pass. Broader shell
and exact-DOM runs retain failures before or outside this owner and are not counted as green.
This is not Wave 1 completion.

The sixty-sixth verified slice migrates the three authenticated HOME intro-guide CTA Links
rendered from `index/notifications.scala.html`. Colocated StyleX owns the guide-specific 85%
width and the complete selector-declared `.ybtn` plus `.ybtn-success` base/hover/focus/active
presentation through canonical global theme variables. The Links preserve their copy, order, and
`/projects/new`, `/organizations/new`, and `/projects` navigation while dropping both presentation
classes. Generic Yobi button fallback remains unchanged for its other real consumers, and no
fallback selector now matches these three owners. At 1366px the fluid table produces three exact
`233.71875×30` CTAs; at the 390px viewport/client-380 state all three remain `136.890625×30`.
Focused RED 3/3 becomes GREEN 3/3, and the unchanged intro-guide/page-wrap adjacent set passes
10/10. Typecheck, Vitest 11/11, production build/StyleX verification, unchanged app.css/manifest
`7696a82f...65e`, unchanged frozen fallback `6417f445...16f`, TS/TSX-only formatting,
desktop/mobile screenshot inspection, and diff gates pass. The broad exact-DOM test reaches an
unrelated previously recorded GNB/content canonicalizer mismatch after the three CTA anchors
canonicalize equally, so it is not counted as green. The next safe owner is the two authenticated
HOME notification-pagination buttons' remaining shared `ybtn` primitive. This is not Wave 1
completion.

The sixty-seventh verified slice completes the two authenticated HOME notification-pagination
buttons shared by `/`, `/notifications`, and the singular `/notification` fragment. The existing
StyleX owner keeps the legacy 20px top margin, 95% width, and content-box geometry and now owns the
complete final `.ybtn` base plus hover/focus/active presentation through owner-specific canonical
global theme variables. Both React buttons preserve `li > button#notification-more`, `More`, and
TanStack Query append/removal behavior while dropping `ybtn`. Generic Yobi/app button fallback
remains unchanged only for its many independent consumers. Immutable frozen `#notification-more`
still matches the preserved behavior id in the lower layer, but the owner no longer depends on it
and StyleX wins both declarations. Focused RED is observed and GREEN passes 6/6; the singular route
passes 2/2 and adjacent content-box geometry passes 1/1. Typecheck, Vitest 11/11, production
build/StyleX verification, unchanged app.css/manifest `7696a82f...65e`, unchanged frozen fallback
`6417f445...16f`, TS/TSX-only formatting, desktop/mobile screenshot inspection, frozen hashes, and
diff gates pass. The broad authenticated-HOME exact-DOM comparison still reaches unrelated existing
GNB/content canonicalizer drift after the pagination subtree matches, so it is not counted green.
The next owner must be selected from the remaining active consumer inventory. This is not Wave 1
completion.

The sixty-eighth slice completes the authenticated HOME intro-guide toggle button. The
existing owner already owns the guide-specific border, radius, color, padding, display, and icon
size; this completion moves the remaining `btn-transparent` background and outline declarations
to owner-specific canonical global theme variables and removes that presentation class only from
`button#toggleIntro`. Generic `.btn-transparent` fallback remains unchanged for many independent
real consumers, and the Yobicon glyph primitive remains required. The pre-change focused baseline
passes 5/5 and actual RED is observed after strengthening the contract. Typecheck, Vitest 11/11,
production build/StyleX verification, TS/TSX-only formatting, and diff checks pass on the
implementation. Post-change focused Playwright passes 5/5, adjacent authenticated HOME page-wrap
passes 4/4, and desktop/mobile screenshots were inspected with no visible drift. Chromium reports
the inactive medium outline width as `3px`, while `outline-style: none` correctly produces no
rendered outline. The broad authenticated HOME suite passes 27/40; its 13 failures remain unrelated
pre-existing GNB/sidebar/notification canonicalizer drift and are not counted green for this slice.

The sixty-ninth slice completes the global root-shell `RootYoramToast` visible state. It is a
single-owner wave: `#yobiToasts`, its toast surface, dismiss control, spacer, and message are
migrated together because their frozen `_yobiUI.less` selectors are mutually dependent; the
separate root modal and the inert `text/x-jquery-tmpl` compatibility markup are excluded. Fresh
live legacy Edge evidence at 1366×900 and 390×844 fixes the 450×70 toast, its exact paint, final
opacity, and the intentional mobile left clipping. StyleX owns every selector-declared runtime
value through canonical global theme variables, removes runtime `yobiToasts`, `toast`,
`btn-dismiss`, `btn-transparent`, `center-text`, `v`, and `msg` presentation classes only inside
this state, and preserves the root React timer/click dismissal behavior. Actual RED becomes
focused GREEN 5/5; desktop/mobile full-page screenshots were inspected against the live baseline,
with typecheck, Vitest, production build/StyleX verification, frozen hashes, format, and diff gates
recorded before the wave commit.

The seventieth slice migrates the anonymous root-shell `RootLoginDialog` state opened from the
root Login CTA. `common/loginDialog.scala.html`, `_page.less`, `_responsive.less`, and
`common/yobi.LoginDialog.js` establish the exact dialog/form output and behavior evidence;
React continues to own opening, focus, submit, error, Escape, close, and backdrop events. The
dialog, form, inputs, error, checkbox/label, submit row, and stable dialog/backdrop parts now
have StyleX ownership backed only by canonical global theme variables. `RootYoramDialog` is
excluded because no current root transition opens it. The `loginDialog` class remains on this
one runtime dialog only: its frozen max-767 responsive selector has active `!important` values
and is therefore a genuine fallback consumer. Generic Bootstrap modal/form/button rules remain
for independent consumers. Focused RED became GREEN 5/5 with exact desktop `462×378 @453/90`
and mobile `392×378 @0/84.39` dialog measurements, no document overflow, stable screenshots,
and inspected desktop/mobile output. This is not Wave 1 completion.

The seventy-first slice migrates the anonymous standalone `/users/loginform` standard-password
state from `user/login.scala.html`. It moves the login tagline/title/copy, form wrapper, text
inputs, primary submit row/button, and remember/action row to StyleX variables sourced from
`_page.less` and `_responsive.less`; the existing React/TanStack mutation, redirect, and error
state remain intact. OAuth provider controls, the social-login-only branch, and shared
`login-form-wrap`/button selectors remain lower-layer fallback consumers because they are used
by other login/signup/reset states. Live legacy desktop/mobile captures confirm the standard
provider-visible state; local output keeps the exact 400px desktop form and 95% mobile fallback
geometry without numeric compensation. Focused RED became GREEN 4/4 with mutation, fallback,
desktop/mobile paint, screenshot, and no-overflow coverage. This is not Wave 1 completion.

The seventy-second slice migrates the anonymous `/users/signupform` standard password state from
`user/signup.scala.html`. StyleX owns the tagline/title/copy, wrapper, labels, standard inputs and
focus state, password spacing, submit row/button, and login action through canonical global theme
variables sourced from `_page.less` and `_responsive.less`. The confirmation and social-only
branches remain outside this owner. Standard inputs drop the legacy `text password` presentation
classes so StyleX, including its composed password-input margin, actually owns the migrated values.
The max-767 form width, `dl` alignment, and validation-popover rules remain frozen fallbacks only
for real confirmation/validation consumers. Live legacy desktop/mobile captures and local output
agree on the 400px desktop form, 95% mobile form, 40% mobile inputs, and no-overflow geometry.
Focused RED became GREEN 5/5 for source/global-theme ownership, DOM/copy/order, validation and
registration payload, excluded branches, desktop/mobile paint, screenshots, and no overflow. This
is not Wave 1 completion.

The seventy-third slice migrates the anonymous valid-token `/resetPassword?s=…` state from
`user/resetPassword.scala.html`. StyleX owns the reset tagline/title/copy, form wrapper, two
password inputs and focus state, and submit row/button through canonical global theme variables
sourced from `_page.less` and `_responsive.less`; React/TanStack retains validation, reset
mutation, and navigation. The invalid-token bad-request page and validation-popover surface are
explicitly outside this owner. Valid-token inputs drop `text password` presentation classes and
use one composed StyleX input declaration so the legacy 15px password spacing remains directly
owned. Live legacy desktop/mobile captures and local output agree on the 400px desktop form and
95% mobile form/input geometry; the en-US mobile title wraps exactly as the pre-existing legacy
regression specifies. Focused RED became GREEN 5/5 for source/global-theme ownership, DOM/copy,
validation and successful reset payload, excluded invalid state, desktop/mobile paint, screenshots,
and no overflow. This is not Wave 1 completion.

The seventy-fourth slice migrates the anonymous baseline `/lostPassword` email-request form from
`site/lostPassword.scala.html`. StyleX owns its reset tagline/title/copy, wrapper, Login ID and
email inputs/focus state, and submit row/button through canonical global theme variables from
`_page.less` and `_responsive.less`; React/TanStack retains session lookup, request mutation, and
success navigation. Requested/error alerts and authenticated prefill are separate states outside
this owner. Baseline inputs drop the `text` presentation class only where StyleX directly owns the
visible declarations. Live legacy desktop/mobile captures and local output agree on the 400px
desktop form and 95% mobile form/input geometry; the en-US mobile title wraps as its legacy
regression specifies. Focused RED became GREEN 5/5 and the existing route regression passes 5/5.
This is not Wave 1 completion.

The seventy-fifth slice migrates only the anonymous requested-success `/lostPassword?requested=1`
alert from `site/lostPassword.scala.html`. StyleX owns the dependent Bootstrap 2.3.1 success
surface, heading, and dismiss button through canonical global theme variables, including the
legacy `_page.less` 15px login-alert heading override; React retains the existing query state and
dismissal event. The request form, error alert, and authenticated prefill remain separate states.
The success owner removes its `alert`, `alert-success`, and `close` presentation classes because
it directly owns every concrete declaration; the frozen shared Bootstrap fallback stays for its
many independent consumers. The legacy server's success flash could not be reproduced through a
query-only visit without sending a reset request, so Scala/Bootstrap evidence and local
before/after browser screenshots establish the exact `400px` desktop and `370.5px` mobile alert
geometry. Focused RED became GREEN 5/5 and the existing route regression passes 5/5. This is not
Wave 1 completion.

The seventy-sixth slice migrates the anonymous visible `/lostPassword?error=invalid` alert and
the same alert reached by a failed reset-request mutation. It owns the dependent Bootstrap 2.3.1
error surface, heading, inherited error copy, and dismiss button through canonical global theme
variables; React retains query/mutation error selection and dismissal. Baseline, requested-success,
and authenticated prefill states remain separate. Authenticated success/error alerts deliberately
retain their full legacy fallback DOM because this owner is anonymous-only. The owner removes
`alert`, `alert-error`, and `close` only from its anonymous state; frozen Bootstrap fallback stays
for authenticated alerts and all independent consumers. Source and local browser screenshots prove
the exact `400px` desktop and `370.5px` mobile geometry, with focused GREEN 5/5 and existing route
regression GREEN 5/5. This is not Wave 1 completion.

The seventy-seventh slice migrates the authenticated no-alert `/lostPassword` prefilled form from
the same `site/lostPassword.scala.html` skeleton. It reuses the existing canonical lost-password
global variables to own the tagline/title/copy, wrapper, prefilled Login ID/email fields and focus
state, and submit row/button, while React retains the existing session-derived default values and
request mutation. The Scala `!currentUser.isAnonymous` value branch is preserved exactly. Anonymous
baseline and all success/error alerts remain separate; authenticated alerts retain their legacy
fallback DOM without this owner. Focused GREEN 5/5 verifies values, request payload, focus,
desktop/mobile geometry/paint/screenshots, and owner exclusion; existing route regression is GREEN
5/5. This is not Wave 1 completion.

The seventy-eighth slice migrates authenticated `/lostPassword?requested=1` success alert state.
It reuses the canonical anonymous-success StyleX surface, heading, and dismiss declarations under
its own authenticated stable owner, while preserving the prefilled form values and React dismissal.
Anonymous success, authenticated no-alert prefill, and all error states remain separate owners or
fallback states. No theme value is duplicated; the authenticated alert alone drops its legacy
presentation classes once the reused StyleX declarations own all concrete output. Focused GREEN
5/5 verifies prefill values, copy/order/dismissal, desktop/mobile paint/geometry/screenshots, and
all state exclusions; existing route regression is GREEN 5/5. This is not Wave 1 completion.

The seventy-ninth slice migrates authenticated visible `/lostPassword?error=invalid` error alert,
reusing the existing error StyleX surface, inherited copy, heading, and dismiss declarations under
its own state owner. Prefilled values and React dismissal remain intact; anonymous error, success,
and no-alert states stay separate. Focused and existing regressions are GREEN 5/5. This is not
Wave 1 completion.

The eightieth slice migrates invalid-token `/resetPassword?error=invalid&s=…` bad-request output
from `error/badrequest_default.scala.html`. StyleX owns only its error wrapper/message from
`_page.less`; shared `ico-404` and `ybtn ybtn-info` Home primitives remain real fallback consumers.
Focused and existing reset regressions are GREEN 5/5. This is not Wave 1 completion.

The eighty-first slice migrates valid-token `/resetPassword?s=…` validation-error output from
`user/resetPassword.scala.html` and `yobi.resetPassword.js`. StyleX owns the complete left
popover surface, arrow, and message through global theme variables sourced from Bootstrap 2.3.1
and `_yobiUI.less`; React retains the legacy-equivalent validation and calculated placement.
No-token and independent popover consumers retain fallback output. Focused and existing reset
regressions are GREEN 5/5. This is not Wave 1 completion.

The eighty-second slice migrates standard `/users/signupform` validation-error output from
`user/signup.scala.html` and `yobi.user.SignUp.js`. StyleX owns the complete left popover surface,
arrow, and message through global theme variables sourced from Bootstrap 2.3.1, `_yobiUI.less`,
and the responsive signup popover rules; React retains legacy-equivalent validation and calculated
placement. Confirmation, social-only, and independent popover consumers retain fallback output.
Focused and existing signup regressions are GREEN 5/5. This is not Wave 1 completion.

The eighty-third slice migrates the email-verification-enabled standalone `/users/loginform`
helper from `user/login.scala.html`. StyleX owns the complete `.email-verification-help` typography
and spacing through global theme variables sourced from `_page.less`; disabled and social-only login
states retain their existing output. Focused and existing login regressions are GREEN 5/5. This is
not Wave 1 completion.

The eighty-fourth slice migrates the signup-confirmation notice in `/users/signupform` from
`user/signup.scala.html`. StyleX owns the confirmation-only `text-align:center` declaration through
a global theme variable sourced from `_common.less`; standard-password and social-only states retain
their existing output, while other `.center-txt` consumers remain fallback consumers. Focused and
existing signup regressions are GREEN 5/5. This is not Wave 1 completion.

The eighty-fifth slice migrates the initial administrator setup surface in `/secret` from
`welcome/secret.scala.html`. StyleX owns only that template's inline secret-wrapper, logo, and
warning-box declarations through global theme variables; the setup form, mutation, and not-found
state retain their existing output. Focused desktop/mobile and existing setup regressions verify
the legacy containing-block geometry. This is not Wave 1 completion.

The eighty-sixth slice migrates the standalone restart notice in `/restart` from
`welcome/restart.scala.html`. StyleX owns the template's inline wrapper, logo, hover, and notice
declarations through global theme variables; the page shell and footer remain fallback consumers.
Focused default and failed-secret desktop/mobile assertions retain copy, SPA navigation, geometry,
and screenshots. This is not Wave 1 completion.

The eighty-seventh slice migrates the disabled migration selection shell in `/migration` from
`migration/home.scala.html` and `_migration.less`. StyleX owns only the route-local title, board,
selection-pane, search, and list declarations through global theme variables; global shell and
Bootstrap table, button, progress, span, and icon primitives remain fallback consumers. The legacy
fixed span layout intentionally overflows at 390px, so focused mobile parity pins owner-relative
containment rather than introducing a responsive compensation. This is not Wave 1 completion.

The eighty-eighth slice migrates successful `/verify/:loginId/:verificationCode` output from
`user/verified.scala.html` and the reset-password branch of `_page.less`. StyleX owns the exact
tag-line wrapper, title, and tagline declarations through existing global theme variables; pending
loading, invalid verification, the SiteLayout shell, and reset/login consumers remain fallback
states. Focused desktop/mobile screenshots and the existing verification regression retain the
legacy copy, order, and geometry. This is not Wave 1 completion.

The eighty-ninth slice migrates the no-error title strip of `/sites/diagnostic` from
`site/diagnostic.scala.html` and `_page.less`. StyleX owns the exact title-area and heading
declarations through global theme variables only when diagnostics have no errors; the paragraph,
error title/body/pre, shared site-admin shell, sidebar, and layout primitives remain fallback.
Focused desktop/mobile screenshots and the existing diagnostics regression retain legacy copy,
order, and geometry. This is not Wave 1 completion.

The ninetieth slice migrates the error `<pre>` blocks of `/sites/diagnostic` from
`site/diagnostic.scala.html` and Bootstrap 2.3.1. StyleX owns the exact direct error-pre
typography, wrapping, surface, border, radius, and box declarations through global theme
variables; the title strip, error message/list geometry, no-error state, and shared site-admin
shell remain fallback. Focused desktop/mobile screenshots and the existing diagnostics regression
retain legacy copy, order, and geometry. This is not Wave 1 completion.

The ninety-first slice migrates the warning surface of `/sites/data` from
`site/data.scala.html`, `_page.less`, and `_mixins.less`. StyleX owns only the exact inline-block
warning wrapper and notice text color through global theme variables; title, export/import
content, form controls, and the shared site-admin shell remain fallback. Focused desktop/mobile
screenshots and the existing data-settings regression retain legacy copy, order, and geometry.
This is not Wave 1 completion.

The ninety-second slice migrates the title strip of `/sites/data` from `site/data.scala.html` and
`_page.less`. StyleX owns the exact title-area and heading declarations through existing global
theme variables; warning, export/import content, form controls, and the shared site-admin shell
remain fallback. Focused desktop/mobile screenshots and the existing data-settings regression
retain legacy copy, order, and geometry. This is not Wave 1 completion.

The ninety-third slice migrates the export action of `/sites/data` from `site/data.scala.html`,
`_yobiUI.less`, `_mixins.less`, and `_variables.less`. StyleX owns the complete former
`ybtn ybtn-primary` surface through global variables and removes those fallback classes only from
this Link; import controls and the shared shell remain fallback. This is not Wave 1 completion.

The ninety-fourth slice migrates the errors-present title strip of `/sites/diagnostic` from
`site/diagnostic.scala.html` and `_page.less`. It reuses the exact title declarations through a
separate error-state owner; no-error title, error pre, and the shared site-admin shell remain
separate owners or fallback. This is not Wave 1 completion.

The ninety-fifth slice migrates the update-available download action of `/sites/update` from
`site/update.scala.html`, `_yobiUI.less`, `_mixins.less`, and `_variables.less`. StyleX owns the
complete former `ybtn ybtn-success` surface through global variables and removes those fallback
classes only from this external Link; other update branches and the shared shell remain fallback.
This is not Wave 1 completion.

The ninety-sixth slice migrates the errors-present direct `<pre>` of `/sites/update` from
`site/update.scala.html` and Bootstrap 2.3.1 `code, pre`/`pre` rules. StyleX applies the complete
evidenced preformatted exception surface through existing global variables without removing any
legacy class; error copy, title, sidebar, other update branches, and generic pre consumers remain
fallback. This is not Wave 1 completion.

The ninety-seventh slice migrates the common `/sites/update` title strip from
`site/update.scala.html` and `_page.less`. StyleX applies the exact title-area and direct-heading
declarations through existing global variables while retaining the shared fallback classes;
available/current/no-update/error bodies, title descendant navigation, sidebar, shell, and generic
title areas remain fallback. This is not Wave 1 completion.

The ninety-eighth slice migrates the default `/sites/mail` send action from `site/mail.scala.html`,
`_yobiUI.less`, `_mixins.less`, and `_variables.less`. StyleX owns the complete former
`ybtn ybtn-primary` surface through global variables and removes those fallback classes only from
the mutation submit button; the form wrapper, fields, alerts, title/sidebar/shell, and other ybtn
consumers remain fallback. This is not Wave 1 completion.

The ninety-ninth slice migrates the common `/sites/mail` title strip from `site/mail.scala.html`
and `_page.less`. StyleX applies the exact title-area and direct-heading declarations through
existing global variables while retaining shared fallback classes; form, alerts, send action,
sidebar/shell, and generic title areas remain fallback or separate owners. This is not Wave 1 completion.

The one-hundredth slice migrates successful `/sites/mail` alert from `site/mail.scala.html` and
Bootstrap 2.3.1 `.alert`/`.alert-success` rules. StyleX owns the complete base and success alert
surface through global variables while retaining alert fallback classes; error/not-configured alerts,
form, send action, title/sidebar/shell, and generic alerts remain fallback or separate owners.
This is not Wave 1 completion.

The one-hundred-first slice migrates error `/sites/mail?errorMessage=…` alert from
`site/mail.scala.html` and Bootstrap 2.3.1 `.alert`/`.alert-error` rules. StyleX owns the complete
base and error alert surface through global variables while retaining alert fallback classes;
success/not-configured alerts, form, send action, title/sidebar/shell, and generic alerts remain
fallback or separate owners. This is not Wave 1 completion.

The one-hundred-second slice migrates the not-configured `/sites/mail` error alert from
`site/mail.scala.html` and Bootstrap 2.3.1 `.alert`/`.alert-error` rules. It reuses the exact
global error-alert values while retaining fallback classes; the search/mutation error alert,
success alert, form, send action, title/sidebar/shell, and generic alerts remain separate owners
or fallback. This is not Wave 1 completion.

The one-hundred-third slice migrates the default `/sites/massmail` Write email action from
`site/massMail.scala.html`, `_yobiUI.less`, `_mixins.less`, and `_variables.less`. StyleX owns the
complete former `ybtn ybtn-primary` surface through global variables and removes those fallback
classes only from this action; radio/project selection controls, the add-project button, title,
sidebar/shell, and other ybtn consumers remain fallback. This is not Wave 1 completion.

The one-hundred-fourth slice migrates the common `/sites/massmail` title strip from
`site/massMail.scala.html` and `_page.less`. StyleX applies the exact title-area and direct-heading
declarations through existing global variables while retaining shared fallback classes; controls,
actions, sidebar/shell, and generic title areas remain fallback or separate owners. This is not
Wave 1 completion.

The one-hundred-fifth slice migrates the projects-recipient `/sites/massmail` text-input margin
from `site/massMail.scala.html` and `_page.less`. StyleX owns only the exact direct input margin
through a global variable while retaining the `span3` and all Bootstrap text-input fallback
declarations; radio controls, project wrapper/typeahead/tags, add and mail actions, title,
sidebar/shell, and generic inputs remain fallback or separate owners. This is not Wave 1
completion.

The one-hundred-sixth slice migrates the projects-recipient `/sites/massmail` default add action
from `site/massMail.scala.html`, `_yobiUI.less`, `_mixins.less`, and `_variables.less`. StyleX owns
the complete applicable former `ybtn` base and interaction surface through global variables and
removes that fallback class only from this button; its input-before-button DOM means the legacy
first-child margin exception does not apply. Radio controls, input/wrapper/typeahead/tags, mail
action, title/sidebar/shell, and all other ybtn consumers remain fallback or separate owners.
This is not Wave 1 completion.

The one-hundred-seventh slice migrates the default/projects-recipient `/sites/massmail` radio
pair from `site/massMail.scala.html` and Bootstrap 2.3.1 `.radio`. StyleX owns only the exact
radio-label and direct-radio-input declarations, removing `radio` solely from the pair; generic
Bootstrap label display and margin, control-group/inline variants, project controls, actions,
title/sidebar/shell, and other radio/checkbox consumers remain fallback or separate owners. This
is not Wave 1 completion.

The one-hundred-eighth slice migrates the projects-recipient `/sites/massmail` selected-project
tag from `yobi.site.MassMail.js` and Bootstrap 2.3.1 `.label`/`.label-info`. StyleX owns the
complete applicable generated-span surface and explicit JS margin through global variables,
removing `label label-info` only from each dynamic tag; the React-owned remove button, generic
tags/labels, typeahead/project controls, actions, title/sidebar/shell, and inapplicable empty/href
variants remain fallback or separate owners. This is not Wave 1 completion.

The one-hundred-ninth slice migrates the projects-recipient `/sites/massmail` project wrapper
margin from `site/massMail.scala.html` and Bootstrap 2.3.1 `.control-group`. StyleX owns its exact
10px margin and preserves the `hide` state class alongside the generated class; validation,
legend/form-horizontal variants, project children, actions, title/sidebar/shell, and generic
control groups remain fallback or separate owners. This is not Wave 1 completion.

The one-hundred-tenth slice repairs the `/sites/massmail` title strip and project-input StyleX
class composition. The legacy fallback classes `title_area`, `pull-left`, and `span3` now coexist
with actual generated classes, so the previously recorded StyleX declarations take effect. No
selector or declaration scope changes; remaining surfaces remain fallback or separate owners.
This is not Wave 1 completion.

The one-hundred-eleventh slice repairs `/sites/mail` title and alert StyleX class composition.
The retained `title_area`, `pull-left`, `alert`, `alert-error`, and `alert-success` fallback
classes now coexist with actual generated classes for the existing title and three alert owners;
no declarations, theme values, DOM order, or route behavior changes. Form controls, send action,
sidebar/shell, and other alert consumers remain fallback or separate owners. This is not Wave 1
completion.

The one-hundred-twelfth slice repairs `/sites/update` title-strip StyleX class composition. The
legacy `title_area` and `pull-left` classes now coexist with the existing generated classes; update
download/error owners, body states, sidebar/shell, and generic title areas remain fallback or
separate owners. This is not Wave 1 completion.

The one-hundred-thirteenth slice repairs `/sites/data` title and warning StyleX class composition.
The existing generated classes now coexist with retained `title_area`, `pull-left`, `cu-desc`, and
`notice` fallback classes; export/import controls, sidebar/shell, and generic title/warning
consumers remain fallback or separate owners. This is not Wave 1 completion.

The one-hundred-fourteenth slice repairs verified-user success StyleX class composition. The legacy
wrapper, title, and tagline classes now coexist with the existing generated classes; pending,
invalid, and independent reset/login surfaces remain fallback or separate owners. This is not Wave
1 completion.

The one-hundred-fifteenth slice migrates the /sites/userList default title strip from
site/userList.scala.html and _page.less. StyleX owns the exact title-area and direct-heading
declarations through existing global variables while retaining the shared title_area and pull-left
fallback classes; the search form, tabs, user list, sidebar/shell, and generic title areas remain
fallback or separate owners. This is not Wave 1 completion.

The one-hundred-sixteenth slice migrates the /sites/postList default populated title strip from
site/postList.scala.html and _page.less. StyleX owns the exact title-area and direct-heading
declarations through existing global variables while retaining the shared title_area and pull-left
fallback classes; post rows, pagination, sidebar/shell, and generic title areas remain fallback or
separate owners. This is not Wave 1 completion.

The one-hundred-seventeenth slice migrates the /sites/projectList default title strip from
site/projectList.scala.html and _page.less. StyleX owns the exact title-area and direct-heading
declarations through existing global variables while retaining the shared title_area and pull-left
fallback classes; the direct search form, list header/rows, modal, pagination, sidebar/shell, and
generic title areas remain fallback or separate owners. This is not Wave 1 completion.

The one-hundred-eighteenth slice migrates the /sites/issueList open-state title strip from
site/issueList.scala.html and _page.less. StyleX owns the title-area and direct-heading
declarations through existing global variables while retaining shared fallback classes; tabs,
issue rows, pagination, sidebar/shell, and generic title areas remain separate owners or fallback.
This is not Wave 1 completion.

The one-hundred-nineteenth slice migrates the /sites/projectList populated list header from
site/projectList.scala.html and _page.less. StyleX owns the list-header surface, border, spacing,
line height, and direct-column padding through global variables while retaining Bootstrap grid
and shared fallback classes; rows, actions, modal, pagination, sidebar/shell, and generic list
headers remain fallback or separate owners. This is not Wave 1 completion.

The one-hundred-twentieth slice migrates the /sites/projectList populated project-row base,
project avatar, and four direct columns from site/projectList.scala.html and _page.less. StyleX
owns their exact border, geometry, spacing, and typography through global variables while
retaining Bootstrap/shared fallback classes and the listitem class required by the unmigrated
even-row background; actions, links, modal, pagination, and shell remain fallback or separate
owners. This is not Wave 1 completion.

The one-hundred-twenty-first slice migrates the /sites/projectList populated list container,
project-name links, and row delete actions from site/projectList.scala.html, _page.less, and
_yobiUI.less. StyleX owns the exact list style, project-name typography, and resolved
base/danger/hover/focus/active/first-child button cascade through global variables. The three
fully migrated presentation classes are removed and affected E2E locators move to stable owners;
the delete modal controls, pagination, search, sidebar, and shell remain fallback or separate
owners. This is not Wave 1 completion.

The one-hundred-twenty-second slice migrates the /sites/projectList populated first-page
pagination from site/projectList.scala.html, the legacy Pagination behavior, _common.less,
_page.less, _responsive.less, and _sprites.less. StyleX owns the wrapper, page-number list,
items and variants, input interaction states, labels, and icon geometry through global variables,
including the desktop -120px list offset and max-720 zero reset. The wrapper/list/item/input and
variant presentation classes are removed. The sprite image/background-position classes and the
Firefox-only nospinner class remain shared fallback; the delete modal, search, sidebar, and shell
remain separate owners. This is not Wave 1 completion.

The one-hundred-twenty-third slice migrates the /sites/projectList authenticated populated
title-area search from site/projectList.scala.html, _page.less, _yobiUI.less, _responsive.less,
and Bootstrap's generic form-control foundation. StyleX owns the form margin, complete search-bar
box, textbox selector-specific sizing/spacing/transition, and positioned submit control through
global variables and the shared max-720 breakpoint. The four fully migrated presentation classes
are removed. Bootstrap's generic input foundation, the shared pull-right float, and the Yobicon
search glyph remain fallback; the delete modal, sidebar, and shell remain separate owners. This is
not Wave 1 completion.

The one-hundred-twenty-fourth slice migrates the /sites/projectList delete-confirmation modal's
settled open state from site/projectList.scala.html, Bootstrap 2.3.1, and _responsive.less. StyleX
owns the frame, header, close control, body, footer, and backdrop through global theme variables,
including the max-767 and max-480 responsive cascade. React state/events and TanStack Query retain
open, dismiss, deletion, and cache behavior. The six fully migrated modal presentation groups are
removed; the footer's shared ybtn confirmation controls, sidebar, and shell remain separate owners
or fallback. This is not Wave 1 completion.

The one-hundred-twenty-fifth slice migrates the /sites/projectList delete-confirmation modal's
Yes and No footer actions from site/projectList.scala.html and _yobiUI.less. StyleX owns the full
base, first-child, hover, focus, active, and danger cascade through global theme variables, and
restores the frozen `.3em` sibling spacing that the current app bridge had flattened. The two
modal actions remove `ybtn`/`ybtn-danger`; all other shared button consumers and the already
migrated modal frame remain unchanged. This is not Wave 1 completion.

The one-hundred-twenty-sixth slice completes the `/sites/projectList` populated row's alternating
surface and avatar presentation from `site/projectList.scala.html`, `_common.less`, `_page.less`,
and `_yobiUI.less`. StyleX owns the even-row `#f9f9f9` surface, the avatar wrapper's final frozen
cascade, and the direct image's 100% width/top alignment through global theme variables. Runtime
rows remove `listitem`, and their avatar Links remove `avatar-wrap list-avatar`; Bootstrap
`row-fluid`, `span*`, and `listitem-col` remain active grid/column fallback for a separate wave.
The image now fills the frozen 45px wrapper instead of inheriting the noncanonical app bridge's
32px descendant rule. This is not Wave 1 completion.

The one-hundred-twenty-seventh slice migrates the authenticated populated `/sites/postList`
container and direct row information content from `site/postList.scala.html` and `_page.less`.
Six stable StyleX owners use global theme variables for list style, row padding, information rhythm,
project-link paint, separator spacing, and title typography. Only the four fully owned information
classes retire; `post-list-wrap`, `listitem`, and `row-fluid` remain for verified responsive,
shared-row, and Bootstrap consumers. Focused RED 2/5 becomes GREEN 5/5 at desktop and 390 px
without editing frozen fallback. This is not Wave 1 completion.

The one-hundred-twenty-eighth slice completes the authenticated populated `/sites/postList` row
and project-avatar presentation from `site/postList.scala.html`, `_common.less`, `_page.less`, and
`_yobiUI.less`. The existing row owner keeps its padding and adds border, 70px line-height, and
index-derived alternating surface; separate Link/image owners take the final 45px avatar cascade
and direct 100% image alignment through global theme variables. Runtime rows remove `listitem`,
and project-avatar Links remove `avatar-wrap list-avatar`; `row-fluid`, `post-list-wrap`, and the
excluded metadata subtree remain active fallback. The image now fills 45px instead of the app
bridge's noncanonical 32px descendant output. Actual RED 2/4 becomes GREEN 4/4, and the previous
row-content suite remains GREEN 5/5. This is not Wave 1 completion.

The one-hundred-twenty-ninth slice completes the authenticated populated `/sites/postList`
metadata subtree from `site/postList.scala.html`, `_common.less`, `_page.less`, and `_yobiUI.less`.
Five stable StyleX owners cover the 11px/20px wrapper rhythm, final 14px author-avatar Link and
direct-image cascade, repeated item margins, and comments-icon alignment through global theme
variables. Runtime output removes `post-meta-wrap`, the author `avatar-wrap`, all three
`post-meta-item` uses, and `post-comments`; `yobicon-comments` remains only as the glyph primitive.
Default/custom avatar attributes, copy, title, order, hrefs, and comments hash remain unchanged.
Actual RED 2/4 becomes GREEN 4/4, and the complete three-suite post-row matrix is GREEN 13/13.
This is not Wave 1 completion.

The one-hundred-thirtieth slice migrates the authenticated populated `/sites/postList`
multi-page first-page pagination from `site/postList.scala.html`, the generated pagination DOM in
`yona-lib.js`, `_common.less`, `_page.less`, `_responsive.less`, and `_sprites.less`. Six stable
StyleX owners cover the wrapper, list, repeated item variants, input interaction states, labels,
and sprite-icon geometry through global theme variables and the shared mobile breakpoint. Runtime
output removes `page-navigation-wrap`, `page-nums`, `page-num`, `ikon`, `delimiter`, `input-mini`,
and label `off`; `nospinner` and the sprite-producing `ico`, `btn-pg-*`, and icon `off` remain.
Actual RED 5/5 becomes GREEN 5/5, and the complete post-list owner matrix is GREEN 18/18. This is
not Wave 1 completion.

The one-hundred-thirty-first slice migrates the authenticated populated open-state
`/sites/issueList` container and row information content from `site/issueList.scala.html` and
`_page.less`. Six stable StyleX owners use route-specific global theme variables for list style,
row padding, information rhythm, project-link paint, separator spacing, and issue-title typography.
Only `post-info-wrap`, `post-project`, `post-info-separator`, and `post-title` retire;
`post-list-wrap`, `row-fluid`, `listitem`, state tabs, avatar/metadata, and pagination remain active
fallback or separate owners. Actual RED 5/5 becomes GREEN 5/5, and the title/content matrix is
GREEN 11/11. This is not Wave 1 completion.

The one-hundred-thirty-second slice completes the authenticated populated open-state
`/sites/issueList` row residual and project avatar from `site/issueList.scala.html`, `_common.less`,
`_page.less`, and `_yobiUI.less`. The existing row owner gains border, line-height, and the
index-derived even surface; project-avatar Link and image owners restore the frozen 45px cascade
through route-specific global theme variables. Rows retire `listitem`, and project-avatar Links
retire `avatar-wrap list-avatar`; `row-fluid`, `post-list-wrap`, state tabs, metadata, and pagination
remain fallback or separate owners. Actual RED 5/5 becomes GREEN 5/5, while the prior row-content
suite remains GREEN. Fresh live legacy visual comparison remains unverified. This is not Wave 1
completion.

The one-hundred-thirty-third slice completes the authenticated populated open-state
`/sites/issueList` metadata subtree from `site/issueList.scala.html`, `_common.less`, `_page.less`,
and `_yobiUI.less`. Five stable StyleX owners move the metadata typography, author-avatar wrapper
and image cascade, repeated item margins, and comment-icon alignment through route-specific global
theme variables. `post-meta-wrap`, the author `avatar-wrap`, all three `post-meta-item` uses, and
`post-comments` retire; `yobicon-comments` remains solely for font-glyph generation. Actual RED 5/5
becomes GREEN 5/5, and the complete issue-list owner/behavior matrix passes 28/29 with only the
pre-existing unrelated GNB `Feedback` fixture mismatch. Fresh live legacy visual comparison remains
unverified. This is not Wave 1 completion.

The one-hundred-thirty-fourth slice migrates the authenticated populated open-state first-page
`/sites/issueList` pagination from `site/issueList.scala.html`, `yona-lib.js`, `_common.less`,
`_page.less`, `_responsive.less`, and `_sprites.less`. Six stable owners cover the wrapper, list,
repeated item variants, input interaction states, labels, and sprite-icon geometry through
route-specific global theme variables and the shared mobile breakpoint. This consumer retires
`page-navigation-wrap`, `page-nums`, `page-num`, `ikon`, `delimiter`, `input-mini`, and label `off`;
`nospinner` plus sprite-producing `ico`, `btn-pg-*`, and icon `off` remain. Actual RED 5/5 becomes
GREEN 5/5, and the complete issue-list owner/behavior matrix passes 33/34 with only the pre-existing
unrelated GNB `Feedback` fixture mismatch. Fresh live legacy visual comparison remains unverified.
This is not Wave 1 completion.

The one-hundred-thirty-fifth slice migrates the authenticated populated
`/sites/issueList?state=open` Open/Closed state-tab row from `site/issueList.scala.html`, Bootstrap
2.3.1, `_responsive.less`, and `_yobiUI.less`. Three stable owners cover the tab list clearfix and
border, repeated floated items, responsive links, hover/focus paint, and selected state through
route-specific global theme variables and the shared mobile breakpoint. Only this consumer retires
`nav`, `nav-tabs`, and item `active`; the `ul > li > Link` skeleton, copy/order, search-state SPA
navigation, and independent tab consumers remain unchanged. Actual RED 5/5 becomes GREEN 5/5. The
complete issue-list owner/behavior matrix passes 38/39 with only the pre-existing unrelated GNB
`Feedback` fixture mismatch; the whole-screen file itself passes 7/8. Fresh live legacy visual
comparison remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-thirty-sixth slice completes the authenticated populated
`/sites/issueList?state=open` title/list shell fallback retirement from `site/issueList.scala.html`,
Bootstrap 2.3.1, `_page.less`, and `_responsive.less`. The existing title and list owners plus a new
direct heading owner move the title wrapper, heading float, list style, and canonical max-720 10px
list margin through global theme variables. This route retires only `title_area`, `pull-left`, and
`post-list-wrap`; Bootstrap grid/row classes and every other screen owner remain. The pre-Rust
`.site-setting-wrap .post-list-wrap { margin: 0 }` bridge no longer matches this owner but remains
for independent consumers. Actual RED 5/5 becomes GREEN 5/5, the wrapped mobile inline-row gate is
GREEN 5/5, and the complete issue-list matrix is 43/44 with only the pre-existing unrelated GNB
`Feedback` fixture mismatch. Fresh live legacy visual comparison remains explicitly unverified.
This is not Wave 1 completion.

The following direct-grid slice migrates only the four management layout owners for authenticated
populated-open `/sites/issueList?state=open`: `.site-setting-wrap`, its direct `.row-fluid`, direct
`.span2`, and direct `.span10`. Colocated StyleX reproduces Bootstrap 2.3.1 clearfix, percentage
columns, gutter, box model, and max-767 stacking without theme variables. The nested issue-row
`.row-fluid`, outer shell, sidebar internals, and all content owners remain outside this slice.
Desktop deletion remains fallback-equivalent. On mobile, deletion evidence records the existing
unlayered `app.css` bridge drift: the fixture stays floated at desktop percentages and gutter,
while the route-local StyleX owners supply the correct 100% stacked, float-none output.

The one-hundred-thirty-seventh slice completes the authenticated populated `/sites/postList`
title/list shell fallback retirement from `site/postList.scala.html`, Bootstrap 2.3.1,
`_page.less`, and `_responsive.less`. The existing title and list owners plus a new direct heading
owner move the title wrapper, heading float, list style, and canonical max-720 10px list margin
through global theme variables. This route retires only `title_area`, `pull-left`, and
`post-list-wrap`; Bootstrap grid/row classes and every other screen owner remain. The pre-Rust
`.site-setting-wrap .post-list-wrap { margin: 0 }` bridge no longer matches this owner but remains
for independent consumers. Actual RED 5/5 becomes GREEN 5/5, and the complete post-list matrix is
36/37 with only the pre-existing unrelated GNB `Feedback` fixture mismatch. Fresh live legacy
visual comparison remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-thirty-eighth slice completes the authenticated populated
`/sites/userList?state=ACTIVE` title/search shell fallback retirement from
`site/userList.scala.html`, Bootstrap 2.3.1, and `_page.less`. The existing title owner plus new
direct heading and search-form owners move the title paint, heading float, and direct form zero
margin through global theme variables. This route retires only `title_area` and `pull-left` while
retaining `form-search`, `pull-right`, and every search child class for their independent frozen
cascade. Actual RED 5/5 becomes GREEN 5/5; together with the prior title gate the focused matrix is
11/11. The broader user-list matrix is 24/27: the unrelated GNB `Feedback` fixture mismatch, stale
350px expectation against the frozen 360px input border box, and stale `MouseEvent` source
expectation against the existing `SyntheticEvent` remain outside this wave. Fresh live legacy
visual comparison remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-thirty-ninth slice completes the authenticated populated
`/sites/projectList?filter=road` title/search shell fallback retirement from
`site/projectList.scala.html`, Bootstrap 2.3.1, and `_page.less`. The existing title and search
owners plus a new direct heading owner move the title paint, heading float, form margin, and search
controls through canonical global theme variables. This route retires only `title_area` and
`pull-left`; `pull-right`, the glyph primitive, list header/rows, pagination, modal, sidebar, and
grid remain fallback or separate owners. Actual RED 5/5 becomes GREEN 5/5, the prior title/search
baseline remains GREEN 11/11, and the complete project-list matrix is 58/59 with only the
pre-existing global GNB/footer raw-DOM canonicalizer mismatch. Fresh live legacy visual comparison
remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-fortieth slice completes the authenticated `/sites/data` default title/warning
fallback retirement from `site/data.scala.html`, Bootstrap 2.3.1, `_page.less`, and the inline-block
legacy mixin. Existing title and warning owners plus a direct heading and repeated warning-item
owner move the title paint/float and warning display/color through canonical global variables.
Only `title_area`, `pull-left`, `cu-desc`, and `notice` retire; export/import controls, sidebar,
grid, and shell remain excluded or separate owners. Actual RED 5/5 becomes GREEN 5/5, the prior
title/warning baseline remains GREEN 12/12, the combined focused matrix is GREEN 17/17, and the
complete data matrix is 25/26 with only the pre-existing GNB `Feedback` fixture mismatch. Fresh
live legacy visual comparison remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-forty-first slice completes the authenticated `/sites/update` no-update title
fallback retirement from `site/update.scala.html`, Bootstrap 2.3.1, and `_page.less`. The existing
title-strip owner plus a new direct heading owner move the title paint and heading float through
canonical global variables. Only `title_area` and `pull-left` retire; available/download,
error/pre, body paragraphs, sidebar, grid, and shell remain separate states or owners. The
canonical React product-identity deviation keeps `Yoram` in the current-version copy while legacy
messages remain provenance. Actual RED 5/5 becomes GREEN 5/5, the prior title baseline remains
GREEN 5/5, and the combined title matrix is GREEN 10/10. The complete update matrix is 21/24 with
the pre-existing global GNB root-order fixture and two external-download href expectations outside
this wave. Fresh live legacy visual comparison remains explicitly unverified. This is not Wave 1
completion.

The one-hundred-forty-second slice migrates the authenticated `/sites/update` no-update body
paragraphs from `site/update.scala.html`, Bootstrap 2.3.1, and the later `_common.less` reset. The
direct current-version and latest-version paragraphs become two stable owners sharing the final
frozen `margin: 0` value through one canonical global variable; title, available/download,
error/pre, sidebar, grid, and shell remain excluded or separate owners. Copy, conditions, direct
sibling order, and the canonical `Yoram` current-version deviation remain unchanged. Actual RED
5/5 becomes GREEN 5/5 after correcting the focused fixture to model the full frozen cascade. The
adjacent title-strip gate is GREEN 5/5, and the complete update matrix is 26/29 with only the
pre-existing global GNB root-order fixture and two external-download href expectations outside
this wave. Fresh live legacy visual comparison remains explicitly unverified. This is not Wave 1
completion.

The one-hundred-forty-third slice migrates the authenticated `/sites/update` update-available
message from `site/update.scala.html`, Bootstrap 2.3.1, and the later `_common.less` reset. The
direct available paragraph owns the final frozen `margin: 0`, and its direct strong child owns
Bootstrap's bold weight through two canonical global variables. The existing download action and
current-version paragraph remain independent owners; title, no-update/error, sidebar, grid, and
shell remain excluded. Conditions, whitespace, direct child/sibling order, and canonical Yoram
copy remain unchanged. Actual RED 5/5 becomes GREEN 5/5, the adjacent title-strip gate is GREEN
5/5, and the complete update matrix is 31/34 with only the pre-existing global GNB root-order
fixture and two external-download href expectations outside this wave. Fresh live legacy visual
comparison remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-forty-fourth slice completes the authenticated `/sites/update` local settings
sidebar from `site/siteMngLayout.scala.html`, `_common.less`, and `_page.less`. Four stable owners
cover the UL, eight repeated LI and Link boundaries with first/active variants, and the conditional
update badge; all concrete declarations are canonical global theme variables. This route retires
`site-setting-nav`, active LI `active`, `notification-badge`, empty LI classes, and the duplicate
`app.css` sidebar bridge while frozen fallback remains untouched for other site-admin routes. The
exact eight-item copy/order/hrefs, update state, badge condition, and Diagnostics SPA navigation
remain unchanged. Actual RED 5/5 becomes GREEN 5/5. The complete update matrix is 36/39; the
remaining global GNB root-order fixture and two external-download href expectations predate this
slice and are outside its owner boundary. Fresh live legacy visual comparison remains explicitly
unverified. This is not Wave 1 completion.

The one-hundred-forty-fifth slice completes the authenticated `/sites/diagnostic` no-error local
settings sidebar from `site/siteMngLayout.scala.html`, `_common.less`, and `_page.less`. Four
stable owners cover the UL, eight repeated LI and Link boundaries with first/active variants, and
the conditional update badge through canonical global theme variables. This route retires
`site-setting-nav`, active LI `active`, `notification-badge`, and empty LI classes; the duplicate
`app.css` bridge was already retired by slice 144, while frozen fallback remains active for other
site-admin routes. Exact copy/order/hrefs, Diagnostics selection, badge condition, and Software
Update SPA navigation remain unchanged. Actual RED 5/5 becomes GREEN 5/5. The complete diagnostic
matrix is 23/24 with only the pre-existing global GNB `Feedback` fixture mismatch outside this
wave. Fresh live legacy visual comparison remains explicitly unverified. This is not Wave 1
completion.

The one-hundred-forty-sixth slice completes the authenticated `/sites/data` default local
settings sidebar from `site/siteMngLayout.scala.html`, `_common.less`, and `_page.less`. Four
stable owners cover the UL, eight repeated LI and Link boundaries with the first-item variant,
and the conditional update badge through canonical global theme variables. The Data route is not
one of the eight legacy navigation entries, so it intentionally has no active item, active
variant, or active theme token. This route retires `site-setting-nav`, `notification-badge`, and
empty LI classes while active declarations remain frozen fallback for site-admin route states
that select an entry. Exact copy/order/hrefs, the absent Data selection, badge condition, and Send
email SPA navigation remain unchanged. Actual RED 5/5 becomes GREEN 5/5. The complete data matrix
is 30/31; one pre-existing global GNB `Feedback` fixture mismatch remains outside this owner
boundary, while the title-strip owner allowlist was updated for the new explicit boundaries.
Fresh live legacy visual comparison remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-forty-seventh slice completes the authenticated `/sites/mail` configured-default
local settings sidebar from `site/mail.scala.html`, `site/siteMngLayout.scala.html`,
`_common.less`, and `_page.less`. Four stable owners cover the UL, eight repeated LI and Link
boundaries with first/active variants, and the conditional update badge through canonical global
theme variables. This route retires `site-setting-nav`, active LI `active`, `notification-badge`,
and empty LI classes while frozen fallback remains active for other site-admin routes. Exact
copy/order/hrefs, the fifth-item Send email selection, badge condition, configured mail form and
mutation states, and Mass mail SPA navigation remain unchanged. Actual RED 5/5 becomes GREEN
5/5. The complete mail matrix is 39/40 with only the pre-existing global GNB `Feedback` fixture
mismatch outside this owner boundary. Fresh live legacy visual comparison remains explicitly
unverified. This is not Wave 1 completion.

The one-hundred-forty-eighth slice completes the authenticated `/sites/massmail` default-all
local settings sidebar from `site/massMail.scala.html`, `site/siteMngLayout.scala.html`,
`_common.less`, and `_page.less`. Four stable owners cover the UL, eight repeated LI and Link
boundaries with first/active variants, and the conditional update badge through canonical global
theme variables. This route retires `site-setting-nav`, active LI `active`, `notification-badge`,
and empty LI classes while frozen fallback remains active for other site-admin routes. Exact
copy/order/hrefs, the sixth-item Send mass emails selection, badge condition, recipient/project
selection and mail-list mutation behavior, and Send email SPA navigation remain unchanged. Actual
RED 5/5 becomes GREEN 5/5. The complete massmail matrix is 40/45: the pre-existing GNB `Feedback`
fixture mismatch plus four stale expectations from earlier massmail slices (`.label`, `ybtn`, and
project-wrapper generated ownership) remain outside this sidebar boundary. Fresh live legacy
visual comparison remains explicitly unverified. This is not Wave 1 completion.

The one-hundred-forty-ninth slice completes the authenticated populated-default
`/sites/postList` local settings sidebar from `site/postList.scala.html`,
`site/siteMngLayout.scala.html`, `_common.less`, and `_page.less`. Four stable owners cover the UL,
eight repeated LI and Link boundaries with first/active variants, and the conditional update badge
through canonical global theme variables. This route retires `site-setting-nav`, active LI
`active`, `notification-badge`, and empty LI classes while preserving the exact eight-item
copy/order/hrefs, second-item Posts selection, `pageNum` mask/search suppression, populated posts,
pagination, badge condition, and Send email SPA navigation. Actual RED fails on the absent
ownership contract and becomes GREEN 5/5. The complete post-list matrix is 41/42 after removing
one stale generated-class expectation; only the pre-existing global GNB `Feedback` fixture
mismatch remains outside this owner boundary. Fresh live legacy visual comparison remains
explicitly unverified. This is not Wave 1 completion.

The one-hundred-fiftieth slice completes the authenticated populated-open
`/sites/issueList?state=open` local settings sidebar from `site/issueList.scala.html`,
`site/siteMngLayout.scala.html`, `_common.less`, and `_page.less`. Four stable owners cover the UL,
eight repeated LI and Link boundaries with first/active variants, and the conditional update badge
through canonical global theme variables. This route retires `site-setting-nav`, active LI
`active`, `notification-badge`, and empty LI classes while preserving the exact eight-item
copy/order/hrefs, third-item Issues selection, legacy active-marker suppression, open/closed tabs,
populated rows, pagination, badge condition, and Send email SPA navigation. Actual RED fails on the
absent ownership contract and becomes GREEN 5/5. The complete issue-list matrix is 48/49 with only
the pre-existing global GNB `Feedback` fixture mismatch outside this owner boundary. Fresh live
legacy visual comparison remains explicitly unverified. This is not Wave 1 completion.

### Wave 2 — Bootstrap primitives

Migrate in dependency order:

1. grid/container/span behavior and responsive stacking;
2. buttons and button groups;
3. inputs, selects, textareas, checkboxes, and validation states;
4. navs, tabs, breadcrumbs, pagination;
5. tables, labels, badges, alerts, progress bars;
6. dropdowns, tooltips/popovers, and modals as React-owned DOM.

Each primitive lands only with real route consumers. No standalone component-library redesign is
introduced. Bootstrap fallback stays enabled until all six groups are green.

### Wave 3 — Shared Yobi UI modules

- `_common.less`, `_sprites.less`, `_yobiUI.less`;
- dense list rows, avatars, project/issue labels, count groups;
- shared error/empty/loading states;
- forms, editors' outer shells, and uploader chrome;
- `_responsive.less` rules in the same slice as their desktop owner.

Retire a LESS module from the generated fallback manifest only when every selector group in that
module has a green ledger row.

### Wave 4 — Route-family vertical slices

Process complete route families so shared shell/state coverage is not fragmented:

1. public/auth/setup;
2. user workspace/profile/settings;
3. project directory/create/import/fork/admin;
4. organization directory/home/members/settings;
5. issues and labels;
6. boards and milestones;
7. code/commit/compare/history;
8. pull request/review/change views;
9. search/notification;
10. site administration.

Within each family, migrate empty, loading, error, populated, permission-restricted, and mutation
result states before marking the family complete.

### Wave 5 — Content and plugin surfaces

- `_markdown.less`, code/diff syntax surfaces, tables, task lists, and attachments;
- Select2-equivalent React controls;
- Pikaday/date controls;
- Viewer/Magnific image surfaces;
- NProgress and any remaining plugin-visible DOM;
- `stylex.keyframes` for legacy animations that StyleX supports;
- icon-font usage only when an equivalent asset strategy preserves exact glyph geometry.

Plugin CSS is removed only with its last runtime consumer. This wave does not reintroduce legacy
plugin JS.

### Wave 6 — Fallback retirement

- Verify every ledger row is green and no active fallback module is unowned.
- Remove `yobi.css`, `usermenu.css`, Bootstrap, and Bootstrap responsive from the runtime bundle.
- Remove the LESS build dependency/script when it has no other consumer.
- Keep legacy sources under `yona-original/` as license/provenance evidence.
- Run the complete frontend E2E suite, production build, embedded Rust server smoke, and base-path
  deployment smoke.

Exit: deleting the generated fallback artifact changes no computed user-visible style in the
supported viewport/state matrix.

## 8. Verification matrix per slice

| Gate       | Required check                                                                      |
| ---------- | ----------------------------------------------------------------------------------- |
| Static     | `pnpm --dir frontend check`, lint/source guards, `git diff --check`                 |
| Build      | production Vite build and generated CSS layer inspection                            |
| Functional | focused Playwright interaction tests for the migrated states                        |
| Selector   | no test selector references the removed presentation class or StyleX hash           |
| Visual     | desktop and 390 px geometry/computed-style parity against the pre-slice baseline    |
| Cascade    | migrated StyleX declaration wins with fallback enabled                              |
| Fallback   | disabling the migrated StyleX declaration reveals the legacy value until retirement |
| Delivery   | `/`, configured base path, and Rust embedded assets resolve identical CSS/assets    |
| Provenance | ledger row names legacy file, selector, values, React owner, and tests              |

A slice is reverted if it requires unexplained numeric compensation, weakens a visible assertion,
or cannot identify the legacy source of a declaration.

## 9. Rollback strategy

Rollback is deliberately cheap during the incremental phase:

- revert the slice's StyleX props and selector changes together;
- keep the source module active in the legacy fallback manifest;
- regenerate the deterministic fallback artifact;
- do not add emergency `!important`, route-specific offsets, or an unlayered override sheet.

The lower legacy layer is the rollback path; it is not permission to leave partially migrated
components indefinitely.

## 10. Definition of done

The migration is complete only when:

- all frozen rule-emitting modules are retired from runtime fallback;
- Bootstrap and Bootstrap responsive are absent from `frontend/index.html` and built assets;
- `yobi.css` and `usermenu.css` are absent from runtime assets;
- every route family passes the state and viewport matrix;
- no E2E selector uses a StyleX hash or a retired presentation class;
- no component rule remains in the platform bridge;
- the fallback-deletion smoke produces no computed-style or screenshot change;
- canonical docs describe StyleX as runtime styling and frozen CSS/LESS as immutable provenance;
- README/NOTICE licensing and upstream Yona attribution remain intact.

## 11. First executable slice

After this plan is approved for execution, start only with Wave 0 and the existing transparent
root-boundary pilot. Do not begin broad component conversion until the layer precedence test,
generated fallback, production build, and base-path delivery are all green. The first visible
component slice should then be the root shell user menu because it owns `_usermenu.less`, has
desktop/mobile coverage, and can retire one bounded fallback module without touching unrelated
route families.
