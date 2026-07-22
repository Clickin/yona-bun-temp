# Batch 802: Board-post new-comment hidden Clear Temporary

- Route/state: authenticated populated `/admin/sample/post/1`, new-comment editor.
- Legacy basis: `board/view.scala.html` → `common/commentForm.scala.html` → `common/editor.scala.html`; frozen `_page.less:7694-7697` and `_yobiUI.less:470-508`.
- Ownership: exactly two `comment-body` owners for the hidden clear wrapper and empty notice-label padding. Update editors and draft-save behavior are excluded.
- Browser gate: outside-sandbox system Chrome passed the focused test once in normal mode and once with `VITE_DISABLE_LEGACY_FALLBACK=1`, including desktop and 390px assertions.
- Screenshot gate: inspected `output/playwright/batch-802/{legacy,local}-{desktop,mobile}.png`. The clear control is hidden in all four images and the editor tab order is retained. Legacy seed data and local E2E fixture content differ, so unrelated full-page geometry is not treated as a pixel comparison.
- Approved deviation: local `Yoram authors` footer and the absence of NAVER/NAVER LABS, upstream Yona repository, and developer-contact items are intentional user-approved Yoram changes. They are not parity gaps and must not be restored.
- Deferred: fallback consumers outside these two owners remain in scope for later waves; this batch does not claim migration completion or remove the shared fallback.
