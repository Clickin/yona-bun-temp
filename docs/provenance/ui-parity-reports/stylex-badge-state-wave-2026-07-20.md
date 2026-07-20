# Batch 655 badge state StyleX wave

The milestone detail and pull-request overview badge consumers now own the
frozen shared badge declarations through colocated StyleX.

Legacy evidence:

- yona-original/app/views/milestone/view.scala.html:42
- yona-original/app/views/git/partial_info.scala.html:29-34
- _page.less:2898-2910 and _variables.less:100-105

Owners:

- milestone-detail-state-badge: open/closed base and state paint
- pull-request-detail-badge: open/closed/rejected/merged/conflict base and
  state paint

The legacy badge classes, DOM, copy, order, and surrounding geometry remain.
The shared app.css family is intentionally retained until a separate exact
all-consumer fallback retirement proof is green.

Focused source/state tests passed for both routes in normal and
VITE_DISABLE_LEGACY_FALLBACK=1 modes, including desktop/mobile computed
declarations. Broader legacy DOM fixture failures remain unrelated pre-existing
canonicalization gaps in the pull-request nav and milestone route shell; they
are not attributed to this badge owner wave.
