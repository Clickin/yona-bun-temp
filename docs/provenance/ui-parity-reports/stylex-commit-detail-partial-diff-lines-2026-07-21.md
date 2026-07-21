# StyleX parity report: commit-detail partial diff rows and cells

Batch 746 ports the bounded partial-filediff row/cell declarations to the
commit-detail route-local StyleX owner.

Evidence: `yona-original/app/views/partial_diff_line.scala.html:26-36`,
`yona-original/app/views/partial_filediff.scala.html:40,57`, and frozen
`yona-original/app/assets/stylesheets/less/_page.less:5907-5953`.

The route preserves the legacy `linenum`, `line-number`, `code`, and
`diff-partial-codeline` classes, DOM order, comments, range behavior, and React
selection/comment interaction. StyleX carries only the exact text, border,
dimension, spacing, and code-line declarations for these owners. Outer file/meta,
comments, range colors, and other nested partial-diff declarations remain
fallback-owned and are separate scope.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px.
