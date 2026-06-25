import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function searchResponse(overrides: Record<string, unknown> = {}) {
  return {
    context: {
      organizationName: "",
      ownerName: "",
      projectName: "",
    },
    counts: {
      issueComments: 1,
      issues: 1,
      milestones: 1,
      postComments: 1,
      posts: 1,
      projects: 1,
      reviews: 1,
      users: 1,
    },
    items: [
      {
        authorLabel: "Owner",
        authorLoginId: "owner",
        createdLabel: "2026-05-01",
        href: "/owner/projectYobi/issue/1",
        id: "1",
        number: "1",
        ownerName: "owner",
        projectName: "projectYobi",
        snippets: [
          {
            highlights: [{ end: 6, start: 0 }],
            text: "Needle issue body",
          },
        ],
        state: "open",
        title: "Needle issue title",
        type: "issue",
        updatedLabel: "2026-05-02",
      },
    ],
    keyword: "Needle",
    pageNum: 1,
    pageSize: 20,
    requestedSearchType: "auto",
    scope: "global",
    searchType: "issue",
    totalCount: 1,
    ...overrides,
  };
}

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
        actorId: "",
        defaultLandingPath: "/",
        emailAddress: "",
        isAnonymous: true,
        isConfirmed: false,
        isSiteAdmin: false,
        loginId: "",
        userLabel: "",
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
});

