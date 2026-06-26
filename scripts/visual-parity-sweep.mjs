import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { hasRawLegacyI18nKey, rawLegacyI18nKeys } from "./legacy-i18n-key-detector.mjs";
import {
  buildVisualComparison,
  summarizeVisualComparison,
} from "./visual-parity-comparison.mjs";
import { buildLegacyAuditCorpus } from "./visual-parity-sweep-corpus.mjs";

const repoRoot = resolve(new URL("..", import.meta.url).pathname);
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { chromium } = require("@playwright/test");
const outputDir = resolve(repoRoot, "output/playwright/visual-sweep");
const legacyBaseUrl = (process.env.YONA_LEGACY_BASE_URL ?? "http://192.168.45.10:9000").replace(
  /\/$/,
  "",
);
const localBaseUrl = (process.env.YORAM_BASE_URL ?? "http://127.0.0.1:18101/yona").replace(
  /\/$/,
  "",
);
const loginId = process.env.YONA_LEGACY_LOGIN_ID ?? "admin";
const password = process.env.YONA_LEGACY_PASSWORD ?? "admin";
const sweepTarget = process.env.YORAM_SWEEP_TARGET ?? "both";

mkdirSync(outputDir, { recursive: true });

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

const alwaysScreenshotPaths = new Set(["/", "/admin/sample", "/users/loginform"]);

const routeSampleValues = {
  $branch: "main",
  $commitId: "HEAD",
  $issueNumber: "1",
  $loginId: "admin",
  $milestoneId: "1",
  $organizationName: "pilot",
  $owner: "pilot",
  $pageName: "userList",
  $postNumber: "1",
  $projectName: "yona",
  $pullRequestNumber: "1",
  $revisionRange: "main...main",
  $user: "admin",
  $verificationCode: "invalid",
};

