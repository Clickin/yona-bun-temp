import { createHash } from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ITEM = '[data-stylex-owner="global-gnb-feedback-item"]';
const LINK = '[data-stylex-owner="global-gnb-feedback-link"]';
const FEEDBACK_URL = "https://github.com/yona-projects/yona/issues";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("Feedback source has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/theme.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const restricted = readFileSync("src/routes/restricted.tsx", "utf8");
  const start = route.indexOf("const globalGnbFeedbackStyles");
  const end = route.indexOf("const globalGnbProjectListDividerStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbBrandHeight",
    "globalGnbBrandPaddingInline",
    "globalGnbBrandTransitionDuration",
    "globalGnbNavItemFloat",
    "globalGnbNavItemPosition",
    "globalGnbFeedbackLinkDisplay",
    "globalGnbFeedbackLinkFloat",
    "globalGnbFeedbackTextDecoration",
    "globalGnbFeedbackTransitionProperty",
    "textMuted",
    "textOnAccent",
  ]) {
    expect(styles).toContain(`globalColors.${token}`);
    expect(theme).toContain(`${token}:`);
  }
  expect(styles).not.toMatch(
    /#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b-?\d+(?:\.\d+)?(?:px|s|%)\b|!important/iu,
  );

  const itemMarker = route.indexOf('data-stylex-owner="global-gnb-feedback-item"');
  const linkMarker = route.indexOf('data-stylex-owner="global-gnb-feedback-link"');
  const item = route.slice(
    route.lastIndexOf("<li", itemMarker),
    route.indexOf("</li>", itemMarker),
  );
  const link = route.slice(
    route.lastIndexOf("<Link", linkMarker),
    route.indexOf("</Link>", linkMarker),
  );
  expect(itemMarker).toBeGreaterThanOrEqual(0);
  expect(linkMarker).toBeGreaterThanOrEqual(0);
  expect(item).toContain("globalGnbFeedbackStyles.item");
  expect(link).toContain("globalGnbFeedbackStyles.link");
  expect(link).toContain("href={feedbackUrl}");
  expect(link).toContain("to={feedbackUrl}");
  expect(link).toContain('target="_blank"');
  expect(item).not.toContain("className");

  for (const selector of [".gnb-nav > li,", ".gnb-nav a,", ".gnb-nav a {", ".gnb-nav a:hover,"]) {
    expect(appCss).toContain(selector);
  }
  expect(restricted).toContain('className="gnb-nav"');
  expect(appCss).not.toMatch(/feedback/iu);
});

test("frozen GNB Feedback sources stay byte-identical", () => {
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
  test(`Feedback preserves ${state.label} legacy paint and geometry`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const item = page.locator(ITEM);
    const link = page.locator(LINK);
    await expect(item).toBeVisible();
    await expect(link).toHaveText("Yoram repository");
    await expect(link).toHaveAttribute("href", FEEDBACK_URL);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(item.locator("xpath=preceding-sibling::*[1]")).toHaveAttribute(
      "data-stylex-owner",
      "global-gnb-project-list-divider",
    );
    await expect(item.locator("xpath=following-sibling::*[1]/form")).toHaveClass(
      /(?:^|\s)gnb-search-form(?:\s|$)/u,
    );

    const evidence = await readEvidence(item, link);
    expect(evidence.item).toEqual({ float: "left", position: "relative" });
    expect(evidence.link).toEqual({
      color: "rgb(162, 162, 162)",
      display: "inline",
      float: "none",
      lineHeight: "40px",
      padding: "10px",
      position: "static",
      textDecoration: "none",
      transition: "color 0.15s",
    });
    expect(evidence.box).toEqual({ height: 37, width: 130.046875 });
    expect(evidence.overflow).toBe(false);
    await saveScreenshot(
      link,
      `stylex-global-gnb-feedback-${state.label.replaceAll(" ", "-")}.png`,
    );

    await link.hover();
    await page.waitForTimeout(200);
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(state.width - 1, state.height - 1);
    await link.focus();
    await page.waitForTimeout(200);
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
  });
}

test("Feedback keeps conditional visibility and external navigation contract", async ({ page }) => {
  await installRuntime(page, { feedbackUrl: "  " });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(ITEM)).toHaveCount(0);

  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);
  const link = page.locator(LINK);
  await expect(link).toHaveAttribute("href", FEEDBACK_URL);
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).not.toHaveAttribute("data-status");
  await expect(link).not.toHaveAttribute("aria-current");
});

test("Feedback paint is independent from generic legacy GNB selectors", async ({ page }) => {
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/projects`);
  const isolated = await page.locator(ITEM).evaluate((item) => {
    item.parentElement!.classList.remove("gnb-nav");
    const link = item.querySelector("a")!;
    const snapshot = () => ({
      itemFloat: getComputedStyle(item).cssFloat,
      itemPosition: getComputedStyle(item).position,
      linkColor: getComputedStyle(link).color,
      linkDisplay: getComputedStyle(link).display,
      linkLineHeight: getComputedStyle(link).lineHeight,
      linkPadding: getComputedStyle(link).padding,
    });
    const owned = snapshot();
    item.className = "";
    link.className = "";
    return { owned, stripped: snapshot() };
  });
  expect(isolated.owned).toEqual({
    itemFloat: "left",
    itemPosition: "relative",
    linkColor: "rgb(162, 162, 162)",
    linkDisplay: "inline",
    linkLineHeight: "40px",
    linkPadding: "10px",
  });
  expect(isolated.stripped).toEqual({
    itemFloat: "none",
    itemPosition: "static",
    linkColor: "rgb(120, 139, 167)",
    linkDisplay: "inline",
    linkLineHeight: "20px",
    linkPadding: "0px",
  });
});

async function installRuntime(page: Page, options: { feedbackUrl?: string } = {}) {
  await page.addInitScript(
    ({ basePath, feedbackUrl }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", "false");
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl,
        hideProjectListing: false,
        supportedLanguages: ["en-US"],
      };
    },
    { basePath: BASE_PATH, feedbackUrl: options.feedbackUrl ?? FEEDBACK_URL },
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
        isGuest: false,
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
      json: { profile: { isGuest: false, loginId: "admin" } },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({ contentType: "application/json", json: { items: [] } }),
  );
}

async function readEvidence(item: Locator, link: Locator) {
  return item.evaluate(
    (element, linkElement) => {
      const itemStyle = getComputedStyle(element);
      const linkStyle = getComputedStyle(linkElement as Element);
      const box = (linkElement as Element).getBoundingClientRect();
      return {
        box: { height: box.height, width: box.width },
        item: { float: itemStyle.cssFloat, position: itemStyle.position },
        link: {
          color: linkStyle.color,
          display: linkStyle.display,
          float: linkStyle.cssFloat,
          lineHeight: linkStyle.lineHeight,
          padding: linkStyle.padding,
          position: linkStyle.position,
          textDecoration: linkStyle.textDecorationLine,
          transition: linkStyle.transition,
        },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    },
    await link.elementHandle(),
  );
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
