# Fallback-off sidebar refresh-button bridge — 2026-07-20

## Scope

This wave removes the unreachable sidebar refresh plugin bridge from
`frontend/src/app.css`:

- `.sidebar .nav-tabs li > .refresh-button`
- `.sidebar .refresh-button:hover`
- `.sidebar .refresh-button:focus`

Legacy `yona-original/app/views/sidebar.scala.html` emitted the
`yobicon-refresh refresh-button` icon and bound the class through legacy JS.
Current React owns the interaction with a typed refresh button and
`leftSidebarTabStyles.refreshButton`; no hyphenated `refresh-button` emitter
remains. Generic and active sidebar tab rules, frozen CSS, and generated
fallback assets remain unchanged.

## Evidence

The formal `legacy-fallback-off.e2e.ts` contract asserts exact selector absence,
retained sidebar tab rules, and React StyleX ownership in normal and
fallback-off modes. The removed selectors matched no current React DOM, so no
screenshot or geometry baseline changed.

Global fallback discovery remains incomplete/non-green.
