# Project search page-grid StyleX wave — 2026-07-20

Batch 573 moves the populated `/$ownerName/$projectName/search` two-column
page-grid into route-local StyleX owners. Frozen search partials preserve the
nested `row-fluid > span2/span10` DOM; Bootstrap desktop percentages,
`box-sizing`, and max-767px stacking remain the geometry source of truth.

Owners are `project-search-page-grid-row`,
`project-search-page-grid-category-column`, and
`project-search-page-grid-results-column`. Raw grid tokens remain for shared
fallback and legacy-compatible selectors. `stylex-project-search.e2e.ts`
passes 2/2 in normal mode and 2/2 with `VITE_DISABLE_LEGACY_FALLBACK=1`,
covering populated issue results, links, computed declarations, and desktop/
390px stacking. No frozen source, theme, app.css, or generated fallback asset is
removed.
