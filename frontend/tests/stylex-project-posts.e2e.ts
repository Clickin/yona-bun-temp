import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const generatedFallbackHref = "legacy-assets/stylesheets/legacy-fallback.css";

test("project posts preserves legacy populated-list owners and sort geometry", async ({ page }) => {
  const [appCss, route, styles, legacy, partial, less] = await Promise.all([
    readFile(new URL("../src/app.css", import.meta.url), "utf8"),
    readFile(new URL("../src/routes/$ownerName/$projectName/posts.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/routes/$ownerName/$projectName/-posts.stylex.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/board/list.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/board/partial_list.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
  ]);
  expect(legacy).toContain('class="post-list-wrap notice-wrap"');
  expect(legacy).toContain('class="post-list-wrap"');
  expect(partial).toContain('<li class="post-item title"');
  expect(partial).toContain('<div class="title-wrap">');
  expect(partial).toContain('<div class="infos">');
  expect(less).toContain(".post-list-wrap {");
  expect(less).toContain(".post-item {");
  expect(appCss).not.toContain(".app-shell.board-page");
  expect(appCss).not.toContain(".board-page");
  expect(appCss).not.toContain(".board-toolbar");
  expect(partial).toContain('class="label label-notice"');
  expect(partial).toContain('class="label label-important"');
  expect(appCss).not.toContain(".board-badges");
  expect(appCss).not.toContain(".board-badge");
  expect(appCss).not.toContain(".board-label {");
  expect(appCss).not.toContain(".board-comments {");
  expect(route).toContain('data-stylex-owner="project-posts-avatar"');
  expect(route).toContain('data-stylex-owner="project-posts-title-wrap"');
  expect(route).toContain('data-stylex-owner="project-posts-infos"');
  expect(styles).toContain("postNoticeWrap:");
  expect(styles).toContain("postItem:");
  expect(styles).toContain("postTitleWrap:");

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
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
  await page.route("**/api/v1/projects/admin/sample/posts**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 2,
            createdLabel: "Jul 2, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "3",
            projectName: "sample",
            readme: false,
            title: "Release note",
          },
        ],
        notices: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Admin",
            authorLoginId: "admin",
            commentCount: 0,
            createdLabel: "Jul 1, 2026",
            labels: [],
            notice: true,
            ownerName: "admin",
            postNumber: "1",
            projectName: "sample",
            readme: false,
            title: "Notice",
          },
        ],
        totalCount: 3,
        pageNum: 1,
        totalPages: 1,
        pageSize: 20,
        openIssueCount: 0,
        closedIssueCount: 0,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: false,
        canMarkNotice: true,
        canMarkReadme: false,
        labels: [],
        defaultPermissions: {
          canAttachFiles: false,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: false,
        },
      },
    }),
  );
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });
  await expect(page.locator(`link[href$="${generatedFallbackHref}"]`)).toHaveCount(
    process.env.VITE_DISABLE_LEGACY_FALLBACK === "1" ? 0 : 1,
  );
  await expect(page.locator(".app-shell, .board-page")).toHaveCount(0);
  await expect(page.locator('[data-stylex-owner="project-posts-page"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="project-posts-search"]')).toBeVisible();
  const notice = page.locator('[data-stylex-owner="project-posts-notices"]');
  const row = page.locator('[data-stylex-owner="project-posts-item"]').last();
  await expect(notice).toHaveCSS("background-color", "rgb(247, 247, 247)");
  await expect(row).toHaveCSS("padding-top", "10px");
  await expect(row).toHaveCSS("border-bottom-width", "1px");
  await expect(row.locator('[data-stylex-owner="project-posts-avatar"]')).toHaveCSS(
    "float",
    "left",
  );
  await expect(row.locator('[data-stylex-owner="project-posts-title-wrap"]')).toHaveCSS(
    "white-space",
    "nowrap",
  );
  await expect(row.locator('[data-stylex-owner="project-posts-infos"]')).toHaveCSS(
    "font-size",
    "12px",
  );

  const desktop = await page.evaluate(() => {
    const row = document.querySelector<HTMLElement>('[data-stylex-owner="project-posts-item"]');
    const avatar = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-posts-avatar"]',
    );
    const title = document.querySelector<HTMLElement>(
      '[data-stylex-owner="project-posts-title-wrap"]',
    );
    if (!row || !avatar || !title) return null;
    return {
      row: row.getBoundingClientRect(),
      avatar: avatar.getBoundingClientRect(),
      title: title.getBoundingClientRect(),
    };
  });
  expect(desktop).not.toBeNull();
  expect(desktop!.avatar.left).toBeGreaterThanOrEqual(desktop!.row.left);
  expect(desktop!.avatar.right).toBeLessThanOrEqual(desktop!.title.right);
  expect(desktop!.title.top).toBeGreaterThanOrEqual(desktop!.row.top);
  expect(desktop!.title.bottom).toBeLessThanOrEqual(desktop!.row.bottom);

  await page.locator('[data-stylex-owner="project-posts-filter"]').nth(1).click();
  await expect(page).toHaveURL(/orderBy=createdDate/u);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

