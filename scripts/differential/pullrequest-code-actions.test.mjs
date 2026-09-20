// Tests for the pullrequest-code domain module: registry shape, request
// semantics, and mutation outcomes. Runs standalone: merges this
// module's actionDefinitions with the shared registry locally because
// scenarios/index.mjs is not edited by domain agents.
import test from "node:test";
import assert from "node:assert/strict";
import { runInNewContext } from "node:vm";
import { readFileSync } from "node:fs";

import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { matchBehaviors, validateScenarios } from "./dsl.mjs";
import {
  scenarios,
  actionDefinitions,
  commitCommentIdFromPayload,
  commitCommentTargetFromPage,
  commitCommentIdFromPage,
  commitIdFromLegacyPage,
  commitIdFromYoramPayload,
  pullRequestNumberFromPayload,
  resolveYoramPullRequestNumber,
  PULL_REQUEST_DETAIL_DOM_SELECTORS,
} from "./scenarios/pullrequest-code.mjs";
import { domVisibleLoss } from "./diff.mjs";
import { classifyViolation } from "./report.mjs";

const MERGED_DEFINITIONS = { ...ACTION_DEFINITIONS, ...actionDefinitions };
const knownActions = Object.keys(MERGED_DEFINITIONS);

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
      assert.equal(
        typeof MERGED_DEFINITIONS[step.action].handler,
        "function",
        `${step.action} needs handler`,
      );
      assert.equal(
        typeof MERGED_DEFINITIONS[step.action].translateLegacy,
        "function",
        `${step.action} needs translateLegacy`,
      );
      assert.equal(
        typeof MERGED_DEFINITIONS[step.action].translateYoram,
        "function",
        `${step.action} needs translateYoram`,
      );
    }
  }
});

test("commit comment page resolver selects the created comment, not the first stale delete link", () => {
  const body = `
    <ul>
      <li id="comment-3"><button data-request-uri="/admin/sample/commit/HEAD/comments/3/delete"></button>old</li>
      <li id="comment-9"><button data-request-uri="/admin/sample/commit/abc123/comments/9/delete"></button>
        Differential sweep commit comment run-42
      </li>
    </ul>`;
  assert.deepEqual(commitCommentTargetFromPage(body, "Differential sweep commit comment run-42"), {
    commentId: 9,
    commitId: "abc123",
  });
  assert.equal(commitCommentIdFromPage(body, "Differential sweep commit comment run-42"), 9);
  assert.equal(commitCommentIdFromPage(body, "missing"), null);
});

test("commit comment resolvers select canonical commit and marker comment IDs", () => {
  const legacyBody = `
    <strong class="commitId">@a92847dc20bf80c878a8017b4c2cec36b7d9eaac</strong>
    <li id="comment-3">stale comment</li>
    <li id="comment-9"><button data-request-uri="/comments/review_comment/9"></button>
      Differential sweep commit comment run-42
    </li>`;
  assert.equal(commitIdFromLegacyPage(legacyBody), "a92847dc20bf80c878a8017b4c2cec36b7d9eaac");
  assert.deepEqual(
    commitCommentTargetFromPage(legacyBody, "Differential sweep commit comment run-42"),
    { commentId: 9, commitId: null },
  );
  const payload = {
    commit: { commitId: "a92847dc20bf80c878a8017b4c2cec36b7d9eaac" },
    threads: [
      { comments: [{ id: 3, contentsMarkdown: "stale comment" }] },
      { comments: [{ id: 11, contentsMarkdown: "Differential sweep commit comment run-42" }] },
    ],
  };
  assert.equal(commitIdFromYoramPayload(payload), "a92847dc20bf80c878a8017b4c2cec36b7d9eaac");
  assert.equal(commitCommentIdFromPayload(payload, "Differential sweep commit comment run-42"), 11);
  assert.equal(commitCommentIdFromPayload(payload, "missing"), null);
});

