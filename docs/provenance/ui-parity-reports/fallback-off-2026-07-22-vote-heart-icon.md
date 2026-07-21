# Issue-detail vote heart icon parity — Batch 783

- Legacy output: `yona-original/app/views/issue/view.scala.html:210-224`
  emits the issue vote heart; `issue/partial_voters.scala.html:11-39` is the
  adjacent voter-list output state.
- Frozen icon declaration: `yona-original/public/stylesheets/yobicon/style.css:12-25`
  defines the `yobicon` font contract and `:3601-3603` defines the heart glyph
  `\e4b0`.
- React ownership: active and disabled issue vote `<i class="yobicon-hearts">`
  elements retain their DOM/class while `styles.issueVoteIcon` owns the
  required font/display/line-height/pseudo-element declarations.
- Proof: focused vote tests passed 2/2 in normal mode and 2/2 with
  `VITE_DISABLE_LEGACY_FALLBACK=1`, covering computed font/display/glyph,
  no-inline-style, active/disabled visibility, and the fallback cascade.
- Scope exclusion: comment hearts, voter modal icons, and unrelated icon
  consumers remain unchanged.
- Visual recheck: the managed legacy port is now prepared and seeded with
  Java 8; `PW_CHANNEL=chrome YORAM_SWEEP_TARGET=legacy
  YORAM_SWEEP_PATHS=/admin/sample/issue/1` passed 1/1 and wrote
  `output/playwright/visual-sweep/legacy-_admin_sample_issue_1.png`.
  A paired local comparison remains open: Vite dev hit the existing StyleX
  `Invalid empty selector` middleware error, while the production preview
  served nested-route assets as relative `/admin/sample/issue/assets/*`
  requests and rendered blank. Therefore the legacy screenshot is confirmed,
  but paired visual parity is not claimed yet.
- Frozen `yona-original/**` sources remained unchanged.
