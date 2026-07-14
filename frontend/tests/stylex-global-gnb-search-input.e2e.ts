import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const BOX = '[data-stylex-owner="global-gnb-search-box"]';
const FORM = '[data-stylex-owner="global-gnb-search-form"]';
const INPUT = '[data-stylex-owner="global-gnb-search-input"]';
const SUBMIT = '[data-stylex-owner="global-gnb-search-submit"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search text input has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/theme.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbSearchInputStyles");
  const end = route.indexOf("const globalGnbSearchBoxStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbSearchInputBackground",
    "globalGnbSearchInputBorderStyle",
    "globalGnbSearchInputBoxSizing",
    "globalGnbSearchInputColor",
    "globalGnbSearchInputDisplay",
    "globalGnbSearchInputFontFamily",
    "globalGnbSearchInputFontSize",
    "globalGnbSearchInputFontWeight",
    "globalGnbSearchInputHeight",
    "globalGnbSearchInputLineHeight",
    "globalGnbSearchInputMarginBottom",
    "globalGnbSearchInputMaxWidth",
    "globalGnbSearchInputMinHeight",
    "globalGnbSearchInputOutlineStyle",
    "globalGnbSearchInputPaddingBlock",
    "globalGnbSearchInputPaddingInline",
    "globalGnbSearchInputRadius",
    "globalGnbSearchInputShadow",
    "globalGnbSearchInputTransitionDuration",
    "globalGnbSearchInputTransitionProperty",
    "globalGnbSearchInputTransitionTiming",
    "globalGnbSearchInputVerticalAlign",
    "globalGnbSearchInputWidth",
    "globalGnbSearchInputFocusMaxWidth",
    "globalGnbSearchInputFocusBorderColor",
    "globalGnbSearchInputFocusWidth",
    "globalGnbSearchInputFocusZIndex",
    "globalGnbSearchInputPosition",
    "globalGnbSearchInputZIndex",
    "globalGnbSearchInputZero",
  ]) {
    expect(styles).toContain(`globalColors.${token}`);
    expect(theme).toContain(`${token}:`);
  }
  expect(styles).not.toMatch(
    /#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b-?\d+(?:\.\d+)?(?:px|s|%)\b|!important/iu,
  );

  const marker = route.indexOf('data-stylex-owner="global-gnb-search-input"');
  const markup = route.slice(route.lastIndexOf("<input", marker), route.indexOf("/>", marker));
  expect(marker).toBeGreaterThanOrEqual(0);
  expect(markup).toContain("globalGnbSearchInputStyles.input");
  expect(markup).toContain('type="text"');
  expect(markup).toContain('name="keyword"');
  expect(markup).toContain('autoComplete="off"');
  expect(markup).toContain('accessKey="S"');

  expect(appCss).not.toContain('.gnb-search-form input[type="text"] {');
  expect(appCss).not.toContain('.gnb-search-form input[type="text"]:focus {');
});

test("frozen global GNB search-input sources stay byte-identical", () => {
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
  expect(
    createHash("sha256")
      .update(readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css"))
      .digest("hex"),
  ).toBe("6417f445da50d93038d5d8b970e75aabc69f0bba2928655ab419ce7da337a16f");
});

for (const state of [
  { kind: "home", path: "/" },
  { kind: "project", path: "/admin/sample" },
  { kind: "organization", path: "/organizations/weblabs" },
] as const) {
  test(`global GNB search input preserves exact ${state.kind} desktop base parity`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1366 });
    await installRuntime(page);
    if (state.kind === "project") await mockProject(page);
    if (state.kind === "organization") await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const input = page.locator(INPUT);
    await expect(input).toBeVisible();
    await expect(page.locator(FORM).locator(INPUT)).toHaveCount(1);
    await expect(input).toHaveAttribute("type", "text");
    await expect(input).toHaveAttribute("name", "keyword");
    await expect(input).toHaveAttribute("autocomplete", "off");
    await expect(input).toHaveAttribute("accesskey", "S");
    const evidence = await readInputEvidence(input);
    expect(evidence.box).toMatchObject({ height: 30, top: 5, width: 70 });
    expect(evidence.box.left).toBe(
      await page.locator(BOX).evaluate((box) => box.getBoundingClientRect().left),
    );
    expect(evidence.style).toEqual(baseStyle("12px"));
    await saveScreenshot(input, `stylex-global-gnb-search-input-${state.kind}-base.png`);
  });
}

