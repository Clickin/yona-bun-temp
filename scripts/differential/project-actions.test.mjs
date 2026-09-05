// Tests for the project domain module: registry shape, translator literals,
// and behavior-inventory coverage. Runs standalone: merges this module's
// actionDefinitions with the shared registry locally because
// scenarios/index.mjs is not edited by domain agents.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { ACTION_DEFINITIONS } from "./scenarios/index.mjs";
import { validateScenarios, matchBehaviors } from "./dsl.mjs";
import { scenarios, actionDefinitions } from "./scenarios/project.mjs";

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
  const cases = [
    ["list-issue-labels", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels"],
    ["view-issue-labels-form", { owner: "admin", project: "sample" }, "/admin/sample/issue/labelsform"],
    ["list-issue-label-categories", { owner: "admin", project: "sample" }, "/admin/sample/issue/label/categories"],
    ["view-issue-label-category", { owner: "admin", project: "sample", categoryId: 1 }, "/admin/sample/issue/label/category/1"],
    ["fetch-issue-label-styles", { owner: "admin", project: "sample" }, "/admin/sample/issue/labels.css"],
    ["view-site-labels", {}, "/labels?limit=1000"],
    ["view-site-label-categories", {}, "/categories?limit=1000"],
    ["list-milestones", { owner: "admin", project: "sample" }, "/admin/sample/milestones"],
    ["view-milestone", { owner: "admin", project: "sample", milestoneId: 1 }, "/admin/sample/milestone/1"],
    ["view-milestone-editform", { owner: "admin", project: "sample", milestoneId: 2 }, "/admin/sample/milestone/2/editform"],
    ["view-new-milestone-form", { owner: "admin", project: "sample" }, "/admin/sample/newMilestoneForm"],
    ["list-posts", { owner: "admin", project: "sample" }, "/admin/sample/posts"],
    ["view-post-form", { owner: "admin", project: "sample" }, "/admin/sample/postform"],
    ["view-post", { owner: "admin", project: "sample", postNumber: 1 }, "/admin/sample/post/1"],
    ["view-post-editform", { owner: "admin", project: "sample", postNumber: 2 }, "/admin/sample/post/2/editform"],
    ["view-project-members", { owner: "admin", project: "sample" }, "/admin/sample/members"],
    ["view-project-watchers", { owner: "admin", project: "sample" }, "/admin/sample/watchers"],
    ["view-project-setting-form", { owner: "admin", project: "sample" }, "/admin/sample/settingform"],
    ["view-project-delete-form", { owner: "admin", project: "sample" }, "/admin/sample/deleteform"],
    ["view-project-transfer-form", { owner: "admin", project: "sample" }, "/admin/sample/transfer"],
    ["view-project-webhooks", { owner: "admin", project: "sample" }, "/admin/sample/webhooks"],
    ["view-project-statistics", { owner: "admin", project: "sample" }, "/admin/sample/statistics"],
    ["view-project-go-menu", { owner: "admin", project: "sample" }, "/admin/sample/go"],
    ["view-change-vcs-form", { owner: "admin", project: "sample" }, "/admin/sample/changeVCS"],
    ["fetch-mention-list", { owner: "admin", project: "sample" }, "/admin/sample/mentionList"],
    ["fetch-mention-list-commit-diff", { owner: "admin", project: "sample" }, "/admin/sample/mentionListAtCommitDiff"],
    ["fetch-mention-list-pull-request", { owner: "admin", project: "sample" }, "/admin/sample/mentionListAtPullRequest?pullRequestId=1"],
  ];
  for (const [action, params, expectedPath] of cases) {
    const legacy = MERGED_DEFINITIONS[action].translateLegacy(step(action, params), {});
    const expectedHeaders =
      action === "view-site-labels" || action === "view-site-label-categories"
        ? { headers: { Accept: "application/json" } }
        : {};
    assert.deepEqual(legacy, { method: "GET", path: expectedPath, ...expectedHeaders }, `${action} legacy translation`);
    const yoram = MERGED_DEFINITIONS[action].translateYoram(step(action, params), {});
    assert.equal(yoram.method, "GET", `${action} yoram method`);
    assert.equal(yoram.path, expectedPath, `${action} yoram path (SPA shell serves legacy route)`);
    if (yoram.pagePath !== undefined) assert.equal(yoram.pagePath, expectedPath, `${action} yoram pagePath`);
  }
});

