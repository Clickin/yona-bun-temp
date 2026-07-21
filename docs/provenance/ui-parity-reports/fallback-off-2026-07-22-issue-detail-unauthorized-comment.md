# Fallback-off parity: issue-detail unauthorized comment — 2026-07-22

Batch 770 owns the unauthorized issue-detail comment wrapper's frozen `.mt20`
spacing through `styles.unauthorizedComment` (`marginTop: "20px"`). The legacy
output is `yona-original/app/views/common/commentForm.scala.html:51-62`, the
frozen declaration is `_common.less:208`, and `yobi.less` imports `_common.less`.

The React route removes only `mt20` from the unauthorized `write-comment-box`
emitter. It preserves title/data-login, disabled textarea/comment classes,
existing disabled-action `.mt10` alignment, button copy, and absence of the
legacy comment-form script. Other comment form/editor consumers remain outside
scope.

Focused Playwright results:

- Normal: 1 passed — unauthorized comment wrapper source/geometry/interaction
  contract.
- `VITE_DISABLE_LEGACY_FALLBACK=1`: 1 passed — same contract.

The checks verify the exact frozen source/import evidence, stable owner marker,
StyleX declaration, computed `margin-top:20px` at desktop and 390px mobile,
absence of inline style and `mt20` on the emitter, disabled controls, copy,
and legacy script absence. No frozen legacy source was modified.
