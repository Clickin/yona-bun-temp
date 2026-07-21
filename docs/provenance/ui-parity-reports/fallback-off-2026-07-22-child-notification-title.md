# Child notification receiver title parity — Batch 779

- Legacy output: `yona-original/app/views/common/child_commentForm.scala.html:17-27`
  emits the title and `childComments.scala.html:70-74` places it in the child
  receiver.
- Frozen declaration: `_page.less:7819-7821`, imported through `yobi.less`,
  defines `.notification-receiver-title { color:#999; }`.
- React ownership: the child title keeps its class/copy/order while
  `styles.childCommentNotificationReceiverTitle` owns the color.
- Proof: focused child-reply tests passed 5/5 in normal mode and 5/5 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, including computed color, no inline style,
  child-vs-parent scope, and desktop/390px geometry.
- Scope exclusion: notification-receiver-list badge rules remain unchanged;
  the current React child DOM has no badge consumer.
- Visual gap: legacy port `127.0.0.1:9000` was unavailable, so screenshot-level
  parity is not claimed.
- Frozen `yona-original/**` sources remained unchanged.
