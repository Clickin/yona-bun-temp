import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;
const rawPullRequestReviewKeyPattern =
  /pullRequest\.[A-Za-z]|review\.[A-Za-z]|title\.pullrequest|title\.codeReview/u;

type LayoutBox = { height: number; width: number; x: number; y: number };

async function layoutBox(page: Page, selector: string): Promise<LayoutBox> {
  const box = await page.locator(selector).first().boundingBox();
  expect(box, selector).not.toBeNull();
  return box as LayoutBox;
}

function prItem(number: number, title: string, state = "open") {
  return {
    closedCommentThreadCount: 0,
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
  authorAvatarUrl: "/yona/avatar/nori.png",
  authorLabel: "Nori",
  authorLoginId: "nori",
  comments: [
    {
      authorId: 2,
      authorLabel: "Reviewer",
      authorLoginId: "reviewer",
      contentsHtml: "",
      contentsMarkdown: "Review **comment** body",
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
  pullRequestNumber: 3,
  startLine: 1,
  state: "open",
};

const commitDiscussionThread = {
  authorId: 2,
  authorAvatarUrl: "/yona/avatar/reviewer.png",
  authorLabel: "Reviewer",
  authorLoginId: "reviewer",
  comments: [
    {
      authorId: 2,
      authorLabel: "Reviewer",
      authorLoginId: "reviewer",
      contentsHtml: "",
      contentsMarkdown: "Commit discussion body",
      createdLabel: "2026-05-04",
      id: 12,
      threadId: 11,
    },
  ],
  commitId: "fedcba654321",
  createdLabel: "2026-05-04",
  endLine: 4,
  id: 11,
  path: "src/main.rs",
  prevCommitId: "",
  startLine: 4,
  state: "open",
};

const pullRequestDetail = {
  bodyHtml: "",
  bodyMarkdown: "Pull request **markdown** body",
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
    avatarUrl: "/yona/avatar/nori.png",
    loginId: "nori",
    userId: 1,
    userLabel: "Nori",
  },
  createdLabel: "2026-05-01",
  events: [
    {
      commits: [],
      createdLabel: "2026-05-01",
      eventType: "PULL_REQUEST_STATE_CHANGED",
      id: 9,
      newValue: "OPEN",
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
    avatarUrl: "/yona/avatar/reviewer.png",
    loginId: "reviewer",
    userId: 2,
    userLabel: "Reviewer",
  },
  reviewers: [
    {
      avatarUrl: "/yona/avatar/reviewer.png",
      loginId: "reviewer",
      userId: 2,
      userLabel: "Reviewer",
    },
  ],
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
          acceptedCount: 1,
          category,
          closedCount: 1,
          currentUserId: 1,
          contributors: [{ loginId: "nori", userId: 1, userLabel: "Nori" }],
          items: [item],
          openCount: 31,
          pageNum: Number(url.searchParams.get("pageNum") || "1"),
          pageSize: 15,
          recentlyPushedBranches: [],
          sentCount: 1,
          totalCount: category === "open" ? 31 : 1,
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
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/pull-requests\/3\/changes(?:\?.*)?$/,
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
          allCount: 2,
          authorCount: 0,
          closedCount: 0,
          items: [reviewThread, commitDiscussionThread],
          openCount: 2,
          pageNum: 1,
          pageSize: 15,
          participantCount: 2,
          state: "open",
          totalCount: 2,
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
  await expect(page.locator("#search .search-btn .yobicon-search")).toHaveCount(1);
  await expect(page.locator("#advanced-search-form #contributors")).toBeVisible();
  await expect(page.locator("#advanced-search-form #contributors")).toContainText("Sent by me");
  await expect(page.locator(".post-list-wrap")).toContainText("Open read surface");
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/pullRequests?pageNum=2",
  );
  await expect(page.locator("main")).not.toContainText("File-based route placeholder");
  await expect(page.locator("body")).not.toContainText(rawPullRequestReviewKeyPattern);
  const listProjectWrap = await layoutBox(page, ".project-page-wrap");
  const listTabs = await layoutBox(page, ".pullrequeset-tab-menu");
  const listSearch = await layoutBox(page, "form#search");
  const listAdvanced = await layoutBox(page, "#advanced-search-form");
  const listPostWrap = await layoutBox(page, ".post-list-wrap");
  const listItemAvatar = await layoutBox(page, ".post-list-wrap .post-item .avatar-wrap.mlarge");
  const listItemTitle = await layoutBox(page, ".post-list-wrap .post-item .title-wrap");
  const listItemInfos = await layoutBox(page, ".post-list-wrap .post-item .infos");
  const listItemState = await layoutBox(page, ".post-list-wrap .post-item .state");
  const listPagination = await layoutBox(page, "#pagination.page-navigation-wrap");
  expect(listProjectWrap.width).toBeGreaterThan(700);
  expect(listTabs.y).toBeLessThanOrEqual(listSearch.y);
  expect(listSearch.y).toBeLessThan(listAdvanced.y);
  expect(listAdvanced.y).toBeLessThan(listPostWrap.y);
  expect(listPostWrap.width).toBeGreaterThan(listProjectWrap.width * 0.65);
  expect(listItemAvatar.x).toBeLessThan(listItemTitle.x);
  expect(listItemTitle.y).toBeLessThan(listItemInfos.y);
  expect(listItemState.x).toBeGreaterThan(listItemTitle.x + listItemTitle.width);
  expect(listPagination.y).toBeGreaterThan(listPostWrap.y);

  await page.goto("/yona/admin/projectYobi/closedPullRequests?pageNum=1");
  await expect(page.locator(".state.closed")).toBeVisible();
  await expect(page.locator("body")).not.toContainText(rawPullRequestReviewKeyPattern);

  await page.goto("/yona/admin/projectYobi/sentPullRequests?pageNum=1");
  await expect(page.locator(".post-list-wrap")).toContainText("Sent read surface");
  await expect(page.locator("body")).not.toContainText(rawPullRequestReviewKeyPattern);

  await page.goto("/yona/admin/projectYobi/pullRequest/3");
  await expect(page.locator(".pullRequest-branchInfo")).toContainText("topic/pr-3");
  await expect(page.locator("ul#comments")).toContainText("nori opened this pull request.");
  await expect(page.locator("ul#comments")).not.toContainText("pullRequest.event.message");
  await expect(page.locator(".review-card")).toHaveCount(0);
  await expect(
    page.locator(".pull-request-overview-tabs a", { hasText: "Overview" }),
  ).toBeVisible();
  await expect(page.locator(".pull-request-overview-tabs a", { hasText: "Changes" })).toBeVisible();
  const detailHeader = await layoutBox(page, ".board-header.issue");
  const detailTabs = await layoutBox(page, ".pull-request-overview-tabs");
  const detailBody = await layoutBox(page, ".board-body");
  const detailBranchInfo = await layoutBox(page, ".pullRequest-branchInfo");
  const detailBranchFrom = await layoutBox(page, ".pullRequest-branchInfo code.from");
  const detailBranchTo = await layoutBox(page, ".pullRequest-branchInfo code.to");
  const detailState = await layoutBox(page, "#state.pullRequest-stateInfo");
  const detailFooter = await layoutBox(page, ".board-footer.board-actrow");
  const detailEvents = await layoutBox(page, "ul#comments");
  const detailEventState = await layoutBox(page, "ul#comments .event .state");
  const detailEventDate = await layoutBox(page, "ul#comments .event .date");
  expect(detailHeader.width).toBeGreaterThan(700);
  expect(detailTabs.y).toBeGreaterThan(detailHeader.y);
  expect(detailBody.y).toBeGreaterThan(detailTabs.y);
  expect(detailBranchInfo.y).toBeGreaterThan(detailBody.y - 2);
  expect(detailBranchFrom.x).toBeLessThan(detailBranchTo.x);
  expect(detailState.y).toBeGreaterThan(detailBody.y);
  expect(detailFooter.y).toBeGreaterThan(detailState.y);
  expect(detailEvents.y).toBeGreaterThan(detailFooter.y);
  expect(detailEventDate.x).toBeGreaterThan(detailEventState.x + detailEventState.width);
  expect(detailBody.x).toBeCloseTo(detailHeader.x, 1);

  await page.goto("/yona/admin/projectYobi/pullRequest/3/changes");
  await expect(page.locator("#commits")).toContainText("All commit changes");
  await expect(page.locator(".diff-body.diffs-wrap-scroll")).toBeVisible();
  await expect(page.locator(".diff-body .btnPop")).toBeVisible();
  await expect(page.locator(".review-card")).toContainText("Review **comment** body");
  await expect(page.locator("main")).not.toContainText("No changed file diff is available.");
  const changesTabs = await layoutBox(page, ".pull-request-overview-tabs");
  const changesAuthor = await layoutBox(page, ".board-body.mb20 .author-info");
  const commitsDropdown = await layoutBox(page, "#commits.btn-group");
  const diffBody = await layoutBox(page, ".diff-body.diffs-wrap-scroll");
  const reviewWrap = await layoutBox(page, ".review-wrap .review-container");
  const reviewCard = await layoutBox(page, ".review-wrap .review-card");
  const reviewCardInfo = await layoutBox(page, ".review-wrap .review-card .info");
  expect(changesAuthor.y).toBeGreaterThan(changesTabs.y);
  expect(commitsDropdown.y).toBeGreaterThan(changesAuthor.y);
  expect(diffBody.y).toBeGreaterThan(commitsDropdown.y);
  expect(diffBody.width).toBeGreaterThan(400);
  expect(reviewWrap.width).toBeGreaterThan(180);
  expect(reviewWrap.x).toBeGreaterThan(diffBody.x + diffBody.width - 40);
  expect(reviewCard.y).toBeGreaterThan(reviewWrap.y);
  expect(reviewCardInfo.y).toBeGreaterThan(reviewCard.y);

  await page.goto("/yona/admin/projectYobi/reviews?state=open");
  await expect(page.locator(".project-page-wrap .issue-list-wrap")).toBeVisible();
  await expect(page.locator(".review-list-wrap .post-list-wrap")).toContainText(
    "Review **comment** body",
  );
  await expect(page.locator(".review-list-wrap .post-item .title-wrap").nth(0)).toHaveCSS(
    "white-space",
    "nowrap",
  );
  await expect(page.locator(".review-list-wrap .post-item .title-wrap").nth(0)).toHaveCSS(
    "overflow",
    "hidden",
  );
  await expect(page.locator(".review-list-wrap .post-item .title-wrap").nth(0)).toHaveCSS(
    "text-overflow",
    "ellipsis",
  );
  await expect(page.locator(".review-list-wrap .post-item .title").nth(0)).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/pullRequest/3/changes/abcdef123456#thread-7",
  );
  await expect(page.locator(".review-list-wrap .post-list-wrap")).toContainText(
    "Commit discussion body",
  );
  await expect(page.locator(".review-list-wrap .post-item .title").nth(1)).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/commit/fedcba654321#thread-11",
  );
  const reviewSearchWrap = await layoutBox(page, ".issue-list-wrap .search-wrap");
  const reviewResultsColumn = await layoutBox(page, ".issue-list-wrap .span10.span-hard-wrap");
  const reviewTabs = await layoutBox(page, ".issue-list-wrap .nav-tabs");
  const reviewList = await layoutBox(page, ".review-list-wrap .post-list-wrap");
  const reviewListAvatar = await layoutBox(page, ".review-list-wrap .post-item .avatar-wrap");
  const reviewListTitle = await layoutBox(page, ".review-list-wrap .post-item .title-wrap");
  const reviewListInfos = await layoutBox(page, ".review-list-wrap .post-item .infos");
  const reviewExport = await layoutBox(page, ".pull-left .ybtn.small");
  expect(reviewResultsColumn.x).toBeGreaterThan(reviewSearchWrap.x + reviewSearchWrap.width - 20);
  expect(reviewResultsColumn.width).toBeGreaterThan(reviewSearchWrap.width * 2);
  expect(reviewTabs.y).toBeLessThan(reviewList.y);
  expect(reviewList.y).toBeGreaterThan(reviewSearchWrap.y);
  expect(reviewListAvatar.x).toBeLessThan(reviewListTitle.x);
  expect(reviewListTitle.y).toBeLessThan(reviewListInfos.y);
  expect(reviewExport.y).toBeGreaterThan(reviewList.y);
  await expect(page.locator("body")).not.toContainText(rawPullRequestReviewKeyPattern);
});

