# Fallback-off report: project-posts checkbox label StyleX ownership

Batch 761 moved the authenticated project-posts two-column mode label wrapper
to `styles.twoColumnModeLabel`. The owner carries only the frozen
`inline-block`, `vertical-align: top`, and `margin: 2px !important`
declarations from `_page.less:835-839`.

The legacy `label.checkbox` element, input id, copy, checked state, popover
interaction, and responsive parent hiding remain intact. The `checkbox` class
and shared fallback remain because other active routes still consume the
generic selector.

`stylex-project-posts-inline-residual.e2e.ts` passes 1/1 in normal and
fallback-disabled modes, covering source evidence, computed declarations,
desktop/mobile geometry, no inline style, and toggle/popover behavior.
