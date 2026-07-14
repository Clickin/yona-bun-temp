import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const BOX = '[data-stylex-owner="global-gnb-search-box"]';
const FORM = '[data-stylex-owner="global-gnb-search-form"]';
const SCOPE = '[data-stylex-owner="global-gnb-search-scope"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search box has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/theme.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbSearchBoxStyles");
  const end = route.indexOf("const globalGnbSearchScopeStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbSearchBoxSurface",
    "globalGnbSearchBoxBorderStyle",
    "globalGnbSearchBoxBoxSizing",
    "globalGnbSearchBoxDisplay",
    "globalGnbSearchBoxHeight",
    "globalGnbSearchBoxRadius",
    "globalGnbSearchBoxVerticalAlign",
    "globalGnbSearchBoxZero",
  ]) {
    expect(styles).toContain(`globalColors.${token}`);
    expect(theme).toContain(`${token}:`);
  }
  expect(styles).not.toMatch(
    /#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b-?\d+(?:\.\d+)?(?:px|s|%)\b|!important/iu,
  );

  const marker = route.indexOf('data-stylex-owner="global-gnb-search-box"');
  const markup = route.slice(route.lastIndexOf("<div", marker), route.indexOf("</div>", marker));
  expect(marker).toBeGreaterThanOrEqual(0);
  expect(markup).toMatch(/className=\{`search-box \$\{\s*stylex\.props\(/u);
  expect(markup).toContain("globalGnbSearchBoxStyles.box");
  expect(markup).toContain("hasScopedSearch && globalGnbSearchBoxStyles.scoped");
  expect(markup).not.toMatch(/(?:^|[\s"'`])select(?:[\s"'`]|$)/u);
  expect(markup.indexOf('name="keyword"')).toBeLessThan(markup.indexOf('type="submit"'));

  expect(appCss).not.toContain(".gnb-search-form .search-box {");
  expect(appCss).not.toContain(".gnb-search-form .search-box.select {");
  expect(appCss).toContain('.gnb-search-form input[type="text"] {');
  expect(appCss).toContain(".gnb-search-form .search-box button {");
});

test("frozen global GNB search-box sources stay byte-identical", () => {
  const hashes = new Map([
    [
      "../yona-original/app/assets/stylesheets/yobi.less",
      "b80c78edc2f66b3e14d7087d6c689c387195c06c2e5352d111fb406796d3ca62",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_page.less",
      "2124a6efd122029ff51d26e5b513fbd3945d1020487101a19a5aaa00448d4aa3",
    ],
    [
      "../yona-original/app/assets/stylesheets/less/_responsive.less",
      "3b8038e9e3f9fb2067d506794e342bf0aca81071d94128c6cc1a3214c0812105",
    ],
    [
      "../yona-original/public/bootstrap/css/bootstrap.css",
      "a1878fdc8822d0e2419d823bfa1b87276233038857416a31737445502a51e8f9",
    ],
    [
      "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
      "a0baa7fb81cfe06b3bfe4489cb15c998ad3afc7cf7eb77e36f356278d247f440",
    ],
  ]);

  for (const [path, expected] of hashes) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(expected);
  }
});

for (const state of [
  { kind: "home", path: "/", scoped: false },
  { kind: "project", path: "/admin/sample", scoped: true },
  { kind: "organization", path: "/organizations/weblabs", scoped: true },
] as const) {
  test(`global GNB search box preserves exact ${state.kind} desktop base parity`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1366 });
    await installRuntime(page);
    if (state.kind === "project") await mockProject(page);
    if (state.kind === "organization") await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const box = page.locator(BOX);
    const form = page.locator(FORM);
    await expect(box).toBeVisible();
    await expect(box).toHaveClass(/(?:^|\s)search-box(?:\s|$)/u);
    await expect(box).not.toHaveClass(/(?:^|\s)select(?:\s|$)/u);
    await expect(form.locator(BOX)).toHaveCount(1);
    if (state.scoped) {
      await expect(form.locator(`:scope > ${SCOPE} + ${BOX}`)).toHaveCount(1);
    } else {
      await expect(form.locator(`:scope > ${SCOPE}`)).toHaveCount(0);
      await expect(form.locator(`:scope > input[type="hidden"] + ${BOX}`)).toHaveCount(1);
    }

    const evidence = await readBoxEvidence(box);
    expect(evidence.box).toMatchObject({ height: 30, top: 5, width: 92 });
    expect(evidence.style).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      borderRadius: state.scoped ? "0px 3px 3px 0px" : "3px",
      borderWidth: "0px",
      boxSizing: "content-box",
      display: "inline-block",
      height: "30px",
      verticalAlign: "middle",
    });
    expect(evidence.inputBox.width).toBe(70);
    expect(evidence.buttonBox.left - evidence.inputBox.right).toBe(5);
    expect(evidence.inputBox.top).toBeGreaterThanOrEqual(evidence.box.top);
    expect(evidence.buttonBox.right).toBeLessThanOrEqual(evidence.box.right);

    await saveScreenshot(box, `stylex-global-gnb-search-box-${state.kind}-base.png`);
  });
}

