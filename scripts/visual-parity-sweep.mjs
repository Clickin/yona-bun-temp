import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

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
  "/issue/labelsform",
  "/issueform",
  "/posts",
  "/postform",
  "/milestones",
  "/newMilestoneForm",
  "/pullRequests",
  "/newPullRequestForm",
  "/reviews",
  "/code",
  "/commits",
  "/branches",
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

const routeSampleValues = {
  "$branch": "main",
  "$commitId": "HEAD",
  "$issueNumber": "1",
  "$loginId": "admin",
  "$milestoneId": "1",
  "$organizationName": "pilot",
  "$owner": "pilot",
  "$pageName": "userList",
  "$postNumber": "1",
  "$projectName": "yona",
  "$pullRequestNumber": "1",
  "$revisionRange": "main...main",
  "$user": "admin",
  "$verificationCode": "invalid",
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
  await Promise.all([
    page.waitForLoadState("networkidle").catch(() => {}),
    page.locator('button[type="submit"], input[type="submit"], .btn-orange').first().click(),
  ]);
  return true;
}

async function apiLogin(page, baseUrl) {
  const sessionResponse = await page.request.get(`${baseUrl}/api/auth/session`);
  const csrfToken = sessionResponse.headers()["x-csrf-token"];
  if (!sessionResponse.ok() || !csrfToken) {
    return false;
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
  const hrefs = await page.locator("a[href]").evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.getAttribute("href") ?? ""),
  );
  const projectRoots = [
    ...new Set(
      hrefs
        .map((href) => normalizePath(baseUrl, href))
        .filter(Boolean)
        .map((path) => path.split("?")[0].split("/").filter(Boolean))
        .filter((parts) => parts.length >= 2 && !rootNames.has(parts[0]) && !parts[0].startsWith("-"))
        .map((parts) => `/${parts[0]}/${parts[1]}`),
    ),
  ].sort();
  return projectRoots.flatMap((root) => projectSuffixes.map((suffix) => `${root}${suffix}`));
}

function hasRawI18n(text) {
  return /(?<![a-z0-9_.-])(?:title|button|error|label|message|project|issue|user|notification)\.[a-z0-9_.-]+\b/u.test(
    text,
  );
}

function rawI18nKeys(text) {
  return [
    ...new Set(
      text.match(/(?<![a-z0-9_.-])(?:title|button|error|label|message|project|issue|user|notification)\.[a-z0-9_.-]+\b/gu) ??
        [],
    ),
  ].sort();
}

