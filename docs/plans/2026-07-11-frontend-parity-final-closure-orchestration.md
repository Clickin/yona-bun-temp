# Frontend Legacy Parity Final Closure Orchestration

Status: current new-session handoff directive
Date: 2026-07-11
Scope: legacy Yona user-visible frontend functional/UI parity closure

## 1. Objective

Close the remaining distance between the current React SPA and legacy Yona so a
legacy user can migrate in place without noticing a user-visible difference.

This is not a product-improvement phase. The source of truth is
`yona-original/`, in this order:

1. Scala HTML root template and included partials
2. the full transitive LESS import chain
3. legacy `conf/messages*` copy
4. controller/model behavior and legacy JavaScript as behavior evidence
5. a real legacy browser render at `http://127.0.0.1:9000`

The comparison excludes implementation-only substitutions:

- jQuery, Select2, Bootstrap plugin initialization, and template-engine-only
  attributes
- direct DOM mutation replaced by React state/events/refs
- server-rendered fragments replaced by REST JSON plus React render
- raw internal anchors replaced by TanStack Router `Link`
- side-effect anchors replaced by `button type="button"` plus TanStack Query
  mutations

Those substitutions are acceptable only when visible role, copy, order,
geometry, focus, URL/deep-link behavior, validation, permission state, and
mutation results remain equivalent.

## 2. Model Allocation Constraint

Preferred allocation when the launching surface supports per-agent model
selection:

| Role | Preferred model | Responsibility |
| --- | --- | --- |
| Main strategist | `gpt-5.6-sol-ultra` | queue selection, legacy interpretation, worker prompts, review, browser comparison, integration, commit |
| Screen worker | `gpt-5.6-luna-medium` | one route plus one visible state, focused E2E, bounded React implementation |
| Mechanical worker | `gpt-5.5-medium` | read-only inventory, deterministic type-error clustering, source/evidence lookup |
| Independent verifier | `gpt-5.6-luna-medium` | read-only legacy/local comparison and pass/fail report |

The current Codex `spawn_agent` interface exposes only task name, message, and
context forking. It does not expose a `model` or reasoning-level parameter.
Therefore the current session cannot enforce the worker model. A new session or
launcher may use the preferred allocation only if that surface explicitly
offers per-agent model selection. Otherwise use the platform-selected worker
model while keeping every assignment small enough for a medium model.

Do not claim a particular worker model unless the launcher shows that model was
actually selected.

## 3. Operating Model

Do not use a long unattended `/goal`. Run this as a supervised session with the
main agent retaining the complete objective and checking state after every
screen commit.

There are four logical slots:

1. main strategist/integrator
2. one bounded writer
3. one read-only legacy mapper
4. one read-only browser/evidence verifier

Use only one writer in the shared worktree at a time. The mandatory turn hook
uses `git add -A`; multiple concurrent writers would mix independent screens
into one commit and violate the one-screen Scala HTML guard. Parallelize
read-only mapping and verification, not shared-worktree writes.

The main agent must:

- select one route and one visible state
- provide exact legacy sources and exact allowed write files
- reject output based on the existing React DOM instead of Scala HTML
- inspect the diff and browser result itself
- add or review the single provenance row
- run the mandatory verification and commit hook
- keep the worktree clean before assigning the next writer

Workers must never stage, commit, edit sibling routes, or broaden architecture.

## 4. Current Baseline

Known positive evidence at this handoff:

- sampled route mapping: 129/129 legacy URLs have a generated React route
- production Vite build passes
- the project issue-create screen has current `/yona` and `/team/yoram`,
  desktop/mobile, ko-KR, functional, and geometry evidence
- first-priority application functionality is broadly present

Known blockers to a 100% claim:

- `pnpm --dir frontend check --pretty false` reports 222 TypeScript errors
- the current UI parity contract set passes 57/59; visual audit import and
  status-delta provenance are stale
- current rendered-E2E inventory finds navigation evidence for 120/129 sampled
  routes and expected legacy signals for 93/129
- the latest integrated visual artifact predates current HEAD and reports
  local 189/334 passed with 145 failures; this is not a current defect count,
  but it is unusable as closure evidence
- desktop/mobile, language, role, and nested context-path coverage is not yet a
  complete cross-product
- the current frontend audit retains issue list/detail as P0 re-verification
  candidates and global shell, milestone, and scoped search as P1 candidates

Known user-visible behavior gaps or high-confidence candidates:

1. Login does not normalize a same-origin absolute legacy `Referer` to a local
   path.
2. Historical arbitrary `loginDefaultPage` values outside the bounded safe
   allowlist fall back to `/`.
3. Context-path handling is not globally closed. Current examples include the
   first-run form `action="/"`, fork-completion redirect projection, and
   route-local fallback asset/Markdown URLs.
