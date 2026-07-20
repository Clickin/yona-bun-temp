# Fallback-off project issues row bridge — 2026-07-20

Batch 584 removes the unreachable
`.issue-list-page .issue-item-row { display: block; margin: 0; }` block from
`frontend/src/app.css`. Current project and milestone issue rows emit the
`issue-item-row` class without an `issue-list-page` ancestor; the frozen LESS
`label.issue-item-row` rule is not a matching selector for the React `<div>`
rows, and the removed declarations equal the `<div>` defaults.

The focused project-issues static contract and bounded fallback-off contract
each pass 1/1. The fallback-off discovery contract also observes zero
`legacy-assets/stylesheets/legacy-fallback.css` links. No TSX, frozen source,
generated fallback CSS, or geometry baseline changed.
