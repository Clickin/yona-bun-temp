# Child notification receiver parity — Batch 778

- Legacy output: `yona-original/app/views/common/child_commentForm.scala.html:17-27`
  emits the receiver and `yona-original/app/views/common/childComments.scala.html:70-74`
  places it under `.child-comment-input-form`.
- Frozen declarations: `yona-original/app/assets/stylesheets/less/_page.less:7805-7817`,
  imported through `yona-original/app/assets/stylesheets/yobi.less`, define
  child margin-left and bottom radii plus the receiver background, hidden
  display, start alignment, and padding.
- React ownership: the route preserves receiver DOM, title/list copy/order,
  focus behavior, and `notification-receiver` while StyleX owns
  `childCommentNotificationReceiver`, `childCommentNotificationReceiverHidden`,
  and `childCommentNotificationReceiverVisible` for the child wrapper only.
- Proof: the focused child-reply suite passed 5/5 in normal mode and 5/5 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering source/import mapping, every moved
  computed declaration, no inline style, hidden/focused-visible state, direct
  child scope against the parent receiver, copy/order, and desktop/390px
  geometry.
- Scope exclusions: parent/comment-edit receivers, nested generic receiver
  title/list rules, and broad fallback consumers remain unchanged.
- Visual gap: legacy port `127.0.0.1:9000` was unavailable, so no live legacy
  screenshot pair was captured and screenshot-level visual parity is not
  claimed.
- Frozen `yona-original/**` sources remained unchanged.
