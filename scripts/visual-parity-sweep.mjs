import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { hasRawLegacyI18nKey, rawLegacyI18nKeys } from "./legacy-i18n-key-detector.mjs";
import { buildVisualComparison, summarizeVisualComparison } from "./visual-parity-comparison.mjs";
import { buildLegacyAuditCorpus } from "./visual-parity-sweep-corpus.mjs";
import { createWtrSweepPage, installWtrGravatarRoute, launchWtrBrowser } from "./wtr-browser.mjs";
import {
  captureRouteSqlFromLogs,
  createRouteMarker,
  writeRouteSqlArtifacts,
} from "./real-data-sql-capture.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const outputDir = resolve(
  repoRoot,
  process.env.YORAM_SWEEP_OUTPUT_DIR ?? "output/playwright/visual-sweep",
);
const screenshotDir = resolve(outputDir, "screenshots");
const legacyBaseUrl = (process.env.YONA_LEGACY_BASE_URL ?? "http://127.0.0.1:9000").replace(
  /\/$/,
  "",
);
const localBaseUrl = (process.env.YORAM_BASE_URL ?? "http://127.0.0.1:18101/yona").replace(
  /\/$/,
  "",
);
const realDataMode = process.env.YORAM_SWEEP_REAL_DATA === "1";
const writeParityMode = process.env.YORAM_SWEEP_WRITE_PARITY === "1";
const loginId =
  process.env.REAL_LOGIN_ID ?? process.env.YONA_LEGACY_LOGIN_ID ?? (realDataMode ? "" : "admin");
const password =
  process.env.REAL_PASSWORD ?? process.env.YONA_LEGACY_PASSWORD ?? (realDataMode ? "" : "admin");
const localLoginId =
  process.env.REAL_LOGIN_ID ?? process.env.YORAM_LOGIN_ID ?? (realDataMode ? "" : loginId);
const localPassword =
  process.env.REAL_PASSWORD ?? process.env.YORAM_PASSWORD ?? (realDataMode ? "" : password);
const sweepTarget = process.env.YORAM_SWEEP_TARGET ?? "both";
const requestedSweepPaths = parseRequestedSweepPaths(process.env.YORAM_SWEEP_PATHS);
const viewportProfile = parseViewportProfile(process.env.YORAM_SWEEP_VIEWPORT);
const sweepLocale = "ko-KR";
const traceTimings = process.env.YORAM_SWEEP_TRACE_TIMINGS === "1";
const warmPerformanceRepeat = process.env.YORAM_SWEEP_WARM_REPEAT === "1";
const sqlCaptureEnabled = process.env.YORAM_SWEEP_SQL_CAPTURE === "1";
const sqlCaptureGraceMs =
  parseOptionalNonNegativeInteger(process.env.YORAM_SWEEP_SQL_CAPTURE_GRACE_MS) ?? 500;
const sweepBatchSize = parseOptionalPositiveInteger(process.env.YORAM_SWEEP_BATCH_SIZE);
const sweepBatchIndex = parseOptionalNonNegativeInteger(process.env.YORAM_SWEEP_BATCH_INDEX);
if ((sweepBatchSize === null) !== (sweepBatchIndex === null)) {
  throw new Error("YORAM_SWEEP_BATCH_SIZE and YORAM_SWEEP_BATCH_INDEX must be provided together");
}
const sweepIsBatched = sweepBatchSize !== null;
const sweepScope = requestedSweepPaths.length > 0 ? "focused" : sweepIsBatched ? "batch" : "full";
const outputPrefix =
  sweepScope === "focused"
    ? "latest-focused"
    : sweepScope === "batch"
      ? `batch-${sweepBatchIndex}`
      : "latest";
const latestOutputName =
  viewportProfile.name === "desktop"
    ? `${outputPrefix}.json`
    : `${outputPrefix}-${viewportProfile.name}.json`;

const closeTimeoutMs = 5_000;
mkdirSync(outputDir, { recursive: true });
mkdirSync(screenshotDir, { recursive: true });

function parseViewportProfile(input) {
  const name = (input ?? "desktop").trim().toLowerCase();
  if (name === "mobile") {
    return { name: "mobile", width: 390, height: 844 };
  }
  if (name === "desktop" || name === "") {
    return { name: "desktop", width: 1366, height: 900 };
  }
  throw new Error(`Unsupported YORAM_SWEEP_VIEWPORT: ${input}`);
}

function parseOptionalPositiveInteger(input) {
  if (input === undefined || input.trim() === "") {
    return null;
  }
  const value = Number.parseInt(input, 10);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`Expected a positive integer, received: ${input}`);
  }
  return value;
}

function parseOptionalNonNegativeInteger(input) {
  if (input === undefined || input.trim() === "") {
    return null;
  }
  const value = Number.parseInt(input, 10);
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`Expected a non-negative integer, received: ${input}`);
  }
  return value;
}

function parseRequestedSweepPaths(input) {
  return [
    ...new Set(
      (input ?? "")
        .split(",")
        .map((path) => path.trim())
        .filter(Boolean)
        .map((path) => (path.startsWith("/") ? path : `/${path}`)),
    ),
  ];
}

const basePages = [
  "/",
  "/users/loginform",
  "/users/signupform",
  "/lostPassword",
  "/_help",
  "/projects",
  "/projectform",
  "/_import",
  "/orgs",
  "/organizations/new",
  "/search?keyword=yona&searchType=auto",
  "/notifications",
  "/notification?from=0&limit=20",
  "/user/issues",
  "/user/issues/new",
  "/user/issues/new/mine",
  "/user/files",
  "/user/editform",
  "/user/editform/password",
  "/user/editform/notifications",
  "/user/editform/emails",
  "/user/editform/token",
  "/sites/userList",
  "/sites/projectList",
  "/sites/postList",
  "/sites/issueList",
  "/sites/mail",
  "/sites/massmail",
  "/sites/update",
  "/sites/diagnostic",
  "/sites/data",
  "/admin",
];

const projectSuffixes = [
  "",
  "/issues",
  "/issue/1",
  "/issue/1/editform",
  "/issue/labelsform",
  "/issueform",
  "/posts",
  "/post/1",
  "/post/1/editform",
  "/postform",
  "/milestones",
  "/milestone/1",
  "/milestone/1/editform",
  "/newMilestoneForm",
  "/pullRequests",
  "/closedPullRequests",
  "/sentPullRequests",
  "/pullRequest/1",
  "/pullRequest/1/changes",
  "/pullRequest/1/changes/HEAD",
  "/pullRequest/1/editform",
  "/newPullRequestForm",
  "/reviews",
  "/code",
  "/code/",
  "/code/main",
  "/code/main/",
  "/code/main/README.md",
  "/commits",
  "/commits/",
  "/commits/main",
  "/commits/main/",
  "/commit/HEAD",
  "/compare/main...main",
  "/branches",
  "/search",
  "/members",
  "/watchers",
  "/settingform",
  "/webhooks",
  "/deleteform",
  "/transfer",
  "/newFork",
  "/statistics",
  "/changeVCS",
];

const localDirectApiSurfaces = [
  {
    expectKeys: ["profile", "recentProjects"],
    expectPaths: ["profile.loginId", "recentProjects"],
    method: "GET",
    path: "/user/usermenuTabContentList",
  },
  {
    expectKeys: ["iframePath", "siteName", "workspace"],
    expectPaths: ["iframePath", "workspace.profile.loginId", "workspace.recentProjects"],
    method: "GET",
    path: "/user/sidebar?path=%2Fadmin%2Fsample%2Fissue%2F1&hash=comment-7",
  },
  {
    expectKeys: ["hasMore", "items", "total"],
    headers: { accept: "application/json" },
    method: "GET",
    path: "/notification?from=0&limit=20",
  },
  {
    body: { body: "Preview **source** #1", breaks: false },
    expectKeys: ["bodyMarkdown", "breaks"],
    expectPaths: ["bodyMarkdown", "breaks"],
    method: "POST",
    path: "/markdown/admin/sample",
  },
  {
    expectJsonKind: "array",
    method: "GET",
    path: "/admin/sample/issue/labels",
  },
  {
    expectJsonKind: "object",
    headers: { accept: "application/json" },
    method: "GET",
    path: "/admin/sample/labels",
  },
  {
    expectArrayItemKeys: ["loginId", "name", "type"],
    expectJsonKind: "array",
    headers: { accept: "application/json" },
    method: "GET",
    minItems: 1,
    path: "/-_-api/v1/owners/admin/projects/sample/assignableUsers?query=admin",
  },
  {
    expectArrayItemKeys: ["loginId", "name", "type"],
    expectJsonKind: "array",
    headers: { accept: "application/json" },
    method: "GET",
    minItems: 1,
    path: "/-_-api/v1/owners/admin/projects/sample/issues/1/assignableUsers",
  },
  {
    expectArrayItemKeys: ["loginId", "name", "type"],
    expectJsonKind: "array",
    headers: { accept: "application/json" },
    method: "GET",
    path: "/-_-api/v1/owners/admin/projects/sample/issues/1/findSharer?query=admin",
  },
  {
    expectArrayItemKeys: ["loginId", "name", "type"],
    expectJsonKind: "array",
    headers: { accept: "application/json" },
    method: "GET",
    path: "/-_-api/v1/owners/admin/projects/sample/issues/1/sharableUsers?query=admin",
  },
  {
    expectKeys: ["result"],
    expectNestedArrayItemKeys: {
      result: ["loginid", "name", "searchText"],
    },
    expectNestedArrayMinItems: {
      result: 1,
    },
    method: "GET",
    path: "/admin/sample/mentionList?number=1&resourceType=ISSUE_POST&mentionType=user&query=",
  },
  {
    expectKeys: ["result"],
    expectNestedArrayItemKeys: {
      result: ["issueNo", "name", "title"],
    },
    expectNestedArrayMinItems: {
      result: 1,
    },
    method: "GET",
    path: "/admin/sample/mentionList?mentionType=issue&query=Sample",
  },
  {
    expectKeys: ["result"],
    expectNestedArrayItemKeys: {
      result: ["loginid", "name", "searchText"],
    },
    expectNestedArrayMinItems: {
      result: 1,
    },
    method: "GET",
    path: "/admin/sample/mentionListAtCommitDiff?mentionType=user&query=admin&commitId=HEAD",
  },
];

const alwaysScreenshotPaths = new Set([
  "/",
  "/admin/sample",
  "/admin/sample/",
  "/sample/sample/",
  "/users/loginform",
  "/admin/sample/settingform",
  "/admin/sample/members",
  "/admin/sample/watchers",
  "/admin/sample/webhooks",
  "/admin/svnplayground",
  "/admin/svnplayground/changeVCS",
  "/admin/svnplayground/closedPullRequests",
  "/admin/svnplayground/code",
  "/admin/sample/transfer",
  "/admin/sample/deleteform",
  "/admin/sample/changeVCS",
  "/admin/sample/issues",
  "/user/issues",
  "/admin/sample/issueform",
  "/admin/sample/issue/1/editform",
  "/admin/sample/issue/1",
  "/admin/sample/milestone/1/editform",
  "/admin/sample/newFork",
  "/admin/sample/newMilestoneForm",
  "/admin/sample/newPullRequestForm",
  "/admin/sample/post/1",
  "/admin/sample/post/1/editform",
  "/admin/sample/postform",
  "/admin/sample/postform?issueTemplate=true",
  "/admin/sample/postform?readme=true",
  "/admin/sample/pullRequests",
  "/projects",
  "/orgs",
  "/sites/userList",
  "/user/editform",
]);

