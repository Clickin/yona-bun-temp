# Phase 0B Blocker Reconciliation

## TL;DR
> **Summary**: Reconcile stale Phase-0B blocker/provenance docs with the current repo, then close the remaining true blockers with a bounded PR/review exemplar and a bounded permission-filtered search exemplar.
> **Deliverables**:
> - Phase-0B provenance/docs updated to mark enrollment/workspace as implemented and PR/search as the remaining true blockers
> - Pull-request exemplar hardened to legacy-backed open/close/reopen authorization and review-thread read/filter baseline
> - Search exemplar shipped with multi-dialect DB-native FTS infrastructure, permission-scoped queries, snippets, and a query-driven app surface
> **Effort**: Large
> **Parallel**: YES - 3 waves
> **Critical Path**: T1/T2/T3/T4 -> T5/T6/T7/T8 -> T9/T10/T11/T12

## Context
### Original Request
- Review `SPEC.md`, `AGENTS.md`, and `docs/`, then create the next execution plan.

### Interview Summary
- `SPEC.md` is canonical; `docs/agents/*.md` are execution mirrors.
- `docs/agents/06-phase-plan.md` and `docs/agents/10-legacy-provenance-baseline.md` still frame Phase 0B/1 sequencing.
- Current repo state already contains enrollment/workspace implementation and tests in `packages/domain/src/enrollment-service.ts`, `packages/domain/src/user-workspace-service.ts`, `packages/db/src/personal-workspace.spec.ts`, `apps/app/src/lib/enrollment-trpc.spec.ts`, and `apps/app/src/lib/me-trpc.spec.ts`.
- Current PR implementation is only a thin baseline in `packages/domain/src/pull-request-service.ts`, `packages/db/src/pull-requests.ts`, `apps/app/src/lib/pull-request-trpc.spec.ts`, `apps/app/src/routes/$owner/$projectName/pulls/index.tsx`, and `apps/app/src/routes/$owner/$projectName/pulls/$pullRequestNumber.tsx`.
- No app/package search implementation files were found; search remains a true missing slice.

### Metis Review (gaps addressed)
- Bound the PR exemplar to legacy-backed open/close/reopen authorization plus review-thread read/filter semantics; explicitly defer full Phase-4 PR/reviewer/merge parity.
- Bound the search exemplar to a minimal multi-type, permission-filtered slice; explicitly defer full Phase-5 search parity and AI-facing search surface.
- Use exact repo commands from existing package scripts for acceptance criteria wherever possible.
- Make doc reconciliation agent-verifiable instead of relying on narrative-only completion claims.

## Work Objectives
### Core Objective
- Restore trust in Phase-0B planning artifacts, then complete the remaining true blockers with the smallest legacy-faithful PR/review and search slices that unblock future Phase 4/5 work without overclaiming parity.

### Deliverables
- Updated Phase-0B blocker inventory and provenance docs in `docs/agents/10-legacy-provenance-baseline.md`, `docs/provenance/phase-0b/README.md`, `docs/provenance/phase-0b/legacy-test-inventory.md`, and `docs/provenance/phase-0b/project.md`.
- New Phase-0B PR/review provenance doc and new Phase-0B search provenance doc.
- PR state-transition and review-thread exemplar tests and implementation in `packages/contracts`, `packages/domain`, `packages/db`, and `apps/app`.
- Search snippet helper, search projection schema, dialect-specific FTS infrastructure, permission-scoped search helpers, and query-driven app search surface.

### Definition of Done (verifiable conditions with commands)
- `bun run check`
- `bun run test:db`
- `bun run test:db:node`
- `bun run --cwd packages/contracts test`
- `bun run --cwd packages/domain test`
- `bun run --cwd apps/app test:unit`
- `rg -n "workspace recent/favorite/default landing implementation|PR state machine|review thread|search exemplar implementation" docs/provenance/phase-0b docs/agents`

### Must Have
- Keep `SPEC.md` canonical and update only the mirror/provenance docs needed to reflect actual blocker status.
- Preserve the existing implementation evidence for enrollment/workspace; do not regress or re-plan completed work as if it were missing.
- Use failing Red tests derived from the listed legacy sources before Green implementation for PR/review and search.
- Keep all new long-term ownership inside `apps/app`, `packages/contracts`, `packages/db`, and `packages/domain`.
- Apply permission filtering inside SQL for search before ranking, counts, and pagination.
- Use DB-native FTS per dialect: PostgreSQL `tsvector + GIN`, MySQL/MariaDB `FULLTEXT`, SQLite `FTS5 external-content + triggers`.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- Do not treat `packages/api`, `packages/core`, or `packages/infra` as new ownership targets.
- Do not expand the PR slice to full merge orchestration, reviewer thresholds, reviewer assignment UI, or diff/commit composition beyond what the bounded exemplar proves.
- Do not expand the search slice to all legacy result types; this plan explicitly limits the exemplar to `project`, `issue`, `posting`, `review_comment`, and `user`, and defers `issue_comment`, `posting_comment`, and `milestone`.
- Do not promise identical search scores, stemming, tokenizer behavior, or stopword behavior across dialects.
- Do not post-filter search results in application code after DB ranking/counting.
- Do not rewrite historical `docs/workflow/*` artifacts unless a file explicitly claims current authority.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: TDD / tests-first using existing Vitest and Bun test infrastructure
- QA policy: Every task includes agent-executed happy-path and failure/edge scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. Shared scope decisions are extracted into Wave 1 so later work can proceed in parallel.

