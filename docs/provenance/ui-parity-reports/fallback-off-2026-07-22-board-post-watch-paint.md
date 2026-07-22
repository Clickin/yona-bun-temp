# Board-post Watch paint parity — Batch 792

- Route/state: authenticated populated board-post detail, initially not
  watching and then watching/unwatching through the existing mutation.
- Legacy output: `board/view.scala.html:96-112` emits `button#watch-button.ybtn`
  and conditionally appends `ybtn-watching`.
- Frozen declarations: `_yobiUI.less:710-747,793-901` with
  `_variables.less:68,82` supplies the exact default, hover/focus/active, and
  watching paint/geometry. `public/javascripts/service/yobi.board.View.js:61-80`
  is behavior evidence for toggling only.
- Root cause: React omitted the visible legacy `ybtn`/`ybtn-watching` class
  contract and applied an unconditional green StyleX paint, so the initial
  neutral Watch button could never match legacy.
- React ownership: the button preserves both conditional legacy classes and a
  conditional StyleX owner. React/TanStack Query retains POST/DELETE mutation,
  copy, title, and `data-watching`; no inline or dynamic style is introduced.
- Focused proof: explicit `PW_CHANNEL=chrome` normal and fallback-off runs pass
  1/1 each at 1366x900 and 390x844, covering exact base/interaction/watching
  paint, geometry, containment/no-overlap, and mutation round trip.
- Screenshot gate: fresh paired screenshots show neutral white/gray Watch
  paint on both sides and retain the corrected editor/upload boundary. The
  automated sweep's remaining failure is navbar `gnbSearchForm` x/right drift.
- Yoram repository/contact copy and Yoram-only footer identity are explicit
  user-approved deviations, excluded from gap counts and never restored to
  legacy NAVER/NAVER LABS content.
- Frozen `yona-original/**` sources remained unchanged.