test("renders the legacy bad-request shell for missing search params", async ({ page }) => {
  let searchApiCalls = 0;
  await page.route(/\/api\/v1\/search(?:\?.*)?$/, async (route) => {
    searchApiCalls += 1;
    await route.fulfill({
      body: JSON.stringify(searchResponse()),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/search");

  await expect(page.locator(".error-wrap")).toContainText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(searchApiCalls).toBe(0);
});

test("renders global results, category counts, highlight snippets, and type switches", async ({
  page,
}) => {
  await page.route(/\/api\/v1\/search(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const searchType = url.searchParams.get("searchType") ?? "auto";
    let body = searchResponse({ totalCount: 41 });
    if (searchType === "user") {
      body = searchResponse({
        items: [
          {
            authorLabel: "Needle User",
            authorLoginId: "needle-user",
            createdLabel: "2026-05-01",
            href: "/users/needle-user",
            id: "3",
            number: "",
            ownerName: "",
            projectName: "",
            snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle User" }],
            state: "active",
            title: "Needle User",
            type: "user",
            updatedLabel: "",
          },
        ],
        requestedSearchType: "user",
        searchType: "user",
      });
    } else if (searchType === "project") {
      body = searchResponse({
        items: [
          {
            authorLabel: "owner",
            authorLoginId: "owner",
            createdLabel: "2026-05-01",
            href: "/owner/projectYobi",
            id: "project-1",
            number: "",
            ownerName: "owner",
            projectName: "projectYobi",
            snippets: [
              {
                highlights: [{ end: 6, start: 0 }],
                text: "Needle project overview",
              },
            ],
            state: "public",
            title: "owner/projectYobi",
            type: "project",
            updatedLabel: "2026-05-02",
          },
        ],
        requestedSearchType: "project",
        searchType: "project",
      });
    } else if (searchType === "issue_comment") {
      body = searchResponse({
        items: [
          {
            authorLabel: "Commenter",
            authorLoginId: "commenter",
            createdLabel: "2026-05-03",
            href: "/owner/projectYobi/issue/1#comment-2",
            id: "issue-comment-2",
            number: "1",
            ownerName: "owner",
            projectName: "projectYobi",
            snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle issue reply" }],
            state: "open",
            title: "Re) Needle issue title",
            type: "issue_comment",
            updatedLabel: "",
          },
        ],
        requestedSearchType: "issue_comment",
        searchType: "issue_comment",
      });
    } else if (searchType === "post_comment") {
      body = searchResponse({
        items: [
          {
            authorLabel: "Commenter",
            authorLoginId: "commenter",
            createdLabel: "2026-05-04",
            href: "/owner/projectYobi/post/3#comment-4",
            id: "post-comment-4",
            number: "3",
            ownerName: "owner",
            projectName: "projectYobi",
            snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle post reply" }],
            state: "",
            title: "Re) Needle post title",
            type: "post_comment",
            updatedLabel: "",
          },
        ],
        requestedSearchType: "post_comment",
        searchType: "post_comment",
      });
    } else if (searchType === "review") {
      body = searchResponse({
        items: [
          {
            authorLabel: "Reviewer",
            authorLoginId: "reviewer",
            createdLabel: "2026-05-05",
            href: "/owner/projectYobi/pullRequest/7#comment-8",
            id: "review-8",
            number: "7",
            ownerName: "owner",
            projectName: "projectYobi",
            snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle review reply" }],
            state: "open",
            title: "Re) Needle pull request",
            type: "review",
            updatedLabel: "",
          },
        ],
        requestedSearchType: "review",
        searchType: "review",
      });
    }
    await route.fulfill({
      body: JSON.stringify(body),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/search?keyword=Needle&searchType=auto&pageNum=1");

  await expect(page.locator(".search-result-title")).toContainText("Found 1 result(s) in Issues");
  await expect(page.locator(".num-badge").first()).toContainText("1");
  await expect(page.locator(".keyword")).toContainText("Needle");
  await expect(page.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/issue/1",
  );
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    "/yona/search?keyword=Needle&searchType=issue&pageNum=2",
  );
  await expect(page.locator("#pagination")).not.toContainText("Page 1 of");

  await page.locator('.search-category-wrap a[data-type="user"]').click();
  await expect(page).toHaveURL(/searchType=user/);
  await expect(page.locator(".search-result-title")).toContainText("Found 1 result(s) in Users");
  await expect(page.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    "/yona/users/needle-user",
  );
  await expect(page.locator(".search-list-item.project .avatar-wrap")).toBeVisible();
  await expect(page.locator(".title.user-link")).toContainText("Needle User (@needle-user)");
  await expect(page.locator(".infos.nm")).toContainText("Member since 2026-05-01");

  await page.locator('.search-category-wrap a[data-type="project"]').click();
  await expect(page).toHaveURL(/searchType=project/);
  await expect(page.locator(".title-wrap .title.project-link")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi",
  );
  await expect(page.locator(".search-list-item.project .avatar-wrap img")).toHaveAttribute(
    "src",
    "/yona/assets/images/project_default_logo.png",
  );
  await expect(page.locator(".search-meta-info.np")).toContainText("Create a project 2026-05-01");
  await expect(page.locator(".search-meta-info.np")).toContainText("Latest code update 2026-05-02");

  await page.locator('.search-category-wrap a[data-type="issue_comment"]').click();
  await expect(page.locator(".title-wrap .post-id")).toContainText("#1");
  await expect(page.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/issue/1#comment-2",
  );
  await expect(page.locator(".title-wrap .title")).toContainText("Re) Needle issue title");

  await page.locator('.search-category-wrap a[data-type="post_comment"]').click();
  await expect(page.locator(".title-wrap .post-id")).toContainText("#3");
  await expect(page.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/post/3#comment-4",
  );
  await expect(page.locator(".title-wrap .title")).toContainText("Re) Needle post title");

  await page.locator('.search-category-wrap a[data-type="review"]').click();
  await expect(page.locator(".title-wrap .post-id")).toContainText("#7");
  await expect(page.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/pullRequest/7#comment-8",
  );
  await expect(page.locator(".title-wrap .title")).toContainText("Re) Needle pull request");
});

test("global search keeps the legacy result shell on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.route(/\/api\/v1\/search(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify(searchResponse({ totalCount: 1 })),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/search?keyword=Needle&searchType=auto&pageNum=1");

  await expect(page.locator("#searchInnerForm")).toBeVisible();
  await expect(page.locator(".search-category-wrap")).toBeVisible();
  await expect(page.locator(".search-result-title")).toContainText("Found 1 result(s) in Issues");
  await expect(page.locator(".search-list-item .title-wrap .title")).toContainText(
    "Needle issue title",
  );
});

test("renders project and organization scoped search parity", async ({ page }) => {
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 2,
        cloneUrl: "",
        codeMemberOnly: false,
        dashboard: { assignees: [], labels: [] },
        defaultReviewerCount: 1,
        enrollmentRequested: false,
        history: { items: [] },
        isFavorited: true,
        isUsingReviewerCount: false,
        isWatching: false,
        logoUrl: "/project-logo.png",
        maxReviewerCount: 3,
        memberCount: 1,
        members: [],
        openIssueCount: 3,
        openPullRequestCount: 4,
        organizationName: "weblabs",
        overview: "Real project overview",
        ownerName: "owner",
        projectName: "projectYobi",
        projectScope: "protected",
        reviewCount: 5,
        showAdmin: true,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        viewerUserId: 1,
        watchCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/organizations/weblabs/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        adminMembers: [],
        description: "Real organization description",
        enrollmentRequested: false,
        logoUrl: "/organization-logo.png",
        memberMembers: [],
        organizationName: "weblabs",
        viewerCanCreateProject: true,
        viewerCanEnroll: false,
        viewerCanLeave: true,
        viewerCanUpdate: true,
        visibleProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/projects\/owner\/projectYobi\/search(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify(
        searchResponse({
          counts: {
            issueComments: 0,
            issues: 0,
            milestones: 0,
            postComments: 0,
            posts: 0,
            projects: 0,
            reviews: 1,
            users: 0,
          },
          items: [
            {
              authorLabel: "Reviewer",
              authorLoginId: "reviewer",
              createdLabel: "2026-05-02",
              href: "/owner/projectYobi/pullRequest/7#comment-1",
              id: "1",
              number: "7",
              ownerName: "owner",
              projectName: "projectYobi",
              snippets: [{ highlights: [{ end: 6, start: 0 }], text: "Needle review" }],
              state: "open",
              title: "Re) Needle review pull request",
              type: "review",
              updatedLabel: "",
            },
          ],
          requestedSearchType: "review",
          scope: "project",
          searchType: "review",
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/organizations\/weblabs\/search(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify(
        searchResponse({
          context: { organizationName: "weblabs", ownerName: "", projectName: "" },
          scope: "organization",
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/owner/projectYobi/search?keyword=Needle&searchType=review&pageNum=1");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".project-breadcrumb")).toContainText("owner");
  await expect(page.locator(".project-breadcrumb")).toContainText("projectYobi");
  await expect(page.locator(".project-menu-count").nth(0)).toContainText("3");
  await expect(page.locator(".project-menu-count").nth(1)).toContainText("4");
  await expect(page.locator(".project-menu-count").nth(2)).toContainText("5");
  await expect(page.locator(".project-menu-count").nth(3)).toContainText("2");
  await expect(page.locator(".search-category-wrap")).not.toContainText("Projects");
  await expect(page.locator(".search-result-title")).toContainText(
    "Found 1 result(s) in Code Reviews",
  );
  await expect(page.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/pullRequest/7#comment-1",
  );

  await page.goto("/yona/organizations/weblabs/search?keyword=Needle&searchType=auto&pageNum=1");
  await expect(page.locator(".project-header-outer")).toBeVisible();
  await expect(page.locator(".group-title-head")).toContainText("group");
  await expect(page.locator(".project-breadcrumb")).toContainText("weblabs");
  await expect(page.locator(".project-setting a")).toHaveAttribute(
    "href",
    "/yona/organizations/weblabs/settingform",
  );
  await expect(page.locator(".project-setting .yobicon-cog")).toHaveCount(1);
  await expect(page.locator(".search-category-wrap")).toContainText("Projects");
  await expect(page.locator(".search-result-title")).toContainText("Found 1 result(s) in Issues");
});

test("shows an invalid query shell without sending a REST search request", async ({ page }) => {
  let searchApiCalls = 0;
  await page.route(/\/api\/v1\/(?:projects\/[^/]+\/[^/]+\/)?search(?:\?.*)?$/, async (route) => {
    searchApiCalls += 1;
    await route.fulfill({
      body: JSON.stringify(searchResponse()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(apiV1Route("/owners/owner/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "",
        codeMemberOnly: false,
        dashboard: { assignees: [], labels: [] },
        defaultReviewerCount: 1,
        enrollmentRequested: false,
        history: { items: [] },
        isFavorited: false,
        isUsingReviewerCount: false,
        isWatching: false,
        logoUrl: "",
        maxReviewerCount: 3,
        memberCount: 1,
        members: [],
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Real project overview",
        ownerName: "owner",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: false,
        showBoard: true,
        showCode: true,
        showIssue: true,
        showMilestone: true,
        showPullRequest: true,
        showReview: true,
        vcs: "GIT",
        viewerCanEnroll: false,
        viewerCanLeave: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        viewerUserId: 1,
        watchCount: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/search?keyword=Needle&searchType=unknown&pageNum=1");

  await expect(page.locator(".error-wrap")).toContainText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".error-wrap .ybtn.ybtn-info")).toContainText("Home");
  await expect(page.locator(".invalid-query")).toHaveCount(0);
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(searchApiCalls).toBe(0);

  await page.goto("/yona/owner/projectYobi/search?keyword=Needle&searchType=project&pageNum=1");

  await expect(page.locator(".error-wrap")).toContainText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".invalid-query")).toHaveCount(0);
  await expect(page.locator("#searchInnerForm")).toHaveCount(0);
  expect(searchApiCalls).toBe(0);
});

test("keeps failed REST search on the legacy bad-request shell", async ({ page }) => {
  await page.route(/\/api\/v1\/search(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({ error: "search backend unavailable" }),
      headers: restJsonHeaders,
      status: 500,
    });
  });

  await page.goto("/yona/search?keyword=Needle&searchType=issue&pageNum=1");

  await expect(page.locator(".error-wrap")).toContainText(
    "The request cannot be fulfilled due to bad syntax",
  );
  await expect(page.locator(".error-wrap .ico-404")).toHaveCount(1);
  await expect(page.locator(".runtime-error-banner")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Search failed.");
});

test("renders hostile search result text as inert text", async ({ page }) => {
  const hostile = `<img src=x onerror="window.__xssFired = true"><script>window.__xssFired = true</script>`;
  await page.route(/\/api\/v1\/search(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify(
        searchResponse({
          items: [
            {
              authorLabel: hostile,
              authorLoginId: "owner",
              createdLabel: "2026-05-01",
              href: "/owner/projectYobi/issue/1",
              id: "xss-1",
              number: "1",
              ownerName: "owner",
              projectName: "projectYobi",
              snippets: [{ highlights: [], text: hostile }],
              state: "open",
              title: hostile,
              type: "issue",
              updatedLabel: "2026-05-02",
            },
          ],
          keyword: hostile,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto(`/yona/search?keyword=${encodeURIComponent(hostile)}&searchType=issue&pageNum=1`);

  await expect(page.locator(".title-wrap .title")).toContainText("<script>");
  await expect(page.locator(".search-result script")).toHaveCount(0);
  await expect(page.locator('.search-result img[src="x"]')).toHaveCount(0);
  await expect
    .poll(() => page.evaluate(() => (window as Window & { __xssFired?: boolean }).__xssFired))
    .toBeUndefined();
});

test("persists the notification welcome guide toggle with the legacy localStorage key", async ({
  page,
}) => {
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/",
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
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Owner",
          englishName: "",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "owner",
          primaryEmailAddress: "owner@example.com",
          sinceLabel: "2026-05-01",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/notifications\?from=0&size=20$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: [],
        total: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/notifications");

  await expect(page.locator(".site-guide-outer")).toBeVisible();
  await expect(page.locator(".site-guide-outer")).not.toHaveClass(/hide/);
  await page.locator("#toggleIntro").click();
  await expect(page.locator(".site-guide-outer")).toHaveClass(/hide/);
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("yobi-intro")))
    .toBe("false");

  await page.reload();
  await expect(page.locator(".site-guide-outer")).toHaveClass(/hide/);
  await page.locator("#toggleIntro").click();
  await expect(page.locator(".site-guide-outer")).not.toHaveClass(/hide/);
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("yobi-intro")))
    .toBe("true");
});

test("notification load more appends REST rows without using legacy HTML fragments", async ({
  page,
}) => {
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/",
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
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Owner",
          englishName: "",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "owner",
          primaryEmailAddress: "owner@example.com",
          sinceLabel: "2026-05-01",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  const notificationItem = (id: number) => ({
    actor: {
      avatarUrl: "",
      displayName: `Sender ${id}`,
      loginId: `sender-${id}`,
    },
    createdAt: `2026-06-26T00:${String(id).padStart(2, "0")}:00Z`,
    createdLabel: `${id} minutes ago`,
    eventType: "ISSUE_BODY_CHANGED",
    id: String(id),
    message: `Notification message ${id}`,
    targetHref: `/yona/owner/projectYobi/issue/${id}`,
    targetTitle: `Issue ${id}`,
    typeIcon: "issue",
  });
  const notificationApiCalls: string[] = [];

  await page.route(/\/api\/v1\/notifications\?(?:from|size)=/, async (route) => {
    const url = new URL(route.request().url());
    notificationApiCalls.push(`${url.searchParams.get("from")}:${url.searchParams.get("size")}`);
    const from = Number(url.searchParams.get("from") ?? "0");
    if (from === 0) {
      await route.fulfill({
        body: JSON.stringify({
          hasMore: true,
          items: Array.from({ length: 20 }, (_, index) => notificationItem(index + 1)),
          total: 21,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: [notificationItem(21)],
        total: 21,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/notifications");

  await expect(page.locator(".notification-stream")).toHaveCount(20);
  await expect(page.locator(".notification-stream").first()).toContainText(
    "Notification message 1",
  );
  await expect(page.locator("#notification-more")).toHaveAttribute("href", "/yona/notifications");
  await page.locator("#notification-more").click();

  await expect(page).toHaveURL(/\/yona\/notifications$/);
  await expect(page.locator(".notification-stream")).toHaveCount(21);
  await expect(page.locator(".notification-stream").last()).toContainText(
    "Notification message 21",
  );
  await expect(page.locator("#notification-more")).toHaveCount(0);
  expect(notificationApiCalls).toEqual(["0:20", "20:20"]);
});

test("notification rows expand like legacy while links and images do not toggle", async ({
  page,
}) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/",
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
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Owner",
          englishName: "",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "owner",
          primaryEmailAddress: "owner@example.com",
          sinceLabel: "2026-05-01",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/notifications\?from=0&size=20$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: [
          {
            actor: {
              avatarUrl: "",
              displayName: "",
              loginId: "",
            },
            createdAt: "2026-06-26T00:01:00Z",
            createdLabel: "1 minute ago",
            eventType: "ISSUE_BODY_CHANGED",
            id: "row-toggle",
            message: Array.from(
              { length: 80 },
              (_, index) => `notification-overflow-segment-${String(index + 1).padStart(2, "0")}`,
            ).join(" "),
            targetHref: "#notification-target",
            targetTitle: "Issue target",
            typeIcon: "issue",
          },
        ],
        total: 1,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/notifications");

  const row = page.locator(".notification-stream").first();
  const message = row.locator(".message-wrap");
  await expect(row).toContainText("Issue target");
  await expect(message).toHaveClass(/nowrap/);
  await expect(message).toHaveAttribute("aria-expanded", "false");
  await expect(row.locator(".more")).toBeVisible();

  await row.locator(".title a").click();
  await expect(page).toHaveURL(/\/yona\/notifications#notification-target$/);
  await expect(message).toHaveClass(/nowrap/);
  await expect(message).toHaveAttribute("aria-expanded", "false");

  await row.locator(".smaller img").click();
  await expect(message).toHaveClass(/nowrap/);
  await expect(message).toHaveAttribute("aria-expanded", "false");

  await row.locator(".stream-desc").click();
  await expect(message).not.toHaveClass(/nowrap/);
  await expect(message).toHaveAttribute("aria-expanded", "true");

  await message.click();
  await expect(message).toHaveClass(/nowrap/);
  await expect(message).toHaveAttribute("aria-expanded", "false");

  await row.locator(".more").click();
  await expect(message).not.toHaveClass(/nowrap/);
  await expect(message).toHaveAttribute("aria-expanded", "true");
});

test("notification page keeps the legacy guide shell on a mobile viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        actorId: "1",
        defaultLandingPath: "/",
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
  await page.route(apiV1Route("/workspace"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/",
        emails: [],
        favoriteProjects: [],
        issueItems: [],
        memberProjects: [],
        profile: {
          avatarUrl: "",
          connectedSocialProviders: [],
          displayName: "Owner",
          englishName: "",
          isBlocked: false,
          isSiteAdmin: false,
          loginId: "owner",
          primaryEmailAddress: "owner@example.com",
          sinceLabel: "2026-05-01",
        },
        pullRequestItems: [],
        recentProjects: [],
        watchedProjects: [],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(/\/api\/v1\/notifications\?from=0&size=20$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        hasMore: false,
        items: [],
        total: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/notifications");

  await expect(page.locator(".site-guide-outer")).toBeVisible();
  await expect(page.locator("#toggleIntro")).toBeVisible();
  await expect(page.locator("#notification-more")).toHaveCount(0);
});
