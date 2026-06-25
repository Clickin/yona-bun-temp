import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function siteUsersPayload(input: {
  page?: number;
  query?: string;
  siteAdminCount?: number;
  state?: string;
  totalPages?: number;
  users: Array<{
    emailAddress?: string;
    id: number;
    isGuest?: boolean;
    isSiteAdmin?: boolean;
    loginId: string;
    name?: string;
    state?: string;
  }>;
}) {
  return {
    page: input.page ?? 1,
    pageSize: 30,
    query: input.query ?? "",
    siteAdminCount: input.siteAdminCount ?? 1,
    state: input.state ?? "ACTIVE",
    total: input.users.length,
    totalPages: input.totalPages ?? (input.users.length === 0 ? 0 : 1),
    users: input.users.map((user) => ({
      createdAt: "2026-05-17 10:00:00",
      displayName: user.name ?? user.loginId,
      emailAddress: user.emailAddress ?? `${user.loginId}@example.com`,
      id: user.id,
      isGuest: user.isGuest ?? false,
      isSiteAdmin: user.isSiteAdmin ?? false,
      loginId: user.loginId,
      state: user.state ?? "ACTIVE",
    })),
  };
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "siteboss" },
        user: { isSiteAdmin: true, loginId: "siteboss" },
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
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
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        daysAgo: 0,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("site admin user list keeps the legacy shell on a mobile viewport", async ({ page }) => {
  await page.route(apiV1Route("/site/users**"), async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      body: JSON.stringify(
        siteUsersPayload({
          query: url.searchParams.get("query") ?? "",
          state: url.searchParams.get("state") ?? "ACTIVE",
          totalPages: 2,
          users: [{ id: 2, loginId: "member" }],
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto("/yona/sites/userList?state=ACTIVE&query=mem");

  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Users");
  await expect(page.locator(".site-setting-wrap .span10 > .nav-tabs li.active a")).toContainText(
    "Unlocked user",
  );
  await expect(page.locator(".user-list-wrap .listitem")).toHaveCount(1);
  await expect(page.locator(".user-list-wrap .user-id")).toHaveText("@member");
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
});

test("site admin user list preserves legacy shell and toggles user state", async ({ page }) => {
  let promoted = false;
  let locked = false;
  let guest = false;
  let deleted = false;
  let resetPassword = "";
  const requests: string[] = [];

  await page.route(apiV1Route("/site/users**"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);

    if (url.pathname.endsWith("/site/users/member/site-admin/toggle")) {
      promoted = !promoted;
      await route.fulfill({
        body: JSON.stringify({
          user: siteUsersPayload({
            users: [{ id: 2, isSiteAdmin: promoted, loginId: "member" }],
          }).users[0],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    if (url.pathname.endsWith("/site/users/member/account-lock/toggle")) {
      locked = !locked;
      await route.fulfill({
        body: JSON.stringify({
          user: siteUsersPayload({
            users: [{ id: 2, loginId: "member", state: locked ? "LOCKED" : "ACTIVE" }],
          }).users[0],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    if (url.pathname.endsWith("/site/users/member/guest/toggle")) {
      guest = !guest;
      await route.fulfill({
        body: JSON.stringify({
          user: siteUsersPayload({
            users: [{ id: 2, isGuest: guest, loginId: "member" }],
          }).users[0],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    if (url.pathname.endsWith("/password/reset")) {
      resetPassword = "new123";
      await route.fulfill({
        body: JSON.stringify({
          isSuccess: true,
          loginId: "member",
          name: "member",
          newPassword: resetPassword,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    if (request.method() === "DELETE" && url.pathname.endsWith("/site/users/deletee")) {
      deleted = true;
      await route.fulfill({
        body: JSON.stringify({
          user: siteUsersPayload({
            users: [
              {
                emailAddress: "deleted-deletee@noreply.yona.io",
                id: 3,
                loginId: "deletee",
                name: "[DELETED]Deletee",
                state: "DELETED",
              },
            ],
          }).users[0],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    const state = url.searchParams.get("state") ?? "ACTIVE";
    const query = url.searchParams.get("query") ?? "";
    const deleteSearch = query.toLowerCase().includes("del");
    const users =
      state === "ACTIVE" && deleteSearch
        ? deleted
          ? []
          : [{ id: 3, loginId: "deletee", name: "Deletee" }]
        : state === "DELETED" && deleteSearch && deleted
          ? [
              {
                emailAddress: "deleted-deletee@noreply.yona.io",
                id: 3,
                loginId: "deletee",
                name: "[DELETED]Deletee",
                state: "DELETED",
              },
            ]
          : state === "SITE_ADMIN"
            ? [
                { id: 1, isSiteAdmin: true, loginId: "siteboss", name: "Site Boss" },
                ...(promoted ? [{ id: 2, isSiteAdmin: true, loginId: "member" }] : []),
              ]
            : state === "GUEST" && guest
              ? [{ id: 2, isGuest: true, loginId: "member" }]
              : state === "LOCKED" && locked
                ? [{ id: 2, loginId: "member", state: "LOCKED" }]
                : [{ id: 2, isGuest: guest, isSiteAdmin: promoted, loginId: "member" }];

    await route.fulfill({
      body: JSON.stringify(
        siteUsersPayload({
          query,
          siteAdminCount: promoted ? 2 : 1,
          state,
          totalPages: state === "ACTIVE" && query === "mem" ? 2 : undefined,
          users,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/userList?state=ACTIVE&query=mem");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("Users");
  await expect(page.locator(".site-setting-wrap .span10 > .nav-tabs li.active a")).toContainText(
    "Unlocked user",
  );
  await expect(page.locator(".user-list-wrap .listitem")).toHaveCount(1);
  await expect(page.locator(".user-list-wrap .user-id")).toHaveText("@member");
  await expect(page.locator("input[name='state']")).toHaveValue("ACTIVE");
  await expect(page.locator("input[name='query']")).toHaveValue("mem");
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    "/yona/sites/userList?state=ACTIVE&query=mem&pageNum=2",
  );

  await page.locator("[data-request-uri$='/sites/toggleSiteAdminRole/member']").click();
  await expect
    .poll(() => requests.some((request) => request.includes("site-admin/toggle")))
    .toBe(true);

  await page.locator("[data-request-uri*='/sites/toggleAccountLock']").click();
  await expect
    .poll(() => requests.some((request) => request.includes("account-lock/toggle")))
    .toBe(true);

  await page.locator("[data-request-uri*='/sites/toggleGuestMode']").click();
  await expect.poll(() => requests.some((request) => request.includes("guest/toggle"))).toBe(true);

  await page.locator("[data-toggle='reset-password']").click();
  await expect
    .poll(() => requests.some((request) => request.includes("password/reset")))
    .toBe(true);
  await expect(page.locator(".user-list-wrap .alert-success")).toContainText(
    `New password: ${resetPassword}`,
  );

  await page.goto("/yona/sites/userList?state=ACTIVE&query=del");
  await expect(page.locator(".user-list-wrap .user-id")).toHaveText("@deletee");
  const deleteButton = page.locator("[data-toggle='account-delete']");
  await expect(deleteButton).toHaveAttribute("data-href", "/yona/sites/user/delete3");
  await expect(deleteButton).toHaveAttribute("data-request-uri", "/yona/sites/user/delete3");
  await deleteButton.click();
  await expect(page.locator("#alertDeletionWrap")).toBeVisible();
  await expect(page.locator("#userInfo")).toContainText("Deletee(deletee)");
  await page.locator("#accountToggleBtn").click();
  await expect
    .poll(() => requests.some((request) => request === "DELETE /yona/api/v1/site/users/deletee"))
    .toBe(true);
  await expect(page.locator(".user-list-wrap")).toHaveCount(1);
  await expect(page.locator(".warning-none")).toHaveCount(0);

  await page.goto("/yona/sites/userList?state=DELETED&query=del");
  await expect(page.locator(".site-setting-wrap .span10 > .nav-tabs li.active a")).toContainText(
    "Deleted user",
  );
  await expect(page.locator(".user-list-wrap .user-id")).toHaveText("@deletee");
  await expect(page.locator(".user-list-wrap .email")).toHaveText(
    "deleted-deletee@noreply.yona.io",
  );

  await page.goto("/yona/sites/userList?state=GUEST");
  await expect(page.locator(".site-setting-wrap .span10 > .nav-tabs li.active a")).toContainText(
    "Guest User",
  );
  await expect(page.locator(".user-list-wrap .user-id")).toHaveText("@member");
  await expect(page.locator("[data-request-uri*='/sites/toggleGuestMode']")).toContainText(
    "Make Normal",
  );

  await page.goto("/yona/sites/userList?state=SITE_ADMIN");
  await expect(page.locator(".site-setting-wrap .span10 > .nav-tabs li.active a")).toContainText(
    "Site admin",
  );
  await expect(
    page.locator(".site-setting-wrap .span10 > .nav-tabs li.active .num-badge"),
  ).toHaveText("2");
  await expect(page.locator(".user-list-wrap .user-id")).toContainText(["@siteboss", "@member"]);
});
