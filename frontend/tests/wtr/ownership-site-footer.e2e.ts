import { createHash, readFileSync, mergedLegacyBlock, curatedAppCss } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths
// (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OUTER = '[data-owner="site-footer"]';
const INNER = '[data-owner="site-footer-inner"]';
const PROVIDER = '[data-owner="site-footer-provider"]';
const SCREENSHOT_DIRECTORY = resolve("..", "output", "playwright");

test.use({ locale: "en-US" });

test("SiteLayout footer has complete global-theme Style ownership", () => {
  const route = readFileSync("src/routes/-home-route-screen.tsx", "utf8");
  const theme = readFileSync("src/app.css", "utf8");
  const appCss = curatedAppCss();
  const outerMarker = route.indexOf('data-owner="site-footer"');
  const innerMarker = route.indexOf('data-owner="site-footer-inner"');
  const providerMarker = route.indexOf('data-owner="site-footer-provider"');
  expect(outerMarker).toBeGreaterThanOrEqual(0);
  expect(innerMarker).toBeGreaterThan(outerMarker);
  expect(providerMarker).toBeGreaterThan(innerMarker);
  const footer = route.slice(
    route.lastIndexOf("<footer", outerMarker),
    route.indexOf("</footer>", providerMarker),
  );

  expect(footer).not.toContain("page-footer-outer");
  expect(footer).not.toContain('className="page-footer"');
  expect(footer).not.toContain('className="provider"');
  expect(footer).toContain("Yona authors");
  expect(appCss).toContain(".page-footer-outer {");
  expect(appCss).toContain(".page-footer-outer .page-footer {");
  expect(appCss).toContain(".page-footer-outer .provider {");
  expect(appCss).not.toContain(".page-footer-outer .provider a {");

  for (const consumer of [
    "restricted.tsx",
    "secret.tsx",
    "$user.tsx",
    "__root.tsx",
    "[_]UIKit.tsx",
    "restart.tsx",
  ]) {
    expect(readFileSync(`src/routes/${consumer}`, "utf8")).toContain(
      'className="page-footer-outer"',
    );
  }
});

test("frozen SiteLayout footer sources stay byte-identical", () => {
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
      "../yona-original/app/assets/stylesheets/less/_responsive.less",
      "3b8038e9e3f9fb2067d506794e342bf0aca81071d94128c6cc1a3214c0812105",
    ],
  ]);
  for (const [path, expected] of hashes) {
    expect(createHash("sha256").update(readFileSync(path)).digest("hex")).toBe(expected);
  }
});

