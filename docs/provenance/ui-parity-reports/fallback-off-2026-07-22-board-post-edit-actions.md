# Board-post edit-action spacing parity — Batch 787

- Route/state: authenticated populated
  `/$ownerName/$projectName/post/$postNumber` board-post detail.
- Legacy output: `board/view.scala.html:114-132,158-176` emits the post
  edit/show-original action in the main and sidebar regions;
  `board/partial_comments.scala.html:44-67` emits the populated comment edit
  action. Frozen `_common.less:206` supplies `margin-left:10px`, and the two
  context rules at `_page.less:2956,3550` supply `padding-top:5px` for the post
  actions through the complete `yobi.less` import chain.
- React ownership: one post owner carries both exact declarations for two
  rendered instances, and one comment owner carries the exact margin for one
  rendered instance. DOM, icons, copy/order, post navigation, and comment
  edit/cancel behavior remain unchanged. Shared `.ml10` fallback consumers stay.
- Focused proof: the test observed RED before ownership, then system-Chrome
  runs pass 1/1 in normal mode and 1/1 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`. Both cover 1366x900 and 390x844, exact
  computed spacing, three instances, direct-region containment, order,
  no-overlap, post edit navigation, and comment editor open/cancel.
- Screenshot gate: the managed legacy and local servers each render the real
  populated `/admin/sample/post/1` state. Direct inspection confirms the edit
  controls align. The automated comparison still reports the local upload area
  at y=1009 versus legacy y=979, and direct inspection retains the local green
  collapse-button paint versus the legacy default button. These existing
  screen-level differences remain gaps outside this spacing wave.
- Yoram repository/contact copy and Yoram-only footer identity remain explicit
  user-approved deviations, excluded from parity-gap counts and never restored
  to legacy NAVER/NAVER LABS content.
- Frozen `yona-original/**` sources remained unchanged.
