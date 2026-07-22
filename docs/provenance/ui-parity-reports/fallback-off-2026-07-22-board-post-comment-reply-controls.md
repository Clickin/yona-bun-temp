# Board-post comment action and Reply parity — Batch 788

- Route/state: authenticated populated board-post detail with one parent
  comment and its child-reply controls.
- Legacy output: `board/partial_comments.scala.html:44-67` emits the parent
  `act-row pull-right`; included `common/childComments.scala.html:62-77` emits
  the child Reply affordance followed by its form.
- Frozen declarations: Bootstrap `bootstrap.css:6093-6095` supplies
  `float:right`; `_page.less:3049-3066` supplies the exact Reply font, white
  surface, relative 10px right offset, blue paint/border, -32px top margin,
  padding, radius, hidden display, z-index, and hover shadow/cursor/display
  through the complete `yobi.less` import chain.
- React ownership: route-local action and Reply owners carry those exact
  declarations. React parent-hover state shows/hides Reply, click toggles the
  existing child form and focuses its textarea. Existing edit/delete margins,
  child form internals, metadata, and unrelated shared fallback stay excluded.
- Focused proof: explicit `PW_CHANNEL=chrome` system-Chrome runs pass 1/1 in
  normal mode and 1/1 with `VITE_DISABLE_LEGACY_FALLBACK=1`. Both cover
  1366x900 and 390x844, every moved computed declaration, no inline style,
  hidden/hover/click states, action order, containment/no-overlap, child-form
  visibility, and textarea focus.
- Screenshot gate: managed legacy and local servers both render the populated
  `/admin/sample/post/1` state. Direct inspection confirms initial comment
  action alignment. The automated comparison still reports local upload y=1009
  versus legacy y=979, and the local collapse button remains green versus the
  legacy default paint; these existing screen gaps are outside this wave.
- Yoram repository/contact copy and Yoram-only footer identity are explicit
  user-approved deviations, excluded from gap counts and never restored to
  legacy NAVER/NAVER LABS content.
- Frozen `yona-original/**` sources remained unchanged.
