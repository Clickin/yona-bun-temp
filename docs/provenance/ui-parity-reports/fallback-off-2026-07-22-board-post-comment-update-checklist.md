# Fallback-off parity: board-post comment-update checklist

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`, parent comment edit open  
Batch: 800

## Ownership

Three update-only owners cover the Add checklist wrapper, button, and list
icon. The button composes the existing exact generic `.ybtn` owner with frozen
`.ybtn-small` and `.ybtn-danger-no-outline` winners. The icon carries the
effective yobicon font/display contract, 20px line-height, baseline, and
`\e25e` glyph.

The frozen `_page.less` selector `.tasklist-icon` does not match the emitted
`.task-list-icon`, so its vertical-align rule is evidence of a source typo and
is intentionally not migrated. Clear Temporary, tab links, panes/help,
textarea, upload/actions, new-comment editor, other button/icon consumers, and
fallback removal remain outside this wave.

## Verification

- Outside-sandbox system-Chrome normal and fallback-off runs pass 1/1 each at
  1366px and 390px.
- Default declarations, transition-complete hover/focus paint, glyph/font,
  order, containment, alignment, no overlap, update-only scoping, and a click
  boundary with no navigation or editor-state corruption pass.
- The initial normal/fallback runs exposed browser-dependent serialization of
  the `text-decoration` shorthand. The permanent gate now checks the invariant
  `text-decoration-line:none`; no visual style was changed for that correction.
- Fresh actual legacy/local screenshots under
  `output/playwright/batch-800/` were directly inspected. Gray paint, list
  glyph, baseline, control height, and mobile elevator-overlay relation match.
  Locale/body copy differs outside these owners.
- Yoram footer/contact/repository changes remain the explicit user-approved
  identity deviation, not a gap and not something to restore.

Frozen legacy sources are unchanged. The generated fallback remains active by
default.
