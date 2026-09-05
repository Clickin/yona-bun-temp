// Tests for the pullrequest-code domain module: registry shape, translator
// literals, and behavior-inventory coverage. Runs standalone: merges this
// module's actionDefinitions with the shared registry locally because
// scenarios/index.mjs is not edited by domain agents.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { validateScenarios, matchBehaviors } from "./dsl.mjs";
import {
  scenarios,
  actionDefinitions,
  pullRequestNumberFromPayload,
  resolveYoramPullRequestNumber,
} from "./scenarios/pullrequest-code.mjs";

const MERGED_DEFINITIONS = { ...ACTION_DEFINITIONS, ...actionDefinitions };
const knownActions = Object.keys(MERGED_DEFINITIONS);

const inventory = JSON.parse(
  readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "../../docs/provenance/behavior-inventory.json"), "utf8"),
).behaviors;

test("every scenario passes validateScenarios against merged registry", () => {
  const problems = validateScenarios(scenarios, knownActions);
  assert.deepEqual(problems, []);
});

test("every referenced action exists in ACTION_DEFINITIONS after merge", () => {
  for (const scenario of scenarios) {
    for (const step of scenario.actions) {
      assert.ok(
        MERGED_DEFINITIONS[step.action],
        `${scenario.id}: action ${step.action} missing from merged registry`,
      );
      assert.equal(typeof MERGED_DEFINITIONS[step.action].handler, "function", `${step.action} needs handler`);
      assert.equal(typeof MERGED_DEFINITIONS[step.action].translateLegacy, "function", `${step.action} needs translateLegacy`);
      assert.equal(typeof MERGED_DEFINITIONS[step.action].translateYoram, "function", `${step.action} needs translateYoram`);
    }
  }
});

