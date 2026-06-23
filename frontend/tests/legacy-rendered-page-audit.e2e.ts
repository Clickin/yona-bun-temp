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

function sampleProjectItem() {
  return {
    createdDate: "2026-06-23",
    isPublic: true,
    memberCount: 1,
    ownerName: "admin",
    projectName: "sample",
    projectScope: "public",
    role: "manager",
    updatedDate: "2026-06-23",
  };
}

function sampleUser() {
  return {
    avatarUrl: "/avatars/admin.png",
    isOwner: true,
    loginId: "admin",
    role: "manager",
    userId: 1,
    userLabel: "Admin",
  };
}

type RouteAuditOptions = {
  issueBodyMarkdown?: string;
  issueTitle?: string;
};

async function routeAuditApis(page: Page, options: RouteAuditOptions = {}) {
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
    } else if (path === "/projects") {
      body = { items: [sampleProjectItem()], pageNum: 1, pageSize: 15, totalCount: 1 };
    } else if (path === "/projects/form-options") {
      body = {
        ownerOptions: [{ organization: false, ownerName: "admin", selected: true }],
        selectedOwnerName: "admin",
      };
    } else if (
      path.endsWith("/admin/projects/sample/container") ||
      path.endsWith("/admin/projects/sample")
    ) {
      body = projectContainer();
    } else if (path.endsWith("/admin/projects/sample/settings")) {
      body = projectContainer();
    } else if (path.endsWith("/admin/projects/sample/milestones")) {
      body = { milestones: [] };
    } else if (path.endsWith("/admin/projects/sample/labels")) {
      body = { labels: [] };
    } else if (
      path.endsWith("/admin/projects/sample/issues/1") ||
      path === "/projects/admin/sample/issues/1"
    ) {
      body = {
        assignee: null,
        attachments: [],
        author: sampleUser(),
        bodyMarkdown: options.issueBodyMarkdown ?? "Issue body",
        comments: [],
        id: 1,
        issueNumber: 1,
        labels: [],
        sharers: [],
        state: "open",
        timeline: [],
        title: options.issueTitle ?? "Sample issue",
      };
    } else if (
      path.endsWith("/admin/projects/sample/issues") ||
      path === "/projects/admin/sample/issues"
    ) {
      body = {
        closedIssueCount: 0,
        items: [],
        openIssueCount: 0,
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        state: "open",
        totalCount: 0,
      };
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
    } else if (path === "/projects/admin/sample/posts/form-options") {
      body = {
        canMarkNotice: false,
        canMarkReadme: false,
        defaultPermissions: { canCreate: true },
        labels: [],
      };
    } else if (path === "/projects/admin/sample/code") {
      body = {
        branch: "main",
        branches: [{ defaultBranch: true, name: "main" }],
        breadcrumbs: [],
        entries: [],
        ownerName: "admin",
        path: "",
        projectName: "sample",
      };
    } else if (path.endsWith("/admin/projects/sample/members")) {
      body = {
        enrollmentRequests: [],
        members: [sampleUser()],
        ownerName: "admin",
        projectName: "sample",
        roleOptions: [{ label: "Manager", role: "manager" }],
        viewerCanUpdate: true,
      };
    } else if (path.endsWith("/admin/projects/sample/watchers")) {
      body = { ownerName: "admin", projectName: "sample", totalCount: 1, watchers: [sampleUser()] };
    } else if (path.endsWith("/admin/projects/sample/webhooks")) {
      body = {
        deliveries: [],
        ownerName: "admin",
        projectName: "sample",
        viewerCanUpdate: true,
        webhookTypes: ["SIMPLE", "JSON", "DETAIL_SLACK", "DETAIL_HANGOUT_CHAT"],
        webhooks: [],
      };
    } else if (path.endsWith("/admin/projects/sample/fork-options")) {
      body = {
        canFork: true,
        existingForks: [],
        ownerOptions: [{ organization: false, ownerName: "admin", selected: true }],
        selected: { ownerName: "admin", projectName: "sample-fork" },
      };
    } else if (path.endsWith("/admin/projects/sample/change-vcs")) {
      body = {
        currentVcs: "GIT",
        nextVcs: "SUBVERSION",
        ownerName: "admin",
        projectName: "sample",
        viewerCanChange: true,
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
  await expect(page.locator("#mySidenav")).toHaveCount(1);
  await expect(page.locator("#usermenu-tab-content-list")).toHaveCount(1);
  await expect(page.locator("#myOrganizationList")).toHaveCount(1);
  await expect(page.locator("#myProjectList")).toHaveCount(1);
  await expect(page.locator("#myRecentIssueList")).toHaveCount(1);
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

test("renders legacy audited anchors for logged-in /", async ({ page }) => {
  await page.goto("/yona/");
  await expectLegacySignals(page, ["gnb-outer", "admin-logged-in-affix"]);
});

test("renders legacy audited anchors for /users/loginform", async ({ page }) => {
  await page.goto("/yona/users/loginform");
  await expectLegacySignals(page, ["login-form-wrap", "loginIdOrEmail", "password"]);
});

test("renders legacy audited anchors for /users/signupform", async ({ page }) => {
  await page.goto("/yona/users/signupform");
  await expectLegacySignals(page, ["signup-form-wrap", "loginId", "email"]);
});

test("renders legacy audited anchors for /_help", async ({ page }) => {
  await page.goto("/yona/_help");
  await expectLegacySignals(page, ["site-breadcrumb-outer", "qas", "answer-wrap"]);
});

test("renders legacy audited anchors for /projects", async ({ page }) => {
  await page.goto("/yona/projects");
  await expectLegacySignals(page, ["all-projects"]);
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

test("renders legacy audited anchors for /sites/mail", async ({ page }) => {
  await page.goto("/yona/sites/mail");
  await expectLegacySignals(page, ["site-breadcrumb-outer", "mail"], ["site-breadcrumb-outer"]);
});

test("renders legacy audited anchors for /sites/massmail", async ({ page }) => {
  await page.goto("/yona/sites/massmail");
  await expectLegacySignals(page, ["site-breadcrumb-outer", "mail"], ["site-breadcrumb-outer"]);
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

test("renders legacy audited anchors for project issues", async ({ page }) => {
  await page.goto("/yona/admin/sample/issues");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project issue detail", async ({ page }) => {
  await page.goto("/yona/admin/sample/issue/1");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("does not execute XSS payloads rendered through legacy issue detail surface", async ({
  page,
}) => {
  await page.unroute("**/api/v1/**");
  await routeAuditApis(page, {
    issueBodyMarkdown:
      '![xss](x" onerror="window.__legacyAuditXss = true") <script>window.__legacyAuditXss = true</script>',
    issueTitle: '<img src=x onerror="window.__legacyAuditTitleXss = true">',
  });

  await page.goto("/yona/admin/sample/issue/1");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
  await expect(page.locator("script", { hasText: "__legacyAuditXss" })).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as Window & { __legacyAuditXss?: boolean }).__legacyAuditXss),
      ),
    )
    .toBe(false);
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean((window as Window & { __legacyAuditTitleXss?: boolean }).__legacyAuditTitleXss),
      ),
    )
    .toBe(false);
});

test("renders legacy audited anchors for project issue labels", async ({ page }) => {
  await page.goto("/yona/admin/sample/issue/labelsform");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project boards", async ({ page }) => {
  await page.goto("/yona/admin/sample/posts");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project board form", async ({ page }) => {
  await page.goto("/yona/admin/sample/postform");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project milestones", async ({ page }) => {
  await page.goto("/yona/admin/sample/milestones");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project milestone form", async ({ page }) => {
  await page.goto("/yona/admin/sample/newMilestoneForm");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project pull requests", async ({ page }) => {
  await page.goto("/yona/admin/sample/pullRequests");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project reviews", async ({ page }) => {
  await page.goto("/yona/admin/sample/reviews");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project code", async ({ page }) => {
  await page.goto("/yona/admin/sample/code");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project members", async ({ page }) => {
  await page.goto("/yona/admin/sample/members");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project watchers", async ({ page }) => {
  await page.goto("/yona/admin/sample/watchers");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project settings", async ({ page }) => {
  await page.goto("/yona/admin/sample/settingform");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project webhooks", async ({ page }) => {
  await page.goto("/yona/admin/sample/webhooks");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project delete", async ({ page }) => {
  await page.goto("/yona/admin/sample/deleteform");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project transfer", async ({ page }) => {
  await page.goto("/yona/admin/sample/transfer");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project fork", async ({ page }) => {
  await page.goto("/yona/admin/sample/newFork");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});

test("renders legacy audited anchors for project statistics", async ({ page }) => {
  await page.goto("/yona/admin/sample/statistics");
  await expectLegacySignals(page, ["project-header-outer"]);
});

test("renders legacy audited anchors for project VCS change", async ({ page }) => {
  await page.goto("/yona/admin/sample/changeVCS");
  await expectLegacySignals(page, ["project-header-outer", "project-menu-outer"]);
});
