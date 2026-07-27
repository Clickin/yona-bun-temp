import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = fileURLToPath(
  new URL(
    `../output/playwright/stylex-project-issue-detail-disabled-comment-actions-mt10/${fallbackMode}/`,
    import.meta.url,
  ),
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issue/$issueNumber.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/issue/-issue-detail.stylex.ts", import.meta.url),
  "utf8",
);
const legacyCommentForm = readFileSync(
  new URL("../../yona-original/app/views/common/commentForm.scala.html", import.meta.url),
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
const legacyYobiLess = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const legacyMessages = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

test.use({ locale: "en-US" });

test("issue detail unauthorized comment action row owns legacy mt10 in StyleX", async ({
  page,
}) => {
  expect(legacyCommentForm).toContain(
    '<div class="write-comment-box mt20" title="@Messages("error.auth.unauthorized.comment")" data-login="required">',
  );
  expect(legacyCommentForm).toContain(
    '<textarea class="comment disabled" disabled="disabled" style="cursor:text;"></textarea>',
  );
  expect(legacyCommentForm).toContain('<div class="right-txt mt10">');
  expect(legacyCommentForm).toContain(
    '<span class="ybtn ybtn-disabled">@Messages("button.comment.new")</span>',
  );
  expect(legacyCommonLess).toContain(".right-txt     { text-align:right; }");
  expect(legacyCommonLess).toContain(".mt10 { margin-top:10px; }");
  expect(legacyPageLess).toContain(".write-comment-box {");
  expect(legacyPageLess).toContain("padding: 0 0 15px 54px;");
  expect(legacyPageLess).toContain(".write-comment-wrap");
  expect(legacyPageLess).toContain(".comment-update-button{");
  expect(legacyResponsiveLess).toContain(".write-comment-box {");
  expect(legacyResponsiveLess).toContain("padding: 0;");
  expect(legacyMessages).toContain("button.comment.new = Add a comment");
  expect(legacyMessages).toContain(
    "error.auth.unauthorized.comment = You need to log in to add comments.",
  );
  expect(legacyMessages).toContain("user.login.alert = Please log in.");

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
    expect(legacyYobiLess).toContain(`@import "less/${importedFile}";`);
  }

  expect(routeSource).toContain(
    "className={`${stylex.props(styles.unauthorizedComment).className} write-comment-box`}",
  );
  expect(routeSource).toContain('data-stylex-owner="project-issue-detail-unauthorized-comment"');
  expect(routeSource).toContain('data-stylex-owner="issue-detail-disabled-comment-secondary"');
  expect(routeSource).toContain(
    "const disabledCommentActionsClassName = stylex.props(styles.disabledCommentActions).className;",
  );
  expect(routeSource).toContain("className={`${disabledCommentActionsClassName} mt10`}");
  expect(routeSource).toContain(
    'data-stylex-owner="project-issue-detail-disabled-comment-actions"',
  );
  expect(routeSource).toContain('className="ybtn ybtn-disabled"');
  expect(routeSource).not.toContain('style={{ cursor: "text" }}');
  expect(styleSource).toContain(
    'disabledCommentActions: { textAlign: "right", marginTop: "10px" }',
  );
  expect(styleSource).toContain('unauthorizedComment: { marginTop: "20px" }');

  await mockUnauthorizedIssueDetail(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/issue/11`, { waitUntil: "commit" });

    const wrapper = page.locator('[data-stylex-owner="project-issue-detail-unauthorized-comment"]');
    const textarea = wrapper.locator("textarea.comment.disabled");
    const actions = wrapper.locator(
      '[data-stylex-owner="project-issue-detail-disabled-comment-actions"]',
    );
    const disabledAction = actions.locator("span.ybtn.ybtn-disabled");

    await expect(wrapper).toHaveCount(1);
    await expect(wrapper).toHaveClass(/\bwrite-comment-box\b/u);
    await expect(wrapper).toHaveAttribute("title", "Please log in.");
    await expect(wrapper).toHaveAttribute("data-login", "required");
    await expect(textarea).toHaveCount(1);
    await expect(textarea).toBeDisabled();
    await expect(textarea).toHaveClass(/\bcomment\b/u);
    await expect(textarea).toHaveClass(/\bdisabled\b/u);
    await expect(textarea).toHaveAttribute(
      "data-stylex-owner",
      "issue-detail-disabled-comment-secondary",
    );
    await expect(textarea).not.toHaveAttribute("style", /.+/u);
    await expect(textarea).toHaveCSS("cursor", "text");
    await expect(actions).toHaveClass(/\bmt10\b/u);
    await expect(actions).toHaveCSS("margin-top", "10px");
    await expect(actions).toHaveCSS("text-align", "right");
    await expect(actions).not.toHaveAttribute("style", /.+/u);
    await expect(disabledAction).toHaveCount(1);
    await expect(disabledAction).toHaveText("Add a comment");
    await expect(actions.locator("button")).toHaveCount(0);

    for (const locator of [wrapper, textarea, actions, disabledAction]) {
      for (const attribute of [
        "data-action",
        "data-backdrop",
        "data-dismiss",
        "data-href",
        "data-placement",
        "data-provider",
        "data-target",
        "data-toggle",
        "data-trigger",
        "data-url",
      ]) {
        await expect(locator).not.toHaveAttribute(attribute, /.+/u);
      }
      await expect(locator).not.toHaveAttribute("data-request-uri", /.+/u);
      await expect(locator).not.toHaveAttribute("data-request-method", /.+/u);
      await expect(locator).not.toHaveAttribute("data-request-type", /.+/u);
    }

    const metrics = await wrapper.evaluate((node) => {
      const writeWrap = node.querySelector<HTMLElement>(":scope > .write-comment-wrap");
      const textareaBox = writeWrap?.querySelector<HTMLElement>(":scope > .textarea-box");
      const textareaNode = textareaBox?.querySelector<HTMLTextAreaElement>(":scope > textarea");
      const actionsNode = writeWrap?.querySelector<HTMLElement>(
        '[data-stylex-owner="project-issue-detail-disabled-comment-actions"]',
      );
      const buttonNode = actionsNode?.querySelector<HTMLElement>(":scope > .ybtn-disabled");
      if (!writeWrap || !textareaBox || !textareaNode || !actionsNode || !buttonNode) return null;
      const writeWrapBox = writeWrap.getBoundingClientRect();
      const textareaBoxRect = textareaBox.getBoundingClientRect();
      const actionsBox = actionsNode.getBoundingClientRect();
      const buttonBox = buttonNode.getBoundingClientRect();
      const wrapperBox = node.getBoundingClientRect();
      return {
        actionContained:
          actionsBox.left >= writeWrapBox.left - 1 && actionsBox.right <= writeWrapBox.right + 1,
        actionFollowsTextarea: actionsBox.top >= textareaBoxRect.bottom - 1,
        buttonRightAligned: Math.abs(buttonBox.right - actionsBox.right) <= 1,
        childOrder: Array.from(writeWrap.children).map((child) =>
          child.classList.contains("textarea-box")
            ? "textarea-box"
            : child === actionsNode
              ? "actions"
              : "other",
        ),
        textareaContained:
          textareaBoxRect.left >= writeWrapBox.left - 1 &&
          textareaBoxRect.right <= writeWrapBox.right + 1,
        wrapperMarginTop: getComputedStyle(node).marginTop,
        wrapperWithinOwner: wrapperBox.left >= 0 && wrapperBox.right >= wrapperBox.left,
      };
    });
    expect(metrics).toEqual({
      actionContained: true,
      actionFollowsTextarea: true,
      buttonRightAligned: true,
      childOrder: ["textarea-box", "actions"],
      textareaContained: true,
      wrapperMarginTop: "20px",
      wrapperWithinOwner: true,
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      path: `${screenshotDirectory}/${viewport.name}.png`,
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  }
});

async function mockUnauthorizedIssueDetail(page: Page) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en-US"],
    };
  }, basePath);

  const session = {
    actorId: 7,
    avatarUrl: "/assets/images/default-avatar-32.png",
    defaultLandingPath: "/",
    emailAddress: "readonly@example.com",
    isAnonymous: false,
    isConfirmed: true,
    isSiteAdmin: false,
    loginId: "readonly",
    userLabel: "Read Only",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "csrf-unauthorized-comment" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        isFavorite: false,
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
      },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/labels", (route) =>
    route.fulfill({ contentType: "application/json", json: { labels: [] } }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/milestones**", (route) =>
    route.fulfill({ contentType: "application/json", json: { milestones: [] } }),
  );
  await page.route("**/api/v1/projects/admin/sample/issues/11", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        attachments: [],
        authorAvatarUrl: "/assets/images/default-avatar-32.png",
        authorLabel: "Dev Member",
        authorLoginId: "dev",
        bodyChecksum: "body-sha1",
        bodyHtml: "<p>Body markdown</p>",
        bodyMarkdown: "Body **markdown**",
        canBeDeleted: true,
        childClosedCount: 0,
        childIssues: [],
        childOpenCount: 0,
        commentCount: 0,
        comments: [],
        createdLabel: "Jul 1, 2026",
        hasVoted: false,
        isDraft: false,
        isFavorited: false,
        isWatching: false,
        issueId: 42,
        issueNumber: 11,
        issueUpdateMillis: 1782892800000,
        issueVoters: [],
        labels: [],
        ownerName: "admin",
        projectName: "sample",
        sharers: [],
        state: "open",
        timeline: [],
        title: "Unauthorized comment spacing",
        viewerCanComment: false,
        viewerCanDelete: true,
        viewerCanUpdate: true,
        viewerCanWatch: true,
        viewerUserId: 7,
        voterCount: 0,
        watcherCount: 0,
        weight: 0,
      },
    }),
  );
}