test("R14 covers both CommentApp templates without claiming the SVN deletion route", () => {
  const scenario = scenarios.find(({ id }) => id === "R14-commit-comment-lifecycle");
  const inventory = JSON.parse(
    readFileSync(new URL("../../docs/provenance/behavior-inventory.json", import.meta.url), "utf8"),
  );
  assert.deepEqual(matchBehaviors(scenario, inventory.behaviors), ["B-0014", "B-0015"]);
  assert.deepEqual(
    scenario.actions
      .filter(({ action }) => action === "delete-commit-comment")
      .map(({ behaviorId }) => behaviorId),
    ["B-0014", "B-0015"],
  );
  const ranged = scenario.actions.find(({ params }) => params.path);
  const legacy = MERGED_DEFINITIONS["comment-commit"].translateLegacy(ranged, {
    commitId: "abc1234567890",
    body: "range",
  });
  const yoram = MERGED_DEFINITIONS["comment-commit"].translateYoram(ranged, {
    commitId: "abc1234567890",
    body: "range",
  });
  assert.deepEqual(legacy.form, {
    contents: "range",
    path: "src/ui.rs",
    startSide: "B",
    endSide: "B",
    startLine: 1,
    endLine: 1,
    startColumn: 0,
    endColumn: 0,
  });
  assert.deepEqual(yoram.json, {
    contentsMarkdown: "range",
    attachmentIds: [],
    path: "src/ui.rs",
    startLine: 1,
    endLine: 1,
  });
});

test("commit comment mutation uses canonical IDs and verifies the created legacy comment", async () => {
  const requests = [];
  const state = {};
  await MERGED_DEFINITIONS["comment-commit"].handler({
    step: {
      action: "comment-commit",
      params: { owner: "admin", project: "sample", commitId: "HEAD" },
    },
    state,
    suffix: "run-42",
    entry: { errors: [], violations: [] },
    helpers: {
      async requestBoth(_ctx, legacy, yoram) {
        requests.push({ legacy, yoram });
        return {
          legacyResult: { status: 200, location: "#comment-9" },
          yoramResult: {
            status: 200,
            json: {
              threads: [
                {
                  comments: [
                    { id: 11, contentsMarkdown: "Differential sweep commit comment run-42" },
                  ],
                },
              ],
            },
          },
        };
      },
    },
    legacySession: {
      async request(request) {
        requests.push(request);
        if (request.path.endsWith("/HEAD")) {
          return { status: 200, body: `<strong class="commitId">@abc1234567890</strong>` };
        }
        return {
          status: 200,
          body: `<li id="comment-9"><button data-request-uri="/comments/review_comment/9"></button> Differential sweep commit comment run-42</li>`,
        };
      },
    },
    yoramSession: {
      async request(request) {
        requests.push(request);
        return {
          status: 200,
          json: { commit: { commitId: "def4567890123" } },
        };
      },
    },
  });
  assert.equal(state.commitCommentIdLegacy, 9);
  assert.equal(state.commitIdLegacy, "abc1234567890");
  assert.equal(state.commitCommentIdYoram, 11);
  assert.equal(state.commitIdYoram, "def4567890123");
  assert.equal(requests[0].path, "/admin/sample/commit/HEAD");
  assert.equal(requests[1].path, "/api/v1/projects/admin/sample/commit/HEAD");
  assert.equal(requests[2].legacy.path, "/admin/sample/commit/abc1234567890/comments");
  assert.equal(
    requests[2].yoram.path,
    "/api/v1/projects/admin/sample/commit/def4567890123/comments",
  );
  assert.equal(requests[3].path, "/admin/sample/commit/abc1234567890");
});

