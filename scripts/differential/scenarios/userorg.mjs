// User/Org domain: /user/issues tabs, notifications, global search, orgs,
// user profile/files — all READ-ONLY page/API reads and their definitions.
//
// Domain module contract (see scenarios/index.mjs).
import { translateLegacy, translateYoram } from "../adapters.mjs";

export const scenarios = [
  {
    id: "U1-user-issues-tabs",
    title: "list my issues per state tab",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-user-issues", params: { tab: "assigned" } },
      { actor: "admin", action: "view-user-issues", params: { tab: "authored" } },
      { actor: "admin", action: "view-user-issues", params: { tab: "commented" } },
      { actor: "admin", action: "view-user-issues", params: { tab: "mentioned" } },
      { actor: "admin", action: "view-user-issues", params: { tab: "shared" } },
      { actor: "admin", action: "view-user-issues", params: {} },
    ],
    behaviorMatcher: { action: /^IssueApp\.userIssues(Page)?$/, route: /^GET \/user\/issues$/ },
  },
  {
    id: "U2-user-issues-compat-api",
    title: "read legacy-compat user issues api",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "get-user-issues-compat", params: {} },
    ],
    behaviorMatcher: { action: /^UserApi\.getIssuesByUser$/ },
  },
  {
    id: "U3-notifications-list",
    title: "list notifications (both legacy spellings)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-notifications", params: {} },
      { actor: "admin", action: "view-notifications", params: { path: "/notification" } },
    ],
    // learnmore expand has no inventory row; the list pages carry the coverage.
    behaviorMatcher: { action: /^(NotificationApp|Application)\.notifications$/, route: /^GET \/notifications?$/ },
  },
  {
    id: "U4-global-search",
    title: "global search results page",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-global-search", params: { query: "sample" } },
    ],
    behaviorMatcher: { action: /^SearchApp\.searchInAll$/, route: /^GET \/search$/ },
  },
  {
    id: "U5-orgs-list",
    title: "list organizations",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-orgs-list", params: {} },
    ],
    behaviorMatcher: { action: /^OrganizationApp\.orgList$/, route: /^GET \/orgs$/ },
  },
  {
    id: "U6-org-home",
    title: "view organization home",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-org-home", params: { organization: "weblabs" } },
    ],
    behaviorMatcher: { action: /^OrganizationApp\.organization$/, route: /^GET \/organizations\/:organizationName$/ },
  },
  {
    id: "U7-user-profile",
    title: "view user profile page",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-user-profile", params: { user: "admin" } },
    ],
    behaviorMatcher: { action: /^UserApp\.userInfo$/, route: /^GET \/:user$/ },
  },
  {
    id: "U8-user-files",
    title: "view user files page",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-user-files", params: {} },
    ],
    behaviorMatcher: { action: /^UserApp\.userFiles$/, route: /^GET \/user\/files$/ },
  },
  {
    id: "U9-new-direct-issue-forms",
    title: "view new direct issue forms (mine/all)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-new-direct-issue-form", params: {} },
      { actor: "admin", action: "view-new-direct-issue-form", params: { mine: true } },
    ],
    behaviorMatcher: { action: /^IssueApp\.newDirect(My)?IssueForm$/, route: /^GET \/user\/issues\/new/ },
  },
  {
    id: "U10-user-statistics-api",
    title: "read user statistics api",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "get-user-statistics", params: { user: "admin" } },
    ],
    behaviorMatcher: { action: /^UserApi\.statistics$/ },
  },
];

const withQuery = (base, query) => (query ? `${base}?${query}` : base);

// Shared read-page handler: translate + request both sides, then skeleton-diff
// the same page path on both sides (Yoram serves it through its SPA shell).
async function readPageHandler(ctx) {
  const { step, resolved, options, yoramBaseUrl, helpers } = ctx;
  await helpers.requestBoth(ctx, translateLegacy(step, resolved), translateYoram(step, resolved));
  const target = step.action === "view-user-profile" ? `/${step.params.user}` : pageTargets[step.action](step.params);
  if (!target) return;
  await helpers.renderDomTarget(ctx, {
    legacy: `${options.legacyUrl}${target}`,
    yoram: `${yoramBaseUrl}${target}`,
    spa: true,
  });
}

// Pure-API read handler: no DOM comparison.
async function readApiHandler(ctx) {
  const { step, resolved, helpers } = ctx;
  await helpers.requestBoth(ctx, translateLegacy(step, resolved), translateYoram(step, resolved));
}

