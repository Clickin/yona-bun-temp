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
      canDelete: true,
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
  const reviewers =
    (overrides.reviewers as
      | Array<{ loginId: string; userId: number; userLabel: string }>
      | undefined) ?? [];
  const requiredReviewerCount = Number(overrides.requiredReviewerCount ?? 1);
  const lackingReviewerCount = Math.max(requiredReviewerCount - reviewers.length, 0);
  const response = {
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
    mergedCommitIdFrom: "base",
    mergedCommitIdTo: "abcdef123456",
    ownerName: "admin",
    permissions: {
      canComment: true,
      canDeleteSourceBranch: false,
      canRead: true,
      canReadChanges: true,
      canReview: true,
      canRestoreSourceBranch: false,
      canUpdate: true,
      canUpdateState: true,
    },
    projectName: "projectYobi",
    pullRequestNumber: 9,
    receiver: { loginId: "reviewer", userId: 2, userLabel: "Reviewer" },
    reviewers,
    sourceBranchExists: true,
    state: "open",
    threads: [baseThread],
    title: "Interaction parity",
    toBranch: "main",
    updatedLabel: "2026-05-02",
    watcherCount: 1,
    ...overrides,
  };
  return {
    ...response,
    reviewers,
    requiredReviewerCount,
    lackingReviewerCount,
    reviewed: lackingReviewerCount === 0,
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
      if (url.pathname.endsWith("/changes")) {
        const selectedCommitId = url.searchParams.get("commitId");
        await route.fulfill({
          body: JSON.stringify({
            commits: [
              {
                authorDateLabel: "2026-05-03",
                authorEmail: "reviewer@example.com",
                commitId: "abcdef123456",
                commitMessage: "Change src/lib.rs",
                commitShortId: "abcdef1",
                state: "CURRENT",
              },
              {
                authorDateLabel: "2026-05-02",
                authorEmail: "reviewer@example.com",
                commitId: "123456abcdef",
                commitMessage: "Superseded src/lib.rs",
                commitShortId: "123456a",
                state: "PRIOR",
              },
            ],
            files: [
              {
                path: "src/lib.rs",
                patch:
                  selectedCommitId === "123456abcdef"
                    ? "@@ -1,2 +1,2 @@\n-old prior line\n+new prior line\n same line"
                    : "@@ -1,2 +1,2 @@\n-old line\n+new line\n same line",
              },
            ],
            pullRequest,
            threads: pullRequest.threads,
          }),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }
      if (url.pathname.endsWith("/form-options")) {
        await route.fulfill({
          body: JSON.stringify(formOptions("edit", pullRequest)),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }
      if (url.pathname.endsWith("/watch") && method === "POST") {
        pullRequest = detail({
          ...pullRequest,
          isWatching: true,
          watcherCount: pullRequest.isWatching
            ? pullRequest.watcherCount
            : pullRequest.watcherCount + 1,
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/watch") && method === "DELETE") {
        pullRequest = detail({
          ...pullRequest,
          isWatching: false,
          watcherCount: pullRequest.isWatching
            ? Math.max(pullRequest.watcherCount - 1, 0)
            : pullRequest.watcherCount,
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
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
      if (url.pathname.endsWith("/comments/18") && method === "DELETE") {
        pullRequest = detail({
          ...pullRequest,
          threads: pullRequest.threads.filter((thread) => thread.id !== 17),
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/comments/18") && method === "PATCH") {
        const body = (route.request().postDataJSON() ?? {}) as {
          contentsMarkdown?: string;
        };
        pullRequest = detail({
          ...pullRequest,
          threads: pullRequest.threads.map((thread) =>
            thread.id === 17
              ? {
                  ...thread,
                  comments: thread.comments.map((comment) =>
                    comment.id === 18
                      ? {
                          ...comment,
                          contentsHtml: `<p>${body.contentsMarkdown ?? ""}</p>`,
                          contentsMarkdown: body.contentsMarkdown ?? "",
                        }
                      : comment,
                  ),
                }
              : thread,
          ),
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/comments")) {
        const body = (route.request().postDataJSON() ?? {}) as {
          contentsMarkdown?: string;
          commitId?: string;
          endLine?: number;
          endSide?: string;
          path?: string;
          prevCommitId?: string;
          startLine?: number;
          startSide?: string;
        };
        if (body.path) {
          pullRequest = detail({
            ...pullRequest,
            threads: [
              ...pullRequest.threads,
              {
                authorId: 2,
                authorLabel: "Reviewer",
                authorLoginId: "reviewer",
                comments: [
                  {
                    authorId: 2,
                    authorLabel: "Reviewer",
                    authorLoginId: "reviewer",
                    canDelete: true,
                    contentsHtml: `<p>${body.contentsMarkdown ?? ""}</p>`,
                    contentsMarkdown: body.contentsMarkdown ?? "",
                    createdLabel: "2026-05-04",
                    id: 18,
                    threadId: 17,
                  },
                ],
                commitId: body.commitId ?? "",
                createdLabel: "2026-05-04",
                endLine: body.endLine ?? 1,
                endSide: body.endSide ?? "B",
                id: 17,
                path: body.path,
                prevCommitId: body.prevCommitId ?? "",
                startLine: body.startLine ?? 1,
                startSide: body.startSide ?? "B",
                state: "open",
              },
            ],
          });
          await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
          return;
        }
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
                  canDelete: true,
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
      if (url.pathname.endsWith("/accept")) {
        pullRequest = detail({
          ...pullRequest,
          events: [
            ...pullRequest.events,
            {
              createdLabel: "2026-05-05",
              eventType: "PULL_REQUEST_MERGED",
              id: 11,
              newValue: "merged",
              oldValue: "open",
              senderLoginId: "reviewer",
            },
          ],
          mergedCommitIdFrom: "base-main",
          mergedCommitIdTo: "merge-head",
          permissions: {
            ...pullRequest.permissions,
            canDeleteSourceBranch: true,
            canRestoreSourceBranch: false,
          },
          sourceBranchExists: true,
          state: "merged",
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/source-branch") && method === "DELETE") {
        pullRequest = detail({
          ...pullRequest,
          permissions: {
            ...pullRequest.permissions,
            canDeleteSourceBranch: false,
            canRestoreSourceBranch: true,
          },
          sourceBranchExists: false,
        });
        await route.fulfill({ body: JSON.stringify(pullRequest), headers: restJsonHeaders });
        return;
      }
      if (url.pathname.endsWith("/source-branch") && method === "POST") {
        pullRequest = detail({
          ...pullRequest,
          permissions: {
            ...pullRequest.permissions,
            canDeleteSourceBranch: true,
            canRestoreSourceBranch: false,
          },
          sourceBranchExists: true,
        });
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
  await expect(page.locator("#reviewers .reviewer-status.lacking")).toContainText(
    "pullRequest.review.lacking 1",
  );
  await expect(page.locator("#reviewers")).toContainText("pullRequest.reviewers.empty");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "false");
  await page.locator("#watch-button").click();
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "true");
  await expect(page.locator(".board-header .infos")).toContainText("Watchers: 2");
  await page.locator("#watch-button").click();
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "false");
  await expect(page.locator(".board-header .infos")).toContainText("Watchers: 1");
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.locator("#reviewers .reviewer-status.reviewed")).toContainText(
    "pullRequest.review.complete",
  );
  await expect(page.locator("#reviewers")).toContainText("Reviewer");
  await page.getByRole("button", { name: "Unreview" }).click();
  await expect(page.locator("#reviewers .reviewer-status.lacking")).toContainText(
    "pullRequest.review.lacking 1",
  );
  await expect(page.locator("#reviewers")).toContainText("pullRequest.reviewers.empty");
  await page.getByRole("button", { name: "Review" }).click();
  await expect(page.locator("#reviewers .reviewer-status.reviewed")).toContainText(
    "pullRequest.review.complete",
  );

  await page.locator(".review-form textarea").fill("New review comment");
  await page.getByRole("button", { name: "Comment" }).click();
  await expect(page.locator(".board-comment-wrap")).toContainText("Comments 2");
  await expect(page.locator(".comment-thread-wrap")).toContainText("New review comment");

  await page.getByRole("button", { name: "Close thread" }).click();
  await expect(page.locator(".comment-thread-wrap .state.closed")).toBeVisible();
  await page.getByRole("button", { name: "Open thread" }).click();
  await expect(page.locator(".comment-thread-wrap .state.open")).toBeVisible();

  await page.goto("/yona/admin/projectYobi/pullRequest/9/changes");
  await expect(page.locator(".diff-file[data-file-path='src/lib.rs']")).toBeVisible();
  await expect(page.locator("tr.remove .line-comment-trigger")).toBeVisible();
  await page.locator("tr.remove .line-comment-trigger").click();
  await expect(page.locator(".inline-review-form")).toBeVisible();
  const inlineReviewRequest = page.waitForRequest(
    (request) => request.url().endsWith("/pull-requests/9/comments") && request.method() === "POST",
  );
  await page.locator(".inline-review-form textarea").fill("Inline review body");
  await page.locator(".inline-review-form").getByRole("button", { name: "Comment" }).click();
  const submittedInlineReview = (await inlineReviewRequest).postDataJSON() as {
    commitId?: string;
    contentsMarkdown?: string;
    endLine?: number;
    endSide?: string;
    path?: string;
    prevCommitId?: string;
    startLine?: number;
    startSide?: string;
  };
  expect(submittedInlineReview).toMatchObject({
    commitId: "abcdef123456",
    contentsMarkdown: "Inline review body",
    endLine: 1,
    endSide: "A",
    path: "src/lib.rs",
    prevCommitId: "base",
    startLine: 1,
    startSide: "A",
  });
  await expect(page.locator("#comment-18")).toContainText("Inline review body");
  await expect(page.locator("#comment-18 [data-request-method='delete']")).toHaveAttribute(
    "data-request-uri",
    "/yona/api/v1/owners/admin/projects/projectYobi/pull-requests/9/comments/18",
  );
  await expect(page.locator("#comment-18 [data-request-method='patch']")).toHaveAttribute(
    "data-request-uri",
    "/yona/api/v1/owners/admin/projects/projectYobi/pull-requests/9/comments/18",
  );
  const inlineEditRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith("/pull-requests/9/comments/18") && request.method() === "PATCH",
  );
  await page.locator("#comment-18").getByRole("button", { name: "Edit" }).click();
  await page.locator("#comment-18 .review-comment-edit-form textarea").fill("Edited inline body");
  await page
    .locator("#comment-18 .review-comment-edit-form")
    .getByRole("button", {
      name: "Save",
    })
    .click();
  const submittedInlineEdit = (await inlineEditRequest).postDataJSON() as {
    contentsMarkdown?: string;
  };
  expect(submittedInlineEdit).toMatchObject({ contentsMarkdown: "Edited inline body" });
  await expect(page.locator("#comment-18")).toContainText("Edited inline body");
  await page.locator("#comment-18").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("#comment-18")).toHaveCount(0);
  await page.goto("/yona/admin/projectYobi/pullRequest/9");

  await page.getByRole("button", { exact: true, name: "Close" }).click();
  await expect(page.locator(".board-header .pullRequest-stateInfo.closed")).toBeVisible();
  await page.getByRole("button", { name: "Reopen" }).click();
  await expect(page.locator(".board-header .pullRequest-stateInfo.open")).toBeVisible();
  await expect(page.locator("#btnAccept")).toHaveAttribute("data-request-method", "post");
  await expect(page.locator("#btnAccept")).toHaveAttribute(
    "href",
    "/yona/admin/projectYobi/pullRequest/9/accept",
  );
  await page.locator("#btnAccept").click();
  await expect(page.locator(".board-header .pullRequest-stateInfo.merged")).toBeVisible();
  const sourceBranchActions = page.locator(".pull-request-source-branch");
  await expect(sourceBranchActions).toContainText("pullRequest.delete.frombranch.message");
  await expect(sourceBranchActions.locator("[data-request-method='delete']")).toHaveAttribute(
    "data-request-uri",
    "/yona/admin/projectYobi/pullRequest/9/deletefrombranch",
  );
  await sourceBranchActions.getByRole("button", { name: "pullRequest.delete.branch" }).click();
  await expect(sourceBranchActions).toContainText("pullRequest.restore.frombranch.message");
  await expect(
    sourceBranchActions.getByRole("link", { name: "pullRequest.restore.branch" }),
  ).toHaveAttribute("href", "/yona/admin/projectYobi/pullRequest/9/restorefrombranch");
  await sourceBranchActions.getByRole("link", { name: "pullRequest.restore.branch" }).click();
  await expect(sourceBranchActions).toContainText("pullRequest.delete.frombranch.message");
  await expect(page.locator(".review-list-wrap").last()).toContainText("PULL_REQUEST_MERGED");

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

test("creates a multi-line inline review from selected diff text", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/pullRequest/9/changes");
  await expect(page.locator(".diff-file[data-file-path='src/lib.rs']")).toBeVisible();

  await page.evaluate(() => {
    const firstLine = document.querySelector("tr.add .diff-partial-codeline")?.firstChild;
    const lastLine = document.querySelector("tr.context .diff-partial-codeline")?.firstChild;
    const diffTable = document.querySelector(".diff-table");
    if (!firstLine || !lastLine || !diffTable) {
      throw new Error("diff lines not found");
    }

    const range = document.createRange();
    range.setStart(firstLine, 0);
    range.setEnd(lastLine, lastLine.textContent?.length ?? 0);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    diffTable.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
  });

  await expect(page.locator(".inline-review-form")).toBeVisible();
  await expect(page.locator(".inline-review-form input[name='startLine']")).toHaveValue("1");
  await expect(page.locator(".inline-review-form input[name='endLine']")).toHaveValue("2");

  const inlineReviewRequest = page.waitForRequest(
    (request) => request.url().endsWith("/pull-requests/9/comments") && request.method() === "POST",
  );
  await page.locator(".inline-review-form textarea").fill("Multi-line review body");
  await page.locator(".inline-review-form").getByRole("button", { name: "Comment" }).click();
  const submittedInlineReview = (await inlineReviewRequest).postDataJSON() as {
    contentsMarkdown?: string;
    endLine?: number;
    endSide?: string;
    startLine?: number;
    startSide?: string;
  };
  expect(submittedInlineReview).toMatchObject({
    contentsMarkdown: "Multi-line review body",
    endLine: 2,
    endSide: "B",
    startLine: 1,
    startSide: "B",
  });
});

test("renders selected outdated pull request commits with legacy change markers", async ({
  page,
}) => {
  await page.goto("/yona/admin/projectYobi/pullRequest/9/changes/123456abcdef");

  const commitPicker = page.locator("#commits");
  await expect(commitPicker).toBeVisible();
  await expect(commitPicker.locator(".d-label .commit-hash")).toHaveText("123456a");
  await expect(commitPicker.locator(".d-label .outdated-label")).toHaveText("review.outdated");

  await expect(commitPicker.locator("li.outdated")).toHaveCount(0);
  await expect(commitPicker.locator("li", { hasText: "abcdef1" })).toBeVisible();
  await expect(page.locator(".diff-body")).toContainText("new prior line");
});

test("shows legacy conflict guidance and disables merge accept for conflicted pull requests", async ({
  page,
}) => {
  await page.route(
    apiV1Route("/owners/admin/projects/projectYobi/pull-requests/9"),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(
          detail({
            conflict: true,
            state: "conflict",
          }),
        ),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto("/yona/admin/projectYobi/pullRequest/9");
  await expect(page.locator(".board-header .pullRequest-stateInfo.conflict")).toBeVisible();
  await expect(page.locator("#btnAccept")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Merge" })).toBeDisabled();
  await expect(page.locator(".merge-conflict-help")).toContainText(
    "pullRequest.conflict.manualResolve",
  );
});

test("project pull request form editor inserts pasted and dropped image uploads", async ({
  page,
}) => {
  const uploadedHeaders: string[] = [];

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedHeaders.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    await route.fulfill({
      body: JSON.stringify({
        id: 820 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "pr-paste.png" : "pr-drop.png",
        size: 8,
        url: `/yona/files/${820 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.goto("/yona/admin/projectYobi/newPullRequestForm");
  const bodyEditor = page.locator("#status");

  await bodyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "pr-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(bodyEditor).toHaveValue("![pr-paste.png](/yona/files/821) ");

  await bodyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "pr-drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(bodyEditor).toHaveValue(
    "![pr-paste.png](/yona/files/821) ![pr-drop.png](/yona/files/822) ",
  );

  const createRequest = page.waitForRequest(
    (request) => request.url().endsWith("/pull-requests") && request.method() === "POST",
  );
  await page.locator("#pullRequestState").fill("Created upload PR");
  await page.getByRole("button", { name: "Create" }).click();
  const submittedPullRequest = (await createRequest).postDataJSON() as {
    attachmentIds?: number[];
    bodyMarkdown?: string;
  };

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedPullRequest).toMatchObject({
    attachmentIds: [821, 822],
    bodyMarkdown: "![pr-paste.png](/yona/files/821) ![pr-drop.png](/yona/files/822) ",
  });
});

test("project pull request comment editor inserts pasted image uploads", async ({ page }) => {
  await page.route("**/files", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        id: 831,
        mimeType: "image/png",
        name: "pr-comment.png",
        size: 8,
        url: "/yona/files/831",
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.goto("/yona/admin/projectYobi/pullRequest/9");
  const commentEditor = page.locator(".review-form textarea");

  await commentEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "pr-comment.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(commentEditor).toHaveValue("![pr-comment.png](/yona/files/831) ");

  const commentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/pull-requests/9/comments") && request.method() === "POST",
  );
  await page.getByRole("button", { name: "Comment" }).click();
  const submittedComment = (await commentRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
  };

  expect(submittedComment).toEqual({
    attachmentIds: [831],
    contentsMarkdown: "![pr-comment.png](/yona/files/831)",
  });
});
