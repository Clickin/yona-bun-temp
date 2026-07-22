# Fallback-off parity: board-post comment identity, actions, and body

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`  
Batch: 794

## Evidence and ownership

`board/partial_comments.scala.html` supplies the author, responsive avatar,
time link, action controls, and comment-body DOM. Frozen `_common.less`,
`_page.less:3150-3218`, `_responsive.less:365-384,7034`, `_yobiUI.less:1168`,
`_markdown.less`, the complete `yobi.less` import order, and yobicon
`style.css` supply the final declarations and edit/delete glyphs. Because
`_markdown.less` is imported after `_responsive.less` and both padding rules
are important, the final body padding is `15px 20px` at both viewports.

The route and `-post-detail.stylex.ts` now expose six stable owner groups for
comment author, responsive avatar/wrap, age link, transparent action base,
edit/delete icon paint/font/glyph/hover, and body content. React continues to
own edit/delete interactions. The app-only `.act-row .btn-transparent` 20px
context bridge has no frozen-source counterpart, so it was deliberately
excluded and remains fallback-owned.

## Verification

- RED: the focused test failed before the comment-author owner existed.
- GREEN: explicit system Chrome normal and fallback-off runs pass 1/1 each at
  1366px and 390px, including source/cascade, computed style, pseudo-content,
  hover, containment, and interaction checks.
- Fresh paired screenshot sweeps render legacy and local successfully at both
  desktop and mobile. Direct inspection confirms parity for this batch.
- Automated desktop search drift (`x 267→134`) and mobile user-menu drift
  (`y 83→43`) are expected geometry consequences of the user's intentional
  Yoram footer, developer-contact, and repository changes. They are approved
  deviations, not gaps; NAVER/NAVER LABS/upstream Yona copy or destinations
  must not be restored.

Frozen legacy source hashes remain unchanged.
