#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import {
  evaluateScalaHtmlGoalGuard,
  formatScalaHtmlGoalGuardSummary,
} from "../tools/scala-html-goal-guard.mjs";

const DEFAULT_RANGE = "HEAD~50..HEAD";
const AUDIT_FILE = "docs/provenance/frontend-scala-html-goal-violation-audit.md";

function parseArgs(argv) {
  const options = {
    failOnViolation: false,
    format: "text",
    range: DEFAULT_RANGE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    } else if (arg === "--fail-on-violation") {
      options.failOnViolation = true;
    } else if (arg === "--json") {
      options.format = "json";
    } else if (arg === "--range") {
      const range = argv[index + 1];
      if (!range) {
        throw new Error("--range requires a git revision range");
      }
      options.range = range;
      index += 1;
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }

  return options;
}

function git(args) {
  const result = spawnSync("git", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args.join(" ")} failed`);
  }
  return result.stdout;
}

function commitsForRange(range) {
  return git(["log", "--reverse", "--format=%H%x00%h%x00%s", range])
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha, shortSha, subject] = line.split("\0");
      return { sha, shortSha, subject };
    });
}

function changedFilesForCommit(sha) {
  return git(["diff-tree", "--no-commit-id", "--name-only", "-r", "--diff-filter=ACMRD", sha])
    .split("\n")
    .map((file) => file.trim())
    .filter(Boolean);
}

function auditPatchForCommit(sha) {
  return git(["show", "--format=", "--unified=0", sha, "--", AUDIT_FILE]);
}

export function evaluateCommit({ changedFiles, auditPatch }) {
  return evaluateScalaHtmlGoalGuard({
    auditPatch,
    changedFiles,
    env: {},
  });
}

export function summarizeHistory({ commits }) {
  const entries = commits.map((commit) => {
    const changedFiles = changedFilesForCommit(commit.sha);
    const auditPatch = changedFiles.includes(AUDIT_FILE) ? auditPatchForCommit(commit.sha) : "";
    const result = evaluateCommit({ auditPatch, changedFiles });
    return {
      ...commit,
      blocked: result.blocked,
      changedFiles,
      message: result.message,
    };
  });

  return {
    checkedRangeCount: entries.length,
    violations: entries.filter((entry) => entry.blocked),
    entries,
  };
}

function printText(summary) {
  if (summary.violations.length === 0) {
    console.log(`scala-html-goal-history: PASS ${summary.checkedRangeCount} commit(s) checked`);
    return;
  }

  console.log(
    `scala-html-goal-history: FOUND ${summary.violations.length} possible violation(s) in ${summary.checkedRangeCount} commit(s)`,
  );
  for (const entry of summary.violations) {
    console.log(`\n${entry.shortSha} ${entry.subject}`);
    console.log(
      formatScalaHtmlGoalGuardSummary({
        blocked: true,
        frontendEvidenceFiles: entry.changedFiles.filter(
          (file) =>
            /^frontend\/tests\/.+\.e2e\.ts$/u.test(file) ||
            file === "frontend/src/app.css" ||
            /^docs\/provenance\/ui-parity-reports\/.+\.md$/u.test(file),
        ),
        frontendImplementationFiles: entry.changedFiles.filter(
          (file) => /^frontend\/src\/.+\.(ts|tsx)$/u.test(file) && !file.endsWith(".css"),
        ),
        message: entry.message,
      }),
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const summary = summarizeHistory({ commits: commitsForRange(options.range) });

    if (options.format === "json") {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      printText(summary);
    }

    if (options.failOnViolation && summary.violations.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
