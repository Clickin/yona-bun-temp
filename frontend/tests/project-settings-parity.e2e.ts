import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

async function installRuntime(page: Page): Promise<void> {
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
}

const projectSettingsPayload = (overrides: Record<string, unknown> = {}) => ({
  backgroundUrl: "",
  boardCount: 2,
  cloneUrl: "https://example.com/owner/projectYobi.git",
  codeMemberOnly: true,
  currentMilestone: null,
  defaultReviewerCount: 2,
  defaultTab: "readme",
  enrollmentRequested: false,
  isFavorited: false,
  isForked: false,
  isUsingReviewerCount: true,
  isWatching: false,
  logoUrl: "",
  maxReviewerCount: 3,
  memberCount: 1,
  members: [],
  openIssueCount: 1,
  openPullRequestCount: 1,
  organizationName: "team",
  originOwnerName: "",
  originProjectName: "",
  overview: "Initial overview",
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "protected",
  reviewCount: 1,
  showAdmin: true,
  showBoard: true,
  showCode: true,
  showIssue: true,
  showMilestone: true,
  showPullRequest: true,
  showReview: true,
  vcs: "GIT",
  viewerCanEnroll: false,
  viewerCanUpdate: true,
  viewerCanWatch: true,
  watchCount: 0,
  ...overrides,
});

const branchPayload = (defaultBranch = "main") => ({
  branches: [
    {
      commitId: "abcdef1234567890",
      isDefault: defaultBranch === "main",
      isHead: true,
      lastCommitMessage: "main branch",
      name: "main",
      pullRequestState: "",
      shortName: "main",
    },
    {
      commitId: "1234567890abcdef",
      isDefault: defaultBranch === "feature/settings",
      isHead: false,
      lastCommitMessage: "settings branch",
      name: "feature/settings",
      pullRequestState: "",
      shortName: "feature/settings",
    },
  ],
  defaultBranch,
  noHead: false,
  ownerName: "owner",
  permissions: {
    canDelete: true,
    canUpdate: true,
  },
  projectName: "projectYobi",
});

test.beforeEach(async ({ page }) => {
  await installRuntime(page);
});

test("project settings saves menu, code access, reviewer and default branch state through REST", async ({
  page,
}) => {
  let savedBody: Record<string, unknown> | null = null;
  let defaultBranchBody: Record<string, unknown> | null = null;
  let settingsReadCount = 0;
  let currentDefaultBranch = "main";
  let currentSettings = projectSettingsPayload();

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/settings"), async (route) => {
    settingsReadCount += 1;
    await route.fulfill({
      body: JSON.stringify(currentSettings),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/projects/owner/projectYobi/branches"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(branchPayload(currentDefaultBranch)),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi"), async (route) => {
    if (route.request().method() !== "PATCH") {
      await route.fallback();
      return;
    }
    savedBody = route.request().postDataJSON() as Record<string, unknown>;
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
    currentSettings = projectSettingsPayload({
      codeMemberOnly: savedBody.isCodeAccessibleMemberOnly,
      defaultReviewerCount: savedBody.defaultReviewerCount,
      isUsingReviewerCount: savedBody.isUsingReviewerCount,
      overview: savedBody.overview,
      projectName: savedBody.projectName,
      projectScope: String(savedBody.projectScope).toLowerCase(),
      showBoard: savedBody.board,
      showCode: savedBody.code,
      showIssue: savedBody.issue,
      showMilestone: savedBody.milestone,
      showPullRequest: savedBody.pullRequest,
      showReview: savedBody.review,
    });
    await route.fulfill({
      body: JSON.stringify(currentSettings),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/projects/owner/projectYobi/branches/default"), async (route) => {
    defaultBranchBody = route.request().postDataJSON() as Record<string, unknown>;
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
    currentDefaultBranch = String(defaultBranchBody.branchName);
    await route.fulfill({
      body: JSON.stringify(branchPayload(currentDefaultBranch)),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/settingform");

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator("#subMenuProjectSetting")).toHaveClass(/active/);
  await expect(page.locator("#codeAccessibleMemberOnly")).toBeChecked();
  await expect(page.locator("#menuSettingCode")).toBeChecked();
  await expect(page.locator("#menuSettingIssue")).toBeChecked();
  await expect(page.locator("#menuSettingReview")).toBeChecked();
  await expect(page.locator("#project-default-branch")).toHaveValue("main");

  await page.locator("#project-name").fill("invalid name");
  await page.locator("#save").click();
  await expect(page.getByRole("alert")).toHaveText(
    "Enter name in alphabetnumerical or symbol characters(_-.)",
  );
  await expect(page.getByText("project.name.alert")).toHaveCount(0);
  expect(savedBody).toBeNull();

  await page.locator("#project-name").fill("projectYobi");
  await page.locator("#logoPath").setInputFiles({
    buffer: Buffer.from("not an image"),
    mimeType: "text/plain",
    name: "not-image.txt",
  });
  await expect(page.getByRole("alert")).toHaveText("This is not an image file.");
  await expect(page.getByText("project.logo.alert")).toHaveCount(0);
  expect(savedBody).toBeNull();

  await page.locator("#codeAccessibleAnyone").check();
  await page.locator("#menuSettingIssue").uncheck();
  await page.locator("#menuSettingReview").uncheck();
  await page.locator("#project-reviewer-count").selectOption("3");
  await page.locator("#project-default-branch").selectOption("feature/settings");
  await page.locator("#project-desc").fill("Updated settings overview");
  await page.locator("#save").click();

  await expect
    .poll(() => savedBody)
    .toMatchObject({
      board: true,
      code: true,
      defaultReviewerCount: 3,
      issue: false,
      isCodeAccessibleMemberOnly: false,
      isUsingReviewerCount: true,
      milestone: true,
      overview: "Updated settings overview",
      projectName: "projectYobi",
      projectScope: "protected",
      pullRequest: true,
      review: false,
    });
  await expect
    .poll(() => defaultBranchBody)
    .toMatchObject({
      branchName: "feature/settings",
    });
  await expect.poll(() => settingsReadCount).toBeGreaterThanOrEqual(2);
  await expect(page).toHaveURL(/\/yona\/owner\/projectYobi\/settingform$/);
  await expect(page.locator("#codeAccessibleAnyone")).toBeChecked();
  await expect(page.locator("#menuSettingIssue")).not.toBeChecked();
  await expect(page.locator("#menuSettingReview")).not.toBeChecked();
  await expect(page.locator("#project-default-branch")).toHaveValue("feature/settings");
  const projectMenuLabels = page.locator(".project-menu-gruop .menu-name");
  await expect(projectMenuLabels.filter({ hasText: "Issue" })).toHaveCount(0);
  await expect(projectMenuLabels.filter({ hasText: "Review" })).toHaveCount(0);
});

test("project settings route renders the legacy forbidden shell for non-updaters", async ({
  page,
}) => {
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/settings"), async (route) => {
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
  await page.route(apiV1Route("/projects/owner/projectYobi/branches"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(branchPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/settingform");
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");
  await expect(page.locator("#saveSetting")).toHaveCount(0);
  await expect(page.locator("#save")).toHaveCount(0);
});
