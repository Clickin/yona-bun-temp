import { expect, test, type Page, type Route } from "../wtr-compat.ts";

async function expectLegacySiteLayout(page: Page, owners: readonly string[]) {
  for (const owner of owners) {
    const locator = page.locator(`[data-owner="${owner}"]`);
    await expect(locator).toBeVisible();
  }
}

async function mockMassMailSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-massmail" },
      json: { isAnonymous: false, isSiteAdmin: true },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/projects", (route) =>
    route.fulfill({ json: { projects: [{ ownerName: "admin", projectName: "projectYobi" }] } }),
  );
}

async function mockSecretSetup(page: Page) {
  await page.route("**/api/v1/auth/capabilities", (route) =>
    route.fulfill({ json: { secretSetupRequired: true } }),
  );
  await page.route("**/api/v1/session", (route) => route.fulfill({ json: { isAnonymous: true } }));
}

async function mockProjectListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-project-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/projects?*", (route) =>
    route.fulfill({
      json: {
        filter: "road",
        page: 1,
        pageSize: 20,
        projects: [
          {
            createdAt: "2026-06-29",
            id: 77,
            ownerName: "acme",
            overview: "Release planning",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockUserListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-user-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/users?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        query: "",
        siteAdminCount: 1,
        state: "ACTIVE",
        total: 1,
        totalPages: 1,
        users: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            createdAt: "2026-06-28",
            displayName: "Alice",
            emailAddress: "alice@example.com",
            id: 1,
            isGuest: false,
            isSiteAdmin: false,
            lastStateModifiedAt: "",
            loginId: "alice",
            state: "ACTIVE",
          },
        ],
      },
    }),
  );
}

async function mockPostListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-post-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  await page.route("**/api/v1/session", fulfill);
  await page.route("**/api/auth/session", fulfill);
  await page.route("**/api/v1/auth/session", fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/posts?*", (route) =>
    route.fulfill({
      json: {
        page: 1,
        pageSize: 20,
        posts: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            authorName: "Alice Example",
            commentCount: 3,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 14:30",
            ownerName: "acme",
            postNumber: "7",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            title: "Release checklist",
          },
        ],
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockIssueListSession(page: Page) {
  const fulfill = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-issue-list" },
      json: { isAnonymous: false, isConfirmed: true, isSiteAdmin: true, loginId: "siteboss" },
    });
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, fulfill);
  await page.route("**/api/v1/site/update", (route) =>
    route.fulfill({ json: { versionToUpdate: null } }),
  );
  await page.route("**/api/v1/site/issues?*", (route) =>
    route.fulfill({
      json: {
        issues: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-128.png",
            authorLabel: "Alice",
            authorLoginId: "alice",
            commentCount: 5,
            createdLabel: "1 day ago",
            createdTitle: "2026-06-29 13:00",
            issueNumber: "42",
            labels: [],
            ownerName: "acme",
            projectLogoUrl: "/assets/images/default-project-logo.png",
            projectName: "roadmap",
            state: "open",
            title: "Fix release blocker",
          },
        ],
        page: 1,
        pageSize: 20,
        state: "open",
        total: 1,
        totalPages: 1,
      },
    }),
  );
}

async function mockBoardEditFormSession(page: Page) {
  const session = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-board-edit" },
      json: {
        actorId: 2,
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "dev",
        userLabel: "Dev Member",
      },
    });
  };
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      json: {
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/3", (route) =>
    route.fulfill({
      json: {
        attachments: [],
        authorId: "2",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyHtml: "<p>Post <strong>markdown</strong></p>",
        bodyMarkdown: "Post **markdown**",
        commentCount: 0,
        comments: [],
        createdLabel: "Jul 2, 2026",
        historyHtml: "",
        historyMarkdown: "",
        id: "103",
        isWatching: false,
        labels: [],
        notice: false,
        ownerName: "admin",
        permissions: {
          canComment: true,
          canCreate: true,
          canDelete: true,
          canRead: true,
          canSetNotice: true,
          canUpdate: true,
          canWatch: true,
        },
        postNumber: "3",
        projectName: "sample",
        readme: false,
        title: "Release note",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    }),
  );
}

