import {
  expect,
  test,
  type Page,
  type Route,
  mergedLegacyBlock,
  curatedAppCss,
} from "../wtr-compat.ts";
import { readFileSync } from "../wtr-compat.ts";

// Browser harness: no filesystem. mkdirSync only feeds page.screenshot paths (no-op); resolve builds those paths.
const mkdirSync = () => undefined;
const resolve = (...parts) => parts.join("/");

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = resolve(
  "/private/tmp",
  "yona-style-project-post-detail-markdown-editor-mt10",
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber.tsx", import.meta.url),
  "utf8",
);
const markdownEditorSource = readFileSync(
  new URL("../src/components/markdown-editor.tsx", import.meta.url),
  "utf8",
);
const styleSource = curatedAppCss();
const legacyViewSource = readFileSync(
  new URL("../../yona-original/app/views/board/view.scala.html", import.meta.url),
  "utf8",
);
const legacyCommentsSource = readFileSync(
  new URL("../../yona-original/app/views/board/partial_comments.scala.html", import.meta.url),
  "utf8",
);
const legacyCommentFormSource = readFileSync(
  new URL("../../yona-original/app/views/common/commentForm.scala.html", import.meta.url),
  "utf8",
);
const legacyCommentUpdateFormSource = readFileSync(
  new URL("../../yona-original/app/views/common/commentUpdateForm.scala.html", import.meta.url),
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
const legacyMessagesSource = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("project board post detail comment editors keep the legacy mt10 source and Style ownership", () => {
  expect(legacyViewSource).toContain("@partial_comments(project, post)");
  expect(legacyViewSource).toContain("@common.commentForm(post.asResource()");
  expect(legacyCommentsSource).toContain("@common.commentUpdateForm(comment");
  expect(legacyCommentFormSource).toContain('@common.editor("contents"');
  expect(legacyCommentUpdateFormSource).toContain('@common.editor("contents-" + comment.id');
  expect(legacyEditorSource).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacyUploadSource).toContain('class="upload-wrap content-footer"');
  expect(legacyCommonSource).toContain(".mt10 { margin-top:10px; }");

  for (const importPath of [
    '"less/_variables.less"',
    '"less/_mixins.less"',
    '"less/_common.less"',
    '"less/_sprites.less"',
    '"less/_page.less"',
    '"less/_tippy.less"',
    '"less/_scrollbar.less"',
    '"less/_responsive.less"',
    '"less/_yobiUI.less"',
    '"less/_temporary.less"',
    '"less/_markdown.less"',
    '"less/_migration.less"',
    '"less/_override.less"',
  ]) {
    expect(legacyYobiSource).toContain(`@import ${importPath};`);
  }
  expect(legacyPageSource).toContain(".comment-update-form");
  expect(legacyResponsiveSource).toContain(".nav-tabs li a");
  expect(legacyYobiUiSource).toContain(".nav-tabs");
  expect(legacyMarkdownSource).toContain(".markdown-wrap");

  for (const message of [
    "common.editor.edit = Edit",
    "common.editor.preview = Preview",
    "button.add.checklist = Add checklist",
    "button.clear.temporary = Clear Temporary",
    "notification.receiver.list.title = Notification receivers",
  ]) {
    expect(legacyMessagesSource).toContain(message);
  }

  expect(routeSource).toContain('"post-detail-comment-create-editor-wrapper"');
  expect(routeSource).toContain('"post-detail-comment-update-editor-wrapper"');
  expect(markdownEditorSource).toContain("data-owner-instance={wrapperInstance}");
});

