# DESIGN.md: Legacy Yona UI Baseline

This project is a conversion of legacy Yona, not a redesign. Frontend component
design must preserve the user-visible tone, layout density, typography, and
component behavior of `yona-original/` unless an explicit provenance document
records a gap or deviation.

## Source Order

1. `yona-original/app/views/**` for page structure, labels, and control order.
2. `yona-original/app/assets/stylesheets/yobi.less` and imported LESS files for
   component styling.
3. `yona-original/public/bootstrap/css/bootstrap.css` and
   `bootstrap-responsive.css` for legacy Bootstrap defaults.
4. Current Rust/React implementation files under `frontend/src/**`.
5. Provenance docs under `docs/provenance/**` for documented gaps and
   deviations.

When these sources disagree, prefer visible legacy behavior from
`yona-original/app/views/**`, then legacy LESS, then current implementation.

## Frozen Pixel-Parity Styles

The complete `yona-original/app/assets/stylesheets/yobi.less` import graph and
the legacy Bootstrap CSS files listed above are an immutable styling baseline.
Do not edit them, and do not compensate for screenshot differences with new
route-specific spacing, positioning, transforms, fixed dimensions, or
viewport-specific numeric offsets.

During the incremental StyleX migration, runtime copies of the active legacy
and plugin stylesheet chain are generated into one lower-priority `legacy`
cascade layer. StyleX may own only a recorded React surface and must preserve
the exact legacy values and visible geometry. The generated fallback and its
hash manifest are transitional runtime artifacts; the frozen files remain the
styling source of truth.

Pixel parity must come from the same visible element roles, DOM nesting and
order, legacy class composition, assets/fonts, cascade, and box model. When a
legacy jQuery plugin is replaced by React, reproduce its user-visible generated
DOM with React state and events. Any CSS needed for that replacement must be a
directly traceable legacy LESS/CSS rule, scoped only to the React-owned surface;
record its original file, selector, and rule in provenance and focused tests.
An unexplained new numeric CSS value is a parity failure, even if it makes a
screenshot metric pass.

## Global Shell

- Background: use legacy white (`#fff`) as the default page background.
- Typography: use the legacy base font stack from `_variables.less`:
  `-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif`.
- Base text: `13px` size, `18px` line height, `#333` color.
- Links inherit text color by default and use Yona orange (`#f36c22`) on hover
  or focus.
- Keep views dense and work-focused. Avoid hero-page scale, marketing cards,
  decorative gradients, oversized headings, and editorial spacing.

## Legacy Colors

Use the names and values below as the canonical palette for new component CSS:

| Name | Value | Legacy Source |
| --- | --- | --- |
| Primary orange | `#f36c22` | `_variables.less @orange` |
| Yobi primary | `#ff7332` | `_variables.less @yobi-orange` |
| Yobi primary hover | `#e95e01` | `_variables.less @yobi-orange-dark` |
| Link cyan | `#51aacc` | `_variables.less @yobi-link`, `@blue2` |
| Panel gray | `#f2f2f2` | `_variables.less @yobi-white-dark` |
| Border gray | `#ececec`, `#d9d9d9`, `#ccc` | `_variables.less gray tokens` |
| Body text | `#333` | `_variables.less @base-text-color` |
| Secondary text | `#666`, `#878787` | `_variables.less gray tokens` |
| Error red | `#c93426`, `#b13427` | `_variables.less @yobi-red` |

Do not introduce broad beige, cream, sand, tan, brown, purple-gradient, or
storybook-like palettes for application screens. In particular, the temporary
`#f5f1e8` beige background and Georgia/Times serif stack are forbidden.

## Components

### Buttons

Base button behavior follows `.ybtn` in `_yobiUI.less`:

- Inline-block, `3px` radius, subtle border, compact vertical rhythm.
- Default buttons are white with gray text.
- Primary/success actions use Yona orange and white text.
- Hover/focus changes background and border without large animation.

### Forms

- Preserve legacy field names, labels, and submit order from the Scala templates.
- Inputs use white background, gray border, `3px` radius, and compact padding.
- Textareas use the fixed-width stack from `_variables.less`.
- Validation and API errors must be visible in-page, not only in the console.

### Tabs And Lists

- Prefer legacy Bootstrap-style `.nav-tabs` and dense list/table surfaces.
- Avoid nested cards and large decorative containers.
- Reuse existing legacy class names (`page-wrap`, `project-page-wrap`,
  `post-list-wrap`, `filter-wrap`, `ybtn`, `nav-tabs`) when the corresponding
  legacy surface already uses them.

### Auth And Public Screens

- Auth screens should follow legacy labels and field order:
  `/users/loginform`, `/users/signupform`, `/lostPassword`, `/resetPassword`.
- Public landing and directory screens should preserve legacy navigation and
  copy before any visual polish.
- Do not use product-marketing hero composition for application routes.

## Harness Rules

`tools/yona-design-harness.mjs` enforces the baseline for staged frontend
component changes.

The harness must fail when:

- `DESIGN.md` is missing required legacy-source anchors.
- A staged frontend UI/component file introduces forbidden temporary design
  tokens such as `#f5f1e8`, `Georgia`, or `"Times New Roman"`.
- `frontend/src/main.tsx` no longer imports `./app.css`.
- `frontend/src/app.css` drops the legacy baseline tokens required by this
  document.

The harness is intentionally conservative. It does not certify full visual
parity; it blocks known drift and forces design work to keep `DESIGN.md` and
`yona-original/` in the loop.
