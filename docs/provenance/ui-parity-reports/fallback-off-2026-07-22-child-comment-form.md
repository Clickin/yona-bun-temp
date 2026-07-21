# Authorized child comment form parity — Batch 777

- Legacy output: `yona-original/app/views/common/child_commentForm.scala.html:17-27`
  emits the authorized form, hidden parent id, textarea, OK submit, and
  notification receiver; `yona-original/app/views/common/childComments.scala.html:70-74`
  supplies the `.child-comment-input-form` wrapper.
- Frozen declarations: `yona-original/app/assets/stylesheets/less/_page.less:3107-3123`,
  imported through `yona-original/app/assets/stylesheets/yobi.less`, define
  wrapper `display:none`, textarea margin/border/radius/resize/overflow/padding,
  and submit `display:inline-block`.
- React ownership: the route preserves form action/encoding, parent id,
  field names, placeholder, copy/order, notification receiver, focus/Escape
  behavior, and legacy classes while StyleX owns
  `childCommentFormHidden`, `childCommentFormVisible`,
  `childCommentFormTextarea`, and `childCommentFormSubmit`.
- Proof: combined focused child-reply tests passed 3/3 in normal mode and 3/3
  with `VITE_DISABLE_LEGACY_FALLBACK=1`, covering source/import mapping, every
  moved computed declaration, no inline styles, hidden/visible state, direct
  child scope, click/focus/Escape, form contracts, and desktop/390px geometry.
  The submit computes to `block` because it is a flex item; the frozen StyleX
  declaration remains `inline-block` and the row is asserted as `flex`.
- Scope exclusions: parent/comment forms, generic notification receiver rules,
  unauthorized child-form branch, and broad fallback consumers remain unchanged.
- Visual gap: legacy port `127.0.0.1:9000` was unavailable, so no live legacy
  screenshot pair was captured and screenshot-level visual parity is not
  claimed.
- Frozen `yona-original/**` sources remained unchanged.
