# Harnesses And Verification

Use these references when porting one Yona screen from Scala HTML to React/TanStack SPA.

## Mandatory Guards

- `tools/scala-html-goal-guard.mjs`: blocks route TSX changes that add raw `<a>`, jQuery/direct DOM escapes, `createElement`, `dangerouslySetInnerHTML`, placeholder `Link href="#"`/`javascript:`, noisy legacy custom attributes on `Link`, route changes without focused E2E, or route changes without `docs/provenance/frontend-scala-html-goal-violation-audit.md`.
- `tools/yona-design-harness.mjs`: checks frontend design changes against `DESIGN.md`, legacy Yona tokens, `frontend/src/app.css`, and forbidden temporary design drift.
- `tools/yona-parity-gate.mjs`: checks staged implementation changes for corresponding tests/provenance evidence.
- `tools/precommit-verify.mjs`: runs lint/format/design/Scala HTML/parity checks on staged files; it is invoked by the turn commit hook.
- The `YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY`, `YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE`, and `YONA_ALLOW_SCALA_HTML_MULTI_SCREEN` env markers are human-supervised manual commit escape hatches only. Never set them in automated or unattended runs; the mandatory `pnpm agent:turn-commit` path refuses them by default.

## Useful Commands

- Focused E2E: `pnpm --dir frontend test:e2e <frontend/tests/name.e2e.ts>`
- Frontend typecheck: `pnpm --dir frontend check`
- Dev script contracts: `pnpm test:dev-scripts`
- Legacy page audit: `pnpm smoke:legacy-html-pages`
- Legacy anchor coverage: `pnpm smoke:legacy-anchor-coverage`
- Legacy route coverage: `pnpm smoke:legacy-route-coverage`
- Visual sweep: `node scripts/visual-parity-sweep.mjs` with `YORAM_SWEEP_PATHS=/path`
- Turn commit hook: `pnpm agent:turn-commit -- -m "<summary>"`
- Goal turn resume: `pnpm agent:scala-html-goal-automation` (run before picking a target on a multi-day unattended `/goal` turn; stop if the history range marker is missing or the audit fails)
- Cargo (escalated, outside sandbox): `pnpm agent:cargo -- --outside-sandbox <cargo args>`
- Cargo test (escalated, outside sandbox): `pnpm agent:cargo-test -- --outside-sandbox <cargo args>`

Run cargo only through the repo wrappers and outside the sandbox, per `AGENTS.md`, when Rust verification is needed.

## Evidence To Capture

- Target route and screen state.
- Legacy root Scala HTML and included partials.
- Legacy LESS/JS/message files consulted.
- Focused E2E file and exact assertions added.
- Layout metric assertions added for fragile placement: navbar/search containment, filter/input alignment, tab/action row alignment, list/table column alignment, modal geometry, and no-overlap checks.
- API/query/mutation boundary used.
- Any intentionally dropped legacy attributes or behavior, labeled as `gap`, `deviation`, or `deferred`.

## Layout Metric Pattern

Prefer explicit box checks over visual guesswork. This repo's existing E2E tests use `page.evaluate(() => el.getBoundingClientRect())` plus `toBeGreaterThanOrEqual` / `toBeLessThanOrEqual` / `toBeCloseTo` (not Playwright's `.boundingBox()` helper) — follow that convention so new tests match the codebase:

```ts
const boxes = await page.evaluate(() => {
  const navbar = document.querySelector(".gnb-outer");
  const search = document.querySelector("#search");
  if (!navbar || !search) return null;
  const n = navbar.getBoundingClientRect();
  const s = search.getBoundingClientRect();
  return { navbar: n, search: s };
});
expect(boxes).not.toBeNull();
expect(boxes!.search.top).toBeGreaterThanOrEqual(boxes!.navbar.top);
expect(boxes!.search.bottom).toBeLessThanOrEqual(boxes!.navbar.bottom);
expect(boxes!.search.right).toBeLessThanOrEqual(boxes!.navbar.right);
```

For percentage-width comparisons (e.g. split panes), capture widths in `page.evaluate` and assert with `toBeCloseTo(expected, 1)` like `frontend/tests/project-home-readme.e2e.ts`. Remember these metric checks are necessary but not sufficient — see the Layout Parity Gate for the mandatory visual confirmation against a legacy render.

## Attribute Guidance

Legacy Scala HTML often uses attributes for jQuery plugins or server-rendered helpers. For React SPA ports:

- Preserve attributes that change visible rendering, submitted data, CSS matching, accessibility, downloads, or stable deep links.
- Drop attributes that only powered legacy JS after translating behavior into React state/events or TanStack Query mutations.
- Do not attach legacy JS-only attributes such as `data-request-*`, `data-url`, `data-action`, `pjax-*`, or `data-toggle` to `Link` unless a harness explicitly requires the rendered DOM and the choice is documented.
