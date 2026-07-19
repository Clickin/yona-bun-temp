import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

test("project posts preserves legacy populated-list owners and sort geometry", async ({ page }) => {
  const [route, styles, legacy, partial, less] = await Promise.all([
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