const routeTreeSampleAliases = {
  "/(legacy-auth)/reset-password": "/reset-password",
  "/$owner/$projectName/code/$branch/$": "/pilot/yona/code/main/README.md",
  "/$owner/$projectName/code/$branch/": "/pilot/yona/code/main/",
  "/$owner/$projectName/code/": "/pilot/yona/code/",
  "/$owner/$projectName/commits/$branch/$": "/pilot/yona/commits/main/",
  "/$owner/$projectName/commits/$branch/": "/pilot/yona/commits/main/",
  "/$owner/$projectName/commits/": "/pilot/yona/commits/",
  "/$owner/$projectName/": "/pilot/yona/",
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
    pages: cachedLegacyAuditCorpus.pages,
    path: cachedLegacyAuditCorpus.path,
    status: cachedLegacyAuditCorpus.status,
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

async function login(page, baseUrl) {
  await page.goto(urlFor(baseUrl, "/users/loginform"), { waitUntil: "networkidle" });
  const loginField = page.locator('input[name="loginIdOrEmail"], input#loginIdOrEmail').first();
  const passwordField = page.locator('input[name="password"], input#password').first();
  if ((await loginField.count()) === 0 || (await passwordField.count()) === 0) {
    return false;
  }
  await loginField.fill(loginId);
  await passwordField.fill(password);
  const loginForm = page.locator('form:has(input[name="loginIdOrEmail"])').first();
  const submitButton = loginForm.locator('button[type="submit"], input[type="submit"]').first();
  await Promise.all([page.waitForLoadState("networkidle").catch(() => {}), submitButton.click()]);
  return true;
}

async function apiLogin(page, baseUrl) {
  const sessionResponse = await page.request.get(`${baseUrl}/api/auth/session`);
  const csrfToken = sessionResponse.headers()["x-csrf-token"];
  if (!sessionResponse.ok() || !csrfToken) {
    return false;
  }
  const ensureSampleProject = async () => {
    await page.request.post(`${baseUrl}/api/v1/owners/admin/projects`, {
      data: {
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
      },
      headers: {
        "x-csrf-token": csrfToken,
      },
    });
    const issueResponse = await page.request.get(
      `${baseUrl}/api/v1/projects/admin/sample/issues/1`,
    );
    if (!issueResponse.ok()) {
      await page.request.post(`${baseUrl}/api/v1/projects/admin/sample/issues`, {
        data: {
          assigneeLoginId: "",
          attachmentIds: [],
          bodyMarkdown: "Sample issue body",
          dueDate: "",
          isDraft: false,
          isPublish: false,
          labelIds: [],
          title: "Sample issue",
        },
        headers: {
          "x-csrf-token": csrfToken,
        },
      });
    }
    await page.request.post(`${baseUrl}/api/v1/workspace/recent-projects`, {
      data: {
        ownerName: "admin",
        projectName: "sample",
      },
      headers: {
        "x-csrf-token": csrfToken,
      },
    });
  };
  const adminRegisterResponse = await page.request.post(`${baseUrl}/api/v1/auth/register`, {
    data: {
      emailAddress: "admin@example.com",
      loginId: "admin",
      name: "Yobi Admin",
      password: "admin",
      retypedPassword: "admin",
    },
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
  if (adminRegisterResponse.ok()) {
    await ensureSampleProject();
    return true;
  }
  const adminSignInResponse = await page.request.post(`${baseUrl}/api/v1/auth/sign-in`, {
    data: {
      identifier: "admin",
      password: "admin",
      rememberMe: true,
    },
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
  if (adminSignInResponse.ok()) {
    await ensureSampleProject();
    return true;
  }
  const suffix = Date.now().toString(36);
  const registerResponse = await page.request.post(`${baseUrl}/api/v1/auth/register`, {
    data: {
      emailAddress: `sweep-${suffix}@example.com`,
      loginId: `sweep-${suffix}`,
      name: "Visual Sweep",
      password: "doorpass1",
      retypedPassword: "doorpass1",
    },
    headers: {
      "x-csrf-token": csrfToken,
    },
  });
  return registerResponse.ok();
}

async function discoverProjectPaths(page, baseUrl) {
  await page.goto(urlFor(baseUrl, "/projects"), { waitUntil: "networkidle" });
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

async function inspectPage(page, baseUrl, path, label) {
  const consoleErrors = [];
  const requestFailures = [];
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
  const onRequestFailed = (request) => {
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
  page.on("console", onConsole);
  page.on("requestfailed", onRequestFailed);
  let response = null;
  try {
    response = await page.goto(urlFor(baseUrl, path), {
      waitUntil: "networkidle",
      timeout: 20_000,
    });
  } catch (error) {
    page.off("console", onConsole);
    page.off("requestfailed", onRequestFailed);
    if (error instanceof Error && error.message.includes("Download is starting")) {
      return {
        path,
        status: 0,
        ok: true,
        download: true,
        errors: [],
        consoleErrors,
        requestFailures,
        metrics: null,
      };
    }
    return { path, ok: false, errors: [`navigation failed: ${error.message}`] };
  }

  await page
    .waitForFunction(
      () => {
        const text = document.body.innerText.trim();
        return (
          text.length > 0 &&
          !text.includes("불러오는 중") &&
          !text.includes("common.loading") &&
          !text.includes("Loading")
        );
      },
      { timeout: 5_000 },
    )
    .catch(() => {});

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
    const selectorState = (selector) => {
      const element = document.querySelector(selector);
      if (!element) {
        return null;
      }
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        display: style.display,
        position: style.position,
        fontSize: style.fontSize,
        backgroundColor: style.backgroundColor,
      };
    };
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
      gnb: selectorState(".gnb-outer"),
      gnbInner: selectorState(".gnb-inner"),
      gnbUsermenu: selectorState(".gnb-usermenu"),
      sidenav: selectorState("#mySidenav"),
      projectHeader: selectorState(".project-header-outer"),
      projectMenu: selectorState(".project-menu-outer"),
      pageWrap: selectorState(".page-wrap-outer, .project-page-wrap"),
      loginDialog: selectorState("#loginDialog, .loginDialog"),
      footer: selectorState("footer.page-footer-outer"),
      userProfile: selectorState(".user-profile-page"),
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
  const isProjectPage = /^\/[^/?#]+\/[^/?#]+/u.test(path) && !rootNames.has(path.split("/")[1]);
  const isLegacyFragment = label === "legacy" && path.startsWith("/notification?");
  const isFramedShell = path === "/sidebar" || path.startsWith("/sidebar?");
  const errors = [];
  const status = response?.status() ?? 0;
  if (status >= 500) {
    errors.push(`HTTP ${status}`);
  }
  if (!isLegacyFragment && (metrics.stylesheetCount === 0 || metrics.stylesheetRules < 20)) {
    errors.push(
      `stylesheet not applied: ${metrics.stylesheetCount} sheets, ${metrics.stylesheetRules} rules`,
    );
  }
  if (!isLegacyFragment && metrics.bodyTextLength < 20 && status === 200) {
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
    !isLegacyFragment &&
    !metrics.isErrorPage &&
    (!metrics.gnb || metrics.gnb.width < metrics.viewportWidth * 0.8)
  ) {
    errors.push("missing global navigation");
  }
  if (!isFramedShell && !isLegacyFragment && !metrics.isErrorPage && !metrics.gnbInner) {
    errors.push("missing global navigation inner container");
  }
  if (!isFramedShell && !isLegacyFragment && !metrics.isErrorPage && !metrics.gnbUsermenu) {
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
  if (requestFailures.length > 0) {
    errors.push(`${requestFailures.length} request failure(s)`);
  }
  if (errors.length > 0 || alwaysScreenshotPaths.has(path)) {
    await page.screenshot({
      path: resolve(outputDir, `${label}-${path.replace(/[^a-z0-9]+/giu, "_") || "root"}.png`),
      fullPage: true,
    });
  }
  page.off("console", onConsole);
  page.off("requestfailed", onRequestFailed);
  return {
    path,
    status,
    ok: errors.length === 0,
    errors,
    consoleErrors,
    requestFailures,
    metrics: {
      title: metrics.title,
      bodyTextLength: metrics.bodyTextLength,
      scrollWidth: metrics.scrollWidth,
      viewportWidth: metrics.viewportWidth,
      stylesheetCount: metrics.stylesheetCount,
      stylesheetRules: metrics.stylesheetRules,
      gnb: metrics.gnb,
      gnbInner: metrics.gnbInner,
      gnbUsermenu: metrics.gnbUsermenu,
      sidenav: metrics.sidenav,
      projectHeader: metrics.projectHeader,
      projectMenu: metrics.projectMenu,
      pageWrap: metrics.pageWrap,
      loginDialog: metrics.loginDialog,
      footer: metrics.footer,
      userProfile: metrics.userProfile,
      isErrorPage: metrics.isErrorPage,
    },
  };
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
    status: targetFailureStatus(error),
    loggedIn: false,
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
  const channel = process.env.PW_CHANNEL ?? "msedge";
  return chromium.launch({
    ...(channel === "chromium" || channel === "" ? {} : { channel }),
    headless: true,
  });
}

async function runTarget(label, baseUrl) {
  const browser = await launchBrowser();
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    const page = await context.newPage();
    const loggedIn = label === "local" ? await apiLogin(page, baseUrl) : await login(page, baseUrl);
    const directApiSurfaces =
      label === "local" && loggedIn ? await inspectLocalDirectApiSurfaces(page, baseUrl) : null;
    const discoveredProjectPages = loggedIn ? await discoverProjectPaths(page, baseUrl) : [];
    const legacyAuditPages = legacyAuditDiscoveredPageLinks();
    const routeSamples = label === "legacy" ? [] : routeTreeSamplePaths();
    const paths = [
      ...new Set([...basePages, ...legacyAuditPages, ...routeSamples, ...discoveredProjectPages]),
    ];
    const results = [];
    for (const path of paths) {
      const routePage = await context.newPage();
      try {
        results.push(await inspectPage(routePage, baseUrl, path, label));
      } finally {
        await routePage.close().catch(() => {});
      }
    }
    const resultPaths = new Set(results.map((result) => result.path));
    const missingLegacyAuditPages = legacyAuditPages.filter((path) => !resultPaths.has(path));
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    return {
      label,
      baseUrl,
      status: "ok",
      loggedIn,
      total: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
      directApiSurfaces,
      legacyAuditPages,
      legacyAuditCorpus: legacyAuditCorpusSummary(),
      legacyAuditPagesCovered: legacyAuditPages.length - missingLegacyAuditPages.length,
      missingLegacyAuditPages,
      discoveredProjectPages,
      results,
    };
  } finally {
    await browser.close().catch(() => {});
  }
}

async function runTargetSafely(label, baseUrl) {
  try {
    return await runTarget(label, baseUrl);
  } catch (error) {
    return failedTargetResult(label, baseUrl, error);
  }
}

const legacy = sweepTarget === "local" ? null : await runTargetSafely("legacy", legacyBaseUrl);
const local = sweepTarget === "legacy" ? null : await runTargetSafely("local", localBaseUrl);
const comparison = buildVisualComparison({
  legacyResults: legacy?.results ?? [],
  localResults: local?.results ?? [],
});
const summary = {
  checkedAt: new Date().toISOString(),
  legacy,
  local,
  comparison,
  comparisonSummary: summarizeVisualComparison(comparison),
};
writeFileSync(resolve(outputDir, "latest.json"), `${JSON.stringify(summary, null, 2)}\n`);
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
  comparisonFailures.length > 0
) {
  process.exitCode = 1;
}
