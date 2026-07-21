# StyleX parity report: commit-detail review-card rail

Batch 742 ports the authenticated commit-detail review-card shell and state
rails to the existing route-local StyleX owner.

Evidence: `yona-original/app/views/git/partial_reviewlist.scala.html:27-45`,
`yona-original/app/views/code/diff.scala.html:131-159`, and frozen
`yona-original/app/assets/stylesheets/less/_page.less:6190-6222`.

The React `Link` keeps the legacy classes, hash navigation, content/date/avatar
order, and hover interaction. StyleX carries only the exact card geometry,
hover, and open/closed inset-shadow declarations; shared fallback consumers
remain enabled. The adjacent commit-detail comment form also preserves its
legacy class when composing conditional StyleX visibility.

The focused Playwright contract passed 1/1 in both normal and
fallback-disabled modes at desktop and 390px viewports.
