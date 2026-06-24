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
  await expect(page.locator(".label.owner")).toContainText("user.role.owner");
  await expect(page.locator('[data-name="roleof-member"]')).toBeVisible();
  await expect(
    page.locator('[data-action="apply"][data-href="/owner/projectYobi/member/2/edit"]', {
      hasText: "user.role.manager",
    }),
  ).toBeVisible();
  await expect(
    page.locator('[data-action="delete"][data-href="/owner/projectYobi/member/2/delete"]'),
  ).toBeVisible();
  await expect(page.getByText("Sign-up request (1)")).toBeVisible();

  await page.locator("#loginId").fill("newbie");
  await page.locator("#addNewMember").getByRole("button", { name: "Add" }).click();
  await expect(page.locator(".member-id", { hasText: "@newbie" })).toBeVisible();

  await page
    .locator('[data-action="apply"][data-href="/owner/projectYobi/member/2/edit"]', {
      hasText: "user.role.manager",
    })
    .click();
  await expect(page.locator('[data-name="roleof-member"] .d-label')).toContainText(
    "user.role.manager",
  );

  await page.locator(".enrollAcceptBtn").click();
  await expect(page.getByText("Sign-up request")).toHaveCount(0);
  await expect(page.locator(".member-id", { hasText: "@guest" })).toBeVisible();

  await page
    .locator('[data-action="delete"][data-href="/owner/projectYobi/member/2/delete"]')
    .click();
  await expect(page.locator(".member-id", { hasText: "@member" })).toHaveCount(0);
});
