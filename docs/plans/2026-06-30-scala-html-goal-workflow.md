# Scala HTML Screen Rebuild Goal Workflow

Status: current `/goal` directive for frontend screen rebuilds
Date: 2026-06-30

This document defines the repeatable goal-sized workflow for rebuilding one
React SPA screen from legacy Yona Scala HTML. It is the execution companion to
`docs/plans/2026-06-30-scala-html-sot-frontend-rebuild.md`.

## Goal Unit

One goal must target exactly one user-visible screen or one explicit screen
state. Examples:

- anonymous login form
- public landing page
- project home overview for a readable project
- issue detail with comments
- issue form validation state
- organization members page

Do not run a goal for a broad packet such as "all auth pages" or "all project
pages". Broad packets hide parity defects and encourage reuse of old JSX.

## Source Of Truth

Primary UI source of truth:

- `yona-original/app/views/**`
- Scala template partials called by the target template
- related legacy JavaScript under `yona-original/`
- related LESS/CSS and loaded assets under `yona-original/`
- legacy message keys used by the template

Allowed rendered evidence:

- rendered output from a local legacy Yona instance
- rendered output from `http://192.168.45.10:9000` when that live legacy server
  is available

Rendered legacy HTML may be used to confirm final DOM, but the owning Scala
HTML templates remain the source for why a node, class, label, link, or form
field exists.

Not source of truth:

- deleted or archived TSX
- previous React component boundaries
- previous selector-presence tests
- view-model files or invented page-shape adapters
- `reference/mixed-code/**`

REST API clients, TanStack Query client setup, generated router plumbing,
i18n lookup helpers, and runtime config helpers may be reused when they do not
decide visible DOM shape or layout.

## Paste Into `/goal`

```text
Rebuild exactly one Yona frontend screen from legacy Scala HTML.

Target screen:
- Route:
- User/session/data state:
- Legacy template root:
- Included partials:
- Related legacy JS/CSS/messages:

Rules:
- Treat yona-original/app/views/** and rendered legacy HTML as the UI SOT.
- Ignore existing/deleted/archived TSX as UI evidence.
- Do not create or use view-model layers for page shape.
- Keep REST API clients, TanStack Query setup, i18n helpers, runtime config, and
  generated router plumbing only when they are DOM-neutral support boundaries.
- Write the RED Playwright E2E test first from the whole rendered legacy screen.
- Compare the rendered screen DOM after React rendering, not source JSX and not
  isolated element presence.
- Account for documented modernized differences from the beginning:
  React SPA shell, TanStack Router navigation, TanStack Query REST data binding,
  React-handled form submit, CSRF transport, and allowed asset/base-path
  normalization.
- Copy the Scala HTML into one large TSX skeleton before splitting components.
- Convert template params, loops, and conditions to typed REST JSON plus
  TanStack Query.
- Replace internal view-to-view anchors with TanStack Router Link components
  while preserving the legacy href in the rendered anchor.
- Keep external, download, mailto, and non-SPA anchors as normal anchors.
- After the E2E test is GREEN for the copied screen, split the large component
  along legacy partial or maintenance boundaries without changing rendered DOM.
- End the turn only after the focused E2E remains GREEN after decomposition,
  provenance is updated, and the turn commit hook succeeds.
```

## Required Work Loop

### 1. Identify The Legacy Screen

Record before editing:

- legacy route and screen state
- owning Scala HTML template
- all included partials
- controller-provided parameters and helper calls
- message keys
- CSS/LESS/assets loaded by the screen
- related legacy JavaScript behavior
- expected internal links and form submits

If the target is available on a legacy server, capture rendered HTML after the
legacy page has reached the same state the E2E will test.

### 2. Write RED E2E First

Create the Playwright test before writing TSX for the screen.

The test must:

- start from the user-visible entry point for the scenario
- use direct `page.goto` only for the first entry or when no visible legacy
  navigation path exists
- use rendered links/buttons for every intermediate page movement
- compare the whole stable screen container against canonicalized legacy DOM
- preserve tag names, child order, nesting, classes, ids, names, types,
  placeholders, hrefs, srcs, layout-relevant `data-*`, and stable visible text