async function mockPullRequestEditFormSession(page: Page) {
  const session = async (route: Route) => {
    await route.fulfill({
      headers: { "x-csrf-token": "csrf-legacy-fallback-off-pull-request-edit" },
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    });
  };
  await page.route("**/api/v1/session", session);
  await page.route("**/api/auth/session", session);
  await page.route("**/api/v1/auth/session", session);
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/7/form-options", (route) =>
    route.fulfill({
      json: {
        fromBranches: [{ name: "feature/ui", selected: true }],
        fromProjects: [{ id: 8, ownerName: "dev", projectName: "fork", selected: true }],
        mode: "edit",
        pullRequest: {
          bodyMarkdown: "Initial body",
          fromBranch: "feature/ui",
          fromOwnerName: "dev",
          fromProjectName: "fork",
          id: 90,
          projectName: "sample",
          state: "OPEN",
          title: "Initial title",
        },
        selected: { fromBranch: "feature/ui", fromProjectId: 8, toBranch: "main", toProjectId: 7 },
        toBranches: [{ name: "main", selected: true }],
        toProjects: [{ id: 7, ownerName: "admin", projectName: "sample", selected: true }],
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/pull-requests/merge-result?*", (route) =>
    route.fulfill({
      json: {
        commits: [
          {
            authorDateLabel: "Jul 2, 2026",
            authorEmail: "dev@example.com",
            commitId: "abcdef1234567890",
            commitMessage: "Add UI",
            commitShortId: "abcdef1",
          },
        ],
        conflict: true,
      },
    }),
  );
}

async function mockAuthenticatedNotificationSession(page: Page) {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.addInitScript((configuredBasePath) => {
    localStorage.setItem("shallWeOpenLeftNavigation", "false");
    localStorage.setItem("yobi-intro", "false");
    (
      window as Window & { __YONA_RUNTIME_CONFIG__?: Record<string, unknown> }
    ).__YONA_RUNTIME_CONFIG__ = {
      basePath: configuredBasePath,
      feedbackUrl: "https://github.com/yona-projects/yona/issues",
      hideProjectListing: false,
      siteName: "Yoram",
      supportedLanguages: ["ko-KR"],
    };
  }, basePath);
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isGuest: false,
        isSiteAdmin: true,
        loginId: "admin",
        preferredLanguage: "ko-KR",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/notifications**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        hasMore: false,
        items: [
          {
            actor: {
              avatarUrl: `${basePath}/assets/images/default-avatar-64.png`,
              displayName: "Site Admin",
              loginId: "admin",
            },
            createdAt: "2026-07-14T00:00:00Z",
            createdLabel: "방금 전",
            eventType: "NEW_COMMENT",
            id: "notification-1",
            message: "알림 본문",
            targetHref: "",
            targetTitle: "알림 제목",
            typeIcon: "info",
          },
        ],
        total: 1,
      },
    }),
  );
  for (const endpoint of ["workspace/overview", "projects", "organizations"]) {
    await page.route(`**/api/v1/${endpoint}**`, (route) =>
      route.fulfill({
        contentType: "application/json",
        json: endpoint === "workspace/overview" ? { profile: { loginId: "admin" } } : { items: [] },
      }),
    );
  }
}

async function mockProjectPostsSession(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        showBoard: true,
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 2,
            createdLabel: "Jul 2, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "3",
            projectName: "sample",
            readme: false,
            title: "Release note",
          },
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 0,
            createdLabel: "Jul 3, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "4",
            projectName: "sample",
            readme: true,
            title: "README",
          },
        ],
        notices: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Site Admin",
            authorLoginId: "admin",
            commentCount: 0,
            createdLabel: "Jul 1, 2026",
            labels: [],
            notice: true,
            ownerName: "admin",
            postNumber: "1",
            projectName: "sample",
            readme: false,
            title: "Notice",
          },
        ],
        openIssueCount: 0,
        closedIssueCount: 0,
        pageNum: 1,
        pageSize: 20,
        totalCount: 1,
        totalPages: 1,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: false,
        canMarkNotice: true,
        canMarkReadme: false,
        defaultPermissions: {
          canAttachFiles: false,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: false,
        },
        labels: [],
      },
    }),
  );
}

