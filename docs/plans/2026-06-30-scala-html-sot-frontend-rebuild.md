# Scala HTML SOT Frontend Rebuild Boundary

Status: active execution directive
Date: 2026-06-30

This document defines the frontend reset boundary for rebuilding the React SPA
from legacy Yona Scala HTML. It is a stricter execution companion to
`docs/plans/2026-06-28-destructive-template-frontend-rebuild.md`.

## Core Directive

The source of truth for frontend UI is the legacy Scala HTML under
`yona-original/app/views/**`, plus the legacy LESS/CSS and message files those
templates depend on.

Existing React TSX page/component implementations are not UI parity evidence.
They may be kept only as temporary migration reference outside the active route
tree, and they must not decide DOM shape, copy, class names, field names, link
targets, layout, or interaction order.

When rebuilding a route packet:

1. Identify the owning Scala HTML template, included partials, legacy route,
   related JavaScript, LESS/CSS, and message keys.
2. Delete or quarantine the current active TSX page/component implementation
   for that packet before writing the replacement.
3. Delete or replace existing broad E2E tests for that packet. Tests based on
   token presence, isolated selectors, or current JSX structure are not valid
   parity tests.
4. Write RED E2E tests from the Scala HTML/rendered legacy page first.
5. Port the Scala HTML mechanically into JSX.
6. Replace only the stack-boundary parts listed below.
7. Wire data through REST JSON API and TanStack Query.
8. Go GREEN only when rendered SPA DOM matches the legacy-rendered target within
   the documented boundary differences.

## Existing TSX Deletion Policy

For each rebuild packet, active route/page TSX that was independently designed
before the template-first reset must be removed from the active implementation.

Allowed temporary states:

- Move old TSX to a clearly named archive path outside the active route tree.
- Keep neutral utilities, API clients, generated route plumbing, query client
  setup, i18n lookup helpers, and runtime config code when they do not control
  page DOM or UX.
- Keep a compile-only route placeholder only long enough to make the RED test
  fail for missing legacy DOM. A placeholder is not parity work.

Forbidden temporary states:

- Keeping old JSX and patching it until tests pass.
- Treating current JSX hierarchy as component decomposition guidance.
- Using existing TSX tests as proof that a route matches legacy UI.
- Extracting new shared components before the copied Scala HTML skeleton is
  rendered and verified.

## E2E Reset Policy

Each Scala HTML route/state gets a new E2E test before TSX implementation.

The new test must:

- Navigate through rendered TanStack Router `Link` anchors or legacy buttons for
  intermediate SPA page movement.
- Use direct `page.goto` only for the initial entry or for a route that has no
  visible legacy navigation path.
- Compare rendered DOM structure from the legacy page against rendered SPA DOM,
  not source JSX and not broad `contains` checks.
- Preserve tag names, class/id/name/type/placeholder/href/src, layout-relevant
  `data-*` attributes, child order, nesting, and stable visible text.
- Fail RED before the template-derived TSX implementation exists.

The test may normalize only the explicit stack-boundary differences in this
document.

## Allowed Differences From Scala HTML

These are the only expected differences between legacy Scala HTML output and
the React/TanStack implementation. Anything else is a parity gap unless a
separate provenance document records a narrower exception.

### 1. Runtime Shell And SPA Routing

Legacy Yona renders full HTML documents and server-side layouts. The new
frontend is a React SPA with TanStack Router.

Allowed change:

- React owns client-side route transitions.
- Internal view-to-view navigation must use TanStack Router `Link` components
  while preserving the legacy `href` deep link in the rendered anchor.
- Programmatic navigation is allowed only for legacy non-anchor flows such as
  form success redirects, modal decisions, or imperative callbacks.
- The initial Vite/root mount wrapper may differ from the legacy document shell.

Not allowed:

- Changing visible route URLs.
- Reordering navbar/project/org/site-admin menu items.
- Replacing legacy anchors with buttons when the legacy UI used links.
- Replacing internal legacy anchors with plain React `<a>` handlers when a
  TanStack Router `Link` can represent the same deep link.
- Testing intermediate page movement by direct `goto` instead of clicking the
  rendered `Link`/anchor navigation that users see.

E2E requirement:

- For internal navigation parity, tests must click the rendered `Link` anchor,
  assert the legacy `href`, and then assert the SPA URL/DOM transition.
- Direct route entry is only the first step of a scenario, not proof that page
  navigation parity works.

### 2. Sidebar And User Menu Fragments

Legacy Yona served sidebar/user-menu content through backend HTML fragments
such as `index/sidebar.scala.html`, `common/usermenu.scala.html`, and related
fragment routes.

React must not fetch server-rendered HTML fragments for runtime UI.

