// User/Org domain: /user/issues tabs, notifications, global search, orgs,
// user profile/files — all READ-ONLY page/API reads and their definitions.
//
// Domain module contract (see scenarios/index.mjs).
import { translateLegacy, translateYoram } from "../adapters.mjs";
import { normalizeApiValue } from "../diff.mjs";
import { violation } from "../report.mjs";

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
      {
        actor: "admin",
        action: "get-user-issues-compat",
        params: {},
        // Legacy external -_-api reads are Authorization-token gated
        // (UserApi.java:295-305); yoram's canonical /api/v1 REST surface
        // serves the React client by session — documented transport
        // difference, the sweep adapter carries sessions not tokens.
        expectedDisposition: {
          classification: "IMPLEMENTATION_DIFFERENCE",
          evidence: "yona-original/app/controllers/api/UserApi.java:295-305 vs AGENTS.md canonical /api/v1 REST contract",
          signature: {
            scenarioId: "U2-user-issues-compat-api",
            action: "get-user-issues-compat",
            behaviorId: "B-0043",
            events: [
              {
                side: "legacy",
                request: { method: "GET", route: "/-_-api/v1/user/issues", payload: null },
                response: { status: 401 },
              },
              {
                side: "yoram",
                request: { method: "GET", route: "/api/v1/user/issues/search", payload: null },
                response: { status: 200 },
              },
            ],
            state: null,
          },
        },
      },
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
  {
    id: "U11-org-screens",
    title: "view organization sub-screens (boards/pullrequests/members/forms/search)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "boards" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "pullrequests" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "closedPullrequests" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "members" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "issues" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "deleteForm" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "settingform" } },
      { actor: "admin", action: "view-org-subpage", params: { organization: "weblabs", page: "search", query: "sample" } },
      { actor: "admin", action: "view-new-org-form", params: {} },
    ],
    behaviorMatcher: {
      action: /^(BoardApp\.organizationBoards|OrganizationApp\.(organizationPullRequests|organizationClosedPullRequests|members|deleteForm|settingForm|newForm)|IssueApp\.organizationIssues|SearchApp\.searchInAGroup)$/,
      route: /^(GET \/organizations\/new)$|(GET \/organizations\/:organizationName(\/(boards|pullrequests|closedPullrequests|members|deleteForm|settingform|issues|search))?$)/,
    },
  },
  {
    id: "U12-favorite-toggles",
    title: "toggle favorite issue/project/organization twice (self-reverting)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "toggle-favorite", params: { target: "issue", owner: "admin", project: "sample", issueNumber: 1 } },
      { actor: "admin", action: "toggle-favorite", params: { target: "project", owner: "admin", project: "sample" } },
      { actor: "admin", action: "toggle-favorite", params: { target: "organization", organization: "weblabs" } },
    ],
    behaviorMatcher: {
      action: /^UserApi\.toggleFoverite(Issue|Project|Organization)$/,
      route: /^POST \/-_-api\/v1\/favorite(Issues|Projects|Organizations)\//,
    },
  },
  {
    id: "U13-favorite-lists-api",
    title: "read favorite issue/project/organization lists",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "get-favorite-lists", params: {} },
    ],
    behaviorMatcher: {
      action: /^UserApi\.getFoverite/,
      route: /^GET \/-_-api\/v1\/favorite/,
    },
  },
  {
    id: "U14-noti-watch-toggle",
    title: "toggle per-project notification watch twice (self-reverting)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "watch-project", params: { owner: "admin", project: "sample" } },
      { actor: "admin", action: "toggle-noti-watch", params: { owner: "admin", project: "sample", notiType: "NEW_ISSUE" } },
      { actor: "admin", action: "unwatch-project", params: { owner: "admin", project: "sample" } },
    ],
    behaviorMatcher: {
      action: /^WatchProjectApp\.toggle$/,
      route: /^POST \/noti\/toggle\//,
    },
  },
  {
    id: "U15-profile-editforms",
    title: "view user edit forms (base + emails/notifications/token tabs)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-user-editform", params: {} },
      { actor: "admin", action: "view-user-editform", params: { tab: "emails" } },
      { actor: "admin", action: "view-user-editform", params: { tab: "notifications" } },
      { actor: "admin", action: "view-user-editform", params: { tab: "token" } },
    ],
    behaviorMatcher: {
      action: /^UserApp\.editUserInfo(Form|ByTabForm)$/,
      route: /^GET \/user\/editform/,
    },
  },
  {
    id: "U16-email-lifecycle",
    title: "add email, set as main, restore main, delete (fully self-cleaning)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "add-email", params: {} },
      { actor: "admin", action: "set-as-main-email", params: {} },
      { actor: "admin", action: "restore-main-email", params: {} },
      { actor: "admin", action: "delete-email", params: {} },
    ],
    behaviorMatcher: {
      action: /^UserApp\.(addEmail|setAsMainEmail|deleteEmail)$/,
      route: /^(POST \/user\/email$|DELETE \/user\/email\/delete|PUT \/user\/email\/setAsMain)/,
    },
  },
  {
    id: "U17-reset-visited-list",
    title: "reset visited project list",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "reset-visited-list", params: {} },
    ],
    behaviorMatcher: {
      action: /^UserApp\.resetUserVisitedList$/,
      route: /^POST \/user\/resetVisitedList$/,
    },
  },
  {
    id: "U18-site-admin-screens",
    title: "view site-admin GET screens (both userList/projectList spellings)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "userList" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "projectList" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "data" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "diagnostic" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "issueList" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "postList" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "noAvatarUsers" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "mail" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "massmail" } },
      { actor: "admin", action: "view-site-screen", params: { screen: "update" } },
    ],
    behaviorMatcher: {
      action: /^SiteApp\.(userList|projectList|data|diagnose|issueList|postList|noAvatarUsers|writeMail|massMail|update)$/,
      route: /^GET \/sites\/(userList|projectList|data|diagnostic|issueList|postList|noAvatarUsers|mail|massmail|update)$/,
    },
  },
  {
    id: "U19-files-and-user-api",
    title: "read attachment files list, user directory, sidebar menus, email existence",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "view-files-list", params: {} },
      { actor: "admin", action: "get-users-directory", params: {} },
      { actor: "admin", action: "get-user-sidebar", params: {}, behaviorId: "B-0185" },
      { actor: "admin", action: "check-email-exists", params: { email: "nobody@parity.example.com" } },
    ],
    behaviorMatcher: {
      action: /^(AttachmentApp\.getFileList|UserApp\.users|Application\.sidebar|UserApp\.usermenuTabContentList|UserApp\.isEmailExist)$/,
      route: /^(GET \/files$|GET \/-_-api\/v1\/users$|GET \/user\/sidebar$|GET \/user\/usermenuTabContentList$|GET \/user\/isEmailExist)/,
    },
  },
  {
    id: "U20-throwaway-org-lifecycle",
    title: "throwaway org lifecycle: create, members, enroll, settings, leave, delete",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "create-organization", params: {} },
      { actor: "admin", action: "add-org-member", params: { user: "bob" } },
      { actor: "admin", action: "edit-org-member", params: { user: "bob", role: "org_admin" } },
      { actor: "admin", action: "edit-org-member", params: { user: "bob", role: "org_member" } },
      { actor: "carol", action: "login", params: { loginId: "carol", password: "carolcarol" } },
      { actor: "carol", action: "enroll-organization", params: {} },
      { actor: "carol", action: "cancel-organization-enroll", params: {} },
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "update-organization-info", params: { description: "parity temp description" } },
      { actor: "admin", action: "update-organization-info", params: { description: "" } },
      { actor: "bob", action: "login", params: { loginId: "bob", password: "bobbob" } },
      {
        actor: "bob",
        action: "leave-organization",
        params: {},
        // Legacy org-leave authorization defect is known, but the handler has
        // no resulting-membership readback; keep this status drift blocking.
      },
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "add-org-member", params: { user: "carol" } },
      { actor: "admin", action: "delete-org-member", params: { user: "carol" } },
      { actor: "admin", action: "delete-organization", params: {} },
    ],
    behaviorMatcher: {
      action: /^(OrganizationApp\.(newOrganization|addMember|editMember|deleteMember|leave|updateOrganizationInfo|deleteOrganization)|EnrollOrganizationApp\.(enroll|cancelEnroll))$/,
      route: /^(POST \/organizations\/new$)|^(POST|DELETE) \/organizations\/:organizationName/,
    },
  },
  {
    id: "U21-throwaway-user-site-toggles",
    title: "throwaway user signup, site-admin toggles (x2 revert), site-admin delete",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "logout-session", params: {} },
      { actor: "anonymous", action: "signup-user", params: {} },
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "toggle-account-lock", params: {} },
      { actor: "admin", action: "toggle-guest-mode", params: {} },
      { actor: "admin", action: "toggle-site-admin-role", params: {} },
      { actor: "admin", action: "reset-site-user-password", params: {} },
      { actor: "admin", action: "unwatch-update", params: {} },
      { actor: "admin", action: "delete-site-user", params: {} },
    ],
    behaviorMatcher: {
      action: /^(UserApp\.newUser|UserApp\.resetUserPasswordBySiteManager|SiteApp\.(toggleAccountLock|toggleGuestMode|toggleSiteAdminRole|unwatchUpdate|deleteUser))$/,
      route: /^(POST \/users\/signup$)|^(POST \/sites\/(toggleAccountLock|toggleGuestMode|unwatchUpdate|toggleSiteAdminRole\/:loginId)$)|(DELETE \/sites\/user\/delete)|^(POST \/:user$)/,
    },
  },
  {
    id: "U22-user-profile-edit-revert",
    title: "profile update + benign editform tab saves (reverted)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "edit-user-profile", params: {} },
      {
        actor: "admin",
        action: "save-user-editform-tab",
        params: { tab: "notifications" },
        // Surface-replaced: yoram owns settings as workspace overview/actions;
        // no resulting settings-state readback is available here.
      },
      {
        actor: "admin",
        action: "save-user-editform-tab",
        params: { tab: "emails" },
      },
    ],
    behaviorMatcher: {
      action: /^UserApp\.(editUserInfo|editUserInfoByTabForm)$/,
      route: /^(POST \/user\/edit$)|(POST \/user\/editform\/:tabId$)/,
    },
  },
  {
    id: "U23-email-validation-lifecycle",
    title: "add email, send validation mail, confirm, delete (self-cleaning)",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "add-email", params: {} },
      { actor: "admin", action: "send-validation-email", params: {} },
      { actor: "anonymous", action: "open-validation-link", params: {} },
      { actor: "admin", action: "delete-email", params: {} },
    ],
    behaviorMatcher: {
      action: /^(UserApp\.(sendValidationEmail|confirmEmail))$/,
      route: /^(POST|GET) \/user\/email\/(sendValidationEmail\/:emailId|confirm\/:emailId\/:token)$/,
    },
  },
  {
    id: "U24-signup-email-verification",
    title: "signup delivers verify mail; reset flow completes for throwaway user",
    actions: [
      { actor: "admin", action: "logout-session", params: {} },
      { actor: "anonymous", action: "signup-user", params: {} },
      { actor: "anonymous", action: "open-verify-link", params: {} },
      { actor: "anonymous", action: "request-lost-password-for-throwaway", params: {} },
      { actor: "anonymous", action: "complete-reset-for-throwaway", params: {} },
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "delete-site-user", params: {} },
    ],
    behaviorMatcher: {
      action: /^(PasswordResetApp\.resetPassword|UserApp\.verifyUser)$/,
      route: /^(POST \/resetPassword$|GET \/verify\/:loginId\/:verificationCode)$/,
    },
  },
  {
    id: "U26-avatar-capture-restore",
    title: "site-admin avatar set and restore with an offline PNG attachment",
    actions: [
      { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
      { actor: "admin", action: "set-user-avatar-from-attachment", params: { email: "admin@example.com" } },
    ],
    behaviorMatcher: {
      action: /^SiteApp\.setAttachmentToUserAvatar$/,
      route: /^POST \/sites\/setAttachmentToUserAvatar$/,
    },
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
  const selector = sharedRouteRootSelector(step);
  await helpers.renderDomTarget(ctx, {
    legacy: `${options.legacyUrl}${target}`,
    yoram: `${yoramBaseUrl}${target}`,
    spa: true,
    ...(selector ? { selector } : {}),
  });
}

// Pure-API read handler: no DOM comparison.
async function readApiHandler(ctx) {
  const { step, resolved, helpers } = ctx;
  await helpers.requestBoth(ctx, translateLegacy(step, resolved), translateYoram(step, resolved));
}

function normalizeNoAvatarUsers(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.users)) return normalizeApiValue(value);
  const users = [...value.users].sort((left, right) =>
    String(left.loginId ?? left.login_id ?? left.id ?? "").localeCompare(
      String(right.loginId ?? right.login_id ?? right.id ?? ""),
    ),
  );
  return normalizeApiValue({ ...value, users });
}

