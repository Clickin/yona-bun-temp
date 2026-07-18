# Frozen CSS/LESS to StyleX Migration Plan

Status: Wave 1 active; batch-worktree execution enabled after slice 224; theme-boundary correction complete
Date: 2026-07-14
Owner: frontend parity migration
Prerequisite: TanStack Router typecheck recovery and focused route-regression gates are green

Batch 308 applies the workflow to the authenticated loaded milestone detail label state. The
server-provided parent and child issue-label background colors now use route-local Dynamic StyleX
owners while legacy label classes, links, metadata, and geometry remain unchanged. The focused
milestone-detail label test covers the legacy partial, computed parent/child colors, no literal
inline background declarations, and mobile containment; live legacy visual parity remains
unverified.

Batch 302 applies the workflow to the authenticated project pull-request two-column state. The
conditional left search-column `display:none` declaration now uses a route-local StyleX variant
backed by the legacy `yona.twoColumnMode.js` hide behavior; dynamic row cursor and generated
popover placement remain state/plugin-owned fallback. The existing focused pull-request test
covers source evidence, conditional hide/show geometry, popover interaction, and desktop/mobile
containment.

Batch 300 applies the workflow to the authenticated board-post mobile metadata state. Its fixed `font-size:0.7em` declaration moved to route-local StyleX while legacy responsive classes and date output remain unchanged; the focused post-detail test covers desktop/mobile visibility, computed size, and containment.

Batch 301 applies the workflow to the authenticated user-settings avatar state. Fixed 128px avatar and 500px crop-preview dimensions moved to route-local StyleX while upload/crop state remains React-owned; the focused settings test covers source evidence, computed geometry, interaction, and desktop/mobile containment.

Batch 299 applies the workflow to the authenticated issue-detail mobile metadata state. Its fixed `font-size:0.7em` declaration moved to a route-local StyleX owner while the legacy responsive classes and date/state output remain unchanged; the focused issue-detail test covers desktop/mobile visibility, computed size, and containment.

Batch 297 applies the workflow to the public user profile project-list wrapper. Its fixed legacy `margin-left:10px` spacing moved to a route-local StyleX owner while project links, watch/leave actions, and responsive geometry remain unchanged; the focused profile E2E covers source evidence, computed spacing, interactions, and desktop/mobile containment.

Batch 295 applies the workflow to the authenticated pull-request changes ranged and non-ranged review-thread forms. Their fixed legacy `display:block` declarations moved to one route-local StyleX owner with separate stable markers; the `.review-form` hidden cascade, pending-block coordinates, and conditional review visibility remain documented fallback/state ownership. Focused Playwright passed 2/2 with desktop/mobile containment; live legacy visual parity remains unverified.

Batch 296 applies the workflow to the authenticated issue detail original-message toggle. The fixed legacy `border:0` declaration from `yobi.OriginalMessage.js` moved to the route-local StyleX owner while padding and React visibility interaction remain unchanged. Focused Playwright covers legacy Scala/JS evidence, computed borders, no inline border, toggle interaction, and desktop/mobile containment; live legacy visual parity remains unverified.


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

Slice count is an audit sequence, not a completion percentage. Progress reporting uses the
following outcome measures together: StyleX-owned route files, route files with reachable legacy
presentation classes, `app.css` responsibility, active generated-fallback bytes/lines, and fully
retired fallback modules. A large slice count with unchanged fallback modules must not be reported
as near completion.

The post-Batch226 execution snapshot is 34/116 route TSX files importing StyleX, 83/116 route TSX
files still containing `className` syntax, 7,865 `app.css` lines, and a 25,177-line /
526,260-byte generated fallback. No major Bootstrap, Yobi, usermenu, or plugin module is fully
retired. This supports a conservative 20–30% overall completion estimate and is the baseline the
next batch must improve.

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

### 4.2.1 Dynamic-style precedence

For runtime styling, prefer the least dynamic representation that preserves parity. Use
conditional StyleX first for boolean, finite-enum, pseudo-class, and media-query states. Use a
StyleX dynamic-style function only when a value cannot be enumerated at build time (for example a
server-provided percentage, color, or coordinate). Dynamic styles must not replace a conditional
variant; values that still lose to frozen/plugin cascade or change parity remain explicitly
documented fallbacks.

### 4.2.2 Theme-boundary correction gate

The theme-boundary correction gate is complete. The full inventory and all existing consumers were
audited before resuming route work. Future route batches must still preserve the same boundary:
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

## 5. Atomic migration unit and batch execution

Every route slice remains one user-visible route/state and lands as one route-scoped commit. A
slice should normally contain 4–6 independent owner types from that state; using 2–3 owners is
reserved for plugin DOM, shared-selector ambiguity, or an interaction whose failure cannot be
isolated from a larger group. The same route commit must contain all of the following:

1. legacy evidence: Scala template/partial, LESS/CSS selector, responsive rule, and relevant JS;
2. StyleX declarations with exact legacy values and all visible states;
3. `stylex.props(...)` on the React-owned elements;
4. removal of presentation-only legacy classes when no remaining behavior/test needs them;
5. E2E selector migration for that surface;
6. desktop and 390 px computed-style/geometry assertions;
7. interaction coverage for hover/focus/active/disabled/open/closed states as applicable;
8. exactly one Scala HTML audit row for that route/state;
9. focused E2E and fallback-precedence coverage that can participate in the batch gate.

Do not land “StyleX code now, selector/test cleanup later.” Do not update selectors without moving
the owning styles in the same slice.

### 5.1 Default operating mode: three-route worktree batch

The default execution unit is now a batch of three independent route/state slices, totaling
12–18 owner types. Two routes are acceptable when one state is unusually heavy; a single-route
batch requires a concrete reason such as shared-file ownership, plugin-generated DOM, or a
non-isolatable backend dependency. Do not grow a batch beyond the available worker slots merely to
reduce command count.

1. The main agent selects all batch targets before implementation and proves that their route
   TSX, focused E2E, route-local StyleX module, API contract, and legacy selector ownership do not
   overlap.
2. Create one branch-backed git worktree per route from the same clean base commit. Each worker is
   limited to its route TSX, route-local StyleX module, one focused E2E file, and exactly one Scala
   HTML audit row. Workers must not edit the shared plan or migration ledger.
3. Each worker reads its Scala HTML/partials/transitive LESS/JS/messages and captures one
   route-state desktop/mobile legacy baseline shared by all 4–6 owners. It writes the focused test
   before implementation and records a deterministic RED. The RED may be a fast source/ownership
   contract without starting the managed browser; browser RED is required only when the defect or
   interaction itself must be demonstrated. Browser GREEN remains mandatory.
4. Workers implement in parallel and run only cheap route-scoped checks: source ownership, focused
   static contract, TypeScript diagnostics for touched code when available, oxlint, oxfmt check,
   and `git diff --check`. They do not independently run the production build, full Vitest, or the
   full focused browser matrix by default.
5. The main agent runs the mandatory turn-commit hook in each worktree so each branch has a
   self-contained route commit. Subagents do not request approval and then exit; approval-bearing
   commit commands remain owned by the main agent.
6. Recreate a disposable integration worktree from the batch base and cherry-pick the three route
   commits. Resolve only mechanical append conflicts in the audit file; any implementation,
   selector, or ownership conflict disqualifies the affected route from that batch.
7. Start the managed runtime once and pass all focused E2E files to one Playwright invocation.
   Use the runner's route-level parallelism up to the three available worker slots unless a shared
   mutable fixture requires serialization. That invocation owns the batch's desktop/mobile
   geometry, interaction, fallback-equivalence, and screenshot gate. Run frontend typecheck,
   Vitest, production build, StyleX verifier, frozen hash check, and `git diff --check` once for the
   assembled batch.
8. If a route fails, rerun only its focused spec to diagnose it, amend that worker's route commit,
   recreate the disposable integration worktree, and rerun the assembled batch gate. Never weaken
   an assertion to keep the other routes green. Routes proven independent may land without a
   failed route rather than waiting for unrelated repair.
9. After the assembled gate passes, integrate the route commits in deterministic target order.
   Then add all corresponding migration-ledger rows and one batch status paragraph to the shared
   documentation in a single docs-only turn commit. The ledger rows still remain one per surface;
   only their write/verification timing is batched to prevent worktree conflicts.

The batch shares expensive work, not ownership. Each route keeps its own legacy evidence, stable
selectors, audit row, route commit, rollback boundary, and focused test. A batch must not combine
two states of the same route, shared component edits, backend contract edits, or consumers whose
legacy selector dependency is unresolved.

### 5.2 Batch acceptance and progress accounting

A batch is accepted only when every included route passes its focused assertions in the combined
Playwright invocation and the single assembled static/build gate is green. Report both route/state
results and the aggregate command result; a green route must not conceal a failed sibling.

After each batch, record these progress counters instead of deriving completion from the slice
ordinal:

- StyleX-owned route files / total route files;
- route files with reachable legacy presentation `className` consumers;
- `frontend/src/app.css` lines and identified remaining owner groups;
- generated legacy fallback bytes/lines and hash;
- fully retired Bootstrap/Yobi/usermenu/plugin modules;
- batch routes, owner types, elapsed browser/build invocations, and excluded failures.

The fallback hash can remain unchanged while individual consumers migrate because modules retire
only after their last consumer. Therefore an unchanged hash is neither failure nor progress proof;
the active-consumer inventory and module-retirement count are the authoritative evidence.

Batch 225 applied this workflow to three independent routes (14 focused tests in one Playwright
run, with route workers using isolated worktrees): pending secondary email, populated notification
table/switch, and organization creation form. Worker hooks and source contracts passed before
integration. After correcting downstream parity fixtures (dynamic CSRF, legacy table subtree
canonicalization, populated geometry baselines, and transition-stable focus sampling), the
assembled browser gate is GREEN 14/14. Typecheck, Vitest 11/11, lint/format/diff, production
build, StyleX verifier, and unchanged fallback hash `6417f445…16f` also pass.

Batch 226 applied the same workflow to three independent routes (8 focused tests in one Playwright
run): empty user-files search, organization delete confirmation, and organization members list.
The assembled browser gate is GREEN 8/8; typecheck, Vitest 11/11, lint/format/diff, production
build, StyleX verifier, and unchanged fallback hash also pass. The local user-files shell has a
documented shared-ancestry offset from the live Java shell; owner-local geometry remains exact and
no route-specific compensation was added.

Batch 227 applied the same workflow to `/orgs`, organization settings, and `/user/issues` in one
assembled Playwright invocation (5 focused tests, GREEN 5/5). The three workers added 12 route-local
paint owners, kept geometry/type values inline, and recorded one Scala audit row per route. The
assembled gate used 3 Playwright workers and completed in 13.5 seconds; the route-local setting
fixture required the parent organization container mock, and the mobile directory assertion allows
the browser's two-pixel scrollbar contribution without weakening visible containment. Typecheck,
format, and diff checks pass; the production build and fallback hash remain queued for the final
turn gate.

Batch 228 applied the batched workflow to project branches, project deletion confirmation, and the
populated milestone list. The assembled Playwright invocation used three workers and finished GREEN
6/6 in 13.8 seconds. The branch wave replaced unsupported pseudo selectors with a React-owned state
dot; delete and milestone fixtures were aligned to the `/api/v1/owners/**/projects/**` REST contract.
Typecheck, Vitest 11/11, format/diff checks, production build, StyleX verifier, and unchanged
fallback hash `6417f445…16f` all pass.

Batch 229 applied the same workflow to project VCS change, project transfer, and the populated fork
form. The assembled Playwright invocation used three workers and finished GREEN 6/6 in 14.3 seconds.
Typecheck, Vitest 11/11, format/diff checks, production build, StyleX verifier, and unchanged
fallback hash `6417f445…16f` pass. The batch also records the post-Batch228 delete-form viewport
assertion correction as a test-only follow-up; no route geometry compensation was added.

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

The two-hundredth slice migrates exactly six public stats/member owners in the authenticated
populated-default `/projects` state: the right-floated stats wrapper, members wrapper, member list,
repeated member item, avatar Link, and both count values. Final float/alignment/width, reset/list
geometry, 20px item rhythm, and 32px avatar box/margins stay literal in route `stylex.create`.
Only the avatar `#ddd` surface and count `#51aacc` paint enter route-local
`projectsDirectoryColors`. `pull-right`, `unstyled`, and the fully owned `members` class retire.
The `stats-wrap` class remains only because the separate frozen global `.stats-wrap i` rule still
visibly owns both icons' 16px size and 5px inline margins; `avatar-wrap` remains for its excluded
child-image rule and legacy `3px !important` radius. Focused source and runtime assertions pin both
fallback boundaries. Live desktop pins stats/members at `1271,307,85x60`, list at
`1271,307,85x35`, item/avatar at x1321 with 35/32px boxes, and the first count at
`1309.656,349`. Mobile preserves the same boxes at x305/x355 and y402, with the count at
`343.656,444`, the 151px row, and 390px scroll width. A genuine absent-owner RED is 0/3, focused
GREEN is 3/3, the affected matrix is GREEN 17/17, and complete `/projects` StyleX coverage is
GREEN 30/30. Live/local desktop and mobile captures were directly inspected. This is not Wave 1
completion.

The two-hundred-first slice migrates exactly two repeated residual owners in the same authenticated
populated-default `/projects` state: both stats icons and each member-avatar image. The icons now
own the frozen global `.stats-wrap i` 16px size and 5px inline margins; their generic Yobicon
font/display/line-height/glyph and `_common.less` `yobicon-middle` bottom alignment remain lower
fallback. Member images now own `_yobiUI.less .avatar-wrap img` 100% width and top alignment, with
no explicit height. Because the prior wrapper slice already owns every contextual stats declaration,
literal `stats-wrap` retires on this route. `avatar-wrap` remains solely for the excluded legacy
`3px !important` radius. No theme value, paint, height, compensation, or abstraction is added. Live
desktop pins the avatar/image to `1321,307,32x32` and icons to
`1288.656,348,16x16` / `1324.828,348,16x16`; mobile pins them to
`355,402,32x32` and `322.656,443,16x16` / `358.828,443,16x16`. A genuine
absent-owner RED is 0/3, focused GREEN is 3/3, and the affected matrix is GREEN 17/17. Target
regions in live/local desktop and mobile captures were directly inspected. This is not Wave 1
completion.

The two-hundred-second slice migrates exactly three pagination residual owners in the same
authenticated populated-default `/projects` state: the page-number input and previous/next sprite
icons. The input directly owns the contextual 30px content width, zero margin, centered bold text,
1px border, Firefox textfield appearance, and legacy hover/focus accent and inset shadow. Only its
border/accent/shadow paints enter route-local `projectsDirectoryColors`; Bootstrap and `_yobiUI`
continue to own the generic outer 44x30 box, padding/background, responsive font size, line height,
radius, vertical alignment, and default text. The two icons import the canonical Vite-owned sprite
and own generic icon display/background plus active/disabled positions and margins. Route literals
`input-mini`, `nospinner`, `ico`, `btn-pg-prev`, `btn-pg-next`, and icon `off` retire; disabled text
`off` and pagination wrapper/list/item classes remain fallback. React now renders the generated
pagination for one-page results as legacy pagination.js does instead of leaving `#pagination`
empty. Live desktop pins the root/input at `10,585,1346x30` / `581.375,585,44x30` and icons at
`499.641/740.344,595.5,6x9`; mobile pins them at `0,795,390x30` /
`93.375,795,44x30` and `11.641/252.344,805.5,6x9`. RED 0/4 becomes focused GREEN 4/4 and the
complete adjacent `/projects` matrix is GREEN 37/37. Target regions in live/local captures were
directly inspected. This is not Wave 1 completion.

The two-hundred-third slice migrates the remaining four visible pagination shell owner types in
the same state: root, list, five repeated items with exact variants, and previous/next labels.
Root flow, list reset/inline formatting, item 12px rhythm/padding, icon/delimiter variants, and
11px active/disabled label paint now live in route `stylex.create`. Only pagination text and
delimiter paint are added to route-local `projectsDirectoryColors`; the existing accent is reused.
`page-navigation-wrap`, `page-num`, `ikon`, `delimiter`, and label `off` retire. Literal
`page-nums` remains solely for frozen `_page.less` `margin-left:-120px !important`, which keeps
winning at desktop and mobile; StyleX owns every other list declaration. The legacy nth-child
branches match none of the fixed five generated nodes and are not recreated. Live desktop pins
root/list to `10,585,1346x30` / `494.641,585,256.703x30`, while mobile pins them to
`0,795,390x30` / `6.641,795,256.703x30`; all five item and two label boxes also match exactly.
RED 0/4 becomes focused GREEN 4/4 and complete adjacent `/projects` coverage is GREEN 41/41.
Target live/local captures were directly inspected. This is not Wave 1 completion.

The two-hundred-fourth slice migrates exactly three owners in the filtered-empty `/projects`
state: the empty-state wrapper, the error sprite icon, and the message paragraph. Route StyleX
owns the frozen `_page.less` 100px vertical padding and centered alignment, `_sprites.less`
inline sprite display/62x82 geometry/position, and the message's 30px margin plus 16px/700 type.
Only the dark-mode-eligible `#898989` message paint enters route-local
`projectsDirectoryColors`; all geometry and typography stay literal in `stylex.create`. This
route consumer retires `error-wrap`, `ico`, and `ico-err1`, while the corresponding global
fallback rules remain active for their many other route consumers. Verified Java desktop
1366x900 pins the wrapper/icon/message to `10,158,1346x362`, `652,258,62x82`, and
`10,370,1346x20`; 390px mobile pins them to `0,128,390x362`, `164,228,62x82`, and
`0,340,390x20` with no overflow. RED 0/3 becomes focused GREEN 3/3 and complete adjacent
`/projects` coverage is GREEN 44/44. Target live/local captures were directly inspected. This is
not Wave 1 completion.