Wave 1: blocker reconciliation, provenance freezing, bounded-scope lock, and Red-test scaffolding
Wave 2: PR/review exemplar implementation
Wave 3: search contracts, multi-dialect infrastructure, permission-scoped behavior, app wiring, and final doc/deviation sync

### Dependency Matrix (full, all tasks)
- T1 blocks T2, T3, T4.
- T2 blocks T5, T7.
- T3 and T4 block T9 and T10.
- T5 blocks T6.
- T7 blocks T8.
- T9 blocks T10 and T11.
- T10 blocks T11.
- T8 and T11 block T12.

### Agent Dispatch Summary (wave -> task count -> categories)
- Wave 1 -> 4 tasks -> `writing`
- Wave 2 -> 4 tasks -> `unspecified-high`, `deep`
- Wave 3 -> 4 tasks -> `deep`, `unspecified-high`

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Audit blocker truth and correct Phase-0B inventory

  **What to do**: Compare current repo code/tests against the blocker claims in `docs/agents/10-legacy-provenance-baseline.md`, `docs/provenance/phase-0b/README.md`, `docs/provenance/phase-0b/legacy-test-inventory.md`, and `docs/provenance/phase-0b/project.md`. Update those docs so enrollment/workspace are marked as implemented evidence-backed slices, and PR/search are clearly identified as the remaining true blockers.
  **Must NOT do**: Do not change `SPEC.md`. Do not claim full Phase-0B exit. Do not delete historical context that still explains why the stale wording existed.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: This is provenance reconciliation with repo-backed evidence, not feature implementation.
  - Skills: [] - Existing docs and repo evidence are sufficient.
  - Omitted: [`git-master`] - No git history work is required.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: T2, T3, T4 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - Canonical mirror: `docs/agents/10-legacy-provenance-baseline.md`
  - Phase-0B blocker home: `docs/provenance/phase-0b/README.md`
  - Blocker inventory: `docs/provenance/phase-0b/legacy-test-inventory.md`
  - Stale project provenance note: `docs/provenance/phase-0b/project.md`
  - Enrollment evidence: `packages/domain/src/enrollment-service.ts`
  - Enrollment tests: `packages/domain/src/enrollment-service.spec.ts`
  - Enrollment app boundary tests: `apps/app/src/lib/enrollment-trpc.spec.ts`
  - Workspace evidence: `packages/domain/src/user-workspace-service.ts`
  - Workspace DB tests: `packages/db/src/personal-workspace.spec.ts`
  - Workspace app boundary tests: `apps/app/src/lib/me-trpc.spec.ts`
  - Workspace route surface: `apps/app/src/routes/me.tsx`

  **Acceptance Criteria** (agent-executable only):
  - [ ] `rg -n "project enrollment request/cancel|workspace recent/favorite/default landing implementation" docs/provenance/phase-0b docs/agents` no longer reports those phrases as active blockers.
  - [ ] The updated docs cite at least one repo-backed evidence path for enrollment and one for workspace.
  - [ ] The updated docs still explicitly state that full Phase-0B exit is not yet claimed until PR/search exemplar work is done.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Blocker docs match current repo truth
    Tool: Bash
    Steps: rg -n "project enrollment request/cancel|workspace recent/favorite/default landing implementation|PR exemplar implementation|search exemplar implementation|PR state machine|review thread" docs/provenance/phase-0b docs/agents
    Expected: Enrollment/workspace appear only as completed/reconciled notes; default landing page remains as outstanding blocker; PR baseline exists but state machine and review thread read/filter remain pending; search remains as outstanding blocker.
    Evidence: .sisyphus/evidence/task-1-blocker-audit.txt

  Scenario: Reconciled docs still preserve Phase-0B guardrail
    Tool: Bash
    Steps: rg -n "does not claim full Phase 0B exit|remaining true blockers|PR/search|default landing" docs/provenance/phase-0b/README.md docs/agents/10-legacy-provenance-baseline.md
    Expected: Updated docs keep the no-overclaim guardrail and clearly name the remaining blockers (default landing page remains outstanding; PR baseline exists but state machine and review thread read/filter remain pending; search remains outstanding blocker).
    Evidence: .sisyphus/evidence/task-1-phase-guardrail.txt
  ```

  **Commit**: YES | Message: `docs(provenance): reconcile phase-0b blocker inventory` | Files: `docs/agents/10-legacy-provenance-baseline.md`, `docs/provenance/phase-0b/README.md`, `docs/provenance/phase-0b/legacy-test-inventory.md`, `docs/provenance/phase-0b/project.md`

- [x] 2. Add bounded PR/review provenance doc

  **What to do**: Create a new Phase-0B provenance document for PR/review that freezes the exemplar boundary: legacy-backed open/close/reopen transition semantics plus read-only review-thread list/filter semantics. Capture the exact legacy sources, extracted intent, modern translation layers, and explicit deferrals to Phase 4 for merge/reviewer-threshold/full review lifecycle work.
  **Must NOT do**: Do not describe full PR parity. Do not treat fork flows, merge acceptance, reviewer thresholds, or diff composition as in-scope for this exemplar.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: This task is provenance freezing and boundary setting.
  - Skills: [] - No external skill is required.
  - Omitted: [`code-review-expert`] - The task is planning/provenance, not review.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T5, T7 | Blocked By: T1

  **References** (executor has NO interview context - be exhaustive):
  - PR spec section: `SPEC.md:1297`
  - Existing PR blocker summary: `docs/agents/10-legacy-provenance-baseline.md`
  - Legacy controller tests: `yona-original/test/controllers/PullRequestAppTest.java`
  - Legacy review-thread controller tests: `yona-original/test/controllers/ReviewThreadAppTest.java`
  - Legacy model tests: `yona-original/test/models/PullRequestTest.java`
  - Legacy event tests: `yona-original/test/models/PullRequestEventTest.java`
  - Legacy review-comment tests: `yona-original/test/models/ReviewCommentTest.java`
  - Legacy review-filter tests: `yona-original/test/models/support/ReviewSearchConditionTest.java`
  - Current PR domain baseline: `packages/domain/src/pull-request-service.ts`
  - Current PR DB baseline: `packages/db/src/pull-requests.ts`
  - Current app PR baseline: `apps/app/src/lib/pull-request-trpc.spec.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] A new Phase-0B PR provenance doc exists and lists the exact legacy source files above.
  - [ ] The doc explicitly says the exemplar covers open/close/reopen authorization and review-thread read/filter semantics only.
  - [ ] The doc explicitly defers merge/fork/reviewer-threshold/full review lifecycle work to Phase 4.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: PR provenance doc exists with bounded scope
    Tool: Bash
    Steps: rg -n "open/close/reopen|review-thread|Phase 4|merge|reviewer threshold" docs/provenance/phase-0b
    Expected: One PR provenance doc cites the bounded exemplar and explicit Phase-4 deferrals.
    Evidence: .sisyphus/evidence/task-2-pr-provenance.txt

  Scenario: PR provenance doc cites all legacy anchors
    Tool: Bash
    Steps: rg -n "PullRequestAppTest|ReviewThreadAppTest|PullRequestTest|PullRequestEventTest|ReviewCommentTest|ReviewSearchConditionTest" docs/provenance/phase-0b
    Expected: All six legacy anchors are present in the new PR provenance doc.
    Evidence: .sisyphus/evidence/task-2-pr-anchors.txt
  ```

  **Commit**: YES | Message: `docs(provenance): freeze phase-0b pr exemplar scope` | Files: `docs/provenance/phase-0b/pull-request-review.md`, `docs/provenance/phase-0b/README.md`, `docs/provenance/phase-0b/legacy-test-inventory.md`

- [x] 3. Add bounded search provenance doc

  **What to do**: Create a new Phase-0B search provenance document that freezes a minimal search exemplar: query-driven internal search, scopes `global`, `organization`, and `project`, result types `user`, `project`, `issue`, `posting`, and `review_comment`, plus snippet-generation parity from `SearchResultTests.java`. Record that `issue_comment`, `posting_comment`, and `milestone` remain deferred.
  **Must NOT do**: Do not describe this as full Search parity. Do not promise AI-facing search endpoints in this slice. Do not promise dialect-identical ranking/tokenizer behavior.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: This is provenance and bounded-scope locking for a missing feature slice.
  - Skills: [] - Repo and spec evidence are sufficient.
  - Omitted: [`postgres`] - The DB design is deferred to later tasks.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T9, T10 | Blocked By: T1

  **References** (executor has NO interview context - be exhaustive):
  - Search spec section: `SPEC.md:1359`
  - Search parity rules: `SPEC.md:1386`
  - Existing blocker summary: `docs/agents/10-legacy-provenance-baseline.md`
  - Legacy search model suite: `yona-original/test/models/SearchTests.java`
  - Legacy snippet tests: `yona-original/test/models/SearchResultTests.java`
  - Legacy ACL anchor: `yona-original/test/utils/AccessControlTest.java`
  - Legacy controller anchor: `yona-original/app/controllers/SearchApp.java`
  - Current repo absence check: no `*search*` feature files under `apps/app/src/routes` or `packages/`

  **Acceptance Criteria** (agent-executable only):
  - [ ] A new Phase-0B search provenance doc exists and names the bounded result types `user`, `project`, `issue`, `posting`, and `review_comment`.
  - [ ] The doc explicitly records deferred types `issue_comment`, `posting_comment`, and `milestone`.
  - [ ] The doc states API-level parity only for search and explicitly disclaims score/tokenizer identity.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Search provenance doc records bounded type set
    Tool: Bash
    Steps: rg -n "user|project|issue|posting|review_comment|issue_comment|posting_comment|milestone" docs/provenance/phase-0b
    Expected: The new search provenance doc names the in-scope and deferred type sets exactly.
    Evidence: .sisyphus/evidence/task-3-search-provenance.txt

  Scenario: Search provenance doc records parity guardrails
    Tool: Bash
    Steps: rg -n "API-level parity|ranking|tokenizer|AI-facing" docs/provenance/phase-0b docs/agents/10-legacy-provenance-baseline.md
    Expected: The search provenance doc keeps ranking/tokenizer identity out of scope and does not reclassify AI surface into Phase 0B.
    Evidence: .sisyphus/evidence/task-3-search-guardrails.txt
  ```

  **Commit**: YES | Message: `docs(provenance): freeze phase-0b search exemplar scope` | Files: `docs/provenance/phase-0b/search.md`, `docs/provenance/phase-0b/README.md`, `docs/provenance/phase-0b/legacy-test-inventory.md`

