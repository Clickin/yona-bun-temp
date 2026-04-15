import { expect, test } from "@playwright/test";

const connectJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      rpcBaseUrl: "/yona/rpc",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: null,
        user: null,
      }),
      headers: {
        ...connectJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadCurrentSession", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadAuthUiCapabilities", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ListProjects", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            overview: "Yona project",
            ownerName: "yobi",
            projectName: "projectYobi",
            projectScope: "public",
          },
        ],
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    "**/rpc/yona.pilot.v1.PilotService/ListOrganizations",
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          items: [
            {
              description: "web labs",
              organizationName: "weblabs",
            },
          ],
        }),
        headers: connectJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route("**/rpc/yona.pilot.v1.PilotService/ListProjectIssues", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        items: [
          {
            authorLabel: "Nori",
            commentCount: 3,
            issueNumber: "1",
            state: "open",
            title: "Pilot issue",
            updatedLabel: "2026-04-15",
          },
        ],
        ownerName: "admin",
        projectName: "projectYobi",
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadProjectContainer", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 1,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Project issue parity route",
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: false,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadIssueDetail", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        issueNumber: "1",
        ownerName: "admin",
        projectName: "projectYobi",
        state: "open",
        title: "Pilot issue",
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/SignOut", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });
});

test("shell routing smoke covers home, auth, public directories, and deep placeholders", async ({
  page,
}) => {
  await page.goto("/yona/");
  await expect(page).toHaveTitle("Yona");
  await expect(page.getByRole("heading", { name: "Legacy Route Foundation" })).toBeVisible();

  await page.goto("/yona/users/loginform");
  await expect(page).toHaveTitle("Login");
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();

  await page.goto("/yona/projects?filter=yobi&pageNum=1");
  await expect(page).toHaveTitle("Project List");
  await expect(page.getByText("projectYobi")).toBeVisible();

  await page.goto("/yona/orgs?filter=lab&pageNum=1");
  await expect(page).toHaveTitle("Organization List");
  await expect(page.getByText("weblabs")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issues?pageNum=2");
  await expect(page).toHaveTitle("Issues");
  await expect(page.getByRole("heading", { name: "Issue List" })).toBeVisible();
});

test("programmatic internal navigation keeps browser URL in sync under the mounted base path", async ({
  page,
}) => {
  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadCurrentSession", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });
  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadWorkspaceOverview", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        favoriteProjects: [],
        recentProjects: [],
        session: {
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door",
        },
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });
  await page.goto("/yona/me");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/yona\/users\/loginform$/);
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();
});

test("canonical user settings path stays mounted under the base path", async ({ page }) => {
  await page.goto("/yona/user/editform/password");
  await expect(page).toHaveURL(/\/yona\/users\/loginform\?redirectUrl=%2Fuser%2Feditform%2Fpassword$/);
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();
});

test("organization admin routes redirect anonymous viewers to login with a return path", async ({ page }) => {
  await page.goto("/yona/organizations/weblabs/members");
  await expect(page).toHaveURL(/\/yona\/users\/loginform\?redirectUrl=%2Forganizations%2Fweblabs%2Fmembers$/);
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();

  await page.goto("/yona/organizations/weblabs/deleteForm");
  await expect(page).toHaveURL(/\/yona\/users\/loginform\?redirectUrl=%2Forganizations%2Fweblabs%2FdeleteForm$/);
  await expect(page.getByRole("heading", { name: "Login for Yona" })).toBeVisible();
});

test("organization admin routes render forbidden and not-found shells for authenticated viewers", async ({ page }) => {
  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadCurrentSession", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        emailAddress: "door@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "door",
        userLabel: "Door",
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });
  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadWorkspaceOverview", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        favoriteProjects: [],
        recentProjects: [],
        session: {
          defaultLandingPath: "/me",
          emailAddress: "door@example.com",
          isAnonymous: false,
          isConfirmed: true,
          isSiteAdmin: false,
          loginId: "door",
          userLabel: "Door",
        },
      }),
      headers: connectJsonHeaders,
      status: 200,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadOrganizationAdmin", async (route) => {
    if (route.request().postDataJSON()?.organizationName === "missinglabs") {
      await route.fulfill({
        body: JSON.stringify({
          code: "not_found",
          message: "organization not found",
        }),
        headers: connectJsonHeaders,
        status: 404,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        code: "permission_denied",
        message: "organization update is not allowed",
      }),
      headers: connectJsonHeaders,
      status: 403,
    });
  });

  await page.goto("/yona/organizations/weblabs/members");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
  await expect(page.getByText("/organizations/weblabs/members")).toBeVisible();

  await page.goto("/yona/organizations/missinglabs/deleteForm");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByText("/organizations/missinglabs/deleteForm")).toBeVisible();
});

test("project issue routes render data-backed issue list and detail screens", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/issues?pageNum=1");
  await expect(page.getByText("Pilot issue")).toBeVisible();
  await expect(page.getByText("2026-04-15")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.getByRole("heading", { name: "Pilot issue" })).toBeVisible();
  await expect(page.getByText("#1")).toBeVisible();
  await expect(page.getByText("open")).toBeVisible();
});

test("project issue routes render forbidden and not-found shells when issue reads fail", async ({ page }) => {
  await page.route("**/rpc/yona.pilot.v1.PilotService/ListProjectIssues", async (route) => {
    const payload = route.request().postDataJSON();
    if (payload?.ownerName === "missing" || payload?.projectName === "missingYobi") {
      await route.fulfill({
        body: JSON.stringify({
          code: "not_found",
          message: "project not found",
        }),
        headers: connectJsonHeaders,
        status: 404,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        code: "permission_denied",
        message: "issue list is not allowed",
      }),
      headers: connectJsonHeaders,
      status: 403,
    });
  });

  await page.route("**/rpc/yona.pilot.v1.PilotService/ReadIssueDetail", async (route) => {
    if (route.request().postDataJSON()?.issueNumber === "999") {
      await route.fulfill({
        body: JSON.stringify({
          code: "not_found",
          message: "issue not found",
        }),
        headers: connectJsonHeaders,
        status: 404,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        code: "permission_denied",
        message: "issue read is not allowed",
      }),
      headers: connectJsonHeaders,
      status: 403,
    });
  });

  await page.goto("/yona/admin/projectYobi/issues?pageNum=1");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
  await expect(page.getByText("/admin/projectYobi/issues")).toBeVisible();

  await page.goto("/yona/missing/projectYobi/issues?pageNum=1");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByText("/missing/projectYobi/issues")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issue/1");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();
  await expect(page.getByText("/admin/projectYobi/issue/1")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/issue/999");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
  await expect(page.getByText("/admin/projectYobi/issue/999")).toBeVisible();
});
