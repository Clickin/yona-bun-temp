# Fallback-off parity: board-post comment-update actions

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`, parent comment edit open  
Batch: 798

## Ownership

Three visible controls are covered: file-upload label, Cancel, and conditional
Save. A shared route-local StyleX group carries the exact final generic
`.ybtn` declarations from frozen `_yobiUI.less`; the existing label owner keeps
its later `display:block` and background-only transition, and the Save variant
keeps the frozen `@yobi-btn-info`/hover colors from `_variables.less`.

Upload overlay, editor tabs/preview/body, notification, attachments, other
button consumers, and fallback removal remain outside this wave.

## Verification

- Outside-sandbox system-Chrome normal and fallback-off runs pass 1/1 each at
  1366px and 390px.
- The first Chrome run was RED because the test incorrectly required the label
  inside its inline-block wrapper to share an exact bottom edge with direct
  button siblings. The corrected gate preserves the legacy structure and
  verifies Cancel/Save alignment, action-row containment, order, and no overlap.
- Default, hover, and focus paint plus existing cancel/save behavior pass.
- Fresh screenshots were inspected at
  `output/playwright/batch-798/legacy-desktop.png`, `legacy-mobile.png`,
  `local-desktop.png`, and `local-mobile.png`. The three target controls match
  in paint, order, spacing, and mobile placement. Fixture body copy and editor
  tab placement differ outside these owners and are not used as a whole-screen
  parity claim.
- Yoram footer/contact/repository differences are the explicit user-approved
  identity deviation, not a gap and not something to restore.

Frozen legacy sources are unchanged. The generated fallback remains active by
default.
