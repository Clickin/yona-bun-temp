import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const commitId = "abcdef1234567890abcdef1234567890abcdef12";
const apiV1Route = (path: string) => `**/api/v1${path}`;

function commitDetailPayload(threads: unknown[] = [], isWatching = false) {
  return {
    branches: [{ name: "main" }],
    breadcrumbs: [],
    commit: {
      authorDate: "2026-04-21",
      authorEmail: "author@example.com",
      authorName: "Author",
      commentCount: threads.length,
      commitId,
      commitShortId: "abcdef1",
      message: "Update main function",
      shortMessage: "Update main function",
    },
    files: [
      {
        patch:
          'diff --git a/src/main.rs b/src/main.rs\n--- a/src/main.rs\n+++ b/src/main.rs\n@@ -1 +1,3 @@\n fn main() {\n+    println!("detail");\n }\n',
        path: "src/main.rs",
      },
    ],
    isWatching,
    noHead: false,
    ownerName: "admin",
    parentCommit: null,
    path: "",
    permissions: {
      canComment: true,
      canUpdateThreadState: true,
    },
    projectName: "projectYobi",
    selectedBranch: "main",
    threads,
  };
}

async function routeRuntimeShell(page: Page) {
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
        defaultLandingPath: "/me",
        isAnonymous: false,
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/auth/capabilities"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        allowGuest: false,
        allowPasswordLogin: true,
        allowRegistration: true,
        allowSocialLogin: false,
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
        memberCount: 0,
        members: [],
        openIssueCount: 0,
        openPullRequestCount: 0,
        organizationName: "",
        overview: "",
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
}

test.beforeEach(async ({ page }) => {
  await routeRuntimeShell(page);
});

test("code browser renders the legacy Git and SVN no-head guidance without raw keys", async ({
  page,
}) => {
  let projectContainer: Record<string, unknown> = {
    cloneUrl: "https://example.com/admin/projectYobi.git",
    codeMemberOnly: false,
    defaultTab: "readme",
    enrollmentRequested: false,
    isFavorited: false,
    isForked: false,
    isWatching: false,
    memberCount: 0,
    members: [],
    openIssueCount: 0,
    openPullRequestCount: 0,
    organizationName: "",
    overview: "",
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
    viewerCanUpdate: true,
    viewerCanWatch: false,
    watchCount: 0,
  };

  await page.route(apiV1Route("/owners/admin/projects/projectYobi/container"), async (route) => {
    await route.fulfill({
      body: JSON.stringify(projectContainer),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.route(apiV1Route("/projects/admin/projectYobi/code"), async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        breadcrumbs: [],
        branches: [],
        entries: [],
        noHead: true,
        ownerName: "admin",
        path: "",
        projectName: "projectYobi",
        selectedBranch: "",
      }),
      headers: restJsonHeaders,
      status: 200,
    });
  });

  await page.goto("/yona/admin/projectYobi/code");

  await expect(page.locator(".project-page-wrap")).toBeVisible();
  await expect(page.locator(".code-browse-wrap")).toContainText("The repository is empty!");
  await expect(page.locator(".code-browse-wrap")).toContainText(
    "Create a new local repository by cloning",
  );
  await expect(page.locator(".code-browse-wrap")).toContainText(
    "git clone https://example.com/admin/projectYobi.git projectYobi",
  );
  await expect(page.locator(".code-browse-wrap")).toContainText('git commit -m "Hello Yona"');
  await expect(page.locator(".code-browse-wrap")).toContainText(
    "If you have already created a local git repository",
  );
  await expect(page.locator(".code-browse-wrap")).not.toContainText("code.nohead");

  projectContainer = {
    ...projectContainer,
    cloneUrl: "http://example.test/svn/admin/projectYobi",
    vcs: "Subversion",
  };
  await page.goto("/yona/admin/projectYobi/code?variant=svn");

  await expect(page.locator(".project-page-wrap")).toBeVisible();
  await expect(page.locator(".code-browse-wrap")).toContainText("The repository is empty!");
  await expect(page.locator(".code-browse-wrap")).toContainText(
    "You can commit your code to this repository.",
  );
  await expect(page.locator(".code-browse-wrap")).toContainText(
    "svn co http://example.test/svn/admin/projectYobi",
  );
  await expect(page.locator(".code-browse-wrap")).toContainText('svn commit -m "first commit"');
  await expect(page.locator(".code-browse-wrap")).not.toContainText("code.nohead");
});