- [x] 4. Record explicit deviation and batch-boundary rules

  **What to do**: Update the relevant Phase-0B docs so the batch boundary is explicit: this plan reconciles stale blocker text, finishes a bounded PR exemplar, and introduces a bounded search exemplar, but it still does not constitute full Phase 4 PR/review parity or full Phase 5 search parity. Add exact deferred items and the reason each is deferred.
  **Must NOT do**: Do not introduce vague placeholders like "more work later." Name the exact deferred semantics and target phase.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: This is precise deviation documentation.
  - Skills: [] - Existing docs are sufficient.
  - Omitted: [`internal-comms`] - This is technical execution documentation, not stakeholder communication.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: T10, T12 | Blocked By: T1

  **References** (executor has NO interview context - be exhaustive):
  - Phase plan: `docs/agents/06-phase-plan.md`
  - Architecture guardrails: `docs/agents/04-architecture-guardrails.md`
  - Testing migration rules: `docs/agents/02-testing-migration.md`
  - PR spec scope: `SPEC.md:1297`
  - Search spec scope: `SPEC.md:1359`
  - Existing Phase-0B README: `docs/provenance/phase-0b/README.md`

  **Acceptance Criteria** (agent-executable only):
  - [ ] The updated docs explicitly map the bounded PR exemplar to Phase 0B blocker reconciliation and full PR parity to Phase 4.
  - [ ] The updated docs explicitly map the bounded search exemplar to Phase 0B blocker reconciliation and full search parity to Phase 5.
  - [ ] The updated docs list each deferred item in named bullets rather than ambiguous catch-all language.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Deferred semantics are explicit
    Tool: Bash
    Steps: rg -n "defer|deferred|Phase 4|Phase 5|merge|reviewer|issue_comment|posting_comment|milestone" docs/provenance/phase-0b docs/agents
    Expected: The docs contain explicit deferred-item lists tied to the correct phase.
    Evidence: .sisyphus/evidence/task-4-deferred-boundary.txt

  Scenario: No doc overclaims full parity
    Tool: Bash
    Steps: rg -n "full parity|complete parity|Phase 0B exit" docs/provenance/phase-0b docs/agents
    Expected: Any full-parity language is either absent or explicitly deferred beyond this plan.
    Evidence: .sisyphus/evidence/task-4-no-overclaim.txt
  ```

  **Commit**: YES | Message: `docs(provenance): document bounded phase-0b deviations` | Files: `docs/provenance/phase-0b/README.md`, `docs/agents/10-legacy-provenance-baseline.md`, `docs/provenance/phase-0b/pull-request-review.md`, `docs/provenance/phase-0b/search.md`

- [x] 5. Add failing PR state-machine tests and contract checks

  **What to do**: Translate the bounded PR state-transition legacy behavior into Red tests across `packages/contracts`, `packages/domain`, and `apps/app`: anonymous redirect/unauthorized behavior, not-found handling, forbidden handling, open-when-already-open bad-request behavior, and close/reopen success for authorized actors. Adjust contract schemas only if the tests reveal a missing typed error/status surface.
  **Must NOT do**: Do not add merge acceptance, reviewer-threshold, or diff-composition tests in this task. Do not skip the Red step.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: This spans contract, domain, and app test layers with legacy mapping work.
  - Skills: [] - Existing test patterns and provenance docs are sufficient.
  - Omitted: [`playwright`] - This slice is test-first at unit/app-boundary level, not browser-first.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T6 | Blocked By: T2

  **References** (executor has NO interview context - be exhaustive):
  - Legacy controller tests: `yona-original/test/controllers/PullRequestAppTest.java`
  - PR spec tests: `SPEC.md:1343`
  - Current PR contracts: `packages/contracts/src/pull-request.ts`
  - Current PR domain baseline: `packages/domain/src/pull-request-service.ts`
  - Current PR domain tests: `packages/domain/src/pull-request-service.spec.ts`
  - Current PR app boundary tests: `apps/app/src/lib/pull-request-trpc.spec.ts`
  - Current PR route UI: `apps/app/src/routes/$owner/$projectName/pulls/index.tsx`
  - Current PR detail route: `apps/app/src/routes/$owner/$projectName/pulls/$pullRequestNumber.tsx`

  **Acceptance Criteria** (agent-executable only):
  - [ ] New or updated PR tests fail before implementation and cover anonymous, forbidden, not-found, already-open, and happy-path close/reopen outcomes.
  - [ ] The tests cite the bounded PR provenance doc rather than undocumented assumptions.
  - [ ] No new tests assert merge, reviewer threshold, or fork semantics in this task.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: PR state-machine Red tests exist and fail pre-implementation
    Tool: Bash
    Steps: bunx vitest run --config packages/domain/vitest.config.ts packages/domain/src/pull-request-service.spec.ts && bunx vitest run --config apps/app/vite.config.ts apps/app/src/lib/pull-request-trpc.spec.ts
    Expected: Before implementation commit, at least one new legacy-mapped assertion fails for the bounded state-machine cases.
    Evidence: .sisyphus/evidence/task-5-pr-red.txt

  Scenario: Out-of-scope PR semantics were not added to the Red suite
    Tool: Bash
    Steps: rg -n "merge|reviewer threshold|fork" packages/domain/src/pull-request-service.spec.ts apps/app/src/lib/pull-request-trpc.spec.ts
    Expected: No new Red assertions broaden scope beyond the bounded PR exemplar.
    Evidence: .sisyphus/evidence/task-5-pr-scope.txt
  ```

  **Commit**: YES | Message: `test(pr): lock bounded state-machine legacy behavior` | Files: `packages/contracts/src/pull-request.ts`, `packages/domain/src/pull-request-service.spec.ts`, `apps/app/src/lib/pull-request-trpc.spec.ts`, `apps/app/src/routes/$owner/$projectName/pulls/$pullRequestNumber.tsx`

