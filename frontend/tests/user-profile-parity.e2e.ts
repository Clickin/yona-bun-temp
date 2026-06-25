import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function profilePayload(input: {
  issueItems?: unknown[];
  loginId?: string;
  memberProjects?: unknown[];
  pullRequestItems?: unknown[];
  selected?: string;
}) {
  const loginId = input.loginId ?? "door";
  return {
    daysAgo: 7,
    issueItems: input.issueItems ?? [],
    memberProjects: input.memberProjects ?? [],
    profile: {
      avatarUrl: "",
      connectedSocialProviders: [],
      displayName: loginId === "door" ? "Door" : "Admin",
      englishName: loginId === "door" ? "Door English" : "Admin English",
      isBlocked: false,
      isSiteAdmin: false,
      loginId,
      primaryEmailAddress: "",
      sinceLabel: "May 16, 2026",
    },
    pullRequestItems: input.pullRequestItems ?? [],
    selected: input.selected ?? "projects",
    viewerCanEditProfile: loginId === "admin",
  };
}

function profileProject() {
  return {
    createdLabel: "May 16, 2026",
    lastPushedLabel: "May 16, 2026",
    memberCount: 2,
    ownerName: "owner",
    overview: "Visible member project",
    projectName: "publicYobi",
    projectScope: "public",
    watchCount: 3,
  };
}

function profileIssue() {
  return {
    assigneeLabel: "Door",
    assigneeLoginId: "door",
    authorLabel: "Door",
    authorLoginId: "door",
    commentCount: 1,
    issueNumber: 11,
    ownerName: "owner",
    projectName: "publicYobi",
    state: "open",
    title: "Visible issue",
    updatedLabel: "Jun 26, 2026",
  };
}

async function authenticateAsDoor(page: Page) {
  await page.unroute("**/api/auth/session");
  await page.unroute(apiV1Route("/session"));
  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "admin" },
        user: { isSiteAdmin: false, loginId: "admin" },
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
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "admin",
        userLabel: "Admin",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        apiToken: "",
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: [],
        issueItems: [profileIssue()],
        memberProjects: [profileProject()],
        profile: profilePayload({ loginId: "admin", selected: "issues" }).profile,
        pullRequestItems: [],
        recentProjects: [],
        selected: "issues",
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
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
        session: null,
        user: null,
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
        defaultLandingPath: "/me",
        isAnonymous: true,
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

test("public user profile route preserves the legacy user view shell", async ({ page }) => {
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 7,
        issueItems: [],
        memberProjects: [
          {
            createdLabel: "May 16, 2026",
            lastPushedLabel: "May 16, 2026",
            memberCount: 2,
            ownerName: "owner",
            overview: "Visible member project",
            projectName: "publicYobi",
            projectScope: "public",
            watchCount: 3,
          },
        ],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door",
          englishName: "Door English",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "May 16, 2026",
        },
        pullRequestItems: [],
        selected: "projects",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/door?daysAgo=7&selected=projects");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".page-wrap-outer .user-box")).toBeVisible();
  await expect(page.locator(".user-info-box .loginid")).toHaveText("@door");
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");
  await expect(page.locator("#projects")).toBeVisible();
  await expect(page.locator(".user-streams.all-projects .project")).toHaveCount(1);
  await expect(page.locator('a.project-name[href="/yona/owner/publicYobi"]')).toBeVisible();
  await expect(page.getByText("Default landing")).toHaveCount(0);
  await expect(page.getByText("Sign out")).toHaveCount(0);
  await expect(page.getByText("Edit Profile")).toHaveCount(0);
});

test("public user profile tabs preserve the legacy selected query state on click", async ({
  page,
}) => {
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 7,
        issueItems: [
          {
            assigneeLabel: "Door",
            assigneeLoginId: "door",
            authorLabel: "Door",
            authorLoginId: "door",
            commentCount: 0,
            issueNumber: 11,
            ownerName: "owner",
            projectName: "publicYobi",
            state: "open",
            title: "Visible issue",
            updatedLabel: "Jun 26, 2026",
          },
        ],
        memberProjects: [
          {
            createdLabel: "May 16, 2026",
            lastPushedLabel: "May 16, 2026",
            memberCount: 2,
            ownerName: "owner",
            overview: "Visible member project",
            projectName: "publicYobi",
            projectScope: "public",
            watchCount: 3,
          },
        ],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Door",
          englishName: "Door English",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "door",
          primaryEmailAddress: "",
          sinceLabel: "May 16, 2026",
        },
        pullRequestItems: [
          {
            commentCount: 0,
            contributorLabel: "Door",
            contributorLoginId: "door",
            ownerName: "owner",
            projectName: "publicYobi",
            pullRequestNumber: 3,
            receiverLabel: "Owner",
            receiverLoginId: "owner",
            state: "open",
            title: "Visible pull request",
            updatedLabel: "Jun 26, 2026",
          },
        ],
        selected: "projects",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/door?daysAgo=7&selected=projects");
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#projects']")).toBeVisible();
  await expect(page.locator("#projects")).toHaveClass(/active/);
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");

  await page.locator(".nav.nav-tabs > li a[href='#pullRequests']").click();
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#pullRequests']")).toBeVisible();
  await expect(page.locator("#pullRequests")).toHaveClass(/active/);
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");
  await expect(page).toHaveURL(/\/yona\/door\?daysAgo=7&selected=projects$/);

  await page.locator(".nav.nav-tabs > li a[href='#issues']").click();
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#issues']")).toBeVisible();
  await expect(page.locator("#issues")).toHaveClass(/active/);
  await expect(page.locator("#daysAgoBtn")).toHaveValue("7");
  await expect(page).toHaveURL(/\/yona\/door\?daysAgo=7&selected=projects$/);
});

