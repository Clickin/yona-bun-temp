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
| `tests/wtr/loginform.e2e.ts` | 24/24 green |

All 31 converted tests green in **10.7s** (vs ~2min+ per spec under Playwright).

loginform was 13/25 when first converted; the residual clusters were traced to
harness fidelity gaps, now fixed:
1. `route.request()` facade: Playwright's `url()`/`method()`/`headers()`/
   `postDataJSON()` are METHODS, and `headers()` returns a plain object
   (specs index `["x-csrf-token"]`); the facade now matches. This unlocked the
   9-test standalone-login redirect cluster (their session mocks record
   `route.request().url()` and the sign-in mocks inspect headers/body).
2. `expect.poll().toMatch`/`toHaveLength`/`toBeGreaterThanOrEqual` and
   `expect(locator).toBeFocused` matchers added.
3. Root-login-dialog geometry: 8.66px-short dialog was a **broken provider
   logo** — the config's content-type map lacked `.svg` (and other asset
   types), so the google button's img rendered as a broken 19px placeholder
   instead of the 24px logo. Fixed the MIME map; the dialog then measured
   exactly 378/306 as expected. Also added a settle-wait (250ms) before the
   dialog metrics read (modal transition), per the suite's marker-wait
   convention.

## Wave 1 (2026-08-05, committed)

27 converted specs (`tests/wtr/*.e2e.ts`): the 3 pilots + user cluster (8),
project-forms cluster (8), org cluster (8). Full-suite WTR run on the correct
dist: **232 passed / 126 failed** (~6 min vs the Playwright ~2-4h equivalent).

**Dist correctness (critical)**: WTR serves `frontend/dist`; the dist must be
built `VITE_DISABLE_LEGACY_FALLBACK=1 VITE_YONA_BASE_PATH=/yona pnpm --dir
frontend run build` (matches the spec-runner profile; absolute `/yona/assets`
chunk paths — a plain `pnpm build` emits `./assets` relative chunks that break
deep-route lazy loading: the not-found screen rendered an empty body under WTR
but 4/4 under Playwright). `frontend/playwright.config.ts` gained
`testIgnore: /tests\/wtr\//` so the Playwright runner no longer globs the
converted copies.

**Shim gaps applied during wave 1** (all in `wtr-compat.ts` /
`web-test-runner.config.mjs`): action auto-wait (15s), `pressSequentially`,
single-object `setInputFiles`, `waitForFunction`, `page.click/check/fill`,
`resolves.toEqual`, `toContainEqual`, `toBeUndefined`, `toBeEmpty`,
`toBeGreaterThan` (poll), `toHaveCSS`, `toBeAttached`, asymmetric matchers
(`expect.stringContaining/Matching/any`, applied in `toEqual`/`toMatchObject`),
`:has-text()` translation, `locator("..")` parent traversal, filter-chain and
nth-scoped resolver preservation (`nth/first/last/all` + `locator(child)` never
drop custom resolvers; fixed a double-index apply), strict-mode fidelity,
mouse events into the iframe incl. mouseout/mouseleave synthesis,
React controlled-input native setter (cross-realm), file-input
`File`/`DataTransfer` constructed in the iframe realm (app checks
`instanceof File`), `toHaveText` message crash fix (esbuild async-IIFE),
`matchClass` trailing-space, glob `?` escape (query-string mocks were dead),
`test.info().annotations/attach`, `page.screenshot` no-op (PageFacade),
`getByTestId`, per-test storage isolation, resource-request events via
PerformanceObserver with Playwright-normalized `resourceType` (`link`→
`stylesheet`), LIFO route precedence, cross-realm `File` values.

**Outcome parity** (two verification agents ran fresh Playwright ground truth
per spec — the wave-1 agents' early baselines were stale, predating the S8
consolidation and the wrong-base dist): organization specs match PW per-test
outcomes exactly (boards/delete/home/issues/members/pullrequests/settings/list
+ project transfer/webhooks/change-vcs/delete). Remaining WTR-only deltas are
classified: bucket-2 app/build gaps (stylex-only class tokens on legacy shell
roots, missing `avatar-wrap` on org-home member links, TanStack active-link
`aria-current` attrs, `@layer` cascade differences between dev and the built
dist affecting toHaveCSS/geometry probes), bucket-3 stale pins (pin
`<button class="pin">` vs the app's legacy `<div class="pin">` navbar button,
`/yona/legacy-assets/...` vs the vite-imported hashed fallback URL,
`demo.yobi.io` sample link, hashed avatar assets), bucket-4 dist-staleness
(resolved by the rebuild). WTR-greener cases (PW cold-start goto timeouts,
stale ORIGINAL pins already corrected in the converted copies) documented per
spec in the verification reports.

