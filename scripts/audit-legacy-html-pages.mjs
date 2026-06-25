import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const baseUrl = (process.env.YONA_LEGACY_BASE_URL ?? "http://192.168.45.10:9000").replace(
  /\/$/,
  "",
);
const loginId = process.env.YONA_LEGACY_LOGIN_ID ?? "admin";
const password = process.env.YONA_LEGACY_PASSWORD ?? "admin";
const outputDir = process.env.YONA_LEGACY_AUDIT_OUTPUT_DIR
  ? resolve(process.env.YONA_LEGACY_AUDIT_OUTPUT_DIR)
  : resolve(repoRoot, ".agent/legacy-html-page-audit");
const cookieDir = mkdtempSync(join(tmpdir(), "yona-legacy-cookies-"));
const cookieJar = join(cookieDir, "cookies.txt");
const legacyOrigin = new URL(baseUrl).origin;

const publicPages = [
  { path: "/", anchors: ["gnb-outer", "siteintro-bg", "loginDialog"] },
  { path: "/users/loginform", anchors: ["login-form-wrap", "loginIdOrEmail", "password"] },
  { path: "/users/signupform", anchors: ["signup-form-wrap", "loginId", "email"] },
  { path: "/lostPassword", anchors: ["login-form-wrap", "email"] },
  { path: "/_help", anchors: ["site-breadcrumb-outer", "qas", "answer-wrap"] },
];

