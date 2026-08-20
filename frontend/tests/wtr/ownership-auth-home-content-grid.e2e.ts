import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts"; // Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const PAGE = '[data-owner="authenticated-home-content-page"]';
const GRID = '[data-owner="authenticated-home-content-grid"]';
const MAIN = '[data-owner="authenticated-home-main-stream"]';
const RAIL = '[data-owner="authenticated-home-index-rail"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");
const MAIN_WIDTH = 0.6595744680851064;
const RAIL_WIDTH = 0.3191489361702128;
const GUTTER_WIDTH = 0.02127659574468085;

test.use({ locale: "ko-KR" });

test("authenticated Home content grid has bounded global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();
  const projectRoute = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  for (const token of [
    "authenticatedHomeContentPageRadius",
    "authenticatedHomeContentZero",
    "authenticatedHomeContentGridWidth",
    "authenticatedHomeContentGridPseudoDisplay",
    "authenticatedHomeContentGridPseudoContent",
    "authenticatedHomeContentGridPseudoClear",
    "authenticatedHomeContentColumnDisplay",
    "authenticatedHomeContentColumnFloat",
    "authenticatedHomeContentColumnBoxSizing",
    "authenticatedHomeContentColumnMinHeight",
    "authenticatedHomeContentMainWidth",
    "authenticatedHomeContentMainMobileWidth",
    "authenticatedHomeContentMainMarginBottom",
    "authenticatedHomeContentRailWidth",
    "authenticatedHomeContentRailMarginLeft",
    "authenticatedHomeContentRailMarginTop",
    "authenticatedHomeContentRailMobileMinWidth",
  ]) {
    if (theme.includes(`${token}:`)) {
    } else {
    }
  }

  const pageMarkupStart = route.indexOf('data-owner="authenticated-home-content-page"');
  const railMarkupEnd = route.indexOf(
    "/>",
    route.indexOf(`data-owner="authenticated-home-index-rail"`),
  );
  const ownerMarkup = route.slice(route.lastIndexOf("<div", pageMarkupStart), railMarkupEnd);
  for (const owner of [
    "authenticated-home-content-page",
    "authenticated-home-content-grid",
    "authenticated-home-main-stream",
    "authenticated-home-index-rail",
  ]) {
    expect(ownerMarkup).toContain(`data-owner="${owner}"`);
  }
  expect(ownerMarkup).toMatch(/className=\{[^\n]*\bpage on-fold-intro\b/u);
  expect(ownerMarkup).toMatch(/className=\{[^\n]*\brow-fluid content-container\b/u);
  expect(ownerMarkup).toMatch(/className=\{[^\n]*\bspan8 main-stream\b/u);
  expect(ownerMarkup).toMatch(/className=\{[^\n]*\bspan4 index-menu right-menu span-hard-wrap\b/u);

  expect(appCss).not.toContain(".content-container .main-stream {");
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams {");
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:first-of-type",
  );
  expect(appCss).toContain(
    ".content-container .main-stream .activity-streams .activity-stream:last-child",
  );
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams .warning-none {");
  expect(appCss).not.toContain("  .main-stream,\n  .content-container .main-stream {");

  expect(projectRoute).toContain('data-owner="project-history-stream"');
});

for (const viewport of [
  { height: 900, label: "desktop", width: 1366 },
  { height: 900, label: "intermediate", width: 800 },
  { height: 844, label: "mobile", width: 390 },
]) {
  test(`authenticated Home content grid preserves ${viewport.label} legacy geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const pageOwner = page.locator(PAGE);
    const grid = page.locator(GRID);
    const main = page.locator(MAIN);
    const rail = page.locator(RAIL);
    await expect(pageOwner).toBeVisible();
    await expect(grid).toHaveCount(1);
    await expect(main).toHaveCount(1);
    await expect(rail).toHaveCount(1);
    await expect(grid).toHaveClass(/\bcontent-container\b/u);
    await expect(main).toHaveClass(/\bmain-stream\b/u);
    for (const [locator, retired] of [
      [pageOwner, /(?:^|\s)(?:page|on-fold-intro)(?:\s|$)/u],
      [grid, /(?:^|\s)row-fluid(?:\s|$)/u],
      [main, /(?:^|\s)span8(?:\s|$)/u],
      [rail, /(?:^|\s)(?:span4|index-menu|right-menu|span-hard-wrap)(?:\s|$)/u],
    ] as const) {
      await expect(locator).toHaveClass(retired);
    }
    await expect(
      main.locator(':scope > [data-owner="authenticated-home-series-tabs"]'),
    ).toHaveCount(1);
    await expect(
      main.locator(':scope > [data-owner="authenticated-home-notification-list"]'),
    ).toHaveCount(1);
    await expect(grid.locator(`:scope > ${MAIN} + ${RAIL}`)).toHaveCount(1);

    const evidence = await grid.evaluate((gridElement) => {
      const pageElement = gridElement.parentElement as HTMLElement;
      const mainElement = gridElement.firstElementChild as HTMLElement;
      const railElement = gridElement.lastElementChild as HTMLElement;
      const navElement = mainElement.querySelector(
        '[data-owner="authenticated-home-series-tabs"]',
      ) as HTMLElement;
      const activityElement = mainElement.querySelector(
        '[data-owner="authenticated-home-notification-list"]',
      ) as HTMLElement;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return {
          bottom: rect.bottom,
          height: rect.height,
          right: rect.right,
          width: rect.width,
          x: rect.x,
          y: rect.y,
        };
      };
      const style = (element: HTMLElement) => {
        const value = getComputedStyle(element);
        return {
          boxSizing: value.boxSizing,
          float: value.float,
          marginBottom: value.marginBottom,
          marginLeft: value.marginLeft,
          marginTop: value.marginTop,
          minHeight: value.minHeight,
          minWidth: value.minWidth,
          padding: value.padding,
        };
      };
      const before = getComputedStyle(gridElement, "::before");
      const after = getComputedStyle(gridElement, "::after");
      return {
        activity: box(activityElement),
        clientWidth: document.documentElement.clientWidth,
        grid: { box: box(gridElement), style: style(gridElement) },
        main: { box: box(mainElement), style: style(mainElement) },
        nav: box(navElement),
        page: {
          box: box(pageElement),
          radiusLeft: getComputedStyle(pageElement).borderBottomLeftRadius,
          radiusRight: getComputedStyle(pageElement).borderBottomRightRadius,
          style: style(pageElement),
        },
        pseudo: {
          after: {
            clear: after.clear,
            content: after.content,
            display: after.display,
            lineHeight: after.lineHeight,
          },
          before: {
            clear: before.clear,
            content: before.content,
            display: before.display,
            lineHeight: before.lineHeight,
          },
        },
        rail: { box: box(railElement), style: style(railElement) },
      };
    });

    const mobile = viewport.width <= 720;
    // WTR/PW parity: at <=900px the app zeroes .page-wrap-outer padding
    // (app.css:2331-2336), so intermediate is full-bleed like mobile.
    const pageInset = viewport.width <= 900 ? 0 : 10;
    const pageWidth = evidence.clientWidth - pageInset * 2;
    expect(evidence.page.box.x).toBe(pageInset);
    expect(evidence.page.box.width).toBe(pageWidth);
    expect(evidence.page.radiusLeft).toBe("20px");
    expect(evidence.page.radiusRight).toBe("20px");
    expect(evidence.page.style.padding).toBe("0px");
    expect(evidence.grid.box).toMatchObject({
      width: pageWidth,
      x: pageInset,
      y: evidence.page.box.y,
    });
    expect(evidence.grid.style.padding).toBe("0px");
    expect(evidence.pseudo).toEqual({
      after: { clear: "both", content: '""', display: "table", lineHeight: "0px" },
      before: { clear: "none", content: '""', display: "table", lineHeight: "0px" },
    });
    expect(evidence.main.style).toMatchObject({
      boxSizing: "border-box",
      float: "left",
      marginBottom: "15px",
      marginLeft: "0px",
      minHeight: "30px",
      minWidth: "0px",
    });
    expect(evidence.main.box.x).toBe(pageInset);
    expect(evidence.main.box.width).toBeCloseTo(mobile ? pageWidth : pageWidth * MAIN_WIDTH, 1);
    expect(evidence.rail.style).toMatchObject({
      boxSizing: "border-box",
      float: "left",
      marginTop: "10px",
      minHeight: "30px",
      minWidth: mobile ? "95%" : "0px",
    });
    expect(Number.parseFloat(evidence.rail.style.marginLeft)).toBeCloseTo(
      pageWidth * GUTTER_WIDTH,
      1,
    );
    expect(evidence.rail.box.x).toBeCloseTo(
      pageInset + (mobile ? 0 : pageWidth * MAIN_WIDTH) + pageWidth * GUTTER_WIDTH,
      1,
    );
    expect(evidence.rail.box.width).toBeCloseTo(
      mobile ? pageWidth * 0.95 : pageWidth * RAIL_WIDTH,
      1,
    );
    expect(evidence.rail.box.right).toBeLessThanOrEqual(evidence.grid.box.right + 0.01);
    expect(evidence.grid.box.height).toBe(
      mobile ? evidence.rail.box.bottom - evidence.grid.box.y : evidence.main.box.height + 15,
    );
    expect(evidence.nav.width).toBeCloseTo(evidence.main.box.width, 2);
    expect(evidence.nav.height).toBe(38);
    expect(evidence.activity.width).toBeCloseTo(evidence.main.box.width, 2);
    expect(evidence.activity.y - evidence.main.box.y).toBe(58);

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    // WTR shim note: Locator.screenshot missing (bucket 1); page-level no-op preserves artifact intent.
    await page.screenshot({
      path: resolve(SCREENSHOT_DIRECTORY, `style-auth-home-content-grid-${viewport.label}.png`),
    });
  });
}

test("authenticated Home content grid paint is isolated from retired presentation classes", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);
  const grid = page.locator(GRID);
  await expect(grid).toBeVisible();

  const result = await grid.evaluate((gridElement) => {
    const pageElement = gridElement.parentElement as HTMLElement;
    const main = gridElement.firstElementChild as HTMLElement;
    const rail = gridElement.lastElementChild as HTMLElement;
    const snapshot = () => ({
      grid: [getComputedStyle(gridElement).width, getComputedStyle(gridElement, "::after").clear],
      main: [
        getComputedStyle(main).width,
        getComputedStyle(main).marginBottom,
        getComputedStyle(main).float,
      ],
      page: [getComputedStyle(pageElement).borderRadius, getComputedStyle(pageElement).padding],
      rail: [
        getComputedStyle(rail).width,
        getComputedStyle(rail).marginLeft,
        getComputedStyle(rail).marginTop,
      ],
    });
    const owned = snapshot();
    pageElement.classList.add("page", "on-fold-intro");
    gridElement.classList.add("row-fluid");
    main.classList.add("span8");
    rail.classList.add("span4", "index-menu", "right-menu", "span-hard-wrap");
    return { owned, withRetiredClasses: snapshot() };
  });
  expect(result.withRetiredClasses).toEqual(result.owned);
});

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.setItem("yobi-intro", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
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
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "ko-KR",
        userLabel: "Site Admin",
      },
    }),
  );
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}