test("commit detail watch button toggles through REST with CSRF and preserves query", async ({
  page,
}) => {
  let isWatching = false;
  const watchRequests: Array<{ csrfToken: string; method: string; url: string }> = [];

  await page.route(
    new RegExp(`/api/v1/projects/admin/projectYobi/commit/${commitId}(?:\\?.*)?$`),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload([], isWatching)),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );
  await page.route(
    new RegExp(`/api/v1/projects/admin/projectYobi/commit/${commitId}/watch(?:\\?.*)?$`),
    async (route) => {
      watchRequests.push({
        csrfToken: route.request().headers()["x-csrf-token"] ?? "",
        method: route.request().method(),
        url: route.request().url(),
      });
      isWatching = route.request().method() === "POST";
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload([], isWatching)),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto(`/yona/admin/projectYobi/commit/${commitId}?branch=main&path=src/main.rs`);

  const watchButton = page.locator("#watch-button");
  await expect(watchButton).toBeVisible();
  await expect(watchButton).not.toHaveClass(/(?:^|\s)active(?:\s|$)/);
  await expect(watchButton).not.toHaveClass(/(?:^|\s)ybtn-watching(?:\s|$)/);

  const watchRequest = page.waitForRequest(
    (request) => request.url().includes(`/commit/${commitId}/watch`) && request.method() === "POST",
  );
  await watchButton.click();
  const postRequest = await watchRequest;

  expect(new URL(postRequest.url()).pathname).toBe(
    `/yona/api/v1/projects/admin/projectYobi/commit/${commitId}/watch`,
  );
  expect(new URL(postRequest.url()).searchParams.get("branch")).toBe("main");
  expect(new URL(postRequest.url()).searchParams.get("path")).toBe("src/main.rs");
  expect(postRequest.headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(watchButton).toHaveClass(/(?:^|\s)active(?:\s|$)/);
  await expect(watchButton).toHaveClass(/(?:^|\s)ybtn-watching(?:\s|$)/);
  expect(new URL(page.url()).pathname).toBe(`/yona/admin/projectYobi/commit/${commitId}`);
  expect(new URL(page.url()).searchParams.get("branch")).toBe("main");
  expect(new URL(page.url()).searchParams.get("path")).toBe("src/main.rs");

  const unwatchRequest = page.waitForRequest(
    (request) =>
      request.url().includes(`/commit/${commitId}/watch`) && request.method() === "DELETE",
  );
  await watchButton.click();
  const deleteRequest = await unwatchRequest;

  expect(new URL(deleteRequest.url()).pathname).toBe(
    `/yona/api/v1/projects/admin/projectYobi/commit/${commitId}/watch`,
  );
  expect(new URL(deleteRequest.url()).searchParams.get("branch")).toBe("main");
  expect(new URL(deleteRequest.url()).searchParams.get("path")).toBe("src/main.rs");
  expect(deleteRequest.headers()["x-csrf-token"]).toBe("csrf-123");
  await expect(watchButton).not.toHaveClass(/(?:^|\s)active(?:\s|$)/);
  await expect(watchButton).not.toHaveClass(/(?:^|\s)ybtn-watching(?:\s|$)/);
  expect(new URL(page.url()).pathname).toBe(`/yona/admin/projectYobi/commit/${commitId}`);
  expect(new URL(page.url()).searchParams.get("branch")).toBe("main");
  expect(new URL(page.url()).searchParams.get("path")).toBe("src/main.rs");
  expect(watchRequests).toEqual([
    {
      csrfToken: "csrf-123",
      method: "POST",
      url: postRequest.url(),
    },
    {
      csrfToken: "csrf-123",
      method: "DELETE",
      url: deleteRequest.url(),
    },
  ]);
});

test("commit comment editor inserts pasted and dropped image uploads", async ({ page }) => {
  const uploadedHeaders: string[] = [];

  await page.route("**/files", async (route) => {
    const uploadIndex = uploadedHeaders.length + 1;
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    await route.fulfill({
      body: JSON.stringify({
        id: 860 + uploadIndex,
        mimeType: "image/png",
        name: uploadIndex === 1 ? "code-paste.png" : "code-drop.png",
        size: 8,
        url: `/yona/files/${860 + uploadIndex}`,
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });
  await page.route(apiV1Route(`/projects/admin/projectYobi/commit/${commitId}`), async (route) => {
    await route.fulfill({
      body: JSON.stringify(commitDetailPayload()),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(
    apiV1Route(`/projects/admin/projectYobi/commit/${commitId}/comments`),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload()),
        headers: restJsonHeaders,
        status: 201,
      });
    },
  );

  await page.goto(`/yona/admin/projectYobi/commit/${commitId}`);
  const commentEditor = page.locator(".board-comment-form textarea");

  await commentEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "code-paste.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(commentEditor).toHaveValue("![code-paste.png](/yona/files/861) ");

  await commentEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["dropped"], "code-drop.png", { type: "image/png" }));
    element.dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      }),
    );
  });
  await expect(commentEditor).toHaveValue(
    "![code-paste.png](/yona/files/861) ![code-drop.png](/yona/files/862) ",
  );

  const commentRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/commit/${commitId}/comments`) && request.method() === "POST",
  );
  await page.locator(".board-comment-form").getByRole("button", { name: "Comment" }).click();
  const submittedComment = (await commentRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
  };

  expect(uploadedHeaders).toEqual(["csrf-123", "csrf-123"]);
  expect(submittedComment).toMatchObject({
    attachmentIds: [861, 862],
    contentsMarkdown: "![code-paste.png](/yona/files/861) ![code-drop.png](/yona/files/862)",
  });
});

test("commit thread reply editor submits pasted image uploads", async ({ page }) => {
  const thread = {
    authorId: 1,
    authorLabel: "Admin",
    authorLoginId: "admin",
    comments: [
      {
        authorId: 1,
        authorLabel: "Admin",
        authorLoginId: "admin",
        canDelete: true,
        contentsHtml: "",
        contentsMarkdown: "Existing comment",
        createdLabel: "2026-04-21",
        id: 21,
        threadId: 11,
      },
    ],
    commitId,
    createdLabel: "2026-04-21",
    id: 11,
    path: "",
    prevCommitId: "",
    state: "open",
  };

  await page.route("**/files", async (route) => {
    await route.fulfill({
      body: JSON.stringify({
        id: 863,
        mimeType: "image/png",
        name: "code-reply.png",
        size: 8,
        url: "/yona/files/863",
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });
  await page.route(apiV1Route(`/projects/admin/projectYobi/commit/${commitId}`), async (route) => {
    await route.fulfill({
      body: JSON.stringify(commitDetailPayload([thread])),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(
    apiV1Route(`/projects/admin/projectYobi/commit/${commitId}/comments`),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload([thread])),
        headers: restJsonHeaders,
        status: 201,
      });
    },
  );

  await page.goto(`/yona/admin/projectYobi/commit/${commitId}`);
  const replyEditor = page.locator("#thread-11 .thread-comment-form textarea");

  await replyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "code-reply.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(replyEditor).toHaveValue("![code-reply.png](/yona/files/863) ");

  const replyRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/commit/${commitId}/comments`) && request.method() === "POST",
  );
  await page
    .locator("#thread-11 .thread-comment-form")
    .getByRole("button", { name: "Comment" })
    .click();
  const submittedReply = (await replyRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
    threadId?: number;
  };

  expect(submittedReply).toMatchObject({
    attachmentIds: [863],
    contentsMarkdown: "![code-reply.png](/yona/files/863)",
    threadId: 11,
  });
});

