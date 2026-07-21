# StyleX parity report: commit-detail review-card inner content

Batch 743 ports the commit-detail review-card inner content/date/comments
declarations to the existing route-local StyleX owner.

Evidence: `yona-original/app/views/code/diff.scala.html:131-141`,
`yona-original/app/views/git/partial_reviewlist.scala.html:31-47`, and frozen
`yona-original/app/assets/stylesheets/less/_page.less:6223-6250`.

The route preserves the `.content`, `.date`, and `.comments` elements, classes,
order, avatar/date output, and hash behavior. StyleX carries only the frozen
truncation, metadata color, and comments spacing declarations. The legacy dual
display declaration is represented with `stylex.firstThatWorks`; Chromium
computes the resulting display as `flow-root`. The commit diff markup has no
`.info` or outdated-label element, so those declarations remain fallback-owned.

The focused Playwright contract passes 1/1 in normal and fallback-disabled modes
at desktop and 390px viewports.
