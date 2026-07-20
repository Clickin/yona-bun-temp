# React `.error-wrap` Fallback Retirement — 2026-07-21

Batch 671 retires the React-side `.error-wrap` bridge from `frontend/src/app.css`.
This is a bounded shared-fallback retirement after the reachable consumer graph
was proven, not a change to the frozen legacy stylesheet.

## Retired bridge

Removed only these `app.css` blocks:

- `.error-wrap`
- `.error-wrap .ico`
- `.error-wrap .ico-err1`
- `.error-wrap .ico-err2`
- `.error-wrap p`

The reset-password-specific `.ico-404`, page-wrap, and button rules remain.
The generated `frontend/public/legacy-assets/stylesheets/legacy-fallback.css`
and frozen `yona-original` sources remain unchanged.

## Consumer graph

The focused proof enumerates the 29 reachable route/owner groups covering
secret, project members/internal error/reviews/posts/issues/code/milestones/
pull requests/search/webhooks, public profile, current-user issues, shared
search, root not-found, organization lists/search, and reset-password. Each
reachable emitter has a stable `data-stylex-owner` or `data-stylex-part`.

The only remaining plain `.error-wrap` producer is
`ProjectPostEditNotFoundBody` in `post/$postNumber.tsx`; source inspection
shows it is unreachable and it is explicitly excluded from the graph. It was
not changed or counted as a visible migrated state.

## Frozen evidence and verification

- Frozen declarations: `_page.less:5230-5236`, `_sprites.less:488-497`,
  the complete `yobi.less` import chain, and Bootstrap.
- `frontend/tests/stylex-error-wrap-fallback-retirement.e2e.ts` asserts exact
  selector removal, retained reset-password selectors, frozen/generated
  fallback presence, owner graph, and source mappings.
- Normal dynamic-port run: 2/2 passed.
- `VITE_DISABLE_LEGACY_FALLBACK=1` dynamic-port run: 2/2 passed.
- Frozen SHA-1 integrity, typecheck, oxfmt, and `git diff --check` passed.
