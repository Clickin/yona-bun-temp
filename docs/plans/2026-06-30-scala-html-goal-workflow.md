# Scala HTML Screen Rebuild Goal Workflow

Status: current `/goal` directive for frontend screen rebuilds
Date: 2026-06-30

This document defines the repeatable goal-sized workflow for rebuilding one
React SPA screen from legacy Yona Scala HTML. It is the execution companion to
`docs/plans/2026-06-30-scala-html-sot-frontend-rebuild.md`.

## Goal-Turn Memory

Every resumed goal turn must restate this directive before choosing work:

- The project owner explicitly changed the product-facing footer/contact
  identity for Yoram. NAVER, NAVER LABS, NAVER CLOUD PLATFORM, upstream Yona
  repository URLs, and the legacy developer-contact link must remain absent or
  replaced by Yoram-owned copy. These are approved deviations, not parity gaps.
  Screenshot comparison must exclude their copy, missing-item width, wrapping,
  and downstream geometry consequences; never restore upstream entries or add
  artificial spacing to imitate them. The canonical rationale is
  `docs/provenance/frontend-yoram-rebrand-2026-07-13.md`.
- Playwright E2E and screenshot parity invocations run wholly outside the
  sandbox with `PW_CHANNEL=chrome`, using installed system Chrome. A bundled
  browser failure or sandboxed launch is not acceptable parity evidence.
- Legacy Scala HTML is the UI source of truth.
- Existing React DOM is not implementation evidence.
- Legacy Scala HTML and legacy JavaScript define the required rendered DOM and
  user-visible behavior, not the internal implementation strategy. Do not copy
  jQuery, inline scripts, direct DOM mutation, `document.*`, native delegated
  event listeners, `classList`/`style.display` control, htmx-like HTML fragment
  fetch/insert flows, or dynamic `dangerouslySetInnerHTML` assembly into route
  TSX. Translate those behaviors into React state/events/components plus
  TanStack Router navigation and TanStack Query mutations/cache updates while
  preserving the same output DOM/UX.
- TanStack Router `Link` owns anchor semantics in route TSX. Use `Link to` for
  internal app navigation, `Link to` plus `hash` for shareable in-page deep
  links such as comments/vote sections, and `Link href` for real
  external/download/mailto URLs. Legacy `href="#"` and `href="javascript:..."`
  are behavior evidence only: do not preserve them as raw anchors or as
  `Link href="#"`; translate non-navigation side effects to
  `button type="button"` plus React `onClick`/state/mutation logic.
- User-visible role, copy, order, geometry, and interaction are the parity gate;
  jQuery/plugin implementation attributes are not. The removal list is
  non-exhaustive and includes `data-toggle`, `data-placement`, `data-action`,
  `data-href`, `data-url`, every `data-request-*`, `data-dismiss`, `data-target`,
  `data-trigger`, `data-backdrop`, `data-spy`, `data-provider`, and
  `data-loading-text`. When React owns the behavior, E2E must assert these
  attributes are absent. User-visible or accessible `title`, `aria-*`, and
  tooltip copy remain part of parity and must be preserved through React-owned
  markup and behavior. The gate must not require raw legacy anchors for controls
  translated to `button type="button"` side effects.
- Frontend route TSX/E2E implementation for this goal must be delegated to a
  spawned subagent. The main agent selects the target, supplies the legacy
  sources and rules, reviews the patch, integrates only accepted work, runs
  verification, and commits. Unless the user explicitly requests main-agent
  implementation, the main agent must not author the route TSX/E2E patch first.
- If two or more independent frontend targets are available, spawn multiple
  worker subagents concurrently instead of using only one. Assign each worker an
  explicit route/screen write scope, allowed files, and forbidden files.
  Serialize only same-route, same-file, or dependency-ordered work.
- If a prior implementation was built by patching the existing DOM instead of
  porting the owning Scala template, delete or replace that screen path.
- Every frontend route TSX change must update
  `docs/provenance/frontend-scala-html-goal-violation-audit.md` in the same
  commit with route, screen state, legacy root template, included partials, and
  focused verification.
- The audit update must add a table row that names each changed
  `frontend/src/routes/**/*.tsx` file, at least one legacy `.scala.html` source,
  and the focused `frontend/tests/*.e2e.ts` file changed in the same commit.
  This is the durable memo that survives resumed multi-day goal turns and is
  enforced by the commit hook.
  The `.scala.html` source must be in the row's legacy source column, and a
  deleted E2E file does not count as verification.
- Every frontend E2E/CSS/UI parity evidence change must include a route TSX
  implementation change unless the turn is explicitly marked evidence-only.
