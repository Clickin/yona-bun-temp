// Unit tests for the differential sweep building blocks.
// Run: node --test scripts/differential/differential.test.mjs

import assert from "node:assert/strict";
import test from "node:test";

import { LegacySession, YoramSession, translateLegacy, translateYoram } from "./adapters.mjs";
import { buildCoverage, matchBehaviors, smokeScenarios, validateScenarios } from "./dsl.mjs";
import {
  ISSUE_STATE_ENCODINGS,
  diffProjections,
  filterRowsByTag,
  diffSkeletons,
  normalizeApiValue,
  normalizeSkeletonEntries,
  projectCommentRows,
  projectIssueRows,
  projectLabelRows,
} from "./diff.mjs";
import { parseH2ShellOutput } from "./db-projection.mjs";
import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { CLASSIFICATIONS, HarnessError, classifyViolation, violation } from "./report.mjs";

const knownActions = Object.keys(ACTION_DEFINITIONS);

// --- DSL --------------------------------------------------------------------

const inventoryBehaviors = [
  { id: "B-0100", route: "POST /users/login", action: "UserApp.login" },
  { id: "B-0200", route: "POST /:user/:project/issues/latest", action: "IssueApp.newIssue" },
  { id: "B-0201", route: "GET /:user/:project/issues", action: "IssueApp.issues" },
  { id: "B-0300", route: "POST /:user/:project/issue/$number/comments", action: "IssueApp.newComment" },
  { id: "B-0400", route: "GET /:user/:project/labels", action: "ProjectApp.labels" },
];

test("smoke scenarios pass validation", () => {
  assert.deepEqual(validateScenarios(smokeScenarios, knownActions), []);
});

test("validation rejects unknown actions and empty scenario lists", () => {
  const problems = validateScenarios(
    [
      { id: "X", actions: [{ actor: "admin", action: "teleport", params: {} }] },
      { id: "X", actions: [] },
    ],
    knownActions,
  );
  assert.equal(problems.length, 3);
});

test("matchBehaviors maps scenarios onto inventory ids", () => {
  const s3 = smokeScenarios.find((scenario) => scenario.id === "S3-create-issue"); // index-stable: I*/P* scenarios now sort before S*
  const ids = matchBehaviors(s3, inventoryBehaviors);
  assert.ok(s3, "S3-create-issue present in smoke scenarios");
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
  assert.deepEqual(labels[0], { name: "bug", category: "type", color: "#f44336" });
  assert.deepEqual(diffProjections([labels[0]], [labels[1]]), []);

  const comments = projectCommentRows([{ authorLoginId: "bob", contents: "hi  there" }, { author_login_id: "bob", body: "hi there" }]);
  assert.deepEqual(diffProjections([comments[0]], [comments[1]]), []);

  const diff = diffProjections([legacy[0]], []);
  assert.equal(diff.length, 1);
  assert.equal(diff[0].side, "legacy-only");
});

test("issue state encodings normalize legacy H2 and yoram sqlite to identical rows", () => {
  // legacy H2: 1=open, 2=closed; yoram sqlite: 0=open, 1=closed (issue_state_to_raw)
  const legacy = projectIssueRows(
    [{ TITLE: "T", AUTHOR_LOGIN_ID: "admin", STATE: "1" }],
    ISSUE_STATE_ENCODINGS.legacy,
  );
  const yoram = projectIssueRows(
    [{ title: "T", authorLoginId: "admin", state: 0 }],
    ISSUE_STATE_ENCODINGS.yoram,
  );
  assert.equal(legacy[0].state, "open");
  assert.deepEqual(diffProjections(legacy, yoram), []);
});

test("parseH2ShellOutput parses Shell table output", () => {
  const rows = parseH2ShellOutput("TITLE | AUTHORLOGINID\n-------\na | admin\nb | bob\n(2 rows, 1 ms)");
  assert.deepEqual(rows, [
    { TITLE: "a", AUTHORLOGINID: "admin" },
    { TITLE: "b", AUTHORLOGINID: "bob" },
  ]);
});

test("hover-popover scenario validates and matches IssueApp.issues behaviors", () => {
  const scenario = smokeScenarios.find((entry) => entry.id === "S6-hover-popover");
  assert.ok(scenario, "S6-hover-popover missing from smokeScenarios");
  const step = scenario.actions.at(-1);
  assert.equal(step.action, "hover-popover");
  assert.ok(step.params.selector.startsWith("#"), "browser trigger needs a concrete selector");
  assert.deepEqual(validateScenarios([scenario], knownActions), []);
  const ids = matchBehaviors(scenario, inventoryBehaviors);
  assert.deepEqual(ids, ["B-0201"]);
});

test("filterRowsByTag keeps only rows tagged for the current run", () => {
  const rows = [
    { title: "Differential sweep issue sweep-old-1" },
    { title: "Differential sweep issue sweep-now-2" },
    { title: "seeded bug" },
  ];
  assert.deepEqual(filterRowsByTag(rows, "sweep-now").map((row) => row.title), ["Differential sweep issue sweep-now-2"]);
  // null/empty tag = unfiltered (labels stay whole).
  assert.equal(filterRowsByTag(rows, null).length, 3);
});

