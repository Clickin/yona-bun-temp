# Fallback-off parity report: label dialogs and new PR conflict modal

Wave 643 moves the issue-label dialog fields/actions and new pull-request
conflict message/actions from the frozen `.center-txt` utility to route-local
StyleX owners. Dialog DOM, button classes, `mt20 mb20` spacing, copy, and React
interaction remain unchanged.

Static source contracts and typecheck pass. Live browser replay was attempted
but the managed local server on port 3101 was unavailable; no live parity claim
is made. Frozen LESS/CSS and generated fallback assets were not modified.