The two-hundred-fifth slice migrates exactly two wrappers in the populated-default `/projects`
state: the outer page frame and its direct project-directory page. The outer owner directly owns
the frozen `_page.less` 450px minimum height and 10px top margin plus final `_responsive.less`
border-box/full-width padding and max-720 zero-padding/10px minimum. The inner owner owns the final
`@media all` full width and 5px top/auto-inline margin. No paint, theme variable, background,
`!important`, or compensating value is added. This route retires `page-wrap-outer` and
`project-page-wrap`; global fallback remains for other routes, and the unmatched nested label,
h4, nav-tab, and project-breadcrumb rules remain excluded. Verified Java desktop 1366x900 pins
the outer/inner to `0,108,1366x450` and `10,108,1346x373`; 390px mobile pins both to
`0,108,390x553`, with exact search/list containment and no overflow. RED 0/3 becomes focused
GREEN 3/3 and complete adjacent `/projects` coverage is GREEN 47/47. Target live/local captures
were directly inspected. This is not Wave 1 completion.

The two-hundred-sixth slice retires the final two populated-default `/projects` presentation-class
residuals: the pagination list's frozen `_page.less` `-120px !important` left offset and the member
avatar Link's frozen `_yobiUI.less` 3px radius. Both geometry values stay literal in the existing
route owners; no theme variable, paint, new `!important`, or compensating responsive value is
added. `page-nums` and `avatar-wrap` retire from this route, while their global fallback remains
for other consumers. The max-720 normal `page-nums` margin remains excluded because it loses to
the later important rule in the actual cascade. Verified Java desktop 1366x900 pins the list to
`494.641,451,256.703x30` and the three avatars to x1321/y173,264,355 at 32x32; 390px mobile pins
the list to `6.641,631,256.703x30` and avatars to x355/y238,389,540, with a 3px radius and no
overflow. RED 0/3 becomes focused GREEN 3/3 and complete adjacent `/projects` coverage is GREEN
50/50. Target live/local captures were directly inspected. This is not Wave 1 completion.

The two-hundred-seventh slice migrates exactly three populated-default `/projects` text owners:
the repeated project-title Link, repeated owner-profile Link, and repeated last-code-update span.
The two Links directly own the final Bootstrap plus `_common.less` anchor cascade: route-local
`#333333` title and reused `#999999` metadata base paint, route-local `#005580` hover/focus paint,
no outline, and underline only while interactive. The code-update owner moves `_common.less`
`.small-font` 10px/400 type while keeping 20px inherited rhythm explicit; all geometry and type
remain literals. This route retires `black`, `owner-name-small`, and `small-font`, while generic
anchor/small-font and organization/user consumers remain fallback. React now also preserves the
Scala template's always-present code-update span, including two empty `0x12` spans when no last
push exists, instead of conditionally deleting the element. Live Java desktop title Links are at
x80/y171,262,353, owner Links at x95.813/y221,312,403, and the visible update span is
`119.406x12 @180.953,404`; mobile moves them to x70/y171,322,473, x85.813/y221,372,523, and
`119.406x12 @170.953,524`, with no overflow. RED 0/3 becomes focused GREEN 3/3 and complete
adjacent `/projects` coverage is GREEN 53/53. Base and interactive live/local captures were
directly inspected. This is not Wave 1 completion.

The two-hundred-eighth slice completes exactly two repeated populated-default `/projects` stats
owners: the six member/watch icons and six numeric counts. The icon owner directly absorbs the
frozen `_common.less` `.yobicon-middle` bottom alignment and 3px bottom margin, so that helper
class retires from this route; `yobicon-friends` and `yobicon-eye` remain only for the Yobicon
font primitive and generated glyph content. The count owner directly absorbs Bootstrap `strong`
700 weight while retaining its existing route-local paint. No theme variable, new paint,
responsive compensation, or frozen source edit is introduced. Live Java desktop pins the icon
pairs to x1288.656/1324.828 at y214/305/396 and the counts to x1309.656/1349.422 at
y215/306/397; mobile pins them to x322.656/358.828 at y279/430/581 and x343.656/383.422 at
y280/431/582, with exact glyph, 16px icon boxes, count type, and no overflow. RED 0/3 becomes
focused GREEN 3/3 and complete adjacent `/projects` coverage is GREEN 56/56. Target live/local
captures were directly inspected. This is not Wave 1 completion.

The two-hundred-ninth slice completes four populated-default `/projects` identity residual owners:
the existing project-logo wrapper gains its frozen 3px radius, the repeated logo image owns its
100% box and top alignment, the private lock owns final `#7f8c8d`/14px output, and the project
label owns its frozen base and hover/focus presentation. Route-local variables contain only the
three dark-mode-eligible lock/label paints; all geometry and typography remain literal. The
route retires `owner-avatar-wrap`, `header`, `project-label`, and `yobicon-small`, restores the
Scala title-lock-label order, and retains only `yobicon-lock` for its generic icon-font/display
and `\e21e` glyph contract plus the semantic label-category class. Live Java desktop pins the
logo, lock, and label to `50x50 @10,216`, `14x14 @205.344,220`, and
`43.703x22 @223.781,216.656`; mobile pins them to `@0,246`, `@195.344,250`, and
`@213.781,246.656`, with exact paint/type/interaction and no overflow. RED 0/3 becomes focused
GREEN 3/3 and complete adjacent `/projects` coverage is GREEN 59/59. Target live/local captures
were directly inspected. This is not Wave 1 completion.

The two-hundred-tenth slice restores the authenticated populated `/projects` fork-origin branch
from Scala HTML and completes exactly two StyleX owners: the origin wrapper owns the frozen
10px/400/20px type and route-local `#5DBBE0` paint, while its project Link owns base and
hover/focus paint, decoration, and outline. The REST directory response now exposes `isForked`,
`originOwnerName`, and `originProjectName` by reusing the existing project-origin resolver, so the
React state is backed by a real fork rather than a display-only fixture. The route restores the
title-origin-lock-label order and retires `small-font`, `blue-txt`, and `origin-title`; only
`yobicon-split` remains for the generic icon-font/display/line-height and `\e450` glyph contract.
Live Java desktop pins the first row to `1346x94 @10,158`, header to
`266.547x23 @80,173`, origin wrapper/Link to `85.719x12 @179.047,180`, and icon to
`10x10 @179.047,181`. Mobile pins them to `390x154 @0,188`, `@70,203`,
`@169.047,210`, and `@169.047,211`, with exact base/interactive output and no overflow. Genuine
RED 0/3 becomes focused GREEN 3/3; the complete adjacent `/projects` matrix is GREEN 62/62 and
the real fork REST contract passes. Target live/local captures were directly inspected. This is
not Wave 1 completion.

The two-hundred-eleventh slice completes the authenticated populated `/projects` readable-row
residuals. Readable rows retire their `project` and `info-wrap` ancestry, the identity column moves
its literal left float from a React style attribute to a direct StyleX owner, and the search,
fork-origin split, friends, and eye icons directly own the frozen generic Yobicon declarations and
their exact glyphs. No theme variable is added because this slice contains only structure,
typography, and glyph content. The unreadable-row branch deliberately retains `project` and
`info-wrap`; `all-projects`, private-lock, and category consumers remain separate follow-up owners.
Live Java desktop pins the first readable row to `1346x94 @10,158`, identity to
`276.547x68 @70,173`, search to `12x12 @374,127`, split to `10x10 @179.047,181`, and stats icons
to x1286.406/1322.578 at y214. Mobile pins the row to `390x154 @0,188`, identity to `@60,203`,
search to `@187,162`, split to `@169.047,211`, and stats to x320.406/356.578 at y312 with
390px scroll width. Genuine RED 0/3 becomes focused GREEN 3/3; the complete `/projects` matrix is
GREEN 65/65. Target live/local captures were directly inspected. This is not Wave 1 completion.

The two-hundred-twelfth slice completes every reachable `/projects` presentation consumer. Legacy
controller and template control flow proves that the unreadable `else` cannot render under a
coherent setting: when private display is off, non-manager queries return only PUBLIC projects;
when it is on, the template's first condition always selects the readable branch; site managers
can read the private rows returned to them. The noncanonical React unreadable branch and its three
inline styles are therefore deleted instead of preserved as fixture-only behavior. The final list
retires `all-projects`, and the existing private-lock owner directly absorbs generic Yobicon output
plus `\e21e`, retiring `yobicon-lock`. No theme variable is added; the label category class remains
semantic filter data from the legacy model rather than presentation fallback. A live anonymous
private-display capture pins desktop list/first private row to `1346x642.656 @10,158` /
`1346x91`, with the 14px lock at `299.547,177`; mobile pins them to `390x882.656 @0,158` /
`390x91`, with the lock at `289.547,177` and no overflow. Focused GREEN is 3/3 and the complete
`/projects` matrix is GREEN 67/67. Target live/local captures were directly inspected. This is not
Wave 1 completion.

The two-hundred-thirteenth slice migrates the authenticated populated
`/user/editform/notifications` watched-project selector and pane visibility. Exactly five direct
owners cover the 220px floated/reset list, repeated 13px/8px items and selected state, repeated
block Links and selected hover, the overflow-hidden content, and repeated hidden/active panes.
Only selected `#51aacc` surface and white text are route theme variables; geometry and typography
remain literal. The route retires `unstyled lst-stacked span3 mr20`, item `active`, `tab-content`,
and pane `tab-pane active` from these owners while preserving the table, switch, and `notiUpdate`
fallback consumers. TanStack Links keep the exact hash href and suppress generated active markers
through the established URL-neutral explicit-undefined search pattern. Live Java desktop pins the
list to `220x72 @10,163`, content to `1106x1398 @250,163`, and active pane to
`1106x1378 @250,163`; mobile pins them to `220x72 @0,163`, `150x1622 @240,163`, and
`150x1602 @240,163`. The focused RED 0/3 becomes GREEN 3/3 and the nested-settings matrix is GREEN
4/4. The preserved whole-screen notification test remains 1/2 because its pre-existing global
GNB/sidenav/footer fixture predates their React-owned DOM/StyleX migrations; the new notification
subtree canonicalizes exactly. The parent `.page-wrap` 1080px bridge causes the recorded local
desktop x/width and available-height difference and is deliberately the next independent owner,
not compensated here. Typecheck, Vitest 11/11, theme guard, format/lint/diff, production build,
StyleX verification, and unchanged fallback hash `6417f445…16f` pass. This is not Wave 1
completion.

The two-hundred-fourteenth slice migrates the two shared page-wrapper owners used by all five
authenticated `/user/editform` states. The outer owner directly owns the frozen 450px minimum,
10px top margin, full width, border-box sizing, desktop 10px inline padding, and max-720 zero
padding/10px minimum; the inner owner owns auto margin and the white route surface. Every geometry
value remains literal and only the surface is a route theme variable. Retiring `page-wrap-outer`
and the direct `page-wrap` prevents the noncanonical React bridge from forcing this settings shell
to 1080px without overriding or deleting that fallback for other consumers. Live Java desktop
outer/inner are `1366x1456 @0,105` and `1346x1456 @10,105`, with tabs/body at x10 and body width
1346; mobile outer/inner are both `390x1680 @0,105`, with zero padding and 390px scroll width.
Local desktop now matches legacy x/width, restoring the Slice 213 project list/content to x10/x250
and widths 220/1106. The excluded breadcrumb keeps the pre-existing local y +1, and the native
checkbox table keeps its shorter height; neither is compensated. Genuine RED 0/4 becomes focused
GREEN 4/4, and the combined shell/project-tabs/nested-transition matrix is GREEN 11/11. The
unweakened broad notification fixture remains 1/2 solely at its older global GNB/sidenav/footer
expected DOM. Typecheck, Vitest 11/11, theme guard, format/lint/diff, production build, StyleX
verification, and unchanged fallback hash `6417f445…16f` pass. This is not Wave 1 completion.

The two-hundred-fifteenth slice migrates the three shared breadcrumb owners used by all five
authenticated `/user/editform` states. The outer owner owns the full border-box width, 10px inset,
and max-720 10px minimum; the centered inner owner and direct h3 owner preserve the exact
24.5px/700/30px type and `10px 10px 5px` rhythm. No theme variable is added because no independent
paint moves. Live Java desktop and mobile both pin a 45px boundary at y40, with x10 inner content
and exact 1366/390 widths. Retiring the two breadcrumb classes also makes the later React-only
ancestor bridge inapplicable without overriding it. Genuine RED 0/4 becomes focused GREEN 4/4;
five-route node persistence, token copy, exact computed output, fallback equivalence, screenshots,
typecheck, and scoped format/lint/diff pass. This is not Wave 1 completion.

The two-hundred-sixteenth slice migrates exactly five password-form owners on authenticated
`/user/editform/password`: form, dl, repeated dt, repeated dd with the evidenced 10px field
spacing, and repeated password inputs. Only input surface/text/border/focus paint enters the
route-owned theme; every size, spacing, and font declaration stays literal. Field `mt10` retires,
while submit/reset buttons, the reset section, and validation popovers remain independent
consumers. Authenticated live Java desktop/mobile evidence pins the 206px content-width inputs,
30px boxes, dt/dd rhythm, focus output, and max-720 16px input type. Genuine RED becomes focused
GREEN 4/4 with validation, CSRF mutation, redirect, screenshots, typecheck, and scoped
format/lint/diff green. This is not Wave 1 completion.

The two-hundred-seventeenth slice migrates exactly three owners on authenticated
`/user/editform/emails`: the add form, input, and add action. The route theme contains only their
surface/text/border/shadow-color paint; form geometry, the 384px desktop/inherited mobile input,
font metrics, and the source-derived `.3em` action margin remain literal. The six presentation
classes on this subtree retire while the table, rows, row actions, labels, and icons stay separate.
Live Java desktop pins form/input/action to `1346x30 @10,206`, `398x30 @10,206`, and
`50.234375x30 @415.78125,206`; mobile pins `390x30 @0,206`, `187x30 @0,206`, and the action at
`194.78125,206` with no overflow. Genuine RED 0/3 becomes focused GREEN 3/3; focus, hover,
POST/CSRF/reset, screenshots, typecheck, and scoped format/lint/diff pass. This is not Wave 1
completion.

The two-hundred-eighteenth slice migrates the shared five-tab strip across all authenticated
`/user/editform` states. Exactly three owner types cover the root list, repeated items, and
repeated TanStack Links, including base, selected, hover, focus, clearfix, and max-720 output.
`userSettingsTabColors` contains only route-owned surface/text/border paint; spacing, sizing,
border geometry, and typography remain literal in `stylex.create`. Only `nav nav-tabs mt20` and
selected-item `active` retire. Live Java desktop pins the root to `1346x38 @10,105` with
`8px 30px` links; mobile pins it to `390x38 @0,105`, one row, and `8px 5px` links. Genuine RED
0/4 becomes focused GREEN 4/4, and the combined settings gate is GREEN 16/16. This is not Wave 1
completion.

The two-hundred-nineteenth slice migrates the authenticated `/user/editform/emails` table shell.
Exactly three owner types cover the table, repeated identity cells, and repeated action cells.
StyleX owns only Bootstrap's generic table root, `.table`, `.table td`, `_common.less .mt20`, and
the two legacy inline alignment declarations; `emailTableColors` contains only the `#dddddd` row
border paint. Avatars, email text, primary badge, buttons, widths, and validation icon remain
independent fallback consumers. The stale runtime avatar string is replaced by the existing
Vite-owned legacy asset import without adding an avatar style owner. Actual live Yona has only the
primary row: desktop is `1346x57 @10,338` with `1276.25/69.75` cells, and mobile is `390x57
@0,378` with `369.78125/20.21875` cells. Secondary rows are verified only against the frozen
Scala/CSS fixture and are not represented as live evidence. Focused RED 3/3 becomes GREEN 3/3;
combined table/add-form browser coverage is GREEN 6/6. This is not Wave 1 completion.

The two-hundred-twentieth slice migrates exactly the three visible identity owners in the actual
primary-only `/user/editform/emails` row: avatar, primary address, and primary badge. Bootstrap's
modern-browser `img` output, `strong` weight, `_common.less` `.ml10`/`.vmiddle`, and the complete
`_page.less .label-head` output move to their direct owners. Only badge text/surface/border paint
enters route-local `emailPrimaryBadgeColors`; geometry, spacing, type, and border structure stay
literal. The primary `ml10` and `label-head vmiddle ml10` classes retire, while secondary rows,
their identity content, all row actions, and mutations remain unchanged. IE-only `width:auto\9`
and `-ms-interpolation-mode` remain frozen fallback evidence because they have no modern StyleX
runtime effect. Genuine RED 2/2 becomes GREEN 2/2; exact desktop/mobile live geometry, fallback
equivalence, screenshots, and adjacent table/add-form coverage pass. This is not Wave 1 completion.

