// Runs the in-browser @web/test-runner e2e suite against the production build.
// Mirrors the stylex final-profile flow: build the app (the WTR config serves
// frontend/dist with the runtime-config + fetch-mock injection), then run WTR.
// Usage: node scripts/run-wtr-e2e.mjs [-- <web-test-runner args>]
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
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

if (!existsSync(resolve(repoRoot, "frontend", "dist", "index.html"))) {
  console.log("[wtr] building production frontend (dist missing)");
  const buildCode = await run("pnpm", [
    "--config.store-dir=/Users/senghyunjo/.pnpm-store",
    "--dir",
    "frontend",
    "build",
  ]);
  if (buildCode !== 0) {
    process.exit(buildCode);
  }
}

console.log("[wtr] running web-test-runner");
const wtrCode = await run("npx", [
  "web-test-runner",
  "--config",
  "web-test-runner.config.mjs",
  ...forwardedArgs,
], { ...process.env, cwd: resolve(repoRoot, "frontend") });
process.exit(wtrCode);
