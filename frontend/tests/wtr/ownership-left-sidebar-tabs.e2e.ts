import {
  expect,
  test,
  type Locator,
  type Page,
  readFileSync,
  mergedLegacyBlock,
} from "../wtr-compat.ts";
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (a recorded shim gap); resolve only builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test("framed left sidebar tabs have complete global-theme Style ownership", () => {
  const routeSource = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const themeSource = readFileSync("src/app.css", "utf8");
  expect(routeSource).toContain('data-owner="left-sidebar-tabs"');
});

for (const scenario of [
  {
    height: 900,
    labels: ["Favorite", "Project", "Recent History"],
    language: "en-US",
    navHeight: 61,
    tabTops: [44, 44, 44, 78],
    tabWidths: [74.1875, 68.390625, 118.046875, 19],
    width: 1366,
  },
  {
    height: 844,
    labels: ["Favorite", "Project", "Recent History"],
    language: "en-US",
    navHeight: 34,
    tabTops: [44, 44, 44, 44],
    tabWidths: [64.1875, 58.390625, 108.046875, 19],
    width: 390,
  },
  {
    height: 900,
    labels: ["즐겨찾기", "프로젝트", "최근 읽은 이슈"],
    language: "ko-KR",
    navHeight: 34,
    tabTops: [44, 44, 44, 44],
    width: 1366,
  },
] as const) {
  test(`framed left sidebar tabs preserve ${scenario.language} ${scenario.width}px legacy parity`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: scenario.height, width: scenario.width });
    const workspace = await installAuthenticatedHome(page, scenario.language);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const tabs = page.locator('[data-owner="left-sidebar-tabs"]');
    const buttons = tabs.locator(":scope > li > button");
    const favorite = tabs.getByRole("button", { exact: true, name: scenario.labels[0] });
    const project = tabs.getByRole("button", { exact: true, name: scenario.labels[1] });
    const refresh = tabs.getByRole("button", { name: "Refresh" });
    await expect(tabs).toBeVisible();
    await expect(buttons).toHaveCount(4);
    await expect(buttons.nth(0)).toHaveText(scenario.labels[0]);
    await expect(buttons.nth(1)).toHaveText(scenario.labels[1]);
    await expect(buttons.nth(2)).toHaveText(scenario.labels[2]);
    await expect(refresh.locator(".yobicon-refresh")).toHaveCount(1);
    await expect(
      tabs.locator(
        ".nav, .nav-tabs, .nm, .active, .myOrganizationList, .myProjectList, .myRecentIssueList, .btn-transparent, .refresh-button",
      ),
    ).toHaveCount(0);

    const evidence = await readEvidence(tabs);
    expect(evidence.geometry.nav).toEqual({ height: scenario.navHeight, top: 44, width: 270 });
    expect(evidence.geometry.tabTops).toEqual(scenario.tabTops);
    if (scenario.tabWidths) {
      expect(evidence.geometry.tabWidths).toEqual(scenario.tabWidths);
    } else {
      expect(
        evidence.geometry.tabWidths.reduce((sum, width) => sum + width, 0),
      ).toBeLessThanOrEqual(270);
    }
    expect(evidence.styles).toEqual({
      active: {
        backgroundColor: "rgb(0, 0, 0)",
        color: "rgb(243, 108, 34)",
        cursor: "default",
      },
      button: {
        backgroundColor: "rgba(0, 0, 0, 0)",
        borderRadius: "4px 4px 0px 0px",
        borderStyle: "none",
        boxShadow: "none",
        color: "rgb(211, 211, 211)",
        cursor: "pointer",
        display: "block",
        fontWeight: "700",
        lineHeight: "20px",
        marginRight: "2px",
        padding: scenario.width <= 720 ? "8px 5px" : "8px 10px",
      },
      item: { cssFloat: "left", marginBottom: "-2px" },
      nav: {
        borderBottomStyle: "none",
        listStyleType: "none",
        margin: "0px",
        padding: "0px",
        width: "270px",
      },
      refresh: {
        boxSizing: "border-box",
        height: "29px",
        lineHeight: "13px",
        padding: "12px 0px 0px 6px",
        width: "19px",
      },
    });

    await project.hover();
    expect(await readColors(project)).toEqual({
      backgroundColor: "rgb(0, 0, 0)",
      color: "rgb(243, 108, 34)",
    });
    await project.click();
    await expect(project).toHaveAttribute("aria-pressed", "true");
    await expect(favorite).toHaveAttribute("aria-pressed", "false");
    expect(await page.evaluate(() => localStorage.getItem("sidebarActiveMenu"))).toBe(
      "myProjectList",
    );

    const requestCount = workspace.requestCount;
    await refresh.hover();
    expect((await readColors(refresh)).color).toBe("rgb(3, 169, 244)");
    await refresh.click();
    await expect.poll(() => workspace.requestCount).toBeGreaterThan(requestCount);

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await page.screenshot({
      path: resolve(
        SCREENSHOT_DIRECTORY,
        `style-left-sidebar-tabs-local-${scenario.language}-${scenario.width}-after.png`,
      ),
    });
  });
}