Allowed change:

- Root layout renders the sidebar and user-menu surfaces as React components.
- Sidebar/user-menu data comes from REST JSON endpoints and TanStack Query.
- TanStack Router owns SPA navigation in and out of sidebar links.

Required parity:

- Preserve legacy visible structure: `.sidenav`, `.right-menu`,
  `.user-menu-wrap`, `.nav-tabs`, `#usermenu-tab-content-list`,
  `#myOrganizationList`, `#myProjectList`, and `#myRecentIssueList`.
- Preserve tab order, labels, empty/loading states, link targets, avatar/logo
  placement, and menu density.

### 3. Data Binding And Template Parameters

Legacy Scala HTML receives Play controller parameters, model objects, helper
results, message lookups, and route helpers.

Allowed change:

- Template parameters become typed REST JSON response fields.
- Server loops/conditionals become JSX loops/conditionals after the static
  legacy skeleton is copied.
- Data fetching uses the existing REST API client plus TanStack Query hooks.
- Mutations use TanStack Query mutations and targeted invalidation.

Not allowed:

- One-off `fetch` calls inside page components.
- Reintroducing runtime HTML template rendering as a shortcut.
- Inventing a different view model that changes visible order, labels, empty
  states, or conditional controls.

### 4. Forms, CSRF, And Submit Boundaries

Legacy forms often submit directly to Play controller routes with hidden CSRF
fields.

Allowed change:

- React intercepts submit and calls REST mutations.
- CSRF is transported through runtime bootstrap/header mechanisms instead of
  matching a hidden legacy field.
- Legacy `form action` values may be omitted or normalized in tests when the
  React form uses a submit handler.

Required parity:

- Preserve form wrapper DOM, `method`, `name`, input order, `id`, `name`,
  `type`, `placeholder`, labels, button classes, validation/error markup, and
  success/failure visible states.
- Preserve hidden non-CSRF fields when they affect legacy behavior, such as
  redirect path, hash string, resource id, or filter state.

### 5. Assets And Base Path

Legacy HTML references `/assets/**`; the SPA may serve copied legacy assets
under a different mounted asset prefix.

Allowed change:

- Normalize `/yona` base path differences.
- Normalize known static asset prefix differences only when the referenced
  asset is the same legacy asset.

Not allowed:

- Replacing legacy imagery, icons, CSS classes, or asset-dependent layout with
  new design assets.

### 6. Legacy JavaScript Behaviors

Legacy pages rely on jQuery modules, bootstrap plugins, and page scripts.

Allowed change:

- Implement behavior in React event handlers when the visible UX and DOM state
  match legacy.
- Keep legacy-compatible `data-*` attributes where they are layout, test, or
  behavior contracts.

Required parity:

- Modals, dropdowns, tabs, filters, pagination, validation messages, upload
  controls, editor preview, task-list controls, and confirmation flows must
  expose the same visible states as the Scala HTML plus legacy JavaScript.

### 7. Volatile Runtime Values

Allowed normalization:

- CSRF token values.
- Session/cookie-only state.
- Generated timestamps when the displayed value is not a stable fixture.
- Runtime IDs that are not visible, not used for layout, and not part of a
  legacy selector contract.

Not allowed:

- Normalizing away visible copy, placeholder text, class names, control order,
  or stable data shown to users.

## RED-GREEN Per Scala HTML

For every template/state:

1. RED: write or replace an E2E test that compares the rendered legacy page to
   the rendered SPA target with only documented normalizations.
2. DELETE: remove/quarantine current TSX for the packet so old JSX cannot pass
   as accidental evidence.
3. COPY: convert the Scala HTML and included partials into JSX as literally as
   React syntax allows.
4. BIND: replace Play template parameters with REST JSON + TanStack Query data.
5. GREEN: pass the focused E2E comparison and any minimal API/query tests.
6. SPLIT: only after GREEN, extract React components along legacy partial
   boundaries when it reduces duplication without changing DOM.
7. RECORD: update the owning provenance/report row with legacy template path,
   route/state, current React path, API data source, test path, and remaining
   `gap`, `deviation`, or `deferred` item.

## Packet Completion Gate

A frontend packet is complete only when:

- Active TSX for the packet was rebuilt from Scala HTML, not patched from the
  old React implementation.
- Old packet E2E tests were deleted or replaced by rendered legacy-vs-SPA tests.
- Every visible state in the owning Scala HTML and partials has a RED-GREEN E2E
  test or an explicit `deferred` record.
- Data binding uses REST JSON and TanStack Query.
- Sidebar, fragments, forms, and SPA routing differences are covered only by
  the boundary rules above.

Any remaining unclassified difference is a `gap` and blocks packet closure.