function localSettledSelectorForPath(path) {
  const pathname = path.split("?", 1)[0];
  if (pathname.startsWith("/sites/")) {
    return null;
  }
  if (/\/milestone\/\d+$/u.test(pathname)) {
    return '[data-stylex-content-ready="true"]';
  }
  if (pathname.endsWith("/milestones")) {
    return '[data-stylex-content-ready="true"]';
  }
  if (
    pathname.endsWith("/newFork") ||
    pathname.endsWith("/postform") ||
    pathname.endsWith("/pullRequests") ||
    pathname.endsWith("/closedPullRequests") ||
    pathname.endsWith("/sentPullRequests")
  ) {
    return '[data-stylex-content-ready="true"]';
  }
  if (pathname === "/user/issues/new" || pathname === "/user/issues/new/mine") {
    return ".content-wrap.frm-wrap";
  }
  if (
    pathname.endsWith("/issueform") ||
    pathname.endsWith("/postform") ||
    /\/(?:issue|post)\/\d+\/editform$/u.test(pathname)
  ) {
    return ".textarea-box";
  }
  if (pathname.endsWith("/newFork")) {
    return ".content-wrap.frm-wrap";
  }
  if (pathname.endsWith("/newPullRequestForm")) {
    return '[data-stylex-content-ready="true"]';
  }
  if (/\/post\/\d+$/u.test(pathname)) {
    return "#comment-form .upload-wrap";
  }
  if (/\/code(?:\/|$)/u.test(pathname)) {
    return ".code-browse-wrap, .project-page-wrap .alert";
  }
  if (/\/commits\/?$/u.test(pathname)) {
    return ".page-wrap-outer .project-page-wrap #history";
  }
  if (pathname.endsWith("/branches")) {
    return ".page-wrap-outer .branch-list-wrap tbody tr";
  }
  const issueDetailMatch = pathname.match(/\/issue\/(\d+)$/u);
  if (issueDetailMatch) {
    return `#issue-body-${issueDetailMatch[1]} .content.markdown-wrap`;
  }
  if (pathname.endsWith("/issues")) {
    return '[data-stylex-content-ready="true"]';
  }
  if (pathname.endsWith("/posts")) {
    return '[data-stylex-content-ready="true"]';
  }
  if (pathname === "/user/issues") {
    return ".row-fluid.issue-list-wrap";
  }
  if (
    pathname.endsWith("/settingform") ||
    pathname.endsWith("/transfer") ||
    pathname.endsWith("/deleteform") ||
    pathname.endsWith("/changeVCS")
  ) {
    return ".bubble-wrap.gray, .box-wrap";
  }
  if (
    pathname.endsWith("/members") ||
    pathname.endsWith("/watchers") ||
    pathname.endsWith("/webhooks")
  ) {
    return ".project-page-wrap";
  }
  if (/^\/[^/?#]+\/[^/?#]+\/?$/u.test(pathname)) {
    return ".project-page-wrap";
  }
  return null;
}

const routeSampleValues = {
  $branch: "main",
  $commitId: "HEAD",
  $issueNumber: "1",
  $loginId: "admin",
  $milestoneId: "1",
  $organizationName: "weblabs",
  $owner: "admin",
  $pageName: "userList",
  $postNumber: "1",
  $projectName: "sample",
  $pullRequestNumber: "1",
  $revisionRange: "main...main",
  $user: "admin",
  $verificationCode: "invalid",
};

const routeTreeSampleAliases = {
  "/(legacy-auth)/reset-password": "/reset-password",
  "/$owner/$projectName/code/$branch/$": "/admin/sample/code/main/README.md",
  "/$owner/$projectName/code/$branch/": "/admin/sample/code/main/",
  "/$owner/$projectName/code/": "/admin/sample/code/",
  "/$owner/$projectName/commits/$branch/$": "/admin/sample/commits/main/",
  "/$owner/$projectName/commits/$branch/": "/admin/sample/commits/main/",
  "/$owner/$projectName/commits/": "/admin/sample/commits/",
  "/$owner/$projectName/": "/admin/sample/",
  "/sites/$pageName": null,
};

const blockedLinkPrefixes = [
  "/-_-api/",
  "/api/",
  "/assets/",
  "/authenticate/",
  "/files/",
  "/messages.js",
  "/noti/toggle/",
  "/users/logout",
];
const blockedLinkExtensions = /\.(?:css|gif|ico|jpeg|jpg|js|map|png|svg|woff2?)$/u;
const blockedLinkActions = /\/(?:delete|unwatch|vote)(?:\/|$)/u;
const rootNames = new Set([
  "_assets",
  "_help",
  "_import",
  "forgot-password",
  "admin",
  "assets",
  "login",
  "lostPassword",
  "me",
  "migration",
  "notifications",
  "notification",
  "organizations",
  "orgs",
  "projectform",
  "projects",
  "register",
  "reset-password",
  "search",
  "sites",
  "restricted",
  "user",
  "users",
  "verify",
]);
const userProfileRootNames = new Set(["admin"]);
let cachedLegacyAuditCorpus = null;

function samplePathFromRoutePath(routePath) {
  if (Object.hasOwn(routeTreeSampleAliases, routePath)) {
    return routeTreeSampleAliases[routePath];
  }
  if (routePath.includes("/(") || routePath.includes(")/")) {
    return null;
  }
  return routePath.replace(/\$[A-Za-z0-9_]+/gu, (token) => routeSampleValues[token] ?? "sample");
}

function routeTreeSamplePaths() {
  const source = readFileSync(resolve(repoRoot, "frontend/src/routeTree.gen.ts"), "utf8");
  const paths = [
    ...new Set(
      [...source.matchAll(/fullPath:\s*'([^']+)'/gu)]
        .map((match) => samplePathFromRoutePath(match[1]))
        .filter(Boolean),
    ),
  ];
  return paths.sort();
}

function legacyAuditDiscoveredPageLinks() {
  cachedLegacyAuditCorpus ??= buildLegacyAuditCorpus({ normalizePath, repoRoot });
  return cachedLegacyAuditCorpus.pages;
}

function legacyAuditCorpusSummary() {
  cachedLegacyAuditCorpus ??= buildLegacyAuditCorpus({ normalizePath, repoRoot });
  return {
    checkedAt: cachedLegacyAuditCorpus.checkedAt ?? null,
    error: cachedLegacyAuditCorpus.error,
    failed: cachedLegacyAuditCorpus.failed ?? 0,
    pages: cachedLegacyAuditCorpus.pages,
    path: cachedLegacyAuditCorpus.path,
    status: cachedLegacyAuditCorpus.status,
    warning: cachedLegacyAuditCorpus.warning ?? null,
  };
}

function urlFor(baseUrl, path) {
  return `${baseUrl}${path === "/" ? "/" : path}`;
}

function normalizePath(baseUrl, href) {
  try {
    const base = new URL(baseUrl);
    const url = new URL(href, baseUrl);
    if (url.origin !== base.origin) {
      return null;
    }
    let pathname = decodeURIComponent(url.pathname);
    if (base.pathname !== "/" && pathname.startsWith(base.pathname)) {
      pathname = pathname.slice(base.pathname.length) || "/";
    }
    if (!pathname.startsWith("/")) {
      pathname = `/${pathname}`;
    }
    if (
      /[{}]/u.test(pathname) ||
      blockedLinkPrefixes.some((prefix) => pathname.startsWith(prefix)) ||
      blockedLinkActions.test(pathname) ||
      blockedLinkExtensions.test(pathname)
    ) {
      return null;
    }
    return `${pathname}${url.search}`.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
}

function sessionPrimerPathForPath(path) {
  if (realDataMode) {
    return null;
  }
  const pathname = path.split(/[?#]/u, 1)[0];
  return pathname === "/user/issues/new" ? "/alice/sample" : null;
}

async function primeSessionProjectVisit(page, baseUrl, projectPath, label) {
  // IssueApp.newDirectIssueForm uses the signed-in user's most recently visited
  // project. Visit the same project in both browser sessions immediately before
  // inspecting that route so a mutable legacy instance cannot change the frame.
  await page.goto(urlFor(baseUrl, projectPath), { waitUntil: "domcontentloaded" });
  // Legacy persists the visit through Play's asynchronous RecentProject task.
  // Wait for that server-side write before opening the direct issue form.
  if (label === "legacy") {
    await page.waitForTimeout(500);
    return;
  }

  // The SPA navigation above preserves browser parity; persist the same visit
  // explicitly because this fixture route is also used against production builds.
  const response = await postLocalJson(page, baseUrl, "/api/v1/workspace/recent-projects", {
    ownerName: "alice",
    projectName: "sample",
  });
  if (!response?.ok()) {
    throw new Error("could not prime local recent project for /user/issues/new");
  }
}

async function login(page, baseUrl) {
  if (!loginId || !password) {
    return false;
  }
  await page.goto(urlFor(baseUrl, "/users/loginform"), { waitUntil: "domcontentloaded" });
  const loginField = page.locator('input[name="loginIdOrEmail"], input#loginIdOrEmail').first();
  const passwordField = page.locator('input[name="password"], input#password').first();
  await loginField.waitFor({ timeout: 10_000 }).catch(() => {});
  await passwordField.waitFor({ timeout: 10_000 }).catch(() => {});
  if ((await loginField.count()) === 0 || (await passwordField.count()) === 0) {
    return false;
  }
  await loginField.fill(loginId);
  await passwordField.fill(password);
  const loginForm = page.locator('form:has(input[name="loginIdOrEmail"])').first();
  const submitButton = loginForm.locator('button[type="submit"], input[type="submit"]').first();
  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), submitButton.click()]);
  const loginPath = new URL(urlFor(baseUrl, "/users/loginform")).pathname;
  const currentPath = new URL(page.url()).pathname;
  const loginFieldVisible = await loginField.isVisible().catch(() => false);
  return currentPath !== loginPath && !loginFieldVisible;
}

async function readLocalCsrfToken(page, baseUrl) {
  const sessionResponse = await page.request.get(`${baseUrl}/api/auth/session`);
  if (!sessionResponse.ok()) {
    return null;
  }
  return sessionResponse.headers()["x-csrf-token"] ?? null;
}

async function postLocalJson(page, baseUrl, path, data) {
  const csrfToken = await readLocalCsrfToken(page, baseUrl);
  if (!csrfToken) {
    return null;
  }
  return page.request.post(`${baseUrl}${path}`, {
    data,
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
}

async function putLocalJson(page, baseUrl, path, data) {
  const csrfToken = await readLocalCsrfToken(page, baseUrl);
  if (!csrfToken) {
    return null;
  }
  return page.request.put(`${baseUrl}${path}`, {
    data,
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
}

async function patchLocalJson(page, baseUrl, path, data) {
  const csrfToken = await readLocalCsrfToken(page, baseUrl);
  if (!csrfToken) {
    return null;
  }
  return page.request.patch(`${baseUrl}${path}`, {
    data,
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
}

async function patchLocalWorkspaceProfile(page, baseUrl, { emailAddress, name }) {
  const csrfToken = await readLocalCsrfToken(page, baseUrl);
  if (!csrfToken) {
    return null;
  }
  return page.request.patch(`${baseUrl}/api/v1/workspace/profile`, {
    data: {
      avatarAttachmentId: "",
      email: emailAddress,
      name,
    },
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
}

async function signInLocalAccount(page, baseUrl, identifier, accountPassword) {
  const response = await postLocalJson(page, baseUrl, "/api/v1/auth/sign-in", {
    identifier,
    password: accountPassword,
    rememberMe: true,
  });
  return response?.ok() ?? false;
}

async function signOutLocalAccount(page, baseUrl) {
  const csrfToken = await readLocalCsrfToken(page, baseUrl);
  if (!csrfToken) {
    return false;
  }
  const response = await page.request.post(`${baseUrl}/api/v1/auth/sign-out`, {
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
  return response.ok();
}

async function registerLocalAccount(page, baseUrl, { emailAddress, loginId, name, password }) {
  const response = await postLocalJson(page, baseUrl, "/api/v1/auth/register", {
    emailAddress,
    loginId,
    name,
    password,
    retypedPassword: password,
  });
  return response?.ok() ?? false;
}

async function ensureLocalAccountSession(page, baseUrl, account) {
  const registered = await registerLocalAccount(page, baseUrl, account);
  return registered || (await signInLocalAccount(page, baseUrl, account.loginId, account.password));
}

async function bootstrapLocalAccount(page, baseUrl) {
  const csrfToken = await readLocalCsrfToken(page, baseUrl);
  if (!csrfToken) {
    return false;
  }
  const adminAccount = {
    emailAddress: "admin@example.com",
    loginId: "admin",
    name: "Site Admin",
    password: "admin",
  };
  const aliceAccount = {
    emailAddress: "alice@example.com",
    loginId: "alice",
    name: "Alice Kim",
    password: "admin",
  };
  const bobAccount = {
    emailAddress: "bob@example.com",
    loginId: "bob",
    name: "Bob Park",
    password: "admin",
  };
  const carolAccount = {
    emailAddress: "carol@example.com",
    loginId: "carol",
    name: "Carol Lee",
    password: "admin",
  };
  const ensureProtectedPortalWatchers = async () => {
    await signOutLocalAccount(page, baseUrl).catch(() => {});
    const signedInCarol = await ensureLocalAccountSession(page, baseUrl, carolAccount);
    if (!signedInCarol) {
      return;
    }
    await signOutLocalAccount(page, baseUrl).catch(() => {});
    const signedInAdmin = await ensureLocalAccountSession(page, baseUrl, adminAccount);
    if (!signedInAdmin) {
      return;
    }
    await postLocalJson(page, baseUrl, "/api/v1/organizations/weblabs/members", {
      loginId: "carol",
    });
    await postLocalJson(page, baseUrl, "/api/v1/owners/weblabs/projects/portal/members", {
      loginId: "carol",
    });
    await postLocalJson(page, baseUrl, "/api/v1/owners/weblabs/projects/portal/watch", {});
    await signOutLocalAccount(page, baseUrl).catch(() => {});
    const signedInCarolAgain = await ensureLocalAccountSession(page, baseUrl, carolAccount);
    if (!signedInCarolAgain) {
      return;
    }
    await postLocalJson(page, baseUrl, "/api/v1/owners/weblabs/projects/portal/watch", {});
    await signOutLocalAccount(page, baseUrl).catch(() => {});
    await ensureLocalAccountSession(page, baseUrl, adminAccount);
  };
  const ensureAdminFixtures = async () => {
    const sampleMilestonePayload = {
      attachmentIds: [],
      contentsMarkdown: "Milestone for local legacy parity verification screens.",
      dueDate: "2026-07-31",
      state: "open",
      title: "Parity launch",
    };

    await postLocalJson(page, baseUrl, "/api/v1/owners/admin/projects", {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      overview: "Sample project",
      projectName: "sample",
      projectScope: "public",
      pullRequest: true,
      review: true,
      vcs: "git",
    });
    await patchLocalJson(page, baseUrl, "/api/v1/owners/admin/projects/sample/overview", {
      overview: "Parity seed project for the admin workspace",
    });
    await postLocalJson(page, baseUrl, "/api/v1/owners/admin/projects/sample/watch", {});
    const sampleLabelsResponse = await page.request.get(
      `${baseUrl}/api/v1/owners/admin/projects/sample/labels`,
    );
    const sampleLabelsPayload = sampleLabelsResponse.ok()
      ? await sampleLabelsResponse.json().catch(() => [])
      : [];
    const sampleLabels = Array.isArray(sampleLabelsPayload)
      ? sampleLabelsPayload
      : Array.isArray(sampleLabelsPayload?.labels)
        ? sampleLabelsPayload.labels
        : [];
    const parityLabelSeeds = [
      { labelColor: "#51aacc", labelName: "버그" },
      { labelColor: "#88bb44", labelName: "기능" },
    ];
    while (sampleLabels.length < parityLabelSeeds.length) {
      const seed = parityLabelSeeds[sampleLabels.length];
      const createdLabelResponse = await postLocalJson(
        page,
        baseUrl,
        "/api/v1/owners/admin/projects/sample/labels",
        {
          categoryIsExclusive: false,
          categoryName: "종류",
          ...seed,
        },
      );
      if (!createdLabelResponse) break;
      const createdLabel = await createdLabelResponse.json().catch(() => null);
      sampleLabels.push(createdLabel?.label ?? createdLabel);
    }
    const issueResponse = await page.request.get(
      `${baseUrl}/api/v1/projects/admin/sample/issues/1`,
    );
    if (!issueResponse.ok()) {
      await postLocalJson(page, baseUrl, "/api/v1/projects/admin/sample/issues", {
        assigneeLoginId: "",
        attachmentIds: [],
        bodyMarkdown: "Sample issue body",
        dueDate: "",
        isDraft: false,
        isPublish: false,
        labelIds: [],
        title: "Sample issue",
      });
    }
    const postResponse = await page.request.get(`${baseUrl}/api/v1/projects/admin/sample/posts/1`);
    if (!postResponse.ok()) {
      await postLocalJson(page, baseUrl, "/api/v1/projects/admin/sample/posts", {
        attachmentIds: [],
        bodyMarkdown: "Sample board post body",
        branch: "",
        edit: false,
        issueTemplate: false,
        labelIds: [],
        lineEnding: "",
        newFileName: "",
        notice: false,
        path: "",
        readme: false,
        title: "Sample board post",
      });
    }
    let sampleMilestoneId = 1;
    const milestoneResponse = await page.request.get(
      `${baseUrl}/api/v1/owners/admin/projects/sample/milestones/1`,
    );
    if (!milestoneResponse.ok()) {
      const createdMilestoneResponse = await postLocalJson(
        page,
        baseUrl,
        "/api/v1/owners/admin/projects/sample/milestones",
        sampleMilestonePayload,
      );
      const createdMilestone = createdMilestoneResponse
        ? await createdMilestoneResponse.json().catch(() => null)
        : null;
      sampleMilestoneId = Number(createdMilestone?.milestone?.id ?? 1);
    }
    const seededIssueResponse = await page.request.get(
      `${baseUrl}/api/v1/projects/admin/sample/issues/1`,
    );
    if (seededIssueResponse.ok()) {
      const seededIssue = await seededIssueResponse.json().catch(() => null);
      const parityLabelIds = sampleLabels
        .map((label) =>
          Number(label?.id ?? label?.labelId ?? label?.label?.id ?? label?.label?.labelId ?? 0),
        )
        .filter((id) => id > 0);
      const issueLabelIds = Array.isArray(seededIssue?.labelIds)
        ? seededIssue.labelIds.map(Number).filter(Number.isFinite)
        : [];
      const nextIssueLabelIds = [...new Set([...issueLabelIds, ...parityLabelIds])];
      if (nextIssueLabelIds.length !== issueLabelIds.length) {
        await putLocalJson(page, baseUrl, "/api/v1/projects/admin/sample/issues/1", {
          assigneeLoginId: seededIssue?.assigneeLoginId ?? "",
          attachmentIds: [],
          bodyMarkdown: seededIssue?.bodyMarkdown ?? "Sample issue body",
          dueDate: seededIssue?.dueDateLabel ?? "",
          isDraft: seededIssue?.isDraft ?? false,
          isPublish: false,
          labelIds: nextIssueLabelIds,
          milestoneId: Number(seededIssue?.milestoneId ?? 0),
          title: seededIssue?.title ?? "Sample issue",
        });
      }
      if (Number(seededIssue?.milestoneId ?? 0) === 0) {
        await putLocalJson(page, baseUrl, "/api/v1/projects/admin/sample/issues/1", {
          assigneeLoginId: seededIssue?.assigneeLoginId ?? "",
          attachmentIds: [],
          bodyMarkdown: seededIssue?.bodyMarkdown ?? "Sample issue body",
          dueDate: seededIssue?.dueDateLabel ?? "",
          isDraft: seededIssue?.isDraft ?? false,
          isPublish: false,
          labelIds: nextIssueLabelIds,
          milestoneId: sampleMilestoneId,
          title: seededIssue?.title ?? "Sample issue",
        });
      }
    }
    await postLocalJson(page, baseUrl, "/api/v1/organizations", {
      description: "Parity seed organization for frontend conversion checks",
      organizationName: "weblabs",
    });
    await postLocalJson(page, baseUrl, "/api/v1/owners/weblabs/projects", {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      overview: "Group portal for parity seed",
      projectName: "portal",
      projectScope: "protected",
      pullRequest: true,
      review: true,
      vcs: "git",
    });
    await postLocalJson(page, baseUrl, "/api/v1/owners/admin/projects", {
      board: true,
      code: true,
      issue: true,
      milestone: true,
      overview: "SVN parity fixture",
      projectName: "svnplayground",
      projectScope: "public",
      pullRequest: true,
      review: true,
      vcs: "svn",
    });
    await patchLocalJson(page, baseUrl, "/api/v1/owners/admin/projects/svnplayground/overview", {
      overview: "Parity seed Subversion project for localhost checks",
    });
    await postLocalJson(page, baseUrl, "/api/v1/owners/admin/projects/svnplayground/watch", {});
    await ensureProtectedPortalWatchers();
    await postLocalJson(page, baseUrl, "/api/v1/workspace/recent-projects", {
      ownerName: "admin",
      projectName: "sample",
    });
    await postLocalJson(page, baseUrl, "/api/v1/workspace/recent-projects", {
      ownerName: "admin",
      projectName: "svnplayground",
    });
    await postLocalJson(page, baseUrl, "/api/v1/workspace/recent-projects", {
      ownerName: "weblabs",
      projectName: "portal",
    });
  };
  const ensureAliceSampleFork = async () => {
    await signOutLocalAccount(page, baseUrl).catch(() => {});
    const signedInAdmin = await ensureLocalAccountSession(page, baseUrl, adminAccount);
    if (!signedInAdmin) {
      return;
    }
    await postLocalJson(page, baseUrl, "/api/v1/owners/admin/projects/sample/fork", {
      name: "sample",
      owner: "alice",
      projectScope: "public",
    });
    await signOutLocalAccount(page, baseUrl).catch(() => {});
    const signedInAlice = await ensureLocalAccountSession(page, baseUrl, aliceAccount);
    if (!signedInAlice) {
      return;
    }
    await postLocalJson(page, baseUrl, "/api/v1/workspace/recent-projects", {
      ownerName: "alice",
      projectName: "sample",
    });
    const aliceWatchersResponse = await page.request.get(
      `${baseUrl}/api/v1/owners/alice/projects/sample/watchers`,
    );
    const aliceWatchers = aliceWatchersResponse.ok()
      ? await aliceWatchersResponse.json().catch(() => null)
      : null;
    if (!aliceWatchers?.watchers?.some((watcher) => watcher.loginId === "alice")) {
      await postLocalJson(page, baseUrl, "/api/v1/owners/alice/projects/sample/watch", {});
    }
    await signOutLocalAccount(page, baseUrl).catch(() => {});
  };
  const ensureParityComments = async () => {
    const ensureComment = async (
      account,
      path,
      contentsMarkdown,
      parentContentsMarkdown = null,
    ) => {
      await signOutLocalAccount(page, baseUrl).catch(() => {});
      if (!(await ensureLocalAccountSession(page, baseUrl, account))) {
        return;
      }
      const existingResponse = await page.request.get(`${baseUrl}${path}`);
      const existing = existingResponse.ok()
        ? await existingResponse.json().catch(() => null)
        : null;
      const comments = Array.isArray(existing?.comments) ? existing.comments : [];
      if (comments.some((comment) => comment.contentsMarkdown === contentsMarkdown)) {
        return;
      }
      const parentCommentId = parentContentsMarkdown
        ? Number(
            comments.find((comment) => comment.contentsMarkdown === parentContentsMarkdown)?.id ??
              0,
          ) || null
        : null;
      await postLocalJson(page, baseUrl, `${path}/comments`, {
        attachmentIds: [],
        contentsMarkdown,
        parentCommentId,
      });
    };

    await ensureComment(
      bobAccount,
      "/api/v1/projects/admin/sample/issues/1",
      "I can reproduce the legacy issue view from this seed.",
    );
    await ensureComment(
      aliceAccount,
      "/api/v1/projects/admin/sample/posts/1",
      "Board seed confirmed from the fork contributor side.",
    );
    await ensureComment(
      adminAccount,
      "/api/v1/projects/admin/sample/posts/1",
      "Batch 814 nested parity",
      "Board seed confirmed from the fork contributor side.",
    );
    await signOutLocalAccount(page, baseUrl).catch(() => {});
  };
  const adminReady = await ensureLocalAccountSession(page, baseUrl, adminAccount);
  if (adminReady) {
    await patchLocalWorkspaceProfile(page, baseUrl, adminAccount);
    await ensureAdminFixtures();
    await ensureAliceSampleFork();
    await ensureParityComments();
    const signedInAdminAgain = await ensureLocalAccountSession(page, baseUrl, adminAccount);
    if (signedInAdminAgain) {
      await postLocalJson(page, baseUrl, "/api/v1/workspace/recent-projects", {
        ownerName: "alice",
        projectName: "sample",
      });
    }
    return signedInAdminAgain;
  }
  const suffix = Date.now().toString(36);
  const registeredSweepUser = await registerLocalAccount(page, baseUrl, {
    emailAddress: `sweep-${suffix}@example.com`,
    loginId: `sweep-${suffix}`,
    name: "Visual Sweep",
    password: "doorpass1",
  });
  return registeredSweepUser;
}

async function loginLocal(page, baseUrl) {
  if (realDataMode) {
    if (!localLoginId || !localPassword) {
      return false;
    }
    return signInLocalAccount(page, baseUrl, localLoginId, localPassword);
  }
  return bootstrapLocalAccount(page, baseUrl);
}
async function discoverRealDataPaths(page, baseUrl) {
  const queue = [...basePages];
  const seen = new Set();
  const discovered = new Set();
  const maxPages = 250;
  while (queue.length > 0 && seen.size < maxPages) {
    const path = queue.shift();
    if (seen.has(path)) {
      continue;
    }
    seen.add(path);
    discovered.add(path);
    await page
      .goto(urlFor(baseUrl, path), {
        waitUntil: "domcontentloaded",
        timeout: 20_000,
      })
      .catch(() => {});
    const hrefs = await page
      .locator("a[href]")
      .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""))
      .catch(() => []);
    for (const href of hrefs) {
      const normalized = normalizePath(baseUrl, href);
      if (normalized && !seen.has(normalized) && !queue.includes(normalized)) {
        queue.push(normalized);
      }
    }
  }
  return [...discovered].sort();
}

async function discoverProjectPaths(page, baseUrl) {
  await page.goto(urlFor(baseUrl, "/projects"), { waitUntil: "domcontentloaded" });
  await page.waitForSelector("a[href]", { timeout: 10_000 }).catch(() => {});
  const hrefs = await page
    .locator("a[href]")
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.getAttribute("href") ?? ""));
  const projectRoots = [
    ...new Set(
      hrefs
        .map((href) => normalizePath(baseUrl, href))
        .filter(Boolean)
        .map((path) => path.split("?")[0].split("/").filter(Boolean))
        .filter(
          (parts) =>
            parts.length >= 2 &&
            (!rootNames.has(parts[0]) || userProfileRootNames.has(parts[0])) &&
            !parts[0].startsWith("-"),
        )
        .map((parts) => `/${parts[0]}/${parts[1]}`),
    ),
  ].sort();
  return projectRoots.flatMap((root) => projectSuffixes.map((suffix) => `${root}${suffix}`));
}

async function inspectLocalDirectApiSurface(page, baseUrl, surface) {
  const requestOptions = {
    headers: surface.headers ?? {},
  };
  let response;
  if (surface.method === "POST") {
    response = await page.request.post(`${baseUrl}${surface.path}`, {
      ...requestOptions,
      data: surface.body ?? {},
    });
  } else {
    response = await page.request.get(`${baseUrl}${surface.path}`, requestOptions);
  }
  const contentType = response.headers()["content-type"] ?? "";
  const text = await response.text();
  const errors = [];
  let payload = null;
  if (!response.ok()) {
    errors.push(`HTTP ${response.status()}`);
  }
  if (!contentType.startsWith("application/json")) {
    errors.push(`non-json content-type: ${contentType || "(missing)"}`);
  }
  if (/<(?:!doctype|html|body|div|ul|li|span|a)\b/iu.test(text)) {
    errors.push("html fragment visible in direct API response");
  }
  try {
    payload = JSON.parse(text);
  } catch {
    errors.push("response is not valid JSON");
  }
  if (payload) {
    const payloadKind = Array.isArray(payload) ? "array" : typeof payload;
    if (surface.expectJsonKind && payloadKind !== surface.expectJsonKind) {
      errors.push(`payload kind ${payloadKind}, expected ${surface.expectJsonKind}`);
    }
    if (Array.isArray(payload)) {
      if (surface.minItems && payload.length < surface.minItems) {
        errors.push(`payload has ${payload.length} item(s), expected at least ${surface.minItems}`);
      }
      for (const key of surface.expectArrayItemKeys ?? []) {
        if (
          payload.length > 0 &&
          !payload.some(
            (item) =>
              item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, key),
          )
        ) {
          errors.push(`missing array item key: ${key}`);
        }
      }
    }
    for (const key of surface.expectKeys ?? []) {
      if (!Object.prototype.hasOwnProperty.call(payload, key)) {
        errors.push(`missing payload key: ${key}`);
      }
    }
    for (const [path, keys] of Object.entries(surface.expectNestedArrayItemKeys ?? {})) {
      const value = path
        .split(".")
        .reduce(
          (current, segment) => (current && typeof current === "object" ? current[segment] : null),
          payload,
        );
      if (!Array.isArray(value)) {
        errors.push(`nested path is not an array: ${path}`);
        continue;
      }
      const minItems = surface.expectNestedArrayMinItems?.[path] ?? 0;
      if (minItems && value.length < minItems) {
        errors.push(
          `nested array ${path} has ${value.length} item(s), expected at least ${minItems}`,
        );
      }
      for (const key of keys) {
        if (
          value.length > 0 &&
          !value.some(
            (item) =>
              item && typeof item === "object" && Object.prototype.hasOwnProperty.call(item, key),
          )
        ) {
          errors.push(`missing nested array item key ${path}.${key}`);
        }
      }
    }
    for (const path of surface.expectPaths ?? []) {
      const hasPath = path.split(".").every((segment, index, segments) => {
        const current = segments
          .slice(0, index)
          .reduce(
            (value, key) => (value && typeof value === "object" ? value[key] : null),
            payload,
          );
        return (
          current &&
          typeof current === "object" &&
          Object.prototype.hasOwnProperty.call(current, segment)
        );
      });
      if (!hasPath) {
        errors.push(`missing payload path: ${path}`);
      }
    }
  }
  if (
    surface.path.startsWith("/markdown/") &&
    payload &&
    (Object.prototype.hasOwnProperty.call(payload, "bodyHtml") ||
      Object.prototype.hasOwnProperty.call(payload, "html"))
  ) {
    errors.push("markdown preview returned rendered HTML field");
  }
  return {
    contentType,
    method: surface.method,
    ok: errors.length === 0,
    payloadKind: payload === null ? null : Array.isArray(payload) ? "array" : typeof payload,
    payloadKeys:
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? Object.keys(payload).sort()
        : [],
    arrayLength: Array.isArray(payload) ? payload.length : null,
    path: surface.path,
    status: response.status(),
    errors,
  };
}

async function inspectLocalDirectApiSurfaces(page, baseUrl) {
  const results = [];
  for (const surface of localDirectApiSurfaces) {
    results.push(await inspectLocalDirectApiSurface(page, baseUrl, surface));
  }
  return {
    failed: results.filter((result) => !result.ok).length,
    passed: results.filter((result) => result.ok).length,
    results,
    total: results.length,
  };
}

function waitForNavigationSessionResponse(page, baseUrl) {
  const sessionUrl = new URL(`${baseUrl}/api/v1/session`);
  return Promise.race([
    page.waitForResponse(
      (response) => {
        const responseUrl = new URL(response.url());
        return (
          response.request().method() === "GET" &&
          responseUrl.origin === sessionUrl.origin &&
          responseUrl.pathname === sessionUrl.pathname
        );
      },
      { timeout: 3_000 },
    ),
    page.request.get(sessionUrl.toString()),
  ]).catch(() => null);
}

async function waitForLocalSessionResolution(page, path, sessionResponsePromise) {
  const response = await sessionResponsePromise;
  let session = null;
  if (response?.ok()) {
    session = await response.json().catch(() => null);
  }

  if (path === "/") {
    const resolvedSelector =
      session?.isAnonymous === false
        ? "#sidebar-open-btn, .gnb-usermenu .avatar-wrap"
        : session?.isAnonymous === true
          ? "#required-logged-in"
          : "#required-logged-in, #sidebar-open-btn, .gnb-usermenu .avatar-wrap";
    await page
      .waitForSelector(resolvedSelector, { state: "visible", timeout: 10_000 })
      .catch(() => {});
  }

  // The response body can settle before React Query commits the matching tree.
  await page
    .evaluate(
      () =>
        new Promise((resolveFrame) => {
          requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
        }),
    )
    .catch(() => {});
}

async function inspectPage(page, baseUrl, path, label) {
  const startedAt = performance.now();
  const requestStartedAt = Date.now();
  const requestMarker = createRouteMarker({ label, path, startedAt: requestStartedAt });
  const timingStages = {};
  const requestStartTimes = new Map();
  const trace = (stage) => {
    timingStages[stage] = Math.round(performance.now() - startedAt);
    if (traceTimings) {
      console.error(
        `[visual-sweep:timing] ${label} ${path} ${stage} ${Math.round(performance.now() - startedAt)}ms`,
      );
    }
  };
  const consoleErrors = [];
  const requestFailures = [];
  const networkSummary = [];
  const onConsole = (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      !text.includes("www.google-analytics.com") &&
      !text.includes("Permissions policy violation: compute-pressure") &&
      !text.startsWith("Failed to load resource:")
    ) {
      consoleErrors.push(message.text());
    }
  };
  const onRequest = (request) => {
    requestStartTimes.set(request, performance.now());
  };
  const onRequestFailed = (request) => {
    requestStartTimes.delete(request);
    const url = request.url();
    const failureText = request.failure()?.errorText ?? "failed";
    if (
      !url.includes("www.google-analytics.com") &&
      !url.includes("doubleclick.net") &&
      !(failureText === "net::ERR_ABORTED" && url.includes("/api/v1/session"))
    ) {
      requestFailures.push(`${failureText} ${url}`);
    }
  };
  const onResponse = (response) => {
    try {
      const request = response.request();
      const requestUrl = new URL(response.url());
      const requestStartedAt = requestStartTimes.get(request);
      networkSummary.push({
        method: request.method(),
        path: `${requestUrl.pathname}${requestUrl.search}`,
        status: response.status(),
        resourceType: request.resourceType(),
        startOffsetMs:
          requestStartedAt === undefined
            ? null
            : Math.max(0, Math.round(requestStartedAt - startedAt)),
        durationMs:
          requestStartedAt === undefined
            ? null
            : Math.max(0, Math.round(performance.now() - requestStartedAt)),
      });
      requestStartTimes.delete(request);
    } catch {
      // Browser-internal URLs are not route evidence.
    }
  };
  page.on("console", onConsole);
  page.on("request", onRequest);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);
  await page.setExtraHTTPHeaders({ "x-yona-parity-route-marker": requestMarker });
  const localSessionResponsePromise =
    label === "local" && path === "/" ? waitForNavigationSessionResponse(page, baseUrl) : null;
  let navigationPath = path;
  if (label === "local" && path === "/admin/sample/issueform?parentIssueId=1") {
    const response = await page.request.get(
      `${baseUrl}/api/v1/projects/admin/sample/issues/parent-options`,
    );
    const payload = response.ok() ? await response.json().catch(() => null) : null;
    const parent = payload?.items?.find((item) => Number(item.issueNumber) === 1);
    if (parent?.id) {
      navigationPath = `/admin/sample/issueform?parentIssueId=${encodeURIComponent(parent.id)}`;
    }
  }
  let response = null;
  try {
    response = await page.goto(urlFor(baseUrl, navigationPath), {
      waitUntil: "domcontentloaded",
      timeout: 20_000,
    });
    trace("domcontentloaded");
  } catch (error) {
    page.off("console", onConsole);
    page.off("request", onRequest);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
    if (error instanceof Error && error.message.includes("Download is starting")) {
      return {
        path,
        status: 0,
        ok: true,
        download: true,
        errors: [],
        consoleErrors,
        requestFailures,
        requestMarker,
        requestWindow: { startMs: requestStartedAt, endMs: Date.now() },
        networkSummary,
        timings: timingStages,
        metrics: null,
      };
    }
    return {
      path,
      ok: false,
      errors: [`navigation failed: ${error.message}`],
      requestMarker,
      requestWindow: { startMs: requestStartedAt, endMs: Date.now() },
      networkSummary,
      timings: timingStages,
    };
  }

  if (localSessionResponsePromise) {
    await waitForLocalSessionResolution(page, path, localSessionResponsePromise);
    trace("session");
  }

  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText.trim();
        return text.length > 0;
      },
      undefined,
      { timeout: 5_000 },
    )
    .catch(() => {});
  trace("body");

  // The public profile route starts with a small shell and fills its profile
  // through a route query. Waiting for body text alone can capture that shell
  // before either implementation has reached the comparable DOM state.
  if (path === "/admin") {
    await page
      .waitForSelector(".user-box, .user-profile-page, [data-stylex-owner='user-profile-page']", {
        state: "visible",
        timeout: 10_000,
      })
      .catch(() => {});
    await waitForRenderedPaint(page);
    trace("user-profile");
  }

  const localSettledSelector = label === "local" ? localSettledSelectorForPath(path) : null;
  if (localSettledSelector) {
    await page
      .waitForSelector(`${localSettledSelector}, .project-page-wrap > .error-wrap`, {
        timeout: 10_000,
      })
      .catch(() => {});
    trace("selector");
  }
  const localErrorVisible =
    label === "local" &&
    (await page
      .locator(".project-page-wrap > .error-wrap")
      .isVisible()
      .catch(() => false));
  if (label === "local" && !localErrorVisible && path.split("?", 1)[0].endsWith("/issues")) {
    await page
      .waitForFunction(
        () =>
          [...document.styleSheets].some(
            (sheet) => sheet.href?.includes("/issue/labels.css") && sheet.cssRules.length > 0,
          ),
        undefined,
        { timeout: 10_000 },
      )
      .catch(() => {});
    await page
      .waitForFunction(
        () => {
          const element = document.querySelector(
            ".labels-wrap .select2-search-choice .issue-label",
          );
          if (!element) return true;
          const sheet = [...document.styleSheets].find((candidate) =>
            candidate.href?.includes("/issue/labels.css"),
          );
          if (!sheet) return false;
          const expected = [...sheet.cssRules]
            .filter(
              (rule) =>
                rule instanceof CSSStyleRule &&
                element.matches(rule.selectorText) &&
                rule.style.backgroundColor,
            )
            .at(-1);
          return (
            !(expected instanceof CSSStyleRule) ||
            getComputedStyle(element).backgroundColor === expected.style.backgroundColor
          );
        },
        undefined,
        { timeout: 10_000 },
      )
      .catch(() => {});
  }

  const paintErrors = await waitForRenderedPaint(page);
  trace("paint");

  const metrics = await page.evaluate(() => {
    const cloneChromeWithoutUserMarkdown = () => {
      const clone = document.body.cloneNode(true);
      for (const element of clone.querySelectorAll(
        [
          ".markdown-wrap",
          ".markdown-body",
          ".markdown-rendered",
          ".markdown-help-item",
          ".markdwon-syntax-wrap",
          ".issue-body",
          ".post-body",
          ".comment-body",
          ".textarea-box",
          "textarea",
          "script",
          "template",
        ].join(","),
      )) {
        element.remove();
      }
      return clone;
    };
    const visibleTextWithoutUserMarkdown = () => {
      const clone = cloneChromeWithoutUserMarkdown();
      return clone.innerText.slice(0, 5000);
    };
    const visibleAttributesWithoutUserMarkdown = () => {
      const clone = cloneChromeWithoutUserMarkdown();
      const names = ["aria-label", "data-content", "data-original-title", "placeholder", "title"];
      return [...clone.querySelectorAll("*")]
        .flatMap((element) =>
          names
            .map((name) => element.getAttribute(name))
            .filter((value) => value !== null && value.trim() !== ""),
        )
        .join("\n")
        .slice(0, 5000);
    };
    const body = document.body;
    const html = document.documentElement;
    const stylesheets = [...document.styleSheets].map((sheet) => {
      try {
        return { href: sheet.href, rules: sheet.cssRules.length };
      } catch {
        return { href: sheet.href, rules: -1 };
      }
    });
    const selectorState = (selectorOrElement) => {
      const element =
        typeof selectorOrElement === "string"
          ? document.querySelector(selectorOrElement)
          : selectorOrElement;
      if (!element) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const opacity = Number.parseFloat(style.opacity);
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        visible:
          style.display !== "none" &&
          style.visibility !== "hidden" &&
          style.visibility !== "collapse" &&
          opacity > 0 &&
          rect.width > 0 &&
          rect.height > 0 &&
          element.getClientRects().length > 0,
        position: style.position,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        scrollWidth: element.scrollWidth,
        scrollHeight: element.scrollHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight,
        hasHorizontalOverflow: element.scrollWidth > element.clientWidth + 1,
        hasVerticalOverflow: element.scrollHeight > element.clientHeight + 1,
        escapesViewportHorizontally: rect.left < -1 || rect.right > window.innerWidth + 1,
        fontSize: style.fontSize,
        backgroundColor: style.backgroundColor,
      };
    };
    const selectorTextLength = (selector) =>
      document.querySelector(selector)?.textContent?.trim().length ?? null;
    const gnbSearchFormElement = document.querySelector(".gnb-search-form");
    const gnbFeedbackLink = gnbSearchFormElement
      ?.closest("li")
      ?.previousElementSibling?.querySelector("a");
    return {
      title: document.title,
      text: body.innerText.slice(0, 5000),
      chromeText: visibleTextWithoutUserMarkdown(),
      chromeAttributes: visibleAttributesWithoutUserMarkdown(),
      bodyTextLength: body.innerText.trim().length,
      scrollWidth: Math.round(Math.max(body.scrollWidth, html.scrollWidth)),
      viewportWidth: window.innerWidth,
      stylesheetCount: stylesheets.length,
      stylesheetRules: stylesheets.reduce((sum, sheet) => sum + Math.max(0, sheet.rules), 0),
      hasStylesheetError: stylesheets.some((sheet) => sheet.rules === -1),
      gnb: selectorState(".gnb-outer, [data-stylex-owner='global-gnb-outer']"),
      gnbInner: selectorState(".gnb-inner, [data-stylex-owner='global-gnb-inner']"),
      gnbPin: selectorState(".gnb-inner > .pin, [data-stylex-owner='global-sidebar-open-pin']"),
      gnbLogoLetter: selectorState(".logo-letter, [data-stylex-owner='global-gnb-brand-link']"),
      gnbSearchForm: selectorState(".gnb-search-form"),
      gnbFeedback: selectorState(gnbFeedbackLink),
      gnbUsermenu: selectorState(".gnb-usermenu"),
      sidenav: selectorState("#mySidenav"),
      projectHeader: selectorState(".project-header-outer"),
      projectHeaderAvatar: selectorState(".project-header-avatar"),
      projectBreadcrumbWrap: selectorState(".project-breadcrumb-wrap"),
      projectUtilWrap: selectorState(".project-util-wrap"),
      projectWatcherCount: selectorState(".project-util-wrap .watcher-count"),
      projectWatchAction: selectorState(".project-util-wrap .down-arrow"),
      projectMenu: selectorState(".project-menu-outer"),
      projectMenuNav: selectorState(".project-menu-nav"),
      pageWrap: selectorState(
        ".page-wrap-outer, .project-page-wrap, [data-stylex-owner='project-pullrequests-page'], [data-stylex-owner='projects-directory-page-wrap'], [data-stylex-owner='organization-directory-page-wrap'], [data-stylex-owner='site-user-list-page-wrap-outer'], [data-stylex-owner='site-post-list-page-wrap-outer'], [data-stylex-owner='site-issue-list-page-wrap-outer'], [data-stylex-owner='site-project-list-page-wrap-outer'], [data-stylex-owner='site-mail-page'], [data-stylex-owner='site-massmail-page'], [data-stylex-owner='site-update-page'], [data-stylex-owner='site-diagnostic-page'], [data-stylex-owner='user-settings-page-wrap-outer'], [data-stylex-owner='help-shell-page-wrap-outer']",
      ),
      projectPageWrap: selectorState(
        ".project-page-wrap, [data-stylex-owner='project-pullrequests-shell'], [data-stylex-owner='projects-directory-page'], [data-stylex-owner='organization-directory-page'], [data-stylex-owner='project-milestones-shell'], [data-stylex-owner='milestone-detail-shell']",
      ),
      issueBodyRow: selectorState(".board-body.row-fluid"),
      issueLeftPane: selectorState(".board-body.row-fluid > .span9"),
      issueRightPane: selectorState(".board-body.row-fluid > .span3"),
      issueInfo: selectorState(".board-body.row-fluid > .span3 .issue-info"),
      bubbleWrapGray: selectorState(".bubble-wrap.gray"),
      boxWrap: selectorState(".box-wrap"),
      cuLabel: selectorState(".cu-label"),
      cuDesc: selectorState(".cu-desc"),
      projectSettingRight: selectorState(".setting-box.right"),
      projectDescription: selectorState("#project-desc"),
      issueListWrap: selectorState(".row-fluid.issue-list-wrap"),
      leftMenu: selectorState(
        ".left-menu, [data-stylex-owner='project-pullrequests-search-column']",
      ),
      // The populated profile Issues pane intentionally retires the legacy
      // list/row classes after their frozen declarations move to StyleX.
      // Keep the legacy selectors for the reference target and accept the
      // exact React owners for the local target so class retirement does not
      // become a false visual-parity failure.
      postListWrap: selectorState(
        ".post-list-wrap, [data-stylex-owner='user-profile-open-issue-list'], [data-stylex-owner='user-profile-closed-issue-list'], [data-stylex-owner='site-post-list-container'], [data-stylex-owner='site-issue-list-container']",
      ),
      postItemTitle: selectorState(
        ".post-item.title, [data-stylex-owner='user-profile-issue-row'], [data-stylex-owner='site-post-list-title-link'], [data-stylex-owner='site-issue-list-title-link']",
      ),
      selectedFilterLabel: selectorState(".labels-wrap .select2-search-choice .issue-label"),
      contentFormWrap: selectorState(".content-wrap.frm-wrap"),
      markdownEditor: selectorState(".textarea-box"),
      markdownPreview: selectorState(".markdown-preview.markdown-wrap"),
      uploadWrap: selectorState(".upload-wrap.content-footer"),
      issueUpdateForm: selectorState("#issueUpdateForm"),
      comments: selectorState("ul.comments"),
      comment: selectorState("li.comment"),
      commentBody: selectorState(".comment-body.markdown-wrap"),
      commentDeleteModal: selectorState("#comment-delete-modal"),
      issueBodyTextLength: selectorTextLength("[id^='issue-body-'] .content.markdown-wrap"),
      commentBodyTextLength: selectorTextLength(".comment-body.markdown-wrap"),
      loginDialog: selectorState("#loginDialog, .loginDialog"),
      siteintroCover: selectorState(".siteintro-cover"),
      siteHeading: selectorState(".site-heading"),
      signupButton: selectorState(".signup-btn"),
      footer: selectorState("footer.page-footer-outer, [data-stylex-owner='site-footer']"),
      // The local route retires the legacy wrapper class after its StyleX
      // boundary is complete; keep the legacy selector for the live target
      // and accept the stable owner marker for the React target.
      userProfile: selectorState(
        ".user-box, .user-profile-page, [data-stylex-owner='user-profile-page']",
      ),
      isErrorPage: [document.title, body.innerText].some(
        (text) =>
          text.includes("페이지를 찾을 수 없습니다") ||
          text.includes("권한이 없습니다") ||
          text.includes("잘못된 요청입니다") ||
          text.includes("서버 오류가 발생") ||
          text.includes("Page not found") ||
          text.includes("Forbidden") ||
          text.includes("Bad Request") ||
          text.includes("Internal Server Error") ||
          /error\.notfound\./u.test(text),
      ),
    };
  });
  trace("metrics");
  const isRedirectOnlyProjectAction = path.startsWith("/info/leave/");
  const isProjectPage =
    /^\/[^/?#]+\/[^/?#]+/u.test(path) &&
    !rootNames.has(path.split("/")[1]) &&
    !isRedirectOnlyProjectAction;
  const isNotificationFragment = path.startsWith("/notification?");
  const isFramedShell = path === "/sidebar" || path.startsWith("/sidebar?");
  const effectiveRequestFailures = requestFailures.filter(
    (failure) => !(isFramedShell && isViteDevModuleAbort(failure)),
  );
  const errors = [];
  const status = response?.status() ?? 0;
  if (status >= 500) {
    errors.push(`HTTP ${status}`);
  }
  if (!isNotificationFragment && (metrics.stylesheetCount === 0 || metrics.stylesheetRules < 20)) {
    errors.push(
      `stylesheet not applied: ${metrics.stylesheetCount} sheets, ${metrics.stylesheetRules} rules`,
    );
  }
  if (!isNotificationFragment && metrics.bodyTextLength < 20 && status === 200) {
    errors.push("nearly blank page");
  }
  if (metrics.scrollWidth > metrics.viewportWidth * 1.8) {
    errors.push(`horizontal overflow ${metrics.scrollWidth}/${metrics.viewportWidth}`);
  }
  const i18nScanText = `${metrics.title}\n${metrics.chromeText}\n${metrics.chromeAttributes}`;
  if (label === "local" && hasRawLegacyI18nKey(i18nScanText)) {
    errors.push(`raw i18n key visible: ${rawLegacyI18nKeys(i18nScanText).join(", ")}`);
  }
  if (/browser-safe route tree|localhost:3001\/(?!yona(?:\/|$))yo/u.test(metrics.text)) {
    errors.push("implementation fixture copy visible");
  }
  if (metrics.title === "Yona Rust Frontend") {
    errors.push("non-legacy default document title visible");
  }
  if (
    !isFramedShell &&
    !isNotificationFragment &&
    !metrics.isErrorPage &&
    (!metrics.gnb || metrics.gnb.width < metrics.viewportWidth * 0.8)
  ) {
    errors.push("missing global navigation");
  }
  if (!isFramedShell && !isNotificationFragment && !metrics.isErrorPage && !metrics.gnbInner) {
    errors.push("missing global navigation inner container");
  }
  if (!isFramedShell && !isNotificationFragment && !metrics.isErrorPage && !metrics.gnbUsermenu) {
    errors.push("missing global user menu container");
  }
  if (
    path === "/" &&
    metrics.loginDialog &&
    metrics.loginDialog.width > metrics.viewportWidth * 0.8
  ) {
    errors.push("login dialog width looks unstyled");
  }
  if (isProjectPage && !metrics.isErrorPage && !metrics.projectHeader) {
    errors.push("missing project header");
  }
  if (isProjectPage && !metrics.isErrorPage && !metrics.projectMenu) {
    errors.push("missing project menu");
  }
  if (label === "local" && path === "/admin" && !metrics.userProfile) {
    errors.push("missing public user profile");
  }
  if (consoleErrors.length > 0) {
    errors.push(`${consoleErrors.length} console error(s)`);
  }
  if (effectiveRequestFailures.length > 0) {
    errors.push(`${effectiveRequestFailures.length} request failure(s)`);
  }
  errors.push(...paintErrors);
  if (errors.length > 0 || alwaysScreenshotPaths.has(path.split("?", 1)[0])) {
    const screenshotLabel =
      viewportProfile.name === "desktop" ? label : `${label}-${viewportProfile.name}`;
    await page.screenshot({
      path: resolve(
        screenshotDir,
        `${screenshotLabel}-${path.replace(/[^a-z0-9]+/giu, "_") || "root"}.png`,
      ),
      fullPage: true,
    });
  }
  page.off("console", onConsole);
  page.off("request", onRequest);
  page.off("requestfailed", onRequestFailed);
  page.off("response", onResponse);
  return {
    path,
    status,
    ok: errors.length === 0,
    errors,
    consoleErrors,
    requestFailures: effectiveRequestFailures,
    ignoredRequestFailures:
      effectiveRequestFailures.length === requestFailures.length
        ? []
        : requestFailures.filter((failure) => isViteDevModuleAbort(failure)),
    requestMarker,
    requestWindow: { startMs: requestStartedAt, endMs: Date.now() },
    networkSummary,
    timings: timingStages,
    metrics: {
      title: metrics.title,
      bodyTextLength: metrics.bodyTextLength,
      scrollWidth: metrics.scrollWidth,
      viewportWidth: metrics.viewportWidth,
      viewportProfile: viewportProfile.name,
      stylesheetCount: metrics.stylesheetCount,
      stylesheetRules: metrics.stylesheetRules,
      gnb: metrics.gnb,
      gnbInner: metrics.gnbInner,
      gnbPin: metrics.gnbPin,
      gnbLogoLetter: metrics.gnbLogoLetter,
      gnbSearchForm: metrics.gnbSearchForm,
      gnbFeedback: metrics.gnbFeedback,
      gnbUsermenu: metrics.gnbUsermenu,
      sidenav: metrics.sidenav,
      projectHeader: metrics.projectHeader,
      projectHeaderAvatar: metrics.projectHeaderAvatar,
      projectBreadcrumbWrap: metrics.projectBreadcrumbWrap,
      projectUtilWrap: metrics.projectUtilWrap,
      projectWatcherCount: metrics.projectWatcherCount,
      projectWatchAction: metrics.projectWatchAction,
      projectMenu: metrics.projectMenu,
      projectMenuNav: metrics.projectMenuNav,
      pageWrap: metrics.pageWrap,
      projectPageWrap: metrics.projectPageWrap,
      issueBodyRow: metrics.issueBodyRow,
      issueLeftPane: metrics.issueLeftPane,
      issueRightPane: metrics.issueRightPane,
      issueInfo: metrics.issueInfo,
      bubbleWrapGray: metrics.bubbleWrapGray,
      boxWrap: metrics.boxWrap,
      cuLabel: metrics.cuLabel,
      cuDesc: metrics.cuDesc,
      projectSettingRight: metrics.projectSettingRight,
      projectDescription: metrics.projectDescription,
      issueListWrap: metrics.issueListWrap,
      leftMenu: metrics.leftMenu,
      postListWrap: metrics.postListWrap,
      postItemTitle: metrics.postItemTitle,
      selectedFilterLabel: metrics.selectedFilterLabel,
      contentFormWrap: metrics.contentFormWrap,
      markdownEditor: metrics.markdownEditor,
      markdownPreview: metrics.markdownPreview,
      uploadWrap: metrics.uploadWrap,
      issueUpdateForm: metrics.issueUpdateForm,
      comments: metrics.comments,
      comment: metrics.comment,
      commentBody: metrics.commentBody,
      commentDeleteModal: metrics.commentDeleteModal,
      issueBodyTextLength: metrics.issueBodyTextLength,
      commentBodyTextLength: metrics.commentBodyTextLength,
      loginDialog: metrics.loginDialog,
      siteintroCover: metrics.siteintroCover,
      siteHeading: metrics.siteHeading,
      signupButton: metrics.signupButton,
      footer: metrics.footer,
      userProfile: metrics.userProfile,
      isErrorPage: metrics.isErrorPage,
    },
  };
}

async function inspectPageSafely(page, baseUrl, path, label) {
  let timeoutId;
  try {
    return await Promise.race([
      inspectPage(page, baseUrl, path, label),
      new Promise((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(`Route inspection timed out after 60000ms: ${path}`)),
          60_000,
        );
      }),
    ]);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      path,
      status: 0,
      ok: false,
      errors: [message],
      consoleErrors: [],
      requestFailures: [],
      ignoredRequestFailures: [],
      metrics: {
        bodyTextLength: 0,
        scrollWidth: 0,
        viewportWidth: viewportProfile.width,
        viewportProfile: viewportProfile.name,
        stylesheetRules: 0,
        isErrorPage: true,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForRenderedPaint(page) {
  await page.waitForLoadState("load", { timeout: 10_000 }).catch(() => {});
  return (
    (await page
      .evaluate(async () => {
        const errors = [];
        const waitBounded = async (promise, label) => {
          let timeoutId;
          const timedOut = await Promise.race([
            promise.then(() => false),
            new Promise((resolveTimeout) => {
              timeoutId = setTimeout(() => resolveTimeout(true), 2_000);
            }),
          ]);
          clearTimeout(timeoutId);
          if (timedOut) errors.push(`${label} did not settle within 2000ms`);
        };
        if (document.fonts?.ready) {
          await waitBounded(document.fonts.ready, "document fonts");
        }
        await waitBounded(
          Promise.all(
            [...document.images].map((image) =>
              image.complete ? image.decode?.().catch(() => {}) : Promise.resolve(),
            ),
          ),
          "document images",
        );
        for (const sheet of document.styleSheets) {
          try {
            void sheet.cssRules.length;
          } catch {
            // Cross-origin sheets can be painted even though their rules are not readable.
          }
        }
        for (let pass = 0; pass < 2; pass += 1) {
          const activeAnimations = document
            .getAnimations({ subtree: true })
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.effect?.getTiming().iterations !== Infinity,
            );
          await waitBounded(
            Promise.all(activeAnimations.map((animation) => animation.finished.catch(() => {}))),
            "document animations",
          );
        }
        await new Promise((resolveFrame) => {
          requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
        });
        return errors;
      })
      .catch((error) => [
        `paint inspection failed: ${error instanceof Error ? error.message : String(error)}`,
      ])) ?? []
  );
}

async function closePageSafely(page, label) {
  let timeoutId;
  try {
    await Promise.race([
      page.close().catch(() => {}),
      new Promise((resolveTimeout) => {
        timeoutId = setTimeout(() => {
          console.error(`[visual-sweep] ${label} page close timed out after ${closeTimeoutMs}ms`);
          resolveTimeout();
        }, closeTimeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

async function closeBrowserSafely(browser, label) {
  let timeoutId;
  try {
    await Promise.race([
      browser.close().catch(() => {}),
      new Promise((resolveTimeout) => {
        timeoutId = setTimeout(() => {
          console.error(`[visual-sweep] ${label} browser close timed out after 5000ms`);
          resolveTimeout();
        }, 5_000);
      }),
    ]);
  } finally {
    clearTimeout(timeoutId);
  }
}

function isViteDevModuleAbort(failure) {
  return (
    failure.startsWith("net::ERR_ABORTED ") &&
    (/\/(?:src|@fs)\//u.test(failure) || /\/@vite\//u.test(failure))
  );
}

function targetFailureStatus(error) {
  const message = error instanceof Error ? error.message : String(error);
  return /ECONNREFUSED|ERR_(?:ADDRESS_UNREACHABLE|CONNECTION_REFUSED|CONNECTION_TIMED_OUT)|Timeout \d+ms exceeded|Failed to connect/iu.test(
    message,
  )
    ? "unreachable"
    : "failed";
}

function failedTargetResult(label, baseUrl, error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    label,
    baseUrl,
    viewportProfile,
    status: targetFailureStatus(error),
    loggedIn: false,
    authStatus: "AUTH_BLOCKED",
    total: 0,
    passed: 0,
    failed: 1,
    directApiSurfaces: null,
    legacyAuditPages: legacyAuditDiscoveredPageLinks(),
    legacyAuditCorpus: legacyAuditCorpusSummary(),
    legacyAuditPagesCovered: 0,
    missingLegacyAuditPages: [],
    discoveredProjectPages: [],
    results: [],
    targetError: message,
  };
}

async function launchBrowser() {
  return launchWtrBrowser();
}

async function runTarget(label, baseUrl, pathOverride = null) {
  const browser = await launchBrowser();
  try {
    const page = await createWtrSweepPage(browser, {
      height: viewportProfile.height,
      locale: sweepLocale,
      width: viewportProfile.width,
    });
    if (label === "local") {
      await installWtrGravatarRoute(
        page,
        resolve(repoRoot, "frontend/src/assets/legacy/default-avatar-128.png"),
      );
    }
    const loggedIn =
      label === "local" ? await loginLocal(page, baseUrl) : await login(page, baseUrl);
    const useRequestedPaths = requestedSweepPaths.length > 0 || sweepIsBatched;
    const directApiSurfaces =
      label === "local" && loggedIn && !useRequestedPaths && !realDataMode
        ? await inspectLocalDirectApiSurfaces(page, baseUrl)
        : null;
    const discoveredProjectPages =
      loggedIn && !useRequestedPaths && !realDataMode
        ? await discoverProjectPaths(page, baseUrl)
        : [];
    const discoveredRealDataPages =
      realDataMode && !useRequestedPaths && !pathOverride
        ? await discoverRealDataPaths(page, baseUrl)
        : [];
    const legacyAuditPages = legacyAuditDiscoveredPageLinks();
    const routeSamples =
      label === "legacy" || useRequestedPaths || realDataMode ? [] : routeTreeSamplePaths();
    const allPaths =
      pathOverride ??
      (requestedSweepPaths.length > 0
        ? requestedSweepPaths
        : realDataMode
          ? discoveredRealDataPages
          : [
              ...new Set([
                ...basePages,
                ...legacyAuditPages,
                ...routeSamples,
                ...discoveredProjectPages,
              ]),
            ]);
    const paths = sweepIsBatched
      ? allPaths.slice(sweepBatchIndex * sweepBatchSize, (sweepBatchIndex + 1) * sweepBatchSize)
      : allPaths;
    const results = [];
    for (const [index, path] of paths.entries()) {
      console.error(`[visual-sweep] ${label} ${index + 1}/${paths.length} ${path}`);
      const primerPath = sessionPrimerPathForPath(path);
      if (primerPath) {
        await primeSessionProjectVisit(page, baseUrl, primerPath, label);
      }
      const routePage = await createWtrSweepPage(browser, {
        height: viewportProfile.height,
        locale: sweepLocale,
        width: viewportProfile.width,
      });
      if (label === "local") {
        await installWtrGravatarRoute(
          routePage,
          resolve(repoRoot, "frontend/src/assets/legacy/default-avatar-128.png"),
        );
      }
      try {
        const result = await inspectPageSafely(routePage, baseUrl, path, label);
        if (warmPerformanceRepeat && result.ok) {
          const warmResult = await inspectPageSafely(routePage, baseUrl, path, label);
          result.warmPerformance = {
            ok: warmResult.ok,
            errors: warmResult.errors,
            requestWindow: warmResult.requestWindow,
            timings: warmResult.timings ?? {},
            networkSummary: (warmResult.networkSummary ?? []).filter(
              ({ path: requestPath }) => requestPath === path || requestPath.startsWith("/api/"),
            ),
          };
        }
        results.push(result);
      } finally {
        await closePageSafely(routePage, `${label} ${path}`);
      }
    }
    const resultPaths = new Set(results.map((result) => result.path));
    const missingLegacyAuditPages =
      useRequestedPaths || realDataMode
        ? []
        : legacyAuditPages.filter((path) => !resultPaths.has(path));
    await closePageSafely(page, `${label} session`);
    return {
      label,
      baseUrl,
      viewportProfile,
      status: "ok",
      loggedIn,
      authStatus: loggedIn ? "authenticated" : "AUTH_BLOCKED",
      total: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      directApiSurfaces,
      legacyAuditPages,
      legacyAuditCorpus: legacyAuditCorpusSummary(),
      legacyAuditPagesCovered: legacyAuditPages.length - missingLegacyAuditPages.length,
      missingLegacyAuditPages,
      requestedSweepPaths,
      discoveredProjectPages,
      discoveredRealDataPages,
      results,
    };
  } finally {
    await closeBrowserSafely(browser, label);
  }
}

async function runTargetSafely(label, baseUrl, pathOverride = null) {
  try {
    return await runTarget(label, baseUrl, pathOverride);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[visual-sweep] ${label} target failed: ${message}`);
    return failedTargetResult(label, baseUrl, error);
  }
}

function classifyArtifactError(error) {
  if (/AUTH_BLOCKED/u.test(error)) return "AUTH_BLOCKED";
  if (/legacy renders a normal page but local renders an error page/u.test(error)) {
    return "legacy-normal → Yoram-error";
  }
  if (/HTTP \d+/u.test(error) || /status/u.test(error)) return "HTTP status delta";
  if (/visible selector missing/u.test(error)) return "missing visible selector";
  if (/geometry/u.test(error)) return "geometry drift";
  if (/overflow/u.test(error)) return "horizontal overflow";
  if (/text loss/u.test(error)) return "text-length loss";
  if (/raw i18n/u.test(error)) return "raw i18n key leak";
  if (/navigation|global navigation|stylesheet|menu|user menu/u.test(error)) {
    return "global shell/header/menu drift";
  }
  if (/attachment/u.test(error)) return "attachment-excluded";
  return "categorized error";
}

function sanitizeResultForArtifact(result) {
  const metrics = result.metrics
    ? Object.fromEntries(
        Object.entries(result.metrics).filter(
          ([key]) => !["title", "text", "chromeText", "chromeAttributes"].includes(key),
        ),
      )
    : null;
  return {
    path: result.path,
    status: result.status ?? 0,
    ok: result.ok === true,
    download: result.download === true,
    errors: (result.errors ?? []).map(classifyArtifactError),
    consoleErrors: result.consoleErrors?.length ? ["categorized error"] : [],
    requestFailures: result.requestFailures?.length ? ["categorized error"] : [],
    ignoredRequestFailures: result.ignoredRequestFailures?.length ? ["categorized error"] : [],
    requestMarker: result.requestMarker ?? null,
    requestWindow: result.requestWindow ?? null,
    networkSummary: (result.networkSummary ?? []).map(
      ({ method, path, status, resourceType, startOffsetMs, durationMs }) => ({
        method,
        path,
        status,
        resourceType: resourceType ?? null,
        startOffsetMs: Number.isFinite(startOffsetMs) ? startOffsetMs : null,
        durationMs: Number.isFinite(durationMs) ? durationMs : null,
      }),
    ),
    timings: result.timings ?? {},
    warmPerformance: result.warmPerformance
      ? {
          ok: result.warmPerformance.ok === true,
          errors: (result.warmPerformance.errors ?? []).map(classifyArtifactError),
          requestWindow: result.warmPerformance.requestWindow ?? null,
          timings: result.warmPerformance.timings ?? {},
          networkSummary: (result.warmPerformance.networkSummary ?? []).map(
            ({ method, path, status, resourceType, startOffsetMs, durationMs }) => ({
              method,
              path,
              status,
              resourceType: resourceType ?? null,
              startOffsetMs: Number.isFinite(startOffsetMs) ? startOffsetMs : null,
              durationMs: Number.isFinite(durationMs) ? durationMs : null,
            }),
          ),
        }
      : null,
    metrics,
  };
}

function sanitizeTargetForArtifact(target) {
  if (!target) return null;
  return {
    ...target,
    targetError: target.targetError ? "categorized error" : null,
    results: (target.results ?? []).map(sanitizeResultForArtifact),
    directApiSurfaces: target.directApiSurfaces
      ? {
          failed: target.directApiSurfaces.failed,
          passed: target.directApiSurfaces.passed,
          total: target.directApiSurfaces.total,
          results: target.directApiSurfaces.results.map((result) => ({
            method: result.method,
            path: result.path,
            status: result.status,
            ok: result.ok,
            contentType: result.contentType,
            payloadKind: result.payloadKind,
            payloadKeys: result.payloadKeys,
            arrayLength: result.arrayLength,
            errors: result.errors.map(classifyArtifactError),
          })),
        }
      : null,
  };
}

function sanitizeComparisonForArtifact(comparison) {
  return comparison.map((result) => ({
    ...result,
    localErrors: (result.localErrors ?? []).map(classifyArtifactError),
    diffErrors: (result.diffErrors ?? []).map(classifyArtifactError),
  }));
}
function buildWriteParityLedger() {
  const dumpPath = process.env.REAL_DUMP_PATH;
  const restoreReady = Boolean(dumpPath && existsSync(dumpPath));
  const reason = restoreReady
    ? "RESTORE_REQUIRED: supervised clone restore and retained-service restart are required before writes"
    : "RESTORE_REQUIRED: REAL_DUMP_PATH is unavailable";
  const scenarios = [
    ["issue write", "/projects/{owner}/{project}/issues"],
    ["comment write", "/projects/{owner}/{project}/issue/{issueNumber}"],
    ["board write", "/projects/{owner}/{project}/posts"],
    ["milestone write", "/projects/{owner}/{project}/milestones"],
    ["label/category write", "/projects/{owner}/{project}/labels"],
    ["project/member/watch write", "/projects/{owner}/{project}/members"],
    ["pull-request/review write", "/projects/{owner}/{project}/pullRequests"],
    ["user/settings write", "/user/editform"],
  ].map(([action, route]) => ({
    action,
    route,
    requestShape: null,
    legacy: { status: null, bodyState: null, readBack: null },
    yoram: { status: null, bodyState: null, readBack: null },
    checkpointBefore: null,
    checkpointAfter: null,
    status: "RESTORE_REQUIRED",
    reason,
  }));
  return {
    mode: "controlled-write-parity",
    status: "RESTORE_REQUIRED",
    restoreReady,
    scenarios,
  };
}

function synchronizePullRequestRepositoryFixture() {
  if (
    realDataMode ||
    (requestedSweepPaths.length > 0 &&
      !requestedSweepPaths.includes("/admin/sample/newPullRequestForm"))
  ) {
    return;
  }
  const repoPath = resolve(
    repoRoot,
    process.env.YORAM_SWEEP_SAMPLE_REPO ?? ".yona-data/repo/2.git",
  );
  if (!existsSync(repoPath)) {
    throw new Error(`Visual sweep sample repository is missing: ${repoPath}`);
  }
  const result = spawnSync(
    "git",
    [
      "--git-dir",
      repoPath,
      "fetch",
      `${legacyBaseUrl}/admin/sample`,
      "+refs/heads/main:refs/heads/main",
      "+refs/heads/feature/ui:refs/heads/feature/ui",
    ],
    { cwd: repoRoot, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`Unable to synchronize PR parity refs: ${result.stderr.trim()}`);
  }
}
if (sweepTarget === "both") synchronizePullRequestRepositoryFixture();
let legacy = null;
let local = null;
if (realDataMode && sweepTarget === "both") {
  legacy = await runTargetSafely("legacy", legacyBaseUrl);
  local = await runTargetSafely(
    "local",
    localBaseUrl,
    requestedSweepPaths.length === 0 ? (legacy?.discoveredRealDataPages ?? []) : null,
  );
} else {
  [legacy, local] = await Promise.all([
    sweepTarget === "local" ? null : runTargetSafely("legacy", legacyBaseUrl),
    sweepTarget === "legacy" ? null : runTargetSafely("local", localBaseUrl),
  ]);
}
const comparison = buildVisualComparison({
  legacyResults: legacy?.results ?? [],
  localResults: local?.results ?? [],
});
let sqlCapture = null;
if (sqlCaptureEnabled) {
  const route = requestedSweepPaths.length === 1 ? requestedSweepPaths[0] : "unfocused-sweep";
  const legacyResult = legacy?.results?.find((result) => result.path === route) ?? null;
  const localResult = local?.results?.find((result) => result.path === route) ?? null;
  const isolatedRouteWindow =
    realDataMode && sweepScope === "focused" && requestedSweepPaths.length === 1;
  const legacyRequestWindow = legacyResult?.requestWindow
    ? {
        ...legacyResult.requestWindow,
        endMs: legacyResult.requestWindow.endMs + sqlCaptureGraceMs,
        isolated: isolatedRouteWindow,
      }
    : null;
  const yoramRequestWindow = localResult?.requestWindow
    ? {
        ...localResult.requestWindow,
        endMs: localResult.requestWindow.endMs + sqlCaptureGraceMs,
        isolated: isolatedRouteWindow,
      }
    : null;
  sqlCapture = captureRouteSqlFromLogs({
    route,
    requestMarker: legacyResult?.requestMarker ?? localResult?.requestMarker ?? null,
    requestWindow: legacyRequestWindow ?? yoramRequestWindow,
    legacyRequestWindow,
    yoramRequestWindow,
    networkSummary: [
      ...(legacyResult?.networkSummary ?? []),
      ...(localResult?.networkSummary ?? []),
    ],
    env: {
      ...process.env,
      ...(requestedSweepPaths.length === 1 ? {} : { YORAM_SQL_TRACE_LOG: "" }),
    },
  });
  if (process.env.YORAM_SWEEP_OUTPUT_DIR) {
    writeRouteSqlArtifacts({
      outputDir,
      legacy: sqlCapture.legacy,
      yoram: sqlCapture.yoram,
      comparison: sqlCapture.comparison,
    });
  }
}
const writeLedger = writeParityMode ? buildWriteParityLedger() : null;
const summary = {
  checkedAt: new Date().toISOString(),
  mode: realDataMode ? "real-data-read-only" : "fixture",
  writeParityRequested: writeParityMode,
  scope: sweepScope,
  batch: sweepIsBatched
    ? {
        index: sweepBatchIndex,
        size: sweepBatchSize,
      }
    : null,
  viewportProfile,
  legacy: realDataMode ? sanitizeTargetForArtifact(legacy) : legacy,
  local: realDataMode ? sanitizeTargetForArtifact(local) : local,
  comparison: realDataMode ? sanitizeComparisonForArtifact(comparison) : comparison,
  comparisonSummary: summarizeVisualComparison(comparison),
  sqlCapture,
  writeParity: writeLedger,
};
writeFileSync(resolve(outputDir, latestOutputName), `${JSON.stringify(summary, null, 2)}\n`);
if (writeLedger) {
  writeFileSync(
    resolve(outputDir, "write-ledger.json"),
    `${JSON.stringify(writeLedger, null, 2)}\n`,
  );
}
console.log(JSON.stringify(summary, null, 2));
const comparisonFailures = comparison.filter((result) => result.diffErrors.length > 0);
const missingLegacyAuditPages = [legacy, local].flatMap((target) =>
  (target?.missingLegacyAuditPages ?? []).map((path) => `${target.label}:${path}`),
);
const unusableLegacyAuditCorpus = legacyAuditCorpusSummary().error !== null;
if (
  (legacy?.status !== "ok" && sweepTarget !== "local") ||
  (local?.status !== "ok" && sweepTarget !== "legacy") ||
  (local?.failed ?? 0) > 0 ||
  (local?.directApiSurfaces?.failed ?? 0) > 0 ||
  (sweepTarget === "legacy" && (legacy?.failed ?? 0) > 0) ||
  unusableLegacyAuditCorpus ||
  missingLegacyAuditPages.length > 0 ||
  comparisonFailures.length > 0 ||
  (sqlCaptureEnabled && sqlCapture?.status !== "captured")
) {
  process.exitCode = 1;
}
