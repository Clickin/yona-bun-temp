import { mkdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test, type Page, type Route } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve("/private/tmp/yona-pull-request-changes-review-editor-mt10");
const routeSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/changes.tsx",
    import.meta.url,
  ),
  "utf8",
);
const styleSource = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/pullRequest/$pullRequestNumber/-pull-request-changes.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);
const legacyViewSource = readFileSync(
  new URL("../../yona-original/app/views/git/viewChanges.scala.html", import.meta.url),
  "utf8",
);
const legacyThreadFormSource = readFileSync(
  new URL(
    "../../yona-original/app/views/partial_comment_form_on_thread.scala.html",
    import.meta.url,
  ),
  "utf8",
);
const legacyThreadSource = readFileSync(
  new URL("../../yona-original/app/views/partial_comment_thread.scala.html", import.meta.url),
  "utf8",
);
const legacyEditorSource = readFileSync(
  new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
  "utf8",
);
const legacyUploadSource = readFileSync(
  new URL("../../yona-original/app/views/common/uploadForm.scala.html", import.meta.url),
  "utf8",
);
const legacyYobiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const legacyCommonSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const legacyPageSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const legacyResponsiveSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  "utf8",
);
const legacyYobiUiSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
  "utf8",
);
const legacyMarkdownSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_markdown.less", import.meta.url),
  "utf8",
);
const legacyBootstrapSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
  "utf8",
);
const legacyBootstrapResponsiveSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  "utf8",
);
const legacyMessagesSource = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("PR changes review editor owns legacy mt10 in route StyleX", async ({ page }) => {
  expect(legacyViewSource).toContain("@common.reviewForm");
  expect(legacyThreadSource).toContain("@partial_comment_form_on_thread(thread)");
  expect(legacyThreadFormSource).toContain(
    '@common.editor("contents", "" , "style=height:100px", "code-review-body")',
  );
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyUploadSource).toContain('class="upload-wrap content-footer"');
  expect(legacyCommonSource).toMatch(/\.mt10\s*\{\s*margin-top:10px;\s*\}/u);
  expect(legacyYobiSource).toContain('@import "less/_common.less";');
  expect(legacyYobiSource).toContain('@import "less/_page.less";');
  expect(legacyYobiSource).toContain('@import "less/_responsive.less";');
  expect(legacyYobiSource).toContain('@import "less/_yobiUI.less";');
  expect(legacyYobiSource).toContain('@import "less/_markdown.less";');
  expect(legacyPageSource).toContain(".review-form {");
  expect(legacyResponsiveSource).toContain(".review-form .write-comment-box");
  expect(legacyYobiUiSource).toContain("body {");
  expect(legacyMarkdownSource).toContain(".markdown-wrap {");
  expect(legacyBootstrapSource).toContain(".tab-content > .active");
  expect(legacyBootstrapResponsiveSource).toContain("@media (max-width: 767px)");
  expect(legacyMessagesSource).toContain("common.editor.edit = Edit");
  expect(legacyMessagesSource).toContain("common.editor.preview = Preview");
  expect(legacyMessagesSource).toContain("button.upload = File upload");

  expect(routeSource).toContain("styles.reviewEditorWrapper");
  expect(routeSource).toContain('"pull-request-changes-review-editor-wrapper"');
  expect(routeSource).toContain('className={`mt10 ${editorStyleProps.className ?? ""}`.trim()}');
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(styleSource).toContain('reviewEditorWrapper: { marginTop: "10px" }');

  await mockChanges(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/pullRequest/9/changes`, { waitUntil: "commit" });

    const reviewEditors = page.locator(
      '[data-stylex-owner="pull-request-changes-non-ranged-review-form"] [data-stylex-owner="pull-request-changes-review-editor-wrapper"]',
    );
    await expect(reviewEditors).toHaveCount(1);
    const editor = reviewEditors.first();
    await expect(editor).toBeVisible();
    const form = editor.locator("xpath=ancestor::form[1]");
    const upload = form.locator(".upload-wrap").first();
    await expect(editor).toHaveClass(/\bmt10\b/u);
    await expect(editor).toHaveCSS("margin-top", "10px");
    await expect(editor).not.toHaveAttribute("style", /.+/u);

    const tabs = editor.locator("> .nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(tabs.nth(1).getByRole("button", { name: "Preview" })).toBeVisible();
    await expect(editor.locator(".textarea-box textarea")).toBeVisible();
    await expect(upload).toBeVisible();
    await expect(upload.locator("input[type=file][name=filePath]")).toBeVisible();
    await expect(upload.locator("input[type=file][name=filePath]")).toHaveAttribute("multiple", "");

    await tabs.nth(1).getByRole("button", { name: "Preview" }).click();
    await expect(editor.locator(`#preview-thread-91`)).toHaveClass(/\bactive\b/u);
    await expect(editor.locator(`#edit-thread-91`)).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).getByRole("button", { name: "Edit" }).click();
    await expect(editor.locator(`#edit-thread-91`)).toHaveClass(/\bactive\b/u);

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

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });

    const submitRequestPromise = page.waitForRequest(
      (request) =>
        request.method() === "POST" &&
        request.url().includes("/admin/sample/pullRequest/90/comments"),
    );
    await form.locator('button[type="submit"]').click();
    const submitRequest = await submitRequestPromise;
    expect(submitRequest.method()).toBe("POST");
  }
});

async function mockChanges(page: Page) {
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
  await page.route("**/admin/sample/pullRequest/90/comments**", (route: Route) =>
    route.fulfill({ contentType: "text/html", body: "submitted" }),
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
