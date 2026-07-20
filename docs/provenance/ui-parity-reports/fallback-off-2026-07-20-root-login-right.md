# Fallback-off parity report: root login-dialog action row

The root login dialog action row now owns `text-align:right` in its existing
StyleX owner. Legacy action-row DOM, copy, buttons, and login behavior remain
unchanged; only the route's `right-txt` token was removed.

Runtime verification uses `scripts/run-playwright-e2e.mjs` with isolated
dynamic backend/frontend ports.
