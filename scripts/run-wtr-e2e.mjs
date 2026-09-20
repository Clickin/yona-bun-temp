// Runs the in-browser @web/test-runner e2e suite against the production build.
// Usage: node scripts/run-wtr-e2e.mjs [-- <web-test-runner args>]
// Explicit file args always run on one WTR instance. Full-suite sharding is
// opt-in with WTR_SHARDS=2..4; WTR_METRICS=1 writes ignored JSON diagnostics.
// WTR_SKIP_BUILD=1 only reuses a dist proven to match current app inputs.
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import {
  createWriteStream,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  chromeSpecFiles,
  chromeWtrArgs,
  isCurrentBuildProof,
  scheduleWtrShards,
} from "./run-wtr-e2e-args.mjs";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, "..");
const frontendRoot = resolve(repoRoot, "frontend");
const wtrDir = resolve(frontendRoot, "tests", "wtr");
const metricsEnabled = process.env.WTR_METRICS === "1";
const positiveInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};
const hangTimeoutMs = positiveInteger(process.env.WTR_HANG_TIMEOUT_MS);
const hangHeartbeatMs = positiveInteger(process.env.WTR_HANG_HEARTBEAT_MS) ?? 15_000;
const diagnosticsEnabled = metricsEnabled || hangTimeoutMs !== undefined;
const metricsDir = join(repoRoot, ".agent", "wtr-metrics");
const timingProfilePath = join(metricsDir, "wtr-timing-profile.json");
const buildProofPath = join(metricsDir, "wtr-build-proof.json");
const runId = `${Date.now().toString(36)}-${process.pid}`;
const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");
const startedAt = Date.now();

function terminateProcessTree(child, signal) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // The process may already have exited.
    }
  }
}

async function run(command, args, options = {}) {
  const { env = process.env, cwd = repoRoot, label = command } = options;
  const childStartedAt = Date.now();
  const logPath = diagnosticsEnabled ? join(metricsDir, `${runId}-${label}.log`) : undefined;
  if (logPath) mkdirSync(metricsDir, { recursive: true });
  const logStream = logPath ? createWriteStream(logPath, { flags: "a" }) : null;
  const child = spawn(command, args, {
    cwd,
    env,
    detached: hangTimeoutMs !== undefined,
    stdio: diagnosticsEnabled ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  let lastOutputAt = childStartedAt;
  let lastOutput = "";
  let timedOut = false;
  let timeoutHandle;
  let hardKillHandle;
  let heartbeatHandle;
  const writeOutput = (stream, chunk) => {
    const text = String(chunk);
    lastOutputAt = Date.now();
    lastOutput = text.slice(-2_000);
    logStream?.write(text);
    stream.write(text);
  };
  if (diagnosticsEnabled) {
    child.stdout?.on("data", (chunk) => writeOutput(process.stdout, chunk));
    child.stderr?.on("data", (chunk) => writeOutput(process.stderr, chunk));
  }
  if (logStream && hangTimeoutMs !== undefined) {
    heartbeatHandle = setInterval(() => {
      logStream.write(
        `${JSON.stringify({
          kind: "heartbeat",
          pid: child.pid ?? null,
          elapsedMs: Date.now() - childStartedAt,
          idleMs: Date.now() - lastOutputAt,
          lastOutput: lastOutput.slice(-500),
        })}\n`,
      );
    }, hangHeartbeatMs);
    heartbeatHandle.unref?.();
  }
  return await new Promise((resolveExit) => {
    let settled = false;
    const finish = (exitCode, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutHandle);
      clearTimeout(hardKillHandle);
      clearInterval(heartbeatHandle);
      logStream?.end();
      resolveExit({
        code: timedOut ? 1 : signal ? 1 : (exitCode ?? 1),
        signal: signal ?? null,
        timedOut,
        elapsedMs: Date.now() - childStartedAt,
        logPath: logPath ?? null,
        pid: child.pid ?? null,
        lastOutputAt,
        lastOutput: lastOutput.slice(-500),
      });
    };
    child.once("error", (error) => {
      console.error(`failed to spawn ${command}:`, error.message);
      finish(1, "spawn-error");
    });
    child.once("close", (exitCode, signal) => finish(exitCode, signal));
    if (hangTimeoutMs !== undefined) {
      timeoutHandle = setTimeout(() => {
        timedOut = true;
        logStream?.write(
          `${JSON.stringify({
            kind: "timeout",
            pid: child.pid ?? null,
            timeoutMs: hangTimeoutMs,
            idleMs: Date.now() - lastOutputAt,
            lastOutput: lastOutput.slice(-500),
          })}\n`,
        );
        terminateProcessTree(child, "SIGTERM");
        hardKillHandle = setTimeout(() => terminateProcessTree(child, "SIGKILL"), 5_000);
        hardKillHandle.unref?.();
      }, hangTimeoutMs);
      timeoutHandle.unref?.();
    }
  });
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
  const result = await run(
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
      label: `wtr-${label}`,
    },
  );
  return { ...result, label, outputPath };
}

