import { expect, test, type Page } from "@playwright/test";

const restJsonHeaders = {
  "access-control-allow-origin": "*",
  "content-type": "application/json",
};

const commitId = "abcdef1234567890abcdef1234567890abcdef12";
const apiV1Route = (path: string) => `**/api/v1${path}`;

function commitDetailPayload(threads: unknown[] = []) {
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
        contentsHtml: "<p>Existing comment</p>",
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
