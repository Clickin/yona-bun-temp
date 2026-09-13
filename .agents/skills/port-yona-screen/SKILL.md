---
name: port-yona-screen
description: Port one legacy Yona Scala HTML screen or screen state into the Rust frontend React SPA while preserving browser-rendered UI/UX and layout parity with Playwright metric checks. Use when an agent is asked to implement, rebuild, fix, or review a Yona frontend route/screen from `yona-original/app/views/**/*.scala.html`, especially tasks involving visual layout drift, navbar/search/input overflow, React route TSX, TanStack Router `Link`, TanStack Query mutations/queries, legacy anchors, legacy JS attributes, Playwright E2E parity, or Scala HTML goal guard work.
---

# Port Yona Screen

Use this skill for one screen or one screen state at a time. The result should look the same to a human in the browser as legacy Yona, while the implementation remains a modern React + TanStack Router + TanStack Query SPA.

The primary failure mode to prevent is layout drift: inputs escaping the top navbar, controls wrapping differently, list columns shifting, action buttons losing alignment, or spacing that is "close in DOM" but visibly wrong. Treat visual placement as the main acceptance criterion, not a nice-to-have.

For harness details and command selection, read [references/harnesses.md](references/harnesses.md) when you are about to add tests, run verification, or touch route TSX.

## Roles And Write Scope

- For a review-only request, inspect the screen and report findings using the parity criteria. The implementation, staging, and commit steps below apply only to an authorized port or fix.

- If you are the main agent on a `/goal` turn, do not write route TSX (`frontend/src/routes/**/*.tsx`) or focused E2E (`frontend/tests/wtr/*.e2e.ts`) yourself. Dispatch one worker subagent through the agent runtime per screen state, each with an explicit write scope limited to its own route file and its own focused WTR spec. Hand each worker the legacy Scala HTML root, partials, LESS/JS/messages evidence and this skill.
- If you are a worker subagent, stay strictly within the assigned write scope. Do not edit sibling routes, shared components outside your screen, or unrelated E2E files.
- Serialize workers only when they share a route, file, or ordering dependency; otherwise dispatch them concurrently through the agent runtime.
- When resuming a multi-day unattended `/goal` turn, run `pnpm agent:scala-html-goal-automation` before picking a target. If `YONA_SCALA_HTML_GOAL_HISTORY_RANGE` / `.agent/scala-html-goal-history-range` is missing or the range audit fails, stop and report instead of choosing a screen.

## Workflow

1. Read context for your role. Main agent on a `/goal` turn: read `AGENTS.md`, the relevant `SPEC.md` section, `docs/agents/01-frontend-architecture.md`, `docs/agents/02-testing-migration.md`, `docs/agents/05-agent-execution-guidelines.md`, and `DESIGN.md` for styling work. Worker subagent: read only the legacy Scala HTML root, partials, message/copy keys, and the **full LESS `@import` chain** that the assigned screen actually depends on (follow imports transitively; do not read unrelated screen stylesheets) — plus legacy JS only as behavior evidence. Do not re-read the full doc set every worker turn.
2. Define the target as one route and one visible state. If there are multiple independent screens, split the work and follow the repo's subagent/write-scope rules.
3. Identify the legacy source before editing:
   - root `yona-original/app/views/**/*.scala.html`
   - included partials and helper templates
   - the full transitive LESS `@import` chain the screen depends on under `yona-original/app/assets/stylesheets/**` (not just one file — LESS cascades via imports)
   - relevant legacy JS only as behavior evidence
   - message keys/copy used by the rendered screen
