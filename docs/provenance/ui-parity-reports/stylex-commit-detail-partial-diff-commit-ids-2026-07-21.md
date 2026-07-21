# StyleX parity report: commit-detail partial diff commit IDs

Batch 748 ports the bounded partial-filediff commit-id declarations to the
commit-detail route-local StyleX owners.

Evidence: `yona-original/app/views/partial_filediff.scala.html:136-153` and
frozen `yona-original/app/assets/stylesheets/less/_page.less:5852-5862`.

The route preserves the legacy commit wrapper/cell DOM and classes, shortened
IDs, fallback nbsp arms, Link targets/titles/targets, and existing diff behavior.
StyleX carries only the exact float, padding, weight, border, width, and alignment
declarations. File header, utility, comments, range/color, and other
partial-diff declarations remain fallback-owned.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px.
