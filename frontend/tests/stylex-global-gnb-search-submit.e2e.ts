import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const BOX = '[data-stylex-owner="global-gnb-search-box"]';
const FORM = '[data-stylex-owner="global-gnb-search-form"]';
const ICON = '[data-stylex-owner="global-gnb-search-icon"]';
const INPUT = '[data-stylex-owner="global-gnb-search-input"]';
const SUBMIT = '[data-stylex-owner="global-gnb-search-submit"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("global GNB search submit has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbSearchSubmitStyles");
  const end = route.indexOf("const globalGnbSearchInputStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbSearchSubmitAppearance",
    "globalGnbSearchSubmitBackground",
    "globalGnbSearchSubmitBorderStyle",
    "globalGnbSearchSubmitBoxSizing",
    "globalGnbSearchSubmitColor",
    "globalGnbSearchSubmitCursor",
    "globalGnbSearchSubmitDisplay",
    "globalGnbSearchSubmitFontFamily",
    "globalGnbSearchSubmitFontSize",
    "globalGnbSearchSubmitFontWeight",
    "globalGnbSearchSubmitLineHeight",
    "globalGnbSearchSubmitMargin",
    "globalGnbSearchSubmitMinHeight",
    "globalGnbSearchSubmitOutlineStyle",
    "globalGnbSearchSubmitPadding",
    "globalGnbSearchSubmitShadow",
    "globalGnbSearchSubmitTextAlign",
    "globalGnbSearchSubmitVerticalAlign",
    "globalGnbSearchSubmitZero",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);

  const marker = route.indexOf('data-stylex-owner="global-gnb-search-submit"');
  const markup = route.slice(
    route.lastIndexOf("<button", marker),
    route.indexOf("</button>", marker),
  );
  expect(marker).toBeGreaterThanOrEqual(0);
  expect(markup).toContain("globalGnbSearchSubmitStyles.submit");
  expect(markup).toContain('type="submit"');
  expect(markup).toContain('data-stylex-owner="global-gnb-search-icon"');
  expect(markup).toContain('className="yobicon-search"');

  const boxMarker = route.indexOf('data-stylex-owner="global-gnb-search-box"');
  const boxMarkup = route.slice(
    route.lastIndexOf("<div", boxMarker),
    route.indexOf("</div>", boxMarker),
  );
  expect(boxMarkup).toContain("globalGnbSearchBoxStyles.box");
  expect(boxMarkup).not.toMatch(/(?:^|[\s"'`])search-box(?:[\s"'`]|$)/u);
  expect(appCss).not.toContain(".gnb-search-form .search-box button {");
});

test("frozen button and Yobicon sources stay byte-identical", () => {
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
      "../yona-original/public/bootstrap/css/bootstrap.css",
      "a1878fdc8822d0e2419d823bfa1b87276233038857416a31737445502a51e8f9",
    ],
    [
      "../yona-original/public/stylesheets/yobicon/style.css",
      "7261dbeadd9de8dabe4abb347dba245d1427bac855f787f962d6446caccdf229",
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
  test(`global GNB search submit preserves exact ${state.kind} desktop parity`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: 900, width: 1366 });
    await installRuntime(page);
    if (state.kind === "project") await mockProject(page);
    if (state.kind === "organization") await mockOrganization(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.load("12px yobicon"));
    await page.evaluate(() => document.fonts.ready);

    const box = page.locator(BOX);
    const input = page.locator(INPUT);
    const submit = page.locator(SUBMIT);
    const icon = page.locator(ICON);
    await expect(submit).toBeVisible();
    await expect(submit).toHaveAttribute("type", "submit");
    await expect(submit.locator(`:scope > ${ICON}`)).toHaveCount(1);
    await expect(icon).toHaveClass("yobicon-search");
    await expect(box.locator(":scope > :nth-child(1)")).toHaveAttribute(
      "data-stylex-owner",
      "global-gnb-search-input",
    );
    await expect(box.locator(":scope > :nth-child(2)")).toHaveAttribute(
      "data-stylex-owner",
      "global-gnb-search-submit",
    );

    const evidence = await readSubmitEvidence(submit, icon, input, box);
    expect(evidence.submitBox).toMatchObject({ height: 20, width: 12 });
    expect(evidence.iconBox).toMatchObject({ height: 12, width: 12 });
    expect(evidence.iconBox.top - evidence.submitBox.top).toBe(3);
    expect(evidence.submitBox.left - evidence.inputBox.right).toBe(5);
    expect(evidence.boxBox.right - evidence.submitBox.right).toBe(5);
    expect(evidence.submitStyle).toEqual(submitStyle());
    expect(evidence.iconStyle).toEqual({
      backgroundImage: "none",
      display: "inline-block",
      fontFamily: "yobicon",
      fontSize: "12px",
      fontStyle: "normal",
      fontVariant: "normal",
      fontWeight: "400",
      lineHeight: "12px",
      textDecorationLine: "none",
      verticalAlign: "baseline",
    });
    expect(evidence.beforeContent).toBe('"\ue225"');
    await saveScreenshot(submit, `stylex-global-gnb-search-submit-${state.kind}-base.png`);
  });
}

