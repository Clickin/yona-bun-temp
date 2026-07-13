# Frozen CSS/LESS to StyleX Migration Plan

Status: Proposed execution plan
Date: 2026-07-13
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

| Runtime family | Canonical source | Current generated/runtime form | Treatment |
| --- | --- | --- | --- |
| Yobi application styles | `yona-original/app/assets/stylesheets/yobi.less` and its 13 imported modules | `frontend/public/legacy-assets/stylesheets/yobi.css` | Migrate module-by-module to colocated StyleX definitions |
| User menu | `yona-original/app/assets/stylesheets/usermenu.less` and `_usermenu.less` | `frontend/public/legacy-assets/stylesheets/usermenu.css` | Migrate with the root/user-menu shell wave |
| Bootstrap base | `yona-original/public/bootstrap/css/bootstrap.css` | copied runtime CSS | Migrate by component families, then remove the complete fallback |
| Bootstrap responsive | `yona-original/public/bootstrap/css/bootstrap-responsive.css` | copied runtime CSS | Migrate in the same slice as the owning desktop rule |

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
})
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
2. compile a generated LESS entry containing only active fallback modules;
3. wrap the emitted component rules in `@layer legacy { ... }`;
4. preserve source order, media queries, asset URLs, and source maps;
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

Create typed variables only for legacy LESS variables that are actually reused by migrated
rules. `stylex.defineVars` values must cite the source variable and exact value. Token work does
not authorize palette, typography, spacing, or naming changes.

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

Maintain `docs/provenance/stylex-selector-ledger.md` with one row per surface:

| Surface | Legacy selector source | React owner | New test locator | Desktop | 390 px | Fallback module | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |

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

### Wave 1 — Foundations and root shell

- legacy variables actually used by the shell;
- body/root platform bridge boundary;
- global shell, header, footer, search box, anonymous/authenticated user menu;
- `_usermenu.less`, then retire the user-menu fallback module;
- shared focus/disabled accessibility states.

Exit: landing, login, signup, setup, not-found, and authenticated shell tests pass on desktop and
390 px using semantic selectors.

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

| Gate | Required check |
| --- | --- |
| Static | `pnpm --dir frontend check`, lint/source guards, `git diff --check` |
| Build | production Vite build and generated CSS layer inspection |
| Functional | focused Playwright interaction tests for the migrated states |
| Selector | no test selector references the removed presentation class or StyleX hash |
| Visual | desktop and 390 px geometry/computed-style parity against the pre-slice baseline |
| Cascade | migrated StyleX declaration wins with fallback enabled |
| Fallback | disabling the migrated StyleX declaration reveals the legacy value until retirement |
| Delivery | `/`, configured base path, and Rust embedded assets resolve identical CSS/assets |
| Provenance | ledger row names legacy file, selector, values, React owner, and tests |

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
