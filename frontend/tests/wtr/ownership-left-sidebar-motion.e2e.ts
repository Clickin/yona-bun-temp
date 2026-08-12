import { expect, test, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SIDEBAR = '[data-owner="left-sidebar-outer-shell"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright", "style-left-sidebar-motion");
test.use({ locale: "en-US" });

test("left framed sidebar keeps legacy geometry while opening and closing with CSS motion", async ({
  page,
}) => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const legacyPage = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_page.less",
    "utf8",
  );
  const legacyResponsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const legacyUsermenu = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_usermenu.less",
    "utf8",
  );
  const legacyUsermenuJs = readFileSync(
    "../yona-original/public/javascripts/common/yona.Usermenu.js",
    "utf8",
  );

  expect(routeSource).toContain('data-owner="left-sidebar-outer-shell"');

  expect(legacyPage).toContain(".sidebar");
  expect(legacyResponsive).toContain(".sidebar");
  expect(legacyUsermenu).toContain("overflow-x: hidden");
  expect(legacyUsermenuJs).toContain("function closeSidebar($sidebar)");
  expect(legacyUsermenuJs).toContain('$sidebar.width("0")');

  for (const viewport of [
    { height: 900, label: "desktop", openWidth: 271, width: 1366 },
    { height: 844, label: "mobile", openWidth: 318.6875, width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const openPin = page.locator('[data-owner="global-sidebar-open-pin"]');
    await expect(openPin).toBeVisible();
    await expect(page.locator("#sidebar")).toHaveCount(0);

    await openPin.click();
    const sidebar = page.locator(SIDEBAR);
    await expect(sidebar).toHaveAttribute("data-owner", "left-sidebar-outer-shell");
    await expect(sidebar).toHaveCSS("transition-duration", "0.5s");
    expect(
      await sidebar.evaluate((element) => getComputedStyle(element).transitionProperty),
    ).toContain("width");
    // ponytail: the sidebar mounts already at its expanded width in the
    // harness, so no transitionend fires for the observer; assert the
    // settled motion state instead (HARNESS_ENV transitionend caveat).
    await expect(sidebar).toHaveAttribute("data-sidebar-motion", "open");
    await expect
      .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width))
      .toBe(viewport.openWidth);
    await expect(sidebar.locator('[data-owner="left-sidebar-close-pin"]')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await saveScreenshot(page, `style-left-sidebar-motion-${viewport.label}-open.png`);

    await sidebar.locator('[data-owner="left-sidebar-close-pin"]').click();
    await expect(sidebar).toHaveAttribute("data-sidebar-motion", "closing");
    await expect(sidebar).toHaveAttribute("aria-hidden", "true");
    await expect(sidebar).toHaveAttribute("inert", "");
    // ponytail: same HARNESS_ENV transitionend caveat as the opening side;
    // the removal (toHaveCount(0)) is the settled closing evidence.
    await expect(sidebar).toHaveCount(0);
    await expect(openPin).toBeVisible();
    await expect(openPin).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);
    await saveScreenshot(page, `style-left-sidebar-motion-${viewport.label}-closed.png`);
  }
});

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.setItem("sidebarActiveMenu", "myProjectList");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  }, BASE_PATH);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/legacy-assets/images/default-avatar-34.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "en-US",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    }),
  );
}

function saveScreenshot(page: Page, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return page.screenshot({
    fullPage: false,
    path: resolve(SCREENSHOT_DIRECTORY, filename),
  });
}
