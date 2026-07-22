# Fallback-off parity: board-post comment section boundary/header

Date: 2026-07-22  
Route/state: authenticated populated `/admin/sample/post/1`  
Batch: 795

## Evidence and ownership

`board/view.scala.html` includes `board/partial_comments.scala.html`, whose
visible order is comment header, `hr.nm`, then the comments list. Frozen
`_variables.less:12`, `_common.less:32`, `_page.less:3005-3015`,
`_responsive.less:1-42`, complete `yobi.less` import order, and yobicon
`style.css` generic contract plus `yobicon-comments` glyph supply the final
declarations.

The existing comments wrapper owner now includes the exact max-720 `2px`
padding. Three stable owners carry header typography, icon font/display/glyph,
and divider margin. The React-side `margin-top:18px` was introduced outside the
frozen source graph and remains fallback-owned rather than receiving false
legacy provenance.

## Browser execution contract

`frontend/playwright.config.ts` now consumes `PW_CHANNEL` and defaults to
system Google Chrome. AGENTS, the Scala workflow, and the porting harness state
that Playwright E2E and screenshot parity must run as whole outside-sandbox
invocations with `PW_CHANNEL=chrome`; historical Edge or sandboxed bundled
browser availability is no longer assumed.

## Verification

- RED: focused source evidence failed before the header owner existed.
- First real-Chrome run exposed only computed-style normalization of
  `BlinkMacSystemFont` to `system-ui`; the frozen source value stayed unchanged
  and only the browser expectation was corrected.
- Explicit system-Chrome normal and fallback-off runs pass 1/1 each at 1366px
  and 390px with source/cascade, computed declarations, glyph geometry, order,
  containment, and no-overlap checks.
- Fresh desktop/mobile sweeps render legacy and local 1/1 each. Direct visual
  inspection confirms this target. Desktop search (`x 267→134`) and mobile
  user-menu (`y 83→43`) shifts remain approved consequences of the intentional
  Yoram footer/developer-contact/repository changes, not gaps.

Frozen legacy source hashes remain unchanged.
