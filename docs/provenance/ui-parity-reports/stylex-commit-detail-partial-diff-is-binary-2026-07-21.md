# StyleX parity report: commit-detail partial diff file-mode binary row

Batch 749 ports the emitted partial-filediff `.isBinary` declarations to a
commit-detail route-local StyleX owner.

Evidence: `yona-original/app/views/partial_filediff.scala.html:40,192` and
frozen `yona-original/app/assets/stylesheets/less/_page.less:5838`.

The route preserves the file-mode row element/class, message copy, line-number
DOM, and error/no-change behavior. StyleX carries only the frozen `#bbb` color,
`-1px -1px #fff` text shadow, and `5px 10px` padding. The canonical partial
Scala template does not emit `diff-partial-utility`, so that selector remains
deferred; btnPop, outer/meta, comments, ranges/colors, and unrelated `.isBinary`
consumers remain fallback-owned.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px.