test("inline ranged commit thread reply editor submits pasted image uploads", async ({ page }) => {
  const rangedThread = {
    authorId: 1,
    authorLabel: "Admin",
    authorLoginId: "admin",
    comments: [
      {
        authorId: 1,
        authorLabel: "Admin",
        authorLoginId: "admin",
        canDelete: true,
        contentsHtml: "",
        contentsMarkdown: "Inline line note",
        createdLabel: "2026-04-21",
        id: 32,
        threadId: 31,
      },
    ],
    commitId,
    createdLabel: "2026-04-21",
    endLine: 2,
    id: 31,
    path: "src/main.rs",
    prevCommitId: "",
    startLine: 2,
    state: "open",
  };
  const uploadedHeaders: string[] = [];

  await page.route("**/files", async (route) => {
    uploadedHeaders.push(route.request().headers()["x-csrf-token"] ?? "");
    await route.fulfill({
      body: JSON.stringify({
        id: 864,
        mimeType: "image/png",
        name: "inline-reply.png",
        size: 8,
        url: "/yona/files/864",
      }),
      headers: restJsonHeaders,
      status: 201,
    });
  });
  await page.route(apiV1Route(`/projects/admin/projectYobi/commit/${commitId}`), async (route) => {
    await route.fulfill({
      body: JSON.stringify(commitDetailPayload([rangedThread])),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(
    apiV1Route(`/projects/admin/projectYobi/commit/${commitId}/comments`),
    async (route) => {
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload([rangedThread])),
        headers: restJsonHeaders,
        status: 201,
      });
    },
  );

  await page.goto(`/yona/admin/projectYobi/commit/${commitId}`);
  const inlineThread = page.locator("#thread-31");
  await expect(inlineThread).toHaveAttribute("data-range-path", "src/main.rs");
  await expect(inlineThread).toHaveAttribute("data-range-startline", "2");
  const replyEditor = inlineThread.locator(".thread-comment-form textarea");

  await replyEditor.evaluate((element) => {
    const data = new DataTransfer();
    data.items.add(new File(["pasted"], "inline-reply.png", { type: "image/png" }));
    element.dispatchEvent(
      new ClipboardEvent("paste", {
        bubbles: true,
        cancelable: true,
        clipboardData: data,
      }),
    );
  });
  await expect(replyEditor).toHaveValue("![inline-reply.png](/yona/files/864) ");

  const replyRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/commit/${commitId}/comments`) && request.method() === "POST",
  );
  await inlineThread
    .locator(".thread-comment-form")
    .getByRole("button", { name: "Comment" })
    .click();
  const submittedReply = (await replyRequest).postDataJSON() as {
    attachmentIds?: number[];
    contentsMarkdown?: string;
    threadId?: number;
  };

  expect(uploadedHeaders).toEqual(["csrf-123"]);
  expect(submittedReply).toMatchObject({
    attachmentIds: [864],
    contentsMarkdown: "![inline-reply.png](/yona/files/864)",
    threadId: 31,
  });
});

test("commit diff line comment creates a ranged review thread", async ({ page }) => {
  const rangedThread = {
    authorId: 1,
    authorLabel: "Admin",
    authorLoginId: "admin",
    comments: [
      {
        authorId: 1,
        authorLabel: "Admin",
        authorLoginId: "admin",
        canDelete: true,
        contentsHtml: "",
        contentsMarkdown: "Inline line note",
        createdLabel: "2026-04-21",
        id: 32,
        threadId: 31,
      },
    ],
    commitId,
    createdLabel: "2026-04-21",
    endLine: 2,
    id: 31,
    path: "src/main.rs",
    prevCommitId: "",
    startLine: 2,
    state: "open",
  };
  let threads: unknown[] = [];

  await page.route(apiV1Route(`/projects/admin/projectYobi/commit/${commitId}`), async (route) => {
    await route.fulfill({
      body: JSON.stringify(commitDetailPayload(threads)),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(
    apiV1Route(`/projects/admin/projectYobi/commit/${commitId}/comments`),
    async (route) => {
      threads = [rangedThread];
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload(threads)),
        headers: restJsonHeaders,
        status: 201,
      });
    },
  );

  await page.goto(`/yona/admin/projectYobi/commit/${commitId}`);
  await page.getByRole("button", { name: "Comment on src/main.rs:2" }).click();
  const inlineForm = page.locator(".code-review-form");
  await expect(inlineForm).toBeVisible();
  await inlineForm.locator("textarea").fill("Inline line note");

  const lineCommentRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/commit/${commitId}/comments`) && request.method() === "POST",
  );
  await inlineForm.getByRole("button", { name: "Comment" }).click();
  const submittedLineComment = (await lineCommentRequest).postDataJSON() as {
    contentsMarkdown?: string;
    endLine?: number;
    path?: string;
    startLine?: number;
  };

  expect(submittedLineComment).toMatchObject({
    contentsMarkdown: "Inline line note",
    endLine: 2,
    path: "src/main.rs",
    startLine: 2,
  });
  await expect(page.locator("#thread-31")).toBeVisible();
  await expect(page.locator("#thread-31")).toHaveAttribute("data-range-path", "src/main.rs");
  await expect(page.locator("#thread-31")).toHaveAttribute("data-range-endline", "2");
  await expect(page.locator("#thread-31")).toContainText("Inline line note");
});

