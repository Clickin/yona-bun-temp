import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: node:fs/promises readFile has no browser equivalent; the
// compat readFileSync is a sync XHR over the same middleware. Promise-wrap it
// so the spec's await/Promise.all call sites keep their shape.
const readFile = (path: string | URL, encoding?: string | null): Promise<string> =>
  Promise.resolve(readFileSync(path, encoding ?? "utf8"));

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const routeSource = new URL("../src/routes/sites/mail.tsx", import.meta.url);
const mailTemplate = new URL("../../yona-original/app/views/site/mail.scala.html", import.meta.url);
const siteLayout = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
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
  content: "site-mail-content",
  grid: "site-mail-setting-grid",
  page: "site-mail-page",
  sidebar: "site-mail-sidebar-column",
  main: "site-mail-setting-content-column",
} as const;

type MailOptions = { notConfiguredItems: string[]; sender: string; sent: boolean };

async function mockSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-site-mail-page-grid-columns" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
}

async function open(page: Page, response: MailOptions, suffix = "") {
  await mockSession(page);
  await page.route("**/api/v1/site/mail", (route) => route.fulfill({ json: response }));
  await page.goto(`${basePath}/sites/mail${suffix}`);
  await expect(page.locator(`[data-owner="${owners.page}"]`)).toBeVisible();
}

test("site mail page grid and columns own the frozen site-management layout", async ({ page }) => {
  const [route, mail, layout, less, bootstrapResponsive] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(mailTemplate, "utf8"),
    readFile(siteLayout, "utf8"),
    readFile(pageStyles, "utf8"),
    readFile(responsiveBootstrap, "utf8"),
  ]);
  expect(mail).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="page-wrap-outer">');
  expect(layout).toContain('<div class="site-setting-wrap">');
  expect(layout).toContain('<div class="row-fluid">');
  expect(layout).toContain('<div class="span2">');
  expect(layout).toContain('<div class="span10">');
  expect(less).toContain("min-height: 450px;");
  expect(less).toContain("margin-top: 10px;");
  expect(less).toContain(".site-setting-wrap {");
  expect(bootstrapResponsive).toContain("width: 14.52991452991453%;");
  expect(bootstrapResponsive).toContain("width: 82.90598290598291%;");
  expect(bootstrapResponsive).toContain("width: 14.3646408839779%;");
  expect(bootstrapResponsive).toContain("width: 82.87292817679558%;");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  for (const owner of Object.values(owners)) {
    expect(route).toContain(`data-owner="${owner}"`);
  }

  for (const [name, suffix] of [
    ["configured", ""],
    ["error", "?errorMessage=validation.invalidEmail"],
  ] as const) {
    for (const viewport of [
      {
        expectedMain: 0.8297872340425532,
        expectedSidebar: 0.14893617021276595,
        height: 900,
        name: "desktop",
        width: 1366,
      },
      {
        expectedMain: 0.8297872340425532,
        expectedSidebar: 0.14893617021276595,
        height: 844,
        name: "tablet",
        width: 900,
      },
      {
        expectedMain: 0.8297872340425532,
        expectedSidebar: 0.14893617021276595,
        height: 844,
        name: "mobile",
        width: 390,
      },
    ]) {
      await page.setViewportSize(viewport);
      await open(
        page,
        { notConfiguredItems: [], sender: "site-admin@yona.local", sent: false },
        suffix,
      );
      const pageShell = page.locator(`[data-owner="${owners.page}"]`);
      const content = page.locator(`[data-owner="${owners.content}"]`);
      const grid = page.locator(`[data-owner="${owners.grid}"]`);
      const sidebar = page.locator(`[data-owner="${owners.sidebar}"]`);
      const main = page.locator(`[data-owner="${owners.main}"]`);
      await expect(content).toBeVisible();
      await expect(grid).toBeVisible();
      await expect(sidebar).toBeVisible();
      await expect(main).toBeVisible();
      // App keeps the frozen site-management fallback classes (page-wrap-outer,
      // site-setting-wrap, row-fluid, span2, span10) alongside Style owners;
      // the legacy layout rules still paint the grid (ratios below).
      await expect(pageShell).toHaveClass(/page-wrap-outer/);
      await expect(content).toHaveClass(/site-setting-wrap/);
      await expect(grid).toHaveClass(/row-fluid/);
      await expect(sidebar).toHaveClass(/span2/);
      await expect(main).toHaveClass(/span10/);
      const layout = await page.evaluate((ownerMap) => {
        const requireElement = (owner: string) => {
          const element = document.querySelector<HTMLElement>(`[data-owner="${owner}"]`);
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
      // The legacy page never links bootstrap-responsive.css (layout.scala.html
      // loads bootstrap.css + yobi.css only), so base span widths apply at every
      // viewport: floats stay left and the columns never stack.
      expect(layout.sidebarFloat).toBe("left");
      expect(layout.stacked).toBe(false);
      await expect(page.locator("body")).toContainText(
        name === "configured" ? "Send email" : "Failed to send mail.",
      );
    }
  }
});
