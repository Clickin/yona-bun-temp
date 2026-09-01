import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { DOMAIN_REGISTRY, scenarios } from "./differential/scenarios/index.mjs";
import { run as reconcile } from "./legacy-jacoco-reconciliation.mjs";
import { runFiveControllerValidation } from "./legacy-jacoco-validation.mjs";
import { executeJacocoCli, repoRoot, resolveCliJar, resolveDistributionClassfiles } from "./legacy-jacoco-report.mjs";

export const fullSweepV3OutputDir = resolve(repoRoot, ".agent/legacy-jacoco/full-sweep-v3");
export const registeredScenarioCount = scenarios.length;
const DEFAULT_DOMAINS = Object.entries(DOMAIN_REGISTRY).map(([id, domain]) => ({ id, scenarioIds: domain.scenarios.map(({ id: scenarioId }) => scenarioId) }));

const idOf = (row) => typeof row === "string" ? row : row?.id ?? row?.scenarioId ?? row?.behaviorId;
export function buildManifest(domains = DEFAULT_DOMAINS) {
  const shardRows = domains.map((domain) => ({ id: domain.id ?? idOf(domain), scenarioIds: [...(domain.scenarioIds ?? [idOf(domain)])].sort() }));
  const ids = shardRows.flatMap(({ scenarioIds }) => scenarioIds);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (ids.some((id) => !id) || duplicates.length) throw new Error(`manifest exact-once violation: ${duplicates.join(",") || "invalid id"}`);
  const manifest = { version: 3, registeredScenarioCount: ids.length, shards: shardRows };
  return { ...manifest, manifestSha256: createHash("sha256").update(JSON.stringify(manifest)).digest("hex") };
}
export function validateManifest(manifest, registeredScenarios = scenarios) {
  const registered = registeredScenarios.map(idOf).sort();
  const represented = manifest?.shards?.flatMap(({ scenarioIds = [] }) => scenarioIds) ?? manifest?.scenarioIds ?? [];
  const counts = new Map(represented.map((id) => [id, (represented.filter((x) => x === id).length)]));
  const duplicates = [...counts].filter(([, count]) => count > 1).map(([id]) => id);
  const uniqueRepresented = [...new Set(represented)].sort();
  const result = { registered, uniqueRepresented, missing: registered.filter((id) => !uniqueRepresented.includes(id)), duplicates, unknown: uniqueRepresented.filter((id) => !registered.includes(id)) };
  const canonical = registeredScenarios === scenarios ? buildManifest(DEFAULT_DOMAINS) : null;
  if (manifest?.version !== 3 || manifest?.registeredScenarioCount !== registered.length || (canonical && manifest?.manifestSha256 !== canonical.manifestSha256)) result.malformed = true;
  return result;
}
export function shouldRunShard(status, { forceAll = false, forceShardIds = [] } = {}) { return forceAll || forceShardIds.includes(status.id ?? status.shard ?? status) || !["COMPLETE"].includes(status.status); }
export function mergeScenarioReports(reports, registeredScenarios = scenarios) {
  const rows = reports.flatMap((item) => item?.report ? (item.report.scenarios ?? []).map((row) => ({ ...row, sourceShard: row.sourceShard ?? item.shard })) : (item?.scenarios ?? []));
  const seen = new Set();
  for (const row of rows) { const id = idOf(row); if (!id || seen.has(id)) throw new Error(`duplicate scenario report: ${id}`); seen.add(id); }
  const expected = new Set(registeredScenarios.map(idOf));
  return {
    version: 3,
    scenarios: rows.sort((a, b) => idOf(a).localeCompare(idOf(b))),
    missingScenarioIds: [...expected].filter((id) => !seen.has(id)),
    globalInfraErrors: reports.flatMap((item) => (item?.report ?? item)?.infraErrors ?? []),
    dbProjection: reports.flatMap((item) => {
      const report = item?.report ?? item;
      return (report?.dbProjection?.violations ?? []).map((entry) => ({ ...entry, shard: item?.shard ?? null, scenarioId: entry.scenarioId ?? null }));
    }),
    sideEffectEvidence: reports.flatMap((item) => (item?.report ?? item)?.sideEffectEvidence ?? []).map((entry) => ({ ...entry, shard: entry.shard ?? null, scenarioId: entry.scenarioId ?? null })),
  };
}
export function mergeBehaviorCoverage(coverageReports, registeredScenarios = scenarios, inventory = []) {
  const reports = coverageReports.flat(Infinity);
  const scenarioRows = reports.flatMap((report) => report?.scenarios ?? []);
  const rows = reports.flatMap((report) => report?.behaviors ?? report?.coverage ?? (report?.behaviorId ? [report] : [])).concat(
    scenarioRows.flatMap((scenario) => (scenario.behaviorIds ?? []).map((behaviorId) => ({ behaviorId, scenarioId: scenario.scenarioId ?? scenario.id }))),
  );
  const byId = new Map();
  for (const row of rows) { const id = idOf(row); if (id) byId.set(id, { ...(byId.get(id) ?? {}), ...row }); }
  const expected = inventory.length ? inventory.map(idOf) : registeredScenarios.flatMap((s) => s.behaviorIds ?? []);
  return { registered: expected.length, observed: byId.size, missing: expected.filter((id) => !byId.has(id)).sort(), duplicateBehaviorIds: rows.map(idOf).filter((id, i, all) => id && all.indexOf(id) !== i).sort(), byBehaviorId: Object.fromEntries([...byId].sort()), byScenario: Object.fromEntries(scenarioRows.map((row) => [row.scenarioId ?? row.id, row.behaviorIds ?? []])) };
}
export function aggregateStepAccounting(rows, registeredScenarios = null, globalInfraErrors = []) {
  const all = rows.flatMap((row) => row?.steps ?? row?.stepResults ?? []);
  const counts = Object.fromEntries(["EXECUTED", "SKIPPED", "FAILED"].map((status) => [status, all.filter((step) => step.status === status).length]));
  return { registeredScenarios: registeredScenarios?.length ?? null, attemptedScenarios: rows.length, ...counts, unattemptedScenarios: registeredScenarios ? Math.max(0, registeredScenarios.length - rows.length) : null, globalInfraErrors, totalStepErrors: counts.SKIPPED + counts.FAILED };
}
export function evaluateEvidenceGate(input, expectedScenarioCount = registeredScenarioCount) {
  const reasons = [];
  if (!input?.reportComplete) reasons.push("REPORT_INCOMPLETE");
  if (input?.manifestValid === false) reasons.push("MANIFEST_INVALID");
  if ((input?.scenarioAccounting?.attemptedScenarios ?? input?.attemptedScenarios ?? 0) !== expectedScenarioCount) reasons.push("SCENARIO_ACCOUNTING_INCOMPLETE");
  if (input?.coverageEvidenceStatus && input.coverageEvidenceStatus !== "VALID") reasons.push("COVERAGE_EVIDENCE_INVALID");
  if ((input?.shards ?? []).some((shard) => shard.status !== "COMPLETE" || !shard.nonzeroExec)) reasons.push("SHARD_EVIDENCE_INCOMPLETE");
  if ((input?.identityWarnings ?? []).length > 0) reasons.push("IDENTITY_WARNINGS");
  const sourceClasses = input?.sourceBackedClasses ?? input?.sourceBacked?.classes ?? 0;
  const sourceMethods = input?.sourceBackedMethods ?? input?.sourceBacked?.methods ?? 0;
  if (!(sourceClasses > 0 && sourceMethods > 0)) reasons.push("SOURCE_COVERAGE_MISSING");
  if (!(input?.majorControllerMethodsVisible > 0)) reasons.push("CONTROLLER_EVIDENCE_MISSING");
  if ((input?.globalInfraErrors ?? []).length > 0) reasons.push("GLOBAL_INFRA_ERRORS");
  return { status: reasons.length ? "BLOCKED" : "PASS", valid: reasons.length === 0, reasons };
}
export function classifyDiscoveryQueue(entries, partials = [], coverageEvidence = { status: "VALID" }) {
  if (coverageEvidence.status !== "VALID") return { version: 3, status: "BLOCKED", priorities: { P0: [], P1: [], P2: [], P3: [] } };
  const priorities = { P0: [], P1: [], P2: [], P3: [] };
  for (const entry of [...entries, ...partials]) {
    const priority = entry.priority ?? (
      entry.approvedDeviation ? "P3" :
      entry.stepStatus === "EXECUTED" && entry.runtimeStatus === "EXECUTED" && entry.observableMismatch ? "P0" :
      (entry.stepStatus === "FAILED" || entry.stepStatus === "SKIPPED") && entry.runtimeStatus === "MISSED" ? "P1" :
      entry.stepStatus === "EXECUTED" && entry.runtimeStatus === "MISSED" ? "P2" : "P3"
    );
    if (priorities[priority]) priorities[priority].push(entry);
  }
  for (const rows of Object.values(priorities)) rows.sort((a, b) => String(a.id ?? a.action).localeCompare(String(b.id ?? b.action)));
  return { version: 3, status: "READY", priorities };
}
export function atomicWriteJson(path, value) { mkdirSync(dirname(path), { recursive: true }); const tmp = `${path}.${process.pid}.tmp`; writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`); renameSync(tmp, path); return path; }
function readJson(path) { return JSON.parse(readFileSync(path, "utf8")); }
function runNode(args, env, timeout) { return execFileSync(process.execPath, args, { cwd: repoRoot, env, stdio: "inherit", timeout }); }
function parseOptions(env) {
  const args = new Set((env.YONA_LEGACY_JACOCO_FORCE_SHARDS ?? "").split(",").filter(Boolean));
  return { forceAll: env.YONA_LEGACY_JACOCO_FORCE_ALL === "1", forceShardIds: args };
}
export function parseCliOptions(argv) {
  const options = { resume: false, forceAll: false, forceShardIds: [] };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--resume") options.resume = true;
    else if (argv[i] === "--force-all") options.forceAll = true;
    else if (argv[i] === "--force-shard") options.forceShardIds.push(argv[++i]);
  }
  return options;
}
function shardUsable(dir, manifestSha256) {
  const statusPath = join(dir, "status.json"), reportPath = join(dir, "report.json"), execPath = join(dir, "yona.exec");
  if (!existsSync(statusPath) || !existsSync(reportPath) || !existsSync(execPath)) return false;
  try { const status = readJson(statusPath); return status.status === "COMPLETE" && status.manifestSha256 === manifestSha256 && readFileSync(execPath).length > 0; } catch { return false; }
}

export async function runFullSweepV3(env = process.env) {
  const outputDir = resolve(env.YONA_LEGACY_JACOCO_FULL_SWEEP_OUTPUT_DIR ?? fullSweepV3OutputDir);
  if (!env.YONA_LEGACY_JACOCO_FULL_SWEEP_RESUME) rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  const existingMetadataPath = join(outputDir, "run-metadata.json");
  const existingMetadata = env.YONA_LEGACY_JACOCO_FULL_SWEEP_RESUME && existsSync(existingMetadataPath) ? readJson(existingMetadataPath) : null;
  const manifestPath = join(outputDir, "manifest.json");
  const manifest = env.YONA_LEGACY_JACOCO_FULL_SWEEP_RESUME && existsSync(manifestPath) ? readJson(manifestPath) : buildManifest();
  const validationResult = validateManifest(manifest);
  if (validationResult.missing.length || validationResult.duplicates.length || validationResult.unknown.length || validationResult.malformed) throw new Error("manifest exact-once validation failed");
  atomicWriteJson(manifestPath, manifest);
  const progressPath = join(outputDir, "progress.json");
  atomicWriteJson(progressPath, { version: 3, status: "RUNNING", manifestSha256: manifest.manifestSha256, shards: manifest.shards.map(({ id }) => ({ id, status: "PENDING" })) });
  const runId = existingMetadata?.runId ?? env.YONA_LEGACY_JACOCO_RUN_ID ?? `full-sweep-v3-${Date.now().toString(36)}`;
  atomicWriteJson(join(outputDir, "run-metadata.json"), { schemaVersion: 3, version: 3, runId, generatedAt: new Date().toISOString(), outputDir, registeredScenarioCount: manifest.registeredScenarioCount, manifestSha256: manifest.manifestSha256, shards: manifest.shards.map(({ id }) => ({ id, status: "PENDING" })), resume: Boolean(env.YONA_LEGACY_JACOCO_FULL_SWEEP_RESUME), forceAll: env.YONA_LEGACY_JACOCO_FORCE_ALL === "1", forceShardIds: [...parseOptions(env).forceShardIds] });
  let validation;
  try {
    validation = await runFiveControllerValidation({ ...env, YONA_LEGACY_JACOCO_VALIDATION_DIR: env.YONA_LEGACY_JACOCO_VALIDATION_DIR });
  } catch (error) {
    const evidenceGate = { status: "BLOCKED", reasons: ["FIVE_CONTROLLER_VALIDATION_FAILED"] };
    atomicWriteJson(join(outputDir, "summary.json"), { version: 3, status: "BLOCKED", runId, evidenceGate, error: error.message });
    atomicWriteJson(existingMetadataPath, { ...readJson(existingMetadataPath), runId, status: "BLOCKED", evidenceGate, error: error.message });
    atomicWriteJson(progressPath, { version: 3, status: "BLOCKED", manifestSha256: manifest.manifestSha256, shards: manifest.shards.map(({ id }) => ({ id, status: "BLOCKED" })), reason: error.message });
    return { outputDir, fullSweepAllowed: false, reason: "FIVE_CONTROLLER_VALIDATION_FAILED" };
  }
  if (!validation.fullSweepAllowed) { const evidenceGate = { status: "BLOCKED", reasons: ["FIVE_CONTROLLER_GATE_FAILED"] }; atomicWriteJson(join(outputDir, "summary.json"), { version: 3, status: "BLOCKED", runId, evidenceGate }); atomicWriteJson(existingMetadataPath, { ...readJson(existingMetadataPath), runId, status: "BLOCKED", evidenceGate }); return { outputDir, fullSweepAllowed: false }; }
  const domainEntries = manifest.shards.map(({ id }) => [id, DOMAIN_REGISTRY[id]]);
  const timeout = Number(env.YONA_LEGACY_JACOCO_SHARD_TIMEOUT_MS ?? 15 * 60 * 1000);
  const statusesOut = [];
  for (const [domain, registry] of domainEntries) {
    const shardDir = join(outputDir, "shards", domain);
    const status = { id: domain, domain, manifestSha256: manifest.manifestSha256, status: "RUNNING" };
    if (!parseOptions(env).forceAll && !parseOptions(env).forceShardIds.has(domain) && shardUsable(shardDir, manifest.manifestSha256)) { status.status = "COMPLETE"; atomicWriteJson(join(shardDir, "status.json"), status); statusesOut.push(status); continue; }
    atomicWriteJson(join(shardDir, "status.json"), status);
    atomicWriteJson(join(shardDir, "progress.json"), { domain, status: "RUNNING", attempted: 0 });
    try {
      const shardEnv = { ...env, YONA_DIFFERENTIAL_OUTPUT_DIR: shardDir, YONA_DIFFERENTIAL_SCENARIO_IDS: registry.scenarios.map(({ id }) => id).join(","), YONA_DIFFERENTIAL_PARTIAL_REPORT: join(shardDir, "partial-report.json"), YONA_DIFFERENTIAL_PROGRESS: join(shardDir, "progress.json"), YONA_LEGACY_JACOCO_DESTFILE: join(shardDir, "yona.exec"), YONA_LEGACY_JACOCO: "1", YONA_LEGACY_JACOCO_PLAY_COMPAT: "1" };
      runNode(["scripts/differential/run.mjs"], shardEnv, timeout);
      status.status = "COMPLETE";
      const shardReportPath = join(shardDir, "report.json");
      const shardReport = existsSync(shardReportPath) ? readJson(shardReportPath) : {};
      status.scenarioCount = registry.scenarios.length;
      status.attempted = shardReport.scenarios?.length ?? null;
      status.runId = shardReport.runId ?? null;
      status.coverageEvidenceStatus = shardReport.coverageEvidenceStatus ?? null;
      status.execBytes = existsSync(join(shardDir, "yona.exec")) ? readFileSync(join(shardDir, "yona.exec")).length : 0;
      atomicWriteJson(join(shardDir, "progress.json"), { domain, status: "COMPLETE", attempted: registry.scenarios.length });
    } catch (error) {
      status.status = "FAILED"; status.error = error.message;
      atomicWriteJson(join(shardDir, "progress.json"), { domain, status: "FAILED", attempted: null, error: error.message });
      atomicWriteJson(progressPath, { version: 3, status: "FAILED", manifestSha256: manifest.manifestSha256, failedShard: domain, shards: [...statusesOut, status] });
      atomicWriteJson(join(shardDir, "status.json"), status); statusesOut.push(status); return { outputDir, fullSweepAllowed: false, reason: "SHARD_FAILED" };
    }
    atomicWriteJson(join(shardDir, "status.json"), status); statusesOut.push(status);
    atomicWriteJson(progressPath, { version: 3, status: "RUNNING", manifestSha256: manifest.manifestSha256, shards: statusesOut.map(({ id, status: shardStatus }) => ({ id, status: shardStatus })) });
  }
  const missingEvidence = statusesOut.filter(({ domain }) => {
    const exec = join(outputDir, "shards", domain, "yona.exec");
    return !existsSync(join(outputDir, "shards", domain, "report.json")) || !existsSync(exec) || readFileSync(exec).length === 0;
  });
  if (missingEvidence.length) {
    const reason = "SHARD_EVIDENCE_INCOMPLETE";
    atomicWriteJson(progressPath, { version: 3, status: "BLOCKED", manifestSha256: manifest.manifestSha256, shards: statusesOut, reason });
    atomicWriteJson(join(outputDir, "summary.json"), { version: 3, status: "BLOCKED", manifest, evidenceGate: { status: "BLOCKED", reasons: [reason] } });
    atomicWriteJson(join(outputDir, "run-metadata.json"), { ...readJson(join(outputDir, "run-metadata.json")), status: "BLOCKED", shards: statusesOut, evidenceGate: { status: "BLOCKED", reasons: [reason] } });
    return { outputDir, fullSweepAllowed: false, reason };
  }
  const reportPaths = statusesOut.map(({ domain }) => join(outputDir, "shards", domain, "report.json")).filter(existsSync);
  const merged = mergeScenarioReports(reportPaths.map((path, i) => ({ shard: statusesOut[i]?.domain ?? i, report: readJson(path) })));
  const mergedDir = join(outputDir, "merged"); mkdirSync(mergedDir, { recursive: true });
  atomicWriteJson(join(mergedDir, "differential-report.json"), merged);
  const runEnv = { ...env, YONA_LEGACY_JACOCO: "1", YONA_LEGACY_JACOCO_PLAY_COMPAT: "1", YONA_LEGACY_JACOCO_OUTPUT_DIR: mergedDir, YONA_LEGACY_JACOCO_DESTFILE: join(mergedDir, "yona.exec"), YONA_LEGACY_JACOCO_EXEC: join(mergedDir, "yona.exec"), YONA_DIFFERENTIAL_REPORT: join(mergedDir, "differential-report.json") };
  const classfiles = resolveDistributionClassfiles(runEnv);
  if (classfiles.length) runEnv.YONA_LEGACY_JACOCO_CLASSFILES = classfiles.join(",");
  try {
    const shardExecs = statusesOut.map(({ domain }) => join(outputDir, "shards", domain, "yona.exec")).filter(existsSync);
    if (shardExecs.length > 0) {
      const cli = resolveCliJar(runEnv);
      if (!cli) throw new Error("JaCoCo CLI jar not found for shard merge");
      const merge = executeJacocoCli({ cli, args: ["merge", ...shardExecs.flatMap((exec) => ["--execfiles", exec]), "--destfile", runEnv.YONA_LEGACY_JACOCO_DESTFILE] });
      if (merge.status !== 0) throw new Error(`JaCoCo merge failed: ${merge.output}`);
    }
    runNode(["scripts/legacy-jacoco-diagnostics.mjs", "identity"], runEnv, timeout);
    runNode(["scripts/legacy-jacoco-report.mjs"], runEnv, timeout);
  } catch (error) {
    const gate = evaluateEvidenceGate({ reportComplete: false, manifestValid: true, attemptedScenarios: merged.scenarios.length, coverageEvidenceStatus: "BLOCKED" }, manifest.registeredScenarioCount);
    atomicWriteJson(join(mergedDir, "summary.json"), { version: 3, status: gate.status, manifest, scenarioAccounting: aggregateStepAccounting(merged.scenarios, scenarios), evidenceGate: gate, error: error.message });
    atomicWriteJson(existingMetadataPath, { ...readJson(existingMetadataPath), runId, status: "BLOCKED", evidenceGate: gate, error: error.message });
    return { outputDir, fullSweepAllowed: false, evidenceGate: gate };
  }
  let reconciliation = null;
  try { reconciliation = reconcile(runEnv); } catch { /* evidence gate below remains authoritative */ }
  const coverage = reportPaths.map((path) => { const dir = dirname(path); const candidate = join(dir, "behavior-coverage.json"); return existsSync(candidate) ? readJson(candidate) : null; }).filter(Boolean);
  const behaviorInventory = readJson(join(repoRoot, "docs/provenance/behavior-inventory.json"));
  atomicWriteJson(join(mergedDir, "behavior-coverage.json"), mergeBehaviorCoverage(coverage, scenarios, behaviorInventory.behaviors ?? []));
  atomicWriteJson(join(mergedDir, "reconciliation.json"), reconciliation ?? { version: 3, status: "BLOCKED", reason: "RECONCILIATION_UNAVAILABLE", entries: [] });
  atomicWriteJson(join(mergedDir, "discovery-queue.json"), reconciliation?.queue ?? classifyDiscoveryQueue([], [], { status: "BLOCKED" }));
  atomicWriteJson(join(mergedDir, "controller-review.json"), reconciliation?.controllerSummary ?? { status: "BLOCKED", controllers: [] });
  const identity = existsSync(join(mergedDir, "coverage-identity.json")) ? readJson(join(mergedDir, "coverage-identity.json")) : {};
  const mergedSummary = existsSync(join(mergedDir, "summary.json")) ? readJson(join(mergedDir, "summary.json")) : {};
  const sourceBacked = mergedSummary.sourceBacked ?? {};
  const controllerRows = Array.isArray(reconciliation?.controllerSummary) ? reconciliation.controllerSummary : [];
  const gate = evaluateEvidenceGate({ reportComplete: merged.missingScenarioIds.length === 0, manifestValid: true, attemptedScenarios: merged.scenarios.length, coverageEvidenceStatus: reconciliation?.coverageEvidence?.status ?? "BLOCKED", shards: statusesOut.map((shard) => ({ ...shard, nonzeroExec: existsSync(join(outputDir, "shards", shard.domain, "yona.exec")) && readFileSync(join(outputDir, "shards", shard.domain, "yona.exec")).length > 0 })), identityWarnings: identity.warnings ?? [], sourceBackedClasses: sourceBacked.classes ?? (reconciliation?.sourceClasses?.length ?? 0), sourceBackedMethods: sourceBacked.methods ?? (reconciliation?.sourceBackedMethods?.length ?? 0), majorControllerMethodsVisible: controllerRows.filter((row) => row.totalMethods > 0).length, globalInfraErrors: merged.globalInfraErrors ?? [] }, manifest.registeredScenarioCount);
  atomicWriteJson(join(mergedDir, "step-summary.json"), aggregateStepAccounting(merged.scenarios, scenarios));
  const finalSummary = { version: 3, status: gate.status, manifest, runId, analyzer: "jacoco-0.8.14-play23-compat", scenarioAccounting: aggregateStepAccounting(merged.scenarios, scenarios), behaviorCoverage: readJson(join(mergedDir, "behavior-coverage.json")), identityWarnings: identity.warnings ?? [], coverageEvidenceStatus: reconciliation?.coverageEvidence?.status ?? "BLOCKED", globalInfraErrors: merged.globalInfraErrors ?? [], reconciliationSummary: reconciliation?.reconciliation?.summary ?? null, discoveryCounts: Object.fromEntries(Object.entries((reconciliation?.queue ?? { priorities: {} }).priorities).map(([key, rows]) => [key, rows.length])), mergedExecBytes: existsSync(join(mergedDir, "yona.exec")) ? readFileSync(join(mergedDir, "yona.exec")).length : 0, evidenceGate: gate };
  atomicWriteJson(join(mergedDir, "summary.json"), finalSummary);
  atomicWriteJson(join(outputDir, "run-metadata.json"), { ...readJson(join(outputDir, "run-metadata.json")), runId, shards: statusesOut, scenarioAccounting: finalSummary.scenarioAccounting, behaviorCoverage: finalSummary.behaviorCoverage, evidenceGate: gate, discoveryCounts: finalSummary.discoveryCounts });
  atomicWriteJson(progressPath, { version: 3, status: gate.status === "PASS" ? "COMPLETE" : "BLOCKED", manifestSha256: manifest.manifestSha256, shards: statusesOut });
  return { outputDir, fullSweepAllowed: gate.valid, evidenceGate: gate };
}
export async function main(env = process.env, argv = process.argv.slice(2)) { const cli = parseCliOptions(argv); const result = await runFullSweepV3({ ...env, ...(cli.resume ? { YONA_LEGACY_JACOCO_FULL_SWEEP_RESUME: "1" } : {}), ...(cli.forceAll ? { YONA_LEGACY_JACOCO_FORCE_ALL: "1" } : {}), ...(cli.forceShardIds.length ? { YONA_LEGACY_JACOCO_FORCE_SHARDS: cli.forceShardIds.join(",") } : {}) }); if (!result.fullSweepAllowed) process.exitCode = 1; return result; }
if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) main();
