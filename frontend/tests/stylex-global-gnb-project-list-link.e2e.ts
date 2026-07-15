import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Locator, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const ITEM = '[data-stylex-owner="global-gnb-project-list-item"]';
const LINK = '[data-stylex-owner="global-gnb-project-list-link"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("List All source has complete global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/routes/-home-route-screen.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const restricted = readFileSync("src/routes/restricted.tsx", "utf8");
  const start = route.indexOf("const globalGnbProjectListStyles");
  const end = route.indexOf("const globalGnbBrandLinkStyles", start);

  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);
  for (const token of [
    "globalGnbBrandHeight",
    "globalGnbBrandPaddingInline",
    "globalGnbBrandTransitionDuration",
    "globalGnbProjectListTriangleBottom",
    "globalGnbProjectListTriangleOffset",
    "globalGnbProjectListTrianglePosition",
    "globalGnbProjectListTriangleSize",
    "textMuted",
    "textOnAccent",
  ]) {
    if (theme.includes(`${token}:`)) {
      expect(styles).toContain(`homeColors.${token}`);
    } else {
      expect(styles).not.toContain(`globalColors.${token}`);
      expect(theme).not.toContain(`${token}:`);
    }
  }
  expect(styles.replaceAll("0px", "zero")).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(/iu);

  const itemMarker = route.indexOf('data-stylex-owner="global-gnb-project-list-item"');
  const linkMarker = route.indexOf('data-stylex-owner="global-gnb-project-list-link"');
  const itemOwner = route.slice(
    route.lastIndexOf("<li", itemMarker),
    route.indexOf("</li>", itemMarker),
  );
  const linkOwner = route.slice(
    route.lastIndexOf("<Link", linkMarker),
    route.indexOf("</Link>", linkMarker),
  );
  expect(itemOwner).not.toContain('className={activeMenu === "projects" ? "active"');
  expect(linkOwner).not.toContain("show-progress-bar");
  expect(linkOwner).toContain('to="/projects"');
  expect(linkOwner).toContain("globalGnbProjectListStyles.link");
  expect(route).toContain('activeMenu === "projects" && globalGnbProjectListStyles.activeItem');

  for (const selector of [".gnb-nav > li,", ".gnb-nav a,", ".gnb-nav a {", ".gnb-nav a:hover,"]) {
    expect(appCss).toContain(selector);
  }
  expect(restricted).toContain('className="gnb-nav"');
});

for (const state of [
  { height: 900, label: "desktop home", path: "/", width: 1366 },
  { height: 844, label: "mobile home", path: "/", width: 390 },
  { height: 900, label: "desktop projects", path: "/projects", width: 1366 },
  { height: 844, label: "mobile projects", path: "/projects", width: 390 },
]) {
  test(`List All preserves ${state.label} legacy paint and geometry`, async ({ page }) => {
    await page.setViewportSize(state);
    await installRuntime(page);
    await page.goto(`${BASE_PATH}${state.path}`);
    await page.evaluate(() => document.fonts.ready);

    const item = page.locator(ITEM);
    const link = page.locator(LINK);
    const active = state.path === "/projects";
    await expect(item).toBeVisible();
    await expect(link).toHaveText("List All");
    await expect(link).toHaveAttribute("href", `${BASE_PATH}/projects`);
    await expect(item).not.toHaveClass(/(?:^|\s)active(?:\s|$)/u);
    await expect(link).not.toHaveClass(/(?:^|\s)show-progress-bar(?:\s|$)/u);
    await expect(link).not.toHaveAttribute("aria-current");
    await expect(link).not.toHaveAttribute("data-status");

    const evidence = await readEvidence(item, link);
    expect(evidence.item).toEqual({ float: "left", position: "relative" });
    expect(evidence.link).toEqual({
      color: active ? "rgb(255, 255, 255)" : "rgb(162, 162, 162)",
      display: "inline",
      float: "none",
      height: "auto",
      lineHeight: "40px",
      padding: "10px",
      textDecoration: "none",
      transition: "color 0.15s",
      width: "auto",
    });
    expect(evidence.box.height).toBe(37);
    expect(evidence.box.width).toBeCloseTo(63.02, 1);
    expect(evidence.before).toEqual(
      active
        ? {
            borderBottomColor: "rgb(255, 255, 255)",
            borderBottomStyle: "solid",
            borderBottomWidth: "8px",
            bottom: "-5px",
            content: '" "',
            height: "0px",
            left: "31.5px",
            marginLeft: "-8px",
            overflow: "hidden",
            position: "absolute",
            width: "0px",
          }
        : {
            borderBottomColor: "rgb(162, 162, 162)",
            borderBottomStyle: "none",
            borderBottomWidth: "0px",
            bottom: "auto",
            content: "none",
            height: "auto",
            left: "auto",
            marginLeft: "0px",
            overflow: "visible",
            position: "static",
            width: "auto",
          },
    );
    expect(evidence.overflow).toBe(false);
    await saveScreenshot(
      item,
      `stylex-global-gnb-project-list-${state.label.replaceAll(" ", "-")}.png`,
    );

    await link.hover();
    await page.waitForTimeout(200);
    await expect(link).toHaveCSS("color", "rgb(255, 255, 255)");
    await page.mouse.move(state.width - 1, state.height - 1);
    await link.focus();
    await page.waitForTimeout(200);
    await expect(link).toHaveCSS("color", active ? "rgb(255, 255, 255)" : "rgb(162, 162, 162)");
  });
}

