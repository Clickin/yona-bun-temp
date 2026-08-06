import { readFileSync } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

const BASE_PATH = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const OWNERS = {
  content: "site-diagnostic-setting-content-column",
  grid: "site-diagnostic-setting-grid",
  page: "site-diagnostic-page",
  sidebar: "site-diagnostic-sidebar-column",
} as const;

test.use({ locale: "en-US" });

test("site diagnostic page/grid/columns own the active frozen layout declarations", () => {
  const route = readFileSync("src/routes/sites/diagnostic.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/site/diagnostic.scala.html", "utf8");
  const layout = readFileSync("../yona-original/app/views/site/siteMngLayout.scala.html", "utf8");
  const pageLess = readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8");
  const responsive = readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  );
  const bootstrap = readFileSync("../yona-original/public/bootstrap/css/bootstrap.css", "utf8");

  expect(template).toContain("@if(errors.isEmpty())");
  expect(template).toContain("<li><pre>@error</pre></li>");
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
  expect(bootstrap).toContain(".pull-left {\n  float: left;");

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
  expect(route).not.toContain('className="page-wrap-outer"');
  expect(route).not.toContain('className="site-setting-wrap"');
  expect(route).not.toContain('className="row-fluid"');
  expect(route).not.toContain('className="span2"');
  expect(route).not.toContain('className="span10"');
  expect(route).toContain('noErrorHeading: {\n    float: "left",');
  expect(route).toContain('errorHeading: {\n    float: "left",');
  expect(route).not.toContain('className="pull-left"');
  expect(route).not.toContain('className="title_area"');
});

for (const diagnostic of [
  { errors: [], name: "healthy", titleOwner: "site-diagnostic-no-error-title" },
  {
    errors: ["database probe failed", "repository path is unavailable"],
    name: "error",
    titleOwner: "site-diagnostic-error-title",
  },
]) {
  for (const viewport of [
    { height: 900, name: "desktop", padding: "0px 10px", width: 1366 },
    { height: 844, name: "mobile", padding: "0px", width: 390 },
  ]) {
    test(`${diagnostic.name} site diagnostic preserves ${viewport.name} page/grid/column geometry`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await installDiagnostic(page, diagnostic.errors);
      await page.goto(`${BASE_PATH}/sites/diagnostic`);
      await page.evaluate(() => document.fonts.ready);

      for (const owner of Object.values(OWNERS)) {
        await expect(page.locator(`[data-stylex-owner="${owner}"]`)).toBeVisible();
      }
      await expect(page.locator(`[data-stylex-owner="${diagnostic.titleOwner}"]`)).toBeVisible();
      if (diagnostic.errors.length === 0) {
        await expect(page.getByText("No errors were found")).toBeVisible();
      } else {
        await expect(
          page.locator('[data-stylex-owner="site-diagnostic-error-pre"] > li > pre'),
        ).toHaveText(diagnostic.errors);
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
}

async function installDiagnostic(page: Page, errors: string[]) {
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
  await page.route("**/api/v1/site/diagnostics", (route) =>
    route.fulfill({ contentType: "application/json", json: { errorCount: errors.length, errors } }),
  );
}
