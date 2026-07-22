# Batch 805: Board-post new-comment textarea

- Route/state: authenticated populated `/admin/sample/post/1`, new-comment editor.
- Legacy basis: `board/view.scala.html` → `common/commentForm.scala.html` → `common/editor.scala.html`; frozen `_page.less` generic `.textarea-box`/`.write-comment-box .comment`, `_responsive.less`, `_yobiUI.less`, `_common.less`, Bootstrap defaults, variables/mixins, and complete `yobi.less` order.
- Ownership: exactly two `comment-body` owners for the textarea box and textarea. The create cascade is independent from Batch 797 UPDATE because it has 14px right padding and no 10px bottom margin.
- Browser gate: outside-sandbox system Chrome passed normal and `VITE_DISABLE_LEGACY_FALLBACK=1` once each at desktop/390px, including source proof, final declarations, orange focus border, containment, fill/Preview/Edit restoration, and unchanged upload boundary.
- Screenshot gate: inspected `output/playwright/batch-805/{legacy,local}-{desktop,mobile}.png` in a settled, unfocused state. The 160px textarea, width/reserve, border/radius, and responsive geometry match. Legacy seed and local fixture content differ, so unrelated full-page geometry is excluded.
- Approved deviation: local `Yoram authors` footer and the absence of NAVER/NAVER LABS, upstream Yona repository, and developer-contact items are intentional user-approved Yoram changes. They are not parity gaps and must not be restored.
- Deferred: upload wrapper/content and action controls remain later waves; shared fallback remains active.
