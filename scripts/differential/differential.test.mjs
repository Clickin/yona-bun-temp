// Unit tests for the differential sweep building blocks.
// Run: node --test scripts/differential/differential.test.mjs

import assert from "node:assert/strict";
import test from "node:test";

import { LegacySession, YoramSession, translateLegacy, translateYoram } from "./adapters.mjs";
import { buildCoverage, matchBehaviors, smokeScenarios, validateScenarios } from "./dsl.mjs";
import {
  diffProjections,
  diffSkeletons,
  normalizeApiValue,
  normalizeSkeletonEntries,
  projectCommentRows,
  projectIssueRows,
  projectLabelRows,
} from "./diff.mjs";
import { parseH2ShellOutput } from "./db-projection.mjs";

// --- DSL --------------------------------------------------------------------

const inventoryBehaviors = [
  { id: "B-0100", route: "POST /users/login", action: "UserApp.login" },
  { id: "B-0200", route: "POST /:user/:project/issues/latest", action: "IssueApp.newIssue" },
  { id: "B-0201", route: "GET /:user/:project/issues", action: "IssueApp.issues" },
  { id: "B-0300", route: "POST /:user/:project/issue/$number/comments", action: "IssueApp.newComment" },
  { id: "B-0400", route: "GET /:user/:project/labels", action: "ProjectApp.labels" },
];

test("smoke scenarios pass validation", () => {
  assert.deepEqual(validateScenarios(smokeScenarios), []);
});

test("validation rejects unknown actions and empty scenario lists", () => {
  const problems = validateScenarios([
    { id: "X", actions: [{ actor: "admin", action: "teleport", params: {} }] },
    { id: "X", actions: [] },
  ]);
  assert.equal(problems.length, 3);
});

test("matchBehaviors maps scenarios onto inventory ids", () => {
  const ids = matchBehaviors(smokeScenarios[2], inventoryBehaviors); // S3 create-issue
  assert.deepEqual(ids, ["B-0200"]);
});

test("buildCoverage emits scenarioId back-fill data without mutating inventory", () => {
  const coverage = buildCoverage(smokeScenarios, inventoryBehaviors, "run-1");
  assert.equal(coverage.runId, "run-1");
  const login = coverage.scenarios.find((scenario) => scenario.scenarioId === "S1-login");
});

// --- adapter translation ----------------------------------------------------

test("legacy translation uses direct form POST endpoints", () => {
  assert.deepEqual(translateLegacy({ actor: "a", action: "login", params: { loginId: "admin", password: "admin" } }), {
    method: "POST",
    path: "/users/login",
    form: { loginId: "admin", password: "admin" },
  });
  assert.equal(
    translateLegacy({ actor: "a", action: "create-issue", params: { owner: "admin", project: "sample" } }, { title: "t", body: "b" })
      .path,
    "/admin/sample/issues/latest",
  );
  assert.equal(
    translateLegacy(
      { actor: "a", action: "create-issue-comment", params: { owner: "admin", project: "sample" } },
      { issueNumber: 7, body: "b" },
    ).path,
    "/admin/sample/issue/7/comments",
  );
  assert.equal(translateLegacy({ actor: "a", action: "list-labels", params: { owner: "admin", project: "sample" } }).path, "/admin/sample/labels");
});

test("yoram translation uses /api/v1 REST endpoints", () => {
  const create = translateYoram({ actor: "a", action: "create-issue", params: { owner: "admin", project: "sample" } }, { title: "t", body: "b" });
  assert.equal(create.path, "/api/v1/projects/admin/sample/issues");
  assert.equal(create.json.title, "t");
  assert.equal(create.json.bodyMarkdown, "b");
  const labels = translateYoram({ actor: "a", action: "list-labels", params: { owner: "admin", project: "sample" } });
  assert.equal(labels.path, "/api/v1/owners/admin/projects/sample/labels");
  assert.throws(() => translateLegacy({ actor: "a", action: "warp", params: {} }));
});

test("yoram session attaches csrf header after login", async () => {
  const calls = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init = {}) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "set-cookie": "yona_session=tok; Path=/", "x-csrf-token": "csrf-1" },
    });
  };
  try {
    const session = new YoramSession("http://x");
    await session.login({ loginId: "admin", password: "admin" });
    assert.equal(session.cookies, "yona_session=tok");
    assert.equal(session.csrfToken, "csrf-1");
    await session.request({ method: "POST", path: "/api/v1/ping", json: {} });
    const mutation = calls.at(-1);
    assert.equal(mutation.init.headers["x-csrf-token"], "csrf-1");
    assert.equal(mutation.init.headers.cookie, "yona_session=tok");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --- diff layer -------------------------------------------------------------

test("normalizeApiValue masks volatile fields and sorts keys", () => {
  const normalized = normalizeApiValue({ number: 3, title: "  a   b ", createdAt: "x", id: 1, owner: "admin" });
  assert.equal(normalized.number, "<volatile>");
  assert.equal(normalized.id, "<volatile>");
  assert.equal(normalized.createdAt, "<volatile>");
  assert.equal(normalized.title, "a b");
  assert.equal(normalized.owner, "admin");
});

test("diffSkeletons reports only real differences", () => {
  assert.deepEqual(diffSkeletons(["div.a:x", "span.b:y"], ["span.b:y", "div.a:x"]), []);
  const diffs = diffSkeletons(["div.a:x", "div.only-legacy:q"], ["div.a:x", "div.only-yoram:z"]);
  assert.equal(diffs.length, 2);
  assert.ok(diffs.some((entry) => entry.side === "legacy-only" && entry.expected === "div.only-legacy:q"));
  assert.ok(diffs.some((entry) => entry.side === "yoram-only" && entry.actual === "div.only-yoram:z"));
});

test("normalizeSkeletonEntries collapses whitespace and drops empties", () => {
  assert.deepEqual(normalizeSkeletonEntries(["div.a:  hello    world  ", "   "]), ["div.a: hello world"]);
});

test("db projections map legacy and yoram column spellings", () => {
  const legacy = projectIssueRows([{ TITLE: "T", AUTHOR_LOGIN_ID: "admin", STATE: "OPEN" }]);
  const yoram = projectIssueRows([{ title: "T", authorLoginId: "admin", state: "open" }]);
  assert.deepEqual(diffProjections(legacy, yoram), []);

  const labels = projectLabelRows([
    { name: "bug", category: "type", color: "#F44336" },
    { name: "bug", category_name: "type", color: "#f44336" },
  ]);
  assert.deepEqual(diffProjections([labels[0]], [labels[1]]), []);

  const comments = projectCommentRows([{ authorLoginId: "bob", contents: "hi  there" }, { author_login_id: "bob", body: "hi there" }]);
  assert.deepEqual(diffProjections([comments[0]], [comments[1]]), []);

  const diff = diffProjections([legacy[0]], []);
  assert.equal(diff.length, 1);
  assert.equal(diff[0].side, "legacy-only");
});

test("parseH2ShellOutput parses Shell table output", () => {
  const rows = parseH2ShellOutput("TITLE | AUTHORLOGINID\n-------\na | admin\nb | bob\n(2 rows, 1 ms)");
  assert.deepEqual(rows, [
    { TITLE: "a", AUTHORLOGINID: "admin" },
    { TITLE: "b", AUTHORLOGINID: "bob" },
  ]);
});
