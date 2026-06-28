import { expect, test, type Locator, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;
const projectContainerRoute = apiV1Route("/owners/owner/projects/projectYobi/container");
const projectPostsRoute = /\/api\/v1\/projects\/owner\/projectYobi\/posts(?:\?.*)?$/;

type LayoutBox = {
  height: number;
  width: number;
  x: number;
  y: number;
};

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  return locatorBox(page.locator(selector).first(), selector);
}

async function locatorBox(locator: Locator, label: string): Promise<LayoutBox> {
  const box = await locator.boundingBox();
  expect(box, `${label} should have a measurable rendered box`).not.toBeNull();
  return box as LayoutBox;
}

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

async function routeProjectContainer(page: Page, body: unknown): Promise<void> {
  await page.route(projectContainerRoute, async (route) => {
    await route.fulfill({
      body: JSON.stringify(body),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

async function routeProjectPosts(page: Page, body: unknown): Promise<void> {
  await page.route(projectPostsRoute, async (route) => {
    await route.fulfill({
      body: JSON.stringify(body),
      headers: restJsonHeaders,
      status: 200,
    });
  });
}

test.beforeEach(async ({ page }) => {
  await installRuntime(page);

  await routeProjectContainer(page, projectContainerPayload());
  await routeProjectPosts(page, postsPayload());
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

  const homeHeader = await layoutBox(page, ".project-home-header.row-fluid");
  const homeOverview = await layoutBox(page, ".project-home-header .project-overview.span9");
  const cloneWrap = await layoutBox(page, ".project-home-header .project-clone-wrap.span3");
  const homeContentRowLocator = page
    .locator(".project-page-wrap > .row-fluid")
    .filter({ has: page.locator(".span-left-pane") })
    .first();
  const homeContentRow = await locatorBox(homeContentRowLocator, "project home content row");
  const leftPane = await layoutBox(page, ".span-left-pane");
  const rightPane = await layoutBox(page, ".span-right-pane");
  const tabsBox = await locatorBox(projectHomeTabs, "project home tabs");
  const readmeFallback = await layoutBox(page, ".bubble-wrap.gray.readme");
  const rightBubble = await layoutBox(page, ".bubble-wrap.gray.project-home");

  expect(homeOverview.x).toBeCloseTo(homeHeader.x, 0);
  expect(homeOverview.width).toBeGreaterThan(homeHeader.width * 0.72);
  expect(homeOverview.width).toBeLessThan(homeHeader.width * 0.75);
  expect(cloneWrap.x).toBeGreaterThan(homeOverview.x + homeOverview.width);
  expect(cloneWrap.width).toBeGreaterThan(homeHeader.width * 0.22);
  expect(cloneWrap.width).toBeLessThan(homeHeader.width * 0.24);
  expect(leftPane.x).toBeCloseTo(homeContentRow.x, 0);
  expect(leftPane.width).toBeGreaterThan(homeContentRow.width * 0.72);
  expect(leftPane.width).toBeLessThan(homeContentRow.width * 0.75);
  expect(rightPane.x).toBeGreaterThan(leftPane.x + leftPane.width);
  expect(rightPane.width).toBeGreaterThan(homeContentRow.width * 0.22);
  expect(rightPane.width).toBeLessThan(homeContentRow.width * 0.24);
  expect(tabsBox.x).toBeCloseTo(leftPane.x, 0);
  expect(tabsBox.width).toBeLessThanOrEqual(leftPane.width + 1);
  expect(readmeFallback.x).toBeGreaterThanOrEqual(leftPane.x);
  expect(readmeFallback.y).toBeGreaterThan(tabsBox.y + tabsBox.height - 1);
  expect(readmeFallback.width).toBeLessThanOrEqual(leftPane.width + 1);
  expect(rightBubble.x).toBeGreaterThanOrEqual(rightPane.x);
  expect(rightBubble.width).toBeLessThanOrEqual(rightPane.width + 1);

  await projectHomeTabs.locator("a[href$='?tabId=history']").click();
  await expect(page).toHaveURL(/\/yona\/owner\/projectYobi\?tabId=history$/);
  await expect(projectHomeTabs.locator("li.active")).toContainText("History");
  const activityStream = page.locator(".activity-streams .activity-stream").first();
  await expect(activityStream).toContainText("Owner");
  await expect(activityStream).toContainText("New issue added.");
  await expect(activityStream).toContainText("History issue");
  await expect(activityStream.locator(".actor")).toHaveAttribute("href", "/yona/owner");
  await expect(activityStream.locator(".where")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/issue/1",
  );
  await expect(activityStream.locator(".title")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/issue/1",
  );
  await expect(activityStream.locator(".date")).toHaveAttribute("title", "2026-06-26");

  const historyContainer = await layoutBox(page, ".tab-pane.active > .content-container.nm");
  const historyMainStream = await layoutBox(page, ".main-stream");
  const historyList = await layoutBox(page, ".activity-streams.unstyled");
  const historyItem = await layoutBox(page, ".activity-streams .activity-stream");
  const historyAvatar = await layoutBox(page, ".activity-stream .avatar-wrap.pull-left.mr10");
  const historyDescription = await layoutBox(page, ".activity-stream .activity-desc");
  const historyHeader = await layoutBox(page, ".activity-stream .header-text");
  const historyActor = await layoutBox(page, ".activity-stream .header-text .actor");
  const historyDate = await layoutBox(page, ".activity-stream .others .date");

  expect(historyContainer.x).toBeGreaterThanOrEqual(leftPane.x);
  expect(historyContainer.width).toBeLessThanOrEqual(leftPane.width + 1);
  expect(historyMainStream.x).toBeCloseTo(historyContainer.x, 0);
  expect(historyMainStream.width).toBeCloseTo(historyContainer.width, 0);
  expect(historyList.x).toBeCloseTo(historyMainStream.x, 0);
  expect(historyItem.x).toBeCloseTo(historyList.x, 0);
  expect(historyAvatar.x).toBeCloseTo(historyItem.x, 0);
  expect(historyDescription.width).toBeGreaterThan(historyAvatar.width);
  expect(historyActor.x).toBeGreaterThan(historyAvatar.x + historyAvatar.width);
  expect(historyHeader.y).toBeLessThan(historyDate.y);

  await projectHomeTabs.locator("a[href$='?tabId=dashboard']").click();
  await expect(page).toHaveURL(/\/yona\/owner\/projectYobi\?tabId=dashboard$/);
  await expect(projectHomeTabs.locator("li.active")).toContainText("Dashboard");
  await expect(page.locator(".overview-assignee")).toContainText("Member");
  await expect(page.locator(".overview-milestone")).toContainText("Phase dashboard");
  await expect(page.locator(".overview-label")).toContainText("High");
  await expect(page.locator(".overview-pullrequest")).toContainText("Dashboard PR");

  const dashboardRow = await layoutBox(page, ".project-overview-home.row-fluid");
  const leftColumn = await layoutBox(
    page,
    ".project-overview-home.row-fluid > .span6:nth-child(1)",
  );
  const rightColumn = await layoutBox(
    page,
    ".project-overview-home.row-fluid > .span6:nth-child(2)",
  );
  expect(leftColumn.x).toBeCloseTo(dashboardRow.x, 0);
  expect(leftColumn.width).toBeGreaterThan(dashboardRow.width * 0.47);
  expect(leftColumn.width).toBeLessThan(dashboardRow.width * 0.5);
  expect(rightColumn.x).toBeGreaterThan(leftColumn.x + leftColumn.width);
  expect(rightColumn.x).toBeGreaterThanOrEqual(dashboardRow.x + dashboardRow.width / 2 - 2);
  expect(rightColumn.width).toBeGreaterThan(dashboardRow.width * 0.47);
  expect(rightColumn.width).toBeLessThan(dashboardRow.width * 0.5);

  const assigneeSection = page.locator(".overview-assignee").first();
  await expect(assigneeSection.locator("> .row-fluid")).toHaveCount(2);
  await expect(
    assigneeSection.locator(".row-fluid").first().locator(".span6 .usf-group"),
  ).toHaveAttribute("href", "/yona/owner/projectYobi/issues?state=open&assigneeLoginId=member");
  await expect(
    assigneeSection.locator(".row-fluid").first().locator(".span6 .usf-group"),
  ).toHaveAttribute("title", "Member (@member)");
  await expect(
    assigneeSection.locator(".row-fluid").first().locator(".span3.num strong"),
  ).toHaveText("2");
  await expect(
    assigneeSection.locator(".row-fluid").first().locator(".progress-warning"),
  ).toHaveAttribute("title", "50%");
  const assigneeRow = await layoutBox(page, ".overview-assignee > .row-fluid:first-child");
  const assigneeNameColumn = await layoutBox(
    page,
    ".overview-assignee > .row-fluid:first-child > .span6",
  );
  const assigneeCountColumn = await layoutBox(
    page,
    ".overview-assignee > .row-fluid:first-child > .span3.num",
  );
  const assigneeProgressColumn = await layoutBox(
    page,
    ".overview-assignee > .row-fluid:first-child > .span3.nm",
  );
  const assigneeProgressBar = await layoutBox(
    page,
    ".overview-assignee > .row-fluid:first-child .progress .bar",
  );
  expect(assigneeNameColumn.x).toBeCloseTo(assigneeRow.x, 0);
  expect(assigneeNameColumn.width).toBeGreaterThan(assigneeCountColumn.width);
  expect(assigneeCountColumn.x).toBeGreaterThan(
    assigneeNameColumn.x + assigneeNameColumn.width - 1,
  );
  expect(assigneeProgressColumn.x).toBeGreaterThan(
    assigneeCountColumn.x + assigneeCountColumn.width - 1,
  );
  expect(assigneeProgressBar.width).toBeGreaterThan(assigneeProgressColumn.width * 0.45);
  expect(assigneeProgressBar.width).toBeLessThan(assigneeProgressColumn.width * 0.55);

  const milestoneSection = page.locator(".overview-milestone").first();
  await expect(milestoneSection.locator("> .row-fluid")).toHaveCount(2);
  await expect(milestoneSection.locator(".row-fluid").first().locator(".span6 a")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/issues?state=open&milestoneId=7",
  );
  await expect(
    milestoneSection.locator(".row-fluid").first().locator(".span3.num strong"),
  ).toHaveText("3");
  await expect(
    milestoneSection.locator(".row-fluid").first().locator(".progress-success"),
  ).toHaveAttribute("title", "25%");
  await expect(milestoneSection.locator(".row-fluid").nth(1).locator(".span6 a")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/issues?state=open&milestoneId=0",
  );
  const milestoneRow = await layoutBox(page, ".overview-milestone > .row-fluid:first-child");
  const milestoneNameColumn = await layoutBox(
    page,
    ".overview-milestone > .row-fluid:first-child > .span6",
  );
  const milestoneCountColumn = await layoutBox(
    page,
    ".overview-milestone > .row-fluid:first-child > .span3.num",
  );
  const milestoneProgressColumn = await layoutBox(
    page,
    ".overview-milestone > .row-fluid:first-child > .span3.nm",
  );
  const milestoneProgressBar = await layoutBox(
    page,
    ".overview-milestone > .row-fluid:first-child .progress .bar",
  );
  expect(milestoneNameColumn.x).toBeCloseTo(milestoneRow.x, 0);
  expect(milestoneNameColumn.width).toBeGreaterThan(milestoneCountColumn.width);
  expect(milestoneCountColumn.x).toBeGreaterThan(
    milestoneNameColumn.x + milestoneNameColumn.width - 1,
  );
  expect(milestoneProgressColumn.x).toBeGreaterThan(
    milestoneCountColumn.x + milestoneCountColumn.width - 1,
  );
  expect(milestoneProgressBar.width).toBeGreaterThan(milestoneProgressColumn.width * 0.2);
  expect(milestoneProgressBar.width).toBeLessThan(milestoneProgressColumn.width * 0.3);

  const pullRequestSection = page.locator(".overview-pullrequest").first();
  await expect(pullRequestSection.locator("> .row-fluid")).toHaveCount(1);
  await expect(pullRequestSection.locator(".span9.title .usf-group")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/pullRequests?contributorId=2",
  );
  await expect(pullRequestSection.locator(".span9.title > a").nth(1)).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/pullRequest/3",
  );
  await expect(pullRequestSection.locator(".span3.num.right-txt")).toHaveText("2026-06-26");
  await expect(pullRequestSection.locator(".right-txt.mt5 a")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/pullRequests",
  );
  const pullRequestRow = await layoutBox(page, ".overview-pullrequest > .row-fluid:first-child");
  const pullRequestTitleColumn = await layoutBox(
    page,
    ".overview-pullrequest > .row-fluid:first-child > .span9.title",
  );
  const pullRequestDateColumn = await layoutBox(
    page,
    ".overview-pullrequest > .row-fluid:first-child > .span3.num.right-txt",
  );
  const pullRequestMoreLink = await layoutBox(page, ".overview-pullrequest > .right-txt.mt5");
  expect(pullRequestTitleColumn.x).toBeCloseTo(pullRequestRow.x, 0);
  expect(pullRequestTitleColumn.width).toBeGreaterThan(pullRequestDateColumn.width * 2.5);
  expect(pullRequestDateColumn.x).toBeGreaterThan(
    pullRequestTitleColumn.x + pullRequestTitleColumn.width - 1,
  );
  expect(pullRequestMoreLink.x + pullRequestMoreLink.width).toBeLessThanOrEqual(
    pullRequestRow.x + pullRequestRow.width + 1,
  );

  const labelSection = page.locator(".overview-label").first();
  await expect(labelSection).toHaveClass(/dl-horizontal/);
  await expect(labelSection.locator("> dt")).toHaveText("Priority");
  await expect(labelSection.locator("> dd > .row-fluid")).toHaveCount(1);
  await expect(labelSection.locator(".span10 a")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/issues?state=open&labelIds=5",
  );
  await expect(labelSection.locator(".issue-label.list-label.active")).toHaveAttribute(
    "data-label-id",
    "5",
  );
  await expect(labelSection.locator(".issue-label.list-label.active")).toHaveText("High");
  await expect(labelSection.locator(".span2.num strong")).toHaveText("4");

  const overviewLabel = await layoutBox(page, ".overview-label");
  const labelDt = await layoutBox(page, ".overview-label > dt");
  const labelDd = await layoutBox(page, ".overview-label > dd");
  const labelRow = await layoutBox(page, ".overview-label .row-fluid");
  const labelNameColumn = await layoutBox(page, ".overview-label .row-fluid > .span10");
  const labelCountColumn = await layoutBox(page, ".overview-label .row-fluid > .span2.num");
  const labelChip = await layoutBox(page, ".overview-label .issue-label[data-label-id='5']");
  const labelCount = await layoutBox(page, ".overview-label .span2.num strong");

  expect(overviewLabel.x).toBeGreaterThanOrEqual(rightColumn.x);
  expect(overviewLabel.width).toBeLessThanOrEqual(rightColumn.width);
  expect(labelDd.x).toBeGreaterThan(labelDt.x + labelDt.width - 1);
  expect(labelRow.y).toBeGreaterThanOrEqual(labelDd.y);
  expect(labelNameColumn.x).toBeCloseTo(labelRow.x, 0);
  expect(labelNameColumn.width).toBeGreaterThan(labelCountColumn.width * 4);
  expect(labelCountColumn.x).toBeGreaterThan(labelNameColumn.x + labelNameColumn.width - 1);
  expect(labelChip.x).toBeGreaterThanOrEqual(labelNameColumn.x);
  expect(labelChip.y).toBeGreaterThanOrEqual(labelNameColumn.y);
  expect(labelCount.x).toBeGreaterThanOrEqual(labelCountColumn.x);
  expect(labelCount.y).toBeGreaterThanOrEqual(labelCountColumn.y);
});

test("project README file renders inside the legacy readme bubble", async ({ page }) => {
  await page.unroute(projectContainerRoute);
  await routeProjectContainer(page, {
    ...projectContainerPayload(),
    readmeFile: {
      bodyMarkdown: "README file body with @owner",
      mentionReferences: [
        {
          kind: "user",
          label: "owner",
          loginId: "owner",
          ownerName: "",
          projectName: "",
        },
      ],
      name: "README.md",
    },
    viewerCanUpdate: true,
  });

  await page.goto("/yona/owner/projectYobi");

  const leftPane = await layoutBox(page, ".span-left-pane");
  const readmeBubble = await layoutBox(page, ".bubble-wrap.gray.readme");
  const readmeWrap = await layoutBox(
    page,
    ".bubble-wrap.gray.readme > .readme-wrap.project-git-readme",
  );
  const readmeHeader = await layoutBox(page, ".readme-wrap.project-git-readme > header");
  const readmeBody = await layoutBox(
    page,
    ".readme-wrap.project-git-readme > .readme-body.markdown-wrap",
  );

  await expect(page.locator(".readme-wrap.project-git-readme .yobicon-book-open")).toHaveCount(1);
  await expect(page.locator(".readme-wrap.project-git-readme header strong")).toContainText(
    "README.md",
  );
  await expect(page.locator(".readme-wrap.project-git-readme header .ybtn")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/postform?readme=true",
  );
  await expect(page.locator(".readme-wrap.project-git-readme .readme-body")).toContainText(
    "README file body",
  );
  await expect(page.locator(".readme-wrap.project-git-readme .readme-body a")).toHaveAttribute(
    "href",
    "/yona/owner",
  );
  expect(readmeBubble.x).toBeGreaterThanOrEqual(leftPane.x);
  expect(readmeBubble.width).toBeLessThanOrEqual(leftPane.width + 1);
  expect(readmeWrap.x).toBeGreaterThanOrEqual(readmeBubble.x);
  expect(readmeWrap.width).toBeLessThanOrEqual(readmeBubble.width + 1);
  expect(readmeHeader.y).toBeCloseTo(readmeWrap.y, 0);
  expect(readmeBody.y).toBeGreaterThan(readmeHeader.y + readmeHeader.height - 1);
});

test("project DB README post uses the legacy readme wrapper when code is disabled", async ({
  page,
}) => {
  await page.unroute(projectContainerRoute);
  await routeProjectContainer(page, {
    ...projectContainerPayload(),
    cloneUrl: "",
    readmeFile: {
      bodyMarkdown: "",
      mentionReferences: [],
      name: "README.md",
    },
    showCode: false,
    viewerCanUpdate: true,
  });
  await page.unroute(projectPostsRoute);
  await routeProjectPosts(page, {
    ...postsPayload(),
    readme: {
      attachments: [],
      authorId: "2",
      authorLabel: "Member",
      authorLoginId: "member",
      bodyHtml: "",
      bodyMarkdown: "DB README post body",
      commentCount: 0,
      comments: [],
      createdLabel: "2026-06-26",
      historyHtml: "",
      historyMarkdown: "",
      id: "99",
      issueReferences: [],
      isWatching: false,
      labels: [],
      mentionReferences: [],
      notice: false,
      ownerName: "owner",
      permissions: {
        canComment: false,
        canCreate: false,
        canDelete: false,
        canRead: true,
        canSetNotice: false,
        canUpdate: true,
        canWatch: false,
      },
      postNumber: "99",
      projectName: "projectYobi",
      readme: true,
      title: "README",
      updatedLabel: "2026-06-26",
      watcherCount: 0,
    },
  });

  await page.goto("/yona/owner/projectYobi");

  const readmeBubble = await layoutBox(page, ".bubble-wrap.gray.readme");
  const readmeWrap = await layoutBox(
    page,
    ".bubble-wrap.gray.readme > .readme-wrap.project-readme-post",
  );
  const readmeHeader = await layoutBox(page, ".readme-wrap.project-readme-post > header");
  const readmeBody = await layoutBox(
    page,
    ".readme-wrap.project-readme-post > .readme-body.markdown-wrap",
  );

  await expect(page.locator(".project-clone-wrap")).toHaveCount(0);
  await expect(page.locator(".readme-wrap.project-readme-post .yobicon-book-open")).toHaveCount(1);
  await expect(page.locator(".readme-wrap.project-readme-post header strong")).toContainText(
    "README",
  );
  await expect(page.locator(".readme-wrap.project-readme-post header .ybtn")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/postform?readme=true",
  );
  await expect(page.locator(".readme-wrap.project-readme-post .readme-body")).toContainText(
    "DB README post body",
  );
  expect(readmeWrap.x).toBeGreaterThanOrEqual(readmeBubble.x);
  expect(readmeWrap.width).toBeLessThanOrEqual(readmeBubble.width + 1);
  expect(readmeHeader.y).toBeCloseTo(readmeWrap.y, 0);
  expect(readmeBody.y).toBeGreaterThan(readmeHeader.y + readmeHeader.height - 1);
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
  await expect(page).toHaveURL(/\/yona\/me$/);
});
