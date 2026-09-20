import { expect, test, type Page, type Route } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("board post keeps the legacy full-width right menu shell and comment hash target", async ({
  page,
}) => {
  // The legacy template keys this link to the enabled board menu, rather than
  // post.permissions.canCreate. The destination performs its own authorization.
  await mockPost(page, { canCreate: false });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/post/1#comment-1`);

  const pageWrap = page.locator(".project-page-wrap.board-view");
  const body = page.locator(".board-body.row-fluid");
  const leftPane = page.locator(".board-body > .span-left-pane");
  const rightPane = page.locator(".board-body > .span-right-pane");
  const sidebar = page.locator('[data-owner="post-detail-sidebar"]');
  const comment = page.locator("#comment-1");

  await expect(pageWrap).toBeVisible();
  await expect(body).toBeVisible();
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "New post" })).toBeVisible();
  await expect(sidebar.locator("dt")).toHaveText("Label [Edit]");
  await expect(sidebar.locator(".right-menu-icons button[title=Edit]")).toHaveCount(1);
  await expect(sidebar.locator(".right-menu-icons button[title=Delete]")).toHaveCount(1);
  await expect(sidebar.locator('[data-owner="post-detail-sidebar-actions"]')).toHaveClass(
    /act-row/,
  );
  await expect(comment).toBeVisible();

  const desktop = await page.evaluate(() => {
    const get = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) throw new Error(`missing ${selector}`);
      const rect = element.getBoundingClientRect();
      return {
        bottom: rect.bottom,
        left: rect.left,
        right: rect.right,
        top: rect.top,
        width: rect.width,
      };
    };
    const sidebar = document.querySelector<HTMLElement>('[data-owner="post-detail-sidebar"]');
    if (!sidebar) throw new Error("missing post sidebar");
    return {
      body: get(".board-body.row-fluid"),
      left: get(".board-body > .span-left-pane"),
      right: get(".board-body > .span-right-pane"),
      sidebarPadding: getComputedStyle(sidebar).padding,
      scrollY: window.scrollY,
      targetTop: get("#comment-1").top,
    };
  });
  // F5 dist-truth: legacy .board-body width:100% inside .project-page-wrap inside
  // .page-wrap-outer { padding: 0 10px; width: 100%; box-sizing: border-box }
  // (yona-original/app/assets/stylesheets/less/_responsive.less:611-615) -> 1346 at a
  // 1366px viewport; app renders 1346 == legacy, pin was stale
  expect(desktop.body.width).toBeCloseTo(1346, 0);
  expect(desktop.left.right).toBeLessThanOrEqual(desktop.right.left);
  expect(desktop.right.right).toBeLessThanOrEqual(1366);
  expect(desktop.right.width).toBeGreaterThan(300);
  expect(desktop.sidebarPadding).toBe("15px 0px 0px 52px");
  expect(desktop.targetTop).toBeGreaterThanOrEqual(0);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(rightPane).toBeHidden();
  const mobile = await page.evaluate(() => {
    const body = document.querySelector<HTMLElement>(".board-body.row-fluid");
    const target = document.querySelector<HTMLElement>("#comment-1");
    if (!body || !target) throw new Error("missing mobile board detail targets");
    return {
      bodyRight: body.getBoundingClientRect().right,
      scrollWidth: document.documentElement.scrollWidth,
      targetTop: target.getBoundingClientRect().top,
    };
  });
  expect(mobile.bodyRight).toBeLessThanOrEqual(390);
  expect(mobile.scrollWidth).toBe(390);
  expect(mobile.targetTop).toBeGreaterThanOrEqual(0);
});