test("project search focus preserves the exact transition final state", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const input = page.locator(INPUT);
  const before = await readInputEvidence(input);
  await input.focus();
  await expect(input).toBeFocused();
  await page.waitForTimeout(400);
  const focused = await readInputEvidence(input);
  expect(before.box).toMatchObject({ height: 30, top: 5, width: 70 });
  expect(focused.box).toMatchObject({ height: 30, left: before.box.left, top: 5, width: 220 });
  expect(focused.style).toEqual({
    ...baseStyle("12px"),
    borderColor: "rgb(243, 108, 34)",
    maxWidth: "250px",
    width: "200px",
    zIndex: "2",
  });
  await saveScreenshot(input, "stylex-global-gnb-search-input-project-focus.png");
});

test("mobile outer hiding keeps the frozen 16px important fallback", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const input = page.locator(INPUT);
  await expect(page.locator(FORM)).toBeHidden();
  await expect(input).toBeHidden();
  const evidence = await readInputEvidence(input);
  expect(evidence.box).toMatchObject({ height: 0, width: 0 });
  expect(evidence.style.fontSize).toBe("16px");
});

test("owned input is isolated and preserves legacy GET payload behavior", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const form = page.locator(FORM);
  const input = page.locator(INPUT);
  await expect(form).toHaveClass(/(?:^|\s)gnb-search-form(?:\s|$)/u);
  await expect(form).not.toHaveClass(/(?:^|\s)input-prepend(?:\s|$)/u);
  const evidence = await input.evaluate((node) => {
    const snapshot = () => {
      const style = getComputedStyle(node);
      return {
        borderRadius: style.borderRadius,
        boxSizing: style.boxSizing,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        height: style.height,
        padding: style.padding,
        width: style.width,
      };
    };
    const owned = snapshot();
    node.closest("form")!.className = "";
    node.parentElement!.className = "";
    return { isolated: snapshot(), owned };
  });
  expect(evidence.isolated).toEqual(evidence.owned);

  await expect(form).not.toHaveAttribute("method");
  await expect(form).toHaveAttribute("action", `${BASE_PATH}/admin/sample/search`);
  await input.fill("needle");
  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === `${BASE_PATH}/admin/sample/search` && url.searchParams.has("keyword");
  });
  await form.locator(SUBMIT).click({ noWaitAfter: true });
  const requestUrl = new URL((await requestPromise).url());
  expect(requestUrl.searchParams.get("searchType")).toBe("auto");
  expect(requestUrl.searchParams.get("keyword")).toBe("needle");
});

function baseStyle(fontSize: string) {
  return {
    backgroundColor: "rgb(255, 255, 255)",
    borderColor: "rgb(85, 85, 85)",
    borderRadius: "2px",
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    boxSizing: "content-box",
    color: "rgb(85, 85, 85)",
    display: "inline-block",
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    fontSize,
    fontWeight: "400",
    height: "20px",
    lineHeight: "30px",
    margin: "0px 0px 3px",
    maxWidth: "none",
    minHeight: "0px",
    outlineStyle: "none",
    outlineWidth: "0px",
    padding: "5px 10px",
    position: "relative",
    transitionDuration: "0.3s",
    transitionProperty: "width",
    transitionTimingFunction: "ease",
    verticalAlign: "top",
    width: "50px",
    zIndex: "auto",
  };
}

async function readInputEvidence(input: Locator) {
  return input.evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    return {
      box: {
        height: rect.height,
        left: rect.left,
        top: rect.top,
        width: rect.width,
      },
      style: {
        backgroundColor: style.backgroundColor,
        borderColor: style.borderColor,
        borderRadius: style.borderRadius,
        borderStyle: style.borderStyle,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        boxSizing: style.boxSizing,
        color: style.color,
        display: style.display,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        height: style.height,
        lineHeight: style.lineHeight,
        margin: style.margin,
        maxWidth: style.maxWidth,
        minHeight: style.minHeight,
        outlineStyle: style.outlineStyle,
        outlineWidth: style.outlineWidth,
        padding: style.padding,
        position: style.position,
        transitionDuration: style.transitionDuration,
        transitionProperty: style.transitionProperty,
        transitionTimingFunction: style.transitionTimingFunction,
        verticalAlign: style.verticalAlign,
        width: style.width,
        zIndex: style.zIndex,
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
