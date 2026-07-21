# StyleX parity report: commit-detail diff-body layout

Batch 745 ports the commit-detail codediff `.diff-body` layout declarations to
the existing route-local StyleX owner.

Evidence: `yona-original/app/views/code/diff.scala.html:128-145` and frozen
`yona-original/app/assets/stylesheets/less/_page.less:4129-4141`.

The route preserves the `.diff-body` class, diff DOM/order, and selection-driven
block-review behavior. StyleX carries only `position: relative`,
`border-radius: 3px`, and `min-height: 30px`; nested partial-diff rows remain
outside this owner boundary.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px.
