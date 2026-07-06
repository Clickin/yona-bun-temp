import { execFileSync } from "node:child_process";
import { strict as assert } from "node:assert";
import test from "node:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

test("legacy-localhost help exposes parity foundation seeding", () => {
  const output = execFileSync("node", ["scripts/legacy-localhost.mjs", "help"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.match(output, /seed-parity-foundation/u);
  assert.match(output, /--admin-password PASSWORD/u);
});

test("legacy-localhost parity seed uses legacy Subversion form value", () => {
  const source = readFileSync(resolve(repoRoot, "scripts/legacy-localhost.mjs"), "utf8");

  assert.match(source, /name: "svnplayground"[\s\S]*vcs: "Subversion"/u);
});
