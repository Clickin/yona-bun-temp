// Runs the in-browser @web/test-runner e2e suite against the production build.
// Mirrors the style final-profile flow: build the app (the WTR config serves
// frontend/dist with the runtime-config + fetch-mock injection), then run WTR.
// The suite is split across two parallel WTR instances (ports 8128/8129) —
// a single instance saturates around 8 browser pages, and two instances
// finish the ~860-file suite in ~23 min instead of ~38 min.
// Usage: node scripts/run-wtr-e2e.mjs [-- <web-test-runner args>]
//   Pass explicit file args to run a focused subset on ONE instance instead.
import { spawn } from "node:child_process";
import { readdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDirectory, "..");

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

const forwardedArgs = process.argv.slice(2).filter((arg) => arg !== "--");

// Always rebuild: the WTR config serves the production bundle (frontend/dist)
// statically — no vite dev server / HMR in the e2e loop — so one explicit
// build absorbs all dev-server runtime costs and guarantees the suite never
// runs against a stale dist (source edits are picked up every run).
console.log("[wtr] building production frontend");
const buildCode = await run("pnpm", [
  "--config.store-dir=/Users/senghyunjo/.pnpm-store",
  "--dir",
  "frontend",
  "build",
]);
if (buildCode !== 0) {
  process.exit(buildCode);
}

const hasExplicitFiles = forwardedArgs.some((arg) => arg.endsWith(".e2e.ts"));
if (hasExplicitFiles) {
  console.log("[wtr] running web-test-runner (focused files)");
  const wtrCode = await run(
    "pnpm",
    [
      "--config.store-dir=/Users/senghyunjo/.pnpm-store",
      "exec",
      "web-test-runner",
      "--config",
      "web-test-runner.config.mjs",
      ...forwardedArgs,
    ],
    { cwd: resolve(repoRoot, "frontend") },
  );
  process.exit(wtrCode);
}

// Full suite default: ONE instance (the recorded parity-gate profile —
// sharded runs lose tests to testsFinishTimeout and would mask regressions).
// Set WTR_SHARDS=2 to split evenly by total bytes across two parallel WTR
// instances (~25 min instead of ~38 min) for fast iteration.
const wtrDir = resolve(repoRoot, "frontend", "tests", "wtr");
const specFiles = readdirSync(wtrDir)
  .filter((name) => name.endsWith(".e2e.ts"))
  .sort();
const shardCount = Number(process.env.WTR_SHARDS ?? 1);
if (shardCount <= 1) {
  console.log(`[wtr] running web-test-runner (${specFiles.length} files, single instance)`);
  const wtrCode = await run("pnpm", [
    "--config.store-dir=/Users/senghyunjo/.pnpm-store",
    "exec",
    "web-test-runner",
    "--config",
    "web-test-runner.config.mjs",
    ...forwardedArgs,
  ], { cwd: resolve(repoRoot, "frontend") });
  process.exit(wtrCode);
}

// Sharded: greedy largest-first round-robin keeps both shards ~equal bytes.
const bySize = specFiles
  .map((name) => ({
    name,
    size: statSync(resolve(wtrDir, name)).size,
  }))
  .sort((x, y) => y.size - x.size);
const shards = Array.from({ length: shardCount }, () => []);
const totals = Array.from({ length: shardCount }, () => 0);
for (const { name, size } of bySize) {
  const slot = totals.indexOf(Math.min(...totals));
  shards[slot].push(`tests/wtr/${name}`);
  totals[slot] += size;
}

console.log(`[wtr] running web-test-runner across ${shardCount} parallel instances (${shards.map((s) => s.length).join(" + ")} files)`);
const shardCodes = await Promise.all(
  shards.map((shard, index) =>
    run("pnpm", [
      "--config.store-dir=/Users/senghyunjo/.pnpm-store",
      "exec",
      "web-test-runner",
      "--config",
      "web-test-runner.config.mjs",
      "--port",
      String(8128 + index),
      ...shard,
    ], { cwd: resolve(repoRoot, "frontend") }),
  ),
);
process.exit(shardCodes.some((code) => code !== 0) ? 1 : 0);
