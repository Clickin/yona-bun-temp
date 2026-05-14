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

test("renders legacy site-admin project list shell and filters without placeholders", async ({
  page,
}) => {
  await page.route(apiV1Route("/sites/projects**"), async (route) => {
    const url = new URL(route.request().url());
    const filter = url.searchParams.get("filter") || "";
    await route.fulfill({
      body: JSON.stringify({
        filter,
        hasMore: false,
        items: [
          {
            createdAt: "2026-05-01T00:00:00",
            createdLabel: "2026-05-01",
            deletePath: "/sites/project/delete/7",
            id: "7",
            logoUrl: "",
            overview: "Needle overview",
            ownerName: "admin",
            projectName: "needleProject",
            projectPath: "/admin/needleProject",
          },
        ],
        pageNum: 1,
        pageSize: 25,
        total: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/projectList?filter=needle");

  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active")).toContainText("Projects");
  await expect(page.locator(".form-search input[name='filter']")).toHaveValue("needle");
  await expect(page.locator(".project-list-wrap")).toBeVisible();
  await expect(page.locator(".project-list-wrap .project-name")).toHaveText("admin/needleProject");
  await expect(page.locator("[data-toggle='delete-project']")).toHaveAttribute(
    "data-href",
    "/yona/sites/project/delete/7",
  );
  await expect(page.locator("[data-toggle='delete-project']")).toBeDisabled();
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);
});

test("renders legacy site-admin post list shell without placeholders", async ({ page }) => {
  await page.route(apiV1Route("/sites/posts**"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: [
          {
            authorAvatarUrl: "https://example.test/admin.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            commentCount: 2,
            commentsPath: "/admin/projectYobi/post/1#comments",
            createdAt: "2026-05-01T00:00:00",
            createdLabel: "2026-05-01",
            id: "11",
            ownerName: "admin",
            postNumber: "1",
            postPath: "/admin/projectYobi/post/1",
            projectName: "projectYobi",
            projectPath: "/admin/projectYobi",
            title: "Admin post",
          },
        ],
        pageNum: 1,
        pageSize: 30,
        total: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/postList");

  await expect(page.locator(".site-setting-nav li.active")).toContainText("Posts");
  await expect(page.locator(".post-list-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-project")).toHaveText("admin/projectYobi");
  await expect(page.locator(".post-list-wrap .post-title")).toHaveText("Admin post");
  await expect(page.locator(".post-meta-wrap .post-meta-item").first()).toHaveText("Admin");
  await expect(page.locator(".post-comments")).toContainText("2");
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);
});

test("renders legacy site-admin issue list shell and state tabs without placeholders", async ({
  page,
}) => {
  await page.route(apiV1Route("/sites/issues**"), async (route) => {
    const url = new URL(route.request().url());
    const state = (url.searchParams.get("state") || "open").toUpperCase();
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: [
          {
            authorAvatarUrl: "https://example.test/admin.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            commentCount: 3,
            commentsPath: "/admin/projectYobi/issue/12#comments",
            createdAt: "2026-05-01T00:00:00",
            createdLabel: "2026-05-01",
            id: "31",
            issueNumber: "12",
            issuePath: "/admin/projectYobi/issue/12",
            ownerName: "admin",
            projectName: "projectYobi",
            projectPath: "/admin/projectYobi",
            state,
            title: "Closed issue",
          },
        ],
        pageNum: 1,
        pageSize: 30,
        state,
        tabs: [
          { state: "OPEN", total: 1 },
          { state: "CLOSED", total: 1 },
        ],
        total: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/issueList?state=closed");

  await expect(page.locator(".site-setting-nav li.active")).toContainText("Issues");
  await expect(page.locator(".nav-tabs li.active")).toContainText("Closed");
  await expect(page.locator(".post-list-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap .post-project")).toHaveText("admin/projectYobi");
  await expect(page.locator(".post-list-wrap .post-title")).toHaveText("Closed issue");
  await expect(page.locator(".post-meta-wrap .post-meta-item").first()).toHaveText("Admin");
  await expect(page.locator(".post-comments")).toContainText("3");
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);
});
