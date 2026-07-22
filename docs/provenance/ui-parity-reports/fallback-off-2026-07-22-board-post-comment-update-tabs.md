# Fallback-off parity: board-post comment-update tabs

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`, parent comment edit open  
Batch: 799

## Ownership

Four update-only owners cover the editor nav shell, all five direct list
items, the Edit/Preview links, and the active link state. Their declarations
are the exact final cascade from frozen Bootstrap nav/tab rules, `_common.less`
`.nm`, `_page.less` context rules, `_yobiUI.less` small-tab paint/geometry, and
the max-720 `_responsive.less` 5px important horizontal padding.

Checklist and clear-temporary button paint, notice content, panes, markdown
help, textarea, upload/actions, new-comment editor, other tab consumers, and
fallback removal remain outside this wave.

## Verification

- Outside-sandbox system-Chrome normal and fallback-off runs pass 1/1 each at
  1366px and 390px.
- The focused case verifies the 29px shell, reset/border/clearfix pseudo
  elements, five-item float/order, exact default/hover/active link paint,
  desktop `4px 15px` and mobile `4px 5px` padding, containment, alignment,
  non-overlap, Link hashes, and Edit/Preview interaction.
- Fresh actual legacy/local screenshots were captured under
  `output/playwright/batch-799/`. Direct inspection confirms tab paint,
  responsive spacing, and tab → help → textarea order. The original legacy
  form-element screenshot showed an overflow crop artifact, so page-level
  `legacy-desktop-clip.png` and `legacy-mobile-clip.png` were captured and used
  instead of treating the artifact as a DOM difference.
- Fixture body copy differs outside the four owners. Yoram
  footer/contact/repository changes remain an explicit user-approved deviation,
  not a gap and not something to restore.

Frozen legacy sources are unchanged. The generated fallback remains active by
default.
