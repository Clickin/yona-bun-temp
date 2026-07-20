# Pull-request left-text fallback-off report

The single runtime `.left-txt` consumer is retired from the pull-request detail
author row. Route-local `styles.author` now owns `text-align: left`; author-info
DOM, margin, and behavior remain unchanged. Frozen `_common.less` and generated
fallback CSS remain immutable evidence.

The static normal/fallback-off ownership contracts cover exact app.css and runtime
class absence (1/1 each). The pull-request detail residual suite also checks computed
left alignment at desktop and mobile viewports, but its browser replay was blocked by
`ERR_CONNECTION_REFUSED` at `127.0.0.1:3101`; no visual parity claim is made for that
replay.
