# Fallback-off report: milestone-detail due-date clock `.mr3` ownership

Batch 763 moved the milestone-detail issue-row due-date clock's 3px right
margin into `styles.dueDateIcon` and removed `mr3` only from that React
emitter. The route preserves the legacy icon classes, due-date copy/title,
overdue/closed state, and responsive wrapper behavior.

The generic `.mr3` fallback remains for the project issues route and other
active consumers. Frozen `issue/partial_list.scala.html` and `_common.less:221`
remain unchanged.

`stylex-project-milestone-detail.e2e.ts` passes 1/1 in normal and
fallback-disabled modes, covering source evidence, computed margin,
no-inline-style, visible due-date state, and desktop/mobile geometry.
