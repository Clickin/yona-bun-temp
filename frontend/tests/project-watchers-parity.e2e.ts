import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.__YONA_RUNTIME_CONFIG__ = {
      apiBaseUrl: "/yona/api",
      basePath: "/yona",
    };
  });

  await page.route("**/api/auth/session", async (route) => {
    await route.fulfill({
      body: JSON.stringify({ session: null, user: null }),
      headers: { ...restJsonHeaders, "x-csrf-token": "csrf-123" },
      status: 200,
    });
  });

  await page.route(apiV1Route("/session"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        defaultLandingPath: "/me",
        isAnonymous: true,
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

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        boardCount: 0,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 2,
        members: [],
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Watcher parity",
        overviewEditable: false,
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        reviewCount: 0,
        showAdmin: false,
        showBoard: false,
        showCode: false,
        showIssue: false,
        showMilestone: false,
        showPullRequest: false,
        showReview: false,
        viewerCanEnroll: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 2,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/watchers"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        watchers: [
          {
            avatarUrl: "/avatars/alice.png",
            loginId: "alice",
            userId: 2,
            userLabel: "Alice",
          },
          {
            avatarUrl: "/avatars/bob.png",
            loginId: "bob",
            userId: 3,
            userLabel: "Bob",
          },
        ],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("renders the legacy project watchers route and member list anchors", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/watchers");

  await expect(page.locator(".page-wrap-outer .project-page-wrap")).toBeVisible();
  await expect(page.getByText("This project's watcher list.")).toBeVisible();
  await expect(
    page.getByText("* This list contains only those who can access this project."),
  ).toBeVisible();
  await expect(page.locator(".members.project.row-fluid .member.span6.span-hard-wrap")).toHaveCount(
    2,
  );
  await expect(page.locator(".member-name")).toHaveText(["Alice", "Bob"]);
  await expect(page.locator(".member-id")).toHaveText(["@alice", "@bob"]);
  await expect(page.locator(".avatar-wrap img").first()).toHaveAttribute("width", "64");
  await expect(page.locator(".avatar-wrap img").first()).toHaveAttribute("height", "64");
});
