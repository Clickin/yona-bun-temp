import { expect, test, type Page } from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

const SITE_LAYOUT_SOURCE = new URL(
  "../../yona-original/app/views/site/siteMngLayout.scala.html",
  import.meta.url,
);
const SITE_FORBIDDEN_SOURCE = new URL(
  "../../yona-original/app/views/error/forbidden_default.scala.html",
  import.meta.url,
);
const SITE_ROUTE_GUARD_SOURCE = new URL("../src/routes/sites.tsx", import.meta.url);

test("site management parent guard retains the legacy siteMngLayout boundary", () => {
  const legacyLayout = readFileSync(SITE_LAYOUT_SOURCE, "utf8");
  const legacyForbidden = readFileSync(SITE_FORBIDDEN_SOURCE, "utf8");
  const routeGuard = readFileSync(SITE_ROUTE_GUARD_SOURCE, "utf8");

  expect(legacyLayout).toContain("utils.MenuType.SITE_SETTING");
  expect(legacyLayout).toContain('class="site-setting-wrap"');
  expect(legacyLayout).toContain("routes.SiteApp.userList()");
  expect(legacyForbidden).toContain('class="error-wrap"');
  expect(legacyForbidden).toContain("Messages(messageKey)");
  expect(routeGuard).toContain('createFileRoute("/sites")');
  expect(routeGuard).toContain("session.isAnonymous || !session.isSiteAdmin");
  expect(routeGuard).toContain("DefaultSearchErrorBody");
});

test("anonymous direct site-management URL preserves its URL and renders the legacy forbidden boundary", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const siteApiRequests = await mockSiteAccess(page, {
    isAnonymous: true,
    isSiteAdmin: false,
    loginId: "anonymous",
  });

  await page.goto(`${basePath}/sites/userList`);

  await expect(page).toHaveURL(`${basePath}/sites/userList`);
  await expect(page.locator('[data-owner="site-user-list-page-wrap-outer"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="site-user-list-title-heading"]')).toHaveCount(0);
  await expect(page.locator(".error-wrap .ico.ico-err2")).toBeVisible();
  await expect(page.locator(".error-wrap p")).toHaveText(
    "You are not authorized to access this page or not logged in.",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveText("Home");
  expect(siteApiRequests()).toBe(0);
});

test("non-admin direct site-management URL preserves its URL and renders the legacy forbidden boundary", async ({
  page,
}) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const siteApiRequests = await mockSiteAccess(page, {
    isAnonymous: false,
    isSiteAdmin: false,
    loginId: "member",
  });

  await page.goto(`${basePath}/sites/userList`);

  await expect(page).toHaveURL(`${basePath}/sites/userList`);
  await expect(page.locator('[data-owner="site-user-list-page-wrap-outer"]')).toHaveCount(0);
  await expect(page.locator('[data-owner="site-user-list-title-heading"]')).toHaveCount(0);
  await expect(page.locator(".error-wrap .ico.ico-err2")).toBeVisible();
  await expect(page.locator(".error-wrap p")).toHaveText(
    "You are not authorized to access this page or not logged in.",
  );
  await expect(page.locator(".error-wrap .ybtn.ybtn-primary")).toHaveText("Home");
  expect(siteApiRequests()).toBe(0);
});

test("site admin can open the legacy users management content", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockSiteAccess(page, {
    isAnonymous: false,
    isSiteAdmin: true,
    loginId: "siteboss",
  });

  await page.goto(`${basePath}/sites/userList`);

  await expect(page).toHaveURL(`${basePath}/sites/userList`);
  await expect(page.locator('[data-owner="site-user-list-page-wrap-outer"]')).toBeVisible();
  await expect(page.locator('[data-owner="site-user-list-title-heading"]')).toHaveText("Users");
  await expect(page.locator('[data-owner="site-user-list-sidebar-nav"]')).toBeVisible();
});

async function mockSiteAccess(
  page: Page,
  session: { isAnonymous: boolean; isSiteAdmin: boolean; loginId: string },
) {
  let siteApiRequests = 0;
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: session.isAnonymous ? "" : "1",
        isAnonymous: session.isAnonymous,
        isConfirmed: !session.isAnonymous,
        isGuest: false,
        isSiteAdmin: session.isSiteAdmin,
        loginId: session.loginId,
        userLabel: session.loginId,
      },
    }),
  );
  await page.route("**/api/v1/site/**", (route) => {
    siteApiRequests += 1;
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/site/users")) {
      return route.fulfill({
        contentType: "application/json",
        json: {
          page: 1,
          pageSize: 30,
          query: "",
          siteAdminCount: 1,
          state: "ACTIVE",
          total: 0,
          totalPages: 1,
          users: [],
        },
      });
    }
    if (path.endsWith("/site/update")) {
      return route.fulfill({
        contentType: "application/json",
        json: {
          currentVersion: "1.0.0",
          error: null,
          message: "site.update.isNotNecessary",
          releaseUrl: null,
          versionToUpdate: null,
        },
      });
    }
    return route.fulfill({ status: 404 });
  });
  return () => siteApiRequests;
}