async function readSiteScreenHandler(ctx) {
  const { step, resolved, options, yoramBaseUrl, helpers } = ctx;
  if (step.params.screen === "noAvatarUsers") {
    await helpers.requestJsonBoth(
      ctx,
      translateLegacy(step, resolved),
      translateYoram(step, resolved),
      "/sites/noAvatarUsers",
      normalizeNoAvatarUsers,
    );
    return;
  }
  await helpers.requestBoth(ctx, translateLegacy(step, resolved), translateYoram(step, resolved));
  const target = pageTargets[step.action](step.params);
  const yoramSelector = SITE_ADMIN_BODY_SELECTORS[step.params.screen];
  if (!yoramSelector) return;
  await helpers.renderDomTarget(ctx, {
    legacy: `${options.legacyUrl}${target}`,
    yoram: `${yoramBaseUrl}${target}`,
    legacySelector: SITE_ADMIN_LEGACY_BODY_SELECTOR,
    yoramSelector,
    spa: true,
  });
}

// Page path each DOM-compared action renders; identical on both sides because
// Yoram serves these screens via the SPA shell at the legacy direct routes.
const pageTargets = {
  "view-user-issues": (params) => withQuery("/user/issues", params.tab && `tab=${params.tab}`),
  "view-notifications": (params) =>
    params.path === "/notification"
      ? withQuery("/notification", "from=0&limit=10")
      : params.path ?? "/notifications",
  // Legacy search pages bind keyword + searchType; a bare ?query= render is a
  // legacy 400 error page, not the search screen.
  "view-global-search": (params) =>
    withQuery(
      "/search",
      [
        params.query && `keyword=${encodeURIComponent(params.query)}`,
        `searchType=${encodeURIComponent(params.searchType ?? "issue")}`,
      ]
        .filter(Boolean)
        .join("&"),
    ),
  "view-orgs-list": () => "/orgs",
  "view-org-home": (params) => `/organizations/${params.organization}`,
  "view-user-files": () => "/user/files",
  "view-new-direct-issue-form": (params) => (params.mine ? "/user/issues/new/mine" : "/user/issues/new"),
  "view-org-subpage": (params) =>
    withQuery(
      `/organizations/${params.organization}/${params.page}`,
      params.page === "search"
        ? [
            params.query && `keyword=${encodeURIComponent(params.query)}`,
            `searchType=${encodeURIComponent(params.searchType ?? "issue")}`,
          ]
            .filter(Boolean)
            .join("&")
        : params.query && `query=${encodeURIComponent(params.query)}`,
    ),
  "view-new-org-form": () => "/organizations/new",
  "view-user-editform": (params) => (params.tab ? `/user/editform/${params.tab}` : "/user/editform"),
  "view-site-screen": (params) => `/sites/${params.screen}`,
  "view-files-list": () => "/files",
};

// Only use a route-root selector where the legacy template and React screen
// expose the same stable class. Routes without one intentionally compare the
// full body rather than guessing at a wrapper and hiding route controls.
function sharedRouteRootSelector(step) {
  switch (step.action) {
    case "view-user-issues":
    case "view-user-profile":
    case "view-user-files":
      return ".page-wrap";
    case "view-notifications":
      // `/notification` is the legacy partial endpoint; both sides render the
      // notification fragment without the full-page `.page-wrap`.
      return step.params.path === "/notification" ? null : ".page-wrap";
    case "view-global-search":
    case "view-org-home":
    case "view-new-org-form":
      return ".project-page-wrap";
    case "view-new-direct-issue-form":
      // The canonical `/mine` route has a project wrapper on both sides.
      // Bare `/new` is only a legacy form endpoint; Yoram renders its route
      // shell without that wrapper, so capture legacy narrowly and Yoram body.
      return step.params.mine ? ".project-page-wrap" : null;
    case "view-org-subpage":
      return step.params.page === "issues" ? ".page-wrap" : ".project-page-wrap";
    default:
      return null;
  }
}

// The app shell and site-admin navigation are covered by the dedicated WTR
// lanes. Compare only the route-owned content column here: the legacy layout
// has no route-specific marker, so its stable site-management content column
// is paired with each React screen's explicit owner marker.
export const SITE_ADMIN_LEGACY_BODY_SELECTOR = ".site-setting-wrap > .row-fluid > .span10";
export const SITE_ADMIN_BODY_SELECTORS = Object.freeze({
  data: '[data-owner="site-data-setting-content-column"]',
  diagnostic: '[data-owner="site-diagnostic-setting-content-column"]',
  issueList: '[data-owner="site-issue-list-setting-content-column"]',
  mail: '[data-owner="site-mail-setting-content-column"]',
  massmail: '[data-owner="site-massmail-setting-content-column"]',
  postList: '[data-owner="site-post-list-setting-content-column"]',
  projectList: '[data-owner="site-project-list-setting-content-column"]',
  update: '[data-owner="site-update-setting-content-column"]',
  userList: '[data-owner="site-user-list-setting-content-column"]',
});


// --- mutation helpers --------------------------------------------------------
// Yoram registers the legacy-compat workspace routes (favorites, /user/email,
// /noti/toggle) at root level, so several translators below use identical
// paths on both sides. Divergences are reported per the sweep contract and the
// scenario continues; every toggle runs twice so state fully reverts.

function pushApiViolation(ctx, route, expected, actual) {
  ctx.entry.violations.push(
    violation({ route, behaviorId: ctx.step.behaviorId ?? null, kind: "api", expected, actual }),
  );
}

async function mutateBoth(ctx, legacyTranslation, yoramTranslation, route) {
  const { legacyResult, yoramResult } = await ctx.helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
  if ((legacyResult.status >= 400) !== (yoramResult.status >= 400)) {
    pushApiViolation(ctx, route, `legacy HTTP ${legacyResult.status}`, `yoram HTTP ${yoramResult.status}`);
  }
  return { legacyResult, yoramResult };
}

export function favoriteMutationState(json, target, legacy = false) {
  const value = legacy
    ? json?.favored
    : target === "issue"
      ? (json?.isFavorited ?? json?.is_favorited ?? json?.favorited)
      : (json?.favorited ?? json?.favored);
  return typeof value === "boolean" ? value : null;
}

export function favoriteListContains(json, target, id, owner, project, organization) {
  const ids = json?.projectIds ?? json?.organizationIds ?? json?.ids;
  const entries = target === "organization" ? json?.organizations : json?.projects;
  if (!Array.isArray(ids) && !Array.isArray(entries)) return null;
  if (Array.isArray(ids) && ids.some((value) => Number(value) === Number(id))) return true;
  if (!Array.isArray(entries)) return false;
  return entries.some((entry) => {
    if (target === "issue") return Number(entry?.issueId ?? entry?.id) === Number(id);
    if (target === "project") {
      return (
        Number(entry?.projectId ?? entry?.id) === Number(id) ||
        (entry?.owner === owner && entry?.projectName === project)
      );
    }
    return Number(entry?.organizationId ?? entry?.id) === Number(id) || entry?.organizationName === organization;
  });
}


async function resolveLegacyProjectId(ctx, owner, project) {
  const result = await ctx.legacySession.request({ method: "GET", path: `/${owner}/${project}` });
  return Number(/data-project-id="(\d+)"/u.exec(result.body ?? "")?.[1]) || null;
}

async function resolveYoramProjectId(ctx, owner, project) {
  const result = await ctx.yoramSession.request({ method: "GET", path: `/api/v1/owners/${owner}/projects/${project}` });
  return Number(result.json?.projectId ?? result.json?.project_id ?? 0) || null;
}

async function resolveLegacyIssueId(ctx, owner, project, issueNumber) {
  // The legacy favorite API matches Issue.finder.byId (User.java:1081), so the
  // row id is required; legacy renders it as data-issue-id on the issue detail
  // page (yona-original app/views/issue/view.scala.html:123). LegacySession
  // exposes no parsed json field, and issues?format=json keys by display
  // number anyway.
  const result = await ctx.legacySession.request({
    method: "GET",
    path: `/${owner}/${project}/issue/${issueNumber}`,
  });
  return Number(/data-issue-id="(\d+)"/u.exec(result.body ?? "")?.[1]) || null;
}

async function resolveLegacyOrganizationId(ctx, organization) {
  // Legacy org pages render no data-organization-id; the organization
  // settings form carries the numeric id in a hidden field
  // (yona-original app/views/organization/setting.scala.html:33).
  const result = await ctx.legacySession.request({
    method: "GET",
    path: `/organizations/${encodeURIComponent(organization)}/settingform`,
  });
  return Number(/name="id"\s+value="(\d+)"/u.exec(result.body ?? "")?.[1]) || null;
}

const ADMIN_DISPLAY_NAME = "Site Admin";

async function resolveLegacyOrgMemberId(ctx, organizationName, loginId) {
  const page = await ctx.legacySession.request({ method: "GET", path: `/organizations/${organizationName}/members` });
  for (const chunk of String(page.body ?? "").split('data-name="roleof-').slice(1)) {
    if (!chunk.startsWith(`${loginId}"`)) continue;
    const id = /\/member\/(\d+)\/delete/u.exec(chunk)?.[1];
    if (id) return Number(id);
  }
  return null;
}

