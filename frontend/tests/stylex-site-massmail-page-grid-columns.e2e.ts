import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/massmail.tsx", import.meta.url);
const massMailTemplate = new URL(
  "../../yona-original/app/views/site/massMail.scala.html",
  import.meta.url,
);
const siteLayout = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const massMailBehavior = new URL(
  "../../yona-original/public/javascripts/service/yobi.site.MassMail.js",
  import.meta.url,
);
const pageStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const responsiveBootstrap = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  import.meta.url,
);

const owners = {
  content: "site-massmail-content",
  grid: "site-massmail-setting-grid",
  main: "site-massmail-setting-content-column",
  page: "site-massmail-page",
  sidebar: "site-massmail-sidebar-column",
} as const;

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-massmail-page-grid-columns" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({ json: { projects: [{ ownerName: "admin", projectName: "projectYobi" }] } }),
  );
}

async function open(page: Page) {
  await mockSession(page);
  await page.goto(`${basePath}/sites/massmail`);
  await expect(page.locator(`[data-stylex-owner="${owners.page}"]`)).toBeVisible();
}

test("site massmail page grid and columns own the frozen site-management layout", async ({ page }) => {
  const [route, mail, layout, behavior, less, bootstrapResponsive] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(massMailTemplate, "utf8"),
    readFile(siteLayout, "utf8"),
    readFile(massMailBehavior, "utf8"),
    readFile(pageStyles, "utf8"),
    readFile(responsiveBootstrap, "utf8"),
  ]);
  expect(mail).toContain("@siteMngLayout(message)");
  expect(mail).toContain('id="mailtoAll"');
  expect(mail).toContain('id="mailtoPrj"');
  expect(mail).toContain('id="project-list-wrap"');
  expect(layout).toContain('<div class="page-wrap-outer">');
  expect(layout).toContain('<div class="site-setting-wrap">');
  expect(layout).toContain('<div class="row-fluid">');
  expect(layout).toContain('<div class="span2">');
  expect(layout).toContain('<div class="span10">');
  expect(behavior).toContain("_clickMailTypeLabel");
  expect(behavior).toContain("_appendProjectLabel");
  expect(less).toContain("min-height: 450px;");
  expect(less).toContain("margin-top: 10px;");
  expect(less).toContain(".site-setting-wrap {");
  expect(bootstrapResponsive).toContain("width: 14.52991452991453%;");
  expect(bootstrapResponsive).toContain("width: 82.90598290598291%;");
  expect(bootstrapResponsive).toContain("width: 14.3646408839779%;");
  expect(bootstrapResponsive).toContain("width: 82.87292817679558%;");
  for (const owner of Object.values(owners)) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }

  for (const viewport of [
    {
      expectedMain: 0.8290598290598291,
      expectedSidebar: 0.1452991452991453,
      height: 900,
      name: "desktop",
      width: 1366,
    },
    {
      expectedMain: 0.8287292817679558,
      expectedSidebar: 0.143646408839779,
      height: 844,
      name: "tablet",
      width: 900,
    },
    { expectedMain: 1, expectedSidebar: 1, height: 844, name: "mobile", width: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await open(page);
    const pageShell = page.locator(`[data-stylex-owner="${owners.page}"]`);
    const content = page.locator(`[data-stylex-owner="${owners.content}"]`);
    const grid = page.locator(`[data-stylex-owner="${owners.grid}"]`);
    const sidebar = page.locator(`[data-stylex-owner="${owners.sidebar}"]`);
    const main = page.locator(`[data-stylex-owner="${owners.main}"]`);
    await expect(content).toBeVisible();
    await expect(grid).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(main).toBeVisible();
    await expect(pageShell).not.toHaveClass(/page-wrap-outer/);
    await expect(content).not.toHaveClass(/site-setting-wrap/);
    await expect(grid).not.toHaveClass(/row-fluid/);
    await expect(sidebar).not.toHaveClass(/span2/);
    await expect(main).not.toHaveClass(/span10/);
    const layout = await page.evaluate((ownerMap) => {
      const requireElement = (owner: string) => {
        const element = document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`);
        if (!element) throw new Error(`Missing ${owner}`);
        return element;
      };
      const page = requireElement(ownerMap.page);
      const grid = requireElement(ownerMap.grid);
      const sidebar = requireElement(ownerMap.sidebar);
      const main = requireElement(ownerMap.main);
      const gridBox = grid.getBoundingClientRect();
      const sidebarBox = sidebar.getBoundingClientRect();
      const mainBox = main.getBoundingClientRect();
      return {
        mainRatio: mainBox.width / gridBox.width,
        pageMarginTop: getComputedStyle(page).marginTop,
        pageMinHeight: getComputedStyle(page).minHeight,
        sidebarFloat: getComputedStyle(sidebar).float,
        sidebarRatio: sidebarBox.width / gridBox.width,
        stacked: sidebarBox.bottom <= mainBox.top,
      };
    }, owners);
    expect(layout.pageMarginTop).toBe("10px");
    expect(layout.pageMinHeight).toBe("450px");
    expect(layout.sidebarRatio).toBeCloseTo(viewport.expectedSidebar, 4);
    expect(layout.mainRatio).toBeCloseTo(viewport.expectedMain, 4);
    if (viewport.name === "mobile") {
      expect(layout.sidebarFloat).toBe("none");
      expect(layout.stacked).toBe(true);
    } else {
      expect(layout.sidebarFloat).toBe("left");
    }

    await expect(page.locator("#mailtoAll")).toBeChecked();
    await expect(page.locator("#project-list-wrap")).toBeHidden();
    await page.locator("#mailtoPrj").check();
    await expect(page.locator("#project-list-wrap")).toBeVisible();
    await page.locator("#input-project").fill("admin/projectYobi");
    await page.locator("#select-project").click();
    await expect(page.locator("#selected-projects")).toHaveText("admin/projectYobi x");
  }
});
