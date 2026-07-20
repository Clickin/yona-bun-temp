# Search-keyword fallback-off report

The generic `.keyword` arm is retired from `frontend/src/app.css`.
Global, project, and organization search highlight spans already compose their
route-local StyleX keyword owners. Frozen LESS and generated
`.search-list-wrap strong.keyword` output remain unchanged as legacy evidence;
the frozen selector does not match the current React span output.

The fallback-off static contract checks exact generic-arm absence and all three
route owner/source contracts in normal and `VITE_DISABLE_LEGACY_FALLBACK=1` modes.
