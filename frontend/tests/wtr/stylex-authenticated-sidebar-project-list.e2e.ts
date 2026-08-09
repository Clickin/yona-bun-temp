import { expect, test, type Page, type Route } from "../wtr-compat.ts";
import { readFile } from "../wtr-compat.ts";

// Browser harness: no filesystem. resolve only builds page.screenshot paths
// (a recorded shim gap); strip leading slashes so cwd-joined src paths stay
// bare-relative for the readFileSync/readFile fixture mapping.
const resolve = (...parts: string[]) => parts.join("/").replace(/^\/+/, "");
// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths.
const mkdirSync = () => undefined;

const routeSource = new URL("../src/routes/-home-route-screen.tsx", import.meta.url);
const sidebarSource = new URL("../../yona-original/app/views/sidebar.scala.html", import.meta.url);
const contentListSource = new URL(
  "../../yona-original/app/views/common/usermenu_tab_content_list.scala.html",
  import.meta.url,
);
const yobiSource = new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url);
const usermenuSource = new URL(
  "../../yona-original/app/assets/stylesheets/less/_usermenu.less",
  import.meta.url,
);
const screenshotDirectory = resolve("output/playwright/stylex-authenticated-sidebar-project-list");

const yobiImports = [
  "_variables.less",
  "_mixins.less",
  "_common.less",
  "_sprites.less",
  "_page.less",
  "_tippy.less",
  "_scrollbar.less",
  "_responsive.less",
  "_yobiUI.less",
  "_temporary.less",
  "_markdown.less",
  "_migration.less",
  "_override.less",
];

test("authenticated sidebar project and organization rows own frozen list margin", async () => {
  const [route, sidebar, contentList, yobi, usermenu] = await Promise.all([
    readFile(routeSource, "utf8"),
    readFile(sidebarSource, "utf8"),
    readFile(contentListSource, "utf8"),
    readFile(yobiSource, "utf8"),
    readFile(usermenuSource, "utf8"),
  ]);
  expect(sidebar).toContain('class="myOrganizationList"');
  expect(sidebar).toContain('class="myProjectList"');
  expect(sidebar).toContain('id="myOrganizationList"');
  expect(sidebar).toContain('id="myProjectList"');
  expect(contentList).toContain(
    '<div class="tab-pane user-project-list active" id="myOrganizationList">',
  );
  expect(contentList).toContain('<div class="tab-pane user-project-list" id="myProjectList">');
  expect(yobi.trim().split("\n")).toEqual(yobiImports.map((file) => `@import "less/${file}";`));
  expect(usermenu).toMatch(/\.user-project-list\s*\{[\s\S]*?li\s*\{\s*margin-left:\s*0;\s*\}/);
  expect(route).toContain("authenticatedSidenavProjectOrganizationListStyles = stylex.create({");
  expect(route).toContain("item: { marginLeft: 0 }");
  expect(route).toContain("authenticatedSidenavFavoriteOrganizationRowStyles.row");
  expect(route).toContain("authenticatedSidenavFavoriteProjectRowStyles.row");
  expect(route).toContain("authenticatedSidenavDirectProjectRowStyles.row");
  expect(route).toContain("authenticated-sidenav-favorite-organization-rows");
  expect(route).toContain("authenticated-sidenav-favorite-project-rows");
  expect(route).toContain("authenticated-sidenav-direct-project-rows");
  expect(route).not.toContain('style={{ display: "none" }');
});

async function installAuthenticatedHome(page: Page) {
  await page.addInitScript(() => {
    window.localStorage.setItem("sidebarActiveMenu", "myOrganizationList");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: "/yona",
      feedbackUrl: "",
      hideProjectListing: false,
      supportedLanguages: ["en-US"],
    };
  });
  const session = {
    actorId: 1,
    avatarUrl: "",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: false,
    loginId: "admin",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/notifications?*", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { hasMore: false, items: [], total: 0 },
    }),
  );
  await page.route("**/api/v1/workspace", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        favoriteOrganizations: [
          {
            isFavorited: true,
            organizationId: 11,
            organizationName: "weblabs",
            projectCount: 1,
            projects: [
              {
                isFavorited: false,
                ownerName: "weblabs",
                projectId: 32,
                projectName: "nested-project",
                overview: "Nested project",
              },
            ],
          },
        ],
        favoriteProjects: [],
        organizations: [],
        ownProjects: [],
        watchedProjects: [
          {
            isFavorited: false,
            ownerName: "outside",
            projectId: 41,
            projectName: "direct-project",
            overview: "Direct project",
          },
        ],
        memberProjects: [],
        recentProjects: [
          {
            isFavorited: false,
            ownerName: "outside",
            projectId: 42,
            projectName: "recent-project",
            overview: "Recent project",
          },
        ],
        profile: { loginId: "admin" },
        issueItems: [],
        recentIssues: [],
      },
    }),
  );
}

