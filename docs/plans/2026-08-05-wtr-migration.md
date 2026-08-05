# Playwright → @web/test-runner E2E migration

> status: active — pilot proven, bulk conversion pending
> slug: wtr-migration
> date: 2026-08-05

## Goal

Replace the Playwright e2e runner with an in-browser `@web/test-runner` harness so
verification time collapses (the krds-community pattern: run every assertion inside
the browser, ship only the per-test pass/fail result — no per-assertion
node↔browser IPC).

Measured on the pilot: `tests/wtr/not-found.e2e.ts` runs **4/4 green in 2.1s**
(Playwright: ~1.5–2 min per spec including runner boot). The 3 converted files
(31 tests) run in **19.5s**; the Playwright suite takes ~1.6h for 3086 tests.

## Architecture (landed)

- `frontend/web-test-runner.config.mjs` — WTR 1.0 + `@web/dev-server-esbuild`
  (TS transform) + `mimeTypes` override (.ts → text/javascript; WTR 1.0 serves
  video/mp2t otherwise) + a serve-plugin that provides:
  - `/yona/**` → `frontend/dist` SPA with `__YONA_RUNTIME_CONFIG__` injection
    + a `window.fetch = (...args) => parent.__wtrMockFetch(...args)` override
    script (iframe fetch overrides do NOT survive navigation; the injected
    script is the reliable hook).
  - `/yona/api/*` → 404 (the harness fetch-mocks these; a 200 index.html would
    desync the app's JSON parsing).
  - `/tests/**/src/**` → `frontend/src` and `/yona-original/**` → legacy sources
    (the specs' `readFileSync(new URL(...))` paths resolve one level deeper from
    `tests/wtr/`).
  - plugin `serve()` MUST return `undefined` to pass through — returning `null`
    crashes the pipeline (`typeof null === "object"`).
- `frontend/tests/wtr-compat.ts` — in-browser Playwright-compatible harness:
  - `test`/`test.describe`/`test.beforeEach` — fresh `PageFacade` (iframe) per test.
  - `page.{goto,locator,getByRole,getByText,evaluate,reload,route,waitForTimeout,
    waitForSelector,keyboard,mouse,url,setViewportSize}`.
  - `Locator.{locator,all,nth,first,getByRole,getByText,count,textContent,
    inputValue,isVisible,isChecked,click,fill,press,check,uncheck,selectOption,
    hover,focus,blur,dispatchEvent,evaluate}`.
  - `expect(...).{toHaveText,toContainText,toHaveClass,toHaveAttribute,toHaveCount,
    toBeVisible,toBeHidden,toBeChecked,toHaveValue,toHaveURL,toHaveTitle,
    toHaveJSProperty,toMatchObject,toEqual,toBe,toContain,toMatch,toBeLessThan,
    toBeGreaterThan}` + `.not` (lazy getter) + `expect.poll`.
    String targets assert SYNCHRONOUSLY (jest semantics — the specs call them
    without `await`); locator targets poll (Playwright semantics).
  - `readFileSync` — synchronous XHR over the same-origin middleware (specs call
    it at module top level).
  - `process.env.YONA_DEV_BASE_PATH` shim.
  - Default API mocks per test: `/api/v1/session` (anonymous) +
    `/api/v1/auth/capabilities` (empty providers, matching the seeded dev
    backend); spec `page.route` mocks take precedence (LIFO, like Playwright).
  - Mock URL globs: protect `**`/`*` with placeholders → escape literals →
    restore (`^.*/api/v1/session$`).
- Converted specs change ONE import line (`@playwright/test` + `node:fs` →
  `../wtr-compat.ts`) and move to `tests/wtr/`.

## State (2026-08-05)

| spec | result |
|---|---|
| `tests/wtr/not-found.e2e.ts` | 4/4 green |
| `tests/wtr/wtr-smoke.e2e.ts` | 2/2 green (harness smoke) |
| `tests/wtr/loginform.e2e.ts` | 13/25 (12 residual — see below) |

loginform residual failures (12): 9 standalone-login redirect-chain tests
(`toHaveAttribute(action)` null — form not observed under the full
`mockStandalonePasswordLogin` mock set; reproduced green in isolation, so
suspect cross-test browser pressure/iframe-reload races — rerun in isolation to
confirm), 3 root-login-dialog tests (DOM/geometry diffs, not yet triaged).

## Next steps

1. Rerun `tests/wtr/loginform.e2e.ts` alone; classify the 12 residuals (4-bucket
   rule). If the redirect cluster is flake-only under concurrency, raise
   `concurrency`/`concurrentBrowsers` or serialize iframe-heavy specs.
2. Convert the remaining ~855 specs: per-spec = copy to `tests/wtr/` + import
   swap + surface gaps → add to `wtr-compat.ts` (inventory-driven; the
   playwright-suite API surface was pre-inventoried: goto 677, locator 657,
   evaluate 482, route 650, reload 41, getByRole 101, expect.poll 112,
   keyboard 13, mouse 54, toHaveScreenshot 0).
3. Batch conversions with subagents (specs are mechanical; shared-file fixes
   batched per wave like the parity work). Keep Playwright copies in `tests/`
   until the WTR coverage is verified, then cut over the gate
   (`test:e2e:stylex-final` → WTR profile) and delete the Playwright set.
4. Gate: replace the playwright runner invocation with `web-test-runner` for the
   final profile; keep the build + StyleX verifier steps.

## Key findings

- WTR 1.0 has no TS transform — `@web/dev-server-esbuild` required.
- WTR 1.0 maps `.ts` → `video/mp2t` (MPEG-TS MIME clash) — `mimeTypes` config.
- Any custom `middleware` in the WTR config breaks session-page serving; serve
  extra files via plugins.
- iframe `window.fetch` assignment is wiped on navigation — inject the override
  into the served document (`parent.__wtrMockFetch`).
- Glob→regex: escape AFTER protecting wildcards.
