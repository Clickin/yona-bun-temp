import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const DIVIDER = '[data-stylex-owner="global-gnb-project-list-divider"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("List All divider source has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const start = route.indexOf("const globalGnbProjectListDividerStyles");
  const end = route.indexOf("const globalGnbProjectListStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbBrandHeight",
    "globalGnbProjectListDividerFontSize",
    "globalGnbProjectListDividerOpacity",
    "textMuted",
    "transparent",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles).toContain("content: '\"|\"'");
  expect(styles).toContain('float: "left"');
  expect(styles).toContain('position: "relative"');
  expect(styles).not.toContain('width: "auto"');
  expect(styles).not.toContain('height: "auto"');
  expect(styles).not.toContain('backgroundColor: "transparent"');
  expect(styles).not.toContain('backgroundImage: "none"');
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);

  const marker = route.indexOf('data-stylex-owner="global-gnb-project-list-divider"');
  const owner = route.slice(route.lastIndexOf("<li", marker), route.indexOf("/>", marker));
  expect(marker).toBeGreaterThanOrEqual(0);
  expect(owner).toContain("globalGnbProjectListDividerStyles.root");
  expect(owner).not.toContain("className");

  expect(appCss).not.toContain(".gnb-nav .divider");
  expect(appCss).toContain(".gnb-usermenu .divider");
  expect(appCss).toContain(".gnb-nav > li {");
});

test("frozen GNB divider sources stay byte-identical", () => {
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
      "../yona-original/public/bootstrap/css/bootstrap-responsive.css",
      "a0baa7fb81cfe06b3bfe4489cb15c998ad3afc7cf7eb77e36f356278d247f440",
    ],
  ]);

  for (const [path, expected] of hashes) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(expected);
  }
});

for (const state of [
  { height: 900, label: "desktop home", path: "/", width: 1366 },
  { height: 844, label: "mobile home", path: "/", width: 390 },
  { height: 900, label: "desktop projects", path: "/projects", width: 1366 },
  { height: 844, label: "mobile projects", path: "/projects", width: 390 },
  { height: 900, label: "desktop organizations", path: "/orgs", width: 1366 },
  { height: 844, label: "mobile organizations", path: "/orgs", width: 390 },
]) {
  test(`List All divider preserves ${state.label} legacy paint and geometry`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const divider = page.locator(DIVIDER);
    await expect(divider).toBeVisible();
    await expect(divider).toHaveText("");
    await expect(divider).not.toHaveClass(/(?:^|\s)divider(?:\s|$)/u);
    await expect(divider.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
      "data-stylex-owner",
      "global-gnb-project-list-item",
    );
    await expect(divider.locator("xpath=following-sibling::*[1]/a")).toHaveAttribute(
      "href",
      "https://github.com/yona-projects/yona/issues",
    );

    const evidence = await readEvidence(divider);
    expect(evidence.box).toEqual({ height: 40, width: 3.109375 });
    expect(evidence.style).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      backgroundImage: "none",
      color: "rgb(162, 162, 162)",
      display: "list-item",
      float: "left",
      fontSize: "12px",
      height: "40px",
      lineHeight: "40px",
      margin: "0px",
      opacity: "1",
      padding: "0px",
      position: "relative",
      width: "3.10938px",
    });
    expect(evidence.after).toEqual({
      color: "rgb(162, 162, 162)",
      content: '"|"',
      display: "inline",
      fontSize: "12px",
      lineHeight: "40px",
      opacity: "0.35",
    });
    expect(evidence.overflow).toBe(false);
    await saveScreenshot(
      divider,
      `stylex-global-gnb-project-list-divider-${state.label.replaceAll(" ", "-")}.png`,
    );
  });
}

test("List All divider keeps conditional visibility", async ({ page }) => {
  await installRuntime(page, { isGuest: true });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(DIVIDER)).toHaveCount(0);

  await installRuntime(page, { hideProjectListing: true });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(DIVIDER)).toHaveCount(0);
});

test("List All divider paint is independent from generic legacy GNB selectors", async ({
  page,
}) => {
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/projects`);
  const evidence = await page.locator(DIVIDER).evaluate((divider) => {
    divider.parentElement!.classList.remove("gnb-nav");
    const owned = snapshot(divider);
    divider.className = "";
    return { owned, stripped: snapshot(divider) };

    function snapshot(element: Element) {
      const style = getComputedStyle(element);
      const after = getComputedStyle(element, "::after");
      return {
        afterColor: after.color,
        afterContent: after.content,
        afterOpacity: after.opacity,
        backgroundColor: style.backgroundColor,
        float: style.cssFloat,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        position: style.position,
      };
    }
  });

  expect(evidence.owned).toEqual({
    afterColor: "rgb(162, 162, 162)",
    afterContent: '"|"',
    afterOpacity: "0.35",
    backgroundColor: "rgba(0, 0, 0, 0)",
    float: "left",
    fontSize: "12px",
    lineHeight: "40px",
    position: "relative",
  });
  expect(evidence.stripped.afterContent).toBe("none");
  expect(evidence.stripped.float).toBe("none");
  expect(evidence.stripped.position).toBe("static");
});

async function installRuntime(
  page: Page,
  options: { hideProjectListing?: boolean; isGuest?: boolean } = {},
) {
  await page.addInitScript(
    ({ basePath, hideProjectListing }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", "false");
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl: "https://github.com/yona-projects/yona/issues",
        hideProjectListing,
        supportedLanguages: ["en-US"],
      };
    },
    { basePath: BASE_PATH, hideProjectListing: options.hideProjectListing ?? false },
  );
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: options.isGuest ?? false,
        isSiteAdmin: false,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/projects**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/organizations**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
  await page.route("**/api/v1/workspace/overview**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { profile: { isGuest: options.isGuest ?? false, loginId: "admin" } },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}

async function readEvidence(divider: Locator) {
  return divider.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const after = getComputedStyle(element, "::after");
    return {
      after: {
        color: after.color,
        content: after.content,
        display: after.display,
        fontSize: after.fontSize,
        lineHeight: after.lineHeight,
        opacity: after.opacity,
      },
      box: { height: rect.height, width: rect.width },
      overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      style: {
        backgroundColor: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        color: style.color,
        display: style.display,
        float: style.cssFloat,
        fontSize: style.fontSize,
        height: style.height,
        lineHeight: style.lineHeight,
        margin: style.margin,
        opacity: style.opacity,
        padding: style.padding,
        position: style.position,
        width: style.width,
      },
    };
  });
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
