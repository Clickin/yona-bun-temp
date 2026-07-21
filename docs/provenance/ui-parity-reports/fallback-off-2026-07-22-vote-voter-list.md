# Issue-detail vote and voter-list parity — Batch 782

- Legacy output: `yona-original/app/views/issue/view.scala.html:210-224`
  emits `vote-wrap`; `yona-original/app/views/issue/partial_voters.scala.html:11-39`
  emits `voter-list-wrap`, `voter-list`, avatars, and overflow copy.
- Frozen declarations: `_page.less:4230-4310` and `_variables.less:15`, imported
  through `yobi.less`, define the vote/list geometry and 13px base font.
- React ownership: active vote/heart and voter list wrapper/list/items/avatar
  consumers preserve classes, copy/order, and modal trigger behavior while
  route-local StyleX owns the moved declarations. The separate voters modal is
  unchanged.
- Proof: focused tests passed 1/1 in normal mode and 1/1 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering computed declarations, no inline
  styles, visible avatars/overflow, direct board-action scope, and desktop/390px
  geometry. The frozen vote `inline-block` computes as `block` because the vote
  wrapper is a flex item.
- Visual gap: legacy port `127.0.0.1:9000` was unavailable, so screenshot-level
  parity is not claimed.
- Frozen `yona-original/**` sources remained unchanged.