test("organization names on the user profile endpoint redirect to the organization route", async ({
  page,
}) => {
  await page.route(apiV1Route("/users/weblabs/profile"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        daysAgo: 14,
        issueItems: [],
        memberProjects: [],
        profile: null,
        pullRequestItems: [],
        redirectPath: "/organizations/weblabs",
        selected: "issues",
        viewerCanEditProfile: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/organizations/weblabs/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "web labs",
        enrollmentRequested: false,
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: false,
        viewerCanEnroll: true,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/weblabs");
  await expect(page).toHaveURL(/\/yona\/organizations\/weblabs$/);
});

test("profile, user issues, and user files preserve legacy mobile shells", async ({ page }) => {
  const apiRequests: string[] = [];
  await authenticateAsDoor(page);
  await page.route(/\/api\/v1\/users\/door\/profile(?:\?.*)?$/, async (route) => {
    apiRequests.push(new URL(route.request().url()).pathname);
    await route.fulfill({
      body: JSON.stringify(
        profilePayload({
          issueItems: [profileIssue()],
          memberProjects: [profileProject()],
          selected: "projects",
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/user/issues**"), async (route) => {
    const url = new URL(route.request().url());
    apiRequests.push(`${url.pathname}${url.search}`);
    await route.fulfill({
      body: JSON.stringify({
        closedIssueCount: 0,
        filter: url.searchParams.get("filter") ?? "assigned",
        items: [
          {
            assigneeLabel: "Admin",
            assigneeLoginId: "admin",
            authorLabel: "Door",
            authorLoginId: "door",
            commentCount: 1,
            dueDateLabel: "Jun 30, 2026",
            dueDateOverdue: false,
            id: 101,
            issueNumber: 11,
            labels: [{ color: "#f2c94c", id: 7, name: "bug" }],
            milestoneTitle: "RC",
            ownerName: "owner",
            projectName: "publicYobi",
            state: "open",
            title: "Visible issue",
            updatedLabel: "Jun 26, 2026",
            voterCount: 0,
            watcherCount: 1,
          },
        ],
        openIssueCount: 1,
        pageNum: Number(url.searchParams.get("pageNum") ?? "1"),
        pageSize: 15,
        sideFilterCounts: { favorite: 0, mentioned: 0, shared: 0 },
        state: url.searchParams.get("state") ?? "open",
        totalCount: 1,
        viewerUserId: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/workspace/files**"), async (route) => {
    const url = new URL(route.request().url());
    apiRequests.push(`${url.pathname}${url.search}`);
    await route.fulfill({
      body: JSON.stringify({
        files: [
          {
            containerId: 11,
            containerType: "ISSUE_POST",
            createdLabel: "Jun 26, 2026",
            downloadUrl: "/yona/files/501/download",
            id: 501,
            locationHref: "/yona/owner/publicYobi/issue/11",
            locationLabel: "owner / publicYobi #11",
            mimeType: "image/png",
            name: "screen.png",
            previewUrl: "/yona/files/501",
            size: 2048,
            sizeLabel: "2 KB",
            url: "/yona/files/501",
          },
        ],
        filter: "screen",
        page: 1,
        pageSize: 30,
        total: 1,
        totalPages: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.setViewportSize({ height: 844, width: 390 });

  await page.goto("/yona/me?selected=issues");
  await expect(page.locator(".page-wrap-outer .user-box")).toBeVisible();
  await expect(page.locator(".user-info-box .loginid")).toHaveText("@admin");
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#issues']")).toBeVisible();
  await expect(page.locator("#issues .post-list-wrap .post-item")).toHaveCount(1);
  await expect(page.locator("#issues")).toContainText("Visible issue");
  await expect(page.locator("body")).not.toContainText("userinfo.");

  await page.goto("/yona/door?daysAgo=7&selected=projects");
  await expect(page.locator(".page-wrap-outer .user-box")).toBeVisible();
  await expect(page.locator(".user-info-box .loginid")).toHaveText("@door");
  await expect(page.locator(".nav.nav-tabs > li.active a[href='#projects']")).toBeVisible();
  await expect(page.locator(".user-streams.all-projects .project")).toHaveCount(1);
  await expect(page.locator("a.project-name[href='/yona/owner/publicYobi']")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("project.is.empty");

  await page.goto("/yona/user/issues?filter=assigned&state=open");
  await expect(
    page.locator(".page-wrap-outer .nav.nav-tabs a[href='/yona/user/issues']"),
  ).toBeVisible();
  await expect(page.locator(".row-fluid.issue-list-wrap")).toBeVisible();
  await expect(page.locator(".post-list-wrap.my-issues .post-item")).toHaveCount(1);
  await expect(page.locator(".post-list-wrap.my-issues")).toContainText("Visible issue");
  await expect(page.locator("body")).not.toContainText("issue.list.assignedToMe");
  await expect
    .poll(() => apiRequests.some((request) => request.includes("/api/v1/user/issues")))
    .toBe(true);

  await page.goto("/yona/user/files?filter=screen");
  await expect(
    page.locator(".page-wrap-outer .nav.nav-tabs a[href='/yona/user/files']"),
  ).toBeVisible();
  await expect(page.locator(".attachment-files")).toBeVisible();
  await expect(page.locator(".attachment-file-detail")).toHaveCount(1);
  await expect(page.locator(".attachment-file-detail .file-name")).toContainText("screen.png");
  await expect(page.locator(".attachment-file-detail .file-location")).toContainText(
    "owner / publicYobi #11",
  );
  await expect(page.locator("body")).not.toContainText("user.files");
  await expect
    .poll(() => apiRequests.some((request) => request.includes("/api/v1/workspace/files")))
    .toBe(true);
});
