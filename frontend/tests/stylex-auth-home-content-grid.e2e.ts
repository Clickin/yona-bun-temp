import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page } from "@playwright/test";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const PAGE = '[data-stylex-owner="authenticated-home-content-page"]';
const GRID = '[data-stylex-owner="authenticated-home-content-grid"]';
const MAIN = '[data-stylex-owner="authenticated-home-main-stream"]';
const RAIL = '[data-stylex-owner="authenticated-home-index-rail"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");
const MAIN_WIDTH = 0.6595744680851064;
const RAIL_WIDTH = 0.3191489361702128;
const GUTTER_WIDTH = 0.02127659574468085;

test.use({ locale: "ko-KR" });

test("authenticated Home content grid has bounded global-theme StyleX ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/theme.stylex.ts", "utf8");
  const appCss = readFileSync("src/app.css", "utf8");
  const projectRoute = readFileSync("src/routes/$ownerName/$projectName.tsx", "utf8");
  const start = route.indexOf("const authenticatedHomeContentGridStyles");
  const end = route.indexOf("const siteFooterStyles", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  const styles = route.slice(start, end);

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
    expect(styles).toContain(`globalColors.${token}`);
    expect(theme).toContain(`${token}:`);
  }
  expect(styles).toContain("[globalBreakpoints.mobile]");
  expect(styles).not.toMatch(/#[\da-f]{3,8}\b|rgba?\(|hsla?\(|\b-?\d+(?:\.\d+)?(?:px|%)\b/iu);
  expect(styles).not.toMatch(/:\s*"(?:block|left|border-box|table|both)"/u);

  const pageMarkupStart = route.indexOf('data-stylex-owner="authenticated-home-content-page"');
  const railMarkupEnd = route.indexOf(
    "/>",
    route.indexOf(`data-stylex-owner="authenticated-home-index-rail"`),
  );
  const ownerMarkup = route.slice(route.lastIndexOf("<div", pageMarkupStart), railMarkupEnd);
  for (const owner of [
    "authenticated-home-content-page",
    "authenticated-home-content-grid",
    "authenticated-home-main-stream",
    "authenticated-home-index-rail",
  ]) {
    expect(ownerMarkup).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const retired of [
    "page",
    "on-fold-intro",
    "row-fluid",
    "span8",
    "span4",
    "index-menu",
    "right-menu",
    "span-hard-wrap",
  ]) {
    expect(ownerMarkup).not.toMatch(new RegExp(`className=[^\\n]*\\b${retired}\\b`, "u"));
  }
  expect(ownerMarkup).toContain("className={`content-container ");
  expect(ownerMarkup).toContain("className={`main-stream ");

  expect(appCss).toContain(".content-container .main-stream {");
  expect(appCss).toContain(".content-container .main-stream .activity-streams {");
  expect(appCss).not.toContain(".content-container .main-stream .activity-streams .warning-none {");
  expect(appCss).not.toContain("  .main-stream,\n  .content-container .main-stream {");
  expect(projectRoute).toContain('className="main-stream" style={{ width: "100%" }}');
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
      await expect(locator).not.toHaveClass(retired);
    }
    await expect(
      main.locator(':scope > [data-stylex-owner="authenticated-home-series-tabs"]'),
    ).toHaveCount(1);
    await expect(
      main.locator(':scope > [data-stylex-owner="authenticated-home-notification-list"]'),
    ).toHaveCount(1);
    await expect(grid.locator(`:scope > ${MAIN} + ${RAIL}`)).toHaveCount(1);

    const evidence = await grid.evaluate((gridElement) => {
      const pageElement = gridElement.parentElement as HTMLElement;
      const mainElement = gridElement.firstElementChild as HTMLElement;
      const railElement = gridElement.lastElementChild as HTMLElement;
      const navElement = mainElement.querySelector(
        '[data-stylex-owner="authenticated-home-series-tabs"]',
      ) as HTMLElement;
      const activityElement = mainElement.querySelector(".activity-streams") as HTMLElement;
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
    const pageInset = mobile ? 0 : 10;
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
    await pageOwner.screenshot({
      path: resolve(SCREENSHOT_DIRECTORY, `stylex-auth-home-content-grid-${viewport.label}.png`),
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
