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

## Wave 7 — committed `996092b31` (25 files, +9.2k)

Specs (24): stylex-authenticated-sidenav-{project-shell,project-subtabs,recent-issue-rows,recent-shell,shell,
tab-panel,tabs}, stylex-authenticated-user-menu, stylex-commit-detail-review-textarea, stylex-controls-row-fallback,
stylex-error-wrap-fallback-retirement, stylex-framed-site-shell, stylex-global-gnb-{brand-link,feedback-link,inner,
nav,outer,project-list-divider,project-list-link,search-box,search-form,search-input,search-scope-legacy-classes,
search-scope-menu}.

Suite: 171 files, 1156 passed / 485 failed / 1 skipped (~22 min).

Shim additions: document request event on every iframe load (app-initiated
form GET navigations no longer hang waitForRequest), toMatchObject subset
semantics (expected ⊆ actual, nested plain objects recurse, arrays
element-wise) in buildExpect + poll, process.env.PW_CHANNEL="chrome",
createHash export (verified byte-identical compact SHA-256).

Residual families (all PW-verified): CSS :hover ceiling (brand-link,
feedback-link, List All, scope-menu); retained legacy classes (search-box/
select, input-prepend, btn-group — PW byte-identical); dist sidebar
offset/collapse geometry (sidenav family, WTR-only where PW dev renders
correctly); fallback-comparison pins (subtabs :focus border, tab-panel
radius — both runners fallback-off); data-toggle=tab fixture pins; stale
pins fixed in copies (gnb-outer template-literal className, framed-site-shell
sha256 8b437655422bcfe1e612e7320362c3b52e6f65ec43c064dd344e8e7e5de18be6,
project-shell input color 51,51,51, recent-shell empty heights, subtabs
height family 46->44 etc).

## Wave 8 — committed `d67e0aba8` (26 files, +6.8k)

Specs (24): stylex-global-gnb-search-submit, stylex-global-search-{category,page-grid,pagination,result-owners,
results}, stylex-global-sidebar-open-pin, stylex-gray-text-retirement, stylex-help-{faq,shell},
stylex-home-notification-expanded-height, stylex-home-sidebar-legacy-popover, stylex-left-sidebar-{account-actions,
close-pin,direct-project-rows,favorite-nested-project-rows,favorite-organization-rows,favorite-shell,footer,motion,
outer-shell,profile-identity,project-shell,project-subtabs}.

Suite: 195 files, 1206 passed / 510 failed / 1 skipped (~23 min).

Shim additions: placeholder in accessible-name candidates, display:contents +
position:fixed visibility (rect fallback), Space/Enter button activation
(parseKeyCombo Space->" "; cross-realm tagName), printable-key insertion
restricted to INPUT/TEXTAREA, Locator.waitFor, click hit-test for
pointerup/click (wrapper li > Link), ../docs/ mapping + /docs fixture root,
implicit ARIA roles (complementary/navigation/main/region/list/listitem).

Residual families (all PW-verified): CSS :hover ceiling (brand/feedback links,
List All, scope-menu, close-pin cursor:default auto/:hover pointer, favorite
rows); retained legacy classes (search-box, pin, input-prepend — PW
byte-identical); yobicon @font-face dropped by fallback-off build (fav-org
logo collapse 3vs23, footer hearts 16x0); dist sidebar offset/collapse;
stale pins fixed in copies (search category listStyle, favorite-shell empty
heights 72->70/20->18, help-shell margin 143 PW-identical stale).

## Wave 9 — committed `339b3d1b3` (25 files, +4.9k)

Specs (24): stylex-left-sidebar-{recent-issue-rows,recent-shell,tab-panel,tabs}, stylex-lost-password-
{authenticated-error-alert,authenticated-prefill,authenticated-success-alert,error-alert,form,success-alert},
stylex-members-{role-menu-hover,role-menu-item}, stylex-migration-disabled-shell, stylex-orange-text-retirement,
stylex-org-directory-inline-residual, stylex-organization-boards-{inline-residual,two-column-margin,
two-column-popover,}, stylex-organization-boards, stylex-organization-{delete-form,directory-error-wrap,
home-action-floats,home-header-menu,home-inline-residual}.

Suite: 219 files, 1265 passed / 522 failed / 1 skipped (~24 min).

Shim additions: Space toggles checkboxes/radios, Enter on form inputs
requestSubmit, Locator.evaluate waits for the element (bridge for all
selectors — plain branch raced post-navigation re-renders), locator.filter
({visible}).

