# Batch 804: Board-post new-comment checklist control

- Route/state: authenticated populated `/admin/sample/post/1`, new-comment editor.
- Legacy basis: `board/view.scala.html` → `common/commentForm.scala.html` → `common/editor.scala.html`; frozen `_page.less` `.task-list-button`, `_yobiUI.less` `.ybtn`/small/danger-no-outline cascade, variables/mixins, Bootstrap reset, `public/stylesheets/yobicon/style.css`, and complete `yobi.less` order.
- Ownership: exactly three `comment-body` owners for wrapper, button, and icon. They reuse declaration-identical Batch 800 groups; no new values or behavior were introduced. The legacy `.tasklist-icon` typo does not apply to emitted `.task-list-icon`.
- Browser gate: outside-sandbox system Chrome passed normal and `VITE_DISABLE_LEGACY_FALLBACK=1` once each, including desktop/390px default, hover, focus, glyph, containment, exact source-derived 3px top offset, and URL/value-stable click.
- Screenshot gate: inspected `output/playwright/batch-804/{legacy,local}-{desktop,mobile}.png`. After explicitly returning the temporary capture to default state, wrapper, gray button, list glyph, and vertical placement match at both viewports. Legacy seed and local fixture content differ, so unrelated full-page geometry is excluded.
- Approved deviation: local `Yoram authors` footer and the absence of NAVER/NAVER LABS, upstream Yona repository, and developer-contact items are intentional user-approved Yoram changes. They are not parity gaps and must not be restored.
- Deferred: remaining new-comment editor consumers and checklist insertion functionality are outside this styling ownership wave; shared fallback remains active.
