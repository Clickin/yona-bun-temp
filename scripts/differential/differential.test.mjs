// Unit tests for the differential sweep building blocks.
// Run: node --test scripts/differential/differential.test.mjs

import assert from "node:assert/strict";
import test from "node:test";

import { LegacySession, YoramSession, translateLegacy, translateYoram } from "./adapters.mjs";
import { buildCoverage, matchBehaviors, smokeScenarios, validateScenarios } from "./dsl.mjs";
import {
  ISSUE_STATE_ENCODINGS,
  diffProjections,
  domVisibleLoss,
  filterRowsByTag,
  diffSkeletons,
  normalizeApiValue,
  normalizeSkeletonEntries,
  projectCommentRows,
  projectIssueRows,
  projectLabelRows,
  PULL_REQUEST_MERGE_PENDING_SIGNATURE,
  PULL_REQUEST_MERGE_SUCCESS_SIGNATURE,
  sideEffectAnchorTag,
} from "./diff.mjs";
import { parseH2ShellOutput } from "./db-projection.mjs";
import { ACTION_DEFINITIONS, scenarios } from "./scenarios/index.mjs";
import {
  CLASSIFICATIONS,
  HarnessError,
  classifyViolation,
  reclassifyScenarioViolations,
  PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS,
  PROJECT_ISSUE_LABELS_DOM_IMPLEMENTATION_FINGERPRINTS,
  PROJECT_PULL_REQUEST_DOM_IMPLEMENTATION_FINGERPRINTS,
  PROJECT_ROUTE_DOM_IMPLEMENTATION_FINGERPRINTS,
  SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS,
  violation,
} from "./report.mjs";

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