test("submit hover and focus preserve exact legacy paint", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const submit = page.locator(SUBMIT);
  const base = await readButtonStyle(submit);
  await submit.hover();
  expect(await readButtonStyle(submit)).toEqual(base);
  await submit.focus();
  await expect(submit).toBeFocused();
  expect(await readButtonStyle(submit)).toEqual(base);
  expect(base).toEqual(submitStyle());
});

test("outer responsive rule hides the owned submit and icon at 390px", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  await expect(page.locator(FORM)).toBeHidden();
  await expect(page.locator(SUBMIT)).toBeHidden();
  await expect(page.locator(ICON)).toBeHidden();
  expect(
    await page.locator(SUBMIT).evaluate((node) => {
      const rect = node.getBoundingClientRect();
      return { height: rect.height, width: rect.width };
    }),
  ).toEqual({ height: 0, width: 0 });
});

test("submit is isolated while Yobicon remains the required global glyph primitive", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const evidence = await page.locator(SUBMIT).evaluate((button) => {
    const icon = button.querySelector('[data-stylex-owner="global-gnb-search-icon"]')!;
    const snapshot = () => {
      const style = getComputedStyle(button);
      return {
        backgroundColor: style.backgroundColor,
        borderWidth: style.borderWidth,
        boxShadow: style.boxShadow,
        color: style.color,
        fontSize: style.fontSize,
        margin: style.margin,
        padding: style.padding,
      };
    };
    const owned = snapshot();
    button.closest("form")!.className = "";
    button.parentElement!.className = "";
    const isolated = snapshot();
    const glyph = {
      content: getComputedStyle(icon, "::before").content,
      fontFamily: getComputedStyle(icon).fontFamily,
    };
    icon.classList.remove("yobicon-search");
    const strippedGlyph = {
      content: getComputedStyle(icon, "::before").content,
      fontFamily: getComputedStyle(icon).fontFamily,
    };
    return { glyph, isolated, owned, strippedGlyph };
  });
  expect(evidence.isolated).toEqual(evidence.owned);
  expect(evidence.glyph).toEqual({ content: '"\ue225"', fontFamily: "yobicon" });
  expect(evidence.strippedGlyph).not.toEqual(evidence.glyph);
});

test("owned submit preserves the legacy GET payload", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await mockProject(page);
  await page.goto(`${BASE_PATH}/admin/sample`);
  const form = page.locator(FORM);
  await expect(form).not.toHaveAttribute("method");
  await page.locator(INPUT).fill("needle");
  const requestPromise = page.waitForRequest((request) => {
    const url = new URL(request.url());
    return url.pathname === `${BASE_PATH}/admin/sample/search` && url.searchParams.has("keyword");
  });
  await page.locator(SUBMIT).click({ noWaitAfter: true });
  const requestUrl = new URL((await requestPromise).url());
  expect(requestUrl.searchParams.get("searchType")).toBe("auto");
  expect(requestUrl.searchParams.get("keyword")).toBe("needle");
});