test("organizations directory keeps the shared PROJECTS active state", async ({ page }) => {
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/orgs`);
  await expect(page.locator(LINK)).toHaveText("List All");
  await expect(page.locator(ITEM)).not.toHaveClass(/(?:^|\s)active(?:\s|$)/u);
  await expect(page.locator(LINK)).toHaveCSS("color", "rgb(255, 255, 255)");
  expect((await readEvidence(page.locator(ITEM), page.locator(LINK))).before.content).toBe('" "');
});

test("List All keeps conditional visibility and SPA navigation", async ({ page }) => {
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);
  await page.evaluate(() => {
    (window as Window & { __gnbProjectListSentinel?: string }).__gnbProjectListSentinel = "alive";
  });
  await page.locator(LINK).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe(`${BASE_PATH}/projects`);
  expect(
    await page.evaluate(
      () => (window as Window & { __gnbProjectListSentinel?: string }).__gnbProjectListSentinel,
    ),
  ).toBe("alive");

  await installRuntime(page, { isGuest: true });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(LINK)).toHaveCount(0);
  await installRuntime(page, { hideProjectListing: true });
  await page.goto(`${BASE_PATH}/`);
  await expect(page.locator(LINK)).toHaveCount(0);
});

test("List All paint is independent from the generic legacy GNB selectors", async ({ page }) => {
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/projects`);
  const isolated = await page.locator(ITEM).evaluate((item) => {
    const nav = item.parentElement!;
    nav.classList.remove("gnb-nav");
    const link = item.querySelector("a")!;
    const owned = {
      color: getComputedStyle(link).color,
      content: getComputedStyle(item, "::before").content,
      padding: getComputedStyle(link).padding,
    };
    item.className = "";
    link.className = "";
    return {
      owned,
      stripped: {
        color: getComputedStyle(link).color,
        content: getComputedStyle(item, "::before").content,
        padding: getComputedStyle(link).padding,
      },
    };
  });
  expect(isolated.owned).toEqual({ color: "rgb(255, 255, 255)", content: '" "', padding: "10px" });
  expect(isolated.stripped).toEqual({
    color: "rgb(162, 162, 162)",
    content: "none",
    padding: "0px",
  });
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
        feedbackUrl: "",
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

async function readEvidence(item: Locator, link: Locator) {
  return item.evaluate(
    (element, linkElement) => {
      const itemStyle = getComputedStyle(element);
      const linkStyle = getComputedStyle(linkElement as Element);
      const before = getComputedStyle(element, "::before");
      const box = (linkElement as Element).getBoundingClientRect();
      return {
        before: {
          borderBottomColor: before.borderBottomColor,
          borderBottomStyle: before.borderBottomStyle,
          borderBottomWidth: before.borderBottomWidth,
          bottom: before.bottom,
          content: before.content,
          height: before.height,
          left: before.left,
          marginLeft: before.marginLeft,
          overflow: before.overflow,
          position: before.position,
          width: before.width,
        },
        box: { height: box.height, width: box.width },
        item: { float: itemStyle.cssFloat, position: itemStyle.position },
        link: {
          color: linkStyle.color,
          display: linkStyle.display,
          float: linkStyle.cssFloat,
          height: linkStyle.height,
          lineHeight: linkStyle.lineHeight,
          padding: linkStyle.padding,
          textDecoration: linkStyle.textDecorationLine,
          transition: linkStyle.transition,
          width: linkStyle.width,
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