The two-hundred-twenty-first slice migrates the two visible description-boundary owners in the
same actual primary-only `/user/editform/emails` state: the separator HR and two-line description
P. The HR owns Bootstrap's final 20px block margin, zero side borders, and 1px top/bottom borders;
only the `#eeeeee`/`#ffffff` border paint enters route-local
`emailDescriptionSeparatorColors`. The P owns the later winning `_common.less` reset
`margin:0; padding:0`; Bootstrap's earlier `margin-bottom:10px` is recorded only as overridden
cascade evidence and is not applied. The BR, copy/order, add form, table, identity, secondary rows,
and actions remain unchanged. Genuine RED 2/2 becomes GREEN 2/2; all adjacent email StyleX
coverage is GREEN 10/10 with exact desktop/mobile live geometry, fallback equivalence, and
screenshots. This is not Wave 1 completion.

The two-hundred-twenty-second slice migrates exactly five visible action-boundary owners in the
authenticated `/user/editform/password` state: submit button, separator HR, reset section, reset
action row, and reset Link. The complete live `.ybtn` base/interaction output moves to both action
owners and `.ybtn-success` paint moves to the submit owner; undeclared `.ybtn-fail` contributes no
rule. The two `_common.less .mt10` consumers and Bootstrap HR output move to their direct owners.
`passwordActionColors` and `passwordSeparatorColors` remain separate paint-only route registries;
geometry, type, spacing, and border structure stay literal. The two ybtn class sets and two mt10
classes retire only from this state. Shared ybtn, generic HR/element reset, reset DL/DT, fields,
validation popovers, and other consumers remain frozen fallback or independent owners. Genuine
RED on the missing submit owner becomes focused GREEN 4/4 and the existing password-form suite is
GREEN 4/4. Authenticated live/local desktop and mobile action geometry, paint, interaction,
wrapping, screenshots, validation, and reset SPA navigation pass. The broad password screen test
still reaches its pre-existing global-shell canonical DOM mismatch after the new owner boundary
passes. This is not Wave 1 completion.

The two-hundred-twenty-third slice migrates the remaining three reset-list skeleton owners in the
same authenticated `/user/editform/password` state: classless DL, direct DT, and the existing DD.
No new style or theme registry is introduced. The route reuses its already-evidenced list, term,
and spaced-description StyleX props, deletes the redundant margin-only reset-description style,
and thereby owns Bootstrap line-height/weight plus the later winning `_common.less` zero
margin/padding output. Shared generic DL/DT/DD fallback remains for other consumers. Genuine RED
on the absent reset-list owner becomes focused GREEN 4/4; Slice 222 actions and the existing form
remain GREEN 8/8. Authenticated live/local desktop and mobile copy, order, wrapping, exact
geometry, screenshots, and reset SPA navigation pass. This is not Wave 1 completion.

The two-hundred-twenty-fourth slice migrates the three repeated validation-bubble owner types in
the authenticated `/user/editform/password` empty-submit state: root, right arrow including its
generated inner arrow, and content. Live Bootstrap plugin output proves that the previous React
class-only bubbles remained `display:none` with zero boxes; React state plus StyleX now translates
the plugin's right-placement algorithm and exact `display:block` output without DOM mutation.
`passwordValidationColors` contains only surface, border, arrow-border, and shadow paint; all
position, geometry, type, transition, and border structure stay literal. This state retires
`popover fade right in`, `arrow`, and `popover-content`; other placements, title-bearing popovers,
and unrelated plugin consumers remain fallback. Genuine RED on absent ownership and invisible
zero-size output becomes focused GREEN 4/4; actions/form/reset-list remain GREEN 12/12. Live/local
desktop and mobile root/arrow/content geometry, pseudo paint, screenshots, blur updates/clear,
empty-submit mutation blocking, and successful password behavior pass. This is not Wave 1
completion.

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

The earlier direct-grid slice migrated only the four management layout owners for authenticated
populated-open `/sites/issueList?state=open`: `.site-setting-wrap`, its direct `.row-fluid`, direct
`.span2`, and direct `.span10`. Colocated StyleX reproduces Bootstrap 2.3.1 clearfix, percentage
columns, gutter, and box model without theme variables. Later authenticated live inspection proved
that `bootstrap-responsive.css` is manifest-declared reference-only/inactive and the actual mobile
layout remains side-by-side. Slice 156 therefore removes the unsupported max-767 stacking
overrides while preserving the direct owner boundaries and all React/TanStack behavior.

The following breadcrumb slice migrates only the three management breadcrumb owners for
authenticated populated-open `/sites/issueList?state=open`: `.site-breadcrumb-outer`,
`.site-breadcrumb-inner`, and the direct `h3` from `site/siteMngLayout.scala.html`. Colocated
StyleX reproduces the Bootstrap 2.3.1 heading defaults plus frozen `_page.less` and
`_responsive.less` spacing, width, box model, and max-720 minimum width without theme variables.
Only the two breadcrumb presentation classes retire; page wrap, management grid, sidebar, and
content remain outside this slice. Official authenticated legacy captures at 1366x900 and 390x844
return 200 with zero errors and horizontal overflow, preserve heading text at x=20, and place the
following page wrapper at y=138. The focused local desktop/mobile screenshots were visually
compared with those captures: the owned 20px heading start, 45px heading rhythm, full outer width,
and 10px inner inset match; locale, fixture data, and excluded shell/grid owners are not attributed
to this breadcrumb slice.

The one-hundred-fifty-third slice applies the same strictly bounded management-breadcrumb
retirement to authenticated populated `/sites/postList`. Exactly three route-local StyleX owners
replace outer `.site-breadcrumb-outer`, inner `.site-breadcrumb-inner`, and the direct `h3` using
the verified Bootstrap 2.3.1, `_page.less`, and `_responsive.less` declarations inline, without a
theme registry. Only the two wrapper classes retire; page wrap, management grid/sidebar,
title/list/rows/metadata/pagination, and other site-admin consumers remain excluded. The focused
test uses one browser process for desktop 1366x900 and mobile 390x844, an independent ShadowRoot
frozen fallback, and local screenshots compared with the authenticated legacy breadcrumb captures.
Source RED on absent owners becomes focused GREEN 2/2. The generated desktop/mobile screenshots
were visually compared with the authenticated legacy captures: the owned x=20 heading start,
45px heading box/rhythm, full width, and 10px inset match. Locale, fixture content, and excluded
shell/grid owners remain outside this visual claim. After correcting two stale source expectations,
the complete post-list StyleX matrix is GREEN 36/36. Whole-screen post-list is GREEN 7/8; its only
failure is the pre-existing excluded global-GNB `Feedback` gap and is not caused by the breadcrumb.

The one-hundred-fifty-fourth slice migrates only the authenticated populated `/sites/postList`
direct management grid to four colocated owners. Active `bootstrap.css` and `_page.less` supply
the centered wrapper, clearfix, fixed percentage columns, and gutter; manifest-declared
reference-only/inactive `bootstrap-responsive.css` is not migrated. Both 1366x900 and 390x844
retain side-by-side columns, matching live post-list x=239/width=1117 and x=76/width=314 evidence
without horizontal overflow. Only the direct `site-setting-wrap`, `row-fluid`, `span2`, and
`span10` classes retire; breadcrumb, nested post-row `row-fluid`, and all child owners remain.
Focused GREEN is 2/2. Local desktop/mobile grid screenshots were visually compared with the
authenticated legacy baseline and sweep: desktop grid width 1346 with content near x=239 and list
width near 1117; mobile grid width 390 with content/list near x=66/x=76 and list width near 314.
Side-by-side geometry and no overflow match. Locale, fixture content, and excluded GNB/footer are
outside this claim. The complete post-list StyleX matrix is GREEN 38/38. Whole-screen post-list is
GREEN 7/8 with only the pre-existing excluded global-GNB `Feedback` gap, unrelated to this grid.

The one-hundred-fifty-fifth slice migrates exactly two independent `/sites/postList` owners. The
direct page wrapper owns `_page.less` 450px minimum height/10px top margin plus the final
`_responsive.less` all-viewport box model and max-720 zero padding/minimum width. The existing
repeated row owner absorbs only Bootstrap base `.row-fluid` width and clearfix pseudos. This route
retires only `page-wrap-outer` and the post-row `row-fluid`; other consumers retain global fallback.
Focused source RED becomes GREEN 2/2. The complete post-list StyleX matrix is GREEN 40/40 with a
normal exit using `CI` workers=1. Whole-screen post-list is GREEN 7/8; its sole failure is the
pre-existing excluded global-GNB `Feedback` fixture gap, unrelated to wrapper/row. New local
desktop/mobile screenshots were visually compared with authenticated legacy captures: page
inset/content x and row x/width/height/flow match; locale and excluded global shell/footer copy differ.

The one-hundred-fifty-sixth slice migrates and corrects exactly five authenticated populated-open
`/sites/issueList?state=open` owner responsibilities: the page wrapper, shared management-column
base, sidebar column, content column, and repeated issue row. The new page owner reproduces
`_page.less` 450px minimum height/10px top margin plus `_responsive.less` all-viewport box model
and max-720 zero padding/minimum width. The row owner absorbs only active Bootstrap 2.3.1 base
`.row-fluid` width and clearfix pseudos while preserving prior paint/content owners. Fresh live
desktop/mobile inspection corrects the earlier unsupported max-767 column stacking: the runtime
manifest keeps `bootstrap-responsive.css` reference-only/inactive, so both viewports retain the
base 14.893617% sidebar, 2.127659% gutter, and 82.978723% content column. Only this route's
`page-wrap-outer` and repeated issue-row `row-fluid` retire; the already-retired direct grid/span
classes remain absent. Legacy captures establish desktop wrapper `1366×450`, content/row
`x239.078/1116.891`, and mobile wrapper observed at `390×611` with side-by-side content/row
`x66.375/76.375` and `323.609/313.609` widths; the 611px mobile height is intrinsic evidence, not
an owner-enforced local value. In the valid focused RED progression, the static contract passed;
runtime first stopped on a redundant computed-width string precision check and then on raw
percentage-to-pixel gutter rounding. Both assertions were corrected without weakening the exact
bounding-rect or ratio gates, after which focused GREEN is 2/2 with a normal exit. The complete
issue-list StyleX matrix is GREEN 46/46 with `CI` workers=1 and a normal exit. Whole-screen coverage
is GREEN 7/8; its sole failure is the pre-existing excluded global-GNB `Feedback` fixture gap,
unrelated to these owners. Visual inspection of authenticated legacy
`legacy-issue-list-page-row-shell-{desktop,mobile}.png` against local
`stylex-site-issue-list-page-row-shell-{desktop,mobile}.png` confirms matching desktop/mobile
side-by-side grid, page inset/content x, and row x/width/wrapping/flow. Locale, assets, global shell,
and footer copy remain outside this claim.

The one-hundred-fifty-seventh slice migrates exactly five authenticated populated-ACTIVE
`/sites/userList` management-shell owners: the page wrapper, centered setting wrapper, direct
clearfix grid, sidebar column, and content column. `site/siteMngLayout.scala.html`, included
`site/userList.scala.html`, active Bootstrap 2.3.1 base, `_page.less`, and `_responsive.less`
supply the complete geometry; the manifest-declared `bootstrap-responsive.css` remains
reference-only/inactive. All dimensions and spacing are colocated inline StyleX declarations with
no theme variable or new abstraction. Only `page-wrap-outer`, the direct `row-fluid`, and direct
`span2`/`span10` retire. `site-setting-wrap` remains solely because excluded descendant fallback
selectors still consume it; breadcrumb, title/search, tabs, listhead, rows, pagination, modal, and
sidebar internals remain independent. Authenticated legacy captures establish desktop page/grid
`1366/1346px`, sidebar/content `200.453/1116.891px`, and mobile side-by-side grid `390px` with
sidebar/content `58.078/323.609px` and an `8.297px` gutter. Focused RED first proved the five
owners absent; runtime follow-up isolated pre-existing English action-button and hidden-modal
overflow from the five-owner boundary, after which exact owner containment, clearfix, percentages,
and screenshots are GREEN 2/2. The complete user-list StyleX matrix is GREEN 13/13. Whole-screen
coverage is GREEN 15/16; its sole failure is the pre-existing excluded global-GNB `Feedback` gap.
Authenticated legacy/local desktop and mobile screenshots visually match the owned page inset and
side-by-side management grid. Locale, fixture copy/data, excluded descendants, global shell, and
footer remain outside this claim.

The one-hundred-fifty-eighth slice migrates only the three authenticated populated-ACTIVE
`/sites/userList` management-breadcrumb owners. `site/siteMngLayout.scala.html`, included
`site/userList.scala.html`, the full `yobi.less` chain, and active Bootstrap 2.3.1 establish the
direct `DIV > DIV > H3` skeleton and final cascade. Colocated StyleX moves only declarations lost
when this route retires `site-breadcrumb-outer` and `site-breadcrumb-inner`: outer full-width
border box, 10px inline padding and max-720 minimum width; centered inner margin; and the direct
heading's 10/10/5px padding plus 30px line height. Generic `h3` font family, 24.5px size, 700
weight, color, zero margin, and forced-auto text rendering remain frozen fallback-owned for their
shared consumers. No theme variable or abstraction is added. Fresh authenticated legacy evidence
pins desktop `0,83,1366×45` and mobile `0,83,390×45` outer boxes, 10px inner insets, heading
height 45, and page start `y=138`. Source RED is 0/1 on the absent owners. Post-implementation
runtime first exposed only two excluded whole-screen offsets: the existing 23px mobile GNB height
delta and the independently proven 3px English action-row overflow. The focused gate therefore
keeps exact desktop absolute y/document width while using exact owner-local mobile viewport
containment and breadcrumb-to-page spacing; focused GREEN is 2/2 and the complete user-list StyleX
matrix is GREEN 15/15. Whole-screen is GREEN 15/16 with only the pre-existing excluded global-GNB
`Feedback` gap. Authenticated legacy/local screenshots confirm the owned x=20 heading start, 45px
rhythm, full width, 10px inset, and following-page spacing; locale, fixture content, excluded GNB,
rows, footer, and their offsets remain outside this claim.

The one-hundred-fifty-ninth slice migrates exactly three authenticated populated-ACTIVE
`/sites/userList` state-tab responsibilities: the list root, repeated item, and repeated link with
selected, hover, focus, and max-720 responsive states. `site/userList.scala.html`, active Bootstrap
2.3.1, `_yobiUI.less`, and `_responsive.less` provide the complete DOM and cascade evidence.
Route-scoped `siteUserListColors` owns only the six paint values; all spacing and geometry remain
inline in the StyleX declarations. This consumer retires `nav`, `nav-tabs`, and item `active`,
replacing selection with stable `data-selected`; the separately excluded `.num-badge` remains a
real frozen fallback consumer. Fresh authenticated legacy evidence pins desktop tabs at
`239.078,206,1116.891×38` with 30px inline link padding and mobile tabs at
`66.375,216,323.609×75`, wrapping three-plus-two with 5px link padding. Focused source RED is 0/1.
Runtime review first exposed a stale copy expectation, two earlier route-wide test guards, an
active-border shorthand/longhand conflict, and hover state leakage in the fallback fixture; each
was corrected without weakening owner geometry or cascade assertions. The focused state-tab gate
is GREEN 2/2. Together with the preceding 16 passing user-list StyleX cases, the complete matrix is
GREEN 17/17. Whole-screen coverage remains GREEN 15/16 with only the pre-existing excluded global
GNB `Feedback` fixture gap. Authenticated legacy/local desktop and mobile screenshots match the
owned tab box, wrapping, padding, paint, and listhead rhythm; locale, fixture data, global shell,
rows, and footer remain outside this owner claim.

The one-hundred-sixtieth slice migrates exactly two authenticated populated-ACTIVE
`/sites/userList` list-header responsibilities: the header root and its four repeated grid
columns. `site/userList.scala.html`, active Bootstrap 2.3.1, and `_page.less` provide the DOM,
clearfix, fluid-column percentages/gutter, padding, line height, surface, and border evidence.
Only the route-scoped surface and border paint use `siteUserListColors`; widths, gutter, spacing,
and box model remain inline StyleX declarations. This consumer retires `row-fluid`, `listhead`,
`span2`/`span3`/`span4`, and `listhead-title`, while other consumers retain the generic frozen
fallback. Fresh authenticated legacy evidence pins the desktop root at
`239.078,264,1116.891×41`, with `23.75px` gutters and 30px columns. At 390px the same percentages
and `6.875px` gutters remain; localized copy alone changes column wrapping and root height, so the
mobile gate preserves exact owner-local geometry and tab-to-header rhythm without attributing the
excluded global-GNB offset to this owner. Focused source RED 0/1 becomes GREEN 2/2. After stale
consumer selectors were moved to stable owner boundaries, the complete user-list StyleX matrix is
GREEN 19/19. Whole-screen coverage is GREEN 15/16 with only the pre-existing excluded global-GNB
`Feedback` gap. Typecheck, Vitest 11/11, production StyleX build, unchanged frozen/app/manifest
hashes, TS/TSX-only formatting, lint with zero errors, screenshots, visual inspection, and diff
gates pass. Authenticated legacy/local screenshots match the owned header paint, percentages,
gutter, padding, border, and rhythm; locale, fixture rows, global shell, and footer remain outside
this claim.

