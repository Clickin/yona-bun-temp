import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { run as reconcile } from "./legacy-jacoco-reconciliation.mjs";
import { runFiveControllerValidation } from "./legacy-jacoco-validation.mjs";
import { repoRoot, resolveDistributionClassfiles } from "./legacy-jacoco-report.mjs";

export const fullSweepV2OutputDir = resolve(repoRoot, ".agent/legacy-jacoco/full-sweep-v2");

function runNode(args, env) {
  return execFileSync(process.execPath, args, { cwd: repoRoot, env, stdio: "inherit" });
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

export async function runFullSweepV2(env = process.env) {
  const validation = await runFiveControllerValidation({
    ...env,
    YONA_LEGACY_JACOCO_VALIDATION_DIR: env.YONA_LEGACY_JACOCO_VALIDATION_DIR,
  });
  if (!validation.fullSweepAllowed) {
    return { validation, fullSweepAllowed: false, outputDir: fullSweepV2OutputDir };
  }

  rmSync(fullSweepV2OutputDir, { recursive: true, force: true });
  mkdirSync(fullSweepV2OutputDir, { recursive: true });
  const runEnv = {
    ...env,
    YONA_LEGACY_JACOCO: "1",
    YONA_LEGACY_JACOCO_PLAY_COMPAT: "1",
    YONA_LEGACY_JACOCO_OUTPUT_DIR: fullSweepV2OutputDir,
    YONA_LEGACY_JACOCO_DESTFILE: join(fullSweepV2OutputDir, "yona.exec"),
    YONA_LEGACY_JACOCO_CLASSDUMP_DIR: join(fullSweepV2OutputDir, "diagnostic", "runtime-classes"),
  };
  const distributionClassfiles = resolveDistributionClassfiles(runEnv);
  if (distributionClassfiles.length > 0) {
    runEnv.YONA_LEGACY_JACOCO_CANONICAL_CLASSFILES = distributionClassfiles.join(",");
    runEnv.YONA_LEGACY_JACOCO_CLASSFILES = distributionClassfiles.join(",");
  }
  runNode(["scripts/differential/run.mjs"], runEnv);
  runNode(["scripts/legacy-jacoco-diagnostics.mjs", "identity"], runEnv);
  runNode(["scripts/legacy-jacoco-report.mjs"], runEnv);
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
    analyzer: readJson(join(fullSweepV2OutputDir, "summary.json")).analyzer ?? "jacoco-0.8.14-play23-compat",
    sourceBackedClasses: (readJson(join(fullSweepV2OutputDir, "summary.json")).sourceBacked?.classes ?? 0),
    sourceBackedMethods: reconciled.sourceBackedMethods.length,
    majorControllerMethodsVisible: reconciled.controllerSummary.filter((row) => row.totalMethods > 0).length,
    coverageEvidenceStatus: reconciled.coverageEvidence.status,
    identityWarnings: readJson(join(fullSweepV2OutputDir, "coverage-identity.json")).warnings ?? [],
    reconciliation: reconciled.reconciliation.summary,
    discoveryQueue: Object.fromEntries(Object.entries(reconciled.queue.priorities).map(([priority, rows]) => [priority, rows.length])),
  };
  writeMetadata(fullSweepV2OutputDir, metadata);
  return { ...metadata, validation, fullSweepAllowed: true, outputDir: fullSweepV2OutputDir };
}

export async function main(env = process.env) {
  const result = await runFullSweepV2(env);
  console.log(`legacy full sweep v2: ${result.fullSweepAllowed ? "complete" : "blocked by five-controller gate"}`);
  if (!result.fullSweepAllowed) process.exitCode = 1;
  return result;
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try { await main(); } catch (error) { console.error(`legacy-jacoco-full-sweep-v2: ${error.message}`); process.exitCode = 1; }
}
