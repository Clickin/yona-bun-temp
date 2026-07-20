# Fallback-off report: dead issue-form picker bridge

Batch 596 retires only the source-less issue-form picker compatibility family
from `frontend/src/app.css`: the `.issue-label-trigger` width arm, custom
assignee selection/arrow rules, label selection/color/trigger rules, and
`.issue-project-utility-menu`. Current React issueform sources emit the
StyleX/generic combobox controls and none of these compatibility classes.

The issueform and formal `legacy-fallback-off.e2e.ts` static contracts assert
that the retired selectors are absent while shared combobox input/options
geometry remains in both normal and `VITE_DISABLE_LEGACY_FALLBACK=1` modes.
Frozen legacy CSS/LESS and generated fallback assets remain unchanged. This
bounded cleanup does not claim global fallback discovery completion.
