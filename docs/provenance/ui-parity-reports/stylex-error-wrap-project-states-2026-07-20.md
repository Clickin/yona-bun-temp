# Project error-wrap StyleX owner report — 2026-07-20

This wave ownerizes three existing project states:

- reviews with no review threads (`ico-err1`)
- posts with no posts (`ico-err1`)
- members authorization failure (`ico-err2`)

Each route keeps the frozen `.error-wrap`, `.ico`, and message classes and
copy, while colocated StyleX owns the exact wrapper padding/centering, sprite
background/position/size, and message typography from `_page.less:5230-5236`
and the frozen icon rules. The sprite is imported from the existing legacy
asset module. The shared `app.css` fallback remains because other error states
still consume the family.

Focused managed Playwright checks pass in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes for all three owners at desktop and
mobile viewports. Typecheck and the turn commit gate are required before
landing.
