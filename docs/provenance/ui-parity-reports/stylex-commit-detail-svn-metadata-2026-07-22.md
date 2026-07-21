# StyleX parity report: SVN commit-detail metadata

Batch 757 owns the remaining authenticated SVN metadata emitted by
`yona-original/app/views/code/svnDiff.scala.html:52-75`.

The frozen source block in `_page.less:4593-4615` defines the shared commit-id
color/margin/fixed font and `.commitInfo .ago` margin/color declarations.
The SVN route now composes the existing route-local StyleX owners on the
legacy `<p class="commitInfo">`, `.ago`, and `.commitId pull-right` elements:
`commit-detail-svn-info`, `commit-detail-svn-ago`, and
`commit-detail-svn-id`.

The plain `<pre class="commitMsg">`, generic `avatar-wrap`, and previously
migrated SVN `.diff-wrap` remain outside this batch. No legacy plugin behavior
was copied.

`frontend/tests/project-code-commit-detail.e2e.ts` verifies source mapping,
computed declarations, visible author/date/id/message, no inline styles, and
owner-relative desktop/390px geometry in normal and fallback-disabled modes;
both focused runs pass 1/1.
