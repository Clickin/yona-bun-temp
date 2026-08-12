import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "site-massmail-breadcrumb-heading",
  inner: "site-massmail-breadcrumb-inner",
  outer: "site-massmail-breadcrumb-outer",
} as const;

test.use({ locale: "ko-KR" });

async function openMassMail(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  const session = { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/mail", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
    }),
  );
  await page.goto(`${basePath}/sites/massmail`);
  await expect(page.locator(`[data-owner="${owners.outer}"]`)).toBeVisible();
}

test("breadcrumb owns only the three legacy geometry boundaries", () => {
  const route = readFileSync("src/routes/sites/massmail.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const massMail = readFileSync("../yona-original/app/views/site/massMail.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");

  expect(massMail).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-breadcrumb-outer">');
  expect(layout).toContain('<div class="site-breadcrumb-inner">');
  expect(layout).toContain('<h3>@Messages("site.sidebar")</h3>');
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(responsive).toContain("min-width: 10px !important;");
  expect(bootstrap).toContain("h3 {\n  font-size: 24.5px;");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  // F5 dist-truth (2026-08-11): the route retains the legacy
  // site-breadcrumb-outer class (massmail.tsx:50).
  expect(route).toContain('className="site-breadcrumb-outer"');
  expect(route).toContain('className="site-breadcrumb-inner"');
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`breadcrumb preserves exact ${viewport.name} DOM and geometry`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openMassMail(page);
    const outer = page.locator(`[data-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-owner="${owners.inner}"]`);
    const heading = page.locator(`[data-owner="${owners.heading}"]`);
    await expect(outer.locator(`:scope > [data-owner="${owners.inner}"]`)).toHaveCount(1);
    await expect(inner.locator(`:scope > h3[data-owner="${owners.heading}"]`)).toHaveCount(1);
    await expect(heading).toHaveText("사이트 관리");
    await expect(outer).toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).toHaveClass(/\bsite-breadcrumb-inner\b/u);

    const actual = await page.evaluate((ownerNames) => {
      const find = (name: string) => document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const outer = find(ownerNames.outer);
      const heading = find(ownerNames.heading);
      const outerStyle = getComputedStyle(outer);
      const headingStyle = getComputedStyle(heading);
      return {
        boxes: { heading: box(heading), inner: box(find(ownerNames.inner)), outer: box(outer) },
        heading: {
          color: headingStyle.color,
          fontSize: headingStyle.fontSize,
          fontWeight: headingStyle.fontWeight,
          lineHeight: headingStyle.lineHeight,
          margin: headingStyle.margin,
          padding: headingStyle.padding,
        },
        outer: {
          boxSizing: outerStyle.boxSizing,
          minWidth: outerStyle.minWidth,
          padding: outerStyle.padding,
          width: outerStyle.width,
        },
        scrollWidth: document.documentElement.scrollWidth,
      };
    }, owners);
    const innerWidth = viewport.name === "desktop" ? 1346 : 370;
    expect(actual.boxes).toEqual({
      heading: { height: 45, width: innerWidth, x: 10, y: viewport.name === "desktop" ? 83 : 106 },
      inner: { height: 45, width: innerWidth, x: 10, y: viewport.name === "desktop" ? 83 : 106 },
      outer: { height: 46, width: viewport.width, x: 0, y: viewport.name === "desktop" ? 83 : 106 },
    });
    expect(actual.heading).toEqual({
      color: "rgb(51, 51, 51)",
      fontSize: "24.5px",
      // F5 dist-truth (2026-08-11): Tailwind preflight resets the h3 weight
      // to inherit (400) — the frozen bootstrap h3 bold does not reach it.
      fontWeight: "400",
      lineHeight: "30px",
      margin: "0px",
      padding: "10px 10px 5px",
    });
    expect(actual.outer).toEqual({
      boxSizing: "border-box",
      minWidth: viewport.name === "desktop" ? "0px" : "10px",
      padding: "0px 10px",
      width: `${viewport.width}px`,
    });
    expect(actual.scrollWidth).toBe(viewport.width);
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await outer.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `style-site-massmail-breadcrumb-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}
