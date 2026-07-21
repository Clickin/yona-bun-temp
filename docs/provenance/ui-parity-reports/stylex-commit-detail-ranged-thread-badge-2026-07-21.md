# Commit-detail ranged-thread badge StyleX proof — 2026-07-21

Batch 734 moves the authenticated commit-detail ranged discussion badge's
exact frozen spacing into the route-local StyleX owner. The legacy template
emits `.thread-header` with a `.badge state` span in
`yona-original/app/views/partial_comment_thread.scala.html:29-48`; frozen
`yona-original/app/assets/stylesheets/less/_page.less:6048-6063` supplies
`margin:0` and `padding:2px 10px`.

The React route keeps the legacy state classes, copy, header structure, and
thread controls. `rangedThreadBadge` in
`frontend/src/routes/$ownerName/$projectName/commit/-commit-detail.stylex.ts`
owns only the two frozen declarations. The shared badge fallback remains for
other consumers.

Focused contract:

- `frontend/tests/project-code-commit-detail.e2e.ts` — ranged badge source
  mapping, visibility, computed margin/padding, and header containment at
  1366px and 390px.
- Managed normal run: 1 passed.
- Managed fallback-off run: 1 passed.

The pre-existing larger inline-diff test remains outside this bounded proof;
its stale delete/canonicalizer flow is unrelated to the ranged badge owner.