- For long-running unattended work, run
  `pnpm smoke:scala-html-goal-history -- --range <base>..HEAD` to audit recent
  commits with the same Scala HTML guard rules used by the turn commit hook. Add
  `--fail-on-violation` when this should behave as a blocking CI/checkpoint
  command.
- For multi-day automated goal runs, export
  `YONA_SCALA_HTML_GOAL_HISTORY_RANGE=<base>..HEAD` before invoking the
  mandatory turn commit hook. `pnpm agent:turn-commit -- -m "<summary>"` always
  audits `HEAD~1..HEAD`; with this environment variable it also re-audits the
  full unattended range after every commit, so an agent cannot accumulate weak
  frontend goal commits for days before a human notices.
- If relying on every resumed turn to export that variable is too fragile, write
  the range into the ignored local memo file
  `.agent/scala-html-goal-history-range`. The turn commit hook reads the first
  non-comment line from that file when the environment variable is absent. Keep
  the machine-checkable per-screen memory in
  `docs/provenance/frontend-scala-html-goal-violation-audit.md`; keep the
  unattended multi-commit audit range in `.agent/scala-html-goal-history-range`.
- At the start of every resumed unattended frontend goal turn, run
  `pnpm agent:scala-html-goal-automation`. It fails if neither the environment
  variable nor `.agent/scala-html-goal-history-range` arms a multi-commit range,
  and it immediately runs the blocking history audit for that range. This is
  the machine check that the agent remembered the multi-day goal context before
  choosing another screen.

This is enforced by `tools/scala-html-goal-guard.mjs` through the turn commit
hook. Treat guard failures as goal failures, not as optional review comments.
The `YONA_ALLOW_SCALA_HTML_*` exception markers are human-supervised manual
escape hatches; `pnpm agent:turn-commit` refuses them for unattended goal work.

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
- rendered output from the local legacy parity baseline at
  `http://127.0.0.1:9000`

If a different legacy host is temporarily needed, override the parity scripts
with `YONA_LEGACY_BASE_URL` or `YONA_LEGACY_PROXY_UPSTREAM`, but the default
frontend parity verification target is the local legacy instance.

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
- Treat legacy JS as behavior evidence only. Render the same DOM and UX through
  React state/events/components plus TanStack Router/Query; do not implement
  route behavior by copying legacy jQuery, direct DOM control, or fetched HTML
  fragment insertion.
- Spawn a subagent for route TSX/E2E implementation. Main agent work is target
  selection, instruction handoff, review, integration, verification, and commit
  unless the user explicitly asks the main agent to implement directly.
- Prefer multiple concurrent worker subagents for disjoint route/screen write
  scopes. Give each worker explicit allowed files and forbidden files; serialize
  same-route, same-file, or dependency-ordered work.
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
- Replace navigation anchors with TanStack Router Link components: internal app
  navigation uses `Link to`, shareable fragment/deep-link navigation uses
  `Link to` plus `hash`, and external/download/mailto navigation uses
  `Link href`.
- Do not preserve legacy `href="#"` or `href="javascript:..."`. Treat those as
  legacy JS behavior evidence only; use `button type="button"` for
  non-navigation side effects and React/TanStack state, mutation, cache, or
  navigation logic for the behavior.
- After the E2E test is GREEN for the copied screen, split the large component
  along legacy partial or maintenance boundaries without changing rendered DOM.
- End the turn only after the focused E2E remains GREEN after decomposition,
  provenance is updated, and the turn commit hook succeeds.
```

## Fresh Conversation Directive

Paste this into a new `/goal` conversation when the current context should be
cleared:

```text
Continue the Yona Scala HTML frontend parity goal in a fresh context.

Use AGENTS.md and docs/plans/2026-06-30-scala-html-goal-workflow.md as binding
instructions.

Rules:
- Legacy yona-original/app/views/**/*.scala.html plus included partials,
  LESS/JS/messages, and rendered legacy HTML are the UI DOM/UX source of truth.
- Existing/deleted/archived React TSX is not UI evidence.
- Legacy JS is behavior evidence only. Render the same DOM and UX through React
  state/events/components plus TanStack Router navigation and TanStack Query
  mutations/cache updates. Do not copy jQuery, inline scripts, direct DOM
  mutation, document.*, delegated native event handlers, classList/style.display
  control, HTML fragment fetch/insert flows, or dynamic dangerouslySetInnerHTML
  assembly into route TSX.
- Route TSX must not add raw anchors. Use TanStack Router Link for all anchor
  navigation: `to` for internal routes, `to` plus `hash` for shareable in-page
  deep links, and `href` for external/download/mailto URLs. Treat legacy
  `href="#"` and `href="javascript:..."` as behavior evidence only; convert
  non-navigation side effects to `button type="button"` with React
  `onClick`/state/mutation logic.
