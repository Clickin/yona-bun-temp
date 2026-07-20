# Search-page bridge retirement — 2026-07-20

Batch 568 retires only the standalone `.search-page { color: #333; }` rule from
`frontend/src/app.css`.

Legacy evidence: `yona-original/app/views/search/result.scala.html` includes
`partial_search.scala.html`, whose shell is the historical
`page-wrap-outer > project-page-wrap > row-fluid > span2/span10` structure.
The frozen search views, their LESS/JS import graph, and the current production
TS/TSX routes contain no exact `.search-page` class producer or selector source.
The live search boundaries remain `.search-category-wrap`, `#searchInnerForm`,
`.page-navigation-wrap`, `.lst-stacked`, and the result/list selectors; those
were not changed.

The static contract in `frontend/tests/legacy-fallback-off.e2e.ts` records the
pre-removal selector as the observed RED condition and now requires exact
`.search-page` absence plus no route-level class producer. The existing populated
global-search fixture additionally asserts that StyleX owners remain visible and
that neither `.search-layout` nor `.search-page` appears in the rendered DOM.
The same fixture is run by the managed normal and fallback-off desktop/390px
projects; it checks only the generated-fallback boundary and retained search
owners, not a claim that the global fallback asset can be unlinked.

Frozen legacy files are byte-unchanged. No route implementation or theme variable
was added, and no active search geometry was removed.
