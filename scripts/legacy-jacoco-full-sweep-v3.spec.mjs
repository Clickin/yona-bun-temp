import { strict as assert } from "node:assert";
import test from "node:test";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  aggregateStepAccounting,
  atomicWriteJson,
  buildManifest,
  classifyDiscoveryQueue,
  evaluateEvidenceGate,
  mergeBehaviorCoverage,
  mergeScenarioReports,
  parseCliOptions,
  shouldRunShard,
  validateManifest,
} from "./legacy-jacoco-full-sweep-v3.mjs";
import { DOMAIN_REGISTRY } from "./differential/scenarios/index.mjs";

test("manifest is canonical and validates exact-once IDs", () => {
  const manifest = buildManifest(["B", "A"]);
  assert.deepEqual(manifest.shards.flatMap(({ scenarioIds }) => scenarioIds), ["B", "A"]);
  assert.deepEqual(validateManifest(manifest, ["A", "B"]), { registered: ["A", "B"], uniqueRepresented: ["A", "B"], missing: [], duplicates: [], unknown: [] });
  assert.throws(() => buildManifest(["A", "A"]), /exact-once/u);
  const invalid = validateManifest({ scenarioIds: ["A", "A", "C"] }, ["A", "B"]);
  assert.deepEqual(invalid.missing, ["B"]);
  assert.deepEqual(invalid.duplicates, ["A"]);
  assert.deepEqual(invalid.unknown, ["C"]);
});

test("manifest default is sourced from the canonical domain registry", () => {
  const manifest = buildManifest();
  assert.equal(Object.keys(DOMAIN_REGISTRY).length, 5);
  assert.equal(manifest.registeredScenarioCount, 117);
});

test("resume and force classification rerun incomplete shards only", () => {
  assert.deepEqual(parseCliOptions(["--resume", "--force-shard", "issues", "--force-all"]), { resume: true, forceAll: true, forceShardIds: ["issues"] });
  assert.equal(shouldRunShard({ id: "0", status: "COMPLETE" }), false);
  assert.equal(shouldRunShard({ id: "0", status: "COMPLETE" }, { forceAll: true }), true);
  assert.equal(shouldRunShard({ id: "0", status: "COMPLETE" }, { forceShardIds: ["0"] }), true);
  assert.equal(shouldRunShard({ id: "1", status: "FAILED" }), true);
});

test("scenario reports merge structurally and reject duplicates", () => {
  const merged = mergeScenarioReports([{ shard: 1, report: { scenarios: [{ scenarioId: "B", steps: [] }] } }, { shard: 0, report: { scenarios: [{ scenarioId: "A", steps: [] }] } }], ["A", "B"]);
  assert.deepEqual(merged.scenarios.map((row) => row.scenarioId), ["A", "B"]);
  assert.deepEqual(merged.missingScenarioIds, []);
  assert.throws(() => mergeScenarioReports([{ scenarios: [{ scenarioId: "A" }] }, { scenarios: [{ scenarioId: "A" }] }], ["A"]), /duplicate scenario/u);
});

test("behavior merge and step accounting preserve missing/error evidence", () => {
  const coverage = mergeBehaviorCoverage([[{ behaviorId: "b1", covered: true }], [{ behaviorId: "b1", covered: true }]], [], ["b1", "b2"]);
  assert.equal(coverage.observed, 1);
  assert.deepEqual(coverage.missing, ["b2"]);
  assert.deepEqual(coverage.duplicateBehaviorIds, ["b1"]);
  const mapped = mergeBehaviorCoverage([{ scenarios: [{ scenarioId: "A", behaviorIds: ["b1"] }] }], [], ["b1"]);
  assert.deepEqual(mapped.byScenario, { A: ["b1"] });
  const counts = aggregateStepAccounting([{ scenarioId: "A", steps: [{ status: "EXECUTED" }, { status: "FAILED" }] }, { scenarioId: "B", steps: [{ status: "SKIPPED" }] }], ["A", "B", "C"]);
  assert.deepEqual(counts, { registeredScenarios: 3, attemptedScenarios: 2, EXECUTED: 1, SKIPPED: 1, FAILED: 1, unattemptedScenarios: 1, globalInfraErrors: [], totalStepErrors: 2 });
});

