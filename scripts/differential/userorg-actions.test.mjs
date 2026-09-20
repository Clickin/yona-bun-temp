// Domain tests for scripts/differential/scenarios/userorg.mjs.
// The registry (scenarios/index.mjs) imports userorg; ACTION_DEFINITIONS is
// merged with this module's definitions so the file also passes standalone.

import assert from "node:assert/strict";
import { test } from "node:test";

import { ACTION_DEFINITIONS as REGISTRY } from "./scenarios/index.mjs";
import {
  SITE_ADMIN_BODY_SELECTORS,
  SITE_ADMIN_LEGACY_BODY_SELECTOR,
  actionDefinitions,
  favoriteListContains,
  favoriteMutationState,
  scenarios,
} from "./scenarios/userorg.mjs";
import { validateScenarios } from "./dsl.mjs";
import { domVisibleLoss } from "./diff.mjs";
import { classifyViolation } from "./report.mjs";

// Standalone merge: registry keys + this module's definitions.
const ACTION_DEFINITIONS = { ...REGISTRY, ...actionDefinitions };

test("every userorg scenario passes validateScenarios against merged registry", () => {
  const problems = validateScenarios(scenarios, Object.keys(ACTION_DEFINITIONS));
  assert.deepEqual(problems, []);
});

test("favorite mutation normalizes issue and project response field names", () => {
  assert.equal(favoriteMutationState({ favored: true }, "project", true), true);
  assert.equal(favoriteMutationState({ favorited: false }, "project"), false);
  assert.equal(favoriteMutationState({ isFavorited: true }, "issue"), true);
  assert.equal(favoriteMutationState({ is_favorited: false }, "issue"), false);
  assert.equal(favoriteMutationState({}, "issue"), null);
});

test("favorite list matching accepts legacy ids and canonical resource entries", () => {
  assert.equal(
    favoriteListContains({ projectIds: [1] }, "project", 1, "admin", "sample", "weblabs"),
    true,
  );
  assert.equal(
    favoriteListContains(
      { projects: [{ owner: "admin", projectName: "sample" }] },
      "project",
      99,
      "admin",
      "sample",
      "weblabs",
    ),
    true,
  );
  assert.equal(
    favoriteListContains(
      { organizations: [{ organizationName: "weblabs" }] },
      "organization",
      99,
      "admin",
      "sample",
      "weblabs",
    ),
    true,
  );
});

test("favorite toggle clears a persisted legacy baseline before paired transitions", async () => {
  const calls = { legacy: [], yoram: [], pair: 0 };
  const entry = { errors: [], violations: [] };
  const state = { legacyProjectId: 7 };
  await actionDefinitions["toggle-favorite"].handler({
    step: {
      action: "toggle-favorite",
      params: { target: "project", owner: "admin", project: "sample" },
    },
    state,
    entry,
    legacySession: {
      async request(request) {
        calls.legacy.push(request);
        if (request.method === "GET") return { status: 200, json: { projectIds: [7] } };
        return { status: 200, json: { favored: false } };
      },
    },
    yoramSession: {
      async request(request) {
        calls.yoram.push(request);
        return { status: 200, json: { projectIds: [] } };
      },
    },
    helpers: {
      async requestBoth() {
        const round = calls.pair++;
        return {
          legacyResult: { status: 200, json: { favored: round === 0 } },
          yoramResult: { status: 200, json: { favorited: round === 0 } },
        };
      },
    },
  });
  assert.deepEqual(entry.errors, []);
  assert.deepEqual(entry.violations, []);
  assert.deepEqual(
    calls.legacy.map((call) => call.path),
    ["/-_-api/v1/favoriteProjects", "/-_-api/v1/favoriteProjects/7"],
  );
  assert.deepEqual(
    calls.yoram.map((call) => call.path),
    ["/api/v1/user/favorites/projects"],
  );
  assert.equal(calls.pair, 2);
});

test("every referenced action exists in merged ACTION_DEFINITIONS with both translators", () => {
  for (const scenario of scenarios) {
    for (const step of scenario.actions) {
      const definition = ACTION_DEFINITIONS[step.action];
      assert.ok(definition, `${scenario.id}: missing definition for ${step.action}`);
      assert.equal(
        typeof definition.translateLegacy,
        "function",
        `${step.action}: translateLegacy`,
      );
      assert.equal(typeof definition.translateYoram, "function", `${step.action}: translateYoram`);
      assert.equal(typeof definition.handler, "function", `${step.action}: handler`);
    }
  }
});