test("comment deletion waits for pointer readiness and requires visible and persisted removal", async () => {
  const marker = "Differential sweep commit comment run-42";
  const definition = MERGED_DEFINITIONS["delete-commit-comment"];
  for (const failure of [null, "blocked", "persisted", "navigation", "visible"]) {
    const state = {
      commitCommentIdLegacy: 9,
      commitCommentIdYoram: 11,
      commitIdLegacy: "abc1234567890",
      commitIdYoram: "def4567890123",
      commitCommentBody: marker,
    };
    const entry = { errors: [], violations: [] };
    const page = (side, id, commitId) => {
      let url;
      let deleted = false;
      let confirmationOpen = false;
      let pointerReady = false;
      return {
        on() {},
        off() {},
        async bringToFront() {},
        async goto(nextUrl) {
          url = nextUrl;
        },
        url() {
          return side === "yoram" && failure === "navigation" && deleted
            ? "http://localhost/user/login"
            : url;
        },
        async waitForFunction(predicate, _options, commentId, body) {
          if (commentId === "#comment-delete-confirm") {
            assert.ok(confirmationOpen);
            const modal = { parentElement: null, getAnimations: () => animations };
            const button = {
              parentElement: modal,
              disabled: false,
              getAnimations: () => [],
              getBoundingClientRect: () => rect,
              contains: (node) => node === label,
            };
            const label = {};
            let animations = [{ playState: "running", pending: false }];
            let rect = { x: 840.75, y: -81.296875, width: 38.125, height: 30 };
            let hit = null;
            const document = {
              visibilityState: "visible",
              querySelector: () => button,
              elementFromPoint: () => hit,
            };
            const ready = () =>
              runInNewContext(`(${predicate})(${JSON.stringify(commentId)})`, {
                document,
                innerWidth: 1366,
                innerHeight: 900,
              });
            assert.equal(ready(), false, "offscreen confirmation must not be clicked");
            rect = { ...rect, y: 100 };
            hit = label;
            assert.equal(ready(), false, "onscreen modal must finish transitioning");
            animations = [{ playState: "idle", pending: true }];
            assert.equal(ready(), false, "pending transition must finish");
            animations = [];
            hit = {};
            assert.equal(ready(), false, "an overlay must prevent confirmation");
            if (failure === "blocked") throw new Error("confirmation remains blocked");
            hit = label;
            button.disabled = true;
            assert.equal(ready(), false, "disabled confirmation must not be clicked");
            button.disabled = false;
            pointerReady = ready();
            assert.equal(pointerReady, true, "settled button child receives pointer input");
            return;
          }
          const present = !deleted || (side === "yoram" && failure === "visible");
          const document = {
            querySelector(selector) {
              if (selector === ".commitId") return {};
              return present && selector === `#comment-${id}` ? { textContent: marker } : null;
            },
            body: { innerText: present ? marker : "" },
          };
          assert.ok(
            runInNewContext(`(${predicate})(${commentId}, ${JSON.stringify(body)})`, { document }),
            "deleted comment remains visible",
          );
        },
        async click(selector) {
          if (selector !== "#comment-delete-confirm") {
            confirmationOpen = true;
            return;
          }
          assert.ok(pointerReady, "confirmation must be pointer-ready before native click");
          deleted = true;
        },
        async waitForSelector() {},
        async evaluate() {
          return { buttonIsCenterTarget: false };
        },
        async waitForResponse(predicate) {
          const response = {
            request: () => ({ method: () => "DELETE" }),
            url: () =>
              side === "legacy"
                ? `http://localhost/comments/review_comment/${id}`
                : `http://localhost/api/v1/projects/admin/sample/commit/${commitId}/comments/${id}`,
            status: () => 200,
          };
          assert.ok(predicate(response));
          assert.equal(
            predicate({
              ...response,
              request: () => ({ method: () => "GET" }),
            }),
            false,
            "a read response must not count as deletion",
          );
          assert.equal(
            predicate({
              ...response,
              url: () => `${response.url()}-other`,
            }),
            false,
            "another comment's deletion must not count",
          );
          return response;
        },
      };
    };
    const ctx = {
      step: {
        action: "delete-commit-comment",
        behaviorId: "B-0015",
        params: { owner: "admin", project: "sample", ranged: true },
      },
      state,
      entry,
      suffix: "run-42",
      options: { legacyUrl: "http://localhost" },
      yoramBaseUrl: "http://localhost",
      helpers: { async setCookiesFromHeader() {} },
      legacyPage: page("legacy", 9, state.commitIdLegacy),
      yoramPage: page("yoram", 11, state.commitIdYoram),
      legacySession: {
        async request() {
          return { status: 200, body: '<strong class="commitId">@abc1234567890</strong>' };
        },
      },
      yoramSession: {
        async request() {
          return {
            status: 200,
            json: {
              commit: { commitId: "def4567890123" },
              threads:
                failure === "persisted"
                  ? [{ comments: [{ id: 11, contentsMarkdown: marker }] }]
                  : [],
            },
          };
        },
      },
    };
    if (failure) {
      await assert.rejects(
        definition.handler(ctx),
        /blocked|persisted|commit view|remains visible/,
      );
      assert.equal(
        state.commitCommentBody,
        marker,
        "failed deletion must not erase its resource identity",
      );
    } else {
      await definition.handler(ctx);
      assert.equal(state.commitCommentBody, null);
      assert.deepEqual(
        entry.commentDeletions.map(({ side, behaviorId, absentFromState, absentFromPage }) => ({
          side,
          behaviorId,
          absentFromState,
          absentFromPage,
        })),
        [
          { side: "legacy", behaviorId: "B-0015", absentFromState: true, absentFromPage: true },
          { side: "yoram", behaviorId: "B-0015", absentFromState: true, absentFromPage: true },
        ],
      );
    }
  }
});

