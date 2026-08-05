import { expect, test, type Page } from "../wtr-compat.ts";
import type { Route } from "@playwright/test";
import { readFileSync } from "../wtr-compat.ts";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("board post keeps the legacy full-width right menu shell and comment hash target", async ({
  page,
}) => {
  const route = readFileSync("src/routes/$ownerName/$projectName/post/$postNumber.tsx", "utf8");
  const template = readFileSync("../yona-original/app/views/board/view.scala.html", "utf8");

  expect(template).toContain('<div class="project-page-wrap board-view">');
  expect(template).toContain('<div class="board-header issue">');
  expect(template).toContain('<div class="board-body row-fluid">');
  expect(template).toContain('<div id="post-body-@post.getNumber">');
  expect(template).toContain('class="content markdown-wrap"');
  expect(template).toContain('class="board-actrow right-txt"');
  expect(template).toContain('class="span3 span-right-pane mb20"');
  expect(template).toContain("@if(project.menuSetting.board)");
  expect(template).toContain('@Messages("post.write")');
  expect(template).toContain('class="right-menu-icons"');

  // These exact wrappers keep the board rail in the same row-fluid layout as
  // the issue detail without importing issue-only metadata controls.
  expect(route).toContain('className="project-page-wrap board-view"');
  expect(route).toContain("board-header issue");
  expect(route).toContain("board-body row-fluid");
  expect(route).toContain("content markdown-wrap");
  expect(route).toContain("board-actrow");
  expect(route).not.toContain("right-txt");
  expect(route).toContain('className="act-row right-menu-icons"');
  expect(route).toContain('data-stylex-owner="post-detail-sidebar-actions"');

  // The legacy template keys this link to the enabled board menu, rather than
  // post.permissions.canCreate. The destination performs its own authorization.
  await mockPost(page, { canCreate: false });
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/post/1#comment-1`);

  const pageWrap = page.locator(".project-page-wrap.board-view");
  const body = page.locator(".board-body.row-fluid");
  const leftPane = page.locator(".board-body > .span-left-pane");
  const rightPane = page.locator(".board-body > .span-right-pane");
  const sidebar = page.locator('[data-stylex-owner="post-detail-sidebar"]');
  const comment = page.locator("#comment-1");

  await expect(pageWrap).toBeVisible();
  await expect(body).toBeVisible();
  await expect(sidebar).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "New post" })).toBeVisible();
  await expect(sidebar.locator("dt")).toHaveText("Label [Edit]");
  await expect(sidebar.locator(".right-menu-icons button[title=Edit]")).toHaveCount(1);
  await expect(sidebar.locator(".right-menu-icons button[title=Delete]")).toHaveCount(1);
  await expect(sidebar.locator('[data-stylex-owner="post-detail-sidebar-actions"]')).toHaveClass(
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
    const sidebar = document.querySelector<HTMLElement>(
      '[data-stylex-owner="post-detail-sidebar"]',
    );
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
      route.fulfill({ contentType: "application/json", json: session }),
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
  await page.route("**/api/v1/projects/**/posts/1", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: "post-1",
        postNumber: "1",
        title: "Post right rail parity",
        bodyMarkdown: "Body",
        authorId: "admin-id",
        authorLabel: "admin",
        authorLoginId: "admin",
        authorAvatarUrl: "",
        createdLabel: "Jul 1, 2026",
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
            createdLabel: "Jul 2, 2026",
            attachments: [],
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
      },
    }),
  );
}
