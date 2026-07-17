import { expect, test, type Page, type Route } from "@playwright/test";
import { readFileSync } from "node:fs";

const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
const source = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx", import.meta.url),
  "utf8",
);

test("board post edit form keeps editor and option owners with StyleX", async ({ page }) => {
  const template = readFileSync("../yona-original/app/views/board/edit.scala.html", "utf8");
  const editorTemplate = readFileSync(
    "../yona-original/app/views/common/editor.scala.html",
    "utf8",
  );
  expect(template).toContain('class="content-wrap frm-wrap"');
  expect(template).toContain('@common.editor("body", posting.body, "tabindex=2", "content-body")');
  expect(editorTemplate).toContain('class="nav nav-tabs nm small"');
  expect(editorTemplate).toContain('class="notification-receiver"');
  for (const name of [
    "post-edit-form-editor-tabs",
    "post-edit-form-editor-content",
    "post-edit-form-options",
    "post-edit-form-notification",
  ]) {
    expect(source).toContain(`data-stylex-owner="${name}"`);
  }

  await mockPostEdit(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/post/12/editform`, { waitUntil: "commit" });
  for (const name of [
    "post-edit-form-editor-tabs",
    "post-edit-form-editor-content",
    "post-edit-form-options",
  ]) {
    await expect(page.locator(`[data-stylex-owner="${name}"]`)).toBeVisible();
  }
  await expect(page.locator('[data-stylex-owner="post-edit-form-notification"]')).toHaveCount(1);
  await expect(page.locator("#title")).toHaveValue("Release notes");
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator('[data-stylex-owner="post-edit-form-options"] #notice')).toBeChecked();
  await expect(page.locator("[data-toggle], [data-dismiss], [data-request-method]")).toHaveCount(0);

  const desktop = await page.evaluate(() =>
    ["editor-tabs", "editor-content", "options"].map((name) => {
      const element = document.querySelector<HTMLElement>(
        `[data-stylex-owner="post-edit-form-${name}"]`,
      );
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }),
  );
  for (const metric of desktop) {
    expect(metric).not.toBeNull();
    expect(metric!.left).toBeGreaterThanOrEqual(0);
    expect(metric!.right).toBeLessThanOrEqual(1366);
    expect(metric!.width).toBeGreaterThan(0);
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
});

async function mockPostEdit(page: Page) {
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
  await page.route("**/api/v1/projects/admin/sample/posts/12", (route: Route) =>
    route.fulfill({
      contentType: "application/json",
      json: {
        id: "12",
        postNumber: "12",
        ownerName: "admin",
        projectName: "sample",
        title: "Release notes",
        bodyMarkdown: "Release body",
        bodyHtml: "<p>Release body</p>",
        notice: true,
        readme: false,
        authorLoginId: "admin",
        authorId: "1",
        authorLabel: "Admin",
        attachments: [],
        comments: [],
        labels: [],
        permissions: {
          canUpdate: true,
          canSetNotice: true,
          canDelete: true,
          canRead: true,
          canComment: true,
          canCreate: true,
          canWatch: true,
        },
      },
    }),
  );
}
