import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function prItem(number: number, title: string, state = "open") {
  return {
    commentThreadCount: 1,
    conflict: state === "conflict",
    contributorLabel: "Nori",
    contributorLoginId: "nori",
    createdLabel: "2026-05-01",
    fromBranch: `topic/pr-${number}`,
    fromOwnerName: "admin",
    fromProjectName: "projectYobi",
    id: number,
    ownerName: "admin",
    projectName: "projectYobi",
    pullRequestNumber: number,
    receiverLabel: "Reviewer",
    receiverLoginId: "reviewer",
    reviewerCount: 1,
    state,
    title,
    toBranch: "main",
    updatedLabel: "2026-05-02",
  };
}

const reviewThread = {
  authorId: 1,
  authorLabel: "Nori",
  authorLoginId: "nori",
  comments: [
    {
      authorId: 2,
      authorLabel: "Reviewer",
      authorLoginId: "reviewer",
      contentsHtml: "<p>Review comment body</p>",
      contentsMarkdown: "Review comment body",
      createdLabel: "2026-05-03",
      id: 8,
      threadId: 7,
    },
  ],
  commitId: "abcdef123456",
  createdLabel: "2026-05-03",
  endLine: 2,
  id: 7,
  path: "src/lib.rs",
  prevCommitId: "base",
  startLine: 1,
  state: "open",
};

const pullRequestDetail = {
  bodyHtml: "<p>Pull request markdown body</p>",
  bodyMarkdown: "Pull request markdown body",
  commits: [
    {
      authorDateLabel: "2026-05-01",
      authorEmail: "nori@example.com",
      commitId: "abcdef123456",
      commitMessage: "Read surface",
      commitShortId: "abcdef1",
      state: "CURRENT",
    },
  ],
  conflict: false,
  contributor: {
    loginId: "nori",
    userId: 1,
    userLabel: "Nori",
  },
  createdLabel: "2026-05-01",
  events: [
    {
      createdLabel: "2026-05-01",
      eventType: "NEW_PULL_REQUEST",
      id: 9,
      newValue: "PR detail title",
      oldValue: "",
      senderLoginId: "nori",
    },
  ],
  fromBranch: "topic/pr-3",
  fromOwnerName: "admin",
  fromProjectName: "projectYobi",
  id: 3,
  isWatching: false,
  mergedCommitIdFrom: "",
  mergedCommitIdTo: "",
  ownerName: "admin",
  permissions: {
    canComment: true,
    canRead: true,
    canReadChanges: true,
    canReview: true,
    canUpdate: false,
    canUpdateState: false,
  },
  projectName: "projectYobi",
  pullRequestNumber: 3,
  receiver: {
    loginId: "reviewer",
    userId: 2,
    userLabel: "Reviewer",
  },
  reviewers: [{ loginId: "reviewer", userId: 2, userLabel: "Reviewer" }],
  state: "open",
  threads: [reviewThread],
  title: "PR detail title",
  toBranch: "main",
  updatedLabel: "2026-05-02",
  watcherCount: 1,
};

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
        actorId: 2,
        defaultLandingPath: "/me",
        isAnonymous: false,
        loginId: "reviewer",
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
      body: JSON.stringify({
        boardCount: 0,
        codeMemberOnly: false,
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        members: [],
        memberCount: 0,
        openIssueCount: 0,
        openPullRequestCount: 1,
        organizationName: "",
        overview: "PR read surface",
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 1,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/organizations/acme/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "ACME",
        enrollmentRequested: false,
        memberMembers: [],
        organizationName: "acme",
        viewerCanCreateProject: false,
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/pull-requests(?:\?.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      const category = url.searchParams.get("category") || "open";
      const item =
        category === "closed"
          ? prItem(4, "Closed read surface", "closed")
          : category === "sent"
            ? prItem(5, "Sent read surface", "open")
            : prItem(3, "Open read surface", "open");
      await route.fulfill({
        body: JSON.stringify({
          category,
          items: [item],
          pageNum: 1,
          pageSize: 15,
          totalCount: 1,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/pull-requests/3"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(pullRequestDetail),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/pull-requests/3/changes"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          commits: [],
          files: [],
          pullRequest: pullRequestDetail,
          threads: [reviewThread],
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/reviews(?:\?.*)?$/,
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          closedCount: 0,
          items: [reviewThread],
          openCount: 1,
          pageNum: 1,
          pageSize: 15,
          state: "open",
          totalCount: 1,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(/\/api\/v1\/organizations\/acme\/pull-requests(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const category = url.searchParams.get("category") || "open";
    await route.fulfill({
      body: JSON.stringify({
        category,
        items: [prItem(2, "Organization read surface", category === "closed" ? "closed" : "open")],
        pageNum: 1,
        pageSize: 15,
        totalCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("renders project PR lists, detail, changes, and reviews without placeholders", async ({
  page,
}) => {
  await page.goto("/yona/admin/projectYobi/pullRequests?pageNum=1");
  await expect(page.locator(".pullrequeset-tab-menu")).toContainText("Open");
  await expect(page.locator(".post-list-wrap")).toContainText("Open read surface");
  await expect(page.locator("main")).not.toContainText("File-based route placeholder");

  await page.goto("/yona/admin/projectYobi/closedPullRequests?pageNum=1");
  await expect(page.locator(".state.closed")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/sentPullRequests?pageNum=1");
  await expect(page.locator(".post-list-wrap")).toContainText("Sent read surface");

  await page.goto("/yona/admin/projectYobi/pullRequest/3");
  await expect(page.locator(".pullRequest-branchInfo")).toContainText("topic/pr-3");
  await expect(page.locator(".review-card")).toContainText("Review comment body");
  await expect(page.locator(".ybtn", { hasText: "Changes" })).toBeVisible();

  await page.goto("/yona/admin/projectYobi/pullRequest/3/changes");
  await expect(page.locator("main")).toContainText("No changed file diff is available.");

  await page.goto("/yona/admin/projectYobi/reviews?state=open");
  await expect(page.getByRole("heading", { name: "Reviews" })).toBeVisible();
  await expect(page.locator(".review-card")).toContainText("src/lib.rs");
});

test("renders organization PR lists and REST error shells", async ({ page }) => {
  await page.goto("/yona/organizations/acme/pullrequests?pageNum=1");
  await expect(page.locator(".post-list-wrap")).toContainText("Organization read surface");

  await page.goto("/yona/organizations/acme/closedPullrequests?pageNum=1");
  await expect(page.locator(".state.closed")).toBeVisible();

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/pull-requests/403"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          error: { code: "permission_denied", message: "forbidden", status: 403 },
        }),
        headers: restJsonHeaders,
        status: 403,
      });
    },
  );
  await page.goto("/yona/admin/projectYobi/pullRequest/403");
  await expect(page.getByRole("heading", { name: "Forbidden" })).toBeVisible();

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/pull-requests/404"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify({ error: { code: "not_found", message: "missing", status: 404 } }),
        headers: restJsonHeaders,
        status: 404,
      });
    },
  );
  await page.goto("/yona/admin/projectYobi/pullRequest/404");
  await expect(page.getByRole("heading", { name: "Not found" })).toBeVisible();
});