test("preserves /reviews filter, sort, state, export, and search query interactions", async ({
  page,
}) => {
  const reviewApiUrls: string[] = [];

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/reviews(?:\?.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      reviewApiUrls.push(`${url.pathname.replace(/^\/yona/u, "")}${url.search}`);
      const state = url.searchParams.get("state") || "open";
      await route.fulfill({
        body: JSON.stringify({
          allCount: 3,
          authorCount: 1,
          closedCount: state === "closed" ? 1 : 0,
          items: [
            {
              ...reviewThread,
              comments: [
                {
                  ...reviewThread.comments[0],
                  contentsMarkdown: `${state} review filter body`,
                },
              ],
              state,
            },
          ],
          openCount: state === "open" ? 2 : 1,
          pageNum: Number(url.searchParams.get("pageNum") || "1"),
          pageSize: 15,
          participantCount: 2,
          state,
          totalCount: state === "closed" ? 1 : 45,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto(
    "/yona/admin/projectYobi/reviews?state=open&filter=src&authorId=2&orderBy=createdDate&orderDir=desc&pageNum=3",
  );
  await expect(page.locator(".lst-stacked li", { hasText: "Created" })).toHaveClass(/active/);
  await expect(page.locator('form#search input[name="filter"]')).toHaveValue("src");
  await expect(page.locator('form#search input[name="authorId"]')).toHaveValue("2");
  await expect(page.locator('form#search input[name="orderDir"]')).toHaveValue("desc");
  await expect(page.locator(".issue-list-wrap .nav-tabs li.active")).toContainText("Open");
  await expect(page.locator("#pagination input[name='pageNum']")).toHaveValue("3");
  await expect(reviewApiUrls.at(-1)).toBe(
    "/api/v1/owners/admin/projects/projectYobi/reviews?state=open&filter=src&authorId=2&orderBy=createdDate&orderDir=desc&pageNum=3",
  );

  const allReviewsLink = page.locator(".lst-stacked li").first().locator("a");
  await expect(allReviewsLink).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/reviews?state=open&filter=src&orderBy=createdDate&orderDir=desc",
  );
  await Promise.all([
    page.waitForURL(
      "/yona/admin/projectYobi/reviews?state=open&filter=src&orderBy=createdDate&orderDir=desc",
    ),
    allReviewsLink.click(),
  ]);
  await expect(page.locator(".lst-stacked li").first()).toHaveClass(/active/);
  await expect(reviewApiUrls.at(-1)).toBe(
    "/api/v1/owners/admin/projects/projectYobi/reviews?state=open&filter=src&orderBy=createdDate&orderDir=desc&pageNum=1",
  );

  const involvingYouLink = page.locator('[data-type="participantId"]');
  await expect(involvingYouLink).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/reviews?state=open&filter=src&participantId=2&orderBy=createdDate&orderDir=desc",
  );
  await Promise.all([
    page.waitForURL(
      "/yona/admin/projectYobi/reviews?state=open&filter=src&participantId=2&orderBy=createdDate&orderDir=desc",
    ),
    involvingYouLink.click(),
  ]);
  await expect(page.locator(".lst-stacked li", { hasText: "Participated." })).toHaveClass(/active/);
  await expect(reviewApiUrls.at(-1)).toBe(
    "/api/v1/owners/admin/projects/projectYobi/reviews?state=open&filter=src&participantId=2&orderBy=createdDate&orderDir=desc&pageNum=1",
  );

  const sortLink = page.locator(".filters a.filter");
  await expect(sortLink).toHaveAttribute("data-field", "createdDate");
  await expect(sortLink).toHaveAttribute("data-value", "asc");
  await expect(sortLink).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/reviews?state=open&filter=src&participantId=2&orderBy=createdDate&orderDir=asc",
  );
  const [sortRequest] = await Promise.all([
    page.waitForRequest(
      (request) =>
        request.url().includes("/api/v1/owners/admin/projects/projectYobi/reviews?") &&
        request.url().includes("participantId=2") &&
        request.url().includes("orderDir=asc") &&
        request.url().includes("pageNum=1"),
    ),
    page.waitForURL(
      "/yona/admin/projectYobi/reviews?state=open&filter=src&participantId=2&orderBy=createdDate&orderDir=asc",
    ),
    sortLink.click(),
  ]);
  const sortRequestUrl = new URL(sortRequest.url());
  expect(`${sortRequestUrl.pathname.replace(/^\/yona/u, "")}${sortRequestUrl.search}`).toBe(
    "/api/v1/owners/admin/projects/projectYobi/reviews?state=open&filter=src&participantId=2&orderBy=createdDate&orderDir=asc&pageNum=1",
  );

  const closedTab = page.locator('.nav-tabs a[data-type="state"][data-value="closed"]');
  await expect(closedTab).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/reviews?state=closed&filter=src&participantId=2&orderBy=createdDate&orderDir=asc",
  );
  await Promise.all([
    page.waitForURL(
      "/yona/admin/projectYobi/reviews?state=closed&filter=src&participantId=2&orderBy=createdDate&orderDir=asc",
    ),
    closedTab.click(),
  ]);
  await expect(page.locator(".issue-list-wrap .nav-tabs li.active")).toContainText("Closed");
  await expect(reviewApiUrls.at(-1)).toBe(
    "/api/v1/owners/admin/projects/projectYobi/reviews?state=closed&filter=src&participantId=2&orderBy=createdDate&orderDir=asc&pageNum=1",
  );

  const exportLink = page.locator(".pull-left .ybtn.small");
  await expect(exportLink).toContainText("Download as Excel file");
  await expect(exportLink).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/reviews?state=closed&filter=src&participantId=2&orderBy=createdDate&orderDir=asc&format=xls",
  );

  await page.locator('form#search input[name="filter"]').fill("commit abc");
  const [searchRequest] = await Promise.all([
    page.waitForRequest(
      (request) =>
        request.url().includes("/api/v1/owners/admin/projects/projectYobi/reviews?") &&
        request.url().includes("filter=commit+abc") &&
        request.url().includes("participantId=2") &&
        request.url().includes("state=closed"),
    ),
    page.waitForURL(/\/yona\/admin\/projectYobi\/reviews\?/),
    page.locator("form#search").evaluate((form) => {
      (form as HTMLFormElement).requestSubmit();
    }),
  ]);
  const browserSearchUrl = new URL(page.url());
  expect(browserSearchUrl.pathname).toBe("/yona/admin/projectYobi/reviews");
  expect(browserSearchUrl.searchParams.get("state")).toBe("closed");
  expect(browserSearchUrl.searchParams.get("filter")).toBe("commit abc");
  expect(browserSearchUrl.searchParams.get("participantId")).toBe("2");
  expect(browserSearchUrl.searchParams.get("orderBy")).toBe("createdDate");
  expect(browserSearchUrl.searchParams.get("orderDir")).toBe("asc");
  expect(browserSearchUrl.searchParams.has("authorId")).toBe(false);
  const searchRequestUrl = new URL(searchRequest.url());
  expect(`${searchRequestUrl.pathname.replace(/^\/yona/u, "")}${searchRequestUrl.search}`).toBe(
    "/api/v1/owners/admin/projects/projectYobi/reviews?state=closed&filter=commit+abc&participantId=2&orderBy=createdDate&orderDir=asc&pageNum=1",
  );
});

