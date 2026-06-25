import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

const projectContainer = {
  cloneUrl: "https://example.com/admin/projectYobi.git",
  dashboard: {
    labels: [
      {
        categoryId: 4,
        categoryIsExclusive: false,
        categoryName: "Type",
        color: "#f44336",
        id: 5,
        name: "bug",
        openIssueCount: 1,
      },
    ],
  },
  enrollmentRequested: false,
  isFavorited: false,
  isWatching: false,
  logoUrl: "",
  memberCount: 1,
  members: [],
  openIssueCount: 2,
  openPullRequestCount: 0,
  organizationName: "",
  overview: "Issue form parity",
  ownerName: "admin",
  projectName: "projectYobi",
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

const milestones = [
  {
    closedIssueCount: 0,
    completionPercent: 0,
    contentsHtml: "",
    contentsMarkdown: "",
    dueDateLabel: "2026-07-01",
    id: "7",
    openIssueCount: 1,
    state: "open",
    title: "Next",
    viewerCanDelete: true,
    viewerCanUpdate: true,
    attachments: [],
    closedIssues: [],
    openIssues: [],
  },
  {
    closedIssueCount: 1,
    completionPercent: 100,
    contentsHtml: "",
    contentsMarkdown: "",
    dueDateLabel: "2026-06-01",
    id: "8",
    openIssueCount: 0,
    state: "closed",
    title: "Done",
    viewerCanDelete: true,
    viewerCanUpdate: true,
    attachments: [],
    closedIssues: [],
    openIssues: [],
  },
];

const parentOptions = {
  items: [
    { id: "31", issueNumber: "31", selected: false, title: "Parent issue" },
    { id: "32", issueNumber: "32", selected: false, title: "Other issue" },
  ],
};

function issueDetail(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    assigneeAvatarUrl: "",
    assigneeLabel: "Nori",
    assigneeLoginId: "nori",
    attachments: [],
    authorAvatarUrl: "",
    authorId: "1",
    authorLabel: "Admin",
    authorLoginId: "admin",
    bodyMarkdown: "Existing body",
    childClosedCount: 0,
    childIssues: [],
    childOpenCount: 0,
    commentCount: 0,
    comments: [],
    createdLabel: "just now",
    dueDateLabel: "2026-07-03",
    hasVoted: false,
    historyMarkdown: "",
    isDraft: false,
    isFavorited: false,
    isWatching: false,
    issueId: "170",
    issueNumber: "17",
    issueReferences: [],
    issueVoters: [],
    labels: [{ color: "#f44336", id: "5", name: "bug" }],
    mentionReferences: [],
    milestoneId: "8",
    milestoneTitle: "Done",
    ownerName: "admin",
    parentIssueId: "31",
    parentIssueNumber: "31",
    parentIssueState: "open",
    parentIssueTitle: "Parent issue",
    projectName: "projectYobi",
    sharers: [],
    state: "closed",
    timeline: [],
    title: "Existing issue",
    viewerCanComment: true,
    viewerCanDelete: true,
    viewerCanManageSharers: true,
    viewerCanUpdate: true,
    viewerHasInheritedShare: false,
    viewerIsDirectSharer: false,
    voterCount: 0,
    watcherCount: 0,
    weight: 0,
    ...overrides,
  };
}

async function installRuntime(page: Page) {
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

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/me",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Admin",
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

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainer),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/milestones?*"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({ milestones }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/parent-options?*"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(parentOptions),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/projects/admin/projectYobi/issues/parent-options"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(parentOptions),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
}

test.beforeEach(async ({ page }) => {
  await installRuntime(page);
});

