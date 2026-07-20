# Organization search page-grid StyleX wave — 2026-07-20

Batch 574 moves the populated `/organizations/$organizationName/search`
two-column page-grid into route-local StyleX owners. Frozen search partials and
Bootstrap rules establish the `row-fluid > span2/span10` DOM, desktop fluid
ratios, box sizing, and max-767px stacking.

The route now owns `organization-search-grid-row`, the category column, and the
content column while retaining raw grid classes for shared fallback. The
focused organization search contract passes 3/3 in normal mode and 3/3 with
`VITE_DISABLE_LEGACY_FALLBACK=1` at desktop and 390px. No frozen source, theme,
app.css, or generated fallback asset is removed.