test("renders organization PR lists and REST error shells", async ({ page }) => {
  await page.goto("/yona/organizations/acme/pullrequests?pageNum=1");
  await expect(page.locator(".post-list-wrap")).toContainText("Organization read surface");
  const orgTabs = await layoutBox(page, ".pullrequeset-tab-menu");
  const orgList = await layoutBox(page, ".post-list-wrap");
  expect(orgList.y).toBeGreaterThan(orgTabs.y);
  expect(orgList.width).toBeGreaterThan(700);

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
  await expect(page.locator(".error-wrap > p").first()).toHaveText("You are not authorized");

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
  await expect(page.locator(".error-wrap > p").first()).toHaveText("Page not found");
});

test("renders PR detail, changes, and review thread anchors on a mobile viewport", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  await page.goto("/yona/admin/projectYobi/pullRequest/3");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".pullRequest-branchInfo")).toContainText("topic/pr-3");
  await expect(
    page.locator(".pull-request-overview-tabs a", { hasText: "Overview" }),
  ).toBeVisible();
  await expect(page.locator(".pull-request-overview-tabs a", { hasText: "Changes" })).toBeVisible();
  await expect(page.locator("ul#comments")).toContainText("nori opened this pull request.");
  await expect(page.locator("main")).not.toContainText("File-based route placeholder");
  await expect(page.locator("body")).not.toContainText("pullRequest.");

  await page.goto("/yona/admin/projectYobi/pullRequest/3/changes");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator(".pullRequest-branchInfo")).toContainText("topic/pr-3");
  await expect(page.locator("#commits")).toContainText("All commit changes");
  await expect(page.locator(".diff-body.diffs-wrap-scroll")).toBeVisible();
  await expect(page.locator(".diff-body .btnPop")).toBeVisible();
  await expect(page.locator(".review-card")).toContainText("Review **comment** body");
  await expect(page.locator(".review-card")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/pullRequest/3/changes/abcdef123456#thread-7",
  );
  await expect(page.locator("body")).not.toContainText("pullRequest.");

  await page.goto("/yona/admin/projectYobi/pullRequest/3/changes/abcdef123456#thread-7");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-menu-outer")).toBeVisible();
  await expect(page.locator("#commits")).toContainText("All commit changes");
  await expect(page.locator(".review-card")).toContainText("Review **comment** body");
  await expect(page.locator(".review-card")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/pullRequest/3/changes/abcdef123456#thread-7",
  );
  await expect(page.locator("body")).not.toContainText("pullRequest.error.newPullRequestForm");
});