Residual families (all PW-verified): CSS :hover ceiling (recent-issue popover,
sidebar tabs colors, success-alert dismiss, org-home header menu); retained
legacy classes (orange-txt settingform.tsx:270 — PW-identical); yobicon
fallback-off collapse; dist sidebar offset; stale pins fixed in copies
(recent-shell empty heights 97->95/55->53/20->18, sidebar tabs
yobicon-refresh template literal, members role-menu hover rule retired
886bddf47, lost-password heading 20->18, directory sprite hashed).

## Wave 10 — committed `659caedc7` (24 files, +5.7k)

Specs (24): stylex-organization-boards-{pagination,search-float}, stylex-organization-home-{leave-modal,
project-filter}, stylex-organization-home, stylex-organization-issues-{action-floats,due-date-mr20-mt10,
header-background,inline-residual,label-color,pagination,quicksearch,two-column-margin}, stylex-organization-issues,
stylex-organization-list, stylex-organization-member-panel-{avatar,inner,mt10}, stylex-organization-members-
{delete-modal,error-wrap,inline-residual,list}, stylex-organization-menu-{active-pseudo,group}.

Suite: 243 files, 1320 passed / 524 failed / 1 skipped (~24 min). 16/24 specs
fully green; no new shim gaps (wtr-compat unchanged this wave).

Residuals: CSS :hover ceiling (org menu active pseudo rgb(218,218,218));
data-style-src DEV-only stylex attribute (bucket-2 dist divergence — dist
runtime emits src metadata only for compiled props); stale pins fixed in
copies + PW-verified: yobicon-middle retirement (project-filter icons),
member-panel singular owner refactor b33f5bc84, member-list enrollment
avatarWrapOwner/detailsOwner props + onAccept (loginId, userId) param order,
issue label Dynamic StyleX color={label.color}, sprite dist-hashed family.

Fixture-server gotcha (waves 9-10): URL-object fixture reads (fileURLToPath)
bypass the .txt raw-suffix mapping and get esbuild-transformed (trailing
commas dropped in multi-line stylex source pins) — always pass fixture paths
as STRINGS so the .txt suffix serves them raw.

## Wave 11 — committed `4e0fb3c9b` (25 files, +4.2k)

Specs (24): stylex-organization-{menu-setting,new,profile-logo,project-card-avatar-image,project-card-child-paint,
project-card-stats-icons,pullrequests-action-floats,pullrequests-header-logo,pullrequests-inline-residual,
pullrequests-pagination,pullrequests,search-category,search-error-wrap,search-pagination,search-results,search,
setting-form,settingform-inline-residual,settingform-wrong-name,settingform,util-shell},
stylex-project-branches-{default-badge-ml10,inline-residual}, stylex-project-branches.

Suite: 267 files, 1371 passed / 527 failed / 1 skipped (~25 min).

Shim additions: ../src/ fixture mapping (both readers); readFile gained the
../docs/ mapping it was missing.

Residuals (all PW-verified): yobicon @font-face collapse under fallback-off
(project-card lock/stats icons — PW-identical bucket-2 MATCH); data-style-src
DEV-only attr (branches default badge); stale pins fixed in copies + PW-
verified: org-new validation owner refactor (n-alert data-errtype, owners 5->4),
org-setting body->top-box (82a95f70c), org search result-item-content +
fallback bridge retirement (1b69e66a4), project branches data-toggle scoping
to .code-browse-wrap, pullrequests sprite dist-hashed.

## Wave 12 — committed `9cc593714` (25 files, +3.4k)

Specs (24): stylex-project-change-vcs-{code-visibility,modal-visibility}, stylex-project-change-vcs,
stylex-project-code-branch-{breadcrumb-ml10,dropdown,index,inline-residual}, stylex-project-code-branch,
stylex-project-code-browser-header-floats, stylex-project-code-file-{breadcrumb-ml10,comment-count,error-wrap,
header-floats,inline-residual,open-popover}, stylex-project-code-file, stylex-project-code-folder-{row,shell},
stylex-project-code-folder, stylex-project-code-{history-floats,nohead}, stylex-project-code,
stylex-project-commit-detail-{inline-residual,markdown-editor-mt10}.

Suite: 291 files, 1403 passed / 532 failed / 1 skipped (~25 min).

Config fix (web-test-runner.config.mjs): esbuild resolveMimeType returns
text/html for /yona/ SPA fallback routes (non-asset, non-api) — the core's
URL-extension mime fallback typed .ts-suffixed SPA routes as
text/javascript and esbuild crashed transforming the HTML (500) / the
browser rendered the source; /yona/ transforms short-circuited (built dist
served verbatim).

Residuals (all PW-verified): data-style-src DEV-only attr (code-folder,
code-branch-index, code-file, comment-count); stale pins fixed in copies +
PW-verified (change-vcs data-toggle scoping, code-browser/file-header
pull-left/pull-right retained f54b9a330, #spin inline style 38254cc9f,
comment-count number-of-comments + revision ?branch=#path, folder-row LESS
nesting regex, code searchStyles scope 270ee07ff); error-wrap needs the
workspace mock (PW dead backend keeps it pending; WTR unmocked fetch 404s).