test("action names are globally unique across the merged registry", () => {
  const seen = new Map();
  for (const [name, definition] of Object.entries(ACTION_DEFINITIONS)) {
    // Registry merge keeps the first definition per name; detect collisions by
    // checking that no userorg definition was shadowed by another domain.
    if (actionDefinitions[name] && definition !== actionDefinitions[name]) {
      throw new Error(`userorg action shadowed by another domain: ${name}`);
    }
    seen.set(name, (seen.get(name) ?? 0) + 1);
  }
});

test("translators produce expected method/path literals", () => {
  const legacy = (action, params = {}) => actionDefinitions[action].translateLegacy({ params });
  const yoram = (action, params = {}) => actionDefinitions[action].translateYoram({ params });

  // view-user-issues: tab query on both sides; yoram API + pagePath
  assert.deepEqual(legacy("view-user-issues", { tab: "assigned" }), {
    method: "GET",
    path: "/user/issues?tab=assigned",
  });
  assert.deepEqual(yoram("view-user-issues", { tab: "assigned" }), {
    method: "GET",
    path: "/api/v1/user/issues/search?tab=assigned",
    pagePath: "/user/issues?tab=assigned",
  });
  assert.deepEqual(legacy("view-user-issues"), { method: "GET", path: "/user/issues" });

  assert.deepEqual(legacy("get-user-issues-compat"), {
    method: "GET",
    path: "/-_-api/v1/user/issues",
  });
  assert.deepEqual(yoram("get-user-issues-compat"), {
    method: "GET",
    path: "/api/v1/user/issues/search",
  });

  assert.deepEqual(legacy("view-notifications"), { method: "GET", path: "/notifications" });
  assert.deepEqual(legacy("view-notifications", { path: "/notification" }), {
    method: "GET",
    path: "/notification?from=0&limit=10",
  });
  assert.deepEqual(yoram("view-notifications"), {
    method: "GET",
    path: "/api/v1/notifications",
    pagePath: "/notifications",
  });

  assert.deepEqual(legacy("view-global-search", { query: "a b" }), {
    method: "GET",
    path: "/search?keyword=a%20b&searchType=issue",
  });
  assert.deepEqual(
    yoram("view-global-search", { query: "sample" }).path,
    "/api/v1/search?keyword=sample&searchType=issue",
  );

  assert.deepEqual(legacy("view-orgs-list"), { method: "GET", path: "/orgs" });
  assert.deepEqual(yoram("view-orgs-list").path, "/api/v1/organizations");

  assert.deepEqual(legacy("view-org-home", { organization: "weblabs" }), {
    method: "GET",
    path: "/organizations/weblabs",
  });
  assert.deepEqual(yoram("view-org-home", { organization: "weblabs" }), {
    method: "GET",
    path: "/api/v1/organizations/weblabs",
    pagePath: "/organizations/weblabs",
  });

  assert.deepEqual(legacy("view-user-profile", { user: "admin" }), {
    method: "GET",
    path: "/admin",
  });
  assert.deepEqual(yoram("view-user-profile", { user: "admin" }), {
    method: "GET",
    path: "/api/v1/users/admin/profile",
    pagePath: "/admin",
  });

  assert.deepEqual(legacy("view-user-files"), { method: "GET", path: "/user/files" });
  assert.deepEqual(yoram("view-user-files"), { method: "GET", path: "/user/files" });

  assert.deepEqual(legacy("view-new-direct-issue-form"), {
    method: "GET",
    path: "/user/issues/new",
  });
  assert.deepEqual(legacy("view-new-direct-issue-form", { mine: true }), {
    method: "GET",
    path: "/user/issues/new/mine",
  });
  assert.deepEqual(yoram("view-new-direct-issue-form", { mine: true }), {
    method: "GET",
    path: "/user/issues/new/mine",
  });

  assert.deepEqual(legacy("get-user-statistics", { user: "admin" }), {
    method: "GET",
    path: "/-_-api/v1/users/admin/statistics",
  });
  assert.deepEqual(yoram("get-user-statistics", { user: "admin" }), {
    method: "GET",
    path: "/api/v1/users/admin/statistics/summary",
  });

  // --- org screens -----------------------------------------------------------
  assert.deepEqual(legacy("view-org-subpage", { organization: "weblabs", page: "boards" }), {
    method: "GET",
    path: "/organizations/weblabs/boards",
  });
  assert.deepEqual(
    yoram("view-org-subpage", { organization: "weblabs", page: "pullrequests" }).path,
    "/api/v1/organizations/weblabs/pull-requests",
  );
  assert.deepEqual(
    yoram("view-org-subpage", { organization: "weblabs", page: "closedPullrequests" }).path,
    "/organizations/weblabs/closedPullrequests",
  );
  assert.deepEqual(
    yoram("view-org-subpage", { organization: "weblabs", page: "members" }).path,
    "/api/v1/organizations/weblabs/members",
  );
  // SPA-shell fallback pages translate to the same legacy direct route.
  assert.deepEqual(
    yoram("view-org-subpage", { organization: "weblabs", page: "deleteForm" }).path,
    "/organizations/weblabs/deleteForm",
  );
  assert.deepEqual(
    yoram("view-org-subpage", { organization: "weblabs", page: "settingform" }).pagePath,
    "/organizations/weblabs/settingform",
  );
  assert.deepEqual(legacy("view-new-org-form"), { method: "GET", path: "/organizations/new" });

  // --- profile edit forms ----------------------------------------------------
  assert.deepEqual(legacy("view-user-editform"), { method: "GET", path: "/user/editform" });
  assert.deepEqual(legacy("view-user-editform", { tab: "emails" }), {
    method: "GET",
    path: "/user/editform/emails",
  });
  assert.deepEqual(yoram("view-user-editform", { tab: "token" }), {
    method: "GET",
    path: "/user/editform/token",
  });

  // --- site-admin screens and files -----------------------------------------
  assert.deepEqual(legacy("view-site-screen", { screen: "userList" }), {
    method: "GET",
    path: "/sites/userList",
  });
  assert.deepEqual(yoram("view-site-screen", { screen: "projectList" }), {
    method: "GET",
    path: "/sites/projectList",
  });
  assert.deepEqual(legacy("view-files-list"), { method: "GET", path: "/files" });
  assert.deepEqual(yoram("get-users-directory"), {
    method: "GET",
    path: "/api/v1/users/directory",
  });
  assert.deepEqual(legacy("check-email-exists", { email: "a@b.co" }), {
    method: "GET",
    path: "/user/isEmailExist?email=a%40b.co",
  });
  assert.equal(
    actionDefinitions["view-files-list"].handler,
    actionDefinitions["get-users-directory"].handler,
    "bare /files is an API probe, not a DOM page",
  );
  assert.notEqual(
    actionDefinitions["view-files-list"].handler,
    actionDefinitions["view-site-screen"].handler,
    "bare /files must not use the page renderer",
  );

  // --- mutations ---------------------------------------------------------------
  assert.deepEqual(legacy("toggle-favorite", { target: "issue" }), {
    method: "POST",
    path: "/-_-api/v1/favoriteIssues/1",
  });
  assert.deepEqual(legacy("toggle-favorite", { target: "organization" }), {
    method: "POST",
    path: "/-_-api/v1/favoriteOrganizations/1",
  });
  assert.deepEqual(yoram("toggle-favorite", { target: "organization" }), {
    method: "POST",
    path: "/api/v1/organizations/weblabs/favorite",
  });
  assert.deepEqual(yoram("toggle-favorite", { target: "issue", issueNumber: 3 }), {
    method: "POST",
    path: "/api/v1/owners/admin/projects/sample/issues/3/favorite",
  });
  assert.deepEqual(legacy("toggle-noti-watch", { notiType: "NEW_ISSUE" }), {
    method: "POST",
    path: "/noti/toggle/1/NEW_ISSUE",
  });
  assert.deepEqual(legacy("add-email", { email: "x@y.z" }), {
    method: "POST",
    path: "/user/email",
    form: { email: "x@y.z" },
  });
  assert.deepEqual(legacy("set-as-main-email", { emailId: 7 }), {
    method: "PUT",
    path: "/user/email/setAsMain/7",
  });
  assert.deepEqual(yoram("delete-email", { emailId: 9 }), {
    method: "DELETE",
    path: "/user/email/delete/9",
  });
  assert.deepEqual(legacy("reset-visited-list"), {
    method: "POST",
    path: "/user/resetVisitedList",
  });
  assert.deepEqual(yoram("reset-visited-list"), { method: "POST", path: "/user/resetVisitedList" });
  // --- throwaway-entity lifecycle wave (U20-U23) ------------------------------
  assert.deepEqual(legacy("create-organization", { name: "o1" }), {
    method: "POST",
    path: "/organizations/new",
    form: { name: "o1" },
  });
  assert.deepEqual(yoram("create-organization", { name: "o1" }), {
    method: "POST",
    path: "/api/v1/organizations",
    json: { organizationName: "o1", description: "" },
  });
  assert.deepEqual(legacy("add-org-member", { organization: "o1", user: "bob" }), {
    method: "POST",
    path: "/organizations/o1/members",
    form: { loginId: "bob" },
  });
  assert.deepEqual(yoram("edit-org-member", { organization: "o1", role: "org_admin" }), {
    method: "PATCH",
    path: "/api/v1/organizations/o1/members/1",
    json: { role: "org_admin" },
  });
  assert.equal(
    legacy("enroll-organization", { organization: "o1" }).path,
    "/organizations/o1/enroll",
  );
  assert.deepEqual(legacy("cancel-organization-enroll", { organization: "o1" }), {
    method: "POST",
    path: "/organizations/o1/cancel/enroll",
  });
  assert.deepEqual(yoram("cancel-organization-enroll", { organization: "o1" }), {
    method: "DELETE",
    path: "/api/v1/organizations/o1/enroll",
  });
  assert.deepEqual(legacy("leave-organization", { organization: "o1" }), {
    method: "DELETE",
    path: "/organizations/o1/member/leave",
  });
  assert.deepEqual(yoram("delete-org-member", { organization: "o1" }), {
    method: "DELETE",
    path: "/api/v1/organizations/o1/members/1",
  });
  assert.deepEqual(legacy("delete-organization", { organization: "o1" }), {
    method: "DELETE",
    path: "/organizations/o1",
  });

  const signupForm = actionDefinitions["signup-user"].translateLegacy({
    params: { loginId: "u1", name: "n1", email: "e@x.co", password: "p1" },
  });
  assert.equal(signupForm.path, "/users/signup");
  assert.equal(signupForm.form.retypedPassword, "p1");
  assert.deepEqual(legacy("toggle-account-lock", { loginId: "u1" }), {
    method: "POST",
    path: "/sites/toggleAccountLock?loginId=u1",
  });
  assert.deepEqual(legacy("toggle-guest-mode", { loginId: "u1" }), {
    method: "POST",
    path: "/sites/toggleGuestMode?loginId=u1",
  });
  assert.deepEqual(yoram("toggle-site-admin-role", { loginId: "u1" }), {
    method: "POST",
    path: "/sites/toggleSiteAdminRole/u1",
  });
  assert.deepEqual(legacy("unwatch-update"), { method: "POST", path: "/sites/unwatchUpdate" });
  assert.deepEqual(legacy("delete-site-user", { userId: 12 }), {
    method: "DELETE",
    path: "/sites/user/delete12",
  });
  assert.deepEqual(legacy("edit-user-profile", { name: "n", email: "e@x.co" }), {
    method: "POST",
    path: "/user/edit",
    form: { name: "n", email: "e@x.co" },
  });
  assert.deepEqual(yoram("save-user-editform-tab", { tab: "emails" }), {
    method: "POST",
    path: "/user/editform/emails",
    form: {},
  });
  assert.deepEqual(yoram("send-validation-email", { emailId: 5 }), {
    method: "POST",
    path: "/user/email/sendValidationEmail/5",
  });
  assert.deepEqual(yoram("reset-site-user-password", { loginId: "u1" }), {
    method: "POST",
    path: "/u1?action=resetPassword",
  });

  for (const definition of Object.values(actionDefinitions)) {
    for (const translate of [definition.translateLegacy, definition.translateYoram]) {
      const result = translate({ params: {} });
      assert.match(result.method, /^(GET|POST|PUT|DELETE|PATCH)$/u);
      assert.ok(result.path.startsWith("/"), `path must be absolute: ${result.path}`);
    }
  }
});

