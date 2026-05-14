import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type Member = {
  avatarUrl: string;
  isOwner: boolean;
  loginId: string;
  role: string;
  userId: number;
  userLabel: string;
};

type EnrollmentRequest = {
  avatarUrl: string;
  loginId: string;
  userId: number;
  userLabel: string;
};

const memberResponse = (members: Member[], enrollmentRequests: EnrollmentRequest[] = []) => ({
  enrollmentRequests,
  members,
  permissions: {
    canUpdate: true,
  },
  roleOptions: [
    { label: "user.role.manager", role: "manager" },
    { label: "user.role.member", role: "member" },
  ],
});

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
        session: {
          isAnonymous: false,
          loginId: "owner",
        },
        user: {
          loginId: "owner",
        },
      }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: false,
        loginId: "owner",
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

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/owner/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 2,
        members: [],
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Members parity",
        overviewEditable: false,
        ownerName: "owner",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: true,
        showBoard: false,
        showCode: false,
        showIssue: false,
        showMilestone: false,
        showPullRequest: false,
        showReview: false,
        viewerCanEnroll: false,
        viewerCanUpdate: true,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("renders and mutates the legacy project member management route", async ({ page }) => {
  let members: Member[] = [
    {
      avatarUrl: "/avatars/owner.png",
      isOwner: true,
      loginId: "owner",
      role: "manager",
      userId: 1,
      userLabel: "Owner",
    },
    {
      avatarUrl: "/avatars/bob.png",
      isOwner: false,
      loginId: "bob",
      role: "member",
      userId: 3,
      userLabel: "Bob",
    },
  ];
  let enrollmentRequests: EnrollmentRequest[] = [
    {
      avatarUrl: "/avatars/alice.png",
      loginId: "alice",
      userId: 2,
      userLabel: "Alice",
    },
  ];
  const requests: string[] = [];

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/members"), async (route) => {
    const request = route.request();
    if (request.method() === "GET") {
      await route.fulfill({
        body: JSON.stringify(memberResponse(members, enrollmentRequests)),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    if (request.method() === "POST") {
      expect(request.headers()["x-csrf-token"]).toBe("csrf-123");
      const body = JSON.parse(request.postData() ?? "{}") as { loginId: string };
      requests.push(`add:${body.loginId}`);
      const nextUserId = body.loginId === "alice" ? 2 : 4;
      members = [
        ...members,
        {
          avatarUrl: `/avatars/${body.loginId}.png`,
          isOwner: false,
          loginId: body.loginId,
          role: "member",
          userId: nextUserId,
          userLabel: body.loginId,
        },
      ];
      enrollmentRequests = enrollmentRequests.filter((item) => item.loginId !== body.loginId);
      await route.fulfill({
        body: JSON.stringify(memberResponse(members, enrollmentRequests)),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fallback();
  });

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/members/3"), async (route) => {
    const request = route.request();
    expect(request.headers()["x-csrf-token"]).toBe("csrf-123");
    if (request.method() === "PATCH") {
      const body = JSON.parse(request.postData() ?? "{}") as { role: string };
      requests.push(`role:bob:${body.role}`);
      members = members.map((member) =>
        member.userId === 3 ? { ...member, role: body.role } : member,
      );
      await route.fulfill({
        body: JSON.stringify(memberResponse(members, enrollmentRequests)),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    if (request.method() === "DELETE") {
      requests.push("delete:bob");
      members = members.filter((member) => member.userId !== 3);
      await route.fulfill({
        body: JSON.stringify({
          ...memberResponse(members, enrollmentRequests),
          redirectPath: "/owner/projectYobi/members",
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fallback();
  });

  await page.goto("/yona/owner/projectYobi/members");

  await expect(page.locator(".page-wrap-outer .project-page-wrap")).toBeVisible();
  await expect(page.locator("#subMenuProjectMember")).toBeVisible();
  await expect(page.locator("#addNewMember")).toBeVisible();
  await expect(page.locator("#loginId")).toBeVisible();
  await expect(page.locator(".members.project.row-fluid .member.span6.span-hard-wrap")).toHaveCount(
    2,
  );
  await expect(page.locator('[data-name="roleof-bob"]')).toBeVisible();
  await expect(page.locator(".enrollAcceptBtn")).toBeVisible();

  await page.locator("#loginId").fill("carol");
  await page.locator("#addNewMember").getByRole("button", { name: /add/i }).click();
  await expect.poll(() => requests).toContainEqual("add:carol");
  await expect(page.locator(".member-id", { hasText: "@carol" })).toBeVisible();

  await page.locator('[data-action="apply"][data-login-id="bob"][data-role="manager"]').click();
  await expect.poll(() => requests).toContainEqual("role:bob:manager");
  await expect(page.locator('[data-name="roleof-bob"] .d-label')).toHaveText("user.role.manager");

  await page.locator('[data-action="delete"][data-login-id="bob"]').click();
  await expect.poll(() => requests).toContainEqual("delete:bob");
  await expect(page.locator(".member-id", { hasText: "@bob" })).toHaveCount(0);

  await page.locator(".enrollAcceptBtn").click();
  await expect.poll(() => requests).toContainEqual("add:alice");
  await expect(page.locator(".member-id", { hasText: "@alice" })).toBeVisible();
});