The one-hundred-sixty-first slice migrates exactly two authenticated populated-ACTIVE
`/sites/userList` responsibilities: the `UL` list style and repeated `LI` row shell. The legacy
template, `_common.less`, `_page.less`, and active Bootstrap 2.3.1 establish list-style removal,
full-width clearfix rows, the 1px bottom border, 70px line height, and alternating surface. Only
the row border and alternate-surface paint use route-scoped `siteUserListColors`; width,
line-height, border structure, and clearfix stay inline. The `user-list-wrap` and row
`row-fluid listitem` classes deliberately remain: excluded child span-grid, avatar, name, id, and
column selectors still require those ancestors. They may retire only with those child-owner waves.
Fresh authenticated legacy evidence records a desktop list at `239.078,310,1116.891×333` with
three 111px rows and a mobile list at `66.375,417,323.609×729` with three 243px rows. The local
English fixture keeps the same owned placement, width, paint, line height, clearfix, adjacency,
and containment while excluded action/copy descendants produce 115px desktop and 223px mobile
rows. Focused source RED is 0/1 and browser GREEN is 2/2. Visual review caught and rejected an
intermediate false green where fixed `className` props replaced generated StyleX classes and
removing the ancestry collapsed the child grid; the final test proves both higher-layer StyleX
ownership with ancestry temporarily removed and preserved legacy child geometry with ancestry
restored. The complete user-list StyleX matrix is GREEN 21/21, and whole-screen coverage is GREEN
15/16 with only the pre-existing excluded global-GNB `Feedback` gap. Typecheck, Vitest 11/11,
production StyleX build, unchanged frozen/app/manifest hashes, TS/TSX-only formatting, lint with
zero errors, inspected screenshots, and diff gates pass. This is not Wave 1 completion.

The one-hundred-sixty-second slice migrates five tightly coupled authenticated populated-ACTIVE
`/sites/userList` responsibilities: the identity, email, date, and action columns plus the ACTIVE
row's Bootstrap grid ancestry. `site/userList.scala.html`, active Bootstrap 2.3.1, `_page.less`,
and fresh authenticated legacy computed evidence establish the two 23.404255% columns, the
14.893617% date column, the 40.425532% action column, 2.12766% gutters, common column typography,
email typography, and the canonical action wrap. Every geometry, spacing, and typography value is
inline in route-local `stylex.create`; this slice adds no paint or theme variable. ACTIVE rows
retire `row-fluid`, `span3`/`span2`/`span5`, `listitem-col`, and `created-date`. `listitem` and
`user-list-wrap` remain for the excluded avatar/name/id descendants, `action-buttons` remains for
its excluded descendant fallback, and DELETED rows retain `row-fluid` for their excluded `span4`
branch. Fresh legacy desktop widths are `261.391/261.391/166.344/451.5px` with `23.75px` gutters;
at 390px they are `75.734/75.734/48.188/130.813px` with `6.875px` gutters. Exact action height and
vertical position are intentionally content-relative because local action controls and localized
date copy remain excluded; structural wrap, owner declarations, widths, gutters, and containment
are exact. Focused browser coverage is GREEN 2/2 and the complete user-list StyleX matrix is GREEN
23/23 after stale ancestry selectors move to stable owner boundaries. This is not Wave 1
completion.

The one-hundred-sixty-third slice migrates five coupled populated-ACTIVE `/sites/userList`
identity responsibilities: obsolete list and row ancestry, the 45px list-avatar override, user
name, and user ID. Only the legacy `#0088cc` name and `#999` ID paint use route variables; all
geometry and typography remain inline. ACTIVE retires `user-list-wrap`, `listitem`, `list-avatar`,
`user-name`, and `user-id`, while generic `avatar-wrap` remains for its shared background, radius,
overflow, and image rules. DELETED retains `row-fluid listitem` for its excluded recovery column.
Fresh legacy desktop/mobile evidence pins the wrapper at 45×45, the exact 5px text inset, 20px
line rhythm, paint, and content-aware wrapping. Focused browser coverage is GREEN 2/2. The local
default-avatar fixture's unresolved base-path URL yields a 16px broken-image intrinsic box, so
the gate preserves the frozen image source rule and exact wrapper geometry without adding numeric
compensation. This is not Wave 1 completion.

The one-hundred-sixty-fourth slice migrates the authenticated populated-ACTIVE
`/sites/userList` pagination generated by legacy `yobi.Pagination.js`. Route-local owners cover
the populated root, five-item list, repeated item variants, number input interaction states, and
labels. Only text/accent/delimiter/input-border paint and the semantic inset focus shadow use
`siteUserListColors`; layout, spacing, dimensions, and typography remain inline. This consumer
retires `page-navigation-wrap`, `page-nums`, `page-num`, `ikon`, `delimiter`, and label `off`, while
retaining `#pagination`, generic `input-mini nospinner`, and sprite `ico btn-pg-prev/next off`
fallbacks. Authenticated ko-KR legacy captures establish the desktop/mobile output and a
256.703px aggregate list; the en-US fixture is wider solely because of visible copy, so the browser
gate compares exact declarations and dimensions against an identical frozen fallback fixture
instead of imposing a cross-locale width. Focused browser coverage is GREEN 3/3, and the complete
user-list StyleX matrix is GREEN 28/28 after stale presentation selectors move to stable owners.
Whole-screen coverage is GREEN 15/16 with only the pre-existing excluded global-GNB `Feedback`
fixture gap.
This is not Wave 1 completion.

The one-hundred-sixty-fifth slice migrates the authenticated populated-ACTIVE
`/sites/userList` site-management sidebar navigation from `site/siteMngLayout.scala.html` and the
frozen `.site-setting-wrap .site-setting-nav` cascade. Exactly three route-local owners cover the
UL, repeated LI default/first/active variants, and direct Links. Neutral border, hover surface, and
active border are route paint variables; list geometry, border width/style, typography, spacing,
and text decoration remain inline. This route retires `site-setting-nav`, LI `active`, and empty LI
classes while preserving eight-link copy/order/hrefs, TanStack active-marker suppression, stable
`data-selected`, and the independently owned `notification-badge`. Frozen fallback equivalence and
fresh baseline screenshots pin desktop and 390px wrapping. Hover keeps the legacy neutral surface,
active hover stays transparent, and focus keeps the final global anchor underline/color cascade
without inventing a focus surface. Focused browser coverage is GREEN 2/2, the complete user-list
StyleX matrix is GREEN 30/30, and whole-screen coverage is GREEN 15/16 with only the pre-existing
excluded global-GNB `Feedback` fixture gap. This is not Wave 1 completion.

The one-hundred-sixty-sixth slice migrates the authenticated populated-ACTIVE
`/sites/userList` repeated row-action controls from `site/userList.scala.html`, `_page.less`,
`_yobiUI.less`, and Bootstrap 2.3.1 label paint. One repeated semantic-button owner covers the
default, success, info, label-info, and danger variants together with hover, focus, and active
states; route-local variables contain only paint, border, text, and shadow values while geometry,
type, transition, and the legacy five-anchor 2px margin remain inline. ACTIVE retires the
`action-buttons`, `ybtn`, `ybtn-small`, `ybtn-success`, `ybtn-info`, `ybtn-danger`, and `label-info`
presentation classes for these controls, while the separate delete modal keeps its independent
`ybtn` consumer. The browser gate exposed and corrected the prior React omission that applied the
legacy anchor margin to only three controls, plus a StyleX atomic collision that left label-info
blue during interaction. Base output is exact against a complete frozen-ancestry fixture; colored
interaction states are pinned directly to the frozen cascade where the temporary unlayered
`app.css` bridge would otherwise contaminate the fixture. Desktop/mobile relative geometry,
content-driven narrow overflow, all five variants and states, CSRF-backed guest mutation, and the
delete modal boundary pass. Focused coverage is GREEN 2/2, the cumulative user-list StyleX matrix
is GREEN 32/32, and whole-screen coverage is GREEN 15/16 with only the pre-existing excluded
global-GNB `Feedback` fixture gap. This is not Wave 1 completion.

The one-hundred-sixty-seventh slice migrates the authenticated populated-ACTIVE
`/sites/userList` title-search form, wrapper, input, and submit control from
`site/userList.scala.html`, `_yobiUI.less`, `_responsive.less`, and Bootstrap 2.3.1. Fresh
authenticated live legacy Chrome evidence corrected the input to the actual 2px radius, no
shadow, Helvetica Neue 12px desktop/16px mobile output and orange focus border; route variables
contain only surface, border, focus-border, and text paint while every geometry, type, transition,
and responsive value remains inline. The form and three direct child owners retire `form-search`,
`pull-right`, `search-bar`, `textbox`, and `search-btn`; only the independent `yobicon-search`
glyph primitive remains. The focused browser gate is GREEN 2/2, cumulative user-list StyleX is
GREEN 34/34 after stale selectors move to stable owner boundaries, and whole-screen coverage is
GREEN 15/16 with only the pre-existing excluded global-GNB `Feedback` fixture gap. This is not
Wave 1 completion.

The one-hundred-sixty-eighth slice migrates the authenticated populated-DELETED
`/sites/userList` repeated row and leave-date column from `site/userList.scala.html`, active
Bootstrap 2.3.1, and `_page.less`. The existing row owner now covers DELETED without conditional
legacy ancestry, while a direct leave-date owner composes the existing common column declarations
with the frozen span4 width; all geometry and type remain inline and no theme value is added.
DELETED retires row `row-fluid listitem` and leave `span4 listitem-col`, preserving the first three
columns, exact leave date, action absence, state/copy, and navigation. The live seeded legacy state
contains zero deleted rows, so populated geometry is proven against the Scala skeleton and complete
frozen-cascade fixture without cross-state compensation. Focused coverage is GREEN 2/2, cumulative
user-list StyleX is GREEN 36/36, and whole-screen coverage is GREEN 15/16 with only the existing
excluded global-GNB `Feedback` fixture gap. This is not Wave 1 completion.

The one-hundred-sixty-ninth slice migrates the authenticated populated-ACTIVE
`/sites/userList` update-notification and site-admin numeric badge consumers from
`siteMngLayout.scala.html`, `userList.scala.html`, `_common.less`, and `_yobiUI.less`. The update
badge directly owns its border, radius, shadow, typography, and spacing; only its four paint/shadow
values extend the existing route-local color registry. The numeric badge owns only its legacy
typography and spacing because its paint is intentionally inherited from the state-tab link.
`notification-badge` and `num-badge` retire only for these two consumers. Main-agent browser
coverage is GREEN 4/4 after recording Edge/macOS's computed normalization of legacy
`BlinkMacSystemFont` to `system-ui`; the implementation retains the exact frozen font literal.
This is not Wave 1 completion.

The one-hundred-seventieth slice completes the authenticated populated-ACTIVE
`/sites/userList` row-avatar owner from `site/userList.scala.html`, `_common.less` `.avatar-wrap`,
`_yobiUI.less`'s later generic avatar surface, and `_page.less`'s list-avatar override. The owner
now directly carries display, overflow, vertical alignment, 3px radius, 45px geometry, float, and
spacing; a descendant owner preserves the generic image's 100% width and top alignment on both
branches. Only the genuine `#ddd` surface extends the route-local paint registry. The semantic
TanStack Link and Vite-owned avatar URL branches remain unchanged, while this consumer retires
`avatar-wrap` in addition to the already retired `list-avatar`. Focused/static verification covers
the exact frozen cascade and independent generic fallback consumer; main browser coverage is
GREEN 2/2 after the default-avatar fixture resolves to the existing PNG. This is not Wave 1
completion.

The one-hundred-seventy-first slice migrates the authenticated ACTIVE delete-confirmation modal
shell from `site/userList.scala.html`, Bootstrap 2.3.1 modal/close/fade rules, `_override.less`, and
`_responsive.less`. Six owners cover root state, header, close control, body, footer, and generated
backdrop. Route variables contain only modal paint, borders, shadows, and text; geometry,
transition, type, and responsive values remain inline. React preserves open/closed state, copy,
order, backdrop/Escape dismissal, and mutations. These consumers retire the modal presentation
classes while the footer's two `ybtn` consumers remain independent. Browser verification is
GREEN 1/1 (13.4s) for open, close, backdrop, Escape, and confirm behavior. The separately selected
populated-DOM check reaches only the pre-existing unrelated global-GNB `Feedback` fixture failure.
This is not Wave 1 completion.

The one-hundred-seventy-second slice migrates the open `/sites/userList` delete-modal footer's Yes
and No controls from frozen `_yobiUI.less` ybtn base/default/danger cascades. A shared direct button
owner plus first/danger variants preserves exact 14/20 type, 4×12 padding, `.3em` adjacency,
transition, borders, shadow, and default/danger interaction states. Existing route action paint
tokens are reused because their semantic values exactly match; no theme entry is added. The two
buttons retire only `ybtn`/`ybtn-danger` while modal shell owners and React confirm/dismiss behavior
remain unchanged. Main browser coverage is GREEN 1/1 (14.8s), pinning exact rest,
transition-settled default/danger hover/focus paint, and full modal interactions without
generated-class locators. This is not Wave 1 completion.

The one-hundred-seventy-third slice migrates the `/sites/userList` reset-password pending and
success alerts from Bootstrap 2.3.1 alert/success/close/heading rules and the legacy template
skeleton. Four responsibilities cover a common root, success paint variant, common close control,
and common heading. `alert-fail` has no frozen declaration, so pending receives only the common
alert surface and no invented variant. Alert paint/border/text-shadow values extend the route
theme; close paint/shadow reuse exact modal-close tokens, while geometry/type/position/opacity stay
inline. React/TanStack pending→success/failure and dismiss behavior remains unchanged. Browser
verification is GREEN 4/4 (22.1s) across success, pending dismissal, transport failure, and logical
failure flows. This is not Wave 1 completion.

The one-hundred-seventy-fourth slice completes the `/sites/userList` pagination input and previous/
next sprite primitives from Bootstrap input-mini, frozen `.nospinner`, and `_sprites.less`. The
existing input owner absorbs textfield appearance while four direct icon variants own shared
sprite display/size/alignment plus previous/next enabled/disabled positions and margins. The
canonical sprite is imported through Vite and passed only as a route-local CSS custom-property URL
because the StyleX compiler cannot evaluate a PNG import inside `stylex.create`; StyleX retains
background-image ownership through `var(...)`. Geometry
and type remain inline; existing pagination paint variables remain sufficient. This consumer
retires `input-mini`, `nospinner`, `ico`, `btn-pg-prev`, `btn-pg-next`, and icon `off` while behavior,
labels, and disabled navigation remain unchanged. This is not Wave 1 completion. Focused browser
verification is GREEN 3/3 (14.7s): desktop/mobile one-page
exact fallback/computed/geometry plus enabled navigation and Enter behavior all pass.

The one-hundred-seventy-fifth slice completes the last `/sites/userList` route presentation-class
retirement. The existing setting-wrap owner directly owns the frozen auto margin and
`.site-admin-page` 100% width after every descendant class consumer has already moved to a stable
owner, so `site-setting-wrap` no longer participates in the cascade. A stable search-icon owner
directly reproduces Yobicon's generic font declarations and the `::before` `\\e225` glyph, leaving
only the global `@font-face` resource as an unavoidable primitive and retiring `yobicon-search`.
Geometry and type remain inline and no theme or fallback CSS is added. Focused source/static gates
and browser coverage are GREEN. The final focused page-management/search-control/title-search-shell
suite passes 9/9 (16.8s), including desktop/mobile exact fallback/computed/glyph/geometry/screenshots
and SPA submission.

The one-hundred-seventy-sixth slice completes only the authenticated populated-first-page
`/sites/projectList` pagination input and previous/next sprite residual. The existing input owner
directly carries frozen Firefox-only `MozAppearance:textfield` without changing Chrome's computed
`appearance:auto`. Four icon variants own the canonical Vite-imported sprite image/repeat,
6×9 display/alignment, directional margins, and enabled/disabled positions through the proven
URL-only route custom-property bridge. This consumer retires `nospinner`, `ico`, `btn-pg-prev`,
`btn-pg-next`, and icon `off`; geometry/type remain inline, no theme or fallback CSS changes, and
React/TanStack navigation/input behavior remains unchanged. Source/static verification is GREEN;
focused browser verification is GREEN 5/5 (15.9s). Local pagination screenshots are saved at
`output/playwright/visual-sweep/stylex-site-project-list-pagination-{desktop,mobile}.png`; fresh live
legacy full-screen baselines remain under
`output/playwright/stylex-site-project-list-pagination-baseline/.playwright-cli/`. Desktop/mobile
inspection confirms the recorded 44×30 input, 12px/16px font, and identical 6×9 sprite rhythm
without visible drift.

The one-hundred-seventy-seventh slice migrates only the authenticated populated-first-page
`/sites/projectList` site-management sidebar navigation. Three route-local owners reproduce the
legacy UL, repeated LI default/first/Projects-active variants, and direct TanStack Router Links from
`siteMngLayout.scala.html`; `notification-badge` remains an excluded independent owner. Inline
geometry/type preserve the eight-link copy/order/hrefs and desktop/mobile wrapping, while four
route paint variables cover neutral border, active border, link text, and hover surface. This route
consumer retires `site-setting-nav`, LI `active`, and empty LI class strings without fallback CSS,
new abstraction, or behavior changes. The focused runtime fixture uses the fresh live baseline's
ko-KR locale/copy rather than weakening its absolute wrapped geometry. Focused RED source evidence
was recorded before implementation; source/static verification and main browser coverage are GREEN
3/3 (14.1s).
Slice 179's breadcrumb retirement removes the stale local 1px border, so sidebar local/live now both
start at y138 without CSS compensation. Local captures are saved at
`output/playwright/visual-sweep/stylex-site-project-list-sidebar-nav-{desktop,mobile}.png`; fresh live
captures remain under `output/playwright/stylex-site-project-list-pagination-baseline/.playwright-cli/`.
Visual inspection confirms identical eight-copy order, 4px rails, Projects active paint, 5×10 inset,
desktop rhythm, and mobile ko-KR wrapping with no owner-visible drift.

