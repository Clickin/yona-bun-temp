import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

type SessionState = {
  isAnonymous?: boolean;
  isSiteAdmin?: boolean;
  loginId?: string;
  userLabel?: string;
};

type WorkspaceState = {
  favoriteProjects?: Array<{ ownerName: string; projectName: string }>;
  isGuest?: boolean;
  memberProjects?: Array<{ ownerName: string; projectName: string }>;
  recentProjects?: Array<{ ownerName: string; projectName: string }>;
};

async function expectNoVisibleRawLegacyKeys(page: Page): Promise<void> {
  const bodyText = await page.locator("body").innerText();
  const rawKeys =
    bodyText.match(
      /\b(?:app|button|error|issue|menu|notification|search|site|title|user|validation)\.[A-Za-z0-9_.-]+/g,
    ) ?? [];
  expect(rawKeys, `visible raw legacy message keys in:\n${bodyText}`).toEqual([]);
}

async function installRuntimeConfig(
  page: Page,
  overrides: Record<string, unknown> = {},
): Promise<void> {
  await page.addInitScript((runtimeOverrides) => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
      ...runtimeOverrides,
    };
  }, overrides);
}

async function installCommonApiMocks(
  page: Page,
  {
    session = {},
    workspace = {},
  }: {
    session?: SessionState;
    workspace?: WorkspaceState;
  } = {},
): Promise<void> {
  const isAnonymous = session.isAnonymous ?? false;
  const loginId = session.loginId ?? (isAnonymous ? "" : "admin");
  const userLabel = session.userLabel ?? (isAnonymous ? "" : "Administrator");

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
        actorId: isAnonymous ? "" : "1",
        defaultLandingPath: isAnonymous ? "/" : "/me",
        emailAddress: isAnonymous ? "" : `${loginId}@example.com`,
        isAnonymous,
        isConfirmed: !isAnonymous,
        isSiteAdmin: session.isSiteAdmin ?? false,
        loginId,
        userLabel,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultAdminContact: "moc.elpmaxe@nimda",
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
        apiToken: "api-token",
        daysAgo: 14,
        defaultLandingPath: "/me",
        emails: [],
        favoriteProjects: workspace.favoriteProjects ?? [
          { ownerName: "admin", projectName: "sample" },
        ],
        issueItems: [
          {
            assigneeLabel: "Administrator",
            authorLabel: "Administrator",
            commentCount: 0,
            issueNumber: 7,
            ownerName: "admin",
            projectName: "sample",
            state: "open",
            title: "Recent issue",
            updatedLabel: "2026-06-26",
          },
        ],
        memberProjects: (
          workspace.memberProjects ?? [{ ownerName: "admin", projectName: "sample" }]
        ).map((project) => ({
          createdLabel: "2026-06-26",
          lastPushedLabel: "2026-06-26",
          memberCount: 1,
          overview: "Sample project",
          projectScope: "public",
          watchCount: 1,
          ...project,
        })),
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: userLabel || loginId,
          englishName: "",
          isBlocked: false,
          isGuest: workspace.isGuest ?? false,
          isSiteAdmin: session.isSiteAdmin ?? false,
          loginId,
          primaryEmailAddress: isAnonymous ? "" : `${loginId}@example.com`,
          sinceLabel: "2026-06-26",
        },
        pullRequestItems: [],
        recentProjects: workspace.recentProjects ?? [{ ownerName: "admin", projectName: "sample" }],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