async function resolveYoramOrgMemberId(ctx, organizationName, loginId) {
  const result = await ctx.yoramSession.request({ method: "GET", path: `/api/v1/organizations/${organizationName}/admin` });
  const members = result.json?.members ?? [];
  const member = members.find((entry) => entry.loginId === loginId);
  return member ? Number(member.userId) : null;
}

async function resolveLegacyUserIdByLoginId(ctx, loginId) {
  // The row markup pairs the delete href with the login id attribute:
  //   data-href="/sites/user/delete<id>" data-user-id="<loginId>"
  // (yona-original app/views/site/userList.scala.html:117), so match them
  // adjacently. Splitting on data-user-id=" alone is off by one row — each
  // row's own href precedes its attribute and lands in the previous chunk,
  // which made the resolver return the NEXT row's user id.
  const escaped = String(loginId).replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
  const pattern = new RegExp(`data-href="/sites/user/delete(\\d+)"\\s+data-user-id="${escaped}"`, "u");
  for (const state of ["ACTIVE", "LOCKED"]) {
    const page = await ctx.legacySession.request({ method: "GET", path: `/sites/userList?state=${state}` });
    const id = pattern.exec(String(page.body ?? ""))?.[1];
    if (id) return Number(id);
  }
  return null;
}

async function resolveYoramUserIdByLoginId(ctx, loginId) {
  for (const path of ["/api/v1/site/users", "/api/v1/site/users?state=locked"]) {
    const result = await ctx.yoramSession.request({ method: "GET", path });
    const users = result.json?.users ?? [];
    const user = users.find((entry) => entry.loginId === loginId);
    if (user) return Number(user.id);
  }
  return null;
}
const AVATAR_PNG = Uint8Array.from(Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
));