## Wave 13 — committed `673d4fc66` (24 files, +3.0k)

Specs (24): stylex-project-commit-detail-{original-message,owners,review-residual}, stylex-project-commit-detail,
stylex-project-commit-file-history-{mt10,warning-none}, stylex-project-commit-file,
stylex-project-commits-{inline-residual,warning-none}, stylex-project-commits, stylex-project-compare,
stylex-project-delete-form, stylex-project-deleteform-{batch7,code-visibility}, stylex-project-history-
{activity-geometry,avatar-wrapper,pull-request-owners,static-owners,typography,whereis-owners},
stylex-project-home-{action-floats,action-member-card,assignee-link,clone-controls}.

Suite: 315 files, 1434 passed / 534 failed / 1 skipped (~26 min). No new shim
gaps (wtr-compat unchanged).

Residuals: default-avatar-64.png base64 data-URI inline under dist (Vite
4089<4096 inline limit — bucket-2 dev-vs-dist); compare runtime mock glob
/owners/**/compare never matches /projects/.../compare (bucket-4,
PW-identical); commit review comment button 0x0 yobicon collapse
(WTR-greener with PW evidence); stale pins fixed in copies + PW-verified
(commit-detail diff-body-layout 8d08f4a5b + helpOwner prop 38254cc9f,
warning-none @layer nesting b2d42bdf6, delete-form modal 1366x900 geometry
ebfd91c33, commits mock glob /projects/.../commits, pathless commits
empty-warning owner).

## Wave 14 — committed `eec7d9838` (25 files, +2.3k)

Specs (24): stylex-project-home-{dashboard-progress,header-background,header-overview,leave-modal,
member-avatar-image,member-avatar-wrapper,member-header,milestone-progress,overview-label,overview-static,
progress,side-panel}, stylex-project-home, stylex-project-import-{mt10,protected-scope,repo-auth},
stylex-project-import, stylex-project-internal-error-wrap, stylex-project-issue-detail-{body-sidebar,
conditional-visibility-wave,danger-buttons,disabled-comment-actions-mt10,disabled-vote,error-wrap}.

Suite: 339 files, 1459 passed / 536 failed / 1 skipped (~26 min).

Shim addition: waitForResponse/waitForRequest facades expose status() (real
mocked status) — specs can predicate on response.status() directly.

Residuals (all PW-verified): data-style-src DEV-only attr (import,
import-mt10); stale pins fixed in copies + PW-verified (issue-detail-body-
sidebar MarkdownEditor/UploadForm props refactor, project-home progress
milestoneProgressBar split :1935, milestone-progress fixture-string raw .txt,
warning-none nesting); avatar data-URI inline family tolerated.

## Wave 15 — committed `936f33268` (24 files, +2.4k)

Specs (24): stylex-project-issue-detail-{event-base,event-state-variants,fixed-inline-owners,font12,
inline-residual,item-count-groups,keymap-wrapper,label-control,label-geometry,label-search,markdown-editor-mt10,
modals,owners,parent-subtask-state,selected-child,share-link-secondary,share-link,sidebar-metadata,subtasks,
upload-parity,voter-summary}, stylex-project-issue-detail, stylex-project-issue-edit,
stylex-project-issue-editform-error-wrap.

Suite: 363 files, 1488 passed / 536 failed / 1 skipped (~26 min). 22/24 fully
green; no bucket-1/2/4 residuals.

Stale pins fixed in copies + PW-verified: fixed-inline-owners hidden select2
width scoping; inline-residual 8-pin set (MarkdownEditor tabContentPaneOwner/
wrapId props, taskProgressBar dynamic fn, label-color dropdown-only owner,
viewerCanUpdate mock); issue-edit container vcs + projects-level mock globs
(/projects/{owner}/{project}/issues).

## Wave 16 — committed `313240fd4` (24 files)

Specs (24): stylex-project-issue-editform-{inline-residual,label-residual,
markdown-editor-mt10,owners,secondary}, stylex-project-issue-form-label-colors,
stylex-project-issue-legacy-popover-position, stylex-project-issue-sharer-list-
visibility, stylex-project-issueform-assignee-control, -attachments-visible,
-cancel-button, -due-date, -editor-option-shell, -editor-shell,
-editor-toolbar-notice, -error, -inline-residual, -markdown-editor-mt10,
-markdown-tabs, -mention-popup-position, -mention-scroll-dynamic,
-select-controls, -subtask, -title-options.

Suite: 387 files, 1513 passed / 536 failed / 1 skipped (~26 min). 22/24 fully
green; no bucket-1/2/4 residuals reported.