The one-hundred-seventy-eighth slice migrates only the authenticated populated-first-page
`/sites/projectList` page/management grid skeleton from `siteMngLayout.scala.html` to five direct
owners: page outer, retained-class setting wrapper, clearfix grid, sidebar column, and content
column. Inline geometry reproduces the frozen page box/responsive padding, natural setting margin,
Bootstrap fluid clearfix, and exact span percentages while preserving the mobile side-by-side
layout. `page-wrap-outer` and only the direct `row-fluid`/`span2`/`span10` retire;
`site-setting-wrap` deliberately remains because excluded descendant listhead/row selectors still
consume it. No theme, fallback, stacking, compensation, or inactive bootstrap-responsive behavior
is added. Focused RED source evidence was recorded before implementation; source/static and main
browser coverage are GREEN 3/3 (14.6s).
The focused frozen-class mutation treats the current app bridge's desktop `min-width:1100px` as
explicit deletion evidence: fresh live and direct ownership are `0px`, all shared boxes/declarations
remain exact, and mobile is `10px` on both paths. No stale bridge value is ported or compensated.
Local shell captures at
`output/playwright/visual-sweep/stylex-site-project-list-page-management-shell-{desktop,mobile}.png`
match fresh authenticated live baselines under
`output/playwright/stylex-site-project-list-pagination-baseline/.playwright-cli/` for column
placement/gap, title/list/pagination horizontal rhythm, desktop 10px inset, and mobile side-by-side
58.078/323.609 widths with natural 420px overflow. The local fixture's broken placeholder image is
an excluded child asset-fixture difference; child pixel parity is not claimed.
Four adjacent project-list suites move only five retired shell-class locators to stable page/content
owners, without generated-class locators or assertion weakening. Focused coverage is GREEN 3/3
(14.6s), and the complete projectList StyleX matrix is GREEN 57/57 (44.4s, workers=1).

The one-hundred-seventy-ninth slice migrates only the authenticated populated `/sites/projectList`
management breadcrumb from `siteMngLayout.scala.html` to three direct outer/inner/h3 owners. It
colocates only outer width/padding/box-sizing/mobile min-width, inner auto margin, and heading
padding/line-height; generic h3 color/family/size/weight/margin/text-rendering remain frozen shared
fallback. This consumer retires only `site-breadcrumb-outer` and `site-breadcrumb-inner`, with no
theme, registry, compensation, or frozen edit. Same-element fallback mutation proves the owned
geometry while recording the retired local app bridge's non-legacy 1px border and 400 heading
weight as deletion evidence. Local and fresh live outer y83, owner height/width, and the 55px
breadcrumb-to-page rhythm are exact without compensation.
Focused source RED was recorded before implementation, source/static verification is GREEN, and
main focused browser verification is GREEN 3/3 (15.6s). Local
`output/playwright/visual-sweep/stylex-site-project-list-breadcrumb-{desktop,mobile}.png` versus
live `output/playwright/stylex-site-project-list-pagination-baseline/.playwright-cli/page-2026-07-16T10-17-52-323Z.png`
and `page-2026-07-16T10-18-56-459Z.png` confirms exact y83, owned title start, 45px rhythm,
10px inset, typography, and mobile overlap/layout. Fixture/content outside the outer screenshot is
excluded.
The initial 56/60 matrix exposed only four stale y139 expectations in page-management-shell and
sidebar-nav desktop/mobile cases; both now assert the live-matching y138 produced by this deletion.
The final complete projectList StyleX matrix is GREEN 60/60 (46.1s, workers=1).
The subsequent whole-screen `site-admin-project-list.e2e.ts` run was initially 5/8: its three
failures were stale runtime locators for the already-retired Slice 177 sidebar and Slice 178
page/content classes. Runtime roots, navigation/current state, and metric helpers now use the
explicit Slice 177–179 owners while the legacy expected HTML fixture and retained nested row
fallback classes remain unchanged; the resulting whole-screen rerun reached 7/8. Its sole failure
was a helper false positive that treated all eight intentional generated StyleX link class tokens
as active-marker leaks. The second 7/8 run exposed the development debug-token form
`projectList__styles.*`; the helper and actual-side breadcrumb/title canonicalization now recognize
only established `x`-prefixed or `__styles.` generated forms, still report every other class token
with detail, and continue to reject `aria-current`/`data-status`. The final whole-screen result is
GREEN 7/8 (49.8s): all seven behavior/route/modal/update/default-logo/typed-link tests pass, while
the populated-DOM equality case still exposes pre-existing global GNB/footer React translation
(button/div structure, plugin attributes, shell generated classes/copy/assets) and prior project
search/listhead/row/pagination generated-class canonicalization gaps. This is not only a
`Feedback` fixture mismatch and is outside the breadcrumb owner; the goal rule requires splitting
shared/global and prior-owner canonicalization into separate follow-up work.

The one-hundred-eightieth slice migrates only the authenticated populated-first-page
`/sites/projectList?filter=road&pageNum=1` direct listhead fluid grid from
`site/projectList.scala.html`. The existing listhead owner adds active Bootstrap 2.3.1 width and
table-clearfix declarations to its existing paint/spacing/type; four direct column owners add the
shared block/left-float/border-box/min-height/gutter/padding geometry and exact span5/4/2/1 widths.
All geometry/type remains inline and only existing listhead paint variables are reused. Direct
`row-fluid listhead` and `span5|4|2|1 listhead-title` retire with zero fallback; repeated project-row
`row-fluid`/`span*` consumers remain excluded, and inactive bootstrap-responsive is not copied.
Desktop evidence fixes the 1116.890625×41 header at (239.078125,206) and four columns at y211;
mobile fixes the 323.609375×131 header at (66.375,216), created-copy 90px wrap, action float at
(73.25,311), and document width420 without stacking. Source RED becomes GREEN and main focused
Playwright is GREEN 2/2 (22.2s). Local
`output/playwright/visual-sweep/stylex-site-project-list-listhead-{desktop,mobile}.png` versus live
`output/playwright/stylex-site-project-list-pagination-baseline/.playwright-cli/page-2026-07-16T10-17-52-323Z.png`
and `page-2026-07-16T10-18-56-459Z.png` confirms matching surface/copy/column rhythm and mobile
created wrap/action float. The full projectList StyleX matrix is GREEN 56/56 (55.8s). Whole-screen
coverage is GREEN 7/8 (57.5s): behavior/routes/modal/update/default-logo/typed-link cases pass;
the sole failure is the pre-existing broad DOM equality gap across GNB/footer and prior generated
class canonicalization, outside this listhead owner.

The one-hundred-eighty-first slice migrates only the populated `/sites/projectList` repeated
project-row fluid grid. The existing row owner adds width and Bootstrap table clearfix; four direct
column owners compose the existing inline listitem typography/spacing with block/left-float,
border-box, min-height, gutter, and exact span5/4/2/1 widths. Row `row-fluid` and direct column
`span* listitem-col` retire with zero fallback, while avatar/link/action behavior and all paint
variables remain unchanged. Desktop live evidence fixes the row at (239.078125,252),
1116.890625×69 and columns 451.5/356.453125/166.34375/71.28125. Mobile fixes the row at
(66.375,352), 323.609375×81 and columns 130.8125/103.265625/48.1875/20.640625 with the legacy
68/80/60/50 heights and float wrap. Source RED was recorded before implementation; focused
desktop/mobile browser verification is GREEN 6/6 (16.5s). Same-element fallback equivalence and
live-exact mobile width/gutters/pseudos/computed output pass; the local en-US fixture renders at
y345/h69 with content-driven column heights 68/40/60/50, versus the ko-KR live full-screen
y352/h81 and 68/80/60/50. The test now records both scalars without compensation.
The initial full projectList matrix's only three failures were page-management-shell assertions
that still named the retired direct `listitem-col`. Source now rejects that class and runtime counts
the same 16 direct columns through stable owners; page-shell focused is GREEN 3/3 (15.8s) and the
final full projectList StyleX matrix is GREEN 56/56 (45.1s). Whole-screen is GREEN 7/8 (48.5s):
seven behavior/routes/modal/update/default-logo/typed-link cases pass, with only the same
pre-existing broad DOM equality gap outside this owner.

The one-hundred-eighty-second slice completes only the `/sites/projectList` root/search geometry
and glyph residuals. The existing setting wrapper already owns the active `_page.less`
`margin: 0 auto`, so its final presentation class retires without adding a declaration; the
`app.css` `.site-admin-page .site-setting-wrap` 100% width bridge is inactive for this route and is
explicitly excluded rather than copied as compensation. The existing search-form owner adds
Bootstrap right float, and one new icon owner moves the generic
Yobicon font declarations plus `::before` `\e225` glyph. Exactly `site-setting-wrap`, `pull-right`,
and `yobicon-search` retire; notification badge, paint, and all other owners remain separate. Every
new declaration is inline geometry/type/glyph output with no theme/global/frozen/app CSS change or
compensation. Source RED was recorded on the absent icon owner. Verification corrected three
evidence defects without changing the implementation contract: the project-list button cascade
computes unit `lineHeight: 1` to 12px, the app.css width bridge is inactive, and fallback fixtures
must temporarily restore the retired `site-setting-wrap` ancestor before descendant classes.
Focused search is GREEN 5/5 (15.0s), the final projectList StyleX matrix is GREEN 56/56 (46.4s),
and whole-screen coverage is GREEN 7/8 (48.7s). Its seven behavior/route/modal/update/default-logo/
typed-link cases pass; only the pre-existing broad DOM-equality gap outside this owner remains.

The one-hundred-eighty-third slice completes only the conditional update-count badge in the
`/sites/projectList` site sidebar. `siteMngLayout.scala.html` preserves the version-available
conditional and literal `1`; frozen `_common.less`, variables/mixins, and the full `yobi.less`
cascade provide the primitive. A stable badge owner moves orange surface, muted-white text, white
border, and dual shadow through the route theme while radius, border width/style, padding,
typography, line height, display, and position remain inline in `projectList.tsx`. Exactly
`notification-badge` retires; query and conditional behavior are unchanged. Focused source RED was
recorded before implementation. Focused badge coverage is GREEN 4/4 (19.8s), the final projectList
StyleX matrix is GREEN 60/60 (46.9s), and whole-screen coverage is GREEN 7/8 (48.8s). The update
badge and six other functional cases pass; only the same pre-existing broad DOM-equality gap
outside this owner remains.

The one-hundred-eighty-fourth slice completes the Firefox-only pagination input residual for both
`/sites/postList` and `/sites/issueList`. Their existing pagination-input owners now carry inline
`MozAppearance: "textfield"`, matching frozen `_common.less` `.nospinner`; Chromium's standard
computed appearance remains `auto`. Exactly those two `nospinner` consumers retire, with no theme,
paint, global, frozen, app CSS, geometry, or behavior change. Focused combined coverage is GREEN
12/12 (19.8s), the complete combined post/issue StyleX matrix is GREEN 88/88 (52.4s), and combined
whole-screen coverage is GREEN 14/16 (about 1.6m). Each route passes 7/8; only the two pre-existing
missing global-GNB Feedback expectations remain, while all fourteen functional cases pass.

The one-hundred-eighty-fifth slice completes the comments Yobicon residual for both
`/sites/postList` and `/sites/issueList`. Their existing comments metadata owners now directly own
the generic Yobicon font family/style/weight/display/smoothing declarations and `::before`
`\e4b7`, while the frozen `_page.less` middle alignment remains preserved. Exactly the two literal
`yobicon-comments` classes retire, with no theme, paint, global variable, geometry, navigation, or
behavior change. Focused combined metadata coverage is GREEN 9/9 (17.7s), the complete combined
StyleX matrix is GREEN 88/88 (52.3s), and combined whole-screen coverage is GREEN 14/16 (about
1.6m). Each route passes 7/8; only the same pre-existing missing global-GNB Feedback expectations
remain, while all fourteen functional cases pass.

The one-hundred-eighty-sixth slice completes the pagination sprite-icon residual for both
`/sites/postList` and `/sites/issueList`. Each route imports `frontend/src/assets/legacy/sprite.png`
through Vite, exposes it through a route-local CSS custom property, and keeps display, no-repeat,
6×9 dimensions, vertical alignment, margins, and active/disabled prev/next background positions
inline rather than in theme variables. Only the icon elements retire literal `ico`,
`btn-pg-prev`, `btn-pg-next`, and `off`; `data-pagination-state`, navigation, and surrounding
pagination ownership remain unchanged. Asset URL prefixes are normalized in evidence while the
`sprite.png` basename, positions, and geometry remain exact. Final effective focused coverage is
GREEN 12/12: post pagination 5/5 (17.1s), plus issue pagination 5/5 and post nospinner 2/2 from the
preceding combined run. Complete combined StyleX is GREEN 88/88 (53.7s), and combined whole-screen
coverage is GREEN 14/16 (about 1.6m); each route is 7/8 with only the same pre-existing missing GNB
Feedback expectation, while all fourteen functional cases pass.

The one-hundred-eighty-seventh slice migrates only the closed-default `/_help` shell. Five stable
owners in `frontend/src/routes/[_]help.tsx` cover breadcrumb outer/inner/heading and page
outer/inner, with geometry inline and only the white page surface in the route-local dark-mode
paint boundary. Live Java legacy fixes the desktop breadcrumb at `0,40,1366×45`, inner at
`10,40,1346×45`, page outer at `0,115,1366×450`, and page at `10,115,1346` wide; mobile preserves
45px breadcrumb height with 370px inner width and places the `390×450` page outer at y115 with a
390px page at x0. The stale local app.css fallback instead produces a 46px breadcrumb and a
1080px page centered at x133 on desktop, so it is explicitly excluded rather than compensated.
Focused shell coverage is GREEN 3/3, broad help-toc succeeds, and check/build succeed with no
frozen CSS edit.

The one-hundred-eighty-eighth slice completes the closed-default `/_help` FAQ table. Direct owners
cover the list, six default-closed rows with a borderless last-row variant, question wrapper/control/cell/Q icon/toggle,
answer wrapper/A icon/answer, and all visible states. Literal `qas`, `qa`, `open`, question/answer
wrapper and cell classes, sprite classes, and Q/A Yobicon classes retire; the zero-consumer 88-line
`.qas` app.css bridge is deleted. React preserves `data-state`, `data-index`, ARIA, click, Space,
and Enter. Because Edge blockifies a button containing table-cell layout, the button uses
`display:contents` and its inner focusable span owns the legacy table-cell geometry while keyboard
events bubble to the React control. Route-local `helpColors` contains only page/FAQ paint; every
dimension, type, and spacing value stays inline with no `globalColors` or compensation. Live
desktop/mobile closed/open geometry is fixed directly, including question content-box
`x95.9375/y115/w1144.09375/h48` desktop and `x41/w316` mobile, answer desktop
`padding-right 118.438`, computed width `1141.56`, rect `1260`, and mobile `32.3906/271.609/304`.
Sprite positions remain `-3px -144px` and `-20px -144px`; Q/A glyphs remain `\e48f`/`\e480`.
Combined Help is GREEN 9/9 (5.8s), focused FAQ is GREEN 3/3 (2.3s), check/build succeed, the
generated fallback hash remains `6417f445…16f`, and actual live/local global 1366 shell metrics
match with frozen CSS unchanged. Build updates only the fallback manifest's app.css source inventory
hash from `afefe…` to `c4df…`; emitted `legacy-fallback.css` remains `6417f445…16f`.

The one-hundred-eighty-ninth slice migrates only the default `/sites/data` site-management
breadcrumb. Three route-inline owners cover outer width/padding/box sizing/mobile minimum, inner
auto margin, and heading padding/30px line height. Exactly `site-breadcrumb-outer` and
`site-breadcrumb-inner` retire on this route; generic h3 paint/type/margin/rendering and every
page/grid/sidebar/body/form owner remain frozen fallback. The slice has no paint, so
`frontend/src/routes/sites/-data.stylex.ts` and global theme registries do not change. Focused
source/class retirement and exact 1366×900/390×844 geometry coverage is GREEN 3/3. The adjacent
whole-screen data suite passes its four owner-independent cases and retains only the pre-existing
global GNB `Feedback` fixture mismatch. No compensation or frozen/app CSS change is introduced.

The one-hundred-ninetieth slice migrates only the authenticated token-present
`/user/editform/token` form. Three direct owners cover the floated 100%-wide form, 90%-wide
readonly token input, and complete `_yobiUI.less` success-action rest/hover/focus/active cascade;
an unstyled stable wrapper replaces the declaration-free `token-generate` class. This consumer
retires `token-generate`, `pull-left`, `text`, `ybtn`, `ybtn-success`, and both inline width
attributes. `tokenSettingsColors` contains only action surface/text/border/shadow paint while
float, widths, margin, border structure, radius, padding, type, transition, and positioning remain
inline in `stylex.create`. Generic input element fallback and React/TanStack selection, CSRF reset,
and workspace-cache behavior remain unchanged. Fresh live Java evidence pins desktop form/input/
action at `10,206,1346×90`, `10,226,1225.390625×30`, and `10,266,138.78125×30`; mobile pins
`0,206,390×90`, `0,226,365×30`, and `0,266,138.78125×30`. The focused gate is GREEN 3/3
with exact computed paint/type and owner-relative geometry at 1366×900 and 390×844, class/source
retirement, click selection, mutation/CSRF/cache behavior, and screenshots. Visual inspection
confirms the migrated token controls retain the legacy 20/30px rhythm and paint. Existing shared
user-settings page-width/tab ancestry, locale-dependent intrinsic button width, global shell, and
Yoram footer differences remain outside this owner and receive no numeric compensation; the next
user-settings shell wave must own those shared boundaries. This is not Wave 1 completion.

