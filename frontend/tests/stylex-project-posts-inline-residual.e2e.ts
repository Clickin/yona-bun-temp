import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";

test("project posts owns the board controls' former inline declarations", async ({ page }) => {
  const source = readFileSync("src/routes/$ownerName/$projectName/posts.tsx", "utf8");
  const styleSource = readFileSync("src/routes/$ownerName/$projectName/-posts.stylex.ts", "utf8");
  const legacy = readFileSync("../yona-original/app/views/board/list.scala.html", "utf8");
  const keymapLegacy = readFileSync("../yona-original/app/views/help/keymap.scala.html", "utf8");
  expect(legacy).toContain('<div class="page-wrap-outer">');
  expect(legacy).toContain("@common.twoColumnModeCheckboxArea(false)");
  expect(keymapLegacy).toContain('style="padding:10px 0; margin-left: 55px;"');
  expect(source).toContain('data-stylex-owner="project-posts-two-column-mode"');
  expect(source).toContain('data-stylex-owner="project-posts-keymap"');
  expect(source).not.toContain('style={{ position: "relative" }}');
  expect(source).not.toContain('style={{ padding: "10px 0", marginLeft: "55px" }}');
  expect(styleSource).toContain('twoColumnMode: { position: "relative" }');
  expect(styleSource).toContain('keymap: { marginLeft: "55px", padding: "10px 0" }');

  await mockPosts(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/posts`, { waitUntil: "commit" });

  const twoColumn = page.locator('[data-stylex-owner="project-posts-two-column-mode"]');
  const keymapOwner = page.locator('[data-stylex-owner="project-posts-keymap"]');
  await expect(twoColumn).toBeVisible();
  await expect(keymapOwner).toBeVisible();
  await expect(twoColumn).toHaveCSS("position", "relative");
  await expect(keymapOwner).toHaveCSS("padding-top", "10px");
  await expect(keymapOwner).toHaveCSS("padding-bottom", "10px");
  await expect(keymapOwner).toHaveCSS("margin-left", "55px");

  const desktop = await page.evaluate(() => {
    const read = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, width: rect.width };
    };
    return {
      twoColumn: read('[data-stylex-owner="project-posts-two-column-mode"]'),
      keymap: read('[data-stylex-owner="project-posts-keymap"]'),
    };
  });
  expect(desktop.twoColumn).not.toBeNull();
  expect(desktop.keymap).not.toBeNull();
  expect(desktop.keymap!.left).toBeGreaterThan(0);
  expect(desktop.keymap!.right).toBeLessThanOrEqual(1366);

  await page.locator("#two-column-mode").check();
  await expect(page.locator("#two-column-mode")).toBeChecked();
  await page.locator("#two-column-mode").uncheck();
  await expect(page.locator("#two-column-mode")).not.toBeChecked();

  const keymapButton = keymapOwner.locator("button.ybtn-inverse");
  await keymapButton.click();
  await expect(page.locator("#helpKeys")).toHaveCSS("display", "block");
  await expect(page.locator("#helpKeys")).toHaveClass(/in/u);
  await page.locator("#helpKeys").press("Escape");
  await expect(page.locator("#helpKeys")).toHaveClass(/hide/u);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

async function mockPosts(page: Page) {
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
  for (const url of ["**/api/v1/session", "**/api/auth/session", "**/api/v1/auth/session"])
    await page.route(url, (route: Route) =>
      route.fulfill({ contentType: "application/json", json: session }),
    );
  await page.route("**/api/v1/owners/admin/projects/sample/container", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        backgroundImageUrl: "/assets/images/bg-default-project.png",
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
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts/form-options**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        canAttachFiles: true,
        canMarkNotice: true,
        canMarkReadme: true,
        labels: [],
        readme: false,
      },
    }),
  );
  await page.route("**/api/v1/projects/admin/sample/posts?**", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        items: [
          {
            authorAvatarUrl: "/assets/images/default-avatar-32.png",
            authorLabel: "Dev Member",
            authorLoginId: "dev",
            commentCount: 1,
            createdLabel: "Jul 2, 2026",
            labels: [],
            notice: false,
            ownerName: "admin",
            postNumber: "3",
            projectName: "sample",
            readme: false,
            title: "Release note",
            updatedLabel: "Jul 2, 2026",
          },
        ],
        notices: [],
        ownerName: "admin",
        pageNum: 1,
        pageSize: 15,
        projectName: "sample",
        readme: null,
        totalCount: 1,
      },
    }),
  );
}
