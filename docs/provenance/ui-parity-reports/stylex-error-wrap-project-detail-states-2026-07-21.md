# Project detail error-wrap StyleX owner report — 2026-07-21

This wave ownerizes three project detail states:

- issue detail not-found (`ico-err2`)
- pull-request detail forbidden/not-found (`ico-err2`)
- pull-request changes forbidden/not-found (`ico-err2`)

The route-local StyleX owners carry the frozen `.error-wrap` wrapper geometry,
sprite background positioning/size, and message typography from
`yona-original/app/assets/stylesheets/less/_page.less:5230-5236` and
`_sprites.less:488-497`. Legacy classes, DOM, copy, list navigation, and
403/404 branching remain unchanged; the shared `app.css` fallback remains for
other error consumers.

Serial managed Playwright checks passed 3/3 in normal mode and 3/3 with
`VITE_DISABLE_LEGACY_FALLBACK=1`, covering desktop and mobile output. Frontend
check/build, StyleX verification, diff checks, frozen-source checks, and the
turn commit gate are required before landing.
