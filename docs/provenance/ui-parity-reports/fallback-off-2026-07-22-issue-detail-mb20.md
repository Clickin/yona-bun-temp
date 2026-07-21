# Fallback-off parity: issue-detail sidebar `.mb20`

Batch 765 owns the legacy issue-detail sidebar bottom spacing in the existing
route-local StyleX owner. The frozen sources are
`yona-original/app/views/issue/view.scala.html:293` and
`yona-original/app/assets/stylesheets/less/_common.less:212`.

Normal focused E2E passes with the legacy responsive cascade: the sidebar is
visible at desktop width, hidden at the frozen mobile breakpoint, retains its
legacy structural classes/content, and computes `margin-bottom: 20px` without
an inline style. Fallback-off focused E2E passes with the StyleX owner and
declaration, computed `margin-bottom: 20px`, no inline style, and valid
non-negative geometry without assuming that the legacy responsive hide cascade
is available.
