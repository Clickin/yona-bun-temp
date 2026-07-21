# StyleX parity report: issue-comment parent actions

Batch 772 owns the parent issue-comment edit/delete action spacing emitted by
`yona-original/app/views/issue/partial_comment.scala.html:99,103`.

The frozen `_common.less:206,216` declarations are `margin-left:10px` for
`.ml10` and `margin-left:6px` for `.ml6`; `yobi.less` imports `_common.less`.
The React route keeps the parent buttons, titles, comment identity, order, and
React edit/delete interactions, with `commentActionEdit` and
`commentActionDelete` StyleX owners. Translation and child-comment controls
are excluded and remain separately owned.

`frontend/tests/project-issue-detail.e2e.ts` verifies the source/import
mapping, stable owner markers, no inline styles, computed 10px/6px margins,
direct parent-row scope/order, and interaction contracts. Owner-focused normal
and fallback-disabled runs each pass 2/2. A broader four-test run passed the
two new owner assertions but retained two unrelated existing geometry failures
in the edit-form and delete-modal metric expectations. Frozen `yona-original/**`
is unchanged.
