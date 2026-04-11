---
title: Pilot Issue Detail Parity
tags: []
related: [release/pilot_frontend/pilot_frontend_build_parity.md]
keywords: []
importance: 55
recency: 1
maturity: draft
updateCount: 1
createdAt: '2026-04-06T14:19:28.192Z'
updatedAt: '2026-04-06T14:21:43.147Z'
---
## Raw Concept
**Task:**
Describe how the Vitest -issue-detail-parity.spec.tsx exercise runPilotIssueStateToggle success and failure flows while keeping pilot session bootstrapping observable.

**Changes:**
- Mock pilot-related services and render the pilot issue detail shell via getRouter/createMemoryHistory so issue metadata is displayed alongside State: open and Close Issue controls.
- Boot the pilot session with readPilotSessionBootstrap to obtain a CSRF token, call updatePilotIssueState inside runPilotIssueStateToggle, and assert success toggles the state to closed while failures preserve the observable error state.
- Keep the frontend-baseline spec aligned by removing TanStack Start references, switching routers to src/pilot-routeTree.gen.ts, and validating canonical mount entry points.

**Files:**
- apps/app/src/routes/-issue-detail-parity.spec.tsx
- apps/app/src/frontend-baseline.spec.ts

**Flow:**
Vitest spins up getRouter with createMemoryHistory -> renders /yobi/projectYobi/issues/1 -> runPilotIssueStateToggle boots pilot session via readPilotSessionBootstrap (CSRF token) -> updatePilotIssueState invoked with the toggled state -> html contains pilot issue metadata or failure observable when the update rejects while baseline spec double-checks router and dependency cleanup.

**Timestamp:** 2026-04-06

## Narrative
### Structure
The parity spec hoists Vi mock implementations for shell-data, auth, locale, pilot-connect, pilot-session, project, and issue helpers so runPilotIssueStateToggle executes deterministically; RouterProvider renders html snapshots checking for #1 Pilot issue, yobi, projectYobi, State: open, and Close Issue before toggling.

### Dependencies
runPilotIssueStateToggle imports ../pilot-routes/$owner/$projectName/issues/$issueNumber/route (updatePilotIssueState) and relies on getRouter, createMemoryHistory, readPilotSessionBootstrap, and updatePilotIssueState mocks emitting CSRF tokens and pilot issue payloads.

### Highlights
Success path resolves to { state: "closed" } while failure path rejects with "update failed" yet still calls readPilotSessionBootstrap once and updatePilotIssueState with the previous state so the observable retains pending/error signals.

## Facts
- **pilot_session_bootstrap**: readPilotSessionBootstrapMock is expected to be called once per runPilotIssueStateToggle execution to supply the CSRF token before state updates. [project]
- **pilot_issue_state_toggle_success**: runPilotIssueStateToggle success path resolves with { state: "closed" } and updatePilotIssueState is called with { csrfToken: "csrf-token", issueNumber: 1, ownerName: "yobi", projectName: "projectYobi", state: "closed" }. [project]
- **pilot_issue_state_toggle_failure_observable**: When updatePilotIssueState rejects, runPilotIssueStateToggle surfaces the error and still calls updatePilotIssueState with state "open", keeping the failure observable alive. [project]
- **issue_detail_rendered_content**: Html rendered by RouterProvider contains #1 Pilot issue, yobi, projectYobi, State: open, and Close Issue so the pilot shell matches production content. [project]
