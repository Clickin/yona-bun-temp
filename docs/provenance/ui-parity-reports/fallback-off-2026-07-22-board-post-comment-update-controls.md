# Fallback-off parity: board-post comment-update controls

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`, parent comment edit open  
Batch: 797

## Ownership

Four route-local owners cover the update textarea and its file-upload wrapper,
label, and input. The final cascade comes from `_page.less`,
`_responsive.less`, and the later `_yobiUI.less`: desktop textarea 12px,
mobile textarea 16px important, orange important focus border, and the
`.ybtn` 3px important label radius. Earlier 1em, gray-focus, and 2px label
rules are recorded as overridden evidence rather than treated as final output.

The upload-drop overlay, generic button family beyond the effective label
radius, editor tabs/preview, new-comment editor, and fallback removal remain
outside this wave.

## Verification

- Outside-sandbox system-Chrome normal and fallback-off runs pass 1/1 each at
  1366px and 390px.
- The focused case covers all four stable owners, source/import order, final
  computed declarations, textarea focus, file selection, containment, and
  existing cancel/save mutation behavior.
- Fresh screenshots:
  `output/playwright/batch-797/legacy-desktop.png`,
  `legacy-mobile.png`, `local-desktop.png`, and `local-mobile.png`.
  Direct inspection confirms matching textarea/upload structure, responsive
  typography, and label radius. Fixture text and the legacy action set differ
  outside these four owners and are not used as a parity claim.
- Yoram footer/contact/repository differences are the explicit user-approved
  identity deviation, not a gap and not something to restore.

Frozen legacy sources are unchanged. The generated fallback remains active by
default and retains SHA-256
`8b437655422bcfe1e612e7320362c3b52e6f65ec43c064dd344e8e7e5de18be6`.
