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
- Visual recheck: the managed legacy port is prepared and seeded with Java 8;
  the legacy issue screenshot sweep passes 1/1. Paired local comparison now
  runs against the root-base Vite dev server with system Chrome; both sides
  render successfully. The issue sidebar horizontal geometry is aligned after
  applying the final `_responsive.less` `.issue-info` padding cascade. One
  vertical difference remains: the local editable/label branch produces an
  issue form height of 456px versus legacy's 410px; it is retained as an
  explicit follow-up gap and parity is not claimed as fully green.
- Intentional product-identity deviation: the Yoram footer omits legacy
  NAVER/NAVER LABS provider links, and the developer-contact link uses the
  Yoram repository URL. These are explicit product changes, not parity gaps,
  and must not be restored to legacy copy.
- Frozen `yona-original/**` sources remained unchanged.
