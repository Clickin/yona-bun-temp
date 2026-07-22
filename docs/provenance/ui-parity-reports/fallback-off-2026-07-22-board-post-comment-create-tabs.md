# Batch 803: Board-post new-comment editor tabs

- Route/state: authenticated populated `/admin/sample/post/1`, new-comment editor.
- Legacy basis: `board/view.scala.html` → `common/commentForm.scala.html` → `common/editor.scala.html`; frozen Bootstrap nav/tab rules, `_common.less:32`, `_page.less:738-740,3471-3475`, `_yobiUI.less:470-492`, `_responsive.less:445-448`, variables/mixins, and complete `yobi.less` order.
- Ownership: exactly four `comment-body` owners for the nav shell, five direct items, Edit/Preview links, and active link. They reuse the declaration-identical Batch 799 StyleX groups; no new style values were introduced.
- Browser gate: outside-sandbox system Chrome passed the focused test once in normal mode and once with `VITE_DISABLE_LEGACY_FALLBACK=1`, including desktop and 390px declarations, geometry, responsive padding, order, and URL-stable Preview/Edit interaction.
- Screenshot gate: inspected `output/playwright/batch-803/{legacy,local}-{desktop,mobile}.png`. The target tab strip retains Edit-active, Preview, and checklist order and the legacy border/padding at both viewports. Legacy seed data and local E2E fixture content differ, so unrelated full-page geometry is not treated as a pixel comparison.
- Approved deviation: local `Yoram authors` footer and the absence of NAVER/NAVER LABS, upstream Yona repository, and developer-contact items are intentional user-approved Yoram changes. They are not parity gaps and must not be restored.
- Deferred: checklist styling and the remaining new-comment editor consumers remain later waves; this batch does not claim migration completion or remove the shared fallback.
