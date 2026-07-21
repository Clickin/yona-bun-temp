# Commit-detail adjacent ranged-thread spacing StyleX parity

Date: 2026-07-21

Legacy evidence is `yona-original/app/views/partial_comment_thread.scala.html:27-29` and frozen `yona-original/app/assets/stylesheets/less/_page.less:6128-6133`.

The existing `comment-thread-wrap` DOM and classes are preserved. Route-local StyleX carries only the frozen sibling margins: `10px` for a thread following another thread and `0px` for a thread following a folded thread. React parent state propagates fold/unfold changes to the adjacent ranged thread; legacy DOM-control JavaScript is not copied and generic fallback consumers remain retained.

Focused evidence: `frontend/tests/project-code-commit-detail.e2e.ts`; normal and `VITE_DISABLE_LEGACY_FALLBACK=1` runs both pass 1/1 at 1366px and 390px, asserting the initial folded `0px` margin and live unfolded `10px` transition.
