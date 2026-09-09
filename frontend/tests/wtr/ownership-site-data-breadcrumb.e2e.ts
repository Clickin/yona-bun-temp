import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts: string[]) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "site-data-breadcrumb-heading",
  inner: "site-data-breadcrumb-inner",
  outer: "site-data-breadcrumb-outer",
} as const;

test.use({ locale: "ko-KR" });

async function openData(page: Page) {
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
  const session = {
    csrfToken: "csrf-site-data-breadcrumb",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "siteboss",
  };
  const fulfillSession = (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session });
  await page.route("**/api/v1/session", fulfillSession);
  await page.route("**/api/auth/session", fulfillSession);
  await page.route("**/api/v1/auth/session", fulfillSession);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
  await page.goto(`${basePath}/sites/data`);
  await expect(page.locator('[data-owner="site-admin-affix"]')).toBeVisible();
  await expect(page.locator(`[data-owner="${owners.outer}"]`)).toBeVisible();
}

test("data breadcrumb owns only the three frozen geometry boundaries", () => {
  const route = readFileSync("src/routes/sites/data.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const data = readFileSync("../yona-original/app/views/site/data.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");
  expect(data).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-breadcrumb-outer">');
  expect(layout).toContain('<div class="site-breadcrumb-inner">');
  expect(layout).toContain('<h3>@Messages("site.sidebar")</h3>');
  expect(pageLess).toContain(".site-breadcrumb-outer {");
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(responsive).toContain("min-width: 10px !important;");
  expect(responsive).toContain("box-sizing: border-box;");
  expect(messages).toContain("site.sidebar = Site management");
  for (const owner of Object.values(owners)) expect(route).toContain(`data-owner="${owner}"`);
  expect(route).not.toContain('className="site-breadcrumb-outer"');
  expect(route).not.toContain('className="site-breadcrumb-inner"');

  const headingBlock = route.slice(
    route.indexOf("breadcrumbHeading: {"),
    route.indexOf("sidebar: {"),
  );
  for (const fallback of ["color:", "fontFamily:", "fontSize:", "fontWeight:", "margin:"])
    expect(headingBlock).not.toContain(fallback);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`data breadcrumb preserves exact ${viewport.name} geometry and generic h3 fallback`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openData(page);
    const outer = page.locator(`[data-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-owner="${owners.inner}"]`);
    const heading = page.locator(`[data-owner="${owners.heading}"]`);
    await expect(outer.locator(`:scope > [data-owner="${owners.inner}"]`)).toHaveCount(1);
    await expect(inner.locator(`:scope > h3[data-owner="${owners.heading}"]`)).toHaveCount(1);
    await expect(heading).toHaveText("사이트 관리");
    await expect(outer).not.toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);

    const evidence = await page.evaluate((ownerNames) => {
      const get = (name: string) => document.querySelector<HTMLElement>(`[data-owner="${name}"]`)!;
      const outer = get(ownerNames.outer);
      const inner = get(ownerNames.inner);
      const heading = get(ownerNames.heading);
      const box = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect();
        return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
      };
      const outerStyle = getComputedStyle(outer);
      const headingStyle = getComputedStyle(heading);
      return {
        boxes: { heading: box(heading), inner: box(inner), outer: box(outer) },
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
      };
    }, owners);
    expect(evidence.boxes).toEqual({
      heading: {
        height: 45,
        width: viewport.name === "desktop" ? 1346 : 370,
        x: 10,
        y: 83,
      },
      inner: {
        height: 45,
        width: viewport.name === "desktop" ? 1346 : 370,
        x: 10,
        y: 83,
      },
      outer: { height: 45, width: viewport.width, x: 0, y: 83 },
    });
    expect(evidence.heading).toEqual({
      color: "rgb(51, 51, 51)",
      fontSize: "24.5px",
      fontWeight: "700",
      lineHeight: "30px",
      margin: "0px",
      padding: "10px 10px 5px",
    });
    expect(evidence.outer).toEqual({
      boxSizing: "border-box",
      minWidth: viewport.name === "desktop" ? "0px" : "10px",
      padding: "0px 10px",
      width: `${viewport.width}px`,
    });
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    await outer.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `style-site-data-breadcrumb-${viewport.name}.png`,
      ),
    });
  });
}
