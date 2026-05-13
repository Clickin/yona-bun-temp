import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

const projectOption = {
  id: 1,
  ownerName: "admin",
  projectName: "projectYobi",
  selected: true,
};

const branchOptions = [
  { name: "main", selected: true },
  { name: "topic/pr", selected: false },
];

const baseThread = {
  authorId: 2,
  authorLabel: "Reviewer",
  authorLoginId: "reviewer",
  comments: [
    {
      authorId: 2,
      authorLabel: "Reviewer",
      authorLoginId: "reviewer",
      contentsHtml: "<p>Initial review</p>",
      contentsMarkdown: "Initial review",
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

function detail(overrides: Record<string, unknown> = {}) {
  return {
    bodyHtml: "<p>Pull request body</p>",
    bodyMarkdown: "Pull request body",
    commits: [],
    conflict: false,
    contributor: { loginId: "admin", userId: 1, userLabel: "Admin" },
    createdLabel: "2026-05-01",
    events: [{ createdLabel: "2026-05-01", eventType: "NEW_PULL_REQUEST", id: 1 }],
    fromBranch: "topic/pr",
    fromOwnerName: "admin",
    fromProjectName: "projectYobi",
    id: 9,
    isWatching: false,
    ownerName: "admin",
    permissions: {
      canComment: true,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canUpdate: true,
      canUpdateState: true,
    },
    projectName: "projectYobi",
    pullRequestNumber: 9,
    receiver: { loginId: "reviewer", userId: 2, userLabel: "Reviewer" },
    reviewers: [],
    state: "open",
    threads: [baseThread],
    title: "Interaction parity",
    toBranch: "main",
    updatedLabel: "2026-05-02",
    watcherCount: 1,
    ...overrides,
  };
}

function formOptions(mode: "create" | "edit", pullRequest?: ReturnType<typeof detail>) {
  return {
    fromBranches: [
      { name: "topic/pr", selected: true },
      { name: "main", selected: false },
    ],
    fromProjects: [projectOption],
    mode,
    pullRequest,
    selected: {
      fromBranch: "topic/pr",
      fromProjectId: 1,
      toBranch: "main",
      toProjectId: 1,
    },
    toBranches: branchOptions,
    toProjects: [projectOption],
  };
}

test.beforeEach(async ({ page }) => {
  let pullRequest = detail();

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
        actorId: 2,
        defaultLandingPath: "/me",
        isAnonymous: false,
        loginId: "reviewer",
        userLabel: "Reviewer",
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
        codeMemberOnly: false,
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        members: [],
        organizationName: "",
        overview: "PR interaction surface",
        ownerName: "admin",
        projectName: "projectYobi",
        projectScope: "public",
        showCode: true,
        showPullRequest: true,
        showReview: true,
        viewerCanEnroll: false,
        viewerCanUpdate: true,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/pull-requests/form-options"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(formOptions("create")),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    /\/api\/v1\/owners\/admin\/projects\/projectYobi\/pull-requests\/9(?:\/.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      const method = route.request().method();
      if (url.pathname.endsWith("/form-options")) {
        await route.fulfill({
          body: JSON.stringify(formOptions("edit", pullRequest)),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }
      if (url.pathname.endsWith("/review")) {
        pullRequest = detail({
          ...pullRequest,
          reviewers: [{ loginId: "reviewer", userId: 2, userLabel: "Reviewer" }],
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/unreview")) {
        pullRequest = detail({ ...pullRequest, reviewers: [] });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/comments")) {
        pullRequest = detail({
          ...pullRequest,
          threads: [
            {
              ...baseThread,
              comments: [
                ...baseThread.comments,
                {
                  authorId: 2,
                  authorLabel: "Reviewer",
                  authorLoginId: "reviewer",
                  contentsHtml: "<p>New review comment</p>",
                  contentsMarkdown: "New review comment",
                  createdLabel: "2026-05-04",
                  id: 10,
                  threadId: 7,
                },
              ],
            },
          ],
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/threads/7/close")) {
        const thread = { ...baseThread, state: "closed" };
        pullRequest = detail({ ...pullRequest, threads: [thread] });
        await route.fulfill({ body: JSON.stringify(thread), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/threads/7/open")) {
        const thread = { ...baseThread, state: "open" };
        pullRequest = detail({ ...pullRequest, threads: [thread] });
        await route.fulfill({ body: JSON.stringify(thread), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/close")) {
        pullRequest = detail({ ...pullRequest, state: "closed" });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/open")) {
        pullRequest = detail({ ...pullRequest, state: "open" });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (method === "PATCH") {
        pullRequest = detail({
          ...pullRequest,
          bodyHtml: "<p>Updated body</p>",
          bodyMarkdown: "Updated body",
          title: "Updated interaction parity",
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
    },
  );

  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/pull-requests"),
    async (route) => {
      if (route.request().method() === "POST") {
        pullRequest = detail({
          bodyHtml: "<p>Create PR body</p>",
          bodyMarkdown: "Create PR body",
          title: "Created interaction parity",
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      await route.fulfill({
        body: JSON.stringify({
          category: "open",
          items: [],
          pageNum: 1,
          pageSize: 15,
          totalCount: 0,
        }),
        headers: restJsonHeaders,
      });
    },
  );
});

test("covers create/edit forms and PR interaction actions without placeholders", async ({
  page,
}) => {
  await page.goto("/yona/admin/projectYobi/newPullRequestForm");
  await expect(
    page.locator(".page-wrap-outer .project-page-wrap .content-wrap.frm-wrap"),
  ).toBeVisible();
  await expect(page.locator(".pull-request-wrap #fromProjectId")).toBeVisible();
  await expect(page.locator("#fromBranch")).toHaveValue("topic/pr");
  await expect(page.locator("#toProjectId")).toHaveValue("1");
  await expect(page.locator("#toBranch")).toHaveValue("main");
  await expect(page.locator("#__commits .num-badge")).toHaveText("0");
  await expect(page.getByText("File-based route placeholder")).toHaveCount(0);

  await page.locator("#pullRequestState").fill("Created interaction parity");
  await page.locator("#status").fill("Create PR body");
  await page.getByRole("button", { name: "Create" }).click();
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/pullRequest\/9$/);

  await expect(page.locator(".board-header .pullRequest-stateInfo.open")).toBeVisible();
  await expect(page.locator("#reviewers")).toContainText("pullRequest.reviewers.empty");
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.locator("#reviewers")).toContainText("Reviewer");
  await page.getByRole("button", { name: "Unreview" }).click();
  await expect(page.locator("#reviewers")).toContainText("pullRequest.reviewers.empty");

  await page.locator(".review-form textarea").fill("New review comment");
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.locator(".board-comment-wrap")).toContainText("Comments 2");
  await expect(page.locator(".comment-thread-wrap")).toContainText("New review comment");

  await page.getByRole("button", { name: "Close thread" }).click();
  await expect(page.locator(".comment-thread-wrap .state.closed")).toBeVisible();
  await page.getByRole("button", { name: "Open thread" }).click();
  await expect(page.locator(".comment-thread-wrap .state.open")).toBeVisible();

  await page.getByRole("button", { exact: true, name: "Close" }).click();
  await expect(page.locator(".board-header .pullRequest-stateInfo.closed")).toBeVisible();
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.locator(".board-header .pullRequest-stateInfo.open")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/pullRequest/9/editform");
  await expect(page.locator("#fromProjectId")).toBeDisabled();
  await expect(page.locator("#fromBranch")).toBeDisabled();
  await expect(page.locator("#toProjectId")).toBeDisabled();
  await expect(page.locator("#toBranch")).toBeDisabled();
  await page.locator("#pullRequestState").fill("Updated interaction parity");
  await page.locator("#status").fill("Updated body");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/pullRequest\/9$/);
  await expect(page.getByRole("heading", { name: "Updated interaction parity" })).toBeVisible();
});
