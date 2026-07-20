# Project issues selected-row class parity — 2026-07-20

The project issue list already owned checkbox geometry through route-local
StyleX. Live verification exposed a separate interaction regression: the row
assigned its legacy `post-item active` class and then spread hover/two-column
StyleX props, whose returned `className` overwrote the complete value.

The route now composes base, selected, hover, and two-column StyleX classes into
one `className`. No declaration, geometry, frozen CSS, or fallback asset was
changed. This preserves the legacy selected-row surface and keeps checkbox
selection React-owned.

Evidence:

- legacy `partial_list.scala.html` and `_page.less:3851-3871` establish the
  selected row and mass-update checkbox relationship;
- `project-issues-empty.e2e.ts` source guard prevents a later className spread;
- live focused Playwright checks pass for selected-row interaction and
  1440px/720px checkbox geometry.