Shim fixes (main, wtr-compat.ts / web-test-runner.config.mjs):
- `Locator.scrollIntoViewIfNeeded` (scrollIntoView nearest + settle sleep);
  unblocked issueform-assignee-control.
- XHR uploads: `WtrXHR` wraps XMLHttpRequest in the served index; `send()`
  routes through `__wtrMockFetch`, defines status/responseText/response
  getters, fires readystatechange (0→4), upload progress+load (drives
  `onProgress(100)`), load, loadend. Unblocked attachments-visible upload
  progress.
- `toHaveValue` accepts RegExp (Playwright parity).
- `createFulfilledResponse`: null-body statuses 204/205/304 construct
  `Response` with `null` body — `new Response("", {status: 204})` throws
  "Response with null body status cannot have body", which left the
  attachment delete row stuck in 'deleting' forever (fetch hit the mock,
  response never constructed). Debugged via mock hit history probe
  (`__wtrMockHistory`); 3/3 green after fix.

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- editform inline-residual 4-pin set: retired 3 redundant inline-style
  .not.toContain pins (editform.tsx:408/514/1121 duplicate stylex
  declarations), assignee-input class pin dist-aware
  (`/^bigdrop .+$/u`), paste-help/upload-help retired toHaveCSS DOM pins
  (display:none in @layer legacy; right-txt absent from dist).
- markdown-editor-mt10 + secondary: node:fs (import.meta.dirname/resolve)
  → string fixture paths (established copy adaptation).

Remaining: 472 of 858 specs converted.

## Wave 17 — committed `cd6a6b2ff` (24 files)

Specs (24): stylex-project-issueform-{title-suggestion-color,upload-progress-
shell,upload-vertical-parity}, stylex-project-issueform, stylex-project-issues
-{action-floats,child-list,clickable-row,due-date-mr20-mt10,error-wrap,
inline-residual,keymap-visibility,keymap,list-row-owners,mass-update-float,
milestone-avatar-owners,pagination,progress-inline-residual,
quicksearch-count-floats,row-action-floats,row-label-dynamic,
selected-milestone-floats,static-owners-wave,two-column-margin}, stylex-
project-issues.

Suite: 411 files, 1553 passed / 538 failed / 1 skipped (~26 min).

Shim fixes (main, wtr-compat.ts):
- `page.setContent(html)` — document.open/write/close on the fixture iframe
  (lazily created like goto, works without a prior goto). Unblocked
  issues-error-wrap fixture-DOM geometry at 2 viewports.
- `waitForURL` accepts `(url: URL) => boolean` function predicate
  (Playwright parity). Unblocked selected-milestone-floats labelsform nav.

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- title-suggestion-color owner rename (project-issue-form-*);
  upload-progress-shell 4 pins → file-uploader.tsx (:501/:410/:506/:443);
  upload-vertical-parity owner props (textareaOwner/textareaBoxOwner);
  issueform data-toggle/data-request-method/data-dismiss count 0→3
  (markdown-editor wrappers :346) + upload-progress owner/bar template →
  file-uploader.tsx + attach-save-help owner prop; inline-residual
  keymapWrap float pin (-issues.stylex.ts:49); row-label-dynamic
  childLabelBackground → childIssueLabelStyle (issues.tsx:2301/2323) +
  URL fixture reads → string paths; static-owners-wave
  data-stylex-content-ready expression + project-issues-page-wireframe +
  .search-box-wrap retirement.

Bucket-2 MATCH (evidence, no fix): issueform upload-progress wrapper lost
legacy pull-right class (fileUploader.scala.html:31); issues subtask/
milestone bars render full width vs legacy percentage width
(partial_list_subtask.scala.html:18, partial_status.scala.html:46).

Remaining: 448 of 858 specs converted.

## Wave 18 — committed `719e9589e` (24 files)

Specs (24): stylex-project-labels-{category-suggestion,error-wrap,
inline-owners,list-header,preset-color-dynamic}, stylex-project-labelsform
-{category-heading-mr20,change-vcs-visibility,color-input-dynamic,mr5-inputs,
owners}, stylex-project-labelsform, stylex-project-members-{code-visibility,
error-wrap,guest-badge,inline-residual,list}, stylex-project-menu-{count,
group,nav,setting,shell}, stylex-project-milestone-detail-{action-floats,
delete-visibility,filter-visibility}.

Suite: 435 files, 1590 passed / 531 failed / 1 skipped (~26 min; −7 failed).

Shim fixes (main, wtr-compat.ts):
- `page.goto` to the URL already loaded in the iframe now reloads
  (Chromium skips `iframe.src` assignment to the identical URL → no load
  event → hang); Playwright same-URL goto semantics. Unblocked
  milestone-detail-action-floats second viewport pass.
