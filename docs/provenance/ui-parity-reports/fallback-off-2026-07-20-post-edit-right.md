# Fallback-off parity report: post edit upload help

The post edit form upload attachment-save help now owns `text-align:right` in
route-local StyleX. Legacy upload DOM, copy, and interaction remain unchanged;
only the route's `right-txt` token was removed.

Static source ownership checks pass. Runtime Playwright is run through
`scripts/run-playwright-e2e.mjs`, which assigns dynamic backend/frontend ports
and avoids stale fixed-port processes.
