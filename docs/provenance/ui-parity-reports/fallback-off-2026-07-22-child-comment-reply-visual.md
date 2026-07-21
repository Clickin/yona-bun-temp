# Child comment reply visual declarations — Batch 776

- Legacy output: `yona-original/app/views/common/childComments.scala.html:60`
  emits the `add-a-comment pull-right` reply control.
- Frozen declaration source: `yona-original/app/assets/stylesheets/less/_page.less:3049-3066`,
  reached through `yona-original/app/assets/stylesheets/yobi.less`. The
  migrated declarations are font size, white surface, relative/right position,
  cyan color and border, negative top margin, padding, radius, visibility,
  stacking, and hover shadow/cursor/display.
- React ownership: the existing route owner in
  `frontend/src/routes/$ownerName/$projectName/issue/$issueNumber.tsx` applies
  `childCommentReply`, `childCommentReplyHidden`, and
  `childCommentReplyVisible` while preserving legacy classes and React
  toggle/focus behavior.
- Proof: the focused child-reply parity plus interaction tests passed 2/2 in
  normal mode and 2/2 with `VITE_DISABLE_LEGACY_FALLBACK=1`. Assertions cover
  every moved computed declaration, no inline style, hidden/hover-visible
  states, direct child scope, click/focus, and desktop/390px containment.
- Scope exclusions: parent action rows, parent attachments, child
  contents/delete, existing child surface/form owners, and broad fallback
  consumers remain unchanged.
- Visual gap: the configured legacy port `127.0.0.1:9000` was unavailable, so
  no live legacy screenshot pair was captured. LESS-derived browser metrics
  were verified; screenshot-level visual parity is not claimed.
- Frozen `yona-original/**` sources remained unchanged.
