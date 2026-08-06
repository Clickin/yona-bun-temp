import { readFileSync } from "../wtr-compat.ts";
import { expect, test, type Page } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const screenshotDirectory = "/private/tmp/yona-stylex-project-issue-detail-markdown-editor-mt10";
const routeSource = readFileSync(
  "../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx",
  "utf8",
);
const styleSource = readFileSync(
  "../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts",
  "utf8",
);
const legacySources = {
  commentForm: readFileSync("../yona-original/app/views/common/commentForm.scala.html", "utf8"),
  commentUpdateForm: readFileSync(
    "../yona-original/app/views/common/commentUpdateForm.scala.html",
    "utf8",
  ),
  editor: readFileSync("../yona-original/app/views/common/editor.scala.html", "utf8"),
  issueView: readFileSync("../yona-original/app/views/issue/view.scala.html", "utf8"),
  partialComment: readFileSync(
    "../yona-original/app/views/issue/partial_comment.scala.html",
    "utf8",
  ),
  partialComments: readFileSync(
    "../yona-original/app/views/issue/partial_comments.scala.html",
    "utf8",
  ),
  uploadForm: readFileSync("../yona-original/app/views/common/uploadForm.scala.html", "utf8"),
  commonLess: readFileSync("../yona-original/app/assets/stylesheets/less/_common.less", "utf8"),
  markdownLess: readFileSync("../yona-original/app/assets/stylesheets/less/_markdown.less", "utf8"),
  pageLess: readFileSync("../yona-original/app/assets/stylesheets/less/_page.less", "utf8"),
  responsiveLess: readFileSync(
    "../yona-original/app/assets/stylesheets/less/_responsive.less",
    "utf8",
  ),
  yobiUiLess: readFileSync("../yona-original/app/assets/stylesheets/less/_yobiUI.less", "utf8"),
  yobiLess: readFileSync("../yona-original/app/assets/stylesheets/yobi.less", "utf8"),
  messages: readFileSync("../yona-original/conf/messages", "utf8"),
};

test.use({ locale: "en-US" });

