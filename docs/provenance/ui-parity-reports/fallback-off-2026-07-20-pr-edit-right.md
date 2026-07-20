# Fallback-off parity report: pull-request edit upload help

The pull-request edit form upload attachment-save help now owns
`text-align:right` in route-local StyleX. Legacy upload DOM, copy, and
interaction remain unchanged; only the route's `right-txt` token was removed.

Runtime verification uses `scripts/run-playwright-e2e.mjs` so backend and
frontend receive isolated dynamic ports rather than stale fixed-port processes.