4. `/migration` keeps a disabled Yona-to-GitHub shell. This remains explicit
   second-priority/external-tool scope and prevents a literal claim that every
   legacy product feature is active.

## 5. Work Queue

Run the queue in this order. Do not begin a later stage while an earlier gate is
red unless the main agent records a concrete dependency reason.

### Stage A: Refresh Read-Only Truth

Assign three read-only workers in parallel:

- A1: classify all 222 TypeScript errors by root cause and route owner; do not
  edit files
- A2: refresh the 129-route rendered-E2E/legacy-signal gap list and distinguish
  scanner false negatives from missing tests
- A3: inspect the latest legacy/local desktop and mobile artifacts and produce
  a route/state rerun queue; do not treat `diffFailures: 0` as pixel parity

The main agent consolidates these into a short ordered queue. No evidence-only
commit is created.

### Stage B: Close Cross-Cutting Functional Gaps

Run one writer task and one commit at a time:

1. Login same-origin absolute `Referer` parity
2. First-run `/secret` context-path form/action parity
3. Fork completion redirect context-path parity
4. Route-local fallback asset and Markdown URL inventory, followed by one route
   owner per fix
5. Historical `loginDefaultPage` evidence audit; add only legacy-evidenced safe
   destinations and keep open-redirect protection

Shared helpers may be changed only when at least two concrete legacy routes
prove the same behavior. Do not create a new routing abstraction speculatively.

### Stage C: Restore a Green Typed Router Boundary

Use the A1 clustering result. Fix one route owner at a time with its focused E2E
and audit row. Prioritize errors that indicate real behavior risk:

- wrong React event types
- missing or invalid TanStack search parameters
- external URLs passed through the internal `to` contract
- dynamic string URLs bypassing typed route/search contracts
- base-path-unsafe history pushes
- stale legacy marker search objects leaking into validated search types

Do not silence errors with broad casts, `any`, `@ts-ignore`, or a weaker route
schema. Stage C closes only when `pnpm --dir frontend check --pretty false`
reports zero errors.

### Stage D: Rebuild/Re-verify High-Risk Screens

Use one writer at a time. Read-only mapper/verifier roles may run in parallel.

1. Project issue list
   - empty/loading/error and permission states
   - quick search and advanced search
   - populated/draft/subtask rows
   - bulk update and pagination
2. Project issue detail
   - body/sidebar/actions
   - comments, child comments, edit/delete/vote
   - timeline event variants and subtasks
   - attachment/editor/modal/focus states
3. Global/root shell
   - anonymous, authenticated, guest, member, and site-admin states
   - left/right menus, search scopes, feedback, login dialog, footer
4. Milestone list/detail/create/edit
5. Global, project, and organization search, serialized because they share the
   search view owner
6. Evidence-gap routes identified by Stage A, initially including public
   profile, new milestone form, and reviews

If the current TSX skeleton differs from Scala HTML, replace the screen-level
skeleton. Do not preserve it with CSS-only or metric-only patches.

### Stage E: Integrated Closure

After all screen commits:

1. run the full frontend typecheck, unit tests, production build, and every E2E
   file
2. run route, anchor, Scala HTML, design, RC UX, and legacy parity contracts
3. run the current HEAD against legacy `:9000` and Yoram at `/`, `/yona`, and
   `/team/yoram`
4. compare desktop and mobile for every active page family and every fragile
   state
5. run all supported languages for raw-key, overflow, and navigation smoke;
   perform full side-by-side visual review for en-US and ko-KR and fragile
   navbar/form checks for ja-JP, ru-RU, and uz-UZ
6. classify every legacy non-2xx/sample-data difference; leave no unclassified
   status delta
7. inspect legacy/local screenshots with a human or vision-capable verifier

## 6. Mechanical Worker Prompt Template

Use this template verbatim and fill every bracket. Do not give a medium worker a
whole feature family.

