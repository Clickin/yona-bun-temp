import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { chromeSpecFiles, chromeWtrArgs } from "./run-wtr-e2e-args.mjs";

const manifest = JSON.parse(
  readFileSync(new URL("../frontend/tests/e2e-lane-manifest.json", import.meta.url), "utf8"),
);

test("WTR no-arg lane uses exactly the Chrome manifest", () => {
  const files = chromeSpecFiles(manifest);
  const args = chromeWtrArgs(files);

  assert.equal(files.length, 661);
  assert.equal(args.length, 661);
  assert.ok(files.every((file) => !file.endsWith(".dom.e2e.ts")));
  assert.ok(args.every((arg) => arg.startsWith("tests/wtr/")));
  assert.deepEqual(args.map((arg) => arg.slice("tests/wtr/".length)), files);
});