test("anonymous root shell keeps legacy nav, feedback, login dialog, and login error state", async ({
  page,
}) => {
  await installRuntimeConfig(page, { feedbackUrl: "https://feedback.example.test" });
  await installCommonApiMocks(page, { session: { isAnonymous: true } });
  let submittedBody: Record<string, unknown> | null = null;
  await page.route(apiV1Route("/auth/sign-in"), async (route) => {
    submittedBody = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill({
      body: JSON.stringify({ message: "user.login.failed.client" }),
      headers: restJsonHeaders,
      status: 401,
    });
  });

  await page.goto("/yona/");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator(".gnb-outer .gnb-inner")).toBeVisible();
  await expect(page.locator('a.logo.logo-letter[href="/yona"]')).toBeVisible();
  await expect(page.locator('form[name="gnb-search-form"] input[name="keyword"]')).toBeVisible();
  await expect(page.locator('a[href="/yona/projects"]')).toBeVisible();
  await expect(page.locator('a[href="https://feedback.example.test"]')).toBeVisible();
  await expect(page.locator("#required-logged-in a[data-login='required']")).toBeVisible();
  await expect(
    page.locator(".gnb-usermenu a.ybtn.ybtn-success[href='/yona/users/signupform']"),
  ).toBeVisible();
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator(".page-footer-outer .page-footer")).toBeVisible();
  await expect(page.locator("#loginDialog.modal.hide")).toHaveCount(1);

  await page.locator("#required-logged-in a[data-login='required']").click();
  await expect(page.locator("#loginDialog.modal.loginDialog")).toBeVisible();
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("#loginDialog")).toHaveCSS("position", "fixed");
  await expect(page.locator("#loginDialog")).toHaveCSS("width", "460px");
  await expect(page.locator("#remember-meD")).toBeChecked();
  await page.locator("#loginDialog input[name='loginIdOrEmail']").fill("admin");
  await page.locator("#loginDialog input[name='password']").fill("wrong-password");
  await page.locator("#remember-meD").uncheck();
  await page.locator("#loginDialog button[type='submit']").click();
  await expect(page.locator("#loginDialog .error .error-message")).toContainText(
    "Failed to log in. The request is invalid.",
  );
  expect(submittedBody).toMatchObject({
    identifier: "admin",
    password: "wrong-password",
    rememberMe: false,
  });
  await expectNoVisibleRawLegacyKeys(page);
  await page.locator("#loginDialog button.close").click();
  await expect(page.locator("#loginDialog.modal.hide.loginDialog")).toHaveCount(1);
});

test("anonymous root shell keeps the legacy login dialog usable on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await installRuntimeConfig(page, { feedbackUrl: "https://feedback.example.test" });
  await installCommonApiMocks(page, { session: { isAnonymous: true } });

  await page.goto("/yona/");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator(".gnb-outer .gnb-inner")).toBeVisible();
  await expect(page.locator("#required-logged-in a[data-login='required']")).toBeVisible();
  await page.locator("#required-logged-in a[data-login='required']").click();
  await expect(page.locator("#loginDialog.modal.loginDialog")).toBeVisible();
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("#loginDialog")).toHaveCSS("position", "fixed");
  await expect(page.locator("#loginDialog")).toHaveCSS("width", "390px");
  await expect(page.locator("#loginDialog input[name='loginIdOrEmail']")).toBeVisible();
  await expect(page.locator("#loginDialog input[name='password']")).toBeVisible();
});

test("authenticated site admin shell renders user menu, sidebar tabs, create menu, and admin affix", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, {
    session: { isSiteAdmin: true, loginId: "admin", userLabel: "Administrator" },
  });

  await page.goto("/yona/me");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator(".admin-logged-in-affix")).toBeVisible();
  await expect(page.locator(".gnb-usermenu a[href='/yona/user/issues']")).toBeVisible();
  await expect(page.locator(".usermenu-icon-button[href='/yona/sites/userList']")).toBeVisible();
  await expect(page.locator("#sidebar-open-btn a[href='#mySidenav']")).toBeVisible();
  await expect(page.locator("#mySidenav")).toHaveCount(1);
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "0px");
  await page.locator("#sidebar-open-btn a[href='#mySidenav']").click();
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "360px");
  await page.locator(".admin-logged-in-affix").click();
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "0px");
  await page.keyboard.press("f");
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "360px");
  await page.locator(".admin-logged-in-affix").click();
  await expect(page.locator("#mySidenav")).toHaveCSS("width", "0px");
  await expect(page.locator("#mySidenav .user-menu a[href='/yona/admin']")).toContainText(
    "Profile",
  );
  await expect(page.locator("#mySidenav .user-menu a[href='/yona/user/editform']")).toContainText(
    "Account",
  );
  await expect(page.locator("#myOrganizationList")).toContainText("sample");
  await expect(page.locator("#myProjectList")).toContainText("sample");
  await expect(page.locator("#myRecentIssueList")).toContainText("Recent issue");
  await expect(page.locator("#gnb-create-menu")).not.toBeVisible();
  await page.locator(".dropdwon-box-btn[href='#gnb-create-menu']").click();
  await expect(page.locator("#gnb-create-menu a[href='/yona/user/issues/new']")).toBeVisible();
  await expect(page.locator("#gnb-create-menu a[href='/yona/projects/new']")).toBeVisible();
  await expect(page.locator("#gnb-create-menu a[href='/yona/organizations/new']")).toBeVisible();
});