## Wave 2 (2026-08-05, committed a5c9bce9f)

25 more specs converted (auth aliases, home empty-notifications, global shell,
help, project boards, org nested layout, org create, code browser cluster).
52 specs total: **456 passed / 175 failed / 1 skipped** (~8 min full suite).
Fresh Playwright ground truth per spec. WTR-only deltas bucketed:
app stylex/layer gaps, WTR layout artifacts (sidemenu flex overflow on
favorite-tab geometry), stale pins fixed in the converted copies, PW
cold-start noise documented. `authenticated-home-empty-notifications` went
13/22 → 29/4 with the deep-probe round (dual-render hypothesis disproven —
shim index-loss bugs; 4 residuals are app-side WTR artifacts with evidence).

Shim additions in wave 2: typed dispatchEvent (MouseEvent with button=0 —
TanStack Link bails on generic Event clicks), toHaveURL Playwright semantics
(relative resolution + *-only globs), order-insensitive toEqual/toContainEqual,
toBeTruthy/toBeFalsy/toBeDisabled/toHaveAccessibleName, evaluate 2-arg,
allTextContents, selectText, globSync (fs.globSync endpoint, zero deps),
test.setTimeout/skip, getByRole implicit roles + accessible-name fallback,
:has-text single quotes, :visible/:hidden, chained :scope with index,
retry-through-strict in actions AND polls, mouse.click cancelable,
hover→lastHovered, tree-wide mouse leave, per-goto document request events,
API 404 via context.status, fixture-before-esbuild plugin order.

## Next steps

1. Convert the remaining ~780 specs in waves (24-32 per wave), reusing the
   wave-1 loop: convert → run → apply shim gaps → verify against PW baseline.
2. Batch conversions with subagents (specs are mechanical; shared-file fixes
   batched per wave like the parity work). Keep Playwright copies in `tests/`
   until the WTR coverage is verified, then cut over the gate
   (`test:e2e:stylex-final` → WTR profile) and delete the Playwright set.
3. Gate: replace the playwright runner invocation with `web-test-runner` for the
   final profile; keep the build + StyleX verifier steps.
4. Reconcile the bucket-3 stale pins in the ORIGINAL specs (sync the
   converted-copy fixes back) so the Playwright baseline and WTR agree.

## Key findings

- WTR 1.0 has no TS transform — `@web/dev-server-esbuild` required.
- WTR 1.0 maps `.ts` → `video/mp2t` (MPEG-TS MIME clash) — `mimeTypes` config.
- Any custom `middleware` in the WTR config breaks session-page serving; serve
  extra files via plugins.
- iframe `window.fetch` assignment is wiped on navigation — inject the override
  into the served document (`parent.__wtrMockFetch`).
- Glob→regex: escape AFTER protecting wildcards.

## Wave 4 — committed `302c4d9ff` (25 files, +13.6k)

Specs (24): project-code-{search,svn-head,svn-main,svn-main-trailing-slash,svn-missing-readme,tags,view-file,view-folder},
project-commits-svn-{main,root,root-trailing-slash}, project-deleteform-svn, project-create, project-fork-form,
project-home-{history,dashboard}, project-pullrequests, project-reviews, project-statistics, projects-list,
public-landing-parity, register-alias, reset-password{alias,}, root-reset-password-alias.

Suite: 99 files, 872 passed / 394 failed / 1 skipped (~18 min). Fresh PW per spec; remaining failures are
PW-identical app-parity gaps (bucket 2: stylex shells, geometry drift, source pins) + bucket-3 copy fixes applied.

Shim additions: expect.poll(fn).not.<matcher>, page.request.get APIResponse facade, xpath cross-realm
(nodeType===1), plain-parent xpath compose, child-comma-split compose, Tab blur/focusout in Locator.press AND
keyboard.press, evaluate/evaluateAll bridge routing for scopedChild, page.clock.install no-op, poll().toContain
array membership, Locator.press printable-key insertion (click-select replace; type=number has no readable
selection — click records data-wtr-click-selected), click()/press() focus the element, route.fallback()
(next handler, else real fetch), page.emulateMedia({reducedMotion}) via iframe matchMedia patch,
page.waitForLoadState, waitForEvent("framenavigated") on every iframe load, async readFile path mapping +
raw .txt suffix, getByText innermost-only (text= semantics), filterWithPredicate filters the FULL resolved
chain (never re-resolves the raw selector — fixes nth(1).locator("a",{hasText}) resolving null), scoped
compose for indexed/custom parents, "A >> nth=N" chain selector.

