# Board-post editor/upload boundary parity — Batch 791

- Route/state: authenticated populated board-post detail comment editor.
- Legacy output: `board/view.scala.html:133-139` includes
  `common/commentForm.scala.html:30-45`, `common/editor.scala.html:48-65`,
  `common/uploadForm.scala.html:15-37`, and `help/markdown.scala.html`.
- Frozen declarations: Bootstrap `bootstrap.css:4203-4211` supplies direct
  inactive pane `display:none` and active pane `display:block`.
- Root cause: the React `sx.editorTabContent` prop spread overwrote the
  literal `tab-content` class. The inactive preview therefore retained 30px
  of border/padding in normal flow and pushed the uploader down. This was a
  DOM/class ownership bug, not a missing 30px offset.
- React ownership: the wrapper preserves both StyleX and `tab-content` classes;
  two pane owners carry the exact frozen display declarations. React continues
  to own Preview/Edit state and content, with no compensating geometry.
- Focused proof: explicit `PW_CHANNEL=chrome` normal and fallback-off runs pass
  1/1 each at 1366x900 and 390x844, covering source rules, computed pane state,
  editor/upload contact, containment, and Preview/Edit restoration.
- Screenshot/metric gate: fresh paired rendering records legacy upload y=979
  and local y=977, replacing the pre-fix local y=1009 and closing the 30px
  drift. A fresh standalone Vite/system-Chrome render has no overlay or console
  errors. The separate collapse-button paint difference and automated
  `gnbSearchForm` x/right drift (`267→134`, `498→365`) remain open goal gaps.
- Yoram repository/contact copy and Yoram-only footer identity are explicit
  user-approved deviations, excluded from gap counts and never restored to
  legacy NAVER/NAVER LABS content.
- Frozen `yona-original/**` sources remained unchanged.
