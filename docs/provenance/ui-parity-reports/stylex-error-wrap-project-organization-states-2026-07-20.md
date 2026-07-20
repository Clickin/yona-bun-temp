# Project and organization error-wrap StyleX owner report — 2026-07-20

This wave ownerizes three remaining React error states:

- project issue list with no issues (`ico-err1`)
- project pull-request list with no pull requests (`ico-err1`)
- organization members forbidden state (`ico-err2`)

The organization forbidden output is sourced from
`yona-original/app/views/error/forbidden_organization.scala.html`; the member
screen supplies the route state that reaches that legacy template.

The route-local StyleX owners carry the frozen `.error-wrap` wrapper geometry,
sprite background positioning/size, and message typography from
`yona-original/app/assets/stylesheets/less/_page.less:5230-5236` and
`_sprites.less:488-497`. Legacy classes, DOM, and copy remain unchanged; the
shared `app.css` fallback remains for other error consumers.

Focused managed Playwright checks passed 3/3 in normal mode and 3/3 with
`VITE_DISABLE_LEGACY_FALLBACK=1`, covering desktop and mobile output. Frontend
check/build, StyleX verification, diff checks, frozen-source checks, and the
turn commit gate are required before landing.