function inputFilesUnder(root) {
  if (!existsSync(root)) throw new Error(`missing build input directory: ${root}`);
  if (lstatSync(root).isSymbolicLink()) {
    throw new Error(`symlink build input is not verifiable: ${root}`);
  }
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((left, right) =>
      left.name.localeCompare(right.name),
    )) {
      const filePath = join(directory, entry.name);
      if (entry.isSymbolicLink()) {
        throw new Error(`symlink build input is not verifiable: ${filePath}`);
      } else if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile()) {
        files.push(filePath);
      }
    }
  };
  visit(root);
  return files;
}

function fingerprintFiles(files) {
  const entries = files
    .map((filePath) => {
      const digest = createHash("sha256").update(readFileSync(filePath)).digest("hex");
      return { path: relative(repoRoot, filePath), digest };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
  const fingerprint = createHash("sha256")
    .update(JSON.stringify(entries))
    .digest("hex");
  return { entries, fingerprint };
}

function buildInputState() {
  const inputFiles = [
    ...inputFilesUnder(resolve(frontendRoot, "src")),
    ...inputFilesUnder(resolve(frontendRoot, "public")),
    ...inputFilesUnder(resolve(repoRoot, "yona-original", "public")),
    ...readdirSync(frontendRoot)
      .map((name) => join(frontendRoot, name))
      .filter((filePath) => {
        if (lstatSync(filePath).isSymbolicLink()) {
          throw new Error(`symlink build input is not verifiable: ${filePath}`);
        }
        return statSync(filePath).isFile();
      }),
    ...["package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", ".npmrc"]
      .map((name) => resolve(repoRoot, name))
      .filter((filePath) => {
        if (!existsSync(filePath)) return false;
        if (lstatSync(filePath).isSymbolicLink()) {
          throw new Error(`symlink build input is not verifiable: ${filePath}`);
        }
        return true;
      }),
    ...readdirSync(frontendRoot)
      .filter((name) => /^\.env(?:\..+)?$/u.test(name))
      .map((name) => join(frontendRoot, name)),
  ];
  const files = fingerprintFiles([...new Set(inputFiles)]);
  const viteEnvironment = Object.fromEntries(
    Object.entries(process.env)
      .filter(([name]) => name.startsWith("VITE_"))
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  const config = {
    mode: "production",
    nodeEnv: process.env.NODE_ENV ?? "",
    disableRouteGeneration: process.env.YONA_E2E_DISABLE_ROUTE_GENERATION ?? "",
    viteEnvironmentFingerprint: createHash("sha256")
      .update(JSON.stringify(viteEnvironment))
      .digest("hex"),
  };
  return {
    files: files.entries,
    config,
    fingerprint: createHash("sha256")
      .update(JSON.stringify({ files: files.entries, config }))
      .digest("hex"),
  };
}

function directoryFingerprint(directory) {
  if (!existsSync(directory)) return undefined;
  return fingerprintFiles(inputFilesUnder(directory)).fingerprint;
}

function writeBuildProof(inputStateBeforeBuild) {
  try {
    const inputState = buildInputState();
    if (
      !inputStateBeforeBuild ||
      JSON.stringify(inputStateBeforeBuild) !== JSON.stringify(inputState)
    ) {
      return false;
    }
    const distDirPath = resolve(frontendRoot, "dist");
    const distIdentity =
      existsSync(join(distDirPath, "index.html")) && directoryFingerprint(distDirPath);
    if (!distIdentity) return false;
    mkdirSync(metricsDir, { recursive: true });
    writeFileSync(
      buildProofPath,
      `${JSON.stringify(
        {
          schemaVersion: 1,
          generatedAt: new Date().toISOString(),
          inputFiles: inputState.files,
          inputConfig: inputState.config,
          inputFingerprint: inputState.fingerprint,
          distIdentity,
        },
        null,
        2,
      )}\n`,
    );
    return true;
  } catch {
    return false;
  }
}

function verifyBuildProof() {
  if (!existsSync(buildProofPath)) {
    return { ok: false, reason: "no build proof exists" };
  }
  try {
    const proof = JSON.parse(readFileSync(buildProofPath, "utf8"));
    if (proof.schemaVersion !== 1 || !Array.isArray(proof.inputFiles)) {
      return { ok: false, reason: "build proof schema is unsupported" };
    }
    const inputState = buildInputState();
    const distDirPath = resolve(frontendRoot, "dist");
    const distIdentity =
      existsSync(join(distDirPath, "index.html")) && directoryFingerprint(distDirPath);
    if (
      !isCurrentBuildProof(proof, {
        inputFiles: inputState.files,
        inputConfig: inputState.config,
        inputFingerprint: inputState.fingerprint,
        distIdentity,
      })
    ) {
      if (
        proof.inputFingerprint !== inputState.fingerprint ||
        JSON.stringify(proof.inputFiles) !== JSON.stringify(inputState.files) ||
        JSON.stringify(proof.inputConfig) !== JSON.stringify(inputState.config)
      ) {
        return { ok: false, reason: "build inputs or configuration changed" };
      }
      return { ok: false, reason: "production dist is missing or changed" };
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: "build proof could not be verified" };
  }
}

function specFiles() {
  // The lane manifest is authoritative: only chrome-lane specs run here
  // (docs/provenance/tailwind-dom-parity-pivot.md gate wiring).
  const manifest = JSON.parse(
    readFileSync(resolve(repoRoot, "frontend/tests/e2e-lane-manifest.json"), "utf8"),
  );
  return chromeSpecFiles(manifest);
}

function fileRevision(name) {
  const info = statSync(resolve(wtrDir, name));
  return `${info.mtimeMs}:${info.size}`;
}

function validElapsedMs(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function readTimingProfile(files) {
  if (!existsSync(timingProfilePath)) return undefined;
  try {
    const profile = JSON.parse(readFileSync(timingProfilePath, "utf8"));
    const entries = new Map(
      (Array.isArray(profile.files) ? profile.files : [])
        .filter((entry) => entry && typeof entry.file === "string")
        .map((entry) => [basename(entry.file), entry]),
    );
    const timings = new Map();
    for (const name of files) {
      const entry = entries.get(name);
      if (entry?.revision === fileRevision(name) && validElapsedMs(entry.elapsedMs)) {
        timings.set(name, entry.elapsedMs);
      }
    }
    return timings.size > 0 ? timings : undefined;
  } catch {
    return undefined;
  }
}

function timingMetrics(metricPaths) {
  const paths = Array.isArray(metricPaths) ? metricPaths : [metricPaths];
  const timings = new Map();
  for (const metricPath of paths) {
    if (!metricPath || !existsSync(metricPath)) continue;
    try {
      const metrics = JSON.parse(readFileSync(metricPath, "utf8"));
      for (const entry of Array.isArray(metrics.files) ? metrics.files : []) {
        const name = typeof entry?.file === "string" ? basename(entry.file) : undefined;
        if (name && validElapsedMs(entry.elapsedMs)) timings.set(name, entry.elapsedMs);
      }
    } catch {
      // A missing or incomplete shard report cannot contribute a timing.
    }
  }
  return timings;
}

function writeTimingProfile(files, metricPaths) {
  const freshTimings = timingMetrics(metricPaths);
  if (freshTimings.size === 0) return false;
  const timings = readTimingProfile(files) ?? new Map();
  for (const [name, elapsedMs] of freshTimings) {
    if (files.includes(name)) timings.set(name, elapsedMs);
  }
  const entries = files.flatMap((name) => {
    const elapsedMs = timings.get(name);
    return validElapsedMs(elapsedMs)
      ? [{ file: `tests/wtr/${name}`, revision: fileRevision(name), elapsedMs }]
      : [];
  });
  if (entries.length === 0) return false;
  try {
    mkdirSync(metricsDir, { recursive: true });
    writeFileSync(
      timingProfilePath,
      `${JSON.stringify(
        { schemaVersion: 1, generatedAt: new Date().toISOString(), files: entries },
        null,
        2,
      )}\n`,
    );
    return true;
  } catch {
    return false;
  }
}

function writeRunMetrics({ buildMs, buildCode, wtrRuns, exitCode, mode, files, shardCount }) {
  if (!metricsEnabled && hangTimeoutMs === undefined) return;
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
        diagnostics: {
          hangTimeoutMs: hangTimeoutMs ?? null,
          hangHeartbeatMs: hangTimeoutMs === undefined ? null : hangHeartbeatMs,
          logs: wtrRuns.map((runResult) => runResult.logPath).filter(Boolean),
        },
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
          timedOutShards: wtrRuns.filter((runResult) => runResult.timedOut).length,
        },
        shards: wtrRuns.map((runResult, index) => ({
          label: runResult.label,
          elapsedMs: runResult.elapsedMs,
          exitCode: runResult.code,
          timedOut: runResult.timedOut ?? false,
          logPath: runResult.logPath ?? null,
          pid: runResult.pid ?? null,
          lastOutputAt: runResult.lastOutputAt ?? null,
          lastOutput: runResult.lastOutput ?? "",
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
  let buildInputsBefore;
  try {
    buildInputsBefore = buildInputState();
  } catch {
    console.log("[wtr] could not snapshot production inputs before build");
  }
  const buildStartedAt = Date.now();
  const buildResult = await run(
    "pnpm",
    [
      "--config.store-dir=/Users/senghyunjo/.pnpm-store",
      "--dir",
      "frontend",
      "build",
    ],
    { label: "build" },
  );
  buildCode = buildResult.code;
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
  if (!writeBuildProof(buildInputsBefore)) {
    console.log(
      "[wtr] production build completed, but its reuse proof could not be written; WTR_SKIP_BUILD=1 remains unavailable",
    );
  }
} else {
  const buildProof = verifyBuildProof();
  if (!buildProof.ok) {
    console.error(`[wtr] WTR_SKIP_BUILD=1 refused: ${buildProof.reason}; run without WTR_SKIP_BUILD`);
    writeRunMetrics({
      buildMs,
      buildCode: 1,
      wtrRuns: [],
      exitCode: 1,
      mode: "build-cache",
      files: [],
      shardCount: 1,
    });
    process.exit(1);
  }
  console.log("[wtr] WTR_SKIP_BUILD=1 — reusing verified current production dist");
}

const explicitFiles = forwardedArgs.some((arg) => arg.endsWith(".e2e.ts"));
if (explicitFiles) {
  console.log("[wtr] running web-test-runner (focused files)");
  const result = await runWtr(forwardedArgs, "focused");
  if (metricsEnabled && writeTimingProfile(specFiles(), result.outputPath)) {
    console.log("[wtr] merged completed focused file timings into timing profile");
  }
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
  const result = await runWtr(chromeWtrArgs(files), "1");
  if (metricsEnabled && writeTimingProfile(files, result.outputPath)) {
    console.log("[wtr] merged completed file timings into timing profile");
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
const orderedFiles = files.map((name) => ({
  name,
  size: statSync(resolve(wtrDir, name)).size,
  elapsedMs: timingProfile?.get(name),
}));
if (timingProfile) {
  const missingTimings = files.length - timingProfile.size;
  console.log(
    missingTimings > 0
      ? `[wtr] using ${timingProfile.size}/${files.length} revision-validated timings; estimating new files`
      : "[wtr] using revision-validated timing profile",
  );
} else {
  console.log("[wtr] timing profile unavailable or stale; using file-size scheduling");
}

const { shards: scheduledShards } = scheduleWtrShards(orderedFiles, shardCount);
const shards = scheduledShards.map((shard) => shard.map((file) => `tests/wtr/${file.name}`));

console.log(
  `[wtr] running web-test-runner across ${shardCount} parallel instances (${shards.map((shard) => shard.length).join(" + ")} files)`,
);
const wtrRuns = await Promise.all(
  shards.map((shard, index) =>
    runWtr(["--port", String(8128 + index), ...shard], String(index + 1)),
  ),
);
const exitCode = wtrRuns.some((result) => result.code !== 0) ? 1 : 0;
if (metricsEnabled && writeTimingProfile(files, wtrRuns.map((result) => result.outputPath))) {
  console.log("[wtr] merged completed shard timings into timing profile");
}
writeRunMetrics({ buildMs, buildCode, wtrRuns, exitCode, mode: "full", files, shardCount });
process.exit(exitCode);
