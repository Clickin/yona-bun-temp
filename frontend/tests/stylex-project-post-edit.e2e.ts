import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const SOURCE = readFileSync(
  new URL("../src/routes/$ownerName/$projectName/post/$postNumber/editform.tsx", import.meta.url),
  "utf8",
);
const UPLOAD_SOURCE = readFileSync(
  new URL("../../yona-original/app/views/common/uploadForm.scala.html", import.meta.url),
  "utf8",
);
const STYLE_SOURCE = readFileSync(
  new URL(
    "../src/routes/$ownerName/$projectName/post/$postNumber/-post-editform.stylex.ts",
    import.meta.url,
  ),
  "utf8",
);

test("post edit form preserves legacy editor and action owners with StyleX", async ({ page }) => {
  const basePath = process.env.YONA_DEV_BASE_PATH ?? "/yona";
  await mockPostEdit(page);
  await page.setViewportSize({ width: 1366, height: 900 });
  await page.goto(`${basePath}/admin/sample/post/12/editform`, { waitUntil: "commit" });
  await expect(page.locator('[data-stylex-owner="post-edit-form"]')).toHaveCount(1);
  const form = page.locator('[data-stylex-owner="post-edit-form"]');
  await expect(form).toHaveCSS("position", "relative");
  expect(
    await form.evaluate((node) => ({
      hasLegacyNoMarginClass: node.classList.contains("nm"),
      hasStyleXClass: Array.from(node.classList).some((name) => name.startsWith("x")),
    })),
  ).toEqual({ hasLegacyNoMarginClass: true, hasStyleXClass: true });
  await expect(page.locator('[data-stylex-owner="post-edit-form-title"] input')).toHaveValue(
    "Release notes",
  );
  await expect(page.locator('[data-stylex-owner="post-edit-form-editor"]')).toBeVisible();
  await expect(page.locator("#editor-body-body")).toHaveAttribute("tabindex", "2");
  await expect(page.locator('[data-stylex-owner="post-edit-form-actions"]')).toBeVisible();
  await expect(page.locator('[data-stylex-owner="post-edit-form-uploader"]')).toBeVisible();
  const uploadSaveHelp = page.locator('[data-stylex-owner="post-edit-form-upload-save-help"]');
  await expect(uploadSaveHelp).toHaveCount(1);
  await expect(uploadSaveHelp).toHaveCSS("text-align", "right");
  await expect(page.locator("#notice")).toBeChecked();
  const desktopFormBox = await form.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width };
  });
  expect(desktopFormBox.left).toBeGreaterThanOrEqual(0);
  expect(desktopFormBox.right).toBeLessThanOrEqual(1366);
  expect(desktopFormBox.width).toBeGreaterThan(0);
  await page.getByRole("link", { exact: true, name: "Preview" }).click();
  await expect(page.locator("#preview-body")).toHaveClass(/(?:^|\s)active(?:\s|$)/);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth))
    .toBe(true);
  const mobileFormBox = await form.evaluate((node) => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width };
  });
  expect(mobileFormBox.left).toBeGreaterThanOrEqual(0);
  expect(mobileFormBox.right).toBeLessThanOrEqual(390);
  expect(mobileFormBox.width).toBeGreaterThan(0);
  await expect(page.locator("[data-toggle], [data-dismiss], [data-request-method]")).toHaveCount(0);
  expect(SOURCE).toContain('id="button-clear-temporary"');
  expect(SOURCE).toContain("BoardPostFileUploader");
  expect(SOURCE).not.toContain('className="right-txt help"');
  expect(SOURCE).toContain('data-stylex-owner="post-edit-form-upload-save-help"');
  expect(UPLOAD_SOURCE).toContain('<p class="right-txt help">');
  expect(UPLOAD_SOURCE).toContain("common.attach.attachIfYouSave");
  expect(STYLE_SOURCE).toContain('uploadSaveHelp: { textAlign: "right" }');
  expect(SOURCE).not.toContain("$yobi.loadModule");
});

async function mockPostEdit(page: Page) {
  await page.route("**/api/v1/session", (route) =>
    route.fulfill({
      contentType: "application/json",
      json: { actorId: 1, isAnonymous: false, loginId: "admin" },
    }),
  );
  await page.route("**/api/v1/owners/admin/projects/sample/container**", (route) =>
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
