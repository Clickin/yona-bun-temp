# Fallback-off parity: issue-detail sharer title — 2026-07-22

Batch 769 owns the authenticated issue-detail sharer title's frozen `.mb10`
spacing through `styles.sharerTitle` (`marginBottom: "10px"`). The legacy
output is `yona-original/app/views/issue/view.scala.html:252-255`, the frozen
declaration is `_common.less:212`, and `yobi.less` imports `_common.less`.

The React route removes only `mb10` from the sharer `<dt>` and preserves the
`issue-share-title` class, title/count copy, reveal interaction, read-only
sharer order/links, and surrounding DOM. The generic `.mb10` fallback remains
for unrelated consumers.

Focused Playwright results:

- Normal: 3 passed — reveal, StyleX ownership/reveal, read-only sharers.
- `VITE_DISABLE_LEGACY_FALLBACK=1`: 3 passed — same three contracts.

The checks verify the exact frozen source/import evidence, stable owner marker,
StyleX declaration, computed `margin-bottom: 10px`, absence of inline style and
`mb10` on the emitter, plus visible title/reveal and read-only copy/order/link
behavior. No frozen legacy source was modified.
