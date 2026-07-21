# Commit-detail ranged-thread header StyleX proof — 2026-07-21

Batch 735 completes the next exact visible declaration in the authenticated
commit-detail ranged review-thread state. The legacy output in
`yona-original/app/views/partial_comment_thread.scala.html:43-46` emits the
`.thread-header` and nested `.badge state`; frozen
`yona-original/app/assets/stylesheets/less/_page.less:6049-6063` defines the
header `padding: 5px 10px 10px 10px` and badge `margin:0; padding:2px 10px`.

The React route preserves the legacy header/badge classes, state copy, DOM
order, and minimize control. `rangedThreadHeader` and the existing
`rangedThreadBadge` in
`frontend/src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts`
own only those frozen declarations. PR changes and non-ranged thread
consumers retain the shared fallback.

Focused contract:

- `frontend/tests/project-code-commit-detail.e2e.ts` — source mapping,
  computed header/badge declarations, desktop/390px containment.
- Managed normal run: 1 passed.
- Managed fallback-off run: 1 passed.