test("discovery classification is deterministic and blocked evidence is empty", () => {
  const queue = classifyDiscoveryQueue([{ id: "z", stepStatus: "EXECUTED", runtimeStatus: "EXECUTED", observableMismatch: true }, { id: "a", stepStatus: "FAILED", runtimeStatus: "MISSED" }, { id: "p", stepStatus: "EXECUTED", runtimeStatus: "MISSED" }, { id: "q", partial: true }]);
  assert.deepEqual(queue.priorities.P0.map(({ id }) => id), ["z"]);
  assert.deepEqual(classifyDiscoveryQueue([{ id: "no-mismatch", stepStatus: "EXECUTED", runtimeStatus: "EXECUTED" }]).priorities.P0, []);
  assert.deepEqual(classifyDiscoveryQueue([{ id: "approved", stepStatus: "EXECUTED", runtimeStatus: "EXECUTED", observableMismatch: true, approvedDeviation: true }]).priorities.P0, []);
  assert.deepEqual(queue.priorities.P1.map(({ id }) => id), ["a"]);
  assert.deepEqual(queue.priorities.P2.map(({ id }) => id), ["p"]);
  assert.deepEqual(queue.priorities.P3.map(({ id }) => id), ["q"]);
  assert.deepEqual(classifyDiscoveryQueue([{ id: "z" }], [], { status: "BLOCKED" }).priorities, { P0: [], P1: [], P2: [], P3: [] });
});

test("failed shard, zero-byte exec, and identity warnings block evidence", () => {
  const base = { reportComplete: true, manifestValid: true, attemptedScenarios: 117, coverageEvidenceStatus: "VALID", sourceBacked: { classes: 1, methods: 1 }, majorControllerMethodsVisible: 1, globalInfraErrors: [] };
  for (const shards of [[{ status: "FAILED", nonzeroExec: true }], [{ status: "COMPLETE", nonzeroExec: false }]]) assert.equal(evaluateEvidenceGate({ ...base, shards }, 117).status, "BLOCKED");
  assert.equal(evaluateEvidenceGate({ ...base, shards: [{ status: "COMPLETE", nonzeroExec: true }], identityWarnings: ["IDENTITY_MISMATCH"] }, 117).status, "BLOCKED");
});

test("evidence gate blocks incomplete or invalid evidence", () => {
  assert.deepEqual(evaluateEvidenceGate({ reportComplete: true, manifestValid: true, attemptedScenarios: 2, coverageEvidenceStatus: "VALID", shards: [{ status: "COMPLETE", nonzeroExec: true }], sourceBacked: { classes: 1, methods: 1 }, majorControllerMethodsVisible: 1, globalInfraErrors: [] }, 2), { status: "PASS", valid: true, reasons: [] });
  const blocked = evaluateEvidenceGate({ reportComplete: false, manifestValid: false, attemptedScenarios: 1, coverageEvidenceStatus: "BLOCKED" }, 2);
  assert.equal(blocked.status, "BLOCKED");
  assert.deepEqual(blocked.reasons, ["REPORT_INCOMPLETE", "MANIFEST_INVALID", "SCENARIO_ACCOUNTING_INCOMPLETE", "COVERAGE_EVIDENCE_INVALID", "SOURCE_COVERAGE_MISSING", "CONTROLLER_EVIDENCE_MISSING"]);
});

test("atomic JSON writes leave parseable output", () => {
  const dir = mkdtempSync(join(tmpdir(), "legacy-jacoco-v3-"));
  try { const path = atomicWriteJson(join(dir, "nested", "state.json"), { status: "COMPLETE" }); assert.deepEqual(JSON.parse(readFileSync(path, "utf8")), { status: "COMPLETE" }); } finally { rmSync(dir, { recursive: true, force: true }); }
});
