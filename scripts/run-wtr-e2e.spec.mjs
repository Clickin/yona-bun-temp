import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  chromeSpecFiles,
  chromeWtrArgs,
  isCurrentBuildProof,
  scheduleWtrShards,
} from "./run-wtr-e2e-args.mjs";

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

test("partial timing profiles estimate new files in milliseconds", () => {
  const { shards } = scheduleWtrShards(
    [
      { name: "known-small.e2e.ts", size: 10, elapsedMs: 100 },
      { name: "known-large.e2e.ts", size: 20, elapsedMs: 50 },
      { name: "new.e2e.ts", size: 15 },
    ],
    2,
  );
  const flattened = shards.flat();

  assert.deepEqual(
    flattened.map((file) => file.name).sort(),
    ["known-large.e2e.ts", "known-small.e2e.ts", "new.e2e.ts"],
  );
  assert.ok(
    shards.some(
      (shard) =>
        shard.some((file) => file.name === "new.e2e.ts") &&
        shard.some((file) => file.name === "known-large.e2e.ts"),
    ),
  );
  assert.ok(
    flattened.find((file) => file.name === "new.e2e.ts").weight >
      flattened.find((file) => file.name === "new.e2e.ts").size,
  );
});

test("build reuse proof invalidates changed inputs and dist identity", () => {
  const current = {
    inputFiles: [{ path: "frontend/src/main.tsx", digest: "app-v1" }],
    inputConfig: { mode: "production", viteEnvironmentFingerprint: "env-v1" },
    inputFingerprint: "inputs-v1",
    distIdentity: "dist-v1",
  };
  const proof = { schemaVersion: 1, ...current };

  assert.equal(isCurrentBuildProof(proof, current), true);
  assert.equal(
    isCurrentBuildProof(
      { ...proof, inputFingerprint: "inputs-v2" },
      current,
    ),
    false,
  );
  assert.equal(isCurrentBuildProof({ ...proof, distIdentity: "dist-v2" }, current), false);
});
