# fallback-off global-run report — 2026-08-19: single global baseline merge

Status: completed (Stage A of the DOM-Parity Fast Lane pivot,
`docs/provenance/tailwind-dom-parity-pivot.md`).

## What changed

`legacy-fallback.css` (frozen bootstrap 2.3.1 + usermenu + yobi, sha256
`754ff3b616156208c215c1ff49503d4afc450977ac9206d01297fe9217bd14cd`) was merged
verbatim into `frontend/src/app.css` between the
`/* BEGIN merged frozen legacy-fallback (sha256:…) */` / `/* END */` markers
(before the hand-curated `@layer legacy` block), and the runtime
`<link rel="stylesheet" … legacy-fallback.css>` was removed from
`frontend/index.html`. The public runtime stylesheet is deleted; the manifest
moved to `docs/provenance/legacy-css-merged.manifest.json` with
`{"runtime": false, "mergedInto": "frontend/src/app.css"}`. url() assets were
relocated SHA-aware into `src/assets/legacy/**`. `VITE_DISABLE_LEGACY_FALLBACK`
was removed from every code path — fallback-off mode is now the only mode
(because the fallback content IS the runtime stylesheet).

## Global-run evidence (Chrome/WTR, full suite)

- Pre-merge baseline run (`WTR_METRICS=1`, `WTR_SHARDS=2`,
  commit `d047ec595`): **861 files, 3051 tests, 2924 passed / 127 failed**,
  wall clock 52 min (3,123,849 ms). Per-spec snapshot:
  `.agent/baseline/wtr-baseline.json` (gitignored, local).
- Post-merge run (same command): **861 files, 1099+… passed / 231 failed** —
  the 231 included 82 module-import failures caused by the spec sweep
  (missing `mergedLegacyBlock`/`curatedAppCss` imports, circular local
  helpers) and the `not.toContain` bridge-retirement family whose "app.css"
  semantics needed the merged-block-excluded view. All import failures were
  fixed (import wiring + helper repairs); the `not.toContain` family now uses
  `curatedAppCss()` (= pre-merge app.css semantics: whole file minus the
  merged block).
- Final post-merge gate run: `mt1ipwg4-26975` — 861 files, 2 shards, wall
  3,672,074 ms, **NEW FAILURES: 0** (baseline-pass → now-fail), 68 recovered
  (baseline-fail → now-pass), 58 still-failing = baseline-known. The
  intervening ~12 gate runs each surfaced 1–5 load-sensitive harness flakes
  (render-timing under 2-shard CPU load); every surfaced flake was either a
  deterministic race fixed at root (placeholder-shown computed-color pins,
  css asset hash re-pin, usermenu hydration race, board-labels hydration
  race, focus/hover transition polls, subpixel width compares, stale
  fallback-path reads) or a spec-wiring repair (`curatedAppCss`/
  `mergedLegacyBlock` import + read-form conversions, fallback read-as-path
  bugs). The final gate is green: post-merge failures ⊆ baseline failures.

## Semantic cascade gate

`node scripts/css-cascade.mjs` (HEAD vs `docs/provenance/css-cascade-baseline.json`):
**diff 0** — effective layer order `homeb → legacy → theme → utilities`,
9239 rules, 25 buckets, 2 font-faces, 16 keyframes, url resource identities
byte-equal (query/fragment preserved). Baseline regenerable via
`node scripts/css-cascade.mjs --regen <pre-merge-ref>`.

## Production build

`pnpm --dir frontend build` green (15s). `dist/index.html` contains no
legacy-fallback reference; merged assets are fingerprinted (`glyphicons-*`,
`yobicon-*`, `material-icon.*`) or inlined as data URIs (<4KB); the
intentionally-broken `fonts/material-icon..ttf` typo reference stays broken
exactly like pre-merge (no build error, runtime 404 parity).

## Remaining scope

- Public `legacy-assets/**` GC deferred (copy/reuse only this stage).
- Real-instance probes and geometry/computed-style checks stay in the chrome
  lane per the 3-contract model.