- `data-style-src` systematic retirement (9 copies, 11 assertions):
  dev-only StyleX source-attribution metadata, absent from the dist build
  WTR mounts (project parity helper treats it as env-variant noise;
  canonicalizer precedent drops the token). Unblocked member-panel-mt10,
  branches-default-badge-ml10, code-branch-index, code-file,
  code-file-comment-count, code-folder, import, import-mt10,
  labelsform-mr5-inputs.

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- labels-list-header `.list-head` → `.not.toContain` (colocation complete);
- labelsform margin pin narrowed (`margin: "30px auto"` — errorMessage
  margin added -labelsform.stylex.ts:45);
- members-list pull-left dropped (enrollment-request.stylex.ts owns
  float:left; legacy members.scala.html:85);
- menu-count/menu-nav owner prop refactor (count-badge.tsx:27,
  $projectName.tsx:3417/3484).

Bucket-1 ceilings (evidence): menu-nav :hover background-color
unsynthesizable (CSS :hover family).

Remaining: 424 of 858 specs converted.

## Wave 19 — committed `bd1f48dc2` (24 files)

Specs (24): stylex-project-milestone-detail-{inline-residual,
issue-meta-counts-labels,issue-row-title-meta,labels,list-action-float,
mass-update-float,ml10,owners,search-float,state-badge-margin,tabs,
wrapper-parity}, stylex-project-milestone-detail, stylex-project-milestone-
edit-form-paste, -edit, -editform-{inline-residual,markdown-editor-mt10,
owners}, -editform, -error-wrap, -mass-update-buttons, -route-loading,
stylex-project-milestones-{action-floats,closed-due-margin}.

Suite: 459 files, 1615 passed / 531 failed / 1 skipped (~26 min; +25 passed,
zero new fails). No bucket-1 gaps (all 3 agents empty).

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- milestone-detail-owners padding '10px 0px' → '10px'
  (-milestone-detail.stylex.ts:114 issueRow; legacy _page.less:3851);
- milestone-edit: page-wide [data-toggle]/[data-dismiss]/[data-request-
  method] count 0 → scoped to #milestone-form (the 3 matches are the
  authenticated sidenav data-toggle="tab" tabs — faithful legacy port of
  usermenu.scala.html:55-66, parity-correct); button-clear-temporary id
  moved to markdown-editor.tsx:410 (legacy editor.scala.html:40);
- milestone-editform(+inline-residual/owners/mt10): wrapperClassName +
  owners-prop refactors (editform.tsx:202/206/221/224/308);
- milestones-closed-due-margin ml5 pin.

Remaining: 400 of 858 specs converted.

## Wave 20 — committed `28b60e743` (24 files)

Specs (24): stylex-project-milestones-{error-wrap,hidden-issue,label-color,
progress-residual}, stylex-project-milestones, stylex-project-new-fork-{index},
stylex-project-new-fork, stylex-project-new-milestone-{form-paste,
inline-residual,markdown-editor-mt10}, stylex-project-new-milestone,
stylex-project-new-pull-request-{form-inline-residual,form-paste,
markdown-editor-mt10,select2-button}, stylex-project-new-pull-request,
stylex-project-new-pullrequest-error-wrap, stylex-project-origin,
stylex-project-overview-{dashboard-headings,dashboard-visible-state,
dead-small-selector}, stylex-project-post-detail-{comment-edit,delete-modal,
disabled-comment-actions-mt10}.

Suite: 483 files, 1645 passed / 531 failed / 1 skipped (~26 min; +30 passed,
zero new fails). No bucket-1 gaps.

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- overview-dashboard-headings + visible-state: `.project-overview-home
  .empty` / `.search-category-wrap li.empty` retired from app.css →
  `.not.toContain` (empty-state styles now in -project-home.stylex.ts:
  116-117 / -project-search.stylex.ts:89);
- new-fork-index: center-txt retained-legacy-class ceiling →
  `sx.existing.className` pin (newFork.tsx:353; legacy fork.scala.html:53);
- new-milestone-form-paste: pasteHelp owners-prop refactor
  (newMilestoneForm.tsx:271/274; file-uploader.tsx:164);
- new-milestone(+inline-residual/mt10): tab state moved to
  markdown-editor.tsx:307, dataToggle + owners prop forms
  (newMilestoneForm.tsx:256-270), route shell gates on container query
  (mock added — 3 URLs);
- new-pull-request-form-inline-residual: center-txt pins.

Remaining: 376 of 858 specs converted.

## Wave 21 — committed `160fcac8c` (24 files)

