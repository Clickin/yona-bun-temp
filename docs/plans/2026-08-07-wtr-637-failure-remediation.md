# WTR 637-failure remediation

> status: executing — Phases 0-A-B-C done; Phase D waves 1-7 (2026-08-08); suite-7 baseline **2738 passed / 309 failed / 5 skipped** on the corrected fallback-off dist (from 2450/632, 51% reduction)
> slug: wtr-637-remediation
> date: 2026-08-07

## Context

The WTR e2e suite (`frontend/tests/wtr/`, 859 files) is now the only e2e gate (Playwright set deleted at `98bfa308c`) and runs at **2449 passed / 637 failed / 1 skipped**. The ask: classify all 637 failures and drive the suite to a final, documented state — harness gaps fixed, ceiling families resolved by the agreed hybrid decision (small high-value subset gets CDP-real-mouse `:hover` support, the rest retired; geometry triaged against the dist build), and every bucket-2 app parity gap fixed per the parity principle. End state: a full parallel sweep that is green modulo ledgered residuals.

Post-cutover there is NO Playwright baseline (originals + config deleted): verification is **WTR-green + legacy source evidence** (`yona-original/`). The wave-16–36 per-test PW verifications remain the historical evidence for the pre-existing families.

## Phase 0 — Harness quick fixes (DONE)

Three one-line harness fixes (committed in the Phase-A commit):

1. **`window.alert` payload lacks `type`** — `frontend/web-test-runner.config.mjs:91` now emits `type: () => "alert"`. Fixed `project-pullrequest-edit-form` "blocks submit when merge result has no commits" + "blocks submit when legacy required title is empty".
2. **`page.clock.fastForward` missing** — `frontend/tests/wtr-compat.ts` clock now has `fastForward` (real-timer wait, identical to `runFor`). Fixed `project-fork-form` "project fork clone completion preserves the configured base path".
3. **Hook double-wrap drops mocha `this`** — `frontend/tests/wtr-compat.ts:3197` (+ afterEach twin) zero-arg branch now binds `.call(this)`. Fixed the mirror skip gates in `project-issues-real-instance-parity` + `project-issue-detail-parity` (`this.skip()` crash) — both now skip properly.

Verify: tsc 0; the 4 affected specs run **19 passed / 8 failed / 4 skipped**, where the 8 failures are all pre-existing families (fork href/geometry pins, edit-form toContain pin) and the 3 fixed tests + 2 mirror skips behave as expected.

## Phase A — Triage (DONE)

1. Fresh full-suite run (`/tmp/suite-1.log`, ~34.5 min serial): **2450 passed / 632 failed / 5 skipped** — delta from wave-36 (637 failed / 1 skipped) reconciles exactly: −2 mirror-skip errors (now skips), −2 dialog tests, −1 fastForward test, +4 skips.
2. Parsed with the extraction script → `/tmp/fails.json`: **632 rows across 210 specs**, == runner failed count, 0 missing / 0 duplicated.
3. 27 triage agents (9 waves × 3 × 8) classified every row → **`docs/provenance/wtr-637-ledger.md`** (632 triage rows + 5 history rows F1/F8).

### Family counts (ledger)

| family | count | disposition |
|---|---|---|
| F7 app-fix | 307 | app-fix 307 (Phase D) |
| F6 pin-stale | 162 | copy-fix-current-dom 121, retained-class-retention 41 (Phase C) |
| F3 C1-candidate | 87 | C1-candidate 87 (Phase B) |
| F5 dist-geometry | 46 | copy-fix-dist-truth 46 (Phase C) |
| F2 harness-investigate | 26 | harness-investigate 26 (Phase B) |
| F4 C2-retire | 4 | C2-retire 4 (Phase C) |
| **total** | **632** | |

## Phase D — bucket-2 app fixes (IN PROGRESS, waves 1-3)

- **D1 done**: `frontend/src/app.css` `@layer legacy` input/select/textarea tag-level cascade (bootstrap.css:1031-1052 + _yobiUI.less:15-18,38-43): inputs 20px height/12px font/2px radius, selects 30px, textarea auto. `input:focus { border-color:#f36c22 !important }` (legacy _yobiUI.less:45-48). Plus `.avatar-wrap.small` (24px), `.item-count-groups`, `.affix`, `issue-list-wrap`, `.issue-option` blocks.
- **F2 harness fixes (committed)**: document-request double-emit dedup (goto), keydown cancelable + preventDefault-respecting synthetic activation (both press paths), evaluateHandle arg serialization, poll().toBeCloseTo, legacy-assets serving (images from yona-original/public + fallback CSS from dist) + mime exemption, auth-aliases sign-in mock.
- **Waves 1-3 (commits 547bc0bf3…125ab4127)**: issues-empty excel/status/mass-update pins + canonicalizers; posts keymap pull-left + labelIds URL + gnbClassName + markdown-editor source; PR list pull-right/two-column-popover/SitePagination classes + canonicalizer scope-menu & rel mapping; milestone edit focus `!important` + canonicalizer stylex style mapping; webhooks/site-admin/history-file F7 deferrals.
- **Known residual cascades**: issues-empty due-date-region canonicalize diff (7 rows); PR sent/populated num-badge & infos-item pins (4 rows); posts board-actrow region (7 rows); milestone edit uploader paste-help span (1 row).
- Dist is gitignored; rebuilds: `VITE_YONA_BASE_PATH=/yona VITE_DISABLE_LEGACY_FALLBACK=1 pnpm exec vite build` in frontend/.

## Phase B — C1 real-mouse bridge (DONE, commit d3e701bd8)

> status: done — 65/87 F3 rows flipped green via the bridge; 22 red reclassified by RedF3Triage (13 F7, 4 C2, rest F5/F6); committed.

