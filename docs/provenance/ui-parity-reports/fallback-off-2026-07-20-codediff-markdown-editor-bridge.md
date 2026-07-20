# Fallback-off report: codediff markdown-editor bridge

## Scope

Batch 586 removes only the unreachable `codediff-wrap` selectors whose
ancestor is `[data-toggle="markdown-editor"]` from `frontend/src/app.css`.
The base, native-button reset, hover/focus, and active-state arms were
removed. The adjacent `.codediff-wrap .review-container` tab rules remain.

## Evidence

- Current React commit detail and pull-request changes routes do not emit
  `data-toggle="markdown-editor"`; editor and review tab state is owned by
  React buttons and state handlers.
- `frontend/tests/project-code-commit-detail.e2e.ts` asserts source absence and
  retained review-tab selectors.
- `frontend/tests/legacy-fallback-off.e2e.ts` asserts exact app.css absence in
  both normal and fallback-off runs.
- Legacy Scala editor markup and plugin behavior remain unchanged in
  `yona-original/`; generated and frozen fallback CSS are not edited.

## Result

The removed selectors match no current React DOM. Review-card tabs retain the
same fallback selector family, so the code-diff review interaction remains
covered. No TSX, frozen source, generated fallback asset, or geometry baseline
changed. Global fallback discovery remains incomplete/non-green.
