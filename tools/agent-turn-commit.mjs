import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import process from "node:process";

const DEFAULT_MESSAGE = "chore: checkpoint agent turn";
const LOCAL_SCALA_HTML_GOAL_HISTORY_RANGE_FILE = ".agent/scala-html-goal-history-range";

export function parseArgs(argv) {
  const options = {
    dryRun: false,
    message: DEFAULT_MESSAGE,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") {
      continue;
    }
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "-m" || arg === "--message") {
      const message = argv[index + 1]?.trim();
      if (!message) {
        throw new Error(`${arg} requires a non-empty commit message.`);
      }
      options.message = message;
      index += 1;
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function hasPorcelainChanges(output) {
  return output
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .some(Boolean);
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

function git(args, options = {}) {
  return run("git", args, options);
}

function runScalaHtmlGoalHistory(range) {
  run(
    "node",
    ["./scripts/audit-scala-html-goal-history.mjs", "--", "--range", range, "--fail-on-violation"],
    {
      errorMessage: `Agent turn Scala HTML goal history audit failed for ${range}.`,
    },
  );
}

export function unattendedScalaHtmlGoalHistoryRange({
  env = process.env,
  rangeFile = LOCAL_SCALA_HTML_GOAL_HISTORY_RANGE_FILE,
} = {}) {
  const envRange = env.YONA_SCALA_HTML_GOAL_HISTORY_RANGE?.trim();
  if (envRange) {
    return envRange;
  }

  if (!existsSync(rangeFile)) {
    return "";
  }

  return (
    readFileSync(rangeFile, "utf8")
      .split(/\r?\n/u)
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith("#")) ?? ""
  );
}

export function disallowedScalaHtmlGoalExceptionEnv(env = process.env) {
  return [
    "YONA_ALLOW_SCALA_HTML_EVIDENCE_ONLY",
    "YONA_ALLOW_SCALA_HTML_UNDOCUMENTED_ROUTE",
    "YONA_ALLOW_SCALA_HTML_MULTI_SCREEN",
  ].filter((name) => env[name]?.trim() === "1");
}

function stagedChangesExist() {
  const result = spawnSync("git", ["diff", "--cached", "--quiet", "--exit-code"], {
    stdio: "ignore",
  });
  return result.status === 1;
}

export function runAgentTurnCommit(options) {
  const disallowedScalaHtmlGoalEnv = disallowedScalaHtmlGoalExceptionEnv();
  if (disallowedScalaHtmlGoalEnv.length > 0) {
    throw new Error(
      `Agent turn commit refuses Scala HTML goal exception env var(s): ${disallowedScalaHtmlGoalEnv.join(", ")}. These exceptions require a human-supervised manual commit path with a durable audit note.`,
    );
  }

  const status = git(["status", "--porcelain", "--untracked-files=all"], {
    capture: true,
    errorMessage: "Failed to inspect git status before agent turn commit.",
  });
  if (!hasPorcelainChanges(status.stdout ?? "")) {
    console.log("agent-turn-commit: no changes to commit");
    return null;
  }

  if (options.dryRun) {
    console.log("agent-turn-commit: changes detected");
    return null;
  }

  git(["add", "-A"], {
    errorMessage: "Failed to stage changes for agent turn commit.",
  });
  if (!stagedChangesExist()) {
    console.log("agent-turn-commit: no staged changes to commit");
    return null;
  }

  run("node", ["./tools/precommit-verify.mjs"], {
    errorMessage: "Agent turn precommit verification failed.",
  });
  git(["commit", "-m", options.message], {
    errorMessage: "Failed to create agent turn commit.",
  });
  runScalaHtmlGoalHistory("HEAD~1..HEAD");
  const unattendedHistoryRange = unattendedScalaHtmlGoalHistoryRange();
  if (unattendedHistoryRange) {
    runScalaHtmlGoalHistory(unattendedHistoryRange);
  }
  const rev = git(["rev-parse", "--short", "HEAD"], {
    capture: true,
    errorMessage: "Failed to read agent turn commit hash.",
  });
  const hash = (rev.stdout ?? "").trim();
  console.log(`agent-turn-commit: committed ${hash}`);
  return hash;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    runAgentTurnCommit(parseArgs(process.argv.slice(2)));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