test("translators produce expected method/path literals", () => {
  const step = (action, params) => ({ action, params });
  const domCases = [
    ["list-pullrequests", { owner: "admin", project: "sample" }, "/admin/sample/pullRequests"],
    ["list-closed-pullrequests", { owner: "admin", project: "sample" }, "/admin/sample/closedPullRequests"],
    ["list-sent-pullrequests", { owner: "admin", project: "sample" }, "/admin/sample/sentPullRequests"],
    ["new-pullrequest-form", { owner: "admin", project: "sample" }, "/admin/sample/newPullRequestForm"],
    ["merge-result", { owner: "admin", project: "sample" }, "/admin/sample/newPullRequest/mergeResult"],
    ["view-pullrequest", { owner: "admin", project: "sample", prId: 1 }, "/admin/sample/pullRequest/1"],
    ["view-pullrequest-changes", { owner: "admin", project: "sample", prId: 3 }, "/admin/sample/pullRequest/3/changes"],
    ["view-specific-change", { owner: "admin", project: "sample", prId: 3, commitId: "abc123" }, "/admin/sample/pullRequest/3/changes/abc123"],
    ["view-pullrequest-editform", { owner: "admin", project: "sample", prId: 4 }, "/admin/sample/pullRequest/4/editform"],
    ["list-commits", { owner: "admin", project: "sample" }, "/admin/sample/commits"],
    ["list-commits-branch", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/commits/main/"],
    ["list-commits-path", { owner: "admin", project: "sample", branch: "main", path: "README.md" }, "/admin/sample/commits/main/README.md"],
    ["view-commit", { owner: "admin", project: "sample", commitId: "def456" }, "/admin/sample/commit/def456"],
    ["browse-code", { owner: "admin", project: "sample" }, "/admin/sample/code"],
    ["browse-code-branch", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/code/main"],
    ["browse-code-tree-entry", { owner: "admin", project: "sample", branch: "main", path: "README.md" }, "/admin/sample/code/main/README.md"],
    ["browse-code-ajax-root", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/code/main/!"],
    ["browse-code-ajax-slash", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/code/main/!/"],
    ["browse-code-ajax-path", { owner: "admin", project: "sample", branch: "main", path: "app.js" }, "/admin/sample/code/main/!/app.js"],
    ["list-branches", { owner: "admin", project: "sample" }, "/admin/sample/branches"],
    // R10–R12 read extensions
    ["code-compare", { owner: "admin", project: "sample", revA: "main", revB: "feature/ui" }, "/admin/sample/compare/main..feature%2Fui"],
    ["view-newfork-page", { owner: "admin", project: "sample" }, "/admin/sample/newFork"],
    ["list-reviews", { owner: "admin", project: "sample" }, "/admin/sample/reviews"],
    ["browse-code-ajax-nobranch", { owner: "admin", project: "sample" }, "/admin/sample/code/!"],
    ["browse-code-ajax-nobranch-slash", { owner: "admin", project: "sample" }, "/admin/sample/code/!/"],
    ["browse-code-ajax-nobranch-path", { owner: "admin", project: "sample", path: "app.js" }, "/admin/sample/code/!/app.js"],
  ];
  for (const [action, params, expectedPath] of domCases) {
    const legacy = MERGED_DEFINITIONS[action].translateLegacy(step(action, params), {});
    assert.deepEqual(legacy, { method: "GET", path: expectedPath }, `${action} legacy translation`);
    const yoram = MERGED_DEFINITIONS[action].translateYoram(step(action, params), {});
    assert.equal(yoram.method, "GET", `${action} yoram method`);
    assert.equal(yoram.path, expectedPath, `${action} yoram path (SPA shell serves legacy route)`);
    assert.equal(yoram.pagePath, expectedPath, `${action} yoram pagePath`);
  }
  {
    // Legacy /state is the PR view's XHR polling fragment, not a page; the
    // Yoram side compares the PR detail page where React owns state display.
    const yoram = MERGED_DEFINITIONS["view-pullrequest-state"].translateYoram(
      step("view-pullrequest-state", { owner: "admin", project: "sample", prId: 2 }),
      {},
    );
    assert.equal(yoram.path, "/admin/sample/pullRequest/2", "state yoram path");
    assert.equal(yoram.pagePath, "/admin/sample/pullRequest/2", "state yoram pagePath");
    const legacy = MERGED_DEFINITIONS["view-pullrequest-state"].translateLegacy(
      step("view-pullrequest-state", { owner: "admin", project: "sample", prId: 2 }),
      {},
    );
    assert.equal(legacy.path, "/admin/sample/pullRequest/2/state", "state legacy path");
  }

  // Raw rev-path actions: paired GET without a comparable page target.
  const rawCases = [
    ["view-code-file", { owner: "admin", project: "sample", rev: "main", path: "README.md" }, "/admin/sample/files/main/README.md"],
    ["fetch-raw-file", { owner: "admin", project: "sample", rev: "main", path: "README.md" }, "/admin/sample/rawcode/main/README.md"],
    ["fetch-image-file", { owner: "admin", project: "sample", rev: "main", path: "README.md" }, "/admin/sample/image/main/README.md"],
    ["download-code-archive", { owner: "admin", project: "sample", branch: "main" }, "/admin/sample/code/main/download"],
    ["list-project-files", { owner: "admin", project: "sample" }, "/admin/sample/files"],
  ];
  for (const [action, params, expectedPath] of rawCases) {
    const legacy = MERGED_DEFINITIONS[action].translateLegacy(step(action, params), {});
    assert.deepEqual(legacy, { method: "GET", path: expectedPath }, `${action} legacy translation`);
    const yoram = MERGED_DEFINITIONS[action].translateYoram(step(action, params), {});
    assert.deepEqual(yoram, { method: "GET", path: expectedPath }, `${action} yoram translation`);
  }
});

test("fragment reads do not require a full-page DOM wrapper", async () => {
  const actions = [
    "merge-result",
    "browse-code-ajax-root",
    "browse-code-ajax-slash",
    "browse-code-ajax-path",
    "browse-code-ajax-nobranch",
    "browse-code-ajax-nobranch-slash",
    "browse-code-ajax-nobranch-path",
  ];
  for (const action of actions) {
    let requested = false;
    const step = {
      action,
      params: { owner: "admin", project: "sample", branch: "main", path: "README.md" },
    };
    await MERGED_DEFINITIONS[action].handler({
      step,
      resolved: {},
      options: { legacyUrl: "http://legacy.test" },
      yoramBaseUrl: "http://yoram.test",
      state: {},
      entry: { errors: [], violations: [], behaviorIds: [] },
      helpers: {
        async requestBoth() {
          requested = true;
          return {
            legacyResult: { status: 200, body: "<li>fragment</li>" },
            yoramResult: { status: 200, body: "<li>fragment</li>" },
          };
        },
        async renderDomTarget() {
          throw new Error(`${action} must not render as a full page`);
        },
      },
    });
    assert.equal(requested, true, `${action} keeps the request/status boundary`);
  }
});

test("PR identity uses display numbers and never database ids", async () => {
  assert.equal(pullRequestNumberFromPayload({ pullRequestNumber: 12, id: 901 }), 12);
  assert.equal(pullRequestNumberFromPayload({ number: 13, id: 902 }), 13);
  assert.equal(pullRequestNumberFromPayload({ number: 14, title: "seeded", id: 903 }, "new"), null);
  assert.equal(pullRequestNumberFromPayload({ id: 903 }), null);
  const calls = [];
  const number = await resolveYoramPullRequestNumber(
    {
      step: { params: { owner: "admin", project: "sample" } },
      helpers: {
        async sendRaw(_ctx, side, request) {
          calls.push({ side, request });
          return { status: 200, json: { items: [{ title: "Differential sweep PR test", id: 904, number: 17 }] } };
        },
      },
    },
    "Differential sweep PR test",
  );
  assert.equal(number, 17);
  assert.equal(calls.length, 1);
  assert.equal(
    await resolveYoramPullRequestNumber(
      {
        step: { params: { owner: "admin", project: "sample" } },
        helpers: {
          async sendRaw() {
            return { status: 200, json: { items: [{ title: "wrong", id: 905 }] } };
          },
        },
      },
      "missing",
    ),
    null,
  );
});

test("R16 creates the review probe on the non-seeded branch direction", () => {
  const scenario = scenarios.find((entry) => entry.id === "R16-pr-review-points");
  const create = scenario.actions.find((step) => step.action === "create-pullrequest");
  assert.deepEqual(
    { fromBranch: create.params.fromBranch, toBranch: create.params.toBranch },
    { fromBranch: "feature/ui", toBranch: "main" },
  );
});

test("mutation translators produce expected method/path/body shapes", () => {
  const step = (action, params) => ({ action, params });
  const def = (action) => MERGED_DEFINITIONS[action];
  const base = { owner: "admin", project: "sample" };

  const createLegacy = def("create-pullrequest").translateLegacy(step("create-pullrequest", base), {
    title: "T", body: "B", fromProjectId: "1", fromBranch: "main", toProjectId: "1", toBranch: "feature/ui",
  });
  assert.equal(createLegacy.method, "POST");
  assert.equal(createLegacy.path, "/admin/sample/pullRequests");
  assert.deepEqual(createLegacy.form, {
    title: "T", body: "B", fromProjectId: "1", fromBranch: "main", toProjectId: "1", toBranch: "feature/ui",
  });
  const createYoram = def("create-pullrequest").translateYoram(step("create-pullrequest", base), {
    title: "T", body: "B", fromProjectId: "2", fromBranch: "main", toProjectId: "2", toBranch: "feature/ui",
  });
  assert.equal(createYoram.path, "/api/v1/owners/admin/projects/sample/pull-requests");
  assert.deepEqual(createYoram.json, {
    title: "T", bodyMarkdown: "B", fromProjectId: 2, fromBranch: "main", toProjectId: 2, toBranch: "feature/ui", attachmentIds: [],
  });

  assert.equal(
    def("edit-pullrequest").translateLegacy(step("edit-pullrequest", base), { prId: 5 }).path,
    "/admin/sample/pullRequest/5/edit",
  );
  assert.equal(
    def("edit-pullrequest").translateYoram(step("edit-pullrequest", base), { prId: 5 }).method,
    "PATCH",
  );
  assert.equal(
    def("comment-pullrequest").translateLegacy(step("comment-pullrequest", base), { prId: 5 }).path,
    "/admin/sample/pullRequest/5/comments?commitId=HEAD",
  );
  assert.equal(
    def("comment-pullrequest").translateYoram(step("comment-pullrequest", base), { prId: 5 }).path,
    "/api/v1/owners/admin/projects/sample/pull-requests/5/comments",
  );
  for (const [action, tail] of [["close-pullrequest", "close"], ["open-pullrequest", "open"], ["accept-pullrequest", "accept"]]) {
    assert.equal(
      def(action).translateLegacy(step(action, base), { prId: 7 }).path,
      `/admin/sample/pullRequest/7/${tail}`,
    );
    assert.equal(
      def(action).translateYoram(step(action, base), { prId: 7 }).path,
      `/api/v1/owners/admin/projects/sample/pull-requests/7/${tail}`,
    );
  }
  for (const action of ["review-pullrequest", "unreview-pullrequest"]) {
    const tail = action === "review-pullrequest" ? "review" : "unreview";
    assert.equal(def(action).translateLegacy(step(action, base), { prId: 1 }).path, `/admin/sample/pullRequest/1/${tail}`);
    assert.equal(def(action).translateYoram(step(action, base), { prId: 1 }).path, `/api/v1/owners/admin/projects/sample/pull-requests/1/${tail}`);
  }
  assert.equal(
    def("comment-commit").translateLegacy(step("comment-commit", base), { commitId: "HEAD" }).path,
    "/admin/sample/commit/HEAD/comments",
  );
  assert.equal(
    def("comment-commit").translateYoram(step("comment-commit", base), { commitId: "HEAD" }).path,
    "/api/v1/projects/admin/sample/commit/HEAD/comments",
  );
  assert.equal(
    def("delete-commit-comment").translateLegacy(step("delete-commit-comment", base), { commitId: "HEAD", commentId: 9 }).method,
    "DELETE",
  );
  assert.equal(
    def("delete-commit-comment").translateYoram(step("delete-commit-comment", base), { commitId: "HEAD", commentId: 9 }).path,
    "/api/v1/projects/admin/sample/commit/HEAD/comments/9",
  );
  assert.equal(
    def("set-default-branch").translateLegacy(step("set-default-branch", { ...base, branch: "feature/ui" }), {}).path,
    "/admin/sample/code/feature%2Fui/setAsDefault",
  );
  const defaultBranchYoram = def("set-default-branch").translateYoram(step("set-default-branch", { ...base, branch: "feature/ui" }), {});
  assert.equal(defaultBranchYoram.path, "/api/v1/projects/admin/sample/branches/default");
  assert.deepEqual(defaultBranchYoram.json, { branchName: "feature/ui" });
});

test("comment-pullrequest uses the created display route and DB id without a resolver request", async () => {
  const def = MERGED_DEFINITIONS["comment-pullrequest"];
  const calls = [];
  const rawRequests = [];
  const ctx = {
    step: { action: "comment-pullrequest", params: { owner: "admin", project: "sample" } },
    state: { prIdLegacy: 801, prNumberLegacy: 42, prNumberYoram: 84, prCommitLegacy: null },
    suffix: "contract",
    entry: { errors: [], violations: [], behaviorIds: [] },
    legacySession: {
      request() {
        throw new Error("comment-pullrequest must not use a session-level PR resolver");
      },
    },
    helpers: {
      async sendRaw(_ctx, side, request) {
        rawRequests.push({ side, request });
        return { status: 200, body: "<html>detail without commit list</html>" };
      },
      async requestBoth(_ctx, legacy, yoram) {
        calls.push({ legacy, yoram });
        return {
          legacyResult: { status: 200, body: "" },
          yoramResult: { status: 200, body: "" },
        };
      },
    },
  };

  await def.handler(ctx);

  assert.equal(rawRequests.length, 0);
  assert.equal(calls.length, 1);
  assert.match(calls[0].legacy.path, /\/pullRequest\/801\/comments\?commitId=HEAD$/u);
  assert.match(calls[0].yoram.path, /\/pull-requests\/84\/comments$/u);
});

test("legacy PR cleanup and readiness are scoped to the current differential token", () => {
  const runSource = readFileSync(
    path.join(path.dirname(fileURLToPath(import.meta.url)), "run.mjs"),
    "utf8",
  );
  assert.match(
    runSource,
    /title like 'Differential sweep PR %'/u,
    "preboot cleanup must target every prior differential PR title",
  );
  assert.match(
    runSource,
    /async resolveLegacyPullRequest\(ctx, number, title\)/u,
    "readiness must resolve from the Location number and current title",
  );
  assert.match(
    runSource,
    /AND pr\.TITLE = \$\{sqlQuote\(title\)\}/u,
    "readiness must reject stale rows with the same display number",
  );
  assert.match(
    runSource,
    /await new Promise\(\(resolve\) => setTimeout\(resolve, 100\)\)/u,
    "readiness must poll with a bounded condition rather than a fixed sleep",
  );
  assert.match(
    readFileSync(
      path.join(path.dirname(fileURLToPath(import.meta.url)), "scenarios/pullrequest-code.mjs"),
      "utf8",
    ),
    /currentToken: shared\.title/u,
    "DOM comparison must be gated on the current run token",
  );
});

test("matchBehaviors returns non-empty B-id lists for every scenario", () => {
  for (const scenario of scenarios) {
    const ids = matchBehaviors(scenario, inventory);
    assert.ok(ids.length > 0, `${scenario.id}: no behaviors matched`);
  }
});

test("new scenarios match their targeted behavior sets exactly", () => {
  const expected = {
    "R10-compare-and-file-views": ["B-0068", "B-0076", "B-0078", "B-0080", "B-0107"],
    "R11-code-ajax-nobranch": ["B-0069", "B-0070", "B-0071"],
    "R12-newfork-reviews-attachments": ["B-0048", "B-0108", "B-0109", "B-0120"],
    "R13-pr-lifecycle-mutation": ["B-0227", "B-0228", "B-0229", "B-0230", "B-0232", "B-0233"],
    "R14-commit-comment-lifecycle": ["B-0003", "B-0238"],
    "R15-branch-default-toggle": ["B-0237"],
    "R16-pr-review-points": ["B-0265", "B-0266"],
  };
  for (const [id, ids] of Object.entries(expected)) {
    const scenario = scenarios.find((entry) => entry.id === id);
    assert.ok(scenario, `${id} exists`);
    assert.deepEqual(matchBehaviors(scenario, inventory).sort(), [...ids].sort(), `${id} behavior set`);
  }
});

test("distinct NEW B-id coverage vs pre-wave R1-R9 registry >= 22", () => {
  // Fixed in-domain baseline (R1-R9 matcher set) instead of the moving
  // .agent/differential/behavior-coverage.json artifact, which now includes
  // this wave's own scenarios after every sweep.
  const preWave = new Set(
    scenarios
      .filter((scenario) => /^R[1-9]-/.test(scenario.id))
      .flatMap((scenario) => matchBehaviors(scenario, inventory)),
  );
  const all = new Set(scenarios.flatMap((scenario) => matchBehaviors(scenario, inventory)));
  const fresh = [...all].filter((id) => !preWave.has(id));
  assert.ok(fresh.length >= 22, `NEW distinct B-id coverage ${fresh.length} < 22: ${fresh.join(", ")}`);
});
test("R1–R12 scenarios stay read-only GET; R13–R16 carry the mutations", () => {
  const MUTATIONS = new Set([
    "create-pullrequest", "edit-pullrequest", "comment-pullrequest", "close-pullrequest",
    "open-pullrequest", "accept-pullrequest", "review-pullrequest", "unreview-pullrequest",
    "comment-commit", "delete-commit-comment", "set-default-branch",
  ]);
  for (const scenario of scenarios) {
    const isMutationScenario = /^R1[3-6]-/.test(scenario.id);
    for (const stepAction of scenario.actions.map((a) => a.action)) {
      if (stepAction === "login") continue;
      const probe = { action: stepAction, params: { owner: "o", project: "p", prId: 1, commitId: "c", branch: "b", path: "x", rev: "r", revA: "a", revB: "b" } };
      const method = MERGED_DEFINITIONS[stepAction].translateLegacy(probe, { prId: 1, commitId: "c", commentId: 2 }).method;
      if (!isMutationScenario) {
        assert.equal(method, "GET", `${scenario.id}: ${stepAction} must be GET`);
      } else if (MUTATIONS.has(stepAction)) {
        assert.notEqual(method, "GET", `${scenario.id}: ${stepAction} must mutate`);
      }
    }
  }
});
