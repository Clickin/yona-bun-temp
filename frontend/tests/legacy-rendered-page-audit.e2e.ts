import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

function projectContainer() {
  return {
    backgroundUrl: "",
    boardCount: 1,
    cloneUrl: "https://example.com/admin/sample.git",
    codeMemberOnly: false,
    currentMilestone: null,
    defaultReviewerCount: 1,
    defaultTab: "home",
    enrollmentRequested: false,
    isFavorited: false,
    isForked: false,
    isUsingReviewerCount: false,
    isWatching: false,
    logoUrl: "",
    maxReviewerCount: 1,
    memberCount: 1,
    members: [
      {
        avatarUrl: "/avatars/admin.png",
        loginId: "admin",
        role: "manager",
        userLabel: "Admin",
      },
    ],
    openIssueCount: 1,
    openPullRequestCount: 0,
    organizationName: "",
    originOwnerName: "",
    originProjectName: "",
    overview: "Sample project",
    overviewEditable: true,
    ownerName: "admin",
    projectName: "sample",
    projectScope: "public",
    reviewCount: 0,
    showAdmin: true,
    showBoard: true,
    showCode: true,
    showIssue: true,
    showMilestone: true,
    showPullRequest: true,
    showReview: true,
    viewerCanEnroll: false,
    viewerCanUpdate: true,
    viewerCanWatch: true,
    watchCount: 1,
  };
}

function workspaceOverview() {
  return {
    apiToken: "token",
    daysAgo: 0,
    defaultLandingPath: "/me",
    emails: [{ emailAddress: "admin@example.com", id: 1, valid: true }],
    favoriteProjects: [],
    issueItems: [],
    memberProjects: [],
    profile: {
      avatarUrl: "/avatars/admin.png",
      connectedSocialProviders: [],
      displayName: "Admin",
      englishName: "",
      isBlocked: false,
      isGuest: false,
      isSiteAdmin: true,
      loginId: "admin",
      primaryEmailAddress: "admin@example.com",
      sinceLabel: "2026-06-23",
    },
    pullRequestItems: [],
    recentProjects: [],
    watchedProjects: [
      {
        notifications: [{ enabled: true, eventType: "ISSUE", label: "issue" }],
        ownerName: "admin",
        projectId: "1",
        projectName: "sample",
      },
    ],
  };
}