test("project board post detail comment editors preserve mt10, tabs, and responsive containment", async ({
  page,
}) => {
  await mockProjectPostDetail(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/post/3`, { waitUntil: "commit" });

    const createEditor = page.locator('[data-owner="post-detail-comment-create-editor-wrapper"]');
    const updateEditor = page.locator('[data-owner="post-detail-comment-update-editor-wrapper"]');
    await expect(createEditor).toHaveCount(1);
    await expect(updateEditor).toHaveCount(1);
    await expect(createEditor).toBeVisible();
    await expect(createEditor).toHaveClass(/\bmt10\b/u);
    await expect(updateEditor).toHaveClass(/\bmt10\b/u);
    await expect(createEditor).toHaveCSS("margin-top", "10px");
    await expect(updateEditor).toHaveCSS("margin-top", "10px");
    await expect(createEditor).not.toHaveAttribute("style", /.+/u);
    await expect(updateEditor).not.toHaveAttribute("style", /.+/u);
    await expect(createEditor).toHaveAttribute("data-owner-instance", "contents");
    await expect(updateEditor).toHaveAttribute("data-owner-instance", "21");
    await expect(page.locator('[data-toggle="markdown-editor"]')).toHaveCount(0);

    const createTabs = createEditor.locator(".nav-tabs > li");
    await expect(createTabs).toHaveCount(5);
    await expect(createTabs.nth(0).locator("a")).toHaveText("Edit");
    await expect(createTabs.nth(1).locator("a")).toHaveText("Preview");
    await expect(createTabs.nth(2).locator("button")).toHaveText("Add checklist");
    await expect(createTabs.nth(3).locator("button")).toHaveText("Clear Temporary");
    await expect(createEditor.locator('textarea[name="contents"]')).toHaveCount(1);
    await expect(page.locator('#comment-form input[name="filePath"]')).toHaveAttribute(
      "multiple",
      "",
    );
    await expect(createEditor.locator("#edit-contents")).toHaveClass(/\bactive\b/u);
    await expect(createEditor.locator("#preview-contents")).not.toHaveClass(/\bactive\b/u);

    await createEditor.locator('textarea[name="contents"]').fill("Create **preview**");
    await createTabs.nth(1).locator("a").click();
    await expect(createEditor.locator("#preview-contents")).toHaveClass(/\bactive\b/u);
    await expect(createEditor.locator("#edit-contents")).not.toHaveClass(/\bactive\b/u);
    await expect(createEditor.locator(".markdown-preview")).toContainText("Create preview");
    await createTabs.nth(0).locator("a").click();
    await expect(createEditor.locator("#edit-contents")).toHaveClass(/\bactive\b/u);

    await page.locator('#comment-21 button[title="Edit comment"]').click();
    await expect(updateEditor).toBeVisible();
    const updateTabs = updateEditor.locator(".nav-tabs > li");
    await expect(updateTabs).toHaveCount(5);
    await expect(updateTabs.nth(0).locator("a")).toHaveText("Edit");
    await expect(updateTabs.nth(1).locator("a")).toHaveText("Preview");
    await expect(updateEditor.locator('textarea[name="contents"]')).toHaveValue(
      "First **comment**",
    );
    await expect(page.locator('#comment-editform-21 input[name="filePath"]')).toHaveAttribute(
      "multiple",
      "",
    );
    await expect(page.locator("#comment-editform-21 .ybtn-cancel")).toHaveText("Cancel");
    await expect(page.locator("#comment-editform-21 button[type=submit]")).toHaveText("Save");

    await updateEditor.locator('textarea[name="contents"]').fill("Update **preview**");
    await updateTabs.nth(1).locator("a").click();
    await expect(updateEditor.locator("#preview-21")).toHaveClass(/\bactive\b/u);
    await expect(updateEditor.locator("#edit-21")).not.toHaveClass(/\bactive\b/u);
    await expect(updateEditor.locator(".markdown-preview")).toContainText("Update preview");
    await updateTabs.nth(0).locator("a").click();
    await expect(updateEditor.locator("#edit-21")).toHaveClass(/\bactive\b/u);

    const metrics = await page.evaluate(() => {
      const wrappers = Array.from(
        document.querySelectorAll<HTMLElement>(
          '[data-owner$="editor-wrapper"][data-owner-instance]',
        ),
      );
      const measured = wrappers.map((wrapper) => {
        const box = wrapper.getBoundingClientRect();
        return { bottom: box.bottom, left: box.left, right: box.right, top: box.top };
      });
      return {
        bodyScrollWidth: document.body.scrollWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        measured,
        viewportWidth: window.innerWidth,
      };
    });
    expect(metrics.measured).toHaveLength(2);
    for (const box of metrics.measured) {
      expect(box.left).toBeGreaterThanOrEqual(-1);
      expect(box.right).toBeLessThanOrEqual(metrics.viewportWidth + 1);
      expect(box.bottom).toBeGreaterThan(box.top);
    }
    expect(metrics.documentScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.bodyScrollWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);

    mkdirSync(screenshotDirectory, { recursive: true });
    await page.screenshot({
      fullPage: true,
      path: resolve(screenshotDirectory, `${viewport.name}.png`),
    });
  }
});

async function mockProjectPostDetail(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: "1",
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en-US",
    userLabel: "Site Admin",
  };
  await page.route("**/api/v1/session", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: session }),
  );
  await page.route("**/api/auth/session", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "test-csrf-token" },
      json: session,
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
        id: 7,
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
        vcs: "GIT",
        viewerCanUpdate: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: { canAttachFiles: true, canMarkNotice: true, canMarkReadme: true, labels: [] },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/3", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorId: "2",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyHtml: "<p>Server HTML should not render</p>",
        bodyMarkdown: "Post **markdown**",
        commentCount: 1,
        comments: [
          {
            attachments: [],
            authorId: "2",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            contentsHtml: "<p>Server HTML should not render</p>",
            contentsMarkdown: "First **comment**",
            createdAt: "2026-07-03T00:00:00+09:00",
            id: "21",
            parentCommentId: "",
            viaEmail: false,
          },
        ],
        createdAt: "2026-07-02T00:00:00+09:00",
        historyHtml: "",
        historyMarkdown: "",
        id: "33",
        isWatching: false,
        labels: [],
        notice: false,
        ownerName: "admin",
        permissions: {
          canComment: true,
          canCreate: true,
          canDelete: true,
          canRead: true,
          canSetNotice: true,
          canUpdate: true,
          canWatch: true,
        },
        postNumber: "3",
        projectName: "sample",
        readme: false,
        title: "Release note",
        updatedLabel: "Jul 2, 2026",
        watcherCount: 0,
      },
    }),
  );
}
