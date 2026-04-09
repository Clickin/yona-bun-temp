import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  evaluateParityGate,
  formatParitySummary,
  shouldBlockForStrictGate,
} from "./yona-parity-gate.mjs";

const STAGED_CMD = ["diff", "--cached", "--name-only", "--diff-filter=ACMR"];
const IGNORED_PREFIXES = [
  ".svelte-kit/",
  "node_modules/",
  "dist/",
  "build/",
  "coverage/",
  ".husky/_/",
];
const GENERATED_FILE_SUFFIXES = ["routeTree.gen.ts"];
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

const resolveExecutable = (name) => {
  if (process.platform === "win32") {
    const commonGitPaths = [
      "C:\\Program Files\\Git\\cmd\\git.exe",
      "C:\\Program Files\\Git\\bin\\git.exe",
    ];
    if (name === "git") {
      const resolvedGitPath = commonGitPaths.find((candidate) => existsSync(candidate));
      if (resolvedGitPath) {
        return resolvedGitPath;
      }
    }

    const whereResult = spawnSync("where.exe", [name], { encoding: "utf8" });
    const resolved = whereResult.stdout
      ?.split("\n")
      .map((entry) => entry.trim())
      .find(Boolean);
    if (resolved) {
      return resolved;
    }
  }

  return name;
};

const GIT_BIN = resolveExecutable("git");
const TOOL_BIN_DIR = join(process.cwd(), "node_modules", ".bin");
const OXFMT_BIN =
  process.platform === "win32" ? join(TOOL_BIN_DIR, "oxfmt.CMD") : join(TOOL_BIN_DIR, "oxfmt");
const OXLINT_BIN =
  process.platform === "win32" ? join(TOOL_BIN_DIR, "oxlint.CMD") : join(TOOL_BIN_DIR, "oxlint");

const run = (command, args) => {
  const result =
    process.platform === "win32" && command.toLowerCase().endsWith(".cmd")
      ? spawnSync("cmd.exe", ["/c", command, ...args], { stdio: "inherit" })
      : spawnSync(command, args, { stdio: "inherit" });
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

const isGeneratedFile = (file) => GENERATED_FILE_SUFFIXES.some((suffix) => file.endsWith(suffix));

const stagedResult = spawnSync(GIT_BIN, STAGED_CMD, { encoding: "utf8" });
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

const lintTargets = stagedFiles
  .filter((file) => OXLINT_EXTENSIONS.has(getExtension(file)))
  .filter((file) => !isGeneratedFile(file));
if (lintTargets.length > 0) {
  console.log(`precommit: running oxlint on ${lintTargets.length} staged file(s)`);
  run(OXLINT_BIN, lintTargets);
}

const formatTargets = stagedFiles
  .filter((file) => OXFMT_EXTENSIONS.has(getExtension(file)))
  .filter((file) => !isGeneratedFile(file));
if (formatTargets.length > 0) {
  console.log(`precommit: running oxfmt --check on ${formatTargets.length} staged file(s)`);
  run(OXFMT_BIN, ["--check", ...formatTargets]);
}

const parityResult = evaluateParityGate({
  changedFiles: stagedFiles,
  repoRoot: process.cwd(),
});
console.log(formatParitySummary(parityResult));
if (shouldBlockForStrictGate(parityResult)) {
  process.exit(1);
}

console.log("precommit: verification passed");
