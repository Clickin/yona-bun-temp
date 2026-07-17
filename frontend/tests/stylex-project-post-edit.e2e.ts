import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx", import.meta.url),
  "utf8",
);

test("post edit form preserves legacy editor and action owners with StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPostEdit(page);
  await page.goto(`${basePath}/admin/sample/post/12/editform`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="post-edit-form"]')).toHaveCount(1);
  await expect(page.locator('[data-stylex-owner="post-edit-form-title"] input')).toHaveValue(
    "Release notes",
  );
  await expect(page.locator('[data-stylex-owner="post-edit-form-editor"]')).toBeVisible();
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator('[data-stylex-owner="post-edit-form-actions"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="post-edit-form-uploader"]')).toBeVisible();
  await expect(page.locator("#notice")).toBeChecked();
  await expect(page.locator("[data-toggle], [data-dismiss], [data-request-method]")).toHaveCount(0);
  expect(SOURCE).toContain('id="button-clear-temporary"');
  expect(SOURCE).toContain("BoardPostFileUploader");
  expect(SOURCE).not.toContain("$yobi.loadModule");
});

async function mockPostEdit(page: Page) {
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
  await page.route("**/api/v1/projects/admin/sample/posts/12", (route) =>
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