async function mockRuntimeGridProjectHome(page: Page) {
  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Site Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-runtime-grid" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        cloneUrl: "https://example.com/admin/sample.git",
        currentMilestone: {
          closedIssueCount: 1,
          completionPercent: 50,
          dueDateLabel: "Jul 5, 2026",
          dueDateOverdue: false,
          id: 5,
          openIssueCount: 1,
          state: "open",
          title: "v1.0",
          untilLabel: "4 days left",
        },
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          noMilestoneOpenIssueCount: 0,
          pullRequests: [],
          unassignedOpenIssueCount: 0,
        },
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        members: [
          {
            avatarUrl: "/assets/images/default-avatar-32.png",
            loginId: "admin",
            userId: 1,
            userLabel: "Site Admin",
          },
        ],
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        overview: "Sample overview",
        ownerName: "admin",
        projectName: "sample",
        readmeFile: null,
        vcs: "GIT",
        viewerCanCreateCommitResource: true,
        viewerCanLeave: true,
        viewerCanUpdate: true,
      },
    }),
  );
}

async function mockGlobalSearchSession(page: Page) {
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/search**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        keyword: "bug",
        searchType: "issue",
        counts: {
          issues: 1,
          users: 0,
          projects: 0,
          posts: 0,
          milestones: 0,
          issueComments: 0,
          postComments: 0,
          reviews: 0,
        },
        items: [
          {
            id: "1",
            href: "/yona/weblabs/demo/issue/1",
            type: "issue",
            title: "Bug issue",
            projectName: "demo",
            ownerName: "weblabs",
            authorLabel: "admin",
            authorLoginId: "admin",
            createdLabel: "today",
            updatedLabel: "today",
            number: "1",
            state: "open",
            snippets: [{ text: "Bug issue", highlights: [] }],
          },
        ],
        totalCount: 1,
        pageNum: 1,
        pageSize: 20,
        requestedSearchType: "issue",
        scope: "global",
        context: { organizationName: "", ownerName: "", projectName: "" },
      },
    }),
  );
}

test("massmail switches from all recipients to selected projects", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockMassMailSession(page);
  await page.goto(`${basePath}/sites/massmail`);

  await expect(page.locator("#mailtoAll")).toBeChecked();
  await expect(page.locator("#project-list-wrap")).toBeHidden();
  await expectLegacySiteLayout(page, [
    "site-massmail-page",
    "site-massmail-setting-grid",
    "site-massmail-sidebar-column",
    "site-massmail-setting-content-column",
  ]);

  await page.locator("#mailtoPrj").check();
  await page.locator("#input-project").fill("admin/projectYobi");
  await page.locator("#select-project").click();
  await expect(page.locator("#selected-projects")).toHaveText("admin/projectYobi x");
});

test("project-list displays the matching project inside the site layout", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockProjectListSession(page);
  await page.goto(`${basePath}/sites/projectList?filter=road`);

  const container = page.locator('[data-owner="site-project-list-container"]');
  await expect(container).toBeVisible();
  await expect(container.locator('[data-owner="site-project-list-project-name"]')).toHaveText(
    "acme/roadmap",
  );
  await expectLegacySiteLayout(page, [
    "site-project-list-page-wrap-outer",
    "site-project-list-setting-wrap",
    "site-project-list-setting-grid",
    "site-project-list-setting-sidebar-column",
    "site-project-list-setting-content-column",
  ]);
});

test("user-list displays the matching user inside the site layout", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockUserListSession(page);
  await page.goto(`${basePath}/sites/userList`);

  const list = page.locator('[data-owner="site-user-list-row-list"]');
  await expect(list).toBeVisible();
  await expect(list.locator('[data-owner="site-user-list-row-user-name"]')).toHaveText("Alice");
  await expectLegacySiteLayout(page, [
    "site-user-list-page-wrap-outer",
    "site-user-list-setting-wrap",
    "site-user-list-setting-grid",
    "site-user-list-setting-sidebar-column",
    "site-user-list-setting-content-column",
  ]);
});

