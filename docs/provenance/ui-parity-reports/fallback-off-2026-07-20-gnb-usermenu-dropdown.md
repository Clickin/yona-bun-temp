# Fallback-off report: authenticated user-menu dropdown declaration bridge

Batch 603 removes only the redundant `.gnb-usermenu-dropdown` base
color/font-size declaration and its max-width-720 color arm from
`frontend/src/app.css`. The semantic class remains on the authenticated
user-menu container, while `AuthenticatedSiteUserMenu` owns matching
presentation through StyleX. The `.gnb-usermenu-item` responsive color arm,
other usermenu selectors, frozen sources, and generated fallback remain.

`stylex-authenticated-user-menu.e2e.ts` and the formal `legacy-fallback-off`
contract assert exact app.css absence, retained item media declaration,
generated fallback evidence, and stable owner in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. This bounded cleanup does not claim
global fallback discovery completion.