- [x] 6. Implement bounded PR state-machine hardening

  **What to do**: Update the domain, DB helper, and app boundary so the bounded PR transition semantics are enforced end-to-end: authorized close/reopen only, already-open reopen denied with typed bad-request behavior, missing project/PR surfaced correctly, and unauthorized actor outcomes preserved. Keep the existing list/detail/create baseline intact while hardening transition rules.
  **Must NOT do**: Do not build merge orchestration. Do not add reviewer assignment or threshold logic. Do not bypass `packages/domain` with direct app-layer DB calls.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: This task modifies multiple ownership layers while preserving existing PR baseline behavior.
  - Skills: [] - Existing repo patterns are sufficient.
  - Omitted: [`vercel-react-best-practices`] - This is primarily backend/domain work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T12 | Blocked By: T5

  **References** (executor has NO interview context - be exhaustive):
  - Current PR state mapper: `packages/db/src/pull-requests.ts`
  - Current PR domain service: `packages/domain/src/pull-request-service.ts`
  - Existing project authorization helpers: `packages/domain/src/project-authorization.ts`
  - Current PR app caller: `apps/app/src/lib/pull-request.ts`
  - Current PR tRPC server caller: `apps/app/src/lib/pull-request-trpc.ts`
  - Current PR detail UI: `apps/app/src/routes/$owner/$projectName/pulls/$pullRequestNumber.tsx`
  - Legacy state transition anchor: `yona-original/test/controllers/PullRequestAppTest.java`

  **Acceptance Criteria** (agent-executable only):
  - [ ] The bounded PR state-machine tests added in T5 pass green in `packages/domain` and `apps/app`.
  - [ ] Existing list/detail/create PR tests remain green.
  - [ ] The implementation path still goes through contracts -> domain -> db/app adapters with no direct route-to-DB shortcut.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Authorized close/reopen transitions succeed
    Tool: Bash
    Steps: bun run --cwd packages/domain test && bun run --cwd apps/app test:unit
    Expected: The targeted PR state-machine and app-boundary tests pass without regressing existing PR baseline tests.
    Evidence: .sisyphus/evidence/task-6-pr-green.txt

  Scenario: Reopen-already-open and unauthorized transitions fail cleanly
    Tool: Bash
    Steps: rg -n "already open|FORBIDDEN|UNAUTHORIZED|NOT_FOUND" packages/domain/src/pull-request-service.spec.ts apps/app/src/lib/pull-request-trpc.spec.ts
    Expected: The passing tests explicitly prove bad-request/forbidden/not-found outcomes for bounded failure paths.
    Evidence: .sisyphus/evidence/task-6-pr-errors.txt
  ```

  **Commit**: YES | Message: `feat(pr): enforce bounded transition semantics` | Files: `packages/domain/src/pull-request-service.ts`, `packages/db/src/pull-requests.ts`, `apps/app/src/lib/pull-request-trpc.ts`, `apps/app/src/routes/$owner/$projectName/pulls/$pullRequestNumber.tsx`

- [x] 7. Add failing review-thread read/filter tests

  **What to do**: Translate the bounded review-thread legacy behavior into Red tests: read access respects project visibility/authorization, and project-scoped thread filtering supports the legacy filter dimensions proven by `ReviewThreadAppTest.java` and `ReviewSearchConditionTest.java` (`state`, text filter, commit id/path match, author, participant`). Keep the slice read-only.
  **Must NOT do**: Do not add review-thread mutation, resolution, or merge-coupled semantics. Do not widen the slice to generic repository discussion owned by `13.6`.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: This is a new bounded read/query slice with cross-file legacy translation work.
  - Skills: [] - Existing repo patterns are sufficient.
  - Omitted: [`postgres`] - Storage design is not the focus of this Red test task.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T8 | Blocked By: T2

  **References** (executor has NO interview context - be exhaustive):
  - Legacy access tests: `yona-original/test/controllers/ReviewThreadAppTest.java`
  - Legacy filter semantics: `yona-original/test/models/support/ReviewSearchConditionTest.java`
  - PR/review spec boundary: `SPEC.md:1338`
  - Repository discussion ownership boundary: `SPEC.md:1265`
  - Existing repository authorization helpers: `packages/domain/src/repository-authorization.ts`
  - Existing repo app test patterns: `apps/app/src/lib/repo-trpc.spec.ts`
  - Existing PR app test patterns: `apps/app/src/lib/pull-request-trpc.spec.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] New review-thread tests fail before implementation for access denial and at least the listed read-only filters.
  - [ ] The tests explicitly preserve the ownership boundary between repository discussion (`13.6`) and PR review composition (`13.7`).
  - [ ] No mutation-oriented review-thread assertions are added.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Review-thread Red tests exist and fail pre-implementation
    Tool: Bash
    Steps: bunx vitest run --config packages/domain/vitest.config.ts packages/domain/src/pull-request-service.spec.ts && bunx vitest run --config apps/app/vite.config.ts apps/app/src/lib/pull-request-trpc.spec.ts
    Expected: Newly added review-thread read/filter assertions fail before implementation.
    Evidence: .sisyphus/evidence/task-7-review-red.txt

  Scenario: Review-thread scope stays read-only
    Tool: Bash
    Steps: rg -n "create|update|delete|resolve|reopen" packages/domain/src apps/app/src/lib | rg "review|thread"
    Expected: No new mutation-focused review-thread test additions appear in this bounded read/filter task.
    Evidence: .sisyphus/evidence/task-7-review-scope.txt
  ```

  **Commit**: YES | Message: `test(review): lock read-only thread filter behavior` | Files: `packages/domain/src/pull-request-service.spec.ts`, `apps/app/src/lib/pull-request-trpc.spec.ts`, `docs/provenance/phase-0b/pull-request-review.md`

