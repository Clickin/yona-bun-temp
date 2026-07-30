import { readFile } from "node:fs/promises";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/update.tsx", import.meta.url);
const updateTemplate = new URL(
  "../../yona-original/app/views/site/update.scala.html",
  import.meta.url,
);
const siteLayout = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const responsiveBootstrap = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  import.meta.url,
);

const owners = {
  content: "site-update-content",
  grid: "site-update-setting-grid",
  main: "site-update-setting-content-column",
  page: "site-update-page",
  sidebar: "site-update-sidebar-column",
} as const;

type UpdateResponse = {
  currentVersion: string | null;
  error: string | null;
  releaseUrl: string | null;
  versionToUpdate: string | null;
};

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-update-grid-residual" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
}

async function open(page: Page, response: UpdateResponse) {
  await mockSession(page);
  await page.route("**/api/v1/site/update", (route) => route.fulfill({ json: response }));
  await page.goto(`${basePath}/sites/update`);
  await expect(page.locator(`[data-stylex-owner="${owners.page}"]`)).toBeVisible();
}

test("site update residual grid owns the frozen row-fluid and content column", async ({ page }) => {
  const [route, update, layout, bootstrapResponsive] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(updateTemplate, "utf8"),
    readFile(siteLayout, "utf8"),
    readFile(responsiveBootstrap, "utf8"),
  ]);
  expect(update).toContain("@siteMngLayout(message)");
  expect(update).toContain("versionToUpdate != null");
  expect(update).toContain("exception != null");
  expect(layout).toContain('<div class="row-fluid">');
  expect(layout).toContain('<div class="span10">');
  expect(bootstrapResponsive).toContain(".row-fluid:before,");
  expect(bootstrapResponsive).toContain(".row-fluid .span10 {");
  expect(bootstrapResponsive).toContain("width: 82.90598290598291%;");
  expect(bootstrapResponsive).toContain("width: 82.87292817679558%;");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const owner of Object.values(owners)) {
    expect(route).toContain(`data-stylex-owner="${owner}"`);
  }

  for (const [name, response] of [
    [
      "available",
      {
        currentVersion: "1.0.0",
        error: null,
        releaseUrl: "https://example.test/v2",
        versionToUpdate: "2.0.0",
      },
    ],
    ["current", { currentVersion: "1.0.0", error: null, releaseUrl: null, versionToUpdate: null }],
    [
      "error",
      {
        currentVersion: "1.0.0",
        error: "java.lang.IllegalStateException: update feed failed",
        releaseUrl: null,
        versionToUpdate: null,
      },
    ],
  ] as const) {
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
      await open(page, response);
      const content = page.locator(`[data-stylex-owner="${owners.content}"]`);
      const grid = page.locator(`[data-stylex-owner="${owners.grid}"]`);
      const sidebar = page.locator(`[data-stylex-owner="${owners.sidebar}"]`);
      const main = page.locator(`[data-stylex-owner="${owners.main}"]`);
      await expect(content).toBeVisible();
      await expect(grid).toBeVisible();
      await expect(sidebar).toBeVisible();
      await expect(main).toBeVisible();
      await expect(grid).not.toHaveClass(/row-fluid/);
      await expect(main).not.toHaveClass(/span10/);
      const layout = await page.evaluate((ownerMap) => {
        const requireElement = (owner: string) => {
          const element = document.querySelector<HTMLElement>(`[data-stylex-owner="${owner}"]`);
          if (!element) throw new Error(`Missing ${owner}`);
          return element;
        };
        const grid = requireElement(ownerMap.grid);
        const sidebar = requireElement(ownerMap.sidebar);
        const main = requireElement(ownerMap.main);
        const gridBox = grid.getBoundingClientRect();
        const sidebarBox = sidebar.getBoundingClientRect();
        const mainBox = main.getBoundingClientRect();
        return {
          contained: mainBox.left >= gridBox.left && mainBox.right <= gridBox.right,
          mainRatio: mainBox.width / gridBox.width,
          sidebarRatio: sidebarBox.width / gridBox.width,
          stacked: sidebarBox.bottom <= mainBox.top,
        };
      }, owners);
      expect(layout.contained).toBe(true);
      expect(layout.sidebarRatio).toBeCloseTo(viewport.expectedSidebar, 4);
      expect(layout.mainRatio).toBeCloseTo(viewport.expectedMain, 4);
      expect(layout.stacked).toBe(viewport.name === "mobile");
      await expect(page.locator("body")).toContainText(
        name === "available"
          ? "Yoram 2.0.0 is available"
          : name === "current"
            ? "Current version is Yoram 1.0.0"
            : "Failed to check for updates because of the following error:",
      );
    }
  }
});