test("guest root shell hides project listing and organization creation like legacy navbar", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, {
    session: { loginId: "guest", userLabel: "Guest" },
    workspace: { isGuest: true },
  });

  await page.goto("/yona/me");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator('a[href="/yona/projects"]')).toHaveCount(0);
  await expect(page.locator("#gnb-create-menu")).not.toBeVisible();
  await page.locator(".dropdwon-box-btn[href='#gnb-create-menu']").click();
  await expect(page.locator("#gnb-create-menu a[href='/yona/projects/new']")).toBeVisible();
  await expect(page.locator("#gnb-create-menu a[href='/yona/organizations/new']")).toHaveCount(0);
  await expect(page.locator(".gnb-usermenu a[href='/yona/user/issues']")).toBeVisible();
});

test("standalone legacy pages suppress root chrome", async ({ page }) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, { session: { isAnonymous: true } });

  await page.goto("/yona/secret");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page).toHaveTitle("Tada! Welcome to Yona!");
  await expect(page.locator(".gnb-outer")).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator(".page-footer-outer")).toHaveCount(1);
  await expect(page.locator(".secret-page .page-footer-outer")).toContainText("Powered by");
  await expect(page.locator(".page-footer-outer")).not.toContainText("Copyright");

  await page.goto("/yona/restart");
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator(".gnb-outer")).toHaveCount(0);
  await expect(page.locator("#mySidenav")).toHaveCount(0);
  await expect(page.locator(".secret-page .secret-wrap.restart")).toBeVisible();
  await expect(page.locator(".page-footer-outer")).toHaveCount(1);
  await expect(page.locator(".secret-page .page-footer-outer")).toContainText("Powered by");
  await expect(page.locator(".page-footer-outer")).not.toContainText("Copyright");

  await page.goto("/yona/_UIKit");
  await expectNoVisibleRawLegacyKeys(page);
  await expect(page.locator("header.gnb-outer .subtitle")).toHaveText("Yobi UI");
  await expect(page.locator(".page-wrap-outer")).toContainText("Buttons");
  await expect(page.locator(".page-footer-outer")).toContainText("NAVER Corp.");
});

test("project route search scope exposes project, group, and global actions from browser DOM", async ({
  page,
}) => {
  await installRuntimeConfig(page);
  await installCommonApiMocks(page, {
    session: { loginId: "admin", userLabel: "Administrator" },
  });
  await page.route(apiV1Route("/owners/org/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        canDelete: false,
        canFork: true,
        canLeave: false,
        canUpdate: true,
        canWatch: true,
        cloneUrl: "https://example.test/org/projectYobi.git",
        codeMemberOnly: false,
        currentMilestone: null,
        dashboard: {
          assignees: [],
          labels: [],
          milestones: [],
          pullRequests: [],
        },
        defaultBranch: "main",
        defaultTab: "home",
        enrollmentRequested: false,
        history: { items: [] },
        isFavorited: false,
        isForked: false,
        isWatching: false,
        logoUrl: "",
        memberCount: 1,
        members: [],
        menuCounters: {},
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "org",
        originOwnerName: "",
        originProjectName: "",
        overview: "Project overview",
        overviewEditable: true,
        ownerName: "org",
        projectName: "projectYobi",
        projectScope: "public",
        readmeFile: null,
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
        watchCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/org/projectYobi");
  await expectNoVisibleRawLegacyKeys(page);

  await expect(page.locator(".gnb-outer.project-header")).toBeVisible();
  await expect(page.locator("#gnb-search-scope-title")).toContainText("Project");
  await expect(
    page.locator("a[data-toggle='search-scope'][data-action='/yona/org/projectYobi/search']"),
  ).toContainText("Project");
  await expect(
    page.locator("a[data-toggle='search-scope'][data-action='/yona/organizations/org/search']"),
  ).toContainText("Group");
  await expect(
    page.locator("a[data-toggle='search-scope'][data-action='/yona/search']"),
  ).toContainText("All");
});
