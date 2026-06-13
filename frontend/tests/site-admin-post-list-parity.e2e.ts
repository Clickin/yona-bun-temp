import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

function sitePostsPayload(input: {
  page?: number;
  posts: Array<{
    authorLabel?: string;
    authorLoginId: string;
    commentCount?: number;
    createdLabel?: string;
    ownerName: string;
    postNumber: string;
    projectName: string;
    title: string;
  }>;
  totalPages?: number;
}) {
  return {
    page: input.page ?? 1,
    pageSize: 30,
    posts: input.posts.map((post) => ({
      authorLabel: post.authorLabel ?? post.authorLoginId,
      authorLoginId: post.authorLoginId,
      commentCount: post.commentCount ?? 0,
      createdLabel: post.createdLabel ?? "2026-05-17 11:00:00",
      labels: [],
      notice: false,
      ownerName: post.ownerName,
      postNumber: post.postNumber,
      projectName: post.projectName,
      readme: false,
      title: post.title,
      updatedLabel: post.createdLabel ?? "2026-05-17 11:00:00",
    })),
    total: input.posts.length,
    totalPages: input.totalPages ?? (input.posts.length === 0 ? 0 : 1),
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

test("site admin post list preserves legacy read-only post anchors", async ({ page }) => {
  const requests: string[] = [];

  await page.route(apiV1Route("/site/posts**"), async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    requests.push(`${request.method()} ${url.pathname}${url.search}`);

    await route.fulfill({
      body: JSON.stringify(
        sitePostsPayload({
          page: 1,
          posts: [
            {
              authorLabel: "Member Name",
              authorLoginId: "member",
              commentCount: 3,
              createdLabel: "2026-05-17 11:00:00",
              ownerName: "member",
              postNumber: "1",
              projectName: "boardproj",
              title: "Legacy site post",
            },
          ],
          totalPages: 2,
        }),
      ),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/sites/postList?pageNum=1");

  await expect(page).toHaveTitle("Site Admin");
  await expect(page.locator(".site-breadcrumb-outer")).toBeVisible();
  await expect(page.locator(".site-setting-wrap")).toBeVisible();
  await expect(page.locator(".site-setting-nav li.active a")).toHaveText("site.sidebar.postList");
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);
  await expect(page.locator(".post-list-wrap .listitem")).toHaveCount(1);

  const row = page.locator(".post-list-wrap .listitem").first();
  await expect(row.locator(".avatar-wrap.list-avatar")).toHaveAttribute(
    "href",
    "/yona/member/boardproj",
  );
  await expect(row.locator(".post-project")).toHaveText("member/boardproj");
  await expect(row.locator(".post-project")).toHaveAttribute("href", "/yona/member/boardproj");
  await expect(row.locator(".post-info-separator")).toHaveText("\u00b7");
  await expect(row.locator(".post-title")).toHaveText("Legacy site post");
  await expect(row.locator(".post-title")).toHaveAttribute("href", "/yona/member/boardproj/post/1");
  await expect(row.locator(".post-meta-item").first()).toHaveText("Member Name");
  await expect(row.locator(".post-meta-item").first()).toHaveAttribute("href", "/yona/member");
  await expect(row.locator(".post-comments a")).toHaveAttribute(
    "href",
    "/yona/member/boardproj/post/1#comments",
  );
  await expect(row.locator(".post-comments")).toContainText("3");
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("button.nextPage");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    "/yona/sites/postList?pageNum=2",
  );
  await expect
    .poll(() => requests.some((request) => request === "GET /yona/api/v1/site/posts?page=1"))
    .toBe(true);
});
