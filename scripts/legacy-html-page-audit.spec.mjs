import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { buildLegacyAuditCorpus } from "./visual-parity-sweep-corpus.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);

function normalizePathForTest(_baseUrl, href) {
  return href;
}

describe("legacy HTML page audit", () => {
  it("records an unreachable legacy baseline as machine-readable audit output", () => {
    const outputDir = mkdtempSync(resolve(tmpdir(), "yoram-legacy-audit-"));
    try {
      const latestPath = resolve(outputDir, "latest.json");
      const result = spawnSync("node", ["scripts/audit-legacy-html-pages.mjs"], {
        cwd: repoRoot,
        encoding: "utf8",
        env: {
          ...process.env,
          YONA_LEGACY_AUDIT_OUTPUT_DIR: outputDir,
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
    } finally {
      rmSync(outputDir, { recursive: true, force: true });
    }
  });

  it("keeps visual sweep corpus unusable when the latest legacy audit is unreachable", () => {
    const tempRoot = mkdtempSync(resolve(tmpdir(), "yoram-visual-corpus-"));
    try {
      const auditDir = resolve(tempRoot, ".agent/legacy-html-page-audit");
      mkdirSync(auditDir, { recursive: true });
      writeFileSync(
        resolve(auditDir, "latest.json"),
        `${JSON.stringify({
          baseUrl: "http://127.0.0.1:9",
          error: "curl: failed",
          failed: 1,
          status: "unreachable",
          total: 0,
        })}\n`,
      );

      const corpus = buildLegacyAuditCorpus({
        normalizePath: normalizePathForTest,
        repoRoot: tempRoot,
      });

      assert.equal(corpus.status, "unreachable");
      assert.equal(corpus.pages.length, 0);
      assert.match(corpus.error, /curl: failed/);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });

  it("normalizes successful legacy audit discovered links for visual sweep coverage", () => {
    const tempRoot = mkdtempSync(resolve(tmpdir(), "yoram-visual-corpus-"));
    try {
      const auditDir = resolve(tempRoot, ".agent/legacy-html-page-audit");
      mkdirSync(auditDir, { recursive: true });
      writeFileSync(
        resolve(auditDir, "latest.json"),
        `${JSON.stringify({
          checkedAt: "2026-06-25T00:00:00.000Z",
          discoveredPageLinks: ["/projects", "/projects", "/admin/sample", "https://example.test"],
          failed: 0,
          total: 2,
        })}\n`,
      );

      const corpus = buildLegacyAuditCorpus({
        normalizePath: normalizePathForTest,
        repoRoot: tempRoot,
      });

      assert.equal(corpus.status, "ok");
      assert.equal(corpus.error, null);
      assert.deepEqual(corpus.pages, ["/admin/sample", "/projects"]);
    } finally {
      rmSync(tempRoot, { recursive: true, force: true });
    }
  });
});