// Page path each DOM-compared action renders; identical on both sides because
// Yoram serves these screens via the SPA shell at the legacy direct routes.
const pageTargets = {
  "view-user-issues": (params) => withQuery("/user/issues", params.tab && `tab=${params.tab}`),
  "view-notifications": (params) => params.path ?? "/notifications",
  "view-global-search": (params) => withQuery("/search", params.query && `query=${encodeURIComponent(params.query)}`),
  "view-orgs-list": () => "/orgs",
  "view-org-home": (params) => `/organizations/${params.organization}`,
  "view-user-files": () => "/user/files",
  "view-new-direct-issue-form": (params) => (params.mine ? "/user/issues/new/mine" : "/user/issues/new"),
};

export const actionDefinitions = {
  "view-user-issues": {
    translateLegacy(step) {
      return { method: "GET", path: withQuery("/user/issues", step.params.tab && `tab=${step.params.tab}`) };
    },
    translateYoram(step) {
      const query = step.params.tab && `tab=${step.params.tab}`;
      return { method: "GET", path: withQuery("/api/v1/user/issues", query), pagePath: withQuery("/user/issues", query) };
    },
    handler: readPageHandler,
  },

  "get-user-issues-compat": {
    // legacy external namespace /-_-api/v1/* is mirrored under Yoram /api/v1.
    translateLegacy() {
      return { method: "GET", path: "/-_-api/v1/user/issues" };
    },
    translateYoram() {
      return { method: "GET", path: "/api/v1/-_-api/v1/user/issues" };
    },
    handler: readApiHandler,
  },

  "view-notifications": {
    translateLegacy(step) {
      return { method: "GET", path: step.params.path ?? "/notifications" };
    },
    translateYoram(step) {
      return { method: "GET", path: "/api/v1/notifications", pagePath: step.params.path ?? "/notifications" };
    },
    handler: readPageHandler,
  },

  "view-global-search": {
    translateLegacy(step) {
      return { method: "GET", path: withQuery("/search", step.params.query && `query=${encodeURIComponent(step.params.query)}`) };
    },
    translateYoram(step) {
      const query = step.params.query && `query=${encodeURIComponent(step.params.query)}`;
      return { method: "GET", path: withQuery("/api/v1/search", query), pagePath: withQuery("/search", query) };
    },
    handler: readPageHandler,
  },

  "view-orgs-list": {
    translateLegacy() {
      return { method: "GET", path: "/orgs" };
    },
    translateYoram() {
      return { method: "GET", path: "/api/v1/organizations", pagePath: "/orgs" };
    },
    handler: readPageHandler,
  },

  "view-org-home": {
    translateLegacy(step) {
      return { method: "GET", path: `/organizations/${step.params.organization}` };
    },
    translateYoram(step) {
      return {
        method: "GET",
        path: `/api/v1/organizations/${step.params.organization}`,
        pagePath: `/organizations/${step.params.organization}`,
      };
    },
    handler: readPageHandler,
  },

  "view-user-profile": {
    translateLegacy(step) {
      return { method: "GET", path: `/${step.params.user}` };
    },
    translateYoram(step) {
      return { method: "GET", path: `/api/v1/users/${step.params.user}/profile`, pagePath: `/${step.params.user}` };
    },
    handler: readPageHandler,
  },

  "view-user-files": {
    // Yoram serves this screen via SPA shell at the legacy direct route.
    translateLegacy() {
      return { method: "GET", path: "/user/files" };
    },
    translateYoram() {
      return { method: "GET", path: "/user/files" };
    },
    handler: readPageHandler,
  },

  "view-new-direct-issue-form": {
    translateLegacy(step) {
      return { method: "GET", path: step.params.mine ? "/user/issues/new/mine" : "/user/issues/new" };
    },
    translateYoram(step) {
      return { method: "GET", path: step.params.mine ? "/user/issues/new/mine" : "/user/issues/new" };
    },
    handler: readPageHandler,
  },

  "get-user-statistics": {
    translateLegacy(step) {
      return { method: "GET", path: `/-_-api/v1/users/${step.params.user}/statistics` };
    },
    translateYoram(step) {
      return { method: "GET", path: `/api/v1/users/${step.params.user}/statistics` };
    },
    handler: readApiHandler,
  },
};
