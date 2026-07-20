# Project post right-menu parity — 2026-07-20

The board post detail sidebar now preserves the legacy `act-row right-menu-icons`
wrapper used by `yona-original/app/views/board/view.scala.html` and the matching
issue detail template. The prior React output omitted `act-row`, which made the
post right rail structurally differ from the issue right rail.

`frontend/tests/project-post-detail-right-menu.e2e.ts` covers the edit/delete
actions, desktop rail containment, mobile rail hiding, and `#comment-1` target.
No frozen source or shared CSS was changed. The existing legacy icon rules remain
fallback-owned outside this bounded structural parity correction.
