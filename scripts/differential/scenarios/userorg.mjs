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
      { actor: "admin", action: "toggle-noti-watch", params: { owner: "admin", project: "sample", notiType: "NEW_ISSUE" } },
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
      { actor: "admin", action: "get-user-sidebar", params: {} },
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
      { actor: "bob", action: "leave-organization", params: {} },
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
      { actor: "admin", action: "save-user-editform-tab", params: { tab: "notifications" } },
      { actor: "admin", action: "save-user-editform-tab", params: { tab: "emails" } },
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
    ],
    behaviorMatcher: { action: /^PasswordResetApp\.resetPassword$/ },
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
  "view-org-subpage": (params) =>
    withQuery(`/organizations/${params.organization}/${params.page}`, params.query && `query=${encodeURIComponent(params.query)}`),
  "view-new-org-form": () => "/organizations/new",
  "view-user-editform": (params) => (params.tab ? `/user/editform/${params.tab}` : "/user/editform"),
  "view-site-screen": (params) => `/sites/${params.screen}`,
  "view-files-list": () => "/files",
 };


// --- mutation helpers --------------------------------------------------------
// Yoram registers the legacy-compat workspace routes (favorites, /user/email,
// /noti/toggle) at root level, so several translators below use identical
// paths on both sides. Divergences are reported per the sweep contract and the
// scenario continues; every toggle runs twice so state fully reverts.

function pushApiViolation(ctx, route, expected, actual) {
  ctx.entry.violations.push(
    violation({ route, behaviorId: ctx.entry.behaviorIds[0] ?? null, kind: "api", expected, actual }),
  );
}

async function mutateBoth(ctx, legacyTranslation, yoramTranslation, route) {
  const { legacyResult, yoramResult } = await ctx.helpers.requestBoth(ctx, legacyTranslation, yoramTranslation);
  if ((legacyResult.status >= 400) !== (yoramResult.status >= 400)) {
    pushApiViolation(ctx, route, `legacy HTTP ${legacyResult.status}`, `yoram HTTP ${yoramResult.status}`);
  }
  return { legacyResult, yoramResult };
}


async function resolveLegacyProjectId(ctx, owner, project) {
  const result = await ctx.legacySession.request({ method: "GET", path: `/${owner}/${project}` });
  return Number(/data-project-id="(\d+)"/u.exec(result.body ?? "")?.[1]) || null;
}

async function resolveYoramProjectId(ctx, owner, project) {
  const result = await ctx.yoramSession.request({ method: "GET", path: `/api/v1/owners/${owner}/projects/${project}` });
  return Number(result.json?.projectId ?? result.json?.project_id ?? 0) || null;
}

async function resolveLegacyIssueId(ctx, owner, project) {
  // legacy issuesAsJson keys the payload by issue row id.
  const result = await ctx.legacySession.request({ method: "GET", path: `/${owner}/${project}/issues?format=json` });
  return Number(Object.keys(result.json ?? {})[0]) || null;
}

async function resolveLegacyOrganizationId(ctx, organization) {
  const result = await ctx.legacySession.request({ method: "GET", path: "/orgs" });
  for (const chunk of String(result.body ?? "").split('data-organization-id="').slice(1)) {
    const id = /^(\d+)"/u.exec(chunk)?.[1];
    if (id && chunk.slice(0, 2000).includes(organization)) return Number(id);
  }
  return null;
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
  // /sites/userList renders data-user-id="<loginId>" next to the
  // /sites/user/delete<id> action link for each row.
  const page = await ctx.legacySession.request({ method: "GET", path: "/sites/userList" });
  for (const chunk of String(page.body ?? "").split('data-user-id="').slice(1)) {
    if (!chunk.startsWith(`${loginId}"`)) continue;
    const id = /\/sites\/user\/delete(\d+)/u.exec(chunk)?.[1];
    if (id) return Number(id);
  }
  return null;
}