async function installAuthenticatedHome(page: Page, language: "en-US" | "ko-KR") {
  await page.addInitScript(
    ({ basePath, language }) => {
      localStorage.setItem("shallWeOpenLeftNavigation", "true");
      Object.defineProperty(navigator, "language", { configurable: true, value: language });
      Object.defineProperty(navigator, "languages", { configurable: true, value: [language] });
      (
        window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
      ).__YONA_RUNTIME_CONFIG__ = {
        basePath,
        feedbackUrl: "",
        hideProjectListing: false,
        supportedLanguages: [language],
      };
    },
    { basePath: BASE_PATH, language },
  );
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
  const workspace = { requestCount: 0 };
  await page.route("**/api/v1/workspace", (route) => {
    workspace.requestCount += 1;
    return route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [],
        favoriteProjects: [],
        memberProjects: [],
        organizations: [],
        ownProjects: [],
        profile: { loginId: "admin" },
        recentIssues: [],
        recentProjects: [],
        watchedProjects: [],
      },
    });
  });
  return workspace;
}

async function readColors(locator: Locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    return { backgroundColor: style.backgroundColor, color: style.color };
  });
}

async function readEvidence(tabs: Locator) {
  return tabs.evaluate((element) => {
    const items = Array.from(element.querySelectorAll<HTMLElement>(":scope > li"));
    const buttons = items.map((item) => item.querySelector<HTMLButtonElement>(":scope > button")!);
    const navStyle = getComputedStyle(element);
    const itemStyle = getComputedStyle(items[0]!);
    const buttonStyle = getComputedStyle(buttons[1]!);
    const activeStyle = getComputedStyle(buttons[0]!);
    const refreshStyle = getComputedStyle(buttons[3]!);
    const navBox = element.getBoundingClientRect();
    return {
      geometry: {
        nav: { height: navBox.height, top: navBox.top, width: navBox.width },
        tabTops: items.map((item) => item.getBoundingClientRect().top),
        tabWidths: items.map((item) => item.getBoundingClientRect().width),
      },
      styles: {
        active: {
          backgroundColor: activeStyle.backgroundColor,
          color: activeStyle.color,
          cursor: activeStyle.cursor,
        },
        button: {
          backgroundColor: buttonStyle.backgroundColor,
          borderRadius: buttonStyle.borderRadius,
          borderStyle: buttonStyle.borderStyle,
          boxShadow: buttonStyle.boxShadow,
          color: buttonStyle.color,
          cursor: buttonStyle.cursor,
          display: buttonStyle.display,
          fontWeight: buttonStyle.fontWeight,
          lineHeight: buttonStyle.lineHeight,
          marginRight: buttonStyle.marginRight,
          padding: buttonStyle.padding,
        },
        item: { cssFloat: itemStyle.cssFloat, marginBottom: itemStyle.marginBottom },
        nav: {
          borderBottomStyle: navStyle.borderBottomStyle,
          listStyleType: navStyle.listStyleType,
          margin: navStyle.margin,
          padding: navStyle.padding,
          width: navStyle.width,
        },
        refresh: {
          boxSizing: refreshStyle.boxSizing,
          height: refreshStyle.height,
          lineHeight: refreshStyle.lineHeight,
          padding: refreshStyle.padding,
          width: refreshStyle.width,
        },
      },
    };
  });
}