- [x] 8. Implement review-thread read/filter surface

  **What to do**: Implement the minimal read-only review-thread list/filter surface needed by T7. Add any new contract schema, DB helper, domain query, and app caller/route wiring required to expose project-scoped review threads with `state`, text filter, commit id/path, author, and participant filters, while enforcing project visibility rules.
  **Must NOT do**: Do not mutate review comments or thread state. Do not conflate this surface with generic commit-discussion ownership from `13.6`.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: This introduces a new bounded query slice spanning contracts, db, domain, and app.
  - Skills: [] - Existing repo patterns are sufficient.
  - Omitted: [`playwright`] - Route/query semantics can be proven without browser-first work here.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: T12 | Blocked By: T7

  **References** (executor has NO interview context - be exhaustive):
  - Legacy review-thread controller tests: `yona-original/test/controllers/ReviewThreadAppTest.java`
  - Legacy filter model tests: `yona-original/test/models/support/ReviewSearchConditionTest.java`
  - Existing repo reader patterns: `apps/app/src/lib/repo-trpc.ts`
  - Existing repo test patterns: `apps/app/src/lib/repo-trpc.spec.ts`
  - Existing repository auth helpers: `packages/domain/src/repository-authorization.ts`
  - Existing PR contracts: `packages/contracts/src/pull-request.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] The bounded review-thread tests from T7 pass in domain/app layers.
  - [ ] Project visibility and authorization are enforced before returning review-thread results.
  - [ ] Filter parameters are typed at the contract boundary and exercised by tests.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Authorized review-thread read/filter succeeds
    Tool: Bash
    Steps: bun run --cwd packages/contracts test && bun run --cwd apps/app test:unit
    Expected: Contract validation and app-boundary review-thread filter tests pass.
    Evidence: .sisyphus/evidence/task-8-review-green.txt

  Scenario: Unauthorized/private-project review-thread access is denied
    Tool: Bash
    Steps: rg -n "forbidden|unauthorized|private project" packages/domain/src apps/app/src/lib | rg "review|thread"
    Expected: Passing tests explicitly prove denial on private-project access for nonmembers.
    Evidence: .sisyphus/evidence/task-8-review-authz.txt
  ```

  **Commit**: YES | Message: `feat(review): add bounded thread query surface` | Files: `packages/contracts/src/pull-request.ts`, `packages/db/src/pull-requests.ts`, `packages/domain/src/pull-request-service.ts`, `apps/app/src/lib/pull-request-trpc.ts`