const authenticatedPages = [
  { path: "/", anchors: ["gnb-outer", "admin-logged-in-affix"] },
  { path: "/projects", anchors: ["all-projects"] },
  { path: "/projectform", anchors: ["newProjectForm", "project-name", "advanced-options"] },
  { path: "/_import", anchors: ["importGit", "url", "project-name"] },
  { path: "/orgs", anchors: ["page-wrap-outer"] },
  { path: "/organizations/new", anchors: ["page-wrap-outer", "name"] },
  {
    path: "/search?keyword=yona&searchType=auto",
    anchors: ["search", "keyword"],
    structuralTokens: ["keyword"],
  },
  { path: "/notifications", anchors: ["notification"], structuralTokens: [] },
  { path: "/notification?from=0&limit=20", anchors: ["notification"], structuralTokens: [] },
  { path: "/user/issues", anchors: ["page-wrap-outer"] },
  { path: "/user/issues/new", anchors: ["page-wrap-outer"] },
  { path: "/user/issues/new/mine", anchors: ["page-wrap-outer"] },
  { path: "/user/files", anchors: ["attachment-files"] },
  { path: "/user/editform", anchors: ["page-wrap-outer"] },
  { path: "/user/editform/password", anchors: ["page-wrap-outer", "password"] },
  {
    path: "/user/editform/notifications",
    anchors: ["page-wrap-outer", "notification"],
    structuralTokens: ["page-wrap-outer"],
  },
  { path: "/user/editform/emails", anchors: ["page-wrap-outer", "email"] },
  {
    path: "/user/editform/token",
    anchors: ["page-wrap-outer", "token"],
    structuralTokens: ["page-wrap-outer"],
  },
  {
    path: "/sites/userList",
    anchors: ["site-breadcrumb-outer", "userList"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  {
    path: "/sites/projectList",
    anchors: ["site-breadcrumb-outer", "projectList"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  {
    path: "/sites/postList",
    anchors: ["site-breadcrumb-outer", "postList"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  {
    path: "/sites/issueList",
    anchors: ["site-breadcrumb-outer", "issueList"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  {
    path: "/sites/mail",
    anchors: ["site-breadcrumb-outer", "mail"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  {
    path: "/sites/massmail",
    anchors: ["site-breadcrumb-outer", "mail"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  {
    path: "/sites/update",
    anchors: ["site-breadcrumb-outer", "update"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  {
    path: "/sites/diagnostic",
    anchors: ["site-breadcrumb-outer", "diagnostic"],
    structuralTokens: ["site-breadcrumb-outer"],
  },
  { path: "/sites/data", anchors: ["site-breadcrumb-outer", "data"] },
  { path: "/admin", anchors: ["user-info-box", "page-wrap-outer"] },
];

const blockedPageLinkPrefixes = [
  "/-_-api/",
  "/assets/",
  "/authenticate/",
  "/favicon.ico",
  "/files/",
  "/messages.js",
  "/noti/toggle/",
  "/users/logout",
];
const blockedPageLinks = new Set(["/info", "/sites/export"]);
const blockedPageLinkExtensions = /\.(?:css|gif|ico|jpeg|jpg|js|map|png|svg|woff2?)$/u;
const blockedPageLinkActions = /\/(?:delete|unwatch|vote)(?:\/|$)/u;

function curl(args) {
  const result = spawnSync("curl", ["-sS", "--max-time", "20", ...args], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error((result.stderr || result.stdout).trim());
  }
  return result.stdout;
}

function fetchPage(path, follow = true) {
  const url = `${baseUrl}${path}`;
  const output = curl([
    ...(follow ? ["-L"] : []),
    "-b",
    cookieJar,
    "-c",
    cookieJar,
    "-w",
    "\n%{http_code}",
    url,
  ]);
  const marker = output.lastIndexOf("\n");
  return {
    path,
    status: Number(output.slice(marker + 1)),
    html: output.slice(0, marker),
  };
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasStructuralToken(html, token) {
  const escaped = escapeRegex(token);
  return (
    new RegExp(`\\bid=["']${escaped}["']`).test(html) ||
    new RegExp(`\\bname=["']${escaped}["']`).test(html) ||
    new RegExp(`\\bclass=["'](?:[^"']*\\s)?${escaped}(?:\\s|["'])`).test(html)
  );
}

assert.equal(
  hasStructuralToken('<div class="project-header-outer other"></div>', "project-header-outer"),
  true,
);
assert.equal(hasStructuralToken('<input name="loginIdOrEmail">', "loginIdOrEmail"), true);
assert.equal(
  hasStructuralToken('<div class="not-project-header-outer"></div>', "project-header-outer"),
  false,
);

function normalizeDiscoveredPageLink(href) {
  try {
    const url = new URL(href, baseUrl);
    if (url.origin !== legacyOrigin) {
      return null;
    }
    const decodedPathname = decodeURIComponent(url.pathname);
    if (
      /[{}]/u.test(decodedPathname) ||
      blockedPageLinks.has(url.pathname) ||
      blockedPageLinkPrefixes.some((prefix) => url.pathname.startsWith(prefix)) ||
      blockedPageLinkActions.test(url.pathname) ||
      blockedPageLinkExtensions.test(url.pathname)
    ) {
      return null;
    }
    return `${url.pathname}${url.search}`.replace(/\/$/, "") || "/";
  } catch {
    return null;
  }
}

function discoverPageLinks(html) {
  return [
    ...new Set(
      [...html.matchAll(/\bhref=["']([^"']+)["']/gu)]
        .map((match) => normalizeDiscoveredPageLink(match[1]))
        .filter(Boolean),
    ),
  ].sort();
}

function auditPage(page) {
  const response = fetchPage(page.path);
  const expectedStatuses = page.statuses ?? [200];
  const structuralTokens = page.structuralTokens ?? page.anchors;
  const missingAnchors =
    response.status === 200 ? page.anchors.filter((anchor) => !response.html.includes(anchor)) : [];
  const missingStructuralTokens =
    response.status === 200
      ? structuralTokens.filter((anchor) => !hasStructuralToken(response.html, anchor))
      : [];
  return {
    path: page.path,
    status: response.status,
    ok:
      expectedStatuses.includes(response.status) &&
      missingAnchors.length === 0 &&
      missingStructuralTokens.length === 0,
    expectedNonOk: response.status !== 200 && expectedStatuses.includes(response.status),
    checkedAnchors: page.anchors,
    checkedStructuralTokens: structuralTokens,
    missingAnchors,
    missingStructuralTokens,
    discoveredPageLinks: response.status === 200 ? discoverPageLinks(response.html) : [],
    bytes: Buffer.byteLength(response.html),
  };
}

function discoverProjectPages() {
  const response = fetchPage("/projects");
  const blockedOwners = new Set([
    "-_-api",
    "_assets",
    "_help",
    "_import",
    "assets",
    "login",
    "notifications",
    "organizations",
    "projectform",
    "projects",
    "search",
    "sites",
    "user",
    "users",
  ]);
  const projectPaths = [
    ...new Set(
      [...response.html.matchAll(/href="\/([^/?#"']+)\/([^/?#"']+)"/g)]
        .map((match) => `${match[1]}/${match[2]}`)
        .filter((path) => !blockedOwners.has(path.split("/")[0]))
        .filter((path) => !path.includes(".")),
    ),
  ].sort();
  return [
    ...projectPaths.flatMap((projectPath) => [
      { path: `/${projectPath}`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/issues`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/issue/1`, anchors: ["project-header-outer", "project-menu-outer"] },
      {
        path: `/${projectPath}/issue/labelsform`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
      {
        path: `/${projectPath}/issueform`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
      { path: `/${projectPath}/posts`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/postform`, anchors: ["project-header-outer", "project-menu-outer"] },
      {
        path: `/${projectPath}/milestones`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
      {
        path: `/${projectPath}/newMilestoneForm`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
      {
        path: `/${projectPath}/pullRequests`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
      { path: `/${projectPath}/newPullRequestForm`, anchors: [], statuses: [200, 400] },
      { path: `/${projectPath}/reviews`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/code`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/commits`, anchors: [], statuses: [200, 404] },
      { path: `/${projectPath}/branches`, anchors: [], statuses: [200, 500] },
      { path: `/${projectPath}/members`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/watchers`, anchors: ["project-header-outer", "project-menu-outer"] },
      {
        path: `/${projectPath}/settingform`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
      { path: `/${projectPath}/webhooks`, anchors: ["project-header-outer", "project-menu-outer"] },
      {
        path: `/${projectPath}/deleteform`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
      { path: `/${projectPath}/transfer`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/newFork`, anchors: ["project-header-outer", "project-menu-outer"] },
      { path: `/${projectPath}/statistics`, anchors: ["project-header-outer"] },
      {
        path: `/${projectPath}/changeVCS`,
        anchors: ["project-header-outer", "project-menu-outer"],
      },
    ]),
  ];
}

function login() {
  fetchPage("/users/loginform");
  curl([
    "-b",
    cookieJar,
    "-c",
    cookieJar,
    "-w",
    "\n%{http_code}",
    "-X",
    "POST",
    "--data-urlencode",
    `loginIdOrEmail=${loginId}`,
    "--data-urlencode",
    `password=${password}`,
    "--data-urlencode",
    "redirectUrl=",
    `${baseUrl}/users/login`,
  ]);
}

mkdirSync(outputDir, { recursive: true });

try {
  const publicResults = publicPages.map(auditPage);
  login();
  const dynamicPages = discoverProjectPages();
  const authResults = [...authenticatedPages, ...dynamicPages].map(auditPage);
  const results = [...publicResults, ...authResults];
  const auditedPagePaths = new Set(results.map((result) => result.path.split("?")[0]));
  const discoveredPageLinks = [
    ...new Set(
      results.flatMap((result) => result.discoveredPageLinks.map((link) => link.split("?")[0])),
    ),
  ].sort();
  const unauditedDiscoveredPageLinks = discoveredPageLinks.filter(
    (link) => !auditedPagePaths.has(link),
  );
  const summary = {
    baseUrl,
    checkedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    expectedNonOk: results.filter((result) => result.expectedNonOk).length,
    discoveredDynamicPages: dynamicPages.map((page) => page.path),
    discoveredPageLinks,
    unauditedDiscoveredPageLinks,
    results,
  };
  const outputPath = join(outputDir, "latest.json");
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  if (summary.failed > 0 || unauditedDiscoveredPageLinks.length > 0) {
    process.exitCode = 1;
  }
} catch (error) {
  const summary = {
    baseUrl,
    checkedAt: new Date().toISOString(),
    error: error instanceof Error ? error.message : String(error),
    failed: 1,
    passed: 0,
    status: "unreachable",
    total: 0,
  };
  const outputPath = join(outputDir, "latest.json");
  writeFileSync(outputPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  rmSync(cookieDir, { recursive: true, force: true });
}
