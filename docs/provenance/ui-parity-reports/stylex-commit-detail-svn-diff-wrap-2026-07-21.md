# Commit-detail SVN diff-wrapper StyleX parity — 2026-07-21

Batch 755 owns the authenticated SVN commit-detail wrapper emitted by
`yona-original/app/views/code/svnDiff.scala.html:96-98`:

```html
<div class="diff-wrap">
    <div id="commit" data-commit-origin="true" class="diff-body hide">@patch</div>
</div>
```

The frozen declaration source is
`yona-original/app/assets/stylesheets/less/_page.less:4613-4615`:

```less
.diff-wrap {
    width:100%; overflow:auto; margin-bottom:20px;
}
```

`SvnCommitDetailBody` now applies the colocated `diffWrap` StyleX owner while
retaining `diff-wrap`, the hidden-origin diff body, patch copy, and existing
branch/watch/list behavior. No Git diff wrapper or shared fallback selector was
changed.

`frontend/tests/project-code-commit-detail.e2e.ts` verifies the source mapping,
owner/class composition, absence of inline style, visible patch text, computed
width/overflow/margin, and owner-relative desktop/mobile containment. The
managed-port focused test passes 1/1 in normal mode and 1/1 with
`VITE_DISABLE_LEGACY_FALLBACK=1` (explicit 60-second startup-safe timeout).
