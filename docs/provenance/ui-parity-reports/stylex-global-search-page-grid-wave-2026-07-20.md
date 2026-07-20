# Global search page-grid StyleX wave — 2026-07-20

Batch 572 moves the populated global `/search` page-grid boundary into
route-local StyleX owners while retaining the legacy `row-fluid`, `span2`, and
`span10` tokens for shared fallback/test compatibility.

Legacy `yona-original/app/views/search/result.scala.html` and
`partial_search.scala.html` establish the nested page shell and two-column DOM.
Frozen Bootstrap `bootstrap.css` and `bootstrap-responsive.css` establish the
desktop fluid percentages, `box-sizing`, clearfix behavior, and max-767px
stacking. React owns navigation and query behavior; no legacy DOM script was
copied.

Owners:

- `global-search-grid-row`
- `global-search-category`
- `global-search-results-column`

`stylex-global-search-page-grid.e2e.ts` pins the source contract and owner
bounds at 1366px and 390px. The managed focused batch passes 2/2 in normal mode
and 2/2 with `VITE_DISABLE_LEGACY_FALLBACK=1`. No frozen source, theme,
`app.css`, or generated fallback asset is removed; shared grid fallback remains
for other routes and error states.
