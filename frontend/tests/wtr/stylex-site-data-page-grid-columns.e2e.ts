import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OWNERS = {
  content: "site-data-setting-content-column",
  grid: "site-data-setting-grid",
  page: "site-data-page",
  sidebar: "site-data-sidebar-column",
} as const;

test.use({ locale: "en-US" });

test("site data page/grid/columns own the active frozen layout declarations", () => {
  const route = readFileSync("src/routes/sites/data.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/site/data.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");

  expect(template).toContain('<div class="cu-desc">');
  expect(layout).toContain('<div class="page-wrap-outer">');
  expect(layout).toContain('<div class="row-fluid">');
  expect(layout).toContain('<div class="span2">');
  expect(layout).toContain('<div class="span10">');
  expect(pageLess).toContain(".page-wrap-outer {\n    min-height: 450px;\n    margin-top: 10px;");
  expect(pageLess).toContain(".site-setting-wrap {\n    margin:0 auto;");
  expect(responsive).toContain(
    ".page-wrap-outer {\n    min-width: 10px !important;\n    padding: 0 !important;",
  );
  expect(bootstrap).toContain(".row-fluid {\n  width: 100%;");
  expect(bootstrap).toContain('.row-fluid [class*="span"] {');
  expect(bootstrap).toContain(".row-fluid .span10 {\n  width: 82.97872340425532%;");
  expect(bootstrap).toContain(".row-fluid .span2 {\n  width: 14.893617021276595%;");

  for (const owner of Object.values(OWNERS)) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }
  for (const style of [
    "page",
    "settingWrap",
    "settingGrid",
    "settingColumn",
    "settingSidebarColumn",
    "settingContentColumn",
  ]) {
    expect(route).toContain(`${style}: {`);
  }
  expect(route).toContain("page-wrap-outer");
  expect(route).not.toContain('className="site-setting-wrap"');
  expect(route).not.toContain('className="row-fluid"');
  expect(route).not.toContain('className="span2"');
  expect(route).not.toContain('className="span10"');
});

for (const viewport of [
  { height: 900, name: "desktop", padding: "0px 10px", width: 1366 },
  { height: 844, name: "mobile", padding: "0px", width: 390 },
]) {
  test(`site data page/grid/columns preserve ${viewport.name} normal and fallback-off geometry`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await installSiteData(page);
    await page.goto(`${BASE_PATH}/sites/data`);
    await page.evaluate(() => document.fonts.ready);

    for (const owner of Object.values(OWNERS)) {
      await expect(page.locator(`[data-stylex-owner="${owner}"]`)).toBeVisible();
    }
    const pageOwner = page.locator(`[data-stylex-owner="${OWNERS.page}"]`);
    const grid = page.locator(`[data-stylex-owner="${OWNERS.grid}"]`);
    const sidebar = page.locator(`[data-stylex-owner="${OWNERS.sidebar}"]`);
    const content = page.locator(`[data-stylex-owner="${OWNERS.content}"]`);
    await expect(pageOwner).toHaveCSS("padding", viewport.padding);
    await expect(pageOwner).toHaveCSS("min-height", "450px");
    await expect(grid).toHaveCSS(
      "width",
      `${viewport.width - (viewport.name === "desktop" ? 20 : 0)}px`,
    );
    await expect(sidebar).toHaveCSS("float", "left");
    await expect(content).toHaveCSS("float", "left");

    const geometry = await page.evaluate((owners) => {
      const box = (name: string) => {
        const element = document.querySelector<HTMLElement>(`[data-stylex-owner="${name}"]`);
        if (!element) throw new Error(`missing ${name}`);
        return element.getBoundingClientRect().toJSON();
      };
      return {
        content: box(owners.content),
        grid: box(owners.grid),
        page: box(owners.page),
        scrollWidth: document.documentElement.scrollWidth,
        sidebar: box(owners.sidebar),
      };
    }, OWNERS);
    expect(geometry.page.width).toBe(viewport.width);
    expect(geometry.page.height).toBeGreaterThanOrEqual(450);
    expect(geometry.grid.left).toBeCloseTo(viewport.name === "desktop" ? 10 : 0, 4);
    expect(geometry.sidebar.left).toBeCloseTo(geometry.grid.left, 4);
    expect(geometry.sidebar.width / geometry.grid.width).toBeCloseTo(0.1489361702, 4);
    expect(geometry.content.width / geometry.grid.width).toBeCloseTo(0.829787234, 4);
    expect((geometry.content.left - geometry.sidebar.right) / geometry.grid.width).toBeCloseTo(
      0.0212765957,
      4,
    );
    expect(geometry.sidebar.right).toBeLessThanOrEqual(geometry.content.left);
    expect(geometry.content.right).toBeLessThanOrEqual(geometry.grid.right + 1);
    expect(geometry.scrollWidth).toBe(viewport.width);
  });
}

async function installSiteData(page: Page) {
  const session = (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ contentType: "application/json", json: { versionToUpdate: null } }),
  );
}
