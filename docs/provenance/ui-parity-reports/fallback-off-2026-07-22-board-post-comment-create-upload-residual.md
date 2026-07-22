# Batch 807: Board-post new-comment upload residual content

- Route/state: authenticated populated `/admin/sample/post/1`, system-Chrome capability-on new-comment uploader.
- Legacy basis: `board/view.scala.html` → `common/commentForm.scala.html` → `common/fileUploader.scala.html` → `common/uploadForm.scala.html`; frozen `_page.less`; `common/yobi.Files.js` capability detection and `common/yobi.Attachments.js` show/hide behavior evidence.
- Ownership: exactly five NEW-comment-only owners for droppable help, plain click help, capability-on paste help, empty attached-files, and save-time help. Icons, populated attachment rows, Batch 806 controls, submit actions, and UPDATE uploader remain excluded.
- Browser gate: outside-sandbox system Chrome passed normal and `VITE_DISABLE_LEGACY_FALLBACK=1` at desktop/390px with source proof, final declarations, hidden-list/help zero geometry, visible copy order, full-width paste row, containment, and retained two-file behavior.
- Screenshot gate: inspected `output/playwright/batch-807/{legacy,local}-{desktop,mobile}.png`. Initial CSS-only hidden and assumed-inline implementations were rejected by visual inspection. Direct legacy computed evidence proved `help-pastable` becomes `display:block`; corrected screenshots now match the first row, separate centered paste row, responsive geometry, and upload-wrapper height.
- Approved deviation: `Yoram authors`, removal of NAVER/NAVER LABS, upstream Yona repository, and developer-contact items, plus their downstream geometry, are explicit user-approved deviations rather than parity gaps and must not be restored.
- Deferred: populated attached-file item states and adjacent submit controls remain later waves; shared fallback remains active.
