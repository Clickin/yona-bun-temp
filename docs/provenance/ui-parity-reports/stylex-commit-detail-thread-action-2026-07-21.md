# Commit-detail thread-action StyleX proof — 2026-07-21

Batch 738 completes the exact visible action-row spacing for authenticated
commit-detail thread replies. Legacy
`partial_comment_form_on_thread.scala.html:55-68` emits the reply action
buttons and `thread-actrow` fallback branch; frozen `_page.less:6084-6087`
defines right alignment and `padding:5px 5px 10px`.

The React route retains the existing action container, buttons, copy, order,
and thread-state toggle/submit behavior. `threadActions` adds only the frozen
padding to the existing right-aligned `commit-detail-thread-actions` owner.
Shared fallback and fold behavior remain intact.

Focused contract:

- `frontend/tests/project-code-commit-detail.e2e.ts` — legacy partial/LESS
  mapping, computed padding/alignment, and desktop/390px containment.
- Managed normal run: 1 passed.
- Managed fallback-off run: 1 passed.
