# Fallback-off report: dead grouped GNB user-menu item arm

Batch 604 removes only the `.gnb-usermenu > li` arm from the grouped
`.gnb-nav > li, .gnb-usermenu > li` rule in `frontend/src/app.css`.
The live `.gnb-nav > li` declaration and later standalone `.gnb-usermenu > li`
declaration remain, preserving authenticated and anonymous menu geometry.
Frozen legacy sources and generated fallback CSS remain unchanged as evidence.

The authenticated user-menu and formal fallback-off contracts assert the grouped
arm is absent while both standalone declarations remain in normal and
`VITE_DISABLE_LEGACY_FALLBACK=1` modes. This bounded cleanup does not claim
global fallback discovery completion.
