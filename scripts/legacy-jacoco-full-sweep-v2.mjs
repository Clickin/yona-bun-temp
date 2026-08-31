import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { run as reconcile } from "./legacy-jacoco-reconciliation.mjs";
import { runFiveControllerValidation } from "./legacy-jacoco-validation.mjs";
import { repoRoot, resolveDistributionClassfiles } from "./legacy-jacoco-report.mjs";

export const fullSweepV2OutputDir = resolve(repoRoot, ".agent/legacy-jacoco/full-sweep-v2");
const registeredScenarioCount = 117;
const defaultRunnerTimeoutMs = 15 * 60 * 1000;

export function runNode(args, env, timeoutMs = defaultRunnerTimeoutMs) {
  try {
    return execFileSync(process.execPath, args, { cwd: repoRoot, env, stdio: "inherit", timeout: timeoutMs });
  } catch (error) {
    error.sweepCommand = [process.execPath, ...args];
    throw error;
  }
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeMetadata(outputDir, metadata) {
  writeFileSync(join(outputDir, "run-metadata.json"), `${JSON.stringify(metadata, null, 2)}\n`);
  const summaryPath = join(outputDir, "summary.json");
  if (!existsSync(summaryPath)) return;
  const summary = readJson(summaryPath);
  writeFileSync(summaryPath, `${JSON.stringify({ ...summary, ...metadata }, null, 2)}\n`);
}

export function writeBlockedSweepArtifacts(
  outputDir,
  {
    reason,
    error = null,
    validation = null,
    command = error?.sweepCommand ?? null,
    attemptedScenarios = null,
    stepAccounting = null,
    validationResultPath = null,
  } = {},
) {
  mkdirSync(outputDir, { recursive: true });
  const message = error?.message ?? reason;
  const steps = stepAccounting ?? { EXECUTED: null, SKIPPED: null, FAILED: null };
  const failure = {
    version: 2,
    status: "BLOCKED",
    fullSweepCompleted: false,
    reason,
    command,
    error: error
      ? { message: error.message, code: error.code ?? null, signal: error.signal ?? null, status: error.status ?? null }
      : null,
  };
  const gate = validation
    ? { allPassed: validation.allPassed, fullSweepAllowed: validation.fullSweepAllowed, resultPath: validationResultPath }
    : { allPassed: false, fullSweepAllowed: false, resultPath: null };
  const summary = {
    version: 2,
    status: "BLOCKED",
    fullSweepAllowed: false,
    fullSweepCompleted: false,
    runId: null,
    fiveControllerGate: gate,
    registeredScenarios: registeredScenarioCount,
    attemptedScenarios,
    globalInfraErrors: [message],
    steps: stepAccounting,
    scenariosWithStepErrors: null,
    scenariosWithoutStepErrors: null,
    coverageEvidenceStatus: "BLOCKED",
    coverageEvidenceReason: reason,
    sourceBackedClasses: null,
    sourceBackedMethods: null,
    majorControllerMethodsVisible: null,
    identityWarnings: [],
    reconciliation: null,
    discoveryQueue: { P0: 0, P1: 0, P2: 0, P3: 0 },
  };
  writeFileSync(join(outputDir, "failure.json"), `${JSON.stringify(failure, null, 2)}\n`);
  writeFileSync(join(outputDir, "summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
  writeFileSync(join(outputDir, "step-summary.json"), `${JSON.stringify({
    version: 2,
    status: "BLOCKED",
    fullSweepCompleted: false,
    registeredScenarios: registeredScenarioCount,
    attemptedScenarios,
    globalInfraErrors: [message],
    EXECUTED: steps.EXECUTED,
    SKIPPED: steps.SKIPPED,
    FAILED: steps.FAILED,
    scenariosWithStepErrors: attemptedScenarios === 0 ? 0 : null,
    scenariosWithoutStepErrors: null,
    totalStepErrors: steps.EXECUTED === null ? null : steps.SKIPPED + steps.FAILED,
  }, null, 2)}\n`);
  writeFileSync(join(outputDir, "reconciliation.json"), `${JSON.stringify({
    version: 2,
    status: "BLOCKED",
    fullSweepCompleted: false,
    coverageEvidenceStatus: "BLOCKED",
    reason,
    entries: [],
    summary: null,
  }, null, 2)}\n`);
  writeFileSync(join(outputDir, "discovery-queue.json"), `${JSON.stringify({
    version: 2,
    status: "BLOCKED",
    fullSweepCompleted: false,
    coverageEvidenceStatus: "BLOCKED",
    coverageEvidenceCode: reason,
    coverageEvidenceReason: "No product discovery queue is emitted without fresh runtime evidence.",
    priorities: { P0: [], P1: [], P2: [], P3: [] },
  }, null, 2)}\n`);
  writeFileSync(join(outputDir, "controller-review.json"), `${JSON.stringify({
    version: 2,
    status: "BLOCKED",
    fullSweepCompleted: false,
    coverageEvidenceStatus: "BLOCKED",
    reason,
    controllers: [],
    routeFacingFullyMissed: [],
  }, null, 2)}\n`);
  writeFileSync(join(outputDir, "run-metadata.json"), `${JSON.stringify({
    ...failure,
    registeredScenarios: registeredScenarioCount,
    attemptedScenarios,
    coverageEvidenceStatus: "BLOCKED",
  }, null, 2)}\n`);
  return { status: "BLOCKED", reason, outputDir, failure };
}

export async function runFullSweepV2(env = process.env) {
  const outputDir = resolve(env.YONA_LEGACY_JACOCO_FULL_SWEEP_OUTPUT_DIR ?? fullSweepV2OutputDir);
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });
  let validation;
  try {
    validation = await runFiveControllerValidation({
      ...env,
      YONA_LEGACY_JACOCO_VALIDATION_DIR: env.YONA_LEGACY_JACOCO_VALIDATION_DIR,
    });
  } catch (error) {
    const blocked = writeBlockedSweepArtifacts(outputDir, {
      reason: "FIVE_CONTROLLER_VALIDATION_FAILED",
      error,
      attemptedScenarios: 0,
      stepAccounting: { EXECUTED: 0, SKIPPED: 0, FAILED: 0 },
      validationResultPath: resolve(env.YONA_LEGACY_JACOCO_VALIDATION_DIR ?? ".agent/legacy-jacoco/five-controller-validation", "result.json"),
    });
    return { validation: null, fullSweepAllowed: false, ...blocked };
  }
  if (!validation.fullSweepAllowed) {
    const blocked = writeBlockedSweepArtifacts(outputDir, {
      reason: "FIVE_CONTROLLER_GATE_FAILED",
      validation,
      attemptedScenarios: 0,
      stepAccounting: { EXECUTED: 0, SKIPPED: 0, FAILED: 0 },
      validationResultPath: resolve(env.YONA_LEGACY_JACOCO_VALIDATION_DIR ?? ".agent/legacy-jacoco/five-controller-validation", "result.json"),
    });
    return { validation, fullSweepAllowed: false, ...blocked };
  }

  const runEnv = {
    ...env,
    YONA_LEGACY_JACOCO: "1",
    YONA_LEGACY_JACOCO_PLAY_COMPAT: "1",
    YONA_LEGACY_JACOCO_OUTPUT_DIR: outputDir,
    YONA_LEGACY_JACOCO_DESTFILE: join(outputDir, "yona.exec"),
    YONA_LEGACY_JACOCO_CLASSDUMP_DIR: join(outputDir, "diagnostic", "runtime-classes"),
  };
  const distributionClassfiles = resolveDistributionClassfiles(runEnv);
  if (distributionClassfiles.length > 0) {
    runEnv.YONA_LEGACY_JACOCO_CANONICAL_CLASSFILES = distributionClassfiles.join(",");
    runEnv.YONA_LEGACY_JACOCO_CLASSFILES = distributionClassfiles.join(",");
  }
  const runnerTimeoutMs = Number.isFinite(Number(env.YONA_LEGACY_JACOCO_FULL_SWEEP_TIMEOUT_MS)) &&
    Number(env.YONA_LEGACY_JACOCO_FULL_SWEEP_TIMEOUT_MS) > 0
    ? Number(env.YONA_LEGACY_JACOCO_FULL_SWEEP_TIMEOUT_MS)
    : defaultRunnerTimeoutMs;
  let stage = "differential";
  try {
    runNode(["scripts/differential/run.mjs"], runEnv, runnerTimeoutMs);
    stage = "identity";
    runNode(["scripts/legacy-jacoco-diagnostics.mjs", "identity"], runEnv);
    stage = "report";
    runNode(["scripts/legacy-jacoco-report.mjs"], runEnv);
  } catch (error) {
    const blocked = writeBlockedSweepArtifacts(outputDir, {
      reason: `FULL_SWEEP_${stage.toUpperCase()}_FAILED`,
      error,
      validation,
      validationResultPath: resolve(env.YONA_LEGACY_JACOCO_VALIDATION_DIR ?? ".agent/legacy-jacoco/five-controller-validation", "result.json"),
    });
    return { validation, fullSweepAllowed: false, ...blocked };
  }
  stage = "reconciliation";
  try {
    const reconciled = reconcile(runEnv);
    const report = readJson(join(repoRoot, ".agent/differential/report.json"));
    const metadata = {
      version: 2,
      runId: report.runId ?? null,
      fiveControllerGate: {
        allPassed: validation.allPassed,
        fullSweepAllowed: validation.fullSweepAllowed,
        resultPath: resolve(env.YONA_LEGACY_JACOCO_VALIDATION_DIR ?? ".agent/legacy-jacoco/five-controller-validation", "result.json"),
      },
      registeredScenarios: reconciled.stepSummary.registeredScenarios,
      attemptedScenarios: reconciled.stepSummary.attemptedScenarios,
      globalInfraErrors: reconciled.stepSummary.globalInfraErrors,
      steps: {
        EXECUTED: reconciled.stepSummary.EXECUTED,
        SKIPPED: reconciled.stepSummary.SKIPPED,
        FAILED: reconciled.stepSummary.FAILED,
      },
      scenariosWithStepErrors: reconciled.stepSummary.scenariosWithStepErrors,
      scenariosWithoutStepErrors: reconciled.stepSummary.scenariosWithoutStepErrors,
      analyzer: readJson(join(outputDir, "summary.json")).analyzer ?? "jacoco-0.8.14-play23-compat",
      sourceBackedClasses: (readJson(join(outputDir, "summary.json")).sourceBacked?.classes ?? 0),
      sourceBackedMethods: reconciled.sourceBackedMethods.length,
      majorControllerMethodsVisible: reconciled.controllerSummary.filter((row) => row.totalMethods > 0).length,
      coverageEvidenceStatus: reconciled.coverageEvidence.status,
      identityWarnings: readJson(join(outputDir, "coverage-identity.json")).warnings ?? [],
      reconciliation: reconciled.reconciliation.summary,
      discoveryQueue: Object.fromEntries(Object.entries(reconciled.queue.priorities).map(([priority, rows]) => [priority, rows.length])),
    };
    writeMetadata(outputDir, metadata);
    return { ...metadata, validation, fullSweepAllowed: true, outputDir };
  } catch (error) {
    const blocked = writeBlockedSweepArtifacts(outputDir, {
      reason: `FULL_SWEEP_${stage.toUpperCase()}_FAILED`,
      error,
      validation,
      validationResultPath: resolve(env.YONA_LEGACY_JACOCO_VALIDATION_DIR ?? ".agent/legacy-jacoco/five-controller-validation", "result.json"),
    });
    return { validation, fullSweepAllowed: false, ...blocked };
  }
}

export async function main(env = process.env) {
  const result = await runFullSweepV2(env);
  console.log(`legacy full sweep v2: ${result.fullSweepAllowed ? "complete" : `blocked (${result.reason ?? "five-controller gate"})`}`);
  if (!result.fullSweepAllowed) process.exitCode = 1;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { await main(); } catch (error) { console.error(`legacy-jacoco-full-sweep-v2: ${error.message}`); process.exitCode = 1; }
}
