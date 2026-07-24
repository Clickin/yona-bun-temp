import { mkdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const fallbackMode = process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? "fallback-off" : "normal";
const screenshotDirectory = fileURLToPath(
  new URL(
    `../output/playwright/stylex-project-post-detail-disabled-comment-actions-mt10/${fallbackMode}/`,
    import.meta.url,
  ),
);
const routeSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber.tsx", import.meta.url),
  "utf8",
);
const styleSource = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/-post-detail.stylex.ts", import.meta.url),
  "utf8",
);
const boardSource = readFileSync(
  new URL("../../yona-original/app/views/board/view.scala.html", import.meta.url),
  "utf8",
);
const commentFormSource = readFileSync(
  new URL("../../yona-original/app/views/common/commentForm.scala.html", import.meta.url),
  "utf8",
);
const commonLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_common.less", import.meta.url),
  "utf8",
);
const pageLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
  "utf8",
);
const responsiveLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/less/_responsive.less", import.meta.url),
  "utf8",
);
const yobiLessSource = readFileSync(
  new URL("../../yona-original/app/assets/stylesheets/yobi.less", import.meta.url),
  "utf8",
);
const bootstrapSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap.css", import.meta.url),
  "utf8",
);
const bootstrapResponsiveSource = readFileSync(
  new URL("../../yona-original/public/bootstrap/css/bootstrap-responsive.css", import.meta.url),
  "utf8",
);
const messagesSource = readFileSync(
  new URL("../../yona-original/conf/messages", import.meta.url),
  "utf8",
);

const pluginOnlyAttributes = [
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
  "data-request-method",
  "data-request-type",
  "data-request-uri",
];

test.use({ locale: "en-US" });

