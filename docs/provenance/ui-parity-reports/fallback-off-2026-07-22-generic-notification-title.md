# Generic MarkdownEditor notification receiver title parity — Batch 780

- Legacy output: `yona-original/app/views/common/editor.scala.html:61-64`
  emits the receiver title; issue new/edit consumers are
  `common/commentForm.scala.html:31` and `common/commentUpdateForm.scala.html:32`.
- Frozen declaration: `_page.less:7819-7821`, imported through `yobi.less`,
  defines `.notification-receiver-title { color:#999; }`.
- React ownership: the new-comment and comment-edit MarkdownEditor instances
  preserve title class/copy/order while
  `styles.markdownEditorNotificationReceiverTitle` owns the color with
  per-instance markers. The child title remains separately owned.
- Proof: focused tests passed 7/7 in normal mode and 7/7 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering computed color, no inline style,
  visible focus for new/edit editors, copy/order, child scope, and desktop/390px
  geometry.
- Scope exclusion: notification-receiver-list badge rules remain unchanged;
  the current React DOM has no badge consumer.
- Visual gap: legacy port `127.0.0.1:9000` was unavailable, so screenshot-level
  parity is not claimed.
- Frozen `yona-original/**` sources remained unchanged.