test("commit review comment edit form patches an existing discussion comment", async ({ page }) => {
  const thread = {
    authorId: 1,
    authorLabel: "Admin",
    authorLoginId: "admin",
    comments: [
      {
        authorId: 1,
        authorLabel: "Admin",
        authorLoginId: "admin",
        canDelete: true,
        contentsHtml: "",
        contentsMarkdown: "Original commit note",
        createdLabel: "2026-04-21",
        id: 32,
        threadId: 31,
      },
    ],
    commitId,
    createdLabel: "2026-04-21",
    id: 31,
    path: "",
    prevCommitId: "",
    state: "open",
  };
  let threads: unknown[] = [thread];

  await page.route(apiV1Route(`/projects/admin/projectYobi/commit/${commitId}`), async (route) => {
    await route.fulfill({
      body: JSON.stringify(commitDetailPayload(threads)),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(
    apiV1Route(`/projects/admin/projectYobi/commit/${commitId}/comments/32`),
    async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as {
        contentsMarkdown?: string;
      };
      threads = [
        {
          ...thread,
          comments: [
            {
              ...thread.comments[0],
              contentsHtml: "",
              contentsMarkdown: body.contentsMarkdown ?? "",
            },
          ],
        },
      ];
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload(threads)),
        headers: restJsonHeaders,
        status: 200,
      });
    },
  );

  await page.goto(`/yona/admin/projectYobi/commit/${commitId}`);
  await expect(page.locator("#comment-32")).toContainText("Original commit note");
  await page.locator("#comment-32").getByRole("button", { name: "Edit" }).click();

  const editForm = page.locator("#comment-32 .review-comment-edit-form");
  await expect(editForm).toBeVisible();
  await editForm.locator("textarea").fill("Updated commit note");

  const updateRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/commit/${commitId}/comments/32`) && request.method() === "PATCH",
  );
  await editForm.getByRole("button", { name: "Save" }).click();
  const submittedUpdate = (await updateRequest).postDataJSON() as {
    contentsMarkdown?: string;
  };

  expect(submittedUpdate).toMatchObject({
    contentsMarkdown: "Updated commit note",
  });
  await expect(page.locator("#comment-32")).toContainText("Updated commit note");
});

test("commit diff selected text creates a multi-line ranged review thread", async ({ page }) => {
  let threads: unknown[] = [];

  await page.route(apiV1Route(`/projects/admin/projectYobi/commit/${commitId}`), async (route) => {
    await route.fulfill({
      body: JSON.stringify(commitDetailPayload(threads)),
      headers: restJsonHeaders,
      status: 200,
    });
  });
  await page.route(
    apiV1Route(`/projects/admin/projectYobi/commit/${commitId}/comments`),
    async (route) => {
      const body = (route.request().postDataJSON() ?? {}) as {
        contentsMarkdown?: string;
        endLine?: number;
        path?: string;
        startLine?: number;
      };
      threads = [
        {
          authorId: 1,
          authorLabel: "Admin",
          authorLoginId: "admin",
          comments: [
            {
              authorId: 1,
              authorLabel: "Admin",
              authorLoginId: "admin",
              canDelete: true,
              contentsHtml: "",
              contentsMarkdown: body.contentsMarkdown ?? "",
              createdLabel: "2026-04-21",
              id: 32,
              threadId: 31,
            },
          ],
          commitId,
          createdLabel: "2026-04-21",
          endLine: body.endLine,
          id: 31,
          path: body.path,
          prevCommitId: "",
          startLine: body.startLine,
          state: "open",
        },
      ];
      await route.fulfill({
        body: JSON.stringify(commitDetailPayload(threads)),
        headers: restJsonHeaders,
        status: 201,
      });
    },
  );

  await page.goto(`/yona/admin/projectYobi/commit/${commitId}`);
  await expect(page.locator("tr.add .diff-partial-codeline")).toBeVisible();
  await expect(page.locator("tr.context .diff-partial-codeline").last()).toBeVisible();
  await page.evaluate(() => {
    const firstLine = document.querySelector("tr.add .diff-partial-codeline")?.firstChild;
    const contextLines = document.querySelectorAll("tr.context .diff-partial-codeline");
    const lastLine = contextLines.item(contextLines.length - 1)?.firstChild;
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

  const inlineForm = page.locator(".code-review-form");
  await expect(inlineForm).toBeVisible();
  await expect(inlineForm.locator("input[name='startLine']")).toHaveValue("2");
  await expect(inlineForm.locator("input[name='endLine']")).toHaveValue("3");
  await inlineForm.locator("textarea").fill("Multi-line commit note");

  const lineCommentRequest = page.waitForRequest(
    (request) =>
      request.url().endsWith(`/commit/${commitId}/comments`) && request.method() === "POST",
  );
  await inlineForm.getByRole("button", { name: "Comment" }).click();
  const submittedLineComment = (await lineCommentRequest).postDataJSON() as {
    contentsMarkdown?: string;
    endLine?: number;
    path?: string;
    startLine?: number;
  };

  expect(submittedLineComment).toMatchObject({
    contentsMarkdown: "Multi-line commit note",
    endLine: 3,
    path: "src/main.rs",
    startLine: 2,
  });
  await expect(page.locator("#thread-31")).toHaveAttribute("data-range-startline", "2");
  await expect(page.locator("#thread-31")).toHaveAttribute("data-range-endline", "3");
  await expect(page.locator("#thread-31")).toContainText("Multi-line commit note");
});
