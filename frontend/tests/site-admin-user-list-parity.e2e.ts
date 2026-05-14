import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ session: null, user: null }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("renders legacy site-admin user list shell and filters without placeholders", async ({
  page,
}) => {
  await page.route(apiV1Route("/sites/users**"), async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get("state") || "ACTIVE";
    const query = url.searchParams.get("query") || "";
    const adminItem = {
      avatarUrl: "https://example.test/admin.png",
      createdAt: "2026-05-01T00:00:00",
      createdLabel: "2026-05-01",
      displayName: "Admin",
      emailAddress: "admin@example.com",
      id: "1",
      isGuest: false,
      isSiteAdmin: true,
      lastStateModifiedAt: "",
      lastStateModifiedLabel: "",
      loginId: "admin",
      state: "active",
    };
    const memberItem = {
      ...adminItem,
      avatarUrl: "https://example.test/member.png",
      displayName: "Member",
      emailAddress: "member@example.com",
      id: "2",
      isSiteAdmin: false,
      loginId: "member",
    };
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: state === "SITE_ADMIN" ? [adminItem] : [memberItem],
        pageNum: 1,
        pageSize: 30,
        query,
        state,
        tabs: [
          { state: "ACTIVE", total: 2 },
          { state: "LOCKED", total: 0 },
          { state: "DELETED", total: 0 },
          { state: "GUEST", total: 0 },
          { state: "SITE_ADMIN", total: 1 },
        ],
        total: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/userList?state=SITE_ADMIN");

  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active")).toContainText("Users");
  await expect(page.locator(".nav-tabs li.active")).toContainText("Site Admin");
  await expect(page.locator(".nav-tabs .num-badge")).toHaveText("1");
  await expect(page.locator(".user-list-wrap")).toBeVisible();
  await expect(page.locator(".user-list-wrap .user-name")).toHaveText("Admin");
  await expect(page.locator(".user-list-wrap .user-id")).toHaveText("@admin");
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);

  await page.goto("/yona/sites/userList?state=ACTIVE&query=mem");
  await expect(page.locator(".form-search input[name='query']")).toHaveValue("mem");
  await expect(page.locator(".nav-tabs li.active")).toContainText("Unlocked");
  await expect(page.locator(".user-list-wrap .user-name")).toHaveText("Member");
  await expect(page.locator(".action-buttons button")).toHaveCount(5);
  await expect(page.locator(".action-buttons button").first()).toBeDisabled();
});

test("renders forbidden shell when site-admin API rejects the viewer", async ({ page }) => {
  await page.route(apiV1Route("/sites/users**"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        error: {
          code: "permission_denied",
          message: "site admin user list is not allowed",
          status: 403,
        },
      }),
      headers: restJsonHeaders,
      status: 403,
    });
  });

  await page.goto("/yona/sites/userList");

  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);
});
