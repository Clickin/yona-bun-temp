# Commit-detail thread-inner StyleX proof — 2026-07-21

Batch 737 moves the exact inner visible declarations for authenticated
commit-detail review threads into route-local StyleX. Legacy
`partial_comment_thread.scala.html:47-96` emits the comments list, comment row,
media body, and ranged minimize control. Frozen `_page.less:6070-6085` defines
the comments `margin:0 5px`, comment `padding:2px 0`, media `background:#fff`,
and minimize `position:absolute; top:8px; right:10px` declarations.

The route preserves the legacy elements, classes, DOM order, and folded
`.btn-thread-here` affordance. `threadComments`, `threadComment`,
`threadMediaBody`, and `rangedThreadMinimize` own only those declarations for
commit-route output. PR changes and shared fallback consumers remain intact.

Focused contract:

- `frontend/tests/project-code-commit-detail.e2e.ts` — source mapping,
  computed inner declarations, minimize geometry, and desktop/390px
  containment.
- Managed normal run: 1 passed.
- Managed fallback-off run: 1 passed.