test("project posts empty state preserves legacy error geometry on desktop and mobile", async ({
  page,
}) => {
  const [route, styles, legacy, partial, less, sprite] = await Promise.all([
    readFile(new URL("../src/routes/$ownerName/$projectName/posts.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../src/routes/$ownerName/$projectName/-posts.stylex.ts", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/board/list.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/views/board/partial_list.scala.html", import.meta.url),
      "utf8",
    ),
    readFile(
      new URL("../../yona-original/app/assets/stylesheets/less/_page.less", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../src/assets/legacy/sprite.png", import.meta.url)),
  ]);
  expect(legacy).toContain('<div class="error-wrap">');
  expect(legacy).toContain('<i class="ico ico-err1"></i>');
  expect(legacy).toContain('Messages("post.is.empty")');
  expect(partial).toContain('<li class="post-item title"');
  expect(less).toContain("padding:100px 0px;");
  expect(less).toContain("font-weight:bold; font-size:16px;");
  expect(route).toContain('data-stylex-owner="project-posts-empty"');
  expect(route).toContain('data-stylex-owner="project-posts-empty-icon"');
  expect(route).toContain('data-stylex-owner="project-posts-empty-message"');
  expect(styles).toContain('errorWrap: { padding: "100px 0px", textAlign: "center" }');
  expect(styles).toContain('backgroundPosition: "-5px -160px"');
  expect(sprite.byteLength).toBeGreaterThan(0);

  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route) =>
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
  await page.route("**/api/v1/projects/admin/sample/posts**", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [],
        notices: [],
        totalCount: 0,
        pageNum: 1,
        totalPages: 0,
        pageSize: 20,
        openIssueCount: 0,
        closedIssueCount: 0,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: false,
        canMarkNotice: true,
        canMarkReadme: false,
        labels: [],
        defaultPermissions: {
          canAttachFiles: false,
          canCreate: true,
          canMarkNotice: true,
          canMarkReadme: false,
        },
      },
    }),
  );

  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  for (const viewport of [
    { width: 1366, height: 900 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });
    const empty = page.locator('[data-stylex-owner="project-posts-empty"]');
    const icon = page.locator('[data-stylex-owner="project-posts-empty-icon"]');
    const message = page.locator('[data-stylex-owner="project-posts-empty-message"]');
    await expect(empty).toBeVisible();
    await expect(empty).toHaveClass(/error-wrap/u);
    await expect(icon).toHaveClass(/ico-err1/u);
    await expect(empty).toHaveCSS("padding-top", "100px");
    await expect(empty).toHaveCSS("padding-bottom", "100px");
    await expect(empty).toHaveCSS("text-align", "center");
    await expect(icon).toHaveCSS("display", "inline-block");
    await expect(icon).toHaveCSS("width", "62px");
    await expect(icon).toHaveCSS("height", "82px");
    await expect(icon).toHaveCSS("background-position", "-5px -160px");
    await expect(message).toHaveCSS("font-weight", "700");
    await expect(message).toHaveCSS("font-size", "16px");
    await expect(message).toHaveCSS("color", "rgb(137, 137, 137)");
    await expect(message).toHaveCSS("margin-top", "30px");
    await expect(message).toHaveCSS("margin-bottom", "30px");
    const geometry = await empty.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { height: box.height, width: box.width, viewport: window.innerWidth };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThanOrEqual(342);
    expect(geometry.viewport).toBe(viewport.width);
  }
});
