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

test("renders the global empty shell without calling the search API", async ({ page }) => {
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

  await expect(page.locator("#searchInnerForm")).toBeVisible();
  await expect(page.locator("#searchKeyword")).toBeVisible();
  await expect(page.locator(".search-category-wrap")).toContainText("Issues");
  await expect(page.locator("main")).not.toContainText("File-based route placeholder");
  expect(searchApiCalls).toBe(0);
});

test("renders global results, category counts, highlight snippets, and type switches", async ({
  page,
}) => {
  await page.route(/\/api\/v1\/search(?:\?.*)?$/, async (route) => {
    const url = new URL(route.request().url());
    const searchType = url.searchParams.get("searchType") ?? "auto";
    await route.fulfill({
      body: JSON.stringify(
        searchType === "user"
          ? searchResponse({
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
            })
          : searchResponse({ totalCount: 41 }),
      ),
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
});

test("renders project and organization scoped search parity", async ({ page }) => {
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
  await expect(page.locator(".search-category-wrap")).not.toContainText("Projects");
  await expect(page.locator(".search-result-title")).toContainText(
    "Found 1 result(s) in Code Reviews",
  );
  await expect(page.locator(".title-wrap .title")).toHaveAttribute(
    "href",
    "/yona/owner/projectYobi/pullRequest/7#comment-1",
  );

  await page.goto("/yona/organizations/weblabs/search?keyword=Needle&searchType=auto&pageNum=1");
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
