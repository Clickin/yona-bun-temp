import { strict as assert } from "node:assert";
import { spawnSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import test from "node:test";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  alignParityLabelSeeds,
  alignParityBoardFixtures,
  allocateLoopbackPort,
  assertLoopbackPortAvailable,
  PARITY_POST_COMMENT,
  PARITY_LABEL_SEEDS,
  executeStep,
  buildLegacySequenceReconciliationSql,
  LEGACY_MODEL_SEQUENCE_TABLES,
  LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL,
  legacyH2Url,
  parseArgs,
  selectScenarios,
  PARITY_PULL_REQUEST,
  PARITY_REVIEW,
  registrationStatusIsUsable,
  runtimeVerifiedBehaviorIds,
  waitForYoramProcess,
  renderSkeleton,
  ROUTE_CONTENT_READY,
  PULL_REQUEST_DETAIL_SETTLED,
  stepHelpers,
  SKELETON_EXTRACT,
  ensureDiffableRepoBranches,
} from "./run.mjs";
import { parityProjectSeed } from "../run-dev-backend-once.mjs";
import { diffSkeletons, domVisibleLoss } from "./diff.mjs";
import { HarnessError, classifyViolation, summarizeExecution } from "./report.mjs";
import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { buildBehaviorVerification, validateScenarios } from "./dsl.mjs";

test("differential runner keeps all scenarios by default", () => {
  const options = parseArgs([]);
  const selected = selectScenarios(options.scenarioIds);
  assert.equal(options.scenarioIds.length, 0);
  assert.equal(selected.length, 117);
});

test("differential runner accepts repeated and comma-separated scenario IDs", () => {
  const options = parseArgs(["--scenario", "S1-login", "--scenarios", "I1-issue-detail,R1-pr-lists,P1-issue-labels"]);
  assert.deepEqual(options.scenarioIds, ["S1-login", "I1-issue-detail", "R1-pr-lists", "P1-issue-labels"]);
  assert.deepEqual(selectScenarios(options.scenarioIds).map(({ id }) => id), ["I1-issue-detail", "P1-issue-labels", "R1-pr-lists", "S1-login"]);
});

test("differential runner rejects unknown scenario IDs", () => {
  assert.throws(() => selectScenarios(["does-not-exist"]), /unknown scenario id/u);
});

function listenOnLoopback() {
  return new Promise((resolvePromise, rejectPromise) => {
    const server = createServer();
    server.once("error", rejectPromise);
    server.listen(0, "127.0.0.1", () => resolvePromise(server));
  });
}

test("default Yoram port allocation avoids an unrelated loopback server", async () => {
  const unrelatedServer = await listenOnLoopback();
  try {
    const occupiedPort = unrelatedServer.address().port;
    const allocatedPort = await allocateLoopbackPort();
    assert.notEqual(allocatedPort, occupiedPort);
    await assert.doesNotReject(assertLoopbackPortAvailable(allocatedPort));
  } finally {
    await new Promise((resolvePromise) => unrelatedServer.close(resolvePromise));
  }
});

test("explicit occupied Yoram port fails before a child can start", async () => {
  const unrelatedServer = await listenOnLoopback();
  try {
    const occupiedPort = unrelatedServer.address().port;
    await assert.rejects(
      assertLoopbackPortAvailable(occupiedPort),
      /Yoram loopback port \d+ is already in use; stop the existing server or omit --yoram-port/u,
    );
  } finally {
    await new Promise((resolvePromise) => unrelatedServer.close(resolvePromise));
  }
});

test("parity PR fixture preserves run-dev seed contract and stable review seed", () => {
  assert.deepEqual(PARITY_PULL_REQUEST, {
    body: "",
    // R13's create-pullrequest opens main -> feature/ui (the direction the
    // restore/accept lifecycle scenarios and the deterministic seed use).
    fromBranch: "main",
    number: 1,
    state: 1,
    title: "Add feature branch change",
    toBranch: "feature/ui",
  });
  assert.deepEqual(PARITY_REVIEW, {
    contents: "Review the feature branch parity fixture.",
    path: "src/ui.rs",
  });
});

test("Yoram bootstrap provisions the parity foundation before PR reconciliation", () => {
  const source = readFileSync(new URL("./run.mjs", import.meta.url), "utf8");
  const bootSource = source.slice(source.indexOf("async function bootYoram"));
  const portPreflight = bootSource.indexOf("await assertLoopbackPortAvailable(port)");
  const foundationCheck = bootSource.indexOf("const needsParityFoundation");
  const pilotProvision = bootSource.indexOf("await provisionYoramParityAccounts");
  const canonicalAlign = bootSource.indexOf("reconcileYoramFixturesPreboot(databasePath)");
  const defaultSeed = bootSource.indexOf("seedModule.reconcileDefaultDevParitySeed");
  const repositoryAlign = bootSource.indexOf("ensureDiffableRepoBranches(repo)");
  const prReconciliation = bootSource.indexOf("reconcileYoramPullRequestFixtures(databasePath)");
  const childReadiness = bootSource.indexOf("await waitForYoramProcess");
  const childStart = bootSource.indexOf("startYoramProcess(port)");
  const httpReadiness = bootSource.indexOf("await waitForHttp");

  assert.ok(portPreflight >= 0);
  assert.ok(portPreflight < childStart);
  assert.ok(foundationCheck >= 0);
  assert.ok(pilotProvision > foundationCheck);
  assert.ok(canonicalAlign > pilotProvision);
  assert.ok(defaultSeed > canonicalAlign);
  assert.ok(repositoryAlign > defaultSeed);
  assert.ok(prReconciliation > repositoryAlign);
  assert.ok(childReadiness > childStart);
  assert.ok(httpReadiness > childReadiness);
});

