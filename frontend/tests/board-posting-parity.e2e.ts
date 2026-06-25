import { expect, test } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const apiV1Route = (path: string) => `**/api/v1${path}`;

const boardLabel = {
  categoryId: "1",
  categoryIsExclusive: false,
  categoryName: "Kind",
  color: "#2c7be5",
  id: "5",
  name: "guide",
};

function boardListItem(overrides: Record<string, unknown> = {}) {
  return {
    authorAvatarUrl: "/avatars/nori.png",
    authorLabel: "Nori",
    authorLoginId: "nori",
    commentCount: 1,
    createdLabel: "2026-05-01",
    labels: [boardLabel],
    notice: false,
    ownerName: "admin",
    postNumber: "1",
    projectName: "projectYobi",
    readme: false,
    title: "Board parity announcement",
    updatedLabel: "2026-05-02",
    ...overrides,
  };
}

function boardDetail(overrides: Record<string, unknown> = {}) {
  return {
    ...boardListItem(overrides),
    attachments: [],
    authorId: "11",
    bodyHtml: "",
    bodyMarkdown: "Board body from markdown",
    comments: [
      {
        attachments: [],
        authorId: "12",
        authorLabel: "Mona",
        authorLoginId: "mona",
        contentsHtml: "",
        contentsMarkdown: "First board comment",
        createdLabel: "2026-05-03",
        id: "77",
        parentCommentId: "",
      },
    ],
    id: "100",
    historyHtml: "",
    historyMarkdown: "Changed **title** from old board post",
    isWatching: false,
    permissions: {
      canComment: true,
      canCreate: true,
      canDelete: true,
      canRead: true,
      canSetNotice: true,
      canWatch: true,
      canUpdate: true,
    },
    watcherCount: 2,
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
        actorId: "11",
        defaultLandingPath: "/me",
        emailAddress: "nori@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: false,
        loginId: "nori",
        userLabel: "Nori",
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
        boardCount: 2,
        cloneUrl: "https://example.com/admin/projectYobi.git",
        codeMemberOnly: false,
        defaultTab: "readme",
        enrollmentRequested: false,
        isFavorited: false,
        isForked: false,
        isWatching: false,
        memberCount: 0,
        members: [],
        openIssueCount: 1,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "Project board parity route",
        ownerName: "admin",
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
        viewerCanEnroll: false,
        viewerCanUpdate: false,
        viewerCanWatch: false,
        watchCount: 0,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/form-options(?:\?.*)?$/,
    async (route) => {
      const url = new URL(route.request().url());
      const readme = url.searchParams.has("readme");

      await route.fulfill({
        body: JSON.stringify({
          canAttachFiles: true,
          canMarkNotice: true,
          canMarkReadme: true,
          defaultPermissions: {
            canAttachFiles: true,
            canCreate: true,
            canMarkNotice: true,
            canMarkReadme: true,
          },
          labels: [boardLabel],
          onlineCommit: readme
            ? {
                branch: "",
                edit: false,
                issueTemplate: false,
                path: "",
                preparedBodyMarkdown: "# Existing README\n",
                title: "Update README.md",
              }
            : undefined,
          readme,
        }),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  let boardPost = boardDetail();
  let createdPost = boardDetail({
    bodyHtml: "",
    bodyMarkdown: "Created body",
    commentCount: 0,
    comments: [],
    id: "103",
    postNumber: "3",
    title: "Created Playwright post",
  });
  const noticePost = boardListItem({
    commentCount: 0,
    labels: [],
    notice: true,
    postNumber: "2",
    title: "Pinned maintenance note",
  });
  const readmePost = boardDetail({
    bodyHtml: "",
    bodyMarkdown: "README from board DB",
    commentCount: 0,
    comments: [],
    id: "104",
    postNumber: "10",
    readme: true,
    title: "README",
  });

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/posts(?:\?.*)?$/, async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      const body = request.postDataJSON() as {
        bodyMarkdown?: string;
        labelIds?: string[];
        notice?: boolean;
        readme?: boolean;
        title?: string;
      };
      createdPost = boardDetail({
        bodyHtml: "",
        bodyMarkdown: body.bodyMarkdown || "",
        commentCount: 0,
        comments: [],
        labels: body.labelIds?.length ? [boardLabel] : [],
        notice: body.notice ?? false,
        postNumber: "3",
        readme: body.readme ?? false,
        title: body.title || "Created Playwright post",
      });
      await route.fulfill({
        body: JSON.stringify(createdPost),
        headers: restJsonHeaders,
        status: 200,
      });
      return;
    }

    await route.fulfill({
      body: JSON.stringify({
        notices: [noticePost],
        ownerName: "admin",
        items: [boardPost, boardListItem({ postNumber: "10", readme: true, title: "README" })],
        pageNum: 1,
        pageSize: 15,
        projectName: "projectYobi",
        readme: readmePost,
        totalCount: 31,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/1\/comments$/,
    async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { contentsMarkdown?: string };
        boardPost = boardDetail({
          ...boardPost,
          commentCount: 2,
          comments: [
            ...boardPost.comments,
            {
              attachments: [],
              authorId: "13",
              authorLabel: "Door",
              authorLoginId: "door",
              contentsHtml: "",
              contentsMarkdown: body.contentsMarkdown || "",
              createdLabel: "2026-05-04",
              id: "88",
              parentCommentId: "",
            },
          ],
        });
      }
      await route.fulfill({
        body: JSON.stringify(boardPost),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/1\/comments\/77$/,
    async (route) => {
      const request = route.request();
      if (request.method() === "PATCH") {
        const body = request.postDataJSON() as { contentsMarkdown?: string };
        boardPost = boardDetail({
          ...boardPost,
          comments: boardPost.comments.map((comment) =>
            comment.id === "77"
              ? {
                  ...comment,
                  contentsHtml: "",
                  contentsMarkdown: body.contentsMarkdown || "",
                }
              : comment,
          ),
        });
      }
      if (request.method() === "DELETE") {
        boardPost = boardDetail({
          ...boardPost,
          commentCount: 0,
          comments: [],
        });
      }
      await route.fulfill({
        body: JSON.stringify(boardPost),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(/\/api\/v1\/projects\/admin\/projectYobi\/posts\/1\/watch$/, async (route) => {
    const isWatch = route.request().method() === "POST";
    boardPost = boardDetail({
      ...boardPost,
      isWatching: isWatch,
      watcherCount: isWatch ? 3 : 2,
    });
    await route.fulfill({
      body: JSON.stringify(boardPost),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(
    /\/api\/v1\/projects\/admin\/projectYobi\/posts\/(?!form-options(?:\?|$))[^/?]+(?:\?.*)?$/,
    async (route) => {
      const request = route.request();
      const postNumber = new URL(request.url()).pathname.split("/").at(-1);
      const currentPost = postNumber === "3" ? createdPost : boardPost;

      if (request.method() === "PATCH") {
        const body = request.postDataJSON() as {
          bodyMarkdown?: string;
          labelIds?: string[];
          notice?: boolean;
          readme?: boolean;
          title?: string;
        };
        boardPost = boardDetail({
          ...boardPost,
          bodyHtml: "",
          bodyMarkdown: body.bodyMarkdown || "",
          labels: body.labelIds?.length ? [boardLabel] : [],
          notice: body.notice ?? false,
          readme: body.readme ?? false,
          title: body.title || "Updated board post",
        });
        await route.fulfill({
          body: JSON.stringify(boardPost),
          headers: restJsonHeaders,
          status: 200,
        });
        return;
      }

      if (request.method() === "DELETE") {
        await route.fulfill({
          body: "",
          headers: restJsonHeaders,
          status: 204,
        });
        return;
      }

      await route.fulfill({
        body: JSON.stringify(currentPost),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.route(/\/api\/v1\/organizations\/weblabs\/boards(?:\?.*)?$/, async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        organizationName: "weblabs",
        items: [
          boardListItem({
            authorLabel: "Nori",
            ownerName: "weblabs",
            postNumber: "9",
            projectName: "projectAlpha",
            title: "Organization board update",
          }),
        ],
        pageNum: 1,
        pageSize: 15,
        totalCount: 16,
        visibleProjects: [{ ownerName: "weblabs", projectName: "projectAlpha" }],
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });
});

test("project board list honors filter label sort notice and route parity", async ({ page }) => {
  await page.goto(
    "/yona/admin/projectYobi/posts?filter=guide&labelIds[]=5&orderBy=createdDate&orderDir=asc&pageNum=1",
  );

  await expect(page.locator(".post-list-wrap").last()).toBeVisible();
  await expect(page.locator(".notice-wrap")).toContainText("Pinned maintenance note");
  await expect(page.getByRole("link", { name: "Board parity announcement" })).toBeVisible();
  await expect(
    page.locator('.post-list-wrap .avatar-wrap.mlarge img[alt="Nori"]').first(),
  ).toHaveAttribute("src", "/avatars/nori.png");
  await expect(page.locator(".post-list-wrap .avatar-wrap.mlarge").first()).toHaveAttribute(
    "href",
    "/yona/nori",
  );
  await expect(
    page.locator(".post-list-wrap .board-label", { hasText: "guide" }).first(),
  ).toBeVisible();
  await expect(page.getByPlaceholder("Search current project")).toHaveValue("guide");
  await expect(page.getByLabel("Select label")).toHaveValues(["5"]);
  await expect(page.getByRole("link", { exact: true, name: "Created" })).toBeVisible();
  await expect(page.getByRole("link", { exact: true, name: "Comments" })).toBeVisible();
  await expect(page.locator(".label.label-important", { hasText: "README" })).toBeVisible();
  await expect(page.locator(".board-badge.readme")).toHaveCount(0);
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    /pageNum=2/,
  );
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);

  const sortHref = await page
    .getByRole("link", { exact: true, name: "Created" })
    .getAttribute("href");
  expect(sortHref).toContain("labelIds%5B%5D=5");
  expect(sortHref).toContain("orderBy=createdDate");
  expect(sortHref).toContain("orderDir=desc");

  await page.setViewportSize({ height: 844, width: 390 });
  await expect(page.locator(".post-list-wrap").last()).toBeVisible();
});

test("project board detail supports watch and comment create update delete", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/post/1");
  await expect(page.locator(".board-view")).toBeVisible();
  await expect(page.locator(".board-header .title")).toContainText("Board parity announcement");
  await expect(page.getByText("#1")).toBeVisible();
  await expect(page.locator("#post-body-1")).toContainText("Board body from markdown");
  await expect(
    page.locator(".issue-info.board-labels .label.issue-label.active.static", {
      hasText: "guide",
    }),
  ).toBeVisible();
  await expect(page.locator(".posting-history a")).toHaveAttribute(
    "href",
    "#-yona-posting-history",
  );
  await expect(page.locator("#-yona-posting-history")).toContainText(
    "Changed title from old board post",
  );
  await expect(page.locator("#-yona-posting-history strong")).toHaveText("title");
  await expect(page.locator(".board-comment-wrap")).toContainText("First board comment");

  const watchRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/watch") && request.method() === "POST",
  );
  await page.locator("#watch-button").click();
  expect((await watchRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#watch-button")).toHaveAttribute("data-watching", "true");
  await expect(page.locator("#watch-button")).toContainText("Stop watching");
  await expect(page.getByText("Watchers 3")).toHaveCount(0);

  const updateCommentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments/77") && request.method() === "PATCH",
  );
  await page
    .locator(".board-comment", { hasText: "First board comment" })
    .getByRole("button", { name: "Edit comment" })
    .click();
  await page.getByRole("textbox", { name: "Edit comment" }).fill("Edited board comment");
  await page.locator("#comment-77").getByRole("button", { exact: true, name: "Save" }).click();
  expect((await updateCommentRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#comment-body-77")).toContainText("Edited board comment");

  const commentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments") && request.method() === "POST",
  );
  await page.locator("#editor-contents-comment-body").fill("Fresh comment");
  await page.locator("#comment-form").getByRole("button", { name: "Add a comment" }).click();
  expect((await commentRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#comment-88")).toContainText("Fresh comment");

  const deleteCommentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments/77") && request.method() === "DELETE",
  );
  await page.locator("#comment-77").getByRole("button", { name: "Delete comment" }).click();
  expect((await deleteCommentRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page.locator("#comment-77")).toHaveCount(0);
});

test("project board post editor inserts pasted and dropped image uploads", async ({ page }) => {
  const uploadedHeaders: string[] = [];
  const uploadedNames: string[] = [];

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedNames.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    uploadedNames.push(uploadIndex === 1 ? "post-paste.png" : "post-drop.png");
    await route.fulfill({
      body: JSON.stringify({
        id: 800 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "post-paste.png" : "post-drop.png",
        size: 8,
        url: `/yona/files/${800 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.goto("/yona/admin/projectYobi/postform");
  const bodyEditor = page.locator("#editor-body-content-body");

  await bodyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "post-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(bodyEditor).toHaveValue("![post-paste.png](/yona/files/801) ");

  await bodyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "post-drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(bodyEditor).toHaveValue(
    "![post-paste.png](/yona/files/801) ![post-drop.png](/yona/files/802) ",
  );

  const createRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.locator("#title").fill("Created upload post");
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  const submittedPost = (await createRequest).postDataJSON() as {
    attachmentIds?: number[];
    bodyMarkdown?: string;
  };

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedPost).toMatchObject({
    attachmentIds: [801, 802],
    bodyMarkdown: "![post-paste.png](/yona/files/801) ![post-drop.png](/yona/files/802) ",
  });
});

test("project board comment editor inserts pasted image uploads", async ({ page }) => {
  await page.route("**/files", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        id: 811,
        mimeType: "image/png",
        name: "comment-paste.png",
        size: 8,
        url: "/yona/files/811",
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });

  await page.goto("/yona/admin/projectYobi/post/1");
  const commentEditor = page.locator("#editor-contents-comment-body");

  await commentEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "comment-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(commentEditor).toHaveValue("![comment-paste.png](/yona/files/811) ");

  const commentRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1/comments") && request.method() === "POST",
  );
  await page.locator("#comment-form").getByRole("button", { name: "Add a comment" }).click();
  const submittedComment = (await commentRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
  };

  expect(submittedComment).toEqual({
    attachmentIds: [811],
    contentsMarkdown: "![comment-paste.png](/yona/files/811)",
  });
});

test("project board create edit and delete flows send CSRF REST mutations", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/postform");
  await expect(page.getByRole("heading", { name: "New post" })).toBeVisible();
  await page.locator("#title").fill("Created Playwright post");
  await page.locator("#editor-body-content-body").fill("Created body");
  await page.locator("#notice").check();
  await page.locator("#readme").check();
  await page.getByLabel("guide").check();

  const createRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  const createHeaders = (await createRequest).headers();
  expect(createHeaders["x-csrf-token"]).toBe("csrf-123");
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/post\/3$/);

  await page.goto("/yona/admin/projectYobi/post/1/editform");
  await expect(page.getByRole("heading", { name: "Edit post" })).toBeVisible();
  await expect(page.locator("#title")).toHaveValue("Board parity announcement");
  await page.locator("#title").fill("Updated board post");
  await page.locator("#editor-body-content-body").fill("Updated body");
  await page.locator("#readme").check();

  const updateRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1") && request.method() === "PATCH",
  );
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  expect((await updateRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/post\/1$/);
  await expect(page.locator(".board-header .title")).toContainText("Updated board post");

  const deletePostRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts/1") && request.method() === "DELETE",
  );
  await page.locator(".board-view .board-actions").getByRole("button", { name: "Delete" }).click();
  expect((await deletePostRequest).headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(page).toHaveURL(/\/yona\/admin\/projectYobi\/posts$/);
});

test("README postform query preloads legacy title body and checked marker", async ({ page }) => {
  await page.goto("/yona/admin/projectYobi/postform?readme=true");

  await expect(page.locator("#title")).toHaveValue("Update README.md");
  await expect(page.locator("#editor-body-content-body")).toHaveValue("# Existing README\n");
  await expect(page.locator("#readme")).toBeChecked();
  await expect(page.locator("#path")).toHaveValue("");

  const createRequest = page.waitForRequest(
    (request) => request.url().endsWith("/posts") && request.method() === "POST",
  );
  await page.locator(".board-actions").getByRole("button", { name: "Save" }).click();
  const submitted = (await createRequest).postDataJSON() as {
    bodyMarkdown?: string;
    readme?: boolean;
    title?: string;
  };

  expect(submitted).toMatchObject({
    bodyMarkdown: "# Existing README\n",
    readme: true,
    title: "Update README.md",
  });
});

test("organization board route renders cross-project posts and project filters", async ({
  page,
}) => {
  await page.goto(
    "/yona/organizations/weblabs/boards?filter=post&projectNames[]=projectAlpha&orderBy=numOfComments&orderDir=desc",
  );

  await expect(page.getByRole("heading", { name: "Boards" })).toHaveCount(0);
  await expect(page.getByPlaceholder("title.searchByKeyword")).toHaveValue("post");
  await expect(page.getByLabel("Projects")).toHaveValues(["projectAlpha"]);
  await expect(page.getByRole("link", { name: "Organization board update" })).toBeVisible();
  await expect(page.locator('.post-list-wrap .avatar-wrap.mlarge img[alt="Nori"]')).toHaveAttribute(
    "src",
    "/avatars/nori.png",
  );
  await expect(page.locator(".group-project-name")).toHaveText("projectAlpha");
  await expect(page.getByRole("link", { exact: true, name: "Comments" })).toBeVisible();
  const commentsSortHref = await page
    .getByRole("link", { exact: true, name: "Comments" })
    .getAttribute("href");
  expect(commentsSortHref).toContain("orderBy=numOfComments");
  expect(commentsSortHref).toContain("orderDir=asc");
  await expect(page.locator("#pagination.page-navigation-wrap .page-nums")).toBeVisible();
  await expect(page.locator('#pagination input[name="pageNum"]')).toHaveValue("1");
  await expect(page.locator("#pagination")).toContainText("Next page");
  await expect(page.locator("#pagination a:has(.btn-pg-next)")).toHaveAttribute(
    "href",
    /pageNum=2/,
  );
  await expect(page.locator(".post-row-meta .post-id")).toHaveText("#9");
  await expect(page.getByText("PlaceholderPage")).toHaveCount(0);
});