test("translators produce expected method/path literals", () => {
  const step = (action, params) => ({ action, params });
  const domCases = [
    ["list-pullrequests", { owner: "admin", project: "sample" }, "/admin/sample/pullRequests"],
    [
      "list-closed-pullrequests",
      { owner: "admin", project: "sample" },
      "/admin/sample/closedPullRequests",
    ],
    [
      "list-sent-pullrequests",
      { owner: "admin", project: "sample" },
      "/admin/sample/sentPullRequests",
    ],
    [
      "new-pullrequest-form",
      { owner: "admin", project: "sample" },
      "/admin/sample/newPullRequestForm",
    ],
    [
      "merge-result",
      { owner: "admin", project: "sample" },
      "/admin/sample/newPullRequest/mergeResult",
    ],
    [
      "view-pullrequest",
      { owner: "admin", project: "sample", prId: 1 },
      "/admin/sample/pullRequest/1",
    ],
    [
      "view-pullrequest-changes",
      { owner: "admin", project: "sample", prId: 3 },
      "/admin/sample/pullRequest/3/changes",
    ],
    [
      "view-specific-change",
      { owner: "admin", project: "sample", prId: 3, commitId: "abc123" },
      "/admin/sample/pullRequest/3/changes/abc123",
    ],
    [
      "view-pullrequest-editform",
      { owner: "admin", project: "sample", prId: 4 },
      "/admin/sample/pullRequest/4/editform",
    ],
    ["list-commits", { owner: "admin", project: "sample" }, "/admin/sample/commits"],
    [
      "list-commits-branch",
      { owner: "admin", project: "sample", branch: "main" },
      "/admin/sample/commits/main/",
    ],
    [
      "list-commits-path",
      { owner: "admin", project: "sample", branch: "main", path: "README.md" },
      "/admin/sample/commits/main/README.md",
    ],
    [
      "view-commit",
      { owner: "admin", project: "sample", commitId: "def456" },
      "/admin/sample/commit/def456",
    ],
    ["browse-code", { owner: "admin", project: "sample" }, "/admin/sample/code"],
    [
      "browse-code-branch",
      { owner: "admin", project: "sample", branch: "main" },
      "/admin/sample/code/main",
    ],
    [
      "browse-code-tree-entry",
      { owner: "admin", project: "sample", branch: "main", path: "README.md" },
      "/admin/sample/code/main/README.md",
    ],
    [
      "browse-code-ajax-root",
      { owner: "admin", project: "sample", branch: "main" },
      "/admin/sample/code/main/!",
    ],
    [
      "browse-code-ajax-slash",
      { owner: "admin", project: "sample", branch: "main" },
      "/admin/sample/code/main/!/",
    ],
    [
      "browse-code-ajax-path",
      { owner: "admin", project: "sample", branch: "main", path: "app.js" },
      "/admin/sample/code/main/!/app.js",
    ],
    ["list-branches", { owner: "admin", project: "sample" }, "/admin/sample/branches"],
    // R10–R12 read extensions
    [
      "code-compare",
      { owner: "admin", project: "sample", revA: "main", revB: "feature/ui" },
      "/admin/sample/compare/main..feature%2Fui",
    ],
    ["view-newfork-page", { owner: "admin", project: "sample" }, "/admin/sample/newFork"],
    ["list-reviews", { owner: "admin", project: "sample" }, "/admin/sample/reviews"],
    ["browse-code-ajax-nobranch", { owner: "admin", project: "sample" }, "/admin/sample/code/!"],
    [
      "browse-code-ajax-nobranch-slash",
      { owner: "admin", project: "sample" },
      "/admin/sample/code/!/",
    ],
    [
      "browse-code-ajax-nobranch-path",
      { owner: "admin", project: "sample", path: "app.js" },
      "/admin/sample/code/!/app.js",
    ],
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
    [
      "view-code-file",
      { owner: "admin", project: "sample", rev: "main", path: "README.md" },
      "/admin/sample/files/main/README.md",
    ],
    [
      "fetch-raw-file",
      { owner: "admin", project: "sample", rev: "main", path: "README.md" },
      "/admin/sample/rawcode/main/README.md",
    ],
    [
      "fetch-image-file",
      { owner: "admin", project: "sample", rev: "main", path: "README.md" },
      "/admin/sample/image/main/README.md",
    ],
    [
      "download-code-archive",
      { owner: "admin", project: "sample", branch: "main" },
      "/admin/sample/code/main/download",
    ],
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
  assert.equal(pullRequestNumberFromPayload({ result: { pullRequestNumber: 14, id: 903 } }), 14);
  assert.equal(
    pullRequestNumberFromPayload({ result: { pullRequest: { number: 15, id: 904 } } }),
    15,
  );
  assert.equal(pullRequestNumberFromPayload({ result: { result: { number: 16, id: 905 } } }), 16);
  assert.equal(pullRequestNumberFromPayload({ number: 14, title: "seeded", id: 903 }, "new"), null);
  assert.equal(pullRequestNumberFromPayload({ id: 903 }), null);
  assert.equal(pullRequestNumberFromPayload({ pullRequestNumber: 14 }, "new"), null);
  assert.equal(pullRequestNumberFromPayload({ pullRequestNumber: 1.5 }), null);
  const calls = [];
  const number = await resolveYoramPullRequestNumber(
    {
      step: { params: { owner: "admin", project: "sample" } },
      helpers: {
        async sendRaw(_ctx, side, request) {
          calls.push({ side, request });
          return {
            status: 200,
            json: { items: [{ title: "Differential sweep PR test", id: 904, number: 17 }] },
          };
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

test("review mutations never fall back to a seeded PR after one-sided creation failure", async () => {
  for (const action of ["review-pullrequest", "unreview-pullrequest"]) {
    await assert.rejects(
      actionDefinitions[action].handler({
        step: { action, params: { owner: "admin", project: "sample", prId: 1 } },
        state: { prIdLegacy: 3, prNumberLegacy: 2, prTitle: "new", prState: "open" },
        helpers: {
          async requestBoth() {
            assert.fail("must not mutate a seeded PR");
          },
        },
      }),
      /no pull request created on both sides/u,
    );
  }
});

test("successful mutation responses do not substitute for persisted lifecycle state", async () => {
  let persistedState = "open";
  const ctx = {
    step: { action: "close-pullrequest", params: { owner: "admin", project: "sample" } },
    state: {
      prIdLegacy: 17,
      prNumberLegacy: 7,
      prNumberYoram: 8,
      prTitle: "created",
      prState: "open",
    },
    entry: { errors: [], violations: [], behaviorIds: [] },
    helpers: {
      async requestBoth() {
        return { legacyResult: { status: 303 }, yoramResult: { status: 200 } };
      },
      async resolveLegacyPullRequest() {
        return { id: 17, number: 7, state: "closed", currentCommitId: "abc123" };
      },
      async sendRaw() {
        return {
          status: 200,
          json: { pullRequestNumber: 8, title: "created", state: persistedState },
        };
      },
    },
  };
  await assert.rejects(actionDefinitions["close-pullrequest"].handler(ctx), /persisted state/u);
  assert.equal(ctx.state.prState, "open");
  persistedState = "closed";
  await actionDefinitions["close-pullrequest"].handler(ctx);
  assert.equal(ctx.state.prState, "closed");
  await assert.rejects(
    actionDefinitions["close-pullrequest"].handler(ctx),
    /expected open pull request/u,
  );
});

test("creation rejects duplicate detail and requires the created PR to persist before rendering", async () => {
  let target;
  const suffix = "focused";
  const detail = {
    title: `Differential sweep PR ${suffix}`,
    bodyMarkdown: `Differential sweep PR body ${suffix}`,
    pullRequestNumber: 8,
    state: "open",
    reviewed: true,
    reviewers: [],
    isMerging: false,
    commits: [{ commitId: "abc1234567890" }],
  };
  let created = { ...detail, title: "seeded duplicate" };
  let persisted = { ...detail, bodyMarkdown: "old body" };
  const ctx = {
    step: {
      action: "create-pullrequest",
      params: {
        owner: "admin",
        project: "sample",
        fromBranch: "feature/ui",
        toBranch: "main",
      },
    },
    suffix,
    state: {},
    entry: { errors: [], violations: [], behaviorIds: ["B-pr-create"] },
    options: { legacyUrl: "http://legacy.test" },
    yoramBaseUrl: "http://yoram.test",
    legacySession: {
      async request(request) {
        assert.equal(request.path, "/admin/sample/newPullRequestForm");
        return {
          status: 200,
          body: '<option value="1">admin / sample</option>',
        };
      },
    },
    yoramSession: {
      async request(request) {
        assert.equal(
          request.path,
          "/api/v1/owners/admin/projects/sample/pull-requests/form-options",
        );
        return { status: 200, json: { toProjects: [{ id: 2, projectName: "sample" }] } };
      },
    },
    helpers: {
      async requestBoth() {
        return {
          legacyResult: { status: 201, location: "/admin/sample/pullRequest/7" },
          yoramResult: {
            status: 201,
            json: created,
          },
        };
      },
      async resolveLegacyPullRequest() {
        return { ...detail, reviewed: false, id: 17, number: 7, currentCommitId: "abc1234567890" };
      },
      async sendRaw() {
        return { status: 200, json: persisted };
      },
      async renderDomTarget(_ctx, domTarget) {
        target = domTarget;
      },
    },
  };
  await assert.rejects(actionDefinitions["create-pullrequest"].handler(ctx), /did not create/u);
  assert.equal(target, undefined);
  created = detail;
  await assert.rejects(
    actionDefinitions["create-pullrequest"].handler(ctx),
    /persisted bodyMarkdown/u,
  );
  assert.equal(target, undefined);
  persisted = detail;
  await actionDefinitions["create-pullrequest"].handler(ctx);
  assert.deepEqual(
    {
      legacySelector: target.legacySelector,
      yoramSelector: target.yoramSelector,
      spa: target.spa,
    },
    { ...PULL_REQUEST_DETAIL_DOM_SELECTORS, spa: true },
  );
  assert.equal(target.currentToken, `Differential sweep PR ${suffix}`);
});

test("pull request route-body loss remains UNVERIFIED", () => {
  const detail = {
    actual: {
      fullDiffs: [
        { side: "legacy-only", expected: "button.pull-request-detail-watch:watch" },
        { side: "yoram-only", expected: "div#react-root:" },
      ],
    },
  };
  assert.equal(domVisibleLoss(detail), true);
  assert.equal(
    classifyViolation("dom", "/admin/sample/pullRequest/7", detail).classification,
    "UNVERIFIED",
  );
});

test("mutation translators produce expected method/path/body shapes", () => {
  const step = (action, params) => ({ action, params });
  const def = (action) => MERGED_DEFINITIONS[action];
  const base = { owner: "admin", project: "sample" };

  const createLegacy = def("create-pullrequest").translateLegacy(step("create-pullrequest", base), {
    title: "T",
    body: "B",
    fromProjectId: "1",
    fromBranch: "main",
    toProjectId: "1",
    toBranch: "feature/ui",
  });
  assert.equal(createLegacy.method, "POST");
  assert.equal(createLegacy.path, "/admin/sample/pullRequests");
  assert.deepEqual(createLegacy.form, {
    title: "T",
    body: "B",
    fromProjectId: "1",
    fromBranch: "main",
    toProjectId: "1",
    toBranch: "feature/ui",
  });
  const createYoram = def("create-pullrequest").translateYoram(step("create-pullrequest", base), {
    title: "T",
    body: "B",
    fromProjectId: "2",
    fromBranch: "main",
    toProjectId: "2",
    toBranch: "feature/ui",
  });
  assert.equal(createYoram.path, "/api/v1/owners/admin/projects/sample/pull-requests");
  assert.deepEqual(createYoram.json, {
    title: "T",
    bodyMarkdown: "B",
    fromProjectId: 2,
    fromBranch: "main",
    toProjectId: 2,
    toBranch: "feature/ui",
    attachmentIds: [],
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
    def("comment-pullrequest").translateLegacy(step("comment-pullrequest", base), {
      prId: 5,
      commitId: "abc123",
    }).path,
    "/admin/sample/pullRequest/5/comments?commitId=abc123",
  );
  assert.equal(
    def("comment-pullrequest").translateYoram(step("comment-pullrequest", base), { prId: 5 }).path,
    "/api/v1/owners/admin/projects/sample/pull-requests/5/comments",
  );
  for (const [action, tail] of [
    ["close-pullrequest", "close"],
    ["open-pullrequest", "open"],
    ["accept-pullrequest", "accept"],
  ]) {
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
    assert.equal(
      def(action).translateLegacy(step(action, base), { prId: 1 }).path,
      `/admin/sample/pullRequest/1/${tail}`,
    );
    assert.equal(
      def(action).translateYoram(step(action, base), { prId: 1 }).path,
      `/api/v1/owners/admin/projects/sample/pull-requests/1/${tail}`,
    );
  }
  assert.equal(
    def("comment-commit").translateLegacy(step("comment-commit", base), { commitId: "HEAD" }).path,
    "/admin/sample/commit/HEAD/comments",
  );
  assert.equal(
    def("comment-commit").translateYoram(step("comment-commit", base), { commitId: "HEAD" }).path,
    "/api/v1/projects/admin/sample/commit/HEAD/comments",
  );
  assert.deepEqual(
    def("delete-commit-comment").translateLegacy(step("delete-commit-comment", base), {
      commitId: "HEAD",
      commentId: 9,
    }),
    { method: "DELETE", path: "/comments/review_comment/9" },
  );
  assert.equal(
    def("delete-commit-comment").translateYoram(step("delete-commit-comment", base), {
      commitId: "HEAD",
      commentId: 9,
    }).path,
    "/api/v1/projects/admin/sample/commit/HEAD/comments/9",
  );
  assert.equal(
    def("set-default-branch").translateLegacy(
      step("set-default-branch", { ...base, branch: "feature/ui" }),
      {},
    ).path,
    "/admin/sample/code/refs%2Fheads%2Ffeature%2Fui/setAsDefault",
  );
  const defaultBranchYoram = def("set-default-branch").translateYoram(
    step("set-default-branch", { ...base, branch: "feature/ui" }),
    {},
  );
  assert.equal(defaultBranchYoram.path, "/api/v1/projects/admin/sample/branches/default");
  assert.deepEqual(defaultBranchYoram.json, { branchName: "feature/ui" });
});

test("PR comments require a settled commit and persisted content on both created requests", async () => {
  const calls = [];
  let hasComment = false;
  const ctx = {
    step: { action: "comment-pullrequest", params: { owner: "admin", project: "sample" } },
    state: {
      prIdLegacy: 801,
      prNumberLegacy: 42,
      prNumberYoram: 84,
      prCommitLegacy: "abc123",
      prState: "open",
      prTitle: "created",
    },
    suffix: "contract",
    entry: { errors: [], violations: [], behaviorIds: [] },
    helpers: {
      async resolveLegacyPullRequest() {
        return { id: 801, number: 42, currentCommitId: "abc123", state: "open" };
      },
      async sendRaw(_ctx, side) {
        if (side === "legacy")
          return { status: 200, body: "Differential sweep PR comment contract" };
        return {
          status: 200,
          json: {
            pullRequestNumber: 84,
            state: "open",
            title: "created",
            threads: hasComment
              ? [{ comments: [{ contentsMarkdown: "Differential sweep PR comment contract" }] }]
              : [],
          },
        };
      },
      async requestBoth(_ctx, legacy, yoram) {
        calls.push({ legacy, yoram });
        return { legacyResult: { status: 303 }, yoramResult: { status: 200 } };
      },
    },
  };
  await assert.rejects(actionDefinitions["comment-pullrequest"].handler(ctx), /not persisted/u);
  hasComment = true;
  await actionDefinitions["comment-pullrequest"].handler(ctx);
  assert.match(calls[0].legacy.path, /\/pullRequest\/801\/comments\?commitId=abc123$/u);
  assert.match(calls[0].yoram.path, /\/pull-requests\/84\/comments$/u);
  ctx.state.prCommitLegacy = null;
  await assert.rejects(actionDefinitions["comment-pullrequest"].handler(ctx), /settled commit/u);
  assert.equal(calls.length, 2);
});
test("R1–R12 scenarios stay read-only GET; R13–R16 carry the mutations", () => {
  const MUTATIONS = new Set([
    "create-pullrequest",
    "edit-pullrequest",
    "comment-pullrequest",
    "close-pullrequest",
    "open-pullrequest",
    "accept-pullrequest",
    "review-pullrequest",
    "unreview-pullrequest",
    "comment-commit",
    "delete-commit-comment",
    "set-default-branch",
  ]);
  for (const scenario of scenarios) {
    const isMutationScenario = /^R1[3-6]-/.test(scenario.id);
    for (const stepAction of scenario.actions.map((a) => a.action)) {
      if (stepAction === "login") continue;
      const probe = {
        action: stepAction,
        params: {
          owner: "o",
          project: "p",
          prId: 1,
          commitId: "c",
          branch: "b",
          path: "x",
          rev: "r",
          revA: "a",
          revB: "b",
        },
      };
      const method = MERGED_DEFINITIONS[stepAction].translateLegacy(probe, {
        prId: 1,
        commitId: "c",
        commentId: 2,
      }).method;
      if (!isMutationScenario) {
        assert.equal(method, "GET", `${scenario.id}: ${stepAction} must be GET`);
      } else if (MUTATIONS.has(stepAction)) {
        assert.notEqual(method, "GET", `${scenario.id}: ${stepAction} must mutate`);
      }
    }
  }
});
