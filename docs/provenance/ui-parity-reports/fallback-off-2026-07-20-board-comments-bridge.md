# Fallback-off report: dead `.board-comments` bridge

## Scope

Batch 605 removes only the standalone `.board-comments` reset from
`frontend/src/app.css`:

```css
.board-comments {
  padding-left: 0;
  margin: 0;
  list-style: none;
}
```

Repository inventory found no `.board-comments` producer in current React,
frozen Scala, or legacy JavaScript. The related `.board-comment-wrap`,
`.comments`, and review-card comment rules remain unchanged because they are
part of live comment/timeline output.

## Verification

- `frontend/tests/stylex-project-posts.e2e.ts`: passed in normal and
  `VITE_DISABLE_LEGACY_FALLBACK=1` modes.
- `frontend/tests/legacy-fallback-off.e2e.ts` (`board-comment fallback bridge`):
  passed in normal and fallback-off modes.
- `frontend/src/app.css` contains no `.board-comments {` block and retains
  `.board-comment-wrap` and `.review-card .comments`.
- Frozen `yona-original` CSS/LESS and generated fallback assets were not
  modified.

This is a bounded compatibility-selector retirement; global fallback
discovery remains incomplete.
