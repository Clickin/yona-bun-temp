# StyleX parity report: commit-detail Git metadata

Batch 756 owns the authenticated Git commit metadata emitted by
`yona-original/app/views/code/diff.scala.html:50-84`.

Frozen declarations are taken from `_page.less:4598-4610` and variables
`_variables.less:13,28,108`: author float/top margin, ago left margin/color,
avatar right margin, commit-id wrapper padding, and commit-id secondary color,
top margin, and fixed font (`Consolas`, `Menlo`, `Monaco`, `Ubuntu Mono`,
`source-code-pro`, monospace).

The React route owns these through `commit-detail-author`,
`commit-detail-author-ago`, `commit-detail-author-avatar`,
`commit-detail-id-wrap`, and `commit-detail-id`. Legacy classes and visible
copy/link behavior remain in place. The browser serializes the fixed font
family without quotes around `source-code-pro`; the test records that computed
form while the StyleX declaration preserves the frozen source value.

`commitMsg-wrap` is intentionally not emitted: its legacy fallback arm was
retired in the preceding commit-message wave. SVN metadata and unrelated
fallback consumers are excluded from this batch.

`frontend/tests/project-code-commit-detail.e2e.ts` passes the focused contract
in normal and fallback-disabled modes, 1/1 each, at desktop and 390px widths.