test("project search focus expands the input and owned wrapper without compensation", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  const box = page.locator(BOX);
  const input = box.locator('input[name="keyword"]');
  const before = await readBoxEvidence(box);
  await input.focus();
  await expect(input).toBeFocused();
  await page.waitForTimeout(350);
  const focused = await readBoxEvidence(box);

  expect(before.box.width).toBe(92);
  expect(focused.box).toMatchObject({ height: 30, left: before.box.left, top: 5, width: 242 });
  expect(focused.inputBox.width).toBe(220);
  expect(focused.buttonBox.left - focused.inputBox.right).toBe(5);
  expect(focused.box.right - focused.buttonBox.right).toBe(5);
  await saveScreenshot(box, "stylex-global-gnb-search-box-project-focus.png");
});

test("outer responsive rule hides the owned search box at 390px", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  await expect(page.locator(FORM)).toBeHidden();
  await expect(page.locator(BOX)).toBeHidden();
  const box = await page.locator(BOX).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    return { height: rect.height, width: rect.width };
  });
  expect(box).toEqual({ height: 0, width: 0 });
});

test("search-box DOM order and legacy GET form behavior remain intact", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  const form = page.locator(FORM);
  const box = page.locator(BOX);
  await expect(box.locator(":scope > :nth-child(1)")).toHaveAttribute("name", "keyword");
  await expect(box.locator(":scope > :nth-child(2)")).toHaveAttribute("type", "submit");
  await expect(form).not.toHaveAttribute("method");
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/admin/sample/search`);
  await box.locator('input[name="keyword"]').fill("needle");

  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === `${BASE_PATH}/admin/sample/search` && url.searchParams.has("keyword");
  });
  await box.locator('button[type="submit"]').click({ noWaitAfter: true });
  const requestUrl = new URL((await requestPromise).url());
  expect(requestUrl.searchParams.get("searchType")).toBe("auto");
  expect(requestUrl.searchParams.get("keyword")).toBe("needle");
});

test("owned wrapper is isolated while search-box remains only for descendant fallback", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);

  const evidence = await page.locator(BOX).evaluate((box) => {
    const button = box.querySelector("button")!;
    const snapshot = () => {
      const style = getComputedStyle(box);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderWidth: style.borderWidth,
        boxSizing: style.boxSizing,
        display: style.display,
        height: style.height,
        verticalAlign: style.verticalAlign,
      };
    };
    const owned = snapshot();
    const retainedClassName = box.className;
    const descendantFallbackMargin = getComputedStyle(button).margin;
    box.parentElement!.className = "";
    box.parentElement!.parentElement!.className = "";
    const isolated = snapshot();
    box.classList.remove("search-box");
    const strippedDescendantMargin = getComputedStyle(button).margin;
    return {
      descendantFallbackMargin,
      isolated,
      owned,
      retainedClassName,
      strippedDescendantMargin,
    };
  });

  expect(evidence.isolated).toEqual(evidence.owned);
  expect(evidence.retainedClassName).toContain("search-box");
  expect(evidence.retainedClassName).not.toMatch(/(?:^|\s)select(?:\s|$)/u);
  expect(evidence.descendantFallbackMargin).toBe("5px");
  expect(evidence.strippedDescendantMargin).not.toBe("5px");
});

async function readBoxEvidence(box: Locator) {
  return box.evaluate((node) => {
    const input = node.querySelector("input")!;
    const button = node.querySelector("button")!;
    const nodeBox = node.getBoundingClientRect();
    const inputBox = input.getBoundingClientRect();
    const buttonBox = button.getBoundingClientRect();
    const style = getComputedStyle(node);
    const rect = (value: DOMRect) => ({
      bottom: value.bottom,
      height: value.height,
      left: value.left,
      right: value.right,
      top: value.top,
      width: value.width,
    });
    return {
      box: rect(nodeBox),
      buttonBox: rect(buttonBox),
      inputBox: rect(inputBox),
      style: {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        borderWidth: style.borderWidth,
        boxSizing: style.boxSizing,
        display: style.display,
        height: style.height,
        verticalAlign: style.verticalAlign,
      },
    };
  });
}

async function installRuntime(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: false,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/workspace/overview**", (route) =>
    route.fulfill({ contentType: "application/json", json: { profile: { loginId: "admin" } } }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/organizations**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}

async function mockProject(page: Page) {
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/legacy-assets/images/bg-default-project.png",
        dashboard: { assignees: [], labels: [], milestones: [], pullRequests: [] },
        history: { items: [] },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/legacy-assets/images/project_default_logo.png",
        members: [],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        organizationName: "weblabs",
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
      },
    }),
  );
}

async function mockOrganization(page: Page) {
  await page.route("**/api/v1/organizations/weblabs/container", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        adminMembers: [],
        description: "Web labs group",
        enrollmentRequested: false,
        logoUrl: "",
        managers: [],
        memberMembers: [],
        members: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanEnroll: false,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      },
    }),
  );
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