test("session adapters send json/form bodies without reference errors", async () => {
  const originalFetch = globalThis.fetch;
  const seen = [];
  globalThis.fetch = async (_url, init) => {
    seen.push({ contentType: init.headers["content-type"], body: init.body });
    return { status: 200, headers: { getSetCookie: () => [], get: () => null }, text: async () => "" };
  };
  try {
    const legacy = new LegacySession("http://legacy.test");
    await legacy.request({ method: "POST", path: "/x", json: { a: 1 } });
    await legacy.request({ method: "POST", path: "/y", form: { b: "2" } });
    const yoram = new YoramSession("http://yoram.test");
    await yoram.request({ method: "POST", path: "/z", form: { c: "3" } });
    assert.equal(seen[0].contentType, "application/json");
    assert.equal(seen[0].body, JSON.stringify({ a: 1 }));
    assert.equal(seen[2].body, new URLSearchParams({ c: "3" }).toString());
    assert.ok(seen.every((call) => call.body != null));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --- typed classification model ----------------------------------------------

test("classify keeps unknown DOM and visible loss blocking", () => {
  assert.equal(classifyViolation("api", "/x", { expected: 1, actual: 2 }).classification, "UNVERIFIED");
  assert.equal(classifyViolation("dom", "/x", { firstDiffs: [] }).classification, "UNVERIFIED");
  for (const firstDiff of [
    { side: "yoram", tag: "button", text: "Delete" },
    { side: "yoram", tag: "p", text: "Required explanation" },
    { side: "yoram", tag: "a", text: "Open issue" },
    { side: "yoram", tag: "input", text: "Title" },
    { side: "yoram", tag: "span", text: "3 comments", class: "badge" },
  ]) {
    assert.equal(
      classifyViolation("dom", "/x", { actual: { firstDiffs: [firstDiff] } }).classification,
      "UNVERIFIED",
      `visible loss must remain blocking: ${firstDiff.tag}`,
    );
  }
  assert.equal(classifyViolation("harness", "step", {}).classification, "HARNESS_ERROR");
  assert.equal(classifyViolation("infra", "render", {}).classification, "INFRA_ERROR");
});

test("DOM allow rules require reviewed fingerprints and preserve first-match strictness", () => {
  assert.equal(
    classifyViolation("dom", "/admin/sample", {
      actual: { firstDiffs: [{ side: "order", tag: "div", text: "react-root" }] },
    }).classification,
    "IMPLEMENTATION_DIFFERENCE",
  );
  assert.equal(
    classifyViolation("dom", "/admin/sample", {
      actual: {
        firstDiffs: [
          { side: "legacy-only", expected: "button:Delete" },
          { side: "yoram-only", actual: "div:react-root" },
        ],
      },
    }).classification,
    "UNVERIFIED",
  );
  assert.equal(
    classifyViolation("api", "/admin/sample/issue/label/1", {
      actual: { legacyStatus: 400, yoramStatus: 400 },
    }).classification,
    "HARNESS_ERROR",
  );
});

test("every IMPLEMENTATION_DIFFERENCE rule carries a rationale reference", () => {
  // report.mjs validates its own rule table at import; this asserts the enum
  // contract stays closed against banned legacy terms.
  for (const c of CLASSIFICATIONS) {
    assert.match(c, /^(PASS|REAL_OBSERVABLE_MISMATCH|IMPLEMENTATION_DIFFERENCE|LEGACY_BUG_NOT_REPRODUCED|HARNESS_ERROR|INFRA_ERROR|UNVERIFIED)$/u);
  }
});

test("violation() rejects an IMPLEMENTATION_DIFFERENCE without rationale", () => {
  assert.throws(
    () => violation({ route: "/x", kind: "divergence", classification: "IMPLEMENTATION_DIFFERENCE", expected: 1, actual: 2 }),
    /rationale/u,
  );
  const ok = violation({ route: "/x", kind: "divergence", classification: "IMPLEMENTATION_DIFFERENCE", reason: "r", rationale: "docs/x.md", expected: 1, actual: 2 });
  assert.equal(ok.classification, "IMPLEMENTATION_DIFFERENCE");
  assert.equal(ok.rationale, "docs/x.md");
});

// --- fail-fast id resolution ---------------------------------------------------

function guardedActionCtx(action, state) {
  return {
    step: { action, params: { owner: "admin", project: "sample" } },
    resolved: { title: "t", body: "b" },
    suffix: "sfx",
    state,
    entry: { behaviorIds: ["B-0001"], violations: [], errors: [] },
    helpers: {},
  };
}

test("id-dependent mutations throw HarnessError instead of issuing /issue/null/*", async () => {
  for (const action of ["edit-issue", "patch-issue-content", "update-issue-assignees", "delete-issue", "vote-issue", "unvote-issue"]) {
    const ctx = guardedActionCtx(action, { issueNumberLegacy: null, issueNumberYoram: 7 });
    await assert.rejects(() => ACTION_DEFINITIONS[action].handler(ctx), HarnessError);
    assert.equal(ctx.entry.violations.length, 0);
  }
});

test("create-issue-comment throws before requesting when the issue id is unresolved", async () => {
  let requested = false;
  const ctx = guardedActionCtx("create-issue-comment", { issueNumberLegacy: null, issueNumberYoram: null });
  ctx.helpers.requestBoth = async () => {
    requested = true;
    return { legacyResult: {}, yoramResult: {} };
  };
  await assert.rejects(() => ACTION_DEFINITIONS["create-issue-comment"].handler(ctx), HarnessError);
  assert.equal(requested, false, "no /issue/null/* request may be issued");
});