test("post-list preserves row content and mobile containment", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockPostListSession(page);
  await page.goto(`${basePath}/sites/postList`);

  const container = page.locator('[data-owner="site-post-list-container"]');
  await expect(container).toBeVisible();
  const row = container.locator('[data-owner="site-post-list-row"]');
  await expect(row).toHaveCount(1);
  await expect(row.locator(':scope > [data-owner="site-post-list-project-avatar"]')).toHaveCount(1);
  await expect(row.locator(':scope > [data-owner="site-post-list-info"]')).toHaveCount(1);
  await expect(row.locator(':scope > [data-owner="site-post-list-metadata"]')).toHaveCount(1);
  await expect(row.locator('[data-owner="site-post-list-title-link"]')).toHaveText(
    "Release checklist",
  );
  await expectLegacySiteLayout(page, [
    "site-post-list-page-wrap-outer",
    "site-post-list-setting-wrap",
    "site-post-list-setting-grid",
    "site-post-list-setting-sidebar-column",
    "site-post-list-setting-content-column",
  ]);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobileRow = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    const titleBox = element
      .querySelector('[data-owner="site-post-list-title-link"]')
      ?.getBoundingClientRect();
    return { rowBox, titleBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobileRow.titleBox).not.toBeNull();
  expect(mobileRow.titleBox!.right).toBeLessThanOrEqual(mobileRow.rowBox.right + 1);
  expect(mobileRow.scrollWidth).toBeLessThanOrEqual(390);
});

test("issue-list preserves row content and responsive geometry", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockIssueListSession(page);
  await page.goto(`${basePath}/sites/issueList?state=open`);

  const row = page.locator('[data-owner="site-issue-list-row"]');
  await expect(row).toHaveCount(1);
  await expect(row.locator(':scope > [data-owner="site-issue-list-project-avatar"]')).toHaveCount(
    1,
  );
  await expect(row.locator(':scope > [data-owner="site-issue-list-info"]')).toHaveCount(1);
  await expect(row.locator(':scope > [data-owner="site-issue-list-metadata"]')).toHaveCount(1);
  await expect(row.locator('[data-owner="site-issue-list-title-link"]')).toHaveText(
    "Fix release blocker",
  );
  const desktop = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    const avatarBox = element.children[0]?.getBoundingClientRect();
    const infoBox = element.children[1]?.getBoundingClientRect();
    const metadataBox = element.children[2]?.getBoundingClientRect();
    return { rowBox, avatarBox, infoBox, metadataBox };
  });
  expect(desktop.avatarBox!.left).toBeGreaterThanOrEqual(desktop.rowBox.left);
  expect(desktop.infoBox!.top).toBeGreaterThanOrEqual(desktop.rowBox.top);
  expect(desktop.metadataBox!.bottom).toBeLessThanOrEqual(desktop.rowBox.bottom + 1);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await row.evaluate((element) => {
    const rowBox = element.getBoundingClientRect();
    const titleBox = element
      .querySelector('[data-owner="site-issue-list-title-link"]')
      ?.getBoundingClientRect();
    return { rowBox, titleBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobile.titleBox).not.toBeNull();
  expect(mobile.titleBox!.right).toBeLessThanOrEqual(mobile.rowBox.right + 1);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(390);
});

test("board edit form preserves control order and responsive containment", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockBoardEditFormSession(page);
  await page.goto(`${basePath}/admin/sample/post/3/editform`);

  const form = page.locator("form.nm");
  await expect(form).toBeVisible();
  await expect(form.locator(".content-wrap.frm-wrap")).toHaveCount(1);
  await expect(form.locator(".actions")).toHaveCount(1);
  await expect(form.locator('[data-owner="post-edit-form-actions"]')).toHaveCount(1);
  await expect(form.locator("label.checkbox")).toHaveCount(3);
  const desktop = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const contentBox = element.querySelector(".content-wrap.frm-wrap")?.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    const content = element.querySelector(".content-wrap.frm-wrap");
    const actions = content?.querySelector(":scope > .actions");
    const checkboxGroup = Array.from(content?.children ?? []).find((child) =>
      child.querySelector("label.checkbox"),
    );
    return {
      actionsBox,
      checkboxGroupBeforeActions:
        !!checkboxGroup &&
        !!actions &&
        Array.from(content?.children ?? []).indexOf(checkboxGroup) <
          Array.from(content?.children ?? []).indexOf(actions),
      contentBox,
      formBox,
    };
  });
  expect(desktop.contentBox!.left).toBeGreaterThanOrEqual(desktop.formBox.left);
  expect(desktop.actionsBox!.right).toBeLessThanOrEqual(desktop.formBox.right + 1);
  expect(desktop.checkboxGroupBeforeActions).toBe(true);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    return { actionsBox, formBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobile.actionsBox!.right).toBeLessThanOrEqual(mobile.formBox.right + 1);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(390);
});

