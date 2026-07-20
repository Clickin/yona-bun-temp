# Fallback-off parity report: issue-form attachment help

The project issue-form upload attachment-save help now owns its `display:block`
and `text-align:right` declarations in route-local StyleX. The legacy upload
DOM, icon/copy, and attachment behavior remain unchanged; only the route's
`right-txt` token was removed.

Static source ownership and formatting checks pass. The focused Playwright
runtime attempt was unavailable because the managed server could not bind or
connect on `127.0.0.1:3101`; no live browser parity claim is made.