test("issue detail comment markdown editor owns legacy mt10 wrapper", async ({ page }) => {
  expect(legacySources.issueView).toContain("@partial_comments(project, issue)");
  expect(legacySources.issueView).toContain("@common.commentForm(issue.asResource()");
  expect(legacySources.partialComments).toContain("@partial_comment(comment, project, issue)");
  expect(legacySources.partialComment).toContain("@common.commentUpdateForm(comment,");
  expect(legacySources.commentForm).toContain('@common.editor("contents","","","comment-body")');
  expect(legacySources.commentForm).toContain("@common.fileUploader(resourceType, null)");
  expect(legacySources.commentUpdateForm).toContain(
    '@common.editor("contents-" + comment.id, contents,"", "update-comment-body")',
  );
  expect(legacySources.commentUpdateForm).toContain('name="filePath"');
  expect(legacySources.editor).toContain('<div data-toggle="markdown-editor" class="mt10">');
  expect(legacySources.editor).toContain('class="nav nav-tabs nm small"');
  expect(legacySources.editor).toContain('name="@textareaName"');
  expect(legacySources.editor).toContain('id="editor-@textareaName-@wrapId"');
  expect(legacySources.editor).toContain('class="notification-receiver"');
  expect(legacySources.uploadForm).toContain('class="upload-wrap content-footer"');
  expect(legacySources.commonLess).toContain(".mt10 { margin-top:10px; }");
  expect(legacySources.pageLess).toContain("div.markdown-preview");
  expect(legacySources.responsiveLess).toContain(".nav-tabs li a");
  expect(legacySources.responsiveLess).toContain(".textarea-box");
  expect(legacySources.yobiUiLess).toContain(".nav-tabs {");
  expect(legacySources.markdownLess).toContain(".markdown-wrap {");
  expect(legacySources.messages).toContain("common.editor.edit = Edit");
  expect(legacySources.messages).toContain("common.editor.preview = Preview");
  expect(legacySources.messages).toContain("button.add.checklist = Add checklist");
  expect(legacySources.messages).toContain("button.clear.temporary = Clear Temporary");
  expect(legacySources.messages).toContain(
    "notification.receiver.list.title = Notification receivers",
  );

  for (const importedFile of [
    "_variables.less",
    "_mixins.less",
    "_common.less",
    "_sprites.less",
    "_page.less",
    "_tippy.less",
    "_scrollbar.less",
    "_responsive.less",
    "_yobiUI.less",
    "_temporary.less",
    "_markdown.less",
    "_migration.less",
    "_override.less",
  ]) {
    expect(legacySources.yobiLess).toContain(`@import "less/${importedFile}";`);
  }

  expect(routeSource).toContain('wrapperOwner: "project-issue-detail-markdown-editor-wrapper"');
  expect(routeSource).toContain("wrapperInstance: wrapId");
  expect(routeSource).toContain(
    '`mt10 markdown-editor ${stylex.props(styles.markdownEditorWrapper).className ?? ""}`.trim()',
  );
  expect(routeSource).not.toContain('style={{ marginTop: "10px" }}');
  expect(styleSource).toContain('markdownEditorWrapper: { marginTop: "10px" }');

  await mockIssueDetail(page);

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issue/11`, { waitUntil: "commit" });

    const wrappers = page.locator(
      '[data-stylex-owner="project-issue-detail-markdown-editor-wrapper"]',
    );
    await expect(wrappers).toHaveCount(2);
    await expect(wrappers.nth(0)).toHaveAttribute("data-stylex-owner-instance", "77");
    await expect(wrappers.nth(1)).toHaveAttribute("data-stylex-owner-instance", "contents");
    for (const wrapper of await wrappers.all()) {
      await expect(wrapper).toHaveClass(/\bmt10\b/u);
      await expect(wrapper).toHaveClass(/\bmarkdown-editor\b/u);
      await expect(wrapper).toHaveCSS("margin-top", "10px");
      await expect(wrapper).not.toHaveAttribute("style", /.+/u);
    }

    const editor = page.locator(
      '[data-stylex-owner="project-issue-detail-markdown-editor-wrapper"][data-stylex-owner-instance="contents"]',
    );
    await expect(editor).toBeVisible();
    await expect(editor.locator("> ul.nav-tabs > li")).toHaveCount(5);
    await expect(editor.locator("> ul.nav-tabs > li").nth(0)).toContainText("Edit");
    await expect(editor.locator("> ul.nav-tabs > li").nth(1)).toContainText("Preview");
    await expect(editor.locator("> ul.nav-tabs > li").nth(2)).toContainText("Add checklist");
    await expect(editor.locator("> ul.nav-tabs > li").nth(3)).toContainText("Clear Temporary");
    await expect(editor.locator("> ul.nav-tabs > li").nth(4)).toHaveText("");
    await expect(editor.locator("#edit-contents")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#preview-contents")).not.toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#editor-contents-contents")).toHaveAttribute("name", "contents");
    await expect(editor.locator("#editor-contents-contents")).toHaveAttribute(
      "data-editor-mode",
      "comment-body",
    );
    await expect(editor.locator("#editor-contents-contents")).toHaveValue("");

    await editor.getByRole("button", { name: "Preview" }).click();
    await expect(editor.locator("#preview-contents")).toHaveClass(/\bactive\b/u);
    await expect(editor.locator("#edit-contents")).not.toHaveClass(/\bactive\b/u);
    await editor.getByRole("button", { name: "Edit" }).click();
    await expect(editor.locator("#edit-contents")).toHaveClass(/\bactive\b/u);

    const receiver = editor.locator(
      '[data-stylex-owner="project-issue-detail-markdown-editor-notification-receiver"]',
    );
    await expect(receiver).toHaveCSS("display", "none");
    await editor.locator("#editor-contents-contents").focus();
    await expect(receiver).toHaveCSS("display", "block");
    await expect(receiver.locator(".notification-receiver-title")).toHaveText(
      "Notification receivers",
    );

    const metrics = await editor.evaluate((element) => {
      const wrapper = element.getBoundingClientRect();
      const tabContent = element
        .querySelector<HTMLElement>(".tab-content")
        ?.getBoundingClientRect();
      const textarea = element.querySelector<HTMLElement>("textarea")?.getBoundingClientRect();
      const viewportWidth = document.documentElement.clientWidth;
      return {
        documentWidth: document.documentElement.scrollWidth,
        tabContentContained:
          tabContent !== undefined &&
          tabContent.left >= wrapper.left &&
          tabContent.right <= wrapper.right,
        textareaContained:
          textarea !== undefined &&
          textarea.left >= wrapper.left &&
          textarea.right <= wrapper.right,
        viewportWidth,
        wrapperBottom: wrapper.bottom,
        wrapperLeft: wrapper.left,
        wrapperRight: wrapper.right,
        wrapperTop: wrapper.top,
      };
    });
    expect(metrics.wrapperTop).toBeGreaterThan(0);
    expect(metrics.wrapperBottom).toBeGreaterThan(metrics.wrapperTop);
    expect(metrics.wrapperLeft).toBeGreaterThanOrEqual(0);
    expect(metrics.wrapperRight).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    expect(metrics.tabContentContained).toBe(true);
    expect(metrics.textareaContained).toBe(true);
    expect(metrics.documentWidth).toBeLessThanOrEqual(metrics.viewportWidth + 1);

    const screenshot = await page.screenshot({
      fullPage: true,
      path: `${screenshotDirectory}/${viewport.name}.png`,
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  }
});

async function mockIssueDetail(page: Page) {
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
    userLabel: "Site Admin",
  };
  const fulfillSession = (route) =>
    route.fulfill({
      contentType: "application/json",
      headers: { "x-csrf-token": "csrf-mt10" },
      json: session,
    });
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, fulfillSession);
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
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
        vcs: "GIT",
        viewerCanUpdate: true,
        viewerCanWatch: true,
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyMarkdown: "Body **markdown**",
        canBeDeleted: true,
        childClosedCount: 0,
        childIssues: [],
        childOpenCount: 0,
        commentCount: 1,
        comments: [
          {
            attachments: [],
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            childComments: [],
            contentsMarkdown: "Existing comment",
            createdLabel: "Jul 2, 2026",
            id: 77,
            viewerCanDelete: true,
            viewerCanRead: true,
            viewerCanUpdate: true,
            viaEmail: false,
            voterCount: 0,
            voters: [],
          },
        ],
        createdLabel: "Jul 1, 2026",
        dueDateLabel: "",
        hasVoted: false,
        issueId: 42,
        issueNumber: 11,
        issueVoters: [],
        isDraft: false,
        isFavorited: false,
        isWatching: false,
        labels: [],
        milestoneId: null,
        milestoneTitle: "",
        ownerName: "admin",
        parentIssueId: null,
        projectName: "sample",
        sharers: [],
        state: "open",
        timeline: [],
        title: "Fix markdown editor spacing",
        viewerCanComment: true,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        voterCount: 0,
        watcherCount: 0,
        weight: 0,
      },
    }),
  );
}
