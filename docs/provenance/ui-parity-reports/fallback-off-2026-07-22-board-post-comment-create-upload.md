# Batch 806: Board-post new-comment upload controls

- Route/state: authenticated populated `/admin/sample/post/1`, new-comment editor upload area.
- Legacy basis: `board/view.scala.html` → `common/commentForm.scala.html` → `common/fileUploader.scala.html` → `common/uploadForm.scala.html`; frozen `_page.less`, `_yobiUI.less`, Bootstrap, variables/mixins, and complete `yobi.less` order.
- Ownership: exactly five NEW-comment-only owners for the upload wrapper, attach row, button wrapper, fake-file button, and transparent multiple-file input. Upload help, empty attached-files, text/help spans, icon, submit actions, and UPDATE uploader remain excluded.
- Browser gate: outside-sandbox system Chrome passed normal and `VITE_DISABLE_LEGACY_FALLBACK=1` once each at desktop/390px, including source proof, exact final declarations, hover paint, containment, input overlay coverage, and two-file `multiple` behavior.
- Screenshot gate: inspected `output/playwright/batch-806/{legacy,local}-{desktop,mobile}.png`. The gray rounded wrapper, centered attach row, white upload button, responsive wrapping, and input-button coverage match. Legacy seed and local fixture content differ, so unrelated full-page geometry is excluded.
- Approved deviation: local `Yoram authors` and removal of NAVER/NAVER LABS, upstream Yona repository, and developer-contact items were explicitly requested by the user. Their copy, links, absence, and downstream geometry are intentional deviations, not parity gaps; they must not be restored or offset with compensating CSS.
- Deferred: empty attached-files and adjacent submit actions remain later waves; shared fallback remains active.
