# StyleX parity report: commit-detail diff-body font

Batch 744 ports the commit-detail `.diff-body` monospace font declaration to
the existing route-local StyleX owner.

Evidence: frozen `yona-original/app/assets/stylesheets/less/_page.less:5835-5839`.
The route retains the `.diff-body` class, diff DOM/order, and React selection
handler for the block-review button. Only `font-family: "monospace", Consolas,
Tahoma` moved to StyleX. `.isBinary`, `.btnPop`, and nested partial-diff rules
remain fallback-owned.

The independent focused Playwright contract passes 1/1 in normal and
fallback-disabled modes at desktop and 390px. Chromium reports the quoted
`"monospace", Consolas, Tahoma` computed family exactly.