test("pull-request edit form preserves action order and responsive containment", async ({
  page,
}) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockPullRequestEditFormSession(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/pullRequest/7/editform`);

  const form = page.locator("form.nm");
  await expect(form).toBeVisible();
  await expect(form.locator(".pull-request-wrap")).toHaveCount(1);
  await expect(form.locator(".pull-request-wrap > .pull-left")).toHaveCount(1);
  await expect(form.locator(".pull-request-wrap > .arrow + .pull-right")).toHaveCount(1);
  await expect(form.locator(".actions > button[type=submit] + button[type=button]")).toHaveCount(1);

  const desktop = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const selectorsBox = element.querySelector(".pull-request-wrap")?.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    return { actionsBox, formBox, selectorsBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(desktop.selectorsBox!.left).toBeGreaterThanOrEqual(desktop.formBox.left);
  expect(desktop.actionsBox!.right).toBeLessThanOrEqual(desktop.formBox.right + 1);
  expect(desktop.scrollWidth).toBeLessThanOrEqual(1366);

  await page.setViewportSize({ width: 390, height: 844 });
  const mobile = await form.evaluate((element) => {
    const formBox = element.getBoundingClientRect();
    const actionsBox = element.querySelector(".actions")?.getBoundingClientRect();
    return { actionsBox, formBox, scrollWidth: document.documentElement.scrollWidth };
  });
  expect(mobile.actionsBox!.right).toBeLessThanOrEqual(mobile.formBox.right + 1);
  expect(mobile.scrollWidth).toBeLessThanOrEqual(392);
});

test("project posts displays legacy notice and README labels", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockProjectPostsSession(page);
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });

  await expect(page.locator('[data-owner="project-posts-page"]')).toBeVisible();
  await expect(page.locator('[data-owner="project-posts-item"]')).toHaveCount(3);
  await expect(page.locator(".post-list-wrap .label.label-notice")).toHaveText("Notice");
  await expect(page.locator(".post-list-wrap .label.label-important")).toHaveText("README");
});

test("project home preserves the legacy right-rail section order", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockRuntimeGridProjectHome(page);
  await page.goto(`${basePath}/admin/sample`);

  const rail = page.locator(".span-right-pane");
  await expect(rail).toBeVisible();
  await expect(rail.locator('[data-owner="project-home-side-panel"]')).toBeVisible();
  await expect(rail.locator('[data-owner="project-home-member-inner"]')).toBeVisible();
  await expect(
    rail.locator(".project-btn-wrap + .milestone-info + .inner.member-info"),
  ).toHaveCount(1);
});

test("notifications displays the populated activity list", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockAuthenticatedNotificationSession(page);
  await page.goto(`${basePath}/notifications`, { waitUntil: "domcontentloaded" });

  const list = page.locator('[data-owner="authenticated-home-notification-list"]');
  await expect(list).toBeVisible();
  await expect(list).toHaveClass(/\bactivity-streams\b/u);
  await expect(list).toHaveClass(/\bnotification-wrap\b/u);
  await expect(list).toHaveClass(/\bunstyled\b/u);
  await expect(
    list.locator(':scope > [data-owner="authenticated-home-notification-row"]'),
  ).toHaveCount(1);
  await expect(list.locator(":scope > .warning-none")).toHaveCount(0);
});

test("secret setup displays the legacy logo and setup box", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockSecretSetup(page);
  await page.goto(`${basePath}/secret`);

  const owner = page.locator('[data-owner="secret-setup"]');
  await expect(owner).toBeVisible();
  await expect(owner).toHaveClass(/\bsecret-wrap\b/u);
  await expect(owner.locator('[data-part="secret-setup-logo"]')).toHaveText("Yoram");
  await expect(owner.locator('[data-part="secret-setup-box"]')).toBeVisible();
  await expect(owner.locator(".secret-box, .logo")).toHaveCount(2);
});

test("global search preserves the keyword and result across viewports", async ({ page }) => {
  const configuredBasePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  const basePath = configuredBasePath.endsWith("/")
    ? configuredBasePath.slice(0, -1)
    : configuredBasePath;
  await mockGlobalSearchSession(page);
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/search?keyword=bug&searchType=issue`);

    await expect(page.locator('[data-owner="global-search-input"]')).toHaveValue("bug");
    await expect(page.locator('[data-owner="global-search-result-wrap"]')).toBeVisible();
    await expect(page.locator('[data-owner="global-search-result-item"]')).toHaveCount(1);
  }
});