test("project issue create form validates, submits REST JSON, and redirects to detail", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  await page.route(apiV1Route("/projects/admin/projectYobi/issues"), async (route) => {
    const request = route.request();
    requests.push({
      body: request.postDataJSON(),
      method: request.method(),
      path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
    });
    await route.fulfill({
      body: JSON.stringify(issueDetail({ issueNumber: "22", title: "Created issue" })),
      headers: restJsonHeaders,
      status: 201,
    });
  });
  await page.route(apiV1Route("/projects/admin/projectYobi/issues/22"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(issueDetail({ issueNumber: "22", title: "Created issue" })),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issueform?parentIssueId=31&commentId=55");

  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".content-wrap.frm-wrap")).toBeVisible();
  await expect(page.locator("#issue-form")).toBeVisible();
  await expect(page.locator("#targetProjectId")).toBeVisible();
  await expect(page.locator("#parentId")).toHaveValue("31");
  await expect(page.locator('input[name="referCommentId"]')).toHaveValue("55");
  await expect(page.locator('#milestoneId option[value="7"]')).toHaveText("Next");
  await expect(page.locator('#milestoneId option[value="8"]')).toHaveCount(0);
  await expect(page.locator('#labelIds option[value="5"]')).toHaveText("bug");

  await page.locator("#button-save").click();
  await expect(page.getByRole("alert")).toHaveText("Issue title is a required field.");
  expect(requests).toEqual([]);

  await page.locator("#title").fill("Created issue");
  await page.locator("#editor-body-content-body").fill("Created body");
  await page.locator("#assignee").fill("nori");
  await page.locator("#issueDueDate").fill("2026-07-04");
  await page.locator("#milestoneId").selectOption("7");
  await page.locator('.issue-labels-fallback input[name="labelIds"][value="5"]').check();
  await page.locator("#draft-save-btn").click();

  await expect
    .poll(() => requests.some((request) => request.path === "/projects/admin/projectYobi/issues"))
    .toBe(true);
  expect(requests.at(-1)).toEqual({
    body: {
      assigneeLoginId: "nori",
      attachmentIds: [],
      bodyMarkdown: "Created body",
      dueDate: "2026-07-04",
      isDraft: true,
      isPublish: false,
      labelIds: ["5"],
      milestoneId: "7",
      parentIssueId: "31",
      referCommentId: "55",
      title: "Created issue",
    },
    method: "POST",
    path: "/projects/admin/projectYobi/issues",
  });
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/issue\/22$/);
  await expect(page.locator("body")).toContainText("Created issue");
});

test("project issue edit form validates due date and submits updated REST JSON", async ({
  page,
}) => {
  const requests: Array<{ body: unknown; method: string; path: string }> = [];
  let currentIssue = issueDetail();
  await page.route(apiV1Route("/projects/admin/projectYobi/issues/17"), async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      requests.push({
        body: request.postDataJSON(),
        method: request.method(),
        path: new URL(request.url()).pathname.replace("/yona/api/v1", ""),
      });
      currentIssue = issueDetail({
        bodyMarkdown: "Updated body",
        dueDateLabel: "2026-07-05",
        milestoneId: "7",
        milestoneTitle: "Next",
        state: "closed",
        title: "Updated issue",
      });
      await route.fulfill({
        body: JSON.stringify(currentIssue),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify(currentIssue),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/issue/17/editform");

  await expect(page.locator('input[name="authorId"]')).toHaveValue("1");
  await expect(page.locator("#isDraft")).toHaveValue("false");
  await expect(page.locator("#isPublish")).toHaveValue("false");
  await expect(page.locator('#state li[data-value="CLOSED"]')).toHaveAttribute(
    "data-selected",
    "true",
  );
  await expect(page.locator("#notificationMail")).toBeChecked();
  await expect(page.locator("#title")).toHaveValue("Existing issue");
  await expect(page.locator("#editor-body-content-body")).toHaveValue("Existing body");
  await expect(page.locator("#issueDueDate")).toHaveValue("2026-07-03");
  await expect(page.locator('#milestoneId optgroup[label="Open"] option[value="7"]')).toHaveText(
    "Next",
  );
  await expect(page.locator('#milestoneId optgroup[label="Closed"] option[value="8"]')).toHaveText(
    "Done",
  );
  await expect(
    page.locator('.issue-labels-fallback input[name="labelIds"][value="5"]'),
  ).toBeChecked();

  await page.locator("#issueDueDate").fill("not-a-date");
  await page.locator("#button-save").click();
  await expect(page.getByRole("alert")).toHaveText("Issue due date is not valid date type.");
  expect(requests).toEqual([]);

  await page.locator("#title").fill("Updated issue");
  await page.locator("#editor-body-content-body").fill("Updated body");
  await page.locator("#assignee").fill("nori");
  await page.locator("#issueDueDate").fill("2026-07-05");
  await page.locator("#milestoneId").selectOption("7");
  await page.locator("#parentId").selectOption("31");
  await page.locator("#button-save").click();

  await expect
    .poll(() =>
      requests.some((request) => request.path === "/projects/admin/projectYobi/issues/17"),
    )
    .toBe(true);
  expect(requests.at(-1)).toEqual({
    body: {
      assigneeLoginId: "nori",
      attachmentIds: [],
      bodyMarkdown: "Updated body",
      dueDate: "2026-07-05",
      isDraft: false,
      isPublish: false,
      labelIds: ["5"],
      milestoneId: "7",
      parentIssueId: "31",
      title: "Updated issue",
    },
    method: "PUT",
    path: "/projects/admin/projectYobi/issues/17",
  });
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/issue\/17$/);
  await expect(page.locator("body")).toContainText("Updated issue");
});
