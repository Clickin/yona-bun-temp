---
name: port-yona-screen
description: Port one legacy Yona Scala HTML screen or screen state into the Rust frontend React SPA while preserving browser-rendered UI/UX and layout parity with Playwright metric checks. Use when Codex is asked to implement, rebuild, fix, or review a Yona frontend route/screen from `yona-original/app/views/**/*.scala.html`, especially tasks involving visual layout drift, navbar/search/input overflow, React route TSX, TanStack Router `Link`, TanStack Query mutations/queries, legacy anchors, legacy JS attributes, Playwright E2E parity, or Scala HTML goal guard work.
---

# Port Yona Screen

Use this skill for one screen or one screen state at a time. The result should look the same to a human in the browser as legacy Yona, while the implementation remains a modern React + TanStack Router + TanStack Query SPA.

The primary failure mode to prevent is layout drift: inputs escaping the top navbar, controls wrapping differently, list columns shifting, action buttons losing alignment, or spacing that is "close in DOM" but visibly wrong. Treat visual placement as the main acceptance criterion, not a nice-to-have.

For harness details and command selection, read [references/harnesses.md](references/harnesses.md) when you are about to add tests, run verification, or touch route TSX.

## Workflow

1. Read `AGENTS.md`, the relevant `SPEC.md` section, `docs/agents/01-frontend-architecture.md`, `docs/agents/02-testing-migration.md`, `docs/agents/05-agent-execution-guidelines.md`, and `DESIGN.md` for styling work.
2. Define the target as one route and one visible state. If there are multiple independent screens, split the work and follow the repo's subagent/write-scope rules.
3. Identify the legacy source before editing:
   - root `yona-original/app/views/**/*.scala.html`
   - included partials and helper templates
   - relevant legacy LESS under `yona-original/app/assets/stylesheets/**`
   - relevant legacy JS only as behavior evidence
   - message keys/copy used by the rendered screen
4. Write or update a focused Playwright E2E test RED from legacy Scala HTML or live legacy-rendered HTML. Assert stable DOM order, visible copy, layout metrics, interaction behavior, and REST/TanStack Query boundaries that matter for this screen.
5. Rebuild the route TSX from the legacy template skeleton. Do not preserve an existing React screen when it disagrees with Scala HTML; replace the screen-level skeleton instead.
6. Translate behavior into React state/events/components plus TanStack Router navigation and TanStack Query `useQuery`/`useMutation`/cache invalidation.
7. Update `docs/provenance/frontend-scala-html-goal-violation-audit.md` when route TSX changes: name the route file, the legacy Scala HTML root/partials, and the focused E2E file changed in the same commit.
8. Run focused verification first, then the repo turn commit hook if files changed.

## Layout Parity Gate

Do not accept a port until the rendered layout is pinned by browser measurements. DOM snapshots alone are insufficient.

- Compare key element bounding boxes against legacy-rendered HTML or legacy-derived expected metrics: navbar, search inputs, sidebars, tab bars, filters, primary content columns, row actions, modals, and form footers.
- Assert containment for fragile areas. Example: a search input inside the top navbar must have `inputBox.top >= navbarBox.top`, `inputBox.bottom <= navbarBox.bottom`, and its right edge must stay inside the expected navbar/search container.
- Assert alignment between paired controls: label/input baselines, button rows, table/list columns, avatar/title/meta rows, tab top/bottom positions, modal header/body/footer widths.
- Assert no visible overlap by checking representative `boundingBox()` pairs for non-overlap or expected containment.
- Run at least the target desktop viewport. Add a mobile viewport assertion when legacy has responsive behavior for the screen.
- Use screenshots or `scripts/visual-parity-sweep.mjs` as supporting evidence, but prefer numeric Playwright assertions for the exact drift that would be hard for LLMs to judge visually.
- If live legacy is unavailable, derive metrics from legacy LESS/Bootstrap/Yobi classes and record that limitation in the E2E/provenance note.

## Porting Rules

- Treat Scala HTML and live legacy HTML as output DOM/UX evidence, not as internal implementation style.
- Preserve user-visible structure: layout order, labels, copy, ids/classes/names used by forms, CSS, deep links, or tests, Bootstrap/Yobi classes, and dense legacy spacing.
- Preserve layout ownership classes and wrappers from legacy templates. Do not replace dense legacy shells with new flex/card/grid structures unless the rendered metrics still match.
- Preserve enough legacy attributes to support visible behavior, form payloads, CSS selectors, accessible labels, downloads, hash targets, and E2E evidence.
- Treat Scala-HTML-only or legacy-JS-only attributes as deletion candidates. Do not blindly carry `data-url`, `data-type`, `data-action`, `data-request-*`, `pjax-*`, or `data-toggle` onto `Link`. Keep such attributes only when the screen's visible DOM contract or existing harness explicitly requires them, and prefer translating the behavior into React/TanStack code.
- Do not port jQuery, inline scripts, `document.*`, `addEventListener`, `classList`, `style.display`, HTML fragment fetch/insert, `innerHTML`/`outerHTML`, or `dangerouslySetInnerHTML` into route TSX.
- Do not add new architecture or UX improvements. Implement parity; record any intentional `gap`, `deviation`, or `deferred` item.

## Navigation

- Use TanStack Router `Link` for anchor semantics. In route TSX, do not add raw `<a>` tags.
- Use `Link to` for internal SPA routes.
- Use `Link to` plus `hash` for shareable in-page anchors.
- Use `Link href` for external, download, and `mailto:` URLs.
- Convert legacy `href="#"` and `href="javascript:..."` into `button type="button"` with React event handlers unless there is a real shareable URL.
- Keep `target`, `rel`, `download`, `title`, `className`, and `id` when they are part of visible behavior or the legacy DOM contract.
- Let TanStack Router own smooth SPA navigation after mutations; perform redirects in mutation success handlers.

## Forms And Data

- Keep legacy field names, labels, default values, hidden fields, disabled states, and submit/cancel ordering when they affect DOM parity or payload semantics.
- Use React form state and TanStack Query mutations for submit behavior. Avoid native legacy POST as the primary React boundary.
- Use the typed REST JSON client under `/api/v1` for new application data flow. Do not introduce ConnectRPC, tRPC, `createServerFn`, route-owned HTML fragments, or new `/-_-api/v1/**` surfaces.
- Keep validation/API errors visible in-page, matching the legacy placement and copy where possible.

## Acceptance Checklist

- Legacy root template, partials, LESS, JS behavior evidence, and message/copy source are named in notes or provenance.
- The focused E2E test fails before implementation and passes after implementation.
- Browser-rendered layout is pinned by metric assertions for containment, alignment, ordering, and no-overlap of the screen's fragile areas.
- Top navbars, search/filter bars, tab rows, sidebars, action rows, and modals are explicitly checked when present.
- Route TSX has no raw anchors, direct DOM mutation, jQuery, `dangerouslySetInnerHTML`, or legacy placeholder `Link href="#"`.
- `Link` usage keeps real navigation behavior and drops legacy JS-only attributes unless justified.
- The same change includes route TSX, focused E2E, and Scala HTML audit row when route TSX changes.
