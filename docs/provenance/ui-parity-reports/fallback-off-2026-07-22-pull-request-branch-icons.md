# Pull-request overview branch-icon parity — Batch 785

- Route/state: authenticated populated
  `/$ownerName/$projectName/pullRequest/$pullRequestNumber` overview branch
  information.
- Legacy output: `yona-original/app/views/git/view.scala.html` includes
  `git/partial_branch.scala.html:27`, which emits the branch start icon with
  `ml0`, followed by from-branch copy, the `yobicon-right-2 ml10` direction
  icon, and to-branch copy.
- Frozen cascade: `yobi.less` imports `_common.less:205` before
  `_page.less:4093-4105`; the latter's more-specific icon shorthand leaves the
  final rendered left/right margins at 5px. Frozen yobicon CSS lines 12-25,
  3781-3783, and 3853-3855 define the shared font/display contract and the
  branch/right-arrow pseudo glyphs.
- React ownership: both icon elements and legacy glyph classes remain. Stable
  start/direction owners carry the exact final icon contract. Only the
  ineffective start `ml0` class and the now-zero-consumer React-side `.ml0`
  bridge retire; the direction icon's `ml10` and all unrelated utilities stay.
- Focused proof: the fallback-off test first failed because the start glyph was
  zero-size without the generic yobicon fallback. After exact glyph ownership,
  system-Chrome runs pass 1/1 in normal mode and 1/1 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`. Both runs cover 1280x900 and 390x844,
  computed font/display/pseudo content, non-zero glyph geometry, exact 5px
  margins, source order, containment, no overflow, and branch navigation.
- Screenshot gate: the managed legacy and local servers both rendered, but
  `/admin/sample/pullRequest/1` is a legacy 404 and local 200. Playwright CLI
  then attempted the real legacy create flow; `newPullRequestForm` returned
  400 because the parity seed has no sending repository. The resulting
  404-to-200 screenshots are diagnostic only and are not accepted as visual
  parity. A populated live-legacy screenshot remains an explicit gap and must
  be rerun when a legacy PR fixture is available.
- Frozen `yona-original/**` sources remained unchanged.
