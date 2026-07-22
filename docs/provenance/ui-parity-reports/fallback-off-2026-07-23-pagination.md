# Pagination fallback bridge retirement — 2026-07-23

Batch 832 retires only the React-side `.page-navigation-wrap` bridge from
`frontend/src/app.css`. The generated `frontend/public/legacy-assets/stylesheets/legacy-fallback.css`
continues to retain the frozen legacy declarations for the historical output.

## Exact boundary

Removed from `app.css`:

- `.page-navigation-wrap`: `clear`, `width`, `margin`, and `text-align`
- `.page-navigation-wrap .page-nums`: display, reset spacing, font-size, and list-style
- `.page-navigation-wrap .page-num`: display, horizontal padding, color, and font-size
- `.page-navigation-wrap .input-mini`: width and margin

The current direct legacy-class consumer graph remains explicit and route-local
StyleX-owned through nine stable pagination owner markers in the project,
organization, global-search, and user-issues route files. Other pagination
consumers use colocated/shared StyleX owners and do not emit the retired
selector.

## Legacy retention and verification

The frozen evidence remains `yona-original/app/assets/stylesheets/yobi.less`
and its `_common.less:50-101`, `_sprites.less:1-5,97-119`,
`_page.less:7442-7444`, and `_responsive.less` import chain. The static
fallback-off contract in `frontend/tests/legacy-fallback-off.e2e.ts` checks
that all four React bridge selectors are absent from `app.css`, present in the
generated fallback, and backed by every direct consumer.

The approved Yoram footer identity/provider/developer-contact/repository
changes remain intentional user-authored differences and are not restored or
classified as pagination parity gaps. Live legacy populated rendering remains
unavailable where already recorded by the route-focused pagination evidence.
