# Shared avatar-wrap consumer-graph decision

Batch 846 is a bounded no-change audit for the shared avatar family.

Frozen source of truth:

- `yona-original/app/assets/stylesheets/less/_yobiUI.less:439-466` defines
  the base `.avatar-wrap` and nested `img` declarations.
- Frozen `_page.less` contains additional descendant/avatar consumers at
  lines `1286`, `1847-1860`, `1920`, `3387`, `3873`, `4334`, `4602`, `4923`,
  `5322`, `5423`, and `6419`.
- The React-side base/image bridge remains in `frontend/src/app.css:570-598`.

The read-only React inventory finds `avatar-wrap` emitters across project,
issue, commit, code, pull-request, user, search, organization, import, UI-kit,
and authenticated/anonymous home surfaces. The organization-home
member-panel avatar wrapper/image was independently owned in Batch 845, but
the global family still serves unrelated consumers and descendant selectors.

Retiring the global bridge or generated fallback now would be an unsupported
broad deletion. No selector, route, frozen source, or generated artifact was
changed in this batch. The fallback remains enabled by default, and a complete
all-consumer StyleX owner graph is required before another retirement attempt.
This evidence batch has no route implementation and therefore no Scala audit
row or screenshot-parity claim.