- normalize only documented differences from
  `docs/plans/2026-06-30-scala-html-sot-frontend-rebuild.md`
- fail RED because the React implementation is missing or incomplete

The test must not:

- compare only a login form or a small subset when the screen contains more UI
- use JSDOM-style "contains this element" checks as parity proof
- skip internal navigation by jumping directly to every page with `goto`
- accept old React-only class names, layout wrappers, labels, or field names

For internal navigation, assert both:

- the rendered anchor has the legacy `href`
- clicking it performs the SPA transition and renders the expected next DOM

### 3. Copy Scala HTML Into One TSX Skeleton

Port the legacy template mechanically before introducing abstraction.

Preserve:

- wrapper structure
- class names
- ids
- form order
- `name`, `type`, `method`, `placeholder`, `title`, `href`, `src`
- modal/tab/dropdown/filter/pagination markup
- empty, loading, validation, success, and error state containers
- visible message-key output

Use one large component first. This is intentional. Component extraction is a
later step after the rendered screen passes parity.

### 4. Convert Stack Boundaries

Apply only the stack changes required by the Rust + React frontend.

TanStack Router:

- route params and search params come from TanStack Router
- internal view-to-view navigation uses `Link`
- the rendered anchor must keep the legacy deep-link `href`
- programmatic navigation is allowed only for legacy non-anchor flows such as
  post-submit redirect, modal choice, or imperative callback

TanStack Query:

- server state comes from typed REST API clients plus TanStack Query
- query keys include all route/search/data dependencies
- mutations use TanStack Query mutations and targeted invalidation
- no one-off `fetch`, ad hoc REST client, or page-shape view model

Forms:

- preserve the legacy form DOM and non-CSRF hidden fields
- React may intercept submit and call REST mutations
- CSRF hidden field value and direct server `action` submit behavior may be
  normalized only as documented

Fragments:

- do not fetch server-rendered HTML fragments for runtime UI
- fragment data becomes REST JSON
- rendered React DOM still follows the legacy fragment shape

### 5. Go GREEN For The Whole Screen

The copied screen is not complete until the E2E passes against the whole
rendered screen target.

If API data is missing, add only the smallest REST endpoint/client/test needed
for this screen. Do not paper over missing data with hard-coded JSX or a new
view model.

### 6. Decompose After GREEN

Only after the whole-screen E2E is GREEN:

- split the large TSX along legacy partial boundaries first
- extract boring presentational components only where it improves maintenance
- keep data fetching at route/screen boundaries unless an existing local pattern
  clearly requires otherwise
- rerun the focused E2E after each meaningful extraction
- do not change the rendered DOM while decomposing

If the screen is small enough that decomposition would add noise, record that
decision in the turn summary and keep the single component.

### 7. Close The Turn

Before ending the turn:

- update the relevant provenance or parity report with legacy source, React
  target, E2E file, allowed normalizations, and remaining gaps
- run focused frontend checks
- run `pnpm agent:turn-commit -- -m "<concise summary>"`

The turn is not done at the moment the first E2E turns GREEN. It is done after
post-GREEN decomposition has either been completed or explicitly judged
unnecessary, with the same focused E2E still passing.

## Completion Criteria

A screen rebuild goal is complete only when all are true:

- RED E2E existed before implementation
- E2E compares the whole rendered screen, not isolated elements
- Scala HTML skeleton was copied before component extraction
- internal anchors render through TanStack Router `Link` with legacy `href`
- server data flows through REST API client plus TanStack Query
- forms account for React submit, REST mutation, and CSRF differences from the
  first test version
- no view-model layer decides page DOM shape
- component decomposition is done after GREEN or documented as unnecessary
- focused checks pass
- turn commit hook succeeds

## Stop Conditions

Stop and report instead of broadening scope when:

- the legacy template route or included partial cannot be identified
- the live legacy rendered target contradicts the Scala HTML source and the
  difference cannot be explained by data/session state
- required REST data is missing and cannot be added within the single-screen
  goal without crossing ownership boundaries
- the E2E cannot express a documented allowed normalization cleanly

When stopped, record the exact route, template, missing data or behavior, and
the smallest next write scope.
