# Organization-home `.small-font` fallback-off report

The organization home route had two live `.small-font` spans: fork-origin metadata
and last-pushed-code metadata. Legacy `_common.less` defines the exact
`font-size: 10px`/`font-weight: normal` declaration. Both consumers now use the
route-local `styles.smallFont` owner while preserving the origin `blue-txt` paint,
DOM order, copy, and links. `frontend/src/app.css` removes only the `.small-font`
arm; frozen LESS and generated fallback CSS remain immutable evidence.

The focused organization-home source/runtime contract covers the legacy values,
route owners, and exact app.css/legacy-class absence. Normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` verification are tracked with the organization
home fallback-off suite.
