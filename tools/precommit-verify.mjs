import { spawnSync } from "node:child_process";

const STAGED_CMD = ["diff", "--cached", "--name-only", "--diff-filter=ACMR"];
const IGNORED_PREFIXES = [
  ".svelte-kit/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".husky/_/",
];
const OXLINT_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".jsx",
  ".ts",
  ".cts",
  ".mts",
  ".tsx",
  ".svelte",
]);
const OXFMT_EXTENSIONS = new Set([
  ".js",
  ".cjs",
  ".mjs",
  ".jsx",
  ".ts",
  ".cts",
  ".mts",
  ".tsx",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".css",
  ".html",
  ".svelte",
]);

const run = (command, args) => {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const getExtension = (file) => {
  const dot = file.lastIndexOf(".");
  if (dot === -1) {
    return "";
  }

  return file.slice(dot).toLowerCase();
};

const stagedResult = spawnSync("git", STAGED_CMD, { encoding: "utf8" });
if (stagedResult.status !== 0) {
  process.exit(stagedResult.status ?? 1);
}

const stagedFiles = stagedResult.stdout
  .split("\n")
  .map((file) => file.trim())
  .filter(Boolean)
  .filter((file) => !IGNORED_PREFIXES.some((prefix) => file.startsWith(prefix)));

if (stagedFiles.length === 0) {
  console.log("precommit: no staged files to verify");
  process.exit(0);
}

const lintTargets = stagedFiles.filter((file) => OXLINT_EXTENSIONS.has(getExtension(file)));
if (lintTargets.length > 0) {
  console.log(`precommit: running oxlint on ${lintTargets.length} staged file(s)`);
  run("bunx", ["oxlint", ...lintTargets]);
}

const formatTargets = stagedFiles.filter((file) => OXFMT_EXTENSIONS.has(getExtension(file)));
if (formatTargets.length > 0) {
  console.log(`precommit: running oxfmt --check on ${formatTargets.length} staged file(s)`);
  run("bunx", ["oxfmt", "--check", ...formatTargets]);
}

console.log("precommit: verification passed");
