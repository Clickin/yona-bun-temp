import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("PR changes review editor preserves spacing and submits a thread reply", async ({ page }) => {
  await mockChanges(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`, { waitUntil: "commit" });

    const reviewEditors = page.locator(
      '[data-owner="pull-request-changes-non-ranged-review-form"] [data-owner="pull-request-changes-review-editor-wrapper"]',
    );
    await expect(reviewEditors).toHaveCount(1);
    const editor = reviewEditors.first();
    await expect(editor).toBeVisible();
    const form = editor.locator("xpath=ancestor::form[1]");
    const upload = form.locator(".upload-wrap").first();
    await expect(editor).toHaveCSS("margin-top", "10px");

    const tabs = editor.locator("> .nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(tabs.nth(1).getByRole("button", { name: "Preview" })).toBeVisible();
    await expect(editor.locator(".textarea-box textarea")).toBeVisible();
    await expect(upload).toBeVisible();
    await expect(upload.locator("input[type=file][name=filePath]")).toBeVisible();
    await expect(upload.locator("input[type=file][name=filePath]")).toHaveAttribute("multiple", "");

    await tabs.nth(1).getByRole("button", { name: "Preview" }).click();
    await expect(editor.locator(`#preview-thread-91`)).toBeVisible();
    await expect(editor.locator(`#edit-thread-91`)).not.toBeVisible();
    await tabs.nth(0).getByRole("button", { name: "Edit" }).click();
    await expect(editor.locator(`#edit-thread-91`)).toBeVisible();
    await editor.locator(".textarea-box textarea").fill("Reply with attachment");

    const fileInput = upload.locator("input[type=file][name=filePath]");
    await fileInput.setInputFiles({
      name: "review-note.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("review note"),
    });
    await expect(fileInput).toHaveJSProperty("files.length", 1);

    await expect(form).toHaveAttribute("method", "post");
    await expect(form).toHaveAttribute("enctype", "multipart/form-data");
    await expect(form.locator('button[type="submit"]')).toHaveText("Add a comment");
    await expect(form.locator('button[type="submit"]')).toBeVisible();

    const editorMetrics = await editor.evaluate((element) => {
      const editorBox = element.getBoundingClientRect();
      const textarea = element.querySelector("textarea");
      const textareaBox = textarea?.getBoundingClientRect();
      return {
        editorBottom: editorBox.bottom,
        editorLeft: editorBox.left,
        editorRight: editorBox.right,
        editorTop: editorBox.top,
        textareaBottom: textareaBox?.bottom ?? 0,
        textareaRight: textareaBox?.right ?? 0,
        viewportWidth: window.innerWidth,
      };
    });
    const uploadMetrics = await upload.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { bottom: box.bottom, right: box.right };
    });
    expect(editorMetrics.editorTop).toBeGreaterThan(0);
    expect(editorMetrics.editorRight).toBeLessThanOrEqual(editorMetrics.viewportWidth + 1);
    expect(editorMetrics.editorLeft).toBeGreaterThanOrEqual(-1);
    expect(editorMetrics.editorBottom).toBeGreaterThan(editorMetrics.editorTop);
    expect(editorMetrics.textareaRight).toBeLessThanOrEqual(editorMetrics.editorRight + 1);
    expect(editorMetrics.textareaBottom).toBeGreaterThan(editorMetrics.editorTop);
    expect(uploadMetrics.right).toBeLessThanOrEqual(editorMetrics.viewportWidth + 1);
    expect(uploadMetrics.bottom).toBeGreaterThan(editorMetrics.textareaBottom);
    expect(
      await page.locator("body").evaluate((element) => element.scrollWidth),
    ).toBeLessThanOrEqual(viewport.width);

    const submitRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        new URL(request.url()).pathname ===
          `${basePath}/api/v1/owners/admin/projects/sample/pull-requests/9/comments`,
    );
    await form.locator('button[type="submit"]').click();
    const submitRequest = await submitRequestPromise;
    expect(submitRequest.postDataJSON()).toMatchObject({
      attachmentIds: [702],
      contentsMarkdown: "Reply with attachment",
      threadId: 91,
    });
    await expect(editor.locator(".textarea-box textarea")).toHaveValue("");
  }
});

