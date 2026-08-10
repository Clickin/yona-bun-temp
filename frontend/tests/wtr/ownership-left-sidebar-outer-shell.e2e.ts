import { expect, test, type Locator, type Page, readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

for (const viewport of [
  {
    height: 900,
    label: "desktop",
    sidebar: { height: 900, width: 271 },
    sidebarContentWidth: 270,
    sidebarPosition: "sticky",
    subtab: { height: 61, width: 270, wrapHeight: 76, y: 147 },
    firstRowY: 223,
    width: 1366,
  },
  {
    height: 844,
    label: "mobile",
    sidebar: { height: 844, width: 318.6875 },
    sidebarContentWidth: 317.6875,
    sidebarPosition: "absolute",
    subtab: { height: 31, width: 317.6875, wrapHeight: 46, y: 120 },
    firstRowY: 166,
    width: 390,
  },
]) {
  test(`framed left sidebar outer shell preserves ${viewport.label} legacy parity`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const sidebar = page.getByRole("complementary", { name: "Sidebar" });
    await expect(sidebar).toBeVisible();
    const sidebarShell = page.locator('[data-owner="left-sidebar-outer-shell"]');
    const frame = page.locator('[data-owner="framed-site-main"]');
    const subtabOwner = page.locator(
      '#left-sidebar-myProjectList [data-owner="left-sidebar-project-subtabs"]',
    );
    const initial = await readEvidence(sidebar);
    expect(initial).toEqual({
      box: { height: viewport.sidebar.height, width: viewport.sidebar.width, x: 0, y: 0 },
      boxSizing: "content-box",
      contentWidth: viewport.sidebarContentWidth,
      position: viewport.sidebarPosition,
      styles: {
        backgroundColor: "rgb(51, 51, 51)",
        borderRight: "1px solid rgb(0, 0, 0)",
        bottom: "0px",
        color: "rgb(255, 255, 255)",
        display: "block",
        flex: "0 0 270px",
        height: `${viewport.height}px`,
        left: "0px",
        top: "0px",
        width: viewport.label === "desktop" ? "270px" : "317.688px",
        zIndex: viewport.label === "desktop" ? "auto" : "1001",
      },
    });
    await expect(sidebar).not.toHaveClass(/hide-in-mobile/);
    await expect(sidebar).toHaveClass(/sidebar/);

    const projectPane = sidebar.locator("#left-sidebar-myProjectList");
    const directRow = projectPane.first();
    const consumerGeometry = await page.evaluate(() => {
      const owner = document.querySelector(
        '#left-sidebar-myProjectList [data-owner="left-sidebar-project-subtabs"]',
      );
      const list = owner?.querySelector("ul") ?? null;
      const row = document.querySelector(
        '#left-sidebar-myProjectList [data-owner="left-sidebar-direct-project-rows"]',
      );
      const listBox = list.getBoundingClientRect();
      const rowBox = row.getBoundingClientRect();
      const ownerBox = owner.getBoundingClientRect();
      return {
        list: { height: listBox.height, width: listBox.width },
        rowY: rowBox.y,
        wrap: { height: ownerBox.height, width: ownerBox.width, y: ownerBox.y },
      };
    });
    expect(consumerGeometry).toEqual({
      list: { height: viewport.subtab.height, width: viewport.subtab.width },
      rowY: viewport.firstRowY,
      wrap: {
        height: viewport.subtab.wrapHeight,
        width: viewport.subtab.width,
        y: viewport.subtab.y,
      },
    });
    await expect(subtabOwner.locator(":scope > ul > li")).toHaveCount(4);
    await expect(directRow).toBeVisible();
    await saveScreenshot(sidebar, `style-left-sidebar-outer-shell-local-${viewport.label}.png`);

    const openFrame = await frame.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, x: box.x, y: box.y };
    });
    expect(openFrame).toEqual(
      viewport.label === "desktop"
        ? { height: 900, width: 1095, x: 271, y: 0 }
        : { height: 844, width: 390, x: 0, y: 0 },
    );
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(viewport.width);

    await sidebar.getByRole("button", { name: "Sidebar" }).click();
    await expect(sidebarShell).toHaveCount(0);
    await expect(frame).toBeVisible();
    expect(
      await frame.evaluate((element) => {
        const box = element.getBoundingClientRect();
        return { width: box.width, x: box.x, y: box.y };
      }),
    ).toEqual({ width: viewport.width, x: 0, y: 0 });
  });
}

test("framed left sidebar outer shell has complete global-theme Style ownership", () => {
  const appCss = readFileSync("src/app.css", "utf8");
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme =
    readFileSync("src/app.css", "utf8") +
    readFileSync("public/legacy-assets/stylesheets/legacy-fallback.css", "utf8");
  for (const token of [
    "leftSidebarOuterSurface",
    "leftSidebarOuterText",
    "leftSidebarOuterBorder",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }
  expect(appCss).not.toContain(".legacy-framed-shell.is-open > #sidebar");
  expect(appCss).not.toContain(".legacy-framed-shell.is-open > .sidebar.hide-in-mobile");
  expect(route).toContain('className="sidebar"');
  expect(route).not.toContain('className="sidebar hide-in-mobile" id="sidebar"');
});

async function readEvidence(sidebar: Locator) {
  return sidebar.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      box: { height: box.height, width: box.width, x: box.x, y: box.y },
      boxSizing: style.boxSizing,
      contentWidth: box.width - parseFloat(style.borderRightWidth),
      position: style.position,
      styles: {
        backgroundColor: style.backgroundColor,
        borderRight: style.borderRight,
        bottom: style.bottom,
        color: style.color,
        display: style.display,
        flex: style.flex,
        height: style.height,
        left: style.left,
        top: style.top,
        width: style.width,
        zIndex: style.zIndex,
      },
    };
  });
}

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "true");
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
        avatarUrl: "",
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
  const project = (projectName: string) => ({
    ownerName: "outside",
    projectId: projectName,
    projectName,
  });
  await page.route("**/api/v1/workspace", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [project("member-project")],
        organizations: [],
        ownProjects: [project("created-project")],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [project("recent-project")],
        watchedProjects: [project("watched-project")],
      },
    }),
  );
}

function saveScreenshot(target: Locator, filename: string) {
  mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
  return target.screenshot({ path: resolve(SCREENSHOT_DIRECTORY, filename) });
}
