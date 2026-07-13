#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import process from "node:process";

import { unattendedScalaHtmlGoalHistoryRange } from "../tools/agent-turn-commit.mjs";

const DEFAULT_RANGE_FILE = ".agent/scala-html-goal-history-range";

export function parseArgs(argv) {
  const options = {
    range: "",
    rangeFile: DEFAULT_RANGE_FILE,
    skipAudit: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--range") {
      const range = argv[index + 1]?.trim();
      if (!range) {
        throw new Error("--range requires a non-empty git revision range.");
      }
      options.range = range;
      index += 1;
      continue;
    }
    if (arg === "--range-file") {
      const rangeFile = argv[index + 1]?.trim();
      if (!rangeFile) {
        throw new Error("--range-file requires a non-empty path.");
      }
      options.rangeFile = rangeFile;
      index += 1;
      continue;
    }
    if (arg === "--skip-audit") {
      options.skipAudit = true;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function resolveRequiredRange({ env = process.env, range = "", rangeFile } = {}) {
  const resolvedRange =
    range.trim() ||
    unattendedScalaHtmlGoalHistoryRange({
      env,
      rangeFile: rangeFile ?? DEFAULT_RANGE_FILE,
    });

  if (!resolvedRange) {
    throw new Error(
      `Scala HTML goal automation is not armed. Set YONA_SCALA_HTML_GOAL_HISTORY_RANGE or write a range to ${rangeFile ?? DEFAULT_RANGE_FILE}.`,
    );
  }

  if (!resolvedRange.includes("..")) {
    throw new Error(`Scala HTML goal history range must be a git revision range: ${resolvedRange}`);
  }

  return resolvedRange;
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
  });

  if (result.status !== 0) {
    throw new Error(options.errorMessage ?? `${command} ${args.join(" ")} failed.`);
  }

  return result;
}

function verifyGitRange(range) {
  const result = run("git", ["rev-list", "--max-count=1", range], {
    capture: true,
    errorMessage: `Scala HTML goal history range is not valid for this repo: ${range}`,
  });

  if (!(result.stdout ?? "").trim()) {
    throw new Error(`Scala HTML goal history range checked zero commits: ${range}`);
  }
}

export function checkScalaHtmlGoalAutomation(options) {
  const range = resolveRequiredRange(options);
  verifyGitRange(range);

  if (!options.skipAudit) {
    run(
      "node",
      [
        "./scripts/audit-scala-html-goal-history.mjs",
        "--",
        "--range",
        range,
        "--fail-on-violation",
      ],
      {
        errorMessage: `Scala HTML goal history audit failed for ${range}.`,
      },
    );
  }

  console.log(`scala-html-goal-automation: armed ${range}`);
  return range;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    checkScalaHtmlGoalAutomation(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
