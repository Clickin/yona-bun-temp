# Fallback-off report: project-issues due-date clock `.mr3` ownership

Batch 762 moved the populated project issue-list due-date clock's 3px right
margin into `styles.dueDateIcon`. The route preserves the legacy icon element,
`yobicon-clock2` and `vmiddle` classes, due-date copy/title, overdue state, and
responsive wrapper behavior.

The generic `.mr3` fallback remains because milestone and other active issue
consumers still use it. Frozen `issue/partial_list.scala.html` and
`_common.less:221` remain unchanged.

`project-issues-empty.e2e.ts` passes 1/1 in normal and fallback-disabled modes,
covering source evidence, computed margin, desktop/mobile geometry, no inline
style, and visible overdue copy.
