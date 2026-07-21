# StyleX commit-detail inline-comment item parity — 2026-07-21

Batch 752 owns the emitted inline-comment list item only.

- Legacy DOM: `yona-original/app/views/partial_comment_thread.scala.html:51-54`
- Frozen declaration: `yona-original/app/assets/stylesheets/less/_page.less:5997-6004`
- React owner: `commit-detail-inline-comment-item`, applied only from `InlineCommentRow`
- StyleX declaration: `maxWidth: "1150px"`
- Retained fallback: shared thread-comment padding, non-emitted partial-diff utility/comment-box selectors, range/add/remove colors, and unrelated `.comments` consumers

`frontend/tests/project-code-commit-detail.e2e.ts` verifies source mapping,
StyleX ownership without inline style, visible comment copy, computed width, and
desktop/390px containment. The focused managed-port test passed 1/1 in both
normal and `VITE_DISABLE_LEGACY_FALLBACK=1` modes.
