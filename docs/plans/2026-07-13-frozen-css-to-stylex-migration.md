# Frozen CSS/LESS to StyleX Migration Plan

Status: Wave 0 implemented; Wave 1 started, eighteen user-menu slices complete
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
popover with its 280px left edge. The current React framed shell's desktop tab wrap and mobile
overflow clipping are recorded as separate outer-owner gaps and are not compensated in this
slice. This is not Wave 1 completion.

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
