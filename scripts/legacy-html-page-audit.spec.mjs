import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const latestPath = resolve(repoRoot, ".agent/legacy-html-page-audit/latest.json");

describe("legacy HTML page audit", () => {
  it("records an unreachable legacy baseline as machine-readable audit output", () => {
    const result = spawnSync("node", ["scripts/audit-legacy-html-pages.mjs"], {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        YONA_LEGACY_BASE_URL: "http://127.0.0.1:9",
      },
    });

    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /"status": "unreachable"/);
    assert.equal(existsSync(latestPath), true);

    const summary = JSON.parse(readFileSync(latestPath, "utf8"));
    assert.equal(summary.baseUrl, "http://127.0.0.1:9");
    assert.equal(summary.status, "unreachable");
    assert.equal(summary.total, 0);
    assert.equal(summary.failed, 1);
    assert.match(summary.error, /curl:/);
  });
});