test("compat reads keep legacy /-_-api/v1 paths and map yoram to RESTful", () => {
  const step = (action, params) => ({ action, params });
  // Compat reads: legacy keeps its /-_-api/v1 spelling; yoram maps to the
  // migrated RESTful path (restful-uri-mapping v1).
  const watchers = MERGED_DEFINITIONS["list-post-watchers"].translateYoram(
    step("list-post-watchers", { owner: "admin", project: "sample", postNumber: 1 }),
    {},
  );
  assert.equal(watchers.path, "/api/v1/owners/admin/projects/sample/posts/1/watchers");
  assert.equal(watchers.pagePath, "/api/v1/owners/admin/projects/sample/posts/1/watchers");
  assert.equal(
    MERGED_DEFINITIONS["list-post-watchers"].translateLegacy(step("list-post-watchers", { owner: "admin", project: "sample", postNumber: 1 }), {}).path,
    "/-_-api/v1/owners/admin/projects/sample/posts/1/watchers",
  );
});

test("leave-info is compared as a manual redirect, never as a DOM page", () => {
  const step = { action: "view-project-leave-info", params: { owner: "admin", project: "sample" } };
  assert.deepEqual(MERGED_DEFINITIONS[step.action].translateLegacy(step), {
    method: "GET",
    path: "/info/leave/admin/sample",
    redirect: "manual",
  });
  assert.deepEqual(MERGED_DEFINITIONS[step.action].translateYoram(step), {
    method: "GET",
    path: "/info/leave/admin/sample",
    redirect: "manual",
  });
  assert.notEqual(
    MERGED_DEFINITIONS[step.action].handler,
    MERGED_DEFINITIONS["view-project"].handler,
    "redirect action must not render a page",
  );
});

test("project reviews DOM comparison scopes to the shared content root", async () => {
  let target;
  const step = { action: "list-review-threads", params: { owner: "admin", project: "sample" } };
  await MERGED_DEFINITIONS[step.action].handler({
    step,
    resolved: {},
    options: { legacyUrl: "http://legacy.test" },
    yoramBaseUrl: "http://yoram.test",
    helpers: {
      async requestBoth() {
        return { legacyResult: { status: 200 }, yoramResult: { status: 200 } };
      },
      async renderDomTarget(_ctx, domTarget) {
        target = domTarget;
      },
    },
  });
  assert.equal(target.selector, ".project-page-wrap");
  assert.equal(target.spa, true);
});

test("matchBehaviors returns non-empty B-id lists for every scenario", () => {
  for (const scenario of scenarios) {
    const ids = matchBehaviors(scenario, inventory);
    assert.ok(ids.length > 0, `${scenario.id}: no behaviors matched`);
  }
});

test("distinct covered B-id count meets target (>= 95)", () => {
  const all = new Set(scenarios.flatMap((scenario) => matchBehaviors(scenario, inventory)));
  assert.ok(all.size >= 95, `distinct B-id coverage ${all.size} < 95: ${[...all].join(", ")}`);
});

const WAVE3_SCENARIO_IDS = [
  "P18-throwaway-project-lifecycle",
  "P19-missing-entity-probes",
  "P20-attachment-file-lifecycle",
  "P21-user-compat-api-probes",
  "T1-pr-restore-cycle",
];

// Behaviors these wave-3 scenarios must claim; all were uncovered before the
// wave (verified against the full-registry union computed before this change).
const WAVE3_REQUIRED_IDS = [
  "B-0004", "B-0012", "B-0030", "B-0121", "B-0122", "B-0150",
  "B-0184", "B-0204", "B-0231", "B-0239", "B-0255", "B-0267", "B-0272",
  "B-0273", "B-0274", "B-0284", "B-0313",
];

