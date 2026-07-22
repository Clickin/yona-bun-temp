# Fallback-off parity: board-post comment-update hidden auxiliary controls

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`, parent comment edit open  
Batch: 801

## Ownership

Four update-only owners cover the upload overlay, its message wrapper and
message, and the Clear Temporary wrapper. They reproduce only frozen
`_page.less:3704-3729,7694-7697`: exact positioning, dashed border, translucent
paint, message geometry, and the two hidden states.

Live legacy evidence corrected the initial candidate before integration.
`common/yobi.Comment.js` toggles comment editing but does not initialize
`yobi.Files` for the update textarea. A real `dragenter`/`dragover` dispatch on
that textarea left `body` without `dragover` and both overlays hidden.
`yona.temporarySaveHandler.js` stores the update draft but does not show the
Clear Temporary wrapper for this screen. Accordingly, React adds no drag,
localStorage, clear, upload, or visibility behavior.

## Verification

- Outside-sandbox system-Chrome normal and fallback-off runs pass 1/1 each at
  1366px and 390px.
- Exact computed declarations, four-owner update-only scope, hidden zero
  geometry, inert direct drag dispatch, and unchanged textarea/tab/checklist/
  cancel/save behavior pass.
- Fresh actual legacy/local full-page screenshots under
  `output/playwright/batch-801/` were directly inspected. The target update
  editor shows neither overlay nor Clear Temporary on either side.
- The fallback-off local new-comment editor still exposes its separate Clear
  Temporary consumer. It is not covered by this update-only wave and is the
  next safe migration target.
- Footer/contact/repository copy and geometry remain the user's explicit Yoram
  deviation; NAVER/NAVER LABS/upstream Yona entries are not restored.

Frozen legacy sources are unchanged. The generated fallback remains active by
default.