- [x] 9. Add search snippet helper tests and bounded search contracts

  **What to do**: Translate `SearchResultTests.java` into Red tests for a deterministic snippet helper and add the bounded search contracts for query input, scopes, types, result counts, pagination, and typed result payloads. Keep the search query language to plain keyword search with optional type filters and cursor/page size.
  **Must NOT do**: Do not introduce a complex boolean search AST in this slice. Do not add AI-facing search contracts.

  **Recommended Agent Profile**:
  - Category: `unspecified-high` - Reason: This locks the bounded search surface before infra work starts.
  - Skills: [] - Existing contract/test patterns are sufficient.
  - Omitted: [`zod`] - The schemas are straightforward and follow existing repo patterns.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T11 | Blocked By: T3

  **References** (executor has NO interview context - be exhaustive):
  - Legacy snippet behavior: `yona-original/test/models/SearchResultTests.java`
  - Search spec section: `SPEC.md:1359`
  - Existing contract style: `packages/contracts/src/project.ts`
  - Existing contract tests: `packages/contracts/src/project.spec.ts`
  - Existing issue/posting/repo contract style: `packages/contracts/src/issue.ts`, `packages/contracts/src/posting.ts`, `packages/contracts/src/repo.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] New snippet helper tests fail before implementation and directly map to the legacy snippet expectations.
  - [ ] Bounded search contracts cover `global`, `organization`, and `project` scope plus the in-scope type set.
  - [ ] No contract introduces boolean-query operators or AI endpoint payloads.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Search snippet Red tests exist
    Tool: Bash
    Steps: bunx vitest run --config packages/contracts/vitest.config.ts packages/contracts/src/search.spec.ts
    Expected: Before implementation, snippet-related assertions fail against the new bounded search contract suite.
    Evidence: .sisyphus/evidence/task-9-search-red.txt

  Scenario: Search contract scope stays bounded
    Tool: Bash
    Steps: rg -n "global|organization|project|review_comment|issue_comment|posting_comment|milestone|AI" packages/contracts/src/search.ts packages/contracts/src/search.spec.ts
    Expected: In-scope and deferred types are explicit; no AI-facing contract appears.
    Evidence: .sisyphus/evidence/task-9-search-scope.txt
  ```

  **Commit**: YES | Message: `test(search): lock bounded contracts and snippet behavior` | Files: `packages/contracts/src/search.ts`, `packages/contracts/src/search.spec.ts`

