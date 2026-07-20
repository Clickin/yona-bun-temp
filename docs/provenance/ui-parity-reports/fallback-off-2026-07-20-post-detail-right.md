# Fallback-off parity report: project post detail alignment

The populated project post detail route now owns board/comment/upload/update
action alignment in route-local StyleX. Legacy DOM, copy, and interactions are
unchanged; only route-local `right-txt` tokens were removed.

Static source ownership and formatting checks pass. The focused Playwright
runtime replay requires the managed server on `127.0.0.1:3101`; if unavailable,
the run is recorded as an environment limitation rather than a live parity
claim.
