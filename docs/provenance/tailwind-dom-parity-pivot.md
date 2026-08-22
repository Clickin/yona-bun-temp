# DOM-Parity Fast Lane — Tailwind single stylesheet + 3-contract verification (pivot)

> status: active (2026-08-19) — supersedes the StyleX wave plan
> (`docs/plans/2026-07-13-frozen-css-to-stylex-migration.md`).

## Decision background

The Yona→Yoram port (~95%) was throttled by a single, slow verification gate:
the Chrome-based WTR e2e suite (863 specs, serial, full gate 17–30 min). The
user decision: merge the legacy CSS (bootstrap 2.3.1 + usermenu + yobi, served
as `legacy-fallback.css` via `<link>`) into `frontend/src/app.css` (Tailwind v4
entry) so the app has a **single global baseline stylesheet entry**, and split
verification into three independent contracts so the fast lane stops depending
on browser geometry.

Goal boundary: "single global baseline stylesheet entry — no separate legacy
fallback runtime stylesheet". Route-local CSS and Vite code splitting are
explicitly NOT merged into one physical resource.

## The 3-contract verification model

| Contract | What it verifies | Cost | Tooling |
| --- | --- | --- | --- |
| CSS equivalence | style source/cascade did not unintentionally change | stylesheet-scale, seconds | `scripts/css-cascade.mjs` + `docs/provenance/css-cascade-baseline.json` |
| DOM parity | React produces correct DOM/attribute/state/navigation/interaction semantics | fast, no browser | Vitest + happy-dom (`dom-compat` lane) |
| Browser parity | actual cascade, layout, font metrics, responsive, hit-testing, hover/focus, geometry | small Chrome subset | WTR (existing harness) |

The old single axiom ("same CSS + DOM ⇒ same UI") is not used as a
verification model. DOM-lane click/visibility are weakened by definition:
DOM click = synthetic event → React state/event/navigation; Chrome click adds
geometry/actionability/hit-test. Only capability errors promote a spec to the
chrome lane — never ordinary assertion failures.

## Baseline SHAs and artifacts

- Pre-merge commit (merge parent): `d047ec595ce12637fc78d224c470edb17ed1e835`
  (baseline commit, recorded in the css-cascade baseline JSON `gitHead`).
- Frozen artifact: `legacy-fallback.css` sha256
  `754ff3b616156208c215c1ff49503d4afc450977ac9206d01297fe9217bd14cd`,
  pinned in `docs/provenance/legacy-css-merged.manifest.json` (moved from
  `public/legacy-assets/stylesheets/legacy-fallback.manifest.json`, with
  `{"runtime": false, "mergedInto": "frontend/src/app.css"}` added).
- `docs/provenance/css-cascade-baseline.json` — git-tracked semantic cascade
  model of the pre-merge state (effective layer order
  `homeb → legacy → theme → utilities`, 9239 rules, 25 buckets, 2 font-faces,
  16 keyframes, 25 url asset identities). Regenerate only with
  `node scripts/css-cascade.mjs --regen <pre-merge-ref>` (git-input mode).
- Merge markers in `frontend/src/app.css`:
  `/* BEGIN merged frozen legacy-fallback (sha256:<artifact>) */` … `/* END */`.
  The merged block sits before the hand-curated `@layer legacy` block, so
  curated rules keep winning ties (same as the old link→import document order).

## Merge mechanics (SHA-aware asset relocation)

`scripts/merge-legacy-fallback.mjs`:
1. Verifies the manifest `artifactSha256` against the fallback file bytes.
2. Extracts the fallback `@layer legacy { … }` inner content byte-exactly
   (raw brace matching — no re-serialization).
