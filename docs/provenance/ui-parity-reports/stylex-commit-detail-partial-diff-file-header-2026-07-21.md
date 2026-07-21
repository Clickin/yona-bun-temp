# StyleX parity report: commit-detail partial diff file header

Batch 747 ports the bounded partial-filediff file-header declarations to the
commit-detail route-local StyleX owners.

Evidence: `yona-original/app/views/partial_filediff.scala.html:154-156` and
frozen `yona-original/app/assets/stylesheets/less/_page.less:5929-5948`.

The route preserves the legacy `diff-partial-file`/`filename` DOM, classes,
filename copy, commit Link targets, and diff behavior. StyleX carries only the
exact header padding, weight, overflow, whitespace, word-break, margin, filename
color, and font-size declarations. Commit-id, utility, comments, range/color, and
other partial-diff declarations remain fallback-owned.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px.