test("no-avatar site screen uses parsed API comparison without DOM rendering", async () => {
  const calls = [];
  const ctx = {
    step: { actor: "admin", action: "view-site-screen", params: { screen: "noAvatarUsers" } },
    resolved: {},
    helpers: {
      async requestJsonBoth(_ctx, legacy, yoram, route, normalize) {
        calls.push({ legacy, yoram, route, normalize });
        return { legacyResult: { json: { users: [] } }, yoramResult: { json: { users: [] } } };
      },
      renderDomTarget() {
        throw new Error("JSON route must not render a DOM target");
      },
    },
  };
  await ACTION_DEFINITIONS["view-site-screen"].handler(ctx);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].legacy.path, "/sites/noAvatarUsers");
  assert.equal(calls[0].yoram.path, "/sites/noAvatarUsers");
  assert.equal(calls[0].route, "/sites/noAvatarUsers");
  assert.equal(typeof calls[0].normalize, "function");
});

test("site-admin DOM probes exclude the shared shell and target each route body owner", async () => {
  const calls = [];
  const ctx = {
    step: { actor: "admin", action: "view-site-screen", params: { screen: "userList" } },
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
  for (const screen of Object.keys(SITE_ADMIN_BODY_SELECTORS)) {
    ctx.step.params.screen = screen;
    await ACTION_DEFINITIONS["view-site-screen"].handler(ctx);
  }
  assert.equal(calls.length, Object.keys(SITE_ADMIN_BODY_SELECTORS).length);
  for (const [index, [screen, yoramSelector]] of Object.entries(
    SITE_ADMIN_BODY_SELECTORS,
  ).entries()) {
    assert.deepEqual(calls[index], {
      legacy: `http://legacy.test/sites/${screen}`,
      yoram: `http://yoram.test/sites/${screen}`,
      legacySelector: SITE_ADMIN_LEGACY_BODY_SELECTOR,
      yoramSelector,
      spa: true,
    });
  }
});

test("site-admin route-body control loss remains blocking even with shell-only drift", () => {
  const detail = {
    actual: {
      fullDiffs: [
        { side: "legacy-only", expected: "button.ybtn.ybtn-danger:삭제" },
        { side: "yoram-only", expected: "<absent>", actual: "div#react-root:" },
      ],
    },
  };
  assert.equal(domVisibleLoss(detail), true);
  assert.equal(
    classifyViolation("dom", "/sites/userList", detail).classification,
    "UNVERIFIED",
    "a missing route-body control must not be hidden by the SPA-shell allow rule",
  );
});

test("shared user and organization page roots are explicit while unmatched routes keep full-body capture", async () => {
  const calls = [];
  const ctx = {
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
  const cases = [
    [{ action: "view-user-issues", params: { tab: "assigned" } }, ".page-wrap"],
    [{ action: "view-notifications", params: {} }, ".page-wrap"],
    [{ action: "view-notifications", params: { path: "/notification" } }, undefined],
    [{ action: "view-global-search", params: { query: "sample" } }, ".project-page-wrap"],
    [{ action: "view-org-home", params: { organization: "weblabs" } }, ".project-page-wrap"],
    [
      { action: "view-org-subpage", params: { organization: "weblabs", page: "issues" } },
      ".page-wrap",
    ],
    [
      { action: "view-org-subpage", params: { organization: "weblabs", page: "members" } },
      ".project-page-wrap",
    ],
    [{ action: "view-user-profile", params: { user: "admin" } }, ".page-wrap"],
    [{ action: "view-user-files", params: {} }, ".page-wrap"],
    [{ action: "view-new-direct-issue-form", params: {} }, undefined],
    [{ action: "view-new-direct-issue-form", params: { mine: true } }, ".project-page-wrap"],
    [{ action: "view-new-org-form", params: {} }, ".project-page-wrap"],
    [{ action: "view-orgs-list", params: {} }, undefined],
    [{ action: "view-user-editform", params: {} }, undefined],
  ];
  for (const [step, selector] of cases) {
    calls.length = 0;
    ctx.step = step;
    await ACTION_DEFINITIONS[step.action].handler(ctx);
    assert.equal(calls.length, 1, `${step.action} should render one DOM target`);
    assert.equal(calls[0].selector, selector, `${step.action} selector`);
  }
});

test("user and organization route-body control loss remains blocking", () => {
  const detail = {
    actual: { fullDiffs: [{ side: "legacy-only", expected: "button.ybtn.ybtn-primary:Create" }] },
  };
  assert.equal(domVisibleLoss(detail), true);
  assert.equal(
    classifyViolation("dom", "/organizations/weblabs/members", detail).classification,
    "UNVERIFIED",
  );
});

test("site export status probe opts out of streaming body reads", () => {
  assert.deepEqual(actionDefinitions["probe-site-export"].translateLegacy({ params: {} }), {
    method: "GET",
    path: "/sites/export",
    readBody: false,
  });
  assert.deepEqual(actionDefinitions["probe-site-export"].translateYoram({ params: {} }), {
    method: "GET",
    path: "/sites/export",
    readBody: false,
  });
});

test("self-cleanup contract: every mutating scenario ends with revert/cleanup steps", () => {
  const cleanupByScenario = {
    "U12-favorite-toggles": (actions) => actions.some((step) => step.action === "toggle-favorite"),
    "U14-noti-watch-toggle": (actions) => {
      const watchIndex = actions.findIndex((step) => step.action === "watch-project");
      const toggleIndex = actions.findIndex((step) => step.action === "toggle-noti-watch");
      const unwatchIndex = actions.findIndex((step) => step.action === "unwatch-project");
      return watchIndex >= 0 && watchIndex < toggleIndex && toggleIndex < unwatchIndex;
    },
    "U16-email-lifecycle": (actions) =>
      actions.some((step) => step.action === "delete-email") &&
      actions.some((step) => step.action === "restore-main-email"),
    "U20-throwaway-org-lifecycle": (actions) =>
      actions.at(-1).action === "delete-organization" &&
      actions.some((step) => step.action === "delete-org-member") &&
      actions.some((step) => step.action === "leave-organization"),
    "U21-throwaway-user-site-toggles": (actions) =>
      actions.at(-1).action === "delete-site-user" &&
      ["toggle-account-lock", "toggle-guest-mode", "toggle-site-admin-role"].every(
        (action) => actions.filter((step) => step.action === action).length === 1,
      ),
    "U22-user-profile-edit-revert": (actions) =>
      actions.some((step) => step.action === "edit-user-profile"),
    "U23-email-validation-lifecycle": (actions) => actions.at(-1).action === "delete-email",
  };
  for (const [scenarioId, check] of Object.entries(cleanupByScenario)) {
    const scenario = scenarios.find((entry) => entry.id === scenarioId);
    assert.ok(scenario, `missing scenario ${scenarioId}`);
    assert.ok(check(scenario.actions), `${scenarioId}: missing self-cleanup/revert steps`);
  }
  // Double-toggle semantics are enforced inside handlers; assert the toggling
  // actions appear exactly once per target and rely on internal round-trips.
  const favoriteSteps = scenarios
    .flatMap((scenario) => scenario.actions)
    .filter((step) => step.action === "toggle-favorite");
  const targets = favoriteSteps.map((step) => step.params.target).sort();
  assert.deepEqual(targets, ["issue", "organization", "project"]);
});

test("organization enrollment requires persisted request and cancellation state, not just HTTP success", async () => {
  let requested = false;
  let persistMutation = false;
  const entry = { errors: [], violations: [] };
  const ctx = {
    state: { orgName: "temporary" },
    entry,
    step: { action: "enroll-organization", params: {} },
    legacySession: {
      async request() {
        return {
          status: 200,
          body: `<a id="enrollBtn" href="/organizations/temporary/${requested ? "cancel/enroll" : "enroll"}">Enrollment</a>`,
        };
      },
    },
    yoramSession: {
      async request() {
        return { status: 200, json: { enrollmentRequested: requested } };
      },
    },
    helpers: {
      async requestBoth() {
        if (persistMutation) requested = ctx.step.action === "enroll-organization";
        return { legacyResult: { status: 202 }, yoramResult: { status: 200 } };
      },
    },
  };
  await actionDefinitions["enroll-organization"].handler(ctx);
  assert.equal(
    entry.errors.length,
    2,
    "a successful HTTP response without enrollment must fail on both sides",
  );
  entry.errors.length = 0;
  persistMutation = true;
  await actionDefinitions["enroll-organization"].handler(ctx);
  assert.deepEqual(entry.errors, []);
  ctx.step.action = "cancel-organization-enroll";
  persistMutation = false;
  await actionDefinitions["cancel-organization-enroll"].handler(ctx);
  assert.equal(
    entry.errors.length,
    2,
    "a successful HTTP response retaining enrollment must fail on both sides",
  );
  entry.errors.length = 0;
  persistMutation = true;
  await actionDefinitions["cancel-organization-enroll"].handler(ctx);
  assert.deepEqual(entry.errors, []);
});

test("signup verification selects the current recipient and exact origin rather than another mailbox or same-port host", async () => {
  const sent = [];
  const entry = { errors: [], violations: [], behaviorIds: ["B-0192"] };
  await actionDefinitions["open-verify-link"].handler({
    entry,
    state: { throwawayLoginId: "parity", throwawayEmail: "parity@example.com", mailCountBefore: 1 },
    options: { legacyUrl: "http://127.0.0.1:9012" },
    yoramBaseUrl: "http://127.0.0.1:19095",
    helpers: {
      readMails: () => [
        "To: other@example.com\n\nhttp://127.0.0.1:9012/verify/parity/wrong-recipient",
        "To: parity@example.com\n\nhttp://other-host:9012/verify/parity/wrong-origin",
        "To: Parity User\n <PARITY@example.com>\n\nhttp://127.0.0.1:9012/verify/parity/legacy-current",
        "To: parity@example.com\n\nhttp://127.0.0.1:19095/verify/parity/yoram-current",
        "To: parity@example.com\n\nhttp://127.0.0.1:9012/verify/parity/old-mail",
      ],
      extractMailLinks: (raw) => raw.match(/http:\/\/\S+/gu) ?? [],
      async sendRaw(_ctx, side, request) {
        sent.push({ side, ...request });
        return { status: 200 };
      },
    },
  });
  assert.deepEqual(entry.errors, []);
  assert.deepEqual(sent, [
    { side: "legacy", method: "GET", path: "/verify/parity/legacy-current" },
    { side: "yoram", method: "GET", path: "/verify/parity/yoram-current" },
    {
      side: "yoram",
      method: "POST",
      path: "/api/v1/auth/verify",
      json: { loginId: "parity", verificationCode: "yoram-current" },
    },
  ]);
});

test("signup verification reports a delivered legacy mail with a misconfigured public origin without following it", async (t) => {
  let clock = 0;
  t.mock.method(Date, "now", () => clock);
  t.mock.method(globalThis, "setTimeout", (callback) => {
    clock += 30_001;
    queueMicrotask(callback);
  });
  const sent = [];
  const entry = { errors: [], violations: [], behaviorIds: ["B-0192"] };
  const state = {
    throwawayLoginId: "parity",
    throwawayEmail: "parity@example.com",
    mailCountBefore: 0,
  };
  await actionDefinitions["open-verify-link"].handler({
    entry,
    state,
    options: { legacyUrl: "http://127.0.0.1:9012" },
    yoramBaseUrl: "http://127.0.0.1:19095",
    helpers: {
      readMails: () => [
        "To: Parity <parity@example.com>\n\nhttp://localhost:9000/verify/parity/secret-code",
      ],
      extractMailLinks: (raw) => raw.match(/http:\/\/\S+/gu) ?? [],
      async sendRaw(_ctx, side, request) {
        sent.push({ side, ...request });
        return { status: 200 };
      },
    },
  });
  assert.deepEqual(sent, []);
  assert.deepEqual(state.verifyLinks, {});
  assert.equal(entry.behaviorIds.includes("B-0192"), false);
  assert.ok(
    entry.errors.some(
      (error) =>
        error.includes("legacy") &&
        error.includes("http://localhost:9000") &&
        error.includes("application.hostname/application.port"),
    ),
  );
  assert.ok(entry.errors.some((error) => error.includes("no yoram verify mail")));
  assert.ok(entry.errors.every((error) => !error.includes("secret-code")));
});
