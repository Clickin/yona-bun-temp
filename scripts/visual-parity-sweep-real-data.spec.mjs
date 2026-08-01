import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { resolve } from "node:path";
import {
  buildRouteSqlArtifacts,
  captureRouteSqlFromLogs,
  createRouteMarker,
  parseSqlLog,
  writeRouteSqlArtifacts,
} from "./real-data-sql-capture.mjs";

const sweepSource = readFileSync(resolve("scripts/visual-parity-sweep.mjs"), "utf8");

test("sweep waits for public profile readiness before collecting metrics", () => {
  assert.ok(sweepSource.includes('if (path === "/admin")'));
  assert.match(
    sweepSource,
    /\.user-box, \.user-profile-page, \[data-stylex-owner='user-profile-page'\]/u,
  );
});

test("sweep can record a same-context warm route performance sample", () => {
  assert.match(sweepSource, /YORAM_SWEEP_WARM_REPEAT/u);
  assert.match(sweepSource, /warmPerformance/u);
});

test("real-data mode cannot fall back to fixture credentials or bootstrap writes", () => {
  assert.match(sweepSource, /const realDataMode = process\.env\.YORAM_SWEEP_REAL_DATA === "1"/u);
  assert.match(sweepSource, /\(realDataMode \? "" : "admin"\)/u);
  assert.match(sweepSource, /if \(realDataMode\) \{[\s\S]*?return signInLocalAccount/u);
  assert.match(sweepSource, /realDataMode \|\|/u);
  assert.match(sweepSource, /realDataMode[\s\S]*?discoveredRealDataPages/u);
});

test("real-data artifacts use a caller-owned output directory and redact text-bearing fields", () => {
  assert.match(sweepSource, /YORAM_SWEEP_OUTPUT_DIR/u);
  assert.match(sweepSource, /YORAM_SWEEP_SQL_CAPTURE/u);
  assert.match(sweepSource, /captureRouteSqlFromLogs/u);
  assert.match(sweepSource, /sanitizeTargetForArtifact/u);
  assert.match(sweepSource, /\["title", "text", "chromeText", "chromeAttributes"\]/u);
  assert.match(sweepSource, /writeFileSync\(resolve\(outputDir, "write-ledger\.json"\)/u);
});

test("write parity refuses to proceed without a verified restore input", () => {
  assert.match(sweepSource, /REAL_DUMP_PATH/u);
  assert.match(sweepSource, /RESTORE_REQUIRED/u);
  assert.match(sweepSource, /requestShape: null/u);
  assert.match(sweepSource, /checkpointBefore: null/u);
});

test("SQL capture requires an explicit caller-owned output directory", () => {
  const capture = captureRouteSqlFromLogs({
    route: "/public/projects",
    requestMarker: "route-test",
    requestWindow: null,
    env: {},
  });
  assert.equal(capture.status, "capture-unavailable");
  assert.match(capture.comparison.errors[0], /YORAM_SWEEP_OUTPUT_DIR/u);
});

test("SQL records retain route markers while removing literals and sensitive values", () => {
  const marker = createRouteMarker({ label: "legacy", path: "/alice/sample/issues", startedAt: 1 });
  const artifact = buildRouteSqlArtifacts({
    route: "/alice/sample/issues?page=2",
    requestMarker: marker,
    networkSummary: [{ method: "GET", path: "/alice/sample/issues?page=2", status: 200 }],
    legacyRecords: [{
      source: "legacy",
      routeMarker: marker,
      sql: "SELECT id, title FROM issue WHERE owner_id = 42 AND title LIKE 'private title' LIMIT 20 OFFSET 20",
    }],
    yoramRecords: [{
      source: "yoram",
      routeMarker: marker,
      sql: "SELECT id, title FROM issue WHERE owner_id = 42 AND title LIKE 'private title' LIMIT 20 OFFSET 20",
    }],
  });
  const serialized = JSON.stringify(artifact);
  assert.equal(artifact.queries.legacy[0].correlation, "matched");
  assert.equal(artifact.redaction.rawSqlStored, false);
  assert.doesNotMatch(serialized, /private title|42/u);
  assert.match(serialized, /shapeHash|parameterTypes/u);
});

test("plain SQL log parsing strips ANSI and tracing metadata before redaction", () => {
  const records = parseSqlLog({
    source: "yoram",
    text: '\u001b[3mdb.statement\u001b[0m=\u001b[0m"\\nselect id, password from user where id = ?\\n" rows_affected=0 elapsed=1ms',
  });
  assert.equal(records.length, 1);
  const artifact = buildRouteSqlArtifacts({
    route: "/admin",
    requestMarker: "route-test",
    legacyRecords: records,
  });
  const serialized = JSON.stringify(artifact);
  assert.match(serialized, /select id, __sensitive__ from user/iu);
  assert.doesNotMatch(serialized, /db\.statement|rows_affected|\\u001b/iu);
});

test("plain SQL parsing prefers the complete db.statement over a truncated query field", () => {
  const records = parseSqlLog({
    source: "yoram",
    routeMarker: "route-test",
    text: 'query="select id from pull_request …" db.statement="select id from pull_request where contributor_id = ? and updated >= ? order by updated desc" rows_affected=0',
  });
  assert.equal(records.length, 1);
  const artifact = buildRouteSqlArtifacts({
    route: "/admin",
    requestMarker: "route-test",
    legacyRecords: [{
      source: "legacy",
      routeMarker: "route-test",
      sql: "SELECT t0.id FROM pull_request t0 WHERE t0.contributor_id = 1 AND t0.updated >= 2 ORDER BY t0.updated DESC",
    }],
    yoramRecords: records,
  });
  assert.equal(artifact.queries.yoram[0].filters.length, 2);
  assert.equal(artifact.comparison.errors.length, 0);
});

test("FTS-only implementation differences are intentional, while missing filters and pagination are errors", () => {
  const marker = "route-fts";
  const fts = buildRouteSqlArtifacts({
    route: "/search",
    requestMarker: marker,
    legacyRecords: [{ routeMarker: marker, source: "legacy", sql: "SELECT id FROM issue WHERE title LIKE 'needle' LIMIT 20" }],
    yoramRecords: [{ routeMarker: marker, source: "yoram", sql: "SELECT id FROM issue WHERE MATCH(title) AGAINST ('needle') LIMIT 20" }],
  });
  assert.equal(fts.comparison.warnings.length, 0);
  assert.equal(fts.comparison.errors.length, 0);
  assert.equal(fts.comparison.intentionalDifferences.length, 1);

  const regression = buildRouteSqlArtifacts({
    route: "/alice/sample/issues?page=2",
    requestMarker: marker,
    legacyRecords: [{ routeMarker: marker, source: "legacy", sql: "SELECT id FROM issue WHERE owner_id = 42 LIMIT 20" }],
    yoramRecords: [{ routeMarker: marker, source: "yoram", sql: "SELECT id FROM issue" }],
  });
  assert.ok(regression.comparison.errors.length >= 1);
  assert.match(regression.comparison.errors[0].evidence, /LIMIT|filter/iu);
});

test("background and ambiguous SQL are excluded from route queries", () => {
  const artifact = buildRouteSqlArtifacts({
    route: "/projects",
    requestMarker: "route-request",
    requestWindow: { startMs: 100, endMs: 200 },
    legacyRecords: [
      { routeMarker: "route-request", source: "legacy", sql: "SELECT id FROM project LIMIT 20" },
      { source: "legacy", category: "scheduler", sql: "SELECT id FROM notification_mail" },
      { source: "legacy", timestamp: 150, sql: "SELECT id FROM project" },
    ],
  });
  assert.equal(artifact.queries.legacy.filter((query) => query.correlation === "matched").length, 1);
  assert.equal(artifact.excludedQueries.legacy.length, 2);
  assert.match(artifact.excludedQueries.legacy.map((query) => query.exclusionReason).join(" "), /background|ambiguous|marker/u);
});

test("isolated request windows exclude login and startup SQL outside the route", () => {
  const artifact = buildRouteSqlArtifacts({
    route: "/admin",
    requestMarker: "route-admin",
    legacyRequestWindow: { startMs: 100, endMs: 200, isolated: true },
    legacyRecords: [
      { source: "legacy", timestamp: 50, sql: "SELECT id FROM user" },
      { source: "legacy", timestamp: 150, sql: "SELECT id FROM site_admin" },
    ],
  });
  assert.equal(artifact.queries.legacy[0].correlation, "excluded");
  assert.equal(artifact.queries.legacy[1].correlation, "matched");
  assert.equal(artifact.comparison.errors.length, 0);
});

test("SQL artifacts are written only as structured legacy/yoram/comparison files", () => {
  const outputDir = mkdtempSync(join(tmpdir(), "yona-sql-capture-"));
  const artifact = buildRouteSqlArtifacts({ route: "/projects", requestMarker: "route-test" });
  writeRouteSqlArtifacts({ outputDir, legacy: artifact, yoram: artifact, comparison: artifact.comparison });
  assert.match(readFileSync(join(outputDir, "sql", "legacy.json"), "utf8"), /rawSqlStored/u);
});
