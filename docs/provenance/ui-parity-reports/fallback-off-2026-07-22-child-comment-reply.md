# Child comment reply float parity — Batch 775

- Legacy output: `yona-original/app/views/common/childComments.scala.html:60`
  emits the `add-a-comment pull-right` reply control with the legacy reply
  copy/order.
- Frozen declaration: `yona-original/public/bootstrap/css/bootstrap.css:6093-6098`
  defines `.pull-right { float: right; }`.
- React owner: `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx`
  uses `styles.childCommentReply` from the route-local StyleX module and keeps
  the legacy classes plus existing toggle/focus and child-form behavior.
- Scope: parent action rows, parent attachments, child content/delete, and
  broad fallback consumers are excluded. The legacy child-comments template
  has no attachment wrapper, so no child attachment owner was added.
- Proof: focused Playwright passed 1/1 in normal mode and 1/1 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering source/import mapping, owner and
  declaration, computed `float:right`, no inline style, child scope, and
  desktop/390px containment. The adjacent existing reply-focus test remains
  the interaction/focus proof.
- Frozen `yona-original/**` sources remained unchanged.
