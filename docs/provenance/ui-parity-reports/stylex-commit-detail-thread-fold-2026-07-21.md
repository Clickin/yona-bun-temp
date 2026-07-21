# Commit-detail closed ranged-thread fold StyleX parity

Date: 2026-07-21

Legacy evidence is `yona-original/app/views/partial_comment_thread.scala.html:27-29,39-47` and frozen `yona-original/app/assets/stylesheets/less/_page.less:6090-6126`.

The implementation preserves the legacy `comment-thread-wrap closed fold` wrapper, folded-here button, ranged header, comments list, reply form, and button classes. React state/events provide the fold toggle; no legacy DOM-control script is copied. StyleX carries only the frozen static reset, hidden descendant display, folded-here placement, and open/closed three-pixel left-border declarations. Generic fallback consumers remain retained.

Focused evidence: `frontend/tests/project-code-commit-detail.e2e.ts`; normal and `VITE_DISABLE_LEGACY_FALLBACK=1` runs both pass 1/1 at 1366px and 390px, including fold/unfold visibility and interaction.
