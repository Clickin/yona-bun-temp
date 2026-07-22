# Board-post responsive header metadata parity — Batch 789

- Route/state: authenticated populated board-post detail header.
- Legacy output: `board/view.scala.html:37-52` emits a desktop date wrapper
  before the title and a mobile date wrapper inside the title.
- Frozen declarations: Bootstrap `.pull-right` supplies `float:right` and
  `.hide` supplies baseline hidden display; `_common.less:207-208` supplies
  desktop 10px right/top margins; `_responsive.less:290-304` swaps desktop and
  mobile visibility at 720px. Legacy inline `font-size:0.7em` is retained by
  the existing mobile owner through the complete `yobi.less` import order.
- React ownership: stable desktop/mobile owners carry those exact final
  declarations. Wrapper types, order, date title/copy, and inner date/title
  ownership remain unchanged; only migrated utility tokens retire.
- Focused proof: explicit `PW_CHANNEL=chrome` system-Chrome runs pass 1/1 in
  normal mode and 1/1 with `VITE_DISABLE_LEGACY_FALLBACK=1`. Both cover
  1366x900 and 390x844, computed declarations, mutually exclusive responsive
  visibility, identical date copy/title, containment, alignment, and no overlap.
- Screenshot gate: managed legacy/local `/admin/sample/post/1` both render.
  Direct inspection confirms desktop header metadata alignment. Automated
  comparison retains local upload y=1009 versus legacy y=979; direct review
  also retains the local green collapse-button paint. These known gaps are
  outside this header wave.
- Yoram repository/contact copy and Yoram-only footer identity remain explicit
  user-approved deviations, excluded from parity-gap counts and never restored
  to legacy NAVER/NAVER LABS content.
- Frozen `yona-original/**` sources remained unchanged.
