# Legacy Yona JaCoCo full sweep v3

## Status

- **Status:** NOT RUN (this document defines the evidence contract; no full sweep was executed).
- **Run ID:** `<generated: runId>`
- **Output directory:** `<generated: outputDir>`
- **Generated at:** `<generated: generatedAt>`
- **Runner revision:** `<generated: runnerRevision>`

Run-specific values MUST come from the generated artifacts. The placeholders above are intentionally not evidence and MUST be replaced only by a completed run's metadata.

## Required artifacts and evidence fields

A completed run writes atomically and records these fields in `run-metadata.json` and the corresponding summary:

- `schemaVersion`, `runId`, `generatedAt`, `runnerRevision`, `outputDir`
- `registeredScenarioCount`, `manifestSha256`, `manifestEntryCount`, `manifestDuplicateIds`
- `shardCount`, `shards[]` (`id`, `status`, `attemptedScenarios`, `reportPath`, `error`)
- `resume` (`requested`, `sourceRunId`, `sourceManifestSha256`, `reusedScenarioIds`, `rerunScenarioIds`, `invalidatedScenarioIds`)
- `scenarioAccounting` (`registered`, `attempted`, `executed`, `skipped`, `failed`, `unattempted`, `duplicateScenarioIds`)
- `behaviorCoverage` (`registered`, `observed`, `missing`, `duplicateBehaviorIds`, `byScenario`)
- `discovery` (`counts`, `entries`, `classificationVocabulary`)
- `evidenceGate` (`status`, `code`, `reason`, `requiredArtifacts`, `missingArtifacts`, `coverageComplete`, `reportComplete`)
- `artifactIntegrity` (relative artifact paths and SHA-256 digests)

The report and each shard report retain structured scenario rows rather than relying on stdout. Each row includes `scenarioId`, `status`, `steps[]`, `behaviorIds[]`, `violations[]`, `errors[]`, and an optional `sourceShard`.

## Deterministic contracts

1. **Manifest exact-once:** every registered scenario ID is present exactly once; no unknown, duplicate, or missing IDs are accepted. Manifest ordering is canonical and its digest is recorded.
2. **Resume classification:** a scenario is `REUSED` only when its prior result matches the current manifest digest and scenario definition; stale, failed, missing, or incompatible rows are `RERUN`. Resume MUST NOT silently discard an unattempted scenario.
3. **Structured merge:** shard reports merge by scenario ID and behavior ID. Duplicate rows are a gate failure, while disjoint rows are order-independent and produce canonical sorted output. Step totals are derived from merged rows, not log text.
4. **Discovery classification:** only evidence-backed rows enter the queue. Classifications (`P0`, `P1`, `P2`, `P3`) are deterministic from step status, runtime coverage, static coverage, and approved mismatch state; blocked evidence yields an empty queue.
5. **Evidence gate:** missing, stale, contradictory, or incomplete report/coverage artifacts produce `BLOCKED` with a machine-readable code and reason. No product parity gap or discovery work item may be promoted from blocked evidence.

## JaCoCo and legacy provenance

The five-controller gate remains a prerequisite. Its generated result is referenced by `<generated: fiveControllerValidationPath>` and is not copied into this document. The full sweep uses the existing Play compatibility analyzer and the configured JaCoCo agent; it does not alter legacy application code, frontend code, or shim behavior.

## Result recording template

After a real sweep, replace this section with generated values (or link the immutable artifact directory):

- **Evidence gate:** `<generated: evidenceGate.status>` (`PASS` or `BLOCKED`)
- **Evidence code/reason:** `<generated: evidenceGate.code>` / `<generated: evidenceGate.reason>`
- **Scenario accounting:** `<generated: scenarioAccounting>`
- **Behavior coverage:** `<generated: behaviorCoverage>`
- **Discovery counts:** `<generated: discovery.counts>`
- **Artifact digests:** `<generated: artifactIntegrity>`

Until then, this file records intended fields only; it must not be read as evidence that a v3 sweep completed.