async function inspectPage(page, baseUrl, path, label) {
  const consoleErrors = [];
  const requestFailures = [];
  const onConsole = (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      !text.includes("www.google-analytics.com") &&
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
    response = await page.goto(urlFor(baseUrl, path), { waitUntil: "networkidle", timeout: 20_000 });
  } catch (error) {
    page.off("console", onConsole);
    page.off("requestfailed", onRequestFailed);
    return { path, ok: false, errors: [`navigation failed: ${error.message}`] };
  }

  const metrics = await page.evaluate(() => {
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
      bodyTextLength: body.innerText.trim().length,
      scrollWidth: Math.round(Math.max(body.scrollWidth, html.scrollWidth)),
      viewportWidth: window.innerWidth,
      stylesheetCount: stylesheets.length,
      stylesheetRules: stylesheets.reduce((sum, sheet) => sum + Math.max(0, sheet.rules), 0),
      hasStylesheetError: stylesheets.some((sheet) => sheet.rules === -1),
      gnb: selectorState(".gnb-outer"),
      projectHeader: selectorState(".project-header-outer"),
      projectMenu: selectorState(".project-menu-outer"),
      pageWrap: selectorState(".page-wrap-outer, .project-page-wrap"),
      loginDialog: selectorState("#loginDialog, .loginDialog"),
    };
  });
  const isProjectPage = /^\/[^/?#]+\/[^/?#]+/u.test(path) && !rootNames.has(path.split("/")[1]);
  const errors = [];
  const status = response?.status() ?? 0;
  if (status >= 500) {
    errors.push(`HTTP ${status}`);
  }
  if (metrics.stylesheetCount === 0 || metrics.stylesheetRules < 20) {
    errors.push(`stylesheet not applied: ${metrics.stylesheetCount} sheets, ${metrics.stylesheetRules} rules`);
  }
  if (metrics.bodyTextLength < 20 && status === 200) {
    errors.push("nearly blank page");
  }
  if (metrics.scrollWidth > metrics.viewportWidth * 1.8) {
    errors.push(`horizontal overflow ${metrics.scrollWidth}/${metrics.viewportWidth}`);
  }
  if (hasRawI18n(`${metrics.title}\n${metrics.text}`)) {
    errors.push(`raw i18n key visible: ${rawI18nKeys(`${metrics.title}\n${metrics.text}`).join(", ")}`);
  }
  if (path === "/" && metrics.loginDialog && metrics.loginDialog.width > metrics.viewportWidth * 0.8) {
    errors.push("login dialog width looks unstyled");
  }
  if (isProjectPage && !metrics.projectHeader) {
    errors.push("missing project header");
  }
  if (isProjectPage && !metrics.projectMenu) {
    errors.push("missing project menu");
  }
  if (consoleErrors.length > 0) {
    errors.push(`${consoleErrors.length} console error(s)`);
  }
  if (requestFailures.length > 0) {
    errors.push(`${requestFailures.length} request failure(s)`);
  }
  if (errors.length > 0) {
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
      projectHeader: metrics.projectHeader,
      projectMenu: metrics.projectMenu,
      pageWrap: metrics.pageWrap,
      loginDialog: metrics.loginDialog,
    },
  };
}

async function runTarget(label, baseUrl) {
  const browser = await chromium.launch({ channel: process.env.PW_CHANNEL ?? "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const page = await context.newPage();
  const loggedIn = label === "local" ? await apiLogin(page, baseUrl) : await login(page, baseUrl);
  const discoveredProjectPages = loggedIn ? await discoverProjectPaths(page, baseUrl) : [];
  const paths = [...new Set([...basePages, ...routeTreeSamplePaths(), ...discoveredProjectPages])];
  const results = [];
  for (const path of paths) {
    const routePage = await context.newPage();
    try {
      results.push(await inspectPage(routePage, baseUrl, path, label));
    } finally {
      await routePage.close().catch(() => {});
    }
  }
  await page.close().catch(() => {});
  await browser.close();
  return {
    label,
    baseUrl,
    loggedIn,
    total: results.length,
    passed: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
    discoveredProjectPages,
    results,
  };
}

const legacy = sweepTarget === "local" ? null : await runTarget("legacy", legacyBaseUrl);
const local = sweepTarget === "legacy" ? null : await runTarget("local", localBaseUrl);
const byPath = new Map((legacy?.results ?? []).map((result) => [result.path, result]));
const comparison = (local?.results ?? []).map((localResult) => {
  const legacyResult = byPath.get(localResult.path);
  return {
    path: localResult.path,
    legacyOk: legacyResult?.ok ?? null,
    localOk: localResult.ok,
    localErrors: localResult.errors,
    statusDelta: legacyResult ? `${legacyResult.status}->${localResult.status}` : "legacy-missing",
    textLengthDelta: legacyResult
      ? (localResult.metrics?.bodyTextLength ?? 0) - (legacyResult.metrics?.bodyTextLength ?? 0)
      : null,
    localStylesheetRules: localResult.metrics?.stylesheetRules ?? null,
  };
});
const summary = {
  checkedAt: new Date().toISOString(),
  legacy,
  local,
  comparison,
};
writeFileSync(resolve(outputDir, "latest.json"), `${JSON.stringify(summary, null, 2)}\n`);
console.log(JSON.stringify(summary, null, 2));
if ((local?.failed ?? 0) > 0 || (legacy?.failed ?? 0) > 0) {
  process.exitCode = 1;
}
