# Fallback-off parity report: milestone action rows

Wave 640 moves the milestone create and edit action-row consumers of the
frozen `.right-txt` utility to existing route-local StyleX owners. Both rows
retain the legacy `actrow` wrapper, button/link order, and form behavior while
StyleX supplies `text-align: right`.

Static source contracts, typecheck, and production build pass. Live browser
replay was not available because the managed local server on port 3101 was
unreachable; no live parity claim is made. Frozen LESS/CSS and generated
fallback assets were not modified.
