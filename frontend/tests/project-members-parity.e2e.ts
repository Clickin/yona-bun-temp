import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type ProjectMember = {
  avatarUrl: string;
  isOwner: boolean;
  loginId: string;
  role: string;
  userId: number;
  userLabel: string;
};

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
        session: { loginId: "owner" },
        user: { loginId: "owner" },
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
        emailAddress: "owner@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "owner",
        userLabel: "Owner",
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

test("project members route renders and mutates the legacy member management surface", async ({
  page,
}) => {
  const memberRequests: Array<{ body: unknown; method: string; path: string; csrf?: string }> = [];
  let members: ProjectMember[] = [
    {
      avatarUrl: "/avatars/owner.png",
      isOwner: true,
      loginId: "owner",
      role: "manager",
      userId: 1,
      userLabel: "Owner",
    },
    {
      avatarUrl: "/avatars/member.png",
      isOwner: false,
      loginId: "member",
      role: "member",
      userId: 2,
      userLabel: "Member",
    },
  ];
  let enrollmentRequests = [
    {
      avatarUrl: "/avatars/guest.png",
      loginId: "guest",
      userId: 3,
      userLabel: "Guest",
    },
  ];
  const memberPayload = (redirectPath?: string) => ({
    enrollmentRequests,
    members,
    ownerName: "owner",
    projectName: "projectYobi",
    redirectPath,
    roleOptions: [
      { label: "manager", role: "manager" },
      { label: "member", role: "member" },
    ],
    viewerCanUpdate: true,
  });

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/members"), async (route) => {
    if (route.request().method() === "POST") {
      memberRequests.push({
        body: route.request().postDataJSON(),
        csrf: route.request().headers()["x-csrf-token"],
        method: route.request().method(),
        path: new URL(route.request().url()).pathname.replace("/yona/api/v1", ""),
      });
      const body = route.request().postDataJSON() as { loginId: string };
      if (body.loginId === "guest") {
        enrollmentRequests = [];
        members = [
          ...members,
          {
            avatarUrl: "/avatars/guest.png",
            isOwner: false,
            loginId: "guest",
            role: "member",
            userId: 3,
            userLabel: "Guest",
          },
        ];
      } else {
        members = [
          ...members,
          {
            avatarUrl: "",
            isOwner: false,
            loginId: body.loginId,
            role: "member",
            userId: 4,
            userLabel: body.loginId,
          },
        ];
      }
    }
    await route.fulfill({
      body: JSON.stringify(memberPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(
    /\/api\/v1\/owners\/owner\/projects\/projectYobi\/members\/\d+$/,
    async (route) => {
      const userId = Number(route.request().url().split("/").pop());
      memberRequests.push({
        body: route.request().method() === "PATCH" ? route.request().postDataJSON() : null,
        csrf: route.request().headers()["x-csrf-token"],
        method: route.request().method(),
        path: new URL(route.request().url()).pathname.replace("/yona/api/v1", ""),
      });
      if (route.request().method() === "PATCH") {
        const body = route.request().postDataJSON() as { role: string };
        members = members.map((member) =>
          member.userId === userId ? { ...member, role: body.role } : member,
        );
        await route.fulfill({
          body: JSON.stringify(memberPayload()),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }
      members = members.filter((member) => member.userId !== userId);
      await route.fulfill({
        body: JSON.stringify(memberPayload("/owner/projectYobi/members")),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto("/yona/owner/projectYobi/members");
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator("#loginId")).toHaveAttribute("placeholder", "Add new member ID.");
  await expect(page.locator("ul.members.project.row-fluid")).toBeVisible();
  await expect(page.locator(".label.owner")).toContainText("Project owner");
  await expect(page.locator('[data-name="roleof-member"]')).toBeVisible();
  await expect(
    page.locator('[data-action="apply"][data-href="/owner/projectYobi/member/2/edit"]', {
      hasText: "Manager",
    }),
  ).toBeVisible();
  await expect(
    page.locator('[data-action="delete"][data-href="/owner/projectYobi/member/2/delete"]'),
  ).toBeVisible();
  await expect(page.getByText("Sign-up request (1)")).toBeVisible();

  await page.locator("#loginId").fill("newbie");
  await page.locator("#addNewMember").getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".member-id", { hasText: "@newbie" })).toBeVisible();
  expect(memberRequests.at(-1)).toEqual({
    body: { loginId: "newbie" },
    csrf: "csrf-123",
    method: "POST",
    path: "/owners/owner/projects/projectYobi/members",
  });

  await page
    .locator('[data-action="apply"][data-href="/owner/projectYobi/member/2/edit"]', {
      hasText: "Manager",
    })
    .click();
  await expect(page.locator('[data-name="roleof-member"] .d-label')).toContainText("Manager");
  expect(memberRequests.at(-1)).toEqual({
    body: { role: "manager" },
    csrf: "csrf-123",
    method: "PATCH",
    path: "/owners/owner/projects/projectYobi/members/2",
  });

  await page.locator(".enrollAcceptBtn").click();
  await expect(page.getByText("Sign-up request")).toHaveCount(0);
  await expect(page.locator(".member-id", { hasText: "@guest" })).toBeVisible();
  expect(memberRequests.at(-1)).toEqual({
    body: { loginId: "guest" },
    csrf: "csrf-123",
    method: "POST",
    path: "/owners/owner/projects/projectYobi/members",
  });

  await page
    .locator('[data-action="delete"][data-href="/owner/projectYobi/member/2/delete"]')
    .click();
  await expect(page.locator(".member-id", { hasText: "@member" })).toHaveCount(0);
  expect(memberRequests.at(-1)).toEqual({
    body: null,
    csrf: "csrf-123",
    method: "DELETE",
    path: "/owners/owner/projects/projectYobi/members/2",
  });
});

test("project members route renders the legacy forbidden shell for non-updaters", async ({
  page,
}) => {
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/members"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        error: {
          code: "permission_denied",
          message: "forbidden",
          status: 403,
        },
      }),
      headers: restJsonHeaders,
      status: 403,
    });
  });

  await page.goto("/yona/owner/projectYobi/members");
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");
  await expect(page.locator("#addNewMember")).toHaveCount(0);
  await expect(page.locator('[data-action="apply"]')).toHaveCount(0);
  await expect(page.locator('[data-action="delete"]')).toHaveCount(0);
});
