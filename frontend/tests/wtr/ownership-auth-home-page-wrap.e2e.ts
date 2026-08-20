import { readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts"; // Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

import { expect, test, type Page } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTER = '[data-owner="authenticated-home-page-wrap-outer"]';
const INNER = '[data-owner="authenticated-home-page-wrap"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("authenticated Home page-wrap has bounded global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();

  const outerMarker = route.indexOf(`data-owner="authenticated-home-page-wrap-outer"`);
  const innerMarker = route.indexOf(`data-owner="authenticated-home-page-wrap"`);
  const ownerMarkup = route.slice(
    route.lastIndexOf("<div", outerMarker),
    route.indexOf("<div", innerMarker + 10),
  );
  expect(outerMarker).toBeGreaterThanOrEqual(0);
  expect(innerMarker).toBeGreaterThan(outerMarker);
  expect(ownerMarkup).not.toContain('className="page-wrap-outer"');
  expect(route.slice(innerMarker - 150, innerMarker + 100)).not.toContain('className="page-wrap"');
  expect(appCss).toContain(".page-wrap-outer");
  expect(appCss).toContain(".page-wrap,");
});

for (const viewport of [
  { height: 900, innerInset: 10, label: "desktop", width: 1366 },
  // WTR/PW parity: at <=900px the app zeroes .page-wrap-outer padding
  // (app.css:2331-2336), so the intermediate wrap is full-bleed like mobile.
  { height: 900, innerInset: 0, label: "intermediate", width: 800 },
  { height: 844, innerInset: 0, label: "mobile", width: 600 },
]) {
  test(`authenticated Home page-wrap preserves ${viewport.label} legacy geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installAuthenticatedHome(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const outer = page.locator(OUTER);
    const inner = outer.locator(`:scope > ${INNER}`);
    await expect(outer).toBeVisible();
    await expect(inner).toHaveCount(1);
    // WTR/PW parity: the app deliberately retains the legacy class hooks
    // (route -home-route-screen.tsx:343) for the legacy-fallback CSS selectors
    // asserted in the ownership test; the paint-isolation test proves no
    // presentation dependence.
    await expect(outer).toHaveClass(/(?:^|\s)page-wrap-outer(?:\s|$)/u);
    await expect(inner).toHaveClass(/(?:^|\s)page-wrap(?:\s|$)/u);
    await expect(
      inner.locator(':scope > [data-owner="authenticated-home-intro-guide"]'),
    ).toContainText("Welcome to Yoram");
    await expect(
      inner.locator(
        ':scope > [data-owner="authenticated-home-intro-guide-toggle"] + [data-owner="authenticated-home-content-page"]',
      ),
    ).toHaveCount(1);

    const evidence = await outer.evaluate((outerElement) => {
      const innerElement = outerElement.firstElementChild as HTMLElement;
      const outerBox = outerElement.getBoundingClientRect();
      const innerBox = innerElement.getBoundingClientRect();
      const outerStyle = getComputedStyle(outerElement);
      const innerStyle = getComputedStyle(innerElement);
      return {
        inner: {
          backgroundColor: innerStyle.backgroundColor,
          boxSizing: innerStyle.boxSizing,
          margin: innerStyle.margin,
          width: innerBox.width,
          x: innerBox.x,
        },
        outer: {
          boxSizing: outerStyle.boxSizing,
          marginTop: outerStyle.marginTop,
          minHeight: outerStyle.minHeight,
          minWidth: outerStyle.minWidth,
          padding: outerStyle.padding,
          width: outerBox.width,
          x: outerBox.x,
        },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
      };
    });
    expect(evidence.outer).toEqual({
      boxSizing: "border-box",
      marginTop: "10px",
      minHeight: "450px",
      minWidth: viewport.width <= 900 ? "10px" : "0px",
      padding: viewport.width <= 900 ? "0px" : "0px 10px",
      width: viewport.width,
      x: 0,
    });
    expect(evidence.inner).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      boxSizing: "content-box",
      margin: "0px",
      width: viewport.width - viewport.innerInset * 2,
      x: viewport.innerInset,
    });
    expect(evidence.overflow).toBe(false);

    const intro = inner.locator(':scope > [data-owner="authenticated-home-intro-guide"]');
    const introToggle = inner.locator(
      ':scope > [data-owner="authenticated-home-intro-guide-toggle"] #toggleIntro',
    );
    await introToggle.click();
    await expect(intro).toBeHidden();
    await introToggle.click();
    await expect(intro).toBeVisible();

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    // WTR shim note: Locator.screenshot missing (bucket 1); page-level no-op preserves artifact intent.
    await page.screenshot({
      path: resolve(SCREENSHOT_DIRECTORY, `style-auth-home-page-wrap-${viewport.label}.png`),
    });
  });
}

test("authenticated Home page-wrap paint is isolated from legacy presentation classes", async ({
  page,
}) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installAuthenticatedHome(page);
  await page.goto(`${BASE_PATH}/`);

  const result = await page.locator(OUTER).evaluate((outer) => {
    const inner = outer.firstElementChild as HTMLElement;
    const snapshot = () => {
      const outerStyle = getComputedStyle(outer);
      const innerStyle = getComputedStyle(inner);
      return {
        inner: [innerStyle.backgroundColor, innerStyle.boxSizing, innerStyle.margin],
        outer: [
          outerStyle.boxSizing,
          outerStyle.marginTop,
          outerStyle.minHeight,
          outerStyle.minWidth,
          outerStyle.padding,
          outerStyle.width,
        ],
      };
    };
    const owned = snapshot();
    outer.classList.add("page-wrap-outer");
    inner.classList.add("page-wrap");
    return { owned, withLegacyClasses: snapshot() };
  });
  expect(result.withLegacyClasses).toEqual(result.owned);
});

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript((basePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.removeItem("yobi-intro");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
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
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}
