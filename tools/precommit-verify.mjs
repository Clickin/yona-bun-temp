import { existsSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

import {
  evaluateParityGate,
  formatParitySummary,
  shouldBlockForStrictGate,
} from "./yona-parity-gate.mjs";
import {
  evaluateDesignHarness,
  formatDesignHarnessSummary,
  shouldBlockDesignHarness,
} from "./yona-design-harness.mjs";

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
const OXLINT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const OXLINT_PLUGIN_ARGS = ["--react-plugin", "--react-perf-plugin", "--jsx-a11y-plugin"];
const OXFMT_EXTENSIONS = new Set([".js", ".jsx", ".ts", ".tsx"]);
const REACT_DOCTOR_PROJECT = "@yoram/rust-frontend";
const REACT_DOCTOR_PRECOMMIT_ARGS = [
  "--project",
  REACT_DOCTOR_PROJECT,
  "--offline",
  "--full",
  "--fail-on",
  "warning",
];

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
const PNPM_BIN = resolveExecutable("pnpm");
const ROOT_PACKAGE_JSON = join(process.cwd(), "package.json");
const TOOL_BIN_DIR = join(process.cwd(), "node_modules", ".bin");
const OXFMT_LOCAL_BIN =
  process.platform === "win32" ? join(TOOL_BIN_DIR, "oxfmt.CMD") : join(TOOL_BIN_DIR, "oxfmt");
const OXLINT_LOCAL_BIN =
  process.platform === "win32" ? join(TOOL_BIN_DIR, "oxlint.CMD") : join(TOOL_BIN_DIR, "oxlint");
const REACT_DOCTOR_LOCAL_BIN =
  process.platform === "win32"
    ? join(TOOL_BIN_DIR, "react-doctor.CMD")
    : join(TOOL_BIN_DIR, "react-doctor");

const resolveToolInvocation = (localBin, globalName, packageName) => {
  if (existsSync(localBin) && canRun(localBin)) {
    return { argsPrefix: [], command: localBin };
  }

  const globalBin = resolveExecutable(globalName);
  if (canRun(globalBin)) {
    return { argsPrefix: [], command: globalBin };
  }

  if (existsSync(ROOT_PACKAGE_JSON) && canRun(PNPM_BIN, ["exec", packageName])) {
    return { argsPrefix: ["exec", packageName], command: PNPM_BIN };
  }

  return null;
};

const canRun = (command, argsPrefix = []) => {
  const result =
    process.platform === "win32" && command.toLowerCase().endsWith(".cmd")
      ? spawnSync("cmd.exe", ["/c", command, ...argsPrefix, "--version"], { stdio: "ignore" })
      : spawnSync(command, [...argsPrefix, "--version"], { stdio: "ignore" });
  return !result.error && result.status === 0;
};

const run = (command, args, argsPrefix = []) => {
  const result =
    process.platform === "win32" && command.toLowerCase().endsWith(".cmd")
      ? spawnSync("cmd.exe", ["/c", command, ...argsPrefix, ...args], { stdio: "inherit" })
      : spawnSync(command, [...argsPrefix, ...args], { stdio: "inherit" });
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
  const oxlint = resolveToolInvocation(OXLINT_LOCAL_BIN, "oxlint", "oxlint");
  if (!oxlint) {
    console.log(
      "precommit: skipping oxlint because no local bin or package-managed invocation is available",
    );
  } else {
    console.log(`precommit: running oxlint on ${lintTargets.length} staged file(s)`);
    run(oxlint.command, [...OXLINT_PLUGIN_ARGS, ...lintTargets], oxlint.argsPrefix);
  }
}

const reactDoctorTargets = lintTargets.filter((file) => file.startsWith("frontend/"));
if (reactDoctorTargets.length > 0) {
  const reactDoctor = resolveToolInvocation(REACT_DOCTOR_LOCAL_BIN, "react-doctor", "react-doctor");
  if (!reactDoctor) {
    console.log(
      "precommit: skipping react-doctor because no local bin or package-managed invocation is available",
    );
  } else {
    console.log(`precommit: running react-doctor for ${REACT_DOCTOR_PROJECT}`);
    run(reactDoctor.command, REACT_DOCTOR_PRECOMMIT_ARGS, reactDoctor.argsPrefix);
  }
}

const formatTargets = stagedFiles
  .filter((file) => OXFMT_EXTENSIONS.has(getExtension(file)))
  .filter((file) => !isGeneratedFile(file));
if (formatTargets.length > 0) {
  const oxfmt = resolveToolInvocation(OXFMT_LOCAL_BIN, "oxfmt", "oxfmt");
  if (!oxfmt) {
    console.log(
      "precommit: skipping oxfmt --check because no local bin or package-managed invocation is available",
    );
  } else {
    console.log(`precommit: running oxfmt --check on ${formatTargets.length} staged file(s)`);
    run(oxfmt.command, ["--check", ...formatTargets], oxfmt.argsPrefix);
  }
}

const designResult = evaluateDesignHarness({
  changedFiles: stagedFiles,
  repoRoot: process.cwd(),
});
console.log(formatDesignHarnessSummary(designResult));
if (shouldBlockDesignHarness(designResult)) {
  process.exit(1);
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
