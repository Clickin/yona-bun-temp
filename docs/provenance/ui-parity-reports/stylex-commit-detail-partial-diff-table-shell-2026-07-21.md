# StyleX commit-detail partial-diff table shell parity — 2026-07-21

Batch 754 owns the emitted code scroll/table shell.

- Legacy DOM: `yona-original/app/views/partial_filediff.scala.html:158-170`
- Frozen declarations: `yona-original/app/assets/stylesheets/less/_page.less:5887-5905`
- React owners: existing `commit-detail-file-code` plus `commit-detail-diff-partial-table`
- StyleX declarations: `overflow:auto`, `overflow-x:auto`, `overflow-y:hidden`, table `width:100%`, `border-collapse:separate`, and `border-spacing:0`
- Retained fallback: non-emitted patch-header paths, partial-diff utility, range/add/remove colors, and unrelated table consumers

`frontend/tests/project-code-commit-detail.e2e.ts` verifies source mapping,
StyleX ownership without inline styles, computed overflow/table declarations,
visible diff rows, and owner-relative desktop/390px geometry. The focused
managed-port test passed 1/1 in normal and `VITE_DISABLE_LEGACY_FALLBACK=1`
modes.
