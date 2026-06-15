import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hasPorcelainChanges, parseArgs } from "../tools/agent-turn-commit.mjs";

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
});
