# Fallback-off report: `.yobicon-middle` StyleX ownership

Batch 760 moved the three active React consumers in the authenticated user
profile and organization project card into local StyleX owners. The owners
preserve `_common.less:191-194`: `vertical-align: bottom` and
`margin-bottom: 3px`.

The legacy icon DOM/classes remain evidenced by
`user/partial_projectlist.scala.html`, `project/list.scala.html`, and
`git/partial_forklist.scala.html`. The React-side app.css bridge is removed,
while generated `legacy-fallback.css` still contains `.yobicon-middle` for
historical consumers.

`frontend/tests/legacy-fallback-off.e2e.ts` verifies app.css absence and
generated-fallback retention in normal and fallback-disabled focused runs.