4. Reuse the focused WTR spec under `frontend/tests/wtr/` and its `frontend/tests/wtr-compat.ts` facade. For a confirmed bug, preserve a failing reproduction and verify it passes after the fix; add a permanent regression case only where it defends observable behavior. Measure DOM order, copy, geometry, interactions, and REST/TanStack boundaries relevant to the change. Main runs validation after concurrent edits settle. Keep route changes and required focused evidence together.
5. Rebuild the target `frontend/src/routes/**/*.tsx` from the legacy template skeleton. Do not preserve an existing React screen when it disagrees with Scala HTML; replace the screen-level skeleton instead.
6. Translate behavior into React state/events/components plus TanStack Router navigation and TanStack Query `useQuery`/`useMutation`/cache invalidation.
7. Update `docs/provenance/frontend-scala-html-goal-violation-audit.md` with each changed route, real legacy `.scala.html` roots/partials, and the changed focused E2E file. Check the current guard for active commit constraints; single-row enforcement is conditional on `YONA_ENFORCE_SCALA_HTML_SINGLE_ROW=1`.
8. Keep route TSX, required focused E2E, and complete audit rows in the same staged change. `tools/scala-html-goal-guard.mjs` is the executable contract; do not bypass it with exception markers.
9. Run focused verification first, then the repo turn commit hook (`pnpm agent:turn-commit -- -m "<summary>"`) if files changed.

## Layout Parity Gate

Do not accept a port until the rendered layout is pinned by browser measurements. DOM snapshots alone are insufficient.

Numeric metric assertions are a **necessary** gate, not a **sufficient** one. A screen can pass every bounding-box / `getBoundingClientRect()` check and still look wrong to a human: fonts, colors, backgrounds, borders, letter-spacing, text wrapping, icon rendering, hover/focus/active states, and z-order are not captured by box metrics. Treat metrics as the floor; visual confirmation against legacy is the actual parity signal.

- Compare key element bounding boxes against legacy-rendered HTML or legacy-derived expected metrics: navbar, search inputs, sidebars, tab bars, filters, primary content columns, row actions, modals, and form footers.
- Assert containment for fragile areas. Example: a search input inside the top navbar must have `inputBox.top >= navbarBox.top`, `inputBox.bottom <= navbarBox.bottom`, and its right edge must stay inside the expected navbar/search container.
- Assert alignment between paired controls: label/input baselines, button rows, table/list columns, avatar/title/meta rows, tab top/bottom positions, modal header/body/footer widths.
- Assert no visible overlap by checking representative `boundingBox()` pairs for non-overlap or expected containment.
- Run at least the target desktop viewport. Add a mobile viewport assertion when legacy has responsive behavior for the screen.
- Capture visual confirmation against a real legacy render for every port: run `scripts/visual-parity-sweep.mjs` (which fetches both legacy and local and stores screenshots), or save side-by-side screenshots of the legacy render and the new render for the same viewport and screen state. `scripts/visual-parity-comparison.mjs` rejects major visible text loss, missing visible structural selectors, new overflow, and severe bounding-box drift, but it does **not** do pixel/screenshot diffing and the sweep is not wired into the precommit guard. A human (or a vision-capable review) must still look at both renders; do not claim visual parity from metric assertions or from the sweep's exit code alone.
- If a live legacy render is genuinely unavailable, LESS/Bootstrap/Yobi classes can set _expected_ metrics but cannot establish visual parity. Record this as a `gap` (`parity: unverified against legacy render`) in the E2E/provenance note and never assert or imply that visual parity was confirmed for that screen.

## Porting Rules

- Treat Scala HTML and live legacy HTML as output DOM/UX evidence, not as internal implementation style.
- Preserve user-visible structure: layout order, labels, copy, ids/classes/names used by forms, CSS, deep links, or tests, Bootstrap/Yobi classes, and dense legacy spacing.
- Preserve layout ownership classes and wrappers from legacy templates. Do not replace dense legacy shells with new flex/card/grid structures unless the rendered metrics still match.
- Preserve enough non-plugin attributes to support visible behavior, form payloads, CSS selectors, accessible labels, downloads, hash targets, and E2E evidence.
- Canonicalized legacy/React DOM comparisons must exclude jQuery/plugin implementation attributes. The deletion list is non-exhaustive and includes `data-toggle`, `data-placement`, `data-action`, `data-href`, `data-url`, every `data-request-*`, `data-dismiss`, `data-target`, `data-trigger`, `data-backdrop`, `data-spy`, `data-provider`, and `data-loading-text`. When React owns the behavior, E2E must assert that these attributes are absent rather than require legacy values. Do not use them as parity selectors or metric anchors. Preserve user-visible and accessible `title`, `aria-*`, and tooltip copy through React-owned markup and behavior.
- Treat other Scala-HTML-only or legacy-JS-only attributes such as `data-type` and `pjax-*` as deletion candidates. Translate their behavior into React/TanStack code unless a non-plugin attribute is part of the user-visible or accessible contract.
- Gate parity on user-visible role, copy, order, geometry, and interaction. Do not require a raw legacy anchor for a side effect that correctly renders as a React-owned button.
- Do not port jQuery, inline scripts, `document.*`, `addEventListener`, `classList`, `style.display`, HTML fragment fetch/insert, `innerHTML`/`outerHTML`, or `dangerouslySetInnerHTML` into route TSX.
- Do not add new architecture or UX improvements. Implement parity; record any intentional `gap`, `deviation`, or `deferred` item.

