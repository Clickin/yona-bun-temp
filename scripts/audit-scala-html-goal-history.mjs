#!/usr/bin/env node
import { spawnSync } from "node:child_process";

import {
  evaluateScalaHtmlGoalGuard,
  formatScalaHtmlGoalGuardSummary,
} from "../tools/scala-html-goal-guard.mjs";

const DEFAULT_RANGE = "HEAD~50..HEAD";
const AUDIT_FILE = "docs/provenance/frontend-scala-html-goal-violation-audit.md";
const ADDED_MANUAL_MULTI_SCREEN_EXCEPTION_PATTERN =
  /^\+Manual multi-screen exception note\b/mu;
const ADDED_MANUAL_EVIDENCE_ONLY_EXCEPTION_PATTERN =
  /(?:^\+Manual evidence-only exception note\b|manual evidence-only exception)/imu;
// Batch 532 introduced the fallback-off runtime mode before reports became mandatory.
// Keep this one immutable historical commit auditable without weakening current precommit policy.
const PRE_REPORT_FALLBACK_DISCOVERY_COMMIT = "5209c1352";

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

function changedFileEntriesForCommit(sha) {
  return git(["diff-tree", "--no-commit-id", "--name-status", "-r", "--diff-filter=ACMRD", sha])
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [status, ...pathParts] = line.split(/\s+/u);
      const file = pathParts.at(-1) ?? "";
      return { file, status };
    })
    .filter(({ file }) => file);
}

function auditPatchForCommit(sha) {
  return git(["show", "--format=", "--unified=0", sha, "--", AUDIT_FILE]);
}

function hasManualMultiScreenException(auditPatch) {
  return ADDED_MANUAL_MULTI_SCREEN_EXCEPTION_PATTERN.test(auditPatch);
}

function hasManualEvidenceOnlyException(auditPatch) {
  return ADDED_MANUAL_EVIDENCE_ONLY_EXCEPTION_PATTERN.test(auditPatch);
}

export function evaluateCommit({
  changedFiles,
  changedFileStatuses = new Map(),
  auditPatch,
  historicalCommitSha = "",
}) {
  return evaluateScalaHtmlGoalGuard({
    auditPatch,
    changedFiles,
    changedFileStatuses,
    env: {
      YONA_ENFORCE_SCALA_HTML_SINGLE_ROW: "1",
      ...(hasManualMultiScreenException(auditPatch)
        ? { YONA_ALLOW_SCALA_HTML_MULTI_SCREEN: "1" }
        : {}),
      ...(hasManualEvidenceOnlyException(auditPatch)
        ? { YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY: "1" }
        : {}),
      ...(historicalCommitSha.startsWith(PRE_REPORT_FALLBACK_DISCOVERY_COMMIT)
        ? { YONA_HISTORY_ALLOW_PRE_REPORT_FALLBACK_BATCH: "1" }
        : {}),
    },
  });
}

export function summarizeHistory({ commits }) {
  const entries = commits.map((commit) => {
    const changedFileEntries = changedFileEntriesForCommit(commit.sha);
    const changedFiles = changedFileEntries.map(({ file }) => file);
    const changedFileStatuses = new Map(
      changedFileEntries.map(({ file, status }) => [file, status]),
    );
    const auditPatch = changedFiles.includes(AUDIT_FILE) ? auditPatchForCommit(commit.sha) : "";
    const result = evaluateCommit({
      auditPatch,
      changedFiles,
      changedFileStatuses,
      historicalCommitSha: commit.sha,
    });
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
