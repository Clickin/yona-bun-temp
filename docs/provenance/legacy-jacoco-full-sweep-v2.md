# Legacy Yona JaCoCo full sweep v2

## Result

- **Status:** BLOCKED before fresh accounting could complete.
- **Five-controller gate:** PASS (`allPassed=true`, `fullSweepAllowed=true`).
- **Fresh output:** `.agent/legacy-jacoco/full-sweep-v2/`
- **Existing invalid baseline:** `.agent/legacy-jacoco/full-sweep/` was not modified.
- **Run ID:** none; the 117-scenario runner did not flush a report or JaCoCo exec data before the bounded run was cancelled.

## Five-controller validation

| Controller | Legacy route | Auth | HTTP | Class methods | Covered action instructions | Identity | Evidence |
| --- | --- | --- | ---: | ---: | ---: | --- | --- |
| Application | `GET /` | anonymous | 200 | 18 | 19 | `EXACT_MATCH` | `VALID` |
| UserApp | `GET /users/loginform` | anonymous | 200 | 76 | 38 | `EXACT_MATCH` | `VALID` |
| ProjectApp | `GET /:user/:project` → `/admin/sample` | admin | 200 | 62 | 28 | `EXACT_MATCH` | `VALID` |
| IssueApp | `GET /:user/:project/issues` → `/admin/sample/issues` | admin | 200 | 62 | 88 | `EXACT_MATCH` | `VALID` |
| PullRequestApp | `GET /:ownerName/:project/pullRequests` → `/admin/sample/pullRequests` | admin | 200 | 29 | 5 | `EXACT_MATCH` | `VALID` |

The gate uses JaCoCo 0.8.14 with the existing Play 2.3 compatibility analyzer. The authenticated rows use the legacy session runner; parameterized route templates are resolved to the seeded `admin/sample` fixture.

Authoritative gate artifact: `.agent/legacy-jacoco/five-controller-validation/result.json`.

## Fresh full-sweep-v2 accounting

The command was started with `YONA_LEGACY_JACOCO=1`, `YONA_LEGACY_JACOCO_PLAY_COMPAT=1`, a fresh destination under `full-sweep-v2`, and the default 117 registered scenarios. After 11 minutes there was still no new `.agent/differential/report.json` and `full-sweep-v2/yona.exec` remained zero bytes, so the run was cancelled rather than inventing accounting.

The blocked artifacts record only facts available from this run:

- registered scenarios: 117
- attempted scenarios: 0
- global infrastructure error: runner produced no report or exec flush in the bounded run window
- `EXECUTED`: 0; `SKIPPED`: 0; `FAILED`: 0
- source-backed classes/methods: not available
- major controller methods visible: not available
- coverage evidence: `BLOCKED` (`FULL_SWEEP_NOT_COMPLETED`)
- reconciliation: blocked; no entries emitted
- discovery queue: all P0/P1/P2/P3 queues empty and blocked

Artifacts: `summary.json`, `step-summary.json`, `reconciliation.json`, `discovery-queue.json`, and `controller-review.json` under `.agent/legacy-jacoco/full-sweep-v2/`.

Because fresh runtime evidence is absent, no product parity candidate or parity backlog is recognized. The prior `sweep-mtfoidbc` / `full-sweep` baseline remains invalid and untouched.

## Tooling changes

The coverage tooling now provides the five-controller gate, explicit authenticated fixture routes, overload-aware action method checks, separate step accounting, static/runtime/step reconciliation fields, and v2 queue semantics:

- P0: step executed + runtime executed + unapproved observable mismatch.
- P1: static covered + failed/skipped step + runtime missed.
- P2: executed step + runtime missed, or static uncovered + runtime executed.
- P3: partial controller methods.

Invalid coverage evidence blocks every queue.
