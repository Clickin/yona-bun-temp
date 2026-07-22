# Board-post delete-action spacing parity — Batch 786

- Route/state: authenticated populated
  `/$ownerName/$projectName/post/$postNumber` board-post detail.
- Legacy output: `board/view.scala.html:125,169` emits the same post delete
  action in the main and sidebar regions; `board/partial_comments.scala.html:61`
  emits the populated comment delete action. Frozen `_common.less:216`, imported
  by `yobi.less`, supplies `margin-left:6px`.
- React ownership: stable post/comment action owners carry the exact 6px margin
  for all three rendered instances. Button/icon DOM, edit-before-delete order,
  and React-owned post/comment delete modals remain unchanged. Only the
  zero-consumer React-side `.ml6` bridge retires.
- Focused proof: system-Chrome runs pass 1/1 in normal mode and 1/1 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`. Both cover 1366x900 and 390x844, exact
  computed margins, three rendered instances, direct visible-region
  containment, source order, no overlap, and both modal open/dismiss flows.
- Screenshot gate: the managed legacy and local servers each render the real
  populated `/admin/sample/post/1` state successfully. The automated desktop
  comparison reports the local upload area at y=1009 instead of y=979, a 30px
  screen-level vertical drift. Direct inspection confirms the migrated delete
  controls remain aligned, while the collapse button also retains a green local
  paint versus the legacy default button. Those pre-existing differences are
  outside this spacing-only batch and remain parity gaps.
- The Yoram repository/contact copy and Yoram-only footer identity are explicit
  user-approved product deviations. They are excluded from gap counts and must
  not be restored to legacy NAVER/NAVER LABS content.
- Frozen `yona-original/**` sources remained unchanged.