```text
You are the bounded implementation worker for exactly one legacy Yona screen
state.

Objective:
- Route/state: [EXACT URL, role, data state, viewport, language]
- User-visible defect: [ONE concrete mismatch]

Legacy source of truth:
- Root Scala HTML: [PATH]
- Included partials: [PATHS]
- LESS import chain: [PATHS]
- Messages: [KEYS/FILES]
- Legacy JS/controller evidence: [PATHS AND BEHAVIOR ONLY]

Allowed writes:
- [ONE route TSX]
- [ONE focused E2E]
- [OPTIONAL one directly owned API/CSS file only if explicitly granted]

Forbidden writes:
- every sibling route and E2E
- shared provenance file; return the proposed row text to the main agent
- migrations, entities, schema, unrelated backend files
- package/dependency/config changes

Implementation rules:
- Scala HTML/LESS/messages define output DOM/UX.
- Legacy JS defines behavior evidence only.
- Use React state/events/refs and TanStack Router/Query.
- Do not add jQuery, direct document/window DOM mutation, raw internal anchors,
  dangerouslySetInnerHTML, plugin-only attributes, broad casts, or new UX.
- Ignore implementation-only attribute differences; preserve visible copy,
  role, order, geometry, focus, URL, permission, error, and mutation results.
- Respect arbitrary configured context paths.

Required steps:
1. Read every listed legacy source before editing.
2. State the expected legacy DOM/order/behavior in five or fewer bullets.
3. Add or update a focused E2E and demonstrate RED for the stated mismatch.
4. Implement only the stated screen state.
5. Run focused E2E, oxfmt, oxlint, and changed-file TypeScript diagnostics.
6. Capture desktop/mobile legacy and local metrics plus screenshots when the
   screen is responsive.
7. Return: cause, files changed, tests and exact counts, screenshots, remaining
   risks, and one proposed provenance row.

Stop and report without editing if:
- a required legacy source is missing,
- the fix requires a sibling route/shared abstraction not granted above,
- current user changes overlap an allowed file,
- the legacy behavior is ambiguous,
- the focused E2E cannot establish a user-visible RED state.

Do not stage or commit.
```

## 7. Main-Agent Review Checklist

Before accepting a worker patch, the main agent verifies:

- diff is inside the assigned write scope
- legacy skeleton, copy, and LESS ownership were actually consulted
- no test was rewritten merely to accept the existing React output
- no jQuery/plugin/direct-DOM implementation was copied
- no user-visible legacy behavior was discarded as an implementation detail
- internal navigation uses TanStack Router and side effects use React/Query
- context path is applied exactly once
- error, empty, loading, permission, focus, and mutation states are covered
- desktop/mobile geometry has containment, alignment, and no-overlap evidence
- real legacy and local screenshots were visually inspected
- the proposed audit row names the root template, partials, route, and E2E

Reject and reassign a smaller task if any item is unclear.

## 8. Commit Protocol

For every accepted screen:

1. main agent adds/reviews exactly one row in
   `docs/provenance/frontend-scala-html-goal-violation-audit.md`
2. main agent runs focused verification
3. main agent confirms no schema/entity/migration file changed
4. main agent runs, outside the sandbox:

   `pnpm agent:turn-commit -- -m "<one-screen parity summary>"`

5. main agent confirms the worktree is clean before starting the next writer

Never use Scala HTML exception markers in unattended work.

## 9. Definition Of 100% Frontend Parity

Do not use “100%” until all conditions hold on the same current HEAD:

- zero active user-visible `gap`, `deviation`, or unclassified `deferred` rows
  inside the claimed scope
- all generated legacy routes are mapped and every active route/state has
  rendered E2E evidence
- all expected legacy visible signals are covered or explicitly proven dormant
- TypeScript check, unit tests, production builds, all E2E files, RC UX, and
  parity contracts are green
- integrated legacy/local sweep has zero unexplained local failures, missing
  imported audit pages, and unclassified status deltas
- desktop/mobile, role, language, and context-path matrices are complete
- every active screen family has real legacy/local visual confirmation, not
  only selector or bounding-box evidence
- all known context-path and authentication redirect gaps are closed
- second-priority legacy product functions are either implemented or excluded
  explicitly from the claim; “100% legacy product” cannot silently exclude
  `/migration` or another user-visible legacy feature

Until then, report the narrower truth: “implemented broadly, verified per
closed screen, global parity closure still in progress.”

## 10. New-Session Bootstrap Prompt

```text
Read AGENTS.md, SPEC.md Sections 6-8, DESIGN.md,
docs/agents/01-frontend-architecture.md,
docs/agents/02-testing-migration.md,
docs/agents/05-agent-execution-guidelines.md,
.agents/skills/port-yona-screen/SKILL.md, and
docs/plans/2026-07-11-frontend-parity-final-closure-orchestration.md.

Act as the main strategist and integrator. Do not use /goal. Preserve the
legacy Yona functional/UI parity objective across the session. If the launcher
supports model selection, use gpt-5.6-sol-ultra for the main agent,
gpt-5.6-luna-medium for one-screen writers/verifiers, and gpt-5.5-medium for
mechanical read-only inventory. Never claim a worker model that the launcher
did not expose.

Start with Stage A read-only audits. Use only one shared-worktree writer at a
time. Give every writer the exact mechanical prompt contract from Section 6.
You own review, visual comparison, provenance integration, all verification,
and every commit. Continue until the Definition of 100% Frontend Parity is
satisfied or a concrete user decision is required.
```