test("board comment tasklist preserves attachments and rejects stale changes", async ({ page }) => {
  const post = await mockPost(page);
  post.comments[0].contentsMarkdown = "- [ ] Comment task";
  post.comments[0].attachments.push({
    id: "9",
    name: "keep.txt",
    downloadUrl: `${basePath}/files/9`,
  });
  await page.route("**/api/v1/projects/**/posts/1/comments/1", async (route: Route) => {
    const body: {
      attachmentIds?: string[];
      contentsMarkdown: string;
      original: string;
    } = route.request().postDataJSON();
    if (body.original !== post.comments[0].contentsMarkdown) {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        json: { error: { code: "already_exists", message: "Already modified by someone." } },
      });
      return;
    }
    post.comments[0].contentsMarkdown = body.contentsMarkdown;
    post.comments[0].attachments = post.comments[0].attachments.filter((attachment) =>
      body.attachmentIds?.includes(attachment.id),
    );
    await route.fulfill({ contentType: "application/json", json: post });
  });
  await page.goto(`${basePath}/admin/sample/post/1`);
  const comment = page.locator("#comment-1");
  const task = comment.locator(".comment-body.markdown-wrap input[type='checkbox']");
  await expect(task).toBeEnabled();
  await task.click();
  await expect(task).toBeChecked();
  await page.reload();
  await expect(task).toBeChecked();
  await expect(comment.locator(".done-counter")).toHaveText("(1/1)");
  await expect(comment.locator(".attachments .attaches")).toContainText("keep.txt");

  post.comments[0].contentsMarkdown = "- [x] Changed elsewhere";
  await task.click();
  await expect(comment.getByRole("alert")).toContainText("Already modified by someone.");
  await expect(task).toBeChecked();
  await page.reload();
  await expect(comment.locator(".comment-body.markdown-wrap")).toContainText("Changed elsewhere");
});

async function mockPost(page: Page, { canCreate = true }: { canCreate?: boolean } = {}) {
  await page.addInitScript((runtimeBasePath) => {
    (window as Window & { __YONA_RUNTIME_CONFIG__?: object }).__YONA_RUNTIME_CONFIG__ = {
      basePath: runtimeBasePath,
      supportedLanguages: ["en"],
    };
  }, basePath);
  const session = {
    avatarUrl: "/assets/images/default-avatar-32.png",
    isAnonymous: false,
    isConfirmed: true,
    isGuest: false,
    isSiteAdmin: true,
    loginId: "admin",
    preferredLanguage: "en",
  };
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"]) {
    await page.route(url, (route: Route) =>
      route.fulfill({
        contentType: "application/json",
        headers: { "x-csrf-token": "parity-csrf" },
        json: session,
      }),
    );
  }
  await page.route("**/api/v1/owners/**/projects/**/container**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: 7,
        ownerName: "admin",
        projectName: "sample",
        projectScope: "PUBLIC",
        menuSetting: {
          board: true,
          code: true,
          issue: true,
          milestone: true,
          pullRequest: true,
          review: true,
        },
        vcs: "GIT",
        viewerCanUpdate: true,
        showBoard: true,
      },
    }),
  );
  await page.route("**/api/v1/projects/**/posts/form-options**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: true,
        canMarkNotice: true,
        canMarkReadme: true,
        defaultPermissions: {
          canAttachFiles: true,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: true,
        },
        labels: [
          {
            categoryId: "category-1",
            categoryIsExclusive: false,
            categoryName: "Type",
            color: "#51aacc",
            id: "label-1",
            name: "parity",
          },
        ],
        onlineCommit: {
          branch: "",
          edit: false,
          issueTemplate: false,
          path: "",
          preparedBodyMarkdown: "",
          title: "",
        },
        readme: false,
      },
    }),
  );
  const commentAttachments: Array<{ id: string; name: string; downloadUrl: string }> = [];
  const post = {
    id: "post-1",
    postNumber: "1",
    title: "Post right rail parity",
    bodyMarkdown: "Body",
    authorId: "admin-id",
    authorLabel: "admin",
    authorLoginId: "admin",
    authorAvatarUrl: "",
    createdAt: "2026-07-01T00:00:00+09:00",
    updatedLabel: "Jul 1, 2026",
    attachments: [],
    comments: [
      {
        id: "1",
        authorId: "reviewer-id",
        authorLabel: "reviewer",
        authorLoginId: "reviewer",
        contentsHtml: "Comment",
        contentsMarkdown: "Comment",
        createdAt: "2026-07-02T00:00:00+09:00",
        attachments: commentAttachments,
        parentCommentId: "",
        viaEmail: false,
      },
    ],
    historyHtml: "",
    historyMarkdown: "",
    isWatching: false,
    watcherCount: 0,
    notice: false,
    readme: false,
    commentCount: 1,
    labels: [
      {
        categoryId: "category-1",
        categoryIsExclusive: false,
        categoryName: "Type",
        color: "#51aacc",
        id: "label-1",
        name: "parity",
      },
    ],
    permissions: {
      canComment: true,
      canCreate,
      canDelete: true,
      canRead: true,
      canSetNotice: true,
      canUpdate: true,
      canWatch: true,
    },
  };
  await page.route("**/api/v1/projects/**/posts/1", (route: Route) =>
    route.fulfill({ contentType: "application/json", json: post }),
  );
  return post;
}
