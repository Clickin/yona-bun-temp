// Runs the in-browser @web/test-runner e2e suite against the production build.
// Usage: node scripts/run-wtr-e2e.mjs [-- <web-test-runner args>]
// Explicit file args always run on one WTR instance. Full-suite sharding is
// opt-in with WTR_SHARDS=2..4; WTR_METRICS=1 writes ignored JSON diagnostics.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, "..");
const frontendRoot = resolve(repoRoot, "frontend");
const wtrDir = resolve(frontendRoot, "tests", "wtr");
const metricsEnabled = process.env.WTR_METRICS === "1";
const metricsDir = resolve(repoRoot, ".agent", "wtr-metrics");
const timingProfilePath = join(metricsDir, "wtr-timing-profile.json");
const runId = `${Date.now().toString(36)}-${process.pid}`;
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const startedAt = Date.now();

async function run(command, args, options = {}) {
  const { env = process.env, cwd = repoRoot } = options;
  const child = spawn(command, args, { cwd, env, stdio: "inherit" });
  const code = await new Promise((resolveExit) => {
    child.once("error", (error) => {
      console.error(`failed to spawn ${command}:`, error.message);
      resolveExit(1);
    });
    child.once("exit", (exitCode, signal) => resolveExit(signal ? 1 : (exitCode ?? 1)));
  });
  return code;
}

function currentMetricPath(label) {
  return join(metricsDir, `${runId}-${label}.json`);
}

function childEnv(label, outputPath) {
  if (!metricsEnabled) return process.env;
  return {
    ...process.env,
    WTR_METRICS_RUN_ID: runId,
    WTR_METRICS_SHARD: label,
    WTR_METRICS_OUTPUT: outputPath,
  };
}

async function runWtr(args, label) {
  const outputPath = metricsEnabled ? currentMetricPath(label) : undefined;
  const runStartedAt = Date.now();
  const code = await run(
    "pnpm",
    [
      "--config.store-dir=/Users/senghyunjo/.pnpm-store",
      "exec",
      "web-test-runner",
      "--config",
      "web-test-runner.config.mjs",
      ...args,
    ],
    {
      cwd: frontendRoot,
      env: metricsEnabled ? childEnv(label, outputPath) : process.env,
    },
  );
  return { code, label, elapsedMs: Date.now() - runStartedAt, outputPath };
}

function specFiles() {
  // The lane manifest is authoritative: only chrome-lane specs run here
  // (docs/provenance/tailwind-dom-parity-pivot.md gate wiring).
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, "frontend/tests/e2e-lane-manifest.json"), "utf8"),
  );
  return manifest.chrome
    .map((name) => basename(name))
    .filter((name) => !name.startsWith("_diag-"))
    .sort();
}

function fileRevision(name) {
  const info = statSync(resolve(wtrDir, name));
  return `${info.mtimeMs}:${info.size}`;
}

function readTimingProfile(files) {
  if (!existsSync(timingProfilePath)) return undefined;
  try {
    const profile = JSON.parse(readFileSync(timingProfilePath, "utf8"));
    const entries = new Map((profile.files ?? []).map((entry) => [basename(entry.file), entry]));
    const timings = files.map((name) => entries.get(name));
    if (timings.some((entry) => !entry || entry.revision !== fileRevision(basename(entry.file)))) {
      return undefined;
    }
    return new Map(files.map((name, index) => [name, timings[index].elapsedMs]));
  } catch {
    return undefined;
  }
}

function writeTimingProfile(files, metricPath) {
  if (!metricPath || !existsSync(metricPath)) return false;
  try {
    const metrics = JSON.parse(readFileSync(metricPath, "utf8"));
    const byFile = new Map((metrics.files ?? []).map((entry) => [basename(entry.file), entry]));
    const entries = files.map((name) => {
      const result = byFile.get(name);
      return {
        file: `tests/wtr/${name}`,
        revision: fileRevision(name),
        elapsedMs: result?.elapsedMs,
      };
    });
    if (entries.some((entry) => typeof entry.elapsedMs !== "number")) return false;
    mkdirSync(metricsDir, { recursive: true });
    writeFileSync(
      timingProfilePath,
      `${JSON.stringify({ schemaVersion: 1, generatedAt: new Date().toISOString(), files: entries }, null, 2)}\n`,
    );
    return true;
  } catch {
    return false;
  }
}

