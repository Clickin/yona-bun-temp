# Issue-detail board action group parity — Batch 781

- Legacy output: `yona-original/app/views/issue/view.scala.html:187-201`
  emits `.board-actrow right-txt` with the inner `.pull-left` control group.
- Frozen declaration: `yona-original/public/bootstrap/css/bootstrap.css:6093-6098`
  defines `.pull-left { float:left; }`.
- React ownership: the route preserves the inner class and watch/share/new
  subtask/weight controls while `styles.boardActionGroup` owns `float:left`
  with a stable owner marker.
- Proof: the focused test passed 1/1 in normal mode and 1/1 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering computed float, no inline style,
  control order/copy, direct action scope, and desktop/390px containment.
- Scope exclusions: unrelated action groups, comment action rows, and
  attachment floats remain separately owned or fallback-owned.
- Visual gap: legacy port `127.0.0.1:9000` was unavailable, so screenshot-level
  parity is not claimed.
- Frozen `yona-original/**` sources remained unchanged.