Specs (24): stylex-project-post-detail-{disabled-comment,error-wrap,
inline-residual,keymap-modal,markdown-editor-mt10,modal-visibility,
original-toggle,owners,share-link}, stylex-project-post-detail,
stylex-project-post-edit-{form-paste}, stylex-project-post-edit,
stylex-project-post-editform-{inline-residual,markdown-editor-mt10,owners},
stylex-project-postform-{inline-residual,markdown-editor-mt10,paste},
stylex-project-postform, stylex-project-posts-{action-floats,filters,
inline-residual,keymap-visibility,label-button-owners}.

Suite: 507 files, 1674 passed / 531 failed / 1 skipped (~26 min; +29 passed,
zero new fails).

Shim fix (main, wtr-compat.ts):
- `Locator.count()` respects `.first()`/`.nth(N)` index narrowing (indexed
  locator reports 1 when ≥1 match exists) — Playwright parity. Unblocked
  post-detail-inline-residual toHaveCount(1) on the first tab-content pane.

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- post-detail: post mock URL owners-style → `/api/v1/projects/**/posts/1`
  (boards.ts:224-225 projectPostsPath);
- post-edit(+form-paste/editform mt10+owners): page-wide
  [data-toggle]/[data-dismiss]/[data-request-method] count 0 scoped to
  `[data-stylex-owner="post-edit-form"]` (sidenav data-toggle="tab" tabs —
  faithful port of sidebar.scala.html:50/55); button-clear-temporary id →
  markdown-editor.tsx:410; pasteHelp/saveHelp/wrapper owners-prop
  refactors (editform.tsx:166-171);
- postform(+paste/mt10): owners props (postform.tsx:271-299).

Remaining: 352 of 858 specs converted.

## Wave 22 — committed `b8aedb5b3` (24 files)

Specs (24): stylex-project-posts-{two-column-margin,two-column-popover},
stylex-project-posts, stylex-project-projectform, stylex-project-pull-request-
changes-{codediff-mt10,commit-hash-mr10,delete-modal,residual,
review-card-avatar,review-editor-mt10}, stylex-project-pull-request-changes,
stylex-project-pull-request-create-form-mr5, stylex-project-pull-request-
detail-{action-wrapper,alert-icon,help-messages-mt10,help-modal,mr10},
stylex-project-pull-request-detail, stylex-project-pull-request-edit-form-
{mr5}, stylex-project-pull-request-edit-form, stylex-project-pull-request-
editform-markdown-editor-mt10, stylex-project-pull-requests-two-column-margin,
stylex-project-pull-requests, stylex-project-pullrequest-changes-error-wrap.

Suite: 531 files, 1706 passed / 531 failed / 1 skipped (~26 min; +32 passed,
fails flat).

Shim fixes (main):
- `Locator.count()` index-narrowing scoped to non-scopedChild locators
  (`.first().locator(":scope > …").count()` counts the child chain, not 1)
  — debugged via throw-instrumentation (compose returned 5, count said 1:
  the indexed shortcut fired on the scopedChild locator);
