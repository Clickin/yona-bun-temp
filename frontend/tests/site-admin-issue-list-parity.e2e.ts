import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function siteIssuesPayload(input: {
  issues: Array<{
    authorLabel?: string;
    authorLoginId: string;
    commentCount?: number;
    createdLabel?: string;
    issueNumber: string;
    ownerName: string;
    projectName: string;
    state: "closed" | "open";
    title: string;
  }>;
  page?: number;
  state?: "closed" | "open";
  totalPages?: number;
}) {
  return {
    issues: input.issues.map((issue) => ({
      assigneeLabel: "",
      authorLabel: issue.authorLabel ?? issue.authorLoginId,
      authorLoginId: issue.authorLoginId,
      commentCount: issue.commentCount ?? 0,
      createdLabel: issue.createdLabel ?? "2026-05-17 11:00:00",
      issueNumber: issue.issueNumber,
      labels: [],
      milestoneTitle: "",
      ownerName: issue.ownerName,
      projectName: issue.projectName,
      state: issue.state,
      title: issue.title,
      updatedLabel: issue.createdLabel ?? "2026-05-17 11:00:00",
      voterCount: 0,
      watcherCount: 0,
    })),
    page: input.page ?? 1,
    pageSize: 30,
    state: input.state ?? "open",
    total: input.issues.length,
    totalPages: input.totalPages ?? (input.issues.length === 0 ? 0 : 1),
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
        session: { loginId: "siteboss" },
        user: { isSiteAdmin: true, loginId: "siteboss" },
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
        emailAddress: "siteboss@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "siteboss",
        userLabel: "Site Boss",
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

test("site admin issue list preserves legacy state tabs and read-only anchors", async ({
  page,
}) => {
  const requests: string[] = [];

  await page.route(apiV1Route("/site/issues**"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);
    const state = url.searchParams.get("state") === "closed" ? "closed" : "open";

    await route.fulfill({
      body: JSON.stringify(
        siteIssuesPayload({
          issues: [
            {
              authorLabel: "Member Name",
              authorLoginId: "member",
              commentCount: 4,
              createdLabel: "2026-05-17 11:00:00",
              issueNumber: "7",
              ownerName: "member",
              projectName: "issueproj",
              state,
              title: state === "closed" ? "Closed site issue" : "Open site issue",
            },
          ],
          state,
          totalPages: 2,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/issueList?state=open&pageNum=1");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("site.sidebar.issueList");
  await expect(page.locator(".nav.nav-tabs li.active a")).toHaveText("issue.state.open");
  await expect(
    page.locator(".nav.nav-tabs a[href='/yona/sites/issueList?state=closed']"),
  ).toHaveText("issue.state.closed");
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(1);

  const row = page.locator(".post-list-wrap .listitem").first();
  await expect(row.locator(".avatar-wrap.list-avatar")).toHaveAttribute(
    "href",
    "/yona/member/issueproj",
  );
  await expect(row.locator(".post-project")).toHaveText("member/issueproj");
  await expect(row.locator(".post-project")).toHaveAttribute("href", "/yona/member/issueproj");
  await expect(row.locator(".post-info-separator")).toHaveText("\u00b7");
  await expect(row.locator(".post-title")).toHaveText("Open site issue");
  await expect(row.locator(".post-title")).toHaveAttribute(
    "href",
    "/yona/member/issueproj/issue/7",
  );
  await expect(row.locator(".post-meta-item").first()).toHaveText("Member Name");
  await expect(row.locator(".post-meta-item").first()).toHaveAttribute("href", "/yona/member");
  await expect(row.locator(".post-comments a")).toHaveAttribute(
    "href",
    "/yona/member/issueproj/issue/7#comments",
  );
  await expect(row.locator(".post-comments")).toContainText("4");
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("button.nextPage");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    "/yona/sites/issueList?state=open&pageNum=2",
  );
  await expect
    .poll(() =>
      requests.some((request) => request === "GET /yona/api/v1/site/issues?state=open&page=1"),
    )
    .toBe(true);
});
