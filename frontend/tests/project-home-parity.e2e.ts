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
        actorId: "42",
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

const projectContainerPayload = () => ({
  backgroundUrl: "",
  boardCount: 2,
  cloneUrl: "https://example.com/owner/projectYobi.git",
  codeMemberOnly: false,
  currentMilestone: {
    closedIssueCount: 1,
    completionPercent: 25,
    dueDateLabel: "2026-07-01",
    id: 7,
    openIssueCount: 3,
    title: "Phase dashboard",
  },
  dashboard: {
    assignees: [
      {
        avatarUrl: "/avatars/member.png",
        loginId: "member",
        openIssueCount: 2,
        userId: 2,
        userLabel: "Member",
      },
    ],
    labels: [
      {
        categoryId: 1,
        categoryIsExclusive: false,
        categoryName: "Priority",
        color: "#f36c22",
        id: 5,
        name: "High",
        openIssueCount: 4,
      },
    ],
    milestones: [
      {
        closedIssueCount: 1,
        completionPercent: 25,
        id: 7,
        openIssueCount: 3,
        title: "Phase dashboard",
      },
    ],
    noMilestoneOpenIssueCount: 1,
    pullRequests: [
      {
        contributorAvatarUrl: "/avatars/member.png",
        contributorLoginId: "member",
        contributorUserId: 2,
        contributorUserLabel: "Member",
        createdLabel: "2026-06-26",
        pullRequestNumber: 3,
        title: "Dashboard PR",
      },
    ],
    unassignedOpenIssueCount: 1,
  },
  defaultTab: "readme",
  enrollmentRequested: false,
  history: {
    items: [
      {
        actorAvatarUrl: "/avatars/owner.png",
        actorName: "Owner",
        actorUrl: "/yona/owner",
        createdLabel: "2026-06-26",
        itemType: "issue",
        shortTitle: "#1",
        title: "History issue",
        url: "/yona/owner/projectYobi/issue/1",
      },
    ],
  },
  isFavorited: false,
  isForked: false,
  isWatching: false,
  logoUrl: "",
  memberCount: 1,
  members: [
    {
      avatarUrl: "/avatars/owner.png",
      loginId: "owner",
      role: "manager",
      userLabel: "Owner",
    },
  ],
  openIssueCount: 4,
  openPullRequestCount: 2,
  organizationName: "",
  originOwnerName: "",
  originProjectName: "",
  overview: "Project **home** parity",
  overviewEditable: true,
  ownerName: "owner",
  projectName: "projectYobi",
  projectScope: "public",
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
  viewerCanLeave: true,
  viewerCanUpdate: true,
  viewerCanWatch: true,
  viewerUserId: 42,
  watchCount: 5,
});

const postsPayload = () => ({
  items: [],
  notices: [],
  ownerName: "owner",
  pageNum: 1,
  pageSize: 20,
  projectName: "projectYobi",
  readme: null,
  totalCount: 0,
});

test.beforeEach(async ({ page }) => {
  await installRuntime(page);

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainerPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/projects\/owner\/projectYobi\/posts(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify(postsPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("project home proves README fallback, history and dashboard tabs in the browser", async ({
  page,
}) => {
  await page.goto("/yona/owner/projectYobi");

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator("#project-description")).toContainText("Project home parity");
  await expect(page.locator("#cloneURL")).toHaveValue("https://example.com/owner/projectYobi.git");
  const projectHomeTabs = page.locator(".span-left-pane > .nav.nav-tabs");
  await expect(projectHomeTabs.locator("li.active")).toContainText("README");
  await expect(page.locator(".bubble-wrap.gray.readme")).toContainText(
    "README.md will be shown here",
  );
  await expect(page.locator(".bubble-wrap.gray.readme")).toContainText("create README");
  await expect(
    page.locator(".bubble-wrap.gray.readme a[href$='postform?readme=true']"),
  ).toBeVisible();
  await expect(page.locator(".member-wrap .project-members .member")).toContainText(
    "Owner (owner)",
  );
  await expect(page.locator("#member-add-link")).toBeVisible();
  await expect(page.locator("body")).not.toContainText("project.dashboard");
  await expect(page.locator("body")).not.toContainText("project.history.type");

  await projectHomeTabs.locator("a[href$='?tabId=history']").click();
  await expect(page).toHaveURL(/\/yona\/owner\/projectYobi\?tabId=history$/);
  await expect(projectHomeTabs.locator("li.active")).toContainText("History");
  await expect(page.locator(".activity-streams .activity-stream")).toContainText("Owner");
  await expect(page.locator(".activity-streams .activity-stream")).toContainText(
    "New issue added.",
  );
  await expect(page.locator(".activity-streams .activity-stream")).toContainText("History issue");

  await projectHomeTabs.locator("a[href$='?tabId=dashboard']").click();
  await expect(page).toHaveURL(/\/yona\/owner\/projectYobi\?tabId=dashboard$/);
  await expect(projectHomeTabs.locator("li.active")).toContainText("Dashboard");
  await expect(page.locator(".overview-assignee")).toContainText("Member");
  await expect(page.locator(".overview-milestone")).toContainText("Phase dashboard");
  await expect(page.locator(".overview-label")).toContainText("High");
  await expect(page.locator(".overview-pullrequest")).toContainText("Dashboard PR");
});

test("project home leave modal opens, cancels, and confirms through REST", async ({ page }) => {
  let deleted = false;

  await page.route(apiV1Route("/owners/owner/projects/projectYobi/members/42"), async (route) => {
    expect(route.request().method()).toBe("DELETE");
    expect(route.request().headers()["x-csrf-token"]).toBe("csrf-123");
    deleted = true;
    await route.fulfill({
      body: JSON.stringify({
        redirectPath: "/",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi");
  await expect(page.locator("#alertLeave")).toHaveClass(/hide/);

  await page.locator("#projectLeaveBtn").click();
  await expect(page.locator("#alertLeave")).not.toHaveClass(/hide/);
  await expect(page.locator("#alertLeave")).toContainText("Do you want to leave this project?");

  await page.locator("#alertLeave button", { hasText: "No" }).click();
  await expect(page.locator("#alertLeave")).toHaveClass(/hide/);
  expect(deleted).toBe(false);

  await page.locator("#projectLeaveBtn").click();
  await page.locator("#leaveBtn").click();
  await expect.poll(() => deleted).toBe(true);
  await expect(page).toHaveURL(/\/yona\/?$/);
});