for (const viewport of [
  { height: 900, label: "desktop-home", width: 1366 },
  { height: 844, label: "mobile-home", width: 390 },
]) {
  test(`SiteLayout footer preserves ${viewport.label} legacy cascade`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await installRuntime(page);
    await page.goto(`${BASE_PATH}/`);
    await page.evaluate(() => document.fonts.ready);

    const outer = page.locator(OUTER);
    const inner = outer.locator(`:scope > ${INNER}`);
    const provider = inner.locator(`:scope > ${PROVIDER}`);
    await expect(outer).toBeVisible();
    await expect(inner).toHaveCount(1);
    await expect(provider).toContainText("Yona authors");
    await expect(provider).not.toContainText("Yoram");
    await expect(outer).not.toHaveClass(/(?:^|\s)page-footer-outer(?:\s|$)/u);
    await expect(inner).not.toHaveClass(/(?:^|\s)page-footer(?:\s|$)/u);
    await expect(provider).not.toHaveClass(/(?:^|\s)provider(?:\s|$)/u);

    const evidence = await outer.evaluate((element) => {
      const innerElement = element.firstElementChild as HTMLElement;
      const providerElement = innerElement.firstElementChild as HTMLElement;
      const outerRect = element.getBoundingClientRect();
      const innerRect = innerElement.getBoundingClientRect();
      const outerStyle = getComputedStyle(element);
      const innerStyle = getComputedStyle(innerElement);
      const providerStyle = getComputedStyle(providerElement);
      return {
        boxes: {
          inner: { height: innerRect.height, width: innerRect.width, x: innerRect.x },
          outer: { height: outerRect.height, width: outerRect.width, x: outerRect.x },
        },
        contained:
          innerRect.left >= outerRect.left &&
          innerRect.right <= outerRect.right &&
          innerRect.top >= outerRect.top &&
          innerRect.bottom <= outerRect.bottom,
        inner: {
          boxSizing: innerStyle.boxSizing,
          lineHeight: innerStyle.lineHeight,
          margin: innerStyle.margin,
          textAlign: innerStyle.textAlign,
          width: innerStyle.width,
        },
        outer: {
          backgroundColor: outerStyle.backgroundColor,
          boxSizing: outerStyle.boxSizing,
          minWidth: outerStyle.minWidth,
          padding: outerStyle.padding,
          width: outerStyle.width,
        },
        overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        provider: {
          color: providerStyle.color,
          fontFamily: providerStyle.fontFamily,
          fontSize: providerStyle.fontSize,
          marginLeft: providerStyle.marginLeft,
        },
      };
    });

    expect(evidence.outer).toEqual({
      backgroundColor: "rgb(255, 255, 255)",
      boxSizing: "content-box",
      minWidth: viewport.width <= 720 ? "10px" : "0px",
      padding: "10px",
      width: `${viewport.width - 20}px`,
    });
    expect(evidence.inner).toEqual({
      boxSizing: "content-box",
      lineHeight: "34px",
      margin: "0px",
      textAlign: "center",
      width: `${viewport.width - 20}px`,
    });
    expect(evidence.provider).toEqual({
      color: "rgb(51, 51, 51)",
      fontFamily: "Verdana",
      fontSize: "9px",
      marginLeft: "4px",
    });
    expect(evidence.boxes.outer.width).toBe(viewport.width);
    expect(evidence.boxes.outer.x).toBe(0);
    expect(evidence.boxes.outer.height).toBe(evidence.boxes.inner.height + 20);
    expect(evidence.boxes.inner.width).toBe(viewport.width - 20);
    expect(evidence.boxes.inner.x).toBe(10);
    // Legacy composition wraps to two 36px line boxes on mobile (390px); single line on desktop.
    expect(evidence.boxes.inner.height).toBe(viewport.width <= 720 ? 72 : 36);
    expect(evidence.contained).toBe(true);
    expect(evidence.overflow).toBe(false);

    mkdirSync(SCREENSHOT_DIRECTORY, { recursive: true });
    await outer.screenshot({
      path: resolve(SCREENSHOT_DIRECTORY, `style-site-footer-${viewport.label}.png`),
    });
  });
}

test("SiteLayout footer paint is isolated from legacy presentation classes", async ({ page }) => {
  await page.setViewportSize({ height: 900, width: 1366 });
  await installRuntime(page);
  await page.goto(`${BASE_PATH}/`);
  const result = await page.locator(OUTER).evaluate((outer) => {
    const inner = outer.firstElementChild as HTMLElement;
    const provider = inner.firstElementChild as HTMLElement;
    const snapshot = () => {
      const outerStyle = getComputedStyle(outer);
      const innerStyle = getComputedStyle(inner);
      const providerStyle = getComputedStyle(provider);
      return {
        inner: {
          boxSizing: innerStyle.boxSizing,
          lineHeight: innerStyle.lineHeight,
          margin: innerStyle.margin,
          textAlign: innerStyle.textAlign,
          width: innerStyle.width,
        },
        outer: {
          backgroundColor: outerStyle.backgroundColor,
          boxSizing: outerStyle.boxSizing,
          minWidth: outerStyle.minWidth,
          padding: outerStyle.padding,
          width: outerStyle.width,
        },
        provider: {
          color: providerStyle.color,
          fontFamily: providerStyle.fontFamily,
          fontSize: providerStyle.fontSize,
          marginLeft: providerStyle.marginLeft,
        },
      };
    };
    const owned = snapshot();
    outer.classList.add("page-footer-outer");
    inner.classList.add("page-footer");
    provider.classList.add("provider");
    return { owned, withLegacyClasses: snapshot() };
  });
  expect(result.withLegacyClasses).toEqual(result.owned);
});

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
  for (const endpoint of ["workspace/overview", "notifications", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}
