import { readFile } from "../wtr-compat.ts";
import { expect, test } from "../wtr-compat.ts";

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
const pageStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_page.less",
  import.meta.url,
);
const responsiveStyles = new URL(
  "../../yona-original/app/assets/stylesheets/less/_responsive.less",
  import.meta.url,
);
const responsiveBootstrap = new URL(
  "../../yona-original/public/bootstrap/css/bootstrap-responsive.css",
  import.meta.url,
);

const owners = {
  content: "site-update-setting-wrap",
  page: "site-update-page",
  sidebarColumn: "site-update-sidebar-column",
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
      headers: { "x-csrf-token": "csrf-site-update-page-shell" },
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

test("site update page shell owns the legacy site-management frame", async ({ page }) => {
  const [route, update, layout, pageLess, responsiveLess, bootstrapResponsive] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(updateTemplate, "utf8"),
    readFile(siteLayout, "utf8"),
    readFile(pageStyles, "utf8"),
    readFile(responsiveStyles, "utf8"),
    readFile(responsiveBootstrap, "utf8"),
  ]);
  expect(update).toContain("@siteMngLayout(message)");
  expect(layout).toContain('<div class="page-wrap-outer">');
  expect(layout).toContain('<div class="site-setting-wrap">');
  expect(layout).toContain('<div class="span2">');
  expect(pageLess).toContain(".page-wrap-outer {");
  expect(pageLess).toContain("min-height: 450px;");
  expect(pageLess).toContain("margin-top: 10px;");
  expect(pageLess).toContain(".site-setting-wrap {");
  expect(responsiveLess).toContain(".page-wrap-outer {");
  expect(responsiveLess).toContain("min-width: 10px !important;");
  expect(responsiveLess).toContain("padding: 0 !important;");
  expect(bootstrapResponsive).toContain(".row-fluid .span2 {");
  expect(bootstrapResponsive).toContain("width: 14.52991452991453%;");
  expect(bootstrapResponsive).toContain("width: 14.3646408839779%;");
  expect(bootstrapResponsive).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsive).toContain("float: none;");
  expect(route).toContain(`data-stylex-owner="${owners.page}"`);
  expect(route).toContain(`data-stylex-owner="${owners.content}"`);
  expect(route).toContain(`data-stylex-owner="${owners.sidebarColumn}"`);

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
    await page.setViewportSize({ width: 1366, height: 900 });
    await open(page, response);
    const pageShell = page.locator(`[data-stylex-owner="${owners.page}"]`);
    const content = page.locator(`[data-stylex-owner="${owners.content}"]`);
    const sidebar = page.locator(`[data-stylex-owner="${owners.sidebarColumn}"]`);
    await expect(content).toBeVisible();
    await expect(sidebar).toBeVisible();
    await expect(pageShell).toHaveClass(/page-wrap-outer/);
    await expect(content).toHaveClass(/site-setting-wrap/);
    await expect(sidebar).toHaveClass(/span2/);
    expect(
      await page.evaluate(
        ({ contentOwner, pageOwner, sidebarOwner }) => {
          const requireBox = (selector: string) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) throw new Error(`Missing ${selector}`);
            return element.getBoundingClientRect();
          };
          const pageBox = requireBox(`[data-stylex-owner="${pageOwner}"]`);
          const contentBox = requireBox(`[data-stylex-owner="${contentOwner}"]`);
          const sidebarBox = requireBox(`[data-stylex-owner="${sidebarOwner}"]`);
          const page = document.querySelector<HTMLElement>(`[data-stylex-owner="${pageOwner}"]`);
          if (!page) throw new Error("Missing page shell");
          const pageStyle = getComputedStyle(page);
          return {
            contentContainsSidebar:
              sidebarBox.left >= contentBox.left && sidebarBox.right <= contentBox.right,
            pageMarginTop: pageStyle.marginTop,
            pageMinHeight: pageStyle.minHeight,
            sidebarRatio: sidebarBox.width / contentBox.width,
          };
        },
        {
          contentOwner: owners.content,
          pageOwner: owners.page,
          sidebarOwner: owners.sidebarColumn,
        },
      ),
    ).toMatchObject({
      contentContainsSidebar: true,
      pageMarginTop: "10px",
      pageMinHeight: "450px",
    });
    expect(
      await page.locator(`[data-stylex-owner="${owners.sidebarColumn}"]`).evaluate((element) => {
        const sidebar = element.getBoundingClientRect();
        const content = element.parentElement?.parentElement?.getBoundingClientRect();
        return content ? sidebar.width / content.width : null;
      }),
    ).toBeCloseTo(0.14892935578330893, 4);

    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(
        ({ contentOwner, pageOwner, sidebarOwner }) => {
          const requireBox = (selector: string) => {
            const element = document.querySelector<HTMLElement>(selector);
            if (!element) throw new Error(`Missing ${selector}`);
            return element.getBoundingClientRect();
          };
          const pageBox = requireBox(`[data-stylex-owner="${pageOwner}"]`);
          const contentBox = requireBox(`[data-stylex-owner="${contentOwner}"]`);
          const sidebarBox = requireBox(`[data-stylex-owner="${sidebarOwner}"]`);
          const mainBox = requireBox(
            `[data-stylex-owner="${contentOwner}"] > .row-fluid > .span10`,
          );
          const sidebar = document.querySelector<HTMLElement>(
            `[data-stylex-owner="${sidebarOwner}"]`,
          );
          if (!sidebar) throw new Error("Missing sidebar shell");
          return {
            pageContained: pageBox.left >= 0 && pageBox.right <= window.innerWidth,
            sidebarFloat: getComputedStyle(sidebar).float,
            sidebarStacksAboveContent: sidebarBox.bottom <= mainBox.top,
            sidebarWidthMatchesContent: Math.abs(sidebarBox.width - contentBox.width) <= 1,
          };
        },
        {
          contentOwner: owners.content,
          pageOwner: owners.page,
          sidebarOwner: owners.sidebarColumn,
        },
      ),
    ).toEqual({
      pageContained: true,
      // The legacy site-management layout links bootstrap.css + yobi.css only
      // (never bootstrap-responsive.css), so the sidebar keeps its base span2
      // width and float at every viewport — it does not stack on mobile.
      sidebarFloat: "left",
      sidebarStacksAboveContent: false,
      sidebarWidthMatchesContent: false,
    });
    await expect(page.locator("body")).toContainText(
      name === "available"
        ? "Yoram 2.0.0 is available"
        : name === "current"
          ? "Current version is Yoram 1.0.0"
          : "Failed to check for updates because of the following error:",
    );
  }
});