## Navigation

- Use TanStack Router `Link` for anchor semantics. In route TSX, do not add raw `<a>` tags.
- Use `Link to` for internal SPA routes.
- Use `Link to` plus `hash` for shareable in-page anchors, e.g. `<Link to="/project/$owner/$name" params={{ owner, name }} hash="readme">`.
- Use `Link href` for external, download, and `mailto:` URLs.
- Convert legacy `href="#"` and `href="javascript:..."` into `button type="button"` with React event handlers unless there is a real shareable URL.
- Keep `target`, `rel`, `download`, `title`, `className`, and `id` when they are part of visible behavior or the legacy DOM contract.
- Let TanStack Router own smooth SPA navigation after mutations; perform redirects in mutation success handlers.

## Forms And Data

- Keep legacy field names, labels, default values, hidden fields, disabled states, and submit/cancel ordering when they affect DOM parity or payload semantics.
- Use React form state and TanStack Query mutations for submit behavior. Avoid native legacy POST as the primary React boundary.
- Use the typed REST JSON client under `/api/v1` for new application data flow. Do not introduce ConnectRPC, tRPC, `createServerFn`, route-owned HTML fragments, or new `/-_-api/v1/**` surfaces.
- Keep validation/API errors visible in-page, matching the legacy placement and copy where possible.

## Pitfalls

- Never set `YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY`, `YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE`, or `YONA_ALLOW_SCALA_HTML_MULTI_SCREEN` in automated or unattended runs. These are human-supervised manual commit escape hatches only and require a durable audit note (route, reason, follow-up). The mandatory `pnpm agent:turn-commit` path refuses them by default.
- Route TSX, required focused E2E, and audit rows are not separable. Keep single-screen commits when the active goal profile requires them; use the current guard rather than assuming every supervised batch has that profile.
- For ports that also touch the Rust backend or the `/api/v1` contract, first inspect the current process environment for an active sandbox marker, if the runtime provides one. When the runtime is unsandboxed, use `pnpm agent:cargo -- --outside-sandbox ...` or `pnpm agent:cargo-test -- --outside-sandbox ...`; when it is sandboxed, use an approved outside-sandbox execution path for the whole wrapper invocation. Astra does not expose a `require_escalated` argument: never invent one or unset a sandbox marker. If no outside-sandbox path is available, stop and report the capability gate rather than running cargo inside the sandbox. Pure frontend ports do not need cargo.

## Acceptance Checklist

- Legacy root template, partials, LESS, JS behavior evidence, and message/copy source are named in notes or provenance.
- The changed behavior passes focused WTR and live browser verification; bug fixes retain the failing reproduction or regression evidence.
- Browser-rendered layout is pinned by metric assertions for containment, alignment, ordering, and no-overlap of the screen's fragile areas, **and** a real visual confirmation against a legacy render is captured (screenshots saved or sweep run). Metric-only parity is not acceptable.
- Top navbars, search/filter bars, tab rows, sidebars, action rows, and modals are explicitly checked when present.
- Route TSX has no raw anchors, direct DOM mutation, jQuery, `dangerouslySetInnerHTML`, or legacy placeholder `Link href="#"`.
- `Link` usage keeps real navigation behavior and drops legacy JS-only attributes unless justified.
- The same change includes route TSX, focused E2E, and Scala HTML audit row when route TSX changes.
