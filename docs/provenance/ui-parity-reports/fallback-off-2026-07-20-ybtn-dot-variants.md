# Fallback-off report: dead `.ybtn` dot variants

Batch 593 retires only the React-side `.ybtn.primary` and `.ybtn.danger`
blocks from `frontend/src/app.css`. Current React routes use the generic
`.ybtn` class and hyphenated `.ybtn-primary`/`.ybtn-danger` variants; repository
inventory found no dot-variant consumer in current React, frozen Scala, or
legacy JavaScript. The generic and hyphenated declarations remain in app.css,
where present (the `.ybtn-danger` class remains an active consumer even though
its paint is supplied by the generic/frozen cascade), and frozen legacy
CSS/generated fallback assets are unchanged.

The formal `legacy-fallback-off.e2e.ts` static contract asserts exact absence
of both dot variants and retention of the generic `.ybtn` and primary
hyphenated Yobi selectors. The contract is run in both normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. This bounded cleanup does not claim
global fallback discovery completion.
