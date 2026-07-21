# Commit-detail review-form shell StyleX parity

Date: 2026-07-21

Legacy evidence is `yona-original/app/views/common/reviewForm.scala.html`, `yona-original/app/views/partial_comment_form_on_thread.scala.html`, frozen `_page.less:5839,6135-6181`, `_responsive.less:1,152-154`, and `_variables.less:12`.

The existing review-form and block-review DOM/classes and React open/close interaction are preserved. Route-local StyleX carries only the frozen form padding, padding-right, base font family, radius, author-info row geometry, write-comment-box geometry, block-button hidden/visible display, and the 720px responsive `margin-left:0` override. Generic fallback consumers remain retained; legacy DOM-control JavaScript is not copied.

Focused evidence: `frontend/tests/project-code-commit-detail.e2e.ts`; normal and `VITE_DISABLE_LEGACY_FALLBACK=1` runs both pass 1/1 at 1366px and 390px, including hidden/visible interaction and viewport containment.
