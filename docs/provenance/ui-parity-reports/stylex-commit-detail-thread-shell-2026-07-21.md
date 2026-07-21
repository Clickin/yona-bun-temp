# Commit-detail thread-shell StyleX proof — 2026-07-21

Batch 736 moves the exact frozen shell declarations for authenticated
commit-detail ranged and non-ranged review threads into the commit route's
StyleX owner. Legacy `partial_comment_thread.scala.html:27-29` emits the
`.comment-thread-wrap` shell, while frozen `_page.less:6049-6057,6128-6133`
defines border, padding, background, max-width, position, and open/closed
inset shadows.

The route preserves the legacy wrapper element, classes, state/range hooks,
fold behavior, and thread DOM. `threadShell`, `threadShellOpen`, and
`threadShellClosed` own only those exact declarations for commit-route
wrappers. PR changes and other shared consumers retain the fallback; adjacent
thread spacing remains fallback-owned.

Focused contract:

- `frontend/tests/project-code-commit-detail.e2e.ts` — source mapping,
  computed shell declarations, open state, and desktop/390px containment.
- Managed normal run: 1 passed.
- Managed fallback-off run: 1 passed.