- Frontend route TSX/E2E implementation must be delegated to spawned subagents.
- Prefer multiple concurrent worker subagents whenever targets can be split into
  disjoint route/screen write scopes. Assign each worker explicit allowed files
  and forbidden files. Serialize only same-route, same-file, or dependency-ordered
  work.
- Main agent selects targets, supplies legacy sources/rules, reviews and
  integrates accepted patches, runs verification, and commits.
- If no subagent tool is available, stop and ask before main-agent implementation.
- Every route TSX change must include focused frontend/tests/*.e2e.ts coverage
  and a row in docs/provenance/frontend-scala-html-goal-violation-audit.md.
- Start resumed unattended turns with pnpm agent:scala-html-goal-automation.
- End turns with pnpm agent:turn-commit -- -m "<summary>".
```

## Required Work Loop

### 0. Delegate The Implementation

For frontend route TSX/E2E implementation work, the main agent must spawn a
subagent before authoring implementation edits.

When choosing work for a goal turn, first look for independent targets that can
be assigned to two or more workers without overlapping files. Spawn those worker
subagents concurrently. Do not assign multiple workers to the same route, same
test file, same provenance row, or dependent slice unless the work is explicitly
serialized.

The main agent must give the subagent:

- target route and screen/user/session/data state
- explicit write scope: allowed files, forbidden files, and expected unchanged
  ownership boundaries
- legacy root Scala template and included partials
- related legacy JS/CSS/messages
- the rule that legacy JS is behavior evidence only and must be translated to
  React state/events/components plus TanStack Router/Query
- the rule that route TSX must not add raw anchors: use TanStack Router `Link`
  for all navigation anchors and `button type="button"` for legacy
  `href="#"`/`href="javascript:..."` non-navigation side effects
- expected E2E file and required provenance row
- exact verification command expected for the focused route

The main agent must discard the subagent result if it:

- does not identify the legacy Scala HTML source of truth first
- patches current React DOM/CSS/tests instead of translating the legacy screen
- copies legacy jQuery/direct DOM/HTML-fragment behavior into route TSX
- omits the focused E2E or provenance row
- changes unrelated screens or ownership boundaries

If no subagent tool is available, stop and report that the frontend goal turn
cannot proceed under the current execution rule unless the user explicitly
allows main-agent implementation.

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
- preserve tag names where semantics remain anchors/forms/content, child order,
  nesting, classes, ids, names, types, placeholders, meaningful hrefs, srcs,
  non-plugin layout-relevant `data-*`, and stable visible text
- canonicalize away the non-exhaustive set of jQuery/plugin control metadata,
  including `data-toggle`, `data-placement`, `data-action`, `data-href`,
  `data-url`, every `data-request-*`, `data-dismiss`, `data-target`,
  `data-trigger`, `data-backdrop`, `data-spy`, `data-provider`, and
  `data-loading-text`; assert their absence when React owns the translated
  interaction while preserving user-visible or accessible `title`, `aria-*`,
  and tooltip copy through React-owned markup and behavior
- normalize only documented differences from
  `docs/plans/2026-06-30-scala-html-sot-frontend-rebuild.md`
- fail RED because the React implementation is missing or incomplete

The test must not:

- compare only a login form or a small subset when the screen contains more UI
- use JSDOM-style "contains this element" checks as parity proof
- skip internal navigation by jumping directly to every page with `goto`
- accept old React-only class names, layout wrappers, labels, or field names

For navigation, assert the React translation rather than blindly preserving
legacy placeholder hrefs:

- `Link to`/`hash`/`href` renders the expected meaningful URL, including
  base-path and fragment behavior when applicable
- clicking it performs the SPA transition or hash scroll and renders the
  expected next DOM/location
- legacy `href="#"` or `href="javascript:..."` side-effect controls render as
  buttons and do not expose placeholder hrefs
- a side-effect control is compared by visible role, copy, order, geometry, and
  interaction, not by requiring the legacy raw anchor tag

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

Legacy dynamic behavior:

- Preserve the legacy DOM structure, class names, ids, form fields, labels, and
  visible behavior.
- Replace jQuery event delegation, imperative DOM reads/writes, inline scripts,
  and dynamic HTML fragment injection with React component state, props, event
  handlers, conditional rendering, and TanStack Query mutation/cache updates.
- Use TanStack Router for SPA navigation and redirects. Programmatic navigation
  is allowed for mutation success or legacy imperative flows, but not through
  `window.location` in route TSX.
- `dangerouslySetInnerHTML` is only acceptable for static legacy HTML artifacts
  that are already explicitly documented and cannot affect route behavior; it
  must not be used as a substitute for React components when legacy JS fetched
  or inserted an HTML fragment.

TanStack Router:

- route params and search params come from TanStack Router
- route TSX does not add raw `<a>` tags; anchor semantics go through `Link`
- internal view-to-view navigation uses `Link to`
- shareable in-page deep links use `Link to` plus `hash`, so opening
  `/path#comments` loads the screen and scrolls to the target while clicking the
  link in an already-open screen performs the same in-page movement
- external, download, and mailto links use `Link href`
- legacy `href="#"` and `href="javascript:..."` are never exact DOM targets;
  translate them to `button type="button"` for non-navigation side effects or
  to a real `Link to`/`hash`/`href` when the URL is meaningful and shareable
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
- anchor navigation renders through TanStack Router `Link`: internal routes use
  `to`, shareable fragment links use `hash`, and external/download/mailto URLs
  use `href`
- legacy `href="#"` and `href="javascript:..."` anchors are removed or
  translated to `button type="button"` side-effect controls rather than
  preserved as placeholder links
- server data flows through REST API client plus TanStack Query
- forms account for React submit, REST mutation, and CSRF differences from the
  first test version
- legacy JS/DOM-control behavior is translated to React state/events/components
  and TanStack Router/Query rather than copied as jQuery, direct DOM mutation,
  or HTML fragment insertion
- canonical DOM evidence excludes the non-exhaustive jQuery/plugin control
  metadata set (`data-toggle`, `data-placement`, `data-action`, `data-href`,
  `data-url`, `data-request-*`, `data-dismiss`, `data-target`, `data-trigger`,
  `data-backdrop`, `data-spy`, `data-provider`, `data-loading-text`) and focused
  E2E asserts their absence when React owns the behavior; visible/accessibility
  `title`, `aria-*`, and tooltip copy remain React-owned parity evidence
- Playwright E2E and screenshot parity run through system Google Chrome outside
  the sandbox: invoke the whole pnpm job with `require_escalated` and
  `PW_CHANNEL=chrome`. The Playwright config consumes that variable and defaults
  to `chrome`; do not fall back to historical `msedge` or assume a sandboxed
  bundled Chromium exists.
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

## Follow-up — `/projects` shared shell baseline

Repair the existing site-admin affix and project search-control StyleX owners from the frozen
LESS/Bootstrap resets, then retain the focused normal/fallback-off matrix as the gate. This
bounded wave is complete when source, desktop/mobile geometry, and filter interaction all pass;
do not add route-local offsets or broaden the migration scope.

## Batch 794 — board-post comment identity, actions, and body

The authenticated populated `/admin/sample/post/1` state now owns the six
comment identity/action/body groups from the included Scala partial and frozen
CSS cascade. Focused system-Chrome normal and fallback-off runs pass 1/1 each,
and fresh legacy/local desktop/mobile screenshots were inspected. The remaining
search and user-menu geometry changes follow directly from the user's explicit
Yoram footer, developer-contact, and repository changes; they are approved
deviations, not goal gaps, and must not be offset or repaired by restoring
NAVER, NAVER LABS, upstream Yona copy, or repository destinations.

## Batch 795 — board-post comment section boundary and header

The authenticated populated `/admin/sample/post/1` state now owns the frozen
comment wrapper desktop/mobile declarations, header typography, comments
yobicon contract/glyph, and divider reset. The React-only 18px wrapper margin
remains fallback-owned. Outside-sandbox system-Chrome normal/fallback-off runs
pass 1/1 each, and fresh desktop/mobile legacy/local screenshots were directly
inspected. Automated navbar shifts remain consequences of the approved Yoram
footer/contact/repository deviation rather than goal gaps.

## Batch 796 — board-post open parent comment-update form

The authenticated populated `/admin/sample/post/1` edit-open state now owns
the frozen comment-update form visibility, direct write-box padding, update
textarea-box final cascade, and action-row spacing/alignment. System-Chrome
normal/fallback-off runs pass 1/1 each. Direct desktop/mobile legacy/local
screenshots show exact width, a 1px height difference, and the same known 2px
state offset; the target declarations and visual order are aligned.

## Batch 811 — board-post NEW-comment hidden notification receiver

The authenticated populated board-post NEW-comment editor now owns exactly the
frozen hidden receiver wrapper and title declarations from
`common/editor.scala.html` and `_page.less`. Board view has no issue-style
focus/show receiver wiring, so focus retains `display:none` and zero geometry.
Outside-sandbox system-Chrome normal/fallback-off runs pass 1/1 each at desktop
and 390px, and fresh actual legacy/local screenshots were directly inspected.
UPDATE/child receivers and receiver-list badges remain later consumers. Fixture
and locale differences are outside these two owners; Yoram footer/contact/
repository omissions and their geometry remain approved deviations, not gaps.
