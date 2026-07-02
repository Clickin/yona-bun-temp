import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";

import {
  hasPorcelainChanges,
  parseArgs,
  unattendedScalaHtmlGoalHistoryRange,
} from "../tools/agent-turn-commit.mjs";

const repoRoot = path.resolve(import.meta.dirname, "..");
const turnCommitHookPath = path.join(repoRoot, "tools", "agent-turn-commit.mjs");

describe("agent turn commit hook contract", () => {
  it("defaults to the repo turn checkpoint commit message", () => {
    assert.deepEqual(parseArgs([]), {
      dryRun: false,
      message: "chore: checkpoint agent turn",
    });
  });

  it("accepts explicit commit messages and dry-run mode", () => {
    assert.deepEqual(parseArgs(["--", "--dry-run", "-m", "chore: verify turn hook"]), {
      dryRun: true,
      message: "chore: verify turn hook",
    });
  });

  it("rejects empty commit messages", () => {
    assert.throws(() => parseArgs(["--message", ""]), /requires a non-empty commit message/u);
  });

  it("detects porcelain changes without treating blank output as dirty", () => {
    assert.equal(hasPorcelainChanges(""), false);
    assert.equal(hasPorcelainChanges("\n\n"), false);
    assert.equal(hasPorcelainChanges(" M AGENTS.md\n"), true);
    assert.equal(hasPorcelainChanges("?? tools/agent-turn-commit.mjs\n"), true);
  });

  it("runs the Scala HTML goal history audit for the committed turn", () => {
    const source = readFileSync(turnCommitHookPath, "utf8");

    assert.match(source, /scripts\/audit-scala-html-goal-history\.mjs/u);
    assert.match(source, /HEAD~1\.\.HEAD/u);
    assert.match(source, /--fail-on-violation/u);
  });

  it("supports an unattended multi-commit Scala HTML history audit range", () => {
    const source = readFileSync(turnCommitHookPath, "utf8");

    assert.match(source, /YONA_SCALA_HTML_GOAL_HISTORY_RANGE/u);
    assert.match(source, /unattendedHistoryRange/u);
    assert.match(source, /runScalaHtmlGoalHistory\(unattendedHistoryRange\)/u);
  });

  it("loads unattended Scala HTML history audit range from env before local memo file", () => {
    assert.equal(
      unattendedScalaHtmlGoalHistoryRange({
        env: { YONA_SCALA_HTML_GOAL_HISTORY_RANGE: "base..HEAD" },
        rangeFile: path.join(repoRoot, "does-not-exist"),
      }),
      "base..HEAD",
    );
  });

  it("loads unattended Scala HTML history audit range from ignored local memo file", () => {
    const source = readFileSync(turnCommitHookPath, "utf8");

    assert.match(source, /\.agent\/scala-html-goal-history-range/u);
    assert.match(source, /LOCAL_SCALA_HTML_GOAL_HISTORY_RANGE_FILE/u);
  });
});
