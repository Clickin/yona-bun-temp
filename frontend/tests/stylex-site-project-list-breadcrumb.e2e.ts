import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "site-project-list-breadcrumb-heading",
  inner: "site-project-list-breadcrumb-inner",
  outer: "site-project-list-breadcrumb-outer",
} as const;

test.use({ locale: "ko-KR" });

async function openProjectList(page: Page) {
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
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
  await page.goto(`${basePath}/sites/projectList?filter=road&pageNum=1`);
  await expect(page.locator(`[data-stylex-owner="${owners.outer}"]`)).toBeVisible();
}

test("breadcrumb has exactly three direct geometry owners and retires its two classes", () => {
  const route = readFileSync("src/routes/sites/projectList.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const projectList = readFileSync(
    "../yona-original/app/views/site/projectList.scala.html",
    "utf8",
  );
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const common = readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");
  const messages = readFileSync("../yona-original/conf/messages", "utf8");
  const yobi = readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8");
  expect(projectList).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-breadcrumb-outer">');
  expect(layout).toContain('<div class="site-breadcrumb-inner">');
  expect(layout).toContain('<h3>@Messages("site.sidebar")</h3>');
  expect(messages).toContain("site.sidebar = Site management");
  for (const imported of ["_common.less", "_page.less", "_responsive.less"])
    expect(yobi).toContain(imported);
  expect(yobi.indexOf("_common.less")).toBeLessThan(yobi.indexOf("_page.less"));
  expect(yobi.indexOf("_page.less")).toBeLessThan(yobi.indexOf("_responsive.less"));
  expect(common).toContain("body,div,dl,dt,dd,ul,ol,li,h1,h2,h3,h4,form,fieldset,p,button{");
  expect(common).toContain("h1,h2,h3,h4,h5,h6 { text-rendering:auto !important; }");
  expect(bootstrap).toContain("h3 {\n  font-size: 24.5px;");
  expect(pageLess).toContain(".site-breadcrumb-outer {");
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(responsive).toContain(".site-breadcrumb-outer {");
  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('className="site-breadcrumb-outer"');
  expect(route).not.toContain('className="site-breadcrumb-inner"');
  expect(route).not.toContain("globalColors.");
  expect(route).not.toContain("breadcrumbColor");
  for (const declaration of [
    'boxSizing: "border-box"',
    '[globalBreakpoints.mobile]: "10px"',
    'padding: "0px 10px"',
    'width: "100%"',
    'margin: "0px auto"',
    'lineHeight: "30px"',
    'padding: "10px 10px 5px"',
  ])
    expect(route).toContain(declaration);
  const headingBlock = route.slice(
    route.indexOf("breadcrumbHeading: {"),
    route.indexOf("pageWrapOuter: {"),
  );
  for (const sharedDeclaration of [
    "color:",
    "fontFamily:",
    "fontSize:",
    "fontWeight:",
    "margin:",
    "textRendering:",
  ])
    expect(headingBlock).not.toContain(sharedDeclaration);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`breadcrumb preserves exact ${viewport.name} local geometry and live rhythm`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openProjectList(page);
    const outer = page.locator(`[data-stylex-owner="${owners.outer}"]`);
    const inner = page.locator(`[data-stylex-owner="${owners.inner}"]`);
    const heading = page.locator(`[data-stylex-owner="${owners.heading}"]`);
    await expect(outer.locator(`:scope > [data-stylex-owner="${owners.inner}"]`)).toHaveCount(1);
    await expect(inner.locator(`:scope > h3[data-stylex-owner="${owners.heading}"]`)).toHaveCount(
      1,
    );
    await expect(heading).toHaveText("사이트 관리");
    await expect(outer).not.toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);

    const evidence = await page.evaluate((ownerNames) => {
      const outer = document.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.outer}"]`,
      )!;
      const inner = document.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.inner}"]`,
      )!;
      const heading = document.querySelector<HTMLElement>(
        `[data-stylex-owner="${ownerNames.heading}"]`,
      )!;
      const capture = () => {
        const box = (element: HTMLElement) => {
          const rect = element.getBoundingClientRect();
          return { height: rect.height, width: rect.width, x: rect.x, y: rect.y };
        };
        const outerStyle = getComputedStyle(outer);
        const innerStyle = getComputedStyle(inner);
        const headingStyle = getComputedStyle(heading);
        return {
          boxes: { heading: box(heading), inner: box(inner), outer: box(outer) },
          heading: {
            color: headingStyle.color,
            fontFamily: headingStyle.fontFamily,
            fontSize: headingStyle.fontSize,
            fontWeight: headingStyle.fontWeight,
            lineHeight: headingStyle.lineHeight,
            margin: headingStyle.margin,
            padding: headingStyle.padding,
            textRendering: headingStyle.textRendering,
          },
          inner: { margin: innerStyle.margin },
          outer: {
            backgroundColor: outerStyle.backgroundColor,
            borderBottom: outerStyle.borderBottom,
            boxSizing: outerStyle.boxSizing,
            minWidth: outerStyle.minWidth,
            padding: outerStyle.padding,
            width: outerStyle.width,
          },
        };
      };
      const actual = capture();
      for (const element of [outer, inner, heading])
        for (const token of Array.from(element.classList))
          if (token.startsWith("x")) element.classList.remove(token);
      outer.classList.add("site-breadcrumb-outer");
      inner.classList.add("site-breadcrumb-inner");
      const fallback = capture();
      return { actual, fallback };
    }, owners);
    const {
      boxes: actualBoxes,
      heading: actualHeading,
      outer: actualOuter,
      ...actualOwned
    } = evidence.actual;
    const {
      boxes: fallbackBoxes,
      heading: fallbackHeading,
      outer: fallbackOuter,
      ...fallbackOwned
    } = evidence.fallback;
    expect(actualOwned).toEqual(fallbackOwned);
    expect(actualBoxes).toEqual({
      heading: { height: 45, width: viewport.name === "desktop" ? 1346 : 370, x: 10, y: 83 },
      inner: { height: 45, width: viewport.name === "desktop" ? 1346 : 370, x: 10, y: 83 },
      outer: { height: 45, width: viewport.width, x: 0, y: 83 },
    });
    expect(actualHeading).toEqual({
      color: "rgb(51, 51, 51)",
      fontFamily:
        '-apple-system, "system-ui", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      fontSize: "24.5px",
      fontWeight: "700",
      lineHeight: "30px",
      margin: "0px",
      padding: "10px 10px 5px",
      textRendering: "auto",
    });
    expect(actualOuter).toEqual({
      backgroundColor: "rgba(0, 0, 0, 0)",
      borderBottom: "0px none rgb(51, 51, 51)",
      boxSizing: "border-box",
      minWidth: viewport.name === "desktop" ? "0px" : "10px",
      padding: "0px 10px",
      width: `${viewport.width}px`,
    });
    expect(actualBoxes.heading).toEqual(actualBoxes.inner);
    expect(actualBoxes.outer.height).toBe(45);
    expect(fallbackBoxes.inner.width).toBe(actualBoxes.inner.width);
    expect(fallbackHeading.padding).toBe(actualHeading.padding);
    expect(fallbackHeading.lineHeight).toBe(actualHeading.lineHeight);
    expect(fallbackOuter.padding).toBe(actualOuter.padding);
    expect(fallbackOuter.width).toBe(actualOuter.width);
    // The retired local app bridge adds a non-legacy border and resets heading weight; direct
    // ownership intentionally deletes those stale declarations instead of porting compensation.
    expect(fallbackOuter.borderBottom).toBe("1px solid rgb(221, 221, 221)");
    expect(fallbackHeading.fontWeight).toBe("400");
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
      viewport.name === "desktop" ? 1366 : 420,
    );

    await page.reload();
    await expect(outer).toBeVisible();
    const pageTop = await page
      .locator('[data-stylex-owner="site-project-list-page-wrap-outer"]')
      .evaluate((node) => node.getBoundingClientRect().top);
    expect(pageTop - actualBoxes.outer.y).toBe(55);
    mkdirSync(resolve("..", "output", "playwright", "visual-sweep"), { recursive: true });
    const screenshot = await outer.screenshot({
      path: resolve(
        "..",
        "output",
        "playwright",
        "visual-sweep",
        `stylex-site-project-list-breadcrumb-${viewport.name}.png`,
      ),
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  });
}