The one-hundred-ninety-first slice migrates only the authenticated populated
`/admin/sample/watchers` member list. Six direct owners cover the list/clearfix, repeated fluid
row, avatar Link/image, member name, and member ID. This consumer retires `members project
row-fluid`, `member span6 span-hard-wrap`, `avatar-wrap mlarge pull-left mr10`, `member-name`, and
`member-id`; project/page shell ownership and independent organization/project-member/avatar
consumers remain frozen fallback. `projectWatchersTheme` contains only the row-border,
avatar-surface, and member-ID text paint, while every grid, dimension, spacing, border structure,
and typography value stays inline. Fresh Java evidence pins desktop list/row/avatar at
`1346×63`, `658.671875×63`, and `40×40`, and mobile at `390×63`, `370.5×63`, and `40×40` with no
horizontal overflow. The frozen mobile `width:100vw` loses to the more-specific Bootstrap
`.row-fluid .span6`; preserving the active span width plus the winning 95% minimum reproduces the
actual cascade without compensation. The local shared shell retains its existing `1260/617`
list/row width while all owner-relative paint, type, box, rhythm, and containment match. This is
verified by the focused GREEN 13/13 route matrix and persistent desktop/mobile screenshots;
typecheck, Vitest, production build/StyleX verification, frozen/hash, theme-boundary, parity-gate,
format/lint, and diff gates also pass. This is not Wave 1 completion.

The one-hundred-ninety-second slice migrates only the four member-identity leaf owners in the
authenticated populated `/admin/sample/members` state: avatar Link, avatar image, member name,
and member ID. The list/row, settings control, owner/guest labels, role/delete controls, add form,
and enrollment branch remain frozen fallback owners. `projectMembersTheme` contains only the
avatar surface and member-ID text paint; every dimension, float, clipping, radius, spacing, image
alignment, and typography value stays inline in `stylex.create`. These nodes retire only
`avatar-wrap mlarge pull-left mr10`, `member-name`, and `member-id`. Fresh Java evidence pins the
40×40 avatar/image, 20px name/ID rhythm, 700 name weight, exact `#ddd`/`#ccc` paint, 15px setting
offset, 5px owner padding, and mobile 360.5px name/ID widths. The focused fixture uses the existing
Vite-imported default avatar so visual screenshots contain the actual asset. At 390px, the four
owners preserve the exact 365.5px row-relative right edge. The local absolute row starts 5px left
of live because the existing duplicated app bridge reverses the Bootstrap/Yobi first-child margin
cascade, and the shared project-menu count retains its existing 8px document overflow; both are
separate fallback owners and receive no leaf compensation. Focused owner/source/navigation tests
are GREEN 3/3 and the remaining affected behavior matrix is GREEN 15/15 after excluding four
already-known shared-shell/error canonicalizer cases. Persistent desktop/mobile legacy and local
screenshots were directly inspected. This is not Wave 1 completion.

The one-hundred-ninety-third slice migrates only the list, repeated row, member-setting, and
owner-label presentation in the authenticated owner-only `/admin/sample/members` state. The list
owns the frozen zero margin/list style plus Bootstrap width/clearfix; the row owns the exact fluid
span width, 5px inset, 1px border structure, padding, float, box sizing, position, and winning 95%
mobile minimum; setting and owner label own the 15px absolute offset and 5px margin/padding. The
existing route theme gains only `rowBorder:#ddd`; every geometry value remains literal. The
specificity-losing mobile `width:100vw` is not copied. Live Java desktop pins the list/row at
`1346/658.671875px`, while local retains the existing shared 1260px project-page ancestry and
therefore renders `1260/616.59375px`; exact owner percentages, inset, relative offsets, clearfix,
box model, and alignment match without compensation. Locale-dependent owner/setting width remains
`84.765625px` for live Korean and `92.734375px` for local English. At 390px both render a 390px
list and `370.5px @x5` row, so this StyleX owner restores the live first-row inset previously lost
to the duplicated app bridge order. The four legacy class groups remain intentionally because
excluded role/delete/guest and generic label/button descendant fallbacks still consume them; this
slice claims declarations, not class retirement. Focused browser coverage is GREEN 1/1, the
affected identity/role/delete/typeahead/navigation matrix is GREEN 16/16, typecheck and Vitest
11/11 pass, production build/StyleX verification keeps hash `6417f445…16f`, and persistent live/
local desktop/mobile screenshots were inspected. This is not Wave 1 completion.

The one-hundred-ninety-fourth slice migrates only the authenticated default `/sites/massmail`
management breadcrumb. Three route-inline owners cover outer full width, horizontal padding,
border-box sizing and the max-720 10px minimum; inner auto margin; and direct h3 padding with 30px
line height. Exactly `site-breadcrumb-outer` and `site-breadcrumb-inner` retire on this route.
Generic h3 paint, font, weight, margin, and rendering plus every page/grid/sidebar/body fallback
remain shared. The slice has no dark-mode paint, so it adds no theme variable and keeps every
geometry value inline in `stylex.create`. Focused source, direct DOM, class-retirement, and exact
1366x900/390x844 metric coverage is GREEN 3/3. Authenticated Java legacy and focused local
desktop/mobile screenshots were inspected; the owned full width, 10px inset, 45px rhythm, and
following-page y=138 match exactly. Four stale earlier-owner assertions now use stable owners and
scoped style blocks, so the final mass-mail matrix is 47/48; only the known global GNB `Feedback`
whole-screen gap remains outside this owner. No frozen/app CSS, compensation, behavior, or new
abstraction changes.

The one-hundred-ninety-fifth slice migrates only the authenticated populated-default `/projects`
directory breadcrumb wrappers from `project/list.scala.html`. Exactly two route-local owners cover
outer 100% width, 0px 10px padding, border-box sizing and max-720 10px minimum width, plus inner
auto margin. All geometry remains inline and no theme variable, paint, border, or compensation is
added. Only literal `site-breadcrumb-outer` and `site-breadcrumb-inner` retire; direct
`title_area`, nav/tabs/links, search, project list, pagination, and all descendant fallback and
React/TanStack behavior remain unchanged. Live Java pins desktop outer/inner at
`0,93,1366x38`/`10,93,1346x38` with page y151 and mobile at
`0,93,390x68`/`10,93,370x68` with page y181, 10px mobile minimum, no border, and viewport-wide
scroll width. Focused RED is 3/3 solely on the absent owners; the combined focused/affected browser
matrix is GREEN 14/14, including exact desktop/mobile geometry and saved screenshot checks. This is
not Wave 1 completion.

The one-hundred-ninety-sixth slice migrates only the authenticated populated-default `/projects`
directory tab strip from `project/list.scala.html`. Three direct owners cover the list border,
margin/reset and clearfix pseudo-elements; repeated item float/type/rhythm; and repeated Link
structure, responsive padding, type, border, radius, text decoration, plus inactive and active
default/hover/focus states. `projectsDirectoryColors` contains only the seven route paints that can
vary in dark mode; transparent values and every geometry/type/border-structure declaration remain
inline. This subtree retires only `title_area`, `nav nav-tabs`, and `active`, retaining the exact
div > ul > li > Link skeleton, Korean copy/order, hrefs, TanStack navigation props, and all
search/list/pagination behavior. Live desktop pins list `1346x38 @10,93`, items
`182.359/123.188x38`, links `180.359/121.188x38`, 8x30 padding, and page y151. Live mobile pins
list `370x68 @10,93`, wrapped items at `10,93` and `142.359,123`, 8x5 padding, page y181, and
390px scroll width. Focused RED is 3/3 because owners, route paint, and retirement were absent; the
combined focused/affected browser matrix is GREEN 17/17. Authenticated Java and local
desktop/mobile captures visually preserve the active border/surface, type, one-line desktop strip,
and canonical mobile wrap. This is not Wave 1 completion.

The one-hundred-ninety-seventh slice migrates only the authenticated populated-default `/projects`
directory search strip from `project/list.scala.html`. Six direct owners cover the outer clear and
desktop/mobile height flow, floated search container, exact frozen form margin, search-bar box and
route paint, textbox box/focus/font behavior, and submit-button position/interaction. The exact
Scala skeleton, GET action/method, localized placeholder, autofocus, submit query, and Yobicon
child remain unchanged. `projectsDirectoryColors` adds only the route-local white search surface,
gray border, and text paint; every dimension, font, border structure, transition, and offset stays
inline. Live comparison exposed two pre-existing React bridge drifts rather than permitting numeric
compensation: the frozen `_yobiUI.less` 2px form margin restores the desktop float height, and the
Bootstrap `Helvetica Neue` input stack restores the mobile intrinsic width. Desktop now preserves
the `382x30` bar at `(10,161)`, `360x20` input, `12x20` submit, list y201, and 1366px scroll width;
mobile preserves the canonical outer zero-height float flow, `205x30` bar at `(0,196)`, `183x20`
input, submit x187, list y231, and 390px scroll width. StyleX 0.19 removes border-color atoms when
the same owner has `border-style:none` and zero width; production output proves no such atom, so
only that non-rendering computed color remains lower-layer fallback while visible border state is
fully owned. The pre-implementation source contract was observed RED on absent owners; focused
GREEN is 4/4 and the combined `/projects` matrix is GREEN 21/21. This is not Wave 1 completion.

The one-hundred-ninety-eighth slice migrates only the authenticated populated-default `/projects`
directory list and repeated row shells from `project/list.scala.html`. Exactly two direct owners
cover `ul.all-projects` list reset/clear/margin and each `li.project` padding/overflow/bottom
divider. Only the dark-mode-eligible `#dcdcdc` row divider enters route-local
`projectsDirectoryColors`; list geometry and spacing remain inline. The `all-projects` and
`project` classes intentionally remain because their frozen descendant rules still own project
identity, description, metadata, stats, members, and avatars. Fresh authenticated Java evidence
also exposed that the React/API translation omitted public-project member avatar rows and rendered
a fallback project-logo image where Scala renders an empty logo link when no logo exists. The REST
directory payload now reuses existing member summaries, React restores the public-only member
Link/image sequence, and readable project logos render only when a URL exists. Live desktop pins
the list at `10,201,1346x364` with four `1346x91` rows and pagination y585. Live mobile pins the
list at `0,231,390x544`: the protected row is 91px and the three public member-bearing rows are
151px, with pagination y795 and no horizontal overflow. The runtime test progressed from a 694px
fixture-copy mismatch, through a 364px result that revealed the missing member DOM, to exact 544px
GREEN geometry. Focused coverage is GREEN 3/3, the affected `/projects` matrix is GREEN 24/24,
and the focused Rust REST contract verifies the member payload. This is not Wave 1 completion.

The one-hundred-ninety-ninth slice migrates four authenticated populated-default `/projects`
row-content owners from `project/list.scala.html`: the project-logo wrapper, title header,
description, and creation/update metadata. Wrapper position/display/float/50px box/margin/overflow,
header 20px bold rhythm, description bounds/overflow, and metadata 11px rhythm stay as literal
route `stylex.create` declarations. Only the dark-mode-eligible description `#bababa` and metadata
`#999` paints enter route-local `projectsDirectoryColors`. The wrapper retains
`owner-avatar-wrap` because its excluded direct-image rule and legacy `3px !important` radius
remain fallback; the header retains `header` for excluded private-lock and other state descendants.
The fully owned `desc` and `name-tag` classes retire on this route. Fresh authenticated Java
desktop pins the second row avatar at `10,307,50x50`, header/description/metadata at x80 and
y307/332/352, while 390px mobile pins them at x0/x70 and y337/362/382 inside the 151px row with
no overflow. The focused test records a genuine 3/3 absent-owner RED and becomes GREEN 3/3; the
affected project list/list-shell/row-content matrix is GREEN 17/17 and the complete `/projects`
StyleX matrix is GREEN 27/27. Live and local desktop/mobile captures were directly inspected. This
is not Wave 1 completion.

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

| 2026-07-17 | Authenticated populated `/admin/sample/statistics` Under Construction body-shell StyleX wave | `yona-original/app/views/project/statistics.scala.html` supplies the exact `page-wrap-outer > project-page-wrap > h1` skeleton; included project shell templates, frozen `_page.less`, max-720 and final `@media all` `_responsive.less`, Bootstrap h1 rules, and fresh live Java Edge measurements supply the final output. Legacy Scala HTML/JS remains output DOM/UX evidence while React/TanStack own project loading, nested shell reuse, metadata, and search scope. | `frontend/src/routes/$ownerName/$projectName/statistics.tsx` adds exactly two stable StyleX owners for the outer and project-page wrappers, plus direct child h1 type declarations needed to preserve live Bootstrap output against the stale app bridge. Desktop/mobile final cascade is 10px outer top, desktop 10px inset/mobile zero inset, desktop min-width 0/mobile 10px, and project-page 5px/100% at both sizes. Geometry/type values stay inline; no paint/theme vars/file are added. Only this route’s wrapper classes retire. | `frontend/tests/project-statistics.e2e.ts` keeps live-derived 1366×900/390×844 owner-local sizes/x/type, containment, mobile no-overflow, and fallback equivalence. Live absolute y130 remains provenance; local shared header ancestry yields y173 desktop/y196 mobile, so the executable gate uses the exact 10px outer-to-header-bottom gap and equal project-page/H1/outer tops without weakening this route’s contract. The complete route suite is GREEN 14/14; static/format/lint/diff, typecheck, and production build/StyleX verification are green. |

## 8. Verification matrix per route slice and assembled batch

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

Batch 230 applied the batched workflow to project creation, milestone creation, and board post creation. The three route-local implementations were integrated before one assembled Playwright run (6 tests), followed by shared typecheck, formatting, Vitest, production build, and StyleX fallback verification. This keeps independent route ownership while amortizing server startup and global gates.

Batch 231 applied the same workflow to issue creation, issue-label management, and project settings. The integrated wave passed one assembled 6-test Playwright run plus shared typecheck, formatting, Vitest, production build, and StyleX fallback verification.

Batch 232 applied the workflow to milestone editing, webhook management, and issue editing. The integrated wave passed the assembled browser checks after correcting a legacy Scala source assertion, with shared typecheck, formatting, Vitest, production build, and StyleX fallback verification queued for the same commit gate.

Batch 233 applied the workflow to board-post editing, review-thread listing, and commit detail. The integrated 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 234 applied the workflow to organization issue, board, and pull-request lists. The integrated 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 235 applied the workflow to code history, no-head code browser, and revision compare. The integrated 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 236 applied the workflow to code branch browsing, code file viewing, and board post detail. The integrated 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 237 applied the workflow to board post listing, issue detail, and milestone detail. The integrated 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 238 applied the workflow to project search, organization search, and project pull-request listing. The integrated 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 239 applied the workflow to new pull-request creation, pull-request detail, and commit-file history. The integrated 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 240 applied the workflow to project issues, project settings, and organization issues. The integrated 4-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 241 applied the workflow to project posts, commit history, and milestones. The integrated 4-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 242 applied the workflow to project no-head code, board post creation, and milestone editing. The integrated 3-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 243 applied the workflow to milestone detail, project code branch browsing, and organization settings. The integrated 4-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed.

Batch 244 applied the workflow to site-admin issue listing, standalone signup, and pull-request changes. The integrated 7-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 245 applied the workflow to the public user profile and global search result screens. The integrated 2-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch; the initially explored pull-request edit-form target was reverted before integration because its focused runtime fixture could not establish a valid screen state.

Batch 246 applied the workflow to the project home and organization home shells. The integrated 2-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed once for the supervised batch.

Batch 247 applied the workflow to the project import form. Its focused browser gate, shared typecheck, formatting, Vitest, production build, and StyleX fallback verification passed; a pull-request edit-form target was reverted before integration because its runtime fixture could not establish a valid success state.

Batch 248 applied the workflow to the restart notice, organization boards, and user issues visible states. The assembled 11-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 249 applied the workflow to organization members and project transfer form residual owners. The assembled 7-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch; the explored lost-password owner was reverted because its existing authenticated-state contract rejected the added boundary.

Batch 250 applied the workflow to the migration disabled shell, organization delete form, and organization pull-request list. The assembled 9-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 251 applied the workflow to the restricted page, organization directory, and organization issue list. The assembled 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 252 applied the workflow to user files, organization settings, and the project new-fork form. The assembled 4-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 253 applied the workflow to the site diagnostic error state and project code-file view. The assembled 7-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 254 applied the workflow to project pull-request open/closed/sent list states and the organization closed pull-request state. The assembled 2-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 255 applied the workflow to the read-only site data/export page. Its assembled 6-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 256 applied the workflow to the site mail not-configured state. Its assembled 5-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 257 applied the workflow to the site mass-mail default state. Its assembled 5-test browser wave and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 258 applied the workflow to the authenticated `/user/editform` profile default/no-modal state. Its focused browser gate and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 259 applied the workflow to the authenticated project pull-request edit form open state. Its focused browser gate and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 260 applied the workflow to the authenticated open milestone detail state. Its focused browser gate and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 261 applied the workflow to the authenticated open project issue-detail state. Its focused browser gate and shared typecheck, formatting, Vitest, production build, and StyleX fallback verification are run once for the supervised batch.