test("wave-3 lifecycle scenarios claim their targeted behavior set", () => {
  const wave3 = scenarios.filter((scenario) => WAVE3_SCENARIO_IDS.includes(scenario.id));
  assert.deepEqual(wave3.map((s) => s.id).sort(), [...WAVE3_SCENARIO_IDS].sort());
  const claimed = new Set(wave3.flatMap((scenario) => matchBehaviors(scenario, inventory)));
  for (const id of WAVE3_REQUIRED_IDS) {
    assert.ok(claimed.has(id), `wave-3 scenarios miss ${id}`);
  }
  // None of the targeted ids may be claimed by a non-wave-3 scenario too —
  // they are this domain's exclusive NEW coverage.
  const others = scenarios.filter((scenario) => !WAVE3_SCENARIO_IDS.includes(scenario.id));
  const claimedElsewhere = new Set(others.flatMap((scenario) => matchBehaviors(scenario, inventory)));
  for (const id of WAVE3_REQUIRED_IDS) {
    assert.ok(!claimedElsewhere.has(id), `${id} is also claimed by a pre-existing scenario`);
  }
});

// Destructive lifecycle actions may never name a static target project: they
// operate on state-created projects inside their dedicated scenarios.
const THROWAWAY_ONLY_ACTIONS = new Set([
  "copy-labels",
  "add-created-member",
  "edit-created-member",
  "update-created-setting",
  "request-project-transfer",
  "delete-project",
  "fork-created-project",
  "clone-created-project",
  "change-created-project-vcs",
  "cleanup-created-projects",
  "site-purge-created-project",
]);

test("throwaway-only mutations are confined to their lifecycle scenarios without static targets", () => {
  for (const scenario of scenarios) {
    const uses = scenario.actions.filter((a) => THROWAWAY_ONLY_ACTIONS.has(a.action));
    if (uses.length === 0) continue;
    assert.ok(
      /^(P18-throwaway|P23-wave-d|P24-site-project)/u.test(scenario.id),
      `${scenario.id}: throwaway-only action used outside a lifecycle scenario`,
    );
    for (const step of uses) {
      assert.equal(step.params.project, undefined, `${scenario.id}/${step.action}: static project target forbidden`);
      assert.equal(step.params.owner, "admin", `${scenario.id}/${step.action}: unexpected owner`);
    }
  }
  const p18 = scenarios.find((scenario) => scenario.id === "P18-throwaway-project-lifecycle");
  assert.ok(p18, "P18 lifecycle scenario missing");
  assert.ok(p18.actions.some((a) => a.action === "create-project"), "P18 must create its throwaway project");
  assert.ok(p18.actions[p18.actions.length - 1].action === "delete-project", "P18 must end by deleting the throwaway project");
});


test("mutation actions avoid forbidden destructive routes", () => {
  const forbidden = [
    // delete/transfer and Wave D project mutations hit state-created
    // throwaways only (enforced by the confinement test above).
    { method: "DELETE", pathPattern: /^\/o\/p\/delete$/, exempt: new Set(["delete-project", "cleanup-created-projects"]) },
    { method: "PUT", pathPattern: /^\/o\/p\/transfer$/, exempt: new Set(["request-project-transfer"]) },
    { method: "POST", pathPattern: /\/changeVCS$/, exempt: new Set(["change-created-project-vcs"]) },
    { method: "POST", pathPattern: /\/fork$/, exempt: new Set(["fork-created-project"]) },
    { method: "POST", pathPattern: /\/clone$/, exempt: new Set(["clone-created-project"]) },
  ];
  const resolved = { title: "t", body: "b", content: "c", dueDate: "2026-12-31", overview: "ov", name: "n", category: "cat", loginId: "bob", phase: "labels", payloadUrl: "u", original: "o" };
  const probe = (action) => ({ action, params: { owner: "o", project: "p", milestoneId: 1, postNumber: 1, commentId: 1, labelId: 1, webhookId: 1, userId: 1, issueNumber: 1, loginId: "bob", query: "x", missing: "page" } });
  for (const scenario of scenarios) {
    for (const stepAction of scenario.actions.map((a) => a.action)) {
      if (stepAction === "login") continue;
      const def = MERGED_DEFINITIONS[stepAction];
      for (const translate of [def.translateLegacy, def.translateYoram]) {
        const t = translate(probe(stepAction), resolved);
        for (const rule of forbidden) {
          if (rule.exempt?.has(stepAction)) continue;
          const hit = t.method === rule.method && rule.pathPattern.test(t.path);
          assert.ok(!hit, `${stepAction}: forbidden ${rule.method} ${t.path}`);
        }
      }
    }
  }
});