async function mockChanges(page: Page) {
  for (const url of ["**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "review-comment-csrf" },
        json: {},
      }),
    );
  }
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        actorId: 1,
        avatarUrl: "/assets/images/default-avatar-32.png",
        defaultLandingPath: "/",
        emailAddress: "admin@example.com",
        isAnonymous: false,
        isConfirmed: true,
        isSiteAdmin: true,
        loginId: "admin",
        userLabel: "Site Admin",
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        enrollmentRequestCount: 0,
        id: 7,
        isFavorite: false,
        isForkedFromOrigin: false,
        isPrivate: false,
        isProtected: false,
        logoUrl: "/assets/images/project_default_logo.png",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        ownerName: "admin",
        projectName: "sample",
        projectScope: "public",
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/changes**",
    (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        json: {
          cardThreads: [reviewThread()],
          commits: [],
          files: [
            {
              path: "src/main.rs",
              patch:
                "diff --git a/src/main.rs b/src/main.rs\n--- a/src/main.rs\n+++ b/src/main.rs\n@@ -1 +1 @@\n-old\n+new",
            },
          ],
          inlineThreads: [],
          nonRangedThreads: [reviewThread()],
          pullRequest: pullRequestDetail(),
          threads: [reviewThread()],
        },
      }),
  );
  await page.route(`**${basePath}/files`, (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { id: 702, name: "review-note.txt", mimeType: "text/plain", size: 11 },
    }),
  );
  await page.route(
    "**/api/v1/owners/admin/projects/sample/pull-requests/9/comments",
    (route: Route) => route.fulfill({ contentType: "application/json", json: pullRequestDetail() }),
  );
}

function reviewThread() {
  return {
    authorAvatarUrl: "/assets/images/default-avatar-32.png",
    authorId: 2,
    authorLabel: "Dev Member",
    authorLoginId: "dev",
    comments: [
      {
        attachments: [],
        authorId: 2,
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        canDelete: false,
        canUpdate: false,
        contentsHtml: "<p>Review note</p>",
        contentsMarkdown: "Review note",
        createdLabel: "Jul 5, 2026",
        id: 701,
        threadId: 91,
        viaEmail: false,
      },
    ],
    commitId: "",
    createdLabel: "Jul 5, 2026",
    endLine: 1,
    endSide: "B",
    id: 91,
    path: "src/main.rs",
    prevCommitId: "",
    pullRequestNumber: 9,
    startLine: 1,
    startSide: "B",
    state: "open",
  };
}

function pullRequestDetail() {
  return {
    attachments: [],
    bodyHtml: "<p>Initial body</p>",
    bodyMarkdown: "Initial body",
    commits: [],
    conflict: false,
    contributor: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "dev",
      userId: 2,
      userLabel: "Dev Member",
    },
    createdLabel: "Jul 2, 2026",
    events: [],
    fromBranch: "feature/ui",
    fromOwnerName: "admin",
    fromProjectName: "sample",
    id: 90,
    isMerging: false,
    lackingReviewerCount: 0,
    mergedCommitIdFrom: "",
    mergedCommitIdTo: "",
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
      canWatch: true,
    },
    projectName: "sample",
    pullRequestNumber: 9,
    receiver: {
      avatarUrl: "/assets/images/default-avatar-32.png",
      loginId: "admin",
      userId: 1,
      userLabel: "Site Admin",
    },
    requiredReviewerCount: 0,
    reviewed: false,
    reviewers: [],
    sourceBranchExists: true,
    state: "open",
    title: "Initial title",
    toBranch: "main",
    updatedLabel: "Jul 2, 2026",
    watcherCount: 0,
  };
}
