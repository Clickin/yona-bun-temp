# Board-post body/footer left-float parity — Batch 790

- Route/state: authenticated populated board-post detail.
- Legacy output: `board/view.scala.html:96-112` emits the Watch-group wrapper;
  `board/view.scala.html:176-179` includes `help/keymap.scala.html:12-17` for the
  footer keymap wrapper. Both use `pull-left`.
- Frozen declaration: Bootstrap `bootstrap.css:6097-6099` supplies exact
  `float:left`; the keymap's existing 55px margin and 10px vertical padding are
  preserved unchanged.
- React ownership: stable Watch and keymap owners carry the float. Nested DOM,
  copy/order, Watch mutation, and keymap open/confirm/Escape remain React-owned.
- Focused proof: explicit `PW_CHANNEL=chrome` normal and fallback-off runs pass
  1/1 each at 1366x900 and 390x844, covering declarations, containment,
  alignment/no-overlap, Watch toggling, and keymap interactions.
- Screenshot gate: managed legacy/local `/admin/sample/post/1` both render and
  direct inspection confirms both positions. The known local upload y=1009
  versus legacy y=979 and collapse-button paint gap remain outside this wave.
- Yoram repository/contact copy and Yoram-only footer identity are explicit
  user-approved deviations, excluded from gap counts and never restored to
  legacy NAVER/NAVER LABS content.
- Frozen `yona-original/**` sources remained unchanged.
