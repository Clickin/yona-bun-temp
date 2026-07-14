# Frozen CSS/LESS to StyleX Migration Plan

Status: Wave 0 implemented; Wave 1 started, thirty-four user-menu slices complete
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

`frontend/src/theme.stylex.ts` is the canonical global StyleX variable entry and future theme
override boundary. Add typed variables only for exact legacy values used by migrated rules;
`stylex.defineVars` values must cite the source declaration or variable. Dark-mode values and a
toggle remain out of scope until legacy-equivalent requirements exist. Token work does not
authorize palette, typography, spacing, or naming changes.

Suggested minimal groups:

- typography and line height;
- Yobi orange/link/status colors;
- border colors and radii;
- responsive breakpoints;
- sprite/icon asset references that remain CSS-backed.

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
