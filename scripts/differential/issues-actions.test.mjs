// Issues-domain scenario/action contract tests.
//
// Validates the issues module against the merged registry (index.mjs): shape,
// known actions, request semantics, and mutation outcomes.
import assert from "node:assert/strict";
import { test } from "node:test";

import { validateScenarios } from "./dsl.mjs";
import { ACTION_DEFINITIONS, scenarios } from "./scenarios/index.mjs";
import * as issues from "./scenarios/issues.mjs";
import { translateLegacy, translateYoram } from "./adapters.mjs";
import { domVisibleLoss } from "./diff.mjs";
import { classifyViolation } from "./report.mjs";
const knownActions = Object.keys(ACTION_DEFINITIONS);
const issuesScenarios = scenarios.filter((scenario) => issues.scenarios.some((own) => own.id === scenario.id));

test("every issues scenario passes validateScenarios against the merged registry", () => {
  const problems = validateScenarios(issuesScenarios, knownActions);
  assert.deepEqual(problems, []);
});

test("every action referenced by issues scenarios exists in ACTION_DEFINITIONS", () => {
  for (const scenario of issuesScenarios) {
    for (const step of scenario.actions) {
      assert.ok(
        ACTION_DEFINITIONS[step.action],
        `${scenario.id} references unknown action ${step.action}`,
      );
    }
  }
});

test("issues scenarios keep their ids namespaced to the domain", () => {
  for (const scenario of issues.scenarios) {
    assert.match(scenario.id, /^(I\d{1,2}|S[346])-/, `${scenario.id} must be I* or the pre-existing S3/S4/S6`);
  }
});