## Wave 5 — committed `b4557b4f7` (25 files, +20.2k)

Specs (24): search-global, search-organization, search-project, search-shared-dead-consumer, secret-setup,
restart, restricted, site-admin-{data,diagnostic,forbidden,issue-list,mail,massmail,post-list,project-list,
route-access,update,user-list}, spa-shell-transition, stylex-alert-danger-bridge, stylex-anonymous-home-
{features,hero,intro-background}.

Suite: 123 files, 1011 passed / 408 failed / 1 skipped (~18.5 min). Search batch 67/2 (2 bucket-2 MATCH:
global search search-box-wrap class drop src/routes/search.tsx:328; sidebar rowWidth 360-vs-350).
Admin batch: mostly bucket-2 MATCH (site-setting-wrap family — app stylex owners vs legacy
siteMngLayout.scala.html:40; logo-href `${basePath}/` family; TanStack aria-current family).

Known residuals:
- CSS :hover ceiling (bucket 1, documented): site-admin-user-list delete-modal + reset-password-alert
  hover-state assertions fail WTR-only (PW real-pointer passes). Stylex `opacity: { default: 0.2, ":hover": 0.4 }`
  (userList.tsx:510) is unsynthesizable without CDP — the 3am upgrade path is a CDP Input.dispatchMouseEvent
  bridge in the WTR runner, not page-side JS.
- site-admin-user-list populated DOM `.site-setting-wrap` toBeVisible — bucket 2 (app never renders the class;
  userList.tsx has no site-setting-wrap; mail.tsx:335/update.tsx:187 do).
- site-admin-mail active-sidebar ariaCurrent/dataStatus — bucket 2 (PW-verified identical).
- PW cold-start goto timeouts and first-run browser-disconnects remain harness noise (re-run).

## Wave 6+ candidates (alphabetical remainder)

stylex-anonymous-* suite, stylex-* login/signup/user-menu/auth-home screens, support-* docs, user-*
profile screens, project-code-* remainder, yobi-svn-* / vcs-* / weblabs-* screens, org-* remainder,
milestone-*, issue-* remainder, project-issue-* remainder. Recompute `comm -23` against the live
`frontend/tests/wtr/` list each wave; ~750 remain.

## Wave 6 — committed `9cb55ff60` (25 files, +8.5k)

Specs (24): stylex-anonymous-home-{intro-outer,intro}, stylex-anonymous-{login-normal,site-signup,user-menu},
stylex-auth-home-{content-grid,default-login-action,intro-guide-cta,intro-guide,notification-empty,notification-more,
notification-row,page-wrap,series-tabs}, stylex-auth-provider-logo-owners, stylex-authenticated-sidebar-project-list,
stylex-authenticated-sidenav-{account-row,content-frame,direct-project-rows,favorite-organization-rows,
favorite-project-rows,favorite-shell,favorite-star-geometry,favorite-stars}.

Suite: 147 files, 1078 passed / 431 failed / 1 skipped (~19.5 min).

Shim additions: element-handle bridge (Locator.elementHandle + __wtrHandleRef
resolution inside iframe evals, both branches), getByRole a11y-tree hidden
exclusion, Locator.innerText (iframe-realm prototype getter), getByPlaceholder,
Locator.screenshot, expect.closeTo, xpath= children on custom-resolver parents,
elementHandle waits through strict violations.

Residual families (all PW-verified): CSS :hover ceiling (site-signup interaction
states, user-menu login hover, auth-home hover bgs, favorite-stars hover — stylex
`:hover`/`:focus`/`:active` tokens need CDP); dev-vs-dist geometry drift
(account-row, content-frame, direct-project-rows width 293->207, fav-org
minHeight, fav-shell mobile subpixel + dist sidebar collapse ~13px, fav-project
fallback-off .user-li); source pins (account-row row-fluid user-menu-wrap);
stale pins fixed in copies (intro-outer row-token family d1ba4466f, notification
geometry family, provider-logo owners, fav-project popover inversion 8029e1e6d,
fav-stars iconBox 23.109375 + 600ms sidebar transition settle wait).
