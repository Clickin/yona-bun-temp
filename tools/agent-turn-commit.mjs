import { spawnSync } from "node:child_process";
import process from "node:process";

const DEFAULT_MESSAGE = "chore: checkpoint agent turn";

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

function stagedChangesExist() {
  const result = spawnSync("git", ["diff", "--cached", "--quiet", "--exit-code"], {
    stdio: "ignore",
  });
  return result.status === 1;
}

export function runAgentTurnCommit(options) {
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
  run(
    "node",
    [
      "./scripts/audit-scala-html-goal-history.mjs",
      "--",
      "--range",
      "HEAD~1..HEAD",
      "--fail-on-violation",
    ],
    {
      errorMessage: "Agent turn Scala HTML goal history audit failed.",
    },
  );
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
