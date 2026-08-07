# WTR e2e suite: 637-failure remediation

> status: planned — enters execution after the wave-36 cutover (committed `98bfa308c`); schedule aligned with the pre-release full sweep
> slug: wtr-637-failure-remediation
> date: 2026-08-07

## Goal

Drive the `frontend/tests/wtr/` suite from **2449 passed / 637 failed / 1 skipped**
(859 files) to a fully-triaged state: every failure classified, the actionable
families fixed, and the residual documented with a decision. Parallelize the
final full sweep (`--concurrency N`) as part of the pre-release gate.

## Ground truth (measured at wave 36, `/tmp/w36-suite.log`)

- 637 failed (634 unique test names; counts include multi-line per-test marks).
- Assertion-shape taxonomy (log extraction):
  - `toEqual` ~239 — geometry / computed-value pins (dev-vs-dist drift + dist
    cascade diffs, e.g. tag-level input cascade absent from dist,
    bootstrap.css:1031-1052)
  - `toHaveCSS` ~168 — computed-style pins (CSS `:hover/:focus/:active`
    CDP-only ceiling + dist cascade)
  - `toHaveClass` ~90 / `toContain` ~86 / `toHaveAttribute` ~80 /
    `toMatchObject` ~56 / `poll` ~23 / `toHaveCount` ~28 / `toMatch` ~14
  - 92 test names match `matches legacy … DOM|core DOM|screen DOM` (legacy
    DOM-equivalence family)
  - 243 names match `hover|preserve|geometry|computed|cascade|paint|frozen`
  - small bucket-1 residue: `dialog.type is not a function` (2),
    `Cannot read properties of undefined (reading 'skip')` (2),
    `page.clock.fastForward` (1), `waitForFunction` (1), `value is not
    defined` (1), strict-mode violations (6), `Timeout of` (2)

## Taxonomy (from the wave 16–36 four-bucket discipline)

Every wave verified each conversion per-test against a fresh PW baseline, so
the families below are PW-verified, not inferred:

1. **Bucket-2 app parity gaps (PW fails identically) — the largest family.**
   Real app-vs-legacy deviations accumulated during the StyleX migration,
   surfaced at full-suite scale. Examples (evidence in wave commits):
   tag-level input cascade absent from dist (bootstrap.css:1031-1052,
   _yobiUI.less:15-18/38-43), upload-progress wrapper lost `pull-right`
   (fileUploader.scala.html:31), subtask/milestone bars full-width vs legacy %
   (partial_list_subtask.scala.html:18, partial_status.scala.html:46),
   ui-kit login-dialog `.error` clobbered by stylex spread
   (loginDialog.scala.html:38), rightMenu +10px offset
   (_page.less:7148, issueform.tsx:3593), site-admin/signup/password
   DOM-equivalence family.
2. **WTR-environment ceilings (PW passes, WTR cannot)** — CSS
   `:hover/:focus/:active` computed-style synthesis (CDP-only; PW forces
   pseudo-classes), dev-vs-dist geometry/@layer drift (WTR mounts the dist
   production build; PW baselines ran the dev server).
3. **Bucket-1 harness residue (small)** — `dialog.type()`, a few
   `waitForFunction`/`toBeFocused`/`clock`/strict-mode cases; fixable in
   `frontend/tests/wtr-compat.ts`.
4. **Mirror backend down** — mirror-profile specs `test.skip` in both
   runners; skip-as-fail MATCH, resolves when the mirror is reachable.

## Phases

### Phase A — Triage (subagents, 1 wave)
Build a per-spec failure ledger for all 637: spec → failing test → family
(1/2/3/4) → evidence (legacy source line for bucket-2, error kind for
bucket-1, exact pin for bucket-3). Inputs: `/tmp/w36-suite.log` extraction +
wave 16–36 per-spec reports (`agent://WtrWave*`). Output: committed ledger in
`docs/provenance/wtr-637-ledger.md` + per-family counts. No code changes.

### Phase B — Bucket-1 harness patches (main, one batch)
Fix the small residue in `wtr-compat.ts`:
`dialog.type()` facade, `waitForFunction` polling edge cases, `toBeFocused`
semantics, `clock.fastForward`, `Cannot read …'skip'` guard. Re-run affected
specs; expect a handful of green flips.

### Phase C — WTR-ceiling decision (per family, with user sign-off)
For each ceiling family choose one of:
- **(C1) CDP-backed pseudo-state synthesis** — add a CDP/`page._client`-style
  force-`:hover/:focus/:active` hook so computed-style pins become meaningful.
  Highest fidelity; most work; WTR runs via `@web/test-runner-playwright`
  (CDP available).
- **(C2) Retire the assertion in copies** — precedent: `data-style-src`
  retirement + wave-33 `:hover` block retirements. Acceptable where the pin
  is redundant with base-state paint + geometry.
- **(C3) Standardize geometry baselines on dist** — triage PW baselines
  against the dist preview (not the dev server) so dev-vs-dist drift stops
  being a two-runner delta; fix the app where dist is genuinely wrong.

Default recommendation: C3 for all dev-vs-dist geometry, C1 for
`:hover/:focus/:active` paint pins that are the sole coverage of a legacy
interaction state, C2 for redundant pins.

### Phase D — Bucket-2 app-fix batches (subagents, parity principle)
Fix the app where it deviates from `yona-original/`, keeping legacy DOM/copy
verbatim (667398a04-style restores; frozen files untouched). Batch by family
(tag cascade, bar widths, wrapper classes, DOM-equivalence screens), each fix
evidenced with the legacy source line + the owning spec going green.
Screens where the app is already parity-correct stay bucket-2 MATCH with
their evidence (documented residual, not silent).

### Phase E — Final sweep + gate (main, escalated)
1. Full suite with `--concurrency N` (measured serial ~34 min; target
   <10 min).
2. Gate: `pnpm --config.store-dir=/Users/senghyunjo/.pnpm-store --dir
   frontend test:e2e:stylex-final -- .`
3. Expected end state: 0 unexpected failures; remaining = documented
   residuals (mirror skips, agreed C2 retirements) with ledger entries.

## Definition of Done

- Ledger committed with all 637 rows (family + evidence + disposition).
- Bucket-1 residue fixed (Phase B) and WTR-green.
- Every bucket-2 family either app-fixed (spec green) or documented MATCH
  with legacy evidence.
- Ceiling families resolved via C1/C2/C3 decision, recorded per family.
- Full suite green under the parallelized sweep; gate passes; residuals
  counted and ledgered.
- This plan doc + ledger appended to the migration narrative.

## Deferred scope

- Playwright-side re-verification is not part of the remediation (the PW
  set is deleted; parity principle is enforced by app-side evidence).
- Mirror-profile real-instance runs (backend down) — blocked until
  `192.168.45.20` is reachable.
- The 3 pre-existing `yona-legacy-parity-gate.test.mjs` contract failures
  (repo.rs / canonical-migration-crate bucket mappings) — separate clean-up,
  not e2e scope.

## Verification

- Phase A: ledger counts sum to 637 and match the log extraction.
- Phase B: tsc 0 + affected specs green.
- Phase D: each fix's owning spec green under WTR; no new failures in the
  full suite.
- Phase E: `test:e2e:stylex-final` gate pass; wall-clock recorded before/after
  `--concurrency`.
