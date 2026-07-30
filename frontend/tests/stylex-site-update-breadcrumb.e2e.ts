import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const owners = {
  heading: "site-update-breadcrumb-heading",
  inner: "site-update-breadcrumb-inner",
  outer: "site-update-breadcrumb-outer",
} as const;

test.use({ locale: "en-US" });

test("update breadcrumb owns the route-local legacy geometry", () => {
  const route = readFileSync("src/routes/sites/update.tsx", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const update = readFileSync("../yona-original/app/views/site/update.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const messages = readFileSync("../yona-original/conf/messages", "utf8");

  expect(update).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="site-breadcrumb-outer">');
  expect(layout).toContain('<div class="site-breadcrumb-inner">');
  expect(layout).toContain('<h3>@Messages("site.sidebar")</h3>');
  expect(pageLess).toContain(".site-breadcrumb-inner {\n        margin:0 auto;");
  expect(pageLess).toContain("padding: 10px 10px 5px 10px;");
  expect(pageLess).toContain("line-height: 30px;");
  expect(responsive).toContain(".site-breadcrumb-outer {\n    min-width: 10px !important;");
  expect(responsive).toContain(
    ".site-breadcrumb-outer {\n    width: 100%;\n    padding: 0 10px;\n    box-sizing: border-box;",
  );
  expect(messages).toContain("site.sidebar = Site management");
  for (const owner of Object.values(owners))
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  expect(route).not.toContain('className="site-breadcrumb-outer"');
  expect(route).not.toContain('className="site-breadcrumb-inner"');
  expect(route).not.toContain("globalColors.");
  const headingBlock = route.slice(route.indexOf("breadcrumbHeading: {"), route.indexOf("page: {"));
  for (const declaration of ['lineHeight: "30px"', 'padding: "10px 10px 5px"'])
    expect(headingBlock).toContain(declaration);
  for (const inherited of ["color:", "fontFamily:", "fontSize:", "fontWeight:", "margin:"])
    expect(headingBlock).not.toContain(inherited);
});

for (const viewport of [
  { height: 900, name: "desktop", width: 1366 },
  { height: 844, name: "mobile", width: 390 },
]) {
  test(`update breadcrumb preserves ${viewport.name} owner, geometry, and fallback-off output`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installFixture(page);
    await page.goto(`${basePath}/sites/update`);
    await page.evaluate(() => document.fonts.ready);

    const outer = owner(page, owners.outer);
    const inner = owner(page, owners.inner);
    const heading = owner(page, owners.heading);
    await expect(outer.locator(`:scope > [data-stylex-owner="${owners.inner}"]`)).toHaveCount(1);
    await expect(inner.locator(`:scope > h3[data-stylex-owner="${owners.heading}"]`)).toHaveCount(
      1,
    );
    await expect(heading).toHaveText("Site management");
    await expect(outer).not.toHaveClass(/\bsite-breadcrumb-outer\b/u);
    await expect(inner).not.toHaveClass(/\bsite-breadcrumb-inner\b/u);

    const evidence = await page.evaluate((ownerNames) => {
      const get = (name: string) =>
        document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`)!;
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
    expect(evidence.boxes.outer).toMatchObject({ height: 45, width: viewport.width, x: 0 });
    expect(evidence.boxes.inner).toMatchObject({
      height: 45,
      width: viewport.width - 20,
      x: 10,
      y: evidence.boxes.outer.y,
    });
    expect(evidence.boxes.heading).toMatchObject({
      height: 45,
      width: viewport.width - 20,
      x: 10,
      y: evidence.boxes.outer.y,
    });
    expect(evidence.heading).toEqual({
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
        `stylex-site-update-breadcrumb-${viewport.name}.png`,
      ),
    });
  });
}

function owner(page: Page, name: string) {
  return page.locator(`[data-stylex-owner="${name}"]`);
}

async function installFixture(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        csrfToken: "csrf-site-update-breadcrumb",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
      },
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { currentVersion: "1.0.0", error: null, versionToUpdate: null },
    }),
  );
}