test("Yoram readiness rejects a dead child even when an HTTP server is available", async () => {
  const child = { exitCode: 1, signalCode: null };
  await assert.rejects(
    waitForYoramProcess(child, 31_001, 0, 1),
    /Yoram process exited before listening on 127\.0\.0\.1:31001/u,
  );
});

test("parity repository alignment mirrors canonical trees and commit messages", () => {
  const root = mkdtempSync(path.join(tmpdir(), "yona-parity-repo-"));
  const repoPath = path.join(root, "sample.git");
  const runGit = (args) => {
    const result = spawnSync("git", ["--git-dir", repoPath, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  const runGitRaw = (args) => {
    const result = spawnSync("git", ["--git-dir", repoPath, ...args], { encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout;
  };
  try {
    const init = spawnSync("git", ["init", "--bare", repoPath], { encoding: "utf8" });
    assert.equal(init.status, 0, init.stderr);
    ensureDiffableRepoBranches(repoPath);
    const seed = parityProjectSeed.repositories.find(
      (repository) => repository.owner === "admin" && repository.projectName === "sample",
    );
    assert.ok(seed);
    const main = seed.branches.find((branch) => branch.name === "main");
    const feature = seed.branches.find((branch) => branch.name === "feature/ui");
    assert.ok(main);
    assert.ok(feature);
    const featureFiles = { ...main.files, ...feature.files };
    assert.deepEqual(runGit(["ls-tree", "-r", "--name-only", "main"]).split("\n"), Object.keys(main.files).sort());
    assert.deepEqual(
      runGit(["ls-tree", "-r", "--name-only", "feature/ui"]).split("\n"),
      Object.keys(featureFiles).sort(),
    );
    for (const [branch, files] of [["main", main.files], ["feature/ui", featureFiles]]) {
      for (const [filePath, contents] of Object.entries(files)) {
        assert.equal(runGitRaw(["show", `${branch}:${filePath}`]), contents);
      }
    }
    assert.equal(runGit(["show", "-s", "--format=%s", "main"]), main.message);
    assert.equal(runGit(["show", "-s", "--format=%s", "feature/ui"]), feature.message);
    assert.notEqual(runGit(["rev-parse", "main"]), runGit(["rev-parse", "feature/ui"]));
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

function skeletonElement(
  tagName,
  { id = "", className = "", text = "", children = [], attrs = {}, rendered = true } = {},
) {
  const attributes = new Map(Object.entries({ ...attrs, ...(id ? { id } : {}) }));
  return {
    tagName: tagName.toUpperCase(),
    className,
    childNodes: text ? [{ nodeType: 3, textContent: text }] : [],
    children,
    getAttribute(name) {
      return attributes.get(name) ?? null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    getClientRects() {
      return rendered ? [{}] : [];
    },
  };
}

function extractTestSkeleton(root, selector) {
  const previousDocument = globalThis.document;
  globalThis.document = {
    body: root,
    querySelector: () => root,
  };
  try {
    return SKELETON_EXTRACT(selector);
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
}

test("skeleton extraction distinguishes navigation from side-effect anchors", () => {
  const body = skeletonElement("body", {
    children: [
      skeletonElement("a", { text: "Open", attrs: { href: "/issue/1", "data-toggle": "tooltip" } }),
      skeletonElement("a", { text: "Delete", attrs: { href: "/issue/1", "data-request-method": "delete" } }),
      skeletonElement("a", { text: "Update", attrs: { href: "/issue/1", "data-request-uri": "/issue/1/update" } }),
      skeletonElement("a", { text: "Expand", attrs: { href: "#details" } }),
    ],
  });
  assert.deepEqual(extractTestSkeleton(body), ["a:Open", "a#:Delete", "a#:Update", "a#:Expand"]);
});

test("route capture excludes only an unrendered closed confirmation shell", () => {
  const closed = skeletonElement("div", {
    id: "yobiDialog",
    className: "modal hide yobiDialog",
    attrs: { "aria-hidden": "true" },
    rendered: false,
    children: [skeletonElement("button", { text: "Confirm" })],
  });
  assert.deepEqual(extractTestSkeleton(closed), []);
  assert.deepEqual(extractTestSkeleton(closed, "#yobiDialog"), [
    "div.modal.hide.yobiDialog:",
    "button:Confirm",
  ]);
  for (const [hidden, rendered] of [["false", true], ["true", true], ["false", false]]) {
    const visible = skeletonElement("div", {
      id: "yobiDialog",
      className: "modal yobiDialog",
      attrs: { "aria-hidden": hidden },
      rendered,
      children: [skeletonElement("button", { text: "Delete" })],
    });
    assert.deepEqual(extractTestSkeleton(visible), [
      "div.modal.yobiDialog:",
      "button:Delete",
    ]);
  }
});

test("generic skeleton extraction excludes only the exact global shell IDs", () => {
  const sidebar = skeletonElement("div", {
    id: "mySidenav",
    className: "excluded-sidenav",
    text: "Sidebar must be shell-owned",
    children: [skeletonElement("button", { className: "excluded-control", text: "Hidden control" })],
  });
  const dialog = skeletonElement("div", {
    id: "loginDialog",
    className: "excluded-dialog",
    text: "Dialog must be shell-owned",
    children: [skeletonElement("input", { className: "excluded-input" })],
  });
  const body = skeletonElement("body", {
    children: [
      skeletonElement("header", { className: "gnb-outer", text: "Navbar" }),
      sidebar,
      dialog,
      skeletonElement("main", {
        className: "route-body",
        text: "Route content",
        children: [skeletonElement("button", { className: "route-action", text: "Save" })],
      }),
      skeletonElement("div", {
        id: "mySidenav-copy",
        className: "kept-sidenav-copy",
        text: "Near-match sidebar stays in route content",
      }),
      skeletonElement("div", {
        id: "loginDialogExtra",
        className: "kept-dialog-copy",
        text: "Near-match dialog stays in route content",
      }),
      skeletonElement("footer", { className: "page-footer", text: "Footer" }),
    ],
  });

  const skeleton = extractTestSkeleton(body);
  assert.ok(skeleton.includes("header.gnb-outer:Navbar"));
  assert.ok(skeleton.includes("main.route-body:Route content"));
  assert.ok(skeleton.includes("button.route-action:Save"));
  assert.ok(skeleton.includes("footer.page-footer:Footer"));
  assert.ok(skeleton.includes("div.kept-sidenav-copy:Near-match sidebar stays in route content"));
  assert.ok(skeleton.includes("div.kept-dialog-copy:Near-match dialog stays in route content"));
  assert.equal(skeleton.some((entry) => entry.includes("excluded-sidenav")), false);
  assert.equal(skeleton.some((entry) => entry.includes("excluded-control")), false);
  assert.equal(skeleton.some((entry) => entry.includes("excluded-dialog")), false);
  assert.equal(skeleton.some((entry) => entry.includes("excluded-input")), false);

  const explicitSidebarSkeleton = extractTestSkeleton(sidebar, "#mySidenav");
  const explicitDialogSkeleton = extractTestSkeleton(dialog, "#loginDialog");
  assert.ok(explicitSidebarSkeleton.includes("div.excluded-sidenav:Sidebar must be shell-owned"));
  assert.ok(explicitSidebarSkeleton.includes("button.excluded-control:Hidden control"));
  assert.ok(explicitDialogSkeleton.includes("div.excluded-dialog:Dialog must be shell-owned"));
  assert.ok(explicitDialogSkeleton.includes("input.excluded-input:"));
});

test("generic shell exclusions do not turn route-body losses into accepted diffs", () => {
  const shell = [
    skeletonElement("header", { className: "gnb-outer", text: "Navbar" }),
    skeletonElement("div", { id: "mySidenav", className: "excluded-sidenav", text: "Sidebar" }),
    skeletonElement("div", { id: "loginDialog", className: "excluded-dialog", text: "Dialog" }),
    skeletonElement("footer", { className: "page-footer", text: "Footer" }),
  ];
  const expected = extractTestSkeleton(
    skeletonElement("body", {
      children: [
        ...shell,
        skeletonElement("main", {
          className: "route-body",
          children: [skeletonElement("button", { className: "route-action", text: "Save" })],
        }),
      ],
    }),
  );
  const actual = extractTestSkeleton(
    skeletonElement("body", {
      children: [
        ...shell,
        skeletonElement("main", { className: "route-body" }),
      ],
    }),
  );
  const firstDiffs = diffSkeletons(expected, actual);
  const detail = {
    expected: { skeletonEntries: expected.length },
    actual: { skeletonEntries: actual.length, fullDiffs: firstDiffs, firstDiffs },
  };
  assert.ok(firstDiffs.some((diff) => diff.side === "legacy-only" && diff.expected.includes("route-action")));
  assert.equal(domVisibleLoss(detail), true);
  assert.equal(classifyViolation("dom", "/admin/sample/route", detail).classification, "UNVERIFIED");
});

test("SPA skeleton rendering waits for explicit route readiness, not equal wireframes", () => {
  const renderSource = renderSkeleton.toString();
  const readinessSource = ROUTE_CONTENT_READY.toString();
  assert.match(renderSource, /waitForNetworkIdle/u);
  assert.match(renderSource, /waitForFunction/u);
  assert.doesNotMatch(renderSource, /setTimeout|previous|current ===/u);
  assert.match(readinessSource, /aria-busy/u);
  assert.match(readinessSource, /data-wireframe/u);
  assert.match(readinessSource, /page-wrap-outer/u);
  assert.match(readinessSource, /loading/u);
  assert.doesNotMatch(readinessSource, /data-content-ready/u);
});

test("anonymous DOM renders clear shared cookies before applying fresh sessions", async () => {
  const pages = [];
  const makePage = (side) => {
    const calls = [];
    const page = {
      async cookies() {
        calls.push("cookies");
        return [{ name: `old-${side}`, value: "authenticated" }];
      },
      async deleteCookie(...cookies) {
        calls.push(["deleteCookie", cookies]);
      },
      async setCookie(cookie) {
        calls.push(["setCookie", cookie]);
      },
      async goto() {},
      async evaluate() {
        return [];
      },
    };
    pages.push({ calls, page });
    return page;
  };
  const entry = { behaviorIds: [], violations: [], errors: [] };
  await stepHelpers.renderDomTarget(
    {
      step: { action: "anonymous-page" },
      suffix: "anonymous-page",
      scenarioId: "S2-login-forms",
      entry,
      options: { legacyUrl: "http://legacy.test" },
      yoramBaseUrl: "http://yoram.test",
      legacyPage: makePage("legacy"),
      yoramPage: makePage("yoram"),
      legacySession: { cookies: "OLD=legacy" },
      yoramSession: { cookies: "OLD=yoram" },
    },
    {
      legacy: "http://legacy.test/users/loginform",
      yoram: "http://yoram.test/users/loginform",
      spa: false,
      anonymous: true,
      legacySession: { cookies: "ANON=legacy" },
      yoramSession: { cookies: "ANON=yoram" },
    },
  );
  assert.deepEqual(pages.map(({ calls }) => calls), [
    [
      "cookies",
      ["deleteCookie", [{ name: "old-legacy", value: "authenticated" }]],
      ["setCookie", { name: "ANON", value: "legacy", url: "http://legacy.test" }],
    ],
    [
      "cookies",
      ["deleteCookie", [{ name: "old-yoram", value: "authenticated" }]],
      ["setCookie", { name: "ANON", value: "yoram", url: "http://yoram.test" }],
    ],
  ]);
  assert.deepEqual(entry.violations, []);
  assert.deepEqual(entry.errors, []);
});

test("R16 PR detail waits for settled state even when no commit event exists", () => {
  const renderSource = stepHelpers.renderDomTarget.toString();
  assert.match(renderSource, /ctx\.scenarioId === "R16-pr-review-points"/u);
  assert.match(renderSource, /new URL\(domTarget\.yoram\)\.pathname/u);
  assert.match(renderSource, /PULL_REQUEST_DETAIL_SETTLED/u);

  const previousDocument = globalThis.document;
  const state = { merging: true, hasComments: true };
  const root = {
    querySelector(selector) {
      if (selector === '[aria-busy="true"], [data-wireframe]') return null;
      if (selector === "#state .alert-warnning") return state.merging ? {} : null;
      if (selector === "#comments") return state.hasComments ? {} : null;
      return null;
    },
  };
  globalThis.document = {
    querySelector(selector) {
      return selector === '[data-owner="pull-request-detail-page"]' ? root : null;
    },
  };
  try {
    assert.equal(PULL_REQUEST_DETAIL_SETTLED(), false, "merge-check warning is not settled");
    state.merging = false;
    assert.equal(PULL_REQUEST_DETAIL_SETTLED(), true);
    state.hasComments = false;
    assert.equal(PULL_REQUEST_DETAIL_SETTLED(), false, "comments container is required");
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});

test("JSON route helper compares parsed normalized payloads without a DOM render", async () => {
  const entry = { behaviorIds: [], violations: [], errors: [] };
  const ctx = {
    step: { action: "json-probe" },
    entry,
    legacySession: {
      async request() {
        return { status: 200, body: '{"b":2,"a":"x"}', json: null };
      },
    },
    yoramSession: {
      async request() {
        return { status: 200, body: "", json: { a: "x", b: 2 } };
      },
    },
  };
  await stepHelpers.requestJsonBoth(ctx, { method: "GET", path: "/json" }, { method: "GET", path: "/json" });
  assert.deepEqual(entry.violations, []);
  assert.deepEqual(entry.errors, []);
});

test("fresh parity account bootstrap reuses an existing account on duplicate registration", () => {
  assert.equal(registrationStatusIsUsable(200), true);
  assert.equal(registrationStatusIsUsable(409), true);
  assert.equal(registrationStatusIsUsable(422), false);
  assert.equal(registrationStatusIsUsable(500), false);
});

test("legacy preboot cleanup removes memberships whose project row was deleted", () => {
  assert.match(LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL, /^DELETE FROM PROJECT_USER /u);
  assert.match(LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL, /NOT EXISTS/u);
  assert.match(LEGACY_ORPHAN_PROJECT_MEMBERSHIP_CLEANUP_SQL, /PROJECT\.ID = PROJECT_USER\.PROJECT_ID/u);
});

test("parity label alignment seeds canonical legacy tuples into an empty Yoram fixture", async () => {
  const requests = [];
  const responseRows = PARITY_LABEL_SEEDS.map((seed, index) => ({
    category: seed.categoryName,
    categoryId: String(index + 1),
    categoryIsExclusive: false,
    color: seed.color,
    id: String(index + 1),
    name: seed.labelName,
  }));
  const responseBody = (request) =>
    request.method === "GET"
      ? JSON.stringify(responseRows)
      : JSON.stringify(responseRows.find(({ name }) => name === request.form.labelName));
  const aligned = await alignParityLabelSeeds(
    {
      request: async (request) => {
        requests.push(request);
        return { status: request.method === "GET" ? 200 : 201, body: responseBody(request) };
      },
    },
    "",
    [{ name: "parity-label-sweep-live", category: "runtime", color: "#000000", id: 99 }],
  );
  assert.deepEqual(aligned, responseRows);
  assert.deepEqual(
    requests
      .filter(({ method }) => method !== "GET")
      .map(({ method, path, form }) => ({ method, path, form })),
    PARITY_LABEL_SEEDS.map((seed) => ({
      method: "POST",
      path: "/admin/sample/issue/labels",
      form: { labelName: seed.labelName, categoryName: seed.categoryName, labelColor: seed.color },
    })),
  );
  assert.deepEqual(requests.at(-1), { method: "GET", path: "/admin/sample/issue/labels" });
});

test("parity label alignment rejects an unauthorized compat write", async () => {
  await assert.rejects(
    () =>
      alignParityLabelSeeds(
        {
          request: async ({ method }) =>
            method === "GET" ? { status: 200, body: "[]" } : { status: 401, body: "" },
        },
        "",
        [],
      ),
    /parity label create failed: HTTP 401/,
  );
});

test("parity board alignment is idempotent and verifies project watch plus nested comment", async () => {
  const requests = [];
  const comments = [
    {
      id: "1",
      authorLoginId: "alice",
      contentsMarkdown: "Board seed confirmed from the fork contributor side.",
    },
  ];
  const session = {
    request: async (request) => {
      requests.push(request);
      if (request.method === "POST" && request.path.endsWith("/watch")) {
        return { status: 200, json: { watchCount: 1 } };
      }
      if (request.method === "GET" && request.path === "/api/v1/projects/admin/sample/posts/1") {
        return { status: 200, json: { comments: [...comments] } };
      }
      if (request.method === "POST" && request.path.endsWith("/comments")) {
        comments.push({
          id: "2",
          authorLoginId: "admin",
          contentsMarkdown: request.json.contentsMarkdown,
          parentCommentId: request.json.parentCommentId,
        });
        return { status: 201, json: { comments: [...comments] } };
      }
      if (request.method === "GET" && request.path === "/api/v1/owners/admin/projects/sample/container") {
        return { status: 200, json: { isWatching: true } };
      }
      throw new Error(`unexpected request ${request.method} ${request.path}`);
    },
  };

  await alignParityBoardFixtures(session);
  await alignParityBoardFixtures(session);

  assert.equal(requests[0].method, "GET");
  assert.equal(requests[0].path, "/api/v1/projects/admin/sample/posts/1");
  assert.equal(
    requests.some(
      ({ method, path }) => method === "POST" && path === "/api/v1/projects/admin/sample/posts",
    ),
    false,
  );
  assert.equal(comments.filter((comment) => comment.contentsMarkdown === PARITY_POST_COMMENT).length, 1);
  assert.deepEqual(
    requests
      .filter(({ method, path }) => method === "POST" && path.endsWith("/comments"))
      .map(({ json }) => json),
    [{ contentsMarkdown: PARITY_POST_COMMENT, parentCommentId: 1 }],
  );
  assert.equal(
    requests.filter(({ method, path }) => method === "POST" && path.endsWith("/watch")).length,
    2,
  );
});

test("parity board alignment creates a missing canonical posting before aligning its comment", async () => {
  const requests = [];
  const comments = [
    {
      id: "1",
      authorLoginId: "alice",
      contentsMarkdown: "Board seed confirmed from the fork contributor side.",
    },
  ];
  let postExists = false;
  const session = {
    request: async (request) => {
      requests.push(request);
      if (request.method === "GET" && request.path === "/api/v1/projects/admin/sample/posts/1") {
        return postExists
          ? { status: 200, json: { comments: [...comments] } }
          : { status: 404, json: null };
      }
      if (request.method === "POST" && request.path === "/api/v1/projects/admin/sample/posts") {
        postExists = true;
        return { status: 201, json: { postNumber: "1" } };
      }
      if (request.method === "POST" && request.path.endsWith("/watch")) {
        return { status: 200, json: { watchCount: 1 } };
      }
      if (request.method === "POST" && request.path === "/api/v1/projects/admin/sample/posts/1/comments") {
        comments.push({
          id: "2",
          authorLoginId: "admin",
          contentsMarkdown: request.json.contentsMarkdown,
          parentCommentId: request.json.parentCommentId,
        });
        return { status: 201, json: { comments: [...comments] } };
      }
      if (request.method === "GET" && request.path === "/api/v1/owners/admin/projects/sample/container") {
        return { status: 200, json: { isWatching: true } };
      }
      throw new Error(`unexpected request ${request.method} ${request.path}`);
    },
  };

  await alignParityBoardFixtures(session);

  assert.deepEqual(
    requests.slice(0, 3).map(({ method, path }) => ({ method, path })),
    [
      { method: "GET", path: "/api/v1/projects/admin/sample/posts/1" },
      { method: "POST", path: "/api/v1/projects/admin/sample/posts" },
      { method: "GET", path: "/api/v1/projects/admin/sample/posts/1" },
    ],
  );
  assert.equal(comments.filter((comment) => comment.contentsMarkdown === PARITY_POST_COMMENT).length, 1);
});

test("parity board alignment rejects a false watch readback despite HTTP 200", async () => {
  const comments = [{ id: "2", authorLoginId: "admin", contentsMarkdown: PARITY_POST_COMMENT }];
  const session = {
    request: async ({ method, path }) => {
      if (method === "GET" && path === "/api/v1/projects/admin/sample/posts/1") {
        return { status: 200, json: { comments } };
      }
      if (method === "POST" && path === "/api/v1/owners/admin/projects/sample/watch") {
        return { status: 200, json: {} };
      }
      if (method === "GET" && path === "/api/v1/owners/admin/projects/sample/container") {
        return { status: 200, json: { isWatching: false } };
      }
      throw new Error(`unexpected request ${method} ${path}`);
    },
  };

  await assert.rejects(
    () => alignParityBoardFixtures(session),
    /yoram project watch readback failed: HTTP 200/u,
  );
});

test("legacy H2 preboot keeps PostgreSQL mode and reconciles every exported model sequence", () => {
  assert.match(legacyH2Url(), /;MODE=PostgreSQL;/u);
  assert.deepEqual(
    LEGACY_MODEL_SEQUENCE_TABLES.map(([sequence]) => sequence).sort(),
    [
      "ASSIGNEE_SEQ",
      "ATTACHMENT_SEQ",
      "COMMENT_THREAD_SEQ",
      "COMMIT_COMMENT_SEQ",
      "EMAIL_SEQ",
      "ISSUE_SEQ",
      "ISSUE_COMMENT_SEQ",
      "ISSUE_EVENT_SEQ",
      "ISSUE_LABEL_SEQ",
      "ISSUE_LABEL_CATEGORY_SEQ",
      "LABEL_SEQ",
      "MENTION_SEQ",
      "MILESTONE_SEQ",
      "N4USER_SEQ",
      "NOTIFICATION_EVENT_SEQ",
      "NOTIFICATION_MAIL_SEQ",
      "ORGANIZATION_SEQ",
      "ORGANIZATION_USER_SEQ",
      "ORIGINAL_EMAIL_SEQ",
      "POSTING_SEQ",
      "POSTING_COMMENT_SEQ",
      "PROJECT_SEQ",
      "PROJECT_MENU_SETTING_SEQ",
      "PROJECT_PUSHED_BRANCH_SEQ",
      "PROJECT_TRANSFER_SEQ",
      "PROJECT_USER_SEQ",
      "PROJECT_VISITATION_SEQ",
      "PROPERTY_SEQ",
      "PULL_REQUEST_SEQ",
      "PULL_REQUEST_COMMIT_SEQ",
      "PULL_REQUEST_EVENT_SEQ",
      "RECENTLY_VISITED_PROJECTS_SEQ",
      "REVIEW_COMMENT_SEQ",
      "ROLE_SEQ",
      "SITE_ADMIN_SEQ",
      "UNWATCH_SEQ",
      "USER_PROJECT_NOTIFICATION_SEQ",
      "WATCH_SEQ",
    ].sort(),
  );
  assert.deepEqual(buildLegacySequenceReconciliationSql("ISSUE_SEQ", 245), [
    "CREATE SEQUENCE IF NOT EXISTS PUBLIC.ISSUE_SEQ START WITH 246",
    "ALTER SEQUENCE PUBLIC.ISSUE_SEQ RESTART WITH 246",
  ]);
});

test("behavior coverage excludes failed and skipped runtime steps", () => {
  assert.deepEqual(
    runtimeVerifiedBehaviorIds([
      { behaviorIds: ["B-executed"], stepResults: [{ status: "EXECUTED" }] },
      { behaviorIds: ["B-failed"], stepResults: [{ status: "FAILED" }] },
      { behaviorIds: ["B-skipped"], stepResults: [{ status: "SKIPPED" }] },
      { behaviorIds: ["B-partial"], stepResults: [{ status: "FAILED" }] },
      { behaviorIds: ["B-partial"], stepResults: [{ status: "EXECUTED" }] },
    ]),
    ["B-executed"],
  );
});

function stepContext(action, entry = { behaviorIds: [], violations: [], errors: [] }) {
  return { step: { action }, entry };
}

test("executeStep records a successful action as EXECUTED", async () => {
  const action = "__contract_success__";
  ACTION_DEFINITIONS[action] = { handler: async () => {} };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "EXECUTED", error: null }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records a dependent HarnessError action as SKIPPED", async () => {
  const action = "__contract_skip__";
  ACTION_DEFINITIONS[action] = { handler: async () => { throw new HarnessError("missing entity"); } };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [], harnessNoted: true };
    await executeStep(stepContext(action, entry));
    assert.equal(entry.stepResults[0].status, "SKIPPED");
    assert.equal(entry.stepResults[0].error, "missing entity");
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records thrown action errors as FAILED", async () => {
  const action = "__contract_failure__";
  ACTION_DEFINITIONS[action] = { handler: async () => { throw new Error("boom"); } };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "FAILED", error: "boom" }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("executeStep records handler-added step errors as FAILED", async () => {
  const action = "__contract_recorded_error__";
  ACTION_DEFINITIONS[action] = { handler: async ({ entry }) => { entry.errors.push("HTTP 500"); } };
  try {
    const entry = { behaviorIds: [], violations: [], errors: [] };
    await executeStep(stepContext(action, entry));
    assert.deepEqual(entry.stepResults, [{ action, status: "FAILED", error: "HTTP 500" }]);
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

function dispositionSignature(overrides = {}) {
  return {
    scenarioId: "S13-compat-default-login-page",
    action: "issue-api-probe",
    behaviorId: "B-0037",
    events: [
      {
        side: "legacy",
        request: {
          method: "GET",
          route: "/-_-api/v1/owners/admin/projects/sample/issues/1",
          payload: null,
        },
        response: { status: 401 },
      },
      {
        side: "yoram",
        request: {
          method: "GET",
          route: "/api/v1/owners/admin/projects/sample/issues/1",
          payload: null,
        },
        response: { status: 200 },
      },
    ],
    state: null,
    ...overrides,
  };
}

function fakeSession(result) {
  return {
    async request(translation) {
      return typeof result === "function" ? result(translation) : result;
    },
  };
}

function dispositionContext(step, legacyResult, yoramResult, entry = { behaviorIds: ["B-0037"], violations: [], errors: [] }) {
  return {
    step,
    entry,
    scenarioId: "S13-compat-default-login-page",
    resolved: {},
    state: {},
    legacySession: fakeSession(legacyResult),
    yoramSession: fakeSession(yoramResult),
  };
}

test("built-in issue API probe accepts only its exact expected runtime disposition", async () => {
  const step = {
    action: "issue-api-probe",
    behaviorId: "B-0037",
    params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
    expectedDisposition: {
      classification: "IMPLEMENTATION_DIFFERENCE",
      evidence: "test evidence",
      signature: dispositionSignature(),
    },
  };
  const entry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
  await executeStep(dispositionContext(step, { status: 401 }, { status: 200 }, entry));
  assert.equal(entry.stepResults[0].status, "DISPOSITIONED");
  assert.deepEqual(entry.stepResults[0].disposition, {
    classification: "IMPLEMENTATION_DIFFERENCE",
    evidence: "test evidence",
  });
  assert.equal(entry.stepResults[0].dispositionVerified, true);
  assert.equal(buildBehaviorVerification([{ behaviorIds: ["B-0037"], stepResults: entry.stepResults }])["B-0037"].dispositionedSteps, 1);
});

test("built-in issue API probe preserves an exact legacy-bug disposition", async () => {
  const step = {
    action: "issue-api-probe",
    behaviorId: "B-0037",
    params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
    expectedDisposition: {
      classification: "LEGACY_BUG_NOT_REPRODUCED",
      evidence: "test legacy evidence",
      signature: dispositionSignature(),
    },
  };
  const entry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
  await executeStep(dispositionContext(step, { status: 401 }, { status: 200 }, entry));
  assert.equal(entry.stepResults[0].disposition?.classification, "LEGACY_BUG_NOT_REPRODUCED");
  assert.equal(entry.stepResults[0].dispositionVerified, true);
});

test("expected disposition rejects status, payload, identity, route, and exception drift", async () => {
  const expected = {
    classification: "IMPLEMENTATION_DIFFERENCE",
    evidence: "test evidence",
    signature: dispositionSignature(),
  };
  const variants = [
    {
      name: "yoram status",
      yoram: { status: 500 },
    },
    {
      name: "legacy status",
      legacy: { status: 200 },
    },
    {
      name: "request payload",
      step: {
        params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1?drift=1" },
      },
    },
    {
      name: "behavior identity",
      step: { behaviorId: "B-wrong" },
    },
    {
      name: "action identity",
      signature: { action: "another-action" },
    },
    {
      name: "scenario identity",
      signature: { scenarioId: "another-scenario" },
    },
    {
      name: "route",
      step: { params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/other" } },
    },
  ];
  for (const variant of variants) {
    const step = {
      action: "issue-api-probe",
      behaviorId: "B-0037",
      params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
      expectedDisposition: variant.signature
        ? { ...expected, signature: dispositionSignature(variant.signature) }
        : expected,
      ...variant.step,
    };
    const entry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
    await executeStep(dispositionContext(step, variant.legacy ?? { status: 401 }, variant.yoram ?? { status: 200 }, entry));
    assert.equal(entry.stepResults[0].disposition, undefined, variant.name);
    assert.equal(entry.stepResults[0].status, "FAILED", variant.name);
  }

  const throwingStep = {
    action: "issue-api-probe",
    behaviorId: "B-0037",
    params: { api: "/-_-api/v1/owners/admin/projects/sample/issues/1" },
    expectedDisposition: expected,
  };
  const throwingEntry = { behaviorIds: ["B-0037"], violations: [], errors: [] };
  await executeStep({
    ...dispositionContext(throwingStep, { status: 401 }, { status: 200 }, throwingEntry),
    legacySession: { async request() { throw new Error("handler exception"); } },
  });
  assert.equal(throwingEntry.stepResults[0].disposition, undefined);
  assert.equal(throwingEntry.stepResults[0].status, "FAILED");
});

test("expected disposition rejects an additional request payload key", async () => {
  const action = "__payload_contract__";
  ACTION_DEFINITIONS[action] = {
    async handler(ctx) {
      await ctx.helpers.requestBoth(
        ctx,
        { method: "POST", path: "/probe", json: { allowed: true, extra: true } },
        { method: "POST", path: "/probe", json: { allowed: true, extra: true } },
      );
    },
  };
  try {
    const entry = { behaviorIds: ["B-payload"], violations: [], errors: [] };
    await executeStep({
      ...dispositionContext(
        {
          action,
          behaviorId: "B-payload",
          expectedDisposition: {
            classification: "IMPLEMENTATION_DIFFERENCE",
            evidence: "test evidence",
            signature: {
              scenarioId: "payload-contract",
              action,
              behaviorId: "B-payload",
              events: [
                {
                  side: "legacy",
                  request: { method: "POST", route: "/probe", payload: { json: { allowed: true } } },
                  response: { status: 200 },
                },
                {
                  side: "yoram",
                  request: { method: "POST", route: "/probe", payload: { json: { allowed: true } } },
                  response: { status: 200 },
                },
              ],
              state: null,
            },
          },
        },
        { status: 200 },
        { status: 200 },
        entry,
      ),
      scenarioId: "payload-contract",
    });
    assert.equal(entry.stepResults[0].disposition, undefined);
    assert.equal(entry.stepResults[0].status, "FAILED");
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("malformed runtime signature factories remain blocking", async () => {
  const action = "__malformed_signature__";
  ACTION_DEFINITIONS[action] = { handler: async () => {} };
  try {
    const entry = { behaviorIds: ["B-malformed"], violations: [], errors: [] };
    await executeStep({
      ...stepContext(
        {
          action,
          behaviorId: "B-malformed",
          expectedDisposition: {
            classification: "IMPLEMENTATION_DIFFERENCE",
            evidence: "test evidence",
            signature: () => ({}),
          },
        },
        entry,
      ),
      scenarioId: "malformed-signature",
    });
    assert.equal(entry.stepResults[0].disposition, undefined);
    assert.equal(entry.stepResults[0].status, "FAILED");
  } finally {
    delete ACTION_DEFINITIONS[action];
  }
});

test("scenario validation rejects legacy static dispositions and incomplete expected signatures", () => {
  const base = { id: "test", actions: [{ actor: "admin", action: "probe" }], behaviorMatcher: { action: /probe/u } };
  assert.match(validateScenarios([{ ...base, actions: [{ ...base.actions[0], disposition: { classification: "IMPLEMENTATION_DIFFERENCE", evidence: "e" } }] }], ["probe"]).join("\n"), /static disposition/u);
  assert.match(validateScenarios([{ ...base, actions: [{ ...base.actions[0], expectedDisposition: { classification: "IMPLEMENTATION_DIFFERENCE", evidence: "e", signature: {} } }] }], ["probe"]).join("\n"), /signature/u);
  const verification = buildBehaviorVerification([{
    behaviorIds: ["B-static"],
    stepResults: [{
      status: "FAILED",
      disposition: { classification: "IMPLEMENTATION_DIFFERENCE", evidence: "e" },
    }],
  }])["B-static"];
  assert.equal(verification.dispositionedSteps, 0);
  assert.equal(verification.failedSteps, 1);
});

test("summarizeExecution separates global infrastructure errors from step errors", () => {
  const summary = summarizeExecution({
    infraErrors: ["yoram boot failed"],
    scenarios: [
      { stepResults: [{ status: "EXECUTED" }] },
      { stepResults: [{ status: "SKIPPED" }, { status: "FAILED" }, { status: "DISPOSITIONED" }] },
    ],
  }, 3);
  assert.deepEqual(summary, {
    registeredScenarios: 3,
    attemptedScenarios: 2,
    globalInfraErrors: ["yoram boot failed"],
    scenariosWithStepErrors: 1,
    scenariosWithoutStepErrors: 1,
    totalStepErrors: 2,
    acceptedDispositions: 1,
  });
});
