# Board-post comment-card parity — Batch 793

- Route/state: authenticated populated board-post detail with one top-level
  comment at `/admin/sample/post/1`.
- Legacy output: `board/partial_comments.scala.html` emits `ul.comments >
  li.comment`, `.comment-avatar > .avatar-wrap`, `.media-body`, and
  `.meta-info` in that order.
- Frozen declarations: `_common.less:144-147` avatar display,
  `_page.less:3005-3170`, the max-720 comment cascade in `_responsive.less`,
  Bootstrap media overflow, and the complete `yobi.less` order supply the exact
  list reset, row, avatar, media/pointer,
  hover/target, metadata, and responsive declarations.
- React ownership: six stable route-local StyleX owners preserve legacy
  elements/classes and existing profile/hash links plus React-owned
  reply/edit/delete behavior. Body, actions, child/reply/update forms,
  attachments, tasklist, and shared fallback remain excluded.
- Focused proof: RED failed before `commentList` ownership; explicit
  `PW_CHANNEL=chrome` normal and fallback-off managed dynamic-port runs pass
  1/1 each at 1366×900 and 390×844. Assertions cover exact computed styles,
  pseudo pointer, hover, hash target, geometry, containment, and overflow.
- Screenshot gate: fresh system-Chrome live legacy/local sweeps render 1/1 per
  viewport. Comment geometry is `1002×107` on both desktop targets and
  `386×135` on both mobile targets; local is uniformly 2px above legacy.
  Original-resolution inspection confirms the comment cards visually align.
- The sweep reports desktop global-search and mobile user-menu position
  differences because legacy renders a configured developer-contact item and
  Yoram intentionally omits it until a real public repository is configured.
  This is an approved identity/contact deviation consequence, not a gap; no
  upstream copy/link or artificial spacing is restored.
- Frozen `yona-original/**` sources remained unchanged.
