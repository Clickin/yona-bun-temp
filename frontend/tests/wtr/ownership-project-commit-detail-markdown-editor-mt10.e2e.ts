import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page, type Route } from "../wtr-compat.ts";

// Browser harness: screenshot paths are artifact-only no-ops.
const outputPath = (name: string) => name;

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test.use({ locale: "en-US" });

test("commit detail review markdown editor preserves legacy mt10 ownership and bounds", async ({
  page,
}, testInfo) => {
  const info = testInfo ?? test.info();
  const routeSource = readFileSync(
    new URL("../src/routes/$ownerName/$projectName/commit/$commitId.tsx", import.meta.url),
    "utf8",
  );
  const styleSource =
    readFileSync(new URL("../src/app.css", import.meta.url), "utf8") +
    readFileSync(
      new URL("../frontend/public/legacy-assets/stylesheets/legacy-fallback.css", import.meta.url),
      "utf8",
    );
  const legacyViewChanges = readFileSync(
    new URL("../../yona-original/app/views/git/viewChanges.scala.html", import.meta.url),
    "utf8",
  );
  const legacyDiffComment = readFileSync(
    new URL(
      "../../yona-original/app/views/partial_diff_comment_on_line.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const legacyThread = readFileSync(
    new URL("../../yona-original/app/views/partial_comment_thread.scala.html", import.meta.url),
    "utf8",
  );
  const legacyThreadForm = readFileSync(
    new URL(
      "../../yona-original/app/views/partial_comment_form_on_thread.scala.html",
      import.meta.url,
    ),
    "utf8",
  );
  const legacyEditor = readFileSync(
    new URL("../../yona-original/app/views/common/editor.scala.html", import.meta.url),
    "utf8",
  );
  const legacyUploadForm = readFileSync(
    new URL("../../yona-original/app/views/common/uploadForm.scala.html", import.meta.url),
    "utf8",
  );
  const legacyCommonLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
    "utf8",
  );
  const legacyPageLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
    "utf8",
  );
  const legacyResponsiveLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
    "utf8",
  );
  const legacyYobiUiLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_yobiUI.less", import.meta.url),
    "utf8",
  );
  const legacyMarkdownLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/less/_markdown.less", import.meta.url),
    "utf8",
  );
  const legacyYobiLess = readFileSync(
    new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
    "utf8",
  );
  const legacyMessages = readFileSync(
    new URL("../../yona-original/conf/messages", import.meta.url),
    "utf8",
  );

  expect(legacyViewChanges).toContain("@common.commentForm");
  expect(legacyViewChanges).toContain("@common.reviewForm");
  expect(legacyDiffComment).toContain("@partial_comment_thread(thread)");
  expect(legacyThread).toContain("@partial_comment_form_on_thread(thread)");
  expect(legacyThreadForm).toContain(
    '@common.editor("contents", "" , "style=height:100px", "code-review-body")',
  );
  expect(legacyEditor).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyUploadForm).toContain('class="upload-wrap content-footer"');
  expect(legacyCommonLess).toContain(".mt10 { margin-top:10px; }");
  expect(legacyPageLess).toContain(".review-form");
  expect(legacyPageLess).toContain(".textarea-box");
  expect(legacyResponsiveLess).toContain(".review-form .write-comment-box");
  expect(legacyResponsiveLess).toContain(".textarea-box");
  expect(legacyYobiUiLess).toContain(".nav-tabs");
  expect(legacyMarkdownLess).toContain(".markdown-wrap");
  for (const importName of [
    "less/_common.less",
    "less/_page.less",
    "less/_responsive.less",
    "less/_yobiUI.less",
    "less/_markdown.less",
  ]) {
    expect(legacyYobiLess).toContain(`@import "${importName}";`);
  }
  expect(legacyMessages).toContain("common.editor.edit = Edit");
  expect(legacyMessages).toContain("common.editor.preview = Preview");
  expect(legacyMessages).toContain("button.add.checklist = Add checklist");
  expect(legacyMessages).toContain("button.clear.temporary = Clear Temporary");
  expect(legacyMessages).toContain("notification.receiver.list.title = Notification receivers");

  expect(routeSource).toContain('data-owner="commit-detail-markdown-editor-wrapper"');
  expect(routeSource).toContain("data-owner-instance={wrapId}");
  expect(routeSource).toContain('"commit-detail-review-textarea"');

  await mockCommit(page);
  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/weblabs/demo/commit/abc123`, { waitUntil: "commit" });

    const editor = page.locator(
      '[data-owner="commit-detail-markdown-editor-wrapper"][data-owner-instance="thread-77"]',
    );
    await expect(editor).toBeVisible();
    await expect(editor).toHaveClass(/\bmt10\b/u);
    await expect(editor).toHaveCSS("margin-top", "10px");
    await expect(editor).not.toHaveAttribute("style", /.+/u);

    const textarea = editor.locator('textarea[name="contents"]');
    await expect(textarea).toHaveAttribute("id", "editor-contents-thread-77");
    await expect(textarea).toHaveAttribute("data-editor-mode", "code-review-body");
    await expect(textarea).toHaveAttribute("markdown", "true");
    await expect(textarea).toHaveCSS("height", "100px");
    await expect(textarea).toHaveAttribute("data-owner", "commit-detail-review-textarea");

    const tabs = editor.locator("> ul.nav-tabs > li");
    await expect(tabs).toHaveCount(5);
    await expect(tabs.nth(0).getByRole("button")).toHaveText("Edit");
    await expect(tabs.nth(1).getByRole("button")).toHaveText("Preview");
    await expect(tabs.nth(2).getByRole("button")).toContainText("Add checklist");
    await expect(tabs.nth(3)).toContainText("Clear Temporary");
    await expect(editor.locator("#edit-thread-77")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#preview-thread-77")).not.toHaveClass(/\bactive\b/u);

    await tabs.nth(1).getByRole("button").click();
    await expect(editor.locator("#preview-thread-77")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#edit-thread-77")).not.toHaveClass(/\bactive\b/u);
    await tabs.nth(0).getByRole("button").click();
    await expect(editor.locator("#edit-thread-77")).toHaveClass(/\bactive\b/u);

    const geometry = await page.evaluate(() => {
      const editorElement = document.querySelector<HTMLElement>(
        '[data-owner="commit-detail-markdown-editor-wrapper"][data-owner-instance="thread-77"]',
      );
      const reviewForm = document.querySelector<HTMLElement>(
        '[data-owner="commit-detail-thread-review-form"]',
      );
      if (!editorElement || !reviewForm) return null;
      const editorBox = editorElement.getBoundingClientRect();
      const formBox = reviewForm.getBoundingClientRect();
      return {
        documentWidth: document.documentElement.scrollWidth,
        editorBottom: editorBox.bottom,
        editorLeft: editorBox.left,
        editorRight: editorBox.right,
        editorTop: editorBox.top,
        formRight: formBox.right,
        viewportWidth: window.innerWidth,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry!.editorTop).toBeGreaterThan(0);
    expect(geometry!.editorBottom).toBeGreaterThan(geometry!.editorTop);
    expect(geometry!.editorLeft).toBeGreaterThanOrEqual(0);
    expect(geometry!.editorRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.formRight).toBeLessThanOrEqual(geometry!.viewportWidth + 1);
    expect(geometry!.documentWidth).toBeLessThanOrEqual(geometry!.viewportWidth + 1);

    const reviewForm = page.locator('[data-owner="commit-detail-thread-review-form"]');
    await expect(reviewForm.locator('input[type="file"][name="filePath"]')).toBeAttached();
    await expect(reviewForm.getByRole("button", { name: "Add a comment" })).toBeVisible();

    await page.screenshot({
      fullPage: true,
      path: outputPath(`commit-detail-markdown-editor-mt10-${viewport.name}.png`),
    });
  }
});

async function mockCommit(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 1,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "admin@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: true,
    loginId: "admin",
    userLabel: "Admin",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        ownerName: "weblabs",
        projectName: "demo",
        vcs: "GIT",
        viewerCanUpdate: true,
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
      },
    }),
  );
  await page.route("**/api/v1/projects/**/commit/abc123**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        selectedBranch: "main",
        commit: {
          commitId: "abc123",
          commitShortId: "abc123",
          shortMessage: "Fix issue",
          message: "Fix issue\nDetails",
          authorName: "admin",
          authorEmail: "admin@example.com",
          authorDate: "today",
          commentCount: 1,
        },
        files: [
          {
            path: "src/main.rs",
            patch: "@@ -1 +1 @@\n-old line\n+new line",
          },
        ],
        threads: [
          {
            id: 77,
            state: "open",
            commitId: "abc123",
            prevCommitId: "",
            path: "",
            authorId: 1,
            authorLabel: "Admin",
            authorLoginId: "admin",
            createdLabel: "today",
            comments: [
              {
                id: 501,
                threadId: 77,
                authorId: 1,
                authorLabel: "Admin",
                authorLoginId: "admin",
                authorAvatarUrl: "/assets/images/default-avatar-32.png",
                canDelete: false,
                canUpdate: false,
                contentsHtml: "",
                contentsMarkdown: "Review note",
                createdLabel: "today",
                viaEmail: false,
                attachments: [],
              },
            ],
          },
        ],
        branches: [],
        breadcrumbs: [],
        isWatching: false,
        noHead: false,
        ownerName: "weblabs",
        parentCommit: { commitId: "000000", commitShortId: "000000" },
        path: "",
        permissions: { canComment: true, canUpdateThreadState: true },
        projectName: "demo",
      },
    }),
  );
}