test("read-page actions translate to legacy-direct GET paths on both sides", () => {
  const step = (action, params) => ({ actor: "admin", action, params });
  const cases = [
    ["issue-detail", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1"],
    ["issue-edit-form", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1/editform"],
    ["issue-timeline", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1/timeline"],
    ["issue-next-state", { owner: "admin", project: "sample", number: 1 }, "/admin/sample/issue/1/nextstate"],
    ["new-issue-form", { owner: "admin", project: "sample" }, "/admin/sample/issueform"],
    ["issue-labels", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels"],
    ["issue-label-styles", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels.css"],
    ["issue-labels-form", { owner: "admin", project: "sample" }, "/admin/sample/issue/labelsform"],
    // Legacy route is GET /organizations/:organizationName/issues
    // (yona-original/conf/routes:100), not /:org/issues.
    ["org-issues", { organization: "weblabs", state: "open" }, "/organizations/weblabs/issues?state=open"],
    ["site-issue-list", {}, "/sites/issueList"],
  ];
  for (const [action, params, expected] of cases) {
    assert.deepEqual(translateLegacy(step(action, params)), { method: "GET", path: expected });
    assert.deepEqual(translateYoram(step(action, params)), { method: "GET", path: expected });
  }
});

test("issue detail DOM probes exclude the shared shell and keep the route body", async () => {
  const calls = [];
  const ctx = {
    step: { actor: "admin", action: "issue-detail", params: { owner: "admin", project: "sample", number: 1 } },
    resolved: {},
    options: { legacyUrl: "http://legacy.test" },
    yoramBaseUrl: "http://yoram.test",
    helpers: {
      async requestBoth() {
        return { legacyResult: { status: 200 }, yoramResult: { status: 200 } };
      },
      async renderDomTarget(_ctx, target) {
        calls.push(target);
      },
    },
  };
  await issues.actionDefinitions["issue-detail"].handler(ctx);
  assert.deepEqual(calls, [
    {
      legacy: "http://legacy.test/admin/sample/issue/1",
      yoram: "http://yoram.test/admin/sample/issue/1",
      spa: true,
      ...issues.ISSUE_DETAIL_DOM_SELECTORS,
    },
  ]);
});

test("issue detail route-body losses for watcher and label controls remain blocking", () => {
  for (const expected of [
    "a.btn.watcher-count.no-border:1",
    "a.label-edit:[수정]",
    "button.issue-detail-watch-control:watch",
  ]) {
    const detail = {
      actual: {
        fullDiffs: [
          { side: "legacy-only", expected },
          { side: "yoram-only", expected: "div#react-root:" },
        ],
      },
    };
    assert.equal(domVisibleLoss(detail), true, `missing route-body control must be visible: ${expected}`);
    assert.equal(
      classifyViolation("dom", "/admin/sample/issue/1", detail).classification,
      "UNVERIFIED",
      `missing route-body control must not be hidden by shell drift: ${expected}`,
    );
  }
});

test("JSON issue label and category reads use parsed API comparison without DOM rendering", async () => {
  const step = { actor: "admin", action: "issue-labels", params: { owner: "admin", project: "sample" } };
  const calls = [];
  const ctx = {
    step,
    resolved: {},
    helpers: {
      async requestJsonBoth(_ctx, legacy, yoram) {
        calls.push({ legacy, yoram });
        return { legacyResult: { json: [] }, yoramResult: { json: [] } };
      },
      renderDomTarget() {
        throw new Error("JSON route must not render a DOM target");
      },
    },
  };
  await ACTION_DEFINITIONS["issue-labels"].handler(ctx);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].legacy.path, "/admin/sample/issue/labels");

  let categoryCall = 0;
  const categoryCtx = {
    step: { ...step, action: "issue-label-categories" },
    resolved: {},
    helpers: {
      async requestJsonBoth(_ctx, legacy, yoram) {
        calls.push({ legacy, yoram });
        categoryCall += 1;
        return categoryCall === 1
          ? {
              legacyResult: { json: { categories: [{ id: 7 }] } },
              yoramResult: { json: { categories: [{ id: 9 }] } },
            }
          : { legacyResult: { json: {} }, yoramResult: { json: {} } };
      },
      renderDomTarget() {
        throw new Error("JSON route must not render a DOM target");
      },
    },
  };
  await ACTION_DEFINITIONS["issue-label-categories"].handler(categoryCtx);
  assert.equal(categoryCall, 2);
  assert.match(calls.at(-1).legacy.path, /\/issue\/label\/category\/7$/u);
  assert.match(calls.at(-1).yoram.path, /\/issue\/label\/category\/9$/u);
});

test("list-issues encodes state/milestone/search filter params", () => {
  const step = { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", state: "closed", milestoneId: 1 } };
  assert.equal(translateLegacy(step).path, "/admin/sample/issues?state=closed&milestoneId=1");
  const search = { actor: "admin", action: "list-issues", params: { owner: "admin", project: "sample", search: "parity" } };
  assert.equal(translateYoram(search).path, "/admin/sample/issues?search=parity");
});

test("issue-api-probe keeps the legacy-compat path on legacy and maps to RESTful on yoram", () => {
  const probe = { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" } };
  assert.equal(translateLegacy(probe).method, "GET");
  assert.equal(translateLegacy(probe).path, "/-_-api/v1/owners/admin/projects/sample/issues/1");
  assert.equal(translateYoram(probe).path, "/api/v1/owners/admin/projects/sample/issues/1");
  const assignable = { actor: "admin", action: "issue-api-probe", params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1/assignableUsers" } };
  assert.equal(translateYoram(assignable).path, "/api/v1/owners/admin/projects/sample/issues/1/assignable-users/find");
  const categories = { actor: "admin", action: "issue-label-categories", params: { owner: "admin", project: "sample" } };
  assert.equal(translateYoram(categories).path, "/admin/sample/issue/label/categories");
});

test("pre-existing mutation actions keep their translation contracts", () => {
  assert.deepEqual(
    translateLegacy({ actor: "a", action: "create-issue", params: { owner: "admin", project: "sample" } }, { title: "t", body: "b" }).form,
    { title: "t", body: "b", assigneeLoginId: "" },
  );
  assert.equal(
    translateLegacy({ actor: "a", action: "create-issue", params: { owner: "admin", project: "sample" } }, { title: "t", body: "b" }).path,
    "/admin/sample/issues/latest",
  );
  assert.equal(ACTION_DEFINITIONS["create-issue-comment"].translateLegacy({ params: { owner: "admin", project: "sample" } }, { issueNumber: 7 }).path, "/admin/sample/issue/7/comments");
});

test("issue imports use a bodyless legacy postNumber conversion and Rust migration boundary", () => {
  const step = {
    actor: "admin",
    action: "probe-issue-imports",
    params: { owner: "admin", project: "sample" },
  };
  assert.deepEqual(translateLegacy(step, { projectName: "parity-import-test", postNumber: 17 }), {
    method: "POST",
    path: "/-_-api/v1/owners/admin/projects/parity-import-test/issues/imports?postNumber=17",
  });
  assert.equal("json" in translateLegacy(step, { projectName: "parity-import-test", postNumber: 17 }), false);
  assert.deepEqual(translateYoram(step, { projectName: "parity-import-test" }), {
    method: "POST",
    path: "/api/v1/owners/admin/projects/parity-import-test/imports",
  });
});

test("issue imports prove conversion/readback and clean up their dedicated project", async () => {
  const calls = [];
  const migrationArgs = [];
  const suffix = "import-proof";
  const plan = {
    title: `Differential imported issue ${suffix}`,
    body: `Differential imported issue body ${suffix}`,
    comment: `Differential imported issue comment ${suffix}`,
  };
  const ctx = {
    step: {
      actor: "admin",
      action: "probe-issue-imports",
      params: { owner: "admin", project: "sample" },
    },
    suffix,
    resolved: {},
    state: {},
    entry: { errors: [], violations: [] },
    options: { legacyUrl: "http://legacy.test" },
    yoramBaseUrl: "http://yoram.test",
    legacySession: { cookies: "PLAY_SESSION=source" },
    helpers: {
      async requestBoth(_ctx, legacy, yoram) {
        calls.push({ side: "pair", legacy, yoram });
        return {
          legacyResult: { status: 303 },
          yoramResult: { status: 201, json: { projectName: "parity-import-import-proof" } },
        };
      },
      async sendRaw(_ctx, side, request) {
        calls.push({ side, request });
        if (side === "legacy" && request.method === "POST" && request.path.endsWith("/posts")) {
          return { status: 303, location: "/admin/parity-import-import-proof/post/23" };
        }
        if (side === "legacy" && request.method === "POST" && request.path.endsWith("/post/23/comment")) {
          return { status: 303, location: "#comment-31" };
        }
        if (side === "legacy" && request.method === "POST" && request.path.includes("/issues/imports?")) {
          return { status: 200, json: { number: 24 } };
        }
        if (side === "legacy" && request.method === "GET" && request.path.endsWith("/issue/24")) {
          return { status: 200, body: `${plan.title} ${plan.body} ${plan.comment}` };
        }
        if (side === "legacy" && request.method === "GET" && request.path.endsWith("/post/23")) {
          return { status: 404, body: "" };
        }
        if (side === "yoram" && request.method === "POST" && request.path === "/api/v1/auth/token") {
          return { status: 200, json: { access_token: "target-token" } };
        }
        if (side === "yoram" && request.method === "GET" && request.path.endsWith("/issues")) {
          return { status: 200, json: [{ title: plan.title, issueNumber: 42 }] };
        }
        if (side === "yoram" && request.method === "GET" && request.path.endsWith("/issues/42")) {
          return {
            status: 200,
            json: { title: plan.title, bodyMarkdown: plan.body, comments: [{ contentsMarkdown: plan.comment }] },
          };
        }
        if (request.method === "DELETE") return { status: 204 };
        if (request.method === "GET") return { status: 404 };
        return { status: 200 };
      },
    },
    migrationRunner(args) {
      migrationArgs.push(args);
      return { status: 0, stdout: "", stderr: "" };
    },
  };

  await ACTION_DEFINITIONS["probe-issue-imports"].handler(ctx);
  const conversion = calls.find(
    (call) => call.side === "legacy" && call.request.method === "POST" && call.request.path.includes("/issues/imports?"),
  );
  assert.ok(conversion);
  assert.equal("json" in conversion.request, false);
  assert.equal(conversion.request.path, "/-_-api/v1/owners/admin/projects/parity-import-import-proof/issues/imports?postNumber=23");
  assert.equal(calls.some((call) => call.side === "yoram" && call.request.path.startsWith("/-_-api/")), false);
  assert.deepEqual(migrationArgs[0].slice(0, 8), [
    "--from-url",
    "http://legacy.test",
    "--from-cookie",
    "PLAY_SESSION=source",
    "--from-owner",
    "admin",
    "--from-project",
    "parity-import-import-proof",
  ]);
  assert.ok(calls.some((call) => call.side === "legacy" && call.request.method === "DELETE"));
  assert.ok(calls.some((call) => call.side === "yoram" && call.request.method === "DELETE"));
  assert.deepEqual(ctx.entry.errors, []);
});

test("issue mutations use legacy payload shapes and normalize paired issue identity", async () => {
  const step = { actor: "admin", action: "update-issue-assignees", params: { owner: "admin", project: "sample" } };
  const vars = { issueNumber: 7 };
  assert.deepEqual(translateLegacy(step, vars).json, { assignees: ["admin"] });
  assert.deepEqual(translateYoram(step, vars).json, { assignees: ["admin"] });

  const shareStep = { actor: "admin", action: "update-sharer", params: { owner: "admin", project: "sample" } };
  assert.deepEqual(translateLegacy(shareStep, vars).json, {
    sharer: { loginId: "carol", type: "user" },
    action: "add",
  });
  assert.deepEqual(translateYoram(shareStep, vars), {
    method: "POST",
    path: "/api/v1/owners/admin/projects/sample/issues/7/sharers",
    json: { loginId: "carol", targetType: "user" },
  });
  const shareRequests = [];
  const shareReadbacks = [];
  let sharerPresent = false;
  await ACTION_DEFINITIONS["update-sharer"].handler({
    step: shareStep,
    resolved: {},
    state: { issueNumberLegacy: 7, issueNumberYoram: 7 },
    entry: { violations: [], errors: [] },
    helpers: {
      async requestBoth(_ctx, legacy, yoram) {
        shareRequests.push({ legacy, yoram });
        sharerPresent = shareRequests.length === 1;
        return {
          legacyResult: { status: 200, json: { action: sharerPresent ? "added" : "deleted", sharer: "carol" } },
          yoramResult: { status: 200, json: { sharers: sharerPresent ? [{ loginId: "carol" }] : [] } },
        };
      },
      async sendRaw(_ctx, side, request) {
        shareReadbacks.push({ side, request });
        return side === "legacy"
          ? { status: 200, json: sharerPresent ? [{ loginId: "carol" }] : [] }
          : { status: 200, json: { sharers: sharerPresent ? [{ loginId: "carol" }] : [] } };
      },
    },
  });
  assert.equal(shareRequests.length, 2);
  assert.deepEqual(shareRequests[0].legacy.json, {
    sharer: { loginId: "carol", type: "user" },
    action: "add",
  });
  assert.deepEqual(shareRequests[0].yoram, {
    method: "POST",
    path: "/api/v1/owners/admin/projects/sample/issues/7/sharers",
    json: { loginId: "carol", targetType: "user" },
  });
  assert.deepEqual(shareRequests[1].legacy.json, {
    sharer: { loginId: "carol", type: "user" },
    action: "delete",
  });
  assert.deepEqual(shareRequests[1].yoram, {
    method: "DELETE",
    path: "/api/v1/owners/admin/projects/sample/issues/7/sharers/carol?targetType=user",
  });
  assert.deepEqual(shareReadbacks.map(({ side }) => side), ["legacy", "yoram", "legacy", "yoram"]);
  assert.deepEqual(shareReadbacks[0].request, {
    method: "GET",
    path: "/-_-api/v1/owners/admin/projects/sample/issues/7/findSharer?query=carol",
    headers: { Accept: "application/json" },
  });
  assert.deepEqual(shareReadbacks[1].request, {
    method: "GET",
    path: "/api/v1/projects/admin/sample/issues/7",
  });
  assert.deepEqual(shareReadbacks[2].request, shareReadbacks[0].request);
  assert.deepEqual(shareReadbacks[3].request, shareReadbacks[1].request);

  const ctx = {
    step: { actor: "admin", action: "patch-issue-content", params: { owner: "admin", project: "sample" } },
    resolved: { body: "before" },
    state: { issueNumberLegacy: 338, issueNumberYoram: 2 },
    entry: { violations: [] },
    helpers: {
      async requestBoth() {
        return {
          legacyResult: {
            status: 200,
            json: {
              refUrl: "http://127.0.0.1:9000/admin/sample/issue/338",
              state: "OPEN",
              title: "same",
            },
          },
          yoramResult: {
            status: 200,
            json: {
              refUrl: "/admin/sample/issue/2",
              state: "open",
              title: "same",
            },
          },
        };
      },
    },
  };
  await ACTION_DEFINITIONS["patch-issue-content"].handler(ctx);
  assert.deepEqual(ctx.entry.violations, []);
});

test("issue label JSON normalizer ignores only the optional false category flag", async () => {
  const makeContext = (yoramJson) => ({
    step: { actor: "admin", action: "create-issue-label", params: { owner: "admin", project: "sample" } },
    resolved: { labelName: "L", categoryName: "C" },
    suffix: "test",
    state: {},
    entry: { behaviorIds: ["B-label"], violations: [], errors: [] },
    helpers: {
      async requestBoth() {
        return {
          legacyResult: { status: 200, json: { id: 1, name: "L", categoryIsExclusive: false } },
          yoramResult: { status: 200, json: yoramJson },
        };
      },
    },
  });

  const equivalent = makeContext({ categoryIsExclusive: false, name: "L", id: 2 });
  await ACTION_DEFINITIONS["create-issue-label"].handler(equivalent);
  assert.deepEqual(equivalent.entry.violations, []);

  const different = makeContext({ categoryIsExclusive: true, name: "L", id: 2 });
  await ACTION_DEFINITIONS["create-issue-label"].handler(different);
  assert.equal(different.entry.violations.length, 1);
});

test("issue label CRUD keeps create response IDs when the Yoram list cache is stale", async () => {
  const state = {};
  const entry = { violations: [], errors: [] };
  await ACTION_DEFINITIONS["create-issue-label"].handler({
    step: { actor: "admin", action: "create-issue-label", params: { owner: "admin", project: "sample" } },
    resolved: { labelName: "ignored", categoryName: "ignored" },
    suffix: "stale-cache",
    state,
    entry,
    helpers: {
      async requestBoth() {
        return {
          legacyResult: {
            status: 201,
            json: { id: 17, categoryId: 18, name: "parity-label-stale-cache" },
          },
          yoramResult: {
            status: 201,
            json: { id: 27, categoryId: 28, name: "parity-label-stale-cache" },
          },
        };
      },
    },
  });

  let listCall = 0;
  await ACTION_DEFINITIONS["issue-label-ids"].handler({
    step: { actor: "admin", action: "issue-label-ids", params: { owner: "admin", project: "sample" } },
    suffix: "stale-cache",
    state,
    entry,
    helpers: {
      async requestBoth() {
        listCall += 1;
        return listCall === 1
          ? {
              legacyResult: { status: 200, json: [{ id: 17, name: "parity-label-stale-cache" }] },
              yoramResult: { status: 200, json: [{ id: 2, name: "parity" }] },
            }
          : {
              legacyResult: { status: 200, json: [{ id: 18, name: "parity-cat-stale-cache" }] },
              yoramResult: { status: 200, json: [{ id: 3, name: "parity-cat-stale-cache" }] },
            };
      },
    },
  });

  assert.deepEqual(
    { labelIdLegacy: state.labelIdLegacy, labelIdYoram: state.labelIdYoram, categoryIdLegacy: state.categoryIdLegacy, categoryIdYoram: state.categoryIdYoram },
    { labelIdLegacy: 17, labelIdYoram: 27, categoryIdLegacy: 18, categoryIdYoram: 28 },
  );
});

test("I23 restores both seed issue-label associations immediately before export", async () => {
  const i23 = issues.scenarios.find((scenario) => scenario.id === "I23-markdown-and-export-reads");
  const restoreIndex = i23.actions.findIndex((step) => step.action === "restore-migration-issue-labels");
  const exportIndex = i23.actions.findIndex((step) => step.action === "migration-export-issuelabel-pairs");
  assert.equal(restoreIndex + 1, exportIndex);
  const calls = [];
  const rows = [
    { id: 11, name: "bug", category: "type", color: "#f44336" },
    { id: 12, name: "parity", category: "area", color: "#2196f3" },
  ];
  const categories = [
    { id: 21, name: "type" },
    { id: 22, name: "area" },
  ];
  const labelsBySide = { legacy: [], yoram: [] };
  const categoriesBySide = { legacy: [], yoram: [] };
  const definition = ACTION_DEFINITIONS["restore-migration-issue-labels"];
  const ctx = {
    step: { action: "restore-migration-issue-labels", params: { owner: "admin", project: "sample" } },
    entry: { errors: [], violations: [] },
    helpers: {
      async sendRaw(_ctx, side, request) {
        calls.push({ side, request });
        if (request.method === "GET" && request.path.endsWith("/issue/labels")) {
          return { status: 200, json: labelsBySide[side] };
        }
        if (request.method === "GET" && request.path.endsWith("/issue/label/categories")) {
          return { status: 200, json: categoriesBySide[side] };
        }
        if (request.method === "GET" && request.path === "/admin/sample") {
          return { status: 200, body: '<main data-project-id="7"></main>' };
        }
        if (request.method === "GET" && /\/issues?\/1$/u.test(request.path)) {
          return side === "legacy"
            ? { status: 200, body: "<a>bug</a><a>parity</a>" }
            : { status: 200, json: { labels: rows } };
        }
        if (request.method === "POST" && request.path.endsWith("/issue/label/categories")) {
          const category = categories.find((item) => item.name === request.form.name);
          categoriesBySide[side].push(category);
          return { status: 201, json: category };
        }
        if (request.method === "POST" && request.path.endsWith("/issue/labels")) {
          const row = rows.find((item) => item.name === request.form.labelName);
          labelsBySide[side].push(row);
          return { status: 201, json: row };
        }
        return { status: 200 };
      },
      async requestBoth(_ctx, legacy, yoram) {
        calls.push({ legacy, yoram });
        if (legacy.method === "GET") {
          return {
            legacyResult: { status: 200, json: null, body: "<a>bug</a><a>parity</a>" },
            yoramResult: { status: 200, json: { labels: rows } },
          };
        }
        return {
          legacyResult: { status: 200, json: { labels: rows } },
          yoramResult: { status: 200, json: { labels: rows } },
        };
      },
    },
  };
  await definition.handler(ctx);
  const writes = calls.filter((call) => call.legacy?.method === "POST");
  assert.equal(writes.length, 1);
  assert.deepEqual(writes[0].legacy.json, ["11", "12"]);
  assert.deepEqual(writes[0].yoram.json, ["11", "12"]);
  assert.equal(calls.filter((call) => call.request?.method === "POST" && call.request.path.endsWith("/issue/label/categories")).length, 4);
  assert.equal(calls.filter((call) => call.request?.method === "POST" && call.request.path.endsWith("/issue/labels")).length, 4);
  assert.ok(calls.some((call) => call.legacy?.method === "GET" && call.yoram?.method === "GET"));
  assert.deepEqual(ctx.entry.errors, []);
});

test("mutation actions translate to the legacy form route vs the Yoram REST route", () => {
  const step = (action, params) => ({ actor: "admin", action, params });
  const vars = { title: "t", body: "b", issueNumber: 7, commentId: 9, issuePk: 42, labelId: 5, categoryId: 6, labelName: "L", categoryName: "C" };

  // edit-issue: legacy form POST edit route vs Yoram compat PUT issue.
  assert.deepEqual(
    translateLegacy(step("edit-issue", { owner: "admin", project: "sample" }), vars),
    { method: "POST", path: "/admin/sample/issue/7/edit", form: { title: "t", body: "b", assigneeLoginId: "" } },
  );
  assert.deepEqual(
    translateYoram(step("edit-issue", { owner: "admin", project: "sample" }), vars),
    { method: "PUT", path: "/api/v1/owners/admin/projects/sample/issues/7", json: { title: "t", body: "b" } },
  );

  // delete-issue: legacy direct DELETE route vs Yoram SPA REST DELETE.
  assert.equal(translateLegacy(step("delete-issue", { owner: "admin", project: "sample" }), vars).path, "/admin/sample/issue/7/delete");
  assert.equal(translateYoram(step("delete-issue", { owner: "admin", project: "sample" }), vars).path, "/api/v1/projects/admin/sample/issues/7");

  // comment mutations chain the captured comment id on both sides.
  assert.equal(
    translateLegacy(step("edit-comment", { owner: "admin", project: "sample" }), vars).path,
    "/admin/sample/issue/7/comments/9",
  );
  // watch/favorite key on the resolved DB pk.
  assert.equal(
    translateLegacy(step("watch-issue", { owner: "admin", project: "sample" }), vars).path,
    "/watch?resource.type=issue_post&resource.id=42",
  );
  assert.equal(
    translateYoram(step("toggle-favorite-issue", { owner: "admin", project: "sample" }), vars).path,
    "/api/v1/user/favorites/issues/42",
  );

  // label CRUD: legacy form routes on both sides, attach via compat API.
  assert.deepEqual(
    translateLegacy(step("create-issue-label", { owner: "admin", project: "sample" }), { labelName: "L", categoryName: "C" }),
    { method: "POST", path: "/admin/sample/issue/labels", form: { labelName: "L", categoryName: "C", labelColor: "#123456" } },
  );
  assert.equal(
    translateLegacy(step("attach-issue-labels", { owner: "admin", project: "sample" }), vars).path,
    "/-_-api/v1/owners/admin/projects/sample/issuelabel/7",
  );
  assert.equal(
    translateLegacy(step("delete-issue-label", { owner: "admin", project: "sample" }), vars).path,
    "/admin/sample/issue/label/5/delete",
  );
  assert.equal(
    translateYoram(step("delete-label-category", { owner: "admin", project: "sample" }), vars).method,
    "DELETE",
  );

  // migration exports + markdown probe keep identical paths on both sides.
  for (const [action, path] of [
    ["migration-export-issues", "/migration/admin/projects/sample/issues"],
    ["migration-export-labels", "/migration/admin/projects/sample/labels"],
    ["migration-export-issuelabel-pairs", "/migration/admin/projects/sample/issuelabel"],
    ["render-markdown", "/markdown/admin/sample"],
  ]) {
    assert.equal(translateLegacy(step(action, { owner: "admin", project: "sample" }), vars).path, path);
    assert.equal(translateYoram(step(action, { owner: "admin", project: "sample" }), vars).path, path);
  }
  // Legacy LabelApp.labels requires limit and Accept: application/json
  // (LabelApp.java:52-58); the probe pins both sides to that contract.
  assert.deepEqual(translateLegacy(step("global-labels", {})), {
    method: "GET",
    path: "/labels?limit=1000",
    headers: { Accept: "application/json" },
  });
  assert.deepEqual(translateYoram(step("global-labels", {})), {
    method: "GET",
    path: "/labels?limit=1000",
    headers: { Accept: "application/json" },
  });
});