async function routeAuditApis(page: Page) {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        session: { loginId: "admin" },
        user: { isSiteAdmin: true, loginId: "admin" },
      }),
      headers: {
        ...restJsonHeaders,
        "x-csrf-token": "csrf-123",
      },
      status: 200,
    });
  });

  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname.replace(/^\/yona\/api\/v1/, "");
    let body: unknown = {};

    if (path === "/session") {
      body = {
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
      };
    } else if (path === "/auth/capabilities") {
      body = {
        emailVerificationEnabled: false,
        enabledSocialProviders: [],
        signupRequireConfirm: false,
        socialLoginOnly: false,
      };
    } else if (path === "/workspace") {
      body = workspaceOverview();
    } else if (path === "/users/admin/profile") {
      body = {
        daysAgo: 0,
        issueItems: [],
        memberProjects: [],
        profile: workspaceOverview().profile,
        pullRequestItems: [],
        selected: "activity",
        viewerCanEditProfile: true,
      };
    } else if (path === "/workspace/files") {
      body = { files: [], filter: "", page: 1, pageSize: 50, total: 0, totalPages: 0 };
    } else if (path === "/notifications") {
      body = { hasMore: false, items: [], total: 0 };
    } else if (path === "/projects/form-options") {
      body = {
        ownerOptions: [{ organization: false, ownerName: "admin", selected: true }],
        selectedOwnerName: "admin",
      };
    } else if (path.endsWith("/admin/projects/sample/container")) {
      body = projectContainer();
    } else if (path.endsWith("/admin/projects/sample/settings")) {
      body = projectContainer();
    } else if (path.endsWith("/admin/projects/sample/milestones")) {
      body = { milestones: [] };
    } else if (
      path.endsWith("/admin/projects/sample/issues/parent-options") ||
      path.includes("/projects/admin/sample/issues/parent-options")
    ) {
      body = { items: [] };
    } else if (path === "/projects/admin/sample/posts") {
      body = {
        items: [],
        notices: [],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        readme: null,
        totalCount: 0,
      };
    } else if (path === "/user/issues") {
      body = {
        closedIssueCount: 0,
        filter: "assigned",
        items: [],
        openIssueCount: 0,
        pageNum: 1,
        pageSize: 15,
        sideFilterCounts: {},
        state: "open",
        totalCount: 0,
        viewerUserId: 1,
      };
    }

    await route.fulfill({
      body: JSON.stringify(body),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

test.beforeEach(async ({ page }) => {
  await routeAuditApis(page);
});

async function expectLegacySignals(page: Page, anchors: string[], structuralTokens = anchors) {
  await page.waitForLoadState("networkidle");
  for (const anchor of anchors) {
    await expect
      .poll(() => page.locator("body").evaluate((body) => body.innerHTML), {
        message: `body contains ${anchor}`,
      })
      .toContain(anchor);
  }
  for (const anchor of structuralTokens) {
    await expect
      .poll(() => page.locator(`#${anchor}, [name="${anchor}"], .${anchor}`).count(), {
        message: `body has structural token ${anchor}`,
      })
      .toBeGreaterThan(0);
  }
}

test("renders legacy audited anchors for /lostPassword", async ({ page }) => {
  await page.goto("/yona/lostPassword");
  await expectLegacySignals(page, ["login-form-wrap", "email"]);
});

test("renders legacy audited anchors for /_help", async ({ page }) => {
  await page.goto("/yona/_help");
  await expectLegacySignals(page, ["site-breadcrumb-outer", "qas", "answer-wrap"]);
});

test("renders legacy audited anchors for /projectform", async ({ page }) => {
  await page.goto("/yona/projectform");
  await expectLegacySignals(page, ["newProjectForm", "project-name", "advanced-options"]);
});

test("renders legacy audited anchors for /_import", async ({ page }) => {
  await page.goto("/yona/_import");
  await expectLegacySignals(page, ["importGit", "url", "project-name"]);
});

test("renders legacy audited anchors for /organizations/new", async ({ page }) => {
  await page.goto("/yona/organizations/new");
  await expectLegacySignals(page, ["page-wrap-outer", "name"]);
});

test("renders legacy audited anchors for /notifications", async ({ page }) => {
  await page.goto("/yona/notifications");
  await expectLegacySignals(page, ["notification"], []);
});

test("renders legacy audited anchors for /notification", async ({ page }) => {
  await page.goto("/yona/notification?from=0&limit=20");
  await expectLegacySignals(page, ["notification"], []);
});

test("renders legacy audited anchors for /user/issues", async ({ page }) => {
  await page.goto("/yona/user/issues");
  await expectLegacySignals(page, ["page-wrap-outer"]);
});

test("renders legacy audited anchors for /user/files", async ({ page }) => {
  await page.goto("/yona/user/files");
  await expectLegacySignals(page, ["attachment-files"]);
});

test("renders legacy audited anchors for /user/editform", async ({ page }) => {
  await page.goto("/yona/user/editform");
  await expectLegacySignals(page, ["page-wrap-outer"]);
});

test("renders legacy audited anchors for /user/editform/notifications", async ({ page }) => {
  await page.goto("/yona/user/editform/notifications");
  await expectLegacySignals(page, ["page-wrap-outer", "notification"], ["page-wrap-outer"]);
});

test("renders legacy audited anchors for /user/editform/emails", async ({ page }) => {
  await page.goto("/yona/user/editform/emails");
  await expectLegacySignals(page, ["page-wrap-outer", "email"]);
});

test("renders legacy audited anchors for /user/editform/token", async ({ page }) => {
  await page.goto("/yona/user/editform/token");
  await expectLegacySignals(page, ["page-wrap-outer", "token"], ["page-wrap-outer"]);
});

test("renders legacy audited anchors for /sites/data", async ({ page }) => {
  await page.goto("/yona/sites/data");
  await expectLegacySignals(page, ["site-breadcrumb-outer", "data"]);
});

test("renders legacy audited anchors for /admin profile", async ({ page }) => {
  await page.goto("/yona/admin");
  await expectLegacySignals(page, ["user-info-box", "page-wrap-outer"]);
});

test("renders legacy audited anchors for project home", async ({ page }) => {
  await page.goto("/yona/admin/sample");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project issue form", async ({ page }) => {
  await page.goto("/yona/admin/sample/issueform");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project settings", async ({ page }) => {
  await page.goto("/yona/admin/sample/settingform");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});