async function resolveYoramUserIdByLoginId(ctx, loginId) {
  const result = await ctx.yoramSession.request({ method: "GET", path: "/api/v1/site/users" });
  const users = result.json?.users ?? [];
  const user = users.find((entry) => entry.loginId === loginId);
  return user ? Number(user.id) : null;
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
      return { method: "GET", path: `/api/v1/users/${step.params.user}/statistics/summary` };
    },
    handler: readApiHandler,
  },

  // --- organization screens --------------------------------------------------

  "view-org-subpage": {
    translateLegacy(step) {
      return {
        method: "GET",
        path: withQuery(
          `/organizations/${step.params.organization}/${step.params.page}`,
          step.params.query && `query=${encodeURIComponent(step.params.query)}`,
        ),
      };
    },
    translateYoram(step) {
      const { organization, page, query } = step.params;
      const apiPages = {
        boards: `/api/v1/organizations/${organization}/boards`,
        members: `/api/v1/organizations/${organization}/members`,
        pullrequests: `/api/v1/organizations/${organization}/pull-requests`,
        issues: `/api/v1/organizations/${organization}/issues`,
        search: withQuery(`/api/v1/organizations/${organization}/search`, query && `query=${encodeURIComponent(query)}`),
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
    handler: readPageHandler,
  },

  "view-files-list": {
    translateLegacy() {
      return { method: "GET", path: "/files" };
    },
    translateYoram() {
      return { method: "GET", path: "/files" };
    },
    handler: readPageHandler,
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
      const { helpers } = ctx;
      for (const path of ["/user/sidebar", "/user/usermenuTabContentList"]) {
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
        state.legacyIssueId ??= await resolveLegacyIssueId(ctx, owner, project);
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
      // Toggle on then off — the scenario leaves no favorite behind.
      const favored = { legacy: [], yoram: [] };
      for (let round = 0; round < 2; round += 1) {
        const { legacyResult, yoramResult } = await mutateBoth(
          ctx,
          { method: "POST", path: legacyPath },
          { method: "POST", path: yoramPath },
          legacyPath,
        );
        favored.legacy.push(typeof legacyResult.json?.favored === "boolean" ? legacyResult.json.favored : null);
        favored.yoram.push(typeof yoramResult.json?.favored === "boolean" ? yoramResult.json.favored : null);
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
      const final = await emailRows(ctx);
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
      const { state, suffix, entry, helpers } = ctx;
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
      await mutateBoth(ctx, { method: "POST", path: "/users/signup", form }, { method: "POST", path: "/users/signup", form }, "/users/signup");
      state.throwawayUserIdLegacy ??= await resolveLegacyUserIdByLoginId(ctx, state.throwawayLoginId);
      state.throwawayUserIdYoram ??= await resolveYoramUserIdByLoginId(ctx, state.throwawayLoginId);
      if (!state.throwawayUserIdLegacy || !state.throwawayUserIdYoram) {
        entry.errors.push(
          `signup-user: user id unresolved (legacy=${state.throwawayUserIdLegacy}, yoram=${state.throwawayUserIdYoram}); site-admin cleanup steps will be skipped`,
        );
      }
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
      const { throwawayLoginId: loginId, throwawayUserIdLegacy: legacyUserId, throwawayUserIdYoram: yoramUserId } = state;
      if (!loginId || !legacyUserId || !yoramUserId) {
        entry.errors.push(`delete-site-user: skipped (loginId=${loginId}, legacy=${legacyUserId}, yoram=${yoramUserId})`);
        return;
      }
      await mutateBoth(
        ctx,
        { method: "DELETE", path: `/sites/user/delete${legacyUserId}` },
        { method: "DELETE", path: `/sites/user/delete${yoramUserId}` },
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
        { method: "POST", path: `/user/email/sendValidationEmail/${yoramId}` },
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
      const mails = await helpers.waitForMail(state.mailCountBefore ?? 0);
      const ids = { legacy: state.validationEmailIdLegacy, yoram: state.validationEmailIdYoram };
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
      if (!loginId) {
        entry.errors.push("open-verify-link: skipped, no throwaway user recorded");
        return;
      }
      const mails = await helpers.waitForMail(state.mailCountBefore ?? 0);
      const outcomes = {};
      for (const [side, baseUrl] of [["legacy", options.legacyUrl], ["yoram", yoramBaseUrl]]) {
        const expectedPort = new URL(baseUrl).port || "80";
        const link = mails
          .flatMap((raw) => helpers.extractMailLinks(raw, "/verify"))
          .find((candidate) => {
            const url = new URL(candidate);
            return (url.port || "80") === expectedPort && url.pathname.includes(`/${loginId}/`);
          });
        if (!link) {
          entry.errors.push(`open-verify-link: no ${side} verify mail captured for ${loginId}`);
          continue;
        }
        const url = new URL(link);
        const result = await helpers.sendRaw(ctx, side, { method: "GET", path: `${url.pathname}${url.search}` });
        outcomes[side] = result.status;
      }
      if (outcomes.legacy !== undefined && outcomes.yoram !== undefined && (outcomes.legacy >= 400) !== (outcomes.yoram >= 400)) {
        entry.violations.push(violation({ route: "/verify/:loginId/:code", behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected: { status: outcomes.legacy }, actual: { status: outcomes.yoram } }));
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
      const mails = await helpers.waitForMail(state.mailCountBefore ?? 0);
      const outcomes = {};
      for (const [side, baseUrl] of [["legacy", options.legacyUrl], ["yoram", yoramBaseUrl]]) {
        const expectedPort = new URL(baseUrl).port || "80";
        const link = mails
          .flatMap((raw) => helpers.extractMailLinks(raw, "/resetPassword"))
          .find((candidate) => {
            const url = new URL(candidate);
            return (url.port || "80") === expectedPort;
          });
        if (!link) {
          entry.errors.push(`complete-reset-for-throwaway: no ${side} reset mail captured`);
          continue;
        }
        const hashString = new URL(link).searchParams.get("s") ?? "";
        const result = await helpers.sendRaw(ctx, side, {
          method: "POST",
          path: "/resetPassword",
          form: { hashString, password: state.throwawayPassword, retypedPassword: state.throwawayPassword },
        });
        outcomes[side] = result.status;
      }
      if (outcomes.legacy !== undefined && outcomes.yoram !== undefined && ((outcomes.legacy >= 400) !== (outcomes.yoram >= 400) || (outcomes.legacy >= 400 && outcomes.yoram >= 400 && outcomes.legacy !== outcomes.yoram))) {
        entry.violations.push(violation({ route: "/resetPassword", behaviorId: entry.behaviorIds[0] ?? null, kind: "api", expected: { status: outcomes.legacy }, actual: { status: outcomes.yoram } }));
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
    translateLegacy: () => ({ method: "GET", path: "/sites/export" }),
    translateYoram: () => ({ method: "GET", path: "/sites/export" }),
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
    { actor: "admin", action: "probe-site-import-invalid", params: {} },
    { actor: "admin", action: "probe-site-mail-invalid", params: {} },
    { actor: "admin", action: "probe-site-mail-list-invalid", params: {} },
    { actor: "admin", action: "probe-user-reset-password-invalid", params: {} },
  ],
  behaviorMatcher: {
    action: /^(SiteApp\.(exportData|importData|sendMail|mailList)|UserApp\.resetUserPassword)$/,
    route: /^(GET \/sites\/export|POST \/sites\/(import|mail|mailList)|POST \/user\/resetPassword)$/,
  },
});
