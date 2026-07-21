# StyleX parity report: issue-comment parent attachments

Batch 774 owns the authenticated parent issue-comment attachment wrapper
emitted by `yona-original/app/views/issue/partial_comment.scala.html:113`.

The frozen Bootstrap declaration at
`yona-original/public/bootstrap/css/bootstrap.css:6093-6098` is
`.pull-left { float: left; }`. The React route preserves the
`attachments pull-left` wrapper, `data-attachments` payload, AttachedFiles
DOM/order, empty/populated behavior, and download links while
`commentAttachments` supplies the same float through StyleX. Issue-level
attachments, edit-form files, child-comment consumers, and broad fallback are
excluded.

`frontend/tests/project-issue-detail.e2e.ts` verifies legacy source/import
evidence, stable owner/declaration, computed float, no inline style, direct
parent scope, attachment content/order/download behavior, and horizontal
containment at desktop and 390px. Normal and fallback-disabled runs each pass
2/2. Frozen `yona-original/**` is unchanged.
