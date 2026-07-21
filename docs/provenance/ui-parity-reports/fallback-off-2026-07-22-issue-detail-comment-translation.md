# Fallback-off parity: issue-detail comment translation — 2026-07-22

Batch 771 owns the configured issue-comment translation button's frozen `.ml10`
spacing through `styles.commentTranslationButton` (`marginLeft: "10px"`). The
legacy output is `yona-original/app/views/issue/partial_comment.scala.html:95`,
the frozen declaration is `_common.less:206`, and `yobi.less` imports
`_common.less`.

The React route removes only `ml10` from the comment translation emitter. It
preserves the icon/button classes, comment id, title, pending/disabled state,
translation request/result, and adjacent edit/delete controls. Issue-body
translation remains separately owned; no generated StyleX hash is used as an
application contract.

Focused Playwright results:

- Normal: 1 passed — comment translation source/geometry/interaction contract.
- `VITE_DISABLE_LEGACY_FALLBACK=1`: 1 passed — same contract.

The checks verify exact frozen source/import evidence, stable owner marker,
StyleX declaration, computed `margin-left:10px`, absence of inline style and
`ml10` on the emitter, visible interaction, request payload/result, and scope
boundaries. No frozen legacy source was modified.