test("mutation translators produce expected method/path literals", () => {
  const resolved = { title: "t", body: "b", content: "c", dueDate: "2026-12-31", milestoneId: 7, postNumber: 3, commentId: 5, labelId: 9, webhookId: 11, userId: 13, overview: "ov", name: "n", category: "cat", loginId: "bob", issueNumber: 17, phase: "labels", payloadUrl: "u", original: "o", attachmentId: 21, prId: 31, probeName: "pn", destination: "alice" };
  const step = (action, params) => ({ action, params });
  const cases = [
    ["create-milestone", "translateLegacy", { method: "POST", path: "/o/p/milestones" }],
    ["create-milestone", "translateYoram", { method: "POST", path: "/api/v1/owners/o/projects/p/milestones" }],
    ["edit-milestone", "translateLegacy", { method: "POST", path: "/o/p/milestone/7/edit" }],
    ["edit-milestone", "translateYoram", { method: "PATCH", path: "/api/v1/owners/o/projects/p/milestones/7" }],
    ["close-milestone", "translateLegacy", { method: "POST", path: "/o/p/milestone/7/close" }],
    ["close-milestone", "translateYoram", { method: "PATCH", path: "/api/v1/owners/o/projects/p/milestones/7/state" }],
    ["open-milestone", "translateYoram", { method: "PATCH", path: "/api/v1/owners/o/projects/p/milestones/7/state" }],
    ["create-milestone-api", "translateYoram", { method: "POST", path: "/api/v1/owners/o/projects/p/milestones/bulk" }],
    ["create-milestone-api", "translateLegacy", { method: "POST", path: "/-_-api/v1/owners/o/projects/p/milestones" }],
    ["create-post", "translateLegacy", { method: "POST", path: "/o/p/posts" }],
    ["create-post", "translateYoram", { method: "POST", path: "/api/v1/projects/o/p/posts" }],
    ["edit-post", "translateLegacy", { method: "POST", path: "/o/p/post/3/edit" }],
    ["edit-post", "translateYoram", { method: "PATCH", path: "/api/v1/projects/o/p/posts/3" }],
    ["patch-post-content-api", "translateLegacy", { method: "PATCH", path: "/-_-api/v1/owners/o/projects/p/posts/3/content" }],
    ["patch-post-content-api", "translateYoram", { method: "PATCH", path: "/api/v1/owners/o/projects/p/posts/3/content" }],
    ["set-post-labels-api", "translateLegacy", { method: "POST", path: "/-_-api/v1/owners/o/projects/p/postlabel/0" }],
    ["create-post-comment", "translateLegacy", { method: "POST", path: "/o/p/post/3/comment" }],
    ["create-post-comment", "translateYoram", { method: "POST", path: "/api/v1/projects/o/p/posts/3/comments" }],
    ["update-post-comment", "translateLegacy", { method: "POST", path: "/o/p/post/3/comment/5" }],
    ["update-post-comment", "translateYoram", { method: "PATCH", path: "/api/v1/projects/o/p/posts/3/comments/5" }],
    ["patch-post-comment-api", "translateLegacy", { method: "PATCH", path: "/o/p/post/3/comment/5" }],
    ["patch-post-comment-api", "translateYoram", { method: "PATCH", path: "/o/p/post/3/comment/5" }],
    ["delete-post-comment", "translateLegacy", { method: "DELETE", path: "/o/p/post/3/comment/5/delete" }],
    ["delete-post-comment", "translateYoram", { method: "DELETE", path: "/api/v1/projects/o/p/posts/3/comments/5" }],
    ["create-post-api", "translateLegacy", { method: "POST", path: "/-_-api/v1/owners/o/projects/p/posts" }],
    ["delete-post", "translateLegacy", { method: "DELETE", path: "/o/p/post/3/delete" }],
    ["delete-post", "translateYoram", { method: "DELETE", path: "/api/v1/projects/o/p/posts/3" }],
    ["create-webhook", "translateLegacy", { method: "POST", path: "/o/p/webhooks" }],
    ["create-webhook", "translateYoram", { method: "POST", path: "/api/v1/owners/o/projects/p/webhooks" }],
    ["delete-webhook", "translateLegacy", { method: "DELETE", path: "/o/p/webhooks/11" }],
    ["delete-webhook", "translateYoram", { method: "DELETE", path: "/api/v1/owners/o/projects/p/webhooks/11" }],
    ["watch-project", "translateLegacy", { method: "POST", path: "/o/p/watch" }],
    ["watch-project", "translateYoram", { method: "POST", path: "/o/p/watch" }],
    ["unwatch-project", "translateLegacy", { method: "POST", path: "/o/p/unwatch" }],
    ["attach-project-label", "translateLegacy", { method: "POST", path: "/o/p/labels" }],
    ["detach-project-label", "translateLegacy", { method: "POST", path: "/o/p/labels/9" }],
    ["detach-project-label", "translateYoram", { method: "POST", path: "/o/p/labels/9" }],
    ["create-label-api", "translateLegacy", { method: "POST", path: "/-_-api/v1/owners/o/projects/p/labels" }],
    ["add-project-member", "translateLegacy", { method: "POST", path: "/o/p/members" }],
    ["remove-project-member", "translateLegacy", { method: "DELETE", path: "/o/p/member/13/delete" }],
    ["remove-project-member", "translateYoram", { method: "DELETE", path: "/o/p/member/13/delete" }],
    ["update-project-overview", "translateLegacy", { method: "PUT", path: "/o/p" }],
    ["update-project-overview", "translateYoram", { method: "PUT", path: "/o/p" }],
    ["render-markdown-preview", "translateLegacy", { method: "POST", path: "/markdown/o/p" }],
    ["render-markdown-preview", "translateYoram", { method: "POST", path: "/markdown/o/p" }],
    ["enroll-project", "translateLegacy", { method: "POST", path: "/o/p/enroll" }],
    ["cancel-enroll-project", "translateYoram", { method: "POST", path: "/o/p/cancel/enroll" }],
    ["set-issue-labels-api", "translateLegacy", { method: "POST", path: "/-_-api/v1/owners/o/projects/p/issuelabel/17" }],
    ["set-issue-labels-api", "translateYoram", { method: "POST", path: "/api/v1/owners/o/projects/p/issues/17/labels" }],
    ["fetch-project-exports", { owner: "o", project: "p" }, "/-_-api/v1/owners/o/projects/p/exports"],
    ["list-review-threads", { owner: "o", project: "p" }, "/o/p/reviews"],
    ["view-project-leave-info", { owner: "o", project: "p" }, "/info/leave/o/p"],
    ["view-migration-hub", {}, "/migration"],
    ["export-migration-project", { owner: "o", project: "p" }, "/migration/o/projects/p"],
    ["export-migration-issue-label-pairs", { owner: "o", project: "p" }, "/migration/o/projects/p/issuelabel"],
    ["export-migration-issues", { owner: "o", project: "p" }, "/migration/o/projects/p/issues"],
    ["export-migration-labels", { owner: "o", project: "p" }, "/migration/o/projects/p/labels"],
    ["export-migration-milestones", { owner: "o", project: "p" }, "/migration/o/projects/p/milestones"],
    ["export-migration-posts", { owner: "o", project: "p" }, "/migration/o/projects/p/posts"],
    ["export-migration-projects-list", {}, "/migration/projects"],
    ["fetch-attachment-list", {}, "/files"],
    ["fetch-unknown-path", { owner: "o", project: "p", missing: "page" }, "/o/p/parity-missing-page"],
    ["fetch-git-info-refs", { owner: "o", project: "p" }, "/o/p/info/refs"],
    ["create-project", "translateLegacy", { method: "POST", path: "/projects" }],
    ["create-project", "translateYoram", { method: "POST", path: "/api/v1/owners/o/projects" }],
    ["copy-labels", "translateLegacy", { method: "POST", path: "/o/p/copyLabels" }],
    ["copy-labels", "translateYoram", { method: "POST", path: "/o/p/copyLabels" }],
    ["add-created-member", "translateLegacy", { method: "POST", path: "/o/p/members" }],
    ["add-created-member", "translateYoram", { method: "POST", path: "/o/p/members" }],
    ["edit-created-member", "translateLegacy", { method: "POST", path: "/o/p/member/13/edit" }],
    ["edit-created-member", "translateYoram", { method: "POST", path: "/o/p/member/13/edit" }],
    ["update-created-setting", "translateLegacy", { method: "POST", path: "/o/p/setting" }],
    ["update-created-setting", "translateYoram", { method: "PATCH", path: "/api/v1/owners/o/projects/p" }],
    ["request-project-transfer", "translateLegacy", { method: "PUT", path: "/o/p/transfer?owner=alice" }],
    ["request-project-transfer", "translateYoram", { method: "PUT", path: "/o/p/transfer?owner=alice" }],
    ["delete-project", "translateLegacy", { method: "DELETE", path: "/o/p/delete" }],
    ["delete-project", "translateYoram", { method: "DELETE", path: "/api/v1/owners/o/projects/p" }],
    ["delete-missing-pushed-branch", "translateLegacy", { method: "DELETE", path: "/o/p/pushedBranch/999999999/delete" }],
    ["delete-missing-pushed-branch", "translateYoram", { method: "DELETE", path: "/o/p/pushedBranch/999999999/delete" }],
    ["probe-transfer-accept-missing", "translateLegacy", { method: "GET", path: "/project/transfer/999999999/deadbeef" }],
    ["probe-transfer-accept-missing", "translateYoram", { method: "GET", path: "/project/transfer/999999999/deadbeef" }],
    ["upload-attachment", "translateLegacy", { method: "POST", path: "/files" }],
    ["upload-attachment", "translateYoram", { method: "POST", path: "/files" }],
    ["get-attachment", "translateLegacy", { method: "GET", path: "/files/21" }],
    ["get-attachment", "translateYoram", { method: "GET", path: "/files/21" }],
    ["get-attachment-trailing", "translateLegacy", { method: "GET", path: "/files/21/" }],
    ["get-attachment-trailing", "translateYoram", { method: "GET", path: "/files/21/" }],
    ["delete-attachment", "translateLegacy", { method: "POST", path: "/files/21" }],
    ["delete-attachment", "translateYoram", { method: "POST", path: "/files/21" }],
    ["probe-user-isused", "translateLegacy", { method: "GET", path: "/user/isUsed?name=pn" }],
    ["probe-user-isused", "translateYoram", { method: "GET", path: "/user/isUsed?name=pn" }],
    ["probe-admin-users", "translateLegacy", { method: "GET", path: "/-_-api/v1/admin/users" }],
    ["probe-admin-users", "translateYoram", { method: "GET", path: "/api/v1/admin/users" }],
    ["restore-closed-pullrequest", "translateLegacy", { method: "POST", path: "/o/p/pullRequest/31/restorefrombranch" }],
    ["restore-closed-pullrequest", "translateYoram", { method: "POST", path: "/o/p/pullRequest/31/restorefrombranch" }],
    ["close-restored-pullrequest", "translateLegacy", { method: "POST", path: "/o/p/pullRequest/31/close" }],
    ["close-restored-pullrequest", "translateYoram", { method: "POST", path: "/o/p/pullRequest/31/close" }],
  ];
  for (const [action, kind, expected] of cases) {
    const def = MERGED_DEFINITIONS[action];
    assert.ok(def, `${action} missing`);
    if (typeof kind === "string") {
      const t = def[kind](step(action, expected.params ?? { owner: "o", project: "p" }), resolved);
      assert.equal(t.method, expected.method, `${action}/${kind} method`);
      assert.equal(t.path, expected.path, `${action}/${kind} path`);
    } else {
      const t = def.translateLegacy(step(action, kind), {});
      assert.deepEqual(
        t,
        { method: "GET", path: expected, ...(action === "view-project-leave-info" ? { redirect: "manual" } : {}) },
        `${action} read translation`,
      );
    }
  }
});
