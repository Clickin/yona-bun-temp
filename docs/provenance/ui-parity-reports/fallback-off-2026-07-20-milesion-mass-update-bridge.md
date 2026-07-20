# Fallback-off report: milestone mass-update button bridge

## Scope

Batch 592 retires only the unreachable React-side
`.milesion-wrap .mass-update-list > li > button` base and hover/focus arms
from `frontend/src/app.css`.

## Evidence

- Current React issue and milestone mass-update option controls are typed
  `button` elements and milestone options are owned by
  `styles.massUpdateButton` in `-milestone-detail.stylex.ts`.
- No current `frontend/src` route emits the typo-preserved `.milesion-wrap`
  mass-update button bridge.
- The frozen Scala partial and frozen LESS remain unchanged as legacy DOM/UX
  evidence; generated fallback CSS remains unchanged.
- The standalone `.milesion-wrap .item-count-groups > button.sharer-color`
  selector remains because it is a separate compatibility arm.

## Verification

`stylex-project-milestone-mass-update-buttons.e2e.ts` and the matching
`legacy-fallback-off.e2e.ts` static contract pass in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. The contracts assert exact absence of
the retired selector arms, retained sharer fallback, and StyleX declaration
ownership.

No TSX, frozen source, generated fallback asset, or geometry baseline changed.