- [x] 10. Add multi-dialect search projection schema and sync infrastructure

  **What to do**: Introduce the bounded search projection storage in `packages/db`: one canonical search-document projection for the in-scope types, plus dialect-specific FTS support. Use PostgreSQL generated `tsvector` + `GIN`, MySQL/MariaDB `FULLTEXT`, and SQLite `FTS5 external-content + triggers`. Include migration/backfill steps and keep the search documents permission metadata-rich enough to support SQL-level scope filtering.
  **Must NOT do**: Do not rely on post-query ACL filtering. Do not implement per-engine feature-specific ranking contracts. Do not add projection coverage for deferred types.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: This is schema, migration, and dialect-infra work with strong guardrails.
  - Skills: [`postgres`] - Needed for PostgreSQL FTS generated-column/index correctness.
  - Omitted: [`drizzle-orm`] - Existing repo Drizzle patterns are already canonical.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T11 | Blocked By: T3, T4

  **References** (executor has NO interview context - be exhaustive):
  - Existing dialect schemas: `drizzle/pg/schema.ts`, `drizzle/mysql/schema.ts`, `drizzle/sqlite/schema.ts`
  - Existing DB ownership rules: `docs/agents/03-repo-structure.md`
  - Search parity rules: `SPEC.md:1386`
  - Librarian guidance: PostgreSQL `tsvector + GIN`, MySQL/MariaDB `FULLTEXT`, SQLite `FTS5 external-content + triggers`
  - Existing DB migration tests: `packages/db/src/migrations.spec.ts`
  - Existing DB dialect tests: `packages/db/src/pg.spec.ts`, `packages/db/src/mysql.spec.ts`, `packages/db/src/sqlite.spec.ts`

  **Acceptance Criteria** (agent-executable only):
  - [ ] Search projection schema exists across all three dialects for the bounded type set.
  - [ ] PostgreSQL, MySQL/MariaDB, and SQLite tests prove the FTS infrastructure is created with the expected dialect-native mechanism.
  - [ ] SQLite sync/bootstrap/backfill behavior is explicitly covered so external-content drift is not left implicit.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Dialect schema/tests prove search infra exists
    Tool: Bash
    Steps: bun run test:db && bun run test:db:node
    Expected: DB tests pass for search projection schema/migration setup in SQLite, PostgreSQL, and MySQL/MariaDB.
    Evidence: .sisyphus/evidence/task-10-search-dialects.txt

  Scenario: SQLite external-content sync is explicit
    Tool: Bash
    Steps: rg -n "FTS5|external-content|trigger|backfill" packages/db/src drizzle/sqlite
    Expected: SQLite search projection code/tests explicitly mention the external-content table, triggers, and bootstrap/backfill path.
    Evidence: .sisyphus/evidence/task-10-sqlite-sync.txt
  ```

  **Commit**: YES | Message: `feat(db): add bounded search projection across dialects` | Files: `drizzle/pg/schema.ts`, `drizzle/mysql/schema.ts`, `drizzle/sqlite/schema.ts`, `packages/db/src/*search*`, `packages/db/src/migrations.spec.ts`

- [x] 11. Implement permission-scoped search helpers and cross-dialect behavior tests

  **What to do**: Implement DB helpers and domain-facing search queries that search only the bounded type set and apply permission/scope filtering inside SQL before ranking, counts, and pagination. Cover `global`, `organization`, and `project` scopes, and add cross-dialect tests proving inclusion/exclusion behavior rather than identical score values.
  **Must NOT do**: Do not compare raw ranking scores across dialects. Do not fetch broad candidates and filter them later in TypeScript.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: This is the core search behavior slice with dialect-sensitive semantics.
  - Skills: [`postgres`] - Helpful for FTS query behavior and index usage patterns.
  - Omitted: [`tanstack-agent-skills/skills/tanstack-query-best-practices`] - This is backend query behavior, not client caching.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: T12 | Blocked By: T9, T10

  **References** (executor has NO interview context - be exhaustive):
  - Search spec tests: `SPEC.md:1404`
  - Search parity rules: `SPEC.md:1386`
  - Legacy scope matrix: `yona-original/test/models/SearchTests.java`
  - Legacy ACL anchor: `yona-original/test/utils/AccessControlTest.java`
  - Existing visibility helpers: `packages/domain/src/project-authorization.ts`
  - Existing DB helper patterns: `packages/db/src/org-project.ts`, `packages/db/src/pull-requests.ts`, `packages/db/src/personal-workspace.ts`
  - Librarian guidance: permission filtering in SQL before ranking/counts/pagination

  **Acceptance Criteria** (agent-executable only):
  - [ ] Search helper tests prove permission-filtered inclusion/exclusion across the in-scope type set.
  - [ ] Search helper tests prove `global`, `organization`, and `project` scopes differ correctly.
  - [ ] Cross-dialect tests assert matching result sets/count semantics, not identical numeric scores.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Search helpers pass permission and scope tests
    Tool: Bash
    Steps: bun run test:db && bun run --cwd packages/domain test
    Expected: Search helper and domain-facing search behavior tests pass for inclusion/exclusion and scope semantics.
    Evidence: .sisyphus/evidence/task-11-search-helpers.txt

  Scenario: No post-filtered ACL pattern remains in search helpers
    Tool: Bash
    Steps: rg -n "filter\(|map\(|slice\(" packages/db/src packages/domain/src | rg "search"
    Expected: Search behavior is driven by SQL-scoped queries rather than candidate fetch then TypeScript filtering.
    Evidence: .sisyphus/evidence/task-11-search-no-postfilter.txt
  ```

  **Commit**: YES | Message: `feat(search): enforce permission-scoped multi-dialect queries` | Files: `packages/db/src/search.ts`, `packages/db/src/*search*.spec.ts`, `packages/domain/src/search-service.ts`, `packages/domain/src/search-service.spec.ts`

- [x] 12. Implement query-driven app search surface and final doc sync

  **What to do**: Add the bounded internal search surface in `apps/app`: typed `tRPC` caller, thin adapter/serverFn if needed, query-driven search page, and any minimal machine-readable internal response used by the app. Wire result counts, type filters, snippets, cursor/page-size behavior, and clear empty/error states. Then update the Phase-0B docs/provenance to point at the final green test locations and any intentional deviations.
  **Must NOT do**: Do not add public AI-facing search endpoints. Do not widen the UI to deferred types. Do not let the page bypass the `tRPC` boundary to call DB helpers directly.

  **Recommended Agent Profile**:
  - Category: `deep` - Reason: This spans app wiring, query-driven route composition, and final provenance sync.
  - Skills: [] - Existing app patterns are sufficient.
  - Omitted: [`frontend-design`] - The surface should follow current app patterns rather than become a design exercise.

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final verification | Blocked By: T6, T8, T11, T4

  **References** (executor has NO interview context - be exhaustive):
  - Existing query-driven route patterns: `apps/app/src/routes/$owner/$projectName/issues/index.tsx`, `apps/app/src/routes/$owner/$projectName/discussions/index.tsx`
  - Existing app query helpers: `apps/app/src/lib/queries.ts`
  - Existing project/me caller patterns: `apps/app/src/lib/project-trpc.ts`, `apps/app/src/lib/me-trpc.ts`
  - Existing auth/search-param route examples: `apps/app/src/routes/login.tsx`, `apps/app/src/routes/register.tsx`
  - Search provenance doc from T3: `docs/provenance/phase-0b/search.md`
  - Phase-0B blocker summary docs from T1/T4

  **Acceptance Criteria** (agent-executable only):
  - [ ] `apps/app` has a bounded, query-driven search route wired through `tRPC`/app helpers and covered by tests.
  - [ ] The final docs point to the actual green search and PR/review test files.
  - [ ] No app route or loader calls DB search helpers directly.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: App search route and caller tests pass
    Tool: Bash
    Steps: bun run --cwd apps/app test:unit && bun run check
    Expected: The search route/caller tests pass and the app still type-checks.
    Evidence: .sisyphus/evidence/task-12-app-search.txt

  Scenario: App search route respects architecture boundary
    Tool: Bash
    Steps: rg -n "from \"@yona/db\"|from '@yona/db'" apps/app/src
    Expected: No app search route/loader imports DB helpers directly; app code stays on the caller/tRPC side of the boundary.
    Evidence: .sisyphus/evidence/task-12-boundary.txt
  ```

  **Commit**: YES | Message: `feat(app): add bounded phase-0b search surface` | Files: `apps/app/src/routes/search.tsx`, `apps/app/src/lib/search-trpc.ts`, `apps/app/src/lib/search.ts`, `docs/provenance/phase-0b/search.md`, `docs/agents/10-legacy-provenance-baseline.md`

## Final Verification Wave (4 parallel agents, ALL must APPROVE)
- [x] F1. Plan Compliance Audit - oracle
- [x] F2. Code Quality Review - unspecified-high
- [x] F3. Real Manual QA - unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check - deep

## Commit Strategy
- Prefer one commit per task for T1-T4 while provenance is being corrected, unless the executor bundles tightly related doc-only tasks into one reviewable docs commit.
- Prefer one commit for T5-T8 PR/review exemplar hardening if the changeset stays reviewable; otherwise split by state-machine and review-thread surfaces.
- Prefer one commit for T9-T12 search exemplar work only after all dialect tests and app tests are green.

## Success Criteria
- Phase-0B docs no longer misreport implemented enrollment/workspace work as blockers.
- PR exemplar is legacy-backed, bounded, and green for open/close/reopen plus review-thread read/filter semantics.
- Search exemplar is bounded, permission-aware, multi-dialect, and green without overclaiming full Phase-5 parity.
- Every implemented capability cites legacy provenance, has Red-to-Green trace, and records deferred semantics explicitly.