Real CSS `:hover`/`:active` require a real mouse; the WTR launcher is Playwright, so expose its mouse to the test page:

1. `frontend/web-test-runner.config.mjs` — replace the `playwrightLauncher({…})` with a `RealMouseLauncher extends PlaywrightLauncher` subclass that `exposeFunction("__wtrRealMouse", …)` after `startSession` (page = `this.activePages.get(sessionId).playwrightPage`; constructor args mirror `playwrightLauncher()` defaults, keeping the chrome channel + viewport context).
2. `frontend/tests/wtr-compat.ts` `Locator.hover()` (line ~1446) — after synthetic dispatch, call the bridge `("move", iframeOffset + elementCenter)` so the real mouse sits over the element and CSS `:hover` matches.
3. `mouse.down()`/`mouse.up()` (line ~1630) — call the bridge `("down"|"up", lastMouseX, lastMouseY)` after the synthetic dispatch.
4. Cleanup — in `runWithPage`'s `finally` (line ~3224): bridge `("move", -5, -5)` off-viewport so `:hover` never leaks.
5. Apply: re-run each F3 spec; hover assertion must flip green. Contingency (pre-decided): a specific test that stays red retires as F4/C2 with a ledger note — never blocks the wave.

## Phase C — C2 retirements + F5/F6 copy fixes (subagent waves, mechanical)

1. **C2** (4 F4 rows): retire the `:hover/:focus/:active` computed-style assertion block with the wave-33 comment.
2. **F5** (46 rows): fix the copy's geometry pin to the measured dist truth where app == legacy (add `// F5 dist-truth`).
3. **F6** (162 rows): wave-33 retained-class flips (absence → retention, 41) + stale-pin fixes to current DOM (121); app gaps → F7.
4. Cadence: 3 agents × 8 specs/wave; affected specs + tsc after each wave; full suite every 2 waves.

## Phase D — bucket-2 app fixes (subagent waves, parity principle; 307 F7 rows)

Grouped batches (assign at triage time; expected from triage evidence):
- **D1 tag-level cascade** — inputs/selects/buttons render UA defaults; port `yona-original/public/bootstrap/css/bootstrap.css:1031-1052` + `_yobiUI.less:15-18,38-43` into `frontend/src/app.css` `@layer legacy`.
- **D2 wrapper-class retention** — `pull-right`, `ybtn`, `gnb-outer project-header`, `page-wrap-outer`, `search-box-wrap` etc. → route TSX class/template retention (667398a04-style).
- **D3 DOM-equivalence screens** — site-admin family, milestone-edit-form, signup, password, email-settings, user-files, posts, loginform, nested-layout shell nodes, fork-form → per-screen audit vs legacy `.scala.html`.
- **D4 dist-geometry-truth** — dist renders ≠ legacy (line-height 18px root, legend, h3/h4/h5, pagination input heights): fix in app.css `@layer legacy` or route stylex.

Per-fix contract: legacy file:line evidence; owning spec green under WTR; frozen `yona-original/**` never modified; no new abstractions; no route DOM escapes. Full suite every 2 waves.

## Phase E — Final sweep + gate (main agent)

1. Full suite parallelized: `--concurrency 4` (config default 2); record serial vs parallel wall time (target <12 min).
2. Gate: `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir frontend test:e2e:stylex-final -- .`
3. Residual = ledger rows only (F8 mirror skips + agreed C2 retirements + documented F7-MATCH rows). Zero unexpected failures.
4. Append final numbers + residual list to this doc and the ledger tail.

## Critical files & anchors

- `frontend/web-test-runner.config.mjs:91` (alert `type`), `:366-388` (launcher + concurrency) — Phase 0 done, Phase B.
- `frontend/tests/wtr-compat.ts:1925` (clock), `:3197` (hook `this`), `:1446` (hover), `:1630` (mouse), `:3224` (runWithPage finally) — Phase 0 done, Phase B.
- `frontend/tests/wtr/{project-pullrequest-edit-form,project-fork-form,project-issues-real-instance-parity,project-issue-detail-parity}.e2e.ts` — Phase 0 anchors (verified).
- `/tmp/fails.json` (Phase A extraction) — triage input (done).
- `docs/provenance/wtr-637-ledger.md` (committed) + this doc — deliverables.

## Verification

- Phase 0: tsc 0; 4 affected specs → 3 green + 2 mirror skips (DONE).
- Phase A: 632 ledger rows == runner failed count; every row has family + disposition + evidence; committed (DONE).
- Phase B: tsc 0; an F3 spec's `:hover` computed-style assertion passes; no new failures in the F3 specs' other tests.
- Phase C/D: each wave's affected specs green; no new failures in the full suite after each 2 waves.
- Phase E: full parallel sweep — residual failures exactly equal the ledger's remaining F8/F4/F7-MATCH rows; gate passes; wall time recorded.

## Assumptions & contingencies

- Hybrid ceiling decision (user): F3 subset gets C1 real-mouse support; everything else C2-retire; geometry triaged against dist.
- All bucket-2 app gaps get fixed; a row where the app actually equals legacy is F5/F6 (copy fix), never F7.
- Verification is WTR-green + `yona-original/` evidence — no PW baseline post-cutover.
- If the C1 bridge fails on a specific test, retire that pin (F4) — pre-decided, no stall.
- The 2 known `Timeout of 30000ms` rows are F2-classified and get re-checked after Phase D (slow-mock artifacts).
- The 3 pre-existing `tests/yona-legacy-parity-gate.test.mjs` contract failures (repo.rs / canonical-migration-crate bucket mappings) are out of scope — separate cleanup.