test("project post detail owns unauthorized comment action-row mt10 in StyleX", async ({
  page,
}) => {
  expect(boardSource).toContain('<div class="board-header issue">');
  expect(boardSource).toContain('<div id="comments" class="board-comment-wrap">');
  expect(boardSource).toContain("@common.commentForm(post.asResource()");
  expect(commentFormSource).toContain(
    '<div class="write-comment-box mt20" title="@Messages("error.auth.unauthorized.comment")" data-login="required">',
  );
  expect(commentFormSource).toContain(
    '<textarea class="comment disabled" disabled="disabled" style="cursor:text;"></textarea>',
  );
  expect(commentFormSource).toContain('<div class="right-txt mt10">');
  expect(commentFormSource).toContain(
    '<span class="ybtn ybtn-disabled">@Messages("button.comment.new")</span>',
  );
  expect(commonLessSource).toContain(".right-txt     { text-align:right; }");
  expect(commonLessSource).toContain(".mt10 { margin-top:10px; }");
  expect(pageLessSource).toContain(".write-comment-box {");
  expect(pageLessSource).toContain("padding: 0 0 15px 54px;");
  expect(pageLessSource).toContain(".write-comment-wrap");
  expect(pageLessSource).toContain("textarea.disabled");
  expect(responsiveLessSource).toContain(".write-comment-box {");
  expect(responsiveLessSource).toContain("padding: 0;");
  expect(bootstrapSource).toContain(".row-fluid");
  expect(bootstrapSource).toContain("textarea");
  expect(bootstrapResponsiveSource).toContain("@media (max-width: 767px)");
  expect(bootstrapResponsiveSource).toContain(".row-fluid");
  expect(bootstrapResponsiveSource).toContain("textarea");
  expect(messagesSource).toContain("button.comment.new = Add a comment");
  expect(messagesSource).toContain(
    "error.auth.unauthorized.comment = You need to log in to add comments.",
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
    expect(yobiLessSource).toContain(`@import "less/${importedFile}";`);
  }

  expect(routeSource).toContain("disabledCommentActions: stylex.props(");
  expect(routeSource).toContain("styles.disabledCommentActions");
  expect(routeSource).toContain("className={`${sx.disabledCommentActions.className} mt10`}");
  expect(routeSource).toContain("className={sx.commentActions.className}");
  expect(routeSource).not.toContain("right-txt");
  expect(routeSource).toContain('data-stylex-owner="post-detail-disabled-comment-actions"');
  expect(routeSource).toContain('data-stylex-owner="post-detail-disabled-comment-box"');
  expect(routeSource).toContain('data-stylex-owner="post-detail-disabled-comment"');
  expect(routeSource).not.toContain('style={{ cursor: "text" }}');
  expect(styleSource).toContain('disabledCommentActions: { textAlign: "right" }');
  expect(styleSource).toContain('disabledCommentActionsMargin: { marginTop: "10px" }');

  const disabledCommentStart = routeSource.indexOf(
    'data-stylex-owner="post-detail-disabled-comment-box"',
  );
  const disabledCommentEnd = routeSource.indexOf(
    "async function handleSubmit",
    disabledCommentStart,
  );
  expect(disabledCommentStart).toBeGreaterThanOrEqual(0);
  expect(disabledCommentEnd).toBeGreaterThan(disabledCommentStart);
  const disabledCommentSource = routeSource.slice(disabledCommentStart, disabledCommentEnd);
  expect(disabledCommentSource).not.toContain("right-txt");
  expect(disabledCommentSource).not.toContain("style=");
  for (const attribute of pluginOnlyAttributes) {
    expect(disabledCommentSource).not.toContain(`${attribute}=`);
  }

  await mockProjectPost(page);
  mkdirSync(screenshotDirectory, { recursive: true });

  for (const viewport of [
    { height: 900, name: "desktop", width: 1366 },
    { height: 844, name: "mobile", width: 390 },
  ] as const) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/post/3`, { waitUntil: "commit" });

    const box = page.locator('[data-stylex-owner="post-detail-disabled-comment-box"]');
    const wrap = box.locator(':scope > [data-stylex-owner="post-detail-disabled-comment-wrap"]');
    const textareaBox = wrap.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment-textarea-box"]',
    );
    const textarea = textareaBox.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment"]',
    );
    const actions = wrap.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment-actions"]',
    );
    const button = actions.locator(
      ':scope > [data-stylex-owner="post-detail-disabled-comment-button"]',
    );

    await expect(page.locator("#comment-form")).toHaveCount(0);
    await expect(box).toHaveCount(1);
    await expect(box).toHaveClass(/\bwrite-comment-box\b/u);
    await expect(box).toHaveClass(/\bmt20\b/u);
    await expect(box).toHaveAttribute("title", "You need to log in to add comments.");
    await expect(box).toHaveAttribute("data-login", "required");
    await expect(wrap).toHaveClass(/\bwrite-comment-wrap\b/u);
    await expect(textareaBox).toHaveClass(/\btextarea-box\b/u);
    await expect(textarea).toHaveClass(/\bcomment\b/u);
    await expect(textarea).toHaveClass(/\bdisabled\b/u);
    await expect(textarea).toBeDisabled();
    await expect(textarea).not.toHaveAttribute("style", /.+/u);
    await expect(actions).toHaveClass(/\bmt10\b/u);
    await expect(actions).not.toHaveClass(/\bright-txt\b/u);
    await expect(actions).toHaveCSS("margin-top", "10px");
    await expect(actions).toHaveCSS("text-align", "right");
    await expect(actions).not.toHaveAttribute("style", /.+/u);
    await expect(button).toHaveClass(/\bybtn\b/u);
    await expect(button).toHaveClass(/\bybtn-disabled\b/u);
    await expect(button).toHaveText("Add a comment");
    await expect(button).not.toHaveAttribute("style", /.+/u);

    for (const locator of [box, wrap, textarea, actions, button]) {
      for (const attribute of pluginOnlyAttributes) {
        await expect(locator).not.toHaveAttribute(attribute, /.+/u);
      }
    }

    const metrics = await box.evaluate((node) => {
      const wrapNode = node.querySelector<HTMLElement>(":scope > .write-comment-wrap");
      const textareaBoxNode = wrapNode?.querySelector<HTMLElement>(":scope > .textarea-box");
      const textareaNode = textareaBoxNode?.querySelector<HTMLElement>(":scope > textarea");
      const actionsNode = wrapNode?.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-disabled-comment-actions"]',
      );
      const buttonNode = actionsNode?.querySelector<HTMLElement>(
        '[data-stylex-owner="post-detail-disabled-comment-button"]',
      );
      if (!wrapNode || !textareaBoxNode || !textareaNode || !actionsNode || !buttonNode)
        return null;

      const boxRect = node.getBoundingClientRect();
      const wrapRect = wrapNode.getBoundingClientRect();
      const textareaBoxRect = textareaBoxNode.getBoundingClientRect();
      const actionsRect = actionsNode.getBoundingClientRect();
      const buttonRect = buttonNode.getBoundingClientRect();
      return {
        actionContained:
          actionsRect.left >= wrapRect.left - 1 && actionsRect.right <= wrapRect.right + 1,
        actionFollowsTextarea: actionsRect.top >= textareaBoxRect.bottom - 1,
        buttonRightAligned: Math.abs(buttonRect.right - actionsRect.right) <= 1,
        childOrder: Array.from(wrapNode.children).map((child) =>
          child.classList.contains("textarea-box")
            ? "textarea-box"
            : child === actionsNode
              ? "actions"
              : "other",
        ),
        textareaContained:
          textareaBoxRect.left >= wrapRect.left - 1 && textareaBoxRect.right <= wrapRect.right + 1,
        wrapperMarginTop: getComputedStyle(node).marginTop,
        wrapperWithinViewport: boxRect.left >= -1 && boxRect.right <= window.innerWidth + 1,
      };
    });
    expect(metrics).toEqual({
      actionContained: true,
      actionFollowsTextarea: true,
      buttonRightAligned: true,
      childOrder: ["textarea-box", "actions"],
      textareaContained: true,
      wrapperMarginTop: "20px",
      wrapperWithinViewport: true,
    });

    const screenshot = await page.screenshot({
      fullPage: true,
      path: `${screenshotDirectory}/${viewport.name}.png`,
    });
    expect(screenshot.byteLength).toBeGreaterThan(0);
  }
});

async function mockProjectPost(page: Page) {
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
        headers: { "x-csrf-token": "csrf-post-disabled-comment" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
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
        projectScope: "PUBLIC",
        vcs: "GIT",
        viewerCanUpdate: false,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/3", (route) =>
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
        commentCount: 0,
        comments: [],
        createdLabel: "Jul 2, 2026",
        historyHtml: "",
        historyMarkdown: "",
        id: "33",
        isWatching: false,
        labels: [],
        notice: false,
        ownerName: "admin",
        permissions: {
          canComment: false,
          canCreate: false,
          canDelete: false,
          canRead: true,
          canSetNotice: false,
          canUpdate: false,
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