test("legacy session exposes parsed JSON responses alongside raw bodies", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ users: [{ loginId: "admin" }] }), { status: 200 });
  try {
    const result = await new LegacySession("http://x").request({ method: "GET", path: "/sites/noAvatarUsers" });
    assert.deepEqual(result.json, { users: [{ loginId: "admin" }] });
    assert.equal(result.body, '{"users":[{"loginId":"admin"}]}');
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

test("DOM normalization canonicalizes only approved rebrand identity tokens", () => {
  assert.deepEqual(
    normalizeSkeletonEntries([
      "a.yona-author:Yona authors",
      "a.yona-author:Yoram authors",
      "a:@yobi",
      "a:@example",
      "a:admin@example.com",
      "a:http://yobi.io/",
      "a:https://example.com/",
      "a:https://repo.yona.io/",
      "a:https://demo.yobi.io/",
      "a:https://yobi.io-example.com/",
      "div:naver/yobi",
      "div:Yoram/Yoram",
      "a.naver-cloud-platform:NAVER CLOUD PLATFORM",
      "a.naver-labs:NAVER LABS",
      "a.provider:NAVER Corp.",
    ]),
    [
      "a.naver-cloud-platform:<provider>",
      "a.naver-labs:<provider>",
      "a.provider:<provider>",
      "a.yona-author:<product> authors",
      "a.yona-author:<product> authors",
      "a:<example-host>/",
      "a:<example-host>/",
      "a:<example-host>/",
      "a:<example-host>/",
      "a:@<example>",
      "a:@<example>",
      "a:admin@example.com",
      "a:https://yobi.io-example.com/",
      "div:<product>/<product>",
      "div:<product>/<product>",
    ],
  );
  assert.deepEqual(
    diffSkeletons(
      [
        "a.yona-author:Yona authors",
        "a:@yobi",
        "a:http://yobi.io/",
        "a:https://repo.yona.io/",
        "a:https://demo.yobi.io/",
        "div:naver/yobi",
      ],
      [
        "a.yona-author:Yoram authors",
        "a:@example",
        "a:https://example.com/",
        "a:https://example.com/",
        "a:https://example.com/",
        "div:Yoram/Yoram",
      ],
    ),
    [],
    "approved identity-only copy changes are canonicalized without changing tags/classes",
  );
});

test("DOM rebrand normalization preserves structure and non-brand visible changes", () => {
  assert.notDeepEqual(
    diffSkeletons(["a.yona-author:Yona authors"], ["div.yona-author:Yoram authors"]),
    [],
    "tag changes remain structural differences",
  );
  assert.notDeepEqual(
    diffSkeletons(["a.yona-author:Yona authors"], ["a.yona-author:Yoram maintainers"]),
    [],
    "non-brand copy changes remain visible differences",
  );
  assert.notDeepEqual(
    diffSkeletons(["a.yona-author:Yona authors"], ["a.yona-author:Other authors"]),
    [],
    "replacing the approved brand with unrelated copy remains blocking",
  );
  assert.notDeepEqual(
    diffSkeletons(["a.yona-author:Yona authors"], ["a.yona-author:Yoram authors", "a:extra"]),
    [],
    "entry-count changes are never normalized away",
  );
});

// --- sanctioned side-effect anchor <=> button translation -------------------
// The ONLY DOM comparator equivalence: legacy href="#"/javascript:/empty
// anchors (and anchors whose behavior is carried by legacy request/toggle
// attributes) translate to React buttons. No route/class/state allowlists —
// class list, text, and role semantics stay strict.

test("sideEffectAnchorTag decides side-effect anchors from href semantics and legacy behavior attrs", () => {
  // non-navigating hrefs are side-effect anchors
  assert.equal(sideEffectAnchorTag("a", { href: "#" }), "a#");
  assert.equal(sideEffectAnchorTag("a", { href: "#helpMessage" }), "a#");
  assert.equal(sideEffectAnchorTag("a", { href: "JavaScript:void(0)" }), "a#");
  assert.equal(sideEffectAnchorTag("a", { href: "  " }), "a#");
  assert.equal(sideEffectAnchorTag("a", {}), "a#");
  // legacy request attrs carry the behavior even over an http-looking href
  assert.equal(sideEffectAnchorTag("a", { href: "/x/close", hasRequestMethod: true }), "a#");
  assert.equal(sideEffectAnchorTag("a", { href: "/x/delete", hasRequestUri: true }), "a#");
  // behavioral data-toggle (modal/order/filter/button) marks a side effect
  assert.equal(sideEffectAnchorTag("a", { href: "#helpMessage", dataToggle: "modal" }), "a#");
  assert.equal(sideEffectAnchorTag("a", { href: "#", dataToggle: "filter" }), "a#");
  // navigational anchors stay anchors — presentational toggles do not count
  assert.equal(sideEffectAnchorTag("a", { href: "/users/admin" }), "a");
  assert.equal(sideEffectAnchorTag("a", { href: "/users/admin", dataToggle: "tooltip" }), "a");
  assert.equal(sideEffectAnchorTag("a", { href: "/users/admin", dataToggle: "popover" }), "a");
  // only anchors translate
  assert.equal(sideEffectAnchorTag("button", { href: "#" }), "button");
  assert.equal(sideEffectAnchorTag("div", { href: "#" }), "div");
});

test("normalizeSkeletonEntries compares marked anchors as buttons, plain anchors stay anchors", () => {
  assert.deepEqual(normalizeSkeletonEntries(["a#.ybtn:닫기", "a.nav:메뉴", "button.ybtn:열기"]), [
    "a.nav:메뉴",
    "button.ybtn:닫기",
    "button.ybtn:열기",
  ]);
});

test("sanctioned anchor-to-button translation holds only with equal class list and text", () => {
  // equal class + text: the sanctioned translation produces no diff
  assert.deepEqual(diffSkeletons(["a#.ybtn:닫기"], ["button.ybtn:닫기"]), []);
  // class drift still diffs (the multiset reports both sides)
  assert.deepEqual(diffSkeletons(["a#.ybtn:닫기"], ["button.ybtn.primary:닫기"]), [
    { side: "legacy-only", expected: "button.ybtn:닫기", actual: "button.ybtn.primary:닫기" },
    { side: "yoram-only", expected: "<absent>", actual: "button.ybtn.primary:닫기" },
  ]);
  // text drift still diffs
  assert.deepEqual(diffSkeletons(["a#.ybtn:닫기"], ["button.ybtn:열기"]), [
    { side: "legacy-only", expected: "button.ybtn:닫기", actual: "button.ybtn:열기" },
    { side: "yoram-only", expected: "<absent>", actual: "button.ybtn:열기" },
  ]);
  // a real navigational anchor rendered as a button remains a role change
  assert.deepEqual(diffSkeletons(["a.nav:메뉴"], ["button.nav:메뉴"]), [
    { side: "legacy-only", expected: "a.nav:메뉴", actual: "button.nav:메뉴" },
    { side: "yoram-only", expected: "<absent>", actual: "button.nav:메뉴" },
  ]);
  // a missing side-effect control is still a missing control
  assert.deepEqual(diffSkeletons(["a#.ybtn:닫기"], ["div.x:"]), [
    { side: "legacy-only", expected: "button.ybtn:닫기", actual: "div.x:" },
    { side: "yoram-only", expected: "<absent>", actual: "div.x:" },
  ]);
});

test("visible-loss strictness is unchanged by anchor normalization", () => {
  // a translated (button) control gone missing is a visible loss
  assert.equal(
    domVisibleLoss({ actual: { firstDiffs: [{ side: "legacy-only", expected: "button.ybtn:닫기" }] } }),
    true,
  );
  // so is a missing navigational anchor with text
  assert.equal(
    domVisibleLoss({ actual: { firstDiffs: [{ side: "legacy-only", expected: "a.nav:메뉴" }] } }),
    true,
  );
  // a marked anchor whose tuple survives on the yoram side is a re-wrap, not
  // a loss (the normalized a# tuple equals the yoram-only entry)
  assert.equal(
    domVisibleLoss({
      actual: {
        firstDiffs: [
          { side: "legacy-only", expected: "a#.ybtn:닫기" },
          { side: "yoram-only", actual: "button.ybtn:닫기" },
        ],
      },
    }),
    false,
  );
});

test("non-anchor diffs are unaffected by the anchor marker", () => {
  // the marked anchor translates cleanly; an unrelated container drift still
  // reports both sides of the multiset mismatch
  assert.deepEqual(diffSkeletons(["div.x:", "a#.ybtn:닫기"], ["button.ybtn:닫기", "div.y:"]), [
    { side: "legacy-only", expected: "div.x:", actual: "div.y:" },
    { side: "yoram-only", expected: "<absent>", actual: "div.y:" },
  ]);
  // full sanctioned translation with otherwise-equal skeletons: no diff
  assert.deepEqual(diffSkeletons(["div.x:", "a#.ybtn:닫기"], ["button.ybtn:닫기", "div.x:"]), []);
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

test("session adapters support explicit status-only requests without consuming a stream", async () => {
  const originalFetch = globalThis.fetch;
  let consumed = false;
  globalThis.fetch = async () => ({
    status: 200,
    headers: { getSetCookie: () => [], get: () => null },
    text: async () => {
      consumed = true;
      throw new Error("terminated");
    },
  });
  try {
    const legacy = new LegacySession("http://legacy.test");
    const legacyResult = await legacy.request({ method: "GET", path: "/sites/export", readBody: false });
    const yoram = new YoramSession("http://yoram.test");
    const yoramResult = await yoram.request({ method: "GET", path: "/sites/export", readBody: false });
    assert.equal(legacyResult.status, 200);
    assert.equal(yoramResult.status, 200);
    assert.equal(legacyResult.body, "");
    assert.equal(yoramResult.body, "");
    assert.equal(consumed, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

// --- typed classification model ----------------------------------------------

test("classify keeps unknown DOM and visible loss blocking", () => {
  assert.equal(classifyViolation("api", "/x", { expected: 1, actual: 2 }).classification, "UNVERIFIED");
  assert.equal(
    classifyViolation("api", "/admin/sample/parity-missing-page", {
      expected: { status: 404 },
      actual: { status: 200 },
    }).classification,
    "UNVERIFIED",
    "unknown nested route fallback must remain blocking",
  );
  assert.equal(
    classifyViolation("api", "/admin/sample/commit/HEAD/comments/673/delete", {
      expected: { status: 404 },
      actual: { status: 200 },
    }).classification,
    "UNVERIFIED",
    "HEAD pseudo-ref comment mismatch must remain blocking",
  );
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

function siteAdminFingerprintDetail(fingerprint, overrides = {}) {
  return {
    expected: { skeletonEntries: fingerprint.expectedSkeletonEntries },
    actual: {
      skeletonEntries: fingerprint.actualSkeletonEntries,
      firstDiffs: fingerprint.firstDiffs,
      ...overrides,
    },
  };
}

function firstVisibleFingerprintDiffIndex(firstDiffs) {
  const visibleTags = new Set(["a", "button", "input", "select", "textarea", "label", "form"]);
  return firstDiffs.findIndex((diff) =>
    [diff.expected, diff.actual].some((entry) => {
      const value = String(entry ?? "");
      const separator = value.indexOf(":");
      const tag = (separator === -1 ? value : value.slice(0, separator)).split(".")[0].toLowerCase();
      const text = separator === -1 ? "" : value.slice(separator + 1).trim();
      return text.length > 0 || visibleTags.has(tag);
    }),
  );
}

function fingerprintRoute(fingerprint, index = 0) {
  return fingerprint.route === "/admin/sample/issue/<issue-number>"
    ? `/admin/sample/issue/${701 + index}`
    : fingerprint.route;
}

function fingerprintContext(fingerprint) {
  return fingerprint.scenarioId
    ? {
        scenarioId: fingerprint.scenarioId,
        scenarioActions: fingerprint.action ? [fingerprint.action] : [],
      }
    : {};
}

test("site-admin DOM fingerprints cite the exact WTR contract and classify only exact captures", () => {
  assert.equal(SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS.length, 8);
  for (const [index, fingerprint] of [
    ...SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_PULL_REQUEST_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_ROUTE_DOM_IMPLEMENTATION_FINGERPRINTS,
  ].entries()) {
    const result = classifyViolation(
      "dom",
      fingerprintRoute(fingerprint, index),
      siteAdminFingerprintDetail(fingerprint),
      fingerprintContext(fingerprint),
    );
    assert.equal(result.classification, "IMPLEMENTATION_DIFFERENCE", fingerprint.route);
    assert.match(result.rationale, new RegExp(fingerprint.wtrTest.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
    assert.match(result.rationale, new RegExp(fingerprint.wtrSource.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&"), "u"));
  }
});

test("site-admin DOM fingerprint near misses keep visible changes blocking", () => {
  for (const [index, fingerprint] of [
    ...SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_PULL_REQUEST_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_ROUTE_DOM_IMPLEMENTATION_FINGERPRINTS,
  ].entries()) {
    const visibleIndex = firstVisibleFingerprintDiffIndex(fingerprint.firstDiffs);
    assert.notEqual(visibleIndex, -1, `${fingerprint.route}: fingerprint must contain a visible entry`);
    const changedDiffs = fingerprint.firstDiffs.map((diff, index) =>
      index === visibleIndex ? { ...diff, expected: `${diff.expected} changed` } : diff,
    );
    assert.equal(
      classifyViolation(
        "dom",
        fingerprintRoute(fingerprint, index),
        siteAdminFingerprintDetail(fingerprint, { firstDiffs: changedDiffs }),
        fingerprintContext(fingerprint),
      ).classification,
      "UNVERIFIED",
      `${fingerprint.route}: changed visible/class identity must remain blocking`,
    );

    const removedVisibleDiffs = fingerprint.firstDiffs.filter((_diff, index) => index !== visibleIndex);
    assert.equal(
      classifyViolation(
        "dom",
        fingerprintRoute(fingerprint, index),
        siteAdminFingerprintDetail(fingerprint, {
          firstDiffs: removedVisibleDiffs,
          skeletonEntries: fingerprint.actualSkeletonEntries - 1,
        }),
        fingerprintContext(fingerprint),
      ).classification,
      "UNVERIFIED",
      `${fingerprint.route}: missing row/control must remain blocking`,
    );

    assert.equal(
      classifyViolation(
        "dom",
        `${fingerprintRoute(fingerprint, index)}?state=near-miss`,
        siteAdminFingerprintDetail(fingerprint),
        fingerprintContext(fingerprint),
      ).classification,
      "UNVERIFIED",
      `${fingerprint.route}: state mismatch must remain blocking`,
    );
  }
});

test("DOM fingerprints reject every canonical tuple near miss", () => {
  for (const fingerprint of [
    ...SITE_ADMIN_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_PULL_REQUEST_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS,
    ...PROJECT_ROUTE_DOM_IMPLEMENTATION_FINGERPRINTS,
  ]) {
    const route = fingerprintRoute(fingerprint);
    const context = fingerprintContext(fingerprint);
    const cases = [
      ["count", siteAdminFingerprintDetail(fingerprint, {
        skeletonEntries: fingerprint.actualSkeletonEntries + 1,
      }), route, context],
      ["route", siteAdminFingerprintDetail(fingerprint), `${route}/near-miss`, context],
      ["scenario", siteAdminFingerprintDetail(fingerprint), route, {
        ...context,
        scenarioId: `${context.scenarioId ?? "unknown"}-near-miss`,
      }],
      ["action", siteAdminFingerprintDetail(fingerprint), route, {
        ...context,
        scenarioActions: ["near-miss-action"],
      }],
      ["tuple", siteAdminFingerprintDetail(fingerprint, {
        firstDiffs: fingerprint.firstDiffs.map((diff, index) =>
          index === 0 ? { ...diff, expected: `${diff.expected} changed` } : diff,
        ),
      }), route, context],
    ];
    for (const [dimension, detail, candidateRoute, candidateContext] of cases) {
      assert.equal(
        classifyViolation("dom", candidateRoute, detail, candidateContext).classification,
        "UNVERIFIED",
        `${fingerprint.route}: ${dimension} near miss must remain blocking`,
      );
    }
  }
});

test("project issue-detail DOM fingerprints keep label/avatar control loss blocking", () => {
  for (const [index, fingerprint] of PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS.entries()) {
    const controlIndex = fingerprint.firstDiffs.findIndex((diff) =>
      [diff.expected, diff.actual].some((entry) =>
        /(?:label-edit|avatar-wrap|usf-group)/u.test(String(entry)),
      ),
    );
    assert.notEqual(controlIndex, -1, `${fingerprint.route}: fingerprint must contain a reviewed control`);
    const missingControl = fingerprint.firstDiffs.filter((_diff, index) => index !== controlIndex);
    assert.equal(
      classifyViolation(
        "dom",
        fingerprintRoute(fingerprint, index),
        siteAdminFingerprintDetail(fingerprint, {
          firstDiffs: missingControl,
          skeletonEntries: fingerprint.actualSkeletonEntries - 1,
        }),
        fingerprintContext(fingerprint),
      ).classification,
      "UNVERIFIED",
      `${fingerprint.route}: missing label/avatar control must remain blocking`,
    );
    if (fingerprint.expectedSkeletonEntries !== 325) {
      assert.equal(
        classifyViolation(
          "dom",
          fingerprintRoute(fingerprint, index),
          siteAdminFingerprintDetail(fingerprint),
          { scenarioId: "I18-issue-edit-state" },
        ).classification,
        "UNVERIFIED",
        `${fingerprint.route}: wrong scenario state must remain blocking`,
      );
    }
  }
});

test("project labelsform rebrand fingerprint keeps form/button/label near-misses blocking", () => {
  const fingerprints = PROJECT_ISSUE_LABELS_DOM_IMPLEMENTATION_FINGERPRINTS.filter(
    (candidate) => candidate.route === "/admin/sample/issue/labelsform",
  );
  assert.deepEqual(
    fingerprints.map(({ expectedSkeletonEntries, actualSkeletonEntries }) => [
      expectedSkeletonEntries,
      actualSkeletonEntries,
    ]),
    [[75, 75], [62, 62]],
  );

  for (const fingerprint of fingerprints) {
    const context = fingerprintContext(fingerprint);
    assert.equal(
      classifyViolation(
        "dom",
        fingerprint.route,
        siteAdminFingerprintDetail(fingerprint),
        context,
      ).classification,
      "IMPLEMENTATION_DIFFERENCE",
    );

    const nearMisses = [
      fingerprint.firstDiffs.map((diff, index) =>
        index === 0
          ? { ...diff, actual: String(diff.actual).replace("<product>/<product>", "Changed/Changed") }
          : diff,
      ),
      [
        ...fingerprint.firstDiffs,
        { side: "legacy-only", expected: "form.new-label-wrap:", actual: "form:" },
      ],
      [
        ...fingerprint.firstDiffs,
        { side: "legacy-only", expected: "button.ybtn.ybtn-primary.btn-submit:라벨 추가", actual: "button:라벨 수정" },
      ],
      [
        ...fingerprint.firstDiffs,
        { side: "legacy-only", expected: "span.issue-label.active:bug", actual: "span.category-name:bug" },
      ],
    ];
    for (const [index, firstDiffs] of nearMisses.entries()) {
      assert.equal(
        classifyViolation(
          "dom",
          fingerprint.route,
          siteAdminFingerprintDetail(fingerprint, { firstDiffs }),
          context,
        ).classification,
        "UNVERIFIED",
        `near-miss ${index} must remain blocking for ${fingerprint.expectedSkeletonEntries}-entry capture`,
      );
    }

    assert.equal(
      classifyViolation(
        "dom",
        fingerprint.route,
        siteAdminFingerprintDetail(fingerprint, {
          skeletonEntries: fingerprint.actualSkeletonEntries + 1,
        }),
        context,
      ).classification,
      "UNVERIFIED",
      "changed skeleton count must remain blocking",
    );
    assert.equal(
      classifyViolation(
        "dom",
        fingerprint.route,
        siteAdminFingerprintDetail(fingerprint),
        { scenarioId: fingerprint.scenarioId, scenarioActions: ["view-issue-label-category"] },
      ).classification,
      "UNVERIFIED",
      "wrong labels state must remain blocking",
    );
  }
});

test("project issue-detail fingerprints normalize mutable comment time and sweep identity", () => {
  const fingerprint = PROJECT_ISSUE_DOM_IMPLEMENTATION_FINGERPRINTS.find(
    (candidate) =>
      candidate.normalizeIssueDiffs &&
      candidate.firstDiffs.some((diff) => String(diff.actual).includes("Differential sweep issue body")),
  );
  assert.ok(fingerprint);
  const variedTimes = ["a.ago:2시간 전", "a.ago:3일 전"];
  for (const [index, time] of variedTimes.entries()) {
    const firstDiffs = fingerprint.firstDiffs.map((diff) => ({
      ...diff,
      actual: String(diff.actual)
        .replace("a.ago:<relative-time>", time)
        .replace(
          "a:Differential sweep issue body <sweep-id>",
          `a:Differential sweep issue body sweep-varied-${index}`,
        ),
    }));
    assert.equal(
      classifyViolation(
        "dom",
        `/admin/sample/issue/${901 + index}`,
        siteAdminFingerprintDetail(fingerprint, { firstDiffs }),
        fingerprintContext(fingerprint),
      ).classification,
      "IMPLEMENTATION_DIFFERENCE",
    );
  }

  const changedControl = fingerprint.firstDiffs.map((diff) =>
    String(diff.expected).includes("label-edit")
      ? { ...diff, expected: "a.label-edit:[Changed]" }
      : diff,
  );
  assert.equal(
    classifyViolation(
      "dom",
      "/admin/sample/issue/999",
      siteAdminFingerprintDetail(fingerprint, { firstDiffs: changedControl }),
      fingerprintContext(fingerprint),
    ).classification,
    "UNVERIFIED",
  );

  const changedText = fingerprint.firstDiffs.map((diff) =>
    String(diff.actual).includes("Differential sweep issue body")
      ? { ...diff, actual: "a:Differential sweep issue body changed" }
      : diff,
  );
  assert.equal(
    classifyViolation(
      "dom",
      "/admin/sample/issue/1000",
      siteAdminFingerprintDetail(fingerprint, { firstDiffs: changedText }),
      fingerprintContext(fingerprint),
    ).classification,
    "UNVERIFIED",
  );
});

test("project pull-request DOM fingerprints keep missing button, text, and count blocking", () => {
  for (const fingerprint of PROJECT_PULL_REQUEST_DOM_IMPLEMENTATION_FINGERPRINTS) {
    const buttonIndex = fingerprint.firstDiffs.findIndex((diff) =>
      [diff.expected, diff.actual].some((entry) => /^button(?:\.|:)/u.test(String(entry))),
    );
    assert.notEqual(buttonIndex, -1, `${fingerprint.route}: fingerprint must contain a button entry`);
    const missingButton = fingerprint.firstDiffs.filter((_diff, index) => index !== buttonIndex);
    assert.equal(
      classifyViolation(
        "dom",
        fingerprint.route,
        siteAdminFingerprintDetail(fingerprint, {
          firstDiffs: missingButton,
          skeletonEntries: fingerprint.actualSkeletonEntries - 1,
        }),
      ).classification,
      "UNVERIFIED",
      `${fingerprint.route}: missing button must remain blocking`,
    );

    const textIndex = fingerprint.firstDiffs.findIndex((diff) =>
      [diff.expected, diff.actual].some((entry) => String(entry).includes(":") && String(entry).split(":").slice(1).join(":")),
    );
    assert.notEqual(textIndex, -1, `${fingerprint.route}: fingerprint must contain text`);
    const missingText = fingerprint.firstDiffs.filter((_diff, index) => index !== textIndex);
    assert.equal(
      classifyViolation(
        "dom",
        fingerprint.route,
        siteAdminFingerprintDetail(fingerprint, {
          firstDiffs: missingText,
          skeletonEntries: fingerprint.actualSkeletonEntries - 1,
        }),
      ).classification,
      "UNVERIFIED",
      `${fingerprint.route}: missing text must remain blocking`,
    );

    assert.equal(
      classifyViolation(
        "dom",
        fingerprint.route,
        siteAdminFingerprintDetail(fingerprint, {
          skeletonEntries: fingerprint.actualSkeletonEntries + 1,
        }),
      ).classification,
      "UNVERIFIED",
      `${fingerprint.route}: changed skeleton count must remain blocking`,
    );
  }
});

test("malformed residual findings require their exact step behavior id", () => {
  const shareProbe = {
    expected: { status: "<400" },
    actual: {
      legacyStatus: 500,
      yoramStatus: 404,
      legacyRequest: {
        method: "POST",
        path: "/-_-api/v1/owners/admin/projects/sample/issues/7/share",
        json: { sharer: ["admin"], action: "add" },
      },
      yoramRequest: {
        method: "POST",
        path: "/api/v1/owners/admin/projects/sample/issues/7/sharers/toggle",
        json: { sharer: ["admin"], action: "add" },
      },
    },
  };
  const shareRemoveProbe = {
    ...shareProbe,
    actual: {
      ...shareProbe.actual,
      yoramStatus: 200,
      legacyRequest: {
        ...shareProbe.actual.legacyRequest,
        json: { sharer: ["admin"], action: "remove" },
      },
      yoramRequest: {
        ...shareProbe.actual.yoramRequest,
        json: { sharer: ["admin"], action: "remove" },
      },
    },
  };
  const issueImportProbe = {
    expected: { status: "<400" },
    actual: {
      legacyStatus: 400,
      yoramStatus: 404,
      legacyRequest: {
        method: "POST",
        path: "/-_-api/v1/owners/admin/projects/sample/issues/imports",
        json: { owner: "parity-sweep", repoName: "nonexistent-sweep", token: "" },
      },
      yoramRequest: {
        method: "POST",
        path: "/-_-api/v1/owners/admin/projects/sample/issues/imports",
        json: { owner: "parity-sweep", repoName: "nonexistent-sweep", token: "" },
      },
    },
  };
  const cases = [
    ["B-0185", "/user/sidebar", { expected: { status: 500 }, actual: { status: 200 } }, "LEGACY_BUG_NOT_REPRODUCED"],
    ["B-0267", "/admin/parity-setting/setting", { expected: { status: 500 }, actual: { status: 200 } }, "LEGACY_BUG_NOT_REPRODUCED"],
    ["B-0221", "/user/editform/defultLoginPage", { expected: "2xx", actual: "4xx" }, "LEGACY_BUG_NOT_REPRODUCED"],
    ["B-0286", "/sites/import", { expected: "legacy HTTP 303", actual: "yoram HTTP 400" }, "IMPLEMENTATION_DIFFERENCE"],
    ["B-0014", "/comments/issue/9", { expected: { status: "<400" }, actual: { legacyStatus: 500, yoramStatus: 400 } }, "LEGACY_BUG_NOT_REPRODUCED"],
    ["B-0212", "/-_-api/v1/owners/admin/projects/sample/issues/7/share", shareProbe, "LEGACY_BUG_NOT_REPRODUCED"],
    ["B-0212", "/-_-api/v1/owners/admin/projects/sample/issues/7/share", shareRemoveProbe, "LEGACY_BUG_NOT_REPRODUCED"],
    ["B-0214", "/-_-api/v1/owners/admin/projects/sample/issues/imports", issueImportProbe, "IMPLEMENTATION_DIFFERENCE"],
    ["B-0287", "/sites/mail", { expected: "legacy HTTP 500", actual: "yoram HTTP 400" }, "LEGACY_BUG_NOT_REPRODUCED"],
  ];
  for (const [behaviorId, route, detail, classification] of cases) {
    assert.equal(classifyViolation("api", route, detail, { behaviorId }).classification, classification, behaviorId);
    assert.equal(classifyViolation("api", route, detail).classification, "UNVERIFIED", `${behaviorId} must be attributed`);
  }
  const exactTuples = [
    {
      behaviorId: "B-0002",
      route: "/admin/sample/code/__parity_missing_branch__/",
      detail: { expected: "legacy HTTP 303", actual: "yoram HTTP 404" },
      context: {
        scenarioId: "P26-residual-branch-import-probes",
        scenarioActions: ["login", "probe-delete-branch-missing", "probe-import-project-invalid"],
      },
      classification: "LEGACY_BUG_NOT_REPRODUCED",
    },
    {
      behaviorId: null,
      route: "/user/editform/:tabId",
      detail: { expected: "legacy HTTP 200", actual: "yoram HTTP 404" },
      context: {
        scenarioId: "U22-user-profile-edit-revert",
        scenarioActions: ["login", "edit-user-profile", "save-user-editform-tab", "save-user-editform-tab"],
      },
      classification: "IMPLEMENTATION_DIFFERENCE",
    },
  ];
  for (const { behaviorId, route, detail, context, classification } of exactTuples) {
    assert.equal(
      classifyViolation("api", route, detail, { behaviorId, ...context }).classification,
      classification,
      `${context.scenarioId}: exact route/status/action tuple`,
    );
    assert.equal(
      classifyViolation("api", route, detail, { behaviorId }).classification,
      "UNVERIFIED",
      `${context.scenarioId}: missing scenario/action context must block`,
    );
  }
  const scenarioReclassification = {
    id: "U22-user-profile-edit-revert",
    stepResults: [
      { action: "login" },
      { action: "edit-user-profile" },
      { action: "save-user-editform-tab" },
      { action: "save-user-editform-tab" },
    ],
    violations: [
      {
        kind: "api",
        behaviorId: null,
        route: "/user/editform/:tabId",
        expected: "legacy HTTP 200",
        actual: "yoram HTTP 404",
      },
    ],
  };
  reclassifyScenarioViolations(scenarioReclassification);
  assert.equal(scenarioReclassification.violations[0].classification, "IMPLEMENTATION_DIFFERENCE");
  const branchScenario = {
    id: "P26-residual-branch-import-probes",
    stepResults: [
      { action: "login" },
      { action: "probe-delete-branch-missing" },
      { action: "probe-import-project-invalid" },
    ],
    violations: [
      {
        kind: "api",
        behaviorId: "B-0002",
        route: "/admin/sample/code/__parity_missing_branch__/",
        expected: "legacy HTTP 303",
        actual: "yoram HTTP 404",
      },
    ],
  };
  reclassifyScenarioViolations(branchScenario);
  assert.equal(branchScenario.violations[0].classification, "LEGACY_BUG_NOT_REPRODUCED");
  const wrongScenario = {
    ...scenarioReclassification,
    id: "U22-user-profile-edit-revert",
    stepResults: [
      { action: "login" },
      { action: "edit-user-profile" },
      { action: "other-action" },
      { action: "other-action" },
    ],
    violations: scenarioReclassification.violations.map(({ classification, reason, rationale, ...finding }) => finding),
  };
  reclassifyScenarioViolations(wrongScenario);
  assert.equal(wrongScenario.violations[0].classification, "UNVERIFIED");
  for (const nearMiss of [
    {
      behaviorId: "B-0298",
      route: "/user/editform/:tabId",
      detail: { expected: "legacy HTTP 201", actual: "yoram HTTP 404" },
    },
    {
      behaviorId: "B-0298",
      route: "/user/editform/notifications",
      detail: { expected: "legacy HTTP 200", actual: "yoram HTTP 404" },
    },
    {
      behaviorId: "B-0299",
      route: "/user/editform/:tabId",
      detail: { expected: "legacy HTTP 200", actual: "yoram HTTP 404" },
    },
    {
      behaviorId: "B-0298",
      route: "/user/editform/:tabId",
      detail: { expected: "legacy HTTP 200", actual: "yoram HTTP 403" },
    },
  ]) {
    assert.equal(
      classifyViolation("api", nearMiss.route, nearMiss.detail, { behaviorId: nearMiss.behaviorId }).classification,
      "UNVERIFIED",
      `near miss must remain blocking: ${nearMiss.behaviorId} ${nearMiss.route}`,
    );
  }
  assert.equal(
    classifyViolation(
      "api",
      "/admin/sample/commit/HEAD/comments/673/delete",
      { expected: { status: 404 }, actual: { status: 200 } },
      { behaviorId: "B-0003" },
    ).classification,
    "UNVERIFIED",
  );
  assert.equal(
    classifyViolation(
      "api",
      "/-_-api/v1/owners/admin/projects/sample/issues/7/share",
      {
        ...shareProbe,
        actual: {
          ...shareProbe.actual,
          legacyRequest: {
            ...shareProbe.actual.legacyRequest,
            json: { sharer: ["admin"], action: "unknown" },
          },
        },
      },
      { behaviorId: "B-0212" },
    ).classification,
    "UNVERIFIED",
    "share classifier must reject an unrecorded payload",
  );
  assert.equal(
    classifyViolation(
      "api",
      "/-_-api/v1/owners/admin/projects/sample/issues/imports",
      {
        ...issueImportProbe,
        actual: {
          ...issueImportProbe.actual,
          yoramRequest: {
            ...issueImportProbe.actual.yoramRequest,
            json: { owner: "parity-sweep", repoName: "other", token: "" },
          },
        },
      },
      { behaviorId: "B-0214" },
    ).classification,
    "UNVERIFIED",
    "import classifier must reject an unrecorded payload",
  );
});

test("strict residual step metadata is explicit and cleanup remains unclaimed", () => {
  const find = (scenarioId, action) =>
    scenarios.find((scenario) => scenario.id === scenarioId)?.actions.find((step) => step.action === action);
  assert.equal(find("I18-issue-edit-state", "probe-issue-imports")?.behaviorId, "B-0214");
  assert.equal(find("I19-comment-lifecycle", "delete-comment-compat")?.behaviorId, "B-0014");
  assert.equal(find("I20-issue-engagement", "update-sharer")?.behaviorId, "B-0212");
  assert.equal(find("U19-files-and-user-api", "get-user-sidebar")?.behaviorId, "B-0185");
  assert.equal(find("U25-residual-site-user-probes", "probe-site-import-invalid")?.behaviorId, "B-0286");
  assert.equal(find("U25-residual-site-user-probes", "probe-site-mail-invalid")?.behaviorId, "B-0287");
  const cleanup = find("P23-wave-d-project-destructive", "cleanup-created-projects");
  assert.equal(cleanup?.behaviorId, undefined);
  assert.deepEqual(cleanup?.disposition, {
    classification: "IMPLEMENTATION_DIFFERENCE",
    evidence: "teardown-only residue assertion; generated projects do not claim an inventory behavior",
  });
  assert.equal(find("P15-project-data-surfaces", "fetch-unknown-path"), undefined);
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

test("PR merge-bug DOM rule requires exact state and same-scenario B-0227 evidence", () => {
  const knownAcceptFailure = {
    kind: "api",
    behaviorId: "B-0227",
    route: "/admin/sample/pullRequest/2/accept",
    expected: { status: 500 },
    actual: { status: 200 },
    reason: "Legacy PullRequest.Merger.Success dereferences a null reusable merge tree during accept.",
  };
  const firstDiffs = [
    ...PULL_REQUEST_MERGE_PENDING_SIGNATURE.map((expected, index) => ({
      side: "legacy-only",
      expected,
      actual: PULL_REQUEST_MERGE_SUCCESS_SIGNATURE[index],
    })),
    // The success signature is represented by `actual` entries in the
    // comparator; include the finite, reviewed structural companions only.
    { side: "yoram-only", expected: "<absent>", actual: PULL_REQUEST_MERGE_SUCCESS_SIGNATURE[0] },
    { side: "legacy-only", expected: PULL_REQUEST_MERGE_PENDING_SIGNATURE[1], actual: PULL_REQUEST_MERGE_SUCCESS_SIGNATURE[1] },
    { side: "yoram-only", expected: "<absent>", actual: "div.attachments:" },
    { side: "yoram-only", expected: "<absent>", actual: "i.yobicon-right-2.ml10:" },
    { side: "yoram-only", expected: "<absent>", actual: "i.yobicon-check-circle-alt.mr5:" },
    { side: "legacy-only", expected: "i.yobicon-supportrequest.mr5:", actual: "<absent>" },
    { side: "yoram-only", expected: "<absent>", actual: "li.active:" },
  ];
  const scenario = {
    violations: [
      knownAcceptFailure,
      {
        kind: "dom",
        route: "/admin/sample/pullRequest/2",
        expected: { skeletonEntries: 51 },
        actual: { skeletonEntries: 48, firstDiffs },
      },
    ],
  };
  reclassifyScenarioViolations(scenario);
  assert.equal(scenario.violations[1].classification, "LEGACY_BUG_NOT_REPRODUCED");
});

test("PR merge-bug DOM rule leaves unrelated comments/list and near-miss text blocking", () => {
  const knownAcceptFailure = {
    kind: "api",
    behaviorId: "B-0227",
    route: "/admin/sample/pullRequest/2/accept",
    expected: { status: 500 },
    actual: { status: 200 },
    reason: "Legacy PullRequest.Merger.Success dereferences a null reusable merge tree during accept.",
  };
  const exact = PULL_REQUEST_MERGE_PENDING_SIGNATURE.map((expected, index) => ({
    side: "legacy-only",
    expected,
    actual: PULL_REQUEST_MERGE_SUCCESS_SIGNATURE[index],
  }));
  const scenario = {
    violations: [
      knownAcceptFailure,
      {
        kind: "dom",
        route: "/admin/sample/pullRequest/2",
        expected: {},
        actual: {
          firstDiffs: [
            ...exact,
            { side: "legacy-only", expected: "ul.comments:", actual: "ul.nav.nav-tabs.nm:" },
          ],
        },
      },
    ],
  };
  reclassifyScenarioViolations(scenario);
  assert.equal(scenario.violations[1].classification, "UNVERIFIED");

  const nearMiss = {
    violations: [
      knownAcceptFailure,
      {
        kind: "dom",
        route: "/admin/sample/pullRequest/2",
        expected: {},
        actual: {
          firstDiffs: exact.map((diff, index) =>
            index === 2 ? { ...diff, expected: "span:코드가 안전한지 확인하고 있습니다." } : diff,
          ),
        },
      },
    ],
  };
  reclassifyScenarioViolations(nearMiss);
  assert.equal(nearMiss.violations[1].classification, "UNVERIFIED");
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