3. Rewrites every non-data `url(...)` relative to `src/app.css` as
   `./assets/legacy/<path>` (dest mirrors `public/legacy-assets` with the
   `stylesheets/` prefix stripped).
   - destination exists + sha equal → reuse (no duplicate copy);
   - destination exists + sha differs → hard fail (file + both SHAs printed);
   - destination missing + identical-content file under `src/assets/legacy` →
     reuse that file (no duplicate copies, e.g. `sprite.png`,
     `photo-svetacreative.jpg`);
   - source missing → keep the rewritten broken reference (runtime 404 parity,
     e.g. the typo'd `fonts/material-icon..ttf`);
   - otherwise → copy.
4. Idempotent marker-block insertion. `--dry-run` reports actions only.

## Lane-split rules

- Initial split is file-level via `scripts/classify-e2e-specs.mjs` static grep
  → `frontend/tests/e2e-lane-manifest.json` (`dom ∩ chrome = ∅`,
  `dom ∪ chrome = current e2e file inventory`). The grep classifier is NOT
  authoritative: a `DOM_UNSUPPORTED:*` capability error at dom-lane runtime
  moves the file to the chrome lane (guard errors only, never assertion
  failures).
- Mixed files (`loginform.e2e.ts` etc.) are physically split into
  `.dom.e2e.ts` + `.chrome.e2e.ts` before their dom-lane batch.

## Capability guard definitions

`dom-compat` raises identifiable errors for capabilities it cannot provide:

- `DOM_UNSUPPORTED:geometry` — boundingBox / getBoundingClientRect-based reads
- `DOM_UNSUPPORTED:computed-style` — toHaveCSS / getComputedStyle
- `DOM_UNSUPPORTED:hit-test` — coordinate clicks / elementFromPoint / real mouse
- `DOM_UNSUPPORTED:document-reload` — reload semantics
- `DOM_UNSUPPORTED:native-navigation` — native browser navigation
- `DOM_UNSUPPORTED:window-realm-reset` — fresh Window realm requirement

## DOM vs Browser contract (toBeVisible / click / goto)

- **dom-lane `toBeVisible`** is a conservative structural subset provable from
  the DOM alone: `isConnected === true` + (self or any ancestor) `hidden`
  attribute, inline `display:none`, inline `visibility:hidden|collapse`,
  `input[type=hidden]`. `aria-hidden="true"` alone is NOT hidden (accessibility
  semantics, not visual); stylesheet-class-hidden (`.hidden { display:none }`)
  is NOT provable without a cascade — a real visual-visibility assertion moves
  to the chrome lane, a DOM-existence assertion downgrades to
  `toHaveCount`/`toBeAttached`. happydom cascade emulation is never forced.
- **DOM click** = synthetic event → React state/event/navigation. **Chrome
  click** = geometry/actionability/hit-test. The chrome lane owns actionability.
- **`page.goto(url)` isolation contract**: fresh application mount — fresh
  React root, fresh Router, fresh QueryClient, fresh application DOM. NOT
  guaranteed: fresh Window realm, native document navigation, browser reload
  semantics, global JS realm reset (specs requiring these are flagged
  `DOM_UNSUPPORTED:*`). localStorage/sessionStorage persist across gotos
  (browser full navigation does not clear same-origin storage); cleared at
  test end. `addInitScript` hooks re-applied before every remount.
  `page.url()`/`toHaveURL` read the active memory-history location.
- **TEST_ORIGIN contract**: `TEST_ORIGIN = "http://yoram.local"` (matches the
  app's own fallback origin constant — `routes/users/loginform.tsx:302`,
  `routes/$ownerName/$projectName/code.tsx:331`). `page.goto(url)` normalizes
  via `new URL(input, TEST_ORIGIN)` and pushes only the router href form
  (pathname+search+hash) into memory history; `page.url()` resolves back to an
  absolute URL. happy-dom environment URL is set to TEST_ORIGIN so
  `window.location.origin`, `new URL(page.url()).origin`, and app reads of
  `globalThis.location.origin` all agree.

## Gate wiring

- `pnpm --dir frontend test` = `vitest run` (unit + dom-parity projects)
- `pnpm --dir frontend test:dom` = `vitest run --project dom-parity`
- `pnpm --dir frontend test:e2e` = `node ../scripts/run-wtr-e2e.mjs`
  (runner `specFiles()` returns the manifest chrome list; explicit file args
  always run)
- `pnpm --dir frontend test:parity` = `node scripts/css-cascade.mjs && pnpm
  test:dom && pnpm test:e2e`
- Release visual smoke: `generate-visual-parity-baseline.mjs` +
  `visual-parity-comparison.mjs` over shell/login/issue-list/board/code/admin
  × 1366×900/390×844; daily waves not run.

## Measured gate time

- Pre-merge full WTR gate: `mt09pt1a-44259`, 2 shards, 861 files, 3051
  tests (2924 pass / 127 fail), wall 3,123,849 ms (~52 min).
- Post-merge full WTR gate: `mt1ipwg4-26975`, 861 files, wall 3,672,074 ms
  (~61 min); NEW FAILURES 0 vs the frozen baseline, 68 recovered, 58
  baseline-known still failing. The ~12 preceding gate runs surfaced and
  fixed every load-sensitive harness flake (see
  `docs/provenance/ui-parity-reports/fallback-off-2026-08-19-single-global-baseline-merge.md`).
- css-cascade compare: seconds (postcss rule walk, no browser).
- dom-parity lane (Stage B spike): full manifest-dom run 198 files / 220
  tests, 217 passed, 3 failed — all 3 are baseline-known chrome-lane failures
  (`project-issue-detail-parity` ×2, `ownership-signup-validation-popover-position`),
  verified against `/tmp/baseline-failures.txt` (frozen pre-merge baseline).
  Wall ~38 s vs ~52–61 min for the full Chrome gate (>80×).
  Harness-only no-op diagnostics (`_diag-*`, `wtr-smoke`) are classified chrome
  (they exercise the WTR harness itself, not app DOM).

## Stage B commit note (scala-html-goal guard exception)

The Stage B commit (dom-compat lane) is test-harness infrastructure, not a
route-evidence change: it adds `frontend/tests/dom-compat.ts`,
`compat-core.ts`, `dom-setup.ts`, `vitest.config.ts`,
`scripts/classify-e2e-specs.mjs`, the lane manifest, and the harness-contract
spec, plus the behavior-preserving `mountApp`/`getRouter` history injection in
`frontend/src/main.tsx` / `router.tsx`. No route TSX, no CSS/LESS, no
yona-original files changed. Committed with
`YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY=1` (manual supervised exception per
AGENTS.md; route: none — harness only; follow-up: Stage C rewires
`tools/precommit-verify.mjs` / `tools/yona-parity-gate.mjs` so harness
infrastructure commits pass without the exception marker).

## Deferred / non-goals

- Public `legacy-assets/**` GC is deferred past Stage A (copy/reuse only).
- SVN 15-file deferred set unchanged.
- HARNESS_ENV residual failures: candidates to dissolve into the dom lane;
  real-instance probes (`project-issues-real-instance-parity`) stay chrome.
- SQLite default recommendation / H2→SQLite migration /
  `crates/yona-migrate` 100% are out of scope for this pivot (verified crates
  and Sqlite paths exist); this plan only lowers their iteration cost.

## Lane rebalance commit note (2026-08-22)

Committed with `YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY=1` (manual supervised
exception per AGENTS.md). Route: none — test-harness infrastructure only:
`scripts/classify-e2e-specs.mjs` capability-family extension, lane-manifest
rebalance (dom 205 / chrome 663), and physical split of 4 mixed specs into
`.dom.e2e.ts` + `.chrome.e2e.ts` (ownership-anonymous-home-features,
ownership-anonymous-site-signup, ownership-project-new-pull-request-form-paste,
ownership-site-project-list-notification-badge). No route TSX, no CSS/LESS,
no yona-original files changed. `test:dom`: 226/229 pass; 3 failures are
baseline-known (`project-issue-detail-parity` ×2,
`ownership-signup-validation-popover-position`). Follow-up: none — behavior
preserving split per `docs/plans/2026-08-22-differential-parity-verification.md`
Phase A.
