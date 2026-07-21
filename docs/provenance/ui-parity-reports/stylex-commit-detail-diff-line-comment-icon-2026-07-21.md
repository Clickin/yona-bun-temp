# StyleX commit-detail diff line comment icon parity — 2026-07-21

Batch 753 owns the emitted line-number comment icon base state only.

- Legacy DOM: `yona-original/app/views/partial_diff_line.scala.html:25-33`
- Frozen declaration: `yona-original/app/assets/stylesheets/less/_page.less:5907-5939`
- React owner: `commit-detail-diff-line-comment-icon`, applied only in `DiffLineView`
- StyleX declarations: absolute position, pointer cursor, opacity `0`, margin-left `-84px`, width `25px`, margin-top `2px`
- Retained fallback: parent-hover opacity, add/remove/context row hover paint, `discommentable`, and unrelated icon consumers

`frontend/tests/project-code-commit-detail.e2e.ts` verifies source mapping,
StyleX ownership without inline style, exact computed declarations, emitted
icon count, and desktop/390px containment. The focused managed-port test passed
1/1 in normal and `VITE_DISABLE_LEGACY_FALLBACK=1` modes.
