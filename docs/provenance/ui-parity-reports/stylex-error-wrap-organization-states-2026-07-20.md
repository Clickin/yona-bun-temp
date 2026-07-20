# Organization error-wrap StyleX owner report — 2026-07-20

This wave ownerizes three organization empty states:

- boards with no posts (`ico-err1`)
- issues with no issues (`ico-err1`)
- pull requests with no pull requests (`ico-err1`)

The existing route-local StyleX modules now carry the frozen `.error-wrap`
padding/centering, sprite background/position/size, and message typography from
`_page.less:5230-5236` and the frozen icon rules. Legacy classes, DOM, and copy
remain unchanged. Shared parent/list fallback remains active for unrelated
consumers and fallback-only parent geometry.

Focused managed Playwright checks pass in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes for all three owners at desktop and
mobile viewports. Frontend check/build and the turn commit gate are required
before landing.
