# StyleX parity report: commit-detail inline comment row and cell

Batch 751 ports the emitted partial-diff inline comment row/cell declarations to
commit-detail route-local StyleX owners.

Evidence: `yona-original/app/views/partial_diff_line.scala.html:24-32` and
frozen `yona-original/app/assets/stylesheets/less/_page.less:5995-6012`.

The route preserves the `tr.comments`/`td` DOM, classes, `show-comments` table
visibility, thread copy, and fold interaction. StyleX carries only the frozen
row `display: table-row` and cell `padding: 0px`. Nested comment `li` width,
non-emitted utility/comment-box selectors, ranges/colors, and unrelated comments
remain fallback-owned.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px.
