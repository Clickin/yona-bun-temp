import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");
const hookPath = path.join(repoRoot, ".husky", "pre-commit");
const verifyToolPath = path.join(repoRoot, "tools", "precommit-verify.mjs");

test("pre-commit hook points at the canonical root verification tool", () => {
  assert.equal(existsSync(hookPath), true, ".husky/pre-commit must exist");
  assert.equal(
    existsSync(verifyToolPath),
    true,
    "tools/precommit-verify.mjs must exist",
  );

  const hookSource = readFileSync(hookPath, "utf8");

  assert.match(hookSource, /node\s+\.\/tools\/precommit-verify\.mjs/);
  assert.doesNotMatch(hookSource, /bun\s+run\s+precommit:verify/);
});
