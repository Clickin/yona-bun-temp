# Frontend Layout Parity Plan

## Goal

Restore all currently implemented non-test frontend screens so they preserve the `yona-original` layout, information architecture, and UI wording by default, while allowing only branding-level deltas such as logo, color scheme, and equivalent design tokens.

## Scope

- In scope: currently implemented non-test routes under `apps/app/src/routes/**/*.tsx`
- In scope: canonical docs and agent guidance that should enforce this rule going forward
- Optional in scope: a project-level skill, only if docs plus code structure do not sufficiently enforce the rule
- Out of scope for this batch: legacy screens not yet implemented in `apps/app`
- Out of scope for this batch: demo or temporary routes with no legacy equivalent, including `apps/app/src/routes/protected.tsx`

## Provenance Baseline

- Canonical parity goal: `SPEC.md`
- Frontend mirror guidance: `docs/agents/01-frontend-architecture.md`
- Agent workflow mirror: `docs/agents/05-agent-execution-guidelines.md`
- Legacy site shell: `yona-original/app/views/layout.scala.html`
- Legacy sidebar: `yona-original/app/views/sidebar.scala.html`
- Legacy project shell: `yona-original/app/views/projectLayout.scala.html`
- Legacy project header: `yona-original/app/views/project/header.scala.html`
- Legacy project menu: `yona-original/app/views/projectMenu.scala.html`
- Legacy organization shell: `yona-original/app/views/organizationLayout.scala.html`
- Legacy auth page reference: `yona-original/app/views/user/login.scala.html`

## Implementation Stages

### Stage 1 - Canonical rule and mirrors

- Red first:
  - Add or update a lightweight documentation assertion test or script that fails until the parity rule exists in all three canonical/mirror docs.
- Add a canonical rule to `SPEC.md` that implemented frontend screens must preserve `yona-original` layout, information architecture, and UI wording unless a deviation is explicitly recorded.
- Mirror the same rule in `docs/agents/01-frontend-architecture.md` and `docs/agents/05-agent-execution-guidelines.md`.
- Record that branding deltas may change logo, color palette, typography tokens, and equivalent styling, but must not move major regions, menus, primary actions, or permission-driven visibility.
- Record that legacy template HTML may be translated directly into React when necessary, but the final result must still be composed from reusable shell/section/form/menu components rather than one-off copied markup.

Success criteria:

- All three docs state the same parity rule.
- The wording distinguishes layout parity from literal legacy markup/CSS reuse.

Verification:

- Run `bun test tests/docs/frontend-layout-parity-docs.spec.ts` and expect exit code `0`.
- Read `SPEC.md`, `docs/agents/01-frontend-architecture.md`, and `docs/agents/05-agent-execution-guidelines.md` to confirm the wording is aligned.

### Stage 2 - Shared shell restoration

- Red first:
  - Add route or component parity tests for the root/site shell, auth shell, project shell, and organization shell before changing the implementation.
- Replace the temporary hero-card shell in `apps/app/src/routes/__root.tsx` and `apps/app/src/styles/app.css` with a parity-oriented site shell.
- Introduce shared React layout primitives for site, project, organization, and workspace shells only if they reduce repeated route-level layout code.
- Model the project shell after the legacy stack of navbar -> project header -> project menu -> page content.
- Model the workspace/site shell after the legacy site layout and sidebar split, adapted to current TanStack Start constraints.

Success criteria:

- Routes no longer depend on the current hero-card or generic panel-only baseline for page structure.
- Shared shells expose the major legacy regions needed by current routes.

Verification:

- Run `bun run --cwd apps/app test:unit -- "src/routes/__root.parity.spec.tsx" "src/routes/login.parity.spec.tsx" "src/routes/project-shell.parity.spec.tsx" "src/routes/organization-shell.parity.spec.tsx"` and expect exit code `0`.
- Run `lsp_diagnostics` on all changed shell files and require zero errors.

### Stage 3 - Project route cluster parity

- Red first:
  - Add project-cluster parity tests for overview, issue list/detail, discussion list/detail, pull request list/detail, code, branches, commit detail, and settings routes.
- Move the current project routes under `apps/app/src/routes/$owner/$projectName/**/*` onto the shared project shell.
- Restore page structure for the currently implemented project overview, issues, issue detail, discussions, discussion detail, pulls, pull request detail, code, branches, commit detail, and settings screens.
- Preserve current feature completeness limits, but align visible layout regions, menu/tab placement, and action placement with `yona-original`.

Success criteria:

- The project header and project menu are shared across implemented project screens.
- Current project pages no longer render as isolated single-card forms or lists.
- Permission-driven settings/admin affordances remain conditionally visible.

Verification:

- Run `bun run --cwd apps/app test:unit -- "src/routes/$owner/$projectName/index.parity.spec.tsx" "src/routes/$owner/$projectName/issues/index.parity.spec.tsx" "src/routes/$owner/$projectName/issues/$issueNumber.parity.spec.tsx" "src/routes/$owner/$projectName/discussions/index.parity.spec.tsx" "src/routes/$owner/$projectName/discussions/$postNumber.parity.spec.tsx" "src/routes/$owner/$projectName/pulls/index.parity.spec.tsx" "src/routes/$owner/$projectName/pulls/$pullRequestNumber.parity.spec.tsx" "src/routes/$owner/$projectName/code.parity.spec.tsx" "src/routes/$owner/$projectName/branches.parity.spec.tsx" "src/routes/$owner/$projectName/commit/$oid.parity.spec.tsx" "src/routes/$owner/$projectName/settings.parity.spec.tsx"` and expect exit code `0`.
- Run route-supporting tests that cover touched data helpers or loaders.
- Run `lsp_diagnostics` on all changed project route and shell files and require zero errors.

### Stage 4 - Auth, workspace, org, search, and profile parity

- Red first:
  - Add parity tests for the remaining implemented non-test routes before implementation changes.
- Move login/register/forgot-password/reset-password onto a site/auth layout aligned with the legacy auth pages.
- Restore workspace and profile pages to use a workspace-oriented shell rather than generic panels.
- Restore organization detail/settings and search to follow legacy region composition rather than generic stacked cards.
- Restore the remaining in-scope implemented non-test routes that still use generic wrappers: `apps/app/src/routes/index.tsx`, `apps/app/src/routes/projects/new.tsx`, and `apps/app/src/routes/organizations/new.tsx`.

Success criteria:

- All currently implemented non-test screens use parity-oriented shells.
- Temporary/demo-only routes remain explicitly excluded.

Verification:

- Run `bun run --cwd apps/app test:unit -- "src/routes/index.parity.spec.tsx" "src/routes/login.parity.spec.tsx" "src/routes/register.parity.spec.tsx" "src/routes/forgot-password.parity.spec.tsx" "src/routes/reset-password.parity.spec.tsx" "src/routes/me.parity.spec.tsx" "src/routes/me/settings.parity.spec.tsx" "src/routes/users/$loginId.parity.spec.tsx" "src/routes/search.parity.spec.tsx" "src/routes/projects/new.parity.spec.tsx" "src/routes/organizations/new.parity.spec.tsx" "src/routes/organizations/$organizationName/index.parity.spec.tsx" "src/routes/organizations/$organizationName/settings.parity.spec.tsx"` and expect exit code `0`.
- Run `bun run test` and expect exit code `0`.
- Run `bun run check` and `bun run build` and expect exit code `0`.
- Run `lsp_diagnostics` on all changed remaining route files and require zero errors.

### Stage 5 - Enforcement guardrail

- Evaluate whether a project-level skill materially improves compliance beyond the updated canonical docs and code structure.
- If yes, create a project-level skill that tells future agents to trace every frontend screen back to `yona-original` templates first and to limit visual changes to branding-level deltas.
- If no, document that the canonical docs are the enforcement mechanism and skip the skill.

Success criteria:

- Future frontend work has an explicit, reusable parity rule.

Verification:

- Read the final doc or skill artifact and confirm it points back to the canonical spec and legacy provenance paths.

## Execution Order

1. Stage 1 docs
2. Stage 2 shared shells
3. Stage 3 project route cluster
4. Stage 4 remaining implemented non-test screens
5. Stage 5 enforcement guardrail

## Atomic Commit Strategy

1. `docs: require yona-original layout parity for implemented frontend screens`
2. `test(ui): add red parity specs for shared site, auth, project, and organization shells`
3. `feat(ui): restore shared parity shells from legacy layout structure`
4. `test(ui): add red parity specs for implemented project routes`
5. `feat(ui): restore implemented project route layouts`
6. `test(ui): add red parity specs for remaining implemented non-test routes`
7. `feat(ui): restore remaining implemented route layouts`
8. `chore(skill): add yona frontend parity skill` only if Stage 5 decides the docs are insufficient

## Risks and Mitigations

- Scope expansion from "all screens" -> freeze scope to currently implemented non-test routes only.
- Rework from late shell changes -> land shared shells before per-page refinements.
- Over-modernization -> use legacy region order and menu placement as the baseline, not freeform redesign.
- Missing data for full legacy widgets -> preserve layout structure first and only surface real data that exists today.

## Done Definition

- Canonical docs and mirrors contain the new parity rule.
- All currently implemented non-test screens in `apps/app/src/routes` use parity-oriented shells.
- Changed files have clean diagnostics.
- Relevant tests pass.
- App-level build or check command passes.