async function assertContainedRow(page: Page, row: ReturnType<Page["locator"]>) {
  const metrics = await row.evaluate((node) => {
    const box = node.getBoundingClientRect();
    const frame = node.closest('[data-stylex-owner="authenticated-sidenav-content-frame"]');
    const frameBox = frame?.getBoundingClientRect();
    return {
      marginLeft: getComputedStyle(node).marginLeft,
      left: box.left,
      right: box.right,
      frameLeft: frameBox?.left,
      frameRight: frameBox?.right,
    };
  });
  expect(metrics.marginLeft).toBe("0px");
  expect(metrics.frameLeft).not.toBeUndefined();
  expect(metrics.frameRight).not.toBeUndefined();
  expect(metrics.left).toBeGreaterThanOrEqual(metrics.frameLeft!);
  expect(metrics.right).toBeLessThanOrEqual(metrics.frameRight! + 1);
}

async function assertDocumentContained(page: Page) {
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 8);
}

for (const fallbackOff of [false, true]) {
  test(`authenticated sidebar project/organization lists ${fallbackOff ? "fallback-off" : "normal"}`, async ({
    page,
  }) => {
    await installAuthenticatedHome(page);
    await page.setViewportSize({ height: 900, width: 1366 });
    await page.goto("/yona/");
    await page.getByRole("button", { name: /User menu, Shortcut \(F\)/ }).click();
    if (fallbackOff) {
      await page
        .locator('link[href*="legacy-fallback.css"]')
        .evaluateAll((nodes) => nodes.forEach((node) => node.remove()));
    }
    const sidenav = page.locator('[data-stylex-owner="authenticated-site-sidenav-shell"]');
    await expect(sidenav).toBeVisible();
    const favoritePane = page.locator("#myOrganizationList");
    const organizationRow = favoritePane.locator(
      'li[data-stylex-owner="authenticated-sidenav-favorite-organization-rows"]',
    );
    await expect(organizationRow).toBeVisible();
    await assertContainedRow(page, organizationRow);
    await organizationRow.locator("button.organization-toggle").click();
    const nestedProject = favoritePane.locator(
      'li[data-stylex-owner="authenticated-sidenav-favorite-project-rows"]',
    );
    await expect(nestedProject).toBeVisible();
    await assertContainedRow(page, nestedProject);
    const favoriteSearch = favoritePane.getByPlaceholder("Type name");
    await favoriteSearch.fill("nested");
    await expect(nestedProject).toBeVisible();
    await favoriteSearch.fill("");
    await page.getByRole("button", { exact: true, name: "Project" }).click();
    const projectPane = page.locator("#myProjectList");
    const projectRow = projectPane
      .locator('li[data-stylex-owner="authenticated-sidenav-direct-project-rows"]')
      .filter({ hasText: "recent-project" });
    await expect(projectRow).toBeVisible();
    await assertContainedRow(page, projectRow);
    await assertDocumentContained(page);
    const screenshotMode = fallbackOff ? "fallback-off" : "normal";
    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `authenticated-sidebar-desktop-${screenshotMode}.png`),
    });
    await page.setViewportSize({ height: 844, width: 390 });
    await expect(sidenav).toBeVisible();
    await assertContainedRow(page, projectRow);
    await assertDocumentContained(page);
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `authenticated-sidebar-mobile-${screenshotMode}.png`),
    });
  });
}