function writeRunMetrics({ buildMs, buildCode, wtrRuns, exitCode, mode, files, shardCount }) {
  if (!metricsEnabled) return;
  mkdirSync(metricsDir, { recursive: true });
  const childMetrics = wtrRuns.flatMap((runResult) => {
    if (!runResult.outputPath || !existsSync(runResult.outputPath)) return [];
    try {
      return [JSON.parse(readFileSync(runResult.outputPath, "utf8"))];
    } catch {
      return [];
    }
  });
  const wtrWallClockMs = wtrRuns.reduce((total, runResult) => total + runResult.elapsedMs, 0);
  writeFileSync(
    join(metricsDir, `${runId}-run.json`),
    `${JSON.stringify(
      {
        schemaVersion: 1,
        generatedAt: new Date().toISOString(),
        runId,
        mode,
        shardCount,
        files: files.length,
        exitCode,
        wallClockMs: Date.now() - startedAt,
        build: { elapsedMs: buildMs, exitCode: buildCode },
        wtr: {
          wallClockMs: wtrWallClockMs,
          processCount: childMetrics.length,
          chromiumLaunches: childMetrics.reduce(
            (total, item) => total + (item.wtr?.chromiumLaunches ?? 0),
            0,
          ),
          sessionStarts: childMetrics.reduce(
            (total, item) => total + (item.wtr?.sessionStarts ?? 0),
            0,
          ),
          sessionStops: childMetrics.reduce(
            (total, item) => total + (item.wtr?.sessionStops ?? 0),
            0,
          ),
          peakRssBytes: childMetrics.reduce(
            (peak, item) => Math.max(peak, item.wtr?.peakRssBytes ?? 0),
            0,
          ),
        },
        shards: wtrRuns.map((runResult, index) => ({
          label: runResult.label,
          elapsedMs: runResult.elapsedMs,
          exitCode: runResult.code,
          metrics: childMetrics[index] ?? null,
        })),
      },
      null,
      2,
    )}\n`,
  );
}

// Build once unless WTR_SKIP_BUILD=1 (fast iteration against a current dist).
let buildCode = 0;
let buildMs = 0;
if (process.env.WTR_SKIP_BUILD !== "1") {
  console.log("[wtr] building production frontend");
  const buildStartedAt = Date.now();
  buildCode = await run("pnpm", [
    "--config.store-dir=/Users/senghyunjo/.pnpm-store",
    "--dir",
    "frontend",
    "build",
  ]);
  buildMs = Date.now() - buildStartedAt;
  if (buildCode !== 0) {
    writeRunMetrics({
      buildMs,
      buildCode,
      wtrRuns: [],
      exitCode: buildCode,
      mode: "build",
      files: [],
      shardCount: 1,
    });
    process.exit(buildCode);
  }
} else {
  console.log("[wtr] WTR_SKIP_BUILD=1 — skipping production build (dist must be current)");
}

const explicitFiles = forwardedArgs.some((arg) => arg.endsWith(".e2e.ts"));
if (explicitFiles) {
  console.log("[wtr] running web-test-runner (focused files)");
  const result = await runWtr(forwardedArgs, "focused");
  writeRunMetrics({
    buildMs,
    buildCode,
    wtrRuns: [result],
    exitCode: result.code,
    mode: "focused",
    files: forwardedArgs.filter((arg) => arg.endsWith(".e2e.ts")),
    shardCount: 1,
  });
  process.exit(result.code);
}

const files = specFiles();
const requestedShards = process.env.WTR_SHARDS;
const shardCount = /^[234]$/u.test(requestedShards ?? "") ? Number(requestedShards) : 1;
if (requestedShards && shardCount === 1 && requestedShards !== "1") {
  console.log(
    `[wtr] ignoring invalid WTR_SHARDS=${requestedShards}; allowed values are 2, 3, or 4`,
  );
}

if (shardCount === 1) {
  console.log(`[wtr] running web-test-runner (${files.length} files, single instance)`);
  const result = await runWtr(forwardedArgs, "1");
  if (metricsEnabled && result.code === 0 && writeTimingProfile(files, result.outputPath)) {
    console.log(`[wtr] refreshed timing profile (${files.length} files)`);
  }
  writeRunMetrics({
    buildMs,
    buildCode,
    wtrRuns: [result],
    exitCode: result.code,
    mode: "full",
    files,
    shardCount: 1,
  });
  process.exit(result.code);
}

const timingProfile = readTimingProfile(files);
const orderedFiles = files
  .map((name) => ({
    name,
    size: statSync(resolve(wtrDir, name)).size,
    elapsedMs: timingProfile?.get(name),
  }))
  .sort((left, right) => {
    const leftWeight = typeof left.elapsedMs === "number" ? left.elapsedMs : left.size;
    const rightWeight = typeof right.elapsedMs === "number" ? right.elapsedMs : right.size;
    return (
      rightWeight - leftWeight || (left.name < right.name ? -1 : left.name > right.name ? 1 : 0)
    );
  });
if (timingProfile) console.log("[wtr] using revision-validated timing profile");
else console.log("[wtr] timing profile unavailable or stale; using file-size scheduling");

const shards = Array.from({ length: shardCount }, () => []);
const totals = Array.from({ length: shardCount }, () => 0);
for (const file of orderedFiles) {
  const slot = totals.indexOf(Math.min(...totals));
  shards[slot].push(`tests/wtr/${file.name}`);
  totals[slot] += typeof file.elapsedMs === "number" ? file.elapsedMs : file.size;
}

console.log(
  `[wtr] running web-test-runner across ${shardCount} parallel instances (${shards.map((shard) => shard.length).join(" + ")} files)`,
);
const wtrRuns = await Promise.all(
  shards.map((shard, index) =>
    runWtr(["--port", String(8128 + index), ...shard], String(index + 1)),
  ),
);
const exitCode = wtrRuns.some((result) => result.code !== 0) ? 1 : 0;
writeRunMetrics({ buildMs, buildCode, wtrRuns, exitCode, mode: "full", files, shardCount });
process.exit(exitCode);