- `page.dispatchEvent(selector, type, init)` — Playwright parity;
- `readFile` binary fixtures (png/jpg/…) return Uint8Array (byteLength
  assertions like Playwright's Buffer);
- `Locator.locator("> child")` normalized to `":scope > child"` (leading
  child combinator scoped to the parent; querySelectorAll rejects bare
  ">");
- `toHaveJSProperty` traverses dotted paths ("files.length");
- native legacy-form POST submits (defaultPrevented=false) routed through
  the fetch mock (submit interceptor in the served index) — unblocked
  review-editor-mt10 waitForRequest on the comment POST.

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- pull-request-detail mock URL → /owners/…/pull-requests/1
  (pull-requests.ts:327-334); mr10 headerStateDate two-prop form
  (-pull-request-detail.stylex.ts:43); edit-form owners prop
  (editform.tsx:233); editform-mt10 wrapperClassName + owners prop;
  changes upload-help owner prop (changes.tsx:570); changes-residual
  .first() per owner (2 upload forms — legacy reviewForm.scala.html:45 +
  partial_comment_form_on_thread.scala.html:55);
- posts/postform/editform owners-prop refactors (wave-21 family);
- pull-request-editform-markdown-editor-mt10 wrapperClassName/owners.

Bucket-2 MATCH (evidence): codediff-mt10 mobile margin-right 282px (no
_responsive.less:156-159 override); changes-residual diff-partial-code
class clobbered by isExpanded spread (viewChanges.scala.html:216-218).

Remaining: 328 of 858 specs converted.

## Wave 23 — committed `57a4f3178` (24 files)

Specs (24): stylex-project-pullrequest-{changes-inline-residual,
detail-error-wrap,detail-inline-residual,editform-error-wrap,
editform-inline-residual}, stylex-project-pullrequests-{action-floats,
error-wrap,list-inline-residual,row-pointer}, stylex-project-reviews-
{action-floats,batch6,inline-residual,side-effect-button,
sidebar-count-floats,title-overflow,title-residual}, stylex-project-reviews,
stylex-project-search-{category,error-wrap,pagination,results},
stylex-project-search, stylex-project-setting-default-branch-{control},
stylex-project-setting-default-branch.

Suite: 555 files, 1749 passed / 532 failed / 1 skipped (~27 min; +43 passed,
+1 flake).

Shim fix (main, wtr-compat.ts):
- `readFileSync` mirrors the async readFile binary branch (arraybuffer
  responseType for png/jpg/gif/webp/ico/woff*/eot/ttf/otf/svg) —
  byteLength assertions work like Playwright's Buffer.

Known divergence (documented): `toContainText` on multi-match locators
aggregates text instead of PW's strict-mode violation — copy-level
`.first()` scoping is the established convention.

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- changes-inline-residual: `.right-txt .ybtn` → thread-actions owner
  (-pull-request-changes.stylex.ts:40; no literal class);
- detail-inline-residual: actionWrapper two-prop form
  (-pull-request-detail.stylex.ts:76);
- editform-inline-residual: submit scoped to form owner (3 submits on
  page); merge mock returns a PullRequestCommit so the conflict modal
  opens (editform.tsx:585-592); saveHelp owners prop (editform.tsx:234);
- pullrequests-action-floats: `.first()` scoping for duplicate-screen DOM;
- reviews-title-overflow: `.review-list-wrap` → `.post-list-wrap` rule
  pin (app.css:2492).

Copy-level: search legacy-fallback.css fixture read via the /yona/ served
path (dist copies public/ verbatim, byte-identical; precedent
legacy-fallback-off.e2e.ts:830).

Remaining: 304 of 858 specs converted.

## Wave 24 — committed `e00f5c0f6` (24 files)

Specs (24): stylex-project-setting-{logo-branch-result,
overview-height-dynamic,reviewer-note-ml10,textarea-static},
stylex-project-setting, stylex-project-settingform-{batch6},
stylex-project-settingform, stylex-project-transfer-{batch6,
code-visibility}, stylex-project-transfer, stylex-project-util-shell,
stylex-project-visibility-badges, stylex-project-watcher-state,
stylex-project-webhooks-{code-visibility,error-wrap,list-header,
list-item-headings,list-item-mr20,residual,truncate},
stylex-project-webhooks, stylex-project-weblabs-portal-shell,
stylex-projectform-{conditional-displays,inline-residual}.

Suite: 579 files, 1783 passed / 534 failed / 1 skipped (~27 min; +34 passed,
+2 = bucket-2 MATCHes).

Shim fix (main, wtr-compat.ts):
- `waitForResponse` ResponseFacade gains `json()` (Playwright
  APIResponse.json(); clone().text() → JSON.parse of the mock body).

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- setting-logo-branch-result: inline dynamic logo URL positive pin
  (setting.tsx:549; legacy setting.scala.html);
- setting: 7 stale pins (descs-list owner, inline color/minWidth, theme
  block literals, borderLeftColor cascade, textarea height 80px);
- webhooks-list-header: list geometry moved to route styles
  (webhooks.tsx:65-72) — css pins → stylex source + not-contains;
- webhooks-list-item-headings: `.truncate` → textOverflow/whiteSpace pins;
- webhooks: paint-only contract scoped to the defineVars theme block;
- weblabs-portal-shell: bucket-4 (mirror-only weblabs/portal project) —
  copy adds a container mock + payload contract assertions.

Bucket-2 MATCH (evidence): setting name-popover position:static (legacy
.popover absolute, bootstrap.css:5334) breaks the branch-drop open in real
Chrome (PW fails identically); settingform-batch6 setting-box-right 400px
vs legacy 420px (styles.settingFields zeroes padding-left,
_page.less:2081/2117-2119).

Remaining: 280 of 858 specs converted.

## Wave 25 — committed `fe7fe89bc` (24 files)

Specs (24): stylex-projectform-{mt10,vcs-warning-ml10}, stylex-projects-
{breadcrumb,directory-tabs,empty-sprite,empty-state,final-consumers,
fork-origin,icons-avatar-image,list-shell,logo-lock-label,page-wrappers,
pagination-avatar-radius,pagination-input-icons,pagination-shell,
pagination-sprite,readable-residual,row-content,search,stats-alignment-weight,
stats-members,text-links-code-update}, stylex-pull-request-branch-{direction-
ml10,info}.

Suite: 603 files, 1830 passed / 550 failed / 1 skipped (~28 min; +47 passed,
+16 = the :hover/:focus CDP-only ceiling family + 1 dev-vs-dist URL case).

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- empty-state: empty-icon CSS-var pin → projectsDirectoryDynamicStyles
  form (projects.tsx:486/725/728); sprite URL dist-aware regex
  (stringContaining → /sprite(?:-[A-Za-z0-9_-]+)?.png/);
- list-shell + readable-residual: className regex tightened to
  /className=.*\bproject\b/u (empty-sprite migration b2fb2f116
  false-positive); readable mobile y geometry −30px (5253fbe15);
- fork-origin mobile geometry stale pins.

Ceiling residuals (evidence; copies keep assertions): directory-tabs
:hover bg paint (:281); fork-origin :hover; logo-lock-label label
hover-color/focus; pagination-avatar/shell/one-page/sprite hover polls;
text-links hover polls; search filter-submit URL canonicalization (dist
TanStack Router appends labelIds=; dev URL exact-match differs).

Note: sync XHR forbids responseType (InvalidAccessError) — binary
fixtures must use the async readFile.

Remaining: 256 of 858 specs converted.

## Wave 26 — committed `0df6f43e1` (24 files)

Specs (24): stylex-pull-request-changes-{pending-block,review-owners},
stylex-pull-request-{conflict-guide,create-edit-geometry,
detail-header-state-date-mt10,state-info}, stylex-reset-password-
{bad-request,form,validation-popover}, stylex-restart-notice,
stylex-restricted-sidebar-pin, stylex-root-{boundary,home-wrapper-parity,
login-dialog-separator,login-dialog-visibility,login-dialog,notfound-
error-wrap,sidebar-open-close-popover,toast,usermenu-admin-font,
usermenu-dropdown-colors,yobi-dialog}, stylex-search-{error-wrap},
stylex-search.

Suite: 627 files, 1888 passed / 550 failed / 1 skipped (~28 min; +58 passed,
zero new fails).

Shim fix (main, wtr-compat.ts):
- `page.clock.runFor(ms)` — waits out the real interval so the app's
  React-owned timers fire (root-toast dismiss test).

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- reset-password-form: y-pins −2px/−4px (legacy geometry drift);
- reset-password-validation-popover: className template-literal pin
  (resetPassword.tsx:467), y-pins 243/294/303/354, public/ fixture path;
- root-toast: `${basePath}` goto (bare '/' mounts the runner page),
  opacity 0.9 pin, button y 734;
- root-boundary: fallback-off runtime pins (link stripped, display block).

Retired (ceiling): restricted-sidebar-pin :hover computed styles;
mt10 existsSync screenshot assertion (artifact-only screenshots).

Remaining: 232 of 858 specs converted.

## Wave 27 — committed `8963ec232` (24 files)

Specs (24): stylex-secret-{notfound-error-wrap,setup},
stylex-signup-validation-popover-position, stylex-site-admin-affix,
stylex-site-data-{breadcrumb,export-action,page-grid-columns,sidebar,
title-strip,title-warning-shell,warning-surface}, stylex-site-diagnostic-
{breadcrumb,error-pre,error-title,no-error-title,page-grid-columns,
sidebar}, stylex-site-footer, stylex-site-issue-list-{breadcrumb,metadata,
page-row-shell,pagination-sprite,pagination,residual}.

Suite: 651 files, 1974 passed / 558 failed / 1 skipped (~29 min; +86 passed,
+8 = documented bucket-2/ceiling family).

Shim fixes (main, wtr-compat.ts):
- `toHaveText` array element-wise uses `allTextContents()` (was calling
  `locator.textContent()` as a function — TypeError every poll, masked
  by expectPoll retries);
- scopedChild index-aware resolution TRIED then REVERTED: broke the
  aggregate path specs depend on (`nth(0).locator(":scope …")` resolved
  0 elements); the metadata copy carries an evaluate-based workaround
  instead (documented divergence).

Bucket-3 copy fixes (agents, PW-verified via temp wtrfix copies, deleted):
- site-data-title-strip: owner list + `.span10` → content-column scoping;
- site-data-export-action + diagnostic-error-pre: `.span10` selectors →
  stylex content-column owners (siteMngLayout.scala.html:40-72 layout
  retired);
- site-diagnostic-sidebar: SiteAdminSidebar props (badgeOwner/navOwner/
  ownerPrefix);
- warning-surface: dev debug class token → hash regex (dist strips the
  debug prefix);
- issue-list-breadcrumb stale pins.

Bucket-2 MATCH (evidence): data-breadcrumb h3 font-size 15.21px vs legacy
24.5px (bootstrap.css:714); diagnostic-sidebar links unstyled (orphaned
sidebarLink slot, _page.less:5251-5264); pagination paint; residual input
:hover shadow (ceiling).

Remaining: 208 of 858 specs converted.