function submitStyle() {
  return {
    appearance: "button",
    backgroundColor: "rgba(0, 0, 0, 0)",
    borderColor: "rgb(0, 0, 0)",
    borderStyle: "none",
    borderWidth: "0px",
    boxShadow: "none",
    boxSizing: "border-box",
    color: "rgb(0, 0, 0)",
    cursor: "pointer",
    display: "inline-block",
    fontFamily:
      '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
    fontSize: "12px",
    fontWeight: "400",
    lineHeight: "20px",
    margin: "5px",
    minHeight: "0px",
    outlineStyle: "none",
    outlineWidth: "0px",
    padding: "0px",
    textAlign: "center",
    verticalAlign: "middle",
  };
}

async function readButtonStyle(button: Locator) {
  return button.evaluate((node) => {
    const style = getComputedStyle(node);
    return {
      appearance: style.appearance,
      backgroundColor: style.backgroundColor,
      borderColor: style.borderColor,
      borderStyle: style.borderStyle,
      borderWidth: style.borderWidth,
      boxShadow: style.boxShadow,
      boxSizing: style.boxSizing,
      color: style.color,
      cursor: style.cursor,
      display: style.display,
      fontFamily: style.fontFamily,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      lineHeight: style.lineHeight,
      margin: style.margin,
      minHeight: style.minHeight,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      padding: style.padding,
      textAlign: style.textAlign,
      verticalAlign: style.verticalAlign,
    };
  });
}

async function readSubmitEvidence(submit: Locator, icon: Locator, input: Locator, box: Locator) {
  return submit.evaluate(
    (button, elements) => {
      const targets = elements as { box: Element; icon: Element; input: Element };
      const rect = (node: Element) => {
        const value = node.getBoundingClientRect();
        return {
          bottom: value.bottom,
          height: value.height,
          left: value.left,
          right: value.right,
          top: value.top,
          width: value.width,
        };
      };
      const iconStyle = getComputedStyle(targets.icon);
      const buttonStyle = getComputedStyle(button);
      return {
        beforeContent: getComputedStyle(targets.icon, "::before").content,
        boxBox: rect(targets.box),
        iconBox: rect(targets.icon),
        iconStyle: {
          backgroundImage: iconStyle.backgroundImage,
          display: iconStyle.display,
          fontFamily: iconStyle.fontFamily,
          fontSize: iconStyle.fontSize,
          fontStyle: iconStyle.fontStyle,
          fontVariant: iconStyle.fontVariant,
          fontWeight: iconStyle.fontWeight,
          lineHeight: iconStyle.lineHeight,
          textDecorationLine: iconStyle.textDecorationLine,
          verticalAlign: iconStyle.verticalAlign,
        },
        inputBox: rect(targets.input),
        submitBox: rect(button),
        submitStyle: {
          appearance: buttonStyle.appearance,
          backgroundColor: buttonStyle.backgroundColor,
          borderColor: buttonStyle.borderColor,
          borderStyle: buttonStyle.borderStyle,
          borderWidth: buttonStyle.borderWidth,
          boxShadow: buttonStyle.boxShadow,
          boxSizing: buttonStyle.boxSizing,
          color: buttonStyle.color,
          cursor: buttonStyle.cursor,
          display: buttonStyle.display,
          fontFamily: buttonStyle.fontFamily,
          fontSize: buttonStyle.fontSize,
          fontWeight: buttonStyle.fontWeight,
          lineHeight: buttonStyle.lineHeight,
          margin: buttonStyle.margin,
          minHeight: buttonStyle.minHeight,
          outlineStyle: buttonStyle.outlineStyle,
          outlineWidth: buttonStyle.outlineWidth,
          padding: buttonStyle.padding,
          textAlign: buttonStyle.textAlign,
          verticalAlign: buttonStyle.verticalAlign,
        },
      };
    },
    {
      box: await box.elementHandle(),
      icon: await icon.elementHandle(),
      input: await input.elementHandle(),
    },
  );
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
