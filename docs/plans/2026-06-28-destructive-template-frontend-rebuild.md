# 2026-06-28 Destructive Template Frontend Rebuild Directive

Status: active execution directive.

This document records the direct frontend parity reset strategy. It does not
edit or reinterpret prior parity documents. Existing documents remain historical
or supporting context, but frontend JSX parity work now follows this directive
when rebuilding pages.

## Reason

The current React frontend was built independently before the parity gate became
strict. Incremental reuse of the existing JSX cannot reliably expose small DOM,
copy, class, form, modal, and navigation details from legacy Yona. Frontend page
parity therefore requires a destructive, template-first rebuild instead of
patching the current React implementation.

## Objective

Rebuild Yona frontend pages from the legacy Scala HTML templates in
`yona-original/app/views/**`, preserving user-visible behavior and UX first.
The target is functional and visual parity with legacy Yona, not a new frontend
architecture or improved design.

## Hard Rules

1. Existing JSX page implementations are not parity evidence.
   - Ignore them when deciding DOM shape, labels, classes, IDs, links, forms, or
     interaction flow.
   - Archive or quarantine old page JSX before replacing a route so accidental
     reuse is visible in review.
   - Shared API clients, tests, generated types, and small utilities may be kept
     only when they do not define page DOM or UX.

2. Copy Scala HTML template structure first.
   - Use the owning template and its included partials from
     `yona-original/app/views/**`.
   - Preserve DOM order, wrapper structure, CSS classes, element IDs, form
     fields, field names, `href`, `action`, `method`, `data-*` attributes,
     modal markup, empty states, error states, and visible copy.
   - Convert template conditionals and loops directly into JSX control flow
     only after the static shape is copied.

3. Replace server rendering and ad hoc data access with TanStack Query REST.
   - Template-engine variables become typed REST JSON data loaded through the
     existing frontend API client and TanStack Query boundary.
   - Components must not introduce one-off `fetch`, `axios`, or external REST
     calls.
   - If legacy data needed by the page has no canonical `/api/v1` endpoint, add
     the smallest REST endpoint, typed client method, and focused test needed
     for that page.
   - Runtime server-rendered HTML fragments are not a replacement for a React
     page rebuild.

4. Split into JSX components only after the copied route renders.
   - The first JSX version should stay close to the Scala template.
   - Extract components along legacy partial boundaries first.
   - Do not introduce speculative layout systems, design-system abstractions, or
     reusable components that are not required by the copied template.

## Archive Policy

Before rebuilding a route group, move the old independently-built page JSX for
that group into a clearly named archive location such as:

- `frontend/src/legacy-independent-ui-archive/<route-group>/`

The archive is not a source for parity decisions. It only preserves displaced
implementation for temporary reference while the template-first replacement is
being completed. Once the replacement is verified and no longer needs the old
code for migration safety, the archive can be deleted in a later cleanup commit.

## Execution Order

1. Inventory a route group.
   - Identify every current JSX route/page/component file in scope.
   - Identify the owning Scala template and included partials.
   - Record missing API data as endpoint/client tasks, not as UI deviations.

2. Archive the current JSX route group.
   - Move old page JSX out of the active route tree before adding the
     replacement.
   - Keep only neutral shared code that does not control page shape.

3. Copy the template into JSX.
   - Start with one route rendering the legacy DOM shape.
   - Keep class names and element structure literal unless React syntax requires
     a mechanical conversion.

4. Wire TanStack Query data.
   - Replace template parameters, Play helpers, and server-side loops with typed
     query data.
   - Add minimal API support only where the page needs it.

5. Extract components atomically.
   - Extract partial-sized JSX components after the route matches the copied
     template.
   - Keep component boundaries boring and traceable to `yona-original`.

6. Verify and close.
   - Compare the rendered route against its Scala template and partials.
   - Run focused tests for API/client behavior and browser checks for page
     behavior.
   - Close parity items only from template evidence plus rendered verification,
     never from similarity to the archived JSX.

## Suggested Route Groups

1. Global shell, public pages, login, signup, password reset.
2. User profile, account settings, notifications, watched projects.
3. Project shell, overview, settings, members, labels.
4. Issues, issue detail, comments, attachments, milestones.
5. Boards and board issue movement.
6. Code browser, commits, branches, tags, compare.
7. Pull requests, review, discussion, merge flows.
8. Organization, project directory, search, site admin, error pages.

## Verification Gate

A route group is not done until:

- The active JSX was copied from the matching Scala template and partials.
- Archived JSX was not used as DOM or UX evidence.
- All visible copy, forms, navigation, modals, empty states, and error states
  are checked against `yona-original`.
- Required REST data is served through `/api/v1`, the typed API client, and
  TanStack Query.
- Focused automated tests or browser checks cover the converted flow.
- Any missing legacy behavior is recorded as `gap`, `deviation`, or `deferred`
  in a follow-up document before the route group is considered closed.

## Non-Goals

- No frontend redesign.
- No new architecture outside the fixed Rust + React + REST + TanStack Query
  boundary.
- No Tailwind or replacement styling system.
- No use of `reference/mixed-code/**` as parity evidence.
- No product improvements while rebuilding parity pages.

## First Implementation Target

Start with the global shell and authentication/public routes. This group is
bounded, exercises layout and form behavior, and creates the archive/rebuild
pattern for later route groups without touching the largest project workflows
first.
