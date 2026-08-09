---
title: StyleX fallback baseline
kind: baseline
status: active
updated: 2026-08-09
---

# StyleX and fallback baseline

## Runtime facts

| Item | Current state | Exit condition |
| --- | --- | --- |
| `frontend/src/main.tsx` | imports `./app.css` | import points to the final global foundation only |
| `frontend/src/app.css` | 5,247-line `@layer legacy` bridge | no app-owned selectors remain |
| generated fallback | `legacy-fallback.css` + manifest, hash checked | remains evidence-only and is not loaded in release runtime |
| Select2 | React renders Select2-compatible DOM; legacy selector family remains active | all React-owned Select2 states have StyleX owners and focused fallback-off coverage |
| F7 residuals | non-zero in the current ledger | zero, with every other item reclassified or fixed |
| final profile | not yet run green | `stylex-final`, build verifier, Scala audit, and full fallback-off suite green |

## WTR runner boundary

The active parity runner is WTR with `@web/test-runner-chrome`. `Page`,
`Locator`, and `Route` are the local facade in `frontend/tests/wtr-compat.ts`;
WTR specs do not import Playwright packages or depend on `PW_CHANNEL`. The
legacy localhost seeding, route discovery, and the real-data sweep use the
same `scripts/wtr-browser.mjs` WTR system-Chrome adapter. This runner boundary
does not change the fallback exit conditions.

## Classification

Each `app.css` rule belongs to exactly one migration disposition for the active
wave:

- `migrated`: a recorded React/StyleX owner reproduces the frozen legacy value
  and the focused fallback-off WTR proves the screen state;
- `unavoidable`: only true global foundation or `@font-face` material that
  cannot be represented by the current StyleX boundary; each rule needs a
  source citation;
- `retired`: no React emitter or runtime consumer remains and the corresponding
  focused/source audit proves removal is safe;
- `gap`: the selector is still needed because a React screen or state differs;
  it must have an F7 ledger row and follow-up owner.

The current file is therefore not “all migrated”: many selectors are existing
legacy fallback arms for screens that already have partial StyleX ownership,
and some Select2/plugin selectors are still active. Do not delete a rule merely
because a nearby component has a StyleX file.

## Frozen evidence

The values must be traced to:

- `yona-original/app/assets/stylesheets/yobi.less` and its imports;
- `yona-original/public/bootstrap/css/bootstrap.css`;
- `yona-original/public/bootstrap/css/bootstrap-responsive.css`;
- the relevant Scala view/partial and legacy plugin stylesheet.

The frozen files are never edited. React-owned plugin replacements may scope an
unchanged legacy rule to a `data-stylex-owner`, with the source selector and
focused test recorded in provenance.

## Final conversion gate

Only after F7 residuals reach zero and the final parity profile is green should
`app.css` be replaced by the minimal `global.css`. That change must update the
main entrypoint, build manifest, StyleX foundation contract, design harness,
and source assertions in one verified change.