Batch 262 applies the workflow to the authenticated issue edit form, board post detail, and commit detail states. Their three focused browser gates are assembled after route-local work, followed by one shared typecheck, formatting, Vitest, production build, and StyleX fallback verification.

Batch 263 applies the workflow to the authenticated milestone edit form. The labels-form and board-post edit-form candidates remain deferred from this commit because their focused browser contracts still need fixture/runtime diagnosis.

Batch 264 applies the workflow to the populated project fork notice and populated code branch folder states. The assembled two-route browser wave passed 3/3, followed by one shared typecheck, Vitest, formatting, production build, and StyleX fallback verification. The explored `/info/leave/$ownerName/$projectName` redirect-only endpoint was rejected as a non-visible state and was not recorded as a migration row.

Batch 265 applies the workflow to the populated project labels form, pull-request changes residual owners, and site issue-list theme-boundary correction. The assembled six-test browser wave passed 6/6, followed by one shared typecheck, Vitest, formatting, production build, and StyleX fallback verification. The labels fixture was repaired by mocking the parent project `/container` request; the site issue-list change removes non-theme shadow tokens rather than adding a new visible owner.

Batch 266 applies the workflow to populated project branches, members, and reviews states. The routes were committed independently to preserve the one-route/one-audit-row guard; focused browser contracts cover the migrated owners and desktop/mobile containment. The members contract was stabilized against browser serialization of UA-dependent declarations, while source ownership and stable layout declarations remain asserted.

Batch 267 applies the workflow to the authenticated populated project code-history state. The branch picker container/button declarations and tabs margin moved to route-local StyleX; the frozen Select2 `width:auto !important` rule remains the explicit dropdown fallback. Focused Playwright passed 1/1, frontend check passed, Vitest passed 11/11, production build and fallback hash verifier passed, and formatting/diff checks passed.

Batch 268 applies the workflow to the authenticated populated project board-list state. The two-column control position and keyboard-shortcut wrapper spacing moved to route-local StyleX. Focused Playwright and the canonical project-posts keymap test passed; typecheck, Vitest, production build, fallback hash, formatting, and parity hooks passed.

Batch 269 applies the workflow to the authenticated loaded/open new pull-request form. Editor wrapper/tab-content positioning, Select2 picker width, and conflict modal display moved to route-local StyleX while closed Select2 focus behavior remains unchanged. Focused Playwright 1/1, typecheck, Vitest 11/11, production build/fallback verifier, formatting, and parity hooks passed.

Batch 270 applies the workflow to the authenticated populated user email-settings state. The valid secondary-email set-as-main button width moved to a route-local StyleX owner while preserving the legacy button classes and mutation. Focused Playwright 2/2 plus the existing secondary-row source/runtime contract passed; typecheck, Vitest, formatting, build, fallback verifier, and parity hooks passed.

Batch 271 applies the workflow to the authenticated loaded organization settings form. Desktop top spacing moved to route-local StyleX while the mobile frozen responsive override and runtime logo background inline fallback remain intact. Focused Playwright 3/3, typecheck, Vitest, production build/fallback verifier, formatting, and parity hooks passed.

Batch 272 applies the workflow to the authenticated project-create form. Owner and VCS select `min-width:220px` declarations moved to route-local StyleX while the legacy 700px mobile form shell remains unchanged. Focused Playwright 1/1, typecheck, Vitest, production build/fallback verifier, formatting, and parity hooks passed.

Batch 287 applies the workflow to the disabled `/migration` screen progress-bar residual. The fixed zero-progress width moved to direct route-local StyleX; the focused migration shell and parity tests cover the stable owner, computed geometry, no inline width, and desktop/mobile containment.

Batch 288 applies the workflow to the authenticated project code-file `#spin` residual. The fixed-center spinner positioning moved to route-local StyleX; the focused code-file test covers stable ownership, computed desktop/mobile geometry, and no literal inline style.

Batch 289 applies the workflow to the authenticated project setting default-branch Select2 residual. The fixed 220px container/dropdown/select geometry moved to route-local StyleX while conditional display remains state-owned; the focused setting test covers interaction and desktop/mobile containment.

Batch 290 applies the workflow to authenticated project commit-detail conditional review states. Boolean display declarations for review/edit/delete surfaces moved to conditional StyleX variants; the focused review residual test covers visible/hidden interaction and no inline styles.

Batch 291 applies the workflow to the public `/$user` daysAgo filter input. Its static margin and vertical alignment moved to route-local StyleX; the profile test covers computed placement and desktop/mobile containment.

Batch 292 applies the workflow to the authenticated pull-request detail action wrapper. Its fixed inline-block display moved to route-local StyleX; the pull-request detail test covers action order, computed display, and desktop/mobile containment.

Batch 293 corrects the pull-request action-wrapper focused geometry assertion to use Playwright bounding-box `x`/`width` fields; the StyleX implementation and visible contract remain unchanged.

Batch 294 applies the workflow to the authenticated board post keymap-help wrapper. Its fixed legacy padding and left margin moved to route-local StyleX while the conditional modal display remains React state-owned; the focused residual test covers source evidence, computed spacing, modal interaction, and desktop/mobile containment.

Batch 298 applies the workflow to the standalone `/_UIKit` original-message toggle. Its fixed generated-button border and horizontal padding moved to route-local StyleX while React owns the show/hide state; the focused UI kit test covers legacy source evidence, computed zero border/5px padding, toggle interaction, and desktop/mobile containment.

Batch 303 applies the workflow to the authenticated project-setting old-place message. Its static legacy `color:red` declaration moved to a direct route-local StyleX owner while the data-driven previous-place text remains unchanged; the focused project-setting test covers source evidence, computed color, and desktop/mobile form containment.

Batch 304 applies the workflow to the authenticated organization settings logo preview. Its server-provided background image moved from a literal inline declaration to a route-local Dynamic StyleX function because the value cannot be enumerated at build time; the focused organization-setting residual test covers the custom-property carrier, computed desktop/mobile background, upload validation, and containment.

Batch 305 applies the workflow to the authenticated `/user/issues` populated issue-list label state. The server-provided label background color moved to route-local Dynamic StyleX for parent and child labels while preserving legacy classes, contrast behavior, links, and responsive containment; the focused user-issues residual test covers the runtime custom-property carrier and computed color.

Batch 306 applies the workflow to the populated public `/$user` profile avatar and issue-label dynamic paint owners. Its focused browser gate verifies the legacy source declarations, Dynamic StyleX custom-property carriers, computed output, and responsive containment before the shared gates are run for the supervised batch.

Batch 307 applies the workflow to the authenticated `/$ownerName/$projectName/issue/$issueNumber` loaded issue-detail label state. Arbitrary server-provided label background colors moved to route-local Dynamic StyleX across the selected-label control, issue labels, child-issue labels, and timeline label boxes while preserving legacy classes, links, contrast, order, and geometry; the focused issue-detail residual test covers runtime colors, custom-property carriers, and the absence of literal background declarations.

Batch 309 applies the workflow to the authenticated `/organizations/$organizationName/issues` populated issue-label state. The server-provided label background color moves to the route-local Dynamic StyleX owner while preserving the legacy label link, classes, copy, filtering target, and responsive issue-row geometry; the focused organization-issue label test covers the runtime custom-property carrier, computed color, and absence of a literal background declaration.

Batch 310 applies the workflow to the authenticated `/$ownerName/$projectName/post/$postNumber` loaded board-post label state. The server-provided selected-label background color moves to route-local Dynamic StyleX while preserving the legacy label link, classes, copy, and responsive sidebar geometry; the focused post-detail residual test covers the runtime color carrier and absence of a literal inline background declaration.

Batch 311 applies the workflow to the authenticated `/$ownerName/$projectName/milestones` populated milestone-list state. Server-provided issue-label background colors move to the route-local Dynamic StyleX owner while preserving legacy label classes, metadata, issue links, filtering, and responsive geometry; the focused milestone-list label test covers computed runtime color, the absence of a literal inline background declaration, and mobile containment.

Batch 313 applies the workflow to the authenticated `/$ownerName/$projectName/issueform` selected and available label state. Server-provided label background colors move to route-local Dynamic StyleX while preserving Select2 DOM/classes, copy, interaction, and responsive geometry; the focused issue-form label test covers runtime custom-property carriers, computed colors, and absence of literal inline background declarations.

Batch 314 applies the workflow to the authenticated `/$ownerName/$projectName/issue/labelsform` label-edit modal state. The server-provided edit-preview label color moves from a literal inline background declaration to route-local Dynamic StyleX while preserving the legacy modal input, preset controls, copy, interaction, and desktop/mobile containment; the focused labels-form owners test covers the runtime custom-property carrier and absence of a literal background declaration.

Batch 315 applies the workflow to the authenticated `/organizations/$organizationName` organization profile/header logo state. The server-provided header background URL moves to route-local Dynamic StyleX while the legacy header DOM, logo image, breadcrumb, enrollment controls, and responsive geometry remain unchanged. Its focused browser gate verifies the legacy source declaration, runtime custom-property carrier, computed background image, logo image, and mobile containment.

Batch 316 applies the workflow to the authenticated `/organizations/$organizationName/pullrequests` organization header logo state. The server-provided header `background-image` moves to the route-local Dynamic StyleX owner while preserving the legacy `project-header-outer` DOM/classes, breadcrumb copy, and responsive geometry; the focused header-logo test covers the legacy header/list source, Dynamic StyleX carrier, stable owner, and absence of a literal inline background declaration.

Batch 317 applies the workflow to the authenticated `/sites/massmail` project-recipient state. The conditional `#project-list-wrap` display moves from a React inline declaration to a conditional StyleX owner, preserving the legacy `hide` class, recipient radio interaction, project input geometry, typeahead behavior, and responsive containment. The focused massmail project-input test covers hidden/visible state, computed display, no literal inline display, selection/add behavior, and desktop/mobile containment.

Batch 318 applies the workflow to the authenticated `/_import` repository-authenticated state. The conditional `#repoAuth` display moves from a React inline declaration to a conditional StyleX owner, preserving the legacy `repo-auth-wrap` class, checkbox interaction, auth fields, focus behavior, and responsive form geometry; the focused project-import test covers the legacy source boundary, stable owner, Dynamic StyleX source, and absence of the former inline declaration.

Batch 319 applies the workflow to the authenticated `/$ownerName/$projectName/posts` populated board-list label state. Server-provided label background, text, and inset shadow paint moves from the legacy inline helper to a route-local Dynamic StyleX owner while preserving the board label classes, metadata, copy, filtering behavior, and desktop/mobile containment; the focused posts residual test covers source evidence, computed paint, and absence of literal inline declarations.

Batch 320 applies the workflow to the authenticated project pull-request changes comment-delete modal state. The conditional modal `display:block` declaration moves from a React inline style to a conditional StyleX owner, preserving the legacy modal DOM, delete copy, interaction, and responsive containment; the focused changes residual test covers source evidence and the absence of the former inline display.

Batch 321 applies the workflow to the populated public `/$user` profile filter popover anchors. The static `position:relative` declarations move from React inline styles to a shared route-local StyleX owner, preserving the legacy common partial DOM, hover/focus popover behavior, and responsive containment; the focused user-profile test covers source evidence, computed position, and absence of literal inline declarations.

Batch 322 applies the workflow to the anonymous `/resetPassword` no-token validation popover. The fallback display, max-width, position, and runtime left/top values move from inline declarations to conditional/Dynamic StyleX owners, preserving the `.popover.left.in` DOM, validation copy, placement, and responsive containment; the focused reset-password test covers fallback geometry and absence of literal inline position.

Batch 323 applies the workflow to the authenticated issue-detail anonymous/unauthorized vote state. The legacy disabled-vote color moves from inline styling to a route-local StyleX owner while preserving the `ybtn-disabled` class, login-required title, heart control, and issue-detail geometry; the focused disabled-vote test covers source evidence and the absence of the former inline color.

Batch 324 applies the workflow to the authenticated `/$ownerName/$projectName/pullRequests` two-column hover-popover state. The conditional popover display and fixed offsets move from a React inline declaration to route-local conditional StyleX while preserving the legacy common checkbox DOM, popover copy, hover/focus timing, and desktop/mobile containment; the focused project pull-request test covers source evidence, computed offsets, and absence of the former inline style.

Batch 325 applies the workflow to the authenticated project code-file open-in-browser popover anchor. The static inline-block/relative wrapper declarations move to a route-local StyleX owner, preserving the legacy action/popover DOM, hover/focus behavior, and flex geometry; the focused code-file residual test covers source evidence, computed anchor behavior, and absence of literal inline declarations.

Batch 326 applies the workflow to the authenticated `/$ownerName/$projectName/commit/$commitId` original-message toggle state. The generated toggle's static `border:0` declaration moves from the legacy `yobi.OriginalMessage` behavior into route-local StyleX, preserving the `...` button, padding, React show/hide interaction, and commit-detail geometry; the focused commit-detail test covers legacy source evidence, stable owner, StyleX border ownership, and absence of the former inline declaration.

Batch 327 applies the workflow to the authenticated project-setting project-name transfer popover. The relative name-field anchor and visible popover display/offset/width declarations move to route-local StyleX while preserving the legacy `.popover.left.in` DOM, transfer copy, focus behavior, and responsive form geometry; the focused project-setting test covers source evidence, computed popover geometry, and absence of literal inline offsets.

Batch 328 applies the workflow to the authenticated project issue-form editor textarea. Static overflow/wrapping/resize and runtime height declarations move to route-local conditional/Dynamic StyleX, retaining editor behavior and responsive geometry; the focused issue-form residual test covers source ownership and absence of the former inline declarations.

Batch 329 applies the workflow to the authenticated `/user/issues` child-issue visible state. The conditional child-list `display:block` declaration moves to a conditional StyleX owner while preserving the `child-issue-list hide` classes, show-subtasks interaction, and responsive issue geometry; the focused child-list test covers source evidence and the absence of the former inline display.

Batch 330 applies the workflow to the authenticated organization issue-list two-column hover-popover state. The conditional popover display and fixed offsets move from a React inline declaration to route-local conditional StyleX while preserving the legacy common checkbox DOM, popover copy, hover/focus timing, and responsive containment; the focused organization-issues residual test covers source evidence, computed offsets, and absence of the former inline style.

Batch 331 applies the workflow to the authenticated `/sites/massmail` project-suggestion dropdown state. The conditional typeahead menu `display:block` declaration moves from a React inline style to a route-local conditional StyleX owner while preserving the legacy typeahead classes, project suggestion copy, selection/add interaction, and responsive containment; the focused massmail project-input test covers the visible computed display, absence of literal inline display, and selection behavior.

Batch 332 applies the workflow to the authenticated `/_import` owner/VCS Select2 state. The fixed 220px container/dropdown geometry and inherited button-label declarations move to route-local StyleX while preserving Select2 DOM/classes, owner switching, VCS disabled behavior, and responsive form geometry; the focused project-import test covers source evidence, stable owners, StyleX geometry ownership, and absence of former inline widths.

Batch 333 applies the workflow to the authenticated pull-request detail help-modal state. Conditional modal visibility moves to route-local StyleX while preserving the legacy modal DOM, copy, open/close state, and responsive containment; the focused help-modal test covers source evidence and both visibility owners.

Batch 334 applies the workflow to the authenticated project post form upload state. The conditional paste-help `display:block` declaration moves to route-local conditional StyleX while preserving the legacy upload partial, copy, capability detection, and responsive upload geometry; the focused postform test covers legacy source evidence and the absence of the former inline display.

Batch 335 applies the workflow to the authenticated organization member-delete confirmation state. The conditional modal `display:block` declaration moves to the route-local StyleX owner while preserving the legacy modal DOM, copy, backdrop, mutation flow, and responsive geometry; the focused organization-members test covers source evidence and delete interaction.

Batch 336 applies the workflow to the authenticated organization setting name-validation state. The hidden `wrongName` message `display:none` declaration moves to a route-local conditional StyleX owner while preserving the legacy span class/copy, validation state, and responsive form geometry; the focused organization-settingform test covers source evidence and validation visibility.

Batch 337 applies the workflow to the authenticated new pull-request form upload state. The conditional paste-help `display:block` declaration moves to route-local conditional StyleX while preserving the legacy upload partial, copy, capability detection, and responsive upload geometry; the focused new-pull-request-form test covers legacy source evidence and absence of the former inline display.

Batch 338 applies the workflow to the authenticated new milestone form upload state. The conditional paste-help `display:block` declaration moves to route-local conditional StyleX while preserving the legacy upload partial, copy, capability detection, and responsive upload geometry; the focused new-milestone-form test covers legacy source evidence and absence of the former inline display.

Batch 339 applies the workflow to the authenticated project form conditional owner/VCS/menu state. The three boolean/enum display declarations move to route-local conditional StyleX while preserving the legacy protected-owner option, VCS warning, menu checkbox DOM, copy, submit behavior, and responsive form geometry; the focused projectform test covers source evidence and all three owners.

Batch 340 applies the workflow to the authenticated milestone edit form upload state. The conditional paste-help `display:block` declaration moves to route-local conditional StyleX while preserving the legacy file uploader, copy, capability detection, and responsive upload geometry; the focused milestone-edit-form test covers legacy source evidence and absence of the former inline display.