function multipartBody(fields = {}, file = null) {
  const boundary = `parity-avatar-${file?.filename ?? "form"}`.replace(/[^a-zA-Z0-9_-]/gu, "_");
  const encoder = new TextEncoder();
  const chunks = [];
  let total = 0;
  const append = (value) => {
    const chunk = typeof value === "string" ? encoder.encode(value) : value;
    chunks.push(chunk);
    total += chunk.length;
  };
  for (const [name, value] of Object.entries(fields)) {
    append(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`);
  }
  if (file) {
    append(`--${boundary}\r\nContent-Disposition: form-data; name="${file.name}"; filename="${file.filename}"\r\nContent-Type: ${file.contentType}\r\n\r\n`);
    append(file.content);
    append("\r\n");
  }
  append(`--${boundary}--\r\n`);
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return { contentType: `multipart/form-data; boundary=${boundary}`, body };
}

function avatarUploadMultipart(suffix) {
  return multipartBody({}, {
    name: "filePath",
    filename: `parity-avatar-${suffix.replace(/[^a-zA-Z0-9_-]/gu, "_")}.png`,
    contentType: "image/png",
    content: AVATAR_PNG,
  });
}

function attachmentDeleteMultipart() {
  return multipartBody({ _method: "delete" });
}

function attachmentIdFromResult(result) {
  return Number(result.json?.id ?? result.json?.url?.match(/\/files\/(\d+)/u)?.[1] ?? /\/files\/(\d+)/u.exec(result.location ?? "")?.[1]) || null;
}

function dropBehaviorClaim(entry, behaviorId) {
  entry.behaviorIds = entry.behaviorIds.filter((id) => id !== behaviorId);
}

function claimBehavior(entry, behaviorId) {
  if (!entry.behaviorIds.includes(behaviorId)) entry.behaviorIds.push(behaviorId);
}

async function readCurrentAvatar(ctx, side, loginId) {
  const result = await ctx.helpers.sendRaw(ctx, side, side === "legacy"
    ? { method: "GET", path: "/user/editform" }
    : { method: "GET", path: `/api/v1/users/${loginId}/profile` });
  const avatarUrl = side === "legacy"
    ? String(/avatar-wrap xlarge[\s\S]{0,1000}?<img[^>]+src=["']([^"']+)/u.exec(result.body ?? "")?.[1] ?? "")
    : String(result.json?.profile?.avatarUrl ?? result.json?.profile?.avatar_url ?? "");
  return {
    id: Number(/\/files\/(\d+)/u.exec(avatarUrl)?.[1]) || null,
    url: avatarUrl,
    status: result.status,
  };
}

const MAIN_EMAIL = "admin@example.com";
const parityEmailAddress = (suffix) => `${suffix.replace(/[^a-zA-Z0-9]/g, "")}@parity.example.com`;

async function legacyEmailRows(ctx) {
  const result = await ctx.legacySession.request({ method: "GET", path: "/user/editform/emails" });
  const rows = [];
  for (const chunk of String(result.body ?? "").split("<tr>").slice(1)) {
    const row = chunk.split("</tr>")[0];
    const id = /\/user\/email\/delete\/(\d+)/u.exec(row)?.[1];
    const address = /class="ml10">([^<]+)<\/span>/u.exec(row)?.[1];
    if (id && address) rows.push({ id, address });
  }
  return rows;
}

async function yoramEmailRows(ctx) {
  // GET /api/v1/workspace overview carries the emails array with numeric ids.
  const result = await ctx.yoramSession.request({ method: "GET", path: "/api/v1/workspace" });
  const emails = result.json?.emails;
  return Array.isArray(emails)
    ? emails.map((email) => ({ id: String(email.id), address: email.emailAddress ?? email.email_address }))
    : [];
}

async function emailRows(ctx) {
  return { legacy: await legacyEmailRows(ctx), yoram: await yoramEmailRows(ctx) };
}

function findEmailId(rows, address) {
  return rows.find((row) => row.address === address)?.id ?? null;
}

export const actionDefinitions = {
  "view-user-issues": {
    translateLegacy(step) {
      return { method: "GET", path: withQuery("/user/issues", step.params.tab && `tab=${step.params.tab}`) };
    },
    translateYoram(step) {
      const query = step.params.tab && `tab=${step.params.tab}`;
      return { method: "GET", path: withQuery("/api/v1/user/issues/search", query), pagePath: withQuery("/user/issues", query) };
    },
    handler: readPageHandler,
  },

  "get-user-issues-compat": {
    // Legacy keeps its external /-_-api/v1 namespace; the canonical
    // /api/v1/user/issues route owns the plain spelling on Yoram, so the
    // migrated compat read lives at /api/v1/user/issues/search.
    translateLegacy() {
      return { method: "GET", path: "/-_-api/v1/user/issues" };
    },
    translateYoram() {
      return { method: "GET", path: "/api/v1/user/issues/search" };
    },
    handler: readApiHandler,
  },

  "view-notifications": {
    translateLegacy(step) {
      // Legacy GET /notification binds from:Integer + limit:Integer with no
      // defaults; a bare request is a legacy 400. /notifications (the page)
      // binds nothing.
      if (step.params.path === "/notification") {
        return { method: "GET", path: "/notification?from=0&limit=10" };
      }
      return { method: "GET", path: step.params.path ?? "/notifications" };
    },
    translateYoram(step) {
      if (step.params.path === "/notification") {
        return { method: "GET", path: "/notification?from=0&limit=10", pagePath: "/notification?from=0&limit=10" };
      }
      return { method: "GET", path: "/api/v1/notifications", pagePath: step.params.path ?? "/notifications" };
    },
    handler: readPageHandler,
  },

  "view-global-search": {
    translateLegacy(step) {
      // Legacy SearchApp binds keyword + searchType (both required, 400
      // otherwise); `query` alone is not the legacy contract.
      const query = [
        step.params.query && `keyword=${encodeURIComponent(step.params.query)}`,
        `searchType=${encodeURIComponent(step.params.searchType ?? "issue")}`,
      ]
        .filter(Boolean)
        .join("&");
      return {
        method: "GET",
        path: withQuery("/search", query),
      };
    },
    translateYoram(step) {
      const query = [
        step.params.query && `keyword=${encodeURIComponent(step.params.query)}`,
        `searchType=${encodeURIComponent(step.params.searchType ?? "issue")}`,
      ]
        .filter(Boolean)
        .join("&");
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
      return { method: "GET", path: `/api/v1/users/${step.params.user}/statistics/summary` };
    },
    handler: readApiHandler,
  },

  // --- organization screens --------------------------------------------------

  "view-org-subpage": {
    translateLegacy(step) {
      // Legacy SearchApp.searchInAGroup binds keyword + searchType (both
      // required, 400 otherwise); `query` alone is not the legacy contract.
      const query =
        step.params.page === "search"
          ? [
              step.params.query && `keyword=${encodeURIComponent(step.params.query)}`,
              `searchType=${encodeURIComponent(step.params.searchType ?? "issue")}`,
            ]
              .filter(Boolean)
              .join("&")
          : step.params.query && `query=${encodeURIComponent(step.params.query)}`;
      return {
        method: "GET",
        path: withQuery(
          `/organizations/${step.params.organization}/${step.params.page}`,
          query,
        ),
      };
    },
    translateYoram(step) {
      const { organization, page } = step.params;
      const query =
        page === "search"
          ? [
              step.params.query && `keyword=${encodeURIComponent(step.params.query)}`,
              `searchType=${encodeURIComponent(step.params.searchType ?? "issue")}`,
            ]
              .filter(Boolean)
              .join("&")
          : step.params.query && `query=${encodeURIComponent(step.params.query)}`;
      const apiPages = {
        boards: `/api/v1/organizations/${organization}/boards`,
        members: `/api/v1/organizations/${organization}/members`,
        pullrequests: `/api/v1/organizations/${organization}/pull-requests`,
        issues: `/api/v1/organizations/${organization}/issues`,
        search: withQuery(`/api/v1/organizations/${organization}/search`, query),
      };
      // closedPullrequests/deleteForm/settingform have no Yoram API; the SPA
      // shell serves the legacy direct route instead.
      return {
        method: "GET",
        path: apiPages[page] ?? `/organizations/${organization}/${page}`,
        pagePath: withQuery(
          `/organizations/${organization}/${page}`,
          query && `query=${encodeURIComponent(query)}`,
        ),
      };
    },
    handler: readPageHandler,
  },

  "view-new-org-form": {
    translateLegacy() {
      return { method: "GET", path: "/organizations/new" };
    },
    translateYoram() {
      return { method: "GET", path: "/organizations/new" };
    },
    handler: readPageHandler,
  },

  "view-user-editform": {
    translateLegacy(step) {
      return { method: "GET", path: step.params.tab ? `/user/editform/${step.params.tab}` : "/user/editform" };
    },
    translateYoram(step) {
      return { method: "GET", path: step.params.tab ? `/user/editform/${step.params.tab}` : "/user/editform" };
    },
    handler: readPageHandler,
  },

  "view-site-screen": {
    // Admin-only server-rendered screens; identical direct routes on Yoram.
    translateLegacy(step) {
      return { method: "GET", path: `/sites/${step.params.screen}` };
    },
    translateYoram(step) {
      return { method: "GET", path: `/sites/${step.params.screen}` };
    },
    handler: readSiteScreenHandler,
  },

  "view-files-list": {
    translateLegacy() {
      return { method: "GET", path: "/files" };
    },
    translateYoram() {
      return { method: "GET", path: "/files" };
    },
    handler: readApiHandler,
  },
  "get-users-directory": {
    // Legacy keeps its external /-_-api/v1/users spelling; the migrated
    // Yoram route is /api/v1/users/directory (restful-uri-mapping v1 #4).
    translateLegacy() {
      return { method: "GET", path: "/-_-api/v1/users" };
    },
    translateYoram() {
      return { method: "GET", path: "/api/v1/users/directory" };
    },
    handler: readApiHandler,
  },

  "get-user-sidebar": {
    async handler(ctx) {
      const { entry, step, helpers, legacySession, yoramSession } = ctx;
      for (const path of ["/user/sidebar", "/user/usermenuTabContentList"]) {
        if (path === "/user/sidebar") {
          const [legacyResult, yoramResult] = await Promise.all([
            legacySession.request({ method: "GET", path }),
            yoramSession.request({ method: "GET", path }),
          ]);
          if (legacyResult.status === 500 && yoramResult.status < 400) {
            entry.violations.push(
              violation({
                route: path,
                behaviorId: step.behaviorId ?? null,
                kind: "api",
                expected: { status: legacyResult.status },
                actual: { status: yoramResult.status },
              }),
            );
          } else if (legacyResult.status !== yoramResult.status) {
            entry.errors.push(
              `legacy ${ctx.step.action} failed: HTTP ${legacyResult.status} @ ${path}; ` +
                `yoram failed: HTTP ${yoramResult.status} @ ${path}`,
            );
          }
          continue;
        }
        await helpers.requestBoth(ctx, { method: "GET", path }, { method: "GET", path });
      }
    },
    translateLegacy() {
      return { method: "GET", path: "/user/sidebar" };
    },
    translateYoram() {
      return { method: "GET", path: "/user/sidebar" };
    },
  },

  "check-email-exists": {
    translateLegacy(step) {
      return { method: "GET", path: withQuery("/user/isEmailExist", `email=${encodeURIComponent(step.params.email)}`) };
    },
    translateYoram(step) {
      return { method: "GET", path: withQuery("/user/isEmailExist", `email=${encodeURIComponent(step.params.email)}`) };
    },
    handler: readApiHandler,
  },

  "get-favorite-lists": {
    // Legacy keeps its external /-_-api/v1/favorite* spelling; the migrated
    // Yoram routes live under /api/v1/user/favorites (mapping v1 #15/#16).
    translateLegacy() {
      return { method: "GET", path: "/-_-api/v1/favoriteIssues" };
    },
    translateYoram() {
      return { method: "GET", path: "/api/v1/user/favorites/issues" };
    },
    async handler(ctx) {
      const { helpers, entry } = ctx;
      const sortedIds = (json) => {
        const ids = json?.projectIds ?? json?.organizationIds ?? json?.ids;
        return Array.isArray(ids) ? [...ids].sort() : null;
      };
      const yoramPath = {
        favoriteIssues: "/api/v1/user/favorites/issues",
        favoriteProjects: "/api/v1/user/favorites/projects",
        favoriteOrganizations: "/api/v1/user/favorites/organizations",
      };
      for (const name of ["favoriteIssues", "favoriteProjects", "favoriteOrganizations"]) {
        const { legacyResult, yoramResult } = await helpers.requestBoth(
          ctx,
          { method: "GET", path: `/-_-api/v1/${name}` },
          { method: "GET", path: yoramPath[name] },
        );
        const legacyIds = sortedIds(legacyResult.json);
        const yoramIds = sortedIds(yoramResult.json);
        if (legacyIds && yoramIds && JSON.stringify(legacyIds) !== JSON.stringify(yoramIds)) {
          pushApiViolation(ctx, `/-_-api/v1/${name}`, legacyIds, yoramIds);
        } else if (legacyIds === null || yoramIds === null) {
          const legacyNormalized = legacyResult.json ? normalizeApiValue(legacyResult.json) : null;
          const yoramNormalized = yoramResult.json ? normalizeApiValue(yoramResult.json) : null;
          if (
            legacyNormalized &&
            yoramNormalized &&
            JSON.stringify(legacyNormalized) !== JSON.stringify(yoramNormalized)
          ) {
            pushApiViolation(ctx, `/-_-api/v1/${name}`, legacyNormalized, yoramNormalized);
          }
        }
      }
    },
  },

  "toggle-favorite": {
    translateLegacy(step) {
      // ids resolve at runtime in the handler; translators exist for the
      // contract/tests with a placeholder row id.
      const kind = { issue: "Issues", project: "Projects", organization: "Organizations" }[step.params.target];
      return { method: "POST", path: `/-_-api/v1/favorite${kind}/1` };
    },
    translateYoram(step) {
      const { target, owner = "admin", project = "sample", organization = "weblabs", issueNumber = 1 } = step.params;
      const path =
        target === "issue"
          ? `/api/v1/owners/${owner}/projects/${project}/issues/${issueNumber}/favorite`
          : target === "project"
            ? `/api/v1/owners/${owner}/projects/${project}/favorite`
            : `/api/v1/organizations/${organization}/favorite`;
      return { method: "POST", path };
    },
    async handler(ctx) {
      const { step, state, entry } = ctx;
      const { target, owner = "admin", project = "sample", organization = "weblabs", issueNumber = 1 } = step.params;
      let legacyPath;
      let yoramPath;
      if (target === "issue") {
        state.legacyIssueId ??= await resolveLegacyIssueId(ctx, owner, project, issueNumber);
        if (!state.legacyIssueId) {
          entry.errors.push("toggle-favorite: legacy issue id unresolved");
          return;
        }
        legacyPath = `/-_-api/v1/favoriteIssues/${state.legacyIssueId}`;
        yoramPath = `/api/v1/owners/${owner}/projects/${project}/issues/${issueNumber}/favorite`;
      } else if (target === "project") {
        state.legacyProjectId ??= await resolveLegacyProjectId(ctx, owner, project);
        if (!state.legacyProjectId) {
          entry.errors.push("toggle-favorite: legacy project id unresolved");
          return;
        }
        legacyPath = `/-_-api/v1/favoriteProjects/${state.legacyProjectId}`;
        yoramPath = `/api/v1/owners/${owner}/projects/${project}/favorite`;
      } else {
        state.legacyOrganizationId ??= await resolveLegacyOrganizationId(ctx, organization);
        if (!state.legacyOrganizationId) {
          entry.errors.push(`toggle-favorite: legacy organization id for ${organization} unresolved`);
          return;
        }
        legacyPath = `/-_-api/v1/favoriteOrganizations/${state.legacyOrganizationId}`;
        yoramPath = `/api/v1/organizations/${organization}/favorite`;
      }
      // Normalize each side to an unfavored baseline first. The rebuilt Yoram
      // fixture is clean while the long-lived legacy fixture may retain a
      // favorite from an earlier sweep.
      const kind = { issue: "Issues", project: "Projects", organization: "Organizations" }[target];
      const legacyListPath = `/-_-api/v1/favorite${kind}`;
      const yoramListPath = `/api/v1/user/favorites/${kind.toLowerCase()}`;
      const [legacyList, yoramList] = await Promise.all([
        ctx.legacySession.request({ method: "GET", path: legacyListPath }),
        ctx.yoramSession.request({ method: "GET", path: yoramListPath }),
      ]);
      if (legacyList.status >= 400 || yoramList.status >= 400) {
        entry.errors.push(
          `toggle-favorite: baseline list failed (legacy=${legacyList.status}, yoram=${yoramList.status})`,
        );
        return;
      }
      const favoriteId =
        target === "issue"
          ? state.legacyIssueId
          : target === "project"
            ? state.legacyProjectId
            : state.legacyOrganizationId;
      const legacyInitiallyFavored = favoriteListContains(
        legacyList.json,
        target,
        favoriteId,
        owner,
        project,
        organization,
      );
      const yoramInitiallyFavored = favoriteListContains(
        yoramList.json,
        target,
        favoriteId,
        owner,
        project,
        organization,
      );
      for (const [side, initiallyFavored, session, path] of [
        ["legacy", legacyInitiallyFavored, ctx.legacySession, legacyPath],
        ["yoram", yoramInitiallyFavored, ctx.yoramSession, yoramPath],
      ]) {
        if (!initiallyFavored) continue;
        const result = await session.request({ method: "POST", path });
        if (result.status >= 400) {
          entry.errors.push(`toggle-favorite: ${side} baseline clear failed (HTTP ${result.status})`);
          return;
        }
      }
      // Toggle on then off — the scenario leaves no favorite behind.
      const favored = { legacy: [], yoram: [] };
      for (let round = 0; round < 2; round += 1) {
        const { legacyResult, yoramResult } = await mutateBoth(
          ctx,
          { method: "POST", path: legacyPath },
          { method: "POST", path: yoramPath },
          legacyPath,
        );
        favored.legacy.push(favoriteMutationState(legacyResult.json, target, true));
        favored.yoram.push(favoriteMutationState(yoramResult.json, target));
      }
      if (JSON.stringify(favored.legacy) !== JSON.stringify(favored.yoram)) {
        pushApiViolation(ctx, legacyPath, favored.legacy, favored.yoram);
      }
    },
  },

  "toggle-noti-watch": {
    translateLegacy(step) {
      return { method: "POST", path: `/noti/toggle/1/${step.params.notiType}` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/noti/toggle/1/${step.params.notiType}` };
    },
    async handler(ctx) {
      const { step, state, entry } = ctx;
      const { owner = "admin", project = "sample", notiType } = step.params;
      state.legacyProjectId ??= await resolveLegacyProjectId(ctx, owner, project);
      state.yoramProjectId ??= await resolveYoramProjectId(ctx, owner, project);
      if (!state.legacyProjectId || !state.yoramProjectId) {
        entry.errors.push(`toggle-noti-watch: project id unresolved (legacy=${state.legacyProjectId}, yoram=${state.yoramProjectId})`);
        return;
      }
      // Toggle twice so the notification watch state reverts.
      for (let round = 0; round < 2; round += 1) {
        await mutateBoth(
          ctx,
          { method: "POST", path: `/noti/toggle/${state.legacyProjectId}/${notiType}` },
          { method: "POST", path: `/noti/toggle/${state.yoramProjectId}/${notiType}` },
          `/noti/toggle/:projectId/${notiType}`,
        );
      }
    },
  },

  "add-email": {
    translateLegacy(step) {
      return { method: "POST", path: "/user/email", form: { email: step.params.email } };
    },
    translateYoram(step) {
      return { method: "POST", path: "/user/email", form: { email: step.params.email } };
    },
    async handler(ctx) {
      const { state, entry, suffix } = ctx;
      const address = parityEmailAddress(suffix);
      state.emailAddress = address;
      const before = await emailRows(ctx);
      if (findEmailId(before.legacy, address) || findEmailId(before.yoram, address)) {
        entry.errors.push("add-email: address already present before add; aborting for deterministic cleanup");
        return;
      }
      const legacyResult = await ctx.legacySession.request({
        method: "POST",
        path: "/user/email",
        form: { email: address },
      });
      const yoramResult = await ctx.yoramSession.request({ method: "POST", path: "/user/email", form: { email: address } });
      if ((legacyResult.status >= 400) !== (yoramResult.status >= 400)) {
        pushApiViolation(ctx, "/user/email", `legacy HTTP ${legacyResult.status}`, `yoram HTTP ${yoramResult.status}`);
      }
      const after = await emailRows(ctx);
      state.newEmailIdLegacy = findEmailId(after.legacy, address);
      state.newEmailIdYoram = findEmailId(after.yoram, address);
      if (!state.newEmailIdLegacy || !state.newEmailIdYoram) {
        entry.errors.push(`add-email: id unresolved (legacy=${state.newEmailIdLegacy}, yoram=${state.newEmailIdYoram})`);
      }
    },
  },

  "set-as-main-email": {
    translateLegacy(step) {
      return { method: "PUT", path: `/user/email/setAsMain/${step.params.emailId ?? 1}` };
    },
    translateYoram(step) {
      return { method: "PUT", path: `/user/email/setAsMain/${step.params.emailId ?? 1}` };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      if (!state.newEmailIdLegacy || !state.newEmailIdYoram) {
        entry.errors.push("set-as-main-email: skipped, added email id missing");
        return;
      }
      await mutateBoth(
        ctx,
        { method: "PUT", path: `/user/email/setAsMain/${state.newEmailIdLegacy}` },
        { method: "PUT", path: `/user/email/setAsMain/${state.newEmailIdYoram}` },
        "/user/email/setAsMain/:emailId",
      );
    },
  },

  "restore-main-email": {
    translateLegacy() {
      return { method: "PUT", path: "/user/email/setAsMain/1" };
    },
    translateYoram() {
      return { method: "PUT", path: "/user/email/setAsMain/1" };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      // After a successful swap the original main address became a sub email
      // row; swapping it back restores the account. If it is absent the swap
      // never happened and there is nothing to restore.
      const rows = await emailRows(ctx);
      const legacyOriginalId = findEmailId(rows.legacy, MAIN_EMAIL);
      const yoramOriginalId = findEmailId(rows.yoram, MAIN_EMAIL);
      if (!legacyOriginalId && !yoramOriginalId) return;
      const results = {};
      if (legacyOriginalId) {
        results.legacy = (await ctx.legacySession.request({ method: "PUT", path: `/user/email/setAsMain/${legacyOriginalId}` })).status;
      }
      if (yoramOriginalId) {
        results.yoram = (await ctx.yoramSession.request({ method: "PUT", path: `/user/email/setAsMain/${yoramOriginalId}` })).status;
      }
      if (results.legacy !== undefined && results.yoram !== undefined && (results.legacy >= 400) !== (results.yoram >= 400)) {
        pushApiViolation(ctx, "/user/email/setAsMain/:emailId", `legacy HTTP ${results.legacy}`, `yoram HTTP ${results.yoram}`);
      }
      state.mainEmailRestored = true;
    },
  },

  "delete-email": {
    translateLegacy(step) {
      return { method: "DELETE", path: `/user/email/delete/${step.params.emailId ?? 1}` };
    },
    translateYoram(step) {
      return { method: "DELETE", path: `/user/email/delete/${step.params.emailId ?? 1}` };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      if (!state.emailAddress) {
        entry.errors.push("delete-email: skipped, no address recorded");
        return;
      }
      // setAsMain re-creates rows with fresh ids; resolve by address, not by
      // the id captured at add time.
      const rows = await emailRows(ctx);
      const legacyId = findEmailId(rows.legacy, state.emailAddress);
      const yoramId = findEmailId(rows.yoram, state.emailAddress);
      if (legacyId) await ctx.legacySession.request({ method: "DELETE", path: `/user/email/delete/${legacyId}` });
      if (yoramId) await ctx.yoramSession.request({ method: "DELETE", path: `/user/email/delete/${yoramId}` });
      // Legacy's cached User keeps a deleted sub-email in its in-memory
      // collection; a fresh session makes the cleanup read hit the database.
      await ctx.legacySession.login({ loginId: "admin", password: "admin" });
      let final = await emailRows(ctx);
      for (let attempt = 0; attempt < 10 && (findEmailId(final.legacy, state.emailAddress) || findEmailId(final.yoram, state.emailAddress)); attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        final = await emailRows(ctx);
      }
      if (findEmailId(final.legacy, state.emailAddress) || findEmailId(final.yoram, state.emailAddress)) {
        entry.errors.push(`delete-email: ${state.emailAddress} still present after cleanup`);
      }
    },
  },

  "reset-visited-list": {
    translateLegacy() {
      return { method: "POST", path: "/user/resetVisitedList" };
    },
    translateYoram() {
      return { method: "POST", path: "/user/resetVisitedList" };
    },
    async handler(ctx) {
      await mutateBoth(
        ctx,
        { method: "POST", path: "/user/resetVisitedList" },
        { method: "POST", path: "/user/resetVisitedList" },
        "/user/resetVisitedList",
      );
    },
  },

  // --- throwaway-entity mutation wave (U20-U23) ------------------------------
  // Every entity created here is deleted/restored before its scenario ends;
  // global toggles run twice (on→off) inside their handlers.

  "create-organization": {
    translateLegacy(step) {
      return { method: "POST", path: "/organizations/new", form: { name: step.params.name } };
    },
    translateYoram(step) {
      return {
        method: "POST",
        path: "/api/v1/organizations",
        json: { organizationName: step.params.name, description: step.params.description ?? "" },
      };
    },
    async handler(ctx) {
      const { state, suffix, entry } = ctx;
      const name = `parity-org-${suffix}`;
      state.orgName = name;
      await mutateBoth(
        ctx,
        { method: "POST", path: "/organizations/new", form: { name } },
        { method: "POST", path: "/api/v1/organizations", json: { organizationName: name, description: "" } },
        "/organizations/new",
      );
      const legacyOrgs = await ctx.legacySession.request({ method: "GET", path: "/orgs" });
      const yoramOrgs = await ctx.yoramSession.request({ method: "GET", path: "/api/v1/organizations" });
      const inLegacy = String(legacyOrgs.body ?? "").includes(name);
      const inYoram = JSON.stringify(yoramOrgs.json ?? "").includes(name);
      if (inLegacy !== inYoram) {
        entry.errors.push(`create-organization: ${name} present legacy=${inLegacy} yoram=${inYoram}`);
      }
    },
  },

  "add-org-member": {
    translateLegacy(step) {
      return { method: "POST", path: `/organizations/${step.params.organization}/members`, form: { loginId: step.params.user } };
    },
    translateYoram(step) {
      return {
        method: "POST",
        path: `/api/v1/organizations/${step.params.organization}/members`,
        json: { loginId: step.params.user },
      };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("add-org-member: no throwaway organization in state");
        return;
      }
      await mutateBoth(
        ctx,
        { method: "POST", path: `/organizations/${org}/members`, form: { loginId: step.params.user } },
        { method: "POST", path: `/api/v1/organizations/${org}/members`, json: { loginId: step.params.user } },
        "/organizations/:organizationName/members",
      );
    },
  },

  "edit-org-member": {
    translateLegacy(step) {
      return { method: "POST", path: `/organizations/${step.params.organization}/member/1/edit`, form: { id: step.params.role === "org_admin" ? 6 : 7 } };
    },
    translateYoram(step) {
      return {
        method: "PATCH",
        path: `/api/v1/organizations/${step.params.organization}/members/1`,
        json: { role: step.params.role },
      };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("edit-org-member: no throwaway organization in state");
        return;
      }
      state.legacyOrgMemberIds ??= {};
      state.yoramOrgMemberIds ??= {};
      state.legacyOrgMemberIds[step.params.user] ??= await resolveLegacyOrgMemberId(ctx, org, step.params.user);
      state.yoramOrgMemberIds[step.params.user] ??= await resolveYoramOrgMemberId(ctx, org, step.params.user);
      const legacyUserId = state.legacyOrgMemberIds[step.params.user];
      const yoramUserId = state.yoramOrgMemberIds[step.params.user];
      if (!legacyUserId || !yoramUserId) {
        entry.errors.push(`edit-org-member: member id unresolved (legacy=${legacyUserId}, yoram=${yoramUserId})`);
        return;
      }
      await mutateBoth(
        ctx,
        { method: "POST", path: `/organizations/${org}/member/${legacyUserId}/edit`, form: { id: step.params.role === "org_admin" ? 6 : 7 } },
        { method: "PATCH", path: `/api/v1/organizations/${org}/members/${yoramUserId}`, json: { role: step.params.role } },
        "/organizations/:organizationName/member/:userId/edit",
      );
    },
  },

  "delete-org-member": {
    translateLegacy(step) {
      return { method: "DELETE", path: `/organizations/${step.params.organization}/member/1/delete` };
    },
    translateYoram(step) {
      return { method: "DELETE", path: `/api/v1/organizations/${step.params.organization}/members/1` };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("delete-org-member: no throwaway organization in state");
        return;
      }
      state.legacyOrgMemberIds ??= {};
      state.yoramOrgMemberIds ??= {};
      state.legacyOrgMemberIds[step.params.user] ??= await resolveLegacyOrgMemberId(ctx, org, step.params.user);
      state.yoramOrgMemberIds[step.params.user] ??= await resolveYoramOrgMemberId(ctx, org, step.params.user);
      const legacyUserId = state.legacyOrgMemberIds?.[step.params.user];
      const yoramUserId = state.yoramOrgMemberIds?.[step.params.user];
      if (!legacyUserId || !yoramUserId) {
        entry.errors.push(`delete-org-member: member id unresolved (legacy=${legacyUserId}, yoram=${yoramUserId})`);
        return;
      }
      await mutateBoth(
        ctx,
        { method: "DELETE", path: `/organizations/${org}/member/${legacyUserId}/delete` },
        { method: "DELETE", path: `/api/v1/organizations/${org}/members/${yoramUserId}` },
        "/organizations/:organizationName/member/:userId/delete",
      );
    },
  },

  "enroll-organization": {
    translateLegacy(step) {
      return { method: "POST", path: `/organizations/${step.params.organization}/enroll` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/api/v1/organizations/${step.params.organization}/enroll` };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("enroll-organization: no throwaway organization in state");
        return;
      }
      await mutateBoth(
        ctx,
        { method: "POST", path: `/organizations/${org}/enroll` },
        { method: "POST", path: `/api/v1/organizations/${org}/enroll` },
        "/organizations/:organizationName/enroll",
      );
    },
  },

  "cancel-organization-enroll": {
    translateLegacy(step) {
      return { method: "POST", path: `/organizations/${step.params.organization}/cancel/enroll` };
    },
    translateYoram(step) {
      return { method: "DELETE", path: `/api/v1/organizations/${step.params.organization}/enroll` };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("cancel-organization-enroll: no throwaway organization in state");
        return;
      }
      await mutateBoth(
        ctx,
        { method: "POST", path: `/organizations/${org}/cancel/enroll` },
        { method: "DELETE", path: `/api/v1/organizations/${org}/enroll` },
        "/organizations/:organizationName/cancel/enroll",
      );
    },
  },

  "update-organization-info": {
    translateLegacy(step) {
      return {
        method: "POST",
        path: `/organizations/${step.params.organization}/setting`,
        form: { id: step.params.legacyOrganizationId ?? 1, name: step.params.organization, description: step.params.description },
      };
    },
    translateYoram(step) {
      return {
        method: "PATCH",
        path: `/api/v1/organizations/${step.params.organization}`,
        json: { organizationName: step.params.organization, description: step.params.description },
      };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("update-organization-info: no throwaway organization in state");
        return;
      }
      state.legacyOrganizationId ??= await resolveLegacyOrganizationId(ctx, org);
      if (!state.legacyOrganizationId) {
        entry.errors.push("update-organization-info: legacy organization id unresolved");
        return;
      }
      await mutateBoth(
        ctx,
        {
          method: "POST",
          path: `/organizations/${org}/setting`,
          form: { id: state.legacyOrganizationId, name: org, description: step.params.description },
        },
        {
          method: "PATCH",
          path: `/api/v1/organizations/${org}`,
          json: { organizationName: org, description: step.params.description },
        },
        "/organizations/:organizationName/setting",
      );
    },
  },

  "leave-organization": {
    translateLegacy(step) {
      return { method: "DELETE", path: `/organizations/${step.params.organization}/member/leave` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/api/v1/organizations/${step.params.organization}/leave` };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("leave-organization: no throwaway organization in state");
        return;
      }
      await mutateBoth(
        ctx,
        { method: "DELETE", path: `/organizations/${org}/member/leave` },
        { method: "POST", path: `/api/v1/organizations/${org}/leave` },
        "/organizations/:organizationName/member/leave",
      );
    },
  },

  "delete-organization": {
    translateLegacy(step) {
      return { method: "DELETE", path: `/organizations/${step.params.organization}` };
    },
    translateYoram(step) {
      return { method: "DELETE", path: `/api/v1/organizations/${step.params.organization}` };
    },
    async handler(ctx) {
      const { state, step, entry } = ctx;
      const org = step.params.organization ?? state.orgName;
      if (!org) {
        entry.errors.push("delete-organization: no throwaway organization in state");
        return;
      }
      await mutateBoth(
        ctx,
        { method: "DELETE", path: `/organizations/${org}` },
        { method: "DELETE", path: `/api/v1/organizations/${org}` },
        "/organizations/:organizationName",
      );
      const legacyOrgs = await ctx.legacySession.request({ method: "GET", path: "/orgs" });
      const yoramOrgs = await ctx.yoramSession.request({ method: "GET", path: "/api/v1/organizations" });
      const inLegacy = String(legacyOrgs.body ?? "").includes(org);
      const inYoram = JSON.stringify(yoramOrgs.json ?? "").includes(org);
      if (inLegacy || inYoram) {
        entry.errors.push(`delete-organization: ${org} still present after cleanup (legacy=${inLegacy}, yoram=${inYoram})`);
      }
      state.orgDeleted = !inLegacy && !inYoram;
    },
  },

  "signup-user": {
    translateLegacy(step) {
      return {
        method: "POST",
        path: "/users/signup",
        form: {
          loginId: step.params.loginId,
          name: step.params.name,
          email: step.params.email,
          password: step.params.password,
          retypedPassword: step.params.password,
        },
        headers: { "content-type": "application/x-www-form-urlencoded" },
      };
    },
    translateYoram(step) {
      return {
        method: "POST",
        path: "/users/signup",
        form: {
          loginId: step.params.loginId,
          name: step.params.name,
          email: step.params.email,
          password: step.params.password,
          retypedPassword: step.params.password,
        },
      };
    },
    async handler(ctx) {
      const { state, suffix, helpers } = ctx;
      state.mailCountBefore = helpers.readMails().length;
      const sanitized = suffix.replace(/[^a-zA-Z0-9]/g, "");
      state.throwawayLoginId = `parity${sanitized}`;
      state.throwawayEmail = `${sanitized.toLowerCase()}@parity.example.com`;
      state.throwawayPassword = "parity-Pass1";
      // Signup runs from an anonymous session; prime a fresh one so the CSRF
      // token matches the logged-out cookie jar (mirrors YoramSession.login).
      const primed = await fetch(`${ctx.yoramBaseUrl}/api/auth/session`);
      ctx.yoramSession.csrfToken = primed.headers.get("x-csrf-token") ?? "";
      ctx.yoramSession.cookies = (primed.headers.getSetCookie?.() ?? [])
        .map((cookie) => cookie.split(";")[0])
        .join("; ");
      const form = {
        loginId: state.throwawayLoginId,
        name: `Parity Throwaway ${sanitized}`,
        email: state.throwawayEmail,
        password: state.throwawayPassword,
        retypedPassword: state.throwawayPassword,
      };
      await mutateBoth(ctx, { method: "POST", path: "/users/signup", form, headers: { "content-type": "application/x-www-form-urlencoded" } }, { method: "POST", path: "/users/signup", form }, "/users/signup");
    },
  },

  "toggle-account-lock": {
    translateLegacy(step) {
      return { method: "POST", path: withQuery("/sites/toggleAccountLock", `loginId=${encodeURIComponent(step.params.loginId)}`) };
    },
    translateYoram(step) {
      return { method: "POST", path: withQuery("/sites/toggleAccountLock", `loginId=${encodeURIComponent(step.params.loginId)}`) };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      const loginId = state.throwawayLoginId;
      if (!loginId) {
        entry.errors.push("toggle-account-lock: skipped, no throwaway user recorded");
        return;
      }
      // Lock then unlock — the throwaway account ends ACTIVE.
      for (let round = 0; round < 2; round += 1) {
        await mutateBoth(
          ctx,
          { method: "POST", path: withQuery("/sites/toggleAccountLock", `loginId=${loginId}`) },
          { method: "POST", path: withQuery("/sites/toggleAccountLock", `loginId=${loginId}`) },
          "/sites/toggleAccountLock",
        );
      }
    },
  },

  "toggle-guest-mode": {
    translateLegacy(step) {
      return { method: "POST", path: withQuery("/sites/toggleGuestMode", `loginId=${encodeURIComponent(step.params.loginId)}`) };
    },
    translateYoram(step) {
      return { method: "POST", path: withQuery("/sites/toggleGuestMode", `loginId=${encodeURIComponent(step.params.loginId)}`) };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      const loginId = state.throwawayLoginId;
      if (!loginId) {
        entry.errors.push("toggle-guest-mode: skipped, no throwaway user recorded");
        return;
      }
      // Guest flag flips on the TARGET user only; twice restores not-guest.
      for (let round = 0; round < 2; round += 1) {
        await mutateBoth(
          ctx,
          { method: "POST", path: withQuery("/sites/toggleGuestMode", `loginId=${loginId}`) },
          { method: "POST", path: withQuery("/sites/toggleGuestMode", `loginId=${loginId}`) },
          "/sites/toggleGuestMode",
        );
      }
    },
  },

  "toggle-site-admin-role": {
    translateLegacy(step) {
      return { method: "POST", path: `/sites/toggleSiteAdminRole/${step.params.loginId}` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/sites/toggleSiteAdminRole/${step.params.loginId}` };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      const loginId = state.throwawayLoginId;
      if (!loginId) {
        entry.errors.push("toggle-site-admin-role: skipped, no throwaway user recorded");
        return;
      }
      for (let round = 0; round < 2; round += 1) {
        await mutateBoth(
          ctx,
          { method: "POST", path: `/sites/toggleSiteAdminRole/${loginId}` },
          { method: "POST", path: `/sites/toggleSiteAdminRole/${loginId}` },
          "/sites/toggleSiteAdminRole/:loginId",
        );
      }
    },
  },

  "reset-site-user-password": {
    // Site-manager password reset on the THROWAWAY user only (deleted later
    // in the same scenario); seeded accounts are never targeted.
    translateLegacy(step) {
      return { method: "POST", path: withQuery(`/${step.params.loginId}`, "action=resetPassword") };
    },
    translateYoram(step) {
      return { method: "POST", path: withQuery(`/${step.params.loginId}`, "action=resetPassword") };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      const loginId = state.throwawayLoginId;
      if (!loginId) {
        entry.errors.push("reset-site-user-password: skipped, no throwaway user recorded");
        return;
      }
      await mutateBoth(
        ctx,
        { method: "POST", path: withQuery(`/${loginId}`, "action=resetPassword") },
        { method: "POST", path: withQuery(`/${loginId}`, "action=resetPassword") },
        "/:user",
      );
    },
  },

  "unwatch-update": {
    translateLegacy() {
      return { method: "POST", path: "/sites/unwatchUpdate" };
    },
    translateYoram() {
      return { method: "POST", path: "/sites/unwatchUpdate" };
    },
    async handler(ctx) {
      await mutateBoth(
        ctx,
        { method: "POST", path: "/sites/unwatchUpdate" },
        { method: "POST", path: "/sites/unwatchUpdate" },
        "/sites/unwatchUpdate",
      );
    },
  },

  "delete-site-user": {
    // Legacy route literal is "DELETE /sites/user/delete:userId" — the URL is
    // /sites/user/delete<id>; Yoram's {*legacy_path} catch-all parses the same
    // spelling.
    translateLegacy(step) {
      return { method: "DELETE", path: `/sites/user/delete${step.params.userId ?? 1}` };
    },
    translateYoram(step) {
      return { method: "DELETE", path: `/sites/user/delete${step.params.userId ?? 1}` };
    },
    async handler(ctx) {
      const { state, entry } = ctx;
      const loginId = state.throwawayLoginId;
      if (!loginId) {
        entry.errors.push("delete-site-user: skipped (no throwaway login id)");
        return;
      }
      state.throwawayUserIdLegacy ??= await resolveLegacyUserIdByLoginId(ctx, loginId);
      state.throwawayUserIdYoram ??= await resolveYoramUserIdByLoginId(ctx, loginId);
      const legacyUserId = state.throwawayUserIdLegacy;
      const yoramUserId = state.throwawayUserIdYoram;
      if (!legacyUserId) {
        entry.errors.push(`delete-site-user: skipped (loginId=${loginId}, legacy=${legacyUserId})`);
        return;
      }
      await mutateBoth(
        ctx,
        { method: "DELETE", path: `/sites/user/delete${legacyUserId}` },
        {
          method: "DELETE",
          path: yoramUserId
            ? `/sites/user/delete${yoramUserId}`
            : `/api/v1/site/users/${encodeURIComponent(loginId)}`,
        },
        "/sites/user/delete:userId",
      );
      const legacyList = await ctx.legacySession.request({ method: "GET", path: "/sites/userList?state=DELETED" });
      const yoramList = await ctx.yoramSession.request({ method: "GET", path: "/api/v1/site/users?state=deleted" });
      const legacyGone = !String(legacyList.body ?? "").includes(`data-user-id="${loginId}"`);
      const users = yoramList.json?.users ?? [];
      const yoramRow = users.find((user) => user.loginId === loginId);
      const yoramGone = !yoramRow || yoramRow.state === "DELETED" || yoramRow.state === "deleted";
      if (!legacyGone || !yoramGone) {
        entry.errors.push(`delete-site-user: ${loginId} still active after cleanup (legacyGone=${legacyGone}, yoramGone=${yoramGone})`);
      }
      state.throwawayDeleted = legacyGone && yoramGone;
    },
  },

  "edit-user-profile": {
    translateLegacy(step) {
      return { method: "POST", path: "/user/edit", form: { name: step.params.name, email: step.params.email } };
    },
    translateYoram(step) {
      return { method: "POST", path: "/user/edit", form: { name: step.params.name, email: step.params.email } };
    },
    async handler(ctx) {
      const { entry } = ctx;
      // Both parity seeds use the same admin identity; update then restore it.
      const originalForm = { name: ADMIN_DISPLAY_NAME, email: MAIN_EMAIL };
      const modifiedForm = { name: `${ADMIN_DISPLAY_NAME} parity`, email: MAIN_EMAIL };
      for (const form of [modifiedForm, originalForm]) {
        await mutateBoth(
          ctx,
          { method: "POST", path: "/user/edit", form },
          { method: "POST", path: "/user/edit", form },
          "/user/edit",
        );
      }
      void entry;
    },
  },

  "save-user-editform-tab": {
    // Benign tab save: non-token tabs only render their form on both sides —
    // no persisted state changes, so nothing to revert.
    translateLegacy(step) {
      return { method: "POST", path: `/user/editform/${step.params.tab}`, form: {} };
    },
    translateYoram(step) {
      return { method: "POST", path: `/user/editform/${step.params.tab}`, form: {} };
    },
    async handler(ctx) {
      const { step } = ctx;
      await mutateBoth(
        ctx,
        { method: "POST", path: `/user/editform/${step.params.tab}`, form: {} },
        { method: "POST", path: `/user/editform/${step.params.tab}`, form: {} },
        "/user/editform/:tabId",
      );
    },
  },

  "send-validation-email": {
    translateLegacy(step) {
      return { method: "POST", path: `/user/email/sendValidationEmail/${step.params.emailId ?? 1}` };
    },
    translateYoram(step) {
      return { method: "POST", path: `/user/email/sendValidationEmail/${step.params.emailId ?? 1}` };
    },
    async handler(ctx) {
      const { state, entry, helpers } = ctx;
      if (!state.emailAddress) {
        entry.errors.push("send-validation-email: skipped, no added address in state");
        return;
      }
      const rows = await emailRows(ctx);
      const legacyId = findEmailId(rows.legacy, state.emailAddress);
      const yoramId = findEmailId(rows.yoram, state.emailAddress);
      if (!legacyId || !yoramId) {
        entry.errors.push(`send-validation-email: id unresolved (legacy=${legacyId}, yoram=${yoramId})`);
        return;
      }
      state.validationEmailIdLegacy = legacyId;
      state.validationEmailIdYoram = yoramId;
      state.mailCountBefore = helpers.readMails().length;
      await mutateBoth(
        ctx,
        { method: "POST", path: `/user/email/sendValidationEmail/${legacyId}` },
        // Yoram's compat handler binds the CSRF token from the form body.
        { method: "POST", path: `/user/email/sendValidationEmail/${yoramId}`, form: { csrfToken: ctx.yoramSession.csrfToken ?? "" } },
        "/user/email/sendValidationEmail/:emailId",
      );
    },
  },
};

// --- wave C: email-token flows (B-0192/B-0285) ------------------------------
// The signup verification and password-reset mails land in the sweep SMTP
// sink; each side's mail carries its own absolute link (ports differ).
Object.assign(actionDefinitions, {
  "open-validation-link": {
    translateLegacy: () => ({ method: "GET", path: "/__validation-link-client-side__" }),
    translateYoram: () => ({ method: "GET", path: "/__validation-link-client-side__" }),
    async handler(ctx) {
      const { entry, state, options, yoramBaseUrl, helpers } = ctx;
      const ids = { legacy: state.validationEmailIdLegacy, yoram: state.validationEmailIdYoram };
      let mails = await helpers.waitForMail(state.mailCountBefore ?? 0);
      const hasConfirmation = (baseUrl, id) =>
        mails
          .flatMap((raw) => helpers.extractMailLinks(raw, "/user/email/confirm/"))
          .some((candidate) => {
            const url = new URL(candidate);
            return (url.port || "80") === (new URL(baseUrl).port || "80") && url.pathname.includes(`/${id}/`);
          });
      const deadline = Date.now() + 30_000;
      while ((!hasConfirmation(options.legacyUrl, ids.legacy) || !hasConfirmation(yoramBaseUrl, ids.yoram)) && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        mails = helpers.readMails();
      }
      const outcomes = {};
      for (const [side, baseUrl] of [["legacy", options.legacyUrl], ["yoram", yoramBaseUrl]]) {
        const expectedPort = new URL(baseUrl).port || "80";
        const link = mails
          .flatMap((raw) => helpers.extractMailLinks(raw, "/user/email/confirm/"))
          .find((candidate) => {
            const url = new URL(candidate);
            return (url.port || "80") === expectedPort && url.pathname.includes(`/${ids[side]}/`);
          });
        if (!link) {
          entry.errors.push(`open-validation-link: no ${side} confirmation mail captured`);
          continue;
        }
        const url = new URL(link);
        const result = await helpers.sendRaw(ctx, side, { method: "GET", path: `${url.pathname}${url.search}` });
        outcomes[side] = result.status;
      }
      if (outcomes.legacy !== undefined && outcomes.yoram !== undefined && (outcomes.legacy >= 400) !== (outcomes.yoram >= 400)) {
        entry.violations.push(violation({ route: "/user/email/confirm/:emailId/:token", behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected: { status: outcomes.legacy }, actual: { status: outcomes.yoram } }));
      }
    },
  },
  "open-verify-link": {
    // Client-side mail-driven flow; translators are inert registry stubs.
    translateLegacy: () => ({ method: "GET", path: "/__verify-link-client-side__" }),
    translateYoram: () => ({ method: "GET", path: "/__verify-link-client-side__" }),
    async handler(ctx) {
      const { entry, state, options, yoramBaseUrl, helpers } = ctx;
      const loginId = state.throwawayLoginId;
      dropBehaviorClaim(entry, "B-0192");
      if (!loginId) {
        entry.errors.push("open-verify-link: skipped, no throwaway user recorded");
        return;
      }
      const previousCount = state.mailCountBefore ?? 0;
      const deadline = Date.now() + 30_000;
      let mails = [];
      const findLink = (baseUrl) => {
        const expectedPort = new URL(baseUrl).port || "80";
        return mails
          .flatMap((raw) => helpers.extractMailLinks(raw, "/verify"))
          .find((candidate) => {
            const url = new URL(candidate);
            return (url.port || "80") === expectedPort && url.pathname.startsWith(`/verify/${loginId}/`);
          });
      };
      while (Date.now() <= deadline) {
        const allMails = helpers.readMails();
        mails = allMails.slice(0, Math.max(0, allMails.length - previousCount));
        if (findLink(options.legacyUrl) && findLink(yoramBaseUrl)) break;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
      const outcomes = {};
      state.verifyLinks = {};
      for (const [side, baseUrl] of [["legacy", options.legacyUrl], ["yoram", yoramBaseUrl]]) {
        const link = findLink(baseUrl);
        if (!link) {
          entry.errors.push(`open-verify-link: no ${side} verify mail captured for ${loginId}`);
          continue;
        }
        const url = new URL(link);
        state.verifyLinks[side] = `${url.pathname}${url.search}`;
        claimBehavior(entry, "B-0192");
        const result = await helpers.sendRaw(ctx, side, { method: "GET", path: state.verifyLinks[side] });
        outcomes[side] = result.status;
        if (result.status >= 400) {
          entry.errors.push(`open-verify-link: ${side} GET ${state.verifyLinks[side]} returned HTTP ${result.status}`);
        }
        if (side === "yoram" && result.status < 400) {
          const verificationCode = decodeURIComponent(url.pathname.split("/").pop() ?? "");
          const verifyApi = await helpers.sendRaw(ctx, "yoram", {
            method: "POST",
            path: "/api/v1/auth/verify",
            json: { loginId, verificationCode },
          });
          if (verifyApi.status >= 400) {
            entry.errors.push(`open-verify-link: yoram REST verification returned HTTP ${verifyApi.status}`);
          }
        }
      }
      if (outcomes.legacy !== undefined && outcomes.yoram !== undefined && (
        (outcomes.legacy >= 400) !== (outcomes.yoram >= 400)
        || outcomes.legacy !== outcomes.yoram
      )) {
        entry.violations.push(violation({
          route: "/verify/:loginId/:verificationCode",
          behaviorId: "B-0192",
          kind: "api",
          expected: { status: outcomes.legacy, path: state.verifyLinks.legacy },
          actual: { status: outcomes.yoram, path: state.verifyLinks.yoram },
        }));
      }
    },
  },
  "request-lost-password-for-throwaway": {
    translateLegacy(step, resolved = {}) {
      return { method: "POST", path: "/lostPassword", form: { loginId: resolved.loginId, emailAddress: resolved.emailAddress } };
    },
    translateYoram(step, resolved = {}) {
      return { method: "POST", path: "/lostPassword", form: { loginId: resolved.loginId, emailAddress: resolved.emailAddress } };
    },
    async handler(ctx) {
      const { state, helpers } = ctx;
      state.mailCountBefore = helpers.readMails().length;
      await mutateBoth(
        ctx,
        this.translateLegacy(ctx.step, { loginId: state.throwawayLoginId, emailAddress: state.throwawayEmail }),
        this.translateYoram(ctx.step, { loginId: state.throwawayLoginId, emailAddress: state.throwawayEmail }),
        "/lostPassword",
      );
    },
  },
  "complete-reset-for-throwaway": {
    // Client-side mail-driven flow; translators are inert registry stubs.
    translateLegacy: () => ({ method: "GET", path: "/__reset-complete-client-side__" }),
    translateYoram: () => ({ method: "GET", path: "/__reset-complete-client-side__" }),
    async handler(ctx) {
      const { entry, state, options, yoramBaseUrl, helpers } = ctx;
      // Deterministic selection: ONLY the newest mail addressed to the
      // throwaway user on each side; single replay, full payload+body dump
      // recorded on failure.
      const recipient = state.throwawayEmail;
      const mails = await helpers.waitForMail(state.mailCountBefore ?? 0);
      const outcomes = {};
      const evidence = [];
      for (const [side, baseUrl] of [["legacy", options.legacyUrl], ["yoram", yoramBaseUrl]]) {
        const base = new URL(baseUrl);
        const expectedPort = base.port || (base.protocol === "https:" ? "443" : "80");
        const mail = mails.find((raw) => {
          const to = /^To:\s*(.+)$/mu.exec(raw)?.[1] ?? "";
          if (!to.toLowerCase().includes(String(recipient).toLowerCase())) return false;
          return helpers.extractMailLinks(raw, "/resetPassword").some((candidate) => {
            const url = new URL(candidate);
            return (url.port || "80") === expectedPort;
          });
        });
        if (!mail) {
          entry.errors.push(`complete-reset-for-throwaway: no newest ${side} reset mail addressed to ${recipient}`);
          evidence.push({ side, recipient, error: "no matching mail" });
          continue;
        }
        const mailDate = /^Date:\s*(.+)$/mu.exec(mail)?.[1] ?? null;
        const links = helpers.extractMailLinks(mail, "/resetPassword").filter((candidate) => {
          const url = new URL(candidate);
          return (url.port || "80") === expectedPort;
        });
        // Single deterministic replay per extracted link; empty-s links are
        // skipped (they are not reset tokens).
        let status = null;
        const attemptLog = [];
        for (const candidate of links) {
          const hashString = new URL(candidate).searchParams.get("s");
          if (!hashString) continue;
          const payload = { hashString, password: state.throwawayPassword, retypedPassword: state.throwawayPassword };
          const result = await helpers.sendRaw(ctx, side, { method: "POST", path: "/resetPassword", form: payload });
          status = result.status;
          attemptLog.push({ hashString: hashString.slice(0, 10) + "…", status, responseSnippet: String(result.body ?? "").slice(0, 120) });
          if (status < 400) break;
        }
        outcomes[side] = status;
        evidence.push({ side, recipient, mailDate, links: links.length, attempts: attemptLog });
      }
      if (outcomes.legacy !== undefined && outcomes.yoram !== undefined && ((outcomes.legacy >= 400) !== (outcomes.yoram >= 400) || (outcomes.legacy >= 400 && outcomes.yoram >= 400 && outcomes.legacy !== outcomes.yoram))) {
        entry.violations.push(violation({ route: "/resetPassword", behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected: { status: outcomes.legacy }, actual: { status: outcomes.yoram, replayEvidence: evidence } }));
      }
    },
  },
  "set-user-avatar-from-attachment": {
    translateLegacy(step, resolved = {}) {
      return {
        method: "POST",
        path: "/sites/setAttachmentToUserAvatar",
        json: {
          avatarFileId: Number(resolved.avatarFileId ?? step.params.avatarFileId ?? 1),
          email: resolved.email ?? step.params.email ?? MAIN_EMAIL,
        },
      };
    },
    translateYoram(step, resolved = {}) {
      return {
        method: "POST",
        path: "/api/v1/site/users/avatar-from-attachment",
        json: {
          avatarFileId: Number(resolved.avatarFileId ?? step.params.avatarFileId ?? 1),
          email: resolved.email ?? step.params.email ?? MAIN_EMAIL,
        },
      };
    },
    async handler(ctx) {
      const { entry, state, step, suffix, helpers } = ctx;
      const email = step.params.email ?? MAIN_EMAIL;
      const sides = ["legacy", "yoram"];
      dropBehaviorClaim(entry, "B-0289");
      state.avatarOriginal = {};
      state.avatarAttachment = {};
      state.avatarSet = {};

      for (const side of sides) {
        try {
          state.avatarOriginal[side] = await readCurrentAvatar(ctx, side, "admin");
          if (state.avatarOriginal[side].status >= 400) {
            entry.errors.push(`set-user-avatar: ${side} current-avatar capture returned HTTP ${state.avatarOriginal[side].status}`);
          }
        } catch (error) {
          state.avatarOriginal[side] = { id: null, url: "", status: 0 };
          entry.errors.push(`set-user-avatar: ${side} current-avatar capture failed: ${error.message}`);
        }
      }

      for (const side of sides) {
        const result = await helpers.sendRaw(ctx, side, {
          method: "POST",
          path: "/files",
          multipart: avatarUploadMultipart(suffix),
        });
        const attachmentId = attachmentIdFromResult(result);
        state.avatarAttachment[side] = attachmentId;
        if (result.status >= 400 || !attachmentId) {
          entry.errors.push(
            `set-user-avatar: ${side} valid PNG upload refused (HTTP ${result.status}, id=${attachmentId ?? "none"}, body=${String(result.body ?? "").slice(0, 160)})`,
          );
        }
      }

      for (const side of sides) {
        const attachmentId = state.avatarAttachment[side];
        if (!attachmentId) continue;
        const translation = side === "legacy"
          ? this.translateLegacy(step, { avatarFileId: attachmentId, email })
          : this.translateYoram(step, { avatarFileId: attachmentId, email });
        claimBehavior(entry, "B-0289");
        const result = await helpers.sendRaw(ctx, side, translation);
        state.avatarSet[side] = result;
        if (result.status >= 400) {
          entry.errors.push(
            `set-user-avatar: ${side} exact avatar route refused valid PNG attachment ${attachmentId} (HTTP ${result.status}, body=${String(result.body ?? "").slice(0, 160)})`,
          );
        }
      }

      for (const side of sides) {
        const attachmentId = state.avatarAttachment[side];
        if (!attachmentId) continue;
        const originalId = state.avatarOriginal[side]?.id;
        if (originalId && state.avatarSet[side]?.status < 400) {
          const translation = side === "legacy"
            ? this.translateLegacy(step, { avatarFileId: originalId, email })
            : this.translateYoram(step, { avatarFileId: originalId, email });
          const restored = await helpers.sendRaw(ctx, side, translation);
          if (restored.status >= 400) {
            entry.errors.push(`set-user-avatar: ${side} captured avatar ${originalId} could not be restored (HTTP ${restored.status})`);
          }
        }
        const deleted = await helpers.sendRaw(ctx, side, {
          method: "POST",
          path: `/files/${attachmentId}`,
          multipart: attachmentDeleteMultipart(),
        });
        if (deleted.status >= 400) {
          entry.errors.push(`set-user-avatar: ${side} temporary attachment ${attachmentId} cleanup returned HTTP ${deleted.status}`);
        }
        try {
          const restoredAvatar = await readCurrentAvatar(ctx, side, "admin");
          const expectedId = originalId ?? null;
          if (restoredAvatar.id !== expectedId) {
            entry.errors.push(`set-user-avatar: ${side} avatar restore mismatch (expected=${expectedId ?? "gravatar"}, actual=${restoredAvatar.id ?? "gravatar"})`);
          }
        } catch (error) {
          entry.errors.push(`set-user-avatar: ${side} avatar restore verification failed: ${error.message}`);
        }
      }
    },
  },
});

// --- residual site-admin/user invalid probes ---------------------------------
//
// Empty forms exercise the route handlers without creating users, mail, or
// imported records. requestBoth records expected unsupported/validation errors.
async function residualStatusProbe(ctx, legacyTranslation, yoramTranslation, route) {
  const { legacyResult, yoramResult } = await ctx.helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
  if ((legacyResult.status >= 400) !== (yoramResult.status >= 400)) {
    pushApiViolation(ctx, route, `legacy HTTP ${legacyResult.status}`, `yoram HTTP ${yoramResult.status}`);
  }
}

const RESIDUAL_PROBE_ACTIONS = {
  "probe-site-export": {
    // Export streams a site archive. The residual probe only owns its HTTP
    // status contract; consuming the stream can make undici report a
    // terminated body after the server has already answered.
    translateLegacy: () => ({ method: "GET", path: "/sites/export", readBody: false }),
    translateYoram: () => ({ method: "GET", path: "/sites/export", readBody: false }),
    handler(ctx) {
      const legacy = this.translateLegacy();
      return residualStatusProbe(ctx, legacy, this.translateYoram(), legacy.path);
    },
  },
  "probe-site-import-invalid": {
    translateLegacy: () => ({ method: "POST", path: "/sites/import", form: {} }),
    translateYoram: () => ({ method: "POST", path: "/sites/import", form: {} }),
    handler(ctx) {
      const legacy = this.translateLegacy();
      return residualStatusProbe(ctx, legacy, this.translateYoram(), legacy.path);
    },
  },
  "probe-site-mail-invalid": {
    translateLegacy: () => ({ method: "POST", path: "/sites/mail", form: {} }),
    translateYoram: () => ({ method: "POST", path: "/sites/mail", form: {} }),
    handler(ctx) {
      const legacy = this.translateLegacy();
      return residualStatusProbe(ctx, legacy, this.translateYoram(), legacy.path);
    },
  },
  "probe-site-mail-list-invalid": {
    translateLegacy: () => ({ method: "POST", path: "/sites/mailList", form: {} }),
    translateYoram: () => ({ method: "POST", path: "/sites/mailList", form: {} }),
    handler(ctx) {
      const legacy = this.translateLegacy();
      return residualStatusProbe(ctx, legacy, this.translateYoram(), legacy.path);
    },
  },
  "probe-user-reset-password-invalid": {
    translateLegacy: () => ({ method: "POST", path: "/user/resetPassword", form: {} }),
    translateYoram: () => ({ method: "POST", path: "/user/resetPassword", form: {} }),
    handler(ctx) {
      const legacy = this.translateLegacy();
      return residualStatusProbe(ctx, legacy, this.translateYoram(), legacy.path);
    },
  },
};

Object.assign(actionDefinitions, RESIDUAL_PROBE_ACTIONS);

scenarios.push({
  id: "U25-residual-site-user-probes",
  title: "site-admin export/import/mail and invalid password-reset probes",
  actions: [
    { actor: "admin", action: "login", params: { loginId: "admin", password: "admin" } },
    { actor: "admin", action: "probe-site-export", params: {} },
    {
      actor: "admin",
      action: "probe-site-import-invalid",
      params: {},
      behaviorId: "B-0286",
      // Malformed import has no persisted-state readback; the response drift
      // remains blocking.
    },
    {
      actor: "admin",
      action: "probe-site-mail-invalid",
      params: {},
      behaviorId: "B-0287",
      // Legacy SiteApp.sendMail lets the EmailException escape on an invalid
      // from address (500) where yoram answers a clean 400; degenerate legacy
      // crash on a degenerate payload.
      // Invalid mail has no sent-message/readback assertion; keep the legacy
      // exception drift blocking.
    },
    { actor: "admin", action: "probe-site-mail-list-invalid", params: {} },
    { actor: "admin", action: "probe-user-reset-password-invalid", params: {} },
  ],
  behaviorMatcher: {
    action: /^(SiteApp\.(exportData|importData|sendMail|mailList)|UserApp\.resetUserPassword)$/,
    route: /^(GET \/sites\/export|POST \/sites\/(import|mail|mailList)|POST \/user\/resetPassword)$/,
  },
});
