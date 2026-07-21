# StyleX parity report: issue-comment parent action row

Batch 773 owns the parent issue-comment action row emitted by
`yona-original/app/views/issue/partial_comment.scala.html:46`.

The frozen Bootstrap declaration at
`yona-original/public/bootstrap/css/bootstrap.css:6093-6098` is
`.pull-right { float: right; }`. The React route preserves `act-row
pull-right`, all action children, order, copy, and behavior while the
`commentActionRow` StyleX owner supplies the same float. Child comment rows,
attachment `.pull-left`, and unrelated route consumers remain fallback-owned.

`frontend/tests/project-issue-detail.e2e.ts` verifies legacy source/import
evidence, the stable owner and exact declaration, computed float, no inline
style, direct parent scope/order/visibility, and parent-row containment at
desktop and 390px. Normal and fallback-disabled runs each pass 1/1. Frozen
`yona-original/**` is unchanged.