Batch 341 applies the workflow to the authenticated board-post edit form upload state. The conditional paste-help `display:block` declaration moves to route-local conditional StyleX while preserving the legacy file uploader, copy, capability detection, and responsive upload geometry; the focused post-edit-form test covers legacy source evidence and absence of the former inline display.

Batch 342 applies the workflow to the authenticated user edit avatar upload/crop state. Upload progress visibility/width and crop-modal visibility move to route-local conditional StyleX while preserving the legacy avatar DOM, classes, copy, React upload/crop behavior, and responsive geometry; the focused user-editform test covers source evidence and all three owners.

Batch 343 applies the workflow to the authenticated code browser branch Select2 state. The conditional dropdown `display:block` and fixed 220px width move to route-local conditional StyleX while preserving Select2 DOM/classes, branch options, interaction, and responsive geometry; the focused code-branch test covers legacy source evidence and absence of the former inline declaration.

Batch 344 applies the workflow to the authenticated project delete form code-menu state. The conditional code-menu `display:none` declaration moves to a route-local conditional StyleX owner while preserving the legacy settings-menu DOM, permission logic, copy, submit flow, and responsive geometry; the focused deleteform test covers legacy source evidence and absence of the former inline declaration.

Batch 345 applies the workflow to the authenticated project transfer form code-menu state. The conditional code-menu `display:none` declaration moves to a route-local conditional StyleX owner while preserving the legacy settings-menu DOM, permission logic, copy, submit flow, and responsive geometry; the focused transfer test covers legacy source evidence and absence of the former inline declaration.

Batch 346 applies the workflow to the authenticated project webhooks code-menu state. The conditional code-menu `display:none` declaration moves to route-local conditional StyleX while preserving the legacy webhook/settings-menu DOM, permission logic, copy, form behavior, and responsive geometry; the focused webhooks test covers legacy source evidence and absence of the former inline declaration.

Batch 347 applies the workflow to the authenticated project members code-menu state. The conditional code-menu `display:none` declaration moves to route-local conditional StyleX while preserving the legacy members/settings-menu DOM, permission logic, copy, member actions, and responsive geometry; the focused members test covers legacy source evidence and absence of the former inline declaration.

Batch 348 applies the workflow to the authenticated project change-VCS code-menu state. The conditional code-menu `display:none` declaration moves to route-local conditional StyleX while preserving the legacy change-VCS/settings-menu DOM, permission logic, copy, form behavior, and responsive geometry; the focused change-VCS test covers legacy source evidence and absence of the former inline declaration.

Batch 349 applies the workflow to the authenticated issue-detail label-control state. The fixed legacy `display:inline-block` declaration moves to a route-local StyleX owner while preserving Select2-compatible DOM/classes, label interaction, and responsive geometry; the focused label-control test covers legacy source evidence and absence of the former inline declaration.

Batch 350 applies the workflow to the authenticated project issues child-list state. The conditional child-list `display:block` declaration moves to route-local conditional StyleX while preserving the legacy child-issue DOM, reveal behavior, copy, and responsive geometry; the focused child-list test covers legacy source evidence and absence of the former inline declaration.

Batch 351 applies the workflow to the authenticated project posts keymap modal state. The conditional modal `display:block` declaration moves to route-local conditional StyleX while preserving the legacy help-keymap DOM, keyboard interaction, copy, and responsive geometry; the focused keymap test covers legacy source evidence and absence of the former inline declaration.

Batch 352 applies the workflow to the authenticated board-post original-message toggle state. The fixed legacy `border:0` declaration moves into the route-local StyleX owner while preserving the legacy toggle DOM, copy, interaction, and responsive geometry; the focused original-message test covers legacy script evidence and absence of the former inline declaration.

Batch 353 applies the workflow to the authenticated issue-form title suggestion category state. The server-provided suggestion label color moves to the existing route-local Dynamic StyleX color owner while preserving suggestion DOM, copy, selection behavior, and responsive geometry; the focused suggestion-color test covers legacy source evidence and absence of the former literal inline color declaration.

Batch 354 applies the workflow to the authenticated milestone-detail delete-confirm modal state. The conditional modal display declarations move to route-local conditional StyleX while preserving the legacy modal DOM, aria state, copy, deletion interaction, and responsive geometry; the focused delete-visibility test covers legacy source evidence and absence of the former inline display declaration.

Batch 355 applies the workflow to the authenticated board-post comment-delete modal state. The conditional modal `display:block` declaration moves to the existing route-local StyleX owner while preserving the legacy comment-delete DOM, copy, React visibility interaction, and responsive geometry; the focused delete-modal test covers legacy source evidence and absence of the former inline display declaration.

Batch 356 applies the workflow to the authenticated project-setting default-branch dropdown state. The conditional dropdown `display:block` declaration moves to route-local conditional StyleX while preserving the legacy Select2 DOM, branch selection behavior, copy, and responsive geometry; the focused default-branch test covers legacy source evidence and absence of the former inline display declaration.

Batch 357 applies the workflow to the authenticated code-file open-in-browser popover state. The static popover positioning and visible display declarations move to route-local StyleX while preserving the legacy code-file anchor/popover DOM, hover interaction, copy, and responsive geometry; the focused popover test covers legacy source evidence and absence of the former inline positioning declaration.

Batch 358 applies the workflow to the authenticated board-post comment-edit state. The conditional comment-body hidden and editor visible declarations move to the route-local conditional StyleX owner while preserving the legacy comment DOM, editor interaction, copy, and responsive geometry; the focused comment-edit test covers legacy source evidence and absence of the former inline display declarations.

Batch 359 applies the workflow to the authenticated project-setting default-branch control state. The static Select2 choice dimensions and box-sizing declarations move to the route-local StyleX owner while preserving the legacy control DOM, branch selection behavior, copy, and responsive geometry; the focused control test covers legacy source evidence and absence of the former inline dimensions.

Batch 360 applies the workflow to the authenticated organization-home leave modal state. The conditional modal `display:block` declaration moves to the route-local conditional StyleX owner while preserving the legacy leave-modal DOM, aria state, copy, leave interaction, and responsive geometry; the focused leave-modal test covers legacy source evidence and absence of the former inline display declaration.

Batch 361 applies the workflow to the authenticated board-post modal states. The history modal, comment-delete modal, and keymap modal conditional `display:block` declarations move to route-local conditional StyleX owners while preserving the legacy modal DOM, aria state, copy, interactions, and responsive geometry; the focused modal tests cover legacy source evidence and absence of the former inline display declarations.

Batch 362 applies the workflow to the authenticated organization-home project-filter state. The filtered project item conditional `display:none` declaration moves to the route-local conditional StyleX owner while preserving the legacy project-list DOM, filter behavior, copy, and responsive geometry; the focused project-filter test covers legacy source evidence and absence of the former inline display declaration.

Batch 364 applies the workflow to the authenticated board-post disabled-comment state. The fixed legacy `cursor:text` declaration moves to the route-local StyleX owner while preserving the legacy disabled textarea DOM, copy, interaction restrictions, and responsive geometry; the focused disabled-comment test covers legacy source evidence and absence of the former inline cursor declaration.

Batch 366 applies the workflow to the authenticated user-issues default-login action state. The conditional action `display:none` declaration moves to the route-local conditional StyleX owner while preserving the legacy action DOM, mutation behavior, copy, and responsive geometry; the focused default-login test covers legacy source evidence and absence of the former inline display declaration.

Batch 367 applies the workflow to the authenticated board-post share-link state. The fixed legacy `display:none` declaration moves to the route-local StyleX owner while preserving the legacy share-link DOM, copy, visibility behavior, and responsive geometry; the focused share-link test covers legacy source evidence and absence of the former inline display declaration.

Batch 368 applies the workflow to the authenticated user-issues default-login popover state. The static popover positioning declarations move to the route-local StyleX owner while preserving the legacy action/popover DOM, hover interaction, copy, and responsive geometry; the focused popover test covers legacy source evidence and absence of the former inline style constant.

Batch 369 applies the workflow to the authenticated milestone-detail issue-filter state. The conditional filtered-row `display:none` declaration moves to the route-local conditional StyleX owner while preserving the legacy search markers, issue-row DOM, filter behavior, copy, and responsive geometry; the focused filter test covers legacy source evidence and absence of the former inline display declaration.

Batch 370 applies the workflow to the authenticated project-home header background state. The server-provided project background URL moves from a literal inline declaration to a route-local Dynamic StyleX owner while preserving the legacy project-header DOM, overlay cascade, copy, and responsive geometry; the focused header-background test covers the legacy source contract and absence of the former inline declaration.

Batch 371 applies the workflow to the authenticated issue-form mention mirror scroll state. The runtime textarea scroll transform moves from a literal inline declaration to a route-local Dynamic StyleX function while preserving the legacy editor/mention DOM and scroll behavior; the focused mention-scroll test covers the legacy source contract and Dynamic StyleX ownership.

Batch 372 applies the workflow to the authenticated organization-issues header background state. The server-provided organization logo URL moves from a literal inline declaration to a route-local Dynamic StyleX owner while preserving the legacy project-header DOM, overlay cascade, copy, and responsive geometry; the focused header-background test covers the legacy source contract and absence of the former inline declaration.

Batch 373 applies the workflow to the authenticated project-setting description state. The runtime textarea height moves from a literal inline declaration to a route-local Dynamic StyleX function while preserving the legacy editor overflow/wrapping/resize behavior, copy, and responsive geometry; the focused overview-height test covers the legacy source contract and dynamic carrier.

Batch 374 applies the workflow to the authenticated issue-detail label search state. The fixed Select2 search-input width moves from a literal inline declaration to a route-local StyleX owner while preserving the legacy label-picker DOM, focus interaction, and responsive geometry; the focused label-search test covers the legacy Select2 source contract and absence of the former inline width.

Batch 375 applies the workflow to the authenticated pull-request changes pending-block state. The finite `display:block` declaration moves to conditional StyleX while runtime `top`/`left` coordinates move to Dynamic StyleX, preserving the legacy review block DOM, interaction, and geometry; the focused pending-block test covers the legacy source contract and split ownership.

Batch 376 applies the workflow to the authenticated issue-detail keymap wrapper state. The fixed legacy `padding` and `margin-left` declarations move to a route-local StyleX owner while preserving the keymap DOM, keyboard interaction, copy, and responsive geometry; the focused keymap-wrapper test covers the legacy source contract and absence of the former inline spacing.

Batch 377 applies the workflow to the authenticated labels-management preset-color state. The server-provided preset color moves from a literal inline background declaration to route-local Dynamic StyleX while preserving the preset button DOM, color selection interaction, copy, and responsive geometry; the focused preset-color test covers the legacy source contract and dynamic carrier.

Batch 378 applies the workflow to the authenticated root user-menu site-admin action state. The fixed admin wrench link font size moves from a literal inline declaration into the existing route-local StyleX owner while preserving the legacy user-menu DOM, icon, navigation, and responsive geometry; the focused admin-font test covers the legacy source contract and absence of the former inline font declaration.

Batch 379 applies the workflow to the UIKit issue-label state. The runtime label background color moves to Dynamic StyleX and fixed white text paint moves to colocated StyleX while preserving the legacy label DOM, copy, and interaction; the focused UIKit label test covers the owner and absence of the former inline paint.

Batch 380 applies the workflow to the authenticated issue-detail comment share-link state. The fixed hidden display moves to a route-local conditional StyleX owner while preserving the legacy comment DOM, copy, and visibility behavior; the focused share-link test covers the legacy source contract and absence of the former inline display.

Batch 381 applies the workflow to the authenticated root user-menu dropdown color state. The theme navigation colors move into existing route-local StyleX owners while the separate fixed create-menu margin remains an inline-independent owner; the focused dropdown-color test covers the legacy source contract, owners, and absence of the former inline colors.

Batch 382 applies the workflow to the authenticated project-setting loaded state. The runtime project logo background URL moves to Dynamic StyleX and the default-branch Select2 result button's static inherited declarations move to direct StyleX; the focused setting test covers both owners and removal of the former inline declarations.

Batch 383 applies the workflow to the authenticated issue-detail voter summary state. The fixed voter-summary right margin moves to a route-local StyleX owner while preserving the legacy comment/voter DOM, tooltip copy, and responsive geometry; the focused voter-summary test covers the legacy source contract and absence of the former inline margin.


Batch 312 applies the workflow to the authenticated `/$ownerName/$projectName/issue/$issueNumber/editform` selected-label state. The server-provided selected label color moves to route-local Dynamic StyleX while preserving the legacy Select2 label picker DOM, classes, copy, selected state, and geometry; the focused editform label test covers the dynamic owner and absence of a literal inline background declaration.



After this plan is approved for execution, start only with Wave 0 and the existing transparent
root-boundary pilot. Do not begin broad component conversion until the layer precedence test,
generated fallback, production build, and base-path delivery are all green. The first visible
component slice should then be the root shell user menu because it owns `_usermenu.less`, has
desktop/mobile coverage, and can retire one bounded fallback module without touching unrelated
route families.

Batch 384 applies the workflow to the authenticated project-history state. The fixed stream, header, others, and date spacing declarations move to route-local StyleX owners while preserving the legacy history DOM and responsive geometry; the focused history test covers the legacy source contract and absence of the former inline declarations.

Batch 385 applies the workflow to the authenticated project-label category typeahead state. The fixed suggestion-button presentation declarations move to direct route-local StyleX while preserving Bootstrap typeahead DOM, active-state behavior, copy, and geometry; the focused category-suggestion test covers the legacy source contract and absence of the former inline object.

Batch 386 applies the workflow to the authenticated issue-detail secondary comment share-link state. The fixed hidden display reuses the existing route-local StyleX owner while preserving the legacy comment DOM, copy, visibility behavior, and responsive geometry; the focused secondary-share-link test covers the legacy source contract and absence of the former inline display.

Batch 387 applies the workflow to the authenticated project-history pull-request metadata state. The fixed date color and link right margin move to route-local StyleX owners while preserving the legacy history DOM and responsive geometry; the focused metadata test covers the legacy source contract and absence of the former inline declarations.

Batch 388 applies the workflow to the authenticated project-setting description state. The fixed textarea overflow, wrapping, and resize declarations move to a route-local StyleX owner while preserving the existing Dynamic StyleX height and legacy form behavior; the focused textarea test covers the legacy source contract and absence of the former inline object.

Batch 389 applies the workflow to the authenticated issue-detail fixed inline-owner state. The two assignee widths and disabled-comment cursor move to direct route-local StyleX owners while preserving Select2/comment DOM, copy, interaction, and responsive geometry; the focused fixed-owner test covers the legacy source contracts and absence of the former inline declarations.

Batch 390 applies the workflow to the authenticated project-history activity geometry state. The fixed stream/list/item spacing and border declarations move to route-local StyleX owners while preserving legacy history DOM and responsive geometry; the focused activity-geometry test covers the legacy source contract and owner consumers.

Batch 391 applies the workflow to the public user-profile static popover state. The shared two-column/show-subtasks popover geometry moves to a route-local StyleX owner while preserving legacy popover DOM, copy, hover/focus behavior, and responsive geometry; the focused profile-popover test covers the legacy source contract and owners.

Batch 392 applies the workflow to the authenticated project-history whereis state. The fixed whereis, where, title, and date paint declarations move to route-local StyleX owners while preserving legacy history links, copy, and responsive geometry; the focused whereis-owner test covers the legacy source contract and owners.

Batch 393 applies the workflow to the public user-profile static owner state. The avatar wrapper geometry/paint, profile-name typography, and edit alignment move to route-local StyleX while preserving the Dynamic avatar background carrier, DOM, copy, and responsive geometry; the focused static-owner test covers the legacy source contract and owners.

Batch 394 applies the workflow to the authenticated project-issues clickable-row state. The finite two-column cursor declaration moves to conditional route-local StyleX while preserving the dynamic hover background carrier, issue-row DOM, keyboard interaction, and geometry; the focused clickable-row test covers the legacy source contract and owner.

Batch 395 applies the workflow to the authenticated user-issues static popover state. The two-column/show-subtasks popover geometry moves to route-local StyleX owners while preserving legacy popover DOM, copy, visibility behavior, and responsive geometry; the focused user-issues popover test covers the legacy source contract and owners.

Batch 396 applies the workflow to the authenticated project-posts static popover state. The two-column popover geometry moves to a route-local StyleX owner while preserving legacy popover DOM, copy, visibility behavior, and responsive geometry; the focused posts-popover test covers the legacy source contract and owner.

Batch 397 applies the workflow to the authenticated project-milestones filtered issue-link state. The conditional hidden `display:none` declaration moves to a route-local conditional StyleX owner while preserving milestone filtering, issue-link DOM, copy, and geometry; the focused hidden-issue test covers the legacy source contract and owner.
Batch 398 applies the workflow to the authenticated user-files attachment list. Fixed attachment header and file-row paint, typography, borders, and spacing move to route-local StyleX owners while preserving the legacy attachment DOM, copy, hover behavior, and responsive geometry; the focused static-owner test covers the legacy source contract and absence of former inline declarations.

Batch 399 applies the workflow to the authenticated project pull-request list row state. The conditional two-column `cursor:pointer` declaration moves to route-local conditional StyleX while preserving row click behavior, legacy classes, copy, and responsive geometry; the focused row-pointer test covers the owner and former inline removal.

Batch 400 applies the workflow to the authenticated commit review textarea state. The fixed review textarea height moves to a route-local StyleX owner while preserving editor DOM, review interaction, copy, and responsive geometry; the focused textarea test covers the legacy source contract and owner.
